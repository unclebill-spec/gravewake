"""Spell writer.

Earmarked for Gravewake and later games.
It draws spell strips as real pixels: one color per pixel, no blur.
You name the element. It does not invent a new palette mid-strip.

A frame is 16×16. A strip is six frames, left to right.
"""

from __future__ import annotations

from PIL import Image


def _rgba(color: str) -> tuple[int, int, int, int]:
    h = color.lstrip("#")
    return (int(h[0:2], 16), int(h[2:4], 16), int(h[4:6], 16), 255)


class Sprite:
    def __init__(self, w: int = 16, h: int = 16):
        self.w = w
        self.h = h
        self.p: list[list[str | None]] = [[None] * w for _ in range(h)]

    def set(self, x: int, y: int, color: str | None) -> None:
        if color and 0 <= x < self.w and 0 <= y < self.h:
            self.p[y][x] = color

    def rect(self, x: int, y: int, w: int, h: int, color: str) -> None:
        for yy in range(y, y + h):
            for xx in range(x, x + w):
                self.set(xx, yy, color)

    def image(self) -> Image.Image:
        im = Image.new("RGBA", (self.w, self.h), (0, 0, 0, 0))
        px = im.load()
        for y in range(self.h):
            for x in range(self.w):
                c = self.p[y][x]
                if c:
                    px[x, y] = _rgba(c)
        return im


def strip(frames: list[Sprite]) -> Image.Image:
    w = frames[0].w
    h = frames[0].h
    out = Image.new("RGBA", (w * len(frames), h), (0, 0, 0, 0))
    for i, frame in enumerate(frames):
        out.paste(frame.image(), (i * w, 0))
    return out


# Three steps and a hot core. Same hues a gothic dusk already uses.
FIRE = ("#6a2010", "#e07020", "#f4c040", "#fff0c0")
ICE = ("#143048", "#3a78a8", "#9ed0e8", "#f4fcff")
LIGHTNING = ("#6a5010", "#e0b030", "#f4e27a", "#fff8e0")
VENOM = ("#1a3010", "#3a6820", "#6a8a32", "#d0e070")
SHADOW = ("#1a1028", "#4a2870", "#8a68b0", "#e0d4f0")
HOLY = ("#6a5030", "#e0c060", "#f4e27a", "#fff8e0")

ELEMENTS = {
    "fire": FIRE,
    "ice": ICE,
    "lightning": LIGHTNING,
    "venom": VENOM,
    "shadow": SHADOW,
    "holy": HOLY,
}


def _bolt(colors: tuple[str, str, str, str], i: int) -> Sprite:
    """A head moving across the cell, with a short tail and two sparks."""
    dark, mid, hot, core = colors
    s = Sprite()
    x = 2 + i
    s.rect(x, 6, 3, 3, hot)
    s.set(x + 1, 7, core)
    for t in range(min(4, i + 1)):
        s.set(x - t, 7 + (t % 2), mid if t < 2 else dark)
    s.set((x + 3) % 16, 4 + (i % 3), hot)
    s.set((x + 1) % 16, 11 - (i % 2), mid)
    return s


def _disk(s: Sprite, cx: int, cy: int, colors: tuple[str, str, str, str], rad: int) -> None:
    dark, mid, hot, core = colors
    for y in range(cy - rad - 1, cy + rad + 2):
        for x in range(cx - rad - 1, cx + rad + 2):
            d = max(abs(x - cx), abs(y - cy))
            if d > rad:
                continue
            if d <= 1:
                s.set(x, y, core)
            elif d == rad:
                s.set(x, y, mid)
            else:
                s.set(x, y, hot)
            if d == rad and (x + y) % 2 == 0:
                s.set(x, y, dark)


def _beam(colors: tuple[str, str, str, str], i: int) -> Sprite:
    """A solid shaft. The bright knot travels. Stamp these along a line and they join."""
    s = Sprite()
    dark, mid, hot, core = colors
    s.rect(0, 5, 16, 6, mid)
    s.rect(0, 6, 16, 4, hot)
    s.rect(0, 7, 16, 2, core)
    s.rect(0, 5, 16, 1, dark)
    s.rect(0, 10, 16, 1, dark)
    knot = 1 + (i % 5) * 3
    s.rect(knot, 6, 3, 4, core)
    s.set(knot + 1, 7, "#fff8e0" if colors == LIGHTNING or colors == HOLY else core)
    return s


def _lightning(i: int) -> Sprite:
    """A thick bolt from top to bottom, with one fork. The jag changes each frame."""
    dark, mid, hot, core = LIGHTNING
    s = Sprite()
    x = 6 + (i % 3) - 1
    for step in range(14):
        if step % 3 == i % 3:
            x = max(2, min(11, x + (1 if (step + i) % 2 == 0 else -1)))
        y = 1 + step
        s.rect(x, y, 2, 1, hot)
        s.set(x, y, core)
        s.set(x - 1, y, mid)
        s.set(x + 2, y, dark)
    fork = 4 + (i % 4)
    fx = x + 1
    for step in range(4):
        fx = min(14, fx + 1)
        s.set(fx, fork + step, hot)
        s.set(fx, fork + step + 1, core)
    return s


def _orb(colors: tuple[str, str, str, str], i: int) -> Sprite:
    """A round shot crossing the cell, with a short tail."""
    dark, mid, hot, core = colors
    s = Sprite()
    cx = 3 + i * 2
    _disk(s, cx, 8, colors, 3)
    for t in range(1, 4):
        s.set(cx - t - 2, 8 + (t % 2), mid if t < 3 else dark)
        s.set(cx - t - 2, 7, hot if t == 1 else mid)
    s.set(cx, 8, core)
    return s


def _rain(colors: tuple[str, str, str, str], i: int) -> Sprite:
    """Drops falling through the cell. Fire and ice share this shape."""
    dark, mid, hot, core = colors
    s = Sprite()
    for k in range(5):
        x = 1 + (k * 3 + i) % 13
        y = (k * 2 + i * 2) % 11
        s.rect(x, y, 1, 3, hot)
        s.set(x, y, core)
        s.set(x, y + 3, mid)
        if k % 2 == 0:
            s.set(x + 1, y + 1, dark)
    return s


def _ring(colors: tuple[str, str, str, str], i: int) -> Sprite:
    dark, mid, hot, core = colors
    s = Sprite()
    rad = 2 + i
    cx, cy = 7, 7
    for dx, dy in ((0, -rad), (0, rad), (-rad, 0), (rad, 0), (-rad + 1, -rad + 1), (rad - 1, rad - 1)):
        s.set(cx + dx, cy + dy, hot if abs(dx) + abs(dy) < rad + 2 else mid)
    if i % 2 == 0:
        s.set(cx, cy - 1, core)
    else:
        s.set(cx + 1, cy, dark)
    return s


def _nova(colors: tuple[str, str, str, str], i: int) -> Sprite:
    dark, mid, hot, core = colors
    s = Sprite()
    cx, cy = 7, 7
    reach = 1 + i
    for n in range(reach):
        color = core if n == reach - 1 else hot if n > reach - 3 else mid if n > 1 else dark
        s.set(cx + n, cy, color)
        s.set(cx - n, cy, color)
        s.set(cx, cy - n, color)
        s.set(cx, cy + n, color)
        if n % 2 == 0:
            s.set(cx + n, cy - n, mid)
            s.set(cx - n, cy + n, mid)
    return s


def _cone(colors: tuple[str, str, str, str], i: int) -> Sprite:
    dark, mid, hot, core = colors
    s = Sprite()
    for row in range(3 + i):
        y = 4 + row
        half = row // 2
        s.rect(7 - half, y, 1 + half * 2, 1, hot if row > i else mid)
    s.set(7, 4, core)
    s.set(6, 6 + i, dark)
    s.set(8, 5 + (i % 3), dark)
    return s


def frames_for(name: str, n: int = 6) -> list[Sprite]:
    """Six frames. Bolts, beams, lightning, orbs, and rain."""
    if name == "lightning":
        return [_lightning(i) for i in range(n)]
    if name.startswith("beam-"):
        return [_beam(ELEMENTS[name.split("-", 1)[1]], i) for i in range(n)]
    if name == "orb":
        return [_orb(HOLY, i) for i in range(n)]
    if name == "fire-rain":
        return [_rain(FIRE, i) for i in range(n)]
    if name == "ice-rain":
        return [_rain(ICE, i) for i in range(n)]
    if name == "ring":
        return [_ring(HOLY, i) for i in range(n)]
    if name == "nova":
        return [_nova(SHADOW, i) for i in range(n)]
    if name == "cone":
        return [_cone(FIRE, i) for i in range(n)]
    colors = ELEMENTS[name]
    return [_bolt(colors, i) for i in range(n)]


# [OWNER-APPROVED 2026-10-01: CORE KEEPER GRAPHICS PASS C1-C11] C11: strips stay glow-free, but each strip carries
# an `emits` light colour (a name in the game's light table, src/game/light.ts LIGHTS) so the engine lights the
# world around the spell. The glow lives in the world, not in the sprite.
EMITS = {
    "fire": "pumpkin", "ice": "ghost", "lightning": "candle", "venom": "realm", "shadow": "hex", "holy": "candle",
    "orb": "candle", "fire-rain": "pumpkin", "ice-rain": "ghost", "ring": "candle", "nova": "hex", "cone": "pumpkin",
}


def emits_for(name: str) -> str:
    """The light a strip casts: a beam casts its element's light."""
    return EMITS[name.split("-", 1)[1]] if name.startswith("beam-") else EMITS[name]
