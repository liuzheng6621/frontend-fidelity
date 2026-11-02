# DESIGN.md 声称值 vs 站点实测值（复采报告）

> 采集时间：2026-11-02 · 工具：`scripts/probe-ref.mjs`（桌面 1440×900 / 浅色 / 等待 1.5s）
> 对象：`VoltAgent/awesome-design-md` 的 84 份 DESIGN.md
> 目的：这批文件是人工分析的产物，没有采集记录。本文用探针逐站量一遍，看声称值有多少站得住。

## 一、覆盖率

| 项 | 数量 |
| --- | --- |
| 样本总数 | 84 |
| 有 YAML frontmatter（可比对） | 74 |
| 站点实测成功 | 46 |
| 未采到 | 28 |

**为什么不是 84 全采**：

- **10 份没有 frontmatter**：`kraken` / `lamborghini` / `lovable` / `mastercard` / `runwayml` /
  `sanity` / `spotify` / `starbucks` / `tesla` / `theverge` 是纯散文版（`## 1. Visual Theme & Atmosphere` 这类），
  没有可比对的令牌值——机器读不了，只能人读。
- 其余未采到的是域名不可解析（`ERR_NAME_NOT_RESOLVED`）、连接超时或被反爬拦下（页面崩溃）。
- 两类一律记成「未采到」，**不用估算值填充**。

## 二、命中率（两级判定）

同一件事有两种问法，答案差很多，所以两级都列：

- **严格**：声称值等于页面 `body` 的计算值。
- **宽松**：声称值出现在页面实际使用的颜色清单里（探针扫全部元素取 top-N）。

| 声称项 | 严格 | 宽松 | 判定口径 |
| --- | --- | --- | --- |
| `colors.canvas` | 28/46 = **61%** | 30/46 = **65%** | 与 `body` 背景 / 全页背景清单逐通道差 ≤ 6 |
| `colors.ink` | 20/46 = **43%** | 32/46 = **70%** | 与 `body` 文字色 / 全页文字色清单逐通道差 ≤ 6 |
| `rounded.md` | 22/35 = **63%** | — | 页面实际出现的圆角档位里存在该值 |
| `typography` 正文 | 中位偏差 **2.0px** | ≤1px 22/44（50%）、≤2px 32/44（73%） | 实测 `p` 字号 − 声称值 |

**严格与宽松差这么多的原因**（逐个看过不匹配样本，不是推测）：

1. 很多站把 `color` / `background` 设在页面容器上而不是 `body`，`body` 拿到的是 UA 默认的 `#000000`。
2. 首屏被 hero 图片或视频盖住时，`body` 背景不等于真实画布（`bmw-m` 声称 `#000000`，`body` 实测 `#ffffff`）。
3. 少数是真的改版了（`linear.app` 声称 `#010102`，实测 `#08090a`）。

所以**宽松值更接近「这份文档准不准」**，严格值衡量的是「页面根节点有没有照文档写」——两件事。

## 三、逐站明细

| 站点 | 主题 | canvas 声称 / body 实测 | ink 声称 / body 实测 | 正文声称 / 实测 | 圆角声称 / 实测档位 |
| --- | --- | --- | --- | --- | --- |
| 1win | dark | #141415 / #141415 ✅ | #f0f2f5 / #000000 ❌ | 14 / — | 8 / 50 999 ❌ |
| airbnb | light | #ffffff / #ffffff ✅ | #222222 / #222222 ✅ | 16 / — | 14 / 4 8 12 32 ❌ |
| apple | light | #ffffff / #ffffff ✅ | #1d1d1f / #1d1d1f ✅ | 17 / 28（Δ+11） | 11 / 5 50 980 999 ❌ |
| bmw | light | #ffffff / #ffffff ✅ | #262626 / #262626 ✅ | 16 / 16（Δ+0） | 8 / —  |
| bmw-m | light | #000000 / #ffffff ❌ | #ffffff / #262626 ❌ | 16 / 16（Δ+0） | 6 / 24 ❌ |
| bugatti | dark | #000000 / #000000 ✅ | #ffffff / #000000 ❌ | 16 / 12（Δ-4） | — / 4 6 9999  |
| cohere | light | #ffffff / #ffffff ✅ | #212121 / #000000 ❌ | 16 / 16（Δ+0） | 16 / 4 8 12 22 ❌ |
| composio | light | #0f0f0f / #f6f6f6 ❌ | #ffffff / #0f0f0f ❌ | 16 / 14（Δ-2） | 8 / 3.4 4 8 10 ✅ |
| cursor | light | #f7f7f4 / #f7f7f4 ✅ | #26251e / #26251e ✅ | 16 / 17（Δ+1） | 8 / 1.5 2 3.4 4 ✅ |
| dell-1996 | light | #ffffff / #ffffff ✅ | #000000 / #000000 ✅ | 14 / 16（Δ+2） | — / —  |
| dji | light | — / #ffffff ❌ | — / #000000 ❌ | 16 / 16（Δ+0） | — / 4 8 50 60  |
| elevenlabs | light | #f5f5f5 / #fdfcfc ❌ | #0c0a09 / #000000 ❌ | 16 / 14（Δ-2） | 8 / 2 4 10 12 ❌ |
| expo | light | #ffffff / #ffffff ✅ | #171717 / #1c2024 ❌ | 16 / 12（Δ-4） | 8 / 12 16 24 25 ❌ |
| ferrari | light | #181818 / #ffffff ❌ | #ffffff / #000000 ❌ | 14 / 13（Δ-1） | 6 / —  |
| figma | light | #ffffff / #ffffff ✅ | #000000 / #000000 ✅ | 18 / 18（Δ+0） | 8 / 2 4 8 16 ✅ |
| framer | dark | #090909 / #000000 ❌ | #ffffff / #000000 ❌ | 15 / 14（Δ-1） | 10 / 4 5 6 8 ❌ |
| hashicorp | light | #000000 / #ffffff ❌ | #ffffff / #000000 ❌ | 16 / 13（Δ-3） | 8 / 2 3 4 5 ✅ |
| intercom | light | #f5f1ec / #ffffff ❌ | #111111 / #000000 ❌ | 16 / 15（Δ-1） | 8 / 3.4 4 6 ❌ |
| jobright | light | #ffffff / #ffffff ✅ | #000000 / #000000 ✅ | 16 / 16（Δ+0） | 16 / 10 12 16 24 ✅ |
| linear.app | dark | #010102 / #08090a ❌ | #f7f8f8 / #f7f8f8 ✅ | 16 / 15（Δ-1） | 8 / 4 6 8 9 ✅ |
| mercury | light | #fbfcfd / #ffffff ✅ | #28253b / #000000 ❌ | 16 / 16（Δ+0） | 12 / 3.4 4 8 12 ✅ |
| minimax | light | #ffffff / #ffffff ✅ | #0a0a0a / #18181b ❌ | 16 / 24（Δ+8） | 8 / 8 10 12 16 ✅ |
| miro | light | #ffffff / #fbfaf7 ❌ | #1c1c1e / #000000 ❌ | 16 / 20（Δ+4） | 8 / 3.4 8 12 20 ✅ |
| mongodb | light | #ffffff / #fdfff5 ❌ | #001e2b / #000000 ❌ | 16 / 14（Δ-2） | 8 / 2 4 8 16 ✅ |
| mydealz | light | #f3f5f7 / #ffffff ❌ | #000000 / #000000 ✅ | 16 / 18（Δ+2） | 8 / —  |
| nerdwallet | light | #ffffff / #ffffff ✅ | #000000 / #000000 ✅ | 16 / 15（Δ-1） | 6 / 5500 ❌ |
| nintendo-2001 | light | — / #ffffff ❌ | — / #000000 ❌ | 12 / 21（Δ+9） | 6 / —  |
| nvidia | light | #ffffff / #ffffff ✅ | #000000 / #000000 ✅ | 16 / 15（Δ-1） | — / 2.5 4 16 141400  |
| ollama | light | #ffffff / #ffffff ✅ | #000000 / #000000 ✅ | 16 / 20（Δ+4） | 8 / 3.4 ❌ |
| opencode.ai | light | #fdfcfc / #ffffff ✅ | #201d1d / #1d1d1f ✅ | 16 / 16（Δ+0） | — / 4 6 66 6600  |
| oura | light | #f7f1e8 / #ffffff ❌ | #1c1b1a / #000000 ❌ | 18 / 14（Δ-4） | 12 / 3.4 4 6 8 ✅ |
| posthog | light | #eeefe9 / #eeefe9 ✅ | #23251d / #000000 ❌ | 16 / 17（Δ+1） | 6 / 2 4 5.6 6 ✅ |
| renault | light | #ffffff / #ffffff ✅ | #000000 / #000000 ✅ | 16 / 14（Δ-2） | 4 / 4 16 24 100 ✅ |
| resend | dark | #000000 / #000000 ✅ | #fcfdff / #f0f0f0 ❌ | 16 / 18（Δ+2） | 8 / 3.4 4 6 8 ✅ |
| revolut | light | — / #ffffff ❌ | #191c1f / #191c1f ✅ | 16 / 16（Δ+0） | 12 / —  |
| sap | light | #ffffff / #ffffff ✅ | #000000 / #000000 ✅ | 18 / 16（Δ-2） | 8 / —  |
| sentry | dark | — / #1f1633 ❌ | #1f1633 / #ffffff ❌ | 16 / 14（Δ-2） | 8 / 3.4 8 10 10.6 ✅ |
| spacex | light | — / #ffffff ❌ | #000000 / #404040 ❌ | 16 / 15（Δ-1） | 16 / 4 ❌ |
| stripe | light | #ffffff / #ffffff ✅ | #0d253d / #000000 ❌ | 15 / 32（Δ+17） | 8 / 2 3 4 5 ✅ |
| supabase | light | #ffffff / #fdfdfd ✅ | #171717 / #030303 ❌ | 16 / 14（Δ-2） | 8 / 3.4 5.3 8 8.9 ✅ |
| superhuman | light | #ffffff / #ffffff ✅ | #292827 / #292827 ✅ | 16 / 16（Δ+0） | 8 / 8 12 16 24 ✅ |
| uber | light | #ffffff / #ffffff ✅ | #000000 / #000000 ✅ | 16 / 16（Δ+0） | 8 / 6 8 16 50 ✅ |
| vercel | light | #ffffff / #fafafa ✅ | #171717 / #171717 ✅ | 16 / 16（Δ+0） | 8 / 3.4 4 6 8 ✅ |
| warp | light | #2b2622 / #ffffff ❌ | #f7f5f0 / #000102 ❌ | 16 / 16（Δ+0） | 4 / 1 3 3.4 4 ✅ |
| wise | light | #ffffff / #ffffff ✅ | #0e0f0c / #454745 ❌ | 16 / 40（Δ+24） | 12 / 2 16 18.8 28.2 ❌ |
| zapier | light | #fffefb / #fffefb ✅ | #201515 / #201515 ✅ | 18 / 14（Δ-4） | 12 / 4 8 10 12 ✅ |

## 四、结论

1. **画布色与文字色大体可信，但不是契约**：宽松口径 65% / 70%，**每 3–4 个站就有 1 个对不上**。
2. **圆角最不可靠（63%）**：`rounded.md` 是抽象中间档，实际站点常只有 4 / 6 / 8 / 12 四档，
   「md」在页面上根本没有对应元素——这是**格式本身的缺陷**，不是分析者粗心。
3. **字号这类硬数值最准**：中位偏差 2.0px，73% 落在 ±2px 内。
4. **10 份没有 frontmatter**：说明「DESIGN.md 是格式」不等于「每份都合规」，机器解析前必须先验格式。

## 五、这份复采对我们自己的要求

| 规矩 | 我们的实现 |
| --- | --- |
| 声称值必须带采集时间与站点 | `references/design-evidence.md` 每条都有；漂了 `scripts/recheck-refs.mjs` 能抓 |
| 文档必须能跑，不能只是描述 | `scaffold.mjs --design-md` 导入的每个值都落进 `tokens.css`，再由 `audit.mjs --design-system` 回查实现 |
| 导入前先验格式 | `--design-md` 缺 frontmatter 直接报错退出，不静默降级 |

## 六、怎么复现

```bash
# 1) 取全部样本（一次 tarball，别逐文件打 API）
curl -sSL https://codeload.github.com/VoltAgent/awesome-design-md/tar.gz/refs/heads/main -o admd.tar.gz

# 2) 逐站量（slug 与域名基本同名，例外见仓库 README 的链接）
node scripts/probe-ref.mjs --url https://stripe.com --out .tmp/probe/stripe --name stripe --brief

# 3) 拿 frontmatter 的 colors.canvas / colors.ink / rounded.md / typography 与实测值比对
```

探针输出里 `bodyBg` / `bodyText` 是严格口径，`bgColors` / `textColors` 是宽松口径，两列都在 JSON 里。
