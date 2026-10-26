# 参考站蒸馏：猫叫兽 UI 风格库（luckymaomi /ui/）

> 采集日期 2026-11-05，1440×900 视口，Edge 131 headless，逐元素读计算值。
> 站点 `https://luckymaomi.github.io/ui/`（`<title>UI</title>`），143 个风格样本、57 条动效、2895 个元素、文档高 21,593。
> **前提**：根域名 `https://luckymaomi.github.io/` 返回 GitHub Pages 的 `Site not found`（12 个元素、零内容）；用户给的链接指向 `ui` 这个仓库站点，本文所有数据来自 `/ui/`，不是根域。
> 授权：仓库公开、无 LICENSE 声明。本文只蒸馏**量出来的数值与做法**，不复制其文案与代码片段。

## 一、这是什么货色

一句话：**一本印刷出来的规格书**——方格纸当桌面，墨黑当边框，元数据做成黑条贴上去，动效只有 0.1 秒线性位移。

四条可辨识特征：

| 特征 | 具体做法 | 为什么成立 |
|---|---|---|
| 方格纸底板 | `body` 铺两条 1px 渐变网格（`--grid-line: #090a0d13`），底色 `#f3f4f6` | 卡片是白纸、页面是制图桌；不需要任何阴影就把「卡片浮着」讲清楚了 |
| 边框即墨 | `--line: #090a0d`（纯黑 1px），`--line-soft: #bdc3cf` 管弱分隔 | 边框不是装饰，是「印刷描边」；黑白印刷品里没有灰色描边这回事 |
| 硬阴影、零缓动 | `--hard-shadow: 4px 4px 0 #090a0d`；全站 transition 只有 3 条、全部 **100ms linear** | 位移和阴影都是「瞬间发生」，像盖章；用 spring 就变软，和印刷气质打架 |
| 元数据黑条 | 卡片里「加载时 · 600ms」这类元信息，做成黑底白字的整条 bar | 规格书里参数就是这样印的：反白条比第二行灰字显眼得多，且让 143 张卡有一致的「参数位」 |

它和同赛道的 StyleKit（见 `stylekit-design.md`）是同一门生意的两种做法：
StyleKit 是**活预览 + 发丝线 + 通体直角**（把卡片做成展厅射灯下的样品），这站是**静态 SVG 预览 + 墨黑框 + 硬阴影**（把卡片做成贴在图板上的一页图纸）。
两者都成立，**混着用必然廉价**——射灯和印刷描边是两套打光。

## 二、令牌（26 个 `:root` 变量，全表）

```
--bg:            #f3f4f6    /* 冷灰纸面 */
--surface:       #fff       /* 卡纸 */
--surface-muted: #e4e7ed    /* 预览图占位底、弱填充 */
--ink:           #090a0d    /* 近黑（不是纯黑 #000） */
--muted:         #454b57    /* 次级文字 */
--line:          #090a0d    /* 结构边框＝墨 */
--line-soft:     #bdc3cf    /* 弱分隔、卡片静止边框 */
--header-bg:     #fffffffa  /* 顶栏 98% 白 */
--accent:        #090a0d    /* 选中/按下＝黑 */
--accent-ink:    #fff
--signal:        #ff4538    /* 唯一强调色（红橙），用在计数与警示 */
--signal-ink:    #090a0d
--highlight:     #ffe100    /* 荧光笔黄，作底不作字 */
--highlight-ink: #090a0d
--hard-shadow:   4px 4px 0 #090a0d
--focus:         #090a0d
--radius-control: 2px
--radius-panel:   2px
--grid-line:     #090a0d13
--code-bg:       #fff
--code-ink:      #090a0d
--font-body-active:    Inter, "Noto Sans SC", "Microsoft YaHei", system-ui, sans-serif
--font-display-active: Inter, "Noto Sans SC", "Microsoft YaHei", system-ui, sans-serif
--font-mono-active:    "JetBrains Mono", "Cascadia Code", monospace
--default-font-family: var(--font-body-active)
--default-mono-font-family: var(--font-mono-active)
```

两条结论值得单独记：

1. **三个字体角色都指向同一个栈**。实测全站生效字体只有 `Inter`（891 处），等宽变量声明了但页面上没有生效文本。也就是说「角色变量」在这里是**给主题切换留的插槽**，不是当下事实——抄的时候要分清「预留结构」和「正在用的值」。
2. **圆角只有 2px 一档**（`--radius-control` 与 `--radius-panel` 同值）。不是「每档圆角有归属」，而是「一档到底」——印刷品的直角不需要层次。
   与其把 6 档圆角凑齐，不如说清「我只有一档，且所有控件都用它」。本站连色板小方块（25×14）都是 `radius: 0`。

网格贴图的具体写法（`body` 背景，两条渐变叠成方格）：

```css
body {
  background-color: var(--bg);
  background-image:
    linear-gradient(var(--grid-line) 1px, transparent 1px),
    linear-gradient(90deg, var(--grid-line) 1px, transparent 1px);
  background-size: 32px 32px;   /* 实测步长由视口宽与 offsetWidth 反推，取 32 一档 */
}
```

## 三、字阶

| 用途 | 字号 / 字重 / 行高 | 备注 |
|---|---|---|
| 页面大标题（动效页、风格详情页） | **76 / 950** | 超重字重是这站最狠的一招，正文只有 13，反差 5.8 倍 |
| 区块标题（域、章节） | **40 / 950** | 与 76 同字重，只差字号 |
| 卡片标题（h2，143 个全同规格） | **18 / 400 / 22.5** | **不加重**，靠字号和四周留白；这是「规格书」而非「营销页」的关键 |
| 动效详情里的语义小标题 | 18 / 600 | 只在这里用到 600 |
| 正文、控件、说明 | **13 / 400** | 438 处，全站主力 |
| 卡片描述 | 12 | 与 13 只差 1px，属于同一层 |
| 徽标、元数据、等宽标签 | **11 / 750** | 黑底白字或反白条 |
| 导航 | 16 | 18 处 |

- 页面**没有 `h1`**（`/ui/` 目录页与动效页的标题都是 `h2` 起）——这是它的一处硬伤，别抄（见第七节）。
- 字号只有 6 档（11/12/13/16/18/76），加上 showcase 页的 96/900 与 60/900 共 8 档；**没有 14px**。中文正文压在 13px 上，与跨站均值 14.8 相比偏小，靠加大行距与留白补。
## 四、版式节奏

| 区块 | 高度 | 关键值 |
|---|---|---|
| 顶栏 `header.site-header` | **65** | 白 98% 不透明、无阴影、导航 6 项 + 主题切换 |
| 主容器 `main.page-shell.page-shell-wide` | 宽 **1408** | 1440 视口左右各 16，比常见 1200 容器宽一档（要塞 3 列 457 的卡） |
| 页头区 `.page-intro` | **230** | H1 + 两个下划线入口（「动效词汇」「鼠标交互实验室」） |
| 域块头 `.section-heading` | 1220×108 | 白卡带 1px 墨框：`h2 40/950` + `p 13 muted`（「9 个动效」） |
| 卡片网格 | 3 列 × 457，卡高 477 | 列距 34（457×3 + 34×2 = 1439 ≈ 容器 1408，实测右侧留白略紧） |
| 风格详情页 `.detail-section` | 每段 **820** | 5 个组件预览区（按钮/卡片/输入框/导航栏/Hero）等高等距 |
| showcase 页 | 各段 828–1289，通高 8,966 | 每段 `border-4 border-black`，段间负边距拼成连续画框 |

三条可以搬的：

1. **宽容器 + 三列大卡**。143 个样本要在一屏看到 6 个，就不能用 1200 容器配 4 列小卡；它是 1408 + 3 列，单卡 457 宽足够放预览、标题、描述、色板、两个按钮。
2. **域块头做成一张卡**（白底、墨框、左侧大标题、下方计数）。列表页里「分组标题」常常只是一行加粗字；包成卡片后，滚动时每一组的边界不用线也看得见。
3. **详情页等高等距的组件栏**。每个组件预览固定 820 高，横向对比时眼睛不需要重新找基准线。

## 五、卡片配方（六段结构，逐段有数）

```
article.style-card                     457×477  border 1px #bdc3cf  radius 2  bg #fff  静止无阴影
├─ a.style-cover                       455×256  bg #e4e7ed（占位底，图未到时也是干净的灰块）
│  └─ img src="/ui/styles/<slug>.svg"   640×360 的 SVG，显示 16:9
├─ div.style-card-body                 padding 16~18
│  ├─ div.style-heading
│  │   ├─ h2 > a                       18/400/22.5  中文名
│  │   └─ p                            12/muted     英文名
│  ├─ span（类型徽标）                 36×25  11/750  bg #090a0d  color #f3f4f6  radius 2
│  ├─ p（描述）                        12/1.6  muted
│  ├─ div（色板行）                    每格 25×14  radius 0  border 1px #111  4~7 格
│  └─ div（按钮对）                    规则详情 / 真实展示   38 高 13/700 radius 2
└─ :hover                              border-color → #090a0d   box-shadow → 4px 4px 0 #090a0d   transform 不变
```

**预览用的是每风格一张静态 SVG**（`/ui/styles/<slug>.svg`，1,200×630 画布、纯矢量、零动画标签），不是活 DOM。
这个取舍要看清：

- 好处：143 张预览的总字节数极小、首屏快、永远两边像素一致、不担心样式污染。
- 代价：**预览只能「像」，不能「是」**——它无法证明这套风格真能做出可用界面。所以每张卡都配了「真实展示」按钮，把人送到 showcase 页（真正能跑的那种）。两者配套，静态预览才不是空头支票。

**hover 只做三件事，且都不位移**：

| 属性 | 静止 | hover |
|---|---|---|
| `border-color` | `#bdc3cf` | `#090a0d` |
| `box-shadow` | `none` | `4px 4px 0 #090a0d`（=`--hard-shadow`） |
| `transform` | `none` | **`none`**（不动） |

对比 holynova 的 hover 四件套（抬 4px + 三层软影 + 图压暗 + 动作浮出）：**一个用暗色阴影抬，一个用硬阴影压**。
两派都能成立，但都要求「整站统一」——这站所有可点卡片（风格卡、模板卡、动效条目、资源卡、提示词卡）共用同一条 100ms 线性 transition：

```css
.style-card, .template-card, .compact-item, .resource-specimen-grid article,
.pattern-item, .prompt-topic-grid > a, .guide-grid > a {
  transition: translate .1s linear, border-color .1s linear,
              background .1s linear, box-shadow .1s linear;
}
```

## 六、动效体系（本次重点）

### 6.1 它自己的动效预算：3 条 transition，全 100ms 线性

全站样式表里 `transition` 只有三处：

1. 上面那条「所有可点卡片」的 100ms linear 四连；
2. `.animation-replay { transition: translate .1s linear, background .1s linear, color .1s linear }`；
3. `.template-viewport iframe { transition: width .18s }`。

**没有一条 `cubic-bezier`、没有一个 spring、没有一条滚动监听**。降级也很硬：

```css
@media (prefers-reduced-motion: reduce) {
  *, ::before, ::after {
    scroll-behavior: auto !important;
    transition-duration: .001ms !important;
    animation-duration: .001ms !important;
    animation-iteration-count: 1 !important;
  }
}
```

和语料里其他站对比：holynova 是 `cubic-bezier(.16,1,.3,1)` + 220–300ms（手感派），Wegic 是 `.33,1,.68,1` + 400ms（弹性派），这站是 **100ms linear（印刷派）**。
100ms linear 的适用条件写清楚才不会误抄：**只在「切换状态」上用（描边、底色、阴影、1–2px 位移），且必须有非动效的反馈兜底（边框变色、阴影落下）**。悬停时若只有位移，100ms 太快会像抖动。
### 6.2 动效目录：10 个域、57 条，用「触发时机 · 时长」当索引

`/ui/animations/` 的骨架是 10 个 `.domain-section`，每条目是一个 `.compact-item` 链接，**没有任何动图或缩略图**：

| 域 | 条数 | 例（名称 / 元数据） |
|---|---|---|
| 入场 | 9 | 淡入上滑 `加载时 · 600ms`、缩放淡入 `加载时 · 400ms`、弹簧缩放 `加载时 · 800ms` |
| 悬停 | 5 | 悬浮抬升 `悬停时 · 200ms`、3D 卡片翻转 `悬停时 · 600ms`、边框描边 `悬停时 · 600ms` |
| 文字 | 7 | 打字机 `加载时 · 3s`、数字滚动 `滚动时 · 2s`、跑马灯 `持续播放 · 20s` |
| 加载 | 4 | 骨架屏脉冲 `持续播放 · 2s`、微光扫过 `持续播放 · 2s` |
| 滚动 | 4 | 滚动显现 `滚动时 · 600ms`、视差浮动 `滚动时 · continuous` |
| 背景 | 2 | 背景渐变流动 `持续播放 · 8s`、形状变形 `持续播放 · 8s` |
| 微交互 | 6 | 子元素错开 `加载时 · 500ms`、彩纸爆炸 `点击时 · 1.2s` |
| 转场 | 4 | 模糊到清晰 `加载时 · 500ms`、交叉淡化 `手动触发 · 500ms` |
| 指针 | 12 | 聚光灯卡片 `悬停时 · continuous`、磁吸悬浮、涟漪点击 `点击时 · 600ms`、3D 透视倾斜 |
| 离场 | 4 | 淡出下滑 `手动触发 · 400ms`、折叠收起 `点击时 · 350ms` |

条目结构（可整段搬）：

```html
<a class="compact-item" href="/ui/animations/fade-in-up/">
  <div><h3>淡入上滑</h3></div>
  <span>加载时 · 600ms</span>          <!-- 黑条：触发时机 · 时长 -->
  <p>元素从下方淡入并向上滑动，最常见的入场动画之一。</p>
</a>
```

三条值得学的判断：

1. **用「时机 × 时长」当分类的第一维，而不是用「效果名」**。用户找动效时的真实问题是「我要一个入场，快一点」，不是「我要 ease-out-back 的第 4 档」。因此域按时机切（入场/悬停/滚动/点击/持续），条目第二行立刻给数值。
2. **目录不放动图**。57 个动图会让整页变成马戏团、而且拖慢整页；它把「演」留到详情页，目录只负责「查」。这与本站列表页的哲学一致：**索引页负责分类，详情页负责演**。
3. 时长口径统一到 ms（`3s`、`20s`、`continuous` 三种写法并存，但都在同一位置）。真正要紧的是**同一位置**——第 47 条和第 3 条的元数据都在同一行同一处，扫读才成立。

### 6.3 单条动效详情：一屏三段 + 一个重放按钮

`/ui/animations/<slug>/`（实测 `fade-in-up`，文档高 2,480）：

- `h1 76/950`：动效名（「淡入上滑」）；
- `h2 40/950`「交互预览」→ `.animation-stage` 里放一个**真实组件**（这里是一条通知卡），外加 `<button class="animation-replay" aria-label="重新播放动效">`（16px lucide `rotate-ccw` 图标）；
- `h2 40/950`「动效定义与代码」→ 一份 JSON 定义 + 一段 `@keyframes`。

定义块是内容的一部分，字段固定（`slug / name / nameEn / description / descriptionEn / category / tags`），代码块给的是可直接粘的纯 CSS：

```css
@keyframes fadeInUp {
  0%   { opacity: 0; transform: translate3d(0, 14px, 0); }
  100% { opacity: 1; transform: none; }
}
```

**重放的实现**（实测点击后 `document.getAnimations()` 里出现 `fadeInUp`）：删掉动画类 → 强制回流 → 重新加类，纯 CSS 动画重跑，不用 JS 逐帧、也不用 Web Animations API。这招便宜且稳，可直接搬：

```js
btn.addEventListener('click', () => {
  const el = stage.querySelector('.demo');
  el.classList.remove('is-playing');
  void el.offsetWidth;            // 强制回流，让动画可重入
  el.classList.add('is-playing');
});
```

三个细节：
- 重放按钮只做 `translate/.1s linear` 的按下反馈（和全站同一条曲线），不抢戏；
- 页面初始 `getAnimations()` 为 0 条——**动画不在加载时自动播**，避免用户进页面就看到「演完了」；
- 48px 见方的可点区域（16px 图标 + 内边距），满足触屏。

### 6.4 showcase 页：把规格做成一整页，并把数值印在页面上

每个风格除了规格页（规则/组件/AI 提示词），还有一份 `/ui/styles/<slug>/showcase/`——**用该风格真做一页 6–7 段的落地页**。以 `neo-brutalist` 为例（实测 8,966 高）：

- 顶栏：`NEO BRUTAL` 双色块 logo + 5 个带墨框的锚点（PALETTE / COMPONENTS / ANIMATION / APP DEMO / RULES）；
- hero：荧光黄满版（`#c8ff00` 一类），`h1 96/900`、等宽字体；eyebrow 是黑底反白条「✦ DESIGN SYSTEM SHOWCASE」；
- **四格规格条**（滚动到 hero 下沿可见）：`0px BORDER RADIUS` / `0px BORDER WIDTH` / `8px SHADOW OFFSET` / `150ms TRANSITION`——**把设计规格当内容印在首页**；
- 各段 `border-4 border-black` + `scroll-mt-16`（锚点跳转不会被固定顶栏盖住）。

自带两条 keyframes（全站只有这两条属于站点 UI 之外的效果）：

```css
@keyframes brutal-march {          /* 二值条纹跑马灯：挪背景不挪元素 */
  0%   { background-position: 0 0; }
  100% { background-position: 32px 0; }
}
@keyframes brutal-stamp {          /* 盖章入场：过冲 + 轻微旋转 */
  0%   { transform: scale(1.4) rotate(-6deg); opacity: 0; }
  60%  { transform: scale(.96) rotate(1deg);  opacity: 1; }
  100% { transform: scale(1) rotate(0);       opacity: 1; }
}
```

两点判断：

1. **`brutal-march` 用背景位移做跑马灯**（`background-position` 平移 32px，600ms linear infinite）。比 `transform: translateX(-100%)` 更省：没有布局、没有合成层、条纹图本身可以是一张 data-URI；代价是**跑马灯不能有内容**（只能动纹理），所以它只用在装饰条上。
2. **`brutal-stamp` 的 60% 关键帧**：`scale(.96)` 略微回缩再落回 1，是「盖章」的物理感来源。只有两段（1.4 → .96 → 1），但中间那一帧决定了「啪」还是「噗」。
   注意 showcase 页自己声明 150ms transition，而站点外壳是 100ms——**一个产品里出现两个值就是「两套指针」**，抄的时候要统一（见第七节）。
### 6.5 展示体系的三层 IA（这是最值得搬的一条）

```
第一层  风格目录   /ui/styles/          143 张卡 = 静态 SVG 预览 + 名称 + 徽标 + 色板 + 两个按钮
第二层  规格页     /ui/styles/<slug>/   规则（AI 实现规则）+ 5 个组件预览 + 应用场景/视觉关键词
第三层  showcase   /ui/styles/<slug>/showcase/   用这个风格真做一页 6–7 段落地页
旁支    动效目录   /ui/animations/      10 域 × 57 条，每条一行元数据
旁支    动效详情   /ui/animations/<slug>/  真实组件 + 重放按钮 + @keyframes 源码
```

对应的产品判断：

- **每份风格＝两份产物**（规格 + 展示）。只给规格，用户要自己想象成品；只给展示，用户不知道怎么复刻。两份都要，且**从目录页各给一个按钮**（「规则详情」/「真实展示」）——用户的分叉在卡片上就解决，不用进详情页再找。
- **规格页里放「AI 实现规则」与「组件预览」两段**：前者是给 agent/提示词用的，后者是给人眼验收用的。同一份规格，两个消费方。
- **动效独立成一级栏目**，而不是塞在风格详情里。动效是横切的（任何风格都可能用聚光灯卡），挂在某个风格下等于锁死复用。

## 七、它自己也没做好的七处（如实记录）

1. **目录页与动效页都没有 `h1`**。两级页面（`/ui/`、`/ui/animations/`）的标题都是 `h2`，143 张卡各带一个 `h2`，文档大纲里顶级标题缺失，读屏与搜索都吃亏。规格页与 showcase 页有 `h1`（76/950、96/900），说明作者知道 `h1` 该怎么写，只是列表页漏了。
2. **三个字体角色指向同一栈，等宽变量声明了却没有生效文本**。抄的时候别把「预留插槽」当成「已在用的设计决策」。
3. **中文正文压在 13px**（438 处），跨站均值 14.8px。13px 中文在 1440 屏上还行，在 1366×768 笔记本上偏小；若抄这套密度，正文用 14px 更稳，仍能保持「规格书」的气质。
4. **100ms linear 用在所有卡片上**。它靠「描黑 + 硬阴影」兜住反馈，所以不违和；但**同一个 100ms 也用在 `.animation-replay`（一个按钮）**，按钮按下只有 100ms 线性变色，稍显生硬。按钮类应给 150–200ms。
5. **shell 是 100ms、showcase 页却声明 150ms**。同一产品两个过渡值，抄的时候统一（本文推荐：外壳 100ms 只用于卡片状态切换，按钮 150ms，页面内部动效按 `motion-spec.md` 的五档）。
6. **色板小方块靠 `border: 1px solid #111` 区分**。当色板里出现 `#000` 或近黑时，黑块 + 黑边就糊在一起；该站的新野兽派卡（黑/白/洋红/荧光绿）里第一格就是纯黑。稳妥做法是给色块加 `box-shadow: inset 0 0 0 1px rgba(0,0,0,.12)` + 外层 1px `--line-soft`。
7. **静态 SVG 预览无法证明可用性**。143 张 SVG 都是「海报式」构图，与第二层的组件预览、第三层的 showcase 是三种不同的东西。读者容易把 SVG 当「这个风格做出来的页面」，从而高估落地难度——所以卡片上必须有「真实展示」入口，且它比「规则详情」更该被强调。

## 八、能搬 / 不能搬

| 项 | 结论 |
|---|---|
| 方格纸底板（两条 1px 渐变） | **能搬**，成本 3 行 CSS，立刻把「绘图/规格」气质拉起来；`--grid-line` 压在 6–8% 黑，深色模式换 6–8% 白 |
| 墨黑 1px 边框 + `4px 4px 0` 硬阴影 | **能搬**，但必须整站统一；和软阴影混用会廉价 |
| hover 不位移、只描黑 + 落硬阴影 | **能搬**，是「印刷派」的标准 hover，比抬升省 GPU |
| 元数据黑条（触发时机 · 时长） | **能搬**，适用于任何「参数索引」场景（动效库、图标库、组件库） |
| 100ms linear 全站过渡 | **有条件搬**：只给状态切换（边框/底色/阴影），按钮给 150–200ms |
| 静态 SVG 预览 | **能搬但要看场景**：需要「像」而非「是」时用它；需要证明可用性时用活预览（见 `stylekit-design.md`） |
| 超重 950 字重做标题 | **能搬**，但中文需要字体支持（Inter 无中文，中文回退到 Noto/思源后 950 会掉成 700，需显式换 `font-weight 900` 的中文变量字体或接受回退） |
| 卡片标题 18/400 不加粗 | **能搬**，是「规格书」与「营销页」的分水岭 |
| 三件套字体变量指向同一栈 | **不能搬**：声明即承诺，指向同一值等于没做区分 |
| 列表页无 `h1` | **不能搬** |
| 目录页放 143 张 SVG 当唯一预览 | **不能搬**：必须与「真实展示」配套 |

## 九、复现清单（十步）

1. 定底板：`--bg #f3f4f6` + 两条 1px 渐变（`--grid-line` 7.5% 黑）+ `background-size: 32px 32px`。
2. 定边框色与阴影：`--line #090a0d`（结构）、`--line-soft #bdc3cf`（弱分隔）、`--hard-shadow: 4px 4px 0 #090a0d`。
3. 圆角一档：`--radius-control: 2px`；色板小方块 `radius: 0`。
4. 字阶只留六档：76/950、40/950、18/400、13/400、12、11/750；**页面必须有 `h1`**（用 76 那档）。
5. 卡片六段：预览（16:9）/ 中文名 18 + 英文名 12 / 类型徽标 11 反白 / 描述 12 / 色板行 25×14 / 按钮对 38 高。
6. hover 三件事：`border-color → #090a0d`、`box-shadow → var(--hard-shadow)`、`transform` 不动。
7. 过渡：卡片状态切换 `100ms linear`（`transition: translate, border-color, background, box-shadow`）；按钮 `150–200ms`。
8. 动效库用「时机 × 时长」当元数据，做成黑条；目录不放动图，详情页放真实组件 + 重放按钮 + `@keyframes` 源码。
9. 三层 IA：目录（索引）→ 规格页（规则 + 组件预览）→ showcase（真做一页），目录卡上给两个入口。
10. 降级：`prefers-reduced-motion: reduce` 下 `transition/animation-duration: .001ms`、`iteration-count: 1`、`scroll-behavior: auto`；`(hover: none)` 下把 hover 才出现的按钮改为常显。

## 十、与其他文件的关系

- **和 `stylekit-design.md` 是一对**：同赛道两种做法（活预览 vs 静态 SVG；发丝线 vs 墨框；直角 0 vs 2px）。选一边，别混。
- **`motion-spec.md` 的时长五档**（120/180/240/400/600）与本站的 100/150/400/600/800/1.2s/3s/20s 有出入：本站的短档更短（100ms），长档更长（20s 跑马灯）。合并口径写在 `css-recipes.md` §21 的注释里——**100ms 只在「印刷派」气质下可用，其余按五档**。
- **`craft-floor.md`** 的「深度三选一」在本站是「硬阴影 + 1px 边框」这一派，属于合法组合（不是幽灵卡）。
- **`anti-slop.md`** 的「每节 eyebrow」在此站表现为「黑底反白条」，密度 = 每段一个，未越界（每节内容不同、且不是装饰）。

## 十一、重采方法

```bash
# 目录页：结构、令牌、卡片、字号分布
node .tools/probe-lm1.mjs
# 卡片 hover、按钮、header（写 facts2.json）
node .tools/probe-lm2.mjs
# 三个子页面一次过：动效目录 / 风格规格页 / showcase
node .tools/probe-lm3.mjs
# 动效目录的域与条目（触发时机 · 时长）、单条详情、showcase keyframes
node .tools/probe-lm4.mjs && node .tools/probe-lm5.mjs && node .tools/probe-lm6.mjs
```

三个坑：

1. **根域名 404**，必须直接开 `/ui/`；`https://luckymaomi.github.io/` 只有 12 个元素。
2. **`document.styleSheets` 里只有一份 31KB 的 Tailwind v4 产物**（`_astro/BaseLayout.*.css`），`@keyframes` 为 0——动效详情页与 showcase 的 keyframes 在**各自页面**的样式里，必须逐页采。
3. PowerShell 里 `curl.exe` 返回的是**行数组**，`.Length` 是行数不是字节数（我第一次读 HTML 得到「7 bytes」）；要 `-join "`n"` 之后再量。