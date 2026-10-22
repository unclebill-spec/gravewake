"""playtest2a [OWNER-APPROVED 2026-10-06 21:02 ET: playtest2a calmer bone floor]: a calm floor for the wild rift's bone rooms.

Bill (2026-10-06 21:02 ET): "the floor with bones on it is really busy, change it to a less busy texture." The wild
portal's floors room and its Rift Warden room (`wildrift` floors layout, `wilddeep`) are all `T.bone` tiles, and 1z drew
a bright bone heap (prop-bones.png) on every one of them. This writer draws their new ground:

    floor-bone2.png  8 cells, 16x16: plain dark crypt earth in the ossuary's own violet (#2e1e38, its floor2), with a few
                     soft clusters one step either side (#342038 / #2a1c30) and now and then a sunk pebble. No grid, no
                     seams, nothing lighter than #3a2a44, so the neon lights keep the scene.
    decal-bone2.png  4 cells, 16x16: rare small accents (draw.ts lays one on about 1 tile in 10): a lone bone, two crossed
                     bones, a half-sunk skull, a few chips. Muted bone (#6a5a4c body, #8a7a64 tip, #4a382c shade), never
                     the heap's bright #e6dcc8 / #f4f0e8, and none bigger than 7x5 px.

Code-drawn, seeded (random.Random), palette v3 (LOCKED_V3), hard alpha. Nothing on these sheets glows, so neither has an
_em mask. The 1h prop-bones.png stays (the generated dungeons' single bone heap by the pool still uses it).
"""

from __future__ import annotations

import random

from pixel_writer import Canvas

# The ground ramp: base, the two soft neighbours, a pebble's lit top and its shade (all in palette v3).
BASE = "#2e1e38"
SOFT_HI = "#342038"
SOFT_LO = "#2a1c30"
PEBBLE = "#3a2a44"
PEBBLE_SH = "#241830"
# Muted bone: shade, body, tip.
BONE_SH = "#4a382c"
BONE = "#6a5a4c"
BONE_TIP = "#8a7a64"
FLOOR_CELLS = 8
ACCENT_CELLS = 4


def _cluster(c: Canvas, rng: random.Random, colour: str, size: int) -> None:
    """A soft clump of `size` pixels grown from one seed point (wraps at the edges, so the floor has no seams)."""
    x, y = rng.randrange(16), rng.randrange(16)
    for _ in range(size):
        c.set(x % 16, y % 16, colour)
        dx, dy = rng.choice(((1, 0), (-1, 0), (0, 1), (0, -1), (1, 0), (0, 1)))
        x, y = x + dx, y + dy


def floor_cell(v: int) -> Canvas:
    """One calm floor cell: mostly base, two or three soft clusters, a pebble on every third cell."""
    rng = random.Random(2021 + 37 * v)
    c = Canvas(16, 16)
    c.fill(BASE)
    for _ in range(rng.randrange(2, 4)):
        _cluster(c, rng, SOFT_HI, rng.randrange(4, 8))
    for _ in range(rng.randrange(1, 3)):
        _cluster(c, rng, SOFT_LO, rng.randrange(4, 7))
    if v % 3 == 1:
        px, py = rng.randrange(3, 12), rng.randrange(3, 12)
        c.set(px, py, PEBBLE)
        c.set(px + 1, py, PEBBLE)
        c.set(px, py + 1, PEBBLE_SH)
        c.set(px + 1, py + 1, PEBBLE_SH)
    return c


def accent_cell(v: int) -> Canvas:
    """One rare accent on clear ground (transparent around it), sitting low in the cell like the floor decals."""
    c = Canvas(16, 16)
    if v == 0:  # a lone bone, lying across
        for i in range(5):
            c.set(5 + i, 10, BONE)
        c.set(4, 9, BONE_TIP); c.set(4, 11, BONE_TIP); c.set(10, 9, BONE_TIP); c.set(10, 11, BONE_TIP)
        for i in range(5):
            c.set(5 + i, 11, BONE_SH)
    elif v == 1:  # two small bones crossed
        for i in range(5):
            c.set(5 + i, 8 + i, BONE)
            c.set(9 - i, 8 + i, BONE if i != 2 else BONE_TIP)
        c.set(4, 8, BONE_TIP); c.set(10, 8, BONE_TIP); c.set(4, 12, BONE_SH); c.set(10, 12, BONE_SH)
    elif v == 2:  # a half-sunk skull
        for x in range(6, 11):
            c.set(x, 9, BONE)
            c.set(x, 10, BONE)
        for x in range(7, 10):
            c.set(x, 8, BONE)
        c.set(7, 10, BONE_SH); c.set(9, 10, BONE_SH)  # eye holes
        c.set(8, 8, BONE_TIP)
        for x in range(6, 11):
            c.set(x, 11, BONE_SH)
    else:  # a few chips
        for x, y, col in ((5, 11, BONE), (6, 11, BONE_SH), (9, 9, BONE), (10, 9, BONE_TIP), (10, 10, BONE_SH), (7, 13, BONE)):
            c.set(x, y, col)
    return c


def sheets() -> dict:
    """The two playtest2a sheets (name -> image)."""
    from pixel_writer import cells

    return {
        "floor-bone2.png": cells([floor_cell(v) for v in range(FLOOR_CELLS)]),
        "decal-bone2.png": cells([accent_cell(v) for v in range(ACCENT_CELLS)]),
    }
