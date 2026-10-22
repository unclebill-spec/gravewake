"""outskirts (Bill, 2026-10-22): the ring outside the town fence, sparse, gloomy and dead, with neon glow.

Writes to public/art/writer (16x16 cells unless noted, hard pixels, every colour from the locked palette
tools/sprite-writer/palette_locked.py, every shape ringed by a 1px warm dark outline):
  outskirts-ground.png  8 cells: ash/slate ground, 0-3 plain, 4-5 darker slate patch, 6-7 pale ash patch
  outskirts-props.png  10 cells: 0 skull, 1 bones, 2 skull and bones, 3 cross leaning left, 4 cross leaning right,
                        5 fallen cross, 6 broken cross, 7-9 dead grass tufts
  outskirts-candle.png  4 cells: a skull with a lit candle, flame frames 0-3   (+ _em glow mask)
  outskirts-wisp.png   4 colours x 4 frames: will-o'-wisp ghost lanterns (rows blue, red, violet, green) (+ _em)
  outskirts-tree.png   32x48: a dead tree, whole
  outskirts-raven.png  6 cells: 0 idle, 1 head turned, 2 wing ruffle, 3 blink, 4-5 flying (+ _em: its red eye)
Run from the repo root: python3 tools/pixel-writer/outskirts_writer.py
"""
import sys
from PIL import Image

sys.path.insert(0, "tools/sprite-writer")
from palette_locked import LOCKED  # noqa: E402

OUT = "public/art/writer"
OUTLINE = "#2a1c14"  # the warm dark outline
SLATE = ["#2a2a2e", "#3a4048", "#4a4e54", "#5a5e64", "#6a6e78", "#8a8e94", "#b0b6bc"]
BONE = ["#8a867c", "#b7b2a6", "#d4cec0"]
STONE = ["#4a4e54", "#5a5e64", "#7a8088", "#9aa0aa"]
GRASS = ["#5a4834", "#6a5a40", "#8a7a64", "#a89470"]
BARK = ["#2a2420", "#3a3428", "#4a4038", "#5a564e"]
RAVEN = ["#16161a", "#2a2a2e", "#4a4a50"]
WAX = ["#b7b2a6", "#d0c8b0"]
FLAME = ["#c45a18", "#c4a050", "#d0c8b0"]
NEON = {
    "blue": ["#163044", "#3a78c8", "#7ec8e0", "#d0e4ff"],
    "red": ["#4a1020", "#c43838", "#c46878", "#d2c0b4"],
    "violet": ["#2a1848", "#7a5ad0", "#c9a0e8", "#c4b4e0"],
    "green": ["#102818", "#48a060", "#8fd18a", "#c8e080"],
}
for c in [OUTLINE, *SLATE, *BONE, *STONE, *GRASS, *BARK, *RAVEN, *WAX, *FLAME, *[x for v in NEON.values() for x in v]]:
    assert c in LOCKED, c


def rgb(h):
    return tuple(int(h[i:i + 2], 16) for i in (1, 3, 5)) + (255,)


class Cell:
    def __init__(self, w=16, h=16):
        self.w, self.h = w, h
        self.p = {}

    def put(self, x, y, c):
        if 0 <= x < self.w and 0 <= y < self.h:
            self.p[(x, y)] = c

    def rect(self, x0, y0, x1, y1, c):
        for y in range(y0, y1 + 1):
            for x in range(x0, x1 + 1):
                self.put(x, y, c)

    def art(self, rows, pal, ox=0, oy=0):
        """rows of chars: '.' empty, digits index pal."""
        for j, r in enumerate(rows):
            for i, ch in enumerate(r):
                if ch != ".":
                    self.put(ox + i, oy + j, pal[int(ch)])

    def outline(self):
        add = []
        for (x, y) in list(self.p):
            for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                q = (x + dx, y + dy)
                if q not in self.p and 0 <= q[0] < self.w and 0 <= q[1] < self.h:
                    add.append(q)
        for q in add:
            self.p[q] = OUTLINE
        return self

    def img(self):
        im = Image.new("RGBA", (self.w, self.h), (0, 0, 0, 0))
        for (x, y), c in self.p.items():
            im.putpixel((x, y), rgb(c))
        return im


def strip(cells, w=16, h=16):
    im = Image.new("RGBA", (w * len(cells), h), (0, 0, 0, 0))
    for i, c in enumerate(cells):
        im.paste(c.img(), (i * w, 0))
    return im


def rnd(seed):
    s = [seed * 2654435761 & 0xFFFFFFFF]

    def r():
        s[0] = (s[0] * 1103515245 + 12345) & 0x7FFFFFFF
        return s[0] / 0x7FFFFFFF
    return r


# ground: no outline (a field of tiles shows no grid); the edge pixels stay the cell's base colour
def ground(k):
    c = Cell()
    base = {4: SLATE[1], 5: SLATE[1], 6: SLATE[3]}.get(k, SLATE[2])
    c.rect(0, 0, 15, 15, base)
    r = rnd(k + 7)
    for _ in range(9):
        x, y = int(r() * 14) + 1, int(r() * 14) + 1
        c.put(x, y, SLATE[0] if r() < 0.5 else SLATE[3 if base != SLATE[3] else 4])
    for _ in range(3):
        x, y = int(r() * 13) + 1, int(r() * 13) + 1
        c.put(x, y, GRASS[0])
        c.put(x + 1, y, GRASS[0])
    if k in (5, 7):  # a dithered half: the patch's edge cell
        other = SLATE[2]
        for y in range(16):
            for x in range(16):
                if (x + y) % 2 == 0 and c.p.get((x, y)) == base:
                    c.put(x, y, other)
    return c


SKULL = [
    "..1111..",
    ".122221.",
    "12222221",
    "12002002",
    "12002002",
    ".122221.",
    "..1011..",
]


def skull(ox, oy):
    c = Cell()
    c.art(SKULL, ["#2a2a2e", BONE[0], BONE[2]], ox, oy)
    return c


def bones(c, ox, oy):
    c.art(["1.......1", ".1.....1.", "..12221..", "..12221..", ".1.....1.", "1.......1"][2:4], [None, BONE[0], BONE[2]], ox, oy)
    for i in range(9):
        c.put(ox + i, oy + 3 + (i % 2), BONE[2] if i not in (0, 8) else BONE[1])
    c.put(ox - 1, oy + 2, BONE[1]); c.put(ox - 1, oy + 5, BONE[1]); c.put(ox + 9, oy + 2, BONE[1]); c.put(ox + 9, oy + 5, BONE[1])


def cross(lean):
    c = Cell()
    pts = []
    # an upright cross 6 wide, 11 tall, then sheared by lean (pixels per 4 rows)
    for y in range(11):
        for x in range(2):
            pts.append((7 + x, 3 + y, STONE[2] if x == 0 else STONE[1]))
    for x in range(-3, 5):
        pts.append((7 + x, 6, STONE[3] if x < 1 else STONE[2]))
        pts.append((7 + x, 7, STONE[1]))
    for x, y, col in pts:
        sx = x + (int(round((14 - y) * lean / 4)) if lean else 0)
        c.put(sx, y, col)
    c.rect(4, 14, 11, 14, GRASS[0])  # the mound at its foot
    c.put(5, 13, GRASS[1]); c.put(10, 13, GRASS[1])
    return c.outline()


def fallen():
    c = Cell()
    c.rect(2, 9, 12, 10, STONE[1]); c.rect(2, 9, 12, 9, STONE[2])
    c.rect(5, 6, 6, 13, STONE[1]); c.rect(5, 6, 5, 13, STONE[2])
    c.rect(1, 12, 4, 13, GRASS[0]); c.put(13, 11, GRASS[1])
    return c.outline()


def broken():
    c = Cell()
    c.rect(7, 8, 8, 13, STONE[1]); c.rect(7, 8, 7, 13, STONE[2])
    c.put(8, 7, STONE[2]); c.put(7, 7, STONE[1])
    c.rect(10, 12, 13, 12, STONE[2]); c.rect(11, 13, 12, 13, STONE[1])  # the snapped arm on the ground
    c.rect(4, 14, 11, 14, GRASS[0])
    return c.outline()


def tuft(k):
    c = Cell()
    r = rnd(40 + k)
    for i in range(5 + k):
        x = 3 + int(r() * 10)
        hgt = 3 + int(r() * 5)
        lean = (r() - 0.5) * 2
        for y in range(hgt):
            c.put(int(round(x + lean * y / 3)), 14 - y, GRASS[1 + (y > hgt // 2) + (y == hgt - 1)])
    return c.outline()


def props():
    s0 = skull(4, 6).outline()
    b = Cell(); bones(b, 3, 6); b.outline()
    sb = Cell(); bones(sb, 5, 9); sb.art(SKULL, ["#2a2a2e", BONE[0], BONE[2]], 1, 4); sb.outline()
    return [s0, b, sb, cross(-1.4), cross(1.6), fallen(), broken(), tuft(0), tuft(1), tuft(2)]


def candle(f):
    c = Cell()
    c.art(SKULL, ["#2a2a2e", BONE[0], BONE[2]], 4, 8)
    c.rect(7, 4, 8, 8, WAX[1]); c.put(7, 8, WAX[0]); c.put(9, 7, WAX[0])  # the candle and a drip
    fl = [(7, 2), (8, 3), (7, 1)][f % 3] if f < 3 else (8, 2)
    c.put(7, 3, FLAME[0]); c.put(8, 3, FLAME[0])
    c.put(fl[0], fl[1], FLAME[1]); c.put(fl[0], fl[1] - 1 if fl[1] > 1 else fl[1], FLAME[2])
    c.outline()
    em = Cell()
    for (x, y), col in c.p.items():
        if col in FLAME:
            em.put(x, y, col)
    return c, em


def wisp(color, f):
    n = NEON[color]
    c = Cell()
    body = ["..1111..", ".122221.", "12233221", "12333321", "12233221", ".122221.", "..1221..", "...11..."]
    c.art(body, [None, n[0], n[1], n[2]], 4, 3)
    # the trailing wisp tail sways by frame (different pixels per frame)
    tail = [[(7, 11), (6, 12), (6, 13)], [(8, 11), (8, 12), (9, 13)], [(7, 11), (7, 12), (8, 13)], [(8, 11), (7, 12), (7, 13)]][f]
    for (x, y) in tail:
        c.put(x, y, n[1])
    c.put(7, 6, n[3]); c.put(8, 6 if f % 2 else 5, n[3])  # the bright core flickers
    c.outline()
    em = Cell()
    for (x, y), col in c.p.items():
        if col != OUTLINE:
            em.put(x, y, col)
    return c, em


def tree():
    c = Cell(32, 48)
    c.rect(14, 26, 17, 46, BARK[1]); c.rect(14, 26, 14, 46, BARK[2]); c.rect(17, 30, 17, 46, BARK[0])
    c.rect(12, 44, 19, 46, BARK[1]); c.put(11, 46, BARK[1]); c.put(20, 46, BARK[1])
    def limb(x, y, dx, dy, n, col=BARK[1]):
        for i in range(n):
            c.put(x + dx * i, y + dy * i, col)
            c.put(x + dx * i, y + dy * i + 1, BARK[0])
    limb(14, 27, -1, -1, 9)  # the left bough
    limb(6, 19, -1, -1, 4)
    limb(8, 20, 0, -1, 6, BARK[2])
    limb(17, 26, 1, -1, 7)   # the right bough: the raven's perch runs out level from its top
    for i in range(8):
        c.put(23 + i if 23 + i < 32 else 31, 19, BARK[2]); c.put(min(31, 23 + i), 20, BARK[0])
    limb(16, 24, 0, -1, 14, BARK[2])  # the crown spike
    limb(16, 12, -1, -1, 5)
    limb(16, 14, 1, -1, 4)
    limb(11, 22, -1, 0, 4)
    c.put(15, 34, BARK[0]); c.put(15, 35, BARK[0])  # a knot
    return c.outline()


RAVEN_ROWS = [
    # idle (beak right)
    [".......00..", "......0120.", ".....01112.", "...0011110.", "..011111100", ".0111111100", "01111111100", ".0011111000", "...00..0...", "...0...0..."],
]


def raven(f):
    c = Cell()
    pal = [RAVEN[0], RAVEN[1], RAVEN[2]]
    if f in (4, 5):  # flying: wings up / down
        body = [".....0000.....", "...00111100...", "00111111111100", "...0011110....", ".....0110.....", "......00......"]
        if f == 5:
            body = ["......00......", ".....0110.....", "...00111100...", "00011111111000", "0.0..1111..0.0", "......00......"]
        c.art(body, pal, 1, 5)
        c.put(10, 6, "#c43838")
    else:
        c.art(RAVEN_ROWS[0], pal, 3, 4)
        eye = (10, 6)
        if f == 1:  # head turned: beak to the left, the eye moves
            for (x, y) in [(10, 5), (11, 6), (12, 6), (11, 5)]:
                c.p.pop((x, y), None)
            c.put(7, 5, RAVEN[1]); c.put(6, 5, RAVEN[0]); c.put(8, 4, RAVEN[0]); c.put(9, 4, RAVEN[1])
            eye = (8, 5)
        if f == 2:  # wing ruffle: the wing lifts off the back
            for x in range(6, 12):
                c.put(x, 7, RAVEN[2])
            c.put(5, 6, RAVEN[1]); c.put(6, 6, RAVEN[2]); c.put(11, 7, RAVEN[1]); c.put(12, 8, RAVEN[0])
        if f != 3:  # blink: no eye
            c.put(eye[0], eye[1], "#c43838")
    c.outline()
    em = Cell()
    for (x, y), col in c.p.items():
        if col == "#c43838":
            em.put(x, y, col)
    return c, em


def main():
    strip([ground(k) for k in range(8)]).save(f"{OUT}/outskirts-ground.png")
    strip(props()).save(f"{OUT}/outskirts-props.png")
    cd = [candle(f) for f in range(4)]
    strip([a for a, _ in cd]).save(f"{OUT}/outskirts-candle.png")
    strip([b for _, b in cd]).save(f"{OUT}/outskirts-candle_em.png")
    ws = [[wisp(col, f) for f in range(4)] for col in ("blue", "red", "violet", "green")]
    sheet = Image.new("RGBA", (64, 64), (0, 0, 0, 0)); em = Image.new("RGBA", (64, 64), (0, 0, 0, 0))
    for r, row in enumerate(ws):
        for f, (a, b) in enumerate(row):
            sheet.paste(a.img(), (f * 16, r * 16)); em.paste(b.img(), (f * 16, r * 16))
    sheet.save(f"{OUT}/outskirts-wisp.png"); em.save(f"{OUT}/outskirts-wisp_em.png")
    tree().img().save(f"{OUT}/outskirts-tree.png")
    rv = [raven(f) for f in range(6)]
    strip([a for a, _ in rv]).save(f"{OUT}/outskirts-raven.png")
    strip([b for _, b in rv]).save(f"{OUT}/outskirts-raven_em.png")
    # the lock: hard pixels, locked colours only, and the raven's idle frames really differ
    import glob
    for fn in glob.glob(f"{OUT}/outskirts-*.png"):
        im = Image.open(fn).convert("RGBA")
        for px in im.getdata():
            if px[3] not in (0, 255):
                raise SystemExit(f"soft pixel in {fn}")
            if px[3] == 255 and "#%02x%02x%02x" % px[:3] not in LOCKED:
                raise SystemExit(f"unlocked colour {px} in {fn}")
    rim = Image.open(f"{OUT}/outskirts-raven.png")
    cells = [rim.crop((i * 16, 0, i * 16 + 16, 16)).tobytes() for i in range(6)]
    assert len(set(cells)) == 6, "raven frames repeat"
    print("outskirts sheets written")


if __name__ == "__main__":
    main()
