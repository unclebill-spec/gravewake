"""Prop scale writer (playtest1v, [OWNER-APPROVED 2026-10-05 21:15 ET: playtest1v prop scale + detail pass]).

Bill: trees should read clearly taller than the 16x32 hero (about 2-4x its height), small rocks knee-to-waist. The 1c
wild_writer trees stood 1.3-1.6x the hero. This draws the same species, dead trees and rocks at their audited sizes
(qa/playtest1v/prop_scale.md) with wild_writer's own parts, ramps and rules: one art pixel is one game pixel, palette v3
(LOCKED_V3), the 1 px INK outline, light from the upper left, the dithered ground shadow. Every length of the 1c drawing
is multiplied by the kind's scale S (TREE_S, DEAD_S, ROCK_S), but the leaf clumps, bark flecks, saw-tooth bough hems and
the outline stay their 1c pixel size, so a bigger crown carries more clumps (the same detail density as the bodies and
buildings), not fatter pixels. Seasons and glow masks as before (the yew's cold-fire wisps, the cinder embers, the
willow's swamp light).

    tree2(kind, season)   64x96 cells (the trunk's foot on the cell's bottom middle, row 94)
    deadwood2(kind)       64x96 cells
    rock2(kind)           24x24 cells (the stone's foot on row 22, centred)
"""

from __future__ import annotations

import math
import random

import wild_writer as w
from wild_writer import BARK, BIRCH, BLUE, CHAR, DRIFT, BLEACH, INK, LEAVES, MOSS, NEEDLES, RED, SNOW, YEW, Canvas, hsh, pick
from wild_writer import _blobs_mask, _crown, _line, _bark, _shadow, _trunk, outline

TREE_W, TREE_H = 64, 96
TREE_S = {"oak": 1.75, "oak2": 1.75, "elm": 1.7, "poplar": 2.0, "pine": 2.0, "pine2": 2.0, "birch": 1.6, "yew": 1.5}
DEAD_S = {"cinder": 1.4, "cinder2": 1.4, "cinder3": 1.4, "willow": 1.45, "willow2": 1.45, "willow3": 1.45, "thorn": 1.3, "thorn2": 1.3}
ROCK_W = 24
ROCK_S = 1.4


def _bare2(c: Canvas, cx: int, top: int, base: int, seed: int, spread: float, r, snow: bool, S: float) -> None:
    """wild_writer._bare at scale S: the same five limbs forking three times, longer and a little thicker."""
    rng = random.Random(seed)

    def limb(x: float, y: float, a: float, L: float, wd: float, depth: int) -> None:
        ex, ey = x + math.cos(a) * L, y + math.sin(a) * L
        _line(c, x, y, ex, ey, wd, max(1.0, wd * 0.6), _bark(r), seed + depth * 13 + int(L))
        if depth < 4 if S >= 1.6 else depth < 3:
            for b in (-0.5, 0.45):
                limb(ex, ey, a + b + rng.uniform(-0.15, 0.15), L * rng.uniform(0.55, 0.72), max(1.0, wd * 0.6), depth + 1)

    sy = top + 14 * S
    for i, a in enumerate((-2.35, -1.95, -1.57, -1.2, -0.8)):
        limb(cx, sy + abs(i - 2) * S, a + rng.uniform(-0.1, 0.1), spread * (0.62 if i in (0, 4) else 0.72), 2.6 * min(S, 1.6), 1)
    if snow:
        for y in range(c.h - 1, 0, -1):
            for x in range(c.w):
                if c.get(x, y) in r and c.get(x, y - 1) is None and y < base - 8 * S and hsh(x, y, seed) < 0.8:
                    c.set(x, y - 1, SNOW[3] if hsh(x, y, seed + 1) < 0.6 else SNOW[4])


def tree2(kind: str, season: str) -> tuple[Canvas, Canvas]:
    S = TREE_S[kind]
    c = Canvas(TREE_W, TREE_H)
    em = Canvas(TREE_W, TREE_H)
    seed = w.TREE_KINDS.index(kind) * 31 + 7
    base = TREE_H - 2
    cx = TREE_W // 2
    X = lambda x: cx + (x - 16) * S  # noqa: E731
    Y = lambda y: base + (y - 46) * S  # noqa: E731
    winter = season == "winter"
    sp = w.TREE_KINDS.index(kind) % 3
    if kind in ("pine", "pine2"):
        nr = NEEDLES[season]
        _trunk(c, cx, int(Y(34)), base, max(4, round(4 * S * 0.75)), BARK, seed)
        tiers = 6 if kind == "pine" else 5
        top = Y(1 if kind == "pine" else 5)
        bot = Y(39 if kind == "pine" else 38)
        span = (bot - top) / tiers
        mask = {}
        for t in range(tiers):
            ty0 = int(top + t * span * 0.9)
            ty1 = int(top + (t + 1) * span + 2 * S)
            wmax = (3.5 + (t + 1) * (11.0 / tiers)) * S
            for y in range(ty0, ty1 + 1):
                k = (y - ty0) / max(1, ty1 - ty0)
                half = 1.0 + (wmax - 1.0) * k
                for x in range(int(math.floor(cx - half)), int(math.ceil(cx + half))):
                    nx = (x + 0.5 - cx) / max(1.0, half)
                    if y >= ty1 - 1 and (x + t) % 3 != 0:
                        continue
                    if y == ty1 - 2 and (x + t) % 3 == 2 and abs(nx) < 0.85:
                        continue
                    mask[(x, y)] = (nx, k, t)
        for (x, y), (nx, k, t) in mask.items():
            lt = 0.62 - 0.5 * nx - 0.35 * k + 0.1 * (k < 0.25)
            if hsh(x // 2, y, seed + 2) < 0.18:
                lt -= 0.25
            if (x, y + 1) not in mask or mask[(x, y + 1)][2] != t:
                lt -= 0.15
            # bough layering inside a tier: a darker seam every few rows (the 1c tier was too short to need it)
            if int(k * span) % 6 == 5 and abs(nx) < 0.8 and hsh(x, y, seed + 6) < 0.7:
                lt -= 0.18
            c.set(x, y, pick(nr, lt))
        if winter:
            for (x, y), (nx, k, t) in mask.items():
                if k < 0.5 and hsh(x, y, seed + 4) < 0.92:
                    c.set(x, y, SNOW[4] if nx < 0.1 else SNOW[3] if nx < 0.6 else SNOW[1])
        _shadow(c, cx, base + 1, int(14 * S))
    elif winter and kind != "yew":
        r = BIRCH if kind == "birch" else BARK
        _trunk(c, cx, int(Y(22)), base, max(4, round((5 if kind != "poplar" else 4) * S * 0.75)), r, seed)
        _bare2(c, cx, int(Y(10 if kind != "poplar" else 6)), base, seed, (13 if kind != "poplar" else 10) * S, r, True, S)
        _shadow(c, cx, base + 1, int(12 * S))
    else:
        lr = YEW[season] if kind == "yew" else (LEAVES[season][sp] if season in LEAVES else LEAVES["autumn"][sp])
        tr = BIRCH if kind == "birch" else BARK
        if kind == "oak":
            blobs = [(16, 22, 11), (8.5, 27, 7.5), (23.5, 27, 7.5), (12, 16, 7), (21, 17, 6.5), (16, 31, 7)]
            ttop, tw = 29, 6
        elif kind == "oak2":
            blobs = [(15, 20, 10), (7.5, 26, 7), (24, 25, 7), (19, 15, 7), (12, 30, 6.5), (21, 31, 6)]
            ttop, tw = 29, 6
        elif kind == "elm":
            blobs = [(16, 19, 9), (9, 22, 6.5), (23, 22, 6.5), (16, 12, 6), (12, 28, 6), (20, 28, 6)]
            ttop, tw = 27, 5
        elif kind == "poplar":
            blobs = [(16, 15, 5.5), (16, 22, 6.5), (16, 30, 7), (13, 35, 5), (19, 35, 5)]
            ttop, tw = 35, 4
        elif kind == "birch":
            blobs = [(15, 19, 8), (21, 23, 6), (10, 25, 6), (17, 29, 6.5), (13, 13, 5.5)]
            ttop, tw = 29, 4
        else:
            blobs = [(16, 21, 10), (9, 27, 7), (23, 27, 7), (16, 32, 7.5), (16, 13, 6.5)]
            ttop, tw = 33, 6
        T0 = int(Y(ttop))
        _trunk(c, cx, T0, base, max(4, round(tw * S * 0.75)), tr, seed)
        if kind == "birch":
            for y in range(T0, base - 1):
                if hsh(0, y, seed) < 0.3:
                    c.set(cx - 1 + (y % 2), y, BARK[1])
                    if hsh(1, y, seed) < 0.4:
                        c.set(cx + 1 - (y % 2), y, BARK[1])
        _line(c, cx, T0 + 2 * S, cx - 6 * S, T0 - 6 * S, 2.4 * S * 0.8, 1.2, _bark(tr), seed + 1)
        _line(c, cx, T0 + 1 * S, cx + 6 * S, T0 - 7 * S, 2.4 * S * 0.8, 1.2, _bark(tr), seed + 2)
        mask = _blobs_mask([(X(bx), Y(by), br * S) for (bx, by, br) in blobs], TREE_W, TREE_H, seed)
        _crown(c, mask, lr, seed, holes=int(4 * S * S), blossom=(season == "spring" and kind in ("elm", "birch", "oak2")),
               fruit=(RED[2] if season == "autumn" and kind == "oak" else None))
        if kind == "yew":
            for (x, y) in [(9, 19), (22, 14), (15, 24), (20, 26), (12, 30), (19, 11)]:
                for (dx, dy, k) in [(0, 0, 4), (0, 1, 3), (1, 0, 2), (-1, 0, 2), (0, -1, 2)]:
                    col = BLUE[k] if k > 2 else BLUE[2]
                    c.set(int(X(x)) + dx, int(Y(y)) + dy, col)
                    if k >= 3:
                        em.set(int(X(x)) + dx, int(Y(y)) + dy, col)
        _shadow(c, cx, base + 1, int(16 * S))
    outline(c)
    for y in range(c.h):
        for x in range(c.w):
            if c.get(x, y) == INK and y >= base and not any(c.get(x + dx, y + dy) in BARK + BIRCH for dx, dy in ((1, 0), (-1, 0), (0, -1), (0, 1))):
                c.p[y][x] = None
    return c, em


def deadwood2(kind: str) -> tuple[Canvas, Canvas]:
    S = DEAD_S[kind]
    c = Canvas(TREE_W, TREE_H)
    em = Canvas(TREE_W, TREE_H)
    i = w.DEAD_KINDS.index(kind)
    seed = 400 + i * 17
    rng = random.Random(seed)
    base = TREE_H - 2
    cx = TREE_W // 2 + (i % 3) - 1
    Y = lambda y: base + (y - 46) * S  # noqa: E731
    if kind.startswith("cinder"):
        r = CHAR
        _trunk(c, cx, int(Y(18)), base, round(5 * S * 0.8), r, seed)
        for j in range(5 + i % 2):
            a = -math.pi / 2 + (j - 2.4) * 0.5 + rng.uniform(-0.2, 0.2)
            L = rng.uniform(10, 15) * S
            sy = Y(14 + rng.randrange(10))
            ex, ey = cx + math.cos(a) * L, sy + math.sin(a) * L
            _line(c, cx, sy, ex, ey, 2.8 * S * 0.85, 1.0, _bark(r), seed + j)
            b = a + rng.choice((-0.8, 0.8))
            _line(c, ex, ey, ex + math.cos(b) * 4 * S, ey + math.sin(b) * 4 * S, 1.0, 1.0, _bark(r), seed + j + 9)
            # a second crooked twig off each limb at the bigger size
            b2 = a - (b - a) * 0.8
            mx, my = cx + (ex - cx) * 0.6, sy + (ey - sy) * 0.6
            _line(c, mx, my, mx + math.cos(b2) * 3 * S, my + math.sin(b2) * 3 * S, 1.0, 1.0, _bark(r), seed + j + 19)
        y = base - 2
        x = cx
        while y > Y(18):
            col = RED[3] if hsh(x, y, seed) < 0.55 else RED[2]
            c.set(x, y, col)
            if col == RED[3]:
                em.set(x, y, col)
            y -= 1
            if hsh(x, y, seed + 1) < 0.3:
                x += 1 if hsh(x, y, seed + 2) < 0.5 else -1
                x = max(cx - 2, min(cx + 2, x))
        for (ex, ey) in [(cx - 2, base), (cx + 3, base - 1), (cx - 4, base)]:
            c.set(ex, ey, RED[2])
        _shadow(c, cx, base + 1, int(12 * S))
    elif kind.startswith("willow"):
        r = DRIFT
        _trunk(c, cx, int(Y(20)), base, round(6 * S * 0.8), r, seed)
        tips = []
        for j in range(5):
            a = -math.pi / 2 + (j - 2) * 0.55 + rng.uniform(-0.15, 0.15)
            L = rng.uniform(9, 13) * S
            sy = Y(18 + rng.randrange(6))
            ex, ey = cx + math.cos(a) * L, sy + math.sin(a) * L
            _line(c, cx, sy, ex, ey, 3.0 * S * 0.85, 1.2, _bark(r), seed + j)
            tips.append((ex, ey))
            _line(c, ex, ey, ex + math.cos(a) * 4 * S, ey + 3 * S, 1.2, 1.0, _bark(r), seed + j + 5)
        for y in range(4, int(Y(40))):
            for x in range(1, TREE_W - 1):
                if c.get(x, y) in r and c.get(x, y + 1) is None and hsh(x, y, seed + 3) < 0.4:
                    L = int((3 + int(hsh(x, y, seed + 4) * 8)) * S)
                    for k in range(L):
                        if c.get(x, y + 1 + k) is None:
                            c.set(x, y + 1 + k, MOSS[1 + (k < 2) + (k == 0)] if k < L - 1 else MOSS[0])
        for (dx, dy, col) in [(0, 0, BLUE[4]), (0, 1, BLUE[3]), (1, 0, BLUE[2]), (-1, 0, BLUE[2])]:
            x, y = int(tips[1][0]) + dx, int(tips[1][1] + 8 * S) + dy
            c.set(x, y, col)
            if col in (BLUE[4], BLUE[3]):
                em.set(x, y, col)
        _shadow(c, cx, base + 1, int(14 * S))
    else:
        r = BLEACH
        _trunk(c, cx, int(Y(24)), base, max(4, round(4 * S * 0.8)), r, seed)
        for j in range(4):
            a = -math.pi / 2 + (j - 1.5) * 0.7
            L = rng.uniform(8, 12) * S
            sy = Y(22 + rng.randrange(6))
            ex, ey = cx + math.cos(a) * L, sy + math.sin(a) * L
            _line(c, cx, sy, ex, ey, 2.2 * S * 0.85, 1.0, _bark(r), seed + j)
            for k in range(5):
                t = 0.3 + k * 0.16
                mx, my = cx + (ex - cx) * t, sy + (ey - sy) * t
                c.set(int(mx) + (1 if a > -math.pi / 2 else -1), int(my) - 1, r[1])
        if kind == "thorn":
            c.set(int(cx + 6 * S), int(Y(20)), RED[3])
            em.set(int(cx + 6 * S), int(Y(20)), RED[3])
        _shadow(c, cx, base + 1, int(10 * S))
    outline(c)
    return c, em


def rock2(kind: str) -> tuple[Canvas, Canvas]:
    """wild_writer.rock at ROCK_S on a 24x24 cell: the big stone and its smaller neighbour, facets kept at their 1c size."""
    S = ROCK_S
    N = ROCK_W
    c = Canvas(N, N)
    em = Canvas(N, N)
    i = w.ROCK_KINDS.index(kind)
    seed = 600 + i * 13
    rng = random.Random(seed)
    r = {"vale": w.GRANITE, "snow": w.GRANITE, "cinder": w.BASALT, "waste": w.SANDST, "town": w.TOWNST}[kind.rstrip("234")]
    ox, oy = N / 2 - 8 * S, (N - 2) - 14 * S  # the 1c stone's (8, 14) foot lands at (N/2, N-2)
    stones = [(ox + (7.5 + rng.uniform(-0.8, 0.8)) * S, oy + 9.5 * S, (5.6 + rng.uniform(-0.4, 0.6)) * S, (4.4 + rng.uniform(-0.3, 0.5)) * S)]
    if i % 2 == 0:
        stones.append((ox + 12.5 * S, oy + 12 * S, 2.6 * S, 2.0 * S))
    else:
        stones.append((ox + 3.0 * S, oy + 12.2 * S, 2.4 * S, 1.8 * S))
    for (sx, sy, rx, ry) in stones:
        for y in range(N):
            for x in range(N):
                dx, dy = (x + 0.5 - sx) / rx, (y + 0.5 - sy) / ry
                d = dx * dx + dy * dy
                facet = hsh(int((x - sx) // 3), int((y - sy) // 2), seed)
                if d <= 1.0 + (facet - 0.5) * 0.25:
                    lit = -(dx * -0.6 + dy * -0.8)
                    t = 0.5 + 0.4 * lit + (facet - 0.5) * 0.3
                    if dy > 0.55:
                        t -= 0.3
                    c.set(x, y, pick(r, t))
    for k in range(3):
        x, y = int(stones[0][0]) + rng.randrange(-3, 4), int(stones[0][1]) - 3
        for j in range(4):
            if c.get(x, y):
                c.set(x, y, r[1])
            x += rng.choice((-1, 0, 1))
            y += 1
    gx, gy = int(stones[0][0] - stones[0][2] * 0.45), int(stones[0][1] - stones[0][3] * 0.55)
    for (dx, dy) in ((0, 0), (1, 0)):
        if c.get(gx + dx, gy + dy):
            c.set(gx + dx, gy + dy, r[-1])
    base = kind.rstrip("234")
    cells = [(x, y) for y in range(N) for x in range(N) if c.get(x, y)]
    if base == "vale":
        for (x, y) in cells:
            if c.get(x, y - 1) is None and hsh(x, y, seed) < 0.6:
                c.set(x, y, MOSS[3 if hsh(x, y, seed + 1) < 0.5 else 2])
                if hsh(x, y, seed + 2) < 0.4 and c.get(x, y + 1):
                    c.set(x, y + 1, MOSS[2])
    elif base == "snow":
        for (x, y) in cells:
            if c.get(x, y - 1) is None:
                c.set(x, y, SNOW[4])
                if c.get(x, y + 1) and hsh(x, y, seed) < 0.7:
                    c.set(x, y + 1, SNOW[2])
    elif base == "cinder":
        x, y = int(stones[0][0]), int(stones[0][1]) - 4
        for j in range(7):
            if c.get(x, y):
                col = RED[3] if j % 2 == 0 else RED[2]
                c.set(x, y, col)
                if col == RED[3]:
                    em.set(x, y, col)
            x += (1 if j % 2 else 0)
            y += 1
    elif base == "town":
        y = int(stones[0][1])
        for x in range(N):
            if c.get(x, y) and c.get(x, y - 1):
                c.set(x, y, r[1])
    outline(c)
    for x in range(N):
        y = N - 1
        if c.get(x, y) is None and c.get(x, y - 1) and (x % 2 == 0):
            c.set(x, y, w.GROUND_DARK)
    return c, em
