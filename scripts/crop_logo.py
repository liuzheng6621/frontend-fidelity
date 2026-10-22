#!/usr/bin/env python3
"""Logo/品牌图裁切与导出：把用户给的图变成可用的品牌资产。

对应 Skill 条款：Logo 与品牌 / 图片与视觉资产。

典型用法:
  # 截图里抠出来的书法字：去掉透明边 → 生成透明底 PNG
  python scripts/crop_logo.py logo-raw.png --trim --pad 24 -o logo.png

  # 白底图：把接近白色的边一起裁掉
  python scripts/crop_logo.py scan.png --trim --tolerance 8 --pad 20 -o logo.png

  # 要做 favicon / 头像：强制正方形透明底
  python scripts/crop_logo.py logo.png --trim --format square --side 512 -o seal.png

  # 只导出指定高度的 1x/2x 两套
  python scripts/crop_logo.py logo-raw.png --trim --height 64 -o logo@1x.png
  python scripts/crop_logo.py logo-raw.png --trim --height 128 -o logo@2x.png

  # 只看不写：报告内容的包围盒与长宽比（判断有没有被裁坏）
  python scripts/crop_logo.py logo.png --check

要点：
  * --trim 裁掉透明边；对不透明图用 --tolerance 把接近四角背景色的像素当背景。
  * --pad 是四周留白（px），保留呼吸感，避免字压在边线上。
  * --format square 用于 favicon/头像：居中等比缩放后补透明边。
  * 输出前用 --check 看长宽比：品牌字标被拉扁 5% 以上就该重做，不要在 CSS 里硬撑。

依赖: pip install pillow numpy（numpy 缺失时自动退化为纯 Python 扫描，稍慢但不影响结果）
"""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

# Windows 控制台默认 cp936，会把中文输出成乱码；能改就改成 utf-8。
try:
    sys.stdout.reconfigure(encoding="utf-8")
    sys.stderr.reconfigure(encoding="utf-8")
except Exception:  # pragma: no cover
    pass

try:
    from PIL import Image
except ImportError:  # pragma: no cover
    print("缺少 Pillow：pip install pillow numpy")
    sys.exit(2)

try:
    import numpy as np
except ImportError:  # pragma: no cover
    np = None


def bbox_by_alpha(img: Image.Image):
    """透明底：按 alpha > 阈值取包围盒。"""
    alpha = img.getchannel("A")
    if np is not None:
        arr = np.asarray(alpha)
        ys, xs = np.where(arr > 8)
        if xs.size == 0:
            return None
        return int(xs.min()), int(ys.min()), int(xs.max()) + 1, int(ys.max()) + 1
    w, h = alpha.size
    pix = alpha.load()
    minx, miny, maxx, maxy = w, h, -1, -1
    for y in range(h):
        for x in range(w):
            if pix[x, y] > 8:
                if x < minx:
                    minx = x
                if x > maxx:
                    maxx = x
                if y < miny:
                    miny = y
                if y > maxy:
                    maxy = y
    if maxx < 0:
        return None
    return minx, miny, maxx + 1, maxy + 1


def bbox_by_color(img: Image.Image, tolerance_pct: float):
    """不透明底：把与四角背景色相近的像素当背景。tolerance 是 0-100 的相对容差。"""
    rgb = img.convert("RGB")
    w, h = rgb.size
    corners = [rgb.getpixel(p) for p in ((0, 0), (w - 1, 0), (0, h - 1), (w - 1, h - 1))]
    # 用四角中出现次数最多的颜色当背景色（截图的圆角会让某个角不可靠）
    bg = max(set(corners), key=corners.count)
    limit = max(1.0, tolerance_pct / 100.0 * 255.0)

    if np is not None:
        arr = np.asarray(rgb).astype("int16")
        diff = (abs(arr[:, :, 0] - bg[0]) + abs(arr[:, :, 1] - bg[1]) + abs(arr[:, :, 2] - bg[2])) / 3.0
        mask = diff > limit
        ys, xs = np.where(mask)
        if xs.size == 0:
            return None
        return int(xs.min()), int(ys.min()), int(xs.max()) + 1, int(ys.max()) + 1

    pix = rgb.load()
    minx, miny, maxx, maxy = w, h, -1, -1
    for y in range(h):
        for x in range(w):
            r, g, b = pix[x, y][:3]
            d = (abs(r - bg[0]) + abs(g - bg[1]) + abs(b - bg[2])) / 3.0
            if d > limit:
                if x < minx:
                    minx = x
                if x > maxx:
                    maxx = x
                if y < miny:
                    miny = y
                if y > maxy:
                    maxy = y
    if maxx < 0:
        return None
    return minx, miny, maxx + 1, maxy + 1


def make_square(img: Image.Image, side: int) -> Image.Image:
    """居中等比缩放到正方形画布内，补透明边。"""
    w, h = img.size
    scale = side / max(w, h)
    nw, nh = max(1, round(w * scale)), max(1, round(h * scale))
    resized = img.resize((nw, nh), Image.LANCZOS)
    canvas = Image.new("RGBA", (side, side), (0, 0, 0, 0))
    canvas.paste(resized, ((side - nw) // 2, (side - nh) // 2), resized if resized.mode == "RGBA" else None)
    return canvas


def main() -> int:
    ap = argparse.ArgumentParser(description="裁掉品牌图的多余边距，导出可直接用的 PNG")
    ap.add_argument("src", nargs="?", help="源图")
    ap.add_argument("-o", "--out", help="输出路径（默认 <src>-trimmed.png）")
    ap.add_argument("--trim", action="store_true", help="先裁掉背景边（透明底或纯色底）")
    ap.add_argument("--tolerance", type=float, default=6.0, help="纯色背景容差百分比，默认 6")
    ap.add_argument("--pad", type=int, default=0, help="四周留白像素，默认 0")
    ap.add_argument("--height", type=int, help="导出高度（等比缩放）")
    ap.add_argument("--width", type=int, help="导出宽度（等比缩放）")
    ap.add_argument("--side", type=int, help="配合 --format square：正方形边长")
    ap.add_argument("--format", choices=["png", "square"], default="png", help="png=保持长宽比；square=正方形透明底")
    ap.add_argument("--check", action="store_true", help="只报告包围盒/长宽比，不写文件")
    args = ap.parse_args()

    if not args.src:
        ap.error("需要源图路径")

    src = Path(args.src)
    if not src.exists():
        print(f"文件不存在：{src}")
        return 2

    img = Image.open(src).convert("RGBA")
    print(f"源图：{src.name}  {img.width}×{img.height}  长宽比 {img.width / img.height:.3f}")

    box = None
    if args.trim or args.check:
        has_alpha = img.getchannel("A").getextrema()[0] < 250
        box = bbox_by_alpha(img) if has_alpha else bbox_by_color(img, args.tolerance)
        if box is None:
            print("警告：找不到有效内容（整张图都是背景？）—— 不做裁切")
        else:
            print(f"内容包围盒：{box[2] - box[0]}×{box[3] - box[1]}（原图内 {box}）")

    if args.check:
        if box:
            print(f"内容长宽比：{(box[2] - box[0]) / (box[3] - box[1]):.3f}（原图 {(img.width / img.height):.3f}）")
            pad = args.pad or 0
            print(f"裁切 + 留白 {pad}px 后：{box[2] - box[0] + pad * 2}×{box[3] - box[1] + pad * 2}")
        print("--check 只做报告，没有写文件。")
        return 0

    if box and args.trim:
        img = img.crop(box)

    if args.pad > 0:
        pad = args.pad
        canvas = Image.new("RGBA", (img.width + pad * 2, img.height + pad * 2), (0, 0, 0, 0))
        canvas.paste(img, (pad, pad), img)
        img = canvas
        print(f"加留白 {pad}px → {img.width}×{img.height}")

    if args.format == "square":
        side = args.side or max(img.width, img.height)
        img = make_square(img, side)
        print(f"导出正方形 {side}×{side}")
    else:
        if args.height:
            ratio = args.height / img.height
            img = img.resize((max(1, round(img.width * ratio)), args.height), Image.LANCZOS)
            print(f"缩放到高 {args.height} → {img.width}×{img.height}")
        if args.width:
            ratio = args.width / img.width
            img = img.resize((args.width, max(1, round(img.height * ratio))), Image.LANCZOS)
            print(f"缩放到宽 {args.width} → {img.width}×{img.height}")

    out = Path(args.out) if args.out else src.with_name(f"{src.stem}-trimmed.png")
    out.parent.mkdir(parents=True, exist_ok=True)
    img.save(out, "PNG", optimize=True)
    size_kb = out.stat().st_size / 1024
    print(f"已写入 {out}  {img.width}×{img.height}  {size_kb:.0f}KB")
    if size_kb > 300:
        print("提示：超过 300KB，Logo 建议用 SVG 或压到 300KB 以内（首屏会付这个带宽）。")
    nw, nh = img.size
    print(f"CSS 中使用时保持这个比例，例如 width:{nw}px;height:{nh}px 或 aspect-ratio:{nw}/{nh}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
