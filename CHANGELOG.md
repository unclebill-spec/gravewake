# Changelog

All dates are America/New_York. The newest entries come first. Each entry matches a source zip (`Gravewake-<tag>.zip`) and a commit.

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
