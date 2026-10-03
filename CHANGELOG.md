# Changelog

All dates are America/New_York. The newest entries come first. Each entry matches a source zip (`Gravewake-<tag>.zip`) and a commit.

## 2026-10-03: playtest1n, use-the-room combat (OWNER-APPROVED combat change)
- Bill approved this on 2026-10-03 at 15:41 ET ("Add use-the-room combat"). It is a combat change, recorded as dated `[OWNER-APPROVED 2026-10-03 15:41 ET: use-the-room combat]` notes under each of Layout Two's three 2-3 px knockback lines, a THE ROOM / WARY FOES / FAIR block after its TELEGRAPHS section, `AGENTS.project.md` and the handoff. Below ground only; nothing is saved (a 1n save has exactly playtest1m's keys).
- The room (new `src/game/room.ts`): each dungeon floor stands up to 5 props from its seed (one per 30 floor tiles, on open floor with 5+ floor neighbours, 3 apart, clear of stairs, exits, chests, traps, secrets and the arrival; a secret room counts as rock; the floor stays whole). 269 props on the 94 floors: lantern 63, oil 66, powder 69, pillar 71. Props block the hero and foes while they stand.
- The shove: below ground a Slash or Whirl carries the foe it hits about a tile (110 px/s for 0.12 s on top of the old 3 px knockback, ~17 px); minis and rares half, bosses not at all; Smite never shoves. A foe shoved onto a spike trap springs it at once for 2x the floor's trap hit and reels 0.4 s; raised spikes bite foes too (2x, once a rise).
- Hanging lantern (1 hit): swings off its hook away from the blow and lands 14 px past its post after a 0.35 s red mark, laying a fire patch (r 20, 4 s; foes 0.6x the trap hit every 0.5 s as a fire hit, so a poisoned foe is VENOM BLAST and an oiled one WILDFIRE; the hero 0.4x).
- Oil barrel (1 hit): bursts into a slick (r 24, 10 s) that oils foes for 6 s after they leave it; fire on the slick or the barrel makes a big fire (r 28, 4 s).
- Powder barrel (1 hit): a 0.8 s fuse under a red r 32 blast mark (walking out from its centre takes 0.43 s + 0.2 s thumb = 0.63 s), then foes in it take 3x and reel 0.6 s (bosses take it, no stun), a hero still inside 1x through armour; props and oil in it catch, so barrels chain.
- Cracked pillar (3 hits: cracks, groans, topples): falls away from the blow under a violet lane (44 px long, 10 px either side, 0.6 s); foes in it take 2.5x and are stunned 1.5 s (minis and rares half, bosses no stun), the hero 1x. Its tile opens.
- Spells: fire at an impact lights props and oil there; area spells strike every prop in their area; with no foe in reach a class spell or Smite (96 px) aims at the nearest prop.
- Wary foes: two in three (a fixed pick per foe, never a boss) will not step into live fire, a burning fuse's mark or rising spikes; they slide round or wait. Bold ones walk on. A stunned or shoved foe neither steps, swings nor drifts.
- Art and draw (new `src/game/roomdraw.ts`, `tools/pixel-writer/room_writer.py`): `room-props` (8 cells of 16x32: lit lantern, bare post, oil and powder barrels, staves, a cracked pillar with violet seams, rubble) with its emissive copy, a 4-frame `room-fire` and `room-oil`, palette v3 with hard alpha. Props join the y-sorted props, lit flames and fuses join the glow from the room's own pool of 10 lamps inside the 24-light budget, the marks keep their rims in the Lightless dark. No new screen shake.
- At the Harrow (trap hit 6): thrown on spikes 12; a foe standing in lantern fire 34 over its 4 s; powder 18 + 0.6 s stun to foes, 5 to a hero who stands still, 0 to one who walks out; pillar 15 + 1.5 s stun; walking at the hero through a fire patch, the 6 wary foes of 9 took 0 and the 3 bold ones 48.
- Checks: sim.ts and draw.ts are frozen as playtest1m shipped them (`scripts/frozen/playtest1n/`); the live draw is that plus four tagged lines, and every older view, rest digest and live pin reads the frozen copies. check:game 885 (20 new in group playtest1n). Typecheck 0, lint 0, test1 195/188 pass/0 fail/7 skipped, test2 55/55, build ok, map-writer 31. A 1k check that rolled its crit unseeded (about 2% flaky) now uses its group's seed. Fail-proofs 224/224 caught (all 66 new plus every 8th of the 1263 inherited); two new mutations (a blast not lighting the oil near it, props allowed in a hidden secret room) were first caught only by the live pin, so the powder and placement checks were tightened to catch them by behaviour. The 4 caught by a pin alone are the known stray-edit ones.
- Throttled fps (6x CPU, 3 runs each, a busy room fight with fire, a fuse and a falling pillar, headless SwiftShader), before (1m, no props) / after: Auto 16.5 / 16.9, Phone 23.4 / 19.2, Retro 16.0 / 15.2.
- Image audit before and after (17 room scenes plus fps): 0 page errors, 0 failed loads.

## 2026-10-03: playtest1m, tidy: test1, lint and unused art (no gameplay change)
- Bill approved this on 2026-10-03 at 15:41 ET. Nothing a player sees or saves moves: outside the four lint-edited files, every source, public, map-writer and sprite-writer file is playtest1l's byte for byte (the removed art counted at its 1l md5s), and those four differ by the lint edit only.
- test1 is clean: 195 tests, 188 pass, 0 fail, 7 skipped. All 18 failures were app-template tests reading builder files Gravewake does not carry, none were game tests. Eleven now pass on their own: the 8 PWA head-tag tests run from an empty temp folder (they read this app's own og identity through the working folder before), and the auth-invariant test plus two app-env wrapper tests run in a fixture workspace that ships the template's `.grok/app-env.json` (auth off). Seven are retired with a dated reason in the test itself, and run again whenever the file they need is present: three brand-check tests and one write-atomic test (`.grok/skills/og/`, the builder's og skill), the nitro middleware test (`server/middleware/grok-pwa.ts`; Gravewake is a static Pages build), the migrations test (`migrations/`; Gravewake has no database) and "the template ships auth off" (`.grok/app-env.json`).
- Lint is 0, by fixing the code rather than switching rules off: sim's `aoe` and `dealt` are const, the shell drops an unused `Act` import, an empty catch in `client.server.ts` says why it is empty, an unused disable comment in `use-current-user.ts` became a plain comment, the brileta line drawer's `dx`/`dy` are const, and the check script drops three unused helpers.
- Unused art: of the 106 files the playtest1h audit saw never requested (96 png + 10 txt), 55 left `public/art` (49 png + 6 txt): the land, cozy, fall and creatures packs with their credits, the held DawnLike sheets, fence and rocks, the brileta rocks, the 7 DevWizard spell strips and their credit, the old snow/sand/ash/swamp grounds, the sprite writer's unused heroes sheet and previews, and the old writer and spell previews. 51 stay, each with its reason in `scripts/frozen/playtest1m/removed-art.json`: the 3 PWA icons, the 26 brick/pit cave-floor fallbacks and camp-grass (draw.ts fallbacks and map-writer inputs), the 6 spell-writer strips the draw still names or emits.json lists, the 8 season tree tints and water.png (writer sets the checks pin), the third-party brileta and held trees the pixel writer still reads with their credits, the writer CREDITS and the sprite ORDER notes. A full writer re-run writes some previews, heroes.png and the brileta rocks back; `node scripts/prune-unused-art.mjs` deletes them again (group playtest1m fails while any is back).
- A fresh 56-scene image audit before and after: 0 page errors, 0 failed loads, and the same 238 images requested; none is a removed file. The offline cache shrinks with the removed files.
- Checks: the four lint-edited files are frozen as playtest1l shipped them (`scripts/frozen/playtest1m/`), and the older groups' views, rest digests and live pins read them there. The six older rest digests still count the removed art at its 1l md5s, the playtest1b pumpkin law reads its recorded boxes while the land sheet is gone, and the playtest1h body-sheet law excuses heroes.png only while it is listed as removed and absent. check:game 865 (9 new in group playtest1m). Fail-proofs 191/191 caught (all 35 new plus every 8th of the 1242 inherited; the 5 caught only by a live pin are the known inherited set, none new).

## 2026-10-03: playtest1l, optional bloom glow and scanlines (OWNER-APPROVED EXCEPTION, looks only)
- Bill asked for this on 2026-10-03 at 09:21 ET ("add an optional bloom glow and scanline setting to Gravewake after the combat batch"). Layout Two says "No bloom", so it is recorded as a dated `[OWNER-APPROVED EXCEPTION 2026-10-03 09:21 ET: optional bloom glow and scanlines]` note under every "No bloom" line of `rules/GAME_LAYOUT_TWO.txt` (5) and the prompt file (1), in `AGENTS.project.md` and the handoff. Scope: a player setting, laid over the finished playfield only; HUD, minimap and menus stay dry; bloom is off without WebGL.
- Display options (title > Display and Pause > Display) gain two rows of plain buttons (touch, pad menu focus and keys all reach them): Bloom glow Off / Low / High and Scanlines Off / Subtle / Strong (Strong reads "(CRT)" in Retro). A pick is saved at once in its own record, `gravewake-postfx-v1`; saves and the screen record are untouched. A record with the older true/false form migrates (true = Low / Subtle); broken values fall back field by field.
- Bloom (new `src/game/postfx.ts`): one small WebGL1 pass. A smoothed copy of the frame at twice the glow size, a bright-and-saturated extract (neon blue, violet, red, lamps, spells and telegraph marks glow; grey text, bone and snow barely do), a separable blur (Low: 2 passes; High: 3 wider, stronger), written to a glow-only canvas at half the game pixels seen (at most 480 wide) that the browser scales up smoothly over the untouched game canvas. The game's own pixels are never redrawn, so they stay crisp. A lost WebGL context hides the glow and a restored one rebuilds it; past 4 ms a refresh, the glow refreshes every second frame.
- Scanlines: a static 1 px wide column (one alpha per device row, each game row darkening toward its foot; Retro 320x240 shows 240 bands), redrawn only when the size or setting changes. It is a 2D canvas, so it also works without WebGL, and costs nothing per frame.
- Defaults: scanlines Off everywhere. Bloom Low only on a capable desktop GPU (WebGL, not a software renderer, 3+ cores, more than 2 GB, not the Phone preset and not Auto on a touch screen), otherwise Off. An fps guard watches the default only: if play stays under 40 fps for 4 s it tries 4 s without, and if that is 20% faster bloom turns off for good on that device (remembered; a note in the options says so). A player's own pick is never overridden.
- Throttled fps (6x CPU, 3 runs, the busiest ossuary fight, headless SwiftShader = worst case), before (1k) / after Off / Low / High / Low + Strong / scanlines only: Auto 27.0 / 27.7 / 23.3 / 25.0 / 22.1 / 28.0 (4 runs), Phone 29.0 / 27.9 / 20.5 / 24.2 / 23.9 / 30.9, Retro 32.4 / 31.5 / 27.3 / 27.6 / 27.1 / 30.6. Off and scanlines cost nothing; bloom costs Phone the most, so Phone starts Off. A first design (a full-frame WebGL composite) ran Low at 8.4 / 12.1 / 19.1 and was replaced.
- The shell (`Gravewake.tsx`) gains eight tagged lines only: two imports, the layer's ref, the pass, one call per frame, dispose, the click-through `fx-layer` right after the game canvas (under every HUD element) and the options rows (new `src/game/FxOptions.tsx`). sim, draw, screen settings, vite config, the base path, the PWA manifest and the service worker / offline cache are byte for byte 1k's.
- check:game 856 (14 new in group playtest1l: the record and migration, the defaults, the fps guard, sizes and the scanline column, the layer without WebGL, the guard with a stand-in GPU pass, the shader pass, the options rows, the shell, looks-only digest, build/base/PWA pins, owner notes, frozen reference, live pin). Typecheck 0, lint 10 (unchanged), test1 177/195 (the same 18 known failures), test2 55/55, build ok, map-writer 31. Fail-proofs 241/241 caught (all 97 new plus every 8th of the 1146 inherited; group checks 2, 7 and 13 were tightened after five new mutations were seen only by the live pin, then re-run and caught; the only pin-only ones left are 1k's known inherited set and the stray-edit pins, by design), logged in qa/playtest1l.

## 2026-10-03: playtest1k, elemental combos and companion commands (OWNER-APPROVED combat change)
- Bill approved this on 2026-10-03 at 08:41 ET and re-confirmed it at 10:03 ET. It is a combat and companion change, recorded as dated `[OWNER-APPROVED 2026-10-03]` notes in `rules/GAME_LAYOUT_TWO.txt` (PAD MAP and WEAKNESSES), `AGENTS.project.md` and the handoff. "No hard immunities" still holds: combos are bonuses, never gates.
- Elemental combos (new `src/game/combos.ts`): each hero spell and companion art carries the fx element its colour already draws (fire, ice, lightning, venom, shadow, holy). Foes pick up statuses in the run only. Venom poisons for 6 s and does no damage of its own. Rain in the open, the swamp and pools make a foe wet. Snow, ice and open-air snow chill it, and a lich is always chilled. Lanterns, pumpkins, scarecrows and mummies are oiled. Wet and chill last 2 s after the foe leaves.
- The reactions: fire on a poisoned foe is VENOM BLAST and fire on an oiled one is WILDFIRE (+50% on the target and 30% splash in 32 px). Lightning on a chilled foe is SHATTER (+60%). Lightning on a wet foe is CHAIN (40% arcs to at most 2 foes within 56 px). A foe can react once every 3 s, and a cast can set off at most two reactions. Each combo shows its name in the pixel font and its own burst (a red nova, a blue ring with shards, or gold arcs), and the log names it. Statuses show as small motes over a fighting foe. No hero spell draws ice, so chill comes from the world.
- Companion commands (new `src/game/commands.ts`):
  - Taunt (12 s cooldown): foes within 72 px of the companion turn on it for 4 s, or 6 s if it knows a taunting art; bosses for half that. Their swings and marks go to the companion. It never falls (HP floor 1) and falls back below 30%.
  - Heal or guard me (10 s): a healer casts its best heal at once. A companion with no heal guards you instead: for 5 s it stands at your side and every hit on you is cut to 70%.
  - Focus my target (3 s): it goes for the foe you last hit, or the nearest within 120 px, for 8 s.
  - Stay or follow: it holds its spot, and catches up on its own past 10 tiles or on another map.
- Controls: keys Z, X, R and V, and pad RT, LT, R3 and L3, all rebindable; old binds records pick up the defaults. On touch, a row of four small buttons sits beside the stick (2x2 on a narrow portrait phone). It shows only while a companion walks with you (not in camp), each button dims while its order cools down, and the labels read Heal or Guard and Stay or Follow. Help and the binds list name the orders.
- Saves are unchanged: no new keys, old saves load, and a loaded game starts with every order reset. A fight with no spells and no orders plays frame for frame as in 1j, dry or in the rain. Throttled fps (6x CPU, 3 runs, before/after, in a busier after scene): Auto 28.2/26.0, Phone 31.7/30.9, Retro 27.6/25.7.
- check:game 842 (20 new: elements, the reaction table, each reaction from a real spell, limits, world statuses, the unchanged fight, Taunt, a taunted boss, Heal or guard, Focus, Stay or follow, living-companion rule, binds, the shell strip, drawing, saves, rest digest, laws, frozen references, live pin). Typecheck 0, lint 10 (unchanged), test1 177/195 (the same 18 known failures), test2 55/55, build ok, map-writer 31. Fail-proofs 225/225 caught (all 91 new plus every 8th of the 1065 inherited; checks 2, 3, 10, 11, 14 and 15 were tightened after five new mutations were seen only by the live pin and one only by a crash, then re-run and caught), logged in qa/playtest1k.

## 2026-10-03: playtest1j, telegraphed attacks and dynamic fight lights (OWNER-APPROVED combat change)
- Bill approved this on 2026-10-03 at 08:41 ET. It is a gameplay change, recorded as dated `[OWNER-APPROVED 2026-10-03]` notes in `rules/GAME_LAYOUT_TWO.txt` (TELEGRAPHS and MONSTER TIERS), `AGENTS.project.md` and the handoff.
- Fair telegraphs (new `src/game/telegraph.ts`): every mini and boss mark lasts at least as long as walking out of it from its centre at walking pace (74 px/s), plus 0.2 s to react on a touch stick. A 40 px ring is 0.74 s, a pull 0.96 s, a cone 1.06 s and a line 0.5 s (16 px sideways). A boss's big move stays within 0.8 to 1.2 s. Trash still never telegraphs, and the rare's 0.35 s tint is unchanged.
- Boss phase two at 50% HP: the boss roars once and glows red for 0.8 s, with no hit. In phase one the big move aims at you every 8 s, as before. In phase two it comes every 6 s and alternates two patterns: the nova (a 52 px ring round the boss itself, 0.9 s, so get away from it) and aim + echo (an aimed 0.8 s mark, then a 0.74 s echo ring where you step next). Summon, shield and blink bigs keep their one form. Smite still breaks a big, the nova too, but not the echo.
- Neon marks: ground marks are pixel ellipses that fill from the centre and double their rim in the last 20% (big red, mid violet, rare blue, plates violet, ash red). A charge shows its dotted lane, and the casting foe glows a wind-up ring at its feet. Marks sit on the ground under the actors; over the Lightless dark only the rims show.
- Dynamic fight lights (new `src/game/fightlights.ts`): marks, wind-ups, the phase roar, each spell's neon core (its fx element: fire red; ice, lightning and holy blue; venom and shadow violet), impacts, ash fire and live plates now cast moving light in night, rooms and dungeons. A fixed pool of 12 lamps is reused every frame inside the 24-light scene budget, and marks are baked once and cached. Throttled fps (6x CPU) before/after: auto 29.5/29.4, phone 42.2/40.2, Retro 35.8/34.0, all within run noise.
- Saves are unchanged: no new keys, and old saves load. Trash and rare fights play frame for frame as before.
- check:game 822 (14 new: fair tells per boss kit, live casts, dodging on stick, keys and click, phase two, patterns, nova and Smite, the elsewhere-unchanged fight, saves, marks, fight lights, laws). Fail-proofs 177/177 caught (all 49 new plus every 8th of the 1023 inherited; the marks check was strengthened after two were seen only by the live pin), logged in qa/playtest1j.

## 2026-10-02: playtest1i, art audit part 2: interiors and map consistency (drawing only)
- Interiors (new `tools/pixel-writer/interior_writer.py`, `src/game/interiors.ts`): every room is drawn in its building's outside style. Log cabin: inn, shop, guild, Pell, Ivy, chapel, casino, smithy, tailor, alchemist. Stone: bank, Bram, mystic. Slate boards: fisher, Noll, the croft. Each style has its own 128 px wrapping floor (log planks, flagstones, slate boards), its own wall and sconces, and its own rug.
- Furniture is writer art now (35 pieces: counters with a lamp, bookcases, narrow shelves, pews and an altar, forge and anvil, a card table, a cauldron, an orrery, nets, crates, potions, the inn table, a strongbox, a mannequin, a weapon rack) in place of the painted flat blocks; the forge and cauldron animate. The croft gets a bed and a lit iron stove, clear of every decor slot.
- Lights in the cold-fire palette: sconces burn blue in cabin and slate rooms and violet in stone ones; the forge casts red, the cauldron, altar and counter lamps blue, the orrery violet, and the inn's candle red. The glowing parts go through the glow pass.
- Map consistency walk (town, the vale in four seasons and at night, snow, ash, sand, swamp, biome edges, 14 dungeons, rifts, the four festivals): the only seams left were the vale's cart road, the town's dirt patches and the camp clearing meeting their grass on a hard square step. They now blend through the same drift masks as the biome edges (the cart road keeps its middle). Dungeons, rifts and festivals were already consistent.
- Room grids, NPC spots, collision, saves and the sim are unchanged; the old room art stays only as the fallback while the new sheets load.
- check:game 808 (22 new: assets resolve, outside style per room, no flat-fill furniture, trade tiles covered, clear spots, lights and glow, loading fail-safe, map bites, parity with 1h elsewhere, writer re-run, drawing-only digest); fail-proofs 168/168 caught (all 45 new + every 8th of the 983 inherited mutations; 9 are seen only by the live pin, 4 of them the stray-edit pins by design), logged in qa/playtest1i.

## 2026-10-02: playtest1h, art and loading audit part 1: loading, placeholders, spells (drawing only)
- Audit of every asset across 56 scenes (title, character select, town, all 16 rooms, the vale in every season, snow, ash, sand, swamp, camp, 14 dungeons, the grave, rifts, the four festivals, swimming, climbing, a companion): 0 failed loads, 0 page errors, and every body sheet uses 16x32 cells with 11 poses.
- Placeholders replaced with writer art (new `prop_writer.py`): chests now have iron bands and a blue keyhole and sit on their own ground (no more purple square in the croft); sleeping mimics lift that same lid; every dungeon's water and pools are animated liquid in that dungeon's colours; bones are bone heaps; the Hollow Chapel aisle uses the dungeon's floor slabs.
- Spells (new `fx_writer.py`, `public/art/spells/fx`): a cast sigil at the hand, a round impact in place of the square burst, and a ground area burst for self-cast and area arts (Earthshatter, War Cry, Summon Shade, Grave Nova, Vanish, Tripwire). Summon Shade and Vanish now glow violet. Whirl has a dust ring. Damage and timing are unchanged.
- check:game 786 (21 new: all assets resolve, up-front loads, no placeholders, spell beats); fail-proofs 68/68 caught (all 38 new + every 8th inherited mutation on the frozen files), logged in qa/playtest1h.

## 2026-10-02: playtest1g, biome trail art (drawing only)
- Trails in the vale, snow, ash and sand get proper path art in place of flat brown squares: worn dirt with seasonal leaf litter, packed snow with footprints, cracked cinder with embers, wind-swept sand with pebbles. 16 NESW masks with ragged blended edges.
- Trails draw from a cached opaque ground+path atlas (one draw per tile) to keep fps near 1f.
- Bill decided: no spawn fade-in for bounty, rift or dungeon foes (only night and festival foes fade).
- check:game 765.

## 2026-10-02: playtest1f, wayrift portals and swamp paths (OWNER-APPROVED)
- 11 animated wayrift portals on the vale (violet swirl, red heart, neon-blue cold fire on a rune dais, 3x2 tiles). Four at the town gate lead to the Ashen Rift, the Shifting Barrow, the Waste Pocket and the current season's festival; festival portals for other seasons are sealed until their season.
- Travel by walking, tapping or pushing the stick into a portal's mouth: an ink iris closes and opens at the far end, and the far portal waits until you step off.
- Portals glow at night (gate pairs share one light), and show on the corner and full maps.
- Swamp trails drawn as mossy mud and boardwalk with blended edges.
- Old saves load; a hero standing where a portal now stands is moved off it.
- check:game 749; fail-proofs 907/907 (plus 64/64 after the light fix).

## 2026-10-02: playtest1e, bigger world and no black edges (OWNER-APPROVED)
- Vale grows from 64x60 to 128x120: every biome has 4x its old area. Town stays 40x30.
- Map writer phase 3 lays the vale from a fixed seed: old roads at twice the size, winding trails to every dungeon, rift, boss, cart and watch post, 24 landmarks and 14 caches, and a forest band around the edge. Every place is reachable.
- Fix: the map writer's trail search used low-precision costs, so trails failed to connect.
- No black void: the camera stops at the map edge, small maps are centred, and past the edge you see border forest or rock (drawn once and cached). The mini map matches.
- Old saves: vale positions are doubled on load and stepped off blocked tiles; the world version is saved.
- check:game 718; map-writer 31/31; fail-proofs 847/847.

## 2026-10-02: playtest1d, art audit part 2 (drawing only)
- Three new town house styles (stone, timber, boarded) and a log cabin at full size; windows and door lamps glow at night.
- Softer per-season town grass with clover, tufts, flowers and autumn leaves (replaces the recolored cozy-pack tile).
- Last third-party spell strips retired; all spell art from the spell writer.
- Dark outline along soft biome edges (snow, sand, ash, swamp).
- Fix: dungeon pressure plates no longer drawn on the vale (the grey square on the ice).
- Dungeon stairs themed to match their entrance.
- check:game 690; fail-proofs 809/809.

## 2026-10-02: playtest1c, art audit part 1 (drawing only)
- specs/ART_AUDIT.md: ranked inventory of 34 art items; C2 list.
- New palette-locked wild art: seasonal trees, dead wood, rocks, graves; snow/ash/sand/swamp ground with soft drifted edges.
- Animated water and ice; town pond recolored blue-violet; shore rims; whole pumpkins in two sizes.
- Real dungeon entrances (cave and grave mouths with blue lamps, stairs instead of the ladder, the Opened Grave).
- Bosses drawn at true size with a 4-frame glow aura.
- Animation: redrawn rat, scarecrow idle tilt and hop, Pumpkin Lord idle settle, calmer staggered idle bobs for folk and foes.
- Old third-party tilemap and tree sheets no longer loaded. Sim, maps, saves untouched.
- check:game 671; fail-proofs 774/774.

## 2026-10-02: playtest1b, owner playtest looks pass
- Neon signs on all 16 town doors (inn, casino, every shop), lit at night; gold building names near doors.
- Name labels over nearby people (vendors blue, companion violet, bosses red).
- Class portraits on neon-edged character select cards.
- Camp button: new tent-and-blue-fire icon, dimmed/disabled in town; camp exit always asks "Leave camp?".
- Camp map art redo: tent, animated blue campfire, log seats, bedroll, lanterns, glowing mushrooms; camp and rooms darken at night.
- Interiors: new back walls, lamps, shelves, floorboards, rugs; cottages get bed, table, dresser, blue-fire stove, plant.
- Picket fences back around cottages and the croft (decor only).
- [OWNER-APPROVED 2026-10-02 Bill] Mana: max MP x2.5, regen x3; spell damage and costs unchanged.
- Fixes: false swim message on dry cobble, half pumpkins, half-size Drowned Hook, Day chip wording, Lantern Night festival label, mini map iron frame + markers.
- check:game 641; fail-proofs 739/739.

## 2026-10-02: playtest1a, owner playtest bug fixes
- Town is now 40×30. Every door is on its house's south face and can be reached on foot. Doors open only from the front, and the walls behind them are solid. You leave town only through road gates, and entering puts you at the matching gate. Old saves standing on a moved door or inside a wall are nudged to the nearest open tile.
- You swim only when your whole foot box is over water. NPCs no longer use the player's hero-class looks. The legacy ground tiles were replaced with pixel-writer art.
- Rain in the vale: the edge-blend sheets now load, so the game stops creating canvases every frame, and rain draws from one pre-drawn layer. Throttled fps went from about 29 to about 56.
- Walk cycle runs at 8 fps with stride and pass frames. New sprite-writer moves sheet covers swim, slide, fish and climb.
- Leave camp? prompt. Autosave on hide, blur, fullscreen exit and every 45 s. Tap-to-resume overlay, Continue button, back-gesture Leave game? prompt.
- Spells are visible: drawn on top, 0.6 s long, fly from the hand to the target. Fixed spell art paths that had spaces in them. Damage and costs are unchanged.
- Manifest now describes the game as a real-time action RPG.
- check:game 592 → 618. Fail-proofs 700/700.

## 2026-10-01: install1 + pages, Install button and GitHub Pages
- Added an in-game Install button. It uses the web app manifest, icons made with pixel-writer, and a service worker for offline play. Updates use a network-first index plus versioned caches. On iOS the button is replaced by an "Add to Home Screen" tip. Touch, pad and keyboard can all reach it.
- `npm run build:pages` makes a build for https://unclebill-spec.github.io/gravewake/ (GRAVEWAKE_BASE=/gravewake/), and it's published on the gh-pages branch. The normal build is unchanged.
- No gameplay or sim changes. check:game 575 → 592.

## 2026-10-01: fade2, festival foe fade-in
- Festival foes now use the fade1 fade-in: bosses, named packs, summons and helpers in all four festivals. Krampus and the Pumpkin Lord are drawn at 2×, and the fade scales with them.
- [OWNER-APPROVED 2026-10-01 21:20 ET] A minimal sim.ts tag, an optional spawnAt field, records when each festival foe appears. Play never reads it and saves don't store it. Spawns, combat and saves are byte-identical for a fixed seed, and fade1 saves still load.
- Bounty, rift and dungeon foes still don't fade. The owner will decide on those later.
- check:game 557 → 575. Fail-proofs 595/595.

## 2026-10-01: fade1, night foe fade-in
- Night foes now fade in over 0.5 s of game time using a grid-locked 4×4 dither (no new colours), with a small ash mist puff. This change is looks only and was owner-approved at 19:59 ET.
- Foes are live from their first tick. Spawn rule, timing, AI, combat and saves are unchanged. For a fixed seed, spawns are byte-identical to retro1.
- Only regular night spawns fade in. Bounties, festival foes, rift and dungeon foes still appear instantly.
- New file: src/game/fade.ts. draw.ts has small hooks. sim.ts is untouched.
- check:game 542 → 557. Fail-proofs 565/565.

## 2026-10-01: retro1, true 320×240 Retro mode
- In Retro, the camera shows 320×240 game pixels (20×15 tiles) at whole-number scale with black bars. This is the owner-approved exception to C10 (18:48 ET), and applies to Retro only.
- Other presets are byte-identical to screen1, which the view-calculation hash and canvas hashes confirm.
- In Retro, the black bars accept touch for the stick and tap-to-walk. Wheel and pinch zoom are off in Retro, and the HUD scales up on large screens.
- Choosing Retro no longer changes your aspect setting. A stored `retro` setting now opens the new mode.
- check:game 532 → 542.

## 2026-10-01: screen1, screen and display settings
- Display presets (Auto, Phone landscape, 720p, 1080p TV, Retro native 16 px), aspect (Fit, 16:9, 4:3) and a max pixel-ratio cap. These are on the title screen and under Pause → Display, saved in localStorage, and use whole-number pixel-perfect scaling.
- Fullscreen: title button, pause button, HUD corner icon, and Shift+F (F still smites in play). Android tries to lock landscape. iPhone gets a manifest and an Add to Home Screen tip.
- Phone layout: safe areas, 100dvh, 44 px touch targets, and a portrait "Turn your phone sideways" overlay with Play anyway.
- Touch: the page no longer scrolls, zooms or slides. A loading cover blocks input until ready, audio starts on the first fresh tap, and the joystick dead zone is 8%.
- Gamepad support: A use/talk, B/RB Main, X Whirl, Y Smite, LB drink, Start pause, Back map. Menus can be navigated with the pad.
- check:game 502 → 532. sim.ts is byte-identical.

## 2026-10-01: gfx3, graphics pass round 3
- Vale nights are brighter (moon [.38,.42,.62] → [.68,.72,.92]), and town night is kept lighter than the vale. Owner-approved.
- The hero light is 96 px underground and 72 px outdoors at night. This is an owner-approved exception to the 3–5 tile rule.
- Ghosts have a cold blue-white light (40 px, 56 px on bosses). The Deathbolt draws a purple shadow beam with violet light.
- Glow masks: foe eyes, lantern faces, the Pumpkin Lord and Krampus stay lit in the dark. Mimics are not lit, on purpose.
- The ossuary uses the crypt wall ramp with a #9a8aa8 edge, and the harrow has its own warm earth floor.
- check:game 485 → 502. Gameplay files are byte-identical.

## 2026-10-01: gfx2, graphics pass round 2
- Darkness lift is 3×. Moving lights for bolts, spells and flame foes and bosses.
- Cave floor kit: bevelled slabs, grave slabs, and decals (bones, cracks, moss, ash). Pixel shadows under every actor.
- check:game 464 → 485.

## 2026-10-01: gfx1, graphics pass round 1 (Core Keeper-style target, rules C1–C11 approved)
- New light layer (`src/game/light.ts`): hero light, wall torches, braziers, door lamps, festival lanterns.
- Wall depth in caves: lit top edge, front faces of stone courses, contact shadows.
- The Ashen Rift mouth is now a stone portal-gate archway with an 8-frame spinning vortex. A reusable `portal_gate` generator was added to the pixel writer, with rift, teleport and realm looks.
- Krampus's switch has higher contrast.
- check:game 442 → 464.

## 2026-10-01: mapwriter2, map writer phase 2
- Seeded noise blending of vale biome borders. This is a visual change only; tiles, collision, zones and saves are unchanged.
- check:game 427 → 442.

## 2026-10-01: feat-festivals2
- Drowned Bloom (spring): the swamp floods, you pick blooms for Weir-wife Ottla, and the Drowned Court ghost packs appear.
- Ashen Fair (summer): Barker Sallow's ember dance and the Cinder sideshow stalker packs.
- check:game 403 → 427.

## 2026-10-01: mapwriter-1
- `tools/map-writer`: seeded dungeons and rifts. Adds the Shifting Barrow dungeon (44,32) and the Ashen Rift (10,30), which rerolls each day/night cycle.

## 2026-10-01: feat-festivals
- Harvest Moon festival: pumpkin carving, the lantern run, and the Pumpkin Lord.
- Krampusnacht festival: the naughty list, coal and gift sacks, and Krampus.
- Fixed the daytime fight bug.

## 2026-10-01: feature list items
- Seasons: four six-day seasons with tints, weather, fish and foe weights.
- Home decorating (casino points) and the companion bond meter.
- Grave digging and the Midnight Derby fishing tournament.
- Mimic chests (solo-rare exception) and the night bounty board.
- Dodgeable mimic bite and sleeping-mimic tell. Fixed foes resetting to full HP.
- Rescued folk move to town and open stalls after their errands.
- Floor curses (Lightless, Corked, Ashen) and escorts and rescues.
- Spike traps and pressure plates. Rune doors and secret walls.

## 2026-09-30
- Particle pool (`src/game/particles.ts`).
- Town fixes: full building footprints and no door-tile culling, which fixed the purple strips and flickering houses.
- Character pass: 16×32 eleven-frame sprites and crowd variants.
