#!/usr/bin/env python3
"""pixel_diff.py — 设计稿 vs 实现的像素级比对（只依赖 Pillow + numpy）

用法：
  python scripts/pixel_diff.py --design design.png --impl shot.png [--out DIR]
         [--threshold 0.12] [--grid 16x12] [--scale auto|none]
         [--top 8] [--max-diff 0.02] [--json report.json]

输出：
  - 终端表格：整体差异、超阈值像素比例、最差 N 个区域（含设计稿坐标系 bbox）
  - <out>/fidelity-diff.png   设计稿灰度 + 超阈值处红色高亮
  - <out>/fidelity-side.png   设计稿 / 实现 / 差异 三联图
  - <out>/fidelity-report.json 机器可读报告

退出码：0 = 在 --max-diff 以内；1 = 超标；2 = 参数或文件错误
"""
from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

try:
    import numpy as np
    from PIL import Image, ImageChops, ImageDraw
except Exception as exc:  # pragma: no cover
    print(f"需要 Pillow 与 numpy：{exc}", file=sys.stderr)
    raise SystemExit(2)


def load_rgb(path: Path) -> Image.Image:
    img = Image.open(path)
    if img.mode in ("RGBA", "LA", "P"):
        img = img.convert("RGBA")
        bg = Image.new("RGBA", img.size, (255, 255, 255, 255))
        img = Image.alpha_composite(bg, img)
    return img.convert("RGB")


def parse_grid(raw: str) -> tuple[int, int]:
    if "x" in raw:
        a, b = raw.lower().split("x", 1)
        return max(1, int(a)), max(1, int(b))
    n = max(1, int(raw))
    return n, max(1, round(n * 3 / 4))


def main() -> int:
    ap = argparse.ArgumentParser(add_help=True)
    ap.add_argument("--design", required=True)
    ap.add_argument("--impl", required=True)
    ap.add_argument("--out", default=".design/fidelity")
    ap.add_argument("--threshold", type=float, default=0.12, help="单像素差异阈值（0-1）")
    ap.add_argument("--grid", default="16x12")
    ap.add_argument("--scale", default="auto", choices=["auto", "none"],
                    help="auto：实现图缩放到设计稿尺寸（并报告缩放比）；none：直接比，尺寸不同即失败")
    ap.add_argument("--top", type=int, default=8)
    ap.add_argument("--max-diff", type=float, default=0.02, help="超阈值像素占比上限")
    ap.add_argument("--json", default=None)
    args = ap.parse_args()

    design_path, impl_path = Path(args.design), Path(args.impl)
    for p in (design_path, impl_path):
        if not p.is_file():
            print(f"找不到文件：{p}", file=sys.stderr)
            return 2

    design = load_rgb(design_path)
    impl = load_rgb(impl_path)
    d_w, d_h = design.size
    i_w, i_h = impl.size

    scale_x = d_w / i_w
    scale_y = d_h / i_h
    if (i_w, i_h) != (d_w, d_h):
        if args.scale == "none":
            print(f"尺寸不一致：设计稿 {d_w}×{d_h}，实现 {i_w}×{i_h}（--scale none）", file=sys.stderr)
            return 2
        impl = impl.resize((d_w, d_h), Image.LANCZOS)

    a = np.asarray(design, dtype=np.int16)
    b = np.asarray(impl, dtype=np.int16)
    delta = np.abs(a - b).max(axis=2)  # 每像素最大通道差
    over = delta > int(args.threshold * 255)

    total = float(delta.size)
    over_ratio = float(over.sum()) / total
    mean_abs = float(delta.mean())

    if abs(scale_x - 1) > 0.01 or abs(scale_y - 1) > 0.01:
        print(
            f"⚠ 尺寸不一致（缩放 {scale_x:.3f}×{scale_y:.3f}）：确认两边是否同为整页或同为首屏截图，"
            "否则差异会被缩放本身放大（fidelity.mjs 加 --full 或去掉 --full 让两边一致）。",
            file=sys.stderr,
        )

    out_dir = Path(args.out)
    out_dir.mkdir(parents=True, exist_ok=True)

    # 差异图：设计稿压暗 + 超阈值处红
    grey = design.convert("L").convert("RGB").point(lambda v: int(v * 0.75))
    highlight = Image.new("RGB", (d_w, d_h), (255, 48, 48))
    diff_img = grey.copy()
    diff_img.paste(highlight, (0, 0), Image.fromarray((over * 255).astype(np.uint8)))
    diff_img.save(out_dir / "fidelity-diff.png")

    # 三联图
    side = Image.new("RGB", (d_w * 3 + 24, d_h), (255, 255, 255))
    side.paste(design, (0, 0))
    side.paste(impl, (d_w + 12, 0))
    side.paste(diff_img, (d_w * 2 + 24, 0))
    side.save(out_dir / "fidelity-side.png")

    # 区域热力：把图切成 gx×gy 格，按「超阈值占比」排序
    gx, gy = parse_grid(args.grid)
    cells = []
    for cy in range(gy):
        y0, y1 = round(cy * d_h / gy), round((cy + 1) * d_h / gy)
        for cx in range(gx):
            x0, x1 = round(cx * d_w / gx), round((cx + 1) * d_w / gx)
            block = delta[y0:y1, x0:x1]
            block_over = over[y0:y1, x0:x1]
            if block.size == 0:
                continue
            cells.append({
                "x": x0, "y": y0, "w": x1 - x0, "h": y1 - y0,
                "mean": round(float(block.mean()), 2),
                "over": round(float(block_over.mean()), 4),
            })
    cells.sort(key=lambda c: (c["over"], c["mean"]), reverse=True)

    report = {
        "design": str(design_path),
        "impl": str(impl_path),
        "design_size": [d_w, d_h],
        "impl_size": [i_w, i_h],
        "scale": [round(scale_x, 4), round(scale_y, 4)],
        "threshold": args.threshold,
        "mean_abs": round(mean_abs, 2),
        "over_ratio": round(over_ratio, 5),
        "max_diff": args.max_diff,
        "grid": [gx, gy],
        "worst_cells": cells[: args.top],
        "artifacts": {
            "diff": str(out_dir / "fidelity-diff.png"),
            "side": str(out_dir / "fidelity-side.png"),
        },
    }
    json_path = Path(args.json) if args.json else out_dir / "fidelity-report.json"
    json_path.parent.mkdir(parents=True, exist_ok=True)
    json_path.write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")

    print("")
    print(f"设计稿  {design_path.name}  {d_w}×{d_h}")
    print(f"实现    {impl_path.name}  {i_w}×{i_h}   scale={scale_x:.3f}×{scale_y:.3f}")
    print(f"平均差  {mean_abs:.1f}/255   超阈值像素 {over_ratio * 100:.2f}%  （阈值 {int(args.threshold * 255)}/255，上限 {args.max_diff * 100:.1f}%）")
    print("")
    if cells and cells[0]["over"] > 0:
        print(f"最差 {min(args.top, len(cells))} 个区域（设计稿坐标）：")
        for idx, c in enumerate(cells[: args.top], 1):
            if c["over"] <= 0:
                break
            print(f"  #{idx}  x={c['x']:<5} y={c['y']:<5} {c['w']}×{c['h']}   平均差 {c['mean']:>6.1f}   超阈 {c['over'] * 100:>5.1f}%")
    else:
        print("没有超过阈值的区域。")
    print("")
    print(f"产物：{out_dir / 'fidelity-diff.png'}")
    print(f"      {out_dir / 'fidelity-side.png'}")
    print(f"      {json_path}")

    return 0 if over_ratio <= args.max_diff else 1


if __name__ == "__main__":
    raise SystemExit(main())