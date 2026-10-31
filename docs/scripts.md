## 脚本手册

### scaffold.mjs — 从 0 生成前端骨架

一次性产出设计令牌 + 组件样式 + 七类页面（含移动端壳），拿到就能跑、能量、能改。**模式 B 的第一步**。

```bash
# 后台：令牌 + 组件 + 落地页/列表/表单/认证/状态页
node scripts/scaffold.mjs --persona rational --out src --pages landing,app,form,auth,states

# 移动端 H5：390 单列壳 + 安全区 + 4 项底部 tab + 原生 dialog 底部面板
node scripts/scaffold.mjs --persona warm --out h5 --pages mobile --verify

# 换品牌色相（深色令牌默认生成，要关用 --no-dark）
node scripts/scaffold.mjs --persona warm --accent 20 --out preview --pages landing,form

# 照着参考站做：探针实测值盖进人格字段，生成即验收
node scripts/scaffold.mjs --ref-url https://linear.app --out ui --pages app,form --verify

# 产品名替换标题里的占位
node scripts/scaffold.mjs --name "南风工单" --out src --pages app,form
```

| 参数 | 说明 | 默认 |
| --- | --- | --- |
| `--persona` | `rational`（SaaS/后台，方正克制）／`editorial`（内容、品牌站，字重轻留白大）／`warm`（消费级、社区，暖色圆角厚）／`print`（印刷品：方格纸 + 墨框 + 4px 硬阴影）／`magazine`（杂志目录：衬线刊头 + 电光蓝 + 无壳图版） | `rational` |
| `--out` | 输出目录 | `ui-scaffold` |
| `--pages` | 逗号分隔：`landing,catalog,app,form,auth,states,mobile` | `landing,app` |
| `--stack` | `html` / `react` / `vue` / `all`：额外产出框架版（默认 `html`） | `html` |
| `--accent` | 覆盖品牌色相 0–360（不填用该人格默认） | 人格预设 |
| `--no-dark` | 不生成 `.dark` 令牌块（默认生成，主题开关不该是死按钮） | 开 |
| `--name` | 产品名 | `示例产品` |
| `--ref-url` | 先跑 `probe-ref.mjs` 量这个站，用实测值覆盖人格字段（品牌色相、底色、字阶、控件高、圆角、密度；逼近 80%，剩下改 `tokens.css`） | 关 |
| `--ref-json` | 直接用已有的 probe-ref JSON，不再跑一次探针 | 关 |
| `--verify` | 生成后自动起内置静态服务，逐页跑 `audit.mjs`（明暗双主题）+ `contrast_check.py`，报告写 `<out>/.verify/report.json`，`status` 三态对应退出码：`pass` 0 / `fail` 1 / `partial` 3（缺 python 或 playwright 时跳过某些项即 `partial`，**不再当通过**） | 关 |
| `--allow-partial` | 配 `--verify`：接受不完整验收，`partial` 也退出 0（交付说明里必须写明哪几项没验） | 关 |
| `--export` | 逗号分隔：`tailwind,antd,element`——把同一份令牌额外导出成 `tokens.tailwind.js` / `tokens.antd.json` / `tokens.element.scss`，数值与 `tokens.css` 同源 | 关 |
| `--quiet` | 少打印 | 关 |
| `--help` / `-h` | 打印用法后退出 | — |

**产出**（平铺在 `--out` 目录：7 个 CSS/JS + 各页面，全量 14 个文件）：

```
<out>/
├── tokens.json          # 令牌源，可喂给设计系统或其他工具
├── tokens.css           # 颜色/间距/字阶/圆角/阴影/动效变量，含可选 .dark
├── base.css             # reset、排版、焦点环、::selection、reduced-motion
├── components.css       # 按钮/表单/卡片/表格/标签/提示/空态/骨架/tabs/弹窗/toast + 外壳
├── depth.css            # 深度三派（发丝 / 软影 / 硬影）的卡片四件套；print 额外画方格纸
├── catalog.css          # 陈列目录页：左栏目录 + 药丸筛选 + 3 列图版 + 分页
├── mobile.css           # 移动端壳：390 单列 + 安全区 + 底部 tab + 原生 dialog 面板
├── ui.js                # 主题切换（localStorage）、密码显隐、tabs 键盘、modal Esc
└── *.html               # index / catalog / app / form / auth / states / mobile，按 --pages 决定
```

退出码：`0` 成功；`2` 参数错（未知人格 / 未知页面名，同时打印可选值）；
带 `--verify` 时另有 `1`（有检查没通过）与 `3`（只验了一部分，缺依赖）——`3` 不等于通过，别用 `|| true` 吞掉。

### 框架版：`--stack react` / `vue` / `all`

原生 HTML 那套 CSS 是唯一的视觉事实源；`--stack` 只是把同一批类名包成组件，**不重写任何样式**：

```
node scripts/scaffold.mjs --persona rational --stack react --pages landing,app,catalog --out src
node scripts/scaffold.mjs --persona rational --stack vue   --pages landing,app,catalog --out src
node scripts/scaffold.mjs --persona rational --stack all   --pages landing,app,catalog --out src   # 两栈同时出
```

产出（每栈各一套，共用同一份 CSS）：

```
src/react/                     src/vue/
├── package.json  tsconfig.json   ├── package.json  tsconfig.json  env.d.ts
├── tailwind.preset.js  tailwind.css  ← Tailwind 桥（v3 用 preset / v4 用 @theme）
├── vite.config.ts  index.html    ├── vite.config.ts  index.html
└── src/                          └── src/
    ├── main.tsx  App.tsx             ├── main.ts  App.vue
    ├── lib/{cx,theme,api}.ts         ├── lib/{cx,theme,api}.ts   ← api.ts：fetchJson + useAsync（三态 + 竞态保护）
    ├── styles/{index,tokens,base,components,depth,catalog}.css   ← 与 html 版逐字节相同
    ├── ui/{Button,Form,Surface,Data,Overlay}.tsx + index.ts      ← Vue 是 19 个单文件组件
    └── pages/{Dashboard,Catalog}.tsx                             ← 各含 mock 数据与「{{TODO}}」
```

生态位：`react-router-dom` / `vue-router` 真路由（`/`、`/catalog`，深链可直达，服务端记得配 history fallback）；`src/lib/api.ts` 给统一取数与三态；`tailwind.preset.js` / `tailwind.css` 把设计令牌映射成 Tailwind 主题（项目已有 Tailwind 时直接接）；深色令牌**默认生成**，主题开关可用（要关用 `--no-dark`）。

组件只做 props → className 的映射（`<Button variant="primary" size="sm">` → `class="btn btn--primary btn--sm"`），
没有一处 `<style>`、没有样式库、没有 CSS-in-JS——所以**框架版与 html 版像素一致，改令牌两边同时变**。

已验证到什么程度（v1.14.0 实测，命令可复现）：

| 关卡 | 结果 |
| --- | --- |
| `tsc --noEmit`（strict） | React 0 错误 |
| `vue-tsc --noEmit` | Vue 0 错误 |
| `vite build` | React 153.06 kB / gzip 49.61 + CSS 25.52 kB；Vue 76.74 kB / gzip 30.75 + **CSS 25.52 kB（与 React 逐字节相同）** |
| `audit.mjs`（打包产物，桌面/平板/手机 × 明暗） | 两栈各 6 组 **0 错误 / 0 警告 / 0 类 axe / 0 console** |
| 类名对齐 | 组件引用的类名全部在 CSS 里存在（`selfcheck.mjs` 的「框架栈」一步守着） |

两个坑写在生成物 README 里：`NODE_ENV=production` 的终端里 `npm install` 会跳过 devDependencies（用 `npm install --include=dev`）；
`{{TODO: …}}` 在 JSX 里会被当成对象字面量，所以生成物统一走 `todo('…')` 函数。
**生成物已过 `audit.mjs` 的明暗双主题验证**：五套人格 × 七类页面 × 三视口 × 明暗 = 210 个渲染组合，0 error / 0 warn / 0 axe 违规（`node scripts/selfcheck.mjs` 一条命令可复现）；令牌对比度门每个 119 组 / 0 组未达标。
但它只保证「层级、间距、状态、可访问性」这些硬骨头，文案全是 `{{TODO: ...}}` 占位——
你的活是把它们换成真内容（见 `references/copy-and-content.md`），别直接当成品交付。

页面骨架清单写在各 HTML 顶部的注释里，照着补删改比重写快。

---

### selfcheck.mjs — 一键自检（改技能本身之后跑这个）

```bash
node scripts/selfcheck.mjs              # 全跑（没有 playwright 时自动跳过审计）
node scripts/selfcheck.mjs --skip-audit # 跳过浏览器审计/流程/设计体系回归；其余检查仍执行，供快速 CI 使用
npm run selfcheck                       # 同上，走 package.json 里的脚本
node scripts/selfcheck.mjs --keep       # 保留临时目录，方便看生成物
```

贡献者先执行 `npm install`（Playwright + esbuild），完整审计另需 `npx playwright install chromium`。esbuild 只供框架生成物语法检查，运行普通截图/审计不需要它。

分项检查，任何已执行项失败都以非 0 退出；缺依赖或显式跳过时，结尾列出未执行项，不宣称完整通过：

| 步骤 | 做什么 | 失败含义 |
| --- | --- | --- |
| 参数语义 | 纯断言（不需要浏览器）：MSYS 路径还原 5 条、按页 `--expect-text` 3 条 | `lib/common.mjs` 的参数解析被改坏了 |
| 语法 | 递归 `node --check scripts/` 的 `.mjs`（含 `lib/`）；`python -m py_compile` 顶层 `.py` | 改脚本时手滑了 |
| 生成 | 五套人格 × 七类页面各生成一遍，检查 14 个产物文件齐 | `scaffold.mjs` 坏了 |
| 对比度 | 对每套生成物跑 `contrast_check.py`，有未达标即失败 | 令牌改暗了/改浅了 |
| 审计 | 内置静态服务 + `audit.mjs --themes light,dark`，五套 × 七页 × 三视口 × 双主题共 210 个渲染组合，均须 `0 错误 / 0 警告` | 生成物出现了 a11y 回归 |
| 流程 | 用 `flow.example.json` 对骨架跑一遍完整交互，确认步骤/断言/报告链路没坏 | `flow.mjs` 坏了 |
| 设计体系回归 | 合规 / 越档 / strict / 允许列表 / 忽略与未启用对照；无效配置反例 | 新审计漏报、误报或退出码协议被改坏 |
| 框架栈 | React / Vue 生成、类名对齐；有 esbuild 时检查 TSX / TS 语法 | 框架生成物不自洽；缺 esbuild 明确列为未执行项 |
| 文档数字与规则回归 | 当前计数、冻结均值、中文数字及正反例，见下 | 站点数 / 份数 / 均值在文档里漂了 |
| 文档链接 | README / SKILL / CHANGELOG / docs / references 的 Markdown 相对文件链接 | 文件改名或移动后断链；不检查远程与标题锚点 |
| 历史日期与版本顺序 | 日期合法、非未来、新到旧；版本严格递减 | 日期倒挂、缺失或重复版本 |
| 版本号 | `package.json` 的 version 与 README 徽标 / 安装示例 /「当前是」、`install.sh` 示例、CHANGELOG 首条逐一比对 | 发版时漏改某处，按文档判版本的人读到旧号 |

「文档数字」以 `references/design-evidence.md` 的站点头与冻结跨站统计为准，检查 README、SKILL、design-evidence、craft-floor、visual-system、workflow 及 docs 下两份手册。
兼容 `N 个真实站` / `N 个实测站` / `N 个实测成功站点` / `N 站实测` / `A 组 N` / `语料全量 N 站`，以及中文数字。
单站蒸馏份数从磁盘单站文件统计，顶层可执行脚本数从 `.mjs` / `.py` 文件统计；`N 份单站蒸馏`、`N 个能直接跑的脚本` 的中文数字写法也不能绕过检查。
README 当前跨站正文 / H1 均值必须等于冻结基线；单站条目中明确记录的历史演变数值不强改。必要文档缺失或基准不可解析直接失败，不能作为跳过项。

这一项是补出来的：这类数字在本项目已经漂过三次，且都漂在「换个说法就绕过检查」上——
`visual-system.md` 整个文件不在扫描范围；`craft-floor.md` 里那种「数字 + 站实测」的连写不匹配旧正则，躲过了两版检查。
**要么统一写法，要么改检查，别指望记得住。**

「版本号」同理：版本号手写在五处，README 元信息曾连续两个版本停在 `v1.9.2`，两次替换都没命中。
它只比对「应当等于当前版本」的写法——README 徽标、`--ref` 示例、「当前是 vX.Y.Z」、`install.sh` 示例、CHANGELOG 首条；
历史条目里的旧版本号不参与比对。

CI 在 `.github/workflows/selfcheck.yml`：push / PR / 手动触发均配置 fast 与 audit 两个任务；完整审计覆盖 210 个渲染组合，另跑设计体系回归。长审计使用后台任务，不把前台超时误判为脚本失败。
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
| `--pages` | – | 逗号分隔的路径/URL（`/orders,/settings`），或一个 `.txt` 清单文件（每行一条，`#` 注释）；Windows 下的路径坑见下方「坑」 |
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

**坑（Windows / Git Bash）**：在 Git Bash、MSYS2、Cygwin 里写 `--pages /,/orders`，shell 会把 `/orders` 当成 POSIX 绝对路径改写成 `C:/Program Files/Git/orders` 再传进来，脚本再按 URL 解析就成了 `file:///…`，报 `ERR_FILE_NOT_FOUND`。脚本现在能认出 Git for Windows / PortableGit / MSYS2 / Cygwin 这几种安装根并自动还原（会在 stderr 打一条 `WARN`），但最稳的写法是**去掉前导斜杠**：`--pages index.html,orders`；要站点根路径就写 `--pages .`。或者显式加 `MSYS_NO_PATHCONV=1`。PowerShell / cmd 不受影响。

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

# 多页 + 每页各自的期望文案（用 | 按 --pages 顺序对应，段数必须一致）
node scripts/audit.mjs --base http://localhost:5173 --pages /,/orders --expect-text "工作台|订单列表"

# 只跑结构检查，跳过 axe（想更快时）
node scripts/audit.mjs --url http://localhost:5173/ --no-axe
```

| 参数 | 默认 | 说明 |
| --- | --- | --- |
| `--url` / `--pages` / `--base` | 必填 | 语义同 `screenshot.mjs`；`--base` + `--pages /a,/b` 最省事 |
| `--viewports` | `desktop,tablet,mobile` | 移动端才做点击区检查 |
| `--themes` | `light` | 建议 `light,dark` |
| `--expect-text` | – | 页面 `innerText` 必须包含的文案（区分大小写）；用于抓"被重定向回登录页"。多页时用 `\|` 按页对应（`--pages /a,/b --expect-text "A 页文案\|B 页文案"`，段数必须等于页数）；只写一段表示所有页共用——多页下必然误报，别这么用 |
| `--storage-state` | – | `auth.mjs` 产出的登录态 |
| `--reduced-motion` | 关 | 以 `reduce` 偏好渲染，并额外检查仍在无限循环的动画 |
| `--axe` | 开 | `--no-axe` 关闭 WCAG 检测（只跑结构检查） |
| `--wait` | `800` | 导航后等待 ms |
| `--out` | `audit-report.json` | 报告路径 |
| `--design-system` | 关 | 裸参数使用默认基线；跟 JSON 路径则使用项目自己的字号/间距/圆角档位与预算，默认仅警告 |
| `--strict-design-system` | 关 | 将 `design-system-*` 警告升级为 error；必须同时启用 `--design-system` |
| `--help` | – | 打印设计体系审计入口；完整参数见本节 |

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
| warn | `small-tap-target` | 移动端点击区 < 44×44px；正文行内链接豁免，复选框按 label 量 |
| warn | `icon-button-no-label` | 图标按钮无 `aria-label` / `title` |
| warn | `motion-not-reduced` | 减少动效下仍无限循环 |
| warn | `axe:<rule>` | axe moderate / minor 违规 |
| 报告 | `layout-shift` | CLS > 0.1 时提示 |
| warn / strict 时 error | `design-system-font-sizes` | 未声明字号，或未提供字阶时超过档数预算 |
| warn / strict 时 error | `design-system-spacing` | padding / margin / gap 不在已声明档位或默认网格内 |
| warn / strict 时 error | `design-system-radii` | 非全圆角未声明，或超过档数预算 |
| warn / strict 时 error | `design-system-shadows` | 完整 `box-shadow` 声明套数超过预算 |

- axe 只跑 **WCAG 2.1 A/AA** 规则集（`wcag2a`、`wcag2aa`、`wcag21a`、`wcag21aa`），跳过 best-practice，避免刷屏。
- `audit-report.json` 里每条违规都带 `helpUrl` 与命中节点的 HTML 片段，能直接定位。
- **退出码：有 error 时为 1；参数/配置错误时为 2**。默认设计体系警告不改变退出码，核定配置后用 strict 作 CI 门禁。

#### 设计体系一致性：先声明，再验收

```bash
# 首轮找漂移，不强制改既有设计体系
node scripts/audit.mjs --url http://localhost:5173/ --themes light,dark --design-system
# 项目令牌已确定后，作为 CI 门禁
node scripts/audit.mjs --url http://localhost:5173/ --design-system design-system.json --strict-design-system
```

配置文件示例（**CSS px**，不是设备像素；只填写需要覆盖的键即可）：

```json
{
  "spacingBase": 4,
  "tolerance": 0.25,
  "maxFontSizes": 7,
  "maxRadii": 4,
  "maxShadows": 3,
  "fontSizes": [12, 13, 14, 15, 16, 20, 24, 32],
  "spacingValues": [2, 4, 8, 12, 16, 24, 32, 48, 64],
  "radii": [2, 4, 8, 12],
  "ignoreSelectors": [".third-party-widget"]
}
```

- 默认 `spacingBase=4`、`tolerance=0.25px`、字号预算 7 档、非全圆角预算 4 档、阴影预算 3 套；三个允许列表默认 `null`。
- 提供 `fontSizes` / `radii` 后，以允许列表取代对应档数预算；提供 `spacingValues` 后，以列表取代网格。既有体系的 15px、17px 字号不因数值本身判错。
- 字号只统计直接文本与表单控件；间距只统计 padding / margin / gap，负外边距按绝对值。`auto` 居中外边距与百分比流式间距不作离散网格检查；小于半个间距基数的位移（如 `sr-only` 的 -1px、描边对齐）视为光学补偿，不计入档位。
- 全圆/胶囊单独计数，不占非全圆角预算；每个完整 `box-shadow` 声明算一套（多层阴影不是多套）。不同颜色或不同状态会成为不同声明，需按实际体系配置预算。
- 不统计隐藏元素、SVG 内部单位与无 CSS 盒子的节点；`ignoreSelectors` 或 `data-fidelity-ignore="design-system"` 跳过对应子树，豁免须在交付记录解释。
- 报告 `options.designSystem` 保存实际配置；每页 `designSystem` 给出档位、频次与选择器/属性示例；问题也进入 `issues`。未启用时，不增加每页设计体系统计。
- 只覆盖**当前渲染状态**，不证明 hover / focus / 错误态齐全，也不证明源码使用了变量。流式字体、第三方控件或浏览器原生样式可能需要人工复核；机器统计不能替代截图评审。

---

### flow.mjs — 交互流程验收（点得通吗）

**用途**：把「登录 → 填表 → 提交 → 出现成功提示」跑一遍，失败时告诉你第几步、哪个选择器、现场长什么样。
只回答「这条路径能不能走通」——**不做测试框架**：没有断言库、没有重试策略、没有网络拦截、没有多标签页，要那些用 Playwright Test。

```bash
# 一条登录流程，深色主题走一遍
node scripts/flow.mjs --flow login.json --base http://localhost:5173 --theme dark

# 从某页开始，每步都截图（交付留证据）
node scripts/flow.mjs --flow order.json --url http://localhost:5173/orders --screenshot

# 失败不中断，一次看全所有问题
node scripts/flow.mjs --flow order.json --base http://localhost:5173 --continue

# 调选择器：有头模式 + 每步慢 300ms
node scripts/flow.mjs --flow order.json --base http://localhost:5173 --headed --slow 300
```

`login.json`：

```json
{
  "name": "登录并进入工单列表",
  "start": "/login",
  "steps": [
    { "fill": "#email", "value": "qa@example.com" },
    { "fill": "#password", "value": "secret" },
    { "click": "button[type=submit]" },
    { "expectUrl": "/dashboard", "desc": "登录后跳到工作台" },
    { "expectText": "工单列表" }
  ]
}
```

**动作**（每步只能有一个）：

| 动作 | 写法 | 说明 |
| --- | --- | --- |
| `goto` | `"url"` 或 `{ "url": "/orders", "waitUntil": "load" }` | 相对路径要配 `--base` |
| `click` | `"selector"` 或 `{ "selector": "...", "nth": 0 }` | 默认点第一个匹配 |
| `fill` | `{ "selector": "#title", "value": "..." }`，也可平铺 `{ "fill": "#title", "value": "..." }` | |
| `select` | `{ "selector": "#type", "label": "故障" }` 或给 `value` | 按可见文本或 value 选 |
| `press` | `"Enter"` 或 `{ "key": "Escape", "selector": ".modal" }` | 给了 selector 会先聚焦 |
| `wait` | `{ "ms": 500 }` 或 `{ "selector": ".spinner", "hidden": true }` | |
| `expectText` | `"文案"`（整页）或 `{ "text": "...", "selector": ".toast" }` | 轮询到超时 |
| `expectVisible` / `expectHidden` | `"selector"` | |
| `expectUrl` | `"片段"` | `url().includes()` |
| `expectCount` | `{ "selector": "tr", "value": 6 }`，或给 `min` / `max` | 三者至少一个 |
| `expectValue` | `{ "selector": "#email", "value": "..." }` | 防受控组件没接住输入 |
| `screenshot` | `"文件名"` | 整页图，落在 `--out` |

通用字段：`timeout`（覆盖 `--timeout`）、`desc`（失败日志里显示）、`optional`（失败不拦路，汇总里单列）。

**参数**

| 参数 | 默认 | 说明 |
| --- | --- | --- |
| `--flow` | 必填 | 流程 JSON；也可以直接传一个步骤数组 |
| `--base` | – | 站点根，`goto` / `start` 的相对路径拼到它后面 |
| `--url` | – | 起点（优先于 JSON 里的 `start`） |
| `--viewport` | `desktop` | `desktop` / `tablet` / `mobile` / `1440x900` |
| `--theme` | `light` | `dark` 会同时打 `.dark` / `data-theme` / `prefers-color-scheme` |
| `--timeout` | `5000` | 每步超时 ms |
| `--out` | `.design/flow` | 报告与截图目录 |
| `--continue` | 关 | 失败后继续跑余下步骤 |
| `--screenshot` | 关 | 每步都截图（默认只在失败与显式 `screenshot` 步骤截图） |
| `--slow` | `0` | 每步之间等 ms，调选择器时用 |
| `--headed` | 关 | 有头浏览器 |
| `--storage-state` | – | `auth.mjs` 导出的登录态；流程里就不必再登一次 |

**产物**：`<out>/flow-report.json`（每步 `index` / `action` / `target` / `ok` / `ms` / `error` / `screenshot`）+ `<out>/*.png`；失败必截 `fail-<序号>.png`。

**退出码**：`0` 全过 / `1` 有步骤失败 / `2` 参数或流程文件错误（**开跑前**就校验并列出第几步缺什么，不会跑到一半才崩）。

**边界**：不做断言库、不做重试、不做网络拦截、不做多标签页；需要参数化、fixture、并行时转 Playwright Test。这里只保证「一条真实用户路径能走通，并留下证据」。

`scripts/flow.example.json` 是可直接跑的示例（对 scaffold 生成的骨架做冒烟），`selfcheck.mjs` 用它守着这条链路。

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

### agent-adapter.mjs — 给其他 AI / Agent 生成规则入口

**用途**：不同工具读不同的规则文件。按目标生成对应入口，内容只有「指路 + 三条铁律」，不复制参考库。

```bash
node scripts/agent-adapter.mjs --target codex --out ./repo
node scripts/agent-adapter.mjs --all --out ./repo
node scripts/agent-adapter.mjs --target gemini --print
```

| 参数 | 默认 | 说明 |
| --- | --- | --- |
| `--target` | 必填 | `codex` / `gemini` / `cursor` / `windsurf` / `cline` / `roo` / `continue` / `openhands` / `aider` / `zed` / `generic` / `all` |
| `--out` | 当前目录 | 写到哪个项目根 |
| `--skill` | 本 Skill 根目录 | 入口里引用的绝对路径 |
| `--print` | 关 | 只打印，不落盘 |
| `--force` | 关 | 覆盖已存在的同名文件（默认跳过并提示） |

- 生成的是入口文件，不是副本；Skill 升级后不用重新生成。
- 不覆盖已有文件：内容相同报「已是最新」，不同则跳过并提示。
- 各家加载差异与不承诺的部分见 [`docs/agents.md`](agents.md)。
- 退出码：`0` 成功；`2` 未知 target 或 Skill 目录不存在。

### recheck-refs.mjs — 参考站批量复测

**用途**：参考库的数值是采样当天的，站点改版后会悄悄过期。一次量完 17 个单站参考，和基线对比，只报差异。

```bash
node scripts/recheck-refs.mjs                       # 全量，报告写 docs/reference-recheck.md
node scripts/recheck-refs.mjs --only awwwards,muzli # 只测指定站点
node scripts/recheck-refs.mjs --concurrency 3 --timeout 90
node scripts/recheck-refs.mjs --update-baseline     # 确认改版后重设基线
node scripts/recheck-refs.mjs --strict              # 有站点不可达时退出 1
```

| 参数 | 默认 | 说明 |
| --- | --- | --- |
| `--only` | 全部 | 逗号分隔的站点 key（见脚本内 `SITES`） |
| `--concurrency` | `4` | 并发探针数，1–6 |
| `--timeout` | `90` | 单站超时秒数，超时即 `failed` |
| `--update-baseline` | 关 | 用本次可达结果重写 `references/recheck-baseline.json` |
| `--strict` | 关 | 有失败站点时退出 1 |

- 逐站调用 `probe-ref.mjs`，解析其 JSON，抽 H1 / 正文 / 控件高 / 主字体 / 底色 / 卡片 / 懒加载图。
- 基线首次运行自动建立；**失败站点不写入基线**——被拦、超时、下线不能当成「没变化」。
- 报告只报差异，不改写单站结论；确认改版后再手工更新对应 `references/*-design.md`。
- 退出码：`0` 正常；`1` 加了 `--strict` 且有站点失败；`2` 参数错。

### fidelity.mjs — 像素级还原验收（设计稿 vs 实现）

「照着设计稿做完了没有」不该靠眼睛投票。把设计稿和真实渲染逐像素比一次，给出能贴进验收单的数字。

```bash
# 最常用：设计稿 vs 在线页面（自动截图，默认 desktop 1440×900、首屏）
node scripts/fidelity.mjs --design design/home.png --url http://127.0.0.1:5173/

# 移动端 + 深色 + 整页
node scripts/fidelity.mjs --design design/home@390.png --url http://127.0.0.1:5173/ --viewport mobile --theme dark --full

# 两张图直接比（不经浏览器）
node scripts/fidelity.mjs --design design/home.png --impl shots/home-desktop.png
```

| 指标 | 含义 | 什么时候算过 |
| --- | --- | --- |
| `平均差` | 每像素最大通道差的均值（0–255） | 参考量，不单独卡 |
| `超阈值像素` | 差异 > `--threshold`（默认 12%）的像素占比 | **还原类 ≤ 2%**（`--max-diff 0.02`）；微调类 ≤ 5% |
| `最差 N 个区域` | 按 `--grid`（默认 16×12）排序的差异区块，带设计稿坐标 | 前 5 块要逐条解释 |

产物落在 `.design/fidelity/`：`fidelity-diff.png`（设计稿压暗 + 超阈处标红）、`fidelity-side.png`（设计稿 / 实现 / 差异三联）、`fidelity-report.json`。
退出码 `0` 达标 / `1` 超阈值 / `2` 参数或文件错误。**两边截图方式必须一致**（都整页或都首屏），否则报告会提示缩放不一致——那是最常见的假阳性来源。
浏览器默认找本机 Edge，可用 `EDGE_PATH` 指定；`--theme` 靠 `addInitScript` 在页面脚本之前写 `localStorage['ui-theme']`，只改 `data-theme` 对已挂载组件无效。

### pixel_diff.py — 像素比对引擎（可单独用）

`fidelity.mjs` 底下那层，只依赖 Pillow + numpy。已经有两张图时可以直接调：

```bash
python scripts/pixel_diff.py --design design/home.png --impl shots/home-desktop.png --out .design/fidelity
python scripts/pixel_diff.py --design a.png --impl b.png --threshold 0.08 --grid 24x16 --json
```

| 参数 | 默认 | 说明 |
| --- | --- | --- |
| `--threshold` | `0.12` | 归一化的单像素容差（×255 后比较最大通道差） |
| `--grid` | `16x12` | 差异分区网格，`worst_cells` 按它排序 |
| `--scale` | `auto` | 尺寸不同时是否把实现图缩到设计稿尺寸；`none` 则直接比 |
| `--top` | `8` | 打印最差几块 |
| `--max-diff` | `0.02` | 判定阈值，超过即退出码 1 |

算法就三行：`delta = np.abs(a - b).max(axis=2)` → `over = delta > threshold*255` → 按网格聚合。产物与退出码和 `fidelity.mjs` 一致。
## 参数与退出码速查

| 脚本 | 必需 | 最常用的可选 | 退出码 1 的条件 |
| --- | --- | --- | --- |
| `screenshot.mjs` | `--url` 或 `--pages` | `--themes light,dark`、`--viewports`、`--storage-state`、`--out` | 有页面截图失败（记在 `manifest.failed`） |
| `audit.mjs` | `--url` 或 `--pages` | `--themes light,dark`、`--expect-text`、`--no-axe`、`--reduced-motion` | 有 error 级问题 |
| `flow.mjs` | `--flow` | `--base`、`--theme dark`、`--continue`、`--screenshot`、`--headed` | 有步骤失败（标了 `optional` 的不算） |
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
