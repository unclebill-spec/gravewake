# Map writer

This is the map tool for Gravewake, and the one to reuse on a later game. It is the fourth writer, next to the sprite, pixel, and spell writers.

It lays seeded maps on a plain tile grid. The same options always give the same map, byte for byte. It never calls Math.random and never reads the clock. It knows nothing about any one game: you pass the tile codes, the foe roster, and the level. It returns the grid plus everything it chose.

**Phase 1** (this folder) makes one dungeon floor and one rift pocket.
**Phase 2** (built, [OWNER-REQUESTED 2026-10-01: MAP WRITER PHASE 2]) is biome noise blending: `blendBiomes` turns a hard biome map into a ragged one, and the `biome` slot on both writers fills its layer with it. In Gravewake it is looks only (see "Phase 2: biome blending" below).

Gravewake uses it (owner-approved 2026-10-01, `[OWNER-APPROVED EXCEPTION 2026-10-01: MAP WRITER]`):

- **Shifting Barrow** (`barrow` @44,32, L14, 3 floors) is the one generated dungeon. A Stalker pack guards its boss room.
- **Ashen Rift** (`riftvale` @10,30) is the first rift zone. Its pocket rerolls each day-night cycle (`riftSeed(seed, tx, ty, cycle)`).

`src/game/sim.ts` calls `gravewakeFloor`, `gravewakeRift` and `guardPick` from `gravewake.ts`.

## Files

- `map_writer.ts` is the writer. It is game-agnostic and has no imports.
- `gravewake.ts` is the Gravewake adapter. It uses the game's tile codes and the dungeon roster (every family but bat), then runs the game's own `placeFeats`, `placeTraps`, `placeCaptive` and `mimicChest` on the grid, in the same order `carveFloor` uses.
- `render_map.py` turns a JSON map into a full-map PNG with the existing writer tilesets. It is palette-locked.
- `make_gravewake.mjs` renders three dungeon seeds and one rift.
- `check_map_writer.mjs` holds the unit-style checks.
- `bundle.mjs` bundles TypeScript with the same `npx esbuild` the game's check suite uses.

## Use it

```ts
import { writeDungeon, writeRift, riftSeed } from "./map_writer";

const codes = { wall: 3, floor: 7, stairUp: 13, stairDown: 12, chest: 22, exit: 20 };
const roster = [{ id: "zombie" }, { id: "ghoul", weight: 2 }];

const floor = writeDungeon({ seed: "my-site", floor: 1, codes, roster, level: 20, down: true });
const pocket = writeRift({ seed: riftSeed(worldSeed, tx, ty), codes, roster, level: 12 });
```

### Dungeon options

`writeDungeon(options)` takes:

- **Required:** `seed`, `codes`, `roster`, `level`.
- **Optional, with defaults:**
  - `floor = 1` (mixed into the seed)
  - `width = 48`, `height = 32`
  - `rooms = [7, 10]`, `roomW = [4, 8]`, `roomH = [3, 6]`
  - `foesPerRoom = [1, 2]`
  - `loops = 2` (extra corridors beyond the spanning tree)
  - `down = false` (a down stair in the boss room)
  - `biome`

How it builds a floor:

1. **Rooms.** They keep a 2-tile margin from the edge and 2 tiles of rock between each other, so secret rooms still fit.
2. **Corridors.** A spanning tree joins the rooms, then a few seeded loops are added. Each corridor is an L shape.
3. **Tags:**
   - `start` is a seeded dead-end room. It holds the up stair.
   - `boss` is the room farthest from the up stair by walking steps. It holds `bossSpot`, and the down stair when `down` is set. The writer never picks a boss; that is the game's call.
   - `vault` is the farthest of the remaining rooms, preferring a dead end. It holds the one chest, on a corner that is not a corridor mouth.
4. **Foes.** They go only in plain rooms. Each one gets an `id` from the roster (by weight) and the `level` you passed, untouched. Stats are the game's job (Gravewake: `scaleMonster`).

### Rift options

`writeRift(options)` takes:

- **Required:** `seed`, `codes`, `roster`, `level`.
- **Optional, with defaults:**
  - `width = 32`, `height = 22`
  - `fill = 0.42`, `passes = 4`
  - `minOpen = 0.4`
  - `foes = [3, 5]`
  - `biome`

How it builds a pocket:

1. A cellular-automaton cave is grown and only its largest open region is kept.
2. If that region is under `minOpen` of the interior, the writer re-rolls with seeded attempts 0..7. It is still one map per seed.
3. `exit` is the open tile nearest the middle, and `arrive` is the floor tile under it.
4. Foes spread out farthest-first, at least 4 steps from `arrive`.
5. There is no boss and no vault.

`riftSeed(worldSeed, tx, ty, epoch?)` gives one overworld spot one pocket. Pass an epoch (Gravewake passes the day-night cycle) to reroll it on that clock.

**Getting back.** Returning you to the exact spot you entered from is the game's job. Gravewake already keeps that record for the town portal (`Portal` in `sim.ts`: map, px, py). Save it on entry and restore it on the exit tile.

### Result

`MapResult` holds:

- `kind`, `seed`, `w`, `h`
- `tiles`: a `Uint8Array`, row-major. This is the same shape as a carved floor.
- `rooms`: each with `id`, `tag`, rect, `center` and `depth`
- `corridors`, `stairs {up, down}`, `exit`, `arrive`, `bossSpot`, `vaultChest`
- `foes`
- `spawns`: tile indices of every foe plus the boss spot. Pass these as `spawns` to trap and captive placement.
- `biome`, `biomeNames`

`stepsFrom(tiles, w, h, x, y, walk)` is the BFS the checks use. `toJSON(map)` gives a plain JSON view.

## Phase 2: biome blending

[OWNER-REQUESTED 2026-10-01: MAP WRITER PHASE 2]

`blendBiomes({ seed, w, h, base, names, blend?, reach?, scale?, rank? })` takes a hard per-tile biome map (`base`, indices into `names`, straight edges the way a game lays its regions) and returns:

- `biome`: the biome each tile looks like;
- `edges`: per tile, bits `EDGE.n | e | s | w` where a side neighbour looks like another biome (and, if `rank` is given, ranks higher, so each border gets one fringe: the higher biome's ground over the lower);
- `corners`: per tile, bits `CORNER.ne | se | sw | nw` for a differing diagonal whose two sides match;
- `moved`: how many tiles changed.

How it works: each tile that `blend(i)` allows looks up `base` at a spot warped by two channels of seeded value noise (lattice `scale` tiles apart, plus a second octave a third the size at the same weight, summed and scaled by 0.45), rounded and clamped to `reach` tiles on each axis. A border therefore wanders up to `reach` tiles either way, in smooth runs about `scale` tiles long, with the odd speckle where the warp turns. Defaults: reach 2, scale 6. Tiles `blend` refuses keep their base biome and take no edge bits, and are never named as a side that differs. Reach 0 returns `base`.

It says which biome a tile looks like. It does not change tiles. The caller decides what that means.

The slot: `biome?: { names, weights?, reach?, scale? }` on both writers. One name (or none, `"default"`) fills the layer with 0. Two or more need `weights(x, y)` (refused without): the heaviest name wins each tile, then `blendBiomes` (seeded from the map's own seed) roughs up the borders. Tiles, rooms, and foes are byte-identical with or without the slot.

**Looks only in Gravewake.** `gravewake_vale.ts` builds the vale's base from the world's own rectangle rule (`valeBiomeAt`: winter y<16, waste x>48, cinder y>46, swamp 27-41 x 23-39, vale elsewhere), lets open ground and the ground under props blend (never a road, door, water, ice, stair, or dirt), and uses a fixed seed (`"gravewake-vale"`, reach 2, scale 6, rank snow > sand > ash > swamp > grass). `draw.ts` shows each tile's skin biome with that biome's existing sheet (a tree or rock as that biome's kind) and lays a fringe along each marked side: the neighbour's own ground drawn through a mask from `public/art/writer/border-dither.png` (pixel writer, one locked ink, used for its alpha only). The sim never reads the skin, so the grid, collision, zone names and levels, foe families, placements, and saves are as before. Group `mapwriter2` in `scripts/gravewake-check.mjs` checks this.

## Feeding the game's placement (Gravewake)

`gravewakeFloor(site, seed, floor, floors, level)` mirrors the tail of `carveFloor`:

```ts
const feats = placeFeats(tiles, w, h, site, floor, floors, false);
feats.traps = placeTraps(tiles, w, h, site, floor, floors, false, feats, map.spawns);
const captive = placeCaptive(tiles, w, h, site, floor, floors, feats, map.spawns);
const mimic = mimicChest(tiles, w, site, floor, floors, false, feats);
```

- The secrets carve only into rock the writer left solid.
- Traps keep every route open.
- A mimic can only take the vault's chest, using the game's own `MIMICS.chance`.
- Captives come only for sites listed in `RESCUES`, so a new site gets none until the owner adds one.

`gravewakeRift(site, seed, level, roster)` places traps only. A rift rerolls each cycle, and the game keys secret-room, mimic and captive state by site and floor, not by layout, so those would not survive a reroll. The rift exit is painted as the game's up stair (`RIFT_CODES`), because the placement code anchors on `T.stairU`.

`guardPick(map)` is a seeded roster family plus a Stalker affix the game already uses (`fast` or `vortex`) for the boss-room guard.

## Run it

From the game root (`work/`):

```bash
node tools/map-writer/check_map_writer.mjs                       # 27 checks; MAP_SEEDS=300 by default (the game's own group is `mapwriter` in scripts/gravewake-check.mjs)
MAP_PYTHON=python3 node tools/map-writer/make_gravewake.mjs <shots dir> [json dir]
python3 tools/map-writer/render_map.py map.json out.png [scale]  # one map
```

Renders are full maps at 16 px per tile, scaled ×2 nearest-neighbor. The overlays are:

- room frames: green for start, red for boss, gold for vault
- the boss plaque on the boss spot
- foe sprites from `foes.png`
- traps, secrets, the sleeping mimic and the captive from the writer sheets

The render stops if any pixel is soft, or is neither a locked color (`tools/sprite-writer/palette_locked.py`) nor copied unchanged from one of those sheets.

## Reuse on another game

Copy `map_writer.ts`. Pass that game's tile codes and roster. Write a small adapter like `gravewake.ts` for its own secret and trap code, and a renderer that points at its own tilesets. For blended biome borders, copy the shape of `gravewake_vale.ts`: build the base from the game's own region rule, say which tiles may blend, and draw from the result.

Keep the rules here:

- seeded only;
- the writer picks places, not numbers;
- the game owns the boss, the stats and the return trip.
