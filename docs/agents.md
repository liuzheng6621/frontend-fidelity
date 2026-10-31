# 在其他 AI / Agent 里用

这个 Skill 不绑定某一个客户端。入口是 `SKILL.md`，脚本是普通 Node / Python；
其他工具只要能读文件、能跑命令，就能用。差别只在「它默认读哪个规则文件」。

一条命令生成对应入口（内容只有指路 + 三条铁律，不复制参考库）：

```bash
node scripts/agent-adapter.mjs --target codex --out <你的项目>
node scripts/agent-adapter.mjs --all   --out <你的项目>   # 一次写全部
```

| Agent / 工具 | 生成的文件 | 说明 |
| --- | --- | --- |
| Codex CLI、通用 agent | `AGENTS.md` | 多数 CLI 会从仓库根读取 |
| Gemini CLI | `GEMINI.md` | 与 `AGENTS.md` 内容相同 |
| Cursor | `.cursor/rules/frontend-fidelity.mdc` | 带 `description` / `globs` / `alwaysApply` 头 |
| Windsurf | `.windsurf/rules/frontend-fidelity.md` | `trigger: model_decision` |
| Cline | `.clinerules/frontend-fidelity.md` | 目录形式，便于拆分多份规则 |
| Roo Code | `.roo/rules/frontend-fidelity.md` | 同上 |
| Continue | `.continue/rules/frontend-fidelity.md` | 带 `name` / `alwaysApply` 头 |
| OpenHands | `.openhands/microagents/frontend-fidelity.md` | `type: knowledge` |
| Aider | `CONVENTIONS.md` | 需在会话里 `/read CONVENTIONS.md` 或写进配置 |
| Zed | `.rules` | 项目根规则文件 |
| 其他 | `FRONTEND-FIDELITY.md` | 通用入口，手动让 agent 读 |

## 生成的是什么

```markdown
# 前端保真度（frontend-fidelity）

- 入口：<skill 绝对路径>/SKILL.md
- 参考库：<skill 绝对路径>/references/
- 脚本：<skill 绝对路径>/scripts/

三条铁律：先看再改 / 不引入新体系 / 改完自证。
```

**不复制参考库**：同一套规则出现多份副本，改一处漏三处是这类 skill 最常见的腐坏方式。
入口只写路径，Skill 升级后不用重新生成。

## 各家的差异（实测口径）

| 能力 | Claude Code / DSH / WorkBuddy | Codex / Gemini CLI | Cursor / Windsurf / Cline |
| --- | --- | --- | --- |
| 自动加载 Skill 元数据 | ✅ 读 `SKILL.md` frontmatter | ❌ 读根目录 `AGENTS.md` / `GEMINI.md` | ❌ 读各自 rules 文件 |
| 按需加载 `references/` | ✅ 由入口路由 | ✅ 手动读文件 | ✅ 手动读文件 |
| 跑脚本 | ✅ | ✅ | ✅（需允许终端） |
| 子 agent / 并行 | ✅ | 视版本 | ❌ 多数没有 |

结论：**入口文件解决「它知不知道有这个 Skill」，脚本解决「它能不能验收」**。
没有自动加载的工具，靠 `AGENTS.md` 里那句「处理前端任务先读入口」触发，命中率取决于模型是否遵守规则；
重要项目建议把入口内容直接贴进项目规则，而不是只留一行指针。

## 安装位置

```bash
# 三端一起装（Claude Code / DSH / WorkBuddy）
bash install.sh --target all
# 只装 WorkBuddy
bash install.sh --target workbuddy
```

Windows：`.\install.ps1 -Target all`。

装完把 Skill 路径传给适配器即可：

```bash
node ~/.workbuddy-ai/skills/frontend-fidelity/scripts/agent-adapter.mjs \
  --target cursor --out ~/projects/my-app
```

## 不承诺的部分

- 不保证所有工具都遵守 `AGENTS.md`；规则文件的优先级由各家自己定。
- 不提供 MCP server：本 Skill 的价值在判据与脚本，不在协议层。
- 不复制一份「英文版参考库」：参考库是实测数据，翻译不增加信息量，只增加维护成本。
