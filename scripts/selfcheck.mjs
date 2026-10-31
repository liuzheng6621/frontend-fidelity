#!/usr/bin/env node
/**
 * selfcheck.mjs — 一键自检（给贡献者与 CI 用，不依赖具体项目）
 *
 * 它按顺序做这些检查，任何一步失败都以非 0 退出：
 *   1. 语法：node --check 递归覆盖 scripts/ 的 .mjs；python -m py_compile scripts/*.py
 *   0. 参数语义：MSYS 路径还原、按页 expect-text、python 探测（纯断言，不需要浏览器）
 *   2. 生成：五套人格 × 七类页面各生成一遍到临时目录
 *   3. 对比度：对每个生成物跑 contrast_check.py，不达标即失败
 *   4. 审计：装了 playwright 就起本地服务跑 audit.mjs（明暗双主题），没有就跳过并说明
 *   4.2 流程：用示例 flow 跑一遍 skeleton，确认 flow.mjs 的步骤/断言/报告链路没坏
 *   4.3 设计体系：合规 / 越档 / strict / 允许列表 / 忽略 / 未启用与无效配置反例
 *   4.5 框架栈：`--stack all` 生成 React/Vue，逐文件过 TSX/TS 语法 + 类名对齐（CSS 里没有的类名=错）
 *   5. 文档门：计数与冻结均值、相对文件链接、CHANGELOG 日期与版本顺序（含纯函数回归）
 *   6. 版本号：package.json / README / install.sh / CHANGELOG 首条必须同版，必要文件缺失即失败
 *
 * 用法：
 *   node scripts/selfcheck.mjs                 # 全跑（无 playwright 时自动跳过审计）
 *   node scripts/selfcheck.mjs --skip-audit    # 跳过浏览器审计，其余检查照跑（退出码兼容，明确提示不完整）
 *   node scripts/selfcheck.mjs --personas rational,print
 *   node scripts/selfcheck.mjs --keep          # 保留临时目录，便于看生成物
 */
import { spawn, spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { strict as assert } from 'node:assert';
import { basename, dirname, extname, join, relative, resolve } from 'node:path';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { resolvePython, undoMsysPath, expectTextsFor } from './lib/common.mjs';

const HERE = fileURLToPath(new URL('.', import.meta.url));
const SCRIPTS = resolve(HERE);
const ALL_PERSONAS = ['rational', 'editorial', 'warm', 'print', 'magazine'];
const PAGES = ['landing', 'catalog', 'app', 'form', 'auth', 'states', 'mobile', 'mobile-wizard', 'mobile-pager', 'mobile-native', 'product', 'cart', 'checkout', 'orders', 'order'];
const PAGES_HTML = ['index.html', 'catalog.html', 'app.html', 'form.html', 'auth.html', 'states.html', 'mobile.html', 'mobile-wizard.html', 'mobile-pager.html', 'mobile-native.html', 'product.html', 'cart.html', 'checkout.html', 'orders.html', 'order.html'];
// 只跑两套人格的页面：它们的差异来自颜色与间距令牌，rational（冷）+ warm（暖）已覆盖两端。
// 全 5 套会把自检时长翻倍，收益不成比例。
const AUDIT_SCOPE = {
  'product.html': ['rational', 'warm'],
  'cart.html': ['rational', 'warm'],
  'checkout.html': ['rational', 'warm'],
  'orders.html': ['rational', 'warm'],
  'order.html': ['rational', 'warm'],
  'mobile-wizard.html': ['rational', 'warm'],
  'mobile-pager.html': ['rational', 'warm'],
  'mobile-native.html': ['rational', 'warm'],
};

const argv = process.argv.slice(2);
const flag = (n) => argv.includes(n);
const opt = (n, d) => { const i = argv.indexOf(n); return i >= 0 && argv[i + 1] ? argv[i + 1] : d; };
const skipAudit = flag('--skip-audit');
const keep = flag('--keep');
const personas = opt('--personas', ALL_PERSONAS.join(',')).split(',').map((s) => s.trim()).filter(Boolean);

const C = { ok: '\x1b[32m', bad: '\x1b[31m', dim: '\x1b[2m', off: '\x1b[0m' };

// 审计阶段必须用异步子进程：spawnSync 会卡住事件循环，
// 内置静态服务就发不出响应，audit.mjs 只能干等到超时。
function runNodeAsync(args) {
  return new Promise((resolveP) => {
    const ch = spawn(process.execPath, args, { stdio: ['ignore', 'pipe', 'pipe'] });
    let out = '';
    ch.stdout.on('data', (d) => { out += d; });
    ch.stderr.on('data', (d) => { out += d; });
    ch.on('error', (e) => resolveP({ status: 1, out: out + String(e && e.message) }));
    ch.on('close', (status) => resolveP({ status, out }));
  });
}
const results = [];
const pass = (step, msg) => { results.push({ step, ok: true, msg }); console.log(`${C.ok}✓${C.off} ${step}${msg ? ' — ' + msg : ''}`); };
const fail = (step, msg) => { results.push({ step, ok: false, msg }); console.log(`${C.bad}✗${C.off} ${step} — ${msg}`); };
const skipped = [];
const skip = (step, msg) => {
  skipped.push({ step, msg });
  console.log(`${C.dim}· ${step} 跳过：${msg}${C.off}`);
};

const PYINFO = resolvePython();
const PY = PYINFO?.cmd || null;
const PYA = PYINFO?.args || [];
const pyOk = !!PYINFO;

// 纯函数共用一套规则，回归断言不依赖磁盘或浏览器。
function withoutFencedCode(text) {
  let fence = null;
  return text.split('\n').map((line) => {
    const m = line.match(/^(?:\s*>\s*)*\s{0,3}(`{3,}|~{3,})(.*)$/);
    if (fence) {
      if (m && m[1][0] === fence[0] && m[1].length >= fence.length && !m[2].trim()) fence = null;
      return '';
    }
    if (m) { fence = m[1]; return ''; }
    return line;
  }).join('\n');
}

function documentNumber(raw) {
  if (/^\d+$/.test(raw)) return Number(raw);
  const digits = { 零: 0, 〇: 0, 一: 1, 二: 2, 两: 2, 三: 3, 四: 4, 五: 5, 六: 6, 七: 7, 八: 8, 九: 9 };
  const units = { 十: 10, 百: 100, 千: 1000, 万: 10000 };
  if (!/^[零〇一二两三四五六七八九十百千万]+$/.test(raw)) return NaN;
  if (![...raw].some((ch) => units[ch])) return Number([...raw].map((ch) => digits[ch]).join(''));
  let total = 0, section = 0, digit = 0;
  for (const ch of raw) {
    if (ch in digits) digit = digits[ch];
    else if (units[ch] === 10000) { total += (section + digit || 1) * 10000; section = 0; digit = 0; }
    else { section += (digit || 1) * units[ch]; digit = 0; }
  }
  return total + section + digit;
}

function documentCountIssues(text, expected) {
  const num = '([0-9零〇一二两三四五六七八九十百千万]+)';
  const rules = [
    [new RegExp(`${num}\\s*个(?:真实站(?:点)?|实测(?:成功的?)?站(?:点)?)`, 'g'), 'sites'],
    [new RegExp(`${num}\\s*站实测`, 'g'), 'sites'],
    [new RegExp(`(?:语料全量|全量)\\s*${num}\\s*站`, 'g'), 'sites'],
    [new RegExp(`A 组\\s*${num}`, 'g'), 'groupA'],
    [new RegExp(`${num}\\s*份单站蒸馏`, 'g'), 'distillations'],
    [new RegExp(`${num}\\s*个(?:可执行|能直接跑的)脚本`, 'g'), 'scripts'],
  ];
  const bad = [];
  for (const [re, key] of rules) {
    for (const m of withoutFencedCode(text).replace(/\*/g, '').matchAll(re)) {
      if (documentNumber(m[1]) !== expected[key]) bad.push(`「${m[0]}」应为 ${expected[key]}`);
    }
  }
  return bad;
}

function frozenMeans(evidence) {
  const section = withoutFencedCode(evidence).match(/^## 二、跨站统计[^\n]*\n([\s\S]*?)(?=^## |$(?![\s\S]))/m)?.[1]?.replace(/\*/g, '');
  const body = section?.match(/正文字号：均值\s*(\d+(?:\.\d+)?)px/)?.[1];
  const h1 = section?.match(/H1：均值\s*(\d+(?:\.\d+)?)px/)?.[1];
  if (!body || !h1) throw new Error('design-evidence.md 无法解析冻结跨站正文 / H1 均值');
  return { body: Number(body), h1: Number(h1) };
}

function readmeMeanIssues(text, expected) {
  const plain = withoutFencedCode(text).replace(/\*/g, '');
  const rules = [
    [/(?:正文字号|正文)\s*(?:[：:|（(]\s*)?(?:均值\s*)?(\d+(?:\.\d+)?)px/g, 'body'],
    [/(?:主标题字号|H1)\s*(?:[：:|（(]\s*)?(?:均值\s*)?(\d+(?:\.\d+)?)px/g, 'h1'],
  ];
  const bad = [];
  for (const [re, key] of rules) {
    const matches = [...plain.matchAll(re)];
    if (!matches.length) bad.push(`README 缺少可解析的 ${key} 跨站均值`);
    for (const m of matches) if (Number(m[1]) !== expected[key]) bad.push(`「${m[0]}」与冻结均值 ${expected[key]}px 不一致`);
  }
  return bad;
}

function markdownFileLinks(text) {
  const plain = withoutFencedCode(text).replace(/(`+)[\s\S]*?\1/g, (code) => code.replace(/[^\n]/g, ' '));
  const links = [];
  const patterns = [
    /\]\(\s*(<[^>\n]+>|(?:\\.|[^\\\s()]+|\([^()]*\))+)(?:\s+(?:"[^"]*"|'[^']*'|\([^)]*\)))?\s*\)/g,
    /^[ \t]{0,3}\[[^\]\n]+\]:[ \t]*(<[^>\n]+>|\S+)/gm,
  ];
  for (const re of patterns) {
    for (const m of plain.matchAll(re)) {
      const target = m[1].replace(/^<|>$/g, '').replace(/\\([ ()])/g, '$1');
      if (/^(?:[a-z][a-z\d+.-]*:|\/|#)/i.test(target)) continue;
      const path = target.split(/[?#]/)[0];
      if (path) links.push({ path, line: plain.slice(0, m.index).split('\n').length });
    }
  }
  return links;
}

function changelogIssues(text, today) {
  const headings = [...withoutFencedCode(text).matchAll(/^##[ \t]+v([^\s]+)([^\n]*)$/gm)];
  const bad = [];
  if (!headings.length) return ['CHANGELOG 缺少版本标题'];
  let previous = null;
  for (const m of headings) {
    const version = m[1], date = (m[2].match(/^[ \t]+[-—–][ \t]+(.+)$/)?.[1] || '').trim();
    const parts = /^(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)$/.test(version) ? version.split('.').map(Number) : null;
    if (!parts) bad.push(`v${version} 不是合法版本号`);
    const parsed = new Date(`${date}T00:00:00.000Z`);
    const validDate = /^\d{4}-\d{2}-\d{2}$/.test(date) && !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === date;
    if (!validDate) bad.push(`v${version} 日期「${date}」非法或缺失`);
    else {
      if (date > today) bad.push(`v${version} 日期 ${date} 晚于今天 ${today}`);
      if (previous?.date && date > previous.date) bad.push(`v${version} 日期 ${date} 与上条 ${previous.date} 倒挂`);
    }
    if (parts && previous?.parts) {
      const differing = parts.findIndex((n, i) => n !== previous.parts[i]);
      if (differing === -1 || parts[differing] > previous.parts[differing]) bad.push(`v${version} 不小于上条版本 v${previous.version}`);
    }
    previous = { version, parts, date: validDate ? date : null };
  }
  return bad;
}

function requiredDocument(root, rel) {
  const text = readFileSync(join(root, rel), 'utf8');
  if (!text.trim()) throw new Error(`${rel} 为空`);
  return text;
}

// ---------- 0. 参数语义 ----------
{
  const bad = [];
  const eq = (a, b, what) => {
    if (JSON.stringify(a) !== JSON.stringify(b)) bad.push(`${what}：期望 ${JSON.stringify(b)}，实际 ${JSON.stringify(a)}`);
  };

  eq(undoMsysPath('C:/Program Files/Git/index.html'), '/index.html', 'undoMsysPath 默认安装根');
  eq(undoMsysPath('c:/Users/x/AppData/Local/Programs/PortableGit/orders/detail'), '/orders/detail', 'undoMsysPath PortableGit 子路径');
  eq(undoMsysPath('C:/msys64/home/u/repo/index.html'), '/home/u/repo/index.html', 'undoMsysPath msys2');
  eq(undoMsysPath('C:/Users/git/proj/index.html'), null, 'undoMsysPath 不误伤用户名 git');
  eq(undoMsysPath('/index.html'), null, 'undoMsysPath 不动正常相对路径');

  eq(expectTextsFor('工单', 2), { all: '工单' }, 'expectTextsFor 单段=全局');
  eq(expectTextsFor('首页|工单', 2), { perPage: ['首页', '工单'] }, 'expectTextsFor 按页对应');
  let threw = false;
  try {
    expectTextsFor('a|b|c', 2);
  } catch {
    threw = true;
  }
  if (!threw) bad.push('expectTextsFor 段数与页数不符时应抛错');

  if (bad.length) fail('参数语义', bad.join(' | '));
  else pass('参数语义', 'MSYS 路径还原 5 条 + 按页 expect-text 3 条');
}

// ---------- 1. 语法 ----------
{
  const mjs = [];
  const walk = (dir) => {
    for (const e of readdirSync(dir, { withFileTypes: true })) {
      if (e.isDirectory() && !['node_modules', 'vendor'].includes(e.name)) walk(join(dir, e.name));
      else if (e.isFile() && e.name.endsWith('.mjs')) mjs.push(relative(SCRIPTS, join(dir, e.name)));
    }
  };
  walk(SCRIPTS);
  let bad = [];
  for (const f of mjs) {
    const r = spawnSync(process.execPath, ['--check', join(SCRIPTS, f)], { encoding: 'utf8' });
    if (r.status !== 0) bad.push(`${f}: ${(r.stderr || '').split('\n')[0]}`);
  }
  if (bad.length) fail('语法 node', bad.join(' | '));
  else pass('语法 node', `${mjs.length} 个 .mjs`);
}
{
  const pys = readdirSync(SCRIPTS).filter((f) => f.endsWith('.py'));
  if (!pyOk) skip('语法 python', '本机没有 python');
  else {
    const bad = [];
    for (const f of pys) {
      const r = spawnSync(PY, [...PYA, '-m', 'py_compile', join(SCRIPTS, f)], { encoding: 'utf8' });
      if (r.status !== 0) bad.push(`${f}: ${(r.stderr || '').split('\n')[0]}`);
    }
    if (bad.length) fail('语法 python', bad.join(' | '));
    else pass('语法 python', `${pys.length} 个 .py`);
  }
}

// ---------- 2. 生成 ----------
const outDir = mkdtempSync(join(tmpdir(), 'ff-selfcheck-'));
const scaffold = join(SCRIPTS, 'scaffold.mjs');
const generated = [];
{
  const bad = [];
  for (const p of personas) {
    const dir = join(outDir, p);
    const r = spawnSync(process.execPath, [scaffold, '--persona', p, '--pages', PAGES.join(','), '--out', dir, '--quiet'], { encoding: 'utf8' });
    if (r.status !== 0) { bad.push(`${p}: exit ${r.status} ${(r.stderr || '').split('\n')[0]}`); continue; }
    const missing = ['DESIGN.md', 'tokens.css', 'base.css', 'components.css', 'depth.css', 'catalog.css', 'mobile.css', 'commerce.css', 'ui.js', ...PAGES_HTML].filter((f) => !existsSync(join(dir, f)));
    if (missing.length) bad.push(`${p}: 缺 ${missing.join(',')}`);
    else generated.push({ persona: p, dir });
  }
  if (bad.length) fail('生成', bad.join(' | '));
  else pass('生成', `${generated.length} 套 × ${PAGES.length} 页 → ${outDir}`);
}

// ---------- 2.5 DESIGN.md（给别的 agent 读的设计系统文档） ----------
// 这一门防的是「派生文档和令牌漂了」：色值变成 [object Object]、令牌引用指向不存在的键、
// 或者某次改动把 frontmatter 结构打坏。全部是纯文本校验，不需要浏览器。
{
  const REQUIRED_KEYS = ['colors', 'typography', 'rounded', 'spacing', 'components'];
  const bad = [];
  if (!generated.length) skip('设计文档', '没有生成物');
  else {
    for (const g of generated) {
      const file = join(g.dir, 'DESIGN.md');
      if (!existsSync(file)) { bad.push(`${g.persona}: 缺 DESIGN.md`); continue; }
      const text = readFileSync(file, 'utf8');
      const fence = text.match(/^---\n([\s\S]*?)\n---\n/);
      if (!fence) { bad.push(`${g.persona}: 缺 YAML frontmatter`); continue; }
      const yaml = fence[1];

      // 逐行解析：顶级键（顶格）→ 二级键（两个空格）。不用 lookahead，避免 m 模式下 $ 的歧义。
      const sections = {};
      let cur = null;
      for (const line of yaml.split('\n')) {
        const top = line.match(/^([a-z][\w-]*):\s*$/);
        if (top) { cur = top[1]; sections[cur] = new Set(); continue; }
        const second = line.match(/^ {2}([A-Za-z][\w-]*):/);
        if (second && cur) sections[cur].add(second[1]);
      }

      for (const key of REQUIRED_KEYS) {
        if (!sections[key]) { bad.push(`${g.persona}: frontmatter 缺 ${key}`); continue; }
        if (!sections[key].size) bad.push(`${g.persona}: ${key} 是空的`);
      }
      // 派生失败的典型症状：对象被字符串化
      if (text.includes('[object Object]')) bad.push(`${g.persona}: 出现 [object Object]（色值没转成字符串）`);

      // 令牌引用必须能解析：{colors.x} / {typography.y} / {rounded.z}
      const refs = [...text.matchAll(/\{([a-z]+)\.([\w-]+)\}/g)];
      for (const [, group, name] of refs) {
        const pool = sections[group];
        if (!pool) { bad.push(`${g.persona}: 未知引用组 {${group}}`); continue; }
        if (!pool.has(name)) bad.push(`${g.persona}: 引用 {${group}.${name}} 不存在`);
      }
      if (!refs.length) bad.push(`${g.persona}: components 里没有任何令牌引用`);

      // 正文必须交代「以 tokens.css 为准」，否则这份文档会被当成第二真相
      if (!text.includes('tokens.css')) bad.push(`${g.persona}: 正文没有指向 tokens.css`);
      // 必须写明不可协商的无障碍下限，否则它只是「风格描述」
      if (!text.includes('Accessibility floors')) bad.push(`${g.persona}: 缺 Accessibility floors 一节`);
    }
    if (bad.length) fail('设计文档', [...new Set(bad)].join(' | '));
    else pass('设计文档', `${generated.length} 套 DESIGN.md：frontmatter 完整、令牌引用全部可解析、无对象字符串化`);
  }
}

// ---------- 3. 对比度 ----------
{
  const contrast = join(SCRIPTS, 'contrast_check.py');
  if (!pyOk) skip('对比度', '本机没有 python');
  else if (!generated.length) skip('对比度', '没有生成物');
  else {
    const bad = [];
    let total = 0;
    for (const g of generated) {
      const r = spawnSync(PY, [...PYA, contrast, g.dir], { encoding: 'utf8', env: { ...process.env, PYTHONIOENCODING: 'utf-8' } });
      const tail = ((r.stdout || '') + (r.stderr || '')).split('\n').filter((l) => l.includes('合计')).pop() || '';
      const m = tail.match(/合计：(\d+) 组，(\d+) 组未达标/);
      if (r.status !== 0 || (m && Number(m[2]) > 0)) bad.push(`${g.persona}: ${tail.trim() || 'exit ' + r.status}`);
      else if (m) total += Number(m[1]);
    }
    if (bad.length) fail('对比度', bad.join(' | '));
    else pass('对比度', `${generated.length} 套共 ${total} 组配对，0 组未达标`);
  }
}

// ---------- 4. 审计 ----------
// ESM 的 import() 不认 NODE_PATH，用 createRequire 才与 audit.mjs 看到同一个包
const req = createRequire(import.meta.url);
let playwrightPath = null;
for (const name of ['playwright', 'playwright-core']) {
  try { playwrightPath = req.resolve(name); break; } catch { /* 继续找下一个 */ }
}
if (skipAudit) skip('审计', '按 --skip-audit 要求');
else if (!playwrightPath) skip('审计', '没有 playwright（npm i -D playwright && npx playwright install chromium）');
else if (!generated.length) skip('审计', '没有生成物');
else {
  const MIME = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.json': 'application/json; charset=utf-8', '.svg': 'image/svg+xml' };
  // 生成物统共几十 KB，启动时全读进内存：多视口、多主题审计反复读同一批文件，
  // 走磁盘既慢，又会在 Windows 上偶发 readFile 失败 —— 那会被 catch 成 404，
  // 页面缺 CSS 直接炸出一片假错误（20 error + 1 HTTP，且只随机命中一套）。
  const cache = new Map();
  const preload = (dir, prefix = '') => {
    for (const e of readdirSync(dir, { withFileTypes: true })) {
      const abs = join(dir, e.name);
      const urlPath = `${prefix}/${e.name}`;
      if (e.isDirectory()) preload(abs, urlPath);
      else if (MIME[extname(e.name)]) {
        try {
          cache.set(urlPath, { body: readFileSync(abs), type: MIME[extname(e.name)] });
        } catch {
          /* 读不到就不进缓存，请求时自然 404 */
        }
      }
    }
  };
  preload(outDir);
  const fontScale = [12, 14, 16, 18, 20, 24, 32, 40];
  const radiusScale = [4, 6, 8, 12, 16];
  const badDesign = `<div class="row" style="gap:13px">${fontScale.map((size) => `<span style="font-size:${size}px">字号 ${size}</span>`).join('')}</div><div class="row" style="gap:13px">${radiusScale.map((radius, i) => `<article class="card" style="padding:13px;border-radius:${radius}px;box-shadow:0 ${i % 4 + 1}px ${i % 4 + 2}px rgba(0,0,0,.15)">圆角与阴影 ${i + 1}</article>`).join('')}</div>`;
  const designFixture = (content) => `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>设计体系自检</title><style>*{box-sizing:border-box;margin:0}body{font:16px/1.5 Arial;color:#1f2937;background:#fff}h1{font-size:32px}main{padding:16px}.row{display:flex;flex-wrap:wrap;gap:16px}.card{width:160px;min-height:64px;padding:16px;border-radius:8px;box-shadow:0 2px 4px rgba(0,0,0,.15)}</style></head><body><main><h1>设计体系回归测试</h1>${content}</main></body></html>`;
  for (const [name, content] of Object.entries({
    good: '<article class="card">合规档位与间距</article>',
    bad: badDesign,
    ignored: `<section data-fidelity-ignore="design-system">${badDesign}</section>`,
  })) cache.set(`/design-${name}.html`, { body: Buffer.from(designFixture(content)), type: MIME['.html'] });
  const server = createServer((req, res) => {
    const p = decodeURIComponent((req.url || '/').split('?')[0]);
    const hit = cache.get(p);
    if (!hit) { res.writeHead(404).end('not found'); return; }
    res.writeHead(200, { 'content-type': hit.type }).end(hit.body);
  });
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  const port = server.address().port;
  const audit = join(SCRIPTS, 'audit.mjs');
  const bad = [];
  let combos = 0;
  try {
    // 页面 × 人格的审计矩阵：核心页跑满五套；电商与移动形态页只跑两套（差异来自令牌，两套覆盖冷暖两端）。
    const scopedPersonas = (pg) => AUDIT_SCOPE[pg] || personas;
    const tasks = [];
    for (const g of generated) {
      for (const pg of PAGES_HTML) {
        if (!scopedPersonas(pg).includes(g.persona)) continue;
        tasks.push({ persona: g.persona, pg });
      }
    }
    // 并发跑：每个 audit 自带一个浏览器，4 路并发在普通开发机上是安全的，
    // 串行跑 300 组会超过 10 分钟，长到没人愿意在本地执行。
    const CONCURRENCY = 4;
    let cursor = 0;
    async function auditWorker() {
      while (cursor < tasks.length) {
        const t = tasks[cursor++];
        const r = await runNodeAsync([audit, '--url', `http://127.0.0.1:${port}/${t.persona}/${t.pg}`, '--themes', 'light,dark', '--viewports', 'desktop,tablet,mobile', '--out', join(outDir, `audit-${t.persona}-${t.pg}.json`)]);
        combos += 6;
        const out = r.out || '';
        const line = out.split('\n').filter((l) => l.includes('合计')).pop() || '';
        if (r.status !== 0 || !/合计：0 错误 \/ 0 警告/.test(line)) bad.push(`${t.persona}/${t.pg}: ${line.trim() || 'exit ' + r.status}`);
      }
    }
    await Promise.all(Array.from({ length: Math.min(CONCURRENCY, tasks.length) }, auditWorker));
    if (bad.length) fail('审计', bad.join(' | '));
    else {
      const scopedPages = Object.keys(AUDIT_SCOPE).filter((p) => PAGES_HTML.includes(p));
      const scopedRuns = scopedPages.reduce((n, p) => n + AUDIT_SCOPE[p].filter((x) => generated.some((g) => g.persona === x)).length, 0);
      const coreRuns = tasks.length - scopedRuns;
      pass(
        '审计',
        `${tasks.length} 次页面渲染 × 三视口 × 明暗 = ${combos} 组 0 错误 / 0 警告（核心 ${PAGES_HTML.length - scopedPages.length} 页 × ${generated.length} 套 = ${coreRuns * 6}，限定页 ${scopedPages.length} 页 × 2 套 = ${scopedRuns * 6}；${CONCURRENCY} 路并发）`,
      );
    }

    // 新门默认只给警告；strict、项目允许列表与忽略边界也必须能复现。
    {
      try {
        const { normalizeDesignSystem } = await import('./audit.mjs');
        assert.equal(normalizeDesignSystem().spacingBase, 4);
        for (const input of [null, [], { unknown: 1 }, { spacingBase: 0 }, { tolerance: 2 }, { fontSizes: [] }, { radii: [-1] }, { maxShadows: -1 }, { ignoreSelectors: [''] }]) {
          assert.throws(() => normalizeDesignSystem(input), `应拒绝配置 ${JSON.stringify(input)}`);
        }
        const allowedPath = join(outDir, 'design-allowed.json');
        writeFileSync(allowedPath, JSON.stringify({ fontSizes: fontScale, spacingValues: [13, 16], radii: radiusScale, maxShadows: 4 }), 'utf8');
        const cases = [
          { name: '合规', page: 'good', args: ['--design-system', '--strict-design-system'], status: 0, checks: [] },
          { name: '越档警告', page: 'bad', args: ['--design-system'], status: 0, checks: ['font-sizes', 'spacing', 'radii', 'shadows'], level: 'warn' },
          { name: '严格拦截', page: 'bad', args: ['--design-system', '--strict-design-system'], status: 1, checks: ['font-sizes', 'spacing', 'radii', 'shadows'], level: 'error' },
          { name: '允许列表', page: 'bad', args: ['--design-system', allowedPath, '--strict-design-system'], status: 0, checks: [] },
          { name: '忽略区域', page: 'ignored', args: ['--design-system', '--strict-design-system'], status: 0, checks: [] },
          { name: '未启用', page: 'bad', args: [], status: 0, checks: [] },
        ];
        for (const [i, test] of cases.entries()) {
          const reportPath = join(outDir, `design-case-${i}.json`);
          const result = await runNodeAsync([audit, '--url', `http://127.0.0.1:${port}/design-${test.page}.html`, '--viewports', 'desktop', '--themes', 'light', '--no-axe', '--out', reportPath, ...test.args]);
          assert.equal(result.status, test.status, `${test.name} 退出码：${result.out.slice(-500)}`);
          const report = JSON.parse(readFileSync(reportPath, 'utf8'));
          assert.equal(report.targets.length, 1, `${test.name} 应只有一个渲染组合`);
          const issues = report.targets[0].issues.filter((issue) => issue.check.startsWith('design-system-'));
          assert.deepEqual(issues.map((issue) => issue.check).sort(), test.checks.map((check) => `design-system-${check}`).sort(), `${test.name} 设计体系检查类型`);
          if (test.level) assert.ok(issues.every((issue) => issue.level === test.level), `${test.name} 级别`);
          if (test.page === 'ignored') assert.ok(report.targets[0].designSystem.ignoredElements > 0, '忽略区域必须记入统计');
          if (!test.args.length) assert.equal(report.options.designSystem, null, '未启用不能偷偷插入新门');
        }
        const invalid = await runNodeAsync([audit, '--url', `http://127.0.0.1:${port}/design-good.html`, '--strict-design-system']);
        assert.equal(invalid.status, 2, 'strict 单独启用应是参数错误');
        pass('设计体系回归', '6 个浏览器正反例 + 无效配置与 strict 参数反例');
      } catch (e) { fail('设计体系回归', e.message); }
    }

    // 流程验收：拿示例 flow 跑一遍骨架，确保 flow.mjs 自身没坏（复用同一台静态服务）
    {
      const g0 = generated[0];
      const fout = join(outDir, 'flow');
      const fr = await runNodeAsync([
        join(SCRIPTS, 'flow.mjs'),
        '--flow', join(SCRIPTS, 'flow.example.json'),
        '--base', `http://127.0.0.1:${port}/${g0.persona}`,
        '--out', fout,
      ]);
      const tail = (fr.out || '').split('\n').filter((l) => l.includes('合计')).pop() || '';
      const m = tail.match(/共 (\d+) 步/);
      if (fr.status === 0) pass('流程', `示例流程 ${m ? m[1] + ' 步' : ''}全过（${g0.persona}）`);
      else fail('流程', (tail.trim() || `exit ${fr.status}`).slice(0, 200));

      // 移动端焦点流程：验证 expectFocus / expectFocusVisible 与原生 dialog 关闭
      const fm = await runNodeAsync([
        join(SCRIPTS, 'flow.mjs'),
        '--flow', join(SCRIPTS, 'flow.mobile.example.json'),
        '--base', `http://127.0.0.1:${port}/${g0.persona}`,
        '--out', join(outDir, 'flow-mobile'),
      ]);
      const fmTail = (fm.out || '').split('\n').filter((l) => l.includes('合计')).pop() || '';
      if (fm.status === 0) pass('流程（移动端焦点）', fmTail.trim());
      else fail('流程（移动端焦点）', (fmTail.trim() || `exit ${fm.status}`).slice(0, 200));

      // 电商流程：选 SKU → 加购 → 购物车改量/删行/优惠码 → 结算校验
      const fc = await runNodeAsync([
        join(SCRIPTS, 'flow.mjs'),
        '--flow', join(SCRIPTS, 'flow.commerce.example.json'),
        '--base', `http://127.0.0.1:${port}/${['rational', 'warm'].find((p) => generated.some((g) => g.persona === p)) || g0.persona}`,
        '--out', join(outDir, 'flow-commerce'),
      ]);
      const fcTail = (fc.out || '').split('\n').filter((l) => l.includes('合计')).pop() || '';
      if (fc.status === 0) pass('流程（电商）', fcTail.trim());
      else fail('流程（电商）', (fcTail.trim() || `exit ${fc.status}`).slice(0, 200));

      // 订单流程：列表筛选 → 状态机流转 → 退款申请 → 取消
      const fo = await runNodeAsync([
        join(SCRIPTS, 'flow.mjs'),
        '--flow', join(SCRIPTS, 'flow.order.example.json'),
        '--base', `http://127.0.0.1:${port}/${['rational', 'warm'].find((p) => generated.some((g) => g.persona === p)) || g0.persona}`,
        '--out', join(outDir, 'flow-order'),
      ]);
      const foTail = (fo.out || '').split('\n').filter((l) => l.includes('合计')).pop() || '';
      if (fo.status === 0) pass('流程（订单）', foTail.trim());
      else fail('流程（订单）', (foTail.trim() || `exit ${fo.status}`).slice(0, 200));
    }
  } finally {
    server.close();
  }
}

// ---------- 4.5 框架栈（React / Vue） ----------
// 目标不是「能生成」而是「生成物自洽」：合成一个 --stack all 的产物，逐文件过 TSX/TS 语法，
// 再从 CSS 抽出全部类名，检查框架组件里引用的类名一个都不缺。
{
  const root = resolve(SCRIPTS, '..');
  const dir = join(outDir, 'stack');
  const r = await runNodeAsync([join(SCRIPTS, 'scaffold.mjs'), '--persona', 'rational', '--stack', 'all', '--pages', 'landing,app,catalog', '--out', dir, '--quiet']);
  if (r.status !== 0) fail('框架栈', 'scaffold --stack all 失败：' + (r.out || '').slice(0, 200));
  else {
    let esbuild;
    try { esbuild = createRequire(import.meta.url)('esbuild'); } catch { esbuild = null; }
    const files = [];
    const walk = (p) => {
      for (const e of readdirSync(p, { withFileTypes: true })) {
        const abs = join(p, e.name);
        if (e.isDirectory()) { if (e.name !== 'node_modules') walk(abs); }
        else if (/\.(tsx?|vue)$/.test(e.name)) files.push(abs);
      }
    };
    for (const s of ['react', 'vue']) { try { walk(join(dir, s)); } catch { /* 没生成就跳过 */ } }
    const syntaxBad = [];
    if (esbuild) {
      for (const f of files) {
        let code = readFileSync(f, 'utf8');
        if (f.endsWith('.vue')) {
          // 不能正则取脚本块：generic="T extends Record<string, unknown>" 里带 '>'，
          // 会把这个 '>' 当成标签结束。这里按行取（生成物里 <script …> 恒为第一行）。
          const lines = code.split('\n');
          if (!/^<script/.test(lines[0])) continue;
          code = lines.slice(1).join('\n');
          const end = code.indexOf('</script>');
          if (end >= 0) code = code.slice(0, end);
        }
        try { esbuild.transformSync(code, { loader: f.endsWith('.tsx') ? 'tsx' : 'ts' }); }
        catch (e) { syntaxBad.push(`${basename(f)}: ${String(e.message).split('\n')[0]}`); }
      }
    }
    // 类名对齐：CSS 里定义的 → 框架代码里引用的，缺一个都算错
    const css = readFileSync(join(dir, 'react', 'src', 'styles', 'components.css'), 'utf8')
      + readFileSync(join(dir, 'react', 'src', 'styles', 'catalog.css'), 'utf8')
      + readFileSync(join(dir, 'react', 'src', 'styles', 'depth.css'), 'utf8');
    const defined = new Set();
    for (const m of css.matchAll(/\.([a-zA-Z][a-zA-Z0-9_-]*)/g)) defined.add(m[1]);
    const used = new Set();
    for (const f of files) {
      const code = readFileSync(f, 'utf8');
      for (const m of code.matchAll(/class(?:Name)?=(?:"([^"]*)"|\{([^}]*)\}|"([^"]*)")/g)) {
        for (const raw of [m[1], m[2], m[3]]) {
          if (!raw) continue;
          for (const tok of raw.replace(/[{}`'"]/g, ' ').split(/\s+/)) {
            if (tok.endsWith('--') || tok.endsWith('__')) continue; // 'tag--' + tone 这类拼接前缀
            if (/^[a-z][a-z0-9-]*$/.test(tok) && (tok.includes('--') || tok.includes('__') || tok.startsWith('kpi__') || tok.startsWith('cat__'))) used.add(tok);
          }
        }
      }
    }
    const missing = [...used].filter((c) => !defined.has(c) && !['t-right', 'is-open'].includes(c));
    if (files.length < 20) fail('框架栈', `只生成了 ${files.length} 个 tsx/ts/vue 文件`);
    else if (syntaxBad.length || missing.length) fail('框架栈', [...syntaxBad.slice(0, 3), ...(missing.length ? ['未定义类名：' + missing.join(', ')] : [])].join(' | '));
    else if (!esbuild) skip('框架栈', `已生成 ${files.length} 个文件且类名引用对齐，但没装 esbuild，跳过语法检查`);
    else pass('框架栈', `${files.length} 个 tsx/ts/vue 语法通过，类名引用 ${used.size} 个全部有定义`);
  }
}
// ---------- 4.7 Agent 适配器 ----------
{
  const dir = join(outDir, 'adapters');
  const adapter = join(SCRIPTS, 'agent-adapter.mjs');
  const first = await runNodeAsync([adapter, '--target', 'all', '--out', dir, '--check']);
  const second = await runNodeAsync([adapter, '--target', 'all', '--out', dir]);
  const bad = await runNodeAsync([adapter, '--target', 'nope']);
  const files = ['AGENTS.md', 'GEMINI.md', '.cursor/rules/frontend-fidelity.mdc', '.windsurf/rules/frontend-fidelity.md',
    '.clinerules/frontend-fidelity.md', '.roo/rules/frontend-fidelity.md', '.continue/rules/frontend-fidelity.md',
    '.openhands/microagents/frontend-fidelity.md', 'CONVENTIONS.md', '.rules', 'FRONTEND-FIDELITY.md'];
  const missing = files.filter((f) => !existsSync(join(dir, f)));
  if (first.status !== 0) fail('Agent 适配器', `首次生成失败：${(first.out || '').slice(-200)}`);
  else if (missing.length) fail('Agent 适配器', `缺文件：${missing.join(', ')}`);
  else if (second.status !== 0 || !/未变 11/.test(second.out)) fail('Agent 适配器', '重复执行不幂等');
  else if (bad.status !== 2) fail('Agent 适配器', `未知 target 应退出 2，实际 ${bad.status}`);
  else pass('Agent 适配器', `11 个入口 + 幂等 + 未知 target 退出 2`);
}

// ---------- 5. 文档门 ----------
{
  try {
    const expected = { sites: 27, groupA: 24, distillations: 16, scripts: 13 };
    assert.equal(documentNumber('十四'), 14);
    assert.equal(documentNumber('十'), 10);
    assert.equal(documentNumber('二十七'), 27);
    assert.equal(documentNumber('27'), 27);
    assert.deepEqual(documentCountIssues('27个实测站 + 十六份单站蒸馏 + 十三个能直接跑的脚本 / A 组24', expected), []);
    assert.equal(documentCountIssues('25个实测站 + 十四份单站蒸馏 + 十个能直接跑的脚本 / A 组22', expected).length, 4);
    assert.deepEqual(documentCountIssues('```md\n25个实测站\n```\n18 站基线', expected), []);
    const evidence = '## 二、跨站统计（基线）\n- 正文字号：均值 **14.7px**\n- H1：均值 **69.8px**\n## 三、其他\n';
    assert.deepEqual(frozenMeans(evidence), { body: 14.7, h1: 69.8 });
    assert.throws(() => frozenMeans('基准不可解析'));
    assert.throws(() => requiredDocument(outDir, 'missing-baseline.md'));
    assert.deepEqual(readmeMeanIssues('| 正文字号 | 均值 **14.7px** |\n正文 14.7px、H1 69.8px', frozenMeans(evidence)), []);
    assert.equal(readmeMeanIssues('正文 14.8px、H1 72.6px', frozenMeans(evidence)).length, 2);
    assert.equal(readmeMeanIssues('缺少均值', frozenMeans(evidence)).length, 2);
    assert.deepEqual(markdownFileLinks('[文件](../README.md#标题)\n[远程](https://example.invalid/a)\n[锚点](#foo)\n`[示例](missing.md)`\n> ```md\n> [示例](missing.md)\n> ```\n[引用]: ../SKILL.md'), [{ path: '../README.md', line: 1 }, { path: '../SKILL.md', line: 8 }]);
    assert.deepEqual(markdownFileLinks('[缺失](missing.md)\n[文件](<a b.md> "说明")'), [{ path: 'missing.md', line: 1 }, { path: 'a b.md', line: 2 }]);
    const good = '## 未发布\n## v1.10.0 - 2026-10-27\n## v1.9.9 — 2026-10-27\n## v1.9.8 - 2024-02-29';
    assert.deepEqual(changelogIssues(good, '2026-10-31'), []);
    for (const bad of ['## v1.0.0 - 2026-11-09', '## v1.0.0 - 2026-02-30', '## v1.0.0 - 2025-02-29', '## v1.0.0', '## v1.0.0 日期不规范', '## v1.0.0 - 2026-13-01', '## v1.01.0 - 2026-10-27', '## v1.x.0 - 2026-10-27', '## v1.0.0 - 2026-10-25\n## v0.9.0 - 2026-10-26', '## v1.9.0 - 2026-10-27\n## v1.10.0 - 2026-10-27', '## v1.0.0 - 2026-10-27\n## v1.0.0 - 2026-10-27']) {
      assert.ok(changelogIssues(bad, '2026-10-31').length, `应拒绝：${bad}`);
    }
    pass('文档规则回归', '中英计数 / 冻结均值 / 代码块与相对链接 / 日期与版本顺序正反例');
  } catch (e) { fail('文档规则回归', e.message); }
}
{
  const ROOT = resolve(SCRIPTS, '..');
  const files = ['README.md', 'SKILL.md', 'references/design-evidence.md', 'references/craft-floor.md', 'references/visual-system.md', 'references/workflow.md', 'docs/reference-sites.md', 'docs/scripts.md'];
  try {
    const texts = new Map(files.map((rel) => [rel, requiredDocument(ROOT, rel)]));
    const evidence = texts.get('references/design-evidence.md');
    const mAll = evidence.match(/采集成功\s*(\d+)\s*个站/);
    const mA = evidence.match(/A 组\s*(\d+)/);
    if (!mAll || !mA) throw new Error('design-evidence.md 缺少「采集成功 N 个站 / A 组 N」基准');
    const refs = join(ROOT, 'references');
    const specials = ['mastergo-b2b.md', 'vercel-auth.md', 'applestore-commerce.md', 'holynova-motion.md', 'luckymaomi-catalog.md', 'muzli-gallery.md'];
    for (const name of specials) requiredDocument(refs, name);
    const singleSite = readdirSync(refs).filter((f) => f.endsWith('-design.md') || specials.includes(f));
    const expected = {
      sites: Number(mAll[1]), groupA: Number(mA[1]), distillations: singleSite.length,
      scripts: readdirSync(SCRIPTS, { withFileTypes: true }).filter((e) => e.isFile() && /\.(mjs|py)$/.test(e.name)).length,
    };
    const bad = [];
    for (const [rel, text] of texts) bad.push(...documentCountIssues(text, expected).map((issue) => `${rel}: ${issue}`));
    const means = frozenMeans(evidence);
    bad.push(...readmeMeanIssues(texts.get('README.md'), means));
    if (bad.length) fail('文档数字', [...new Set(bad)].join(' | '));
    else pass('文档数字', `${expected.sites} 站 / A 组 ${expected.groupA} / 磁盘蒸馏 ${expected.distillations} 份 / 顶层脚本 ${expected.scripts} 个；冻结均值 ${means.body}/${means.h1}px`);
  } catch (e) { fail('文档数字', e.message); }

  // 参考库索引：超过 40KB 的单份参考必须自带分节索引。
  // 理由：路由表只能把 agent 带到「文件」，带不到「第几节」；没有索引就得整读 80KB。
  try {
    const refDir = join(ROOT, 'references');
    const LIMIT = 40000;
    const big = readdirSync(refDir)
      .filter((f) => f.endsWith('.md'))
      .map((f) => ({ f, size: statSync(join(refDir, f)).size }))
      .filter((x) => x.size > LIMIT);
    const issues = [];
    for (const { f, size } of big) {
      const text = readFileSync(join(refDir, f), 'utf8');
      const head = text.split('\n').slice(0, 60).join('\n');
      if (!/^## 索引/m.test(head)) {
        issues.push(`${f}（${Math.round(size / 1024)}KB）前 60 行没有「## 索引」`);
        continue;
      }
      // 索引表的行数要覆盖得住正文的节数，否则是假索引
      const sections = (text.match(/^## (?!索引)/gm) || []).length;
      const rows = (head.match(/^\| §/gm) || []).length;
      if (rows < sections - 1) issues.push(`${f}：正文 ${sections} 节，索引只列了 ${rows} 行`);
    }
    if (issues.length) fail('参考库索引', issues.join(' | '));
    else pass('参考库索引', big.length ? `${big.length} 份超 40KB 的参考都有分节索引：${big.map((x) => x.f).join(' / ')}` : '没有超 40KB 的单份参考');
  } catch (e) { fail('参考库索引', e.message); }

  // 参考库快照：必须带日期、日期不能是未来、每个站点要有可比对的关键值。
  // 这一门防的是「有人手改快照把漂移抹掉」，以及「冻结时漏写 capturedAt」。
  try {
    const snapPath = join(ROOT, 'references', 'reference-snapshot.json');
    if (!existsSync(snapPath)) throw new Error('缺少 references/reference-snapshot.json');
    const snap = JSON.parse(readFileSync(snapPath, 'utf8'));
    const issues = [];
    if (!/^\d{4}-\d{2}-\d{2}$/.test(String(snap.capturedAt || ''))) {
      issues.push(`capturedAt 必须是 YYYY-MM-DD，收到「${snap.capturedAt}」`);
    } else if (new Date(`${snap.capturedAt}T00:00:00Z`) > new Date()) {
      issues.push(`capturedAt ${snap.capturedAt} 在未来`);
    }
    if (!snap.method || !snap.note) issues.push('缺 method 或 note（口径必须写清，否则快照没法复核）');
    const sites = snap.sites && typeof snap.sites === 'object' ? Object.keys(snap.sites) : [];
    if (!sites.length) issues.push('sites 为空');
    for (const name of sites) {
      const s = snap.sites[name];
      if (!s || typeof s !== 'object') { issues.push(`${name} 不是对象`); continue; }
      // 关键值至少要有一项是数字，否则这一站冻结了也没法比漂移
      const numeric = ['h1', 'body', 'control'].filter((k) => typeof s[k] === 'number');
      if (!numeric.length) issues.push(`${name} 没有可比对的数值（h1 / body / control 全空）`);
    }
    if (issues.length) fail('参考库快照', issues.join(' | '));
    else pass('参考库快照', `capturedAt ${snap.capturedAt} · ${sites.length} 站 · 带 method 与 note`);
  } catch (e) { fail('参考库快照', e.message); }

  try {
    const markdown = readdirSync(ROOT).filter((f) => f.endsWith('.md'));
    const walk = (dir) => {
      for (const e of readdirSync(join(ROOT, dir), { withFileTypes: true })) {
        const rel = join(dir, e.name);
        if (e.isDirectory()) walk(rel);
        else if (e.isFile() && e.name.endsWith('.md')) markdown.push(rel);
      }
    };
    for (const dir of ['docs', 'references']) walk(dir);
    const bad = [];
    let count = 0;
    for (const rel of markdown) {
      for (const link of markdownFileLinks(requiredDocument(ROOT, rel))) {
        count++;
        let path;
        try { path = decodeURIComponent(link.path); }
        catch { bad.push(`${rel}:${link.line}: 链接路径编码无效 ${link.path}`); continue; }
        if (!existsSync(resolve(ROOT, dirname(rel), path))) bad.push(`${rel}:${link.line}: 文件链接不存在 ${link.path}`);
      }
    }
    if (bad.length) fail('文档链接', bad.join(' | '));
    else pass('文档链接', `${markdown.length} 份 Markdown / ${count} 个相对文件链接（不检查远程与锚点）`);
  } catch (e) { fail('文档链接', e.message); }

  try {
    const now = new Date();
    const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    const bad = changelogIssues(requiredDocument(ROOT, 'CHANGELOG.md'), today);
    if (bad.length) fail('历史日期与版本顺序', bad.join(' | '));
    else pass('历史日期与版本顺序', `日期合法、非未来且从新到旧；版本严格递减（今天 ${today}）`);
  } catch (e) { fail('历史日期与版本顺序', e.message); }
}

// ---------- 6. 版本号一致 ----------
{
  const ROOT = resolve(SCRIPTS, '..');
  try {
    const want = JSON.parse(requiredDocument(ROOT, 'package.json')).version;
    if (!/^\d+\.\d+\.\d+$/.test(want || '')) throw new Error('package.json 没有合法 version 字段');
    const targets = {
      'README.md': [/^`v(\d+\.\d+\.\d+)`/m, /--ref v(\d+\.\d+\.\d+)/, /当前是 \[v(\d+\.\d+\.\d+)\]/],
      'install.sh': [/--ref v(\d+\.\d+\.\d+)/],
      'CHANGELOG.md': [/^## v(\d+\.\d+\.\d+)/m],
    };
    const bad = [];
    for (const [rel, regs] of Object.entries(targets)) {
      const text = requiredDocument(ROOT, rel);
      for (const re of regs) {
        const m = text.match(re);
        if (!m) bad.push(`${rel}: 缺少版本指针 ${re}`);
        else if (m[1] !== want) bad.push(`${rel}: v${m[1]} 应为 v${want}`);
      }
    }
    if (bad.length) fail('版本号', [...new Set(bad)].join(' | '));
    else pass('版本号', `package.json / README / install.sh / CHANGELOG 首条均为 v${want}`);
  } catch (e) { fail('版本号', e.message); }
}

// ---------- 汇总 ----------
const failed = results.filter((r) => !r.ok);
console.log('');
if (failed.length) {
  console.log(`${C.bad}自检失败：${failed.length} 项${C.off}`);
  if (!keep) rmSync(outDir, { recursive: true, force: true });
  process.exit(1);
}
if (skipped.length) console.log(`${C.dim}已执行检查通过，但自检未完整执行：${skipped.map((r) => `${r.step}（${r.msg}）`).join('；')}${C.off}`);
else console.log(`${C.ok}自检通过（全部检查已执行）${C.off}`);
if (keep) console.log(`生成物保留在 ${outDir}`);
if (!keep) rmSync(outDir, { recursive: true, force: true });