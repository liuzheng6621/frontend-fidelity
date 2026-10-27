# frontend-fidelity · 前端保真度

> 把界面做对、做实，两条路都走：**已有界面**——按设计稿/截图还原，或把现存页面整改到位（后台管理端、移动 H5/小程序、多端一致性、Logo 与品牌资产）；**还没有界面**——从 0 生成一套能验收的骨架（令牌 + 组件 + 六类页面），再往上填真内容与业务状态。
> 参考库是 **21 个真实站的实测数据 + 九份单站蒸馏**（营销 / 工具站 / 密版图墙 / 疏版图墙 / 陈列页 / 灵感库 / 风格库 / 杂志目录 / B 端工具工作区），外加**两份外部规则集蒸馏**（工艺底线 / 反模板清单）；按页面类型对到具体文件，见 [该抄哪份参考](#该抄哪份参考)。
> 搜这些词应该能到这：设计稿转代码、照着截图还原、UI 还原、前端验收、截图对比、后台美化、移动端适配、设计令牌、Claude Code 技能（skill）。
> 目标不是"改好看"，而是**让界面和它声称的样子一致，并且真的能用——改完能拿出证据**。

`v1.13.2` · [最新发行版](https://gitee.com/liu-everything_impossble/skill-frontend-fidelity/releases/latest) · `MIT` · `Node.js ≥ 18` · `Python ≥ 3.9（仅裁图/对比度）` · `WCAG 检查离线可跑` · `9 个可执行脚本`

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
bash install.sh --ref v1.13.2            # 锁定某个版本
bash install.sh --dry-run                # 只看会装到哪，不动文件
```

**手动装也就三行**

```bash
git clone --depth 1 https://gitee.com/liu-everything_impossble/skill-frontend-fidelity.git \
  ~/.claude/skills/frontend-fidelity
```

装完新开一个会话（旧会话不会重新加载技能），然后在项目里直接说「照这张截图还原这个页面」「后台太难看了，统一一下」，或说「验收一下前端改动」。

## 它到底量大到什么程度

21 个真实站在浏览器里逐元素量出来的，不是猜的：

| 量的是什么 | 结果 |
| --- | --- |
| 正文字号 | 均值 **14.8px**（跨站 10–20px），行高比均值 **1.42** |
| 主标题字号 | 均值 **72.6px**（36–140px），H1/正文比 **2.3–8.8 倍** |
| 圆角 | 六种做法并存：单主力档 / 双轨 / 直角派 / 线性阶梯 / 七档无递进（反例） |
| 阴影 | 五派：靠边框 / 发丝圈+内阴影 / 负扩散 / 全站零阴影 / 零阴影零边框 |
| 动效 | 中位数 **1 个**——最克制的几站反而最显专业 |
| 网格 | 三派图墙：密（5 列 gap 0）／疏（4 列列距 24）／活预览墙（3 列 gap 32） |

全部原始数值、样本清单和失败样本在 [`references/design-evidence.md`](references/design-evidence.md)。
## 该抄哪份参考

先看这张表：**按你手上的页面类型选一份，别从头读十六份。**

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

六份单站蒸馏是**同一个十节结构**（StyleKit 那份多一节「详情页第二套版式」，共十一节）：气质 → 令牌 → 字阶 → 版式节奏 → 组件配方 → 它自己没做好的 → 能搬/不能搬 → 复现清单 → 与其他文件的关系 → 重采方法。要抄就抄「令牌 + 版式 + 组件」三节，第六节用来避免抄到毛病。

两条读法上的提醒：

1. **别把"他们的取舍"当规范。** 四份中文内容站（即时设计 / UI 世界 / 站酷 / UI Notes）都用系统字体栈、正文 13–14px——那是它们要在一屏里塞更多东西的代价，不是推荐值。跨站统计的均值（正文 14.8px、H1 72.6px）在 [`design-evidence.md`](references/design-evidence.md)。
2. **单站样本只证明"可以这么做"，不证明"必须这么做"。** 想要判断某个数值是不是行业常态，去 `design-evidence.md` 看 20 个站里出现了几次；只在单站出现一次的，一律当作那一家的个性。

---

## 目录

- [30 秒安装](#30-秒安装)
- [它到底量大到什么程度](#它到底量大到什么程度)
- [该抄哪份参考](#该抄哪份参考)
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
- [参考站蒸馏：StyleKit 风格目录](#参考站蒸馏stylekit-风格目录)
- [参考站蒸馏：UI Notes 灵感库](#参考站蒸馏ui-notes-灵感库)
- [参考站蒸馏：猫叫兽 UI 风格库](#参考站蒸馏猫叫兽-ui-风格库印刷品外壳--三层展示体系)
- [参考站蒸馏：Muzli 灵感库](#参考站蒸馏muzli-灵感库杂志目录式陈列)
- [参考站蒸馏：MasterGo（B 端工具界面）](#参考站蒸馏mastergob-端工具界面)
- [动效单站蒸馏：holynova 聚光卡](#动效单站蒸馏holynova-聚光卡)
- [外部规则集蒸馏：工艺底线与反模板](#外部规则集蒸馏工艺底线与反模板)
- [交付验收清单](#交付验收清单)
- [CI 集成](#ci-集成)
- [常见问题](#常见问题)
- [设计取舍](#设计取舍)
- [许可与第三方](#许可与第三方)

---

## 这是什么

一个**把前端做对**的技能包，两条路都走：**先把已有界面整改/还原到位**，**也能从 0 生成一套能验收的骨架**。内含一份给 agent 读的操作手册（`SKILL.md`）+ 二十一份参考数据（10 份单站蒸馏 + 8 份通用规格 + 1 份跨站实测 + 2 份外部规则集，`references/`）+ 九个能直接跑的脚本（`scripts/`）。

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
| `SKILL.md` | agent（模型） | 入口：两种模式（整改 / 从 0 生成）+ 工作流 + 质量门 + 细则路由 + 十个速查数字（283 行，细则已下沉） |
| `references/visual-system.md` | 双方 | 视觉与结构细则完整版（从 SKILL.md 下沉）：中文排版、色彩、间距、阴影五派、动效、页面结构、控件 8 状态、响应式、深色、可访问性、反模式清单 |
| `README.md`（本文件） | 人 | 项目介绍、安装、脚本参数、产物、排错 |
| `references/design-evidence.md` | 双方 | 21 个实测站点（18 A 组：12 营销/产品 + 6 内容陈列站；另 3 后台）的字体/间距/圆角/密度数值 |
| `references/wegic-design.md` | 双方 | wegic.ai 单站全量蒸馏：完整令牌、塑料按钮、字阶节奏、迁移口径 |
| `references/jsdesign-design.md` | 双方 | 即时设计 js.design 单站全量蒸馏：冷灰蓝底 + 负扩散阴影、130px 节奏、零 webfont、七处反例 |
| `references/uishijie-design.md` | 双方 | UI 世界（内容聚合站）单站全量蒸馏：零 gutter 图墙、卡片不画壳、四档字号、七处反例 |
| `references/zcool-design.md` | 双方 | 站酷（内容社区频道页）单站全量蒸馏：疏版图墙、两级分类靠形状分层、`0.8px` 发丝、直角分页、七处反例 |
| `references/stylekit-design.md` | 双方 | StyleKit（风格目录站）单站全量蒸馏：卡片即预览（活渲染、非截图）、6px 四段色板条、直角陈列区、衬线+无衬线+等宽三件套、两条 hover、详情页第二套版式、七处反例 |
| `references/uinotes-design.md` | 双方 | UI Notes（真实 UI 截图灵感库）单站全量蒸馏：隐形界面（0 壳 0 边 0 阴影）、240×520 截图带裁切露 1.8 张、48px 数字当标题、2/4/6/16/20/24 线性圆角阶梯、全站 `line-height: normal`、七处反例 |
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
当前是 [v1.12.0](https://gitee.com/liu-everything_impossble/skill-frontend-fidelity/releases/tag/v1.12.0)。

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
│   ├── design-evidence.md        # 21 个实测站点（18 A 组 + 3 后台）：字体、字阶、行高、间距、圆角、密度
│   ├── wegic-design.md           # wegic.ai 单站全量蒸馏：完整令牌 + 塑料按钮 + 迁移口径
│   ├── jsdesign-design.md        # 即时设计 js.design 单站全量蒸馏：冷灰蓝底 + 负扩散阴影 + 七处反例
│   ├── uishijie-design.md        # UI 世界（内容聚合站）：零 gutter 图墙 + 卡片不画壳 + 七处反例
│   ├── zcool-design.md           # 站酷（内容社区频道页）：疏版图墙 + 两级分类靠形状 + 七处反例
│   ├── stylekit-design.md        # StyleKit（风格目录站）：卡片即预览 + 6px 四段色板 + 直角陈列区 + 七处反例
│   ├── uinotes-design.md        # UI Notes（截图灵感库）：隐形界面 + 240×520 截图带裁切 + 数字当标题 + 七处反例
│   ├── page-patterns.md          # 从 0 生成：选型表 + 七类页面骨架 + 三变体 + 内容最低量
│   ├── component-spec.md         # 11 类组件规格：三档密度、尺寸、对齐、禁忌
│   ├── design-tokens.md          # 五套人格预设、深度三派、色阶生成算法、字阶、圆角阴影配对、暗色推导
│   ├── copy-and-content.md       # 文案规格：标题公式、按钮动词、空/错/载公式、占位写法
│   ├── css-recipes.md            # 设计令牌 / 表格 / 骨架屏 / 空态 / 深色 / 六个站的风味片段（第 12–17 节）
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
├── .github/workflows/           # CI：语法 + 生成 + 对比度（装了浏览器时再跑 30 组审计）
└── scripts/
    ├── scaffold.mjs              # 从 0 生成骨架：五套人格 + 深度三派 + 六类页面 + 生成期对比度自检
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
node scripts/scaffold.mjs --persona rational --out src --pages landing,catalog,app,form,auth,states --dark

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

## 脚本手册

### scaffold.mjs — 从 0 生成前端骨架

一次性产出设计令牌 + 组件样式 + 六类页面，拿到就能跑、能量、能改。**模式 B 的第一步**。

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
| `--persona` | `rational`（SaaS/后台，方正克制）／`editorial`（内容、品牌站，字重轻留白大）／`warm`（消费级、社区，暖色圆角厚）／`print`（印刷品：方格纸 + 墨框 + 4px 硬阴影）／`magazine`（杂志目录：衬线刊头 + 电光蓝 + 无壳图版） | `rational` |
| `--out` | 输出目录 | `ui-scaffold` |
| `--pages` | 逗号分隔：`landing,catalog,app,form,auth,states` | `landing,app` |
| `--accent` | 覆盖品牌色相 0–360（不填用该人格默认） | 人格预设 |
| `--dark` | 额外生成 `.dark` 令牌块（不给就等于没打算支持深色） | 关 |
| `--name` | 产品名 | `示例产品` |
| `--quiet` | 少打印 | 关 |
| `--help` / `-h` | 打印用法后退出 | — |

**产出**（平铺在 `--out` 目录：6 个 CSS/JS + 各页面，全量 13 个文件）：

```
<out>/
├── tokens.json          # 令牌源，可喂给设计系统或其他工具
├── tokens.css           # 颜色/间距/字阶/圆角/阴影/动效变量，含可选 .dark
├── base.css             # reset、排版、焦点环、::selection、reduced-motion
├── components.css       # 按钮/表单/卡片/表格/标签/提示/空态/骨架/tabs/弹窗/toast + 外壳
├── depth.css            # 深度三派（发丝 / 软影 / 硬影）的卡片四件套；print 额外画方格纸
├── catalog.css          # 陈列目录页：左栏目录 + 药丸筛选 + 3 列图版 + 分页
├── ui.js                # 主题切换（localStorage）、密码显隐、tabs 键盘、modal Esc
└── *.html               # index / catalog / app / form / auth / states，按 --pages 决定
```

退出码：`0` 成功；`2` 参数错（未知人格 / 未知页面名，同时打印可选值）。

**生成物已过 `audit.mjs` 的明暗双主题验证**：五套人格 × 六类页面 × 明暗 = 30 组，0 error / 0 warn / 0 axe 违规（v1.13.1 复跑，`node scripts/selfcheck.mjs` 一条命令可复现）；令牌对比度门每个 113 组 / 0 组未达标。
但它只保证「层级、间距、状态、可访问性」这些硬骨头，文案全是 `{{TODO: ...}}` 占位——
你的活是把它们换成真内容（见 `references/copy-and-content.md`），别直接当成品交付。

页面骨架清单写在各 HTML 顶部的注释里，照着补删改比重写快。

---

### selfcheck.mjs — 一键自检（改技能本身之后跑这个）

```bash
node scripts/selfcheck.mjs              # 全跑（没有 playwright 时自动跳过审计）
node scripts/selfcheck.mjs --skip-audit # 只跑语法 + 生成 + 对比度 + 文档数字，秒级，CI 用
npm run selfcheck                       # 同上，走 package.json 里的脚本
node scripts/selfcheck.mjs --keep       # 保留临时目录，方便看生成物
```

四步，任何一步失败都以非 0 退出：

| 步骤 | 做什么 | 失败含义 |
| --- | --- | --- |
| 语法 | `node --check` 所有 `scripts/*.mjs`、`python -m py_compile` 所有 `scripts/*.py` | 改脚本时手滑了 |
| 生成 | 五套人格 × 六类页面（含 `--dark`）各生成一遍，检查 13 个产物文件齐 | `scaffold.mjs` 坏了 |
| 对比度 | 对每套生成物跑 `contrast_check.py`，有未达标即失败 | 令牌改暗了/改浅了 |
| 审计 | 内置静态服务 + `audit.mjs --themes light,dark`，30 组都要 `0 错误 / 0 警告` | 生成物出现了 a11y 回归 |

第五步「文档数字」也在里面：以 `references/design-evidence.md` 的「采集成功 N 个站 / A 组 N」为准，
检查 README、SKILL 里所有「N 个真实站」「N 个实测站点」「A 组 N」是否一致——这类数字最容易悄悄漂
（本项目已经漂过三次）。

CI 在 `.github/workflows/selfcheck.yml`：推 PR 时跑 fast 路径（不装浏览器），手动触发跑完整 30 组审计。
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
python scripts/contrast_check.py src/ --all             # 列出全部配对（默认只列前 60 组）
```

- 支持 `#hex`、`rgb()/rgba()`、`hsl()/hsla()`、`hwb()`、**`oklch()`、`oklab()`、`lab()`**、`color(srgb …)`、`color-mix(in oklab|srgb, A p%, B)`、`var()` 链（含 fallback，最多 8 层）。
- 自动识别深色块：`.dark`、`[data-theme="dark"]`、`.theme-dark`、`@media (prefers-color-scheme: dark)`。
- 两种配对：同元素 `color` + `background`（背景不透明时才算），以及按变量名角色配对。
- 阈值：正文 **4.5:1**，UI 边界 / 图标 **3:1**。透明背景的配对跳过（无法判定，需人工）。
- 装饰性发丝边框单独标 `info`、不计入失败；`--_*` 私有变量与色阶档位不参与配对，避免假失败。
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

## 参考站蒸馏：StyleKit 风格目录

`https://www.stylekit.top/zh/styles`。语料里第一个**风格目录站**——149 种网页/UI 风格（131 视觉风格 + 18 布局模式），
也是第一个「**卡片即预览**」样本：每张卡的预览区**不是截图**，而是用那个风格自己的 CSS 现场渲染的一套迷你界面
（底 + 卡 + 标题 + 按钮），塞进固定 `4:3` 的裁切框。

它真正值得学的是**陈列纪律**：三个数字定死（预览 `4:3`、色板 `6px`、文本区 `180px`）；
圆角只给控件，陈列区一律 `0`；hover 只两笔；全站零阴影——唯一那条硬阴影长在展品内部，不属展柜。

| 产出 | 位置 | 里面有什么 |
|------|------|-----------|
| 单站全量蒸馏 | `references/stylekit-design.md` | 完整令牌、三件套字体、版式节奏表、卡片六层结构、详情页第二套版式、七处没做好的 |
| 可直接抄的 CSS | `references/css-recipes.md` §16 | `.sk-card` / `.sk-preview`（容器查询缩放）/ `.sk-palette` / `.sk-chips` / `.sk-stats` / `.sk-rowlink`，含移动端两列 |
| 跨站统计 | `references/design-evidence.md` | 新增 A 组样本后：H1 均值 75.7→**72.6**、H1/正文比下探 **2.25**、字号均值 **14.9**、三件套分工与「第五种圆角做法（直角派）」首次入统计 |
| 验收与结构 | `SKILL.md`、`references/review-rubric.md` | 新增「陈列一批彼此不同的东西」小节 8 条 + 4 条红旗 + 陈列类页面额外 6 条验收项 |

### 三招值得直接搬

| 招式 | 实测做法 | 为什么成立 |
|------|----------|-----------|
| **卡片即预览** | 每张卡用条目自己的 CSS 渲染迷你 DOM，外层 `aspect-ratio: 4/3` + `overflow: hidden` | 截图会糊、会过期、窄屏失真；活预览永远准，且**展品与展柜同一套语言** |
| **6px 四段色板条** | 预览正下方 `display:flex; height:6px`，四段 `flex:1`，语义固定 背景/前景/强调/辅色 | 一行 CSS 给每张卡一张「身份证」；比六行标签有效，且天然对齐 |
| **直角陈列 + 控件圆角** | 陈列区 `radius: 0`，控件 6px，图标钮 50% | 直角放大「内容整齐」的优势；前提是三个数字定死，否则参差变成排版事故 |

### 也别学它这几处

- **深色模式是半成品**：header 有 `切换到深色模式` 按钮，点了 `html.class` 仍是 `light`，`--background` 仍是 `#fafafa`。
- **预览 DOM 没 `aria-hidden`**：149 张卡的迷你界面里有 `ACTION` / `Read more` 等真文本，读屏会念一百多遍。
- **预览里的字太小且被裁**：桌面 10–12px，390 宽下变 6px 且被 `overflow: hidden` 切半行。该整体缩放，不该缩字号。
- **无限滚动无出口**：只有「已显示 24 / 149」，没有「加载更多」，键盘与读屏用户很难到下一批，刷新即回第一张。
- **图标按钮 24×24**：低于 44 触控下限，移动端也没变大。
- **圆角被一个下拉破功**：全站 0 圆角，只有排序下拉是 6px，像是随手 `rounded-md` 留下的。
- **上下两条固定带挤首屏**：促销条 40 + 移动端底部 tab 56，390×844 首屏有效高度只剩 ~700，且促销条关掉不记忆。

### 重采

```bash
node scripts/probe-ref.mjs --url https://www.stylekit.top/zh/styles --out ./out --name stylekit --wait 6000
```

三个坑（细节见 `references/stylekit-design.md` 第十一节）：

1. **整页长截图截到一半全白**——无限滚动懒挂载，要看下半页就分段 `window.scrollTo` 再截。
2. **圆角会量出 `3.35544e+07px`**——那是 `rounded-full` 的 `calc(infinity * 1px)`，不是异常值。
3. **深色模式点了没反应**——别为了凑「深色令牌表」去臆造，如实写「未取到」。

## 参考站蒸馏：UI Notes 灵感库

<https://uinotes.com/> —— 真实产品 UI 截图灵感库（477 个应用 / 180,158 张截图）。它是第六份单站样本，也是**「隐形界面」的极端案例**：站点自己的视觉几乎消失，只剩一排排别人的真机截图。

产出四块：

| 内容 | 文件 | 拿走什么 |
| --- | --- | --- |
| 单站全量蒸馏 | `references/uinotes-design.md` | 完整令牌、字阶（含全站 `line-height: normal`）、版式节奏表（56/72/680/110/56/440×626）、app 条目六层结构、截图带裁切、七处没做好的、12 条复现清单 |
| 可粘贴 CSS | `references/css-recipes.md` §17 | `--un-*` 令牌 + `.un-header` / `.un-num` / `.un-wall` / `.un-filters` / `.un-grid` / `.app-item` / `.pill-mini` / `.app-shots` / `.shot` |
| 跨站数据 | `references/design-evidence.md` A 组第 15 行 + 补充表 17 行 | 正文均值降到 **14.8px**、浅色站 11 个、webfont 反例涨到四个（全是中文站） |
| 规则与验收 | `SKILL.md` 陈列节 + `review-rubric.md` 第九节 | 素材型陈列「不画壳」、裁切必须留出口、一个正方形尺寸走全场、线性圆角阶梯 |

三招值得直接搬：

| 招 | 怎么用 | 为什么有效 |
| --- | --- | --- |
| 数字当标题 | `477 个应用 180158 张截图` 用 48/500，数字单独上色 `#446bf8`，说明退到 18/30 | 有真实数量时，「看起来有货」最省力的做法；比形容词有效，也容易验收 |
| 全站只有一个正方形尺寸 | 图标墙与 app 图标共用 80×80 / r24 | 墙 + 列表 + 详情三处视觉重量自动对齐 |
| 无壳溢出裁切 | 列宽 440 里塞 1248 宽的截图带，外层 `overflow: hidden` 只露 1.8 张 | 密度靠裁出画框，不靠缩图；代价是必须给出口 |

也别学它这三处：

1. **viewport 锁 1420** 当移动端：390 屏整站缩到 27%，正文物理高度 ≈3.5px（比横向溢出更隐蔽）。
2. **没有 h1、没有页脚**：最大的字是一个 `div`，底部只剩一个 `box: 0` 的隐藏「关于」链接。
3. **裁切不留出口**：截图带裁到 1.8 张、hover 零反馈、无「还有 3 张」提示。

重采命令：

```bash
node scripts/probe-ref.mjs --url https://uinotes.com/ --out ./out --name uinotes --wait 6000
node scripts/screenshot.mjs --url https://uinotes.com/ --out ./shots --name un --full
```

三个坑（细节见 `references/uinotes-design.md` 第十节）：

1. **长图会因懒加载截空**——未滚动时 `img.src` 为空（2×2 占位），先滚到底或分段截。
2. **移动端测不到「重排」**——只会得到 `innerWidth = 1420`，这本身就是结论，别误判成脚本出错。
3. **水印是烧进图片像素的**——不是 DOM 叠层也不是 `::after`，想提取只能裁图。

## 参考站蒸馏：猫叫兽 UI 风格库（印刷品外壳 + 三层展示体系）

<https://luckymaomi.github.io/ui/> 是一个设计风格目录站：**143 个风格样本、57 条动效、2895 个元素、文档高 21,593**。
它在语料里的位置很特殊——和 StyleKit 是同一条赛道（把风格当货陈列），但气质完全相反：StyleKit 是「射灯下的样品」（活预览 + 发丝线 + 通体直角），
这站是「钉在图板上的图纸」（静态 SVG 预览 + 墨黑 1px 框 + `4px 4px 0` 硬阴影 + 方格纸底板）。两派都成立，**混用必然廉价**。

> 前提：根域名 `https://luckymaomi.github.io/` 是 GitHub Pages 404（只渲染 12 个元素），真实内容在 `/ui/`。仓库公开、无 LICENSE 声明，本文只记录量出来的数值与做法。

四块产出：

| 产出 | 内容 |
|---|---|
| [`references/luckymaomi-catalog.md`](references/luckymaomi-catalog.md)（24.4KB / 十一节） | 26 个令牌全表、字阶六档（76/950·40/950·18/400·13·12·11）、卡片六段结构（457×477 / 16:9 静态 SVG / 徽标 36×25 / 色板行 25×14）、hover 三件事、动效预算（3 条 transition 全 100ms linear）、动效库 10 域 57 条的元数据与重放机制、showcase 两层 keyframes、三层 IA、七处别照抄 |
| [`references/css-recipes.md`](references/css-recipes.md) §20 | `.paper-grid`（两条 1px 渐变方格纸）、`.hard-card`（hover 描黑 + 硬阴影 + `:active` 用 `translate` 压缩影）、`.meta-bar`（元数据黑条）、`.spec-strip`（把规格印成四格）、`.compact-item`、`.animation-stage` + `.animation-replay`、`march`/`stamp` 两条 keyframes |
| [`references/motion-spec.md`](references/motion-spec.md) 二·补 / 二·补二 | **三种时长口径**（手感派 spring 220–300ms / 弹性派 400ms / **印刷派 linear 100ms**）与「动效索引用『触发时机 · 时长』当第二行」的元数据约定 + 重放实现 |
| [`references/design-evidence.md`](references/design-evidence.md) | A 组第 16 行 + 16 行补充表；正文均值 14.8 → **14.7px**、浅色 11 → **12** 站 |

三招值得直接搬：

| 招 | 怎么做 | 为什么有效 |
|---|---|---|
| 方格纸底板 | `body` 铺两条 1px 渐变（`--grid-line: #090a0d13`），`background-size: 32px 32px` | 3 行 CSS 就把「制图桌 / 规格书」气质立住；白卡片不需要阴影就浮起来了 |
| hover 只「描黑 + 落硬阴影」 | `border-color → #090a0d`；`box-shadow → 4px 4px 0 #090a0d`；**`transform` 保持 `none`** | 印刷派的反饋靠「线变实、影子落下」，比抬 4px 省 GPU，也不会有「抖一下」的廉价感 |
| 动效库的索引方式 | 条目第二行固定是黑条「触发时机 · 时长」（加载时 · 600ms / 悬停时 · 200ms / 持续播放 · 2s）；目录**不放动图**，演的动作留到详情页 | 用户找动效问的是「有没有入场、别太慢」，不是「有没有 ease-out-back」；57 个动图会把索引页变成马戏团 |

也别学它这几处：

1. **目录页与动效页都没有 `h1`**（143 个卡片标题都是 `h2`，文档大纲缺顶级标题）。
2. **三个字体角色变量指向同一栈**，等宽变量声明了却没有生效文本——「预留插槽」别当成设计决策。
3. **100ms linear 也用在按钮上**（按钮该 150–200ms），且 shell 100ms 与 showcase 页 150ms 两个值并存。
4. **色板小方块靠 1px 黑边**，遇到纯黑色块就糊在一起（应改用 `inset` 发丝 + 外描边）。
5. **静态 SVG 预览只能「像」不能「是」**，所以卡片必须配「真实展示」入口，且它比「规则详情」更该被强调。

重采命令：

```bash
node .tools/probe-lm1.mjs   # 结构 / 26 令牌 / 卡片 / 字号分布
node .tools/probe-lm2.mjs   # 卡片 hover 前后、按钮、header
node .tools/probe-lm3.mjs   # 动效目录 / 风格规格页 / showcase 三页一次过
node .tools/probe-lm6.mjs   # 10 域条目（时机·时长）、单条详情重放、showcase keyframes
```

坑：根域名 404；全站只有一份 31KB Tailwind 产物（`@keyframes` 为 0），动效与 showcase 的 keyframes 在各自页面样式里，必须逐页采。
## 参考站蒸馏：Muzli 灵感库（杂志目录式陈列）

`https://muz.li/inspiration/motion-design/` 是 Muzli 的单个专题页：56 张卡、左栏目录、3 列图版、衬线刊头，**卡片零 hover**。它跟前面几个内容站的做法几乎相反——那些在卡片上做文章，这一份在**页面外壳**上做文章（导航、刊头、药丸、页脚），卡片本身轻到几乎不存在。

**四块产出**

| 产出 | 落在哪 | 里面有什么 |
| --- | --- | --- |
| 单站全量蒸馏 | [`references/muzli-gallery.md`](references/muzli-gallery.md)（20.3KB / 十一节） | 气质四特征 · 令牌（电光蓝 `#2e54ff` + 一个黑的四档 alpha + 4/6/999 三档圆角）· 字阶（Instrument Serif 48/1.0 刊头 + Poppins 正文，296:9）· 版式节奏（65 / 220 / 1108 / 348×309 / 896 / 584）· 组件配方（无壳卡片、35px 药丸、New 徽标、左栏、页脚 10% 面板）· 信息架构（目录 → 外链自家社区带 UTM → SEO 长文 + All collections）· 动效（10 个 keyframes 无一作用在卡片）· 七处没做好 · 能搬/不能搬 · 十步复现 · 重采四坑 |
| 可粘贴配方 | [`references/css-recipes.md`](references/css-recipes.md) §21 | `.mz-shell`（左栏 220 + 主区）、`.mz-rail`（sticky + 自己滚动）、`.mz-h1`（衬线 48/1.05）、`.mz-pills` / `.mz-pill[aria-current]`、`.mz-grid` + `.mz-card`（图 `aspect-ratio: 348/230` + 4px + 发丝环）、`.mz-badge`、`.mz-footer`；**并补上原站缺的三笔**：hover 环加深 + 图微提亮 + 标题下划线、`:focus-visible` |
| 跨站统计 | [`references/design-evidence.md`](references/design-evidence.md) | A 组第 17 行 + 16 行补充表；正文均值 **14.7 → 14.6px**、H1 均值 **72.6 → 70.8px**（14 站有 h1）、浅色 12 → **13** 站；招式 40–42；反例 +3 行（卡片零 hover / 广告与内容同构 / 两套过滤语义） |
| 入口路由 | [`SKILL.md`](SKILL.md) | 「细则去哪找」加一行「要杂志目录气质：左栏目录 + 3 列图版 + 衬线刊头 + 一个电光蓝」 |

**三招值得直接搬**

| 招式 | 为什么 |
| --- | --- |
| 衬线只当刊头 | 9 处 Instrument Serif 全在标题，296 处 Poppins 干活。中文替身 `"Source Han Serif SC","Songti SC"`，行高给 1.1，别继承 1.0 |
| 图版靠图片自己的边界分组 | 卡片本体零边框零阴影，只给图 4px 圆角 + `0 0 0 1px rgba(0,0,0,.05)` 发丝环。比每张卡套框干净，还省一层阴影 |
| 页脚用主色 10% 当底 | `rgba(46,84,255,.1)`：不引入第三个颜色，也不让页脚变成「黑底白字」的第二个世界 |

**也别学它四处**

1. **卡片零 hover、零 focus 可视**——可点却看不出可点，键盘也拿不到焦点；这是缺陷，不是克制。
2. **广告卡与内容卡同构**（同 348×308 格子，只靠 11px `Sponsored` 区分）。
3. **左栏是站内跳转、顶部药丸是站内过滤**——两个入口两种语义。
4. **卡题 14px 偏小 + 图靠裁没有 `aspect-ratio`**：348×230 的卡里 14/500，长标题折到 3 行。

**重采（Nuxt，等 `load` 会超时）**

```powershell
node E:\SKIl.1\.tools\probe-muz1.mjs   # 结构 / 变量 / 卡片 / 字体 / 字号
node E:\SKIl.1\.tools\probe-muz2.mjs   # hover 前后 / 左栏 / 移动端 / 懒加载
node E:\SKIl.1\.tools\probe-muz4.mjs   # 长文区 / All collections / 页脚面板
node E:\SKIl.1\.tools\probe-muz6.mjs   # 卡片外链目标与 UTM（51 张全指 me.muz.li）
```

三坑：①`probe-ref.mjs` 默认 45s 等 `load`，这一页必超时，要 `domcontentloaded` + `waitForSelector('article')`；②`article` 里混着广告卡，数卡片会多 1–5 个；③**hover 无变化是结论不是漏测**（连测三次，`transform/filter/box-shadow/color` 全同）。
## 参考站蒸馏：MasterGo（B 端工具界面）

`https://mastergo.com/` 是"设计协作工具"的官网，但值得学的不是它的营销页（渐变 + 按钮 + logo 墙，任何 SaaS 都长这样），
而是**它的工具界面实例**与**资源社区里什么被真用**。完整实测在 [`references/mastergo-b2b.md`](references/mastergo-b2b.md)（14KB / 八节）。

| 产出 | 内容 |
| --- | --- |
| 工具界面实例解剖 | 官方 1800×1536 产品图：三栏 **300 / 画布 / 300** + 顶栏 56；左栏树行高 28、缩进 12、状态点 6px；右栏分组标题 12/600 `#8A8F99`、键值行 12 等宽、**只有数值上色** |
| 属性面板字段语言 | 组间只给 1px 线；深色面板只换令牌不换结构；命中区 ≥44×44；数值 20/600 |
| 代码面板 + 盒子模型图 | 底 `#1E1E1E` / 属性 `#7A7A7A` / 值 `#FFF` / 数值 `#7FB1FF`；嵌套矩形四条边各一个 10px 数字，比四行 `padding` 直观 |
| 社区统计 | 24 张资源卡：大厂组件库 11 / B 端整页与大屏 7 / 移动端 4 / 图标 1；**B 端整页使用数 98.2k > TDesign 46.7k > AntDesign 4.0 Light 42.5k** |
| 可抄配方 | [`references/css-recipes.md`](references/css-recipes.md) §22：三栏工作区 / 属性面板 / 盒子模型图 / 代码面板 |

**三招值得直接搬**：

1. **渐变当"墙"**：`header::after { position: fixed; height: 900px; z-index: -1 }` + `linear-gradient(120deg,#6236FF,#32C5FF)`——首屏之后整页都在色彩里，正文区始终白；只在 `(min-width:900px)` 开，iOS 上 `fixed` 背景会抖。
2. **属性面板"只有数值上色"**：属性名 `#7A7A7A`、值 `#FFF`、数值 `#7FB1FF`。用户永远在找值，不在读标题，所以分组标题要做得比内容更安静。
3. **交付整页而不是组件清单**：社区里使用数最高的是个人做的「B 端系统界面」（98.2k），高于所有大厂组件库——组件库人人有源文件，整页骨架才是别人真正会复制走的东西。

**也别学它四处**：全站 `h2` 数量为 0（视觉标题全是 div，读屏无大纲）；首页 11,154px / 12 屏、移动端 13,449px；区块标题行高 1.8（中文超过 12 字就散）；促销条常年占 60px 顶在品牌叙事上面。

**重采**（三个坑：渐变换在 `header::after` 上、社区 3 秒后弹登录框、资源实例本体在 `<canvas>` 里需登录）：

```bash
node scripts/probe-ref.mjs --url https://mastergo.com/ --out .probe --name mastergo --wait 4000
curl -O https://mastergo.com/images/home/design2.png      # 1800×1536，比任何截图都清楚
```
## 动效单站蒸馏：holynova 聚光卡

<https://holynova.github.io/> 是一个作品集详情页（暗底 `#09090b`、431 元素、**0 canvas、0 video**）。它不进跨站视觉统计——只回答一个问题：**不用任何动效库，怎么让一批卡片"活着"。**

结论：**23 条 transition、3 个 keyframes、1 条主缓动**。全站零动效库（GSAP / THREE / lottie / Swiper / lenis / anime 一个都没有），all in CSS。

### 产出

| 文件 | 内容 |
| --- | --- |
| [`references/holynova-motion.md`](references/holynova-motion.md)（15.9KB / 十一节） | 令牌（1 条 `cubic-bezier(.16,1,.3,1)` + 六档时长 120–400ms）、三条 keyframes 原文、hover 四件套的规则与前后实测对照、聚光卡的 `::before`/`::after` 完整源码与四个坑、批量入场、reduced-motion、七处别照抄、十步搬用清单、重采方法 |
| [`references/css-recipes.md`](references/css-recipes.md) §19 | 可直接粘贴的 `.spotlight-card` + 两个光层 + 浮出按钮 + 入场 + 降级 + 十行 pointermove JS |
| `references/motion-spec.md` | §十 增加指路；§十一 来源补 holynova 实测值 |
| `SKILL.md` | 细则路由表加一行「卡片 hover 怎么活起来 / 聚光描边」；速查数字补「hover 要四件套一起变」；参考文件节加条目 |

### 三招值得直接搬

| 招 | 为什么有效 | 实测 |
| --- | --- | --- |
| **聚光描边用 `mask` 抠环** | `padding:1px` + `mask: linear-gradient(#fff 0 0) content-box exclude` 让径向渐变只剩 1px 环；只改两个 CSS 自定义属性（坐标），**不做 filter 动画、不建 canvas** | 半径 280px 描边 + 360px 环境光，`opacity` 过渡 220ms |
| **一个 hover 用三个时长** | 位移 220ms、颜色 200ms、阴影 300ms——阴影面积大、必须更久才不跳。这是"看起来贵"的真正来源 | `transform .22s` / `border-color .2s ease` / `box-shadow .3s` |
| **图片压暗而不是提亮** | 暗底上 `brightness(1.05)` 会糊成一片白；`brightness(.95) saturate(.97)` 让卡片退后一格，前景白字反而更清楚 | 实测 `filter: none → brightness(.95) saturate(.97)` |

### 也别学它三处（全文见文档第八节，共七处）

- **完全没有 stagger**：12 张同帧入场，慢机器上像"闪一下"。加 `--i × 40ms`、封顶第 8 张就够。
- **动作按钮只在 hover 出现且静止 `pointer-events:none`**：触屏首次点按会"点空"。`(hover:none)` 下应常显。
- **无限滚动没有终止态文案**：滚到 84 张时用户不知道还有多少。补「共 116 个，已全部加载」。

### 重采

```powershell
node E:\SKIl.1\.tools\probe-hn1.mjs   # 结构 / 45 个 :root 变量 / 全部 keyframes / 声明计数
node E:\SKIl.1\.tools\probe-hn2.mjs   # 23 条 transition + 3 条 animation 原文 + reduced-motion + 卡片计算值
node E:\SKIl.1\.tools\probe-hn3.mjs   # hover 前后计算值对比 + 无限滚动（12 → 84 张）
```

坑：读"规则原文"必须遍历 `document.styleSheets[].cssRules`（含 `@media` 内层），`getComputedStyle` 只给最终值，拿不到 reduced-motion 块；伪元素要 `getComputedStyle(el,'::before')`。
## 外部规则集蒸馏：工艺底线与反模板

参考站告诉我们「别人长什么样」，这两份外部规则集告诉我们「什么是做错了」。都不是本站实测，是**判据**——所以单独立两节，不带任何站点数值。

| 产出 | 来源 | 拿走什么 | 怎么用 |
| --- | --- | --- | --- |
| [`references/craft-floor.md`](references/craft-floor.md)（11.8KB / 十节） | impeccable 的 `skill/reference/craft-floor.md`（Apache-2.0，**只蒸馏判据，未复制原文**） | 九条做完才看的 verify（对比度 4.5/3、深度须偏移+模糊、标题上间距 > 下间距、行宽 65–75ch、一个有意识的动效时刻、五态与键盘焦点、**浏览器原生表面**、文案、覆盖）；深度三选一（发丝/边距/阴影，禁幽灵卡）；四件原生表面 CSS；骨架层默认别做；表面禁令表；材质诚实；裁剪原则 | 交付前最后过一遍；把它当「手感」的底线，不是风格建议 |
| [`references/anti-slop.md`](references/anti-slop.md)（22.3KB / 十节） | design-taste-frontend 的单文件技能（1,206 行；原文件未声明许可证，**规则重写，未复制原文与附录**） | Design Read 一句话；**三档旋钮**（VARIANCE / MOTION / DENSITY，基线 8/6/4）；官方设计系统怎么选；hero 四条硬规则；布局族与 Z 字上限；**三把锁**（主题/色/形状）；图片优先级；**8 组 AI tell**；中文站改写条款；**34 条 pre-flight** | 从 0 生成时第 2 步之后、第 6 步之前各过一遍；做重设计时先用它判断「现在这套是不是默认答案」 |

### 三招值得直接搬

| 招 | 为什么有效 |
| --- | --- |
| **深度三选一：发丝圈 / 边距 / 阴影** | 90% 的「廉价感」来自白底白卡靠一点模糊阴影分辨（幽灵卡）。三选一之后，同一层永远只有一种分界语言 |
| **三把锁：主题锁 / 色锁 / 形状锁** | 「越做越丰富」的典型翻车是中途反色、加第二个强调色、圆角每节换一套。三把锁把这类改动挡在门外 |
| **浏览器原生表面**（`::selection` / `caret-color` / `scrollbar` / `:focus-visible` / `text-underline-offset`） | 四行 CSS，手感立刻从「网页」变成「做过」；也是最能说明「这个人真的在用这个界面」的细节 |

### 别照抄的地方

- **impeccable 的「全禁 eyebrow」太绝对**：本站语料里 eyebrow 在 4 个营销站上都成立。裁决见 `craft-floor.md` 第八节——取「密度 ≤ ⌈节数 ÷ 3⌉」，产品站不用，全站只留 1–2 个。
- **design-taste 的英文条款不能直搬中文站**：em-dash 全禁在中文里要改成「——」且一页 ≤ 2 处；衬线标题必须补 `"Songti SC","Source Han Serif SC"` 字体栈；别用「张三/李四」。第七节整节是中文改写条款。
- **两份都不管「数据从哪来」**：`{{TODO: 要什么}}` 占位规范仍以 [`references/copy-and-content.md`](references/copy-and-content.md) 为准。

### 重取

```bash
# 源头一：impeccable（Apache-2.0）
sed -n '1,80p' 'E:\impeccable-main\impeccable-main\skill\reference\craft-floor.md'

# 源头二：design-taste-frontend 单文件规则集
wc -l 'E:\实验室打卡预约系统-交接包-20260910\实验室打卡预约系统\.claude\skills\design-taste-frontend\SKILL.md'
```

两份都是**别人写的规则**，不是实测。要引用具体数值时，一律回 `design-evidence.md`。

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
