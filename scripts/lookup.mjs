#!/usr/bin/env node
/**
 * 基线查询：一行命令从 28 站实测数据里拿「值 + 判据 + 出处」，
 * 不必把 618 行的 design-evidence.md 读进上下文。
 *
 * 数据源：references/baseline.json（32 条冻结条目，每条带 source
 * {file,line,section,anchor}）。锚点是源文件里能逐字定位的片段
 * （比对时忽略 * 号，因为 md 里数值常带 ** 加粗）。
 *
 * 用法:
 *   node scripts/lookup.mjs 圆角                 # 关键词查询（AND 匹配，未命中退回 OR 模糊）
 *   node scripts/lookup.mjs 后台 字号            # 多词 AND
 *   node scripts/lookup.mjs --id radius-dual-track  # 按 id 精确取
 *   node scripts/lookup.mjs --list               # 列全部条目
 *   node scripts/lookup.mjs --verify [--tol 5]   # 锚点逐条回定位（漂移门，selfcheck 会跑）
 *   node scripts/lookup.mjs --fix                # 把漂移条目的行号改回实际位置
 *   --json                                       # 机读输出（查询与 --verify 均支持）
 *
 * 退出码（仓库约定）:
 *   0 成功；1 未命中 / --verify 有 missing 锚点；2 参数错 / baseline.json 缺失或损坏；
 *   3 --verify 锚点全部找得到但有行号漂移（跑 --fix）。
 *
 * 零依赖（只用 node 内置模块）。
 */

import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(SCRIPT_DIR, '..');
const BASELINE_REL = 'references/baseline.json';
const BASELINE_PATH = path.join(ROOT, BASELINE_REL);
const MAX_RESULTS = 5;

function loadBaseline() {
  let raw;
  try {
    raw = readFileSync(BASELINE_PATH, 'utf8');
  } catch {
    console.error(`FAIL 读不到 ${BASELINE_REL}`);
    process.exit(2);
  }
  try {
    const data = JSON.parse(raw);
    if (!Array.isArray(data.entries) || data.entries.length === 0) throw new Error('entries 为空');
    return data;
  } catch (err) {
    console.error(`FAIL ${BASELINE_REL} 解析失败: ${err.message}`);
    process.exit(2);
  }
}

/** 关键词打分：id 精确 > 别名精确 > id/主题包含 > 别名包含 > 值/判据包含。 */
function scoreEntry(e, kw) {
  const k = kw.toLowerCase();
  let s = 0;
  const id = (e.id || '').toLowerCase();
  if (id === k) s += 4;
  else if (id.includes(k)) s += 2;
  for (const a of e.aliases || []) {
    const al = String(a).toLowerCase();
    if (al === k) { s += 3; break; }
    if (al.includes(k) || k.includes(al)) { s += 1.5; break; }
  }
  if ((e.topic || '').toLowerCase().includes(k)) s += 2;
  if ((e.value || '').toLowerCase().includes(k)) s += 1;
  if ((e.verdict || '').toLowerCase().includes(k)) s += 1;
  return s;
}

function printEntry(e, fuzzy) {
  console.log(`● ${e.id}${fuzzy ? '（模糊匹配）' : ''} · ${e.topic}`);
  console.log(`  值: ${e.value}`);
  console.log(`  判据: ${e.verdict}`);
  const s = e.source || {};
  console.log(`  出处: ${s.file}:${s.line} ${s.section || ''}［${e.status || '-'}］`);
  console.log('');
}

function usage() {
  console.error('用法: node scripts/lookup.mjs <关键词…> | --id X | --list | --verify [--tol 5] | --fix [--json]');
  process.exit(2);
}

/** 源文件按行缓存并剥掉 *（md 加粗），锚点比对用。null = 文件读不到。 */
const fileCache = new Map();
function readSourceLines(rel) {
  if (fileCache.has(rel)) return fileCache.get(rel);
  let lines = null;
  try {
    lines = readFileSync(path.join(ROOT, rel), 'utf8').split(/\r?\n/).map((l) => l.replace(/\*/g, ''));
  } catch { /* 保持 null，由调用方报 missing */ }
  fileCache.set(rel, lines);
  return lines;
}

function verifyEntry(e, tol) {
  const s = e.source;
  if (!s || !s.file || !s.anchor || typeof s.line !== 'number') {
    return { state: 'missing', reason: 'source 字段不完整' };
  }
  const lines = readSourceLines(s.file);
  if (lines === null) return { state: 'missing', reason: `源文件读不到: ${s.file}` };
  const anchor = s.anchor.replace(/\*/g, '');
  let foundAt = -1;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes(anchor)) { foundAt = i + 1; break; }
  }
  if (foundAt === -1) return { state: 'missing', reason: `锚点找不到: ${anchor}` };
  if (Math.abs(foundAt - s.line) <= tol) return { state: 'ok', foundAt };
  return { state: 'drift', foundAt, reason: `声明 ${s.line} 行 → 实际 ${foundAt} 行` };
}

// ---- 参数解析（关键词是位置参数，自己收；--id/--tol 必须带值） ----
const argv = process.argv.slice(2);
const flags = {};
const keywords = [];
for (let i = 0; i < argv.length; i++) {
  const tok = argv[i];
  if (!tok.startsWith('--')) { keywords.push(tok); continue; }
  const key = tok.slice(2);
  if (key === 'id' || key === 'tol') {
    const next = argv[i + 1];
    if (next === undefined || next.startsWith('--')) { console.error(`FAIL --${key} 需要一个值`); process.exit(2); }
    flags[key] = next;
    i++;
  } else {
    flags[key] = true;
  }
}
const wantJson = Boolean(flags.json);
const data = loadBaseline();

if (flags.verify || flags.fix) {
  const tol = flags.tol === undefined ? 5 : Number.parseInt(flags.tol, 10);
  if (!Number.isFinite(tol) || tol < 0) { console.error('FAIL --tol 需要非负整数'); process.exit(2); }
  const results = data.entries.map((e) => ({ entry: e, ...verifyEntry(e, tol) }));
  const ok = results.filter((r) => r.state === 'ok');
  const drift = results.filter((r) => r.state === 'drift');
  const missing = results.filter((r) => r.state === 'missing');

  if (flags.fix) {
    if (drift.length > 0) {
      for (const r of drift) r.entry.source.line = r.foundAt;
      writeFileSync(BASELINE_PATH, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
      console.log(`OK   已把 ${drift.length} 条漂移条目的行号写回 ${BASELINE_REL}:`);
      for (const r of drift) console.log(`  · ${r.entry.id}: ${r.reason}`);
    } else {
      console.log('OK   没有需要修正的漂移条目。');
    }
    if (missing.length > 0) {
      console.log(`FAIL ${missing.length} 条锚点在源文件里找不到，行号修不了，必须人工核对数值后更新 baseline.json:`);
      for (const r of missing) console.log(`  · ${r.entry.id} (${r.entry.source.file}): ${r.reason}`);
      process.exit(1);
    }
    process.exit(0);
  }

  if (wantJson) {
    console.log(JSON.stringify({
      total: results.length,
      ok: ok.length,
      drift: drift.map((r) => ({ id: r.entry.id, file: r.entry.source.file, declared: r.entry.source.line, actual: r.foundAt })),
      missing: missing.map((r) => ({ id: r.entry.id, file: r.entry.source && r.entry.source.file, reason: r.reason })),
    }, null, 2));
  } else {
    console.log(`锚点回定位: ${ok.length} ok / ${drift.length} drift / ${missing.length} missing（共 ${results.length} 条，tol=${tol}）`);
    for (const r of drift) console.log(`  DRIFT ${r.entry.id}: ${r.entry.source.file} ${r.reason}`);
    for (const r of missing) console.log(`  MISSING ${r.entry.id}: ${r.reason}`);
  }
  if (missing.length > 0) process.exit(1);
  if (drift.length > 0) {
    if (!wantJson) console.log('提示: 跑 node scripts/lookup.mjs --fix 更新行号；若锚点文字本身变了，必须人工核对数值。');
    process.exit(3);
  }
  process.exit(0);
}

if (flags.list) {
  if (wantJson) {
    console.log(JSON.stringify(data.entries.map((e) => ({ id: e.id, topic: e.topic, status: e.status })), null, 2));
  } else {
    console.log(`共 ${data.entries.length} 条（冻结基线: ${data.baseline.sites} 站）:`);
    for (const e of data.entries) console.log(`  ${e.id}  ${e.topic}［${e.status}］`);
  }
  process.exit(0);
}

if (flags.id !== undefined) {
  const hit = data.entries.find((e) => e.id === flags.id);
  if (!hit) { console.error(`FAIL 没有 id 为 ${flags.id} 的条目（--list 看全部）`); process.exit(1); }
  if (wantJson) console.log(JSON.stringify(hit, null, 2));
  else printEntry(hit, false);
  process.exit(0);
}

if (keywords.length > 0) {
  let fuzzy = false;
  let scored = data.entries
    .map((e) => ({ e, scores: keywords.map((k) => scoreEntry(e, k)) }))
    .filter((r) => r.scores.every((s) => s > 0));
  if (scored.length === 0 && keywords.length > 1) {
    fuzzy = true;
    scored = data.entries
      .map((e) => ({ e, scores: keywords.map((k) => scoreEntry(e, k)) }))
      .filter((r) => r.scores.some((s) => s > 0));
  }
  scored.sort((a, b) => b.scores.reduce((x, y) => x + y, 0) - a.scores.reduce((x, y) => x + y, 0));
  const top = scored.slice(0, MAX_RESULTS);
  if (wantJson) {
    console.log(JSON.stringify({ fuzzy, hits: top.map((r) => r.e) }, null, 2));
    process.exit(top.length > 0 ? 0 : 1);
  }
  if (top.length === 0) {
    console.error(`FAIL 没有命中「${keywords.join(' ')}」的条目；--list 看全部 32 条`);
    process.exit(1);
  }
  if (fuzzy) console.log(`（AND 未命中，以下是 OR 模糊匹配）`);
  for (const r of top) printEntry(r.e, fuzzy);
  process.exit(0);
}

usage();
