"""Bone car writer (playtest1v, [OWNER-APPROVED 2026-10-05 21:31 ET: playtest1v map fog + bone car]).

Bill: a steampunk, early steam automobile built from skeleton bones: a rib-cage body, skull headlamps in neon-blue cold
fire, bone-spoke wheels, a brass boiler and pipes puffing steam, gloom and glow, drawn to car scale against the 16x32
hero (bigger than the hero, room to sit). In town it stands on show behind velvet ropes (brass posts, red velvet).

Drawn the wild/prop writers' way: one art pixel is one game pixel, palette v3 (every colour through wild_writer.snap),
the 1 px INK outline, light from the upper left, two to four shading steps per material, a dithered ground shadow.

    car_sheet()   -> (bonecar.png, bonecar_em.png): 64x48 cells; rows side (facing east; west is the mirror), front
                     (facing south), back (facing north); columns wheel frame 0, wheel frame 1, and the rider's
                     front layer (the ribs / skull hood / boiler drawn again over a seated hero).
    rope_sheet()  -> (velvet-rope.png): 16x24 cells: brass post, a red velvet rope span (post to post, 16 px), a
                     brass "SOLD" plaque stand.
Foot of every car cell on row 45 (the wheels' bottoms); the seat (where the rider's hips sit) at x 28, row 30 (side),
x 32, row 30 (front, back).
"""

from __future__ import annotations

import math

from wild_writer import Canvas, INK, outline, ramp, hsh
from palette_locked import NEON

W, H = 64, 48
BASE = 45
BONE = ramp("#3a3028", "#8a7a64", "#c4b49a", "#e6dcc8", "#f4f0e8")
BRASS = ramp("#3a2418", "#6a5030", "#a07838", "#c4a050", "#f4e27a")
VELVET = ramp("#2a1018", "#6a2030", "#a02030", "#c43838")
IRON = ramp("#1a1418", "#2a2428", "#4a4a50", "#6a6e78")
FIRE = ramp("#8a3a18", "#e07a2f", "#f4e27a")
BLUE = NEON["blue"]
SHADOW = ramp("#1a1612")[0]


def disc(c: Canvas, cx: float, cy: float, rx: float, ry: float, col) -> None:
    for y in range(int(cy - ry) - 1, int(cy + ry) + 2):
        for x in range(int(cx - rx) - 1, int(cx + rx) + 2):
            if ((x + 0.5 - cx) / rx) ** 2 + ((y + 0.5 - cy) / ry) ** 2 <= 1.0:
                c.set(x, y, col(x, y) if callable(col) else col)


def rect(c: Canvas, x0: int, y0: int, x1: int, y1: int, col) -> None:
    for y in range(y0, y1 + 1):
        for x in range(x0, x1 + 1):
            c.set(x, y, col(x, y) if callable(col) else col)


def line(c: Canvas, x0: float, y0: float, x1: float, y1: float, col, wd: float = 1.0) -> None:
    n = int(max(abs(x1 - x0), abs(y1 - y0)) * 2) + 1
    for i in range(n + 1):
        t = i / n
        x, y = x0 + (x1 - x0) * t, y0 + (y1 - y0) * t
        r = wd / 2
        for yy in range(int(math.floor(y - r + 0.5)), int(math.floor(y + r + 0.5)) + (1 if wd > 1 else 0)):
            for xx in range(int(math.floor(x - r + 0.5)), int(math.floor(x + r + 0.5)) + (1 if wd > 1 else 0)):
                c.set(xx, yy, col(xx, yy) if callable(col) else col)


def lit(r, cx: float, cy: float, rad: float):
    """A material shaded by distance from an upper-left highlight: 0 = darkest step."""
    def f(x: int, y: int) -> str:
        d = math.hypot(x - (cx - rad * 0.45), y - (cy - rad * 0.45)) / max(1.0, rad * 1.6)
        t = 1.0 - min(1.0, d)
        k = int(round(t * (len(r) - 2))) + 1 if t > 0.12 else 1
        if 0.3 < t < 0.34 and (x + y) % 2:
            k = max(1, k - 1)
        return r[max(0, min(len(r) - 1, k))]
    return f


def shadow(c: Canvas, cx: int, w: int) -> None:
    for y in (BASE + 1, BASE + 2):
        for x in range(cx - w // 2, cx + w // 2 + 1):
            if c.get(x, y) is None and (x + y) % 2 == 0 and abs(x - cx) < w / 2 - (y - BASE - 1) * 2:
                c.set(x, y, SHADOW)


def wheel(c: Canvas, cx: float, cy: float, r: float, frame: int, edge: bool = False) -> None:
    """A bone-spoke wheel seen side on (edge=False) or end on (edge=True: a narrow tyre with spoke knuckles)."""
    if edge:
        rect(c, int(cx - 2), int(cy - r), int(cx + 2), int(cy + r), lambda x, y: IRON[1] if x > cx else IRON[2])
        for k in range(int(cy - r) + 1 + frame, int(cy + r), 3):
            c.set(int(cx), k, BONE[3])
            c.set(int(cx) - 1, k, BONE[2])
        return
    disc(c, cx, cy, r, r, IRON[1])                                   # iron tyre
    disc(c, cx, cy, r - 1.5, r - 1.5, None)                          # open wheel
    for y in range(int(cy - r) - 1, int(cy + r) + 2):                # tyre highlight, upper left
        for x in range(int(cx - r) - 1, int(cx + r) + 2):
            d = math.hypot(x + 0.5 - cx, y + 0.5 - cy)
            if r - 1.5 < d <= r and (x < cx - 1 and y < cy - 1):
                c.set(x, y, IRON[3])
    disc(c, cx, cy, r - 1.5, r - 1.5, lambda x, y: None)
    rim = r - 2.2
    for a0 in range(6):                                              # six bone spokes (long bones), turning
        a = a0 * math.pi / 3 + frame * math.pi / 6
        ex, ey = cx + math.cos(a) * rim, cy + math.sin(a) * rim
        line(c, cx, cy, ex, ey, BONE[3] if math.sin(a - 2.4) > 0 else BONE[2])
        c.set(int(round(ex)), int(round(ey)), BONE[4])               # a knuckle at the rim
    for y in range(int(cy - rim) - 1, int(cy + rim) + 2):            # a thin bone rim inside the tyre
        for x in range(int(cx - rim) - 1, int(cx + rim) + 2):
            d = math.hypot(x + 0.5 - cx, y + 0.5 - cy)
            if rim - 0.6 < d <= rim + 0.5:
                c.set(x, y, BONE[2] if (x + y) % 3 else BONE[1])
    disc(c, cx, cy, 2.2, 2.2, BRASS[3])                              # brass hub, a vertebra cap
    c.set(int(cx) - 1, int(cy) - 1, BRASS[4])
    c.set(int(cx), int(cy), IRON[0])


def skull(c: Canvas, cx: float, cy: float, rx: float, ry: float, front: bool, em: Canvas | None) -> None:
    """The skull hood. Its eye sockets are the headlamps (neon-blue cold fire, on the glow mask)."""
    disc(c, cx, cy, rx, ry, lit(BONE, cx, cy, rx))
    jaw_y = int(cy + ry * 0.55)
    rect(c, int(cx - rx * 0.62), jaw_y, int(cx + rx * 0.62), int(cy + ry + 2), lit(BONE, cx, cy, rx))
    for x in range(int(cx - rx * 0.55), int(cx + rx * 0.62), 2):     # teeth: a grille
        c.set(x, jaw_y + 1, INK)
        c.set(x, jaw_y + 2, BONE[1])
    eyes = [(cx - rx * 0.42, cy - ry * 0.05), (cx + rx * 0.42, cy - ry * 0.05)] if front else [(cx + rx * 0.35, cy - ry * 0.1)]
    for ex, ey in eyes:
        disc(c, ex, ey, 2.4, 2.2, INK)
        disc(c, ex, ey, 1.6, 1.4, BLUE[3])
        c.set(int(ex) - 1 if front else int(ex), int(ey) - 1, BLUE[5])
        if em is not None:
            disc(em, ex, ey, 1.6, 1.4, BLUE[3])
            em.set(int(ex) - 1 if front else int(ex), int(ey) - 1, BLUE[5])
    nx, ny = (cx, cy + ry * 0.3) if front else (cx + rx * 0.75, cy + ry * 0.25)
    c.set(int(nx), int(ny), INK)                                     # the nose hole
    c.set(int(nx) - (1 if front else 0), int(ny) + 1, INK)
    for k in range(3):                                               # a crack, upper left
        c.set(int(cx - rx * 0.3) + k, int(cy - ry * 0.7) + k // 2, BONE[1])


def boiler(c: Canvas, x0: int, y0: int, x1: int, y1: int, em: Canvas | None) -> None:
    """A brass boiler drum with rivet bands and a fire-box window (its glow on the mask)."""
    cx = (x0 + x1) / 2
    rect(c, x0, y0, x1, y1, lambda x, y: BRASS[4] if x == x0 + 1 else BRASS[3] if x < cx - 1 else BRASS[2] if x < x1 - 1 else BRASS[1])
    for yy in (y0 + 2, y1 - 3):
        for x in range(x0, x1 + 1):
            c.set(x, yy, BRASS[1] if x % 2 else BRASS[0])
    for x in range(x0 + 1, x1, 2):
        c.set(x, y0, BRASS[4] if x < cx else BRASS[3])
    fx0, fx1, fy0 = int(cx - 2), int(cx + 2), y1 - 7
    rect(c, fx0 - 1, fy0 - 1, fx1 + 1, fy0 + 3, IRON[0])
    rect(c, fx0, fy0, fx1, fy0 + 2, lambda x, y: FIRE[2] if y == fy0 + 2 and x % 2 else FIRE[1] if y > fy0 else FIRE[0])
    if em is not None:
        rect(em, fx0, fy0, fx1, fy0 + 2, lambda x, y: FIRE[2] if y == fy0 + 2 and x % 2 else FIRE[1])


def chimney(c: Canvas, x: int, top: int, bot: int) -> None:
    rect(c, x, top + 2, x + 2, bot, lambda xx, y: BRASS[3] if xx == x else BRASS[2] if xx == x + 1 else BRASS[1])
    rect(c, x - 1, top, x + 3, top + 1, lambda xx, y: BRASS[4] if y == top else BRASS[2])   # flared cap


def rib(c: Canvas, x: float, y_spine: float, top: float, lean: float) -> None:
    """One rib: a bone arc from the spine up and over (side on)."""
    n = 14
    for i in range(n + 1):
        t = i / n
        yy = y_spine - (y_spine - top) * math.sin(t * math.pi / 2)
        xx = x + lean * math.sin(t * math.pi) * 2.2
        col = BONE[3] if t > 0.5 else BONE[2]
        c.set(int(round(xx)), int(round(yy)), col)
        c.set(int(round(xx)) + 1, int(round(yy)), BONE[1] if t < 0.8 else BONE[2])


def side(frame: int, layer: str = "body") -> tuple[Canvas, Canvas]:
    c = Canvas(W, H)
    em = Canvas(W, H)
    spine_y = 33
    if layer in ("body",):
        # seat: red velvet back and cushion, behind the ribs
        rect(c, 21, 20, 25, 31, lambda x, y: VELVET[3] if x == 22 and y < 28 else VELVET[2] if x < 25 else VELVET[1])
        rect(c, 22, 29, 33, 31, lambda x, y: VELVET[3] if y == 29 else VELVET[1])
        for y in range(21, 29, 3):
            c.set(23, y, VELVET[0])                                  # tufting buttons
        # boiler at the back, its chimney puffing (steam is drawn by the game)
        boiler(c, 3, 17, 15, 34, em)
        chimney(c, 7, 3, 16)
        # brass pipe from the boiler forward under the seat, and a pressure gauge
        line(c, 15, 30, 50, 30, lambda x, y: BRASS[3] if x % 4 else BRASS[1])
        line(c, 15, 31, 50, 31, BRASS[1])
        disc(c, 18, 24, 2.2, 2.2, BRASS[2])
        c.set(18, 24, IRON[0]); c.set(18, 23, INK); c.set(17, 23, BRASS[4])
        line(c, 12, 16, 12, 12, BRASS[2]); line(c, 12, 12, 26, 12, BRASS[3]); line(c, 26, 12, 26, 17, BRASS[2])   # a whistle pipe over the seat
        c.set(26, 11, BRASS[4])
        # spine chassis: a chain of vertebrae
        for x in range(3, 58):
            seg = (x - 3) % 4
            c.set(x, spine_y, BONE[3] if seg in (1, 2) else BONE[1])
            c.set(x, spine_y + 1, BONE[2] if seg in (1, 2) else BONE[0])
            if seg == 1:
                c.set(x, spine_y - 1, BONE[3])
        # steering: a bone column and a small ring
        line(c, 41, 32, 37, 19, BONE[2], 1)
        disc(c, 37, 18, 2.6, 1.2, None)
        for a in range(12):
            t = a / 12 * math.pi * 2
            c.set(int(round(37 + math.cos(t) * 2.6)), int(round(18 + math.sin(t) * 1.2)), BONE[3] if math.sin(t) < 0 else BONE[1])
        # skull hood at the front
        skull(c, 52, 25, 7.5, 7, False, em)
        # mudguards: shoulder blades over the wheels
        for (wx, r) in ((16, 9.5), (49, 7.5)):
            for i in range(-6, 7):
                a = i / 6 * 1.2
                x = int(round(wx + math.sin(a) * (r + 1.5)))
                y = int(round(BASE - r - math.cos(a) * (r + 1.5)))
                c.set(x, y, BONE[3] if i < 0 else BONE[2])
                c.set(x, y + 1, BONE[1])
    if layer in ("body", "front"):
        # the rib cage round the rider: five ribs arching from the spine, the near side drawn over the seat
        for k, x in enumerate((24, 28, 32, 36, 40)):
            rib(c, x, spine_y - 1, 20 + abs(k - 2), 1 if k < 2 else -1 if k > 2 else 0)
        line(c, 23, 20, 41, 20, lambda x, y: BONE[3] if x % 3 else BONE[2])   # a sternum rail along the top
    if layer == "body":
        wheel(c, 16, BASE - 9, 9, frame)
        wheel(c, 49, BASE - 7, 7, frame)
        outline(c)
        shadow(c, 32, 56)
    else:
        outline(c)
    return c, em


def front(frame: int, layer: str = "body") -> tuple[Canvas, Canvas]:
    """Facing south: the skull hood square on, both headlamp eyes lit, the wheels end on either side."""
    c = Canvas(W, H)
    em = Canvas(W, H)
    cx = 32
    if layer == "body":
        chimney(c, cx - 1, 1, 14)                                    # the boiler's chimney behind
        rect(c, cx - 9, 12, cx + 9, 20, lambda x, y: BRASS[3] if x < cx else BRASS[2])   # boiler top behind the seat
        rect(c, cx - 8, 15, cx + 8, 28, lambda x, y: VELVET[2] if y < 26 else VELVET[1])  # the seat back
        for k in range(-6, 7, 3):
            c.set(cx + k, 19, VELVET[0])
        for side_ in (-1, 1):                                        # ribs curving round the rider, both sides
            for i in range(14):
                t = i / 13
                x = cx + side_ * (11 + math.sin(t * math.pi) * 3)
                c.set(int(round(x)), 18 + i, BONE[3] if side_ < 0 else BONE[2])
                c.set(int(round(x)) + side_, 18 + i, BONE[1])
        wheel(c, cx - 17, BASE - 8, 8, frame, edge=True)
        wheel(c, cx + 17, BASE - 8, 8, frame, edge=True)
        line(c, cx - 15, 36, cx + 15, 36, lambda x, y: BONE[3] if x % 4 else BONE[1])   # axle bone
    if layer in ("body", "front"):
        skull(c, cx, 34, 9, 7.5, True, em if layer == "body" else None)
        for k in (-1, 1):
            line(c, cx + k * 9, 37, cx + k * 14, 37, BRASS[2])        # lamp stays
    outline(c)
    if layer == "body":
        shadow(c, cx, 40)
    return c, em


def back(frame: int, layer: str = "body") -> tuple[Canvas, Canvas]:
    """Facing north: the boiler's round end and its fire door toward you, the chimney, the wheels end on."""
    c = Canvas(W, H)
    em = Canvas(W, H)
    cx = 32
    if layer == "body":
        rect(c, cx - 9, 14, cx + 9, 24, lambda x, y: VELVET[2] if x < cx + 6 else VELVET[1])  # the seat back
        for side_ in (-1, 1):
            for i in range(14):
                t = i / 13
                x = cx + side_ * (11 + math.sin(t * math.pi) * 3)
                c.set(int(round(x)), 16 + i, BONE[3] if side_ < 0 else BONE[2])
        disc(c, cx, 10, 4.5, 3.5, lit(BONE, cx, 10, 4.5))             # the skull's crown peeks over, ahead
        wheel(c, cx - 17, BASE - 8, 8, frame, edge=True)
        wheel(c, cx + 17, BASE - 8, 8, frame, edge=True)
    if layer in ("body", "front"):
        disc(c, cx, 33, 10, 9, lit(BRASS, cx, 33, 10))               # boiler end
        for a in range(16):
            t = a / 16 * math.pi * 2
            c.set(int(round(cx + math.cos(t) * 8)), int(round(33 + math.sin(t) * 7)), BRASS[1] if math.sin(t) > -0.3 else BRASS[4])
        rect(c, cx - 3, 33, cx + 3, 37, IRON[0])
        rect(c, cx - 2, 34, cx + 2, 36, lambda x, y: FIRE[1] if y > 34 else FIRE[0])
        if layer == "body":
            rect(em, cx - 2, 34, cx + 2, 36, lambda x, y: FIRE[1] if y > 34 else FIRE[0])
        chimney(c, cx + 6, 15, 26)
        for k in (-1, 1):                                            # red tail lamps: velvet-red glass
            disc(c, cx + k * 12, 38, 1.5, 1.5, VELVET[3])
    outline(c)
    if layer == "body":
        shadow(c, cx, 40)
    return c, em


def car_sheet():
    from pixel_writer import cells
    rows = []
    ems = []
    for view in (side, front, back):
        a0, e0 = view(0)
        a1, e1 = view(1)
        f, _ = view(0, "front")
        rows.append(cells([a0, a1, f]))
        ems.append(cells([e0, e1, Canvas(W, H)]))
    from PIL import Image
    sheet = Image.new("RGBA", (W * 3, H * 3), (0, 0, 0, 0))
    em = Image.new("RGBA", (W * 3, H * 3), (0, 0, 0, 0))
    for i, (r, e) in enumerate(zip(rows, ems)):
        sheet.paste(r, (0, i * H))
        em.paste(e, (0, i * H))
    return sheet, em


def rope_sheet():
    from pixel_writer import cells
    post = Canvas(16, 24)
    rect(post, 6, 4, 9, 21, lambda x, y: BRASS[4] if x == 6 else BRASS[3] if x == 7 else BRASS[2] if x == 8 else BRASS[1])
    disc(post, 7.5, 3.5, 2.6, 2.4, lit(BRASS, 7.5, 3.5, 2.6))         # ball finial
    rect(post, 4, 21, 11, 22, lambda x, y: BRASS[3] if y == 21 else BRASS[1])   # round foot
    for y in (8, 15):
        rect(post, 6, y, 9, y, BRASS[1])
    outline(post)
    span = Canvas(16, 24)
    for x in range(-1, 17):
        t = (x + 1) / 17
        y = 7 + math.sin(t * math.pi) * 4
        span.set(x, int(round(y)), VELVET[3] if x % 3 else VELVET[2])
        span.set(x, int(round(y)) + 1, VELVET[1])
    for x in (0, 15):
        span.set(x, 7, BRASS[3])                                     # brass hooks
    outline(span)
    sold = Canvas(16, 24)
    rect(sold, 7, 12, 8, 21, lambda x, y: BRASS[2] if x == 7 else BRASS[1])
    rect(sold, 2, 5, 13, 12, lambda x, y: BRASS[3] if (x, y) != (2, 5) and y < 11 else BRASS[1])
    rect(sold, 3, 6, 12, 10, VELVET[1])
    for x in range(4, 12, 2):
        sold.set(x, 8, BONE[4])                                      # the plaque's lettering, a row of pips
    rect(sold, 5, 21, 10, 22, BRASS[2])
    outline(sold)
    return cells([post, span, sold])
