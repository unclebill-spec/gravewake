"""Roof writer (playtest1x, [OWNER-APPROVED 2026-10-06 08:44 ET: playtest1x casino + town fixes]).

Bill (2026-10-06 08:44 ET): "reduce the roof size a little in town so that town folk aren't hidden behind roofs
constantly", then "don't eliminate roofs but maybe you can make the roof less imposing". Every town building keeps its
roof, its lot, its door (door_writer's 36 px), its walls, windows and lamps: only the part of the cell above the lot's top
edge (the roof's rise into the street behind it, chimney tops, spires, finials and toadstools) is drawn lower, its rows
taken at an even step into CUT of the headroom (nearest row, so every pixel is still a writer pixel of the same palette
and hard alpha). A roof reaches about half as far over the folk walking behind it.

Built on door_writer.cell (house_writer's own designs, the storey lifted, the 36 px door): the sheets are
town-bldg3-<room>.png (+ _em, the glow mask lowered the same way), same cells as town-bldg2 (the old sheets stay).
measure() gives each room's tallest rise over its lot top in px (every variant and season), the numbers buildings.ts
ROOF_RISE holds (group playtest1x holds them equal).
"""

from __future__ import annotations

import door_writer as dw
import house_writer as H

TAG = "[OWNER-APPROVED 2026-10-06 08:44 ET: playtest1x casino + town fixes]"
CUT = 0.5


def lower(im, head: int):
    """One cell: rows below head as they were; the headroom's rows [0, head) taken at an even step into the last
    round(head * CUT) rows above the lot; the rows above that left clear."""
    from PIL import Image

    w, h = im.size
    n = int(round(head * CUT))
    out = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    out.paste(im.crop((0, head, w, h)), (0, head))
    for j in range(n):
        src = int((j + 0.5) * head / n)
        out.paste(im.crop((0, src, w, src + 1)), (0, head - n + j))
    return out


def cell(room: str, v: int, season: str):
    w, h, dcol, head, _ = H.LOTS[room]
    c, e = dw.cell(room, v, season)
    return lower(c.image(), head), lower(e.image(), head)


def sheets() -> dict:
    from PIL import Image

    out = {}
    for room, (w, h, _, head, _) in H.LOTS.items():
        cw, ch, n = w * 16, h * 16 + head, len(H.VARIANTS[room])
        art = Image.new("RGBA", (cw * 4, ch * n), (0, 0, 0, 0))
        em = Image.new("RGBA", (cw * 4, ch * n), (0, 0, 0, 0))
        for v in range(n):
            for si, s in enumerate(H.SEASONS):
                c, e = cell(room, v, s)
                art.paste(c, (si * cw, v * ch))
                em.paste(e, (si * cw, v * ch))
        out[f"town-bldg3-{room}.png"], out[f"town-bldg3-{room}_em.png"] = art, em
    return out


def measure(made: dict | None = None, prefix: str = "town-bldg3") -> dict:
    """Each room's tallest rise over its lot's top edge (px), over every variant and season."""
    made = made or sheets()
    out = {}
    for room, (w, h, _, head, _) in H.LOTS.items():
        a = made[f"{prefix}-{room}.png"].convert("RGBA").getchannel("A")
        ch = h * 16 + head
        tops = []
        for v in range(a.height // ch):
            for y in range(ch):
                if any(a.getpixel((x, v * ch + y)) for x in range(a.width)):
                    tops.append(y)
                    break
        out[room] = max(0, head - min(tops)) if tops else 0
    return out
