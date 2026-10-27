#!/usr/bin/env node
/**
 * fidelity.mjs — 像素级还原验收：设计稿 vs 实现
 *
 * 设计稿从哪来：
 *   --design design.png          设计稿/基准图（png/jpg/webp）
 * 实现从哪来（二选一）：
 *   --url http://127.0.0.1:5173  自动截图（playwright-core + 本机 Edge）
 *   --impl shot.png              已经截好的实现图
 *
 * 常用：
 *   node scripts/fidelity.mjs --design design.png --url http://localhost:3000
 *   node scripts/fidelity.mjs --design design.png --url http://localhost:3000 --theme dark --width 390 --height 844 --dpr 2
 *   node scripts/fidelity.mjs --design design.png --impl shot.png --max-diff 0.01
 *
 * 退出码：0 达标 / 1 差异超标 / 2 参数或环境错误
 */
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { mkdtemp, rm, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ENGINE = path.join(HERE, 'pixel_diff.py');

const VIEWPORTS = {
  desktop: [1440, 900],
  tablet: [834, 1112],
  mobile: [390, 844],
};

function parseArgs(argv) {
  const out = {};
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (!a.startsWith('--')) continue;
    const key = a.slice(2);
    if (key === 'help' || key === 'h') { out.help = true; continue; }
    const next = argv[i + 1];
    if (next && !next.startsWith('--')) { out[key] = next; i++; }
    else out[key] = true;
  }
  return out;
}

const args = parseArgs(process.argv);

if (args.help) {
  console.log(`用法：
  node scripts/fidelity.mjs --design <设计稿> (--url <页面地址> | --impl <实现截图>) [选项]

必填：
  --design <file>      设计稿 / 基准图（png、jpg、webp）
  --url <url>          实现页面地址（自动截图）
  --impl <file>        或者直接给实现截图

截图选项（配合 --url）：
  --viewport <name>    desktop(1440×900) | tablet(834×1112) | mobile(390×844)，默认 desktop
  --width  --height    自定义视口尺寸（覆盖 --viewport）
  --dpr <n>            缩放比（DPR），默认 1
  --theme <light|dark> 截图前设置 data-theme（默认沿用页面自身）
  --full               整页截图（默认只截首屏）

比对选项：
  --threshold <0-1>    单像素差异阈值，默认 0.12
  --grid <N|GxG>       区域切分，默认 16x12
  --top <n>            打印最差几个区域，默认 8
  --max-diff <0-1>     超阈值像素占比上限，默认 0.02（2%）
  --scale <auto|none>  尺寸不一致时是否缩放实现图，默认 auto
  --out <dir>          产物目录，默认 .design/fidelity
  --json <file>        报告路径（默认 <out>/fidelity-report.json）

退出码：0 达标 / 1 超标 / 2 参数或环境错误`);
  process.exit(0);
}

function fail(msg, code = 2) {
  console.error(`✗ ${msg}`);
  process.exit(code);
}

const require = createRequire(import.meta.url);

function resolvePlaywright() {
  for (const name of ['playwright', 'playwright-core']) {
    try { return require(name); } catch { /* 试下一个 */ }
  }
  return null;
}

async function shoot(url, opts) {
  const pw = resolvePlaywright();
  if (!pw) {
    fail('找不到 playwright。请执行：npm i -D playwright && npx playwright install chromium\n  或者用 --impl 直接给已截好的图。');
  }
  const [vw, vh] = opts.viewport;
  const launch = { headless: true };
  if (process.env.EDGE_PATH) launch.executablePath = process.env.EDGE_PATH;
  const browser = await pw.chromium.launch(launch);
  try {
    const context = await browser.newContext({
      viewport: { width: vw, height: vh },
      deviceScaleFactor: opts.dpr,
      locale: 'zh-CN',
      ...(opts.theme ? { colorScheme: opts.theme } : {}),
    });
    if (opts.theme) {
      // 在页面脚本之前把主题写进 localStorage，框架版（React/Vue）才能真的以该主题启动
      await context.addInitScript((theme) => {
        try { localStorage.setItem('ui-theme', theme); } catch { /* 忽略 */ }
      }, opts.theme);
    }
    const page = await context.newPage();
    await page.goto(url, { waitUntil: 'networkidle', timeout: 60000 }).catch(() => {});
    await page.waitForTimeout(opts.wait);
    if (opts.theme) {
      await page.evaluate((t) => {
        document.documentElement.dataset.theme = t;
        try { localStorage.setItem('ui-theme', t); } catch { /* 忽略 */ }
      }, opts.theme);
      await page.waitForTimeout(120);
    }
    const file = path.join(opts.tmp, 'impl.png');
    await page.screenshot({ path: file, fullPage: opts.full });
    return file;
  } finally {
    await browser.close();
  }
}

async function main() {
  if (!args.design) fail('缺少 --design <设计稿>');
  if (!args.url && !args.impl) fail('需要 --url <页面地址> 或 --impl <实现截图>');
  if (!(await stat(args.design).catch(() => null))) fail(`设计稿不存在：${args.design}`);

  const [vw, vh] = args.width && args.height
    ? [Number(args.width), Number(args.height)]
    : VIEWPORTS[args.viewport] || VIEWPORTS.desktop;

  let tmp = null;
  let implPath = args.impl;
  if (!implPath) {
    tmp = await mkdtemp(path.join(tmpdir(), 'fidelity-'));
    implPath = await shoot(args.url, {
      viewport: [vw, vh],
      dpr: Number(args.dpr || 1),
      theme: typeof args.theme === 'string' ? args.theme : '',
      full: Boolean(args.full),
      wait: Number(args.wait || 400),
      tmp,
    });
  }

  const engineArgs = [
    ENGINE,
    '--design', args.design,
    '--impl', implPath,
    '--out', args.out || '.design/fidelity',
    '--threshold', String(args.threshold ?? 0.12),
    '--grid', String(args.grid || '16x12'),
    '--top', String(args.top ?? 8),
    '--max-diff', String(args.maxDiff ?? args['max-diff'] ?? 0.02),
    '--scale', String(args.scale || 'auto'),
  ];
  if (args.json) engineArgs.push('--json', String(args.json));

  const py = process.env.PYTHON || (process.platform === 'win32' ? 'python' : 'python3');
  const code = await new Promise((resolve) => {
    const child = spawn(py, engineArgs, {
      stdio: 'inherit',
      env: { ...process.env, PYTHONIOENCODING: 'utf-8', PYTHONUTF8: '1' },
    });
    child.on('error', (err) => {
      console.error(`✗ 无法启动 ${py}：${err.message}`);
      resolve(2);
    });
    child.on('close', (c) => resolve(c ?? 2));
  });

  if (tmp) await rm(tmp, { recursive: true, force: true }).catch(() => {});
  process.exit(code);
}

main().catch((err) => {
  console.error('✗ ' + (err && err.stack ? err.stack : String(err)));
  process.exit(2);
});