# Wegic.ai 设计蒸馏（实测，2026-02）

> 样本：`https://wegic.ai/zh-cn`（AI 建站产品站，中文版首页）。
> 采集：Edge headless 1440×900 / 390×844，等 4.5s + 全页滚动，读 `getComputedStyle`、
> `:root` 计算值、`document.fonts`，截 14 屏。原始 JSON 未随包分发，重跑 `scripts/probe-ref.mjs` 可近似再生
> （本文件里逐字入场、`--wg-*` 令牌这类信息 probe-ref 抓不到，需按第十节的做法补一次 evaluate）。

这是一个**产品站（product landing）**样本，不是后台样本。
读法：第七节「能搬什么」写的是给管理端/工具端的迁移口径；第六节写的是连它自己都没做好的地方。

## 一、气质一句话

**纯黑舞台上的一件塑料制品**：黑场 + 大白字 + 手写体批注 + 一颗按下去会「变薄」的白色按钮。
深色段落承担叙事（滚一下，亮一行），浅色段落承担证据（模板、感言、FAQ）。

四条可辨识特征，缺一条就不像它：

1. **纯黑 `#000` 与暖白 `#f7f6f5` 交替**，中间没有灰过渡段。黑段讲情绪，暖白段放内容。
2. **正文几乎全是 Inter，但批注层是一个手写体**（Damion 40px）——`AI协作助手` `声音` `社区` `目标`。
3. **按钮有厚度**：`inset 0 -4px 0` 做侧壁，hover 变 `-2px`，active 归零。靠内阴影，不靠渐变。
4. **大标题逐字进场**：86.4px 的标题被拆成每个汉字一个 `<span>`，按滚动逐字 `opacity 0→1` + `scale(.72)→1`。

## 二、设计令牌（`:root` 计算值，原样）

命名分两套：`--wg-*` 是真实定义，`--js-*` 是给组件层的中转别名。抄的时候只留一套。

### 背景与面

```css
--wg-bg-1 / --wg-color-bg-1 / --wg-bg-white: #f7f6f5;  /* 页面暖白（不是 #fff） */
--wg-color-bg-2: #fbfbfb;                              /* 区块底，比页面更冷一点 */
--wg-color-gray-light: #edeceb;
--wg-color-black: #000;  --wg-color-black-9: #2d2d2d;   /* 深色段落就是纯黑 */
--wg-color-white: #fff;
```

**注意这个反直觉搭配**：浅色区块用 `#fbfbfb`（更白），卡片却用 `#f7f6f5`（更暖）。
也就是「底比卡片亮」——卡片靠比底更暖的灰压出来，配合零阴影。感言区实测：区块 `#fbfbfb` / 卡 `#f7f6f5` / radius 12 / pad 24 / gap 16。

### 文字：一个黑色 + 十档透明度

```css
/* ink ramp（黑加 alpha，不另配灰） */
--wg-gray-1: #0000000a;  /* 4%  */
--wg-gray-2: #0000000f;  /* 6%  */
--wg-gray-3: #00000014;  /* 8%  */
--wg-gray-4: #00000029;  /* 16% */
--wg-gray-5: #0000004d;  /* 30% */
--wg-gray-6: #0006;      /* 40% */
--wg-gray-7: #00000080;  /* 50% */
--wg-gray-8: #0009;      /* 60% */
--wg-gray-9: #000000b3;  /* 70% */
--wg-gray-10: #000c;     /* 80% */

/* 白 ramp（深色段落里的次级文字用这个） */
--wg-white-1: #ffffff1a; --wg-white-1-5: #ffffff26; --wg-white-2: #fff3;
--wg-white-3: #ffffff4d; --wg-white-4: #fff6;       --wg-white-5: #ffffff80;
--wg-white-6: #fff9;     --wg-white-7: #ffffffb3;   --wg-white-8: #fffc;
--wg-white-9: #ffffffe6; --wg-white-10: #fff;
```

实测用法：导航次级链接直接写 `text-white/[.5]`，页脚链接 `color:#fff; opacity:.7`。
**比调一套灰阶省事得多，而且深浅两套主题天然成立**——深色段落把 ink ramp 换成 white ramp 即可。

例外：正文里有 43 处用了 Tailwind 的 `#4b5563`（中性灰）。它和 ink ramp 的 70% 视觉上冲突，
说明这个站自己也没做到底——抄的时候二选一。

### 品牌色与语义色

```css
/* 品牌其实是一支薄荷绿（cyanblue 1→10，注意是绿的 10 档） */
--wg-color-cyanblue-1: #66edae0a;  -2: #66edae1f;  -3: #66edae66;  -4: #66edaeb3;
--wg-color-cyanblue-5: #66edae;    -6: #40c58b;    -7: #189e7a;    -8: #107a59;
--wg-color-cyanblue-9: #004d33;    -10: #00362a;

/* 紫：模板卡/装饰 */
--wg-bg-purple: #ebe5fe; --wg-border-purple: #cfc0ff; --wg-text-purple: #8142ff; --wg-color-purple-7: #9875ff;

/* 语义 */
--wg-color-red: #ef4444; --wg-color-red-7: #ef4444; --wg-color-red-8: #ff4d4f; --wg-color-red-9: #dc2626;
--wg-color-red-1: #ef44440a; --wg-red-1: #ef44440f;
--wg-color-green-1: #00bb34; --wg-color-green-2: #9bdcac;
--wg-color-blue-5 / -7: #0094ff; --wg-color-blue-4: #4db4ff;

/* 边框与禁用 */
--wg-color-border-1: #939393; --wg-color-border-2: #aaa; --wg-color-border-3: #b0b0b0;
--wg-disabled-1: #ddd; --wg-button-bg-hover: #f7f6f5; --wg-button-bg-pressed: #f0f0f0;
```

**首页 CTA 用的不是品牌绿**，是活动色橙 `#fb6514`（促销 pill）+ 黑/白（主 CTA）。品牌绿几乎只出现在图标与详情页。
判据：一个站可以有「品牌色」和「活动色」两套，但活动色只能出现在促销条/角标上，一旦渗进按钮体系就散了。

### 圆角

```css
--radius-xs: .275rem;  /* 4.4 → 实测常按 4~6 用 */
--radius-sm: .5rem;    /* 8  */
--radius-md: .75rem;   /* 12 */
--radius-lg: 1rem;     /* 16 */
--radius-xl: 1.25rem;  /* 20 */
```

实测频次：**12px(48 次) ≫ 9999px(34) ≈ 20px(34) > 8px(5) > 16px(3) > 10px(3) > 6px(1)**，另有 58px 用于大媒体框。
用法分工干净：**控件与卡片 12 / 暗色叙事卡 20 / 标签与促销 9999 / 大媒体 58**。这就是它看起来成套的原因。

### 阴影：两套，各有明确职责

**A. 按钮厚度（本样本最有价值的可迁移资产）**

```css
--wg-shadow-button-default:  inset 0 -4px 0 #0000000f, 0 0 0 1px #0000000a, 0 1px 2px #0000001f;
--wg-shadow-button-hover:    inset 0 -2px 0 #0000000f, 0 0 0 1px #0000000a, 0 1px 2px #0000001f;
--wg-shadow-button-active:   inset 0 0 0    #0000000f, 0 0 0 1px #0000000a, 0 1px 1px #0000001f;
--wg-shadow-button-disabled: inset 0 0 0    #0000000f, 0 0 0 1px #0000000a;

/* 小号按钮：侧壁 3px → 1px → 0 */
--wg-shadow-small-button-default: inset 0 -3px 0 #0000000f, 0 0 0 1px #0000000a, 0 1px 2px #0000001f;
--wg-shadow-small-button-hover:   inset 0 -1px 0 #0000000f, 0 0 0 1px #0000000a, 0 1px 2px #0000001f;
```

主按钮实测完整值（126×48，radius 12）：

```css
box-shadow:
  rgba(0,0,0,.06) 0 0 0 1px,          /* 外发丝环：替代 border，拐角不糊 */
  rgba(0,0,0,.063) 0 1px 1px,         /* 一点落影 */
  inset 0 1px 0 #fff,                 /* 顶面高光 */
  inset 0 -1px 1px rgba(255,255,255,.2),
  inset 0 1px 4px 1px rgba(255,255,255,.2),   /* 内部柔和鼓包 → 塑料感 */
  inset 0 -2px 1px 1px rgba(0,0,0,.06);       /* 底侧壁 → 厚度 */
```

大号 CTA（`--wg-shadow-large-button-hover`）在同一套上做了 7 层叠：

```css
box-shadow:
  0 0 0 1px #0000000f, 0 1px 1px 0 #00000010,
  0 1px 0 0 #fff inset,
  0 -1px 1px 0 #fff3 inset,
  0 1px 4px 1px #fff3 inset,
  0 -2px 1px 1px #0000002b inset,
  0 20px 20px 0 #00000002 inset;
```

**B. 卡片（克制到几乎没有）**

```css
--wg-shadow-amcard: 0 1px 4px #0000000f, inset 0 0 0 1px #ffffff80, 0 0 0 1px #0000000a;  /* 浅底卡 */
--wg-shadow-obcard: 0 1px 4px #0000000f, inset 0 0 0 1px #ffffff1f, 0 0 0 1px #0000000a;  /* 暗底卡 */
--wg-shadow-umcard: 0 1px 4px #0000000f, inset 0 0 4px 2px #ffffff4d, 0 0 1px 1px #0000000a, 0 0 0 1px #0000000a;
```

三层固定结构：**一点落影 + 一圈内发丝高光 + 一圈外发丝环**。
实测全页最高频阴影是 `rgba(0,0,0,.1) 0 0 1px 1px`（24 次）——0 偏移、1px 扩散的发丝圈，
比 `border: 1px solid` 更均匀（不会在十字拐角处加粗），也不会影响盒模型。这个技巧值得直接抄。

### 动效

```css
--js-ease-out: cubic-bezier(.33, 1, .68, 1);        /* ≈ easeOutQuint，收尾很慢 */
--js-transition-ease-out-2: all .25s var(--js-ease-out);
/* 按钮：transition: .1s linear（即时反馈，不要慢） */
/* chip / hover 变色：color .2s cubic-bezier(.4,0,.2,1) */
/* 大标题逐字入场：opacity/transform .5s cubic-bezier(.4,0,.2,1) */
```

实测动画数：桌面 8 个，移动 0 个。移动端把逐字入场和斜置卡片的位移全关了——**做减法的地方是对的**。

## 三、字阶（实测，含字距）

| 用途 | 字号/行高/字重 | 备注 |
| --- | --- | --- |
| Hero 主标题 | **86.4 / 1.25 / 400** | 纯白，逐字 span，`letter-spacing: normal` |
| 区块大标题（浅底） | 48 / 1.4 / 700，**`letter-spacing: .72px` = +0.015em** | 实测多处 |
| 区块大标题（黑底） | 48 / 1.15 / 700；56 / 1.5 / 700 | 黑底行高更紧 |
| 收尾 CTA 标题 | 56 / 1.07 / 700 | 行高 <1.1 |
| 滚动叙事正文 | 40 / 1.63 / 400 | 深色段落，靠透明度提亮 |
| 手写批注（Damion） | 40 / 1.5 / 400，`#d3d3d3` 或 `#828282` | 只做 eyebrow，不做正文 |
| 功能块 h3 | 36 / 1.2 / 600 | `提升您的品牌影响力` |
| 暗卡标题 | 34 / 1.0 / 600 | 行高 1.0，几乎贴字 |
| 大 CTA 按钮文字 | 28 / 1.25 / 700 | 营销按钮，非后台 |
| 小标题 | 20 / 1.10 / 500、24 / 1.25 / 700 | |
| 正文 | **15 / 1.6 / 400**（839 字符权重最高） | 不是 16 |
| 次级正文 | 13 / 1.69 / 400（367 字符） | |
| 元信息 | 12 / 1.67 / 400、11 / 1.45（PlusJakartaSans） | |
| 按钮 | 14 / 1.43 / 500（营销）、13 / 1.5 / 600~700（导航、主按钮） | |
| 页脚链接 | 14 / 1.43 / 400，`opacity: .7` | |

字体组合：

- `inter`（**自托管可变字体，wght 100–900**）承担 96% 的文本，含标题。
- `Damion`（手写体）只出现在 4 处 eyebrow，40px。**这是「克制使用第二字体」的标准范例。**
- `Merriweather`（衬线）用于模板预览缩略图，不是页面字体。
- 另外预载了 `instrumentSans / Anton / ArchivoBlack / KronaOne / FugazOne / LLPixelFun / SoukouMincho`
  共 7 款——多数 `unloaded`，是模板预览的备用字体。**这是浪费，别学**（见第六节）。

关于字距：这个站在 48px 级别的中文标题上加 **+0.015em（.72px）**，是「放开一点」而不是收紧，
因为字足够大、标题足够短。**结论：≥40px 的短标题可以 +0.01~0.02em 微放；正文与表格永远不加。**

## 四、版式节奏（1440 视口实测，单位 px）

容器：`max-w-7xl` = **1280**，居中，水平内边距 32（小屏 12–24）。

| 区块 | 高度 | 底色 | 内边距 |
| --- | --- | --- | --- |
| 促销条（sticky） | 56 | 渐变 | 0，单行 |
| 头部（sticky） | 88（内容 48） | 透明→黑 | 16 32 24 32 |
| Hero | **1282**（≈1.4 屏） | `#000` | 0 |
| 滚动叙事 | 4526 | `#000` | 0 |
| 模板画廊 / 功能块 | 6000 | `#000` → 浅 | 0 |
| 浅色 CTA 带 | 700 | `#fbfbfb` | 40 0 60 |
| 黑 CTA 带 | **365** | `#000` | 40 0 **156** |
| 用户感言 | 872 | `#fbfbfb` | 80 0 44 |
| 社区 + FAQ | 756 | `#fbfbfb` | 0 |
| 页脚 | 652 | `#000` | 12 0 0 |

值得学的三条：

1. **黑段落是「内容」不是「背景」**：每个黑段落都有自己的标题、内边距和节奏，浅段落对等存在。
   黑→浅的切换点就是论点切换点。不要在一个页面里让黑段变成纯装饰的隔断。
2. **上下留白不对称**：黑 CTA 带 40 上 / 156 下。收尾区块往下多留，把视线交还给下一个段落，
   比上下各 80 更不呆板。
3. **区块内边距的量级差**：40–80（营销段）vs 12–24（组件内）。中段基本没有 32 这类不上不下的值。

## 五、组件配方（实测尺寸）

### 主按钮 `wg-button-primary`

```css
/* 126×48，导航右上的「创建你的网站」 */
.wg-button {
  display: inline-flex; align-items: center; justify-content: center;
  height: 48px; padding: 0 24px; border-radius: 12px;
  background: #fff; color: #000;
  font-size: 13px; font-weight: 700; line-height: 1.5;
  box-shadow: /* 见第二节 A 的 6 层 */;
  transition: .1s linear;
}
```

- 导航 CTA 与页内主 CTA 是同一套；大号版 248×64 / radius 12 / **font-size 28 / 700** / pad 12 40。
- 没有 pill 主按钮。胶囊（9999）只给促销角标和 chip。**这是它和「一眼模板」的分界**。
- 次级按钮：66×38 / radius 8 / 13px 600 / 透明底 + 白字（黑底上）。

### Chip（分类筛选）

66×36 / radius **20** / 13px 600 / pad 6 20 / 选中：黑底白字，未选中：透明底白字。
首页 hero 下方那排「在线教育平台 / 电商产品页面 / 游戏社区」是 **marquee**：容器 `translateX` 持续位移，
`will-change: transform`，由 JS 驱动（实测 `transform: translateX(-90.306px)`）。

### 暗卡（AI 三步：通过对话构建 / 轻松编辑 / 一键上线）

```
392×441（中间那张 340×398）
background: #0e0e0e
border: 2px solid rgb(35,35,35)   ← 2px 实边，不是 1px，没有阴影
border-radius: 20px
标题 34 / 1.0 / 600 白
```

三张卡整体带轻微旋转（`rotate(8deg)` 级别），之间用 `>>` 箭头连接，背景是点阵纹理（黑底上极低对比）。
**用 2px 实边 + 无阴影替代「1px 边 + 大阴影」，在纯黑底上反而更清晰**。

### 用户感言卡

370×208 / `#f7f6f5` / radius 12 / pad 24 / gap 16 / 三列瀑布（各列错位）。
头部：40px 圆头像 + 18/400 名字；正文 15/1.6。角标 `type-discord` 这类来源标记。

### FAQ 手风琴

行高固定 **64（h-16）**，左问题 16px / 右 16px 箭头，行间分隔线是点划/虚线而不是实线；
展开项正文 15/1.6 灰色。左栏是 48/1.2/700 标题 + 一个黑底 pill 按钮（加入群组）。

### 页脚

黑底。左侧白色 SVG wordmark（**logo 是 inline SVG path，高度 32px，`fill` 切白/黑两版**，不是字体、不是位图）；
右侧三列（产品 / 公司 / 资源），列标题 16/400 白，链接 14/1.43 白 `opacity .7`；
底栏 14px 版权 + 语言 + 4 个 40×40 / radius 12 的描边社媒按钮。

### Hero 提示框（产品站的核心组件）

```
外层 790（含发光/外空）→ 内 720 × 高度自适应 / radius 12 / bg #F7F6F5 / padding 12
  └ textarea 696 × 54，padding 0 64px 0 4px，bg #F7F6F5，无边框无 focus 外框
  └ 左下「+」40×40 / radius 8；右下 提交 40×40 / radius 8
```

黑底上的暖白输入框：**不做描边、不做阴影，就靠「黑底上一个暖白块」**。
聚焦也没加 outline（这是它的可访问性缺口，抄的时候要补 `:focus-visible`）。

## 六、连它自己都没做好的（别抄）

1. **促销条用高饱和双色渐变**（实测内联 `linear-gradient(90deg,#0af5ba,#b2f50a)`，同位置还存在暗紫变体），
   和整页的「暖白 + 纯黑 + 手写批注」完全不是一个语言。旁边还常驻一个倒计时悬浮角标，移动端直接弹 15% OFF 弹窗盖住首屏。
   这是转化手法，不是设计决策——抄它等于抄广告位。
2. **预载 7 款没用到的字体**。`document.fonts` 里 `instrumentSans / ArchivoBlack / KronaOne / FugazOne /
   LLPixelFun / SoukouMincho` 全是 `unloaded`。字体请求数上去了，首屏没变快。
3. **用 `mt-[1600px]` 制造滚动长度**：AI 段落靠 1600px 空 margin 换叙事节奏。
   观感确实「高级」，但那是把空白当内容——在管理端或信息页里这么干等于让用户多滚三屏。
4. **逐字入场 = 每字一个 span + 每次滚动重算**。桌面 8 个动画，移动端全关。
   如果要做，必须：`@media (prefers-reduced-motion: reduce)` 里直接静态显示，且只在首屏标题上用。
5. **两套体系并存**：Tailwind 原子类 + `wg-button` 组件类 + `index-module-scss-module__xxxx` 哈希类同时出现，
   class 长到 130 字符。这不是「工程化」，这是历史包袱。
6. **正文灰阶没统一**：43 处 `#4b5563` 混在 ink ramp 之外（见第二节）。
7. **Hero 输入框无可见焦点态**，`textarea` 与「+」按钮都没有 `:focus-visible` 轮廓。`audit.mjs` 会直接报。

## 七、能搬什么（迁移口径）

### 直接可搬（语言无关）

| 招式 | 做法 | 出处 |
| --- | --- | --- |
| **内阴影做厚度** | 按钮加 `inset 0 -4px 0` 侧壁，hover `-2px`，active `0` | `--wg-shadow-button-*` |
| **发丝圈替代 border** | `box-shadow: 0 0 0 1px rgba(0,0,0,.06)` | 24 处使用 |
| **同色相 + 透明度分层** | 文字只用 `#000` 配 10 档 alpha；深色段落换 white ramp | ink / white ramp |
| **卡片三层结构** | 一点落影 + 内发丝高光 + 外发丝环 | `--wg-shadow-amcard` |
| **暖白而不是纯白** | 页面 `#f7f6f5`，区块 `#fbfbfb`，卡片比底更暖 | 背景三件套 |
| **第二字体只做批注** | 手写体 40px 只用于 eyebrow，正文永不换字 | Damion 4 处 |
| **无阴影的暗卡用 2px 实边** | `#0e0e0e` + `2px solid #232323` | AI 三步卡 |
| **上下留白不对称** | 收尾区块 40 上 / 156 下 | 黑 CTA 带 |
| **移动端做减法** | 动画 8 → 0，斜置与逐字全关 | 移动采集 |

### 不能搬进管理端的

| Wegic | 后台/工具端应该 |
| --- | --- |
| 86.4px hero、56/48 区块标题 | 页面标题 20–28，区块标题 16–20 |
| 纯黑整段（1282 / 4526 / 6000 高） | 不要；深色只留给代码块、预览区、侧栏 |
| 40px 正文（叙事段） | 正文 14–16 |
| 逐字入场、marquee、斜置卡 | 状态过渡 150–200ms 就够 |
| 64px 高的 FAQ 行 | 列表行 44–53（见 `design-evidence.md` 实测） |
| 248×64 / 28px 字的大 CTA | 控件高 28–36，按钮文字 13–14 |
| 「+ / 提交」无焦点框 | 必须补 `:focus-visible` |
| 促销条渐变 + 倒计时角标 | 不要；要放公告就用中性底 + 一个语义色 |

### 一套可落地的混合口径（产品站 + 后台同一个品牌）

```css
:root {
  --bg-page: #f7f6f5;  --bg-section: #fbfbfb;  --bg-card: #f7f6f5;  --bg-dark: #000;
  --ink: #000;         /* 配 10 档 alpha 派生次级文字 */
  --ink-2: rgba(0,0,0,.70);  --ink-3: rgba(0,0,0,.50);  --ink-4: rgba(0,0,0,.30);
  --wg-mint: #66edae;  --wg-mint-ink: #00362a;   --action: #fb6514;  /* 活动色，只给促销 */
  --r-control: 12px;  --r-card: 12px;  --r-dark-card: 20px;  --r-chip: 9999px;
  --hairline: 0 0 0 1px rgba(0,0,0,.06);
  --raise: inset 0 -4px 0 rgba(0,0,0,.06), 0 0 0 1px rgba(0,0,0,.04), 0 1px 2px rgba(0,0,0,.12);
  --ease: cubic-bezier(.33,1,.68,1);
}
/* 后台把 hero 那套关掉，只留「塑料按钮 + 发丝圈 + 暖白」三件 */
```

## 八、复现清单（做完自查）

- [ ] 只有一个主字体；第二字体（如果留）只出现在 eyebrow 一层，≤4 处。
- [ ] 圆角只有 3–4 档，且每档有明确归属（控件 / 卡片 / 暗卡 / chip）。
- [ ] 主按钮有 hover / active 的厚度变化，且 active 真的「陷下去」。
- [ ] 所有描边优先用 `0 0 0 1px` 发丝圈，而不是 `border`（除非需要占位影响布局）。
- [ ] 次级文字用同一色相的 alpha 派生，而不是另配 3 个灰。
- [ ] 深色段落有 `prefers-reduced-motion` 的静态回退。
- [ ] 深色段落里的输入框/按钮有可见焦点态（Wegic 缺这个）。
- [ ] 移动端：逐字入场、marquee、斜置全部关闭；点击区 ≥44。
- [ ] 促销/公告区与主设计语言有明确边界（不共用按钮样式）。

## 九、和本 skill 其他文件的关系

- 跨站统计与「营销站 ≠ 后台」的量化判据在 `references/design-evidence.md`（本样本已并入 A 组）。
- 可直接粘的代码片段在 `references/css-recipes.md` 第 12 节「塑料按钮与发丝圈」。
- 交付前逐项验收在 `references/review-rubric.md`。

## 十、怎么重新采这个站

```bash
# 近似（字体/字号/颜色/圆角/间距/控件高度/令牌名）
node scripts/probe-ref.mjs --url https://wegic.ai/zh-cn --out .tmp/ref --name wegic

# 逐字入场与 --wg-* 令牌 probe-ref 抓不到，补一段 evaluate：
#   - h1 是 sr-only；真实标题是 div 里的逐字 <span>（scale(.72) + opacity 0→1）
#   - 令牌用 getComputedStyle(document.documentElement) 遍历属性名，筛 --wg / --radius / --font
#   - 站点字体是 self-hosted inter 可变字体；Damion 只在 4 处 eyebrow
```