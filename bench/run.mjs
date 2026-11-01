#!/usr/bin/env node
/**
 * bench 运行器：把「4 条件 × 3 任务 × N 次」的对照实验真跑一遍，产出 results/*.json。
 *
 * 对应学界结论：注入技能不保证提升（WebDev-Skills-Bench，arXiv 2608.23067，
 * 四模型平均 ΔPass@2 为负，且等长无关技能复现了大部分损失）。所以本 runner 的
 * 默认条件集里**必须**带 unrelated（等长无关技能），否则 score.mjs 没法把
 * 「技能内容有效」和「上下文多了一段字」区分开。
 *
 * 每个格子（condition × task × run）的流程：
 *   ① 组装 prompt 文件（条件技能文本 + 分隔线 + 任务 prompt，占位符已替换）
 *   ② 用 --cmd 模板调模型（模板里 {prompt_file} {out_dir} 会被替换成真实路径）
 *   ③ 收集产物（task.artifacts）与 token 用量（命令 stdout 里有 JSON 用量就解析，
 *      没有就记 null，并用 est tokens 口径估 prompt 侧）
 *   ④ 跑 acceptance 里可机器判的 cmd，记 pass/fail 与输出尾部
 *   ⑤ 汇总写进结果 JSON，交给 bench/score.mjs 算 Pass@2 与 Δ
 *
 * 用法:
 *   node bench/run.mjs --dry-run                     # 不调模型，用 stub 产物走通全链路
 *   node bench/run.mjs --cmd "mycli --prompt-file {prompt_file} --out-dir {out_dir}"
 *   node bench/run.mjs --cmd "..." --tasks admin-form-page,marketing-landing \
 *        --conditions none,current --runs 2 --out bench/results/run-x.json
 *   node bench/run.mjs --cmd "..." --verify-conditions --allow-partial
 *
 * 关键选项:
 *   --cmd <模板>          模型调用命令。占位符：{prompt_file} {out_dir} {work_dir}
 *                         {task} {condition} {run} {repo_root}（路径一律正斜杠）
 *   --tasks a,b,c         任务 id，默认 bench/tasks/ 下全部
 *   --conditions ...      条件 id，默认 none,legacy,current,unrelated
 *   --runs N              每格重复次数，默认 2（Pass@2）
 *   --out <路径>          结果 JSON，默认 bench/results/run-<时间戳>.json
 *   --work-root <目录>    产物与 prompt 的落盘根，默认 <系统临时目录>/frontend-fidelity-bench
 *   --dry-run             不调模型：直接写 stub 产物，用来验证 harness 本身
 *   --allow-partial       有格子失败时退出 3 而不是 1（结果文件照样写全）
 *   --verify-conditions   开跑前先跑 conditions/verify-length.mjs，等长对照不成立就退出 2
 *   --skip-acceptance     只生成不验收（调试 prompt 用）
 *   --timeout <ms>        单次模型调用超时，默认 900000
 *   --acceptance-timeout <ms>  单条验收命令超时，默认 300000
 *   --json                结果摘要以 JSON 打印（结果文件不受影响）
 *
 * 退出码（仓库约定）:
 *   0 全部计划的格子都跑完，产物齐全（acceptance 的 pass/fail 是测量结果，不影响退出码）；
 *   1 有格子的模型命令失败（非 0 退出 / 超时 / 起不来）或产物缺失；
 *   2 参数或环境错（未知 task/condition、非 dry-run 却没给 --cmd、等长校验不过、结果写不出去）；
 *   3 只完成一部分，且显式传了 --allow-partial。
 *
 * 零依赖（只用 node: 内置模块）。
 */

import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { estimateTokens, verifyLength } from './conditions/verify-length.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(HERE, '..');
const CONDITIONS_DIR = path.join(HERE, 'conditions');
const TASKS_DIR = path.join(HERE, 'tasks');
const DEFAULT_CONDITIONS = ['none', 'legacy', 'current', 'unrelated'];
const SCHEMA_VERSION = 1;
/** 正斜杠路径，喂给 shell 时 Windows / POSIX 都认。 */
const fwd = (p) => String(p).split(path.sep).join('/');

function die(code, msg) {
  console.error(`FAIL ${msg}`);
  process.exit(code);
}

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

function listArg(v, fallback) {
  if (v === undefined || v === true) return fallback;
  return String(v).split(',').map((s) => s.trim()).filter(Boolean);
}

function numArg(v, fallback, name) {
  if (v === undefined || v === true) return fallback;
  const n = Number(v);
  if (!Number.isFinite(n) || n <= 0) die(2, `${name} 需要是正数，收到 ${v}`);
  return n;
}

function timestamp(d = new Date()) {
  const p = (n, w = 2) => String(n).padStart(w, '0');
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`;
}

/** 读 JSON，坏掉就按参数/环境错退出。 */
function readJson(file, what) {
  let raw;
  try { raw = readFileSync(file, 'utf8'); }
  catch (err) { die(2, `${what} 读不到 ${fwd(file)}：${err.message}`); }
  try { return JSON.parse(raw); }
  catch (err) { die(2, `${what} 解析失败 ${fwd(file)}：${err.message}`); }
}

/**
 * 条件解析：id → conditions/*.json 里的 "id" 字段。
 * 不写死文件名，所以 unrelated 的文件叫 unrelated-length-matched.json 也能认出来。
 */
function loadConditions(ids) {
  const files = readdirSync(CONDITIONS_DIR).filter((f) => f.endsWith('.json')).sort();
  const byId = new Map();
  for (const f of files) {
    const json = readJson(path.join(CONDITIONS_DIR, f), '条件定义');
    if (!json || typeof json.id !== 'string') die(2, `条件文件 ${f} 缺少字符串 id`);
    if (byId.has(json.id)) die(2, `条件 id ${json.id} 在 ${f} 与 ${byId.get(json.id).file} 里重复`);
    byId.set(json.id, { ...json, file: f });
  }
  const missing = ids.filter((id) => !byId.has(id));
  if (missing.length) die(2, `未知条件 ${missing.join(', ')}；可用：${[...byId.keys()].join(', ')}`);
  return ids.map((id) => {
    const c = byId.get(id);
    let skillText = null;
    let est = 0;
    if (c.skillFile) {
      const abs = path.resolve(CONDITIONS_DIR, c.skillFile);
      if (!existsSync(abs)) die(2, `条件 ${id} 的技能文件不存在：${fwd(abs)}`);
      skillText = readFileSync(abs, 'utf8');
      est = estimateTokens(skillText);
      if (c.estTokens !== undefined && c.estTokens !== est) {
        console.warn(`WARN 条件 ${id} 声明 estTokens=${c.estTokens} 与实测 ${est} 不一致（以实测为准，请更新 ${c.file}）`);
      }
    }
    return { id, label: c.label ?? id, file: c.file, skillFile: c.skillFile ?? null, skillText, estTokens: est, note: c.note ?? null };
  });
}

function loadTasks(ids) {
  const files = readdirSync(TASKS_DIR).filter((f) => f.endsWith('.json')).sort();
  const byId = new Map();
  for (const f of files) {
    const json = readJson(path.join(TASKS_DIR, f), '任务规格');
    if (!json || typeof json.id !== 'string') die(2, `任务文件 ${f} 缺少字符串 id`);
    if (typeof json.prompt !== 'string' || !json.prompt.trim()) die(2, `任务 ${json.id} 缺少 prompt`);
    if (!Array.isArray(json.acceptance) || !json.acceptance.length) die(2, `任务 ${json.id} 缺少 acceptance`);
    if (!Array.isArray(json.artifacts) || !json.artifacts.length) die(2, `任务 ${json.id} 缺少 artifacts`);
    byId.set(json.id, { ...json, file: f });
  }
  const missing = ids.filter((id) => !byId.has(id));
  if (missing.length) die(2, `未知任务 ${missing.join(', ')}；可用：${[...byId.keys()].join(', ')}`);
  return ids.map((id) => byId.get(id));
}

/** 占位符替换。ctx 里的路径一律正斜杠。 */
function substitute(text, ctx) {
  return String(text).replace(/\{(\w+)\}/g, (m, key) => (key in ctx ? ctx[key] : m));
}

/**
 * 组装 prompt 文件内容。四个条件之间**只有技能块不同**，其余包装完全一致，
 * 这样条件差才是「技能内容」的差，而不是「多了一个标题」的差。
 */
function buildPrompt(condition, taskPrompt, ctx) {
  const body = `# 任务\n\n${substitute(taskPrompt, ctx)}\n`;
  if (!condition.skillText) return body;
  return `# 可用技能（先读完，再按它的判据完成任务）\n\n${condition.skillText.trim()}\n\n---\n\n${body}`;
}

/** 从命令输出里捞 JSON 用量。支持 {"usage":{...}} / {"prompt_tokens":..} / 裸 usage 对象。 */
export function parseTokenUsage(text) {
  if (!text) return null;
  const pick = (obj) => {
    if (!obj || typeof obj !== 'object') return null;
    const u = (obj.usage && typeof obj.usage === 'object') ? obj.usage
      : (obj.tokens && typeof obj.tokens === 'object') ? obj.tokens : obj;
    const get = (...keys) => {
      for (const k of keys) if (Number.isFinite(Number(u[k]))) return Number(u[k]);
      return null;
    };
    const inputTokens = get('input_tokens', 'prompt_tokens', 'inputTokens', 'promptTokens', 'input');
    const outputTokens = get('output_tokens', 'completion_tokens', 'outputTokens', 'completionTokens', 'output');
    const totalTokens = get('total_tokens', 'totalTokens', 'total');
    if (inputTokens === null && outputTokens === null && totalTokens === null) return null;
    return {
      inputTokens, outputTokens,
      totalTokens: totalTokens ?? ((inputTokens ?? 0) + (outputTokens ?? 0) || null),
      source: 'cmd-output',
    };
  };
  const tryParse = (s) => { try { return pick(JSON.parse(s)); } catch { return null; } };
  const direct = tryParse(text.trim());
  if (direct) return direct;
  const lines = text.split(/\r?\n/).reverse();
  for (const line of lines) {
    const t = line.trim();
    if (!t.startsWith('{') || !t.endsWith('}')) continue;
    const hit = tryParse(t);
    if (hit) return hit;
  }
  return null;
}

/** 环境探测：acceptance 的 requires 字段靠它决定「跑」还是「跳过」。 */
function detectEnvironment() {
  const py = spawnSync(process.platform === 'win32' ? 'python' : 'python3', ['-V'], { encoding: 'utf8', timeout: 20000 });
  const pythonOk = py.status === 0;
  const playwrightOk = existsSync(path.join(REPO_ROOT, 'node_modules', 'playwright'));
  return {
    node: process.version,
    platform: `${os.platform()} ${os.arch()}`,
    python: pythonOk ? (py.stdout || py.stderr || '').trim().split(/\r?\n/)[0] : null,
    playwright: playwrightOk,
  };
}

/** requires 字段 → 本机是否具备。未声明 requires 的一律照跑。 */
function requirementMet(requires, env) {
  if (!requires) return true;
  const key = String(requires).toLowerCase();
  if (key === 'python') return Boolean(env.python);
  if (key === 'playwright') return Boolean(env.playwright);
  return true;
}

/** python 可执行名：Windows 上是 python，POSIX 上通常是 python3。 */
const PY = process.platform === 'win32' ? 'python' : 'python3';

/**
 * --dry-run 用的 stub 产物：每个任务一份「真能过全部机器判项」的单文件 HTML。
 *
 * 这不是给模型抄的样板，而是 harness 的自检夹具，作用有两个：
 *   ① 不调模型也能把「组装 prompt → 落盘 → 跑 acceptance → 写结果」全链路走通；
 *   ② 证明 acceptance 判据是**可满足的**（不是永远红的门），配色是照 WCAG AA 实算过的：
 *      --text #111827 / --muted #4b5563 / --link #1d4ed8 在 --bg #ffffff 上分别 17.2 / 7.6 / 6.3，
 *      白字 #ffffff 在 --brand #1d4ed8 上 6.3；--border 走 contrast_check 的 soft 分支只提示不判失败。
 * 刻意不用 <img>（改内联 svg + aria-hidden），避免 alt / 坏图 / Logo 拉伸这三类 error 干扰。
 */
const STUB_CSS = `
*,*::before,*::after{box-sizing:border-box}
:root{
  --bg:#ffffff;
  --surface:#ffffff;
  --card-bg:#ffffff;
  --text:#111827;
  --muted:#4b5563;
  --link:#1d4ed8;
  --border:#d1d5db;
  --brand:#1d4ed8;
  --on-brand:#ffffff;
  --danger:#b91c1c;
  --success:#166534;
  --space-1:4px;
  --space-2:8px;
  --space-3:12px;
  --space-4:16px;
  --space-6:24px;
  --space-8:32px;
  --radius-m:8px;
  --radius-l:16px;
  --fs-1:12px;
  --fs-2:14px;
  --fs-3:16px;
  --fs-4:20px;
  --fs-5:24px;
  --fs-6:32px;
  --shadow-1:0 1px 2px rgba(17,24,39,.12);
}
html{-webkit-text-size-adjust:100%}
body{margin:0;background:var(--bg);color:var(--text);
  font-family:system-ui,-apple-system,"Segoe UI","PingFang SC","Microsoft YaHei",sans-serif;
  font-size:var(--fs-3);line-height:1.6}
h1,h2,h3,p,ul,ol,figure{margin:0}
ul,ol{padding-left:1.25em}
a{color:var(--link)}
.sr-only{position:absolute;width:1px;height:1px;margin:-1px;padding:0;
  overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap;border:0}
.wrap{width:100%;max-width:1120px;margin:0 auto;padding:0 var(--space-4)}
.muted{color:var(--muted);font-size:var(--fs-2)}
.btn{display:inline-flex;align-items:center;justify-content:center;gap:var(--space-2);
  min-height:40px;padding:0 var(--space-4);border:1px solid transparent;border-radius:var(--radius-m);
  background:var(--brand);color:var(--on-brand);font-size:var(--fs-3);font-weight:600;
  text-decoration:none;cursor:pointer}
.btn-ghost{background:var(--bg);color:var(--brand);border-color:var(--border)}
.btn:focus-visible,a:focus-visible,input:focus-visible,select:focus-visible,
textarea:focus-visible,summary:focus-visible{outline:2px solid var(--brand);outline-offset:2px}
.card{background:var(--card-bg);border:1px solid var(--border);border-radius:var(--radius-l);
  padding:var(--space-4);box-shadow:var(--shadow-1)}
.field{display:flex;flex-direction:column;gap:var(--space-2);margin-bottom:var(--space-4)}
.field label{font-size:var(--fs-2);font-weight:600;color:var(--text)}
.field .hint{color:var(--muted);font-size:var(--fs-1)}
input[type=text],input[type=email],input[type=date],input[type=number],input[type=search],select,textarea{
  width:100%;min-height:40px;padding:var(--space-2) var(--space-3);border:1px solid var(--border);
  border-radius:var(--radius-m);background:var(--bg);color:var(--text);font-size:var(--fs-3)}
textarea{min-height:88px;resize:vertical}
.err{color:var(--danger);font-size:var(--fs-2)}
fieldset{margin:0 0 var(--space-4);padding:var(--space-3) var(--space-4);
  border:1px solid var(--border);border-radius:var(--radius-m)}
legend{padding:0 var(--space-1);font-size:var(--fs-2);font-weight:600}
.choice{display:flex;align-items:center;gap:var(--space-2);font-size:var(--fs-2)}
@media (max-width:768px){.wrap{padding:0 var(--space-3)}h1{font-size:var(--fs-5)}}
`;

/** 文档壳：doctype / lang / charset / viewport / title 一次给齐。 */
function stubShell(title, bodyCss, bodyHtml) {
  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${title}</title>
<style>${STUB_CSS}${bodyCss}</style>
</head>
<body>
${bodyHtml}
</body>
</html>
`;
}

const STUB_SVG = '<svg width="20" height="20" viewBox="0 0 20 20" aria-hidden="true" focusable="false"><rect width="20" height="20" rx="4" fill="#1d4ed8"></rect></svg>';

/** 任务一：企业后台表单页 stub。 */
function stubAdmin() {
  const css = `
.topbar{background:var(--surface);border-bottom:1px solid var(--border)}
.topbar-in{display:flex;align-items:center;justify-content:space-between;gap:var(--space-4);min-height:56px}
.brand{display:flex;align-items:center;gap:var(--space-2);font-weight:700}
.nav-list{display:flex;gap:var(--space-4);margin:0;padding:0;list-style:none}
main{padding:var(--space-6) 0}
h1{font-size:var(--fs-6);line-height:1.25;margin-bottom:var(--space-2)}
.form{max-width:720px;margin-top:var(--space-4);padding:var(--space-6)}
.row2{display:grid;grid-template-columns:1fr 1fr;gap:var(--space-4)}
@media (max-width:768px){.row2{grid-template-columns:1fr}}
.actions{display:flex;gap:var(--space-3);margin-top:var(--space-6)}
.banner{padding:var(--space-3) var(--space-4);border-radius:var(--radius-m);font-size:var(--fs-2)}
.banner-error{background:#fff5f5;color:#b91c1c}
.banner-ok{background:#f2fbf5;color:#166534}
.states{display:grid;gap:var(--space-3);max-width:720px;margin-top:var(--space-6)}
.empty{padding:var(--space-6);border:1px dashed var(--border);border-radius:var(--radius-m);
  color:var(--muted);font-size:var(--fs-2);text-align:center}
.skel{height:12px;border-radius:6px;background:#e5e7eb}
`;
  const body = `
<header class="topbar">
  <div class="wrap topbar-in">
    <span class="brand">${STUB_SVG}星海运维台</span>
    <nav aria-label="主导航">
      <ul class="nav-list">
        <li><a href="#overview">概览</a></li>
        <li><a href="#tickets" aria-current="page">工单</a></li>
        <li><a href="#settings">设置</a></li>
      </ul>
    </nav>
  </div>
</header>
<main class="wrap" id="main">
  <h1>新建工单</h1>
  <p class="muted">带 * 的为必填项。提交后系统会生成工单号，并通知所选责任人。</p>
  <form class="card form" id="ticket-form">
    <div class="field">
      <label for="f-title">工单标题 *</label>
      <input id="f-title" name="title" type="text" required aria-describedby="d-title" aria-invalid="true">
      <span class="hint" id="d-title">6–40 字，写清现象与影响范围</span>
      <span class="err" id="e-title">请填写工单标题</span>
    </div>
    <div class="row2">
      <div class="field">
        <label for="f-reporter">报障人邮箱 *</label>
        <input id="f-reporter" name="reporter" type="email" required>
      </div>
      <div class="field">
        <label for="f-date">发生日期</label>
        <input id="f-date" name="date" type="date" value="2026-11-01">
      </div>
    </div>
    <div class="row2">
      <div class="field">
        <label for="f-level">优先级</label>
        <select id="f-level" name="level">
          <option value="p3">P3 一般</option>
          <option value="p2" selected>P2 重要</option>
          <option value="p1">P1 紧急</option>
        </select>
      </div>
      <div class="field">
        <label for="f-cost">影响金额（元）</label>
        <input id="f-cost" name="cost" type="number" min="0" step="100" value="0">
      </div>
    </div>
    <fieldset>
      <legend>报障渠道</legend>
      <div class="choice"><input id="f-ch-1" name="channel" type="radio" value="phone" checked><label for="f-ch-1">电话</label></div>
      <div class="choice"><input id="f-ch-2" name="channel" type="radio" value="mail"><label for="f-ch-2">邮件</label></div>
      <div class="choice"><input id="f-ch-3" name="channel" type="radio" value="im"><label for="f-ch-3">企业 IM</label></div>
    </fieldset>
    <div class="field">
      <label for="f-desc">问题描述 *</label>
      <textarea id="f-desc" name="desc" required aria-describedby="d-desc"></textarea>
      <span class="hint" id="d-desc">复现步骤、报错原文、已排除项</span>
    </div>
    <div class="field">
      <div class="choice">
        <input id="f-notify" name="notify" type="checkbox" role="switch" checked>
        <label for="f-notify">创建后短信通知报障人</label>
      </div>
    </div>
    <div class="actions">
      <button class="btn" type="submit">提交工单</button>
      <button class="btn btn-ghost" type="reset">重置</button>
    </div>
  </form>
  <section class="states" aria-label="状态示例">
    <p class="banner banner-error">提交失败：工单服务 503，请稍后重试（错误码 T-5031）。</p>
    <p class="banner banner-ok">提交成功：工单 T-20261101-018 已创建，责任人 张伟。</p>
    <div class="empty">暂无历史工单，提交第一张工单后会出现在这里。</div>
    <div class="card" aria-hidden="true"><div class="skel" style="width:60%"></div></div>
  </section>
</main>
`;
  return stubShell('新建工单 · 星海运维台', css, body);
}

/** 任务二：移动 H5 卡片流 stub。 */
function stubMobile() {
  const shops = [
    ['青禾咖啡', '步行 3 分钟 · 4.8 分', '手冲单品与自烘豆，工作日 7:30 开门'],
    ['拾光书店', '步行 5 分钟 · 4.6 分', '二手人文社科，可店内自习到 22:00'],
    ['巷子面馆', '步行 2 分钟 · 4.5 分', '现拉牛肉面，午市 11:00–14:00'],
    ['南山花房', '步行 8 分钟 · 4.9 分', '周更鲜花订阅，支持当日自提'],
    ['修表铺子', '步行 6 分钟 · 4.4 分', '机械表保养与换电池，需预约'],
    ['小满烘焙', '步行 4 分钟 · 4.7 分', '低糖欧包，晚间八点后半价'],
    ['云台健身房', '步行 10 分钟 · 4.3 分', '24 小时自助，月卡可暂停'],
    ['旧物仓', '步行 12 分钟 · 4.2 分', '中古家具与胶片相机寄卖'],
  ];
  const rail = shops.map(([t, meta, desc], i) => `
      <article class="card rail-card" id="shop-${i + 1}">
        <span class="thumb" aria-hidden="true">${STUB_SVG}</span>
        <h3>${t}</h3>
        <p class="muted">${meta}</p>
        <p class="desc">${desc}</p>
        <a class="btn btn-ghost more" href="#shop-${i + 1}">查看详情</a>
      </article>`).join('');
  const css = `
body{padding-bottom:calc(16px + env(safe-area-inset-bottom));background:#f7f8fa}
.topbar{position:sticky;top:0;z-index:2;background:var(--surface);
  border-bottom:1px solid var(--border);padding-top:env(safe-area-inset-top)}
.topbar-in{display:flex;align-items:center;justify-content:space-between;gap:var(--space-3);min-height:52px}
.brand{display:flex;align-items:center;gap:var(--space-2);font-weight:700}
.nav-list{display:flex;gap:var(--space-3);margin:0;padding:0;list-style:none;font-size:var(--fs-2)}
main{padding:var(--space-4) 0}
h1{font-size:var(--fs-5);line-height:1.3}
h2{font-size:var(--fs-4);margin:var(--space-6) 0 var(--space-3)}
h3{font-size:var(--fs-3)}
.search{display:flex;flex-direction:column;gap:var(--space-2);margin:var(--space-3) 0 var(--space-4)}
.rail{display:flex;gap:var(--space-3);overflow-x:auto;scroll-snap-type:x mandatory;
  padding:var(--space-1) var(--space-4) var(--space-4);-webkit-overflow-scrolling:touch}
.rail-card{flex:0 0 clamp(220px,72vw,280px);scroll-snap-align:start;display:flex;
  flex-direction:column;gap:var(--space-2)}
.thumb{display:flex;width:100%;height:96px;align-items:center;justify-content:center;
  background:#eef2ff;border-radius:var(--radius-m)}
.desc{font-size:var(--fs-2);color:var(--text)}
.more{margin-top:auto;width:100%}
.feed{display:grid;gap:var(--space-3);padding:0 var(--space-4)}
.feed .card{display:flex;flex-direction:column;gap:var(--space-2)}
.chips{display:flex;flex-wrap:wrap;gap:var(--space-2);margin-bottom:var(--space-3)}
.chip{border:1px solid var(--border);border-radius:999px;background:var(--bg);
  color:var(--text);font-size:var(--fs-1);padding:var(--space-1) var(--space-3)}
.tabbar{display:flex;gap:var(--space-2);border-top:1px solid var(--border);
  background:var(--surface);padding:var(--space-2) var(--space-4)}
.tabbar a{flex:1;text-align:center;font-size:var(--fs-1);color:var(--muted);
  text-decoration:none;padding:var(--space-2) 0}
`;
  const body = `
<header class="topbar">
  <div class="topbar-in wrap">
    <span class="brand">${STUB_SVG}附近好店</span>
    <nav aria-label="页面内跳转">
      <ul class="nav-list">
        <li><a href="#nearby">附近</a></li>
        <li><a href="#all">全部</a></li>
      </ul>
    </nav>
  </div>
</header>
<main id="main">
  <div class="wrap">
    <h1>附近好店</h1>
    <p class="muted">当前定位：南山区科苑路 · 已按距离排序</p>
    <div class="search">
      <label class="sr-only" for="q">搜索店铺或品类</label>
      <input id="q" name="q" type="search" placeholder="搜索咖啡、书店、面馆">
    </div>
    <div class="chips">
      <span class="chip">全部</span><span class="chip">咖啡</span><span class="chip">书店</span>
      <span class="chip">小吃</span><span class="chip">生活服务</span>
    </div>
  </div>
  <h2 class="wrap" id="nearby">离你最近</h2>
  <div class="rail">${rail}
  </div>
  <h2 class="wrap" id="all">全部店铺</h2>
  <div class="feed">
    <article class="card item"><h3>青禾咖啡（科苑路店）</h3><p class="muted">步行 3 分钟 · 4.8 分 · 营业中</p><p class="desc">手冲单品与自烘豆，工作日 7:30 开门，可外带杯具自带减免 3 元。</p><a class="btn btn-ghost more" href="#shop-1">查看详情</a></article>
    <article class="card item"><h3>拾光书店</h3><p class="muted">步行 5 分钟 · 4.6 分 · 营业中</p><p class="desc">二手人文社科为主，二楼有 12 个自习位，需提前一天预约。</p><a class="btn btn-ghost more" href="#shop-2">查看详情</a></article>
    <article class="card item"><h3>巷子面馆</h3><p class="muted">步行 2 分钟 · 4.5 分 · 午市</p><p class="desc">现拉牛肉面与油泼面，午市 11:00–14:00，排队常超 20 分钟。</p><a class="btn btn-ghost more" href="#shop-3">查看详情</a></article>
  </div>
  <p class="wrap muted">没有更多了，换个关键词试试。</p>
</main>
<nav class="tabbar" aria-label="底部导航">
  <a href="#main" aria-current="page">发现</a>
  <a href="#nearby">附近</a>
  <a href="#all">收藏</a>
  <a href="#main">我的</a>
</nav>
`;
  return stubShell('附近好店 · 移动发现页', css, body);
}

/** 任务三：营销落地页 stub。 */
function stubLanding() {
  const css = `
.site-header{position:sticky;top:0;z-index:3;background:var(--surface);border-bottom:1px solid var(--border)}
.bar{display:flex;align-items:center;justify-content:space-between;gap:var(--space-4);min-height:64px}
.brand{display:flex;align-items:center;gap:var(--space-2);font-weight:700}
.nav-list{display:flex;gap:var(--space-4);margin:0;padding:0;list-style:none;font-size:var(--fs-2)}
.hero{padding:var(--space-8) 0;background:var(--bg)}
.hero h1{font-size:clamp(28px,5vw,44px);line-height:1.2;max-width:20em}
.hero p{margin:var(--space-4) 0 var(--space-6);color:var(--muted);font-size:var(--fs-4);max-width:36em}
.cta-row{display:flex;flex-wrap:wrap;gap:var(--space-3)}
section{padding:var(--space-8) 0}
h2{font-size:var(--fs-5);line-height:1.3;margin-bottom:var(--space-2)}
h3{font-size:var(--fs-4);margin-bottom:var(--space-2)}
.lede{color:var(--muted);margin-bottom:var(--space-6);max-width:40em}
.grid{display:grid;grid-template-columns:repeat(3,1fr);gap:var(--space-4)}
.stats{display:grid;grid-template-columns:repeat(4,1fr);gap:var(--space-4)}
.stat{padding:var(--space-4);border:1px solid var(--border);border-radius:var(--radius-m);background:var(--bg)}
.num{font-size:var(--fs-6);font-weight:700;color:var(--brand)}
.plan{display:flex;flex-direction:column;gap:var(--space-3);padding:var(--space-6)}
.price{font-size:var(--fs-5);font-weight:700}
.plan .btn{width:100%}
.plans{display:grid;grid-template-columns:repeat(2,1fr);gap:var(--space-4);max-width:820px}
details{border-bottom:1px solid var(--border);padding:var(--space-3) 0}
summary{cursor:pointer;font-weight:600}
.final{background:#eef2ff;color:var(--text)}
.site-footer{background:var(--surface);border-top:1px solid var(--border);padding:var(--space-6) 0;color:var(--muted)}
.foot-cols{display:grid;grid-template-columns:repeat(3,1fr);gap:var(--space-4);font-size:var(--fs-2)}
@media (max-width:768px){
  .grid,.stats,.plans,.foot-cols{grid-template-columns:1fr}
  section{padding:var(--space-6) 0}
}
`;
  const body = `
<header class="site-header" id="top">
  <div class="wrap bar">
    <span class="brand">${STUB_SVG}潮位 TideMark</span>
    <nav aria-label="主导航">
      <ul class="nav-list">
        <li><a href="#features">能力</a></li>
        <li><a href="#proof">数据</a></li>
        <li><a href="#pricing">价格</a></li>
        <li><a href="#faq">常见问题</a></li>
      </ul>
    </nav>
    <a class="btn" href="#pricing">免费试用</a>
  </div>
</header>
<main id="main">
  <section class="hero">
    <div class="wrap">
      <h1>把渠道数据的口径，一次对齐</h1>
      <p>潮位把分散在广告平台、CRM 与财务表里的口径统一成一张可审计的宽表，让月度复盘从三天缩到三小时。</p>
      <div class="cta-row">
        <a class="btn" href="#pricing">开始 14 天试用</a>
        <a class="btn btn-ghost" href="#proof">看客户数据</a>
      </div>
    </div>
  </section>
  <section id="features">
    <div class="wrap">
      <h2>三件事，替你做完</h2>
      <p class="lede">不需要写 SQL，也不需要等数据团队排期。</p>
      <div class="grid">
        <article class="card"><h3>自动接入</h3><p class="muted">26 个渠道连接器，授权即同步，断点自动补跑。</p></article>
        <article class="card"><h3>口径统一</h3><p class="muted">归因窗口、汇率、退款冲销在建模层一次定义，全公司共用。</p></article>
        <article class="card"><h3>可审计留痕</h3><p class="muted">每个数字都能点开看来源、算法版本与修改人。</p></article>
      </div>
    </div>
  </section>
  <section id="proof">
    <div class="wrap">
      <h2>已经在这些团队里跑了一年</h2>
      <p class="lede">数据来自 2026 年 9 月的匿名化用量统计。</p>
      <div class="stats">
        <div class="stat"><p class="num">3,120</p><p class="muted">每周活跃工作区</p></div>
        <div class="stat"><p class="num">98.2%</p><p class="muted">同步任务成功率</p></div>
        <div class="stat"><p class="num">63%</p><p class="muted">复盘耗时下降中位数</p></div>
        <div class="stat"><p class="num">4.7/5</p><p class="muted">客户支持满意度</p></div>
      </div>
    </div>
  </section>
  <section id="pricing">
    <div class="wrap">
      <h2>价格</h2>
      <p class="lede">按同步数据量计费，不按人头。随时可降配。</p>
      <div class="plans">
        <article class="card plan">
          <h3>团队版</h3>
          <p class="price">¥ 1,280 / 月</p>
          <ul class="muted"><li>每月 500 万行同步</li><li>10 个连接器</li><li>邮件支持</li></ul>
          <a class="btn btn-ghost" href="#faq">选择团队版</a>
        </article>
        <article class="card plan">
          <h3>企业版</h3>
          <p class="price">按量报价</p>
          <ul class="muted"><li>不限行数</li><li>全部连接器与私有部署</li><li>专属客户成功经理</li></ul>
          <a class="btn" href="#faq">联系销售</a>
        </article>
      </div>
    </div>
  </section>
  <section id="faq">
    <div class="wrap">
      <h2>常见问题</h2>
      <details open><summary>需要动我们现有的数仓吗？</summary><p class="muted">不需要。潮位以只读方式接入，产出宽表可以回写到你的数仓。</p></details>
      <details><summary>历史数据能补跑多久？</summary><p class="muted">连接器支持范围内最长 24 个月，超出部分可用文件导入。</p></details>
      <details><summary>试用需要绑卡吗？</summary><p class="muted">不需要，14 天后自动降级为只读。</p></details>
    </div>
  </section>
  <section class="final">
    <div class="wrap">
      <h2>下一次月度复盘，别再手工对表</h2>
      <p class="lede">现在注册，今天就能看到第一张对齐后的宽表。</p>
      <div class="cta-row"><button class="btn" type="button">免费试用 14 天</button></div>
    </div>
  </section>
</main>
<footer class="site-footer">
  <div class="wrap foot-cols">
    <div><p class="muted">潮位 TideMark</p><p class="muted">让渠道口径可审计</p></div>
    <nav aria-label="页脚导航"><ul class="muted"><li><a href="#features">能力</a></li><li><a href="#pricing">价格</a></li></ul></nav>
    <div><p class="muted"><a href="#top">回到顶部</a></p><p class="muted">© 2026 TideMark</p></div>
  </div>
</footer>
`;
  return stubShell('潮位 TideMark · 让渠道口径可审计', css, body);
}

/** taskId → stub HTML。未知任务给一份最小可过的通用页，避免 dry-run 因缺产物而中断。 */
function stubHtml(taskId) {
  if (taskId === 'admin-form-page') return stubAdmin();
  if (taskId === 'mobile-h5-card-feed') return stubMobile();
  if (taskId === 'marketing-landing') return stubLanding();
  return stubShell(`${taskId} · stub`, '', `<main class="wrap" id="main"><h1>${taskId}</h1>
<p class="muted">这是 --dry-run 的占位产物，只用来验证 harness 链路。</p></main>`);
}

/** 输出尾部：合并 stdout/stderr，压掉 \r，截到最后 n 字符。 */
function tail(stdout, stderr, n = 800) {
  const s = `${stdout ?? ''}\n${stderr ?? ''}`.replace(/\r\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
  if (!s) return '';
  return s.length > n ? `…${s.slice(-n)}` : s;
}

/** 跑一条 acceptance 项。exit 0 = pass（expect 显式给了数字就按数字比）。 */
function runAcceptanceItem(item, ctx, env, opts) {
  if (item.manual) {
    return { id: item.id, pass: null, manual: true, skipped: false, outputTail: null,
      criteria: item.criteria ?? item.expect ?? null };
  }
  if (!requirementMet(item.requires, env)) {
    return { id: item.id, pass: null, manual: false, skipped: true,
      skipReason: `本机缺 ${item.requires}（未安装或不可用），该项不计入 Pass@2`, outputTail: null };
  }
  if (opts.skipAcceptance) {
    return { id: item.id, pass: null, manual: false, skipped: true,
      skipReason: '用户指定 --skip-acceptance', outputTail: null };
  }
  const cmd = substitute(item.cmd, ctx);
  const started = Date.now();
  let res;
  try {
    res = spawnSync(cmd, { shell: true, cwd: REPO_ROOT, encoding: 'utf8',
      timeout: opts.acceptanceTimeout, maxBuffer: 16 * 1024 * 1024 });
  } catch (err) {
    return { id: item.id, pass: false, manual: false, skipped: false, exitCode: null,
      durationMs: Date.now() - started, error: `起不来：${err.message}`, outputTail: null, cmd };
  }
  const expected = Number.isFinite(Number(item.expect)) && typeof item.expect !== 'boolean'
    ? Number(item.expect) : 0;
  const rec = {
    id: item.id, pass: res.status === expected, manual: false, skipped: false,
    exitCode: res.status, expected, durationMs: Date.now() - started,
    outputTail: tail(res.stdout, res.stderr), cmd,
  };
  if (res.error) rec.error = res.error.message;
  return rec;
}

/** 检查期望产物是否齐全且非空。 */
function collectArtifacts(outDir, names) {
  const rows = names.map((name) => {
    const abs = path.join(outDir, name);
    const ok = existsSync(abs) && statSync(abs).isFile() && statSync(abs).size > 0;
    return { name, path: fwd(abs), ok, bytes: ok ? statSync(abs).size : 0 };
  });
  return { rows, ok: rows.every((r) => r.ok) };
}

function main() {
  const args = parseArgs(process.argv);
  if (args.help || args.h) {
    console.log('用法: node bench/run.mjs [--dry-run] [--cmd <模板>] [--tasks a,b] [--conditions none,current] [--runs 2] [--out <路径>] [--work-root <目录>] [--verify-conditions] [--allow-partial] [--skip-acceptance] [--timeout ms] [--acceptance-timeout ms] [--json]');
    process.exit(0);
  }
  const dryRun = Boolean(args['dry-run']);
  const cmdTemplate = typeof args.cmd === 'string' ? args.cmd : null;
  if (!dryRun && !cmdTemplate) {
    die(2, '非 --dry-run 必须给 --cmd <模板>（含 {prompt_file} {out_dir} 占位符）；只想验证 harness 请加 --dry-run');
  }
  const runs = Math.max(1, Math.round(numArg(args.runs, 2, '--runs')));
  const timeout = numArg(args.timeout, 900000, '--timeout');
  const acceptanceTimeout = numArg(args['acceptance-timeout'], 300000, '--acceptance-timeout');
  const allowPartial = Boolean(args['allow-partial']);
  const asJson = Boolean(args.json);
  const workRoot = path.resolve(typeof args['work-root'] === 'string'
    ? args['work-root'] : path.join(os.tmpdir(), 'frontend-fidelity-bench'));

  if (args['verify-conditions']) {
    const tol = typeof args.tol === 'string' ? Number(args.tol) / 100 : 0.1;
    const v = verifyLength({ tolerance: tol, all: true });
    console.log(`等长对照校验：无关技能 ${v.a.estTokens} vs 当前技能 ${v.b.estTokens}，差 ${v.diffTokens}（${v.diffPercent.toFixed(2)}%），容差 ±${v.tolerancePercent}%`);
    for (const row of v.conditions ?? []) {
      console.log(`  · ${row.id ?? row.file}: 声明 ${row.declared} / 实测 ${row.measured}${row.stale ? ' ← 声明过期' : ''}`);
    }
    if (!v.ok) die(2, '等长对照不成立：unrelated 与 SKILL.md 的 est tokens 差超出容差，先修 conditions/unrelated-length-matched.md');
  }

  const taskIds = listArg(args.tasks, null);
  const conditionIds = listArg(args.conditions, DEFAULT_CONDITIONS);
  const allTaskFiles = readdirSync(TASKS_DIR).filter((f) => f.endsWith('.json')).sort();
  const tasks = loadTasks(taskIds ?? allTaskFiles.map((f) => JSON.parse(readFileSync(path.join(TASKS_DIR, f), 'utf8')).id));
  const conditions = loadConditions(conditionIds);
  const env = detectEnvironment();
  if (!env.python) console.warn('WARN 未检测到 python：acceptance 里 requires=python 的项会记为 skipped（不计入 Pass@2）');
  if (!env.playwright) console.warn('WARN 未检测到 playwright：acceptance 里 requires=playwright 的项会记为 skipped（不计入 Pass@2）');

  const outPath = path.resolve(typeof args.out === 'string' ? args.out : path.join(HERE, 'results', `run-${timestamp()}.json`));
  mkdirSync(path.dirname(outPath), { recursive: true });
  mkdirSync(workRoot, { recursive: true });

  const planned = conditions.length * tasks.length * runs;
  const runRecords = [];
  let hardFail = 0;
  let idx = 0;
  for (const condition of conditions) {
    for (const task of tasks) {
      for (let run = 1; run <= runs; run++) {
        idx++;
        const workDir = path.join(workRoot, condition.id, task.id, `run${run}`);
        const outDir = path.join(workDir, 'out');
        rmSync(outDir, { recursive: true, force: true });
        mkdirSync(outDir, { recursive: true });
        const firstArtifact = task.artifacts[0];
        const artifactAbs = path.join(outDir, firstArtifact);
        const ctx = {
          prompt_file: fwd(path.join(workDir, 'prompt.md')),
          out_dir: fwd(outDir),
          work_dir: fwd(workDir),
          artifact: fwd(artifactAbs),
          out_file: fwd(artifactAbs),
          file_url: pathToFileURL(artifactAbs).href,
          task: task.id,
          condition: condition.id,
          run: String(run),
          repo_root: fwd(REPO_ROOT),
          python: PY,
        };
        const promptText = buildPrompt(condition, task.prompt, ctx);
        const promptFile = path.join(workDir, 'prompt.md');
        writeFileSync(promptFile, promptText, 'utf8');
        const promptEstTokens = estimateTokens(promptText);
        const rec = {
          condition: condition.id, task: task.id, run,
          promptFile: fwd(promptFile), outDir: fwd(outDir),
          promptEstTokens, promptChars: [...promptText].length,
          skillEstTokens: condition.estTokens,
          tokenUsage: null, cmdExitCode: null, durationMs: 0, error: null,
        };
        const started = Date.now();
        if (dryRun) {
          for (const name of task.artifacts) {
            writeFileSync(path.join(outDir, name), stubHtml(task.id), 'utf8');
          }
          rec.dryRun = true;
          rec.cmdExitCode = 0;
          rec.modelOutputTail = '（--dry-run：未调用模型，产物为 stub）';
        } else {
          const cmd = substitute(cmdTemplate, ctx);
          let res;
          try {
            res = spawnSync(cmd, {
              shell: true, cwd: REPO_ROOT, encoding: 'utf8', timeout,
              maxBuffer: 32 * 1024 * 1024,
              env: { ...process.env, BENCH_PROMPT_FILE: ctx.prompt_file, BENCH_OUT_DIR: ctx.out_dir,
                BENCH_TASK: task.id, BENCH_CONDITION: condition.id, BENCH_RUN: String(run) },
            });
          } catch (err) {
            res = { status: null, stdout: '', stderr: '', error: { message: `起不来：${err.message}` } };
          }
          rec.cmdExitCode = res.status;
          rec.modelOutputTail = tail(res.stdout, res.stderr, 1200);
          if (res.error) rec.error = res.error.message;
          else if (res.status !== 0) rec.error = `模型命令退出码 ${res.status}`;
          const usage = parseTokenUsage(`${res.stdout ?? ''}\n${res.stderr ?? ''}`);
          rec.tokenUsage = usage;
          if (rec.error) hardFail++;
        }
        rec.durationMs = Date.now() - started;
        const art = collectArtifacts(outDir, task.artifacts);
        rec.artifacts = art.rows;
        rec.artifactsOk = art.ok;
        if (!art.ok && !rec.error) { rec.error = `产物缺失：${art.rows.filter((r) => !r.ok).map((r) => r.name).join(', ')}`; }
        if (!art.ok) hardFail++;
        if (dryRun && !art.ok) { rec.error = rec.error ?? 'stub 产物写入失败'; hardFail++; }
        rec.acceptance = (task.acceptance ?? []).map((item) => runAcceptanceItem(item, ctx, env, {
          skipAcceptance: Boolean(args['skip-acceptance']), acceptanceTimeout,
        }));
        runRecords.push(rec);
        const machine = rec.acceptance.filter((a) => !a.manual && !a.skipped);
        const passed = machine.filter((a) => a.pass).length;
        const flag = rec.error ? 'FAIL' : (machine.length && passed === machine.length ? 'PASS' : 'WARN');
        console.log(`${flag} [${idx}/${planned}] ${condition.id} × ${task.id} run${run} · 产物${art.ok ? '齐' : '缺'} · 机器判项 ${passed}/${machine.length} · est prompt ${promptEstTokens} tok${rec.error ? ` · ${rec.error}` : ''}`);
      }
    }
  }
  return { args, dryRun, cmdTemplate, runs, workRoot, outPath, env, conditions, tasks, runRecords, planned, hardFail, allowPartial, asJson, acceptanceTimeout };
}

// ------------------------------------------------------------------ 汇总与退出
const R = main();

const countItem = (pred) => R.runRecords.reduce((n, r) => n + r.acceptance.filter(pred).length, 0);
const totals = {
  planned: R.planned,
  completed: R.runRecords.length,
  hardFail: R.hardFail,
  artifactsOk: R.runRecords.filter((r) => r.artifactsOk).length,
  acceptancePass: countItem((a) => !a.manual && !a.skipped && a.pass === true),
  acceptanceFail: countItem((a) => !a.manual && !a.skipped && a.pass === false),
  acceptanceSkipped: countItem((a) => a.skipped === true),
  acceptanceManual: countItem((a) => a.manual === true),
  tokenUsageParsed: R.runRecords.filter((r) => r.tokenUsage).length,
  promptEstTokensSum: R.runRecords.reduce((n, r) => n + r.promptEstTokens, 0),
  cmdTokensSum: R.runRecords.reduce((n, r) => n + (r.tokenUsage?.totalTokens ?? 0), 0),
};

const result = {
  meta: {
    schemaVersion: SCHEMA_VERSION,
    createdAt: new Date().toISOString(),
    cmdTemplate: R.dryRun ? null : R.cmdTemplate,
    conditions: R.conditions.map((c) => ({ id: c.id, label: c.label, skillFile: c.skillFile, estTokens: c.estTokens })),
    tasks: R.tasks.map((t) => ({ id: t.id, title: t.title ?? t.id, file: t.file })),
    runs: R.runs,
    dryRun: R.dryRun,
    workRoot: fwd(R.workRoot),
    repoRoot: fwd(REPO_ROOT),
    environment: R.env,
    estTokensByCondition: Object.fromEntries(R.conditions.map((c) => [c.id, c.estTokens])),
    modelNote: R.dryRun
      ? 'DRY-RUN —— 未调用任何模型；产物是 run.mjs 内置的 stub，用来验证 harness 链路与 acceptance 判据的可满足性。不是效果数据，不要拿去写结论。'
      : '真跑：模型访问由 --cmd 提供的命令负责，本 runner 不内置任何模型客户端，也不上传任何数据。',
    acceptanceNote: 'acceptance 的 pass/fail 是测量结果，不影响退出码；退出码只看「有没有格子跑崩或产物缺失」。manual 项与 skipped 项都不计入 Pass@2。',
  },
  totals,
  runs: R.runRecords,
};

try {
  writeFileSync(R.outPath, `${JSON.stringify(result, null, 2)}\n`, 'utf8');
} catch (err) {
  die(2, `结果写不出去 ${fwd(R.outPath)}：${err.message}`);
}

if (R.asJson) {
  console.log(JSON.stringify({ out: fwd(R.outPath), totals, exitCode: R.hardFail === 0 ? 0 : (R.allowPartial ? 3 : 1) }, null, 2));
} else {
  console.log('');
  console.log(`结果文件：${fwd(R.outPath)}`);
  console.log(`格子：${totals.completed}/${totals.planned} 完成，硬失败 ${totals.hardFail}，产物齐 ${totals.artifactsOk}`);
  console.log(`机器判项：通过 ${totals.acceptancePass} / 失败 ${totals.acceptanceFail} / 跳过 ${totals.acceptanceSkipped}；人工项 ${totals.acceptanceManual}`);
  console.log(`token：命令输出解析到 ${totals.tokenUsageParsed}/${totals.completed} 个格子（合计 ${totals.cmdTokensSum}）；prompt 侧 est 合计 ${totals.promptEstTokensSum}`);
  console.log(`工作目录：${fwd(R.workRoot)}（prompt.md 与产物都留在这里，便于复查）`);
  console.log('下一步：node bench/score.mjs ' + fwd(R.outPath));
}

if (R.hardFail > 0) process.exit(R.allowPartial ? 3 : 1);
process.exit(0);
