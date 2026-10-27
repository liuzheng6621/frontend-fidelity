/**
 * 共享工具：视口定义、参数解析、playwright 解析、主题/动效上下文、报告落盘。
 *
 * 只被上一级目录的 *.mjs 引用。
 * 设计目标：脚本放在 Skill 目录里运行、或复制到目标项目里运行，都能找到 playwright；
 * 且所有可机读结果都写 UTF-8 文件（Windows 老控制台的代码页问题不影响结论）。
 */

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

/** 三档视口。移动端按 iPhone 12/13 逻辑分辨率，平板取竖屏临界值。 */
export const VIEWPORTS = {
  desktop: { width: 1440, height: 900 },
  tablet: { width: 768, height: 1024 },
  mobile: { width: 390, height: 844, isMobile: true, hasTouch: true },
};

/**
 * 开发服务器的噪音请求：这些失败不代表页面坏了，
 * 计入报告只会淹没真正的问题（Vite/HMR 重连、sourcemap、favicon 都属此类）。
 */
export const NOISE_URL =
  /favicon\.ico|\.map(\?|$)|__vite|@vite\/client|hot-update|sockjs|websocket|\/ws(\?|$)/i;

/** 极简 `--key value` / `--flag` 解析，够用且不引依赖。 */
export function parseArgs(argv, defaults = {}) {
  const args = { ...defaults };
  for (let i = 2; i < argv.length; i++) {
    const raw = argv[i];
    if (!raw.startsWith('--')) continue;
    const key = raw.slice(2);
    const next = argv[i + 1];
    if (next === undefined || next.startsWith('--')) {
      args[key] = true;
    } else {
      args[key] = next;
      i++;
    }
  }
  return args;
}

/** `--viewports desktop,mobile` → ['desktop','mobile']；缺省回落到 fallback。 */
export function listArg(value, fallback) {
  const raw = value === undefined || value === true ? fallback : String(value);
  return raw
    .split(',')
    .map((v) => v.trim())
    .filter(Boolean);
}

/**
 * 布尔参数：`--flag` 开、`--no-flag` 关、`--flag false/0/no/off` 也算关。
 * 否则 README 里写的 `--no-axe` / `--no-full-page` 只是看起来存在，实际不生效。
 */
export function flag(args, key, fallback = false) {
  if (args[key] === undefined && `no-${key}` in args) return false;
  const v = args[key];
  if (v === undefined) return fallback;
  if (v === true) return true;
  return !/^(false|0|no|off)$/i.test(String(v));
}

/**
 * 依次尝试：脚本自身目录旁的 node_modules → 目标项目（cwd）的 node_modules →
 * 只有核心包的 playwright-core。目标项目里 `npm i -D playwright` 之后，
 * 脚本复制到任何位置都能用，这是 Skill 可移植的前提。
 *
 * 用 createRequire 而不是 `import('playwright')`：playwright 是 CJS 包，
 * 动态 import 的命名导出探测不可靠（module.exports 是转发时拿不到 chromium）。
 */
export async function loadChromium() {
  const tried = [];
  const bases = [
    fileURLToPath(new URL('index.js', import.meta.url)),
    path.join(process.cwd(), 'index.js'),
  ];
  for (const base of bases) {
    for (const pkg of ['playwright', 'playwright-core']) {
      try {
        const mod = createRequire(base)(pkg);
        const chromium = mod?.chromium || mod?.default?.chromium;
        if (chromium) return chromium;
      } catch (e) {
        tried.push(`${path.dirname(base)} → ${pkg}: ${e.code || e.message}`);
      }
    }
  }
  throw new Error(
    '找不到 playwright。请在目标项目里执行：\n' +
      '  npm i -D playwright && npx playwright install chromium\n' +
      '详细尝试记录：\n  ' +
      tried.join('\n  '),
  );
}

/** 内置视口名或 `1440x900` 这类自定义尺寸 → 尺寸对象；都不匹配返回 null。 */
export function resolveViewport(v) {
  if (VIEWPORTS[v]) return VIEWPORTS[v];
  const m = /^(\d{2,5})x(\d{2,5})$/i.exec(String(v));
  return m ? { width: Number(m[1]), height: Number(m[2]) } : null;
}

/** 新建 browser context 的统一入口：视口 + 配色方案 + 动效偏好 + 登录态。 */
export function contextOptions({
  viewport = 'desktop',
  theme = 'light',
  reducedMotion = 'no-preference',
  deviceScaleFactor = 1,
  storageState,
  baseURL,
} = {}) {
  const v = resolveViewport(viewport);
  if (!v) throw new Error(`未知视口 ${viewport}，可选：${Object.keys(VIEWPORTS).join(', ')} 或 1440x900`);
  return {
    viewport: { width: v.width, height: v.height },
    isMobile: !!v.isMobile,
    hasTouch: !!v.hasTouch,
    deviceScaleFactor,
    // 本地自签证书直接可跑（与 README 常见问题一致）
    ignoreHTTPSErrors: true,
    colorScheme: theme === 'dark' ? 'dark' : 'light',
    reducedMotion,
    locale: 'zh-CN',
    ...(storageState ? { storageState } : {}),
    ...(baseURL ? { baseURL } : {}),
  };
}

/**
 * 注入页面里的累积布局偏移观察器（CLS）。
 * 用 addInitScript 传这个函数：Playwright 会把函数序列化进页面上下文。
 * 布局跳动是「固定尺寸容器」条款的直接后果，能量化就不该靠肉眼。
 */
export function installClsObserver() {
  window.__cls__ = 0;
  window.__clsShifts__ = [];
  try {
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.hadRecentInput) continue;
        window.__cls__ += entry.value;
        if (window.__clsShifts__.length < 5) {
          window.__clsShifts__.push({
            value: Number(entry.value.toFixed(4)),
            nodes: (entry.sources || [])
              .map((s) => (s.node && s.node.nodeName ? String(s.node.nodeName).toLowerCase() : null))
              .filter(Boolean)
              .slice(0, 3),
          });
        }
      }
    }).observe({ type: 'layout-shift', buffered: true });
  } catch {
    /* 老内核没有 layout-shift，忽略即可 */
  }
}

/**
 * dark 模式：colorScheme 仿真只覆盖 prefers-color-scheme，而多数项目靠 `.dark`
 * 类或 `[data-theme=dark]` 切主题。把三种约定一起打上，才能真正看到深色界面。
 */
export function forceDark() {
  const put = () => {
    const el = document.documentElement;
    if (!el) return;
    el.classList.add('dark');
    el.setAttribute('data-theme', 'dark');
    el.setAttribute('data-color-mode', 'dark');
  };
  if (document.documentElement) put();
  else document.addEventListener('DOMContentLoaded', put, { once: true });
}

export async function readPages(file) {
  const text = await readFile(file, 'utf8');
  return text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith('#'));
}

/**
 * Git Bash / MSYS 会把 `--pages /index.html` 里的 `/index.html` 当成 POSIX 绝对路径，
 * 改写成 `C:/Program Files/Git/index.html` 再交给 node；脚本随后按 URL 解析就成了
 * `file:///…/Git/index.html`，报 ERR_FILE_NOT_FOUND —— 报错完全指不到真因，
 * 而 README 与 docs 里的示例恰好全是 `--pages /,/orders` 这种写法。
 *
 * 只认常见安装根（Git for Windows 默认目录 / PortableGit / MSYS2 / Cygwin），
 * 认不出的一律不猜，交给 resolvePages 报警告 —— 猜错会静默审计到错误的页面，比报错更糟。
 */
export function undoMsysPath(p) {
  const s = String(p)
    .replace(/\\/g, '/')
    .replace(/^([A-Za-z]):\/+/, '$1:/');
  const m =
    /^[A-Za-z]:\/(?:.*\/)?(?:PortableGit|msys64|msys32|cygwin64|cygwin)(\/.*)?$/i.exec(s) ||
    /^[A-Za-z]:\/Program Files\/Git(\/.*)?$/i.exec(s);
  if (!m) return null;
  return m[1] && m[1].startsWith('/') ? m[1] : '/';
}

/**
 * `--pages` 的值 → 目标列表。兼容「逗号分隔」与「.txt 清单文件」，
 * 并顺手把 Git Bash 误转的路径还原回站点相对路径。
 * 返回 { targets, warnings }；warnings 由调用方打到 stderr。
 */
export async function resolvePages(raw, { baseUrl = '' } = {}) {
  const value = String(raw);
  const isFile = /\.(txt|list|paths)$/i.test(value) && !value.includes(',');
  const items = isFile
    ? await readPages(value)
    : value
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);

  const warnings = [];
  const targets = items.map((u) => {
    if (/^https?:\/\//i.test(u)) return u;

    const fixed = undoMsysPath(u);
    if (fixed && baseUrl) {
      warnings.push(`--pages 的值被 Git Bash 改写成了 Windows 路径，已还原为站点相对路径：${u} → ${fixed}`);
      return fixed;
    }
    if (fixed) {
      warnings.push(`--pages 的值 ${u} 像被 Git Bash 改写过，但没有 --base，无法还原；请改用 --url 或补上 --base`);
      return u;
    }
    if (/^[A-Za-z]:[\\/]/.test(u)) {
      warnings.push(
        `--pages 收到 Windows 绝对路径 ${u}：--pages 应传相对 --base 的路径（如 /index.html）。` +
          `如果你在 Git Bash 里写的是 /index.html，是 MSYS 把它改写成了这个路径，` +
          `可加 MSYS_NO_PATHCONV=1 或去掉前导斜杠（index.html）`,
      );
      return u;
    }
    return u;
  });

  return { targets, warnings };
}

/**
 * `--expect-text` → 每页期望文案。
 * 单段（不含 `|`）保持旧语义：所有目标共用；多段则必须与目标数一一对应。
 * 旧行为在多页下必然误报——一个页面的特征文案不可能出现在另一页。
 */
export function expectTextsFor(value, count) {
  if (value === undefined || value === true || value === null || value === '') return null;
  const parts = String(value)
    .split('|')
    .map((s) => s.trim());
  if (parts.length === 1) return { all: parts[0] };
  if (parts.length !== count) {
    throw new Error(
      `--expect-text 用 | 分成了 ${parts.length} 段，但本次有 ${count} 个目标页面；` +
        `段数与页面数必须一致，或只写一段表示所有页面共用`,
    );
  }
  return { perPage: parts };
}

/**
 * 找可用的 python。Windows 上常见的是 `py -3`（python 不在 PATH 或指向应用商店占位），
 * 只认 `python` 会让 --verify 静默跳过对比度。依次试到能跑 `-c pass` 为止。
 * 返回 { cmd, args } 或 null（调用方据此决定是否判 partial）。
 */
let _pythonCache;
export function resolvePython() {
  if (_pythonCache !== undefined) return _pythonCache;
  const candidates =
    process.platform === 'win32'
      ? [
          { cmd: 'python', args: [] },
          { cmd: 'py', args: ['-3'] },
          { cmd: 'python3', args: [] },
        ]
      : [
          { cmd: 'python3', args: [] },
          { cmd: 'python', args: [] },
        ];
  for (const c of candidates) {
    try {
      const r = spawnSync(c.cmd, [...c.args, '-c', 'pass'], { stdio: 'ignore', timeout: 15000 });
      if (r.status === 0) {
        _pythonCache = c;
        return c;
      }
    } catch {
      /* 换下一个候选 */
    }
  }
  _pythonCache = null;
  return null;
}


/** URL 或相对路径 → 安全的文件名片段。`/` 和 `/pricing?x=1` 都要能处理。 */
export function slugify(url) {
  let p;
  try {
    // 相对路径用占位 base 解析，拿 pathname+search；绝对 URL 行为不变
    const u = new URL(url, 'http://local.invalid');
    p = (u.pathname + u.search).replace(/^\/+|\/+$/g, '') || 'index';
  } catch {
    p = String(url).replace(/^(https?:)?\/+/, '');
  }
  return p.replace(/[^a-zA-Z0-9_-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60) || 'index';
}

/** 写 UTF-8 报告；目录不存在就建。返回值给控制台打印用。 */
export async function writeJson(file, data) {
  const out = path.resolve(file);
  await mkdir(path.dirname(out), { recursive: true });
  await writeFile(out, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
  return out;
}

/** 控制台状态标记一律用 ASCII：老控制台把中文打成乱码时，结论仍然可读。 */
export const MARK = { run: 'RUN ', pass: 'OK  ', warn: 'WARN', fail: 'FAIL', skip: 'SKIP' };

export function line(mark, text) {
  console.log(`${mark} ${text}`);
}

/**
 * 收集页面 console 错误与 HTTP 失败。
 * 返回句柄：take() 取走已有记录并清空（每页重算），便于按页归属。
 */
export function watchPage(page) {
  let consoleErrors = [];
  let httpErrors = [];
  page.on('console', (m) => {
    if (m.type() === 'error') consoleErrors.push(m.text().slice(0, 300));
  });
  page.on('pageerror', (e) => consoleErrors.push(`pageerror: ${e.message}`.slice(0, 300)));
  page.on('requestfailed', (r) => {
    if (NOISE_URL.test(r.url())) return;
    httpErrors.push(`requestfailed ${r.failure()?.errorText || ''}: ${r.url()}`.slice(0, 300));
  });
  page.on('response', (r) => {
    if (r.status() < 400 || NOISE_URL.test(r.url())) return;
    httpErrors.push(`HTTP ${r.status()}: ${r.url()}`.slice(0, 300));
  });
  return {
    take() {
      const out = { consoleErrors, httpErrors };
      consoleErrors = [];
      httpErrors = [];
      return out;
    },
  };
}

/** 逐屏滚动到底再回顶，触发 loading="lazy" 的图片；全页截图前必须做。 */
export async function autoScroll(page, { step = 600, settle = 150 } = {}) {
  await page.evaluate(
    async ({ step: s, settle: d }) => {
      const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
      const max = Math.min(document.body.scrollHeight, 20000);
      for (let y = 0; y < max; y += s) {
        window.scrollTo(0, y);
        await sleep(d);
      }
      window.scrollTo(0, 0);
      await sleep(d);
    },
    { step, settle },
  );
}

/** 导航：先等 networkidle，超时退回 load（有轮询的后台页面永远等不到 networkidle）。 */
export async function goto(page, url, timeout = 30000) {
  try {
    await page.goto(url, { waitUntil: 'networkidle', timeout });
  } catch {
    await page.goto(url, { waitUntil: 'load', timeout });
  }
}
