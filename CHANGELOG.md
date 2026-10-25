# 更新日志

版本按 `vMAJOR.MINOR.PATCH` 打 Tag，与 Gitee Releases 一一对应。分发包统一叫
`frontend-fidelity.zip`，由 `git archive` 从 Tag 快照生成，只含被 git 跟踪的文件
（不含 `shots/`、`audit-report.json`、`.design/`）。

## v1.5.1 - 2026-10-30

只改文档：给 README 加一张**选型索引表**。此前十二份参考数据平铺在目录里，读的人得先点进各节才知道该抄哪份；现在按「你在做什么页面」直接对到文件与配方小节。代码零变更。

### 新增

- **`README.md` 顶部新增 `## 该抄哪份参考`**（插在目录之前，TOC 首条）：一张 6 行表把页面类型对到参考文件——营销落地页 → `wegic-design.md` + 配方 §12、工具站/SaaS 首页 → `jsdesign-design.md` + §13、密版作品墙 → `uishijie-design.md` + §14、疏版作品墙 → `zcool-design.md` + §15、目录/陈列页 → `stylekit-design.md` + §16、后台/管理端 → `page-patterns.md` + `component-spec.md` + `design-tokens.md`（并注明后台在单站样本里没有，横向数据走 `design-evidence.md` B 组）。
- 表下补两条读法提醒：**别把「他们的取舍」当规范**（三份中文内容站都是系统字体栈 + 13–14px 正文，那是塞密度的代价）；**单站样本只证明「可以这么做」**，判断行业常态去 `design-evidence.md` 看 17 个站里出现几次。

### 修改

- `README.md` 版本号 `v1.5.0` → `v1.5.1`；目录加首条锚点；全文 EOL 归一为 CRLF（此前混了 68 行 LF）。
## v1.5.0 - 2026-10-29

第五个单站蒸馏样本：**StyleKit 风格目录 stylekit.top/zh/styles**，语料里第一个**风格目录站**，
也是第一个「**卡片即预览**」样本——149 种风格，每张卡的预览区不是截图，而是用那个风格自己的 CSS
现场渲染的迷你界面。它把「陈列一批彼此不同的东西」这件事讲清楚了。代码未变，全部是参考数据与硬规则。

### 新增

- **`references/stylekit-design.md`**（22.2KB）：单站全量蒸馏——令牌（纸色 `#fafafa` / 墨 `#0a0a0a` / 次 `#6b7280` / 线 `#e5e5e5` / 绯红 `#e63946`）、**直角陈列区 + 控件 6px + 图标 50%** 的圆角分工、chrome 零阴影、Playfair + Albert Sans + Fragment Mono **三件套分工**（并记下「中文标题靠系统宋体兜底」这个坑）、卡片六层结构、6px 四段色板条、hover 两笔、三层筛选降级、详情页第二套版式（60px H1 / 色板给角色名 / 折叠提示词），以及它自己**七处没做好的**（深色开关无效果、预览 DOM 未 `aria-hidden`、预览小字被裁、无限滚动无出口、图标钮 24×24、圆角被下拉破功、上下两条固定带挤首屏）。
- **`references/css-recipes.md` 第 16 节**：「风格卡」可直接粘贴——`--sk-*` 令牌、`.sk-card`（六层结构 + 两笔 hover + `:focus-within`）、`.sk-preview`（`container-type: inline-size` + `scale(calc(100cqw / 371))` 整体缩放）、`.sk-palette`（6px 四段）、`.sk-chips` / `.sk-chips--type`（38 / 32 两层）、`.sk-stats`（`tabular-nums`）、`.sk-rowlink`、移动端两列与「只留中文名」。

### 修改

- `references/design-evidence.md` 升到 **17 个站（A 组 14：11 营销/产品 + 3 内容陈列站）**：新增 StyleKit 的 18 行实测补充表；正文均值 14.8→**14.9px**、H1 均值 75.7→**72.6px**（13 站有 h1）、H1/正文比下限 2.9→**2.3**（StyleKit 36/16 = 2.25，页面主角不是标题时标题就该退回 2 倍出头）、等宽做第二字体 5/11→**6/12**；新增「**三件套分工**」「**第五种圆角做法：直角派**」「**阴影第五派：chrome 零阴影，硬阴影只属展品**」「**网格密度第三派：活预览墙 3 列 gap 32**」四条判断；招式表加 9 条（27–35）；反例表加 4 行（深色开关不生效、预览小字、无限滚动无出口、整卡零动效）。
- `SKILL.md`：「层级与阴影」加「陈列区零阴影」（展柜不能浮起来）；「内容列表 / 图墙」下新增 **`#### 陈列「一批彼此不同的东西」`** 8 条（卡片即预览 / 容器查询缩放 / `aria-hidden` / 6px 四段色板 / 三个数字定死 / hover 两笔 / 一页两套版式 / 详情页色板给角色名）；避免清单加 4 条（截图做预览、预览小字不缩放、深色开关没反应、无限滚动无出口）；参考文件节加 `stylekit-design.md` 条目。
- `references/review-rubric.md`：新增第九节「陈列类页面额外六条」；红旗清单加 3 条（深色开关没效果、截图做预览、无限滚动无出口），原「红旗」顺延为第十节。
- `README.md`：新增「参考站蒸馏：StyleKit 风格目录」整节（四块产出 + 三招表 + 七处也别学 + 三个重采坑）；参考数据份数 十一→十二；TOC、分工表、仓库结构树同步；版本号 `v1.4.0` → `v1.5.0`。
## v1.4.0 - 2026-10-28

第四个单站蒸馏样本：**站酷 zcool.com.cn/discover/17（内容社区的频道头版）**。
它和 UI 世界同属「内容站」，但走的是相反的一极——UI 世界是「密」（5 列、`gap: 0`、25 张/页），
站酷是「疏」（4 列、列距 24、行距 36、8 张/屏）。两个样本合起来才说明：**图墙密度是选择，不是唯一解。**
代码未变，全部是参考数据与硬规则。

### 新增

- **`references/zcool-design.md`**（17.3KB）：单站全量蒸馏——令牌（白底 + `#FF5E3B` 只给注册/关注、`0.8px` 固定发丝、圆角 4/8/10/12/16/24/50% 每档有归属、胶囊用 16 而非 999）、**全站仅 4 档字号**（14/12/16/40，14px 承担 934 处）、版式节奏表（56/120/56/67/301/图墙/40/32）、组件配方（卡片 HTML 结构 + 三个定版数字），以及**七处它自己没做好的**（移动端零适配、顶栏不 sticky、hover 太弱、标题截断无 title、频道头吃 660px、`0.8px` 高 DPI 会虚、banner 与容器错 30px）。
- **`references/css-recipes.md` 第 15 节**：`.site-topbar`（sticky，补上站酷没做的）、`.btn-brand`/`.btn-ghost`、`.cat-tabs`（56px + 3px 短下划线）、`.cat-pills`（31px / r16 / 选中深底）、`.feed-grid`（4 列 + 列距 24 + 行距 36）、`.feed-card`（无壳 + `aspect-ratio: 4/3` + hover `scale(1.03)`）、`.pager-square`（直角），含 `≤1080px` 三列与 `≤760px` 两列。

### 修改

- `references/design-evidence.md` 升到 **16 个站（A 组 13）**：新增站酷的 18 行实测补充表；正文均值 14.9→**14.8px**、行高比 1.446→**1.44**、H1 均值 78.9→**75.7px**（12 站有 h1）、H1/正文比下限 3.1→**2.9**、浅色站 8→**9**；「主字体」段把「唯一的反例」改为**三个反例都是中文站**；圆角段补「档多不等于乱，乱的是同一语义用两个值」；阴影段补「图墙靠比例而不是盒子分栏」；网格密度段改写为**疏密两派**；招式补 5 条（形状分层 / 等宽定版 / 短下划线 / `0.8px` 发丝 / 顶栏 sticky）；反例表补 3 行（顶栏不固定、发丝宽、截断无 title）；第五节补「站酷 14px 配 1.36 只在卡片里成立」。
- `SKILL.md`：「内容列表 / 图墙」节加三条（**等宽网格不做瀑布流**、**两级分类靠形状分层**、**顶栏 sticky**）；避免清单加三条（hover 只让小字变色、长列表顶栏不 sticky、把 `0.8px` 当固定发丝）；参考文件节加 zcool 条目、份数 15→**16**、`css-recipes` 描述改为第 12–15 节。
- `references/review-rubric.md`：加 4 条验收（等宽不做瀑布、顶栏 sticky、两级分类靠形状、次级文字不低于 `#6b6b6b`、ellipsis 必配 title），并修好一处两条验收粘连在同一行的问题。
- `README.md`：新增「参考站蒸馏：站酷 ZCOOL」整节（四块产出 + 三招表 + 七处也别学 + 重采命令）；参考数据份数 十→十一；TOC、分工表、仓库结构树同步。
## v1.3.0 - 2026-10-27

第三个单站蒸馏样本：**UI 世界 uishijie.com**，也是语料里**第一个内容聚合站**。
前两个样本都在讲「一屏放一件事」，这个样本讲「一屏放几十个同质东西」——代码未变，全部是参考数据与硬规则。

### 新增

- **`references/uishijie-design.md`**（13.7KB）：单站全量蒸馏——令牌（紫蓝渐变头部、四档字号 12/14/16/18、全站仅 1 处阴影、圆角只有 5px 与 `0 20 20 0`）、零 gutter 图墙节奏（5 列 × 300、`gap: 0`、卡片 padding 12 充当间距）、组件配方，以及**七处它自己没做好的**（移动端零适配、容器 1500 溢出、无 h1、`#7f7f7f` 3.9:1、hover 只给小字、float 布局、广告浮层压卡片）。
- **`references/css-recipes.md` 第 14 节**：`.thumb-grid`（定宽列 + 居中，注释里给 `auto-fill` 响应式写法）、无壳 `.thumb`（`aspect-ratio` + `object-fit` + hover 缩放）、`.filter-row` 文字 tab、`.pager`，含 `≤1080px` 三列与 `≤640px` 两列。

### 修改

- `references/design-evidence.md`：uishijie 作为 A 组第 12 个样本并入统计（正文均值 15.0→**14.9px**、行高比 **1.446**、浅色站 7→**8**；H1 均值 78.9 并注明「11 站有 h1，它没有」）；新增「第四派：全站只 1 处阴影」「网格密度首次进统计」；招式补 4 条（不画壳 / 零 gutter / 同比例缩略图 / 文字 tab 筛分类）；反例表补 4 行（响应式完全没做、次级文字 3.9:1、hover 只给小字、无 h1）。
- `SKILL.md`：参考文件节加这条文档；`## 页面结构` 下新增「### 内容列表 / 图墙」7 条；避免清单加三条（给图墙每张图套壳、`height: auto` 排缩略图、「PC 版直接缩小」当移动端）。
- `references/review-rubric.md`：加 2 条验收（图墙比例/无壳/hover 给图；390px 下 `scrollWidth === innerWidth`）。
- `README.md`：新增「参考站蒸馏：UI 世界 uishijie」整节；参考数据份数 九→十；分工表与仓库结构树同步。

## v1.2.0 - 2026-10-25

新增第二个单站蒸馏样本：**即时设计 js.design**，与 wegic.ai 构成两个极端对照。代码未变，全部是参考数据与硬规则。

### 新增

- **`references/jsdesign-design.md`**（16.8KB）：单站全量蒸馏——令牌表（冷灰蓝 `#f3f7fb`、唯一实色 `#009dff` 64 处、三色阶段 pill）、三套阴影的职责分工、字阶实测、130px 区块节奏、组件尺寸，以及**七处它自己没做好的**。
- **`references/css-recipes.md` 第 13 节**：八色网格渐变（含白雾罩保对比度）、负扩散阴影三件套、分屏功能卡、输入+按钮同容器、阶段 pill、竞品对比列、毛玻璃头部。

### 修改

- `references/design-evidence.md`：js.design 作为 A 组第 11 个样本并入统计（正文均值 15.2→**15.0**、H1 均值 82.8→**78.9**、浅色站 6→**7**）；新增三类反例（13px 正文、H2/H3 倒挂、非整数尺寸）；「主字体」一条**纠正了旧结论**——原来写「没有一个用系统字体当主字体」，实测即时设计 0 份 @font-face。
- `SKILL.md`：参考文件节加这条文档；层级与阴影节加「负扩散阴影 + 两套分职」；避免清单加四条（em 缩放的非整数尺寸、标题标签与视觉不一致、900 字重做中文标、双份文字层不隐藏）。
- `references/review-rubric.md`：加 4 条验收（尺寸整数与圆角递进、阴影两套分职、标题层级不倒挂、滚动动画非当前层隐藏）。
- `README.md`：目录加「参考站蒸馏：即时设计 js.design」整节，分工表与结构树补对应行。
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