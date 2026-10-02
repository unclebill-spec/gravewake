"""playtest1d (batch C2, owner-requested 2026-10-02): the town's houses and cabin, its grass, themed dungeon stairs and the
biome rim lines, drawn by the writer in gloom and glow. Same rules as wild_writer: pixel by pixel on the snapped Canvas
(every colour lands on palette v3), a 1 px ink outline on sprites, no soft pixels. Each sprite returns (art, em): em
holds only the pixels that glow (window light, lamp flames), for the draw's full-light pass at night.

Houses keep the old footprints' scale: a house is 64x96 (art 60x92, the door centred at the bottom, as the draw expects),
the cabin 80x96 (art 72x86)."""
from __future__ import annotations

from palette_locked import LOCKED  # noqa: E402
from wild_writer import (  # noqa: F401
    BARK, BLUE, CRYPT, EARTH, HOLE, INK, MASON, MOSS, TURF, VIOLET, Canvas, dither, fbm, hsh, outline, pick, ramp, snap,
    tone, wrap_noise,
)

GLOW = ramp("#8a6848", "#c4a15a", "#e0a040", "#f4e27a", "#fff8e0")  # window light, dark sill to bright pane
GLOW_EM = {snap(c) for c in ("#e0a040", "#f4e27a", "#fff8e0")}
TIMBER = ramp("#140c10", "#1a1008", "#2a1c14", "#3a2818", "#4a3424")

HOUSE_KINDS = ["stone", "warm", "slate"]  # house.png, house-warm.png, house-slate.png (the draw's x0 % 3 order)
HOUSE_LOOK = {
    # roof ramp (dark to light), wall ramp, wall pattern
    "stone": (ramp("#140810", "#1a1430", "#241848", "#2a2040", "#3a2a44", "#4a3a60", "#6a5878"),
              ramp("#1a1418", "#2a2428", "#3a3438", "#4a4450", "#5a564e", "#6a6660", "#8a867c"), "blocks"),
    "warm": (ramp("#140c10", "#2a1018", "#3a1a1a", "#4a2424", "#5a3030", "#6a2030", "#7a4a3a"),
             ramp("#2a1c14", "#3a2818", "#4a3424", "#5a4030", "#6a5040", "#8a7a64", "#a08a6a"), "timber"),
    "slate": (ramp("#0c1018", "#16161a", "#1a1a1c", "#2a2a2e", "#3a4048", "#4a4a50", "#5a5e64"),
              ramp("#0e1a28", "#16304a", "#1c3048", "#2a4060", "#3a4a68", "#4a5a78", "#6a7a90"), "boards"),
}


def _roof_px(c: Canvas, x: int, y: int, top: int, ridge_x: float, r, seed: int, moss: bool) -> None:
    """One shingle pixel: rows of 3 px with staggered joints, lit from the left of the ridge, mottled."""
    row = (y - top) // 3
    lit = x < ridge_x
    t = 0.62 if lit else 0.38
    t += (fbm(x * 3.0, y * 3.0, 192, seed) - 0.5) * 0.35
    if (y - top) % 3 == 2:
        t -= 0.3
    elif (x + row * 3) % 6 == 0:
        t -= 0.22
    elif (y - top) % 3 == 0:
        t += 0.1
    col = pick(r, max(0.0, min(1.0, t)))
    if moss and fbm(x * 6.0, y * 6.0, 192, seed + 7) > 0.66 and (y - top) % 3 != 2:
        col = pick(MOSS, 0.35 if lit else 0.15)
    c.set(x, y, col)


def _wall_px(c: Canvas, x: int, y: int, x0: int, x1: int, top: int, base: int, r, pattern: str, seed: int) -> None:
    lx = x - x0
    ly = y - top
    t = 0.55 + (fbm(x * 4.0, y * 4.0, 256, seed) - 0.5) * 0.25
    if pattern == "blocks":
        course = ly // 5
        if ly % 5 == 4 or (lx + (course % 2) * 5) % 10 == 0:
            t = 0.12
        elif ly % 5 == 0:
            t += 0.15
    elif pattern == "timber":
        # plaster panels between dark beams: posts every 13 px, a rail at mid height, braces in the end panels
        post = lx % 13 in (0, 1)
        rail = ly in (0, 1, (base - top) // 2, (base - top) // 2 + 1)
        span = x1 - x0
        brace = (lx < 13 and abs((ly - 2) - (lx * 1.4)) < 1.2) or (lx > span - 13 and abs((ly - 2) - ((span - lx) * 1.4)) < 1.2)
        if post or rail or brace:
            c.set(x, y, pick(TIMBER, 0.5 if (post and lx % 13 == 0) or rail and ly % 2 == 0 else 0.25))
            return
        t = 0.7 + (fbm(x * 5.0, y * 5.0, 256, seed) - 0.5) * 0.2
    elif pattern == "boards":
        if lx % 4 == 0:
            t = 0.15
        elif lx % 4 == 1:
            t += 0.12
        if hsh(lx // 4, ly // 7, seed) > 0.8 and ly % 7 == 0:
            t = 0.2
    elif pattern == "logs":
        # stacked logs, rounded: light on top of each log, dark seam below, cut ends at the corners
        k = ly % 5
        t = [0.75, 0.62, 0.5, 0.38, 0.12][k] + (fbm(x * 3.0, y * 6.0, 256, seed) - 0.5) * 0.2
        if lx < 3 or lx > x1 - x0 - 3:
            t = [0.5, 0.75, 0.9, 0.75, 0.3][k]
    c.set(x, y, pick(r, max(0.0, min(1.0, t))))


def _window(c: Canvas, em: Canvas, x: int, y: int, w: int, h: int, arched: bool, seed: int) -> None:
    """A deep-set lit window: dark timber frame, warm panes brightening to the centre, a cross mullion, a sill."""
    for yy in range(y - 1, y + h + 1):
        for xx in range(x - 1, x + w + 1):
            if arched and yy < y + 1 and (xx in (x - 1, x + w)):
                continue
            c.set(xx, yy, TIMBER[0])
    cx, cy = x + (w - 1) / 2, y + (h - 1) / 2
    for yy in range(y, y + h):
        for xx in range(x, x + w):
            if arched and yy == y and xx in (x, x + w - 1):
                continue
            if xx == int(cx) or yy == y + h // 2:
                c.set(xx, yy, TIMBER[2])
                continue
            d = max(abs(xx - cx) / (w / 2), abs(yy - cy) / (h / 2))
            t = 1.0 - d * 0.75 + (hsh(xx, yy, seed) - 0.5) * 0.1
            col = pick(GLOW, max(0.15, min(1.0, t)))
            c.set(xx, yy, col)
            if snap(col) in GLOW_EM:
                em.set(xx, yy, col)
    for xx in range(x - 2, x + w + 2):
        c.set(xx, y + h + 1, TIMBER[3])
    # the light falls on the wall under the sill
    for xx in range(x, x + w):
        if hsh(xx, y + h + 2, seed + 3) > 0.45:
            c.set(xx, y + h + 2, GLOW[0])


def _door(c: Canvas, em: Canvas, cx: int, base: int, w: int, h: int, lamp: str) -> None:
    x0 = cx - w // 2
    for yy in range(base - h - 1, base + 1):
        for xx in range(x0 - 1, x0 + w + 1):
            top_cut = yy < base - h + 2 and (xx - x0 < 2 - (yy - (base - h)) or (x0 + w - 1 - xx) < 2 - (yy - (base - h)))
            if not top_cut:
                c.set(xx, yy, TIMBER[0])
    for yy in range(base - h + 1, base):
        for xx in range(x0, x0 + w):
            if yy < base - h + 3 and (xx - x0 < 3 - (yy - (base - h)) or (x0 + w - 1 - xx) < 3 - (yy - (base - h))):
                continue
            plank = (xx - x0) % 3 == 0
            c.set(xx, yy, TIMBER[1] if plank else TIMBER[3] if xx - x0 < w // 2 else TIMBER[2])
    c.set(x0 + w - 3, base - h // 2, GLOW[1])  # the iron ring catches the light
    for xx in range(x0 - 2, x0 + w + 2):
        c.set(xx, base, MASON[3])
        c.set(xx, base + 1, MASON[1])
    # a lamp on a bracket by the door: cold blue fire, or a warm lantern
    lx, ly = x0 - 4, base - h + 1  # left of the door: the shop sign hangs on the right
    fl = BLUE if lamp == "blue" else GLOW
    c.set(lx + 1, ly - 2, TIMBER[0])
    c.set(lx, ly - 2, TIMBER[0])
    for (dx, dy, k) in ((0, 0, 0), (0, 1, 3), (0, 2, 4), (1, 1, 3), (-1, 1, 2), (0, 3, 2)):
        col = fl[min(len(fl) - 1, k + (1 if lamp == "blue" else 0))]
        c.set(lx + dx, ly + dy, col)
        if k >= 2:
            em.set(lx + dx, ly + dy, col)
    c.set(lx, ly + 4, TIMBER[0])


def house(kind: str) -> tuple[Canvas, Canvas]:
    """A gothic town house (64x96): a steep front gable with a lit round window, a chimney, two lit windows, the door."""
    roof, wall, pattern = HOUSE_LOOK[kind]
    seed = {"stone": 11, "warm": 23, "slate": 37}[kind]
    c, em = Canvas(64, 96), Canvas(64, 96)
    x0, x1, base = 5, 58, 93  # wall span and the step line
    eave, apex = 50, 6
    ridge = 31.5
    # chimney behind the roof (right slope)
    for y in range(12, 30):
        for x in range(43, 49):
            t = 0.35 if x > 45 else 0.55
            c.set(x, y, pick(MASON, t - (0.2 if y % 4 == 3 else 0)))
    for x in range(42, 50):
        c.set(x, 11, MASON[2])
    c.set(45, 10, snap("#e07a2f"))
    em.set(45, 10, snap("#e07a2f"))
    # walls
    for y in range(eave - 2, base):
        for x in range(x0, x1 + 1):
            _wall_px(c, x, y, x0, x1, eave - 2, base, wall, pattern, seed)
    # plinth
    for y in range(base - 4, base):
        for x in range(x0, x1 + 1):
            c.set(x, y, pick(MASON, 0.3 if (x + (y % 2) * 3) % 6 else 0.1))
    # roof: a front gable from the apex to the eaves, 3 px overhang each side, barge boards on the slopes
    for y in range(apex, eave + 1):
        f = (y - apex) / (eave - apex)
        half = 2 + f * 30.5
        lo, hi = int(round(ridge - half)), int(round(ridge + half))
        for x in range(max(1, lo), min(62, hi) + 1):
            edge = x - lo < 2 or hi - x < 2
            if edge:
                c.set(x, y, TIMBER[2] if x - lo < 2 else TIMBER[1])
            else:
                _roof_px(c, x, y, apex, ridge, roof, seed, kind != "slate")
    for x in range(1, 63):
        c.set(x, eave + 1, TIMBER[1])
        c.set(x, eave + 2, roof[0])
    # under the eave, the wall sits in shadow
    for x in range(x0, x1 + 1):
        c.set(x, eave + 3, pick(wall, 0.1))
    # finial
    for y in range(1, apex):
        c.set(31, y, TIMBER[1])
        c.set(32, y, TIMBER[2])
    c.set(30, 3, TIMBER[1])
    c.set(33, 3, TIMBER[1])
    # gable window (round) and the two wall windows
    _window(c, em, 28, 24, 8, 10, True, seed)
    _window(c, em, 11, 62, 9, 12, kind == "stone", seed + 1)
    _window(c, em, 44, 62, 9, 12, kind == "stone", seed + 2)
    # a flower box under the warm house's windows, ivy on the stone one
    if kind == "warm":
        for xx in list(range(10, 22)) + list(range(43, 55)):
            c.set(xx, 77, TIMBER[2])
            if hsh(xx, 76, seed) > 0.4:
                c.set(xx, 76, pick(MOSS, 0.6) if hsh(xx, 75, seed) > 0.3 else snap("#c46878"))
    if kind == "stone":
        for y in range(eave + 4, base - 4):
            for x in range(x0, x0 + 6):
                if fbm(x * 9.0, y * 5.0, 256, seed + 9) > 0.55 - (y - eave) * 0.004:
                    c.set(x, y, pick(MOSS, hsh(x, y, seed) * 0.8))
    _door(c, em, 32, base, 12, 20, "blue" if kind != "warm" else "warm")
    outline(c)
    return c, em


def cabin() -> tuple[Canvas, Canvas]:
    """The cabin (80x96): a low log house under a deep hipped roof, a stone chimney, a porch lamp, two lit windows."""
    roof = ramp("#140c10", "#1a1008", "#2a1c14", "#3a2818", "#4a3424", "#5a4030", "#6a5040")
    logs = ramp("#1a1008", "#2a1c14", "#3a2818", "#4a3424", "#5a4030", "#6a5040", "#8a6848")
    seed = 51
    c, em = Canvas(80, 96), Canvas(80, 96)
    x0, x1, base = 7, 72, 93
    eave, top = 54, 12
    # chimney (left), fieldstone
    for y in range(14, eave):
        for x in range(12, 20):
            t = 0.25 + hsh(x // 2, y // 2, seed) * 0.45
            c.set(x, y, pick(MASON, t if (x + y) % 5 else 0.1))
    for x in range(11, 21):
        c.set(x, 13, MASON[2])
    c.set(15, 12, snap("#e07a2f"))
    em.set(15, 12, snap("#e07a2f"))
    for y in range(eave - 2, base):
        for x in range(x0, x1 + 1):
            _wall_px(c, x, y, x0, x1, eave - 2, base, logs, "logs", seed)
    for y in range(base - 3, base):
        for x in range(x0, x1 + 1):
            c.set(x, y, pick(MASON, 0.25 if (x + (y % 2) * 2) % 5 else 0.08))
    # hipped roof: a trapezoid, ridge from x 26 to 53 at the top, eaves 4 px past the walls
    for y in range(top, eave + 1):
        f = (y - top) / (eave - top)
        lo = int(round(26 - f * 23))
        hi = int(round(53 + f * 23))
        for x in range(max(2, lo), min(77, hi) + 1):
            if x - lo < 2 or hi - x < 2:
                c.set(x, y, TIMBER[1])
                continue
            lit = x < 40
            # thatch-like shake rows, darker toward the hips
            t = (0.6 if lit else 0.4) + (fbm(x * 2.5, y * 4.0, 256, seed) - 0.5) * 0.35
            if (y - top) % 4 == 3:
                t -= 0.28
            if (x * 7 + ((y - top) // 4) * 3) % 9 == 0:
                t -= 0.18
            col = pick(roof, max(0.0, min(1.0, t)))
            if fbm(x * 6.0, y * 6.0, 256, seed + 5) > 0.66 and (y - top) % 4 != 3:
                col = pick(MOSS, 0.3 if lit else 0.15)
            c.set(x, y, col)
    for x in range(2, 78):
        c.set(x, eave + 1, TIMBER[0])
    for x in range(x0, x1 + 1):
        c.set(x, eave + 2, pick(logs, 0.05))
    # porch posts and a lit doorway
    _window(c, em, 15, 64, 10, 11, False, seed)
    _window(c, em, 55, 64, 10, 11, False, seed + 1)
    _door(c, em, 40, base, 12, 21, "warm")
    for y in range(eave + 2, base - 3):
        for x in (27, 28, 52, 53):
            c.set(x, y, TIMBER[2] if x % 2 else TIMBER[3])
    outline(c)
    return c, em


def _locked(c: str) -> str:
    """Snap to the season sheets' palette (the locked set, a subset of v3): the season check holds them to it."""
    c = snap(c)
    if c in LOCKED:
        return c
    r, g, b = int(c[1:3], 16), int(c[3:5], 16), int(c[5:7], 16)
    return min(sorted(LOCKED), key=lambda p: 2 * (int(p[1:3], 16) - r) ** 2 + 4 * (int(p[3:5], 16) - g) ** 2 + 3 * (int(p[5:7], 16) - b) ** 2)


# per season: lawn, its soft patch, tuft light, tuft tip, root dark; then the small things (petals or leaves) and a centre.
# The lawn is one flat colour with broad soft patches, the way the old town grass read calm; the colours are the old
# season sheets' own anchors, with a greener spring and summer.
LAWN = {
    "spring": ("#3c8636", "#3a6828", "#6aaa48", "#8fd18a", "#2a4a28", ("#e8c0d0", "#f4f0e8", "#c9a0e8"), "#c4a15a"),
    "summer": ("#3a6828", "#2a4a28", "#5a7a28", "#6aaa48", "#1e3428", ("#f4e27a", "#f4f0e8", "#e8c0d0"), "#c4a15a"),
    "autumn": ("#6a5830", "#5a4834", "#8a6840", "#a08860", "#5a4834", ("#e07a2f", "#e0a040", "#c45a18", "#c4a15a"), "#6a4818"),
    "winter": ("#7a90b0", "#6a7888", "#8aa4b0", "#b7d2e0", "#5a6878", ("#e8f2f8", "#f7fbff", "#9aa8c0"), "#6a7888"),
}
SEASONS = ["autumn", "winter", "spring", "summer"]


def _ldark(c: str) -> str:
    r, g, b = int(c[1:3], 16), int(c[3:5], 16), int(c[5:7], 16)
    return _locked("#%02x%02x%02x" % (int(r * 0.85), int(g * 0.85), int(b * 0.85)))


def town_grass(cell: int, season: str = "spring") -> Canvas:
    """Cozy town grass (16x16, cell 0-6) for one season: one even lawn colour with broad soft patches (no per-pixel
    noise), short tufts; clover in 2 and 5; flowers in 3, 4 and 6 (fallen leaves in autumn, frost in winter). Every cell
    shares one wrapping base so neighbours meet without a seam; only the small details differ. Drawn per season (not a
    colour remap), every colour in the locked set."""
    lawn, patch, light, tip, root, bits, mid = (_locked(x) if isinstance(x, str) else tuple(_locked(y) for y in x) for x in LAWN[season])
    c = Canvas(16, 16)
    rnd = [hsh(cell, k, 77) for k in range(40)]
    # one soft patch in four of the seven cells, kept off the edges, so the lawn has no 16 px beat
    px_, py_, pr = 4 + rnd[36] * 8, 4 + rnd[37] * 8, 2.5 + rnd[38] * 2.0
    for y in range(16):
        for x in range(16):
            d = ((x - px_) ** 2 + ((y - py_) * 1.4) ** 2) ** 0.5 + (hsh(x, y, cell + 5) - 0.5) * 1.6
            on = cell in (0, 2, 4, 6) and d < pr and 0 < x < 15 and 0 < y < 15
            c.set(x, y, patch if on else lawn)
    # tufts: three-blade clumps with a light tip and a dark root
    for k in range(2 + cell % 3):
        tx, ty = 2 + int(rnd[k] * 12), 3 + int(rnd[k + 10] * 10)
        c.set(tx - 1, ty + 1, light)
        c.set(tx + 1, ty + 1, light)
        c.set(tx, ty, light)
        c.set(tx, ty - 1, tip)
        c.set(tx, ty + 2, root)
    if cell in (2, 5):
        for k in range(2):
            cx, cy = 3 + int(rnd[20 + k] * 9), 3 + int(rnd[22 + k] * 9)
            for dx, dy in ((0, 0), (1, 0), (0, 1), (1, 1), (2, 1), (1, 2)):
                c.set(cx + dx, cy + dy, light if (dx + dy) % 2 else tip)
            c.set(cx + 1, cy + 3, root)
    if cell in (3, 4, 6) or (season == "autumn" and cell in (0, 1, 5)):
        for k in range(2 if cell != 6 else 3):
            petal = bits[(cell + k) % len(bits)]
            fx, fy = 3 + int(rnd[30 + k] * 10), 3 + int(rnd[33 + k] * 10)
            if season == "autumn":  # a fallen leaf: a lit blade and a dark vein
                c.set(fx, fy, petal)
                c.set(fx + 1, fy, petal)
                c.set(fx + 1, fy + 1, petal)
                c.set(fx + 2, fy + 1, mid)
            else:
                c.set(fx, fy, petal)
                c.set(fx + 1, fy, petal)
                c.set(fx, fy + 1, petal)
                c.set(fx + 1, fy + 1, mid)
                c.set(fx, fy + 2, root)
    return c


STAIR_KINDS = ["stairwell", "crypt", "barrow"]


def stairs(kind: str, way: str) -> Canvas:
    """A floor stair (16x16) dressed for its dungeon: mason's steps, a crypt's violet flags with bone-white nosings, or a
    barrow's earth cut steps held by roots. 'down' falls away into the dark, 'up' climbs into a pale light."""
    side, step = {"stairwell": (MASON, MASON), "crypt": (CRYPT, CRYPT), "barrow": (TURF, EARTH)}[kind]
    c = Canvas(16, 16)
    for y in range(16):
        for x in range(16):
            edge = x in (0, 15) or y in (0, 15)
            c.set(x, y, side[1] if edge else side[2])
    n = len(step)
    for y in range(1, 15):
        k = y - 1
        s = k // 3
        if way == "down":
            tn = min(n - 1, s + 1)
            col = HOLE[0] if s == 0 else step[tn]
        else:
            tn = max(1, n - 1 - s)
            col = step[tn]
        if k % 3 == 0 and s > 0:
            col = snap("#d4cec0") if kind == "crypt" else step[min(n - 1, tn + 1)]
        for x in range(2, 14):
            c.set(x, y, col)
    for y in range(1, 15):
        c.set(1, y, side[1])
        c.set(14, y, side[min(len(side) - 1, 3)])
    if kind == "barrow":
        for (x, y) in ((1, 3), (2, 4), (2, 5), (14, 8), (13, 9), (13, 10), (1, 11), (2, 12)):
            c.set(x, y, BARK[2])
    if kind == "crypt":
        for y in (4, 10):
            c.set(1, y, VIOLET[2])
            c.set(14, y, VIOLET[2])
    glow = BLUE if kind != "crypt" else VIOLET
    if way == "up":
        for (x, y) in [(5, 1), (8, 1), (11, 1)]:
            c.set(x, y, glow[4])
    else:
        for (x, y) in [(6, 2), (9, 2)]:
            c.set(x, y, glow[2])
    return c


RIM_BIOMES = ["snow", "sand", "ash", "swamp"]  # wild-flecks order (skin biome index - 1)
RIM = {"snow": "#8aa4b0", "sand": "#8a7048", "ash": "#1a1612", "swamp": "#0e2418"}


def rim_line(mask, biome: str) -> Canvas:
    """The rim where a neighbour biome's drift meets this tile's ground: the mask's own inner edge (a masked pixel with an
    unmasked 4-neighbour inside the cell), in the neighbour's dark. It follows the drift's curve, not the tile step."""
    c = Canvas(16, 16)
    on = lambda x, y: 0 <= x < 16 and 0 <= y < 16 and mask[y][x]
    for y in range(16):
        for x in range(16):
            if not mask[y][x]:
                continue
            if any(0 <= x + dx < 16 and 0 <= y + dy < 16 and not on(x + dx, y + dy) for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1))):
                c.set(x, y, RIM[biome])
    return c
