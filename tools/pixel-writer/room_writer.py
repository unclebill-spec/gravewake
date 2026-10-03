"""Room writer (playtest1n, 2026-10-03): the props a fight can use, drawn as writer art in the gloom-and-glow style.
[OWNER-APPROVED 2026-10-03 15:41 ET: use-the-room combat]

Bill (2026-10-03 15:41 ET): "Hanging lanterns or braziers in dungeons can be hit to drop and start a short fire patch ...
Explosive or oil barrels can be hit or set alight. Some pillars break to give a stun or splash ... Use the art writers
for any new props, in the gloom-and-glow style."

    room-props.png     16x32 cells, the order src/game/room.ts PROP_CELL reads:
                       0 hanging lantern on its iron hook post (lit)   1 the bare post once the lantern has dropped
                       2 oil barrel (amber band, a dark seep)          3 powder barrel (red band, a fuse cap)
                       4 burst staves (either barrel, once broken)     5 cracked pillar
                       6 the pillar badly cracked (one hit from going) 7 the rubble it leaves
    room-props_em.png  the same cells, only what glows: the lantern's flame, the powder barrel's fuse
    room-fire.png      32x16, four frames: a short fire patch (red neon tongues over coals, violet smoke flecks)
    room-oil.png       32x16, one frame: a spilled oil slick (black-amber, cold-blue sheen)

Every colour is palette v3, hard alpha, on the wild writer's snapping Canvas. Run: python3 tools/pixel-writer/room_writer.py
(writes into public/art/writer/; OUT can be pointed elsewhere).
"""

from __future__ import annotations

import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
sys.path.insert(0, str(HERE.parent / "sprite-writer"))

from wild_writer import Canvas, ramp, outline, INK, hsh  # noqa: E402
from palette_locked import NEON  # noqa: E402

TAG = "[OWNER-APPROVED 2026-10-03 15:41 ET: use-the-room combat]"
OUT = HERE.parent.parent / "public" / "art" / "writer"
WOOD = ramp("#2a1a12", "#3a2418", "#5a3828", "#6a4830", "#8a6848")
IRON = ramp("#1a1418", "#2a2428", "#4a4a50", "#6a6e78", "#9aa0aa")
STONE = ramp("#1a1820", "#2a2834", "#3e3c4a", "#585668", "#767488")
AMBER = ramp("#3a2410", "#6a4818", "#a07028", "#c4a050")
RED = NEON["red"]
BLUE = NEON["blue"]
VIOLET = NEON["violet"]


def _post(c: Canvas) -> None:
    """The iron hook post: a 2 px shaft on a foot plate, an arm reaching right with a hook."""
    for y in range(6, 30):
        c.set(6, y, IRON[2])
        c.set(7, y, IRON[1] if y % 5 else IRON[3])
    for x in range(4, 10):
        c.set(x, 29, IRON[1])
        c.set(x, 30, IRON[0])
    for x in range(6, 12):
        c.set(x, 5, IRON[3] if x < 11 else IRON[2])
    c.set(11, 6, IRON[2])
    c.set(11, 7, IRON[1])


def lantern(lit: bool) -> Canvas:
    c = Canvas(16, 32)
    _post(c)
    if lit:
        # the cage: iron top, four bars, a base; the flame inside is drawn by lantern_em too
        for x in range(9, 14):
            c.set(x, 8, IRON[3])
            c.set(x, 15, IRON[2])
        for y in range(9, 15):
            c.set(9, y, IRON[2])
            c.set(13, y, IRON[2])
            for x in range(10, 13):
                c.set(x, y, RED[1] if y < 11 else RED[2])
        c.set(11, 11, RED[3])
        c.set(11, 12, RED[4])
        c.set(10, 13, RED[3])
        c.set(12, 13, RED[3])
        c.set(11, 13, RED[5])
    outline(c)
    return c


def lantern_em() -> Canvas:
    c = Canvas(16, 32)
    for y in range(10, 15):
        for x in range(10, 13):
            c.set(x, y, RED[3] if y < 12 else RED[4])
    c.set(11, 12, RED[5])
    c.set(11, 13, RED[5])
    return c


def barrel(band: tuple[str, ...], powder: bool) -> Canvas:
    c = Canvas(16, 32)
    top, bot = 15, 30
    for y in range(top, bot + 1):
        bulge = 1 if top + 3 <= y <= bot - 3 else 0
        for x in range(3 - bulge, 13 + bulge):
            stave = (x + (1 if y > (top + bot) // 2 else 0)) % 3
            col = WOOD[3] if stave == 0 else WOOD[2]
            if x <= 3 - bulge:
                col = WOOD[1]
            if x >= 12 + bulge:
                col = WOOD[1]
            c.set(x, y, col)
    for y in (top + 2, bot - 2):
        for x in range(2, 14):
            if c.get(x, y):
                c.set(x, y, IRON[2] if x % 4 else IRON[3])
    for y in range(top + 6, top + 9):
        for x in range(2, 14):
            if c.get(x, y):
                c.set(x, y, band[1] if y == top + 7 else band[0])
    # the lid
    for x in range(4, 12):
        c.set(x, top, WOOD[4])
        c.set(x, top + 1, WOOD[3])
    if powder:
        c.set(8, top - 1, IRON[3])
        c.set(8, top - 2, IRON[2])
        c.set(8, top - 3, RED[3])
        for x in (6, 10):
            c.set(x, top + 7, RED[4])
    else:
        # a dark seep under the bung
        for y in range(top + 9, bot):
            c.set(9, y, AMBER[0] if y % 2 else INK)
        c.set(9, top + 9, AMBER[2])
    outline(c)
    return c


def powder_em() -> Canvas:
    c = Canvas(16, 32)
    c.set(8, 12, RED[4])
    c.set(8, 11, RED[3])
    c.set(6, 22, RED[3])
    c.set(10, 22, RED[3])
    return c


def staves() -> Canvas:
    c = Canvas(16, 32)
    for k, (x0, y0, dx, dy, n) in enumerate([(2, 28, 1, 0, 6), (8, 27, 1, 0, 6), (4, 24, 1, 1, 4), (10, 22, 0, 1, 5), (5, 30, 1, 0, 7)]):
        for i in range(n):
            c.set(x0 + dx * i, y0 + dy * i, WOOD[3] if i % 2 else WOOD[2])
    for x in (3, 11):
        c.set(x, 26, IRON[3])
        c.set(x + 1, 26, IRON[2])
    outline(c)
    return c


def pillar(cracks: int) -> Canvas:
    c = Canvas(16, 32)
    for y in range(3, 31):
        for x in range(3, 13):
            col = STONE[3] if x in (5, 6) else STONE[2]
            if x == 3 or x == 12:
                col = STONE[1]
            if y in (3, 4) or y in (29, 30):
                col = STONE[4] if y in (3, 29) else STONE[1]
            if hsh(x, y, 7) < 0.04:
                col = STONE[1]
            c.set(x, y, col)
    for x in range(2, 14):
        c.set(x, 5, STONE[3])
        c.set(x, 28, STONE[3])
    # cracks with a faint violet seam (the glow reads the stone is about to go)
    paths = [[(8, 7), (9, 9), (8, 11), (9, 13), (10, 15)], [(5, 18), (6, 20), (8, 21), (9, 23), (8, 25)], [(10, 8), (11, 10), (10, 13), (11, 17), (10, 20), (11, 24)]]
    for p in paths[: 1 + cracks]:
        # joined segments (one pixel per row), ink with a violet seam on its right
        for (x0, y0), (x1, y1) in zip(p, p[1:]):
            for y in range(y0, y1 + 1):
                x = x0 + round((x1 - x0) * (y - y0) / max(1, y1 - y0))
                c.set(x, y, INK)
                c.set(x + 1, y, VIOLET[2] if cracks > 1 and y % 2 else VIOLET[1])
    if cracks:
        for x, y in [(4, 12), (11, 27), (7, 4)]:
            c.set(x, y, INK)
    outline(c)
    return c


def rubble() -> Canvas:
    c = Canvas(16, 32)
    for k, (x0, y0, w, h) in enumerate([(2, 25, 5, 4), (7, 26, 6, 4), (4, 22, 4, 3), (10, 23, 3, 3), (1, 29, 3, 2)]):
        for y in range(y0, y0 + h):
            for x in range(x0, x0 + w):
                c.set(x, y, STONE[3] if y == y0 else STONE[2] if (x + y + k) % 3 else STONE[1])
    outline(c)
    return c


def fire(frame: int) -> Canvas:
    c = Canvas(32, 16)
    cx, cy = 16, 9
    for y in range(16):
        for x in range(32):
            d = ((x - cx) / 14) ** 2 + ((y - cy) / 6) ** 2
            if d > 1:
                continue
            n = hsh(x, y, frame * 13 + 5)
            if d > 0.7:
                if n < 0.5:
                    c.set(x, y, RED[0] if n < 0.3 else RED[1])
                continue
            c.set(x, y, RED[1] if n < 0.4 else RED[2])
    # tongues: short columns that lean with the frame
    for k in range(7):
        x = 5 + k * 3 + (frame + k) % 2
        hgt = 3 + int(hsh(k, frame, 3) * 6)
        for i in range(hgt):
            yy = 11 - i
            xx = x + ((i + frame + k) % 3 == 0) * (1 if k % 2 else -1)
            col = RED[4] if i < hgt // 3 else RED[3] if i < hgt - 1 else RED[5]
            if 0 <= yy < 16:
                c.set(xx, yy, col)
    for k in range(3):
        x = 8 + k * 7 + frame
        y = 1 + (frame + k) % 3
        c.set(x % 32, y, VIOLET[2])
    return c


def oil() -> Canvas:
    c = Canvas(32, 16)
    for y in range(16):
        for x in range(32):
            d = ((x - 16) / 14) ** 2 + ((y - 9) / 6) ** 2 + 0.25 * hsh(x // 3, y // 2, 4)
            if d > 1:
                continue
            c.set(x, y, INK if d > 0.55 else AMBER[0])
    for x, y in [(10, 8), (11, 8), (19, 10), (20, 10), (14, 6), (22, 7)]:
        c.set(x, y, BLUE[2])
    c.set(12, 7, BLUE[3])
    c.set(18, 11, AMBER[2])
    return c


def sheets() -> dict:
    from pixel_writer import cells

    props = [lantern(True), lantern(False), barrel(AMBER, False), barrel(RED, True), staves(), pillar(1), pillar(2), rubble()]
    empty = Canvas(16, 32)
    em = [lantern_em(), empty, empty, powder_em(), empty, empty, empty, empty]
    return {
        "room-props.png": cells(props),
        "room-props_em.png": cells(em),
        "room-fire.png": cells([fire(f) for f in range(4)]),
        "room-oil.png": cells([oil()]),
    }


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    for name, im in sheets().items():
        im.save(OUT / name)


if __name__ == "__main__":
    main()
