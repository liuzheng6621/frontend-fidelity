#!/usr/bin/env node
/**
 * agent-adapter.mjs — 把本 Skill 接进其他 AI / Agent 的规则入口。
 *
 * 不同工具读不同的文件：Codex 读 AGENTS.md，Cursor 读 .cursor/rules/*.mdc，
 * Gemini CLI 读 GEMINI.md……本脚本按目标生成对应文件，内容只有「指路 + 三条铁律」，
 * 不复制参考库——避免同一套规则出现多份副本、改一处漏三处。
 *
 * 用法：
 *   node scripts/agent-adapter.mjs --target codex                 # 写 AGENTS.md 到当前目录
 *   node scripts/agent-adapter.mjs --target cursor --out ./repo    # 写到指定项目
 *   node scripts/agent-adapter.mjs --all --out ./repo              # 一次写全部适配文件
 *   node scripts/agent-adapter.mjs --target gemini --print         # 只打印，不落盘
 *   node scripts/agent-adapter.mjs --target codex --skill /path/to/frontend-fidelity
 *
 * 退出码：0 成功；2 参数错（未知 target / 目录不存在）。
 *
 * 设计约束：
 * - 生成的是「入口文件」，不是副本；Skill 升级后入口不用改（只引用路径）。
 * - 不覆盖已有文件，除非显式 --force；冲突时打印差异提示。
 * - 所有路径写成绝对路径，避免 agent 在子目录里跑时找不到。
 */
import { existsSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_SKILL = path.resolve(HERE, '..');

const argv = process.argv.slice(2);
const has = (k) => argv.includes(`--${k}`);
const arg = (k, d = null) => { const i = argv.indexOf(`--${k}`); return i >= 0 && argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[i + 1] : d; };

const skillRoot = path.resolve(arg('skill', DEFAULT_SKILL));
const outRoot = path.resolve(arg('out', process.cwd()));
const printOnly = has('print');
const force = has('force');
const all = has('all');
const target = arg('target', '');

/** 每个目标：写哪个文件、用什么包装。 */
const TARGETS = {
  codex: {
    label: 'Codex CLI / 通用 AGENTS.md',
    file: 'AGENTS.md',
    wrap: (body) => body,
  },
  gemini: {
    label: 'Gemini CLI',
    file: 'GEMINI.md',
    wrap: (body) => body,
  },
  cursor: {
    label: 'Cursor rules',
    file: '.cursor/rules/frontend-fidelity.mdc',
    wrap: (body) => `---\ndescription: 前端保真度：还原、整改、生成可验收骨架\nglobs: ["**/*.{html,css,scss,tsx,jsx,vue,svelte}"]\nalwaysApply: false\n---\n\n${body}`,
  },
  windsurf: {
    label: 'Windsurf rules',
    file: '.windsurf/rules/frontend-fidelity.md',
    wrap: (body) => `---\ntrigger: model_decision\ndescription: 前端还原 / 整改 / 生成骨架时读取\n---\n\n${body}`,
  },
  cline: {
    label: 'Cline rules',
    file: '.clinerules/frontend-fidelity.md',
    wrap: (body) => body,
  },
  roo: {
    label: 'Roo Code rules',
    file: '.roo/rules/frontend-fidelity.md',
    wrap: (body) => body,
  },
  continue: {
    label: 'Continue rules',
    file: '.continue/rules/frontend-fidelity.md',
    wrap: (body) => `---\nname: frontend-fidelity\nalwaysApply: false\n---\n\n${body}`,
  },
  openhands: {
    label: 'OpenHands microagent',
    file: '.openhands/microagents/frontend-fidelity.md',
    wrap: (body) => `---\nname: frontend-fidelity\ntype: knowledge\n---\n\n${body}`,
  },
  aider: {
    label: 'Aider conventions',
    file: 'CONVENTIONS.md',
    wrap: (body) => body,
  },
  zed: {
    label: 'Zed rules',
    file: '.rules',
    wrap: (body) => body,
  },
  generic: {
    label: '通用（任意 agent 可读）',
    file: 'FRONTEND-FIDELITY.md',
    wrap: (body) => body,
  },
};

function body() {
  const s = skillRoot.replace(/\\/g, '/');
  return `# 前端保真度（frontend-fidelity）

处理前端界面任务时，先读这份 Skill 的入口，再按它的路由加载参考：

- 入口：\`${s}/SKILL.md\`
- 参考库：\`${s}/references/\`（按页面类型选，不要一次读完）
- 脚本：\`${s}/scripts/\`（Node ≥ 18；截图 / 审计需在目标项目装 playwright）
- 脚本手册：\`${s}/docs/scripts.md\`

## 什么时候用

用户说「照这张截图做」「优化 / 美化这个页面」「后台太难看」「统一风格」「移动端适配」
「验收一下前端改动」「从零搭个后台 / 落地页 / 骨架」时，按 SKILL.md 的模式 A / B 走。

## 三条铁律（不可妥协）

1. **先看再改**：没跑过 \`screenshot.mjs\`、没看过现状截图，不动一个像素。
2. **不引入新体系**：已有 Tailwind / 组件库就扩展它，换体系要单独提案。
3. **改完自证**：截图 + 审计 + 对比度 + 构建全绿才算完成，给出命令与结论。

## 质量门（按需）

\`\`\`bash
node ${s}/scripts/screenshot.mjs --url <url> --out .design/after --themes light,dark
node ${s}/scripts/audit.mjs --url <url> --themes light,dark --design-system
python ${s}/scripts/contrast_check.py <css 目录>
node ${s}/scripts/flow.mjs --flow flow.json --base <站点根>
\`\`\`

完整参数、退出码与参考选型见入口文档。不要凭记忆复述参考库里的数值——要用就去读对应文件。
`;
}

const names = all ? Object.keys(TARGETS) : [target];
if (!names[0] || (names[0] !== 'all' && !TARGETS[names[0]])) {
  console.error(`未知 target：${target || '(空)'}\n可选：${Object.keys(TARGETS).join(', ')}, all`);
  process.exit(2);
}
if (!existsSync(skillRoot)) {
  console.error(`Skill 目录不存在：${skillRoot}`);
  process.exit(2);
}

const text = body();
const written = [];
for (const name of names) {
  const t = TARGETS[name];
  const dest = path.join(outRoot, t.file);
  const content = t.wrap(text);
  if (printOnly) {
    console.log(`\n===== ${t.label} → ${t.file} =====\n`);
    console.log(content);
    continue;
  }
  await mkdir(path.dirname(dest), { recursive: true });
  if (existsSync(dest) && !force) {
    const old = await readFile(dest, 'utf8');
    if (old === content) { console.log(`=  ${t.file} 已是最新`); continue; }
    console.log(`!  ${t.file} 已存在且内容不同，跳过（加 --force 覆盖）`);
    continue;
  }
  await writeFile(dest, content, 'utf8');
  written.push(t.file);
  console.log(`+  ${t.file}  (${t.label})`);
}

if (!printOnly) {
  console.log('');
  console.log(written.length ? `已写 ${written.length} 个入口文件，Skill 路径：${skillRoot}` : '没有写入（全部已存在或未选中）');
  console.log('提示：这些文件只是入口；升级 Skill 不需要重新生成。');
}
