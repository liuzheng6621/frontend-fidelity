#!/usr/bin/env node
/**
 * OpenDesign 插件打包器（零依赖，自写 ZIP）
 *
 * 产物：dist/frontend-fidelity-<version>.zip
 * 目录结构：frontend-fidelity/SKILL.md, frontend-fidelity/open-design.json, ...
 *
 * 用法：
 *   node scripts/plugin-pack.mjs                 # 打包当前仓库根
 *   node scripts/plugin-pack.mjs --root <dir>    # 指定插件目录
 *   node scripts/plugin-pack.mjs --out <file>    # 指定输出文件
 *   node scripts/plugin-pack.mjs --list          # 只列文件不打包
 *   node scripts/plugin-pack.mjs --validate      # 打包前先跑校验
 */

import {
  readFileSync,
  writeFileSync,
  mkdirSync,
  readdirSync,
  statSync,
  existsSync,
} from 'node:fs';
import { join, resolve, dirname, relative, sep, basename } from 'node:path';
import { deflateRawSync } from 'node:zlib';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));

/* ------------------------------------------------------------------ */
/* 排除规则                                                            */
/* ------------------------------------------------------------------ */

const EXCLUDE_DIRS = new Set([
  'node_modules',
  '.git',
  '.github',
  'dist',
  '.design',
  '__pycache__',
  '.venv',
  '.workbuddy-ai',
  '.workbuddy',
  '.idea',
  '.vscode',
  '.tmp',
  '.cache',
  'coverage',
  'out',
]);

const EXCLUDE_FILES = new Set([
  '.gh-token',
  '.DS_Store',
  'Thumbs.db',
  'audit-report.json',
  '.gitignore',
  '.gitattributes',
  'package-lock.json',
  'pnpm-lock.yaml',
]);

const EXCLUDE_EXT = new Set(['.pyc', '.pyo', '.zip', '.log', '.tmp']);

/* ------------------------------------------------------------------ */
/* CRC32                                                               */
/* ------------------------------------------------------------------ */

const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

/* ------------------------------------------------------------------ */
/* 收集文件                                                            */
/* ------------------------------------------------------------------ */

function walk(root, dir = root, acc = []) {
  for (const name of readdirSync(dir).sort()) {
    const abs = join(dir, name);
    const st = statSync(abs);
    if (st.isDirectory()) {
      if (EXCLUDE_DIRS.has(name)) continue;
      walk(root, abs, acc);
      continue;
    }
    if (!st.isFile()) continue;
    if (EXCLUDE_FILES.has(name)) continue;
    const ext = name.slice(name.lastIndexOf('.')).toLowerCase();
    if (EXCLUDE_EXT.has(ext)) continue;
    acc.push({ abs, rel: relative(root, abs).split(sep).join('/'), size: st.size });
  }
  return acc;
}

/* ------------------------------------------------------------------ */
/* ZIP 写入（deflate，固定时间戳保证可复现）                            */
/* ------------------------------------------------------------------ */

const DOS_TIME = 0x0000; // 00:00:00
const DOS_DATE = 0x2821; // 2020-01-01

function makeZip(entries, prefix) {
  const chunks = [];
  const central = [];
  let offset = 0;

  for (const e of entries) {
    const data = readFileSync(e.abs);
    const crc = crc32(data);
    const deflated = deflateRawSync(data, { level: 9 });
    const useDeflate = deflated.length < data.length;
    const payload = useDeflate ? deflated : data;
    const method = useDeflate ? 8 : 0;
    const nameBuf = Buffer.from(`${prefix}${e.rel}`, 'utf8');

    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4); // version needed
    local.writeUInt16LE(0x0800, 6); // UTF-8 flag
    local.writeUInt16LE(method, 8);
    local.writeUInt16LE(DOS_TIME, 10);
    local.writeUInt16LE(DOS_DATE, 12);
    local.writeUInt32LE(crc, 14);
    local.writeUInt32LE(payload.length, 18);
    local.writeUInt32LE(data.length, 22);
    local.writeUInt16LE(nameBuf.length, 26);
    local.writeUInt16LE(0, 28);

    chunks.push(local, nameBuf, payload);

    const cd = Buffer.alloc(46);
    cd.writeUInt32LE(0x02014b50, 0);
    cd.writeUInt16LE(20, 4); // version made by
    cd.writeUInt16LE(20, 6); // version needed
    cd.writeUInt16LE(0x0800, 8);
    cd.writeUInt16LE(method, 10);
    cd.writeUInt16LE(DOS_TIME, 12);
    cd.writeUInt16LE(DOS_DATE, 14);
    cd.writeUInt32LE(crc, 16);
    cd.writeUInt32LE(payload.length, 20);
    cd.writeUInt32LE(data.length, 24);
    cd.writeUInt16LE(nameBuf.length, 28);
    cd.writeUInt16LE(0, 30); // extra
    cd.writeUInt16LE(0, 32); // comment
    cd.writeUInt16LE(0, 34); // disk start
    cd.writeUInt16LE(0, 36); // internal attrs
    cd.writeUInt32LE(0o644 << 16, 38); // external attrs
    cd.writeUInt32LE(offset, 42);
    central.push(cd, nameBuf);

    offset += local.length + nameBuf.length + payload.length;
  }

  const centralBuf = Buffer.concat(central);
  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0);
  eocd.writeUInt16LE(0, 4);
  eocd.writeUInt16LE(0, 6);
  eocd.writeUInt16LE(entries.length, 8);
  eocd.writeUInt16LE(entries.length, 10);
  eocd.writeUInt32LE(centralBuf.length, 12);
  eocd.writeUInt32LE(offset, 16);
  eocd.writeUInt16LE(0, 20);

  return Buffer.concat([...chunks, centralBuf, eocd]);
}

/* ------------------------------------------------------------------ */
/* 参数                                                                */
/* ------------------------------------------------------------------ */

function parseArgs(argv) {
  const out = { root: process.cwd(), out: null, list: false, validate: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--root') out.root = resolve(argv[++i]);
    else if (a === '--out') out.out = resolve(argv[++i]);
    else if (a === '--list') out.list = true;
    else if (a === '--validate') out.validate = true;
    else if (a === '--help' || a === '-h') {
      console.log('用法: node scripts/plugin-pack.mjs [--root <dir>] [--out <zip>] [--list] [--validate]');
      process.exit(0);
    } else out.root = resolve(a);
  }
  return out;
}

/* ------------------------------------------------------------------ */
/* 入口                                                                */
/* ------------------------------------------------------------------ */

const args = parseArgs(process.argv.slice(2));
const root = args.root;
const manifestPath = join(root, 'open-design.json');

if (!existsSync(manifestPath)) {
  console.error(`✗ 找不到 ${manifestPath}`);
  process.exit(1);
}

const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
const prefix = `${manifest.name}/`;
const entries = walk(root);

if (args.list) {
  let total = 0;
  for (const e of entries) {
    total += e.size;
    console.log(`${String(e.size).padStart(9)}  ${prefix}${e.rel}`);
  }
  console.log(`\n${entries.length} 个文件，${(total / 1048576).toFixed(2)} MB（未压缩）`);
  process.exit(0);
}

if (args.validate) {
  try {
    execFileSync(process.execPath, [join(HERE, 'plugin-validate.mjs'), '--root', root], {
      stdio: 'inherit',
    });
  } catch {
    console.error('✗ 校验未通过，终止打包');
    process.exit(1);
  }
}

const outPath =
  args.out || join(root, 'dist', `${manifest.name}-${manifest.version}.zip`);
mkdirSync(dirname(outPath), { recursive: true });

const zip = makeZip(entries, prefix);
writeFileSync(outPath, zip);

const raw = entries.reduce((s, e) => s + e.size, 0);
console.log(`✓ ${outPath}`);
console.log(`  ${entries.length} 个文件 · 原始 ${(raw / 1048576).toFixed(2)} MB · 压缩后 ${(zip.length / 1048576).toFixed(2)} MB`);
console.log(`  顶层目录: ${prefix}（解压后可直接作为插件目录安装）`);
