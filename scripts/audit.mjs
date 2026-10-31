#!/usr/bin/env node
/**
 * 页面健康审计：结构检查 + WCAG 自动检测 + 布局稳定性。
 *
 * 对应 Skill 条款：验证 / 响应式与可访问性 / 控件与状态。
 * 输出 audit-report.json（UTF-8，可机读）+ 控制台摘要；有 error 时退出码 1。
 *
 * 用法（在目标项目根目录运行）:
 *   node <skill>/scripts/audit.mjs --url http://localhost:5173/ --expect-text "订单列表"
 *   node <skill>/scripts/audit.mjs --pages pages.txt --themes light,dark --out audit.json
 *   node <skill>/scripts/audit.mjs --url http://localhost:5173/admin --storage-state auth.json
 *
 * 检查分两级：
 *   error —— 页面坏了（内容为空、横向溢出、坏图、Logo 拉伸、交互元素重叠、
 *            导航失败、axe 的 serious/critical 违规）
 *   warn  —— 需要人工看图确认（文本裁切、点击区过小、字号过小、图标按钮无名字、
 *            axe 的 moderate/minor 违规、CLS 偏高、无障碍降级模式下仍在循环的动效）
 *
 * 所有检查都是启发式的：报告的是「待确认」，删除任何资源/组件前必须人工核实。
 *
 * 依赖: npm i -D playwright && npx playwright install chromium
 * （axe-core 已随 Skill 内置在 scripts/vendor/axe.min.js，不需要额外安装）
 */

import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  MARK,
  VIEWPORTS,
  resolveViewport,
  contextOptions,
  flag,
  goto,
  installClsObserver,
  forceDark,
  line,
  listArg,
  loadChromium,
  parseArgs,
  resolvePages,
  expectTextsFor,
  watchPage,
  writeJson,
} from './lib/common.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const AXE_PATH = path.join(HERE, 'vendor', 'axe.min.js');

/** 只跑 WCAG 2.1 A/AA 的规则集，跳过 best-practice（噪音大、争议多）。 */
const AXE_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'];
/** axe impact → 本工具的级别：serious/critical 说明有用户真的用不了。 */
const AXE_LEVEL = { critical: 'error', serious: 'error', moderate: 'warn', minor: 'warn' };

/** 可选设计体系基线；既有项目优先传自己的令牌，不强推一套新体系。 */
export function normalizeDesignSystem(input = {}) {
  const defaults = {
    spacingBase: 4, tolerance: 0.25, maxFontSizes: 7, maxRadii: 4, maxShadows: 3,
    fontSizes: null, spacingValues: null, radii: null, ignoreSelectors: [],
  };
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error('设计体系配置必须是 JSON 对象');
  for (const key of Object.keys(input)) {
    if (!Object.hasOwn(defaults, key)) throw new Error(`未知设计体系配置项：${key}`);
  }
  const config = { ...defaults, ...input };
  for (const key of ['spacingBase', 'tolerance']) {
    if (typeof config[key] !== 'number' || !Number.isFinite(config[key]) || config[key] < 0 || (key === 'spacingBase' && !config[key])) {
      throw new Error(`${key} 必须是${key === 'spacingBase' ? '正' : '非负'}有限数值`);
    }
  }
  if (config.tolerance >= config.spacingBase / 2) throw new Error('tolerance 必须小于 spacingBase / 2，避免全部间距被放行');
  for (const key of ['maxFontSizes', 'maxRadii', 'maxShadows']) {
    if (!Number.isInteger(config[key]) || config[key] < (key === 'maxFontSizes' ? 1 : 0)) {
      throw new Error(`${key} 必须是${key === 'maxFontSizes' ? '正' : '非负'}整数`);
    }
  }
  for (const key of ['fontSizes', 'spacingValues', 'radii']) {
    const values = config[key];
    if (values === null) continue;
    if (!Array.isArray(values) || !values.length || values.some((v) => typeof v !== 'number' || !Number.isFinite(v) || v < 0 || (key === 'fontSizes' && v === 0))) {
      throw new Error(`${key} 必须是非空数值数组或 null（字号须为正数，其余可为 0）`);
    }
    config[key] = [...new Set(values)].sort((a, b) => a - b);
  }
  if (!Array.isArray(config.ignoreSelectors) || config.ignoreSelectors.some((s) => typeof s !== 'string' || !s.trim())) {
    throw new Error('ignoreSelectors 必须是非空 CSS 选择器字符串组成的数组');
  }
  return config;
}

/** 只统计当前渲染态；不推断 CSS 源码是否用了变量，也不把启发式警告当错误。 */
export async function collectDesignSystem(page, config, strict = false) {
  return page.evaluate(({ config: c, strict: isStrict }) => {
    const buckets = { fontSizes: [], spacing: [], radii: [], shadows: [] };
    const invalid = { fontSizes: [], spacing: [], radii: [] };
    let elements = 0;
    let ignoredElements = 0;
    let pillCorners = 0;
    for (const selector of c.ignoreSelectors) document.querySelector(selector); // 无效选择器不能静默忽略
    const ignored = ['[data-fidelity-ignore="design-system"]', ...c.ignoreSelectors].join(',');
    const label = (el) => {
      if (el.id) return `#${CSS.escape(el.id)}`;
      const classes = typeof el.className === 'string' ? el.className.trim().split(/\s+/).filter(Boolean).slice(0, 2) : [];
      return el.tagName.toLowerCase() + classes.map((s) => `.${CSS.escape(s)}`).join('');
    };
    const record = (list, value, selector, property) => {
      const found = list.find((b) => typeof value === 'number' ? Math.abs(b.value - value) <= c.tolerance : b.value === value);
      const entry = found || { value, count: 0, examples: [] };
      if (!found) list.push(entry);
      entry.count++;
      if (entry.examples.length < 3) entry.examples.push({ selector, property });
    };
    const add = (key, value, selector, property) => {
      // 先用原值判合规，再聚类统计；8.2px 不能把超容差的 8.4px 吞掉。
      const allowed = key === 'fontSizes' ? c.fontSizes : key === 'spacing' ? c.spacingValues : key === 'radii' ? c.radii : null;
      const bad = allowed ? !near(value, allowed) : key === 'spacing' && Math.abs(value - Math.round(value / c.spacingBase) * c.spacingBase) > c.tolerance;
      if (bad) record(invalid[key], value, selector, property);
      record(buckets[key], value, selector, property);
    };
    const px = (s) => /^-?\d+(?:\.\d+)?px$/.test(s) ? Number.parseFloat(s) : null;
    const near = (value, allowed) => allowed.some((v) => Math.abs(v - value) <= c.tolerance);
    for (const el of document.querySelectorAll('body, body *')) {
      if (el.closest(ignored)) { ignoredElements++; continue; }
      // SVG 内部单位、隐藏内容和 display:contents 不是当前可见 CSS 盒子。
      if (el.namespaceURI !== 'http://www.w3.org/1999/xhtml') continue;
      const r = el.getBoundingClientRect();
      const s = getComputedStyle(el);
      if (!r.width || !r.height || s.display === 'none' || s.visibility !== 'visible' || typeof el.checkVisibility === 'function' && !el.checkVisibility({ opacityProperty: true, visibilityProperty: true })) continue;
      elements++;
      const selector = label(el);
      const hasText = [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim()) || el.matches('input:not([type="hidden"]), textarea, select');
      if (hasText) {
        const size = px(s.fontSize);
        if (size !== null && size > 0) add('fontSizes', size, selector, 'font-size');
      }
      // Typed OM 保留 auto/%，避免把居中外边距、百分比流式间距当作离散令牌。
      const typed = typeof el.computedStyleMap === 'function' ? el.computedStyleMap() : null;
      for (const property of ['padding-top', 'padding-right', 'padding-bottom', 'padding-left', 'margin-top', 'margin-right', 'margin-bottom', 'margin-left', 'row-gap', 'column-gap']) {
        const declared = typed?.get(property)?.toString() || '';
        if (/auto|%/.test(declared)) continue;
        if ((property === 'row-gap' || property === 'column-gap') && !/flex|grid|columns/.test(s.display) && s.columnCount === 'auto') continue;
        const value = px(s.getPropertyValue(property));
        // 小于半个基数的位移是发丝线/视觉补偿（sr-only 的 -1px、描边对齐），不是间距档位。
        if (value !== null && Math.abs(value) >= c.spacingBase / 2 - c.tolerance) add('spacing', Math.abs(value), selector, property);
      }
      for (const property of ['border-top-left-radius', 'border-top-right-radius', 'border-bottom-right-radius', 'border-bottom-left-radius']) {
        const parts = s.getPropertyValue(property).split(/\s+/);
        const radius = (v, size) => v.endsWith('%') ? Number.parseFloat(v) * size / 100 : px(v);
        const x = radius(parts[0], r.width);
        const y = radius(parts[1] || parts[0], r.height);
        if (x === null || y === null) continue;
        if (x >= r.width / 2 - c.tolerance && y >= r.height / 2 - c.tolerance) { pillCorners++; continue; }
        for (const value of new Set([x, y])) {
          if (value > c.tolerance) add('radii', value, selector, property);
        }
      }
      if (s.boxShadow && s.boxShadow !== 'none') add('shadows', s.boxShadow.replace(/\s+/g, ' ').trim(), selector, 'box-shadow');
    }
    for (const key of ['fontSizes', 'spacing', 'radii']) buckets[key].sort((a, b) => a.value - b.value);
    const issues = [];
    const push = (kind, message, entries) => issues.push({
      level: isStrict ? 'error' : 'warn', check: `design-system-${kind}`, message,
      selector: entries[0]?.examples[0]?.selector || null,
      examples: entries.slice(0, 8),
    });
    const checkScale = (key, allowed, max, kind, name) => {
      const values = buckets[key];
      const bad = invalid[key];
      if (bad.length) push(kind, `${name}未在已声明档位内：${bad.map((b) => b.value).join(', ')}px（容差 ${c.tolerance}px）`, bad);
      else if (!allowed && values.length > max) push(kind, `${name}共 ${values.length} 档，超过预算 ${max} 档；请核对是否有随手微调值`, values);
    };
    checkScale('fontSizes', c.fontSizes, c.maxFontSizes, 'font-sizes', '可见文本字号');
    checkScale('radii', c.radii, c.maxRadii, 'radii', '非全圆角');
    const offGrid = invalid.spacing;
    if (offGrid.length) push('spacing', `间距不在${c.spacingValues ? '已声明档位' : `${c.spacingBase}px 网格`}内：${offGrid.map((b) => b.value).join(', ')}px（负外边距按绝对值核对）`, offGrid);
    if (buckets.shadows.length > c.maxShadows) push('shadows', `box-shadow 共 ${buckets.shadows.length} 套，超过预算 ${c.maxShadows} 套（每个完整声明算一套，不按逗号层数计数）`, buckets.shadows);
    return { stats: { elements, ignoredElements, pillCorners, ...buckets }, issues };
  }, { config, strict });
}

/** 页面上下文里执行的结构检查。返回 issue 数组。 */
async function collectStructure(page, ctx) {
  return page.evaluate(({ viewport, expectText }) => {
    const issues = [];
    const push = (level, check, message, selector) =>
      issues.push({ level, check, message, viewport, selector: selector || null });
    const sel = (el) => {
      const cls = el.className && typeof el.className === 'string'
        ? '.' + el.className.trim().split(/\s+/).slice(0, 2).join('.')
        : '';
      return `${el.tagName.toLowerCase()}${cls}`;
    };

    const body = document.body;
    const textLen = (body?.innerText || '').trim().length;
    const elCount = document.querySelectorAll('body *').length; // 只数 body 里的真实内容（head/meta 会误导）

    // 1. 页面非空：白屏是最常见的路由/权限配置事故
    if (!body || (textLen < 10 && elCount < 3)) {
      push('error', 'empty-page', '页面内容为空或接近为空，检查路由、权限、接口是否让首屏渲染失败');
    }

    // 2. 期望文案：确认进的是对的页面，而不是被重定向回登录页
    if (expectText && !(body?.innerText || '').includes(expectText)) {
      push('error', 'expect-text', `页面未包含期望文案 "${expectText}"（可能被重定向或还在加载）`);
    }

    // 3. 横向溢出：窄屏把内容挤出视口
    const doc = document.documentElement;
    const overflow = doc.scrollWidth - doc.clientWidth;
    if (overflow > 1) {
      push('error', 'h-overflow', `页面横向溢出 ${overflow}px（视口 ${doc.clientWidth}px）`);
    }

    // 4. 文本被裁切且没有省略号兜底 —— 长单词、动态数字、中英混排最容易撞
    let clipped = 0;
    for (const el of document.querySelectorAll('body *')) {
      if (!el.offsetParent && getComputedStyle(el).position !== 'fixed') continue;
      const hasOwnText = [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim());
      if (!hasOwnText) continue;
      const s = getComputedStyle(el);
      if (
        el.scrollWidth > el.clientWidth + 2 &&
        s.overflowX !== 'visible' &&
        s.textOverflow !== 'ellipsis' &&
        s.webkitLineClamp === 'none'
      ) {
        if (clipped++ < 8) {
          push('warn', 'text-clipped', `文本被裁切且无省略号：「${el.textContent.trim().slice(0, 30)}」`, sel(el));
        }
      }
    }

    // 5. 字号过小：正文小于 12px 在桌面端已经难读，中文尤其
    let small = 0;
    for (const el of document.querySelectorAll('body *')) {
      const hasOwnText = [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim());
      if (!hasOwnText || !el.offsetParent) continue;
      const px = parseFloat(getComputedStyle(el).fontSize);
      if (px > 0 && px < 12 && small++ < 5) {
        push('warn', 'font-too-small', `字号 ${px.toFixed(1)}px 偏小：「${el.textContent.trim().slice(0, 20)}」`, sel(el));
      }
    }

    // 6. 坏图 + Logo 被拉伸
    for (const img of document.querySelectorAll('img')) {
      const src = img.getAttribute('src') || '';
      if (img.complete && img.naturalWidth === 0 && src) {
        push('error', 'broken-image', `图片加载失败：${src}`, sel(img));
        continue;
      }
      const looksLogo = /logo|brand|mark|徽标/i.test(
        `${src} ${img.alt || ''} ${typeof img.className === 'string' ? img.className : ''}`,
      );
      if (looksLogo && img.complete && img.naturalWidth > 0) {
        const r = img.getBoundingClientRect();
        if (r.width > 0 && r.height > 0) {
          const boxRatio = r.width / r.height;
          const natRatio = img.naturalWidth / img.naturalHeight;
          if (Math.abs(boxRatio - natRatio) / natRatio > 0.05) {
            push(
              'error',
              'logo-distorted',
              `Logo 显示比例 ${boxRatio.toFixed(2)} 与原始 ${natRatio.toFixed(2)} 不符，疑似被拉伸`,
              sel(img),
            );
          }
        }
      }
    }

    // 7. 可交互元素重叠（跳过祖先/后代，否则必然误报）
    const interactive = [
      ...document.querySelectorAll('a, button, input, select, textarea, [role="button"], [onclick]'),
    ].filter((el) => {
      const r = el.getBoundingClientRect();
      const s = getComputedStyle(el);
      return r.width > 0 && r.height > 0 && s.visibility !== 'hidden' && s.display !== 'none';
    });
    const rects = interactive.map((el) => ({ el, r: el.getBoundingClientRect() }));
    let overlaps = 0;
    for (let i = 0; i < rects.length && overlaps < 8; i++) {
      for (let j = i + 1; j < rects.length && overlaps < 8; j++) {
        const a = rects[i];
        const b = rects[j];
        if (a.el.contains(b.el) || b.el.contains(a.el)) continue;
        const x = Math.min(a.r.right, b.r.right) - Math.max(a.r.left, b.r.left);
        const y = Math.min(a.r.bottom, b.r.bottom) - Math.max(a.r.top, b.r.top);
        if (x > 4 && y > 4) {
          overlaps++;
          push(
            'error',
            'element-overlap',
            `可交互元素重叠：<${sel(a.el)}> 与 <${sel(b.el)}>`,
            `${sel(a.el)} / ${sel(b.el)}`,
          );
        }
      }
    }

    // 8. 移动端点击区域过小：SKILL.md 与 review-rubric.md 都写死 ≥44×44，这里同口径
    if (viewport === 'mobile') {
      let tiny = 0;
      for (const el of interactive) {
        // 复选框/单选框的真实点击区是包裹它的 label，量 label 才对
        const box = el.tagName === 'INPUT' && /^(checkbox|radio)$/i.test(el.type)
          ? (el.closest('label')
             // <input id=x> + <label for=x> 也是合法写法，别把兄弟 label 漏掉
             || (el.id ? document.querySelector(`label[for="${CSS.escape(el.id)}"]`) : null)
             || el)
          : el;
        const r = box.getBoundingClientRect();
        // 正文里的行内文字链接按 WCAG 2.5.8 豁免：给它加 padding 只会打乱行高
        const cs = getComputedStyle(el);
        if (el.tagName === 'A' && cs.display === 'inline' && el.closest('p, li, dd, figcaption, td')) continue;
        const m = Math.min(r.width, r.height);
        if (m > 0 && m < 44) {
          tiny++;
          // 逐条都报，但同一条页面最多列 20 个例子，剩下的汇总成一条（免得刷屏又不至于漏报）
          if (tiny <= 20) {
            push(
              'warn',
              'small-tap-target',
              `点击区域过小 ${Math.round(r.width)}×${Math.round(r.height)}（要求 ≥44×44）：「${(el.textContent || el.getAttribute('aria-label') || el.tagName).trim().slice(0, 20)}」`,
              sel(el),
            );
          }
        }
      }
      if (tiny > 20) {
        push('warn', 'small-tap-target-more', `另有 ${tiny - 20} 个点击区小于 44×44（同类问题只列前 20 个）`, '');
      }
    }

    // 9. 图标按钮没有无障碍名称（悬停提示也就无从谈起）
    for (const el of document.querySelectorAll('button, a[role="button"], [role="button"]')) {
      const label = (
        el.getAttribute('aria-label') ||
        el.getAttribute('title') ||
        el.textContent ||
        ''
      ).trim();
      if (!label && el.querySelector('svg, img, i')) {
        push('warn', 'icon-button-no-label', '图标按钮缺少 aria-label / title，读屏和悬停都没有说明', sel(el));
      }
    }

    return issues;
  }, ctx);
}

/** 在「减少动效」偏好下仍然无限循环的动效：这类动效没有承载状态变化。 */
async function collectMotion(page) {
  return page.evaluate(() => {
    const hits = [];
    for (const el of document.querySelectorAll('body *')) {
      const s = getComputedStyle(el);
      if (!s.animationName || s.animationName === 'none') continue;
      if (!/infinite/.test(s.animationIterationCount) && !/infinite/.test(s.animationDuration)) continue;
      if (hits.length < 5) {
        const cls = typeof el.className === 'string'
          ? '.' + el.className.trim().split(/\s+/).slice(0, 2).join('.')
          : '';
        hits.push({
          selector: `${el.tagName.toLowerCase()}${cls}`,
          animation: `${s.animationName} ${s.animationDuration}`,
        });
      }
    }
    return hits;
  });
}

/** 注入内置 axe-core 跑 WCAG A/AA。返回 null 表示未启用或不可用。 */
async function runAxe(page) {
  try {
    await page.addScriptTag({ path: AXE_PATH });
  } catch (e) {
    return { error: `无法注入 axe-core：${e.message.slice(0, 120)}` };
  }
  return page.evaluate(async (tags) => {
    if (typeof window.axe === 'undefined') return { error: 'axe 未注入' };
    const r = await window.axe.run(document, {
      runOnly: { type: 'tag', values: tags },
      resultTypes: ['violations'],
    });
    return {
      version: r.testEngine?.version || null,
      violations: (r.violations || []).map((v) => ({
        id: v.id,
        impact: v.impact,
        help: v.help,
        helpUrl: v.helpUrl,
        count: v.nodes.length,
        nodes: (v.nodes || []).slice(0, 5).map((n) => ({
          target: (n.target || []).join(' '),
          html: (n.html || '').slice(0, 160),
          summary: (n.failureSummary || '').slice(0, 240),
        })),
      })),
    };
  }, AXE_TAGS);
}

async function main() {
  const args = parseArgs(process.argv, {
    viewports: 'desktop,tablet,mobile',
    themes: 'light',
    wait: '800',
  });

  if (args.help) {
    console.log('用法：node scripts/audit.mjs --url <url> [--themes light,dark] [--design-system [config.json]] [--strict-design-system]\n' +
      '  --design-system         检查字号/间距/圆角/阴影，默认仅警告\n' +
      '  --design-system <json>  使用已有项目的设计体系配置\n' +
      '  --strict-design-system 把设计体系警告升级为错误（需启用 --design-system）\n' +
      '完整参数与配置结构见 docs/scripts.md。');
    return;
  }
  let designSystem = null;
  const strictDesignSystem = flag(args, 'strict-design-system');
  try {
    if (flag(args, 'design-system')) {
      const value = args['design-system'];
      const input = value === true || /^true$/i.test(String(value))
        ? {} : JSON.parse(await readFile(path.resolve(String(value)), 'utf8'));
      designSystem = normalizeDesignSystem(input);
    }
    if (strictDesignSystem && !designSystem) throw new Error('--strict-design-system 需要同时启用 --design-system');
  } catch (e) {
    console.error(`设计体系配置错误：${e.message}`);
    process.exitCode = 2;
    return;
  }

  // --base 把 /pricing 这类相对路径拼成绝对 URL
  const baseUrl = args.base && args.base !== true ? String(args.base).replace(/\/+$/, '') + '/' : '';

  const urls = [];
  if (args.url && args.url !== true) urls.push(String(args.url));
  if (args.pages && args.pages !== true) {
    const { targets: pageTargets, warnings } = await resolvePages(String(args.pages), { baseUrl });
    for (const w of warnings) console.warn(`${MARK.warn} ${w}`);
    urls.push(...pageTargets);
  }
  if (urls.length === 0) {
    console.error('必须提供 --url <url>，或 --pages <逗号分隔路径|page-list.txt>');
    process.exit(2);
  }
  const targets = urls.map((u) => (baseUrl ? new URL(u, baseUrl).toString() : u));

  const viewports = listArg(args.viewports, 'desktop,tablet,mobile');
  const themes = listArg(args.themes, 'light');
  for (const v of viewports) {
    if (!resolveViewport(v)) {
      console.error(`未知视口 ${v}，可选：${Object.keys(VIEWPORTS).join(', ')} 或 1440x900`);
      process.exit(2);
    }
  }

  // --expect-text 支持 `|` 按页对应（--pages 多页时）；只写一段则所有页共用
  let expectMap;
  try {
    expectMap = expectTextsFor(args['expect-text'], targets.length);
  } catch (e) {
    console.error(e.message);
    process.exit(2);
  }
  const wantAxe = flag(args, 'axe', true);
  const reducedMotion = flag(args, 'reduced-motion') ? 'reduce' : 'no-preference';
  const storageState = args['storage-state'] && args['storage-state'] !== true
    ? path.resolve(String(args['storage-state']))
    : undefined;
  const waitMs = Number(args.wait) || 0;
  const out = args.out && args.out !== true ? String(args.out) : 'audit-report.json';

  let chromium;
  try {
    chromium = await loadChromium();
  } catch (e) {
    console.error(e.message);
    process.exit(2);
  }

  const report = {
    generatedAt: new Date().toISOString(),
    options: {
      viewports,
      themes,
      expectText: expectMap ? String(args['expect-text']) : null,
      axe: wantAxe,
      reducedMotion,
      designSystem,
      strictDesignSystem,
    },
    axeVersion: null,
    targets: [],
    totals: { error: 0, warn: 0, console: 0, http: 0, axe: 0 },
  };

  const browser = await chromium.launch();
  try {
    if (designSystem?.ignoreSelectors.length) {
      const probe = await browser.newPage();
      try {
        await probe.evaluate((selectors) => {
          for (const selector of selectors) document.querySelector(selector);
        }, designSystem.ignoreSelectors);
      } catch (e) {
        console.error(`设计体系配置错误：ignoreSelectors 含无效选择器：${e.message}`);
        process.exitCode = 2;
        return;
      } finally {
        if (!probe.isClosed()) await probe.close();
      }
    }
    for (const theme of themes) {
      for (const v of viewports) {
        const context = await browser.newContext(
          contextOptions({ viewport: v, theme, reducedMotion, storageState }),
        );
        const page = await context.newPage();
        await page.addInitScript(installClsObserver);
        if (theme === 'dark') await context.addInitScript(forceDark);
        const watcher = watchPage(page);

        for (let ti = 0; ti < targets.length; ti++) {
          const url = targets[ti];
          const expectText = expectMap ? (expectMap.perPage ? expectMap.perPage[ti] : expectMap.all) : null;
          const t = { url, viewport: v, theme, issues: [], axe: null, consoleErrors: [], httpErrors: [], cls: 0 };
          try {
            await goto(page, url);
            if (waitMs) await page.waitForTimeout(waitMs);
            t.issues = await collectStructure(page, { viewport: v, expectText });
            if (designSystem) {
              const ds = await collectDesignSystem(page, designSystem, strictDesignSystem);
              t.designSystem = ds.stats;
              t.issues.push(...ds.issues);
            }
            t.cls = Number(await page.evaluate(() => window.__cls__ ?? 0).catch(() => 0));
            if (reducedMotion === 'reduce') {
              const looping = await collectMotion(page);
              for (const m of looping) {
                t.issues.push({
                  level: 'warn',
                  check: 'motion-not-reduced',
                  message: `「减少动效」已开启但仍在循环播放：${m.animation}`,
                  selector: m.selector,
                });
              }
            }
            if (wantAxe) {
              const axe = await runAxe(page);
              if (axe?.error) {
                t.issues.push({ level: 'warn', check: 'axe-unavailable', message: axe.error });
              } else if (axe) {
                report.axeVersion = axe.version;
                t.axe = axe.violations;
              }
            }
            const noise = watcher.take();
            t.consoleErrors = noise.consoleErrors;
            t.httpErrors = noise.httpErrors;
          } catch (e) {
            t.issues.push({ level: 'error', check: 'navigation', message: e.message.slice(0, 300) });
            watcher.take();
          }
          report.targets.push(t);
        }
        await context.close();
      }
    }
  } finally {
    await browser.close();
  }

  // ---- 汇总 ----
  const axeByLevel = (t) =>
    (t.axe || []).reduce(
      (acc, v) => {
        const lv = AXE_LEVEL[v.impact] || 'warn';
        acc[lv] += v.count;
        return acc;
      },
      { error: 0, warn: 0 },
    );

  for (const t of report.targets) {
    const axe = axeByLevel(t);
    t.counts = {
      error: t.issues.filter((i) => i.level === 'error').length + axe.error,
      warn: t.issues.filter((i) => i.level === 'warn').length + axe.warn,
      axe: (t.axe || []).length,
    };
    report.totals.error += t.counts.error;
    report.totals.warn += t.counts.warn;
    report.totals.axe += t.counts.axe;
    report.totals.console += t.consoleErrors.length;
    report.totals.http += t.httpErrors.length;
  }

  const reportPath = await writeJson(out, report);

  for (const t of report.targets) {
    const ok = t.counts.error === 0;
    line(
      ok ? (t.counts.warn ? MARK.warn : MARK.pass) : MARK.fail,
      `[${t.viewport}/${t.theme}] ${t.url} — 错误 ${t.counts.error}, 警告 ${t.counts.warn}, ` +
        `axe ${t.counts.axe} 项, console ${t.consoleErrors.length}, HTTP ${t.httpErrors.length}, CLS ${t.cls.toFixed(3)}`,
    );
    const show = [
      ...t.issues.filter((i) => i.level === 'error').slice(0, 6),
      ...t.issues.filter((i) => i.level === 'warn' && i.check.startsWith('design-system-')),
      ...(t.axe || [])
        .filter((v) => AXE_LEVEL[v.impact] === 'error')
        .slice(0, 4)
        .map((v) => ({ level: 'error', check: `axe:${v.id}`, message: `${v.help}（${v.count} 处）` })),
    ];
    for (const i of show) console.log(`     - [${i.check}] ${i.message}`);
    if (t.cls > 0.1) console.log(`     - [layout-shift] CLS ${t.cls.toFixed(3)} > 0.1，检查图片/骨架/字体是否有固定尺寸`);
  }

  console.log(`\n合计：${report.totals.error} 错误 / ${report.totals.warn} 警告 / ` +
    `${report.totals.axe} 类 axe 违规 / ${report.totals.console} console / ${report.totals.http} HTTP`);
  console.log(`报告：${reportPath}`);
  if (report.axeVersion) console.log(`axe-core ${report.axeVersion}（WCAG 2.1 A/AA 规则集）`);
  process.exit(report.totals.error > 0 ? 1 : 0);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((e) => {
    console.error(e.message);
    process.exitCode = 2;
  });
}
