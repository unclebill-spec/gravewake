"""playtest1g [OWNER-APPROVED 2026-10-02: playtest1g trail paths] (owner-requested 2026-10-02 11:30 ET): the trail
paths of the vale, the Winter hollow, the Cinder and the Dry waste, drawn the way rift_writer.swamp_path draws the
swamp's: a 16x16 cell per NESW mask (1 N, 2 E, 4 S, 8 W) whose band meets its neighbours' exactly at the tile border
(x or y 3..12) and whose ragged edge crumbles into the biome's own ground, so a trail reads as worn into the ground and
not as a flat brown square. Cells 16 and 17 are the N-S and E-W straights' variant (the game picks one straight in
five by place). Palette v3 only (wild_writer's locked Canvas).

- vale: worn dirt with leaf litter, one row a season (autumn, winter, spring, summer).
- snow: packed snow, a pale rim of thrown snow, boot prints along the run (the variant: a sled's runners).
- ash: cracked cinder, dark cracks with a few embers in them (the variant: a glowing vent).
- sand: wind-swept sand in ripples, with pebbles (the variant: a half-buried bone).
"""
from __future__ import annotations

import math

from rift_writer import HALF, _hash, _seg_dist
from wild_writer import Canvas

SEASONS = ("autumn", "winter", "spring", "summer")
BIOMES = ("vale", "snow", "ash", "sand")

EARTH = ("#1a1008", "#2a1c14", "#3a2818", "#4a3424", "#5a4030", "#6a5040")
TURF = ("#142820", "#1e3428", "#2a4a28", "#3a6828")
LITTER = {
    "autumn": ("#6a3a28", "#8a3a18", "#6a5030", "#4a1020", "#8a6840", "#c45a18"),
    "winter": ("#4a3424", "#6a5040", "#5a4030", "#b7d2e0", "#d5e8f2", "#8aa4b0"),
    "spring": ("#3a6828", "#6aaa48", "#9ec060", "#e8c0d0", "#c46878", "#5a7a28"),
    "summer": ("#6a5030", "#8a6840", "#c4a050", "#3a6840", "#2a5838", "#e0c060"),
}
PACK = ("#5a6878", "#8aa4b0", "#b7d2e0", "#c5d8e6", "#d7e6f0", "#e8f2f8", "#f7fbff")
CINDER = ("#120c10", "#1a1418", "#2a2020", "#3a2a24", "#4a3a34", "#3a322c", "#4a4038")
ASHPATH = ("#5a4a40", "#6a5848")
EMBER = ("#8a3a18", "#c45a18", "#e07a2f", "#e0a040")
DUNE = ("#6a5848", "#8a7048", "#a89470", "#b6a47c", "#cbb892", "#d8c4a0", "#e6d6b0")
PEBBLE = ("#3a3028", "#6a5848", "#8a7a64", "#c4b49a")


def _field(mask: int, seed: int) -> list[list[float]]:
    """The band's signed edge distance per pixel (inside > 0), with the same ragged edge as the swamp path."""
    cx = cy = 7.5
    ends = [(7.5, -0.5) if mask & 1 else None, (15.5, 7.5) if mask & 2 else None, (7.5, 15.5) if mask & 4 else None, (-0.5, 7.5) if mask & 8 else None]
    segs = [e for e in ends if e]
    out = [[-9.0] * 16 for _ in range(16)]
    for y in range(16):
        for x in range(16):
            d = min([_seg_dist(x, y, cx, cy, ex, ey) for (ex, ey) in segs] or [math.hypot(x - cx, y - cy)])
            border = min(x, y, 15 - x, 15 - y)
            wob = (_hash(x, y, seed) - 0.5) * 2.2 * min(1.0, border / 3.0)
            hw = (HALF if segs else 4.2) + wob + (0.8 if len(segs) >= 3 else 0.0)
            out[y][x] = hw - d
    return out


def _along(mask: int) -> int:
    """1 for a N-S run, 2 for an E-W run, 0 otherwise."""
    return 1 if mask == 5 else 2 if mask == 10 else 0


def trail(biome: str, mask: int, alt: int = 0, season: str = "autumn") -> Canvas:
    c = Canvas(16, 16)
    seed = {"vale": 101, "snow": 211, "ash": 307, "sand": 401}[biome] + 31 * mask + 7 * alt + 13 * SEASONS.index(season)
    f = _field(mask, seed)
    run = _along(mask)
    for y in range(16):
        for x in range(16):
            e = f[y][x]
            if e < -1.2:
                continue
            h = _hash(x, y, seed + 1)
            # the cross-run coordinate (0 at the band's middle) for ripples and prints
            u = (x - 7.5) if run == 1 else (y - 7.5) if run == 2 else 0.0
            v = y if run == 1 else x
            if biome == "vale":
                if e < 0:
                    if h > 0.6:
                        c.set(x, y, TURF[1] if h > 0.82 else EARTH[2])
                    continue
                col = TURF[0] if e < 1.0 and h > 0.55 else EARTH[2] if e < 1.0 else EARTH[3] if h > 0.4 else EARTH[4]
                if e >= 1.0 and h > 0.93:
                    col = EARTH[5]  # a worn, pale stone
                c.set(x, y, col)
                leaf = _hash(x, y, seed + 9)
                if leaf > (0.88 if season == "autumn" else 0.93):
                    lit = LITTER[season]
                    c.set(x, y, lit[int(_hash(x, y, seed + 11) * len(lit)) % len(lit)])
            elif biome == "snow":
                if e < 0:
                    if h > 0.5:
                        c.set(x, y, PACK[5] if h > 0.75 else PACK[6])  # thrown snow along the edge
                    continue
                # packed and trodden grey-blue, darker than the drifts round it
                col = PACK[3] if e < 1.0 else PACK[2] if h > 0.55 else PACK[1]
                c.set(x, y, col)
            elif biome == "ash":
                if e < 0:
                    if h > 0.55:
                        c.set(x, y, CINDER[6] if h > 0.8 else CINDER[5])
                    continue
                # trodden cinder, paler than the loose ash round it
                col = CINDER[6] if e < 1.0 else ASHPATH[1] if h > 0.6 else ASHPATH[0]
                c.set(x, y, col)
            else:  # sand
                if e < 0:
                    if h > 0.55:
                        c.set(x, y, DUNE[3] if h > 0.8 else DUNE[2])
                    continue
                col = DUNE[3] if e < 1.0 else DUNE[2]
                # wind ripples: a darker line every few pixels across the run (a long diagonal off it)
                r = (x + 3 * y) % 7 if not run else (int(v) + (1 if u > 0 else 0)) % 5
                if e >= 1.0 and r == 0 and h > 0.2:
                    col = DUNE[1]
                c.set(x, y, col)
    if biome == "vale":
        _vale_marks(c, mask, alt, seed, f)
    elif biome == "snow":
        _snow_marks(c, mask, alt, seed, f)
    elif biome == "ash":
        _ash_marks(c, mask, alt, seed, f)
    else:
        _sand_marks(c, mask, alt, seed, f)
    return c


def _inside(f, x, y, m=1.0) -> bool:
    return 0 <= x < 16 and 0 <= y < 16 and f[y][x] >= m


def _vale_marks(c, mask, alt, seed, f):
    run = _along(mask)
    if run and alt:
        # a root across the run, and a puddle beside it
        for k in range(3, 13):
            x, y = (k, 6) if run == 1 else (6, k)
            if _inside(f, x, y, 0):
                c.set(x, y, EARTH[1] if k % 3 else EARTH[0])
        for (dx, dy) in ((0, 0), (1, 0), (0, 1), (1, 1), (2, 1)):
            x, y = (7 + dx, 10 + dy) if run == 1 else (10 + dy, 7 + dx)
            c.set(x, y, "#2a3a6a" if (dx, dy) == (0, 0) else "#16304a")
    elif run:
        # two worn ruts along the run
        for k in range(16):
            for off in (-2, 2):
                x, y = (7 + off + (1 if off > 0 else 0), k) if run == 1 else (k, 7 + off + (1 if off > 0 else 0))
                if _inside(f, x, y) and _hash(x, y, seed + 3) > 0.25:
                    c.set(x, y, EARTH[2])


def _snow_marks(c, mask, alt, seed, f):
    run = _along(mask)
    if run and alt:
        # a sled's two runners, unbroken along the run
        for k in range(16):
            for off in (5, 10):
                x, y = (off, k) if run == 1 else (k, off)
                if _inside(f, x, y, 0):
                    c.set(x, y, PACK[0])
        return
    if run:
        # boot prints: left, right, left, right along the run (two each 8 px, so the run tiles seamlessly)
        for k, side in ((1, -1), (5, 1), (9, -1), (13, 1)):
            for (a, b) in ((0, 0), (1, 0), (0, 1), (1, 1), (0, 2), (1, 2)):
                x, y = (7 + side * 2 + a - (1 if side < 0 else 0), k + b - 1) if run == 1 else (k + b - 1, 7 + side * 2 + a - (1 if side < 0 else 0))
                if _inside(f, x, y):
                    c.set(x, y, PACK[0])
        return
    # a bend, a junction or an end: a few scuffed prints in the middle
    for (x, y) in ((6, 6), (7, 6), (6, 7), (9, 8), (10, 8), (10, 9)):
        if _inside(f, x, y):
            c.set(x, y, PACK[0])


def _ash_marks(c, mask, alt, seed, f):
    # cracks: a jagged line or two through the cinder, a few embers lodged in them
    run = _along(mask)
    paths = []
    if run:
        paths.append([(5, k) if run == 1 else (k, 5) for k in range(16)])
        paths.append([(10, k) if run == 1 else (k, 10) for k in range(16)])
    else:
        paths.append([(7 + int(round(math.sin(k * 0.9 + seed) * 1.5)), k) for k in range(2, 14)])
    n = 0
    for p in paths:
        for i, (x, y) in enumerate(p):
            j = int(round((_hash(i, len(p), seed + 7 + n) - 0.5) * 2))
            xx, yy = (x + j, y) if (run == 1 or not run) else (x, y + j)
            if _inside(f, xx, yy) and _hash(xx, yy, seed + 5) > 0.3:
                c.set(xx, yy, CINDER[0])
                if _hash(xx, yy, seed + 6) > 0.86:
                    c.set(xx, yy, EMBER[1] if _hash(xx, yy, seed + 8) > 0.5 else EMBER[0])
        n += 1
    if run and alt:
        # a glowing vent in the middle
        for (dx, dy, col) in ((7, 7, EMBER[3]), (8, 7, EMBER[2]), (7, 8, EMBER[2]), (8, 8, EMBER[1]), (6, 7, EMBER[0]), (9, 8, EMBER[0]), (7, 6, CINDER[0]), (8, 9, CINDER[0])):
            c.set(dx, dy, col)


def _sand_marks(c, mask, alt, seed, f):
    run = _along(mask)
    for k in range(6):
        x = int(_hash(k, 1, seed + 21) * 16)
        y = int(_hash(k, 2, seed + 22) * 16)
        if _inside(f, x, y, 1.5):
            c.set(x, y, PEBBLE[1] if k % 2 else PEBBLE[2])
            if k % 3 == 0 and _inside(f, x + 1, y, 1.5):
                c.set(x + 1, y, PEBBLE[0])
    if run and alt:
        # a half-buried bone across the run
        for k in range(5, 11):
            x, y = (k, 8) if run == 1 else (8, k)
            c.set(x, y, "#e6d6b0" if 5 < k < 10 else "#c4b49a")
        for (a, b) in ((4, 7), (4, 9), (11, 7), (11, 9)):
            x, y = (a, b) if run == 1 else (b, a)
            c.set(x, y, "#c4b49a")


def cells_for(biome: str, season: str = "autumn") -> list[Canvas]:
    """The 18 cells of one row: masks 0-15, then the N-S and E-W straights' variant."""
    return [trail(biome, m, 0, season) for m in range(16)] + [trail(biome, 5, 1, season), trail(biome, 10, 1, season)]
