# frontend-fidelity · make the UI match what it claims

[中文](README.md) | **English**

> Two ways to work: **existing UI** — rebuild from a design file or screenshot, or clean up a live admin panel, H5 page, mini-program webview, multi-end consistency, logo and brand assets; **no UI yet** — generate a verifiable skeleton from tokens (tokens + components + ten page types, mobile shell and a three-page commerce flow included), then fill in real content and states.
> The reference library is **28 real sites measured element by element + 17 single-site distillations** (marketing, tool sites, SaaS homepages, editorial homepages, developer feeds, product stages, dense and sparse galleries, catalog pages, inspiration libraries, style directories, magazine indexes, B2B workspaces, auth, commerce configuration, motion), plus **two distilled external rule sets** (craft floor / anti-slop checklist). Pick by page type in [Which reference to copy](#which-reference-to-copy).
> **Counting rule**: 28 measured sites = **Group A 25** (16 marketing/product/commerce + 9 content galleries) + **Group B 3 backend tools**. Cross-site averages stay frozen at the original 18-site baseline; newer samples only add sites and single-site entries. Totals are always 28 / Group A 25 — `selfcheck.mjs` guards this.
> The goal is not "make it prettier" but **make the interface match what it claims to be, and actually work — with evidence**.

`v1.21.0` · [latest release](https://github.com/liuzheng6621/frontend-fidelity/releases/latest) · `MIT` · `Node.js ≥ 18` · `Python ≥ 3.9 (cropping/contrast only)` · `offline WCAG checks` · `15 executables (12 Node + 3 Python)`

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
| Reference library | 29 Markdown files: 17 single-site distillations + 8 general specs + 1 cross-site evidence file + 2 external rule sets + 1 workflow — plus 2 machine-readable datasets (recheck baseline / REA structure evidence) |
| Executables | 15 scripts: screenshots, WCAG/CLS audit, contrast, design-system audit, flow checks, pixel diff, auth export, reference probe, batch recheck, repo hygiene, quality gates, scaffold generator, self-check |
| Generator | `scaffold.mjs`: five personas × ten page types × dark tokens, optional React/Vue output |

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
| `scaffold.mjs` | Generate tokens + components + pages; five personas, ten page types, dark tokens, React/Vue output |
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
| `selfcheck.mjs` | Verify the skill itself: syntax, generation, contrast, audit, flows, docs counts/links/dates, version pointers |

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

## Which reference to copy

| You are building | Copy this |
| --- | --- |
| Marketing / product landing page | [`references/wegic-design.md`](references/wegic-design.md), [`jsdesign-design.md`](references/jsdesign-design.md) |
| Dense gallery / content list | [`references/uishijie-design.md`](references/uishijie-design.md) |
| Sparse gallery with a masthead | [`references/zcool-design.md`](references/zcool-design.md) |
| Catalog of distinct items | [`references/stylekit-design.md`](references/stylekit-design.md) |
| Inspiration library where the UI disappears | [`references/uinotes-design.md`](references/uinotes-design.md) |
| Admin panel / B2B workspace | [`references/mastergo-b2b.md`](references/mastergo-b2b.md), [`component-spec.md`](references/component-spec.md) |
| Auth / multi-step form | [`references/vercel-auth.md`](references/vercel-auth.md) |
| Commerce product configuration | [`references/applestore-commerce.md`](references/applestore-commerce.md) |
| Award directory / daily feature | [`references/awwwards-design.md`](references/awwwards-design.md) |
| Motion | [`references/motion-spec.md`](references/motion-spec.md), [`holynova-motion.md`](references/holynova-motion.md) |

Two files apply to every page type: [`anti-slop.md`](references/anti-slop.md) (AI tells, pre-flight list) and [`craft-floor.md`](references/craft-floor.md) (craft floor, depth languages, browser-native surfaces).

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
references/               29 measured references and specs
scripts/                  14 executables + vendored axe-core (MPL-2.0)
docs/                     script manual, site index, recheck report
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
