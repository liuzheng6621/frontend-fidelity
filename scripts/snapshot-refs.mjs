#!/usr/bin/env node
/**
 * snapshot-refs.mjs — 离线冻结参考站数值快照：用已有的 probe 产物，不联网。
 *
 * 定位：recheck-refs.mjs 负责「量」和「报漂移」，这个脚本负责「冻」。
 * 分开的理由：冻结是个需要人确认的动作，不该混在每次复测里；
 * 而且 CI 里往往没有外网，只能拿归档的 probe JSON 冻结。
 *
 * 用法：
 *   node scripts/snapshot-refs.mjs --from .design/recheck           # 目录下每站一个子目录
 *   node scripts/snapshot-refs.mjs --from .tmp/probes --flat        # 目录下直接是 <site>.json
 *   node scripts/snapshot-refs.mjs --from .design/recheck --only apple,zcool
 *   node scripts/snapshot-refs.mjs --from .design/recheck --dry-run # 只报会改什么，不写文件
 *   node scripts/snapshot-refs.mjs --from .design/recheck --date 2026-11-01
 *
 * 两种目录布局：
 *   嵌套（recheck 的产物）：<from>/<site>/<url-slug>.json
 *   扁平（手工归档）：      <from>/<site>.json
 *
 * 退出码：0 写入成功（或 dry-run 完成）/ 1 一个站点都没读到 / 2 参数错。
 *
 * 约束：**只冻结读到的站点**。没读到的站点保持旧值，不会被清空——
 * 快照少一个站是「这次没采」，不是「这站没了」。
 */
import { readdir, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  SITES,
  SNAPSHOT_METHOD,
  SNAPSHOT_NOTE,
  diffMetrics,
  loadSnapshot,
  metricsFromProbe,
  readProbeDir,
  writeSnapshot,
} from './lib/ref-metrics.mjs';
import { readFile } from 'node:fs/promises';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');

const argv = process.argv.slice(2);
const has = (k) => argv.includes(`--${k}`);
const arg = (k, d) => {
  const i = argv.indexOf(`--${k}`);
  return i >= 0 && argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[i + 1] : d;
};

const from = arg('from', '');
if (!from) {
  console.error('缺少 --from <目录>');
  console.error('  node scripts/snapshot-refs.mjs --from .design/recheck');
  process.exit(2);
}
const fromDir = path.isAbsolute(from) ? from : path.join(ROOT, from);
const flat = has('flat');
const dryRun = has('dry-run');
const dateArg = arg('date', '');
if (dateArg && !/^\d{4}-\d{2}-\d{2}$/.test(dateArg)) {
  console.error(`--date 需要 YYYY-MM-DD，收到「${dateArg}」`);
  process.exit(2);
}
const only = arg('only', '')
  ? arg('only', '').split(',').map((s) => s.trim()).filter(Boolean)
  : null;
if (only) {
  const unknown = only.filter((n) => !SITES.some((s) => s.name === n));
  if (unknown.length) {
    console.error(`未知站点：${unknown.join(', ')}`);
    console.error(`可选：${SITES.map((s) => s.name).join(', ')}`);
    process.exit(2);
  }
}

try {
  const st = await stat(fromDir);
  if (!st.isDirectory()) {
    console.error(`--from 不是目录：${fromDir}`);
    process.exit(2);
  }
} catch {
  console.error(`--from 目录不存在：${fromDir}`);
  process.exit(2);
}

const targets = only ? SITES.filter((s) => only.includes(s.name)) : SITES;

/** 扁平布局下按 <site>.json 找；找不到就返回 null。 */
async function readFlat(site) {
  const p = path.join(fromDir, `${site.name}.json`);
  try {
    const raw = await readFile(p, 'utf8');
    return metricsFromProbe(JSON.parse(raw));
  } catch {
    return null;
  }
}

const found = [];
const missing = [];
for (const site of targets) {
  try {
    let metrics;
    if (flat) {
      metrics = await readFlat(site);
      if (!metrics) throw new Error('没有该站 JSON');
    } else {
      metrics = await readProbeDir(path.join(fromDir, site.name));
    }
    found.push({ site, metrics });
  } catch (e) {
    missing.push({ site, reason: e.message });
  }
}

if (!found.length) {
  console.error(`一个站点都没读到：${fromDir}${flat ? '（--flat 布局）' : ''}`);
  if (missing.length) for (const m of missing.slice(0, 5)) console.error(`  · ${m.site.name}: ${m.reason}`);
  console.error('提示：嵌套布局要求 <from>/<site>/<slug>.json；扁平布局加 --flat，文件名为 <site>.json。');
  process.exit(1);
}

const snapshot = await loadSnapshot(ROOT);
const nextSites = { ...snapshot.sites };
const changed = [];
const added = [];

for (const { site, metrics } of found) {
  const before = snapshot.sites[site.name];
  if (!before) added.push(site.name);
  else {
    const d = diffMetrics(before, metrics) || [];
    if (d.length) changed.push(`${site.name}: ${d.join('，')}`);
  }
  nextSites[site.name] = metrics;
}

console.log(`来源：${fromDir}${flat ? '（扁平）' : '（嵌套）'}`);
console.log(`读到 ${found.length} 站 / 未读到 ${missing.length} 站`);
if (missing.length) {
  console.log(`  未读到（保持旧值）：${missing.map((m) => m.site.name).join(', ')}`);
}
console.log(`旧快照：capturedAt ${snapshot.meta.capturedAt}，${Object.keys(snapshot.sites).length} 站`);
if (added.length) console.log(`  新增站点：${added.join(', ')}`);
if (changed.length) {
  console.log('  相对旧快照的漂移：');
  for (const c of changed) console.log(`    · ${c}`);
} else {
  console.log('  与旧快照无漂移。');
}

if (dryRun) {
  console.log('');
  console.log('--dry-run：没有写文件。去掉它才会冻结。');
  process.exit(0);
}

const written = await writeSnapshot(ROOT, {
  sites: nextSites,
  meta: {
    capturedAt: dateArg || undefined,
    frozenBy: 'scripts/snapshot-refs.mjs',
    method: snapshot.meta.method || SNAPSHOT_METHOD,
    note: SNAPSHOT_NOTE,
  },
});
console.log('');
console.log(`快照已冻结：${path.relative(ROOT, written.path)}（capturedAt ${written.capturedAt}，${written.count} 站）`);
