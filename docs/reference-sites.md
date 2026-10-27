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
## 参考站蒸馏：少数派 sspai.com

2026-10-27 采集首页（1440 / 390 双视口，`getComputedStyle` + 元素矩形 + 双视口审计），完整实测在
[`references/sspai-design.md`](references/sspai-design.md)。它是语料里第一个**中文科技媒体编辑型首页**：
左中右三栏不是等宽卡片网格，而是「小侧栏 + 大编辑板 + 小侧栏」的报纸式版面。

| 产出 | 内容 |
| --- | --- |
| 版心 | 顶栏内宽 1232（56 高）；主 section 最大 1024 + padding 32 → **有效内容宽 960** |
| 编辑板 | 960×480 = `224 + 16 + 480 + 16 + 224`；主 banner 480×480 r24（移动 358×358 r20） |
| feed | `164 + 56 + 520 + 56 + 164`；文章卡 520×189、**无背景无边框**、上下各 32 |
| 字阶 | banner 24/500；文章标题 20/34/500（移动 17）；元信息 13 `#6f7174`；社区正文 15/22.5/400 |
| 色板 | `#fff` / `#f7f7f9` / `#f0f0f3`；次文 `#6f7174`、弱文 `#acaeb3`；品牌红 `#da282a`；Prime 蓝 `#0355e3` |
| 圆角 | 24 / 12 / 8 / 6 各归各部件（banner、卡片、按钮、标签），**没有单一主档** |
| 断点 | 767 已切移动、768 仍桌面；390 内容宽 358；1000 隐藏右栏、1024 仍显示 |

**三招值得直接搬**：

1. **编辑板按"栏"排版，不按"卡"排版**：`224 / 480 / 224` 的中间大图配两侧窄列，读起来像版面而不是仪表盘；间距 16 是固定的栏沟。
2. **文章卡不画壳**：无背景、无边框、无圆角，靠 32 的纵向间距和标题字号分层——列表页最容易被"卡片化"毁掉，这个反例值得记。
3. **圆角按部件分配**：banner 24、卡片 12、按钮 8、标签 6，每个数字都有归属；比全站一刀切 8px 更有层级感。

**也别学它三处**：84 张图 0 原生 `loading="lazy"`（另有 13 处自定义 lazy 标记）；image-alt 19 / button-name 6 / link-name 7 的可访问名缺失；
8/9/11px 小字与 16×16 触控区。中间视口 760 附近首屏编辑区过高、feed 要到 y≈1182 才开始，是断点切换前的一段塌陷。

**重采**：`node scripts/probe-ref.mjs --url https://sspai.com/ --out .probe --name sspai --wait 5000`（要连移动端就再加 `--viewport mobile`）。

## 参考站蒸馏：语雀 yuque.com

2026-10-27 采集首页，完整实测在 [`references/yuque-design.md`](references/yuque-design.md)。它的价值有两层：
**SaaS 首页的模块节奏**，以及一个**必须提前识别的工程陷阱**——首页是内部滚动容器，不是文档滚动。

| 产出 | 内容 |
| --- | --- |
| 滚动结构 | `#main-right-content` 内部滚动：document 只有 900 高，容器 `820 / 10171`；截图、审计、探针都必须按容器分段 |
| 版心 | 桌面 1140（1440 下左右 150）；移动页边距 22–24 |
| 模块节奏 | 页头 80 → Hero 538 → 双场景 741 → 编辑器/知识库 1704 → 下载黑段 693 → 作品 3151.97 → 安全 775 → 组织 861 → 公益 504.81 → 收束 37 → 页脚 351 |
| 字阶 | Hero 100/125/600；h2 60/105/700；h3 28/32/700；功能 h4 30/52.5/600 |
| 色板 | 黑字 `#000`/`#262626`；白 / `#fafafa`；冷浅底 `#f8f9fa`；品牌绿 `#00b96b`；团队蓝 `#166eff`；黑段 `#000` |
| 圆角 | r6 小按钮 / r11 Hero CTA / r14 工作台图 / r38 双场景大卡 |
| 动效 | `fadeInUp` 1000ms linear（团队卡 +200ms、下载列表 +500ms）；组织 logo 带 50s linear 无限 |

**三招值得直接搬**：

1. **产品截图当主视觉，外围只做"框"**：Hero 538 里放大工作台图（r14），文案只占上方两行；比抽象插画更容易让人相信产品存在。
2. **同构双场景**：个人绿 / 团队蓝两张 r38 大卡，同样的标题-描述-CTA-截图结构，只换色相和内容——一套模板讲两个人群。
3. **黑段做节奏断点**：下载区整段 `#000`，前后都是浅底；长首页每 3–4 段必须换一次背景明度，否则滚动没有记忆点。

**也别学它三处**：首页无 h1；绿底白字对比度 2.58:1；移动导航 9 个链接全删、下载按钮只有 105×24 触控；
`overflow-x: hidden` 掩盖内层越界。另外它的内部滚动容器会让「全页截图」看起来只有一屏——这是测量方法问题，不要误判成页面很短。

**重采**（必须按内部容器分段，`screenshot.mjs` 的全页模式拿不到全貌）：

```bash
node scripts/probe-ref.mjs --url https://www.yuque.com/ --out .probe --name yuque --wait 5000
```

## 参考站蒸馏：掘金 juejin.cn

2026-10-27 采集首页（三栏 feed，桌面 / 移动双视口），完整实测在 [`references/juejin-design.md`](references/juejin-design.md)。
它和 UI 世界、站酷同属"内容站"，但**不是图墙，而是高密度文字 feed**——语料里第一个真正意义上的社区信息流样本。

| 产出 | 内容 |
| --- | --- |
| 版心 | 1200 = `180 + 20 + 720 + 20 + 260`；390 只留单栏 feed |
| 顶栏 | 60 sticky（移动 51.98）；搜索外框 346×34（移动 140×32） |
| 条目 | 720×99；左右 20、上 12 / 下 13；缩略图 110×74 r4 `cover`、左距 24；有图文字宽 216、无图 350 |
| 字阶 | 标题 16/600；排序 13；摘要 13；标签高 18——**三档小字撑密度** |
| 色板 | 页底 `#f2f3f5`；卡白；次文 `#515767`；弱文 `#8a919f`（3.17:1）、`#909090`（3.19:1）；品牌蓝 `#1e80ff` |
| 圆角 | 外壳 4 / 标签 2 / 缩略图 4 / 弹层 8 |
| 动效 | 按钮 hover 100ms linear；本次首页 `getAnimations()` 为 0 |

**三招值得直接搬**：

1. **99px 条目是"列表密度"的实测答案**：一条标题 + 一行元信息 + 110×74 缩略图，正好一屏 7 条；比卡片式列表（160–200 高）多一倍信息量。
2. **缩略图只在有图时出现，文字宽度自适应**：有图文字宽 216、无图 350——不为了对齐留白，允许两种条目并存。
3. **外壳 4 / 标签 2 / 弹层 8 的三档圆角**：内容密度高的界面里，圆角越小越不显"泡沫感"。

**也别学它三处**：摘要灰 `#8a919f` 对白底只有 3.17:1，未达 AA 正文标准（`#909090` 3.19:1 同样）；
`list/listitem` 结构违规；移动端顶栏容器右缘 394.28，造成 4px 横向溢出（已定位，不是 feed 导致）。
审计里的 `logo-distorted` 命中全部是 `img.lazy.thumb` 内容缩略图，是规则误报，别当缺陷记。

**重采**：`node scripts/probe-ref.mjs --url https://juejin.cn/ --out .probe --name juejin --wait 5000`。

## 参考站蒸馏：苹果中国 apple.com.cn

2026-10-27 采集首页，完整实测在 [`references/apple-design.md`](references/apple-design.md)。它不是 SaaS，也不是内容站，
而是**全幅产品舞台 + 极薄界面层**：界面上几乎没有"容器"和"卡片"，所有结构都由图片舞台和 12px 白沟承担。

| 产出 | 内容 |
| --- | --- |
| 舞台 | 主舞台 692、小舞台 580（移动均 500）；页沟 **12 白**；主舞台 padding 56 0 63 |
| 容器 | 导航 / 页脚 1024（pad 22，净 980）——**与舞台宽度分离**，不是同一个容器 |
| 排版 | 首个 h1 是 1×1 `visuallyhidden`；可见产品名 h2 56/60/600（移动 32/36/600）；副题 21 |
| 色板 | 页白 / 页沟白；浅舞台 `#f5f5f7`；黑舞台 `#000`；链接 `#0066cc` / 黑底 `#2997ff`；CTA `#0071e3` |
| CTA | 主舞台 119.41×44（17/20）；小舞台 94.09×36（14/18）；`radius: 980px` pill；次 CTA 透明底 + 1px 链接蓝 |
| 导航 | 44 fixed（移动 48）；`rgba(255,255,255,.8)` + `saturate(1.8) blur(20)` |
| 素材 | 16 `img` / 15 `picture` / 53 `source`，lazy 0；桌面与移动用**独立构图**，不是 `cover` 复用 |

**三招值得直接搬**：

1. **12px 白沟切舞台**：整页没有一个"卡片组件"，靠 12px 白色间隙把黑/浅舞台分开——比加圆角+阴影更安静。
2. **两种舞台两种文字色**：黑舞台用 `#f5f5f7` 文字 + `#2997ff` 链接，浅舞台用 `#1d1d1f` + `#0066cc`；同一组件按舞台换令牌，不是全站一个色。
3. **桌面与移动分开构图**：`<picture>` 的 53 个 `source` 说明每个舞台都给了移动专用裁切，而不是把桌面大图 `cover` 一下。

**也别学它四处**：移动端 CTA 高 36（低于 44 触控标准）；购物袋可见文本与可访问名不一致（axe `label-content-name-mismatch`）；
自动审计的 overlap 命中了导航双控件与整卡链接，需键盘/读屏复核，不能直接当视觉 bug；深色是**逐舞台明暗编排**，不要误读成全站 dark mode。

**重采**：`node scripts/probe-ref.mjs --url https://apple.com.cn/ --out .probe --name apple --wait 5000`。

## 参考站蒸馏：Vercel 注册页（认证与多步表单）

2026-10-27 采集 `vercel.com/login` 与 `/signup`，完整实测在 [`references/vercel-auth.md`](references/vercel-auth.md)。
补的是 `scaffold` 里 `auth.html` 一直没有数值依据这件事。它的特点是**一屏装完的窄列 + 一列同规格按钮**，
没有卡片、没有分割线、没有第二套色。

| 产出 | 内容 |
| --- | --- |
| 表单列 | 桌面固定 **390**；390 视口下 **326**（左右各 16）——两段式，不是 clamp |
| 按钮 | **40 高**、`padding 0 14`、r8、16/24/500；社交登录 5 个完全同规格 |
| 标题 | 32/40/600 → 移动 24/32/600，只降一档，`letter-spacing -0.02em` |
| 字阶 | 12 / 13 / 14 / 16 / 32（6 档）；字重只用 400/500/600 |
| 圆角 | 8 / 6 / 4 / 2 / 12，主按钮只用 8 |
| 间距 | 8 / 16 / 24 / 32（8 的倍数体系，无 12、无 20） |
| 色板 | 底 `#fafafa`、按钮 `#fff`、文字 `#171717`/`#4d4d4d`/`#a8a8a8`、蓝 `#0072f5` |
| 对照 | Linear 登录页：19 元素、字阶只有 13/18、控件 44、圆角 9999，两端数值完全一致 |

**三招值得直接搬**：

1. **390 窄列 + 移动撑满减 32**：桌面是一根居中的 390 列，移动端变成 `视口 − 32`；比 `clamp()` 好预测，也比「居中卡片」少一层壳。
2. **一列同规格按钮**：5 个社交登录全是 40 高 / r8 / 16px/500，只换图标与文案；高度在两端都不变，只改宽度。
3. **标题只降一档**：32 → 24，不写流体字号；登录页不需要「大字有气势」，需要一屏装下。

**也别学它四处**：先社交后邮箱的顺序只在开发者产品成立（企业后台要把账号密码放前面）；`GeistSans` 单栈没有中文回退；
12px `#a8a8a8` 条款字对白底约 2.4:1，严格审计会报；输入框在第一步根本不渲染，自动化要多一次点击才能看到表单。

**重采**：`node scripts/probe-ref.mjs --url https://vercel.com/signup --out .probe --name vercel --wait 3000`，另加 `--viewport mobile` 采 390。

## 参考站蒸馏：Apple Store 商品配置页（电商）

2026-10-27 采集 `apple.com.cn/shop/buy-iphone` 与 `/buy-iphone/iphone-17`，完整实测在
[`references/applestore-commerce.md`](references/applestore-commerce.md)。补的是商品详情/配置页这一形态的空缺：
价格分层、SKU 选择、加购按钮。

| 产出 | 内容 |
| --- | --- |
| 价格三层 | 主价 **17/25/600**（与正文同字号，只加字重）+ 分期 **14/21/400** + 小字价 **12/16/400** |
| SKU | 颜色是 **36×36 圆点**（r50%，2px 透明描边占位，选中上实色）；容量是文字按钮，**两组用形状区分** |
| 主 CTA | **328×44**、r8、`#0071e3`；44 是它的触控下限 |
| 控件高 | **35 / 36 / 40 / 44 / 54**（移动 35/38/40/43/48），按部位分配，不按断点降 |
| 圆角 | 18（卡片）/ 980（药丸）/ 56（大面）/ 6（小件），四档各司其职 |
| 字阶 | 12 / 13 / 14 / 17 / 21 / 24 / 28 / 48 / 80 |
| 色板 | `#1d1d1f` 主文字 / `#6e6e73` 次级 / `#0071e3` 唯一强调 / `#f5f5f7` 交替底 |
| 对照 | 小米商城：控件 50、圆角只有 2/50%、价格红 `#c20000`、品牌橙 `#ff6700`；**390 下 viewport 锁 1228，不响应式** |

**三招值得直接搬**：

1. **价格写成三层 DOM**：主价 / 分期 / 小字价各自独立，主价不放大只加字重——国内电商可以直接换成「红字大字 + 分期灰字」而保留结构。
2. **SKU 用形状分组**：颜色=圆点、容量=文字按钮，两组一眼分得开；圆点用 `border: 2px solid transparent` 占位，选中才上色，避免布局跳动。
3. **控件高按部位分配**：35/36/40/44/54 五档并存，不是「全站统一 40」也不是「等比缩放」；主 CTA 移动端只从 54 降到 48。

**也别学它四处**：主价 17px 与正文同大小，小屏上不够醒目；颜色圆点不显示名字，明眼用户也不知道选了哪个色；
容量档位没有「+800」这类增量提示；页面 5211 高，参数表和推荐位全塞一页。

**重采**：`node scripts/probe-ref.mjs --url https://www.apple.com.cn/shop/buy-iphone/iphone-17 --out .probe --name applestore`；
对照站 `https://www.mi.com/shop/buy?product_id=10050236`——采完务必看返回的 `viewport.w`，它会是 1228 而不是 390。

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
