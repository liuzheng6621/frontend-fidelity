# frontend-fidelity · make the UI match what it claims

[中文](README.md) | **English**

> Two ways to work: **existing UI** — rebuild from a design file or screenshot, or clean up a live admin panel, H5 page, mini-program webview, multi-end consistency, logo and brand assets; **no UI yet** — generate a verifiable skeleton from tokens (tokens + components + fifteen page types, four mobile shells and a five-page commerce flow included), then fill in real content and states.
> The reference library is **28 real sites measured element by element + 17 single-site distillations** (marketing, tool sites, SaaS homepages, editorial homepages, developer feeds, product stages, dense and sparse galleries, catalog pages, inspiration libraries, style directories, magazine indexes, B2B workspaces, auth, commerce configuration, motion), plus **two distilled external rule sets** (craft floor / anti-slop checklist). Pick by page type in [Which reference to copy](#which-reference-to-copy).
> **Counting rule**: 28 measured sites = **Group A 25** (16 marketing/product/commerce + 9 content galleries) + **Group B 3 backend tools**. Cross-site averages stay frozen at the original 18-site baseline; newer samples only add sites and single-site entries. Totals are always 28 / Group A 25 — `selfcheck.mjs` guards this.
> The goal is not "make it prettier" but **make the interface match what it claims to be, and actually work — with evidence**.

`v1.33.0` · [latest release](https://github.com/liuzheng6621/frontend-fidelity/releases/latest) · `MIT` · `Node.js ≥ 18` · `Python ≥ 3.9 (cropping/contrast only)` · `offline WCAG checks` · `21 executables (17 Node + 4 Python)`

---

## Install in 30 seconds

A skill is a `SKILL.md` plus reference files; both Claude Code and DSH read this format.

```bash
# macOS / Linux
curl -fsSL https://raw.githubusercontent.com/liuzheng6621/frontend-fidelity/master/install.sh | bash

# Windows (PowerShell)
iex ((irm https://raw.githubusercontent.com/liuzheng6621/frontend-fidelity/master/install.ps1).TrimStart([char]0xFEFF))
```

Default targets: `~/.claude/skills/frontend-fidelity` and `~/.dsh/skills/frontend-fidelity`. Options:

```bash
bash install.sh --target claude          # Claude Code only
bash install.sh --target dsh             # DSH only
bash install.sh --ref v1.17.0            # pin a tag
bash install.sh --dry-run                # print targets, change nothing
```

Or clone manually:

```bash
git clone --depth 1 https://github.com/liuzheng6621/frontend-fidelity.git \
  ~/.claude/skills/frontend-fidelity
```

Start a new session after installing, then say "rebuild this page from the screenshot", "this admin panel looks bad, unify it", or "verify the frontend changes".

## Three non-negotiables

1. **Look before you edit.** Never touch a pixel before running `screenshot.mjs` and looking at the current state. Rewriting from imagination is the main source of large regressions.
2. **Do not introduce a new system.** If the project uses Tailwind, don't add CSS-in-JS; if it has a component library, extend it. Replacing the design system needs its own proposal, not a hidden move inside "polish it".
3. **Prove it after the change.** Screenshots + audit + build must all be green; "should be fine" is not done.

## What's inside

| Area | Contents |
| --- | --- |
| Entry | `SKILL.md` — routing table, 30-second start, quality gates, design baseline |
| Reference library | 34 Markdown files: 17 single-site distillations + 13 general specs + 1 cross-site evidence file + 2 external rule sets + 1 workflow — plus 3 machine-readable datasets (frozen baseline / reference snapshot / REA structure evidence) |
| Executables | 21 scripts: screenshots, WCAG/CLS audit, contrast (with target-color suggestions), design-system audit, flow checks, pixel diff, auth export, reference probe, batch recheck, frozen-baseline lookup, snapshot freeze, repo hygiene, quality gates, scaffold generator, self-check, plugin manifest validator, plugin packer, plugin icon generator, GitHub API sync |
| Generator | `scaffold.mjs`: five personas × fifteen page types × dark tokens, optional React/Vue output |

## Two modes

```bash
# Mode A: improve an existing UI — baseline first
node scripts/screenshot.mjs --url http://localhost:5173/ --out .design/before
node scripts/audit.mjs --url http://localhost:5173/ --themes light,dark

# Mode B: generate from zero, verify in one command
node scripts/scaffold.mjs --persona rational --out ui --pages landing,app,states --verify

# Borrow a reference site's measured values directly
node scripts/scaffold.mjs --ref-url https://linear.app --out ui --pages app,form --verify
```

`--verify` starts a local server and runs `audit.mjs` (light + dark) plus `contrast_check.py`; the report lands in `<out>/.verify/report.json`. Exit codes: **0** pass, **1** a check failed, **3** partial verification (missing python or playwright — **not** a pass; add `--allow-partial` to accept it explicitly).

Generated output is a starting point, not a finished product: replace every `{{TODO: ...}}` placeholder with real copy.

## Scripts

| Script | What it does |
| --- | --- |
| `scaffold.mjs` | Generate tokens + components + pages; five personas, fifteen page types, dark tokens, React/Vue output |
| `screenshot.mjs` | Multi-viewport, multi-theme full-page screenshots with CLS and console capture |
| `audit.mjs` | Structure + axe WCAG 2.1 A/AA + CLS + motion; `--design-system` checks type/spacing/radius/shadow against a declared system |
| `flow.mjs` | Declarative interaction checks: fill form → submit → expect success; per-step screenshots |
| `fidelity.mjs` | Pixel-level comparison between a design file and the implementation |
| `contrast_check.py` | Token-level contrast audit, supports `color-mix` and `.dark` |
| `probe-ref.mjs` | Measure any reference site's real fonts, colors, radii, spacing into JSON |
| `agent-adapter.mjs` | Generate entry files for Codex, Gemini CLI, Cursor, Windsurf, Cline, Roo, Continue, OpenHands, Aider and Zed |
| `recheck-refs.mjs` | Re-measure all 17 single-site references, diff against a baseline, write `docs/reference-recheck.md` |
| `auth.mjs` | Export a logged-in browser state for later audits and screenshots |
| `crop_logo.py` | Trim, square and export brand marks |
| `hygiene.mjs` | Find unreferenced assets, duplicate routes and oversized files |
| `run_checks.mjs` | Run the project's own lint / typecheck / test / build gates |
| `pixel_diff.py` | Pixel comparison engine used by `fidelity.mjs` |
| `selfcheck.mjs` | 23 gates: syntax, generation, contrast, audit, flows, docs, baselines, plugin manifest, red-flag tiers, RTL probe, DESIGN.md import |
| `plugin-validate.mjs` | Validate the OpenDesign plugin manifest: folder/name match, version sync, placeholders, `until`, referenced paths |
| `plugin-pack.mjs` | Package the plugin as a reproducible zip (hand-written ZIP writer, fixed timestamps) |
| `sync-github-api.py` | Sync the GitHub mirror through the Git Data API: master + tag + release + asset + tree check |

Full parameters and exit codes: [`docs/scripts.md`](docs/scripts.md).

## Design-system audit

The skill's own baseline — 5–7 type steps, a 4px spacing grid, a bounded radius set, at most three shadow recipes — used to be advice only. Now it is measurable:

```bash
# first pass: report drift, do not force a rewrite
node scripts/audit.mjs --url http://localhost:5173/ --themes light,dark --design-system

# once the project's tokens are settled: use it as a CI gate
node scripts/audit.mjs --url http://localhost:5173/ \
  --design-system design-system.json --strict-design-system
```

It counts visible text sizes, padding/margin/gap, non-pill radii and full `box-shadow` declarations, then compares them with declared scales or budgets. Defaults: `spacingBase=4`, `tolerance=0.25`, 7 font sizes, 4 radii, 3 shadows. Warnings do not change the exit code unless `--strict-design-system` is set. Config keys and exemptions: [`docs/scripts.md`](docs/scripts.md).

## Quality gates

| Check | Command | Standard |
| --- | --- | --- |
| Screenshots | `screenshot.mjs` before/after | 1440 / 768 / 390, light + dark, reviewed one by one |
| Structure & a11y | `audit.mjs --themes light,dark` | 0 errors; every warning fixed or explained |
| Contrast | `contrast_check.py <css dir>` | all pairs pass |
| Build | `run_checks.mjs` | only when the project has a `package.json` |
| Fidelity | `fidelity.mjs --design … --url …` | pixels over threshold ≤ 2% |
| Design system | `audit.mjs --design-system <config>` | no drift, or declared exceptions |

Keyboard walk-through (Tab reachable, visible focus, Esc closes overlays) and 200% zoom remain manual steps — do not skip them.

## Self-assessment: A+ (all five dimensions at A, three gates closed)

This is a self-grade, not third-party certification. Every claim below maps to a file you can open or a command you can run.

| Dimension | Grade | Current state | Verify with |
| --- | --- | --- | --- |
| Executable checks | A+ | **21 scripts** (17 Node + 4 Python), every one reports via exit code: `0 pass / 1 check failed / 2 bad arguments or environment / 3 partial, not a pass` | `ls scripts/*.mjs scripts/*.py` |
| Reference data | A+ | 28 real sites measured in-browser + 17 single-site distillations + **structural evidence for all 17** (landmarks / heading levels / DOM depth / `alt` coverage) + **a dated frozen snapshot**; 34 reference files + 3 machine-readable datasets | `wc -l references/*.md`, `jq . references/reference-snapshot.json` |
| Self-check loop | A+ | **19 gates**: argument semantics / recursive syntax / 15 generated pages / 645 contrast pairs / **306 audit runs (4-way parallel, 2m47s)** / design-system positive and negative cases / **4 flow suites** (12 + 6 + 42 + 45 steps) / **token export** / framework stack / 11 agent entry points / doc counts and links / reference snapshot / **resident-layer size** / **baseline drift** / **anti-pattern pointer** / changelog dates | `npm run selfcheck` |
| Documentation | A | Thin entry point + on-demand reference library + per-script manuals with arguments, exit codes and artifacts | `SKILL.md`, `docs/scripts.md` |
| Honest boundaries | A+ | Explicit non-goals (test framework, Figma import, native mini-program, visual regression as a default gate); **13 red flags** | "When not to use", [`review-rubric.md`](references/review-rubric.md) §10 |

**Why A to A+** — all three gates closed in `v1.23.1`, each independently checkable:

| # | Former gap | How it is closed now | How to verify |
| --- | --- | --- | --- |
| 1 | Payment callback / order state machine / refunds were not in the skeleton | `orders.html` + `order.html`: 7 states (pending / paid / shipped / completed / refunding / refunded / canceled) kept in sync across banner, timeline and action group; refund uses a native `dialog` | `node scripts/scaffold.mjs --pages orders,order --verify`; `flow.order.example.json` (45 steps) |
| 2 | Mobile had exactly one shell | **Four** now: list shell + multi-step wizard + horizontal pager + native-bridge shell (with a `postMessage` contract and a no-bridge fallback) | `--pages mobile,mobile-wizard,mobile-pager,mobile-native`; each new page passes 6 audit runs |
| 3 | The reference library had no snapshot | `references/reference-snapshot.json` carries `capturedAt` / `frozenAt` / `method`; `recheck-refs.mjs` only reports drift, `--freeze` writes; new `snapshot-refs.mjs` freezes offline | The "reference snapshot" gate in `selfcheck` validates the date, rejects future dates, and requires comparable numbers per site |

**The grade is earned, not permanent**: any `selfcheck` item can revoke it. If audits regress, a flow breaks,
or the snapshot gate fails, the grade goes back down — that constraint is part of the claim.

Two **declared non-goals** remain (not gaps): Figma design import, and visual regression as a default gate
(`fidelity.mjs` needs a design file first).

### v1.24.0 — token discipline

The only text that costs tokens on **every** session is the frontmatter `description`: it sits in context
whether or not the skill triggers. `references/` is an on-demand layer and the body is a post-trigger layer,
so the lever is a thinner description, not further splitting reference files.

| Change | Effect |
| --- | --- |
| Description trimmed | **929 → 399 est tokens (−57%)**; enumerations and count formulas removed, `不用于` (not-for) boundary added |
| `scripts/lookup.mjs` + `references/baseline.json` | 32 frozen values queried in one line ("value + rationale + `file:line`"); no more reading the 69KB `design-evidence.md` for one number. `--verify` re-locates every anchor (exit 3 on line drift, `--fix` rewrites line numbers only) |
| `audit.mjs --red-flags` | 13 anti-pattern checks lifted out of `anti-slop.md` §8 into exit codes (`--strict-red-flags` makes them fail the run) — the opposite of "move the doc to the front", which would *add* resident tokens |
| `bench/` | 3 tasks × 4 conditions (no skill / frozen legacy / current / **length-matched unrelated skill**), Pass@2 + token accounting; `verify-length.mjs` enforces the ±10% length match |

Three new gates enforce this: **resident-layer size** (description ≤400 est tokens, must contain the `不用于`
boundary, body ≤200 non-empty lines), **baseline drift** (structure + frozen means 14.7/69.8px + 32 anchors
re-locate), and **anti-pattern pointer** (the `visual-system.md` → `anti-slop.md` pointer and its claimed
section counts still resolve).

## Which reference to copy

| You are building | Copy this |
| --- | --- |
| Marketing / product landing page | [`references/wegic-design.md`](references/wegic-design.md), [`jsdesign-design.md`](references/jsdesign-design.md) |
| Dense gallery / content list | [`references/uishijie-design.md`](references/uishijie-design.md) |
| Sparse gallery with a masthead | [`references/zcool-design.md`](references/zcool-design.md) |
| Catalog of distinct items | [`references/stylekit-design.md`](references/stylekit-design.md) |
| Inspiration library where the UI disappears | [`references/uinotes-design.md`](references/uinotes-design.md) |
| Admin panel / B2B workspace | [`references/antd-integration.md`](references/antd-integration.md) when the project uses antd, [`mastergo-b2b.md`](references/mastergo-b2b.md), [`component-spec.md`](references/component-spec.md) |
| Auth / multi-step form | [`references/vercel-auth.md`](references/vercel-auth.md) |
| Commerce product configuration | [`references/applestore-commerce.md`](references/applestore-commerce.md) |
| Award directory / daily feature | [`references/awwwards-design.md`](references/awwwards-design.md) |
| Motion | [`references/motion-spec.md`](references/motion-spec.md), [`holynova-motion.md`](references/holynova-motion.md) |

Two files apply to every page type: [`anti-slop.md`](references/anti-slop.md) (AI tells, pre-flight list) and [`craft-floor.md`](references/craft-floor.md) (craft floor, depth languages, browser-native surfaces).

## DESIGN.md interop

[DESIGN.md](https://stitch.withgoogle.com/docs/design-md/overview/) is a Google Stitch format: a plain-text
design system an agent can read. `scaffold.mjs` emits one on every run, with **Stitch's ten sections plus three
of ours** (`Motion`, `Accessibility floors`, how to verify) — a gate fails if the section set drifts.

### Import someone else's

```bash
node scripts/scaffold.mjs --design-md path/to/DESIGN.md --out ui --pages app,form --verify
```

`colors.primary` drives the hue (the ramp is recomputed for contrast, not copied as a hex), `canvas`/`ink`/
`hairline` map to `--bg`/`--ink`/`--border`, `rounded.md` to `--r-md`, the smallest `spacing` step to the spacing
base (floor 4px), and the type scale to the eight size tokens (floor 12px). Dark-canvas files are treated as
dark-first (no mismatched `.dark` block), and anything unmappable is listed in the generated DESIGN.md instead
of being silently swallowed.

### How trustworthy are those files

We re-measured all 84 samples of [`VoltAgent/awesome-design-md`](https://github.com/VoltAgent/awesome-design-md)
site by site — full report in [`docs/design-md-recheck.md`](docs/design-md-recheck.md):

| Claim | Strict (equals `body` computed value) | Loose (appears in the page's color inventory) |
| --- | --- | --- |
| `colors.canvas` | 61% | 65% |
| `colors.ink` | 43% | 70% |
| `rounded.md` | 63% | — |
| Body type size | median 2px off, 73% within ±2px | — |

Coverage matters as much: 74 of 84 have frontmatter, 46 sites were measured, and 10 files are prose-only.
**Reference material, not a contract** — which is why `--design-md` fails loudly on a missing frontmatter
instead of degrading quietly.

## Use it from other agents

Nothing here is tied to one client: the entry is `SKILL.md` and the tools are plain Node/Python.
Generate the rule file your agent reads — pointers only, no duplicated reference library:

```bash
node scripts/agent-adapter.mjs --target codex --out <project>   # AGENTS.md
node scripts/agent-adapter.mjs --target cursor --out <project>  # .cursor/rules/*.mdc
node scripts/agent-adapter.mjs --all --out <project>            # every adapter
```

Supported: Codex CLI / generic (`AGENTS.md`), Gemini CLI (`GEMINI.md`), Cursor, Windsurf, Cline,
Roo Code, Continue, OpenHands, Aider (`CONVENTIONS.md`), Zed (`.rules`).
Installer also targets WorkBuddy: `bash install.sh --target workbuddy` (or `--target all`).
See [`docs/agents.md`](docs/agents.md) for the loading differences and the parts this does not promise.

## Repository layout

```
SKILL.md                  entry for the agent
README.md / README.en.md  Chinese / English overview (this file)
references/                measured references and specs
scripts/                   executables + vendored axe-core (MPL-2.0)
docs/                     script manual, site index, recheck reports, OpenDesign plugin notes
evals/                    5 acceptance cases (audit / restore / scaffold / missing input / out of scope)
open-design.json          OpenDesign plugin manifest (Plugin Spec v1)
install.sh / install.ps1  installers for Claude Code and DSH
```

## Requirements

- Node.js ≥ 18
- Playwright + Chromium for screenshots and audits: `npm i -D playwright && npx playwright install chromium`
- Python ≥ 3.9 with Pillow and NumPy for cropping and pixel diffing

## License

MIT, see [`LICENSE`](LICENSE). Third-party exception: `scripts/vendor/axe.min.js` is [axe-core](https://github.com/dequelabs/axe-core) 4.14.0 under **MPL-2.0**, keep its header notice; it is not relicensed by this repository's MIT.

---

The Chinese README is the primary document and contains the full detail; this English file is a complete overview of the same project. Contributions and corrections to either are welcome.
