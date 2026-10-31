# Wow pack: particles and emissive masks (base: main 3001194)

The 6 hue rows are always in this order: blue, cyan, violet, magenta, red, green (the same as outskirts HUES). Every lit sprite steps out from the centre: a near-white core, a pale ring, the saturated tube colour, mid2, then dithered mid and deep halo bands (all hard pixels).
Particles carry no outline because they are pure light. Only the solid exhaust smoke puffs (frames 0-2) have the #140c10 outline.
Each particle sprite uses only 4-6 colours, one hue ramp, which is below the usual 12-20 floor on purpose.

**Blend:** "glow" means draw the sheet on the existing glow/emissive pass (the same pass the _em sheets use), so it blooms at night. "body+glow" means draw it on both passes, like FORGE_SHEET. Use nearest-neighbour and integer positions throughout.
**Frame rates** are in game frames at 60 fps.

## New particle sheets: public/art/wow/
| file | size | layout | hook (priority) | spawn / life / blend |
|---|---|---|---|---|
| wayrift_orbit_48x64.png | 384x384 | 8 frames x 6 hues, 48x64 cells matching wayrift.png | 1 wayrift: overlay on the awake swirl at the same x,y. Step it with the swirl frame (cell = swirl frame), violet or blue row | continuous while awake; glow |
| wayrift2_orbit_24x32.png | 192x192 | 8 x 6, 24x32 cells | 1 half-size and hub wayrifts (wayrift2.png) | same |
| flash_64.png | 512x384 | 8 x 6, 64x64, centred on the hero or boss | 2 level-up (row by class or gold-ish: use blue) / boss kill (red or the boss's hue) | once; 4 frames each (32f ≈ 0.53 s); body+glow. Pair with burst_64 |
| burst_64.png / burst_32.png | 512x384 / 256x192 | 8 x 6, expanding ring that breaks up | 2 boss kill (64) and level-up; 4 chest open, 7 crits (32) | once; 3 frames each; glow |
| shower_16x32.png | 96x192 | 6 x 6, 16x32, loops vertically | 2 after the flash, falling around the hero; 4 legendary loot | 3-6 columns, 4 frames each, 1.5 s; glow |
| motes_16.png | 96x96 | 6 x 6, a rising soul mote | 3 cemetery: graves, wild-graves, opened graves, the wake | 1 per grave every 2-4 s; 6 frames x 8f; drift up 1px per 6f; glow |
| loot_twinkle_16.png | 96x96 | 6 frames x 6 rarity rows: common(silver) uncommon(green) rare(blue) epic(violet) legendary(gold) mythic(magenta) | 4 loot.png drops and prop-chest | one twinkle per item every 1.5-3 s (random phase); 6f per frame; glow. The repo has no rarity system yet, so map tiers when one exists |
| sparkle_16.png | 96x96 | 6 x 6 (grow, peak, fade) | 4 chests, 5 crystals (cave-ore) at random offsets | ~1 per crystal per 2 s; 5f per frame; glow |
| glint_16.png | 80x96 | 5 x 6, a diagonal sweep | 5 crystals/ore and 4 equipped gear | every 3-5 s; 4f per frame; glow |
| fireflies_16.png | 64x96 | 4 x 6, a blinking pulse | 6 outskirts and wild night (green or cyan) | 4-8 alive per screen; wander 1px per 10f; loop 8f per frame; glow |
| embers_16.png | 96x96 | 6 x 6, rising sparks | 6 camp-fire, forge, braziers (red row) and witchfire (other rows) | 1 per 0.5 s per fire; 6f per frame; glow |
| exhaust_16.png | 96x112 | 6 frames x 7 rows: row 0 ash smoke + gold ember, rows 1-6 smoke + hue ember | 8 bone car tailpipe | 1 puff per 20f while moving; 6f per frame; drift up and back; body (smoke) + glow (ember) |

## New _em masks for existing art (same size and frames as the source)
Lit pixels are copied unchanged from the source, everything else is transparent. A pixel counts as lit if it is bright and saturated (V ≥ 0.55, S ≥ 0.45) or near-white (V ≥ 0.93).
- public/art/writer/cave-ore_em.png (64x16): hook 5, dungeon crystals and ore
- public/art/writer/runering_{blue,red,violet}_{64x32,128x64}_em.png: hook 5, runes/telegraphs. Draw them in paintRuneRing on the glow pass with the same frame.
- public/art/spells/fx/impact-*_em.png (192x32, 6 x 32x32) and shock-*_em.png (384x32): hook 7, elemental impact overlays. spells/fx2 is already fully emissive, so it gets no mask.
- public/art/writer/decal-grave_em.png (96x16): hook 3, the few lit bits on the cemetery decals.
To wire a mask, register it like BONECAR_EM or WAKE_EM (`url → url_em`).

## Skipped (already covered, or nothing to light)
- Already have _em: bonecar_em (headlamps), town-bldg*-casino_em and room-casino_em (casino neon), town-signs_em, wayrift*_em, wild-graves_em and wild-opened-grave_em. So for hook 8 the pack adds only the exhaust motes; the casino needs no new art.
- casino-cards: the mask would light whole white card faces, so I left it out.
- feat-grave and wake-grave: only 2 lit pixels each, so no masks.
- portal-*.png: the vortex already draws as its own emissive layer, so no masks. wayrift_orbit fits these portals too: centre it on the 32x48 doorway or use the 24x32 sheet.

The generator is in `_generator/` (`python3 deliver.py`, then `python3 contact.py`). VERIFY.txt holds the checks.
