"""Wake leftovers [OWNER-APPROVED 2026-10-21 20:43 ET: build out the ending's leftovers per design/ending.md].

Code-drawn, seeded (random.Random), palette v3 (LOCKED_V3), hard alpha, 16x16 / 16x32 cells (the coffin 32x24, the grave
32x16 and the bell 48x48 are their own sizes in whole 16 px steps or the doc's hitbox). Run: python3 wake_writer.py

    floor-wake.png      8 cells 16x16: dark slate (#1a1424) with soft clumps a step lighter and darker that wrap at the
                        edges (no seams, no fringe: the outer ring of every cell is drawn from the same wrapped clumps),
                        and faint grave-lettering (#2a2030) on cells 2, 5 and 7, kept 3 px inside the cell.
    wake-brazier.png    5 cells 16x32: an iron bowl on a stem with cold blue fire (cells 0-3 flicker; cell 4 is out).
    wake-grave.png      2 cells 32x16: an open grave (2x1 tiles), the pit and its earth lip; 1 adds edge candles.
    wake-window.png     3 cells 16x32: a stained-glass lancet, 0 a dark pane, 1 a lit mourner pane, 2 the procession glow.
    wake-coffin.png     1 cell 32x24: plain dark wood, a cold-fire lantern on its lid.
    wake-mourner.png    2 cells 16x32: a translucent grey-blue mourner in a hooded coat, candle in hand, a walk step.
    wake-orb.png        4 cells 16x16: a true glow orb (0, 1) and the red false light (2, 3, flickering).
    wake-bell.png       1 cell 48x48: the Wake Bell, dark iron with a violet inner glow.
"""

from __future__ import annotations

import random
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "sprite-writer"))
from pixel_writer import Canvas, cells  # noqa: E402
from palette_locked import LOCKED_V3  # noqa: E402

OUT = Path(__file__).resolve().parents[2] / "public" / "art" / "writer"

SLATE = "#1a1424"
SLATE_HI = "#241830"
SLATE_LO = "#140c28"
LETTER = "#2a2030"
CHIP = "#2a2040"
LINE = "#120c10"
IRON = ("#16161a", "#2a2a2e", "#4a4a50", "#6a6e78")
COLD = ("#2a4568", "#4ab8ff", "#9ae4ff", "#f4fbff")
VIOLET = ("#2a1848", "#5a3080", "#7a58a0", "#b07aff", "#c9a0e8")
RED = ("#6a1020", "#c43838", "#ff3a50", "#ffd0d0")
WOOD = ("#2a1810", "#3a2418", "#5a3424", "#6a4030")
EARTH = ("#07060a", "#1a1008", "#3a2a24", "#4a382c")
WRAITH = ("#3a4458", "#5a6878", "#8aa0c0", "#c5d4e8")
WAX = ("#d8c8a0", "#f0e0b0")


def _clump(c: Canvas, rng: random.Random, col: str, size: int) -> None:
    x, y = rng.randrange(16), rng.randrange(16)
    for _ in range(size):
        c.set(x % 16, y % 16, col)
        dx, dy = rng.choice(((1, 0), (-1, 0), (0, 1), (0, -1)))
        x, y = x + dx, y + dy


def floor_cell(v: int) -> Canvas:
    rng = random.Random(7201 + 41 * v)
    c = Canvas(16, 16)
    c.fill(SLATE)
    for _ in range(rng.randrange(2, 4)):
        _clump(c, rng, SLATE_HI, rng.randrange(5, 9))
    for _ in range(rng.randrange(1, 3)):
        _clump(c, rng, SLATE_LO, rng.randrange(4, 7))
    if v in (2, 5, 7):  # faint grave-lettering: two short rows of strokes, 3 px inside the cell
        y0 = rng.randrange(4, 8)
        for row in range(2):
            x = 3 + rng.randrange(2)
            while x < 12:
                if rng.random() < 0.7:
                    c.set(x, y0 + row * 3, LETTER)
                    if rng.random() < 0.4:
                        c.set(x, y0 + row * 3 + 1, LETTER)
                x += rng.choice((1, 2))
    if v % 4 == 3:
        c.set(rng.randrange(4, 12), rng.randrange(4, 12), CHIP)
    return c


def brazier(f: int) -> Canvas:
    c = Canvas(16, 32)
    for y in range(22, 31):  # the stem
        c.set(7, y, IRON[1]); c.set(8, y, IRON[2])
    c.rect(4, 30, 8, 2, IRON[0]); c.rect(5, 30, 6, 1, IRON[1])
    c.rect(3, 18, 10, 4, IRON[1])  # the bowl
    c.rect(2, 17, 12, 1, IRON[3]); c.rect(4, 21, 8, 1, IRON[0])
    c.set(2, 18, LINE); c.set(13, 18, LINE)
    if f >= 4:  # cell 4: out (Lights Out), cold ash in the bowl
        for x in range(4, 12, 2):
            c.set(x, 17, IRON[2])
        return c
    rng = random.Random(55 + f)
    for x in range(4, 12):  # cold fire, tallest in the middle
        top = 17 - (4 + (3 - abs(x - 7.5)) * 2.2 + rng.randrange(-1, 2)) // 1
        top = int(max(5, top))
        for y in range(top, 17):
            t = (y - top) / max(1, 17 - top)
            c.set(x, y, COLD[1] if t < 0.35 else COLD[2] if t < 0.7 else COLD[3])
        c.set(x, top - 1, COLD[0])
    return c


def grave(candles: bool) -> Canvas:
    c = Canvas(32, 16)
    c.rect(1, 2, 30, 13, EARTH[2])  # earth lip
    c.rect(0, 3, 32, 11, EARTH[2])
    c.rect(3, 4, 26, 9, EARTH[0])  # the pit
    c.rect(3, 4, 26, 1, EARTH[1])
    for x in range(1, 31, 3):
        c.set(x, 2, EARTH[3]); c.set(x + 1, 14, EARTH[3])
    if candles:
        for x in (1, 29):
            c.set(x, 0, COLD[2]); c.set(x, 1, COLD[1]); c.rect(x, 2, 2, 3, WAX[0]); c.set(x, 2, WAX[1])
    return c


def window(kind: int) -> Canvas:
    c = Canvas(16, 32)
    c.rect(3, 4, 10, 26, LINE)
    for y in range(4, 8):  # the pointed arch
        w = (y - 3) * 2
        for x in range(8 - w // 2, 8 + w // 2):
            c.set(x, y, LINE)
    pane = (VIOLET[0], VIOLET[0]) if kind == 0 else (VIOLET[1], VIOLET[2]) if kind == 1 else (VIOLET[3], VIOLET[4])
    for y in range(6, 29):
        for x in range(4, 12):
            if 8 - (y - 3) <= x <= 7 + (y - 3):
                c.set(x, y, pane[(x + y) % 2])
    for y in (12, 20):  # lead cames
        c.rect(4, y, 8, 1, LINE)
    c.rect(8, 6, 1, 23, LINE)
    if kind >= 1:  # a mourner's hooded shape in the pane
        c.rect(6, 14, 4, 5, VIOLET[0]); c.rect(7, 13, 2, 1, VIOLET[0]); c.set(7, 15, COLD[1]); c.set(8, 15, COLD[1])
    return c


def coffin() -> Canvas:
    c = Canvas(32, 24)
    for y in range(8, 22):
        inset = max(0, 3 - abs(y - 12) // 2) if y < 12 else max(0, (y - 12) // 3)
        c.rect(1 + inset, y, 30 - 2 * inset, 1, WOOD[2])
    c.rect(2, 8, 28, 1, WOOD[3]); c.rect(2, 21, 28, 1, WOOD[0])
    c.rect(1, 12, 30, 1, WOOD[1])
    c.rect(14, 2, 4, 6, IRON[1]); c.rect(15, 3, 2, 4, COLD[1]); c.set(15, 3, COLD[3]); c.rect(13, 1, 6, 1, IRON[2])
    return c


def mourner(f: int) -> Canvas:
    c = Canvas(16, 32)
    c.rect(5, 6, 6, 4, WRAITH[1]); c.rect(6, 5, 4, 1, WRAITH[1])  # hood
    c.rect(6, 7, 4, 3, WRAITH[0]); c.set(6, 8, COLD[1]); c.set(9, 8, COLD[1])  # soft-shadow face, blue eyes
    c.rect(4, 10, 8, 14, WRAITH[2])  # hooded coat
    c.rect(4, 17, 8, 1, WRAITH[1])  # belt
    c.rect(4, 10, 1, 14, WRAITH[1]); c.rect(11, 10, 1, 14, WRAITH[3])
    leg = (1 if f else 0)
    c.rect(5, 24, 2, 6 - leg, WRAITH[1]); c.rect(9, 24, 2, 5 + leg, WRAITH[1])
    c.rect(12, 12, 2, 4, WAX[0]); c.set(12, 11, COLD[2]); c.set(13, 10, COLD[1])  # the candle
    return c


def orb(f: int) -> Canvas:
    c = Canvas(16, 16)
    red = f >= 2
    ramp = RED if red else COLD
    r = 5 if f % 2 == 0 else (4 if red else 5)
    for y in range(16):
        for x in range(16):
            d = ((x - 7.5) ** 2 + (y - 7.5) ** 2) ** 0.5
            if d <= r:
                c.set(x, y, ramp[3] if d < r * 0.35 else ramp[2] if d < r * 0.7 else ramp[1])
            elif d <= r + 1:
                c.set(x, y, ramp[0])
    return c


def bell() -> Canvas:
    c = Canvas(48, 48)
    c.rect(22, 0, 4, 6, IRON[2])
    for y in range(6, 42):
        half = int((5 + 3 * min(1, (y - 6) / 4) ** 0.5) + 12 * ((y - 6) / 36) ** 2.4 + (2 if y > 37 else 0))  # dome, waist, flared lip
        c.rect(24 - half, y, 2 * half, 1, IRON[1] if y < 38 else IRON[2])
        c.set(24 - half, y, LINE); c.set(23 + half, y, IRON[3] if y % 5 else IRON[2])
    c.rect(6, 42, 36, 2, IRON[0])
    c.rect(17, 40, 14, 4, VIOLET[1]); c.rect(20, 41, 8, 3, VIOLET[3])  # the violet inner glow at the mouth
    c.rect(23, 38, 2, 6, IRON[0])  # the clapper
    return c


def sheets() -> dict:
    return {
        "floor-wake.png": cells([floor_cell(v) for v in range(8)]),
        "wake-brazier.png": cells([brazier(f) for f in range(5)]),
        "wake-grave.png": cells([grave(False), grave(True)]),
        "wake-window.png": cells([window(k) for k in range(3)]),
        "wake-coffin.png": cells([coffin()]),
        "wake-mourner.png": cells([mourner(f) for f in range(2)]),
        "wake-orb.png": cells([orb(f) for f in range(4)]),
        "wake-bell.png": cells([bell()]),
    }


def main() -> None:
    for name, im in sheets().items():
        for r, g, b, a in im.getdata():
            if a not in (0, 255):
                raise SystemExit(f"{name}: soft pixel")
            if a and f"#{r:02x}{g:02x}{b:02x}" not in LOCKED_V3:
                raise SystemExit(f"{name}: #{r:02x}{g:02x}{b:02x} is not in palette v3")
        im.save(OUT / name)
        print(name, im.size)


if __name__ == "__main__":
    main()
