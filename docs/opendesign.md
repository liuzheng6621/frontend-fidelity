# 作为 OpenDesign 插件使用

这个仓库同时是一个符合 **OpenDesign Plugin Spec v1** 的插件包：
`SKILL.md` 是可移植的 agent 契约，`open-design.json` 是市场卡片与运行元数据的 sidecar。

- 规范：`plugins/spec/SPEC.md`（OpenDesign 仓库内）
- Schema：`https://open-design.ai/schemas/plugin.v1.json`

## 文件职责

| 文件 | 作用 | 是否可移植 |
| --- | --- | --- |
| `SKILL.md` | 触发条件、工作流、脚本入口 | 是，任何 agent 都能读 |
| `open-design.json` | 市场元数据、pipeline atoms、inputs、capabilities | 否，只给 OpenDesign |
| `docs/assets/icon.png` | 市场卡片图标，512×512 | 是 |
| `evals/evals.json` | 5 条验收用例，含缺参、越界场景 | 是 |

`SKILL.md` 里**不写**任何 OpenDesign 专属字段；换宿主时删掉 `open-design.json` 即可。

## 清单要点

```jsonc
{
  "name": "frontend-fidelity",        // 必须等于目录名 = SKILL.md 的 name
  "version": "1.33.0",                // 必须等于 package.json version，校验器会拦
  "od": {
    "kind": "skill",
    "taskKind": "tune-collab",        // 主车道：refine（整改/还原/验收）
    "mode": "prototype",
    "capabilities": ["prompt:inject", "fs:read", "fs:write", "subprocess"]
  }
}
```

`subprocess` 是必需的——`screenshot.mjs` / `audit.mjs` / `fidelity.mjs` 要起子进程。
受限安装默认只给 `prompt:inject`，用户需要显式信任后脚本才能跑。

pipeline 五段对应本插件的实际流程：

| stage | atoms | 对应动作 |
| --- | --- | --- |
| `discovery` | `discovery-question-form` | 问清目标地址、整改还是从零 |
| `baseline` | `design-extract`, `todo-write` | 拍基线截图 / 抽设计稿约束 |
| `implement` | `patch-edit`, `file-write` | 改代码或生成骨架 |
| `verify` | `build-test`, `critique-theater`, `diff-review` | 截图 + 审计 + 构建 + 像素比对 |
| `handoff` | `handoff` | 交付说明与产物路径 |

## 校验

```bash
node scripts/plugin-validate.mjs          # 或 npm run plugin:validate
node scripts/plugin-validate.mjs --json   # 机器可读
```

零依赖，检查项：

- 必填字段、`name` 正则、semver
- 目录名 = `manifest.name` = `SKILL.md` 的 `name`
- `open-design.json` 与 `package.json` 的 version / license 一致
- `compat.agentSkills[].path`、`od.context.*`、`icon`、`exampleOutputs` 指向的文件真实存在
- `taskKind` / `mode` / `kind` / `capabilities` / `inputs[].type` / `genui` 枚举合法
- `useCase.query` 里的 `{{占位符}}` 必须在 `od.inputs` 里有定义
- `pipeline` 每段有 `id` + `atoms`；`repeat: true` 必须带 `until`
- atom 不在 v1 已知列表时给警告
- `SKILL.md` 超过 500 行时警告

退出码非 0 即失败，可直接挂到 CI。

## 打包

```bash
node scripts/plugin-pack.mjs              # → dist/frontend-fidelity-1.33.0.zip
node scripts/plugin-pack.mjs --validate   # 先校验再打包
node scripts/plugin-pack.mjs --list       # 只列文件
```

自写 ZIP 写入器，零依赖，时间戳固定（可复现构建）。
排除：`node_modules`、`.git`、`.tmp`、`.design`、`.workbuddy*`、`dist`、`__pycache__`、`*.pyc`。
当前产物：93 个文件，原始 2.48 MB，压缩后 0.90 MB。

解压后顶层目录就是 `frontend-fidelity/`，可直接作为插件目录导入。

## 两条落地路径

### A. 本机安装

1. `node scripts/plugin-pack.mjs --validate`
2. OpenDesign → Plugins → Import → 选 `dist/frontend-fidelity-1.29.0.zip`
3. 信任时勾选 `fs:read`、`fs:write`、`subprocess`，否则脚本跑不起来

### B. 进社区 registry

Fork `nexu-io/open-design`，把本仓库内容复制到 `plugins/community/frontend-fidelity/`，
再往 `plugins/registry/community/open-design-marketplace.json` 的 `plugins[]` 追加一条：

```json
{
  "name": "community/frontend-fidelity",
  "title": "Frontend Fidelity",
  "version": "1.33.0",
  "source": "github:<你的 GitHub 账号>/frontend-fidelity@main",
  "publisher": {
    "id": "<你的账号>",
    "github": "<你的 GitHub 账号>",
    "url": "https://github.com/<你的账号>"
  },
  "homepage": "https://gitee.com/liu-everything_impossble/skill-frontend-fidelity",
  "license": "MIT",
  "capabilitiesSummary": ["prompt:inject", "fs:read", "fs:write", "subprocess"],
  "tags": ["refine", "frontend", "design-review", "accessibility", "screenshot-diff"],
  "description": "Make the interface match what it claims to be: screenshot-driven restoration, WCAG audits, pixel-diff verification."
}
```

`source` 支持 `github:<owner>/<repo>@<ref>` 或 `github:<owner>/<repo>@<ref>/<subpath>`，
所以不必先复制进 monorepo——指向你自己的仓库根即可。

## 容易被拒的点

| 问题 | 处理 |
| --- | --- |
| `name` 与目录名不一致 | 校验器直接报错 |
| `version` 与 `package.json` 漂移 | 校验器报错，发版时同步 |
| 用了非 v1 atom | 校验器给警告，评审会要求换成一等 atom |
| `repeat` 没有 `until` | 校验器报错 |
| capabilities 一上来就要 `network` / `bash` | 从最小集合开始，`subprocess` 够用 |
| `SKILL.md` 塞市场元数据 | 全部挪进 `open-design.json` |
