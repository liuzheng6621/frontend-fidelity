# 从 OpenDesign 能搬什么（2026-11-01）

对象：[nexu-io/open-design](https://github.com/nexu-io/open-design)（105K star，Apache-2.0，
TypeScript，Node 24 + pnpm 10.33.2）。它的仓库里有四层可复用资产：
`craft/`（工艺规则）、`skills/`（169 个技能）、`design-systems/`（上百套品牌令牌）、
`design-templates/`（60+ HTML 模板）。

结论先给：**内容层能搬的只有 `craft/` 里两块；`design-systems/` 与 `design-templates/` 有商标与
版权风险，只可作对照不可拷；`skills/` 里 169 个有 160 个与我们无关。**

## 一、逐项对照

`craft/` 共 13 个文件，逐份对我们的覆盖情况：

| 他们的文件 | 我们有没有 | 判定 |
| --- | --- | --- |
| `accessibility-baseline.md` 12.9KB | `audit.mjs` 可执行审计 + `visual-system.md` 可访问性节 | **我们更强**：他们只有判据文本，我们能跑出报告 |
| `anti-ai-slop.md` 3.9KB | `anti-slop.md`（38 条 pre-flight + 13 项机械化） | **我们更强**：条数、机械化程度都高 |
| `typography.md` 4.8KB | `design-tokens.md` + `visual-system.md` 中文排版节 | **我们更强**：CJK 行高/字距/`tabular-nums`/两端对齐，他们只有一张 Latin vs CJK 行高表 |
| `typography-hierarchy.md` 7.4KB | `visual-system.md` 层级五派 + `design-tokens.md` 字阶 | 平手，他们有「层级节奏两种失败模式」的命名可借 |
| `color.md` 3.1KB | `visual-system.md` 色彩节 + `design-evidence.md` 实测色值 | **我们更强**：有 28 站实测色板 |
| `animation-discipline.md` 9.1KB | `motion-spec.md` + `holynova-motion.md` | 平手，他们的**时长阈值表**更硬（见下） |
| `state-coverage.md` 7.1KB | `visual-system.md` 有一节「空、载、错三态」 | **缺口**：没有阈值、没有严重度分级、没有重试退避、没有 ARIA 焦点表 → **已蒸馏落地** |
| `form-validation.md` 17.2KB | 散落在 `visual-system.md` / `page-patterns.md` 的几句 | **缺口**：没有状态机、没有校验时机、没有 WCAG 3.3.3/3.3.4/3.3.8 → **已蒸馏落地** |
| `rtl-and-bidi.md` 12.2KB | 几乎为零（仅 `design-evidence.md` 一处提及） | **缺口，但暂不搬**：本项目语料全是中国站点，RTL 无实测支撑，硬搬等于抄别人的结论 |
| `laws-of-ux.md` 17.3KB | `page-patterns.md` 有部分布局判据 | **缺口，优先级低**：UX 法则属通用常识层，对「照着截图还原」没有增量 |
| `README.md` 6.3KB | — | 讲了 enforcement levels（强制/建议/可关），是**工程做法**，见 §四 |
| `FUTURE_SECTIONS.md` | — | 占位 |

## 二、已落地

| 新增 | 内容 | 来源 |
| --- | --- | --- |
| `references/state-coverage.md` | 五态铁律 + 边界矩阵 + 加载时长阈值（300ms/2s/10s/30s/60s）+ 错误五级严重度 + 重试退避（2/4/8s，15s 兜底）+ ARIA 焦点表 | OpenDesign `craft/state-coverage.md` 蒸馏 |
| `references/form-rules.md` | 输入状态机 8 态 + 校验时机四条 + `:user-invalid` + Constraint Validation API 底线 + 错误接线三件事 + Standard Schema 契约 + WCAG 3.3.3/3.3.4/3.3.8 | OpenDesign `craft/form-validation.md` 蒸馏 |

两份都补了我们原来最缺的东西：**可执行的数字**。原来写「空态要有标题和 CTA」，
现在写「2–10 秒给匹配布局的骨架，15 秒出『比预期久』，60 秒停动画转错误」——
这种粒度才能被 `audit.mjs` 或人肉验收直接判。

## 三、不搬的部分

| 资产 | 规模 | 为什么不搬 |
| --- | --- | --- |
| `design-systems/`（airbnb / apple / stripe / binance / bugatti…） | 上百套 | 品牌令牌是**商标与品牌资产**的衍生物。Apache-2.0 只覆盖代码表达，不覆盖品牌标识；搬进来等于把别人的品牌色当成我们的推荐值 |
| `design-templates/`（60+ HTML 模板） | 大 | 同上，且模板里的插图/字体许可各自独立 |
| `skills/` 里 160 个 | — | `fal-*` / `venice-*` / `pptx` / `gsap-*` / 视频类是 OpenDesign 自己的产品面，与「前端保真度」无关 |
| `craft/rtl-and-bidi.md` | 12.2KB | 原判「不搬」。v1.28.0 改判：先给探针加 `rtl` 字段、实采 2 站，再以**证据分级**形式蒸馏（实测 4 条 / 外部判据 / 待验证清单），不再把外部结论说成实测 |
| `craft/laws-of-ux.md` | 17.3KB | 通用常识层，对还原类任务没有增量；写进来只会稀释常驻层 |

## 四、值得抄的工程做法（不是内容，是结构）

1. **enforcement levels**：他们的 craft 规则分「强制 / 建议 / 可关」三级，每条规则标了级别。
   我们现在是混在一起的散文，下一步可以把 `anti-slop.md` 的 38 条 pre-flight 标上级别，
   让 `audit.mjs --red-flags` 按级别决定退出码（强制项失败 = exit 1，建议项 = 只报告）。
2. **craft 与 skill 分离**：规则（craft）不带执行流程，技能（skill）只说怎么走。
   我们的 `references/` 已经把两者混在一起，`workflow.md` 是流程、其余是规则，边界还算清楚。
3. **`evals/evals.json`**：我们已经按这个格式补了 5 条（见 `evals/evals.json`），
   他们模板里的 `assertions` 是自然语言断言，可以直接喂给人工评审。
4. **插件清单版本同源**：`open-design.json` 的 version 必须等于 `package.json`，
   这条我们已经在 `plugin-validate.mjs` 里做成硬拦截。

## 五、许可证与合规

- OpenDesign 是 **Apache-2.0**，我们是 **MIT**。把 Apache-2.0 的**原文**整段并入 MIT 项目，
  必须保留版权声明与许可副本；**蒸馏判据**（重写表达、只取事实与数字）风险低得多。
- 两份新参考都按 `craft-floor.md` 的老规矩写：**来源标注在文件头，正文是中文重写**，
  没有逐句翻译，也没有复制原文段落。
- `design-systems/` 里的品牌名与视觉识别归各自商标所有人，与本仓库无关，不进分发。

## 六、下一步（按性价比排）

| 优先级 | 动作 | 成本 |
| --- | --- | --- |
| P0 | 把 `state-coverage.md` 的五态接进 `scaffold.mjs --pages states` 的产物，让生成物自带 15s 兜底与错误分级 | 中 |
| P1 | `anti-slop.md` 38 条标 enforcement level，`audit.mjs --red-flags` 按级别分退出码 | 中 |
| P2 | ~~补 `rtl-and-bidi.md`~~ → **v1.28.0 已落，但只到「证据分级」**：`probe-ref.mjs` 加了 `rtl` 字段（方向 / 逻辑属性占比 / 镜像图标），实采 2 个 Mozilla 站；文档按【实测】/【外部】/【待验证】三级标注，§八 列了补齐所需的四类样本 | 中 |
| P3 | `animation-discipline.md` 的时长阈值表并入 `motion-spec.md`（不新开文件） | 低 |
