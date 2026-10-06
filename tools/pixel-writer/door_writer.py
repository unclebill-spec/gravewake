"""Door writer (playtest1w, [OWNER-APPROVED 2026-10-06 00:16 ET: playtest1w polish]).

Bill (2026-10-06 00:16 ET, "Fix all those things you mentioned", 1v's open item: building doors were 0.45-0.67x the hero):
every town building, village building and hamlet lot gets a door that fits the 16x32 hero: DOOR_H px tall frame and
step included (36 px = 1.125x the hero's 32 px cell, 1.2x his 30 px body), at least DOOR_W wide.

Each building is house_writer's own design, redrawn with a taller ground storey: the design's source (house_writer.VARIANTS
and HAMLET_DESIGNS, read with inspect) is replayed with every head-height-and-up length measured from the ground (b.base -
K, K >= LIFT_FROM) and every wall top (wt = b.base - N, wt = body - N, the cottage's wall_h) raised by LIFT px, so the
ground floor, its windows, lamps, porch, beams and the wall top all rise together and the roof gives up the same height
(its ridge and apexes are clamped inside the cell: the lot, its headroom, the grid and collision are unchanged). The
door itself is drawn last, over whatever the design left there, at its new size, on the same door tile. Nothing in
house_writer.py changes (the 1t/1u sheets and their checks stay as they were); the new sheets are town-bldg2-<room>.png
and hamlet2-<kind>.png (+ _em), same cells, same lamps.
"""

from __future__ import annotations

import inspect
import re

import house_writer as H

DOOR_H = 36  # frame top to the step, inclusive
DOOR_W = 12
LIFT = 16
LIFT_FROM = 15
TAG = "[OWNER-APPROVED 2026-10-06 00:16 ET: playtest1w polish]"

_BASE_K = re.compile(r"b\.base - (\d+)(?![\d.])")


def _lift_source(src: str) -> str:
    out = []
    for line in src.split("\n"):
        s = line
        if re.match(r"\s*body = b\.base - \d+", s):
            out.append(s)  # a stilt house's deck stays where it was; its walls rise from it (below)
            continue
        s = re.sub(r"wt = body - (\d+)", lambda m: f"wt = body - ({m.group(1)} + LIFT)", s)
        s = s.replace("wall_h = 30 if b.h < 100 else 36", "wall_h = (30 if b.h < 100 else 36) + LIFT")
        s = _BASE_K.sub(lambda m: f"b.base - ({m.group(1)} + LIFT)" if int(m.group(1)) >= LIFT_FROM else m.group(0), s)
        out.append(s)
    return "\n".join(out)


def _namespace() -> dict:
    ns = dict(H.__dict__)
    ns["LIFT"] = LIFT
    doors: list = []
    ns["_doors"] = doors

    def door(b, cx, w=10, h=18, kind="plank", glow=None, arch=False):
        doors.append(("door", b, cx, w, kind, glow, arch, None))

    def barred_door(b, cx, w=10, h=16, kind="plank", style="bar"):
        doors.append(("barred", b, cx, w, kind, None, False, style))

    def roof_gable(b, cx, half, eave, apex, kind, row=3, wall=None, wall_top=None):
        return H.roof_gable(b, cx, half, eave, max(1, min(apex, eave - 6)), kind, row=row, wall=wall, wall_top=wall_top)

    def roof_side(b, x0, x1, eave, ridge, kind, inset=6, row=3):
        return H.roof_side(b, x0, x1, eave, max(1, min(ridge, eave - 4)), kind, inset=inset, row=row)

    def roof_hip(b, x0, x1, eave, ridge, kind, inset, row=3):
        return H.roof_hip(b, x0, x1, eave, max(1, min(ridge, eave - 4)), kind, inset, row=row)

    def chimney(b, x, top, bottom, w=6, stone=True, ember="#e07a2f", crooked=0):
        return H.chimney(b, x, max(0, top), bottom, w=w, stone=stone, ember=ember, crooked=crooked)

    ns.update(door=door, barred_door=barred_door, roof_gable=roof_gable, roof_side=roof_side, roof_hip=roof_hip, chimney=chimney)
    return ns


def _replay(fn, ns: dict):
    """fn's source with the storey lifted, compiled in ns (so its calls reach the lifted helpers and the deferred doors)."""
    name = fn.__name__
    if name in ns.get("_lifted", {}):
        return ns["_lifted"][name]
    src = _lift_source(inspect.getsource(fn))
    exec(compile(src, f"<door_writer:{name}>", "exec"), ns)
    ns.setdefault("_lifted", {})[name] = ns[name]
    return ns[name]


def _ns_for(fn) -> tuple[dict, object]:
    ns = _namespace()
    # helpers a design calls (the cottage, the small parts that measure from the ground) are lifted too
    for helper in ("cottage", "_base_dress", "h_lamp"):
        if helper in H.__dict__:
            _replay(H.__dict__[helper], ns)
    return ns, _replay(fn, ns)


# every door drawn, per cell: (sheet, variant, season) -> [(width, height px incl. frame and step)]; group playtest1w reads it
DOORS_DRAWN: dict = {}


def _draw_doors(ns: dict, key=None) -> None:
    for (what, b, cx, w, kind, glow, arch, style) in ns["_doors"]:
        ww = max(w, DOOR_W)
        if what == "door":
            H.door(b, cx, ww, DOOR_H - 2, kind=kind, glow=glow, arch=arch)
        else:
            H.barred_door(b, cx, ww, DOOR_H - 2, kind=kind, style=style)
        if key is not None:
            DOORS_DRAWN.setdefault(key, []).append((ww, DOOR_H))
    ns["_doors"].clear()


def cell(room: str, v: int, season: str):
    """town-bldg2: house_writer.cell with the storey lifted and the door drawn last at its new size."""
    w, h, dcol, head, _ = H.LOTS[room]
    b = H.B(w * 16, h * 16 + head, H.seed_of(room, v))
    ns, fn = _ns_for(H.VARIANTS[room][v])
    fn(b, season, dcol * 16 + 8)
    _draw_doors(ns, (f"town-bldg2-{room}", v, season))
    H.back_roof(b, head)
    H.season_pass(b, season)
    H.outline(b.c)
    hole = [(x, y) for y in range(head, b.h) for x in range(1, b.w - 1) if b.c.p[y][x] is None]
    assert len(hole) <= (b.w - 2) * (b.h - head) * 0.03, (room, v, season, len(hole), hole[:4])
    for y in range(b.h):
        for x in range(b.w):
            if b.em.p[y][x] and b.em.p[y][x] != b.c.p[y][x]:
                b.em.p[y][x] = None
    return b.c, b.em


def hamlet_cell(kind: str, v: int, season: str):
    w, h, head, _, _ = H.HAMLET_KINDS[kind]
    b = H.B(w * 16, h * 16 + head, H.hamlet_seed(kind, v))
    ns, fn = _ns_for(H.HAMLET_DESIGNS[kind])
    fn(b, season, (w // 2) * 16 + 8, v)
    _draw_doors(ns, (f"hamlet2-{kind}", v, season))
    H.back_roof(b, head)
    H.hamlet_backfill(b, head)
    H.hamlet_season(b, kind, season)
    H.outline(b.c)
    hole = [(x, y) for y in range(head, b.h) for x in range(1, b.w - 1) if b.c.p[y][x] is None]
    assert not hole, (kind, v, season, len(hole), hole[:6])
    for y in range(b.h):
        for x in range(b.w):
            if b.em.p[y][x] and b.em.p[y][x] != b.c.p[y][x]:
                b.em.p[y][x] = None
    return b.c, b.em


def _sheet(cw, ch, n, make):
    from PIL import Image
    art = Image.new("RGBA", (cw * 4, ch * n), (0, 0, 0, 0))
    em = Image.new("RGBA", (cw * 4, ch * n), (0, 0, 0, 0))
    for v in range(n):
        for si, s in enumerate(H.SEASONS):
            c, e = make(v, s)
            art.paste(c.image(), (si * cw, v * ch))
            em.paste(e.image(), (si * cw, v * ch))
    return art, em


def sheets() -> dict:
    out = {}
    for room, (w, h, _, head, _) in H.LOTS.items():
        a, e = _sheet(w * 16, h * 16 + head, len(H.VARIANTS[room]), lambda v, s, room=room: cell(room, v, s))
        out[f"town-bldg2-{room}.png"], out[f"town-bldg2-{room}_em.png"] = a, e
    for kind, (w, h, head, _, n) in H.HAMLET_KINDS.items():
        a, e = _sheet(w * 16, h * 16 + head, n, lambda v, s, kind=kind: hamlet_cell(kind, v, s))
        out[f"hamlet2-{kind}.png"], out[f"hamlet2-{kind}_em.png"] = a, e
    return out
