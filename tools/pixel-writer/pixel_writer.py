"""Pixel writer.

Earmarked for Gravewake and for later games.
It draws real pixels: one color per pixel, no blending, no anti-alias, no new hues
beyond the colors you pass in. A tile is 16×16 unless you ask for another size.

Use it when a zone needs ground and a downloaded sheet does not fit.
Do not scale a photo down and call it a tile. Draw the pixels.
"""

from __future__ import annotations

import random
from PIL import Image


def _rgba(hex_color: str) -> tuple[int, int, int, int]:
    h = hex_color.lstrip("#")
    return (int(h[0:2], 16), int(h[2:4], 16), int(h[4:6], 16), 255)


class Tile:
    """One tile. Empty pixels stay transparent."""

    def __init__(self, n: int = 16):
        self.n = n
        self.p: list[list[str | None]] = [[None] * n for _ in range(n)]

    def set(self, x: int, y: int, color: str | None) -> None:
        if color and 0 <= x < self.n and 0 <= y < self.n:
            self.p[y][x] = color

    def rect(self, x: int, y: int, w: int, h: int, color: str) -> None:
        for yy in range(y, y + h):
            for xx in range(x, x + w):
                self.set(xx, yy, color)

    def fill(self, color: str) -> None:
        self.rect(0, 0, self.n, self.n, color)

    def image(self) -> Image.Image:
        im = Image.new("RGBA", (self.n, self.n), (0, 0, 0, 0))
        px = im.load()
        for y in range(self.n):
            for x in range(self.n):
                c = self.p[y][x]
                if c:
                    px[x, y] = _rgba(c)
        return im


def strip(tiles: list[Tile]) -> Image.Image:
    """Lay tiles in a row. The game reads them as columns of 16."""
    n = tiles[0].n
    out = Image.new("RGBA", (n * len(tiles), n), (0, 0, 0, 0))
    for i, tile in enumerate(tiles):
        out.paste(tile.image(), (i * n, 0))
    return out


def preview(tiles: list[Tile], scale: int = 4) -> Image.Image:
    """Nearest-neighbor contact sheet, so the pixels stay countable."""
    row = strip(tiles)
    return row.resize((row.width * scale, row.height * scale), Image.NEAREST)


def _inset(tile: Tile, color: str, pad: int = 1) -> None:
    """Keep a solid border so neighboring tiles of the same ground do not seam."""
    n = tile.n
    tile.rect(0, 0, n, pad, color)
    tile.rect(0, n - pad, n, pad, color)
    tile.rect(0, 0, pad, n, color)
    tile.rect(n - pad, 0, pad, n, color)


def grass(seed: int, base: str, dark: str, tip: str, spot: str, kind: int) -> Tile:
    """Meadow tile. Blades are 1px stems in clumps. The border stays the base color."""
    t = Tile()
    t.fill(base)
    rng = random.Random(seed)
    # Two clumps, so the tile is grass and not a flat square with three dots.
    for clump in range(2):
        cx = 3 + clump * 5 + (kind % 2)
        cy = 4 + (clump * 3 + kind) % 5
        for i in range(3):
            x = cx + (i - 1)
            h = 3 + ((seed + i + clump) % 3)
            y = cy
            t.rect(x, y, 1, h, dark)
            t.set(x, y, tip)
        t.rect(cx - 1, cy + 3, 3, 1, dark)
    if kind == 2:
        t.rect(6, 8, 3, 2, spot)
        t.set(7, 7, tip)
    elif kind == 3:
        t.rect(9, 9, 2, 2, dark)
        t.set(9, 8, spot)
    elif kind == 5:
        t.rect(4, 10, 3, 2, spot)
        t.set(5, 9, tip)
    elif kind == 7:
        t.set(8, 7, spot)
        t.set(9, 7, tip)
        t.set(8, 8, dark)
    elif kind % 2 == 0:
        t.set(5, 6, tip)
        t.set(11, 9, dark)
    _inset(t, base)
    if rng.randrange(2) == 0:
        t.set(4 + (seed % 7), 5 + (kind % 6), dark)
        _inset(t, base)
    return t


def soil(seed: int, base: str, dark: str, light: str, speck: str, kind: int) -> Tile:
    """Packed earth. Clods are 2×2, not single-pixel noise."""
    t = Tile()
    t.fill(base)
    rng = random.Random(seed)
    for i in range(3):
        x = 2 + rng.randrange(10)
        y = 2 + rng.randrange(10)
        t.rect(x, y, 2, 2, dark if i % 2 == 0 else light)
    if kind % 3 == 0:
        t.rect(6, 7, 4, 1, dark)
    elif kind % 3 == 1:
        t.rect(4, 5, 2, 2, speck)
    else:
        t.set(10, 4, light)
        t.set(11, 4, speck)
        t.set(10, 5, dark)
    _inset(t, base)
    return t


def brick(seed: int, fill: str, mortar: str, hi: str, shade: str) -> Tile:
    """Two brick courses. Joints stay on the same pixels so the floor tiles."""
    t = Tile()
    t.fill(mortar)
    # Top course, joint at x = 7. Bottom course, joints at x = 3 and x = 11.
    t.rect(0, 0, 7, 7, fill)
    t.rect(8, 0, 8, 7, fill)
    t.rect(0, 8, 3, 7, fill)
    t.rect(4, 8, 7, 7, fill)
    t.rect(12, 8, 4, 7, fill)
    for x, y, w, h in ((0, 0, 7, 7), (8, 0, 8, 7), (0, 8, 3, 7), (4, 8, 7, 7), (12, 8, 4, 7)):
        t.rect(x, y, w, 1, hi)
        t.rect(x, y + h - 1, w, 1, shade)
    rng = random.Random(seed)
    for _ in range(rng.randrange(1, 3)):
        t.set(rng.randrange(1, 15), rng.randrange(1, 14), shade if rng.randrange(2) else hi)
    # Put the mortar joints back. A chip must not erase the seam.
    t.rect(7, 0, 1, 7, mortar)
    t.rect(3, 8, 1, 7, mortar)
    t.rect(11, 8, 1, 7, mortar)
    t.rect(0, 7, 16, 1, mortar)
    t.rect(0, 15, 16, 1, mortar)
    return t


def pit(floor: str, hole: str, rim: str) -> Tile:
    """A square hole. The outer pixels stay the floor color."""
    t = Tile()
    t.fill(floor)
    t.rect(3, 3, 10, 10, rim)
    t.rect(4, 4, 8, 8, hole)
    t.rect(5, 5, 4, 2, rim)
    t.set(6, 6, floor)
    return t


def water(deep: str, mid: str, light: str, frame: int) -> Tile:
    """One frame of a pond. The ripple moves. The border stays deep so it tiles."""
    t = Tile()
    t.fill(deep)
    t.rect(0, 8, 16, 8, mid)
    y = 3 + (frame % 4)
    t.rect(2, y, 6, 1, light)
    t.rect(9, (y + 5) % 12 + 2, 5, 1, light)
    _inset(t, deep)
    return t


def field(seed: int, base: str, dark: str, light: str, kind: int) -> Tile:
    """Snow, sand, ash, or swamp. Same rule: clumps, then a solid border."""
    t = Tile()
    t.fill(base)
    rng = random.Random(seed + kind * 17)
    for i in range(2 + kind % 2):
        x = 2 + rng.randrange(10)
        y = 2 + rng.randrange(10)
        t.rect(x, y, 2 + (i % 2), 1 + (kind % 2), light if i == 0 else dark)
    if kind == 1:
        t.rect(7, 8, 1, 3, dark)
        t.rect(10, 8, 1, 3, dark)
    _inset(t, base)
    return t


# ---- Dungeon secrets: cracked brick, rune doors, braziers, saints. ----
# Overlays are drawn on top of the game's own cave wall, so they carry only the marks.

GLYPHS = {
    # 4 wide, 5 tall. Read left to right on a rune door.
    "moon": (".###", "##..", "#...", "##..", ".###"),
    "eye": ("....", ".##.", "#..#", ".##.", "...."),
    "cross": (".#..", "####", ".#..", ".#..", ".#.."),
}


def glyph(tile: Tile, x: int, y: int, name: str, color: str) -> None:
    for gy, row in enumerate(GLYPHS[name]):
        for gx, c in enumerate(row):
            if c == "#":
                tile.set(x + gx, y + gy, color)


def glyph_strip(names: list[str], colors: list[str]) -> Image.Image:
    """5x5 cells: for each glyph, one cell per color. Column = glyph * len(colors) + state."""
    out = Image.new("RGBA", (5 * len(names) * len(colors), 5), (0, 0, 0, 0))
    for gi, name in enumerate(names):
        for si, color in enumerate(colors):
            t = Tile(5)
            glyph(t, 0, 0, name, color)
            out.paste(t.image(), ((gi * len(colors) + si) * 5, 0))
    return out


def crack(kind: int, line: str, chip: str) -> Tile:
    """A hairline crack over a wall. One pixel wide, a lit lip under it, a little grit at the foot."""
    t = Tile()
    paths = (
        ((9, 0), (9, 1), (8, 2), (8, 3), (7, 4), (6, 5), (6, 6), (7, 7), (7, 8), (6, 9), (5, 10), (5, 11), (6, 12), (6, 13)),
        ((5, 0), (6, 1), (6, 2), (7, 3), (8, 4), (8, 5), (9, 6), (9, 7), (8, 8), (9, 9), (10, 10), (10, 11), (9, 12), (9, 13)),
    )
    branch = (((7, 7), (8, 7), (9, 8), (10, 8)), ((9, 6), (10, 5), (11, 5), (12, 4)))
    for x, y in paths[kind % 2]:
        t.set(x, y, line)
        if (x + y) % 3 == 0:
            t.set(x + 1, y, chip)
    for x, y in branch[kind % 2]:
        t.set(x, y, line)
    # Grit that fell out of the joint.
    t.set(4 + kind * 5, 15, chip)
    t.set(6 + kind * 3, 14, line)
    t.set(10 - kind * 4, 15, line)
    return t


def rune_door(frame: str, frame_hi: str, slab: str, band: str, rivet: str, slot: str) -> Tile:
    """A sealed slab in a stone frame. Three dark slots on top take the glyphs in code."""
    t = Tile()
    t.fill(slab)
    t.rect(0, 0, 16, 2, frame)
    t.rect(0, 0, 1, 16, frame)
    t.rect(15, 0, 1, 16, frame)
    t.rect(1, 0, 14, 1, frame_hi)
    t.rect(1, 2, 14, 6, slot)
    t.rect(1, 9, 14, 1, band)
    t.rect(1, 13, 14, 1, band)
    for x in (2, 13):
        t.set(x, 9, rivet)
        t.set(x, 13, rivet)
    t.rect(7, 10, 2, 3, slot)
    t.set(7, 11, band)
    return t


def sconce(iron: str, iron_mid: str, iron_hi: str, ash: str, ember: str, plate: str) -> Tile:
    """A wall brazier: bowl, stem, and a plate that takes one glyph at (6, 10)."""
    t = Tile()
    t.rect(3, 4, 10, 1, iron_hi)
    t.rect(3, 5, 10, 2, iron_mid)
    t.rect(4, 7, 8, 1, iron)
    t.rect(4, 3, 8, 1, ash)
    t.set(6, 3, ember)
    t.set(10, 3, ember)
    t.rect(7, 8, 2, 1, iron)
    t.rect(5, 9, 6, 7, iron)
    t.rect(6, 10, 4, 5, plate)
    t.set(5, 9, iron_mid)
    t.set(10, 9, iron_mid)
    return t


def flame(frame: int, deep: str, mid: str, light: str, core: str) -> Tile:
    """Fire for a brazier bowl. The base sits on row 15; the game lifts it onto the bowl."""
    t = Tile()
    lean = (0, 1, -1)[frame % 3]
    tip = (5, 7, 4)[frame % 3]
    t.rect(4, 13, 8, 3, deep)
    t.rect(5, 10, 6, 4, mid)
    t.rect(6 + lean, tip + 2, 4, 10 - tip, mid)
    t.rect(7 + lean, tip, 2, 2, deep)
    t.rect(6, 11, 4, 4, light)
    t.rect(7 + lean, tip + 4, 2, 7 - tip, light)
    t.rect(7, 13, 2, 2, core)
    if frame % 3 == 1:
        t.set(4, 11, deep)
    if frame % 3 == 2:
        t.set(11, 10, deep)
    return t


def saint(recess: str, stone: str, shade: str, hi: str, line: str) -> Tile:
    """A hooded stone saint in an arched niche. The plinth takes one glyph at (6, 11)."""
    t = Tile()
    t.rect(4, 1, 8, 15, recess)
    t.rect(3, 3, 10, 13, recess)
    # Hood and face.
    t.rect(6, 1, 4, 4, stone)
    t.rect(7, 2, 2, 2, line)
    t.set(6, 1, hi)
    # Shoulders and robe, lit from the upper left.
    t.rect(5, 5, 6, 5, stone)
    t.rect(9, 5, 2, 5, shade)
    t.rect(5, 5, 1, 4, hi)
    t.rect(7, 6, 2, 1, hi)
    t.rect(7, 7, 1, 3, shade)
    # Plinth.
    t.rect(4, 10, 8, 6, shade)
    t.rect(4, 10, 8, 1, hi)
    t.rect(5, 11, 6, 5, stone)
    return t


# ---- Floor traps: retracting spikes and pressure plates. Overlays on the game's own floor. ----

SPIKE_HOLES = ((3, 4), (7, 4), (11, 4), (3, 10), (7, 10), (11, 10))


def spike_grate(stage: int, frame: str, hole: str, iron: str, iron_hi: str, tip: str) -> Tile:
    """Stage 0: holes only. 1: tips show (the tell). 2: spikes up (it hurts)."""
    t = Tile()
    # An iron frame so a sleeping trap still reads as a trap.
    t.rect(1, 1, 14, 1, frame)
    t.rect(1, 14, 14, 1, frame)
    t.rect(1, 1, 1, 14, frame)
    t.rect(14, 1, 1, 14, frame)
    for x, y in SPIKE_HOLES:
        t.rect(x, y, 2, 2, hole)
        if stage == 1:
            t.set(x, y, iron_hi)
            t.set(x + 1, y, iron)
        if stage == 2:
            # Spike rises north of its hole: a lit left face, a dark right face, a pale tip.
            t.rect(x, y - 3, 1, 4, iron_hi)
            t.rect(x + 1, y - 3, 1, 4, iron)
            t.set(x, y - 3, tip)
            t.set(x + 1, y - 3, tip)
            t.set(x, y + 1, hole)
            t.set(x + 1, y + 1, hole)
    return t


def pressure_plate(pressed: bool, seam: str, face: str, face_hi: str, face_lo: str, mark: str) -> Tile:
    """A square slab with a dark seam. Pressed drops one pixel and darkens."""
    t = Tile()
    t.rect(2, 2, 12, 12, seam)
    if pressed:
        t.rect(3, 4, 10, 9, face_lo)
        t.rect(3, 4, 10, 1, face)
    else:
        t.rect(3, 3, 10, 10, face)
        t.rect(3, 3, 10, 1, face_hi)
        t.rect(3, 3, 1, 10, face_hi)
        t.rect(3, 12, 10, 1, face_lo)
        t.rect(12, 3, 1, 10, face_lo)
    # A small carved cross: the warning a careful hero can read.
    oy = 1 if pressed else 0
    t.rect(7, 6 + oy, 2, 4, mark)
    t.rect(6, 7 + oy, 4, 1, mark)
    return t


# ---- Rescue: the stake a captive is chained to. An overlay on the game's own floor. ----


def shackle(broken: bool, line: str, iron: str, iron_mid: str, iron_hi: str) -> Tile:
    """An iron stake driven into the floor, a chain, and an ankle cuff.

    Bound: the chain runs taut from the ring on the stake to a closed cuff where the captive's
    feet stand (left of middle). Broken: the chain hangs off the stake in two links and the cuff
    lies open on the floor.
    """
    t = Tile()
    # Stake: a ring on top, a post with a lit left face, a dark foot driven into the floor.
    t.rect(11, 6, 4, 1, line)
    t.rect(11, 9, 4, 1, line)
    t.rect(11, 7, 1, 2, line)
    t.rect(14, 7, 1, 2, line)
    t.rect(12, 7, 2, 2, iron_hi)
    t.rect(12, 8, 2, 1, iron)
    t.rect(12, 10, 2, 4, iron_mid)
    t.rect(12, 10, 1, 4, iron_hi)
    t.rect(11, 10, 1, 4, line)
    t.rect(14, 10, 1, 4, line)
    t.rect(11, 14, 4, 1, line)
    if not broken:
        # Taut chain: alternating links stepping down-left from the ring to the cuff.
        for i, (x, y) in enumerate(((10, 9), (9, 10), (8, 10), (7, 11), (6, 12))):
            t.set(x, y, iron_hi if i % 2 == 0 else iron_mid)
            t.set(x, y + 1, line)
        # Closed cuff round the ankle.
        t.rect(2, 12, 5, 3, line)
        t.rect(3, 12, 3, 1, iron_hi)
        t.rect(3, 14, 3, 1, iron)
        t.set(2, 13, iron_mid)
        t.set(6, 13, iron_mid)
    else:
        # Two links hang straight down off the ring; the rest of the chain is gone.
        t.set(10, 9, iron_hi)
        t.set(10, 10, line)
        t.set(10, 11, iron_mid)
        t.set(10, 12, line)
        # Open cuff on the floor: a C with its mouth to the right, and one loose link.
        t.rect(2, 12, 4, 1, line)
        t.rect(2, 14, 4, 1, line)
        t.set(2, 13, line)
        t.rect(3, 13, 2, 1, iron_hi)
        t.set(5, 13, iron)
        t.set(7, 14, iron_mid)
        t.set(8, 14, line)
    return t


def bounty_board(state: int, line: str, frame: str, cork: str, paper: str, paper_dk: str, ink: str, seal: str, pin: str) -> Tile:
    """The guild's night bounty board, hung on a wall. No writing: a wanted sheet carries a face in ink.

    state 0: tonight's sheet is up, pinned, with a red wax seal.
    state 1: paid, the same sheet slashed through in red.
    state 2: bare by day, one empty pin and a torn corner left behind.
    """
    t = Tile()
    # Frame and cork face, with a lit top edge and a dark foot.
    t.rect(1, 2, 14, 12, line)
    t.rect(2, 3, 12, 10, frame)
    t.rect(3, 4, 10, 8, cork)
    t.rect(2, 3, 12, 1, paper_dk)
    t.rect(2, 12, 12, 1, line)
    # Two hanging pegs at the top corners.
    t.set(3, 1, line)
    t.set(12, 1, line)
    if state in (0, 1):
        # The wanted sheet: parchment with a shaded right edge, a skull mark, a seal at its foot.
        t.rect(5, 4, 6, 8, paper)
        t.rect(10, 5, 1, 7, paper_dk)
        # A wanted face: a head and shoulders in ink, no letters.
        t.rect(7, 5, 2, 1, ink)
        t.rect(6, 6, 4, 1, ink)
        t.rect(7, 7, 2, 1, ink)
        t.rect(6, 8, 4, 2, ink)
        t.rect(7, 10, 2, 1, seal)
        t.set(7, 4, pin)
        if state == 1:
            for i in range(6):
                t.set(5 + i, 10 - i, seal)
    else:
        # Bare: an empty pin and a torn scrap.
        t.set(7, 5, pin)
        t.rect(9, 9, 2, 2, paper)
        t.set(10, 10, paper_dk)
    return t


def mimic_breath(glint: bool, lid: str, seam: str, tooth: str) -> Tile:
    """Overlay for a sleeping mimic, laid over the game's own chest (lid rows 6-8, body 9-12, x 3-12).
    The lid lifts one pixel (rows 5-7) and row 8 opens to a dark seam. With glint, two teeth catch the
    light in the seam. Only these pixels are set; the chest under them is the game's."""
    t = Tile()
    t.rect(3, 5, 10, 3, lid)
    t.rect(3, 8, 10, 1, seam)
    if glint:
        t.set(5, 8, tooth)
        t.set(10, 8, tooth)
    return t


def grave_dug(hole: str, rim: str, earth: str, earth_dk: str, earth_hi: str, line: str) -> Tile:
    """Item 8: a grave turned tonight. Laid at the foot of the game's own grave stone (drawn 9 px low):
    an open dark trench across the front, and a heap of fresh earth piled to its right. Only these pixels
    are set; the stone and the yard under them are the game's."""
    t = Tile()
    # The trench: a dark slot with a lit back lip and a shaded front lip.
    t.rect(2, 9, 10, 1, rim)
    t.rect(2, 10, 10, 3, hole)
    t.rect(2, 13, 10, 1, earth_dk)
    t.set(1, 10, earth_dk)
    t.set(1, 11, earth_dk)
    t.set(12, 11, earth_dk)
    # The heap: a lumpy dome to the right, outlined, two shades and a lit crown.
    t.rect(11, 7, 4, 1, line)
    t.rect(10, 8, 6, 6, line)
    t.rect(11, 8, 4, 5, earth)
    t.rect(11, 11, 4, 2, earth_dk)
    t.rect(12, 8, 2, 1, earth_hi)
    t.set(11, 9, earth_hi)
    # Loose clods thrown on the near side.
    t.set(4, 14, earth)
    t.set(8, 14, earth_dk)
    t.set(14, 14, earth)
    return t


def derby_trophy(line: str, wood: str, wood_hi: str, back: str, body: str, belly: str, glow: str, plate: str) -> Tile:
    """Item 9: the Midnight Derby trophy, hung on a wall. A witchlit fish mounted on a wooden shield,
    a small gold plate under it, no writing."""
    t = Tile()
    t.set(7, 1, line)
    t.set(8, 1, line)
    # The shield: outlined board, lit top edge, a rounded foot.
    t.rect(2, 2, 12, 11, line)
    t.rect(3, 3, 10, 9, wood)
    t.rect(3, 3, 10, 1, wood_hi)
    t.rect(4, 13, 8, 1, line)
    t.rect(4, 12, 8, 1, wood)
    # The fish, head left: dark back, pale belly, forked tail past the board's right edge.
    t.rect(4, 6, 8, 3, body)
    t.rect(5, 5, 6, 1, back)
    t.rect(5, 9, 6, 1, belly)
    t.rect(4, 8, 7, 1, belly)
    t.set(12, 5, back)
    t.set(12, 6, back)
    t.set(12, 8, back)
    t.set(12, 9, back)
    t.set(13, 5, back)
    t.set(13, 9, back)
    t.set(5, 6, line)
    # Witchlit: two cold sparks on the fin and the gill.
    t.set(8, 5, glow)
    t.set(7, 7, glow)
    # The plate.
    t.rect(6, 11, 4, 1, plate)
    return t


def croft_piece(kind: str, line: str, dark: str, wood: str, hi: str, glass: str, shine: str, metal: str, flame: str, cloth: str, leaf: str, berry: str) -> Tile:
    """Item 10: one piece of croft furniture, seen from the same high angle as the cottage bed and table.
    Each piece sits inside its own tile and stands on the floor's bottom rows so it reads as solid."""
    t = Tile()
    if kind == "cabinet":
        # Curio cabinet: tall case, two glass panes, odd things on the shelves.
        t.rect(3, 1, 10, 14, line)
        t.rect(4, 2, 8, 12, wood)
        t.rect(4, 2, 8, 1, hi)
        t.rect(5, 3, 6, 4, glass)
        t.rect(5, 8, 6, 4, glass)
        t.set(5, 3, shine)
        t.set(5, 8, shine)
        t.set(7, 5, metal)
        t.set(9, 6, flame)
        t.set(6, 10, berry)
        t.set(9, 10, shine)
        t.rect(4, 13, 8, 1, dark)
        t.set(4, 15, line)
        t.set(11, 15, line)
    elif kind == "bookcase":
        # Coffin bookcase: a coffin stood on end, its lid off, shelves of books inside.
        t.rect(5, 0, 6, 1, line)
        t.rect(4, 1, 8, 1, line)
        t.rect(3, 2, 10, 13, line)
        t.rect(4, 2, 8, 12, wood)
        t.rect(5, 1, 6, 1, hi)
        t.rect(5, 3, 6, 11, dark)
        for y, cols in ((3, (cloth, glass, leaf, hi, cloth, metal)), (7, (leaf, cloth, metal, glass, hi, cloth)), (11, (glass, hi, cloth, leaf, metal, glass))):
            for i, c in enumerate(cols):
                t.rect(5 + i, y, 1, 3, c)
            t.rect(5, y + 3, 6, 1, wood)
        t.rect(4, 14, 8, 1, line)
    elif kind == "candelabra":
        # Iron candelabra: three candles on a branched stand, one lit flame each.
        t.rect(7, 6, 2, 8, metal)
        t.rect(3, 7, 10, 1, metal)
        t.set(3, 6, metal)
        t.set(12, 6, metal)
        t.rect(5, 14, 6, 1, line)
        t.rect(6, 13, 4, 1, metal)
        for x in (3, 7, 12):
            w = 2 if x == 7 else 1
            t.rect(x, 3, w, 3, shine)
            t.set(x, 2, flame)
        t.set(7, 1, flame)
        t.set(8, 2, flame)
    elif kind == "armchair":
        # Wingback chair: tall back with wings, a seat cushion, short legs.
        t.rect(3, 2, 10, 12, line)
        t.rect(4, 3, 8, 7, cloth)
        t.rect(4, 3, 8, 1, hi)
        t.rect(3, 6, 2, 6, cloth)
        t.rect(11, 6, 2, 6, cloth)
        t.rect(5, 10, 6, 3, berry)
        t.rect(5, 10, 6, 1, shine)
        t.set(3, 6, line)
        t.set(12, 6, line)
        t.rect(4, 13, 8, 1, dark)
        t.set(4, 14, line)
        t.set(11, 14, line)
    elif kind == "perch":
        # Raven perch: a T-stand on a foot, a black bird with one gold eye.
        t.rect(7, 7, 2, 7, wood)
        t.rect(3, 7, 10, 1, wood)
        t.rect(3, 8, 10, 1, dark)
        t.rect(5, 14, 6, 1, line)
        t.rect(6, 2, 4, 5, line)
        t.rect(5, 3, 2, 3, line)
        t.rect(10, 4, 2, 2, line)
        t.set(5, 3, metal)
        t.set(4, 3, metal)
        t.set(7, 3, flame)
        t.rect(8, 4, 2, 1, glass)
    elif kind == "planter":
        # Nightshade planter: clay pot, dark leaves, purple flowers and black berries.
        t.rect(4, 10, 8, 5, line)
        t.rect(5, 10, 6, 4, wood)
        t.rect(5, 10, 6, 1, hi)
        t.rect(4, 9, 8, 1, dark)
        t.rect(5, 3, 6, 6, leaf)
        t.rect(3, 5, 2, 3, leaf)
        t.rect(11, 4, 2, 3, leaf)
        t.set(6, 2, leaf)
        t.set(9, 2, leaf)
        t.set(6, 4, berry)
        t.set(10, 5, berry)
        t.set(4, 6, berry)
        t.set(8, 7, line)
        t.set(7, 6, line)
        t.set(12, 5, shine)
    return t


def boss_plaque(line: str, wood: str, wood_hi: str, back: str, plate: str) -> Tile:
    """Item 10: the mount for a boss trophy. The same shield as the derby trophy, with a dark felt
    window; the game draws the boss's crowned head from the foe sheet into the window (x 3-12, y 2-11)."""
    t = Tile()
    t.set(7, 1, line)
    t.set(8, 1, line)
    t.rect(2, 2, 12, 11, line)
    t.rect(3, 3, 10, 9, wood)
    t.rect(3, 3, 10, 1, wood_hi)
    t.rect(4, 4, 8, 7, back)
    t.rect(4, 13, 8, 1, line)
    t.rect(4, 12, 8, 1, wood)
    t.rect(6, 12, 4, 1, plate)
    return t


# ---- Item 13: season tints ----
# One season tint is a colour-for-colour remap of an existing sheet: each source colour is turned by the
# season's mood (in HSV), then snapped to the nearest colour in the palette you pass (the locked list).
# No pixel is blended, so the result holds only palette colours. Ink and snow-white stay as they are.
SEASON_TINT = {
    # leaf greens (hue 55-175) per season; "ground" sheets use the softer ground line where it differs
    "autumn": {"tree": "green hue -> 18-36, saturation x1.45 +0.1, value x1.12", "ground": "green hue -> 40-50, saturation x0.95, value x0.92"},
    "winter": {"all": "saturation x0.3, value x0.6 +0.32, hue 205 (frost)"},
    "spring": {"all": "green hue -> 100, saturation x0.95, value x1.04; bright warm foliage -> hue 110, saturation x0.8"},
    "summer": {"all": "green and warm hues -> 45 (straw), saturation x0.45, value x0.82"},
}


def _snap(c: tuple[int, int, int], palette: list[tuple[int, int, int]]) -> tuple[int, int, int]:
    """Nearest palette colour by the red-mean weighted RGB distance."""
    best = None
    for t in palette:
        rm = (c[0] + t[0]) / 2
        dr, dg, db = c[0] - t[0], c[1] - t[1], c[2] - t[2]
        d = (2 + rm / 256) * dr * dr + 4 * dg * dg + (2 + (255 - rm) / 256) * db * db
        if best is None or d < best[0]:
            best = (d, t)
    return best[1]


def _season_turn(c: tuple[int, int, int], season: str, kind: str) -> tuple[int, int, int]:
    import colorsys

    r, g, b = (x / 255 for x in c)
    h, s, v = colorsys.rgb_to_hsv(r, g, b)
    hue = h * 360
    if v < 0.13 or (s < 0.12 and v > 0.8):
        return c
    green = 55 <= hue <= 175
    warm = hue < 55 or hue > 330
    if season == "autumn":
        if green and kind == "tree":
            hue, s, v = 18 + (hue - 55) * 0.15, min(1, s * 1.45 + 0.1), min(1, v * 1.12)
        elif green:
            hue, s, v = 40 + (hue - 55) * 0.08, min(1, s * 0.95), v * 0.92
    elif season == "winter":
        s, v = s * 0.3, v * 0.6 + 0.32
        hue = 205 if s > 0.05 else hue
    elif season == "spring":
        if green:
            hue, s, v = 100, min(1, s * 0.95), min(1, v * 1.04)
        elif warm and s > 0.45 and v > 0.5:
            hue, s = 110, s * 0.8
    elif season == "summer":
        if green or warm:
            hue = 45
        s, v = s * 0.45, v * 0.82
    r, g, b = colorsys.hsv_to_rgb((hue % 360) / 360, max(0.0, min(1.0, s)), max(0.0, min(1.0, v)))
    return (round(r * 255), round(g * 255), round(b * 255))


def season_remap(src: Image.Image, season: str, kind: str, palette_hex) -> tuple[Image.Image, dict]:
    """A season tint of a whole sheet. Returns the new sheet and its colour map (source hex -> palette hex)."""
    palette = [tuple(int(h[i:i + 2], 16) for i in (1, 3, 5)) for h in sorted(palette_hex)]
    im = src.convert("RGBA")
    out = im.copy()
    px = out.load()
    used: dict[tuple[int, int, int], tuple[int, int, int]] = {}
    for y in range(im.height):
        for x in range(im.width):
            p = px[x, y]
            if p[3] == 0:
                continue
            c = p[:3]
            if c not in used:
                used[c] = _snap(_season_turn(c, season, kind), palette)
            px[x, y] = used[c] + (255,)
    hexed = {"#%02x%02x%02x" % k: "#%02x%02x%02x" % v for k, v in used.items()}
    return out, hexed


def festival_prop(kind: str, line: str, rind: str, rind_dk: str, stem: str, post: str, post_hi: str, glow: str, hot: str,
                  stone: str, stone_dk: str, snow: str, snow_dk: str, cloth: str) -> Tile:
    """Items 12/14: festival props on 16x16 town tiles.
    harvest-unlit / harvest-lit: a carved pumpkin lantern on a short post (Harvest Moon lantern game).
    snow-lit: a stone snow lantern with a snow cap and a warm window (Krampusnacht in town).
    stall: Hessa's carving table, a cloth and a heap of uncut pumpkins."""
    t = Tile()
    if kind.startswith("harvest"):
        lit = kind.endswith("lit") and not kind.endswith("unlit")
        t.rect(7, 12, 2, 3, post)
        t.set(7, 12, post_hi)
        t.rect(5, 15, 6, 1, line)
        # the pumpkin: outlined, ribbed
        t.rect(3, 4, 10, 1, line)
        t.rect(2, 5, 12, 6, line)
        t.rect(3, 11, 10, 1, line)
        t.rect(3, 5, 10, 6, rind)
        t.rect(4, 4, 8, 1, rind)
        t.rect(4, 11, 8, 1, rind)
        for x in (5, 8, 10):
            t.rect(x, 5, 1, 6, rind_dk)
        t.rect(7, 2, 2, 2, stem)
        face = glow if lit else line
        t.set(5, 6, face)
        t.set(6, 7, face)
        t.set(5, 7, face)
        t.set(10, 6, face)
        t.set(9, 7, face)
        t.set(10, 7, face)
        for x in range(4, 12):
            t.set(x, 9 if x % 2 == 0 else 10, face)
        if lit:
            t.set(7, 9, hot)
            t.set(8, 10, hot)
            t.set(1, 3, glow)
            t.set(14, 4, glow)
            t.set(12, 1, hot)
    elif kind == "snow-lit":
        # base and post
        t.rect(5, 14, 6, 2, stone_dk)
        t.rect(6, 10, 4, 4, stone)
        t.rect(6, 10, 1, 4, stone_dk)
        # the light box with a warm window
        t.rect(4, 6, 8, 4, stone)
        t.rect(6, 7, 4, 2, glow)
        t.set(7, 7, hot)
        t.rect(4, 6, 1, 4, stone_dk)
        # roof cap heaped with snow
        t.rect(2, 4, 12, 2, stone_dk)
        t.rect(3, 2, 10, 2, snow)
        t.rect(5, 1, 6, 1, snow)
        t.rect(3, 3, 10, 1, snow_dk)
        t.set(13, 5, snow)
        t.set(2, 5, snow)
    elif kind == "stall":
        # a trestle table with a cloth, pumpkins heaped on it
        t.rect(1, 9, 14, 1, line)
        t.rect(1, 10, 14, 3, cloth)
        t.rect(1, 13, 14, 1, line)
        t.rect(2, 14, 1, 2, post)
        t.rect(13, 14, 1, 2, post)
        for (x, y, w) in ((2, 5, 5), (8, 6, 4), (5, 3, 4), (11, 4, 3)):
            t.rect(x, y, w, 4 if w > 3 else 3, rind)
            t.rect(x, y, w, 1, rind_dk)
            t.set(x + w // 2, y - 1, stem)
    # ink outline round every painted pixel, like the sprite bodies
    src = [row[:] for row in t.p]
    for y in range(t.n):
        for x in range(t.n):
            if src[y][x] is None and any(0 <= x + dx < t.n and 0 <= y + dy < t.n and src[y + dy][x + dx] for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1))):
                t.p[y][x] = line
    return t


def _ink(t: Tile, line: str) -> Tile:
    """Ink outline round every painted pixel, like the sprite bodies."""
    src = [row[:] for row in t.p]
    for y in range(t.n):
        for x in range(t.n):
            if src[y][x] is None and any(0 <= x + dx < t.n and 0 <= y + dy < t.n and src[y + dy][x + dx] for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1))):
                t.p[y][x] = line
    return t


def bloom_prop(kind: str, line: str, water: str, water_hi: str, glint: str, petal: str, petal_dk: str, heart: str,
               pad: str, pad_dk: str, stone: str, stone_dk: str, post: str, post_hi: str, cloth: str) -> Tile:
    """Drowned Bloom (spring festival) props on 16x16 tiles.
    bowl: a stone bowl of flood water on a short post, a pale bloom floating in it (the six plaza posts).
    stall: Ottla's trestle, a wet cloth, baskets of blooms and a dripping net.
    bloom: one drowned bloom on its lily pad, to sit on flooded ground (walk onto it to pick it)."""
    t = Tile()
    if kind == "bowl":
        t.rect(7, 12, 2, 3, post)
        t.set(7, 12, post_hi)
        t.rect(5, 15, 6, 1, line)
        t.rect(2, 7, 12, 1, stone)
        t.rect(3, 8, 10, 3, stone)
        t.rect(3, 10, 10, 1, stone_dk)
        t.rect(5, 11, 6, 1, stone_dk)
        t.rect(3, 6, 10, 1, water)
        t.rect(4, 6, 3, 1, water_hi)
        t.set(11, 6, glint)
        # the bloom: five petals round a dusky heart
        t.rect(6, 3, 4, 3, petal)
        t.set(5, 4, petal)
        t.set(10, 4, petal)
        t.set(7, 2, petal)
        t.set(8, 2, petal_dk)
        t.rect(7, 4, 2, 1, heart)
        t.set(6, 5, petal_dk)
        t.set(9, 5, petal_dk)
        t.set(4, 6, pad)
        t.set(10, 6, pad_dk)
    elif kind == "stall":
        t.rect(1, 9, 14, 1, line)
        t.rect(1, 10, 14, 3, cloth)
        t.rect(1, 12, 14, 1, water)
        t.rect(1, 13, 14, 1, line)
        t.rect(2, 14, 1, 2, post)
        t.rect(13, 14, 1, 2, post)
        # two baskets heaped with blooms
        for bx in (2, 8):
            t.rect(bx, 6, 6, 3, post)
            t.rect(bx, 6, 6, 1, post_hi)
            t.rect(bx + 1, 4, 4, 2, petal)
            t.set(bx + 2, 4, heart)
            t.set(bx + 4, 5, petal_dk)
            t.set(bx, 5, pad)
        # a net hung off the trestle, dripping
        for x in range(1, 15, 2):
            t.set(x, 13, stone)
        t.set(4, 14, glint)
        t.set(10, 15, glint)
    elif kind == "bloom":
        # the pad, notched, with a ripple ring
        t.rect(2, 11, 12, 2, pad)
        t.rect(3, 13, 10, 1, pad_dk)
        t.rect(3, 10, 10, 1, pad)
        t.set(8, 11, water)
        t.set(8, 12, water)
        t.rect(0, 14, 3, 1, water_hi)
        t.rect(13, 14, 3, 1, water_hi)
        t.set(1, 12, glint)
        # a water lily: pointed petals fanned round a dusky heart
        for x, top in ((3, 7), (5, 4), (7, 2), (8, 2), (10, 4), (12, 7)):
            t.rect(x, top, 1, 10 - top, petal)
        # the gaps between petals stay empty up top, so the ink pass draws a line down each one
        t.rect(4, 8, 1, 2, petal_dk)
        t.rect(6, 7, 1, 3, petal_dk)
        t.rect(9, 7, 1, 3, petal_dk)
        t.rect(11, 8, 1, 2, petal_dk)
        t.rect(7, 7, 2, 2, heart)
        t.set(7, 2, heart)
        t.set(5, 4, heart)
        t.set(10, 4, heart)
    return _ink(t, line)


def fair_prop(kind: str, line: str, iron: str, iron_dk: str, iron_hi: str, ember: str, flame: str, flame_hi: str, flame_hot: str,
              ash: str, wood: str, wood_hi: str, stripe: str, stripe_lt: str, moon: str, moon_dk: str) -> Tile:
    """Ashen Fair (summer festival) props on 16x16 tiles.
    brazier / flare: an iron fire-basket on three legs, banked embers, or the flare the barker calls.
    booth: Sallow's striped booth, a burning moon painted on the board above the counter."""
    t = Tile()
    if kind in ("brazier", "flare"):
        t.set(4, 15, iron_dk)
        t.set(11, 15, iron_dk)
        t.rect(5, 12, 1, 3, iron)
        t.rect(10, 12, 1, 3, iron)
        t.rect(7, 12, 2, 4, iron_dk)
        t.rect(3, 9, 10, 1, iron_hi)
        t.rect(3, 10, 10, 2, iron)
        t.rect(4, 11, 8, 1, iron_dk)
        for x in (4, 7, 10):
            t.set(x, 10, iron_dk)
        if kind == "brazier":
            t.rect(4, 8, 8, 1, ember)
            t.rect(5, 7, 6, 1, flame)
            t.set(7, 6, flame_hi)
            t.set(8, 5, flame)
            t.set(6, 8, ash)
            t.set(10, 8, ash)
        else:
            t.rect(4, 8, 8, 1, flame)
            t.rect(4, 6, 8, 2, flame)
            t.rect(5, 4, 6, 2, flame_hi)
            t.rect(6, 2, 4, 2, flame)
            t.rect(7, 4, 2, 3, flame_hot)
            t.set(7, 1, flame_hi)
            t.set(9, 0, flame)
            t.set(2, 5, ember)
            t.set(13, 3, ember)
            t.set(12, 1, flame_hi)
    elif kind == "booth":
        # posts and counter
        t.rect(1, 6, 1, 10, wood)
        t.rect(14, 6, 1, 10, wood)
        t.rect(1, 11, 14, 1, wood_hi)
        t.rect(2, 12, 12, 3, stripe)
        for x in range(2, 14, 4):
            t.rect(x, 12, 2, 3, stripe_lt)
        # the striped awning, scalloped
        t.rect(0, 4, 16, 2, stripe_lt)
        for x in range(0, 16, 4):
            t.rect(x, 4, 2, 2, stripe)
        for x in range(1, 16, 2):
            t.set(x, 6, stripe if (x // 2) % 2 == 0 else stripe_lt)
        # the board above: a burning moon
        t.rect(4, 0, 8, 4, wood)
        t.rect(6, 1, 4, 3, moon)
        t.set(9, 1, moon_dk)
        t.set(9, 3, moon_dk)
        t.set(5, 0, flame)
        t.set(10, 0, flame_hi)
        t.set(7, 0, flame)
        # prizes on the counter
        t.set(4, 10, flame_hi)
        t.set(8, 10, iron_hi)
        t.set(11, 10, moon)
    return _ink(t, line)


def flood_tile(i: int, deep: str, shallow: str, ripple: str, glint: str, reed: str) -> Tile:
    """Drowned Bloom: shallow flood over ground, 16x16. Patchy on purpose: the ground shows through the gaps,
    so it reads as water over grass, not a lake. One color per pixel; transparent where it is dry."""
    t = Tile()
    rng = random.Random(9100 + i * 37)
    # three or four puddles, flattened ovals that may run off the edge (so tiles join into sheets of water)
    pools = [(rng.randrange(-2, 16), rng.randrange(0, 16), rng.randrange(4, 9), rng.randrange(2, 4)) for _ in range(3 + i % 2)]
    for y in range(16):
        for x in range(16):
            wet = any(((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 <= 1.0 for cx, cy, rx, ry in pools)
            if wet:
                t.set(x, y, deep if (x * 7 + y * 3 + i) % 9 else shallow)
    for cx, cy, rx, ry in pools:
        # a ripple line along the top of each pool, a glint at its end
        t.rect(max(0, cx - rx // 2), cy - ry + 1, max(1, rx - 1), 1, ripple)
        t.set(min(15, cx + rx // 2), cy - ry + 1, glint)
    rx = rng.randrange(2, 14)
    t.rect(rx, 9, 1, 4, reed)
    t.set(rx + 1, 10, reed)
    return t


def border_mask(kind: str, v: int, ink: str) -> Tile:
    """Map writer phase 2 (biome blending): a fringe mask, 16x16, one ink, hard alpha. The game paints the
    neighbouring biome's own ground through it, so the border adds no colours of its own.
    kind n / e / s / w: a ragged band along that side, 2-4 px solid, then one checker row and one sparse
    row of light dither (3-6 px in all). The band is 2 px solid at both ends, so masks meet along a border.
    kind ne / se / sw / nw: a small nibbled corner, for the diagonal case the bands miss."""
    t = Tile()
    if len(kind) == 2:
        fx = kind[1] == "e"
        fy = kind[0] == "s"
        for y in range(16):
            for x in range(16):
                dx = 15 - x if fx else x
                dy = 15 - y if fy else y
                d = dx + dy
                if d <= 2 or (d == 3 and (x + y) % 2 == 0) or (d == 4 and (x + 2 * y) % 4 == 0):
                    t.set(x, y, ink)
        return t
    rng = random.Random(9400 + "nesw".index(kind) * 7 + v * 53)
    depth = [2] * 16
    d = 2
    for c in range(1, 15):
        d = max(2, min(4, d + rng.choice((-1, 0, 0, 1))))
        depth[c] = d
    for c in range(16):
        for r in range(6):
            solid = r < depth[c]
            dither = r == depth[c] and (c + v) % 2 == 0
            sparse = r == depth[c] + 1 and (c + 2 * v) % 4 == 1
            if not (solid or dither or sparse):
                continue
            x, y = {"n": (c, r), "s": (c, 15 - r), "w": (r, c), "e": (15 - r, c)}[kind]
            t.set(x, y, ink)
    return t


# ---------------------------------------------------------------------------------------------------------------
# Core Keeper-style graphics pass, batch 1 (OWNER-APPROVED 2026-10-01: CORE KEEPER GRAPHICS PASS C1-C11).
# Wall kit (wall_top / wall_face / wall_rim), the 4-frame lamp sheet the law asks for (lamp_flicker), and a
# reusable stone portal gate with a spinning vortex (portal_gate). Every colour is passed in; nothing is mixed.


class Canvas(Tile):
    """A w x h cell. Wall cells are 16x32 (the tile is the bottom 16 rows), portal gates 32x48."""

    def __init__(self, w: int, h: int):
        self.w, self.h = w, h
        self.n = w
        self.p = [[None] * w for _ in range(h)]

    def set(self, x: int, y: int, color: str | None) -> None:
        if color and 0 <= x < self.w and 0 <= y < self.h:
            self.p[y][x] = color

    def get(self, x: int, y: int) -> str | None:
        return self.p[y][x] if 0 <= x < self.w and 0 <= y < self.h else None

    def fill(self, color: str) -> None:
        self.rect(0, 0, self.w, self.h, color)

    def image(self) -> Image.Image:
        im = Image.new("RGBA", (self.w, self.h), (0, 0, 0, 0))
        px = im.load()
        for y in range(self.h):
            for x in range(self.w):
                c = self.p[y][x]
                if c:
                    px[x, y] = _rgba(c)
        return im


def cells(items: list[Canvas]) -> Image.Image:
    """Lay same-size cells in a row (the game reads them with a stride of the cell width)."""
    w, h = items[0].w, items[0].h
    out = Image.new("RGBA", (w * len(items), h), (0, 0, 0, 0))
    for i, c in enumerate(items):
        out.paste(c.image(), (i * w, 0))
    return out


def _hex3(c: str) -> tuple[int, int, int]:
    h = c.lstrip("#")
    return (int(h[0:2], 16), int(h[2:4], 16), int(h[4:6], 16))


def _lum(c: str) -> float:
    r, g, b = _hex3(c)
    return 0.299 * r + 0.587 * g + 0.114 * b


def wall_ramp(wall: str, hi: str, palette) -> list[str]:
    """Six steps for a wall, dark to light, all from the palette: 0 contact shadow, 1 mortar and top mass,
    2 top texture, 3 the wall itself, 4 its light (the rim), 5 the bright lip. Darker steps lean violet and
    lighter steps lean warm (the doc's hue-shift rule); each step is strictly lighter than the one before."""
    pal = sorted({c.lower() for c in palette})
    w, h = _hex3(wall), _hex3(hi)

    def mix(a, b, t):
        return tuple(round(a[i] + (b[i] - a[i]) * t) for i in range(3))

    def pick(target, lo, top):
        cands = [c for c in pal if lo < _lum(c) < top]
        best = None
        for c in cands:
            t = _hex3(c)
            rm = (target[0] + t[0]) / 2
            dr, dg, db = target[0] - t[0], target[1] - t[1], target[2] - t[2]
            d = (2 + rm / 256) * dr * dr + 4 * dg * dg + (2 + (255 - rm) / 256) * db * db
            if best is None or d < best[0]:
                best = (d, c)
        return best[1]

    s3, s4 = wall.lower(), hi.lower()
    s2 = pick(mix(w, (16, 10, 28), 0.3), 4, _lum(s3) - 3)
    s1 = pick(mix(w, (16, 10, 28), 0.58), 2, _lum(s2) - 3)
    s0 = pick(mix(w, (8, 6, 12), 0.82), 0, _lum(s1) - 2)
    s5 = pick(mix(h, (240, 224, 192), 0.38), _lum(s4) + 6, 256)
    return [s0, s1, s2, s3, s4, s5]


def wall_face(ramp: list[str], height: int, seed: int, feature: str = "plain", extra: dict | None = None) -> Canvas:
    """The south face of a wall, `height` px (16 thin, 24 default, 32 chapel), in the bottom rows of a 16x32 cell.
    Lip steps 5/4, courses 4 px tall and 8 wide offset by half, brick top row +1, mortar step 1, and the bottom
    two rows contact shadow (1/0). Features: crack, moss (drips under the lip), niche (a skull in a recess)."""
    s0, s1, s2, s3, s4, s5 = ramp
    c = Canvas(16, 32)
    top = 32 - height
    c.rect(0, top, 16, 1, s5)
    c.rect(0, top + 1, 16, 1, s4)
    rng = random.Random(seed)
    y = top + 2
    course = 0
    while y + 4 <= 30:
        off = 4 if course % 2 else 0
        c.rect(0, y, 16, 1, s1)
        for x in range(16):
            joint = (x + off) % 8 == 0
            c.set(x, y + 1, s1 if joint else s4)
            c.set(x, y + 2, s1 if joint else s3)
            c.set(x, y + 3, s1 if joint else (s2 if (x + off) % 8 == 7 else s3))
        # one darker brick now and then, so the courses do not read as wallpaper
        if rng.random() < 0.35:
            bx = (rng.randrange(2) * 8 - off) % 16
            for x in range(bx + 1, bx + 7):
                c.set(x % 16, y + 2, s2)
        course += 1
        y += 4
    c.rect(0, 30, 16, 1, s1)
    c.rect(0, 31, 16, 1, s0)
    if feature == "crack":
        x = rng.randrange(4, 11)
        for yy in range(top + 3, min(top + 3 + 9, 29)):
            c.set(x, yy, s0)
            if rng.random() < 0.4:
                x += rng.choice((-1, 1))
                c.set(x, yy, s0)
    elif feature == "moss" and extra:
        dark, mid = extra["moss"]
        for x in (2, 3, 7, 11, 12, 13):
            ln = 1 + (x * 5 + seed) % 3
            for yy in range(top + 2, top + 2 + ln):
                c.set(x, yy, mid if yy == top + 2 else dark)
    elif feature == "niche" and extra:
        bone, eye = extra["bone"]
        ny = top + 6
        c.rect(4, ny, 8, 7, s0)
        c.rect(4, ny, 8, 1, s1)
        c.rect(5, ny + 2, 6, 5, s0)
        c.rect(6, ny + 2, 4, 3, bone)
        c.rect(7, ny + 5, 2, 1, bone)
        c.set(6, ny + 3, eye)
        c.set(9, ny + 3, eye)
        c.rect(3, ny + 7, 10, 1, s5)
    return c


def wall_top(ramp: list[str], seed: int) -> Canvas:
    """The top of a wall mass: steps 1-3 in soft clusters with stone-course seams at step 0 (the light layer
    pushes it to near-black). The tile is the bottom 16 rows of a 16x32 cell; seams sit on fixed rows so tops tile."""
    s0, s1, s2, s3 = ramp[0], ramp[1], ramp[2], ramp[3]
    c = Canvas(16, 32)
    c.rect(0, 16, 16, 16, s1)
    rng = random.Random(seed)
    for _ in range(4):
        x, y = rng.randrange(0, 14), rng.randrange(17, 30)
        c.rect(x, y, 3, 2, s2)
        c.set(x + 1, y, s3 if rng.random() < 0.3 else s2)
    # two wandering seams instead of brick courses, so a top never reads as floor
    for start in (19 + seed % 3, 26 + seed % 4):
        y = start
        for x in range(16):
            c.set(x, y, s0)
            if rng.random() < 0.35:
                y = max(17, min(30, y + rng.choice((-1, 1))))
                c.set(x, y, s0)
    return c


def wall_rim(ramp: list[str], side: str) -> Canvas:
    """The 2 px rim on the edge of a wall top that faces the room: step 4 over step 3 (n, w or e)."""
    s3, s4 = ramp[3], ramp[4]
    c = Canvas(16, 32)
    if side == "n":
        c.rect(0, 16, 16, 1, s4)
        c.rect(0, 17, 16, 1, s3)
    elif side == "w":
        c.rect(0, 16, 1, 16, s4)
        c.rect(1, 16, 1, 16, s3)
    else:
        c.rect(15, 16, 1, 16, s4)
        c.rect(14, 16, 1, 16, s3)
    return c


def lamp_bracket(line: str, iron: str, iron_hi: str, wood: str, wood_hi: str) -> Tile:
    """A wall torch: an iron bracket on the face and a short wooden torch. The flame (lamp_flicker) sits on
    rows 0-6 above the torch head at (6..9, 7)."""
    t = Tile()
    t.rect(5, 12, 6, 2, iron)
    t.rect(5, 12, 6, 1, iron_hi)
    t.rect(7, 14, 2, 1, line)
    t.rect(7, 8, 2, 5, wood)
    t.set(7, 8, wood_hi)
    t.rect(6, 7, 4, 1, iron)
    t.rect(6, 6, 4, 1, line)
    return t


def lamp_flicker(frame: int, deep: str, mid: str, light: str, core: str) -> Tile:
    """The 4-frame lamp flame from the law (a small torch flame, base on row 6). Emissive: the game draws it
    after the light layer."""
    t = Tile()
    lean = (0, 1, 0, -1)[frame % 4]
    tip = (0, 1, 1, 0)[frame % 4]
    t.rect(6, 4, 4, 3, deep)
    t.rect(6, 3 + tip, 4, 3 - tip, mid)
    t.rect(7 + lean, 1 + tip, 2, 3, mid)
    t.set(7 + lean + (1 if lean >= 0 else 0), tip, deep)
    t.rect(7, 4, 2, 2, light)
    t.set(7 + max(0, lean), 3, light)
    t.set(8, 5, core)
    return t


def _gate_shape(w: int, h: int):
    """Stone and opening masks for a 32x48 arch. The opening is a tall round-topped doorway; the threshold
    slab is the bottom rows."""
    cx = (w - 1) / 2
    stone, hole = set(), set()
    spring = 16  # where the arch meets the pillars
    for y in range(h):
        for x in range(w):
            dx = x - cx
            if y < spring:
                if (dx / 16.0) ** 2 + ((y - spring) / 16.0) ** 2 > 1.0:
                    continue
            if y >= h - 3 and (x < 1 or x > w - 2):
                continue
            inner = abs(dx) < 9.5 and (y >= spring + 1 or (dx / 9.5) ** 2 + ((y - spring - 1) / 13.0) ** 2 <= 1.0)
            if inner and y < h - 4:
                hole.add((x, y))
            else:
                stone.add((x, y))
    return stone, hole


def portal_gate(part: int, pal: dict) -> Canvas:
    """A stone portal gate, 32x48, base on row 47, its doorway centred on the middle tile.
    part 0 is the arch (stone, keystone and runes); parts 1..8 are the vortex inside the doorway, one spin step
    each (three arms, so eight steps turn the swirl a third of a turn and the loop is seamless).
    pal: stone (6 steps, 0 = line), rune (2), vortex (5, dark to light), core (centre), spark (2, the ember glints),
    ash (1-2 grey motes). The vortex never leaves the doorway, so the game can draw it after the light layer."""
    import math

    W, H = 32, 48
    c = Canvas(W, H)
    stone, hole = _gate_shape(W, H)
    st = pal["stone"]
    cx = (W - 1) / 2
    if part == 0:
        for (x, y) in stone:
            c.set(x, y, st[3])
        # voussoirs on the arch, courses on the pillars, a keystone at the top, a plinth at the foot
        for (x, y) in stone:
            dx, dy = x - cx, y - 16.5
            if y < 17:
                ang = math.degrees(math.atan2(-dy, dx))
                if abs((ang % 22.5) - 11.25) > 10.4 and abs(dx) > 3:
                    c.set(x, y, st[1])
            elif (y - 17) % 6 == 0 and y < H - 4:
                c.set(x, y, st[1])
            elif (y - 17) % 12 < 6 and x in (3, 28) and y < H - 4:
                c.set(x, y, st[1])
            elif (y - 17) % 12 >= 6 and x in (5, 26) and y < H - 4:
                c.set(x, y, st[1])
        for y in range(0, 7):
            for x in range(13, 19):
                if (x, y) in stone:
                    c.set(x, y, st[4] if y < 2 else st[3])
        for x in range(13, 19):
            if (x, 7) in stone:
                c.set(x, 7, st[1])
        c.set(15, 3, pal["rune"][0])
        c.set(16, 3, pal["rune"][0])
        c.set(15, 4, pal["rune"][1])
        c.set(16, 4, pal["rune"][1])
        for y in range(H - 6, H):
            for x in range(W):
                if (x, y) in stone and (x < 7 or x > 24):
                    c.set(x, y, st[2] if y == H - 6 else st[3])
        c.rect(1, H - 6, 6, 1, st[4])
        c.rect(25, H - 6, 6, 1, st[4])
        # threshold slab under the doorway
        for x in range(7, 25):
            c.set(x, H - 4, st[4])
            c.set(x, H - 3, st[3])
            c.set(x, H - 2, st[2])
            c.set(x, H - 1, st[1])
        # carved runes down each pillar, lit from inside
        for i, y in enumerate((22, 29, 36)):
            c.set(3, y, pal["rune"][i % 2])
            c.set(3, y + 1, pal["rune"][0])
            c.set(28, y + 2, pal["rune"][(i + 1) % 2])
            c.set(28, y + 3, pal["rune"][0])
        # light from the top left: a +1 edge on the top and left, -1 on the right and bottom of each mass
        for (x, y) in stone:
            if c.get(x, y) == st[1]:
                continue
            up = (x, y - 1) not in stone
            lf = (x - 1, y) not in stone or (x - 1, y) in hole
            rt = (x + 1, y) not in stone or (x + 1, y) in hole
            if up or (lf and x < cx):
                c.set(x, y, st[4] if c.get(x, y) != st[2] else st[3])
            elif rt and x > cx:
                c.set(x, y, st[2])
        # the doorway's own edge reads as a dark recess; the outside silhouette gets the line
        for (x, y) in stone:
            if any((x + dx, y + dy) in hole for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1))):
                c.set(x, y, st[1])
            if any((x + dx, y + dy) not in stone and (x + dx, y + dy) not in hole for dx, dy in ((1, 0), (-1, 0), (0, -1))):
                c.set(x, y, st[0])
        return c
    # vortex frames
    frame = part - 1
    spin = frame * (2 * math.pi / 3) / 8
    vo = pal["vortex"]
    ys = [y for (_, y) in hole]
    vy0, vy1 = min(ys), max(ys)
    vcy = (vy0 + vy1) / 2 + 2
    rx, ry = 9.0, (vy1 - vy0) / 2 + 1
    inset = {(x, y) for (x, y) in hole if all((x + dx, y + dy) in hole for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)))}
    for (x, y) in inset:
        u, v = (x - cx) / rx, (y - vcy) / ry
        r = math.sqrt(u * u + v * v)
        a = math.atan2(v, u)
        arm = math.sin(3 * (a - spin) + 7.0 * r)
        near = math.hypot(x - cx, (y - vcy) * 0.8)
        if near < 2.6:
            col = pal["core"]
        else:
            level = 0.08 + 0.78 * (arm * 0.5 + 0.5) ** 1.4 + 0.24 * min(r, 1)
            # ordered dither, fixed to the cell, so the spin moves the arms and not the noise
            level += ((x * 3 + y * 5) % 4 - 1.5) * 0.045
            k = max(0, min(4, int(level * 4.0)))
            if near < 4.6:
                k = min(k, 1 if near > 3.6 else 0)
            col = vo[k]
        c.set(x, y, col)
    # the swirl's edge: a bright rim with ember sparks riding it, three a frame, turning with the arms
    for (x, y) in hole - inset:
        c.set(x, y, vo[1])
    for i in range(3):
        a = spin * 1.0 + i * 2 * math.pi / 3
        for j, (rr, col) in enumerate(((0.92, pal["spark"][0]), (0.82, pal["spark"][1]))):
            aa = a + j * 0.35
            x = round(cx + math.cos(aa) * rx * rr)
            y = round(vcy + math.sin(aa) * ry * rr)
            if (x, y) in inset:
                c.set(x, y, col)
        aa = a + math.pi / 3
        x = round(cx + math.cos(aa) * rx * 0.6)
        y = round(vcy + math.sin(aa) * ry * 0.6)
        if (x, y) in inset:
            c.set(x, y, pal["ash"][i % len(pal["ash"])])
    return c


# ---------------------------------------------------------------------------------------------------------------
# Core Keeper-style graphics pass, batch 2 (OWNER-APPROVED 2026-10-01: CORE KEEPER GRAPHICS PASS C1-C11).
# Floor kit (style doc section 7 "Floors", phase 3): slabs bevel to the light (top and left +1, bottom -2,
# right -1) with no mortar gap, low-frequency 2-tone clusters inside (never single-pixel noise), a variant mix of
# single / split / offset / broken / big 2x2 grave slab, and a separate decal strip. Every colour is passed in.


def floor_ramp(hint: str, wall_ramp_: list[str], palette, gap: float = 30.0, pull: float = 0.3) -> list[str]:
    """Six floor steps, dark to light, from the palette: 0 hole and deep crack, 1 crack and rubble shadow,
    2 bottom bevel (-2), 3 right bevel and clusters (-1), 4 the slab, 5 top/left bevel (+1). The slab keeps the
    cave's own floor hue (pulled 30% toward grey, so floors read as stone against the walls) and sits at least
    `gap` luminance (two ramp steps) above the wall's base, so floor and wall separate (doc: at least 2 steps).
    `pull` is how far the hue goes toward grey (0.3 by default; 0 keeps the cave's own hue at full strength)."""
    pal = sorted({c.lower() for c in palette})
    h = _hex3(hint)
    grey = sum(h) / 3
    want = tuple(round(h[i] + (grey - h[i]) * pull) for i in range(3))
    floor_lum = _lum(wall_ramp_[3]) + gap

    def dist(a, b):
        rm = (a[0] + b[0]) / 2
        dr, dg, db = a[0] - b[0], a[1] - b[1], a[2] - b[2]
        return (2 + rm / 256) * dr * dr + 4 * dg * dg + (2 + (255 - rm) / 256) * db * db

    def pick(target, lo, top):
        cands = [c for c in pal if lo <= _lum(c) < top]
        if not cands:
            raise SystemExit(f"floor_ramp: no palette colour between luminance {lo:.0f} and {top:.0f} for {hint}")
        return min(cands, key=lambda c: (dist(target, _hex3(c)), c))

    def toward(c, t, amt):
        return tuple(round(c[i] + (t[i] - c[i]) * amt) for i in range(3))

    # the slab: the cave hue, lifted to the floor luminance
    scale = floor_lum / max(1.0, _lum("#%02x%02x%02x" % want))
    lifted = tuple(min(255, round(v * scale)) for v in want)
    f4 = pick(lifted, floor_lum, floor_lum + 22)
    b = _hex3(f4)
    f5 = pick(toward(b, (240, 224, 192), 0.25), _lum(f4) + 8, _lum(f4) + 34)
    f3 = pick(toward(b, (20, 12, 30), 0.18), _lum(f4) - 22, _lum(f4) - 6)
    f2 = pick(toward(b, (20, 12, 30), 0.36), _lum(f3) - 22, _lum(f3) - 5)
    f1 = pick(toward(b, (16, 10, 24), 0.6), _lum(f2) - 26, _lum(f2) - 5)
    f0 = pick(toward(b, (8, 6, 12), 0.85), 0, min(_lum(f1) - 4, 34))
    return [f0, f1, f2, f3, f4, f5]


def _slab(t: Tile, x0: int, y0: int, w: int, h: int, ramp: list[str], rng: random.Random, clusters: int = 2) -> None:
    """One bevelled slab in t: base, clusters, then the bevel (top/left +1, bottom -2, right -1)."""
    f0, f1, f2, f3, f4, f5 = ramp
    t.rect(x0, y0, w, h, f4)
    for _ in range(clusters):
        cw, ch = rng.randint(3, max(3, min(5, w - 3))), rng.randint(2, max(2, min(3, h - 3)))
        cx, cy = rng.randint(x0 + 1, max(x0 + 1, x0 + w - cw - 1)), rng.randint(y0 + 1, max(y0 + 1, y0 + h - ch - 2))
        t.rect(cx, cy, cw, ch, f3)
        # round the cluster off: drop a corner, add a nub, so it is a soft blob and not a box
        t.set(cx, cy, f4)
        t.set(cx + cw - 1, cy + ch - 1, f4)
        t.set(cx + rng.randint(1, cw - 2), cy + ch, f3)
    if w >= 6 and h >= 6 and rng.random() < 0.6:
        lx, ly = rng.randint(x0 + 1, x0 + w - 4), rng.randint(y0 + 1, y0 + h - 4)
        t.rect(lx, ly, 2, 2, f5)
        t.set(lx + 2, ly, f5)
    t.rect(x0, y0, w, 1, f5)
    t.rect(x0, y0, 1, h, f5)
    t.rect(x0 + w - 1, y0, 1, h, f3)
    t.rect(x0, y0 + h - 1, w, 1, f2)


def flagstone(ramp: list[str], seed: int, pattern: str = "single") -> Tile:
    """One floor cell. single: one slab. split_h / split_v: two half slabs. offset: a full-width top half over two
    half-width bottom slabs (joints offset by half). broken: a slab with an earth hole and rubble."""
    rng = random.Random(seed)
    t = Tile()
    if pattern == "split_h":
        _slab(t, 0, 0, 16, 8, ramp, rng, 1)
        _slab(t, 0, 8, 16, 8, ramp, rng, 1)
    elif pattern == "split_v":
        _slab(t, 0, 0, 8, 16, ramp, rng, 1)
        _slab(t, 8, 0, 8, 16, ramp, rng, 1)
    elif pattern == "offset":
        _slab(t, 0, 0, 16, 8, ramp, rng, 1)
        _slab(t, 0, 8, 8, 8, ramp, rng, 1)
        _slab(t, 8, 8, 8, 8, ramp, rng, 1)
    else:
        _slab(t, 0, 0, 16, 16, ramp, rng, 3 if pattern == "single" else 1)
    if pattern == "broken":
        f0, f1, f2, f3, f4, f5 = ramp
        cx, cy = 5 + rng.randint(0, 2), 5 + rng.randint(0, 2)
        hole = [(x, y) for y in range(16) for x in range(16) if ((x - cx - 1.5) / 3.6) ** 2 + ((y - cy - 1) / 2.9) ** 2 <= 1.0]
        for x, y in hole:
            t.set(x, y, f1)
        for x, y in hole:
            if all((x + dx, y + dy) in hole for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1))):
                t.set(x, y, f0)
        # the broken edge catches light on its far (south) lip
        for x, y in hole:
            if (x, y + 1) not in hole:
                t.set(x, y + 1, f5)
        for x, y in ((cx - 2, cy + 4), (cx + 5, cy - 1), (cx + 4, cy + 5)):
            t.rect(x, y, 2, 2, f3)
            t.set(x, y, f5)
    return t


def big_slab(ramp: list[str], seed: int) -> list[Tile]:
    """A 2x2 grave slab, returned as its four 16x16 quarters (NW, NE, SW, SE): one bevel round the outside
    and a carved cross with a light lip under its strokes."""
    rng = random.Random(seed)
    f0, f1, f2, f3, f4, f5 = ramp
    c = Canvas(32, 32)
    c.rect(0, 0, 32, 32, f4)
    for _ in range(4):
        x, y = rng.randint(3, 24), rng.randint(3, 24)
        c.rect(x, y, 4, 3, f3)
        c.set(x, y, f4)
    c.rect(0, 0, 32, 1, f5)
    c.rect(0, 0, 1, 32, f5)
    c.rect(31, 0, 1, 32, f3)
    c.rect(0, 31, 32, 1, f2)
    # inner border, then the cross: carved strokes at step 1 with a step-5 lip below and right
    c.rect(3, 3, 26, 1, f2)
    c.rect(3, 3, 1, 26, f2)
    c.rect(3, 28, 26, 1, f5)
    c.rect(28, 3, 1, 26, f5)
    c.rect(15, 7, 2, 18, f1)
    c.rect(10, 12, 12, 2, f1)
    c.rect(17, 7, 1, 18, f5)
    c.rect(10, 14, 12, 1, f5)
    out = []
    for qy in (0, 16):
        for qx in (0, 16):
            t = Tile()
            for y in range(16):
                for x in range(16):
                    t.set(x, y, c.get(qx + x, qy + y))
            out.append(t)
    return out


def floor_decal(kind: str, ramp: list[str], bone: list[str], growth: list[str], seed: int) -> Tile:
    """A transparent 16x16 decal over a slab: bones, skull, crack, moss (in the seam under a wall; `growth` is
    moss, or ash and embers in the ember caves), wax pool, rubble. bone is bone[0..4] (outline .. light)."""
    rng = random.Random(seed)
    f0, f1, f2, f3, f4, f5 = ramp
    t = Tile()
    if kind == "bones":
        b0, b1, b2, b3, b4 = bone
        for i in range(8):
            t.set(3 + i, 6 + i // 2, b3)
            t.set(3 + i, 7 + i // 2, b1)
            t.set(11 - i, 6 + i // 2, b3 if i % 3 else b4)
            t.set(11 - i, 7 + i // 2, b1)
        for x, y in ((2, 5), (2, 6), (12, 5), (12, 6), (2, 10), (11, 10)):
            t.set(x, y, b2)
        t.rect(3, 11, 9, 1, b0)
    elif kind == "skull":
        b0, b1, b2, b3, b4 = bone
        t.rect(5, 5, 6, 4, b3)
        t.rect(6, 4, 4, 1, b4)
        t.rect(6, 9, 4, 2, b2)
        t.rect(6, 6, 1, 2, b0)
        t.rect(9, 6, 1, 2, b0)
        t.set(8, 8, b1)
        t.rect(5, 11, 6, 1, b0)
        t.set(7, 10, b0)
    elif kind == "crack":
        x, y = rng.randint(3, 6), 2
        while y < 14:
            t.set(x, y, f0)
            t.set(x + 1, y, f5)
            y += 1
            if rng.random() < 0.45:
                x += rng.choice((-1, 1))
                t.set(x, y - 1, f0)
        bx, by = x, 9
        for i in range(4):
            t.set(bx + i, by + i // 2, f1)
    elif kind == "moss":
        g0, g1, g2 = growth
        for x0 in (1, 5, 10):
            w = 2 + (x0 + seed) % 3
            t.rect(x0, 0, w, 2, g1)
            t.rect(x0 + 1, 2, max(1, w - 2), 1, g0)
            t.set(x0, 0, g2)
        t.rect(0, 0, 16, 1, g0)
        for x in range(0, 16, 5):
            t.set(x + 1, 0, g2)
    elif kind == "wax":
        b0, b1, b2, b3, b4 = bone
        t.rect(4, 8, 8, 3, b3)
        t.rect(5, 7, 6, 1, b3)
        t.rect(5, 11, 6, 1, b2)
        t.rect(6, 8, 3, 1, b4)
        t.rect(7, 4, 2, 4, b4)
        t.set(7, 3, b2)
        t.rect(3, 9, 1, 2, b2)
    elif kind == "rubble":
        for x, y, w, h in ((3, 9, 3, 2), (8, 5, 2, 2), (10, 10, 3, 2), (6, 12, 2, 2)):
            t.rect(x, y + 1, w, 1, f1)
            t.rect(x, y, w, 1, f3)
            t.set(x, y, f5)
    return t


# ---- playtest1 (owner-reported 2026-10-01): the town and room grounds, out of the old third-party sheets. ----


def cobble(seed: int, mortar: str, ramp: list[str], kind: int) -> Tile:
    """Town cobbles. Rounded setts in staggered rows, each lit top-left and shaded bottom-right, mortar between.
    ramp is dark to light: shade, body, body2, lit, glint. The border rows are mortar, so tiles meet on a joint."""
    shade, body, body2, lit, glint = ramp
    rng = random.Random(seed * 31 + kind)
    t = Tile()
    t.fill(mortar)
    rows = ((0, 5), (5, 5), (10, 6))
    for r, (y0, h) in enumerate(rows):
        off = (kind * 3 + r * 4) % 6
        x = -off
        while x < 16:
            w = 5 + rng.randrange(3)
            x0, x1 = max(0, x + 1), min(16, x + w)
            if x1 - x0 >= 2:
                fill = body if rng.randrange(3) else body2
                t.rect(x0, y0 + 1, x1 - x0, h - 1, fill)
                # round the corners off
                for cx, cy in ((x0, y0 + 1), (x1 - 1, y0 + 1), (x0, y0 + h - 1), (x1 - 1, y0 + h - 1)):
                    if (x0 == x + 1 or cx != x0) and (x1 == x + w or cx != x1 - 1):
                        t.set(cx, cy, mortar)
                t.rect(x0 + 1, y0 + 1, max(1, x1 - x0 - 2), 1, lit)
                t.rect(x0 + 1, y0 + h - 1, max(1, x1 - x0 - 2), 1, shade)
                if x1 - x0 >= 4 and rng.randrange(2):
                    t.set(x0 + 1 + rng.randrange(x1 - x0 - 2), y0 + 2, glint)
            x += w
    return t


def road(seed: int, base: str, rut: str, dark: str, light: str, pebble: str, kind: int) -> Tile:
    """A packed cart road: no stripes. A worn soft patch or two (rounded, a shade down), lit pebbles with a shadow
    pixel under them, and a 2x2 clod. Tiles in any direction, so a bend reads the same as a straight."""
    rng = random.Random(seed * 7 + kind)
    t = Tile()
    t.fill(base)
    for _ in range(1 + kind % 2):
        w, h = 4 + rng.randrange(3), 2 + rng.randrange(2)
        x, y = 1 + rng.randrange(16 - w - 1), 1 + rng.randrange(16 - h - 1)
        t.rect(x, y, w, h, rut)
        t.set(x, y, base)
        t.set(x + w - 1, y + h - 1, base)
        t.rect(x + 1, y + h, w - 2, 1, rut)
    for _ in range(3):
        x, y = 1 + rng.randrange(13), 1 + rng.randrange(13)
        t.rect(x, y, 2, 1, pebble)
        t.set(x, y, light)
        t.rect(x, y + 1, 2, 1, dark)
    x, y = 2 + rng.randrange(11), 2 + rng.randrange(11)
    t.rect(x, y, 2, 2, dark if kind % 2 else light)
    return t


def planks(seed: int, base: str, base2: str, seam: str, grain: str, lit: str, nail: str, kind: int) -> Tile:
    """Room floorboards. Four boards of 4 px, a dark seam under each, butt joints staggered from row to row,
    a lit top edge, grain strokes and a nail head at each joint."""
    rng = random.Random(seed * 13 + kind)
    t = Tile()
    for b in range(4):
        y0 = b * 4
        t.rect(0, y0, 16, 4, base if (b + kind) % 2 else base2)
        t.rect(0, y0, 16, 1, lit)
        t.rect(0, y0 + 3, 16, 1, seam)
        j = (kind * 5 + b * 7) % 16
        t.rect(j, y0, 1, 4, seam)
        t.set((j + 1) % 16, y0 + 1, nail)
        t.set((j + 15) % 16, y0 + 2, nail)
        gx = (j + 3 + rng.randrange(6)) % 16
        t.rect(gx, y0 + 1 + rng.randrange(2), 3, 1, grain)
    return t


def basin(frame: int, rim: str, rim_hi: str, rim_lo: str, deep: str, mid: str, light: str) -> Tile:
    """A stone-rimmed town pool, one frame of its ripple."""
    t = Tile()
    t.fill(rim)
    t.rect(0, 0, 16, 1, rim_hi)
    t.rect(0, 15, 16, 1, rim_lo)
    t.rect(2, 2, 12, 12, deep)
    t.rect(2, 9, 12, 5, mid)
    t.rect(2, 2, 12, 1, rim_lo)
    y = 4 + frame % 4
    t.rect(4, y, 5, 1, light)
    t.rect(9, (y + 4) % 9 + 4, 3, 1, light)
    for x in (1, 6, 11):
        t.set(x, 1, rim_lo)
    return t


def town_fence(kind: str, line: str, wood: str, wood_hi: str, wood_dk: str, cap: str) -> Tile:
    """playtest1: the town's edge fence, in 3/4 view. h: a run along the north or south edge (two rails, a post at
    each end and one in the middle). v: a run down the east or west edge (stacked posts, a rail seen end-on between).
    end: a gate post, taller, with an iron cap, where the fence meets a road."""
    t = Tile()

    def post(x: int, top: int, bottom: int) -> None:
        t.rect(x - 1, top - 1, 4, bottom - top + 2, line)
        t.rect(x, top, 2, bottom - top, wood)
        t.rect(x, top, 1, bottom - top, wood_hi)
        t.rect(x, bottom - 1, 2, 1, wood_dk)

    if kind == "h":
        for y in (6, 10):
            t.rect(0, y - 1, 16, 4, line)
            t.rect(0, y, 16, 2, wood)
            t.rect(0, y, 16, 1, wood_hi)
        for x in (1, 13):
            post(x, 3, 14)
        post(7, 4, 14)
    elif kind == "v":
        t.rect(6, 0, 4, 16, line)
        t.rect(7, 0, 2, 16, wood_dk)
        t.rect(7, 0, 1, 16, wood)
        post(7, 1, 7)
        post(7, 9, 15)
    else:
        post(7, 1, 15)
        t.rect(6, 0, 4, 2, line)
        t.rect(7, 0, 2, 1, cap)
    return t
