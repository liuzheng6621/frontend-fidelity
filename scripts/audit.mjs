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
 *   node <skill>/scripts/audit.mjs --url http://localhost:4173/ --red-flags          # 反模式红旗（按 P0/P1/P2 分级）
 *   node <skill>/scripts/audit.mjs --url http://localhost:4173/ --red-flags --strict-red-flags
 *
 * 检查分两级：
 *   error —— 页面坏了（内容为空、横向溢出、坏图、Logo 拉伸、交互元素重叠、
 *            导航失败、axe 的 serious/critical 违规、红旗里的 P0 强制项）
 *   warn  —— 需要人工看图确认（文本裁切、点击区过小、字号过小、图标按钮无名字、
 *            axe 的 moderate/minor 违规、CLS 偏高、无障碍降级模式下仍在循环的动效、
 *            red-flag-*：anti-slop §八 pre-flight 的可机械判定项，需 --red-flags；
 *            P0 默认 error，P1 默认 warn（--strict-red-flags 升级），P2 永远只警告）
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
      // 视觉隐藏不是裁切：sr-only（1×1 + clip rect）与 clip-path: inset(50%) 都是无障碍标准写法，
      // 文本本来就该看不见，不能按「被裁掉」报。
      const box = el.getBoundingClientRect();
      const visuallyHidden =
        box.width <= 2 ||
        box.height <= 2 ||
        (s.clip && s.clip !== 'auto' && /rect\(\s*0/.test(s.clip)) ||
        (s.clipPath && /inset\(\s*50%/.test(s.clipPath));
      if (visuallyHidden) continue;
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

/**
 * 红旗检查（--red-flags）：把 references/anti-slop.md §八 pre-flight 里
 * 可以机械判定的子集沉成退出码——「反模式优先」的正确形态不是把文档前置，
 * 而是让违规直接变成可执行的失败项。
 *
 * 每条检查带 enforcement 级别（与 anti-slop.md §八 的标注一一对应）：
 *   P0 强制 —— 可访问性 / 性能 / 结构硬伤，且误判率低，默认就是 error（退出码 1）
 *   P1 建议 —— 应当修，默认 warn；--strict-red-flags 升级为 error
 *   P2 可关 —— 风格取向，永远只警告，不升级
 * 级别是判据的一部分，不是配置项：改级别等于改规范，要同步改文档。
 */
const RED_FLAG_ENFORCEMENT = {
  'placeholder-as-label': 'P0',
  'animated-layout-props': 'P0',
  'scroll-listener': 'P0',
  'no-reduced-motion': 'P0',
  'hero-h1-lines': 'P1',
  'hero-top-padding': 'P1',
  'cta-words': 'P1',
  'nav-height': 'P1',
  'three-equal-cards': 'P1',
  'long-list-divide': 'P1',
  'duplicate-intent': 'P1',
  'infinite-flood': 'P1',
  'hero-version': 'P2',
};

async function collectRedFlags(page, ctx) {
  return page.evaluate(({ viewport, strict, enforcement }) => {
    const issues = [];
    const push = (check, message, selector) => {
      const level = enforcement[check] || 'P1';
      issues.push({
        level: level === 'P0' || (level === 'P1' && strict) ? 'error' : 'warn',
        check: `red-flag-${check}`,
        enforcement: level,
        message,
        viewport,
        selector: selector || null,
      });
    };
    const sel = (el) => {
      const cls = el.className && typeof el.className === 'string'
        ? '.' + el.className.trim().split(/\s+/).slice(0, 2).join('.')
        : '';
      return `${el.tagName.toLowerCase()}${cls}`;
    };
    const visible = (el) => {
      const r = el.getBoundingClientRect();
      return r.width > 0 && r.height > 0;
    };

    // hero 定位：显式命名优先，其次 main / body 的第一个 section
    const hero =
      document.querySelector('[class*="hero"], [id*="hero"]') ||
      document.querySelector('main section') ||
      document.querySelector('body > section');

    // ---- hero（anti-slop §八「hero」）----
    const h1 = hero?.querySelector('h1') || document.querySelector('h1');
    if (hero && h1 && hero.contains(h1) && visible(h1)) {
      // 块级元素 getClientRects() 只返回一个盒子，行数要用 Range 的每行 rect 数
      const range = document.createRange();
      range.selectNodeContents(h1);
      const lines = new Set(
        [...range.getClientRects()].filter((r) => r.width > 0 && r.height > 0).map((r) => Math.round(r.top)),
      ).size;
      if (lines > 2) {
        push('hero-h1-lines', `hero 标题有 ${lines} 行（> 2 行）：缩短文案，或加宽容器 / 调小字号`, sel(h1));
      }
      const pt = Number.parseFloat(getComputedStyle(hero).paddingTop) || 0;
      if (pt > 96) {
        push('hero-top-padding', `hero 顶部内边距 ${Math.round(pt)}px（> 6rem=96px）：内容浮在视口半腰，CTA 容易被顶出首屏`, sel(hero));
      }
      const versionHit = (hero.innerText || '').match(/\bv\d+\.\d+(?:\.\d+)?\b/i);
      if (versionHit) {
        push('hero-version', `hero 里出现版本号样式的文字 "${versionHit[0]}"：版本号属于 changelog / 页脚，不属于卖点位`, sel(hero));
      }
      const cta =
        hero.querySelector('a[class*="btn"], a[class*="cta"], button[class*="btn"], a[class*="button"], [class*="cta"] a') ||
        hero.querySelector('a[href], button');
      if (cta) {
        const text = (cta.innerText || '').trim().replace(/\s+/g, ' ');
        const cjk = (text.match(/[\u4e00-\u9fff]/g) || []).length;
        const latin = (text.replace(/[\u4e00-\u9fff]/g, ' ').match(/[A-Za-z0-9]+/g) || []).length;
        const words = latin + Math.ceil(cjk / 2); // 中文按 2 字 ≈ 1 词折算
        if (words > 3) {
          push('cta-words', `主 CTA 文案 "${text.slice(0, 24)}" 约 ${words} 词（> 3 词）：主 CTA 收进 1–2 词，解释性动作放次级按钮`, sel(cta));
        }
      }
    }

    // ---- 结构与节奏（§八「结构与节奏」）----
    // 只认真正的导航：nav 元素，或至少含 2 个链接的 header（纯标题头不算导航）
    const nav =
      document.querySelector('header nav, nav') ||
      [...document.querySelectorAll('header')].find((h) => h.querySelectorAll('a').length >= 2) ||
      null;
    if (nav && visible(nav)) {
      const h = nav.getBoundingClientRect().height;
      // 纵向侧边导航天然高，「导航单行 ≤80px」只约束横向顶部导航：
      // 链接大多各占一行（行数 ≥ 链接数一半且 ≥2）就判定为侧边栏，跳过
      const links = [...nav.querySelectorAll('a')].filter(visible);
      const rows = new Set(links.map((a) => Math.round(a.getBoundingClientRect().top / 8)));
      const stackedVertical = rows.size >= 2 && rows.size >= links.length * 0.5;
      if (!stackedVertical && h > 80) {
        push('nav-height', `导航高度 ${Math.round(h)}px（> 80px）：顶部导航应单行，多行说明菜单项塞得太满`, sel(nav));
      }
    }
    // 三张等大功能卡：grid/flex 容器恰好 3 个等宽子项，每个都是「标题 + 正文」
    for (const container of document.querySelectorAll('body *')) {
      if (container.children.length !== 3) continue;
      if (container.closest('footer, header, nav')) continue;
      const display = getComputedStyle(container).display;
      if (!/^(grid|inline-grid|flex|inline-flex)$/.test(display)) continue;
      const kids = [...container.children];
      if (!kids.every(visible)) continue;
      const widths = kids.map((k) => Math.round(k.getBoundingClientRect().width));
      if (Math.max(...widths) - Math.min(...widths) > 2 || widths[0] < 120) continue;
      const uniform = kids.every(
        (k) =>
          k.querySelector('h1, h2, h3, h4, h5, h6, [class*="title"], [class*="heading"]') &&
          (k.innerText || '').trim().length > 20,
      );
      if (uniform) {
        push('three-equal-cards', '三张等大功能卡（3 个等宽格子、各带标题+正文）：最高频的模板痕迹，改不对称布局 / bento / 图文交替，或让其中一格换形态', sel(container));
        break;
      }
    }
    // 长列表（>5 项）只用 <ul> + divide-y
    for (const list of document.querySelectorAll('ul, ol')) {
      const items = [...list.children].filter((k) => k.tagName === 'LI');
      if (items.length <= 5) continue;
      let divided = 0;
      for (const li of items) {
        const s = getComputedStyle(li);
        const hasTop = Number.parseFloat(s.borderTopWidth) > 0 && s.borderTopStyle !== 'none';
        const hasBottom = Number.parseFloat(s.borderBottomWidth) > 0 && s.borderBottomStyle !== 'none';
        if (hasTop || hasBottom) divided++;
      }
      if (divided >= items.length - 1) {
        push('long-list-divide', `${items.length} 项长列表只用 <ul> + 分隔线：超过 5 项换表格 / 卡片 / 折叠分组，并给分页或虚拟滚动`, sel(list));
        break;
      }
    }
    // 同一意图只有一个标签：导航里出现重复链接文案
    if (nav) {
      const seen = new Map();
      for (const a of nav.querySelectorAll('a')) {
        const t = (a.innerText || '').trim().toLowerCase();
        if (!t || t.length > 24) continue;
        seen.set(t, (seen.get(t) || 0) + 1);
      }
      for (const [t, n] of seen) {
        if (n > 1) {
          push('duplicate-intent', `导航里同一标签 "${t}" 出现 ${n} 次：同一意图只保留一个入口`, sel(nav));
          break;
        }
      }
    }
    // 表单（§八「三把锁与对比度」）：placeholder 不能当标签
    let phNoLabel = 0;
    let phFirst = null;
    for (const inp of document.querySelectorAll('input:not([type="hidden"]), textarea')) {
      if (!inp.placeholder) continue;
      if (inp.getAttribute('aria-label') || inp.getAttribute('aria-labelledby')) continue;
      if (inp.id && document.querySelector(`label[for="${CSS.escape(inp.id)}"]`)) continue;
      if (inp.closest('label')) continue;
      phNoLabel++;
      phFirst = phFirst || sel(inp);
    }
    if (phNoLabel) {
      push('placeholder-as-label', `${phNoLabel} 个表单控件只有 placeholder 当标签（无 label / aria-label）：输入后提示就消失，读屏也拿不到名字`, phFirst);
    }

    // ---- 动效与工程（§八「动效与工程」）----
    let hasKeyframes = false;
    let hasReduceQuery = false;
    let sheetsReadable = true;
    const animatedLayout = new Set();
    const LAYOUT_PROPS = /^(top|right|bottom|left|width|height|margin(-top|-right|-bottom|-left)?|padding(-top|-right|-bottom|-left)?)$/;
    for (const sheet of document.styleSheets) {
      let rules;
      try {
        rules = sheet.cssRules;
      } catch {
        sheetsReadable = false; // 跨域样式表读不了，判不了就不硬判
        continue;
      }
      const walk = (list) => {
        for (const r of list) {
          const name = r.constructor?.name || '';
          if (name === 'CSSKeyframesRule') {
            hasKeyframes = true;
            for (const kf of r.cssRules) {
              for (let i = 0; i < (kf.style?.length || 0); i++) {
                const prop = kf.style[i];
                if (LAYOUT_PROPS.test(prop)) animatedLayout.add(`${r.name} 改 ${prop}`);
              }
            }
            continue;
          }
          if (name === 'CSSMediaRule' && /prefers-reduced-motion/.test(r.conditionText || r.media?.mediaText || '')) {
            hasReduceQuery = true;
          }
          if (r.cssRules) walk(r.cssRules);
        }
      };
      walk(rules);
    }
    if (sheetsReadable && hasKeyframes && !hasReduceQuery) {
      push('no-reduced-motion', '定义了 @keyframes 动画但全站没有 prefers-reduced-motion 媒体查询：动效敏感用户关不掉它', null);
    }
    if (animatedLayout.size) {
      push('animated-layout-props', `动画直接改布局属性（${[...animatedLayout].slice(0, 4).join('；')}）：每帧触发重排，换 transform / opacity`, null);
    }
    {
      let inlineJs = '';
      for (const s of document.querySelectorAll('script:not([src])')) inlineJs += s.textContent || '';
      if (/addEventListener\(\s*['"]scroll['"]/.test(inlineJs)) {
        push('scroll-listener', "内联脚本用 addEventListener('scroll') 驱动行为：换 IntersectionObserver 或 position: sticky", null);
      }
    }
    let infinite = 0;
    for (const el of document.querySelectorAll('body *')) {
      const s = getComputedStyle(el);
      if (s.animationName !== 'none' && /infinite/.test(s.animationIterationCount)) infinite++;
    }
    if (infinite > 8) {
      push('infinite-flood', `${infinite} 个元素在无限循环动画（> 8 处）：无限循环铺满屏幕会抢正文注意力，跑马灯 ≤ 1 处`, null);
    }

    return issues;
  }, { ...ctx, enforcement: RED_FLAG_ENFORCEMENT });
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
    console.log('用法：node scripts/audit.mjs --url <url> [--themes light,dark] [--design-system [config.json]] [--strict-design-system] [--red-flags] [--strict-red-flags]\n' +
      '  --design-system         检查字号/间距/圆角/阴影，默认仅警告\n' +
      '  --design-system <json>  使用已有项目的设计体系配置\n' +
      '  --strict-design-system 把设计体系警告升级为错误（需启用 --design-system）\n' +
      '  --red-flags             红旗检查：anti-slop §八 pre-flight 的可机械判定项（hero/结构/表单/动效）\n' +
      '                          P0 强制项默认即 error（占位符当标签 / 动画改布局 / scroll 驱动 / 不尊重 reduced-motion）\n' +
      '  --strict-red-flags      把 P1 建议项也升级为错误（需启用 --red-flags）；P2 可关项始终只警告\n' +
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
  const wantRedFlags = flag(args, 'red-flags');
  const strictRedFlags = flag(args, 'strict-red-flags');
  if (strictRedFlags && !wantRedFlags) {
    console.error('--strict-red-flags 需要同时启用 --red-flags');
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
      redFlags: wantRedFlags,
      strictRedFlags,
    },
    axeVersion: null,
    targets: [],
    totals: { error: 0, warn: 0, console: 0, http: 0, axe: 0, redFlags: { P0: 0, P1: 0, P2: 0 } },
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
            if (wantRedFlags) {
              // 级别在 collectRedFlags 内部按 RED_FLAG_ENFORCEMENT 决定，这里不再整体升级
              t.issues.push(...(await collectRedFlags(page, { viewport: v, strict: strictRedFlags })));
            }
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
    const flags = t.issues.filter((i) => i.check.startsWith('red-flag-'));
    t.counts = {
      error: t.issues.filter((i) => i.level === 'error').length + axe.error,
      warn: t.issues.filter((i) => i.level === 'warn').length + axe.warn,
      axe: (t.axe || []).length,
    };
    t.redFlags = {
      P0: flags.filter((i) => i.enforcement === 'P0').length,
      P1: flags.filter((i) => i.enforcement === 'P1').length,
      P2: flags.filter((i) => i.enforcement === 'P2').length,
    };
    report.totals.error += t.counts.error;
    report.totals.warn += t.counts.warn;
    report.totals.axe += t.counts.axe;
    report.totals.console += t.consoleErrors.length;
    report.totals.http += t.httpErrors.length;
    for (const k of ['P0', 'P1', 'P2']) report.totals.redFlags[k] += t.redFlags[k];
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
      ...t.issues.filter((i) => i.level === 'warn' && (i.check.startsWith('design-system-') || i.check.startsWith('red-flag-'))),
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
  if (wantRedFlags) {
    const rf = report.totals.redFlags;
    console.log(`红旗：P0 强制 ${rf.P0}（计错误）/ P1 建议 ${rf.P1}${strictRedFlags ? '（已升级为错误）' : ''} / P2 可关 ${rf.P2}`);
  }
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
