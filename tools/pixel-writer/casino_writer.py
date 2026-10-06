"""Casino writer (playtest1x, [OWNER-APPROVED 2026-10-06 08:44 ET: playtest1x casino + town fixes]).

Bill (2026-10-06 08:44 ET): "The casino only has one game now, instead of the three it's supposed to have, it has no
singing stage, has no special shop guy." The Felt gets three game tables (roulette, blackjack, five-card draw poker), a singing
stage with velvet curtains, cold-fire footlights and a microphone, and the points merchant's prize shelf and counter.

Code only (no image generator), in interior_writer's gloom-and-glow finish: palette v3 through the snapping Canvas, hard
alpha, a 1 px ink outline, its WOOD/GOLD/BONE/FELT/CLOTH ramps and the three neon ramps. 32x32 cells in KINDS order,
room-casino.png, and room-casino_em.png (only the pixels that glow: neon tubes, bulbs, footlights, the wheel's zero).
"""

from __future__ import annotations

import math

from interior_writer import BONE, CLOTH, FELT, GOLD, IRON, WOOD, RED, BLUE, VIOLET, Canvas, INK, stamp, outline, _legs

TAG = "[OWNER-APPROVED 2026-10-06 08:44 ET: playtest1x casino + town fixes]"
KINDS = ("roulette", "blackjack", "poker", "stage_l", "stage_m", "stage_r", "curtain_l", "curtain_r", "mic", "prizeshelf", "prizecounter")
VELVET = ("#2a1018", "#6a2030", "#8a2030", "#c43838")


def _table(c: Canvas, top: int, bottom: int, felt=FELT) -> None:
    """A gaming table seen from the south: a wood rim, a felt top, a deep apron and two legs."""
    c.rect(1, top, 30, bottom - top, WOOD[3])
    c.rect(2, top + 1, 28, bottom - top - 2, felt[1])
    c.rect(2, top + 1, 28, 1, felt[2])
    c.rect(1, bottom, 30, 3, WOOD[1])
    c.rect(1, bottom, 30, 1, WOOD[4])
    for x in (4, 15, 26):
        c.set(x, bottom + 1, GOLD[1])
    _legs(c, (3, 27), bottom + 3, 30, WOOD[1])


def cell(kind: str) -> Canvas:
    c = Canvas(32, 32)
    if kind == "roulette":
        _table(c, 10, 22)
        cx, cy = 10, 16  # the wheel, an ellipse in 3/4 view: bone rim, red/black pockets, green zero, gold hub
        for y in range(11, 22):
            for x in range(3, 18):
                d = ((x - cx) / 7.2) ** 2 + ((y - cy) / 5.2) ** 2
                if d > 1:
                    continue
                if d > 0.72:
                    c.set(x, y, WOOD[5] if y < cy else WOOD[2])
                elif d > 0.38:
                    a = math.atan2((y - cy) * 1.4, x - cx)
                    k = int((a + math.pi) / (2 * math.pi) * 12) % 12
                    c.set(x, y, "#2a5a40" if k == 0 else RED[2] if k % 2 else INK)
                elif d > 0.12:
                    c.set(x, y, WOOD[3])
                else:
                    c.set(x, y, GOLD[2])
        c.set(cx, cy - 1, GOLD[3])
        c.set(cx + 3, cy - 2, BONE[2])  # the ball
        for i, x in enumerate(range(20, 29, 2)):  # the betting layout: red and black squares, a green zero
            for j, y in enumerate((13, 16, 19)):
                c.rect(x, y, 2, 2, RED[2] if (i + j) % 2 else INK)
        c.rect(19, 13, 1, 8, "#2a5a40")
        stamp(c, ["GG", "gg"], 25, 21, {"G": GOLD[2], "g": GOLD[0]})
        for x in range(2, 30):  # neon trim under the rim
            c.set(x, 25, RED[3] if x % 3 else RED[2])
    elif kind == "blackjack":
        # playtest1x (Bill, 10:30 ET: blackjack and draw poker replace the dice and high-low): a half-moon blackjack table,
        # green felt, a gold arc of five betting spots, the dealer's shoe and two cards dealt face up
        _table(c, 10, 22, felt=FELT)
        for i, x in enumerate((5, 10, 15, 20, 25)):
            y = 19 - (2 - abs(i - 2))  # the arc dips toward the player's side
            stamp(c, [".g.", "g.g", ".g."], x - 1, y - 1, {"g": GOLD[1]})
        stamp(c, ["IIII", "Iiii", "Iiii", "IIII"], 4, 11, {"I": IRON[2], "i": IRON[1]})  # the shoe
        for x, col in ((12, INK), (17, RED[2])):
            c.rect(x, 11, 5, 6, BONE[2])
            c.rect(x, 11, 5, 1, BONE[1])
            stamp(c, [".x.", "xxx", ".x."], x + 1, 13, {"x": col})
        stamp(c, ["BB", "bb"], 24, 11, {"B": BLUE[3], "b": BLUE[2]})  # a stack of cold-blue chips
        for x in range(2, 30):
            c.set(x, 25, BLUE[3] if x % 3 else BLUE[2])
    elif kind == "poker":
        # a round-cornered poker table in violet felt: five cards fanned at the player's seat, the pot's chips in the middle
        _table(c, 10, 22, felt=("#241848", "#4a2a78", "#5a3a8a"))
        for i in range(5):
            x = 6 + i * 4
            c.rect(x, 14 - (1 if i in (1, 3) else 2 if i == 2 else 0), 4, 6, BONE[2])
            c.set(x + 1, 16 - (1 if i in (1, 3) else 2 if i == 2 else 0), RED[2] if i % 2 else INK)
        for x in range(6, 26):
            c.set(x, 20, BONE[0])
        stamp(c, ["RR", "rr", "VV", "vv"], 25, 12, {"R": RED[3], "r": RED[1], "V": VIOLET[3], "v": VIOLET[2]})
        stamp(c, ["GG", "gg"], 2, 12, {"G": GOLD[2], "g": GOLD[0]})
        for x in range(2, 30):
            c.set(x, 25, VIOLET[3] if x % 3 else VIOLET[2])
    elif kind.startswith("stage_"):
        side = kind[6:]
        x0 = 2 if side == "l" else 0
        x1 = 30 if side == "r" else 32
        c.rect(x0, 14, x1 - x0, 10, WOOD[4])  # the stage boards
        for y in range(15, 24, 3):
            c.rect(x0, y, x1 - x0, 1, WOOD[3])
        for x in range(x0 + 5, x1, 9):
            c.set(x, 16 + (x % 3), WOOD[2])
        c.rect(x0, 14, x1 - x0, 1, WOOD[6])
        c.rect(x0, 24, x1 - x0, 7, VELVET[1])  # the apron, red velvet with a gold fringe
        for x in range(x0, x1):
            c.set(x, 24, GOLD[1])
            if x % 2:
                c.set(x, 30, GOLD[0])
        for x in range(x0 + 3, x1 - 1, 6):  # cold-fire footlights along the lip
            stamp(c, [".3.", "232"], x, 22, {"2": BLUE[3], "3": BLUE[4]})
        if side in "lr":
            post = 2 if side == "l" else 28
            c.rect(post, 10, 2, 21, GOLD[1])
            c.set(post, 10, GOLD[3])
    elif kind.startswith("curtain_"):
        left = kind.endswith("l")
        for y in range(0, 31):
            for x in range(2, 30):
                fold = (x // 4) % 2
                swag = int(13 * y / 18) if y <= 18 else int(13 - (y - 18) * 0.45)  # tied back to the outer side
                edge = x > 29 - swag if left else x < 2 + swag
                if y > 3 and edge:
                    continue
                c.set(x, y, VELVET[2 if fold else 1] if y > 2 else GOLD[1])
        tie = 18
        for x in range(2, 30):
            if c.get(x, tie):
                c.set(x, tie, GOLD[2])
                c.set(x, tie + 1, GOLD[0])
        for x in range(2, 30, 3):
            c.set(x, 3, GOLD[2])
    elif kind == "mic":
        c.rect(15, 12, 2, 18, IRON[2])
        c.rect(12, 29, 8, 2, IRON[1])
        stamp(c, [".bb.", "b33b", "b33b", ".bb."], 14, 8, {"b": IRON[3], "3": BLUE[4]})
        c.set(15, 6, BLUE[3])
        c.set(16, 6, BLUE[3])
    elif kind == "prizeshelf":
        c.rect(1, 2, 30, 29, WOOD[1])
        c.rect(1, 2, 30, 2, WOOD[5])
        for sy in (11, 20, 29):
            c.rect(2, sy, 28, 1, WOOD[5])
        stamp(c, ["..g", ".g.", "G.."], 4, 6, {"g": IRON[3], "G": GOLD[1]})  # a blade
        stamp(c, [".bb.", "bkkb", ".bb.", ".b.b"], 11, 6, {"b": BONE[2], "k": INK})  # a skull
        stamp(c, [".v.", "vVv", "VVV"], 18, 7, {"v": VIOLET[3], "V": VIOLET[2]})  # a potion
        stamp(c, ["GGG", "G.G", ".G."], 24, 7, {"G": GOLD[2]})  # a cup
        stamp(c, ["rrr", "RRR"], 5, 17, {"r": RED[3], "R": RED[2]})
        stamp(c, [".3.", "232", ".2."], 13, 16, {"2": BLUE[3], "3": BLUE[4]})  # a cold-fire lamp
        stamp(c, ["GgG", "ggg"], 21, 17, {"G": GOLD[2], "g": GOLD[0]})
        stamp(c, ["bb", "BB"], 6, 25, {"b": BONE[2], "B": BONE[0]})
        stamp(c, ["ww", "WW"], 16, 25, {"w": CLOTH[3], "W": CLOTH[1]})
        stamp(c, ["vv", "VV"], 23, 25, {"v": VIOLET[3], "V": VIOLET[2]})
        c.rect(1, 30, 30, 1, WOOD[0])
    elif kind == "prizecounter":
        c.rect(1, 12, 30, 4, VELVET[2])
        c.rect(1, 12, 30, 1, VELVET[3])
        c.rect(2, 16, 28, 14, WOOD[2])
        for x in (2, 11, 20, 29):
            c.rect(x, 16, 1, 14, WOOD[1])
        for x in (5, 14, 23):
            c.rect(x, 19, 4, 7, WOOD[3])
            c.set(x + 1, 22, GOLD[2])
        c.rect(1, 30, 30, 1, WOOD[0])
        stamp(c, [".G.", "GGG", "ggg"], 5, 9, {"G": GOLD[2], "g": GOLD[0]})  # the bell
        stamp(c, ["RRRRRRR", "R.....R"], 13, 8, {"R": RED[3]})  # a little neon "points" tube
        stamp(c, ["3", "2"], 26, 9, {"2": BLUE[3], "3": BLUE[4]})
    outline(c)
    return c


GLOW = {"roulette", "blackjack", "poker", "stage_l", "stage_m", "stage_r", "mic", "prizeshelf", "prizecounter"}


def cell_em(kind: str) -> Canvas:
    full = cell(kind)
    keep = set(RED[3:]) | set(BLUE[3:]) | set(VIOLET[3:])
    c = Canvas(32, 32)
    if kind in GLOW:
        for y in range(32):
            for x in range(32):
                p = full.get(x, y)
                if p in keep:
                    c.set(x, y, p)
    return c


# --- The cards (playtest1x, Bill 10:30-10:31 ET): big readable pixel cards for the blackjack and poker close-up, drawn here in
# the chunky playing-card style he pointed at (white cards, a dark outline, rounded corners, corner rank and suit, pip layouts,
# little portrait faces on the J, Q and K, one big pip on the ace, a patterned back). Code only; no pixel is taken from the
# reference. casino-cards.png: CARD_W x CARD_H cells, 14 columns (ranks Ace..King, then the back) x 4 rows (spades, hearts,
# diamonds, clubs; the back only in row 0).
CARD_W, CARD_H = 30, 42
SUITS = ("s", "h", "d", "c")
PAPER, PAPER_LO, CARD_INK = "#f4efe4", "#c4b49a", "#1a1420"
CARD_RED, CARD_RED_LO = "#c43838", "#8a2030"
SKIN, SKIN_LO = "#e8b890", "#b07850"
PIP5 = {
    "s": ["..#..", ".###.", "#####", "#####", ".#.#."],
    "h": [".#.#.", "#####", "#####", ".###.", "..#.."],
    "d": ["..#..", ".###.", "#####", ".###.", "..#.."],
    "c": [".###.", ".###.", "#####", "#####", "..#.."],
}
GLYPH = {  # 3x5 ranks
    "A": [".#.", "#.#", "###", "#.#", "#.#"], "2": ["##.", "..#", ".#.", "#..", "###"], "3": ["##.", "..#", ".#.", "..#", "##."],
    "4": ["#.#", "#.#", "###", "..#", "..#"], "5": ["###", "#..", "##.", "..#", "##."], "6": [".##", "#..", "###", "#.#", "###"],
    "7": ["###", "..#", ".#.", ".#.", ".#."], "8": ["###", "#.#", "###", "#.#", "###"], "9": ["###", "#.#", "###", "..#", "##."],
    "10": ["#.###", "#.#.#", "#.#.#", "#.#.#", "#.###"], "J": ["..#", "..#", "..#", "#.#", ".#."], "Q": [".#.", "#.#", "#.#", "#.#", ".##"],
    "K": ["#.#", "#.#", "##.", "#.#", "#.#"],
}
RANKS = ("A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K")
# pip centres (x, y) on the card; pips on the lower half are drawn upside down
PIPS = {
    2: [(15, 9), (15, 33)], 3: [(15, 9), (15, 21), (15, 33)], 4: [(11, 9), (19, 9), (11, 33), (19, 33)],
    5: [(11, 9), (19, 9), (15, 21), (11, 33), (19, 33)], 6: [(11, 9), (19, 9), (11, 21), (19, 21), (11, 33), (19, 33)],
    7: [(11, 9), (19, 9), (15, 15), (11, 21), (19, 21), (11, 33), (19, 33)],
    8: [(11, 9), (19, 9), (15, 15), (11, 21), (19, 21), (15, 27), (11, 33), (19, 33)],
    9: [(11, 9), (19, 9), (11, 17), (19, 17), (15, 21), (11, 25), (19, 25), (11, 33), (19, 33)],
    10: [(11, 9), (19, 9), (15, 13), (11, 17), (19, 17), (11, 25), (19, 25), (15, 29), (11, 33), (19, 33)],
}


def _suit_col(suit: str) -> str:
    return CARD_RED if suit in "hd" else CARD_INK


def _blank(c: Canvas) -> None:
    """A white card: rounded corners (two pixels cut), a dark outline, a shaded inner edge on the right and bottom."""
    W, H = CARD_W, CARD_H
    for y in range(H):
        for x in range(W):
            cut = (min(x, W - 1 - x), min(y, H - 1 - y))
            if cut[0] + cut[1] < 2:
                continue
            edge = x == 0 or y == 0 or x == W - 1 or y == H - 1 or cut[0] + cut[1] == 2
            c.set(x, y, CARD_INK if edge else PAPER)
    for x in range(2, W - 2):
        c.set(x, H - 2, PAPER_LO)
    for y in range(2, H - 2):
        c.set(W - 2, y, PAPER_LO)


def _stamp(c: Canvas, rows: list[str], x: int, y: int, col: str, flip: bool = False) -> None:
    rows = [r[::-1] for r in rows[::-1]] if flip else rows
    stamp(c, rows, x, y, {"#": col})


def _big(c: Canvas, suit: str, cx: float, cy: float, r: float) -> None:
    """One big pip (the ace's), drawn from its shape: heart, diamond, spade, club."""
    col = _suit_col(suit)
    lo = CARD_RED_LO if suit in "hd" else "#3a3048"
    for y in range(int(cy - r - 2), int(cy + r + 3)):
        for x in range(int(cx - r - 2), int(cx + r + 3)):
            dx, dy = x + 0.5 - cx, y + 0.5 - cy
            if suit == "d":
                on = abs(dx) / (0.72 * r) + abs(dy) / r <= 1
            elif suit in "hs":
                yy = dy if suit == "h" else -dy
                lobes = min((dx - r * 0.48) ** 2 + (yy + r * 0.3) ** 2, (dx + r * 0.48) ** 2 + (yy + r * 0.3) ** 2) <= (r * 0.52) ** 2
                point = yy >= -r * 0.3 and abs(dx) <= (r * 0.95 - yy) * 0.98 and yy <= r * 0.95
                on = lobes or point
                if suit == "s" and dy > r * 0.2:  # the spade's stem
                    on = on and dy < r * 0.72 or (abs(dx) <= (dy - r * 0.2) * 0.9 and dy <= r * 1.1 and dy > r * 0.72)
            else:
                rr = r * 0.4
                on = any((dx - ox) ** 2 + (dy - oy) ** 2 <= rr * rr for ox, oy in ((0, -r * 0.48), (-r * 0.5, r * 0.1), (r * 0.5, r * 0.1)))
                on = on or (abs(dx) <= r * 0.12 and -r * 0.3 < dy < r * 0.5) or (abs(dx) <= (dy - r * 0.45) * 0.9 and r * 0.45 < dy <= r * 1.05)
            if on:
                c.set(x, y, col)
    for y in range(c.h):  # a 1 px shade on the lower-right of the shape
        for x in range(c.w):
            if c.get(x, y) == col and c.get(x + 1, y + 1) not in (col, lo) and abs(x - cx) <= r + 2 and abs(y - cy) <= r + 2:
                c.set(x, y, lo)


FACE = {
    # 13x12 busts: h hat/crown, s skin, e eye, b beard/hair, r robe (suit colour), t trim (gold), k ink
    "K": ["..t.t.t.t....", "..ttttttt....", "..bbbbbbb....", ".bsesssesb...", ".bsssssssb...", ".bbsskssbb...", ".bbbbbbbbb...",
          "..bbbbbbb....", "rrrrtttrrrr..", "rrrrrtrrrrr..", "rrrrrtrrrrr..", "rrrrrtrrrrr.."],
    "Q": ["...t.t.t.....", "...ttttt.....", "..bbbbbbb....", ".bbsssssbb...", ".bsesssesb...", ".bsssssssb...", ".bbssksssbb..",
          ".bbbsssbbb...", "rrrrsssrrrr..", "rrrtttttrrr..", "rrrrrtrrrrr..", "rrrrrtrrrrr.."],
    "J": ["..hhhhhhh....", ".hhhhhhhhht..", "..bbbbbbb....", "..bsssssb....", "..sesssess...", "..sssssss....", "..ssskssss...",
          "...sssss.....", "rrrttsttrrr..", "rrrrrtrrrrr..", "rrrrrtrrrrr..", "rrrrrtrrrrr.."],
}


def _face(c: Canvas, rank: str, suit: str) -> None:
    """A face card: a framed double-headed portrait (the bust and its mirror), the suit's pip by each head."""
    col = _suit_col(suit)
    hat = CARD_RED if suit in "sc" else "#2a4a8a"
    key = {"h": hat, "s": SKIN, "e": CARD_INK, "b": "#6a4a30" if rank != "K" else "#d8d0c0", "r": col, "t": "#e0c060", "k": SKIN_LO}
    if rank == "Q":
        key["b"] = "#b0702a" if suit in "hd" else "#3a2a20"
    for x in range(7, 23):  # the frame
        c.set(x, 6, CARD_INK)
        c.set(x, 36, CARD_INK)
    for y in range(6, 37):
        c.set(7, y, CARD_INK)
        c.set(22, y, CARD_INK)
    for y in range(7, 36):
        for x in range(8, 22):
            c.set(x, y, PAPER if (x + y) % 2 else "#e8dcc8")
    rows = FACE[rank]
    stamp(c, rows, 9, 9, key)
    stamp(c, [r[::-1] for r in rows[::-1]], 8, 22, key)
    for x in range(8, 22):
        c.set(x, 21, col)


def card(rank: str, suit: str) -> Canvas:
    c = Canvas(CARD_W, CARD_H)
    _blank(c)
    col = _suit_col(suit)
    g = GLYPH[rank]
    gw = len(g[0])
    _stamp(c, g, 2 if gw == 5 else 3, 3, col)
    _stamp(c, PIP5[suit], 2, 10, col)
    _stamp(c, g, CARD_W - 3 - gw if gw == 5 else CARD_W - 6, CARD_H - 8, col, flip=True)
    _stamp(c, PIP5[suit], CARD_W - 7, CARD_H - 15, col, flip=True)
    if rank == "A":
        _big(c, suit, 15, 21, 7.5)
    elif rank in FACE:
        _face(c, rank, suit)
    else:
        for x, y in PIPS[int(rank)]:
            _stamp(c, PIP5[suit], x - 2, y - 2, col, flip=y > 21)
    return c


def back() -> Canvas:
    """The back: a white border round a deep violet field, a cold-blue diamond lattice and a gold centre."""
    c = Canvas(CARD_W, CARD_H)
    _blank(c)
    for y in range(3, CARD_H - 3):
        for x in range(3, CARD_W - 3):
            edge = x == 3 or y == 3 or x == CARD_W - 4 or y == CARD_H - 4
            on = (x + y) % 6 == 0 or (x - y) % 6 == 0
            c.set(x, y, CARD_INK if edge else ("#5ab8ff" if on else "#2a1848"))
    stamp(c, ["..g..", ".ggg.", "ggGgg", ".ggg.", "..g.."], 13, 19, {"g": "#e0c060", "G": CARD_RED})
    return c


def card_sheet():
    from PIL import Image

    im = Image.new("RGBA", (CARD_W * 14, CARD_H * 4), (0, 0, 0, 0))
    for si, s in enumerate(SUITS):
        for ri, r in enumerate(RANKS):
            im.paste(card(r, s).image(), (ri * CARD_W, si * CARD_H))
    im.paste(back().image(), (13 * CARD_W, 0))
    return im


def boxes() -> dict:
    """Each cell's opaque box (l, t, r, b), the numbers casino.ts CASINO_BOX holds (group playtest1x holds them equal)."""
    out = {}
    for k in KINDS:
        c = cell(k)
        xs = [x for y in range(32) for x in range(32) if c.get(x, y)]
        ys = [y for y in range(32) for x in range(32) if c.get(x, y)]
        out[k] = [min(xs), min(ys), max(xs) + 1, max(ys) + 1]
    return out


def sheets() -> dict:
    from pixel_writer import cells

    return {"room-casino.png": cells([cell(k) for k in KINDS]), "room-casino_em.png": cells([cell_em(k) for k in KINDS]), "casino-cards.png": card_sheet()}


if __name__ == "__main__":
    import json

    print(json.dumps(boxes()))
