# 更新日志

版本按 `vMAJOR.MINOR.PATCH` 打 Tag，与 Gitee Releases 一一对应。分发包统一叫
`frontend-fidelity.zip`，由 `git archive` 从 Tag 快照生成，只含被 git 跟踪的文件
（不含 `shots/`、`audit-report.json`、`.design/`）。

## v1.9.1 - 2026-11-02

修掉外部代码评审提出的 7 处问题（4 个 P1 会让质量门假通过，3 个 P2 会误导照文档操作的人）：

- **对比度门不再假通过**：`scripts/contrast_check.py` 的位置参数现在支持目录（递归找 `*.css`），路径写错或目录里没 CSS 直接退出 2；此前传目录会静默输出「0 组」并退出 0。
- **点击区阈值统一到 44**：`scripts/audit.mjs` 的 `small-tap-target` 从 32 改成 44，与 `SKILL.md`、`references/review-rubric.md` 同口径；同时按 WCAG 2.5.8 豁免正文行内文字链接，复选框/单选框改量包裹它的 `label`。
- **模式 B 的验收闭环**：`scripts/run_checks.mjs` 在没有 `package.json` 时明确提示「跳过项目自带质量门」并退出 0（不再退出 2）；`SKILL.md` 的模式 B 第 6 步改为「截图 + 审计 + 对比度」三件，不再要求对静态生成物跑 run_checks。
- **生成器不再自己违规**：`scripts/scaffold.mjs` 去掉装饰 eyebrow（撞 anti-slop 的 eyebrow 密度与状态文案禁令）、去掉「无需信用卡」式 CTA 微文案、`outline: none` 改成 `:focus-visible` 可见轮廓、移动端 `.btn`/`.nav-item`/`.btn--icon`/`.check`/页脚链接一律 ≥44，三套人格 × 五页 × 双主题复跑后 **0 error / 0 warn / 0 axe**。
- **入口瘦身**：`SKILL.md` 从 528 行 / 45KB 压到 283 行 / 22KB——视觉与结构细则整段下沉到新文件 `references/visual-system.md`（299 行），入口只留「判断走哪条路 → 工作流 → 质量门 → 细则路由 → 十个速查数字」。
- **修掉破坏性笔误**：`SKILL.md` 的 `udit.mjs` / `un_checks.mjs` 改回 `audit.mjs` / `run_checks.mjs`；`craft-floor.md` 条目不再粘在上一行行尾；`scaffold.mjs` 收尾提示原来是「file:// 有 CORS 噪声」紧跟一条 `file:///` 截图命令，现在统一改成走 `http://127.0.0.1`。

## v1.9.0 - 2026-10-31

让「装上」变成一行命令，并把实测数据摆到首屏。

### 新增

- **`install.sh`**（macOS / Linux / Git Bash）与 **`install.ps1`**（Windows PowerShell）：默认同时装到 `~/.claude/skills/frontend-fidelity` 与 `~/.dsh/skills/frontend-fidelity`，支持 `--target claude|dsh|both`、`--dir`、`--ref`、`--repo`、`--dry-run`。优先 `git clone --depth 1`，机器上没有 git 时回落到 Gitee / GitHub 的 archive zip。`install.ps1` 带 UTF-8 BOM——PowerShell 5.1 读无 BOM 的 UTF-8 脚本会按 ANSI 解析，中文注释里的字节会被误认成引号，直接语法报错。**代价**：`irm ... | iex` 拿到的字符串里 BOM 会变成不可见字符顶在 `<#` 之前，`[CmdletBinding()]` 被判「意外属性」；README 的 Windows 一行装因此写成 `iex ((irm ...).TrimStart([char]0xFEFF))`，并给了「先 `-OutFile` 再执行」的等价写法——两种都实测装出 16 份 references。
- **README「30 秒安装」**：三行命令 + 五个常用参数 + 手动 clone 兜底 + 装完怎么触发（Claude Code / DSH 各自的入口）。
- **README「它到底量大到什么程度」**：六行实测摘要表（正文 14.8px / H1 72.6px / 圆角六做法 / 阴影五派 / 动效中位数 1 / 图墙三派），链到 `design-evidence.md`。

### 修改

- README 开头补一行口语关键词（设计稿转代码、照着截图还原、UI 还原、前端验收、截图对比、后台美化、移动端适配、设计令牌、Claude Code 技能）——此前通篇术语，搜不到。
- 修复 `references/motion-spec.md` 链接的 `eferences` 笔误。
- `.gitattributes` 补 `*.sh text eol=lf` 与 `*.ps1 text eol=crlf`：安装脚本落地时不能带 CRLF，否则 bash 会因为 `\r` 报 `bad interpreter`。
## v1.8.0 - 2026-10-31

补上原技能最薄弱的一块：**动效**。此前只有零散规则（craft-floor 的一条判据、anti-slop 的 MOTION 旋钮、避免清单四条），没有能照着做的数值，也没法验收。本版新增一份独立规格 + 可粘贴片段 + 五条验收。

### 新增

- **`references/motion-spec.md`**（11,616B / 十一节 / 193 行）：一 四条底线（只动 `transform`/`opacity`、每个动画一句话动机、可打断、三档降级）；二 **时长五档** 120/180/240/400/600（上限 800）+ **四条缓动**（进入 ease-out / 离开 ease-in / 双向 in-out / 回弹只给直接操作 / `linear` 只给跑马灯与真实进度）；三 位移与缩放允许量（hover 2–4px、图片 1.02–1.04、按下 1px、入场 8px 起 40px 封顶）；四 编排（交错 40–60ms、同组 ≤ 8、只演一次、≤ 1.2s 演完、一次一个主角）；五 滚动驱动（`IntersectionObserver` / CSS `animation-timeline`，禁 `scroll` 监听、禁劫持）；六 六类交互配方 + toast/数字/modal/拖拽；七 **三档降级**（`--motion` 系数 + `prefers-reduced-motion` + 低端机），并说明为什么只写 `.01ms` 是错的；八 性能预算（同屏 ≤ 12 元素动、`will-change` ≤ 3、禁大面积 `backdrop-filter` 动画）+ 自测四步；九 动效 AI tell 九条；十 与其它文件的关系；十一 来源。
- **`references/css-recipes.md` §18「动效令牌与四个片段」**：`--dur-1..5` + 四条 `--ease-*` 令牌；四个可粘贴片段（按下厚度归零、入场 8px + stagger、CSS 滚动驱动 `animation-timeline`、可暂停跑马灯）；一段 `IntersectionObserver`（阈值 0.2、只演一次）；三条坑（`transition-delay` 别给 hover、用 `calc(var(--dur) * var(--motion))` 统一切换、`animation-fill-mode: both` 会把 `transform` 留在终值导致 `position: fixed` 子元素偏移）。
- **`SKILL.md` 新增 `### 动效` 小节**：四条底线 + 五档时长表 + 九条硬规则（含位移允许量、交错上限、入场/视线实现方式、自测四步）；参考文件节加 `motion-spec.md` 条目。
- **`references/review-rubric.md`**：第一节补五条（动效四问都有答案 / 按下有反馈且 hover 只两笔 / 无 `scroll` 监听 / 无限循环每页 ≤ 1 且可停 / 6× 节流不丢帧且无整块重绘）。

### 修改

- **`README.md`**：TOC、分工表、仓库结构树各加 `motion-spec.md`；「该抄哪份参考」补一句「动效是横切，动手前先读规格」；参考数据 15 → 16 份。

### 说明

- 语料侧证据是反过来的：18 站里动效最少的反而最显专业（UI Notes 全站 1 个、站酷 0 个、StyleKit 只两笔 hover），所以这份规格的重点是**加之前先证明值得**，不是教怎么加。
- 时长/缓动分级是本站汇总值，不是某一家站点的原值；引用单站数值请回各自单站文档。
## v1.7.0 - 2026-10-31

第七版不是站点蒸馏，而是**两份外部规则集的蒸馏**：impeccable 的工艺底线（`craft-floor`）与 design-taste-frontend 的反模板清单。此前本站只有「别人长什么样」（18 站实测 + 6 份单站），缺「什么叫做错了」；这两份补的是判据，因此新增两个 references 而不是往站点表里加行。

### 新增

- **`references/craft-floor.md`**（11,827B / 十节，来源 impeccable `skill/reference/craft-floor.md`，Apache-2.0，**只蒸馏判据、未复制原文**）：九条「做完才看」的 verify（对比度 4.5/3 · 深度须同时有偏移与模糊 · 标题上间距 > 下间距 · 行宽 65–75ch / 展示 6rem / 字距下限 −0.04em · **一个有意识的动效时刻** + 指数 ease-out · 五态 + 键盘焦点 · **浏览器原生表面** · 文案 · 覆盖）；深度三选一（发丝圈 / 边距 / 阴影，禁幽灵卡）；四件原生表面 CSS（`::selection` / `caret-color` / `scrollbar` / `:focus-visible` + `text-underline-offset` + `tabular-nums`）；骨架层「默认别做」六条；表面禁令表十条；材质诚实；裁剪原则；**第八节与本站语料的四条冲突与裁决**（eyebrow 密度取 ⌈节数÷3⌉ 而非全禁 / serif 只在编辑·陈列气质用且中文补 `"Songti SC","Source Han Serif SC"` / 舞台可纯黑但文字表面不用纯值 / 阴影先定派别再定数值）。
- **`references/anti-slop.md`**（22,319B / 十节，来源 design-taste-frontend 单文件技能 1,206 行，原文件未声明许可证，**规则重写、未复制原文与附录**）：Design Read 一句话 + 六信号；**三档旋钮**（VARIANCE / MOTION / DENSITY，基线 8/6/4，含与三套人格的对照值 rational 3–5/2–4/6–7、editorial 6–7/3–5/3–4、warm 6–8/5–7/4–5）；官方设计系统表（12 个）+ 一项目一系统；hero 四条硬规则；布局族与 Z 字上限；**三把锁**（主题 / 色 / 形状）；图片优先级（生成 → picsum seed → `{{TODO}}`）+ 禁 div 假截图；**8 组 AI tell**（hero 装饰条 / 编号 eyebrow / 装饰状态点 / 斜体降部被裁 / 通用人名与空动词 / 假预览 / 长列表评分条 / 动效含禁 `window.addEventListener('scroll')`）；中文站改写条款七条；**34 条 pre-flight**。
- **`SKILL.md`**：参考文件节加两条（craft-floor / anti-slop）与用途说明；避免清单补 8 条（hero 版本号与装饰文字条、编号当标题、CTA 下方小字与信任微条、div 假 UI 预览、三把锁破功、scroll 事件驱动布局、多动效库混用、声明了动效却没真动）；「层级与阴影」补三条（深度必须偏移+模糊、卡片圆角 12–16、纯黑纯白可做底但不能做字/表面）。
- **`references/review-rubric.md`**：第一节补九条（浏览器原生表面 / depth 三选一 / 三把锁 / hero 四条 / eyebrow 密度 / 每节内容形态 / 动效动机 / <768px 显式塌缩 / 真实图片）。
- **`README.md`**：新增整节 `## 外部规则集蒸馏：工艺底线与反模板`（四块产出表 + 三招表 + 别照抄的三处 + 重取命令），TOC 与「该抄哪份参考」各补一条「这两份不分页面类型、每次都要过」，分工表、仓库结构树同步；参考数据 13 → 15 份。

### 说明

- 两份来源都不是实测站点，因此**没有**改动 `design-evidence.md` 的任何统计（仍是 18 站 / A 组 15 / B 组 3）。引用具体数值时一律回 `design-evidence.md`。
- 冲突处理原则：实测语料优先于外部规则。凡是规则与 18 站实测相左的，裁决写进 `craft-floor.md` 第八节，并在正文标注「这条不采纳」的理由。
## v1.6.0 - 2026-10-30

第六份单站蒸馏：**UI Notes（uinotes.com）**——真实产品 UI 截图灵感库，语料里第一个「隐形界面」样本（页面自己的视觉几乎消失，只剩别人的真机截图）。同时把 v1.5.2 讨论过的简介口径一并落进本版。

### 新增

- **`references/uinotes-design.md`**（十节）：气质（「一间只挂样片的美术馆」+ 四条特征）、令牌（冷暖两套并存：主体 `#24272e`/`#8e919e`/`#f1f2f4`，促销条暖琥珀 `#5c564f`/`#f5f2eb`；强调色 `#446bf8` 只给首页两个数字）、字阶（48/20/18/15/14/13/11，**全站 `line-height: normal`**）、版式节奏（56/72/680/3×110/56/440×626）、九个组件配方（app 条目六层结构、240×520 截图带裁切露 1.8 张、32 高 r6 信息胶囊、80×80 r24 图标…）、七处没做好的、能搬/不能搬 + 后台混合口径、12 条复现清单、重采三个坑。
- **`references/css-recipes.md` §17「隐形界面 + 真机截图带」**：`--un-*` 令牌 + `.un-header` / `.un-num` / `.un-hero__lede` / `.un-wall` / `.un-filters` / `.un-grid` / `.app-item` / `.pill-mini` / `.app-shots` / `.shot` / `.un-tail`，附「`.shot` 的 `object-fit: fill` 换到后台必须改 `cover`」等三条提醒。
- **`references/design-evidence.md`**：A 组第 15 行（uinotes）+ 17 行补充实测表；样本头改「采集成功 18 个站（A 组 15：11 营销/产品 + 4 内容陈列站）」；二节均值重算（正文 **14.9 → 14.8px**、行高比 1.44 → **1.42**、浅色 10 → **11** 站、webfont 反例由三个涨到**四个**且全是中文站）；新增「第六种圆角做法（2/4/6/16/20/24 随盒子变大）」「第五派阴影（全站 0 阴影 0 边框）」「第四派图墙（无壳溢出裁切）」；招式补 36–39，反例表补 3 行（viewport 锁宽 / 无 h1 无页脚 / 裁切无出口）。
- **`SKILL.md`**：参考文件节加 `uinotes-design.md` 条目；陈列节补 5 条（同质素材让界面隐形 / 数字当标题 / 一个正方形尺寸走全场 / 裁切必须留出口 / 全站单一 `line-height` 策略的适用边界）；避免清单补 3 条（viewport 锁宽当移动端、内容站删 h1 与页脚、裁切藏内容）；description 与参考库口径改「18 个真实站 + 六份单站蒸馏」。
- **`references/review-rubric.md`**：第九节更名「陈列类页面（风格库 / 模板库 / 图墙 / 灵感库）额外九条」，补「视觉裁切有出口」「素材型陈列不画壳」「一个正方形尺寸走全场」；红旗补 3 条（锁宽当移动端 / 内容站无 h1 无页脚 / 全站 `normal` 排长段中文）。
- **`README.md`**：新增整节 `## 参考站蒸馏：UI Notes 灵感库`（四块产出表 + 三招表 + 也别学它三处 + 重采命令 + 三个坑），目录与 TOC 同步，选型表补「灵感库 / 截图站」一行，参考数据 12 → 13 份。

### 修改

- 顶部简介（`SKILL.md` description 与 `README.md` 块引用）改为两条路并列，去掉「**已有**前端界面」这一限定；参考库口径从「17 站 + 五份」改为「18 站 + 六份」。
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