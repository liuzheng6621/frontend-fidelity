---
name: frontend-fidelity
description: >-
  把界面做对、做实：既能按设计稿/截图还原并整改已有界面，也能从 0 生成一套能验收的前端骨架——
  企业后台与管理端、移动 H5/小程序、营销落地页、多端一致性、Logo 与视觉资产整合。
  当用户说「优化/美化这个页面」「照着这张截图做」「后台太难看了」「统一一下风格」
  「这个按钮/表格/空状态不对」「移动端适配」「验收一下前端改动」「截图对比」
  「从零做一个页面/后台/落地页」「搭个骨架」「先给我一套设计令牌」时使用。
  自带可运行脚本：多视口多主题截图、结构与 WCAG 审计、设计体系一致性（字号 / 间距 / 圆角 / 阴影档位）、
  对比度检查、交互流程验收、登录态导出、
  参考站实测探针、仓库残留清理、跑项目自带的质量门，以及 scaffold.mjs 一键生成骨架。
  参考库是 28 个真实站的实测数据 + 十七份单站蒸馏（营销页 / 工具站 / SaaS 首页 / 编辑内容首页 / 技术社区 feed / 品牌产品舞台 / 密版图墙 / 疏版图墙 / 陈列页 / 灵感库 / 风格库 / 杂志目录 / B 端工具工作区 / 认证注册 / 电商商品配置 / 动效 / 奖项目录；28 = A 组 25 + 3 后台工具站），
  外加动效规格、工艺底线、反模板清单与视觉细则层（含浏览器原生表面、三把锁、动效五档与三档降级），
  按页面类型对到具体文件与配方小节。证据分两层：计算样式（字号 / 行高 / 间距 / 圆角 / 阴影）
  与 REA 被动采集的结构层（地标 / 标题层级 / DOM 深度 / aria 覆盖 / 图片 alt），
  结论写在 `design-evidence.md` 第二、七节，原始数据在 `rea-structure.json`。
  不用于：纯逻辑 bug 修复；插画/海报等纯视觉创作（那属于 canvas-design）。
license: MIT
---

# 前端保真度（frontend-fidelity）

目标：**让界面和它声称的样子一致，并且真的能用**。改完必须能给证据——截图、审计报告、通过的构建。

三条不可妥协：

1. **先看再改**。没跑过 `screenshot.mjs`、没看过现状截图，不要动一个像素。凭想象重写是大面积回归的主要来源。
2. **不引入新体系**。已用 Tailwind 就别插 CSS-in-JS，已有组件库就扩展它。
   换设计体系要单独提案，不能夹在「美化一下」里偷偷做。
3. **改完自证**。截图 + 审计 + 构建必须全绿才算完成；「应该没问题」不是完成。

## 30 秒起步

在**目标项目根目录**执行。依赖只装一次：`npm i -D playwright && npx playwright install chromium`，裁图另需 `pip install pillow numpy`。

```bash
# 模式 A：改已有界面——先拍基线再动手
node scripts/screenshot.mjs --url http://localhost:5173/ --out .design/before
node scripts/audit.mjs --url http://localhost:5173/ --themes light,dark

# 模式 B：从零生成——骨架 + 自动验收一条命令
node scripts/scaffold.mjs --persona rational --out ui --pages landing,app,states --verify

# 想「像某个站」：探针实测值直接盖进骨架，不用手抄
node scripts/scaffold.mjs --ref-url https://linear.app --out ui --pages app,form --verify
```

脚本全部参数见 `README.md`；逐步工作流、交付说明模板与参考库完整索引见 `references/workflow.md`。

## 先判断是哪一种活

| 用户说的 | 走哪条 |
| --- | --- |
| 「优化/美化/整改这个页面」「照这张截图做」「统一一下风格」「验收一下改动」 | **模式 A：整改与还原**——已有代码，先截图再动手，五步流程见 `references/workflow.md` |
| 「从零做一个」「搭个后台/落地页」「先给我一套设计令牌」 | **模式 B：从 0 生成**——空目录，按下面路由表选型，`scaffold.mjs` 生成再改 |

**还原类任务（有设计稿/参考图）加像素级比对**：`node scripts/fidelity.mjs --design 设计稿 --url 页面`，超阈值像素占比 ≤ 2%（`--max-diff`）才算「照着做对了」；输出三联图（设计稿 / 实现 / 差异热力）直接贴进验收记录。

## 模式 B：预设路由表

一句话需求 → 人格 → 页面 → 先读的参考。没覆盖的组合查 `references/page-patterns.md` 第一节的选择表。

| 要做的东西 | `--persona` | `--pages` | 先读的参考 |
| --- | --- | --- | --- |
| 后台 / B 端 / 管理端 | `rational` | `app,form,states`（按需加 `auth`） | `mastergo-b2b.md` |
| 登录 / 注册 / 多步表单 | `rational` | `auth,form` | `vercel-auth.md` |
| 落地页 / 营销站 | `editorial`（冷）或 `warm`（亲和） | `landing` | `wegic-design.md` / `jsdesign-design.md` |
| 图墙 / 灵感库 / 作品陈列 | `magazine` | `catalog` | `muzli-gallery.md` / `uishijie-design.md` / `uinotes-design.md` |
| 风格库 / 模板市场 | `print` | `catalog` | `luckymaomi-catalog.md` / `stylekit-design.md` |
| 内容社区频道页 | `magazine` | `catalog` | `zcool-design.md` |
| 科技媒体 / 编辑型内容首页 | `editorial` | `landing` | `sspai-design.md` |
| SaaS / 知识工具营销首页 | `editorial` | `landing` | `yuque-design.md` |
| 技术社区 / 信息流 feed | `rational` | `catalog` | `juejin-design.md` |
| 品牌产品发布页 / 硬件舞台 | `editorial` | `landing` | `apple-design.md` |
| 电商商品详情 / SKU 选择 | `warm` | `landing,form` | `applestore-commerce.md` |
| 移动 H5 / 小程序 WebView（列表 + 底部 tab + 底部面板） | `rational`（工具）或 `warm`（消费） | `mobile` | `design-evidence.md` 的 390 单列 / gap 12 / tab 4 项，`applestore-commerce.md` 的控件高 |
| 奖项目录 / 榜单 / 每日一作 | `magazine` 或 `editorial` | `catalog`（加 `landing` 做今日一作） | `awwwards-design.md` |
| 要「结构怎么搭」的证据（地标 / 标题层级 / DOM 深度 / `alt` 覆盖 / `button` vs `a`） | 任意 | — | `design-evidence.md` §七（17 站 REA 结构层）+ 各单站蒸馏末尾「结构证据」小节 + `rea-structure.json` |

```bash
node scripts/scaffold.mjs --persona <人格> --pages <页面> --out ui --verify
# 常用追加：
#   --ref-url <URL> / --ref-json <path>   探针实测值覆盖人格字段（逼近 80%，剩下改 tokens.css）
#   --export tailwind,antd,element        同一份令牌导出到 Tailwind / Ant Design v5 / Element Plus
#   --stack react|vue|all                 额外生成框架工程（真路由 + useAsync 三态）
#   --accent <hue 0-360>                  只换品牌色相；--no-dark 关掉深色令牌
```

`--verify` = 生成后自动起服务跑 `audit.mjs`（明暗双主题）+ `contrast_check.py`，报告在 `<out>/.verify/report.json`。
退出码 **0** 全部通过 / **1** 有检查没过 / **3** 只验了一部分（缺 python 或 playwright，**不算通过**；
确实要接受不完整验收再显式加 `--allow-partial`）。**生成物是起点不是成品**：骨架解决层级、间距、状态、可访问性；所有 `{{TODO: ...}}` 占位必须换成真内容（文案规格见 `references/copy-and-content.md`）。

## 视觉基线四件事（动手前定死）

1. **色板**：背景三层（page / surface / raised）× 文字四层 + 1 个品牌色 + 语义色（成功/警告/危险/信息），全部写成变量。
2. **字阶**：5–7 档就够（如 12/13/14/16/20/24/32），每档绑定行高和字重。**禁止未声明的手工微调值；既有字阶或设计稿明确使用的 15px、17px 可以保留。**
3. **间距**：默认用 4 的倍数体系（4/8/12/16/24/32/48/64）；既有设计体系优先，例外要声明，不凭感觉新增 13px、22px。
4. **层级**：靠背景明度差 + 1px 边框建立，阴影只给真正浮起的元素，三套封顶，一派用到底不混。

起步模板在 `references/css-recipes.md`。**数值拿不准就去量，不要猜**：`probe-ref.mjs --url <参考站>` 量真实字阶/配色/控件高度，再对 `references/design-evidence.md` 的跨站中位数校准（基线为 18 个 A 组站；正文 14–16px、控件高 32/40/44、表格行高约 53、间距基数 4、动效 120/180/240/400/600ms）。

## 质量门（退出码 0 才算完成）

| 检查 | 命令 | 标准 |
| --- | --- | --- |
| 截图对比 | `screenshot.mjs` before/after | 三视口（1440/768/390）× 双主题逐张看 |
| 结构与无障碍 | `audit.mjs --themes light,dark` | 0 error；warn 逐条修过或写明原因 |
| 对比度 | `contrast_check.py <css 目录>` | 全组达标 |
| 构建 | `run_checks.mjs` | 仅当项目有 `package.json`（静态骨架明确跳过） |
| 还原度（有稿时） | `fidelity.mjs --design … --url …` | 超阈值像素占比 ≤ 2% |

模式 B 的 `scaffold.mjs … --verify` 自动跑结构审计与对比度（退出码 3 = 只验了一部分，别当通过）；不代替截图逐张查看。键盘走一遍（Tab 可达、焦点可见、Esc 关弹层）与 200% 缩放走一遍是手工项，别省。

**改动涉及视觉令牌时，加设计体系门**：`audit.mjs --url … --design-system`，统计可见文本字号、间距、非全圆角与阴影；默认只报待确认警告。已有体系用 `--design-system config.json` 声明档位，核定后再加 `--strict-design-system` 作为门禁。配置与豁免见 `docs/scripts.md`，不得为消警告强换已有体系。

**改动涉及提交、跳转、弹窗、异步加载时，加一道流程验收**：`flow.mjs --flow flow.json --base <站点根>`，
声明式写「填表 → 点提交 → 出现成功提示」，退出码 0 全过 / 1 有步骤失败 / 2 流程文件写错。
它不进上面的必跑门（成本高、依赖真实数据），但「点得通」只有它能证明——审计全绿而提交按钮无效是常见事故。
格式与动作表见 `docs/scripts.md`，可直接跑的示例是 `scripts/flow.example.json`。
交付说明固定四段：改了什么 / 为什么 / 验证（命令 + 结论）/ 未做与风险——模板与验收清单见 `references/workflow.md` 与 `references/review-rubric.md`。

## 参考文件指针（按需查，不要一次背完）

- **工作流与选型**：`references/workflow.md`（模式 A 五步 / 模式 B 六步 / 交付模板）、`references/page-patterns.md`（九类页面骨架表，含目录陈列）、`references/design-tokens.md`（五套人格完整令牌）
- **数值证据**：`references/design-evidence.md`（28 个真实站实测，「哪些能抄、哪些不能」）、`scripts/probe-ref.mjs`（量任意站）
- **规格**：`references/component-spec.md`（11 类组件规格卡）、`references/motion-spec.md`（动效）、`references/copy-and-content.md`（文案）、`references/visual-system.md`（视觉细则全本：中文排版 / 色彩 / 层级五派 / 页面结构 / 控件 8 状态 / 响应式 / 深色 / 可访问性 / AI tell）
- **单站蒸馏**：营销工具站 `wegic-design.md`、`jsdesign-design.md`；SaaS 首页 `yuque-design.md`；编辑内容首页 `sspai-design.md`；技术社区 feed `juejin-design.md`；品牌产品舞台 `apple-design.md`；内容图墙 `uishijie-design.md`、`zcool-design.md`、`uinotes-design.md`；杂志目录 `muzli-gallery.md`；风格库 `luckymaomi-catalog.md`、`stylekit-design.md`；B 端工具 `mastergo-b2b.md`；认证注册 `vercel-auth.md`；电商商品配置 `applestore-commerce.md`；动效案例 `holynova-motion.md`；奖项目录 `awwwards-design.md`
- **手册与摘要（`docs/`）**：`docs/scripts.md`（每个脚本的参数 / 退出码 / 产物）、`docs/reference-sites.md`（各站实测与重采命令）、`docs/visual-summary.md`（视觉细则速查）——要查用法先看 `docs/`，`references/` 只放判据与配方
- **工艺与验收**：`references/craft-floor.md`（工艺底线九条）、`references/anti-slop.md`（反模板清单 + 34 条 pre-flight）、`references/review-rubric.md`（交付前逐项勾）、`references/css-recipes.md`（可复制片段，§12–22 是各站风味）

## 许可

MIT，见根目录 `LICENSE`。第三方例外：`scripts/vendor/axe.min.js` 是
[axe-core](https://github.com/dequelabs/axe-core) 4.14.0，按 **MPL-2.0** 分发，
保留其文件头许可声明即可，不随本仓库的 MIT 一起改变。
