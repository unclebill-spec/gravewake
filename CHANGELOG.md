# Changelog

All dates are America/New_York. The newest entries come first. Each entry matches a source zip (`Gravewake-<tag>.zip`) and a commit.

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
