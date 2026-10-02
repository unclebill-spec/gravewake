"""Portrait writer (playtest1b, 2026-10-02): the character select busts, one 48 x 64 cell per class.

Drawn pixel by pixel like the bodies, every colour checked against palette v3 (LOCKED_V3). Bill's "gloom and glow":
each bust sits in the dark with its class's signature glow behind it, a rim of that neon on the near edge, and the
class's glowing piece in frame (warrior: a cold-fire rune on the helm and a blue gem in the hilt; wizard: a violet
orb; assassin: blue-edged knives; vampire: red eyes and a red brooch).

    python3 tools/sprite-writer/make_portraits.py   ->  public/art/sprites/portraits.png
"""

from __future__ import annotations

import math

from PIL import Image

from palette_locked import LOCKED_V3, NEON

W, H = 48, 64
INK = "#140c10"
BAYER = [[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]]


class Bust:
    def __init__(self) -> None:
        self.p: list[list[str | None]] = [[None] * W for _ in range(H)]
        self.fig = [[False] * W for _ in range(H)]

    def set(self, x: int, y: int, c: str, fig: bool = True) -> None:
        if 0 <= x < W and 0 <= y < H:
            if c not in LOCKED_V3:
                raise SystemExit(f"portrait: {c} is not in palette v3")
            self.p[y][x] = c
            if fig:
                self.fig[y][x] = True

    def get(self, x: int, y: int) -> str | None:
        return self.p[y][x] if 0 <= x < W and 0 <= y < H else None

    def isfig(self, x: int, y: int) -> bool:
        return 0 <= x < W and 0 <= y < H and self.fig[y][x]

    def rect(self, x: int, y: int, w: int, h: int, c: str) -> None:
        for yy in range(y, y + h):
            for xx in range(x, x + w):
                self.set(xx, yy, c)

    def ellipse(self, cx: float, cy: float, rx: float, ry: float, c: str, clip=None) -> None:
        for y in range(int(cy - ry) - 1, int(cy + ry) + 2):
            for x in range(int(cx - rx) - 1, int(cx + rx) + 2):
                if ((x + 0.5 - cx) / rx) ** 2 + ((y + 0.5 - cy) / ry) ** 2 <= 1 and (clip is None or clip(x, y)):
                    self.set(x, y, c)

    def image(self) -> Image.Image:
        im = Image.new("RGBA", (W, H), (0, 0, 0, 0))
        px = im.load()
        for y in range(H):
            for x in range(W):
                c = self.p[y][x]
                if c:
                    px[x, y] = (int(c[1:3], 16), int(c[3:5], 16), int(c[5:7], 16), 255)
        return im


def backdrop(b: Bust, glow: str) -> None:
    deep, halo = NEON[glow][0], NEON[glow][1]
    gloom = ["#0c0a08", "#120c10", "#1a1424"]
    for y in range(H):
        for x in range(W):
            t = y / (H - 1) * 2.0
            band = min(2, int(t + BAYER[y % 4][x % 4] / 16.0 - 0.25))
            b.set(x, y, gloom[max(0, band)], fig=False)
            d = math.hypot(x + 0.5 - 24, y + 0.5 - 24)
            k = BAYER[y % 4][x % 4] / 16.0
            if d < 13 + 3 * k:
                b.set(x, y, halo, fig=False)
            elif d < 21 + 3 * k:
                b.set(x, y, deep, fig=False)


def shade_head(b: Bust, skin: tuple[str, str, str], cx: float = 24, cy: float = 28, rx: float = 8.5, ry: float = 10.5) -> None:
    base, dark, hi = skin
    b.ellipse(cx, cy, rx, ry, base)
    b.ellipse(cx + 3, cy + 2, rx - 2, ry - 2, base)
    for y in range(int(cy - ry), int(cy + ry) + 1):
        for x in range(int(cx), int(cx + rx) + 1):
            if b.get(x, y) == base and ((x + 0.5 - cx) / rx) ** 2 + ((y + 0.5 - cy) / ry) ** 2 > 0.55 and x > cx + 2:
                b.set(x, y, dark)
    b.ellipse(cx - 4, cy - 1, 2, 3, hi)
    for x in range(int(cx - rx + 2), int(cx + rx - 1)):
        if b.get(x, int(cy + ry) - 1) in (base, hi):
            b.set(x, int(cy + ry) - 1, dark)


def face(b: Bust, eye: str = "#f4efe4", pupil: str = "#1a1014", glint: str | None = None, brow: str = "#3a2418", mouth: str = "#a06050", skin_dark: str = "#c08060", y: int = 29) -> None:
    for ex in (19, 27):
        b.rect(ex, y, 2, 2, eye)
        b.set(ex + 1, y, pupil)
        b.set(ex + 1, y + 1, pupil)
        if glint:
            b.set(ex + 1, y, glint)
        b.rect(ex - 1, y - 2, 3, 1, brow)
    b.set(24, y + 2, skin_dark)
    b.set(24, y + 3, skin_dark)
    b.set(25, y + 3, skin_dark)
    b.rect(22, y + 6, 4, 1, mouth)


def body(b: Bust, cloth: tuple[str, str, str], top: int = 46) -> None:
    base, dark, hi = cloth
    for y in range(top, H):
        half = min(21, 9 + (y - top) * 2)
        b.rect(24 - half, y, half * 2, 1, base)
        b.set(24 - half, y, hi)
        b.rect(24 + half - 3, y, 3, 1, dark)


def neck(b: Bust, skin_dark: str) -> None:
    b.rect(20, 37, 8, 10, skin_dark)


def rim(b: Bust, tube: str, side: int = -1, every: int = 1) -> None:
    """The neon rim: the near edge of the figure, one pixel, every `every` rows."""
    for y in range(0, H, every):
        xs = [x for x in range(W) if b.isfig(x, y)]
        if xs:
            b.set(xs[0] if side < 0 else xs[-1], y, tube)


def ink(b: Bust) -> None:
    add = []
    for y in range(H):
        for x in range(W):
            if b.isfig(x, y):
                continue
            if any(b.isfig(x + dx, y + dy) for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1))):
                add.append((x, y))
    for x, y in add:
        b.set(x, y, INK, fig=False)


def orb(b: Bust, cx: int, cy: int, r: int, glow: str) -> None:
    deep, halo, mid, tube, core, hot = NEON[glow]
    for y in range(cy - r - 2, cy + r + 3):
        for x in range(cx - r - 2, cx + r + 3):
            d = math.hypot(x + 0.5 - cx, y + 0.5 - cy)
            if d <= r + 2 and not b.isfig(x, y):
                b.set(x, y, halo if d <= r + 1 else deep, fig=False)
    b.ellipse(cx, cy, r, r, tube)
    b.ellipse(cx - 0.5, cy - 0.5, r - 1.5, r - 1.5, core)
    b.set(cx - 1, cy - 2, hot)
    b.set(cx - 2, cy - 1, hot)


SKIN = ("#e8b898", "#c08060", "#f0c8b0")
PALE = ("#ecd8cc", "#d2c0b4", "#f4f0e8")


def warrior() -> Bust:
    b = Bust()
    backdrop(b, "blue")
    blue = NEON["blue"]
    # sword behind the right shoulder: grip, guard, pommel with a cold-fire gem
    b.rect(36, 8, 2, 30, "#c8c8d0")
    b.rect(37, 8, 1, 30, "#8a9098")
    b.rect(32, 36, 10, 2, "#8a9098")
    b.rect(36, 38, 2, 6, "#5a4030")
    b.set(36, 7, "#e8ecee")
    body(b, ("#2a4568", "#1a2848", "#3a78a8"))
    # pauldrons
    b.ellipse(12, 48, 7, 5, "#8a9098")
    b.ellipse(36, 48, 7, 5, "#8a9098")
    b.ellipse(11, 47, 4, 2, "#c8c8d0")
    b.ellipse(35, 47, 4, 2, "#c8c8d0")
    b.rect(18, 50, 12, 1, "#e0c060")
    b.rect(23, 52, 2, 8, "#e0c060")
    b.rect(20, 55, 8, 2, "#e0c060")
    neck(b, SKIN[1])
    shade_head(b, SKIN)
    face(b, brow="#4a3020")
    # stubble
    for x in range(19, 30):
        if x % 2 == 0:
            b.set(x, 36, "#8a5840")
    # helm: dome, brow band, nasal, cheek guards; a cold-fire rune on the brow
    b.ellipse(24, 24, 10, 9, "#8a9098", clip=lambda x, y: y < 27)
    b.ellipse(22, 21, 6, 4, "#c8c8d0", clip=lambda x, y: y < 25)
    b.rect(14, 25, 21, 2, "#6a6e78")
    b.rect(23, 25, 2, 8, "#6a6e78")
    b.rect(14, 26, 3, 9, "#6a6e78")
    b.rect(31, 26, 3, 9, "#4a4a50")
    b.set(23, 23, blue[3])
    b.set(24, 23, blue[4])
    b.set(24, 22, blue[3])
    b.set(23, 22, blue[1])
    b.set(36, 40, blue[3])
    b.set(37, 40, blue[4])
    rim(b, blue[3], -1, 2)
    ink(b)
    return b


def wizard() -> Bust:
    b = Bust()
    backdrop(b, "violet")
    v = NEON["violet"]
    body(b, ("#4a2870", "#2a1848", "#6a3a8a"), top=44)
    # hood: a peaked cowl around the face
    b.ellipse(24, 26, 13, 15, "#4a2870")
    for j in range(12):  # the cowl's peak, its tip bent back
        cx = 24 + (11 - j) // 3
        half = j // 2 + 1
        b.rect(cx - half, 1 + j, half * 2, 1, "#4a2870")
        b.set(cx - half, 1 + j, "#6a3a8a")
    b.ellipse(22, 20, 7, 6, "#6a3a8a", clip=lambda x, y: y < 22)
    b.ellipse(24, 29, 9, 11, "#1a1430")
    shade_head(b, SKIN, cy=29, rx=7.5, ry=9.5)
    face(b, brow="#c8c8d0", y=29)
    # the long white beard over the chest
    for y in range(34, 56):
        half = max(2, 8 - abs(y - 40) // 3) if y < 46 else max(1, 7 - (y - 46) // 2)
        b.rect(24 - half, y, half * 2, 1, "#e8e0d0")
        b.set(24 + half - 1, y, "#c8c8d0")
        if y % 3 == 0:
            b.set(24 - half + 2, y, "#c8c8d0")
    b.rect(22, 35, 4, 1, "#a06050")
    # the raised hand with its violet orb
    b.ellipse(39, 52, 3, 3, SKIN[0])
    b.set(41, 53, SKIN[1])
    orb(b, 39, 45, 4, "violet")
    rim(b, v[3], -1, 2)
    ink(b)
    return b


def assassin() -> Bust:
    b = Bust()
    backdrop(b, "blue")
    blue = NEON["blue"]
    body(b, ("#1e3428", "#142018", "#2a4a38"))
    b.ellipse(24, 26, 12, 14, "#1e3428")
    b.ellipse(21, 19, 7, 5, "#2a4a38", clip=lambda x, y: y < 22)
    b.ellipse(24, 29, 8.5, 10, "#0e2418")
    shade_head(b, SKIN, rx=7.5, ry=9.5)
    face(b, glint=blue[4], brow="#1a1014")
    # the mask over nose and mouth
    for y in range(32, 40):
        half = 8 if y < 37 else 8 - (y - 36) * 2
        b.rect(24 - half, y, half * 2, 1, "#2a2a2e")
    b.rect(16, 32, 16, 1, "#4a4a50")
    # crossed knives, blue-edged
    for i in range(14):
        b.set(13 + i, 60 - i, "#c8c8d0")
        b.set(14 + i, 60 - i, blue[3] if i % 2 else blue[4])
        b.set(34 - i, 60 - i, "#c8c8d0")
        b.set(33 - i, 60 - i, blue[3] if i % 2 == 0 else blue[4])
    b.rect(11, 59, 4, 2, "#5a4030")
    b.rect(33, 59, 4, 2, "#5a4030")
    rim(b, blue[3], 1, 2)
    ink(b)
    return b


def vampire() -> Bust:
    b = Bust()
    backdrop(b, "red")
    r = NEON["red"]
    # the high collar: two black wings rising past the jaw, lined red on the face side
    for y in range(24, 50):
        t = (y - 24) / 25
        outer = round(12 - 6 * t)
        inner = round(15 + 2 * t)
        for x in range(outer, inner + 1):
            b.set(x, y, "#8a2030" if x >= inner - 1 else "#1a1014")
            b.set(47 - x, y, "#6a2030" if x >= inner - 1 else "#1a1014")
        b.set(outer, y, "#3a2038")
    body(b, ("#1a1014", "#100c12", "#3a2038"))
    b.rect(20, 46, 8, 14, "#f4f0e8")
    b.rect(23, 46, 2, 14, "#d8d0c0")
    neck(b, PALE[1])
    shade_head(b, PALE)
    face(b, eye="#ffd0d0", pupil=r[3], glint=r[5], brow="#1a1014", mouth="#6a2030", skin_dark="#d2c0b4")
    b.set(22, 36, "#ffffff")
    b.set(25, 36, "#ffffff")
    # hair slicked back to a widow's peak, high at the temples, down behind the ears
    b.ellipse(24, 22, 9.5, 6.5, "#1a1014", clip=lambda x, y: y < 22)
    for x in range(15, 34):
        dx = abs(x - 24)
        line = 25 - min(dx, 4) if dx < 7 else 30
        for y in range(18, line):
            if b.isfig(x, y) or y >= 21:
                b.set(x, y, "#1a1014")
    for k, x in enumerate((19, 22, 26, 29)):
        b.set(x, 18 + (k % 2), "#3a2038")
        b.set(x + 1, 19 + (k % 2), "#3a2038")
    # the red brooch at the throat
    b.rect(23, 45, 3, 3, r[3])
    b.set(23, 45, r[4])
    for x, y in ((22, 46), (26, 46), (24, 44), (24, 48)):
        if not b.isfig(x, y):
            b.set(x, y, r[1])
    rim(b, r[3], -1, 2)
    ink(b)
    return b


PORTRAITS = {"warrior": warrior, "wizard": wizard, "assassin": assassin, "vampire": vampire}
