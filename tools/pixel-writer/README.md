# Pixel writer

This is the terrain tool for Gravewake, and the one to reuse on a later game.

It draws 16×16 pixels. One color per pixel. No blur, no anti-alias, no palette of its own. You pass the colors. The border of a grass or soil tile stays one color, so a field made of mixed tiles does not show a grid.

## Use it again

```bash
python3 tools/pixel-writer/make_gravewake.py
```

That rebuilds `public/art/writer`. For another game, import the writer and pass that game's colors:

```python
from pixel_writer import grass, strip

tiles = [grass(seed, base, dark, tip, spot, kind) for kind in range(8)]
strip(tiles).save("grass.png")
```

`grass`, `soil`, `brick`, `pit`, `water`, and `field` are the generators. `Tile` is there when a new prop needs to be drawn by hand in code.

Do not point this at a photograph. If a tile looks like noise, the generator is wrong. Fix the shapes, do not add more speckles.

## Dungeon secrets

`crack`, `rune_door`, `sconce`, `flame`, `saint`, and `glyph_strip` draw the rune doors and secret walls.
`make_gravewake.py` writes them to `public/art/writer`:

- `feat-<cave>.png`: five 16×16 cells per cave theme. 0 and 1 are hairline-crack overlays, 2 is the sealed rune door, 3 is the wall brazier, and 4 is the stone saint in its niche. Overlays carry only their marks; the game paints its own cave wall under them.
- `feat-fire.png`: three flame frames. The base sits on row 15, and the game lifts it onto the bowl.
- `feat-glyphs.png`: 5×5 cells for moon, eye, and cross, each in three states (carved, dim, lit).

The script stops if any of these pixels is soft or is not in `tools/sprite-writer/palette_locked.py`.

## Wayrifts and the swamp path (playtest1f)

[OWNER-APPROVED 2026-10-02: playtest1f portals] `rift_writer.py` draws the wayrifts and the swamp path in palette v3
(wild_writer's Canvas, the NEON ramps). `make_gravewake.playtest1f_d2()` writes them to `public/art/writer`:

- `wayrift.png` / `wayrift_em.png`: nine 48×64 cells (frames 0 to 7 swirl, 8 is the sealed rift) and their glow masks. Slate dais with a violet rune channel, two rune stones, an oval vortex with violet arms, a red heart, a blue lip and neon-blue cold fire.
- `wayrift-icon.png`: two 9×11 map markers (lit, sealed).
- `swamp-path.png`: eighteen 16×16 cells of mossy mud with ragged transparent edges, cells 0 to 15 by neighbour mask (1 N, 2 E, 4 S, 8 W, boardwalk planks on straight runs), 16 and 17 a sunken plank on the N-S and E-W runs.

Run on its own: `python3 -c "import make_gravewake as m; m.playtest1f_d2()"` from this folder.

## Trail paths (playtest1g)

[OWNER-APPROVED 2026-10-02: playtest1g trail paths] `trail_writer.py` draws the trails of the vale, the snow, the ash
and the sand in palette v3, on the swamp path's band geometry (rift_writer's half-width and wobble, wild_writer's
Canvas). `make_gravewake.playtest1g()` writes them to `public/art/writer`, 18 cells of 16×16 a row (0 to 15 by
neighbour mask, 1 N, 2 E, 4 S, 8 W; 16 and 17 the N-S and E-W straights' variant), ragged transparent edges:

- `trail-vale.png` (288×64): worn dirt with ruts and leaf litter, a row a season (autumn, winter, spring, summer); variant a root and a puddle.
- `trail-snow.png`: packed, trodden snow with a thrown-snow rim and boot prints; variant sled runners.
- `trail-ash.png`: trodden pale cinder, dark cracks with embers; variant a glowing vent.
- `trail-sand.png`: compacted sand with wind ripples and pebbles; variant a half-buried bone.
- `preview-playtest1g.png`: every row on its ground, 3×.

Run on its own: `python3 -c "import make_gravewake as m; m.playtest1g()"` from this folder.

## Props and dungeon liquids (playtest1h)

[OWNER-REQUESTED 2026-10-02 19:43 ET: playtest1h art and loading audit] `prop_writer.py` draws the last props the game still painted as flat blocks: the chest (`prop-chest.png`, closed
and open, 16×16), the sleeping mimic's lid for it (`prop-mimic-lid.png`, the lid lifted a pixel over a black seam, a
tooth glint on cell 1), dungeon bone heaps (`prop-bones.png`, four variants) and each dungeon's water and pools
(`cave-liquid-<theme>.png`, four 128×128 wrapping frames like the vale water, in the dungeon's liquid and accent from
`cave-liquids.json`, which mirrors draw.ts `CAVES`). `make_gravewake.playtest1h()` writes them to `public/art/writer`
with `preview-playtest1h.png`; palette v3, hard alpha (checked as it writes).

[OWNER-REQUESTED 2026-10-02 19:43 ET: playtest1h art and loading audit] (part 2, playtest1i) `interior_writer.py` draws every building's inside to its outside's finish: a 128×128
wrapping floor per style (`room-floor-<cabin|stone|slate|warm>.png`), the inside wall per style (`room-wall-<style>.png`,
seven 16×16 cells in looks.ts ROOM_CELL order, with `_em` glow masks), 19 trade pieces in 32×32 cells (`room-furn.png`
in interiors.ts FURN order, with `room-furn_em.png`), and four rugs (`room-rugs.png`, 64×32 each). `make_gravewake.playtest1i()`
writes them with `preview-playtest1i.png`; palette v3, hard alpha (checked as it writes).
