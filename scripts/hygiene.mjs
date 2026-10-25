#!/usr/bin/env node
/**
 * 仓库卫生检查：找出「改版后留下的壳」——重复路由、无引用组件、无引用资源与样式、
 * 体积过大的静态资源。
 *
 * 对应 Skill 条款：开始前勘察 / 收尾清理。
 *
 * 用法（在目标项目根目录运行）:
 *   node <skill>/scripts/hygiene.mjs
 *   node <skill>/scripts/hygiene.mjs --src src --out hygiene.json
 *
 * 输出：控制台清单 + hygiene-summary.txt（人读）+ hygiene.json（机读）。
 *
 * 重要：全部结果是**待确认项**，不是结论。组件可能被动态 import、全局注册、
 * 路由懒加载或模板字符串引用，正则看不到。删除任何文件前必须人工核实，
 * 并跑一次构建 + 冒烟测试。
 *
 * 零依赖（只用 node 内置模块）。
 */

import { mkdir, readFile, readdir, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';

import { MARK, parseArgs, writeJson } from './lib/common.mjs';

const SKIP_DIRS = new Set([
  'node_modules', '.git', 'dist', 'build', 'out', 'coverage', '.next', '.nuxt',
  '.output', '.cache', '.turbo', '.vite', 'vendor', '__pycache__',
]);
const CODE_EXT = new Set(['.vue', '.js', '.jsx', '.ts', '.tsx', '.mjs', '.cjs', '.html', '.svelte', '.astro']);
const STYLE_EXT = new Set(['.css', '.scss', '.sass', '.less', '.styl']);
const ASSET_EXT = new Set(['.png', '.jpg', '.jpeg', '.webp', '.avif', '.gif', '.svg', '.ico', '.mp4', '.webm']);
/** 单文件超过这个体积就值得压缩或换格式（Logo/插画通常能做到 <100KB）。 */
const HEAVY_ASSET_BYTES = 300 * 1024;

async function walk(dir, acc = []) {
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return acc;
  }
  for (const e of entries) {
    if (e.name.startsWith('.') && e.name !== '.env') continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (SKIP_DIRS.has(e.name)) continue;
      await walk(p, acc);
    } else {
      acc.push(p);
    }
  }
  return acc;
}

/** 文件名 → 多种可能的符号名（PascalCase / camelCase / kebab / snake）。 */
function nameVariants(rel) {
  const base = path.basename(rel).replace(/\.[^.]+$/, '');
  if (!base || base === 'index') return [];
  const words = base.split(/[^A-Za-z0-9]+/).filter(Boolean);
  // foo-bar → FooBar；已经 PascalCase 的保持原样
  const pascal = base.includes('-') || base.includes('_')
    ? words.map((w) => w[0].toUpperCase() + w.slice(1)).join('')
    : base[0].toUpperCase() + base.slice(1);
  const camel = pascal[0].toLowerCase() + pascal.slice(1);
  return [...new Set([base, pascal, camel])].filter((s) => s.length >= 3);
}

const USAGE = `用法（在目标项目根目录运行）:
  node <skill>/scripts/hygiene.mjs                     # 默认扫 ./src
  node <skill>/scripts/hygiene.mjs --src app --root .  # 指定源码目录与项目根
  node <skill>/scripts/hygiene.mjs --src src --out hygiene.json

选项:
  --src <dir>      源码目录（默认 src，必填其存在）
  --root <dir>     项目根（默认 src 的上一级；用来找 public/assets 与写报告）
  --out <path>     机读报告，目录或 .json 路径（默认 hygiene.json）
  --out-txt <path> 人读报告，目录或 .txt/.md 路径（默认 hygiene-summary.txt）
  -h, --help       打印这段说明

输出：控制台清单 + hygiene-summary.txt（人读）+ hygiene.json（机读）。
注意：结果是**待确认项**，不是结论——删除任何文件前必须人工核实。`;

async function main() {
  const args = parseArgs(process.argv, { src: 'src' });
  if (args.help || args.h) {
    console.log(USAGE);
    return;
  }
  const srcDir = path.resolve(String(args.src || 'src'));
  // 项目根：默认取 src 的上一级（src/ 与 public/、package.json 通常并列），--root 可覆盖
  const root = args.root && args.root !== true ? path.resolve(String(args.root)) : path.resolve(srcDir, '..');
  const outJsonRaw = args.out && args.out !== true ? String(args.out) : 'hygiene.json';
  const outTxtRaw = args['out-txt'] && args['out-txt'] !== true ? String(args['out-txt']) : 'hygiene-summary.txt';
  // --out 既可以是目录（写 hygiene.json），也可以是具体 .json 路径
  const outJson = path.resolve(root, /\.json$/i.test(outJsonRaw) ? outJsonRaw : path.join(outJsonRaw, 'hygiene.json'));
  const outTxt = path.resolve(
    root,
    /\.(txt|md)$/i.test(outTxtRaw) ? outTxtRaw : path.join(outTxtRaw, 'hygiene-summary.txt'),
  );
  await mkdir(path.dirname(outJson), { recursive: true });
  await mkdir(path.dirname(outTxt), { recursive: true });
  let files;
  try {
    files = await walk(srcDir);
  } catch (e) {
    console.error(`无法读取源码目录 ${srcDir}：${e.message}`);
    process.exit(2);
  }
  if (files.length === 0) {
    console.error(`源码目录 ${srcDir} 为空或不存在，检查 --src 参数；node scripts/hygiene.mjs --help 看用法`);
    process.exit(2);
  }

  // 额外的静态资源目录（public / assets 常与 src 并列）
  for (const extra of ['public', 'static', 'assets']) {
    const p = path.resolve(root, extra);
    try {
      if ((await stat(p)).isDirectory()) files.push(...(await walk(p)));
    } catch { /* 不存在就跳过 */ }
  }

  const codeFiles = files.filter((f) => CODE_EXT.has(path.extname(f).toLowerCase()));
  const styleFiles = files.filter((f) => STYLE_EXT.has(path.extname(f).toLowerCase()));
  const assetFiles = files.filter((f) => ASSET_EXT.has(path.extname(f).toLowerCase()));

  // 全部代码拼成一个大字符串做「是否被提到」的判定；同时保留逐文件文本，用于排除"自己引用自己"
  const codeMap = new Map();
  for (const f of codeFiles) {
    codeMap.set(f, await readFile(f, 'utf8').catch(() => ''));
  }
  const codeText = [...codeMap.values()].join('\n');

  const findings = [];
  const rel = (f) => path.relative(root, f).split(path.sep).join('/');

  // 1. 无引用组件（只在 components 之类目录里查，避免把入口文件也算进去）
  const componentDirs = new Set(['components', 'views', 'pages', 'layouts', 'widgets', 'blocks']);
  for (const f of codeFiles) {
    const parts = rel(f).split('/');
    if (!parts.some((p) => componentDirs.has(p))) continue;
    if (/\.(d\.ts|test|spec|stories)\./.test(rel(f))) continue;
    const variants = nameVariants(rel(f));
    if (variants.length === 0) continue;
    // 关键：不能把组件自己的源码算成「被引用」，否则每个组件都能自证存在
    const others = [...codeMap.entries()].filter(([f2]) => f2 !== f).map(([, t]) => t).join('\n');
    const mentioned = variants.some((v) => {
      const re = new RegExp(`(^|[^A-Za-z0-9_$])${v}([^A-Za-z0-9_$]|$)`);
      return re.test(others);
    });
    if (!mentioned) {
      findings.push({
        kind: 'orphan-component',
        level: 'warn',
        file: rel(f),
        message: `组件疑似没有任何引用（查过 ${variants.join(' / ')}）—— 可能是全局注册或动态导入`,
      });
    }
  }

  // 2. 无引用资源
  for (const f of assetFiles) {
    const r = rel(f);
    const base = path.basename(r);
    if (codeText.includes(base) || codeText.includes(r)) continue;
    findings.push({
      kind: 'unused-asset',
      level: 'warn',
      file: r,
      message: '静态资源未被代码按文件名引用 —— 可能只在 CSS 里或由后端拼接路径',
    });
  }

  // 3. 资源体积
  for (const f of assetFiles) {
    const s = await stat(f).catch(() => null);
    if (s && s.size > HEAVY_ASSET_BYTES) {
      findings.push({
        kind: 'heavy-asset',
        level: 'warn',
        file: rel(f),
        message: `静态资源 ${(s.size / 1024).toFixed(0)}KB，建议压到 300KB 以内或改 WebP/AVIF`,
      });
    }
  }

  // 4. 无引用样式文件（入口样式常在 main.ts / index.html 之外引入，故降级为提示）
  for (const f of styleFiles) {
    const r = rel(f);
    const base = path.basename(r);
    const importedByCode = codeText.includes(base) || codeText.includes(r);
    const importedByStyle = (await Promise.all(styleFiles.map(async (sf) => {
      if (sf === f) return false;
      const t = await readFile(sf, 'utf8').catch(() => '');
      return t.includes(base) || t.includes(r);
    }))).some(Boolean);
    if (!importedByCode && !importedByStyle) {
      findings.push({
        kind: 'unused-style',
        level: 'warn',
        file: r,
        message: '样式文件没有被 @import / 入口引用 —— 可能是历史遗留，也可能由构建配置注入',
      });
    }
  }

  // 5. 重复路由：path 或 name 重复都会让 vue-router 报 warn / 覆盖旧记录
  const routerFiles = codeFiles.filter((f) => /router|routes/i.test(rel(f)));
  const routeKeys = new Map(); // `${kind}:${key}` → [files:line]
  for (const f of routerFiles) {
    const text = await readFile(f, 'utf8').catch(() => '');
    for (const kind of ['path', 'name']) {
      const re = new RegExp(`${kind}\\s*:\\s*['"\`]([^'"\`]+)['"\`]`, 'g');
      let m;
      while ((m = re.exec(text))) {
        const lineNo = text.slice(0, m.index).split('\n').length;
        const id = `${kind}:${m[1]}`;
        if (!routeKeys.has(id)) routeKeys.set(id, []);
        routeKeys.get(id).push(`${rel(f)}:${lineNo}`);
      }
    }
  }
  for (const [id, where] of routeKeys) {
    if (where.length > 1) {
      const [kind, key] = id.split(':');
      findings.push({
        kind: 'duplicate-route',
        level: 'error',
        file: where[0].split(':')[0],
        message: `路由 ${kind} "${key}" 定义了 ${where.length} 次：${where.join(', ')}`,
      });
    }
  }

  // ---- 输出 ----
  const counts = findings.reduce((acc, f) => {
    acc[f.kind] = (acc[f.kind] || 0) + 1;
    return acc;
  }, {});

  const lines = [];
  lines.push(`# 仓库卫生检查 · ${new Date().toISOString()}`);
  lines.push(`扫描源码目录：${rel(srcDir)} · 文件 ${files.length} 个（代码 ${codeFiles.length} / 样式 ${styleFiles.length} / 资源 ${assetFiles.length}）`);
  lines.push('');
  if (findings.length === 0) {
    lines.push('没有发现待清理项。');
  } else {
    lines.push(`待确认项合计 ${findings.length} 个：`);
    for (const [kind, n] of Object.entries(counts)) lines.push(`  - ${kind}: ${n}`);
    lines.push('');
    for (const f of findings) {
      lines.push(`[${f.level === 'error' ? 'x' : '!'}] ${f.kind.padEnd(18)} ${f.file}`);
      lines.push(`    ${f.message}`);
    }
  }
  lines.push('');
  lines.push('提醒：以上都是启发式结果。删除前请人工核实（组件可能被动态导入/全局注册），');
  lines.push('并至少跑一次构建 + 关键页面冒烟。');

  await writeFile(outTxt, lines.join('\n') + '\n', 'utf8');
  const jsonPath = await writeJson(outJson, {
    generatedAt: new Date().toISOString(),
    scanned: { root: rel(srcDir), files: files.length, code: codeFiles.length, style: styleFiles.length, assets: assetFiles.length },
    counts,
    findings,
  });

  for (const f of findings) {
    console.log(`${f.level === 'error' ? MARK.fail : MARK.warn} [${f.kind}] ${f.file}`);
    console.log(`     ${f.message}`);
  }
  console.log(
    findings.length === 0
      ? `${MARK.pass} 没有待清理项`
      : `\n合计 ${findings.length} 个待确认项（见 ${outTxt}）`,
  );
  console.log(`JSON：${jsonPath}`);
  // 启发式结果不作为失败依据；只有路由重复这种确定性问题才影响退出码
  process.exit((counts['duplicate-route'] || 0) > 0 ? 1 : 0);
}

main();
