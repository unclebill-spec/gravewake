"""Glow writer (playtest1b, 2026-10-02): Bill's "gloom and glow" pieces.

Dark scenes full of glowing things: neon blue cold fire (his top pick), violet neon and red neon. Everything here is
drawn pixel by pixel on the pixel writer's Canvas, one colour per pixel, and every colour is checked against palette v3
(tools/sprite-writer/palette_locked.py LOCKED_V3; the four neon tubes are its only additions).

    font_sheet()   the small pixel font (3x5 glyphs in 4x6 cells) for name labels and sign plates
    sign(kind, f)  a hanging shop sign: iron bracket, chains, a dark board, the trade's icon in a neon tube
    town_icon(f)   the town on the vale: a walled hamlet with a chapel spire and blue gate lanterns (48x40)
    town_map_icon  the same town for the map screen (12x12)
    camp_icon(k)   the HUD camp button: tent and a cold-fire campfire (two flame frames), and the break-camp look
"""

from __future__ import annotations

from pixel_writer import Canvas

INK = "#140c10"

# --- art from strings -------------------------------------------------------------------------------------------------


def stamp(c: Canvas, rows: list[str], x: int, y: int, key: dict[str, str]) -> None:
    for j, row in enumerate(rows):
        for i, ch in enumerate(row):
            if ch in key:
                c.set(x + i, y + j, key[ch])


def outline(c: Canvas, color: str = INK, x0: int = 0, y0: int = 0, x1: int | None = None, y1: int | None = None) -> None:
    """A 1 px ink edge around every filled pixel (4-neighbour), inside the given box."""
    x1 = c.w if x1 is None else x1
    y1 = c.h if y1 is None else y1
    add = []
    for y in range(y0, y1):
        for x in range(x0, x1):
            if c.get(x, y):
                continue
            if any(c.get(x + dx, y + dy) and c.get(x + dx, y + dy) != color for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1))):
                add.append((x, y))
    for x, y in add:
        c.set(x, y, color)


# --- the font ---------------------------------------------------------------------------------------------------------

GLYPH = {
    "A": [".#.", "#.#", "###", "#.#", "#.#"], "B": ["##.", "#.#", "##.", "#.#", "##."], "C": [".##", "#..", "#..", "#..", ".##"],
    "D": ["##.", "#.#", "#.#", "#.#", "##."], "E": ["###", "#..", "##.", "#..", "###"], "F": ["###", "#..", "##.", "#..", "#.."],
    "G": [".##", "#..", "#.#", "#.#", ".##"], "H": ["#.#", "#.#", "###", "#.#", "#.#"], "I": ["###", ".#.", ".#.", ".#.", "###"],
    "J": ["..#", "..#", "..#", "#.#", ".#."], "K": ["#.#", "#.#", "##.", "#.#", "#.#"], "L": ["#..", "#..", "#..", "#..", "###"],
    "M": ["#.#", "###", "###", "#.#", "#.#"], "N": ["##.", "#.#", "#.#", "#.#", "#.#"], "O": [".#.", "#.#", "#.#", "#.#", ".#."],
    "P": ["##.", "#.#", "##.", "#..", "#.."], "Q": [".#.", "#.#", "#.#", "##.", ".##"], "R": ["##.", "#.#", "##.", "#.#", "#.#"],
    "S": [".##", "#..", ".#.", "..#", "##."], "T": ["###", ".#.", ".#.", ".#.", ".#."], "U": ["#.#", "#.#", "#.#", "#.#", "###"],
    "V": ["#.#", "#.#", "#.#", "#.#", ".#."], "W": ["#.#", "#.#", "###", "###", "#.#"], "X": ["#.#", "#.#", ".#.", "#.#", "#.#"],
    "Y": ["#.#", "#.#", ".#.", ".#.", ".#."], "Z": ["###", "..#", ".#.", "#..", "###"],
    "0": ["###", "#.#", "#.#", "#.#", "###"], "1": [".#.", "##.", ".#.", ".#.", "###"], "2": ["##.", "..#", ".#.", "#..", "###"],
    "3": ["##.", "..#", ".#.", "..#", "##."], "4": ["#.#", "#.#", "###", "..#", "..#"], "5": ["###", "#..", "##.", "..#", "##."],
    "6": [".##", "#..", "###", "#.#", "###"], "7": ["###", "..#", ".#.", ".#.", ".#."], "8": ["###", "#.#", "###", "#.#", "###"],
    "9": ["###", "#.#", "###", "..#", "##."], " ": ["...", "...", "...", "...", "..."], "'": [".#.", ".#.", "...", "...", "..."],
    ".": ["...", "...", "...", "...", ".#."], ",": ["...", "...", "...", ".#.", "#.."], "-": ["...", "...", "###", "...", "..."],
    "!": [".#.", ".#.", ".#.", "...", ".#."], "?": ["##.", "..#", ".#.", "...", ".#."], "&": [".#.", "#.#", ".#.", "#.#", ".##"],
}
FONT_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789 '.,-!?&"
# Row order of the sheet: bone (townsfolk), cold blue (trades, the town), violet (your companion), red (bosses),
# ink (the outline the game stamps around each letter), gold (sign plates).
FONT_ROWS = ["#f4efe4", "#9ae4ff", "#c9a0e8", "#ff3a50", INK, "#f4e27a"]


def font_sheet() -> Canvas:
    c = Canvas(4 * len(FONT_CHARS), 6 * len(FONT_ROWS))
    for r, col in enumerate(FONT_ROWS):
        for i, ch in enumerate(FONT_CHARS):
            stamp(c, GLYPH[ch], i * 4, r * 6, {"#": col})
    return c


# --- shop signs -------------------------------------------------------------------------------------------------------

# Each trade's icon (9 x 7, '#' is the neon tube) and its glow. Order is the sheet order (two frames each).
SIGN_KINDS = ["inn", "shop", "guild", "bank", "cottage", "chapel", "casino", "smith", "fisher", "croft", "tailor", "alchemy", "mystic"]
SIGN_ICON = {
    "inn": [".#####...", ".#...#...", ".#...###.", ".#...#.#.", ".#...###.", ".#...#...", ".#####..."],
    "shop": ["...##....", "..#..#...", "...##....", "..####...", ".#....#..", ".#....#..", "..####..."],
    "guild": ["#.......#", ".#.....#.", "..#...#..", "...#.#...", "....#....", "..##.##..", ".#.....#."],
    "bank": ["..####...", ".#....#..", "..####...", ".#....#..", "..####...", ".#....#..", "..####..."],
    "cottage": ["....#....", "...#.#...", "..#...#..", ".#######.", ".#.....#.", ".#..#..#.", ".#######."],
    "chapel": ["....#....", "....#....", "..#####..", "....#....", "....#....", "....#....", "...###..."],
    "casino": ["....#....", "...#.#...", "..#...#..", ".#..#..#.", "..#...#..", "...#.#...", "....#...."],
    "smith": ["#########", ".#.....#.", "..##.##..", "...#.#...", "...#.#...", "..#...#..", ".#######."],
    "fisher": [".........", "..####..#", ".#....##.", "#..#...#.", ".#....##.", "..####..#", "........."],
    "croft": ["....#....", "..#.#.#..", "...###...", "..#.#.#..", "...###...", "....#....", "....#...."],
    "tailor": [".......##", "......#.#", ".....##..", "....#....", "...#.....", ".##......", "#.#......"],
    "alchemy": ["...###...", "....#....", "....#....", "...#.#...", "..#...#..", ".#.###.#.", ".#######."],
    "mystic": ["..##...#.", ".#....###", "#......#.", "#........", "#........", ".#.......", "..##....."],
}
SIGN_GLOW = {"inn": "blue", "shop": "violet", "guild": "red", "bank": "blue", "cottage": "violet", "chapel": "blue", "casino": "red",
             "smith": "red", "fisher": "blue", "croft": "violet", "tailor": "violet", "alchemy": "blue", "mystic": "violet"}
IRON, IRON_HI, CHAIN = "#4a4a50", "#8a9098", "#6a6e78"
WOOD, WOOD_HI, WOOD_DK = "#2a1c14", "#4a3424", "#1a1008"


def sign(kind: str, frame: int, neon: dict[str, tuple[str, ...]]) -> Canvas:
    deep, halo, mid, tube, core, hot = neon[SIGN_GLOW[kind]]
    c = Canvas(16, 16)
    # the bracket off the wall (left), a curl at its root, two chains
    c.rect(0, 1, 15, 1, IRON)
    c.rect(1, 0, 13, 1, IRON_HI)
    c.set(0, 2, IRON)
    c.set(1, 3, IRON)
    c.set(2, 2, IRON_HI)
    for x in (3, 12):
        for y in (2, 3, 4):
            c.set(x, y, CHAIN if y % 2 == 0 else IRON)
    # the board
    c.rect(1, 5, 14, 10, WOOD)
    c.rect(1, 5, 14, 1, WOOD_HI)
    c.rect(1, 5, 1, 10, WOOD_HI)
    c.rect(1, 14, 14, 1, WOOD_DK)
    c.rect(14, 5, 1, 10, WOOD_DK)
    icon = SIGN_ICON[kind]
    ox, oy = 3, 6
    on = {(ox + i, oy + j) for j, row in enumerate(icon) for i, ch in enumerate(row) if ch == "#"}
    # glow bleed on the wood: the 4-neighbours of the tube, and on the bright frame its diagonals too
    for (x, y) in on:
        for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)) + (((1, 1), (-1, 1), (1, -1), (-1, -1)) if frame else ()):
            p = (x + dx, y + dy)
            if p not in on and 2 <= p[0] <= 13 and 6 <= p[1] <= 13:
                c.set(*p, halo if (dx == 0 or dy == 0) else deep)
    for (x, y) in on:
        c.set(x, y, core if frame else tube)
    # one hot pixel where the tube is brightest (the topmost-leftmost bend), on the bright frame
    if frame:
        c.set(*min(on, key=lambda p: (p[1], p[0])), hot)
    outline(c)
    return c


# --- the town on the vale ---------------------------------------------------------------------------------------------

STONE = ["#2a2a2e", "#3a4450", "#4a545c", "#5a6068", "#6a7480"]


def town_icon(frame: int, neon: dict[str, tuple[str, ...]]) -> Canvas:
    W, H = 48, 40
    c = Canvas(W, H)
    b = neon["blue"]
    v = neon["violet"]
    r = neon["red"]
    # chapel spire (behind everything)
    c.rect(21, 8, 6, 16, "#2a3140")
    c.rect(21, 8, 1, 16, "#3a4060")
    for j in range(8):
        c.rect(24 - j // 2 - 1, j, 2 + (j // 2) * 2, 1, "#3a4a68" if j % 3 else "#4a5878")
    c.set(24, 0, "#9aa0aa")
    c.rect(23, 12, 2, 3, b[3] if frame == 0 else b[4])
    c.set(23, 12, b[5])
    c.rect(22, 12, 1, 3, b[1])
    c.rect(25, 12, 1, 3, b[1])
    # left house: rust roof, violet window
    for j in range(9):
        c.rect(10 - j, 12 + j, 2 + j * 2, 1, "#8a3038" if j % 3 else "#a05068")
    c.rect(4, 21, 13, 4, "#4a3428")
    c.rect(8, 21, 3, 2, v[3])
    c.set(8, 21, v[4])
    # right house: slate roof, red window
    for j in range(9):
        c.rect(37 - j, 12 + j, 2 + j * 2, 1, "#3a4a68" if j % 3 else "#6a7888")
    c.rect(31, 21, 13, 4, "#3a3028")
    c.rect(37, 21, 3, 2, r[3])
    c.set(39, 22, r[4])
    # the wall: crenellations, coursed stone
    c.rect(1, 25, 46, 15, STONE[2])
    for x in range(1, 47, 5):
        c.rect(x, 23, 3, 2, STONE[3])
        c.rect(x, 23, 3, 1, STONE[4])
    c.rect(1, 25, 46, 1, STONE[4])
    for y in range(27, 40, 3):
        c.rect(1, y, 46, 1, STONE[1])
        off = 0 if (y // 3) % 2 else 3
        for x in range(1 + off, 47, 6):
            c.rect(x, y - 2, 1, 2, STONE[1])
    c.rect(1, 39, 46, 1, STONE[0])
    # the gate: an arch, the street beyond lit cold blue
    for y in range(26, 40):
        half = 5 if y > 29 else [2, 3, 4, 5][y - 26]
        c.rect(24 - half, y, half * 2, 1, "#07060a" if y < 33 else (b[0] if y < 37 else b[1]))
    for y in range(26, 40):
        half = 6 if y > 29 else [3, 4, 5, 6][y - 26]
        c.set(24 - half, y, STONE[4])
        c.set(23 + half, y, STONE[3])
    c.rect(21, 25, 6, 1, STONE[4])
    # gate lanterns on posts: the blue cold fire
    for lx in (15, 31):
        c.rect(lx, 24, 2, 8, IRON)
        c.rect(lx - 1, 19, 4, 5, b[1])
        c.rect(lx, 20, 2, 3, b[3] if frame == 0 else b[4])
        c.set(lx, 20, b[5])
        c.rect(lx - 1, 18, 4, 1, IRON)
        c.set(lx - 2, 21, b[0])
        c.set(lx + 3, 21, b[0])
    outline(c)
    return c


def town_map_icon(neon: dict[str, tuple[str, ...]]) -> Canvas:
    c = Canvas(12, 12)
    b = neon["blue"]
    stamp(c, [
        ".....s......",
        "....sss.....",
        ".r..sbs..l..",
        "rrr.sss.lll.",
        "rvr.sss.lrl.",
        "wwwwwwwwwwww",
        "wWwWwWwWwWww",
        "wwwwwddwwwww",
        "wwwwdBBdwwww",
        "wwwwdBBdwwww",
        "wwwwdBBdwwww",
        "............",
    ], 0, 0, {"s": "#3a4a68", "b": b[3], "r": "#8a3038", "v": neon["violet"][3], "l": "#6a7888", "w": STONE[2], "W": STONE[4], "d": "#07060a", "B": b[2]})
    return c


# --- the camp button --------------------------------------------------------------------------------------------------


def camp_icon(kind: str, neon: dict[str, tuple[str, ...]]) -> Canvas:
    """kind: "a" / "b" (camp, two flame frames) or "break" (the tent struck, the fire out)."""
    c = Canvas(16, 16)
    b = neon["blue"]
    key = {"t": "#8a6848", "T": "#c4a574", "k": "#4a3424", "d": "#1a1008", "p": "#3a2418", "l": "#6a3c28", "L": "#3a2418",
           "s": "#5a564e", "S": "#8a867c", "g": "#2a221c", "1": b[2], "2": b[3], "3": b[4], "4": b[5], "e": "#c43838", "m": "#6a6e78", "M": "#9aa0aa"}
    if kind != "break":
        stamp(c, [
            "....p...........",
            "...pTt..........",
            "...TTtt.........",
            "..TTttt.........",
            "..TTtdtt........",
            ".TTttddtt.......",
            ".TTtdddttt......",
            "TTttdddtttt.....",
            "TTtddddtttt.....",
            "kkkkkkkkkkkk....",
            "gggggggggggggggg",
        ], 0, 5, key)
        flame = [
            ["....2..", "...232.", "...2342", "..23432", "..23332", "...1221", "...ss.."],
            ["...2...", "..232..", ".23432.", ".23432.", "..2332.", "..1221.", "...ss.."],
        ][0 if kind == "a" else 1]
        stamp(c, flame, 9, 5, key)
        stamp(c, ["lLlLl.", "sSssSs"], 10, 12, key)
    else:
        stamp(c, [
            "...........M....",
            "..........m.....",
            "...........m....",
            "..........M.....",
            ".........m......",
            "................",
            "................",
            "..ttttttt.......",
            ".tTTTTTTtk......",
            ".tttkkkttk..lLlL",
            "..kkkkkkk..sSesS",
            "gggggggggggggggg",
        ], 0, 4, key)
    outline(c)
    return c
