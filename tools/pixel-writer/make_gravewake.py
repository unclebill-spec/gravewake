"""Build Gravewake's missing ground with the pixel writer.

Run from the repo root:

    python3 tools/pixel-writer/make_gravewake.py

Tiles land in public/art/writer. The game reads those strips.
This file is the Gravewake job. The writer itself is tools/pixel-writer/pixel_writer.py.
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

from PIL import Image

sys.path.insert(0, str(Path(__file__).resolve().parent))

from pixel_writer import GLYPHS, Canvas, big_slab, cells, flagstone, floor_decal, floor_ramp, lamp_bracket, lamp_flicker, portal_gate, wall_face, wall_ramp, wall_rim, wall_top, bloom_prop, border_mask, boss_plaque, fair_prop, festival_prop, flood_tile, bounty_board, croft_piece, derby_trophy, grave_dug, mimic_breath, brick, pressure_plate, shackle, spike_grate, crack, field, flame, glyph_strip, grass, pit, preview, rune_door, saint, sconce, season_remap, soil, strip, water

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "sprite-writer"))
from palette_locked import LOCKED, LOCKED_V2  # noqa: E402
from ramps import RAMPS  # noqa: E402

OUT = Path(__file__).resolve().parents[2] / "public" / "art" / "writer"

# Same floors the caves already use in draw.ts. Do not invent a new hue per theme.
CAVES = {
    "harrow": ("#5a463c", "#3a3028", "#6a5648", "#3a322c"),
    "ossuary": ("#3a2844", "#241830", "#4a3854", "#2a1830"),
    "wraps": ("#8a7048", "#5a4830", "#a08860", "#705838"),
    "carrion": ("#2c3848", "#1a2430", "#3a4a5c", "#1e2834"),
    "wick": ("#5a3424", "#3a2418", "#6a4430", "#3a2018"),
    "warren": ("#6a5830", "#4a3c20", "#8a7040", "#4a3818"),
    "chapel": ("#3a4458", "#242c38", "#4a5468", "#222a36"),
    "vesper": ("#4a2428", "#2a1418", "#5a3438", "#301418"),
    "drowned": ("#2a4034", "#142820", "#3a5044", "#163028"),
    "blackroot": ("#2a3024", "#141810", "#3a4034", "#161c14"),
    "grave": ("#2c3a2a", "#1a2418", "#3c4a38", "#182016"),
    "hearth": ("#4a2a28", "#2a1614", "#5a3a34", "#2a1412"),
    "cave": ("#5a3a32", "#3a2824", "#6a4a40", "#3a2420"),
}

# Cave wall and wall light, copied from CAVES in src/game/draw.ts. The secret tiles sit on those walls.
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

# Secret-tile colors. All of them are already in the game.
LINE = "#140c10"
IRON = ("#2a2428", "#4a4a50", "#6a6e78")
ASH, EMBER = "#5a5e64", "#c45a18"
FIRE = ("#c45a18", "#e07a2f", "#f0c080", "#f4e27a")
STONE = ("#8a867c", "#6a6660", "#b7b2a6")
RECESS = "#1a1418"
# Glyph states: carved on a saint's plinth, dim on iron, lit.
GLYPH_STATES = ["#3a3428", "#5a5e64", "#f0c878"]


def feat_sheets() -> list:
    """Sheets for the rune doors and the secret walls. Returns every image so the palette can be checked."""
    made = []
    for name, (wall, hi) in WALLS.items():
        tiles = [
            crack(0, LINE, hi),
            crack(1, LINE, hi),
            rune_door(wall, hi, IRON[0], IRON[1], IRON[2], LINE),
            sconce(IRON[0], IRON[1], IRON[2], ASH, EMBER, LINE),
            saint(RECESS, STONE[0], STONE[1], STONE[2], LINE),
        ]
        im = strip(tiles)
        im.save(OUT / f"feat-{name}.png")
        made.append(im)
    fire = strip([flame(i, *FIRE) for i in range(3)])
    fire.save(OUT / "feat-fire.png")
    glyphs = glyph_strip(list(GLYPHS), GLYPH_STATES)
    glyphs.save(OUT / "feat-glyphs.png")
    # Traps: one sheet for every cave. 0 holes, 1 tips (tell), 2 spikes up, 3 plate, 4 plate pressed.
    trap = strip(
        [spike_grate(i, IRON[1], LINE, IRON[1], IRON[2], "#c8c8d0") for i in range(3)]
        + [pressure_plate(p, LINE, STONE[1], STONE[0], "#4a4038", "#3a3428") for p in (False, True)]
    )
    trap.save(OUT / "trap.png")
    # Rescue: 0 a captive's stake with the chain on, 1 the chain broken and the cuff open.
    captive = strip([shackle(b, LINE, IRON[0], IRON[1], IRON[2]) for b in (False, True)])
    captive.save(OUT / "captive.png")
    # Night bounty board (item 7): 0 posted, 1 paid and slashed, 2 bare by day.
    board = strip([bounty_board(k, LINE, "#5a4030", "#6a4830", "#e6dcc8", "#c4b48a", "#140c10", "#8f2d3a", "#e0c060") for k in (0, 1, 2)])
    board.save(OUT / "bounty.png")
    # Sleeping mimic (owner-approved 2026-09-30): 0 lid lifted a pixel, 1 lifted with a tooth glint.
    # Colors are the game's chest lid and lock, and the ink line.
    breath = strip([mimic_breath(g, "#c4a050", LINE, "#f0e2c8") for g in (False, True)])
    breath.save(OUT / "mimic-sleep.png")
    # Grave digging (item 8): fresh earth at the foot of a grave turned tonight. Camp dirt and the ink line.
    dug = strip([grave_dug(LINE, "#3a2818", "#5a4030", "#3a2818", "#6a5040", LINE)])
    dug.save(OUT / "grave-dug.png")
    # Midnight Derby (item 9): the trophy on the croft wall. Board browns, the pond's blues, a witchlit spark.
    trophy = strip([derby_trophy(LINE, "#5a4030", "#6a4830", "#3a78a0", "#7aa4b4", "#d5e8f2", "#c8e080", "#e0c060")])
    trophy.save(OUT / "derby-trophy.png")
    made += [fire, glyphs, trap, captive, board, breath]
    made += [dug, trophy]
    # Home decorating (item 10): six croft pieces in the order of DECOR.pieces, and the boss-trophy mount.
    # Cottage browns, the pond's glass, candle and lantern golds, nightshade purple.
    pieces = ("cabinet", "bookcase", "candelabra", "armchair", "perch", "planter")
    decor = strip([croft_piece(k, LINE, "#1a1008", "#5a4030", "#8a6840", "#3a78a0", "#e6d2a2", "#2a2a2e", "#e0a040", "#6a1828", "#2a5838", "#7a5088") for k in pieces])
    decor.save(OUT / "croft-decor.png")
    plaque = strip([boss_plaque(LINE, "#5a4030", "#6a4830", "#1a1008", "#e0c060")])
    plaque.save(OUT / "boss-plaque.png")
    made += [decor, plaque]
    # Festivals (items 12/14): 0 harvest lantern unlit, 1 lit, 2 Krampusnacht snow lantern, 3 Hessa's stall.
    # Pumpkin oranges, the stem green, post browns, candle gold, lantern stone, snow whites, a stall cloth.
    props = strip([festival_prop(k, LINE, "#e07a2f", "#c45a18", "#3d4a28", "#5a4030", "#8a6840", "#e0a040", "#fff8e0",
                                 "#8a9098", "#4a4a50", "#e8f2f6", "#c5d4e8", "#6a2030") for k in ("harvest-unlit", "harvest-lit", "snow-lit", "stall")])
    props.save(OUT / "festival-props.png")
    made += [props]
    # Drowned Bloom and Ashen Fair (owner-approved 2026-10-01 10:14 ET): 0 bloom bowl, 1 Ottla's stall, 2 a drowned
    # bloom on its pad, 3 ember brazier, 4 brazier flaring, 5 Sallow's booth. The pond's blues, the cream of the bounty
    # paper, a dusky rose heart, the swamp greens, lantern stone, post browns; brazier iron, the fire ramp, ash,
    # a stall red and cream, the candle golds for the burning moon.
    bloom = [bloom_prop(k, LINE, "#16344c", "#3a78a0", "#d5e8f2", "#f0e2c8", "#c4a898", "#c4a0b0", "#2a5838", "#1a2c22",
                        "#8a9098", "#4a4a50", "#5a4030", "#8a6840", "#3a78a0") for k in ("bowl", "stall", "bloom")]
    fair = [fair_prop(k, LINE, IRON[1], IRON[0], IRON[2], EMBER, "#e07a2f", "#f0c080", "#f4e27a", ASH, "#5a4030", "#8a6840",
                      "#8f2d3a", "#e6dcc8", "#e0a040", "#c45a18") for k in ("brazier", "flare", "booth")]
    props2 = strip(bloom + fair)
    props2.save(OUT / "festival-props2.png")
    flood = strip([flood_tile(i, "#16344c", "#2a4034", "#3a78a0", "#d5e8f2", "#3d4a28") for i in range(4)])
    flood.save(OUT / "flood.png")
    made += [props2, flood]
    # Map writer phase 2 (owner-requested 2026-10-01): biome border fringe masks. 0-3 bands n e s w, 4-7 the same
    # bands' second variant, 8-11 corners ne se sw nw. One locked ink (the line colour); only the alpha is used.
    border = strip([border_mask(k, v, LINE) for v in (0, 1) for k in "nesw"] + [border_mask(k, 0, LINE) for k in ("ne", "se", "sw", "nw")])
    border.save(OUT / "border-dither.png")
    made += [border]
    for im in made:
        raw = im.tobytes()
        for i in range(0, len(raw), 4):
            r, g, b, a = raw[i], raw[i + 1], raw[i + 2], raw[i + 3]
            if a and a != 255:
                raise SystemExit("feat sheet has a soft pixel")
            if a and f"#{r:02x}{g:02x}{b:02x}" not in LOCKED:
                raise SystemExit(f"feat sheet color #{r:02x}{g:02x}{b:02x} is not in the locked palette")
    return made


# Core Keeper-style graphics pass, batch 1 (OWNER-APPROVED 2026-10-01: CORE KEEPER GRAPHICS PASS C1-C11).
# Wall kit per cave: 16x32 cells, the tile is the bottom 16 rows. 0 face plain, 1 face cracked, 2 face with the
# cave's feature, 3 thin face plain, 4 thin face cracked, 5-7 wall tops, 8 rim n, 9 rim w, 10 rim e.
WALL_FACE_H = {"chapel": 32}
WALL_FEATURE = {"ossuary": "niche", "grave": "niche", "harrow": "niche", "carrion": "niche", "wraps": "niche", "chapel": "niche",
                "drowned": "moss", "blackroot": "moss", "warren": "moss", "cave": "moss"}
WALL_EXTRA = {"moss": ("#1e3a28", "#2f6a44"), "bone": ("#d8c8a0", LINE)}
# Portal gates: one generator, three looks. stone (line .. top), rune (2), vortex (5, dark to light), core, spark, ash.
PORTALS = {
    "rift": {"stone": ["#140c10", "#241830", "#3a3030", "#4a4450", "#6a6660", "#8a867c"], "rune": ["#c45a18", "#e07a2f"],
             "vortex": ["#140c28", "#2a1848", "#5a3080", "#7a5ad0", "#c9a0e8"], "core": "#07060a", "spark": ["#e07a2f", "#f0c080"],
             "ash": ["#5a5e64", "#8a867c"]},
    "teleport": {"stone": ["#140c10", "#1a2030", "#2a3140", "#3a4a68", "#5a6878", "#8aa0c8"], "rune": ["#3a78a8", "#7ec8e0"],
                 "vortex": ["#0c2030", "#163044", "#3a78a8", "#7ec8e0", "#d0e4ff"], "core": "#07060a", "spark": ["#d0e4ff", "#f4fbff"],
                 "ash": ["#5a6878"]},
    "realm": {"stone": ["#140c10", "#3a2818", "#6a5a4a", "#a89470", "#d8c8a0", "#f4ecdc"], "rune": ["#c4a050", "#f0d060"],
              "vortex": ["#102018", "#1e3a28", "#2f6a44", "#4a8a48", "#9ec060"], "core": "#07060a", "spark": ["#f0d060", "#fff0c0"],
              "ash": ["#9ec060"]},
}


def gfx1_sheets() -> list:
    """Wall kits, the lamp sheet and the portal gates. Returns every image so the palette can be checked."""
    made = []
    ramps = {}
    for name, (wall, hi) in WALLS.items():
        ramp = wall_ramp(wall, hi, LOCKED)
        ramps[name] = ramp
        h = WALL_FACE_H.get(name, 24)
        feat = WALL_FEATURE.get(name, "crack")
        extra = {"moss": WALL_EXTRA["moss"], "bone": WALL_EXTRA["bone"]}
        seed = 500 + 17 * list(WALLS).index(name)
        kit = [wall_face(ramp, h, seed, "plain"), wall_face(ramp, h, seed + 1, "crack"), wall_face(ramp, h, seed + 2, feat, extra),
               wall_face(ramp, 16, seed + 3, "plain"), wall_face(ramp, 16, seed + 4, "crack")]
        kit += [wall_top(ramp, seed + 5 + i) for i in range(3)]
        kit += [wall_rim(ramp, side) for side in "nwe"]
        im = cells(kit)
        im.save(OUT / f"wall-{name}.png")
        made.append(im)
    lamp = strip([lamp_bracket(LINE, IRON[0], IRON[2], "#5a4030", "#8a6840")] + [lamp_flicker(i, *FIRE) for i in range(4)])
    lamp.save(OUT / "lamp.png")
    made.append(lamp)
    for name, pal in PORTALS.items():
        im = cells([portal_gate(part, pal) for part in range(9)])
        im.save(OUT / f"portal-{name}.png")
        made.append(im)
    (Path(__file__).resolve().parent / "wall-ramps.json").write_text(json.dumps(ramps, indent=1, sort_keys=True) + "\n")
    for im in made:
        raw = im.tobytes()
        for i in range(0, len(raw), 4):
            r, g, b, a = raw[i], raw[i + 1], raw[i + 2], raw[i + 3]
            if a and a != 255:
                raise SystemExit("gfx1 sheet has a soft pixel")
            if a and f"#{r:02x}{g:02x}{b:02x}" not in LOCKED:
                raise SystemExit(f"gfx1 sheet color #{r:02x}{g:02x}{b:02x} is not in the locked palette")
    return made


# Core Keeper-style graphics pass, batch 2 (OWNER-APPROVED 2026-10-01: CORE KEEPER GRAPHICS PASS C1-C11).
# Floor kit per cave, 16x16 cells: 0-4 single slabs, 5 split across, 6 split down, 7 offset, 8 broken (earth hole),
# 9-12 a 2x2 grave slab (NW, NE, SW, SE). Decal strip per cave: 0 bones, 1 skull, 2 crack, 3 moss in the seam under
# a wall (ash and embers in the ember caves), 4 wax pool, 5 rubble. Palette v2 (LOCKED_V2, C3). The ossuary takes
# the doc's cool grey flag ramp against its violet crypt walls; every other cave keeps its own floor hue.
FLOOR_FIXED = {"ossuary": RAMPS["flag"][0:1] + RAMPS["flag"][2:]}
FLOOR_GAP = 28  # luminance between the wall's base and the slab: two ramp steps (doc: "at least 2 steps")
EMBER_CAVES = ("wick", "hearth", "warren")
GROWTH = {"moss": ["#1e3a28", "#2f6a44", "#4a8a48"], "ember": ["#3a1810", "#8a3a18", "#c45a18"]}
DECALS = ["bones", "skull", "crack", "moss", "wax", "rubble"]


def gfx2_sheets() -> list:
    """Floor kits and decal strips. Returns every image so the palette can be checked."""
    made = []
    walls = json.loads((Path(__file__).resolve().parent / "wall-ramps.json").read_text())
    ramps = {}
    for name in CAVES:
        ramp = FLOOR_FIXED.get(name) or floor_ramp(CAVES[name][0], walls[name], LOCKED_V2)
        lum = lambda c: 0.299 * int(c[1:3], 16) + 0.587 * int(c[3:5], 16) + 0.114 * int(c[5:7], 16)
        if any(lum(ramp[i]) >= lum(ramp[i + 1]) for i in range(5)):
            raise SystemExit(f"floor ramp for {name} is not strictly lighter step by step: {ramp}")
        if lum(ramp[4]) - lum(walls[name][3]) < FLOOR_GAP:
            raise SystemExit(f"floor of {name} is within two steps of its wall: {ramp[4]} vs {walls[name][3]}")
        ramps[name] = ramp
        seed = 900 + 23 * list(CAVES).index(name)
        kit = [flagstone(ramp, seed + i, "single") for i in range(5)]
        kit += [flagstone(ramp, seed + 5, "split_h"), flagstone(ramp, seed + 6, "split_v"), flagstone(ramp, seed + 7, "offset"), flagstone(ramp, seed + 8, "broken")]
        kit += big_slab(ramp, seed + 9)
        floor = strip(kit)
        floor.save(OUT / f"floor-{name}.png")
        growth = GROWTH["ember" if name in EMBER_CAVES else "moss"]
        decal = strip([floor_decal(k, ramp, RAMPS["bone"], growth, seed + 20 + i) for i, k in enumerate(DECALS)])
        decal.save(OUT / f"decal-{name}.png")
        made += [floor, decal]
    (Path(__file__).resolve().parent / "floor-ramps.json").write_text(json.dumps(ramps, indent=1, sort_keys=True) + "\n")
    for im in made:
        raw = im.tobytes()
        for i in range(0, len(raw), 4):
            r, g, b, a = raw[i], raw[i + 1], raw[i + 2], raw[i + 3]
            if a and a != 255:
                raise SystemExit("gfx2 sheet has a soft pixel")
            if a and f"#{r:02x}{g:02x}{b:02x}" not in LOCKED_V2:
                raise SystemExit(f"gfx2 sheet color #{r:02x}{g:02x}{b:02x} is not in palette v2")
    return made


def season_sheets() -> list:
    """Item 13: four season tints of the world grass, the camp grass, the town grass and both tree sheets.
    Each is a colour-for-colour remap into the locked palette (pixel_writer.season_remap). Written after
    vale.png and camp-grass.png, which are two of the sources."""
    art = OUT.parent
    sources = {
        "vale": (OUT / "vale.png", "ground"),
        "camp-grass": (OUT / "camp-grass.png", "ground"),
        "town-grass": (art / "cozy" / "grass.png", "ground"),
        "trees": (art / "brileta" / "trees.png", "tree"),
        "town-trees": (art / "held" / "trees.png", "tree"),
    }
    made = []
    maps = {}
    for season in ("autumn", "winter", "spring", "summer"):
        for name, (src, kind) in sources.items():
            im, used = season_remap(Image.open(src), season, kind, LOCKED)
            im.save(OUT / f"season-{season}-{name}.png")
            maps[f"{season}-{name}"] = used
            made.append(im)
    for im in made:
        raw = im.tobytes()
        for i in range(0, len(raw), 4):
            r, g, b, a = raw[i], raw[i + 1], raw[i + 2], raw[i + 3]
            if a and a != 255:
                raise SystemExit("season sheet has a soft pixel")
            if a and f"#{r:02x}{g:02x}{b:02x}" not in LOCKED:
                raise SystemExit(f"season sheet color #{r:02x}{g:02x}{b:02x} is not in the locked palette")
    (Path(__file__).resolve().parent / "season-maps.json").write_text(json.dumps(maps, indent=1, sort_keys=True) + "\n")
    return made


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    vale = [grass(10 + i * 9, "#1a3828", "#102018", "#3a6840", "#c4b49a", i) for i in range(8)]
    camp_grass = [grass(40 + i * 7, "#243428", "#142018", "#4a6840", "#c4a15a", i) for i in range(4)]
    camp_dirt = [soil(80 + i * 5, "#5a4030", "#3a2818", "#6a5040", "#2a221c", i) for i in range(4)]
    pond = [water("#16344c", "#3a78a0", "#7aa4b4", i) for i in range(4)]
    grounds = {
        "swamp": ("#1a2c22", "#0e2418", "#4a8a58"),
        "snow": ("#c5d8e6", "#8aa4b0", "#f4fbff"),
        "sand": ("#b6a47c", "#8a7048", "#e6d6b0"),
        "ash": ("#3a322c", "#1a1612", "#5a4030"),
    }
    strip(vale).save(OUT / "vale.png")
    strip(camp_grass).save(OUT / "camp-grass.png")
    strip(camp_dirt).save(OUT / "camp-dirt.png")
    strip(pond).save(OUT / "water.png")
    for name, (base, dark, light) in grounds.items():
        tiles = [field(100 + i * 3, base, dark, light, i) for i in range(4)]
        strip(tiles).save(OUT / f"{name}.png")
    for name, (fill, mortar, hi, shade) in CAVES.items():
        tiles = [brick(200 + i * 11, fill, mortar, hi, shade) for i in range(4)]
        strip(tiles).save(OUT / f"brick-{name}.png")
        strip([pit(fill, "#0c0808", mortar)]).save(OUT / f"pit-{name}.png")
    # One sheet to look at. Nearest neighbor, so a bad pixel is obvious.
    sheet = vale + camp_grass + camp_dirt + pond
    preview(sheet, 4).save(OUT / "preview.png")
    feats = feat_sheets()
    print(f"feat sheets {len(feats)}, palette locked")
    seasons = season_sheets()
    print(f"season sheets {len(seasons)}, palette locked")
    gfx = gfx1_sheets()
    print(f"gfx1 sheets {len(gfx)}, palette locked")
    floors = gfx2_sheets()
    print(f"gfx2 sheets {len(floors)}, palette v2 locked")
    print(f"wrote {OUT}")


if __name__ == "__main__":
    main()
