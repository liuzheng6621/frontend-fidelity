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
