# 贡献指南

这个仓库是「可执行的前端验收 Skill」：**改文档不算改对，能跑出结论才算**。

## 提交前必须跑

```bash
node scripts/selfcheck.mjs --skip-audit   # 语法 / 生成 / 对比度 / 文档门，约 10 秒
node scripts/selfcheck.mjs                # 含 210 个渲染组合与设计体系回归，约 7 分钟
```

任何一项红都不合并。CI 会跑同样的两条（见 `.github/workflows/selfcheck.yml`）。

## 改参考库

- 数值必须能复现：写清站点、URL、视口、采样日期、测量方式。
- 新增单站蒸馏：同时更新 `references/design-evidence.md` 的站数与条目，并跑一次
  `node scripts/recheck-refs.mjs --update-baseline`。
- **不要手改基线 JSON**：`references/recheck-baseline.json` 只由脚本写。
- 被反爬拦下、超时、下线的站点记 `failed`，不要写成「没变化」。

## 改脚本

- 新增/修改行为必须带正反例（自检里的断言，或 `scripts/*.example.json`）。
- 退出码是契约：`0` 通过 / `1` 检查失败 / `2` 参数或环境错误 / `3` 只验了一部分。
  不要为了「好看」把失败改成 0。
- 新增脚本要同时更新：`docs/scripts.md`、README 脚本表、`README.en.md`、SKILL 的脚本清单。

## 改文档

- 站点数、蒸馏份数、脚本数、冻结均值由 `selfcheck` 的文档门看守；改数字就一次改全。
- 相对链接必须能打开（链接门扫根目录 + `docs/` + `references/`）。
- CHANGELOG 首条版本必须与 `package.json` 一致，日期不能晚于今天、不能倒挂。

## 发版

1. `package.json` 版本 → 同步 README 徽标 / `--ref` 示例 /「当前是」/ `install.sh` / CHANGELOG 首条
2. `node scripts/selfcheck.mjs`
3. `git tag -a vX.Y.Z` → `git archive` 出 zip
4. 推 Gitee 与 GitHub，各建 Release 并挂 `frontend-fidelity.zip`

## 不接受的改动

- 为了让检查通过而放宽阈值、跳过站点、把 `partial` 当 `pass`。
- 引入第二套设计体系或第二个构建链。
- 把参考库复制成多份（入口只写指针）。
