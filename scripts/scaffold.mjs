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
 *   mobile.css       移动端壳（390 单列 + 安全区 + 底部 tab + 原生 dialog 面板）
 *   commerce.css     电商三页（三层价格 / 36px 色块 SKU / 行项目 / 结算步骤条）
 *   ui.js            主题切换 + tabs + 弹窗焦点管理 + SKU / 购物车（无依赖）
 *   index.html       营销落地页（--pages landing）
 *   catalog.html     陈列目录页（--pages catalog）
 *   app.html         管理端列表页（--pages app）
 *   form.html        表单页（--pages form）
 *   auth.html        认证页（--pages auth）
 *   states.html      空/错/载三态（--pages states）
 *   mobile.html      移动端列表壳（--pages mobile）
 *   mobile-wizard.html  移动端多步向导（--pages mobile-wizard）
 *   mobile-pager.html   移动端横向滑动分栏（--pages mobile-pager）
 *   mobile-native.html  移动端原生壳桥接（--pages mobile-native）
 *   product.html     商品详情（--pages product）
 *   cart.html        购物车（--pages cart）
 *   checkout.html    结算（--pages checkout）
 *   orders.html      订单列表 + 状态筛选（--pages orders）
 *   order.html       订单详情 + 状态机时间线 + 退款（--pages order）
 *
 * 生成的是**骨架**：结构、令牌、状态都到位，内容和品牌要你自己换。
 * 交付前必须跑：audit.mjs + screenshot.mjs + contrast_check.py（见 SKILL.md）。
 */

import { mkdir, writeFile, readFile } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { createServer } from 'node:http';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { stackFiles } from './lib/stacks.mjs';
import { resolvePython } from './lib/common.mjs';

const argv = process.argv.slice(2);
const has = (k) => argv.includes(`--${k}`);
const arg = (k, d = null) => {
  const i = argv.indexOf(`--${k}`);
  return i >= 0 && argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[i + 1] : d;
};

if (has('help') || has('h')) {
  console.log(`scaffold.mjs —— 从 0 生成前端骨架

  --persona rational|editorial|warm|print|magazine   人格预设（默认 rational）
  --out <dir>                         输出目录（默认 ui-scaffold）
  --pages landing,catalog,app,form,auth,states,mobile,mobile-wizard,mobile-pager,mobile-native,product,cart,checkout,orders,order
                                      要生成哪些页面（默认 landing,app）
  --stack html|react|vue|all          额外生成哪个框架版本（默认 html，只出静态页）
  --accent <hue 0-360>                覆盖品牌色相
  --no-dark                           不生成 .dark 令牌块（默认生成，主题开关才有效）
  --name <字符串>                      产品名（默认「示例产品」）
  --ref-url <URL>                     先跑 probe-ref 量这个站，按实测值覆盖人格字段
  --ref-json <path>                   直接用已有的 probe-ref JSON，不再跑一次
  --verify                            生成后自动起服务跑 audit + contrast，失败退出码非 0
  --export tailwind,antd,element      额外导出令牌到别的体系
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
const P = { ...PERSONAS[personaKey] };
if (!P || !PERSONAS[personaKey]) {
  console.error(`未知人格：${personaKey}（可选：${Object.keys(PERSONAS).join(' / ')}）`);
  process.exit(2);
}
let accentHue = Number(arg('accent', P.accentHue));
const outDir = path.resolve(arg('out', 'ui-scaffold'));
const pages = (arg('pages', 'landing,app') || '').split(',').map((s) => s.trim()).filter(Boolean);
const withDark = has('no-dark') ? false : true; // 默认带深色令牌：主题开关不该是死按钮
const quiet = has('quiet');
const NAME = arg('name', '示例产品');
const refUrl = arg('ref-url');
const refJsonPath = arg('ref-json');

/* -------------------------------------------------- --ref-url / --ref-json
   照着某个站做：跑 probe-ref（或读已有 JSON），把实测值盖到人格字段上。
   只覆盖有明确对应关系的字段；探针拿不到的（字重、字距、动效）保留人格默认。
   设计原则：逼近 80%，剩下 20% 让用户改 tokens.css，不要在这里追求完美映射。 */
function hexToHue(hex) {
  if (!hex || hex.length < 7) return null;
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const d = max - min;
  if (d < 0.04) return null; // 接近灰，没有色相
  const l = (max + min) / 2;
  if (l < 0.08 || l > 0.94) return null; // 接近黑或白
  let h;
  if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) * 60;
  else if (max === g) h = ((b - r) / d + 2) * 60;
  else h = ((r - g) / d + 4) * 60;
  return Math.round(h);
}
function hexSat(hex) {
  if (!hex || hex.length < 7) return 0;
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const l = (max + min) / 2;
  const d = max - min;
  return d === 0 ? 0 : Math.round((d / (1 - Math.abs(2 * l - 1))) * 100);
}
function median(nums) {
  const a = nums.filter((n) => Number.isFinite(n)).sort((x, y) => x - y);
  return a.length ? a[Math.floor(a.length / 2)] : null;
}

async function loadRef() {
  if (refJsonPath) {
    return JSON.parse(await readFile(path.resolve(refJsonPath), 'utf8'));
  }
  if (!refUrl) return null;
  const HERE = path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'));
  const probe = path.join(HERE, 'probe-ref.mjs');
  if (!existsSync(probe)) {
    console.error('找不到 probe-ref.mjs（应在 ' + probe + '）');
    process.exit(2);
  }
  const tmpDir = path.join(outDir, '.ref');
  await mkdir(tmpDir, { recursive: true });
  const name = 'ref';
  if (!quiet) console.log(`· 先跑探针：${refUrl}`);
  const r = await new Promise((res) => {
    const ch = spawn(process.execPath, [probe, '--url', refUrl, '--out', tmpDir, '--name', name, '--no-shot', '--brief'], { stdio: ['ignore', 'pipe', 'pipe'] });
    let out = '';
    ch.stdout.on('data', (d) => { out += d; });
    ch.stderr.on('data', (d) => { out += d; });
    ch.on('close', (code) => res({ code, out }));
  });
  if (r.code !== 0) {
    console.error('probe-ref 失败：' + r.out.split('\n').slice(0, 4).join(' / '));
    process.exit(1);
  }
  return JSON.parse(await readFile(path.join(tmpDir, name + '.json'), 'utf8'));
}

const ref = await loadRef();
if (ref) {
  const applied = [];
  // 品牌色：从背景色里挑饱和度最高、不是中性灰的那个
  const bgCandidates = (ref.bgColors || [])
    .map(([hex]) => ({ hex, hue: hexToHue(hex), sat: hexSat(hex) }))
    .filter((c) => c.hue !== null && c.sat >= 30);
  if (bgCandidates.length && !arg('accent')) {
    bgCandidates.sort((a, b) => b.sat - a.sat);
    accentHue = bgCandidates[0].hue;
    applied.push(`brand hue=${accentHue}（from ${bgCandidates[0].hex}）`);
  }
  // 底色三件套
  if (ref.bodyBg && !arg('accent')) { P.bg = ref.bodyBg; applied.push(`bg=${ref.bodyBg}`); }
  if (ref.bodyText) { P.ink = ref.bodyText; applied.push(`ink=${ref.bodyText}`); }
  const surfCand = (ref.bgColors || []).filter(([hex]) => hex !== ref.bodyBg && hexToHue(hex) === null).slice(1, 2)[0];
  if (surfCand) { P.surface = surfCand[0]; }
  // 字阶：body 对齐 base，h1 对齐 3xl/4xl（看人格），其他按比例
  const bodySize = ref.metrics?.p?.size;
  const h1Size = ref.metrics?.h1?.size;
  const h2Size = ref.metrics?.h2?.size;
  const h3Size = ref.metrics?.h3?.size;
  if (bodySize && bodySize >= 12 && bodySize <= 18) {
    P.type = { ...P.type, base: bodySize };
    applied.push(`type.base=${bodySize}`);
  }
  if (h1Size && h1Size >= 24 && h1Size <= 96) {
    // 大标题：营销人格写到 4xl，管理端写到 3xl
    const headKey = P.type['4xl'] >= 40 ? '4xl' : '3xl';
    P.type = { ...P.type, [headKey]: h1Size };
    applied.push(`type.${headKey}=${h1Size}`);
  }
  if (h2Size) P.type = { ...P.type, '2xl': h2Size };
  if (h3Size) P.type = { ...P.type, xl: h3Size };
  // 圆角：取中位数贴到 md，xs/sm/lg 按比例
  const rads = (ref.radius || []).map(([v]) => parseFloat(v)).filter((n) => Number.isFinite(n) && n > 0 && n < 100);
  const rMed = median(rads);
  if (rMed) {
    P.radius = { ...P.radius, md: Math.round(rMed), sm: Math.max(2, Math.round(rMed * 0.6)), lg: Math.round(rMed * 1.5) };
    applied.push(`radius.md=${Math.round(rMed)}`);
  }
  // 控件高度：中位数
  const ctlMed = median(ref.controlHeights || []);
  if (ctlMed && ctlMed >= 24 && ctlMed <= 64) {
    P.control = Math.round(ctlMed);
    P.controlSm = Math.max(24, Math.round(ctlMed * 0.8));
    applied.push(`control=${P.control}px`);
  }
  // 密度：按控件高度 + 表格行高推断
  const rowMed = median(ref.tableRowHeights || []);
  if (rowMed) {
    if (rowMed < 44) P.density = 'compact';
    else if (rowMed > 60) P.density = 'comfortable';
    else P.density = 'regular';
  }
  // 间距基数：从 gaps 里挑出现频次最高的偶数
  const gaps = (ref.gaps || []).map(([v]) => parseFloat(v)).filter((n) => Number.isFinite(n) && n >= 2 && n <= 32);
  if (gaps.length) {
    const evens = gaps.filter((n) => n % 2 === 0);
    const base = evens.length ? median(evens) : median(gaps);
    if (base >= 2 && base <= 16) {
      P.spaceStep = Math.max(2, Math.round(base / 2) * 2);
      applied.push(`spaceStep=${P.spaceStep}`);
    }
  }
  if (!quiet) console.log('· 已按实测覆盖：' + (applied.length ? applied.join('  ') : '（无可覆盖字段）'));
}

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
  // 移动端控件阶梯：28 / 36 / 44 / 52 / 60。44 是触控下限，不是「中等」。
  // 来源：Zarm 的 --za-height-xs..xl（52 个移动组件都按这一档走），
  // 桌面人格的 --control-h 往往只有 32，直接搬到 390 上会全线偏小。
  L.push('  --h-xs: 28px;');
  L.push('  --h-sm: 36px;');
  L.push('  --h-md: 44px;');
  L.push('  --h-lg: 52px;');
  L.push('  --h-xl: 60px;');
  L.push('  --tap-min: 44px;');
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

/* [hidden] 必须能压住组件自己的 display：
   .co-summary { display: flex } 这类声明特异性高于 UA 的 [hidden] { display: none }，
   不写 !important 会出现「JS 设了 hidden 但元素还在」。 */
[hidden] { display: none !important; }

html { -webkit-text-size-adjust: 100%; }

/* 安全区工具类：比在每个组件里散写 env() 更可控。
   来源：Zarm 把 SafeArea 做成独立组件（position="top|bottom"），
   这里降级成两个类，静态页不必为它多一层 DOM 组件。 */
.safe-top { padding-top: env(safe-area-inset-top, 0px); }
.safe-bottom { padding-bottom: env(safe-area-inset-bottom, 0px); }
.safe-x {
  padding-left: env(safe-area-inset-left, 0px);
  padding-right: env(safe-area-inset-right, 0px);
}

/* 真 1px 发丝线：DPR 2/3 下用 200%/300% 宽高 + scale 压回 1 物理像素。
   直接写 border: 1px 在 3x 屏上是 3 物理像素，看起来比设计稿粗一倍。
   用法：<div class="hairline hairline--bottom">，或在自己的选择器上 @extend 这套属性。 */
.hairline { position: relative; }
.hairline::after {
  content: '';
  position: absolute;
  inset: 0;
  pointer-events: none;
  border: 0 solid var(--border);
  border-radius: inherit;
}
.hairline--top::after { border-top-width: 1px; }
.hairline--bottom::after { border-bottom-width: 1px; }
.hairline--left::after { border-left-width: 1px; }
.hairline--right::after { border-right-width: 1px; }
.hairline--all::after { border-width: 1px; }
@media (-webkit-min-device-pixel-ratio: 2), (min-resolution: 2dppx) {
  .hairline::after {
    inset: auto;
    left: 0;
    top: 0;
    width: 200%;
    height: 200%;
    transform: scale(0.5);
    transform-origin: 0 0;
    border-radius: calc(var(--r-md) * 2);
  }
}
@media (-webkit-min-device-pixel-ratio: 3), (min-resolution: 3dppx) {
  .hairline::after {
    width: 300%;
    height: 300%;
    transform: scale(0.3333);
    border-radius: calc(var(--r-md) * 3);
  }
}

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
.btn:focus-visible {
  outline: 2px solid var(--brand);
  outline-offset: 2px;
}
.btn:active {
  transform: translateY(1px);
  box-shadow: var(--hairline);
}
.btn[disabled], .btn[aria-disabled="true"] {
  opacity: .45;
  cursor: not-allowed;
  pointer-events: none;
  transform: none;
  box-shadow: var(--hairline);
}
.btn[aria-busy="true"] { pointer-events: none; opacity: .8; position: relative; }
.btn[aria-busy="true"]::after {
  content: '';
  position: absolute;
  width: 14px; height: 14px;
  border: 2px solid currentColor;
  border-top-color: transparent;
  border-radius: 50%;
  animation: spin .8s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }

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

.check { display: flex; align-items: center; gap: var(--s-2); font-size: var(--t-base); cursor: pointer; }
.check input { width: 16px; height: 16px; accent-color: var(--brand); cursor: inherit; }
.check input:focus-visible { outline: 2px solid var(--brand); outline-offset: 2px; }
.check:has(input:disabled) { cursor: not-allowed; opacity: .55; }
.check input:disabled { accent-color: var(--ink-4); }

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
.table tbody tr:focus-within { outline: 2px solid var(--brand); outline-offset: -2px; }
.table tbody tr[aria-selected="true"] {
  background: color-mix(in srgb, var(--brand) 8%, var(--bg));
}
.table tbody tr[aria-selected="true"]:hover {
  background: color-mix(in srgb, var(--brand) 12%, var(--bg));
}
.table tbody tr[aria-disabled="true"] {
  color: var(--ink-4);
  opacity: .6;
}
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
.tab:hover:not(:disabled) { color: var(--ink); }
.tab:focus-visible {
  outline: 2px solid var(--brand);
  outline-offset: -2px;
  border-radius: var(--r-xs) var(--r-xs) 0 0;
}
.tab[aria-selected="true"] { color: var(--ink); border-bottom-color: var(--brand); }
.tab:disabled, .tab[aria-disabled="true"] {
  color: var(--ink-4);
  cursor: not-allowed;
  opacity: .55;
}

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
/* 原生 <dialog> 走 showModal() 时只有 [open]，不会带 .is-open —— 少了这条会「打开了但看不见」 */
.modal[open] { display: grid; }
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
.nav-item:hover:not([aria-disabled="true"]) { background: var(--surface-hover); color: var(--ink); }
.nav-item:focus-visible {
  outline: 2px solid var(--brand);
  outline-offset: -2px;
}
.nav-item { white-space: nowrap; flex: 0 0 auto; }
.nav-item[aria-current="page"] {
  background: var(--raised);
  color: var(--ink);
  box-shadow: inset 3px 0 0 var(--brand), var(--hairline);
}
.nav-item[aria-disabled="true"] {
  color: var(--ink-4);
  cursor: not-allowed;
  opacity: .55;
  pointer-events: none;
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
.cat__pill:hover:not(:disabled):not([aria-disabled="true"]) { border-color: var(--ink-4); color: var(--ink); }
.cat__pill:focus-visible { outline: 2px solid var(--brand); outline-offset: 2px; }
.cat__pill[aria-current="true"] { background: var(--ink); border-color: var(--ink); color: var(--bg); }
.cat__pill:disabled, .cat__pill[aria-disabled="true"] {
  color: var(--ink-4);
  cursor: not-allowed;
  opacity: .55;
  border-color: var(--border);
}
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
.cat__card:hover:not([aria-disabled="true"]) .cat__thumb,
.cat__card:focus-within:not([aria-disabled="true"]) .cat__thumb {
  box-shadow: var(--card-shadow-hover);
  translate: var(--card-hx) var(--card-hy);
}
.cat__card:focus-visible { outline: 2px solid var(--brand); outline-offset: 2px; border-radius: var(--r-md); }
.cat__card:active:not([aria-disabled="true"]) .cat__thumb {
  box-shadow: var(--card-shadow-active);
  translate: 0 var(--card-press);
  transition-duration: var(--dur-1);
}
.cat__card[aria-disabled="true"] {
  opacity: .55;
  cursor: not-allowed;
  pointer-events: none;
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
`;
/* ------------------------------------------------------------------ mobile.css */

const mobileCss = `/* mobile.css —— 390 单列壳：安全区 / 底部 tab / 原生 dialog 底部面板
   只在 mobile.html 引入；桌面宽度下居中成 430 预览列，不改变其他页面。 */

.m-shell {
  display: grid;
  grid-template-rows: auto 1fr auto;
  min-height: 100dvh;
  max-width: 430px;
  margin-inline: auto;
  background: var(--bg);
  border-inline: 1px solid var(--border);
}
@media (max-width: 430px) {
  .m-shell { border-inline: 0; }
}

.m-head {
  position: sticky;
  top: 0;
  z-index: 20;
  display: flex;
  align-items: center;
  gap: var(--s-2);
  padding: var(--s-2) var(--s-2) var(--s-2) var(--s-4);
  padding-top: max(var(--s-2), env(safe-area-inset-top));
  background: color-mix(in srgb, var(--bg) 88%, transparent);
  backdrop-filter: blur(12px);
  border-bottom: 1px solid var(--border);
}
.m-head__title { font-size: var(--t-lg); font-weight: var(--fw-head); letter-spacing: var(--track-head); }
.m-head__sub { font-size: var(--t-xs); color: var(--ink-2); }
.m-head__spacer { flex: 1; }
.m-icon-btn {
  width: 44px;
  height: 44px;
  display: inline-grid;
  place-items: center;
  border: 0;
  border-radius: var(--r-sm);
  background: transparent;
  color: var(--ink-2);
}
.m-icon-btn:hover { background: var(--surface-hover); color: var(--ink); }
.m-icon-btn svg { width: 22px; height: 22px; }

.m-main {
  display: grid;
  align-content: start;
  gap: var(--s-4);
  padding: var(--s-4) var(--s-4) var(--s-6);
}

.m-kpis { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: var(--s-2); }
.m-kpi { padding: var(--s-3); background: var(--surface); border: 1px solid var(--border); border-radius: var(--r-md); }
.m-kpi__label { font-size: var(--t-xs); color: var(--ink-2); }
.m-kpi__value { margin-top: 2px; font-size: var(--t-lg); font-weight: var(--fw-head); }

.m-pills {
  display: flex;
  gap: var(--s-2);
  overflow-x: auto;
  scrollbar-width: none;
}
.m-pills::-webkit-scrollbar { display: none; }
.m-pill {
  flex: none;
  min-height: 44px;
  padding: 0 var(--s-4);
  display: inline-flex;
  align-items: center;
  gap: var(--s-1);
  border: 1px solid var(--border);
  border-radius: 999px;
  background: var(--bg);
  color: var(--ink-2);
  font-size: var(--t-sm);
  font-family: inherit;
  cursor: pointer;
}
.m-pill:hover { color: var(--ink); border-color: color-mix(in srgb, var(--ink) 28%, transparent); }
.m-pill[aria-pressed="true"] { background: var(--ink); border-color: var(--ink); color: var(--bg); }
.m-pill__count { opacity: .66; font-variant-numeric: tabular-nums; }

.m-search {
  display: flex;
  align-items: center;
  gap: var(--s-2);
  height: 46px; /* 1px 边框 ×2 后，内部输入仍是 44 触控高度 */
  padding: 0 var(--s-3);
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--r-md);
  color: var(--ink-2);
}
.m-search:focus-within { border-color: var(--brand); box-shadow: 0 0 0 2px color-mix(in srgb, var(--brand) 24%, transparent); }
.m-search__icon svg { width: 18px; height: 18px; }
.m-search input { flex: 1; min-width: 0; height: 100%; border: 0; background: transparent; font-size: var(--t-sm); color: var(--ink); }
.m-search input:focus-visible { outline: none; }
.m-count { color: var(--ink-2); }
.m-empty { padding: var(--s-5) 0; text-align: center; font-size: var(--t-sm); color: var(--ink-2); }

.m-list { display: grid; gap: var(--s-3); }
.m-item {
  display: grid;
  grid-template-columns: 40px minmax(0, 1fr) auto;
  gap: var(--s-3);
  align-items: start;
  min-height: 72px;
  padding: var(--s-3);
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--r-md);
  color: inherit;
  text-decoration: none;
}
.m-item:hover { border-color: color-mix(in srgb, var(--ink) 22%, transparent); }
.m-item:active { translate: 0 1px; }
.m-avatar {
  width: 40px;
  height: 40px;
  display: grid;
  place-items: center;
  border-radius: 50%;
  background: var(--brand-50);
  color: var(--brand-ink);
  font-size: var(--t-sm);
  font-weight: var(--fw-ui);
}
.m-item__title {
  font-size: var(--t-base);
  font-weight: var(--fw-ui);
  line-height: 1.4;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.m-item__meta { margin-top: 2px; font-size: var(--t-xs); color: var(--ink-2); }
.m-item__side { display: grid; justify-items: end; gap: var(--s-1); }
.m-end { padding: var(--s-2) 0 var(--s-4); text-align: center; font-size: var(--t-xs); color: var(--ink-2); }

.m-tabbar {
  position: sticky;
  bottom: 0;
  z-index: 30;
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  background: color-mix(in srgb, var(--bg) 94%, transparent);
  backdrop-filter: blur(12px);
  border-top: 1px solid var(--border);
  padding-bottom: env(safe-area-inset-bottom);
}
.m-tab {
  min-height: 56px;
  display: grid;
  place-items: center;
  align-content: center;
  gap: 2px;
  color: var(--ink-3);
  font-size: var(--t-xs);
  text-decoration: none;
}
.m-tab svg { width: 22px; height: 22px; }
.m-tab:hover { color: var(--ink); }
.m-tab[aria-current="page"] { color: var(--brand-ink); }


/* 底部面板用原生 <dialog>：Esc、焦点陷阱、::backdrop 都由浏览器给 */
.m-sheet {
  width: min(430px, 100%);
  margin: auto auto 0;
  padding: 0;
  border: 0;
  border-radius: var(--r-lg) var(--r-lg) 0 0;
  background: var(--raised);
  color: var(--ink);
}
.m-sheet::backdrop { background: rgb(0 0 0 / .42); }
.m-sheet__grip { width: 36px; height: 4px; margin: var(--s-2) auto; border-radius: 999px; background: var(--border); }
.m-sheet__body { display: grid; gap: var(--s-3); padding: 0 var(--s-4) calc(var(--s-5) + env(safe-area-inset-bottom)); }
.m-sheet__title { font-size: var(--t-lg); font-weight: var(--fw-head); }
.m-sheet__actions { display: grid; grid-template-columns: 1fr 1fr; gap: var(--s-2); margin-top: var(--s-2); }

/* ================= 形态二：多步向导（mobile-wizard.html） =================
   三步封顶。步数超过 4 就该换成「一屏一组 + 保存草稿」，不是继续加步骤条。 */
.m-wiz {
  display: grid;
  /* 单列必须 minmax(0,1fr)：auto 会按内容撑宽，超长文本把整页顶出视口 */
  grid-template-columns: minmax(0, 1fr);
  grid-template-rows: auto auto 1fr auto;
  min-height: 100dvh;
  max-width: 430px;
  margin-inline: auto;
  background: var(--bg);
  border-inline: 1px solid var(--border);
}
@media (max-width: 430px) { .m-wiz { border-inline: 0; } }

.m-wiz__bar {
  display: flex;
  align-items: center;
  gap: var(--s-3);
  padding: var(--s-2) var(--s-4);
  padding-top: max(var(--s-2), env(safe-area-inset-top));
  border-bottom: 1px solid var(--border);
}
.m-wiz__bar-title { font-size: var(--t-base); font-weight: var(--fw-ui); }
.m-wiz__count {
  margin-inline-start: auto;
  font-size: var(--t-sm);
  color: var(--ink-2);
  font-variant-numeric: tabular-nums;
}
.m-wiz__track { height: 4px; background: var(--border); }
.m-wiz__fill {
  display: block;
  height: 100%;
  width: 33.333%;
  background: var(--brand-fill);
  transition: width var(--dur-base) var(--ease);
}

.m-wiz__body {
  display: grid;
  gap: var(--s-4);
  align-content: start;
  padding: var(--s-5) var(--s-4) var(--s-6);
}
.m-wiz__panel { display: grid; gap: var(--s-4); }
.m-wiz__title { font-size: var(--t-xl); line-height: var(--lh-xl); font-weight: var(--fw-head); }
.m-wiz__lede { font-size: var(--t-sm); line-height: var(--lh-base); color: var(--ink-2); }
.m-wiz__sum { display: grid; gap: var(--s-2); padding: var(--s-4); border: 1px solid var(--border); border-radius: var(--r-md); background: var(--surface); }
.m-wiz__sum-row { display: flex; justify-content: space-between; gap: var(--s-3); font-size: var(--t-sm); color: var(--ink-2); }
.m-wiz__sum-row strong { color: var(--ink); font-weight: var(--fw-ui); }

.m-wiz__foot {
  position: sticky;
  bottom: 0;
  display: grid;
  grid-template-columns: 1fr 1.5fr;
  gap: var(--s-3);
  padding: var(--s-3) var(--s-4) calc(var(--s-3) + env(safe-area-inset-bottom));
  background: var(--bg);
  border-top: 1px solid var(--border);
}
.m-wiz__foot .btn { min-height: 44px; }

/* ================= 形态三：横向滑动分栏（mobile-pager.html） =================
   scroll-snap 做分栏。键盘左右键必须也能翻——只靠手势等于把键盘用户排除。 */
.m-pager {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  grid-template-rows: auto 1fr auto;
  min-height: 100dvh;
  max-width: 430px;
  margin-inline: auto;
  background: var(--bg);
  border-inline: 1px solid var(--border);
  overflow: hidden;
}
@media (max-width: 430px) { .m-pager { border-inline: 0; } }

.m-pager__track {
  display: flex;
  overflow-x: auto;
  scroll-snap-type: x mandatory;
  overscroll-behavior-x: contain;
  scrollbar-width: none;
}
.m-pager__track::-webkit-scrollbar { display: none; }
.m-pager__track:focus-visible { outline: 2px solid var(--brand); outline-offset: -2px; }

.m-pager__slide {
  flex: 0 0 100%;
  min-width: 0;
  scroll-snap-align: start;
  scroll-snap-stop: always;
  display: grid;
  gap: var(--s-4);
  align-content: start;
  padding: var(--s-5) var(--s-4) var(--s-6);
}
.m-pager__art {
  aspect-ratio: 4 / 3;
  border: 1px solid var(--border);
  border-radius: var(--r-lg);
  background:
    radial-gradient(120% 120% at 25% 15%, color-mix(in srgb, var(--brand) 16%, transparent), transparent 70%),
    linear-gradient(160deg, color-mix(in srgb, var(--brand) 8%, var(--surface)), var(--surface));
}
.m-pager__title { font-size: var(--t-xl); line-height: var(--lh-xl); font-weight: var(--fw-head); }
.m-pager__lede { font-size: var(--t-sm); line-height: var(--lh-base); color: var(--ink-2); }
.m-pager__list { display: grid; gap: var(--s-2); margin: 0; padding: 0; list-style: none; }
.m-pager__list li {
  display: flex;
  gap: var(--s-2);
  align-items: flex-start;
  font-size: var(--t-sm);
  color: var(--ink-2);
}
.m-pager__list li::before {
  content: '';
  flex: 0 0 auto;
  width: 6px;
  height: 6px;
  margin-top: 7px;
  border-radius: 999px;
  background: var(--brand-fill);
}

.m-pager__dots {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: var(--s-1);
  padding: var(--s-2) 0 calc(var(--s-2) + env(safe-area-inset-bottom));
  border-top: 1px solid var(--border);
}
/* 圆点本体 8px，但按钮盒子 44×44——命中区不够的圆点在 390 上点不中 */
.m-pager__dot {
  width: 44px;
  height: 44px;
  display: grid;
  place-items: center;
  padding: 0;
  border: 0;
  background: transparent;
  cursor: pointer;
}
.m-pager__dot::before {
  content: '';
  width: 8px;
  height: 8px;
  border-radius: 999px;
  background: var(--border);
  transition: width var(--dur-base) var(--ease), background var(--dur-base) var(--ease);
}
.m-pager__dot[aria-current="true"]::before { width: 22px; background: var(--brand-fill); }

/* ================= 形态四：原生壳桥接（mobile-native.html） =================
   容器页跑在 WebView 里：顶部是原生标题栏（这里只留安全区与占位），
   底部操作条必须让出 home indicator，且 JS 要通过约定的 bridge 与原生通信。 */
.m-native {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  grid-template-rows: auto 1fr auto;
  min-height: 100dvh;
  max-width: 430px;
  margin-inline: auto;
  background: var(--bg);
  border-inline: 1px solid var(--border);
}
@media (max-width: 430px) { .m-native { border-inline: 0; } }

/* 原生标题栏占位：真机上这段由 native 绘制，WebView 只负责让位 */
.m-native__chrome {
  display: flex;
  align-items: center;
  gap: var(--s-2);
  min-height: 44px;
  padding: env(safe-area-inset-top) var(--s-4) 0;
  background: var(--surface);
  border-bottom: 1px solid var(--border);
  font-size: var(--t-sm);
  color: var(--ink-2);
}
.m-native__chrome-title { font-size: var(--t-base); font-weight: var(--fw-ui); color: var(--ink); }
.m-native__badge {
  margin-inline-start: auto;
  display: inline-flex;
  align-items: center;
  gap: var(--s-1);
  padding: 2px var(--s-2);
  border-radius: 999px;
  background: var(--surface-hover);
  font-size: var(--t-xs);
}

.m-native__body {
  display: grid;
  gap: var(--s-4);
  align-content: start;
  padding: var(--s-4);
}
.m-native__card {
  display: grid;
  gap: var(--s-2);
  padding: var(--s-4);
  border: 1px solid var(--border);
  border-radius: var(--r-lg);
  background: var(--raised);
}
.m-native__card h2 { font-size: var(--t-base); font-weight: var(--fw-ui); }
.m-native__card p { font-size: var(--t-sm); line-height: var(--lh-base); color: var(--ink-2); }
.m-native__kv { display: grid; grid-template-columns: 96px 1fr; gap: var(--s-2) var(--s-3); font-size: var(--t-sm); }
.m-native__kv dt { color: var(--ink-3); }
.m-native__kv dd { margin: 0; color: var(--ink); }

.m-native__bar {
  position: sticky;
  bottom: 0;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--s-3);
  padding: var(--s-3) var(--s-4) calc(var(--s-3) + env(safe-area-inset-bottom));
  background: var(--bg);
  border-top: 1px solid var(--border);
}
.m-native__bar .btn { min-height: 44px; }
`;

const head = (title, extra = '') => `<!doctype html>
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
const mobileHtml = head('工单', '<link rel="stylesheet" href="mobile.css">\n')
  + shellNote(['app-bar', 'kpis', 'segmented-filter', 'list', 'fab', 'sheet', 'tabbar'])
  + `<div class="m-shell">
  <header class="m-head">
    <div>
      <h1 class="m-head__title">工单</h1>
      <p class="m-head__sub">12 条待处理 · 今天</p>
    </div>
    <div class="m-head__spacer"></div>
    <button class="m-icon-btn" type="button" aria-label="新建工单" onclick="document.getElementById('new-ticket').showModal()">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M12 5v14M5 12h14"></path></svg>
    </button>
    <button class="m-icon-btn" type="button" aria-label="搜索工单">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><circle cx="11" cy="11" r="7"></circle><path d="m20 20-3.5-3.5"></path></svg>
    </button>
    <button class="m-icon-btn" type="button" data-theme-toggle aria-label="切换主题"><span aria-hidden="true" data-icon>◐</span></button>
  </header>

  <main class="m-main" id="main">
    <section class="m-kpis" aria-label="今日概览">
      <div class="m-kpi"><div class="m-kpi__label">待处理</div><div class="m-kpi__value num">12</div></div>
      <div class="m-kpi"><div class="m-kpi__label">今日完成</div><div class="m-kpi__value num">28</div></div>
      <div class="m-kpi"><div class="m-kpi__label">平均响应</div><div class="m-kpi__value num">1.8h</div></div>
    </section>

    <label class="m-search">
      <span class="m-search__icon" aria-hidden="true">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="11" cy="11" r="7"></circle><path d="m20 20-3.5-3.5"></path></svg>
      </span>
      <input type="search" data-search placeholder="搜索标题或工单号" aria-label="搜索工单">
    </label>

    <div class="m-pills" role="group" aria-label="按状态筛选">
      <button class="m-pill" type="button" data-filter="all" aria-pressed="true">全部 <span class="m-pill__count">5</span></button>
      <button class="m-pill" type="button" data-filter="todo" aria-pressed="false">待处理 <span class="m-pill__count">1</span></button>
      <button class="m-pill" type="button" data-filter="doing" aria-pressed="false">进行中 <span class="m-pill__count">2</span></button>
      <button class="m-pill" type="button" data-filter="done" aria-pressed="false">已完成 <span class="m-pill__count">2</span></button>
    </div>

    <p class="m-count tiny">共 <span data-count>5</span> 条</p>

    <div class="m-list" data-filter-list>
      <a class="m-item" href="./app.html" data-status="doing">
        <span class="m-avatar" aria-hidden="true">张</span>
        <span>
          <span class="m-item__title">导出报表时超时，重试三次都失败</span>
          <span class="m-item__meta">#10231 · 2 分钟前</span>
        </span>
        <span class="m-item__side"><span class="tag tag--warn"><span class="dot"></span>进行中</span></span>
      </a>
      <a class="m-item" href="./app.html" data-status="todo">
        <span class="m-avatar" aria-hidden="true">李</span>
        <span>
          <span class="m-item__title">邀请成员收不到邮件</span>
          <span class="m-item__meta">#10230 · 18 分钟前</span>
        </span>
        <span class="m-item__side"><span class="tag tag--danger"><span class="dot"></span>待处理</span></span>
      </a>
      <a class="m-item" href="./app.html" data-status="done">
        <span class="m-avatar" aria-hidden="true">王</span>
        <span>
          <span class="m-item__title">账单地址无法修改</span>
          <span class="m-item__meta">#10229 · 1 小时前</span>
        </span>
        <span class="m-item__side"><span class="tag tag--ok"><span class="dot"></span>已完成</span></span>
      </a>
      <a class="m-item" href="./app.html" data-status="doing">
        <span class="m-avatar" aria-hidden="true">赵</span>
        <span>
          <span class="m-item__title">API 返回 429，需要提高限流阈值</span>
          <span class="m-item__meta">#10228 · 3 小时前</span>
        </span>
        <span class="m-item__side"><span class="tag tag--warn"><span class="dot"></span>进行中</span></span>
      </a>
      <a class="m-item" href="./app.html" data-status="done">
        <span class="m-avatar" aria-hidden="true">陈</span>
        <span>
          <span class="m-item__title">希望支持批量删除</span>
          <span class="m-item__meta">#10227 · 昨天</span>
        </span>
        <span class="m-item__side"><span class="tag"><span class="dot"></span>已归档</span></span>
      </a>
    </div>
    <p class="m-empty" data-empty hidden>没有匹配的工单，换个筛选或关键词。</p>
    <p class="m-end">没有更多了</p>
  </main>

  <nav class="m-tabbar" aria-label="底部导航">
    <a class="m-tab" href="./index.html">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-5v-6H10v6H5a1 1 0 0 1-1-1z"></path></svg>
      首页
    </a>
    <a class="m-tab" href="./mobile.html" aria-current="page">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M4 6h16M4 12h16M4 18h10"></path></svg>
      工单
    </a>
    <a class="m-tab" href="./states.html">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M20 15a3 3 0 0 1-3 3H8l-4 3V6a3 3 0 0 1 3-3h10a3 3 0 0 1 3 3z"></path></svg>
      消息
    </a>
    <a class="m-tab" href="./auth.html">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><circle cx="12" cy="8" r="3.5"></circle><path d="M5 20a7 7 0 0 1 14 0"></path></svg>
      我的
    </a>
  </nav>
</div>


<dialog class="m-sheet" id="new-ticket" aria-labelledby="new-ticket-title">
  <div class="m-sheet__grip" aria-hidden="true"></div>
  <form method="dialog" class="m-sheet__body">
    <h2 class="m-sheet__title" id="new-ticket-title">新建工单</h2>
    <div class="field">
      <label class="label" for="m-title">标题<span class="req" aria-hidden="true">*</span></label>
      <input class="input" id="m-title" name="title" required autofocus placeholder="一句话说清问题">
    </div>
    <div class="field">
      <label class="label" for="m-priority">优先级</label>
      <select class="select" id="m-priority" name="priority">
        <option>普通</option>
        <option>紧急</option>
        <option>低</option>
      </select>
    </div>
    <p class="tiny">{{TODO: 提交后接真实接口，并给出成功提示}}</p>
    <div class="m-sheet__actions">
      <button class="btn btn--secondary" value="cancel" formnovalidate>取消</button>
      <button class="btn btn--primary" value="create">创建</button>
    </div>
  </form>
</dialog>
` + tail();
/* ------------------------------------------- 移动端另三种形态：wizard / pager / native */

const mHead = (title) => head(title, '<link rel="stylesheet" href="mobile.css">\n');

const mobileWizardHtml = mHead('新建 · 向导') + shellNote(['wizard-bar', 'progress', 'step-panels', 'summary', 'sticky-foot']) + `
<div class="m-wiz" data-wiz>
  <div class="m-wiz__bar">
    <a class="m-icon-btn" href="./mobile.html" aria-label="返回工单列表">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="m15 5-7 7 7 7"></path></svg>
    </a>
    <span class="m-wiz__bar-title">新建工单</span>
    <span class="m-wiz__count" data-wiz-count aria-live="polite">第 1 步 / 共 3 步</span>
  </div>
  <div class="m-wiz__track" role="progressbar" aria-valuemin="1" aria-valuemax="3" aria-valuenow="1" aria-label="填写进度" data-wiz-bar>
    <span class="m-wiz__fill" data-wiz-fill></span>
  </div>

  <main class="m-wiz__body" id="main">
    <!-- 第 1 步 -->
    <section class="m-wiz__panel" data-wiz-panel="1" aria-labelledby="wiz-t1">
      <h1 class="m-wiz__title" id="wiz-t1">先说清楚是什么问题</h1>
      <p class="m-wiz__lede">标题一句话，描述给复现步骤。这一步决定工单会被分给谁。</p>
      <div class="field">
        <label class="label" for="wiz-title">标题<span class="req" aria-hidden="true">*</span></label>
        <input class="input" id="wiz-title" name="title" required placeholder="例如：导出 CSV 时中文变成问号" data-wiz-required>
        <p class="error-text" data-wiz-error="wiz-title" hidden>请填写标题</p>
      </div>
      <div class="field">
        <label class="label" for="wiz-desc">描述</label>
        <textarea class="input" id="wiz-desc" name="desc" rows="4" placeholder="复现步骤 / 期望结果 / 实际结果"></textarea>
      </div>
      <div class="field">
        <label class="label" for="wiz-priority">优先级</label>
        <select class="select" id="wiz-priority" name="priority">
          <option>普通</option>
          <option>紧急</option>
          <option>低</option>
        </select>
      </div>
    </section>

    <!-- 第 2 步 -->
    <section class="m-wiz__panel" data-wiz-panel="2" aria-labelledby="wiz-t2" hidden>
      <h1 class="m-wiz__title" id="wiz-t2">什么时候、在哪台设备上</h1>
      <p class="m-wiz__lede">时间与设备决定了能不能复现。填不准比不填更糟。</p>
      <div class="field">
        <label class="label" for="wiz-when">发生时间<span class="req" aria-hidden="true">*</span></label>
        <input class="input" id="wiz-when" name="when" type="datetime-local" required data-wiz-required>
        <p class="error-text" data-wiz-error="wiz-when" hidden>请选择发生时间</p>
      </div>
      <div class="field">
        <label class="label" for="wiz-device">设备</label>
        <select class="select" id="wiz-device" name="device">
          <option>iPhone · Safari</option>
          <option>Android · Chrome</option>
          <option>桌面 · Chrome</option>
        </select>
      </div>
      <div class="field">
        <label class="label" for="wiz-version">版本号</label>
        <input class="input" id="wiz-version" name="version" placeholder="设置 → 关于 里的版本">
      </div>
    </section>

    <!-- 第 3 步 -->
    <section class="m-wiz__panel" data-wiz-panel="3" aria-labelledby="wiz-t3" hidden>
      <h1 class="m-wiz__title" id="wiz-t3">确认后提交</h1>
      <p class="m-wiz__lede">提交后可以继续补充，但标题与时间不可改。</p>
      <div class="m-wiz__sum">
        <div class="m-wiz__sum-row"><span>标题</span><strong data-wiz-review="title">—</strong></div>
        <div class="m-wiz__sum-row"><span>发生时间</span><strong data-wiz-review="when">—</strong></div>
        <div class="m-wiz__sum-row"><span>优先级</span><strong data-wiz-review="priority">—</strong></div>
        <div class="m-wiz__sum-row"><span>设备</span><strong data-wiz-review="device">—</strong></div>
      </div>
      <label class="check">
        <input type="checkbox" name="agree" required data-wiz-required>
        <span>我确认以上信息可复现，且不含敏感数据</span>
      </label>
      <p class="error-text" data-wiz-error="agree" hidden>提交前需要勾选确认</p>
    </section>
  </main>

  <div class="m-wiz__foot">
    <button class="btn btn--secondary" type="button" data-wiz-prev disabled>上一步</button>
    <button class="btn btn--primary" type="button" data-wiz-next>下一步</button>
  </div>
</div>
` + tail();

const mobilePagerHtml = mHead('分栏') + shellNote(['pager-track', 'scroll-snap', 'slides', 'dots', 'keyboard']) + `
<div class="m-pager">
  <div class="m-wiz__bar">
    <a class="m-icon-btn" href="./mobile.html" aria-label="返回工单列表">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="m15 5-7 7 7 7"></path></svg>
    </a>
    <span class="m-wiz__bar-title">产品导览</span>
    <span class="m-wiz__count" data-pager-count aria-live="polite">1 / 3</span>
  </div>

  <main id="main">
    <!-- 横向分栏：scroll-snap 负责手势，键盘左右键由 ui.js 接住 -->
    <div class="m-pager__track" tabindex="0" role="group" aria-roledescription="轮播" aria-label="产品导览三屏，可用左右方向键切换" data-pager-track>
      <section class="m-pager__slide" role="group" aria-roledescription="幻灯片" aria-label="第 1 屏，共 3 屏">
        <div class="m-pager__art" role="img" aria-label="{{TODO: 第 1 屏配图 alt}}"></div>
        <h1 class="m-pager__title">一屏一件事</h1>
        <p class="m-pager__lede">横向分栏只适合「彼此并列、顺序无所谓」的几块内容。有先后就换向导。</p>
        <ul class="m-pager__list">
          <li>每屏一个主张，标题不超过 12 字</li>
          <li>配图统一比例，别让高度跳</li>
          <li>指示点常驻，位置在底部安全区上方</li>
        </ul>
      </section>

      <section class="m-pager__slide" role="group" aria-roledescription="幻灯片" aria-label="第 2 屏，共 3 屏">
        <div class="m-pager__art" role="img" aria-label="{{TODO: 第 2 屏配图 alt}}"></div>
        <h1 class="m-pager__title">手势之外要留键盘</h1>
        <p class="m-pager__lede">只做滑动等于把键盘用户排除在外。轨道要可聚焦，左右键要能翻。</p>
        <ul class="m-pager__list">
          <li>轨道加 <code>tabindex="0"</code> 与 <code>aria-roledescription="轮播"</code></li>
          <li>左右方向键翻页，Home / End 到首尾</li>
          <li>指示点是 44×44 的按钮，圆点只是它的内芯</li>
        </ul>
      </section>

      <section class="m-pager__slide" role="group" aria-roledescription="幻灯片" aria-label="第 3 屏，共 3 屏">
        <div class="m-pager__art" role="img" aria-label="{{TODO: 第 3 屏配图 alt}}"></div>
        <h1 class="m-pager__title">别把长文塞进来</h1>
        <p class="m-pager__lede">横滑分栏的每一屏都该是「扫一眼就懂」。超过三段就该换成纵向页面。</p>
        <ul class="m-pager__list">
          <li>单屏内容高度控制在 1.2 屏以内</li>
          <li>不嵌套横向滚动（手势会打架）</li>
          <li>首屏放最重要的一件事，不要放导航</li>
        </ul>
      </section>
    </div>
  </main>

  <div class="m-pager__dots" role="tablist" aria-label="选择分屏">
    <button class="m-pager__dot" type="button" role="tab" aria-current="true" aria-label="第 1 屏" data-pager-dot="0"></button>
    <button class="m-pager__dot" type="button" role="tab" aria-current="false" aria-label="第 2 屏" data-pager-dot="1"></button>
    <button class="m-pager__dot" type="button" role="tab" aria-current="false" aria-label="第 3 屏" data-pager-dot="2"></button>
  </div>
</div>
` + tail();

const mobileNativeHtml = mHead('原生壳') + shellNote(['native-chrome', 'safe-area', 'bridge-detect', 'webview-contract', 'bottom-bar']) + `
<!--
  原生壳桥接约定（WebView 容器页）：
  1) 原生侧注入 window.NativeBridge（Android：addJavascriptInterface；iOS：WKScriptMessageHandler）
  2) Web 侧只调 NativeBridge.postMessage(JSON.stringify({ type, payload }))，
     不直接调原生方法——方法名一改前端就崩
  3) 原生回执走 window.__nativeCallback(id, data)，Web 侧按 id 派发
  4) 没有 bridge 时必须降级：按钮照常可点，只提示「当前在浏览器里」
-->
<div class="m-native">
  <div class="m-native__chrome">
    <a class="m-icon-btn" href="./mobile.html" aria-label="返回">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="m15 5-7 7 7 7"></path></svg>
    </a>
    <span class="m-native__chrome-title">{{TODO: 原生标题栏}}</span>
    <span class="m-native__badge" data-bridge-state>检测中…</span>
  </div>

  <main class="m-native__body" id="main">
    <section class="m-native__card" aria-labelledby="nv-t1">
      <h2 id="nv-t1">安全区要让出来</h2>
      <p>顶部让 <code>env(safe-area-inset-top)</code>（刘海 / 灵动岛），底部让 <code>env(safe-area-inset-bottom)</code>（home indicator）。
        底部操作条被指示条压住是最常见的壳内事故。</p>
      <dl class="m-native__kv">
        <dt>顶部内边距</dt><dd>max(8px, safe-area-inset-top)</dd>
        <dt>底部内边距</dt><dd>12px + safe-area-inset-bottom</dd>
        <dt>视口单位</dt><dd>100dvh（不用 100vh）</dd>
      </dl>
    </section>

    <section class="m-native__card" aria-labelledby="nv-t2">
      <h2 id="nv-t2">桥接状态</h2>
      <p data-bridge-detail>正在检测 <code>window.NativeBridge</code> 与 <code>webkit.messageHandlers</code>。</p>
      <dl class="m-native__kv">
        <dt>桥对象</dt><dd data-bridge-kind>—</dd>
        <dt>回退行为</dt><dd>无桥时按钮照常可用，只提示环境</dd>
      </dl>
    </section>

    <section class="m-native__card" aria-labelledby="nv-t3">
      <h2 id="nv-t3">别在壳里做的事</h2>
      <p>壳内 WebView 与浏览器不是一回事：没有地址栏、返回手势由原生接管、Cookie 与存储可能不共享。
        以下三件在壳里最容易翻车。</p>
      <dl class="m-native__kv">
        <dt>硬编码 UA</dt><dd>壳可以改 UA，按 UA 判环境必错</dd>
        <dt>自绘返回</dt><dd>与原生返回手势打架，只保留一套</dd>
        <dt>整页刷新</dt><dd>壳里刷新会丢原生状态，用局部更新</dd>
      </dl>
    </section>

    <p class="tiny">原生方法名一改前端就崩，所以约定只暴露 <code>postMessage</code> 一个入口。</p>
  </main>

  <div class="m-native__bar">
    <button class="btn btn--secondary" type="button" data-native-action="close">关闭页面</button>
    <button class="btn btn--primary" type="button" data-native-action="confirm">确认并返回</button>
  </div>
</div>
` + tail();



/* --------------------------------------------------- 电商三页：product / cart / checkout */

const coHead = (title) =>
  head(title, '<link rel="stylesheet" href="commerce.css">\n');

const coHeader = (current) => `<a class="skip-link" href="#main">跳到主内容</a>

<header class="site-header">
  <div class="container site-header__in">
    <a class="brand" href="./index.html">
      <span class="brand__mark" aria-hidden="true">${NAME.slice(0, 1)}</span>
      <span>${NAME}</span>
    </a>
    <nav class="site-nav" aria-label="主导航">
      <a href="./catalog.html">全部商品</a>
      <a href="./product.html"${current === 'product' ? ' aria-current="page"' : ''}>商品详情</a>
      <a href="./cart.html"${current === 'cart' ? ' aria-current="page"' : ''}>购物车</a>
      <a href="./checkout.html"${current === 'checkout' ? ' aria-current="page"' : ''}>结算</a>
      <a href="./orders.html"${current === 'orders' || current === 'order' ? ' aria-current="page"' : ''}>订单</a>
    </nav>
    <div class="site-header__actions">
      <a class="btn btn--ghost btn--sm" href="./cart.html">
        购物车
        <span class="tag" data-cart-count aria-live="polite">3</span>
      </a>
    </div>
  </div>
</header>
`;

const productHtml = coHead('商品详情') + shellNote(['site-header', 'breadcrumb', 'gallery', 'info', 'price-3l', 'sku-swatch', 'sku-spec', 'qty', 'cta', 'facts', 'spec-table', 'related']) + coHeader('product') + `
<main class="co-shell" id="main">
  <nav class="co-crumbs" aria-label="面包屑">
    <a href="./index.html">首页</a>
    <span class="co-crumbs__sep" aria-hidden="true">/</span>
    <a href="./catalog.html">全部商品</a>
    <span class="co-crumbs__sep" aria-hidden="true">/</span>
    <span aria-current="page">{{TODO: 分类名}}</span>
  </nav>

  <div class="co-pdp">
    <!-- 图集：左缩略图条 + 主图。缩略图是 button，不是 a——点了不换 URL -->
    <div class="co-gallery">
      <div class="co-thumbs" role="group" aria-label="商品图片">
        <button class="co-thumb" type="button" aria-pressed="true" aria-label="查看第 1 张图" data-thumb>
          <span class="co-thumb__art" aria-hidden="true"></span>
        </button>
        <button class="co-thumb" type="button" aria-pressed="false" aria-label="查看第 2 张图" data-thumb>
          <span class="co-thumb__art" aria-hidden="true"></span>
        </button>
        <button class="co-thumb" type="button" aria-pressed="false" aria-label="查看第 3 张图" data-thumb>
          <span class="co-thumb__art" aria-hidden="true"></span>
        </button>
        <button class="co-thumb" type="button" aria-pressed="false" aria-label="查看第 4 张图" data-thumb>
          <span class="co-thumb__art" aria-hidden="true"></span>
        </button>
      </div>
      <div class="co-stage">
        <div class="co-stage__art" role="img" aria-label="{{TODO: 商品主图，换成真实 img 并写 alt}}"></div>
      </div>
    </div>

    <div class="co-info">
      <div>
        <h1 class="co-title">{{TODO: 商品名}}</h1>
        <p class="co-sub">{{TODO: 一句话说明它解决什么问题，不超过 40 字}}</p>
      </div>

      <!-- 三层价格：主价不放大，只加字重（国内电商习惯放大到 24–32，是另一流派） -->
      <p class="co-price">
        <span class="co-price__main" data-price>RMB 5,999</span>
        <span class="co-price__inst">或 RMB 250/月 (24 期)</span>
        <span class="co-price__note">含税价，运费在结算页计算</span>
      </p>

      <!-- SKU 组一：颜色 = 36px 圆点，不显示颜色名，名字只在 aria-label 里 -->
      <div class="co-group">
        <div class="co-group__head">
          <span class="co-group__label" id="sku-color-label">颜色</span>
          <span class="co-group__value" data-swatch-name>薰衣草紫</span>
        </div>
        <div class="co-swatches" role="group" aria-labelledby="sku-color-label">
          <button class="co-swatch" type="button" aria-pressed="true" aria-label="薰衣草紫" data-swatch="薰衣草紫" style="--sw:#c9c0e0"></button>
          <button class="co-swatch" type="button" aria-pressed="false" aria-label="深空黑" data-swatch="深空黑" style="--sw:#2b2b2e"></button>
          <button class="co-swatch" type="button" aria-pressed="false" aria-label="雾岩白" data-swatch="雾岩白" style="--sw:#e8e6e1"></button>
          <button class="co-swatch" type="button" aria-pressed="false" aria-label="海盐蓝" data-swatch="海盐蓝" style="--sw:#9fb6cc"></button>
          <button class="co-swatch" type="button" aria-pressed="false" aria-label="赤陶橙" data-swatch="赤陶橙" style="--sw:#c97b56"></button>
        </div>
      </div>

      <!-- SKU 组二：规格 = 文字按钮，和颜色圆点形状不同，一眼分得清两组 -->
      <div class="co-group">
        <div class="co-group__head">
          <span class="co-group__label" id="sku-spec-label">存储容量</span>
          <span class="co-group__value" data-spec-name>256GB</span>
        </div>
        <div class="co-specs" role="group" aria-labelledby="sku-spec-label">
          <button class="co-spec" type="button" aria-pressed="false" data-spec="128GB" data-delta="0">128GB</button>
          <button class="co-spec" type="button" aria-pressed="true" data-spec="256GB" data-delta="800">256GB<span class="co-spec__delta">+800</span></button>
          <button class="co-spec" type="button" aria-pressed="false" data-spec="512GB" data-delta="1600">512GB<span class="co-spec__delta">+1,600</span></button>
        </div>
      </div>

      <div class="co-buy">
        <div class="co-qty">
          <button type="button" aria-label="减少数量" data-qty-dec>−</button>
          <input type="number" inputmode="numeric" min="1" max="99" value="1" step="1" aria-label="购买数量" data-qty-input>
          <button type="button" aria-label="增加数量" data-qty-inc>+</button>
        </div>
        <button class="btn btn--primary co-cta co-cta--wide" type="button" data-add-to-cart>加入购物车</button>
        <button class="btn btn--secondary co-cta" type="button" data-buy-now>立即购买</button>
      </div>
      <p class="tiny" data-cart-feedback role="status" aria-live="polite"></p>

      <dl class="co-facts">
        <div class="co-facts__row"><dt>配送</dt><dd>{{TODO: 今天下单，预计 X 月 X 日送达}}</dd></div>
        <div class="co-facts__row"><dt>保障</dt><dd>7 天无理由退货 · 1 年质保 · 支持以旧换新</dd></div>
        <div class="co-facts__row"><dt>库存</dt><dd><span class="tag tag--brand">现货</span> 仅剩 12 件</dd></div>
      </dl>
    </div>
  </div>

  <section class="section" aria-labelledby="spec-title">
    <h2 class="section__title" id="spec-title">规格参数</h2>
    <div class="card card--flat">
      <table class="co-table">
        <caption class="sr-only">商品规格参数表</caption>
        <tbody>
          <tr><th scope="row">型号</th><td>{{TODO: 型号}}</td></tr>
          <tr><th scope="row">尺寸</th><td>{{TODO: 长 × 宽 × 高 mm}}</td></tr>
          <tr><th scope="row">重量</th><td>{{TODO: xxx g}}</td></tr>
          <tr><th scope="row">接口</th><td>{{TODO: 接口清单}}</td></tr>
          <tr><th scope="row">包装清单</th><td>{{TODO: 主机 ×1、说明书 ×1、数据线 ×1}}</td></tr>
        </tbody>
      </table>
    </div>
  </section>

  <section class="section" aria-labelledby="rel-title">
    <h2 class="section__title" id="rel-title">同类商品</h2>
    <div class="co-related">
      <a class="co-rel" href="./product.html">
        <span class="co-rel__art" role="img" aria-label="{{TODO: 商品缩略图 alt}}"></span>
        <span class="co-rel__name">{{TODO: 商品名}}</span>
        <span class="co-rel__price">RMB 4,299 起</span>
      </a>
      <a class="co-rel" href="./product.html">
        <span class="co-rel__art" role="img" aria-label="{{TODO: 商品缩略图 alt}}"></span>
        <span class="co-rel__name">{{TODO: 商品名}}</span>
        <span class="co-rel__price">RMB 6,999 起</span>
      </a>
      <a class="co-rel" href="./product.html">
        <span class="co-rel__art" role="img" aria-label="{{TODO: 商品缩略图 alt}}"></span>
        <span class="co-rel__name">{{TODO: 商品名}}</span>
        <span class="co-rel__price">RMB 2,199 起</span>
      </a>
    </div>
  </section>
</main>

<footer class="site-footer">
  <div class="container site-footer__in">
    <p class="muted">© {{TODO: 年份}} ${NAME}</p>
    <nav class="site-footer__links" aria-label="页脚导航">
      <a href="./index.html">首页</a>
      <a href="./catalog.html">全部商品</a>
      <a href="./cart.html">购物车</a>
    </nav>
  </div>
</footer>
` + tail();

const cartHtml = coHead('购物车') + shellNote(['site-header', 'page-head', 'line-items', 'qty-stepper', 'summary', 'promo', 'empty-state']) + coHeader('cart') + `
<main class="co-shell" id="main">
  <div class="page__head">
    <div>
      <h1 class="page__title">购物车</h1>
      <p class="page__desc">共 <span data-cart-lines>3</span> 件商品，<span data-cart-units>3</span> 件。价格以结算页为准。</p>
    </div>
    <div class="page__actions">
      <a class="btn btn--ghost btn--sm" href="./catalog.html">继续购物</a>
    </div>
  </div>

  <div class="co-cart">
    <div>
      <ul class="co-lines" data-cart-list>
        <li class="co-line" data-line data-unit="5999">
          <span class="co-line__art" role="img" aria-label="{{TODO: 商品缩略图 alt}}"></span>
          <div>
            <p class="co-line__name">{{TODO: 商品名}}</p>
            <p class="co-line__meta">薰衣草紫 · 256GB</p>
          </div>
          <div class="co-qty">
            <button type="button" aria-label="减少数量" data-qty-dec>−</button>
            <input type="number" inputmode="numeric" min="1" max="99" value="1" step="1" aria-label="购买数量" data-qty-input>
            <button type="button" aria-label="增加数量" data-qty-inc>+</button>
          </div>
          <span class="co-line__price">RMB 5,999</span>
          <span class="co-line__total" data-line-total>RMB 5,999</span>
          <button class="co-line__del" type="button" data-line-del>删除</button>
        </li>

        <li class="co-line" data-line data-unit="899">
          <span class="co-line__art" role="img" aria-label="{{TODO: 商品缩略图 alt}}"></span>
          <div>
            <p class="co-line__name">{{TODO: 配件名}}</p>
            <p class="co-line__meta">深空黑 · 标准版</p>
          </div>
          <div class="co-qty">
            <button type="button" aria-label="减少数量" data-qty-dec>−</button>
            <input type="number" inputmode="numeric" min="1" max="99" value="1" step="1" aria-label="购买数量" data-qty-input>
            <button type="button" aria-label="增加数量" data-qty-inc>+</button>
          </div>
          <span class="co-line__price">RMB 899</span>
          <span class="co-line__total" data-line-total>RMB 899</span>
          <button class="co-line__del" type="button" data-line-del>删除</button>
        </li>

        <li class="co-line" data-line data-unit="129">
          <span class="co-line__art" role="img" aria-label="{{TODO: 商品缩略图 alt}}"></span>
          <div>
            <p class="co-line__name">{{TODO: 耗材名}}</p>
            <p class="co-line__meta">两件装</p>
          </div>
          <div class="co-qty">
            <button type="button" aria-label="减少数量" data-qty-dec>−</button>
            <input type="number" inputmode="numeric" min="1" max="99" value="1" step="1" aria-label="购买数量" data-qty-input>
            <button type="button" aria-label="增加数量" data-qty-inc>+</button>
          </div>
          <span class="co-line__price">RMB 129</span>
          <span class="co-line__total" data-line-total>RMB 129</span>
          <button class="co-line__del" type="button" data-line-del>删除</button>
        </li>
      </ul>

      <!-- 空车态：最后一件被删掉时显示，不是重定向到别的页 -->
      <div class="empty" data-cart-empty hidden>
        <div class="empty__icon" aria-hidden="true">◇</div>
        <p class="empty__title">购物车是空的</p>
        <p class="empty__text">挑一件再回来，或者看看同类商品。</p>
        <a class="btn btn--primary" href="./catalog.html">去逛逛</a>
      </div>
    </div>

    <aside class="co-summary" aria-labelledby="sum-title">
      <h2 class="co-summary__title" id="sum-title">订单摘要</h2>
      <div class="co-summary__row">
        <span>商品小计</span>
        <span class="co-summary__num" data-sum-subtotal>RMB 7,027</span>
      </div>
      <div class="co-summary__row">
        <span>运费</span>
        <span class="co-summary__num">免运费</span>
      </div>
      <div class="co-summary__row">
        <span>优惠</span>
        <span class="co-summary__num" data-sum-discount>− RMB 0</span>
      </div>
      <div class="co-summary__row co-summary__row--total">
        <span>应付</span>
        <span class="co-summary__num" data-sum-total>RMB 7,027</span>
      </div>

      <div class="co-promo">
        <label class="sr-only" for="promo">优惠码</label>
        <input class="input" id="promo" name="promo" placeholder="输入优惠码" autocomplete="off">
        <button class="btn btn--secondary" type="button" data-promo>使用</button>
      </div>
      <p class="co-summary__note" data-promo-msg role="status" aria-live="polite"></p>

      <a class="btn btn--primary btn--block" href="./checkout.html">去结算</a>
      <p class="co-summary__note">结算前可修改地址与配送方式，提交订单才会扣款。</p>
    </aside>
  </div>
</main>

<footer class="site-footer">
  <div class="container site-footer__in">
    <p class="muted">© {{TODO: 年份}} ${NAME}</p>
    <nav class="site-footer__links" aria-label="页脚导航">
      <a href="./index.html">首页</a>
      <a href="./catalog.html">全部商品</a>
      <a href="./product.html">商品详情</a>
    </nav>
  </div>
</footer>
` + tail();

const checkoutHtml = coHead('结算') + shellNote(['checkout-header', 'steps', 'address', 'shipping', 'payment', 'order-summary', 'submit']) + `<a class="skip-link" href="#main">跳到主内容</a>

<header class="site-header">
  <div class="container site-header__in">
    <a class="brand" href="./index.html">
      <span class="brand__mark" aria-hidden="true">${NAME.slice(0, 1)}</span>
      <span>${NAME}</span>
    </a>
    <p class="muted">安全结算 · 全程加密</p>
  </div>
</header>

<main class="co-shell" id="main">
  <div class="page__head">
    <div>
      <h1 class="page__title">结算</h1>
      <p class="page__desc">三步填完，提交前可以随时回上一步改。</p>
    </div>
  </div>

  <!-- 步骤条：aria-current="step" 标当前步，已完成的加 .co-step--done -->
  <ol class="co-steps" data-steps>
    <li class="co-step" aria-current="step" data-step="1"><span class="co-step__no">1</span>收货地址</li>
    <li class="co-step" data-step="2"><span class="co-step__no">2</span>配送方式</li>
    <li class="co-step" data-step="3"><span class="co-step__no">3</span>支付</li>
  </ol>

  <div class="co-checkout">
    <form class="co-form" data-checkout-form novalidate>
      <section class="co-panel" aria-labelledby="addr-title">
        <h2 class="co-panel__title" id="addr-title">收货地址</h2>
        <div class="form-grid">
          <div class="field">
            <label class="label" for="co-name">收货人<span class="req" aria-hidden="true">*</span></label>
            <input class="input" id="co-name" name="name" required autocomplete="name" placeholder="真实姓名">
            <p class="error-text" data-error-for="co-name" hidden>请填写收货人</p>
          </div>
          <div class="field">
            <label class="label" for="co-phone">手机号<span class="req" aria-hidden="true">*</span></label>
            <input class="input" id="co-phone" name="phone" required inputmode="tel" autocomplete="tel" placeholder="11 位手机号">
            <p class="error-text" data-error-for="co-phone" hidden>请填写 11 位手机号</p>
          </div>
          <div class="field field--full">
            <label class="label" for="co-street">详细地址<span class="req" aria-hidden="true">*</span></label>
            <input class="input" id="co-street" name="street" required autocomplete="street-address" placeholder="街道、门牌号、楼层">
            <p class="error-text" data-error-for="co-street" hidden>请填写详细地址</p>
          </div>
          <div class="field">
            <label class="label" for="co-city">城市</label>
            <input class="input" id="co-city" name="city" autocomplete="address-level2" placeholder="城市">
          </div>
          <div class="field">
            <label class="label" for="co-zip">邮编</label>
            <input class="input" id="co-zip" name="zip" inputmode="numeric" autocomplete="postal-code" placeholder="6 位邮编">
          </div>
        </div>
      </section>

      <section class="co-panel" aria-labelledby="ship-title">
        <h2 class="co-panel__title" id="ship-title">配送方式</h2>
        <p class="co-panel__hint">运费在提交前锁定，不会因为改地址而变动。</p>
        <div class="co-options">
          <label class="co-option">
            <input type="radio" name="ship" value="std" checked>
            <span class="co-option__body">
              <span class="co-option__name">标准配送</span>
              <span class="co-option__meta">2–4 个工作日送达</span>
            </span>
            <span class="co-option__price">免运费</span>
          </label>
          <label class="co-option">
            <input type="radio" name="ship" value="fast">
            <span class="co-option__body">
              <span class="co-option__name">次日达</span>
              <span class="co-option__meta">今天 18:00 前下单，明天送达</span>
            </span>
            <span class="co-option__price">RMB 18</span>
          </label>
          <label class="co-option">
            <input type="radio" name="ship" value="pickup">
            <span class="co-option__body">
              <span class="co-option__name">门店自提</span>
              <span class="co-option__meta">{{TODO: 门店名}} · 营业至 21:00</span>
            </span>
            <span class="co-option__price">免运费</span>
          </label>
        </div>
      </section>

      <section class="co-panel" aria-labelledby="pay-title">
        <h2 class="co-panel__title" id="pay-title">支付方式</h2>
        <div class="co-options">
          <label class="co-option">
            <input type="radio" name="pay" value="card" checked>
            <span class="co-option__body">
              <span class="co-option__name">银行卡</span>
              <span class="co-option__meta">支持储蓄卡与信用卡</span>
            </span>
          </label>
          <label class="co-option">
            <input type="radio" name="pay" value="wallet">
            <span class="co-option__body">
              <span class="co-option__name">钱包余额</span>
              <span class="co-option__meta">可用余额 RMB 1,240</span>
            </span>
          </label>
          <label class="co-option">
            <input type="radio" name="pay" value="later">
            <span class="co-option__body">
              <span class="co-option__name">分期付款</span>
              <span class="co-option__meta">3 / 6 / 12 / 24 期，年化费率见协议</span>
            </span>
          </label>
        </div>
      </section>

      <div class="sticky-bar">
        <p class="sticky-bar__hint">提交即表示同意《购买条款》与《隐私政策》。</p>
        <div class="sticky-bar__actions">
          <a class="btn btn--ghost" href="./cart.html">返回购物车</a>
          <button class="btn btn--primary co-cta" type="submit">提交订单</button>
        </div>
      </div>
    </form>

    <aside class="co-summary" aria-labelledby="co-sum-title">
      <h2 class="co-summary__title" id="co-sum-title">订单摘要</h2>
      <div class="co-mini">
        <div class="co-mini__item">
          <span class="co-mini__art" role="img" aria-label="{{TODO: 商品缩略图 alt}}"></span>
          <span class="co-mini__name">{{TODO: 商品名}}<br><span class="muted">薰衣草紫 · 256GB</span></span>
          <span class="co-mini__num">×1</span>
        </div>
        <div class="co-mini__item">
          <span class="co-mini__art" role="img" aria-label="{{TODO: 商品缩略图 alt}}"></span>
          <span class="co-mini__name">{{TODO: 配件名}}</span>
          <span class="co-mini__num">×1</span>
        </div>
      </div>
      <div class="co-summary__row">
        <span>商品小计</span>
        <span class="co-summary__num">RMB 6,898</span>
      </div>
      <div class="co-summary__row">
        <span>运费</span>
        <span class="co-summary__num" data-ship-fee>免运费</span>
      </div>
      <div class="co-summary__row co-summary__row--total">
        <span>应付</span>
        <span class="co-summary__num" data-checkout-total>RMB 6,898</span>
      </div>
      <p class="co-summary__note">价格含税。发票在订单完成后可申请。</p>
    </aside>
  </div>
</main>
` + tail();



/* --------------------------------------------------- 订单两页：orders / order */

const ordersHtml = coHead('订单') + shellNote(['site-header', 'page-head', 'state-filters', 'order-cards', 'empty-state', 'pager']) + coHeader('orders') + `
<main class="co-shell" id="main">
  <div class="page__head">
    <div>
      <h1 class="page__title">我的订单</h1>
      <p class="page__desc">共 <span data-order-count>5</span> 笔订单。待支付的订单 24 小时后自动取消。</p>
    </div>
  </div>

  <!-- 状态筛选：value 与卡片上的 data-order-state 对齐；「全部」用 all -->
  <div class="co-filters" role="group" aria-label="按订单状态筛选">
    <button class="co-filter" type="button" aria-pressed="true" data-order-filter="all">全部</button>
    <button class="co-filter" type="button" aria-pressed="false" data-order-filter="pending">待支付</button>
    <button class="co-filter" type="button" aria-pressed="false" data-order-filter="paid">待发货</button>
    <button class="co-filter" type="button" aria-pressed="false" data-order-filter="shipped">待收货</button>
    <button class="co-filter" type="button" aria-pressed="false" data-order-filter="completed">已完成</button>
    <button class="co-filter" type="button" aria-pressed="false" data-order-filter="refunding">退款中</button>
    <button class="co-filter" type="button" aria-pressed="false" data-order-filter="canceled">已取消</button>
  </div>

  <ul class="co-orders" data-order-list>
    <li class="co-order" data-order data-order-state="pending">
      <div class="co-order__head">
        <span class="co-order__no">订单号 202610310001</span>
        <span>2026-10-31 14:22</span>
        <span class="co-order__state"><span class="tag tag--warn"><span class="dot"></span>待支付</span></span>
      </div>
      <div class="co-order__items">
        <span class="co-order__art" role="img" aria-label="{{TODO: 商品缩略图 alt}}"></span>
        <div>
          <p class="co-order__name">{{TODO: 商品名}}</p>
          <p class="co-order__meta">薰衣草紫 · 256GB · ×1</p>
        </div>
      </div>
      <div class="co-order__foot">
        <span class="co-order__sum">应付 <strong>RMB 6,799</strong></span>
        <div class="co-order__actions">
          <a class="btn btn--ghost btn--sm" href="./order.html">订单详情</a>
          <button class="btn btn--secondary btn--sm" type="button">取消订单</button>
          <a class="btn btn--primary btn--sm" href="./checkout.html">去支付</a>
        </div>
      </div>
    </li>

    <li class="co-order" data-order data-order-state="paid">
      <div class="co-order__head">
        <span class="co-order__no">订单号 202610300014</span>
        <span>2026-10-30 09:41</span>
        <span class="co-order__state"><span class="tag tag--brand"><span class="dot"></span>待发货</span></span>
      </div>
      <div class="co-order__items">
        <span class="co-order__art" role="img" aria-label="{{TODO: 商品缩略图 alt}}"></span>
        <div>
          <p class="co-order__name">{{TODO: 商品名}}</p>
          <p class="co-order__meta">深空黑 · 512GB · ×1</p>
        </div>
      </div>
      <div class="co-order__foot">
        <span class="co-order__sum">已付 <strong>RMB 7,599</strong></span>
        <div class="co-order__actions">
          <a class="btn btn--ghost btn--sm" href="./order.html">订单详情</a>
          <button class="btn btn--secondary btn--sm" type="button" data-open-refund>申请退款</button>
        </div>
      </div>
    </li>

    <li class="co-order" data-order data-order-state="shipped">
      <div class="co-order__head">
        <span class="co-order__no">订单号 202610280007</span>
        <span>2026-10-28 20:03</span>
        <span class="co-order__state"><span class="tag tag--info"><span class="dot"></span>待收货</span></span>
      </div>
      <div class="co-order__items">
        <span class="co-order__art" role="img" aria-label="{{TODO: 商品缩略图 alt}}"></span>
        <div>
          <p class="co-order__name">{{TODO: 配件名}}</p>
          <p class="co-order__meta">雾岩白 · 标准版 · ×2</p>
        </div>
      </div>
      <div class="co-order__foot">
        <span class="co-order__sum">已付 <strong>RMB 1,798</strong></span>
        <div class="co-order__actions">
          <a class="btn btn--ghost btn--sm" href="./order.html">订单详情</a>
          <button class="btn btn--secondary btn--sm" type="button">查看物流</button>
          <button class="btn btn--primary btn--sm" type="button">确认收货</button>
        </div>
      </div>
    </li>

    <li class="co-order" data-order data-order-state="refunding">
      <div class="co-order__head">
        <span class="co-order__no">订单号 202610250031</span>
        <span>2026-10-25 11:10</span>
        <span class="co-order__state"><span class="tag tag--warn"><span class="dot"></span>退款中</span></span>
      </div>
      <div class="co-order__items">
        <span class="co-order__art" role="img" aria-label="{{TODO: 商品缩略图 alt}}"></span>
        <div>
          <p class="co-order__name">{{TODO: 商品名}}</p>
          <p class="co-order__meta">海盐蓝 · 128GB · ×1</p>
        </div>
      </div>
      <div class="co-order__foot">
        <span class="co-order__sum">退款 <strong>RMB 5,199</strong></span>
        <div class="co-order__actions">
          <a class="btn btn--ghost btn--sm" href="./order.html">订单详情</a>
          <button class="btn btn--secondary btn--sm" type="button">撤销申请</button>
        </div>
      </div>
    </li>

    <li class="co-order" data-order data-order-state="completed">
      <div class="co-order__head">
        <span class="co-order__no">订单号 202610120008</span>
        <span>2026-10-12 16:55</span>
        <span class="co-order__state"><span class="tag tag--ok"><span class="dot"></span>已完成</span></span>
      </div>
      <div class="co-order__items">
        <span class="co-order__art" role="img" aria-label="{{TODO: 商品缩略图 alt}}"></span>
        <div>
          <p class="co-order__name">{{TODO: 商品名}}</p>
          <p class="co-order__meta">赤陶橙 · 256GB · ×1</p>
        </div>
      </div>
      <div class="co-order__foot">
        <span class="co-order__sum">实付 <strong>RMB 6,799</strong></span>
        <div class="co-order__actions">
          <a class="btn btn--ghost btn--sm" href="./order.html">订单详情</a>
          <button class="btn btn--secondary btn--sm" type="button">申请售后</button>
          <button class="btn btn--primary btn--sm" type="button">再次购买</button>
        </div>
      </div>
    </li>
  </ul>

  <div class="empty" data-order-empty hidden>
    <div class="empty__icon" aria-hidden="true">◇</div>
    <p class="empty__title">这个状态下没有订单</p>
    <p class="empty__text">换个状态看看，或者去挑点新的。</p>
    <a class="btn btn--primary" href="./catalog.html">去逛逛</a>
  </div>

  <nav class="pager" aria-label="分页">
    <span class="pager__info">显示 1–5 / 共 5 笔</span>
  </nav>
</main>

<footer class="site-footer">
  <div class="container site-footer__in">
    <p class="muted">© {{TODO: 年份}} ${NAME}</p>
    <nav class="site-footer__links" aria-label="页脚导航">
      <a href="./index.html">首页</a>
      <a href="./catalog.html">全部商品</a>
      <a href="./cart.html">购物车</a>
    </nav>
  </div>
</footer>
` + tail();

const orderHtml = coHead('订单详情') + shellNote(['site-header', 'state-banner', 'timeline', 'items', 'amount', 'address', 'state-actions', 'refund-dialog']) + coHeader('order') + `
<main class="co-shell" id="main">
  <nav class="co-crumbs" aria-label="面包屑">
    <a href="./index.html">首页</a>
    <span class="co-crumbs__sep" aria-hidden="true">/</span>
    <a href="./orders.html">我的订单</a>
    <span class="co-crumbs__sep" aria-hidden="true">/</span>
    <span aria-current="page">订单详情</span>
  </nav>

  <div class="page__head">
    <div>
      <h1 class="page__title">订单 202610310001</h1>
      <p class="page__desc">下单时间 2026-10-31 14:22 · 支付方式 银行卡</p>
    </div>
  </div>

  <!-- 演示开关：切换状态看整页怎么变。交付时整块删掉，状态由接口返回。 -->
  <div class="co-demo">
    <label for="order-state-demo">演示：切换订单状态</label>
    <select class="select" id="order-state-demo" data-order-state-demo>
      <option value="pending">待支付</option>
      <option value="paid">已支付 / 待发货</option>
      <option value="shipped">已发货 / 待收货</option>
      <option value="completed">已完成</option>
      <option value="refunding">退款中</option>
      <option value="refunded">已退款</option>
      <option value="canceled">已取消</option>
    </select>
    <span>（真实项目里这块删掉，状态由接口给）</span>
  </div>

  <div class="co-detail">
    <div>
      <!-- 状态横幅：标题与提示随状态变 -->
      <section class="co-state-banner" aria-live="polite" data-state-banner>
        <div>
          <p class="co-state-banner__title" data-state-title>等待付款</p>
          <p class="co-state-banner__hint" data-state-hint>请在 24 小时内完成支付，超时订单会自动取消。</p>
        </div>
        <span class="co-state-banner__count" data-state-count>23:41:08</span>
      </section>

      <section class="co-panel" aria-labelledby="tl-title">
        <h2 class="co-panel__title" id="tl-title">订单进度</h2>
        <ol class="co-timeline" data-timeline>
          <li class="co-tl" data-tl="placed" data-state="done">
            <span class="co-tl__dot" aria-hidden="true">1</span>
            <div class="co-tl__body">
              <span class="co-tl__title">提交订单</span>
              <span class="co-tl__time">2026-10-31 14:22</span>
            </div>
          </li>
          <li class="co-tl" data-tl="paid" data-state="current">
            <span class="co-tl__dot" aria-hidden="true">2</span>
            <div class="co-tl__body">
              <span class="co-tl__title">支付成功</span>
              <span class="co-tl__time" data-tl-time="paid">等待支付</span>
            </div>
          </li>
          <li class="co-tl" data-tl="shipped" data-state="todo">
            <span class="co-tl__dot" aria-hidden="true">3</span>
            <div class="co-tl__body">
              <span class="co-tl__title">商家发货</span>
              <span class="co-tl__time" data-tl-time="shipped">—</span>
            </div>
          </li>
          <li class="co-tl" data-tl="delivered" data-state="todo">
            <span class="co-tl__dot" aria-hidden="true">4</span>
            <div class="co-tl__body">
              <span class="co-tl__title">确认收货</span>
              <span class="co-tl__time" data-tl-time="delivered">—</span>
            </div>
          </li>
        </ol>
        <p class="co-panel__hint" data-tl-note></p>
      </section>

      <section class="co-panel" aria-labelledby="it-title">
        <h2 class="co-panel__title" id="it-title">商品</h2>
        <ul class="co-lines">
          <li class="co-line" style="grid-template-columns: 88px minmax(0,1fr) auto;">
            <span class="co-line__art" role="img" aria-label="{{TODO: 商品缩略图 alt}}"></span>
            <div>
              <p class="co-line__name">{{TODO: 商品名}}</p>
              <p class="co-line__meta">薰衣草紫 · 256GB</p>
            </div>
            <span class="co-line__total">RMB 6,799</span>
          </li>
        </ul>
      </section>

      <section class="co-panel" aria-labelledby="addr2-title">
        <h2 class="co-panel__title" id="addr2-title">收货信息</h2>
        <dl class="co-facts">
          <div class="co-facts__row"><dt>收货人</dt><dd>{{TODO: 张三}} · 138****8000</dd></div>
          <div class="co-facts__row"><dt>地址</dt><dd>{{TODO: 省市区 + 详细地址}}</dd></div>
          <div class="co-facts__row"><dt>配送</dt><dd>标准配送 · 免运费</dd></div>
        </dl>
      </section>
    </div>

    <aside class="co-detail__side">
      <section class="co-summary" aria-labelledby="amt-title">
        <h2 class="co-summary__title" id="amt-title">金额</h2>
        <div class="co-amount">
          <div class="co-amount__row"><span>商品小计</span><span class="co-amount__num">RMB 6,799</span></div>
          <div class="co-amount__row"><span>运费</span><span class="co-amount__num">RMB 0</span></div>
          <div class="co-amount__row"><span>优惠</span><span class="co-amount__num">− RMB 0</span></div>
          <div class="co-amount__row co-amount__row--total"><span>应付</span><span class="co-amount__num">RMB 6,799</span></div>
        </div>
      </section>

      <!-- 状态动作：每组的显示由 ui.js 按当前状态开关，同一时刻只有一组可见 -->
      <section class="co-summary" aria-labelledby="act-title">
        <h2 class="co-summary__title" id="act-title">可执行操作</h2>

        <div class="co-actions" data-state-group="pending">
          <a class="btn btn--primary btn--block" href="./checkout.html">去支付</a>
          <button class="btn btn--ghost btn--block" type="button" data-order-cancel>取消订单</button>
        </div>

        <div class="co-actions" data-state-group="paid" hidden>
          <button class="btn btn--secondary btn--block" type="button" data-open-refund>申请退款</button>
          <button class="btn btn--ghost btn--block" type="button">提醒发货</button>
        </div>

        <div class="co-actions" data-state-group="shipped" hidden>
          <button class="btn btn--primary btn--block" type="button" data-order-confirm>确认收货</button>
          <button class="btn btn--secondary btn--block" type="button" data-open-refund>申请退款</button>
          <button class="btn btn--ghost btn--block" type="button">查看物流</button>
        </div>

        <div class="co-actions" data-state-group="completed" hidden>
          <button class="btn btn--primary btn--block" type="button">再次购买</button>
          <button class="btn btn--ghost btn--block" type="button" data-open-refund>申请售后</button>
        </div>

        <div class="co-actions" data-state-group="refunding" hidden>
          <button class="btn btn--secondary btn--block" type="button" data-order-cancel-refund>撤销退款申请</button>
          <p class="co-summary__note">退款审核中，预计 1–3 个工作日。撤销后订单回到原状态。</p>
        </div>

        <div class="co-actions" data-state-group="refunded" hidden>
          <button class="btn btn--primary btn--block" type="button">再次购买</button>
          <p class="co-summary__note">款项已退回原支付方式，到账时间以银行为准。</p>
        </div>

        <div class="co-actions" data-state-group="canceled" hidden>
          <button class="btn btn--primary btn--block" type="button">再次购买</button>
          <p class="co-summary__note">订单已取消。若已付款，退款会在 1–3 个工作日原路退回。</p>
        </div>

        <p class="co-summary__note" data-order-feedback role="status" aria-live="polite"></p>
      </section>
    </aside>
  </div>
</main>

<!-- 退款申请：原生 dialog，Esc 关闭、焦点自动落到第一个字段 -->
<dialog class="modal" id="refund-dialog" aria-labelledby="refund-title">
  <form method="dialog" class="modal__panel">
    <h2 class="modal__title" id="refund-title">申请退款</h2>
    <div class="field">
      <label class="label" for="refund-reason">退款原因</label>
      <select class="select" id="refund-reason" name="reason" autofocus>
        <option>不想要了</option>
        <option>商品与描述不符</option>
        <option>包装破损</option>
        <option>物流太慢</option>
        <option>其他</option>
      </select>
    </div>
    <div class="field">
      <label class="label" for="refund-note">补充说明</label>
      <textarea class="input" id="refund-note" name="note" rows="3" placeholder="可选，写清情况能加快审核"></textarea>
    </div>
    <p class="tiny">提交后订单进入「退款中」，审核期间不能再次申请。</p>
    <div class="modal__actions">
      <button class="btn btn--secondary" value="cancel" formnovalidate>取消</button>
      <button class="btn btn--primary" value="submit" data-refund-submit>提交申请</button>
    </div>
  </form>
</dialog>
` + tail();



/* ------------------------------------------------------------------ commerce.css */

const commerceCss = `/* commerce.css —— 商品详情 / 购物车 / 结算 / 订单
   只在 product.html / cart.html / checkout.html 引入。
   口径见 references/applestore-commerce.md：三层价格（主价不放大，只加字重）、
   36px 色块 SKU、两组 SKU 用不同形状区分、主 CTA 44 高。 */

.co-shell {
  width: 100%;
  max-width: var(--container);
  margin: 0 auto;
  padding: 0 var(--s-5) var(--s-11);
}

/* ---------- 面包屑 ---------- */
.co-crumbs {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--s-2);
  padding: var(--s-5) 0 var(--s-4);
  font-size: var(--t-sm);
  color: var(--ink-3);
}
.co-crumbs a { color: var(--ink-3); text-decoration: none; }
.co-crumbs a:hover { color: var(--ink); text-decoration: underline; }
.co-crumbs__sep { color: var(--ink-4); }

/* ---------- 商品详情：左图右信息 ---------- */
.co-pdp {
  display: grid;
  grid-template-columns: minmax(0, 1.12fr) minmax(0, 1fr);
  gap: var(--s-9);
  align-items: start;
}

.co-gallery {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: var(--s-3);
  position: sticky;
  top: var(--s-6);
}
.co-thumbs {
  display: flex;
  flex-direction: row;
  gap: var(--s-2);
  order: 2;
  overflow-x: auto;
  padding-bottom: 2px;
  scrollbar-width: thin;
}
.co-thumb {
  width: 72px;
  height: 72px;
  flex: 0 0 auto;
  padding: 0;
  border: 1px solid var(--border);
  border-radius: var(--r-md);
  background: var(--surface);
  cursor: pointer;
  overflow: hidden;
  transition: border-color var(--dur-fast) var(--ease), box-shadow var(--dur-fast) var(--ease);
}
.co-thumb__art {
  display: block;
  width: 100%;
  height: 100%;
  background:
    radial-gradient(120% 120% at 30% 20%, color-mix(in srgb, var(--brand) 16%, transparent), transparent 70%),
    linear-gradient(160deg, color-mix(in srgb, var(--brand) 8%, var(--surface)), var(--surface));
}
.co-thumb[aria-pressed="true"] {
  border-color: var(--brand);
  box-shadow: 0 0 0 1px var(--brand);
}
.co-thumb:hover { border-color: var(--ink-4); }

.co-stage {
  order: 1;
  aspect-ratio: 4 / 3;
  border: 1px solid var(--border);
  border-radius: var(--r-lg);
  background: var(--surface);
  display: grid;
  place-items: center;
  overflow: hidden;
}
.co-stage__art {
  width: 64%;
  height: 64%;
  border-radius: var(--r-xl);
  background:
    radial-gradient(120% 120% at 20% 10%, color-mix(in srgb, var(--brand) 22%, transparent), transparent 60%),
    linear-gradient(160deg, color-mix(in srgb, var(--brand) 12%, var(--surface)), var(--bg));
  box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--ink) 8%, transparent);
}

/* ---------- 右侧信息列 ---------- */
.co-info { display: flex; flex-direction: column; gap: var(--s-5); }
.co-title {
  margin: 0;
  font-size: var(--t-3xl);
  line-height: var(--lh-3xl);
  font-weight: var(--fw-head);
  letter-spacing: var(--track-head);
}
.co-sub { margin: 0; font-size: var(--t-base); line-height: var(--lh-base); color: var(--ink-2); }

/* 三层价格：主价 / 分期 / 小字注 —— 不要拼成一行字符串 */
.co-price { display: flex; flex-direction: column; gap: 2px; margin: 0; }
.co-price__main {
  font-size: var(--t-lg);
  line-height: var(--lh-lg);
  font-weight: var(--fw-head);
  color: var(--ink);
  font-variant-numeric: tabular-nums;
}
.co-price__inst {
  font-size: var(--t-base);
  line-height: var(--lh-base);
  color: var(--ink-2);
  font-variant-numeric: tabular-nums;
}
.co-price__note { font-size: var(--t-xs); line-height: var(--lh-xs); color: var(--ink-3); }

/* SKU 组：颜色=圆点，规格=文字按钮，两组形状不同 */
.co-group { display: flex; flex-direction: column; gap: var(--s-2); }
.co-group__head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: var(--s-3);
}
.co-group__label { font-size: var(--t-base); font-weight: var(--fw-ui); color: var(--ink); }
.co-group__value { font-size: var(--t-sm); color: var(--ink-2); }

.co-swatches { display: flex; flex-wrap: wrap; gap: var(--s-2); }
.co-swatch {
  width: 36px;
  height: 36px;
  padding: 0;
  border-radius: 50%;
  border: 2px solid transparent;
  background: var(--sw, var(--surface));
  cursor: pointer;
  box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--ink) 14%, transparent);
  transition: border-color var(--dur-fast) var(--ease), transform var(--dur-fast) var(--ease);
}
.co-swatch[aria-pressed="true"] { border-color: var(--brand); }
.co-swatch:hover { transform: scale(1.06); }

.co-specs { display: flex; flex-wrap: wrap; gap: var(--s-2); }
.co-spec {
  min-height: 40px;
  padding: 0 var(--s-4);
  border: 1px solid var(--border);
  border-radius: var(--r-md);
  background: var(--bg);
  color: var(--ink);
  font-size: var(--t-base);
  font-weight: var(--fw-ui);
  cursor: pointer;
  transition: border-color var(--dur-fast) var(--ease), background var(--dur-fast) var(--ease);
}
.co-spec:hover { border-color: var(--ink-4); background: var(--surface-hover); }
.co-spec[aria-pressed="true"] {
  border-color: var(--brand);
  box-shadow: inset 0 0 0 1px var(--brand);
  color: var(--brand-ink);
}
.co-spec__delta { margin-left: var(--s-2); font-size: var(--t-xs); color: var(--ink-3); }

/* 数量步进 */
.co-buy { display: flex; flex-wrap: wrap; align-items: center; gap: var(--s-3); }
.co-qty {
  display: inline-flex;
  align-items: stretch;
  border: 1px solid var(--border);
  border-radius: var(--r-md);
  overflow: hidden;
  background: var(--bg);
}
.co-qty button {
  width: 40px;
  min-height: 44px;
  border: 0;
  background: transparent;
  color: var(--ink);
  font-size: var(--t-lg);
  line-height: 1;
  cursor: pointer;
}
.co-qty button:hover { background: var(--surface-hover); }
.co-qty button:disabled { color: var(--ink-4); cursor: not-allowed; }
.co-qty input {
  width: 52px;
  min-height: 44px;
  border: 0;
  border-left: 1px solid var(--border);
  border-right: 1px solid var(--border);
  text-align: center;
  font: inherit;
  font-variant-numeric: tabular-nums;
  color: var(--ink);
  background: transparent;
  -moz-appearance: textfield;
}
.co-qty input::-webkit-outer-spin-button,
.co-qty input::-webkit-inner-spin-button { -webkit-appearance: none; margin: 0; }

.co-cta { min-height: 44px; padding: 0 var(--s-7); font-size: var(--t-base); }
.co-cta--wide { flex: 1 1 220px; }

.co-facts {
  display: grid;
  gap: var(--s-3);
  padding: var(--s-4) 0 0;
  margin: 0;
  border-top: 1px solid var(--border);
  font-size: var(--t-sm);
  color: var(--ink-2);
}
.co-facts__row { display: flex; gap: var(--s-3); }
.co-facts dt { flex: 0 0 64px; color: var(--ink-3); }
.co-facts dd { margin: 0; }

/* 规格参数表 */
.co-table { width: 100%; border-collapse: collapse; font-size: var(--t-base); }
.co-table th,
.co-table td { padding: var(--s-3) var(--s-4); text-align: left; border-bottom: 1px solid var(--border); }
.co-table th { width: 180px; font-weight: var(--fw-ui); color: var(--ink-2); }
.co-table tr:last-child th,
.co-table tr:last-child td { border-bottom: 0; }

/* 相关推荐 */
.co-related { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: var(--s-4); }
.co-rel {
  display: flex;
  flex-direction: column;
  gap: var(--s-2);
  padding: var(--s-3);
  border: 1px solid var(--border);
  border-radius: var(--r-lg);
  background: var(--raised);
  text-decoration: none;
  color: inherit;
}
.co-rel:hover { border-color: var(--ink-4); }
.co-rel__art {
  aspect-ratio: 16 / 10;
  border-radius: var(--r-md);
  background: linear-gradient(150deg, color-mix(in srgb, var(--brand) 10%, var(--surface)), var(--surface));
}
.co-rel__name { font-size: var(--t-base); font-weight: var(--fw-ui); }
.co-rel__price { font-size: var(--t-sm); color: var(--ink-2); font-variant-numeric: tabular-nums; }

/* ---------- 购物车 ---------- */
.co-cart { display: grid; grid-template-columns: minmax(0, 1fr) 340px; gap: var(--s-7); align-items: start; }
.co-lines { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; }
.co-line {
  display: grid;
  grid-template-columns: 88px minmax(0, 1fr) auto auto auto auto;
  align-items: center;
  gap: var(--s-4);
  padding: var(--s-4) 0;
  border-bottom: 1px solid var(--border);
}
.co-line:first-child { border-top: 1px solid var(--border); }
.co-line__art {
  width: 88px;
  height: 88px;
  border-radius: var(--r-md);
  border: 1px solid var(--border);
  background: linear-gradient(150deg, color-mix(in srgb, var(--brand) 10%, var(--surface)), var(--surface));
}
.co-line__name { font-size: var(--t-base); font-weight: var(--fw-ui); margin: 0 0 2px; }
.co-line__meta { font-size: var(--t-sm); color: var(--ink-3); margin: 0; }
.co-line__price,
.co-line__total {
  font-size: var(--t-base);
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
  color: var(--ink);
}
.co-line__price { color: var(--ink-3); font-size: var(--t-sm); }
.co-line__total { font-weight: var(--fw-head); }
.co-line__del {
  min-height: 44px;
  padding: 0 var(--s-3);
  border: 1px solid transparent;
  border-radius: var(--r-md);
  background: transparent;
  color: var(--ink-3);
  font-size: var(--t-sm);
  cursor: pointer;
}
.co-line__del:hover { color: var(--danger-ink); border-color: var(--border); background: var(--danger-bg); }

.co-summary {
  position: sticky;
  top: var(--s-6);
  display: flex;
  flex-direction: column;
  gap: var(--s-3);
  padding: var(--s-5);
  border: 1px solid var(--border);
  border-radius: var(--r-lg);
  background: var(--raised);
}
.co-summary__title { margin: 0; font-size: var(--t-lg); font-weight: var(--fw-head); }
.co-summary__row {
  display: flex;
  justify-content: space-between;
  gap: var(--s-3);
  font-size: var(--t-base);
  color: var(--ink-2);
}
.co-summary__row--total {
  padding-top: var(--s-3);
  border-top: 1px solid var(--border);
  font-size: var(--t-lg);
  font-weight: var(--fw-head);
  color: var(--ink);
}
.co-summary__num { font-variant-numeric: tabular-nums; }
.co-summary__note { margin: 0; font-size: var(--t-xs); line-height: var(--lh-xs); color: var(--ink-3); }

.co-promo { display: flex; gap: var(--s-2); }
.co-promo .input { flex: 1 1 auto; min-width: 0; }

/* ---------- 结算 ---------- */
.co-checkout { display: grid; grid-template-columns: minmax(0, 1fr) 360px; gap: var(--s-7); align-items: start; }
.co-steps {
  display: flex;
  flex-wrap: wrap;
  gap: var(--s-2) var(--s-5);
  list-style: none;
  margin: 0 0 var(--s-6);
  padding: 0;
  font-size: var(--t-sm);
  color: var(--ink-3);
}
.co-step { display: flex; align-items: center; gap: var(--s-2); }
.co-step__no {
  display: grid;
  place-items: center;
  width: 22px;
  height: 22px;
  border-radius: 50%;
  border: 1px solid var(--border);
  font-size: var(--t-xs);
  font-variant-numeric: tabular-nums;
}
.co-step[aria-current="step"] { color: var(--ink); font-weight: var(--fw-ui); }
/* 圆底必须用 --brand-fill：--brand 是浅色调，白字压上去在暖色人格下只有 1.68:1 */
.co-step[aria-current="step"] .co-step__no { background: var(--brand-fill); border-color: var(--brand-fill); color: var(--on-brand); }
.co-step--done .co-step__no { background: var(--ok-bg); border-color: var(--ok); color: var(--ok-ink); }

.co-panel {
  padding: var(--s-5);
  border: 1px solid var(--border);
  border-radius: var(--r-lg);
  background: var(--raised);
  margin-bottom: var(--s-4);
}
.co-panel__title { margin: 0 0 var(--s-4); font-size: var(--t-lg); font-weight: var(--fw-head); }
.co-panel__hint { margin: calc(var(--s-2) * -1) 0 var(--s-4); font-size: var(--t-sm); color: var(--ink-3); }

.co-options { display: flex; flex-direction: column; gap: var(--s-2); }
.co-option {
  display: flex;
  align-items: flex-start;
  gap: var(--s-3);
  min-height: 44px;
  padding: var(--s-3) var(--s-4);
  border: 1px solid var(--border);
  border-radius: var(--r-md);
  background: var(--bg);
  cursor: pointer;
}
.co-option:hover { border-color: var(--ink-4); }
.co-option:has(input:checked) {
  border-color: var(--brand);
  box-shadow: inset 0 0 0 1px var(--brand);
}
.co-option input { margin: 3px 0 0; accent-color: var(--brand); }
.co-option__body { display: flex; flex-direction: column; gap: 2px; }
.co-option__name { font-size: var(--t-base); font-weight: var(--fw-ui); color: var(--ink); }
.co-option__meta { font-size: var(--t-sm); color: var(--ink-3); }
.co-option__price { margin-left: auto; font-size: var(--t-base); font-variant-numeric: tabular-nums; color: var(--ink); }

/* 结算里的订单摘要复用 .co-summary 的骨架，去掉 sticky */
.co-checkout .co-summary { position: sticky; }
/* 结算底栏要压住滚动内容，半透明会让下面的选项透出来，读起来像重影 */
.co-form { padding-bottom: var(--s-4); }
.co-form .sticky-bar {
  background: var(--bg);
  border: 1px solid var(--border);
  border-radius: var(--r-md);
  box-shadow: 0 -8px 24px color-mix(in srgb, var(--ink) 6%, transparent);
  backdrop-filter: none;
}
.co-mini { display: flex; flex-direction: column; gap: var(--s-3); }
.co-mini__item { display: flex; gap: var(--s-3); align-items: center; font-size: var(--t-sm); color: var(--ink-2); }
.co-mini__art {
  width: 44px;
  height: 44px;
  flex: 0 0 auto;
  border-radius: var(--r-sm);
  border: 1px solid var(--border);
  background: linear-gradient(150deg, color-mix(in srgb, var(--brand) 10%, var(--surface)), var(--surface));
}
.co-mini__name { flex: 1 1 auto; min-width: 0; }
.co-mini__num { font-variant-numeric: tabular-nums; white-space: nowrap; }

/* ---------- 响应式 ---------- */
@media (max-width: 1080px) {
  .co-pdp { grid-template-columns: minmax(0, 1fr); gap: var(--s-6); }
  .co-gallery { position: static; }
  .co-cart,
  .co-checkout { grid-template-columns: minmax(0, 1fr); }
  .co-summary { position: static; }
}

@media (max-width: 720px) {
  .co-shell { padding: 0 var(--s-4) var(--s-9); }
  .co-related { grid-template-columns: minmax(0, 1fr); }
  .co-line {
    grid-template-columns: 72px minmax(0, 1fr) auto;
    grid-template-areas:
      'art name del'
      'art qty total';
    row-gap: var(--s-2);
  }
  .co-line__art { grid-area: art; width: 72px; height: 72px; }
  .co-line__name { grid-area: name; }
  .co-line .co-qty { grid-area: qty; justify-self: start; }
  .co-line__price { display: none; }
  .co-line__total { grid-area: total; justify-self: end; }
  .co-line__del { grid-area: del; justify-self: end; }
  .co-cta--wide { flex: 1 1 100%; }
  .co-table th { width: 96px; }
  /* 结算底栏：窄屏把提示和按钮拆两行，否则提示被挤成一列字 */
  .co-form .sticky-bar { flex-wrap: wrap; gap: var(--s-2); padding: var(--s-3) var(--s-4); }
  .co-form .sticky-bar__hint { order: 2; flex: 1 1 100%; }
  .co-form .sticky-bar__actions { order: 1; flex: 1 1 100%; margin-inline-start: 0; }
  .co-form .sticky-bar__actions .btn { flex: 1 1 auto; min-height: 44px; }
}

/* 触控目标下限：390 下所有可点元素至少 44 高 */
@media (max-width: 720px) {
  .co-swatch { width: 44px; height: 44px; }
  .co-spec { min-height: 44px; }
  .co-qty button { width: 44px; }
  .co-thumb { width: 64px; height: 64px; }
  /* 面包屑在窄屏容易只剩 20px 高，撑到 44 才够点 */
  .co-crumbs { gap: 0; padding: var(--s-2) 0; }
  .co-crumbs a {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 44px;
    min-height: 44px;
    padding: 0 var(--s-1);
  }
  .co-crumbs__sep { display: none; }
}

/* ================= 订单列表 / 订单详情 ================= */

.co-filters {
  display: flex;
  flex-wrap: wrap;
  gap: var(--s-2);
  margin-bottom: var(--s-5);
}
.co-filter {
  min-height: 40px;
  padding: 0 var(--s-4);
  border: 1px solid var(--border);
  border-radius: 999px;
  background: var(--bg);
  color: var(--ink-2);
  font-size: var(--t-sm);
  font-weight: var(--fw-ui);
  cursor: pointer;
  transition: border-color var(--dur-fast) var(--ease), background var(--dur-fast) var(--ease);
}
.co-filter:hover { border-color: var(--ink-4); }
.co-filter[aria-pressed="true"] {
  background: var(--ink);
  border-color: var(--ink);
  color: var(--bg);
}

.co-orders { display: grid; gap: var(--s-4); margin: 0; padding: 0; list-style: none; }
.co-order {
  display: grid;
  gap: var(--s-3);
  padding: var(--s-4);
  border: 1px solid var(--border);
  border-radius: var(--r-lg);
  background: var(--raised);
}
.co-order__head {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--s-2) var(--s-4);
  font-size: var(--t-sm);
  color: var(--ink-3);
}
.co-order__no { color: var(--ink-2); font-variant-numeric: tabular-nums; }
.co-order__state { margin-inline-start: auto; }
.co-order__items { display: flex; align-items: center; gap: var(--s-3); }
.co-order__art {
  flex: 0 0 auto;
  width: 64px;
  height: 64px;
  border: 1px solid var(--border);
  border-radius: var(--r-sm);
  background:
    radial-gradient(120% 120% at 30% 20%, color-mix(in srgb, var(--brand) 16%, transparent), transparent 70%),
    linear-gradient(160deg, color-mix(in srgb, var(--brand) 8%, var(--surface)), var(--surface));
}
.co-order__name { font-size: var(--t-base); font-weight: var(--fw-ui); }
.co-order__meta { font-size: var(--t-sm); color: var(--ink-3); }
.co-order__foot {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--s-2);
  padding-top: var(--s-3);
  border-top: 1px solid var(--border);
}
.co-order__sum { font-size: var(--t-base); font-variant-numeric: tabular-nums; color: var(--ink-2); }
.co-order__sum strong { color: var(--ink); font-weight: var(--fw-head); }
.co-order__actions { margin-inline-start: auto; display: flex; flex-wrap: wrap; gap: var(--s-2); }
.co-order__actions .btn { min-height: 40px; }

/* 状态机时间线：done / current / todo 三态，竖线用伪元素连起来 */
.co-timeline { margin: 0; padding: 0; list-style: none; }
.co-tl {
  position: relative;
  display: grid;
  grid-template-columns: 22px minmax(0, 1fr);
  gap: var(--s-3);
  padding-bottom: var(--s-4);
}
.co-tl:last-child { padding-bottom: 0; }
.co-tl::before {
  content: '';
  position: absolute;
  left: 10px;
  top: 22px;
  bottom: 0;
  width: 1px;
  /* 竖线要比发丝边重一档，否则 1px 的 --border 在浅底上根本看不见 */
  background: color-mix(in srgb, var(--ink) 18%, transparent);
}
.co-tl:last-child::before { display: none; }
.co-tl__dot {
  width: 22px;
  height: 22px;
  display: grid;
  place-items: center;
  border: 1px solid var(--border);
  border-radius: 50%;
  background: var(--bg);
  font-size: var(--t-xs);
  font-variant-numeric: tabular-nums;
  color: var(--ink-3);
}
.co-tl__body { display: grid; gap: 2px; }
.co-tl__title { font-size: var(--t-base); font-weight: var(--fw-ui); color: var(--ink-2); }
.co-tl__time { font-size: var(--t-xs); color: var(--ink-3); font-variant-numeric: tabular-nums; }
.co-tl[data-state="done"] .co-tl__dot { background: var(--ok-bg); border-color: var(--ok); color: var(--ok-ink); }
.co-tl[data-state="done"] .co-tl__title { color: var(--ink); }
.co-tl[data-state="current"] .co-tl__dot { background: var(--brand-fill); border-color: var(--brand-fill); color: var(--on-brand); }
.co-tl[data-state="current"] .co-tl__title { color: var(--ink); font-weight: var(--fw-head); }

/* 状态演示开关：明确标成 demo，交付时整块删掉 */
.co-demo {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--s-2);
  margin-bottom: var(--s-4);
  padding: var(--s-3) var(--s-4);
  border: 1px dashed var(--border);
  border-radius: var(--r-md);
  font-size: var(--t-sm);
  color: var(--ink-3);
}
.co-demo select { min-height: 40px; width: auto; min-width: 200px; }

/* 详情页两列 */
.co-detail { display: grid; grid-template-columns: minmax(0, 1fr) 340px; gap: var(--s-6); align-items: start; }
.co-detail__side { display: grid; gap: var(--s-4); position: sticky; top: var(--s-6); }
.co-amount { display: grid; gap: var(--s-2); }
.co-amount__row { display: flex; justify-content: space-between; gap: var(--s-3); font-size: var(--t-base); color: var(--ink-2); }
.co-amount__row--total {
  padding-top: var(--s-3);
  border-top: 1px solid var(--border);
  font-size: var(--t-lg);
  font-weight: var(--fw-head);
  color: var(--ink);
}
.co-amount__num { font-variant-numeric: tabular-nums; }
.co-state-banner {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--s-3);
  padding: var(--s-4);
  border: 1px solid var(--border);
  border-radius: var(--r-lg);
  background: var(--surface);
}
.co-state-banner__title { font-size: var(--t-lg); font-weight: var(--fw-head); }
.co-state-banner__hint { font-size: var(--t-sm); color: var(--ink-2); }
.co-state-banner__count { margin-inline-start: auto; font-variant-numeric: tabular-nums; color: var(--ink); }
.co-actions { display: grid; gap: var(--s-2); }
.co-actions .btn { min-height: 44px; }

@media (max-width: 1080px) {
  .co-detail { grid-template-columns: minmax(0, 1fr); }
  .co-detail__side { position: static; }
}
@media (max-width: 720px) {
  .co-filter { min-height: 44px; }
  .co-order__actions .btn { min-height: 44px; }
  .co-demo select { min-height: 44px; }
}
`;

const uiJs = `// ui.js —— 主题切换 / 密码显隐 / tabs 键盘 / 弹窗 / 商品 SKU 与购物车（无依赖）
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

  // 列表筛选 + 搜索：data-filter / data-search / [data-status] / [data-empty]
  function applyFilters() {
    var list = document.querySelector('[data-filter-list]');
    if (!list) return;
    var active = document.querySelector('[data-filter][aria-pressed="true"]');
    var status = active ? active.getAttribute('data-filter') : 'all';
    var input = document.querySelector('[data-search]');
    var q = input ? input.value.trim().toLowerCase() : '';
    var shown = 0;
    Array.prototype.forEach.call(list.querySelectorAll('[data-status]'), function (el) {
      var okStatus = status === 'all' || el.getAttribute('data-status') === status;
      var okText = !q || (el.textContent || '').toLowerCase().indexOf(q) >= 0;
      var show = okStatus && okText;
      el.hidden = !show;
      if (show) shown++;
    });
    var empty = document.querySelector('[data-empty]');
    if (empty) empty.hidden = shown > 0;
    var count = document.querySelector('[data-count]');
    if (count) count.textContent = String(shown);
  }
  window.applyFilters = applyFilters;
  document.addEventListener('click', function (e) {
    var f = e.target.closest('[data-filter]');
    if (!f) return;
    document.querySelectorAll('[data-filter]').forEach(function (b) { b.setAttribute('aria-pressed', String(b === f)); });
    applyFilters();
  });
  document.addEventListener('input', function (e) {
    if (e.target.closest('[data-search]')) applyFilters();
  });
  // ---------- 电商：图集 / SKU / 数量 / 购物车 / 结算 ----------
  function rmb(n) {
    return 'RMB ' + Math.round(n).toLocaleString('en-US');
  }

  // 图集：缩略图互斥
  document.addEventListener('click', function (e) {
    var thumb = e.target.closest && e.target.closest('[data-thumb]');
    if (!thumb) return;
    var group = thumb.closest('.co-thumbs');
    if (!group) return;
    group.querySelectorAll('[data-thumb]').forEach(function (b) {
      b.setAttribute('aria-pressed', String(b === thumb));
    });
  });

  // 颜色 SKU：圆点互斥 + 回写组头文字
  document.addEventListener('click', function (e) {
    var sw = e.target.closest && e.target.closest('[data-swatch]');
    if (!sw) return;
    var group = sw.closest('.co-swatches');
    if (!group) return;
    group.querySelectorAll('[data-swatch]').forEach(function (b) {
      b.setAttribute('aria-pressed', String(b === sw));
    });
    var label = document.querySelector('[data-swatch-name]');
    if (label) label.textContent = sw.getAttribute('data-swatch') || '';
  });

  // 规格 SKU：文字按钮互斥 + 价格增量（主价不放大，只改数字）
  var priceBase = null;
  function syncSpec(btn) {
    var group = btn.closest('.co-specs');
    if (group) {
      group.querySelectorAll('[data-spec]').forEach(function (b) {
        b.setAttribute('aria-pressed', String(b === btn));
      });
    }
    var label = document.querySelector('[data-spec-name]');
    if (label) label.textContent = btn.getAttribute('data-spec') || '';
    var priceEl = document.querySelector('[data-price]');
    if (!priceEl) return;
    var delta = Number(btn.getAttribute('data-delta') || 0);
    if (priceBase === null) {
      var cur = Number(String(priceEl.textContent).replace(/[^\\d.]/g, '')) || 0;
      priceBase = cur - delta;
    }
    priceEl.textContent = rmb(priceBase + delta);
  }
  document.addEventListener('click', function (e) {
    var spec = e.target.closest && e.target.closest('[data-spec]');
    if (spec) syncSpec(spec);
  });
  // 初始化：用「默认选中项」反推基准价，否则第一次点击会拿新档位的增量去减旧价格
  var specDefault = document.querySelector('[data-spec][aria-pressed="true"]');
  if (specDefault) syncSpec(specDefault);

  // 数量步进：任何 .co-qty 都生效，钳在 1–99
  function readQty(box) {
    var input = box.querySelector('[data-qty-input]');
    var v = input ? parseInt(input.value, 10) : 1;
    if (!isFinite(v) || v < 1) v = 1;
    if (v > 99) v = 99;
    if (input) input.value = String(v);
    var dec = box.querySelector('[data-qty-dec]');
    if (dec) dec.disabled = v <= 1;
    return v;
  }
  document.addEventListener('click', function (e) {
    var inc = e.target.closest && e.target.closest('[data-qty-inc]');
    var dec = e.target.closest && e.target.closest('[data-qty-dec]');
    if (!inc && !dec) return;
    var box = (inc || dec).closest('.co-qty');
    if (!box) return;
    var input = box.querySelector('[data-qty-input]');
    if (!input) return;
    var v = readQty(box);
    input.value = String(inc ? Math.min(99, v + 1) : Math.max(1, v - 1));
    readQty(box);
    recalcCart();
  });
  document.addEventListener('change', function (e) {
    if (!e.target.closest || !e.target.closest('[data-qty-input]')) return;
    readQty(e.target.closest('.co-qty'));
    recalcCart();
  });
  document.querySelectorAll('.co-qty').forEach(readQty);

  // 加入购物车：只改角标 + 提示，不跳页
  document.addEventListener('click', function (e) {
    var add = e.target.closest && e.target.closest('[data-add-to-cart]');
    var buy = e.target.closest && e.target.closest('[data-buy-now]');
    if (!add && !buy) return;
    var box = document.querySelector('.co-qty');
    var qty = box ? readQty(box) : 1;
    var badge = document.querySelector('[data-cart-count]');
    if (badge) badge.textContent = String((parseInt(badge.textContent, 10) || 0) + qty);
    var fb = document.querySelector('[data-cart-feedback]');
    if (fb) {
      fb.textContent = buy
        ? '已选中 ' + qty + ' 件，正在跳转结算…'
        : '已加入购物车：' + qty + ' 件';
    }
    if (buy) {
      setTimeout(function () {
        window.location.href = './checkout.html';
      }, 600);
    }
  });

  // 购物车：删行 / 汇总 / 空态
  function recalcCart() {
    var list = document.querySelector('[data-cart-list]');
    if (!list) return;
    var lines = list.querySelectorAll('[data-line]');
    var units = 0;
    var subtotal = 0;
    lines.forEach(function (li) {
      var unit = Number(li.getAttribute('data-unit') || 0);
      var box = li.querySelector('.co-qty');
      var qty = box ? readQty(box) : 1;
      var total = unit * qty;
      units += qty;
      subtotal += total;
      var cell = li.querySelector('[data-line-total]');
      if (cell) cell.textContent = rmb(total);
    });
    var discount = Number(list.getAttribute('data-discount') || 0);
    var setNum = function (sel, text) {
      var el = document.querySelector(sel);
      if (el) el.textContent = text;
    };
    setNum('[data-cart-lines]', String(lines.length));
    setNum('[data-cart-units]', String(units));
    setNum('[data-sum-subtotal]', rmb(subtotal));
    setNum('[data-sum-discount]', '− ' + rmb(discount));
    setNum('[data-sum-total]', rmb(Math.max(0, subtotal - discount)));
    var empty = document.querySelector('[data-cart-empty]');
    if (empty) empty.hidden = lines.length > 0;
    var sum = document.querySelector('.co-summary');
    if (sum) sum.hidden = lines.length === 0;
    var badge = document.querySelector('[data-cart-count]');
    if (badge) badge.textContent = String(units);
  }

  document.addEventListener('click', function (e) {
    var del = e.target.closest && e.target.closest('[data-line-del]');
    if (!del) return;
    var line = del.closest('[data-line]');
    if (line) line.remove();
    recalcCart();
  });

  // 优惠码：只做前端演示，真实校验必须在服务端
  document.addEventListener('click', function (e) {
    if (!e.target.closest || !e.target.closest('[data-promo]')) return;
    var input = document.querySelector('#promo');
    var msg = document.querySelector('[data-promo-msg]');
    var list = document.querySelector('[data-cart-list]');
    if (!input || !list) return;
    var code = String(input.value || '').trim().toUpperCase();
    var subtotal = 0;
    list.querySelectorAll('[data-line]').forEach(function (li) {
      var box = li.querySelector('.co-qty');
      subtotal += Number(li.getAttribute('data-unit') || 0) * (box ? readQty(box) : 1);
    });
    if (code === 'SAVE10') {
      list.setAttribute('data-discount', String(Math.round(subtotal * 0.1)));
      if (msg) msg.textContent = '已应用 SAVE10：立减 10%。';
    } else if (!code) {
      list.setAttribute('data-discount', '0');
      if (msg) msg.textContent = '请输入优惠码。';
    } else {
      list.setAttribute('data-discount', '0');
      if (msg) msg.textContent = '优惠码「' + code + '」无效或已过期。';
    }
    recalcCart();
  });
  recalcCart();

  // 结算：运费联动 + 必填校验（只拦明显空值，真实规则在服务端）
  var shipFees = { std: 0, fast: 18, pickup: 0 };
  function recalcCheckout() {
    var totalEl = document.querySelector('[data-checkout-total]');
    var feeEl = document.querySelector('[data-ship-fee]');
    if (!totalEl) return;
    var base = Number(totalEl.getAttribute('data-base') || 0);
    if (!base) {
      base = Number(String(totalEl.textContent).replace(/[^\\d.]/g, '')) || 0;
      totalEl.setAttribute('data-base', String(base));
    }
    var picked = document.querySelector('input[name="ship"]:checked');
    var fee = picked ? shipFees[picked.value] || 0 : 0;
    if (feeEl) feeEl.textContent = fee ? rmb(fee) : '免运费';
    totalEl.textContent = rmb(base + fee);
  }
  document.querySelectorAll('input[name="ship"]').forEach(function (r) {
    r.addEventListener('change', recalcCheckout);
  });

  var coForm = document.querySelector('[data-checkout-form]');
  if (coForm) {
    coForm.addEventListener('submit', function (e) {
      e.preventDefault();
      var bad = 0;
      coForm.querySelectorAll('[required]').forEach(function (input) {
        var err = coForm.querySelector('[data-error-for="' + input.id + '"]');
        var ok = String(input.value || '').trim().length > 0;
        if (input.id === 'co-phone') ok = /^\\d{11}$/.test(String(input.value || '').trim());
        if (err) err.hidden = ok;
        input.setAttribute('aria-invalid', String(!ok));
        if (!ok) bad += 1;
      });
      if (bad) {
        var first = coForm.querySelector('[aria-invalid="true"]');
        if (first) first.focus();
        return;
      }
      var btn = coForm.querySelector('[type="submit"]');
      if (btn) {
        btn.disabled = true;
        btn.textContent = '提交中…';
      }
    });
  }

  // ---------- 移动端向导：步骤切换 + 逐步校验 + 末步回显 ----------
  var wiz = document.querySelector('[data-wiz]');
  if (wiz) {
    var panels = Array.prototype.slice.call(wiz.querySelectorAll('[data-wiz-panel]'));
    var total = panels.length;
    var cur = 0;
    var fill = wiz.querySelector('[data-wiz-fill]');
    var bar = wiz.querySelector('[data-wiz-bar]');
    var count = wiz.querySelector('[data-wiz-count]');
    var prevBtn = wiz.querySelector('[data-wiz-prev]');
    var nextBtn = wiz.querySelector('[data-wiz-next]');

    function syncReview() {
      var map = { title: '#wiz-title', when: '#wiz-when', priority: '#wiz-priority', device: '#wiz-device' };
      Object.keys(map).forEach(function (k) {
        var src = wiz.querySelector(map[k]);
        var out = wiz.querySelector('[data-wiz-review="' + k + '"]');
        if (src && out) out.textContent = String(src.value || '—').replace('T', ' ');
      });
    }

    function renderWiz(focusFirst) {
      panels.forEach(function (p, i) { p.hidden = i !== cur; });
      if (fill) fill.style.width = ((cur + 1) / total) * 100 + '%';
      if (bar) bar.setAttribute('aria-valuenow', String(cur + 1));
      if (count) count.textContent = '第 ' + (cur + 1) + ' 步 / 共 ' + total + ' 步';
      if (prevBtn) prevBtn.disabled = cur === 0;
      if (nextBtn) nextBtn.textContent = cur === total - 1 ? '提交' : '下一步';
      if (cur === total - 1) syncReview();
      if (focusFirst) {
        var first = panels[cur].querySelector('input, select, textarea');
        if (first) first.focus({ preventScroll: true });
      }
    }

    function validateStep() {
      var panel = panels[cur];
      var bad = 0;
      panel.querySelectorAll('[data-wiz-required]').forEach(function (input) {
        var ok = input.type === 'checkbox' ? input.checked : String(input.value || '').trim().length > 0;
        var key = input.id || input.name;
        var err = wiz.querySelector('[data-wiz-error="' + key + '"]');
        if (err) err.hidden = ok;
        input.setAttribute('aria-invalid', String(!ok));
        if (!ok) bad += 1;
      });
      if (bad) {
        var firstBad = panel.querySelector('[aria-invalid="true"]');
        if (firstBad) firstBad.focus();
      }
      return bad === 0;
    }

    if (nextBtn) {
      nextBtn.addEventListener('click', function () {
        if (!validateStep()) return;
        if (cur === total - 1) {
          nextBtn.disabled = true;
          nextBtn.textContent = '提交中…';
          return;
        }
        cur = Math.min(total - 1, cur + 1);
        renderWiz(true);
      });
    }
    if (prevBtn) {
      prevBtn.addEventListener('click', function () {
        cur = Math.max(0, cur - 1);
        renderWiz(true);
      });
    }
    renderWiz(false);
  }

  // ---------- 横向分栏：指示点 + 键盘 + 滚动同步 ----------
  var track = document.querySelector('[data-pager-track]');
  if (track) {
    var slides = Array.prototype.slice.call(track.querySelectorAll('.m-pager__slide'));
    var dots = Array.prototype.slice.call(document.querySelectorAll('[data-pager-dot]'));
    var pagerCount = document.querySelector('[data-pager-count]');
    var active = 0;

    function syncPager(i) {
      active = Math.max(0, Math.min(slides.length - 1, i));
      dots.forEach(function (d, k) { d.setAttribute('aria-current', String(k === active)); });
      if (pagerCount) pagerCount.textContent = active + 1 + ' / ' + slides.length;
    }
    function goTo(i) {
      var n = Math.max(0, Math.min(slides.length - 1, i));
      if (slides[n]) slides[n].scrollIntoView({ behavior: 'smooth', inline: 'start', block: 'nearest' });
      syncPager(n);
    }
    dots.forEach(function (d) {
      d.addEventListener('click', function () { goTo(Number(d.getAttribute('data-pager-dot'))); });
    });
    // 手势之外必须留键盘：左右键翻页，Home / End 到首尾
    track.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowRight') { goTo(active + 1); e.preventDefault(); }
      else if (e.key === 'ArrowLeft') { goTo(active - 1); e.preventDefault(); }
      else if (e.key === 'Home') { goTo(0); e.preventDefault(); }
      else if (e.key === 'End') { goTo(slides.length - 1); e.preventDefault(); }
    });
    var raf = 0;
    track.addEventListener('scroll', function () {
      if (raf) return;
      raf = requestAnimationFrame(function () {
        raf = 0;
        var w = track.clientWidth || 1;
        syncPager(Math.round(track.scrollLeft / w));
      });
    });
    syncPager(0);
  }

  // ---------- 原生壳：桥接探测 + 无桥降级 ----------
  var bridgeState = document.querySelector('[data-bridge-state]');
  if (bridgeState) {
    var bridge =
      window.NativeBridge ||
      (window.webkit && window.webkit.messageHandlers && window.webkit.messageHandlers.NativeBridge) ||
      null;
    var kind = window.NativeBridge
      ? 'window.NativeBridge'
      : bridge
        ? 'webkit.messageHandlers.NativeBridge'
        : '无（浏览器环境）';
    bridgeState.textContent = bridge ? '已连接' : '浏览器环境';
    var kindEl = document.querySelector('[data-bridge-kind]');
    if (kindEl) kindEl.textContent = kind;
    var detail = document.querySelector('[data-bridge-detail]');
    if (detail) {
      detail.textContent = bridge
        ? '已检测到桥对象，可以 postMessage 给原生。'
        : '没有桥对象。按钮照常可用，只提示当前环境——不要在无桥时禁用操作。';
    }
    window.postToNative = function (type, payload) {
      var msg = JSON.stringify({ type: type, payload: payload || {} });
      if (window.NativeBridge && typeof window.NativeBridge.postMessage === 'function') {
        window.NativeBridge.postMessage(msg);
        return true;
      }
      if (window.webkit && window.webkit.messageHandlers && window.webkit.messageHandlers.NativeBridge) {
        window.webkit.messageHandlers.NativeBridge.postMessage(msg);
        return true;
      }
      return false;
    };
    document.addEventListener('click', function (e) {
      var btn = e.target.closest && e.target.closest('[data-native-action]');
      if (!btn) return;
      var sent = window.postToNative(btn.getAttribute('data-native-action'), { at: Date.now() });
      if (!sent && detail) {
        detail.textContent = '无桥环境：已忽略「' + btn.getAttribute('data-native-action') + '」（真机上会走原生）。';
      }
    });
  }

  // ---------- 订单列表：按状态筛选 + 空态 + 计数 ----------
  var orderList = document.querySelector('[data-order-list]');
  if (orderList) {
    function filterOrders() {
      var active = document.querySelector('[data-order-filter][aria-pressed="true"]');
      var want = active ? active.getAttribute('data-order-filter') : 'all';
      var shown = 0;
      Array.prototype.forEach.call(orderList.querySelectorAll('[data-order]'), function (li) {
        var hit = want === 'all' || li.getAttribute('data-order-state') === want;
        li.hidden = !hit;
        if (hit) shown += 1;
      });
      var emptyEl = document.querySelector('[data-order-empty]');
      if (emptyEl) emptyEl.hidden = shown > 0;
      var countEl = document.querySelector('[data-order-count]');
      if (countEl) countEl.textContent = String(shown);
    }
    document.addEventListener('click', function (e) {
      var f = e.target.closest && e.target.closest('[data-order-filter]');
      if (!f) return;
      document.querySelectorAll('[data-order-filter]').forEach(function (b) {
        b.setAttribute('aria-pressed', String(b === f));
      });
      filterOrders();
    });
    filterOrders();
  }

  // ---------- 订单详情：状态机（横幅 / 时间线 / 可执行操作三处同步）----------
  var stateDemo = document.querySelector('[data-order-state-demo]');
  if (stateDemo) {
    var ORDER_STATES = {
      pending: {
        title: '等待付款',
        hint: '请在 24 小时内完成支付，超时订单会自动取消。',
        count: '23:41:08',
        tl: { placed: 'done', paid: 'current', shipped: 'todo', delivered: 'todo' },
        times: { paid: '等待支付', shipped: '—', delivered: '—' },
        note: '',
      },
      paid: {
        title: '已支付，等待发货',
        hint: '商家会在 48 小时内发货，发货后可查看物流。',
        count: '',
        tl: { placed: 'done', paid: 'done', shipped: 'current', delivered: 'todo' },
        times: { paid: '2026-10-31 14:25', shipped: '等待发货', delivered: '—' },
        note: '',
      },
      shipped: {
        title: '已发货，等待收货',
        hint: '包裹已交给承运商，确认收货前可以申请退款。',
        count: '',
        tl: { placed: 'done', paid: 'done', shipped: 'done', delivered: 'current' },
        times: { paid: '2026-10-31 14:25', shipped: '2026-11-01 09:10', delivered: '待确认' },
        note: '物流单号 SF{{TODO: 单号}}，承运商顺丰速运。',
      },
      completed: {
        title: '订单已完成',
        hint: '感谢购买。7 天内可以申请售后。',
        count: '',
        tl: { placed: 'done', paid: 'done', shipped: 'done', delivered: 'done' },
        times: { paid: '2026-10-31 14:25', shipped: '2026-11-01 09:10', delivered: '2026-11-03 18:02' },
        note: '',
      },
      refunding: {
        title: '退款审核中',
        hint: '已收到退款申请，审核通过后原路退回。',
        count: '',
        tl: { placed: 'done', paid: 'done', shipped: 'done', delivered: 'todo' },
        times: { paid: '2026-10-31 14:25', shipped: '2026-11-01 09:10', delivered: '—' },
        note: '退款原因：{{TODO: 原因}}。审核预计 1–3 个工作日。',
      },
      refunded: {
        title: '已退款',
        hint: '款项已退回原支付方式，到账时间以银行为准。',
        count: '',
        tl: { placed: 'done', paid: 'done', shipped: 'done', delivered: 'todo' },
        times: { paid: '2026-10-31 14:25', shipped: '2026-11-01 09:10', delivered: '—' },
        note: '退款金额 RMB 6,799，退回至银行卡。',
      },
      canceled: {
        title: '订单已取消',
        hint: '订单已关闭。若已付款，退款会在 1–3 个工作日原路退回。',
        count: '',
        tl: { placed: 'done', paid: 'todo', shipped: 'todo', delivered: 'todo' },
        times: { paid: '—', shipped: '—', delivered: '—' },
        note: '取消原因：用户主动取消。',
      },
    };

    function applyOrderState(key) {
      var s = ORDER_STATES[key] || ORDER_STATES.pending;
      var t = document.querySelector('[data-state-title]');
      var h = document.querySelector('[data-state-hint]');
      var c = document.querySelector('[data-state-count]');
      if (t) t.textContent = s.title;
      if (h) h.textContent = s.hint;
      if (c) {
        c.textContent = s.count;
        c.hidden = !s.count;
      }
      Object.keys(s.tl).forEach(function (k) {
        var li = document.querySelector('[data-tl="' + k + '"]');
        if (li) li.setAttribute('data-state', s.tl[k]);
        var time = document.querySelector('[data-tl-time="' + k + '"]');
        if (time && s.times[k] !== undefined) time.textContent = s.times[k];
      });
      var note = document.querySelector('[data-tl-note]');
      if (note) {
        note.textContent = s.note || '';
        note.hidden = !s.note;
      }
      document.querySelectorAll('[data-state-group]').forEach(function (g) {
        g.hidden = g.getAttribute('data-state-group') !== key;
      });
    }

    stateDemo.addEventListener('change', function () {
      applyOrderState(stateDemo.value);
      var fb = document.querySelector('[data-order-feedback]');
      if (fb) fb.textContent = '';
    });
    applyOrderState(stateDemo.value);

    function orderFeedback(text) {
      var fb = document.querySelector('[data-order-feedback]');
      if (fb) fb.textContent = text;
    }

    document.addEventListener('click', function (e) {
      var cancel = e.target.closest && e.target.closest('[data-order-cancel]');
      var confirm = e.target.closest && e.target.closest('[data-order-confirm]');
      var unrefund = e.target.closest && e.target.closest('[data-order-cancel-refund]');
      if (cancel) {
        stateDemo.value = 'canceled';
        applyOrderState('canceled');
        orderFeedback('订单已取消。');
      } else if (confirm) {
        stateDemo.value = 'completed';
        applyOrderState('completed');
        orderFeedback('已确认收货，订单完成。');
      } else if (unrefund) {
        stateDemo.value = 'shipped';
        applyOrderState('shipped');
        orderFeedback('退款申请已撤销，订单回到待收货。');
      }
    });

    // 退款弹窗：原生 dialog，提交后进入「退款中」
    var refundDialog = document.getElementById('refund-dialog');
    document.addEventListener('click', function (e) {
      if (e.target.closest && e.target.closest('[data-open-refund]') && refundDialog) {
        refundDialog.showModal();
      }
    });
    if (refundDialog) {
      refundDialog.addEventListener('close', function () {
        if (refundDialog.returnValue !== 'submit') return;
        stateDemo.value = 'refunding';
        applyOrderState('refunding');
        orderFeedback('退款申请已提交，等待审核。');
      });
    }
  }

  applyFilters();
})();
`;

/* ------------------------------------------------------------ DESIGN.md 生成
   格式取自 Google Stitch 的 DESIGN.md 约定（VoltAgent/awesome-design-md 收了 84 份真实样本）：
   YAML frontmatter 存令牌，正文写判断。目的是让**别的 agent** 拿到一个文件就知道这套界面怎么长，
   不用去读 CSS。令牌全部从 tokens 对象派生，改人格就跟着变，不会和 tokens.css 漂移。 */

const mdColor = (c) => {
  if (typeof c === 'string') return c;
  if (c && typeof c === 'object' && 'h' in c) return `hsl(${c.h} ${c.s}% ${c.l}%)`;
  return String(c);
};

const mdHex = (c) => {
  // 只在能拿到十六进制时返回，否则退回 hsl() 表达
  return mdColor(c);
};

function designMd() {
  const C = tokens.color;
  const T = tokens.type;
  const R = tokens.radius;
  const S = tokens.space;
  const N = C.neutral;

  const colors = [
    ['primary', mdHex(C.brandFill || C.brand)],
    ['on-primary', mdHex(C.onBrand)],
    ['brand', mdHex(C.brand[600])],
    ['ink', P.ink],
    ['ink-muted', mdHex(N[600])],
    ['ink-subtle', mdHex(N[500])],
    ['canvas', '#ffffff'],
    ['surface-1', mdHex(N[50])],
    ['hairline', mdHex(N[200])],
    ['success', C.semantic.ok.base],
    ['warning', C.semantic.warn.base],
    ['danger', C.semantic.danger.base],
  ];
  const colorOf = (k) => (colors.find(([n]) => n === k) || ['', ''])[1];

  const typeScale = [
    ['display', T['4xl'], tokens.lineHeight['4xl'], P.weights.head],
    ['title', T['3xl'], tokens.lineHeight['3xl'], P.weights.head],
    ['heading', T['2xl'], tokens.lineHeight['2xl'], P.weights.head],
    ['subheading', T.xl, tokens.lineHeight.xl, P.weights.ui],
    ['body', T.base, tokens.lineHeight.base, P.weights.body],
    ['body-sm', T.sm, tokens.lineHeight.sm, P.weights.body],
    ['caption', T.xs, tokens.lineHeight.xs, P.weights.body],
  ];

  const spacing = [
    ['xxs', S[1]],
    ['xs', S[2]],
    ['sm', S[3]],
    ['md', S[4]],
    ['lg', S[6]],
    ['xl', S[7]],
    ['xxl', S[9]],
    ['section', tokens.section],
  ];

  const radius = [
    ['xs', R.xs],
    ['sm', R.sm],
    ['md', R.md],
    ['lg', R.lg],
    ['xl', R.xl],
    ['pill', R.pill],
  ];

  const depthLine =
    P.depth === 'hairline'
      ? '- 卡片靠 1px 发丝圈分层，不用投影；hover 把圈加粗到 45% ink'
      : P.depth === 'soft'
        ? '- 卡片靠柔和投影分层（sh-1 / sh-2 / sh-3 三档），hover 升一档'
        : '- 卡片靠硬投影 + 无模糊分层，hover 位移 2px';

  const desc = [
    `${P.label}骨架，人格 ${personaKey}（参照 ${P.ref}）`,
    `品牌色相 ${accentHue}，正文 ${T.base}px / 行高 ${tokens.lineHeight.base}，控件高 ${tokens.control.md}px`,
    `容器 ${tokens.container}px，区块间距 ${tokens.section}px，深度语言 ${P.depth}`,
    '令牌由 scaffold.mjs 从 tokens 对象派生，改人格即同步',
  ].join('。');

  const front = [
    '---',
    'version: alpha',
    `name: ${NAME}-design-system`,
    `description: "${desc}"`,
    '',
    'colors:',
    ...colors.map(([k, v]) => `  ${k}: "${v}"`),
    '',
    'typography:',
    ...typeScale.flatMap(([name, size, lh, w]) => [
      `  ${name}:`,
      `    fontFamily: "${NAME} Sans"`,
      `    fontSize: ${size}px`,
      `    fontWeight: ${w}`,
      `    lineHeight: ${lh}`,
      `    letterSpacing: ${name === 'display' || name === 'title' ? P.tracking.head : '0'}`,
    ]),
    '',
    'rounded:',
    ...radius.map(([k, v]) => `  ${k}: ${v}px`),
    '',
    'spacing:',
    ...spacing.map(([k, v]) => `  ${k}: ${v}px`),
    '',
    'components:',
    '  button-primary:',
    '    backgroundColor: "{colors.primary}"',
    '    textColor: "{colors.on-primary}"',
    '    typography: "{typography.body}"',
    '    rounded: "{rounded.md}"',
    `    height: ${tokens.control.md}px`,
    '  button-secondary:',
    '    backgroundColor: "{colors.canvas}"',
    '    textColor: "{colors.ink}"',
    '    typography: "{typography.body}"',
    '    rounded: "{rounded.md}"',
    `    height: ${tokens.control.md}px`,
    '  input:',
    '    backgroundColor: "{colors.canvas}"',
    '    textColor: "{colors.ink}"',
    '    typography: "{typography.body}"',
    '    rounded: "{rounded.md}"',
    `    height: ${tokens.control.md}px`,
    '  card:',
    '    backgroundColor: "{colors.canvas}"',
    '    textColor: "{colors.ink}"',
    '    typography: "{typography.body}"',
    '    rounded: "{rounded.lg}"',
    '  tag:',
    '    backgroundColor: "{colors.surface-1}"',
    '    textColor: "{colors.ink-muted}"',
    '    typography: "{typography.caption}"',
    '    rounded: "{rounded.pill}"',
    '---',
    '',
    '',
  ];

  const body = [
    `# ${NAME} · 设计系统`,
    '',
    '> 这份文件是给 agent 读的。改设计请改 `tokens.css`（或重跑 `scaffold.mjs`），不要只改这份文档——',
    '> 这里的数值是派生产物，两边对不上时以 `tokens.css` 为准。',
    '',
    '## Overview',
    '',
    `- **人格**：${personaKey}（${P.label}），参照 ${P.ref}`,
    `- **密度**：${tokens.density}`,
    `- **深度语言**：${P.depth}（hairline / soft / hard 三派只选一派，混用会显脏）`,
    `- **品牌色相**：${accentHue}（要换用 \`--accent <0-360>\` 重新生成，不要手调十六进制）`,
    '',
    '## Colors',
    '',
    '| 令牌 | 值 | 用途 |',
    '| --- | --- | --- |',
    `| \`primary\` | ${colorOf('primary')} | 主按钮底色、选中态、链接 |`,
    `| \`on-primary\` | ${colorOf('on-primary')} | 压在主色上的文字（已过对比度门） |`,
    `| \`ink\` | ${colorOf('ink')} | 正文与标题 |`,
    `| \`ink-muted\` | ${colorOf('ink-muted')} | 次级说明 |`,
    `| \`ink-subtle\` | ${colorOf('ink-subtle')} | 占位、时间戳 |`,
    `| \`surface-1\` | ${colorOf('surface-1')} | 卡片底、表头 |`,
    `| \`hairline\` | ${colorOf('hairline')} | 分隔线（1px 用 \`.hairline\` 类，别直接写 border） |`,
    `| \`danger\` | ${colorOf('danger')} | 删除、错误 |`,
    '',
    '**只用一种强调色。** 价格、链接、主按钮共用 `primary`；不要引入第二个彩色。',
    '促销色属于业务层（活动页），不属于设计系统。',
    '',
    '## Typography',
    '',
    `正文 ${T.base}px / ${tokens.lineHeight.base}，最小可读 12px。中文行高不要低于 1.5——`,
    '汉字没有升降部，1.4 会显挤（这是西文能到 1.44 而中文不能的原因）。',
    '',
    '| 角色 | 字号 | 行高 | 字重 |',
    '| --- | --- | --- | --- |',
    ...typeScale.map(([name, size, lh, w]) => `| ${name} | ${size}px | ${lh} | ${w} |`),
    '',
    `字距只给大标题：${P.tracking.head}。正文不加字距，中文字距一加就散。`,
    '',
    '## Layout',
    '',
    `- 容器最大宽 ${tokens.container}px`,
    `- 区块纵向间距 ${tokens.section}px`,
    `- 间距基数 ${S[1]}px，只用 ${[S[1], S[2], S[3], S[4], S[5], S[6], S[7], S[8], S[9]].join(' / ')} 这几档`,
    '- 移动端控件阶梯：28 / 36 / 44 / 52 / 60，**44 是触控下限，不是中档**',
    '- 安全区用 `.safe-top` / `.safe-bottom`，不要在每个组件里散写 env()',
    '',
    '## Elevation & Depth',
    '',
    `深度语言是 **${P.depth}**：`,
    '',
    depthLine,
    '',
    '阴影三档：`--sh-1` / `--sh-2` / `--sh-3`，不要临时写第四种。',
    '',
    '## Shapes',
    '',
    `圆角六档：${radius.map(([k, v]) => `${k} ${v}px`).join(' / ')}。`,
    '同一种元素只用一档；按钮 8、卡片 12、输入框 8、药丸 999 是常见分工。',
    '',
    '## Components',
    '',
    '骨架里的组件类，全部走令牌，改 `tokens.css` 即全局生效：',
    '',
    '| 组件 | 类名 | 关键约束 |',
    '| --- | --- | --- |',
    `| 按钮 | \`.btn\` \`.btn--primary\` \`.btn--secondary\` \`.btn--ghost\` | 高 ${tokens.control.md}px；移动端不低于 44 |`,
    '| 输入 | `.input` `.field` `.label` `.help` `.error-text` | label 必须绑定 `for`；错误文案挂 `aria-describedby` |',
    '| 卡片 | `.card` `.card--flat` `.card--pop` | 深度语言决定有没有投影，别两派混用 |',
    '| 表格 | `.table` `.table-wrap` | 窄屏横向滚动，而不是压扁列 |',
    '| 标签 | `.tag` `.tag--brand` `.tag--ok` `.tag--warn` | 文字 + 圆点，不只靠颜色区分状态 |',
    '| 状态 | `.empty` `.skeleton` `.alert` | 空 / 错 / 载三态，每个数据区都要有 |',
    '| 移动 | `.m-shell` `.m-tabbar` `.m-sheet` `.m-wiz` `.m-pager` `.m-native` | 四种形态各有自己的壳，不混用 |',
    '',
    '## Motion',
    '',
    `- 时长三档：${tokens.duration.fast} / ${tokens.duration.base} / ${tokens.duration.slow} ms`,
    `- 缓动：${tokens.motion.ease.join(', ')}`,
    '- 中位数 1 个入场动效就够（28 站实测的中位数就是 1）',
    '- 必须尊重 `prefers-reduced-motion`，骨架已在 base.css 里全局降级',
    '',
    '## Accessibility floors（不可协商）',
    '',
    '- 正文对比度 ≥ 4.5:1；大字（≥ 18.66px 粗体 / 24px 常规）≥ 3:1',
    '- 触控目标 ≥ 44×44，用 `--tap-min`',
    '- 焦点可见：不许用 `outline: none` 换观感',
    '- 每个数据区都有空 / 错 / 载三态',
    '- 图片删掉会丢信息就必须有 `alt`；纯装饰写 `alt=""`',
    '',
    '## 怎么验证这份文档没漂',
    '',
    '```bash',
    'node scripts/audit.mjs --url <你的页面> --themes light,dark',
    'node scripts/contrast_check.py .',
    'node scripts/screenshot.mjs --url <你的页面> --out .design/before',
    '```',
    '',
  ];

  return front.join('\n') + body.join('\n');
}

/* ------------------------------------------------------------------ 写盘 */

const pageMap = {
  landing: 'index.html',
  catalog: 'catalog.html',
  app: 'app.html',
  form: 'form.html',
  auth: 'auth.html',
  states: 'states.html',
  mobile: 'mobile.html',
  'mobile-wizard': 'mobile-wizard.html',
  'mobile-pager': 'mobile-pager.html',
  'mobile-native': 'mobile-native.html',
  product: 'product.html',
  cart: 'cart.html',
  checkout: 'checkout.html',
  orders: 'orders.html',
  order: 'order.html',
};
const built = {
  landing: landingHtml,
  catalog: catalogHtml,
  app: appHtml,
  form: formHtml,
  auth: authHtml,
  states: statesHtml,
  mobile: mobileHtml,
  'mobile-wizard': mobileWizardHtml,
  'mobile-pager': mobilePagerHtml,
  'mobile-native': mobileNativeHtml,
  product: productHtml,
  cart: cartHtml,
  checkout: checkoutHtml,
  orders: ordersHtml,
  order: orderHtml,
};
const unknown = pages.filter((x) => !pageMap[x]);
if (unknown.length) {
  console.error(`未知页面：${unknown.join(', ')}（可选：${Object.keys(pageMap).join(' / ')}）`);
  process.exit(2);
}
const files = [
  ['DESIGN.md', designMd()],
  ['tokens.json', JSON.stringify(tokens, null, 2) + '\n'],
  ['tokens.css', tokensCss],
  ['base.css', baseCss],
  ['components.css', componentsCss],
  ['depth.css', depthCss],
  ['catalog.css', catalogCss],
  ['mobile.css', mobileCss],
  ['commerce.css', commerceCss],
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
/* ------------------------------------------------- 令牌导出（--export）
   骨架是 CSS 变量体系；接别的体系时把同一份令牌翻译过去，数值不二次发明。 */
const exportTargets = (arg('export', '') || '').split(',').map((s) => s.trim().toLowerCase()).filter(Boolean);
const EXPORTABLE = ['tailwind', 'antd', 'element'];
const badExport = exportTargets.filter((x) => !EXPORTABLE.includes(x));
if (badExport.length) {
  console.error(`未知 --export：${badExport.join(', ')}（可选：${EXPORTABLE.join(' / ')}）`);
  process.exit(2);
}
if (exportTargets.includes('tailwind')) {
  const px = (n) => n + 'px';
  const fontSize = {};
  for (const [k, v] of Object.entries(P.type)) fontSize[k] = [px(v), { lineHeight: String(P.lh[k]) }];
  const tw = `// generated by scaffold.mjs —— persona: ${personaKey}，数值与 tokens.css 同源
// 用法：module.exports 后合进 tailwind.config 的 theme.extend，或 preset 引入
module.exports = {
  theme: {
    extend: {
      colors: {
        brand: ${JSON.stringify(Object.fromEntries(Object.entries(brand).map(([k, v]) => [k, v])), null, 8).replace(/\n/g, '\n      ')},
        neutral: ${JSON.stringify(neutral, null, 8).replace(/\n/g, '\n      ')},
        ok: '${semantic.ok.base}',
        warn: '${semantic.warn.base}',
        danger: '${semantic.danger.base}',
        info: '${semantic.info.base}',
      },
      fontSize: ${JSON.stringify(fontSize, null, 8).replace(/\n/g, '\n      ')},
      borderRadius: ${JSON.stringify(Object.fromEntries(Object.entries(P.radius).map(([k, v]) => [k, px(v)])), null, 8).replace(/\n/g, '\n      ')},
      spacing: ${JSON.stringify(Object.fromEntries(Object.entries(space).map(([k, v]) => [k, px(v)])), null, 8).replace(/\n/g, '\n      ')},
      boxShadow: {
        hairline: '${shadow.hairline.replace(/'/g, "\\'")}',
        1: '${shadow.sh1.replace(/'/g, "\\'")}',
        2: '${shadow.sh2.replace(/'/g, "\\'")}',
        3: '${shadow.sh3.replace(/'/g, "\\'")}',
      },
      transitionDuration: { fast: '${P.dur.fast}ms', base: '${P.dur.base}ms', slow: '${P.dur.slow}ms' },
    },
  },
};
`;
  await writeFile(path.join(outDir, 'tokens.tailwind.js'), tw, 'utf8');
  if (!quiet) console.log('  + tokens.tailwind.js');
}
if (exportTargets.includes('antd')) {
  const antd = {
    $schema: 'https://gw.alipayobjects.com/os/antfincdn/PXjU7ptN/token-schema.json',
    comment: 'generated by scaffold.mjs —— Ant Design v5 token（theme.useToken / ConfigProvider theme.token）',
    token: {
      colorPrimary: brandFill,
      colorInfo: semantic.info.base,
      colorSuccess: semantic.ok.base,
      colorWarning: semantic.warn.base,
      colorError: semantic.danger.base,
      colorBgContainer: P.raised,
      colorBgLayout: P.bg,
      colorBgElevated: P.raised,
      colorBorder: P.border,
      colorText: P.ink,
      colorTextSecondary: neutral[600],
      borderRadius: P.radius.md,
      fontSize: P.type.base,
      controlHeight: P.control,
      controlHeightSM: P.controlSm,
      wireframe: false,
    },
  };
  await writeFile(path.join(outDir, 'tokens.antd.json'), JSON.stringify(antd, null, 2) + '\n', 'utf8');
  if (!quiet) console.log('  + tokens.antd.json');
}
if (exportTargets.includes('element')) {
  const el = `// generated by scaffold.mjs —— Element Plus SCSS 变量（@use "element-plus/theme-chalk/src/index" 之前覆盖）
@forward 'element-plus/theme-chalk/src/common/var.scss' with (
  $colors: (
    'primary': ('base': ${brandFill}),
    'success': ('base': ${semantic.ok.base}),
    'warning': ('base': ${semantic.warn.base}),
    'danger': ('base': ${semantic.danger.base}),
    'error': ('base': ${semantic.danger.base}),
    'info': ('base': ${semantic.info.base}),
  ),
  $border-radius: (
    'base': ${P.radius.md}px,
    'small': ${P.radius.sm}px,
    'round': ${P.radius.xl}px,
  ),
  $font-size: (
    'base': ${P.type.base}px,
    'small': ${P.type.sm}px,
    'extra-small': ${P.type.xs}px,
  ),
  $component-size: (
    'default': ${P.control}px,
    'small': ${P.controlSm}px,
  ),
  $text-color: (
    'primary': ${P.ink},
    'regular': ${neutral[700]},
  ),
  $border-color: (
    '': ${P.border},
    'light': ${neutral[200]},
    'lighter': ${neutral[100]},
  ),
  $fill-color: (
    '': ${P.surface},
    'light': ${P.bg},
  ),
  $bg-color: (
    '': ${P.raised},
    'page': ${P.bg},
  ),
);
`;
  await writeFile(path.join(outDir, 'tokens.element.scss'), el, 'utf8');
  if (!quiet) console.log('  + tokens.element.scss');
}
/* 生成期自检：能算出来的对比度就不要留给"待会儿再看" */
const contrastChecks = [
  { name: '正文 --ink / --bg', v: contrast(P.ink, P.bg), min: 12 },
  { name: '--on-brand / --brand-fill', v: contrast(onBrand, brandFill), min: 4.5 },
  { name: '--brand-ink / --bg', v: contrast(brandInk, P.bg), min: 4.5 },
];
const failed = contrastChecks.filter((c) => c.v < c.min);

if (!quiet) {
  console.log('');
  console.log('人格：' + P.label + '（--persona ' + personaKey + '）  参照：' + P.ref);
  console.log('密度：' + P.density + '  控件高：' + P.control + 'px  圆角：' + [P.radius.sm, P.radius.md, P.radius.lg, P.radius.xl].join('/') + 'px');
  console.log('品牌色相：' + accentHue + ' 度  →  --brand ' + brand[500]);
  console.log('深度语言：' + P.depth + '（卡片 hover 位移 ' + D.hx + ' / ' + D.hy + '，按下 ' + D.press + '）  动效阶梯：' + durLadder.join(' / ') + 'ms');
  console.log('对比度自检：' + (failed.length
    ? failed.map((c) => c.name + ' = ' + c.v.toFixed(2) + ':1，要求 ≥ ' + c.min).join('；') + '  ← 先修这个'
    : contrastChecks.map((c) => c.v.toFixed(1) + ':1').join(' / ') + '  全部达标'));
  console.log('输出：' + outDir + '（' + files.length + ' 个文件，' + (total / 1024).toFixed(1) + ' KB）');
  if (!has('verify')) {
    console.log('');
    console.log('接着做三件事（或加 --verify 让脚本替你跑 2/3）：');
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
}

/* ---------------------------------------------------------- --verify
   生成完立刻起内置静态服务，对每个 HTML 跑 audit.mjs（明暗双主题）+ contrast_check.py。
   报告写到 <outDir>/.verify/。任何一步失败 → 退出码非 0，让 Agent 立刻知道要修。
   没装 playwright 时跳过 audit 只跑 contrast，但会在汇总里明说。 */
if (has('verify')) {
  const HERE = path.dirname(fileURLToPath(import.meta.url));
  const auditScript = path.join(HERE, 'audit.mjs');
  const contrastScript = path.join(HERE, 'contrast_check.py');
  const verifyDir = path.join(outDir, '.verify');
  await mkdir(verifyDir, { recursive: true });
  const allowPartial = has('allow-partial');
  /**
   * status 三态，退出码一一对应：
   *   pass    —— 每一项都跑了且通过，0
   *   partial —— 缺依赖跳过了某些项（没验全），3（--allow-partial 时降为 0）
   *   fail    —— 有项没通过，1
   * 以前"跳过"只写进 notes 就退出 0，等于把"没验"当成"验过了"，
   * 与「改完自证」直接冲突——这是 v1.15.4 修掉的。
   */
  const report = {
    when: new Date().toISOString(),
    persona: personaKey,
    pages,
    status: 'pass',
    ok: true,
    skipped: [],
    contrast: null,
    audit: [],
    notes: [],
  };
  const markPartial = (why) => {
    report.skipped.push(why);
    if (report.status === 'pass') report.status = 'partial';
    report.ok = false;
  };
  const markFail = (why) => {
    report.status = 'fail';
    report.ok = false;
    if (why) report.notes.push(why);
  };

  // 1. 对比度：直接调 contrast_check.py（已支持 .dark 与 color-mix）
  {
    const py = resolvePython();
    if (!py) {
      markPartial('对比度：本机找不到 python（依次试过 python / py -3 / python3）');
      if (!quiet) console.log('· 对比度  跳过：没装 python');
    } else {
      const cmd = [py.cmd, ...py.args];
      const r = await new Promise((res) => {
        const ch = spawn(py.cmd, [...py.args, contrastScript, outDir], { stdio: ['ignore', 'pipe', 'pipe'] });
        let out = '';
        ch.stdout.on('data', (d) => { out += d; });
        ch.stderr.on('data', (d) => { out += d; });
        ch.on('error', (e) => res({ code: -1, out: String(e && e.message) }));
        ch.on('close', (code) => res({ code, out }));
      });
      const tail = r.out.split('\n').filter((l) => l.includes('合计')).pop() || '';
      const m = tail.match(/合计：(\d+) 组，(\d+) 组未达标/);
      report.contrast = { code: r.code, cmd: cmd.join(' '), summary: tail.trim() };
      if (r.code === -1) {
        markPartial(`对比度：${cmd.join(' ')} 无法执行（${r.out.split('\n')[0] || '未知错误'}）`);
      } else if (!m) {
        // 没有汇总行说明脚本自己崩了（多半是缺 pillow），这不是"达标"，别混为一谈
        markFail('对比度脚本执行失败：' + (r.out.split('\n').filter(Boolean).pop() || `退出码 ${r.code}`).slice(0, 200));
      } else if (r.code !== 0 || Number(m[2]) > 0) {
        markFail('对比度未达标：' + tail.trim());
      }
      if (!quiet) console.log((report.status === 'fail' ? '✗' : report.status === 'partial' ? '·' : '✓') + ' 对比度  ' + (tail.trim() || `(${cmd.join(' ')} 未产出汇总)`));
    }
  }

  // 2. 审计：起内置静态服务，逐页跑 audit.mjs（明暗）
  {
    const { createRequire } = await import('node:module');
    const req = createRequire(import.meta.url);
    let playwrightOk = false;
    for (const n of ['playwright', 'playwright-core']) { try { req.resolve(n); playwrightOk = true; break; } catch { /* 下一个 */ } }
    if (!playwrightOk) {
      markPartial('审计：没装 playwright（npm i -D playwright && npx playwright install chromium）');
      if (!quiet) console.log('· 审计    跳过：没装 playwright');
    } else {
      const MIME = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.json': 'application/json; charset=utf-8', '.svg': 'image/svg+xml' };
      const server2 = createServer(async (req2, res2) => {
        try {
          const p = decodeURIComponent((req2.url || '/').split('?')[0]);
          const file = path.resolve(outDir, '.' + p);
          if (!file.startsWith(path.resolve(outDir))) { res2.writeHead(403).end(); return; }
          const body = await readFile(file);
          res2.writeHead(200, { 'content-type': MIME[path.extname(file)] || 'application/octet-stream' }).end(body);
        } catch { res2.writeHead(404).end('not found'); }
      });
      await new Promise((r) => server2.listen(0, '127.0.0.1', r));
      const port = server2.address().port;
      const pageFiles = pages.map((k) => pageMap[k]).filter(Boolean);
      let passCount = 0, failCount = 0;
      try {
        for (const pg of pageFiles) {
          const r = await new Promise((res) => {
            const ch = spawn(process.execPath, [auditScript, '--url', `http://127.0.0.1:${port}/${pg}`, '--themes', 'light,dark'], { stdio: ['ignore', 'pipe', 'pipe'] });
            let out = '';
            ch.stdout.on('data', (d) => { out += d; });
            ch.stderr.on('data', (d) => { out += d; });
            ch.on('close', (code) => res({ code, out }));
          });
          const line = r.out.split('\n').filter((l) => l.includes('合计')).pop() || '';
          const okLine = /合计：0 错误 \/ 0 警告/.test(line);
          report.audit.push({ page: pg, code: r.code, summary: line.trim(), ok: r.code === 0 && okLine });
          if (r.code === 0 && okLine) passCount++;
          else { failCount++; markFail(); }
          if (!quiet) console.log((r.code === 0 && okLine ? '✓' : '✗') + ' 审计    ' + pg + '  ' + line.trim());
        }
      } finally {
        server2.close();
      }
      if (!quiet) console.log(`  审计小计：${passCount} 过 / ${failCount} 挂（共 ${pageFiles.length} 页 × 明暗）`);
    }
  }

  await writeFile(path.join(verifyDir, 'report.json'), JSON.stringify(report, null, 2) + '\n', 'utf8');
  if (!quiet) {
    console.log('');
    console.log('验收报告：' + path.join(verifyDir, 'report.json') + '（status: ' + report.status + '）');
    if (report.skipped.length) console.log('未验证项：' + report.skipped.join('；'));
    if (report.notes.length) console.log('说明：' + report.notes.join('；'));
  }
  if (report.status === 'fail') {
    console.error('');
    console.error('✗ --verify 未通过：先看 .verify/report.json，再回头修');
    process.exit(1);
  }
  if (report.status === 'partial') {
    const msg = '⚠ --verify 只验了一部分：' + report.skipped.join('；');
    if (allowPartial) {
      if (!quiet) {
        console.log('');
        console.log(msg);
        console.log('  （--allow-partial 已放行，退出码 0；交付说明里要写明这几项没验）');
      }
      process.exit(0);
    }
    console.error('');
    console.error(msg);
    console.error('  补上依赖后重跑；确实要接受不完整验收，加 --allow-partial');
    process.exit(3);
  }
  if (!quiet) console.log('✓ --verify 全部通过');
}