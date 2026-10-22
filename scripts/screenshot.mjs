#!/usr/bin/env node
/**
 * 多视口 × 明暗主题全页截图。
 *
 * 输出 shots/<name>-<viewport>[-<theme>].png + manifest.json（含 console 错误、CLS）。
 *
 * 用法（在目标项目根目录运行）:
 *   node <skill>/scripts/screenshot.mjs --url http://localhost:5173/ --out shots
 *   node <skill>/scripts/screenshot.mjs --pages pages.txt --themes light,dark
 *   node <skill>/scripts/screenshot.mjs --url http://localhost:5173/admin \
 *        --storage-state auth.json --viewports desktop,mobile
 *
 * 关键选项:
 *   --url / --pages      单个 URL，或「每行一个 URL」的清单（# 开头为注释）；
 *                        配合 --base http://host 时 --pages 里写相对路径即可
 *   --base               站点根地址，把 --pages 的相对路径拼成绝对 URL
 *   --out                输出目录，默认 shots
 *   --name               文件名前缀（默认由 URL 推导）；多页时自动加页面名后缀防覆盖
 *   --name               文件名前缀（默认由 URL 推导）
 *   --viewports          desktop,tablet,mobile（默认三档全跑）
 *   --themes             light,dark（默认 light）
 *   --storage-state      登录态文件，用 scripts/auth.mjs 生成
 *   --wait               导航后额外等待毫秒数，默认 1200
 *   --reduced-motion     以「减少动效」系统偏好渲染
 *   --full-page false    只截首屏
 *
 * 依赖: npm i -D playwright && npx playwright install chromium
 */

import { mkdir } from 'node:fs/promises';
import path from 'node:path';

import {
  MARK,
  resolveViewport,
  autoScroll,
  contextOptions,
  flag,
  goto,
  installClsObserver,
  forceDark,
  line,
  listArg,
  loadChromium,
  parseArgs,
  readPages,
  slugify,
  watchPage,
  writeJson,
} from './lib/common.mjs';

async function main() {
  const args = parseArgs(process.argv, {
    viewports: 'desktop,tablet,mobile',
    themes: 'light',
    wait: '1200',
  });

  const urls = [];
  if (args.url && args.url !== true) urls.push(String(args.url));
  if (args.pages && args.pages !== true) {
    // --pages 既可以是 .txt 清单文件，也可以是逗号分隔的路径/URL：--pages /,/about,/pricing
    const raw = String(args.pages);
    const isFile = /\.(txt|list|paths)$/i.test(raw) && !raw.includes(',');
    if (isFile) {
      urls.push(...(await readPages(raw)));
    } else {
      urls.push(
        ...raw
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean),
      );
    }
  }
  if (urls.length === 0) {
    console.error('必须提供 --url <url>，或 --pages <逗号分隔路径|page-list.txt>');
    process.exit(2);
  }

  const viewports = listArg(args.viewports, 'desktop,tablet,mobile');
  const themes = listArg(args.themes, 'light');
  for (const v of viewports) {
    if (!resolveViewport(v)) {
      console.error(`未知视口 ${v}，可选：${Object.keys(VIEWPORTS).join(', ')} 或 1440x900`);
      process.exit(2);
    }
  }
  if (themes.some((t) => t !== 'light' && t !== 'dark')) {
    console.error('--themes 只能是 light / dark');
    process.exit(2);
  }

  const outDir = path.resolve(String(args.out || 'shots'));
  await mkdir(outDir, { recursive: true });

  // --base http://127.0.0.1:5173 + --pages /,/about  → 绝对 URL
  const baseUrl = args.base && args.base !== true ? String(args.base).replace(/\/+$/, '') + '/' : '';

  let chromium;
  try {
    chromium = await loadChromium();
  } catch (e) {
    console.error(e.message);
    process.exit(2);
  }

  const waitMs = Number(args.wait) || 0;
  // --full-page false 和 --no-full-page 两种写法都接受（见 common.mjs 的 flag）
  const fullPage = flag(args, 'full-page', true);
  const storageState =
    args['storage-state'] && args['storage-state'] !== true
      ? path.resolve(String(args['storage-state']))
      : undefined;
  const reducedMotion = flag(args, 'reduced-motion') ? 'reduce' : 'no-preference';
  const manifest = {
    generatedAt: new Date().toISOString(),
    options: { viewports, themes, fullPage, reducedMotion },
    shots: [],
    failed: [],
  };

  const browser = await chromium.launch();
  // 主题在外层、视口在内层：同一次运行里两个维度的组合都覆盖到
  for (const theme of themes) {
    for (const v of viewports) {
      const context = await browser.newContext(
        contextOptions({ viewport: v, theme, reducedMotion, deviceScaleFactor: 2, storageState }),
      );
      const page = await context.newPage();
      await page.addInitScript(installClsObserver);
      // 深色主题：class / data-theme / prefers-color-scheme 三种约定一起覆盖
      if (theme === 'dark') await context.addInitScript(forceDark);
      const watcher = watchPage(page);

      for (const url of urls) {
        // --base 负责把 /pricing 这类相对路径拼成绝对 URL
        const target = baseUrl ? new URL(url, baseUrl).toString() : url;
        // 多页 + --name 时必须带页面名，否则后一页会把前一页的截图覆盖掉
        const baseName = args.name && args.name !== true ? String(args.name) : null;
        const stem = baseName
          ? urls.length > 1
            ? `${baseName}-${slugify(url)}`
            : baseName
          : slugify(url);
        const suffix = themes.length > 1 ? `-${theme}` : '';
        const file = `${stem}-${v}${suffix}.png`;
        const record = { url: target, viewport: v, theme, file };
        try {
          await goto(page, target);
          if (waitMs) await page.waitForTimeout(waitMs);
          // 全页截图前逐屏滚动：否则 loading="lazy" 的图片会是空白
          if (fullPage) await autoScroll(page);
          await page.screenshot({ path: path.join(outDir, file), fullPage });
          const { consoleErrors, httpErrors } = watcher.take();
          record.consoleErrors = consoleErrors;
          record.httpErrors = httpErrors;
          record.cls = Number(await page.evaluate(() => window.__cls__ ?? 0).catch(() => 0));
          manifest.shots.push(record);
          const notes = [];
          if (consoleErrors.length) notes.push(`console ${consoleErrors.length}`);
          if (httpErrors.length) notes.push(`HTTP ${httpErrors.length}`);
          line(
            MARK.pass,
            `[${v}/${theme}] ${target} -> ${file}${notes.length ? `  (${notes.join(', ')})` : ''}`,
          );
        } catch (e) {
          manifest.failed.push({ ...record, error: e.message.slice(0, 300) });
          line(MARK.fail, `[${v}/${theme}] ${target} ${e.message.split('\n')[0]}`);
        }
      }
      await context.close();
    }
  }
  await browser.close();

  const manifestPath = await writeJson(path.join(outDir, 'manifest.json'), manifest);
  console.log(`\n完成：${manifest.shots.length} 张截图，${manifest.failed.length} 页失败`);
  console.log(`清单：${manifestPath}`);
  if (manifest.failed.length) process.exit(1);
}

main();
