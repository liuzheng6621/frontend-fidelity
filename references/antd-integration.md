# Ant Design 接入与验收

这份参考解决一件事：**项目已经在用 Ant Design 时，怎样把它用好、改对、验完整**。它不复制 Ant Design 的默认视觉，也不把每个后台都做成 Ant Design 蓝。要借的是它的组件语义、令牌分层、状态规范和测试纪律。

> 事实快照：2026-11-09 抽查 `ant-design/ant-design` 的 `master`，commit `86ac5b5563bbf260aab369098a0250ab673db688`，`antd@6.7.0`，MIT。本文只搬判据，不复制源码。核对源：仓库根目录 `package.json`、`DESIGN.md`，以及 `public/.well-known/agent-skills/` 下的主题定制、组件查询、迁移三份官方说明。

## 一、先划边界

| 场景 | 做法 | 不做什么 |
| --- | --- | --- |
| 已有 v4 / v5 / v6 项目 | 在现有 `ConfigProvider`、组件封装和业务样式上扩展 | 不重写一套 Input/Select/Table；不在“美化一下”里顺手升大版本 |
| 企业后台、管理端、数据密集型工具 | 用 Ant Design 的组件语义、密度、反馈与键盘行为做底座 | 不把营销页也套成 32px 控件和 14px 正文 |
| 新项目明确允许选组件库 | 先定页面骨架与令牌，再决定是否引入 `antd` | 不把 `--export antd` 误当成已生成组件工程 |
| 营销站、品牌站 | 可借令牌导出与表单/弹层能力 | 不照搬 `#1677FF`、默认圆角和后台密度；强依赖 Ant Design 就换库，不硬套 |

**最重要的继承**：官方组件已经覆盖的交互，不重复实现。日期选择、级联选择、下拉、虚拟表格、焦点陷阱、Portal 层级，自己重造通常更差。

## 二、为什么值得借

Ant Design 的质量不只在组件数量，而在“每个组件都有行为约定和回归证据”。该提交的仓库里约有：

| 证据 | 规模 | 对本 skill 的意义 |
| --- | ---: | --- |
| 组件分组 | 84 | 先用组件矩阵查缺，不靠灵感拼页面 |
| 组件测试文件 | 1,040 | 状态与交互要有可重复断言 |
| 快照文件 | 375 | 视觉改动要能被发现，不靠“看起来没变” |
| 示例 demo | 1,185 | 一个 API 要有最小可运行用法 |
| 中英组件文档 | 74 组 | 契约必须能被不同语言的使用者读到 |
| 无障碍测试文件 | 74 | 组件级 a11y 是基线，不是交付时的补丁 |

借法不是把这些数字抄进项目，而是照这个方向补自己的质量门：**行为测试、视觉快照、可运行示例、a11y、双语文档，缺哪项补哪项**。

## 三、模式 A 勘察清单

动像素前先把下面这张表填完。看不清现状就改 Ant Design，最容易把主题、弹层和表单状态一起弄坏。

| 检查项 | 要看什么 | 常见事故 |
| --- | --- | --- |
| 版本 | `package.json` 是 v4、v5 还是 v6；React 版本是否匹配 | 把 v4 的 Less 覆盖和 v5/v6 的 `ConfigProvider` 混用 |
| Provider | `ConfigProvider` 在哪、有几层、是否继承父主题 | 局部主题越权；`theme={undefined}` 导致组件重挂载 |
| 算法 | `defaultAlgorithm` / `darkAlgorithm` / `compactAlgorithm` 是否组合 | 手写反色替代暗色算法；暗色和紧凑各改一套 |
| 令牌 | `theme.token`、`theme.components`、业务变量各在哪 | 组件内散落 hex；全局一刀切改 `.ant-*` |
| 样式模式 | v5 的 CSS-in-JS、v6 的 CSS 变量、`zeroRuntime` / 静态提取 | 静态样式没导入；SSR 首屏闪白；哈希类名被覆盖 |
| 语境 | `locale`、`direction`、日期库、`dayjs` locale | 中文日期、RTL、弹层方向不一致 |
| App 容器 | 是否用了 `<App>` 与 `App.useApp()` | `message` / `notification` / `modal` 拿不到当前主题或上下文 |
| 覆盖层 | 全局 CSS、Less 变量、`!important`、`.ant-*` 选择器 | 升级后类名变化；覆盖到别的组件；暗色失效 |
| 封装层 | 是否有业务组件包住 Input/Table/Modal | 封装复制了内部 DOM，导致键盘和 ARIA 行为丢失 |
| 服务端渲染 | 是否 SSR/SSG、是否配置静态样式或 `zeroRuntime` | 水合不一致、首屏 CLS、弹层样式迟到 |

## 四、令牌层级与改动顺序

Ant Design 的主题不是“改几个 CSS 变量”这么简单。它分成 **Seed Token → Map Token → Alias Token → Component Token**：种子值经算法派生映射值，再形成组件可消费的别名值；组件还可以有只影响自己的 Component Token。

改动按这个顺序，越靠前越好：

1. **Seed Token**：通常只改 `colorPrimary`、状态色、`borderRadius`、`fontFamily`、`fontSize`、控件高度与中性表面。一个种子会带动整条派生链。
2. **Algorithm**：暗色、紧凑用官方算法组合，不手转颜色。需要同时暗且紧时组合数组，别自己造两套规则。
3. **Component Token**：只有单个组件确实要例外时才用 `theme.components.Button` 这类入口；优先调官方 token，不写内部类名。
4. **CSS 变量 / 静态提取**：需要给非 antd 区域消费、SSR 预生成或减少运行时样式时，使用官方 `cssVar`、`theme.getDesignToken()` 或静态样式方案。
5. **业务扩展**：官方层级表达不了时才写包装组件，并把例外写进 `DESIGN.md` 或项目令牌文档。不能把一次性的页面补丁伪装成设计系统。

### 6.7.0 默认值只作校准

| 项 | 默认值 | 使用口径 |
| --- | --- | --- |
| 主色 | `#1677FF` | 不是必须继承；品牌换色只换种子并重跑对比度 |
| 控件高 | 32px | 管理端默认密度；营销页不要照搬 |
| 间距 | 4 / 8 / 16 / 24 / 32 | 4px 网格；例外要有来源 |
| 字阶 | 12 / 14 / 16 / 20 / 24 / 30 / 38 | 正文默认 14；内容站可用自己的字阶 |
| 圆角 | 0 / 2 / 4 / 6 / 8 / 16 / full | 默认控件 6；不要每个页面再发明圆角 |
| 动效 | 100 / 200 / 300ms | 组件内状态用快档，浮层进出用慢档 |

官方 `DESIGN.md` 明确提示：白字压在 `#1677FF` 上、主色文字压在浅选中底上，可能达不到小字号 4.5:1。**默认值不是无障碍豁免**，换品牌色后必须跑 `contrast_check.py`。

## 五、组件复用矩阵

| 需求 | 先用 | 关键约束 | 不要自造 |
| --- | --- | --- | --- |
| 主次操作 | `Button`、`Dropdown`、`Space` | 一屏只留一个主行动；危险操作有确认或撤销 | 自绘按钮、图标按钮无 tooltip |
| 表单 | `Form` + `Input` / `InputNumber` / `DatePicker` / `Select` | 字段标签、错误摘要、首错聚焦、异步校验分开 | 自己拼 label、错误提示和日期控件 |
| 数据列表 | `Table` + 内置 `Pagination` | 窄屏 `scroll.x`、表头 `sticky`、大列表 `virtual`、空态明确 | 用 div 重画表头、固定列和排序 |
| 编辑与确认 | `Modal`、`Drawer`、`Popconfirm` | 焦点进入与返回、Esc、遮罩、滚动锁 | 自写 Portal 和焦点陷阱 |
| 导航 | `Menu`、`Tabs`、`Breadcrumb`、`Steps` | 选中态不靠颜色单一表达；键盘可达 | 用链接列表冒充 Tab |
| 数据状态 | `Skeleton`、`Spin`、`Empty`、`Result`、`Alert` | 加载有延迟阈值；空态给下一步；错误可重试 | 只写“暂无数据”不给出路 |
| 反馈 | `App.useApp()` 的 `message` / `notification` / `modal` | 反馈挂当前主题和上下文；批量操作给汇总 | 在组件里直接调脱离 Provider 的静态方法 |
| 文件 | `Upload`、`Upload.Dragger` | 上传中、失败重试、类型与大小提示可读 | 只画一个虚线框 |
| 开关与分段 | `Switch`、`Segmented`、`Radio` | 立即生效与提交后生效要区分 | 用两个普通按钮装开关 |
| 响应式 | `Grid` / `useBreakpoint` | 断点改变结构，不只是缩字号 | 纯靠 `vw` 缩整页 |

## 六、推荐落地流程

1. **锁版本与边界**：记录 `antd`、React、图标包、日期库版本；确认这是“组件扩展”还是“大版本迁移”。迁移另立任务，不走日常美化。
2. **留基线**：先跑 `screenshot.mjs` 与 `audit.mjs`。Ant Design 组件看起来没变，不代表弹层、表格滚动、键盘路径没坏。
3. **只动官方层**：种子 → 算法 → 组件 token → 官方 CSS 变量。每一层改完都看浅色、暗色、移动端与 RTL。
4. **页面拼装**：按 `page-patterns.md` 的骨架组织信息，用上面的组件矩阵填交互。组件齐全不等于页面成立，层级、密度、状态仍要自己负责。
5. **补页面级行为**：表单错误摘要与首错聚焦、表格空/载/错、弹层焦点返回、批量选择清空、权限不足、超长文本与 100 行数据。
6. **验收**：截图 + `audit.mjs` + 构建 + 关键流程 `flow.mjs`。如果改了主题，再跑对比度和设计体系检查。

## 七、验收重点

Ant Design 自己的组件测试和无障碍测试只能证明组件库本身，**不能证明你的页面接对了**。交付前至少过一遍：

- **主题**：浅色 / 暗色 / 紧凑（若启用）/ RTL 四组都要看；暗色不是颜色反转，算法负责表面、阴影和状态的联动。
- **表单**：提交后错误摘要出现，焦点到第一个错误；服务端错误保留输入；异步校验与最终提交校验分开。
- **表格**：390px 宽不把页面撑破；固定列、横向滚动、空态、加载、分页变化和行操作都可用。
- **浮层**：Modal / Drawer / Dropdown / Tooltip 的层级、遮罩、Esc、焦点返回、滚动锁正确；Portal 不被父级 `overflow` 裁切。
- **键盘**：Tab 顺序、可见焦点、Select/DatePicker 展开、Modal 焦点陷阱、Dropdown 键盘导航都能走通。
- **SSR / 首屏**：静态样式或 CSS 变量已加载，没有长时间无样式、布局跳动或 hydration 警告。
- **内容**：`Form.Item`、`Table`、`Empty`、`Result` 里的占位文案全部换成真实业务语言，不用 `foo` / `bar` / `lorem`。

```bash
node scripts/screenshot.mjs --url http://localhost:5173/ --out .design/after
node scripts/audit.mjs --url http://localhost:5173/ --themes light,dark
python scripts/contrast_check.py src/styles
node scripts/flow.mjs --flow flow.json --base http://localhost:5173
```

## 八、`--export antd` 的准确边界

`scaffold.mjs --export antd` 只生成 `tokens.antd.json`，形状是 `ConfigProvider theme.token`，约 16 个常用全局 token。用于把本 skill 的品牌色、表面色、圆角、字号和控件高带进 Ant Design 项目。

它**不生成**：`theme.components`、业务组件、Form/Table/Modal 封装、暗色算法、RTL、测试或迁移代码。导出后仍需在项目里用 `ConfigProvider` 接入，并按上面的验收清单补页面级工作。组件级定制属于二次开发，不属于导出能力。

## 九、反模式

- 全站覆盖 `.ant-btn`、`.ant-table-cell`、`.ant-modal-content`，或用 `!important` 压过官方样式。
- 绕过 `ConfigProvider`，在每个页面各写一套颜色和圆角。
- 把 Ant Design 当成整页模板：每个区块都包 `Card`，每个操作都堆 `Button`，表格外再套一张大卡。
- 重复实现 Select、DatePicker、Upload、Modal；或复制 Ant Design 内部 DOM 再补事件。
- 只测浅色桌面，默认暗色、RTL、窄屏、键盘和 SSR 会自己好。
- 用组件库自带的 a11y 测试替代页面级 axe、键盘走查和截图。
- 为了“统一风格”升级 v4 → v5/v6。大版本迁移要单独评估 API、主题、静态样式与回归成本。
- 把默认主色、默认 14px 正文或默认 32px 控件硬套到营销页；组件可借，密度与视觉方向不能借错。

## 十、交付前检查

- [ ] 记录 `antd` 与 React 版本，没有在任务中偷偷升大版本。
- [ ] 主题改动落在 `ConfigProvider`、算法、组件 token 或 CSS 变量层。
- [ ] 没有新增全站 `.ant-*` 覆盖、`!important` 或一次性 hex。
- [ ] 表单、表格、弹层、反馈都有页面级状态与键盘路径。
- [ ] 浅色、暗色、390px、RTL（若支持）截图已逐张查看。
- [ ] `audit.mjs` 0 error，对比度达标，构建与关键流程通过。
- [ ] 如果用了 `--export antd`，说明只覆盖全局令牌，没有宣称完成组件适配。
