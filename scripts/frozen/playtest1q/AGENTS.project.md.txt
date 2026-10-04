# Gravewake project law

This file is standing instruction for Gravewake. Follow it with the same weight as `AGENTS.md`.
The pixel-art lock below wins over any art, tile, sprite, UI, screenshot, or display request that conflicts with it, unless the user explicitly overrides a named rule.

Theme, combat, towns, and the rules already in the game stay. This lock governs how those things are drawn and shown. Do not copy Stardew Valley assets. Match the craft: native pixels, a small palette, a 3/4 camera, readable silhouettes, integer nearest-neighbor scale.

## Game Layout Two, the prompt, and the roster

These three files are standing law for Gravewake, with the same weight as this file:

- `rules/GAME_LAYOUT_TWO.txt` — pad, Ashfield field combat, scale, day and night, weather, loot, death.
- `rules/GAME_LAYOUT_TWO_PROMPT.txt` — the short paste of that same law.
- `rules/GAME_LAYOUT_TWO_ROSTER.txt` — the 12 families, 21 bosses, 21 remnants, kits, and level rules.
  [OWNER-APPROVED EXCEPTION 2026-09-30: MIMIC] The owner approved one 13th family, the mimic, and approved it as the only solo rare (no pack affix, no minions, one bite lunge on the 0.35 s rare tint). Every other rare is a pack. `scripts/gravewake-check.mjs` (group `mimic`) enforces this.
  [OWNER-APPROVED EXCEPTION 2026-10-01: FESTIVAL BOSSES] The owner approved two festival-only bosses beyond the 21: the Pumpkin Lord (Harvest Moon) and Krampus (Krampusnacht, a switch and a basket). Only these two may exceed the roster; stats run through scaleMonster with the normal boss bulk. `scripts/gravewake-check.mjs` (group `festival`) enforces this.
  [OWNER-APPROVED 2026-10-01 10:14 AM ET: SPRING AND SUMMER FESTIVALS] The owner approved the spring and summer festivals on the existing hooks: Drowned Bloom (the swamp floods, Weir-wife Ottla's bloom gathering, the Drowned Court as named Ghost Stalker packs) and Ashen Fair (Barker Sallow's ember dance, the Cinder sideshow as named Stalker packs). Neither adds a boss or a rule exception; the Drowned Tzar keeps his one home; loot is the existing junk row and chest table. `scripts/gravewake-check.mjs` (group `festival2`) enforces this.
  [OWNER-APPROVED EXCEPTION 2026-10-01: MAP WRITER] The owner approved one generated dungeon (Shifting Barrow, `barrow` @88,64, L14, 3 floors) and one new site type, the rift zone (Ashen Rift, `riftvale` @20,60), both laid by `tools/map-writer` (seeded, no Math.random). Neither has a boss: a Stalker pack guards the barrow's boss room, and the rift holds trash plus a possible Stalker or Goblin. Bosses stay 21 and pockets stay 5. `scripts/gravewake-check.mjs` (group `mapwriter`) enforces this.
  [OWNER-REQUESTED 2026-10-01: MAP WRITER PHASE 2] Map-writer phase 2 (biome noise blending) is looks only: `tools/map-writer/gravewake_vale.ts` gives `draw.ts` a seeded ground skin for the vale (borders wander up to 2 tiles, with a dithered fringe from `border-dither.png`). The sim never reads it: the tile grid, collision, zone names and levels, foe families, every placement, and saves are unchanged. Group `mapwriter2` enforces this.
  [OWNER-APPROVED EXCEPTION 2026-10-01 18:48 ET: true 320x240 Retro view] The owner approved a literal 320×240 Retro view: in the Retro 320x240 display preset only, the camera shows 320×240 game pixels (about 20×15 tiles) at 1 canvas px per game px, integer-scaled with black bars. Every other preset keeps the C10 view and behaviour exactly (screen.ts runs Retro as its own first branch). No combat number, aggro range, spawn rule or movement changes. `scripts/gravewake-check.mjs` (group `retro1`) enforces this.
  [OWNER-APPROVED 2026-10-01 19:59 ET: night foe fade-in] The owner approved a looks-only fade-in for night foes: a night roamer (sim.ts spawnNightRoamer) dissolves in over 0.5 s through a pinned 4x4 Bayer dither on world pixels (no alpha, no new colour), with a six-chip ground-mist puff from the existing particle pool, in every preset. The foe is fully live during the fade (it can be touched, fought and hit, and attacks as before); its age is read from the spawn stamp already in its id, so sim.ts, the spawn rule, distance and timing, AI, aggro, HP, damage, collision, the sim tick and saves are unchanged. `scripts/gravewake-check.mjs` (group `fade1`) enforces this.
  [OWNER-APPROVED 2026-10-01 21:20 ET: festival foe fade-in, minimal sim.ts spawn-time tag] The owner approved the same 0.5 s dither-and-mist fade-in for festival foes only (Harvest Moon, Krampusnacht, Drowned Bloom, Ashen Fair: their bosses and named packs as they appear, the helpers and pack minions that join those fights, and anything they summon), and a minimal sim.ts change for it: those spawns write one optional field, spawnAt (the world ms they appeared at). Nothing in play reads it, it is not saved (old saves load as before; a foe already there when a scene starts draws solid; a 2x boss dithers through a 2x box), and spawn rules, positions, timing, AI, combat and numbers are unchanged. Bounties, rift foes and dungeon foes do not fade yet. `scripts/gravewake-check.mjs` (group `fade2`) enforces this.
  [OWNER-APPROVED 2026-10-01 22:14 ET: in-game Install button, web app manifest, offline service worker] The owner approved making Gravewake installable in one tap, and wants it in every game from now on: the game manifest (extended, relative to any site root), a build-time offline service worker (versioned by build hash, index.html network-first, skipWaiting/clientsClaim, old caches cleaned; production on https or localhost only) and an Install button on the title and under Pause › Display (beforeinstallprompt; iPhone gets the Add to Home Screen tip; hidden once installed). Code: src/pwa/, scripts/gravewake-sw-plugin.mjs. Presentation only: play, the sim and saves are unchanged. How-to for other games: specs/INSTALL_BUTTON_HOWTO.md (outside the source tree). `scripts/gravewake-check.mjs` (group `install1`) enforces this.

If they disagree, the roster names the kits and the layout names the numbers. Do not invent a second battle screen, a new scaling curve, or a copied Stardew asset.

## Sheets for the rest of the game

When a sheet is opened for one place, also keep tiles the rest of the game still needs: wilds, dungeons, camp, interiors, water, trees, rocks, fences. Save those under `public/art/held` with the license. A cozy or farm sheet is fine. Do not reskin a zone until that zone is the one being worked.

The pixel writer lives at `tools/pixel-writer`. Use it when a zone needs ground and no sheet fits. It draws 16×16 pixels from colors you pass in. Rebuild Gravewake's strips with `python3 tools/pixel-writer/make_gravewake.py`. Output is `public/art/writer`.

Trees and boulders come from `tools/brileta-sprites` (Mark Ayzenshtat, MIT). Rebuild with `npx tsc -p tools/brileta-sprites` and then `node tools/brileta-sprites/make_gravewake.mjs`. Output is `public/art/brileta`. Snap the soft edges onto the game's colors before they are drawn.

People and creatures come from `tools/sprite-writer`. Rebuild with `python3 tools/sprite-writer/make_gravewake.py`. Output is `public/art/sprites`. A body has eleven frames: stand, idle, three walk steps, a swing in three beats, and a cast in three beats. Heroes, companions, animals, monsters, bosses, minis, and rares are frames in those strips.

Bolts come from `tools/spell-writer`. Rebuild with `python3 tools/spell-writer/make_gravewake.py`. Output is `public/art/spells/gen`. That set includes fire, ice, lightning bolts, venom, shadow, holy, solid beams in those colors, flying orbs, fire rain, and ice rain. A lightning-colored bolt uses the lightning strip. Any other bolt is a solid beam. A ring or a mend is an orb. Fire or ice in a burst falls as rain. The color of the spell picks the strip. Damage does not change.

Combat stays on the field. Slash is a 40° cone. Whirl spends 18 stamina. Smite spends 12 mana and breaks one big move, then locks for 12 seconds. A vampire spends blood for both. Trash has one move and no tell. A remnant has the boss spam and mid, and no big move. A rare is a pack, except the mimic (owner-approved exception, 2026-09-30): a solo rare from a dungeon chest. A boss has spam, mid, big, and helpers. Death reloads slot 1 and takes no silver. Bulk is 4.6 for a common foe and 2 for a boss or a remnant.

STARDEW-LIKE PIXEL ART — STYLE LOCK FOR GAME BOT
================================================
Use this document as standing law for all art, tiles, sprites, UI, screenshots,
and engine display settings. If a request conflicts with this file, this file wins
unless the user explicitly overrides a named rule.

GOAL
----
Match the *craft* of Stardew Valley: small native pixels, limited palette,
3/4 camera, readable silhouettes, integer nearest-neighbor display.
Do NOT match “cozy farm vibe” while ignoring the grid.
Quality means CLARITY at 16×16, not extra pixels, not painterly detail,
not 1024×1024 fake-pixel mush.

Stardew on a monitor is native art × integer nearest-neighbor scale.
That is the look. That is the pipeline.


1. STYLE LOCK (paste into every art prompt)
-------------------------------------------
STYLE LOCK — Stardew-like pixel art, not “inspired by cozy games”

- Native resolution: tiles 16×16 px, objects 16×16 or 16×32, characters 16×32
- Display: nearest-neighbor scale only (4× default). No smoothing, no bicubic.
- Camera: 3/4 top-down, Stardew angle. No side-view, no isometric 30°, no 3D.
- Outline: 1 px dark outline, slightly warm (not pure black), consistent weight
  [OWNER-APPROVED 2026-10-01: CORE KEEPER GRAPHICS PASS C1-C11] C2: a selective outline (the touching material's darkest step) is approved for the later actor pass; batch 1 changes no outline.
- Palette: 12–20 colors total for this asset set. No new hues mid-set.
  [OWNER-APPROVED 2026-10-01: CORE KEEPER GRAPHICS PASS C1-C11] C3 (batch 2): palette v2 adds exactly #9a8aa8, #2e2030 and #8a3a18 (tools/sprite-writer/palette_locked.py PALETTE_V2_ADD, LOCKED_V2) and the doc's master ramps (tools/sprite-writer/ramps.py). LOCKED itself is unchanged, so older writers stay byte-identical. The floor kit uses palette v2: 14 colours per cave sheet (a 6-step floor ramp, the bone ramp, moss or ember).
  [OWNER-APPROVED 2026-10-01: CORE KEEPER GRAPHICS PASS C1-C11] C3 (batch 3): the ossuary and harrow walls take palette v2's #9a8aa8 as their bright lip (the ossuary takes the doc's crypt ramp; tools/pixel-writer/wall-ramps.json), and the harrow gets its own warm earth floor (slab #8a6858; floor-ramps.json), no longer the ossuary's grey.
- Shading: 2–3 value steps max. Clustered pixels. Light dither only. No smooth gradients.
  [OWNER-APPROVED 2026-10-01: CORE KEEPER GRAPHICS PASS C1-C11] C1: up to 4 steps per material on actors and up to 6 on architecture. Batch 1's wall kit uses 6-step ramps from each cave's own wall colours (tools/pixel-writer/wall-ramps.json).
- Lighting: soft overhead, slight south-east sun. No PBR, no bloom, no rim light.
  [OWNER-APPROVED 2026-10-01: CORE KEEPER GRAPHICS PASS C1-C11] C4, C6, C7, C9: below ground and outdoors at night a light layer runs (style doc Option A: banded, dithered light sprites added on a native canvas and multiplied over the world in Canvas2D, no shader, no bloom); its multiply may put off-palette texels on screen at runtime. Emissives (flames, the portal vortex) and telegraphs stay at full light. Wall faces are 24-32 px over a 1-tile footprint, art only, no collision change.
  [OWNER-APPROVED EXCEPTION 2026-10-01 15:59 ET: hero light 96/72 px] The hero's light is 96 px below ground and 72 px outdoors at night, an owner-approved exception to GAME_LAYOUT_TWO's off-hand radius (3–5 tiles); its lit pool is 57 px (3.5 tiles) and 43 px (2.7 tiles).
  [OWNER-APPROVED 2026-10-01: CORE KEEPER GRAPHICS PASS C1-C11] Batch 3 glow masks: foes' flame and eye pixels (#f4e27a, #fff8e0, #e0a040) stay at full light through masks the pixel writer cuts from their sheets (public/art/sprites/foes_em.png, pumpkin-lord_em.png, krampus_em.png); the mimic has none, so its eyes never give it away.
- Edges: hard pixel stairs. No anti-aliasing, no blur, no JPEG mush.
- Proportions: chunky, readable silhouettes. Big heads ok. No realistic anatomy.
- Output at NATIVE pixel size only. Each texel is one flat color.
- Preview scaling, if any, must be nearest-neighbor integer scale (4×).
- Forbidden: painterly, oil, anime HD, 3D render, Unreal, photoreal grass,
  film grain, drop shadows that ignore the grid, text in the image, watermark,
  [OWNER-APPROVED 2026-10-01: CORE KEEPER GRAPHICS PASS C1-C11] Batch 2: every actor stands on a blob shadow (style doc section 7): a hard-edged ellipse of native pixels at the feet, pinned to the pixel grid, multiplied to 45% (C7); none on water or ice. It does not ignore the grid.
  bilinear / “smooth pixels,” high-res paint pretending to be pixels,
  UI chrome copied from Stardew, logos, exact copyrighted sprites


2. WHAT “LIKE THESE PICTURES” MEANS
-----------------------------------
Reference images teach RULES, not mood.

Copy from a reference only when named:
- same tile size
- same outline weight
- same color count in that object
- same 3/4 camera
- same light direction
- same silhouette mass

Do NOT copy:
- ConcernedApe / Stardew exact sprites, characters, buildings, logos, fonts
- HUD, clock, energy bar, inventory chrome
- already-upscaled screenshot mush (treat big screenshots as composition only)

How to ingest a user screenshot:
1. Crop to ONE object (one crop, one cow, one roof).
2. Nearest-neighbor DOWNSCALE until the grid is 16 or 32 on a side.
3. Use that tiny image as the style ref.
4. Generate at that same native size.
5. Only then scale up with nearest neighbor for preview.

Full-screen farm shots are weak refs. One cropped object is a strong ref.


3. NEAREST-NEIGHBOR SCALING (NON-NEGOTIABLE)
--------------------------------------------
Nearest neighbor = point filter = NN = integer scale.
Each source pixel becomes a block of the SAME color. No new in-between colors.

NEVER use bilinear, bicubic, linear, trilinear, “smooth,” or default photo filters
on sprites, tiles, or the low-res game backbuffer.

Rules:
- Draw / generate at native size (16×16, 16×32, etc.).
- Display only at whole-number zoom: 2×, 3×, 4×, 5×, 6×. Never 1.5× or 2.75×.
  [OWNER-APPROVED EXCEPTION 2026-10-01 18:48 ET: true 320x240 Retro view] Retro 320x240 draws the world at its native 320×240 and scales the whole frame by the largest whole number that fits (2× on 960×640, 3× on 1280×720, 4× on 1920×1080 and on an 844×390 3x phone), with black bars.
- Snap sprite and camera draw positions to whole native pixels.
- Prefer: render the world at a native backbuffer, then nearest-neighbor
  stretch the WHOLE FRAME to the window. Do not scale each sprite to 1080p.

Integer zoom table (letterbox / pillarbox extra pixels; do not “stretch a little”):

  Native     3×         4×          5×          6×
  320×180    960×540    1280×720    1600×900    1920×1080
  384×216    1152×648   1536×864    1920×1080   2304×1296
  480×270    1440×810   1920×1080   2400×1350   2880×1620

Default recommendation unless user says otherwise:
- Tiles 16×16, actors 16×32
- Native world 320×180 or 384×216
- Display 4× nearest neighbor
- Pixel-perfect camera

Tool settings:
- Aseprite: Scale mode = Nearest-neighbor
- Photoshop: Resample = Nearest Neighbor (hard edges)
- GIMP: Interpolation = None
- Godot: texture filter Nearest; stretch viewport + keep aspect / integer scale
- Unity: Filter Mode = Point (no filter); Pixel Perfect Camera if available
- Phaser / Pixi: roundPixels true; scale mode NEAREST
- CSS: image-rendering: pixelated
- ffmpeg / ImageMagick: neighbor / point / interpolate Nearest

Do not rotate sprites in engine except 90° steps, or pre-render frames.
Do not use bloom, TAA, DoF, or blur passes on the pixel layer.
Light with 2–3 shade steps on the grid, not smooth lightmaps.
[OWNER-APPROVED 2026-10-01: CORE KEEPER GRAPHICS PASS C1-C11] C4: the light buffer is five hard bands with a pinned 4x4 Bayer dither at band edges (src/game/light.ts), not a smooth lightmap.


4. HOW TO ASK / HOW TO BUILD ASSETS
-----------------------------------
One subject per request. Never “a farm.”

Good:
- “16×16 tilled dirt tile, four variants, style lock.”
- “16×32 player idle, 4 frames, feet on pixel grid.”
- “Must read as a parsnip at 16×16 from across the room.”
- “Roof uses only 4 browns + 1 shadow.”

Bad:
- “Ultra detailed like the screenshot.”
- “8K pixel art.”
- “Make it better quality / higher detail.”
- Mixing tileset + character + UI in one image.

Pipeline order:
1. Freeze palette (export a 16×1 or 32×1 swatch strip; reuse every request).
2. One hero tile that is clean at 16×16.
3. Variants of that tile (same light, same outline, same palette).
4. Buildings from the same kit.
5. Characters on a sheet (idle / walk / tool), same silhouette language.
6. UI last, same grid, same outline, same palette family.

After a good result, next prompt must say:
“same palette, same outline weight, same light direction as the last approved image.”


5. ENGINE / BOT IMPLEMENTATION RULES
------------------------------------
When writing game code or importing art:
- Point / nearest filter on ALL sprite textures
- Integer zoom only
- No linear filtering “just for this layer”
- round draw positions to whole pixels at native res
- Compression off or lossless for pixel art
- Do not autogenerate mipmaps that blur sprites

A correct 16×16 sprite displayed with linear filter looks worse than Stardew.
That is an engine bug, not an art-direction change. Fix the filter.


6. REJECTION RUBRIC (BOT MUST SELF-CHECK)
-----------------------------------------
Reject and redo if ANY of these are true:
- You cannot count individual texels when zoomed
- Edges have gray / anti-aliased fringe
- Output is 256px+ on a side but claims to be a 16×16 sprite
- New colors appeared that are not in the locked palette
- Camera drifted to side-view, 3D, or true isometric
- “Detail” was added as noise inside a single pixel
- Sprite would be unreadable at 16×16
- Image contains HUD, watermark, or readable text that was not requested

Critique language to use:
- “Edges are anti-aliased; need hard nearest-neighbor pixels.”
- “Delivered 512×512 fake pixel clusters. Redo at true 16×32.”
- “Do not add detail inside a pixel. One color per pixel.”


7. LEGAL / ORIGINALITY
----------------------
Do not recreate Stardew Valley assets, characters, maps, logos, or UI.
Original crops, tools, animals, buildings, and faces in the same craft language.
Gravewake keeps its own gothic theme, names, and rules.


8. DEFAULTS IF USER IS VAGUE
----------------------------
If the user says “more like the pictures” or “higher detail” with no numbers:
- Keep native 16×16 / 16×32
- Keep 12–20 color set
- Keep 4× NN preview
- Improve READABILITY (silhouette, 1-px outline, 3-step shade), not resolution
- Ask for one cropped object if refs are full screenshots

Override only when the user names a new tile size, palette count, or camera.


QUICK TEST
----------
Produce one 16×16 chest with this lock. Zoom until pixels are countable.
If the chest is muddy, the pipeline is wrong — fix size/filter/prompt
before making a tileset or a character sheet.


OWNER-REPORTED BUGS
-------------------
[OWNER-REPORTED 2026-10-01 23:25 ET: playtest1 phone playtest fixes] Bill's phone playtest (batch A). Movement and collision fixes were allowed; placement stays seeded, art is palette-locked and made by the writers, saves stay backward compatible.
- Town: 40x30; every door on its house's south face with a stoop, front-only entry, solid backs; only the ten road gates lead out, each on its own side; the vale's town door arrives at the matching gate; an old save standing in a wall is lifted to open ground (unstick).
- Swimming needs the whole foot box over water. The hero's look is the player's alone (NPCs and companions wear sellsword, cutpurse, hedgemage, patron). Swim/slide/fish/climb come from public/art/sprites/moves.png (sprite writer). The walk cycles 2 3 4 3 at 8 frames a second.
- Spells (picture only): 0.6 s, drawn over the actors, flight then impact; the spell writer's strips preload; a wizard's Smite is shadow purple.
- Speed: the vale's fringe sheets preload (a missing sheet made the vale build a canvas per fringed tile per frame); rain is one pre-drawn sliding layer.
- Camp asks "Leave camp?". The shell autosaves (gravewake-autosave-v1) on hide, close, blur, fullscreen exit and every 45 s, pauses under "Tap to resume", resumes on reload, traps the back gesture with "Leave game?" and raises beforeunload. Installing with the Install button is still the best protection against the Android back gesture.
- Ground: town cobble, dirt, water, pool, fence, vale road and room floors are pixel-writer strips (the land pack's cobble/water and the cozy dirt are no longer drawn).
- Checks: group playtest1. The six game files it changed are frozen as install1 left them in scripts/frozen/playtest1/; the older groups' byte pins read those copies.

[OWNER-REQUESTED 2026-10-02 00:52 ET: playtest1b looks, "gloom and glow"] Bill's batch B, plus his 2026-10-02 01:03-01:06 ET playtest notes (bugs/playtest-2026-10-02/NOTES.md). Dark scenes full of glowing things: neon blue cold fire first, then violet and red, on lanterns, wisps, signs and town decor. Same rules as A: placement seeded, art palette-locked and writer-made, saves backward compatible.
- Palette v3 (tools/sprite-writer/palette_locked.py): LOCKED_V3 = LOCKED_V2 + #4ab8ff #9ae4ff #b07aff #ff3a50; NEON ramps blue/violet/red (deep, halo, mid, tube, core, hot). New writer art is checked against LOCKED_V3.
- Pixel writer glow_writer.py: 3x5 font sheet, 13 neon trade signs (2 frames, emissive masks), the vale's walled-hamlet town icon (48x40, emissive), its 12x12 map icon, the camp button icon (tent with cold-blue fire, a/b/break). Sprite writer portrait_writer.py: 48x64 class busts in portraits.png.
- Town: every room door hangs its trade's neon sign; names float over NPCs within 6 tiles (trades blue, companion violet, named bosses red), the room name in gold by its door; homes keep a fenced yard (looks only, never in g.tiles); every building is house scale (the 32x46 shack is gone); the jack-o'-lanterns are whole.
- HUD: the camp button wears the writer icon and dims (aria-disabled) where camping is not allowed; the camp mark asks at once; the phase chip says "Day · town twilight" in town by day and the festival line says "... festival"; the swim log line becomes "You climb out onto dry ground." on leaving water; the minimap has an iron frame with neon studs and markers (stairs violet, gates blue, doors gold, hero pointer). Select screen: four portrait cards.
- [OWNER-APPROVED 2026-10-02 Bill] Mana: max MP = old formula x2.5 (MANA.pool), MP regen = old rate x3 (MANA.regen). A fresh wizard: 83 MP (was 33), 6 Smites from full and most of a 7th; 0.90 MP/s (was 0.30). Spell costs and damage unchanged.
- Checks: group playtest1b. The playtest1 group's byte pins read the playtest1a copies in scripts/frozen/playtest1b/.

## playtest1c (batch C, art audit) — [OWNER-REQUESTED 2026-10-02 02:07 ET: playtest1c art audit] part C1
- Inventory and deferred list: specs/ART_AUDIT.md. New art module src/game/wild.ts; writer tools/pixel-writer/wild_writer.py via make_gravewake.playtest1c_c1() (also writes wild-border, wild-flecks, wild-boss-aura).
- The world's trees/deadwood/rocks/graves/pumpkins, water/pond/pool/ice and biome grounds (wrapping 128x128 sheets via texCell + paintShore rims), dungeon mouths (paintEntrance, ENTRANCE_CELL by entranceKind) and floor stairs are writer art; the third-party creature/fall/brileta/held/dead-trees/decoration sheets are out of the draw and the preload. water.png is the water recipe's output again (locked band #2a4060).
- Bosses draw at 1x (scaleFor) in a cold-fire ring; the rat is redrawn (sprite writer). Idle: IDLE_BEAT (4 s, 1.5 s shift) with idleSeed per body; scarecrow hop arc and idle, Pumpkin Lord idle fixed. Drawing only: sim, content, saves and g.tiles untouched.
- Checks: group playtest1c (live pin last; re-pin with qa/playtest1c/repin.py). Batch B's files are frozen in scripts/frozen/playtest1c/ and the playtest1b pins, the season tree-sheet check and the town-pumpkin source-box check read them. wild.ts is in LATER_MODULES. fade2's boss dither box is now the 1x box.
- C2 (deferred): town houses and cabin, cozy town grass, third-party spell strips, the tile-step biome outline, the ice arrow square.

## playtest1d (batch C2, art audit) — [OWNER-REQUESTED 2026-10-02 06:55 ET: playtest1d art audit C2]
- Writer tools/pixel-writer/town_writer.py via make_gravewake.playtest1d_c2(): town-house-{stone,warm,slate}, town-cabin (+ _em glow masks), town-grass, wild-stairs-themes, wild-border-rim. Constants in src/game/wild.ts (TOWN_HOUSES, TOWN_CABIN, TOWN_GRASS, STAIRS_THEMED, stairCell, WILD_BORDER_RIM).
- draw.ts: houses by x0 % 3, lit windows via paintTownBuilding(..., em) in the glow pass; town lawn from TOWN_GRASS; rim line after the fringes; themed floor stairs; trap plates only when mapId is "dungeon"; spells only from /art/spells/gen. season_sheets draws the town lawn per season.
- Checks: group playtest1d (live pin last; re-pin with qa/playtest1d/repin.py). C1's game files are frozen in scripts/frozen/playtest1d/ and the playtest1c live pin and playtest1b house-scale check read them.

## playtest1e (batch D1, bigger world + no void) — [OWNER-APPROVED 2026-10-02: playtest1e bigger world] [OWNER-APPROVED 2026-10-02: playtest1e no void]
- The vale is 128x120 (WORLD in content.ts: scale 2, was 64x60). worldBiome(tx,ty) is the old rectangle rule (planBiome) at twice the size; every world place, boss, cart, NPC, festival spot and DUNGEONS/RIFTS tx,ty is doubled. GATE {64,90}, WORLD_DOOR {64,88}.
- The grid is the map writer's phase 3 (writeOverworld in tools/map-writer/map_writer.ts, adapter gravewake_world.ts, seed "gravewake-world-1e"); sim.ts layWorld passes the sites and lays its own door, stairs, folk and props; memoized (first build ~50 ms). worldPlan() lists landmarks and caches. The "g.tiles never changes" law is lifted for the vale only (owner approval above).
- No void: draw.ts cameraFor clamps the camera to the map (centres a smaller map); paintBeyond fills any view past the edge with edge ground and trees outdoors, rock below ground (fog-free maps draw it once into an offscreen cache, beyondCached; the two rows below the map stay live in the y-sort). The corner map shows the border forest past the edge. The tap aim uses cameraFor.
- Saves: worldV (2) in the record; migrateWorldSave doubles old vale positions, camp spot, world portal and world drops on load.
- Checks: group playtest1e (live pin last; re-pin with qa/playtest1e/repin.py). The files batch D edits are frozen as playtest1d shipped them in scripts/frozen/playtest1e/; pinFile and pt1dFile point the older pins there. Older fixed-seed traces (fade1, fade2), the mapwriter2 grid, reach and lair pins and the playtest1b vale hash are re-pinned to the new grid (qa/playtest1e/pins.json).

## playtest1f (batch D2, wayrifts + swamp path) — [OWNER-APPROVED 2026-10-02: playtest1f portals]
- src/game/wayrifts.ts: WAYRIFTS (11; 4 hubs at the gate, 4 seasonal festival rifts, rift/barrow/waste), footprint helpers (waySolid, wayMouthAt, wayArtAt), wayLink/wayAwake by season, stampWayrifts (clears the footprints on the vale grid; cuts a trail if a front is walled in). Sheets WAYRIFT_SHEETS (wayrift, wayrift_em, wayrift-icon, swamp-path) from tools/pixel-writer/rift_writer.py via make_gravewake.playtest1f_d2().
- sim.ts: layWorld stamps the rifts; solidAt makes the stones solid; tryEntrance starts travel (sealed rifts log once); update runs tickTravel while travel is set (nothing else moves); wayHold stops an instant bounce back; setGoal sends a tap on the art to the mouth; enterWorld unsticks. travel and wayHold are never saved.
- draw.ts: rift props in the y-sort with glow cells, a NEON blue light at night (each awake far rift at its mouth; the gate's four share one per pair, wayLights, so the gate costs 2 lights and the fps stays at 1e's), labels, markers on the corner map and the full map, the travel iris (paintTravel, no alpha), the swamp path (paintSwampPath, swampPathCell) after the fringes.
- Checks: group playtest1f (live pin last; re-pin with qa/playtest1f/repin.py). sim.ts and draw.ts are frozen as playtest1e shipped them in scripts/frozen/playtest1f/ and group playtest1e's live pin reads them (pt1eView). The vale grid FNV, reach, lair, fade1/fade2 traces and the playtest1b vale hash are re-pinned to the stamped grid (qa/playtest1f/pins.json).

## playtest1g (trail paths, drawing only) — [OWNER-APPROVED 2026-10-02: playtest1g trail paths]
- src/game/trails.ts: TRAIL_VALE/SNOW/ASH/SAND, TRAIL_SHEETS, TRAIL_BY_GROUND (vale grass, snow, ash, sand; the swamp keeps SWAMP_PATH), TRAIL_SEASON_ROW. Sheets from tools/pixel-writer/trail_writer.py via make_gravewake.playtest1g().
- draw.ts: the TRAIL_SHEETS preload; in the tile loop trailGround picks the ground of a vale/snow/ash/sand trail tile (-1 off trails, on the swamp, before the sheet loads) and trailComposite draws the tile as one copy from the opaque trail atlas (TRAIL_ATLAS 64x64 slots, alpha off; each ground cell + path cell composited once, keyed by sheet, ground cell, path cell and season row; swampPathCell's mask, the vale's row by g.season()) in place of the flat dirt square. While a ground sheet loads, drawTile + paintTrailPath draw the two.
- Checks: group playtest1g (live pin last; re-pin with qa/playtest1g/repin.py). draw.ts is frozen as playtest1f shipped it in scripts/frozen/playtest1g/ and group playtest1f's live pin reads it (pt1fView). The group draws each spot with that frozen draw too (the swamp, town, camp, a dungeon and unloaded sheets call for call; the blit budget).

## playtest1h (art and loading audit, drawing only) — [OWNER-REQUESTED 2026-10-02 19:43 ET: playtest1h art and loading audit]
- draw.ts: SPELL_FX (/art/spells/fx) strips in paintSpellPhased only (cast-<el> at the hand in the first 40% of the flight; impact-<el> 32x32 at the hit, the old 2x nova/ring burst and px sparks only while it loads; shock-<el> 64x32 on the ground for a self-centred cast or any nova); fxElement/spellGlow (a near-black colour is shadow's violet #b07aff); paintWhirlRings reads K_DUST specks (particles.ts untouched) and holds whirl.png 0.36 s; warmPt1h/PT1H_ART preload. spellElement, spellStrip and paintSpell are unchanged.
- draw.ts props: PROP_CHEST on its own ground (chestOn: floor indoors and below, the biome outside; dungeon floor-kit slab), PROP_MIMIC_LID over it for a sleeping mimic (old mimic-sleep.png only with the old chest), caveLiquid(theme) texCell for dungeon water/pools, PROP_BONES for bone tiles, cave road/cobble on the floor kit. Each keeps its old painted draw as the not-yet-loaded fallback.
- Art: tools/spell-writer/fx_writer.py via make_gravewake.playtest1h() (public/art/spells/fx; gen/ stays the bolts and their emits.json); tools/pixel-writer/prop_writer.py via make_gravewake.playtest1h() (prop-*.png, cave-liquid-<theme>.png; cave-liquids.json mirrors draw.ts CAVES).
- Checks: group playtest1h (live pin last; re-pin with qa/playtest1h/repin.py). draw.ts and the pixel make_gravewake.py are frozen as playtest1g shipped them in scripts/frozen/playtest1h/; group playtest1g's live pin, draw text and bundled draw read them (pt1gView).

## playtest1i (art audit part 2: interiors and map consistency, drawing only) — [OWNER-REQUESTED 2026-10-02 19:43 ET: playtest1h art and loading audit]
- src/game/interiors.ts: ROOM_STYLE (room id -> its town footprint's outside style), ROOM_FURNITURE (piece + top-left px, clear of the door, hero start, keepers, the guild board, croft slots), FURN cells, FURN_LIGHT, ROOM_KIT_EXTRA (croft bed + stove), INTERIOR_SHEETS. In LATER_MODULES.
- draw.ts: roomStyleNow (from g.inside) -> room floor texCell(room-floor-<style>), paintRoomEdge room-wall-<style>, rug row in room-rugs.png, furniture props + room-furn_em glow, trade tiles on the room floor, old px furniture/boards/wall/rug only while loading; sconce light by STYLE_GLOW plus FURN_LIGHT; warmPt1i (PT1I_ART). paintBites: road/town dirt/camp clearing edges take the grass through WILD_BORDER drift masks (BITE_ROAD 5 px for the vale road), cached per tile+season.
- Art: tools/pixel-writer/interior_writer.py via make_gravewake.playtest1i() (public/art/writer room-floor-*, room-wall-*(+_em), room-furn(+_em), room-rugs, preview-playtest1i).
- Checks: group playtest1i (live pin last; re-pin with qa/playtest1i/repin.py). draw.ts and the pixel make_gravewake.py are frozen as playtest1h shipped them in scripts/frozen/playtest1i/; group playtest1h's bundle, rest digest and live pin read them (pt1hView).

## playtest1j (telegraphed attacks and dynamic fight lights) — [OWNER-APPROVED 2026-10-03: telegraphed attacks, dynamic fight lights]
- Owner-approved gameplay change (Bill, 2026-10-03 08:41 ET). The standing line "Theme, combat ... stay" and Layout Two's TELEGRAPHS / MONSTER TIERS tables are amended for this batch only by the dated notes in rules/GAME_LAYOUT_TWO.txt; everything else in combat stays.
- src/game/telegraph.ts: TELL (slot bases, reaction 0.2, cap 1.2), PHASE (at 0.5, cycles 8/6, nova 52, roar 0.8), markRadius (the old table), fairTell / tellFor (the fair floor), bigPattern (aim; phase two nova/echo), MARK_NEON. In LATER_MODULES.
- src/game/sim.ts (fight only): beginCast uses tellFor and bigPattern and sets r.tellMax; tickField turns a boss with a big to phase two at <= 50% HP (roar log) and follows an aimed phase-two big with beginEcho; bigCycle 8/6 s. Roamer fields tellMax, phase, bigs, pattern are never saved.
- src/game/fightlights.ts (looks only): cached neon mark sprites (paintTells, paintTellLane, paintWindup) and the pooled fight lamps (fightLights, 12 lamps) that sceneLights adds before its 24-light trim. draw.ts: tellView, paintTells under the props, in the glow mask and (rims only) over Lightless.
- Checks: group playtest1j (live pin last; re-pin with qa/playtest1j/repin.py). sim.ts and draw.ts are frozen as playtest1i shipped them in scripts/frozen/playtest1j/; the older groups' views (pt1iView), rest digests and live pins read them.

## playtest1k (elemental combos and companion commands) — [OWNER-APPROVED 2026-10-03: elemental combos, companion commands]
- Owner-approved combat and companion change (Bill, 2026-10-03 08:41 ET, re-confirmed 10:03 ET). Layout Two's PAD MAP and WEAKNESSES sections carry the dated notes in rules/GAME_LAYOUT_TWO.txt; "no hard immunities" still holds (combos are bonuses, never gates).
- src/game/combos.ts: ELEMENTS, SPELL_ELEMENT / artElement (the 1h fx element each spell and art draws), STATUS (poison 6, linger 2, comboCool 3), OILED_FAMILIES / RIMED_FAMILIES, WET_WEATHER / COLD_WEATHER, COMBO numbers, reaction / comboBonus / comboSpread. src/game/commands.ts: ORDERS, ORDER (radii, times, cooldowns), ORDER_LABEL. Both in LATER_MODULES.
- src/game/sim.ts: Roamer st / taunt (never saved); tickStatus per field foe (no RNG); applyElement on spell and art hits (two per cast); order() with orderWait / allyHeals / resetOrders (called by loadRecord); taunt redirects swings, marks and spam to the companion (aimOf, hurtAlly, HP floor 1); guard cut in bite; focus in tickAlly / followCompanion; stay leash. Binds: keys Z X R V, pad 7 6 11 10, merged with old records in gravewake-binds-v1.
- src/game/draw.ts: paintCombos (status motes, taunt "!", focus reticle, stay pin, guard dashes, pops in the pixel font). Gravewake.tsx: keyboard orders, the touch strip (hud-orders / order-<o>), help and binds labels.
- Checks: group playtest1k (live pin last; re-pin with qa/playtest1k/repin.py). sim.ts, draw.ts and Gravewake.tsx are frozen as playtest1j shipped them in scripts/frozen/playtest1k/; the older groups' views (pt1jView under pt1iView and pt1eView), rest digests and live pins read them.

## playtest1l (optional bloom glow and scanlines) — [OWNER-APPROVED EXCEPTION 2026-10-03 09:21 ET: optional bloom glow and scanlines]
- Owner-approved exception to Layout Two's "No bloom" (Bill, 2026-10-03 09:21 ET). Dated notes sit under every "No bloom" line in rules/GAME_LAYOUT_TWO.txt and the prompt file. Scope: a player setting only, a layer over the finished playfield (the game canvas is never redrawn), HUD/minimap/menus dry, bloom off without WebGL. Off, the frame is the old one.
- src/game/postfx.ts: settings record gravewake-postfx-v1 (parseFx field by field; old boolean forms migrate; bloom null = device default), fxStore, deviceBloom (Low on a capable GPU; Off on the Phone preset, a software renderer, ≤2 cores, ≤2 GB, or after the fps guard caught it), guardStep (default bloom only; a 4 s window under 40 fps tries 4 s without, 20% faster turns it off and remembers autoOff), fxSize / scanColumn, class PostFx (fx-glow WebGL1 bright-pass + separable blur at half the game pixels seen, max 480 wide, premultiplied glow canvas scaled smooth over the frame; fx-scan a static 1 px column, one alpha per device row, 2D canvas so it works without WebGL), fxFrame (play modes only). src/game/FxOptions.tsx: the Bloom glow and Scanlines rows (bloom-off/low/high, scan-off/subtle/strong, bloom-note) in the Display options. Both in LATER_MODULES.
- Gravewake.tsx: two imports, fxRef, new PostFx after the 2D context, fxFrame after the draw, dispose in the cleanup, the fx-layer div right after the game canvas (under every HUD element), <FxOptions> in ScreenOptions. screen.ts, sim.ts, draw.ts unchanged; no save field moves.
- Checks: group playtest1l (live pin last; re-pin with qa/playtest1l/repin.py). Gravewake.tsx is frozen as playtest1k shipped it in scripts/frozen/playtest1l/; group playtest1k's shell text, rest digest and live pin read it through pt1kView (under pt1jView); pt1lNew keeps the two new modules out of every older rest digest.
- Measured (6x CPU throttle, 3 runs, headless SwiftShader, ossuary fight; qa/playtest1l/PROGRESS.md): before (1k) Auto 27.0, Phone 29.0, Retro 32.4; Off 27.7 / 27.9 / 31.5; Low 23.3 / 20.5 / 27.3; High 25.0 / 24.2 / 27.6; scanlines only 28.0 / 30.9 / 30.6. So scanlines default Off but cost nothing, and bloom defaults Off on Phone (it costs Phone the most). Do not go back to a full-frame WebGL composite (design 1: Low 8.4 / 12.1 / 19.1).

## playtest1n (use-the-room combat) — [OWNER-APPROVED 2026-10-03 15:41 ET: use-the-room combat]
- Owner-approved gameplay change (Bill, 2026-10-03 15:41 ET, approved with the 1m tidy). Layout Two's HIT FEEDBACK / LAW knockback lines and its TELEGRAPHS section carry the dated notes in rules/GAME_LAYOUT_TWO.txt; screen shake stays as the law says (none added), and the old 2-3 px knockback is unchanged.
- src/game/room.ts: ROOM numbers (shove 110 px/s x 0.12 s, spikeStun 0.4, fire r20/28 4 s tick 0.5, drop 0.35 s 14 px, oil r24 10 s soak 6 s, fuse 0.8 / blast r32 stun 0.6, ignite 24, fall 0.6 s 44x10 stun 1.5, shares foeSpike 2 / foeFire 0.6 / foeBlast 3 / foePillar 2.5 / heroFire 0.4 / heroBlast 1, wary 1 in 3 bold, maxPatches 6, maxProps 5, per 30, openMin 5, gap 3, stairGap 2, arriveGap 3), placeRoom (seeded, no RNG; flood-fill keeps the floor whole), propOrder, hazardAt, wary, inLane, inSwing. src/game/roomdraw.ts (looks only): roomScene, roomRims, roomLights (own 10-lamp pool). Both in LATER_MODULES.
- src/game/sim.ts: Game.room (never saved; placeFloorRoom in loadFloor, hidden secret rooms count as rock), props solid in solidAt below ground, tickRoom after tickTraps, strikeCone shoves and strikes props, roomHold (shove, stun) in tickField, roomStep (wary) in stepFoe, castKnown/smite aim at a prop with no foe in reach, fire at an impact ignites, oiled() reads the oil soak. Roamer runtime fields shoveX/Y/T, stun, oilT, spikeAt (never saved). No save field added, so no migration; old saves load as they were.
- draw.ts: one import and three tagged calls (roomLights after fightLights, roomScene after the ground marks, roomRims over the Lightless dark). Art: tools/pixel-writer/room_writer.py -> public/art/writer/room-props(.png, _em.png), room-fire.png (4 frames), room-oil.png.
- Checks: group playtest1n (live pin last; re-pin with qa/playtest1n/repin.py). sim.ts and draw.ts are frozen as playtest1m shipped them in scripts/frozen/playtest1n/; the older views (pt1mView under pt1lView), rest digests and live pins read them; pt1nNew keeps the new modules and art out of every older rest digest.

## playtest1o (sprite motion, collision, art consistency, signs) — [OWNER-REQUESTED 2026-10-03 19:49 ET: playtest1o motion, collision and art check]
- Bill (2026-10-03 19:49 ET) asked whether every sprite walks the right way, nothing floats, collision is right, the rooms are up to date, the buildings are signed, and all the art is at one level. Standing permission to publish.
- Facing (looks only): src/game/facing.ts (viewOf, axisFace with a 1.15 hold, faceOf per-body memory, teleports > 24 px ignored, foes in a fight and folk within 40 px turn to the hero). tools/sprite-writer/dirs_writer.py writes the 8 -dirs sheets (row 0 back, row 2 side facing right; the strip's columns) and 3 -dirs_em masks; sprite_writer.py's front output is byte-identical. draw.ts sheetCell reads the -dirs cell while a body's view is set (front stands in while loading); DIRS_EM is kept out of gfx3's EM_SHEETS. Horse, cat, rat (SIDE_NATIVE) only mirror; a climb is the back; critters now walk their frames.
- Collision: src/game/blocking.ts. Furniture feet (FURN_BOX / KIT_BOX opaque boxes; wall pieces from y 16 down, floor pieces their lower 12 px; 1 px inset, 2 px off the bottom). Yard fences: yardPieces is the one source for the draw and the sim (29 pieces; no rail along the next building's face, so the inn and shop doors in the lane stay open). sim solidAt: furniture inside (never on a T.hearth tile: the chapel altar's front is the way down), fence tiles in town. The hero is nudged only when wedged (no free step any way), not when leaning on a wall.
- Signs: inside, the trade's sign on the back wall at x 7 (croft x 13 when a trophy takes 7) with the name in gold; the HUD place line "Inside <name>" (sim roomNameOf).
- Art at one level: tools/pixel-writer/loot_writer.py -> public/art/writer/loot.png (16 loot cells; ground drops and the Pack's slots and rows, src/game/loot.ts) and cave-ore.png (4 ore crystals on cave floors); the painted shapes stay only as the not-loaded fallback. The pre-1b painted footprint fence (paintYardFence) is removed.
- Checks: group playtest1o (re-pin with qa/playtest1o/repin.py; re-make the older-group edits with qa/playtest1o/edit_check.py from the pre-1o script, then insert_group.py). sim, draw, the shell and the three writer files are frozen as playtest1n shipped them in scripts/frozen/playtest1o/ (pt1nView under pt1mView); groups 1b and 1i bundle the 1n draw, group 1m reads the 1n shell. So the live draw is still judged as a whole, group playtest1o draws actor-free scenes (town, the five biomes in autumn, winter and spring, the camp, four dungeons) call for call against the 1n draw (only the yard fence and cave ore may differ), and the loot writer's key must be palette v3 as written.

## playtest1p (view polish, big bosses) — [OWNER-APPROVED 2026-10-04 01:10 ET: playtest1p view polish and big bosses]
- Bill (2026-10-04 01:10 ET) asked for hand-polished back and side walk views, and bosses at least 5x the player's size with minis and rares 2 to 3x. Standing permission to publish.
- BOSS SCALE RULE (src/game/bigboss.ts BIG; keep it): boss 5, mini 3 (a remnant), rare 2 (a Stalker pack's leader, a mimic, a naughty-list name), everyone else 1, linear against the hero's 16x32 cell (a boss cell is 80x160). A new boss, mini or rare gets its big sheet from tools/sprite-writer/boss_writer.py (public/art/sprites/big/<family>-<rank>.png + _em mask: 11 poses x 4 views, front/back/east/west, magnified by rule from the 1x frames, never resampled, palette locked, hard alpha); the 1x cell whole-pixel scaled stands in while it loads. Summons and trophy ghosts keep the people's scale (draw.ts peopleScale).
- A big body fights as big as it looks: BODY (hurtbox past the feet: boss 22, mini 11, rare 5) for every reach to and from it (swings, cones, the nova = PHASE.novaR + BODY, pulls, the companion's stand-off); FOOT (boss 18x8, mini 9x4, rare 4x2) is stopped by walls and props whole, and the hero cannot walk deeper into a fighting big body's foot (stepping out is always free). Every place a big body is met has its foot plus DODGE 48 px of open ground: world lairs and the festival spots are cleared to a 6x5-tile ellipse (sim.ts clearLair; the vale's grid, reach, save and trace pins re-pinned), each boss dungeon's last floor has a bare 12x10 hall with the boss in its middle, the festival bosses stand where they have room (roomyNear). qa/playtest1p/arena.mjs audits all 26 places with real fights.
- Camera: in a fight with a big boss or mini within 260 px, cameraFor frames the body and the hero together (sim.ts camFocus gives its middle and half-size), the hero's body kept 12 px inside; the tap aim reads the same. On Retro 320x240 and a phone in landscape (~195 px high) a 5x boss, its name and the hero fit with the hero level with it; a 960x540 desktop window at zoom 4 (135 px high) cannot show a 143 px boss whole.
- Walk views: tools/sprite-writer/views_writer.py lays every person's back and profile by hand (hair rows, partings, brim shadow, no face from behind; a true profile with a stride); the -dirs sheets are now 96 tall: row 0 back, row 2 east, row 4 west (people keep the weapon in the same hand, so west is its own drawing; drawn creatures and the swim/slide/fish moves turn east over). facing.ts viewOf(3) = row 4, unmirrored. Fronts byte-identical to 1o.
- Checks: group playtest1p (re-pin with qa/playtest1p/repin.py; re-make the older-group edits with qa/playtest1p/edit_check.py from qa/playtest1p/check_pre1p.mjs, then insert_group.py). sim, draw, facing, fightlights, the three sprite-writer files, the eleven -dirs sheets and this file are frozen as playtest1o shipped them in scripts/frozen/playtest1p/ (pt1oView under pt1nView); groups 1j and 1k fight on the frozen 1o game.
