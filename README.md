# frontend-fidelity · 前端保真度

> 把界面做对、做实，两条路都走：**已有界面**——按设计稿/截图还原，或把现存页面整改到位（后台管理端、移动 H5/小程序、多端一致性、Logo 与品牌资产）；**还没有界面**——从 0 生成一套能验收的骨架（令牌 + 组件 + 六类页面），再往上填真内容与业务状态。
> 参考库是 **25 个真实站的实测数据 + 十四份单站蒸馏**（营销 / 工具站 / SaaS 首页 / 编辑内容首页 / 技术社区 feed / 品牌产品舞台 / 密版图墙 / 疏版图墙 / 陈列页 / 灵感库 / 风格库 / 杂志目录 / B 端工具工作区 / 动效），外加**两份外部规则集蒸馏**（工艺底线 / 反模板清单）；按页面类型对到具体文件，见 [该抄哪份参考](#该抄哪份参考)。
> **计数口径**：25 个实测站 = **A 组 22**（14 营销/产品 + 8 内容陈列）+ **B 组 3 后台工具站**。跨站统计的均值/带宽冻结在原来的 18 站基线（A 组）上——2026-10-27 新增的 4 个中文站只入站数与单站条目，不重算中位数；所以文档里出现「18 站基线」不等于总数，总数永远是 25 / A 组 22——这是本项目最容易漂的一处，`selfcheck.mjs` 会盯。
> 搜这些词应该能到这：设计稿转代码、照着截图还原、UI 还原、前端验收、截图对比、后台美化、移动端适配、设计令牌、Claude Code 技能（skill）。
> 目标不是"改好看"，而是**让界面和它声称的样子一致，并且真的能用——改完能拿出证据**。

`v1.15.5` · [最新发行版](https://gitee.com/liu-everything_impossble/skill-frontend-fidelity/releases/latest) · `MIT` · `Node.js ≥ 18` · `Python ≥ 3.9（仅裁图/对比度）` · `WCAG 检查离线可跑` · `13 个可执行脚本（10 个 Node + 3 个 Python）`

---

## 30 秒安装

技能就是一个 `SKILL.md` 加一堆参考文件——**Claude Code 和 DSH 都直接认这个格式**，装到对应目录就能用。

**Windows（PowerShell）**

```powershell
iex ((irm https://gitee.com/liu-everything_impossble/skill-frontend-fidelity/raw/master/install.ps1).TrimStart([char]0xFEFF))
```

> 那个 `.TrimStart([char]0xFEFF)` 不是装饰：脚本带 UTF-8 BOM（PowerShell 5.1 读无 BOM 的 UTF-8 会按 ANSI 解析，中文注释直接语法报错），而 `irm | iex` 拿到的字符串里 BOM 会变成一个不可见字符顶在 `<#` 前面，导致 `[CmdletBinding()]` 被判「意外属性」。嫌长就用下面这种：下载到本地再跑，文件保留 BOM，一切正常。
>
> ```powershell
> irm https://gitee.com/liu-everything_impossble/skill-frontend-fidelity/raw/master/install.ps1 -OutFile $env:TEMP\ff.ps1; & $env:TEMP\ff.ps1
> ```

**macOS / Linux（含 Git Bash）**

```bash
curl -fsSL https://gitee.com/liu-everything_impossble/skill-frontend-fidelity/raw/master/install.sh | bash
```

默认同时装到 `~/.claude/skills/frontend-fidelity` 与 `~/.dsh/skills/frontend-fidelity`，已有的同名目录会被替换。想只装一边或换位置：

```bash
bash install.sh --target claude          # 只装 Claude Code
bash install.sh --target dsh             # 只装 DSH
bash install.sh --dir ~/my-skills        # 装到自定义目录
bash install.sh --ref v1.15.5            # 锁定某个版本
bash install.sh --dry-run                # 只看会装到哪，不动文件
```

**手动装也就三行**

```bash
git clone --depth 1 https://gitee.com/liu-everything_impossble/skill-frontend-fidelity.git \
  ~/.claude/skills/frontend-fidelity
```

装完新开一个会话（旧会话不会重新加载技能），然后在项目里直接说「照这张截图还原这个页面」「后台太难看了，统一一下」，或说「验收一下前端改动」。

## 它到底量大到什么程度

25 个真实站（A 组 22 + 3 后台工具站）在浏览器里逐元素量出来的，不是猜的：

| 量的是什么 | 结果 |
| --- | --- |
| 正文字号 | 均值 **14.7px**（跨站 10–20px），行高比均值 **1.42** |
| 主标题字号 | 均值 **69.8px**（36–140px），H1/正文比 **2.3–8.8 倍** |
| 圆角 | 六种做法并存：单主力档 / 双轨 / 直角派 / 线性阶梯 / 七档无递进（反例） |
| 阴影 | 五派：靠边框 / 发丝圈+内阴影 / 负扩散 / 全站零阴影 / 零阴影零边框 |
| 动效 | 中位数 **1 个**——最克制的几站反而最显专业 |
| 网格 | 三派图墙：密（5 列 gap 0）／疏（4 列列距 24）／活预览墙（3 列 gap 32） |

全部原始数值、样本清单和失败样本在 [`references/design-evidence.md`](references/design-evidence.md)。

## 能力评级与国内定位

**先说口径**：这是自评，不是第三方认证。每条结论都指向仓库里能跑出来的数字或能打开的文件，标准写在表里——不同意可以按同一张表复核。

### 评级：A

| 维度 | 现状 | 怎么核对 |
| --- | --- | --- |
| 可执行验收 | **13 个脚本**（10 Node + 3 Python）6,318 行，全部用退出码表达结论 | `ls scripts/*.mjs scripts/*.py`、`wc -l scripts/*` |
| 参考数据 | 25 个真实站的浏览器实测 + 14 份单站蒸馏，`references/` 共 26 份 8,332 行 | `wc -l references/*.md` |
| 自检闭环 | **八步**：参数语义 / 语法 / 生成 / 565 组对比度 / 60 组审计 / 流程冒烟 / 文档数字 / 版本一致性 | `npm run selfcheck` |
| 文档可操作性 | 入口 125 行 + 参考 26 份 + 手册 3 份（1,178 行），每个脚本都有参数 / 退出码 / 产物 | `SKILL.md`、`docs/scripts.md` |
| 边界诚实度 | 明写不做什么（测试框架 / Figma / 小程序原生 / 默认视觉回归门禁），红旗清单 8 条 | 本文「适用与不适用」、`review-rubric.md` |

没给 A+ 的两个理由，都写在明面上：

1. **没有移动端页面模板**——`scaffold` 的六类页面全是桌面形态，底部 tab / 安全区 / sheet 生成不出来。移动端的实测数据其实有（`design-evidence.md` 里记了 390 单列、gap 12、底部 tab 4 项），但没落到生成器里。
2. **电商结算、多步表单没有参考依据**——`auth.html` / `form.html` 有页面骨架，没有对应的实测数值支撑。

### 国内定位：第一梯队（不宣称名次）

没有权威榜单可依据，所以这里**不写「国内第 N」**——任何具体名次都无法核实，写进 README 就是假数据。

能给的是可核对的量级：公开可见的 Agent skill 绝大多数是「一份 `SKILL.md` + 若干 markdown」，自带 3 个以上可执行脚本的都少见。本项目是 13 个脚本 6,318 行 + 26 份参考 8,332 行 + 八步自检，按这个量级，在国内公开的前端 / UI 类 skill 里属于第一梯队。

真正少见的是三件事同时成立：

- **能生成**：`scaffold` 五套人格 × 六类页面 × 深色令牌，可出 React / Vue；
- **能验收**：截图 / WCAG 审计 / 对比度 / 交互流程 / 像素比对，五项都有可执行脚本和明确退出码；
- **有基准**：所有数值能回溯到 25 个站的浏览器实测，不是「感觉这样好看」。

限定条件：这个判断基于公开 skill 的常见形态，不是穷举统计；样本范围一变，结论也会变。

## 该抄哪份参考

先看这张表：**按你手上的页面类型选一份，别从头读二十六份。**

| 你在做什么 | 抄这份 | 从这里拿走什么 |
| --- | --- | --- |
| 营销 / 产品落地页：黑底大字、按钮要有"实体感" | [`references/wegic-design.md`](references/wegic-design.md) + [css-recipes §12](references/css-recipes.md) | 纯黑舞台分三段、按钮 6 层内阴影做厚度、逐字入场、Damion 手写批注 |
| 工具站 / SaaS 首页：浅色、彩色卡片、截图要"浮"起来 | [`references/jsdesign-design.md`](references/jsdesign-design.md) + [css-recipes §13](references/css-recipes.md) | 冷灰蓝底 `#f3f7fb`、负扩散 + 发丝环三件套阴影、八色渐变 hero、分屏卡 |
| 作品墙 / 内容列表：要"密"，一屏塞满 | [`references/uishijie-design.md`](references/uishijie-design.md) + [css-recipes §14](references/css-recipes.md) | 5 列 grid 零 gutter、`aspect-ratio` 强制同比例、卡片不画壳、文字 tab 筛 8+ 分类 |
| 作品墙 / 内容列表：要"疏"，有报头、有定版 | [`references/zcool-design.md`](references/zcool-design.md) + [css-recipes §15](references/css-recipes.md) | 4 列列距 24 行距 36、两级分类用形状区分、`0.8px` 发丝、直角分页、顶栏 sticky |
| 目录 / 陈列页：一屏陈列一批**彼此不同**的东西 | [`references/stylekit-design.md`](references/stylekit-design.md) + [css-recipes §16](references/css-recipes.md) | 卡片即预览（真 CSS 不是截图）、6px 四段色板条、通体直角、hover 只两笔 |
| 灵感库 / 截图站：素材本身就是成品，界面要隐形 | [`references/uinotes-design.md`](references/uinotes-design.md) + [css-recipes §17](references/css-recipes.md) | 不画壳的截图墙、裁切露 1.8 张、48px 数字当标题、2/4/6/16/20/24 线性圆角阶梯 |
| 后台 / 管理端：列表、表单、详情、空态、权限墙 | [`references/page-patterns.md`](references/page-patterns.md) + [`component-spec.md`](references/component-spec.md) + [`design-tokens.md`](references/design-tokens.md) | 八类页面骨架 + 11 类组件规格 + 五套人格令牌；单站样本没有后台，横向数据看 `design-evidence.md` B 组 |

动效是另一条横切：动手加任何动画前读 [`references/motion-spec.md`](references/motion-spec.md)（四条底线、时长五档、四条缓动、编排、三档降级、自测四步），可粘贴片段在 [css-recipes §18](references/css-recipes.md)。想让一批卡片"被指针点亮"，直接抄 [`references/holynova-motion.md`](references/holynova-motion.md) + [css-recipes §19](references/css-recipes.md)（聚光描边 + hover 四件套，实测单站）。

另有两份**不分页面类型、每次都要过**的：流程走到一半看 [`references/anti-slop.md`](references/anti-slop.md)（三档旋钮、hero 四条、三把锁、8 组 AI tell、34 条 pre-flight），最后一道手感看 [`references/craft-floor.md`](references/craft-floor.md)（九条 verify、深度三选一、浏览器原生表面、与本站语料的四条冲突裁决）。

十四份单站蒸馏共用一套结构（10–12 节）：气质 → 令牌 → 字阶 → 版式节奏 → 组件配方 → 它自己没做好的 → 能搬/不能搬 → 复现清单 → 与其他文件的关系 → 重采方法；StyleKit 多一节「详情页第二套版式」，四份中文站把「实测事实 / 设计手法 / 反面样本」拆得更细。要抄就抄「令牌 + 版式 + 组件」三节，反面那节用来避免抄到毛病。

两条读法上的提醒：

1. **别把"他们的取舍"当规范。** 八份中文内容站（即时设计 / UI 世界 / 站酷 / UI Notes / 少数派 / 语雀 / 掘金 / 苹果）多数用系统字体栈、正文 13–16px——那是它们要在一屏里塞更多东西的代价，不是推荐值。跨站统计的均值（正文 14.8px、H1 72.6px）在 [`design-evidence.md`](references/design-evidence.md)。
2. **单站样本只证明"可以这么做"，不证明"必须这么做"。** 想要判断某个数值是不是行业常态，去 `design-evidence.md` 看 22 个 A 组站里出现了几次；只在单站出现一次的，一律当作那一家的个性。

## 目录

- [30 秒安装](#30-秒安装)
- [它到底量大到什么程度](#它到底量大到什么程度)
- [能力评级与国内定位](#能力评级与国内定位)
- [该抄哪份参考](#该抄哪份参考)
- [这是什么](#这是什么)
- [适用与不适用](#适用与不适用)
- [与 SKILL.md、frontend-design 的分工](#与-skillmdfrontend-design-的分工)
- [快速开始](#快速开始)
- [安装](#安装)
- [仓库结构](#仓库结构)
- [五步工作流（模式 A：整改与还原）](#五步工作流模式-a整改与还原)
- [从 0 生成（模式 B）](#从-0-生成模式-b)
- [像素级还原验收](#像素级还原验收)
- [交互流程验收](#交互流程验收)
- [脚本手册](#脚本手册)
- [参考站蒸馏](#参考站蒸馏)
- [交付验收清单](#交付验收清单)
- [CI 集成](#ci-集成)
- [常见问题](#常见问题)
- [设计取舍](#设计取舍)
- [许可与第三方](#许可与第三方)
- [贡献与反馈](#贡献与反馈)

---

## 这是什么

一个**把前端做对**的技能包，两条路都走：**先把已有界面整改/还原到位**，**也能从 0 生成一套能验收的骨架**。内含一份给 agent 读的操作手册（`SKILL.md`）+ 二十六份参考数据（14 份单站蒸馏 + 8 份通用规格 + 1 份跨站实测 + 2 份外部规则集 + 1 份工作流，`references/`）+ 十个能直接跑的脚本（`scripts/`）。

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
| 从 0 生成后台 / 落地页骨架 | ✅ | `scaffold.mjs` 一次生成令牌 + 组件 + 六类页面，再往里填真内容 |
| 纯逻辑 bug、接口联调 | ❌ | 没有视觉面，用测试和日志，不在这里 |
| 大规模重构 / 换技术栈 | ❌ | 这是改造工具，不是迁移工具 |
| 品牌视觉从零创作 / 海报插画 | ❌ | 那属于 `frontend-design` / `canvas-design`：要原创视觉方向，不是"做对现有的" |

判据：**已有界面要整改/还原** → 走模式 A（截图、量、改、验收）；**还没有界面，但要一个能用的骨架** → 走模式 B（选型、生成、填内容、验收）。**要一份原创视觉提案** → 那才轮到 `frontend-design`。

---

## 与 SKILL.md、frontend-design 的分工

| 文件 / 技能 | 给谁看 | 内容 |
| --- | --- | --- |
| `SKILL.md` | agent（模型） | 入口：三条铁律 + 30 秒起步 + 两种模式路由 + 预设路由表 + 视觉基线四件事 + 质量门（113 行，工作流与细则已下沉） |
| `references/workflow.md` | agent（模型） | 模式 A 五步 / 模式 B 六步完整流程、交付说明模板、脚本一览、参考库完整索引（从 SKILL.md 下沉） |
| `references/visual-system.md` | 双方 | 视觉与结构细则完整版（从 SKILL.md 下沉）：中文排版、色彩、间距、阴影五派、动效、页面结构、控件 8 状态、响应式、深色、可访问性、反模式清单 |
| `README.md`（本文件） | 人 | 项目介绍、安装、工作流、索引（脚本参数见 `docs/scripts.md`） |
| `references/design-evidence.md` | 双方 | 25 个实测站点（22 A 组：14 营销/产品 + 8 内容陈列站；另 3 后台）的字体/间距/圆角/密度数值；跨站中位数仍为 18 站基线 |
| `references/wegic-design.md` | 双方 | wegic.ai 单站全量蒸馏：完整令牌、塑料按钮、字阶节奏、迁移口径 |
| `references/jsdesign-design.md` | 双方 | 即时设计 js.design 单站全量蒸馏：冷灰蓝底 + 负扩散阴影、130px 节奏、零 webfont、七处反例 |
| `references/uishijie-design.md` | 双方 | UI 世界（内容聚合站）单站全量蒸馏：零 gutter 图墙、卡片不画壳、四档字号、七处反例 |
| `references/zcool-design.md` | 双方 | 站酷（内容社区频道页）单站全量蒸馏：疏版图墙、两级分类靠形状分层、`0.8px` 发丝、直角分页、七处反例 |
| `references/stylekit-design.md` | 双方 | StyleKit（风格目录站）单站全量蒸馏：卡片即预览（活渲染、非截图）、6px 四段色板条、直角陈列区、衬线+无衬线+等宽三件套、两条 hover、详情页第二套版式、七处反例 |
| `references/uinotes-design.md` | 双方 | UI Notes（真实 UI 截图灵感库）单站全量蒸馏：隐形界面（0 壳 0 边 0 阴影）、240×520 截图带裁切露 1.8 张、48px 数字当标题、2/4/6/16/20/24 线性圆角阶梯、全站 `line-height: normal`、七处反例 |
| `references/sspai-design.md` | 双方 | 少数派（科技媒体编辑首页）单站全量蒸馏：960 版心 `224+480+224`、卡无壳 520×189 feed、按部件分圆角（24/12/8/6）、767 断点切移动、84 图 0 lazy 等七处反例 |
| `references/yuque-design.md` | 双方 | 语雀（SaaS 知识工具首页）单站全量蒸馏：内部滚动容器 `820/10171` 的长首页、100px Hero + 60px 区块标题、绿 `#00b96b` / 蓝 `#166eff` 双场景、黑段下载区、fadeInUp 1000ms、七处反例 |
| `references/juejin-design.md` | 双方 | 掘金（技术社区 feed）单站全量蒸馏：1200 三栏 `180+720+260`、99px feed 条目（110×74 缩略图）、`#f2f3f5` 底 + 白卡、灰字 3.17:1 等七处反例 |
| `references/apple-design.md` | 双方 | 苹果中国（品牌产品舞台）单站全量蒸馏：692/580 舞台 + 12px 页沟 + 1024 导航层、56px 可见产品名（首个 h1 是 visuallyhidden）、逐舞台明暗编排、CTA pill 44/36、七处别照抄 |
| `references/motion-spec.md` | 双方 | 动效规格：时长五档与四条缓动、位移允许量、编排、滚动驱动、六类交互配方、三档降级、性能预算、自测四步、动效 AI tell |
| `references/holynova-motion.md` | 双方 | 单站动效蒸馏（案例）：23 条 transition / 3 个 keyframes / 1 条主缓动、实测 9 档时长（归并 6 档）、聚光描边卡（mask 抠 1px 环）、hover 四件套与按下回落、批量入场、reduced-motion 连装饰层关、七处别照抄 |
| `references/luckymaomi-catalog.md` | 双方 | 单站全量：印刷品外壳（方格纸 / 墨黑框 / 硬阴影 / 元数据黑条）+ 三层展示体系（目录→规格页→showcase）+ 动效库 10 域 57 条的元数据与重放；含 100ms linear 的适用条件与七处反面 |
| `references/muzli-gallery.md` | 双方 | 单站全量：左栏 sticky 目录 + 3 列图版（348×309）+ 衬线刊头（Instrument Serif 48/1.0）+ 电光蓝 #2e54ff + 无壳卡片 + 35px tag 药丸 + 页脚主色 10% 面板；含「零 hover」这处反面 |
| `references/mastergo-b2b.md` | 双方 | 单站全量（B 端工具界面样板）：三栏工作区 300/画布/300 + 顶栏 56、属性面板分组标题 12/600 + 键值行 12 等宽 + 只有数值上色、代码面板语法色、盒子模型图；另含 24 张社区资源卡统计（B 端整页 98.2k 使用 > 大厂组件库 46.7k） |
| `references/craft-floor.md` | 双方 | 工艺底线：九条 verify、深度三选一、四件浏览器原生表面、表面禁令、与本站语料的四条冲突裁决（来源：impeccable `craft-floor`，Apache-2.0） |
| `references/anti-slop.md` | agent | 反模板：Design Read、三档旋钮与三套人格对照、hero 四条硬规则、三把锁、8 组 AI tell、中文站条款、34 条 pre-flight（来源：design-taste-frontend，规则重写） |
| `references/page-patterns.md` | agent | 选型表 + 七类页面骨架 + 空/错/无权限三变体 + 内容最低量 |
| `references/component-spec.md` | agent | 11 类组件规格与禁忌（三档密度、尺寸、对齐、状态） |
| `references/design-tokens.md` | agent | 五套人格预设（含印刷 / 杂志）、深度语言三派、色阶生成数学、字阶、圆角阴影配对、暗色推导 |
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
  --persona rational --out src --pages landing,app,form,auth,states   # 深色令牌默认生成，要关用 --no-dark
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
当前是 [v1.15.5](https://gitee.com/liu-everything_impossble/skill-frontend-fidelity/releases/latest)。

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
├── SKILL.md                      # agent 操作手册：铁律 + 30 秒起步 + 模式路由 + 预设路由表 + 质量门（流程细节下沉 references/workflow.md）
├── README.md                     # 本文件：安装、工作流、索引（脚本与参考站速查见 docs/）
├── LICENSE                       # MIT
├── CHANGELOG.md                  # 版本变更与发版说明
├── docs/
│   ├── scripts.md                # 脚本手册：参数、示例、退出码、产物
│   ├── visual-summary.md         # 视觉细则常用速查
│   └── reference-sites.md        # 参考站蒸馏：招与反面逐站展开
├── references/
│   ├── workflow.md              # 模式 A 五步 / 模式 B 六步完整流程 + 交付模板 + 脚本一览 + 参考库索引（从 SKILL.md 下沉）
│   ├── design-evidence.md        # 25 个实测站点（22 A 组 + 3 后台）：字体、字阶、行高、间距、圆角、密度
│   ├── wegic-design.md           # wegic.ai 单站全量蒸馏：完整令牌 + 塑料按钮 + 迁移口径
│   ├── jsdesign-design.md        # 即时设计 js.design 单站全量蒸馏：冷灰蓝底 + 负扩散阴影 + 七处反例
│   ├── uishijie-design.md        # UI 世界（内容聚合站）：零 gutter 图墙 + 卡片不画壳 + 七处反例
│   ├── zcool-design.md           # 站酷（内容社区频道页）：疏版图墙 + 两级分类靠形状 + 七处反例
│   ├── stylekit-design.md        # StyleKit（风格目录站）：卡片即预览 + 6px 四段色板 + 直角陈列区 + 七处反例
│   ├── uinotes-design.md        # UI Notes（截图灵感库）：隐形界面 + 240×520 截图带裁切 + 数字当标题 + 七处反例
│   ├── sspai-design.md          # 少数派（科技媒体编辑首页）：960 版心 224+480+224 + 卡无壳 feed + 按部件分圆角
│   ├── yuque-design.md          # 语雀（SaaS 知识工具首页）：内部滚动容器 10171 + 100px Hero + 绿/蓝双场景 + 黑段
│   ├── juejin-design.md         # 掘金（技术社区 feed）：1200 三栏 180+720+260 + 99px 条目 + 灰字密度
│   ├── apple-design.md          # 苹果中国（品牌产品舞台）：692/580 舞台 + 12px 页沟 + 逐舞台明暗 + CTA pill
│   ├── page-patterns.md          # 从 0 生成：选型表 + 七类页面骨架 + 三变体 + 内容最低量
│   ├── component-spec.md         # 11 类组件规格：三档密度、尺寸、对齐、禁忌
│   ├── design-tokens.md          # 五套人格预设、深度三派、色阶生成算法、字阶、圆角阴影配对、暗色推导
│   ├── copy-and-content.md       # 文案规格：标题公式、按钮动词、空/错/载公式、占位写法
│   ├── css-recipes.md            # 设计令牌 / 表格 / 骨架屏 / 空态 / 深色 / 九个站的风味片段（第 12–22 节）
│   ├── motion-spec.md            # 动效规格：四条底线 + 时长五档 + 四条缓动 + 编排 + 三档降级 + 自测
│   ├── holynova-motion.md       # 单站动效案例：23 条 transition + 3 个 keyframes + 聚光描边卡 + hover 四件套
│   ├── luckymaomi-catalog.md   # 印刷品外壳：方格纸底 + 墨黑框 + 硬阴影 + 元数据黑条 + 三层展示体系
│   ├── muzli-gallery.md        # 杂志目录式陈列：左栏目录 + 3 列图版 + 衬线刊头 + 电光蓝 + 零 hover（反面）
│   ├── mastergo-b2b.md         # B 端工具界面：三栏 300/画布/300 + 属性面板字段语言 + 代码面板 + 整页>组件清单
│   ├── craft-floor.md            # 工艺底线：九条 verify + 深度三选一 + 原生表面 + 四条冲突裁决
│   ├── anti-slop.md              # 反模板：三档旋钮 + hero 四条 + 三把锁 + 8 组 AI tell + 34 条 pre-flight
│   ├── visual-system.md         # 视觉与结构细则完整版（从 SKILL.md 下沉的 15 节）
│   └── review-rubric.md          # 交付前十节验收清单（含红旗清单）
├── package.json                  # 只声明 devDependency playwright 与 npm run selfcheck
├── .github/workflows/           # CI：语法 + 生成 + 对比度（装了浏览器时再跑 60 组审计）
└── scripts/
    ├── scaffold.mjs              # 从 0 生成骨架：五套人格 + 深度三派 + 六类页面 + 生成期对比度自检 + --ref-url / --ref-json 量站或复用实测覆盖人格 + --verify 生成即验收（pass/fail/partial 三态退出码）+ --export 多体系令牌
    ├── screenshot.mjs            # 多视口 × 多主题全页截图
    ├── audit.mjs                 # 结构 + axe WCAG 2.1 A/AA + CLS + 动效
    ├── flow.mjs                  # 交互流程验收：声明式 JSON（goto/click/fill/断言），逐步结果 + 失败现场截图
    ├── fidelity.mjs              # 像素级还原验收：设计稿 vs 实现（自动截图 + 差异热力 + 三联图）
    ├── pixel_diff.py             # 上面的比对引擎（Pillow + numpy，可单独用）
    ├── auth.mjs                  # 有头浏览器人工登录，导出 auth.json
    ├── contrast_check.py         # 对比度审计，支持 oklch / color-mix / Tailwind v4
    ├── crop_logo.py              # 品牌图裁边、方形化、导出尺寸
    ├── hygiene.mjs               # 无引用组件/资源/样式、重复路由、超大资源
    ├── run_checks.mjs            # 跑项目自带的 lint/typecheck/test/build
    ├── probe-ref.mjs             # 量任意参考站的真实字体/配色/圆角/间距
    ├── flow.example.json         # flow.mjs 的示例流程（对 scaffold 骨架冒烟，selfcheck 用它守着）
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

判据：`audit.mjs` 退出码 0；深色主题单独跑过；对比度无未达标；`run_checks.mjs` 全绿（有 `package.json` 时）；`hygiene.mjs` 的每一条待确认项都有取舍记录。

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
node scripts/scaffold.mjs --persona rational --out src --pages landing,catalog,app,form,auth,states   # 深色默认生成

# 2) 起本地服务再体检（file:// 会被 CORS 干扰，审计结果不可信）
node scripts/screenshot.mjs --url http://localhost:5173/ --out .design/after
node scripts/audit.mjs --url http://localhost:5173/ --themes light,dark
```

五套人格的差别不只是换色（前三个是主线，后两个专给「陈列一批东西」的页面）：

| | rational | editorial | warm |
| --- | --- | --- | --- |
| 适合 | SaaS、管理端、工具 | 内容站、出版、品牌 | 消费级、教育、社区 |
| 控件高 | 32px | 40px | 44px |
| 圆角 | 4/6/8/12 | 2/3/4/6 | 8/12/16/24 |
| 标题字重 | 600 | 400（大字轻） | 700 |
| 区块留白 | 56px | 112px | 64-80px |
| 按钮 | 平面 + 发丝环 | 描边优先 | 厚度内阴影 |
后两套人格专门给陈列页：

| | print | magazine |
| --- | --- | --- |
| 适合 | 风格库、规格书、作品索引 | 灵感库、杂志目录、编辑推荐 |
| 控件高 | 38px | 40px（小号 34） |
| 圆角 | 2/2/2/4/4 | 4/4/6/8/12 |
| 深度 | 4px 实心硬阴影 | 发丝环 |
| 特征 | body 方格纸 + 墨黑细边 | 衬线刊头 + 电光蓝只指路 |

**生成物是起点，不是成品。** 骨架把「层级、间距、状态、可访问性」这些最容易漏的硬骨头钉死，视觉个性还得自己那一下——需要原创方向时转 `frontend-design`。

---

## 像素级还原验收

「照着设计稿做完了没有」不该靠眼睛投票。`scripts/fidelity.mjs` 把设计稿和真实渲染逐像素比一次，给出可贴进验收记录的数字。

```bash
# 设计稿 vs 本地页面（自动截图，默认 1440×900、DPR 1）
node scripts/fidelity.mjs --design design/home.png --url http://localhost:5173/

# 移动端 + 深色 + 整页
node scripts/fidelity.mjs --design design/home@390.png --url http://localhost:5173/ --viewport mobile --dpr 2 --theme dark --full

# 已经有实现截图：直接比
node scripts/fidelity.mjs --design design/home.png --impl shots/after.png --max-diff 0.01
```

输出（终端 + 三个产物）：

| 指标 | 含义 | 建议门槛 |
| --- | --- | --- |
| `平均差` | 每像素最大通道差的均值（0–255） | 参考量，不单独卡 |
| `超阈值像素` | 差异 > `--threshold`（默认 12%）的像素占比 | **还原类 ≤ 2%**，微调 ≤ 0.5% |
| `最差 N 个区域` | 按 16×12 网格排序的区域，含设计稿坐标 bbox | 逐个看，通常立刻能指出是哪块没做对 |

产物落在 `.design/fidelity/`：`fidelity-diff.png`（设计稿压暗 + 超阈处红）、`fidelity-side.png`（设计稿 / 实现 / 差异三联）、`fidelity-report.json`（机器可读，可进 CI）。

退出码 **0** 达人 / **1** 差异超标 / **2** 参数或环境错误 —— 可以直接当门用：

```bash
node scripts/fidelity.mjs --design design/home.png --url http://localhost:5173/ --max-diff 0.02 || echo "还原度不达标，别交付"
```

两个必须注意的点：

1. **两边截图方式要一致**（都整页或都首屏）。不一致会报 `⚠ 尺寸不一致（缩放 1.000×1.049）`，此时的差异被缩放放大，不代表实现有问题。
2. **深色/多主题**用 `--theme dark`，它会在页面脚本之前写入 `localStorage['ui-theme']` 并带上 `prefers-color-scheme`，框架版（React/Vue）能真正以该主题启动；只改 `data-theme` 属性对已挂载的组件无效。

比对引擎是纯 Python（Pillow + numpy），不需要浏览器；`--impl` 模式下整条链路只依赖 Python，可以进任何 CI。

---

## 交互流程验收

审计能证明「结构对、对比度够、没溢出」，但证明不了「点提交有没有反应」。`scripts/flow.mjs` 补这一段：用一份声明式 JSON 把真实用户路径跑一遍，失败时告诉你第几步、哪个选择器、现场长什么样。

```bash
# 一条登录流程，深色主题走一遍
node scripts/flow.mjs --flow login.json --base http://localhost:5173 --theme dark

# 每步都截图，交付时一起给出去
node scripts/flow.mjs --flow order.json --base http://localhost:5173 --screenshot

# 失败不中断，一次看全所有问题
node scripts/flow.mjs --flow order.json --base http://localhost:5173 --continue
```

`login.json`：

```json
{
  "name": "登录并进入工单列表",
  "start": "login.html",
  "steps": [
    { "fill": "#email", "value": "qa@example.com" },
    { "fill": "#password", "value": "secret" },
    { "click": "button[type=submit]" },
    { "expectUrl": "/dashboard", "desc": "登录后跳到工作台" },
    { "expectText": "工单列表" }
  ]
}
```

13 个动作：`goto` / `click` / `fill` / `select` / `press` / `wait` / `expectText` / `expectVisible` / `expectHidden` / `expectUrl` / `expectCount` / `expectValue` / `screenshot`。每步可加 `timeout`、`desc`、`optional`。完整动作表与参数见 [`docs/scripts.md`](docs/scripts.md)。

产物：`<out>/flow-report.json`（每步 `ok` / `ms` / `error` / 截图名）+ 截图，失败必截 `fail-<序号>.png`。退出码 **0** 全过 / **1** 有步骤失败（标了 `optional` 的不算）/ **2** 流程文件写错——写错在开跑前就列出来，不会跑到一半才崩。

两件它**不做**的事，别指望：不做断言库、不做重试与网络拦截。需要参数化、fixture、并行时用 Playwright Test。它只回答一个问题：这条路径现在还能不能走通。

`scripts/flow.example.json` 是可直接跑的示例（对 scaffold 骨架冒烟），`selfcheck.mjs` 用它守着这条链路。

---

## 脚本手册

十个 Node 脚本 + 三个 Python 工具，每个的参数、示例、退出码与产物见 [`docs/scripts.md`](docs/scripts.md)。一句话速览：

| 脚本 | 干什么 |
| --- | --- |
| `scaffold.mjs` | 从 0 生成骨架：五套人格 × 六类页面 × 深色令牌，可出 React/Vue 框架版 |
| `screenshot.mjs` | 多视口 × 多主题全页截图，记录 CLS 与控制台错误 |
| `audit.mjs` | 结构 + axe WCAG 2.1 A/AA + CLS + 动效审计 |
| `flow.mjs` | 交互流程验收：声明式 JSON 跑「登录 → 填表 → 成功提示」，失败给第几步 + 现场截图 |
| `fidelity.mjs` | 像素级还原验收（设计稿 vs 实现） |
| `auth.mjs` | 有头浏览器登录，导出 auth.json |
| `contrast_check.py` | 对比度审计，支持 oklch / color-mix / Tailwind v4 |
| `crop_logo.py` | 品牌图裁边、方形化、导出 |
| `pixel_diff.py` | 像素比对引擎（Pillow + numpy，可单独用） |
| `hygiene.mjs` | 找无引用资源、重复路由、超大资源 |
| `run_checks.mjs` | 跑项目自带的 lint/typecheck/test/build |
| `probe-ref.mjs` | 量参考站的真实字体/配色/圆角/间距 |
| `selfcheck.mjs` | 改技能本身之后的自检（参数语义 + 语法 + 生成 + 对比度 + 审计 + 流程 + 文档数字 + 版本号） |

视觉细则的常用速查在 [`docs/visual-summary.md`](docs/visual-summary.md)，完整版在 [`references/visual-system.md`](references/visual-system.md)。

---

## 参考站蒸馏

25 个实测站 + 十四份单站蒸馏的「招与反面」，按站点逐个展开在 [`docs/reference-sites.md`](docs/reference-sites.md)。
数据源头始终是 [`references/design-evidence.md`](references/design-evidence.md)，单站全量在 `references/*-design.md`。速览：

| 站点 | 学它什么 |
| --- | --- |
| wegic.ai | 纯黑舞台三段 + 塑料按钮 6 层内阴影 + 手写批注 |
| js.design（即时设计） | 冷灰蓝底 + 负扩散三件套阴影 + 零 webfont |
| uishijie.com（UI 世界） | 零 gutter 图墙 + 卡片不画壳 |
| zcool.com.cn（站酷） | 疏版图墙 + 两级分类靠形状分层 |
| stylekit.top | 卡片即预览 + 衬线/无衬线/等宽三件套 |
| uinotes.com | 隐形界面 + 数字当标题 |
| sspai.com（少数派） | 960 编辑板 224+480+224 + 卡无壳 feed + 按部件分圆角 |
| yuque.com（语雀） | 内部滚动容器的长首页 + 100px Hero + 绿/蓝双场景 |
| juejin.cn（掘金） | 1200 三栏 `180+720+260` + 99px feed 条目 + 灰字密度 |
| apple.com.cn（苹果中国） | 全幅舞台 + 12px 页沟 + 逐舞台明暗编排 |
| luckymaomi.github.io | 印刷品外壳 + 三层展示体系 + 动效库 |
| muz.li（Muzli） | 杂志目录式陈列 + 零 hover（反面） |
| mastergo.com | B 端三栏工作区 + 属性面板字段语言 |
| holynova | 聚光描边卡 + hover 四件套（动效单站） |

外加两份外部规则集（工艺底线 / 反模板）的裁决也在 [`docs/reference-sites.md`](docs/reference-sites.md) 末尾。

---

## 交付验收清单

完整版见 [`references/review-rubric.md`](references/review-rubric.md)（十节，含红旗清单）。摘要：

- [ ] 三视口（1440 / 768 / 390）都无横向滚动
- [ ] 字号只用字阶值，圆角成套，留白成体系
- [ ] 每个数据区都有 加载 / 空 / 错 / 无权限 四态
- [ ] 长文案、超长单词、100 行满数据都试过
- [ ] `audit.mjs` 退出码 0，残留 warn 每条都有解释
- [ ] 深色主题单独跑过截图与审计
- [ ] `contrast_check.py` 无未达标（正文 ≥ 4.5:1，大字/图标 ≥ 3:1）
- [ ] `run_checks.mjs` 全绿：lint / typecheck / test / build（**仅当项目有 `package.json`**；静态站/生成物跳过，用 `audit.mjs` + `contrast_check.py` 代替）
- [ ] `hygiene.mjs` 待确认项逐条看过并记录取舍
- [ ] Tab 键走查到底，焦点顺序正确、焦点态可见
- [ ] 弹窗：焦点移入、Esc 关闭、关闭后焦点回到触发元素
- [ ] 图标按钮有 `aria-label`，表单控件有关联 label，图片有 `alt`
- [ ] 390px 主操作在下 1/3，点击区 ≥ 44×44
- [ ] Logo 比例正确、深色可见、favicon 正常
- [ ] before / after 截图都留了，能指给评审看
- [ ] 涉及提交 / 跳转 / 弹窗 / 异步加载的改动，`flow.mjs` 跑过一遍（没跑要写明原因）
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

**Windows 下路径怎么写** —— 脚本内部用 `path` 处理，命令行里写 `E:/proj/src` 或 `E:\\proj\\src` 都行；含空格的路径要加引号。**但 Git Bash / MSYS2 / Cygwin 里要小心 `--pages /orders`**：shell 会把 `/orders` 当成 POSIX 绝对路径改写成 `C:/Program Files/Git/orders`，脚本再按 URL 解析就成了 `file:///…`，报 `ERR_FILE_NOT_FOUND`，而报错完全指不到真因。脚本现在能认出 Git for Windows / PortableGit / MSYS2 / Cygwin 的安装根并自动还原（stderr 打一条 `WARN`），但最稳的写法是**去掉前导斜杠**：`--pages index.html,orders`；要站点根路径写 `--pages .`；或显式加 `MSYS_NO_PATHCONV=1`。PowerShell / cmd 不受影响。

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

