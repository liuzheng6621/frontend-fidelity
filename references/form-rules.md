# 表单规则（form rules）

> 判据来源：OpenDesign `craft/form-validation.md`（Apache-2.0）蒸馏 + Baymard 结算基准
> （2023 自适应错误、2024-01 行内校验、2024 卡号清空）+ WCAG 2.2 3.3.x + Constraint Validation API。
> **只取判据、数字与失败模式，不复制原文**。视觉长什么样查 `visual-system.md` 的表单一节。

## 一、输入状态机

每个输入都要走完这些状态。名字来自 RHF / Formik 的词汇，**形状与框架无关**。
关键：错误样式挂在「状态」上，不要挂在裸 `:invalid` 或 focus/blur 布尔量上。

| 状态 | 含义 | UI |
| --- | --- | --- |
| `pristine` | 用户没碰过 | 无错误样式，无绿色对勾 |
| `dirty` | 输入过但没提交（还在焦点里） | **仍不出错误样式** |
| `touched` | 编辑后至少失焦过一次 | 开始跑字段级约束 |
| `invalid-after-touched` | 失焦后约束不通过 | 显示错误，用 `aria-describedby` 关联 |
| `invalid-after-submit` | 提交过、仍不合法 | 同上，外加焦点管理到摘要或第一个错字段 |
| `recovering` | 正在改一个已经报错的字段 | 改挂 `input` 事件复验，不等下一次失焦 |
| `submitting` | 请求在飞 | 禁用提交按钮，用 polite live region 播报状态 |
| `server-error` | 服务端返回该字段错误 | **用服务端给的文案**，按 `invalid-after-submit` 处理 |

一条规则终结所有校验时机争论：**错误在「进入 invalid-after-touched」时出现，在「离开任何
invalid 状态」时消失，永不在 `pristine` 或纯 `dirty` 时出现。**

CSS 层面 `:user-invalid` 免费替你匹配 `invalid-after-touched` / `invalid-after-submit`。

## 二、校验时机四条

Baymard 2024-01 的行内校验基准：**31% 的站点根本不做行内校验，做了的多数开火太早。**
被访者的原话最能说明问题——「你凭什么说我邮箱错了，我还没填完呢。」

1. **编辑后第一次失焦**跑字段级约束。不是聚焦时，不是第一次按键，不是每次按键。
2. **字段一旦报错，改挂 `input` 事件复验**，输入一变合法错误立刻消失。别逼用户再失焦一次。
3. **提交时**跑一次整表 schema 解析。焦点移到顶部错误摘要（带 `tabindex="-1"` 的标题容器），
   没有摘要就移到第一个错字段。**不要在每次按键时动焦点。**
4. **异步检查分两条路**：
   - *后台预检*（输入时的唯一性、地址联想）：防抖 250–500ms，polite live region 播报，
     **绝不阻塞输入，也绝不把提交按钮长期禁用**。
   - *提交时的服务端权威校验*：提交路径必须等服务端返回，并把字段错误回填——服务端才是真的。
   - 别把两条混成一条。规则是「慢的后台检查不许冻住表单」，不是「永远不等服务端」。

## 三、Constraint Validation API 是平台底线

`required` / `pattern` / `type` / `minlength` / `maxlength` / `min` / `max` 在 **JS 挂掉时仍然生效**，
并且和自动填充、密码管理器对接。这条底线不能因为上了表单库就丢掉。

`<form novalidate>` 不是「跳过校验」，是「让表单库画错误，别让浏览器弹气泡」。取舍两种：

- **A**：服务端渲染不带 `novalidate`，水合后由表单库设 `form.noValidate = true`。
  无 JS 用户保留浏览器原生校验，有 JS 用户拿库的样式。
- **B**：一开始就 `novalidate`，但提交路径在没有 JS 时也能到达服务端校验（Server Action / 经典 POST）。

选一种。两头都不选的结果是：无 JS 用户既没有浏览器校验、也没有服务端校验。

（HTML 属性小写 `novalidate`，DOM 属性是 `noValidate`。）

## 四、错误接线三件事

基础版（`<label>` + `aria-describedby` + `aria-invalid` + `role="alert"`）只够到 WCAG 3.3.1 / 3.3.2。
真实表单还要三件：

### 4.1 自适应文案：一个字段 4–7 条

Baymard 2023：**98% 的受检站点用一句兜底文案**（「请输入有效手机号」），而不是真正触发的那条子规则
（「手机号太短」）。后端本来就知道是哪条子规则，放出来能显著降低重复提交。

高频复杂字段（邮箱 / 手机 / 卡号 / 邮编）各备 4–7 条不同文案。

### 4.2 提交时在顶部给错误摘要

长表单需要一份带锚点链接的摘要：

```html
<div id="form-errors" tabindex="-1">
  <h2>2 个问题</h2>
  <ul>
    <li><a href="#email">邮箱必填</a></li>
    <li><a href="#dob">出生日期必须是过去的日期</a></li>
  </ul>
</div>
```

容器用标题引导 + `tabindex="-1"`，提交时 JS 可以 `.focus()` 它。
**先渲染进 DOM 再 focus**——`hidden` 元素拿不到焦点。

这个容器**不要**加 `role="alert"`：焦点目标和 alert 叠在一起会双播报（alert 插入时播一次，
focus 又播一次名称和角色）。`role="alert"` 留给「不移动焦点、自己冒出来」的行内字段错误。
（WCAG 技术 G139 覆盖摘要，非必需，长表单高价值。）

### 4.3 跨错误保留用户输入

Baymard 2024：**34% 的受检结算页**在无关字段报错重载时把卡号清空，这是直接流失原因。

做法：先校验非敏感字段，或把支付步骤拆开。PCI 上可以用托管 iframe 的 token 保留，
**永远不要在自己 session 里存裸 PAN**。

## 五、schema 是跨栈契约

校验写一次，到处消费。三条跨栈都成立的规则：

- **服务端为真，客户端是优化**。同一份 schema 两边都跑。
  校验失败从 action **返回 `{ errors }`，不要 throw**——throw 会进 Error Boundary，表单数据就没了。
- **契约是 Standard Schema（`~standard`），不是某个库**。还在给每个校验器配
  `zodResolver` / `valibotResolver` 这种适配器，是把校验器焊死在表单库上。
- `novalidate` 的取舍见 §三。

## 六、WCAG 3.3.x 在交易型表单上还会咬人

基础三条（3.3.1 错误识别 / 3.3.2 标签 / 3.3.7 不重复录入）之外：

- **3.3.3 错误建议（AA）**：能确定怎么修，就用文字说怎么修。
  「日期要 MM/DD/YYYY。你填的是 5-3-26，是不是 05/03/2026？」
- **3.3.4 防错（AA，法律/金融/数据类）**：有后果的提交必须给三者之一——可撤销、
  服务端校验 + 确认修正步骤、或提交前的确认摘要页。
- **3.3.8 无障碍认证（AA，WCAG 2.2）**：认证步骤不得强制认知功能测试（记密码、抄验证码、识图），
  除非有替代方案。落地底线：**密码和验证码字段不许禁粘贴**，要支持密码管理器。
- **3.3.9 无障碍认证无例外（AAA）**：连识图/个人内容的例外也去掉。项目承诺了才做，否则标注即可。

## 七、常见错误（逐条可查）

- 样式挂在 `input:invalid` 而不是 `input:user-invalid`——页面一加载满屏红框，最响的「没测就上线」信号。
- 每次按键都校验，用户还没打完就报错。
- 后端明明知道子规则，前端只给一句兜底文案（98% 的站点在犯）。
- Server Action 校验失败时 throw，路由到 Error Boundary，表单数据丢失。
- 焦点要移入的错误摘要容器上加了 `role="alert"`，双播报。
- 提交中给按钮加 `aria-busy="true"`。`aria-busy` 是给「内容过期的容器」的；
  按钮该用 `disabled` + polite live region 播报。
- 让用户「再输一次邮箱」。3.3.7 的例外只有必要 / 安全 / 已失效三种，不包括「我们想抓错别字」。
  允许粘贴，单字段校验就够。
- 2026 年还在给表单库配 per-validator resolver 适配器。
- 无关字段报错时把卡号清空（34% 的电商在犯）。
- 用 `setCustomValidity(null)` 清错误——`null` 不清，要传空字符串 `''`。
- 把 Web 的 `aria-*` 直接镜像到 SwiftUI / Compose / Flutter。各平台有自己的有效性 API，
  `aria-*` 到不了移动端辅助技术那条路。

## 八、怎么接进脚本

```bash
# 生成带表单页的骨架（含未触碰 / 已填 / 报错三态示例）
node scripts/scaffold.mjs --persona rational --out ui --pages form,auth --verify

# 审计：标签缺失、对比度、可聚焦性
node scripts/audit.mjs --url http://localhost:5173/signup --themes light,dark
```

`audit.mjs` 能机械判「input 有没有关联 label」「对比度够不够」；
**校验时机、错误文案是否自适应、焦点是否被搬动**只能人工过——按 §二 和 §四 逐条对。
