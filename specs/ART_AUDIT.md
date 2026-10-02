# Gravewake art audit (batch C, playtest1c)

[OWNER-REQUESTED 2026-10-02 02:07 ET: playtest1c art audit] Bill asked for three things: make sure no old graphics
or old sprites are still stuck in the game; make movement animations look good and fluid; and bring the level of
detail up everywhere, so no area looks bad next to the good ones. This file is the inventory (step 1), the fix list
for his [C] notes (step 2), and the animation pass (step 3). [D] items (world size, the black void at map edges,
portals) are not in this batch.

Scale law: one art pixel is one game pixel. Tiles are 16x16 and people are 16x32 cells (about 16x30 drawn). Every
colour comes from palette v3 (LOCKED_V3), with hard alpha, made by the pixel writer (tools/pixel-writer) or the
sprite writer (tools/sprite-writer). "Writer" below means ours. "Third-party" means an older pack from before the
writers.

Timing: `g.frame` advances 8 a second. "fps" below is art frames a second at that clock.

## Inventory, ranked by how often players see each asset

Rank 1 is on screen almost all the time. The flag column marks: OLD (third-party or pre-writer), LOW (low detail
next to its neighbours), SCALE (does not match the 1 px = 1 px, 16 px tile / 16x32 person scale). Status: C1 = fixed
in this batch's first part, C2 = deferred, ok = no change needed.

| Rank | Asset (sheet) | Where it is used | Source | Resolution / detail | Frames / fps | Flag before C | Status |
|---|---|---|---|---|---|---|---|
| 1 | Hero (sprites/heroes.png, people.png cells) | always | writer (sprite) | 16x32 cell, shaded, outlined | 11 poses: stand, idle, walk0-2, swing0-2, cast0-2; walk 4-step at 8 fps | idle twitch (stand/idle swap every 3.5 s) | C1 (idle beat) |
| 2 | Vale grass (writer/vale.png + season-*-vale.png) | the whole vale | writer | 16x16 x8 variants, season tints | static | ok | ok |
| 3 | Vale trees (was brileta/trees.png, 32x32 cells about 16 px drawn; cols 6-7 brown stick trunks) | the vale, town, camp | was third-party | was tiny, about half a person tall | static | OLD LOW SCALE (tiny trees, stick saplings) | C1: writer/wild-trees-{season}.png, 8 species x 4 seasons, 32x48 |
| 4 | Foes, 17 families x 4 ranks (sprites/foes.png + foes_em.png) | vale nights, dungeons | writer (sprite) | 16x32 cells | 11 poses, walk at 8 fps | the rat (vale critter and rat foe; played as "the lizard") was an 8x4 bar | C1: new hunched rat |
| 5 | Townsfolk (people.png, allies.png, crowd looks) | town, vale roads | writer (sprite) | 16x32 | 11 poses | robed walkers' tall hats touch row 0 (the body still bobs) | ok |
| 6 | Vale road (writer/vale-road.png) | the vale | writer | 16x16 x4 | static | ok | ok |
| 7 | Town cobble and dirt (writer/town-cobble.png, town-dirt.png) | town | writer | 16x16 x4 | static | ok | ok |
| 8 | Town grass (cozy/grass.png + season tints) | town | third-party (cozy) | 16x16 x7, flatter than the vale's | static | OLD | C2: done, writer town-grass.png |
| 9 | Town buildings (land/house*.png; cozy/cabin.png for even-width lots) | town | third-party (Land of Pixels, cozy) | 64x96 / 80x96, a different shading hand | static | OLD (cabin named by Bill) | C2: done, writer town-house-*.png / town-cabin.png |
| 10 | Biome grounds: snow, cinder ash, waste sand, swamp (was writer/{snow,ash,sand,swamp}.png) | a third of the vale | was early writer | was 16x16 flat strips with 2-3 marks; the ash read as flat grey rectangles | static | LOW (grey patches under dead trees) | C1: 128x128 wrapping wild-{snow,ash,sand,swamp}.png |
| 11 | Biome fringe (writer/border-dither.png) | every biome edge on the vale | writer | 2-4 px saw edge | static | LOW (the "jagged hedge band" at the snow) | C1: wild-border.png (rounded drifts and corners) plus wild-flecks.png (crumbs fading across the tile) |
| 12 | Water (was writer/water.png per tile, inset borders) | vale ponds, camp, the town pond | writer, hand-restored with an unlocked #1c4060 | 16x16 boxes | 4 frames, about 0.8 fps | LOW (boxy grid); off-palette | C1: wild-water.png 128x128 x4 frames (2 fps) + shore rims; water.png is the writer's own output again |
| 13 | Town pond and square pool (water.png, town-pool.png basin per tile) | town | writer | per-tile basins | 4 frames | LOW (boxy) | C1: wild-water-town.png + bank and stone-kerb rims |
| 14 | Ice (code-drawn rectangles) | the snow pond | code | flat per-tile strokes | static | LOW (boxy) | C1: wild-ice.png 128x128 x3 frames (about 0.7 fps glints) + snowbank rims |
| 15 | Rocks (held/rocks, brileta) | vale, every biome | third-party | 16x16, one look everywhere | static | OLD | C1: wild-rocks.png, 12 cells by biome (ember seam in the cinders) |
| 16 | Dead trees (land/dead-trees.png, red 32x48) | cinders, swamp | third-party | flat red | static | OLD | C1: wild-deadwood.png (charred with ember cracks, drowned willows with blue wisps, bleached waste thorns) |
| 17 | Waste trees (held/trees.png) | sand, town, camp | third-party | 32x32 | static | OLD | C1: wild trees (town, camp), thorns (waste) |
| 18 | Dungeon entrances (code-drawn ladder on the stair tile) | every dungeon on the vale, the town's Opened Grave | code | a 10x14 ladder | static | LOW SCALE (tiny ladder; the green slab on the snow road) | C1: wild-entrances.png 48x48 stairwell / crypt mouth / barrow arch, 2 flicker frames (about 2.7 fps), neon blue braziers + one night light each; wild-opened-grave.png 32x32; wild-stairs.png floor stairs |
| 19 | Town graves (land/decoration.png cell, 2x3 tiles) | the town graveyard | third-party | 32x48 | static | OLD SCALE (oversized) | C1: wild-graves.png 16x32 (a 10-13 px stone), candle grave flickers |
| 20 | Pumpkins (land/decoration.png in town; code on the vale) | town, the vale's patches | third-party / code | mixed | static | OLD | C1: wild-pumpkin-small/big.png, 2 frames, lit faces |
| 21 | Bosses (foes.png drawn at scaleFor = 2, 32x64) | festival and dungeon bosses, the crowned ghost | writer, doubled | fat 2 px pixels | 11 poses | SCALE (oversized crowned ghost) | C1: drawn at 1x, standing in wild-boss-aura.png (32x16, 4 frames at 4 fps, blue and violet) with its glow mask |
| 22 | Festival bosses (sprites/krampus.png, pumpkin-lord.png) | festival nights | writer | 16x32 | 11 poses | the Pumpkin Lord's idle = its stand frame | C1: idle settle |
| 23 | Scarecrow foe (foes.png) | vale nights | writer | 16x32 | walk hop 0, 3, 1, 3 px (jitter); idle about the stand frame | choppy | C1: hop 0, 2, 3, 2 (one arc a stride); idle crossbar droop |
| 24 | Town fence (writer/town-fence.png) | town edge, yards | writer | 16x16 | static | ok (held/fence.png is not used at all) | ok |
| 25 | Town signs, icons, the hamlet icon (writer, playtest1b) | town, vale | writer | neon | 2 frames | ok | ok |
| 26 | Camp (writer camp-grass, dirt, tent, fire, gear) | the camp | writer (playtest1b B2) | full | fire 4 frames | ok | ok |
| 27 | Dungeon walls, floors, decals, pits, feats (writer, gfx1-3) | dungeons | writer | 16x32 wall cells | lamps 4 frames | ok | ok |
| 28 | Rooms (writer room-*, playtest1b) | interiors | writer | full | sconces flicker | ok | ok |
| 29 | Spells: orb and nova (spells/gen) | combat | writer | 16x16 x6 | 6 frames | ok | ok |
| 30 | Spells: Fireball, Light Bolt, Ice Lance, Darkness Bolt, Magic Sparks, Wind Bolt, Splash (spells/*.png, DevWizard CC0) | combat | third-party | 16x16 strips (Splash 32) | 6 frames at 4 fps | OLD (a different hand from the writer's spells) | C2: done, spells/gen only |
| 31 | Portals (writer portal-rift/teleport/realm) | vale, dungeons | writer | 32x48 | spin | portals are [D] | not in C |
| 32 | Minimap, HUD, font (writer font-small, UI) | always | writer / CSS | n/a | n/a | ok | ok |
| 33 | Legacy battle view (`g.mode === "battle"`, hero 3x, ally 2.4x, foes 2/3/4x) | unreachable in play | code | scaled | n/a | SCALE (but never shown) | left as is, noted |
| 34 | Creature tilemap (creatures/tilemap.png, lizards and newts) and fall pack (fall/*) | were only the fallback bodies while foes.png loaded | third-party | 16x16 | static | OLD | C1: removed from the draw and the loading list |

## Bill's [C] items (NOTES.md and his shots) and what C1 did

- **The old lizard foe.** The "lizard" was the rat body (an 8x4 bar), used for the vale critter and the rat foe. The
  sprite writer now draws a hunched rat: round pink ear, eye, whisker, paws and a curled tail, with walk, sniff idle,
  lunge and cast frames. The fallback creature tilemap and the fall pack are gone from the game.
- **Ridiculously tiny trees; small brown stick saplings.** All trees are the wild writer's 32x48 species (oak x2, elm,
  poplar, pine x2, birch, and a yew with cold-fire wisps) in the current season, stood on the trunk tile. The stick
  saplings (brileta columns 6 and 7) are gone.
- **Water and ice that do not match (boxy grid; the town pond too); the writer's town water recolor.** Water, the
  town pond and pool, and ice are cut from 128x128 wrapping sheets by world position, so a pond is one surface. Each
  pond gets shore rims (a reed bank, the square's stone kerb, a snowbank) with inner corners. The water recipe's band
  in make_gravewake.py now uses the locked #2a4060, so water.png is the writer's own output again instead of a
  hand-restored file. The town water is the vale's blue taken toward the town's violet.
- **Oversized gravestones and the oversized crowned ghost.** Headstones are 16x32 house-scale cells. Bosses draw at
  1x in a turning cold-fire ring with a glow mask. Gameplay (hitboxes, speed, damage) never read the draw scale.
- **Dead trees on flat grey rectangles.** The cinder ground is a wrapping, charred, ember-flecked sheet, and the trees
  on it are charred deadwood with red ember cracks.
- **The snow pond, the green slabs and the jagged hedge band.** The ice pond is the ice sheet with snowbanks. The green
  slab was the ladder entrance on the snow road; it is a dungeon mouth now. The band is softened by drift masks,
  rounded convex and concave corners, and frost crumbs fading across the vale tile. Still open (C2): the biome border
  itself still follows tile steps, and the grey square with an arrow on the ice in Bill's shot was not seen again in the
  headless shots.
- **Tiny-ladder dungeon entrances.** Every dungeon on the vale gets a 48x48 (3x3 tile) mouth: a mason's stairwell
  (manors, forts, chapels, the abbey), a crypt mouth (ossuary, tomb, drowned parish) or a barrow arch (warrens, roots,
  pockets and generated holes). Each has neon blue cold-fire braziers that flicker and one blue night light. The
  town's Opened Grave is a 32x32 broken grave over its 2x2 tiles. The floor stair is a stone stair, not a ladder.
- **Older third-party art.** Done in C1: the fall props, rocks, trees, dead trees and the creature sheet. The fence was
  already the writer's (held/fence.png is unused). Deferred to C2: the cabin and the land-pack houses, the cozy town
  grass, and the third-party spell strips.

## Step 3: animation fluidity

Measured with qa/playtest1c/anim_audit.py over all 102 eleven-frame strips (people, heroes, 17 foe families x 4
ranks, mimic, Krampus, Pumpkin Lord).

- Walk cycles: walk0, walk1, walk2, walk1 at 8 fps (one stride every half second). People's contact frames sit 1 px
  lower than the pass frame (playtest1). Feet stay planted on row 29 in every walking strip, except the bat, whose
  flap moves on purpose. Unchanged.
- Idle: before, every body swapped between stand and idle every 3.5 s, all in step (a whole crowd twitched at once).
  Now a body rests 2.5 s and shifts its weight for 1.5 s (a 4 s breath), and each body's beat is offset by where it
  stands (IDLE_BEAT, idleSeed). This is drawing only. No gameplay timer reads it.
- Frames that did not move: the scarecrow's idle was its stand frame give or take 2 px (now 20 px of crossbar droop),
  and the Pumpkin Lord's idle was its stand frame exactly (now a 1 px settle). The scarecrow's hop
  went 0, 3, 1, 3 px over the cycle (a jitter); it is now 0, 2, 3, 2 (one arc a stride).
- Attack frames: swing (wind-up, strike, follow-through) and cast (gather, release, scatter) have three distinct frames
  everywhere, and their timing (actPhase on the act timer) is unchanged.
- Measured but left alone: large pixel changes between walk frames on detailed people (swinging arms and robes;
  normal for a 4-frame walk at 16x32), and the bat's flap.

## C2 (done 2026-10-02, playtest1d) [OWNER-REQUESTED 2026-10-02 06:55 ET: playtest1d art audit C2]

What changed (writer: tools/pixel-writer/town_writer.py via make_gravewake.playtest1d_c2(); constants src/game/wild.ts):
- Town buildings: town-house-{stone,warm,slate}.png (64x96, picked by lot x % 3) and town-cabin.png (80x96) replace
  land/house*.png and cozy/cabin.png at the same footprints and the same cut, so the scale matches the C1 trees and
  headstones. Each has an _em glow mask (lit window panes, chimney ember, door lamp only) that the night glow pass
  draws over the gloom, so windows glow at night and dusk.
- Town grass: town-grass.png (16x16 x7) replaces cozy/grass.png: a soft flat lawn with clover, tufts and small flowers;
  the season sheets draw each season's town lawn from the writer (autumn adds fallen leaves), not by tinting the cozy tile.
- Spells: every DevWizard strip name is out of the draw; spellFrame reads /art/spells/gen (the spell writer's strips)
  for every spell and every fallback.
- Biome outline: wild-border-rim.png, a dark one-pixel line along the drift masks (snow, sand, ash, swamp), drawn after
  the fringes where a biome meets the vale.
- The grey square on the ice: reproduced. It was a pressure plate from the last dungeon floor (g.feats is not reset on
  leaving a dungeon, so its index landed on the vale). The plate now only draws inside a dungeon. Drawing only: the sim
  already fired traps only in a dungeon.
- Cave stairs: wild-stairs-themes.png gives floor stairs the dungeon's own look (stairwell, crypt, barrow, as the mouth).
- Bill's "lizard": no lizard, salamander or newt foe exists (the newts are fishing bait). The rat, which read as one, was
  redrawn in C1; the cat critter reads as a cat and stays.

What stays:
- The old land/, cozy/ and spells/*.png (DevWizard) files stay on disk unreferenced, with their credits.
- The season tint sheets for the old tree packs (writer/season-*-trees.png, season-*-town-trees.png) are no longer
  drawn. They stay on disk because the season check group still reads them.
- The sim's stale trap index after a dungeon stays (gameplay is guarded; the draw is now too).
