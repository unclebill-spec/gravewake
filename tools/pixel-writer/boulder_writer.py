"""Boulder writer (playtest1w, [OWNER-APPROVED 2026-10-06 00:16 ET: playtest1w polish]).

Bill (2026-10-06 00:16 ET, "Fix all those things you mentioned", 1v's open item): big boulders, clearly bigger than the
16x32 hero, on a 2x2 block of the grid (src/game/boulders.ts lays them; all four tiles are rock). Drawn by code with
wild_writer's own rules and ramps, at the same detail density as the 1v rocks (prop_scale_writer.rock2): one art pixel is
one game pixel, palette v3, the 1 px INK outline, light from the upper left, facets at the 1c size (3x2 px), crack lines,
a top-left glint, the dithered contact shadow. A boulder is two or three overlapping stones (a main mass, a shoulder, a
foot stone) 40-46 px tall: 1.25-1.45x the hero's 32 px.

    boulder(kind, season)   48x56 cells (the stone's foot on row 54, centred on the 2x2 block)
    sheet()                 wild-boulders.png + _em: columns = BOULDER_KINDS, rows = SEASONS

Dress by biome and season: the vale's granite takes moss on its tops and leaf litter (autumn), a snow cap (winter),
fresh moss with a few flowers (spring), deep moss and fern tufts (summer); the snow's granite always wears its cap and
icicle drips; the waste's sandstone has wind-cut bands and a sand drift at its foot; the ash's basalt has ember cracks
(neon red, on the glow mask); the swamp's dark stone is slick with moss and foxfire lichen (neon blue, on the glow mask).
"""

from __future__ import annotations

import random

import wild_writer as w
from wild_writer import BLUE, INK, MOSS, RED, SNOW, Canvas, hsh, pick, outline

KINDS = ["vale", "vale2", "snow", "snow2", "sand", "sand2", "ash", "ash2", "swamp", "swamp2"]
SEASONS = ["autumn", "winter", "spring", "summer"]
CW, CH, FOOT = 48, 56, 54
SWAMPST = w.ramp("#0e1410", "#142018", "#1e2a20", "#2a3020", "#3a3a2a", "#4a4a34", "#5a5a40")
LITTER = w.ramp("#3a1810", "#8a3a18", "#c45a18", "#e07a2f", "#e0a040")
FLOWER = w.ramp("#e8c0d0", "#f4f0e8", "#c9a0e8", "#f4e27a")
FERN = w.ramp("#102818", "#1e4634", "#2a6828", "#3a8a40")


def _stones(kind: str, rng: random.Random) -> list[tuple[float, float, float, float]]:
    """(cx, cy, rx, ry) of the main mass, its shoulder and a foot stone; shape 2 leans the other way."""
    flip = kind.endswith("2")
    s = -1 if flip else 1
    main = (24 + s * rng.uniform(0.5, 1.5), 33 + rng.uniform(-0.5, 0.5), 17.5 + rng.uniform(-0.5, 1.0), 19.5 + rng.uniform(0, 1.5))
    shoulder = (24 - s * 9, 40, 10.5 + rng.uniform(0, 1), 12 + rng.uniform(0, 1))
    foot = (24 + s * 15, 49.5, 6 + rng.uniform(0, 1), 4.5)
    return [shoulder, main, foot]


def boulder(kind: str, season: str) -> tuple[Canvas, Canvas]:
    c = Canvas(CW, CH)
    em = Canvas(CW, CH)
    base = kind.rstrip("2")
    seed = 900 + KINDS.index(kind) * 17
    rng = random.Random(seed)
    r = {"vale": w.GRANITE, "snow": w.GRANITE, "sand": w.SANDST, "ash": w.BASALT, "swamp": SWAMPST}[base]
    stones = _stones(kind, rng)
    owner: dict[tuple[int, int], int] = {}
    for k, (sx, sy, rx, ry) in enumerate(stones):
        for y in range(CH):
            for x in range(CW):
                dx, dy = (x + 0.5 - sx) / rx, (y + 0.5 - sy) / ry
                pw = 2.5 if k == 1 else 2.2  # a squarer mass than a pebble: flatter top, blunt shoulders
                d = abs(dx) ** pw + abs(dy) ** pw
                facet = hsh(int((x - sx) // 3), int((y - sy) // 2), seed + k)
                if y > FOOT or d > 1.0 + (facet - 0.5) * 0.18:
                    continue
                lit = -(dx * -0.6 + dy * -0.8)
                t = 0.5 + 0.38 * lit + (facet - 0.5) * 0.28
                if dy > 0.5:
                    t -= 0.28  # the underside turns away from the light
                if base == "sand" and (y // 4) % 3 == 0:
                    t -= 0.12  # wind-cut bands
                c.set(x, y, pick(r, t))
                owner[(x, y)] = k
    # where a nearer stone overlaps a farther one, a dark seam
    for (x, y), k in list(owner.items()):
        for dx, dy in ((0, -1), (-1, 0), (1, 0)):
            o = owner.get((x + dx, y + dy))
            if o is not None and o < k and hsh(x, y, seed + 7) < 0.85:
                c.set(x + dx, y + dy, r[1])
    # cracks: a few wandering dark lines down the main mass
    mx, my, mrx, mry = stones[1]
    for n in range(4):
        x, y = int(mx + rng.uniform(-mrx * 0.6, mrx * 0.6)), int(my - mry * 0.6 + rng.uniform(0, 6))
        for j in range(rng.randint(7, 12)):
            if c.get(x, y):
                c.set(x, y, r[1])
                if base == "ash" and j % 2 == 0 and n < 2:
                    c.set(x, y, RED[3] if j % 4 == 0 else RED[2])
                    if j % 4 == 0:
                        em.set(x, y, RED[3])
            x += rng.choice((-1, 0, 0, 1))
            y += 1
    # the top-left glint of each stone
    for (sx, sy, rx, ry) in stones[:2]:
        gx, gy = int(sx - rx * 0.45), int(sy - ry * 0.6)
        for (dx, dy) in ((0, 0), (1, 0), (0, 1)):
            if c.get(gx + dx, gy + dy):
                c.set(gx + dx, gy + dy, r[-1])
    filled = [(x, y) for y in range(CH) for x in range(CW) if c.get(x, y)]
    tops = [(x, y) for (x, y) in filled if c.get(x, y - 1) is None]
    capped = base == "snow" or (base == "vale" and season == "winter") or (base == "swamp" and season == "winter")
    if capped:
        for (x, y) in tops:
            c.set(x, y, SNOW[4])
            depth = 3 if hsh(x, 1, seed) < 0.5 else 2
            for k in range(1, depth + 1):
                if c.get(x, y + k):
                    c.set(x, y + k, SNOW[3] if k < depth else SNOW[1])
        for (x, y) in tops:  # icicle drips under the cap's lip on the lit side
            if base == "snow" and hsh(x, 5, seed) < 0.18 and c.get(x, y + 4):
                c.set(x, y + 4, SNOW[2])
                if c.get(x, y + 5):
                    c.set(x, y + 5, SNOW[1])
    elif base in ("vale", "swamp"):
        deep = season in ("summer", "spring") or base == "swamp"
        for (x, y) in tops:
            if hsh(x, y, seed) < (0.85 if deep else 0.6):
                c.set(x, y, MOSS[3 if hsh(x, y, seed + 1) < 0.5 else 4 if season == "spring" else 2])
                for k in (1, 2, 3):
                    if c.get(x, y + k) and hsh(x, y + k, seed + 2) < (0.8 if deep else 0.5) / k:
                        c.set(x, y + k, MOSS[2] if k > 1 else MOSS[3])
        if base == "vale" and season == "autumn":
            for (x, y) in tops:
                if hsh(x, y, seed + 3) < 0.22:
                    c.set(x, y, LITTER[1 + int(hsh(x, 2, seed) * 4)])
        if base == "vale" and season == "spring":
            for (x, y) in tops:
                if hsh(x, y, seed + 4) < 0.07:
                    c.set(x, y, FLOWER[int(hsh(x, 3, seed) * 4)])
        if base == "swamp":
            # foxfire lichen: small cold-blue spots on the shaded side
            for (x, y) in filled:
                if x > 24 and hsh(x // 2, y // 2, seed + 9) < 0.06 and c.get(x, y) != INK:
                    c.set(x, y, BLUE[3])
                    em.set(x, y, BLUE[3])
    outline(c)
    # the foot: tufts (vale/swamp in their seasons), a sand drift, cinders, then the dithered contact shadow
    for x in range(CW):
        y = FOOT
        if c.get(x, y) is None and c.get(x, y - 1) and c.get(x, y - 1) != INK or (c.get(x, y) == INK and c.get(x, y - 1)):
            pass
    for x in range(2, CW - 2):
        if not any(c.get(x, yy) for yy in range(FOOT - 3, FOOT + 1)):
            continue
        roll = hsh(x, 7, seed)
        if base == "sand" and roll < 0.7:
            for yy in (FOOT, FOOT - 1) if roll < 0.35 else (FOOT,):
                c.set(x, yy, w.SANDST[4] if yy == FOOT - 1 else w.SANDST[3])
        elif base in ("vale", "swamp") and season != "winter" and roll < 0.18:
            col = FERN if (season == "summer" or base == "swamp") else w.TURF
            for k in range(1 + int(roll * 15)):
                c.set(x, FOOT - k, pick(col, 0.4 + k * 0.2))
    for x in range(CW):
        for y in (FOOT + 1,):
            if c.get(x, y) is None and c.get(x, y - 1) and (x + y) % 2 == 0:
                c.set(x, y, w.GROUND_DARK)
    for x in range(CW // 2, CW - 1):  # the shadow runs off to the lower right
        y = FOOT
        if c.get(x, y) is None and c.get(x - 3, y - 2) and (x + y) % 2 == 0:
            c.set(x, y, w.GROUND_DARK)
    return c, em


def sheet():
    """wild-boulders.png and its _em: columns = KINDS, rows = SEASONS."""
    from PIL import Image
    art = Image.new("RGBA", (CW * len(KINDS), CH * len(SEASONS)), (0, 0, 0, 0))
    em = Image.new("RGBA", (CW * len(KINDS), CH * len(SEASONS)), (0, 0, 0, 0))
    for si, s in enumerate(SEASONS):
        for ki, k in enumerate(KINDS):
            a, e = boulder(k, s)
            art.paste(a.image(), (ki * CW, si * CH))
            em.paste(e.image(), (ki * CW, si * CH))
    return art, em
