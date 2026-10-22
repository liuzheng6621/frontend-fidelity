#!/usr/bin/env node
/**
 * 登录态导出：管理端/小程序 H5 大多有登录墙，截图和审计必须带登录态跑。
 *
 * 用法（在目标项目根目录运行）:
 *   node <skill>/scripts/auth.mjs --url http://localhost:5173/login --out auth.json
 *
 * 会打开一个有头浏览器：在里面手动完成登录，回到终端按 Enter，登录态写入 auth.json。
 * 之后的 screenshot.mjs / audit.mjs 加 --storage-state auth.json 即可复用。
 *
 * auth.json 是明文 cookie/localStorage —— 不要提交到仓库，用完删掉。
 *
 * 依赖: npm i -D playwright && npx playwright install chromium
 */

import { existsSync } from 'node:fs';
import path from 'node:path';

import { loadChromium, parseArgs } from './lib/common.mjs';

function waitForEnter(prompt) {
  return new Promise((resolve) => {
    process.stdout.write(prompt);
    process.stdin.resume();
    process.stdin.once('data', () => {
      process.stdin.pause();
      resolve();
    });
  });
}

async function main() {
  const args = parseArgs(process.argv, {});
  if (!args.url || args.url === true) {
    console.error('用法: node scripts/auth.mjs --url <登录页地址> [--out auth.json]');
    process.exit(2);
  }

  const out = path.resolve(String(args.out || 'auth.json'));
  if (existsSync(out) && !args.force) {
    console.error(`${out} 已存在；确认要覆盖请加 --force`);
    process.exit(2);
  }

  let chromium;
  try {
    chromium = await loadChromium();
  } catch (e) {
    console.error(e.message);
    process.exit(2);
  }

  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: 'zh-CN' });
  const page = await context.newPage();
  await page.goto(String(args.url), { waitUntil: 'domcontentloaded', timeout: 30000 }).catch((e) => {
    console.error(`打开页面失败：${e.message}`);
  });

  console.log('浏览器已打开。请在里面完成登录（含验证码/二次验证），看到登录后的页面再回来。');
  await waitForEnter('完成后按 Enter 保存登录态… ');

  await context.storageState({ path: out });
  const state = JSON.parse(await (await import('node:fs/promises')).readFile(out, 'utf8'));
  console.log(`\n已保存 ${out}（cookies ${state.cookies.length} 条，localStorage 来源 ${state.origins.length} 个）`);
  console.log(`注意：这是明文凭据，用完请删除，不要提交到仓库。`);

  await browser.close();
  process.exit(0);
}

main();
