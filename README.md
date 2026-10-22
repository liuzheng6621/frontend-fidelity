# frontend-fidelity · 脚本说明

一套「改前端界面」时的验收脚本：截图 → 审计 → 对比度 → 清理 → 质量门，
外加一个「量参考站真实样式」的采集器。脚本不依赖本 Skill 安装位置，
`node <path>/scripts/xxx.mjs` 直接跑，默认在**当前工作目录**（目标项目根）读写文件。

## 获取

本仓库就是 Skill 本体，`SKILL.md` 在根目录（给 agent 读的操作手册），本文件只讲脚本参数。
装进 DSH 技能目录：

```bash
git clone https://gitee.com/liu-everything_impossble/skill-frontend-fidelity.git ~/.dsh/skills/frontend-fidelity
```

不想用 git 就下载 zip 解压到同名目录。脚本不依赖 Skill 安装位置，`node <path>/scripts/xxx.mjs` 可单独跑。

## 安装

```bash
# JS 脚本（screenshot / audit / auth / probe-ref 需要；hygiene / run_checks 零依赖）
npm i -D playwright
npx playwright install chromium

# Python 脚本
pip install pillow numpy          # numpy 可选，只影响大图裁切速度
```

axe-core 已内置在 `scripts/vendor/axe.min.js`（4.14.0，MPL-2.0），
WCAG 自动检测**不需要额外安装**，可离线运行。

`scripts/lib/common.mjs` 是共享工具（视口预设、参数解析、CLS 观察器、自动滚动、深浅色强制）。
脚本会先找本 Skill 目录下的 `node_modules`，找不到再找当前目录，所以在**目标项目里**跑最稳。

## screenshot.mjs — 多视口 / 多主题全页截图

```bash
node scripts/screenshot.mjs --url http://localhost:5173/ --out .design/before
node scripts/screenshot.mjs --url http://localhost:5173/admin --out .design/after \
  --storage-state auth.json --themes light,dark --viewports desktop,mobile
# 同一站点多页：--base 一次，其余写相对路径
node scripts/screenshot.mjs --base http://localhost:5173 --pages /,/orders,/settings --out .design/before
```

| 参数 | 默认 | 说明 |
| --- | --- | --- |
| `--url` | 必填（或 `--pages`） | 页面地址（完整 URL） |
| `--base` | – | 站点根地址；`--pages` 里的 `/orders` 会拼到它后面 |
| `--pages` | – | 逗号分隔的路径/URL（`/orders,/settings`），或一个 `.txt` 清单文件（每行一条，`#` 注释） |
| `--out` | `shots` | 输出目录（同时写入 `manifest.json`） |
| `--viewports` | `desktop,tablet,mobile` | 内置：`desktop` 1440×900、`tablet` 768×1024、`mobile` 390×844；也可写 `1440x900` 自定义 |
| `--themes` | `light` | `light` / `dark`，可组合；只传一个时不加后缀，传两个时文件名带 `-light` / `-dark` |
| `--storage-state` | – | `auth.mjs` 产出的登录态 JSON |
| `--reduced-motion` | 关 | 模拟系统「减少动效」偏好 |
| `--full-page` | 开 | 传 `--no-full-page` 或 `--full-page false` 只截首屏 |
| `--wait` | `1200` | 导航后额外等待 ms（等字体、动画、接口） |
| `--name` | 自动 | 输出文件名前缀（默认由 URL 生成）；配 `--pages` 多页时会自动加页面名后缀，防止互相覆盖 |

深色模式不是只切 `prefers-color-scheme`：`--themes dark` 会同时给 `<html>` 打上 `.dark` 类、
`data-theme="dark"`、`data-color-mode="dark"`，所以三种常见切主题写法（CSS 类 / data 属性 / 媒体查询）都能出图。

全页截图依赖**自动滚动**触发懒加载图片；不看图无法判断加载是否完整时，
先单独打开那张截图放大看，不要凭尺寸猜。

## audit.mjs — 结构 + WCAG + CLS 审计

```bash
node scripts/audit.mjs --url http://localhost:5173/ --themes light,dark
node scripts/audit.mjs --pages pages.txt --expect-text "订单列表" --reduced-motion
```

| 参数 | 默认 | 说明 |
| --- | --- | --- |
| `--url` / `--pages` / `--base` | 必填 | 同上；`--base` + `--pages /a,/b` 最省事 |
| `--viewports` | `desktop,tablet,mobile` | 移动端才做点击区检查 |
| `--themes` | `light` | 建议 `light,dark` |
| `--expect-text` | – | 页面必须包含的文案；用于抓「被重定向回登录页」 |
| `--storage-state` | – | 登录态 |
| `--reduced-motion` | 关 | 开启后额外检查仍在无限循环的动画 |
| `--axe` | 开 | `--no-axe` 关闭 WCAG 检测（只跑结构检查） |
| `--wait` | `800` | 导航后等待 ms |
| `--out` | `audit-report.json` | 报告路径 |

退出码：**有 error 时为 1**，可直接当 CI 门禁。

检查项：

| 级别 | check | 含义 |
| --- | --- | --- |
| error | `empty-page` | 白屏/内容为空（路由、权限、接口失败） |
| error | `expect-text` | 期望文案不存在（多为被重定向） |
| error | `h-overflow` | 页面横向溢出 |
| error | `broken-image` | 图片 404 或解码失败 |
| error | `logo-distorted` | Logo 显示比例与原始比例差 >5% |
| error | `element-overlap` | 可交互元素互相压住 |
| error | `navigation` | 打不开页面 |
| error | `axe:<rule>` | axe serious/critical 违规（缺 label、对比度不足、ARIA 误用等） |
| warn | `text-clipped` | 文本被裁切且没有省略号 |
| warn | `font-too-small` | 正文 <12px |
| warn | `small-tap-target` | 移动端点击区 <32px |
| warn | `icon-button-no-label` | 图标按钮无 `aria-label`/`title` |
| warn | `motion-not-reduced` | 减少动效下仍无限循环 |
| warn | `axe:<rule>` | axe moderate/minor 违规 |
| 报告 | `layout-shift` | CLS >0.1 时提示（阈值：0.1） |

axe 只跑 WCAG 2.1 A/AA 规则集，跳过 best-practice，避免刷屏。
`audit-report.json` 里每条违规都带 `helpUrl` 和命中节点的 HTML 片段。

## auth.mjs — 导出登录态

```bash
node scripts/auth.mjs --url http://localhost:5173/login --out auth.json
```

打开有头浏览器，**你手动登录**，回到终端按 Enter，cookie + localStorage 写入 `auth.json`。
之后所有脚本加 `--storage-state auth.json`。

`auth.json` 已存在时不会覆盖，确认要覆盖加 `--force`。

`auth.json` 是明文凭据：用完删除，不要提交（`hygiene.mjs` 不会扫它，`.gitignore` 要加）。

## contrast_check.py — 对比度审计

```bash
python scripts/contrast_check.py                       # 自动找 cwd 下的 CSS
python scripts/contrast_check.py src/styles/theme.css --json contrast.json
python scripts/contrast_check.py --dir src             # 指定自动查找的根目录
python scripts/contrast_check.py --fg "#6b7280" --bg "#ffffff"   # 单点检查
python scripts/contrast_check.py --tokens-only         # 只做令牌配对，跳过选择器解析
python scripts/contrast_check.py --strict              # 所有配对一律按正文 4.5 要求
python scripts/contrast_check.py --self-test           # 验证颜色解析
```

- 支持 `#hex`、`rgb()/rgba()`、`hsl()/hsla()`、`hwb()`、**`oklch()`、`oklab()`、`lab()`**、
  `color(srgb …)`、`color-mix(in oklab|srgb, A p%, B)`、`var()` 链（含 fallback，最多 8 层）。
- 自动识别深色块：`.dark`、`[data-theme="dark"]`、`.theme-dark`、`@media (prefers-color-scheme: dark)`。
- 两种配对：同元素 `color` + `background`（背景不透明时才算），以及按变量名角色配对。
- 阈值：正文 4.5:1，UI 边界/图标 3:1。透明背景的配对跳过（无法判定，需要人工）。
- 退出码：有未达标项为 1。

Tailwind v4 默认把颜色输出成 `oklch()`，旧版工具在解析阶段就会全军覆没——这是本脚本支持它的原因。

## crop_logo.py — 品牌图裁边与导出

```bash
python scripts/crop_logo.py raw.png --check                       # 只报告，不写文件
python scripts/crop_logo.py raw.png --trim --pad 24 -o logo.png
python scripts/crop_logo.py logo.png --trim --format square --side 512 -o seal.png
```

| 参数 | 说明 |
| --- | --- |
| `--trim` | 裁掉背景边：有 alpha 按 alpha，不透明图按四角背景色 |
| `--tolerance` | 纯色背景容差百分比（默认 6），白底扫描图可调到 8–12 |
| `--pad` | 四周留白 px |
| `--height` / `--width` | 等比缩放到指定尺寸 |
| `--format square` + `--side` | 正方形透明画布（favicon / 头像） |
| `--check` | 只打印包围盒与长宽比 |

输出总是 PNG（透明）。要给 CSS 用，记住输出的 `aspect-ratio`，别在样式里硬拉。

## hygiene.mjs — 清理残留

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
| `--out-txt` | `hygiene-summary.txt` | 人读版清单，可给目录或具体 `.txt`/`.md` 路径 |

查五类：无引用组件（排除组件自己引用自己）、无引用静态资源、无引用样式文件、
重复路由（`path` 与 `name` 都查）、>300KB 的资源。

**全部结果是「待确认」，不是删除建议。** 组件可能被全局注册、动态 `import()`、
路由懒加载或字符串拼接引用，正则看不见。删之前：搜索整个仓库确认 → 跑构建 → 跑冒烟。
退出码仅在发现重复路由（error 级）时为 1。

## run_checks.mjs — 项目自带质量门

```bash
node scripts/run_checks.mjs
node scripts/run_checks.mjs --cwd ../my-app        # 不必 cd
node scripts/run_checks.mjs --only lint,build
node scripts/run_checks.mjs --continue             # 全跑完再汇总，不中断
```

按 `package.json` 里真实存在的脚本依次跑 lint → typecheck → test → build，
自动识别 pnpm/yarn/bun/npm，单步超时 10 分钟。默认第一个失败即停。
退出码 = 第一个失败步骤的退出码。

## probe-ref.mjs — 量参考站的真实样式

想「做得像这个站」却说不清具体数值时，别凭印象，把它量下来：

```bash
node scripts/probe-ref.mjs --url https://linear.app --out .design/ref --name linear
node scripts/probe-ref.mjs --url http://localhost:5173/orders --theme dark
node scripts/probe-ref.mjs --url https://example.com --brief   # 只打关键行
```

| 参数 | 默认 | 说明 |
| --- | --- | --- |
| `--url` | 必填 | 要量的页面 |
| `--out` | `.tmp/ref` | 输出目录（每站一个 `.json` + 一张 `.jpg`） |
| `--name` | 由 URL 生成 | 文件名前缀 |
| `--viewport` | `desktop` | `desktop` / `tablet` / `mobile` |
| `--theme` | `light` | `dark` 同样会强制三种主题约定 |
| `--wait` | `3000` | 额外等待 ms（等 web font 与入场动画） |
| `--brief` | 关 | 只打印关键数值，不列 CSS 变量 |
| `--no-shot` | – | 不存截图 |

输出：字体栈与出现次数、字号分布、h1/h2/h3/p/a/th/td/label/button/input 的
字号-行高比-字重-字距-大小写、底色与文字色（`oklch()` 也会被正确解析成 sRGB 十六进制）、
圆角档位、间距频次、表格行高、控件高度、侧栏/顶栏尺寸、卡片靠阴影还是靠边框、
图片 lazy 比例、动画数、CSS 变量名。

**只抄比例和关系，不抄像素。** 落地数值对照 `references/design-evidence.md` 的跨站统计：
营销站的 96–140px 大标题搬到管理端就是错的，后台正文 13–14px、控件 32px、表格行高 53px 才是同行区间。

## 常见问题

**截图里图片是空白** —— 懒加载没触发。`screenshot.mjs` 会先滚动到底再截；
如果还是空白，说明图片由脚本异步渲染，加大 `--wait`。

**审计全绿但页面明显不对** —— 脚本只查机器可判定的东西。视觉问题（层级乱、配色脏、
字重跳、留白不平衡）必须自己对图看。审计是下限，不是质量本身。

**axe 报了几十条对比度** —— 先跑 `contrast_check.py` 定位设计令牌，
通常改 2–3 个变量就能消掉大半；再处理组件里写死的颜色。

**深色主题截图是全白的** —— 站点没有实现深色。`--themes dark` 会同时打 `.dark` /
`data-theme="dark"` / `prefers-color-scheme` 三种约定，三种都没有就是真的没做；
先确认站点有主题切换，否则不要假装支持深色。

**审计报 `h-overflow` 但截图看不出** —— 溢出元素可能在视口下方或由 `position: fixed` 造成。
报告里有溢出像素数，配合 `--viewports mobile` 一起看，窄屏最容易暴露。

**Playwright 提示缺浏览器** —— `npx playwright install chromium`（只装 chromium 就够）。

**端口/HTTPS 自己签的证书** —— `screenshot.mjs` 与 `audit.mjs` 用 `ignoreHTTPSErrors: true`，
本地自签证书可以直接跑。

## 许可

MIT，见 `LICENSE`。唯一例外：`scripts/vendor/axe.min.js` 是
[axe-core](https://github.com/dequelabs/axe-core) 4.14.0，按 **MPL-2.0** 分发，
文件头的许可声明不要删。
