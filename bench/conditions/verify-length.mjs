#!/usr/bin/env node
/**
 * 等长对照条件校验：确认「无关技能」文档与当前 SKILL.md 的 est tokens 差在容差内。
 *
 * 为什么必须有这道门：WebDev-Skills-Bench（arXiv 2608.23067）报告注入技能不保证提升，
 * 四模型平均 ΔPass@2 为负，而且**等长无关技能复现了其中的大部分损失**。
 * 也就是说「上下文里多了一段文字」这件事本身就会改变结果。
 * 若 unrelated 条件与 current 条件长度差太远，两者的差值就不再是「内容相关性」的效应，
 * 而是「体积」的效应——整个对照实验作废。所以每次跑 bench 前都要复核一次。
 *
 * est tokens 口径（与 scripts/selfcheck.mjs 的 estimateTokens 逐字一致）：
 *   CJK 区字符（[　-〿一-鿿＀-￯‘’“”—…·]）计 1.4，其余字符计 0.3，最后四舍五入。
 *   比较的是**整份文件**（frontmatter 的 description + 正文全文），不是只比正文。
 *
 * 用法:
 *   node bench/conditions/verify-length.mjs                 # 默认容差 ±10%
 *   node bench/conditions/verify-length.mjs --tol 5         # 收紧到 ±5%
 *   node bench/conditions/verify-length.mjs --all           # 顺带打印全部条件的 est tokens
 *   node bench/conditions/verify-length.mjs --json          # 机读输出
 *   node bench/conditions/verify-length.mjs --a <文件> --b <文件>   # 换比较对象
 *
 * 退出码（仓库约定）:
 *   0 在容差内；1 超出容差（必须增删无关文档的正文，不许改口径）；
 *   2 参数错或环境错（文件读不到、条件 JSON 损坏）。
 *
 * 也可被 bench/run.mjs 以 --verify-conditions 复用：import { verifyLength } from 这里。
 * 零依赖（只用 node: 内置模块）。
 */

import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(HERE, '..', '..');
const DEFAULT_TOLERANCE = 0.1;

/** CJK 区字符集合，与 scripts/selfcheck.mjs 保持同一口径。 */
export const CJK_CHAR_RE = /[　-〿一-鿿＀-￯‘’“”—…·]/;

/** est tokens：CJK ×1.4 + 其余 ×0.3，四舍五入。 */
export function estimateTokens(text) {
  let t = 0;
  for (const ch of text) t += CJK_CHAR_RE.test(ch) ? 1.4 : 0.3;
  return Math.round(t);
}

/** 读文件并测量；读不到就抛错（由调用方决定退出码）。 */
export function measure(file) {
  const abs = path.resolve(HERE, file);
  const text = readFileSync(abs, 'utf8');
  return { file, abs, chars: [...text].length, estTokens: estimateTokens(text) };
}

/** 极简参数解析：--k v 与 --flag。 */
function parseArgs(argv) {
  const out = {};
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (!a.startsWith('--')) continue;
    const key = a.slice(2);
    const next = argv[i + 1];
    if (next === undefined || next.startsWith('--')) out[key] = true;
    else { out[key] = next; i++; }
  }
  return out;
}

/**
 * 执行校验。返回 { ok, tolerance, a, b, diffTokens, diffPercent, conditions? }。
 * 不打印、不退出，方便被 run.mjs 复用。
 */
export function verifyLength(opts = {}) {
  const tolerance = Number.isFinite(opts.tolerance) ? opts.tolerance : DEFAULT_TOLERANCE;
  const a = measure(opts.a || 'unrelated-length-matched.md');
  const b = measure(opts.b || path.join(REPO_ROOT, 'SKILL.md'));
  const diffTokens = a.estTokens - b.estTokens;
  const diffPercent = b.estTokens === 0 ? Infinity : (diffTokens / b.estTokens) * 100;
  const ok = Math.abs(diffPercent) <= tolerance * 100;
  const result = { ok, tolerance, tolerancePercent: tolerance * 100, a, b, diffTokens, diffPercent };
  if (opts.all) result.conditions = allConditionTokens();
  return result;
}

/** 列出 conditions/*.json 里声明的 estTokens 与实测值，用于核对声明是否过期。 */
export function allConditionTokens() {
  const rows = [];
  for (const name of readdirSync(HERE).filter((f) => f.endsWith('.json')).sort()) {
    let json;
    try { json = JSON.parse(readFileSync(path.join(HERE, name), 'utf8')); }
    catch (err) { rows.push({ file: name, error: `JSON 解析失败: ${err.message}` }); continue; }
    const row = { file: name, id: json.id ?? null, declared: json.estTokens ?? null };
    if (json.skillFile) {
      try {
        const m = measure(path.resolve(HERE, json.skillFile));
        row.measured = m.estTokens;
        row.chars = m.chars;
        row.stale = row.declared !== null && row.declared !== m.estTokens;
      } catch (err) { row.error = `读不到 ${json.skillFile}: ${err.message}`; }
    } else { row.measured = 0; row.chars = 0; row.stale = row.declared !== 0; }
    rows.push(row);
  }
  return rows;
}

function main() {
  const args = parseArgs(process.argv);
  let tolerance = DEFAULT_TOLERANCE;
  if (args.tol !== undefined && args.tol !== true) {
    tolerance = Number(args.tol) / 100;
    if (!Number.isFinite(tolerance) || tolerance <= 0) {
      console.error(`FAIL --tol 需要是正数百分比，收到 ${args.tol}`);
      process.exit(2);
    }
  }
  let r;
  try {
    r = verifyLength({ tolerance, a: typeof args.a === 'string' ? args.a : null, b: typeof args.b === 'string' ? args.b : null, all: Boolean(args.all) });
  } catch (err) {
    console.error(`FAIL 环境错：${err.message}`);
    process.exit(2);
  }
  if (args.json) {
    console.log(JSON.stringify(r, null, 2));
  } else {
    const sign = r.diffPercent >= 0 ? '+' : '−';
    console.log(`est tokens 口径：CJK ×1.4 + 其余 ×0.3（同 scripts/selfcheck.mjs）`);
    console.log(`  A 无关技能 ${path.relative(REPO_ROOT, r.a.abs).split(path.sep).join('/')}  = ${r.a.estTokens}（${r.a.chars} 字符）`);
    console.log(`  B 当前技能 ${path.relative(REPO_ROOT, r.b.abs).split(path.sep).join('/')}  = ${r.b.estTokens}（${r.b.chars} 字符）`);
    console.log(`  差值 ${sign}${Math.abs(r.diffTokens)} tokens = ${sign}${Math.abs(r.diffPercent).toFixed(2)}%，容差 ±${r.tolerancePercent}%`);
    if (r.conditions) {
      console.log('各条件 est tokens：');
      for (const c of r.conditions) {
        if (c.error) console.log(`  - ${c.file}: ${c.error}`);
        else console.log(`  - ${String(c.id).padEnd(10)} 声明 ${String(c.declared).padStart(5)} / 实测 ${String(c.measured).padStart(5)}${c.stale ? '  ← 声明过期，请更新 JSON' : ''}`);
      }
    }
    console.log(r.ok ? 'PASS 等长对照成立，可以跑 bench' : 'FAIL 超出容差：增删 unrelated-length-matched.md 的正文，不要改口径');
  }
  process.exit(r.ok ? 0 : 1);
}

const invoked = process.argv[1] ? path.resolve(process.argv[1]) : '';
if (invoked === path.resolve(fileURLToPath(import.meta.url))) main();
