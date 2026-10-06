"""Hearth writer (playtest1b B2, 2026-10-02): the camp and the room interiors, in Bill's "gloom and glow".

Same rules as glow_writer: drawn pixel by pixel on the pixel writer's Canvas, one colour per pixel, every colour from
palette v3 (LOCKED_V3). Cold blue neon (NEON["blue"]) is the light: the camp fire, lanterns, sconces and the stove.

    camp_tent()        the camp tent over its 5x4 footprint (80x80), flap open on the footprint's door column
    camp_fire(f)       a ring of stones, crossed logs and a cold-blue fire, four frames (16x32)
    camp_gear(k)       16x16 camp pieces: log seat, bedroll, pack, lantern post, glow caps, stones, the camp mark
    room_wall(k)       16x16 interior wall: plain, window, sconce, shelf, side beam, the door
    room_kit(k)        32x32 interior pieces: bed, table, dresser, plant, stove
    room_rug()         64x32 woven rug
"""

from __future__ import annotations

from glow_writer import outline, stamp
from pixel_writer import Canvas

WOOD = ("#2a1c14", "#3a2818", "#4a3424", "#5a3828", "#6a5038", "#8a6848", "#c4a574")
CANVAS = ("#4a3424", "#6a5038", "#8a7a64", "#c4b49a", "#d8c4a0")
STONE = ("#2a221c", "#4a4450", "#5a564e", "#6a6660", "#8a867c", "#b7b2a6")
QUILT = ("#3a1830", "#5a2838", "#6a3048", "#8a4860", "#c46878")
BONE = ("#c4b49a", "#e8dcc8", "#f4efe4")
GOLD = ("#8a6840", "#c4a050", "#e0c060")
LEAF = ("#2a5838", "#3a6840")
CLAY = ("#6a3c28", "#8a4038")
DARK = "#1a1008"
PLASTER = ("#3a3028", "#4a4038")


def _lantern(c: Canvas, x: int, y: int, b, frame: int = 0) -> None:
    """A 5x7 hanging lantern: iron cap and base, a cold-blue glass, a hot core."""
    stamp(c, [".i.", "iii"], x + 1, y, {"i": STONE[1]})
    stamp(c, ["i222i", "i343i", "i353i" if frame == 0 else "i343i", "i232i", ".iii."], x, y + 2,
          {"i": STONE[1], "2": b[3], "3": b[4], "4": b[5], "5": b[5]})


# --- camp -------------------------------------------------------------------------------------------------------------


def camp_tent(neon) -> Canvas:
    c = Canvas(80, 80)
    b = neon["blue"]
    v = neon["violet"]
    cx, top, bot = 40, 10, 77
    for y in range(top, bot + 1):
        hw = int((y - top) * 38 / (bot - top)) + 1
        for x in range(cx - hw, cx + hw + 1):
            lit = x < cx
            col = CANVAS[3] if lit else CANVAS[2]
            if (y - top) % 13 == 12:
                col = CANVAS[2] if lit else CANVAS[1]  # panel seams
            if abs(x - cx) >= hw - 1:
                col = CANVAS[1]
            if y >= bot - 1:
                col = CANVAS[1] if lit else CANVAS[0]
            c.set(x, y, col)
        c.set(cx, y, CANVAS[1])
    for y in range(top + 2, bot - 2):
        hw = int((y - top) * 38 / (bot - top)) + 1
        c.set(cx - hw + 2, y, CANVAS[4])
    for y in range(52, 58):
        for x in range(56, 63):
            c.set(x, y, v[1] if (x + y) % 5 else v[2])
    for x in range(55, 64, 2):
        c.set(x, 51, CANVAS[0])
        c.set(x, 58, CANVAS[0])
    for y in range(36, bot + 1):
        ow = int((y - 36) * 9 / (bot - 36)) + 1
        for x in range(cx - ow, cx + ow + 1):
            c.set(x, y, DARK if abs(x - cx) < ow - 1 else WOOD[0])
        c.set(cx - ow - 1, y, CANVAS[4])
        c.set(cx - ow - 2, y, CANVAS[3])
        c.set(cx + ow + 1, y, CANVAS[3])
        c.set(cx + ow + 2, y, CANVAS[2])
    stamp(c, ["ttt", ".t."], cx - 12, 60, {"t": WOOD[1]})
    stamp(c, ["ttt", ".t."], cx + 10, 60, {"t": WOOD[1]})
    for x in range(cx - 7, cx + 8):
        for y in range(71, 76):
            if abs(x - cx) < int((y - 36) * 9 / (bot - 36)):
                c.set(x, y, QUILT[2] if y < 73 else QUILT[1])
    for y in range(36, 46):
        c.set(cx, y, STONE[1])
    _lantern(c, cx - 2, 46, b)
    for y in range(3, top + 1):
        c.set(cx, y, WOOD[2])
    stamp(c, ["rr.", "rRr", "rr."], cx + 1, 3, {"r": neon["red"][2], "R": neon["red"][1]})
    for i in range(0, 30):
        c.set(10 - i // 3, 44 + i, CANVAS[2])
        c.set(70 + i // 3, 44 + i, CANVAS[1])
    stamp(c, ["p", "p"], 0, 74, {"p": WOOD[2]})
    stamp(c, ["p", "p"], 79, 74, {"p": WOOD[2]})
    outline(c)
    return c


def camp_fire(frame: int, neon) -> Canvas:
    c = Canvas(16, 32)
    b = neon["blue"]
    key = {"1": b[2], "2": b[3], "3": b[4], "4": b[5], "s": STONE[2], "S": STONE[4], "d": STONE[0], "l": WOOD[3], "L": WOOD[1], "e": neon["red"][2]}
    flames = [
        ["......2.....", ".....22.....", "....232..2..", "....2342.2..", "...234432...", "...2344322..", "..23444432..", "..23343432..", "...2333332..", "...1222221.."],
        [".....2......", "....22...2..", "....232..2..", "...23432....", "...234432...", "..2344432...", "..23444432..", "..23434432..", "...2333332..", "...1222221.."],
        ["..2.........", "..2..2......", ".....22.....", "....2342....", "...23442.2..", "...234432...", "..23444432..", "..23443432..", "...2333332..", "...1222221.."],
        [".......2....", "......22....", ".2...232....", "....23432...", "...234432...", "..2344432...", "..23444432..", "..23344332..", "...2333332..", "...1222221.."],
    ]
    stamp(c, flames[frame % 4], 2, 14, key)
    for x, y in [[(5, 6), (10, 9)], [(9, 4), (4, 10)], [(6, 2), (11, 7)], [(3, 5), (8, 8)]][frame % 4]:
        c.set(x, y, b[5] if (x + frame) % 2 else b[4])
    stamp(c, ["..lL....Ll..", ".LllLLLLllL.", "..LlLllLlL.."], 2, 23, key)
    stamp(c, [".sSs.sSs.sSs.", "SsdsSsdsSsdsS", ".sSsdsSsdsSs."], 1, 26, key)
    stamp(c, ["e..e..e"], 4, 24, key)
    outline(c)
    return c


GEAR = ("seat", "bedroll", "pack", "lantern", "caps", "stones", "mark")


def camp_gear(kind: str, neon, frame: int = 0) -> Canvas:
    c = Canvas(16, 16)
    b = neon["blue"]
    v = neon["violet"]
    if kind == "seat":
        stamp(c, ["RrrrrrrrrrrrO.", "rWwwwwwwwwwwOo", "rwWwwwwWwwwwOc", "rwwwwWwwwwwwOo", "RrrrrrrrrrrrO."], 1, 9,
              {"r": WOOD[1], "R": WOOD[0], "w": WOOD[3], "W": WOOD[4], "O": WOOD[5], "o": WOOD[6], "c": WOOD[2]})
    elif kind == "bedroll":
        stamp(c, ["ppp...........", "pPPp.qqqqqqqq.", "pPPpqQQqQQqQQq", ".ppqQqqsqqsqqq", "...qqqqsqqsqq.", "....qqqqqqqq.."], 1, 8,
              {"p": BONE[0], "P": BONE[2], "q": QUILT[2], "Q": QUILT[3], "s": WOOD[1]})
    elif kind == "pack":
        stamp(c, ["...kk.......", "..kKKk......", ".kKKKKk.mmm.", ".kKbbKkmMMMm", ".kKKKKkmMmMm", ".kKKKKk.mmm.", "..kkkk......"], 2, 7,
              {"k": WOOD[3], "K": WOOD[5], "b": GOLD[1], "m": STONE[1], "M": STONE[3]})
    elif kind == "lantern":
        for y in range(5, 16):
            c.set(7, y, WOOD[2])
            c.set(8, y, WOOD[1])
        stamp(c, ["hhhhhh"], 5, 4, {"h": WOOD[2]})
        _lantern(c, 9, 4, b, frame)
    elif kind == "caps":
        stamp(c, [".122.....", "12322....", ".1221.bB.", "..s..bBBb", "..S...s..", "..S...S.."], 3, 9,
              {"1": v[2], "2": v[3], "3": v[4], "b": b[3], "B": b[4], "s": BONE[0], "S": BONE[1]})
    elif kind == "stones":
        stamp(c, ["..sSs.......", ".sSSSs..sS..", "dsssssd.sSSs", ".ddddd..dssd"], 2, 11, {"s": STONE[2], "S": STONE[4], "d": STONE[0]})
    elif kind == "mark":
        for y in range(6, 15):
            c.set(4, y, WOOD[2])
            c.set(5, y, WOOD[1])
        _lantern(c, 2, 0, b, frame)
        stamp(c, ["bbbbbbb.", "bBBBBBBb", "bbbbbbb."], 7, 8, {"b": WOOD[3], "B": WOOD[5]})
        stamp(c, ["BBB", ".B."], 10, 12, {"B": b[3]})
        stamp(c, ["gggggggggg"], 3, 15, {"g": STONE[0]})
    outline(c)
    return c


# --- rooms ------------------------------------------------------------------------------------------------------------

WALLS = ("plain", "window", "sconce", "shelf", "side", "door")


def room_wall(kind: str, neon, frame: int = 0) -> Canvas:
    """The back wall seen face-on: a dark beam, plaster, a wainscot, the skirting. Side and bottom rows use "side"."""
    c = Canvas(16, 16)
    b = neon["blue"]
    v = neon["violet"]
    if kind == "side":
        c.rect(0, 0, 16, 16, WOOD[1])
        c.rect(0, 0, 16, 2, WOOD[3])
        c.rect(0, 14, 16, 2, WOOD[0])
        for x in (3, 11):
            c.rect(x, 2, 1, 12, WOOD[2])
        return c
    c.rect(0, 0, 16, 16, PLASTER[0])
    c.rect(0, 0, 16, 2, WOOD[1])
    c.rect(0, 2, 16, 1, WOOD[0])
    for (x, y) in ((3, 4), (11, 6), (6, 7)):
        c.set(x, y, PLASTER[1])
    c.rect(0, 9, 16, 1, WOOD[4])
    c.rect(0, 10, 16, 5, WOOD[2])
    for x in (0, 5, 10, 15):
        c.rect(x, 10, 1, 5, WOOD[1])
    c.rect(0, 15, 16, 1, WOOD[0])
    if kind == "window":
        c.rect(3, 2, 10, 8, WOOD[1])
        c.rect(4, 3, 8, 6, b[0])
        c.rect(4, 3, 8, 2, b[1])
        c.rect(7, 3, 1, 6, WOOD[2])
        c.rect(4, 6, 8, 1, WOOD[2])
        c.set(5, 4, b[4])
        c.set(10, 7, v[3])
        c.rect(3, 9, 10, 1, WOOD[4])
    elif kind == "sconce":
        c.rect(7, 7, 2, 3, STONE[1])
        stamp(c, [".2.", "232", ".1."] if frame == 0 else [".3.", "232", ".1."], 6, 3, {"1": b[2], "2": b[3], "3": b[4]})
        c.set(7, 4, b[5])
    elif kind == "shelf":
        c.rect(2, 5, 12, 1, WOOD[4])
        c.rect(2, 6, 12, 1, WOOD[0])
        stamp(c, ["g.r.b.", "g.r.bB"], 3, 3, {"g": LEAF[0], "r": QUILT[3], "b": b[3], "B": b[4]})
        c.set(12, 4, BONE[1])
        c.set(12, 3, BONE[1])
    elif kind == "door":
        c.rect(3, 3, 10, 13, WOOD[0])
        c.rect(4, 4, 8, 12, WOOD[3])
        c.rect(4, 4, 4, 12, WOOD[4])
        c.rect(7, 4, 1, 12, WOOD[1])
        c.rect(4, 3, 8, 1, WOOD[1])
        c.set(10, 10, GOLD[2])
        stamp(c, ["2", "3"], 7, 0, {"2": b[3], "3": b[5]})
    return c


KIT = ("bed", "table", "dresser", "plant", "stove")


def flame_rows(frame: int) -> list[str]:
    return [
        ["......2.......", ".....232...2..", "....23432.....", "...2344432....", "..234444432...", ".23444444432..", ".12333333321..", "..111111111..."],
        [".......2......", "..2...232.....", "....23432.....", "...2344432....", "..234444432...", "..2344444432..", ".12333333321..", "..111111111..."],
    ][frame % 2]


def room_kit(kind: str, neon, frame: int = 0) -> Canvas:
    c = Canvas(32, 32)
    b = neon["blue"]
    if kind == "bed":
        c.rect(1, 4, 30, 6, WOOD[2])
        c.rect(1, 4, 30, 1, WOOD[4])
        c.rect(2, 6, 2, 2, WOOD[5])
        c.rect(28, 6, 2, 2, WOOD[5])
        c.rect(2, 10, 28, 18, WOOD[1])
        c.rect(4, 10, 24, 5, BONE[1])
        c.rect(4, 10, 11, 1, BONE[2])
        c.rect(17, 10, 11, 1, BONE[2])
        c.rect(15, 10, 2, 5, BONE[0])
        for y in range(15, 27):
            for x in range(3, 29):
                c.set(x, y, (QUILT[2], QUILT[3], QUILT[1])[((x - 3) // 6 + (y - 15) // 4) % 3])
        c.rect(3, 15, 26, 1, QUILT[4])
        c.rect(3, 27, 26, 1, QUILT[0])
        c.rect(2, 28, 2, 3, WOOD[1])
        c.rect(28, 28, 2, 3, WOOD[1])
    elif kind == "table":
        c.rect(3, 12, 26, 8, WOOD[4])
        c.rect(3, 12, 26, 1, WOOD[5])
        c.rect(3, 19, 26, 2, WOOD[2])
        for x in (4, 26):
            c.rect(x, 21, 2, 8, WOOD[1])
        stamp(c, ["bbbb", ".BB."], 7, 13, {"b": STONE[3], "B": STONE[1]})
        stamp(c, ["cc", "cc"], 21, 14, {"c": "#c4a080"})
        stamp(c, [".3.", "232", ".2.", ".w.", ".w.", "www"], 14, 6, {"2": b[3], "3": b[5], "w": BONE[1]})
        stamp(c, ["ssss", ".ss.", "s..s"], 0, 26, {"s": WOOD[3]})
        stamp(c, ["ssss", ".ss.", "s..s"], 28, 26, {"s": WOOD[3]})
    elif kind == "dresser":
        c.rect(4, 6, 24, 24, WOOD[2])
        c.rect(4, 6, 24, 2, WOOD[5])
        for y in (10, 17, 24):
            c.rect(6, y, 20, 5, WOOD[3])
            c.rect(6, y, 20, 1, WOOD[4])
            c.rect(15, y + 2, 2, 1, GOLD[2])
        c.rect(5, 30, 2, 2, WOOD[0])
        c.rect(25, 30, 2, 2, WOOD[0])
        stamp(c, ["vv", "VV", "VV"], 8, 3, {"v": neon["violet"][3], "V": neon["violet"][2]})
        stamp(c, ["bbbbb", "bBBBb"], 18, 4, {"b": BONE[0], "B": BONE[1]})
    elif kind == "plant":
        stamp(c, ["...g..g...", "..gGg.Gg..", ".gGgGgGgg.", "gGg.gGg.Gg", ".g.gGgGg..", "...gGGg...", "....gg...."], 11, 7, {"g": LEAF[0], "G": LEAF[1]})
        stamp(c, ["pppppppp", "pPPPPPPp", ".pPPPPp.", ".pPPPPp.", "..pppp.."], 12, 14, {"p": CLAY[0], "P": CLAY[1]})
    elif kind == "stove":
        c.rect(6, 2, 4, 8, STONE[1])
        c.rect(6, 2, 1, 8, STONE[3])
        c.rect(3, 10, 26, 18, STONE[1])
        c.rect(3, 10, 26, 2, STONE[3])
        c.rect(8, 15, 16, 10, DARK)
        stamp(c, flame_rows(frame), 9, 16, {"1": b[2], "2": b[3], "3": b[4], "4": b[5]})
        c.rect(8, 15, 16, 1, STONE[0])
        c.rect(4, 28, 3, 3, STONE[0])
        c.rect(25, 28, 3, 3, STONE[0])
    outline(c)
    return c


def room_rug(neon) -> Canvas:
    c = Canvas(64, 32)
    v = neon["violet"]
    for y in range(32):
        for x in range(64):
            if x < 3 or y < 3 or x > 60 or y > 28:
                c.set(x, y, GOLD[0] if (x + y) % 2 else GOLD[1])
                continue
            d = abs(x - 31.5) / 26 + abs(y - 15.5) / 11
            if d < 0.35:
                col = v[3] if d < 0.18 else v[2]
            elif abs(d - 0.62) < 0.07:
                col = GOLD[1]
            elif d < 1:
                col = QUILT[1] if (x // 2 + y // 2) % 2 else QUILT[2]
            else:
                col = QUILT[0]
            c.set(x, y, col)
    for x in range(0, 64, 3):
        c.set(x, 0, BONE[0])
        c.set(x, 31, BONE[0])
    return c


def room_boards(i: int) -> Canvas:
    """Long floorboards for the rooms (the old short planks read as brick): four 4 px boards a tile, staggered seams,
    a highlight edge, grain, and a nail at each seam. i picks the seams, so neighbouring tiles never line up."""
    c = Canvas(16, 16)
    body = (WOOD[4], WOOD[3], WOOD[4], "#5a4030")
    for row in range(4):
        y = row * 4
        col = body[(row + i) % 4]
        c.rect(0, y, 16, 1, WOOD[5] if (row + i) % 2 == 0 else WOOD[4])
        c.rect(0, y + 1, 16, 2, col)
        c.rect(0, y + 3, 16, 1, WOOD[0])
        seam = (i * 5 + row * 7 + 3) % 16
        c.rect(seam, y, 1, 3, WOOD[0])
        c.set((seam + 2) % 16, y + 1, WOOD[6])
        for gx in ((seam + 6) % 16, (seam + 11) % 16):
            c.set(gx, y + 2, WOOD[2])
    return c
