#!/usr/bin/env node
/**
 * 跑项目自己的质量门：lint → typecheck → test → build，只跑 package.json 里真实存在的脚本。
 *
 * 对应 Skill 条款：验证（改完必须自证没坏）。
 *
 * 用法（在目标项目根目录运行）:
 *   node <skill>/scripts/run_checks.mjs
 *   node <skill>/scripts/run_checks.mjs --only lint,build
 *   node <skill>/scripts/run_checks.mjs --bail      # 第一个失败就停（默认就是停）
 *   node <skill>/scripts/run_checks.mjs --continue  # 失败也继续跑后面的
 *
 * 自动识别包管理器（pnpm-lock.yaml / yarn.lock / bun.lockb / package-lock.json）。
 * 不做任何修复，只如实汇报；退出码 = 第一个失败步骤的退出码。
 *
 * 零依赖。
 */

import { spawn } from 'node:child_process';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';

import { MARK, parseArgs } from './lib/common.mjs';

/** 步骤顺序与候选脚本名（同一语义不同项目叫法不同）。 */
const STEPS = [
  { id: 'lint', label: 'Lint', candidates: ['lint', 'lint:check', 'eslint'] },
  { id: 'typecheck', label: '类型检查', candidates: ['typecheck', 'type-check', 'tsc', 'types'] },
  { id: 'test', label: '测试', candidates: ['test', 'test:unit', 'vitest', 'jest'] },
  { id: 'build', label: '构建', candidates: ['build', 'build:prod', 'compile'] },
];

/** 单步超时：构建偶尔很慢，给足 10 分钟。 */
const STEP_TIMEOUT_MS = 10 * 60 * 1000;

async function detectManager(root) {
  const has = async (f) => {
    try {
      await stat(path.join(root, f));
      return true;
    } catch {
      return false;
    }
  };
  if (await has('pnpm-lock.yaml')) return { name: 'pnpm', cmd: 'pnpm', run: ['run'] };
  if (await has('yarn.lock')) return { name: 'yarn', cmd: 'yarn', run: [] };
  if ((await has('bun.lockb')) || (await has('bun.lock'))) return { name: 'bun', cmd: 'bun', run: ['run'] };
  if (await has('package-lock.json')) return { name: 'npm', cmd: 'npm', run: ['run'] };
  return { name: 'npm', cmd: 'npm', run: ['run'] };
}

function run(cmd, cmdArgs, cwd) {
  return new Promise((resolve) => {
    const started = Date.now();
    const child = spawn(cmd, cmdArgs, {
      cwd,
      stdio: 'inherit',
      shell: process.platform === 'win32',
      env: { ...process.env, CI: '1', FORCE_COLOR: '1' },
    });
    const timer = setTimeout(() => {
      child.kill('SIGKILL');
      resolve({ code: 124, ms: Date.now() - started, timedOut: true });
    }, STEP_TIMEOUT_MS);
    child.on('error', (e) => {
      clearTimeout(timer);
      resolve({ code: 127, ms: Date.now() - started, error: e.message });
    });
    child.on('close', (code) => {
      clearTimeout(timer);
      resolve({ code: code ?? 1, ms: Date.now() - started });
    });
  });
}

async function main() {
  const args = parseArgs(process.argv, {});
  // --cwd / --dir 指定项目目录，省得在 skill 目录里 cd 来回切
  const root = args.cwd && args.cwd !== true
    ? path.resolve(String(args.cwd))
    : args.dir && args.dir !== true
      ? path.resolve(String(args.dir))
      : process.cwd();

  let pkg;
  try {
    pkg = JSON.parse(await readFile(path.join(root, 'package.json'), 'utf8'));
  } catch (e) {
    if (e.code === 'ENOENT') {
      // 静态站（例如 scaffold.mjs 的生成物）本来就没有 package.json：
      // 这不是失败，但也不算跑过质量门——说清跳过原因，改用 audit.mjs + contrast_check.py 验收。
      console.log('\u00b7 没有 package.json：跳过项目自带质量门（静态站请用 audit.mjs + contrast_check.py 验收）。');
      process.exit(0);
    }
    console.error(`读不到 package.json：${e.message}`);
    process.exit(2);
  }

  const scripts = pkg.scripts || {};
  const only = args.only && args.only !== true
    ? new Set(String(args.only).split(',').map((s) => s.trim()))
    : null;
  const shouldContinue = Boolean(args.continue);

  const mgr = await detectManager(root);
  console.log(`包管理器：${mgr.name} · 目录：${root}`);

  const plan = [];
  for (const step of STEPS) {
    if (only && !only.has(step.id)) continue;
    const found = step.candidates.find((c) => scripts[c]);
    if (found) plan.push({ ...step, script: found });
  }

  if (plan.length === 0) {
    console.log(`${MARK.warn} package.json 里没有 lint / typecheck / test / build 脚本，无可执行的质量门。`);
    console.log('  建议至少补一个 build 和一个 lint，否则改版无从自证。');
    process.exit(0);
  }

  console.log(`计划执行：${plan.map((p) => `${p.label}(${p.script})`).join(' → ')}\n`);

  const results = [];
  for (const step of plan) {
    console.log(`${MARK.run} ${step.label}：${mgr.cmd} ${[...mgr.run, step.script].join(' ')}`);
    const r = await run(mgr.cmd, [...mgr.run, step.script], root);
    results.push({ ...step, ...r });
    if (r.code !== 0) {
      console.log(`\n${MARK.fail} ${step.label} 失败${r.timedOut ? '（超时）' : `（退出码 ${r.code}）`}\n`);
      if (!shouldContinue) break;
    } else {
      console.log(`${MARK.pass} ${step.label} 通过（${(r.ms / 1000).toFixed(1)}s）\n`);
    }
  }

  // ---- 汇总 ----
  const failed = results.filter((r) => r.code !== 0);
  console.log('──── 结果 ────');
  for (const r of results) {
    const status = r.code === 0 ? 'PASS' : r.timedOut ? 'TIMEOUT' : `FAIL(${r.code})`;
    console.log(`${status.padEnd(10)} ${r.label.padEnd(6)} ${(r.ms / 1000).toFixed(1)}s  ${r.script}`);
  }
  if (failed.length > 0) {
    console.log(`\n${MARK.fail} ${failed.length} 个步骤失败：${failed.map((r) => r.label).join(', ')}`);
    console.log('先修失败项，再谈视觉改动——把失败当既存问题的前提是它能通过。');
    process.exit(failed[0].code || 1);
  }
  console.log(`\n${MARK.pass} 全部 ${results.length} 个步骤通过`);
  process.exit(0);
}

main();
