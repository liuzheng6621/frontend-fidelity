# 参考站复测报告

> 生成时间：2026-10-31；对象：17 个单站蒸馏站点；每站一次桌面采样（1440×900），未做断点扫描。
> 方法：`scripts/recheck-refs.mjs` 逐站调用 `probe-ref.mjs`（getComputedStyle + 盒模型），失败站点不计入基线。
> 口径提醒：H1 取「文档里第一个 h1 的计算字号」，与单站文档里「视觉主标题」不一定同一个元素（有的站主标题是 h2/div）；
> 正文取第一个 `p`。**本报告用于发现「站点结构变了」，不直接改单站结论**；确认改版后手工更新对应 `references/*-design.md`。

## 结果

| 站点 | 状态 | 本次实测 | 与基线对比 |
| --- | --- | --- | --- |
| Awwwards 奖项目录 | ❌ 不可达 | probe-ref 退出 1 | — |
| Wegic 营销站 | ✅ | H1 16 / 正文 15 / 控件 24 / inter | 无变化 |
| 即时设计 | ✅ | H1 40 / 正文 15 / 控件 40 / -apple-system | 无变化 |
| UI 世界 | ✅ | H1 — / 正文 12 / 控件 40 / 微软雅黑 | 无变化 |
| 站酷 UI 频道 | ✅ | H1 40 / 正文 14 / 控件 18 / PingFang SC | 无变化 |
| StyleKit 风格目录 | ✅ | H1 36 / 正文 11 / 控件 14 / Albert Sans | 无变化 |
| UI Notes | ✅ | H1 — / 正文 14 / 控件 24 / Avenir | 无变化 |
| 猫叫兽 UI 风格库 | ✅ | H1 — / 正文 12 / 控件 24 / Inter | 无变化 |
| Muzli 灵感库 | ❌ 不可达 | probe-ref 退出 1 | — |
| MasterGo | ✅ | H1 56 / 正文 14 / 控件 38 / Inter | 无变化 |
| Vercel 登录 | ✅ | H1 32 / 正文 14 / 控件 40 / GeistSans | 无变化 |
| Apple Store 商品配置 | ✅ | H1 80 / 正文 28 / 控件 35 / SF Pro SC | 无变化 |
| 苹果中国首页 | ✅ | H1 34 / 正文 28 / 控件 35 / SF Pro SC | 无变化 |
| 少数派 | ✅ | H1 — / 正文 24 / 控件 32 / -apple-system | 无变化 |
| 语雀 | ✅ | H1 — / 正文 20 / 控件 32 / Chinese Quote | 无变化 |
| 掘金 | ✅ | H1 — / 正文 14 / 控件 24 / -apple-system | 无变化 |
| holynova 动效站 | ✅ | H1 56 / 正文 16 / 控件 29 / Plus Jakarta Sans | 无变化 |

## 统计

- 可达 **15** / 失败 **2** / 有数值变化 **0**。
- 基线：`references/recheck-baseline.json`（0 个站点；`--update-baseline` 才会重写）。
- 失败站点：awwwards（probe-ref 退出 1）；muzli（probe-ref 退出 1）。被拦、超时与下线不写入基线，别当成「没变化」。

## 复跑

```bash
node scripts/recheck-refs.mjs                    # 全量
node scripts/recheck-refs.mjs --only awwwards    # 单站
node scripts/recheck-refs.mjs --update-baseline  # 确认改版后重设基线
```
