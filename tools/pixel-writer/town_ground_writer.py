"""townwide (Bill, 2026-10-22: "The ground must be more than one flat colour"): the town lawn's patch cells.

Reads each season's town lawn (public/art/writer/season-<s>-town-grass.png, 7 cells of 16x16) and writes
season-<s>-town-ground.png, 28 cells: 0-6 the lawn as it is, 7-13 the lawn half dithered (checker) to its own darker
loam colour, 14-20 the loam, 21-27 the lawn with a quarter of its ground pixels lifted to its own lighter tone.
Only the ground colour (the sheet's commonest) is swapped, and only to colours already in that season's sheet (its 2nd
and 3rd commonest), so the season palette lock holds and every tuft, leaf and stone is untouched.
Run from the repo root: python3 tools/pixel-writer/town_ground_writer.py
"""
from collections import Counter
from PIL import Image

SEASONS = ["autumn", "winter", "spring", "summer"]
D = "public/art/writer"


def build(season: str) -> Image.Image:
    src = Image.open(f"{D}/season-{season}-town-grass.png").convert("RGBA")
    common = [c for c, _ in Counter(src.getdata()).most_common(3)]
    base, loam, pale = common
    w, h = src.size
    out = Image.new("RGBA", (w * 4, h))
    for k, rule in enumerate([
        lambda x, y: None,
        lambda x, y: loam if (x + y) % 2 == 0 else None,
        lambda x, y: loam,
        lambda x, y: pale if x % 2 == 0 and (y + (x // 2)) % 2 == 0 else None,
    ]):
        cell = src.copy()
        px = cell.load()
        for y in range(h):
            for x in range(w):
                if px[x, y] == base:
                    c = rule(x, y)
                    if c is not None:
                        px[x, y] = c
        out.paste(cell, (k * w, 0))
    return out


if __name__ == "__main__":
    for s in SEASONS:
        build(s).save(f"{D}/season-{s}-town-ground.png")
        print("wrote", f"{D}/season-{s}-town-ground.png")
