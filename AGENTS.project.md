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
  [OWNER-APPROVED EXCEPTION 2026-10-01: MAP WRITER] The owner approved one generated dungeon (Shifting Barrow, `barrow` @44,32, L14, 3 floors) and one new site type, the rift zone (Ashen Rift, `riftvale` @10,30), both laid by `tools/map-writer` (seeded, no Math.random). Neither has a boss: a Stalker pack guards the barrow's boss room, and the rift holds trash plus a possible Stalker or Goblin. Bosses stay 21 and pockets stay 5. `scripts/gravewake-check.mjs` (group `mapwriter`) enforces this.
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
