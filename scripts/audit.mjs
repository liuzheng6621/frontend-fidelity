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
  readPages,
  watchPage,
  writeJson,
} from './lib/common.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const AXE_PATH = path.join(HERE, 'vendor', 'axe.min.js');

/** 只跑 WCAG 2.1 A/AA 的规则集，跳过 best-practice（噪音大、争议多）。 */
const AXE_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'];
/** axe impact → 本工具的级别：serious/critical 说明有用户真的用不了。 */
const AXE_LEVEL = { critical: 'error', serious: 'error', moderate: 'warn', minor: 'warn' };

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

  const urls = [];
  if (args.url && args.url !== true) urls.push(String(args.url));
  if (args.pages && args.pages !== true) {
    const raw = String(args.pages);
    const isFile = /\.(txt|list|paths)$/i.test(raw) && !raw.includes(',');
    if (isFile) urls.push(...(await readPages(raw)));
    else
      urls.push(
        ...raw
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean),
      );
  }
  if (urls.length === 0) {
    console.error('必须提供 --url <url>，或 --pages <逗号分隔路径|page-list.txt>');
    process.exit(2);
  }
  // --base 把 /pricing 这类相对路径拼成绝对 URL
  const baseUrl = args.base && args.base !== true ? String(args.base).replace(/\/+$/, '') + '/' : '';
  const targets = urls.map((u) => (baseUrl ? new URL(u, baseUrl).toString() : u));

  const viewports = listArg(args.viewports, 'desktop,tablet,mobile');
  const themes = listArg(args.themes, 'light');
  for (const v of viewports) {
    if (!resolveViewport(v)) {
      console.error(`未知视口 ${v}，可选：${Object.keys(VIEWPORTS).join(', ')} 或 1440x900`);
      process.exit(2);
    }
  }

  const expectText = args['expect-text'] && args['expect-text'] !== true
    ? String(args['expect-text'])
    : null;
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
    options: { viewports, themes, expectText, axe: wantAxe, reducedMotion },
    axeVersion: null,
    targets: [],
    totals: { error: 0, warn: 0, console: 0, http: 0, axe: 0 },
  };

  const browser = await chromium.launch();
  for (const theme of themes) {
    for (const v of viewports) {
      const context = await browser.newContext(
        contextOptions({ viewport: v, theme, reducedMotion, storageState }),
      );
      const page = await context.newPage();
      await page.addInitScript(installClsObserver);
      if (theme === 'dark') await context.addInitScript(forceDark);
      const watcher = watchPage(page);

      for (const url of targets) {
        const t = { url, viewport: v, theme, issues: [], axe: null, consoleErrors: [], httpErrors: [], cls: 0 };
        try {
          await goto(page, url);
          if (waitMs) await page.waitForTimeout(waitMs);
          t.issues = await collectStructure(page, { viewport: v, expectText });
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
  await browser.close();

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

main();
