# 设计证据库（实测数据，不是个人口味）

> 用途：`SKILL.md` 里凡是给出「字号 / 行高 / 圆角 / 间距 / 控件高度」的地方，数值都来自这里。
> 争议时以本文件为准；要扩样本就重跑 `scripts/probe-ref.mjs`。

## 一、样本与方法

采集时间 2026-10。方法：无头 Chromium 1440×900 打开目标站，等 3–4s（字体与骨架稳定），
读取**实际计算样式**（`getComputedStyle`）：按字符数加权统计字体与颜色、统计字号分布、
取 `h1/h2/p/th/td/label/button/input` 首个实例的字号·行高比·字重、统计圆角与 gap 频次、
量测侧栏/表头/表格行高/控件高度、读取 CSS 变量命名。原始 JSON 未随包分发，重跑即可再生。

**A 组：Awwwards 商业/科技/电商/UI 分类获奖站**（12 个里 9 个采集成功）

| # | 站点 | 类别 | 主题 | 主字体 / 次字体 | H1 | 正文 | 圆角 | 强调色 |
|---|------|------|------|-----------------|----|------|------|--------|
| 1 | zenarate.com | B2B SaaS | light | Manrope / Suisse Intl Mono | 64/1.14/400 | 20/1.44 | 8·20·80·200 | #fde173 黄 |
| 2 | orizon.one | B2B 安全 | light | Inter / TheGoodMonolith | 67/1.04/700 | 18/1.55 | 9999·8·16 | #4ac300 绿 |
| 3 | atmospherik.ai | AI | dark | Geist / Geist Mono | 140/0.85/400 | 20/1.2 | 999·6·50 | #55d8d4 薄荷 |
| 4 | swimtopia.com | SaaS | light | Season Sans | 67/1.22/700 | 15/1.6 | 15·24·28 | #025fff 蓝 |
| 5 | kindi.land | 消费 | light | Outfit | 96/1.00/400 | 16/1.5 | 32·24·6·2 | #3d3dc2 靛 |
| 6 | banham.co.uk | 电商 | light | Ivar Text / Ivar Headline（衬线） | 48/1.1/400 | 14/1.43 | 4·2·5.6 | #333e48 石板 |
| 7 | supermodels… | 工作室 | dark | DM Sans / Manrope | 58/1.04/500 | 12–14 | 999·32·24 | 绿 |
| 8 | twodo.design | 设计工作室 | dark | Manrope / Fraunces + IBM Plex Mono | 106/0.95/300 | 12/1.6 | 999·22·2 | #e8be6c 金 |
| 9 | emotion-agency.com | SOTD | light | IBM Plex Mono / Emotion Serif | 96/0.80/300 | 12/1.15 | 9999·24·1 | #9047ff 紫 |

**B 组：真实可访问的后台 / 应用界面**

| 站点 | 主题 | 正文 | 表头 th | 单元格 td | 表格行高 | 控件高 | 侧栏 | 圆角 | 卡片 |
|------|------|------|---------|-----------|----------|--------|------|------|------|
| ui.shadcn.com/examples/dashboard | light | 18/1.56 | 14/1.43/500 | 14/1.43/400 | **53px** | **32px** | — | 8·4·10·14 | 阴影 7 / 边框 6 并存 |
| linear.app | dark #08090a | 15/1.6 | — | — | — | 28–32 | **232px** | 9999·8·4·12 | 阴影 2 / 边框 20（边框优先） |
| cal.com | light #f4f4f4 | 14/1.4 | — | — | — | 34 | — | 8·16·12·4·100 | 无 |
| preview.pro.ant.design | — | 采集失败（SPA 登录跳转/超时），不计入统计 | | | | | | | |

## 二、跨站统计（9 个获奖站）

- 主题：**light 6 / dark 3**。浅色仍是企业站默认，深色是差异化选择而非标配。
- 正文字号：均值 **15.2px**（10,12,12,14,15,16,18,20,20）；正文行高比均值 **1.44**（1.15–1.6）。
- H1：均值 **82.4px**（48–140），行高比 **0.80–1.22** ——大标题压到小于 1 的行高是普遍做法。
- **H1 / 正文 字号比：3.2 – 8.8 倍**（营销站语境；后台绝不能照搬，见第四节）。
- 主字体：Manrope×2、Inter、Geist、Outfit、DM Sans、Season Sans、Ivar Text、IBM Plex Mono ——
  全是无衬线/几何/新怪诞，**没有一个用 Arial/Roboto/系统默认当主字体**（系统栈只作 fallback）。
- **第二字体是等宽（mono）的有 5/9**：Suisse Intl Mono、Geist Mono、IBM Plex Mono、TheGoodMonolith、Berkeley Mono。
  用途统一：编号、标签、元信息、版本号、时间戳。
- 间距频次：16px(7) ≈ 8px(7) > 4px(4) ≈ 12px(4) > 20·6·24(各 2–3)。
  派生值 `6.4px / 7.47px / 11.2px` 出现在两站——说明间距来自**缩放系数**而非手写像素。
- 圆角频次：50%(6，用于头像/圆形)→ 2px(4) → 24px(4) → 4px(3) ≈ 9999px(3) ≈ 999px(3) ≈ 50px(3)。
  **双轨制**：小控件 2–8px 方一点，同时存在胶囊 999/9999px 用于标签与 CTA。
- 容器宽：1440 视口下主内容 **1250–1450px**，正文段落栏宽收在 600–800px。
- 图片：`loading="lazy"` 近乎全量（如 165 张里 164 张），不是可选优化。
- 动画数量 0–34，**中位数 1**：动效克制的那几站并不显得低级。

## 三、可以直接抄的招式（带出处）

1. **等宽字体做「元信息层」**：编号/时间/代码/标签用 mono，正文用无衬线（5/9 站）。
2. **双轨圆角**：控件 4–8px，标签/CTA 用 `9999px` 胶囊（orizon、kindi、emotion、atmospherik）。
3. **间距走 8 基数**：4 / 8 / 12 / 16 / 24 / 32；需要更细时用缩放系数派生，别手写 13px、19px。
4. **一个强调色打天下**：orizon 只用一个绿 #4ac300、emotion 只用一个紫 #9047ff、kindi 一个靛 #3d3dc2，
   其余全是中性灰阶。**两个以上高饱和并列 = 立刻像模板**。
5. **大标题负字距 + 紧行高**：H1 行高比 0.8–1.15，`letter-spacing: -0.02em ~ -0.04em`（kindi、twodo、emotion）。
6. **表格密度固定值**：th 14px/500、td 14px/400、行高 43–53px（shadcn dashboard 实测 53px）。
7. **控件高度固定值**：桌面后台 28–32px（linear 28/32、shadcn 32），移动触控 ≥44px。
8. **侧栏 232px、顶栏 73px**（linear 实测），不要写 250px/64px 这类「随手整数」。
9. **卡片优先用边框**：linear 页面里「有边框」的卡片 20 个、「有阴影」的 2 个。
   阴影只在浮层（dropdown/modal/toast）上出现。
10. **图片一律 lazy**，并给 `width/height` 或 `aspect-ratio` 防塌陷。
11. **令牌命名两派**（都成立，选一派用到底）：
    - 功能语义：`--bg / --surface / --border / --ink / --ink-soft / --ink-faint`（twodo）
    - 角色语义：`--color-text / --color-text-muted / --color-border`（supermodels）
    - 交互三连：`--primary / --primary-active / --primary-rgb`、`--status-danger / --status-danger-active`（emotion）
12. **状态与强调成对出现**：`--color-on-brand` 必须与 `--brand` 成对定义（本仓 `contrast_check.py` 也据此配对比度）。

## 四、不要照搬的（营销站 ≠ 后台）

| 指标 | 获奖营销站 | 管理端/后台 | 推断依据 |
|------|-----------|-------------|----------|
| 正文字号 | 15–20px | 13–14px（表格、表单标签），正文段落 14–16px | shadcn th/td 14px，linear 15px |
| H1/正文比 | 3.2–8.8× | **1.4–2.2×** | 后台页面标题 20–28px，正文 14px |
| 行高 | 0.8–1.15（大标题） | 1.4–1.6（表格与表单）；大标题仍可 1.1–1.25 | shadcn 1.43/1.56，linear 1.6 |
| 动画 | 0–34 个，允许滚动驱动 | 只保留 150–200ms 的状态过渡；`prefers-reduced-motion` 必须关掉循环动画 | 后台是高重复操作场景 |
| 圆角 | 常出现 999px / 24px+ | 4–8px 为主，胶囊只给状态标签 | linear 8/4/12，shadcn 8/4 |
| 留白 | 区块间距 80–160px | 区块间距 16–32px，卡片内 12–16px | 信息密度决定 |

## 五、中文场景补充（无对应获奖样本，按可用性推导，标注为推断）

- 中文正文行高比取 **1.6–1.75**（西文 1.44 不可直接搬：汉字无升降部，1.4 会显挤）。
- 中文字重只用 **400 / 500 / 700 三档**；600 在多数中文可变字体上缺失，会跳回 700。
- 中文标点与数字混排时数字用 `font-variant-numeric: tabular-nums`（表格金额列对齐）。
- 小程序/H5：正文 15–16px、次级 13px、最小 12px；触控目标 ≥44×44px；`viewport-fit=cover` + 安全区。

## 六、扩展样本

```bash
# 任意参考站的实际样式 + 截图（本 skill 自带）
node scripts/probe-ref.mjs --url https://example.com --out .tmp/ref --name example
# 只看关键数值
node scripts/probe-ref.mjs --url https://example.com --brief
```

判据：如果新样本与上表的关键值（正文字号、行高比、间距基数、圆角档位）冲突超过一档，
不要立刻改表——先确认它属于哪一组（营销/后台/移动），组内一致才算证据。
