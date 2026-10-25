# frontend-fidelity · 前端保真度

> 把前端做对、做实，两条路都走：**已有界面**——按设计稿/截图还原，或把现存页面整改到位；**还没有界面**——从 0 生成一套骨架，再往上填内容与业务状态。
> 目标不是"改好看"，而是**让界面和它声称的样子一致，并且真的能用——改完能拿出证据**。

`v1.4.0` · [最新发行版](https://gitee.com/liu-everything_impossble/skill-frontend-fidelity/releases/latest) · `MIT` · `Node.js ≥ 18` · `Python ≥ 3.9（仅裁图/对比度）` · `WCAG 检查离线可跑` · `9 个可执行脚本`

---

## 目录

- [这是什么](#这是什么)
- [适用与不适用](#适用与不适用)
- [与 SKILL.md、frontend-design 的分工](#与-skillmdfrontend-design-的分工)
- [快速开始](#快速开始)
- [安装](#安装)
- [仓库结构](#仓库结构)
- [五步工作流（模式 A：整改与还原）](#五步工作流模式-a整改与还原)
- [从 0 生成（模式 B）](#从-0-生成模式-b)
- [脚本手册](#脚本手册)
  - [scaffold.mjs — 从 0 生成前端骨架](#scaffoldmjs--从-0-生成前端骨架)
  - [screenshot.mjs — 多视口 / 多主题全页截图](#screenshotmjs--多视口--多主题全页截图)
  - [audit.mjs — 结构 + WCAG + CLS 审计](#auditmjs--结构--wcag--cls-审计)
  - [auth.mjs — 导出登录态](#authmjs--导出登录态)
  - [contrast_check.py — 对比度审计](#contrast_checkpy--对比度审计)
  - [crop_logo.py — 品牌图裁边与导出](#crop_logopy--品牌图裁边与导出)
  - [hygiene.mjs — 找无引用资源与重复路由](#hygienemjs--找无引用资源与重复路由)
  - [run_checks.mjs — 跑项目自带质量门](#run_checksmjs--跑项目自带质量门)
  - [probe-ref.mjs — 量参考站的真实样式](#probe-refmjs--量参考站的真实样式)
- [参数与退出码速查](#参数与退出码速查)
- [产物说明](#产物说明)
- [视觉细则摘要](#视觉细则摘要)
- [参考站蒸馏：wegic.ai](#参考站蒸馏wegicai)
- [参考站蒸馏：即时设计 js.design](#参考站蒸馏即时设计-jsdesign)
- [参考站蒸馏：UI 世界 uishijie](#参考站蒸馏ui-世界-uishijie)
- [参考站蒸馏：站酷 ZCOOL](#参考站蒸馏站酷-zcool)
- [交付验收清单](#交付验收清单)
- [CI 集成](#ci-集成)
- [常见问题](#常见问题)
- [设计取舍](#设计取舍)
- [许可与第三方](#许可与第三方)

---

## 这是什么

一个**把前端做对**的技能包，两条路都走：**先把已有界面整改/还原到位**，**也能从 0 生成一套能验收的骨架**。内含一份给 agent 读的操作手册（`SKILL.md`）+ 十一份实测参考数据（`references/`）+ 九个能直接跑的脚本（`scripts/`）。

它解决的是这类问题：

- "后台太难看了，帮我优化一下" —— 但不知道从哪下手，改完也不知道是否真的变好。
- "照着这张截图做" —— 形状像了，字号、行高、间距、圆角全是拍脑袋定的。
- "改完怎么验收" —— 只有一张新鲜截图，没有人证明它没坏、能点、对比度够、移动端不崩。
- "颜色换了，深色主题还能用吗" —— 没人跑过深色。
- "从零搭个后台 / 落地页" —— 骨架怎么排、状态缺哪些、字号间距定多少，全靠临场发挥。

### 三条不可妥协

1. **先看再改。** 没跑过 `screenshot.mjs`、没看过现状截图，不要动一个像素。凭想象重写是大面积回归的主要来源。
2. **不引入新体系。** 已用 Tailwind 就别插 CSS-in-JS，已有组件库就扩展它。换设计体系要单独提案，不能夹在"美化一下"里偷偷做。
3. **改完自证。** 截图 + 审计 + 构建必须全绿才算完成；"应该没问题"不是完成。

这三条不是风格偏好，是踩过的坑：第 1 条的违反者会造成不可 diff 的大面积回归；第 2 条会让同一个项目里出现两套间距和字号；第 3 条让"改完"永远等于"我觉得改完了"。

---

## 适用与不适用

| 场景 | 是否适用 | 说明 |
| --- | --- | --- |
| 企业后台 / 管理端界面整改 | ✅ | 主场景：列表、表单、详情、空态、权限墙 |
| 按设计稿或截图 1:1 还原 | ✅ | 配 `probe-ref.mjs` + `references/design-evidence.md` 落数值 |
| 移动 H5 / 小程序 WebView | ✅ | 390 视口、点击区、安全区、`100dvh` 都有检查项 |
| 多端一致性（PC / H5 / 平板） | ✅ | 三个视口一起截图，差异一眼可见 |
| Logo / 品牌视觉资产整合 | ✅ | `crop_logo.py` 裁边、方形化、导出；审计查拉伸与深色可见性 |
| 深色模式补齐 | ✅ | 截图与审计都能强制三种主题约定 |
| 从 0 生成后台 / 落地页骨架 | ✅ | `scaffold.mjs` 一次生成令牌 + 组件 + 五类页面，再往里填真内容 |
| 纯逻辑 bug、接口联调 | ❌ | 没有视觉面，用测试和日志，不在这里 |
| 大规模重构 / 换技术栈 | ❌ | 这是改造工具，不是迁移工具 |
| 品牌视觉从零创作 / 海报插画 | ❌ | 那属于 `frontend-design` / `canvas-design`：要原创视觉方向，不是"做对现有的" |

判据：**已有界面要整改/还原** → 走模式 A（截图、量、改、验收）；**还没有界面，但要一个能用的骨架** → 走模式 B（选型、生成、填内容、验收）。**要一份原创视觉提案** → 那才轮到 `frontend-design`。

---

## 与 SKILL.md、frontend-design 的分工

| 文件 / 技能 | 给谁看 | 内容 |
| --- | --- | --- |
| `SKILL.md` | agent（模型） | 两种模式（整改 / 从 0 生成）+ 视觉系统细则 + 反模式清单，是执行指令 |
| `README.md`（本文件） | 人 | 项目介绍、安装、脚本参数、产物、排错 |
| `references/design-evidence.md` | 双方 | 16 个实测站点（13 A 组：11 营销/产品 + 2 内容站；另 3 后台）的字体/间距/圆角/密度数值 |
| `references/wegic-design.md` | 双方 | wegic.ai 单站全量蒸馏：完整令牌、塑料按钮、字阶节奏、迁移口径 |
| `references/jsdesign-design.md` | 双方 | 即时设计 js.design 单站全量蒸馏：冷灰蓝底 + 负扩散阴影、130px 节奏、零 webfont、七处反例 |
| `references/uishijie-design.md` | 双方 | UI 世界（内容聚合站）单站全量蒸馏：零 gutter 图墙、卡片不画壳、四档字号、七处反例 |
| `references/zcool-design.md` | 双方 | 站酷（内容社区频道页）单站全量蒸馏：疏版图墙、两级分类靠形状分层、`0.8px` 发丝、直角分页、七处反例 |
| `references/page-patterns.md` | agent | 选型表 + 七类页面骨架 + 空/错/无权限三变体 + 内容最低量 |
| `references/component-spec.md` | agent | 11 类组件规格与禁忌（三档密度、尺寸、对齐、状态） |
| `references/design-tokens.md` | agent | 三套人格预设、色阶生成数学、字阶、圆角阴影配对、暗色推导 |
| `references/copy-and-content.md` | 双方 | 标题公式、按钮动词表、空/错/载文案、`{{TODO}}` 占位规范 |
| `references/css-recipes.md` | 双方 | 可直接复制的设计令牌、表格、骨架屏、空态、深色片段 |
| `references/review-rubric.md` | 双方 | 交付前逐项勾的验收清单（九节，含红旗） |
| `frontend-design`（另一个技能） | agent | 需要原创视觉方向时：构图、气质、品牌表达（不谈验收） |

`SKILL.md` 与 `README.md` 内容有重叠是故意的：模型读前者能直接动手，人读后者能理解与排错。

---

## 快速开始

三分钟跑通最短链路（把 `<url>` 换成本地地址）：

```bash
# 0. 拿到技能本体
git clone https://gitee.com/liu-everything_impossble/skill-frontend-fidelity.git ~/.dsh/skills/frontend-fidelity
cd <你的项目根>

# 1. 依赖只装一次
npm i -D playwright && npx playwright install chromium

# 2. 改动前：拍基线 + 看现状
node ~/.dsh/skills/frontend-fidelity/scripts/screenshot.mjs --url http://localhost:5173/ --out .design/before
node ~/.dsh/skills/frontend-fidelity/scripts/audit.mjs --url http://localhost:5173/ --themes light,dark

# 3. 改……

# 4. 改动后：拍终版 + 审计 + 质量门（这一步不绿不算完成）
node ~/.dsh/skills/frontend-fidelity/scripts/screenshot.mjs --url http://localhost:5173/ --out .design/after --themes light,dark
node ~/.dsh/skills/frontend-fidelity/scripts/audit.mjs --url http://localhost:5173/ --themes light,dark --expect-text "你的页面特征文案"
python ~/.dsh/skills/frontend-fidelity/scripts/contrast_check.py src/styles/*.css
node ~/.dsh/skills/frontend-fidelity/scripts/run_checks.mjs --cwd .
```

有登录墙的项目多一步（只需一次）：

```bash
node ~/.dsh/skills/frontend-fidelity/scripts/auth.mjs --url http://localhost:5173/login --out auth.json
# 之后所有脚本加 --storage-state auth.json
```

如果是从零开始（模式 B），第一步不是截图而是生成骨架：

```bash
# 生成一套令牌 + 组件 + 后台四页（含深色令牌）
node ~/.dsh/skills/frontend-fidelity/scripts/scaffold.mjs \
  --persona rational --out src --pages landing,app,form,auth,states --dark
```

生成完再走上面的第 2 步之后的验收链路（`scaffold.mjs` 是纯 node，不依赖 playwright）。
Windows 下把 `~/.dsh/skills/frontend-fidelity` 换成 `C:\Users\<你>\.dsh\skills\frontend-fidelity`，或直接把技能目录加进 PATH 后用相对路径。

---

## 安装

### 方式一：装成 DSH 技能（推荐）

```bash
git clone https://gitee.com/liu-everything_impossble/skill-frontend-fidelity.git ~/.dsh/skills/frontend-fidelity
```

目录名必须是 `frontend-fidelity`（与 `SKILL.md` 的 `name` 字段一致），否则技能不会按名注册。

### 方式二：下载 zip 解压

从 [Releases](https://gitee.com/liu-everything_impossble/skill-frontend-fidelity/releases/latest) 下载 `frontend-fidelity.zip`，解压到同名目录即可，内容与 git 版本一致。
包由 `git archive` 从 tag 生成，不含 `__pycache__`、截图目录与本地缓存。
当前是 [v1.3.0](https://gitee.com/liu-everything_impossble/skill-frontend-fidelity/releases/tag/v1.3.0)。

### 方式三：只取脚本

脚本是自包含的 ESM 文件，**不依赖技能被安装**。把 `scripts/` 拷进你的项目（例如 `tools/design/`），`node tools/design/audit.mjs --url ...` 直接跑。只有 `scripts/vendor/axe.min.js` 必须跟 `audit.mjs` 保持相对位置。

### 依赖

```bash
# JS 脚本：screenshot / audit / auth / probe-ref 需要 playwright；scaffold 是纯 node，不需要
npm i -D playwright
npx playwright install chromium      # 只装 chromium 就够

# Python 脚本
pip install pillow numpy             # numpy 可选，只影响大图裁切速度
```

- `hygiene.mjs`、`run_checks.mjs` **零依赖**，只要 Node。
- **axe-core 已内置**在 `scripts/vendor/axe.min.js`（4.14.0，MPL-2.0），WCAG 自动检测不需要联网、不需要额外安装。
- `scripts/lib/common.mjs` 是共享工具：视口预设、参数解析、CLS 观察器、自动滚动、深浅色强制。
- playwright 的解析顺序是**先按技能目录、再按当前工作目录**，各自找 `playwright` 与 `playwright-core`（用 `createRequire` + 绝对路径，不依赖 NODE_PATH）。所以在目标项目里跑最稳：项目根有 `node_modules/playwright` 就一定能找到。

---

## 仓库结构

```
frontend-fidelity/
├── SKILL.md                      # agent 操作手册：两种模式 + 五步整改 + 六步生成 + 视觉细则 + 反模式
├── README.md                     # 本文件：安装、脚本参数、产物、排错
├── LICENSE                       # MIT
├── CHANGELOG.md                  # 版本变更与发版说明
├── references/
│   ├── design-evidence.md        # 16 个实测站点（13 A 组 + 3 后台）：字体、字阶、行高、间距、圆角、密度
│   ├── wegic-design.md           # wegic.ai 单站全量蒸馏：完整令牌 + 塑料按钮 + 迁移口径
│   ├── jsdesign-design.md        # 即时设计 js.design 单站全量蒸馏：冷灰蓝底 + 负扩散阴影 + 七处反例
│   ├── uishijie-design.md        # UI 世界（内容聚合站）：零 gutter 图墙 + 卡片不画壳 + 七处反例
│   ├── zcool-design.md           # 站酷（内容社区频道页）：疏版图墙 + 两级分类靠形状 + 七处反例
│   ├── page-patterns.md          # 从 0 生成：选型表 + 七类页面骨架 + 三变体 + 内容最低量
│   ├── component-spec.md         # 11 类组件规格：三档密度、尺寸、对齐、禁忌
│   ├── design-tokens.md          # 三套人格预设、色阶生成算法、字阶、圆角阴影配对、暗色推导
│   ├── copy-and-content.md       # 文案规格：标题公式、按钮动词、空/错/载公式、占位写法
│   ├── css-recipes.md            # 设计令牌 / 表格 / 骨架屏 / 空态 / 深色 / 塑料按钮的可复制片段
│   └── review-rubric.md          # 交付前九节验收清单（含红旗清单）
└── scripts/
    ├── scaffold.mjs              # 从 0 生成骨架：三套人格令牌 + 组件 CSS + 五类页面
    ├── screenshot.mjs            # 多视口 × 多主题全页截图
    ├── audit.mjs                 # 结构 + axe WCAG 2.1 A/AA + CLS + 动效
    ├── auth.mjs                  # 有头浏览器人工登录，导出 auth.json
    ├── contrast_check.py         # 对比度审计，支持 oklch / color-mix / Tailwind v4
    ├── crop_logo.py              # 品牌图裁边、方形化、导出尺寸
    ├── hygiene.mjs               # 无引用组件/资源/样式、重复路由、超大资源
    ├── run_checks.mjs            # 跑项目自带的 lint/typecheck/test/build
    ├── probe-ref.mjs             # 量任意参考站的真实字体/配色/圆角/间距
    ├── lib/common.mjs            # 共享工具
    └── vendor/axe.min.js         # axe-core 4.14.0（MPL-2.0）
```

---

## 五步工作流（模式 A：整改与还原）

### 1. 勘察（不看代码先看界面）

```bash
node scripts/screenshot.mjs --url http://localhost:5173/ --out .design/before --viewports desktop,tablet,mobile
```

先看三张图，回答三个问题：主次关系看得出来吗？留白是成体系的还是随手留的？空/错/载态长什么样（把数据清空、把接口断掉各看一次）。
**这一步之前不要打开 IDE 改样式。**

### 2. 定视觉基线（改动前先写下来）

把现状的数值写成一张表：字阶（12/13/14/16/20/24/32…）、间距基数（4 还是 8）、圆角档位、主色与中性色阶、表格行高、控件高度。
没把握就量：

```bash
node scripts/probe-ref.mjs --url https://参考站.com --out .tmp/ref --name ref --brief
```

再到 `references/design-evidence.md` 找同行区间，确认你的目标值不是营销站误搬进后台的数值。

### 3. 动手改

按"一类事一个提交"推进：调色 → 布局 → 状态 → 可用性。每类改完立刻跑一次审计，别攒到最后。

### 4. 验收（必须跑，见上面的最短流程）

判据：`audit.mjs` 退出码 0；深色主题单独跑过；对比度无未达标；`run_checks.mjs` 全绿；`hygiene.mjs` 的每一条待确认项都有取舍记录。

### 5. 交付说明（写给人看）

四段，缺一段不算交付：

```
改了什么：<3–5 条，按影响面排序>
为什么：<每条一句，指向具体问题与量化证据>
验证：<命令 + 结论 + 截图路径>
未做与风险：<没改的、需要产品/设计定的、已知局限>
```

量化优先：`对比度 3.1→4.6`、`390 宽横向溢出 42px→0`、`CLS 0.24→0.02`，比"更好看了"有用一百倍。

---

## 从 0 生成（模式 B）

没有界面、要从零做一个，就别用「整改」那套（那套的起点是既有截图）。走这六步：

| 步骤 | 用什么 | 产物 |
| --- | --- | --- |
| 1. 选型 | `references/page-patterns.md` 的选型表 | 页面清单 + 人格（rational / editorial / warm） |
| 2. 生成骨架 | `scripts/scaffold.mjs` | 令牌 + 组件 CSS + 页面 HTML |
| 3. 改令牌 | `references/design-tokens.md` | 品牌色阶、中性色温度、密度与圆角 |
| 4. 填内容 | `references/copy-and-content.md` | 真文案，`{{TODO}}` 清零 |
| 5. 补结构与状态 | `references/page-patterns.md` + `component-spec.md` | 筛选/分页/空态/错误态齐全 |
| 6. 验收 | 与模式 A 相同 | 截图 + 审计全绿 |

```bash
# 1) 生成（后台形态）
node scripts/scaffold.mjs --persona rational --out src --pages landing,app,form,auth,states --dark

# 2) 起本地服务再体检（file:// 会被 CORS 干扰，审计结果不可信）
node scripts/screenshot.mjs --url http://localhost:5173/ --out .design/after
node scripts/audit.mjs --url http://localhost:5173/ --themes light,dark
```

三套人格的差别不只是换色：

| | rational | editorial | warm |
| --- | --- | --- | --- |
| 适合 | SaaS、管理端、工具 | 内容站、出版、品牌 | 消费级、教育、社区 |
| 控件高 | 32px | 40px | 44px |
| 圆角 | 4/6/8/12 | 2/3/4/6 | 8/12/16/24 |
| 标题字重 | 600 | 400（大字轻） | 700 |
| 区块留白 | 56px | 112px | 64-80px |
| 按钮 | 平面 + 发丝环 | 描边优先 | 厚度内阴影 |

**生成物是起点，不是成品。** 骨架把「层级、间距、状态、可访问性」这些最容易漏的硬骨头钉死，视觉个性还得自己那一下——需要原创方向时转 `frontend-design`。

---

## 脚本手册

### scaffold.mjs — 从 0 生成前端骨架

一次性产出设计令牌 + 组件样式 + 五类页面，拿到就能跑、能量、能改。**模式 B 的第一步**。

```bash
# 后台：令牌 + 组件 + 落地页/列表/表单/认证/状态页
node scripts/scaffold.mjs --persona rational --out src --pages landing,app,form,auth,states

# 换品牌色相 + 带深色令牌
node scripts/scaffold.mjs --persona warm --accent 20 --dark --out preview --pages landing,form

# 产品名替换标题里的占位
node scripts/scaffold.mjs --name "南风工单" --out src --pages app,form
```

| 参数 | 说明 | 默认 |
| --- | --- | --- |
| `--persona` | `rational`（SaaS/后台，方正克制）／`editorial`（内容、品牌站，字重轻留白大）／`warm`（消费级、社区，暖色圆角厚） | `rational` |
| `--out` | 输出目录 | `ui-scaffold` |
| `--pages` | 逗号分隔：`landing,app,form,auth,states` | `landing,app` |
| `--accent` | 覆盖品牌色相 0–360（不填用该人格默认） | 人格预设 |
| `--dark` | 额外生成 `.dark` 令牌块（不给就等于没打算支持深色） | 关 |
| `--name` | 产品名 | `示例产品` |
| `--quiet` | 少打印 | 关 |
| `--help` / `-h` | 打印用法后退出 | — |

**产出**（平铺在 `--out` 目录，10 个文件）：

```
<out>/
├── tokens.json          # 令牌源，可喂给设计系统或其他工具
├── tokens.css           # 颜色/间距/字阶/圆角/阴影/动效变量，含可选 .dark
├── base.css             # reset、排版、焦点环、::selection、reduced-motion
├── components.css       # 按钮/表单/卡片/表格/标签/提示/空态/骨架/tabs/弹窗/toast + 外壳
├── ui.js                # 主题切换（localStorage）、密码显隐、tabs 键盘、modal Esc
└── *.html               # index / app / form / auth / states，按 --pages 决定
```

退出码：`0` 成功；`2` 参数错（未知人格 / 未知页面名，同时打印可选值）。

**生成物已过 `audit.mjs` 的明暗双主题验证**：三套人格 × 五类页面 0 error / 0 axe 违规。
但它只保证「层级、间距、状态、可访问性」这些硬骨头，文案全是 `{{TODO: ...}}` 占位——
你的活是把它们换成真内容（见 `references/copy-and-content.md`），别直接当成品交付。

页面骨架清单写在各 HTML 顶部的注释里，照着补删改比重写快。

---

### screenshot.mjs — 多视口 / 多主题全页截图

**用途**：一次拍齐 3 视口 × 2 主题，自动滚动触发懒加载，记录 console 错误与 CLS。

```bash
# 单页
node scripts/screenshot.mjs --url http://localhost:5173/ --out .design/before

# 单页 + 登录态 + 双主题
node scripts/screenshot.mjs --url http://localhost:5173/admin --out .design/after \
  --storage-state auth.json --themes light,dark --viewports desktop,mobile

# 同站多页：--base 一次，其余写相对路径
node scripts/screenshot.mjs --base http://localhost:5173 --pages /,/orders,/settings --out .design/before

# 页面清单文件（每行一条，# 开头是注释）
node scripts/screenshot.mjs --base http://localhost:5173 --pages pages.txt --out .design/before

# 自定义视口 + 只截首屏
node scripts/screenshot.mjs --url http://localhost:5173/ --viewports 1440x900,834x1194 --no-full-page
```

| 参数 | 默认 | 说明 |
| --- | --- | --- |
| `--url` | 必填（或 `--pages`） | 页面地址（完整 URL） |
| `--base` | – | 站点根地址；`--pages` 里的 `/orders` 会拼到它后面 |
| `--pages` | – | 逗号分隔的路径/URL（`/orders,/settings`），或一个 `.txt` 清单文件（每行一条，`#` 注释） |
| `--out` | `shots` | 输出目录（同时写入 `manifest.json`） |
| `--viewports` | `desktop,tablet,mobile` | 内置 `desktop` 1440×900、`tablet` 768×1024、`mobile` 390×844（`isMobile` + `hasTouch`）；也可写 `1440x900` 自定义 |
| `--themes` | `light` | `light` / `dark`，可组合；只传一个时不加后缀，传两个时文件名带 `-light` / `-dark` |
| `--storage-state` | – | `auth.mjs` 产出的登录态 JSON |
| `--reduced-motion` | 关 | 以系统"减少动效"偏好渲染（`prefers-reduced-motion: reduce`） |
| `--full-page` | 开 | 传 `--no-full-page` 或 `--full-page false` 只截首屏 |
| `--wait` | `1200` | 导航后额外等待 ms（等字体、动画、接口） |
| `--name` | 由 URL 生成 | 输出文件名前缀；配 `--pages` 多页时会自动加页面名后缀，防止互相覆盖 |

**输出**：`<out>/<name>-<viewport>[-<theme>].png` + `<out>/manifest.json`（每张图的 URL、视口、主题、console 错误、CLS）。

**深色模式怎么强制**：`--themes dark` 不只用 `prefers-color-scheme`，还会同时给 `<html>` 打 `.dark` 类、`data-theme="dark"`、`data-color-mode="dark"`，所以三种常见切主题写法（CSS 类 / data 属性 / 媒体查询）都能出图。三种都不是、截出来还是白的 → 这个站点确实没做深色，别假装支持。

**坑**：全页截图依赖自动滚动触发懒加载；如果图还是空白，说明图片由脚本异步渲染，加大 `--wait`。

---

### audit.mjs — 结构 + WCAG + CLS 审计

**用途**：机器可判定的那部分质量。**是下限，不是质量本身。**

```bash
# 基础
node scripts/audit.mjs --url http://localhost:5173/ --themes light,dark

# 抓"被重定向回登录页"：要求页面必须出现这段文案
node scripts/audit.mjs --url http://localhost:5173/orders --expect-text "订单列表" --reduced-motion

# 多页 + 登录态
node scripts/audit.mjs --base http://localhost:5173 --pages /,/orders --themes light,dark --storage-state auth.json

# 只跑结构检查，跳过 axe（想更快时）
node scripts/audit.mjs --url http://localhost:5173/ --no-axe
```

| 参数 | 默认 | 说明 |
| --- | --- | --- |
| `--url` / `--pages` / `--base` | 必填 | 语义同 `screenshot.mjs`；`--base` + `--pages /a,/b` 最省事 |
| `--viewports` | `desktop,tablet,mobile` | 移动端才做点击区检查 |
| `--themes` | `light` | 建议 `light,dark` |
| `--expect-text` | – | 页面 `innerText` 必须包含的文案（区分大小写）；用于抓"被重定向回登录页" |
| `--storage-state` | – | `auth.mjs` 产出的登录态 |
| `--reduced-motion` | 关 | 以 `reduce` 偏好渲染，并额外检查仍在无限循环的动画 |
| `--axe` | 开 | `--no-axe` 关闭 WCAG 检测（只跑结构检查） |
| `--wait` | `800` | 导航后等待 ms |
| `--out` | `audit-report.json` | 报告路径 |

**检查项**

| 级别 | check | 含义 |
| --- | --- | --- |
| error | `empty-page` | 白屏 / 内容为空（路由、权限、接口失败） |
| error | `expect-text` | 期望文案不存在（多为被重定向） |
| error | `h-overflow` | 页面横向溢出 |
| error | `broken-image` | 图片 404 或解码失败 |
| error | `logo-distorted` | Logo 显示比例与原始比例差 > 5% |
| error | `element-overlap` | 可交互元素互相压住 |
| error | `navigation` | 打不开页面 |
| error | `axe:<rule>` | axe serious / critical 违规（缺 label、对比度不足、ARIA 误用等） |
| warn | `text-clipped` | 文本被裁切且没有省略号 |
| warn | `font-too-small` | 正文 < 12px |
| warn | `small-tap-target` | 移动端点击区 < 32px |
| warn | `icon-button-no-label` | 图标按钮无 `aria-label` / `title` |
| warn | `motion-not-reduced` | 减少动效下仍无限循环 |
| warn | `axe:<rule>` | axe moderate / minor 违规 |
| 报告 | `layout-shift` | CLS > 0.1 时提示 |

- axe 只跑 **WCAG 2.1 A/AA** 规则集（`wcag2a`、`wcag2aa`、`wcag21a`、`wcag21aa`），跳过 best-practice，避免刷屏。
- `audit-report.json` 里每条违规都带 `helpUrl` 与命中节点的 HTML 片段，能直接定位。
- **退出码：有 error 时为 1**，可直接当 CI 门禁。

---

### auth.mjs — 导出登录态

**用途**：管理端几乎必有登录墙。跑一次，之后所有脚本复用。

```bash
node scripts/auth.mjs --url http://localhost:5173/login --out auth.json
```

打开**有头**浏览器，**你手动登录**，回到终端按 Enter，cookie + localStorage 写入 `auth.json`。之后所有脚本加 `--storage-state auth.json`。

| 参数 | 默认 | 说明 |
| --- | --- | --- |
| `--url` | 必填 | 登录页地址 |
| `--out` | `auth.json` | 输出路径 |
| `--force` | 关 | 文件已存在时覆盖（默认拒绝覆盖） |

**安全**：`auth.json` 是明文凭据。用完删除，**不要提交**（`.gitignore` 里已含 `auth.json`；`hygiene.mjs` 不会扫它）。

---

### contrast_check.py — 对比度审计

**用途**：`audit.mjs` 报的对比度问题，多数根因在**设计令牌**上，改 2–3 个变量就能消掉大半。这个脚本负责定位到变量。

```bash
python scripts/contrast_check.py                       # 自动找 cwd 下的 CSS
python scripts/contrast_check.py src/styles/theme.css --json contrast.json
python scripts/contrast_check.py --dir src             # 指定自动查找的根目录
python scripts/contrast_check.py --fg "#6b7280" --bg "#ffffff"   # 单点检查
python scripts/contrast_check.py --tokens-only         # 只做令牌配对，跳过选择器解析
python scripts/contrast_check.py --strict              # 所有配对一律按正文 4.5 要求
python scripts/contrast_check.py --self-test           # 验证颜色解析
```

- 支持 `#hex`、`rgb()/rgba()`、`hsl()/hsla()`、`hwb()`、**`oklch()`、`oklab()`、`lab()`**、`color(srgb …)`、`color-mix(in oklab|srgb, A p%, B)`、`var()` 链（含 fallback，最多 8 层）。
- 自动识别深色块：`.dark`、`[data-theme="dark"]`、`.theme-dark`、`@media (prefers-color-scheme: dark)`。
- 两种配对：同元素 `color` + `background`（背景不透明时才算），以及按变量名角色配对。
- 阈值：正文 **4.5:1**，UI 边界 / 图标 **3:1**。透明背景的配对跳过（无法判定，需人工）。
- **退出码：有未达标项为 1。**

> Tailwind v4 默认把颜色输出成 `oklch()`，只认 hex 的旧工具在解析阶段就全军覆没——这是本脚本支持它的原因。

---

### crop_logo.py — 品牌图裁边与导出

**用途**：拿到品牌图（书法字、PNG、白底扫描件）之后，裁掉多余边、留出呼吸空间、导出 favicon。

```bash
python scripts/crop_logo.py raw.png --check                       # 只报告，不写文件
python scripts/crop_logo.py raw.png --trim --pad 24 -o logo.png
python scripts/crop_logo.py logo.png --trim --format square --side 512 -o seal.png
python scripts/crop_logo.py raw.png --trim --height 64 -o logo-64.png
```

| 参数 | 说明 |
| --- | --- |
| `--trim` | 裁掉背景边：有 alpha 按 alpha，不透明图按四角背景色 |
| `--tolerance` | 纯色背景容差百分比（默认 6），白底扫描图可调到 8–12 |
| `--pad` | 四周留白 px |
| `--height` / `--width` | 等比缩放到指定尺寸 |
| `--format square` + `--side` | 正方形透明画布（favicon / 头像） |
| `--check` | 只打印包围盒与长宽比 |
| `--out` / `-o` | 输出路径 |

输出总是 PNG（透明）。用进 CSS 之前记住输出的 `aspect-ratio`，**不要在样式里硬拉**——审计的 `logo-distorted` 会抓出来。

---

### hygiene.mjs — 找无引用资源与重复路由

**用途**：改版收尾、合并前的仓库卫生检查。

```bash
node scripts/hygiene.mjs                          # 扫 ./src，在 ./ 下写报告
node scripts/hygiene.mjs --src app --out reports   # 扫 ./app，报告写进 ./reports/
node scripts/hygiene.mjs --src E:/proj/src --root E:/proj
```

| 参数 | 默认 | 说明 |
| --- | --- | --- |
| `--src` | `src` | 要扫的源码目录 |
| `--root` | `--src` 的上一级 | 项目根（`--out` 与 `public/assets` 的解析基准） |
| `--out` | `hygiene.json` | 可给目录（写 `hygiene.json`）或具体 `.json` 路径 |
| `--out-txt` | `hygiene-summary.txt` | 人读版清单，可给目录或具体 `.txt` / `.md` 路径 |

查五类：无引用组件（排除组件自己引用自己）、无引用静态资源、无引用样式文件、重复路由（`path` 与 `name` 都查）、> 300KB 的资源（`heavy-asset`）。

> **全部结果是"待确认"，不是删除建议。** 组件可能被全局注册、动态 `import()`、路由懒加载或字符串拼接引用，正则看不见。删之前：搜索整个仓库确认 → 跑构建 → 跑冒烟。

**退出码**：仅在发现重复路由（error 级）时为 1。

---

### run_checks.mjs — 跑项目自带质量门

**用途**：交付前最后一步，把项目自己的门跑一遍，而不是手工一个个敲。

```bash
node scripts/run_checks.mjs
node scripts/run_checks.mjs --cwd ../my-app        # 不必 cd
node scripts/run_checks.mjs --only lint,build
node scripts/run_checks.mjs --dir ../my-app --only test
node scripts/run_checks.mjs --continue             # 全跑完再汇总，不中断
```

| 参数 | 默认 | 说明 |
| --- | --- | --- |
| `--cwd` / `--dir` | 当前目录 | 指定项目根目录 |
| `--only` | 全部 | 逗号分隔，只跑指定步骤（`lint,typecheck,test,build`） |
| `--continue` | 关 | 失败也继续跑后面的步骤，最后统一汇总 |
| `--bail` | 开（默认） | 第一个失败即停，无需显式传 |

按 `package.json` 里**真实存在**的脚本依次跑 lint → typecheck → test → build；自动识别 `pnpm` / `yarn` / `bun` / `npm`；单步超时 10 分钟。

**退出码**：第一个失败步骤的退出码（全绿为 0）。

---

### probe-ref.mjs — 量参考站的真实样式

**用途**："做得像这个站"却说不清具体数值时，别凭印象，把它量下来。

```bash
node scripts/probe-ref.mjs --url https://linear.app --out .design/ref --name linear
node scripts/probe-ref.mjs --url http://localhost:5173/orders --theme dark
node scripts/probe-ref.mjs --url https://example.com --brief   # 只打关键行
node scripts/probe-ref.mjs --url https://example.com --no-shot # 不存截图
```

| 参数 | 默认 | 说明 |
| --- | --- | --- |
| `--url` | 必填 | 要量的页面 |
| `--out` | `.tmp/ref` | 输出目录（每站一个 `.json` + 一张 `.jpg`） |
| `--name` | 由 URL 生成 | 文件名前缀 |
| `--viewport` | `desktop` | `desktop` / `tablet` / `mobile` |
| `--theme` | `light` | `dark` 同样会强制三种主题约定 |
| `--wait` | `3000` | 额外等待 ms（等 web font 与入场动画） |
| `--brief` | 关 | 只打印关键数值，不列 CSS 变量（JSON 仍写） |
| `--no-shot` | – | 不存截图 |

**输出**：字体栈与出现次数、字号分布、`h1/h2/h3/p/a/th/td/label/button/input` 的字号-行高比-字重-字距-大小写、底色与文字色（`oklch()` 也会被正确解析成 sRGB 十六进制）、圆角档位、间距频次、表格行高、控件高度、侧栏/顶栏尺寸、卡片靠阴影还是靠边框、图片 lazy 比例、动画数、CSS 变量名，以及 **`:root` 上实际生效的自定义属性及其最终值**（`rootVars`，最多 120 项）——后者是遍历计算样式拿的，所以跨域样式表读不到、或被 JS 后注入的令牌也能量到（wegic.ai 的 `--wg-*` 就是这样测出来的）。

> **只抄比例和关系，不抄像素。** 落地数值对照 `references/design-evidence.md` 的跨站统计：营销站的 96–140px 大标题搬到管理端就是错的，后台正文 13–14px、控件 32px、表格行高 53px 才是同行区间。

---

## 参数与退出码速查

| 脚本 | 必需 | 最常用的可选 | 退出码 1 的条件 |
| --- | --- | --- | --- |
| `screenshot.mjs` | `--url` 或 `--pages` | `--themes light,dark`、`--viewports`、`--storage-state`、`--out` | 有页面截图失败（记在 `manifest.failed`） |
| `audit.mjs` | `--url` 或 `--pages` | `--themes light,dark`、`--expect-text`、`--no-axe`、`--reduced-motion` | 有 error 级问题 |
| `auth.mjs` | `--url` | `--out`、`--force` | 导出失败 |
| `contrast_check.py` | 无（默认扫 cwd） | `--json`、`--dir`、`--fg/--bg`、`--strict` | 有未达标项 |
| `crop_logo.py` | 输入图片 | `--trim --pad`、`--format square --side`、`--check` | 处理失败 |
| `hygiene.mjs` | 无 | `--src`、`--root`、`--out`、`--out-txt` | 发现重复路由 |
| `run_checks.mjs` | 无 | `--cwd`、`--only`、`--continue` | 任一步骤失败 |
| `probe-ref.mjs` | `--url` | `--out`、`--name`、`--theme`、`--brief` | 采样失败 |

通用约定：

- `--flag false`、`--no-flag` 两种写法都关掉开关（`flag()` 统一处理）。
- 视口预设：`desktop` 1440×900、`tablet` 768×1024、`mobile` 390×844（含 `isMobile` + `hasTouch`），也可写 `1440x900`。
- 相对路径一律相对**当前工作目录**（目标项目根），不是脚本所在目录。

---

## 产物说明

| 产物 | 由谁产生 | 内容 | 是否入库 |
| --- | --- | --- | --- |
| `.design/before/`、`.design/after/` | `screenshot.mjs` | PNG + `manifest.json` | 不入库，交付说明里给路径 |
| `audit-report.json` | `audit.mjs` | 每页每视口的违规清单（含 `helpUrl`、节点 HTML） | 不入库 |
| `contrast.json` | `contrast_check.py` | 配对与比值、失败项 | 不入库 |
| `hygiene.json` + `hygiene-summary.txt` | `hygiene.mjs` | 待确认清单（人读版 + 机读版） | 不入库 |
| `auth.json` | `auth.mjs` | 明文登录态 | **绝不入库** |
| `.tmp/ref/*.json`、`*.jpg` | `probe-ref.mjs` | 参考站实测数据 | 不入库 |

仓库 `.gitignore` 已包含 `.design/`、`auth.json`、`*.zip`、`node_modules/`、`__pycache__/`。

---

## 视觉细则摘要

`SKILL.md` 里有完整版，这里是需要反复查的部分。最后两节是 wegic.ai 蒸馏出来的、能直接搬到项目里的招。

### 中文排版

- 正文 **13–14px**（后台）/ 15–16px（H5），行高 **1.6–1.75**；中文不要 1.4 以下。
- 字重只用两档：**400 正文 + 500/600 标题**。中文字体缺少 700 时会被浏览器伪造加粗，边缘发胖。
- 中文与数字、英文混排时留 1/4 空格（`letter-spacing` 别乱加，宁可不加）；标点用全角，句号「。」顿号「、」书名号「《》」。
- 字体栈写成本机优先，别外链 Google Fonts：`system-ui, -apple-system, "PingFang SC", "Microsoft YaHei", "Source Han Sans SC", sans-serif`。
- 标题不要用 `letter-spacing: -0.02em` 抄英文站——中文字距为负会粘连。

### 色彩

- 一个主色 + 一套中性色阶（至少 6 档）+ 语义色（成功/警告/危险/信息）。**不要**每个页面自己定色。
- 中性色带一点主色倾向（暖灰或冷灰），纯灰 `#666` 在中文字面上显脏。
- 深色不是反色：背景用 `#0f1115` 级别的深灰，不用纯黑；文字用 `#e6e8eb` 级别，不用纯白；阴影换成描边或更亮的底色。
- 大面积纯色块只用主色的浅色档；主色满铺只用于强调（按钮、选中态）。

### 间距与结构

- 基数统一 **4 或 8**。相邻元素 8px，分组之间 24–32px，段落内 4–6px。
- 字号只取字阶里的值（12/13/14/16/20/24/32/40），禁止出现 15、17、21。
- 圆角成套：容器 12–16、卡片 8–12、控件 6–8、标签 4–999。同一层不要 6 和 12 混用。
- 每层背景只靠**明度差 + 1px 边框**分界，不要"阴影 + 粗边框 + 渐变"三重叠加。
- 内容区设最大宽度（管理端 1200–1440），超宽屏不要把表格拉成一条长线。

### 层级与阴影

- 阴影只做两档：`0 1px 2px`（卡片）、`0 8px 24px -8px`（浮层）。不要三层阴影叠出"立体感"。
- 弹窗/抽屉必须有遮罩层（`rgba(0,0,0,.4)` 起），并且焦点被限制在里面。

### 列表 / 管理端

- 表格：表头 12px 中性色、正文 13–14px、行高 **53px** 左右、斑马纹优先于网格线。
- 工具栏：搜索 + 主操作按钮放右侧，筛选控件靠左，一行内不要超过 6 个控件。
- 分页、批量操作、列宽拖拽是"后台三件套"，缺一件就要在交付说明里解释。
- 数字列右对齐 + 等宽数字（`font-variant-numeric: tabular-nums`）。

### 空、载、错三态（每个数据区都要有）

- 加载：骨架屏或与最终布局一致的占位，**不要全屏遮罩转圈**。
- 空态：一句人话 + 一个主行动按钮（"新建第一个项目"），不要只放插画。
- 错误：一句人话 + 重试入口，不要把 `Error: 500` 甩给用户。
- 无权限：单独文案，别和错误态共用。

### 表单

- 标签在上方（后台）/ 在左侧对齐（密集表单），必填标 `*` 并配 `aria-required`。
- 错误信息在字段下方，颜色 + 图标双通道，且用 `aria-describedby` 关联。
- 控件高度 **32px**（后台）/ 40–44px（H5）；输入框和按钮同高。
- 校验时机：失焦校验 + 提交时汇总，不要每次按键都报错。

### 登录墙

- 审计和截图都需要 `--storage-state auth.json`，否则截到的是登录页，`--expect-text` 能抓住这种"假通过"。
- 登录后 `?back=` 回跳必须有白名单，不要把任意 URL 带进去（开放重定向）。

### 响应式

- 断点：`640 / 768 / 1024 / 1280`，不要每个组件自己发明断点。
- 390px：点击区 ≥ 44×44，主操作放屏幕下 1/3（单手可达）。
- 表格窄屏转卡片列表或精简列；不要硬缩到看不清。
- 底部固定元素用 `env(safe-area-inset-bottom)`；高度用 `100dvh` 而不是 `100vh`。
- 触屏 hover 会粘住：把 hover 样式包进 `@media (hover: hover)`。

### 深色模式

- 用 CSS 变量切主题，不要在组件里写 `dark:` 前缀散落各处。
- 深色下重新校验对比度（`contrast_check.py` 已识别 `.dark` / `[data-theme="dark"]` / `prefers-color-scheme: dark`）。
- Logo 在深色下要可见：准备深色版，或给底色容器。
- 图片/插画在深色下不要直接反色。

### 可访问性（不用背标准，跑脚本）

- 焦点可见：`:focus-visible` 有 2px 轮廓；**禁止** `outline: none` 且无替代。
- 图标按钮必须有 `aria-label` / `title`。
- 表单控件必须有 `<label for>` / `aria-label`；图片有 `alt`（装饰用 `alt=""`）。
- 尊重 `prefers-reduced-motion: reduce`：装饰动画停，别让"轻轻飘"变成眩晕源。

### 避免（这些是"像 AI 生成的"信号）

- 大标题配"✨ 副标题 ✨"式 emoji 堆砌；正文里塞 emoji 当图标。
- 全页面渐变（尤其紫蓝）+ 全员 16px 圆角 + 全员大阴影。
- 每张卡片配一句无关励志小字；装饰性英文 all-caps 小标题滥用。
- 三个并排卡片塞三段长度相近的假文案（典型占位感）。
- 用 `border-radius: 9999px` 把所有东西做成胶囊，包括输入框和表格行。
- 无意义动效：元素逐个淡入、数字滚动、鼠标跟随光斑。
- 用 `!important` 打架、用 `margin-left` 硬推、用 `position: absolute` 拼布局。
- 中文里混半角标点，或全角用错。
- 把设计稿像素值原样搬进 `px`（先确认稿子是几倍图）。
- 只做浅色、只做 1440 宽、只做 happy path。

---

## 参考站蒸馏：wegic.ai

2026-02 对 `https://wegic.ai/zh-cn` 做了一次完整采集（1440×900 / 390×844，读 `getComputedStyle` + `:root` 计算值 + `document.fonts`，截 14 屏），
把它的设计语言拆成四块写进了技能：

- **[`references/wegic-design.md`](references/wegic-design.md)** — 单站全量：完整 `--wg-*` 令牌表（背景三件套 / ink 与 white 双 ramp / 薄荷品牌色十档 / 语义色）、
  圆角分工、按钮厚度的 6 层内阴影、字阶实测（86.4 / 56 / 48 / 40 / 36 / 34 / 28 / 20 / 15 / 13）、区块高度节奏、
  组件尺寸（主按钮 126×48、暗卡 392×441、FAQ 行 64、感言卡 370×208），以及**「能搬什么 / 不能搬什么」对照表**。
- **[`references/design-evidence.md`](references/design-evidence.md)** — Wegic 作为 A 组第 10 个样本并入跨站统计
  （正文均值仍 15.2、H1 均值 82.8、圆角与间距频次、阴影两派）。
- **[`references/css-recipes.md`](references/css-recipes.md) 第 12 节** — 可粘贴代码：塑料按钮（侧壁 4→2→0）、发丝圈、暗卡、暖白输入框、逐字入场（含静态回退）。
- **[`SKILL.md`](SKILL.md)** — 视觉细则里新增三条硬规则：字距只对大标题微放、次级文字用「同色相 + alpha」派生、发丝圈与内阴影优先于 border；反例清单也补了三条。

### 三招值得直接搬

| 招式 | 一行做法 |
| --- | --- |
| **按钮有厚度** | `inset 0 -4px 0 rgba(0,0,0,.06)` 做侧壁，hover 改 `-2px`，active 归零 → 塑料键帽，不用渐变 |
| **发丝圈代替 border** | `box-shadow: 0 0 0 1px rgba(0,0,0,.06)`：拐角不加粗、不占盒模型、不跳行高 |
| **文字同色相分层** | 只留 `#000` + 十档 alpha；深色段落把 ink 换成 `rgba(255,255,255,α)`，两套主题天然成立 |

### 也别学它这三处

促销条的高饱和渐变 + 倒计时角标 + 移动端 15% OFF 弹窗（广告位，不是设计语言）；预载 7 款 `unloaded` 的字体；用 `mt-[1600px]` 撑滚动长度当「高级感」。

重新采集一次：

```bash
node scripts/probe-ref.mjs --url https://wegic.ai/zh-cn --out .tmp/ref --name wegic
```

`probe-ref.mjs` 抓不到 `--wg-*` 令牌与逐字入场（真实标题是 `h1` 之后的逐字 `<span>`，`h1` 本身是 `sr-only`），
补一次 `evaluate` 遍历 `getComputedStyle(document.documentElement)` 即可——具体步骤写在 `references/wegic-design.md` 第十节。
---

## 参考站蒸馏：即时设计 js.design

2026-02 对 `https://js.design/` 做了一次完整采集（1440×900 / 390×844，读 `getComputedStyle` + 全量元素频次 + `document.fonts`，截 17 屏）。
`https://js.design/workspace` 需要登录，直接访问只渲染空壳（body 高 900、无文本），所以这份数据全部来自公开产品站首页。

它是 **wegic.ai 的反面**：那边是纯黑舞台 + 一件塑料制品，这边是冷灰蓝底板 + 一叠彩色纸卡。两份对照读，能看清「一页一处强调色」有两条完全不同的实现路径。

- **[`references/jsdesign-design.md`](references/jsdesign-design.md)** — 单站全量：令牌表（冷灰蓝 `#f3f7fb` / 唯一实色 `#009dff` 64 处 / 三色阶段 pill）、三套阴影的职责分工、
  字阶实测（52 / 44.564 / 40 / 37.05 / 32 / 30.797 / 24 / 19.5 / 15 / 14.846 / 13）、
  区块高度节奏（130px 单位）、组件尺寸（主按钮 97×42、输入+按钮组 414×54、三色彩卡 1100×480、对比卡 537），
  以及**七处它自己没做好的**。
- **[`references/design-evidence.md`](references/design-evidence.md)** — 作为 A 组第 11 个样本并入跨站统计：
  正文均值降到 **15.0**、H1 均值 **78.9**、浅色站变 **7/11**；并新增三类反例（13px 正文、H2/H3 倒挂、非整数尺寸）。
- **[`references/css-recipes.md`](references/css-recipes.md) 第 13 节** — 可粘贴代码：八色网格渐变（含白雾罩对比度）、负扩散阴影三件套、分屏功能卡、输入+按钮同容器、阶段 pill、对比列、毛玻璃头部。
- **[`SKILL.md`](SKILL.md)** — 参考文件节加了这份文档；跨站统计与「不要照搬」表补了 5 行硬约束。

### 三招值得直接搬

| 招式 | 一行做法 |
| --- | --- |
| **负扩散阴影替代边框** | `0 16px 16px -16px rgba(23,25,29,.2)` + `0 0 0 1px` 发丝环：阴影不外扩，卡片像贴住底板；大阴影 `0 50px 100px -20px` 只给浮起来的截图 |
| **输入与提交同容器** | 外框 `r15` 白底 + 内钮 `r8` 品牌色，`focus-within` 把焦点环画在外框上 → 两个控件变成「一件事」 |
| **颜色编码阶段** | 三列流程三色 pill（薄荷 `#83dde2` / 薰衣草 `#c0a3ff` / 珊瑚 `#f8857e`），颜色承载信息而不是装饰 |

### 也别学它这四处

13px 正文 266 处（中文可读临界）；满地非整数尺寸（22.2857 / 30.797 / 44.564，em 缩放的副产品，设计稿无法标注）；
H2 `19.5px` 比 H3 `44.564px` 小 2.3 倍（读屏大纲倒挂）；hero 文字双份叠加且没有 `aria-hidden`（动画未收敛时能看到残影）。

重新采集一次：

```bash
node scripts/probe-ref.mjs --url https://js.design/ --out .tmp/ref --name jsdesign --wait 5000
```

`probe-ref.mjs` 抓不到 `document.fonts.size = 0`（零网络字体）、非整数字号的来源（根字号 13px + em）、双份文字层——
补一段 `evaluate` 即可，具体步骤写在 `references/jsdesign-design.md` 第十节。

---

## 参考站蒸馏：UI 世界 uishijie

语料里**唯一的内容聚合站**（11 424 个作品、25 张/页、476 页）。它解决的是另一个问题：
**一屏要放几十个「同质但不相同」的东西时，怎么排才不乱。**

| 产出 | 位置 | 里面有什么 |
|------|------|-----------|
| 单站全量蒸馏 | `references/uishijie-design.md` | 完整令牌、四档字阶、图墙节奏、组件配方、七处没做好的 |
| 可直接抄的 CSS | `references/css-recipes.md` §14 | `.thumb-grid` / `.thumb` / `.filter-row` / `.pager`，含响应式两列 |
| 跨站统计 | `references/design-evidence.md` | 第 12 个 A 组样本，正文均值 14.9px、网格密度首次进表 |
| 验收与结构 | `SKILL.md`、`references/review-rubric.md` | 「内容列表 / 图墙」一节 + 2 条验收项 |

### 三招值得直接搬

| 招式 | 实测做法 | 为什么成立 |
|------|----------|-----------|
| **卡片不画壳** | 25 张图同屏，`background/border/radius/shadow` 全为 none，只有图 + 标题 + 两行副行 | 25 个壳 = 25 层阴影；分组靠图的边界。壳只留给「少而重要」的东西 |
| **零 gutter，padding 当间距** | `grid gap: 0`，卡片 `padding: 12px`，列宽 300 | 视觉间距 24px，但改密度只动一个变量；`gap` 一改就要重排列数 |
| **缩略图强制同比例** | 275×190（≈1.45）+ `object-fit: cover` | 用户上传来源再杂，墙也不会参差；设计稿预览类改 `contain` |

### 也别学它这几处

- **移动端零适配**：`meta viewport` 有，布局仍写死 1500px —— 390 宽下每卡 64px，还要横向滚。
- **容器 1500px**：在 1440 视口就溢出，搜索按钮被推出屏幕。
- **没有 `<h1>`**：唯一的 `<h2>` 里塞着 8 个分类导航，读屏无法按标题结构跳转。
- **次级文字 `#7f7f7f`**：12px 落在 3.9:1，同站另一个灰 `#5a5a5a` 却是 6.7:1 —— 随手取的两种灰。
- **hover 只给小字变色**：缩略图零反馈，用户看不出哪块能点。
- **float 排图墙**：能跑，但没有任何响应式与等高能力。

### 重采

```bash
node scripts/probe-ref.mjs --url http://www.uishijie.com/ui/ --out ./out --name uishijie
```

页面是服务端渲染的普通 HTML，没有登录墙，直接抓即可；`document.fonts.size === 0`（全系统字体栈），
`height: auto` 的缩略图与 float 布局要靠 `getBoundingClientRect` 量，具体步骤写在
`references/uishijie-design.md` 第十节。

## 参考站蒸馏：站酷 ZCOOL

`https://www.zcool.com.cn/discover/17`（UI 频道头版）。与 UI 世界同属「内容站」组，但走的是相反的一极：
**UI 世界是「密」——5 列、`gap: 0`、25 张/页；站酷是「疏」——4 列、列距 24、行距 36、8 张/屏。**
两个样本合起来才能说明：图墙的密度是**选择**，不是唯一解。

它真正值得学的是**版面纪律**：全站只有 4 档字号（14 / 12 / 16 / 40）、两级分类靠形状分层、
卡片一律不画壳、所有发丝都是 `0.8px`。

| 产出 | 位置 | 里面有什么 |
|------|------|-----------|
| 单站全量蒸馏 | `references/zcool-design.md` | 完整令牌、四档字阶、版式节奏表、组件配方、七处没做好的 |
| 可直接抄的 CSS | `references/css-recipes.md` §15 | `.site-topbar` / `.cat-tabs` / `.cat-pills` / `.feed-grid` / `.feed-card` / `.pager-square`，含响应式三列与两列 |
| 跨站统计 | `references/design-evidence.md` | 第 13 个 A 组样本；网格密度「疏密两派」、`0.8px` 发丝、顶栏 sticky 三条新证据 |
| 验收与结构 | `SKILL.md`、`references/review-rubric.md` | 图墙节补「等宽不做瀑布」「两级分类靠形状」「顶栏 sticky」+ 4 条验收项 |

### 三招值得直接搬

| 招式 | 实测做法 | 为什么成立 |
|------|----------|-----------|
| **两级分类用形状分层** | 一级 56px 文字 tab（选中 28×3px 短下划线），二级 31px 胶囊 r16 | 两排并列时靠高度与轮廓一眼分出父子级；靠颜色深浅区分在色弱用户那里直接失效 |
| **等宽网格 + 三个数字定版** | 卡片 283×264 = 图 283×212（4:3）+ 标题 19px + 作者 20px，列距 24、行距 36 | 三个数字定死，整页节奏自然出现；标题只给一行，换行就整版歪 |
| **胶囊用 16 不用 999** | 子分类胶囊 `border-radius: 16px` | 内容社区要一点硬度；999 会变成气泡感，和「作品」的气质冲突 |

### 也别学它这几处

- **移动端零适配**：390 宽下 `scrollWidth` 仍是 1200，卡片 283 宽横向铺开（和 UI 世界一处不差）。
- **顶栏不 `sticky`**：56px 静态顶栏，滚两屏后分类、排序、搜索全丢，只能滚回顶部。
- **hover 太弱**：只把 `image-mask` 从 `height: 0` 展开，图本身不缩放 —— 用户判断不了能不能点。
- **标题截断不给 `title`**：单行 ellipsis 后信息不可恢复，站酷和 UI 世界都漏了这条。
- **`0.8px` 当固定发丝**：DPR1 或小数缩放下会发虚，统一 `1px` + ≤8% 黑更稳。
- **次级灰随手取**：`#888`（3.54:1）、`#999`（2.85:1）都不合格，用 `#6b6b6b`（4.9:1）。
- **banner 与容器错位**：banner 宽 1265、容器 1205，左右各差 30 —— 通栏图和内容区对齐要单独确认。

### 重采

```bash
node scripts/probe-ref.mjs --url https://www.zcool.com.cn/discover/17 --out ./out --name zcool --wait 6000
```

**这个站 headless 一定被阿里云 WAF 拦成「滑动验证页面」**，必须 `headless: false` 的真实浏览器
（挪到屏幕外 `--window-position=-2400,-2400` 也行），并在截图前移除 `#waf_nc_block` 浮层，
完整步骤写在 `references/zcool-design.md` 第十节。

## 交付验收清单

完整版见 [`references/review-rubric.md`](references/review-rubric.md)（九节，含红旗清单）。摘要：

- [ ] 三视口（1440 / 768 / 390）都无横向滚动
- [ ] 字号只用字阶值，圆角成套，留白成体系
- [ ] 每个数据区都有 加载 / 空 / 错 / 无权限 四态
- [ ] 长文案、超长单词、100 行满数据都试过
- [ ] `audit.mjs` 退出码 0，残留 warn 每条都有解释
- [ ] 深色主题单独跑过截图与审计
- [ ] `contrast_check.py` 无未达标（正文 ≥ 4.5:1，大字/图标 ≥ 3:1）
- [ ] `run_checks.mjs` 全绿：lint / typecheck / test / build
- [ ] `hygiene.mjs` 待确认项逐条看过并记录取舍
- [ ] Tab 键走查到底，焦点顺序正确、焦点态可见
- [ ] 弹窗：焦点移入、Esc 关闭、关闭后焦点回到触发元素
- [ ] 图标按钮有 `aria-label`，表单控件有关联 label，图片有 `alt`
- [ ] 390px 主操作在下 1/3，点击区 ≥ 44×44
- [ ] Logo 比例正确、深色可见、favicon 正常
- [ ] before / after 截图都留了，能指给评审看
- [ ] 交付说明四段齐全，关键改善有量化

**红旗（出现就别交付）**：只做浅色 / 只做 1440 / 只做 happy path；审计非 0 却说"基本没问题"；删组件没核实引用；用 `outline: none` 换"更干净"；深色是反色得来的没校验对比度；只有一张手动截图；构建本来就红却当理由。

---

## CI 集成

`audit.mjs`、`contrast_check.py`、`hygiene.mjs`、`run_checks.mjs` 都用退出码表达结论，可以直接当门禁。

### GitHub Actions

```yaml
name: ui-audit
on: [pull_request]
jobs:
  audit:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20 }
      - run: npm ci && npm i -D playwright && npx playwright install --with-deps chromium
      - name: 启动预览服务
        run: npm run build && npm run preview &
      - name: 等端口就绪
        run: npx wait-on http://localhost:4173
      - name: 结构 + WCAG 审计
        run: node tools/design/audit.mjs --url http://localhost:4173/ --themes light,dark --out audit-report.json
      - name: 对比度
        run: python tools/design/contrast_check.py src/styles/*.css
      - name: 项目质量门
        run: node tools/design/run_checks.mjs
      - uses: actions/upload-artifact@v4
        if: always()
        with:
          name: ui-audit
          path: |
            audit-report.json
            .design/
```

### Gitee Go

```yaml
name: ui-audit
trigger:
  push:
    branches: [master]
stages:
  - stage: audit
    jobs:
      - job: ui-audit
        steps:
          - step: runShell
            script: |
              npm ci
              npm i -D playwright && npx playwright install --with-deps chromium
              npm run build
              node tools/design/audit.mjs --url http://localhost:4173/ --themes light,dark
              python tools/design/contrast_check.py src/styles/*.css
```

> 有登录墙的页面，在 CI 里用 `auth.mjs` 导出的 `auth.json` 做 secret 是不行的（存在有效期与安全风险）。更稳的做法：给 CI 环境一个专用测试账号，用脚本直接登录拿 storageState，或对需要登录的页面只跑结构检查（`--no-axe` 不解决登录，需要页面本身可达）。

---

## 常见问题

**截图里图片是空白** —— 懒加载没触发。`screenshot.mjs` 会先滚动到底再截；如果还是空白，说明图片由脚本异步渲染，加大 `--wait`。

**审计全绿但页面明显不对** —— 脚本只查机器可判定的东西。视觉问题（层级乱、配色脏、字重跳、留白不平衡）必须自己对图看。审计是下限，不是质量本身。

**axe 报了几十条对比度** —— 先跑 `contrast_check.py` 定位设计令牌，通常改 2–3 个变量就能消掉大半；再处理组件里写死的颜色。

**深色主题截图是全白的** —— 站点没有实现深色。`--themes dark` 会同时打 `.dark` / `data-theme="dark"` / `prefers-color-scheme` 三种约定，三种都没有就是真的没做；先确认站点有主题切换，否则不要假装支持深色。

**审计报 `h-overflow` 但截图看不出** —— 溢出元素可能在视口下方或由 `position: fixed` 造成。报告里有溢出像素数，配合 `--viewports mobile` 一起看，窄屏最容易暴露。

**Playwright 提示缺浏览器** —— `npx playwright install chromium`（只装 chromium 就够）。

**端口 / 自签 HTTPS** —— `screenshot.mjs` 与 `audit.mjs` 使用 `ignoreHTTPSErrors: true`，本地自签证书可以直接跑。

**`--storage-state auth.json` 之后还是登录页** —— 登录态过期，重跑 `auth.mjs` 并加 `--force`。加 `--expect-text` 能让这种情况直接报错，而不是静默出一堆登录页截图。

**`audit.mjs` 的 warn 要不要清** —— error 必须清（用户真的用不了）；warn 要"逐条有结论"：修掉，或在交付说明里写清为什么保留（例如装饰性图标点击区只有 28px，但旁边有等价的大按钮）。

**报告里的 `layout-shift` 只提示不拦** —— CLS 阈值 0.1 是经验值，图片/字体加载不稳定时抖动常见；先固定尺寸与 `aspect-ratio`，再复查。

**能在 CI 里跑吗** —— 能，四个脚本都用退出码表达结论，见上面的 CI 集成。

**生成出来的页面文案全是 `{{TODO}}`** —— 故意的。骨架保证结构与状态正确，内容必须你来（见 `references/copy-and-content.md`）。交付前跑 `grep -rn "{{TODO" src/`，要么清零，要么逐条列进交付说明。

**`scaffold.mjs` 生成的东西能直接用吗** —— 当骨架用，当成品用会露怯：它没有品牌个性、没有真实数据、没有业务状态。改令牌（品牌色相/密度/圆角）比改样式省事得多。

**`scaffold.mjs` 需要 playwright 吗** —— 不需要，纯 node 零依赖。只有截图与审计脚本需要。

**Windows 下路径怎么写** —— 脚本内部用 `path` 处理，命令行里写 `E:/proj/src` 或 `E:\\proj\\src` 都行；含空格的路径要加引号。

**为什么不直接跑 Lighthouse** —— Lighthouse 是页面性能/SEO 报告，视角是"浏览器怎么评价这个页面"；这里要的是"这次改动有没有把界面做坏"：横向溢出、Logo 拉伸、点击区、文本裁切、对比度令牌、无引用资源，这些它不管。两者互补，不冲突。

---

## 设计取舍

- **为什么脚本不装成 npm 包**：目标是"拷进任何项目都能跑"。零构建、单文件 ESM、`node xxx.mjs` 即用，避免版本冲突与 `pnpm` 兼容问题。
- **为什么 axe 内置而不是 peer dependency**：WCAG 检查必须离线可跑，且规则版本要稳定——技能里存 4.14.0 比"用户装了哪个版本"可复现。
- **为什么不做像素级视觉回归**：像素比对的维护成本极高（字体渲染、动效、时间、数据都在变），假阳性会让人放弃跑它。这里用"结构 + 语义 + 数值"三层的检查替代。
- **为什么 audit 只跑 WCAG 2.1 A/AA**：AA 是多数团队的合规底线；加上 best-practice 会刷出几百条与本次改动无关的告警，反而稀释信号。
- **为什么 hygiene 不给"删除建议"**：正则无法可靠判断动态引用，误删比残留危险得多，所以只输出"待确认"。
- **为什么所有脚本都用退出码表达结论**：这样能无条件接进任何 CI，不需要解析日志。

---

## 许可与第三方

MIT，见 [`LICENSE`](LICENSE)。版本变更与发版说明见 [`CHANGELOG.md`](CHANGELOG.md)。

第三方例外：`scripts/vendor/axe.min.js` 是 [axe-core](https://github.com/dequelabs/axe-core) 4.14.0，按 **MPL-2.0** 分发，文件头的许可声明不要删。除此之外所有内容为原创。

---

## 贡献与反馈

- 提 Issue 请附：命令、Node/Python 版本、`audit-report.json` 里的相关条目、能复现的最小页面。
- 改脚本请保持：**零构建、单文件、退出码可判定、不引入新依赖**。
- 新增检查项请先问一句："这条能不能机器判定？" 不能判定的，写进 `references/review-rubric.md` 而不是硬塞进脚本。
