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
"""

from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

import numpy as np
from PIL import Image

import sprite_writer as sw
from palette_locked import LOCKED

TAG = "[OWNER-APPROVED 2026-10-04 01:10 ET: playtest1p view polish and big bosses]"
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


def magnify(src: np.ndarray, s: int, ramp: dict[int, tuple[int, int]]) -> np.ndarray:
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


def sheet(front: Image.Image, dirs: Image.Image, start: int, s: int) -> Image.Image:
    """Eleven poses from cell `start` of a strip and its -dirs sheet, at scale s: four views down."""
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
            big = magnify(pad, s, ramp)[s:33 * s, s:17 * s]
            out[v * 32 * s:(v + 1) * 32 * s, p * 16 * s:(p + 1) * 16 * s] = big
    return _image(out)


def em_mask(im: Image.Image) -> Image.Image:
    keep = {_code(c) for c in EM_COLOURS}
    c = _codes(im)
    return _image(np.where(np.isin(c, list(keep)), c, 0))


def _check(name: str, im: Image.Image) -> None:
    a = np.asarray(im.convert("RGBA"))
    alpha = a[..., 3]
    if not np.isin(alpha, (0, 255)).all():
        raise SystemExit(f"{name}: soft alpha")
    cols = {f"#{r:02x}{g:02x}{b:02x}" for r, g, b in a[alpha == 255][:, :3].reshape(-1, 3).tolist()}
    bad = sorted(cols - set(LOCKED))
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
            made[f"{fam}-{rank}.png"] = sheet(foes, foes_dirs, start, s)
    made["mimic-rare.png"] = sheet(Image.open(out / "mimic.png"), Image.open(out / "mimic-dirs.png"), 0, BIG["rare"])
    for name in ("pumpkin-lord", "krampus"):
        made[f"{name}-boss.png"] = sheet(Image.open(out / f"{name}.png"), Image.open(out / f"{name}-dirs.png"), 0, BIG["boss"])
    for n in list(made):
        made[n[:-4] + "_em.png"] = em_mask(made[n])
    for n, im in made.items():
        _check(n, im)
        im.save(big / n, optimize=True)
    return made


if __name__ == "__main__":
    print(len(main()), "sheets")
