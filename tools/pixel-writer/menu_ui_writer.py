"""menus-restyle (2026-10-23, first pass for Bill's review): the menu chrome, written from the palette, never hand-drawn.
Writes src/menus/art/: frame-stone.png (24x24 9-slice, 8 px corners: carved grave-stone with iron studs),
frame-parchment.png (24x24 9-slice: iron band round old parchment, for the dialogue box), btn.png / btn-hot.png
(12x12 9-slice, 4 px: an iron-bound slate button, cold and lit), cursor-pumpkin.png / cursor-skull.png (16x16),
candle.png (2 frames of 8x16 in a 16x16 strip). Run: python3 tools/pixel-writer/menu_ui_writer.py
"""
from pathlib import Path
from PIL import Image

OUT = Path(__file__).resolve().parents[2] / "src/menus/art"
P = {
    ".": (0, 0, 0, 0), "k": (12, 8, 12, 255), "d": (36, 28, 38, 255), "s": (64, 56, 68, 255), "m": (92, 84, 96, 255),
    "l": (128, 120, 128, 255), "h": (166, 156, 158, 255), "i": (52, 44, 50, 255), "r": (110, 72, 52, 255),
    "o": (224, 122, 47, 255), "y": (247, 196, 92, 255), "w": (255, 238, 190, 255), "p": (214, 190, 146, 255),
    "q": (186, 158, 114, 255), "b": (36, 24, 32, 255), "g": (74, 104, 52, 255), "f": (36, 24, 32, 235),
}

def img(rows):
    h, w = len(rows), len(rows[0])
    im = Image.new("RGBA", (w, h))
    for y, row in enumerate(rows):
        assert len(row) == w, (y, row)
        for x, c in enumerate(row):
            im.putpixel((x, y), P[c])
    return im

def frame(edge_out, edge_hi, edge_mid, edge_lo, fill, stud, size=24, c=8):
    """A bevelled 9-slice: dark rim, lit top-left, shaded bottom-right, a stud in each corner, notched corners."""
    rows = [[fill] * size for _ in range(size)]
    for y in range(size):
        for x in range(size):
            d = min(x, y, size - 1 - x, size - 1 - y)
            if d == 0: rows[y][x] = edge_out
            elif d <= 2: rows[y][x] = edge_hi if (x <= y and x < size - 1 - y) or (y < x and y < size - 1 - x) and (x + y) < size else edge_lo
            elif d == 3: rows[y][x] = edge_mid if d else fill
            elif d == 4: rows[y][x] = "k"
    for (cx, cy) in ((0, 0), (size - 1, 0), (0, size - 1), (size - 1, size - 1)):  # notched corners
        for dx in (0, 1):
            for dy in (0, 1):
                if dx + dy < 2: rows[abs(cy - dy)][abs(cx - dx)] = "."
    for (sx, sy) in ((2, 2), (size - 5, 2), (2, size - 5), (size - 5, size - 5)):  # iron studs with a glint
        for dx in range(3):
            for dy in range(3):
                rows[sy + dy][sx + dx] = stud
        rows[sy][sx] = "h"; rows[sy + 2][sx + 2] = "k"
    return img(["".join(r) for r in rows])

def main():
    OUT.mkdir(parents=True, exist_ok=True)
    stone = frame("k", "l", "s", "d", "f", "i")
    # a crack and moss in the stone's top band (sits in the stretchable middle, reads as carved wear)
    for (x, y, c) in ((11, 1, "d"), (12, 2, "d"), (12, 1, "s"), (9, 22, "g"), (10, 22, "g"), (14, 21, "g")):
        stone.putpixel((x, y), P[c])
    stone.save(OUT / "frame-stone.png")
    parch = frame("k", "m", "i", "s", "p", "r")
    for (x, y) in ((5, 6), (18, 5), (5, 18)):  # wear in the corners only (the middle stretches)
        parch.putpixel((x, y), P["q"])
    parch.save(OUT / "frame-parchment.png")
    btn = img([
        "..kkkkkkkk..", ".kllllllllk.", "klmmmmmmmmsk", "klmddddddmsk", "klmddddddmsk", "klmddddddmsk",
        "klmddddddmsk", "klmddddddmsk", "klmddddddmsk", "klssssssssk.", ".kssssssssk.", "..kkkkkkkk..",
    ])
    btn.putpixel((11, 9), P["k"]); btn.putpixel((11, 10), P["."]); btn.putpixel((0, 10), P["."])
    btn.save(OUT / "btn.png")
    hot = btn.copy()
    for y in range(12):
        for x in range(12):
            px = hot.getpixel((x, y))
            if px == P["l"]: hot.putpixel((x, y), P["y"])
            elif px == P["m"]: hot.putpixel((x, y), P["o"])
            elif px == P["s"]: hot.putpixel((x, y), P["r"])
            elif px == P["d"]: hot.putpixel((x, y), (58, 30, 26, 255))
    hot.save(OUT / "btn-hot.png")
    img([
        "......gg........", ".....gg.........", "...kkkgkkk......", "..kooooyoook....", ".koyoooyoooyok..", ".koyookyokoyok..",
        "kooykkyoykkyook.", "kooyooyooyoyook.", "kooyoyooooyoook.", "koooykykykyoook.", ".kooykkkkkyook..", ".kooooyooooook..",
        "..kooooooooook..", "...kkkkkkkkkk...", "................", "................",
    ]).save(OUT / "cursor-pumpkin.png")
    img([
        "....kkkkkk......", "...kwwwwwwk.....", "..kwwwwwwwwk....", ".kwwwwwwwwwwk...", ".kwwkkwwkkwwk...", ".kwkkkwwkkkwk...",
        ".kwkkkwwkkkwk...", ".kwwwwkkwwwwk...", "..kwwwkkwwwk....", "...kwwwwwwk.....", "...kwkwkwkk.....", "...kkwkwkwk.....",
        "....kkkkkk......", "................", "................", "................",
    ]).save(OUT / "cursor-skull.png")
    img([
        "...y.......o....", "..yoy.....yoy...", "..ywy.....owo...", "...o.......y....", "..pwp.....pwp...", "..ppp.....ppp...",
        "..ppq.....ppq...", "..ppq.....ppq...", "..ppq.....ppq...", "..ppq.....ppq...", "..qpq.....qpq...", "..ppq.....ppq...",
        ".kiiik...kiiik..", "kiiiiik.kiiiiik.", "kkkkkkk.kkkkkkk.", "................",
    ]).save(OUT / "candle.png")

if __name__ == "__main__":
    main()
