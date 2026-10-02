"""screen1: home-screen icons for the game manifest (public/gravewake.webmanifest).

One 16x16 cell on the game's 16 px grid (the favicon's grave and lamp, in the shell's own colours),
scaled by whole numbers only: 12x -> 192 px, 32x -> 512 px, and (install1) 20x centred on a 512 px maskable
icon. Nearest neighbour, no smoothing.
Run: python3 tools/pixel-writer/make_icons.py
"""
from pathlib import Path
from PIL import Image

COL = {".": (0x14, 0x0E, 0x12), "g": (0x1C, 0x3A, 0x28), "s": (0xF0, 0xE2, 0xC8), "d": (0xA8, 0x94, 0x80), "o": (0xE0, 0x7A, 0x2F)}
CELL = [
    "................",
    "................",
    "......ssss......",
    ".....ssssss.....",
    "....ssssssss....",
    "....sssssssd....",
    "....sssoosdd....",
    "....sssoosdd....",
    "....sssoosdd....",
    "....sssoosdd....",
    "....ssssssdd....",
    "....ssssssdd....",
    "....ssssssdd....",
    "..gggggggggggg..",
    "..gggggggggggg..",
    "................",
]
SIZES = {192: 12, 512: 32}
# install1: the maskable 512 (Android crops it to a circle or squircle). The same cell at a whole 20x (320 px),
# centred on the shell background, so the grave sits inside the 80% safe circle (radius 204.8 px) with room to spare.
MASKABLE = {"size": 512, "k": 20}


def cell() -> Image.Image:
    assert len(CELL) == 16 and all(len(r) == 16 for r in CELL)
    im = Image.new("RGBA", (16, 16))
    for y, row in enumerate(CELL):
        for x, ch in enumerate(row):
            im.putpixel((x, y), COL[ch] + (255,))
    return im


def main(root: Path = Path(__file__).resolve().parents[2]) -> None:
    out = root / "public" / "art" / "icons"
    out.mkdir(parents=True, exist_ok=True)
    base = cell()
    for size, k in SIZES.items():
        assert 16 * k == size
        base.resize((size, size), Image.NEAREST).save(out / f"gravewake-{size}.png")
    n, k = MASKABLE["size"], MASKABLE["k"]
    art = base.resize((16 * k, 16 * k), Image.NEAREST)
    mask = Image.new("RGBA", (n, n), COL["."] + (255,))
    mask.paste(art, ((n - 16 * k) // 2, (n - 16 * k) // 2))
    mask.save(out / f"gravewake-{n}-maskable.png")
    print("icons:", ", ".join([f"gravewake-{s}.png" for s in SIZES] + [f"gravewake-{n}-maskable.png"]))


if __name__ == "__main__":
    main()
