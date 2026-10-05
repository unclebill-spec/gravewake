"""playtest1t [OWNER-APPROVED 2026-10-04 14:09 ET: playtest1t varied buildings] (Bill, 2026-10-04 14:09 ET: "draw a
variety of buildings so all of them don't look exactly the same, but make sure the buildings fit the world and
surroundings"): every town building drawn by code, to its own lot.

Until playtest1s the town's 15 wall blocks drew four sheets (a log cabin on ten of them, three stone houses, two slate
ones), 64-80 px wide on lots 48-144 px wide, so most lots were part grass that stopped you. Here every room's lot (the
wall block split per door, src/game/buildings.ts townLots) has its own sheet, town-bldg-<room>.png: one row per variant
(two or three each), one column per season (autumn, winter, spring, summer: fallen leaves, snow on the roofs and sills
with icicles, spring flowers and fresh moss, summer ivy), each cell exactly the lot's width (lot w x 16) and the lot's
height plus its headroom (the room up to the next building's roof limit, so no roof is ever cut), standing on the lot's
south edge with its door on the door tile. The glow mask (_em) holds only the lit panes, lamps, neon and embers.

Each variant keeps its room's 1i interior style (interiors.ts ROOM_STYLE): a cabin room is timber outside (logs, dark
boards, a stave chapel on a fieldstone base), a stone room fieldstone or ashlar, a slate room blue weatherboards, so the
outside always matches the inside. Same rules as wild_writer and town_writer: the snapped Canvas (every colour on palette
v3), one colour per pixel, hard alpha, a 1 px ink outline, no image generators. Gloom and glow: dark walls, lit windows,
lanterns in neon blue cold fire, violet and red accents; Bill's red toadstools with white spots, mushrooms and gnomes
where they fit.
"""
from __future__ import annotations

from wild_writer import (  # noqa: F401
    BARK, BLUE, DRIFT, EARTH, INK, MASON, MOSS, SNOW, TURF, Canvas, fbm, hsh, outline, pick, ramp, snap,
)
from palette_locked import NEON  # noqa: E402

TAG = "[OWNER-APPROVED 2026-10-04 14:09 ET: playtest1t varied buildings]"
SEASONS = ["autumn", "winter", "spring", "summer"]

# ---- the lots: room -> (lot w, lot h in tiles, door column in the lot, headroom px, interior style). The game measures
# the same numbers from the town grid (buildings.ts townLots / lotHead); group playtest1t holds the two equal.
LOTS = {
    "inn": (8, 5, 3, 32, "cabin"), "shop": (6, 5, 2, 32, "cabin"), "guild": (7, 5, 6, 32, "cabin"), "bank": (5, 5, 1, 32, "stone"),
    "bram": (6, 4, 2, 14, "stone"), "pell": (6, 4, 2, 14, "cabin"), "ivy": (6, 4, 2, 14, "cabin"),
    "chapel": (8, 5, 3, 46, "cabin"), "casino": (7, 5, 3, 46, "cabin"), "smith": (6, 5, 2, 48, "cabin"), "fisher": (3, 4, 1, 22, "slate"),
    "tailor": (7, 5, 3, 30, "cabin"), "noll": (6, 5, 2, 40, "slate"), "croft": (3, 4, 1, 30, "slate"), "alchemy": (7, 5, 3, 30, "cabin"),
    "mystic": (5, 5, 1, 30, "stone"),
}

TIMBER = ramp("#140c10", "#1a1008", "#2a1c14", "#3a2818", "#4a3424", "#5a4030")
LOGS = BARK
GREYLOG = ramp("#1a1612", "#2a2824", "#3a3a34", "#4a4a40", "#5a564e", "#6a6a58")
FIELD = ramp("#1a1418", "#2a2428", "#3a3438", "#4a4450", "#5a564e", "#6a6660", "#8a867c")
ASHLAR = ramp("#1a1a1c", "#2a2a2e", "#3a4048", "#4a4a50", "#5a5e64", "#6a6e78", "#8a9098")
BLUEB = ramp("#0e1a28", "#16304a", "#1c3048", "#2a4060", "#3a4a68", "#4a5a78", "#6a7a90")
ROOFS = {
    "shingle": ramp("#140c10", "#1a1008", "#2a1c14", "#3a2818", "#4a3424", "#5a4030", "#6a5040"),
    "redshingle": ramp("#140c10", "#2a1018", "#3a1a1a", "#4a2424", "#5a3030", "#6a3838", "#8a4038"),
    "slate": ramp("#0c1018", "#16161a", "#1a1a1c", "#2a2a2e", "#3a4048", "#4a4a50", "#5a5e64"),
    "violet": ramp("#140810", "#1a1430", "#241848", "#2a2040", "#3a2a44", "#4a3a60", "#6a5878"),
    "thatch": ramp("#2a2018", "#3a3018", "#5a4824", "#6a5830", "#8a7048", "#a08860", "#c4a15a"),
    "moss": ramp("#102018", "#142018", "#1e3428", "#2a4a28", "#3a6828", "#5a7a28"),
    "teal": ramp("#0c2030", "#102818", "#163028", "#1e3a32", "#2a4a38", "#3a6858"),
}
WALLS = {"redboards": ramp("#140c10", "#2a1018", "#3a1a1a", "#4a2424", "#5a3030", "#6a3838"), "logs": LOGS, "greylogs": GREYLOG, "boards": TIMBER, "field": FIELD, "ashlar": ASHLAR, "blue": BLUEB}
AMBER = ramp("#8a6848", "#c4a15a", "#e0a040", "#f4e27a", "#fff8e0")
GLOWS = {
    "amber": AMBER,
    "blue": ramp("#16304a", "#2a3a6a", "#3a6ad0", "#4ab8ff", "#9ae4ff"),
    "violet": ramp("#241848", "#4a2a78", "#7a5ad0", "#b07aff", "#c9a0e8"),
    "red": ramp("#2a1018", "#6a2030", "#c43838", "#ff3a50", "#ffd0d0"),
    "green": ramp("#1a2414", "#2a4a20", "#3a6828", "#6aaa48", "#c8e080"),
}
RED_CAP = ramp("#6a1020", "#a02030", "#c43838", "#ff3a50")
SPOT = "#f4f0e8"
STEM = ramp("#8a7a64", "#c4b49a", "#e6dcc8")
LEAF = {"autumn": ("#e07a2f", "#c45a18", "#e0a040", "#8a3a18"), "spring": ("#e8c0d0", "#f4f0e8", "#c9a0e8", "#f4e27a"),
        "summer": ("#3a6828", "#5a7a28", "#6aaa48", "#f4e27a"), "winter": ("#e8f2f8", "#f7fbff", "#d5e8f2", "#b7d2e0")}
IVY = {"autumn": ramp("#3a1810", "#8a3a18", "#c45a18", "#e07a2f"), "winter": ramp("#2a2420", "#3a3428", "#4a4038"),
       "spring": ramp("#142018", "#2a4a28", "#3a6828", "#6aaa48"), "summer": ramp("#102818", "#1e4634", "#2a6828", "#3a8a40")}


class B:
    """One building being drawn: the art, its glow mask, and the masks the season pass reads."""

    def __init__(self, w: int, h: int, seed: int):
        self.c, self.em = Canvas(w, h), Canvas(w, h)
        self.w, self.h, self.seed = w, h, seed
        self.roof: set = set()
        self.ledge: set = set()
        self.glow: set = set()
        self.rline: set = set()
        self.walls: dict = {}  # pixels painted per wall material, for the interior-style match
        self.base = h - 1

    def set(self, x, y, col, glow=False):
        if 0 <= x < self.w and 0 <= y < self.h:
            self.c.set(x, y, col)
            if glow:
                self.em.set(x, y, col)
                self.glow.add((x, y))
            elif (x, y) in self.glow:
                self.glow.discard((x, y))
                self.em.p[y][x] = None

    def get(self, x, y):
        return self.c.get(x, y)


def _cl(t):
    return max(0.0, min(1.0, t))


def poly(pts, fn):
    """Scanline fill of a polygon (pixel centres inside), calling fn(x, y) per pixel."""
    ys = [p[1] for p in pts]
    for y in range(int(min(ys)), int(max(ys)) + 1):
        yc = y + 0.5
        xs = []
        n = len(pts)
        for i in range(n):
            (x0, y0), (x1, y1) = pts[i], pts[(i + 1) % n]
            if (y0 <= yc < y1) or (y1 <= yc < y0):
                xs.append(x0 + (yc - y0) * (x1 - x0) / (y1 - y0))
        xs.sort()
        for a, b in zip(xs[::2], xs[1::2]):
            for x in range(int(round(a)), int(round(b))):
                fn(x, y)


# ---- materials -----------------------------------------------------------------------------------------------------
def wall_px(b: B, x, y, x0, x1, top, kind, lit=0.0):
    r = WALLS[kind]
    b.walls[kind] = b.walls.get(kind, 0) + 1
    lx, ly = x - x0, b.base - y
    s = b.seed
    t = 0.5 + lit + (fbm(x * 4.0, y * 4.0, 256, s) - 0.5) * 0.22
    if kind in ("logs", "greylogs"):
        k = ly % 5
        t = [0.18, 0.42, 0.55, 0.7, 0.62][k] + lit + (fbm(x * 3.0, y * 7.0, 256, s) - 0.5) * 0.25
        if lx < 3 or x1 - x < 3:  # cut log ends at the corners
            t = [0.2, 0.75, 0.9, 0.8, 0.5][k]
        elif hsh(lx // 7, ly // 5, s) > 0.86 and k in (2, 3):
            t -= 0.25  # a knot
    elif kind in ("boards", "redboards"):
        if lx % 5 == 0:
            t = 0.08
        elif lx % 5 == 1:
            t += 0.16
        if hsh(lx // 5, ly // 9, s) > 0.82 and ly % 9 == 0:
            t = 0.1
    elif kind == "blue":
        k = ly % 4  # weatherboards, each lap's lower edge dark
        t = [0.15, 0.62, 0.55, 0.45][k] + lit + (fbm(x * 5.0, y * 2.0, 256, s) - 0.5) * 0.3
        if hsh(lx // 9, ly // 4, s) > 0.9:
            t -= 0.2  # a rotten board
    elif kind == "field":
        # irregular fieldstones: cells of a jittered grid, mortar between, each stone its own tone
        cy = (ly + int(hsh(lx // 6, 0, s) * 3)) // 5
        cx = (lx + (cy % 2) * 3 + int(hsh(cy, 1, s) * 4)) // 7
        jx = (lx + (cy % 2) * 3 + int(hsh(cy, 1, s) * 4)) % 7
        jy = (ly + int(hsh(lx // 6, 0, s) * 3)) % 5
        if jx == 0 or jy == 0:
            t = 0.08
        else:
            t = 0.35 + hsh(cx, cy, s + 3) * 0.4 + lit + (0.12 if jy == 4 else 0) - (0.1 if jx == 6 else 0)
    elif kind == "ashlar":
        course = ly // 6
        if ly % 6 == 0 or (lx + (course % 2) * 6) % 12 == 0:
            t = 0.1
        else:
            t = 0.5 + hsh((lx + (course % 2) * 6) // 12, course, s) * 0.2 + lit + (0.12 if ly % 6 == 5 else 0)
    b.set(x, y, pick(r, _cl(t)))


def roof_px(b: B, x, y, top, kind, lit, row=3):
    """One roof pixel: courses of shingles (or slates) with a lit top edge, a shadowed bottom edge and staggered joints,
    each shingle its own small tone; thatch is combed straw with ragged course edges. Clean, not noisy."""
    r = ROOFS[kind]
    s = b.seed
    ly = y - top
    rowi, k = ly // row, ly % row
    if kind == "thatch":
        t = 0.52 + lit + (hsh(x, rowi, s) - 0.5) * 0.22
        if k == row - 1 and hsh(x, rowi, s + 1) > 0.3:
            t -= 0.3
            b.rline.add((x, y))
        elif k == 0:
            t += 0.1
    else:
        sw = 6 if kind in ("slate", "violet", "teal") else 4
        off = (rowi % 2) * (sw // 2)
        sid = (x + off) // sw
        t = 0.5 + lit + (hsh(sid, rowi, s) - 0.5) * 0.2
        if k == row - 1:
            t -= 0.3
            b.rline.add((x, y))
        elif (x + off) % sw == 0:
            t -= 0.16
        elif k == 0:
            t += 0.12
        if kind in ("shingle", "redshingle") and hsh(sid, rowi, s + 5) > 0.975:
            t = 0.02  # a missing shingle
    col = pick(r, _cl(t))
    b.set(x, y, col)
    b.roof.add((x, y))


def lightness(x, cx):
    return 0.08 if x < cx else -0.1


def P(b: B, fn, *args, **kw):
    """Draw one part (a roof, the walls, a tower, a dormer, a chimney, a porch) on its own layer, ink-outline it, then
    lay it over the building, so every part reads apart from the one behind it."""
    L = B(b.w, b.h, b.seed)
    L.base = b.base
    if fn in (roof_side, roof_gable, roof_hip) and not getattr(b, "main_roof", None):
        b.main_roof = args[4]
    fn(L, *args, **kw)
    outline(L.c)
    for y in range(b.h):
        for x in range(b.w):
            col = L.c.p[y][x]
            if col:
                b.set(x, y, col, glow=(x, y) in L.glow)
                if (x, y) in L.roof:
                    b.roof.add((x, y))
                else:
                    b.roof.discard((x, y))
                if (x, y) in L.rline:
                    b.rline.add((x, y))
                else:
                    b.rline.discard((x, y))
    b.ledge |= L.ledge
    for k, n in L.walls.items():
        b.walls[k] = b.walls.get(k, 0) + n


# ---- parts ---------------------------------------------------------------------------------------------------------
def walls(b: B, x0, x1, top, kind, plinth="field"):
    for y in range(top, b.base + 1):
        for x in range(x0, x1 + 1):
            wall_px(b, x, y, x0, x1, top, kind, 0.04 if x < (x0 + x1) // 2 else -0.04)
    if plinth:
        for y in range(b.base - 2, b.base + 1):
            for x in range(x0, x1 + 1):
                t = 0.3 + hsh(x // 3, y, b.seed + 2) * 0.3
                if (x + (y % 2) * 2) % 5 == 0:
                    t = 0.08
                b.set(x, y, pick(FIELD, t))
    for x in range(x0, x1 + 1):  # the eave's shadow on the wall
        if b.get(x, top):
            b.set(x, top, pick(WALLS[kind], 0.05))


def roof_side(b: B, x0, x1, eave, ridge, kind, inset=6, row=3):
    """A side-gabled roof seen from the south: the near slope from the ridge down to the eave, barge boards each end."""
    cx = (x0 + x1) / 2
    pts = [(x0, eave + 1), (x1 + 1, eave + 1), (x1 + 1 - inset, ridge), (x0 + inset, ridge)]

    def f(x, y):
        edge = x - (x0 + inset * (eave - y) / max(1, eave - ridge)) < 2 or (x1 + 1 - inset * (eave - y) / max(1, eave - ridge)) - x < 2
        if edge:
            b.set(x, y, TIMBER[2] if x < cx else TIMBER[1])
            b.roof.add((x, y))
        else:
            roof_px(b, x, y, ridge, kind, lightness(x, cx) + (eave - y) / max(1, eave - ridge) * 0.12, row)
    poly(pts, f)
    for x in range(x0 + inset, x1 + 2 - inset):
        b.set(x, ridge, TIMBER[3])
        b.roof.add((x, ridge))
    for x in range(x0, x1 + 1):
        b.set(x, eave + 1, TIMBER[1])
        b.ledge.add((x, eave + 1))


def roof_gable(b: B, cx, half, eave, apex, kind, row=3, wall=None, wall_top=None):
    """A front gable: the roof's two slopes as thick bands over a gable wall (wall material) with a lit attic window."""
    if wall:
        def fw(x, y):
            wall_px(b, x, y, int(cx - half), int(cx + half), apex, wall, 0.0)
        poly([(cx - half + 3, eave + 1), (cx + half - 2, eave + 1), (cx + 0.5, apex + 3)], fw)
    th = max(4, int(half * 0.35))

    def fr(x, y):
        f = (y - apex) / max(1, eave - apex)
        hw = 1.5 + f * half
        dl = x - (cx - hw)
        dr = (cx + hw) - x
        if dl < th or dr < th:
            if dl < 1.5 or dr < 1.5:
                b.set(x, y, TIMBER[2] if dl < dr else TIMBER[1])
                b.roof.add((x, y))
            else:
                roof_px(b, x, y, apex, kind, 0.1 if dl < dr else -0.12, row)
    poly([(cx - half, eave + 1.5), (cx + half + 1, eave + 1.5), (cx + 1.5, apex), (cx - 0.5, apex)], fr)
    for y in range(apex - 3, apex + 1):  # finial
        b.set(int(cx), y, TIMBER[1])


def roof_hip(b: B, x0, x1, eave, ridge, kind, inset, row=3):
    cx = (x0 + x1) / 2
    pts = [(x0, eave + 1), (x1 + 1, eave + 1), (x1 + 1 - inset, ridge), (x0 + inset, ridge)]

    def f(x, y):
        fy = (eave - y) / max(1, eave - ridge)
        ll = x0 + inset * fy
        rr = x1 + 1 - inset * fy
        if x - ll < 1.5 or rr - x < 1.5:
            b.set(x, y, TIMBER[1])
            b.roof.add((x, y))
            return
        # the hips: the end slopes read darker (right) and lighter (left)
        side = 0.12 if x < ll + inset * 0.9 else -0.16 if x > rr - inset * 0.9 else lightness(x, cx) * 0.5
        roof_px(b, x, y, ridge, kind, side + fy * 0.1, row)
    poly(pts, f)
    for x in range(x0 + inset, x1 + 2 - inset):
        b.set(x, ridge, TIMBER[3])


def tower(b: B, x0, x1, top, wall, roof, spire, cap=None):
    """A tower in front of the roof: walls from top to the base, a pointed cap rising `spire` px."""
    for y in range(top, b.base + 1):
        for x in range(x0, x1 + 1):
            wall_px(b, x, y, x0, x1, top, wall, 0.08 if x < (x0 + x1) // 2 else -0.08)
    cx = (x0 + x1) / 2

    def f(x, y):
        roof_px(b, x, y, top - spire, roof, lightness(x, cx) * 1.5, 2)
    poly([(x0 - 2, top + 1), (x1 + 3, top + 1), (cx + 1, top - spire), (cx, top - spire)], f)
    for x in range(x0 - 2, x1 + 3):
        b.set(x, top + 1, TIMBER[1])
        b.ledge.add((x, top + 1))
    if cap:
        cap(int(cx), top - spire)


def chimney(b: B, x, top, bottom, w=6, stone=True, ember="#e07a2f", crooked=0):
    for y in range(top, bottom):
        off = int(crooked * (bottom - y) / max(1, bottom - top))
        for xx in range(x + off, x + off + w):
            t = 0.25 + hsh(xx // 2, y // 2, b.seed + 4) * 0.45 if stone else 0.4
            if stone and (xx + y) % 5 == 0:
                t = 0.1
            b.set(xx, y, pick(FIELD if stone else TIMBER, t - (0.15 if xx > x + off + w // 2 else 0)))
    off = crooked
    for xx in range(x - 1 + off, x + w + 1 + off):
        b.set(xx, top, FIELD[2])
        b.ledge.add((xx, top))
    if ember:
        b.set(x + w // 2 + off, top - 1, ember, True)
        b.set(x + w // 2 - 1 + off, top, ember, True)


def window(b: B, x, y, w, h, glow="amber", shape="square", bars=False, shutters=None, box=False, panes=True, curtain=None):
    """A deep-set lit window: ink frame, panes brightening to the middle, a mullion, a sill; shutters, bars, a box."""
    g = GLOWS[glow]
    for yy in range(y - 1, y + h + 1):
        for xx in range(x - 1, x + w + 1):
            if shape == "arch" and yy < y + 1 and xx in (x - 1, x + w):
                continue
            if shape == "round" and ((xx - (x + (w - 1) / 2)) / (w / 2 + 0.6)) ** 2 + ((yy - (y + (h - 1) / 2)) / (h / 2 + 0.6)) ** 2 > 1.05:
                continue
            b.set(xx, yy, TIMBER[0])
    cx, cy = x + (w - 1) / 2, y + (h - 1) / 2
    for yy in range(y, y + h):
        for xx in range(x, x + w):
            if shape == "arch" and yy == y and xx in (x, x + w - 1):
                continue
            if shape == "round" and ((xx - cx) / (w / 2)) ** 2 + ((yy - cy) / (h / 2)) ** 2 > 1.0:
                continue
            if panes and (xx == int(cx) or yy == y + h // 2) and w > 3:
                b.set(xx, yy, TIMBER[2])
                continue
            if bars and xx % 2 == 0:
                b.set(xx, yy, ASHLAR[1])
                continue
            if curtain and (xx - x < 2 or x + w - 1 - xx < 2):
                b.set(xx, yy, curtain)
                continue
            d = max(abs(xx - cx) / (w / 2), abs(yy - cy) / (h / 2))
            t = 1.0 - d * 0.7 + (hsh(xx, yy, b.seed) - 0.5) * 0.12
            col = pick(g, _cl(max(0.2, t)))
            b.set(xx, yy, col, glow=g.index(col) >= 2 if col in g else False)
    for xx in range(x - 2, x + w + 2):
        b.set(xx, y + h + 1, TIMBER[3])
        b.ledge.add((xx, y + h + 1))
    if box:  # a flower box under the sill
        for xx in range(x - 1, x + w + 1):
            b.set(xx, y + h + 2, TIMBER[2])
            b.set(xx, y + h + 3, TIMBER[1])
            b.ledge.add((xx, y + h + 2))
    if shutters:
        for side in (x - 4, x + w + 1):
            for yy in range(y - 1, y + h + 1):
                for xx in range(side, side + 3):
                    b.set(xx, yy, pick(shutters, 0.35 if (xx - side) == 1 else 0.6 if yy % 3 else 0.2))
    for xx in range(x, x + w):  # the light falls on the wall under the sill
        if hsh(xx, y + h + 2, b.seed + 3) > 0.5 and not box:
            b.set(xx, y + h + 2, g[0])


def door(b: B, cx, w=10, h=18, kind="plank", glow=None, arch=False):
    base = b.base
    x0 = cx - w // 2
    for yy in range(base - h - 1, base + 1):
        for xx in range(x0 - 1, x0 + w + 1):
            cut = arch and yy < base - h + 2 and (xx - x0 < 2 - (yy - (base - h)) or (x0 + w - 1 - xx) < 2 - (yy - (base - h)))
            if not cut:
                b.set(xx, yy, TIMBER[0])
    for yy in range(base - h + 1, base + 1):
        for xx in range(x0, x0 + w):
            if arch and yy < base - h + 3 and (xx - x0 < 3 - (yy - (base - h)) or (x0 + w - 1 - xx) < 3 - (yy - (base - h))):
                continue
            if glow:  # an open doorway, lit from inside
                g = GLOWS[glow]
                t = 0.9 - abs(xx - (x0 + (w - 1) / 2)) / w - (base - yy) / (h * 3)
                col = pick(g, _cl(t))
                b.set(xx, yy, col, glow=g.index(col) >= 2)
                continue
            plank = (xx - x0) % 3 == 0
            b.set(xx, yy, TIMBER[1] if plank else TIMBER[3] if xx - x0 < w // 2 else TIMBER[2])
            if kind == "iron" and (base - yy) % 6 == 0:
                b.set(xx, yy, ASHLAR[2])
    if not glow:
        b.set(x0 + w - 3, base - h // 2, AMBER[1])
    for xx in range(x0 - 2, x0 + w + 2):  # the step
        b.set(xx, base, FIELD[4])


def lantern(b: B, x, y, glow="blue", hang=3):
    g = GLOWS[glow]
    for yy in range(y - hang, y):
        b.set(x, yy, TIMBER[0])
    b.set(x - 1, y, TIMBER[0])
    b.set(x + 1, y, TIMBER[0])
    b.set(x, y, TIMBER[0])
    for dx, dy, k in ((-1, 1, 3), (0, 1, 4), (1, 1, 3), (-1, 2, 2), (0, 2, 3), (1, 2, 2)):
        b.set(x + dx, y + dy, g[k], glow=True)
    for dx in (-1, 0, 1):
        b.set(x + dx, y + 3, TIMBER[0])


def wall_lamp(b: B, x, y, glow="blue"):
    b.set(x + 1, y - 1, TIMBER[0])
    b.set(x + 2, y - 1, TIMBER[0])
    lantern(b, x, y, glow, hang=1)


def toadstool(b: B, x, base, big=False):
    """Bill's red toadstool with white spots."""
    r = 3 if big else 2
    for yy in range(base - (3 if big else 2), base + 1):
        b.set(x, yy, STEM[1])
        if big:
            b.set(x + 1, yy, STEM[0])
    top = base - (3 if big else 2) - (3 if big else 2)
    for yy in range(top, top + (3 if big else 2) + 1):
        hw = r - max(0, (top + 1 - yy)) if yy > top else r - 1
        for xx in range(x - hw, x + hw + 1 + (1 if big else 0)):
            b.set(xx, yy, RED_CAP[2] if xx < x + 1 else RED_CAP[1])
    b.set(x - 1, top + 1, SPOT)
    b.set(x + 1, top, SPOT)
    if big:
        b.set(x + 2, top + 2, SPOT)
        b.set(x - 2, top + 2, SPOT)


def mushrooms(b: B, x, base, n=3, cols=("#8a7060", "#c4a090", "#e6dcc8")):
    for i in range(n):
        xx = x + i * 2 + int(hsh(x, i, b.seed) * 2)
        hh = 1 + int(hsh(i, x, b.seed) * 2)
        for yy in range(base - hh, base + 1):
            b.set(xx, yy, STEM[2])
        b.set(xx - 1, base - hh - 1, cols[0])
        b.set(xx, base - hh - 1, cols[1])
        b.set(xx + 1, base - hh - 1, cols[0])
        b.set(xx, base - hh - 2, cols[2])


def gnome(b: B, x, base, hat=None):
    """A garden gnome: red hat, white beard, blue coat, boots."""
    hat = hat or RED_CAP
    for yy, xs, col in ((base, (0, 1, 3, 4), TIMBER[1]), (base - 1, (0, 1, 2, 3, 4), "#2a4060"), (base - 2, (0, 1, 2, 3, 4), "#3a4a68"),
                        (base - 3, (1, 2, 3), SPOT), (base - 4, (0, 1, 2, 3, 4), SPOT), (base - 5, (1, 3), "#e8b898"), (base - 5, (2,), "#c46858"),
                        (base - 6, (0, 1, 2, 3, 4), hat[2]), (base - 7, (1, 2, 3), hat[2]), (base - 8, (2, 3), hat[3]), (base - 9, (3,), hat[3])):
        for dx in xs:
            b.set(x + dx, yy, col)
    b.set(x + 4, base - 6, hat[1])


def barrel(b: B, x, base, w=7, h=9):
    for yy in range(base - h + 1, base + 1):
        bulge = 1 if base - h + 2 < yy < base - 1 else 0
        for xx in range(x - bulge, x + w + bulge):
            t = 0.55 - (xx - x) / w * 0.4
            if (base - yy) in (1, h - 2):
                b.set(xx, yy, ASHLAR[2])
                continue
            b.set(xx, yy, pick(TIMBER + (LOGS[5],), _cl(t + (0.1 if (xx - x) % 3 == 0 else 0))))
    for xx in range(x, x + w):
        b.set(xx, base - h, TIMBER[1])
        b.ledge.add((xx, base - h))


def crate(b: B, x, base, s=7):
    for yy in range(base - s + 1, base + 1):
        for xx in range(x, x + s):
            edge = xx in (x, x + s - 1) or yy in (base - s + 1, base) or abs((xx - x) - (base - yy)) < 1
            b.set(xx, yy, TIMBER[2] if edge else LOGS[4])
    for xx in range(x, x + s):
        b.ledge.add((xx, base - s))


def woodpile(b: B, x, base, w=9, h=6):
    for yy in range(base - h + 1, base + 1):
        for xx in range(x + (base - yy) // 3, x + w - (base - yy) // 3):
            ring = (xx + (yy % 2) * 2) % 4
            b.set(xx, yy, LOGS[6] if ring == 1 else LOGS[4] if ring == 2 else LOGS[2] if ring == 3 else TIMBER[1])


def vines(b: B, x0, x1, top, bottom, season, density=0.55, sd=0):
    r = IVY[season]
    for x in range(x0, x1 + 1):
        if b.get(x, bottom) is None:
            continue
        reach = int(top + (bottom - top) * (1 - fbm(x * 9.0, 7.0, 256, b.seed + sd)))
        for y in range(max(top, reach), bottom + 1):
            if (x, y) in b.glow:
                continue
            if fbm(x * 6.0, y * 6.0, 256, b.seed + 11 + sd) > 1 - density and b.get(x, y):
                b.set(x, y, pick(r, hsh(x, y, b.seed) * 0.9 + 0.1))


def awning(b: B, x0, x1, y, depth, cols):
    for yy in range(y, y + depth):
        for xx in range(x0, x1 + 1):
            stripe = ((xx - x0) // 3) % 2
            b.set(xx, yy, cols[stripe] if yy < y + depth - 1 else cols[2])
    for xx in range(x0, x1 + 1, 3):  # scalloped hem
        b.set(xx, y + depth, cols[(xx - x0) // 3 % 2])
    for xx in range(x0, x1 + 1):
        b.ledge.add((xx, y))


def board_sign(b: B, x, y, w, h, mark):
    """A painted signboard (wood, an icon in paint): hung under the eave, never where the neon sign hangs."""
    for yy in range(y, y + h):
        for xx in range(x, x + w):
            edge = xx in (x, x + w - 1) or yy in (y, y + h - 1)
            b.set(xx, yy, TIMBER[0] if edge else LOGS[3])
    for dx, dy, col in mark:
        b.set(x + dx, y + dy, col)


def porch(b: B, x0, x1, top, kind="shingle", posts=True):
    """A small porch roof on two posts over the door."""
    for y in range(top, top + 4):
        for x in range(x0 - (top + 3 - y) // 2, x1 + 1 + (top + 3 - y) // 2):
            roof_px(b, x, y, top, kind, 0.05, 2)
    for x in range(x0 - 2, x1 + 3):
        b.set(x, top + 4, TIMBER[1])
        b.ledge.add((x, top + 4))
    if posts:
        for y in range(top + 5, b.base):
            b.set(x0, y, TIMBER[3])
            b.set(x1, y, TIMBER[2])


def cracks(b: B, x0, x1, y0, y1, n=3):
    for i in range(n):
        x = int(x0 + hsh(i, 3, b.seed) * (x1 - x0))
        y = int(y0 + hsh(i, 4, b.seed) * (y1 - y0))
        for k in range(4 + int(hsh(i, 5, b.seed) * 4)):
            if b.get(x, y) and (x, y) not in b.glow:
                b.set(x, y, INK)
            x += 1 if hsh(i, k, b.seed + 1) > 0.5 else 0
            y += 1


def broken_boards(b: B, x0, x1, y0, y1, n=2):
    for i in range(n):
        x = int(x0 + hsh(i, 8, b.seed) * (x1 - x0 - 6))
        y = int(y0 + hsh(i, 9, b.seed) * (y1 - y0 - 3))
        for xx in range(x, x + 6):
            b.set(xx, y + (xx - x) // 3, TIMBER[3])
            b.set(xx, y + 1 + (xx - x) // 3, TIMBER[0])


# ---- the season pass -----------------------------------------------------------------------------------------------
def season_pass(b: B, season: str):
    s = b.seed + 31
    roof = sorted(b.roof)
    if season == "winter":
        # a blanket of snow on every roof (a few dark patches where the wind bared it), its courses still showing as soft
        # blue lines; caps on sills, ledges and eaves; a few icicles; a drift along the foot.
        for (x, y) in roof:
            bare = fbm(x * 1.4, y * 2.2, 256, s) < 0.2 and (x, y - 2) in b.roof
            if bare:
                continue
            line = (x, y) in b.rline
            t = 0.4 + (0.14 if x < b.w // 2 else 0.0) + (hsh(x, y, s + 1) - 0.5) * 0.1
            b.set(x, y, pick(SNOW, _cl(t - (0.32 if line else 0))))
        for (x, y) in sorted(b.ledge):
            if b.get(x, y) and (x, y) not in b.glow:
                b.set(x, y, pick(SNOW, 0.75 + hsh(x, y, s) * 0.25))
                if b.get(x, y - 1) is None:
                    b.c.set(x, y - 1, SNOW[3])
        for (x, y) in sorted(b.ledge):
            if hsh(x, y, s + 2) > 0.86 and (x, y + 1) not in b.roof:
                L = 1 + int(hsh(x, y, s + 3) * 3)
                for k in range(1, L + 1):
                    if b.get(x, y + k) is not None and (x, y + k) not in b.glow:
                        b.set(x, y + k, "#b7d2e0" if k < L else "#e8f2f8")
        for x in range(b.w):
            hgt = int(1 + fbm(x * 3.0, 3.0, 256, s) * 3)
            for y in range(b.base - hgt + 1, b.base + 1):
                if b.get(x, y) is not None and (x, y) not in b.glow:
                    b.set(x, y, pick(SNOW, 0.55 + (y - b.base + hgt) / hgt * 0.35))
    elif season == "autumn":
        cols = LEAF["autumn"]
        for (x, y) in roof:  # leaves caught in drifts on the roof, never a speckle
            if fbm(x * 2.0, y * 2.0, 256, s) > 0.74 and hsh(x, y, s) > 0.45:
                b.set(x, y, cols[int(hsh(y, x, s) * 4) % 4])
        for (x, y) in sorted(b.ledge):
            if b.get(x, y) and hsh(x, y, s + 5) > 0.6 and (x, y) not in b.glow:
                b.set(x, y, cols[int(hsh(x, y, s + 6) * 4) % 4])
        for x in range(b.w):
            for y in (b.base, b.base - 1):
                if b.get(x, y) and fbm(x * 4.0, 1.0, 256, s) > 0.45 and hsh(x, y, s + 1) > 0.4 and (x, y) not in b.glow:
                    b.set(x, y, cols[int(hsh(y, x, s + 2) * 4) % 4])
    elif season == "spring":
        cols = LEAF["spring"]
        for (x, y) in roof:  # fresh moss in clumps
            if fbm(x * 2.0, y * 2.0, 256, s) > 0.72:
                b.set(x, y, pick(ROOFS["moss"], 0.55 + hsh(x, y, s) * 0.45))
        for x in range(b.w):
            if b.get(x, b.base) and hsh(x, 1, s) > 0.7 and (x, b.base - 1) not in b.glow:
                b.set(x, b.base - 1, cols[int(hsh(x, 2, s) * 4) % 4])
                b.set(x, b.base, pick(MOSS, 0.7))
    elif season == "summer":
        for (x, y) in roof:
            if fbm(x * 2.0, y * 2.0, 256, s) > 0.7:
                b.set(x, y, pick(ROOFS["moss"], 0.45 + hsh(x, y, s) * 0.4))
        for x in range(b.w):
            if b.get(x, b.base) and hsh(x, 1, s + 4) > 0.55:
                hgt = 1 + int(hsh(x, 3, s) * 3)
                for y in range(b.base - hgt + 1, b.base + 1):
                    if (x, y) not in b.glow:
                        b.set(x, y, pick(MOSS, 0.5 + hsh(x, y, s) * 0.5))


# ---- the designs ---------------------------------------------------------------------------------------------------
# Each takes (b, season, door_cx) and draws on b; base is b.base, the lot's south edge. The neon trade sign hangs at the
# door's right (door tile + 13..29 px, 9..24 px over the step: draw.ts signSpot), so no window or lamp goes there.
def sign_clear(b: B, dcx):
    return range(dcx + 5, dcx + 22)


def _base_dress(b: B, season, xs, kinds):
    """Things at the foot: toadstools, mushrooms, a gnome, barrels, crates, a woodpile (x positions given)."""
    for x, k in zip(xs, kinds):
        if k == "toad":
            toadstool(b, x, b.base, big=False)
        elif k == "Toad":
            toadstool(b, x, b.base, big=True)
        elif k == "mush":
            mushrooms(b, x, b.base, 3)
        elif k == "gnome":
            gnome(b, x, b.base)
        elif k == "barrel":
            barrel(b, x, b.base)
        elif k == "crate":
            crate(b, x, b.base)
        elif k == "wood":
            woodpile(b, x, b.base)


def inn_a(b: B, season, d):
    """The Lantern Inn: a two-storey log tavern under a side-gabled shingle roof with two dormers, a row of lanterns."""
    W = b.w
    wt = b.base - 50
    P(b, chimney, W - 20, 6, wt - 10, 7)
    P(b, roof_side, 1, W - 2, wt, 12, "shingle", inset=8)
    P(b, walls, 1, W - 2, wt + 2, "logs")
    for x in range(1, W - 1):  # the upper floor's jetty beam
        b.set(x, wt + 24, TIMBER[1])
        b.set(x, wt + 25, TIMBER[3])
        b.ledge.add((x, wt + 24))
    for cx in (28, 92):
        P(b, roof_gable, cx, 11, wt - 4, wt - 22, "shingle", wall="boards")
        window(b, cx - 3, wt - 14, 7, 7, "amber", "arch")
    for x in (8, 24, 84, 104):
        window(b, x, wt + 8, 10, 10, "amber", shutters=TIMBER)
    window(b, 10, b.base - 20, 14, 11, "amber", box=True)
    window(b, 92, b.base - 20, 14, 11, "amber", box=True)
    door(b, d, 12, 19, glow="amber")
    for x in range(6, W - 6, 20):
        lantern(b, x, wt + 26, "blue" if (x // 20) % 2 else "amber", hang=2)
    board_sign(b, 60, wt + 10, 12, 8, [(3, 3, AMBER[2]), (4, 3, AMBER[2]), (5, 3, AMBER[2]), (4, 4, AMBER[1]), (4, 5, AMBER[1]), (7, 3, SPOT)])
    _base_dress(b, season, [36, 70, 78, 114], ["barrel", "barrel", "crate", "toad"])
    vines(b, 1, 6, wt + 6, b.base, season, 0.45)


def inn_b(b: B, season, d):
    """The Lantern Inn, coaching style: a fieldstone ground floor, dark board upper floor, a deep thatch, a bay window."""
    W = b.w
    wt = b.base - 48
    P(b, chimney, 10, 2, wt - 4, 8, crooked=-1)
    P(b, chimney, W - 18, 8, wt - 4, 6)
    P(b, roof_side, 1, W - 2, wt, 8, "thatch", inset=10, row=6)
    P(b, walls, 1, W - 2, wt + 2, "boards", plinth=None)
    for y in range(b.base - 22, b.base + 1):
        for x in range(1, W - 1):
            wall_px(b, x, y, 1, W - 2, b.base - 22, "field", 0.04 if x < W // 2 else -0.04)
    for x in range(1, W - 1):
        b.set(x, b.base - 23, TIMBER[1])
        b.ledge.add((x, b.base - 23))
    for x in (12, 40, 80, 100):
        window(b, x, wt + 7, 9, 9, "amber", "arch")
    # a bay window bulging out on the left
    for y in range(b.base - 20, b.base - 3):
        for x in range(6, 30):
            b.set(x, y, TIMBER[1])
    window(b, 8, b.base - 18, 20, 11, "amber")
    P(b, porch, d - 9, d + 9, b.base - 28, "thatch")
    door(b, d, 12, 19)
    lantern(b, d - 8, b.base - 23, "blue")
    _base_dress(b, season, [86, 96, 108, 33], ["barrel", "crate", "mush", "Toad"])
    vines(b, W - 10, W - 2, wt + 4, b.base, season, 0.5)


def shop_a(b: B, season, d):
    """The Counter: a front-gabled log shop with a striped awning over a big lit shop window full of goods."""
    W = b.w
    wt = b.base - 44
    P(b, chimney, W - 18, 10, wt - 8, 6)
    P(b, roof_gable, W / 2 - 0.5, W / 2, wt, 4, "redshingle", wall="boards")
    window(b, W // 2 - 5, wt - 24, 9, 10, "amber", "round")
    P(b, walls, 1, W - 2, wt + 2, "logs")
    window(b, 52, b.base - 34, 12, 9, "amber", shutters=TIMBER)
    # the shop window: wide, low, goods on its shelf
    window(b, 4, b.base - 22, 26, 13, "amber", panes=False)
    for x in range(6, 28, 4):
        b.set(x, b.base - 13, ["#c43838", "#4ab8ff", "#6aaa48", "#b07aff", "#e0a040", "#c43838"][(x // 4) % 6])
        b.set(x + 1, b.base - 13, TIMBER[0])
    awning(b, 2, 32, b.base - 28, 4, ("#6a1020", "#e6dcc8", "#3a181c"))
    door(b, d, 10, 18)
    wall_lamp(b, d - 8, b.base - 22, "blue")
    _base_dress(b, season, [76, 84, 90], ["crate", "barrel", "toad"])


def shop_b(b: B, season, d):
    """The Counter, a board-and-batten store under a hipped slate roof, a lit bay of bottles and a lamp post."""
    W = b.w
    wt = b.base - 42
    P(b, roof_hip, 1, W - 2, wt, 10, "slate", inset=16)
    P(b, chimney, 20, 2, 14, 6, ember="#4ab8ff")
    P(b, walls, 1, W - 2, wt + 2, "boards")
    window(b, 8, wt + 6, 10, 9, "blue", "arch")
    window(b, 70, wt + 6, 10, 9, "blue", "arch")
    for y in range(b.base - 22, b.base - 4):
        for x in range(4, 30):
            b.set(x, y, TIMBER[2])
    window(b, 6, b.base - 20, 22, 12, "amber")
    for x in range(8, 28, 3):
        b.set(x, b.base - 15, ["#4ab8ff", "#c43838", "#b07aff", "#6aaa48"][(x // 3) % 4], glow=True)
    door(b, d, 10, 18)
    lantern(b, d - 8, b.base - 23, "amber")
    _base_dress(b, season, [74, 82, 89], ["barrel", "barrel", "mush"])


def guild_a(b: B, season, d):
    """The Guildhall: a long dark-timber hall with a squat fieldstone watchtower on its left and violet banners."""
    W = b.w
    wt = b.base - 46
    P(b, roof_side, 1, W - 2, wt, 10, "slate", inset=6)
    P(b, walls, 1, W - 2, wt + 2, "boards")
    P(b, tower, 4, 30, wt - 22, "field", "violet", 26, cap=lambda x, y: [b.set(x, yy, "#b07aff", glow=True) for yy in range(y - 3, y)])
    window(b, 12, wt - 12, 10, 12, "violet", "arch")
    window(b, 12, b.base - 26, 10, 14, "amber", "arch", bars=True)
    for x in (40, 64):
        window(b, x, wt + 8, 9, 14, "amber", "arch")
    for x0 in (36, 74):  # banners
        for y in range(wt + 4, wt + 26):
            for x in range(x0, x0 + 6):
                if y < wt + 24 or abs(x - x0 - 2.5) > (y - wt - 24) + 0.5:
                    b.set(x, y, NEON["violet"][1] if x < x0 + 3 else NEON["violet"][0])
        b.set(x0 + 2, wt + 12, "#c9a0e8")
        b.set(x0 + 3, wt + 13, "#c9a0e8")
    door(b, d, 10, 20, kind="iron", arch=True)
    wall_lamp(b, d - 9, b.base - 22, "violet")
    _base_dress(b, season, [44, 54, 62], ["crate", "barrel", "toad"])


def guild_b(b: B, season, d):
    """The Guildhall, a log longhouse under a steep moss roof, crossed blades over a notice board, a cold-fire brazier."""
    W = b.w
    wt = b.base - 40
    P(b, chimney, 14, 4, wt - 6, 7)
    P(b, roof_hip, 1, W - 2, wt, 6, "moss", inset=20, row=3)
    P(b, walls, 1, W - 2, wt + 2, "greylogs")
    for x in (10, 40):
        window(b, x, wt + 9, 12, 10, "amber", shutters=TIMBER)
    board_sign(b, 70, wt + 6, 16, 12, [(3, 3, ASHLAR[6]), (4, 4, ASHLAR[6]), (5, 5, ASHLAR[6]), (6, 6, ASHLAR[6]), (12, 3, ASHLAR[6]), (11, 4, ASHLAR[6]), (10, 5, ASHLAR[6]), (9, 6, ASHLAR[6]), (7, 8, "#c43838"), (8, 8, "#c43838")])
    for y in range(b.base - 22, b.base - 6):  # a notice board on posts
        for x in range(16, 36):
            b.set(x, y, LOGS[4] if (x + y) % 7 else LOGS[3])
    for i, (x, y) in enumerate(((18, b.base - 20), (25, b.base - 18), (30, b.base - 21), (21, b.base - 13))):
        for yy in range(y, y + 5):
            for xx in range(x, x + 4):
                b.set(xx, yy, "#e6dcc8" if i % 2 else "#c4b49a")
    door(b, d, 10, 20, kind="iron")
    lantern(b, d - 9, b.base - 24, "blue")
    _base_dress(b, season, [50, 60, 4], ["barrel", "Toad", "mush"])


def bank_a(b: B, season, d):
    """The Counting House: cut ashlar with two pilasters, a pediment over the door, barred windows, a violet slate roof."""
    W = b.w
    wt = b.base - 48
    P(b, roof_side, 1, W - 2, wt, 12, "violet", inset=6, row=4)
    P(b, walls, 1, W - 2, wt + 2, "ashlar", plinth="field")
    for x0 in (4, W - 9):
        for y in range(wt + 4, b.base - 2):
            for x in range(x0, x0 + 5):
                b.set(x, y, pick(ASHLAR, 0.75 if x == x0 + 1 else 0.6 if x < x0 + 4 else 0.3))
    for x in range(8, 32):  # pediment
        hh = 6 - abs(x - 19.5) / 2.2
        for y in range(int(b.base - 28 - hh), b.base - 27):
            b.set(x, y, pick(ASHLAR, 0.7 if x < 20 else 0.45))
        b.ledge.add((x, int(b.base - 28 - hh)))
    window(b, 46, wt + 8, 10, 13, "amber", "arch", bars=True)
    window(b, 46, b.base - 24, 10, 13, "amber", "arch", bars=True)
    window(b, 12, wt + 6, 10, 8, "blue", "round")
    door(b, d, 12, 20, kind="iron", arch=True)
    _base_dress(b, season, [64, 70], ["mush", "toad"])


def bank_b(b: B, season, d):
    """The Counting House, a fieldstone strongroom with a squat crenellated tower and iron-strapped doors."""
    W = b.w
    wt = b.base - 44
    P(b, roof_hip, 1, W - 2, wt, 14, "slate", inset=12)
    P(b, walls, 1, W - 2, wt + 2, "field")
    for y in range(wt - 18, b.base + 1):
        for x in range(46, W - 2):
            wall_px(b, x, y, 46, W - 3, wt - 18, "field", -0.02)
    for x in range(46, W - 2, 4):  # merlons
        for y in range(wt - 21, wt - 18):
            for xx in range(x, x + 2):
                b.set(xx, y, FIELD[4])
                b.ledge.add((xx, wt - 21))
    window(b, 52, wt - 12, 8, 8, "violet", "arch", bars=True)
    window(b, 52, b.base - 26, 8, 12, "amber", bars=True)
    window(b, 4, wt + 8, 9, 9, "amber", bars=True)
    door(b, d, 12, 20, kind="iron")
    lantern(b, d - 9, b.base - 23, "blue")
    vines(b, 1, 10, wt + 4, b.base, season, 0.6)
    _base_dress(b, season, [36, 40], ["toad", "mush"])


def cottage(b: B, season, d, wall, roof, kind="side", gnome_x=None, toads=(), mush=(), extras=(), ivy=0.0, chim=None, box=True, lamp="amber", porch_kind=None, tilt=0):
    """A cottage on a 4- or 5-row lot: walls, a roof (side gable, front gable or hip), a chimney, windows, dress."""
    W = b.w
    wall_h = 30 if b.h < 100 else 36
    wt = b.base - wall_h
    if chim:
        cx, crook = chim
        P(b, chimney, cx, 2, wt - 4, 6, crooked=crook)
    if kind == "side":
        P(b, roof_side, 1, W - 2, wt, 4 if b.h < 100 else 6, roof, inset=8, row=3 if roof != "thatch" else 5)
    elif kind == "hip":
        P(b, roof_hip, 1, W - 2, wt, 4 if b.h < 100 else 6, roof, inset=18, row=3 if roof != "thatch" else 5)
    else:
        P(b, roof_gable, W / 2 - 0.5 + tilt, W / 2 + 1, wt, 2, roof, wall=wall)
        window(b, W // 2 - 4 + tilt, wt - 16 if b.h < 100 else wt - 24, 7, 7, "amber", "round")
    P(b, walls, 1, W - 2, wt + 2, wall)
    if b.h >= 100:
        window(b, 8, wt + 6, 9, 8, "amber", "arch")
        window(b, 74, wt + 6, 9, 8, "amber", "arch")
    window(b, 8, b.base - 20, 11, 10, "amber", box=box, shutters=TIMBER if not box else None)
    window(b, W - 20, b.base - 20, 11, 10, "amber", box=box, shutters=TIMBER if not box else None)
    if porch_kind:
        P(b, porch, d - 8, d + 8, b.base - 27, porch_kind)
    door(b, d, 10, 18, arch=kind == "gable")
    wall_lamp(b, d - 8, b.base - 21, lamp)
    if ivy:
        vines(b, 1, 16, wt + 2, b.base, season, ivy)
        vines(b, W - 14, W - 2, wt + 2, b.base, season, ivy * 0.8, sd=3)
    if box:
        for xx in list(range(8, 19)) + list(range(W - 20, W - 9)):
            if hsh(xx, 1, b.seed) > 0.35:
                col = LEAF["spring"][int(hsh(xx, 2, b.seed) * 3)] if season in ("spring", "summer") else IVY[season][1] if season != "winter" else None
                if col:
                    b.set(xx, b.base - 9, col)
    for x in toads:
        toadstool(b, x, b.base, big=hsh(x, 9, b.seed) > 0.5)
    for x in mush:
        mushrooms(b, x, b.base, 3)
    if gnome_x is not None:
        gnome(b, gnome_x, b.base)
    for f in extras:
        f(b)


def bram_a(b, season, d):
    cottage(b, season, d, "field", "thatch", "side", gnome_x=4, toads=(84,), chim=(66, 0), ivy=0.5)


def bram_b(b, season, d):
    cottage(b, season, d, "field", "violet", "gable", toads=(4, 88), mush=(76,), chim=(70, 0), box=False, lamp="violet")


def pell_a(b, season, d):
    cottage(b, season, d, "logs", "moss", "hip", mush=(2, 78), toads=(88,), chim=(18, 1), lamp="blue", extras=(lambda b: woodpile(b, 64, b.base),))


def pell_b(b, season, d):
    cottage(b, season, d, "greylogs", "thatch", "gable", gnome_x=86, toads=(3,), chim=(72, -1), box=False, tilt=-2)


def ivy_a(b, season, d):
    cottage(b, season, d, "boards", "shingle", "side", toads=(80, 88), chim=(18, 0), ivy=0.8, lamp="blue")


def ivy_b(b, season, d):
    cottage(b, season, d, "logs", "redshingle", "gable", gnome_x=3, mush=(80,), toads=(88,), chim=(70, 1), ivy=0.5)


def noll_a(b, season, d):
    cottage(b, season, d, "blue", "slate", "gable", toads=(84,), chim=(66, 1), box=True, lamp="blue", ivy=0.35)


def noll_b(b, season, d):
    cottage(b, season, d, "blue", "moss", "side", gnome_x=84, mush=(4,), chim=(16, -1), box=False, porch_kind="slate", extras=(lambda b: cracks(b, 4, 90, b.base - 30, b.base - 6, 3),))


def chapel_a(b: B, season, d):
    """The Chapel: a dark timber stave chapel on a fieldstone base, a steep shingle roof, a steeple with a cold-fire bell
    and a violet rose window over the door; lychgate candles. It faces the graveyard."""
    W = b.w
    wt = b.base - 40
    P(b, roof_side, 1, W - 2, wt, 10, "shingle", inset=4, row=2)
    P(b, walls, 1, W - 2, wt + 2, "boards", plinth=None)
    for y in range(b.base - 10, b.base + 1):
        for x in range(1, W - 1):
            wall_px(b, x, y, 1, W - 2, b.base - 10, "field")

    def cross(x, y):
        for yy in range(y - 7, y):
            b.set(x, yy, ASHLAR[5])
        for xx in (x - 2, x - 1, x + 1, x + 2):
            b.set(xx, y - 5, ASHLAR[5])
    P(b, tower, d - 10, d + 10, wt - 26, "field", "slate", 18, cap=cross)
    window(b, d - 4, wt - 22, 8, 9, "blue", "arch")  # the bell loft, cold fire behind the louvres
    for x in range(d - 3, d + 4):
        b.set(x, wt - 16, ASHLAR[3])
    window(b, d - 6, wt - 6, 12, 12, "violet", "round")  # the rose window
    for x in (8, 22, 72, 100):
        window(b, x, wt + 8, 6, 16, "violet" if x in (22, 100) else "blue", "arch")
    door(b, d, 12, 20, arch=True)
    for x in (d - 12, d + 22):  # candles on the step stones
        b.set(x, b.base - 1, "#e6dcc8")
        b.set(x, b.base - 2, "#e6dcc8")
        b.set(x, b.base - 3, "#4ab8ff", glow=True)
        b.set(x, b.base - 4, "#9ae4ff", glow=True)
    _base_dress(b, season, [112, 118, 4], ["mush", "toad", "mush"])
    vines(b, 1, 6, wt + 2, b.base, season, 0.5)


def chapel_b(b: B, season, d):
    """The Chapel, a crypt chapel: fieldstone walls with a timber gable, buttresses, a squat bell-cote with a red lamp, the
    crypt stair's iron door at its side, lancet windows in cold blue."""
    W = b.w
    wt = b.base - 42
    P(b, roof_side, 1, W - 2, wt, 16, "slate", inset=6, row=3)
    P(b, walls, 1, W - 2, wt + 2, "boards")
    for y in range(b.base - 24, b.base + 1):
        for x in range(1, W - 1):
            wall_px(b, x, y, 1, W - 2, b.base - 24, "field")
    for x0 in (14, 40, 82, 106):  # buttresses
        for y in range(wt + 8, b.base + 1):
            for x in range(x0, x0 + 4):
                b.set(x, y, pick(FIELD, 0.65 if x == x0 else 0.4))
        b.ledge.add((x0, wt + 8))
    P(b, roof_gable, d + 0.5, 16, wt + 2, wt - 30, "slate", wall="boards")
    for y in range(wt - 40, wt - 30):  # bell-cote
        for x in range(d - 3, d + 5):
            b.set(x, y, TIMBER[2] if x in (d - 3, d + 4) else None)
    b.set(d, wt - 36, "#ff3a50", glow=True)
    b.set(d + 1, wt - 36, "#ff3a50", glow=True)
    b.set(d, wt - 35, "#c43838", glow=True)
    b.set(d + 1, wt - 35, "#c43838", glow=True)
    for x in range(d - 4, d + 6):
        b.set(x, wt - 41, TIMBER[1])
    window(b, d - 3, wt - 18, 7, 12, "violet", "arch")
    for x in (24, 64, 94):
        window(b, x, wt + 6, 6, 18, "blue", "arch")
    for y in range(b.base - 14, b.base + 1):  # the crypt door, half sunk
        for x in range(116, 126):
            b.set(x, y, ASHLAR[1] if (x + y) % 4 else ASHLAR[2])
    b.set(121, b.base - 8, "#4ab8ff", glow=True)
    door(b, d, 12, 20, kind="iron", arch=True)
    _base_dress(b, season, [4, 30, 50], ["Toad", "mush", "toad"])


def casino_a(b: B, season, d):
    """The Felt: dark timber with red neon trim, card-suit windows behind red curtains, a false front with a lit marquee."""
    W = b.w
    wt = b.base - 42
    P(b, roof_side, 1, W - 2, wt, 18, "redshingle", inset=6)
    P(b, walls, 1, W - 2, wt + 2, "boards")
    def front(L):
        for y in range(wt - 22, b.base + 1):  # the false front, stepped, painted red
            for x in range(12, W - 12):
                step = 0 if 30 < x < W - 30 else 6
                if y >= wt - 22 + step:
                    wall_px(L, x, y, 12, W - 13, wt - 22, "redboards", 0.0)
    P(b, front)
    for x in range(12, W - 12):
        for y in range(wt - 23, wt - 21):
            b.set(x, y, "#ff3a50" if (x // 2) % 2 else "#c43838", glow=True)
    for i, x in enumerate(range(36, 76, 8)):  # marquee bulbs
        b.set(x, wt - 12, "#ffd0d0" if i % 2 else "#ff3a50", glow=True)
        b.set(x + 1, wt - 12, "#ff3a50", glow=True)
    for x, suit in ((10, "h"), (78, "s"), (94, "d")):
        window(b, x, wt + 8, 10, 12, "red", "arch", curtain="#6a1020", panes=False)
        cx = x + 4
        for dx, dy in ((0, 0), (1, 0), (-1, 1), (2, 1), (0, 2), (1, 2), (0, 3), (1, 3)) if suit in "hd" else ((0, 0), (1, 0), (-1, 1), (2, 1), (0, 1), (1, 1), (0, 2), (1, 2)):
            b.set(cx + dx, wt + 12 + dy, INK if suit == "s" else "#ffd0d0", glow=suit != "s")
    door(b, d, 12, 20, glow="red")
    for x in range(1, W - 1):
        b.set(x, b.base - 26, "#b07aff" if x % 4 else "#4a2a78", glow=x % 4 != 0)
    _base_dress(b, season, [100, 108], ["barrel", "toad"])


def casino_b(b: B, season, d):
    """The Felt, a squat log card-house under a hipped roof, one round violet window like a roulette wheel, dice sign."""
    W = b.w
    wt = b.base - 38
    P(b, chimney, W - 22, 8, wt - 4, 6, ember="#ff3a50")
    P(b, roof_hip, 1, W - 2, wt, 10, "violet", inset=24)
    P(b, walls, 1, W - 2, wt + 2, "logs")
    window(b, 10, wt + 6, 16, 16, "violet", "round", panes=False)
    for k in range(8):
        import math
        a = k * math.pi / 4
        b.set(int(18 + math.cos(a) * 5), int(wt + 14 + math.sin(a) * 5), "#ff3a50", glow=True)
    window(b, 86, wt + 8, 12, 12, "red", curtain="#6a1020")
    board_sign(b, 72, b.base - 36, 10, 9, [(2, 2, SPOT), (6, 2, SPOT), (4, 4, SPOT), (2, 6, SPOT), (6, 6, SPOT)])
    door(b, d, 12, 20, glow="red")
    wall_lamp(b, d - 9, b.base - 22, "red")
    _base_dress(b, season, [96, 104, 4], ["crate", "mush", "toad"])


def smith_a(b: B, season, d):
    """The Smithy: a log forge-house with a great fieldstone chimney, an open forge bay glowing red, an anvil and a
    quench barrel, horseshoes over the door."""
    W = b.w
    wt = b.base - 40
    P(b, chimney, 64, 0, wt + 4, 12, ember="#ff3a50")
    P(b, roof_side, 1, 60, wt, 10, "slate", inset=8)
    for y in range(wt + 2, b.base + 1):
        for x in range(60, W - 2):
            wall_px(b, x, y, 60, W - 3, wt + 2, "field", -0.04)
    P(b, walls, 1, 60, wt + 2, "logs")
    for y in range(b.base - 20, b.base - 2):  # the forge mouth in the chimney's foot
        for x in range(66, 80):
            t = 1.0 - abs(x - 72.5) / 8 - (b.base - 3 - y) / 26
            col = pick(GLOWS["red"], _cl(t + 0.2))
            b.set(x, y, col, glow=GLOWS["red"].index(col) >= 2)
    for x in range(65, 81):
        b.set(x, b.base - 21, FIELD[1])
    for x in range(68, 78, 3):  # sparks
        b.set(x, b.base - 24 - (x % 4), "#e0a040", glow=True)
    window(b, 8, wt + 8, 11, 10, "red", shutters=TIMBER)
    door(b, d, 12, 20, glow="amber")
    for i, x in enumerate((d - 4, d, d + 4)):  # horseshoes
        b.set(x - 1, b.base - 24, ASHLAR[5])
        b.set(x + 1, b.base - 24, ASHLAR[5])
        b.set(x - 1, b.base - 23, ASHLAR[4])
        b.set(x + 1, b.base - 23, ASHLAR[4])
        b.set(x, b.base - 22, ASHLAR[4])
    for y in range(b.base - 6, b.base + 1):  # the anvil
        for x in range(4, 16):
            if y == b.base - 6 or (y < b.base - 3 and 6 < x < 14) or (y >= b.base - 3 and 8 < x < 12) or y == b.base:
                b.set(x, y, ASHLAR[3] if y == b.base - 6 else ASHLAR[1])
    barrel(b, 84, b.base)
    for x in range(85, 90):
        b.set(x, b.base - 9, "#2a4060")
    woodpile(b, 48, b.base)


def smith_b(b: B, season, d):
    """The Smithy, an open-fronted timber shed under a lean-to roof, the forge's red mouth inside, a grindstone, tongs."""
    W = b.w
    wt = b.base - 36
    P(b, chimney, 12, 2, wt, 9, ember="#ff3a50", crooked=1)
    def lean(L):  # lean-to: high at the back-left, low at the front-right
        poly([(1, wt + 2), (W - 1, wt + 2), (W - 1, b.h - 80 + 2), (1, b.h - 80 - 10)], lambda x, y: roof_px(L, x, y, b.h - 90, "shingle", 0.04 - x / W * 0.12, 3))
    P(b, lean)
    for x in range(1, W - 1):
        b.set(x, wt + 2, TIMBER[1])
        b.ledge.add((x, wt + 2))
    P(b, walls, 1, W - 2, wt + 3, "boards")
    for y in range(wt + 6, b.base - 2):  # the open bay, the forge glowing at its back
        for x in range(4, 36):
            t = 0.95 - abs(x - 20) / 18 - (b.base - 2 - y) / 40
            col = pick(GLOWS["red"], _cl(t)) if t > 0.2 else TIMBER[0]
            b.set(x, y, col, glow=col in GLOWS["red"] and GLOWS["red"].index(col) >= 2)
    for x in (4, 20, 35):
        for y in range(wt + 4, b.base):
            b.set(x, y, TIMBER[3])
    window(b, 64, wt + 8, 12, 10, "amber", shutters=TIMBER)
    door(b, d, 10, 19)
    lantern(b, d - 8, b.base - 23, "blue")
    for y in range(b.base - 9, b.base + 1):  # the grindstone
        for x in range(70, 82):
            if (x - 76) ** 2 + (y - (b.base - 5)) ** 2 <= 20:
                b.set(x, y, ASHLAR[4] if (x + y) % 3 else ASHLAR[2])
    _base_dress(b, season, [84, 88], ["toad", "mush"])


def tailor_a(b: B, season, d):
    """The Needle: a timber shop with a violet-and-cream striped awning, bolts of cloth in a lit window, a spool sign."""
    W = b.w
    wt = b.base - 40
    P(b, chimney, 80, 4, wt - 4, 6)
    P(b, roof_side, 1, W - 2, wt, 8, "teal", inset=10)
    P(b, walls, 1, W - 2, wt + 2, "boards")
    window(b, 6, b.base - 22, 30, 13, "amber", panes=False)
    for i, x in enumerate(range(8, 34, 5)):  # bolts of cloth
        col = ["#6a1020", "#4a2a78", "#2a4060", "#3a6828", "#c4a15a"][i % 5]
        for y in range(b.base - 19, b.base - 10):
            b.set(x, y, col)
            b.set(x + 1, y, col)
            b.set(x + 2, y, TIMBER[0])
    awning(b, 4, 38, b.base - 28, 4, ("#4a2a78", "#e6dcc8", "#241848"))
    for x in (10, 30, 92):
        window(b, x, wt + 6, 9, 9, "amber", "arch")
    board_sign(b, 92, b.base - 24, 10, 10, [(4, 2, "#c43838"), (5, 2, "#c43838"), (4, 3, "#e6dcc8"), (5, 3, "#e6dcc8"), (4, 4, "#c43838"), (5, 4, "#c43838"), (2, 6, ASHLAR[6]), (3, 7, ASHLAR[6]), (4, 8, ASHLAR[6])])
    door(b, d, 10, 18)
    wall_lamp(b, d - 8, b.base - 21, "violet")
    _base_dress(b, season, [104, 40], ["toad", "mush"])


def tailor_b(b: B, season, d):
    """The Needle, a log house with a front gable, a dress-form behind a round window, shutters, hanging cloth."""
    W = b.w
    wt = b.base - 40
    P(b, roof_gable, W / 2 - 0.5, W / 2, wt, 2, "slate", wall="boards")
    window(b, W // 2 - 6, wt - 20, 12, 12, "violet", "round")
    for y in range(wt - 18, wt - 9):  # the dress-form's shape in the window
        hw = 1 if y < wt - 15 else 3 - abs(y - (wt - 12)) // 2
        for x in range(W // 2 - hw, W // 2 + hw + 1):
            b.set(x, y, "#4a1848")
    P(b, walls, 1, W - 2, wt + 2, "logs")
    window(b, 8, b.base - 22, 14, 12, "amber", shutters=TIMBER)
    window(b, 86, b.base - 22, 14, 12, "amber", shutters=TIMBER)
    for x in range(26, 46):  # a line of hung cloth
        b.set(x, wt + 6, TIMBER[0])
        if x % 5 < 3:
            for y in range(wt + 7, wt + 13):
                b.set(x, y, ["#6a1020", "#e6dcc8", "#2a4060", "#4a2a78"][(x // 5) % 4])
    door(b, d, 10, 18, arch=True)
    lantern(b, d - 8, b.base - 23, "blue")
    _base_dress(b, season, [104, 96, 4], ["crate", "toad", "gnome"])


def alchemy_a(b: B, season, d):
    """The Cauldron: a crooked timber witch-house, a sagging mossy roof sprouting toadstools, green and blue bottle
    windows, a bubbling cauldron on cold blue fire by the door, herbs hung to dry."""
    W = b.w
    wt = b.base - 38
    P(b, chimney, 18, 0, wt - 2, 7, ember="#6aaa48", crooked=3)

    def sag(x, y):
        roof_px(b, x, y, 6, "moss", lightness(x, W / 2) + (0.1 if (x + y) % 9 == 0 else 0), 3)
    poly([(1, wt + 1), (W - 1, wt + 1), (W - 14, 10), (W / 2, 14), (14, 6)], sag)
    for x in range(1, W - 1):
        b.set(x, wt + 1, TIMBER[1])
        b.ledge.add((x, wt + 1))
    for x, y in ((30, 12), (46, 15), (76, 14), (88, 18)):
        toadstool(b, x, y, big=x % 2 == 0)
    P(b, walls, 1, W - 2, wt + 2, "boards")
    window(b, 8, wt + 8, 10, 10, "green", "round")
    window(b, 86, wt + 6, 10, 14, "blue", "arch")
    for x in range(26, 44, 3):  # herbs hung to dry
        for y in range(wt + 4, wt + 8 + (x % 4)):
            b.set(x, y, IVY["summer"][2] if season != "winter" else IVY["winter"][1])
    door(b, d, 10, 18, arch=True)
    # the cauldron
    for y in range(b.base - 8, b.base + 1):
        for x in range(72, 84):
            if ((x - 77.5) / 6) ** 2 + ((y - (b.base - 4)) / 4.5) ** 2 <= 1:
                b.set(x, y, ASHLAR[0] if x > 78 else ASHLAR[1])
    for x in range(73, 83):
        b.set(x, b.base - 8, "#6aaa48", glow=True)
        if x % 3 == 0:
            b.set(x, b.base - 9, "#c8e080", glow=True)
    for x in (74, 78, 81):
        b.set(x, b.base, "#4ab8ff", glow=True)
    _base_dress(b, season, [4, 60, 100], ["Toad", "mush", "toad"])
    vines(b, 1, W - 2, wt + 2, b.base, season, 0.3, sd=5)


def alchemy_b(b: B, season, d):
    """The Cauldron, a log house with a round herb-tower, a ring of red toadstools, potion-lit windows, a blue lamp."""
    W = b.w
    wt = b.base - 38
    P(b, roof_hip, 1, W - 2, wt, 10, "thatch", inset=22, row=5)
    P(b, walls, 1, W - 2, wt + 2, "logs")

    def finial(x, y):
        b.set(x, y - 1, "#6aaa48", glow=True)
        b.set(x, y - 2, "#c8e080", glow=True)
    P(b, tower, 82, 104, wt - 16, "field", "moss", 20, cap=finial)
    window(b, 89, wt - 8, 8, 10, "green", "arch")
    window(b, 89, b.base - 22, 8, 12, "blue", "arch")
    window(b, 8, wt + 8, 12, 10, "violet", shutters=TIMBER)
    for x in range(10, 20, 3):
        b.set(x, wt + 13, "#6aaa48", glow=True)
    door(b, d, 10, 18)
    lantern(b, d - 8, b.base - 23, "blue")
    for x in (34, 40, 46, 52, 58, 64, 70):
        toadstool(b, x, b.base, big=x % 4 == 2)
    _base_dress(b, season, [2], ["gnome"])


def mystic_a(b: B, season, d):
    """The Moon and Star: an ashlar house under a steep violet roof, a crescent on its finial, a great star window."""
    W = b.w
    wt = b.base - 40
    P(b, roof_gable, W / 2 - 0.5, W / 2, wt, 0, "violet", wall="ashlar")
    b.set(W // 2 - 1, 0, "#f4e27a", glow=True)
    b.set(W // 2 + 1, 1, "#f4e27a", glow=True)
    window(b, W // 2 - 6, wt - 18, 12, 12, "violet", "round", panes=False)
    for dx, dy in ((0, -4), (0, -3), (0, -2), (0, 2), (0, 3), (0, 4), (-4, 0), (-3, 0), (-2, 0), (2, 0), (3, 0), (4, 0), (0, 0), (-1, 0), (1, 0), (0, -1), (0, 1), (-1, -1), (1, 1), (-1, 1), (1, -1)):
        b.set(W // 2 + dx, wt - 13 + dy, "#f4fbff", glow=True)
    P(b, walls, 1, W - 2, wt + 2, "ashlar")
    window(b, 46, wt + 8, 10, 14, "violet", "arch")
    window(b, 46, b.base - 22, 10, 12, "blue", "arch")
    door(b, d, 12, 20, arch=True)
    wall_lamp(b, d - 9, b.base - 22, "violet")
    vines(b, 60, W - 2, wt + 4, b.base, season, 0.6)
    _base_dress(b, season, [64, 70], ["mush", "Toad"])


def mystic_b(b: B, season, d):
    """The Moon and Star, a fieldstone observatory: a domed turret with a slit, moon-phase windows, a violet lamp."""
    W = b.w
    wt = b.base - 40
    P(b, roof_hip, 1, W - 2, wt, 12, "slate", inset=18)
    P(b, walls, 1, W - 2, wt + 2, "field")
    cx, cy, r = 52, wt - 4, 15  # the dome
    for y in range(cy - r, cy + 1):
        for x in range(cx - r, cx + r + 1):
            if (x - cx) ** 2 + (y - cy) ** 2 <= r * r:
                roof_px(b, x, y, cy - r, "violet", 0.12 if x < cx else -0.1, 3)
    for y in range(cy - r + 2, cy + 1):
        b.set(cx, y, "#7a5ad0", glow=True)
        b.set(cx + 1, y, "#b07aff", glow=True)
    for i, x in enumerate((8, 20, 32)):
        window(b, x, wt + 8, 8, 8, "violet", "round", panes=False)
        for y in range(wt + 8, wt + 16):  # the moon's phase: a dark bite from the window
            for xx in range(x, x + 8 - i * 3):
                if b.get(xx, y) and (xx, y) in b.glow and xx < x + 2 + i * 2:
                    b.set(xx, y, TIMBER[0])
    door(b, d, 12, 20, kind="iron", arch=True)
    lantern(b, d - 9, b.base - 24, "violet")
    _base_dress(b, season, [58, 66, 72], ["toad", "mush", "gnome"])


def fisher_a(b: B, season, d):
    """The Drowned Hook: a blue-board boathouse up on stilts over the pond's edge, nets drying, an oar, a fish sign."""
    W = b.w
    wt = b.base - 34
    P(b, roof_gable, W / 2 - 0.5, W / 2, wt - 8, 2, "slate", wall="blue")
    window(b, W // 2 - 4, wt - 22, 8, 8, "blue", "round")
    P(b, walls, 1, W - 2, wt - 6, "blue", plinth=None)
    for y in range(b.base - 6, b.base + 1):  # the stilts
        for x in range(1, W - 1):
            if x % 11 in (1, 2):
                b.set(x, y, LOGS[2] if x % 11 == 1 else LOGS[1])
            elif y < b.base - 4:
                b.set(x, y, TIMBER[2])
            else:
                b.set(x, y, None)
    for x in range(1, W - 1):
        b.set(x, b.base - 7, TIMBER[1])
    for y in range(wt - 4, wt + 18):  # a net hung on the left wall
        for x in range(3, 15):
            if (x + y) % 3 == 0 or (x - y) % 3 == 0:
                b.set(x, y, "#c4b49a" if (x + y) % 2 else "#8a7a64")
    window(b, 32, wt + 2, 9, 9, "amber")
    door(b, d, 10, 18)
    for x in range(14, 34):  # a ramp of boards down to the step
        if b.get(x, b.base) is None:
            b.set(x, b.base, TIMBER[3])
    board_sign(b, 33, wt - 4, 12, 7, [(3, 3, "#9ae4ff"), (4, 3, "#9ae4ff"), (5, 3, "#9ae4ff"), (6, 3, "#9ae4ff"), (7, 2, "#9ae4ff"), (7, 4, "#9ae4ff"), (2, 3, INK)])
    lantern(b, 3, wt - 4, "blue", hang=1)


def fisher_b(b: B, season, d):
    """The Drowned Hook, a sagging shack of rotted blue weatherboards (the 1i slate room's) on pilings, a moss roof, a lantern on a pole, an upturned
    boat and a creel."""
    W = b.w
    wt = b.base - 32
    P(b, roof_side, 1, W - 2, wt, 6, "moss", inset=6)
    P(b, walls, 1, W - 2, wt + 2, "blue", plinth=None)
    for y in range(b.base - 5, b.base + 1):
        for x in range(1, W - 1):
            if x % 15 in (2, 3):
                b.set(x, y, LOGS[2])
            elif y > b.base - 3:
                b.set(x, y, None)
    for x in range(1, W - 1):
        b.set(x, b.base - 6, TIMBER[1])
    broken_boards(b, 2, W - 2, wt + 4, b.base - 10, 2)
    window(b, 4, wt + 6, 8, 8, "blue", shutters=GREYLOG)
    door(b, d, 10, 18)
    for x in range(14, 34):
        if b.get(x, b.base) is None:
            b.set(x, b.base, TIMBER[3])
    for y in range(wt - 10, b.base):  # a lantern pole
        b.set(W - 4, y, LOGS[2])
    lantern(b, W - 6, wt - 8, "blue", hang=1)
    for y in range(b.base - 12, b.base - 7):  # the creel
        for x in range(35, 43):
            b.set(x, y, "#a08860" if (x + y) % 2 else "#6a5830")


def croft_a(b: B, season, d):
    """The South Croft: a little blue-board croft with a hay loft door, a slate roof, pumpkins and toadstools."""
    W = b.w
    wt = b.base - 32
    P(b, roof_gable, W / 2 - 0.5, W / 2, wt, 8, "slate", wall="blue")
    for y in range(wt - 20, wt - 11):  # the loft door, hay spilling
        for x in range(W // 2 - 4, W // 2 + 5):
            b.set(x, y, TIMBER[0] if x in (W // 2 - 4, W // 2 + 4) or y == wt - 20 else ROOFS["thatch"][4 + (x + y) % 3])
    P(b, walls, 1, W - 2, wt + 2, "blue")
    window(b, 35, wt + 6, 8, 8, "amber", shutters=TIMBER)
    door(b, d, 10, 18)
    for x in (4, 38):  # pumpkins
        for y in range(b.base - 5, b.base + 1):
            for xx in range(x, x + 7):
                if ((xx - x - 3) / 3.5) ** 2 + ((y - b.base + 2.5) / 3) ** 2 <= 1:
                    b.set(xx, y, "#e07a2f" if (xx - x) % 3 else "#c45a18")
        b.set(x + 3, b.base - 6, "#3a6828")
    toadstool(b, 2, b.base - 6)


def croft_b(b: B, season, d):
    """The South Croft, a log-and-blue-board croft under deep thatch, a crooked chimney, a gnome by a toadstool."""
    W = b.w
    wt = b.base - 30
    P(b, chimney, 34, 10, wt - 6, 6, crooked=2)
    P(b, roof_hip, 1, W - 2, wt, 12, "thatch", inset=10, row=5)
    P(b, walls, 1, W - 2, wt + 2, "blue")
    window(b, 4, wt + 7, 8, 8, "amber", box=True)
    door(b, d, 10, 18)
    wall_lamp(b, d - 8, b.base - 21, "blue")
    gnome(b, 38, b.base)
    toadstool(b, 34, b.base, big=True)


VARIANTS = {
    "inn": [inn_a, inn_b], "shop": [shop_a, shop_b], "guild": [guild_a, guild_b], "bank": [bank_a, bank_b],
    "bram": [bram_a, bram_b], "pell": [pell_a, pell_b], "ivy": [ivy_a, ivy_b], "noll": [noll_a, noll_b],
    "chapel": [chapel_a, chapel_b], "casino": [casino_a, casino_b], "smith": [smith_a, smith_b],
    "tailor": [tailor_a, tailor_b], "alchemy": [alchemy_a, alchemy_b], "mystic": [mystic_a, mystic_b],
    "fisher": [fisher_a, fisher_b], "croft": [croft_a, croft_b],
}
# the outside material of each variant (its walls), and the 1i interior style it must match
FAMILY_OF_WALL = {"redboards": "cabin", "logs": "cabin", "greylogs": "cabin", "boards": "cabin", "field": "stone", "ashlar": "stone", "blue": "slate"}


def back_roof(b: B, head: int):
    """Where a front gable, a hip or a tower leaves the lot's back corners open, the main roof's back slope runs on
    behind it (a cross-gabled house), so every solid tile of the lot is under the building."""
    hole = [y for y in range(head, b.h) for x in range(1, b.w - 1) if b.c.p[y][x] is None]
    if not hole:
        return
    L = B(b.w, b.h, b.seed + 1)
    L.base = b.base
    roof_side(L, 1, b.w - 2, max(hole) + 2, max(0, head - 6), getattr(b, "main_roof", None) or "shingle", inset=4)
    outline(L.c)
    for y in range(b.h):
        for x in range(b.w):
            if L.c.p[y][x] and b.c.p[y][x] is None:
                b.c.p[y][x] = L.c.p[y][x]
                if (x, y) in L.roof:
                    b.roof.add((x, y))
                if (x, y) in L.rline:
                    b.rline.add((x, y))


def seed_of(room: str, v: int) -> int:
    n = 2166136261
    for ch in f"gravewake-bldg-1t:{room}:{v}":
        n = ((n ^ ord(ch)) * 16777619) & 0xFFFFFFFF
    return n & 0xFFFF


def cell(room: str, v: int, season: str) -> tuple[Canvas, Canvas]:
    w, h, dcol, head, _ = LOTS[room]
    b = B(w * 16, h * 16 + head, seed_of(room, v))
    VARIANTS[room][v](b, season, dcol * 16 + 8)
    back_roof(b, head)
    season_pass(b, season)
    outline(b.c)
    hole = [(x, y) for y in range(head, b.h) for x in range(1, b.w - 1) if b.c.p[y][x] is None]
    assert len(hole) <= (b.w - 2) * (b.h - head) * 0.03, (room, v, season, len(hole), hole[:4])
    for y in range(b.h):  # the mask holds only the art's own glowing pixels
        for x in range(b.w):
            if b.em.p[y][x] and b.em.p[y][x] != b.c.p[y][x]:
                b.em.p[y][x] = None
    return b.c, b.em


def main_wall(room: str, v: int) -> str:
    """The family (FAMILY_OF_WALL) of a variant's widest wall material: it must be its room's 1i interior style."""
    w, h, dcol, head, _ = LOTS[room]
    b = B(w * 16, h * 16 + head, seed_of(room, v))
    VARIANTS[room][v](b, "autumn", dcol * 16 + 8)
    return FAMILY_OF_WALL[max(b.walls, key=b.walls.get)]


def sheet(room: str):
    """town-bldg-<room>.png and its _em: rows = variants, columns = seasons (autumn, winter, spring, summer)."""
    from PIL import Image
    w, h, _, head, _ = LOTS[room]
    cw, ch = w * 16, h * 16 + head
    n = len(VARIANTS[room])
    art = Image.new("RGBA", (cw * 4, ch * n), (0, 0, 0, 0))
    em = Image.new("RGBA", (cw * 4, ch * n), (0, 0, 0, 0))
    for v in range(n):
        for si, s in enumerate(SEASONS):
            c, e = cell(room, v, s)
            art.paste(c.image(), (si * cw, v * ch))
            em.paste(e.image(), (si * cw, v * ch))
    return art, em


def sheets() -> dict:
    out = {}
    for room in LOTS:
        a, e = sheet(room)
        out[f"town-bldg-{room}.png"] = a
        out[f"town-bldg-{room}_em.png"] = e
    return out
