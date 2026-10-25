# 更新日志

版本按 `vMAJOR.MINOR.PATCH` 打 Tag，与 Gitee Releases 一一对应。分发包统一叫
`frontend-fidelity.zip`，由 `git archive` 从 Tag 快照生成，只含被 git 跟踪的文件
（不含 `shots/`、`audit-report.json`、`.design/`）。

## v1.1.1 - 2026-10-25

文档修正，代码与 v1.1.0 完全一致。

- 开头定位改为两条路：原文只写「把**已有**的前端界面做对、做实」，与「从 0 生成」能力不符。
- 「与 SKILL.md、frontend-design 的分工」表补齐 8 份 references（原表只列了 3 份）。
- 仓库结构树补上 `CHANGELOG.md`。
- 「七份实测参考数据」修正为八份。

## v1.1.0 — 2026-10-25

从「只会整改」扩成「既能整改、也能从 0 生成」。

### 新增

- **`scripts/scaffold.mjs`**（1,666 行，纯 node、零依赖）：三套人格 × 五类页面一键生成骨架。
  - 人格：`rational`（紧凑、发丝环按钮、控件 32px）/ `editorial`（大留白、描边优先、控件 40px）/
    `warm`（圆角、厚度内阴影、控件 44px）。
  - 页面：`landing` / `app` / `form` / `auth` / `states`。
  - 产出平铺 10 个文件：`tokens.json`、`tokens.css`、`base.css`、`components.css`、`ui.js`
    与五页 HTML（`index` / `app` / `form` / `auth` / `states`）。
  - 对比度在生成期算出来：`relLum` / `contrast` → `fillStep` / `brandInkStep` 决定
    `--brand-fill`、`--on-brand`、`--brand-ink`，不靠事后手调。
  - 退出码：`0` 成功，`2` 参数错（未知人格 / 未知页面）。
- **四份生成向参考文档**：
  - `references/page-patterns.md`：选型表 + 七类骨架必备要素与尺寸区间 + 空/错/无权限三变体。
  - `references/component-spec.md`：三档密度表 + 11 类组件规格与禁忌。
  - `references/design-tokens.md`：三套人格预设全表、色阶生成数学、字阶、圆角阴影配对、暗色推导。
  - `references/copy-and-content.md`：标题公式、按钮动词表、空/错/载文案公式、`{{TODO}}` 占位规范。
- **`references/wegic-design.md`**：wegic.ai 全站蒸馏——`--wg-*` 双 alpha ramp、塑料按钮 6 层内阴影、
  字阶 86.4/56/48/40 实测、区块节奏，以及「能搬什么 / 不能搬什么」的迁移口径。
- **`references/css-recipes.md` 第 12 节**：可直接粘贴的「塑料按钮 + 发丝圈」配方。
- **`scripts/probe-ref.mjs` 新增 `rootVars`**：抓 `:root` 自定义属性最终值（上限 120 项），
  令牌表不用再手抄。

### 变更

- `SKILL.md`：新增「先判断是哪一种活」（模式 A 整改与还原 / 模式 B 从 0 生成）与
  「从 0 生成（模式 B）」六步流程；阴影、字距、次级文字三条规则补上实测依据。
- `README.md`：新增模式 B 章节与 `scaffold.mjs` 手册；仓库结构、脚本表、FAQ、TOC 同步展开；
  「21 个真实站点」修正为 13 个实测站点。
- `.gitignore`：忽略 `audit-report.json`、`shots/`、`manifest.json`。

### 验收

三套人格 × 五类页面 × 明暗双主题 = 15 组，`audit.mjs` 全部 `0 error / 0 类 axe 违规`。

## v1.0.0 — 2026-10-22

首版：把「前端整改」做成可执行、可验收的技能包。

- 五步工作流（模式 A：先看 → 定体系 → 改 → 自查 → 交付）与三条不可妥协（先看再改、不引入新体系、改完自证）。
- 七个脚本：`screenshot.mjs`、`audit.mjs`、`auth.mjs`、`contrast_check.py`、`crop_logo.py`、
  `hygiene.mjs`、`run_checks.mjs`，全部零构建、单文件、退出码可判定。
- 五份参考数据：`design-evidence.md`（13 个真实站点实测）、`css-recipes.md`、`review-rubric.md`
  与两份姊妹技能协作说明。
- 内置 axe-core 4.14.0（`scripts/vendor/axe.min.js`，MPL-2.0），WCAG 检查离线可跑。