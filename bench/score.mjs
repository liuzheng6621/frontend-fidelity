#!/usr/bin/env node
/**
 * bench 计分器：把 run.mjs 产出的 results/*.json 汇成「条件 × 任务」的 Pass@2 对照表。
 *
 * 为什么要盯 unrelated：WebDev-Skills-Bench（arXiv 2608.23067）发现注入技能不保证提升，
 * 四模型平均 ΔPass@2 为负，而**等长无关技能复现了大部分损失**。也就是说「多塞一段提示」
 * 本身就会改变结果。所以本脚本除了算 current 的增益，还必须算 unrelated 的位移，
 * 并把两者相减得到「净内容效应」——净效应 ≤ 0 时明确打印警告：
 * 增益可能来自提示体积而非技能内容。
 *
 * 判定口径：
 *   · 一个格子（condition × task）里，只要有一次 run「全部机器判项 pass 且产物齐全」，
 *     就算 Pass@k 命中（k = 该格实际 run 数，默认 2 → 即 Pass@2）。
 *   · manual 项与 skipped 项（本机缺 python / playwright）**不计入**判定，单独列人工待评数。
 *   · acceptance 的 fail 是测量结果；run 的硬失败（模型命令崩了 / 产物缺失）会记进 hardFail
 *     并让本脚本以退出码 3 收尾（数据不完整）。
 *
 * 用法:
 *   node bench/score.mjs bench/results/example-run.json
 *   node bench/score.mjs bench/results/            # 目录下全部 *.json 合并计
 *   node bench/score.mjs a.json b.json --json      # 机读输出
 *   node bench/score.mjs run.json --baseline none --tasks admin-form-page
 *
 * 关键选项:
 *   --json           以 JSON 输出（退出码语义不变）
 *   --baseline <id>  基准条件，默认 none
 *   --tasks a,b      只统计这些任务
 *   --conditions a,b 只统计这些条件
 *
 * 退出码（仓库约定）:
 *   0 正常算出对照表且数据完整；
 *   1 结果文件缺失或损坏（读不到 / JSON 解析失败 / 不是 run.mjs 的结果结构）；
 *   2 参数错（没给文件、未知的 --baseline、过滤器筛空）；
 *   3 数据不完整（缺基准条件、格子 run 数不齐、有硬失败或有跳过项）——表照样打印。
 *
 * 零依赖（只用 node: 内置模块）。
 */

import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const fwd = (p) => String(p).split(path.sep).join('/');

function die(code, msg) {
  console.error(`FAIL ${msg}`);
  process.exit(code);
}

function parseArgs(argv) {
  const pos = [];
  const out = { _: pos };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (!a.startsWith('--')) { pos.push(a); continue; }
    const key = a.slice(2);
    const next = argv[i + 1];
    if (next === undefined || next.startsWith('--')) out[key] = true;
    else { out[key] = next; i++; }
  }
  return out;
}

function listArg(v) {
  if (v === undefined || v === true) return null;
  return String(v).split(',').map((s) => s.trim()).filter(Boolean);
}

/** 显示宽度：CJK 记 2 列，其余记 1 列，用来对齐表格。 */
function dw(s) {
  let n = 0;
  for (const ch of String(s)) {
    const c = ch.codePointAt(0);
    n += (c >= 0x1100 && (c <= 0x115f || (c >= 0x2e80 && c <= 0xa4cf)
      || (c >= 0xac00 && c <= 0xd7a3) || (c >= 0xf900 && c <= 0xfaff)
      || (c >= 0xfe30 && c <= 0xfe6f) || (c >= 0xff00 && c <= 0xff60)
      || (c >= 0xffe0 && c <= 0xffe6))) ? 2 : 1;
  }
  return n;
}
function pad(s, w, right = false) {
  const gap = Math.max(0, w - dw(s));
  return right ? ' '.repeat(gap) + s : s + ' '.repeat(gap);
}
function table(headers, rows) {
  const widths = headers.map((h, i) => Math.max(dw(h), ...rows.map((r) => dw(r[i] ?? ''))));
  const line = (cells) => cells.map((c, i) => pad(String(c ?? ''), widths[i])).join('  ');
  return [line(headers), widths.map((w) => '-'.repeat(w)).join('  '), ...rows.map(line)].join('\n');
}
const pct = (n, d = 3) => (n === null || !Number.isFinite(n) ? '—' : n.toFixed(d));
const signed = (n, d = 3) => (n === null || !Number.isFinite(n) ? '—' : `${n >= 0 ? '+' : ''}${n.toFixed(d)}`);
const tok = (n) => (Number.isFinite(n) && n > 0 ? n.toLocaleString('en-US') : '—');

/** 把位置参数展开成结果文件列表：目录 → 目录下全部 *.json。 */
function expandInputs(pos) {
  const files = [];
  for (const p of pos) {
    const abs = path.resolve(p);
    if (!existsSync(abs)) die(1, `结果文件不存在：${p}`);
    if (statSync(abs).isDirectory()) {
      const found = readdirSync(abs).filter((f) => f.endsWith('.json')).sort()
        .map((f) => path.join(abs, f));
      if (!found.length) die(1, `目录里没有 *.json 结果文件：${p}`);
      files.push(...found);
    } else files.push(abs);
  }
  return [...new Set(files)];
}

/** 读一个结果文件并做最小结构校验。 */
function loadResult(file) {
  let raw;
  try { raw = readFileSync(file, 'utf8'); }
  catch (err) { die(1, `读不到结果文件 ${fwd(file)}：${err.message}`); }
  let json;
  try { json = JSON.parse(raw); }
  catch (err) { die(1, `结果文件 JSON 解析失败 ${fwd(file)}：${err.message}`); }
  if (!json || typeof json !== 'object' || !Array.isArray(json.runs)) {
    die(1, `${fwd(file)} 不是 run.mjs 的结果结构（缺 runs 数组）`);
  }
  return { file: fwd(file), meta: json.meta ?? {}, totals: json.totals ?? {}, runs: json.runs };
}

/** 把 run 记录折成 condition × task 的格子。 */
function aggregate(results, filter) {
  const cells = new Map();
  const issues = new Set();
  let declaredRuns = 0;
  for (const res of results) {
    if (Number.isFinite(res.meta.runs)) declaredRuns = Math.max(declaredRuns, Number(res.meta.runs));
    if (res.meta.dryRun) issues.add(`含 --dry-run 数据（${res.file}）：产物是 stub，不是模型效果`);
    for (const rec of res.runs) {
      if (!rec || typeof rec !== 'object') { issues.add('存在无法解析的 run 记录'); continue; }
      if (filter.conditions && !filter.conditions.includes(rec.condition)) continue;
      if (filter.tasks && !filter.tasks.includes(rec.task)) continue;
      const key = `${rec.condition}|${rec.task}`;
      if (!cells.has(key)) {
        cells.set(key, {
          condition: rec.condition, task: rec.task, records: [], hits: 0,
          machineItems: 0, machinePass: 0, manual: 0, skipped: 0, hardFail: 0,
          promptEstTokens: 0, cmdTokens: 0, cmdInput: 0, cmdOutput: 0, usageRuns: 0,
        });
      }
      const c = cells.get(key);
      c.records.push(rec);
      const items = Array.isArray(rec.acceptance) ? rec.acceptance : [];
      const machine = items.filter((a) => !a.manual && !a.skipped);
      const skipped = items.filter((a) => a.skipped);
      const manual = items.filter((a) => a.manual);
      c.machineItems += machine.length;
      c.machinePass += machine.filter((a) => a.pass === true).length;
      c.skipped += skipped.length;
      c.manual += manual.length;
      if (skipped.length) issues.add(`有跳过项（缺 ${[...new Set(skipped.map((s) => s.skipReason ?? 'depends'))].join('；')}）`);
      if (rec.error || rec.artifactsOk === false) {
        c.hardFail++;
        issues.add(`有硬失败格子：${rec.condition} × ${rec.task} run${rec.run}（${rec.error ?? '产物缺失'}）`);
      }
      c.promptEstTokens += Number(rec.promptEstTokens) || 0;
      if (rec.tokenUsage) {
        c.usageRuns++;
        c.cmdTokens += Number(rec.tokenUsage.totalTokens) || 0;
        c.cmdInput += Number(rec.tokenUsage.inputTokens) || 0;
        c.cmdOutput += Number(rec.tokenUsage.outputTokens) || 0;
      }
      const fullPass = machine.length > 0 && rec.artifactsOk === true
        && machine.every((a) => a.pass === true);
      if (fullPass) c.hits++;
    }
  }
  for (const c of cells.values()) {
    c.runCount = c.records.length;
    c.computable = c.machineItems > 0;
    c.pass = c.computable ? c.hits > 0 : null;
    if (!c.computable) issues.add(`${c.condition} × ${c.task} 没有可机器判的项，Pass 无法计算`);
  }
  return { cells, issues: [...issues], declaredRuns };
}

/** 条件级汇总：Pass@k = 命中任务数 / 可计算任务数。 */
function summarize(cells, conditionIds, taskIds) {
  const out = new Map();
  for (const id of conditionIds) {
    const perTask = {};
    let hitTasks = 0, computable = 0, promptEst = 0, cmdTokens = 0, usageRuns = 0;
    let machineItems = 0, machinePass = 0, manual = 0, skipped = 0, hardFail = 0, runCount = 0;
    for (const t of taskIds) {
      const c = cells.get(`${id}|${t}`);
      if (!c) { perTask[t] = null; continue; }
      perTask[t] = c;
      runCount += c.runCount;
      promptEst += c.promptEstTokens;
      cmdTokens += c.cmdTokens;
      usageRuns += c.usageRuns;
      machineItems += c.machineItems;
      machinePass += c.machinePass;
      manual += c.manual;
      skipped += c.skipped;
      hardFail += c.hardFail;
      if (c.computable) { computable++; if (c.pass) hitTasks++; }
    }
    out.set(id, {
      id, perTask, hitTasks, computable, runCount,
      passAt: computable > 0 ? hitTasks / computable : null,
      promptEstTokens: promptEst,
      promptEstAvg: runCount > 0 ? promptEst / runCount : null,
      cmdTokens, cmdTokensPerRun: usageRuns > 0 ? cmdTokens / usageRuns : null,
      usageRuns, machineItems, machinePass,
      machineRate: machineItems > 0 ? machinePass / machineItems : null,
      manual, skipped, hardFail,
    });
  }
  return out;
}

/**
 * 等长对照判决。核心一句：净内容效应 = current 的增益 − unrelated 的位移。
 * 净效应 ≤ 0 就说明「换一段等长的无关文字」也能拿到同样甚至更好的结果。
 */
function verdict(summary, baselineId, currentId = 'current', unrelatedId = 'unrelated') {
  const base = summary.get(baselineId);
  const cur = summary.get(currentId);
  const unrel = summary.get(unrelatedId);
  const v = {
    baseline: baselineId, current: currentId, unrelated: unrelatedId,
    baselinePassAt: base?.passAt ?? null,
    currentPassAt: cur?.passAt ?? null,
    unrelatedPassAt: unrel?.passAt ?? null,
    gainCurrent: (base && cur && base.passAt !== null && cur.passAt !== null) ? cur.passAt - base.passAt : null,
    deltaUnrelated: (base && unrel && base.passAt !== null && unrel.passAt !== null) ? unrel.passAt - base.passAt : null,
    deltaTokensCurrent: (base && cur) ? cur.cmdTokens - base.cmdTokens : null,
    deltaTokensUnrelated: (base && unrel) ? unrel.cmdTokens - base.cmdTokens : null,
    deltaPromptEstCurrent: (base && cur) ? cur.promptEstTokens - base.promptEstTokens : null,
    deltaPromptEstUnrelated: (base && unrel) ? unrel.promptEstTokens - base.promptEstTokens : null,
  };
  v.netContentEffect = (v.gainCurrent !== null && v.deltaUnrelated !== null)
    ? v.gainCurrent - v.deltaUnrelated : null;
  if (v.gainCurrent === null || v.deltaUnrelated === null) {
    v.status = 'insufficient';
    v.warning = false;
    v.message = `缺少 ${!base ? baselineId : (v.gainCurrent === null ? currentId : unrelatedId)} 条件的数据，无法做等长对照判决——这正是 WebDev-Skills-Bench 要求的最低对照条件，请补齐后重跑。`;
  } else if (v.netContentEffect <= 0) {
    v.status = 'warn';
    v.warning = true;
    v.message = `增益可能来自提示体积而非技能内容：current 增益 ${signed(v.gainCurrent)}，等长无关条件 ${signed(v.deltaUnrelated)}，净内容效应 ${signed(v.netContentEffect)} ≤ 0。`;
  } else if (v.deltaUnrelated > 0) {
    v.status = 'note';
    v.warning = true;
    v.message = `等长无关条件也在涨（${signed(v.deltaUnrelated)}），current 的净内容效应只有 ${signed(v.netContentEffect)}——增益里有一部分可以归给提示体积。`;
  } else {
    v.status = 'ok';
    v.warning = false;
    v.message = `current 增益 ${signed(v.gainCurrent)}，等长无关条件 ${signed(v.deltaUnrelated)}（长度本身是负作用），净内容效应 ${signed(v.netContentEffect)}。`;
  }
  return v;
}

function main() {
  const args = parseArgs(process.argv);
  if (args.help || args.h) {
    console.log('用法: node bench/score.mjs [results/*.json | results 目录] [--json] [--baseline none] [--tasks a,b] [--conditions a,b]');
    process.exit(0);
  }
  const pos = args._.length ? args._ : [path.join(HERE, 'results')];
  if (!pos.length) die(2, '没给结果文件；用法见 --help');
  const files = expandInputs(pos);
  if (!files.length) die(2, '没有可统计的结果文件');
  const results = files.map(loadResult);
  if (!results.length) die(1, '没有可读的结果文件');

  const baselineId = typeof args.baseline === 'string' ? args.baseline : 'none';
  const filter = { tasks: listArg(args.tasks), conditions: listArg(args.conditions) };
  const { cells, issues, declaredRuns } = aggregate(results, filter);
  if (!cells.size) die(2, '过滤器筛完一个格子都不剩（检查 --tasks / --conditions 是否与结果文件里的 id 一致）');

  // 条件与任务顺序：优先照第一个结果文件 meta 里声明的顺序，其余按字母补在后面。
  const meta0 = results[0].meta;
  const orderFrom = (list, key) => (Array.isArray(list) ? list.map((x) => (typeof x === 'string' ? x : x?.[key])).filter(Boolean) : []);
  const conditionIds = [...new Set([...orderFrom(meta0.conditions, 'id'),
    ...[...cells.values()].map((c) => c.condition)].sort())]
    .filter((id) => !filter.conditions || filter.conditions.includes(id));
  const taskIds = [...new Set([...orderFrom(meta0.tasks, 'id'),
    ...[...cells.values()].map((c) => c.task)].sort())]
    .filter((id) => !filter.tasks || filter.tasks.includes(id));
  if (!conditionIds.length || !taskIds.length) die(2, '条件或任务列表为空');

  const summary = summarize(cells, conditionIds, taskIds);
  if (!summary.has(baselineId) || summary.get(baselineId).passAt === null) {
    issues.push(`缺少基准条件 ${baselineId} 的可计算数据，ΔPass@k 与 Δtokens 无法给出`);
  }
  const v = verdict(summary, baselineId);
  const example = results.some((r) => /EXAMPLE/i.test(String(r.meta.modelNote ?? '')));
  const kLabel = declaredRuns > 0 ? `Pass@${declaredRuns}` : 'Pass@k';
  const incomplete = issues.length > 0;

  if (args.json) {
    const payload = {
      generatedAt: new Date().toISOString(),
      files: results.map((r) => r.file),
      exampleData: example,
      baseline: baselineId,
      declaredRuns,
      passLabel: kLabel,
      conditions: conditionIds.map((id) => {
        const s = summary.get(id);
        return {
          id, passAt: s.passAt, hitTasks: s.hitTasks, computableTasks: s.computable,
          deltaPassAt: (summary.get(baselineId)?.passAt != null && s.passAt != null)
            ? s.passAt - summary.get(baselineId).passAt : null,
          machineItems: s.machineItems, machinePass: s.machinePass, machineRate: s.machineRate,
          promptEstTokens: s.promptEstTokens, promptEstAvgPerRun: s.promptEstAvg,
          cmdTokens: s.cmdTokens, cmdTokensPerRun: s.cmdTokensPerRun, usageRuns: s.usageRuns,
          deltaCmdTokens: (summary.get(baselineId) ? s.cmdTokens - summary.get(baselineId).cmdTokens : null),
          deltaPromptEstTokens: (summary.get(baselineId) ? s.promptEstTokens - summary.get(baselineId).promptEstTokens : null),
          hardFail: s.hardFail, skipped: s.skipped, manual: s.manual, runCount: s.runCount,
          tasks: Object.fromEntries(taskIds.map((t) => {
            const c = s.perTask[t];
            return [t, c ? { pass: c.pass, hits: c.hits, runCount: c.runCount,
              machineItems: c.machineItems, machinePass: c.machinePass,
              skipped: c.skipped, manual: c.manual, hardFail: c.hardFail,
              promptEstTokens: c.promptEstTokens, cmdTokens: c.cmdTokens } : null];
          })),
        };
      }),
      verdict: v,
      complete: !incomplete,
      issues,
    };
    console.log(JSON.stringify(payload, null, 2));
    process.exit(incomplete ? 3 : 0);
  }

  console.log(`结果文件：${results.map((r) => r.file).join('、')}`);
  console.log(`条件：${conditionIds.join(', ')}　任务：${taskIds.length} 个　每格 run 数：${declaredRuns || '?'}`);
  if (example) {
    console.log('');
    console.log('!! 注意：meta.modelNote 声明这是 EXAMPLE 占位样例数据，schema 演示用，不是实测结果。');
  }
  console.log('');
  console.log(`== ${kLabel} 矩阵（✓ 命中 / ✗ 未命中，后面是 命中run数/总run数）`);
  console.log(table(['任务 \ 条件', ...conditionIds], taskIds.map((t) => [
    t, ...conditionIds.map((id) => {
      const c = cells.get(`${id}|${t}`);
      if (!c || !c.computable) return '—';
      return `${c.pass ? '✓' : '✗'} ${c.hits}/${c.runCount}`;
    }),
  ])));
  console.log('');
  console.log(`== 条件汇总（${kLabel} = 命中任务数 / 可计算任务数；Δ 相对 ${baselineId}）`);
  console.log(table(['条件', kLabel, `Δ${kLabel}`, '机器判项通过率', '硬失败', '跳过项', '人工待评'],
    conditionIds.map((id) => {
      const s = summary.get(id);
      const base = summary.get(baselineId);
      return [id,
        s.passAt === null ? '—' : `${(s.passAt * 100).toFixed(1)}% (${s.hitTasks}/${s.computable})`,
        (base?.passAt != null && s.passAt != null) ? signed((s.passAt - base.passAt) * 100, 1) + ' pt' : '—',
        s.machineItems ? `${((s.machinePass / s.machineItems) * 100).toFixed(1)}% (${s.machinePass}/${s.machineItems})` : '—',
        String(s.hardFail), String(s.skipped), String(s.manual)];
    })));
  console.log('');
  console.log('== token 记账（cmd tokens 来自模型命令上报；prompt est 用仓库口径估：CJK×1.4 + 其余×0.3）');
  console.log(table(['条件', 'run 数', 'prompt est 合计', 'Δ prompt est', '每 run 均值', 'cmd tokens 合计', 'Δ cmd tokens', '有上报的 run'],
    conditionIds.map((id) => {
      const s = summary.get(id);
      const base = summary.get(baselineId);
      return [id, String(s.runCount), tok(s.promptEstTokens),
        base ? signed(s.promptEstTokens - base.promptEstTokens, 0) : '—',
        pct(s.promptEstAvg, 0), tok(s.cmdTokens),
        base ? signed(s.cmdTokens - base.cmdTokens, 0) : '—',
        `${s.usageRuns}/${s.runCount}`];
    })));
  console.log('');
  console.log('== 等长对照判决（WebDev-Skills-Bench 要求的最低对照）');
  console.log(`  ${baselineId} ${kLabel}      : ${pct(v.baselinePassAt)}`);
  console.log(`  ${v.current} ${kLabel}      : ${pct(v.currentPassAt)}　增益 ${signed(v.gainCurrent)}`);
  console.log(`  ${v.unrelated} ${kLabel}  : ${pct(v.unrelatedPassAt)}　位移 ${signed(v.deltaUnrelated)}`);
  console.log(`  净内容效应（增益 − 位移）: ${signed(v.netContentEffect)}`);
  console.log(`  ${v.warning ? 'WARN' : (v.status === 'insufficient' ? 'INFO' : 'OK  ')} ${v.message}`);
  const manualTotal = conditionIds.reduce((n, id) => n + summary.get(id).manual, 0);
  if (manualTotal > 0) {
    console.log('');
    console.log(`== 人工待评：${manualTotal} 项 visual-review 未计分（评分标准见 bench/tasks/*.json 的 criteria 字段，1–5 分，≥4 视为通过）`);
  }
  if (issues.length) {
    console.log('');
    console.log(`== 数据完整性：${issues.length} 条提示`);
    for (const i of [...new Set(issues)].slice(0, 20)) console.log(`  · ${i}`);
  }
  process.exit(incomplete ? 3 : 0);
}

main();
