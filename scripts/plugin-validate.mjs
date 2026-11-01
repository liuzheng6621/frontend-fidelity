#!/usr/bin/env node
/**
 * OpenDesign 插件清单校验器（零依赖）
 *
 * 依据：
 *   - docs/schemas/open-design.plugin.v1.json
 *   - plugins/spec/SPEC.md（§1 §5 §6）
 *
 * 用法：
 *   node scripts/plugin-validate.mjs                # 校验当前仓库根
 *   node scripts/plugin-validate.mjs --root <dir>   # 校验指定插件目录
 *   node scripts/plugin-validate.mjs --json         # 机器可读输出
 *
 * 退出码：0 全通过（允许 warn），1 有 error。
 */

import { readFileSync, existsSync, statSync, readdirSync } from 'node:fs';
import { join, basename, resolve, dirname, isAbsolute } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));

/* ------------------------------------------------------------------ */
/* 常量：来自 v1 schema + SPEC.md                                      */
/* ------------------------------------------------------------------ */

const SPEC_VERSION = '1.0.0';
const NAME_PATTERN = /^[a-z0-9][a-z0-9._-]*$/;
const KINDS = ['skill', 'scenario', 'atom', 'bundle'];
const TASK_KINDS = ['new-generation', 'code-migration', 'figma-migration', 'tune-collab'];
const MODES = ['prototype', 'deck', 'live-artifact', 'image', 'video', 'hyperframes', 'audio', 'design-system'];
const INPUT_TYPES = ['string', 'text', 'select', 'number', 'boolean', 'file'];
const GENUI_KINDS = ['form', 'choice', 'confirmation', 'oauth-prompt'];
const GENUI_PERSIST = ['run', 'conversation', 'project'];
const MOTIONS = ['scroll', 'deck', 'static'];
const KNOWN_CAPABILITIES = [
  'prompt:inject',
  'fs:read',
  'fs:write',
  'mcp',
  'subprocess',
  'bash',
  'network',
  'connector',
];
const KNOWN_ATOMS = new Set([
  'figma-extract',
  'code-import',
  'design-extract',
  'token-map',
  'rewrite-plan',
  'discovery-question-form',
  'direction-picker',
  'todo-write',
  'file-write',
  'live-artifact',
  'media-image',
  'media-video',
  'media-audio',
  'critique-theater',
  'file-read',
  'patch-edit',
  'diff-review',
  'build-test',
  'handoff',
  'connector',
]);
const SKILL_LINE_BUDGET = 500;

/* ------------------------------------------------------------------ */
/* 参数                                                                */
/* ------------------------------------------------------------------ */

function parseArgs(argv) {
  const out = { root: process.cwd(), json: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--root') out.root = resolve(argv[++i]);
    else if (a === '--json') out.json = true;
    else if (a === '--help' || a === '-h') {
      console.log('用法: node scripts/plugin-validate.mjs [--root <dir>] [--json]');
      process.exit(0);
    } else {
      out.root = resolve(a);
    }
  }
  return out;
}

/* ------------------------------------------------------------------ */
/* 极简 YAML frontmatter 解析（只取顶层标量 + 折叠块）                  */
/* ------------------------------------------------------------------ */

function readFrontmatter(markdown) {
  const m = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/.exec(markdown);
  if (!m) return { ok: false, data: {}, body: markdown };
  const raw = m[1];
  const data = {};
  const lines = raw.split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!line.trim() || line.trimStart().startsWith('#')) continue;
    if (/^\s/.test(line)) continue; // 嵌套块跳过，交给调用方按需处理
    const idx = line.indexOf(':');
    if (idx === -1) continue;
    const key = line.slice(0, idx).trim();
    let value = line.slice(idx + 1).trim();
    if (value === '>-' || value === '>' || value === '|-' || value === '|') {
      const parts = [];
      while (i + 1 < lines.length && (/^\s+/.test(lines[i + 1]) || lines[i + 1].trim() === '')) {
        parts.push(lines[++i].trim());
      }
      value = parts.filter(Boolean).join(' ');
    } else if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    data[key] = value;
  }
  return { ok: true, data, body: markdown.slice(m[0].length) };
}

/* ------------------------------------------------------------------ */
/* 校验主体                                                            */
/* ------------------------------------------------------------------ */

const errors = [];
const warnings = [];
const notes = [];
const err = (msg) => errors.push(msg);
const warn = (msg) => warnings.push(msg);

function isStr(v) {
  return typeof v === 'string' && v.length > 0;
}
function checkUri(value, field) {
  if (value === undefined) return;
  try {
    new URL(value);
  } catch {
    err(`${field} 不是合法 URI: ${JSON.stringify(value)}`);
  }
}

function validate(root) {
  const manifestPath = join(root, 'open-design.json');
  if (!existsSync(manifestPath)) {
    err('缺少 open-design.json');
    return null;
  }

  let manifest;
  try {
    manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
  } catch (e) {
    err(`open-design.json 解析失败: ${e.message}`);
    return null;
  }

  /* --- 必填 --- */
  for (const key of ['specVersion', 'name', 'version']) {
    if (!isStr(manifest[key])) err(`缺少必填字段 ${key}`);
  }
  if (isStr(manifest.specVersion) && manifest.specVersion !== SPEC_VERSION) {
    warn(`specVersion=${manifest.specVersion}，当前 spec kit 为 ${SPEC_VERSION}`);
  }
  if (isStr(manifest.name) && !NAME_PATTERN.test(manifest.name)) {
    err(`name 不匹配 ${NAME_PATTERN}: ${manifest.name}`);
  }
  if (isStr(manifest.version) && !/^\d+\.\d+\.\d+([-+].+)?$/.test(manifest.version)) {
    warn(`version 不是 semver: ${manifest.version}`);
  }

  /* --- 目录名 / SKILL.md name 一致 --- */
  const folder = basename(root);
  if (isStr(manifest.name) && manifest.name !== folder) {
    warn(`目录名 "${folder}" 与 manifest.name "${manifest.name}" 不一致（SPEC §1 要求一致）`);
  }

  /* --- 与 package.json 版本同步 --- */
  const pkgPath = join(root, 'package.json');
  if (existsSync(pkgPath)) {
    try {
      const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'));
      if (pkg.version && pkg.version !== manifest.version) {
        err(`version 漂移：open-design.json=${manifest.version} package.json=${pkg.version}`);
      }
      if (pkg.license && manifest.license && pkg.license !== manifest.license) {
        warn(`license 不一致：${manifest.license} vs package.json ${pkg.license}`);
      }
    } catch (e) {
      warn(`package.json 解析失败: ${e.message}`);
    }
  }

  /* --- 元信息 --- */
  checkUri(manifest.homepage, 'homepage');
  checkUri(manifest.author?.url, 'author.url');
  if (manifest.icon && !existsSync(join(root, manifest.icon))) {
    warn(`icon 指向的文件不存在: ${manifest.icon}`);
  }

  /* --- compat.agentSkills --- */
  const skillRefs = manifest.compat?.agentSkills;
  if (!Array.isArray(skillRefs) || skillRefs.length === 0) {
    err('缺少 compat.agentSkills[].path');
  } else {
    skillRefs.forEach((r, i) => {
      if (!isStr(r?.path)) {
        err(`compat.agentSkills[${i}].path 缺失`);
        return;
      }
      const p = join(root, r.path);
      if (!existsSync(p)) err(`compat.agentSkills[${i}].path 不存在: ${r.path}`);
    });
  }

  /* --- SKILL.md 本体 --- */
  const skillPath = join(root, 'SKILL.md');
  if (!existsSync(skillPath)) {
    err('缺少 SKILL.md');
  } else {
    const md = readFileSync(skillPath, 'utf8');
    const fm = readFrontmatter(md);
    if (!fm.ok) err('SKILL.md 缺少 frontmatter（--- 块）');
    if (!fm.data.name) err('SKILL.md frontmatter 缺 name');
    else if (fm.data.name !== manifest.name) {
      err(`SKILL.md name "${fm.data.name}" 与 manifest.name "${manifest.name}" 不一致`);
    }
    if (!fm.data.description) err('SKILL.md frontmatter 缺 description');
    else {
      const d = String(fm.data.description);
      if (!/^use this|^use when|当用户|使用|用于/i.test(d) && !/use this plugin when/i.test(d)) {
        warn('description 建议写成触发句（"Use this plugin when…" 或「当用户…时使用」）');
      }
      if (d.length < 60) warn(`description 偏短（${d.length} 字符），检索命中率会低`);
    }
    const bodyLines = md.split(/\r?\n/).length;
    if (bodyLines > SKILL_LINE_BUDGET) {
      warn(`SKILL.md 共 ${bodyLines} 行，超过建议上限 ${SKILL_LINE_BUDGET}；把细节挪到 references/`);
    } else {
      notes.push(`SKILL.md ${bodyLines} 行，在 ${SKILL_LINE_BUDGET} 行预算内`);
    }
  }

  /* --- od --- */
  const od = manifest.od;
  if (!od || typeof od !== 'object') {
    err('缺少 od 对象');
    return manifest;
  }
  if (od.kind && !KINDS.includes(od.kind)) err(`od.kind 非法: ${od.kind}`);
  if (od.taskKind && !TASK_KINDS.includes(od.taskKind)) err(`od.taskKind 非法: ${od.taskKind}`);
  if (od.mode && !MODES.includes(od.mode)) err(`od.mode 非法: ${od.mode}`);
  if (od.preview?.motion && !MOTIONS.includes(od.preview.motion)) {
    err(`od.preview.motion 非法: ${od.preview.motion}`);
  }

  /* --- capabilities --- */
  if (od.capabilities !== undefined) {
    if (!Array.isArray(od.capabilities)) err('od.capabilities 必须是数组');
    else
      od.capabilities.forEach((c) => {
        if (typeof c !== 'string') return err('od.capabilities 含非字符串项');
        if (c.startsWith('connector:')) return;
        if (!KNOWN_CAPABILITIES.includes(c)) warn(`未知 capability: ${c}`);
      });
  }

  /* --- inputs --- */
  const inputNames = new Set();
  if (od.inputs !== undefined) {
    if (!Array.isArray(od.inputs)) err('od.inputs 必须是数组');
    else
      od.inputs.forEach((f, i) => {
        if (!isStr(f?.name)) return err(`od.inputs[${i}].name 缺失`);
        if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(f.name)) {
          warn(`od.inputs[${i}].name "${f.name}" 建议用标识符，模板占位依赖它`);
        }
        if (inputNames.has(f.name)) err(`od.inputs 重复 name: ${f.name}`);
        inputNames.add(f.name);
        if (f.type && !INPUT_TYPES.includes(f.type)) err(`od.inputs[${i}].type 非法: ${f.type}`);
        if (f.type === 'select') {
          if (!Array.isArray(f.options) || f.options.length === 0) {
            err(`od.inputs[${i}] 为 select 但没有 options`);
          } else if (f.default !== undefined && !f.options.includes(f.default)) {
            err(`od.inputs[${i}].default 不在 options 内`);
          }
        }
      });
  }

  /* --- useCase.query 占位符 --- */
  const q = od.useCase?.query;
  if (q !== undefined) {
    const texts = typeof q === 'string' ? [q] : Object.values(q);
    for (const t of texts) {
      if (typeof t !== 'string') continue;
      for (const m of t.matchAll(/\{\{\s*([A-Za-z0-9_]+)\s*\}\}/g)) {
        if (!inputNames.has(m[1])) {
          err(`useCase.query 占位符 {{${m[1]}}} 没有对应 od.inputs`);
        }
      }
    }
  }

  /* --- pipeline --- */
  const stages = od.pipeline?.stages;
  if (stages !== undefined) {
    if (!Array.isArray(stages) || stages.length === 0) err('od.pipeline.stages 必须是非空数组');
    else {
      const ids = new Set();
      stages.forEach((s, i) => {
        if (!isStr(s?.id)) err(`pipeline.stages[${i}].id 缺失`);
        else {
          if (ids.has(s.id)) err(`pipeline 重复 stage id: ${s.id}`);
          ids.add(s.id);
        }
        if (!Array.isArray(s?.atoms) || s.atoms.length === 0) {
          err(`pipeline.stages[${i}].atoms 必须是非空数组`);
        } else {
          s.atoms.forEach((a) => {
            if (!KNOWN_ATOMS.has(a)) warn(`stage ${s.id}: 非一等 atom "${a}"（v1 可能不识别）`);
          });
        }
        if (s?.repeat === true && !isStr(s.until)) err(`stage ${s.id}: repeat=true 时必须给 until`);
        if (s?.onFailure && !['abort', 'skip', 'retry'].includes(s.onFailure)) {
          err(`stage ${s.id}: onFailure 非法 ${s.onFailure}`);
        }
      });
      notes.push(`pipeline ${stages.length} 个 stage，atom 全部为 v1 已知值`);
    }
  }

  /* --- context 引用路径 --- */
  const ctx = od.context || {};
  const checkPath = (p, label) => {
    if (!isStr(p)) return;
    const abs = isAbsolute(p) ? p : join(root, p);
    if (!existsSync(abs)) warn(`${label} 路径不存在: ${p}`);
  };
  (ctx.skills || []).forEach((r, i) => checkPath(r?.path, `od.context.skills[${i}]`));
  (ctx.assets || []).forEach((p, i) => checkPath(p, `od.context.assets[${i}]`));
  if (ctx.designSystem) {
    if (typeof ctx.designSystem === 'string') checkPath(ctx.designSystem, 'od.context.designSystem');
    else checkPath(ctx.designSystem.ref || ctx.designSystem.path, 'od.context.designSystem');
  }

  /* --- genui --- */
  const surfaces = od.genui?.surfaces;
  if (surfaces !== undefined) {
    if (!Array.isArray(surfaces)) err('od.genui.surfaces 必须是数组');
    else
      surfaces.forEach((s, i) => {
        if (!isStr(s?.id)) err(`genui.surfaces[${i}].id 缺失`);
        if (!GENUI_KINDS.includes(s?.kind)) err(`genui.surfaces[${i}].kind 非法: ${s?.kind}`);
        if (!GENUI_PERSIST.includes(s?.persist)) {
          err(`genui.surfaces[${i}].persist 非法: ${s?.persist}`);
        }
        if (s?.onTimeout && !['abort', 'default', 'skip'].includes(s.onTimeout)) {
          err(`genui.surfaces[${i}].onTimeout 非法: ${s.onTimeout}`);
        }
      });
  }

  /* --- exampleOutputs --- */
  (od.useCase?.exampleOutputs || []).forEach((e, i) => {
    if (!isStr(e?.path)) err(`useCase.exampleOutputs[${i}].path 缺失`);
    else checkPath(e.path, `useCase.exampleOutputs[${i}]`);
  });

  /* --- 打包体积提示 --- */
  const heavy = ['node_modules', '.git', 'dist', '.design'];
  for (const h of heavy) {
    if (existsSync(join(root, h)) && statSync(join(root, h)).isDirectory()) {
      notes.push(`打包时会排除 ${h}/`);
    }
  }
  const files = readdirSync(root).filter((f) => !heavy.includes(f));
  notes.push(`插件根可见条目 ${files.length} 个`);

  return manifest;
}

/* ------------------------------------------------------------------ */
/* 入口                                                                */
/* ------------------------------------------------------------------ */

const args = parseArgs(process.argv.slice(2));
const manifest = validate(args.root);

const report = {
  root: args.root,
  name: manifest?.name ?? null,
  version: manifest?.version ?? null,
  ok: errors.length === 0,
  errors,
  warnings,
  notes,
};

if (args.json) {
  console.log(JSON.stringify(report, null, 2));
} else {
  console.log(`OpenDesign 插件校验 · ${args.root}`);
  console.log(`  插件: ${report.name ?? '(未命名)'}@${report.version ?? '?'}`);
  for (const n of notes) console.log(`  · ${n}`);
  for (const w of warnings) console.log(`  ! ${w}`);
  for (const e of errors) console.log(`  ✗ ${e}`);
  console.log(report.ok ? `\n通过（${warnings.length} 条警告）` : `\n失败：${errors.length} 个错误`);
}

process.exit(report.ok ? 0 : 1);
