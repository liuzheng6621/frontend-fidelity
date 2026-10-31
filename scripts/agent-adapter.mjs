#!/usr/bin/env node
/**
 * agent-adapter.mjs — 把本 Skill 接进其他 AI / Agent 的规则入口。
 *
 * 不同工具读不同的文件：Codex 读 AGENTS.md，Cursor 读 .cursor/rules/*.mdc，
 * Gemini CLI 读 GEMINI.md……本脚本按目标生成对应文件。
 *
 * 用法：
 *   node scripts/agent-adapter.mjs --target codex                 # 写 AGENTS.md 到当前目录
 *   node scripts/agent-adapter.mjs --target all --out ./repo       # 一次写全部
 *   node scripts/agent-adapter.mjs --target cursor --lang en       # 英文入口
 *   node scripts/agent-adapter.mjs --target gemini --print         # 只打印，不落盘
 *   node scripts/agent-adapter.mjs --target all --out ./repo --check   # 写后校验
 *
 * 退出码：0 成功；1 --check 失败；2 参数错（未知 target / 目录不存在 / --timeout 越界）。
 *
 * 合并规则（重要）：
 * - 只维护 `<!-- frontend-fidelity:begin -->` 与 `:end` 之间的块，块外内容原样保留。
 * - 文件已存在但没有标记块：追加块，不覆盖用户已有规则。
 * - `--force` 才整文件重写。
 * - 重复执行幂等：块内容相同就报「已是最新」，不写盘。
 */
import { existsSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_SKILL = path.resolve(HERE, '..');

const argv = process.argv.slice(2);
const has = (k) => argv.includes(`--${k}`);
const arg = (k, d = null) => {
  const i = argv.indexOf(`--${k}`);
  return i >= 0 && argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[i + 1] : d;
};

const skillRoot = path.resolve(arg('skill', DEFAULT_SKILL));
const outRoot = path.resolve(arg('out', process.cwd()));
const printOnly = has('print');
const force = has('force');
const check = has('check');
const all = has('all');
const lang = (arg('lang', 'zh') || 'zh').toLowerCase();
const target = arg('target', '');

if (!['zh', 'en'].includes(lang)) {
  console.error('--lang 只能是 zh 或 en');
  process.exit(2);
}

const BEGIN = '<!-- frontend-fidelity:begin -->';
const END = '<!-- frontend-fidelity:end -->';

const TARGETS = {
  codex: { label: 'Codex CLI / 通用 AGENTS.md', file: 'AGENTS.md', wrap: (b) => b },
  gemini: { label: 'Gemini CLI', file: 'GEMINI.md', wrap: (b) => b },
  cursor: {
    label: 'Cursor rules',
    file: '.cursor/rules/frontend-fidelity.mdc',
    wrap: (b) => `---\ndescription: 前端保真度：还原、整改、生成可验收骨架\nglobs: ["**/*.{html,css,scss,tsx,jsx,vue,svelte}"]\nalwaysApply: false\n---\n\n${b}`,
  },
  windsurf: {
    label: 'Windsurf rules',
    file: '.windsurf/rules/frontend-fidelity.md',
    wrap: (b) => `---\ntrigger: model_decision\ndescription: 前端还原 / 整改 / 生成骨架时读取\n---\n\n${b}`,
  },
  cline: { label: 'Cline rules', file: '.clinerules/frontend-fidelity.md', wrap: (b) => b },
  roo: { label: 'Roo Code rules', file: '.roo/rules/frontend-fidelity.md', wrap: (b) => b },
  continue: {
    label: 'Continue rules',
    file: '.continue/rules/frontend-fidelity.md',
    wrap: (b) => `---\nname: frontend-fidelity\nalwaysApply: false\n---\n\n${b}`,
  },
  openhands: {
    label: 'OpenHands microagent',
    file: '.openhands/microagents/frontend-fidelity.md',
    wrap: (b) => `---\nname: frontend-fidelity\ntype: knowledge\n---\n\n${b}`,
  },
  aider: { label: 'Aider conventions', file: 'CONVENTIONS.md', wrap: (b) => b },
  zed: { label: 'Zed rules', file: '.rules', wrap: (b) => b },
  generic: { label: '通用（任意 agent 可读）', file: 'FRONTEND-FIDELITY.md', wrap: (b) => b },
};

function body() {
  const s = skillRoot.replace(/\\/g, '/');
  if (lang === 'en') {
    return `# frontend-fidelity

Read the skill entry before touching any UI task, then load only the references it routes to:

- Entry: \`${s}/SKILL.md\`
- References: \`${s}/references/\` (pick by page type; do not read them all)
- Scripts: \`${s}/scripts/\` (Node >= 18; screenshots/audits need playwright in the target project)
- Script manual: \`${s}/docs/scripts.md\`

## When to use

"Rebuild this page from the screenshot", "polish this admin panel", "unify the style",
"fix mobile layout", "verify the frontend changes", "generate a dashboard / landing page / skeleton".

## Three non-negotiables

1. **Look before editing**: no pixel changes before \`screenshot.mjs\` and a reviewed screenshot.
2. **No new design system**: extend the existing Tailwind / component library; a replacement needs its own proposal.
3. **Prove it**: screenshots + audit + contrast + build green, with commands and conclusions.

## Gates

\`\`\`bash
node "${s}/scripts/screenshot.mjs" --url <url> --out .design/after --themes light,dark
node "${s}/scripts/audit.mjs" --url <url> --themes light,dark --design-system
python "${s}/scripts/contrast_check.py" <css dir>
node "${s}/scripts/flow.mjs" --flow flow.json --base <site root>
\`\`\`

Do not quote numbers from the reference library by memory — read the file.
`;
  }
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
node "${s}/scripts/screenshot.mjs" --url <url> --out .design/after --themes light,dark
node "${s}/scripts/audit.mjs" --url <url> --themes light,dark --design-system
python "${s}/scripts/contrast_check.py" <css 目录>
node "${s}/scripts/flow.mjs" --flow flow.json --base <站点根>
\`\`\`

完整参数、退出码与参考选型见入口文档。不要凭记忆复述参考库里的数值——要用就去读对应文件。
`;
}

const names = target === 'all' || all ? Object.keys(TARGETS) : [target];
if (!names[0] || (names[0] !== 'all' && !TARGETS[names[0]])) {
  console.error(`未知 target：${target || '(空)'}\n可选：${Object.keys(TARGETS).join(', ')}, all`);
  process.exit(2);
}
if (!existsSync(skillRoot)) {
  console.error(`Skill 目录不存在：${skillRoot}`);
  process.exit(2);
}

const block = `${BEGIN}\n${body()}${END}\n`;
const stats = { created: 0, updated: 0, appended: 0, same: 0 };

function merge(existing, content) {
  const begin = existing.indexOf(BEGIN);
  const end = existing.indexOf(END);
  if (begin >= 0 && end > begin) {
    const next = existing.slice(0, begin) + content + existing.slice(end + END.length + 1);
    return { next, mode: next === existing ? 'same' : 'updated' };
  }
  const sep = existing.endsWith('\n') ? '\n' : '\n\n';
  return { next: existing + sep + content, mode: 'appended' };
}

for (const name of names) {
  const t = TARGETS[name];
  const dest = path.join(outRoot, t.file);
  const content = block; // 标记块内只放正文；frontmatter 属于文件级，只在新建时写

  if (printOnly) {
    console.log(`\n===== ${t.label} → ${t.file} =====\n`);
    console.log(t.wrap(block));
    continue;
  }

  await mkdir(path.dirname(dest), { recursive: true });
  let next = t.wrap(block);
  let mode = 'created';
  if (existsSync(dest)) {
    const old = await readFile(dest, 'utf8');
    if (force) { next = t.wrap(block); mode = old === next ? 'same' : 'updated'; }
    else ({ next, mode } = merge(old, block));
  }
  if (mode !== 'same') await writeFile(dest, next, 'utf8');
  stats[mode]++;
  console.log(`${{ created: '+', updated: '~', appended: '»', same: '=' }[mode]}  ${t.file}  (${t.label})`);

  if (check) {
    const text = await readFile(dest, 'utf8');
    const ok = text.includes(BEGIN) && text.includes(END) && text.includes(skillRoot.replace(/\\/g, '/'));
    if (!ok) {
      console.error(`✗ ${t.file} 校验失败：缺少标记块或 Skill 路径`);
      process.exitCode = 1;
    }
  }
}

if (!printOnly) {
  console.log('');
  console.log(`新建 ${stats.created} / 更新 ${stats.updated} / 追加 ${stats.appended} / 未变 ${stats.same}；Skill：${skillRoot}`);
  console.log('只维护标记块内的内容，块外规则原样保留；升级 Skill 不用重新生成。');
  if (check && !process.exitCode) console.log('✓ 校验通过：标记块与 Skill 路径都在');
}
