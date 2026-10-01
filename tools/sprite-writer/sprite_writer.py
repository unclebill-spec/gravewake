"""Sprite writer.

Earmarked for Gravewake and for later games.
It draws 16x32 people and creatures as real pixels: one color per pixel,
a 1px warm dark outline, no blending, 2-3 shade steps per material.
It never invents a hue. Every color it paints must already be one of the
game's locked colors (palette_locked.py); shade steps are picked from that
list, not mixed.

    from sprite_writer import human, creature, strip

    strip([human("warrior", p) for p in POSES]).save("hero.png")
    strip([creature("wolf", p, "boss") for p in POSES]).save("boss.png")

Eleven poses, in this order:
stand idle walk0 walk1 walk2 swing0 swing1 swing2 cast0 cast1 cast2.

The feet always end on row 28 (outline on row 29), the body centre stays on
x 7.5, so the game's draw anchor never changes.
"""

from __future__ import annotations

import colorsys
import math
import random
import sys
import zlib
from functools import lru_cache
from pathlib import Path

from PIL import Image

sys.path.insert(0, str(Path(__file__).resolve().parent))
from palette_locked import LOCKED, SPRITE_CORE  # noqa: E402

INK = "#140c10"
_SORTED = sorted(LOCKED)
_CORE = sorted(SPRITE_CORE & LOCKED)


def _rgba(color: str) -> tuple[int, int, int, int]:
    h = color.lstrip("#")
    return (int(h[0:2], 16), int(h[2:4], 16), int(h[4:6], 16), 255)


def _check(color: str) -> str:
    if color not in LOCKED:
        raise ValueError(f"{color} is not one of the game's locked colors")
    return color


class Sprite:
    def __init__(self, w: int = 16, h: int = 32):
        self.w = w
        self.h = h
        self.p: list[list[str | None]] = [[None] * w for _ in range(h)]

    def set(self, x: int, y: int, color: str | None) -> None:
        if color and 0 <= x < self.w and 0 <= y < self.h:
            self.p[y][x] = _check(color)

    def get(self, x: int, y: int) -> str | None:
        if 0 <= x < self.w and 0 <= y < self.h:
            return self.p[y][x]
        return None

    def rect(self, x: int, y: int, w: int, h: int, color: str | None) -> None:
        for yy in range(y, y + h):
            for xx in range(x, x + w):
                self.set(xx, yy, color)

    def clear(self, x: int, y: int, w: int, h: int) -> None:
        for yy in range(max(0, y), min(self.h, y + h)):
            for xx in range(max(0, x), min(self.w, x + w)):
                self.p[yy][xx] = None

    def pts(self, points, color: str | None) -> None:
        for x, y in points:
            self.set(x, y, color)

    def empty(self, x: int, y: int, color: str) -> None:
        """Paint only where nothing is painted yet (trails behind a body)."""
        if 0 <= x < self.w and 0 <= y < self.h and self.p[y][x] is None:
            self.p[y][x] = _check(color)

    def outline(self, ink: str = INK) -> None:
        src = [row[:] for row in self.p]
        for y in range(self.h):
            for x in range(self.w):
                if src[y][x]:
                    continue
                if any(
                    0 <= y + dy < self.h and 0 <= x + dx < self.w and src[y + dy][x + dx]
                    for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1))
                ):
                    self.p[y][x] = ink

    def recolor(self, table: dict[str, str]) -> None:
        for y in range(self.h):
            for x in range(self.w):
                c = self.p[y][x]
                if c in table:
                    self.p[y][x] = _check(table[c])

    def image(self) -> Image.Image:
        im = Image.new("RGBA", (self.w, self.h), (0, 0, 0, 0))
        px = im.load()
        for y in range(self.h):
            for x in range(self.w):
                c = self.p[y][x]
                if c:
                    px[x, y] = _rgba(c)
        return im


def lying(s: Sprite) -> Sprite:
    """A standing 16x32 figure laid on its side in a 32x16 cell: a quarter turn, head to the right,
    resting on the bottom row. Pixels are moved, never resampled, so the palette lock holds."""
    out = Sprite(s.h, s.w)
    cols = [x for x in range(s.w) if any(s.p[y][x] for y in range(s.h))]
    if not cols:
        return out
    drop = (s.w - 1) - max(cols)
    for y in range(s.h):
        for x in range(s.w):
            c = s.p[y][x]
            if c:
                out.set(s.h - 1 - y, x + drop, c)
    return out


def strip(sprites: list[Sprite]) -> Image.Image:
    w = sprites[0].w
    h = sprites[0].h
    out = Image.new("RGBA", (w * len(sprites), h), (0, 0, 0, 0))
    for i, sprite in enumerate(sprites):
        out.paste(sprite.image(), (i * w, 0))
    return out


# ---------------------------------------------------------------- shade steps

def _hls(c: str) -> tuple[float, float, float]:
    r, g, b = (int(c[i:i + 2], 16) / 255 for i in (1, 3, 5))
    return colorsys.rgb_to_hls(r, g, b)


@lru_cache(maxsize=None)
def _step(c: str, sign: int) -> str:
    """The nearest locked color one shade step darker (-1) or lighter (+1), same hue family.

    The first sprite set's colors are tried first; the wider locked list only fills gaps."""
    return _step_in(c, sign, tuple(_CORE)) or _step_in(c, sign, tuple(_SORTED)) or c


def _step_in(c: str, sign: int, pool: tuple[str, ...]) -> str | None:
    h, l, s = _hls(_check(c))
    best: tuple[float, str] | None = None
    for cand in pool:
        if cand == c or cand == INK:
            continue
        h2, l2, s2 = _hls(cand)
        dl = (l2 - l) * sign
        if dl < 0.04 or dl > 0.25:
            continue
        dh = min(abs(h2 - h), 1 - abs(h2 - h)) * 360
        if s > 0.08 and s2 > 0.08 and dh > 22:
            continue
        if abs(s2 - s) > 0.35:
            continue
        score = dh / 20 + abs(dl - 0.11) * 8 + abs(s2 - s) * 2
        if best is None or score < best[0]:
            best = (score, cand)
    return best[1] if best else None


def dk(c: str, n: int = 1) -> str:
    for _ in range(n):
        c = _step(c, -1)
    return c


def lt(c: str, n: int = 1) -> str:
    for _ in range(n):
        c = _step(c, 1)
    return c


# ---------------------------------------------------------------- shared colors

SKIN = "#e8b898"
PALE = "#ecd8cc"
BOOT = "#2a241c"
GOLD = "#e0c060"
GOLD_HI = "#f4e27a"
WHITE_HOT = "#fff8e0"
BONE = "#f4ecdc"
STEEL = "#8a9098"
STEEL_HI = "#c8c8d0"
WOOD = "#5a4030"
SMEAR = "#f4f0ea"
SMEAR_MID = "#e8dcc8"
MOUTH = "#a06050"
SASH = "#3a78a8"
MINI_RED = "#8a3038"

SKINS = ["#e8b898", "#f0c8b0", "#c08060", "#8a5840", "#ecd8cc", "#d2c0b4"]
HAIRS = ["#3a2418", "#1a1014", "#6a3c28", "#c4a15a", "#8a5840", "#e6e0d4", "#4a4a50", "#8a4038"]
CLOTHS = ["#2a4568", "#6a3a28", "#2a4a38", "#6a4060", "#5a4030", "#3a3228", "#1c3040", "#6a2030", "#4a4038", "#2a3a6a", "#6a5040"]

POSES = ("stand", "idle", "walk0", "walk1", "walk2", "swing0", "swing1", "swing2", "cast0", "cast1", "cast2")

# ---------------------------------------------------------------- pose tables
# ux, uy: upper body lean and bob. hdy: extra head dip. legs key. left arm, right arm.
BODY = {
    "stand": (0, 0, 0, "stand", "down", "down"),
    "idle": (-1, 1, 0, "idle", "down", "hip"),
    "walk0": (0, 0, 0, "walk0", "back", "fwd"),
    "walk1": (0, -1, 0, "walk1", "down", "down"),
    "walk2": (0, 0, 0, "walk2", "fwd", "back"),
    "swing0": (-1, 1, 0, "brace", "guard", "raise"),
    "swing1": (1, 0, 0, "lunge", "back", "strike"),
    "swing2": (1, 1, 1, "lunge", "back", "follow"),
    "cast0": (0, 1, 0, "brace", "chest", "chest"),
    "cast1": (0, -1, 0, "brace", "up", "up"),
    "cast2": (0, 0, 0, "stand", "open", "open"),
}

# feet: (x of 3-wide boot, top row of 3-tall boot). A boot ends on row 28 when planted.
LEGS = {
    "stand": ((4, 26), (9, 26)),
    "idle": ((4, 26), (10, 26)),
    "walk0": ((4, 26), (9, 24)),
    "walk1": ((5, 26), (8, 25)),
    "walk2": ((4, 24), (9, 26)),
    "brace": ((3, 26), (10, 26)),
    "lunge": ((3, 26), (11, 26)),
}

# right arm, from the arm's top-left at the shoulder. Sleeve rects then the 2x2 hand.
ARM = {
    "down": ([(0, 0, 2, 6)], (0, 6)),
    "fwd": ([(0, 0, 2, 5)], (-1, 5)),
    "back": ([(0, 0, 2, 4), (1, 3, 2, 2)], (1, 5)),
    "hip": ([(0, 0, 2, 2), (1, 1, 2, 3)], (0, 4)),
    "raise": ([(0, -4, 2, 5)], (0, -6)),
    "strike": ([(0, 0, 2, 2), (0, 2, 2, 1)], (1, 3)),
    "follow": ([(0, 0, 2, 3), (-2, 3, 3, 2)], (-4, 4)),
    "chest": ([(0, 0, 2, 3), (-1, 2, 2, 2)], (-2, 3)),
    "up": ([(0, -4, 2, 5), (1, -6, 2, 2)], (1, -8)),
    "open": ([(0, 0, 2, 2), (1, 1, 2, 3)], (2, 3)),
    "guard": ([(0, 0, 2, 3), (-1, 2, 2, 2)], (-2, 3)),
    "reach": ([(0, 0, 2, 2), (-1, 1, 2, 2)], (-2, 1)),
    "long": ([(0, 0, 2, 8)], (0, 8)),
    "longfwd": ([(0, 0, 2, 7)], (-1, 7)),
    "longback": ([(0, 0, 2, 6), (1, 5, 2, 2)], (1, 7)),
    "claw": ([(0, 0, 2, 2), (1, 1, 2, 2)], (2, 1)),
}

BUILD = {  # torso x0, x1, left arm x, right arm x
    "slim": (5, 10, 3, 11),
    "mid": (4, 11, 2, 12),
    "broad": (4, 11, 2, 12),
    "stout": (3, 12, 1, 13),
}


def _mirror_rect(ax: int, r: tuple[int, int, int, int]) -> tuple[int, int, int, int]:
    dx, dy, w, h = r
    return (ax - dx - w + 2, dy, w, h)


def _seed(*parts) -> random.Random:
    return random.Random(zlib.crc32("|".join(str(p) for p in parts).encode()))


# ---------------------------------------------------------------- people

def _p(**kw):
    base = dict(
        build="mid", cloth="#3a3228", trim="#c4b48a", skin=SKIN, hair="#3a2418", hairstyle="short",
        hat="none", hatc="#2a241c", weapon="none", item=None, cape=None, capein=None, apron=None,
        robe=False, coat=False, pants=None, boot=BOOT, belt="#3a2418", eyes=INK, mouth="mouth",
        beard=None, glow=(WHITE_HOT, GOLD_HI), back=None, extra=(), gloves=None, metal=STEEL,
    )
    base.update(kw)
    return base


PEOPLE: dict[str, dict] = {
    # heroes
    "warrior": _p(build="broad", cloth="#2a4568", trim="#c4b48a", hat="helm", hatc=STEEL, weapon="sword",
                  pants="#3a3228", extra=("pauldrons", "shield", "mail"), plume="#8a2030", hairstyle="short"),
    "wizard": _p(cloth="#4a2870", trim="#c4b4e0", hat="point", hatc="#2a1848", weapon="staff", robe=True,
                 beard="#e6e0d4", hair="#e6e0d4", glow=(WHITE_HOT, "#c4b4e0"), topper="#9ec4e0", extra=("stars",)),
    "assassin": _p(build="slim", cloth="#243828", trim="#1a1a1a", hat="hood", hatc="#1a2818", weapon="dagger",
                   pants="#1a1a1c", cape="#1a2818", extra=("mask", "dagger2"), glow=(SMEAR, "#8a9090")),
    "vampire": _p(cloth="#6a2030", trim="#1a1014", skin=PALE, hairstyle="slick", hair="#1a1014", eyes="#a02030",
                  mouth="fangs", cape="#1a1014", capein="#8a2030", extra=("collar", "jabot"), pants="#1a1014",
                  weapon="claw", glow=("#f4ecdc", "#a02040")),
    # companions
    "priest": _p(cloth="#e6e0d4", trim="#c4b48a", hat="mitre", hatc="#f4f0e8", robe=True, weapon="mace",
                 extra=("stole",), glow=(WHITE_HOT, GOLD)),
    "witch": _p(cloth="#4a1848", trim="#c44868", skin="#f0c8b0", hat="witchhat", hatc="#2a1028", hairstyle="long",
                hair="#140810", weapon="broom", robe=True, glow=(GOLD_HI, "#c44868")),
    "shade": _p(cloth="#1a2438", trim="#8aa0c0", skin="#9eb0c8", hat="hood", hatc="#101820", eyes="#c5d4e8",
                robe=True, extra=("wraith", "faceless"), weapon="scythe", glow=("#e8eef8", "#8aa0c0")),
    "mystic": _p(cloth="#241848", trim="#e0c868", hat="turban", hatc="#140c28", weapon="orb", robe=True,
                 extra=("stars", "gem"), glow=(WHITE_HOT, "#e0c868"), skin="#c08060"),
    # town
    "guard": _p(build="broad", cloth="#2a3140", trim="#c4b48a", hat="kettle", hatc=STEEL, weapon="spear",
                pants="#1a2030", extra=("tabard", "mail"), hairstyle="short"),
    "hunter": _p(cloth="#3a3228", trim="#6a2030", hat="widebrim", hatc="#2a241c", weapon="crossbow", coat=True,
                 pants="#2a241c", back="quiver", extra=("bandolier",), beard="#3a2418"),
    "undertaker": _p(build="slim", cloth="#1a1a1c", trim="#4a4a50", skin="#c8b8a8", hat="tophat", hatc="#101014",
                     weapon="shovel", coat=True, pants="#101014", mouth="grim"),
    "zeppelin": _p(cloth="#4a4038", trim="#c4b48a", hat="aviator", hatc="#6a5a40", extra=("scarf",),
                   pants="#3a3228", gloves="#6a5a40", item="spyglass"),
    "inn": _p(build="stout", cloth="#6a3a28", trim="#e6dcc8", hat="kerchief", hatc="#e6dcc8", apron="#e6dcc8",
              item="mug", beard="#6a3c28", hairstyle="short", hair="#6a3c28"),
    "shop": _p(cloth="#2a4a38", trim="#c4b48a", hat="flatcap", hatc="#1a3028", apron="#c4b48a", item="ledger"),
    "guild": _p(build="broad", cloth="#2a3a6a", trim="#e0c060", hat="hood", hatc="#1a2848", weapon="sword",
                cape="#1a2848", extra=("badge",), pants="#1a2030"),
    "bank": _p(cloth="#2a2a2e", trim="#d8c878", hat="bowler", hatc="#1a1a1c", item="coins", extra=("specs", "vest"),
               hairstyle="short", hair="#4a4a50", mouth="grim"),
    "casino": _p(build="slim", cloth="#8a2030", trim="#f0e2c8", hat="visor", hatc="#2f6a4a", item="cards",
                 extra=("bowtie", "vest"), hairstyle="slick", hair="#1a1014"),
    "patron": _p(cloth="#3a1830", trim="#c4a050", hat="plume", hatc="#1a1218", weapon="cane", coat=True,
                 extra=("jabot",), plume="#c44868", pants="#1a1218"),
    "smith": _p(build="broad", cloth="#5a4030", trim="#2a2a2e", skin="#c08060", hat="headband", hatc="#8a2030",
                hairstyle="bald", apron="#3a2a22", weapon="hammer", beard="#3a2418", extra=("barearms",),
                pants="#2a2a2e"),
    "tailor": _p(build="slim", cloth="#6a4060", trim="#e6dcc8", hairstyle="bun", hair="#6a3c28", item="scissors",
                 extra=("tape", "shawl"), robe=True),
    "fisher": _p(cloth="#1c3040", trim="#6a8a48", skin="#d2c0b4", hat="souwester", hatc="#c4a15a", weapon="rod",
                 pants="#101820", boot="#243828", beard="#6a5848"),
    "merchant": _p(build="stout", cloth="#6a5040", trim="#c4a15a", hat="turban", hatc="#8a2030", back="pack",
                   item="coins", beard="#6a3c28", hair="#6a3c28", skin="#c08060"),
    "alchemist": _p(cloth="#4a1848", trim="#6a8a32", skin="#f0c8b0", hat="goggles", hatc="#6a8a32",
                    hairstyle="wild", hair="#c4a15a", apron="#c4b48a", item="flask", extra=("stains",),
                    glow=("#9ec060", "#6a8a32")),
    "portal": _p(cloth="#1a2438", trim="#c4b4e0", hat="cowl", hatc="#101820", weapon="crystal", robe=True,
                 extra=("runes",), glow=(WHITE_HOT, "#c4b4e0"), topper="#c4b4e0"),
}

# Which parts a crowd member may vary. Hats, tools, and silhouette stay fixed per role.
TOWN = {"guard", "hunter", "undertaker", "zeppelin", "inn", "shop", "guild", "bank", "casino", "patron",
        "smith", "tailor", "fisher", "merchant", "alchemist", "portal"}
HAIRSTYLES = ["short", "long", "bun", "pony", "curly", "slick", "bald", "spiky"]


def folk_spec(role: str, variant: int = 0) -> dict:
    """The role's look. variant 0 is the canonical one; others are seeded crowd variations."""
    spec = dict(PEOPLE[role])
    if variant == 0 or role not in TOWN:
        return spec
    r = _seed(role, variant)
    # each look of a role gets its own skin step, so even a hooded uniform never repeats
    spec["skin"] = SKINS[1 + (_seed(role).randrange(5) + variant) % 5] if variant <= 5 else r.choice(SKINS)
    spec["hair"] = r.choice(HAIRS)
    if spec["hairstyle"] != "bald" or r.random() < 0.5:
        spec["hairstyle"] = r.choice(HAIRSTYLES)
    if spec.get("beard"):
        spec["beard"] = spec["hair"] if r.random() < 0.7 else None
    elif r.random() < 0.25 and spec["hairstyle"] not in ("bun", "long"):
        spec["beard"] = spec["hair"]
    if role not in ("guard", "undertaker", "guild"):  # uniforms stay uniform
        spec["cloth"] = r.choice([c for c in CLOTHS if c != spec["cloth"]])
    if spec.get("pants") and role not in ("guard", "guild"):
        spec["pants"] = r.choice(["#3a3228", "#2a241c", "#1a2030", "#4a4038", "#1c3040"])
    return spec


def _box(s: Sprite, x: int, y: int, w: int, h: int, c: str, light: bool = True) -> None:
    """A shaded block: base, dark left column and bottom row, light cluster on the lit (right, upper) side."""
    s.rect(x, y, w, h, c)
    d = dk(c)
    s.rect(x, y + 1, 1, h - 1, d)
    s.rect(x, y + h - 1, w, 1, d)
    if light and w >= 3 and h >= 3:
        s.rect(x + w - 2, y + 1, 1, max(1, (h - 1) // 2), lt(c))


def _legs(s: Sprite, spec: dict, legs: str, uy: int, robe: bool) -> None:
    pants = spec["pants"] or dk(spec["cloth"], 2)
    boot = spec["boot"]
    hip = 22 + uy
    thin = "thinlegs" in spec["extra"]
    for i, (fx, ft) in enumerate(LEGS[legs]):
        if not robe:
            top = hip
            for y in range(top, ft):
                if thin:
                    s.set(fx + 1, y, pants)
                    if y == (top + ft) // 2:
                        s.rect(fx, y, 3, 1, pants)  # the knee
                    continue
                s.rect(fx, y, 3, 1, pants)
                s.set(fx, y, dk(pants))
            if legs == "idle" and i == 1:
                s.set(fx + 1, hip + 1, lt(pants))  # relaxed knee
        if robe and ft < 26:
            continue  # a lifted foot hides under the hem
        if "bare" in spec["extra"]:
            s.rect(fx, ft + 1, 3, 2, boot)
            s.set(fx + 1, ft, boot)
            s.set(fx, ft + 2, dk(boot))
            if "claws" in spec["extra"]:
                s.pts([(fx, ft + 2), (fx + 2, ft + 2)], BONE)
            continue
        s.rect(fx, ft, 3, 3, boot)
        s.rect(fx, ft, 3, 1, lt(boot))  # cuff
        s.set(fx + 2, ft + 1, lt(boot))  # toe light
        if ft < 26:
            s.rect(fx, ft + 2, 3, 1, dk(boot))  # the sole shows on a lifted foot


def _torso(s: Sprite, spec: dict, ux: int, uy: int, legs: str, pose: str) -> tuple[int, int]:
    x0, x1, _, _ = BUILD[spec["build"]]
    x0 += ux
    x1 += ux
    ay = 14 + uy
    cloth = spec["cloth"]
    w = x1 - x0 + 1
    bottom = 21 + uy
    if spec["robe"]:
        bottom = 26
    elif spec["coat"]:
        bottom = 24
    _box(s, x0, ay, w, bottom - ay + 1, cloth)
    s.rect(x0 - 1 if spec["build"] in ("broad", "stout") else x0, ay, w + (2 if spec["build"] in ("broad", "stout") else 0), 1, cloth)
    if spec["robe"]:
        # the hem flares and swings toward the forward leg
        (lx, lt_), (rx, rt) = LEGS[legs]
        shift = 1 if rt > lt_ else -1 if lt_ > rt else 0
        if pose in ("idle",):
            shift = -1
        for y in range(22, 27):
            spread = (y - 21) // 2
            s.rect(x0 - spread + shift * (y > 24), y, w + 2 * spread, 1, cloth)
            s.set(x0 - spread + shift * (y > 24), y, dk(cloth))
        s.rect(x0 - 2 + shift, 26, w + 4, 1, dk(cloth))
        s.rect(x0 - 2 + shift, 25, w + 4, 1, spec["trim"])
        s.rect(7 + ux, ay + 1, 2, 12 - uy, dk(cloth))  # centre fold
    elif spec["coat"]:
        for y in range(21 + uy, 25):
            s.p[y][7 + ux] = None
            s.p[y][8 + ux] = None
        s.rect(x0, 24, w, 1, dk(cloth))
        s.set(7 + ux, 21 + uy, spec["trim"])
        s.set(8 + ux, 21 + uy, spec["trim"])
    # collar and chest trim
    s.rect(6 + ux, ay, 4, 1, spec["trim"])
    s.set(7 + ux, ay + 1, spec["trim"])
    s.set(8 + ux, ay + 1, spec["trim"])
    # belt
    if not spec["robe"] or "stole" in spec["extra"]:
        by = 20 + uy
        s.rect(x0, by, w, 1, spec["belt"])
        s.set(7 + ux, by, spec["metal"] if spec["metal"] else GOLD)
        s.set(8 + ux, by, lt(spec["metal"]))
    else:
        s.rect(x0 + 1, 20 + uy, w - 2, 1, spec["trim"])  # a cord at the waist
    return x0, x1


def _arm(s: Sprite, spec: dict, key: str, ax: int, ay: int, left: bool) -> tuple[int, int]:
    rects, (hx, hy) = ARM[key]
    sleeve = spec.get("sleeve") or (spec["cloth"] if "barearms" not in spec["extra"] else spec["skin"])
    if "mail" in spec["extra"]:
        sleeve = STEEL
    for r in rects:
        x, y, w, h = _mirror_rect(ax, r) if left else r
        if not left:
            x += ax
        s.rect(x, ay + y, w, h, sleeve)
        s.rect(x, ay + y + h - 1, w, 1, dk(sleeve))
        if not left:
            s.rect(x + w - 1, ay + y, 1, max(1, h - 1), lt(sleeve) if h > 2 else sleeve)
    if left:
        hx = ax - hx
    else:
        hx = ax + hx
    hand = spec["gloves"] or spec["skin"]
    s.rect(hx, ay + hy, 2, 2, hand)
    s.set(hx if left else hx + 1, ay + hy + 1, dk(hand))
    if "handclaws" in spec["extra"]:
        s.pts([(hx, ay + hy + 2), (hx + 1, ay + hy + 2)], BONE)
    return hx, ay + hy


FACE_X = 4


def _head(s: Sprite, spec: dict, hx: int, hy: int, pose: str) -> None:
    skin = spec["skin"]
    faceless = "faceless" in spec["extra"]
    x = FACE_X + hx
    kind = spec.get("head", "human")
    if kind != "human":
        HEADS[kind](s, spec, x, hy, pose)
        return
    s.rect(x, hy, 8, 8, skin)
    for cx, cy in ((x, hy), (x + 7, hy), (x, hy + 7), (x + 7, hy + 7)):
        if 0 <= cy < 32 and 0 <= cx < 16:
            s.p[cy][cx] = None
    s.rect(x, hy + 2, 1, 4, dk(skin))
    s.rect(x + 1, hy + 7, 6, 1, dk(skin))
    s.set(x + 6, hy + 3, lt(skin))
    s.set(x + 6, hy + 4, lt(skin))
    # neck
    s.rect(x + 3, hy + 8, 2, 1, dk(skin))
    # face
    ey = hy + 4
    if faceless:
        s.rect(x + 1, hy + 2, 6, 5, "#101820")
        if pose != "idle":
            s.set(x + 2, ey, spec["eyes"])
            s.set(x + 5, ey, spec["eyes"])
        return
    brow = dk(spec["hair"]) if spec["hairstyle"] != "bald" else dk(skin, 2)
    if pose == "idle":
        s.set(x + 2, ey + 1, dk(skin, 2))  # blink
        s.set(x + 5, ey + 1, dk(skin, 2))
    else:
        s.rect(x + 2, ey, 1, 2, INK)
        s.rect(x + 5, ey, 1, 2, INK)
        if spec["eyes"] != INK:
            s.set(x + 2, ey, spec["eyes"])
            s.set(x + 5, ey, spec["eyes"])
    if spec["hat"] in ("hood", "cowl"):
        brow = dk(skin, 2)
    if pose in ("swing0", "swing1", "cast1"):
        # a hard frown: the inner brow drops a pixel
        s.pts([(x + 1, ey - 2), (x + 2, ey - 1), (x + 5, ey - 1), (x + 6, ey - 2)], brow)
    else:
        s.pts([(x + 1, ey - 1), (x + 2, ey - 1), (x + 5, ey - 1), (x + 6, ey - 1)], brow)
    s.set(x + 4, ey + 1, dk(skin))  # nose shadow
    my = hy + 6
    m = spec["mouth"]
    if m == "gape":
        s.rect(x + 3, my, 2, 2 if pose in ("swing1", "cast1", "idle") else 1, "#3a2830")
    elif pose in ("swing1", "cast1"):
        s.rect(x + 3, my, 2, 1, "#6a2030")  # a shout
    elif m == "fangs":
        s.rect(x + 3, my, 2, 1, "#6a2030")
        s.set(x + 3, my + 1, BONE)
    elif m == "hag":
        s.rect(x + 3, my, 2, 1, "#3a2830")
        s.set(x + 4, hy + 5, dk(skin))
        s.set(x + 4, hy + 4, skin)
        s.set(x + 3, hy + 5, lt(skin))  # a hooked nose
    elif m == "grim":
        s.rect(x + 2, my, 4, 1, dk(skin, 2))
    else:
        s.rect(x + 3, my, 2, 1, MOUTH)


def _hair(s: Sprite, spec: dict, hx: int, hy: int) -> None:
    st = spec["hairstyle"]
    h = spec["hair"]
    d = dk(h)
    li = lt(h)
    x = FACE_X + hx
    if st == "none":
        return
    if st == "tufts":
        s.pts([(x + 1, hy - 1), (x + 2, hy), (x + 5, hy - 1), (x + 6, hy), (x + 7, hy + 1)], h)
        s.set(x + 3, hy + 1, dk(spec["skin"]))  # a scar
        s.set(x + 4, hy + 1, dk(spec["skin"]))
        return
    if st == "flattop":
        s.rect(x, hy - 2, 8, 3, h)
        s.rect(x, hy + 1, 8, 1, h)
        s.set(x + 5, hy - 2, li)
        s.rect(x + 1, hy + 2, 3, 1, dk(spec["skin"]))  # stitches
        s.pts([(x + 1, hy + 3), (x + 3, hy + 3)], dk(spec["skin"]))
        return
    if st == "bald":
        s.set(x + 5, hy + 1, lt(spec["skin"]))
        s.rect(x, hy + 3, 1, 2, h)
        s.rect(x + 7, hy + 3, 1, 2, h)
        return
    s.rect(x + 1, hy - 1, 6, 1, h)
    s.rect(x, hy, 8, 2, h)
    s.rect(x, hy + 2, 1, 3, d)
    s.rect(x + 7, hy + 2, 1, 2, h)
    s.rect(x + 4, hy, 3, 1, li)
    if st == "slick":
        s.rect(x + 3, hy + 2, 2, 1, h)  # widow's peak
        s.set(x + 1, hy + 2, d)
        s.set(x + 6, hy + 2, h)
    else:
        s.rect(x + 1, hy + 2, 2, 1, h)  # fringe
        s.set(x + 5, hy + 2, h)
        s.set(x + 6, hy + 2, h)
    if st == "long":
        s.rect(x - 1, hy + 1, 1, 9, d)
        s.rect(x + 8, hy + 1, 1, 9, h)
        s.rect(x, hy + 5, 1, 5, h)
        s.rect(x + 7, hy + 4, 1, 6, h)
    elif st == "bun":
        s.rect(x + 2, hy - 3, 4, 2, h)
        s.set(x + 4, hy - 3, li)
    elif st == "pony":
        s.rect(x + 8, hy + 1, 1, 6, h)
        s.set(x + 9, hy + 6, d)
    elif st == "curly":
        s.pts([(x, hy - 1), (x + 2, hy - 2), (x + 4, hy - 2), (x + 6, hy - 2), (x + 7, hy - 1)], h)
        s.rect(x - 1, hy + 1, 1, 3, d)
        s.rect(x + 8, hy + 1, 1, 3, h)
    elif st == "spiky" or st == "wild":
        s.pts([(x + 1, hy - 2), (x + 3, hy - 3), (x + 4, hy - 2), (x + 6, hy - 2), (x + 7, hy - 2)], h)
        if st == "wild":
            s.pts([(x - 1, hy + 1), (x - 1, hy + 2), (x + 8, hy), (x + 8, hy + 1)], h)


def _beard(s: Sprite, spec: dict, hx: int, hy: int, long: bool) -> None:
    b = spec["beard"]
    if not b:
        return
    x = FACE_X + hx
    s.rect(x, hy + 4, 1, 3, b)
    s.rect(x + 7, hy + 4, 1, 3, b)
    s.pts([(x + 1, hy + 6), (x + 2, hy + 6), (x + 5, hy + 6), (x + 6, hy + 6)], b)
    s.rect(x + 1, hy + 7, 6, 1, b)
    s.set(x + 6, hy + 7, dk(b))
    s.set(x + 1, hy + 6, dk(b))
    if long:
        s.rect(x + 2, hy + 8, 4, 3, b)
        s.rect(x + 3, hy + 11, 2, 2, b)
        s.set(x + 5, hy + 8, lt(b))
        s.set(x + 2, hy + 10, dk(b))


def _hat(s: Sprite, spec: dict, hx: int, hy: int) -> None:
    hat = spec["hat"]
    c = spec["hatc"]
    d = dk(c)
    li = lt(c)
    x = FACE_X + hx
    tr = spec["trim"]
    if hat == "helm":
        s.rect(x + 1, hy - 2, 6, 1, c)
        s.rect(x, hy - 1, 8, 3, c)
        s.rect(x, hy + 2, 1, 4, c)
        s.rect(x + 7, hy + 2, 1, 4, c)
        s.rect(x, hy - 1, 1, 7, d)
        s.rect(x + 5, hy - 2, 1, 3, li)
        s.rect(x, hy + 2, 8, 1, dk(c))
        s.set(x + 3, hy + 3, c)
        s.set(x + 3, hy + 4, d)  # nose guard
        pl = spec.get("plume")
        if pl:
            s.rect(x + 3, hy - 4, 2, 2, pl)
            s.set(x + 5, hy - 4, pl)
            s.set(x + 6, hy - 3, dk(pl))
            s.set(x + 4, hy - 4, lt(pl))
    elif hat == "kettle":
        s.rect(x + 1, hy - 2, 6, 1, c)
        s.rect(x + 1, hy - 1, 6, 2, c)
        s.rect(x - 2, hy + 1, 12, 1, c)
        s.rect(x - 1, hy + 2, 10, 1, d)
        s.rect(x + 5, hy - 2, 1, 3, li)
        s.set(x + 1, hy - 1, d)
        s.rect(x + 1, hy + 1, 6, 1, lt(c))
    elif hat == "point":
        s.rect(x - 2, hy + 1, 12, 1, c)
        s.rect(x - 1, hy + 2, 10, 1, d)
        s.rect(x, hy, 8, 1, tr)
        s.rect(x + 1, hy - 1, 6, 1, c)
        s.rect(x + 1, hy - 2, 5, 1, c)
        s.rect(x + 2, hy - 3, 4, 1, c)
        s.rect(x + 4, hy - 4, 3, 1, c)
        s.rect(x + 6, hy - 5, 2, 1, c)
        s.set(x + 1, hy - 1, d)
        s.set(x + 1, hy - 2, d)
        s.set(x + 4, hy - 2, GOLD_HI)
        s.set(x + 5, hy - 3, li)
    elif hat == "witchhat":
        s.rect(x - 3, hy + 1, 14, 1, c)
        s.rect(x - 1, hy + 2, 10, 1, d)
        s.rect(x, hy, 8, 1, tr)
        s.set(x + 3, hy, GOLD)
        s.set(x + 4, hy, GOLD)
        s.rect(x + 1, hy - 1, 6, 1, c)
        s.rect(x + 1, hy - 2, 5, 1, c)
        s.rect(x, hy - 3, 4, 1, c)
        s.rect(x - 1, hy - 4, 3, 1, c)
        s.set(x - 2, hy - 4, d)
        s.set(x + 5, hy - 1, li)
        s.set(x + 4, hy - 2, li)
    elif hat in ("hood", "cowl"):
        s.rect(x - 1, hy, 10, 9, c)
        s.rect(x, hy - 1, 8, 1, c)
        s.set(x + 1, hy - 2, c)  # the hood's point falls back
        s.rect(x - 1, hy + 1, 1, 8, d)
        s.rect(x + 6, hy, 1, 2, li)
        # the face opening is repainted by _person
        if hat == "cowl":
            s.rect(x, hy + 1, 8, 1, tr)
            s.set(x + 3, hy, GOLD_HI)
            s.set(x + 4, hy, GOLD_HI)
    elif hat == "tophat":
        s.rect(x - 1, hy + 1, 10, 1, c)
        s.rect(x + 1, hy - 4, 6, 5, c)
        s.rect(x + 1, hy, 6, 1, tr)
        s.rect(x + 5, hy - 4, 1, 4, li)
        s.rect(x + 1, hy - 4, 1, 5, d)
    elif hat == "widebrim":
        s.rect(x - 3, hy + 1, 14, 1, c)
        s.set(x - 3, hy + 2, c)
        s.set(x + 10, hy + 2, c)
        s.rect(x + 1, hy - 2, 6, 3, c)
        s.rect(x + 1, hy, 6, 1, tr)
        s.rect(x - 2, hy + 2, 12, 1, None)
        s.rect(x + 5, hy - 2, 1, 2, li)
        s.set(x + 1, hy - 1, d)
    elif hat == "aviator":
        s.rect(x, hy - 1, 8, 3, c)
        s.rect(x + 1, hy - 2, 6, 1, c)
        s.rect(x, hy + 2, 1, 4, c)
        s.rect(x + 7, hy + 2, 1, 4, c)
        s.rect(x, hy - 1, 1, 7, d)
        s.rect(x + 1, hy + 1, 2, 1, "#9ec4e0")
        s.rect(x + 5, hy + 1, 2, 1, "#9ec4e0")
        s.pts([(x, hy + 1), (x + 3, hy + 1), (x + 4, hy + 1), (x + 7, hy + 1)], "#c4b48a")
        s.set(x + 6, hy + 1, "#e8f2f8")
    elif hat == "kerchief":
        s.rect(x, hy - 1, 8, 3, c)
        s.rect(x + 1, hy - 2, 6, 1, c)
        s.rect(x, hy + 1, 8, 1, d)
        s.pts([(x + 8, hy + 1), (x + 8, hy + 2), (x + 9, hy + 3)], c)
        s.rect(x + 4, hy - 2, 2, 1, li)
    elif hat == "flatcap":
        s.rect(x, hy - 1, 8, 2, c)
        s.rect(x + 1, hy - 2, 6, 1, c)
        s.rect(x + 1, hy + 1, 8, 1, d)
        s.set(x + 5, hy - 2, li)
        s.set(x + 3, hy - 1, li)
    elif hat == "bowler":
        s.rect(x + 2, hy - 3, 4, 1, c)
        s.rect(x + 1, hy - 2, 6, 3, c)
        s.rect(x - 1, hy + 1, 10, 1, c)
        s.set(x - 1, hy, c)
        s.set(x + 8, hy, c)
        s.rect(x + 1, hy, 6, 1, dk(c))
        s.set(x + 5, hy - 2, li)
    elif hat == "visor":
        s.rect(x, hy + 1, 8, 1, tr)
        s.rect(x - 1, hy + 2, 10, 1, c)
        s.set(x + 6, hy + 2, lt(c))
    elif hat == "plume":
        s.rect(x - 2, hy + 1, 12, 1, c)
        s.rect(x, hy - 2, 7, 3, c)
        s.rect(x, hy, 7, 1, tr)
        s.set(x, hy - 2, d)
        pl = spec.get("plume") or "#c44868"
        s.pts([(x + 7, hy - 1), (x + 8, hy - 2), (x + 8, hy - 3), (x + 9, hy - 4), (x + 9, hy - 5)], pl)
        s.pts([(x + 7, hy - 2), (x + 8, hy - 4)], lt(pl))
    elif hat == "headband":
        s.rect(x, hy + 2, 8, 1, c)
        s.pts([(x + 8, hy + 2), (x + 9, hy + 3), (x + 8, hy + 4)], c)
        s.set(x + 5, hy + 2, lt(c))
    elif hat == "souwester":
        s.rect(x + 1, hy - 2, 6, 1, c)
        s.rect(x, hy - 1, 8, 2, c)
        s.rect(x - 2, hy + 1, 12, 1, c)
        s.rect(x - 2, hy + 2, 2, 2, c)
        s.rect(x + 8, hy + 2, 2, 2, c)
        s.rect(x - 1, hy + 2, 1, 2, d)
        s.rect(x + 5, hy - 2, 1, 2, li)
        s.set(x, hy - 1, d)
    elif hat == "turban":
        s.rect(x + 1, hy - 3, 6, 1, c)
        s.rect(x, hy - 2, 8, 4, c)
        s.rect(x - 1, hy - 1, 10, 2, c)
        s.rect(x - 1, hy, 10, 1, d)
        s.rect(x + 1, hy - 2, 5, 1, lt(c))
        s.set(x + 3, hy - 1, GOLD)
        s.set(x + 4, hy - 1, GOLD_HI)
        s.set(x + 4, hy - 4, spec.get("plume") or tr)
        s.set(x + 5, hy - 5, spec.get("plume") or tr)
    elif hat == "goggles":
        s.rect(x, hy + 1, 8, 1, "#3a2418")
        s.rect(x + 1, hy + 1, 2, 1, "#9ec060")
        s.rect(x + 5, hy + 1, 2, 1, "#9ec060")
        s.set(x + 6, hy + 1, "#e8f2f8")
    elif hat == "mitre":
        s.rect(x + 3, hy - 5, 2, 1, c)
        s.rect(x + 2, hy - 4, 4, 1, c)
        s.rect(x + 1, hy - 3, 6, 4, c)
        s.rect(x + 1, hy - 3, 1, 4, dk(c))
        s.rect(x, hy + 1, 8, 1, GOLD)
        s.rect(x + 3, hy - 3, 2, 4, None)
        s.rect(x + 3, hy - 3, 1, 4, GOLD)
        s.rect(x + 2, hy - 2, 3, 1, GOLD)
        s.set(x + 4, hy - 3, c)
        s.set(x + 4, hy - 1, c)
        s.set(x + 4, hy, c)


def _weapon_rest(s: Sprite, spec: dict, hx: int, hy: int) -> None:
    w = spec["weapon"]
    if w == "sword":
        s.rect(hx + 1, hy - 1, 1, 3, WOOD)
        s.rect(hx, hy + 2, 3, 1, GOLD)
        s.rect(hx + 1, hy + 3, 1, 5, STEEL_HI)
        s.rect(hx + 2, hy + 3, 1, 4, STEEL)
    elif w == "dagger":
        s.set(hx + 1, hy + 2, GOLD)
        s.rect(hx + 1, hy + 3, 1, 2, STEEL_HI)
        s.set(hx + 2, hy + 3, STEEL)
    elif w in ("staff", "crystal"):
        top = spec.get("topper", GOLD)
        for y in range(hy - 14, hy + 8):
            if y > 28:
                break
            s.set(hx + 1, y, WOOD if (y % 5) else dk(WOOD))
        if w == "staff":
            s.rect(hx, hy - 17, 3, 3, top)
            s.set(hx + 1, hy - 17, lt(top))
            s.set(hx, hy - 15, dk(top))
        else:
            s.pts([(hx + 1, hy - 19), (hx, hy - 18), (hx + 2, hy - 18), (hx, hy - 17), (hx + 2, hy - 17), (hx + 1, hy - 16)], top)
            s.pts([(hx + 1, hy - 18), (hx + 1, hy - 17)], lt(top))
            s.set(hx + 1, hy - 15, GOLD)
    elif w == "spear":
        for y in range(hy - 16, min(29, hy + 8)):
            s.set(hx + 1, y, WOOD if y % 6 else dk(WOOD))
        s.pts([(hx + 1, hy - 20), (hx, hy - 19), (hx + 1, hy - 19), (hx + 2, hy - 19), (hx + 1, hy - 18), (hx + 1, hy - 17)], STEEL)
        s.pts([(hx + 1, hy - 19), (hx + 1, hy - 20)], STEEL_HI)
        s.set(hx, hy - 16, "#8a2030")
    elif w == "hammer":
        s.rect(hx + 1, hy + 2, 1, 4, WOOD)
        s.rect(hx, hy + 6, 3, 2, STEEL)
        s.set(hx + 2, hy + 6, STEEL_HI)
        s.set(hx, hy + 7, dk(STEEL))
    elif w == "shovel":
        for y in range(hy - 8, hy + 5):
            s.set(hx + 1, y, WOOD)
        s.rect(hx, hy - 9, 3, 1, WOOD)
        s.rect(hx, hy + 5, 3, 3, "#6a7480")
        s.set(hx + 2, hy + 5, STEEL)
        s.set(hx + 1, hy + 7, dk("#6a7480"))
    elif w == "rod":
        pts = [(hx + 1, hy - i) for i in range(1, 6)] + [(hx + 2, hy - i) for i in range(6, 11)] + [(hx + 3, hy - 11), (hx + 3, hy - 12)]
        s.pts(pts, "#6a5030")
        s.pts([(hx + 3, hy - 10), (hx + 3, hy - 9), (hx + 3, hy - 8)], "#c8d0c0")
        s.set(hx + 3, hy - 7, "#c44868")
    elif w == "broom":
        for y in range(hy - 9, hy + 5):
            s.set(hx + 1, y, WOOD)
        s.rect(hx, hy + 5, 3, 3, "#c4a15a")
        s.set(hx + 1, hy + 5, "#8a6840")
        s.set(hx, hy + 7, "#8a6840")
        s.set(hx + 2, hy + 7, "#e0c080")
    elif w == "cane":
        s.set(hx + 1, hy - 1, GOLD)
        for y in range(hy + 2, 29):
            s.set(hx + 1, y, "#1a1014")
    elif w == "mace":
        s.rect(hx + 1, hy + 2, 1, 4, WOOD)
        s.rect(hx, hy + 6, 3, 2, GOLD)
        s.set(hx + 2, hy + 6, GOLD_HI)
    elif w == "scythe":
        for y in range(hy - 12, min(29, hy + 6)):
            s.set(hx + 1, y, "#3a2418")
        s.pts([(hx + 1, hy - 13), (hx, hy - 13), (hx - 1, hy - 13), (hx - 2, hy - 12), (hx - 3, hy - 11)], STEEL)
        s.pts([(hx, hy - 12), (hx - 1, hy - 12)], STEEL_HI)
    elif w == "orb":
        s.rect(hx, hy - 2, 2, 2, "#9ec4e0")
        s.set(hx + 1, hy - 2, "#e8f2f8")
        s.set(hx, hy - 1, "#7aa0c0")
    elif w == "crossbow":
        s.rect(hx - 1, hy + 2, 4, 1, WOOD)
        s.pts([(hx - 2, hy + 3), (hx + 3, hy + 3)], dk(WOOD))
        s.set(hx + 1, hy + 1, STEEL)
    elif w == "claw":
        s.pts([(hx, hy + 2), (hx + 1, hy + 2)], BONE)


ITEMS = {
    "mug": lambda s, x, y: (s.rect(x + 1, y - 2, 3, 3, "#8a6848"), s.rect(x + 1, y - 2, 3, 1, "#f4f0ea"), s.set(x + 4, y - 1, "#6a5030"), s.set(x + 1, y, "#6a5030")),
    "ledger": lambda s, x, y: (s.rect(x, y - 2, 3, 3, "#6a2030"), s.rect(x + 2, y - 2, 1, 3, "#f0e2c8"), s.set(x, y, "#4a1020")),
    "coins": lambda s, x, y: (s.rect(x, y + 1, 3, 3, "#c4a15a"), s.set(x + 1, y + 1, "#6a5030"), s.set(x + 2, y + 2, GOLD_HI), s.set(x, y + 3, "#8a7048")),
    "cards": lambda s, x, y: (s.rect(x + 1, y - 2, 2, 3, "#f4f0e8"), s.set(x + 1, y - 1, "#a02030"), s.set(x + 2, y - 2, "#d8d0c0")),
    "scissors": lambda s, x, y: (s.pts([(x + 2, y - 1), (x + 3, y - 2)], STEEL_HI), s.set(x + 2, y - 2, STEEL), s.set(x + 1, y + 2, "#c44868")),
    "flask": lambda s, x, y: (s.set(x + 1, y - 3, "#e6e0d4"), s.rect(x, y - 2, 3, 2, "#9ec060"), s.set(x + 2, y - 2, "#e8f2f8"), s.set(x, y - 1, "#6a8a32")),
    "lantern": lambda s, x, y: (s.rect(x, y + 2, 3, 4, "#3a3030"), s.set(x + 1, y + 3, GOLD_HI), s.set(x + 1, y + 4, "#e07a2f"), s.set(x + 1, y + 2, STEEL)),
    "spyglass": lambda s, x, y: (s.rect(x + 1, y + 2, 1, 3, "#c4b48a"), s.set(x + 1, y + 5, "#6a5a40")),
}


def _back_layer(s: Sprite, spec: dict, ux: int, uy: int, pose: str) -> None:
    ay = 14 + uy
    x0, x1, _, _ = BUILD[spec["build"]]
    x0 += ux
    x1 += ux
    if spec["cape"]:
        c = spec["cape"]
        flare = {"walk0": 1, "walk2": -1, "swing1": -1, "swing2": -1, "cast1": 0}.get(pose, 0)
        long = 25 if spec["cape"] and "collar" in spec["extra"] else 23
        for y in range(ay, long + 1):
            spread = min(3, (y - ay) // 3)
            left = x0 - 1 - spread + (flare if y > ay + 6 else 0)
            right = x1 + 1 + spread + (flare if y > ay + 6 else 0)
            s.rect(left, y, right - left + 1, 1, c)
            s.set(left, y, dk(c))
        if spec["capein"]:
            for y in range(ay + 4, long + 1):
                spread = min(3, (y - ay) // 3)
                s.set(x1 + 1 + spread + (flare if y > ay + 6 else 0), y, spec["capein"])
        # tattered hem
        for i, xx in enumerate(range(x0 - 4, x1 + 5)):
            if i % 3 == 1:
                s.set(xx + flare, long, None)
    if "collar" in spec["extra"]:
        hy = 5 + uy
        c = spec["cape"]
        s.rect(x0 - 2, hy + 3, 2, ay - hy - 2, c)
        s.rect(x1 + 1, hy + 3, 2, ay - hy - 2, c)
        s.rect(x0 - 2, hy + 4, 1, ay - hy - 3, spec["capein"])
        s.rect(x1 + 2, hy + 4, 1, ay - hy - 3, spec["capein"])
        s.set(x0 - 2, hy + 2, c)
        s.set(x1 + 2, hy + 2, c)
    if spec["back"] == "pack":
        s.rect(x0 - 2, ay - 3, w := (x1 - x0 + 5), 11, "#6a5040")
        s.rect(x0 - 2, ay - 3, w, 1, "#8a6858")
        s.rect(x0 - 1, ay - 5, w - 2, 2, "#c4a15a")
        s.set(x0 - 1, ay - 5, "#8a7048")
        s.rect(x0 - 2, ay - 3, 1, 11, "#4a382c")
        s.set(x1 + 2, ay + 2, "#c4a050")
        s.set(x1 + 2, ay + 3, "#e0c060")
    elif spec["back"] == "sack":
        s.rect(x1 - 1, ay - 5, 5, 7, "#c4a050")
        s.rect(x1, ay - 6, 3, 1, "#c4a050")
        s.rect(x1 - 1, ay + 1, 5, 1, "#8a7048")
        s.set(x1 + 2, ay - 4, lt("#c4a050"))
        s.set(x1, ay - 6, "#6a5030")
        s.set(x1 + 1, ay - 3, GOLD_HI)
    elif spec["back"] == "quiver":
        s.rect(x0 - 2, ay - 5, 2, 9, "#5a3828")
        s.pts([(x0 - 2, ay - 6), (x0 - 1, ay - 7)], "#c43838")
        s.set(x0 - 2, ay - 5, "#8a5840")


def _details(s: Sprite, spec: dict, x0: int, x1: int, ux: int, uy: int, sash: str | None, pose: str = "stand") -> None:
    ay = 14 + uy
    ex = spec["extra"]
    tr = spec["trim"]
    if spec["apron"]:
        a = spec["apron"]
        bottom = 24 if not spec["robe"] else 25
        s.rect(x0 + 1, ay + 3, x1 - x0 - 1, bottom - ay - 2, a)
        s.rect(6 + ux, ay + 1, 4, 2, a)
        s.set(x0 + 1, ay + 3, dk(a))
        s.rect(x0 + 1, bottom, x1 - x0 - 1, 1, dk(a))
        s.rect(7 + ux, ay + 6, 2, 1, dk(a))  # pocket
        s.set(x1 - 1, ay + 4, lt(a))
        if "stains" in ex:
            s.pts([(6 + ux, ay + 8), (9 + ux, ay + 5)], "#6a8a32")
    if "tabard" in ex:
        s.rect(6 + ux, ay + 1, 4, 9, tr)
        s.rect(7 + ux, ay + 3, 2, 3, spec["cloth"])
        s.set(6 + ux, ay + 1, dk(tr))
    if "pauldrons" in ex:
        s.rect(x0 - 2, ay - 1, 3, 3, STEEL)
        s.rect(x1, ay - 1, 3, 3, STEEL)
        s.rect(x1 + 1, ay - 1, 1, 1, STEEL_HI)
        s.rect(x0 - 2, ay + 1, 3, 1, dk(STEEL))
        s.rect(x1, ay + 1, 3, 1, dk(STEEL))
        s.rect(6 + ux, ay + 2, 4, 5, spec["cloth"])
        s.rect(7 + ux, ay + 3, 2, 2, tr)
    if "vest" in ex:
        s.rect(6 + ux, ay + 1, 4, 5, "#f0e2c8")
        s.rect(7 + ux, ay + 1, 2, 5, dk(spec["cloth"]))
        s.pts([(7 + ux, ay + 3), (7 + ux, ay + 5)], GOLD)
    if "jabot" in ex:
        s.rect(7 + ux, ay, 2, 3, "#f0e2c8")
        s.set(7 + ux, ay + 2, "#d8d0c0")
    if "bowtie" in ex:
        s.pts([(6 + ux, ay), (9 + ux, ay)], "#1a1a1a")
        s.pts([(7 + ux, ay), (8 + ux, ay)], "#6a1828")
    if "stole" in ex:
        s.rect(6 + ux, ay, 1, 11, GOLD)
        s.rect(9 + ux, ay, 1, 11, GOLD)
        s.set(6 + ux, ay + 10, "#c4a050")
        s.set(9 + ux, ay + 10, "#c4a050")
    if "badge" in ex:
        s.rect(9 + ux, ay + 2, 2, 2, GOLD)
        s.set(10 + ux, ay + 2, GOLD_HI)
    if "bandolier" in ex:
        for i in range(x1 - x0 + 1):
            s.set(x0 + i, ay + 1 + (i * 5) // max(1, x1 - x0), "#2a241c")
        s.pts([(x0 + 2, ay + 2), (x0 + 5, ay + 4)], STEEL_HI)
    if "scarf" in ex:
        s.rect(5 + ux, ay, 6, 2, "#8a2030")
        s.pts([(x1 + 1, ay + 1), (x1 + 2, ay + 2)], "#8a2030")
        s.set(6 + ux, ay + 1, "#6a1828")
    if "tape" in ex:
        s.rect(6 + ux, ay, 1, 6, "#e0c060")
        s.rect(9 + ux, ay, 1, 4, "#e0c060")
        s.set(6 + ux, ay + 3, "#8a7048")
    if "shawl" in ex:
        s.rect(x0 - 1, ay, x1 - x0 + 3, 3, "#c4b48a")
        s.rect(x0 - 1, ay + 2, x1 - x0 + 3, 1, "#a89470")
        s.rect(7 + ux, ay + 3, 2, 1, "#a89470")
    if "stars" in ex:
        s.pts([(x0 + 1, ay + 4), (x1 - 1, ay + 8), (x0 + 2, 23)], GOLD_HI)
    if "runes" in ex:
        s.pts([(x0 + 1, 24), (x0 + 3, 23), (x1 - 2, 24), (x1, 23)], "#c4b4e0")
    if "wraith" in ex:
        # no feet: a torn hem that drifts
        s.clear(0, 25, 16, 4)
        drift = {"walk0": 1, "walk2": -1, "swing1": 1, "swing2": 1}.get(pose, 0)
        for i, xx in enumerate(range(x0 - 2, x1 + 3)):
            depth = (i * 5 + uy + drift) % 3
            s.rect(xx + drift, 25, 1, 1 + depth, spec["cloth"] if i % 2 else dk(spec["cloth"]))
    if "ribs" in ex:
        for yy in (ay + 1, ay + 3, ay + 5):
            s.rect(x0 + 1, yy, x1 - x0 - 1, 1, "#3a2830")
        s.rect(7 + ux, ay, 2, 7, spec["cloth"])  # the spine
        s.set(7 + ux, ay + 3, dk(spec["cloth"]))
        s.rect(x0, ay + 7, x1 - x0 + 1, 1, "#3a2830")
    if "torn" in ex:
        for xx in (x0 + 1, x0 + 4, x1 - 1):
            s.set(xx, 21 + uy, spec["skin"])
        s.set(x1 - 1, ay + 3, spec["skin"])
        s.set(x0 + 2, ay + 5, dk(spec["cloth"]))
    if "wraps" in ex:
        # bandage seams: clean diagonal bands, not speckle
        for yy in range(ay + 1, 22 + uy, 3):
            for i in range(x1 - x0 + 1):
                s.set(x0 + i, yy + (i // 4), dk(spec["cloth"]))
        s.set(x1 - 1, ay + 2, lt(spec["cloth"]) if lt(spec["cloth"]) != spec["cloth"] else "#fff8ee")
    if "furchest" in ex:
        s.rect(6 + ux, ay + 1, 4, 5, lt(spec["cloth"]))
        s.pts([(6 + ux, ay + 5), (9 + ux, ay + 5), (7 + ux, ay + 6)], lt(spec["cloth"]))
        s.set(7 + ux, ay + 2, lt(spec["cloth"], 2))
    if "loin" in ex:
        s.rect(x0 + 1, 20 + uy, x1 - x0 - 1, 3, spec["trim"])
        s.set(x0 + 2, 22 + uy, None)
        s.set(x1 - 2, 22 + uy, None)
        s.rect(x0 + 1, 20 + uy, x1 - x0 - 1, 1, dk(spec["trim"]))
    if "bolts" in ex:
        hy = 5 + uy + spec.get("hunch", 0)
        s.pts([(FACE_X + ux - 1, hy + 6), (FACE_X + ux + 8, hy + 6)], STEEL)
    if sash:
        for i in range(x1 - x0 + 1):
            yy = ay + 1 + (i * 6) // max(1, x1 - x0)
            s.set(x0 + i, yy, lt(sash))
            s.set(x0 + i, yy + 1, sash)
        s.rect(x1 - 1, ay + 7, 2, 2, sash)
        s.set(x1 - 1, ay + 7, lt(sash))
        s.set(x1, ay + 9, dk(sash))


def _smear(s: Sprite, cx: float, cy: float, rx: float, ry: float, a0: float, a1: float, thick: int = 2, only_empty: bool = True) -> None:
    for step in range(64):
        t = a0 + (a1 - a0) * step / 63
        for k in range(thick):
            x = round(cx + (rx - k) * math.cos(math.radians(t)))
            y = round(cy + (ry - k) * math.sin(math.radians(t)))
            c = SMEAR if k == 0 else SMEAR_MID
            if only_empty:
                s.empty(x, y, c)
            else:
                s.set(x, y, c)


def _glow(s: Sprite, x: int, y: int, size: int, core: str, ring: str) -> None:
    if size == 1:
        s.set(x, y, core)
        s.set(x + 1, y, ring)
        s.set(x, y + 1, ring)
    elif size == 2:
        s.pts([(x, y - 1), (x - 1, y), (x + 1, y), (x, y + 1)], ring)
        s.set(x, y, core)
    else:
        s.pts([(x, y - 2), (x - 2, y), (x + 2, y), (x, y + 2)], ring)
        s.pts([(x, y - 1), (x - 1, y), (x + 1, y), (x, y + 1)], core)
        s.set(x, y, WHITE_HOT)


SCATTER = [(1, 6), (14, 3), (3, 2), (13, 11), (15, 8), (0, 12), (11, 0)]


def _scatter(s: Sprite, core: str, ring: str, seed: str, oy: int = 0) -> None:
    r = _seed(seed)
    pts = SCATTER[:]
    r.shuffle(pts)
    for i, (x, y) in enumerate(pts[:5]):
        s.empty(x, min(31, y + oy), core if i % 2 == 0 else ring)


def _swing_weapon(s: Sprite, spec: dict, pose: str, hx: int, hy: int) -> None:
    w = spec["weapon"]
    long = w in ("staff", "crystal", "spear", "shovel", "broom", "scythe", "rod", "cane")
    heavy = w in ("hammer", "mace")
    blade = STEEL_HI
    edge = STEEL
    if w in ("staff", "crystal", "broom", "rod", "cane", "shovel", "spear", "scythe"):
        blade = WOOD
        edge = dk(WOOD)
    if pose == "swing0":
        # held high over the right shoulder, cocked back
        n = 7 if long else 5 if w in ("sword",) else 3 if heavy else 2
        if w in ("none", "claw", "orb", "crossbow"):
            n = 0
        for i in range(1, n + 1):
            s.set(hx + 1 - (i // 4), hy - i, blade)
            if w == "sword":
                s.set(hx + 2 - (i // 4), hy - i, edge)
        if w == "sword":
            s.rect(hx, hy - 1, 3, 1, GOLD)
        if heavy:
            s.rect(hx, hy - 5, 3, 2, STEEL if w == "hammer" else GOLD)
        if w in ("spear",):
            s.pts([(hx, hy - 8), (hx, hy - 9), (hx - 1, hy - 8)], STEEL)
        if w == "shovel":
            s.rect(hx - 1, hy - 9, 3, 2, "#6a7480")
        if w == "scythe":
            s.pts([(hx, hy - 8), (hx - 1, hy - 8), (hx - 2, hy - 7)], STEEL_HI)
        if w == "broom":
            s.rect(hx - 1, hy - 9, 3, 2, "#c4a15a")
        if w in ("staff", "crystal"):
            s.rect(hx - 1, hy - 9, 3, 2, spec.get("topper", GOLD))
        if w in ("dagger", "claw", "none", "orb", "crossbow"):
            s.set(hx + 1, hy - 1, STEEL_HI if w == "dagger" else BONE if w == "claw" else None)
    elif pose == "swing1":
        # the hit: the weapon comes down in front, the arc trails behind it
        if w in ("none", "orb", "crossbow"):
            _smear(s, 11, 13, 4, 7, -80, 40, 1)
            return
        if w == "claw":
            for k in range(3):
                s.pts([(hx - 1 + k, hy - 3 + k * 0), (hx + k, hy - 2), (hx + 1 + k, hy - 1)], SMEAR)
            _smear(s, 10, 13, 5, 8, -80, 30, 1)
            return
        length = 6 if long else 5 if w == "sword" else 2
        for i in range(1, length + 1):
            bx = hx + 1 + (i + 1) // 2
            s.set(bx, hy + 1 + i, blade)
            if w == "sword":
                s.set(bx - 1, hy + 1 + i, edge)
        if w == "sword":
            s.pts([(hx, hy + 1), (hx + 2, hy + 1)], GOLD)
        if heavy:
            s.rect(hx + 1, hy + 3, 3, 2, STEEL if w == "hammer" else GOLD)
        if w == "shovel":
            s.rect(hx + 1, hy + 6, 3, 2, "#6a7480")
        _smear(s, 9, 14, 6, 11, -95, 35, 2)
    elif pose == "swing2":
        # follow-through: low and across the body, a thin tail of the arc left behind
        length = 5 if long else 4 if w == "sword" else 2 if w not in ("none", "claw", "orb", "crossbow") else 0
        for i in range(1, length + 1):
            s.set(hx - i, hy + 1 + i // 2 + (i // 3), blade)
            if w == "sword":
                s.set(hx - i, hy + 2 + i // 2 + (i // 3), edge)
        if heavy:
            s.rect(hx - 3, hy + 2, 3, 2, STEEL if w == "hammer" else GOLD)
        _smear(s, 9, 14, 6, 10, 40, 75, 1)


def human(role: str, pose: str | int = "stand", rank: str = "mob", sash: str | None = None, variant: int = 0) -> Sprite:
    """A 3/4 person in one of the eleven poses."""
    if isinstance(pose, int):
        pose = "walk0" if pose else "stand"
    spec = folk_spec(role, variant)
    if rank == "rare":
        spec = dict(spec)
        spec["cloth"] = RARE_CLOTH.get(role, "#2a6a48")
    if rank == "boss":
        spec = dict(spec)
        spec["trim"] = GOLD
    return _person(spec, pose, rank, sash, role)


RARE_CLOTH = {"witch": "#2a6a48", "vampire": "#2a3a6a"}


def _person(spec: dict, pose: str, rank: str, sash: str | None, seed: str) -> Sprite:
    ux, uy, hdy, legs, larm, rarm = BODY[pose]
    arms = spec.get("arms") or {}
    if pose in arms:
        larm, rarm = arms[pose]
    hdy += spec.get("hunch", 0)
    ux += (spec.get("lean") or {}).get(pose, 0)
    uy += spec.get("short", 0)
    staffy = spec["weapon"] in ("staff", "crystal", "scythe")
    if staffy and pose == "cast0":
        rarm = "down"
    if staffy and pose == "cast2":
        rarm = "down"
    s = Sprite()
    _back_layer(s, spec, ux, uy, pose)
    _legs(s, spec, legs, uy, spec["robe"])
    x0, x1 = _torso(s, spec, ux, uy, legs, pose)
    _details(s, spec, x0, x1, ux, uy, sash, pose)
    _, _, alx, arx = BUILD[spec["build"]]
    ay = 14 + uy
    lhx, lhy = _arm(s, spec, larm, alx + ux, ay, True)
    if "shield" in spec["extra"]:
        sx, sy = lhx - 2, lhy - 4
        face = "#6a2030"
        s.rect(sx, sy, 5, 6, face)
        s.rect(sx + 1, sy + 6, 3, 1, face)
        s.set(sx + 2, sy + 7, STEEL)
        s.rect(sx, sy, 5, 1, STEEL_HI)
        s.rect(sx, sy, 1, 6, STEEL)
        s.rect(sx + 4, sy, 1, 6, dk(STEEL))
        s.rect(sx + 1, sy + 6, 1, 1, STEEL)
        s.rect(sx + 3, sy + 6, 1, 1, dk(STEEL))
        s.rect(sx + 2, sy + 1, 1, 5, GOLD)
        s.rect(sx + 1, sy + 2, 3, 1, GOLD)
        s.set(sx + 3, sy + 1, lt(face))
    hx = ux
    hy = 5 + uy + hdy
    _head(s, spec, hx, hy, pose)
    _hair(s, spec, hx, hy)
    _beard(s, spec, hx, hy, long=role_long_beard(spec))
    if "mask" in spec["extra"]:
        s.rect(FACE_X + hx + 1, hy + 5, 6, 3, spec["hatc"])
        s.set(FACE_X + hx + 5, hy + 5, lt(spec["hatc"]))
    gem = "gem" in spec["extra"]
    _hat(s, spec, hx, hy)
    if spec["hat"] in ("hood", "cowl"):
        # repaint the face inside the hood, a shade deeper at the top
        face = Sprite()
        _head(face, spec, hx, hy, pose)
        _beard(face, spec, hx, hy, long=role_long_beard(spec))
        if "mask" in spec["extra"]:
            face.rect(FACE_X + hx + 1, hy + 5, 6, 3, spec["hatc"])
            face.set(FACE_X + hx + 5, hy + 5, lt(spec["hatc"]))
        for yy in range(hy + 2, hy + 8):
            for xx in range(FACE_X + hx + 1, FACE_X + hx + 7):
                if 0 <= yy < 32 and face.get(xx, yy):
                    s.p[yy][xx] = face.p[yy][xx]
        s.rect(FACE_X + hx + 1, hy + 2, 6, 1, dk(spec["skin"]) if "faceless" not in spec["extra"] else "#101820")
        if "faceless" not in spec["extra"] and pose != "idle":
            s.set(FACE_X + hx + 2, hy + 4, spec["eyes"])
            s.set(FACE_X + hx + 5, hy + 4, spec["eyes"])
    if gem:
        s.rect(FACE_X + hx + 3, hy - 1, 2, 2, "#9ec4e0")
        s.set(FACE_X + hx + 4, hy - 1, "#e8f2f8")
        s.pts([(FACE_X + hx + 2, hy), (FACE_X + hx + 5, hy)], GOLD)
    if "specs" in spec["extra"]:
        s.pts([(FACE_X + hx + 3, hy + 4), (FACE_X + hx + 4, hy + 4)], GOLD)
        s.pts([(FACE_X + hx + 1, hy + 4), (FACE_X + hx + 6, hy + 4)], GOLD)
    rhx, rhy = _arm(s, spec, rarm, arx + ux, ay, False)
    if "dagger2" in spec["extra"] and not pose.startswith("cast"):
        s.set(lhx, lhy + 2, STEEL_HI)
        s.set(lhx, lhy + 3, STEEL)
    core, ring = spec["glow"]
    if pose in ("stand", "idle", "walk0", "walk1", "walk2"):
        _weapon_rest(s, spec, rhx, rhy)
        if spec["item"]:
            ITEMS[spec["item"]](s, rhx, rhy)
    elif pose.startswith("swing"):
        _swing_weapon(s, spec, pose, rhx, rhy)
    elif staffy:
        _weapon_rest(s, spec, rhx, rhy)
    _rank_marks(s, spec, rank, hx, hy, x0, x1, ay)
    s.outline()
    # light and trails are drawn after the outline so they read as motion, not as a body
    if pose == "cast0":
        if staffy:
            tx, ty = rhx + 1, rhy - 16
            _glow(s, tx, ty, 1, core, ring)
            _glow(s, lhx + 1, lhy - 1, 1, core, ring)
        else:
            _glow(s, 7 + ux, lhy - 1, 1, core, ring)
    elif pose == "cast1":
        if staffy:
            _glow(s, rhx + 1, max(2, rhy - 17), 3, core, ring)
        else:
            _glow(s, rhx + 1, max(2, rhy - 2), 3, core, ring)
            s.empty(lhx, lhy - 1, ring)
    elif pose == "cast2":
        _scatter(s, core, ring, seed)
    return s


def role_long_beard(spec: dict) -> bool:
    return spec.get("robe") and spec.get("beard") is not None


def _crown(s: Sprite, top: int, cx: int = 8) -> None:
    y = max(0, top - 2)
    s.rect(cx - 3, y + 1, 6, 1, GOLD)
    s.pts([(cx - 3, y), (cx - 1, y), (cx, y), (cx + 2, y)], GOLD)
    s.set(cx - 1, y + 1, "#a02030")
    s.set(cx, y + 1, GOLD_HI)


def _top_row(s: Sprite, x0: int = 4, x1: int = 11) -> int:
    for y in range(32):
        if any(s.p[y][x] for x in range(x0, x1 + 1)):
            return y
    return 5


def _rank_marks(s: Sprite, spec: dict | None, rank: str, hx: int, hy: int, x0: int, x1: int, ay: int) -> None:
    if rank == "boss":
        _crown(s, _top_row(s), 8 + hx)
        s.pts([(x0 - 1, ay), (x1 + 1, ay)], GOLD)
        s.pts([(x0 - 1, ay - 1), (x1 + 1, ay - 1)], GOLD_HI)
    elif rank == "mini":
        # marked remnant: an iron brow band and a rust-red sash
        s.rect(FACE_X + hx, hy + 2, 8, 1, STEEL)
        s.set(FACE_X + hx + 5, hy + 2, STEEL_HI)
        for i in range(x1 - x0 + 1):
            yy = ay + 1 + (i * 6) // max(1, x1 - x0)
            s.set(x1 - i, yy, MINI_RED)
    elif rank == "rare":
        _affix(s)


def _affix(s: Sprite) -> None:
    """A floating gold star, drawn before the outline so it holds its own shape."""
    s.pts([(2, 1), (1, 2), (3, 2), (2, 3)], GOLD)
    s.set(2, 2, WHITE_HOT)
    s.set(14, 2, GOLD_HI)


# ---------------------------------------------------------------- creatures


# Humanoid families reuse the person skeleton with their own head and parts.
# The rest are drawn from scratch per pose.


def _head_skull(s: Sprite, spec: dict, x: int, hy: int, pose: str) -> None:
    b = spec["skin"]
    s.rect(x, hy, 8, 6, b)
    s.rect(x + 1, hy - 1, 6, 1, b)
    s.rect(x + 1, hy + 6, 6, 2, b)
    s.set(x, hy, None)
    s.set(x + 7, hy, None)
    s.rect(x, hy + 1, 1, 4, dk(b))
    s.rect(x + 4, hy - 1, 2, 2, lt(b) if lt(b) != b else "#ffffff")
    s.rect(x + 1, hy + 2, 2, 2, INK)
    s.rect(x + 5, hy + 2, 2, 2, INK)
    if pose != "idle":
        s.set(x + 2, hy + 3, spec["eyes"])
        s.set(x + 5, hy + 3, spec["eyes"])
    s.set(x + 3, hy + 4, "#3a2830")
    s.set(x + 4, hy + 4, "#3a2830")
    jaw = 1 if pose in ("swing1", "cast1", "idle") else 0
    s.rect(x + 1, hy + 5, 6, 1, dk(b))
    s.pts([(x + 2, hy + 6 + jaw), (x + 4, hy + 6 + jaw), (x + 6, hy + 6 + jaw)], "#3a2830")
    if jaw:
        s.rect(x + 1, hy + 6, 6, 1, "#3a2830")
        s.rect(x + 1, hy + 7, 6, 1, b)
        s.pts([(x + 2, hy + 7), (x + 4, hy + 7)], "#3a2830")


def _head_pumpkin(s: Sprite, spec: dict, x: int, hy: int, pose: str) -> None:
    o = spec["skin"]
    s.rect(x - 1, hy + 1, 10, 6, o)
    s.rect(x, hy, 8, 8, o)
    s.rect(x + 2, hy - 1, 4, 1, o)
    s.pts([(x + 1, hy + 1), (x + 1, hy + 6)], dk(o))
    s.rect(x - 1, hy + 2, 1, 4, dk(o))
    s.rect(x + 2, hy, 1, 7, dk(o))
    s.rect(x + 5, hy, 1, 7, dk(o))
    s.rect(x + 6, hy + 1, 1, 2, lt(o))
    s.set(x + 3, hy, lt(o))
    s.rect(x + 3, hy - 3, 2, 2, "#2a4a20")
    s.set(x + 5, hy - 3, "#6a8a32")
    fire = "#fff8e0" if pose in ("idle", "cast1") else GOLD_HI
    s.pts([(x + 1, hy + 3), (x + 2, hy + 3), (x + 2, hy + 2)], fire)
    s.pts([(x + 5, hy + 3), (x + 6, hy + 3), (x + 5, hy + 2)], fire)
    s.rect(x + 1, hy + 5, 6, 1, fire)
    s.pts([(x + 2, hy + 5), (x + 5, hy + 5)], dk(o))
    s.rect(x + 3, hy + 6, 2, 1, "#e0a040")
    if pose in ("swing1", "cast1"):
        s.rect(x + 2, hy + 6, 4, 1, fire)


def _head_wolf(s: Sprite, spec: dict, x: int, hy: int, pose: str) -> None:
    f = spec["skin"]
    s.rect(x, hy + 1, 8, 6, f)
    s.rect(x + 1, hy, 6, 1, f)
    s.pts([(x, hy - 2), (x, hy - 1), (x, hy), (x + 1, hy - 1), (x + 7, hy - 2), (x + 7, hy - 1), (x + 7, hy), (x + 6, hy - 1)], f)
    s.pts([(x + 1, hy), (x + 6, hy)], "#8a5840")  # inner ear
    s.rect(x, hy + 1, 1, 5, dk(f))
    s.pts([(x - 1, hy + 4), (x - 1, hy + 5), (x + 8, hy + 4), (x + 8, hy + 5)], f)  # cheek ruff
    s.rect(x + 5, hy + 1, 2, 1, lt(f))
    muzzle = lt(f, 2)
    s.rect(x + 2, hy + 4, 4, 3, muzzle)
    s.rect(x + 3, hy + 7, 2, 1, muzzle)
    s.rect(x + 3, hy + 4, 2, 1, INK)  # nose
    s.pts([(x + 1, hy + 2), (x + 6, hy + 2)], dk(f, 2))  # brow
    s.pts([(x + 1, hy + 3), (x + 6, hy + 3)], GOLD_HI if pose != "idle" else dk(f))
    s.pts([(x + 2, hy + 3), (x + 5, hy + 3)], INK)
    if pose in ("swing1", "cast1", "swing0"):
        s.rect(x + 2, hy + 6, 4, 2, "#6a2030")
        s.pts([(x + 2, hy + 6), (x + 5, hy + 6)], BONE)
    else:
        s.rect(x + 3, hy + 6, 2, 1, dk(muzzle))
        s.pts([(x + 2, hy + 7), (x + 5, hy + 7)], BONE)


def _head_mummy(s: Sprite, spec: dict, x: int, hy: int, pose: str) -> None:
    b = spec["skin"]
    s.rect(x, hy, 8, 8, b)
    s.set(x, hy, None)
    s.set(x + 7, hy, None)
    s.rect(x, hy + 1, 1, 6, dk(b))
    for i in range(8):
        s.set(x + i, hy + 1 + (i // 3), dk(b))
        s.set(x + i, hy + 6 - (i // 4), dk(b))
    s.rect(x + 1, hy + 3, 6, 2, "#3a2830")
    s.set(x + 2, hy + 3, INK)
    s.set(x + 5, hy + 3, GOLD_HI if pose != "idle" else "#e0a040")
    s.set(x + 5, hy + 4, "#e07a2f")
    s.set(x + 6, hy + 1, lt(b))
    flap = {"walk0": 0, "walk1": 1, "walk2": 2, "swing1": 2, "swing2": 2}.get(pose, 1)
    s.pts([(x + 8, hy + 2), (x + 9, hy + 2 + flap // 2), (x + 10, hy + 2 + flap)], dk(b))


def _head_goblin(s: Sprite, spec: dict, x: int, hy: int, pose: str) -> None:
    g = spec["skin"]
    s.rect(x, hy, 8, 7, g)
    s.set(x, hy, None)
    s.set(x + 7, hy, None)
    s.pts([(x - 1, hy + 2), (x - 1, hy + 3), (x - 2, hy + 2), (x - 3, hy + 1)], g)
    s.pts([(x + 8, hy + 2), (x + 8, hy + 3), (x + 9, hy + 2), (x + 10, hy + 1)], g)
    s.pts([(x - 2, hy + 3), (x + 9, hy + 3)], dk(g))
    s.rect(x, hy + 1, 1, 5, dk(g))
    s.set(x + 6, hy + 1, lt(g))
    s.rect(x + 1, hy + 2, 2, 1, dk(g, 2))
    s.rect(x + 5, hy + 2, 2, 1, dk(g, 2))
    s.pts([(x + 2, hy + 3), (x + 5, hy + 3)], GOLD_HI if pose != "idle" else dk(g))
    s.pts([(x + 1, hy + 3), (x + 6, hy + 3)], INK)
    s.rect(x + 3, hy + 4, 2, 1, dk(g))  # nose
    s.rect(x + 2, hy + 5, 4, 1, INK)
    s.set(x + 3, hy + 5, BONE)
    s.set(x + 5, hy + 5, BONE)
    s.rect(x + 1, hy - 1, 6, 2, "#6a2030")  # a little cap
    s.set(x + 4, hy - 2, "#6a2030")
    s.set(x + 5, hy - 1, "#8f2d3a")


def _head_ghoul(s: Sprite, spec: dict, x: int, hy: int, pose: str) -> None:
    g = spec["skin"]
    s.rect(x + 1, hy, 6, 8, g)
    s.rect(x, hy + 1, 8, 5, g)
    s.pts([(x - 1, hy + 2), (x - 2, hy + 1), (x + 8, hy + 2), (x + 9, hy + 1)], g)
    s.rect(x, hy + 1, 1, 5, dk(g))
    s.set(x + 5, hy, lt(g))
    s.rect(x + 1, hy + 3, 2, 2, dk(g, 2))
    s.rect(x + 5, hy + 3, 2, 2, dk(g, 2))
    s.pts([(x + 2, hy + 4), (x + 5, hy + 4)], GOLD_HI if pose != "idle" else dk(g))
    wide = pose in ("swing1", "swing0", "cast1")
    s.rect(x + 1, hy + 6, 6, 1 + wide, INK)
    s.pts([(x + 1, hy + 6), (x + 3, hy + 6), (x + 5, hy + 6)], BONE)
    s.set(x + 4, hy + 5, dk(g))


HEADS = {
    "skull": _head_skull,
    "pumpkin": _head_pumpkin,
    "wolf": _head_wolf,
    "mummy": _head_mummy,
    "goblin": _head_goblin,
    "ghoul": _head_ghoul,
}

LURCH = {"walk0": 1, "walk1": 0, "walk2": -1, "idle": 1}

MONSTERS: dict[str, dict] = {
    "zombie": _p(cloth="#4a3828", trim="#6a5848", skin="#7a8a58", hair="#2a3024", hairstyle="tufts", pants="#3a3228",
                 eyes="#d8d0c0", mouth="gape", weapon="claw", extra=("torn",), lean=LURCH,
                 arms={"stand": ("down", "reach"), "idle": ("down", "reach"), "walk0": ("back", "reach"),
                       "walk1": ("down", "reach"), "walk2": ("fwd", "reach")},
                 glow=("#9ec060", "#6a8a32")),
    "skeleton": _p(build="slim", cloth=BONE, trim="#d8cfc0", skin=BONE, sleeve=BONE, head="skull", hairstyle="none",
                   pants="#d8cfc0", boot="#d8cfc0", eyes="#c43838", weapon="sword", belt="#6a5040",
                   extra=("ribs", "thinlegs", "bare", "loin"), glow=("#f4ecdc", "#c43838")),
    "ghoul": _p(build="broad", cloth="#6a4a30", trim="#4a3828", skin="#8a6a4a", sleeve="#8a6a4a", head="ghoul",
                hairstyle="none", pants="#6a4a30", boot="#6a4a30", weapon="claw", hunch=2,
                extra=("bare", "claws", "handclaws", "loin", "barearms"),
                lean={"walk0": 1, "walk2": 1, "walk1": 1, "swing1": 1},
                arms={"stand": ("long", "long"), "idle": ("long", "long"), "walk0": ("longback", "longfwd"),
                      "walk1": ("long", "long"), "walk2": ("longfwd", "longback"), "swing0": ("long", "raise"),
                      "swing1": ("longback", "claw"), "swing2": ("longback", "follow")},
                glow=("#f4e27a", "#8a6a4a")),
    "witch": _p(cloth="#3a1830", trim="#6a3a8a", skin="#8a9a70", hat="witchhat", hatc="#1a1218", hairstyle="long",
                hair="#4a4a50", weapon="broom", robe=True, mouth="hag", eyes="#f4e27a", glow=("#9ec060", "#6a3a8a")),
    "lantern": _p(build="slim", cloth="#3a2a44", trim="#2e1e38", skin="#e07a2f", head="pumpkin", hairstyle="none",
                  item="lantern", coat=True, pants="#2e1e38", gloves="#2e1e38", weapon="claw",
                  glow=(GOLD_HI, "#e07a2f")),
    "wolf": _p(build="broad", cloth="#5a4030", trim="#3a2418", skin="#5a4030", sleeve="#5a4030", head="wolf",
               hairstyle="none", pants="#5a4030", boot="#4a3424", weapon="claw", hunch=1,
               extra=("bare", "claws", "handclaws", "furchest", "barearms", "loin"),
               lean={"swing1": 2, "swing2": 2, "walk0": 1, "walk1": 1, "walk2": 1},
               arms={"swing1": ("back", "claw"), "stand": ("down", "down")},
               glow=("#f4e27a", "#8a5840")),
    "mummy": _p(cloth="#f0e2c0", trim="#c4b48a", skin="#f0e2c0", sleeve="#e6d2a2", head="mummy", hairstyle="none",
                pants="#e6d2a2", boot="#c4b48a", belt="#c4b48a", weapon="claw", extra=("wraps", "bare"),
                arms={"stand": ("reach", "reach"), "idle": ("reach", "down"), "walk0": ("reach", "reach"),
                      "walk1": ("reach", "reach"), "walk2": ("reach", "reach")},
                lean={"walk0": 1, "walk2": -1}, glow=(GOLD_HI, "#e07a2f"), metal="#c4b48a"),
    "vampire": _p(cloth="#8f2d3a", trim="#1a1014", skin=PALE, hairstyle="slick", hair="#1a1014", eyes="#a02030",
                  mouth="fangs", cape="#1a1014", capein="#6a1020", extra=("collar", "jabot", "handclaws"),
                  pants="#1a1014", weapon="claw", glow=("#f4ecdc", "#a02040")),
    "lich": _p(cloth="#3a4458", trim="#8eb4d8", skin=BONE, head="skull", hairstyle="none", eyes="#8eb4d8",
               robe=True, weapon="staff", topper="#8eb4d8", extra=("wraith", "lichcrown"), gloves=BONE,
               glow=("#e8eef8", "#8eb4d8")),
    "goblin": _p(build="slim", cloth="#6a2030", trim="#c4a050", skin="#6a8a32", head="goblin", hairstyle="none",
                 short=3, back="sack", weapon="dagger", pants="#3a3228", boot="#3a4a20", extra=("bare",),
                 glow=(GOLD_HI, "#c4a050")),
}

BOSS_DRESS: dict[str, dict] = {
    "zombie": {"build": "broad", "hairstyle": "flattop", "hair": "#1a1a1c", "cloth": "#2a2a2e", "extra": ("torn", "bolts")},
    "skeleton": {"cloth": "#c4b48a", "cape": "#6a2030", "extra": ("ribs", "thinlegs", "bare", "loin")},
    "ghoul": {"skin": "#6a5344", "sleeve": "#6a5344", "cape": "#2e1e38"},
    "witch": {"cape": "#1a1218", "hatc": "#140810", "trim": GOLD},
    "lantern": {"cape": "#6a2030", "capein": "#2a1018", "build": "mid"},
    "wolf": {"skin": "#4a3424", "sleeve": "#4a3424", "cloth": "#4a3424", "pants": "#4a3424", "cape": "#6a2030"},
    "mummy": {"cape": "#6a2030", "belt": GOLD, "trim": GOLD},
    "vampire": {"cloth": "#6a1020", "capein": "#a02030", "trim": GOLD},
    "lich": {"cape": "#1a1428", "cloth": "#2e1e38"},
    "goblin": {"cloth": "#8a2030"},
}

RARE_DRESS: dict[str, dict] = {
    "zombie": {"skin": "#9eb0c8", "cloth": "#2a3a6a"},
    "skeleton": {"skin": "#c4a15a", "cloth": "#c4a15a", "sleeve": "#c4a15a", "pants": "#a07850", "boot": "#a07850", "eyes": "#9ec060"},
    "ghoul": {"skin": "#6a8a32", "sleeve": "#6a8a32", "cloth": "#3a4a20", "pants": "#3a4a20", "boot": "#3a4a20"},
    "witch": {"cloth": "#2a4a38", "skin": "#c5d4e8"},
    "lantern": {"skin": "#9ec060", "cloth": "#1c3040"},
    "wolf": {"skin": "#8a9098", "sleeve": "#8a9098", "cloth": "#8a9098", "pants": "#8a9098", "boot": "#6a7480"},
    "mummy": {"skin": "#8eb4d8", "cloth": "#8eb4d8", "sleeve": "#7aa0c0", "pants": "#7aa0c0"},
    "vampire": {"cloth": "#2a3a6a", "capein": "#3a78a8", "eyes": "#9ec4e0"},
    "lich": {"cloth": "#2a4a38", "trim": "#9ec060", "topper": "#9ec060", "eyes": "#9ec060"},
    "goblin": {"skin": "#8eb4d8", "cloth": "#2a3a6a"},
}


def _monster_person(kind: str, pose: str, rank: str) -> Sprite:
    spec = dict(MONSTERS[kind])
    if rank == "boss":
        spec.update(BOSS_DRESS.get(kind, {}))
    elif rank == "rare":
        spec.update(RARE_DRESS.get(kind, {}))
    s = _person(spec, pose, rank, None, kind)
    return s


# ---- families without a person under them

# per pose: dx, dy of the body, and a phase 0..2 the family reads as it likes
MOTION = {
    "stand": (0, 0, 0),
    "idle": (0, 1, 1),
    "walk0": (0, 0, 0),
    "walk1": (0, -1, 1),
    "walk2": (0, 0, 2),
    "swing0": (-1, 1, 0),
    "swing1": (1, 0, 1),
    "swing2": (1, 1, 2),
    "cast0": (0, 1, 0),
    "cast1": (0, -1, 1),
    "cast2": (0, 0, 2),
}


def _ghost(s: Sprite, pose: str, C: dict, big: int) -> tuple[int, int]:
    dx, dy, ph = MOTION[pose]
    bob = {"stand": 0, "idle": -1, "walk0": -1, "walk1": -2, "walk2": -1, "swing0": 0, "swing1": 1, "swing2": 1,
           "cast0": 0, "cast1": -2, "cast2": -1}[pose]
    y0 = 9 + bob
    b, d, l = C["body"], dk(C["body"]), lt(C["body"])
    w = 10 + 2 * big
    x0 = 3 - big + dx
    s.rect(x0 + 2, y0, w - 4, 1, b)
    s.rect(x0 + 1, y0 + 1, w - 2, 2, b)
    s.rect(x0, y0 + 3, w, 14, b)
    s.rect(x0 - 1, y0 + 9, w + 2, 6, b)
    # the tail waves with the walk
    wave = [(0, 1, 2), (1, 2, 0), (2, 0, 1)][ph]
    for i in range(w + 2):
        depth = 2 + ((i // 2 + wave[i % 3]) % 3)
        s.rect(x0 - 1 + i, y0 + 15, 1, depth, b if (i // 2) % 2 == 0 else d)
    s.rect(x0, y0 + 3, 1, 12, d)
    s.rect(x0 + w - 3, y0 + 1, 2, 5, l)
    s.rect(x0 + 3, y0, 3, 1, l)
    # arms flutter up for the swing and the cast
    arm = {"swing0": -3, "swing1": 2, "swing2": 3, "cast0": -1, "cast1": -5, "cast2": 0}.get(pose, 1)
    s.rect(x0 - 2, y0 + 8 + arm, 2, 4, b)
    s.rect(x0 + w, y0 + 8 + (arm if pose != "swing1" else -4), 2, 4, b)
    s.set(x0 - 2, y0 + 11 + arm, d)
    ex = x0 + (w // 2) - 3
    s.rect(ex, y0 + 4, 2, 3, INK)
    s.rect(ex + 4, y0 + 4, 2, 3, INK)
    if pose != "idle":
        s.set(ex + 1, y0 + 4, C["eye"])
        s.set(ex + 5, y0 + 4, C["eye"])
    mouth = 3 if pose in ("swing1", "cast1") else 2 if pose in ("swing0", "cast0", "swing2") else 1
    s.rect(ex + 2, y0 + 8, 2, mouth, C["mouth"])
    return ex + 2, y0


def _bat(s: Sprite, pose: str, C: dict, big: int) -> tuple[int, int]:
    dx, _, _ = MOTION[pose]
    cy = {"stand": 14, "idle": 15, "walk0": 13, "walk1": 14, "walk2": 15, "swing0": 11, "swing1": 17, "swing2": 16,
          "cast0": 14, "cast1": 13, "cast2": 14}[pose]
    wing = {"stand": "mid", "idle": "fold", "walk0": "up", "walk1": "mid", "walk2": "down", "swing0": "up",
            "swing1": "back", "swing2": "down", "cast0": "fold", "cast1": "up", "cast2": "mid"}[pose]
    b, d, l, m = C["body"], dk(C["body"]), lt(C["body"]), C["wing"]
    cx = 7 + dx
    # wings first
    span = 7 + big
    for side in (-1, 1):
        for i in range(1, span + 1):
            x = cx + (i if side > 0 else 1 - i) + (0 if side > 0 else 0)
            if wing == "up":
                top, h = cy - 1 - (i * 5) // span, 2 + (i < span - 1)
            elif wing == "down":
                top, h = cy + (i * 4) // span, 2 + (i < span - 1)
            elif wing == "fold":
                if i > 3:
                    continue
                top, h = cy, 5
            elif wing == "back":
                top, h = cy - 2 - (i * 2) // span, 2
            else:
                top, h = cy, 3 - (i == span)
            xx = cx + 1 + i if side > 0 else cx - i
            s.rect(xx, top, 1, h, m)
            s.set(xx, top, l if i % 3 == 0 else m)
            if wing != "fold" and i % 3 == 2:
                s.set(xx, top + h, m)  # scalloped trailing edge
    s.rect(cx - 1, cy - 1, 4, 6, b)
    s.rect(cx - 2, cy, 6, 4, b)
    s.pts([(cx - 1, cy - 3), (cx - 1, cy - 2), (cx + 2, cy - 3), (cx + 2, cy - 2)], b)  # ears
    s.rect(cx - 2, cy, 1, 4, d)
    s.set(cx + 2, cy, l)
    s.pts([(cx - 1, cy + 1), (cx + 2, cy + 1)], C["eye"])
    open_ = pose in ("swing1", "cast1", "cast2")
    s.rect(cx, cy + 3, 2, 1 + open_, "#6a2030" if open_ else d)
    s.pts([(cx, cy + 4 + open_), (cx + 1, cy + 4 + open_)], BONE if open_ else d)
    s.pts([(cx - 1, cy + 5), (cx + 2, cy + 5)], d)  # feet
    return cx, cy - 3


def _scarecrow(s: Sprite, pose: str, C: dict, big: int) -> tuple[int, int]:
    dx, _, ph = MOTION[pose]
    hop = {"stand": 0, "idle": 0, "walk0": 0, "walk1": -3, "walk2": -1, "swing0": 0, "swing1": -1, "swing2": 0,
           "cast0": 0, "cast1": -2, "cast2": -1}[pose]
    y = hop
    straw, sd = C["straw"], dk(C["straw"])
    shirt, pole = C["shirt"], C["pole"]
    # the stake
    s.rect(7, 22 + y, 2, 7 - y if hop else 7, pole)
    s.set(7, 27, dk(pole))
    if hop:
        s.rect(6, 28, 4, 1, None)
    # arms: a crossbar, tilted by the swing
    tilt = {"swing0": -2, "swing1": 2, "swing2": 1, "cast1": -3, "cast0": -1}.get(pose, 0)
    for i in range(6):
        s.rect(1 + i, 13 + y - (tilt * (5 - i)) // 5, 1, 2, shirt)
        s.rect(9 + i, 13 + y + (tilt * i) // 5, 1, 2, shirt)
    s.pts([(0, 14 + y - tilt), (0, 13 + y - tilt), (15, 14 + y + tilt), (15, 13 + y + tilt)], straw)
    s.pts([(0, 15 + y - tilt), (15, 15 + y + tilt)], sd)
    # body
    s.rect(4, 13 + y, 8, 9, shirt)
    s.rect(4, 14 + y, 1, 8, dk(shirt))
    s.rect(6, 16 + y, 2, 2, C["patch"])
    s.set(10, 14 + y, lt(shirt))
    s.rect(4, 20 + y, 8, 1, "#3a2418")  # rope belt
    s.pts([(5, 22 + y), (7 + (ph == 1), 22 + y), (10, 22 + y), (6, 23 + y), (9, 23 + y)], straw)
    # sack head
    s.rect(4, 5 + y, 8, 8, C["sack"])
    s.rect(4, 5 + y, 1, 8, dk(C["sack"]))
    s.set(10, 6 + y, lt(C["sack"]))
    s.rect(5, 12 + y, 6, 1, dk(C["sack"]))
    s.pts([(5, 8 + y), (6, 8 + y), (9, 8 + y), (10, 8 + y)], INK)  # button eyes
    s.pts([(6, 9 + y), (10, 9 + y)], "#3a2830")
    mouth = [(5, 11 + y), (6, 10 + y), (7, 11 + y), (8, 10 + y), (9, 11 + y), (10, 10 + y)]
    s.pts(mouth, "#3a2830")
    if pose in ("swing1", "cast1"):
        s.rect(6, 11 + y, 4, 1, INK)
    # floppy hat
    s.rect(2 - big, 5 + y, 12 + 2 * big, 1, C["hat"])
    s.set(1 - big, 6 + y, C["hat"])
    s.rect(4, 2 + y, 7, 3, C["hat"])
    s.rect(5, 1 + y, 4, 1, C["hat"])
    s.set(10, 1 + y, dk(C["hat"]))
    s.rect(4, 4 + y, 7, 1, C["band"])
    s.pts([(3, 6 + y), (12, 6 + y)], straw)
    return 8, 1 + y


def _tree(s: Sprite, pose: str, C: dict, big: int) -> tuple[int, int]:
    dx, dy, ph = MOTION[pose]
    sway = {"stand": 0, "idle": -1, "walk0": 1, "walk1": 0, "walk2": -1, "swing0": -1, "swing1": 2, "swing2": 1,
            "cast0": 0, "cast1": 0, "cast2": 1}[pose]
    bark, bd, bl = C["bark"], dk(C["bark"]), lt(C["bark"])
    leaf, ld, ll = C["leaf"], dk(C["leaf"]), lt(C["leaf"])
    # roots as feet
    roots = {0: ((3, 26), (10, 26)), 1: ((4, 26), (9, 25)), 2: ((3, 25), (10, 26))}[ph if pose.startswith("walk") else 0]
    for (rx, ry) in roots:
        s.rect(rx, ry, 3, 29 - ry, bark)
        s.set(rx - 1, 28, bd)
        s.set(rx + 3, 28, bd)
        s.set(rx, ry, bd)
    # trunk
    s.rect(4, 12, 8, 15, bark)
    s.rect(4, 12, 1, 15, bd)
    s.rect(10, 13, 1, 6, bl)
    s.pts([(6, 20), (7, 21), (9, 23), (6, 24)], bd)  # bark grain
    # knot face
    s.rect(5, 15, 2, 2, INK)
    s.rect(9, 15, 2, 2, INK)
    if pose != "idle":
        s.set(6, 15, C["eye"])
        s.set(9, 15, C["eye"])
    s.pts([(5, 14), (10, 14)], bd)
    mouth = 2 if pose in ("swing1", "cast1") else 1
    s.rect(6, 18, 4, mouth, INK)
    s.set(8, 17, bd)
    # branch arms
    lift = {"swing0": -4, "swing1": 1, "swing2": 2, "cast0": -2, "cast1": -5, "cast2": -1}.get(pose, 0)
    s.rect(1, 14 + lift, 3, 2, bark)
    s.pts([(0, 13 + lift), (1, 12 + lift)], bark)
    s.rect(12, 14 + (lift if pose != "swing1" else 2), 3, 2, bark)
    s.pts([(15, 13 + (lift if pose != "swing1" else 2)), (14, 12 + (lift if pose != "swing1" else 2))], bark)
    s.pts([(0, 12 + lift), (15, 12 + lift)], ll)
    # canopy
    top = 1 - big
    for yy in range(top, 12):
        half = 6 + big - abs(yy - 6) // 3
        x0 = 8 - half + (sway if yy < 7 else 0)
        s.rect(x0, yy, half * 2, 1, leaf)
        s.set(x0, yy, ld)
    for (lx, ly) in ((4, 3), (9, 2), (11, 6), (6, 7), (2, 8)):
        s.set(lx + sway, ly, ll)
        s.set(lx + sway + 1, ly, ll)
    for (lx, ly) in ((3, 10), (8, 10), (12, 9), (5, 5)):
        s.set(lx, ly, ld)
    s.rect(6, 11, 4, 2, bark)
    return 8 + sway, top


def _horse(s: Sprite, pose: str, C: dict, big: int) -> tuple[int, int]:
    dx, dy, ph = MOTION[pose]
    rear = {"swing0": -2, "swing1": 0, "swing2": 1, "cast1": -1}.get(pose, 0)
    hide, hd, hl = C["hide"], dk(C["hide"]), lt(C["hide"])
    by = 17 + dy
    # legs: a gallop in three beats
    if pose.startswith("walk"):
        legs = [((2, 23, 6), (5, 22, 6), (10, 23, 6), (13, 22, 6)),
                ((3, 22, 6), (5, 23, 6), (10, 22, 6), (12, 23, 6)),
                ((2, 22, 5), (6, 23, 6), (9, 23, 6), (13, 22, 5))][ph]
    elif rear < 0:
        legs = ((2, 23, 6), (5, 23, 6), (10, 19, 4), (13, 18, 4))
    else:
        legs = ((2, 23, 6), (5, 23, 6), (10, 23, 6), (13, 23, 6))
    for (lx, ly, lh) in legs:
        s.rect(lx, ly, 2, lh, hd)
        s.rect(lx, ly + lh - 1, 2, 1, C["hoof"])
    # barrel
    s.rect(1, by + rear // 2, 13, 6, hide)
    s.rect(1, by + 5 + rear // 2, 13, 1, hd)
    s.rect(3, by + 1 + rear // 2, 7, 1, C.get("sheen", hl))
    s.set(12, by + 1 + rear // 2, C.get("sheen", hl))
    s.rect(4, by + 3 + rear // 2, 6, 1, C["collar"])  # saddle cloth
    s.set(9, by + 3 + rear // 2, GOLD)
    # tail
    s.pts([(0, by + 1), (0, by + 2), (0, by + 3), (1, by + 4)], C["mane"])
    # neck and head on the right, the muzzle toward the camera side
    ny = by - 6 + rear
    s.rect(10, ny + 2, 3, 6, hide)
    s.rect(11, ny, 3, 3, hide)
    s.rect(12, ny - 3, 3, 4, hide)
    s.rect(13, ny + 1, 3, 3, hide)
    s.rect(14, ny + 2, 2, 2, C.get("sheen", hl))
    s.set(15, ny + 3, INK)  # nostril
    s.rect(13, ny - 2, 1, 3, C.get("sheen", hl))
    s.set(12, ny - 1, C["eye"])
    s.pts([(12, ny - 4), (14, ny - 4)], hide)  # ears
    s.rect(9, ny - 1, 2, 8, C["mane"])
    s.set(10, ny - 2, C["mane"])
    s.set(9, ny + 7, C["mane"])
    # the rider: headless, a narrow cloak up to a burning neck
    ry = 8 + dy + rear
    cl = C["cloak"]
    s.rect(4, ry + 3, 5, 8, cl)
    s.rect(3, ry + 6, 7, 5, cl)
    s.rect(3, ry + 6, 1, 5, dk(cl))
    s.rect(7, ry + 3, 1, 4, lt(cl))
    s.rect(4, ry + 2, 5, 1, C["collar"])
    s.rect(3, ry + 1, 1, 3, C["collar"])
    s.rect(9, ry + 1, 1, 3, C["collar"])
    s.rect(5, ry + 1, 3, 1, "#8a2030")  # the neck stump
    flame = {"idle": 1, "walk1": 1, "cast1": 2}.get(pose, 0)
    s.pts([(6, ry - flame), (5, ry + 1 - 1 * (flame > 1)), (7, ry)], "#e07a2f")
    s.set(6, ry + 1, GOLD_HI)
    # arms: left holds the jack-o-lantern, right the blade
    s.rect(2, ry + 6, 2, 3, cl)
    pk = (0, ry + 7) if pose not in ("cast0", "cast1", "cast2") else (0, ry + 1 if pose == "cast1" else ry + 4)
    s.rect(pk[0], pk[1], 4, 3, "#e07a2f")
    s.set(pk[0] + 1, pk[1] + 1, GOLD_HI)
    s.set(pk[0] + 3, pk[1] + 1, GOLD_HI)
    s.set(pk[0], pk[1] + 2, "#c45a18")
    s.set(pk[0] + 1, pk[1] - 1, "#2a4a20")
    if pose == "swing0":
        s.rect(8, ry - 1, 2, 5, cl)
        s.pts([(9, ry - 2), (9, ry - 3), (10, ry - 4), (10, ry - 5), (11, ry - 6)], STEEL_HI)
    elif pose == "swing1":
        s.rect(9, ry + 5, 3, 2, cl)
        s.pts([(12, ry + 6), (13, ry + 7), (14, ry + 8), (15, ry + 9)], STEEL_HI)
        _smear(s, 9, ry + 7, 6, 9, -90, 30, 2)
    elif pose == "swing2":
        s.rect(8, ry + 6, 2, 3, cl)
        s.pts([(7, ry + 9), (6, ry + 10), (5, ry + 11)], STEEL_HI)
    else:
        s.rect(8, ry + 6, 2, 3, cl)
        s.pts([(9, ry + 9), (9, ry + 10), (9, ry + 11)], STEEL)
    return 6, ry - 2


def _critter(s: Sprite, pose: str, C: dict, big: int, rat: bool) -> tuple[int, int]:
    dx, dy, ph = MOTION[pose]
    fur, fd, fl = C["fur"], dk(C["fur"]), lt(C["fur"])
    pounce = pose in ("swing1", "swing2")
    arch = pose in ("cast0", "cast1", "swing0")
    h = 4 if rat else 5
    by = 28 - h - 2 + (1 if pose == "swing0" else 0) - (1 if pose == "swing1" else 0)
    bx = 3 if not pounce else 4
    w = 8 if rat else 8 + big
    s.rect(bx, by, w, h, fur)
    if arch:
        s.rect(bx + 2, by - 1 - (pose == "cast1"), w - 4, 1 + (pose == "cast1"), fur)
    s.rect(bx, by + h - 1, w, 1, fd)
    s.rect(bx + 2, by, w - 4, 1, fl)
    # legs, in step
    step = [(0, 1), (1, 0), (0, 0)][ph] if pose.startswith("walk") else (0, 0)
    for i, lx in enumerate((bx, bx + 2, bx + w - 3, bx + w - 1)):
        lift = step[i % 2]
        s.rect(lx, by + h, 1, 2 - lift, fd)
    # head at the front, looking out
    hx = bx + w - 2 + (1 if pounce else 0)
    hy = by - (3 if not rat else 1)
    hw = 5 if not rat else 4
    s.rect(hx, hy, hw, 4 if not rat else 3, fur)
    if rat:
        s.set(hx + hw, hy + 1, C["nose"])
        s.pts([(hx, hy - 1), (hx + 2, hy - 1)], C["ear"])
        s.set(hx + 2, hy + 1, INK)
    else:
        s.pts([(hx, hy - 1), (hx, hy - 2), (hx + hw - 1, hy - 1), (hx + hw - 1, hy - 2)], fur)
        s.pts([(hx + 1, hy + 1), (hx + 3, hy + 1)], C["eye"] if pose != "idle" else fd)
        s.set(hx + 2, hy + 2, C["nose"])
        if pose in ("cast1", "swing1"):
            s.rect(hx + 1, hy + 3, 3, 1, "#6a2030")
    # tail
    if rat:
        pts = [(bx - 1, by + 2), (bx - 2, by + 2), (bx - 3, by + 1 + ph % 2), (bx - 4, by + 1), (bx - 5, by + 2 - ph % 2)]
        s.pts(pts, C["tail"])
    else:
        flick = {"idle": 1, "walk1": 1, "cast1": 2, "cast0": 2}.get(pose, 0)
        pts = [(bx - 1, by + 1), (bx - 2, by), (bx - 2, by - 1), (bx - 2 + (flick > 0), by - 2), (bx - 1 + flick, by - 3)]
        s.pts(pts, fur)
    if pounce:
        s.pts([(hx + hw, hy + 3), (hx + hw, hy + 4)], BONE)
        _smear(s, hx, hy + 2, 3, 3, -60, 60, 1)
    return hx + 2, hy - 2


def _mimic(s: Sprite, pose: str, C: dict, big: int) -> tuple[int, int]:
    """Owner-approved 13th family (2026-09-30): a chest that bites. Drawn from the dungeon chest's own
    colors so a sleeping one and a plain chest share a wood. Cast is the 0.35 s tell (the lid shudders),
    swing is the bite lunge (lid wide, then snap)."""
    wood, lid, latch, leg = C["wood"], C["lid"], C["latch"], C["leg"]
    band = dk(wood)
    # (body shift x, body bob y, lid lift in px, mouth open in px)
    dx, bob, gap = {
        "stand": (0, 0, 0), "idle": (0, 0, 1),
        "walk0": (0, 0, 0), "walk1": (0, -1, 1), "walk2": (0, 0, 0),
        "swing0": (-1, 0, 5), "swing1": (1, 1, 2), "swing2": (1, 0, 1),
        "cast0": (-1, 0, 1), "cast1": (1, 0, 2), "cast2": (0, 0, 1),
    }[pose]
    x0 = 2 + dx
    base_top = 20 + bob
    # stubby legs; the walk swaps which pair is planted
    legs = {"walk0": ((3, 28), (11, 27)), "walk1": ((3, 28), (11, 28)), "walk2": ((3, 27), (11, 28))}.get(pose, ((3, 28), (11, 28)))
    for lx, ly in legs:
        s.rect(lx + dx, base_top + 8, 2, ly - (base_top + 8) + 1, leg)
    # the box
    s.rect(x0, base_top, 12, 8, wood)
    s.rect(x0, base_top + 3, 12, 1, band)
    s.rect(x0, base_top + 7, 12, 1, band)
    s.rect(x0 + 1, base_top + 1, 2, 1, lt(wood))
    # mouth: dark inside, teeth on the box rim, a tongue when it is wide
    if gap:
        s.rect(x0 + 1, base_top - gap, 10, gap, C["maw"])
        for tx in range(x0 + 1, x0 + 11, 2):
            s.set(tx, base_top - 1, C["tooth"])
        if gap >= 4:
            s.rect(x0 + 4, base_top - 2, 4, 2, C["tongue"])
            s.set(x0 + 8, base_top - 1, C["tongue"])
    # the lid, lifted by the gap; teeth hang from its rim
    lid_top = base_top - gap - 4
    s.rect(x0, lid_top, 12, 4, lid)
    s.rect(x0 + 1, lid_top, 10, 1, lt(lid))
    s.rect(x0, lid_top + 3, 12, 1, dk(lid))
    if gap:
        for tx in range(x0 + 2, x0 + 11, 2):
            s.set(tx, lid_top + 4, C["tooth"])
    # the latch, and the eyes the latch hides until it wakes
    s.rect(x0 + 5, lid_top + 2, 2, 2, latch)
    if pose != "stand":
        s.set(x0 + 2, lid_top + 1, C["eye"])
        s.set(x0 + 9, lid_top + 1, C["eye"])
    return 8 + dx, lid_top


def _krampus(s: Sprite, pose: str, C: dict, big: int) -> tuple[int, int]:
    """OWNER-APPROVED EXCEPTION 2026-10-01: FESTIVAL BOSSES. Krampus: goat horns, black shag, the long red
    tongue, a birch switch in the right hand and a wicker basket on his back (the owner's switch and basket;
    no chains, no bells). Swing is the switch lash; cast is the basket snatch (he reaches over his shoulder)."""
    fur, hi, deep = C["fur"], C["fur_hi"], C["fur_deep"]
    horn, ridge = C["horn"], C["ridge"]
    hunch = {"idle": 1, "swing0": -1, "swing1": 1, "swing2": 1, "cast0": 0, "cast1": -1, "cast2": 0}.get(pose, 0)
    bob = {"walk1": -1}.get(pose, 0)
    y = bob
    # the basket on his back: rim over the left shoulder, weave below, straw (and worse) poking out
    bx = 0
    s.rect(bx, 8 + y, 5, 9, C["wicker"])
    for yy in range(9 + y, 17 + y, 2):
        for xx in range(bx + (yy % 4 == 1), bx + 5, 2):
            s.set(xx, yy, C["weave"])
    s.rect(bx, 8 + y, 5, 1, C["rim"])
    s.pts([(bx + 1, 7 + y), (bx + 3, 6 + y), (bx + 2, 7 + y)], C["straw"])
    if pose in ("cast1", "cast2"):
        s.pts([(bx + 1, 6 + y), (bx + 2, 5 + y), (bx + 4, 6 + y)], C["straw"])
    # goat legs: thick shag thighs, thin shins bent back, cloven hooves on row 28
    legs = {"walk0": (0, 1), "walk1": (1, 0), "walk2": (1, 1)}.get(pose, (0, 0))
    for (lx, lift) in ((5, legs[0] if pose.startswith("walk") else 0), (9, legs[1] if pose.startswith("walk") else 0)):
        s.rect(lx - 1, 20 + y, 3, 3, fur)
        s.rect(lx, 23 + y, 2, 2, deep)
        s.rect(lx + 1, 25 + y - lift, 1, 3, deep)
        s.rect(lx, 28 - lift, 2, 1, C["hoof"])
        s.set(lx - 1, 21 + y, hi)
        s.set(lx + 1, 23 + y, hi)
    # body: a hunched shag, ragged at the hem
    s.rect(4, 11 + y + hunch, 8, 10, fur)
    s.rect(5, 12 + y + hunch, 1, 7, hi)
    s.rect(10, 13 + y + hunch, 1, 6, deep)
    for i, xx in enumerate(range(4, 12)):
        s.set(xx, 21 + y + (i % 2), fur)
    s.rect(4, 18 + y + hunch, 8, 1, C["rope"])
    # head pushed forward, glowing eyes, the tongue hanging to the chest
    hx, hy = 5, 6 + y + hunch
    s.rect(hx, hy, 6, 5, fur)
    s.rect(hx + 1, hy + 2, 4, 3, deep)
    s.pts([(hx + 1, hy + 2), (hx + 4, hy + 2)], C["eye"])
    s.pts([(hx + 1, hy + 1), (hx + 4, hy + 1)], C["brow"])
    s.pts([(hx + 2, hy + 4), (hx + 3, hy + 4)], INK)
    tongue = {"idle": 6, "swing1": 7, "cast1": 7}.get(pose, 5)
    tx = hx + 3 + (1 if pose == "idle" else 0)
    for k in range(tongue):
        s.set(tx + (1 if k >= tongue - 2 else 0), hy + 5 + k, C["tongue"] if k % 3 else C["tongue_hi"])
    s.pts([(hx - 1, hy + 4), (hx + 6, hy + 4), (hx, hy + 5), (hx + 5, hy + 5)], hi)  # beard shag
    # goat horns curling out and up
    for (dx, dirx) in ((0, -1), (5, 1)):
        bx0 = hx + dx
        pts = [(bx0, hy - 1), (bx0 + dirx, hy - 2), (bx0 + dirx, hy - 3), (bx0 + 2 * dirx, hy - 4), (bx0 + 2 * dirx, hy - 5), (bx0 + dirx, hy - 6)]
        s.pts(pts, horn)
        s.pts(pts[1:4:2], ridge)
        s.set(bx0, hy, horn)
    # left arm holds the basket strap; right arm carries the birch switch
    s.rect(3, 12 + y + hunch, 1, 6, fur)
    s.set(3, 18 + y + hunch, C["claw"])
    rod = C["birch"]
    if pose == "swing0":
        hand = (12, 9 + y)
        twigs = [(13, 8 + y), (13, 7 + y), (14, 6 + y), (14, 5 + y), (15, 4 + y), (14, 3 + y), (15, 2 + y), (13, 4 + y), (12, 5 + y), (15, 6 + y)]
        s.rect(12, 9 + y, 1, 5, fur)
    elif pose in ("swing1", "swing2"):
        hand = (13, 17 + y)
        twigs = [(14, 18 + y), (14, 19 + y), (15, 20 + y), (15, 21 + y), (13, 20 + y), (14, 22 + y), (15, 23 + y), (12, 21 + y)]
        s.rect(12, 13 + y + hunch, 2, 4, fur)
        if pose == "swing1":
            _smear(s, 11, 14 + y, 5, 8, -70, 80, 1)
    elif pose.startswith("cast"):
        hand = (12, 12 + y + hunch)
        twigs = [(13, 13 + y), (14, 14 + y), (14, 15 + y), (15, 16 + y), (13, 15 + y), (15, 17 + y)]
        s.rect(12, 12 + y + hunch, 1, 5, fur)
        # the free claw reaches back over the shoulder to the basket
        s.pts([(4, 9 + y), (3, 8 + y), (2, 7 + y)], fur)
        s.set(2, 6 + y, C["claw"])
    else:
        hand = (12, 17 + y + hunch)
        twigs = [(13, 16 + y), (13, 15 + y), (14, 14 + y), (14, 13 + y), (15, 12 + y), (14, 11 + y), (15, 10 + y), (13, 12 + y), (12, 13 + y)]
        s.rect(12, 12 + y + hunch, 1, 6, fur)
    s.pts(twigs, rod)
    s.pts(twigs[::3], C["birch_hi"])
    s.set(hand[0], hand[1], C["ribbon"])
    s.set(hand[0] + 1, hand[1], C["ribbon"])
    return hx + 3, hy - 6


def _pumpkinlord(s: Sprite, pose: str, C: dict, big: int) -> tuple[int, int]:
    """OWNER-APPROVED EXCEPTION 2026-10-01: FESTIVAL BOSSES. The Pumpkin Lord: a great carved pumpkin head lit
    from inside, a crown of vines, a cloak of fallen leaves, and a vine whip. Swing is the vine lash; cast is
    the seed volley (the grin flares)."""
    rind, rib, glow, core = C["rind"], dk(C["rind"]), C["glow"], C["core"]
    dx, _, ph = MOTION[pose]
    y = {"walk1": -1, "swing1": 1, "cast1": -1}.get(pose, 0)
    # root legs
    legs = {"walk0": ((5, 0), (9, 1)), "walk1": ((5, 1), (9, 0)), "walk2": ((5, 1), (9, 1))}.get(pose, ((5, 0), (9, 0)))
    for lx, lift in legs:
        s.rect(lx, 21 + y, 2, 7 - lift - y, C["root"])
        s.rect(lx - 1, 28 - lift, 4, 1, C["root"])
        s.set(lx, 24 + y, dk(C["root"]))
    # leaf cloak, ragged
    s.rect(3, 12 + y, 10, 10, C["cloak"])
    for i, xx in enumerate(range(3, 13)):
        s.set(xx, 22 + y + (i % 2), C["leaf"] if i % 3 else C["leaf_hi"])
    s.pts([(4, 14 + y), (6, 16 + y), (10, 13 + y), (11, 17 + y), (5, 19 + y), (9, 20 + y)], C["leaf"])
    s.pts([(7, 15 + y), (8, 18 + y)], C["leaf_hi"])
    # the head: a ribbed pumpkin, carved and lit
    hy = 2 + y
    s.rect(3, hy + 1, 10, 8, rind)
    s.rect(4, hy, 8, 10, rind)
    for rx in (5, 8, 10):
        s.rect(rx, hy + 1, 1, 8, rib)
    s.set(11, hy + 2, lt(rind))
    lit = core if pose in ("cast1", "swing1") else glow
    s.pts([(5, hy + 3), (6, hy + 4), (5, hy + 4), (10, hy + 3), (9, hy + 4), (10, hy + 4)], lit)  # slanted eyes
    s.pts([(4, hy + 6), (5, hy + 7), (6, hy + 6), (7, hy + 7), (8, hy + 6), (9, hy + 7), (10, hy + 6), (11, hy + 6)], lit)
    s.pts([(6, hy + 7), (8, hy + 7), (10, hy + 7)], INK)
    if pose == "cast1":
        s.rect(5, hy + 6, 6, 2, core)
    # stem and a crown of vines
    s.rect(7, hy - 2, 2, 2, C["stem"])
    s.pts([(4, hy - 1), (5, hy - 2), (11, hy - 1), (10, hy - 2), (3, hy), (12, hy)], C["vine"])
    s.pts([(5, hy - 3), (10, hy - 3)], C["leaf_hi"])
    # arms and the vine whip
    s.rect(2, 13 + y, 1, 6, C["cloak"])
    s.set(2, 19 + y, C["root"])
    vine = C["vine"]
    if pose == "swing0":
        s.rect(13, 9 + y, 1, 5, C["cloak"])
        s.pts([(13, 8 + y), (14, 7 + y), (14, 6 + y), (15, 5 + y), (15, 4 + y), (14, 3 + y)], vine)
    elif pose in ("swing1", "swing2"):
        s.rect(13, 13 + y, 1, 4, C["cloak"])
        s.pts([(14, 17 + y), (15, 18 + y), (15, 19 + y), (14, 20 + y), (15, 21 + y), (14, 22 + y)], vine)
        if pose == "swing1":
            _smear(s, 11, 15 + y, 5, 7, -60, 80, 1)
    else:
        s.rect(13, 13 + y, 1, 6, C["cloak"])
        s.pts([(13, 19 + y), (14, 20 + y), (14, 21 + y), (15, 22 + y), (14, 23 + y)], vine)
    return 8, hy - 3


FAMILY_COLORS = {
    "ghost": {"body": "#c5d4e8", "eye": "#8aa0c0", "mouth": "#3a4458"},
    "bat": {"body": "#3a2a44", "wing": "#2e1e38", "eye": "#e07a2f"},
    "scarecrow": {"straw": "#e0c080", "shirt": "#8a6840", "patch": "#6a2030", "pole": "#5a4030", "sack": "#c4a15a",
                  "hat": "#3a2418", "band": "#6a2030"},
    "tree": {"bark": "#4a3020", "leaf": "#3d4a28", "eye": "#f4e27a"},
    "horse": {"hide": "#2a2428", "mane": "#1a1418", "hoof": "#6a5848", "eye": "#e07a2f", "cloak": "#3a2a44", "collar": "#6a2030", "sheen": "#4a4038"},
    "cat": {"fur": "#2a2a2e", "eye": "#f4e27a", "nose": "#c4a090"},
    "rat": {"fur": "#8a7060", "nose": "#c4a090", "ear": "#c4a090", "tail": "#c4a090", "eye": INK},
    "mimic": {"wood": "#6a4818", "lid": "#c4a050", "latch": "#f0e2c8", "leg": "#4a3424", "maw": "#2a1018",
              "tooth": "#f4ecdc", "tongue": "#8f2d3a", "eye": "#e07a2f"},
    "krampus": {"fur": "#2a2428", "fur_hi": "#4a4038", "fur_deep": "#1a1014", "horn": "#e8dcc8", "ridge": "#8a6840",
                "eye": "#f4e27a", "brow": "#a02030", "tongue": "#a02030", "tongue_hi": "#8f2d3a", "hoof": "#140c10",
                "claw": "#e8dcc8", "rope": "#5a4030", "birch": "#d8c8a0", "birch_hi": "#6a4818", "ribbon": "#a02030",
                "wicker": "#c4a050", "weave": "#8a6840", "rim": "#6a4818", "straw": "#c4a15a"},
    "pumpkinlord": {"rind": "#e07a2f", "glow": "#f4e27a", "core": "#fff8e0", "stem": "#3d4a28", "vine": "#3d4a28",
                    "leaf": "#6a3a28", "leaf_hi": "#c4a15a", "cloak": "#3a2418", "root": "#4a3020"},
}
FAMILY_RARE = {
    "ghost": {"body": "#9ec060", "eye": "#3a4a20", "mouth": "#3a4a20"},
    "bat": {"body": "#6a2030", "wing": "#4a1020", "eye": "#f4e27a"},
    "scarecrow": {"shirt": "#2a4a38", "sack": "#8a9870", "hat": "#1a1a1c"},
    "tree": {"leaf": "#6a3a28", "bark": "#3a2418"},
    "horse": {"hide": "#e6e0d4", "mane": "#8a9098", "hoof": "#6a7480", "cloak": "#2a3a6a", "sheen": "#f4f0ea"},
    "cat": {"fur": "#e6e0d4", "eye": "#9ec4e0"},
    "rat": {"fur": "#e6e0d4", "eye": "#a02030"},
}
FAMILY_BOSS = {
    "ghost": {"body": "#e8eef8", "mouth": "#1a1428"},
    "bat": {"wing": "#1a1014"},
    "scarecrow": {"hat": "#1a1014", "band": GOLD},
    "tree": {"leaf": "#2a3820"},
    "horse": {"collar": GOLD},
    "cat": {},
    "rat": {},
}
DRAWN = {
    "ghost": _ghost,
    "bat": _bat,
    "scarecrow": _scarecrow,
    "tree": _tree,
    "horse": _horse,
    "cat": lambda s, p, C, big: _critter(s, p, C, big, False),
    "rat": lambda s, p, C, big: _critter(s, p, C, big, True),
    "mimic": _mimic,
    "krampus": _krampus,
    "pumpkinlord": _pumpkinlord,
}
CAST = {
    "ghost": ("#e8eef8", "#8aa0c0"),
    "bat": ("#f4e27a", "#e07a2f"),
    "scarecrow": ("#e0c080", "#c4a15a"),
    "tree": ("#9ec060", "#6a8a32"),
    "horse": (GOLD_HI, "#e07a2f"),
    "cat": ("#f4e27a", "#e0a040"),
    "rat": ("#f4ecdc", "#c4a090"),
    "mimic": (GOLD_HI, "#e07a2f"),
    "krampus": ("#f4e27a", "#a02030"),
    "pumpkinlord": (GOLD_HI, "#e07a2f"),
}


def _drawn(kind: str, pose: str, rank: str) -> Sprite:
    C = dict(FAMILY_COLORS[kind])
    if rank == "rare":
        C.update(FAMILY_RARE.get(kind, {}))
    if rank == "boss":
        C.update(FAMILY_BOSS.get(kind, {}))
    big = 1 if rank == "boss" else 0
    s = Sprite()
    top_x, top_y = DRAWN[kind](s, pose, C, big)
    if rank == "boss":
        _crown(s, _top_row(s, 3, 12), top_x)
        if kind in ("ghost", "scarecrow", "tree"):
            s.pts([(3, 20), (12, 20)], GOLD)
    elif rank == "mini":
        # a remnant wears an iron collar and a rust brand
        cy = min(28, top_y + (6 if kind not in ("cat", "rat", "bat") else 3))
        s.rect(top_x - 2, cy, 5, 1, STEEL)
        s.set(top_x, cy, STEEL_HI)
        s.set(top_x - 1, cy + 1, MINI_RED)
        s.set(top_x + 1, cy + 1, MINI_RED)
    elif rank == "rare":
        _affix(s)
    s.outline()
    core, ring = CAST[kind]
    if pose == "cast0":
        _glow(s, top_x, max(1, top_y - 1), 1, core, ring)
    elif pose == "cast1":
        _glow(s, top_x, max(2, top_y - 2), 3, core, ring)
    elif pose == "cast2":
        _scatter(s, core, ring, kind, max(0, top_y - 4))
    return s


def festival_boss(kind: str, pose: str) -> Sprite:
    """OWNER-APPROVED EXCEPTION 2026-10-01: FESTIVAL BOSSES. Krampus and the Pumpkin Lord: boss build (big=1)
    with no crown (their horns and vine crown are the mark), the same outline and cast glow as every body."""
    C = dict(FAMILY_COLORS[kind])
    s = Sprite()
    top_x, top_y = DRAWN[kind](s, pose, C, 1)
    s.outline()
    core, ring = CAST[kind]
    if pose == "cast0":
        _glow(s, top_x, max(1, top_y - 1), 1, core, ring)
    elif pose == "cast1":
        _glow(s, top_x, max(2, top_y - 2), 3, core, ring)
    elif pose == "cast2":
        _scatter(s, core, ring, kind, max(0, top_y - 4))
    return s


def creature(kind: str, pose: str | int = "stand", rank: str = "mob") -> Sprite:
    """One family in one of the eleven poses and one of the ranks mob, boss, mini, rare."""
    if isinstance(pose, int):
        pose = "walk0" if pose else "stand"
    if kind in MONSTERS:
        return _monster_person(kind, pose, rank)
    if kind in DRAWN:
        return _drawn(kind, pose, rank)
    return human("warrior", pose, rank)
