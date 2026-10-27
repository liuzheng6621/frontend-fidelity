# 工艺底线（craft floor）

**这份文件回答一个问题：一套界面「做完了」还是「做好了」。**

它来自两处外部工艺规则集的蒸馏（来源见文末），只保留**可判定**的条款，并按本站实测语料做了裁决——凡与实测冲突的，第八节写明怎么处理，不要盲抄。

分工：
- 本文 = **底线与判据**（做完之前必须过，含着色规范、阴影判据、浏览器表面）。
- `references/review-rubric.md` = **验收清单**（逐条打勾，含红旗）。
- `references/design-evidence.md` = **实测证据**（17 站量出来的数），本文的判据要在那里对得上。
- `references/design-tokens.md` = 五套人格的令牌落地，含**深度语言三派**（hairline / soft / hard）：卡片一个页面只准一派，混用就是廉价感的来源。

一条总则：**底线只保下限，不替你选方向。**九节全绿只说明「不像没做完」，不说明「好看」。方向感在 `page-patterns.md`（骨架）与各站蒸馏文档（气质）。

---

## 一、九条「做完才看」的验证

每条都是对**构建结果**的检查，不是写作意图。一次渲染批量检查，不要为每条单独截图来回跑。

| # | 检查 | 判据 | 怎么量 |
|---|---|---|---|
| 1 | 对比度 | 正文与 placeholder ≥ 4.5:1；大字（≥ 24px 或 ≥ 18.66px bold）≥ 3:1 | `scripts/contrast_check.py`；彩色底上的次级文字要**从该色相里调**，不许直接压灰色 |
| 2 | 深度 | 阴影必须有**偏移 + 柔和模糊**；零偏移的彩色 halo 是装饰，不是阴影 | 看 computed `box-shadow`；`0 0 Npx <color>` 一律视为光晕 |
| 3 | 间距节奏 | 组内紧、组间松；**标题上方的留白 > 下方** | 读 computed `margin`/`padding`，不要靠眼看 |
| 4 | 排版 | 行宽 65–75ch；展示字号上限 6rem（96px）；字距下限 −0.04em；标题平衡（不让末行只剩一个词）；字阶与字重有明显台阶 | 在**每个断点**上跑真实文案，看溢出 |
| 5 | 动效 | **一个有作者意识的时刻**，不是满页效果、也不是每节同一个入场；缓动用指数型 ease-out（`cubic-bezier(.16,1,.3,1)` 一类），默认状态已可见再入场 | 数 `animation`/`transition` 的归属；同一 entrance 复用到 3 节以上即扣分 |
| 6 | 状态 | hover / disabled / loading / error / empty 五态，加上真实内容、可用控件、响应式、键盘焦点 | `scripts/audit.mjs` + 手动 Tab 一遍 |
| 7 | 浏览器原生表面 | 选区 `::selection`、光标色 `caret-color`、滚动条、焦点环、下划线偏移 `text-underline-offset`、表格数字 `font-variant-numeric: tabular-nums` —— **你没画的部分也在承载设计** | grep 上面六个属性是否存在 |
| 8 | 文案 | 控件名说动作；错误说清问题与出口；占位不是假数据 | `references/copy-and-content.md` |
| 9 | 覆盖 | 需求里每一条都在，且几秒内能找到 | 对照需求逐条点数 |

**第 7 条是最容易被跳过、也最能区分「搭出来的」与「做出来的」**：浏览器默认的选区蓝、默认滚动条、默认焦点环不属于任何设计系统，改一次成本是十分钟。

---

## 二、深度：三种分界方式只能选一种

卡片/浮层与底板之间，**要么发丝（`inset 0 0 0 1px`）、要么边距、要么阴影**，不要三样叠着。判据：

- **阴影必须有方向和模糊**：`0 1px 2px`（贴地）～`0 8px 32px`（浮层）。落影靠"偏移 + 模糊"表达高度差。
- **零偏移彩色光晕 = 装饰**，不是深度。要用也行，但那是"发光的按钮"，别当卡片阴影。
- **卡片圆角 12–16px 是常态**（我们语料：zcool 12/16、wegic 20、stylekit 0、jsdesign 22.3 在 1184 容器里）。**胶囊（`border-radius: 999px`）只给小控件**，别给卡片——原规则原话："pills are for small controls"。
- **禁"幽灵卡"**：1px 边框 + 宽柔阴影同时上，是两套语言叠在同一张卡上。
- **纯黑底用 2px 实边比 1px + 阴影清楚**（wegic 暗卡实测：`2px solid #232323`、无阴影）。

---

## 三、四件最常被忘的原生表面

```css
::selection { background: color-mix(in srgb, var(--brand) 24%, transparent); color: inherit; }
html { caret-color: var(--brand); color-scheme: light dark; }
:focus-visible { outline: 2px solid var(--brand); outline-offset: 2px; }
a { text-underline-offset: .22em; text-decoration-thickness: 1px; }
.data-table td.num, .kpi__value { font-variant-numeric: tabular-nums; }
```

滚动条要自定义就两处都想清楚：`scrollbar-width` / `scrollbar-color` 对 Firefox 生效，`::-webkit-scrollbar` 对 Chromium 生效；**别做出"自绘滚动条盖住内容"的效果**。

---

## 四、页面骨架层的默认别做（做了要能说出理由）

这些不是禁令，是**品类的默认答案**：如果你没有主动选择，那你就是在抄默认。

| 默认 | 为什么别直接做 | 换个做法 |
|---|---|---|
| 等大的「图标 + 标题 + 段落」卡片铺满一页 | 卡片是最省事的容器；**嵌套卡片永远错** | 用间距、`border-t`、`divide-y` 分组；卡片只在"浮起表达层级"时才用 |
| hero 三指标（大数字 + 小标签 + 补充统计 + 强调色） | 这是模板，不是论证 | 数字进正文句子，或改成一列有主次的陈述 |
| 每节都挂一个 eyebrow / kicker | 全站同一节奏 = 一眼模板 | 见第八节裁决（密度 ≤ ⌈节数/3⌉） |
| 小节编号 01 / 02 / 03 | 除非顺序本身携带信息 | 删掉；标题自己够重 |
| 反射性弹窗 | 打断不解决问题 | 就地展开、抽屉、或跳转 |
| 长列表换皮不换形（10 行都带下边线） | 表格感 | 见 `references/page-patterns.md` 的列表变体 |

---

## 五、表面层的禁令（视觉习惯）

| 禁令 | 原因 | 例外 |
|---|---|---|
| 渐变文字 | 强调靠字重/字号，不靠把字染成彩虹 | 整站图腾级处理，且只用一处 |
| 毛玻璃当装饰 | 玻璃是特定效果，不是背景纹理 | 真有媒体层要透出来，且补 `prefers-reduced-transparency` 回退 |
| 卡片/提示条上 > 1px 的左侧色条 | 廉价的状态标记 | 状态用徽标/图标表达 |
| 硬偏移阴影（`4px 4px 0`） | 零模糊块影是**戏服**，不是深度系统 | 整站就是 neobrutalist，且这套语言贯穿全站 |
| sparkline / 进度环 / 柔光圆角块冒充内容 | 空壳装饰 | 有真实数据时画真图 |
| 等宽字体当「技术感」装饰 | 等宽属于代码/数据/度量 | 代码、ID、数值 |
| 系统展示字体（Impact、Arial Black、平台默认 sans）当自有世界的展示字体 | 最近的已装字体不是回退，是失败 | 标题就用系统栈（中文站常见），但那时**别再声称它是"展示字体"** |
| emoji / Unicode 字符当图标系统 | 不一致、跨平台变形 | 一整套图标库，一档描边宽度 |
| 几何遮罩冒充有机轮廓（圆形/多边形/径向渐变抠人像） | 比不做更丑 | 真做 alpha matte 或干脆不抠 |
| 按品类决定深浅色（"金融=深色"） | 选中性来自使用场景：谁、在哪、什么环境光 | 明暗由场景定，见 `design-tokens.md` §暗色推导 |

---

## 六、材质诚实

- 主张与配置**只能来自提供的真值**；示例数据要明确标成示例（`{{TODO:}}` 或 `<!-- 示例 -->`）。
- 不许编造工程精度（`92%`、`4.1×`、`5.8mm`）——除非品牌真的这么宣称。
- 先给概念再自我消解（"我们不是那种……"）不算主张，是腔调。

---

## 七、裁剪：不做比做错好

底线之上还有一条：**宁可少一个元素，不要多一个没用的元素。**具体到本项目：
- 装饰层（散景、光斑、网格线、落光）默认不要；要就说明它承载什么。
- 缺图就留 `{{TODO: 图}}`，**不要用 div 拼假截图**（这条另见 `references/anti-slop.md` 六节）。
- 缺内容就少一节，不要为了"看起来完整"复制同一节。

---

## 八、与本站实测语料的四条冲突与裁决

外来的规则集是按"通用反模板"写的，本站语料是 27 个真实站（A 组 24 个）量出来的。冲突处一律按证据裁决，并把裁决写进验收口径。

### 8.1 eyebrow（上方小标签）——三种立场，取中间

- 外来规则 A（impeccable）：**完全禁**，"没有 brief 能把这条赚回来"。
- 外来规则 B（design-taste）：**每 3 节最多 1 个**，hero 算 1 个，机械核对 `uppercase tracking` 出现次数 ≤ ⌈节数/3⌉。
- 本站实测：**多个真站在用**——stylekit 页头 `11px / letter-spacing .18em / #6b7280`；jsdesign 手写体 eyebrow；zcool 频道头副标；uinotes 无。

**裁决**：以 B 为准（密度上限），并加两条限制——
1. **产品站/后台不用**（Operate 语境下它是噪音）。
2. **要么每节都不挂，要么全站只有 1–2 个**：实测站里出现 eyebrow 的，都是"页头一个"，没有人每节都挂；每节都挂正是模板味的来源。

### 8.2 serif 当标题字体

- 外来规则：serif **极不推荐当默认**，`Fraunces` / `Instrument Serif` 直接禁（LLM 最爱）。
- 本站实测：stylekit 标题就是 Playfair Display（衬线）；`ui-notes`、`zcool`、`uishijie` 全是系统栈零 webfont；中文站用衬线要自己补字体栈（Windows 宋体 / macOS Songti SC）。

**裁决**：衬线只在**编辑/陈列/品牌气质明确**时用（对齐 `design-tokens.md` 的 `editorial` 人格）；中文衬线必须显式补 `"Songti SC","Source Han Serif SC"` 否则 Windows 上退成宋体默认渲染；`Fraunces` / `Instrument Serif` 不进我们的候选池。

### 8.3 纯黑 / 纯白

- 外来规则：`NO pure #000000 / #ffffff`，"纯值杀死深度"。
- 本站实测：wegic hero 就是 `#000`；zcool、stylekit、jsdesign 主体是 `#fff` / `#fafafa` / `#f7f6f5`；stylekit 前景 `#0a0a0a`。

**裁决**：**舞台可以是纯黑（明确意图、整段用），文字与表面不要用纯值。**正文用 `#0a0a0a`～`#191919`，底板用 `#fafafa`～`#f7f6f5`。

### 8.4 阴影密度

- 外来规则：几乎不鼓励阴影（"declare elevation once"）。
- 本站实测：**三派并存**——linear/shadcn 靠边框；wegic 靠发丝圈 + 内阴影做厚度；jsdesign 负扩散三件套 + 专用戏剧阴影；zcool 全站 4 处阴影（只给浮层）；stylekit chrome 零阴影、硬阴影只属展品；uinotes 0 阴影。

**裁决**：**先定派别，再定数值**。同一页不要同时出现"无阴影极简"和"戏剧投影"。选定后写进令牌（`--sh-1..3`），全站只从这里取。

---

## 九、落地怎么用

- **新建页面**：先 `design-tokens.md` 定三套人格之一 → `page-patterns.md` 出骨架 → 本文第一节九条当"画完自检"→ 最后才 `anti-slop.md` 过 pre-flight。
- **整改页面**：`review-rubric.md` 逐条打分 → 本文第一、二节修"深度与原生表面"→ 只动问题项，不重构骨架。
- **验收**：`screenshot.mjs` + `audit.mjs` 跑完，本文九条与 `review-rubric.md` 红旗都过，才算完成。

---

## 十、来源

- **impeccable**（`E:\impeccable-main\impeccable-main`，Apache-2.0）：`skill/reference/craft-floor.md`（九条 verify + refuse 清单 + codex 细则）、`skill/SKILL.src.md`（四种模式 Persuade / Operate / Read / Experience、brief 优先、refinement 保身份 vs redesign 换世界）。**只蒸馏判据，未复制原文与脚本。**
- **design-taste-frontend**（`...\.claude\skills\design-taste-frontend\SKILL.md`，1206 行，原文件未声明许可证）：反模板部分单独蒸馏到 `references/anti-slop.md`，此处只取与"底线"重叠的条款。
- 本站语料：`references/design-evidence.md`（27 站实测）+ 十六份单站蒸馏文档。
- 裁决日期：2026-10-31。