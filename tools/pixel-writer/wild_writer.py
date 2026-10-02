"""Wild writer (playtest1c, batch C art audit, 2026-10-02): the outdoor world redrawn in Bill's "gloom and glow".

Same rules as glow_writer and hearth_writer: drawn pixel by pixel on the pixel writer's Canvas, one colour per pixel,
hard alpha, every colour from palette v3 (LOCKED_V3; a wanted shade is snapped to its nearest locked step, never
mixed). One art pixel is one game pixel, the same scale as the playtest1b sprites (16x32 people, 16 px tiles).
Cold blue neon (NEON["blue"]) is the signature light, violet and red the accents.

    tree(kind, season)      32x48 trees: oak, oak2, elm, poplar, pine, pine2, birch, yew (eight species x four seasons)
    deadwood(kind)          32x48: three charred cinder trees (red ember cracks), three drowned swamp willows, two
                            bleached waste thorns
    rock(kind)              16x16 boulders: vale moss, snow caps, cinder basalt (ember seam), waste sandstone, town rubble
    grave(kind)             16x32 town headstones, house scale (a 10-13 px stone on its plot), one with a cold-fire candle
    entrance(kind, frame)   48x48 dungeon mouths over the stair tile: stairwell, crypt mouth, barrow arch; cold-fire
                            braziers, two flicker frames
    stairs(kind)            16x16 dungeon floor stairs (down into the dark, up into the light) in place of the ladder
    sheet(kind, frame)      128x128 wrapping textures sampled by world position (so no tile grid): water (vale and town),
                            ice, snow, cinder ash, waste sand, swamp mud
    shore(kind, side)       16x16 rims laid on a water/ice tile's edge where its neighbour is dry: earth bank, stone
                            coping (the town pool), snow bank (the ice pond)
    pumpkin(kind)           the town's jack-o'-lanterns, 16x16 and 32x32, carved faces lit
    rat(frame)              not here: the critter's look is the sprite writer's (tools/sprite-writer)
"""

from __future__ import annotations

import math
import random
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "sprite-writer"))

from pixel_writer import Canvas as _Canvas  # noqa: E402
from palette_locked import LOCKED_V3, NEON  # noqa: E402

INK = "#140c10"
_PAL = sorted(LOCKED_V3)
_RGB = {c: (int(c[1:3], 16), int(c[3:5], 16), int(c[5:7], 16)) for c in _PAL}
_SNAPPED: dict[str, str] = {}


def snap(c: str) -> str:
    """The nearest locked colour (weighted RGB distance). A colour already locked comes back unchanged."""
    c = c.lower()
    if c in _RGB:
        return c
    if c not in _SNAPPED:
        r, g, b = int(c[1:3], 16), int(c[3:5], 16), int(c[5:7], 16)
        _SNAPPED[c] = min(_PAL, key=lambda p: 2 * (_RGB[p][0] - r) ** 2 + 4 * (_RGB[p][1] - g) ** 2 + 3 * (_RGB[p][2] - b) ** 2)
    return _SNAPPED[c]


class Canvas(_Canvas):
    """The pixel writer's Canvas, but every colour set is snapped to palette v3 first: nothing off the lock lands."""

    def set(self, x: int, y: int, color: str | None) -> None:
        super().set(x, y, snap(color) if color else color)


def ramp(*cs: str) -> tuple[str, ...]:
    """A shade ramp, dark to light, every step locked and no step repeated."""
    out: list[str] = []
    for c in cs:
        s = snap(c)
        if s not in out:
            out.append(s)
    return tuple(out)


def pick(r: tuple[str, ...], t: float) -> str:
    return r[max(0, min(len(r) - 1, int(round(t * (len(r) - 1)))))]


def outline(c: Canvas, color: str = INK) -> None:
    """A 1 px ink edge around every filled pixel (4-neighbour)."""
    add = []
    for y in range(c.h):
        for x in range(c.w):
            if c.get(x, y):
                continue
            if any(c.get(x + dx, y + dy) and c.get(x + dx, y + dy) != color for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1))):
                add.append((x, y))
    for x, y in add:
        c.set(x, y, color)


def hsh(x: int, y: int, s: int = 0) -> float:
    """A fixed hash in [0, 1): the same pixel always gets the same roll."""
    n = (x * 374761393 + y * 668265263 + s * 2147483647) & 0xFFFFFFFF
    n = ((n ^ (n >> 13)) * 1274126177) & 0xFFFFFFFF
    return ((n ^ (n >> 16)) & 0xFFFF) / 65536.0


def wrap_noise(x: float, y: float, period: int, cell: int, s: int) -> float:
    """Smooth value noise that wraps every `period` pixels, so a 64x64 sheet tiles with no seam."""
    n = period // cell
    gx, gy = x / cell, y / cell
    x0, y0 = int(math.floor(gx)), int(math.floor(gy))
    fx, fy = gx - x0, gy - y0
    fx, fy = fx * fx * (3 - 2 * fx), fy * fy * (3 - 2 * fy)

    def v(i: int, j: int) -> float:
        return hsh(i % n, j % n, s)

    a = v(x0, y0) + (v(x0 + 1, y0) - v(x0, y0)) * fx
    b = v(x0, y0 + 1) + (v(x0 + 1, y0 + 1) - v(x0, y0 + 1)) * fx
    return a + (b - a) * fy


def fbm(x: float, y: float, period: int, s: int) -> float:
    return 0.55 * wrap_noise(x, y, period, 16, s) + 0.3 * wrap_noise(x, y, period, 8, s + 1) + 0.15 * wrap_noise(x, y, period, 4, s + 2)


BAYER = [[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]]


def tone(t: float, x: int, y: int, steps: int, soft: float = 0.035) -> int:
    """Quantize t in [0, 1] into 0..steps-1 as flat regions (pixel-art clusters); only a thin seam right on a
    boundary is checkered, so two tones meet with a soft edge and the rest is clean."""
    v = max(0.0, min(0.9999, t)) * steps
    i = int(v)
    f = v - i
    if f < soft and i > 0 and (x + y) % 2 == 0:
        return i - 1
    if f > 1 - soft and i < steps - 1 and (x + y) % 2 == 0:
        return i + 1
    return i


def dither(t: float, x: int, y: int, steps: int) -> int:
    """An ordered-dither step of t in [0, 1] into 0..steps-1: soft bands with no new colours."""
    v = t * (steps - 1) + (BAYER[y % 4][x % 4] + 0.5) / 16.0 - 0.5
    return max(0, min(steps - 1, int(round(v))))


# --- palettes ---------------------------------------------------------------------------------------------------------

BLUE, VIOLET, RED = NEON["blue"], NEON["violet"], NEON["red"]
BARK = ramp("#1a1008", "#2a1c14", "#3a2818", "#4a3424", "#5a4030", "#6a5040", "#8a6848")
BIRCH = ramp("#3a3428", "#6a6660", "#b7b2a6", "#d4cec0", "#e6e0d4")
CHAR = ramp("#120c10", "#1a1418", "#2a2020", "#3a2a24", "#4a3a34", "#5a4a40")
DRIFT = ramp("#1a1612", "#2a2824", "#3a3a34", "#4a4a40", "#6a6a58")
BLEACH = ramp("#3a3028", "#6a5848", "#8a7a64", "#c4b49a", "#e6d6b0")
MOSS = ramp("#142018", "#1e3428", "#2a4a28", "#3a6828", "#5a7a28")
LEAVES = {
    # dark .. light; four or five locked steps per species and season
    "autumn": [ramp("#3a1810", "#6a3a28", "#8a3a18", "#c45a18", "#e07a2f", "#e0a040"),
               ramp("#2a1018", "#4a1020", "#6a2030", "#8a2030", "#c43838", "#e07088"),
               ramp("#3a3018", "#6a5030", "#8a6840", "#c4a050", "#e0c060", "#f0d080")],
    "summer": [ramp("#0e2418", "#163028", "#1e4634", "#2a5838", "#3a6840", "#48a060"),
               ramp("#102018", "#1a3028", "#214432", "#2f6a44", "#3a8a40", "#6aaa48"),
               ramp("#101820", "#143028", "#1e3a32", "#2a4a38", "#3a6858", "#5a8a70")],
    "spring": [ramp("#142018", "#1e3a28", "#2a5a38", "#3a8a40", "#6aaa48", "#c8e080"),
               ramp("#1a2818", "#2a4a28", "#3a6a30", "#5a8a38", "#9ec060", "#d8f0c8"),
               ramp("#142818", "#1e4634", "#2f6a4a", "#48a060", "#8ec070", "#d8e0b0")],
}
BLOSSOM = ramp("#c46878", "#e07088", "#e8c0d0", "#f4f0e8")
NEEDLES = {"autumn": ramp("#0c2030", "#102818", "#163028", "#1e4634", "#2a5838", "#3a6840"),
           "summer": ramp("#0c2030", "#0e2418", "#163028", "#1e4a34", "#2f6a44", "#3a8a40"),
           "spring": ramp("#0e2418", "#163028", "#1e4634", "#2f6a44", "#3a8a40", "#6aaa48"),
           "winter": ramp("#0c2030", "#102818", "#163028", "#1e4634", "#2a5838", "#3a6840")}
YEW = {"autumn": ramp("#140810", "#1a1430", "#241848", "#2a2040", "#3a2a44", "#4a3a60"),
       "summer": ramp("#0c2030", "#101820", "#143028", "#1a3828", "#1e4634", "#2a5838"),
       "spring": ramp("#0e2418", "#143028", "#1e4634", "#2a5838", "#3a6858", "#48a060"),
       "winter": ramp("#140810", "#1a1430", "#241848", "#2a2040", "#3a2a44", "#4a3a60")}
SNOW = ramp("#8aa4b0", "#b7d2e0", "#d5e8f2", "#e8f2f8", "#f7fbff")
SNOWS = ramp("#5a6878", "#8aa4b0", "#b7d2e0", "#c5d8e6", "#d7e6f0", "#e8f2f8", "#f7fbff")
GROUND_DARK = "#1a1418"


# --- trees ------------------------------------------------------------------------------------------------------------

TREE_KINDS = ["oak", "oak2", "elm", "poplar", "pine", "pine2", "birch", "yew"]
SEASONS = ["autumn", "winter", "spring", "summer"]


def _line(c: Canvas, x0: float, y0: float, x1: float, y1: float, w0: float, w1: float, shade, seed: int) -> None:
    """A tapering limb from (x0,y0) to (x1,y1), lit from the upper left."""
    n = int(max(abs(x1 - x0), abs(y1 - y0)) * 2) + 1
    for i in range(n + 1):
        t = i / n
        x, y = x0 + (x1 - x0) * t, y0 + (y1 - y0) * t
        w = w0 + (w1 - w0) * t
        r = w / 2
        for yy in range(int(math.floor(y - r)), int(math.ceil(y + r)) + 1):
            for xx in range(int(math.floor(x - r)), int(math.ceil(x + r)) + 1):
                if (xx + 0.5 - x) ** 2 + (yy + 0.5 - y) ** 2 <= r * r + 0.3:
                    side = (xx + 0.5 - x) / max(0.6, r)
                    c.set(xx, yy, shade(side, xx, yy))


def _bark(r):
    def f(side: float, x: int, y: int) -> str:
        t = 0.62 - 0.45 * side
        if hsh(x, y // 3, 5) < 0.18:
            t -= 0.3
        return pick(r, t)
    return f


def _trunk(c: Canvas, cx: int, top: int, base: int, w: int, r, seed: int, roots: bool = True) -> None:
    for y in range(top, base + 1):
        k = (y - top) / max(1, base - top)
        half = w / 2 + (1.6 if y >= base - 2 and roots else 0) * (1 if y >= base - 1 else 0.5)
        sway = math.sin(y * 0.35 + seed) * 0.6 * (1 - k)
        for x in range(int(math.floor(cx - half + sway)), int(math.ceil(cx + half + sway))):
            side = (x + 0.5 - (cx + sway)) / max(1, half)
            t = 0.7 - 0.5 * side
            if hsh(x, y // 2, seed) < 0.16:
                t -= 0.35
            if (x + y * 3) % 7 == 0 and abs(side) < 0.5:
                t -= 0.2
            c.set(x, y, pick(r, t))
    if roots:
        rng = random.Random(seed)
        for d in (-1, 1):
            L = 2 + rng.randrange(3)
            for i in range(L):
                c.set(int(cx + d * (w / 2 + 1 + i)), base - (1 if i < 1 else 0), r[1 if i else 2])


def _blobs_mask(blobs, w: int, h: int, seed: int, ragged: float = 0.9):
    """Union of discs, with a ragged leafy rim. Returns {(x, y): (nx, ny, depth)}."""
    out = {}
    for y in range(h):
        for x in range(w):
            best = None
            for (bx, by, br) in blobs:
                dx, dy = (x + 0.5 - bx) / br, (y + 0.5 - by) / br
                d = math.hypot(dx, dy)
                edge = 1 + (hsh(x // 2, y // 2, seed) - 0.5) * 0.28 * ragged
                if d <= edge and (best is None or (1 - d) > best[2]):
                    best = (dx, dy, 1 - d)
            if best:
                out[(x, y)] = best
    return out


def _crown(c: Canvas, mask, r, seed: int, holes: int = 3, blossom: bool = False, fruit: str | None = None) -> None:
    """Shade a crown as leaf clumps: each clump lit from the upper left on top of the crown's own roundness, a dark
    seam where one clump tucks under the next, sun-caught tips on the rim."""
    lx, ly = -0.62, -0.78
    rng = random.Random(seed * 7 + 1)
    pts = sorted(mask.keys())
    clumps = []
    for _ in range(max(10, len(pts) // 22)):
        x, y = pts[rng.randrange(len(pts))]
        clumps.append((x + 0.5, y + 0.5, rng.uniform(2.6, 4.2)))
    clumps.sort(key=lambda b: b[1])  # lower clumps drawn over upper ones
    bottom = {}
    for (x, y) in mask:
        bottom[x] = max(bottom.get(x, -1), y)
    for (x, y), (nx, ny, depth) in mask.items():
        g = -(nx * lx + ny * ly)
        own = None
        for (bx, by, br) in clumps:
            dx, dy = (x + 0.5 - bx) / br, (y + 0.5 - by) / br
            if dx * dx + dy * dy <= 1:
                own = (dx, dy)
        if own:
            l2 = -(own[0] * lx + own[1] * ly)
            t = 0.42 + 0.3 * g + 0.28 * l2
            if own[1] > 0.7:
                t -= 0.2  # the clump's underside, a seam
        else:
            t = 0.3 + 0.3 * g
        if bottom.get(x, -1) - y <= 1:
            t -= 0.22
        if hsh(x, y, seed + 3) < 0.08:
            t -= 0.2
        c.set(x, y, pick(r, t))
    for _ in range(holes):
        x, y = pts[rng.randrange(len(pts))]
        if mask[(x, y)][2] > 0.25 and mask[(x, y)][1] > -0.1:
            c.set(x, y, r[0])
            c.set(x + 1, y, r[0])
            c.set(x, y + 1, BARK[1])
    for (x, y), (nx, ny, depth) in mask.items():
        if depth < 0.16 and nx < 0.15 and ny < -0.15 and hsh(x, y, seed + 9) < 0.45:
            c.set(x, y, r[-1])
    if blossom:
        for (x, y), (nx, ny, depth) in mask.items():
            if hsh(x, y, seed + 11) < 0.07:
                c.set(x, y, BLOSSOM[2 if ny < 0 else 1])
                if hsh(x, y, seed + 12) < 0.4:
                    c.set(x, y - 1, BLOSSOM[3])
    if fruit:
        for (x, y), (nx, ny, depth) in mask.items():
            if 0.15 < depth < 0.5 and hsh(x, y, seed + 13) < 0.025:
                c.set(x, y, fruit)


def _shadow(c: Canvas, cx: int, base: int, w: int) -> None:
    """A dithered ground shadow under the crown's right side: it reads on every biome, no soft alpha."""
    for y in range(base - 1, base + 1):
        for x in range(cx - w // 2, cx + w // 2 + 3):
            if c.get(x, y) is None and (x + y) % 2 == 0 and abs(x - cx - 1) < w / 2 + 1 - (base - y):
                c.set(x, y, GROUND_DARK)


def _bare(c: Canvas, cx: int, top: int, base: int, seed: int, spread: int, r, snow: bool) -> None:
    """A leafless crown: limbs fork twice into twigs (a wide fan, not a broom), then snow lies on each limb's top."""
    rng = random.Random(seed)

    def limb(x: float, y: float, a: float, L: float, w: float, depth: int) -> None:
        ex, ey = x + math.cos(a) * L, y + math.sin(a) * L
        _line(c, x, y, ex, ey, w, max(1.0, w * 0.6), _bark(r), seed + depth * 13 + int(L))
        if depth < 3:
            for b in (-0.5, 0.45):
                limb(ex, ey, a + b + rng.uniform(-0.15, 0.15), L * rng.uniform(0.55, 0.72), max(1.0, w * 0.6), depth + 1)

    sy = top + 14
    for i, a in enumerate((-2.35, -1.95, -1.57, -1.2, -0.8)):
        limb(cx, sy + abs(i - 2), a + rng.uniform(-0.1, 0.1), spread * (0.62 if i in (0, 4) else 0.72), 2.6, 1)
    if snow:
        for y in range(c.h - 1, 0, -1):
            for x in range(c.w):
                if c.get(x, y) in r and c.get(x, y - 1) is None and y < base - 8 and hsh(x, y, seed) < 0.8:
                    c.set(x, y - 1, SNOW[3] if hsh(x, y, seed + 1) < 0.6 else SNOW[4])


def tree(kind: str, season: str) -> tuple[Canvas, Canvas]:
    """One tree cell (32x48) and its glow mask (only the yew's cold-fire wisps glow)."""
    c = Canvas(32, 48)
    em = Canvas(32, 48)
    seed = TREE_KINDS.index(kind) * 31 + 7
    base = 46
    cx = 16
    winter = season == "winter"
    sp = TREE_KINDS.index(kind) % 3
    if kind in ("pine", "pine2"):
        nr = NEEDLES[season]
        _trunk(c, cx, 34, base, 4, BARK, seed)
        tiers = 5 if kind == "pine" else 4
        top = 1 if kind == "pine" else 5
        bot = 39 if kind == "pine" else 38
        span = (bot - top) / tiers
        mask = {}
        for t in range(tiers):
            ty0 = int(top + t * span * 0.9)
            ty1 = int(top + (t + 1) * span + 2)
            wmax = 3.5 + (t + 1) * (11.0 / tiers)
            for y in range(ty0, ty1 + 1):
                k = (y - ty0) / max(1, ty1 - ty0)
                half = 1.0 + (wmax - 1.0) * k
                for x in range(int(math.floor(cx - half)), int(math.ceil(cx + half))):
                    nx = (x + 0.5 - cx) / max(1.0, half)
                    # saw-tooth bough tips along the tier's hem, drooping at the ends
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
            c.set(x, y, pick(nr, lt))
        if winter:
            for (x, y), (nx, k, t) in mask.items():
                if k < 0.5 and hsh(x, y, seed + 4) < 0.92:
                    c.set(x, y, SNOW[4] if nx < 0.1 else SNOW[3] if nx < 0.6 else SNOW[1])
        _shadow(c, cx, base + 1, 14)
    elif winter and kind != "yew":
        r = BIRCH if kind == "birch" else BARK
        _trunk(c, cx, 22, base, 5 if kind != "poplar" else 4, r, seed)
        _bare(c, cx, 10 if kind != "poplar" else 6, base, seed, 13 if kind != "poplar" else 10, r, True)
        _shadow(c, cx, base + 1, 12)
    else:
        if kind == "yew":
            lr = YEW[season]
        else:
            lr = LEAVES[season][sp] if season in LEAVES else LEAVES["autumn"][sp]
        if kind == "birch":
            tr = BIRCH
        else:
            tr = BARK
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
        else:  # yew: a dark rounded churchyard yew, cold-fire wisps in its boughs
            blobs = [(16, 21, 10), (9, 27, 7), (23, 27, 7), (16, 32, 7.5), (16, 13, 6.5)]
            ttop, tw = 33, 6
        _trunk(c, cx, ttop, base, tw, tr, seed)
        if kind == "birch":
            for y in range(ttop, base - 1):
                if hsh(0, y, seed) < 0.3:
                    c.set(cx - 1 + (y % 2), y, BARK[1])
        # limbs reaching into the crown
        _line(c, cx, ttop + 2, cx - 6, ttop - 6, 2.4, 1.2, _bark(tr), seed + 1)
        _line(c, cx, ttop + 1, cx + 6, ttop - 7, 2.4, 1.2, _bark(tr), seed + 2)
        mask = _blobs_mask(blobs, 32, 48, seed)
        _crown(c, mask, lr, seed, holes=4, blossom=(season == "spring" and kind in ("elm", "birch", "oak2")),
               fruit=(RED[2] if season == "autumn" and kind == "oak" else None))
        if kind == "yew":
            for (x, y) in [(9, 19), (22, 14), (15, 24), (20, 26)]:
                for (dx, dy, k) in [(0, 0, 4), (0, 1, 3), (1, 0, 2), (-1, 0, 2), (0, -1, 2)]:
                    col = BLUE[k] if k > 2 else BLUE[2]
                    c.set(x + dx, y + dy, col)
                    if k >= 3:
                        em.set(x + dx, y + dy, col)
        _shadow(c, cx, base + 1, 16)
    outline(c)
    # the dithered shadow is ground, not tree: the ink the outline put round it comes off again
    for y in range(c.h):
        for x in range(c.w):
            if c.get(x, y) == INK and y >= base and not any(c.get(x + dx, y + dy) in BARK + BIRCH for dx, dy in ((1, 0), (-1, 0), (0, -1), (0, 1))):
                c.p[y][x] = None
    return c, em


DEAD_KINDS = ["cinder", "cinder2", "cinder3", "willow", "willow2", "willow3", "thorn", "thorn2"]


def deadwood(kind: str) -> tuple[Canvas, Canvas]:
    """Cinder trees (charred, red ember seams that glow), drowned willows (grey drift wood, hanging moss), waste thorns."""
    c = Canvas(32, 48)
    em = Canvas(32, 48)
    i = DEAD_KINDS.index(kind)
    seed = 400 + i * 17
    rng = random.Random(seed)
    base = 46
    cx = 16 + (i % 3) - 1
    if kind.startswith("cinder"):
        r = CHAR
        _trunk(c, cx, 18, base, 5, r, seed)
        for j in range(5 + i % 2):
            a = -math.pi / 2 + (j - 2.4) * 0.5 + rng.uniform(-0.2, 0.2)
            L = rng.uniform(10, 15)
            sy = 14 + rng.randrange(10)
            ex, ey = cx + math.cos(a) * L, sy + math.sin(a) * L
            _line(c, cx, sy, ex, ey, 2.8, 1.0, _bark(r), seed + j)
            # crooked twig
            b = a + rng.choice((-0.8, 0.8))
            _line(c, ex, ey, ex + math.cos(b) * 4, ey + math.sin(b) * 4, 1.0, 1.0, _bark(r), seed + j + 9)
        # ember seams: a crack of red neon running up the trunk and into two limbs
        y = base - 2
        x = cx
        while y > 18:
            col = RED[3] if hsh(x, y, seed) < 0.55 else RED[2]
            c.set(x, y, col)
            if col == RED[3]:
                em.set(x, y, col)
            y -= 1
            if hsh(x, y, seed + 1) < 0.3:
                x += 1 if hsh(x, y, seed + 2) < 0.5 else -1
                x = max(cx - 1, min(cx + 1, x))
        for (ex, ey) in [(cx - 1, base), (cx + 2, base - 1), (cx - 3, base)]:
            c.set(ex, ey, RED[2])
        _shadow(c, cx, base + 1, 12)
    elif kind.startswith("willow"):
        r = DRIFT
        _trunk(c, cx, 20, base, 6, r, seed)
        tips = []
        for j in range(5):
            a = -math.pi / 2 + (j - 2) * 0.55 + rng.uniform(-0.15, 0.15)
            L = rng.uniform(9, 13)
            sy = 18 + rng.randrange(6)
            ex, ey = cx + math.cos(a) * L, sy + math.sin(a) * L
            _line(c, cx, sy, ex, ey, 3.0, 1.2, _bark(r), seed + j)
            tips.append((ex, ey))
            # the limb arches over and droops
            _line(c, ex, ey, ex + math.cos(a) * 4, ey + 3, 1.2, 1.0, _bark(r), seed + j + 5)
        # moss and weed hanging from every limb
        for y in range(4, 40):
            for x in range(1, 31):
                if c.get(x, y) in r and c.get(x, y + 1) is None and hsh(x, y, seed + 3) < 0.4:
                    L = 3 + int(hsh(x, y, seed + 4) * 8)
                    for k in range(L):
                        if c.get(x, y + 1 + k) is None:
                            c.set(x, y + 1 + k, MOSS[1 + (k < 2) + (k == 0)] if k < L - 1 else MOSS[0])
        # a wisp of swamp light
        for (dx, dy, col) in [(0, 0, BLUE[4]), (0, 1, BLUE[3]), (1, 0, BLUE[2]), (-1, 0, BLUE[2])]:
            x, y = int(tips[1][0]) + dx, int(tips[1][1]) + 8 + dy
            c.set(x, y, col)
            if col in (BLUE[4], BLUE[3]):
                em.set(x, y, col)
        _shadow(c, cx, base + 1, 14)
    else:
        r = BLEACH
        _trunk(c, cx, 24, base, 4, r, seed)
        for j in range(4):
            a = -math.pi / 2 + (j - 1.5) * 0.7
            L = rng.uniform(8, 12)
            sy = 22 + rng.randrange(6)
            ex, ey = cx + math.cos(a) * L, sy + math.sin(a) * L
            _line(c, cx, sy, ex, ey, 2.2, 1.0, _bark(r), seed + j)
            # flat thorn crown: short horizontal spurs
            for k in range(3):
                t = 0.4 + k * 0.25
                mx, my = cx + (ex - cx) * t, sy + (ey - sy) * t
                c.set(int(mx) + (1 if a > -math.pi / 2 else -1), int(my) - 1, r[1])
        # a crow's red eye on one, for the waste's dread
        if kind == "thorn":
            c.set(int(cx + 6), 20, RED[3])
            em.set(int(cx + 6), 20, RED[3])
        _shadow(c, cx, base + 1, 10)
    outline(c)
    return c, em


# --- rocks ------------------------------------------------------------------------------------------------------------

ROCK_KINDS = ["vale", "vale2", "vale3", "vale4", "snow", "snow2", "cinder", "cinder2", "waste", "waste2", "town", "town2"]
GRANITE = ramp("#1a1a1c", "#2a2a2e", "#3a4048", "#5a5e64", "#7a8088", "#a0a4a8", "#c8c8d0")
BASALT = ramp("#100c12", "#1a1418", "#2a2428", "#3a3438", "#4a4450", "#5a5e64")
SANDST = ramp("#3a2818", "#6a5038", "#8a6844", "#b09060", "#c4a574", "#d8c4a0")
TOWNST = ramp("#2a2420", "#4a4450", "#5a564e", "#6a6660", "#8a867c", "#b7b2a6")


def rock(kind: str) -> tuple[Canvas, Canvas]:
    c = Canvas(16, 16)
    em = Canvas(16, 16)
    i = ROCK_KINDS.index(kind)
    seed = 600 + i * 13
    rng = random.Random(seed)
    r = {"vale": GRANITE, "snow": GRANITE, "cinder": BASALT, "waste": SANDST, "town": TOWNST}[kind.rstrip("234")]
    # one big stone and one or two smaller beside it
    stones = [(7.5 + rng.uniform(-0.8, 0.8), 9.5, 5.6 + rng.uniform(-0.4, 0.6), 4.4 + rng.uniform(-0.3, 0.5))]
    if i % 2 == 0:
        stones.append((12.5, 12, 2.6, 2.0))
    else:
        stones.append((3.0, 12.2, 2.4, 1.8))
    for (sx, sy, rx, ry) in stones:
        for y in range(16):
            for x in range(16):
                dx, dy = (x + 0.5 - sx) / rx, (y + 0.5 - sy) / ry
                d = dx * dx + dy * dy
                facet = hsh(int((x - sx) // 3), int((y - sy) // 2), seed)
                if d <= 1.0 + (facet - 0.5) * 0.25:
                    lit = -(dx * -0.6 + dy * -0.8)
                    t = 0.5 + 0.4 * lit + (facet - 0.5) * 0.3
                    if dy > 0.55:
                        t -= 0.3
                    c.set(x, y, pick(r, t))
    # crack lines and a top-left glint
    for k in range(2):
        x, y = int(stones[0][0]) + rng.randrange(-2, 3), int(stones[0][1]) - 2
        for j in range(3):
            if c.get(x, y):
                c.set(x, y, r[1])
            x += rng.choice((-1, 0, 1))
            y += 1
    gx, gy = int(stones[0][0] - stones[0][2] * 0.45), int(stones[0][1] - stones[0][3] * 0.55)
    if c.get(gx, gy):
        c.set(gx, gy, r[-1])
    base = kind.rstrip("234")
    if base == "vale":
        for (x, y) in list((x, y) for y in range(16) for x in range(16) if c.get(x, y)):
            if c.get(x, y - 1) is None and hsh(x, y, seed) < 0.6:
                c.set(x, y, MOSS[3 if hsh(x, y, seed + 1) < 0.5 else 2])
                if hsh(x, y, seed + 2) < 0.4 and c.get(x, y + 1):
                    c.set(x, y + 1, MOSS[2])
    elif base == "snow":
        for (x, y) in list((x, y) for y in range(16) for x in range(16) if c.get(x, y)):
            if c.get(x, y - 1) is None:
                c.set(x, y, SNOW[4])
                if c.get(x, y + 1) and hsh(x, y, seed) < 0.7:
                    c.set(x, y + 1, SNOW[2])
    elif base == "cinder":
        x, y = int(stones[0][0]), int(stones[0][1]) - 3
        for j in range(5):
            if c.get(x, y):
                col = RED[3] if j % 2 == 0 else RED[2]
                c.set(x, y, col)
                if col == RED[3]:
                    em.set(x, y, col)
            x += (1 if j % 2 else 0)
            y += 1
    elif base == "town":
        # a cut face: a chisel line across the big stone
        y = int(stones[0][1])
        for x in range(16):
            if c.get(x, y) and c.get(x, y - 1):
                c.set(x, y, r[1])
    outline(c)
    # a dark dithered contact shadow so the stone sits in the ground, not on it
    for x in range(16):
        y = 15
        if c.get(x, y) is None and c.get(x, y - 1) and (x % 2 == 0):
            c.set(x, y, GROUND_DARK)
    return c, em


# --- town graves ------------------------------------------------------------------------------------------------------

GRAVE_KINDS = ["round", "cross", "obelisk", "candle"]
SLATE = ramp("#1a1a1c", "#2a2a2e", "#3a4048", "#4a4a50", "#6a6e78", "#8a9098", "#9aa8c0")
EARTH = ramp("#1a1008", "#2a1c14", "#3a2818", "#4a3424", "#5a4030")


def grave(kind: str, frame: int = 0) -> tuple[Canvas, Canvas]:
    """A town headstone on its plot, house scale: the stone is 10-13 px tall on a 16 px tile (a person is 30)."""
    c = Canvas(16, 32)
    em = Canvas(16, 32)
    seed = 700 + GRAVE_KINDS.index(kind) * 5
    # the plot: a low mound of turned earth, the tile's bottom rows
    for y in range(26, 31):
        for x in range(2, 14):
            if (x - 7.5) ** 2 / 36 + (y - 28.5) ** 2 / 6 <= 1:
                t = 0.7 - (y - 26) * 0.12 + (hsh(x, y, seed) - 0.5) * 0.4
                c.set(x, y, pick(EARTH, t))
    st = SLATE

    def slab(x0: int, y0: int, w: int, h: int, round_top: bool) -> None:
        for y in range(y0, y0 + h):
            for x in range(x0, x0 + w):
                if round_top and y < y0 + 2 and (x in (x0, x0 + w - 1) or (y == y0 and x in (x0 + 1, x0 + w - 2))):
                    continue
                side = (x - x0) / max(1, w - 1)
                t = 0.75 - 0.5 * side - (0.15 if y > y0 + h - 3 else 0)
                if hsh(x, y, seed) < 0.12:
                    t -= 0.25
                c.set(x, y, pick(st, t))

    if kind == "round":
        slab(4, 16, 8, 12, True)
        for y in (19, 21):
            for x in range(6, 10):
                c.set(x, y, st[1])
        c.set(7, 24, st[1])
    elif kind == "cross":
        slab(7, 14, 3, 14, False)
        slab(4, 17, 9, 3, False)
        c.set(8, 18, st[1])
    elif kind == "obelisk":
        for y in range(12, 28):
            w = 2 + (y - 12) // 4
            for x in range(8 - w // 2 - 1, 8 + (w + 1) // 2):
                side = (x - (8 - w // 2 - 1)) / max(1, w)
                c.set(x, y, pick(st, 0.75 - 0.55 * side))
        slab(4, 26, 8, 2, False)
        for (x, y) in [(7, 18), (8, 18), (7, 19)]:
            c.set(x, y, VIOLET[2])
    else:  # candle: a leaning headstone with a cold-fire candle at its foot
        slab(3, 17, 8, 11, True)
        for y in (20, 22):
            for x in range(5, 9):
                c.set(x, y, st[1])
        c.set(12, 27, "#e6dcc8")
        c.set(12, 26, "#e6dcc8")
        c.set(12, 28, "#c4b49a")
        flame = [(12, 25, BLUE[3]), (12, 24, BLUE[4] if frame == 0 else BLUE[3]), (12, 23 - frame, BLUE[2])]
        if frame == 0:
            flame.append((11, 24, BLUE[2]))
        else:
            flame.append((13, 24, BLUE[2]))
        for (x, y, col) in flame:
            c.set(x, y, col)
            if col in (BLUE[3], BLUE[4]):
                em.set(x, y, col)
    # moss creeping at the stone's foot, a pale lichen fleck
    for x in range(16):
        for y in range(24, 28):
            if c.get(x, y) in st and c.get(x, y + 1) in EARTH + (None,) and hsh(x, y, seed + 1) < 0.5:
                c.set(x, y, MOSS[2])
    outline(c)
    return c, em


# --- dungeon entrances -------------------------------------------------------------------------------------------------

ENTRANCE_KINDS = ["stairwell", "crypt", "barrow"]
MASON = ramp("#1a1418", "#2a2428", "#3a3438", "#4a4450", "#6a6660", "#8a867c", "#b7b2a6")
CRYPT = ramp("#140c10", "#241830", "#3a2844", "#4a3854", "#6a5878", "#9a8aa8")
TURF = ramp("#0e2418", "#142820", "#1e3428", "#2a4a28", "#3a6828")
HOLE = ramp("#060810", "#07060a", "#100c12", "#16161a")


def _brazier(c: Canvas, em: Canvas, x: int, y: int, frame: int) -> None:
    """A 5x9 iron brazier with a cold-blue fire on it."""
    iron = ("#1a1a1c", "#2a2a2e", "#4a4a50", "#6a6e78")
    for (dx, dy, col) in [(0, 5, iron[2]), (1, 5, iron[3]), (2, 5, iron[3]), (3, 5, iron[2]), (4, 5, iron[1]),
                          (1, 6, iron[1]), (2, 6, iron[2]), (3, 6, iron[1]), (2, 7, iron[1]), (2, 8, iron[2]),
                          (1, 8, iron[1]), (3, 8, iron[1])]:
        c.set(x + dx, y + dy, col)
    f = [[".3.", "343", "454", "345"], ["3..", "34.", "453", "345"]][frame]
    for j, row in enumerate(f):
        for i, ch in enumerate(row):
            if ch in "345":
                col = {"3": BLUE[2], "4": BLUE[3], "5": BLUE[4]}[ch]
                c.set(x + 1 + i, y + 1 + j, col)
                if ch in "45":
                    em.set(x + 1 + i, y + 1 + j, col)
    c.set(x + 2, y + (0 if frame == 0 else 1), BLUE[1])


def entrance(kind: str, frame: int) -> tuple[Canvas, Canvas]:
    """A 48x48 mouth standing over the stair tile (the cell's bottom-middle 16x16). The way in is the dark at its
    centre; the hero walks into it from the south, as before. Two flicker frames for the cold-fire braziers."""
    c = Canvas(48, 48)
    em = Canvas(48, 48)
    seed = 800 + ENTRANCE_KINDS.index(kind) * 9
    if kind == "stairwell":
        # a sunken stair: a stone rim around a 20x14 shaft, steps dropping north into the dark, two pillars
        for y in range(22, 47):
            for x in range(8, 40):
                d = max(abs(x + 0.5 - 24) / 16, abs(y + 0.5 - 35) / 12.5)
                if d <= 1:
                    t = 0.55 + (hsh(x // 3, y // 2, seed) - 0.5) * 0.5 - (0.25 if y > 44 else 0)
                    c.set(x, y, pick(MASON, t))
        # flagstone joints on the rim
        for y in range(22, 47):
            for x in range(8, 40):
                if c.get(x, y) and ((y - 22) % 5 == 0 or (x + (y // 5) * 3) % 7 == 0) and hsh(x, y, seed + 1) < 0.7:
                    c.set(x, y, MASON[1])
        # the shaft: steps descending north, black at the top where they fall away into the dark
        for y in range(28, 46):
            for x in range(15, 33):
                k = (y - 28)
                tone = min(5, k // 3)
                col = HOLE[0] if tone <= 0 else MASON[tone]
                if k % 3 == 0 and tone > 0:
                    col = MASON[min(6, tone + 1)]
                if k % 3 == 2 and tone > 0:
                    col = MASON[max(0, tone - 2)]
                c.set(x, y, col)
        for y in range(28, 46):
            c.set(15, y, MASON[1])
            c.set(32, y, MASON[2])
        # two pillars with braziers
        for px_ in (9, 35):
            for y in range(10, 44):
                for x in range(px_, px_ + 4):
                    side = (x - px_) / 3
                    t = 0.8 - 0.6 * side - (0.1 if y % 6 == 0 else 0)
                    c.set(x, y, pick(MASON, t))
            for x in range(px_ - 1, px_ + 5):
                c.set(x, 10, MASON[5])
                c.set(x, 43, MASON[2])
        _brazier(c, em, 9, 1, frame)
        _brazier(c, em, 34, 1, 1 - frame)
        # cold-blue runes on the lip
        for (x, y) in [(18, 25), (22, 24), (26, 25), (30, 24)]:
            c.set(x, y, BLUE[3])
            em.set(x, y, BLUE[3])
    elif kind == "crypt":
        # a carved crypt mouth: a gabled stone front, a skull keystone, black doorway, violet-lit
        for y in range(8, 47):
            for x in range(6, 42):
                gable = y >= 8 + abs(x + 0.5 - 24) * 0.55
                if gable:
                    t = 0.6 - 0.5 * ((x - 6) / 36) + (hsh(x // 4, y // 3, seed) - 0.5) * 0.4
                    c.set(x, y, pick(CRYPT, t))
        for y in range(8, 47):
            for x in range(6, 42):
                if c.get(x, y) and (y % 6 == 0 or (x + (y // 6) * 4) % 9 == 0):
                    c.set(x, y, CRYPT[1])
        # the doorway: a pointed arch, black, with steps at its foot
        for y in range(22, 47):
            for x in range(16, 32):
                arch = y >= 22 + abs(x + 0.5 - 24) ** 2 / 9
                if arch:
                    c.set(x, y, HOLE[0] if y < 40 else HOLE[1 + (y - 40) // 3])
        for y in range(40, 47, 2):
            for x in range(16, 32):
                c.set(x, y, CRYPT[2 + (y - 40) // 3] if y < 46 else CRYPT[4])
        for y in range(22, 47):
            for x in range(15, 33):
                if c.get(x, y) and c.get(x, y) not in HOLE and any(c.get(x + dx, y) in HOLE for dx in (-1, 1)):
                    c.set(x, y, CRYPT[4])
        # skull keystone
        for j, row in enumerate([".###.", "#####", "#.#.#", "#####", ".#.#."]):
            for i, ch in enumerate(row):
                if ch == "#":
                    c.set(22 + i, 15 + j, "#e6dcc8" if j < 3 else "#c4b49a")
                elif j == 2:
                    c.set(22 + i, 15 + j, VIOLET[3])
                    em.set(22 + i, 15 + j, VIOLET[3])
        # two cold-fire sconces either side of the door
        _brazier(c, em, 8, 24, frame)
        _brazier(c, em, 35, 24, 1 - frame)
        # a ribbon of blue cold fire low in the doorway, the way down
        for x in range(18, 30):
            if hsh(x, frame, seed) < 0.6:
                c.set(x, 38, BLUE[2])
            if hsh(x, frame + 3, seed) < 0.3:
                c.set(x, 37, BLUE[3])
                em.set(x, 37, BLUE[3])
    else:  # barrow: a grassy mound with a standing-stone arch over a black passage
        for y in range(6, 47):
            for x in range(1, 47):
                d = ((x + 0.5 - 24) / 23) ** 2 + ((y + 0.5 - 40) / 32) ** 2
                if d <= 1 and y >= 6:
                    lit = -((x - 24) / 23 * -0.6 + (y - 40) / 32 * -0.8)
                    t = 0.45 + 0.4 * lit + (hsh(x // 2, y // 2, seed) - 0.5) * 0.35
                    c.set(x, y, pick(TURF, t))
        # grass tufts on the mound's crown
        for x in range(4, 44):
            for y in range(6, 30):
                if c.get(x, y) and c.get(x, y - 1) is None and hsh(x, y, seed + 2) < 0.5:
                    c.set(x, y - 1, TURF[3])
        # the passage and its three stones (two uprights, a lintel)
        for y in range(26, 47):
            for x in range(17, 31):
                c.set(x, y, HOLE[0] if y < 42 else HOLE[min(3, 1 + (y - 42) // 2)])
        for (x0, y0, w, h) in [(12, 24, 5, 23), (31, 24, 5, 23), (11, 19, 26, 6)]:
            for y in range(y0, y0 + h):
                for x in range(x0, x0 + w):
                    side = (x - x0) / max(1, w - 1)
                    t = 0.8 - 0.55 * side + (hsh(x // 2, y // 3, seed + 4) - 0.5) * 0.3
                    if y == y0:
                        t += 0.15
                    c.set(x, y, pick(GRANITE, t))
        for (x, y) in [(14, 30), (14, 31), (15, 36), (33, 29), (33, 34), (34, 35)]:
            c.set(x, y, MOSS[3])
        # cold-blue spiral cut in the lintel, and two wisp lamps on the stones
        for (x, y) in [(21, 21), (22, 21), (23, 22), (24, 22), (25, 21), (26, 21)]:
            c.set(x, y, BLUE[3])
            em.set(x, y, BLUE[3])
        _brazier(c, em, 4, 30, frame)
        _brazier(c, em, 39, 30, 1 - frame)
    outline(c)
    return c, em


def opened_grave(frame: int) -> tuple[Canvas, Canvas]:
    """The town's Opened Grave (32x32 over 2x2 tiles): the stair tile is the bottom-right quarter. A broken lid shoved
    aside to the upper left, a tall headstone at the upper right, stone steps going down into the dark, and cold
    blue fire breathing up out of the shaft. It keeps clear of the three graves around it."""
    c = Canvas(32, 32)
    em = Canvas(32, 32)
    seed = 870
    # the cut: a stone-lined shaft over the stair tile
    for y in range(14, 32):
        for x in range(13, 31):
            edge = x in (13, 30) or y in (14, 31)
            c.set(x, y, MASON[3] if edge else MASON[2])
    for y in range(16, 31):
        k = y - 16
        step = k // 3
        tone = min(5, step + 1)
        col = HOLE[0] if step == 0 else MASON[tone]
        if k % 3 == 0 and step > 0:
            col = MASON[min(6, tone + 1)]
        for x in range(15, 29):
            c.set(x, y, col)
    for y in range(15, 31):
        c.set(14, y, MASON[1])
        c.set(29, y, MASON[4])
    # cold fire breathing up out of the dark
    for (x, y, k) in [(18, 16, 3), (19, 15, 4), (20, 16, 3), (23, 16, 2), (24, 15, 3), (25, 14 - frame, 4), (26, 16, 3),
                      (21, 17, 2), (22, 17, 3)]:
        col = BLUE[k]
        c.set(x, y - frame * (k == 4), col)
        if k >= 3:
            em.set(x, y - frame * (k == 4), col)
    # the broken lid, shoved aside up and left, a crack across it
    for y in range(8, 18):
        for x in range(1, 14):
            if x + (y - 8) * 0.3 < 14 and x > 1 + (y - 8) * 0.2:
                t = 0.7 - 0.4 * (y - 8) / 10 + (hsh(x // 2, y // 2, seed) - 0.5) * 0.3
                c.set(x, y, pick(SLATE, t))
    for i in range(6):
        c.set(5 + i, 11 + i // 2, SLATE[1])
    for (x, y) in [(3, 9), (4, 9), (9, 10)]:
        c.set(x, y, "#9aa8c0")
    # the headstone behind the shaft, a skull carved in it
    for y in range(1, 15):
        for x in range(18, 27):
            if y < 3 and x in (18, 26):
                continue
            if y == 1 and x in (19, 25):
                continue
            side = (x - 18) / 8
            t = 0.75 - 0.5 * side + (hsh(x, y, seed + 1) - 0.5) * 0.25
            c.set(x, y, pick(SLATE, t))
    for j, row in enumerate([".###.", "#.#.#", "#####", ".#.#."]):
        for i, ch in enumerate(row):
            if ch == "#":
                c.set(20 + i, 4 + j, "#c4b49a")
            elif j == 1:
                c.set(20 + i, 4 + j, BLUE[3])
                em.set(20 + i, 4 + j, BLUE[3])
    # loose earth heaped at the cut's left and foot
    for (x, y) in [(12, 20), (11, 21), (12, 22), (11, 23), (12, 24), (10, 22), (13, 31), (12, 30)]:
        c.set(x, y, EARTH[2 + (x + y) % 2])
    outline(c)
    return c, em


def stairs(kind: str) -> Canvas:
    """A dungeon floor stair (16x16): 'down' steps fall away north into the dark, 'up' steps climb into a pale light."""
    c = Canvas(16, 16)
    for y in range(16):
        for x in range(16):
            edge = x in (0, 15) or y in (0, 15)
            c.set(x, y, MASON[1] if edge else MASON[2])
    for y in range(1, 15):
        k = y - 1
        step = k // 3
        if kind == "down":
            tone = min(5, step + 1)
            col = HOLE[0] if step == 0 else MASON[tone]
        else:
            tone = max(1, 5 - step)
            col = MASON[tone]
        if k % 3 == 0 and step > 0:
            col = MASON[min(6, tone + 1)]
        for x in range(2, 14):
            c.set(x, y, col)
    for y in range(1, 15):
        c.set(1, y, MASON[1])
        c.set(14, y, MASON[3])
    if kind == "up":
        for (x, y) in [(5, 1), (8, 1), (11, 1)]:
            c.set(x, y, BLUE[4])
    else:
        for (x, y) in [(6, 2), (9, 2)]:
            c.set(x, y, BLUE[2])
    return c


# --- wrapping ground textures (64x64, sampled by world position) -------------------------------------------------------

TEX = 128  # every wrapping sheet is 128x128: 8x8 tiles before it repeats


def sheet(kind: str, frame: int = 0) -> Canvas:
    c = Canvas(TEX, TEX)
    P = TEX
    rng = random.Random({"water": 31, "water-town": 32, "ice": 43, "snow": 51, "ash": 61, "sand": 71, "swamp": 81}[kind])
    if kind in ("water", "water-town"):
        if kind == "water":
            r = ramp("#0c2030", "#16304a", "#1a3848", "#2a4060", "#3a78a0")
            lit = ramp("#7aa4b4", "#d5e8f2")
        else:
            # the town's water: the vale's deep blue taken toward the town's violet dusk, so it still reads as water
            # (the first cut, near-black violet, read as a hole in the ground)
            r = ramp("#16304a", "#1c3048", "#2a3a6a", "#2a4060", "#3a4a88")
            lit = ramp("#7a5ad0", "#c9a0e8")
        for y in range(P):
            for x in range(P):
                n = fbm(x, y, P, 21)
                swell = 0.5 + 0.5 * math.sin((y + 2.5 * math.sin((x + frame * 4) * 2 * math.pi / 32) + frame) * 2 * math.pi / 16)
                t = 0.15 + 0.5 * n + 0.3 * swell
                c.set(x, y, r[tone(t, x, y, len(r) - 1)])
        # ripple strokes along the swell crests, sliding with the frame
        for k in range(64):
            x0, y0 = rng.randrange(P), rng.randrange(P)
            L = 3 + rng.randrange(4)
            for i in range(L):
                x = (x0 + i + frame * 2) % P
                y = (y0 + (1 if i in (0, L - 1) else 0)) % P
                c.set(x, y, lit[1] if (k % 5 == 0 and 0 < i < L - 1) else lit[0])
        for k in range(20):
            x, y = rng.randrange(P), rng.randrange(P)
            if (k + frame) % 2 == 0:
                c.set(x, y, BLUE[3] if kind == "water" else VIOLET[3])
    elif kind == "ice":
        r = ramp("#9ec4d4", "#b7d2e0", "#c5dde8", "#d5e8f2", "#e8f2f8")
        for y in range(P):
            for x in range(P):
                n = fbm(x, y, P, 41)
                c.set(x, y, r[tone(0.1 + 0.85 * n, x, y, len(r))])
        # long cracks, each with a pale lip on its upper side
        for k in range(16):
            x, y = rng.randrange(P), rng.randrange(P)
            dx = rng.choice((-1, 1))
            for i in range(18 + rng.randrange(12)):
                c.set(x % P, y % P, "#5a8aa0" if i % 6 else "#3a78a0")
                c.set(x % P, (y - 1) % P, "#f4fbff")
                x += dx if hsh(i, k, 44) < 0.65 else 0
                y += 1 if hsh(i, k, 45) < 0.55 else 0
        # deep blue streaks frozen under the surface
        for k in range(20):
            x, y = rng.randrange(P), rng.randrange(P)
            for i in range(6 + rng.randrange(5)):
                c.set((x + i) % P, (y + i // 3) % P, "#7aa4b8")
        for k in range(24):
            x, y = rng.randrange(P), rng.randrange(P)
            if (k + frame) % 3 == 0:
                c.set(x, y, BLUE[4])
                c.set((x + 1) % P, y, "#f7fbff")
                c.set(x, (y - 1) % P, "#f7fbff")
    else:
        spec = {
            "snow": (ramp("#b7d2e0", "#c5d8e6", "#d7e6f0", "#e8f2f8"), 51),
            "ash": (ramp("#1a1612", "#2a221c", "#3a322c", "#4a4038"), 61),
            "sand": (ramp("#a89470", "#b6a47c", "#cbb892", "#d8c4a0"), 71),
            "swamp": (ramp("#0e2418", "#142820", "#1a2c22", "#24382c"), 81),
        }[kind]
        r, s = spec
        for y in range(P):
            for x in range(P):
                n = fbm(x, y, P, s)
                c.set(x, y, r[tone(0.05 + 0.9 * n, x, y, len(r))])
        if kind == "snow":
            # wind-carved ripples (a shadowed crescent with a bright crest), sparkle, a rare cold glint
            for k in range(88):
                x0, y0 = rng.randrange(P), rng.randrange(P)
                for i in range(6):
                    c.set((x0 + i) % P, (y0 + (1 if i in (0, 5) else 0)) % P, "#9ec4d4" if 0 < i < 5 else "#b7d2e0")
                    if 0 < i < 5:
                        c.set((x0 + i) % P, (y0 - 1) % P, "#f7fbff")
            for k in range(96):
                c.set(rng.randrange(P), rng.randrange(P), "#ffffff")
            for k in range(12):
                c.set(rng.randrange(P), rng.randrange(P), BLUE[4])
        elif kind == "ash":
            # cinders, charcoal twigs, pale ash flecks, ember coals and a cracked crust
            for k in range(120):
                x, y = rng.randrange(P), rng.randrange(P)
                c.set(x, y, "#120c10")
                if k % 3 == 0:
                    c.set((x + 1) % P, y, "#120c10")
                    c.set(x, (y - 1) % P, "#5a4a40")
            for k in range(40):
                x, y = rng.randrange(P), rng.randrange(P)
                for i in range(4):
                    c.set((x + i) % P, (y + (i == 3)) % P, "#140c10")
            for k in range(56):
                x, y = rng.randrange(P), rng.randrange(P)
                c.set(x, y, "#6a6660" if k % 2 else "#5a564e")
            for k in range(40):
                x, y = rng.randrange(P), rng.randrange(P)
                c.set(x, y, RED[3] if k % 3 == 0 else RED[2])
                c.set((x + 1) % P, y, RED[1])
            for k in range(20):
                x, y = rng.randrange(P), rng.randrange(P)
                for i in range(9):
                    c.set(x % P, y % P, "#120c10")
                    c.set(x % P, (y + 1) % P, "#4a4038")
                    x += rng.choice((1, 1, 0))
                    y += rng.choice((1, 0, -1))
        elif kind == "sand":
            # soft dune ripples: short shadowed arcs, not stripes; pebbles and dry tufts
            for k in range(104):
                x0, y0 = rng.randrange(P), rng.randrange(P)
                for i in range(7):
                    c.set((x0 + i) % P, (y0 + (1 if i in (0, 6) else 0)) % P, "#8a7048" if 0 < i < 6 else "#a89470")
                    if 1 < i < 5:
                        c.set((x0 + i) % P, (y0 - 1) % P, "#e6d6b0")
            for k in range(80):
                x, y = rng.randrange(P), rng.randrange(P)
                c.set(x, y, "#6a5038")
                c.set((x + 1) % P, y, "#8a7a64")
            for k in range(28):
                x, y = rng.randrange(P), rng.randrange(P)
                for (dx, dy) in [(0, 0), (-1, -1), (1, -1), (0, -2)]:
                    c.set((x + dx) % P, (y + dy) % P, "#8a6848")
        elif kind == "swamp":
            # mud puddles with a sky glint, reeds, and a few marsh-lights
            for k in range(40):
                x, y = rng.randrange(P), rng.randrange(P)
                for j in range(3):
                    for i in range(6 - abs(j - 1) * 2):
                        c.set((x + i + abs(j - 1)) % P, (y + j) % P, "#16304a" if j else "#0c2030")
                c.set((x + 2) % P, (y + 1) % P, "#3a78a0")
            for k in range(120):
                x, y = rng.randrange(P), rng.randrange(P)
                h = 2 + rng.randrange(3)
                for i in range(h):
                    c.set(x, (y - i) % P, "#3a6828" if i else "#1e3428")
                if k % 5 == 0:
                    c.set(x, (y - h) % P, "#6aaa48")
            for k in range(12):
                c.set(rng.randrange(P), rng.randrange(P), BLUE[3])
    return c


# --- shore rims --------------------------------------------------------------------------------------------------------

SHORE_SIDES = ["n", "e", "s", "w", "ne", "se", "sw", "nw"]  # the last four: inner corners (land only diagonally)
SHORE_KINDS = ["bank", "stone", "snowbank"]


def shore(kind: str, side: str) -> Canvas:
    """A 16x16 rim drawn over a water or ice tile on the side that meets dry ground. Transparent elsewhere, so the
    wrapping water shows through; a ragged edge, never a straight tile line."""
    c = Canvas(16, 16)
    if kind == "bank":
        lip, face, wet, foam = ramp("#1a2818", "#2a4a28", "#3a6828"), ramp("#2a1c14", "#3a2818", "#4a3424"), "#0c2030", "#7aa4b4"
    elif kind == "stone":
        lip, face, wet, foam = ramp("#3a3028", "#6a6660", "#8a867c", "#b7b2a6"), ramp("#2a221c", "#3a3028", "#4a4450"), "#100c12", "#4a2a78"
    else:
        lip, face, wet, foam = ramp("#b7d2e0", "#d7e6f0", "#f7fbff"), ramp("#5a6878", "#8aa4b0", "#9ec4d4"), "#3a78a0", "#f4fbff"
    seed = 900 + SHORE_KINDS.index(kind) * 11 + SHORE_SIDES.index(side)

    def depth_at(i: int, base: int) -> int:
        return base + int(hsh(i // 2, 0, seed) * 2.4)

    if len(side) == 1:
        for i in range(16):
            if side == "n":
                d = depth_at(i, 3)
                for j in range(d):
                    col = lip[min(len(lip) - 1, 1 + (j == 0))] if j < 2 else face[min(len(face) - 1, j - 2)]
                    if kind == "stone":
                        col = lip[-1] if j == 0 else lip[2] if j == 1 else face[1]
                    c.set(i, j, col)
                c.set(i, d, wet)
                if hsh(i, 1, seed) < 0.3:
                    c.set(i, d + 1, wet)
            elif side == "s":
                d = depth_at(i, 1)
                for j in range(d):
                    c.set(i, 15 - j, lip[1] if kind != "stone" else lip[1 + (j == 0)])
                c.set(i, 15 - d, foam if (i + seed) % 3 else lip[-1])
            else:
                d = depth_at(i, 2)
                for j in range(d):
                    x = j if side == "w" else 15 - j
                    c.set(x, i, lip[1 + (j == 0) if len(lip) > 2 else 1] if j < 2 else face[1])
                x = d if side == "w" else 15 - d
                c.set(x, i, wet if side == "w" else foam if hsh(i, 2, seed) < 0.4 else wet)
    else:
        fx = side[1] == "e"
        fy = side[0] == "s"
        for y in range(4):
            for x in range(4):
                if x + y <= 3 - (hsh(x, y, seed) < 0.3):
                    c.set(15 - x if fx else x, 15 - y if fy else y, lip[1] if x + y < 3 else face[1])
    return c


# --- town pumpkins ------------------------------------------------------------------------------------------------------

RIND = ramp("#3a1810", "#8a3a18", "#c45a18", "#e07a2f", "#e0a040")
STEM = ramp("#1a2414", "#2a4a20", "#3a6828")
FLAME = ("#e0a040", "#f4e27a", "#fff8e0")


def pumpkin(big: bool, frame: int = 0) -> tuple[Canvas, Canvas]:
    n = 32 if big else 16
    c = Canvas(n, n)
    em = Canvas(n, n)
    cx, cy = (16, 21) if big else (8, 11)
    rx, ry = (12, 9) if big else (6, 4.6)
    ribs = 5 if big else 3
    for y in range(n):
        for x in range(n):
            dx, dy = (x + 0.5 - cx) / rx, (y + 0.5 - cy) / ry
            if dx * dx + dy * dy <= 1:
                rib = abs(math.sin((x + 0.5 - cx) / rx * math.pi * ribs / 2))
                t = 0.62 - 0.35 * dx - 0.3 * dy - 0.35 * (1 - rib) * 0.9
                c.set(x, y, pick(RIND, t))
    sx = cx - 1
    for y in range(cy - int(ry) - (4 if big else 2), cy - int(ry) + 1):
        c.set(sx, y, STEM[1])
        c.set(sx + 1, y, STEM[2] if big else STEM[1])
    if big:
        c.set(sx + 2, cy - int(ry) - 4, STEM[2])
        c.set(sx + 3, cy - int(ry) - 5, STEM[1])
    # the carved face
    face = (["..........", ".##....##.", "###....###", "....##....", "##########", ".#.####.#.", "...#..#..."] if big
            else [".#..#.", "##..##", "......", "######", ".#..#."])
    ox, oy = (cx - 5, cy - 4) if big else (cx - 3, cy - 2)
    for j, row in enumerate(face):
        for i, ch in enumerate(row):
            if ch == "#":
                col = FLAME[1] if (i + j + frame) % 3 else FLAME[2]
                if j == len(face) - 1 or (big and j == 0):
                    col = FLAME[0]
                c.set(ox + i, oy + j, col)
                em.set(ox + i, oy + j, col)
    outline(c)
    return c, em


AURA_FRAMES = 4


def boss_aura(frame: int) -> tuple[Canvas, Canvas]:
    """playtest1c: a boss's ground ring of cold fire, 32x16, laid under its feet (bosses draw at the people's scale now,
    not doubled). A dashed ellipse of blue and violet that turns a quarter step a frame, with flame tongues licking up
    off the ring. Four frames."""
    c = Canvas(32, 16)
    em = Canvas(32, 16)
    blue = NEON["blue"]
    violet = NEON["violet"]
    cx, cy, rx, ry = 15.5, 10.5, 13.0, 3.6
    steps = 72
    for k in range(steps):
        a = 2 * math.pi * k / steps
        x = int(round(cx + rx * math.cos(a)))
        y = int(round(cy + ry * math.sin(a)))
        seg = (k + frame * 3) % 12
        if seg >= 9:
            continue  # the gaps that make it turn
        front = math.sin(a) > 0
        col = (blue[3] if seg % 3 else blue[4]) if (k // 12) % 2 == 0 else (violet[3] if seg % 3 else violet[4])
        if not front:
            col = blue[2] if (k // 12) % 2 == 0 else violet[2]
        c.set(x, y, col)
        if front and seg % 3 == 0:
            em.set(x, y, col)
    # inner dark glow ring (the shadow of the fire on the ground)
    for k in range(steps):
        a = 2 * math.pi * k / steps
        x = int(round(cx + (rx - 2) * math.cos(a)))
        y = int(round(cy + (ry - 1.2) * math.sin(a)))
        if (k + frame * 2) % 6 == 0 and c.get(x, y) is None:
            c.set(x, y, blue[1])
    # flame tongues: six around the ring, each rising and falling with the frame
    for j in range(6):
        a = 2 * math.pi * (j / 6 + frame / (6 * AURA_FRAMES))
        x = int(round(cx + rx * math.cos(a)))
        y = int(round(cy + ry * math.sin(a)))
        h = 1 + (j + frame) % 3
        ramp_ = blue if j % 2 == 0 else violet
        for t in range(1, h + 1):
            col = ramp_[5] if t == h else ramp_[4]
            if 0 <= y - t < 16:
                c.set(x, y - t, col)
                em.set(x, y - t, col)
    return c, em


BORDER_KINDS = ["n", "e", "s", "w"]


def drift_mask(kind: str, v: int) -> Canvas:
    """playtest1c (owner-reported 2026-10-02, "the jagged hedge band" where the vale meets the snow): a softer fringe
    mask in border-dither's twelve-cell layout (bands n e s w, a second variant of each, then corner nooks ne se sw nw).
    Only the alpha is read. Where border-dither was a 2-4 px saw edge (one column up, the next down), a band here is a
    rounded drift: 4 px solid at both ends (so neighbouring masks meet), swelling to 7 px in smooth bulges, then three
    rows of thinning dither and a few loose flecks out to 11 px, so the neighbour's ground drifts in instead of
    standing in a toothed wall. A nook is a rounded quarter (radius 6) with the same dithered fade. Four more cells
    (12-15, "xne" "xse" "xsw" "xnw") round a convex corner where two bands meet."""
    ink = INK
    c = Canvas(16, 16)
    if kind.startswith("x"):
        # a convex corner (the neighbour's ground on two sides at once): fill the square corner the two bands leave,
        # out to a rounded edge (radius 6 past the 4 px bands), so a tile step reads as a curve
        fx = kind[2] == "e"
        fy = kind[1] == "s"
        cc = 10
        for y in range(16):
            for x in range(16):
                a = 15 - x if fx else x
                b = 15 - y if fy else y
                if a >= cc or b >= cc:
                    continue
                d = math.hypot(cc - a - 0.5, cc - b - 0.5)
                clump = hsh(x // 2, y // 2, 9800 + "nesw".index(kind[2]) + 3 * "nesw".index(kind[1]))
                if d > cc - 4 or (d > cc - 5.5 and clump < 0.6) or (d > cc - 7 and clump < 0.3):
                    c.set(x, y, ink)
        return c
    if len(kind) == 2:
        fx = kind[1] == "e"
        fy = kind[0] == "s"
        for y in range(16):
            for x in range(16):
                dx = 15 - x if fx else x
                dy = 15 - y if fy else y
                d = math.hypot(dx + 0.5, dy + 0.5)
                clump = hsh(x // 2, y // 2, 9790 + len(kind) + "nesw".index(kind[1]))
                if d <= 5.5 or (d <= 7 and clump < 0.6) or (d <= 8.5 and clump < 0.3):
                    c.set(x, y, ink)
        return c
    seed = 9700 + BORDER_KINDS.index(kind) * 7 + v * 53
    # a smooth depth profile: 4 at both ends, one or two rounded bulges in between
    bulges = [(4 + (seed % 5), 2.6 + (seed % 3)), (11 - (seed // 7) % 4, 2.2 + (seed // 3) % 2)] if v == 0 else [(7 + (seed % 3), 3.4)]
    depth = []
    for col in range(16):
        d = 4.0
        for (bc, h) in bulges:
            d += h * max(0.0, 1 - ((col - bc) / 3.6) ** 2)
        if col in (0, 15):
            d = 4.0
        depth.append(min(7.0, d))
    for col in range(16):
        for r in range(16):
            dd = r - depth[col]
            x, y = {"n": (col, r), "s": (col, 15 - r), "w": (r, col), "e": (15 - r, col)}[kind]
            # clumps, not a checker: a 2x2 cell rolls once, so the edge breaks into drifts and clods instead of teeth
            clump = hsh(x // 2, y // 2, seed)
            on = dd < 0 or (dd < 1.5 and clump < 0.7) or (dd < 3 and clump < 0.38) or (dd < 4.5 and clump < 0.12)
            if on:
                c.set(x, y, ink)
    return c


FLECK_BIOMES = ["snow", "sand", "ash", "swamp"]
FLECK_COLORS = {
    "snow": ("#8aa4b0", "#b7d2e0", "#d7e6f0", "#f7fbff"),
    "sand": ("#8a7048", "#a89470", "#cbb892", "#d8c4a0"),
    "ash": ("#1a1612", "#2a221c", "#3a322c", "#e07a2f"),
    "swamp": ("#0e2418", "#142820", "#24382c", "#4a8a58"),
}


def flecks(biome: str, side: str) -> Canvas:
    """playtest1c: the neighbour biome scattered over the near half of a fringed vale tile (frost and snow crumbs by the
    snow, grit by the waste, soot and the odd ember by the cinders, wet mud by the swamp), thinning to nothing, so the
    meeting of two grounds fades over a tile instead of stopping at the fringe's edge. 16x16, drawn over the fringe."""
    c = Canvas(16, 16)
    cols = FLECK_COLORS[biome]
    seed = 9900 + FLECK_BIOMES.index(biome) * 17 + "nesw".index(side)
    for y in range(16):
        for x in range(16):
            r = {"n": y, "s": 15 - y, "w": x, "e": 15 - x}[side]
            p = max(0.0, 0.34 - r * 0.034)
            h = hsh(x, y, seed)
            if h < p:
                col = cols[1] if h < p * 0.45 else cols[2] if h < p * 0.85 else cols[3 if biome != "ash" or h > p * 0.97 else 0]
                c.set(x, y, col)
                # a crumb is sometimes two pixels, the lower one in shade
                if hsh(x, y, seed + 1) < 0.35 and y + 1 < 16:
                    c.set(x, y + 1, cols[0])
    return c
