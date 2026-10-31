#!/usr/bin/env node
/**
 * recheck-refs.mjs — 参考站批量复测：一次量完所有单站蒸馏对象，输出可 diff 的报告。
 *
 * 用途：参考库里的数值是「采样当天」的，站点改版后文档会悄悄过期。
 * 这个脚本对每个站点跑一遍 probe-ref.mjs，收集关键值并与上次基线比较；
 * 基线首次运行时自动建立（references/recheck-baseline.json），之后只报差异。
 *
 * 用法：
 *   node scripts/recheck-refs.mjs                       # 全量复测，报告写 docs/reference-recheck.md
 *   node scripts/recheck-refs.mjs --only awwwards,muzli # 只测指定站点
 *   node scripts/recheck-refs.mjs --concurrency 3 --timeout 90
 *   node scripts/recheck-refs.mjs --update-baseline     # 用本次结果重写基线（确认改版后再用）
 *   node scripts/recheck-refs.mjs --strict              # 有站点不可达时退出 1
 *
 * 退出码：0 全部可达（或有失败但未加 --strict）；1 有站点失败且加了 --strict；2 参数错。
 *
 * 依赖：playwright（与 probe-ref.mjs 相同）。被拦、超时、下线的站点会记成 failed，
 * 不写入基线——不要把「测不到」当成「没变化」。
 */
import { spawn } from 'node:child_process';
import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');
const PROBE = path.join(HERE, 'probe-ref.mjs');
const BASELINE = path.join(ROOT, 'references', 'recheck-baseline.json');
const REPORT = path.join(ROOT, 'docs', 'reference-recheck.md');

/** 单站蒸馏对象：name 对应 references/<name>，url 是采样入口。 */
const SITES = [
  { name: 'awwwards', label: 'Awwwards 奖项目录', url: 'https://www.awwwards.com/' },
  { name: 'wegic', label: 'Wegic 营销站', url: 'https://wegic.ai/zh-cn' },
  { name: 'jsdesign', label: '即时设计', url: 'https://js.design/' },
  { name: 'uishijie', label: 'UI 世界', url: 'http://www.uishijie.com/ui/' },
  { name: 'zcool', label: '站酷 UI 频道', url: 'https://www.zcool.com.cn/discover/17' },
  { name: 'stylekit', label: 'StyleKit 风格目录', url: 'https://www.stylekit.top/zh/styles' },
  { name: 'uinotes', label: 'UI Notes', url: 'https://uinotes.com/' },
  { name: 'luckymaomi', label: '猫叫兽 UI 风格库', url: 'https://luckymaomi.github.io/ui/' },
  { name: 'muzli', label: 'Muzli 灵感库', url: 'https://muz.li/inspiration/motion-design/' },
  { name: 'mastergo', label: 'MasterGo', url: 'https://mastergo.com/' },
  { name: 'vercel', label: 'Vercel 登录', url: 'https://vercel.com/login' },
  { name: 'applestore', label: 'Apple Store 商品配置', url: 'https://www.apple.com.cn/shop/buy-iphone' },
  { name: 'apple', label: '苹果中国首页', url: 'https://www.apple.com.cn/' },
  { name: 'sspai', label: '少数派', url: 'https://sspai.com/' },
  { name: 'yuque', label: '语雀', url: 'https://www.yuque.com/' },
  { name: 'juejin', label: '掘金', url: 'https://juejin.cn/' },
  { name: 'holynova', label: 'holynova 动效站', url: 'https://holynova.github.io/' },
];

const argv = process.argv.slice(2);
const has = (k) => argv.includes(`--${k}`);
const arg = (k, d) => { const i = argv.indexOf(`--${k}`); return i >= 0 && argv[i + 1] ? argv[i + 1] : d; };
const only = arg('only', '') ? arg('only', '').split(',').map((s) => s.trim()).filter(Boolean) : null;
const concurrency = Math.max(1, Math.min(6, Number(arg('concurrency', '4')) || 4));
const timeoutMs = Math.max(15000, Number(arg('timeout', '90')) || 90) * 1000;
const updateBaseline = has('update-baseline');
const strict = has('strict');

const sites = only ? SITES.filter((s) => only.includes(s.name)) : SITES;
if (!sites.length) {
  console.error(`没有匹配的站点。可选：${SITES.map((s) => s.name).join(', ')}`);
  process.exit(2);
}

function runProbe(site, outDir) {
  return new Promise((resolve) => {
    const started = Date.now();
    const ch = spawn(process.execPath, [PROBE, '--url', site.url, '--out', outDir], {
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let out = '';
    const timer = setTimeout(() => {
      ch.kill('SIGKILL');
      resolve({ ok: false, error: `超时 ${Math.round(timeoutMs / 1000)}s`, out, ms: Date.now() - started });
    }, timeoutMs);
    ch.stdout.on('data', (d) => { out += d; });
    ch.stderr.on('data', (d) => { out += d; });
    ch.on('error', (e) => { clearTimeout(timer); resolve({ ok: false, error: String(e.message), out, ms: Date.now() - started }); });
    ch.on('close', (code) => {
      clearTimeout(timer);
      if (code !== 0) return resolve({ ok: false, error: `probe-ref 退出 ${code}`, out, ms: Date.now() - started });
      resolve({ ok: true, out, ms: Date.now() - started });
    });
  });
}

async function readProbe(outDir) {
  // probe-ref 用 URL slug 命名（index.json / login.json），不能写死文件名
  const files = (await readdir(outDir)).filter((f) => f.endsWith('.json'));
  if (!files.length) throw new Error('没有 JSON 产物');
  const raw = await readFile(path.join(outDir, files[0]), 'utf8');
  const j = JSON.parse(raw);
  const pick = (m) => (m ? Number(m.size ?? m) : null);
  const p = j.metrics?.p || {};
  return {
    title: j.title || '',
    h1: pick(j.metrics?.h1),
    body: pick(p),
    bodyLh: p.lh ?? null,
    font: j.fonts?.[0]?.[0] || null,
    control: j.controlHeights?.[0] ?? null,
    cards: j.cards || null,
    images: j.images || null,
    animations: j.animations ?? null,
    bodyBg: j.bodyBg || null,
    radii: (j.radius || []).slice(0, 6),
    rootVars: Object.keys(j.rootVars || {}).length,
  };
}

const same = (a, b, tol = 1) => {
  if (a === null || b === null || a === undefined || b === undefined) return true;
  if (typeof a === 'number' && typeof b === 'number') return Math.abs(a - b) <= tol;
  return a === b;
};

function diff(before, after) {
  if (!before) return [];
  const out = [];
  for (const [key, label, tol] of [
    ['h1', 'H1', 2], ['body', '正文', 1], ['control', '控件高', 2],
    ['bodyBg', '底色', 0], ['font', '主字体', 0],
  ]) {
    if (!same(before[key], after[key], tol)) out.push(`${label} ${before[key]} → ${after[key]}`);
  }
  if (before.cards && after.cards) {
    if (before.cards.total !== after.cards.total) out.push(`卡片 ${before.cards.total} → ${after.cards.total}`);
    if (before.cards.border !== after.cards.border) out.push(`带边框卡 ${before.cards.border} → ${after.cards.border}`);
  }
  if (before.images && after.images && before.images.lazy !== after.images.lazy) {
    out.push(`懒加载图 ${before.images.lazy}/${before.images.total} → ${after.images.lazy}/${after.images.total}`);
  }
  return out;
}

let baseline = {};
try { baseline = JSON.parse(await readFile(BASELINE, 'utf8')); } catch { /* 首次运行 */ }

await mkdir(path.join(ROOT, '.design', 'recheck'), { recursive: true });
const results = new Array(sites.length);
let cursor = 0;

async function worker() {
  while (cursor < sites.length) {
    const i = cursor++;
    const site = sites[i];
    const outDir = path.join(ROOT, '.design', 'recheck', site.name);
    process.stdout.write(`RUN  ${site.name} … `);
    const run = await runProbe(site, outDir);
    if (!run.ok) {
      results[i] = { site, status: 'failed', error: run.error, ms: run.ms };
      console.log(`FAIL ${run.error}`);
      continue;
    }
    try {
      const m = await readProbe(outDir);
      const drift = diff(baseline[site.name], m);
      results[i] = { site, status: 'ok', ms: run.ms, metrics: m, drift };
      console.log(`OK ${m.h1 ?? '-'}px / ${m.body ?? '-'}px${drift.length ? ' · 变化 ' + drift.join('，') : ''}`);
    } catch (e) {
      results[i] = { site, status: 'failed', error: `解析失败：${e.message}`, ms: run.ms };
      console.log('FAIL 解析');
    }
  }
}

await Promise.all(Array.from({ length: concurrency }, worker));

const ok = results.filter((r) => r.status === 'ok');
const failed = results.filter((r) => r.status === 'failed');
const drifted = ok.filter((r) => r.drift.length);

if (updateBaseline) {
  const next = { ...baseline };
  for (const r of ok) next[r.site.name] = r.metrics;
  await writeFile(BASELINE, `${JSON.stringify(next, null, 2)}\n`, 'utf8');
}

const now = new Date();
const stamp = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
const rows = results.map((r) => {
  if (r.status !== 'ok') return `| ${r.site.label} | ❌ 不可达 | ${r.error} | — |`;
  const m = r.metrics;
  const drift = r.drift.length ? r.drift.join('；') : '无变化';
  return `| ${r.site.label} | ✅ | H1 ${m.h1 ?? '—'} / 正文 ${m.body ?? '—'} / 控件 ${m.control ?? '—'} / ${m.font || '—'} | ${drift} |`;
});

const md = `# 参考站复测报告

> 生成时间：${stamp}；对象：${sites.length} 个单站蒸馏站点；每站一次桌面采样（1440×900），未做断点扫描。
> 方法：\`scripts/recheck-refs.mjs\` 逐站调用 \`probe-ref.mjs\`（getComputedStyle + 盒模型），失败站点不计入基线。
> 用途：站点改版后文档会过期。**报告只报差异，不改写单站结论**；确认改版后按差异手工更新对应 \`references/*-design.md\`。

## 结果

| 站点 | 状态 | 本次实测 | 与基线对比 |
| --- | --- | --- | --- |
${rows.join('\n')}

## 统计

- 可达 **${ok.length}** / 失败 **${failed.length}** / 有数值变化 **${drifted.length}**。
- 基线：\`references/recheck-baseline.json\`（${Object.keys(baseline).length} 个站点；\`--update-baseline\` 才会重写）。
${failed.length ? `- 失败站点：${failed.map((r) => `${r.site.name}（${r.error}）`).join('；')}。被拦、超时与下线不写入基线，别当成「没变化」。\n` : ''}
## 复跑

\`\`\`bash
node scripts/recheck-refs.mjs                    # 全量
node scripts/recheck-refs.mjs --only awwwards    # 单站
node scripts/recheck-refs.mjs --update-baseline  # 确认改版后重设基线
\`\`\`
`;

await mkdir(path.dirname(REPORT), { recursive: true });
await writeFile(REPORT, md, 'utf8');
await writeFile(path.join(ROOT, '.design', 'recheck', 'report.json'), `${JSON.stringify({ generatedAt: now.toISOString(), results }, null, 2)}\n`, 'utf8');

console.log('');
console.log(`合计：可达 ${ok.length} / 失败 ${failed.length} / 有变化 ${drifted.length}`);
console.log(`报告：${REPORT}`);
if (updateBaseline) console.log(`基线已更新：${BASELINE}`);
if (strict && failed.length) process.exit(1);
