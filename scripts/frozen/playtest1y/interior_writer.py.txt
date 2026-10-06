"""Interior writer (playtest1i, 2026-10-02): every building's inside drawn to the same finish as its outside.
[OWNER-REQUESTED 2026-10-02 19:43 ET: playtest1h art and loading audit]

Bill (2026-10-02 19:43 ET): "make sure the inside of buildings is up to date and quality of textures as the outside".
The 1h audit found all sixteen rooms on one plank floor, one wall and one rug, and their trade pieces (counters, pews,
the forge and anvil, the card table, the cauldron, the orrery, the nets, the shelves) still painted as flat blocks.
This writer draws, in the gloom-and-glow look (palette v3, hard alpha, the wild writer's snapping Canvas):

    floor(style)        128x128 wrapping floor, one per outside style: the log cabin's wide pegged planks, the stone
                        house's flagstones, the boarded house's blue-washed boards, the timber house's warm boards
    wall(style, k, f)   16x16 inside walls matching each outside: horizontal logs with mossy chinking (cabin), ashlar
                        blocks (stone), blue vertical boards (slate), plaster and beams (warm); cells plain, window,
                        sconce, shelf, side, door, sconce (frame 2); each style's sconce burns one signature glow
    wall_em(...)        the window panes and sconce flames only, for the light layer
    furn(k, f)          32x32 trade pieces: counter, bookcase, narrow shelf, pew, altar, anvil, forge (2 frames), card
                        table, cauldron (2 frames), orrery, net, crates, potion table, inn table, strongbox, mannequin,
                        weapon rack; furn_em the parts that glow (forge mouth, altar candles, cauldron brew, orrery)
    rug(style)          64x32 woven rug in each style's colourway
"""

from __future__ import annotations

import math
import random
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
sys.path.insert(0, str(HERE.parent / "sprite-writer"))

from wild_writer import Canvas, fbm, ramp, tone, INK  # noqa: E402
from glow_writer import stamp, outline  # noqa: E402
from palette_locked import NEON  # noqa: E402

TAG = "[OWNER-REQUESTED 2026-10-02 19:43 ET: playtest1h art and loading audit]"
TEX = 128
STYLES = ("cabin", "stone", "slate", "warm")
WALLS = ("plain", "window", "sconce", "shelf", "side", "door", "sconce2")
FURN = ("counter", "bookcase", "narrow", "pew", "altar", "anvil", "forge", "forge2", "cardtable", "cauldron", "cauldron2",
        "orrery", "net", "crates", "potions", "inntable", "strongbox", "mannequin", "rack")
GLOW = {"cabin": "blue", "stone": "violet", "slate": "blue", "warm": "red"}

WOOD = ramp("#2a1c14", "#3a2818", "#4a3424", "#5a3828", "#6a5038", "#8a6848", "#a07850", "#c4a574")
LOG = ramp("#2a1c14", "#3a2818", "#4a3424", "#5a4030", "#6a5038", "#8a6848")
STONE = ramp("#2a2420", "#4a4450", "#5a564e", "#6a6660", "#8a867c", "#b7b2a6")
SLATE = ramp("#16304a", "#2a3a6a", "#3a4a68", "#4a5a78", "#5a6878")
PLASTER = ramp("#3a3028", "#4a4038", "#5a5048", "#6a6058")
MOSS = ramp("#2a4030", "#3a5a38", "#4a6a40")
IRON = ramp("#2a2428", "#4a4a50", "#6a6e78", "#9aa0aa")
GOLD = ramp("#8a6840", "#c4a050", "#e0c060", "#f4e27a")
BONE = ramp("#c4b49a", "#e8dcc8", "#f4efe4")
FELT = ramp("#143028", "#1e4634", "#2a5a40")
CLOTH = ramp("#3a1830", "#5a2838", "#6a3048", "#8a4860")
RED = NEON["red"]
BLUE = NEON["blue"]
VIOLET = NEON["violet"]


def _h(x: int, y: int, s: int) -> float:
    n = (x * 374761393 + y * 668265263 + s * 2246822519) & 0xFFFFFFFF
    n = (n ^ (n >> 13)) * 1274126177 & 0xFFFFFFFF
    return ((n ^ (n >> 16)) & 0xFFFF) / 65535.0


# ---------------------------------------------------------------- floors

def floor(style: str) -> Canvas:
    c = Canvas(TEX, TEX)
    if style == "stone":
        _flags(c)
    else:
        _boards(c, style)
    return c


def _boards(c: Canvas, style: str) -> None:
    """Long boards (rows of 6 px: 5 of board, 1 of gap) with staggered butt joints, grain, knots and pegs."""
    if style == "slate":
        body = ramp("#2a3a6a", "#3a4a68", "#4a5a78", "#5a6878")
        gap, peg = "#16304a", IRON[2]
        worn = ramp("#4a3424", "#5a4030")
    elif style == "warm":
        body = ramp("#4a3424", "#5a3828", "#6a5038", "#8a6848")
        gap, peg = WOOD[0], GOLD[0]
        worn = None
    else:
        body = ramp("#3a2818", "#4a3424", "#5a4030", "#6a5038")
        gap, peg = WOOD[0], IRON[1]
        worn = None
    H = 6
    rng = random.Random(71 + len(style))
    for row in range(TEX // H + 1):
        y0 = row * H
        x = rng.randrange(TEX)
        joints = []
        while len(joints) < 4:
            joints.append(x % TEX)
            x += 24 + rng.randrange(28)
        shade = rng.random()
        for yy in range(y0, min(TEX, y0 + H)):
            for xx in range(TEX):
                if yy == y0 + H - 1:
                    c.set(xx, yy, gap)
                    continue
                n = fbm(xx * 0.5, yy * 3.0, TEX, 11 + row)
                t = 0.15 + 0.45 * shade + 0.35 * n
                if yy == y0:
                    t += 0.18
                col = body[tone(min(1, t), xx, yy, len(body) - 1)]
                if worn and n > 0.78:
                    col = worn[1] if n > 0.86 else worn[0]
                c.set(xx, yy, col)
        for j in joints:
            for yy in range(y0, min(TEX, y0 + H - 1)):
                c.set(j, yy, gap)
            c.set((j + 2) % TEX, y0 + 2, peg)
            c.set((j - 2) % TEX, y0 + 2, peg)
        for _ in range(2):
            kx = rng.randrange(TEX)
            c.set(kx, y0 + 2, body[0])
            c.set((kx + 1) % TEX, y0 + 2, gap)
            c.set(kx, y0 + 1, body[0])


def _flags(c: Canvas) -> None:
    """Flagstones: rows of 14-18 px of irregular slabs, 1 px dark joints, worn tops, cracks and a little moss."""
    rng = random.Random(907)
    y = 0
    slabs = []
    while y < TEX:
        h = 14 + rng.randrange(5)
        if y + h > TEX - 8:
            h = TEX - y
        x = rng.randrange(16)
        start = x
        while x < start + TEX:
            w = 14 + rng.randrange(14)
            if x + w > start + TEX - 8:
                w = start + TEX - x
            slabs.append((x, y, w, h))
            x += w
        y += h
    for k, (x0, y0, w, h) in enumerate(slabs):
        base = rng.random()
        for yy in range(y0, y0 + h):
            for xx in range(x0, x0 + w):
                X, Y = xx % TEX, yy % TEX
                if xx == x0 or yy == y0:
                    c.set(X, Y, STONE[0])
                    continue
                n = fbm(X, Y, TEX, 5)
                t = 0.1 + 0.4 * base + 0.3 * n
                if yy == y0 + 1 or xx == x0 + 1:
                    t += 0.2
                if yy == y0 + h - 1 or xx == x0 + w - 1:
                    t -= 0.15
                c.set(X, Y, STONE[1 + tone(max(0, min(1, t)), X, Y, len(STONE) - 4)])
        if k % 3 == 0:
            cx, cy = x0 + 3 + rng.randrange(max(1, w - 6)), y0 + 3 + rng.randrange(max(1, h - 6))
            for i in range(5):
                c.set((cx + i) % TEX, (cy + (i // 2)) % TEX, STONE[0])
        if k % 5 == 1:
            for i in range(3):
                c.set((x0 + 1 + i) % TEX, (y0 + h - 1) % TEX, MOSS[i % 2])


# ---------------------------------------------------------------- walls

def _wall_face(c: Canvas, style: str) -> None:
    """The back wall's face from row 2 to 9 (the wainscot below is shared)."""
    if style == "cabin":
        for y in range(2, 10):
            band = (y - 2) % 4
            for x in range(16):
                col = (LOG[4], LOG[3], LOG[2], LOG[0])[band]
                if band == 1 and _h(x, y, 3) > 0.8:
                    col = LOG[4]
                if band == 3 and _h(x, y, 5) > 0.6:
                    col = MOSS[0]
                c.set(x, y, col)
    elif style == "stone":
        for y in range(2, 10):
            for x in range(16):
                row = (y - 2) // 4
                off = 4 if row % 2 else 0
                joint = (y - 2) % 4 == 3 or (x + off) % 8 == 7
                n = _h(x // 8 + row, row, 9)
                c.set(x, y, STONE[0] if joint else STONE[2 + int(n * 2.9) % 3 if not ((y - 2) % 4 == 0) else 4])
    elif style == "slate":
        for y in range(2, 10):
            for x in range(16):
                c.set(x, y, SLATE[0] if x % 4 == 3 else SLATE[2 + (1 if x % 4 == 0 else 0) - (1 if _h(x // 4, y, 2) > 0.85 else 0)])
    else:
        for y in range(2, 10):
            for x in range(16):
                c.set(x, y, PLASTER[0] if _h(x, y, 1) < 0.85 else PLASTER[1])
        c.rect(7, 2, 2, 8, WOOD[2])


def wall(style: str, kind: str) -> Canvas:
    c = Canvas(16, 16)
    g = NEON[GLOW[style]]
    trim = SLATE if style == "slate" else STONE if style == "stone" else WOOD
    if kind == "side":
        if style == "cabin":
            for y in range(16):
                for x in range(16):
                    c.set(x, y, (LOG[3], LOG[2], LOG[1], LOG[0])[y % 4] if not (x in (0, 15)) else LOG[0])
        elif style == "stone":
            for y in range(16):
                for x in range(16):
                    joint = y % 4 == 3 or (x + (4 if (y // 4) % 2 else 0)) % 8 == 7
                    c.set(x, y, STONE[0] if joint else STONE[2 if y % 4 else 3])
        elif style == "slate":
            for y in range(16):
                for x in range(16):
                    c.set(x, y, SLATE[0] if x % 4 == 3 else SLATE[2])
            c.rect(0, 0, 16, 2, SLATE[4])
        else:
            c.rect(0, 0, 16, 16, WOOD[1])
            c.rect(0, 0, 16, 2, WOOD[3])
            for x in (3, 11):
                c.rect(x, 2, 1, 12, WOOD[2])
        c.rect(0, 15, 16, 1, INK)
        return c
    # beam, face, wainscot, skirting
    c.rect(0, 0, 16, 2, trim[1] if style != "warm" else WOOD[1])
    c.rect(0, 1, 16, 1, trim[0])
    _wall_face(c, style)
    c.rect(0, 9, 16, 1, WOOD[5])
    for y in range(10, 15):
        for x in range(16):
            c.set(x, y, WOOD[1] if x % 5 == 0 else (WOOD[3] if y == 10 else WOOD[2]))
    c.rect(0, 15, 16, 1, WOOD[0])
    if kind == "window":
        c.rect(3, 2, 10, 8, WOOD[1])
        c.rect(4, 3, 8, 6, BLUE[0])
        c.rect(4, 3, 8, 2, BLUE[1])
        c.rect(7, 3, 1, 6, WOOD[3])
        c.rect(4, 6, 8, 1, WOOD[3])
        c.set(5, 4, BLUE[4])
        c.set(10, 7, VIOLET[3])
        c.set(9, 4, BLUE[3])
        c.rect(3, 9, 10, 1, WOOD[6])
    elif kind in ("sconce", "sconce2"):
        c.rect(7, 7, 2, 3, IRON[1])
        c.set(6, 7, IRON[2])
        c.set(9, 7, IRON[2])
        stamp(c, [".2.", "232", ".1."] if kind == "sconce" else [".3.", "232", ".1."], 6, 3, {"1": g[2], "2": g[3], "3": g[4]})
        c.set(7, 2 if kind == "sconce2" else 3, g[5])
    elif kind == "shelf":
        c.rect(2, 6, 12, 1, WOOD[6])
        c.rect(2, 7, 12, 1, WOOD[0])
        stamp(c, ["g.r.b.v", "g.r.bBv"], 3, 4, {"g": MOSS[1], "r": CLOTH[3], "b": BLUE[3], "B": BLUE[4], "v": VIOLET[3]})
        c.set(12, 3, BONE[1])
    elif kind == "door":
        c.rect(3, 3, 10, 13, WOOD[0])
        c.rect(4, 4, 8, 12, WOOD[3])
        c.rect(4, 4, 4, 12, WOOD[4])
        c.rect(7, 4, 1, 12, WOOD[1])
        c.rect(4, 3, 8, 1, WOOD[1])
        c.set(10, 10, GOLD[2])
        stamp(c, ["2", "3"], 7, 0, {"2": g[3], "3": g[5]})
    return c


def wall_em(style: str, kind: str) -> Canvas:
    """Only the pixels that glow (window panes, a sconce's flame, the lamp over the door), for the light layer."""
    full = wall(style, kind)
    g = NEON[GLOW[style]]
    keep = set(BLUE[1:]) | set(g[2:]) | {VIOLET[3]}
    c = Canvas(16, 16)
    if kind in ("window", "sconce", "sconce2", "door"):
        for y in range(16):
            for x in range(16):
                p = full.get(x, y)
                if p in keep and not (kind == "window" and p == BLUE[0]):
                    c.set(x, y, p)
    return c


# ---------------------------------------------------------------- furniture

def _legs(c: Canvas, xs, y0: int, y1: int, col) -> None:
    for x in xs:
        c.rect(x, y0, 2, y1 - y0, col)


def furn(kind: str) -> Canvas:
    c = Canvas(32, 32)
    f2 = kind.endswith("2")
    k = kind[:-1] if f2 else kind
    if k == "counter":
        c.rect(1, 14, 30, 4, WOOD[6])
        c.rect(1, 14, 30, 1, WOOD[7])
        c.rect(2, 18, 28, 12, WOOD[2])
        for x in (2, 11, 20, 29):
            c.rect(x, 18, 1, 12, WOOD[1])
        for x in (5, 14, 23):
            c.rect(x, 21, 4, 6, WOOD[3])
        c.rect(1, 30, 30, 1, WOOD[0])
        stamp(c, ["GGG", "G.G", ".g."], 4, 11, {"G": GOLD[1], "g": GOLD[0]})
        stamp(c, ["bbbbb", "BBBBB"], 12, 12, {"b": BONE[1], "B": BONE[0]})
        stamp(c, [".3.", "232", ".w."], 24, 10, {"2": BLUE[3], "3": BLUE[5], "w": BONE[1]})
    elif k == "bookcase":
        c.rect(1, 2, 30, 29, WOOD[1])
        c.rect(1, 2, 30, 2, WOOD[5])
        for sy in (10, 18, 26):
            c.rect(2, sy, 28, 1, WOOD[5])
        cols = (CLOTH[2], BLUE[2], MOSS[1], GOLD[0], VIOLET[2], CLOTH[3], STONE[3])
        rng = random.Random(5)
        for sy in (4, 12, 20):
            x = 3
            while x < 29:
                w = 1 + rng.randrange(2)
                h = 4 + rng.randrange(3)
                col = cols[rng.randrange(len(cols))]
                c.rect(x, sy + 6 - h, w, h, col)
                x += w + (1 if rng.random() < 0.3 else 0)
        stamp(c, ["bB", "bB"], 24, 24, {"b": BLUE[3], "B": BLUE[4]})
        stamp(c, ["vv", "VV"], 6, 24, {"v": VIOLET[3], "V": VIOLET[2]})
        c.rect(1, 30, 30, 1, WOOD[0])
    elif k == "narrow":
        c.rect(8, 2, 16, 29, WOOD[1])
        c.rect(8, 2, 16, 2, WOOD[5])
        for sy in (10, 18, 26):
            c.rect(9, sy, 14, 1, WOOD[5])
        for j, sy in enumerate((5, 13, 21)):
            for i, col in enumerate((BLUE[3], VIOLET[3], RED[3], MOSS[2])):
                x = 10 + i * 3
                c.rect(x, sy + 1, 2, 4, col if (i + j) % 2 else BLUE[2])
                c.set(x, sy, BONE[0])
        c.set(11, 6, BLUE[5])
        c.set(17, 22, VIOLET[5])
    elif k == "pew":
        c.rect(1, 12, 30, 3, WOOD[2])
        c.rect(1, 12, 30, 1, WOOD[5])
        c.rect(1, 18, 30, 4, WOOD[4])
        c.rect(1, 18, 30, 1, WOOD[6])
        c.rect(1, 22, 30, 1, WOOD[1])
        _legs(c, (2, 28), 15, 18, WOOD[1])
        _legs(c, (2, 28), 23, 29, WOOD[1])
        c.rect(1, 9, 2, 6, WOOD[3])
        c.rect(29, 9, 2, 6, WOOD[3])
        c.rect(13, 19, 6, 2, CLOTH[2])
    elif k == "altar":
        c.rect(3, 16, 26, 14, STONE[2])
        c.rect(3, 16, 26, 2, STONE[4])
        c.rect(5, 19, 22, 9, CLOTH[1])
        c.rect(5, 19, 22, 1, GOLD[1])
        for x in (8, 16, 23):
            c.rect(x, 21, 1, 6, GOLD[0])
        stamp(c, ["..g..", ".ggg.", "..g..", "..g.."], 14, 8, {"g": GOLD[2]})
        for x in (6, 24):
            stamp(c, [".3.", "232", ".w.", ".w.", ".w."], x, 9, {"2": BLUE[3], "3": BLUE[5], "w": BONE[1]})
        c.rect(3, 30, 26, 1, STONE[0])
    elif k == "anvil":
        stamp(c, [
            "..IIIIIIIIIIIIIIIIIII.....",
            "IIiiiiiiiiiiiiiiiiiiiIIII.",
            ".IIIIIIIIIIIIIIIIIIIIIIIII",
            "....IIIIIIIIIIIIIIII......",
            "......IIIIIIIIIIII........",
            "......IIIIIIIIIIII........",
            ".....IIIIIIIIIIIIII.......",
            "....IIIIIIIIIIIIIIII......",
        ], 3, 14, {"I": IRON[1], "i": IRON[3]})
        c.rect(7, 22, 18, 7, WOOD[2])
        c.rect(7, 22, 18, 1, WOOD[4])
        stamp(c, ["hhhhhhhH", "......HH"], 15, 12, {"h": WOOD[4], "H": IRON[2]})
        c.set(9, 15, RED[4])
    elif k == "forge":
        c.rect(2, 8, 28, 22, STONE[1])
        c.rect(2, 8, 28, 2, STONE[3])
        for y in range(10, 30, 4):
            for x in range(2, 30, 6):
                c.set(x + (3 if (y // 4) % 2 else 0), y, STONE[0])
        c.rect(10, 0, 12, 8, STONE[2])
        c.rect(10, 0, 1, 8, STONE[4])
        c.rect(7, 15, 18, 11, INK)
        flame = [["......2.......", ".....232...2..", "....23432.....", "...2344432....", "..234444432...", ".23444444432..", "1233333333321.", ".11111111111.."],
                 [".......2......", "..2...232.....", "....23432.....", "...2344432....", "..234444432...", "..2344444432..", "12333333333321", ".11111111111.."]][1 if f2 else 0]
        stamp(c, flame, 9, 17, {"1": RED[1], "2": RED[2], "3": RED[3], "4": RED[4]})
        c.rect(5, 26, 22, 2, STONE[4])
        c.rect(2, 30, 28, 1, STONE[0])
    elif k == "cardtable":
        c.rect(1, 12, 30, 10, WOOD[3])
        c.rect(2, 13, 28, 8, FELT[1])
        c.rect(2, 13, 28, 1, FELT[2])
        c.rect(1, 22, 30, 2, WOOD[1])
        _legs(c, (3, 27), 24, 30, WOOD[1])
        stamp(c, ["ww.ww", "wr.wk", "ww.ww"], 7, 15, {"w": BONE[2], "r": RED[2], "k": INK})
        stamp(c, ["GG", "gg", "RR", "rr"], 20, 15, {"G": GOLD[2], "g": GOLD[0], "R": RED[3], "r": RED[1]})
        stamp(c, ["bb", "BB"], 24, 16, {"b": BLUE[3], "B": BLUE[2]})
    elif k == "cauldron":
        c.rect(4, 26, 24, 4, STONE[1])
        stamp(c, [".r.r..r.r.r.", "rRrRrrRrRRr."], 10, 24, {"r": RED[2], "R": RED[3]})
        stamp(c, [
            "...IIIIIIIIIIIIIIIIII...",
            "..IibbbbbbbbbbbbbbbbiI..",
            ".IIIIIIIIIIIIIIIIIIIIII.",
            ".IIIIIIIIIIIIIIIIIIIIII.",
            "IIIIIIIIIIIIIIIIIIIIIIII",
            "IIIIIIIIIIIIIIIIIIIIIIII",
            ".IIIIIIIIIIIIIIIIIIIIII.",
            "..IIIIIIIIIIIIIIIIIIII..",
            "...IIIIIIIIIIIIIIIIII...",
            ".....IIIIIIIIIIIIII.....",
        ], 4, 14, {"I": IRON[0], "i": IRON[2], "b": BLUE[3]})
        c.rect(6, 17, 20, 1, IRON[2])
        bub = [(9, 13), (15, 12), (21, 13), (12, 9), (19, 7)] if not f2 else [(11, 13), (17, 12), (20, 10), (14, 8), (9, 6)]
        for i, (x, y) in enumerate(bub):
            c.set(x, y, BLUE[4] if i % 2 else BLUE[5])
            if i < 3:
                c.set(x + 1, y, BLUE[3])
        c.rect(6, 15, 20, 1, BLUE[4])
    elif k == "orrery":
        c.rect(12, 24, 8, 6, WOOD[2])
        c.rect(10, 29, 12, 2, WOOD[1])
        c.rect(15, 12, 2, 12, GOLD[0])
        for a in range(0, 360, 12):
            x = 16 + round(12 * math.cos(math.radians(a)))
            y = 13 + round(5 * math.sin(math.radians(a)))
            c.set(x, y, GOLD[1])
        for a in range(0, 360, 20):
            x = 16 + round(7 * math.cos(math.radians(a)))
            y = 13 + round(8 * math.sin(math.radians(a)))
            c.set(x, y, GOLD[0])
        stamp(c, [".vv.", "vVVv", "vVVv", ".vv."], 14, 11, {"v": VIOLET[2], "V": VIOLET[4]})
        stamp(c, ["b", ], 4, 13, {"b": BLUE[4]})
        stamp(c, ["mm.", "m..", "mm."], 25, 8, {"m": BONE[2]})
        c.set(9, 5, VIOLET[5])
    elif k == "net":
        for y in range(4, 26):
            for x in range(3, 29):
                if (x + y) % 4 == 0 or (x - y) % 4 == 0:
                    if y < 6 or x < 4 or x > 27 or (y < 26 - abs(x - 16) // 3):
                        c.set(x, y, BONE[0] if (x + y) % 8 else WOOD[5])
        c.rect(2, 3, 28, 2, WOOD[4])
        stamp(c, [".rr.", "rRRr", ".rr."], 8, 14, {"r": RED[2], "R": RED[3]})
        stamp(c, [".bb.", "bBBb", ".bb."], 20, 18, {"b": BLUE[2], "B": BLUE[4]})
    elif k == "crates":
        for (x0, y0, w, h) in ((2, 16, 16, 14), (16, 20, 14, 10), (8, 8, 12, 9)):
            c.rect(x0, y0, w, h, WOOD[3])
            c.rect(x0, y0, w, 1, WOOD[5])
            for yy in range(y0 + 3, y0 + h, 3):
                c.rect(x0, yy, w, 1, WOOD[1])
            c.rect(x0, y0, 1, h, WOOD[1])
            c.rect(x0 + w - 1, y0, 1, h, WOOD[1])
        stamp(c, ["ff..ff", "fFFFFf", ".fFFf.", "fFFFFf", "ff..ff"], 20, 15, {"f": SLATE[3], "F": BLUE[2]})
        stamp(c, ["ffF", "FFF"], 10, 6, {"f": SLATE[3], "F": BONE[0]})
    elif k == "potions":
        c.rect(2, 16, 28, 4, WOOD[5])
        c.rect(2, 16, 28, 1, WOOD[6])
        c.rect(3, 20, 26, 9, WOOD[2])
        _legs(c, (3, 27), 20, 30, WOOD[1])
        for i, (col, hi) in enumerate(((RED[2], RED[4]), (MOSS[1], MOSS[2]), (BLUE[2], BLUE[4]), (VIOLET[2], VIOLET[4]))):
            x = 5 + i * 6
            h = 6 + (i % 2) * 2
            c.rect(x, 16 - h, 4, h, col)
            c.set(x + 1, 16 - h + 1, hi)
            c.rect(x + 1, 16 - h - 2, 2, 2, BONE[0])
    elif k == "inntable":
        c.rect(2, 14, 28, 6, WOOD[5])
        c.rect(2, 14, 28, 1, WOOD[7])
        c.rect(2, 20, 28, 2, WOOD[2])
        _legs(c, (4, 26), 22, 30, WOOD[1])
        for x in (6, 20):
            stamp(c, ["bbbb.", "BBBBb", "BBBB.", "BBBB."], x, 9, {"b": BONE[2], "B": WOOD[4]})
        stamp(c, [".3.", "232", ".w.", "www"], 14, 8, {"2": RED[3], "3": RED[5], "w": BONE[1]})
    elif k == "strongbox":
        c.rect(5, 10, 22, 19, IRON[1])
        c.rect(5, 10, 22, 2, IRON[3])
        c.rect(5, 18, 22, 1, IRON[0])
        for x in (8, 23):
            c.rect(x, 10, 1, 19, IRON[2])
        stamp(c, [".GG.", "GggG", "GggG", ".GG."], 14, 19, {"G": GOLD[1], "g": GOLD[0]})
        c.set(15, 21, BLUE[4])
        stamp(c, ["GG.GG", "GGGGG"], 10, 6, {"G": GOLD[2]})
        c.rect(4, 29, 24, 1, IRON[0])
    elif k == "mannequin":
        c.rect(15, 23, 2, 6, WOOD[2])
        c.rect(10, 29, 12, 2, WOOD[1])
        stamp(c, [
            "....cccccc....",
            "...cCCCCCCc...",
            "..cCCCCCCCCc..",
            "..cCCCvvCCCc..",
            "..cCCCCCCCCc..",
            "...cCCCCCCc...",
            "...cCCCCCCc...",
            "..cCCCCCCCCc..",
            "..cccccccccc..",
        ], 9, 12, {"c": CLOTH[1], "C": CLOTH[3], "v": VIOLET[3]})
        c.rect(14, 8, 4, 4, BONE[0])
        stamp(c, ["nnn", "n.n"], 26, 18, {"n": BONE[1]})
        c.rect(23, 20, 6, 1, GOLD[1])
    elif k == "rack":
        c.rect(3, 6, 26, 2, WOOD[4])
        c.rect(3, 27, 26, 2, WOOD[4])
        _legs(c, (3, 27), 6, 30, WOOD[2])
        for i, x in enumerate((8, 14, 20)):
            c.rect(x, 4, 1, 22, IRON[3] if i != 1 else IRON[2])
            c.rect(x - 1, 21, 3, 1, GOLD[1])
        stamp(c, [".RR.", "RRRR", "RRRR", ".RR."], 23, 11, {"R": RED[2]})
        c.set(24, 12, RED[4])
    outline(c)
    return c


FURN_GLOW = {"altar", "forge", "forge2", "cauldron", "cauldron2", "orrery", "counter", "inntable", "narrow", "strongbox"}


def furn_em(kind: str) -> Canvas:
    full = furn(kind)
    keep = set(RED[2:]) | set(BLUE[3:]) | set(VIOLET[3:])
    c = Canvas(32, 32)
    if kind in FURN_GLOW:
        for y in range(32):
            for x in range(32):
                p = full.get(x, y)
                if p in keep:
                    c.set(x, y, p)
    return c


# ---------------------------------------------------------------- rugs

RUGS = {
    "cabin": (CLOTH, VIOLET, GOLD),
    "stone": (ramp("#16304a", "#2a3a6a", "#3a4a68", "#4a5a78"), BLUE, GOLD),
    "slate": (ramp("#2a1018", "#6a2030", "#8a3038", "#c43838"), RED, BONE),
    "warm": (ramp("#3a2818", "#5a3828", "#6a5038", "#8a6848"), RED, GOLD),
}


def rug(style: str) -> Canvas:
    body, glow, edge = RUGS[style]
    c = Canvas(64, 32)
    for y in range(32):
        for x in range(64):
            if x < 3 or y < 3 or x > 60 or y > 28:
                c.set(x, y, edge[0] if (x + y) % 2 else edge[1])
                continue
            d = abs(x - 31.5) / 26 + abs(y - 15.5) / 11
            if d < 0.35:
                col = glow[3] if d < 0.18 else glow[2]
            elif abs(d - 0.62) < 0.07:
                col = edge[1]
            elif d < 1:
                col = body[1] if (x // 2 + y // 2) % 2 else body[2]
            else:
                col = body[0]
            c.set(x, y, col)
    for x in range(0, 64, 3):
        c.set(x, 0, BONE[0])
        c.set(x, 31, BONE[0])
    return c


def sheets() -> dict:
    from pixel_writer import cells

    out = {}
    for s in STYLES:
        out[f"room-floor-{s}.png"] = floor(s).image()
        out[f"room-wall-{s}.png"] = cells([wall(s, k) for k in WALLS])
        out[f"room-wall-{s}_em.png"] = cells([wall_em(s, k) for k in WALLS])
    out["room-furn.png"] = cells([furn(k) for k in FURN])
    out["room-furn_em.png"] = cells([furn_em(k) for k in FURN])
    out["room-rugs.png"] = _stack([rug(s).image() for s in STYLES])
    return out


def _stack(ims):
    from PIL import Image

    W = max(i.width for i in ims)
    out = Image.new("RGBA", (W, sum(i.height for i in ims)), (0, 0, 0, 0))
    y = 0
    for i in ims:
        out.alpha_composite(i, (0, y))
        y += i.height
    return out
