# 更新日志

版本按 `vMAJOR.MINOR.PATCH` 打 Tag，与 Gitee Releases 一一对应。分发包统一叫
`frontend-fidelity.zip`，由 `git archive` 从 Tag 快照生成，只含被 git 跟踪的文件
（不含 `shots/`、`audit-report.json`、`.design/`）。

历史日期说明：v1.3.0–v1.14.0 的旧标题日期曾出现未来或倒挂，本次按本地 git 中
各版本条目首次引入的对应提交日期校正；这些日期是**提交日期，不据此宣称发行日期**。
v1.0.0 保留初始化提交 `6da84f5`（2026-10-22）支持的日期；其余已一致的标题日期不改。

## v1.23.0 - 2026-10-31

吸收四个开源仓库：`ZhongAnTech/zarm`、`fex-team/GMU`、`VoltAgent/awesome-design-md`、`wasabeef/awesome-android-ui`。
只取能落到代码里的东西，不做项目点评。

### 新增

- **`scaffold.mjs` 每次生成都产出 `DESIGN.md`**——给 agent 读的设计系统文档（Google Stitch 的 DESIGN.md 约定，
  样本来自 `awesome-design-md` 的 84 份）。YAML frontmatter 存令牌（colors / typography / rounded / spacing / components，
  `components` 用 `{colors.x}` 引用），正文写判断（Overview / Colors / Typography / Layout / Elevation / Shapes /
  Components / Motion / Accessibility floors）。令牌全部从 `tokens` 对象派生，改人格即同步。
- `references/component-absorption.md`：四个仓库各取什么、不取什么，含组件覆盖矩阵（Zarm 50 个 UI 组件 × 骨架有无）。
- `references/css-recipes.md` **§24 移动端保真三件套**：retina 1px、两级令牌、控件阶梯、安全区工具类。
- `references/component-spec.md` 补 4 张规格卡（11 → 15）：数量步进、**左滑操作**、**下拉刷新**、顶部通告条。
  后两者是吸收过程中发现的**骨架缺项**，规格先立起来，实现下一版补。
- `base.css` 新增 `.safe-top` / `.safe-bottom` / `.safe-x` 与 `.hairline`（`--top/--bottom/--left/--right/--all`）。
- `tokens.css` 新增移动端控件阶梯 `--h-xs..--h-xl`（28/36/44/52/60）与 `--tap-min: 44px`。

### 变更

- 自检新增一门「**设计文档**」：DESIGN.md 的 frontmatter 五段必须存在且非空、所有 `{group.key}` 引用必须能解析、
  不许出现 `[object Object]`（派生失败最常见的症状）、正文必须写明「以 tokens.css 为准」与 Accessibility floors。
- 产物 24 → 25 个文件（多 DESIGN.md）；参考 29 → 30 份。
- 生成文件齐备检查纳入 `DESIGN.md`。

### 为什么这几条值得吸收

- **retina 1px**：`border: 1px` 在 3x 屏上是 3 物理像素，是「看起来比设计稿粗」的头号原因，不是颜色问题。
- **两级令牌**（`--组件变量: var(--全局变量, 兜底)`）：局部覆盖不用 `!important`，也不用写主题分支。
- **控件阶梯**：Zarm 的 28/36/44/52/60 与 Apple Store 实测的 35/36/40/44/54 是同一思路——五档并存、按用途分。
  骨架原来拿桌面 `--control-h`（32px）直接上 390，全线偏小且过不了触控门。
- **DESIGN.md**：把设计系统从「一堆 CSS 变量」变成 agent 能直接读的契约，和本 skill 的 `SKILL.md + references/` 互补
  （后者是「怎么做界面」的知识，前者是「这个项目长什么样」的事实）。

### 明确不做的

不引入任何组件库运行时；不自绘键盘 / 日历 / 级联选择器（原生控件更稳）；不做轮播自动播放（无障碍争议）；
不把 84 份 DESIGN.md 的品牌色板搬进参考库（那是品牌资产，不是设计规律）。

## v1.22.0 - 2026-10-31

关闭 README 里写明的三条 A+ 门槛，评级 A → **A+**。

### 新增

- **移动端从 1 种形态补到 4 种**（页面 10 → 13 中的三张）：
  - `mobile-wizard.html` 多步向导：三步封顶、进度条带 `aria-valuenow`、逐步必填校验（焦点回第一个错字段）、末步回显、sticky 底栏。
  - `mobile-pager.html` 横向滑动分栏：`scroll-snap` + 44×44 指示点（圆点是 `::before` 内芯）+ 键盘左右键 / Home / End。
  - `mobile-native.html` 原生壳桥接：安全区让位、原生标题栏占位、只暴露 `postMessage` 一个入口、无桥时按钮照常可用。
- **订单两页**（`orders` / `order`）：7 状态（待支付 / 已支付 / 已发货 / 已完成 / 退款中 / 已退款 / 已取消），
  横幅文案 × 时间线三态 × 可执行操作组**三处同步**；退款走原生 `dialog`。
- `scripts/flow.order.example.json`：45 步链路（列表筛选含空态 → 切状态 → 确认收货 → 退款提交 → 撤销 → 取消）。
- **参考库快照机制**：`references/reference-snapshot.json` 带 `capturedAt` / `frozenAt` / `method` / `note`；
  `scripts/lib/ref-metrics.mjs` 抽出共用的指标解析与漂移比较；新增 `scripts/snapshot-refs.mjs` 离线冻结（不联网）。
- `page-patterns.md` 新增 §2.11 订单状态机表、§3.1–3.3 三种移动形态；`docs/scripts.md` 补 `snapshot-refs.mjs` 一节。

### 变更

- **`recheck-refs.mjs` 只报漂移，不改快照**：`--update-baseline` 移除（跑它会退出 2 并提示），
  改用 `--freeze`（全部可达才写）+ `--allow-partial`（有不可达也写，缺的站保持旧值）。
  `references/recheck-baseline.json` 迁移为 `references/reference-snapshot.json`。
- **自检审计改为 4 路并发**：组合数 246 → **306**（核心 7 页 × 5 套 = 210，限定 8 页 × 2 套 = 96），
  耗时反而从 7m50s 降到 **2m47s**。串行跑 300 组会超过 10 分钟，长到没人愿意在本地执行。
- 自检新增两项：「流程（订单）」45 步、「参考库快照」门（日期合法且不在未来、每站有可比对数值、必须有 method 与 note）。
- 页面 10 → 15，产物 19 → 24；对比度配对 615 → 645；脚本 15 → 16。

### 修复

- **`[hidden]` 之外还有一个「打开了但看不见」**：`.modal { display: none }` 会让原生 `dialog.showModal()`
  的元素不可见（`showModal` 只加 `[open]`，不加 `.is-open`）。补 `.modal[open] { display: grid }`。
- **单列 grid 的 `auto` 会按内容撑宽**：移动端三页的容器都加了 `grid-template-columns: minmax(0, 1fr)`，
  否则一段长文本就把整页顶出 390 视口（分栏页实测被撑到 457px）。
- 时间线竖线改用 `color-mix(in srgb, var(--ink) 18%, transparent)`：1px 的 `--border` 在浅底上肉眼不可见。

## v1.21.1 - 2026-10-31

### 变更

- **README 评级章节重写**：等级仍是 **A**，但口径收紧——五个维度逐项标等级，并把「A+ 门槛」写成可核对的三条缺口
  （支付/订单状态、移动端单形态、参考库无快照），而不是笼统的「还没到 A+」。
- 评级表里的事实性漂移一并修正：红旗清单 **8 条 → 13 条**；自检闭环一行补上真实规模
  （审计 246 组、对比度 615 组、流程 3 条共 60 步、11 个 Agent 入口、生成 10 页）。
- 从扣分项移出两条已补的：参考库只有样式层、电商结算无模板（v1.20.0 / v1.21.0 已做）。
- `README.en.md` 新增对应的 **Self-assessment** 章节，中英不再一边有评级一边没有。

## v1.21.0 - 2026-10-31

### 新增

- **`scaffold.mjs` 补电商三页**：`--pages product,cart,checkout`（页面 7 → 10，产物 15 → 19）。
  - `product.html`：图集（缩略图是 `button` 不是 `a`）、三层价格（主价不放大只加字重）、
    两组 SKU 用不同形状（颜色 36px 圆点 / 规格文字按钮带 `+800` 增量）、数量步进、加购 + 立即购买、参数表、同类商品。
  - `cart.html`：行项目（图 / 名 + SKU / 步进 / 单价 / 小计 / 删除）、汇总卡（小计 / 运费 / 优惠 / 应付）、
    优惠码、空车态。单价用弱色、小计用强色，避免数量为 1 时看起来像重复渲染。
  - `checkout.html`：三步进度条（`aria-current="step"`）、地址表单、配送 / 支付单选、订单摘要、sticky 提交栏。
- `commerce.css`：电商三页专用样式（约 380 行），全部走令牌，不写死颜色。
- `ui.js` 补电商交互：SKU 互斥选择与价格增量重算、数量步进（钳 1–99）、加购角标、
  购物车删行 / 汇总重算 / 空态、优惠码、结算运费联动与必填校验。
- `scripts/flow.commerce.example.json`：42 步完整链路验收（选 SKU → 加购 → 改量 → 删行 → 优惠码 → 空态 → 结算校验 → 运费联动）。
- `page-patterns.md` 新增 §2.10 电商三页：三张表（详情 / 购物车 / 结算）+ 常见失败 + 生成命令。

### 修复

- **`audit.mjs` 误报视觉隐藏文本**：`.sr-only`（1×1 + `clip: rect(0 0 0 0)`）与 `clip-path: inset(50%)`
  被当成「文本被裁切且无省略号」报警。现在先判视觉隐藏再判裁切。
- **`[hidden]` 压不住组件的 `display`**：`.co-summary { display: flex }` 特异性高于 UA 的
  `[hidden] { display: none }`，导致 JS 设了 `hidden` 元素还在。`base.css` 补 `[hidden] { display: none !important; }`。
- **模板字面量吞掉正则反斜杠**：`ui.js` 里的 `/[^\d.]/g` 与 `/^\d{11}$/` 在生成后变成 `/[^d.]/g` 与 `/^d{11}$/`，
  价格解析恒为 0、手机号校验恒失败。改为 `\\d`。

### 变更

- 自检审计组合 210 → **246**：核心 7 页 × 5 套 = 210，电商 3 页 × 2 套（rational / warm）= 36。
  电商页差异来自颜色与间距令牌，两套已覆盖冷暖两端，全 5 套会把自检推到 10 分钟以上。
- 自检新增「流程（电商）」一项，跑 42 步链路。
- README 评级说明：把「电商结算流程尚未覆盖」改为「支付与订单状态未覆盖」——三页已落到生成器，
  但支付回调、订单状态机、退款仍不在这套骨架里。

## v1.20.0 - 2026-10-31

### 新增

- **参考库增加结构层证据**：用 REA（`inspect_web_page`，CDP 被动采集——不执行脚本、不点击、不导航、不改页面）
  把 17 个单站参考全部重新逆向一遍，量的是「怎么搭起来」：地标、标题层级、语义标签、DOM 深度、
  `aria-*` 覆盖、`img alt` 覆盖、`button` 与 `a` 的分工。原始数据落在 `references/rea-structure.json`。
- `references/design-evidence.md` 新增 **§七 结构证据**：17 站全量对照表 + 五条可直接用的结论 + 三条反例。
- 17 份单站蒸馏末尾各加一节「结构证据（REA 被动采集）」，逐站指标表 + 一句判读。

### 结论摘录（可核对）

- 目录页的标题结构是「1 个 `h1` + 一片 `h3`」：awwwards 1/10/29、muzli 1/3/68、stylekit 1/1/12、zcool 1/27。
- 地标数量从 **0（语雀）到 21（Muzli）**，中位数 3–4——地标是加分项不是及格线，但至少 `header/nav/main/footer` 四件套。
- `img alt` 覆盖率两极分化：图片即内容的站 100% 覆盖（uinotes 80/80、luckymaomi 143/143、awwwards 60/60），
  全 `div` 结构的站大面积缺失（语雀 1/36、即时设计 81/127、MasterGo 84/178）。
- DOM 深度均值 6.1（vercel）→ 19.9（即时设计，最大 30）；均值破 20 基本等于「每层只包一个 div」。
- `button` 与 `a` 的分工样本里没人混：判据是「点了会换 URL 就是 `a`，只改当前页状态就是 `button`」。

### 变更

- `README.md` / `README.en.md` 参考数据口径改为「29 份参考 + 2 份机器可读数据（复测基线 / REA 结构证据）」。
- `SKILL.md` 路由表新增一行：要结构证据时读 §七 + 单站小节 + `rea-structure.json`。

## v1.19.0 - 2026-10-31

### 修复

- `recheck-refs.mjs` 超时单位错误：`--timeout 60` 曾按 15000 秒计（实际数小时）；现在按秒解析并要求 ≥15。
- 复测状态区分「首次采样 / 无变化 / 有变化 / 失败」；一边为空一边有值不再被当成相同。
- `--only` 复测不再覆盖全量报告 `docs/reference-recheck.md`，改写 `.design/recheck/`；`--report` 才覆盖。
- 复测报告明确标注「探针复测 ≠ REA 逆向」，只验证可达性与关键值。

### 新增

- `flow.mjs` 新增 `expectFocus` / `expectFocusVisible`（动作 13 → 15），自检增加移动端焦点流程。
- 移动端模板补真实交互：搜索框、状态筛选、结果计数、空态联动；新建入口移到顶栏（去掉固定 FAB，避免遮挡列表项）。

### 变更

- `agent-adapter.mjs` 改为**只维护标记块**：块外规则原样保留；文件已存在则追加，不覆盖；重复执行幂等。
- 适配器新增 `--lang zh|en` 与 `--check`（写后校验标记块与 Skill 路径）。
- 新增 `CONTRIBUTING.md`、issue 模板与 PR 模板，补齐外部贡献入口。

## v1.18.0 - 2026-10-31

- 新增 `scripts/agent-adapter.mjs`：为 Codex / Gemini CLI / Cursor / Windsurf / Cline / Roo /
  Continue / OpenHands / Aider / Zed 生成规则入口（只写指针，不复制参考库）。脚本数 14 → 15。
- 新增 `docs/agents.md`：各工具读哪个文件、加载差异、不承诺的部分。
- `install.sh` / `install.ps1` 新增 `workbuddy` 目标（`~/.workbuddy-ai/skills`）与 `all`；
  分发文件补 `README.en.md`。
- README 中英双语补「在其他 AI / Agent 里用」章节。

## v1.17.0 - 2026-10-31

- 新增 `scripts/recheck-refs.mjs`：17 个单站参考批量复测 + 基线漂移报告（`docs/reference-recheck.md`）；
  失败站点不入基线，报告只报差异不改写结论。脚本数 13 → 14。
- 新增 `references/awwwards-design.md`（Awwwards 首页实测蒸馏）+ `css-recipes.md` §23：
  1440 内容宽 1336（侧距 52）、顶栏 71/54、h1 126.7/1.0/600/uppercase（移动 42）、封面 1420×1065 内缩 10、
  作品网格 2 列 658（gap 30/20）、卡 0 边框 0 阴影、强调色 `#fff083` 仅 3 处。
- 参考库 **27 → 28 站**（A 组 24 → **25**：16 营销/产品/电商 + 9 内容陈列），单站蒸馏 **16 → 17 份**，
  `references/` **28 → 29 份**；跨站统计仍冻结在 18 站基线。
- 结构证据来自 REA（CDP 被动检查：4,073 DOM 节点 / 1,336 无障碍节点 / 4 个脚本），
  数值来自 `probe-ref.mjs`（985 元素）+ 定向盒模型实测；反例单列：59 张图 0 懒加载、4.2 / 20.6479px 脏间距、输入字 13。
- SKILL 路由表、README「该抄哪份参考」、`docs/reference-sites.md` 三处补「奖项目录 / 榜单站」入口。

## v1.16.0 - 2026-10-31

- 新增 `scaffold.mjs --pages mobile`：390 单列移动壳（`mobile.html` + `mobile.css`），含
  `100dvh`、`env(safe-area-inset-*)`、4 项底部 tab、56px FAB、原生 `<dialog>` 底部面板（Esc 关闭、焦点落入标题输入），
  全部触控目标 ≥44px；桌面宽度下居中成 430px 预览列，不改动其余六类页面。
- 页面数 6 → 7，生成产物 13 → 14 个文件；自检覆盖 210 个渲染组合，令牌对比度 119 组/套。
- 新增 `audit.mjs --design-system`：可见字号、间距、非全圆角与完整阴影声明的频次统计和漂移检测；
  支持项目 JSON 配置、容差、全圆角/隐藏/第三方区域豁免，默认仅警告，`--strict-design-system` 才作为错误门禁。
- 增加设计体系正反例回归；修复容差聚类吞掉越界值与无效选择器误归导航失败的问题。
- 补齐 `esbuild` 开发依赖，使框架语法检查不再因未声明依赖被跳过；CI 说明校正为 180 个渲染组合。
- 修复参考文档迁入子目录后的 30 处相对文件断链，并同步工作流与视觉细则的当前样本计数。
- 将字号/间距规则改为「已声明体系优先」，不把已有体系中的 15px / 17px 字号本身视为错误。
- 修正 README 陈旧的站点、蒸馏与脚本计数，跨站均值对齐冻结基线，去掉易漂移的手写行数。
- 强化 `selfcheck.mjs`：阿拉伯/中文计数、冻结均值、Markdown 相对文件链接、CHANGELOG 日期与版本顺序；
  必要文档与基准缺失直接失败，规则附正反例回归断言。
- 语法检查递归覆盖 `scripts/lib/`；审计报告写临时目录，失败不再同时记录通过；
  跳过审计或缺少依赖时，最终明确说明自检未完整执行（退出码兼容原行为）。
- 历史标题日期依据：v1.3.0–v1.9.2 对应提交 `8b9bfa1` / `1b621eb` / `c3e38b4` / `9e5e1e1` /
  `ac99c77` / `697ca3f` / `9232e60` / `520dba1` / `e9de17a` / `db8cc48`（2026-10-25）；
  v1.10.0–v1.13.1 对应 `49e2d7a` / `7f5b818` / `f833ea0` / `bf45eb1` / `6522a3e`（2026-10-26）；
  v1.13.2–v1.14.0 对应 `479a4d1` / `eb7fb09` / `032bd23`（2026-10-27）。
- 本次发布 v1.16.0；下方条目的历史测量数据不因标题日期校正而重写。

## v1.15.6 - 2026-10-27

### 新增

两份单站蒸馏，补的是 `scaffold` 里两个**一直有页面、没有数值依据**的模板：

- **`references/vercel-auth.md`**（认证与多步表单）：Vercel `login` / `signup` 双视口实测 ——
  390px 表单列（390 视口下撑满减 32）、40 高按钮配 16/24/500 字、8/6/4/2/12 圆角阶梯、8/16/24/32 间距体系、
  6 档字阶（12–32）、标题只降一档（32→24）。对照 Linear 登录页：19 元素、两档字阶、44 控件高、9999 圆角、两端完全同构。
- **`references/applestore-commerce.md`**（电商商品配置）：Apple Store 商品页双视口实测 ——
  价格三层（17/25/600 主价不放大、14/21 分期、12/16 小字）、36×36 圆点 SKU（2px 透明描边占位，选中上色）、
  328×44 主 CTA、控件高五档（35/36/40/44/54）、圆角四档（18/980/56/6）。
  附小米商城对照：控件 50、圆角只有 2/50%、价格红 `#c20000`，且 **390 下 viewport 锁 1228，不响应式**。

### 变更

- 参考库 **25 → 27 站**（A 组 22 → **24**：16 营销/产品/电商 + 8 内容陈列 + B 组 3 后台）；
  新增两站只入计数与单站条目，跨站中位数仍冻结在 18 站基线。单站蒸馏 **14 → 16 份**，`references/` **26 → 28 份**。
- 全仓计数同步（README / SKILL / design-evidence / craft-floor），`selfcheck` 的文档数字门继续守着。
- `SKILL.md` 预设路由表新增两行：登录注册 → `vercel-auth.md`、电商详情 → `applestore-commerce.md`；
  README「该抄哪份参考」与仓库结构树同步，`docs/reference-sites.md` 增加两站「三招 / 也别学 / 重采」。

### 明确不做

- **不为「移动端原生壳」再加站**：`design-evidence.md` 里已有 390 单列、gap 12、底部 tab 4 项的实测，
  缺的是 `scaffold` 的移动端模板，不是参考数据——补模板比蒸站便宜。
- **电商不拿小米商城做主参考**：它在 390 下 viewport 锁 1228，给不出双视口数据，只作桌面密度与反例。

## v1.15.5 - 2026-10-27

### 新增

- **`scripts/flow.mjs`：交互流程验收**。补上「验收只看静态结构与像素」这个缺口 ——
  用声明式 JSON 描述一条真实用户路径（`goto` / `click` / `fill` / `select` / `press` / `wait` /
  `expectText` / `expectVisible` / `expectHidden` / `expectUrl` / `expectCount` / `expectValue` / `screenshot`），
  逐步执行、给出每步耗时；失败即停、自动截现场图、报告写 `<out>/flow-report.json`。
  平铺与嵌套两种写法都收（`{ "select": "#f-type", "label": "故障" }` ≡ 把 `selector`/`label` 写进内层对象）。
  开跑前先校验流程文件（缺 selector / 缺 value / 一步多动作 / 未知动作），**退 2 而不是跑到一半崩**。
  退出码 0 全过 / 1 有步骤失败（标了 `optional` 的不算）/ 2 参数或流程错误。
  定位是「一条路径能不能走通」：不做断言库、重试策略、网络拦截、多标签页，那些交给 Playwright Test。
- `scripts/flow.example.json`：对 scaffold 骨架冒烟的可跑示例（12 步，覆盖列表 → 新建 → 填表 → 回读）。

### 变更

- `selfcheck.mjs` 增加「流程」一步：用示例 flow 跑一遍骨架，守住 flow.mjs 的步骤/断言/报告链路；自检由七步变八步。
- **陈旧数字修正**：README 与 `docs/scripts.md` 四处写「30 组审计」，实际是 5 套 × 6 页 × 明暗 = **60 组**；
  `docs/scripts.md` 里「v1.13.1 复跑」的版本指针也一并去掉（复跑命令一直在，指针只会过期）。
- **`selfcheck.mjs` 的静态服务改为启动时预读进内存**：原先每个请求 `readFile`，失败被 `catch` 成 404 ——
  Windows 上偶发一次读失败，就会让某套生成物的页面缺 CSS，炸出「20 错误 / 1 HTTP」这种只随机命中一套的假失败
  （实测命中过 `editorial/index.html`，单独复跑全绿）。生成物统共几十 KB，缓存后既消掉这类假阳性，也让 60 组审计更快。
- README / `docs/scripts.md` / `SKILL.md` 同步：脚本数 12 → 13（10 Node + 3 Python）、仓库结构树、脚本速览表、
  新增 `flow.mjs` 一节（动作表 / 参数表 / 产物 / 退出码 / 边界）。SKILL.md 明确它**不进必跑质量门**，
  只在「改动涉及提交、跳转、弹窗、异步加载」时追加。

### 验证

- 示例流程（12 步，desktop/light）全过退出 0；`--theme dark --viewport mobile --screenshot` 全过、13 张图。
- 失败语义：默认中断（余下步骤未执行、退 1）；`--continue` 跑完全部，`optional` 失败不拦路，汇总单列「1 可选未满足」。
- 开跑前校验：坏流程文件一次列出 4 处问题、退 2；缺 `--flow`、文件不存在均退 2。
- `selfcheck --personas rational` 全绿（含流程步）。

## v1.15.4 - 2026-10-27

### 修复

- **`--verify` 不再把「没验」当「验过」**：缺 python 或 playwright 时，以前只往 `notes` 写一行就退出 0，
  用降级结果冒充全绿，与「改完自证」直接冲突。报告改带 `status` 三态 ——
  `pass` / `fail` / `partial`，退出码 0 / 1 / 3；`partial` 会列出哪几项没验，
  要接受不完整验收必须显式加 `--allow-partial`（此时退出 0，并提示交付说明里写明）。
  `report.ok` 同步收紧为「完全通过」，不再在跳过时保持 true。
- **只有 `py -3` 没有 `python` 的机器被判「没装 python」**：`python` 是硬编码的，
  Windows 上常见只有 Python Launcher。改为依次探测 `python` / `py -3` / `python3`
  （`scripts/lib/common.mjs` 的 `resolvePython`）；对比度脚本自己崩了（如缺 pillow）
  也不再混进「未达标」，单独报「对比度脚本执行失败」并附最后一行输出。
- **Git Bash 下 `--base + --pages` 必挂**：MSYS 会把 `--pages /index.html` 改写成
  `C:/Program Files/Git/index.html`，脚本再 `new URL(u, base)` 就成了 `file:///…`，
  报 `ERR_FILE_NOT_FOUND` —— 报错完全指不到真因，而文档里的示例恰好全是 `--pages /,/orders` 这种写法。
  新增 `resolvePages` / `undoMsysPath`：识别 Git for Windows / PortableGit / MSYS2 / Cygwin
  安装根并还原成站点相对路径（stderr 打一条 `WARN`），认不出的一律不猜，给明确改写建议。
  `screenshot.mjs` 与 `audit.mjs` 都已接入。
- **多页审计下 `--expect-text` 必然误报**：它是全局单值，对所有页面做 `includes`，
  一页的特征文案不可能出现在另一页（实测两页必有一页报 error、退出码 1）。
  现在支持 `|` 按页对应（`--pages /a,/b --expect-text "A 页文案|B 页文案"`，段数必须等于页数，
  不匹配直接退出 2）；只写一段仍是旧语义「所有页共用」，文档已标注多页下别这么用。

### 变更

- `scaffold.mjs` 的 `HERE` 改用 `fileURLToPath`，仓库/输出路径含空格或中文时不再被 `%20` 打断。
- `docs/scripts.md`：补 `--allow-partial`、verify 三态退出码、`--expect-text` 按页语义、
  Windows / Git Bash 下 `--pages` 的坑与两种安全写法（去前导斜杠 / `MSYS_NO_PATHCONV=1`）。

### 验证

- `scaffold --verify` 三态实跑：正常 → `status: pass` 退出 0；隐藏 python 探测 → `status: partial` 退出 3，
  加 `--allow-partial` 退出 0；替换成必失败的审计脚本 → `status: fail` 退出 1。
- `audit --pages index.html,app.html --expect-text "登录|工单"` → 0 错误退出 0；
  单值 `"工单"` → 1 错误退出 1（旧语义保持）；`"a|b|c"` 对 2 页 → 退出 2 并说明段数不符。
- 去掉 `MSYS_NO_PATHCONV` 后 `--pages /index.html,/app.html` 自动还原并成功审计。

## v1.15.3 - 2026-10-27

### 修复

- **`docs/scripts.md` 补齐像素门**：手册搬去 `docs/` 时漏了 v1.14.0 的 `fidelity.mjs` / `pixel_diff.py`，
  现在两节都在（参数表、指标口径、阈值、退出码、产物、`EDGE_PATH` 与「两边截图方式必须一致」的坑）。
- **`SKILL.md` 补 `docs/` 入口**：细则搬到 `docs/` 后 SKILL 里 `docs/` 出现 0 次，技能侧看不到手册；
  参考文件指针新增「手册与摘要（`docs/`）」一行，`page-patterns` 的「七类」改为「九类（含目录陈列）」。
- **`selfcheck.mjs` 的文档数字门扩到 `docs/`**：纳入 `docs/reference-sites.md`、`docs/scripts.md`（计数主力已搬过去），
  并新增「脚本数」一致性检查（README 徽标「N 个可执行脚本」必须等于 `scripts/*.mjs + *.py` 的实际数——
  v1.15.1 之前它一直停在 9，实际已是 12）。
- **文档小修**：README 徽标改为「12 个可执行脚本（9 个 Node + 3 个 Python）」；两处示例去掉已废弃的 `--dark`
  （深色令牌早已默认生成，要关用 `--no-dark`）；`docs/visual-summary.md` 的「完整版在 `SKILL.md`」改为指向
  `references/visual-system.md`（完整版已搬到那里）。

## v1.15.2 - 2026-10-27

### 修复

- **安装器漏装 `package.json` 与 `docs/`**：`install.sh` / `install.ps1` 的拷贝清单只有 skill 运行文件，
  装到 `~/.claude/skills`、`~/.dsh/skills` 这类目录后 `package.json` 缺失 —— v1.15.1 新增的「版本号」检查无从读取版本，
  在安装副本里会直接判失败；README 里指向 `docs/` 的链接也会断。两份安装器的清单已补齐。

- **`selfcheck.mjs` 的版本门对安装副本降级**：找不到 `package.json` 时打印跳过说明而不是判失败。
  仓库与 CI 里该文件始终存在，拦截力不受影响。
- 重装已有副本即可对齐：`.\install.ps1 -Ref v1.15.2`（`~/.dsh`、`~/.claude`）；`~/.trae-cn` 若是 git 副本，`git pull` 即可。

### 说明

- 生成器、设计令牌、参考库与 v1.15.1 完全相同；升级只需重装，无迁移。

## v1.15.1 - 2026-10-27

### 修复

- **版本号指针漂移**：README 徽标已经是 v1.15.0，但安装示例、「当前是」链接与 `install.sh` 注释还停在 v1.14.0，
  按文档判版本的人会读到旧号（此前 README 元信息曾连续两版停在 v1.9.2，两次替换都没命中）。全部对齐到本版。
  `docs/scripts.md` 里的「v1.14.0 实测」是历史测量记录，不是版本指针，不参与对齐。
- **`selfcheck.mjs` 增加第六步「版本号」**：`package.json` 的 version 与 README 徽标 / 安装示例 /「当前是」、
  `install.sh` 示例、CHANGELOG 首条逐一比对，漏改一处即非 0 退出。已反向验证：把徽标改成一个与 `package.json` 不同的版本号时退出码 1。

## v1.15.0 - 2026-10-27

### 新增

- **`scaffold.mjs --verify`：生成即验收**。生成完自动起内置静态服务，对每个 HTML 跑 `audit.mjs`（明暗双主题）
  + `contrast_check.py`，报告写 `<out>/.verify/report.json`，失败退出码非 0——Agent 立刻知道要修。
  没装 playwright 时跳过 audit 只跑对比度并明说。
- **`scaffold.mjs --ref-url / --ref-json`：探针与生成器打通**。先跑 `probe-ref.mjs` 量参考站（或读已有 JSON），
  用实测值覆盖人格字段：品牌色相（从背景色里挑饱和度最高的非中性色）、底色/文字/表面、字阶（base/3xl/4xl/2xl/xl）、
  圆角三档、控件高、密度、间距基数。探针拿不到的（字重、字距、动效）保留人格默认；设计口径是逼近 80%，剩下 20% 改 `tokens.css`。
- **`scaffold.mjs --export tailwind,antd,element`：令牌多格式导出**。同一份令牌额外生成
  `tokens.tailwind.js`（theme.extend：colors/fontSize 带行高/borderRadius/spacing/boxShadow/transitionDuration）、
  `tokens.antd.json`（Ant Design v5 token）、`tokens.element.scss`（Element Plus `@forward ... with` 变量），数值与 `tokens.css` 同源，不二次发明。
- **组件级四态补齐**：`btn:focus-visible`、`tab:disabled`、`nav-item[aria-disabled]`、表格行 `aria-selected`/`aria-disabled`、
  `check:disabled`、`cat__pill:disabled`、`cat__card[aria-disabled]`、`.btn[aria-busy]::after` spinner。
- **四份中文站单站蒸馏**（2026-10-27 实测，1440 / 390 双视口 + 双视口审计）：
  - `references/sspai-design.md`（194 行）——少数派：**960 版心**（顶部 1024/padding 32）、编辑板 `224+16+480+16+224`、
    feed `164+56+520+56+164`、文章卡 520×189 无壳、按部件分圆角 24/12/8/6、767 切移动 / 768 仍桌面。
  - `references/yuque-design.md`——语雀：`#main-right-content` **内部滚动**（文档 900 / 容器 820 / 10171，截图必须分段）、
    模块节奏 Hero 538 → 双场景 741 → 编辑器 1704 → 黑段 693 → 作品 3151 → …、Hero 100/125/600、绿 `#00b96b` / 蓝 `#166eff`。
  - `references/juejin-design.md`（220 行）——掘金：1200 三栏 `180+20+720+20+260`、feed 条目 720×99、缩略图 110×74、
    `#f2f3f5` 底 + 白卡、三档小字撑密度、灰字 3.17:1。
  - `references/apple-design.md`（209 行）——苹果中国：主舞台 692 / 小舞台 580、**12px 页沟**、导航层 1024 与舞台分离、
    首个 h1 是 1×1 visuallyhidden（可见产品名 h2 56/60/600）、CTA pill 44/36、逐舞台明暗编排。
  配套在 `references/design-evidence.md` 各加一张实测卡，在 `docs/reference-sites.md` 各加「三招 / 也别学 / 重采」一节。

### 变更

- **`SKILL.md` 二次瘦身**（316 行 / 28KB → 113 行 / 8.9KB）：入口只留 frontmatter + 三条铁律 + 30 秒起步 + 模式 A/B 路由 +
  **预设路由表**（后台→rational+mastergo-b2b、落地页→editorial/warm+wegic/jsdesign、图墙→magazine+muzli/uishijie/uinotes、
  风格库→print+luckymaomi/stylekit、频道页→zcool）+ 视觉基线四件事 + 质量门 + 参考文件指针简表。
  工作流 1–5 步、模式 B 六步、交付说明模板、细则路由表、参考库完整索引下沉到**新建 `references/workflow.md`**（26 份参考数据齐）。
- `README.md` 同步：参考数据 21 → 26 份、分工表 SKILL.md 行数与结构、目录树加 `workflow.md` 与四份新蒸馏、scaffold.mjs 注释补新参数。
- `docs/scripts.md` 同步：参数表加 `--ref-url/--ref-json/--verify/--export` 四行，顺手修掉 `--dark` 的过时描述（深色早已默认生成，开关是 `--no-dark`）。

### 验证

- `node scripts/selfcheck.mjs --skip-audit`：语法 9 mjs + 3 py ✓、5 套人格 × 6 页生成 ✓、对比度 565 组 0 未达标 ✓、文档数字 25 站 / A 组 22 四处一致 ✓。
- 四站关键尺寸二次独立复测：语雀 `docH 900 / scroller 820×10171`、掘金 feed 1200 + 条目 720×99、少数派文章卡 520×189、苹果导航 44 + 隐藏 h1 1×1。
- 冒烟：`--export tailwind,antd,element` 三份产物生成且 `tokens.tailwind.js` 过 `node --check`。

### 明确不做

- 增量生成、可视化配置界面、Figma 解析、插件化扩展机制、React/Vue 全量组件化输出、Tailwind 双写实现（只做令牌导出，不接实现侧）。

## v1.14.0 - 2026-10-27

### 新增

- **`scripts/fidelity.mjs` + `scripts/pixel_diff.py`：像素级还原验收**。`--design` + `--url`（自动截图）或 `--impl`（已有图），
  输出平均差、超阈值像素占比、按 16×12 网格排序的最差区域（带设计稿坐标），产物三件：
  `fidelity-diff.png`（设计稿压暗 + 超阈处红）、`fidelity-side.png`（设计稿/实现/差异三联）、`fidelity-report.json`。
  退出码 0/1/2 可直接当门用；`--theme dark` 在页面脚本之前写 `localStorage` 并带 `prefers-color-scheme`，框架版能真以深色启动。
  引擎是纯 Python（Pillow + numpy），`--impl` 模式下整条链路不需要浏览器。
- **框架生态补齐**（`--stack react|vue|all`）：
  - 真路由：`react-router-dom` / `vue-router`，`/` 与 `/catalog` 深链直达，`*` 兜底。
  - 数据层：`src/lib/api.ts` —— `fetchJson<T>` + `useAsync<T>`（loading/error/data 三态、竞态保护；Vue 用 `watchEffect`）。
  - Tailwind 桥：`tailwind.preset.js`（v3 preset，全部指向 `var(--…)`）+ `tailwind.css`（v4 `@theme` 块）。
  - 依赖：`react-router-dom ^6.28.0` / `vue-router ^4.5.0`。

### 修复

- **深色令牌改为默认生成**：以前要 `--dark` 才有 `.dark` 块，但主题开关一直在页面上——默认状态下它是死按钮。
  现在默认生成，关掉用 `--no-dark`；`VUE_THEME`/`REACT_THEME` 的 `localStorage['ui-theme']` 与 `data-theme` 双向同步。
- `E:\SKIl.1\.tools\serve.mjs`（工具侧，不在仓库）：补 SPA history fallback（无扩展名且文件不存在 → 回根 `index.html`），
  否则审深链 `/catalog` 会得到 9 错误 / 6 类 axe（全是 404 引起的假失败）。

### 验证

- React：`tsc --noEmit` 0 错误，`vite build` → JS 175.56 kB / gzip 57.66、CSS 26.66 kB / gzip 6.21。
- Vue：`vue-tsc --noEmit` 0 错误，`vite build` → JS 102.83 kB / gzip 40.61、CSS 26.66 kB（与 React 同字节）。
- 打包产物审计：`/` 与 `/catalog` 两栈、明暗双主题各 6 组，全部 **0 错误 / 0 警告 / 0 类 axe / 0 console / 0 HTTP**。
- 像素工具自测：同图比对 0.00%（退出 0）；浅色设计稿 vs 深色实现 18.4%（退出 1，最差区域 = 整条内容带，与预期一致）。
- `node scripts/selfcheck.mjs --skip-audit`：语法 9 mjs + 3 py ✓、5 套 × 6 页 ✓、对比度 565 组 0 未达标 ✓、
  框架栈 42 个 tsx/ts/vue 语法通过且类名引用全部有定义 ✓、文档数字 21 站 / A 组 18 ✓。

### 未做

- `.github/workflows/selfcheck.yml` 仍需带 `workflow` scope 的 PAT 才能上 GitHub（当前仓库里已有文件，GitHub 侧缺失）。
- 小程序 / RN 不在范围内：一套令牌对一套选择器方言，维护四份 truth 不划算。
## v1.13.3 - 2026-10-27

### 新增
- **`--stack html|react|vue|all`**（默认 `html`）：在原有静态骨架之外，额外产出 React 18 + Vite 与 Vue 3 + Vite 两套源码。
  两栈**共用同一份 CSS**（tokens / base / components / depth / catalog 逐字节复制），组件只做 props → className 映射，
  没有 `<style>`、没有样式库、没有 CSS-in-JS —— 框架版与 html 版像素一致，改令牌两边同时变。
- `scripts/lib/stacks.mjs`（48 KB）：`pkgReact`/`pkgVue`、`tsconfig`、`vite.config`、`index.html`、`cx`、`theme`
  （`localStorage['ui-theme']` + `data-theme`）、React 五组组件（Button/Form/Surface/Data/Overlay）、Vue 19 个单文件组件、
  两套页面（`Dashboard` 与 `Catalog`，都带 mock 数据与 `{{TODO}}` 占位）。
- 生成期打印两个新行：`深度语言` 与 `动效阶梯`（v1.13.0 遗留的两处漏打印）。
- `selfcheck.mjs` 新增「框架栈」一步：`--stack all` 生成后逐文件过 esbuild 语法、再从 CSS 抽类名核对引用，缺一个即失败。

### 修复
- 框架版的工具栏用 `Field` 包搜索框，渲染出一条多余的 `{{TODO: 搜索什么}}` 标签且 `.select` 撑满整行 ——
  改为与 html 版一致的 `.input-group.toolbar__search` + 裸 `<input aria-label>` / `<select aria-label>`，
  并在 `components.css` 补 `.toolbar .select { width: auto; min-width: 8rem }`。
- 两栈的视图切换条原来是一段 inline style 的裸 div（无内边距、贴在页顶）→ 改成 `.appswitch`（新增该类）。
- 我之前凭空发明的两个类名 `.cat__count-sort` / `.cat__pager-item` 在 CSS 里并不存在 → 改用 `.tiny` + `.select` 与裸 `<a>`。
- Vue 的 `UiTable` 改成 `generic="T extends Record<string, unknown>"`（否则插槽里的 `row` 是 `unknown`，
  `vue-tsc` 报 TS2538/TS7053），并补 `cell()` / `cellOf()` / `toneOf()` 三个取值helper。

### 验证
- `tsc --noEmit`（React，strict）0 错误；`vue-tsc --noEmit`（Vue）0 错误；`vite build` 两栈均成功
  （React 153.06 kB / gzip 49.61，Vue 76.74 kB / gzip 30.75，CSS 两栈同为 25.52 kB）。
- 打包产物跑 `audit.mjs`：两栈各 6 组（桌面/平板/手机 × 明暗）**0 错误 / 0 警告 / 0 类 axe / 0 console**。
- `node scripts/selfcheck.mjs --skip-audit`：语法 8 mjs + 2 py ✓、5 套 × 6 页 ✓、对比度 565 组 0 未达标 ✓、
  框架栈 40 个 tsx/ts/vue 语法通过且类名全部有定义 ✓、文档数字 21 站 / A 组 18 ⋯ ✓。

### 已知未动
- GitHub 上的 `.github/workflows/selfcheck.yml` 仍缺（fine-grained PAT 没有 `workflow` scope）。
- 小程序 / React Native 明确不做（一套令牌对一套选择器方言，维护四份 truth 不划算）。
## v1.13.2 - 2026-10-27

这一版只做一件事：把 MasterGo 的**工具界面实例**与**资源社区统计**蒸馏进来，补上"B 端工具型界面"这块空白。

### 新增

- **`references/mastergo-b2b.md`**（14.1KB / 八节）：三层结构——外壳（压成一张表）→ **工具界面实例解剖**（三栏工作区 300/画布/300、顶栏 56、属性面板字段语言、代码面板语法色、盒子模型图、自动布局面板）→ **社区实例统计**（24 张资源卡的类别分布与"赞 → 使用"倍数）。实测来源是官网三张 1800×1536 官方产品图与 `/community` 的公开元数据；资源实例本体在 `<canvas>` 里，未登录拿不到，文档里已标注边界。
- **`references/css-recipes.md` §22「B 端工具工作区」**：`.workspace` 三栏 grid（左右同宽 300）+ `.insp` 属性面板（分组标题 / 键值行 / 数值色）+ `.boxmodel` 盒子模型图 + `.code` 代码面板配色，深色只换令牌不换结构；文件 73.3KB / 1,671 行 / 22 个 h2。
- **`references/design-evidence.md`**：A 组第 18 行 + 16 行「A 组补充：MasterGo」表；样本头 20 → **21 站**（A 组 17 → **18**：12 营销/产品 + 6 内容陈列）；正文均值 14.6 → **14.7px**（18 值）、H1 均值 70.8 → **69.8px**（15 站有 h1）、浅色 13 → **14** 站；招式 **43–45**（渐变当墙 / 属性面板字段语言 / 盒子模型图）；反例 +3 行（无 h2、12 屏长页、深色面板沿用浅色卡片）。

### 修改

- **`SKILL.md`**（26.0KB → 27.0KB）：参考库口径改「21 个真实站 + 九份单站蒸馏」；「细则去哪找」加「要做 B 端工具界面 → `mastergo-b2b.md` + §22」；参考文件节新增 `mastergo-b2b.md` 条目；顺手修好 `## 许可` 被粘在上一行行尾的老问题。
- **`README.md`**（98.5KB → 100.6KB）：新增整节「参考站蒸馏：MasterGo（B 端工具界面）」、TOC / 分工表 / 结构树各加一行、元信息 v1.13.1 → **v1.13.2**、参考数据二十份 → **二十一份**。
- **`references/craft-floor.md`**：语料口径 20 站 / A 组 17 → **21 站 / A 组 18**（selfcheck 的"文档数字"这一步会盯着这处）。

### 已知未动

- GitHub 的 `.github/workflows/selfcheck.yml` 仍缺：推它需要带 `workflow` scope 的 PAT（当前 fine-grained token 只给了 Contents: Read and write）。
- Vue / React 两栈适配（`scripts/lib/stacks.mjs`）仍是半成品，未接入 `scaffold.mjs`。
## v1.13.1 - 2026-10-26

一次「还有没有可优化点」的实测审计，修掉三处真错，并补上让这类错不再复发的门。

### 修掉的真问题

- **`install.sh` 的回退下载地址是死的**：没装 git 时它去 `releases/download/<ref>/frontend-fidelity.zip`，而默认 `REF=master`，实测该地址 **404**（发布包只按 tag 发布）。改成按 ref 分流：`v*` 走发布包，其余走源码归档包（Gitee `repository/archive/<ref>.zip`、GitHub `archive/<ref>.zip`，实测 302 可达）；补 `unzip` 存在性检查；解包后按「唯一顶层目录」改名，兼容归档包与发布包不同的顶层目录名。`install.ps1` 本来就是 archive 形式，无需改。
- **四处站点计数陈旧**：README（三处）与 `references/craft-floor.md`（一处）还写着「18 个真实站 / A 组 15」，实际 `references/design-evidence.md` 已是 20 站 / A 组 17。
- **`scripts/selfcheck.mjs` 自己的三处毛病**：`hasCmd()` 用 `shell:true` 在 Node ≥22 触发 `DEP0190` 弃用警告，被 CI 与 pwsh 当成失败；用 ESM `import()` 探 playwright 不认 `NODE_PATH`，永远判「没装」；审计循环用 `spawnSync` 卡住事件循环，内置静态服务发不出响应、审计只能干等。

### 新增

- **`scripts/selfcheck.mjs`**（纯 node，零依赖）：五步——①语法（`node --check` 全部 `.mjs`、`python -m py_compile` 全部 `.py`）；②五套人格 × 六类页面（含 `--dark`）各生成一遍并检查 13 个产物文件；③每套跑 `contrast_check.py`，有未达标即失败；④有 playwright 时起内置静态服务跑 30 组审计，要求 `0 错误 / 0 警告`；⑤**文档数字一致**——以 `design-evidence.md` 为唯一事实源，检查 README/SKILL/craft-floor 里的「N 个真实站」「N 个实测站点」「A 组 N」。flags：`--skip-audit`、`--personas`、`--keep`。
- **`package.json`**：private，`engines.node >= 18`，devDependency `playwright`，`npm run selfcheck` / `selfcheck:fast` / `scaffold` / `audit` / `shot`。
- **`.github/workflows/selfcheck.yml`**：`fast` job 跑 `--skip-audit`（不装浏览器，秒级）；`audit` job 装 chromium 后跑完整 30 组，`workflow_dispatch` 也可手动触发。
- 文档：SKILL 脚本表加 `selfcheck.mjs` 行；README 结构树补 `package.json` 与 `.github/workflows/`，新增「selfcheck.mjs — 一键自检」小节（含五步表格与「这类数字已经漂过三次」的说明）；安装示例里的 `--ref` 从 v1.9.1 更新到 v1.13.1。

### 已知但这次没动的

- GitHub 与 Gitee 的历史是分叉的（GitHub 端因为 git-over-https 不通，是用 Contents API 逐文件提交出来的），GitHub 只能当镜像看。
- 没有 npm / npx 分发入口（技能不是 npm 包，装法只有 clone / 发布包 / 一行 `irm`）。
- README 98.5KB、`references/` 合计 401KB，全量加载成本偏高——按需读的路由表能缓解，但体积本身就是个待解问题。

## v1.13.0 - 2026-10-26

主题：**用 20 站 + 8 份单站蒸馏的结论，重做模式 B（从 0 生成）的架构**。改的不是文案，是生成器本身的形状：深度从「一个数字」变成「一种语言」，人格从三套扩到五套，页面从五类扩到六类，并把对比度门搬到生成期。

### 架构改动（`scripts/scaffold.mjs`，60,066B → 76,4xxB）

- **深度语言三派**：persona 的 `depth: 0 | 3` 换成 `hairline | soft | hard`。`DEPTH` 表给出每种语言的 rest / hover / active 三件套 + 位移量 + 按钮厚度，由 `depth.css` 统一消费。发丝派（shadcn/linear）只加深环不动位；软影派（Stripe/Apple/Wegic）上浮 2px、按下落 1px；硬影派（猫叫兽/Neo-Brutalist）4px→6px→2px，靠位移代替模糊。「像不像某个站」第一次变成选型问题，而不是手调阴影。
- **两套新人格**：`print`（印刷品：近墨黑品牌色、2px 圆角、38px 控件、400/700/800 字重、`paper: true` 让 body 画方格纸、硬阴影、100/160/240 线性动效）与 `magazine`（杂志目录：衬线 `--font-display`、电光蓝 `#2e54ff`、1108 容器、96px 区块留白、发丝环）。两套都明确不适合后台。
- **新页面族 `catalog`（陈列目录页）**：左栏 sticky 目录（搜索 + 分组 + 计数）+ 面包屑 + 刊头 + 药丸筛选 + 计数行 + 3 列图版 + 分页 + 空态；`catalog.css` 独立成文件，`--pages catalog` 才生成。
- **生成期就体检**：写盘后自动算三组关键对比度（正文 `--ink`/`--bg` ≥ 12、`--on-brand`/`--brand-fill` ≥ 4.5、`--brand-ink`/`--bg` ≥ 4.5），摘要打印 `对比度自检：19.8:1 / 4.6:1 / 6.3:1  全部达标`；不达标逐条列出并指路。同时打印深度语言与五档动效阶梯。
- **动效令牌化**：`--dur-1..5`（每套人格按 fast/base 推五档，上限 600）+ `--ease-out/in/in-out/spring` + `--motion` 开关；`prefers-reduced-motion` 下 `--motion: 0`，全站一处归零。
- **浏览器原生表面补齐**：`caret-color`/`accent-color` 跟品牌色、`scrollbar-gutter: stable`、细滚动条按墨色 24% 上色。
- **卡片四件套跟随深度语言**：`.card`/`.tile`（含 hover/focus-within/active）统一走 `--card-shadow*` 与位移变量，卡片不再自己写阴影。

### 验证

- 五套人格 × 六类页面 × 明暗双主题 = **30 组 `audit.mjs` 全部 0 错误 / 0 警告 / 0 类 axe / 0 console / 0 HTTP**。
- 生成期自检五套全过：rational 19.8/4.6/6.3、editorial 16.7/6.4/8.1、warm 16.6/5.1/5.0、print 18.0/4.8/6.0、magazine 19.8/6.6/8.6。
- 令牌对比度门（`contrast_check.py` 传目录）四套各 **113 组 / 0 组未达标（14 组装饰性边框只提示）**。
- 每套人格产出 13 个文件（tokens.json / tokens.css / base.css / components.css / depth.css / catalog.css / ui.js + 6 页）。

### 这一版自己踩的 6 个坑（都已修）

1. 新加的 `depth.css` / `catalog.css` 忘了进 `head()` 的 `<link>` → 样式全丢，catalog 报 12 错误 + 6 类 axe。
2. `<label class="sr-only">` 被判「文本被裁切」→ 改 `aria-label`（和 app.html 的表格 caption 同源处理）。
3. catalog 移动端一堆 32–36px 点击区 → `≤640px` 统一拉到 44。
4. 面包屑链接只靠颜色区分 → axe `link-in-text-block`，必须带下划线。
5. 缩略图硬编码 `var(--hairline)` 不跟深度语言 → 改 `var(--card-shadow)`，并把 hover 作用在缩略图上（否则硬阴影会连文字一起框住）。
6. `print` 的 11px 小字触发 `font-too-small` → 提到 12px。

### 参考文件

- `references/page-patterns.md`：新增 §2.9 陈列目录页骨架（9 行要素表 + 三条硬规则）。
- `references/design-tokens.md`：新增 §2.0 print / magazine 两套预设、§2.1 深度语言三派对照表。
- `references/motion-spec.md`：新增「二·补三 生成器给出的阶梯」（五档 × 三套人格 + `--motion` 开关）。
- `references/craft-floor.md`：令牌落地条目补「一个页面只准一派深度」。
- `SKILL.md` / `README.md`：脚本表、用法、人格差异表、产出清单、验证口径对齐到五套人格 / 六类页面。
## v1.12.0 - 2026-10-26

新增第九份单站蒸馏：Muzli 灵感库（`muz.li/inspiration/motion-design/`）。这一站和前面几个内容站几乎相反——**在页面外壳上做文章，卡片轻到几乎没有**，正好补上「目录型内容站怎么搭壳」这一格；顺带修掉了 `css-recipes.md` 的节号空洞（§20 缺失）与 CHANGELOG 里 v1.11.0 条目被错放到文末的问题。

### 新增

- `references/muzli-gallery.md`（20.3KB / 十一节）：左栏 sticky 目录 220 + 主区 3 列（348×309、`gap:40/32`）、**衬线刊头**（Instrument Serif 48/1.0，与 Poppins 296:9）、**无壳卡片**（图 4px 圆角 + `0 0 0 1px rgba(0,0,0,.05)` 发丝环、本体零边框零阴影）、35px tag 药丸（当前项黑底）、`New` 徽标（11.2/600 `#2e54ff`）、页脚主色 10% 面板、面包屑 + 「N 条新增 · 最后更新」行；另含信息架构（51 张卡全部外链 `me.muz.li` 带 UTM）、动效实测（10 个 keyframes 无一作用在卡片、静止 `getAnimations()` = 0）、七处没做好、能搬/不能搬、十步复现、重采四坑。
- `references/css-recipes.md` §21「杂志目录式灵感库」：`.mz-shell` / `.mz-rail` / `.mz-h1` / `.mz-pills` / `.mz-grid` + `.mz-card` / `.mz-badge` / `.mz-footer`，并补上原站缺的三笔（hover 环加深 + 图微提亮 + 标题下划线、`:focus-visible`）。

### 修改

- `references/design-evidence.md`（44.7KB → 50.2KB）：A 组第 17 行 + 16 行补充表；样本头 19 → **20 站**（A 组 17：11 营销/产品 + 6 内容陈列）；正文均值 14.7 → **14.6px**（17 值）、H1 均值 72.6 → **70.8px**（14 站有 h1）、浅色 12 → **13** 站；招式 40–42（衬线只当刊头 / 图版靠图片边界分组 / 页脚用主色 10%）；反例 +3 行（卡片零 hover 零 focus、广告与内容同构、两套过滤语义）。
- `SKILL.md`（24.1KB → 25.2KB）：参考文件节站数 19 → **20**（A 组 16 → 17）+ 新增 `muzli-gallery.md` 条目；「细则去哪找」加「要『杂志目录』气质」一行；开头的参考库口径改为「20 个真实站 + 八份单站蒸馏」。
- `README.md`（91.4KB → 95.8KB）：元信息 `v1.9.2` → **`v1.12.0`**（此前两轮版本号替换都没命中，一并修好）、开头引用块改「20 个真实站 + 八份单站蒸馏」、TOC/分工表/结构树各加一行、新增整节「参考站蒸馏：Muzli 灵感库（杂志目录式陈列）」、`当前是 v1.3.0` 的过期链接改到 v1.12.0。
- `references/css-recipes.md`：**节号补齐**——原「§21 方格纸规格书」→ **§20**、「§22 杂志目录式灵感库」→ **§21**，`SKILL.md` / `README.md` / `CHANGELOG.md` 的指针同步（此前 §20 是空洞）。
- `CHANGELOG.md`：v1.11.0 条目从文末移到顶部（此前被追加在 v1.0.0 之后）。

### 未动

- `scripts/` 与四个质量门脚本本轮未改（无新判据）。
## v1.11.0 - 2026-10-26

新增第 8 份单站蒸馏：猫叫兽 UI 风格库（`luckymaomi.github.io/ui/`），主题是「印刷品外壳 + 三层展示体系」，视角从「卡片长什么样」扩到「动效与展示怎么组织」。

### 新增

- `references/luckymaomi-catalog.md`（十一节 / 24.4KB）：26 个 `:root` 令牌全表（墨黑边框 `#090a0d`、`--hard-shadow: 4px 4px 0`、圆角只 2px 一档、`--grid-line`）、方格纸底板写法、六档字阶（76/950、40/950、18/400、13/400、12、11/750）、卡片六段结构与全部尺寸（457×477 / 16:9 静态 SVG 预览 / 徽标 36×25 / 色板行 25×14 / 按钮 38 高）、hover 三件事（描黑 + 落硬阴影 + transform 不变）、**动效预算（全站仅 3 条 transition，全部 100ms linear）**、动效库 10 域 57 条及其「触发时机 · 时长」元数据、单条动效详情页的重放实现（删类 → 强制回流 → 加类）、showcase 页的两条 keyframes（`brutal-march` 背景位移跑马灯、`brutal-stamp` 盖章过冲）、三层展示 IA、七处别照抄、十步复现清单、重采方法与三个坑。
- `references/css-recipes.md` §20「方格纸规格书」：`--lm-*` 令牌、`.paper-grid`、`.hard-card`（含 `:active` 用 `translate` 压缩影，避免覆盖外部 `transform`）、`.meta-bar`、`.spec-strip`、`.compact-item`、`.animation-stage` + `.animation-replay`（44×44 可点）、`march`/`stamp` 两条 keyframes、`prefers-reduced-motion` 与 `(hover: none)` 两档兜底、四条使用说明（硬/软阴影不能同页、100ms 只给状态切换、`translate` 而非 `transform`、超重字重在中文字体上会掉档）。
- `references/design-evidence.md`：A 组第 16 行 + 16 行补充表（站点性质 / 前提 404 / 令牌 / 单字体实测 / 字阶 / 容器 / 卡片 / hover / 过渡 / 动效库 / 动效详情 / showcase / 降级 / 反面）；正文均值 14.8 → **14.7px**（16 个值）、浅色 11 → **12** 站、二节标题改「16 个 A 组站」。

### 修改

- `references/motion-spec.md`（11.9KB → 14.5KB）新增两节：**二·补「三份实测的时长口径」**（手感派 spring 220–300ms / 弹性派 400ms / **印刷派 linear 100ms**，并给出印刷派的三个成立条件与「整站统一」要求）、**二·补二「动效索引的元数据约定」**（条目第二行固定写「触发时机 · 时长」，六种时机的标准写法，目录不放动图，详情页必须可重放并给出 `replay()` 实现）。
- `SKILL.md`（23,881B）：参考文件节新增 `luckymaomi-catalog.md` 条目、实测站数 18 → **19**（A 组 15 → 16）；「细则去哪找」路由表加「要『印刷品』气质」一行；速查数字里动效那条补「印刷派例外：状态切换 100ms linear、按钮 160ms」。
- `README.md`（86.6KB → 91.4KB）：TOC 与「该抄哪份参考」分工表各加一行、仓库结构树加一行、新增整节「参考站蒸馏：猫叫兽 UI 风格库（印刷品外壳 + 三层展示体系）」（四块产出表 + 三招表 + 五处也别学 + 重采命令 + 坑）、份数 18 → 19、元信息 `v1.10.0` → `v1.11.0`。

### 未动

- `scripts/` 与四个质量门脚本本轮未改（无新判据）。
- 跨站统计里 H1 均值与「有 h1 的站数」不变（本站规格页与 showcase 页有 h1，但目录页没有，计入「14 站有 h1」）。

## v1.10.0 - 2026-10-26

新增一份**单站动效蒸馏**（holynova），并把"卡片怎么活起来"从原则落成可粘贴的片段。这是第一次以动效为唯一主题做的站点分析，补充 `motion-spec.md`（规则）缺的"照它做长什么样"。

- **新增 `references/holynova-motion.md`**（15.9KB / 十一节）：<https://holynova.github.io/> 实测——431 元素、0 canvas / 0 video、**零动效库**，全站只有 **23 条 transition、3 个 keyframes、1 条主缓动**（`cubic-bezier(.16,1,.3,1)`）与实测 9 档时长（120/150/180/200/220/250/300/350/400ms，令牌里归并成 6 档）。含：三条 keyframes 原文、hover 四件套的规则与前后实测对照（`translateY(-4px)`、边框 `.07→.22`、阴影两层→三层、图片 `brightness(.95) saturate(.97)`、按钮 `opacity 0→1` + `translateY(5px)→0`）、` :active` 回落 `-1px`、聚光描边卡的 `::before`（`mask ... content-box exclude` 抠 1px 环）与 `::after`（环境光）完整源码 + 四个坑、批量入场（`both`、只演一次、无 stagger 的代价）、reduced-motion 连装饰层一起关、**七处别照抄**、十步搬用清单、重采方法。
- **`references/css-recipes.md` 新增 §19「聚光描边卡」**：`--spring` / `--dur-1..6` / 阴影令牌、`.spotlight-card`（hover 四件套 + `:focus-within` 同组 + `:active` 回落）、两个光层、媒体压暗、浮出按钮、`.card-appear` 与封顶 stagger、`(hover:none)` 与 `prefers-reduced-motion` 两档降级、十行 `pointermove` JS。
- **`references/motion-spec.md`**：§十 增加指向案例的说明（"该不该/多长"看规格，"长什么样/实测多少"看案例）；§十一 来源补 holynova 的实测值。
- **`SKILL.md`**：细则路由表加一行「卡片 hover 怎么活起来 / 聚光描边」；速查数字补「hover 要四件套一起变，只变一样会显得抖了一下」；参考文件节新增条目。
- **`README.md`**：份数口径从"十六份（13 实测 + 2 外部 + 1 动效规格）"改为**十八份**（7 单站蒸馏 + 8 通用规格 + 1 跨站实测 + 2 外部规则集）；「该抄哪份参考」的动效段补 §19 入口；分工表与结构树各加一行；新增整节「动效单站蒸馏：holynova 聚光卡」（产出表 + 三招表 + 也别学它三处 + 重采命令）。

验证：`node scripts/audit.mjs` 与 `contrast_check.py` 的口径未变（本轮不动脚本）；README 锚点复验通过；文档内所有数值均可回查 `E:\SKIl.1\.tools\out\hn\facts{1,2,3}.json` 与 `hover.json` / `scroll.json`。
## v1.9.2 - 2026-10-25

修掉上一轮验证剩下的四个小口子，并补齐两处会误导人的输出。

- **`scripts/audit.mjs` 认得出兄弟 label**：`<input id=x>` + `<label for=x>` 是合法写法，原来只查 `closest('label')`，会误报 13×13 点击区。补 `label[for="${CSS.escape(id)}"]` 回退。
- **`scripts/audit.mjs` 点击区警告不再静默截断**：原来 `tiny++ < 8` 只显示前 8 条，超出的既不显示也不计入，容易把「20 处问题」看成「8 处」。现在逐条计入（总数正确），明细最多列 20 条，其余汇总成「另有 N 个」。
- **`scripts/contrast_check.py` 加 `--all`**：默认只列前 60 组配对，多出来只写「另有 N 组未显示」；现在 `--all` 打印全部，提示里也写明了开关。
- **`scripts/hygiene.mjs` 有 `--help` 了**：原来 `-h`/`--help` 会直接报「源码目录为空」，和其他脚本不一致；现在打印完整用法（`--src` / `--root` / `--out` / `--out-txt`），报错文案也指向 `--help`。
- **安装器把安装器自己也装上**：`install.sh` / `install.ps1` 的复制清单补上这两份，装好的技能目录里能看到它们。
- **安装器的自检提示不再写死路径**：原来提示里写 `$HOME\.claude\skills\...`，用 `-Dir` 装到别处就给错命令；现在用实际目标目录。
- **EOL 规则补到 `LICENSE` / `.gitignore`**：两份原来在索引用 LF、工作区被 CRLF 化，来回抖动。
- **文档口径**：`references/craft-floor.md` 的「17 个真实站」改为 18 个（A 组 15）；README 的 `--ref` 示例从 v1.8.0 更新到当前版本，「第 14 个 A 组样本」这种会过期的表述改成中性写法。

验证：三套人格 × 五类页面 × 明暗双主题 15 组审计仍为 0 错误 / 0 警告 / 0 类 axe；对比度 81 组 / 0 组未达标；点击区负向测试（40×40）能被拦下、44×44 与行内链接（WCAG 2.5.8）不误报；30 个 20×20 按钮的页面报「20 条明细 + 另有 10 个」。

---
## v1.9.1 - 2026-10-25

修掉外部代码评审提出的 7 处问题（4 个 P1 会让质量门假通过，3 个 P2 会误导照文档操作的人）：

- **对比度门不再假通过**：`scripts/contrast_check.py` 的位置参数现在支持目录（递归找 `*.css`），路径写错或目录里没 CSS 直接退出 2；此前传目录会静默输出「0 组」并退出 0。
- **点击区阈值统一到 44**：`scripts/audit.mjs` 的 `small-tap-target` 从 32 改成 44，与 `SKILL.md`、`references/review-rubric.md` 同口径；同时按 WCAG 2.5.8 豁免正文行内文字链接，复选框/单选框改量包裹它的 `label`。
- **模式 B 的验收闭环**：`scripts/run_checks.mjs` 在没有 `package.json` 时明确提示「跳过项目自带质量门」并退出 0（不再退出 2）；`SKILL.md` 的模式 B 第 6 步改为「截图 + 审计 + 对比度」三件，不再要求对静态生成物跑 run_checks。
- **生成器不再自己违规**：`scripts/scaffold.mjs` 去掉装饰 eyebrow（撞 anti-slop 的 eyebrow 密度与状态文案禁令）、去掉「无需信用卡」式 CTA 微文案、`outline: none` 改成 `:focus-visible` 可见轮廓、移动端 `.btn`/`.nav-item`/`.btn--icon`/`.check`/页脚链接一律 ≥44，三套人格 × 五页 × 双主题复跑后 **0 error / 0 warn / 0 axe**。
- **入口瘦身**：`SKILL.md` 从 528 行 / 45KB 压到 283 行 / 22KB——视觉与结构细则整段下沉到新文件 `references/visual-system.md`（299 行），入口只留「判断走哪条路 → 工作流 → 质量门 → 细则路由 → 十个速查数字」。
- **对比度门自己也不再误报**：`contrast_check.py` 的令牌配对规则补齐三条——跳过 `--_*` 这类 `color-mix` 内部私有变量；`--on-brand` 只与填充色（`--brand-fill` 等）配对、不再和 `--brand-50…300` 色阶比；发丝边框（`--border`/`--hairline`/`--divider`）默认按装饰处理，只打 `info` 不计入失败（只有带 `strong`/`focus`/`active` 的才算真边界）。同时 `discover_css()` 改成只看相对目录层级——此前路径里只要出现 `out`/`dist` 这类目录名，整棵 CSS 树会被跳过。生成物最弱的文字档 `--ink-4` 从 50% 提到 61%（深色 .46 → .58），三套人格的对比度门现在都是 **0 组未达标**。
- **修掉破坏性笔误**：`SKILL.md` 的 `udit.mjs` / `un_checks.mjs` 改回 `audit.mjs` / `run_checks.mjs`；`craft-floor.md` 条目不再粘在上一行行尾；`scaffold.mjs` 收尾提示原来是「file:// 有 CORS 噪声」紧跟一条 `file:///` 截图命令，现在统一改成走 `http://127.0.0.1`。

## v1.9.0 - 2026-10-25

让「装上」变成一行命令，并把实测数据摆到首屏。

### 新增

- **`install.sh`**（macOS / Linux / Git Bash）与 **`install.ps1`**（Windows PowerShell）：默认同时装到 `~/.claude/skills/frontend-fidelity` 与 `~/.dsh/skills/frontend-fidelity`，支持 `--target claude|dsh|both`、`--dir`、`--ref`、`--repo`、`--dry-run`。优先 `git clone --depth 1`，机器上没有 git 时回落到 Gitee / GitHub 的 archive zip。`install.ps1` 带 UTF-8 BOM——PowerShell 5.1 读无 BOM 的 UTF-8 脚本会按 ANSI 解析，中文注释里的字节会被误认成引号，直接语法报错。**代价**：`irm ... | iex` 拿到的字符串里 BOM 会变成不可见字符顶在 `<#` 之前，`[CmdletBinding()]` 被判「意外属性」；README 的 Windows 一行装因此写成 `iex ((irm ...).TrimStart([char]0xFEFF))`，并给了「先 `-OutFile` 再执行」的等价写法——两种都实测装出 16 份 references。
- **README「30 秒安装」**：三行命令 + 五个常用参数 + 手动 clone 兜底 + 装完怎么触发（Claude Code / DSH 各自的入口）。
- **README「它到底量大到什么程度」**：六行实测摘要表（正文 14.8px / H1 72.6px / 圆角六做法 / 阴影五派 / 动效中位数 1 / 图墙三派），链到 `design-evidence.md`。

### 修改

- README 开头补一行口语关键词（设计稿转代码、照着截图还原、UI 还原、前端验收、截图对比、后台美化、移动端适配、设计令牌、Claude Code 技能）——此前通篇术语，搜不到。
- 修复 `references/motion-spec.md` 链接的 `eferences` 笔误。
- `.gitattributes` 补 `*.sh text eol=lf` 与 `*.ps1 text eol=crlf`：安装脚本落地时不能带 CRLF，否则 bash 会因为 `\r` 报 `bad interpreter`。
## v1.8.0 - 2026-10-25

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
## v1.7.0 - 2026-10-25

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
## v1.6.0 - 2026-10-25

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
## v1.5.1 - 2026-10-25

只改文档：给 README 加一张**选型索引表**。此前十二份参考数据平铺在目录里，读的人得先点进各节才知道该抄哪份；现在按「你在做什么页面」直接对到文件与配方小节。代码零变更。

### 新增

- **`README.md` 顶部新增 `## 该抄哪份参考`**（插在目录之前，TOC 首条）：一张 6 行表把页面类型对到参考文件——营销落地页 → `wegic-design.md` + 配方 §12、工具站/SaaS 首页 → `jsdesign-design.md` + §13、密版作品墙 → `uishijie-design.md` + §14、疏版作品墙 → `zcool-design.md` + §15、目录/陈列页 → `stylekit-design.md` + §16、后台/管理端 → `page-patterns.md` + `component-spec.md` + `design-tokens.md`（并注明后台在单站样本里没有，横向数据走 `design-evidence.md` B 组）。
- 表下补两条读法提醒：**别把「他们的取舍」当规范**（三份中文内容站都是系统字体栈 + 13–14px 正文，那是塞密度的代价）；**单站样本只证明「可以这么做」**，判断行业常态去 `design-evidence.md` 看 17 个站里出现几次。

### 修改

- `README.md` 版本号 `v1.5.0` → `v1.5.1`；目录加首条锚点；全文 EOL 归一为 CRLF（此前混了 68 行 LF）。
## v1.5.0 - 2026-10-25

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
## v1.4.0 - 2026-10-25

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
## v1.3.0 - 2026-10-25

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
