## 脚本手册

### scaffold.mjs — 从 0 生成前端骨架

一次性产出设计令牌 + 组件样式 + 六类页面，拿到就能跑、能量、能改。**模式 B 的第一步**。

```bash
# 后台：令牌 + 组件 + 落地页/列表/表单/认证/状态页
node scripts/scaffold.mjs --persona rational --out src --pages landing,app,form,auth,states

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
| `--pages` | 逗号分隔：`landing,catalog,app,form,auth,states` | `landing,app` |
| `--stack` | `html` / `react` / `vue` / `all`：额外产出框架版（默认 `html`） | `html` |
| `--accent` | 覆盖品牌色相 0–360（不填用该人格默认） | 人格预设 |
| `--no-dark` | 不生成 `.dark` 令牌块（默认生成，主题开关不该是死按钮） | 开 |
| `--name` | 产品名 | `示例产品` |
| `--ref-url` | 先跑 `probe-ref.mjs` 量这个站，用实测值覆盖人格字段（品牌色相、底色、字阶、控件高、圆角、密度；逼近 80%，剩下改 `tokens.css`） | 关 |
| `--ref-json` | 直接用已有的 probe-ref JSON，不再跑一次探针 | 关 |
| `--verify` | 生成后自动起内置静态服务，逐页跑 `audit.mjs`（明暗双主题）+ `contrast_check.py`，报告写 `<out>/.verify/report.json`，失败退出码非 0（没装 playwright 时只跑对比度并说明） | 关 |
| `--export` | 逗号分隔：`tailwind,antd,element`——把同一份令牌额外导出成 `tokens.tailwind.js` / `tokens.antd.json` / `tokens.element.scss`，数值与 `tokens.css` 同源 | 关 |
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

五步，任何一步失败都以非 0 退出：

| 步骤 | 做什么 | 失败含义 |
| --- | --- | --- |
| 语法 | `node --check` 所有 `scripts/*.mjs`、`python -m py_compile` 所有 `scripts/*.py` | 改脚本时手滑了 |
| 生成 | 五套人格 × 六类页面（含 `--dark`）各生成一遍，检查 13 个产物文件齐 | `scaffold.mjs` 坏了 |
| 对比度 | 对每套生成物跑 `contrast_check.py`，有未达标即失败 | 令牌改暗了/改浅了 |
| 审计 | 内置静态服务 + `audit.mjs --themes light,dark`，30 组都要 `0 错误 / 0 警告` | 生成物出现了 a11y 回归 |
| 文档数字 | 见下 | 站点数 / 均值在文档里漂了 |

第五步「文档数字」以 `references/design-evidence.md` 的「采集成功 N 个站 / A 组 N」为准，扫五个文件
（`README.md`、`SKILL.md`、`references/design-evidence.md`、`references/craft-floor.md`、`references/visual-system.md`）
里的四种写法——`N 个真实站`、`N 个实测站点`、`N 站实测`、`A 组 N`——任何一处与样本头不一致即失败。

这一项是补出来的：这类数字在本项目已经漂过三次，且都漂在「换个说法就绕过检查」上——
`visual-system.md` 整个文件不在扫描范围；`craft-floor.md` 里那种「数字 + 站实测」的连写不匹配旧正则，躲过了两版检查。
**要么统一写法，要么改检查，别指望记得住。**

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
