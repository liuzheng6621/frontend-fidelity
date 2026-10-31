#!/usr/bin/env node
/**
 * recheck-refs.mjs — 参考站批量复测：一次量完所有单站蒸馏对象，输出可 diff 的报告。
 *
 * 用途：参考库里的数值是「采样当天」的，站点改版后文档会悄悄过期。
 * 这个脚本对每个站点跑一遍 probe-ref.mjs，收集关键值并与**冻结快照**比较；
 * 快照是带日期的只读文件（references/reference-snapshot.json），本脚本默认绝不改写它。
 *
 * 用法：
 *   node scripts/recheck-refs.mjs                       # 全量复测，报告写 docs/reference-recheck.md
 *   node scripts/recheck-refs.mjs --only awwwards,muzli # 只测指定站点（报告写 .design/，不覆盖全量）
 *   node scripts/recheck-refs.mjs --concurrency 3 --timeout 90
 *   node scripts/recheck-refs.mjs --freeze              # 确认改版后重设快照（写新 capturedAt）
 *   node scripts/recheck-refs.mjs --freeze --allow-partial  # 有站点不可达也冻结（缺的站点保持旧值）
 *   node scripts/recheck-refs.mjs --strict              # 有站点不可达时退出 1
 *
 * 退出码：0 全部可达（或有失败但未加 --strict）；1 有站点失败且加了 --strict；2 参数错。
 *
 * 依赖：playwright（与 probe-ref.mjs 相同）。被拦、超时、下线的站点会记成 failed，
 * 不写入快照——不要把「测不到」当成「没变化」。
 */
import { spawn } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { SITES, diffMetrics, loadSnapshot, readProbeDir, todayStamp, writeSnapshot } from './lib/ref-metrics.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');
const PROBE = path.join(HERE, 'probe-ref.mjs');
const REPORT = path.join(ROOT, 'docs', 'reference-recheck.md');

const argv = process.argv.slice(2);
const has = (k) => argv.includes(`--${k}`);
const arg = (k, d) => { const i = argv.indexOf(`--${k}`); return i >= 0 && argv[i + 1] ? argv[i + 1] : d; };
const only = arg('only', '') ? arg('only', '').split(',').map((s) => s.trim()).filter(Boolean) : null;
const concurrency = Math.max(1, Math.min(6, Number(arg('concurrency', '4')) || 4));
const timeoutSec = Number(arg('timeout', '90'));
if (!Number.isFinite(timeoutSec) || timeoutSec < 15) {
  console.error('--timeout 需要 ≥ 15（秒）');
  process.exit(2);
}
const timeoutMs = timeoutSec * 1000;
if (has('update-baseline')) {
  console.error('--update-baseline 已移除：快照是带日期的只读文件，请改用 --freeze');
  console.error('  node scripts/recheck-refs.mjs --freeze            # 全部可达才写');
  console.error('  node scripts/recheck-refs.mjs --freeze --allow-partial  # 有不可达也写（缺的站保持旧值）');
  process.exit(2);
}
const freeze = has('freeze');
const allowPartial = has('allow-partial');
const strict = has('strict');
const writeReport = has('report'); // --only 默认不覆盖全量报告

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

const snapshot = await loadSnapshot();
const baseline = snapshot.sites;

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
      const m = await readProbeDir(outDir);
      const drift = diffMetrics(baseline[site.name], m);
      const state = drift === null ? 'first' : drift.length ? 'drift' : 'same';
      results[i] = { site, status: 'ok', ms: run.ms, metrics: m, drift, state };
      const note = state === 'first' ? ' · 首次采样' : drift.length ? ' · 变化 ' + drift.join('，') : '';
      console.log(`OK ${m.h1 ?? '-'}px / ${m.body ?? '-'}px${note}`);
    } catch (e) {
      results[i] = { site, status: 'failed', error: `解析失败：${e.message}`, ms: run.ms };
      console.log('FAIL 解析');
    }
  }
}

await Promise.all(Array.from({ length: concurrency }, worker));

const ok = results.filter((r) => r.status === 'ok');
const failed = results.filter((r) => r.status === 'failed');
const drifted = ok.filter((r) => r.state === 'drift');
const firsts = ok.filter((r) => r.state === 'first');

const now = new Date();
const stamp = todayStamp(now);

// 冻结：把本次可达结果写进快照，并更新 capturedAt。不可达的站点保持旧值（缺值不等于没变化）。
let frozenTo = null;
if (freeze) {
  if (failed.length && !allowPartial) {
    console.error(`拒绝冻结：${failed.length} 个站点不可达（${failed.map((r) => r.site.name).join(', ')}）。`);
    console.error('加 --allow-partial 只冻结可达站点，其余保持旧值。');
    process.exit(2);
  }
  const nextSites = { ...baseline };
  const changed = [];
  for (const r of ok) {
    const before = baseline[r.site.name];
    nextSites[r.site.name] = r.metrics;
    if (before) {
      const d = diffMetrics(before, r.metrics) || [];
      if (d.length) changed.push(`${r.site.name}: ${d.join('，')}`);
    }
  }
  const next = {
    capturedAt: stamp,
    frozenBy: 'scripts/recheck-refs.mjs --freeze',
    method: snapshot.meta.method,
    note: snapshot.meta.note,
  };
  const written = await writeSnapshot(ROOT, { sites: nextSites, meta: next, now });
  frozenTo = { path: written.path, capturedAt: written.capturedAt, sites: written.count, changed };
}

const rows = results.map((r) => {
  if (r.status !== 'ok') return `| ${r.site.label} | ❌ 不可达 | ${r.error} | — |`;
  const m = r.metrics;
  const drift = r.state === 'first' ? '首次采样（快照里没有这一站）' : r.drift.length ? r.drift.join('；') : '无变化';
  return `| ${r.site.label} | ✅ | H1 ${m.h1 ?? '—'} / 正文 ${m.body ?? '—'} / 控件 ${m.control ?? '—'} / ${m.font || '—'} | ${drift} |`;
});

const md = `# 参考站复测报告

> 生成时间：${stamp}；对象：${sites.length} 个单站蒸馏站点；每站一次桌面采样（1440×900），未做断点扫描。
> 方法：\`scripts/recheck-refs.mjs\` 逐站调用 \`probe-ref.mjs\`（getComputedStyle + 盒模型），失败站点不计入快照。
> 对照对象：\`references/reference-snapshot.json\`（冻结于 **${snapshot.meta.capturedAt}**，${Object.keys(baseline).length} 个站点）。
> 用途：站点改版后文档会过期。**报告只报漂移，不改写单站结论，也不动快照**；确认改版后跑 \`--freeze\` 重设快照，再按差异手工更新对应 \`references/*-design.md\`。

## 结果

| 站点 | 状态 | 本次实测 | 与快照对比 |
| --- | --- | --- | --- |
${rows.join('\n')}

## 统计

- 可达 **${ok.length}** / 失败 **${failed.length}** / 有数值漂移 **${drifted.length}** / 快照里没有 **${firsts.length}**。
- 快照：\`references/reference-snapshot.json\`（${Object.keys(baseline).length} 个站点，capturedAt ${snapshot.meta.capturedAt}；只有 \`--freeze\` 才会重写）。
${failed.length ? `- 失败站点：${failed.map((r) => `${r.site.name}（${r.error}）`).join('；')}。被拦、超时与下线不写入快照，别当成「没变化」。\n` : ''}
## 复跑

\`\`\`bash
node scripts/recheck-refs.mjs            # 全量复测，只报漂移
node scripts/recheck-refs.mjs --only awwwards    # 单站
node scripts/recheck-refs.mjs --freeze   # 确认改版后重设快照（写新 capturedAt）
node scripts/snapshot-refs.mjs --from .design/recheck   # 离线冻结：用已有 probe 产物，不联网
\`\`\`
`;

const reportPath = only && !writeReport
  ? path.join(ROOT, '.design', 'recheck', `report-${sites.map((x) => x.name).join('-')}.md`)
  : REPORT;
await mkdir(path.dirname(reportPath), { recursive: true });
await writeFile(reportPath, md, 'utf8');
await writeFile(path.join(ROOT, '.design', 'recheck', 'report.json'), `${JSON.stringify({ generatedAt: now.toISOString(), results }, null, 2)}\n`, 'utf8');

console.log('');
console.log(`合计：可达 ${ok.length} / 失败 ${failed.length} / 有漂移 ${drifted.length}`);
console.log(`报告：${reportPath}${only && !writeReport ? '（--only 不覆盖全量报告，加 --report 才写 docs/）' : ''}`);
if (frozenTo) {
  console.log(`快照已冻结：${frozenTo.path}（capturedAt ${frozenTo.capturedAt}，${frozenTo.sites} 个站点）`);
  if (frozenTo.changed.length) {
    console.log('  本次相对旧快照的变化：');
    for (const c of frozenTo.changed) console.log(`  · ${c}`);
  } else {
    console.log('  本次与旧快照无差异。');
  }
}
if (strict && failed.length) process.exit(1);
