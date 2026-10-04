"""playtest1p [OWNER-APPROVED 2026-10-04 01:10 ET: playtest1p view polish and big bosses]: big bodies for bosses,
minis and rares.

Bill (2026-10-04 01:10 ET): bosses at least 5x the player's size, minis and rares 2 to 3x. Since playtest1c a boss was a
people-scale body in a cold-fire ring. This writer lays every big rank's frames out again at its own size, from the
1x frames the sprite writer draws (front strip and the -dirs sheet's back, east and west rows), so the big body is the
same body, pose for pose:

    BIG = {"boss": 5, "mini": 3, "rare": 2}      (linear: a boss cell is 80x160, the hero's is 16x32)

Each frame is magnified by hand-written rules, never resampled: no blur, no new colours.

  1. Edge rounding (EPX corners grown with the scale): a block's corner whose two neighbours agree takes their colour
     in a small triangle, so a curve stays a curve instead of a staircase of 5x5 blocks.
  2. Line weight: the outer outline stays 2 px (1 px at 2x) on the outside of the silhouette; a line drawn inside the
     body (an arm against a coat, a seam) thins to 1 px down its middle; a lone dark pixel (an eye, a nostril) keeps
     its whole block. The pixels a thick line gives up take the colour of the body beside them.
  3. Detail the 1x frame has no room for: a rim of light along each shape's top edge and a core shadow along its
     bottom and right edges (one locked palette step, sprite_writer lt/dk), and a sparse hide-and-cloth grain on the
     darker materials. Glow colours (the eyes, lanterns, flames: EM_COLOURS and every neon) are never shaded.

Sheets: public/art/sprites/big/<family>-<rank>.png for the 17 foe families, mimic-rare.png, pumpkin-lord-boss.png,
krampus-boss.png. Eleven poses across (as the strips), four views down: row 0 front, 1 back, 2 east, 3 west. Each has
an _em glow mask (the EM_COLOURS pixels), as foes_em.png. Palette locked, hard alpha (checked here).

    python3 tools/sprite-writer/boss_writer.py      (after dirs_writer.py; make_gravewake.py runs both)

playtest1q [OWNER-APPROVED 2026-10-04 05:43 ET: playtest1q detailed big bosses, wizard back view, Phone boss label]:
drawn in full detail at their real size. Bill (2026-10-04 05:43 ET, "A b and c pls"; A): the 5x bosses and the 2-3x
minis and rares were the 1x art blown up (crisp but blocky). Each big cell is now drawn at its own size from the same
body, pose for pose and view for view, keeping playtest1p's silhouette (its alpha is playtest1p's to the pixel), its 2 px
outline and its feet, so the hitboxes, feet and arenas do not move. Over the magnified layout the writer paints:

  materials  every colour is given a material from the body's own spec (sprite_writer MONSTERS / BOSS_DRESS /
             RARE_DRESS, FAMILY_COLORS): cloth, skin, bone, wraps, fur, hair, metal, gold, leather, bark, leaf,
             straw, burlap, rind, ecto, membrane, horn, hide, wood. Each region is lit from above in its material's
             own ramp (at most 4 steps: dk2, dk, base, lt; C1), with a dithered band edge, and gets its texture:
             folds down cloth, plate seams and rivets on metal, cracks in bone, mottling and stitches on skin,
             strands in fur and hair, grain and knots in bark and wood, ribs on a pumpkin, wisps in ectoplasm,
             veins in a wing, rings on horn, weave in burlap, wrap bands on a mummy.
  faces      eyes are drawn as eyes: a lid line, the iris in its own colour, a white-hot core; a glowing eye gets a
             1 px halo of its family's neon. Mouths get teeth.
  glow       every flame and lamp keeps its colour with a hot core; each family carries one signature neon (blue
             cold fire, violet or red; NEON in palette_locked): runes on its robe, hide or bark (5x7 glyphs on a boss,
             3x5 on a mini, 3x3 on a rare), its eye halos, its crown gem. The neon pixels join the _em mask, so they
             glow in the dark as the lamps do.

Seeded by family and anchored to each region (never Math.random, never a resample): the same frame always gives the
same pixels. Palette LOCKED_V3 (palette v3 adds the neon tubes), hard alpha.
"""

from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

import numpy as np
from PIL import Image

import sprite_writer as sw
from palette_locked import LOCKED, LOCKED_V3, NEON

TAG = "[OWNER-APPROVED 2026-10-04 01:10 ET: playtest1p view polish and big bosses]"
TAG_1Q = "[OWNER-APPROVED 2026-10-04 05:43 ET: playtest1q detailed big bosses, wizard back view, Phone boss label]"
BIG = {"boss": 5, "mini": 3, "rare": 2}
EM_COLOURS = ("#f4e27a", "#fff8e0", "#e0a040")
POSES = 11
# colours that are light, not material: never shaded or grained (the glow mask colours, the cold fire, the hex violet,
# the red neon, white-hot cores)
GLOW = set(EM_COLOURS) | {"#9ec4e0", "#c5d4e8", "#8eb4d8", "#e7f4fb", "#b48cff", "#9a6aff", "#ff4a5a", "#f04050", "#e02040", sw.WHITE_HOT}


def _code(c: str) -> int:
    return (1 << 24) | int(c[1:], 16)


def _hex(v: int) -> str:
    return f"#{v & 0xFFFFFF:06x}"


def _codes(im: Image.Image) -> np.ndarray:
    a = np.asarray(im.convert("RGBA"), dtype=np.uint32)
    v = (a[..., 0] << 16) | (a[..., 1] << 8) | a[..., 2] | (1 << 24)
    return np.where(a[..., 3] == 255, v, 0).astype(np.int64)


def _image(c: np.ndarray) -> Image.Image:
    h, w = c.shape
    out = np.zeros((h, w, 4), dtype=np.uint8)
    on = c != 0
    out[..., 0] = (c >> 16) & 255
    out[..., 1] = (c >> 8) & 255
    out[..., 2] = c & 255
    out[..., 3] = np.where(on, 255, 0)
    out[~on] = 0
    return Image.fromarray(out, "RGBA")


def _sh(a: np.ndarray, dy: int, dx: int, fill: int = 0) -> np.ndarray:
    """a shifted so out[y, x] = a[y + dy, x + dx] (fill past the edge)."""
    h, w = a.shape
    out = np.full_like(a, fill)
    ys, yd = (slice(dy, h), slice(0, h - dy)) if dy >= 0 else (slice(0, h + dy), slice(-dy, h))
    xs, xd = (slice(dx, w), slice(0, w - dx)) if dx >= 0 else (slice(0, w + dx), slice(-dx, w))
    out[yd, xd] = a[ys, xs]
    return out


INK = _code(sw.INK)
# playtest1q: the colours of faces and lights, which keep their blocks when the inside of a body is rounded
FEATURE_CODES = {_code(c) for c in ("#f4e27a", "#fff8e0", "#e0a040", "#a02030", "#c43838", "#8eb4d8", "#9ec4e0", "#9ec060",
                                    "#d8d0c0", "#e07a2f", "#8aa0c0", "#3a4458", "#3a2830", "#a06050")}


def magnify(src: np.ndarray, s: int, ramp: dict[int, tuple[int, int]], lines_only: bool = False, keep: np.ndarray | None = None) -> np.ndarray:
    """playtest1p's magnifier. lines_only (playtest1q): stop after the edge rounding and the line weight, the layout
    detail() paints over (its alpha is the finished sheet's)."""
    h, w = src.shape
    out = np.repeat(np.repeat(src, s, 0), s, 1)
    if s == 1:
        return out
    # 1. edge rounding
    A, B, C, D = _sh(src, -1, 0), _sh(src, 0, 1), _sh(src, 0, -1), _sh(src, 1, 0)
    k = max(0, s // 2 - 1)
    corners = (
        (lambda u, v: u + v <= k, (C == A) & (C != D) & (A != B), A),
        (lambda u, v: (s - 1 - u) + v <= k, (A == B) & (A != C) & (B != D), A),
        (lambda u, v: u + (s - 1 - v) <= k, (C == D) & (C != A) & (D != B), C),
        (lambda u, v: (s - 1 - u) + (s - 1 - v) <= k, (B == D) & (B != A) & (D != C), B),
    )
    for v in range(s):
        for u in range(s):
            view = out[v::s, u::s]
            for inside, cond, col in corners:
                if inside(u, v):
                    view[cond] = col[cond]
    src0 = src
    if lines_only and s >= 3:
        # playtest1q: inside the body (both colours opaque, so the alpha stays playtest1p's) a corner where two
        # neighbours agree is cut on a wider diagonal (s - 2 px), so a staircase of s x s blocks inside the figure
        # reads as the slope it stands for, drawn at the real size
        k2 = s - 2
        feat = np.isin(src, list(FEATURE_CODES)) | (src == INK) | (keep if keep is not None else False)
        A, B, C, D = (np.where(_sh(feat, dy, dx, True), -1, n) for n, (dy, dx) in zip((A, B, C, D), ((-1, 0), (0, 1), (0, -1), (1, 0))))
        src_ok = np.where(feat, 0, src)
        src = src_ok
        inner = (
            (lambda u, v: u + v <= k2, (C == A) & (C != D) & (A != B) & (src != 0) & (A > 0), A),
            (lambda u, v: (s - 1 - u) + v <= k2, (A == B) & (A != C) & (B != D) & (src != 0) & (A > 0), A),
            (lambda u, v: u + (s - 1 - v) <= k2, (C == D) & (C != A) & (D != B) & (src != 0) & (C > 0), C),
            (lambda u, v: (s - 1 - u) + (s - 1 - v) <= k2, (B == D) & (B != A) & (D != C) & (src != 0) & (B > 0), B),
        )
        for v in range(s):
            for u in range(s):
                view = out[v::s, u::s]
                for inside, cond, col in inner:
                    if inside(u, v):
                        view[cond] = col[cond]
        src = src0
    # 2. line weight
    ink = src == INK
    clear = src == 0
    near_clear = _sh(clear, -1, 0, True) | _sh(clear, 1, 0, True) | _sh(clear, 0, -1, True) | _sh(clear, 0, 1, True)
    outer = ink & near_clear
    ink8 = sum(_sh(ink, dy, dx, False).astype(int) for dy in (-1, 0, 1) for dx in (-1, 0, 1) if dy or dx)
    inner = ink & ~near_clear & (ink8 > 0)
    big_outer = np.repeat(np.repeat(outer, s, 0), s, 1)
    big_inner = np.repeat(np.repeat(inner, s, 0), s, 1)
    is_ink = out == INK
    body = (out != 0) & ~is_ink
    # Chebyshev distance of each pixel to the nearest body (non-ink opaque) pixel, up to s + 1
    dist = np.where(body, 0, s + 2)
    reach = body.copy()
    for d in range(1, s + 2):
        grown = reach.copy()
        for dy in (-1, 0, 1):
            for dx in (-1, 0, 1):
                if dy or dx:
                    grown |= _sh(reach, dy, dx, False)
        dist = np.where(grown & ~reach, d, dist)
        reach = grown
    t = 2 if s >= 4 else 1
    drop = is_ink & ((big_outer & (dist <= s - t)) | (big_inner & (dist < (s + 1) // 2)))
    # the pixels a line gives up take the colour of the body beside them (grown in from the nearest body pixel)
    fill = np.where(body, out, 0)
    todo = drop.copy()
    for _ in range(s + 2):
        if not todo.any():
            break
        for dy, dx in ((0, -1), (0, 1), (-1, 0), (1, 0), (-1, -1), (-1, 1), (1, -1), (1, 1)):
            n = _sh(fill, dy, dx, 0)
            take = todo & (n != 0)
            fill = np.where(take, n, fill)
            todo &= ~take
    out = np.where(drop & (fill != 0), fill, out)
    if lines_only:
        return out
    # 3. detail: rim light on top edges, core shadow on bottom and right edges, grain on dark materials
    up, dn, rt = _sh(out, -1, 0), _sh(out, 1, 0), _sh(out, 0, 1)
    mat = (out != 0) & (out != INK)
    keys = np.unique(out[mat])
    lit = np.zeros_like(out)
    dark = np.zeros_like(out)
    grain = np.zeros(out.shape, dtype=bool)
    for kk in keys:
        r = ramp.get(int(kk))
        if not r:
            continue
        m = out == kk
        lit[m] = r[0]
        dark[m] = r[1]
    shadable = mat & (lit != 0)
    top = shadable & ((up == INK) | (up == 0))
    bottom = shadable & ((dn == INK) | (dn == 0) | (rt == INK)) & ~top
    yy, xx = np.indices(out.shape)
    flat = shadable & (up == out) & (dn == out) & (rt == out) & (_sh(out, 0, -1) == out)
    dim = np.zeros(out.shape, dtype=bool)
    for kk in keys:
        if int(kk) in DIM:
            dim |= out == kk
    grain = flat & dim & ((((xx * 73856093) ^ (yy * 19349663)) % (13 + 2 * s)) == 0)   # scattered, not a grid
    out = np.where(top, lit, out)
    out = np.where(bottom | grain, dark, out)
    return out


DIM: set[int] = set()


def _ramps(colours) -> dict[int, tuple[int, int]]:
    ramp = {}
    for v in colours:
        c = _hex(int(v))
        if c in GLOW or c == sw.INK:
            continue
        lt, dk = sw.lt(c), sw.dk(c)
        if lt == c or dk == c or lt not in LOCKED or dk not in LOCKED:
            continue
        ramp[int(v)] = (_code(lt), _code(dk))
        r, g, b = (int(c[i:i + 2], 16) for i in (1, 3, 5))
        if (max(r, g, b) + min(r, g, b)) / 510 < 0.42:
            DIM.add(int(v))
    return ramp


# ---------------------------------------------------------------- playtest1q: full detail at the real size
# [OWNER-APPROVED 2026-10-04 05:43 ET: playtest1q detailed big bosses, wizard back view, Phone boss label]

# Each family's signature neon (palette_locked NEON: deep, halo, mid, tube, core, hot): Bill's cold blue fire first,
# then violet and red. The undead burn cold blue, the hexed and the night things violet, the blood and the flame red.
NEON_OF = {
    "zombie": "blue", "skeleton": "blue", "ghost": "blue", "mummy": "blue", "lich": "blue",
    "bat": "violet", "ghoul": "violet", "witch": "violet", "tree": "violet", "cat": "violet", "mimic": "violet",
    "lantern": "red", "wolf": "red", "vampire": "red", "horse": "red", "goblin": "red", "rat": "red", "scarecrow": "red",
    "pumpkin-lord": "red", "krampus": "red",
}
# the neon pixels this writer paints (palette v3's own tubes and the cold-fire core): they glow, so the _em mask has them
NEON_EM = ("#4ab8ff", "#9ae4ff", "#b07aff", "#ff3a50")
EM_1Q = tuple(EM_COLOURS) + NEON_EM
# FAMILY_COLORS keys -> material (sprite_writer's drawn families)
MAT_OF_KEY = {
    "wing": "membrane", "eye": "eye", "mouth": "mouth", "straw": "straw", "shirt": "cloth", "patch": "cloth",
    "pole": "wood", "sack": "burlap", "hat": "cloth", "band": "cloth", "bark": "bark", "leaf": "leaf", "hide": "hide",
    "mane": "hair", "hoof": "horn", "cloak": "cloth", "collar": "leather", "sheen": "hide", "fur": "fur", "nose": "skin",
    "ear": "skin", "tail": "skin", "wood": "wood", "lid": "gold", "latch": "metal", "leg": "wood", "maw": "mouth",
    "tooth": "tooth", "tongue": "mouth", "fur_hi": "fur", "fur_deep": "fur", "horn": "horn", "ridge": "horn",
    "brow": "skin", "tongue_hi": "mouth", "claw": "horn", "rope": "straw", "birch": "wood", "birch_hi": "wood",
    "ribbon": "cloth", "wicker": "straw", "weave": "burlap", "rim": "wood", "rind": "rind", "glow": "glow", "core": "glow",
    "stem": "vine", "vine": "vine", "leaf_hi": "leaf", "root": "bark",
}
# the main surface a family's runes are cut into (a FAMILY_COLORS key or a spec key)
RUNE_ON = {
    "ghost": "body", "bat": "wing", "scarecrow": "shirt", "tree": "bark", "horse": "cloak", "cat": "fur", "rat": "fur",
    "mimic": "wood", "krampus": "fur", "pumpkin-lord": "cloak",
}
BEASTS = ("wolf", "cat", "rat", "horse", "bat", "krampus")
# glyphs (rows of a bitmap; # is a stroke). Runes for the robed and the dead, claw scars for the beasts.
GLYPHS = {
    7: ["..#..|.###.|#.#.#|..#..|.#.#.|#...#|.....", "#...#|.#.#.|..#..|.###.|..#..|..#..|.....", ".###.|#...#|..#..|.###.|..#..|#.#.#|.....",
        "#.#.#|#.#.#|.###.|..#..|.#.#.|.#.#.|.....", "..#..|.#.#.|#...#|.#.#.|..#..|..#..|....."],
    5: [".#.|###|.#.|#.#|...", "#.#|.#.|###|.#.|...", "###|#.#|.#.|.#.|...", "#..|##.|.##|..#|..."],
    3: [".#.|###|.#.", "#.#|.#.|#.#"],
}
CLAWS = {7: ["#....|.#...|..#..|...#.|....#|.....|.....", "....#|...#.|..#..|.#...|#....|.....|....."], 5: ["#..|.#.|..#|...|...", "..#|.#.|#..|...|..."], 3: ["#..|.#.|..#"]}


def _materials(fam: str, rank: str) -> dict[str, tuple[str, str]]:
    """colour -> (material, the material's base colour) for one body, from its own spec."""
    M: dict[str, tuple[str, str]] = {}

    def put(c, mat, base=None):
        if c and c not in M and c != sw.INK:
            M[c] = (mat, base or c)

    def ramp(c, mat):
        if not c or c == sw.INK:
            return
        put(c, mat)
        for k in (1, 2):
            put(sw.dk(c, k), mat, c)
        put(sw.lt(c), mat, c)

    for c in EM_COLOURS + (sw.WHITE_HOT,):
        put(c, "glow")
    put("#a02030", "gem")
    key = {"pumpkin-lord": "pumpkinlord"}.get(fam, fam)
    if key in sw.MONSTERS:
        spec = dict(sw.MONSTERS[key])
        if rank == "boss":
            spec.update(sw.BOSS_DRESS.get(key, {}))
        elif rank == "rare":
            spec.update(sw.RARE_DRESS.get(key, {}))
        head = spec.get("head", "human")
        skin = {"skull": "bone", "mummy": "wrap", "wolf": "fur", "pumpkin": "rind"}.get(head, "skin")
        if spec.get("eyes") and spec["eyes"] != sw.INK:
            put(spec["eyes"], "eye")
        for c in spec.get("glow") or ():
            put(c, "glow")
        put(spec.get("topper"), "glow")
        ramp(spec["skin"], skin)
        if spec.get("hairstyle") not in ("none", "bald"):
            ramp(spec.get("hair"), "hair")
        for k in ("cloth", "pants", "sleeve", "cape", "capein", "hatc"):
            ramp(spec.get(k), "cloth")
        tr = spec.get("trim")
        ramp(tr, "gold" if tr in (sw.GOLD, "#c4a050", "#c4a15a") else "cloth")
        for k in ("belt", "boot", "gloves"):
            ramp(spec.get(k), "leather")
        for c in (spec.get("metal"), sw.STEEL, sw.STEEL_HI):
            ramp(c, "metal")
        put(sw.MINI_RED, "cloth")
        main = spec["cloth"] if M.get(spec["cloth"], ("",))[0] == "cloth" else spec.get("cape") or spec["cloth"]
        mouth = (sw.MOUTH, "#3a2830", "#6a2030", sw.BONE)
    else:
        C = sw.FAMILY_COLORS[key]
        for k, c in C.items():
            if k == "eye":
                put(c, "eye")
        for k, c in C.items():
            mat = MAT_OF_KEY.get(k, "plain")
            if k == "body":
                mat = "ecto" if key == "ghost" else "fur"
            if mat in ("eye", "mouth", "glow", "tooth"):
                put(c, mat)
            else:
                ramp(c, mat)
        main = C.get(RUNE_ON.get(fam, ""), None)
        mouth = tuple(C[k] for k in ("mouth", "maw", "tongue", "tongue_hi") if k in C)
    ramp(sw.GOLD, "gold")
    ramp(sw.BONE, "bone")
    ramp(sw.WOOD, "wood")
    M["__main__"] = ("main", main or "")
    M["__mouth__"] = ("mouth", "|".join(mouth))
    return M


def _ramp4(base: str) -> list[str]:
    return [sw.dk(base, 2), sw.dk(base), base, sw.lt(base)]


def _runs(c: np.ndarray):
    """for every pixel: how many same-coloured pixels run above (dt), below (db), left (dl), right (dr) of it."""
    h, w = c.shape
    dt = np.zeros((h, w), dtype=np.int32)
    db = np.zeros((h, w), dtype=np.int32)
    dl = np.zeros((h, w), dtype=np.int32)
    dr = np.zeros((h, w), dtype=np.int32)
    for y in range(1, h):
        dt[y] = np.where(c[y] == c[y - 1], dt[y - 1] + 1, 0)
    for y in range(h - 2, -1, -1):
        db[y] = np.where(c[y] == c[y + 1], db[y + 1] + 1, 0)
    for x in range(1, w):
        dl[:, x] = np.where(c[:, x] == c[:, x - 1], dl[:, x - 1] + 1, 0)
    for x in range(w - 2, -1, -1):
        dr[:, x] = np.where(c[:, x] == c[:, x + 1], dr[:, x + 1] + 1, 0)
    return dt, db, dl, dr


def _hash(a: np.ndarray, b: np.ndarray, seed: int) -> np.ndarray:
    v = (a.astype(np.int64) * 73856093) ^ (b.astype(np.int64) * 19349663) ^ (seed * 83492791)
    v = (v ^ (v >> 13)) * 1274126177
    return np.abs(v ^ (v >> 16))


def _seed(name: str) -> int:
    h = 0x811C9DC5
    for ch in name:
        h = ((h ^ ord(ch)) * 0x01000193) & 0xFFFFFFFF
    return h & 0xFFFF


def _glyph(rows: str) -> list[tuple[int, int]]:
    return [(x, y) for y, r in enumerate(rows.split("|")) for x, ch in enumerate(r) if ch == "#"]


def detail(lay: np.ndarray, one: np.ndarray, s: int, M: dict, fam: str, view: int) -> np.ndarray:
    """playtest1q: one big cell painted in full detail over its magnified layout `lay` (codes; its alpha is kept)
    from the 1x cell `one`. view: 0 front, 1 back, 2 east, 3 west."""
    out = lay.copy()
    on = lay != 0
    ink = lay == INK
    body = on & ~ink
    hexes = {int(v): _hex(int(v)) for v in np.unique(lay[body])}
    seed = _seed(fam)
    neon = NEON[NEON_OF[fam]]
    tube, mid, core = _code(neon[3]), _code(neon[2]), _code("#9ae4ff" if NEON_OF[fam] == "blue" else sw.WHITE_HOT)
    hot = _code(sw.WHITE_HOT)
    dt, db, dl, dr = _runs(lay)
    yy, xx = np.indices(lay.shape)
    W, Hh = dl + dr + 1, dt + db + 1
    hs = _hash(dl, dt, seed)
    tl = 1 if s <= 3 else 2
    em_bad = {_code(c) for c in EM_1Q}
    # the face box: the head's own colours in the body's top rows (1x), grown by a pixel
    ys1 = np.nonzero((one != 0).any(1))[0]
    top1 = int(ys1[0]) if len(ys1) else 0
    mouth_cols = {_code(c) for c in M["__mouth__"][1].split("|") if c}
    eye_cols = {_code(c) for c, (m, _) in M.items() if m == "eye" and c.startswith("#")}
    face_rows = (top1, top1 + (17 if fam in ("krampus", "ghost") else 14 if fam != "tree" else 32))
    # the materials, painted region by region: texture inside, then light from above and shade below and right
    for v, c in hexes.items():
        mat, base = M.get(c, ("plain", c))
        if mat in ("glow", "eye", "gem", "tooth", "mouth", "main"):
            continue
        m = lay == v
        R = _ramp4(base)
        i = R.index(c) if c in R else 2
        if c not in R:
            R = _ramp4(c)
        lit_c, dk_c, deep_c = R[min(3, i + 1)], R[max(0, i - 1)], R[max(0, i - 2)]
        L, D, DD = _code(lit_c), _code(dk_c), _code(deep_c)
        if L in em_bad:
            L = v
        if D in em_bad:
            D = v
        if DD in em_bad:
            DD = D
        inner = m & (dt >= tl) & (db >= tl) & (dl >= 1) & (dr >= 1)
        tex_d = np.zeros(lay.shape, dtype=bool)
        tex_l = np.zeros(lay.shape, dtype=bool)
        big = (W >= 3 * s) & (Hh >= 3 * s)
        if mat == "cloth" and sum(int(c[k:k + 2], 16) for k in (1, 3, 5)) < 200:
            L2 = _code(R[min(3, i + 1)])
            L = L2 if L2 not in em_bad else L
        if mat == "cloth":
            # folds hang from a third of the way down: a crease with its lit edge beside it
            for f in (0.3, 0.68) + ((0.5,) if s >= 4 else ()):
                fx = np.rint((W - 1) * f).astype(np.int32) + ((dt // (3 * s)) % 2 if s >= 3 else 0)
                hang = (dt >= Hh // 3) & big
                tex_d |= inner & hang & (dl == fx)
                tex_l |= inner & hang & (dl == fx - 1) & (s >= 3)
            tex_d |= inner & (hs % (41 + s) == 0)
        elif mat == "metal":
            band = 2 * s
            tex_d |= inner & (dt % band == band - 1) & (dt > 0)
            tex_l |= inner & (dt % band == 0) & (dt > 0)
            tex_l |= inner & ((dl == 1) | (dr == 1)) & (dt % band == s) & (s >= 3)   # rivets
            tex_l |= inner & (dl == np.maximum(1, W // 4)) & (dt < Hh // 2)   # the plate's shine
        elif mat == "gold":
            tex_l |= inner & (dl % 3 == 1) & (dt <= 1)
            tex_d |= inner & (db == 0) & (dl % 2 == 0)
        elif mat == "bone":
            seedm = inner & (hs % (53 + 3 * s) == 0)
            crack = seedm | _sh(seedm, -1, -1, False) | (_sh(seedm, -2, -1, False) & (s >= 3))
            tex_d |= crack & m
            tex_d |= inner & (hs % 71 == 5)
            tex_l |= inner & (dl == 1) & (dt % (2 * s) < s)   # the bone's lit ridge
        elif mat == "skin":
            if fam in ("zombie", "ghoul", "goblin", "krampus"):   # rot, warts and scars on the foul ones
                tex_d |= inner & (hs % 29 == 0)
                tex_l |= inner & (hs % 43 == 7)
            if fam == "zombie":   # stitches across the dead flesh
                st = inner & (dt == Hh // 2) & (dl % 3 == 1) & big
                tex_d |= st | (_sh(st, -1, 0, False) & m) | (_sh(st, 1, 0, False) & m)
        elif mat == "wrap":
            tex_d |= inner & (((dt + dl // 2) % (s + 2)) == 0)
            tex_l |= inner & (((dt + dl // 2) % (s + 2)) == 1)
            tex_d |= inner & (hs % 37 == 0)
        elif mat in ("fur", "hair"):
            strand = inner & (((dl + 2 * dt) % 4) == 0) & (hs % 3 != 0)
            tex_d |= strand
            tex_l |= inner & (((dl + 2 * dt) % 4) == 2) & (hs % 5 == 0)
        elif mat in ("bark", "wood"):
            grain = inner & (dl % 3 == 1) & (((dt + hs % 5) % 7) != 0)
            tex_d |= grain
            knot = inner & (hs % (97 + s) == 0) & big
            tex_d |= (_sh(knot, 0, 1, False) | _sh(knot, 0, -1, False) | _sh(knot, 1, 0, False) | _sh(knot, -1, 0, False)) & m
            tex_l |= knot
        elif mat == "leaf":
            tex_l |= inner & (hs % 7 == 0)
            tex_d |= inner & (hs % 11 == 3)
        elif mat == "straw":
            tex_l |= inner & (dl % 2 == 0) & (hs % 4 != 0)
            tex_d |= inner & (dl % 4 == 3)
        elif mat == "burlap":
            tex_d |= inner & ((dl + dt) % 4 == 0)
            tex_l |= inner & ((dl - dt) % 4 == 2) & (hs % 2 == 0)
        elif mat == "rind":
            for f in (0.25, 0.5, 0.75):
                bend = np.rint((W - 1) * f + (np.abs(dt - Hh / 2) / np.maximum(1, Hh)) * (W * (f - 0.5))).astype(np.int32)
                tex_d |= inner & (dl == bend)
                tex_l |= inner & (dl == bend + 1) & (s >= 3)
        elif mat == "ecto":
            tex_l |= inner & (((dl * 3 + dt) % 11) == 0)
            tex_d |= inner & (((dl + dt * 2) % 13) == 0) & (db < Hh // 2)
        elif mat == "membrane":
            tex_d |= inner & ((dl == dt) | (dl == 2 * dt) | (dr == dt)) & (dt > 0)
            tex_l |= inner & (dt == 1)
        elif mat == "horn":
            tex_d |= inner & (dt % 3 == 2)
        elif mat == "hide":
            tex_l |= inner & (dl >= W * 3 // 10) & (dl <= W * 4 // 10) & (dt < Hh // 2)
            tex_d |= inner & (hs % 31 == 0)
        elif mat == "leather":
            tex_l |= inner & (dt == tl) & (dl % 2 == 0)
            tex_d |= inner & (hs % 23 == 0)
        elif mat == "vine":
            tex_l |= inner & (dl == 1)
        out = np.where(tex_l, L, out)
        out = np.where(tex_d, D, out)
        # light from above, shade below and to the right; a deeper step on the underside of big shapes
        roomy = (Hh >= 2 * s) & (W >= 2 * s)
        lit = m & (dt < tl) & roomy
        dith = m & (dt == tl) & ((xx + yy) % 2 == 0) & (s >= 4) & roomy
        dark = m & ~lit & ((db < tl) | (dr < tl)) & roomy
        deep = m & ~lit & (db == 0) & (Hh >= 3 * s) & (s >= 3)
        out = np.where(lit | dith, L, out)
        out = np.where(dark, D, out)
        out = np.where(deep, DD, out)
    # glow: a white-hot core in each lamp, flame and orb (its colour kept round it)
    for v, c in hexes.items():
        if M.get(c, ("",))[0] == "glow" and c != sw.WHITE_HOT:
            m = lay == v
            ctr = m & (dt == Hh // 2) & (dl == W // 2) & (W >= 3) & (Hh >= 3)
            out = np.where(ctr, hot, out)
        if M.get(c, ("",))[0] == "gem":
            m = lay == v
            out = np.where(m & (dt == 0) & (dl == 0), _code("#c43838"), out)
            out = np.where(m & (dt == Hh // 2) & (dl == W // 2), tube, out)
    # faces: eyes with a lid, the iris, a glowing core and (3x and up) a halo of the family's neon; mouths with teeth
    fr = (yy >= face_rows[0] * s) & (yy < face_rows[1] * s)
    eyes = np.isin(lay, list(eye_cols)) & fr if eye_cols else np.zeros(lay.shape, dtype=bool)
    if view != 1 and eyes.any():
        if s >= 3:
            out = np.where(eyes & (dt == 0) & (Hh >= 2), INK, out)   # the lid
        coreat = eyes & (dt == (1 if s >= 3 and Hh.max() >= 2 else 0)) & (dl == min(1, s - 1))
        out = np.where(coreat, tube, out)
        out = np.where(eyes & (dt == Hh - 1) & (dr == 0) & (s >= 3), core, out)
        if s >= 3:
            # the glow spills a pixel out of each side of the eye, on its lower half (never a ring: that reads as glasses)
            lower = eyes & (db < np.maximum(1, Hh // 2))
            ring = (_sh(lower, 0, 1, False) | _sh(lower, 0, -1, False)) & ~eyes & body & ~np.isin(lay, list(mouth_cols)) & (lay != INK)
            out = np.where(ring, mid, out)
    mouths = np.isin(lay, list(mouth_cols)) & fr & body if mouth_cols else np.zeros(lay.shape, dtype=bool)
    if eyes.any():
        mouths &= yy > int(np.nonzero(eyes.any(1))[0][-1])   # a mouth is below the eyes (a skull's nose is not one)
    if view != 1 and mouths.any() and s >= 2:
        teeth = mouths & (dt < (2 if s >= 4 else 1)) & ((dl % 2) == 0)
        out = np.where(mouths & ~teeth & (dt >= 1), _code("#3a2830") if _code(sw.BONE) not in mouth_cols else out, out)
        out = np.where(teeth, _code(sw.BONE), out)
        out = np.where(teeth & (dt == 1), _code(sw.dk(sw.BONE)), out)
    # runes (or claw scars on a beast) cut into the main surface in the family's neon, low on the robe or the hide
    mainc = M["__main__"][1]
    if mainc:
        mv = _code(mainc)
        mm = lay == mv
        cols = np.nonzero(mm.any(0))[0]
        if len(cols) >= 3:
            g = 7 if s == 5 else 5 if s == 3 else 3
            bank = CLAWS if fam in BEASTS else GLYPHS
            gw = len(bank[g][0].split("|")[0])
            cx = int(np.median(np.nonzero(mm)[1]))
            band = mm[:, max(0, cx - 4 * s):cx + 4 * s + 1].any(1)
            rows = np.nonzero(band)[0]
            if len(rows):
                yb = int(rows[-1]) - s
                n = {5: 3, 3: 2, 2: 1}[s]
                step = gw + 2
                x0 = cx - (n * step - 2) // 2
                for k in range(n):
                    rune = bank[g][(seed + k) % len(bank[g])]
                    pts = _glyph(rune)
                    gh = len(rune.split("|"))
                    for (px_, py_) in pts:
                        X, Y = x0 + k * step + px_, yb - gh + py_
                        if 0 <= Y < lay.shape[0] and 0 <= X < lay.shape[1] and mm[Y, X]:
                            out[Y, X] = tube
                    mx, my = x0 + k * step + gw // 2, yb - gh + gh // 2
                    if 0 <= my < lay.shape[0] and 0 <= mx < lay.shape[1] and out[my, mx] == tube:
                        out[my, mx] = core
    out = np.where(on, out, 0)
    return out


def _face_keep(pad: np.ndarray, M: dict) -> np.ndarray:
    """playtest1q: the face (the head's skin in the body's top 12 rows) keeps its drawn blocks when the inside of a body
    is rounded, so the eyes, brows and mouth stay where the 1x face put them."""
    skin = {_code(c) for c, (m, _) in M.items() if c.startswith("#") and m in ("skin", "bone", "wrap", "rind")}
    ys = np.nonzero((pad != 0).any(1))[0]
    top = int(ys[0]) if len(ys) else 0
    rows = np.zeros(pad.shape, dtype=bool)
    rows[top:top + 12] = True
    return rows & np.isin(pad, list(skin))


def sheet(front: Image.Image, dirs: Image.Image, start: int, s: int, fam: str | None = None, rank: str | None = None) -> Image.Image:
    """Eleven poses from cell `start` of a strip and its -dirs sheet, at scale s: four views down. With a family
    (playtest1q) each cell is painted in full detail over the magnified layout; without, playtest1p's magnifier."""
    M = _materials(fam, rank or "boss") if fam else None
    rows = [front.crop((start * 16, 0, (start + POSES) * 16, 32))] + [dirs.crop((start * 16, r * 32, (start + POSES) * 16, r * 32 + 32)) for r in range(3)]
    src = np.vstack([_codes(r) for r in rows])
    ramp = _ramps(np.unique(src[src != 0]))
    out = np.zeros((src.shape[0] * s, src.shape[1] * s), dtype=np.int64)
    for v in range(4):
        for p in range(POSES):
            cell = src[v * 32:(v + 1) * 32, p * 16:(p + 1) * 16]
            # one pixel of room round the cell so the outline's rounding never reads off the edge
            pad = np.zeros((34, 18), dtype=np.int64)
            pad[1:33, 1:17] = cell
            if M is None:
                big = magnify(pad, s, ramp)[s:33 * s, s:17 * s]
            else:
                big = detail(magnify(pad, s, ramp, lines_only=True, keep=_face_keep(pad, M))[s:33 * s, s:17 * s], cell, s, M, fam, v)
            out[v * 32 * s:(v + 1) * 32 * s, p * 16 * s:(p + 1) * 16 * s] = big
    return _image(out)


def em_mask(im: Image.Image) -> Image.Image:
    """The glow mask: the flame and eye colours (as foes_em.png) and, since playtest1q, the neon this writer paints."""
    keep = {_code(c) for c in EM_1Q}
    c = _codes(im)
    return _image(np.where(np.isin(c, list(keep)), c, 0))


def _check(name: str, im: Image.Image) -> None:
    a = np.asarray(im.convert("RGBA"))
    alpha = a[..., 3]
    if not np.isin(alpha, (0, 255)).all():
        raise SystemExit(f"{name}: soft alpha")
    cols = {f"#{r:02x}{g:02x}{b:02x}" for r, g, b in a[alpha == 255][:, :3].reshape(-1, 3).tolist()}
    bad = sorted(cols - set(LOCKED_V3))   # playtest1q: palette v3 (its neon tubes)
    if bad:
        raise SystemExit(f"{name}: off-palette {bad[:6]}")


def main(out: Path | None = None) -> dict[str, Image.Image]:
    import make_gravewake as m

    out = out or m.OUT
    big = out / "big"
    big.mkdir(parents=True, exist_ok=True)
    made: dict[str, Image.Image] = {}
    foes, foes_dirs = Image.open(out / "foes.png").convert("RGBA"), Image.open(out / "foes-dirs.png").convert("RGBA")
    for fi, fam in enumerate(m.FAMILIES):
        for rank, s in BIG.items():
            start = (fi * len(m.RANKS) + m.RANKS.index(rank)) * POSES
            made[f"{fam}-{rank}.png"] = sheet(foes, foes_dirs, start, s, fam, rank)
    made["mimic-rare.png"] = sheet(Image.open(out / "mimic.png"), Image.open(out / "mimic-dirs.png"), 0, BIG["rare"], "mimic", "rare")
    for name in ("pumpkin-lord", "krampus"):
        made[f"{name}-boss.png"] = sheet(Image.open(out / f"{name}.png"), Image.open(out / f"{name}-dirs.png"), 0, BIG["boss"], name, "boss")
    for n in list(made):
        made[n[:-4] + "_em.png"] = em_mask(made[n])
    for n, im in made.items():
        _check(n, im)
        im.save(big / n, optimize=True)
    return made


if __name__ == "__main__":
    print(len(main()), "sheets")
