#!/usr/bin/env node
/**
 * 量测任意参考站的真实计算样式：字体、字号阶梯、配色、圆角、间距、控件高度、表格密度、令牌命名。
 *
 * 为什么需要它：做「像这个站」的界面时，凭记忆描述（"大标题、干净、留白多"）落地必然走样；
 * 量出 h1/p 字号、行高比、间距基数、圆角档位，才能给出可执行的数值。
 * 本 skill 的 references/design-evidence.md 就是用它采集的。
 *
 * 用法:
 *   node scripts/probe-ref.mjs --url https://linear.app --out .tmp/ref --name linear
 *   node scripts/probe-ref.mjs --url https://stripe.com --brief          # 只打印关键数值
 *   node scripts/probe-ref.mjs --url http://localhost:5173 --viewport desktop --wait 5000
 *
 * 输出: <out>/<name>.json（机读）+ <out>/<name>.jpg（视口截图），--brief 时仍会写 JSON。
 */

import { loadChromium, contextOptions, parseArgs, flag, goto, writeJson, slugify, MARK, line, forceDark } from './lib/common.mjs';

const args = parseArgs(process.argv, {
  url: '',
  out: '.tmp/ref',
  name: '',
  viewport: 'desktop',
  wait: '3000',
  theme: 'light',
});

if (!args.url) {
  console.error('用法: node scripts/probe-ref.mjs --url <URL> [--out .tmp/ref] [--name slug] [--brief]');
  process.exit(2);
}

const url = String(args.url);
const name = String(args.name || slugify(url));
const outDir = String(args.out);
const brief = flag(args, 'brief');
const shoot = flag(args, 'shot', true);

function probe() {
  // 现代 Chrome 对 oklch()/color() 的计算值保留色彩空间（Tailwind v4 默认全 oklch），
  // 正则匹配 rgb() 会全部落空。改用 1×1 canvas 让浏览器自己解析并归一化到 sRGB。
  const cvs = document.createElement('canvas');
  cvs.width = cvs.height = 1;
  const cx = cvs.getContext('2d', { willReadFrequently: true });
  const rgb = (v) => {
    if (!v) return null;
    const s = String(v).trim();
    if (!s || s === 'transparent') return null;
    try {
      cx.fillStyle = '#000';
      cx.fillStyle = s;
      cx.clearRect(0, 0, 1, 1);
      cx.fillRect(0, 0, 1, 1);
      const d = cx.getImageData(0, 0, 1, 1).data;
      if (d[3] === 0) return null;
      return '#' + [d[0], d[1], d[2]].map((n) => n.toString(16).padStart(2, '0')).join('');
    } catch {
      return null;
    }
  };
  const inc = (o, k, w = 1) => k && (o[k] = (o[k] || 0) + w);
  const top = (o, n) => Object.entries(o).sort((a, b) => b[1] - a[1]).slice(0, n);

  const fonts = {}, sizes = {}, textColors = {}, bgColors = {}, radius = {}, gaps = {};
  let counted = 0;
  for (const el of [...document.querySelectorAll('body *')].slice(0, 8000)) {
    const cs = getComputedStyle(el);
    const r = el.getBoundingClientRect();
    if (r.width < 2 || r.height < 2) continue;
    counted++;
    const own = [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim().length > 1);
    const w = own ? Math.max(el.textContent.trim().length, 1) : 1;
    inc(fonts, cs.fontFamily.split(',')[0].replace(/["']/g, '').trim());
    if (w > 1) {
      inc(sizes, String(Math.round(parseFloat(cs.fontSize))), w);
      inc(textColors, rgb(cs.color), w);
    }
    inc(bgColors, rgb(cs.backgroundColor), Math.min(w, 30));
    if (cs.borderRadius && cs.borderRadius !== '0px') inc(radius, cs.borderRadius);
    if (cs.gap && cs.gap !== 'normal') inc(gaps, cs.gap.split(' ')[0]);
  }

  const metric = (sel) => {
    const el = document.querySelector(sel);
    if (!el) return null;
    const cs = getComputedStyle(el);
    const fs = parseFloat(cs.fontSize);
    return {
      size: Math.round(fs),
      lh: cs.lineHeight === 'normal' ? null : +(parseFloat(cs.lineHeight) / fs || 0).toFixed(2),
      weight: cs.fontWeight,
      color: rgb(cs.color),
      font: cs.fontFamily.split(',')[0].replace(/["']/g, '').trim(),
      tracking: cs.letterSpacing,
      transform: cs.textTransform,
    };
  };

  const box = (sel) => {
    const el = document.querySelector(sel);
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return { w: Math.round(r.width), h: Math.round(r.height) };
  };

  const cards = [...document.querySelectorAll('[class*=card], [class*=Card]')].slice(0, 20);
  const cssVars = {};
  for (const sheet of [...document.styleSheets]) {
    let rules = null;
    try {
      rules = sheet.cssRules;
    } catch {
      continue;
    }
    for (const rule of rules || []) {
      if (!rule.style) continue;
      for (const prop of rule.style) if (prop.startsWith('--')) inc(cssVars, prop);
      if (Object.keys(cssVars).length > 400) break;
    }
  }

  // :root 上实际生效的自定义属性（含最终值）。样式表可能跨域读不到、也可能被
  // JS 后注入，所以再遍历一次计算样式兜底——wegic.ai 的 --wg-* 只能这样拿到。
  const rootVars = {};
  {
    const rootCS = getComputedStyle(document.documentElement);
    for (let i = 0; i < rootCS.length && Object.keys(rootVars).length < 120; i++) {
      const prop = rootCS[i];
      if (!prop || !prop.startsWith('--')) continue;
      const val = rootCS.getPropertyValue(prop).trim();
      if (!val) continue;
      rootVars[prop] = val.replace(/\s+/g, ' ').slice(0, 110);
      inc(cssVars, prop);
    }
  }

  const lum = (hex) => {
    if (!hex || hex.length < 7) return 1;
    const v = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
    const l = v.map((x) => (x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4));
    return 0.2126 * l[0] + 0.7152 * l[1] + 0.0722 * l[2];
  };

  const body = getComputedStyle(document.body);
  const bodyBg = rgb(body.backgroundColor) || '#ffffff';
  const rowH = [...document.querySelectorAll('tbody tr')].slice(0, 8).map((tr) => Math.round(tr.getBoundingClientRect().height));
  const ctlH = [...document.querySelectorAll('button, input, select, [role=combobox], .ant-btn, .ant-input')]
    .slice(0, 20)
    .map((e) => Math.round(e.getBoundingClientRect().height))
    .filter((h) => h > 8 && h < 140);

  return {
    url: location.href,
    title: document.title,
    viewport: { w: innerWidth, h: innerHeight },
    countedElements: counted,
    theme: lum(bodyBg) < 0.2 ? 'dark' : lum(bodyBg) > 0.75 ? 'light' : 'tinted',
    bodyBg,
    bodyText: rgb(body.color),
    fonts: top(fonts, 6),
    sizes: top(sizes, 12),
    textColors: top(textColors, 8),
    bgColors: top(bgColors, 10),
    radius: top(radius, 8),
    gaps: top(gaps, 8),
    metrics: {
      h1: metric('h1'),
      h2: metric('h2'),
      h3: metric('h3'),
      p: metric('p'),
      a: metric('a'),
      th: metric('th'),
      td: metric('td'),
      label: metric('label'),
      button: metric('button'),
      input: metric('input'),
    },
    layout: {
      sidebar: box('aside, nav[class*=sidebar], [class*=sidebar], [class*=sider]'),
      header: box('header, [role=banner], [class*=header]'),
      main: box('main, [class*=content], [class*=main]'),
    },
    tableRowHeights: rowH,
    controlHeights: [...new Set(ctlH)].sort((a, b) => a - b),
    cards: {
      total: cards.length,
      shadow: cards.filter((e) => {
        const cs = getComputedStyle(e);
        return cs.boxShadow && cs.boxShadow !== 'none';
      }).length,
      border: cards.filter((e) => parseFloat(getComputedStyle(e).borderTopWidth) > 0).length,
    },
    images: { total: document.images.length, lazy: [...document.images].filter((i) => i.loading === 'lazy').length },
    animations: document.getAnimations ? document.getAnimations().length : 0,
    cssVars: top(cssVars, 40),
    rootVars,
  };
}

const chromium = await loadChromium();
const browser = await chromium.launch();
const ctx = await browser.newContext(contextOptions({ viewport: args.viewport, theme: args.theme }));
if (String(args.theme) === 'dark') await ctx.addInitScript(forceDark);
const page = await ctx.newPage();
let data;
try {
  await goto(page, url, 45000);
  await page.waitForTimeout(Number(args.wait) || 3000);
  data = await page.evaluate(probe);
  if (shoot && args['no-shot'] !== true) {
    const { mkdir } = await import('node:fs/promises');
    await mkdir(outDir, { recursive: true });
    await page.screenshot({ path: `${outDir}/${name}.jpg`, type: 'jpeg', quality: 78 });
  }
} catch (e) {
  line(MARK.fail, `打开失败：${String(e.message).split('\n')[0]}`);
  await browser.close();
  process.exit(1);
}
await browser.close();

const jsonPath = await writeJson(`${outDir}/${name}.json`, { ...data, probedAt: new Date().toISOString() });

const fmt = (m) => (m ? `${m.size}px/${m.lh ?? 'normal'}/${m.weight}` : '-');
const hexOf = (arr, n) => arr.slice(0, n).map((x) => x[0]).join(' ');

line(MARK.pass, `${data.title.slice(0, 60)}  (${data.theme}, ${data.countedElements} 个元素)`);
console.log(`  字体      ${data.fonts.slice(0, 4).map((f) => `${f[0]}(${f[1]})`).join('  ')}`);
console.log(`  字号分布  ${data.sizes.slice(0, 8).map((x) => x[0]).join(', ')}`);
console.log(`  h1 / h2 / p   ${fmt(data.metrics.h1)}   ${fmt(data.metrics.h2)}   ${fmt(data.metrics.p)}`);
console.log(`  th / td       ${fmt(data.metrics.th)}   ${fmt(data.metrics.td)}`);
console.log(`  button / input ${fmt(data.metrics.button)}  ${fmt(data.metrics.input)}`);
console.log(`  底色      ${hexOf(data.bgColors, 6)}`);
console.log(`  文字色    ${hexOf(data.textColors, 4)}`);
console.log(`  圆角      ${data.radius.slice(0, 6).map((x) => x[0]).join('  ')}`);
console.log(`  间距      ${data.gaps.slice(0, 6).map((x) => x[0]).join('  ')}`);
if (data.tableRowHeights.length) console.log(`  表格行高  ${data.tableRowHeights.join(', ')}`);
if (data.controlHeights.length) console.log(`  控件高度  ${data.controlHeights.join(', ')}`);
if (data.layout.sidebar) console.log(`  侧栏/顶栏 ${JSON.stringify(data.layout.sidebar)} ${JSON.stringify(data.layout.header)}`);
console.log(`  卡片      共 ${data.cards.total}：阴影 ${data.cards.shadow} / 边框 ${data.cards.border}`);
console.log(`  图片      ${data.images.total} 张，lazy ${data.images.lazy} 张；动画 ${data.animations} 个`);
if (!brief) {
  console.log(`  令牌      ${data.cssVars.slice(0, 12).map((v) => v[0]).join(' ')}`);
  const rv = Object.entries(data.rootVars || {});
  if (rv.length) {
    console.log(`  令牌值    ${rv.length} 个 :root 变量（JSON 里全量），前 8 项：`);
    for (const [k, v] of rv.slice(0, 8)) console.log(`              ${k}: ${v}`);
  }
}
console.log(`  JSON      ${jsonPath}`);
