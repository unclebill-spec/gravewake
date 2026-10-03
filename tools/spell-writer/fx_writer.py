"""FX writer (playtest1h, 2026-10-02): the cast, impact, area and whirl pictures that frame the spell writer's bolts.
[OWNER-REQUESTED 2026-10-02 19:43 ET: playtest1h art and loading audit]

Bill (2026-10-02 19:43 ET): "make sure ... there are spell effects that show correctly when spells are cast". The bolts,
beams and orbs (spell_writer.py) fly; this writer draws the three beats around them, in the gloom-and-glow look:

    impact(el, i)   32x32, six frames: a round hit at the target: a hot core, a broken ring that runs out and crumbles,
                    eight thrown chips with short tails (the old hit was the 16 px nova strip at 2x, which read as a box)
    shock(el, i)    64x32, six frames: an area burst on the ground at the caster's feet (a 3/4 ellipse that runs out to
                    the edge of the cell, its rim dithered, motes rising inside) for Earthshatter, Summon Shade, Grave Nova,
                    Vanish, the stances and the cries; it reads as an area, not a dot
    cast(el, i)     16x16, four frames: a turning four-point sigil at the casting hand for the cast beat
    whirl(i)        48x24, six frames: Whirl's foot dust ring (rules/GAME_LAYOUT_TWO.txt: "Whirl = dust-ring quad, not 40
                    specks"), a swept arc with a blade glint

Every colour is palette v3 (LOCKED_V3), one colour a pixel, hard alpha, drawn on the pixel writer's snapping Canvas.
The signature glows lead: neon blue cold fire for ice and holy cores, violet for shadow, red for fire.
"""

from __future__ import annotations

import math
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parent / "pixel-writer"))
sys.path.insert(0, str(HERE.parent / "sprite-writer"))

from wild_writer import Canvas, ramp  # noqa: E402  (palette v3 snapping canvas)
from palette_locked import NEON  # noqa: E402

TAG = "[OWNER-REQUESTED 2026-10-02 19:43 ET: playtest1h art and loading audit]"
B, V, R = NEON["blue"], NEON["violet"], NEON["red"]
# dark, mid, bright, tube, hot, core
EL = {
    "fire": (R[1], "#8a3018", R[2], R[3], "#f0c080", R[5]),
    "ice": (B[1], B[2], B[3], B[3], B[4], B[5]),
    "lightning": ("#6a5030", "#c4a050", "#e0c060", "#f4e27a", "#fff8e0", "#fff8e0"),
    "venom": ("#1e3428", "#2a6848", "#4a8a48", "#6aaa58", "#c8e080", "#e8f0c0"),
    "shadow": (V[1], V[2], V[2], V[3], V[4], V[5]),
    "holy": ("#6a5030", "#e0c060", "#f4e27a", B[4], "#fff8e0", B[5]),
}
ELEMENTS = tuple(EL)
BAYER = ((0, 8, 2, 10), (12, 4, 14, 6), (3, 11, 1, 9), (15, 7, 13, 5))


def _ramp(el: str) -> tuple[str, ...]:
    r = EL[el]
    out = ramp(*r)
    # keep six slots even if two locked steps coincide
    return tuple(out[min(i, len(out) - 1)] for i in range(6)) if len(out) < 6 else out


def _keep(x: int, y: int, fade: float) -> bool:
    """Ordered dither: keep a pixel while its Bayer step is above the fade (0 keeps all, 1 keeps none)."""
    return BAYER[y & 3][x & 3] / 16 >= fade


def impact(el: str, i: int) -> Canvas:
    c = Canvas(32, 32)
    dk, md, br, tube, hot, core = _ramp(el)
    cx, cy = 15.5, 15.5
    t = i / 5
    # the hot core: full on the first beats, then a small ember
    core_r = (5.0, 4.2, 3.2, 2.2, 1.4, 0.0)[i]
    for y in range(32):
        for x in range(32):
            d = math.hypot(x - cx, y - cy)
            if d <= core_r:
                c.set(x, y, core if d < core_r * 0.55 else hot)
            elif d <= core_r + 1.2 and i < 4:
                c.set(x, y, tube)
    # the ring: runs out from 6 to 14 px, two pixels thick, crumbling by the dither as it goes
    rr = 5.5 + t * 9.0
    for y in range(32):
        for x in range(32):
            d = math.hypot(x - cx, y - cy)
            if abs(d - rr) <= 1.0 and _keep(x, y, max(0.0, t - 0.25) * 1.1):
                inner = d < rr
                c.set(x, y, (tube if inner else br) if i < 3 else (br if inner else md))
            elif abs(d - (rr - 2.0)) <= 0.5 and i < 4 and _keep(x + 1, y, 0.45 + t * 0.4):
                c.set(x, y, dk)
    # eight chips thrown out on the diagonals and axes, each with a two-pixel tail
    for k in range(8):
        a = k * math.pi / 4 + (math.pi / 8 if k % 2 else 0.0)
        reach = 4 + t * 11 + (k % 3)
        if i == 5 and k % 2:
            continue
        hx, hy = cx + math.cos(a) * reach, cy + math.sin(a) * reach
        c.set(int(round(hx)), int(round(hy)), hot if i < 3 else tube)
        for s, col in ((1.6, br), (3.0, md)):
            c.set(int(round(cx + math.cos(a) * (reach - s))), int(round(cy + math.sin(a) * (reach - s))), col)
    return c


def shock(el: str, i: int) -> Canvas:
    c = Canvas(64, 32)
    dk, md, br, tube, hot, core = _ramp(el)
    cx, cy = 31.5, 17.5
    t = i / 5
    rx = 7 + t * 23.5
    ry = rx * 0.48
    for y in range(32):
        for x in range(64):
            e = math.hypot((x - cx) / rx, (y - cy) / ry)
            # the rim: bright on the near (lower) side, its tube colour on the far side, crumbling late
            if abs(e - 1.0) * rx <= 1.1 and _keep(x, y, max(0.0, t - 0.45) * 1.4):
                c.set(x, y, (br if y >= cy else tube) if i < 4 else md)
            elif abs(e - 0.82) * rx <= 0.6 and _keep(x, y + 1, 0.5 + t * 0.3):
                c.set(x, y, dk)
            elif e < 0.7 and i < 3 and _keep(x * 3 + i, y * 5, 0.86):
                c.set(x, y, md)
    # motes rising inside the ring
    for k in range(10):
        a = k * 2 * math.pi / 10 + i * 0.25
        mx = cx + math.cos(a) * rx * 0.62
        my = cy + math.sin(a) * ry * 0.62 - t * 7 - (k % 3)
        if i < 5 or k % 2 == 0:
            c.set(int(round(mx)), int(round(my)), hot if k % 3 == 0 else tube)
            c.set(int(round(mx)), int(round(my)) + 1, br)
    # the flash at its heart on the first two beats
    if i < 2:
        for y in range(32):
            for x in range(64):
                if math.hypot((x - cx) / 2.0, (y - cy)) <= 2.2 - i * 0.6:
                    c.set(x, y, core)
    return c


def cast(el: str, i: int) -> Canvas:
    c = Canvas(16, 16)
    dk, md, br, tube, hot, core = _ramp(el)
    cx, cy = 7.5, 7.5
    a0 = i * math.pi / 8
    r = 3.5 + (i % 2) * 1.5
    for k in range(4):
        a = a0 + k * math.pi / 2
        px, py = int(round(cx + math.cos(a) * r)), int(round(cy + math.sin(a) * r))
        c.set(px, py, hot)
        c.set(int(round(cx + math.cos(a) * (r - 1.5))), int(round(cy + math.sin(a) * (r - 1.5))), tube)
        c.set(int(round(cx + math.cos(a + 0.5) * (r - 0.5))), int(round(cy + math.sin(a + 0.5) * (r - 0.5))), md)
    for y in range(16):
        for x in range(16):
            d = math.hypot(x - cx, y - cy)
            if d <= 1.2:
                c.set(x, y, core)
            elif d <= 2.0 and i != 3:
                c.set(x, y, br)
    return c


DUST = ("#5a4834", "#8a7a64", "#c4b49a", "#e6dcc8")


def whirl(i: int) -> Canvas:
    c = Canvas(48, 24)
    cx, cy = 23.5, 13.5
    t = i / 5
    rx = 9 + t * 12.5
    ry = rx * 0.45
    sweep = 2 * math.pi * (0.45 + 0.55 * min(1.0, t * 1.6))
    start = -math.pi / 2 + i * 0.9
    for y in range(24):
        for x in range(48):
            e = math.hypot((x - cx) / rx, (y - cy) / ry)
            if abs(e - 1.0) * rx > 1.3:
                continue
            a = (math.atan2((y - cy) / ry, (x - cx) / rx) - start) % (2 * math.pi)
            if a > sweep:
                continue
            lead = a / sweep  # 0 at the tail, 1 at the leading edge
            if not _keep(x, y, max(0.0, 0.55 - lead) + max(0.0, t - 0.6)):
                continue
            c.set(x, y, DUST[3] if lead > 0.9 else DUST[2] if lead > 0.6 else DUST[1] if lead > 0.3 else DUST[0])
    # the blade glint at the leading edge
    a = start + sweep
    for s in (0.0, 1.0, 2.0):
        gx = int(round(cx + math.cos(a) * (rx - s)))
        gy = int(round(cy + math.sin(a) * (ry - s * 0.45)))
        c.set(gx, gy - 1, "#fff8e0" if s == 0 else B[4])
    return c


def strips() -> dict:
    """Every strip this writer makes, by file name (frames side by side)."""
    from pixel_writer import cells

    out = {}
    for el in ELEMENTS:
        out[f"impact-{el}.png"] = cells([impact(el, i) for i in range(6)])
        out[f"shock-{el}.png"] = cells([shock(el, i) for i in range(6)])
        out[f"cast-{el}.png"] = cells([cast(el, i) for i in range(4)])
    out["whirl.png"] = cells([whirl(i) for i in range(6)])
    return out
