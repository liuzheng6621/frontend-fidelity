# CSS 配方

可直接复制的起步片段。**先读一遍再改**：这些值不是唯一答案，但成套、有理由。
改之前把项目里已有的令牌找出来——如果项目已经有设计令牌，就扩它，不要另起一套。

## 1. 设计令牌

```css
:root {
  /* 色板：背景三层 + 文字四层 + 品牌 + 语义 */
  --bg-page: #ffffff;
  --bg-surface: #f8f8f7;
  --bg-raised: #f1f1ef;
  --border: #e4e4e1;
  --border-strong: #cfcfca;

  --text-primary: #191a17;
  --text-secondary: #5c5f58;
  --text-muted: #8a8d84;
  --text-disabled: #b4b6ae;

  --brand: #1f6feb;
  --brand-hover: #1a5fd0;
  --brand-fg: #ffffff;
  --brand-soft: #e8f0fe;

  --success: #1a7f4b;
  --warning: #a86b00;
  --danger: #c0392b;
  --info: #1f6feb;

  /* 字阶：字号 + 行高成对出现 */
  --fs-xs: 12px;   --lh-xs: 1.6;
  --fs-sm: 13px;   --lh-sm: 1.6;
  --fs-base: 14px; --lh-base: 1.7;   /* 中文正文行高 ≥1.6 */
  --fs-md: 16px;   --lh-md: 1.65;
  --fs-lg: 20px;   --lh-lg: 1.4;
  --fs-xl: 24px;   --lh-xl: 1.35;
  --fs-2xl: 32px;  --lh-2xl: 1.25;

  /* 间距：4 的倍数 */
  --sp-1: 4px;  --sp-2: 8px;  --sp-3: 12px; --sp-4: 16px;
  --sp-5: 24px; --sp-6: 32px; --sp-7: 48px; --sp-8: 64px;

  /* 圆角成一套 */
  --r-sm: 4px; --r-md: 8px; --r-lg: 10px; --r-xl: 12px; --r-full: 999px;

  /* 阴影只给浮起元素 */
  --shadow-sm: 0 1px 2px rgba(16, 16, 14, .06);
  --shadow-md: 0 4px 12px rgba(16, 16, 14, .08);
  --shadow-lg: 0 12px 32px rgba(16, 16, 14, .16);

  --font-sans: -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC",
    "Hiragino Sans GB", "Microsoft YaHei", "Noto Sans SC", sans-serif;
  --font-num: ui-monospace, "SF Mono", "JetBrains Mono", Consolas, monospace;

  --dur: 160ms;
  --ease: cubic-bezier(.2, .8, .2, 1);
}

body {
  background: var(--bg-page);
  color: var(--text-primary);
  font-family: var(--font-sans);
  font-size: var(--fs-base);
  line-height: var(--lh-base);
  -webkit-font-smoothing: antialiased;
  text-rendering: optimizeLegibility;
}

/* 数字必须等宽，否则表格列不上 */
.num,
td.num,
.amount,
.stat-value {
  font-variant-numeric: tabular-nums;
  font-feature-settings: "tnum" 1;
}
```

## 2. 深色主题

```css
.dark,
[data-theme="dark"] {
  --bg-page: #141413;
  --bg-surface: #1c1c1a;
  --bg-raised: #242422;
  --border: #2e2e2b;
  --border-strong: #3d3d39;

  --text-primary: #ececea;   /* 不用纯白，减少刺眼 */
  --text-secondary: #b4b6ae;
  --text-muted: #85877f;
  --text-disabled: #5a5c56;

  --brand: #4a8ff5;          /* 深色下提亮，直接用浅色版会发暗 */
  --brand-hover: #6ba1f7;
  --brand-soft: #16283f;

  --shadow-sm: 0 1px 2px rgba(0, 0, 0, .5);
  --shadow-md: 0 4px 12px rgba(0, 0, 0, .55);
  --shadow-lg: 0 12px 32px rgba(0, 0, 0, .65);
}
```

首帧防闪白（放在 `<head>` 最前，不要等 JS 异步读）：

```html
<script>
  try {
    var t = localStorage.getItem('theme');
    if (t === 'dark' || (!t && matchMedia('(prefers-color-scheme: dark)').matches))
      document.documentElement.classList.add('dark');
  } catch (e) {}
</script>
```

## 3. 焦点态与减少动效

```css
:focus-visible {
  outline: 2px solid var(--brand);
  outline-offset: 2px;
  border-radius: inherit;
}
/* 鼠标点击不要出现轮廓，键盘操作必须有 */
:focus:not(:focus-visible) { outline: none; }

@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: .01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: .01ms !important;
    scroll-behavior: auto !important;
  }
}

/* 触屏 hover 会粘住 */
@media (hover: hover) {
  .btn:hover { background: var(--brand-hover); }
}
```

## 4. 数据表格

```css
.table-wrap {
  overflow-x: auto;                 /* 表格自己滚，别让整页溢出 */
  border: 1px solid var(--border);
  border-radius: var(--r-xl);
  background: var(--bg-page);
}
table { width: 100%; border-collapse: collapse; font-size: var(--fs-sm); }
thead th {
  position: sticky; top: 0; z-index: 1;
  background: var(--bg-surface);
  text-align: left;
  font-weight: 500;
  color: var(--text-secondary);
  padding: var(--sp-3) var(--sp-4);
  border-bottom: 1px solid var(--border);
  white-space: nowrap;
}
tbody td {
  padding: var(--sp-3) var(--sp-4);
  border-bottom: 1px solid var(--border);
  min-width: 96px;                  /* 保底宽度，不许挤压换行 */
}
tbody tr:last-child td { border-bottom: 0; }
tbody tr:hover { background: var(--bg-surface); }
td.num { text-align: right; font-variant-numeric: tabular-nums; }
/* 操作列固定 */
td.actions, th.actions {
  position: sticky; right: 0;
  background: inherit;
  border-left: 1px solid var(--border);
  white-space: nowrap;
}
```

窄屏改成卡片：

```css
@media (max-width: 640px) {
  table, thead, tbody, tr, td { display: block; }
  thead { display: none; }
  tr { border: 1px solid var(--border); border-radius: var(--r-xl); margin-bottom: var(--sp-3); padding: var(--sp-2); }
  td { border: 0; padding: var(--sp-2); display: flex; justify-content: space-between; gap: var(--sp-3); }
  td::before { content: attr(data-label); color: var(--text-muted); flex: 0 0 40%; }
}
```

## 5. 骨架屏（保持最终布局，避免 CLS）

```css
.skeleton {
  background: linear-gradient(90deg, var(--bg-raised) 25%, var(--bg-surface) 37%, var(--bg-raised) 63%);
  background-size: 400% 100%;
  animation: shimmer 1.4s ease infinite;
  border-radius: var(--r-md);
}
@keyframes shimmer { from { background-position: 100% 0 } to { background-position: 0 0 } }
@media (prefers-reduced-motion: reduce) { .skeleton { animation: none; } }
```

```html
<div class="row" aria-busy="true">
  <div class="skeleton" style="width:120px;height:16px"></div>
  <div class="skeleton" style="width:64px;height:16px"></div>
</div>
```

## 6. 空 / 错 / 无权限

```html
<div class="empty">
  <svg width="56" height="56" aria-hidden="true"><!-- 单线条图标 --></svg>
  <p class="empty__title">还没有订单</p>
  <p class="empty__desc">新建第一张订单后，列表会显示在这里。</p>
  <button class="btn btn--primary">新建订单</button>
</div>
```

```css
.empty {
  display: grid; justify-items: center; gap: var(--sp-3);
  padding: var(--sp-7) var(--sp-4);
  text-align: center; color: var(--text-secondary);
}
.empty__title { font-size: var(--fs-md); color: var(--text-primary); font-weight: 500; }
.empty__desc { font-size: var(--fs-sm); color: var(--text-muted); max-width: 32ch; }
```

三态文案要点：空态给行动、错态给原因和重试、无权限态说明找谁开权限。不要三态共用一句话。

## 7. 按钮三档

```css
.btn {
  display: inline-flex; align-items: center; justify-content: center; gap: var(--sp-2);
  height: 36px; padding: 0 var(--sp-4);
  border-radius: var(--r-md); border: 1px solid transparent;
  font: inherit; font-size: var(--fs-sm); font-weight: 500;
  cursor: pointer; transition: background var(--dur) var(--ease), border-color var(--dur) var(--ease);
}
.btn:disabled { opacity: .45; cursor: not-allowed; }

.btn--primary { background: var(--brand); color: var(--brand-fg); }
.btn--secondary { background: var(--bg-page); border-color: var(--border-strong); color: var(--text-primary); }
.btn--ghost { background: transparent; color: var(--text-secondary); }
.btn--danger { background: var(--danger); color: #fff; }

.btn--lg { height: 44px; padding: 0 var(--sp-5); font-size: var(--fs-base); }
.btn--icon { width: 36px; padding: 0; }
/* 移动端点击区 */
@media (max-width: 640px) { .btn { min-height: 44px; } .btn--icon { width: 44px; } }
```

## 8. 容器查询（优先于媒体查询）

```css
.card-wrap { container-type: inline-size; }
@container (min-width: 480px) {
  .card { grid-template-columns: 48px 1fr auto; }
}
```

组件按自己拿到的宽度适配，塞进侧栏或弹窗里都不会崩。

## 9. 图片占位（CLS 归零）

```css
.thumb { aspect-ratio: 4 / 3; width: 100%; background: var(--bg-raised); border-radius: var(--r-md); overflow: hidden; }
.thumb img { width: 100%; height: 100%; object-fit: cover; display: block; }
```

```html
<img src="a.webp" width="640" height="480" loading="lazy" decoding="async" alt="订单照片">
```

## 10. 移动端安全区

```css
.app-footer {
  padding-bottom: calc(var(--sp-4) + env(safe-area-inset-bottom));
}
.page { min-height: 100dvh; }   /* 不用 100vh，移动浏览器地址栏会跳 */
```

## 11. 检查自己有没有写歪

```bash
# 间距/字号是否出现了非体系值（8 / 13 / 21 这类）
grep -nE '(padding|margin|gap|font-size):\s*(13|21|17|15|22|26)px' -r src/
# 是否有人把焦点禁用掉了
grep -rn 'outline:\s*none' src/
# 硬编码颜色（应该走变量）
grep -rnE '#[0-9a-fA-F]{3,8}\b' src/ --include=*.vue --include=*.css | grep -v ':root'
```
## 12. 塑料按钮 + 发丝圈（Wegic 风味，实测蒸馏）

出处：`references/wegic-design.md`。这套的要点是**用内阴影做厚度，用发丝圈代替 border**，
不靠渐变、不靠大投影。适合「产品站 + 后台」同一品牌的双端项目；后台只留按钮与发丝圈，别留 hero。

### 令牌（可直接替换第 1 节里同名的项）

```css
:root {
  /* 暖白三件套：页面比卡片更「白」，卡片比底更暖 */
  --bg-page: #f7f6f5;
  --bg-section: #fbfbfb;
  --bg-card: #f7f6f5;
  --bg-dark: #000;

  /* 文字：一个色相 + 十档 alpha（深色段落把 ink 换成 white 即可） */
  --ink: #000;
  --ink-70: rgba(0, 0, 0, .70);
  --ink-50: rgba(0, 0, 0, .50);
  --ink-30: rgba(0, 0, 0, .30);
  --ink-16: rgba(0, 0, 0, .16);
  --ink-8:  rgba(0, 0, 0, .08);
  --ink-6:  rgba(0, 0, 0, .06);
  --ink-4:  rgba(0, 0, 0, .04);
  --on-dark-70: rgba(255, 255, 255, .70);
  --on-dark-50: rgba(255, 255, 255, .50);

  /* 圆角：每一档有明确归属，多一档就别加 */
  --r-control: 12px;   /* 按钮、输入框、卡片 */
  --r-card: 12px;
  --r-dark-card: 20px; /* 深色叙事卡 */
  --r-chip: 9999px;    /* 标签、促销角标 */
  --r-media: 58px;     /* 大媒体框 */

  /* 发丝圈：0 偏移 + 1px 扩散，比 border 均匀、不占盒模型 */
  --hairline: 0 0 0 1px var(--ink-6);
  --hairline-strong: 0 0 0 1px var(--ink-8);

  /* 卡片三层：一点落影 + 内发丝高光 + 外发丝环 */
  --card-shadow:
    0 1px 4px var(--ink-6),
    inset 0 0 0 1px rgba(255, 255, 255, .5),
    0 0 0 1px var(--ink-4);
  --card-shadow-dark:
    0 1px 4px var(--ink-6),
    inset 0 0 0 1px rgba(255, 255, 255, .12),
    0 0 0 1px var(--ink-4);

  --ease-out: cubic-bezier(.33, 1, .68, 1);  /* 收尾很慢，适合入场 */
}
```

### 按钮：侧壁厚度 4 → 2 → 0

```css
.btn-plastic {
  display: inline-flex; align-items: center; justify-content: center;
  height: 48px; padding: 0 24px;
  border: 0; border-radius: var(--r-control);
  background: #fff; color: var(--ink);
  font: 700 13px/1.5 var(--font-sans);
  cursor: pointer;
  /* 外发丝环 + 落影 + 顶面高光 + 内鼓包 + 底侧壁 */
  box-shadow:
    0 0 0 1px var(--ink-6),
    0 1px 1px var(--ink-4),
    inset 0 1px 0 #fff,
    inset 0 -1px 1px rgba(255, 255, 255, .2),
    inset 0 1px 4px 1px rgba(255, 255, 255, .2),
    inset 0 -4px 1px 1px var(--ink-6);
  transition: box-shadow .1s linear, transform .1s linear;
}
/* 悬停：侧壁变薄 2px（视觉上按钮「抬起一点」） */
.btn-plastic:hover {
  box-shadow:
    0 0 0 1px var(--ink-6),
    0 1px 2px rgba(0, 0, 0, .12),
    inset 0 1px 0 #fff,
    inset 0 -1px 1px rgba(255, 255, 255, .2),
    inset 0 1px 4px 1px rgba(255, 255, 255, .2),
    inset 0 -2px 1px 1px var(--ink-6);
}
/* 按下：侧壁归零，真的「陷进去」 */
.btn-plastic:active {
  box-shadow:
    0 0 0 1px var(--ink-6),
    0 1px 1px rgba(0, 0, 0, .12),
    inset 0 0 0 var(--ink-6);
  transform: translateY(1px);
}
.btn-plastic:disabled {
  box-shadow: 0 0 0 1px var(--ink-4);
  opacity: .5; cursor: not-allowed;
}
/* 焦点必须自己补：Wegic 原站这里是没有焦点的，属于缺口 */
.btn-plastic:focus-visible { outline: 2px solid var(--ink); outline-offset: 2px; }

/* 小号版：侧壁 3 → 1 → 0 */
.btn-plastic--sm { height: 36px; padding: 0 16px; }
.btn-plastic--sm:disabled { box-shadow: 0 0 0 1px var(--ink-4); }
```

### 深色段落里的卡（不用阴影，用 2px 实边）

```css
.card-dark {
  background: #0e0e0e;
  border: 2px solid #232323;   /* 纯黑底上 1px 太细，2px 实边比阴影清楚 */
  border-radius: var(--r-dark-card);
  box-shadow: none;
  color: #fff;
}
.card-dark__title { font-size: 34px; line-height: 1; font-weight: 600; }
.card-dark p { color: var(--on-dark-70); font-size: 15px; line-height: 1.6; }
```

### 暖白输入框（深色段落里的唯一亮块）

```css
.prompt-box {
  width: min(720px, 100%);
  background: var(--bg-page);      /* 暖白，不是 #fff */
  border-radius: var(--r-control);
  padding: 12px;
  box-shadow: none;                /* 黑底上不需要投影 */
}
.prompt-box textarea {
  width: 100%; min-height: 54px; resize: none;
  border: 0; outline: 0; background: transparent;
  padding: 4px 64px 4px 4px;       /* 右侧留给发送键 */
  font: 400 15px/1.6 var(--font-sans); color: var(--ink);
}
.prompt-box textarea::placeholder { color: var(--ink-30); }
.prompt-box:focus-within { box-shadow: 0 0 0 2px var(--ink-16); }  /* 原站缺这个 */
```

### 大标题（≥40px）可以微放字距

```css
h2.display {
  font-size: 48px; line-height: 1.4; font-weight: 700;
  letter-spacing: .015em;          /* 中文大标题 +0.01~0.02em 微放，不是收紧 */
}
/* 正文与表格永远不加 */
p, td, th, li { letter-spacing: normal; }
```

### 逐字入场（只在首屏，必须有静态回退）

```html
<h1 class="reveal" aria-label="创建网站 助力业务增长">
  <span style="--i:0" aria-hidden="true">创</span><span style="--i:1" aria-hidden="true">建</span><!--…-->
</h1>
```

```css
.reveal span {
  display: inline-block;
  opacity: 0;
  transform: scale(.72);
  transition: opacity .5s var(--ease-out), transform .5s var(--ease-out);
  transition-delay: calc(var(--i) * 40ms);
}
.reveal.is-in span { opacity: 1; transform: none; }

/* 关键：以下三种情况必须直接静态显示 */
@media (prefers-reduced-motion: reduce) {
  .reveal span { opacity: 1; transform: none; transition: none; }
}
@media (max-width: 640px) {
  .reveal span { opacity: 1; transform: none; transition: none; }
}
.reveal:not(.is-in) span { /* 有 JS 才启用，无 JS 时由上面的规则兜底 */ }
```

无 JS 时也要能看：把初始态写在 `.js .reveal span` 下面，或者在 `<html>` 上加 `class="js"` 由脚本添加。

### 上下留白不对称（收尾区块）

```css
.cta-band {
  padding: 40px 0 156px;   /* 上 40 / 下 156：把视线交还给下一段，比上下各 80 不呆板 */
  background: var(--bg-dark);
  color: #fff;
}
```
## 13. 浅灰蓝底板 + 一叠彩纸卡（即时设计 js.design 风味，实测蒸馏）

三个值撑起来的观感：底 `#f3f7fb`（冷到发蓝的白）、卡 `#fff` 圆角 22、阴影负扩散。
品牌蓝 `#009dff` **全站只当一种实色用**（按钮 / 链接 / 自己那一列对比卡），渐变整页只出现一次。

```css
:root {
  --js-ink: #000;
  --js-ink-2: rgb(98 100 106);        /* 次文字，别用 #666 */
  --js-ink-on-tint: rgb(36 48 66 / .86);
  --js-paper: #fff;
  --js-paper-cool: #f3f7fb;           /* 冷灰蓝底，整页一半是它 */
  --js-brand: #009dff;
  --js-brand-deep: #243042;           /* 深色 CTA / 深卡 */
  --js-mint: #83dde2;
  --js-lilac: #c0a3ff;
  --js-coral: #f8857e;
  --js-hairline: rgb(52 59 69 / .14);

  --js-r-block: 22px;                 /* 区块级大卡（原站 22.2857，取整） */
  --js-r-media: 15px;                 /* 浮动截图 / 输入容器 */
  --js-r-btn: 8px;

  /* 卡片三件套：负扩散 + 落影 + 发丝环，替代 border */
  --js-shadow-card:
    0 16px 16px -16px rgb(23 25 29 / .2),
    0 14px 20px 0 rgb(23 25 29 / .03),
    0 0 0 1px rgb(23 25 29 / .04);

  /* 戏剧性浮空：只给设备/截图卡 */
  --js-shadow-float:
    0 50px 100px -20px rgb(50 50 93 / .25),
    0 30px 60px -30px rgb(0 0 0 / .68);
}
```

### 彩虹网格渐变（整页只许一处）

原站是八色 stop 的 `-45deg` 线性渐变，本质是「廉价网格渐变」——
真网格渐变要 SVG/多层 radial，这里用一条线就够了，因为它只铺 hero。

```css
.hero-mesh {
  background: linear-gradient(-45deg,
    #fff566, #a8ffca, #ffad61, #ff857a,
    #fff, #ff5cc9, #6279ea, #66ffe6);
  border-radius: var(--js-r-block);
  /* 文字压在中间时必须保证对比度：中间加一层白雾 */
  position: relative;
}
.hero-mesh::before {
  content: "";
  position: absolute;
  inset: 0;
  background: radial-gradient(60% 55% at 50% 42%, rgb(255 255 255 / .72), transparent 70%);
  pointer-events: none;
}
.hero-mesh > * { position: relative; }
```

> 别把它用在卡片上。八色线性渐变铺小面积会显脏；原站也只铺了 hero 一次。

### 分屏功能卡（左文右彩）

```css
.split-card {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1.15fr);
  background: var(--js-paper);
  border-radius: var(--js-r-block);
  box-shadow: var(--js-shadow-card);
  overflow: hidden;
}
.split-card__text { padding: 56px 48px; }
.split-card__title { font-size: 30px; font-weight: 700; line-height: 1.27; }  /* 原站 30.797/39 */
.split-card__art {
  padding: 40px;
  background: linear-gradient(135deg, #cfeefe, #e6f7ff);
  display: grid; place-items: center;
}
@media (max-width: 900px) {
  .split-card { grid-template-columns: 1fr; }
  .split-card__art { order: -1; }   /* 移动端图先出现，文字在后 */
}
```

### 输入 + 按钮同容器（比两个独立控件强）

```css
.pill-form {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px;
  background: #fff;
  border-radius: var(--js-r-media);
  box-shadow: var(--js-shadow-card);
}
.pill-form__input {
  flex: 1 1 auto;
  min-width: 0;
  height: 42px;
  padding: 0 14px;
  border: 0;
  background: transparent;
  font-size: 15px;
}
.pill-form__input:focus { outline: none; }
.pill-form:focus-within {            /* 焦点环画在外框上，不画在 input 上 */
  box-shadow: var(--js-shadow-card), 0 0 0 3px rgb(0 157 255 / .35);
}
.pill-form__submit {
  flex: 0 0 auto;
  height: 42px;
  padding: 0 18px;
  border: 0;
  border-radius: 8px;                /* 内钮圆角要比外框小，别同值 */
  background: var(--js-brand);
  color: #fff;
  font-size: 15px;
  font-weight: 500;
}
```

### 阶段 pill（颜色承载信息）

```css
.stage-pill {
  display: inline-flex;
  align-items: center;
  height: 34px;
  padding: 0 14px;
  border-radius: 999px;
  font-size: 15px;
  color: var(--js-ink-on-tint);
}
.stage-pill[data-stage="1"] { background: var(--js-mint); }
.stage-pill[data-stage="2"] { background: var(--js-lilac); }
.stage-pill[data-stage="3"] { background: var(--js-coral); }
```

三色只在三列流程里用；出现第四种颜色就该换编码方式（不是加色）。

### 竞品对比列

```css
.compare {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 24px;
}
.compare__col {
  padding: 32px 28px;
  border-radius: var(--js-r-block);
  background: var(--js-paper-cool);
}
.compare__col--self {
  background: var(--js-brand);
  color: #fff;
}
.compare__row {
  display: flex; align-items: center; justify-content: space-between;
  height: 58px;
  border-top: 1px solid rgb(0 0 0 / .06);
  font-size: 15px;
}
.compare__col--self .compare__row { border-top-color: rgb(255 255 255 / .24); }
@media (max-width: 900px) {
  .compare { grid-template-columns: 1fr; }   /* 窄屏不做横向滚动对比表 */
}
```

### 毛玻璃头部（无边框无阴影）

```css
.site-head {
  position: fixed; inset: 0 0 auto;
  height: 88px;
  background: rgb(255 255 255 / .94);
  backdrop-filter: saturate(2.5) blur(14px);
  /* 不加 border-bottom、不加 box-shadow：滚动时内容在玻璃下穿过就是分层 */
}
```

> 有顶部促销条时，头部 `top` 要跟着促销条高度走（原站是 `top: 40px`），
> 并且促销条可关——关掉后头部必须能回到 `top: 0`，别写死。

### 三段自查

- 整页渐变是否只剩一处？
- 卡片阴影是否「负扩散 + 发丝环」三件套，而不是通用 `0 4px 12px rgba(0,0,0,.1)`？
- 所有字号是否整数、圆角是否成阶梯？（原站这两条没过，见 `jsdesign-design.md` 第六节）
---

## 14. 零 gutter 图墙（UI 世界 uishijie 风味，实测蒸馏）

内容/资源列表专用：25 张缩略图一屏、卡片不画壳、间距来自卡片内边距。
**不要用在后台表格或表单区**（那里需要 24px gutter 与明确的卡片边界）。

```css
/* ---------- 令牌 ---------- */
:root{
  --tw-col: 300px;            /* 列宽（原站写死，这里给可覆写） */
  --tw-pad: 12px;             /* 卡片内边距 = 视觉间距的一半 */
  --tw-ratio: 1.45;           /* 缩略图统一比例，内容图 1.45 / 手机 0.46 / 网页全屏 1.6 */
  --tw-title: 14px;   --tw-title-lh: 30px;
  --tw-meta: 12px;    --tw-meta-lh: 24px;
  --tw-ink-title: #333;
  --tw-ink-meta: #6b6b6b;     /* 原站用 #7f7f7f = 3.9:1，不合格；这个是 4.9:1 */
  --tw-stat: #ff3300;
  --tw-stat-hover: #f13608;
  --tw-brand: #0d6efd;
}

/* ---------- 图墙：gap 为 0，间距全靠卡片 padding ---------- */
.thumb-grid{
  list-style: none; margin: 0; padding: 0;
  display: grid;
  grid-template-columns: repeat(5, var(--tw-col));   /* 固定列宽 = 原站做法 */
  /* 想要响应式就换成下面这行，并把列宽下限调到 220px：
     grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); */
  justify-content: center;                            /* 别学原站不居中导致横向溢出 */
}

/* ---------- 卡片：不画壳 ---------- */
.thumb{
  padding: var(--tw-pad) var(--tw-pad) 0;
  background: none; border: 0; box-shadow: none;      /* 壳体一律不要 */
  display: block; color: inherit; text-decoration: none;
}
.thumb__media{
  display: block; width: 100%; aspect-ratio: var(--tw-ratio);
  overflow: hidden; background: #f2f2f2;              /* 加载前占位，防跳动 */
}
.thumb__media img{
  width: 100%; height: 100%; object-fit: cover;       /* 设计稿预览类改 contain */
  display: block; transition: transform .18s ease;
}
.thumb:hover .thumb__media img{ transform: scale(1.02); }   /* 原站漏掉的反馈 */
.thumb:focus-visible{ outline: 2px solid var(--tw-brand); outline-offset: 2px; }

.thumb__title{
  margin: 0; font-size: var(--tw-title); font-weight: 700; line-height: var(--tw-title-lh);
  color: var(--tw-ink-title);
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;   /* 只给一行 */
}
.thumb__meta{
  margin: 0; font-size: var(--tw-meta); line-height: var(--tw-meta-lh);
  color: var(--tw-ink-meta);
}
.thumb__meta a{ color: var(--tw-brand); text-decoration: none; }
.thumb__stat{ color: var(--tw-stat); font-variant-numeric: tabular-nums; }
.thumb:hover .thumb__stat{ color: var(--tw-stat-hover); }

/* ---------- 分类条：纯文字 tab，选中只换色 ---------- */
.filter-row{
  display: flex; align-items: center; gap: 0;
  border-bottom: 1px solid #e5e5e5;
}
.filter-row a{
  padding: 20px; font-size: 16px; font-weight: 500; color: #5a5a5a;
  text-decoration: none;
}
.filter-row a[aria-current="page"]{ color: var(--tw-brand); }
.filter-row__count{ margin-left: auto; font-size: 14px; color: #6b6b6b; }

/* ---------- 分页：可见页数 + 总数 ---------- */
.pager{ display: flex; gap: 4px; justify-content: center; list-style: none; padding: 24px 0; }
.pager a, .pager span{
  min-width: 34px; height: 34px; padding: 0 10px;
  display: inline-flex; align-items: center; justify-content: center;
  border: 1px solid #e5e5e5; border-radius: 5px; font-size: 14px;
  color: #333; text-decoration: none; font-variant-numeric: tabular-nums;
}
.pager [aria-current="page"]{ background: var(--tw-brand); border-color: var(--tw-brand); color: #fff; }
.pager .is-disabled{ color: #b0b0b0; pointer-events: none; }
.pager__gap{ border: 0; }

/* ---------- ≤640px 强制重排（原站最大的缺陷） ---------- */
@media (max-width: 640px){
  .thumb-grid{ grid-template-columns: repeat(2, minmax(0,1fr)); }
  .thumb__title{ font-size: 13px; line-height: 20px; white-space: normal; }
  .filter-row{ overflow-x: auto; scrollbar-width: none; }
  .filter-row a{ padding: 14px 12px; font-size: 14px; white-space: nowrap; }
  .filter-row__count{ display: none; }
}
@media (max-width: 1080px){
  .thumb-grid{ grid-template-columns: repeat(3, minmax(0,1fr)); }
}
```

### 用法要点

- **`aspect-ratio` 是这套的命门**：不给比例、靠 `height: auto`，用户上传的长图会把整行撑歪。
- **网格 `gap: 0`**：视觉间距 = 卡片 `padding`，这样「间距」跟着卡片走，改一处就统一。
- **列表页的卡片不画壳**，但**同一产品的功能区要有壳**——两套密度的边界用一条分隔线或底色差交代，
  别在同一个视觉区里混着用（见 `uishijie-design.md` 第七节的混合口径）。
- 分页只在 `>1 页` 时渲染，并给出总条数（「共 11424 个作品」这类规模感不要虚标）。
---

## 15. 报头 + 等宽图版（站酷 ZCOOL 风味）

来自 `zcool-design.md` 的实测：4 列 283px、列距 24、行距 36、缩略图强制 4:3、卡片不画壳、
两级分类用**形状**区分（56px 文字 tab / 31px 胶囊）、橙色只给主行动。
站酷自己踩的坑（移动端不重排、顶栏不 fixed、hover 太弱、`#888` 只到 3.54:1）已经在下面补齐。

```css
/* 令牌：颜色与几何 */
:root {
  --zc-ink:        #282828;   /* 主文字 */
  --zc-ink-2:      #555555;   /* 次 */
  --zc-ink-3:      #6b6b6b;   /* 弱：站酷原值 #888 只有 3.54:1，这里提到 4.9:1 */
  --zc-line:       #ededed;   /* 分隔线（站酷用 0.8px，高 DPI 不稳，这里统一 1px） */
  --zc-fill:       #f2f2f2;   /* 未选中胶囊底 */
  --zc-active:     #222222;   /* 选中胶囊 / 直角分页选中 */
  --zc-accent:     #ff5e3b;   /* 品牌橙：只给主行动 */
  --zc-r-btn:      10px;      /* 顶栏按钮 */
  --zc-r-pill:     16px;      /* 胶囊（不是 999px，四角要有一点硬度） */
  --zc-col:        283px;     /* 参考列宽，实际用 1fr */
  --zc-gap-x:      24px;
  --zc-gap-y:      36px;
  --zc-topbar:     56px;
}

/* 顶栏：白底、无阴影、无下边框；长列表里必须 sticky（站酷没做，这是要补的一条） */
.site-topbar {
  position: sticky; top: 0; z-index: 20;
  height: var(--zc-topbar);
  display: flex; align-items: center; gap: 24px;
  padding: 0 30px;
  background: #fff;
}
.site-topbar__nav { display: flex; gap: 20px; font-size: 14px; color: var(--zc-ink); }
.site-topbar__nav a { color: inherit; text-decoration: none; }
.site-topbar__spacer { margin-inline-start: auto; }

/* 一个品牌色按钮 + 一个同尺寸幽灵按钮（站酷：注册 76×36 #FF5E3B r10 14/500，登录同尺寸透明） */
.btn-brand {
  height: 36px; padding: 2px 12px; min-width: 76px;
  border: 0; border-radius: var(--zc-r-btn);
  background: var(--zc-accent); color: #fff;
  font: 500 14px/1 var(--font-sans, system-ui); cursor: pointer;
}
.btn-ghost {
  height: 36px; padding: 2px 12px; min-width: 76px;
  border: 0; border-radius: var(--zc-r-btn);
  background: transparent; color: #191919; font: 400 14px/1 inherit; cursor: pointer;
}
.btn-brand:hover { filter: brightness(1.06); }
.btn-brand:active { transform: translateY(1px); }

/* 一级分类：文字 tab，56px 高，选中是 3px 短下划线 —— 形状与二级胶囊明确不同 */
.cat-tabs {
  display: flex; align-items: center; gap: 0;
  height: var(--zc-topbar);
  border-block-end: 1px solid var(--zc-line);
  overflow-x: auto; scrollbar-width: none;
}
.cat-tabs::-webkit-scrollbar { display: none; }
.cat-tabs a {
  position: relative; flex: 0 0 auto;
  display: grid; place-items: center;
  height: 100%; padding: 0 24px;
  font-size: 16px; color: var(--zc-ink); text-decoration: none;
}
.cat-tabs a[aria-current='page'] { color: var(--zc-active); font-weight: 500; }
.cat-tabs a[aria-current='page']::after {
  content: ''; position: absolute; inset-block-end: 8px;
  width: 28px; height: 3px; border-radius: 2px;
  background: var(--zc-active);
}

/* 二级分类：胶囊 31px 高，圆角 16，选中深底白字 */
.cat-pills {
  display: flex; flex-wrap: wrap; gap: 8px;
  padding: 20px 20px 0;
}
.cat-pills a {
  height: 31px; padding: 6px 16px;
  display: inline-grid; place-items: center;
  border-radius: var(--zc-r-pill);
  background: var(--zc-fill); color: var(--zc-active);
  font-size: 14px; text-decoration: none; white-space: nowrap;
}
.cat-pills a[aria-current='page'] { background: var(--zc-active); color: #fff; }

/* 图墙：等宽 4 列（不做瀑布），列距 24 / 行距 36 */
.feed-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  column-gap: var(--zc-gap-x);
  row-gap: var(--zc-gap-y);
  padding: 0 30px;
}

/* 卡片：不画壳。图即边界，圆角/背景/阴影/内边距全为 0 */
.feed-card { display: block; text-decoration: none; color: inherit; }
.feed-card__cover {
  position: relative; display: block;
  aspect-ratio: 4 / 3;            /* 关键：强制同比例，墙不会参差 */
  overflow: hidden; border-radius: 0;
}
.feed-card__cover img {
  width: 100%; height: 100%;
  object-fit: cover; display: block;
  transition: transform .35s cubic-bezier(.33, 1, .68, 1), filter .35s;
}
/* hover 要真的给反馈（站酷只加一层浅遮罩，等于没反应） */
.feed-card:hover .feed-card__cover img { transform: scale(1.03); filter: brightness(.94); }

/* 右下角计数：13px 图标 + 12px 数字，压在图上 */
.feed-card__status {
  position: absolute; inset-block-end: 8px; inset-inline-end: 8px;
  display: inline-flex; align-items: center; gap: 2px;
  height: 24px; padding: 0 6px;
  border-radius: 12px;
  background: rgba(0, 0, 0, .45); color: #fff;
  font-size: 12px; backdrop-filter: blur(2px);
}

/* 标题行：14/400、单行截断、与图只隔 8px（图和标题是一件事） */
.feed-card__title {
  display: flex; align-items: baseline; gap: 8px;
  margin: 8px 0 0;
}
.feed-card__title span {
  flex: 1 1 auto; min-width: 0;
  font-size: 14px; font-weight: 400; line-height: 19px;
  color: var(--zc-ink);
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
.feed-card__title b {
  flex: 0 0 auto;
  font-size: 12px; font-weight: 400; color: var(--zc-ink-3);
}

/* 作者行：20px 高，头像 20 圆 —— 高度对齐才像一条细线 */
.feed-card__user {
  display: flex; align-items: center; gap: 6px;
  height: 20px; margin-top: 4px;
  font-size: 14px; color: var(--zc-ink-3);
}
.feed-card__user img { width: 20px; height: 20px; border-radius: 50%; object-fit: cover; }

/* 工具行：左排序 + 右筛选，两簇分居两端（同形状，靠位置区分语义） */
.feed-toolbar {
  display: flex; align-items: center; gap: 8px;
  padding: 12px 30px 16px;
}
.feed-toolbar__right { margin-inline-start: auto; display: flex; gap: 8px; }
.select-mini {
  height: 32px; padding: 0 10px;
  border: 1px solid #e5e5e5; border-radius: 8px;
  background: #fff; color: #333; font-size: 14px;
}

/* 分页：直角 40×38，全站唯一直角 —— 用形状说明「这是导航不是内容」 */
.pager-square {
  display: flex; justify-content: center; gap: 8px;
  padding: 24px 0 56px;
}
.pager-square a {
  display: inline-grid; place-items: center;
  width: 40px; height: 38px;
  border-radius: 0;
  color: var(--zc-ink-2); font-size: 14px; text-decoration: none;
}
.pager-square a[aria-current='page'] { background: var(--zc-active); color: #fff; }
.pager-square a:hover { background: var(--zc-fill); }
.pager-square a[aria-current='page']:hover { background: var(--zc-active); }

/* 响应式：站酷完全没做（390 下 scrollWidth 仍 1200），这里必须两列 + 不横滚 */
@media (max-width: 1080px) {
  .feed-grid { grid-template-columns: repeat(3, minmax(0, 1fr)); padding: 0 20px; }
  .cat-tabs a { padding: 0 16px; font-size: 15px; }
}
@media (max-width: 760px) {
  .feed-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); column-gap: 12px; row-gap: 20px; padding: 0 12px; }
  .feed-toolbar { padding: 8px 12px 12px; flex-wrap: wrap; }
  .cat-pills { padding: 12px 12px 0; }
  .site-topbar { padding: 0 12px; gap: 12px; }
  .site-topbar__nav { display: none; }   /* 移动端把导航收进抽屉，别留一屏文字 */
}
```

**落地注意**：
- 列宽永远用 `1fr`，`283px` 只是「4 列在 1200 容器里」的换算结果；
- 标题必须单行，否则每张卡高度不同、行距就废了；
- 计数与作者名别用 `#888`（3.54:1），用 `#6b6b6b`（4.9:1）；
- 顶栏在长列表要 sticky，站酷没做，这是最容易被用户骂的一处。

## 16. 风格卡：4:3 活预览 + 6px 四段色板条（StyleKit 风味）

适用于**陈列一批彼此不同的东西**（设计风格、模板、主题、字体、配色、组件变体）：预览不截图，让每件东西用真 CSS 渲染成迷你 DOM，底下压一条 6px 四段色板。实测依据见 `references/stylekit-design.md`。

```css
/* ---- 令牌：只要五个色 + 三档圆角 ---- */
:root {
  --sk-bg: #fafafa;          /* 纸色，不用纯白 */
  --sk-ink: #0a0a0a;
  --sk-muted: #6b7280;       /* on #fafafa 4.6:1，再浅就不合格 */
  --sk-line: #e5e5e5;        /* 全站唯一分隔手段：1px */
  --sk-accent: #e63946;      /* 只出现在 hover / 选中 / 极小标记 */

  --sk-r-frame: 0;           /* 陈列区：直角 */
  --sk-r-control: 6px;       /* 控件：排序、下拉 */
  --sk-r-round: 50%;         /* 图标按钮 */

  --sk-font-head: "Playfair Display", "Songti SC", "Source Han Serif SC", serif;
  --sk-font-body: "Albert Sans", system-ui, "PingFang SC", "Microsoft YaHei", sans-serif;
  --sk-font-mono: "Fragment Mono", ui-monospace, SFMono-Regular, monospace;
}
/* 中文标题必须显式落到一个衬线，否则 Windows 上掉成宋体、macOS 上是 Songti SC，两端两个骨架 */

/* ---- 页头：81px + 一条线，不吸顶（图墙页吸顶交给你们项目自己决定） ---- */
.sk-header {
  height: 81px; display: flex; align-items: center; gap: 24px; padding: 0 32px;
  background: var(--sk-bg); border-bottom: 1px solid var(--sk-line);
}
.sk-header__nav { display: flex; gap: 20px; font: 400 14px/1 var(--sk-font-body); color: var(--sk-muted); }

/* ---- 页头块：eyebrow 0.18em → H1 1.0~1.25 行高 → 三格统计 ---- */
.sk-eyebrow {
  font: 400 11px/1.5 var(--sk-font-body);
  letter-spacing: 0.18em; color: var(--sk-muted);
}
.sk-h1 {
  margin: 12px 0 10px;
  font: 500 36px/1.25 var(--sk-font-head);
  letter-spacing: -0.02em; color: var(--sk-ink);
}
.sk-stats { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); }
.sk-stats > div { padding: 10px 12px; text-align: center; border-right: 1px solid var(--sk-line); }
.sk-stats > div:last-child { border-right: 0; }
.sk-stats dt { font: 400 10px/1 var(--sk-font-body); letter-spacing: 0.16em; text-transform: uppercase; color: var(--sk-muted); }
.sk-stats dd { margin: 4px 0 0; font: 500 20px/1 var(--sk-font-body); font-variant-numeric: tabular-nums; }

/* ---- 三层筛选：搜索 → 场景 chips(38) → 类型 chips(32) ---- */
.sk-search {
  width: 448px; height: 40px; padding: 0 12px 0 40px;
  background: var(--sk-bg); border: 1px solid var(--sk-line); border-radius: var(--sk-r-frame);
  font: 400 14px/1 var(--sk-font-body); color: var(--sk-ink);
}
.sk-search::placeholder { color: var(--sk-muted); }
.sk-chips { display: flex; flex-wrap: wrap; gap: 8px; }
.sk-chips a {
  display: inline-flex; align-items: center; height: 38px; padding: 10px 16px;
  border: 1px solid var(--sk-line); border-radius: var(--sk-r-frame);
  font: 400 12px/1 var(--sk-font-body); letter-spacing: 0.025em; color: var(--sk-muted);
}
.sk-chips a[aria-current='true'] { background: var(--sk-ink); border-color: var(--sk-ink); color: var(--sk-bg); }
.sk-chips--type a { height: 32px; padding: 6px 12px; font-size: 14px; }   /* 更细的筛选，控件更小 */

/* ---- 结果行 + 排序（全站唯一 6px 圆角） ---- */
.sk-result-row { display: flex; align-items: center; justify-content: space-between; padding: 16px 0; font-size: 14px; color: var(--sk-muted); }
.sk-sort {
  width: 144px; height: 44px; padding: 0 12px;
  background: var(--sk-bg); border: 1px solid var(--sk-line); border-radius: var(--sk-r-control);
  font: 400 14px/1 var(--sk-font-body); color: var(--sk-ink);
}

/* ---- 图墙：3 列 / gap 32 / 容器 1184 ---- */
.sk-grid {
  display: grid; grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 32px; max-width: 1184px; margin: 0 auto;
}

/* ---- 风格卡：预览 4:3 + 色板 6px + 文本区 180px，三个数字定死 ---- */
.sk-card {
  position: relative; display: flex; flex-direction: column;
  background: #fff; border: 1px solid var(--sk-line); border-radius: var(--sk-r-frame);
  transition: border-color 160ms ease;
}
.sk-card:hover { border-color: var(--sk-ink); }          /* 第一笔 */
.sk-card:hover .sk-card__title { color: var(--sk-accent); } /* 第二笔 */
.sk-card:focus-within { outline: 2px solid var(--sk-ink); outline-offset: 2px; } /* 它自己漏了，必须补 */

.sk-preview {
  position: relative; overflow: hidden; background: var(--sk-bg);
  aspect-ratio: 4 / 3; container-type: inline-size;
}
/* 迷你 DOM 按容器宽度整体缩放：卡片多宽，展品就多大，字永远不糊不裁 */
.sk-preview > .mini {
  position: absolute; inset: 0;
  display: grid; place-content: center; gap: 8px; padding: 16px;
  transform: scale(calc(100cqw / 371));
  transform-origin: center;
}
.sk-card > a.cover { position: absolute; inset: 0; z-index: 10; }   /* 整卡可点 */

/* 色板条：6px，永远四段，语义固定 = 底 / 字 / 强调 / 辅色 */
.sk-palette { display: flex; height: 6px; }
.sk-palette i { flex: 1 1 0; }

.sk-card__body { padding: 20px; height: 180px; display: flex; flex-direction: column; gap: 8px; }
.sk-card__title {
  font: 500 16px/1.5 var(--sk-font-body); color: var(--sk-ink);
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  transition: color 160ms ease;
}
.sk-card__en { font: 400 14px/1.4 var(--sk-font-body); color: var(--sk-muted); }
.sk-card__desc {
  font: 400 14px/1.625 var(--sk-font-body); color: var(--sk-muted);
  display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;
}
.sk-card__tags { display: flex; flex-wrap: wrap; gap: 6px; margin-top: auto; }
.sk-tag { padding: 2px 8px; border: 1px solid var(--sk-line); font: 400 10px/1.6 var(--sk-font-body); color: var(--sk-muted); }
.sk-trait {
  padding: 2px 8px; background: #f4f4f5;
  font: 400 10px/1.6 var(--sk-font-mono); letter-spacing: 0.16em; text-transform: uppercase; color: var(--sk-muted);
}

/* 右上角两个圆钮：默认可见（移动端没有 hover），触控目标提到 32 */
.sk-tools { position: absolute; top: 10px; right: 10px; z-index: 20; display: flex; gap: 6px; }
.sk-tools button {
  width: 32px; height: 32px; display: grid; place-items: center;
  background: rgb(255 255 255 / .85); border: 0; border-radius: var(--sk-r-round); color: var(--sk-muted);
}
.sk-tools button:hover { background: #f4f4f5; color: var(--sk-ink); }

/* ---- 整行箭头链接：一列"下一步去哪"，成本极低 ---- */
.sk-rowlink {
  display: flex; align-items: center; justify-content: space-between;
  padding: 16px 20px; border: 1px solid var(--sk-line);
  font: 400 15px/1.4 var(--sk-font-body); color: var(--sk-ink);
}
.sk-rowlink:hover { border-color: var(--sk-ink); }

/* ---- 移动端：2 列 + gap 12，筛选折成整行按钮 ---- */
@media (max-width: 1024px) {
  .sk-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; padding: 0 12px; }
  .sk-chips { display: none; }            /* 11 个 chips 横排必翻车 */
  .sk-filter-toggle { display: flex; }    /* 用一个整行"筛选"按钮替代 */
  .sk-card__body { height: auto; padding: 12px; }
  .sk-card__en { display: none; }         /* 只留中文名，一行放得下 */
  .sk-search { width: 100%; }
}
```

**落地注意**：
- 预览区的小字**别靠缩字号**适配——用 `container-type: inline-size` + `scale(100cqw / 基准宽)` 整体缩放；否则 390 宽下字只有 6px 且被 `overflow: hidden` 切半行。
- 预览的迷你 DOM 全部加 `aria-hidden="true"`：读屏不该念 149 次的 `ACTION` / `Read more`。
- 三个数字定死（预览 `4:3`、色板 `6px`、文本区 `180px`），卡片才会**高度一致但内容各异**；少一个就会出现"参差的墙"。
- hover 只做两笔（边框转 ink、标题转 accent）；卡片里已经有一整幅彩色预览，再加位移/阴影就是噪声。
- 这套直角只给"陈列区"。管理后台请把 `--sk-r-control` 用到 4–6px 并给按钮同样的值，否则焦点环是尖角。
- 色板条永远四段（底/字/强调/辅）；少于四色就把辅色留空给同色，**别变三段**——段数一致才像"统一的身份证"。
---

## 17. 隐形界面 + 真机截图带（UI Notes 风味，实测蒸馏）

适用：灵感库 / 作品集 / 评测站——**页面本身尽量隐形，让素材当主角**。取自 uinotes.com（3 列 × 440、截图槽 240×520、全站 0 阴影）。

```css
:root{
  /* 面 */
  --un-bg:#fff;
  --un-sunken:#f8f8f8;             /* 胶囊底、图片骨架 */
  --un-banner:linear-gradient(90deg,#f7f0fc .05%,#faf1fc 41.67%,#e8e7fc 99.94%);
  /* 墨 */
  --un-ink:#282c3d;                /* 标题 */
  --un-ink-strong:#24272e;         /* 导航、按钮底 */
  --un-ink-num:#243043;            /* 大数字本体 */
  --un-ink-2:#666;                 /* 胶囊字 */
  --un-ink-3:#8e919e;              /* 副标、计数 */
  --un-ink-4:#828282;              /* 说明段 */
  /* 强调：只给数字 */
  --un-accent:#446bf8;
  /* 发丝 */
  --un-line:#f1f2f4;
  --un-line-warm:#f5f2eb;
  /* 圆角阶梯（小→大） */
  --un-r-xs:2px; --un-r-sm:4px; --un-r-md:6px;
  --un-r-shot:16px; --un-r-pill:20px; --un-r-icon:24px;
  /* 布局 */
  --un-container:1376px;
  --un-col:440px;
  --un-gap:28px;
}

/* 页头：粘在促销条下面，透明，无边框 */
.un-header{
  position:sticky; top:56px; z-index:10;
  height:72px; display:flex; align-items:center; gap:32px;
  padding:0 32px; background:transparent;   /* 让 hero 渐变透上来 */
  border:0; box-shadow:none;
}
.un-header__login{
  margin-left:auto; height:40px; padding:0 20px;
  border-radius:var(--un-r-pill); background:var(--un-ink-strong);
  color:#fff; font-size:14px;
}

/* hero：数字当标题 */
.un-hero{padding:64px 32px 0; background:var(--un-banner); text-align:center}
.un-num{
  margin:0; font-size:48px; font-weight:500; line-height:normal;
  color:var(--un-ink-num);
}
.un-num b{color:var(--un-accent); font-weight:500}   /* 数字单独上色 */
.un-hero__lede{
  max-width:712px; margin:18px auto 0;
  font-size:18px; line-height:30px; color:var(--un-ink-4);
}

/* 图标墙：行高 = 图标 + 间隙，两侧靠容器裁切（不要渐变遮罩） */
.un-wall{overflow:hidden; height:110px}
.un-wall__track{display:flex; gap:30px; height:110px; align-items:center; width:max-content}
.un-wall__track img{width:80px; height:80px; border-radius:var(--un-r-icon); flex:0 0 auto}
@media (prefers-reduced-motion:no-preference){
  .un-wall__track{animation:un-scroll 40s linear infinite}
  @keyframes un-scroll{to{transform:translateX(-50%)}}
}

/* 筛选条 */
.un-filters{
  height:56px; display:flex; align-items:center; gap:24px;
  padding:0 32px; border-bottom:1px solid var(--un-line);
  font-size:14px; color:var(--un-ink-2);
}
.un-filters__count{margin-left:auto; color:var(--un-ink-3)}

/* 网格 */
.un-grid{
  display:grid; grid-template-columns:repeat(3,var(--un-col));
  gap:40px var(--un-gap); justify-content:center;
  max-width:var(--un-container); margin:0 auto; padding:40px 32px;
}
@media (max-width:1024px){ .un-grid{grid-template-columns:repeat(2,minmax(0,1fr))} }
@media (max-width:640px){  .un-grid{grid-template-columns:minmax(0,1fr); gap:32px} }

/* app 条目 */
.app-item{display:grid; gap:10px; container-type:inline-size}
.app-item__head{display:flex; align-items:flex-start; gap:12px; height:92px}
.app-item__icon{
  width:80px; height:80px; flex:0 0 auto;
  border-radius:var(--un-r-icon); background:rgba(0,0,0,.024);
  object-fit:cover;
}
.app-item__name{margin:0; font-size:20px; font-weight:500; color:var(--un-ink)}
.app-item__tag{margin:25px 0 0; font-size:13px; color:var(--un-ink-3)}
.app-item__stats{
  margin-left:auto; display:flex; flex-direction:column;
  align-items:flex-end; gap:8px;
}

/* 信息胶囊：内容宽度撑开、右对齐纵排 */
.pill-mini{
  display:inline-flex; align-items:center; height:32px; padding:0 12px;
  border-radius:var(--un-r-md); background:var(--un-sunken);
  font-size:13px; color:var(--un-ink-2); white-space:nowrap;
}

/* 截图带：固定宽容器裁切，故意只露 1.8 张 */
.app-shots{
  display:flex; gap:12px; overflow:hidden;
  border-radius:var(--un-r-shot);
}
.shot{
  flex:0 0 240px; height:520px; overflow:hidden;
  border-radius:var(--un-r-shot); background:rgba(0,0,0,.024);
}
.shot img{width:100%; height:100%; object-fit:fill}  /* fill：宁可轻微变形也不裁掉整屏 */
/* 移动端改成 4:3 缩略图，别再塞 9:19.5 长图 */
@media (max-width:640px){
  .app-shots{border-radius:12px}
  .shot{flex-basis:calc((100% - 12px) / 2); height:auto; aspect-ratio:4/3}
  .shot img{object-fit:cover}
}

/* 无限滚动的尾巴（配一个真正的「查看全部」出口，别只靠它） */
.un-tail{padding:32px 0 48px; text-align:center; font-size:14px; color:var(--un-ink-3)}
```

三条使用提醒：

1. `.shot` 的 `object-fit: fill` 是原站选择（保证整屏可见）；**换成产品后台必须改 `cover`**。
2. 裁切处一定要补一个出口（`.app-shots::after` 放「+3」或整卡 hover 显「查看全部」），否则就是原站第六节第 6 条病。
3. `line-height: normal` 是这套气质的来源之一（全站只有 hero 说明段设了 30px）；中文长文本别照抄，后台正文用 1.5。
## 18. 动效令牌与四个片段（可直接抄）

> 规则与判据见 `motion-spec.md`；这里只给能贴进项目的代码。

```css
/* 令牌：时长与缓动只从这里取 */
:root{
  --dur-1:120ms;  /* hover / focus / 颜色 */
  --dur-2:180ms;  /* 按下、开关、tooltip */
  --dur-3:240ms;  /* 展开、抽屉、modal */
  --dur-4:400ms;  /* 区块入场、页面转场 */
  --dur-5:600ms;  /* 一次性叙事 */
  --ease-out:cubic-bezier(.16,1,.3,1);
  --ease-in:cubic-bezier(.4,0,1,1);
  --ease-in-out:cubic-bezier(.65,0,.35,1);
  --ease-spring:cubic-bezier(.34,1.56,.64,1);
  --motion:1;                      /* 0 = 全部关闭（见降级） */
}

/* 1) 按下要有反馈：厚度归零，不加阴影 */
.btn{ transition:transform var(--dur-1) var(--ease-out), box-shadow var(--dur-1) var(--ease-out); }
.btn:active{ transform:translateY(1px); }

/* 2) 入场：8px + 400ms + 50ms 交错，只演一次 */
.reveal > *{
  opacity:0; transform:translateY(8px);
  transition:opacity calc(var(--dur-4) * var(--motion)) var(--ease-out),
             transform calc(var(--dur-4) * var(--motion)) var(--ease-out);
  transition-delay:calc(var(--i,0) * 50ms);
}
.reveal.is-in > *{ opacity:1; transform:none; }
@media (prefers-reduced-motion:reduce){
  .reveal > *{ opacity:1; transform:none; transition:none; }
}

/* 3) 视口入场：CSS 滚动驱动（不支持的浏览器直接显示） */
@supports (animation-timeline: view()){
  .reveal-fade{
    animation:reveal-fade linear both;
    animation-timeline:view();
    animation-range:entry 10% cover 32%;
  }
}
@keyframes reveal-fade{ from{ opacity:0; transform:translateY(8px) } to{ opacity:1; transform:none } }

/* 4) 跑马灯：每页最多一个，hover / focus 可暂停 */
.marquee{ overflow:hidden; mask-image:linear-gradient(90deg,transparent,#000 8%,#000 92%,transparent); }
.marquee__track{ display:flex; gap:var(--s-6); width:max-content; animation:marquee 40s linear infinite; }
.marquee:hover .marquee__track,
.marquee:focus-within .marquee__track{ animation-play-state:paused; }
@keyframes marquee{ to{ transform:translateX(-50%) } }
@media (prefers-reduced-motion:reduce){ .marquee__track{ animation:none } }
```

```js
/* 入场观察器：阈值 0.2、只演一次、演完取消观察 */
const io = new IntersectionObserver((entries) => {
  for (const e of entries) {
    if (!e.isIntersecting) continue;
    e.target.classList.add('is-in');
    io.unobserve(e.target);
  }
}, { threshold: 0.2, rootMargin: '0px 0px -10% 0px' });
document.querySelectorAll('.reveal').forEach((el, i) => {
  el.querySelectorAll(':scope > *').forEach((child, j) => child.style.setProperty('--i', j));
  io.observe(el);
});
```

三条容易踩的：

- `transition-delay` 只该给入场，**别给 hover**（会出现"划过去一格一格的"）。
- 用 CSS 变量算时长（`calc(var(--dur-4) * var(--motion))`）比自己维护两套规则好，切低端机时只改一个属性。
- `animation: … both` 会把 `transform` 留在终值上，若元素里有 `position: fixed` 子元素会被拖偏；遇到就换 `backwards` 或把动画放到内层包一层。
## 19. 聚光描边卡（holynova 风味，实测蒸馏）

一句：一张卡在指针经过时"被点亮"——1px 描边跟着指针走，内侧浮一层极淡的环境光，同时卡片抬 4px、图片压暗。**零 canvas、零动画库，光层不参与补间。**

```css
:root{
  /* 动效令牌：一条主缓动，六档时长 */
  --spring:cubic-bezier(.16,1,.3,1);
  --dur-1:120ms; --dur-2:150ms; --dur-3:180ms;
  --dur-4:220ms; --dur-5:300ms; --dur-6:400ms;

  /* 阴影：静止两层，悬停三层（第三层是 1px 环） */
  --mx-rest:0 2px 8px -2px rgb(0 0 0/.30), 0 1px 3px rgb(0 0 0/.20);
  --mx-hover:0 24px 50px -12px rgb(0 0 0/.75),
             0 12px 24px -8px  rgb(0 0 0/.48),
             0 0 0 1px         rgb(255 255 255/.14);
  --mx-press:0 8px 24px -4px rgb(0 0 0/.45);
}

/* ---------- 1) 卡片本体 ---------- */
.spotlight-card{
  position:relative;
  overflow:hidden;
  border:1px solid rgb(255 255 255/.07);
  border-radius:20px;
  background:rgb(17 17 19);
  box-shadow:var(--mx-rest);
  /* 聚光坐标：默认居中，JS 覆盖 */
  --spotlight-x:50%;
  --spotlight-y:50%;
  --spotlight-opacity:0;
  transition:transform var(--dur-4) var(--spring),
             border-color 200ms ease,
             box-shadow var(--dur-5) var(--spring);
}
.spotlight-card:hover,
.spotlight-card:focus-within{                 /* 键盘同款，别漏 */
  transform:translateY(-4px);
  border-color:rgb(255 255 255/.22);
  box-shadow:var(--mx-hover);
  --spotlight-opacity:1;
}
.spotlight-card:active{ transform:translateY(-1px); box-shadow:var(--mx-press); }

/* ---------- 2) 两个光层 ---------- */
.spotlight-card::before,
.spotlight-card::after{
  content:"";
  position:absolute;
  pointer-events:none;              /* 漏了整卡不可点 */
  border-radius:inherit;            /* 跟着圆角，不用重复写 20px */
  opacity:var(--spotlight-opacity);
  transition:opacity var(--dur-4) var(--spring);
}
/* 1px 描边聚光：mask 把渐变抠成一条环 */
.spotlight-card::before{
  inset:0; padding:1px;
  background:radial-gradient(clamp(180px,40%,320px) circle at var(--spotlight-x) var(--spotlight-y),
             rgb(255 255 255/.94), rgb(255 255 255/.32) 40%, transparent 76%);
  mask:linear-gradient(#fff 0 0) content-box exclude,
       linear-gradient(#fff 0 0);
}
/* 内侧环境光：半径更大、透明度更低 */
.spotlight-card::after{
  inset:1px;
  background:radial-gradient(clamp(220px,52%,420px) circle at var(--spotlight-x) var(--spotlight-y),
             rgb(255 255 255/.12), transparent 72%);
  z-index:0;
}
.spotlight-card > *{ position:relative; z-index:1; }   /* 内容压在光层上 */

/* ---------- 3) 卡内媒体与浮出按钮 ---------- */
.spotlight-card img{
  display:block; width:100%; height:auto;
  transition:filter 200ms ease;
}
.spotlight-card:hover img{ filter:brightness(.95) saturate(.97); }  /* 压暗，不是提亮 */

.spotlight-card__actions{
  position:absolute; inset:auto 12px 12px;
  display:flex; gap:8px;
  opacity:0; transform:translateY(5px); pointer-events:none;
  transition:opacity var(--dur-3) ease, transform var(--dur-4) var(--spring);
}
.spotlight-card:hover .spotlight-card__actions,
.spotlight-card:focus-within .spotlight-card__actions{
  opacity:1; transform:translateY(0); pointer-events:auto;
}

/* ---------- 4) 批量入场：一批一次呼吸 ---------- */
@keyframes card-entry{ from{ opacity:0; transform:translateY(14px); } to{ opacity:1; transform:none; } }
.card-appear{
  animation:card-entry 360ms var(--spring) both;   /* both 必写，否则首帧闪一下 */
  animation-delay:calc(var(--i,0) * 40ms);        /* 可选：>4 张时加，封顶第 8 张 */
}
.card-appear:nth-child(n+9){ animation-delay:280ms; }   /* 封顶，别让第 20 张等 800ms */

/* ---------- 5) 降级：连装饰层一起关 ---------- */
@media (hover:none){ .spotlight-card{ --spotlight-opacity:0; } }   /* 触屏没有指针 */
@media (prefers-reduced-motion:reduce){
  *,::before,::after{
    scroll-behavior:auto !important;
    animation-duration:.01ms !important;            /* 不要写 0ms */
    animation-iteration-count:1 !important;
    transition-duration:.01ms !important;
  }
  .spotlight-card::before,.spotlight-card::after{ opacity:0 !important; }
  .spotlight-card__actions{ opacity:1; transform:none; pointer-events:auto; }
}
```

指针坐标（约十行，事件委托到容器上）：

```js
const grid = document.querySelector('[data-spotlight]');
grid?.addEventListener('pointermove', (e) => {
  const card = e.target.closest('.spotlight-card');
  if (!card) return;
  const r = card.getBoundingClientRect();
  card.style.setProperty('--spotlight-x', `${(e.clientX - r.left).toFixed(0)}px`);
  card.style.setProperty('--spotlight-y', `${(e.clientY - r.top).toFixed(0)}px`);
}, { passive: true });
```

四条坑：

1. **写自定义属性而不是 `background`**：改 `background` 会整层重绘，改坐标只让伪元素内部重画。
2. `pointer-events:none` + `.spotlight-card > * { z-index:1 }` 两个都不能漏（前者让卡片可点，后者让文字可见）。
3. 触屏（`hover: none`）把 `--spotlight-opacity` 归零，否则永远停在中心那个假光斑。
4. reduced-motion 下把浮出按钮**直接常显**，不要让它依赖 hover 才出现。

实测参照：holynova 的 23 条 transition 中位移 220ms / 颜色 200ms / 阴影 300ms、主缓动 `cubic-bezier(.16,1,.3,1)`、只有 3 个 keyframes；完整数值与七处别照抄见 [`holynova-motion.md`](holynova-motion.md)。