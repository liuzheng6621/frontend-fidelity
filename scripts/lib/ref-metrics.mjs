/**
 * 参考站指标：probe-ref 产物的解析、漂移比较、冻结快照的读写。
 *
 * 被 recheck-refs.mjs（联网复测）与 snapshot-refs.mjs（离线冻结）共用。
 * 单一职责：只做「把 probe JSON 变成可比对的指标」和「快照文件进出」，
 * 不发请求、不启动浏览器、不写报告。
 */

import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

/** 单站蒸馏对象：name 对应 references/<name>，url 是采样入口。 */
export const SITES = [
  { name: 'awwwards', label: 'Awwwards 奖项目录', url: 'https://www.awwwards.com/' },
  { name: 'wegic', label: 'Wegic 营销站', url: 'https://wegic.ai/zh-cn' },
  { name: 'jsdesign', label: '即时设计', url: 'https://js.design/' },
  { name: 'uishijie', label: 'UI 世界', url: 'http://www.uishijie.com/ui/' },
  { name: 'zcool', label: '站酷 UI 频道', url: 'https://www.zcool.com.cn/discover/17' },
  { name: 'stylekit', label: 'StyleKit 风格目录', url: 'https://www.stylekit.top/zh/styles' },
  { name: 'uinotes', label: 'UI Notes', url: 'https://uinotes.com/' },
  { name: 'luckymaomi', label: '猫叫兽 UI 风格库', url: 'https://luckymaomi.github.io/ui/' },
  { name: 'muzli', label: 'Muzli 灵感库', url: 'https://muz.li/inspiration/motion-design/' },
  { name: 'mastergo', label: 'MasterGo', url: 'https://mastergo.com/' },
  { name: 'vercel', label: 'Vercel 登录', url: 'https://vercel.com/login' },
  { name: 'applestore', label: 'Apple Store 商品配置', url: 'https://www.apple.com.cn/shop/buy-iphone' },
  { name: 'apple', label: '苹果中国首页', url: 'https://www.apple.com.cn/' },
  { name: 'sspai', label: '少数派', url: 'https://sspai.com/' },
  { name: 'yuque', label: '语雀', url: 'https://www.yuque.com/' },
  { name: 'juejin', label: '掘金', url: 'https://juejin.cn/' },
  { name: 'holynova', label: 'holynova 动效站', url: 'https://holynova.github.io/' },
];

export const SNAPSHOT_PATH = path.join('references', 'reference-snapshot.json');

export const SNAPSHOT_METHOD =
  'probe-ref.mjs 在 1440×900 无头 Chromium 读 getComputedStyle 与盒模型；H1 取文档第一个 h1（与视觉主标题不一定是同一元素）';

export const SNAPSHOT_NOTE =
  '冻结值。站点改版后 recheck-refs.mjs 只报漂移，不改这里；确认改版后跑 --freeze 重设并写新的 capturedAt。';

/** probe-ref 的 JSON → 可比对的指标。字段少而稳，够判断「改版了没有」。 */
export function metricsFromProbe(j) {
  const pick = (m) => (m ? Number(m.size ?? m) : null);
  const p = j.metrics?.p || {};
  return {
    title: j.title || '',
    h1: pick(j.metrics?.h1),
    body: pick(p),
    bodyLh: p.lh ?? null,
    font: j.fonts?.[0]?.[0] || null,
    control: j.controlHeights?.[0] ?? null,
    cards: j.cards || null,
    images: j.images || null,
    animations: j.animations ?? null,
    bodyBg: j.bodyBg || null,
    radii: (j.radius || []).slice(0, 6),
    rootVars: Object.keys(j.rootVars || {}).length,
  };
}

/** 在目录里找 probe 产物并解析。probe-ref 用 URL slug 命名，不能写死文件名。 */
export async function readProbeDir(dir) {
  const files = (await readdir(dir)).filter((f) => f.endsWith('.json'));
  if (!files.length) throw new Error(`${dir} 里没有 JSON 产物`);
  // 有多份时取最新的
  const stats = await Promise.all(
    files.map(async (f) => ({ f, t: (await readFile(path.join(dir, f), 'utf8')).length })),
  );
  stats.sort((a, b) => b.t - a.t);
  const raw = await readFile(path.join(dir, stats[0].f), 'utf8');
  return metricsFromProbe(JSON.parse(raw));
}

const same = (a, b, tol = 1) => {
  // 只有「两边都测到了」才比数值；一边为空另一边有值，本身就是变化
  if (a === undefined || b === undefined) return true;
  if (a === null || b === null) return a === b;
  if (typeof a === 'number' && typeof b === 'number') return Math.abs(a - b) <= tol;
  return a === b;
};

/** 返回漂移描述数组；没有 before 时返回 null（首次采样 ≠ 没变化）。 */
export function diffMetrics(before, after) {
  if (!before) return null;
  const out = [];
  for (const [key, label, tol] of [
    ['h1', 'H1', 2],
    ['body', '正文', 1],
    ['control', '控件高', 2],
    ['bodyBg', '底色', 0],
    ['font', '主字体', 0],
  ]) {
    if (!same(before[key], after[key], tol)) out.push(`${label} ${before[key]} → ${after[key]}`);
  }
  if (before.cards && after.cards) {
    if (before.cards.total !== after.cards.total) out.push(`卡片 ${before.cards.total} → ${after.cards.total}`);
    if (before.cards.border !== after.cards.border) out.push(`带边框卡 ${before.cards.border} → ${after.cards.border}`);
  }
  if (before.images && after.images && before.images.lazy !== after.images.lazy) {
    out.push(`懒加载图 ${before.images.lazy}/${before.images.total} → ${after.images.lazy}/${after.images.total}`);
  }
  return out;
}

/**
 * 读快照。兼容两种形态：
 *   - 新：{ capturedAt, frozenAt, sites: {...} }
 *   - 旧（v1.17 的扁平 recheck-baseline.json）：{ <name>: {...} }
 */
export async function loadSnapshot(root) {
  const p = path.join(root, SNAPSHOT_PATH);
  try {
    const raw = JSON.parse(await readFile(p, 'utf8'));
    if (raw && typeof raw === 'object' && raw.sites && typeof raw.sites === 'object') {
      return { path: p, meta: raw, sites: raw.sites };
    }
    return { path: p, meta: { capturedAt: '（无日期）', sites: {} }, sites: raw || {} };
  } catch {
    return { path: p, meta: { capturedAt: '（无快照）', sites: {} }, sites: {} };
  }
}

export function todayStamp(now = new Date()) {
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

/** 写快照。只接收「已确认可达」的指标；不可达的站点由调用方保持旧值。 */
export async function writeSnapshot(root, { sites, meta, now = new Date() }) {
  const p = path.join(root, SNAPSHOT_PATH);
  await mkdir(path.dirname(p), { recursive: true });
  const next = {
    capturedAt: meta.capturedAt || todayStamp(now),
    frozenAt: now.toISOString(),
    frozenBy: meta.frozenBy || 'scripts/snapshot-refs.mjs',
    method: meta.method || SNAPSHOT_METHOD,
    note: meta.note || SNAPSHOT_NOTE,
    sites,
  };
  await writeFile(p, `${JSON.stringify(next, null, 2)}\n`, 'utf8');
  return { path: p, capturedAt: next.capturedAt, count: Object.keys(sites).length };
}
