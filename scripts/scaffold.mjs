#!/usr/bin/env node
/**
 * scaffold.mjs —— 从 0 生成前端骨架（令牌 + CSS + 页面）
 *
 * 用法：
 *   node scripts/scaffold.mjs --persona rational --out ui
 *   node scripts/scaffold.mjs --persona warm --accent 20 --pages landing,app --dark
 *
 * 产出（--out 目录）：
 *   tokens.json      令牌源（可喂给别的工具/设计系统）
 *   tokens.css       颜色/间距/字阶/圆角/阴影/动效 变量，含可选 .dark
 *   base.css         reset + 排版 + 焦点 + 减少动效 + 容器
 *   components.css   按钮/表单/卡片/表格/标签/提示/空态/骨架/tabs/弹窗/toast/应用外壳
 *   depth.css        卡片四件套（hover / focus-within / active），随 --depth 换语言
 *   catalog.css      陈列页（左栏目录 + 3 列图版 + 药丸筛选 + 分页）
 *   ui.js            主题切换 + tabs + 弹窗焦点管理（无依赖）
 *   index.html       营销落地页（--pages landing）
 *   catalog.html     陈列目录页（--pages catalog）
 *   app.html         管理端列表页（--pages app）
 *   form.html        表单页（--pages form）
 *   auth.html        认证页（--pages auth）
 *   states.html      空/错/载三态（--pages states）
 *
 * 生成的是**骨架**：结构、令牌、状态都到位，内容和品牌要你自己换。
 * 交付前必须跑：audit.mjs + screenshot.mjs + contrast_check.py（见 SKILL.md）。
 */

import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { stackFiles } from './lib/stacks.mjs';

const argv = process.argv.slice(2);
const has = (k) => argv.includes(`--${k}`);
const arg = (k, d = null) => {
  const i = argv.indexOf(`--${k}`);
  return i >= 0 && argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[i + 1] : d;
};

if (has('help') || has('h')) {
  console.log(`scaffold.mjs —— 从 0 生成前端骨架

  --persona rational|editorial|warm   人格预设（默认 rational）
  --out <dir>                         输出目录（默认 ui-scaffold）
  --pages landing,app,form,auth,states  要生成哪些页面（默认 landing,app）
  --stack html|react|vue|all          额外生成哪个框架版本（默认 html，只出静态页）
  --accent <hue 0-360>                覆盖品牌色相
  --dark                              额外生成 .dark 令牌块
  --name <字符串>                      产品名（默认「示例产品」）
  --quiet                             少打印
`);
  process.exit(0);
}

/* ------------------------------------------------------------------ 人格 */

const PERSONAS = {
  rational: {
    label: '理性 / 管理端',
    ref: 'shadcn · linear · cal.com',
    neutral: { hue: 220, sat: 6 },
    accentHue: 221,
    accentSat: 78,
    control: 32,
    controlSm: 28,
    radius: { xs: 4, sm: 6, md: 8, lg: 12, xl: 16, pill: 999 },
    type: { xs: 12, sm: 13, base: 14, lg: 16, xl: 20, '2xl': 24, '3xl': 32, '4xl': 40 },
    lh: { xs: 1.5, sm: 1.5, base: 1.55, lg: 1.5, xl: 1.4, '2xl': 1.3, '3xl': 1.2, '4xl': 1.15 },
    weights: { body: 400, ui: 500, head: 600 },
    tracking: { base: 'normal', head: '-0.01em' },
    bg: '#ffffff',
    surface: '#fafafa',
    raised: '#ffffff',
    border: '#e6e6e6',
    ink: '#0a0a0a',
    depth: 'hairline',
    shadowTint: null,
    dur: { fast: 120, base: 200, slow: 280 },
    container: 1280,
    section: 56,
    spaceStep: 4,
    density: 'compact',
  },
  editorial: {
    label: '编辑 / 内容与品牌',
    ref: 'stripe（H1 48px / 1.15 / 字重 400）',
    neutral: { hue: 220, sat: 4 },
    accentHue: 258,
    accentSat: 82,
    control: 40,
    controlSm: 32,
    radius: { xs: 2, sm: 3, md: 4, lg: 6, xl: 8, pill: 999 },
    type: { xs: 12, sm: 13, base: 16, lg: 19, xl: 24, '2xl': 32, '3xl': 44, '4xl': 56 },
    lh: { xs: 1.6, sm: 1.6, base: 1.6, lg: 1.5, xl: 1.35, '2xl': 1.25, '3xl': 1.15, '4xl': 1.1 },
    weights: { body: 400, ui: 500, head: 400 },
    tracking: { base: 'normal', head: '-0.02em' },
    bg: '#fbfaf9',
    surface: '#f5f3f0',
    raised: '#ffffff',
    border: '#e2ddd6',
    ink: '#0b1b2b',
    depth: 'hairline',
    shadowTint: null,
    dur: { fast: 160, base: 240, slow: 280 },
    container: 1080,
    section: 112,
    spaceStep: 4,
    density: 'regular',
  },
  warm: {
    label: '亲和 / 消费端',
    ref: 'duolingo（主色 #58cc02、控件 50、圆角 12+2）',
    neutral: { hue: 38, sat: 8 },
    accentHue: 92,
    accentSat: 70,
    control: 44,
    controlSm: 36,
    radius: { xs: 8, sm: 12, md: 16, lg: 24, xl: 32, pill: 999 },
    type: { xs: 12, sm: 13, base: 16, lg: 18, xl: 22, '2xl': 28, '3xl': 36, '4xl': 48 },
    lh: { xs: 1.5, sm: 1.5, base: 1.45, lg: 1.4, xl: 1.35, '2xl': 1.3, '3xl': 1.2, '4xl': 1.15 },
    weights: { body: 400, ui: 500, head: 700 },
    tracking: { base: 'normal', head: 'normal' },
    bg: '#fffdf9',
    surface: '#fff6ec',
    raised: '#ffffff',
    border: '#f0e2d2',
    ink: '#221c14',
    depth: 'soft',
    shadowTint: true,
    dur: { fast: 200, base: 240, slow: 280 },
    container: 1140,
    section: 96,
    spaceStep: 4,
    density: 'comfortable',
  },
  print: {
    label: '印刷 / 规格书',
    ref: 'luckymaomi UI 风格库（方格纸底、墨黑 1px 边、4px 4px 0 硬阴影、2px 圆角、超重标题）',
    neutral: { hue: 220, sat: 6 },
    accentHue: 220,
    accentSat: 12,
    control: 38,
    controlSm: 32,
    radius: { xs: 2, sm: 2, md: 2, lg: 4, xl: 4, pill: 999 },
    type: { xs: 12, sm: 12, base: 13, lg: 16, xl: 20, '2xl': 28, '3xl': 40, '4xl': 56 },
    lh: { xs: 1.5, sm: 1.5, base: 1.6, lg: 1.5, xl: 1.35, '2xl': 1.25, '3xl': 1.15, '4xl': 1.05 },
    weights: { body: 400, ui: 700, head: 800 },
    tracking: { base: 'normal', head: '-0.01em' },
    bg: '#f3f4f6',
    surface: '#ffffff',
    raised: '#ffffff',
    border: '#bdc3cf',
    ink: '#090a0d',
    depth: 'hard',
    shadowTint: null,
    dur: { fast: 100, base: 160, slow: 240 },
    container: 1208,
    section: 72,
    spaceStep: 4,
    density: 'regular',
    paper: true,
    display: 'inherit',
  },
  magazine: {
    label: '杂志 / 目录',
    ref: 'Muzli 灵感库（Instrument Serif 48 刊头 + Poppins 正文 + 220 sticky 目录 + 3 列图版 + 一个电光蓝）',
    neutral: { hue: 240, sat: 5 },
    accentHue: 232,
    accentSat: 100,
    control: 40,
    controlSm: 34,
    radius: { xs: 4, sm: 4, md: 6, lg: 8, xl: 12, pill: 999 },
    type: { xs: 12, sm: 13, base: 15, lg: 16, xl: 21, '2xl': 30, '3xl': 38, '4xl': 48 },
    lh: { xs: 1.55, sm: 1.55, base: 1.6, lg: 1.5, xl: 1.3, '2xl': 1.2, '3xl': 1.15, '4xl': 1.0 },
    weights: { body: 400, ui: 500, head: 500 },
    tracking: { base: 'normal', head: '-0.01em' },
    bg: '#ffffff',
    surface: '#f7f7f8',
    raised: '#ffffff',
    border: '#e6e6e8',
    ink: '#0a0a0a',
    depth: 'hairline',
    shadowTint: null,
    dur: { fast: 150, base: 200, slow: 240 },
    container: 1108,
    section: 96,
    spaceStep: 4,
    density: 'regular',
    display: 'Georgia, "Times New Roman", "Songti SC", "Source Han Serif SC", serif',
  },
};

const personaKey = arg('persona', 'rational');
const P = PERSONAS[personaKey];
if (!P) {
  console.error(`未知人格：${personaKey}（可选：${Object.keys(PERSONAS).join(' / ')}）`);
  process.exit(2);
}
const accentHue = Number(arg('accent', P.accentHue));
const outDir = path.resolve(arg('out', 'ui-scaffold'));
const pages = (arg('pages', 'landing,app') || '').split(',').map((s) => s.trim()).filter(Boolean);
const withDark = has('dark');
const quiet = has('quiet');
const NAME = arg('name', '示例产品');

/* ------------------------------------------------------------------ 颜色 */

const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

// L%（及 S 系数）来自 references/design-tokens.md §3
const RAMP = [
  [50, 97, 0.3],
  [100, 94, 0.42],
  [200, 88, 0.55],
  [300, 79, 0.7],
  [400, 68, 0.88],
  [500, 56, 1],
  [600, 47, 0.96],
  [700, 38, 0.88],
  [800, 31, 0.78],
  [900, 25, 0.7],
  [950, 17, 0.6],
];

function hslToHex(h, s, l) {
  h = ((h % 360) + 360) % 360;
  s = clamp(s, 0, 100) / 100;
  l = clamp(l, 0, 100) / 100;
  const k = (n) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  const to = (x) => Math.round(x * 255).toString(16).padStart(2, '0');
  return `#${to(f(0))}${to(f(8))}${to(f(4))}`;
}

function relLum(hex) {
  const c = [1, 3, 5]
    .map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map((v) => (v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)));
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
}

function contrast(a, b) {
  const l1 = relLum(a);
  const l2 = relLum(b);
  return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
}

// 填充按钮的底色必须能扛住白字 4.5:1；扛不住就往深档走，而不是把文字改灰
function fillStep(rampObj) {
  return [500, 600, 700, 800].find((k) => contrast(rampObj[k], '#ffffff') >= 4.5) || 800;
}

const ramp = (hue, sat) => Object.fromEntries(RAMP.map(([step, l, k]) => [step, hslToHex(hue, sat * k, l)]));
const brand = ramp(accentHue, P.accentSat);
const brandFillStep = fillStep(brand);
const brandFill = brand[brandFillStep];
const onBrand = '#ffffff'; // fillStep 已保证白字达 4.5:1
// 浅底上的品牌文字色：600 档不够就继续往深走，别把字号放大糊过去
const brandInkStep = [600, 700, 800, 900].find((k) => contrast(brand[k], P.bg) >= 4.5) || 900;
const brandInk = brand[brandInkStep];
const onBrandDark = contrast(brand[400], '#0b0906') >= 4.5 ? '#0b0906' : '#ffffff';
const neutral = ramp(P.neutral.hue, P.neutral.sat);
const semantic = {
  ok: { base: hslToHex(152, 45, 34), bg: hslToHex(152, 40, 96), ink: hslToHex(152, 60, 26) },
  warn: { base: hslToHex(38, 92, 42), bg: hslToHex(38, 90, 96), ink: hslToHex(32, 80, 28) },
  danger: { base: hslToHex(0, 72, 45), bg: hslToHex(0, 80, 97), ink: hslToHex(0, 70, 32) },
  info: { base: hslToHex(208, 88, 42), bg: hslToHex(208, 90, 97), ink: hslToHex(208, 80, 30) },
};
/* ------------------------------------------------------------------ 令牌 */

const space = {};
[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].forEach((i, idx) => {
  const mult = [1, 2, 3, 4, 5, 6, 8, 10, 12, 16, 20, 24][idx];
  space[i] = P.spaceStep * mult;
}); // 4 8 12 16 20 24 32 40 48 64 80 96

const tokens = {
  persona: personaKey,
  label: P.label,
  ref: P.ref,
  density: P.density,
  accentHue,
  color: { brand, neutral, semantic, brandFill, brandFillStep, onBrand },
  type: P.type,
  lineHeight: P.lh,
  radius: P.radius,
  space,
  control: { md: P.control, sm: P.controlSm },
  container: P.container,
  section: P.section,
  duration: P.dur,
  motion: { ease: [0.33, 1, 0.68, 1] },
  fonts: {
    sans:
      '-apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "Noto Sans SC", sans-serif',
    mono: 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, "Liberation Mono", monospace',
  },
};

const shadow = P.shadowTint
  ? {
      hairline: `0 0 0 1px hsl(${P.neutral.hue} 20% 20% / .06)`,
      sh1: `0 2px 6px -2px hsl(${accentHue} 60% 40% / .18), 0 1px 2px hsl(${P.neutral.hue} 20% 20% / .06)`,
      sh2: `0 8px 24px -8px hsl(${accentHue} 60% 40% / .28), 0 2px 6px hsl(${P.neutral.hue} 20% 20% / .06)`,
      sh3: `0 24px 48px -16px hsl(${accentHue} 60% 30% / .32), 0 4px 12px hsl(${P.neutral.hue} 20% 20% / .08)`,
    }
  : {
      hairline: '0 0 0 1px rgb(0 0 0 / .06)',
      sh1: '0 1px 2px rgb(0 0 0 / .06)',
      sh2: '0 4px 12px rgb(0 0 0 / .08)',
      sh3: '0 12px 32px rgb(0 0 0 / .16)',
    };

/* 深度语言三派：一个站点只许用一种（见 references/craft-floor.md §2、luckymaomi-catalog.md） */
const DEPTH = {
  hairline: {
    rest: 'var(--hairline)',
    hover: '0 0 0 1px color-mix(in srgb, var(--ink) 45%, transparent)',
    active: 'var(--hairline)',
    hx: '0px', hy: '0px', press: '0px',
    btnDepth: 0,
  },
  soft: {
    rest: 'var(--sh-1), var(--hairline)',
    hover: 'var(--sh-2), var(--hairline)',
    active: 'var(--sh-1), var(--hairline)',
    hx: '0px', hy: '-2px', press: '1px',
    btnDepth: 2,
  },
  hard: {
    rest: '4px 4px 0 var(--ink)',
    hover: '6px 6px 0 var(--ink)',
    active: '2px 2px 0 var(--ink)',
    hx: '-1px', hy: '-1px', press: '2px',
    btnDepth: 0,
  },
};
const D = DEPTH[P.depth] || DEPTH.hairline;
const durLadder = [
  P.dur.fast,
  Math.round((P.dur.fast + P.dur.base) / 2),
  P.dur.base,
  Math.round(P.dur.base * 1.6),
  600,
];

const vars = () => {  const L = [];
  Object.entries(brand).forEach(([k, v]) => L.push(`  --brand-${k}: ${v};`));
  L.push('  --brand: ' + brand[500] + ';');
  L.push('  --brand-600: ' + brand[600] + ';');
  L.push('  --brand-ink: ' + brandInk + ';');
  L.push('  --brand-50: ' + brand[50] + ';');
  L.push('  --brand-fill: ' + brandFill + ';');
  L.push('  --brand-fill-step: ' + brandFillStep + ';');
  L.push('  --on-brand: ' + onBrand + ';');
  Object.entries(neutral).forEach(([k, v]) => L.push(`  --n-${k}: ${v};`));
  L.push('  --bg: ' + P.bg + ';');
  L.push('  --surface: ' + P.surface + ';');
  L.push('  --raised: ' + P.raised + ';');
  L.push('  --border: ' + P.border + ';');
  L.push('  --ink: ' + P.ink + ';');
  L.push('  --ink-2: color-mix(in srgb, var(--ink) 74%, transparent);');
  L.push('  --ink-3: color-mix(in srgb, var(--ink) 64%, transparent);');
  L.push('  --ink-4: color-mix(in srgb, var(--ink) 61%, transparent);');
  L.push('  --surface-hover: color-mix(in srgb, var(--ink) 4%, var(--bg));');
  L.push('  --skeleton: color-mix(in srgb, var(--ink) 8%, var(--bg));');
  Object.entries(semantic).forEach(([k, v]) => {
    L.push(`  --${k}: ${v.base};`);
    L.push(`  --${k}-bg: ${v.bg};`);
    L.push(`  --${k}-ink: ${v.ink};`);
  });
  Object.entries(space).forEach(([k, v]) => L.push(`  --s-${k}: ${v}px;`));
  Object.entries(P.type).forEach(([k, v]) => L.push(`  --t-${k}: ${v}px;`));
  Object.entries(P.lh).forEach(([k, v]) => L.push(`  --lh-${k}: ${v};`));
  L.push(`  --fw-body: ${P.weights.body};`);
  L.push(`  --fw-ui: ${P.weights.ui};`);
  L.push(`  --fw-head: ${P.weights.head};`);
  L.push(`  --track-head: ${P.tracking.head};`);
  Object.entries(P.radius).forEach(([k, v]) => L.push(`  --r-${k}: ${v}px;`));
  L.push(`  --control-h: ${P.control}px;`);
  L.push(`  --control-h-sm: ${P.controlSm}px;`);
  L.push(`  --pad-x: ${Math.round(P.control / 2.6)}px;`);
  L.push(`  --container: ${P.container}px;`);
  L.push(`  --section: ${P.section}px;`);
  L.push(`  --btn-depth: ${D.btnDepth}px;`);   // 只给 warm 的塑料侧壁用；hard 深度改用硬阴影
  L.push('  --ease: cubic-bezier(.33, 1, .68, 1);');
  L.push(`  --dur-fast: ${P.dur.fast}ms;`);
  L.push(`  --dur-base: ${P.dur.base}ms;`);
  L.push(`  --dur-slow: ${P.dur.slow}ms;`);
  L.push('  --hairline: ' + shadow.hairline + ';');
  L.push('  --sh-1: ' + shadow.sh1 + ';');
  L.push('  --sh-2: ' + shadow.sh2 + ';');
  L.push('  --sh-3: ' + shadow.sh3 + ';');
  L.push('  --card-shadow: ' + D.rest + ';');
  L.push('  --card-shadow-hover: ' + D.hover + ';');
  L.push('  --card-shadow-active: ' + D.active + ';');
  L.push('  --card-hx: ' + D.hx + ';');
  L.push('  --card-hy: ' + D.hy + ';');
  L.push('  --card-press: ' + D.press + ';');
  L.push('  --depth: ' + P.depth + ';');
  durLadder.forEach((ms, i) => L.push(`  --dur-${i + 1}: ${ms}ms;`));
  L.push('  --ease-out: cubic-bezier(.16, 1, .3, 1);');
  L.push('  --ease-in: cubic-bezier(.4, 0, 1, 1);');
  L.push('  --ease-in-out: cubic-bezier(.65, 0, .35, 1);');
  L.push('  --ease-spring: cubic-bezier(.34, 1.56, .64, 1);');
  L.push('  --motion: 1;');
  L.push('  --font-display: ' + (P.display || 'inherit') + ';');
  L.push('  --paper-line: color-mix(in srgb, var(--ink) 7%, transparent);');
  L.push('  --font-sans: ' + tokens.fonts.sans + ';');
  L.push('  --font-mono: ' + tokens.fonts.mono + ';');
  return L.join('\n');
};

const darkVars = () => {
  const d = [];
  d.push('  /* 深色不是反色：底用中性深档，文字用 alpha 派生，品牌色提亮到 400 档 */');
  d.push(`  --bg: ${hslToHex(P.neutral.hue, P.neutral.sat * 1.6, 9)};`);
  d.push(`  --surface: ${hslToHex(P.neutral.hue, P.neutral.sat * 1.6, 12)};`);
  d.push(`  --raised: ${hslToHex(P.neutral.hue, P.neutral.sat * 1.6, 15)};`);
  d.push('  --border: rgb(255 255 255 / .10);');
  d.push('  --ink: rgb(255 255 255 / .92);');
  d.push('  --ink-2: rgb(255 255 255 / .78);');
  d.push('  --ink-3: rgb(255 255 255 / .62);');
  d.push('  --ink-4: rgb(255 255 255 / .58);');
  d.push('  --surface-hover: rgb(255 255 255 / .06);');
  d.push('  --skeleton: rgb(255 255 255 / .08);');
  // 语义色在深色底上要换成亮字 + 透明底，否则对比度掉到 2 以下
  d.push('  --ok: ' + hslToHex(152, 50, 58) + ';');
  d.push('  --warn: ' + hslToHex(38, 90, 60) + ';');
  d.push('  --danger: ' + hslToHex(2, 80, 66) + ';');
  d.push('  --info: ' + hslToHex(208, 85, 64) + ';');
  d.push('  --ok-ink: ' + hslToHex(152, 55, 74) + ';');
  d.push('  --ok-bg: rgb(46 160 96 / .18);');
  d.push('  --warn-ink: ' + hslToHex(38, 90, 72) + ';');
  d.push('  --warn-bg: rgb(214 148 40 / .18);');
  d.push('  --danger-ink: ' + hslToHex(2, 82, 76) + ';');
  d.push('  --danger-bg: rgb(200 60 60 / .20);');
  d.push('  --info-ink: ' + hslToHex(208, 88, 76) + ';');
  d.push('  --info-bg: rgb(40 130 220 / .20);');
  d.push(`  --brand: ${brand[400]};`);
  d.push('  --brand-600: ' + brand[300] + ';');
  d.push('  --brand-ink: ' + brand[300] + ';');
  d.push(`  --brand-50: color-mix(in srgb, ${brand[400]} 16%, transparent);`);
  d.push('  --brand-fill: ' + brand[400] + ';');
  d.push('  --on-brand: ' + onBrandDark + ';');
  d.push('  --hairline: 0 0 0 1px rgb(255 255 255 / .08);');
  d.push('  --sh-1: 0 1px 2px rgb(0 0 0 / .5);');
  d.push('  --sh-2: 0 8px 24px rgb(0 0 0 / .55);');
  d.push('  --sh-3: 0 24px 48px rgb(0 0 0 / .6);');
  return d.join('\n');
};

const tokensCss = `/* generated by scaffold.mjs —— persona: ${personaKey}（${P.label}）
   参照：${P.ref}
   改这些值，不要改组件；组件的所有尺寸都从这里派生。 */

:root {
${vars()}
}

${withDark ? `.dark,\n[data-theme="dark"] {\n${darkVars()}\n}` : '/* 需要深色：加 --dark 重新生成 */'}
`;
/* ------------------------------------------------------------------ base.css */

const baseCss = `/* base.css —— reset + 排版 + 焦点 + 减少动效 */

*, *::before, *::after { box-sizing: border-box; }
* { margin: 0; }

html { -webkit-text-size-adjust: 100%; }

body {
  font-family: var(--font-sans);
  font-size: var(--t-base);
  line-height: var(--lh-base);
  font-weight: var(--fw-body);
  color: var(--ink);
  background: var(--bg);
  -webkit-font-smoothing: antialiased;
  text-rendering: optimizeLegibility;
}

img, svg, video { display: block; max-width: 100%; }
img { height: auto; }

h1, h2, h3, h4 {
  font-weight: var(--fw-head);
  letter-spacing: var(--track-head);
  line-height: 1.25;
  text-wrap: balance;
}
h1 { font-size: var(--t-2xl); }
h2 { font-size: var(--t-xl); }
h3 { font-size: var(--t-lg); }
p { max-width: 68ch; text-wrap: pretty; }

a { color: var(--brand-ink); text-underline-offset: 2px; }
a:hover { color: color-mix(in srgb, var(--brand-ink) 80%, var(--ink)); }

button, input, select, textarea { font: inherit; color: inherit; }
button { cursor: pointer; }

:focus-visible {
  outline: 2px solid var(--brand);
  outline-offset: 2px;
  border-radius: var(--r-xs);
}

body { caret-color: var(--brand); accent-color: var(--brand); }
html { scrollbar-gutter: stable; }
@supports (scrollbar-width: thin) {
  html { scrollbar-width: thin; scrollbar-color: color-mix(in srgb, var(--ink) 24%, transparent) transparent; }
}
::selection { background: color-mix(in srgb, var(--brand) 22%, transparent); }

.num { font-variant-numeric: tabular-nums; font-feature-settings: "tnum"; }
.muted { color: var(--ink-2); }
.tiny { font-size: var(--t-xs); color: var(--ink-2); }

.container {
  width: 100%;
  max-width: var(--container);
  margin-inline: auto;
  padding-inline: var(--s-5);
}

.skip-link {
  position: absolute;
  left: -9999px;
  top: 0;
  padding: var(--s-2) var(--s-4);
  background: var(--bg);
  z-index: 100;
}
.skip-link:focus { left: var(--s-4); }

.sr-only {
  position: absolute; width: 1px; height: 1px;
  padding: 0; margin: -1px; overflow: hidden;
  clip: rect(0 0 0 0); white-space: nowrap; border: 0;
}

@media (prefers-reduced-motion: reduce) {
  :root { --motion: 0; }
  *, *::before, *::after {
    animation-duration: .01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: .01ms !important;
    scroll-behavior: auto !important;
  }
}
`;

/* ------------------------------------------------------------------ components.css */

const componentsCss = `/* components.css —— 8 个状态都在这里面，别在页面里重写 */

/* ---------------- 按钮 ---------------- */
.btn {
  --_bg: var(--raised);
  --_fg: var(--ink);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--s-2);
  height: var(--control-h);
  padding-inline: var(--pad-x);
  border: 0;
  border-radius: var(--r-sm);
  background: var(--_bg);
  color: var(--_fg);
  font-size: var(--t-sm);
  font-weight: var(--fw-ui);
  line-height: 1;
  text-decoration: none;
  white-space: nowrap;
  box-shadow: var(--hairline), 0 1px 2px rgb(0 0 0 / .04),
    inset 0 calc(-1 * var(--btn-depth)) 0 rgb(0 0 0 / .10);
  transition: background var(--dur-fast) var(--ease), transform var(--dur-fast) var(--ease),
    box-shadow var(--dur-fast) var(--ease);
}
.btn:hover { background: color-mix(in srgb, var(--_bg) 92%, var(--ink)); }
.btn:active {
  transform: translateY(1px);
  box-shadow: var(--hairline);
}
.btn[disabled], .btn[aria-disabled="true"] {
  opacity: .45;
  cursor: not-allowed;
  pointer-events: none;
}
.btn[aria-busy="true"] { pointer-events: none; opacity: .8; }

.btn--primary {
  --_bg: var(--brand-fill);
  --_fg: var(--on-brand);
  box-shadow: var(--hairline), 0 1px 2px rgb(0 0 0 / .12),
    inset 0 calc(-1 * var(--btn-depth)) 0 rgb(0 0 0 / .18);
}
.btn--primary:hover { background: color-mix(in srgb, var(--brand-fill) 88%, #000); }
.btn--secondary {
  --_bg: transparent;
  --_fg: var(--ink);
  box-shadow: inset 0 0 0 1px var(--border);
}
.btn--secondary:hover { background: var(--surface-hover); }
.btn--ghost {
  --_bg: transparent;
  --_fg: var(--ink-2);
  box-shadow: none;
}
.btn--ghost:hover { background: var(--surface-hover); color: var(--ink); }
.btn--danger { --_bg: var(--danger); --_fg: #fff; }
.btn--sm { height: var(--control-h-sm); padding-inline: var(--s-3); font-size: var(--t-xs); }
.btn--lg { height: calc(var(--control-h) + var(--s-2)); padding-inline: var(--s-6); font-size: var(--t-base); }
.btn--icon { width: var(--control-h); padding: 0; aspect-ratio: 1; }
.btn--block { width: 100%; }

/* ---------------- 表单 ---------------- */
.field { display: grid; gap: var(--s-2); }
.label { font-size: var(--t-sm); font-weight: var(--fw-ui); }
.label .req { color: var(--danger); margin-inline-start: 2px; }
.help { font-size: var(--t-xs); color: var(--ink-3); }
.error-text { font-size: var(--t-xs); color: var(--danger); }

.input, .textarea, .select {
  width: 100%;
  min-height: var(--control-h);
  padding: 0 var(--pad-x);
  border: 1px solid var(--border);
  border-radius: var(--r-sm);
  background: var(--raised);
  color: var(--ink);
  font-size: var(--t-base);
  transition: border-color var(--dur-fast) var(--ease), box-shadow var(--dur-fast) var(--ease);
}
.textarea { padding: var(--s-2) var(--pad-x); min-height: 96px; resize: vertical; line-height: 1.5; }
.input::placeholder, .textarea::placeholder { color: var(--ink-4); }
.input:hover, .textarea:hover, .select:hover { border-color: var(--ink-4); }
.input:focus-visible, .textarea:focus-visible, .select:focus-visible {
  outline: 2px solid var(--brand-ink);
  outline-offset: 1px;
  border-color: var(--brand);
}
.input[aria-invalid="true"], .textarea[aria-invalid="true"] {
  border-color: var(--danger);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--danger) 18%, transparent);
}
.input[disabled], .textarea[disabled], .select[disabled] {
  opacity: .55;
  cursor: not-allowed;
  background: var(--surface);
}
.input-group { display: flex; align-items: center; gap: var(--s-2); }
.input-group .input { flex: 1 1 auto; min-width: 0; }
.input-group .btn--icon {
  flex: 0 0 auto;
  height: var(--control-h);
  width: var(--control-h);
  box-shadow: inset 0 0 0 1px var(--border);
  background: var(--raised);
}
.input-group .btn--icon:hover { background: var(--surface-hover); }

.check { display: flex; align-items: center; gap: var(--s-2); font-size: var(--t-base); }
.check input { width: 16px; height: 16px; accent-color: var(--brand); }

/* ---------------- 卡片 ---------------- */
.card {
  background: var(--raised);
  border-radius: var(--r-md);
  box-shadow: var(--hairline);
  padding: var(--s-5);
}
.card--flat { background: var(--surface); box-shadow: none; }
.card--pop { box-shadow: var(--sh-1), var(--hairline); }
.card__title { font-size: var(--t-lg); font-weight: var(--fw-head); margin-bottom: var(--s-2); }
.card__meta { font-size: var(--t-xs); color: var(--ink-3); }

/* ---------------- 表格 ---------------- */
.table-wrap {
  overflow-x: auto;
  border-radius: var(--r-md);
  box-shadow: var(--hairline);
  background: var(--raised);
}
.table { width: 100%; border-collapse: collapse; font-size: var(--t-base); }
.table th, .table td {
  padding: 0 var(--s-3);
  text-align: start;
  border-bottom: 1px solid var(--border);
}
.table th {
  position: sticky;
  top: 0;
  z-index: 1;
  background: var(--surface);
  height: 40px;
  font-size: var(--t-sm);
  font-weight: var(--fw-ui);
  color: var(--ink-2);
  white-space: nowrap;
}
.table td { height: 48px; }
.table tbody tr:hover { background: var(--surface-hover); }
.table tbody tr:last-child td { border-bottom: 0; }
.table .t-right { text-align: end; }
.table .actions { text-align: end; white-space: nowrap; }

/* ---------------- 标签 / 徽标 ---------------- */
.tag {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 22px;
  padding-inline: var(--s-2);
  border-radius: var(--r-xs);
  background: var(--surface);
  color: var(--ink-2);
  font-size: var(--t-xs);
  font-weight: var(--fw-ui);
}
.tag--ok { background: var(--ok-bg); color: var(--ok-ink); }
.tag--warn { background: var(--warn-bg); color: var(--warn-ink); }
.tag--danger { background: var(--danger-bg); color: var(--danger-ink); }
.tag--info { background: var(--info-bg); color: var(--info-ink); }
.tag--brand { background: var(--brand-50); color: var(--brand-ink); }

/* ---------------- 提示 ---------------- */
.alert {
  display: flex;
  gap: var(--s-3);
  padding: var(--s-3) var(--s-4);
  border-radius: var(--r-sm);
  background: var(--surface);
  font-size: var(--t-sm);
}
.alert--error { background: var(--danger-bg); color: var(--danger-ink); }
.alert--ok { background: var(--ok-bg); color: var(--ok-ink); }
.alert--warn { background: var(--warn-bg); color: var(--warn-ink); }
.alert--info { background: var(--info-bg); color: var(--info-ink); }

/* ---------------- 空态 / 骨架 ---------------- */
.empty {
  display: grid;
  justify-items: center;
  gap: var(--s-2);
  padding: var(--s-9) var(--s-5);
  text-align: center;
}
.empty__icon { width: 40px; height: 40px; color: var(--ink-4); }
.empty__title { font-size: var(--t-lg); font-weight: var(--fw-head); }
.empty__text { font-size: var(--t-sm); color: var(--ink-2); max-width: 36ch; }

.skeleton {
  background: var(--skeleton);
  border-radius: var(--r-xs);
  animation: shimmer 1.4s var(--ease) infinite;
  min-height: 12px;
}
@keyframes shimmer { 50% { opacity: .55; } }

/* ---------------- tabs ---------------- */
.tabs { display: flex; gap: var(--s-1); border-bottom: 1px solid var(--border); }
.tab {
  appearance: none;
  border: 0;
  background: none;
  padding: var(--s-3);
  font-size: var(--t-base);
  font-weight: var(--fw-ui);
  color: var(--ink-3);
  border-bottom: 2px solid transparent;
  margin-bottom: -1px;
}
.tab:hover { color: var(--ink); }
.tab[aria-selected="true"] { color: var(--ink); border-bottom-color: var(--brand); }

/* ---------------- 弹窗 / toast ---------------- */
.modal {
  position: fixed;
  inset: 0;
  z-index: 50;
  display: none;
  place-items: center;
  background: rgb(0 0 0 / .38);
  padding: var(--s-5);
}
.modal.is-open { display: grid; }
.modal__panel {
  width: min(480px, 100%);
  background: var(--raised);
  border-radius: var(--r-lg);
  box-shadow: var(--sh-3);
  padding: var(--s-6);
}
.modal__title { font-size: var(--t-lg); font-weight: var(--fw-head); }
.modal__actions { display: flex; justify-content: end; gap: var(--s-2); margin-top: var(--s-6); }

.toast { position: fixed; right: var(--s-5); bottom: var(--s-5); z-index: 60; display: grid; gap: var(--s-2); max-width: 360px; }
.toast__item {
  background: var(--ink);
  color: var(--bg);
  padding: var(--s-3) var(--s-4);
  border-radius: var(--r-sm);
  box-shadow: var(--sh-2);
  font-size: var(--t-sm);
}
/* ---------------- 应用外壳 ---------------- */
.app {
  display: grid;
  grid-template-columns: 248px 1fr;
  min-height: 100vh;
  background: var(--bg);
}
.app__sidebar {
  display: flex;
  flex-direction: column;
  gap: var(--s-5);
  padding: var(--s-4) var(--s-3);
  background: var(--surface);
  border-inline-end: 1px solid var(--border);
}
.brand {
  display: flex;
  align-items: center;
  gap: var(--s-2);
  padding-inline: var(--s-2);
  height: var(--control-h);
  font-size: var(--t-base);
  font-weight: var(--fw-head);
  color: var(--ink);
  text-decoration: none;
  white-space: nowrap;
}
.brand__mark {
  display: grid;
  place-items: center;
  width: 24px;
  height: 24px;
  border-radius: var(--r-xs);
  background: var(--brand-fill);
  color: var(--on-brand);
  font-size: var(--t-xs);
  font-weight: 700;
}
.nav { display: grid; gap: 2px; }
.sidebar__foot { margin-top: auto; }
.nav__group {
  padding: var(--s-3) var(--s-2) var(--s-1);
  font-size: var(--t-xs);
  font-weight: var(--fw-ui);
  color: var(--ink-3);
  letter-spacing: .04em;
  text-transform: uppercase;
}
.nav-item {
  display: flex;
  align-items: center;
  gap: var(--s-2);
  height: calc(var(--control-h) - 4px);
  padding-inline: var(--s-2);
  border-radius: var(--r-xs);
  color: var(--ink-2);
  font-size: var(--t-sm);
  font-weight: var(--fw-ui);
  text-decoration: none;
  transition: background var(--dur-fast) var(--ease), color var(--dur-fast) var(--ease);
}
.nav-item:hover { background: var(--surface-hover); color: var(--ink); }
.nav-item { white-space: nowrap; flex: 0 0 auto; }
.nav-item[aria-current="page"] {
  background: var(--raised);
  color: var(--ink);
  box-shadow: inset 3px 0 0 var(--brand), var(--hairline);
}
.nav-item__badge { margin-inline-start: auto; }
.app__main { min-width: 0; display: flex; flex-direction: column; }
.topbar {
  display: flex;
  align-items: center;
  gap: var(--s-3);
  height: calc(var(--control-h) + var(--s-4));
  padding-inline: var(--s-5);
  border-bottom: 1px solid var(--border);
  background: color-mix(in srgb, var(--bg) 86%, transparent);
  backdrop-filter: saturate(1.4) blur(8px);
  position: sticky;
  top: 0;
  z-index: 20;
}
.topbar__spacer { margin-inline-start: auto; }
.page { padding: var(--s-5); display: grid; gap: var(--s-5); align-content: start; }
.page__head { display: flex; align-items: flex-start; gap: var(--s-4); flex-wrap: wrap; }
.page__title { font-size: var(--t-xl); font-weight: var(--fw-head); letter-spacing: var(--track-head); }
.page__desc { font-size: var(--t-sm); color: var(--ink-2); margin-top: var(--s-1); max-width: 60ch; }
.page__actions { margin-inline-start: auto; display: flex; gap: var(--s-2); }
.toolbar {
  display: flex;
  align-items: center;
  gap: var(--s-2);
  flex-wrap: wrap;
}
.toolbar__search { flex: 1 1 240px; max-width: 320px; }
.toolbar .select { width: auto; min-width: 8rem; }

/* 框架版的多视图切换条（scaffold 生成物用） */
.appswitch {
  display: flex;
  align-items: center;
  gap: var(--s-2);
  padding: var(--s-2) var(--s-4);
  background: var(--surface);
  box-shadow: 0 1px 0 var(--border);
}
.appswitch__label { font-size: var(--t-xs); color: var(--ink-3); }

/* ---------------- KPI ---------------- */
.kpis {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: var(--s-3);
}
.kpi {
  padding: var(--s-4);
  border-radius: var(--r-md);
  background: var(--raised);
  box-shadow: var(--hairline);
}
.kpi__label { font-size: var(--t-xs); color: var(--ink-3); }
.kpi__value {
  margin-top: var(--s-1);
  font-size: var(--t-2xl);
  font-weight: var(--fw-head);
  font-variant-numeric: tabular-nums;
  letter-spacing: -.01em;
}
.kpi__delta { font-size: var(--t-xs); font-weight: var(--fw-ui); }
.kpi__delta--up { color: var(--ok-ink); }
.kpi__delta--down { color: var(--danger-ink); }

/* ---------------- 分页 ---------------- */
.pager {
  display: flex;
  align-items: center;
  gap: var(--s-2);
  justify-content: flex-end;
  padding-top: var(--s-1);
}
.pager__info { margin-inline-end: auto; font-size: var(--t-xs); color: var(--ink-3); }

/* ---------------- 营销页 ---------------- */
.site-header {
  position: sticky;
  top: 0;
  z-index: 30;
  background: color-mix(in srgb, var(--bg) 84%, transparent);
  backdrop-filter: saturate(1.4) blur(10px);
  border-bottom: 1px solid transparent;
}
.site-header__in {
  display: flex;
  align-items: center;
  gap: var(--s-6);
  height: 64px;
}
.site-nav { display: flex; gap: var(--s-4); margin-inline-start: var(--s-4); }
.site-nav a {
  font-size: var(--t-sm);
  color: var(--ink-2);
  text-decoration: none;
  font-weight: var(--fw-ui);
}
.site-nav a:hover { color: var(--ink); }
.hero { padding-block: calc(var(--section) * 1.1) var(--section); }
.hero__title {
  margin-top: var(--s-4);
  font-size: clamp(var(--t-2xl), 5vw, var(--t-4xl));
  line-height: 1.1;
  font-weight: var(--fw-head);
  letter-spacing: var(--track-head);
  max-width: 18ch;
  text-wrap: balance;
}
.hero__lede {
  margin-top: var(--s-4);
  font-size: var(--t-lg);
  color: var(--ink-2);
  max-width: 46ch;
  line-height: 1.5;
}
.hero__actions { display: flex; gap: var(--s-2); margin-top: var(--s-6); flex-wrap: wrap; }
.band { background: var(--surface); }
.band__in { padding-block: var(--section); }
.section { padding-block: var(--section); }
.section__title {
  font-size: var(--t-3xl);
  font-weight: var(--fw-head);
  letter-spacing: var(--track-head);
  max-width: 22ch;
  text-wrap: balance;
}
.grid-3 { display: grid; grid-template-columns: repeat(3, 1fr); gap: var(--s-4); margin-top: var(--s-6); }
.grid-2 { display: grid; grid-template-columns: repeat(2, 1fr); gap: var(--s-4); margin-top: var(--s-6); }
.step { display: grid; gap: var(--s-2); }
.step__no {
  display: grid;
  place-items: center;
  width: 28px;
  height: 28px;
  border-radius: var(--r-pill);
  background: var(--brand-50);
  box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--brand) 30%, transparent);
  color: var(--brand-ink);
  font-size: var(--t-xs);
  font-weight: 700;
  font-variant-numeric: tabular-nums;
}
.faq { display: grid; gap: 0; margin-top: var(--s-5); border-top: 1px solid var(--border); }
.faq details { border-bottom: 1px solid var(--border); }
.faq summary {
  display: flex;
  align-items: center;
  gap: var(--s-3);
  min-height: var(--control-h);
  padding-block: var(--s-3);
  cursor: pointer;
  font-size: var(--t-base);
  font-weight: var(--fw-ui);
  list-style: none;
}
.faq summary::-webkit-details-marker { display: none; }
.faq summary::after {
  content: "";
  margin-inline-start: auto;
  width: 8px; height: 8px;
  border-right: 1.5px solid var(--ink-3);
  border-bottom: 1.5px solid var(--ink-3);
  transform: rotate(45deg);
  transition: transform var(--dur-base) var(--ease);
}
.faq details[open] summary::after { transform: rotate(-135deg); }
.faq p { padding-block: 0 var(--s-4); color: var(--ink-2); font-size: var(--t-sm); }
.cta {
  padding-block: var(--section);
  text-align: center;
  display: grid;
  justify-items: center;
  gap: var(--s-4);
}
.site-footer {
  border-top: 1px solid var(--border);
  padding-block: var(--s-7);
  font-size: var(--t-sm);
  color: var(--ink-3);
}
.site-footer__in { display: flex; gap: var(--s-6); flex-wrap: wrap; align-items: center; }
.site-footer__links { margin-inline-start: auto; display: flex; gap: var(--s-4); }
.site-footer a { color: var(--ink-2); text-decoration: none; }
.site-footer a:hover { color: var(--ink); }

/* ---------------- 认证页 ---------------- */
.auth {
  min-height: 100vh;
  display: grid;
  place-items: center;
  padding: var(--s-5);
  background: var(--surface);
}
.auth__card {
  width: min(400px, 100%);
  background: var(--raised);
  border-radius: var(--r-lg);
  box-shadow: var(--hairline), var(--sh-2);
  padding: var(--s-7);
}
.auth__brand { display: flex; align-items: center; gap: var(--s-2); font-weight: var(--fw-head); }
.auth__title { margin-top: var(--s-5); font-size: var(--t-xl); font-weight: var(--fw-head); letter-spacing: var(--track-head); }
.auth__sub { margin-top: var(--s-1); font-size: var(--t-sm); color: var(--ink-2); }
.auth__form { display: grid; gap: var(--s-4); margin-top: var(--s-6); }
.auth__foot { margin-top: var(--s-5); font-size: var(--t-xs); color: var(--ink-3); text-align: center; }

/* ---------------- 表单页 ---------------- */
.form-section { display: grid; gap: var(--s-3); }
.form-section + .form-section { margin-top: var(--s-6); padding-top: var(--s-6); border-top: 1px solid var(--border); }
.form-section__title { font-size: var(--t-lg); font-weight: var(--fw-head); }
.form-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: var(--s-4); }
.field--full { grid-column: 1 / -1; }
.sticky-bar {
  position: sticky;
  bottom: 0;
  display: flex;
  align-items: center;
  gap: var(--s-3);
  padding: var(--s-3) var(--s-5);
  background: color-mix(in srgb, var(--bg) 92%, transparent);
  backdrop-filter: blur(8px);
  border-top: 1px solid var(--border);
}
.sticky-bar__hint { font-size: var(--t-xs); color: var(--ink-3); }
.sticky-bar__actions { margin-inline-start: auto; display: flex; gap: var(--s-2); }

/* ---------------- 响应式 ---------------- */
@media (max-width: 1080px) {
  .app { grid-template-columns: 1fr; }
  .app__sidebar {
    flex-direction: row;
    align-items: center;
    gap: var(--s-3);
    overflow-x: auto;
    border-inline-end: 0;
    border-bottom: 1px solid var(--border);
    padding: var(--s-2) var(--s-3);
  }
  .nav { display: flex; gap: 2px; flex: 1 1 auto; overflow-x: auto; scrollbar-width: thin; }
  .sidebar__foot { display: none; }
  .nav__group { display: none; }
  .nav-item[aria-current="page"] { box-shadow: inset 0 -3px 0 var(--brand); }
  .grid-3, .grid-2 { grid-template-columns: 1fr; }
  .page { padding: var(--s-4); }
}
@media (max-width: 640px) {
  .form-grid { grid-template-columns: 1fr; }
  .kpis { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .nav-item, .btn, .btn--sm, .input, .select, .brand, .skip-link { min-height: 44px; }
  .nav-item { min-width: 44px; justify-content: center; }
  .btn--icon { min-width: 44px; }
  .check { min-height: 44px; display: inline-flex; align-items: center; }
  .skip-link { display: inline-flex; align-items: center; }
  .sticky-bar { position: static; }
  .check input { width: 20px; height: 20px; }
  .site-footer__links a, .auth a, .auth__foot a, a.help { display: inline-flex; align-items: center; justify-content: center; min-height: 44px; min-width: 44px; padding-block: 10px; padding-inline: 12px; }
  .tag { height: 24px; }
  .table { min-width: 560px; }
  .hero { padding-block: var(--s-8) var(--s-6); }
  .site-nav { display: none; }
  .table th, .table td { padding-inline: var(--s-2); }
}
`;
/* ------------------------------------------------------------------ HTML */

/* 深度语言 + 卡片四件套：由 --depth 与令牌驱动，页面里不要重写 */
const depthCss = `/* depth.css —— 卡片四件套（hover / focus-within / active）跟随 --depth */

${P.paper ? `body {
  background-image:
    linear-gradient(var(--paper-line) 1px, transparent 1px),
    linear-gradient(90deg, var(--paper-line) 1px, transparent 1px);
  background-size: 32px 32px;
}
` : ''}
.card:not(.card--flat),
.tile {
  box-shadow: var(--card-shadow);
  transition:
    box-shadow var(--dur-3) var(--ease-out),
    translate var(--dur-2) var(--ease-out),
    border-color var(--dur-2) var(--ease-in-out);
}
.card:not(.card--flat):hover,
.card:not(.card--flat):focus-within,
.tile:hover,
.tile:focus-within {
  box-shadow: var(--card-shadow-hover);
  translate: var(--card-hx) var(--card-hy);
}
.card:not(.card--flat):active,
.tile:active {
  box-shadow: var(--card-shadow-active);
  translate: 0 var(--card-press);
  transition-duration: var(--dur-1);
}
@media (hover: none) {
  .card:not(.card--flat):hover,
  .tile:hover { translate: 0 0; }
}
`;

/* catalog.css —— 左栏目录 + 3 列图版（Muzli / 站酷 / UI 世界三派的交集） */
const catalogCss = `/* catalog.css */

.cat { display: grid; grid-template-columns: 220px minmax(0, 1fr); gap: var(--s-8); align-items: start; }
.cat__rail { position: sticky; top: var(--s-5); max-height: calc(100vh - var(--s-6)); overflow: auto; }
.cat__rail-search {
  width: 100%;
  height: var(--control-h-sm);
  margin-bottom: var(--s-4);
  padding-inline: var(--s-3);
  border: 1px solid var(--border);
  border-radius: var(--r-sm);
  background: var(--surface);
  color: var(--ink);
  font-size: var(--t-sm);
}
.cat__group { margin-bottom: var(--s-5); }
.cat__group-title {
  font-size: var(--t-xs);
  letter-spacing: .08em;
  text-transform: uppercase;
  color: var(--ink-3);
  margin-bottom: var(--s-2);
}
.cat__nav-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--s-2);
  min-height: 34px;
  padding: 0 var(--s-3);
  border-radius: var(--r-sm);
  color: var(--ink-2);
  text-decoration: none;
  font-size: var(--t-sm);
}
.cat__nav-item:hover { background: var(--surface-hover); color: var(--ink); }
.cat__nav-item[aria-current="page"] {
  background: color-mix(in srgb, var(--brand) 10%, transparent);
  color: var(--ink);
  font-weight: var(--fw-ui);
}
.cat__nav-count { font-size: var(--t-xs); color: var(--ink-3); font-variant-numeric: tabular-nums; }
.cat__main { min-width: 0; }
.cat__crumbs { font-size: var(--t-xs); color: var(--ink-3); margin-bottom: var(--s-3); }
.cat__crumbs a { color: var(--ink-2); text-decoration: underline; text-decoration-thickness: 1px; text-underline-offset: 2px; }
.cat__title {
  font-family: var(--font-display);
  font-size: var(--t-4xl);
  line-height: var(--lh-4xl);
  letter-spacing: var(--track-head);
  margin-bottom: var(--s-3);
  text-wrap: balance;
}
.cat__lede { font-size: var(--t-lg); color: var(--ink-2); max-width: 60ch; margin-bottom: var(--s-2); }
.cat__meta { font-size: var(--t-sm); color: var(--ink-3); margin-bottom: var(--s-4); }
.cat__meta strong { color: var(--brand-ink); font-weight: var(--fw-ui); }
.cat__pills { display: flex; flex-wrap: wrap; gap: var(--s-2); margin-bottom: var(--s-4); }
.cat__pill {
  display: inline-flex;
  align-items: center;
  min-height: var(--control-h-sm);
  padding: 0 var(--s-4);
  border: 1px solid var(--border);
  border-radius: var(--r-pill);
  background: transparent;
  color: var(--ink-2);
  font-size: var(--t-sm);
  text-decoration: none;
}
.cat__pill:hover { border-color: var(--ink-4); color: var(--ink); }
.cat__pill[aria-current="true"] { background: var(--ink); border-color: var(--ink); color: var(--bg); }
.cat__count {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--s-3);
  padding-bottom: var(--s-3);
  border-bottom: 1px solid var(--border);
  margin-bottom: var(--s-5);
  font-size: var(--t-sm);
  color: var(--ink-3);
}
.cat__grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: var(--s-6) var(--s-5); }
.cat__card {
  display: flex;
  flex-direction: column;
  gap: var(--s-2);
  min-width: 0;
  text-decoration: none;
  color: inherit;
  border-radius: var(--r-md);
}
.cat__thumb {
  position: relative;
  display: block;
  aspect-ratio: 16 / 10;
  border-radius: var(--r-sm);
  background: var(--skeleton);
  box-shadow: var(--card-shadow);
  transition:
    box-shadow var(--dur-3) var(--ease-out),
    translate var(--dur-2) var(--ease-out);
  overflow: hidden;
}
.cat__card:hover .cat__thumb,
.cat__card:focus-within .cat__thumb {
  box-shadow: var(--card-shadow-hover);
  translate: var(--card-hx) var(--card-hy);
}
.cat__card:active .cat__thumb {
  box-shadow: var(--card-shadow-active);
  translate: 0 var(--card-press);
  transition-duration: var(--dur-1);
}
@media (hover: none) {
  .cat__card:hover .cat__thumb { translate: 0 0; }
}
.cat__thumb img { width: 100%; height: 100%; object-fit: cover; }
.cat__badge {
  position: absolute;
  inset-inline-end: var(--s-2);
  inset-block-start: var(--s-2);
  padding: 2px var(--s-2);
  border-radius: var(--r-xs);
  background: var(--ink);
  color: var(--bg);
  font-size: var(--t-xs);
  font-weight: var(--fw-ui);
}
.cat__card-title {
  font-size: var(--t-base);
  font-weight: var(--fw-ui);
  line-height: 1.35;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.cat__card:hover .cat__card-title { color: var(--brand-ink); }
.cat__card-meta { font-size: var(--t-xs); color: var(--ink-3); }
.cat__pager { display: flex; gap: var(--s-2); align-items: center; margin-top: var(--s-6); }
.cat__pager a, .cat__pager span {
  min-width: 36px;
  height: 36px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--border);
  border-radius: var(--r-sm);
  color: var(--ink-2);
  font-size: var(--t-sm);
  text-decoration: none;
}
.cat__pager [aria-current="page"] { background: var(--ink); border-color: var(--ink); color: var(--bg); }
@media (max-width: 1080px) {
  .cat { grid-template-columns: minmax(0, 1fr); }
  /* 平板：侧栏横过来排成两列，别把图版推到第二屏之外 */
  .cat__rail {
    position: static;
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: var(--s-4) var(--s-5);
    max-height: none;
    overflow: visible;
  }
  .cat__rail-search { grid-column: 1 / -1; }
  /* 分组外包了一层 div；display: contents 让分组直接落进上面的两列 */
  .cat__rail > nav, .cat__rail > div { display: contents; }
  .cat__group { margin: 0; }
  .cat__grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
}
@media (max-width: 640px) {
  .cat__grid { grid-template-columns: minmax(0, 1fr); }
  .cat__title { font-size: var(--t-3xl); line-height: var(--lh-3xl); }
  /* 触屏下限 44：搜索、目录项、药丸、分页都要够大 */
  .cat__rail-search { height: 44px; }
  .cat__nav-item { min-height: 44px; }
  .cat__pill { min-height: 44px; padding-inline: var(--s-4); }
  .cat__pager a, .cat__pager span { min-width: 44px; height: 44px; }
}
`;const head = (title, extra = '') => `<!doctype html>
<html lang="zh-CN" data-theme="light">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${title} · ${NAME}</title>
<meta name="description" content="${P.label}骨架页，由 scaffold.mjs 生成。">
<link rel="icon" href="data:,">
<link rel="stylesheet" href="tokens.css">
<link rel="stylesheet" href="base.css">
<link rel="stylesheet" href="components.css">
<link rel="stylesheet" href="depth.css">
<link rel="stylesheet" href="catalog.css">
${extra}</head>
<body>
`;

const tail = () => `<script src="ui.js" defer></script>
</body>
</html>
`;

const shellNote = (blocks) => `<!--
  骨架：${blocks.join(' → ')}
  交付前：
  1) 把 {{TODO: ...}} 换成真内容，不要留 lorem 或等长的假句子
  2) 品牌色只改 tokens.css 里的 --brand-*；页面里不写死颜色
  3) 用不到的区块整块删掉，不要留着占位
  4) 跑 node scripts/audit.mjs + node scripts/screenshot.mjs 再交付
-->
`;

const landingHtml = head('首页') + shellNote(['nav', 'hero', 'evidence', 'features', 'flow', 'faq', 'cta', 'footer']) + `<a class="skip-link" href="#main">跳到主内容</a>

<header class="site-header">
  <div class="container site-header__in">
    <a class="brand" href="./index.html">
      <span class="brand__mark" aria-hidden="true">${NAME.slice(0, 1)}</span>
      <span>${NAME}</span>
    </a>
    <nav class="site-nav" aria-label="主导航">
      <a href="#features">功能</a>
      <a href="#flow">怎么用</a>
      <a href="#faq">常见问题</a>
      <a href="./app.html">控制台</a>
    </nav>
    <div style="margin-inline-start:auto; display:flex; gap:var(--s-2)">
      <a class="btn btn--ghost" href="./auth.html">登录</a>
      <a class="btn btn--primary" href="./auth.html">免费开始</a>
    </div>
  </div>
</header>

<main id="main">
  <section class="hero container">
    <h1 class="hero__title">把{{TODO: 主语}}从{{TODO: 现状}}变成{{TODO: 结果}}</h1>
    <p class="hero__lede">{{TODO: 两句话说清为谁解决什么：第一句说场景，第二句说结果。不要形容词堆砌。}}</p>
    <div class="hero__actions">
      <a class="btn btn--primary btn--lg" href="./auth.html">免费开始</a>
      <a class="btn btn--secondary btn--lg" href="#flow">看怎么用</a>
    </div>
  </section>

  <section class="band" aria-label="客户与数据">
    <div class="container band__in" style="padding-block:var(--s-8)">
      <p class="tiny" style="text-align:center">已有 {{TODO: N}} 个团队在用</p>
      <div class="grid-3" style="margin-top:var(--s-5); text-align:center">
        <div><div class="kpi__value">{{TODO: 12,000}}</div><p class="tiny">每天处理的任务</p></div>
        <div><div class="kpi__value">{{TODO: 99.9%}}</div><p class="tiny">过去 90 天可用性</p></div>
        <div><div class="kpi__value">{{TODO: 3 分钟}}</div><p class="tiny">从注册到第一条数据</p></div>
      </div>
    </div>
  </section>

  <section class="section container" id="features">
    <h2 class="section__title">三件事做对就够了</h2>
    <p class="hero__lede" style="margin-top:var(--s-3)">{{TODO: 一段导语，说明这三件事为什么按这个顺序。}}</p>
    <div class="grid-3">
      <article class="card">
        <h3 class="card__title">{{TODO: 功能名，动词开头}}</h3>
        <p class="muted" style="font-size:var(--t-sm)">{{TODO: 这个功能解决的具体动作，一句。}}</p>
      </article>
      <article class="card">
        <h3 class="card__title">{{TODO: 功能名}}</h3>
        <p class="muted" style="font-size:var(--t-sm)">{{TODO: 一句。}}</p>
      </article>
      <article class="card">
        <h3 class="card__title">{{TODO: 功能名}}</h3>
        <p class="muted" style="font-size:var(--t-sm)">{{TODO: 一句。}}</p>
      </article>
    </div>
  </section>

  <section class="band" id="flow">
    <div class="container band__in">
      <h2 class="section__title">三步开始</h2>
      <div class="grid-3">
        <div class="step"><span class="step__no num">1</span><h3>{{TODO: 第一步的动词}}</h3><p class="muted" style="font-size:var(--t-sm)">{{TODO: 一句。}}</p></div>
        <div class="step"><span class="step__no num">2</span><h3>{{TODO: 第二步}}</h3><p class="muted" style="font-size:var(--t-sm)">{{TODO: 一句。}}</p></div>
        <div class="step"><span class="step__no num">3</span><h3>{{TODO: 第三步}}</h3><p class="muted" style="font-size:var(--t-sm)">{{TODO: 一句。}}</p></div>
      </div>
    </div>
  </section>

  <section class="section container" id="faq">
    <div class="grid-2" style="align-items:start">
      <div>
        <h2 class="section__title">常见问题</h2>
        <p class="muted" style="margin-top:var(--s-3)">没找到答案？<a href="mailto:{{TODO: 邮箱}}">发邮件给我们</a>。</p>
      </div>
      <div class="faq">
        <details open>
          <summary>它和{{TODO: 竞品类别}}有什么不同？</summary>
          <p>{{TODO: 一句对比，说清取舍，不要贬低对方。}}</p>
        </details>
        <details>
          <summary>支持哪些登录方式？</summary>
          <p>{{TODO: 列出实际支持的方式。}}</p>
        </details>
        <details>
          <summary>数据存在哪里？</summary>
          <p>{{TODO: 区域与合规说明。}}</p>
        </details>
        <details>
          <summary>怎么取消订阅？</summary>
          <p>{{TODO: 一句话 + 路径。}}</p>
        </details>
      </div>
    </div>
  </section>

  <section class="cta container">
    <h2 class="section__title" style="text-align:center; max-width:24ch">现在就能用起来</h2>
    <p class="hero__lede" style="text-align:center">{{TODO: 一句行动号召的补充，例如适用范围或时长。}}</p>
    <a class="btn btn--primary btn--lg" href="./auth.html">免费开始</a>
  </section>
</main>

<footer class="site-footer">
  <div class="container site-footer__in">
    <span>© <span class="num">2026</span> ${NAME}</span>
    <nav class="site-footer__links" aria-label="页脚">
      <a href="{{TODO: 隐私政策链接}}">隐私</a>
      <a href="{{TODO: 服务条款链接}}">条款</a>
      <a href="./app.html">控制台</a>
    </nav>
  </div>
</footer>

` + tail();
const appHtml = head('工单列表') + shellNote(['sidebar', 'topbar', 'page-head', 'kpis', 'toolbar', 'table', 'pager', 'empty-state']) + `<div class="app">
  <aside class="app__sidebar">
    <a class="brand" href="./index.html">
      <span class="brand__mark" aria-hidden="true">${NAME.slice(0, 1)}</span>
      <span>${NAME}</span>
    </a>
    <nav class="nav" aria-label="侧边导航">
      <span class="nav__group">工作台</span>
      <a class="nav-item" href="./app.html">概览</a>
      <a class="nav-item" href="./app.html" aria-current="page">工单 <span class="tag tag--brand nav-item__badge num">12</span></a>
      <a class="nav-item" href="./form.html">新建</a>
      <span class="nav__group">系统</span>
      <a class="nav-item" href="./states.html">状态示例</a>
      <a class="nav-item" href="./auth.html">退出</a>
    </nav>
    <div class="tiny sidebar__foot">{{TODO: 可以放版本号或帮助入口}}</div>
  </aside>

  <div class="app__main">
    <header class="topbar">
      <span class="tiny">{{TODO: 面包屑，如 工作台 / 工单}}</span>
      <div class="topbar__spacer"></div>
      <button class="btn btn--ghost btn--icon" type="button" data-theme-toggle aria-label="切换主题"><span aria-hidden="true" data-icon>◐</span></button>
      <span class="tag">{{TODO: 用户名}}</span>
    </header>

    <main class="page" id="main">
      <div class="page__head">
        <div>
          <h1 class="page__title">工单</h1>
          <p class="page__desc">按更新时间排序，只显示分配给你的。{{TODO: 换成本页真实范围}}</p>
        </div>
        <div class="page__actions">
          <button class="btn btn--secondary" type="button">导出</button>
          <a class="btn btn--primary" href="./form.html">新建工单</a>
        </div>
      </div>

      <div class="kpis">
        <div class="kpi"><div class="kpi__label">待处理</div><div class="kpi__value num">12</div><div class="kpi__delta kpi__delta--up">比昨天多 3</div></div>
        <div class="kpi"><div class="kpi__label">今日完成</div><div class="kpi__value num">28</div><div class="kpi__delta kpi__delta--up">+12%</div></div>
        <div class="kpi"><div class="kpi__label">平均响应</div><div class="kpi__value num">1.8h</div><div class="kpi__delta kpi__delta--down">慢了 0.2h</div></div>
        <div class="kpi"><div class="kpi__label">满意度</div><div class="kpi__value num">96%</div><div class="kpi__delta">近 7 天</div></div>
      </div>

      <div class="toolbar">
        <div class="input-group toolbar__search">
          <input class="input" type="search" placeholder="搜索工单号或标题" aria-label="搜索工单">
        </div>
        <select class="select" style="width:auto" aria-label="按状态筛选">
          <option>全部状态</option>
          <option>待处理</option>
          <option>进行中</option>
          <option>已完成</option>
        </select>
        <button class="btn btn--secondary btn--sm" type="button">更多筛选</button>
      </div>

      <div class="table-wrap">
        <table class="table" aria-label="工单列表">
          <thead>
            <tr>
              <th scope="col">工单号</th>
              <th scope="col">标题</th>
              <th scope="col">状态</th>
              <th scope="col">负责人</th>
              <th scope="col">更新时间</th>
              <th scope="col" class="t-right">操作</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td class="num">#10231</td>
              <td>导出报表时超时</td>
              <td><span class="tag tag--warn"><span class="dot"></span>进行中</span></td>
              <td>{{TODO: 姓名}}</td>
              <td class="num">2 分钟前</td>
              <td class="actions"><button class="btn btn--ghost btn--sm" type="button">详情</button></td>
            </tr>
            <tr>
              <td class="num">#10230</td>
              <td>邀请成员收不到邮件</td>
              <td><span class="tag tag--danger"><span class="dot"></span>待处理</span></td>
              <td>{{TODO: 姓名}}</td>
              <td class="num">18 分钟前</td>
              <td class="actions"><button class="btn btn--ghost btn--sm" type="button">详情</button></td>
            </tr>
            <tr>
              <td class="num">#10229</td>
              <td>账单地址无法修改</td>
              <td><span class="tag tag--ok"><span class="dot"></span>已完成</span></td>
              <td>{{TODO: 姓名}}</td>
              <td class="num">1 小时前</td>
              <td class="actions"><button class="btn btn--ghost btn--sm" type="button">详情</button></td>
            </tr>
            <tr>
              <td class="num">#10228</td>
              <td>API 返回 429</td>
              <td><span class="tag tag--warn"><span class="dot"></span>进行中</span></td>
              <td>{{TODO: 姓名}}</td>
              <td class="num">3 小时前</td>
              <td class="actions"><button class="btn btn--ghost btn--sm" type="button">详情</button></td>
            </tr>
            <tr>
              <td class="num">#10227</td>
              <td>希望支持批量删除</td>
              <td><span class="tag"><span class="dot"></span>已归档</span></td>
              <td>{{TODO: 姓名}}</td>
              <td class="num">昨天</td>
              <td class="actions"><button class="btn btn--ghost btn--sm" type="button">详情</button></td>
            </tr>
            <tr>
              <td class="num">#10226</td>
              <td>移动端表格横向滚动卡顿</td>
              <td><span class="tag tag--ok"><span class="dot"></span>已完成</span></td>
              <td>{{TODO: 姓名}}</td>
              <td class="num">昨天</td>
              <td class="actions"><button class="btn btn--ghost btn--sm" type="button">详情</button></td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="pager">
        <span class="pager__info">第 1–6 条，共 128 条</span>
        <button class="btn btn--secondary btn--sm" type="button" disabled>上一页</button>
        <button class="btn btn--secondary btn--sm" type="button">下一页</button>
      </div>

      <div class="card card--flat">
        <div class="empty">
          <svg class="empty__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h10"/></svg>
          <p class="empty__title">没有匹配的工单</p>
          <p class="empty__text">换个关键词，或清空筛选条件再看一次。</p>
          <button class="btn btn--secondary btn--sm" type="button">清空筛选</button>
        </div>
      </div>
    </main>
  </div>
</div>

` + tail();

const formHtml = head('新建工单') + shellNote(['page-head', 'form-sections', 'error', 'sticky-bar']) + `<div class="app">
  <aside class="app__sidebar">
    <a class="brand" href="./index.html">
      <span class="brand__mark" aria-hidden="true">${NAME.slice(0, 1)}</span>
      <span>${NAME}</span>
    </a>
    <nav class="nav" aria-label="侧边导航">
      <span class="nav__group">工作台</span>
      <a class="nav-item" href="./app.html">概览</a>
      <a class="nav-item" href="./app.html">工单</a>
      <a class="nav-item" href="./form.html" aria-current="page">新建</a>
      <span class="nav__group">系统</span>
      <a class="nav-item" href="./states.html">状态示例</a>
    </nav>
  </aside>

  <div class="app__main">
    <header class="topbar">
      <span class="tiny">工作台 / 工单 / 新建</span>
      <div class="topbar__spacer"></div>
      <button class="btn btn--ghost btn--icon" type="button" data-theme-toggle aria-label="切换主题"><span aria-hidden="true" data-icon>◐</span></button>
    </header>

    <main class="page" id="main">
      <div class="page__head">
        <div>
          <h1 class="page__title">新建工单</h1>
          <p class="page__desc">带 * 的是必填项。保存后可以继续编辑。</p>
        </div>
      </div>

      <div class="alert alert--error" role="alert">
        <span aria-hidden="true">!</span>
        <span>{{TODO: 校验失败时显示这一条，写清哪个字段错了、怎么改。默认可以删掉。}}</span>
      </div>

      <form class="card" novalidate>
        <section class="form-section">
          <h2 class="form-section__title">基本信息</h2>
          <div class="form-grid">
            <div class="field field--full">
              <label class="label" for="f-title">标题 <span class="req" aria-hidden="true">*</span></label>
              <input class="input" id="f-title" name="title" required maxlength="80" placeholder="一句话描述问题，例如：导出报表时超时">
              <p class="help">不超过 80 字，说清在哪个页面、做了什么、出现了什么。</p>
            </div>
            <div class="field">
              <label class="label" for="f-type">类型</label>
              <select class="select" id="f-type" name="type">
                <option>故障</option>
                <option>咨询</option>
                <option>需求</option>
              </select>
            </div>
            <div class="field">
              <label class="label" for="f-priority">优先级</label>
              <select class="select" id="f-priority" name="priority">
                <option>普通</option>
                <option>紧急</option>
              </select>
            </div>
            <div class="field field--full">
              <label class="label" for="f-desc">详细描述</label>
              <textarea class="textarea" id="f-desc" name="desc" rows="5" placeholder="复现步骤、预期结果、实际结果"></textarea>
              <p class="help">贴截图或链接会更快定位。</p>
            </div>
          </div>
        </section>

        <section class="form-section">
          <h2 class="form-section__title">联系方式</h2>
          <div class="form-grid">
            <div class="field">
              <label class="label" for="f-name">姓名</label>
              <input class="input" id="f-name" name="name" autocomplete="name">
            </div>
            <div class="field">
              <label class="label" for="f-email">邮箱 <span class="req" aria-hidden="true">*</span></label>
              <input class="input" id="f-email" name="email" type="email" required autocomplete="email" placeholder="name@company.com">
              <p class="help">回复会发到这个邮箱。</p>
            </div>
            <div class="field field--full">
              <label class="check"><input type="checkbox" name="notify" checked> 状态变化时邮件通知我</label>
            </div>
          </div>
        </section>

        <div class="sticky-bar">
          <span class="sticky-bar__hint">{{TODO: 需要提醒的话放这里，例如「保存后 24 小时内会有回复」}}</span>
          <div class="sticky-bar__actions">
            <a class="btn btn--secondary" href="./app.html">取消</a>
            <button class="btn btn--primary" type="submit">保存</button>
          </div>
        </div>
      </form>
    </main>
  </div>
</div>

` + tail();
const authHtml = head('登录') + shellNote(['auth-card', 'fields', 'secondary-actions']) + `<main class="auth" id="main">
  <div class="auth__card">
    <div class="auth__brand">
      <span class="brand__mark" aria-hidden="true">${NAME.slice(0, 1)}</span>
      <span>${NAME}</span>
    </div>
    <h1 class="auth__title">登录</h1>
    <p class="auth__sub">用邮箱和密码登录，或选一种第三方方式。</p>

    <form class="auth__form" novalidate>
      <div class="field">
        <label class="label" for="a-email">邮箱</label>
        <input class="input" id="a-email" name="email" type="email" autocomplete="email" required placeholder="name@company.com">
      </div>
      <div class="field">
        <div style="display:flex; align-items:center">
          <label class="label" for="a-pass">密码</label>
          <a class="help" style="margin-inline-start:auto" href="{{TODO: 找回密码链接}}">忘记密码？</a>
        </div>
        <div class="input-group">
          <input class="input" id="a-pass" name="password" type="password" autocomplete="current-password" required minlength="8">
          <button class="btn btn--ghost btn--icon" type="button" data-pass-toggle aria-label="显示密码" aria-pressed="false">◉</button>
        </div>
      </div>
      <button class="btn btn--primary btn--block" type="submit">登录</button>
    </form>

    <p class="auth__foot">还没有账号？<a href="./auth.html">注册</a></p>
  </div>
</main>

` + tail();

const statesHtml = head('状态示例') + shellNote(['empty', 'error', 'loading', 'inline-validation']) + `<div class="app">
  <aside class="app__sidebar">
    <a class="brand" href="./index.html">
      <span class="brand__mark" aria-hidden="true">${NAME.slice(0, 1)}</span>
      <span>${NAME}</span>
    </a>
    <nav class="nav" aria-label="侧边导航">
      <a class="nav-item" href="./app.html">工单</a>
      <a class="nav-item" href="./form.html">新建</a>
      <a class="nav-item" href="./states.html" aria-current="page">状态示例</a>
    </nav>
  </aside>

  <div class="app__main">
    <header class="topbar">
      <span class="tiny">系统 / 状态示例</span>
      <div class="topbar__spacer"></div>
      <button class="btn btn--ghost btn--icon" type="button" data-theme-toggle aria-label="切换主题"><span aria-hidden="true" data-icon>◐</span></button>
    </header>

    <main class="page" id="main">
      <div class="page__head">
        <div>
          <h1 class="page__title">状态示例</h1>
          <p class="page__desc">空、错、载三种状态各写一次，别到上线才想文案。</p>
        </div>
      </div>

      <div class="grid-2">
        <div class="card">
          <h2 class="card__title">空</h2>
          <div class="empty" style="padding-block:var(--s-6)">
            <svg class="empty__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 10h18"/></svg>
            <p class="empty__title">还没有任何工单</p>
            <p class="empty__text">提交第一条之后，这里会按时间倒序显示。</p>
            <a class="btn btn--primary btn--sm" href="./form.html">新建工单</a>
          </div>
        </div>

        <div class="card">
          <h2 class="card__title">错误</h2>
          <div class="alert alert--error" role="alert" style="margin-top:var(--s-3)">
            <span aria-hidden="true">!</span>
            <span>保存失败：标题重复。改一个字再提交，或先打开已有工单查看。</span>
          </div>
          <div class="alert alert--warn" role="status" style="margin-top:var(--s-2)">
            <span aria-hidden="true">!</span>
            <span>当前是只读模式，改动不会保存。</span>
          </div>
          <div class="alert alert--ok" role="status" style="margin-top:var(--s-2)">
            <span aria-hidden="true">✓</span>
            <span>已保存，2 秒后自动跳转。</span>
          </div>
        </div>
      </div>

      <div class="card">
        <h2 class="card__title">加载</h2>
        <div style="display:grid; gap:var(--s-3); margin-top:var(--s-3)">
          <div class="skeleton" style="width:40%"></div>
          <div class="skeleton" style="width:100%; height:40px"></div>
          <div class="skeleton" style="width:100%; height:40px"></div>
          <div class="skeleton" style="width:76%"></div>
        </div>
      </div>

      <div class="card">
        <h2 class="card__title">字段级校验</h2>
        <div class="form-grid" style="margin-top:var(--s-3)">
          <div class="field">
            <label class="label" for="s-bad">邮箱</label>
            <input class="input" id="s-bad" value="not-an-email" aria-invalid="true" aria-describedby="s-bad-err">
            <p class="error-text" id="s-bad-err">邮箱格式不对，检查一下 @ 后面。</p>
          </div>
          <div class="field">
            <label class="label" for="s-off">被禁用的字段</label>
            <input class="input" id="s-off" value="只读" disabled>
            <p class="help">禁用态只降到 55% 不透明，不要换颜色。</p>
          </div>
        </div>
        <div class="tabs" role="tablist" style="margin-top:var(--s-5)">
          <button class="tab" role="tab" aria-selected="true" type="button">全部</button>
          <button class="tab" role="tab" aria-selected="false" type="button">我的</button>
          <button class="tab" role="tab" aria-selected="false" type="button">已归档</button>
        </div>
      </div>
    </main>
  </div>
</div>

` + tail();
/* ------------------------------------------------------------------ ui.js */

const catalogHtml = head('目录') + shellNote(['site-header', 'rail', 'breadcrumb', 'display-title', 'lede', 'meta', 'pills', 'count-row', 'card-grid', 'pager']) + `<a class="skip-link" href="#main">跳到主内容</a>

<header class="site-header">
  <div class="container site-header__in">
    <a class="brand" href="./index.html">
      <span class="brand__mark" aria-hidden="true">${NAME.slice(0, 1)}</span>
      <span>${NAME}</span>
    </a>
    <nav class="site-nav" aria-label="主导航">
      <a href="./catalog.html" aria-current="page">目录</a>
      <a href="#todo">分类</a>
      <a href="#todo">合集</a>
      <a href="./app.html">控制台</a>
    </nav>
    <div style="margin-inline-start:auto; display:flex; gap:var(--s-2)">
      <a class="btn btn--ghost" href="./auth.html">登录</a>
      <a class="btn btn--primary" href="./auth.html">免费开始</a>
    </div>
  </div>
</header>

<main id="main" class="container" style="padding-block:var(--s-6)">
  <div class="cat">
    <aside class="cat__rail">
      <input id="cat-search" class="cat__rail-search" type="search" aria-label="{{TODO: 搜索什么}}" placeholder="{{TODO: 搜索名称、场景、关键词}}">
      <nav aria-label="目录分组">
        <div class="cat__group">
          <p class="cat__group-title">{{TODO: 分组一}}</p>
          <a class="cat__nav-item" href="#" aria-current="page">全部<span class="cat__nav-count">{{TODO: 128}}</span></a>
          <a class="cat__nav-item" href="#">{{TODO: 子项}}<span class="cat__nav-count">{{TODO: 42}}</span></a>
          <a class="cat__nav-item" href="#">{{TODO: 子项}}<span class="cat__nav-count">{{TODO: 31}}</span></a>
          <a class="cat__nav-item" href="#">{{TODO: 子项}}<span class="cat__nav-count">{{TODO: 17}}</span></a>
        </div>
        <div class="cat__group">
          <p class="cat__group-title">{{TODO: 分组二}}</p>
          <a class="cat__nav-item" href="#">{{TODO: 子项}}<span class="cat__nav-count">{{TODO: 24}}</span></a>
          <a class="cat__nav-item" href="#">{{TODO: 子项}}<span class="cat__nav-count">{{TODO: 12}}</span></a>
        </div>
      </nav>
    </aside>

    <div class="cat__main">
      <p class="cat__crumbs"><a href="./index.html">首页</a> / <a href="#">目录</a> / {{TODO: 当前分类}}</p>
      <h1 class="cat__title">{{TODO: 目录标题，一句话说清这一页收什么}}</h1>
      <p class="cat__lede">{{TODO: 一到两句：谁在这里找什么，为什么是你来收。别写"精选优质"这种空话。}}</p>
      <p class="cat__meta"><strong>{{TODO: 5 项}}</strong> 是最近两周新增 · 最后更新 {{TODO: 2026-11-06}}</p>

      <div class="cat__pills" role="tablist" aria-label="分类筛选">
        <a class="cat__pill" href="#" role="tab" aria-selected="true" aria-current="true">{{TODO: 全部}}</a>
        <a class="cat__pill" href="#" role="tab">{{TODO: 分类 A}}</a>
        <a class="cat__pill" href="#" role="tab">{{TODO: 分类 B}}</a>
        <a class="cat__pill" href="#" role="tab">{{TODO: 分类 C}}</a>
        <a class="cat__pill" href="#" role="tab">{{TODO: 分类 D}}</a>
      </div>

      <div class="cat__count">
        <span>显示 1–9 / 共 {{TODO: 128}} 个</span>
        <label class="tiny" for="cat-sort">排序
          <select id="cat-sort" class="select" style="height:var(--control-h-sm); width:auto; margin-inline-start:var(--s-2)">
            <option>{{TODO: 推荐}}</option>
            <option>最新</option>
            <option>最热</option>
          </select>
        </label>
      </div>

      <div class="cat__grid">
        <a class="cat__card" href="#todo">
          <span class="cat__thumb"><span class="cat__badge">{{TODO: 新}}</span></span>
          <span class="cat__card-title">{{TODO: 条目名称，一行到两行}}</span>
          <span class="cat__card-meta">{{TODO: 分类}} · {{TODO: 作者}}</span>
        </a>
        <a class="cat__card" href="#todo">
          <span class="cat__thumb"></span>
          <span class="cat__card-title">{{TODO: 条目名称}}</span>
          <span class="cat__card-meta">{{TODO: 分类}} · {{TODO: 更新时间}}</span>
        </a>
        <a class="cat__card" href="#todo">
          <span class="cat__thumb"></span>
          <span class="cat__card-title">{{TODO: 条目名称}}</span>
          <span class="cat__card-meta">{{TODO: 分类}} · {{TODO: 更新时间}}</span>
        </a>
        <a class="cat__card" href="#todo">
          <span class="cat__thumb"></span>
          <span class="cat__card-title">{{TODO: 条目名称}}</span>
          <span class="cat__card-meta">{{TODO: 分类}} · {{TODO: 更新时间}}</span>
        </a>
        <a class="cat__card" href="#todo">
          <span class="cat__thumb"></span>
          <span class="cat__card-title">{{TODO: 条目名称}}</span>
          <span class="cat__card-meta">{{TODO: 分类}} · {{TODO: 更新时间}}</span>
        </a>
        <a class="cat__card" href="#todo">
          <span class="cat__thumb"></span>
          <span class="cat__card-title">{{TODO: 条目名称}}</span>
          <span class="cat__card-meta">{{TODO: 分类}} · {{TODO: 更新时间}}</span>
        </a>
        <a class="cat__card" href="#todo">
          <span class="cat__thumb"></span>
          <span class="cat__card-title">{{TODO: 条目名称}}</span>
          <span class="cat__card-meta">{{TODO: 分类}} · {{TODO: 更新时间}}</span>
        </a>
        <a class="cat__card" href="#todo">
          <span class="cat__thumb"></span>
          <span class="cat__card-title">{{TODO: 条目名称}}</span>
          <span class="cat__card-meta">{{TODO: 分类}} · {{TODO: 更新时间}}</span>
        </a>
        <a class="cat__card" href="#todo">
          <span class="cat__thumb"></span>
          <span class="cat__card-title">{{TODO: 条目名称}}</span>
          <span class="cat__card-meta">{{TODO: 分类}} · {{TODO: 更新时间}}</span>
        </a>
      </div>

      <nav class="cat__pager" aria-label="分页">
        <span aria-current="page">1</span>
        <a href="#">2</a>
        <a href="#">3</a>
        <a href="#">下一页</a>
      </nav>
    </div>
  </div>
</main>

<footer class="site-footer">
  <div class="container site-footer__in">
    <p class="tiny">© 2026 {{TODO: 主体}}</p>
    <div class="site-footer__links">
      <a href="#">隐私</a>
      <a href="#">条款</a>
    </div>
  </div>
</footer>
` + tail();
const uiJs = `// ui.js —— 主题切换 / 密码显隐 / tabs 键盘 / 弹窗（无依赖，约 2KB）
(function () {
  var root = document.documentElement;
  var KEY = 'ui-theme';

  function apply(theme) {
    root.setAttribute('data-theme', theme);
    try { localStorage.setItem(KEY, theme); } catch (e) {}
    document.querySelectorAll('[data-theme-toggle]').forEach(function (b) {
      b.setAttribute('aria-pressed', String(theme === 'dark'));
      var icon = b.querySelector('[data-icon]');
      if (icon) icon.textContent = theme === 'dark' ? '◑' : '◐';
    });
  }

  var saved = null;
  try { saved = localStorage.getItem(KEY); } catch (e) {}
  var prefersDark = window.matchMedia('(prefers-color-scheme: dark)');
  apply(saved || (prefersDark.matches ? 'dark' : 'light'));
  document.addEventListener('click', function (e) {
    var t = e.target.closest('[data-theme-toggle]');
    if (t) {
      apply(root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark');
      return;
    }

    var p = e.target.closest('[data-pass-toggle]');
    if (p) {
      var input = p.parentElement.querySelector('input');
      var show = input.type === 'password';
      input.type = show ? 'text' : 'password';
      p.setAttribute('aria-pressed', String(show));
      p.setAttribute('aria-label', show ? '隐藏密码' : '显示密码');
      return;
    }

    var tab = e.target.closest('[role="tab"]');
    if (tab) {
      var list = tab.closest('[role="tablist"]');
      list.querySelectorAll('[role="tab"]').forEach(function (x) {
        x.setAttribute('aria-selected', String(x === tab));
      });
    }
  });

  document.addEventListener('keydown', function (e) {
    var tab = e.target.closest && e.target.closest('[role="tab"]');
    if (tab && (e.key === 'ArrowRight' || e.key === 'ArrowLeft')) {
      var tabs = Array.prototype.slice.call(tab.closest('[role="tablist"]').querySelectorAll('[role="tab"]'));
      var i = tabs.indexOf(tab);
      var next = tabs[(i + (e.key === 'ArrowRight' ? 1 : tabs.length - 1)) % tabs.length];
      next.focus();
      next.click();
      e.preventDefault();
    }
    if (e.key === 'Escape') {
      document.querySelectorAll('.modal.is-open').forEach(function (m) {
        m.classList.remove('is-open');
      });
    }
  });
  window.openModal = function (sel) {
    var m = document.querySelector(sel);
    if (!m) return;
    m.classList.add('is-open');
    var focusable = m.querySelector('button, [href], input, select, textarea');
    if (focusable) focusable.focus();
  };
  window.closeModal = function (sel) {
    var m = document.querySelector(sel);
    if (m) m.classList.remove('is-open');
  };
})();
`;

/* ------------------------------------------------------------------ 写盘 */

const pageMap = {
  landing: 'index.html',
  catalog: 'catalog.html',
  app: 'app.html',
  form: 'form.html',
  auth: 'auth.html',
  states: 'states.html',
};
const built = { landing: landingHtml, catalog: catalogHtml, app: appHtml, form: formHtml, auth: authHtml, states: statesHtml };
const unknown = pages.filter((x) => !pageMap[x]);
if (unknown.length) {
  console.error(`未知页面：${unknown.join(', ')}（可选：${Object.keys(pageMap).join(' / ')}）`);
  process.exit(2);
}
const files = [
  ['tokens.json', JSON.stringify(tokens, null, 2) + '\n'],
  ['tokens.css', tokensCss],
  ['base.css', baseCss],
  ['components.css', componentsCss],
  ['depth.css', depthCss],
  ['catalog.css', catalogCss],
  ['ui.js', uiJs],
];
for (const k of pages) files.push([pageMap[k], built[k]]);

await mkdir(outDir, { recursive: true });
let total = 0;
for (const [name, body] of files) {
  await writeFile(path.join(outDir, name), body, 'utf8');
  const bytes = Buffer.byteLength(body);
  total += bytes;
  if (!quiet) console.log('  + ' + name.padEnd(16) + String(bytes).padStart(7) + ' B');
}
/* ------------------------------------------------- 框架版（--stack） */
const stackMode = String(arg('stack', 'html') || 'html').toLowerCase();
const STACKS = ['html', 'react', 'vue', 'all'];
if (!STACKS.includes(stackMode)) {
  console.error(`未知 --stack：${stackMode}（可选：${STACKS.join(' / ')}）`);
  process.exit(2);
}
let stackTotal = 0;
let stackCount = 0;
if (stackMode !== 'html') {
  const stackOut = stackFiles({
    stack: stackMode,
    siteName: NAME,
    css: {
      'tokens.css': tokensCss,
      'base.css': baseCss,
      'components.css': componentsCss,
      'depth.css': depthCss,
      'catalog.css': catalogCss,
    },
  });
  for (const [rel, body] of stackOut) {
    const abs = path.join(outDir, ...rel.split('/'));
    await mkdir(path.dirname(abs), { recursive: true });
    await writeFile(abs, body, 'utf8');
    stackTotal += Buffer.byteLength(body);
    stackCount += 1;
  }
  if (!quiet) console.log('  + ' + (stackMode + '/**').padEnd(16) + String(stackTotal).padStart(7) + ' B  (' + stackCount + ' 个文件)');
}
/* 生成期自检：能算出来的对比度就不要留给"待会儿再看" */
const contrastChecks = [
  { name: '正文 --ink / --bg', v: contrast(P.ink, P.bg), min: 12 },
  { name: '--on-brand / --brand-fill', v: contrast(onBrand, brandFill), min: 4.5 },
  { name: '--brand-ink / --bg', v: contrast(brandInk, P.bg), min: 4.5 },
];
const failed = contrastChecks.filter((c) => c.v < c.min);

if (!quiet) {
  const rel = outDir.split(path.sep).join('/');
  console.log('');
  console.log('人格：' + P.label + '（--persona ' + personaKey + '）  参照：' + P.ref);
  console.log('密度：' + P.density + '  控件高：' + P.control + 'px  圆角：' + [P.radius.sm, P.radius.md, P.radius.lg, P.radius.xl].join('/') + 'px');
  console.log('品牌色相：' + accentHue + ' 度  →  --brand ' + brand[500]);
  console.log('深度语言：' + P.depth + '（卡片 hover 位移 ' + D.hx + ' / ' + D.hy + '，按下 ' + D.press + '）  动效阶梯：' + durLadder.join(' / ') + 'ms');
  console.log('对比度自检：' + (failed.length
    ? failed.map((c) => c.name + ' = ' + c.v.toFixed(2) + ':1，要求 ≥ ' + c.min).join('；') + '  ← 先修这个'
    : contrastChecks.map((c) => c.v.toFixed(1) + ':1').join(' / ') + '  全部达标'));
  console.log('输出：' + outDir + '（' + files.length + ' 个文件，' + (total / 1024).toFixed(1) + ' KB）');
  console.log('');
  console.log('接着做三件事：');
  console.log('  1) 打开页面看骨架，再把 {{TODO: ...}} 换成真内容');
  console.log('  2) 起本地服务再体检（file:// 会报 CORS 噪声，截图与审计都走 http）：');
  console.log('     npx serve . 或 python -m http.server 8000');
  console.log('     node scripts/audit.mjs --url http://127.0.0.1:8000/app.html --themes light,dark');
  console.log('     node scripts/screenshot.mjs --url http://127.0.0.1:8000/index.html --out .shots --themes light,dark');
  console.log('  3) 生成物是纯静态页、没有 package.json：不必跑 run_checks.mjs，上面两条加 contrast_check.py 就是验收。');
  console.log('');
  console.log('改 tokens.css 换品牌：--brand-* 换色，--r-* 换圆角，--control-h 换密度。');
  console.log('页面里不该出现硬编码颜色和像素字号。');
}