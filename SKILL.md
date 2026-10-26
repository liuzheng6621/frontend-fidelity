---
name: frontend-fidelity
description: >-
  把界面做对、做实：既能按设计稿/截图还原并整改已有界面，也能从 0 生成一套能验收的前端骨架——
  企业后台与管理端、移动 H5/小程序、营销落地页、多端一致性、Logo 与视觉资产整合。
  当用户说「优化/美化这个页面」「照着这张截图做」「后台太难看了」「统一一下风格」
  「这个按钮/表格/空状态不对」「移动端适配」「验收一下前端改动」「截图对比」
  「从零做一个页面/后台/落地页」「搭个骨架」「先给我一套设计令牌」时使用。
  自带可运行脚本：多视口多主题截图、结构与 WCAG 审计、对比度检查、登录态导出、
  参考站实测探针、仓库残留清理、跑项目自带的质量门，以及 scaffold.mjs 一键生成骨架。
  参考库是 20 个真实站的实测数据 + 八份单站蒸馏（营销页 / 工具站 / 密版图墙 / 疏版图墙 / 陈列页 / 灵感库 / 风格库 / 杂志目录），
  外加动效规格、工艺底线、反模板清单与视觉细则层（含浏览器原生表面、三把锁、动效五档与三档降级），
  按页面类型对到具体文件与配方小节。
  不用于：纯逻辑 bug 修复；插画/海报等纯视觉创作（那属于 canvas-design）。
license: MIT
---

# 前端保真度（frontend-fidelity）

目标：**让界面和它声称的样子一致，并且真的能用**。改完必须能给证据——截图、审计报告、通过的构建。

三条不可妥协：

1. **先看再改**。没跑过 `screenshot.mjs`、没看过现状截图，不要动一个像素。凭想象重写是大面积回归的主要来源。
2. **不引入新体系**。已用 Tailwind 就别插 CSS-in-JS，已有组件库就扩展它。
   换设计体系要单独提案，不能夹在「美化一下」里偷偷做。
3. **改完自证**。截图 + 审计 + 构建必须全绿才算完成；「应该没问题」不是完成。

## 可执行脚本

脚本就在本 Skill 的 `scripts/` 下，用 `node`/`python` 直接跑，不需要安装本 Skill。
在**目标项目根目录**执行，依赖只装一次：`npm i -D playwright && npx playwright install chromium`，
以及 `pip install pillow numpy`（只要裁图时）。

| 脚本 | 用途 | 什么时候跑 |
| --- | --- | --- |
| `scripts/screenshot.mjs` | 多视口 × 多主题全页截图（自动滚动触发懒加载） | 动手前拍基线、交付前拍终版 |
| `scripts/audit.mjs` | 结构检查 + axe WCAG 2.1 A/AA + CLS + 动效 | 每次改完必跑 |
| `scripts/auth.mjs` | 有头浏览器人工登录，导出 `auth.json` | 管理端/有登录墙的页面，只做一次 |
| `scripts/contrast_check.py` | 对比度审计（支持 oklch/color-mix/Tailwind v4） | 定色板时、深色主题上线前 |
| `scripts/crop_logo.py` | Logo 裁边、正方形化、导出尺寸 | 拿到品牌图之后 |
| `scripts/hygiene.mjs` | 找无引用组件/资源/样式、重复路由 | 改版收尾、合并前 |
| `scripts/run_checks.mjs` | 跑项目自带的 lint/typecheck/test/build | 交付前最后一步 |
| `scripts/scaffold.mjs` | 从 0 生成骨架：五套人格（含印刷/杂志）+ 深度三派 + 六类页面 + 生成期对比度自检 | 要从零做一个页面/后台/落地页/陈列目录时，先生成再改 |
| `scripts/probe-ref.mjs` | 量任意参考站的真实字体/字阶/配色/圆角/间距/控件高度 | 想「像这个站」但说不清具体数值时 |

最短可用流程（把 `<url>` 换掉）：

```bash
# 1. 有登录墙就先导登录态（只需一次）
node scripts/auth.mjs --url http://localhost:5173/login --out auth.json

# 2. 拍基线截图（改动前）+ 现状审计
node scripts/screenshot.mjs --url http://localhost:5173/ --out .design/before
node scripts/audit.mjs --url http://localhost:5173/ --themes light,dark --storage-state auth.json

# 3. 改……

# 4. 拍终版 + 审计 + 质量门（这一步不绿不算完成）
node scripts/screenshot.mjs --url http://localhost:5173/ --out .design/after
node scripts/audit.mjs --url http://localhost:5173/ --themes light,dark --storage-state auth.json
python scripts/contrast_check.py src/styles/*.css
node scripts/run_checks.mjs            # 仅当项目有 package.json；静态站会明确跳过
```

`audit.mjs` 的判定标准：**退出码非 0 就不能交付**。它把问题分两级——
`error`（白屏、横向溢出、坏图、Logo 拉伸、交互元素重叠、axe serious/critical）必须修；
`warn`（文本裁切、点击区过小、字号过小、CLS 偏高、axe moderate）逐条看过，能修就修，
不修要在交付说明里写明原因。`hygiene.mjs` 的结果一律是「待确认」，不是「可以删」。

`--base http://localhost:5173` + `--pages /,/orders,/settings`（相对路径批量跑，省得写全 URL）、
`--themes light,dark`（dark 会同时打上 `.dark` 类、`data-theme="dark"` 与 `prefers-color-scheme`，
三种切主题写法都能出图）、`--storage-state auth.json`、`--reduced-motion`、
`--expect-text "订单列表"`（确认没被重定向到登录页）这些参数按需组合。详细参数见 `README.md`。

## 先判断是哪一种活

| 用户说的 | 走哪条 | 起点 |
| --- | --- | --- |
| 「优化/美化/整改这个页面」「照这张截图做」「统一一下风格」「验收一下改动」 | **模式 A：整改与还原**（下面 1–5 步） | 已有代码，先截图再动手 |
| 「从零做一个」「搭个后台/落地页」「先给我一套设计令牌」 | **模式 B：从 0 生成**（见「从 0 生成」一节） | 空目录，先选型再生成 |

两条路最后过同一道闸：screenshot.mjs + audit.mjs（项目有 `package.json` 时再加 run_checks.mjs），退出码 0 才算完成。
`scaffold.mjs` 的生成物是纯静态页、没有 `package.json`，质量门就是「截图 + 审计 + 对比度」三项。

## 工作流

### 1. 勘察（不看代码先看界面）

- 拿基线截图：桌面 1440、平板 768、移动 390 三档，浅色 + 深色。
- 记下现状问题清单（用 `audit.mjs` 的输出当起点，但要自己看图像它漏掉的：错位、层级混乱、配色脏、字重跳）。
- 读设计稿/截图：**注意它是什么设备、什么缩放**。截图里 1px 的线在 2x 图上就是 0.5px，别照抄像素值，抄比例和关系。
- 摸清技术栈与既有约定：设计令牌在哪个文件、用的什么单位、组件库是什么版本、有没有暗色实现、断点在哪。**新写的代码要和隔壁文件长得像一家人。**

### 2. 定视觉基线（改动前先写下来）

在 `references/css-recipes.md` 找起步模板，把四件事定死再动手：

- **色板**：背景层次（page / surface / raised）× 文字层次（primary / secondary / muted / disabled）+ 1 个品牌色 + 语义色（成功/警告/危险/信息）。每个颜色写成变量。
- **字阶**：5–7 档就够（如 12/13/14/16/20/24/32），每档绑定行高和字重。**不要出现 15px、17px 这种手工微调值。**
- **间距**：4 的倍数体系（4/8/12/16/24/32/48/64），禁止 13px、22px 之类的随手感值。
- **层级**：靠背景明度差 + 1px 边框建立，阴影只给真正浮起的元素（下拉、弹窗、抽屉）。三套阴影封顶。

同时确认三件容易漏的事：圆角规范（容器 8–12px、控件 6–8px、标签 4px 全一致）、
**焦点态样式**（键盘能用，见「可访问性」）、**空/载/错三态**（每个数据区都要有）。

**数值拿不准就去量，不要猜。** 想看齐某个站（客户给的参考站、竞品后台、Dribbble 里的网址）：

```bash
node scripts/probe-ref.mjs --url https://linear.app --out .design/ref --name linear
node scripts/probe-ref.mjs --url http://localhost:5173/orders --theme dark --name orders-dark
```

它会输出那个站的真实字体栈、字号分布、h1/p/th/td 的字号-行高-字重、底色与文字色、圆角档位、
间距频次、表格行高、控件高度、侧栏/顶栏尺寸、卡片靠阴影还是靠边框、图片 lazy 比例。
把这些数字对着 `references/design-evidence.md` 的跨站统计看一眼，就知道该抄什么、自己是不是抄过头了：
营销站的 96px 大标题搬到管理端就是错的，后台正文 13–14px、控件 32px、表格行高 53px 才是同行区间。

### 3. 动手改

- 一个提交只做一类事：调色板 / 改布局 / 补状态 / 修可用性。混着改出问题无法回滚定位。
- 先改组件原子（按钮、输入、标签、卡片），再改页面。原子改好，页面自然统一。
- 每次改完立刻 `screenshot.mjs` 局部看图，不要攒一大坨再一起看。
- 保护既有行为：给按钮加 hover 别动 onclick；改间距别顺手改 `overflow`。
- 移动端从我方视角写：**390px 宽度下能单手操作、没有横向滚动、点击区 ≥44px**。

### 4. 验收（必须跑，见上面的最短流程）

- 截图对比：`before/` 与 `after/` 逐张看。**每个视口两个主题都要看**，深色模式最容易崩。
- `audit.mjs` 退出码 0，或每条残留 warn 都有解释。
- 键盘走一遍：Tab 能到所有可交互元素、焦点可见、Esc 能关弹层、Enter 能提交。
- 缩放 200% 走一遍：文字不重叠、不裁切。

### 5. 交付说明（写给人看）

固定四段，别写成流水账：

```
改了什么：<3–5 条，按影响面排序>
为什么：<每条一句理由，指向具体问题：对比度 3.1→4.6、移动端横向溢出 42px>
验证：<贴命令与结论：audit 0 error / 3 warn（说明原因）/ run_checks 全通过 / 截图路径>
未做与风险：<没改的、要产品/设计定的、已知局限>
```

## 从 0 生成（模式 B）

目标是**先拿到一个能跑、能量、能改的骨架**，不是一次成型。六步，每步都有产物。

### 1. 选型（别跳过）

用 `references/page-patterns.md` 第一节的表：一句话需求 → 页面类型 → 人格（`rational` 克制方正／`editorial` 字重轻留白大／`warm` 暖色圆角厚）。
同时定下页面清单：营销站至少 1 页落地页；后台至少 3 页（列表 + 表单 + 状态页），认证页按需。
拿不准才探参考站（`probe-ref.mjs`），别一上来探三个。

### 2. 生成骨架

```bash
node scripts/scaffold.mjs --persona rational --out src --pages landing,catalog,app,form,auth,states
node scripts/scaffold.mjs --persona warm --out preview --accent 20 --pages landing,form --dark
node scripts/scaffold.mjs --persona print --pages catalog                    # 方格纸 + 硬阴影
node scripts/scaffold.mjs --persona magazine --pages catalog                 # 衬线刊头 + 电光蓝
```

产出 `tokens.css / base.css / components.css / depth.css / catalog.css / ui.js` + 六类页面，摘要里还会打印**深度语言**（hairline / soft / hard）、动效阶梯与**生成期对比度自检**（三组关键配对，不达标会直接指出来）。`--dark` 决定深色是不是一等公民（不留后路那种才有意义）。

### 3. 改令牌，不是改样式

按 `references/design-tokens.md` 修三处：品牌色阶（别手填 11 个 hex）、中性色温度 `--n-*`、密度与圆角 `--control-h` / `--r-*`。改完刷新，**所有页面一起变**才算对了。

### 4. 换成真内容

`references/copy-and-content.md`：标题公式、按钮动词表、空/错/载文案公式。生成物里所有 `{{TODO: ...}}` 必须清零或写进交付说明（`grep -rn "{{TODO" src/`）。

### 5. 补结构、补状态

按 `references/page-patterns.md` 的骨架表补区块（后台列表少筛选/分页/空态就是没做完）；按 `references/component-spec.md` 对齐控件规格（三档密度、按钮 4 层级、表格对齐）。

### 6. 验收

同模式 A 的前半：先起本地服务（`file://` 会被 CORS 干扰）→ 三视口双主题截图 → `audit.mjs` 0 error / 0 warn → `contrast_check.py <css 目录>`。
**生成物没有 `package.json`，不跑 `run_checks.mjs`**（它会明确提示跳过）；验收就是截图 + 审计 + 对比度三件。

**生成物是起点不是成品**：骨架解决的是层级、间距、状态、可访问性这些容易漏的硬骨头；视觉个性还得自己那一下（见 `frontend-design`）。

## 细则去哪找

「怎么做」的细节已下沉到 `references/visual-system.md`，按需查，不要一次背完：

| 场景 | 看哪节 |
| --- | --- |
| 中文标题与标点、中英混排 | 中文排版 |
| 配色、色阶生成、对比度 | 色彩 |
| 间距节奏、容器与栅格 | 间距与结构 |
| 要不要投影、圆角给谁、卡片分层 | 层级与阴影 |
| 动效时长与缓动、编排、降级 | 动效（完整规格见 `references/motion-spec.md`） |
| 卡片 hover 怎么“活”起来、聚光描边 | `references/holynova-motion.md` + `references/css-recipes.md` §19 |
| 要「印刷品」气质：方格纸底、墨黑框、硬阴影、元数据黑条 | `references/luckymaomi-catalog.md` + `references/css-recipes.md` §20 |
| 要「杂志目录」气质：左栏目录 + 3 列图版 + 衬线刊头 + 一个电光蓝 | `references/muzli-gallery.md` + `references/css-recipes.md` §21 |
| 要做「一批彼此不同东西」的索引（风格库 / 模板库 / 灵感库 / 案例墙） | `references/page-patterns.md` §2.9 + `node scripts/scaffold.mjs --pages catalog` |
| 图墙 / 管理端列表 / 三态 / 表单 / 登录墙 | 页面结构 |
| Logo、图片、图标 | Logo 与品牌、图片与视觉资产 |
| 按钮 8 个状态、点击区尺寸 | 控件与状态 |
| 窄屏、深色、读屏 | 响应式、深色模式、可访问性 |
| 「这看起来像 AI 做的」 | 避免（像 AI 生成的信号） |

**先记住这几个实测数就能动手**（18 站中位数 / 带宽，出处见 `references/design-evidence.md`）：

- 正文 14–16px（均值 14.8），行高 1.42，正文列宽 65–75ch。
- H1 均值 72.6px（带宽 36–140），H1 / 正文比 2.3–8.8；营销页标题一律 `clamp()`。
- 控件高三档 32 / 40 / 44；圆角按控件大小 4–8 → 12 → 16 → 胶囊，**每档都要有归属**。
- 间距基数 4，常用 8 / 12 / 16 / 24 / 32 / 48 / 64 / 96；区块上下留白不等（上 < 下更常见）。
- 阴影选一派用到底：靠边框 / 发丝圈+内阴影 / 负扩散 / 全站零阴影 / 零阴影零边框；同屏不混。
- 图墙选一派：密（5 列 gap 0）/ 疏（4 列列距 24）/ 活预览（3 列 gap 32）；同屏不混。
- 动效 120 / 180 / 240 / 400 / 600，上限 800（**印刷派例外：状态切换 100ms linear、按钮 160ms**，见 `motion-spec.md` 二·补），只动 `transform` 与 `opacity`；卡片 hover 要四件套一起变（位移 + 边框 + 阴影 + 媒体压暗），只变一样会显得“抖了一下”。
- 移动端 390 宽：无横向滚动、点击区 ≥44×44、底部避开安全区。

## 参考文件

- `references/design-evidence.md` — 20 个实测成功的站点（17 个 A 组：营销/产品站 11 + 内容陈列站 6，另有 shadcn/linear/cal.com 三个后台）量出来的
  字体、字阶、行高比、间距基数、圆角档位、表格密度、控件高度，以及「哪些能抄、哪些不能抄」。
  **不知道该定多少数值时先看这里，比凭感觉猜准。**
- `references/wegic-design.md` — wegic.ai 单站全量蒸馏：完整 `--wg-*` 令牌、塑料按钮的 6 层内阴影、
  字阶实测表（86.4/56/48/40/36/34/28/20/15/13）、区块高度节奏、「能搬什么 / 不能搬什么」迁移口径。
  **做产品站、AI 工具站，或想给现有后台加「质感」时先读这份。**
- `references/jsdesign-design.md` — 即时设计 js.design 单站全量蒸馏（与 wegic 互为反面）：
  冷灰蓝底 `#f3f7fb` + 白卡 `r22`、「负扩散 + 发丝环」三件套阴影、130px 区块节奏、零 @font-face 的系统字体栈、
  三色阶段 pill、输入+按钮同容器、竞品对比列；以及它自己**七处没做好的**（13px 正文、非整数尺寸、H2/H3 倒挂、
  900 伪粗、hero 文字双份叠加、促销条遮挡、对比表水分）。
  **做中文工具站、SaaS 首页，或要「浅色 + 彩卡」这套气质时先读这份。**
- `references/uishijie-design.md` — UI 世界（内容/作品聚合站）单站全量蒸馏，语料里**唯一的内容站样本**：
  零 gutter 的 5 列图墙（列宽 300、卡片 padding 12 充当间距）、**卡片不画壳**（无背景/边框/圆角/阴影）、
  四档字号（12/14/16/18）、文字 tab 筛选、Bootstrap 式分页；以及它自己**七处没做好的**
  （移动端零适配、容器 1500 溢出、无 h1、hover 只给小字、float 布局、表单无障碍、广告浮层压卡片）。
  **做图墙、资源列表、模板库、社区信息流时先读这份；后台表格不要套它的密度。**
- `references/zcool-design.md` — 站酷（内容社区**频道头版**）单站全量蒸馏，与 UI 世界同一个「内容站」组的另一极：
  **疏版图墙**（4 列 283、列距 24、行距 36、图强制 4:3、卡片同样不画壳）、**两级分类用形状区分**（56px 文字 tab 配
  28×3px 短下划线 / 31px 胶囊）、全站仅 4 档字号（14/12/16/40）、`0.8px` 固定发丝、直角分页、301px 频道头；
  以及它自己**七处没做好的**（移动端零适配、顶栏不 sticky、hover 太弱、标题截断无 title、频道头吃 660px、
  `0.8px` 高 DPI 会虚、banner 与容器错 30px）。**做作品集、频道页、feed 流时先读这份。**
- `references/stylekit-design.md` — StyleKit（风格目录站）单站全量蒸馏，语料里**第一个「卡片即预览」样本**：
  149 种风格每张卡用真 CSS 渲染迷你 DOM、**6px 四段色板条**（底/字/强调/辅）、**直角陈列区 + 控件 6px**、
  Playfair 衬线标题 + Albert Sans 正文 + Fragment Mono 标签的三件套、hover 只两笔、3 列 gap 32、首屏 24 张；
  详情页第二套版式（60px H1 / 色板给角色名 / 折叠提示词）；以及它自己**七处没做好的**
  （深色开关无效果、预览 DOM 未 aria-hidden、预览小字被裁、无限滚动无出口、图标钮 24×24、圆角被下拉破功、上下两条固定带挤首屏）。
  **做风格库、模板站、主题市场、组件变体陈列时先读这份。**
- `references/uinotes-design.md` — UI Notes（真实产品 UI 截图灵感库）单站全量蒸馏，**「隐形界面」的极端样本**：
  卡片不画壳、不画边框、0 阴影，3 列 440 里塞一条 1248 宽的截图带、外层裁切只露 1.8 张；**数字当标题**
  （48/500 + `#446bf8` 只给两个数字）；图标墙与 app 图标共用 80×80 / r24；2·4·6·16·20·24 的线性圆角阶梯；
  全站 `line-height: normal`；以及它自己**七处没做好的**（viewport 锁 1420 整站缩小、无 h1、无页脚、
  无限滚动无出口、裁切无提示、水印烧进像素、促销条与主体两套色系）。
  **做灵感库、作品陈列、评测画廊、截图站时先读这份；它也是「素材比界面重要」时的对照底线。**
- `references/luckymaomi-catalog.md` — 猫叫兽 UI 风格库（`luckymaomi.github.io/ui/`）单站全量蒸馏，
  **「印刷品外壳 + 三层展示体系」样本**：方格纸底板（两条 1px 渐变）、26 个令牌（墨黑边框 + `4px 4px 0` 硬阴影 + 2px 圆角一档）、
  76/950 与 40/950 的超重标题配 18/400 卡片标题、hover 只「描黑 + 落硬阴影」不位移、**全站 3 条 transition 全 100ms linear**；
  动效库 10 域 57 条用「触发时机 · 时长」黑条当索引、目录不放动图、详情页用「删类→回流→加类」重放纯 CSS 动画；
  展示三层 = 目录（静态 SVG 预览）→ 规格页（规则 + 组件预览）→ showcase（真做一页 6–7 段，把规格印成四格条）。
- `references/page-patterns.md` — **从 0 生成时的第一站**：一句话需求 → 页面类型 → 人格的选择表，
  七类骨架（落地页/工具站首页/内容站/管理端列表/详情/表单/认证）各自的必备要素与尺寸区间，
  空/错/无权限三变体，移动端差异，内容最低量要求。**先在这里定骨架，再写代码。**
- `references/component-spec.md` — 11 类组件的规格卡：三档密度（32/36–40/44–48）、按钮 4 层级、
  表单/表格/弹窗/提示/分页/空态各自的尺寸、对齐与禁忌。**写组件前对一遍，别自创尺寸。**
- `references/design-tokens.md` — 五套人格预设（rational / editorial / warm / print / magazine）的完整令牌，深度语言三派（发丝 / 软影 / 硬影）怎么配，
  色阶生成算法（11 档 L%+S 系数）、间距、字阶（含行高）、圆角与阴影配对、暗色推导、命名约定。
- `references/visual-system.md` — **视觉与结构细则的完整版**（从本文件下沉）：中文排版、色彩与色阶、间距节奏、
  层级与阴影五派、动效、页面结构（图墙/列表/三态/表单/登录墙）、Logo 与图片、控件 8 状态、响应式、
  深色模式、可访问性，以及「像 AI 生成」的完整清单。**入口只留速查数字，做细节时来这里。**
- `references/copy-and-content.md` — 文案规格：标题公式、按钮动词对照、空/错/载文案公式、
  长度预算、中文标点与空格、三种人格语气、`{{TODO}}` 占位写法。**交付前用它清一遍假文案。**
- `references/css-recipes.md` — 设计令牌、表格、骨架屏、空状态、深色模式的可复制片段；
  第 12–17 节是六个参考站的可粘贴风味（塑料按钮+发丝圈 / 浅灰蓝+彩纸卡 / 零 gutter 图墙 / 报头+等宽图版 / 风格卡+色板条 / 隐形界面+截图带）。
- `references/motion-spec.md` — **动效规格**：四条底线（只动 transform/opacity、有动机、可打断、三档降级）、
  时长五档（120/180/240/400/600，上限 800）与四条缓动（进入 ease-out / 离开 ease-in / 双向 in-out / 回弹只给直接操作）、
  位移与缩放允许量、编排（交错 40–60ms、≤ 8 个、只演一次）、滚动驱动（IntersectionObserver / `animation-timeline` /
  禁 scroll 事件 / 禁劫持）、六类交互配方、三档降级写法、性能预算（同屏 ≤ 12 元素动、will-change ≤ 3）、
  自测四步、动效 AI tell。**要加任何动画之前先读第 1、2 节。**
- `references/holynova-motion.md` — **单站动效蒸馏（案例）**：23 条 transition / 3 个 keyframes / 1 条主缓动、实测 9 档时长，聚光描边卡（`::before` + `mask content-box exclude` 抠 1px 环、`::after` 环境光、坐标走 CSS 变量）、hover 四件套与 `:active` 回落、无 stagger 的批量入场、reduced-motion 连装饰层一起关，附七处别照抄与十步搬用清单。
- `references/craft-floor.md` — **工艺底线**（来源：impeccable 的 craft-floor，Apache-2.0，只蒸馏判据未复制原文）：
  九条做完才看的验证（对比度 / 深度偏移+模糊 / 标题上间距 > 下间距 / 行宽 65–75ch / 一个有意识的动效时刻 /
  五态与键盘焦点 / **浏览器原生表面** / 文案 / 覆盖）、深度三选一（发丝·边距·阴影，禁幽灵卡）、
  四件原生表面 CSS（`::selection`、`caret-color`、`scrollbar`、`:focus-visible` + `text-underline-offset`）、
  骨架层默认别做、表面禁令表、材质诚实、裁剪原则，以及**与本站语料四条冲突的裁决**（eyebrow 密度、serif 使用、
  纯黑舞台、阴影派别）。**任何交付的"最后一道手感"在这里。**
- `references/anti-slop.md` — **反模板清单**（来源：design-taste-frontend 的 1,206 行规则集，规则重写，未复制原文）：
  Design Read 一句话、**三档旋钮**（VARIANCE / MOTION / DENSITY，含与三套人格的对照值）、官方设计系统怎么选、
  hero 四条硬规则、布局族与 Z 字上限、**三把锁**（主题·色·形状）、图片优先级、**8 组 AI tell**（编号 eyebrow /
  装饰状态点 / 斜体降部 / 假预览 / 长列表评分条 / 动效）、中文站改写条款、**34 条 pre-flight**。
  **从 0 生成时，第 2 步（生成骨架）之后、第 6 步（验收）之前都要过一遍。**
- `references/review-rubric.md` — 交付前逐项勾的验收清单（含脚本命令与判定标准）。
- `README.md` — 脚本全部参数与常见问题。


- `references/muzli-gallery.md` — Muzli Inspiration（`muz.li/inspiration/motion-design/`）单站全量蒸馏：
  **左栏 sticky 目录（220）+ 主区 3 列（348×309，gap 40/32）**、**衬线刊头**（Instrument Serif 48/1.0，与 Poppins 296:9）、
  **卡片无壳**（图 4px 圆角 + `0 0 0 1px rgba(0,0,0,.05)` 发丝环、本体零边框零阴影）、**35px tag 药丸**（当前项黑底）、
  `New` 徽标（11.2/600 电光蓝 `#2e54ff`）、**页脚用主色 10% 面板**、面包屑 + 「N 条新增 · 最后更新」行；
  以及它的三处反面：**卡片零 hover 零 focus**、广告卡与内容卡同构、左栏跳转与顶部过滤两套语义。
  **做灵感库、专题目录、杂志式陈列、带左栏导航的内容站时先读这份；它的「零 hover」是缺陷，别当风格抄。**## 许可

MIT，见根目录 `LICENSE`。第三方例外：`scripts/vendor/axe.min.js` 是
[axe-core](https://github.com/dequelabs/axe-core) 4.14.0，按 **MPL-2.0** 分发，
保留其文件头许可声明即可，不随本仓库的 MIT 一起改变。
