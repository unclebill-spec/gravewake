"""Prop writer (playtest1h, 2026-10-02): the last painted placeholders in the world, drawn as writer art.
[OWNER-REQUESTED 2026-10-02 19:43 ET: playtest1h art and loading audit]

Bill (2026-10-02 19:43 ET): "make sure nothing is mismatched ... there's no placeholders". The 1h audit found these
still drawn as flat painted blocks in draw.ts:

    chest(open)        16x16 treasure chest (vale caches, dungeon chests, the croft's chest): iron-banded planks, a
                       domed lid, a brass lock with a cold-blue keyhole; it sat on a flat purple square before
    mimic_lid(tooth)   16x16 the sleeping mimic's overlay for this chest: the same lid lifted one pixel over a black
                       seam (tooth glints on frame 1), so a mimic still looks like every other chest until it bites
    liquid(theme, f)   128x128 wrapping cave pools, four frames like the vale water, in each dungeon's own liquid and
                       accent (cave-liquids.json mirrors draw.ts CAVES); they were flat squares with one stripe
    bones(v)           16x16 a dungeon bone heap (skull, long bones, scraps), four variants; it was three bone dashes

Every colour is palette v3, hard alpha, on the wild writer's snapping Canvas.
"""

from __future__ import annotations

import json
import math
import random
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
sys.path.insert(0, str(HERE.parent / "sprite-writer"))

from wild_writer import Canvas, fbm, ramp, snap, tone, outline, INK, hsh  # noqa: E402
from palette_locked import NEON  # noqa: E402

TAG = "[OWNER-REQUESTED 2026-10-02 19:43 ET: playtest1h art and loading audit]"
TEX = 128
CAVES = json.loads((HERE / "cave-liquids.json").read_text())
WOOD = ramp("#3a2418", "#5a3828", "#6a4830", "#8a6848", "#a07850")
IRON = ramp("#2a2428", "#4a4a50", "#6a6e78", "#9aa0aa")
BRASS = ramp("#6a5030", "#c4a050", "#f4e27a")
BONE = ramp("#8a7a64", "#c4b49a", "#e6dcc8", "#f4f0e8")
BLUE = NEON["blue"]


def _hex(c: str) -> tuple[int, int, int]:
    return int(c[1:3], 16), int(c[3:5], 16), int(c[5:7], 16)


def _shade(c: str, n: int) -> str:
    r, g, b = _hex(c)
    return "#%02x%02x%02x" % tuple(max(0, min(255, v + n)) for v in (r, g, b))


def _chest_body(c: Canvas, lid_dy: int = 0, lid_only: bool = False, body: bool = True) -> None:
    """The chest's pixels: lid rows 4-8 (lifted by lid_dy), body rows 9-13, cols 2-13."""
    if body and not lid_only:
        for y in range(9, 14):
            for x in range(3, 13):
                plank = WOOD[2] if (y - 9) % 2 == 0 else WOOD[1]
                if x in (3, 12):
                    plank = IRON[1]
                c.set(x, y, plank)
            c.set(2, y, INK)
            c.set(13, y, INK)
        for x in range(3, 13):
            c.set(x, 13, WOOD[0] if x not in (3, 12) else IRON[0])
            c.set(x, 14, INK)
        # the lock plate and its cold-blue keyhole
        for y in (9, 10, 11):
            for x in (7, 8):
                c.set(x, y, BRASS[1] if y < 11 else BRASS[0])
        c.set(7, 10, BLUE[3])
        c.set(8, 9, BRASS[2])
    # the domed lid: an arched top row, planks, iron band at the seam
    top = 4 + lid_dy
    for x in range(3, 13):
        c.set(x, top, INK if x in (3, 12) else WOOD[3])
    for y in range(top + 1, top + 4):
        for x in range(3, 13):
            col = WOOD[3] if y == top + 1 else WOOD[2]
            if x in (3, 12):
                col = IRON[2] if y == top + 1 else IRON[1]
            if (x + y) % 5 == 0 and x not in (3, 12):
                col = WOOD[4]
            c.set(x, y, col)
        c.set(2, y, INK)
        c.set(13, y, INK)
    for x in range(3, 13):
        c.set(x, top + 4, IRON[2] if x % 3 else IRON[3])
    c.set(2, top + 4, INK)
    c.set(13, top + 4, INK)
    for x in range(4, 12):
        c.set(x, top - 1, INK)
    c.set(3, top, INK)
    c.set(12, top, INK)


def chest(open_: bool = False) -> Canvas:
    c = Canvas(16, 16)
    # a soft cast shadow under it, two native rows
    for x in range(3, 14):
        c.set(x, 15, "#140e12" if x % 2 else INK)
    _chest_body(c)
    if open_:
        for x in range(4, 12):
            c.set(x, 8, BRASS[2] if x % 2 else BRASS[1])
    return c


def mimic_lid(tooth: bool) -> Canvas:
    """The overlay the draw lays over a sleeping mimic's chest: its lid lifted 1 px, a black seam, and tooth glints."""
    c = Canvas(16, 16)
    _chest_body(c, lid_dy=-1, lid_only=True)
    for x in range(3, 13):
        c.set(x, 8, INK)
    if tooth:
        c.set(5, 8, "#f0e2c8")
        c.set(10, 8, "#f0e2c8")
    return c


def liquid(theme: str, frame: int) -> Canvas:
    p = CAVES[theme]
    base, accent = p["liquid"], p["accent"]
    r = ramp(_shade(base, -14), base, _shade(base, 10), _shade(base, 22), _shade(base, 36))
    lit = ramp(_shade(base, 48), accent)
    c = Canvas(TEX, TEX)
    P = TEX
    rng = random.Random(sum(map(ord, theme)) * 7 + 3)
    for y in range(P):
        for x in range(P):
            n = fbm(x, y, P, 23 + len(theme))
            swell = 0.5 + 0.5 * math.sin((y + 2.5 * math.sin((x + frame * 4) * 2 * math.pi / 32) + frame) * 2 * math.pi / 16)
            t = 0.1 + 0.5 * n + 0.3 * swell
            c.set(x, y, r[tone(t, x, y, len(r) - 1)])
    for k in range(48):
        x0, y0 = rng.randrange(P), rng.randrange(P)
        L = 3 + rng.randrange(4)
        for i in range(L):
            c.set((x0 + i + frame * 2) % P, (y0 + (1 if i in (0, L - 1) else 0)) % P, lit[1] if (k % 6 == 0 and 0 < i < L - 1) else lit[0])
    for k in range(14):
        x, y = rng.randrange(P), rng.randrange(P)
        if (k + frame) % 2 == 0:
            c.set(x, y, accent)
    return c


def bones(v: int) -> Canvas:
    c = Canvas(16, 16)
    rng = random.Random(91 + v)

    def bone(x0: int, y0: int, dx: int, dy: int, n: int) -> None:
        for i in range(n):
            c.set(x0 + dx * i, y0 + dy * i, BONE[2] if i not in (0, n - 1) else BONE[3])
        c.set(x0 - dy, y0 + dx, BONE[1])
        c.set(x0 + dx * (n - 1) + dy, y0 + dy * (n - 1) - dx, BONE[1])

    spots = [(3, 11, 1, 0, 7), (9, 6, 0, 1, 5), (2, 6, 1, 1, 4), (8, 12, 1, -1, 4)]
    for k, (x, y, dx, dy, n) in enumerate(spots):
        if (k + v) % 4 != 3:
            bone(x + rng.randrange(-1, 2), y + rng.randrange(-1, 1), dx, dy, n)
    # a skull on two of the four
    if v % 2 == 0:
        sx, sy = 6 + v % 3, 3 + v % 2
        for yy in range(3):
            for xx in range(4):
                c.set(sx + xx, sy + yy, BONE[2] if yy < 2 else BONE[1])
        c.set(sx + 1, sy + 1, INK)
        c.set(sx + 3, sy + 1, INK)
        c.set(sx + 2, sy + 2, BONE[0])
    outline(c, "#1a1418")
    return c


def sheets() -> dict:
    from pixel_writer import cells

    out = {
        "prop-chest.png": cells([chest(False), chest(True)]),
        "prop-mimic-lid.png": cells([mimic_lid(False), mimic_lid(True)]),
        "prop-bones.png": cells([bones(v) for v in range(4)]),
    }
    for theme in CAVES:
        out[f"cave-liquid-{theme}.png"] = cells([liquid(theme, f) for f in range(4)])
    return out
