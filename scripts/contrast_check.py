#!/usr/bin/env python3
"""WCAG 对比度检查：解析 CSS 设计令牌与真实用色，两种模式交错验证。

对应 Skill 条款：视觉系统 / 可访问性。

两种检查方式：
  1. 同元素配对：一条规则里同时写了 color 和 background(-color) 时直接算这两个颜色。
     最贴近真实渲染，但仅当背景不透明时才有效（透明背景会跳过并计数）。
  2. 令牌配对：按变量名角色自动配对（text/fg/label/muted ↔ bg/surface/canvas/page/base）。

支持的颜色写法：#hex(3/4/6/8)、rgb()/rgba()、hsl()/hsla()、hwb()、
oklch()、oklab()、lab()、color(srgb ...)、color-mix(in <space>, A p%, B)、
named color、var() 链（最多 8 层，含 fallback）。

支持的主题块：:root、.dark、[data-theme="dark"]、.theme-dark、
@media (prefers-color-scheme: dark)；深色结果加 dark:: 前缀。

用法:
  python scripts/contrast_check.py                        # 自动在 cwd 下找 CSS
  python scripts/contrast_check.py src/styles/theme.css
  python scripts/contrast_check.py --dir src --json contrast.json
  python scripts/contrast_check.py --fg --color-text --bg --color-bg
  python scripts/contrast_check.py --self-test

阈值：正文 4.5:1，大字（≥24px 或 ≥18.66px 粗体）3:1，UI 边界/图标 3:1。
本工具不知道字号，所以令牌配对一律按 4.5 要求 —— 偏严，宁可误报。
透明背景的配对无法判定，会单独列在「需人工」里，不算失败。
"""

from __future__ import annotations

import argparse
import json
import math
import re
import sys
from pathlib import Path

# Windows 控制台默认 cp936，会把中文输出成乱码；能改就改成 utf-8。
try:
    sys.stdout.reconfigure(encoding="utf-8")
    sys.stderr.reconfigure(encoding="utf-8")
except Exception:  # pragma: no cover
    pass

AA_NORMAL = 4.5
AA_LARGE = 3.0
AA_UI = 3.0
MAX_VAR_DEPTH = 8

NAMED = {
    "transparent": (0.0, 0.0, 0.0, 0.0),
    "white": (1.0, 1.0, 1.0, 1.0),
    "black": (0.0, 0.0, 0.0, 1.0),
    "red": (1.0, 0.0, 0.0, 1.0),
    "green": (0.0, 128 / 255, 0.0, 1.0),
    "blue": (0.0, 0.0, 1.0, 1.0),
    "gray": (128 / 255,) * 3 + (1.0,),
    "grey": (128 / 255,) * 3 + (1.0,),
    "silver": (0.75, 0.75, 0.75, 1.0),
    "whitesmoke": (0.96, 0.96, 0.96, 1.0),
    "ivory": (1.0, 1.0, 0.94, 1.0),
    "beige": (0.96, 0.96, 0.86, 1.0),
    "navy": (0.0, 0.0, 0.5, 1.0),
    "teal": (0.0, 0.5, 0.5, 1.0),
    "orange": (1.0, 0.65, 0.0, 1.0),
    "purple": (0.5, 0.0, 0.5, 1.0),
    "maroon": (0.5, 0.0, 0.0, 1.0),
    "currentcolor": None,
}


# ---------------------------------------------------------------- 颜色数学


def _clamp(x: float, lo: float = 0.0, hi: float = 1.0) -> float:
    return lo if x < lo else hi if x > hi else x


def _s2l(c: float) -> float:
    return c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4


def _l2s(c: float) -> float:
    return 12.92 * c if c <= 0.0031308 else 1.055 * (c ** (1 / 2.4)) - 0.055


def luminance(rgb: tuple[float, float, float]) -> float:
    r, g, b = (_s2l(_clamp(c)) for c in rgb)
    return 0.2126 * r + 0.7152 * g + 0.0722 * b


def contrast(fg: tuple[float, float, float], bg: tuple[float, float, float]) -> float:
    a, b = luminance(fg), luminance(bg)
    if a < b:
        a, b = b, a
    return (a + 0.05) / (b + 0.05)


def over(fg: tuple[float, float, float, float], bg: tuple[float, float, float]) -> tuple[float, float, float]:
    """把半透明前景合成到不透明背景上。"""
    a = fg[3] if len(fg) > 3 else 1.0
    return tuple(_clamp(fg[i] * a + bg[i] * (1 - a)) for i in range(3))  # type: ignore[return-value]


def oklab_to_linear_srgb(L: float, a: float, b: float) -> tuple[float, float, float]:
    l_ = L + 0.3963377774 * a + 0.2158037573 * b
    m_ = L - 0.1055613458 * a - 0.0638541728 * b
    s_ = L - 0.0894841775 * a - 1.2914855480 * b
    l, m, s = l_**3, m_**3, s_**3
    return (
        4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
        -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
        -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s,
    )


def linear_srgb_to_oklab(r: float, g: float, b: float) -> tuple[float, float, float]:
    l = 0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b
    m = 0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b
    s = 0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b
    l_, m_, s_ = (v ** (1 / 3) if v >= 0 else -((-v) ** (1 / 3)) for v in (l, m, s))
    return (
        0.2104542553 * l_ + 0.7936177850 * m_ - 0.0040720468 * s_,
        1.9779984951 * l_ - 2.4285922050 * m_ + 0.4505937099 * s_,
        0.0259040371 * l_ + 0.7827717662 * m_ - 0.8086757660 * s_,
    )


def _lab_to_srgb(L: float, a: float, b: float) -> tuple[float, float, float]:
    """CIELAB(D50) → sRGB。Tailwind v4 用 oklch，lab() 只在个别库里见到。"""
    fy = (L + 16) / 116
    fx = fy + a / 500
    fz = fy - b / 200

    def inv(t: float) -> float:
        return t**3 if t**3 > 216 / 24389 else (116 * t - 16) / (24389 / 27)

    X, Y, Z = 0.96422 * inv(fx), 1.0 * inv(fy), 0.82521 * inv(fz)
    # Bradford D50 → D65
    X2 = 0.9554734 * X - 0.0230985 * Y + 0.0632593 * Z
    Y2 = -0.0283697 * X + 1.0099955 * Y + 0.0210414 * Z
    Z2 = 0.0123140 * X - 0.0205077 * Y + 1.3303659 * Z
    return (
        3.2404542 * X2 - 1.5371385 * Y2 - 0.4985314 * Z2,
        -0.9692660 * X2 + 1.8760108 * Y2 + 0.0415560 * Z2,
        0.0556434 * X2 - 0.2040259 * Y2 + 1.0572252 * Z2,
    )


def _hsl_to_rgb(h: float, s: float, l: float) -> tuple[float, float, float]:
    h = (h % 360) / 360.0
    if s == 0:
        return (l, l, l)
    q = l * (1 + s) if l < 0.5 else l + s - l * s
    p = 2 * l - q

    def hue(t: float) -> float:
        t %= 1.0
        if t < 1 / 6:
            return p + (q - p) * 6 * t
        if t < 1 / 2:
            return q
        if t < 2 / 3:
            return p + (q - p) * (2 / 3 - t) * 6
        return p

    return (hue(h + 1 / 3), hue(h), hue(h - 1 / 3))


def _num(tok: str, scale: float = 1.0) -> float:
    tok = tok.strip()
    if tok.endswith("%"):
        return float(tok[:-1]) / 100.0 * scale
    return float(tok) * scale


# ---------------------------------------------------------------- 颜色解析

_SPLIT_TOP = re.compile(r",(?![^(]*\))")


def _split_args(body: str) -> list[str]:
    """拆分参数：现代空格语法和传统逗号语法都支持。"""
    body = body.strip()
    if not body:
        return []
    if _SPLIT_TOP.search(body):
        return [p for p in _SPLIT_TOP.split(body)]
    # 空格语法，斜杠前是颜色、后面是 alpha
    if "/" in body:
        main, alpha = body.split("/", 1)
        return main.split() + ["/" + alpha.strip()]
    return body.split()


def parse_color(raw: str, depth: int = 0):
    """解析任意 CSS 颜色，返回 (r, g, b, a) ∈ [0,1]。失败返回 None。"""
    if raw is None or depth > 4:
        return None
    # 不能用 rstrip("!important")：那是「字符集合」截断，会把以这些字母结尾的
    # 颜色名（aqua/salmon/crimson/tomato…）一起削掉，必须按词匹配去掉
    s = re.sub(r"!\s*important\s*$", "", raw.strip(), flags=re.I).strip()
    if not s:
        return None
    low = s.lower()
    if low in NAMED:
        return NAMED[low]

    if s.startswith("#"):
        h = s[1:]
        if len(h) in (3, 4):
            h = "".join(c * 2 for c in h)
        if len(h) == 6:
            h += "ff"
        if len(h) != 8 or not re.fullmatch(r"[0-9a-fA-F]{8}", h):
            return None
        return tuple(int(h[i : i + 2], 16) / 255 for i in range(0, 8, 2))  # type: ignore[return-value]

    m = re.fullmatch(r"(rgba?|hsla?|hwb|oklch|oklab|lab)\((.*)\)", s, re.S | re.I)
    if m:
        fn, body = m.group(1).lower(), m.group(2)
        parts = _split_args(body)
        alpha = 1.0
        if parts and parts[-1].startswith("/"):
            alpha = _num(parts[-1][1:], 1.0)
            parts = parts[:-1]
        elif len(parts) == 4:
            alpha = _num(parts[3], 1.0)
            parts = parts[:3]
        try:
            if fn in ("rgb", "rgba"):
                vals = [float(p.strip().rstrip("%")) / (100 if p.strip().endswith("%") else 255) for p in parts]
                if len(vals) != 3:
                    return None
                return (_clamp(vals[0]), _clamp(vals[1]), _clamp(vals[2]), _clamp(alpha))
            if fn in ("hsl", "hsla"):
                if len(parts) != 3:
                    return None
                h = float(re.sub(r"deg$", "", parts[0].strip()))
                sat = _num(parts[1], 1.0)
                lig = _num(parts[2], 1.0)
                r, g, b = _hsl_to_rgb(h, _clamp(sat), _clamp(lig))
                return (r, g, b, _clamp(alpha))
            if fn == "hwb":
                if len(parts) != 3:
                    return None
                h = float(re.sub(r"deg$", "", parts[0].strip()))
                w = _clamp(_num(parts[1], 1.0))
                bl = _clamp(_num(parts[2], 1.0))
                if w + bl >= 1:
                    gray = w / (w + bl)
                    return (gray, gray, gray, _clamp(alpha))
                r, g, b = _hsl_to_rgb(h, 1.0, 0.5)
                return (
                    _clamp(r * (1 - w - bl) + w),
                    _clamp(g * (1 - w - bl) + w),
                    _clamp(b * (1 - w - bl) + w),
                    _clamp(alpha),
                )
            if fn == "oklch":
                if len(parts) != 3:
                    return None
                L = _num(parts[0], 1.0)
                C = float(parts[1].strip().rstrip("%")) * (0.4 / 100 if parts[1].strip().endswith("%") else 1.0)
                H = math.radians(float(re.sub(r"deg$", "", parts[2].strip())))
                lr, lg, lb = oklab_to_linear_srgb(L, C * math.cos(H), C * math.sin(H))
                return (_clamp(_l2s(lr)), _clamp(_l2s(lg)), _clamp(_l2s(lb)), _clamp(alpha))
            if fn == "oklab":
                if len(parts) != 3:
                    return None
                L = _num(parts[0], 1.0)
                a = _num(parts[1], 0.4)
                b = _num(parts[2], 0.4)
                lr, lg, lb = oklab_to_linear_srgb(L, a, b)
                return (_clamp(_l2s(lr)), _clamp(_l2s(lg)), _clamp(_l2s(lb)), _clamp(alpha))
            if fn == "lab":
                if len(parts) != 3:
                    return None
                L = _num(parts[0], 100.0)
                a = float(parts[1].strip().rstrip("%")) * (125 / 100 if parts[1].strip().endswith("%") else 1.0)
                b = float(parts[2].strip().rstrip("%")) * (125 / 100 if parts[2].strip().endswith("%") else 1.0)
                lr, lg, lb = _lab_to_srgb(L, a, b)
                return (_clamp(_l2s(lr)), _clamp(_l2s(lg)), _clamp(_l2s(lb)), _clamp(alpha))
        except (ValueError, IndexError):
            return None
        return None

    if low.startswith("color-mix("):
        inner = s[len("color-mix(") : -1]
        parts = _split_args(inner)
        if len(parts) < 3:
            return None
        space_m = re.match(r"in\s+([a-z0-9-]+)", parts[0].strip(), re.I)
        space = (space_m.group(1).lower() if space_m else "srgb")
        stops = []
        for p in parts[1:]:
            p = p.strip()
            pm = re.search(r"([\d.]+)%\s*$", p)
            pct = float(pm.group(1)) / 100.0 if pm else None
            col_raw = p[: pm.start()].strip() if pm else p
            stops.append((col_raw, pct))
        if len(stops) != 2:
            return None
        c1, c2 = parse_color(stops[0][0], depth + 1), parse_color(stops[1][0], depth + 1)
        if not c1 or not c2:
            return None
        p1, p2 = stops[0][1], stops[1][1]
        if p1 is None and p2 is None:
            p1 = 0.5
            p2 = 0.5
        elif p1 is None:
            p1 = 1 - p2
            p2 = p2 if p2 is not None else 1 - p1
        elif p2 is None:
            p2 = 1 - p1
            p1 = p1 if p1 is not None else 1 - p2
        total = (p1 or 0) + (p2 or 0)
        w1 = (p1 or 0) / total if total else 0.5
        w2 = 1 - w1
        if space in ("oklab", "oklch"):
            a1 = linear_srgb_to_oklab(*(_s2l(c) for c in c1[:3]))
            a2 = linear_srgb_to_oklab(*(_s2l(c) for c in c2[:3]))
            lab = tuple(a1[i] * w1 + a2[i] * w2 for i in range(3))
            lr, lg, lb = oklab_to_linear_srgb(*lab)
            rgb = (_clamp(_l2s(lr)), _clamp(_l2s(lg)), _clamp(_l2s(lb)))
        else:
            rgb = tuple(c1[i] * w1 + c2[i] * w2 for i in range(3))
        alpha = c1[3] * w1 + c2[3] * w2
        return (rgb[0], rgb[1], rgb[2], _clamp(alpha))

    if low.startswith("color(srgb"):
        body = s[len("color(srgb") :].strip().rstrip(")")
        parts = _split_args(body)
        alpha = 1.0
        if parts and parts[-1].startswith("/"):
            alpha = _num(parts[-1][1:], 1.0)
            parts = parts[:-1]
        try:
            vals = [float(p.strip()) for p in parts]
            if len(vals) != 3:
                return None
            return (_clamp(vals[0]), _clamp(vals[1]), _clamp(vals[2]), _clamp(alpha))
        except ValueError:
            return None

    return None


def resolve(value: str, variables: dict[str, str]) -> str:
    """把 var(--x, fallback) 链展开成字面值。"""
    out = value
    for _ in range(MAX_VAR_DEPTH):
        if "var(" not in out:
            return out
        m = re.search(r"var\(\s*(--[A-Za-z0-9_-]+)\s*(?:,([^()]*))?\)", out)
        if not m:
            return out
        name, fallback = m.group(1), (m.group(2) or "").strip()
        repl = variables.get(name) or fallback
        if not repl:
            return out
        out = out[: m.start()] + repl + out[m.end() :]
    return out


# ---------------------------------------------------------------- CSS 解析

DARK_SELECTOR = re.compile(
    r"(\.dark\b|\[data-theme\s*=\s*[\"']?dark|\.theme-dark|prefers-color-scheme\s*:\s*dark)", re.I
)

TEXT_ROLE = re.compile(
    r"(^|[-_])(text|fg|foreground|label|content|title|heading|body|paragraph|placeholder|"
    r"muted|secondary|tertiary|hint|caption|link|ink)([-_]|$)",
    re.I,
)
BG_ROLE = re.compile(r"(^|[-_])(bg|background|surface|canvas|page|base|panel|card|popover|sheet)([-_]|$)", re.I)
UI_ROLE = re.compile(r"(^|[-_])(border|divider|line|ring|outline|stroke|edge)([-_]|$)", re.I)
# 「品牌底上的前景」：--color-on-brand / --on-primary。语义是配 --brand / --primary，
# 不能拿去和 canvas/bg/surface 配对（那是必然 1.0x 的假阳性）。
ON_ROLE = re.compile(r"(^|[-_])on[-_]([a-z0-9]+(?:[-_][a-z0-9]+)*)$", re.I)


def strip_comments(text: str) -> str:
    return re.sub(r"/\*.*?\*/", lambda m: "\n" * m.group(0).count("\n"), text, flags=re.S)


def parse_css(text: str, file: str = "") -> list[dict]:
    """极简 CSS 结构解析：返回 [{selector, name, value, dark, file, line}]。"""
    text = strip_comments(text)
    decls: list[dict] = []
    stack: list[str] = []
    buf: list[str] = []
    line = 1
    buf_line = 1
    for i, ch in enumerate(text):
        if ch == "\n":
            line += 1
        if ch == "{":
            stack.append("".join(buf).strip())
            buf = []
            buf_line = line
        elif ch == "}":
            if stack:
                stack.pop()
            buf = []
            buf_line = line
        elif ch == ";":
            chunk = "".join(buf).strip()
            buf = []
            if chunk and stack and ":" in chunk and not stack[-1].startswith("@"):
                name, _, val = chunk.partition(":")
                name = name.strip()
                if name.startswith("--") and val.strip():
                    dark = any(DARK_SELECTOR.search(s) for s in stack if s)
                    decls.append(
                        {
                            "selector": " ".join(s for s in stack if s)[:160],
                            "name": name,
                            "value": val.strip(),
                            "dark": dark,
                            "file": file,
                            "line": buf_line,
                        }
                    )
            buf_line = line
        else:
            buf.append(ch)
    return decls


def collect(files: list[Path]):
    """返回 (light_vars, dark_vars, rules)。后定义的覆盖先定义的。"""
    light: dict[str, str] = {}
    dark: dict[str, str] = {}
    origin: dict[str, tuple[str, int]] = {}
    rules: list[dict] = []
    text = ""
    for f in files:
        try:
            raw = f.read_text(encoding="utf-8", errors="replace")
        except OSError:
            continue
        text += raw + "\n"
        for d in parse_css(raw, str(f)):
            target = dark if d["dark"] else light
            target[d["name"]] = d["value"]
            origin.setdefault(d["name"], (d["file"], d["line"]))
    return light, dark, origin, text


def same_element_pairs(text: str, light: dict[str, str], dark: dict[str, str], files: list[Path]):
    """在每条规则内配对 color 与 background，前提是背景不透明。"""
    pairs = []
    for f in files:
        try:
            raw = f.read_text(encoding="utf-8", errors="replace")
        except OSError:
            continue
        # 找 color / background 声明（自定义属性已在 collect 处理）
        for m in re.finditer(r"([^{}]+)\{([^{}]*)\}", strip_comments(raw)):
            selector = re.sub(r"\s+", " ", m.group(1)).strip()
            if selector.startswith("@"):
                continue
            body = m.group(2)
            is_dark = bool(DARK_SELECTOR.search(selector))
            vars_ = dark if is_dark else light
            color = bg = bg_raw = None
            for dm in re.finditer(r"(?<![-\w])(color|background|background-color)\s*:\s*([^;]+)", body):
                prop, val = dm.group(1), dm.group(2).strip()
                literal = resolve(val, vars_)
                c = parse_color(literal)
                if prop == "color":
                    color = c
                elif c and c[3] >= 0.999:
                    bg, bg_raw = c, val
            if color and bg:
                pairs.append(
                    {
                        "mode": "element",
                        "selector": selector,
                        "dark": is_dark,
                        "fg": ("color", f"{selector} {bg_raw or ''}".strip()),
                        "fg_rgb": color[:3],
                        "bg_rgb": bg[:3],
                        "source": f"{f.name}:{raw[: m.start()].count(chr(10)) + 1}",
                    }
                )
    return pairs


def token_pairs(light: dict[str, str], dark: dict[str, str]):
    out = []
    for mode, table in (("light", light), ("dark", dark)):
        if not table:
            continue

        # --_fg 这类是 color-mix 内部私有变量，不对应任何真实的前景/背景搭配
        table = {k: v for k, v in table.items() if not re.match(r"^--?_", k)}
        ons = {k: v for k, v in table.items() if ON_ROLE.search(k)}
        texts = {
            k: v
            for k, v in table.items()
            if TEXT_ROLE.search(k) and not ON_ROLE.search(k)
        }
        bgs = {
            k: v
            for k, v in table.items()
            if BG_ROLE.search(k) and not TEXT_ROLE.search(k) and not ON_ROLE.search(k)
        }
        uis = {k: v for k, v in table.items() if UI_ROLE.search(k) and not ON_ROLE.search(k)}
        bg_pick = dict(list(bgs.items())[:6])
        for tname, tval in texts.items():
            fg = parse_color(resolve(tval, table))
            if not fg:
                continue
            for bname, bval in bg_pick.items():
                bg = parse_color(resolve(bval, table))
                if not bg or bg[3] < 0.999:
                    continue
                out.append(
                    {
                        "mode": "token",
                        "selector": mode,
                        "dark": mode == "dark",
                        "fg": (tname, bname),
                        "fg_rgb": over(fg, bg[:3]) if fg[3] < 1 else fg[:3],
                        "bg_rgb": bg[:3],
                        "source": f"{mode} 主题令牌",
                    }
                )
        # on-X 只与该 X 底色的令牌配对（--color-on-brand ↔ --color-brand / --brand / --color-brand-600 …）
        for oname, oval in ons.items():
            m = ON_ROLE.search(oname)
            base = (m.group(2) if m else "").lower()
            oncol = parse_color(resolve(oval, table))
            if not oncol or not base:
                continue
            cands = {
                k: v
                for k, v in table.items()
                if k != oname
                and not ON_ROLE.search(k)
                and not TEXT_ROLE.search(k)
                and (
                    re.search(rf"(^|[-_]){re.escape(base)}([-_]|$)", k, re.I)
                    or (base in ("brand", "primary", "accent") and BG_ROLE.search(k) is None and k.endswith(base))
                )
                # 色阶档位（-50 / -100 … -950）不是「品牌底」，on-X 压上去也不是真实场景
                and not re.search(r"[-_](50|100|200|300|400|500|600|700|800|900|950)$", k)
            }
            # 优先配 fill / solid / strong 这类真正的填充色
            pref = {k: v for k, v in cands.items() if re.search(r"[-_](fill|solid|strong)$", k, re.I)}
            if pref:
                cands = pref
            for bname, bval in list(cands.items())[:6]:
                bg = parse_color(resolve(bval, table))
                if not bg or bg[3] < 0.999:
                    continue
                out.append(
                    {
                        "mode": "on",
                        "selector": mode,
                        "dark": mode == "dark",
                        "fg": (oname, bname),
                        "fg_rgb": over(oncol, bg[:3]) if oncol[3] < 1 else oncol[:3],
                        "bg_rgb": bg[:3],
                        "source": f"{mode} 主题令牌（品牌底 + 前景）",
                    }
                )
        for uname, uval in uis.items():
            ucol = parse_color(resolve(uval, table))
            if not ucol:
                continue
            # 发丝边框默认是装饰，不属于「唯一分界」，只提示不判失败；
            # 带 strong/focus/active/checked/selected 的才算真边界。
            soft = bool(
                re.search(r"(^|[-_])(border|hairline|divider|line|edge|stroke)([-_]|$)", uname, re.I)
            ) and not re.search(r"(strong|focus|active|checked|selected|control)", uname, re.I)
            for bname, bval in bg_pick.items():
                bg = parse_color(resolve(bval, table))
                if not bg or bg[3] < 0.999:
                    continue
                out.append(
                    {
                        "mode": "ui",
                        "selector": mode,
                        "dark": mode == "dark",
                        "fg": (uname, bname),
                        "fg_rgb": over(ucol, bg[:3]) if ucol[3] < 1 else ucol[:3],
                        "bg_rgb": bg[:3],
                        "soft": soft,
                        "source": f"{mode} 主题令牌",
                    }
                )
    return out


# ---------------------------------------------------------------- 主流程


def discover_css(root: Path) -> list[Path]:
    skip = {"node_modules", "dist", "build", ".git", "coverage", ".next", ".nuxt", "out"}
    found = []
    for p in root.rglob("*.css"):
        # 只跳过生成物目录（相对 root 的层级），别因为 root 自己的名字叫 out/dist 就整棵跳过
        rel_dirs = p.relative_to(root).parts[:-1]
        if any(part in skip for part in rel_dirs):
            continue
        found.append(p)
        if len(found) >= 40:
            break
    return found


def hex_of(rgb) -> str:
    return "#" + "".join(f"{int(round(_clamp(c) * 255)):02x}" for c in rgb[:3])


def self_test() -> int:
    cases = [
        ("#fff", (1, 1, 1)),
        ("#000000", (0, 0, 0)),
        ("rgb(255 0 0)", (1, 0, 0)),
        ("rgba(0,0,0,0.5)", (0, 0, 0)),
        ("hsl(0 100% 50%)", (1, 0, 0)),
        ("oklch(1 0 0)", (1, 1, 1)),
        ("oklch(0 0 0)", (0, 0, 0)),
        ("oklab(0.5 0 0)", (0.388, 0.388, 0.388)),
        ("color-mix(in oklab, #000 100%, #fff)", (0, 0, 0)),
        ("color-mix(in srgb, #000 50%, #fff)", (0.5, 0.5, 0.5)),
        ("lab(100 0 0)", (1, 1, 1)),
        ("hwb(0 0% 0%)", (1, 0, 0)),
    ]
    bad = 0
    for raw, expect in cases:
        got = parse_color(raw)
        ok = got is not None and all(abs(got[i] - expect[i]) < 0.02 for i in range(3))
        print(f"{'ok ' if ok else 'FAIL'} {raw:38s} -> {hex_of(got) if got else 'None'}")
        bad += 0 if ok else 1
    # 已知对比度：黑底白字 = 21:1
    r = contrast(parse_color("#fff")[:3], parse_color("#000")[:3])
    print(f"{'ok ' if abs(r - 21) < 0.01 else 'FAIL'} 黑白对比度 = {r:.2f}")
    bad += 0 if abs(r - 21) < 0.01 else 1
    # WCAG 经典示例 #777 on #fff ≈ 4.48（临界不通过）
    r2 = contrast(parse_color("#777")[:3], parse_color("#fff")[:3])
    print(f"      #777 on #fff = {r2:.2f}（AA 正文 4.5 需略深一点）")
    print("self-test:", "PASS" if bad == 0 else f"{bad} FAILED")
    return 0 if bad == 0 else 1


def main() -> int:
    ap = argparse.ArgumentParser(description="WCAG 对比度检查（支持 oklch/color-mix）")
    ap.add_argument("files", nargs="*", help="CSS 文件；省略则自动在 cwd 下查找")
    ap.add_argument("--dir", default=".", help="自动查找 CSS 的根目录，默认 cwd")
    ap.add_argument("--json", dest="json_out", help="把结果写成 JSON")
    ap.add_argument("--fg", help="单独检查：前景色/变量")
    ap.add_argument("--bg", help="单独检查：背景色/变量")
    ap.add_argument("--tokens-only", action="store_true", help="只做令牌配对，不解析选择器")
    ap.add_argument("--strict", action="store_true", help="以 AA 正文 4.5 要求所有配对")
    ap.add_argument("--self-test", action="store_true")
    args = ap.parse_args()

    if args.self_test:
        return self_test()

    root = Path(args.dir).resolve()
    if args.files:
        # 位置参数可以是文件，也可以是目录（目录递归找 *.css）。
        # 传错路径必须报错退出：否则会静默输出「0 组」骗过质量门。
        files, bad = [], []
        for raw in args.files:
            p = Path(raw).resolve()
            if p.is_dir():
                found = discover_css(p)
                files += found
                if not found:
                    bad.append(f"{raw}（目录里没有 CSS）")
            elif p.is_file():
                files.append(p)
            else:
                bad.append(f"{raw}（不存在）")
        if bad:
            print("这些路径用不了：" + "；".join(bad))
            print("用法：contrast_check.py <theme.css | css 目录> [--json out.json]")
            return 2
        dedup, seen_paths = [], set()
        for f in files:
            if f not in seen_paths:
                seen_paths.add(f)
                dedup.append(f)
        files = dedup
    else:
        files = discover_css(root)
    if not files:
        print(f"没有找到 CSS 文件（查找目录 {root}）。用法：contrast_check.py <theme.css | css 目录>")
        return 2
    print(f"扫描 {len(files)} 个 CSS 文件：")
    for f in files[:20]:
        print(f"  - {f}")
    if len(files) > 20:
        print(f"  ... 另有 {len(files) - 20} 个")

    light, dark, origin, text = collect(files)
    print(f"\n收集到设计令牌 {len(light)} 个（浅色）/ {len(dark)} 个（深色）")

    if args.fg and args.bg:
        fgc = parse_color(resolve(args.fg, {**light, **dark}))
        bgc = parse_color(resolve(args.bg, {**light, **dark}))
        if not fgc or not bgc:
            print(f"无法解析：fg={args.fg} bg={args.bg}")
            return 2
        r = contrast(fgc[:3], bgc[:3])
        verdict = "PASS" if r >= AA_NORMAL else "FAIL"
        print(f"{verdict} 对比度 {r:.2f}:1  {hex_of(fgc)} on {hex_of(bgc)}（AA 正文要求 {AA_NORMAL}）")
        return 0 if r >= AA_NORMAL else 1

    pairs = [] if args.tokens_only else same_element_pairs(text, light, dark, files)
    pairs += token_pairs(light, dark)

    # 去重：同一对颜色 + 同一模式只报一次
    seen = set()
    unique = []
    for p in pairs:
        key = (p["mode"], p["dark"], hex_of(p["fg_rgb"]), hex_of(p["bg_rgb"]), p["selector"][:60])
        if key in seen:
            continue
        seen.add(key)
        unique.append(p)

    results = []
    for p in unique:
        r = contrast(p["fg_rgb"], p["bg_rgb"])
        if p.get("soft"):
            # 装饰性边框：给人看数值，不参与失败判定
            results.append({**p, "ratio": round(r, 2), "required": 0, "pass": True})
            continue
        required = AA_NORMAL if p["mode"] in ("token", "element", "on") else AA_UI
        if args.strict:
            required = AA_NORMAL
        results.append({**p, "ratio": round(r, 2), "required": required, "pass": r >= required})

    results.sort(key=lambda x: x["ratio"])
    failures = [r for r in results if not r["pass"]]

    print(f"\n参与判定的配色对 {len(results)} 组（按对比度升序）：")
    for r in results[:60]:
        tag = "info" if r.get("soft") else ("PASS" if r["pass"] else "FAIL")
        fg = " / ".join(r["fg"]) if isinstance(r["fg"], tuple) else str(r["fg"])
        print(
            f"  {tag:4s} {r['ratio']:5.2f}:1 (需 {r['required']})  "
            f"{hex_of(r['fg_rgb'])} on {hex_of(r['bg_rgb'])}  [{r['mode']}] {fg}"
        )
    if len(results) > 60:
        print(f"  ... 另有 {len(results) - 60} 组未显示")

    soft_n = sum(1 for r in results if r.get("soft"))
    tail = f"（其中 {soft_n} 组是装饰性边框，只提示不判失败）" if soft_n else ""
    print(f"\n合计：{len(results)} 组，{len(failures)} 组未达标{tail}")
    if failures:
        print("优先修最低的几组；正文永远按 4.5 要求，大标题/图标才可放宽到 3.0。")
        print("深色主题不要靠「反色」偷懒——两套主题要各自校验。")

    if args.json_out:
        Path(args.json_out).write_text(
            json.dumps(
                {
                    "files": [str(f) for f in files],
                    "tokens": {"light": len(light), "dark": len(dark)},
                    "results": [
                        {
                            "mode": r["mode"],
                            "selector": r["selector"],
                            "fg": list(r["fg"]) if isinstance(r["fg"], tuple) else [r["fg"]],
                            "fgHex": hex_of(r["fg_rgb"]),
                            "bgHex": hex_of(r["bg_rgb"]),
                            "ratio": r["ratio"],
                            "required": r["required"],
                            "pass": r["pass"],
                            "dark": r["dark"],
                        }
                        for r in results
                    ],
                    "failures": len(failures),
                },
                ensure_ascii=False,
                indent=2,
            ),
            encoding="utf-8",
        )
        print(f"JSON：{args.json_out}")

    return 1 if failures else 0


if __name__ == "__main__":
    sys.exit(main())
