"""Render a map-writer JSON to a full-map PNG with the game's existing writer tilesets.

    python3 tools/map-writer/render_map.py map.json out.png [scale]

The JSON is what make_gravewake.mjs writes: {theme, codes, families, map, feats}. Floors come from
public/art/writer/brick-<theme>.png and pit-<theme>.png, secrets from feat-<theme>.png, traps from
trap.png, captives from captive.png, a sleeping mimic from mimic-sleep.png, the boss spot from
boss-plaque.png, and foes from public/art/sprites/foes.png. Walls, stairs, the chest, and the room-tag
frames are painted only in colors from tools/sprite-writer/palette_locked.py.

Pixel lock: the render is opaque, nearest-neighbor scaled, and every pixel is either a locked color or
a pixel copied unchanged from one of those sheets. The script stops if not.
"""

import json
import sys
from pathlib import Path

from PIL import Image

HERE = Path(__file__).resolve().parent
ROOT = HERE.parent.parent
sys.dont_write_bytecode = True
sys.path.insert(0, str(HERE.parent / "sprite-writer"))
from palette_locked import LOCKED  # noqa: E402

ART = ROOT / "public" / "art"
TILE = 16
# Cave wall and wall light, as CAVES in src/game/draw.ts (the pixel writer keeps the same table).
WALLS = {
    "harrow": ("#3c4652", "#5a6878"),
    "ossuary": ("#4a3a58", "#6a5878"),
    "wraps": ("#6a5840", "#a08860"),
    "carrion": ("#3a4a5c", "#7aa0c0"),
    "wick": ("#4a3428", "#6a4838"),
    "warren": ("#5a4030", "#8a6840"),
    "chapel": ("#465068", "#8aa0c8"),
    "vesper": ("#3a2428", "#6a3840"),
    "drowned": ("#2a4038", "#4a6858"),
    "blackroot": ("#243028", "#3a5040"),
    "grave": ("#3a4438", "#5a6854"),
    "hearth": ("#3a2828", "#6a4038"),
    "cave": ("#3a4450", "#6a7888"),
}
ROCK = "#07060a"
MORTAR = "#1a1418"
STAIR = ("#4a3424", "#a07850", "#3a2818")
CHEST = ("#6a4818", "#c4a050", "#f0e2c8")
RIFT_RING = ("#5a5e64", "#c8b8d0")
TAG = {"start": "#48a060", "boss": "#c84848", "vault": "#c4a050"}
FOE_ORDER = ["zombie", "skeleton", "ghost", "bat", "ghoul", "witch", "lantern", "scarecrow", "wolf", "mummy", "vampire", "tree", "lich", "horse", "goblin", "cat", "rat"]


def rgb(h):
    return tuple(int(h[i : i + 2], 16) for i in (1, 3, 5))


def sheet(rel):
    return Image.open(ART / rel).convert("RGBA")


def cell(im, col, w=TILE, h=TILE):
    return im.crop((col * w, 0, col * w + w, h))


def rect(im, x, y, w, h, color):
    c = rgb(color) + (255,)
    for yy in range(max(0, y), min(im.height, y + h)):
        for xx in range(max(0, x), min(im.width, x + w)):
            im.putpixel((xx, yy), c)


def paste(im, part, x, y):
    """Paste with hard alpha only: a pixel is either the sheet's or untouched."""
    for yy in range(part.height):
        for xx in range(part.width):
            p = part.getpixel((xx, yy))
            if p[3] == 0:
                continue
            if p[3] != 255:
                raise SystemExit(f"soft pixel in a sheet at {xx},{yy}")
            tx, ty = x + xx, y + yy
            if 0 <= tx < im.width and 0 <= ty < im.height:
                im.putpixel((tx, ty), p)


def render(data):
    theme = data["theme"] if data["theme"] in WALLS else "cave"
    m, feats, codes, fam = data["map"], data["feats"], data["codes"], data["families"]
    w, h, tiles = m["w"], m["h"], m["tiles"]
    wall, hi = WALLS[theme]
    brick, pit, feat = sheet(f"writer/brick-{theme}.png"), sheet(f"writer/pit-{theme}.png"), sheet(f"writer/feat-{theme}.png")
    trap, captive, sleep, plaque = sheet("writer/trap.png"), sheet("writer/captive.png"), sheet("writer/mimic-sleep.png"), sheet("writer/boss-plaque.png")
    foes = sheet("sprites/foes.png")
    used = [brick, pit, feat, trap, captive, sleep, plaque, foes]
    im = Image.new("RGBA", (w * TILE, h * TILE), rgb(ROCK) + (255,))
    solid = {codes["wall"], codes["crack"], codes["runeDoor"], codes["brazier"], codes["statue"]}
    t = lambda x, y: tiles[y * w + x] if 0 <= x < w and 0 <= y < h else codes["wall"]

    def near_open(x, y):
        return any(t(x + dx, y + dy) not in solid for dy in (-1, 0, 1) for dx in (-1, 0, 1))

    for y in range(h):
        for x in range(w):
            gx, gy, k = x * TILE, y * TILE, t(x, y)
            if k in solid:
                if not near_open(x, y) and k == codes["wall"]:
                    continue
                rect(im, gx, gy, TILE, TILE, wall)
                for row in range(0, TILE, 5):
                    shift = 0 if ((gy + row) // 5) % 2 == 0 else 4
                    rect(im, gx, gy + row, TILE, 1, MORTAR)
                    rect(im, gx + shift, gy + row, 1, 5, MORTAR)
                    rect(im, gx + shift + 8, gy + row, 1, 5, MORTAR)
                    rect(im, gx + shift + 1, gy + row + 1, 6, 2, hi)
                if t(x, y - 1) not in solid:
                    rect(im, gx, gy, TILE, 1, hi)
                over = {codes["crack"]: 0, codes["runeDoor"]: 2, codes["brazier"]: 3, codes["statue"]: 4}.get(k)
                if over is not None:
                    paste(im, cell(feat, over), gx, gy)
                continue
            hole = (x * 13 + y * 7) % 23 == 0 and k == codes["floor"]
            paste(im, cell(pit, 0) if hole else cell(brick, abs(x * 5 + y * 3) % 4), gx, gy)
            if k in (codes["stairUp"], codes["stairDown"]):
                rect(im, gx + 2, gy + 1, 2, 14, STAIR[0])
                rect(im, gx + 12, gy + 1, 2, 14, STAIR[0])
                for i in range(5):
                    rect(im, gx + 3, gy + 1 + i * 3, 10, 2, STAIR[1])
                    rect(im, gx + 3, gy + 2 + i * 3, 10, 1, STAIR[2])
            if k == codes["chest"]:
                rect(im, gx + 3, gy + 6, 10, 7, CHEST[0])
                rect(im, gx + 3, gy + 6, 10, 3, CHEST[1])
                rect(im, gx + 7, gy + 9, 2, 2, CHEST[2])
    if m["kind"] == "rift" and m.get("exit"):
        ex, ey = m["exit"]["x"] * TILE, m["exit"]["y"] * TILE
        for i, c in enumerate(RIFT_RING):
            rect(im, ex - 2 + i, ey - 2 + i, TILE + 4 - 2 * i, 1, c)
            rect(im, ex - 2 + i, ey + TILE + 1 - i, TILE + 4 - 2 * i, 1, c)
            rect(im, ex - 2 + i, ey - 2 + i, 1, TILE + 4 - 2 * i, c)
            rect(im, ex + TILE + 1 - i, ey - 2 + i, 1, TILE + 4 - 2 * i, c)
    for tr in feats.get("traps") or []:
        paste(im, cell(trap, 0 if tr["kind"] == "spike" else 3), tr["x"] * TILE, tr["y"] * TILE)
    if feats.get("mimic"):
        paste(im, cell(sleep, 0), feats["mimic"]["x"] * TILE, feats["mimic"]["y"] * TILE)
    if feats.get("captive"):
        paste(im, cell(captive, 0), feats["captive"]["x"] * TILE, feats["captive"]["y"] * TILE)
    if m["kind"] == "dungeon":
        for r in m["rooms"]:
            if r["tag"] not in TAG:
                continue
            x0, y0, x1, y1 = r["x"] * TILE - 2, r["y"] * TILE - 2, (r["x"] + r["w"]) * TILE + 1, (r["y"] + r["h"]) * TILE + 1
            for d in (0, 1):
                rect(im, x0 + d, y0 + d, x1 - x0 + 1 - 2 * d, 1, TAG[r["tag"]])
                rect(im, x0 + d, y1 - d, x1 - x0 + 1 - 2 * d, 1, TAG[r["tag"]])
                rect(im, x0 + d, y0 + d, 1, y1 - y0 + 1 - 2 * d, TAG[r["tag"]])
                rect(im, x1 - d, y0 + d, 1, y1 - y0 + 1 - 2 * d, TAG[r["tag"]])
    if m.get("bossSpot"):
        paste(im, cell(plaque, 0), m["bossSpot"]["x"] * TILE, m["bossSpot"]["y"] * TILE)
    for f in sorted(m["foes"], key=lambda f: (f["y"], f["x"])):
        fi = FOE_ORDER.index(fam[f["id"]])
        paste(im, foes.crop(((fi * 4) * 11 * TILE, 0, (fi * 4) * 11 * TILE + TILE, 32)), f["x"] * TILE, f["y"] * TILE - 18)
    allowed = {rgb(c) for c in LOCKED}
    for s in used:
        allowed |= {p[:3] for _, p in s.getcolors(1 << 24) if p[3] == 255}
    bad = {p[:3] for _, p in im.getcolors(1 << 24) if p[3] != 255 or p[:3] not in allowed}
    if bad:
        raise SystemExit(f"pixel lock: {len(bad)} colors are not locked or from a sheet: {sorted(bad)[:5]}")
    return im


def main():
    src, out = Path(sys.argv[1]), Path(sys.argv[2])
    scale = int(sys.argv[3]) if len(sys.argv) > 3 else 2
    im = render(json.loads(src.read_text()))
    im.resize((im.width * scale, im.height * scale), Image.NEAREST).save(out)
    print(f"{out.name}: {im.width // TILE}x{im.height // TILE} tiles, {im.width * scale}x{im.height * scale} px (x{scale} nearest), pixel lock ok")


if __name__ == "__main__":
    main()
