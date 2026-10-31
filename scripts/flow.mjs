#!/usr/bin/env node
/**
 * flow.mjs — 声明式交互流程验收：把「登录 → 填表 → 提交 → 出现成功提示」跑一遍并留证据。
 *
 * 定位：只回答「这条用户路径能不能走通」，不做测试框架 ——
 * 没有断言库、没有重试策略、没有网络拦截、没有多标签页。要那些请用 Playwright Test。
 * 失败时给三样东西：第几步、哪个选择器、失败现场截图。
 *
 * 用法（在目标项目根目录运行）:
 *   node <skill>/scripts/flow.mjs --flow flow.json --base http://localhost:5173
 *   node <skill>/scripts/flow.mjs --flow flow.json --url http://localhost:5173/login --theme dark
 *   node <skill>/scripts/flow.mjs --flow flow.json --base http://localhost:5173 --headed --slow 300
 *
 * flow.json:
 *   {
 *     "name": "登录并新建工单",
 *     "start": "/login",
 *     "steps": [
 *       { "fill": "#email", "value": "qa@example.com" },
 *       { "fill": "#password", "value": "secret" },
 *       { "click": "button[type=submit]" },
 *       { "expectUrl": "/dashboard" },
 *       { "expectText": "工单列表" },
 *       { "expectCount": ".table tbody tr", "value": 6 },
 *       { "screenshot": "dashboard" }
 *     ]
 *   }
 *
 * 动作（每个步骤只能有一个）：
 *   goto           "url" | { "url": "/orders", "waitUntil": "load" }
 *   click          "selector" | { "selector": "...", "nth": 0 }
 *   fill           { "selector": "#title", "value": "..." }（也接受 "fill": "#title", "value": "..." 的平铺写法）
 *   select         { "selector": "#type", "label": "故障" } 或 { ..., "value": "bug" }
 *   press          "Enter" | { "key": "Escape", "selector": ".modal" }
 *   wait           { "ms": 500 } 或 { "selector": ".spinner", "hidden": true }
 *   expectText     "文案" | { "text": "文案", "selector": ".toast" }
 *   expectVisible  "selector"
 *   expectHidden   "selector"
 *   expectUrl      "包含的片段"
 *   expectCount    { "selector": "tr", "value": 6 } 或 { "selector": "tr", "min": 3, "max": 20 }
 *   expectValue    { "selector": "#email", "value": "qa@example.com" }
 *   expectFocus    { "selector": "#email" }            焦点落在该元素
 *   expectFocusVisible { "selector": "#email" }        焦点可见（:focus-visible）
 *   screenshot     "文件名"
 *
 * 步骤通用字段：timeout（ms，覆盖 --timeout）、desc（失败日志里显示）、optional（失败不拦路）
 *
 * 退出码：0 全部通过 / 1 有步骤失败 / 2 参数或环境错误
 * 依赖: npm i -D playwright && npx playwright install chromium
 */

import { mkdir, readFile } from 'node:fs/promises';
import path from 'node:path';

import {
  MARK,
  contextOptions,
  flag,
  forceDark,
  line,
  loadChromium,
  parseArgs,
  resolveViewport,
  watchPage,
  writeJson,
} from './lib/common.mjs';

/** 步骤里能当动作名的键。顺序不影响判定，但报错信息按这个顺序列。 */
const ACTIONS = [
  'goto',
  'click',
  'fill',
  'select',
  'press',
  'wait',
  'expectText',
  'expectVisible',
  'expectHidden',
  'expectUrl',
  'expectCount',
  'expectValue',
  'expectFocus',
  'expectFocusVisible',
  'screenshot',
];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** Playwright 的错误信息带 ANSI 颜色，落进报告会变成乱码。 */
const stripAnsi = (s) => String(s).replace(/\u001b\[[0-9;]*m/g, '');

/**
 * 开跑前把明显写错的步骤挑出来：跑到一半才崩，前几步的副作用（建了数据、发了消息）不好收拾。
 * 只查必填字段，不模拟执行。
 */
function validateSteps(steps) {
  const problems = [];
  const needSelector = ['click', 'expectVisible', 'expectHidden', 'expectCount', 'expectValue', 'expectFocus', 'expectFocusVisible'];
  steps.forEach((step, i) => {
    const idx = i + 1;
    let action;
    try {
      action = pickAction(step, idx);
    } catch (e) {
      problems.push(e.message);
      return;
    }
    const v = { ...asObj(step[action], STRING_KEY[action] || 'selector'), ...step };
    if (needSelector.includes(action) && !v.selector) {
      problems.push(`第 ${idx} 步 ${action} 缺少 selector`);
    }
    if (action === 'fill' && v.value === undefined) {
      problems.push(`第 ${idx} 步 fill 缺少 value（写成 { "fill": "#id", "value": "..." }）`);
    }
    if (action === 'select' && v.value === undefined && v.label === undefined) {
      problems.push(`第 ${idx} 步 select 缺少 value 或 label`);
    }
    if (action === 'expectText' && !v.text) {
      problems.push(`第 ${idx} 步 expectText 缺少文案`);
    }
    if (action === 'expectCount' && v.value === undefined && v.min === undefined && v.max === undefined) {
      problems.push(`第 ${idx} 步 expectCount 至少给 value / min / max 之一`);
    }
  });
  return problems;
}

function pickAction(step, index) {
  const keys = Object.keys(step).filter((k) => ACTIONS.includes(k));
  if (keys.length === 0) {
    throw new Error(`第 ${index} 步没有可识别的动作（可用：${ACTIONS.join(' / ')}）`);
  }
  if (keys.length > 1) {
    throw new Error(`第 ${index} 步同时写了多个动作：${keys.join(', ')}（一步只做一件事）`);
  }
  return keys[0];
}

/** 字符串简写时这个值代表哪个字段：`{ "click": "#x" }` ≡ `{ "click": { "selector": "#x" } }`。 */
const STRING_KEY = {
  goto: 'url',
  click: 'selector',
  fill: 'selector',
  select: 'selector',
  press: 'key',
  wait: 'ms',
  expectText: 'text',
  expectVisible: 'selector',
  expectHidden: 'selector',
  expectUrl: 'url',
  expectCount: 'selector',
  expectValue: 'selector',
  expectFocus: 'selector',
  expectFocusVisible: 'selector',
  screenshot: 'name',
};

/** 值可能是字符串简写，也可能是对象；统一成对象后再取字段。 */
const asObj = (v, key = 'selector') => {
  if (v === undefined || v === null) return {};
  if (typeof v === 'string' || typeof v === 'number') return { [key]: v };
  return v;
};

function describe(action, value, step) {
  // 平铺写法（`{ "select": "#f-type", "label": "故障" }`）与嵌套写法等价，平铺优先
  const v = { ...asObj(value, STRING_KEY[action] || 'selector'), ...(step || {}) };
  switch (action) {
    case 'goto':
      return String(v.url || v.selector || '');
    case 'fill':
      return `${v.selector} = ${JSON.stringify(step.value ?? v.value ?? '')}`;
    case 'select':
      return `${v.selector} → ${v.label ?? v.value ?? ''}`;
    case 'press':
      return v.selector ? `${v.key} @ ${v.selector}` : String(v.key || v.selector || '');
    case 'wait':
      if (v.selector) return `${v.selector}${v.hidden ? ' 消失' : ' 出现'}`;
      return `${v.ms ?? ''}ms`;
    case 'expectText':
      return `${JSON.stringify(v.text || v.selector || '')}${v.selector ? ` @ ${v.selector}` : ''}`;
    case 'expectCount':
      return `${v.selector} = ${v.value ?? `[${v.min ?? 0}, ${v.max ?? '∞'}]`}`;
    case 'expectValue':
      return `${v.selector} = ${JSON.stringify(step.value ?? v.value ?? '')}`;
    case 'screenshot':
      return String(v.selector || v.name || '');
    default:
      return String(v.selector || v.text || v.url || '');
  }
}

/** 轮询直到 fn 返回真值：Playwright 自带 auto-waiting 只管「元素可操作」，管不了「文案出现」。 */
async function waitFor(fn, timeout, label) {
  const end = Date.now() + timeout;
  let last;
  for (;;) {
    try {
      if (await fn()) return true;
    } catch (e) {
      last = e;
    }
    if (Date.now() >= end) {
      throw new Error(`${label} 在 ${timeout}ms 内未满足${last ? `（${String(last.message || last).slice(0, 120)}）` : ''}`);
    }
    await sleep(80);
  }
}

async function runStep(page, step, index, ctx) {
  const action = pickAction(step, index);
  const raw = step[action];
  // 平铺写法与嵌套写法等价，平铺优先：{ "select": "#f-type", "label": "故障" } ≡ { "select": { "selector": "#f-type", "label": "故障" } }
  const v = { ...asObj(raw, STRING_KEY[action] || 'selector'), ...step };
  const timeout = Number(step.timeout || ctx.timeout);
  const { baseUrl, outDir } = ctx;

  switch (action) {
    case 'goto': {
      const target = String(v.url || v.selector || raw);
      if (!/^https?:\/\//i.test(target) && !baseUrl) {
        throw new Error(`goto 收到相对路径 ${target}，但没给 --base（或写完整 URL）`);
      }
      const url = /^https?:\/\//i.test(target) ? target : new URL(target, baseUrl).toString();
      await page.goto(url, { waitUntil: v.waitUntil || 'load', timeout: timeout * 2 });
      return url;
    }
    case 'click': {
      const loc = page.locator(String(v.selector || raw));
      await (v.nth === undefined ? loc.first() : loc.nth(Number(v.nth))).click({ timeout });
      return v.selector || raw;
    }
    case 'fill': {
      const sel = v.selector;
      const value = String(step.value ?? v.value ?? '');
      if (!sel) throw new Error('fill 需要 selector');
      await page.fill(sel, value, { timeout });
      return `${sel} = ${value}`;
    }
    case 'select': {
      const sel = v.selector;
      if (!sel) throw new Error('select 需要 selector');
      if (v.label !== undefined) await page.selectOption(sel, { label: String(v.label) }, { timeout });
      else await page.selectOption(sel, String(step.value ?? v.value ?? ''), { timeout });
      return `${sel} → ${v.label ?? v.value ?? step.value}`;
    }
    case 'press': {
      const key = String(v.key || raw);
      if (v.selector) await page.locator(String(v.selector)).first().press(key, { timeout });
      else await page.keyboard.press(key);
      return v.selector ? `${key} @ ${v.selector}` : key;
    }
    case 'wait': {
      // 纯数字（含平铺写法 `"wait": 500`）按毫秒处理，别把它当选择器
      const isMs = typeof raw === 'number' || v.ms !== undefined;
      if (isMs) {
        const ms = Number(v.ms ?? raw);
        await sleep(ms);
        return `${ms}ms`;
      }
      if (!v.selector) throw new Error('wait 需要 { "ms": 500 } 或 { "selector": "..." }');
      await waitFor(
        async () => {
          const visible = await page.locator(String(v.selector)).first().isVisible().catch(() => false);
          return v.hidden ? !visible : visible;
        },
        timeout,
        `${v.selector} ${v.hidden ? '消失' : '出现'}`,
      );
      return v.selector;
    }
    case 'expectText': {
      const text = String(v.text || raw);
      const sel = v.selector;
      await waitFor(
        async () => {
          const actual = sel
            ? await page.locator(String(sel)).first().innerText({ timeout: 1000 })
            : await page.evaluate(() => document.body.innerText);
          return String(actual).includes(text);
        },
        timeout,
        `文案「${text}」${sel ? `出现在 ${sel} 内` : '出现在页面'}`,
      );
      return text;
    }
    case 'expectVisible':
    case 'expectHidden': {
      const sel = String(v.selector || raw);
      const want = action === 'expectVisible';
      await waitFor(
        async () => (await page.locator(sel).first().isVisible().catch(() => false)) === want,
        timeout,
        `${sel} ${want ? '可见' : '隐藏'}`,
      );
      return sel;
    }
    case 'expectUrl': {
      const want = String(v.url || raw);
      await waitFor(async () => page.url().includes(want), timeout, `URL 包含 ${want}`);
      return page.url();
    }
    case 'expectCount': {
      const sel = String(v.selector);
      if (!sel) throw new Error('expectCount 需要 selector');
      if (v.value === undefined && v.min === undefined && v.max === undefined) {
        throw new Error('expectCount 至少给 value / min / max 之一，否则无从判定');
      }
      await waitFor(
        async () => {
          const n = await page.locator(sel).count();
          if (v.value !== undefined) return n === Number(v.value);
          if (v.min !== undefined && n < Number(v.min)) return false;
          if (v.max !== undefined && n > Number(v.max)) return false;
          return true;
        },
        timeout,
        `${sel} 数量满足 ${v.value ?? `[${v.min ?? 0}, ${v.max ?? '∞'}]`}`,
      );
      return `${sel} = ${await page.locator(sel).count()}`;
    }
    case 'expectFocus':
    case 'expectFocusVisible': {
      const sel = String(v.selector || raw);
      if (!sel) throw new Error(`${action} 需要 selector`);
      const visibleOnly = action === 'expectFocusVisible';
      await waitFor(
        async () => page.evaluate(({ s, vis }) => {
          const el = document.activeElement;
          if (!el || !el.matches(s)) return false;
          return vis ? el.matches(':focus-visible') : true;
        }, { s: sel, vis: visibleOnly }).catch(() => false),
        timeout,
        `焦点在 ${sel}${visibleOnly ? ' 且 :focus-visible 生效' : ''}`,
      );
      return sel;
    }
    case 'expectValue': {
      const sel = String(v.selector);
      const value = String(step.value ?? v.value ?? '');
      if (!sel) throw new Error('expectValue 需要 selector');
      await waitFor(
        async () => (await page.inputValue(sel, { timeout: 1000 })) === value,
        timeout,
        `${sel} 的值等于 ${JSON.stringify(value)}`,
      );
      return `${sel} = ${value}`;
    }
    case 'screenshot': {
      const name = String(v.selector || v.name || raw || `shot-${index}`);
      const file = path.join(outDir, `${name.replace(/[^\w\u4e00-\u9fa5-]+/g, '-')}.png`);
      await page.screenshot({ path: file, fullPage: true });
      return path.basename(file);
    }
    default:
      throw new Error(`未实现的动作 ${action}`);
  }
}

async function main() {
  const args = parseArgs(process.argv, {
    viewport: 'desktop',
    theme: 'light',
    timeout: '5000',
    out: '.design/flow',
  });

  const flowPath = args.flow && args.flow !== true ? String(args.flow) : '';
  if (!flowPath) {
    console.error('必须提供 --flow <flow.json>（示例见 scripts/flow.example.json）');
    process.exit(2);
  }

  let flow;
  try {
    flow = JSON.parse(await readFile(flowPath, 'utf8'));
  } catch (e) {
    console.error(`读不懂流程文件 ${flowPath}：${e.message}`);
    process.exit(2);
  }
  const steps = Array.isArray(flow) ? flow : flow.steps;
  if (!Array.isArray(steps) || steps.length === 0) {
    console.error('流程文件里没有 steps 数组（或为空）');
    process.exit(2);
  }
  const problems = validateSteps(steps);
  if (problems.length) {
    console.error(`流程文件有 ${problems.length} 处问题，先改完再跑：`);
    for (const p of problems) console.error(`  - ${p}`);
    process.exit(2);
  }

  const baseUrl =
    args.base && args.base !== true ? String(args.base).replace(/\/+$/, '') + '/' : '';
  const explicitUrl = args.url && args.url !== true ? String(args.url) : '';
  const start = explicitUrl || (flow.start ? String(flow.start) : '');
  if (!baseUrl && !start && !/^https?:\/\//i.test(String(asObj(steps[0].goto, 'url').url || ''))) {
    console.error('没有 --base：goto 的相对路径无法解析，也没有 --url / start 指定起点');
    process.exit(2);
  }
  if (!resolveViewport(String(args.viewport))) {
    console.error(`未知视口 ${args.viewport}`);
    process.exit(2);
  }

  const theme = String(args.theme);
  if (theme !== 'light' && theme !== 'dark') {
    console.error('--theme 只能是 light / dark');
    process.exit(2);
  }

  const timeout = Number(args.timeout) || 5000;
  const continueOnFail = flag(args, 'continue');
  const shotAll = flag(args, 'screenshot');
  const slow = Number(args.slow) || 0;
  const storageState =
    args['storage-state'] && args['storage-state'] !== true
      ? path.resolve(String(args['storage-state']))
      : undefined;
  const outDir = path.resolve(String(args.out));
  await mkdir(outDir, { recursive: true });

  let chromium;
  try {
    chromium = await loadChromium();
  } catch (e) {
    console.error(e.message);
    process.exit(2);
  }

  const browser = await chromium.launch({ headless: !flag(args, 'headed') });
  const context = await browser.newContext(
    contextOptions({ viewport: String(args.viewport), theme, storageState }),
  );
  const page = await context.newPage();
  if (theme === 'dark') await context.addInitScript(forceDark);
  page.setDefaultTimeout(timeout);
  const watcher = watchPage(page);

  const report = {
    when: new Date().toISOString(),
    flow: path.resolve(flowPath),
    name: flow.name || path.basename(flowPath),
    base: baseUrl || explicitUrl || null,
    viewport: String(args.viewport),
    theme,
    ok: true,
    steps: [],
    consoleErrors: [],
    httpErrors: [],
  };

  console.log(`${MARK.run} ${report.name}（${steps.length} 步，${report.viewport}/${theme}）`);

  try {
    if (start) {
      const first = /^https?:\/\//i.test(start) ? start : new URL(start, baseUrl).toString();
      await page.goto(first, { waitUntil: 'load', timeout: timeout * 2 });
      console.log(`     start ${first}`);
    }

    for (let i = 0; i < steps.length; i++) {
      const step = steps[i];
      const index = i + 1;
      const action = pickAction(step, index);
      const label = describe(action, step[action], step);
      const t0 = Date.now();
      try {
        const detail = await runStep(page, step, index, { baseUrl, outDir, timeout });
        const ms = Date.now() - t0;
        report.steps.push({
          index,
          action,
          target: label,
          ok: true,
          ms,
          ...(detail !== undefined && String(detail) !== label ? { resolved: String(detail) } : {}),
        });
        line(MARK.pass, `  ${String(index).padStart(2, '0')} ${String(action).padEnd(13)} ${label}  ${ms}ms`);
        if (shotAll) {
          const f = path.join(outDir, `step-${String(index).padStart(2, '0')}.png`);
          await page.screenshot({ path: f, fullPage: true }).catch(() => {});
        }
      } catch (e) {
        const ms = Date.now() - t0;
        const msg = stripAnsi(String(e && e.message ? e.message : e))
          .replace(/\s+/g, ' ')
          .slice(0, 300);
        const optional = step.optional === true;
        const shot = path.join(outDir, `fail-${String(index).padStart(2, '0')}.png`);
        await page.screenshot({ path: shot, fullPage: true }).catch(() => {});
        report.steps.push({
          index,
          action,
          target: label,
          ok: false,
          optional,
          ms,
          error: msg,
          screenshot: path.basename(shot),
        });
        line(MARK.fail, `  ${String(index).padStart(2, '0')} ${action.padEnd(13)} ${label}  ${ms}ms`);
        console.log(`     ${step.desc ? step.desc + '：' : ''}${msg}`);
        console.log(`     现场：${shot}`);
        if (!optional) {
          report.ok = false;
          if (!continueOnFail) {
            const rest = steps.length - index;
            if (rest > 0) console.log(`     余下 ${rest} 步未执行（加 --continue 可继续）`);
            break;
          }
        }
      }
      if (slow) await sleep(slow);
    }
  } finally {
    const noise = watcher.take();
    report.consoleErrors = noise.consoleErrors;
    report.httpErrors = noise.httpErrors;
    await context.close();
    await browser.close();
  }

  report.failed = report.steps.filter((s) => !s.ok && !s.optional).length;
  if (report.failed > 0) report.ok = false;

  const reportPath = await writeJson(path.join(outDir, 'flow-report.json'), report);
  const passed = report.steps.filter((s) => s.ok).length;
  const failed = report.steps.filter((s) => !s.ok && !s.optional).length;
  const skipped = report.steps.filter((s) => !s.ok && s.optional).length;

  console.log('');
  console.log(
    `${report.ok ? MARK.pass : MARK.fail} 合计：${passed} 通过 / ${failed} 失败` +
      (skipped ? ` / ${skipped} 可选未满足` : '') +
      `（共 ${steps.length} 步）`,
  );
  if (report.consoleErrors.length) console.log(`  console 错误 ${report.consoleErrors.length} 条（流程已跑通，但这些通常会伤用户）`);
  if (report.httpErrors.length) console.log(`  HTTP 失败 ${report.httpErrors.length} 条`);
  console.log(`报告：${reportPath}`);

  process.exit(report.ok ? 0 : 1);
}

main().catch((e) => {
  console.error(stripAnsi(String(e && e.stack ? e.stack : e)).slice(0, 800));
  process.exit(2);
});
