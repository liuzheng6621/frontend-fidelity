# holynova 动效蒸馏（聚光描边卡 · 单一 spring · 9 档时长）

来源：<https://holynova.github.io/>（单页作品集详情，`holynova · Where Craft Lives`）。
采集：headless Edge 1440×900，`node E:\SKIl.1\.tools\probe-hn1..3.mjs`，原始数值在 `E:\SKIl.1\.tools\out\hn\facts{1,2,3}.json`、`hover.json`、`scroll.json`。
用途：这是一份**只讲动效**的单站蒸馏。整站视觉（暗底 `#09090b`、masonry 卡、工具栏）不进本站语料统计——它只用来回答一个问题：**不用任何动效库，怎么让一批卡片"活着"。**

## 一、一句话：23 条 transition、3 个 keyframes、1 条缓动

| 项 | 实测 |
| --- | --- |
| 元素 / 画布 | 431 元素；**0 canvas、0 video**（动效全是 CSS 与直写样式） |
| 动效库 | **零**：GSAP / THREE / lottie / Swiper / lenis / anime 一个都没有 |
| `transition` 声明 | 23 条规则 |
| `@keyframes` | **3 个**：`cardEntry` / `spin` / `heartPop` |
| `will-change` | 0 处 |
| `clip-path` 动画 | 0 处（`clip`/`mask` 只用于静态聚光，不参与补间） |
| 主缓动 | `--ease-spring: cubic-bezier(0.16, 1, 0.3, 1)`，全站 14 条 transition 用它 |
| 时长范围 | 0.12s–0.4s（唯一例外：加载转圈 0.7s `linear`） |

四条可辨识特征：

1. **一条缓动走天下。** 除了零星 `ease`、`0.4s` 的底噪光晕与 `linear` 的转圈，其余全是 `--ease-spring`。全站没有一个 `.2s ease-in-out`。
2. **时长按"接触面积"分档**，不是按组件分档：越大/越贵的东西动得越慢（卡片 0.3s 阴影、工具栏 0.35s、底噪 0.4s），越随手的东西越快（胶囊/点赞 0.15s、菜单项 0.12s）。
3. **悬停是"四件套一起变"**：位移 + 边框 + 阴影 + 图片，缺一件就会显得"只动了一下"。
4. **聚光描边靠 `mask` 抠环**，只改两个 CSS 自定义属性（坐标）和一层 `opacity`，**不触发重排、不做 filter 动画**。

## 二、令牌：缓动、时长、阴影（可直接抄）

> 实测有 **9 档**不同时长（0.12 / 0.15 / 0.18 / 0.2 / 0.22 / 0.25 / 0.3 / 0.35 / 0.4），下文归并成 6 档写进令牌——档位多不等于好，关键是**同一档不许出现两个值**。

```css
:root {
  /* 缓动：一条主缓动 + 一条保底 */
  --ease-spring: cubic-bezier(0.16, 1, 0.3, 1);   /* 常被叫 easeOutExpo；前段极快、尾段极慢 */
  --ease-soft:   cubic-bezier(0.4, 0, 0.2, 1);    /* Material 标准曲线，本站几乎没用到 */

  /* 时长：按接触面积分档 */
  --dur-1: 120ms;   /* 菜单项：指到就亮 */
  --dur-2: 150ms;   /* 胶囊、点赞、动作按钮、页脚链接 */
  --dur-3: 180ms;   /* 导航按钮、动作链接 */
  --dur-4: 220ms;   /* 卡片位移、聚光层 */
  --dur-5: 300ms;   /* 卡片阴影 */
  --dur-6: 400ms;   /* 底噪光晕（唯一到 0.4 的地方） */

  /* 阴影：静止 → 悬停，三层替换而不是叠加 */
  --shadow-card-rest: 0 2px 8px -2px rgb(0 0 0 / .30), 0 1px 3px rgb(0 0 0 / .20);
  --shadow-card-hover: 0 24px 50px -12px rgb(0 0 0 / .75),
                       0 12px 24px -8px  rgb(0 0 0 / .48),
                       0 0 0 1px         rgb(255 255 255 / .14);
  --shadow-md: 0 8px 24px -4px rgb(0 0 0 / .45);   /* 按下时回落 */

  --card-radius: 20px;
  --media-radius: 14px;
}
```

时长阶梯的原始声明（23 条里挑 8 条，全部实测）：

```css
body            { transition: background-color var(--dur-5) var(--ease-spring), color var(--dur-5) var(--ease-spring); }
.sort-menu-item { transition: all var(--dur-1); }
.cat-pill-btn   { transition: all var(--dur-2) var(--ease-spring); }
.card-action-links { transition: opacity var(--dur-3) ease, transform var(--dur-4) var(--ease-spring); }
.detail-card    { transition: transform var(--dur-4) var(--ease-spring),
                              border-color 200ms ease,
                              box-shadow var(--dur-5) var(--ease-spring); }
.toolbar-container { transition: border-color 250ms ease,
                                  box-shadow 350ms var(--ease-spring),
                                  transform 250ms var(--ease-spring); }
.ambient-glow-layer { transition: opacity 400ms; }   /* 故意用默认 ease：它只是底噪 */
.spinner-icon   { animation: spin 700ms linear infinite; }
```

**读法**：位移 220ms、颜色 200ms、阴影 300ms——同一个 hover 里三件事用三个时长，因为**阴影面积大、需要更久才不显得跳**。这是本站最值得学的一条"不对称时长"。

## 三、全部三个 keyframes（没有一个多余）

```css
@keyframes cardEntry {          /* 卡片入场：只做 opacity + 14px 上移 */
  0%   { opacity: 0; transform: translateY(14px); }
  100% { opacity: 1; transform: translateY(0); }
}
@keyframes spin { 100% { transform: rotate(360deg); } }        /* 加载态 */
@keyframes heartPop {                                          /* 点赞：1 → 1.3 → 1 */
  0%   { transform: scale(1); }
  50%  { transform: scale(1.3); }
  100% { transform: scale(1); }
}

.card-appear { animation: cardEntry 360ms var(--ease-spring) 0s 1 normal both; }
.card-like-btn.liked .heart-icon { animation: heartPop 250ms var(--ease-spring); }
```

三点细节，抄的时候别丢：

- `both`（fill-mode）在入场里是必要的：否则动画开始前卡片会以 `opacity: 1` 闪一下。
- **没有 stagger**：卡片 inline style 全空、没有 `--i` 延迟，12 张同帧一起入。好处是"一批 = 一次呼吸"、加载更快；代价见第八节。
- `heartPop` 用 `scale` 而不是改 `width`，且只挂在图标上（不是按钮），所以不引起布局抖动。
## 四、悬停：四件套，实测前后对照

规则原文（`.detail-card` 是卡片根，`article`）：

```css
/* 1) 卡片本体：抬 4px + 边框提亮 + 阴影换档 */
.detail-card:hover,
.detail-card:focus-within {
  transform: translateY(-4px);
  border-color: var(--border-hover);                       /* .07 → .22 白 */
  box-shadow: var(--shadow-card-hover), 0 0 0 1px var(--card-hover-ring);
}
/* 2) 按下回落：抬 1px + 小阴影，给"被按住"的物理感 */
.detail-card:active { transform: translateY(-1px); box-shadow: var(--shadow-md); }

/* 3) 图片压暗去饱和（不是提亮） */
.detail-card:hover .card-demo-image { filter: brightness(0.95) saturate(0.97); }

/* 4) 动作按钮从"藏起来"到"浮上来" */
.card-action-links { opacity: 0; transform: translateY(5px); pointer-events: none; }
.detail-card:hover .card-action-links,
.detail-card:focus-within .card-action-links {
  opacity: 1; transform: translateY(0); pointer-events: auto;
}
```

实测（headless hover 前后取 `getComputedStyle`）：

| 属性 | 静止 | 悬停 |
| --- | --- | --- |
| `transform` | `none` | `matrix(1,0,0,1,0,-4)` |
| `border-color` | `rgba(255,255,255,.07)` | `rgba(255,255,255,.22)` |
| `box-shadow` | 2 层（`8px` + `3px`） | 4 层（`50px` + `24px` + 2× 1px ring） |
| 图片 `filter` | `none` | `brightness(.95) saturate(.97)` |
| 动作按钮 `opacity` / `transform` | `0` / `translateY(5px)` | `1` / `translateY(0)` |

四条判断：

1. **图片压暗是对的，提亮是错的。** 暗底上 `brightness(1.05)` 只会让缩略图糊成一片白，而 `brightness(.95) saturate(.97)` 让卡片整体退后一格，前景白字反而更清楚。语料里其余站的 hover 几乎都是提亮——那是浅底逻辑，搬过来会失效。
2. **`:hover` 与 `:focus-within` 永远同组。** 键盘 Tab 进卡片内的链接时，整套悬停效果必须同样发生，否则键盘用户看到的是"什么都没有"。
3. **`:active` 回落到 -1px + 小阴影**，而不是"再放大"。这 3px 的反差就是点击感的全部来源。
4. 整组动效只碰 `transform` / `border-color` / `box-shadow` / `opacity` / `filter`，全是合成层属性，**没有一处改 `width/margin/top`**。

## 五、聚光描边卡（本页最值得抄的一招）

卡片根上放两个 0 尺寸成本的自定义属性，两个伪元素各画一层光，坐标由 JS 写：

```css
.detail-card {
  position: relative;
  overflow: hidden;
  border-radius: var(--card-radius);
  --spotlight-x: 50%;
  --spotlight-y: 50%;
  --spotlight-opacity: 1;
}

/* 共用的壳 */
.detail-card::before,
.detail-card::after {
  content: "";
  position: absolute;
  pointer-events: none;          /* 别挡住卡片的点击 */
  border-radius: inherit;        /* 跟着卡片圆角走，不用重复写 20px */
  opacity: var(--spotlight-opacity);
  transition: opacity var(--dur-4) var(--ease-spring);
}

/* 1px 描边聚光：径向渐变 + mask 抠成环 */
.detail-card::before {
  inset: 0;
  padding: 1px;
  background: radial-gradient(280px circle at var(--spotlight-x) var(--spotlight-y),
                rgb(255 255 255 / .94), rgb(255 255 255 / .32) 40%, transparent 76%);
  mask: linear-gradient(#fff 0 0) content-box exclude,
        linear-gradient(#fff 0 0);
}

/* 内侧环境光：更大半径、更低不透明度 */
.detail-card::after {
  inset: 1px;
  background: radial-gradient(360px circle at var(--spotlight-x) var(--spotlight-y),
                rgb(255 255 255 / .12), transparent 72%);
  z-index: 0;
}

/* 内容压在光层之上 */
.detail-card > * { position: relative; z-index: 1; }
```

**`mask` 那两行为什么是关键**：`linear-gradient(#fff 0 0) content-box exclude` 的意思是"内容盒以内的部分被排除"，于是 `padding: 1px` 就变成**一条 1px 的环**——渐变只在环上显示。这比"用 border + 背景渐变"省事，也比"四个 div 拼边"少 4 个节点。

**JS 只有一件事**（本站写成 `pointermove` 委托，约 10 行）：

```js
const card = e.target.closest('.detail-card');
if (!card) return;
const r = card.getBoundingClientRect();
card.style.setProperty('--spotlight-x', `${e.clientX - r.left}px`);
card.style.setProperty('--spotlight-y', `${e.clientY - r.top}px`);
```

四个坑：

1. **写自定义属性，不要写 `background`。** 改 `background` 会整层重绘；改两个自定义属性只让伪元素内部重绘一次，且浏览器会把它当合成工作处理。
2. **`.detail-card > * { z-index: 1 }` 不能漏**，否则光层会盖住正文（`::after` 已经给了 `z-index: 0`，正文必须更高）。
3. **触屏没有指针**：`(hover: none)` 时把 `--spotlight-opacity` 直接设 0，否则移动端永远停在中心那个"假的聚光"。
4. **`pointer-events: none` 必须写**，两个伪元素覆盖整张卡，漏了会让整卡不可点。
## 六、入场与加载：一批一次呼吸

- 卡片挂 `.card-appear`（`animation: cardEntry 360ms ... both`），**渲染即播、播完不重播**。实测滚到第 84 张时，`getAnimations()` 里 `cardEntry` 为 0——说明旧卡片没有重演，只有新插入的那批播一次。这个"只演一次"比"每次滚回都重播"专业得多。
- **无限滚动**：`div.scroll-sentinel`（高 1px）被观察，触发后追加 12 张；状态条 `div.scroll-status-container` 显示「显示 12 / 116 个项目」+「加载更多项目」按钮。实测 12 次 wheel（每次 1200px）后：12 → 84 张，`docH` 随之增长。
- 加载中用 `.spinner-icon`（`spin 700ms linear infinite`）。**转圈必须 `linear`**，这是全站唯一允许的线性动画。

## 七、降级：连装饰层一起关

原文：

```css
@media (prefers-reduced-motion: reduce) {
  *, ::before, ::after {
    scroll-behavior: auto !important;
    animation-duration: .01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: .01ms !important;
  }
  .detail-card::before, .detail-card::after { opacity: 0 !important; }
}
```

三个细节值得照抄：

1. `.01ms` 而不是 `0ms`：`0ms` 在部分浏览器里会让 `transitionend` / `animationend` 不触发，依赖事件收尾的代码会卡住。
2. **聚光层单独设 `opacity: 0`**：只压时长的做法会留下"一个不动的白圈"，比有动效时更怪。装饰层在减少动效时要整层关掉。
3. `scroll-behavior: auto !important` 一起关——否则 `html { scroll-behavior: smooth }` 仍然会让"减少动效"的用户经历整页滚动。

## 八、我不会照抄的七处（诚实清单）

| # | 问题 | 为什么 |
| --- | --- | --- |
| 1 | `body` 上 `background-color 250ms` 的 transition | 单主题暗色站，主题从不切换 → 死代码，只在首帧多一次样式计算 |
| 2 | `--shadow-card-hover` 里已有 `0 0 0 1px rgb(255 255 255 / .14)`，hover 又追加 `0 0 0 1px var(--card-hover-ring)` | 同一位置叠了两圈 1px 环，实测 4 层阴影；留一层即可 |
| 3 | **完全没有 stagger** | 12 张同帧入场，在慢机器上像"闪一下"；加 `--i` × 40ms、封顶 8 个就够（见 `motion-spec.md` §四） |
| 4 | 动作按钮只在 hover 出现，且静止态 `pointer-events: none` | 触屏首次点按会"点空"（第一次只是让按钮出现）；应给 `(hover: none)` 常显，或首次点按只做 reveal |
| 5 | 无限滚动没有"到底了"的终止态文案 | 用户不知道还要滚多久；补一句「共 116 个，已全部加载」 |
| 6 | `spinner` 用 `linear`、其余用 `--ease-spring` | 这条**是对的**（旋转必须线性），但混在同一份表里容易被误抄成"所有动画都用 spring" |
| 7 | 聚光半径写死 `280px` / `360px` | 卡片宽度变化时比例会失衡；用 `clamp(180px, 40%, 320px)` 更稳 |

## 九、搬进项目：十步清单

1. 定一条主缓动（推荐 `cubic-bezier(0.16, 1, 0.3, 1)`），写进 `:root`，别在组件里散写。
2. 定 5–6 档时长，按接触面积分：随手 120–150ms、位移 200–220ms、阴影 280–320ms、大面积 350–400ms。
3. 卡片 hover 四件套：`translateY(-4px)` + 边框提亮 + 阴影换档 + 图片 `brightness(.95) saturate(.97)`。
4. `:active` 回落 `-1px` + 小阴影（按下感）。
5. 所有 hover 组都带 `:focus-within`，键盘可达。
6. 需要一个"点亮"效果时，用 `::before` + `mask ... content-box exclude` 抠 1px 环 + `::after` 环境光，坐标走 CSS 自定义属性。
7. JS 只写 `--spotlight-x/y`，`pointer-events: none` 与 `> * { z-index: 1 }` 都要。
8. 入场用 `opacity + translateY(14px)`、`both`、只演一次；批量超过 4 个就加 40ms stagger，封顶 8 个。
9. 降级三件套：`.01ms`、装饰层 `opacity: 0`、`scroll-behavior: auto`。
10. 自测：6× CPU 节流看 hover 是否掉帧、Tab 走一遍看焦点是否也有"点亮"、系统开「减少动态效果」看是否只剩静态。

## 十、与其它文件的关系

- 规则本身（什么时候该有动效、时长上限、编排、性能预算）在 [`motion-spec.md`](motion-spec.md)——**先读它，再看这份案例**。
- 可粘贴的片段在 [`css-recipes.md`](css-recipes.md) §19（聚光卡、四件套 hover、入场、降级）。
- 视觉层（暗底卡片、圆角 20/14、阴影三档）在 [`visual-system.md`](visual-system.md) 的「层级与阴影」节。
- 本文**不进** `design-evidence.md` 的跨站统计：它只有一页、且视觉是作品集特例，只贡献动效口径。

## 十一、重采方法

```powershell
node E:\SKIl.1\.tools\probe-hn1.mjs   # 结构 / 45 个 :root 变量 / 全部 keyframes / 声明计数
node E:\SKIl.1\.tools\probe-hn2.mjs   # 23 条 transition + 3 条 animation 原文 + reduced-motion + 卡片计算值
node E:\SKIl.1\.tools\probe-hn3.mjs   # hover 前后计算值对比 + 无限滚动（12 → 84 张）
```

坑：

- **直接用 `getComputedStyle` 读不到"规则原文"**，必须遍历 `document.styleSheets[].cssRules`（含 `@media`/`@supports` 内层），否则拿不到 reduced-motion 块与 `::before/::after` 的定义。
- 伪元素的样式要 `getComputedStyle(el, '::before')`，`hover` 状态用 `locator.hover()` 后再读，读完再 `mouse.move(0,0)` 复位。
- PowerShell 5.1 的 `ConvertFrom-Json` 遇到大小写不同的同名键（如 `splitType` / `SplitType`）会报「重复的键」——用 node 读 JSON。