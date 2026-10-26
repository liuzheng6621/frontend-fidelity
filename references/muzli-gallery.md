# Muzli Inspiration：杂志目录式灵感库（实测蒸馏）

> 实测对象：`https://muz.li/inspiration/motion-design/`（2026-11-06，1440×900 + 390×844，headless Edge）。
> 采集脚本 `probe-muz1..7.mjs`，原始数据 `out/muz/facts1..6.json`、`mobile.json`，截图 `out/muz/{d-top,d-mid,v-grid,v-top,m-top}.png`。
> 与 `stylekit-design.md`、`uishijie-design.md`、`luckymaomi-catalog.md` 是同一类（内容陈列/目录站），但做法几乎相反——那三份在**卡片上**做文章，这一份在**页面外壳**上做文章。

## 一、气质：一张铜版纸上的索引卡目录

一句话：**白纸、衬线大标、电光蓝只指路，卡片轻到几乎没有壳。**

四条可辨识特征：

| 特征 | 具体表现 | 为什么成立 |
| --- | --- | --- |
| 双字体分工极硬 | 标题全部 `Instrument Serif`（衬线，4 个层级），正文/控件全部 `Poppins`（几何无衬线）；实测 296 处 Poppins vs 9 处 Instrument Serif | 衬线只当「刊头」，不当正文——中文站可直接换成思源宋体/宋体做标题，正文保持无衬线 |
| 卡片几乎无壳 | 图片 `border-radius: 4px` + 一圈 `0 0 0 1px rgba(0,0,0,.05)` 发丝环，卡片本体 `border: 0; box-shadow: none; background: transparent` | 靠**图片自己的边界**分组，页面看起来像「贴上去的图版」，不是「一排框」 |
| 一个蓝管全部 | `#2e54ff` 只出现在：面包屑链接、正文内链、`New` 徽标、`Get Muzli` 按钮、页脚面板底色（10% 透明） | 强调色只指路，不装饰；页面 99% 是黑白灰 |
| 外壳一动不动 | 卡片 `:hover` 实测前后 **transform / filter / box-shadow / 文字色全部不变**；全站 10 个 keyframes 没有一个作用在卡片上，静止时 `document.getAnimations()` = 0 | 这是「内容会动、壳不动」的取舍——把动效预算全留给被收录的作品（封面是图，动不了），壳就彻底静态 |

**和同类的差别（选型时看这张表）**

| 站点 | 卡片壳 | hover | 格子 | 类型 |
| --- | --- | --- | --- | --- |
| StyleKit | 1px 发丝边、直角、6px 四段色板条 | 边框转黑 + 标题转绯红 | 3 列 373×466 gap 32 | 活预览（真 DOM） |
| UI 世界 | 完全无壳 | 无 | 5 列 gap 0 | 缩略图墙 |
| 站酷 | 完全无壳 | 遮罩 + 图标 | 4 列 gap 24 | 等宽图版 |
| 猫叫兽 | 1px 灰边、2px 圆角 | 描黑 + 4px 硬阴影 | 3 列 457×477 gap 24 | 静态 SVG 预览 |
| **Muzli** | 无壳 + 图 4px 圆角 + 发丝环 | **无** | 3 列 348×309 gap 32/40 | 封面图 + 杂志目录 |

## 二、令牌（实测）

```css
:root{
  /* 强调色：全站唯一彩色 */
  --mz-accent: rgb(46, 84, 255);        /* #2e54ff */
  --mz-accent-panel: rgba(46, 84, 255, .1); /* 页脚大面板底色 */

  /* 墨色阶：一个纯黑派生到底 */
  --mz-ink: rgb(0, 0, 0);               /* 标题、正文主体 */
  --mz-ink-80: rgba(0, 0, 0, .8);       /* 副标、未选中药丸文字 */
  --mz-ink-70: rgba(0, 0, 0, .7);       /* 卡片描述 */
  --mz-ink-65: rgba(0, 0, 0, .65);      /* 左栏条目 */
  --mz-hairline: rgba(0, 0, 0, .12);    /* 药丸描边 */
  --mz-img-ring: 0 0 0 1px rgba(0, 0, 0, .05); /* 图片发丝环 */
  --mz-field: rgba(0, 0, 0, .043);      /* 搜索框底 */

  /* 形状：只有两个值 */
  --mz-r-img: 4px;      /* 图片、搜索框 6px 属于同一档"小圆" */
  --mz-r-field: 6px;
  --mz-r-pill: 999px;   /* 药丸、New 徽标、CTA */

  /* 骨架尺寸 */
  --mz-header-h: 65px;
  --mz-rail-w: 300px;   /* 左栏含 32px 内边距，内容 220 + 32 间隙 */
  --mz-col: 348px;
  --mz-gap-x: 32px;
  --mz-gap-y: 40px;
  --mz-img-h: 230px;    /* 348×230 = 1.513，接近 3:2 */
}
```

三条结论：

1. **圆角只有两档**（4/6px 的「小圆」与 999px 的「全圆」），没有 8/12/16。卡片本体为 0（无壳），所以「看起来是直角、摸着是 4px」。
2. **没有独立的中性色阶**：`#000` 一路降透明度（.8/.7/.65），和这份技能里 `SKILL.md` 的「一个色相 + alpha 派生」完全一致，是最省事也最不容易脏的做法。
3. **没有阴影**：整个网格 0 阴影（图片只有 1px 环）。阴影预算全给了浮层（下拉、模态）——`fadeIn`、`return-bar-in` 等 keyframes 都在浮层上。

## 三、字阶：衬线做刊头，无衬线干活

| 层级 | 字号 / 字重 / 行高 | 字体 | 实测位置 | 备注 |
| --- | --- | --- | --- | --- |
| H1 刊头 | **48 / 400 / 48**（行高 = 字号，1.0） | Instrument Serif | 内容区顶部，760 宽 | 单行不换行；中文替身用思源宋体 400，行高给到 1.1 |
| H2 长文大标 | **38.4 / 500 / 48**（0.8 缩放 = 2.4rem） | Instrument Serif | 页面下部的问答/长文区，896 宽 | 长文区 `h2` 只有这一档 |
| 区块标题 | **30 / 400 / 36** | Instrument Serif | 「All collections」 | 间距 `margin: 0 0 32px` |
| 副标 | 16 / 400 / 24 | Poppins | H1 下方一句 | 颜色 `rgba(0,0,0,.8)` |
| 正文 | 16 / 400 / 24 | Poppins | 介绍段、长文段（896 宽） | 长文段 `margin-bottom: 16–24px` |
| 卡片标题 | **14 / 500 / 21** | Poppins | 每卡图下 | `padding: 16px 16px 0`，长标题自然折 2–3 行（实测 37/58 高） |
| 卡片描述 | 14 / 400 / 16 | Poppins | 标题下，`truncate` | `rgba(0,0,0,.7)`，`padding: 0 16px 16px` |
| 药丸 / 导航 | 14 / 400 | Poppins | tag 行、header 导航 | 导航字色 `rgb(48,48,48)`，`padding: 8px` |
| 面包屑 / 左栏条目 | 12.8–15.2 / 400 | Poppins | 面包屑 12.8、左栏 15.2 | 0.8rem / 0.95rem 这类非整数，来自 16px 基准再缩放 |
| `New` 徽标 | **11.2 / 600**，`letter-spacing: .224px` | Poppins | 卡片图左上 | 41×21、`padding: 2px 8px` |

四条要点：

1. **衬线只当刊头**：9 处 Instrument Serif 全部落在标题（H1/H2/区块标题/页脚 logo），正文一处不用。这是「省着用」的第二种做法——第一种是 `stylekit-design.md` 的「Playfair 做 H1 + 等宽做标签」。
2. **行高 1.0 是刊头的特权**：48px 字号配 48px 行高，靠单行成立；一旦标题要换行，必须提到 1.05–1.15，否则两行会黏在一起。
3. **正文 16px/1.5，卡片 14px/1.5**：卡片落在「信息密度更高」的那一档，和 `design-tokens.md` 的「列表/卡片 14，正文 16」一致。
4. **非整数字号是缩放留下的痕迹**（38.4/30/15.2/14.4/12.8/11.2）：全部是 0.8rem 的倍数。抄的时候把它归整到 38/30/15/14/13/11，别继承这套小数。

## 四、版式节奏：左栏目录 + 3 列主区

| 段 | 高度 / 尺寸 | 关键参数 |
| --- | --- | --- |
| 固定头 | **65** | `position: fixed`、白底、`backdrop-filter: blur(10px)`、无边框无阴影 |
| 面包屑 | y=153 | 12.8px、`Muzli / Collections / Motion Design`、链接用 `--mz-accent` |
| H1 | y=184，760 宽 | 48px 衬线 |
| 副标 + 介绍 | y=248 / 280 | 16px，760 宽 |
| 更新时间行 | y=337 | 「5 new in the last two weeks」蓝色 600 + 「Last update: Oct 21, 2026」灰 |
| tag 药丸行 | y=375，**35 高** | `gap: 8px`、可换行、当前项黑底 |
| 网格 | y=421，**1108 宽** | `grid-template-columns: 348px 348px 348px`、`gap: 40px 32px` |
| 广告位 | 占一格 348×308 | 蓝色块 + 「Add Muzli — free」+ 商店链接（249×48） |
| 长文区 | y=6337 起 | 段宽 1108 → 896（长文收窄到 896） |
| 长文大标 | y=7284 | 38.4px 衬线，896 宽 |
| All collections | y=9110 | 30px 衬线 + 32 下距，两列链接（15.2/`rgba(0,0,0,.65)`、行高 34） |
| 页脚 | y=8988 起，**584 高** | `background: rgba(46,84,255,.1)`、`padding: 80px 160px` |

左栏（`nav`）：x=32、宽 220、`position: sticky`、可滚动；内容 = 「All collections」标题 + 搜索框（220×40、`border-radius: 6px`、`background: rgba(0,0,0,.043)`、14.4px、占位「Find a collection」）+ 5 组目录（UI DESIGN / WEB DESIGN / GRAPHIC DESIGN / BRANDING / FEEDS），每组 = 全大写小标 + 若干「名称 …… 数字」行（名称 `rgba(0,0,0,.65)`、数字右对齐、当前项加浅灰底）。

三条要点：

1. **左栏目录 + 主区 3 列**是这类站最省心的信息架构：分类永远可见、不占主区宽度，且天然的「我在哪」反馈。
2. **正文量级是阶梯不是均匀**：图版 348 → 长文 896 → 段落 1108。长文收窄到 896，是为了把行宽压回 65–75 字符。
3. **页脚用主色的 10% 当底色**：不引入第三个颜色，也不让页脚变成「黑底白字」的第二个世界。

## 五、组件配方

**卡片（图 + 标题，最小可用形态）**

```html
<article>
  <a href="…" target="_blank" rel="noopener">
    <img src="cover.jpg" width="640" height="424" alt="作品名">
    <h3>作品标题，可以很长并自然折到第三行</h3>
  </a>
  <p class="desc">一句话描述，单行省略</p>
</article>
```

```css
article{ background: transparent; border: 0; box-shadow: none; }
article > a{ display: block; color: #000; text-decoration: none; }
article img{
  display: block; width: 100%; height: var(--mz-img-h);   /* 348×230 */
  object-fit: cover; object-position: 50% 0%;             /* 顶部对齐，保住标题区 */
  border-radius: var(--mz-r-img);
  box-shadow: var(--mz-img-ring);
}
article h3{
  margin: 0; padding: 16px 16px 0;
  font: 500 14px/21px Poppins, sans-serif; color: #000;
}
article .desc{
  margin: 0; padding: 0 16px 16px;
  font: 400 14px/16px Poppins, sans-serif; color: var(--mz-ink-70);
  overflow: hidden; white-space: nowrap; text-overflow: ellipsis;
}
```

**tag 药丸行（当前项黑底，其余白底描边）**

```css
.tag-row{ display: flex; flex-wrap: wrap; gap: 8px; }
.tag{
  display: inline-flex; align-items: center; height: 35px;
  padding: 6.4px 14.4px; border-radius: var(--mz-r-pill);
  border: 1px solid var(--mz-hairline); background: #fff; color: var(--mz-ink-80);
  font: 400 14px/1 Poppins, sans-serif; text-decoration: none;
}
.tag[aria-current="true"]{ background: #000; border-color: #000; color: #fff; }
```

**`New` 徽标**

```css
.badge-new{
  position: absolute; left: 8px; top: 8px;
  padding: 2px 8px; border-radius: var(--mz-r-pill);
  background: var(--mz-accent); color: #fff;
  font: 600 11.2px/1.6 Poppins, sans-serif; letter-spacing: .224px;
}
```

**头部（65px，右侧单 CTA）**

```css
.site-head{
  position: fixed; inset: 0 0 auto; height: var(--mz-header-h); z-index: 50;
  display: flex; align-items: center; gap: 24px; padding: 0 24px;
  background: #fff; backdrop-filter: blur(10px);
  font: 400 14px/1 Poppins, sans-serif;
}
.site-head nav a{ padding: 8px; color: rgb(48,48,48); text-decoration: none; }
.site-head .cta{
  margin-left: auto; display: inline-flex; align-items: center; height: 36px;
  padding: 8px 20px; border-radius: var(--mz-r-pill);
  background: var(--mz-accent); color: #fff;
}
```

**左栏目录（sticky，可滚动）**

```css
.rail{
  position: sticky; top: calc(var(--mz-header-h) + 88px);
  width: 220px; max-height: calc(100vh - 160px); overflow: auto;
}
.rail__search{
  width: 220px; height: 40px; padding: 8px 11.2px;
  border-radius: var(--mz-r-field); border: 1px solid transparent;
  background: var(--mz-field); font: 400 14.4px/1 Poppins, sans-serif;
}
.rail__group-title{ font: 600 12px/1 Poppins, sans-serif; letter-spacing: .08em; text-transform: uppercase; color: var(--mz-ink-65); }
.rail__item{
  display: flex; justify-content: space-between; align-items: center;
  height: 34px; font: 400 15.2px/1 Poppins, sans-serif; color: var(--mz-ink-65);
  text-decoration: none;
}
.rail__item[aria-current="page"]{ background: rgba(0,0,0,.045); border-radius: 6px; }
```
## 六、动效与交互：把预算全留给内容

**卡片真的没有 hover**（实测三遍，鼠标停在卡片正中 700ms 后取样）：

| 属性 | 静止 | hover |
| --- | --- | --- |
| `transform`（卡片 / 图片） | `none` | `none` |
| `filter`（图片） | `none` | `none` |
| `box-shadow`（卡片） | `none` | `none` |
| 标题 `color` | `rgb(0,0,0)` | `rgb(0,0,0)` |

**全站动效清单（CSSOM 遍历，1440 视口）**

| 类别 | 实测 |
| --- | --- |
| `@keyframes` 总数 | **10 个**：`pulse`、`spin`、`warp`（15s）、`scrollGrid`、`slideIn`、`bounce-in`、`return-bar-in`（.3s）、`fadeIn`×2（.35s / .15s）、`spin`（弹窗版） |
| 作用在网格卡片上的 | **0 个** |
| 静止时 `document.getAnimations()` | **0** |
| 过渡默认时长 | **0.15s ease-in-out / ease-in**（导航、抽屉、下拉、`a.uhover::before` 的 scale） |
| 例外 | `.cta { background-color .3s }`、`.pro-bg` 的渐变变量 `.15s`、滚动条 `.25s`、`.animate-[warp_15s_ease-out_forwards]` |

**这份取舍值得学的地方**

1. **壳不动，是给内容让路**：这一页收录的是别人的动态作品，封面只有静态图。壳上再叠动效，阅读时两套运动互相打架。宁可零反馈，也不加「为加而加」的位移。
2. **反馈改由指针与光标承担**：链接用系统手型，卡片整块可点（`<a>` 包住图与题），不需要额外的 hover 动画。代价见第七节。
3. **动效预算集中在浮层**：下拉、模态、返回条各自只有 0.15–0.35s 的一次入场；`warp` 那种 15s 长动画只出现在营销位。
4. **移动端整体降级为 2 列**：390 视口下 `grid-template-columns: 173px 173px`、`gap: 20px 12px`、`scrollWidth === innerWidth === 390`，页头仍是 65px；左栏目录折叠掉（不占首屏），也没有底部 tab bar。

**如果要补 hover（本站没有，但你应该有）**

```css
/* 三笔就够：边框/发丝环加深、图轻微提亮、标题给出可点暗示 */
article a:hover img{ box-shadow: 0 0 0 1px rgba(0,0,0,.22); filter: brightness(1.02); }
article a:hover h3{ text-decoration: underline; text-underline-offset: 3px; }
article a{ transition: none; } /* 只在图上给 0.15s，别让整块跳动 */
article img{ transition: box-shadow .15s ease-out, filter .15s ease-out; }
```

## 七、信息架构：只做入口，不做详情页

三层，全部在同一页：

1. **目录页**（本文档这一页）：面包屑 + 衬线刊头 + 一句副标 + 更新时间 + tag 药丸 + 3 列卡片。
2. **作品入口**：51 张内容卡全部外链到自家社区 `https://me.muz.li/<作者>/<slug>?utm_source=website&utm_medium=collection&utm_campaign=motion-design`——**带 UTM 跳回自建社区**，站内没有作品详情页。
3. **SEO 长文 + `All collections`**：网格之下先是一段介绍（1108 宽），再是问答式长文（896 宽、38.4px 衬线大标），最后是「All collections」两列链接块（把全部专题内链一遍）。

可迁移的三条：

- **入口页不需要详情页**：一张图 + 一行标题 + 一个跳转，是这类站的最小单位；详情页的成本留给真正要卖的东西（这里是社区账号与浏览器插件）。
- **UTM 写在卡片里**：`utm_medium=collection&utm_campaign=<专题>` 让每个专题都能独立结算；抄的时候至少保留 `utm_source/utm_medium`。
- **长文放在网格下面，不单独开页**：既喂搜索引擎，又不打断浏览（代价见下一节）。

## 八、七处没做好（如实记下，别照抄）

1. **卡片零 hover、零 focus 可视**：可点但看不出可点，键盘也拿不到视觉焦点（`:focus-visible` 没有额外样式）。这是这一页最大的可用性缺口。
2. **广告卡混在内容卡里**：56 个 `article` 中有 1 个是「Add Muzli — free」+ 商店链接，只靠右下角一个 `Sponsored` 小字区分；`New` 徽标又是蓝色，两者抢同一块注意力。
3. **卡片标题 14px 偏小**：348 宽的卡里 14/500，长标题折到 3 行、行高 21，和图（230 高）的比例失衡；同类站（StyleKit 16、猫叫兽 18）都更大一档。
4. **图片比例靠裁**：`348×230`（1.513）配 `object-position: 50% 0%`，竖构图素材只剩顶部一条；没有 `aspect-ratio` 兜底，图片加载前会跳高度（只有 `width/height` 属性提示）。
5. **字号全是 0.8rem 的倍数**（38.4/30/15.2/14.4/12.8/11.2）：抄进设计系统会污染令牌表，必须归整。
6. **左栏目录不可筛选主区**：目录是站内跳转（换专题页），不是本页过滤器；用户点「Apps 8」会离开当前页，和顶部的 tag 药丸（站内过滤）行为不一致。
7. **长文与浏览混排**：56 张卡片之后接两大段 SEO 长文与全部专题链接，想「继续看作品」的人得滚很久；没有「加载更多」也没有分页（实测 56 张固定，无懒加载）。

## 九、能搬 / 不能搬

| 能搬 | 怎么搬 | 不能搬 | 为什么 |
| --- | --- | --- | --- |
| 左栏目录 + 主区 3 列 | `.rail` sticky + `grid-template-columns: repeat(3, 348px)` | 目录用站内跳转还是接管为过滤器——**要统一**，别两种行为并列 | 行为不一致比功能缺失更伤 |
| 面包屑 + 衬线刊头 + 更新时间 | 12.8px 面包屑 → 48px 衬线 H1 → 16px 副标 → 「N 条新增 · 最后更新」一行 | 48px 行高 = 1.0 只在单行成立 | 换行就黏 |
| tag 药丸行（当前项黑底） | 35 高的白底描边药丸 + `aria-current` | 药丸与左栏目录同时充当分类入口 | 两个入口两个语义 |
| 卡片「无壳 + 图 4px 圆角 + 发丝环」 | `border:0`，阴影只给图片 1px 环 | 零 hover / 零 focus 可视 | 可点却看不出可点 |
| `New` 徽标 | 11.2/600 蓝底白字 999 圆角、左上 8px | 和广告标签同时出现在一屏 | 两个「小心」抢注意力 |
| 页脚用主色 10% 面板 | `background: rgba(accent, .1)` + 80/160 内边距 | 页脚 584 高还塞 5 列信息 | 内容少时显得空 |

**混合口径**：这一份的「3 列 348 + 左栏 220」适合**内容量 ≥ 30 条**的目录页；条目少于 12 条时，把左栏收成顶部横向药丸行，主区改 2 列或 1 列（见 `page-patterns.md` 内容站骨架）。

## 十、十步复现清单

1. 定骨架：固定头 65 + 左栏 220（sticky）+ 主区 1108（3×348，gap 32/40）。
2. 上双字体：标题 `"Instrument Serif", Georgia, serif`；正文 `Poppins`；中文站换成 `"Source Han Serif SC","Songti SC"` 做标题 + 系统无衬线做正文。
3. 定字号六档：48（刊头）/ 38（长文大标）/ 30（区块标题）/ 16（正文副标）/ 14（卡片与控件）/ 12（面包屑与栏目标签）。
4. 定色：`#000` + alpha 四档（.8/.7/.65/.12）+ 一个强调色 `#2e54ff`；页脚用它的 10%。
5. 做卡片：图 3:2、4px 圆角、`0 0 0 1px rgba(0,0,0,.05)`，标题 14/500 lh21、`padding: 16px 16px 0`。
6. 做药丸行：35 高、999、当前项黑底白字、`aria-current="true"`。
7. 做面包屑 +「N 条新增 · 最后更新」行：这是「活着的目录」的最低成本证据。
8. 做左栏：搜索框 40 高、分组大写小标、条目 34 高带右对齐计数。
9. **补上它没做的**：卡片 hover 三笔（环加深 + 图微提亮 + 标题下划线）+ `:focus-visible` 同款 + 图片 `aspect-ratio: 348 / 230`。
10. 验收：`audit.mjs` 0 error / 0 warn、卡片可键盘到达并有可见焦点、390 视口 2 列且 `scrollWidth === innerWidth`。

## 十一、重采方法与坑

```powershell
# 页面是 Nuxt SSR + 大量第三方脚本，'load' 事件会等很久（probe-ref 默认会超时 45s）
node E:\SKIl.1\.tools\probe-muz1.mjs   # 结构 / 变量 / 卡片 / 字体 / 字号 / 骨架
node E:\SKIl.1\.tools\probe-muz2.mjs   # hover 前后 / 左栏 / 移动端 / 无限滚动
node E:\SKIl.1\.tools\probe-muz3.mjs   # 页面顶部全屏截图 + tag 可见项实测
node E:\SKIl.1\.tools\probe-muz4.mjs   # 长文区 / All collections / 页脚面板
node E:\SKIl.1\.tools\probe-muz5.mjs   # CSSOM：keyframes / transition / 运行中动画 / New 徽标
node E:\SKIl.1\.tools\probe-muz6.mjs   # 卡片外链目标与 UTM
```

四个坑：

1. **`waitUntil: 'load'` 会超时**：这一页要等一堆广告/统计脚本。用 `domcontentloaded` + `waitForSelector('article')`，再 `waitForTimeout(2000–2500)` 让字体与布局稳定。
2. **`probe-ref.mjs` 默认 45s 超时会失败**（本次实测 `Timeout 45000ms exceeded`），要采令牌请先改等待策略，或直接用上面这些专门脚本。
3. **`article` 里有广告卡**：数卡片数量会多 1–5 个；判断「这条是不是内容」看外链域名（`me.muz.li` 是内容，`addons/chrome` 是广告）。
4. **`hover` 无变化是结论不是漏测**：连测三次（含 `filter/box-shadow/transform/color`）全部相同，说明确无 hover 样式——写进「别照抄」而不是当成脚本失败。