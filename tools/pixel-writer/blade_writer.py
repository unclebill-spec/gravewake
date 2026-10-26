"""Swinging-blade trap writer (FEATURE_TASKS #3, MB sprint 2026-10-26).

blade.png: 16x16 cells, palette v3 only (checked on write against palette_locked.LOCKED_V3).
  0 the floor slot the pendulum rides over (drawn on the trap's middle tile)
  1 blade leaning left, 2 blade upright, 3 blade leaning right (the swing frames)
Same hand as pixel_writer.spike_grate: iron ramp, a 1 px LINE edge, a pale honed edge.
Run: python3 tools/pixel-writer/blade_writer.py
"""

from __future__ import annotations

import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
sys.path.insert(0, str(HERE.parent / "sprite-writer"))

from pixel_writer import Tile, strip  # noqa: E402
from palette_locked import LOCKED_V3  # noqa: E402

LINE = "#140c10"
IRON = ("#2a2428", "#4a4a50", "#6a6e78")
HI = "#8a9098"
EDGE = "#c8c8d0"


def slot() -> Tile:
    """A dark groove across the tile with iron lips: where the blade passes."""
    t = Tile()
    t.rect(0, 7, 16, 3, LINE)
    t.rect(0, 6, 16, 1, IRON[1])
    t.rect(0, 10, 16, 1, IRON[0])
    for x in (1, 7, 13):
        t.rect(x, 6, 2, 1, IRON[2])
    return t


def blade(lean: int) -> Tile:
    """A crescent axe-head on a haft. lean -1 left, 0 upright, 1 right (the haft tilts, the head trails)."""
    t = Tile()
    # Haft: from the top of the cell down to the head, shifted by lean per row.
    for y in range(0, 8):
        x = 7 + (lean * (7 - y)) // 3
        t.set(x, y, IRON[0])
        t.set(x + 1, y, IRON[1])
    # Head: a crescent, widest at row 11.
    rows = {8: (5, 11), 9: (4, 12), 10: (3, 13), 11: (3, 13), 12: (3, 13), 13: (4, 12), 14: (6, 10)}
    for y, (a, b) in rows.items():
        t.rect(a, y, b - a, 1, IRON[2])
        t.set(a, y, LINE)
        t.set(b - 1, y, LINE)
    t.rect(5, 9, 2, 3, HI)
    # Honed edge along the bottom of the crescent.
    t.rect(4, 13, 8, 1, EDGE)
    t.rect(6, 14, 4, 1, EDGE)
    t.rect(6, 15, 4, 1, LINE)
    return t


def sheet():
    tiles = [slot(), blade(-1), blade(0), blade(1)]
    for tl in tiles:
        for row in tl.p:
            for c in row:
                assert c is None or c in LOCKED_V3, c
    return strip(tiles)


if __name__ == "__main__":
    out = HERE.parents[1] / "public" / "art" / "writer" / "blade.png"
    sheet().save(out)
    print("wrote", out)
