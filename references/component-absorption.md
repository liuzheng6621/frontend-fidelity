# 组件吸收：四个开源仓库里能直接用的东西

> 2026-10-31 把四个仓库拉下来逐个读，只记**能落到代码里的结论**，不做项目点评。
> 四个仓库性质不同：两个是组件库（Zarm / GMU），两个是索引（awesome-design-md / awesome-android-ui）。
> 索引类不产生代码，产生的是**类目**——类目错了，组件做得再精细也是缺项。

## 一、总览：各取什么

| 仓库 | 是什么 | 取什么 | 不取什么 |
| --- | --- | --- | --- |
| `ZhongAnTech/zarm` | React 移动端组件库，50 个 UI 组件 | **retina 1px 发丝线**、**两级 CSS 变量**、**移动端控件阶梯**、safe-area 独立组件、组件清单 | React 组件实现（骨架是纯静态 + 可选框架版，不引入运行时依赖） |
| `fex-team/GMU` | 2014 年百度移动端 Zepto 组件库，16 个 widget | 两个仍有效的交互模型（下拉刷新、顶部回顶）与一条历史教训 | Zepto 依赖、`data-role` 字符串初始化、`-webkit-` 前缀堆砌 |
| `VoltAgent/awesome-design-md` | 84 份真实站点的 DESIGN.md 分析 | **DESIGN.md 格式**（YAML frontmatter + 判断型正文），已做成 `scaffold.mjs` 的产物 | 具体站点的色板（那是别人的品牌，抄了就成仿站） |
| `wasabeef/awesome-android-ui` | Android UI 库索引，17 个类目 | **组件类目表**，用来查自己的分类漏了哪一类 | 具体库与原生实现（Web 端没有对应物） |

## 二、Zarm：五件能直接搬的

### 2.1 retina 1px：`border: 1px` 在 3x 屏上是 3 物理像素

这是移动端保真最容易翻车的一处。写 `border-bottom: 1px solid #eee`，设计稿上是发丝线，
到 iPhone 上变成 3 倍粗的灰条——**不是颜色错了，是物理像素错了**。

Zarm 的做法（`style/core/mixins/index.scss` 的 `onepx`）：

```scss
&::after {
  content: '';
  position: absolute;
  inset: 0;
  border: 0 solid var(--border);
  border-bottom-width: 1PX;          /* 大写 PX，Sass 不会把它转成 px */
  pointer-events: none;

  @media (-webkit-min-device-pixel-ratio: 2), (min-resolution: 2dppx) {
    width: 200%; height: 200%;
    transform: scale(.5);
    transform-origin: 0 0;
  }
  @media (-webkit-min-device-pixel-ratio: 3), (min-resolution: 3dppx) {
    width: 300%; height: 300%;
    transform: scale(.3333);
  }
}
```

骨架里落成了 `.hairline` 工具类（`base.css`），不用 Sass 也能用：

```html
<li class="hairline hairline--bottom">…</li>
<div class="hairline hairline--all">…</div>
```

**判据**：任何在真机上「看起来比设计稿粗」的 1px 线，先查这条，别去调颜色。
代价是 `::after` 被占用；需要 `::after` 做别的元素就换 `::before` 或加一层。

### 2.2 两级变量：组件变量回落到全局变量

Zarm 的 `define` mixin 只做一件事：

```scss
--#{$key}: var(--#{$block}-#{$key}, #{$value});
```

展开成 `--stepper-height: var(--za-stepper-height, 28px)`。三个好处：

1. **组件自带默认值**，不依赖全局令牌也能单独用；
2. **覆盖粒度可控**：改 `--za-stepper-height` 只影响 stepper，改 `--za-height-md` 影响所有用到它的组件；
3. **不需要 `!important`**，也不需要给每个组件写主题分支。

骨架的令牌是单级的（`--control-h` 直接是值）。做局部覆盖时只能改全局，
或者写一条特异性更高的选择器。**下一版要把高频组件改成两级**，但不要一次全改——
两级变量的成本是「每个组件多一层 indirection」，只在真的需要局部覆盖的组件上用。

### 2.3 移动端控件阶梯：28 / 36 / 44 / 52 / 60

```css
--za-height-xs: 28px;   /* 小号筛选 */
--za-height-sm: 36px;   /* 药丸 CTA */
--za-height-md: 44px;   /* 常规控件 + 触控下限 */
--za-height-lg: 52px;   /* 主 CTA */
--za-height-xl: 60px;   /* 购买大按钮 */
```

这套阶梯和 `applestore-commerce.md` 实测的 **35 / 36 / 40 / 44 / 54** 是同一思路：
**五档并存，按用途分，不按断点降**。

骨架原来的问题：`--control-h` 在桌面人格下是 **32px**，直接搬到 390 上全线偏小。
现在补了 `--h-xs..--h-xl` 与 `--tap-min: 44px`（见 `tokens.css`），移动端页面用它，不用 `--control-h`。

### 2.4 safe-area 做成独立组件，而不是散写 env()

Zarm 有一个 `<SafeArea position="top|bottom">` 组件，样式只有两行 `padding-top: env(safe-area-inset-top)`。
把它做成组件（而不是在每个页面里写）的理由是：**安全区是布局问题，不是页面问题**。

骨架降级成工具类（静态页不必为它多一层组件）：

```html
<header class="m-head safe-top">…</header>
<nav class="m-tabbar safe-bottom">…</nav>
```

注意 Zarm 同时写了 `env()` 和 `constant()` 两行——后者是 iOS 11.0–11.2 的旧语法。
2026 年已经不需要 `constant()`，**别照抄**。

### 2.5 组件清单对照（50 个 UI 组件）

| Zarm 组件 | 骨架有吗 | 说明 |
| --- | --- | --- |
| button / input / select / radio / checkbox / switch | ✅ `.btn` `.input` `.select` | 静态页用原生控件 + 样式 |
| modal / popup / action-sheet / toast / message | ✅ `.modal` `.m-sheet` | 走原生 `<dialog>`，不自己造 |
| tabs / tab-bar / nav-bar / panel / list | ✅ `.tabs` `.m-tabbar` `.m-head` `.m-item` | |
| stepper（数量步进） | ✅ `.co-qty` `.m-qty` | 电商页与购物车用 |
| safe-area | ✅ `.safe-top` / `.safe-bottom` | 见 2.4 |
| badge / tag / notice-bar | ⚠️ 只有 `.tag` / `.badge` 的视觉 | notice-bar（可关闭的顶部通告）未做 |
| progress / loading / skeleton | ✅ `.skeleton` | progress 只在 audit 报告里，页面没有 |
| search-bar | ✅ `.m-search` / `.cat__rail-search` | |
| swipe-action（左滑出操作） | ❌ | **缺项**，见 §5 |
| pull（下拉刷新） | ❌ | **缺项**，见 §5 |
| keyboard-picker（自绘数字键盘） | ❌ | 只在金额输入场景需要，不默认做 |
| image-preview / pinch-zoom | ❌ | 图片详情场景，需要时按项目补 |
| calendar / date-picker / cascader / file-picker | ❌ | 交给原生 `<input type="date">` 等，不重造 |
| carousel / marquee | ⚠️ `mobile-pager` 是分栏不是轮播 | 轮播需要自动播放 + 暂停，未做 |
| collapse / accordion | ⚠️ | 用 `<details>` 即可，未封装 |
| rate / slider / wheel | ❌ | 低频，按项目补 |
| affix / back-top / popper / tooltip | ⚠️ | affix 用 `position: sticky` 即可；tooltip 只做 title 兜底 |
| transition（动效封装） | ✅ `--dur-*` / `--ease` | 令牌层，不做 JS 封装 |

**结论**：50 个里骨架覆盖 20 个左右，缺口集中在「手势类」（swipe-action、pull、pinch-zoom）
与「选择器类」（calendar、cascader）。这两类都不该默认塞进骨架——前者要真实手势环境才测得准，
后者用原生控件更稳。**但 swipe-action 是移动端列表的刚需，下一版补。**

## 三、GMU：只取两条，其余当反面教材

GMU 是 2014 年 Zepto 时代的产物，16 个 widget：
`add2desktop / button / calendar / dialog / dropmenu / gotop / historylist / navigator / panel / popover / progressbar / refresh / slider / suggestion / tabs / toolbar`。

**还能用的两条**：

1. **`refresh`（下拉刷新）的阈值模型**：下拉超过阈值才触发，松手回弹到「加载中」高度而不是弹回顶部。
   这套三段式（下拉 → 达到阈值 → 释放）是移动端刷新的标准手感，**当前骨架没有**，是缺项。
2. **`gotop`（回顶）**：滚动超过一屏才出现，位置避开底部 tab。
   骨架里用 `position: fixed` + `IntersectionObserver` 即可，但**要注意别和底部 tab 打架**（骨架的移动壳有 tabbar，回顶按钮必须上移）。

**明确别学的**：

- `data-role="widget"` 字符串初始化：没有类型、没有生命周期，现代框架里是负债；
- Zepto 依赖：`zepto` 目录占了 `src` 四分之一，今天用原生 `fetch` / `classList` / `IntersectionObserver` 就够；
- `-webkit-` 前缀堆砌：2026 年主流目标不需要手写前缀，交给构建工具；
- `add2desktop`（添加到桌面）：PWA manifest 取代了它。

**一条历史教训**：GMU 的组件几乎都依赖全局 `window.$`，所以它无法按需加载。
Zarm 十年后做对了（每个组件独立包 + CSS 变量主题）。**做组件库时，依赖注入的边界要一开始就划清**。

## 四、DESIGN.md：给 agent 读的设计系统文档

`awesome-design-md` 收了 84 份真实站点的 DESIGN.md（Google Stitch 提出的格式）。结构：

```markdown
---
version: alpha
name: <站点>-design-analysis
description: "<一段话说清气质、主色、字体策略>"

colors:        # 语义命名，不是 primary-500 这种编号
  primary / on-primary / ink / ink-muted / canvas / surface-1 / hairline / semantic-success …
typography:    # 角色命名，带完整四项
  display-xl: { fontFamily, fontSize, fontWeight, lineHeight, letterSpacing }
rounded:       # xs..xxl / pill / full
spacing:       # xxs..xxl / section
components:    # 用 {colors.x} 引用令牌，不写死值
  button-primary: { backgroundColor: "{colors.primary}", rounded: "{rounded.md}", … }
---

## Overview / Colors / Typography / Layout / Elevation & Depth / Shapes / Components …
```

**为什么值得吸收**：它把「设计系统」从一堆 CSS 变量变成**一份 agent 能直接读的契约**。
和本 skill 的 `SKILL.md + references/` 不冲突——后者是「怎么做界面」的知识，
DESIGN.md 是「这个项目长什么样」的事实。两者配合，别的 agent 接手时不用反推 CSS。

**已经落地**：`scaffold.mjs` 现在每次生成都会产出 `DESIGN.md`，令牌全部从 `tokens` 对象派生，
改人格就跟着变。`selfcheck` 有专门一门「设计文档」校验：

- frontmatter 五个段必须在且非空；
- 所有 `{colors.x}` / `{typography.y}` / `{rounded.z}` 引用必须能解析到实际键；
- 不许出现 `[object Object]`（派生失败时最常见的症状）；
- 正文必须写明「以 tokens.css 为准」和「Accessibility floors」，否则它只是风格描述不是契约。

**没取的部分**：84 份里各站的具体色板与字体。抄别人品牌色出来的是仿站，不是设计系统。

## 五、Android 类目反推 Web 组件分类

`awesome-android-ui` 的 17 个类目：Jetpack Compose / Layout / Button / List·Grid / ViewPager /
Label·Form / Image / SeekBar / Progress / Menu / ActionBar / Dialog / Calendar / Graph /
Animation / Parallax / Effect。

用它来查自己的分类漏项，得到两条结论：

1. **`Graph`（图表）在 Web 骨架里是空的**——不是遗漏，是有意的：图表需要数据与库，静态骨架给不了；
   但**空态里应该给「图表占位」的样子**，现在只给了列表空态。
2. **`Parallax` / `Effect` 属于视觉方向，不属于组件**——骨架不提供，符合「反模板清单」的立场。

Web 端特有的、Android 没有对应物的类目：**表单校验态**、**骨架屏**、**焦点管理**（键盘导航）、
**响应式断点**。这四类骨架都有，说明分类没有偏。

## 六、明确不做的

- 不引入任何组件库运行时（Zarm / GMU 都是参考，不是依赖）；
- 不做自绘键盘、日历、级联选择器——原生控件 + 样式就够，重造只会更差；
- 不做轮播自动播放（无障碍争议大，需要暂停按钮与 `prefers-reduced-motion` 联动，按项目补）；
- 不把 84 份 DESIGN.md 的色板搬进参考库（那是品牌资产，不是设计规律）。

## 七、下一版要补的两个缺项

| 缺项 | 为什么算缺 | 补的时候注意 |
| --- | --- | --- |
| `swipe-action`（列表项左滑出操作） | 移动端列表的刚需，Zarm / Android 都有，骨架没有 | `touch-action: none` 只加在可滑区域；必须给键盘等价操作（不能只有手势） |
| `pull`（下拉刷新） | 同上，且手感有明确三段式 | 阈值要可配；`prefers-reduced-motion` 下取消回弹动画 |
