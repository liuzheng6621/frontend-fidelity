#!/usr/bin/env node
/**
 * selfcheck.mjs — 一键自检（给贡献者与 CI 用，不依赖具体项目）
 *
 * 它按顺序做这些检查，任何一步失败都以非 0 退出：
 *   1. 语法：node --check 所有 scripts/*.mjs；python -m py_compile 所有 scripts/*.py
 *   2. 生成：五套人格 × 六类页面（含 --dark）各生成一遍到临时目录
 *   3. 对比度：对每个生成物跑 contrast_check.py，不达标即失败
 *   4. 审计：装了 playwright 就起本地服务跑 audit.mjs（明暗双主题），没有就跳过并说明
 *   4.5 框架栈：`--stack all` 生成 React/Vue，逐文件过 TSX/TS 语法 + 类名对齐（CSS 里没有的类名=错）
 *   5. 文档数字：参考库站点数在四份文档里必须一致
 *   6. 版本号：package.json / README / install.sh / CHANGELOG 首条必须同版
 *
 * 用法：
 *   node scripts/selfcheck.mjs                 # 全跑（无 playwright 时自动跳过审计）
 *   node scripts/selfcheck.mjs --skip-audit    # 只跑语法 + 生成 + 对比度（CI 用，秒级）
 *   node scripts/selfcheck.mjs --personas rational,print
 *   node scripts/selfcheck.mjs --keep          # 保留临时目录，便于看生成物
 */
import { spawn, spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, readdirSync, readFileSync, rmSync } from 'node:fs';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { basename } from 'node:path';
import { extname, join, resolve } from 'node:path';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';

const HERE = new URL('.', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');
const SCRIPTS = resolve(HERE);
const ALL_PERSONAS = ['rational', 'editorial', 'warm', 'print', 'magazine'];
const PAGES = ['landing', 'catalog', 'app', 'form', 'auth', 'states'];
const PAGES_HTML = ['index.html', 'catalog.html', 'app.html', 'form.html', 'auth.html', 'states.html'];

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
const skip = (step, msg) => console.log(`${C.dim}· ${step} 跳过：${msg}${C.off}`);

function hasCmd(cmd, args = ['--version']) {
  // 不要开 shell：Node >=22 会抛 DEP0190 弃用警告，CI 与 pwsh 都会把它当成失败
  try {
    const r = spawnSync(cmd, args, { stdio: 'ignore' });
    return r.status === 0;
  } catch {
    return false;
  }
}
const PY = process.platform === 'win32' ? 'python' : 'python3';
const pyOk = hasCmd(PY);

// ---------- 1. 语法 ----------
{
  const mjs = readdirSync(SCRIPTS).filter((f) => f.endsWith('.mjs'));
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
      const r = spawnSync(PY, ['-m', 'py_compile', join(SCRIPTS, f)], { encoding: 'utf8' });
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
    const r = spawnSync(process.execPath, [scaffold, '--persona', p, '--pages', PAGES.join(','), '--dark', '--out', dir, '--quiet'], { encoding: 'utf8' });
    if (r.status !== 0) { bad.push(`${p}: exit ${r.status} ${(r.stderr || '').split('\n')[0]}`); continue; }
    const missing = ['tokens.css', 'base.css', 'components.css', 'depth.css', 'catalog.css', 'ui.js', ...PAGES_HTML].filter((f) => !existsSync(join(dir, f)));
    if (missing.length) bad.push(`${p}: 缺 ${missing.join(',')}`);
    else generated.push({ persona: p, dir });
  }
  if (bad.length) fail('生成', bad.join(' | '));
  else pass('生成', `${generated.length} 套 × ${PAGES.length} 页 → ${outDir}`);
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
      const r = spawnSync(PY, [contrast, g.dir], { encoding: 'utf8', env: { ...process.env, PYTHONIOENCODING: 'utf-8' } });
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
  const server = createServer(async (req, res) => {
    try {
      const p = decodeURIComponent((req.url || '/').split('?')[0]);
      const file = resolve(outDir, '.' + p);
      if (!file.startsWith(resolve(outDir))) { res.writeHead(403).end(); return; }
      const body = await readFile(file);
      res.writeHead(200, { 'content-type': MIME[extname(file)] || 'application/octet-stream' }).end(body);
    } catch { res.writeHead(404).end('not found'); }
  });
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  const port = server.address().port;
  const audit = join(SCRIPTS, 'audit.mjs');
  const bad = [];
  let combos = 0;
  try {
    for (const g of generated) {
      for (const pg of PAGES_HTML) {
        const r = await runNodeAsync([audit, '--url', `http://127.0.0.1:${port}/${g.persona}/${pg}`, '--themes', 'light,dark']);
        combos += 2;
        const out = r.out || '';
        const line = out.split('\n').filter((l) => l.includes('合计')).pop() || '';
        if (r.status !== 0 || !/合计：0 错误 \/ 0 警告/.test(line)) bad.push(`${g.persona}/${pg}: ${line.trim() || 'exit ' + r.status}`);
      }
    }
    pass('审计', bad.length ? '' : `${generated.length} 套 × ${PAGES.length} 页 × 明暗 = ${combos} 组 0 错误 / 0 警告`);
    if (bad.length) fail('审计', bad.join(' | '));
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
    else if (!esbuild) skip('框架栈', `已生成 ${files.length} 个文件，但没装 esbuild，跳过语法检查`);
    else if (syntaxBad.length || missing.length) fail('框架栈', [...syntaxBad.slice(0, 3), ...(missing.length ? ['未定义类名：' + missing.join(', ')] : [])].join(' | '));
    else pass('框架栈', `${files.length} 个 tsx/ts/vue 语法通过，类名引用 ${used.size} 个全部有定义`);
  }
}
// ---------- 5. 文档数字一致 ----------
// 参考库的站点数在 README / SKILL / design-evidence 里各写了一遍，最容易悄悄漂。
// 以 design-evidence.md 为准，其他文件里出现的「N 个真实站」「N 个实测站点」「A 组 N」必须与它一致。
{
  const ROOT = resolve(SCRIPTS, '..');
  const read = (rel) => readFile(join(ROOT, rel), 'utf8').catch(() => '');
  const evidence = await read('references/design-evidence.md');
  const mAll = evidence.match(/采集成功\s*(\d+)\s*个站/);
  const mA = evidence.match(/A 组\s*(\d+)/);
  if (!mAll || !mA) skip('文档数字', 'design-evidence.md 里找不到「采集成功 N 个站 / A 组 N」');
  else {
    const wantAll = mAll[1];
    const wantA = mA[1];
    // docs/ 也写站点数（README 瘦身后计数主力搬到了 docs/reference-sites.md），一并纳入。
    const files = ['README.md', 'SKILL.md', 'references/design-evidence.md', 'references/craft-floor.md', 'references/visual-system.md', 'docs/reference-sites.md', 'docs/scripts.md'];
    const bad = [];
    for (const rel of files) {
      const text = await read(rel);
      if (!text) continue;
      for (const m of text.matchAll(/(\d+)\s*个真实站/g)) if (m[1] !== wantAll) bad.push(`${rel}: 「${m[1]} 个真实站」应为 ${wantAll}`);
      for (const m of text.matchAll(/(\d+)\s*个实测站点/g)) if (m[1] !== wantAll) bad.push(`${rel}: 「${m[1]} 个实测站点」应为 ${wantAll}`);
      for (const m of text.matchAll(/(\d+)\s*站实测/g)) if (m[1] !== wantAll) bad.push(`${rel}: 「${m[1]} 站实测」应为 ${wantAll}`);
      for (const m of text.matchAll(/A 组\s*(\d+)/g)) if (m[1] !== wantA) bad.push(`${rel}: 「A 组 ${m[1]}」应为 ${wantA}`);
    }
    // 脚本数同样会漂：README 徽标写「N 个可执行脚本」，实际是 scripts/*.mjs + scripts/*.py
    const nScript = readdirSync(SCRIPTS).filter((f) => f.endsWith('.mjs') || f.endsWith('.py')).length;
    for (const rel of ['README.md', 'SKILL.md']) {
      const text = await read(rel);
      for (const m of text.matchAll(/(\d+)\s*个可执行脚本/g)) {
        if (m[1] !== String(nScript)) bad.push(`${rel}: 「${m[1]} 个可执行脚本」应为 ${nScript}`);
      }
    }
    if (bad.length) fail('文档数字', [...new Set(bad)].join(' | '));
    else pass('文档数字', `${wantAll} 个站 / A 组 ${wantA} 在 ${files.length} 份文档里一致，脚本数 ${nScript} 也一致`);
  }
}

// ---------- 6. 版本号一致 ----------
// 版本号手写在 package.json / README 徽标与安装示例 / install.sh / CHANGELOG 首条。
// 漏改一处，按文档判版本的人就会读到旧号——README 元信息曾连续两个版本停在 v1.9.2。
{
  const ROOT = resolve(SCRIPTS, '..');
  const read = (rel) => readFile(join(ROOT, rel), 'utf8').catch(() => '');
  const pkgRaw = await read('package.json');
  let want = '';
  let bad = [];
  if (!pkgRaw) {
    // 安装到 ~/.claude/skills 这类目录时只拷贝 skill 运行文件，没有 package.json。
    // 那种场合无从读版本，跳过即可——仓库与 CI 里它始终存在，拦截力不受影响。
    skip('版本号', '这份副本没有 package.json，跳过');
  } else {
    try { want = JSON.parse(pkgRaw).version || ''; } catch { /* 下面统一报 */ }
    if (!want) bad.push('package.json 没有 version 字段');
  }
  if (want) {
    const targets = {
      'README.md': [/^`v(\d+\.\d+\.\d+)`/m, /--ref v(\d+\.\d+\.\d+)/, /当前是 \[v(\d+\.\d+\.\d+)\]/],
      'install.sh': [/--ref v(\d+\.\d+\.\d+)/],
      'CHANGELOG.md': [/^## v(\d+\.\d+\.\d+)/m],
    };
    for (const [rel, regs] of Object.entries(targets)) {
      const text = await read(rel);
      if (!text) continue;
      for (const re of regs) {
        const m = text.match(re);
        if (m && m[1] !== want) bad.push(`${rel}: v${m[1]} 应为 v${want}`);
      }
    }
  }
  if (bad.length) fail('版本号', [...new Set(bad)].join(' | '));
  else pass('版本号', `package.json / README / install.sh / CHANGELOG 首条均为 v${want}`);
}

// ---------- 汇总 ----------
const failed = results.filter((r) => !r.ok);
console.log('');
if (failed.length) {
  console.log(`${C.bad}自检失败：${failed.length} 项${C.off}`);
  if (!keep) rmSync(outDir, { recursive: true, force: true });
  process.exit(1);
}
console.log(`${C.ok}自检通过${C.off}${keep ? `（生成物保留在 ${outDir}）` : ''}`);
if (!keep) rmSync(outDir, { recursive: true, force: true });