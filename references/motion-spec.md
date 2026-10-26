# 动效规格（时长 / 缓动 / 编排 / 降级 / 验收）

> 这份文件解决一个问题：**动效不该靠手感调，应该有一套能背下来的数值 + 能把关的判据。**
> 语料里的四个样本给出方向（wegic 的塑料键帽、即时设计的 130px 节奏 + 展示动画、StyleKit 的两笔 hover、UI Notes 全站 1 个动画），
> 规则层面的判据来自 `craft-floor.md`（「一个有意识的动效时刻」）与 `anti-slop.md`（MOTION 旋钮 + 动效 tell）。
> 若与实测冲突，按 `craft-floor.md` 第八节的裁决办。

---

## 一、四条底线（违反任一条，动效就别做）

1. **只动 `transform` 和 `opacity`**。`top/left/width/height/margin/padding` 会触发重排，60fps 保不住；`filter` / `backdrop-filter` 大面积动会掉帧。
2. **每个动画都要能一句话说出动机**：层级（谁盖谁）、叙事（先说后说）、反馈（我按到了）、状态变化（正在发生）。说不出就删。
3. **可打断**：用户用鼠标划过、快速点两下、向上滚回去时，动画不能"排队演完"。过渡在 `:hover` → `:focus` → `:active` 之间要能互相接管，不要用 `animation-delay` 堆队列。
4. **必须有三档降级**：完整 / 减弱（`prefers-reduced-motion`）/ 关闭（低端机、省电、用户手动关）。见第七节。

---

## 二、令牌：时长与缓动

背下这张表，全站只从里面取值，别再出现 `transition: all .3s ease`。

| 令牌 | 值 | 用在哪 | 语料依据 |
| --- | --- | --- | --- |
| `--dur-1` | **120ms** | hover / focus / 颜色与边框变化 | StyleKit hover 160ms；本站多数站点在 100–180ms |
| `--dur-2` | **180ms** | 按下反馈、开关、勾选、tooltip 出现 | wegic 按钮侧壁 4→2→0 的按下节奏 |
| `--dur-3` | **240ms** | 展开/收起、抽屉、下拉、modal 进出 | 超过 240ms 的抽屉会显得拖 |
| `--dur-4` | **400ms** | 区块入场、页面级转场、大位移 | 即时设计区块入场 400–600ms |
| `--dur-5` | **600ms** | 一次性叙事（hero 进场、逐字） | wegic 逐字入场总计约 600ms |
| 上限 | **800ms** | 超过就要能跳过 | —— |

缓动只留四条，**别自创**：

```css
--ease-out: cubic-bezier(.16, 1, .3, 1);      /* 进入、展开、入场：快起慢收 */
--ease-in: cubic-bezier(.4, 0, 1, 1);         /* 离开、收起：慢起快走 */
--ease-in-out: cubic-bezier(.65, 0, .35, 1);  /* 双向对称（开↔关、切换） */
--ease-spring: cubic-bezier(.34, 1.56, .64, 1); /* 只给直接操作（拖动松手、开关），回弹 ≤ 1 次 */
--ease-out-quart-public: cubic-bezier(.33, 1, .68, 1); /* wegic 全站实测值，等价 ease-out 但更钝 */
```

规则：

- **进入用 ease-out，离开用 ease-in**，同一元素双向切换用 `ease-in-out`（不对等会让"关得比开得快"变得很突兀）。
- **`linear` 只允许两处**：无限跑马灯、进度条（真实进度）。
- **弹性/回弹只给直接操作**（用户手指或鼠标带着物体走），别给入场。入场回弹是 2015 年的味道。
- 时长和位移要成比例：移动 8px 用 120–180ms；移动一屏用 400–600ms。**同样的 120ms 挪 400px 会像瞬移。**

---

## 二·补、三份实测的时长口径（同一件事的三种气质）

语料里有三个样本把「时长」用成了身份，选一套就要用到底：

| 气质 | 代表站 | 主缓动 | 主时长 | 什么时候选它 |
|---|---|---|---|---|
| 手感派（软） | holynova | `cubic-bezier(.16,1,.3,1)`（spring 手感） | 220 / 200 / 300ms（位移 / 描边 / 阴影分开） | 作品集、消费级产品、需要「贵」的观感 |
| 弹性派（中） | Wegic | `cubic-bezier(.33,1,.68,1)` | 400ms | 营销页、品牌站、需要「活」的观感 |
| 印刷派（硬） | 猫叫兽 UI 风格库 | **linear** | **100ms**（状态切换）/ 160ms（按钮） | 规格书、灵感库、设计系统文档、工具站 |

印刷派的成立条件（缺一条就别用 100ms linear）：

1. **必须有非动效反馈兜底**——边框变色、阴影落下、底色反转。只有位移的 100ms 会被读成「抖」。
2. **只用于状态切换**（hover/focus/active 的描边、底色、阴影、1–2px 位移），入场与转场仍走五档（120/180/240/400/600）。
3. **整站统一**：按钮单独给 160ms 可以，但如果卡片 100ms、按钮 100ms、评论 240ms、页脚 400ms，就等于没有口径。

> 三种气质的详细数值：`holynova-motion.md`（手感派）、`wegic-design.md`（弹性派）、`luckymaomi-catalog.md`（印刷派）。

## 二·补二、动效索引的元数据约定（做动效库/图标库/组件库时照这个写）

一个可被检索的动效库，条目的第二行固定写 **「触发时机 · 时长」**：

```
加载时 · 600ms      入场、转场
悬停时 · 200ms      悬停、指针
点击时 · 500ms      微交互、离场
滚动时 · 600ms      滚动驱动（continuous 表示跟随滚动）
持续播放 · 2s       加载态、背景、装饰
手动触发 · 500ms    需要用户点一下才演
```

理由：用户找动效时的真实问题不是「我要 ease-out-back」，而是「我要一个入场，别太慢」。时机决定能不能用，时长决定敢不敢用。

配套两条：

- **目录页不放动图**，只放名称 + 元数据 + 一句话；演的动作留到详情页。57 个动图会让索引页变成马戏团。
- **详情页必须能重放**，且重放用「删类 → 强制回流 → 加类」重跑 CSS 动画，不要用 JS 逐帧，也不要让动画在加载时自动播完：

```js
function replay(el, cls = 'is-playing') {
  el.classList.remove(cls);
  void el.offsetWidth;        // 强制回流，让动画可重入
  el.classList.add(cls);
}
```
## 二·补三、生成器给出的阶梯（--persona 之后别再手调）

`scaffold.mjs` 会按人格把时长压成五档并写进 `--dur-1..5`：

| 档 | 用途 | rational | warm | print |
| --- | --- | --- | --- | --- |
| `--dur-1` | 按下 / 状态翻转 | 120 | 180 | 100 |
| `--dur-2` | hover 位移、描边 | 160 | 240 | 130 |
| `--dur-3` | 卡片阴影、图层切换 | 200 | 300 | 160 |
| `--dur-4` | 面板 / 抽屉 / 入场 | 320 | 480 | 256 |
| `--dur-5` | 大块转场上限 | 600 | 600 | 600 |

同时输出四条缓动（`--ease-out / in / in-out / spring`）与一个开关 **`--motion`**（`1` / `0`）。
写动效时用 `calc(var(--dur-3) * var(--motion))`——`prefers-reduced-motion` 下生成器把 `--motion` 置 0，
一次切换全站归零，不必在每个动画上重写降级块。
## 三、位移与缩放：小即是好

| 动作 | 允许的量 |
| --- | --- |
| 卡片 hover 抬起 | `translateY(-2px)` 到 `-4px`，**不缩放图片以外的内容** |
| 图片 hover 放大 | `scale(1.02)` 到 `1.04`，**容器 `overflow: hidden`** |
| 按钮按下 | `translateY(1px)` 或厚度从 4px 降到 0（wegic 的做法），**不加阴影** |
| 入场位移 | `translateY(8px)` → `0`；不要 40px 以上（会像"从屏幕外飞入"） |
| 入场缩放 | `scale(.98)` → `1`，不要 `scale(.8)` → `1` |
| 抽屉/弹窗 | 面板 `translateY(8px)` + `opacity`；**别从 -100% 滑**（那是 toast 的做法） |

一条判据：**动效结束后用户不该注意到"它刚动过"**，只该觉得界面顺手。注意到就是过了。

---

## 四、编排：一次一个主角

- **入场 stagger 间隔 40–60ms**，同组最多 8 个元素；超过 8 个就"整组一起"再"组内前 3 个 stagger"。
- **首屏只有一次入场序列**，长度 ≤ 1.2s 全部结束；用户滚到第二屏时不该还在演。
- **视口入场只演一次**（`once`），回滚不重播。重播会让长页面变成幻灯片。
- **同一时刻只允许一个高注目动画**：hero 在演的时候，导航别同时有 hover 缩放。
- 交错方向跟阅读方向一致（中文/英文都是自上而下、自左而右），**别做成从右下飞来**。

```css
/* 一段可用的入场：距离 8px、时长 400ms、间隔 50ms、只演一次 */
.reveal > * {
  opacity: 0;
  transform: translateY(8px);
  transition: opacity var(--dur-4) var(--ease-out), transform var(--dur-4) var(--ease-out);
  transition-delay: calc(var(--i, 0) * 50ms);
  will-change: opacity, transform;
}
.reveal.is-in > * { opacity: 1; transform: none; will-change: auto; }
```

---

## 五、滚动驱动：不要监听 scroll

- **入场用 `IntersectionObserver`**（阈值 0.2、`rootMargin: '0px 0px -10% 0px'`、`unobserve` 后 `once`）。
- **进度条 / 视差用 CSS `animation-timeline: view()` / `scroll()`**，不支持的浏览器直接不呈现（渐进增强，别用 JS 兜底写回 scroll 监听）。
- **禁止 `window.addEventListener('scroll')` 驱动布局或动画**：每帧都跑、和滚动惯性打架、移动端尤其差。
- **别做滚动劫持**（把页面滚动改成一屏一屏）。做营销页可以，但要给 `Esc` 或明确出口，且移动端默认关掉。
- **吸顶元素只改 `position: sticky`**，不要用 scroll 监听算 top。

---

## 六、六类交互的配方（照抄即可）

| 交互 | 动什么 | 时长 / 缓动 | 备注 |
| --- | --- | --- | --- |
| hover（可点元素） | 背景/边框色 + 轻微位移或图片缩放 | `--dur-1` / `--ease-out` | 卡片最多两笔（色 + 缩放其一） |
| press | `translateY(1px)` 或厚度归零 | `--dur-1` / `--ease-out` | **按下必须真的陷下去**，否则像坏按钮 |
| focus-visible | 描边出现（不要动位移） | `--dur-1` | 焦点环不参与动画，瞬时更好 |
| 展开/收起 | `grid-template-rows: 0fr → 1fr` 或高度 clip | `--dur-3` / `--ease-in-out` | 别用 `height: auto`（不可动画） |
| 出现/消失 | `opacity` + 8px 位移 | `--dur-3` | 消失比出现快（`--dur-2` 收掉） |
| 载入中 | 骨架 shimmer 或 3 点跳动 | 1.2–1.6s `linear` 循环 | **每页最多一个循环动画**，且 `reduced-motion` 下停 |

补充：

- **Toast**：滑入 180ms、停留 ≥ 4s、滑出 240ms，出现位置离边缘 16–24px。
- **数字变化**：只给真实数据（计数器）动 400ms，且**只在首次进入视口时动一次**；假数据不许滚数字。
- **Modal**：遮罩淡入 180ms，面板 8px 上浮 240ms，关闭时只淡出（不要缩回）。
- **拖拽**：跟手 1:1，松手回弹用 `--ease-spring`，容器滚动锁定。

---

## 七、降级：三档，用属性切而不是各写一遍

```css
:root { --motion: 1; }                       /* 1 = 完整；0 = 关闭 */
[data-motion="off"] { --motion: 0; }
@media (prefers-reduced-motion: reduce) {
  :root { --motion: 0; }
}
/* 所有时长乘上系数；关闭时归零而不是删规则 */
.btn { transition-duration: calc(var(--dur-1) * var(--motion)); }
.reveal > * { transition-duration: calc(var(--dur-4) * var(--motion)); }

@media (prefers-reduced-motion: reduce) {
  .marquee__track, .skeleton, .pulse { animation: none !important; }
  .reveal > * { opacity: 1 !important; transform: none !important; }
}
```

三档的判定：

- **完整**：默认。
- **减弱**：系统 `prefers-reduced-motion: reduce` → 位移与缩放全部去掉，只留颜色与不透明度；无限循环全部停。
- **关闭**：低速网络 / 低端机 / `navigator.deviceMemory < 4` / 用户手动切（记住 `localStorage`）→ `--motion: 0`。

> 常见错法：只在 `@media` 里写 `animation-duration: .01ms !important`。这会让 `transitionend` 事件仍然触发但视觉上闪一下，而且**没有减法**——元素该消失还是消失、该淡入还是瞬间出现，用户看到的是"抖动"。正确做法是**在 `reduce` 里把位移和循环直接去掉**，只保留透明度。

---

## 八、性能预算与自测

| 项 | 上限 |
| --- | --- |
| 同屏同时动的元素 | **≤ 12** |
| `will-change` 数量 | **≤ 3**，动画结束必须撤（`auto`） |
| 单次动画最长 | **800ms**（可跳过的除外） |
| 无限循环动画 | **每页 ≤ 1**，且可暂停（hover / focus / reduced-motion） |
| 大面积 `backdrop-filter` 动画 | **禁止**（模糊每帧重算，移动端直接掉到 20fps） |

自测四步（每步都能失败）：

1. DevTools → Performance，**6× CPU 节流**下录 5 秒，看是否掉到 60fps 以下、有没有长任务。
2. Rendering 面板勾 Paint flashing：**动画区域不应整块重绘**（重绘 = 你没用 transform）。
3. 系统开「减少动态效果」（Windows 设置 → 辅助功能 → 视觉效果 → 动画效果关），刷新页面：**不该有任何位移与循环**。
4. `node scripts/audit.mjs --url … --reduced-motion` 抓仍然无限循环的装饰动画（脚本会报出来自哪个选择器）。

---

## 九、动效 AI tell（出现即扣分）

- **逐字/逐行淡入**用在正文段落上，且页面里出现两次以上。
- **滚动到哪动到哪**：每个区块都 fade-in + 上浮 40px，一屏一个 —— 这不是动效，是延迟加载的视觉噪音。
- **全站 hover 都是 `scale(1.05) + translateY(-4px) + 阴影加深`**：三件事一起做，且每个卡片一样。
- **数字滚动 / 假计数器**（`1,234,567` 从 0 滚上去）。
- **鼠标跟随光斑 / 光标自定义 / 磁性按钮**用在 tool/SaaS 站上。
- **无限 pulse / float / shimmer 铺满卡片**（尤其"AI 功能卡"一排都在呼吸）。
- **入场 stagger 超过 1.2s 还没演完**，用户已经开始读字了它还在动。
- **CSS 动画结束时 `transform` 留在中间值**，导致 `position: fixed` 子元素偏移、点击热区错位（动画用 `both` 要留意）。
- **同一个元素同时被 CSS transition 与 JS 动画驱动**，会互相覆盖出现"抖动"。

---

## 十、与其它文件的关系

- `craft-floor.md` 第一节第 5 条（「一个有意识的动效时刻 + 指数 ease-out」）是这份文件的判据源头，第八节的四条裁决在此同样适用。
- `anti-slop.md` 第二节的 `MOTION_INTENSITY` 旋钮决定**要不要做**（> 4 必须真动，≤ 2 只留 hover），这份文件决定**怎么做**。
- `css-recipes.md` §18 是这里所有规则的可复制片段；§19 是"聚光描边卡"这一具体招式的完整片段。
- `holynova-motion.md` 是**案例**（单站 23 条 transition / 3 个 keyframes / 1 条主缓动）：这份文件说"该不该、多长"，那份文件给"长什么样、实测多少"。
- `review-rubric.md` 的动效四问（动机 / 时长 / 降级 / 重绘）来自这里。
- 语料侧证据：`design-evidence.md` 的「动画数量」一栏（桌面 21 / 8 / 1 / 0），以及 wegic / jsdesign 单站文档里的缓动实测值。

---

## 十一、来源

- 判据：impeccable `craft-floor.md`（Apache-2.0）、design-taste-frontend 的 MOTION 旋钮与动效 tell（规则重写）。
- 实测数值：holynova（单一 `cubic-bezier(.16,1,.3,1)`、时长 0.12–0.4、聚光层只改 opacity 与两个 CSS 变量）、wegic（`cubic-bezier(.33,1,.68,1)`、按钮厚度 4→2→0）、即时设计（桌面 21 个动画、展示区 400–600ms）、StyleKit（hover 160ms、两笔）、UI Notes（全站 1 个动画）。
- 时长/缓动分级是本站汇总值，**不是某一家站点的原值**；要引用单站数值请回各自单站文档。