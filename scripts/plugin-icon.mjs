#!/usr/bin/env node
/**
 * 生成 OpenDesign 插件图标（零依赖，纯手写 PNG）
 *
 * 产物：docs/assets/icon.png（512×512 RGBA）
 * 用法：node scripts/plugin-icon.mjs [--size 512] [--out docs/assets/icon.png]
 *
 * 视觉：深底 + 像素网格 + 一实一虚两个错位方块（设计稿 / 实现），
 * 中间一条差异色带——对应本插件的核心动作：比对、定位、收敛。
 */

import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { deflateSync } from 'node:zlib';

/* ------------------------------------------------------------------ */
/* 参数                                                                */
/* ------------------------------------------------------------------ */

const argv = process.argv.slice(2);
function arg(name, fallback) {
  const i = argv.indexOf(name);
  return i >= 0 && argv[i + 1] ? argv[i + 1] : fallback;
}
const SIZE = Number(arg('--size', '512'));
const OUT = resolve(arg('--out', 'docs/assets/icon.png'));

/* ------------------------------------------------------------------ */
/* 画布                                                                */
/* ------------------------------------------------------------------ */

const px = new Float64Array(SIZE * SIZE * 4); // 线性累加，最后取整

function blend(x, y, r, g, b, a) {
  if (a <= 0) return;
  const ix = Math.round(x);
  const iy = Math.round(y);
  if (ix < 0 || iy < 0 || ix >= SIZE || iy >= SIZE) return;
  const i = (iy * SIZE + ix) * 4;
  const sa = Math.min(1, a);
  const da = px[i + 3];
  const oa = sa + da * (1 - sa);
  if (oa <= 0) return;
  px[i] = (r * sa + px[i] * da * (1 - sa)) / oa;
  px[i + 1] = (g * sa + px[i + 1] * da * (1 - sa)) / oa;
  px[i + 2] = (b * sa + px[i + 2] * da * (1 - sa)) / oa;
  px[i + 3] = oa;
}

function fillRect(x0, y0, w, h, [r, g, b], a = 1) {
  for (let y = Math.round(y0); y < Math.round(y0 + h); y++) {
    for (let x = Math.round(x0); x < Math.round(x0 + w); x++) blend(x, y, r, g, b, a);
  }
}

/** 圆角矩形描边；厚度 t，半径 rad */
function strokeRoundRect(x0, y0, w, h, rad, t, color, a = 1) {
  const x1 = x0 + w;
  const y1 = y0 + h;
  for (let y = Math.floor(y0 - t); y <= Math.ceil(y1 + t); y++) {
    for (let x = Math.floor(x0 - t); x <= Math.ceil(x1 + t); x++) {
      const d = roundRectDistance(x, y, x0, y0, x1, y1, rad);
      if (d > -t && d <= 0) {
        const cover = Math.min(1, (d + t) / Math.max(1, t * 0.5) * 0.5 + 0.5);
        blend(x, y, color[0], color[1], color[2], a * cover);
      }
    }
  }
}

/** 有符号距离：负值在内部 */
function roundRectDistance(x, y, x0, y0, x1, y1, rad) {
  const cx = (x0 + x1) / 2;
  const cy = (y0 + y1) / 2;
  const hw = (x1 - x0) / 2 - rad;
  const hh = (y1 - y0) / 2 - rad;
  const dx = Math.abs(x - cx) - hw;
  const dy = Math.abs(y - cy) - hh;
  const ax = Math.max(dx, 0);
  const ay = Math.max(dy, 0);
  return Math.sqrt(ax * ax + ay * ay) + Math.min(Math.max(dx, dy), 0) - rad;
}

function fillRoundRect(x0, y0, w, h, rad, color, a = 1) {
  for (let y = Math.floor(y0); y < Math.ceil(y0 + h); y++) {
    for (let x = Math.floor(x0); x < Math.ceil(x0 + w); x++) {
      const d = roundRectDistance(x, y, x0, y0, x0 + w, y0 + h, rad);
      if (d <= 0) blend(x, y, color[0], color[1], color[2], a);
    }
  }
}

/* ------------------------------------------------------------------ */
/* 构图                                                                */
/* ------------------------------------------------------------------ */

const S = SIZE / 512; // 以 512 为设计基准缩放
const BG = [15, 17, 21];
const GRID = [255, 255, 255];
const DESIGN = [235, 238, 245];
const IMPL = [79, 140, 255];
const DIFF = [255, 92, 92];

// 底色（整块，圆角交给宿主裁切）
fillRect(0, 0, SIZE, SIZE, BG, 1);

// 像素网格
const step = 32 * S;
for (let x = step; x < SIZE; x += step) fillRect(x, 0, Math.max(1, S), SIZE, GRID, 0.05);
for (let y = step; y < SIZE; y += step) fillRect(0, y, SIZE, Math.max(1, S), GRID, 0.05);

// 设计稿层：虚线框（用短段拼）
const box = { x: 96 * S, y: 96 * S, w: 200 * S, h: 240 * S, r: 20 * S };
const dash = 14 * S;
const gap = 10 * S;
for (let d = 0; d < box.w; d += dash + gap) {
  fillRect(box.x + d, box.y, Math.min(dash, box.w - d), 3 * S, DESIGN, 0.85);
  fillRect(box.x + d, box.y + box.h - 3 * S, Math.min(dash, box.w - d), 3 * S, DESIGN, 0.85);
}
for (let d = 0; d < box.h; d += dash + gap) {
  fillRect(box.x, box.y + d, 3 * S, Math.min(dash, box.h - d), DESIGN, 0.85);
  fillRect(box.x + box.w - 3 * S, box.y + d, 3 * S, Math.min(dash, box.h - d), DESIGN, 0.85);
}

// 实现层：实心圆角块，向右下错位
fillRoundRect(232 * S, 176 * S, 200 * S, 240 * S, 22 * S, IMPL, 0.92);
// 内部条带（模拟内容）
fillRoundRect(252 * S, 200 * S, 120 * S, 18 * S, 9 * S, [255, 255, 255], 0.9);
fillRoundRect(252 * S, 236 * S, 160 * S, 12 * S, 6 * S, [255, 255, 255], 0.45);
fillRoundRect(252 * S, 260 * S, 140 * S, 12 * S, 6 * S, [255, 255, 255], 0.45);
fillRoundRect(252 * S, 300 * S, 80 * S, 56 * S, 12 * S, [255, 255, 255], 0.25);

// 差异带：两框交界处的红色细线 + 端点
for (let y = 150 * S; y < 452 * S; y++) {
  blend(216 * S, y, DIFF[0], DIFF[1], DIFF[2], 0.95);
  blend(217 * S, y, DIFF[0], DIFF[1], DIFF[2], 0.55);
}
fillRoundRect(206 * S, 142 * S, 22 * S, 22 * S, 11 * S, DIFF, 1);
fillRoundRect(206 * S, 436 * S, 22 * S, 22 * S, 11 * S, DIFF, 1);

/* ------------------------------------------------------------------ */
/* PNG 编码                                                            */
/* ------------------------------------------------------------------ */

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i];
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  }
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body), 0);
  return Buffer.concat([len, body, crc]);
}

const raw = Buffer.alloc(SIZE * (SIZE * 4 + 1));
let p = 0;
for (let y = 0; y < SIZE; y++) {
  raw[p++] = 0; // filter: none
  for (let x = 0; x < SIZE; x++) {
    const i = (y * SIZE + x) * 4;
    const a = px[i + 3];
    if (a <= 0) {
      raw[p++] = BG[0];
      raw[p++] = BG[1];
      raw[p++] = BG[2];
      raw[p++] = 255;
      continue;
    }
    raw[p++] = Math.max(0, Math.min(255, Math.round(px[i])));
    raw[p++] = Math.max(0, Math.min(255, Math.round(px[i + 1])));
    raw[p++] = Math.max(0, Math.min(255, Math.round(px[i + 2])));
    raw[p++] = Math.max(0, Math.min(255, Math.round(a * 255)));
  }
}

const ihdr = Buffer.alloc(13);
ihdr.writeUInt32BE(SIZE, 0);
ihdr.writeUInt32BE(SIZE, 4);
ihdr[8] = 8; // bit depth
ihdr[9] = 6; // RGBA
ihdr[10] = 0;
ihdr[11] = 0;
ihdr[12] = 0;

const png = Buffer.concat([
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  chunk('IHDR', ihdr),
  chunk('IDAT', deflateSync(raw, { level: 9 })),
  chunk('IEND', Buffer.alloc(0)),
]);

mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, png);
console.log(`✓ ${OUT}  ${SIZE}×${SIZE}  ${(png.length / 1024).toFixed(1)} KB`);
