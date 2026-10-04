"""Loot writer (playtest1o, 2026-10-03): the drops on the ground, drawn as writer art.
[OWNER-REQUESTED 2026-10-03 19:49 ET: playtest1o motion, collision and art check]

Bill (2026-10-03 19:49 ET): "All the graphics in the entire game are upgraded to the same level?" The 1o audit found the
loot a foe or a chest drops (silver, potions, gems, every gear slot, fish and bait) still painted in draw.ts paintDrop
as two or three flat rectangles in an 8x8 box: the last world art below the writer's level. This draws each as a
16x16 writer cell: shaded in three or four locked steps, a 1 px ink edge, a highlight, its feet on row 13 (the ground
line is row 14), so it stands on the floor the way the 8x8 did.

    loot.png   16 cells, 16x16 each, in LOOT order (draw.ts lootCell picks one from the item)
    cave-ore.png  4 cells, 16x16: the ore crystals on a cave floor (violet, blue, red, green; draw.ts paintCaveFloor),
                  which were a flat 5x4 blob with one light pixel

Every colour is palette v3 (snapped), hard alpha, on the wild writer's Canvas.
    python3 tools/pixel-writer/loot_writer.py      (make_gravewake.playtest1o() runs it too)
"""

from __future__ import annotations

import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
sys.path.insert(0, str(HERE.parent / "sprite-writer"))

from PIL import Image  # noqa: E402

from wild_writer import Canvas, outline, snap  # noqa: E402

TAG = "[OWNER-REQUESTED 2026-10-03 19:49 ET: playtest1o motion, collision and art check]"
OUT = HERE.parents[1] / "public" / "art" / "writer"
LOOT = ["silver", "potion", "mana", "gem", "head", "chest", "legs", "feet", "ring", "neck", "off", "fish", "bait", "weapon", "bundle", "jewel"]

KEY = {
    # playtest1o fail-proof: every key colour is palette v3 as written (each was already what the snapping Canvas drew)
    # silver and iron
    "1": "#4a4a50", "2": "#6a6e78", "3": "#9aa0aa", "4": "#d8dce0", "5": "#f4f0ea",
    # red and blue drink, glass, cork
    "r": "#6a1828", "R": "#c43838", "P": "#e07088", "b": "#2a3a6a", "B": "#3a6ad0", "c": "#8eb4d8", "g": "#b0b6bc", "G": "#e7f4fb",
    "o": "#6a4830", "O": "#c4a574",
    # gold
    "y": "#6a5030", "Y": "#c4a050", "Z": "#f4e27a",
    # gem (cold blue)
    "e": "#2a4568", "E": "#3a8ab0", "f": "#7ec8e0", "F": "#e7f4fb",
    # leather, cloth
    "n": "#3a2418", "N": "#5a3828", "q": "#8a6848", "Q": "#a07850",
    # violet (the off hand: a grimoire with a gold clasp)
    "v": "#2a1840", "V": "#4a2870", "w": "#7a58a0",
    # fish
    "h": "#2a4a28", "H": "#3c8636", "J": "#6a9a48", "K": "#9ec060",
    # blood-red jewel
    "x": "#4a1020", "X": "#a02030", "W": "#c44868",
}

ART: dict[str, list[str]] = {
    "silver": [
        "................", "................", "................", "................",
        "................", "................", "......2332......", ".....234453.....",
        ".....123332.....", "..2332122221....", ".23445312332....", ".12333212445....",
        "..122221123332..", "...1111.122221..",
    ],
    "potion": [
        "................", "................", "................", "......oOOo......",
        "......oOOo......", ".......gG.......", ".......gG.......", "......gGGg......",
        ".....gRRPRg.....", ".....gRRRPg.....", ".....grRRRg.....", ".....grrRRg.....",
        "......grrg......", ".......gg.......",
    ],
    "mana": [
        "................", "................", "................", "......oOOo......",
        "......oOOo......", ".......gG.......", ".......gG.......", "......gGGg......",
        ".....gBBcBg.....", ".....gBBBcg.....", ".....gbBBBg.....", ".....gbbBBg.....",
        "......gbbg......", ".......gg.......",
    ],
    "gem": [
        "................", "................", "................", "................",
        "................", ".......FF.......", "......fFFf......", ".....EffFfE.....",
        "....EEfffffE....", "....eEEfffEe....", ".....eEEEEe.....", "......eEEe......",
        ".......ee.......", "................",
    ],
    "jewel": [
        "................", "................", "................", "................",
        "................", "................", ".......WW.......", "......XWWX......",
        ".....XXWWXX.....", ".....xXXXXx.....", "......xXXx......", ".......xx.......",
        "................", "................",
    ],
    "head": [
        "................", "................", "................", "................",
        "................", "......3445......", ".....234453.....", "....23344453....",
        "....23333332....", "....21111112....", "....2.1111.2....", "....22....22....",
        "....12....21....", "................",
    ],
    "chest": [
        "................", "................", "................", "................",
        "....33....33....", "...3443..3443...", "...34444444443..", "...2344YY44432..",
        "....234YY4432...", "....23344332....", "....22333322....", "....12222221....",
        ".....111111.....", "................",
    ],
    "legs": [
        "................", "................", "................", "................",
        "................", "....NqqqqqqN....", "....NQQqqQQN....", "....Nqq..qqN....",
        "....Nqq..qqN....", "....NQq..qQN....", "....nNq..qNn....", "....nNN..NNn....",
        "....nnn..nnn....", "................",
    ],
    "feet": [
        "................", "................", "................", "................",
        "................", "................", "...Nq......Nq...", "...Nq......Nq...",
        "...Nq......Nq...", "...NqQ.....NqQ..", "...NqqQq...NqqQq", "...nNNNq...nNNNq",
        "...nnnnn...nnnnn", "................",
    ],
    "ring": [
        "................", "................", "................", "................",
        "................", ".......FF.......", "......YfEY......", ".....YZ..ZY.....",
        "....YZ....ZY....", "....Y......Y....", "....yY....Yy....", ".....yYYYYy.....",
        "......yyyy......", "................",
    ],
    "neck": [
        "................", "................", "................", "....Y......Y....",
        "....Y......Y....", ".....Y....Y.....", ".....Y....Y.....", "......YZZY......",
        "......XWWX......", ".....XXWWXX.....", ".....xXXXXx.....", "......xXXx......",
        ".......xx.......", "................",
    ],
    "off": [
        "................", "................", "................", "................",
        "....VVVVVVVv....", "...VwwwwwwVv....", "...VwVVVVwVv....", "...VwVZZVwVv....",
        "...VwVZZVwVYZ...", "...VwVVVVwVYy...", "...VwwwwwwVv....", "...vVVVVVVVv....",
        "....5555555.....", "................",
    ],
    "fish": [
        "................", "................", "................", "................",
        "................", "................", "......JJJJ......", "....HJKKKJJ.H...",
        "...HJK5KKJJHH...", "...HJJKKJJHHH...", "....hHJJJHh.h...", "......hhhh......",
        "................", "................",
    ],
    "bait": [
        "................", "................", "................", "................",
        "......oOOo......", ".....gGGGGg.....", ".....gQqQqg.....", ".....gqQqQg.....",
        ".....gQqQqg.....", ".....gqQqQg.....", ".....gNqNqg.....", ".....gggggg.....",
        "................", "................",
    ],
    "weapon": [
        "................", "...........5....", "..........54....", ".........543....",
        "........543.....", ".......543......", "......543.......", "..Y..543........",
        "...YZ43.........", "....ZY..........", "...oYZY.........", "..oO...Y........",
        ".oO.............", "................",
    ],
    "bundle": [
        "................", "................", "................", "................",
        ".......OO.......", "......nOOn......", ".......nn.......", ".....qQQQq......",
        "....qQQtQQq.....", "....qQQQQQq.....", "....NqQQQqN.....", "....NNqqqNN.....",
        ".....NNNNN......", "................",
    ],
}
KEY["t"] = "#c4a574"


def cell(name: str) -> Canvas:
    rows = ART[name]
    assert len(rows) == 14 and all(len(r) == 16 for r in rows), name
    c = Canvas(16, 16)
    for y, row in enumerate(rows):
        for x, ch in enumerate(row):
            if ch != ".":
                c.set(x, y, KEY[ch])
    outline(c)
    return c


def main(out: Path | None = None) -> Image.Image:
    out = out or OUT
    sheet = Image.new("RGBA", (16 * len(LOOT), 16), (0, 0, 0, 0))
    for i, name in enumerate(LOOT):
        sheet.alpha_composite(cell(name).image().convert("RGBA"), (i * 16, 0))
    # every pixel locked and hard, nothing below the ground line (row 14 is the outline's floor)
    px = sheet.load()
    for y in range(16):
        for x in range(sheet.width):
            r, g, b, a = px[x, y]
            assert a in (0, 255), (x, y, a)
            if a:
                assert snap("#%02x%02x%02x" % (r, g, b)) == "#%02x%02x%02x" % (r, g, b)
                assert y <= 14, (LOOT[x // 16], y)
    sheet.save(out / "loot.png")
    return sheet


# playtest1o: the ore crystals a cave floor shows now and then. Same colours the painted blob used, as a 3-step ramp
# (shadow, body, light) with a white glint, snapped to palette v3; each sits where the blob sat (x 4-11, y 4-11).
ORE = ["#5a48c8", "#3a78c8", "#c84848", "#48a060"]
ORE_ART = [
    "..........",
    ".....3....",
    "..3..32...",
    "..32.322..",
    ".3221322..",
    ".1221112..",
    "..11.11...",
]


def _shade(c: str, d: int) -> str:
    r, g, b = (int(c[i:i + 2], 16) for i in (1, 3, 5))
    k = lambda v: max(0, min(255, v + d))  # noqa: E731
    return "#%02x%02x%02x" % (k(r), k(g), k(b))


def ore_cell(base: str) -> Canvas:
    ramp = {"1": _shade(base, -40), "2": base, "3": _shade(base, 60)}
    c = Canvas(16, 16)
    for y, row in enumerate(ORE_ART):
        for x, ch in enumerate(row):
            if ch != ".":
                c.set(x + 3, y + 3, ramp[ch])
    c.set(5, 5, "#f4f0e8")
    outline(c)
    return c


def ore(out: Path | None = None) -> Image.Image:
    out = out or OUT
    sheet = Image.new("RGBA", (16 * len(ORE), 16), (0, 0, 0, 0))
    for i, base in enumerate(ORE):
        sheet.alpha_composite(ore_cell(base).image().convert("RGBA"), (i * 16, 0))
    px = sheet.load()
    for y in range(16):
        for x in range(sheet.width):
            r, g, b, a = px[x, y]
            assert a in (0, 255), (x, y, a)
            if a:
                assert snap("#%02x%02x%02x" % (r, g, b)) == "#%02x%02x%02x" % (r, g, b)
    sheet.save(out / "cave-ore.png")
    return sheet


if __name__ == "__main__":
    im = main()
    im.resize((im.width * 8, im.height * 8), Image.NEAREST).save("/tmp/pt1o/loot_x8.png")
    print("loot.png", im.size)
    o = ore()
    o.resize((o.width * 8, o.height * 8), Image.NEAREST).save("/tmp/pt1o/ore_x8.png")
    print("cave-ore.png", o.size)
