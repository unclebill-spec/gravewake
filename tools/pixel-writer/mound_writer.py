"""Grave mound writer (MB final pass 2, Bill 2026-10-25: "Do the violet slate version").

Seeded 16x32 grave-mound props for the cemetery: slate grey-blue soil with violet shading, light from the upper
left, the warm-dark 1 px INK outline, hard alpha. Some carry a small slate headstone, some a few cyan or acid-green
moss glints. No brown, beige or mud. Every colour is snapped to the locked palette (palette_locked.py).

    python3 tools/pixel-writer/mound_writer.py [variants] [seed]
writes public/art/writer/grave-mounds.png (variants x 1 cells of 16x32; the mound's foot on row 31).
"""
from __future__ import annotations

import os
import random
import sys

from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, "..", ".."))
sys.path.insert(0, "/workspace/masters/gravewake/palette")
sys.path.insert(0, HERE)
try:
    import palette_locked as P  # type: ignore
    LOCK = sorted({c.lower() for n in ("LOCKED", "LOCKED_V2", "LOCKED_V3", "LOCKED_V4") for c in getattr(P, n, [])})
except ImportError:  # the repo copy, if the masters folder is not on this box
    LOCK = []

INK = "#140c10"  # wild_writer's warm-dark outline


def _rgb(h: str) -> tuple[int, int, int]:
    return int(h[1:3], 16), int(h[3:5], 16), int(h[5:7], 16)


def snap(h: str) -> tuple[int, int, int]:
    """The nearest locked colour (exact if it is already in the palette)."""
    r = _rgb(h)
    if not LOCK:
        return r
    return min((_rgb(c) for c in LOCK), key=lambda c: sum((a - b) ** 2 for a, b in zip(c, r)))


# slate soil ramp (dark violet shade -> pale slate light), stone ramp, glints
SOIL = ["#1e1a2e", "#2e2a44", "#3c3e58", "#4e5470", "#66708a"]
VIOLET = ["#2a1a3e", "#4a2a6a"]
STONE = ["#2a2e3e", "#4a5068", "#6a7490", "#8a96b0"]
GLINT = {"cyan": "#5fe8ff", "green": "#7cff6a"}


def mound(seed: int) -> Image.Image:
    rng = random.Random(seed)
    W, H = 16, 32
    px: dict[tuple[int, int], str] = {}
    rx = rng.uniform(6.2, 7.4)
    ry = rng.uniform(3.6, 4.6)
    cx, cy = 7.5 + rng.choice([-0.5, 0, 0.5]), 30.5 - ry
    stone = rng.random() < 0.55
    if stone:
        sx = int(cx) - 2 + rng.choice([0, 1])
        top = int(cy - ry) - rng.randint(6, 8)
        for y in range(top, int(cy - ry) + 3):
            for x in range(sx, sx + 5):
                if y == top and x in (sx, sx + 4):
                    continue  # rounded shoulders
                px[(x, y)] = STONE[3] if x == sx else STONE[0] if x == sx + 4 else STONE[2] if y == top else STONE[1]
        if rng.random() < 0.5:  # a carved cross
            px[(sx + 2, top + 2)] = STONE[0]
            px[(sx + 2, top + 3)] = STONE[0]
            px[(sx + 1, top + 3)] = STONE[0]
            px[(sx + 3, top + 3)] = STONE[0]
            px[(sx + 2, top + 4)] = STONE[0]
    for y in range(H):
        for x in range(W):
            dx, dy = (x + 0.5 - cx) / rx, (y + 0.5 - cy) / ry
            if dx * dx + dy * dy <= 1 and y <= 30:
                light = -dx * 0.6 - dy * 0.8  # upper-left light
                k = 0 if light < -0.6 else 1 if light < -0.1 else 2 if light < 0.35 else 3 if light < 0.7 else 4
                col = SOIL[k]
                if k <= 1 and (x * 3 + y * 5 + seed) % 4 == 0:
                    col = VIOLET[k]  # violet in the shade
                px[(x, y)] = col
    soil = [p for p, c in px.items() if c in SOIL[2:]]
    if soil and rng.random() < 0.7:
        g = GLINT[rng.choice(["cyan", "green"])]
        for p in rng.sample(soil, min(len(soil), rng.randint(1, 3))):
            px[p] = g
    out = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    for (x, y), c in px.items():
        out.putpixel((x, y), (*snap(c), 255))
    ink = (*snap(INK), 255)
    for y in range(H):
        for x in range(W):
            if (x, y) in px:
                continue
            if any((x + a, y + b) in px for a, b in ((1, 0), (-1, 0), (0, 1), (0, -1))):
                out.putpixel((x, y), ink)
    return out


def sheet(n: int = 6, seed: int = 4101) -> Image.Image:
    im = Image.new("RGBA", (16 * n, 32), (0, 0, 0, 0))
    for i in range(n):
        im.paste(mound(seed + i * 37), (16 * i, 0))
    return im


if __name__ == "__main__":
    n = int(sys.argv[1]) if len(sys.argv) > 1 else 6
    s = int(sys.argv[2]) if len(sys.argv) > 2 else 4101
    out = os.path.join(ROOT, "public/art/writer/grave-mounds.png")
    sheet(n, s).save(out)
    print("wrote", out, n, "variants")
