# BALANCE.md: Gravewake (owned by Game Director)
Design and balance decisions. Newest first.

## 2026-10-26: Festival rift at the start (bug M1, Will approved both)
- Move the new-player start spawn away from the festival rift. Today it's about 6 tiles away, and players fall in within about 2 s.
- ALSO add a confirm prompt before the player enters the rift. Will: "Yes and yes and also add the confirm prompt" (Efficiency Bot chat, 4:33 PM ET).
- Lead: Master Builder.

## 2026-10-26 5:47 PM ET: Game Director calls on merge 138545c
- The "wow" SFX is about 7 dB louder than the others. Turn it down to match. (Small call; players won't notice the change.)
- Waiting on Will (batched): summer night brightness, a mimic bestiary page, rim blink or glow mask. Keep the current behavior until he answers.
- Publish is on hold until Rule 19 passes on a local build of 138545c.

## 2026-10-26 5:53 PM ET: Rule 19 FAIL on 138545c (evidence /workspace/qa/gw-138545c/)
- Spawn move: PASS. The start is now (11,16), about 23 tiles from the rift.
- Rift confirm: FAIL. A one-time log line, which you can walk past or back over. Required (to match Will's ask): a real Yes/No dialog that freezes movement and shows on every entry. No pushes the player off the tile.
- Do not publish until a recheck passes.

## 2026-10-26 5:55 PM ET: Will's calls (Game Director chat)
- Summer nights: darker than now (Will picked this over keeping them as they are). Game Director: use an in-between step, still readable, not the 67% near-black preset.
- Mimic bestiary page: yes, one small page in the existing format.
- Rim effect: a soft glow with a slow pulse instead of a hard blink.

## 2026-10-26 6:20 PM ET: wow SFX call reversed
- Measured in game, the wow cues are about 7.8 dB QUIETER than the other SFX (-28.3 vs -20.5 LUFS, because of the 0.5 in-game trim). The earlier "7 dB hot" figure came from the raw files. No cut. Leave as is.
- rift-confirm-fix 13fc786 is waiting on the Rule 19 recheck.

## 2026-10-26 6:25 PM ET: Rule 19 PASS on 13fc786. Game Director signed off on publishing.
- The rift confirm, blade/secret warps, darker vale summer night, mimic page and rim pulse all passed (qa/gw-13fc786/).
- Follow-up: make the town's summer nights darker to match the vale, and scroll the mimic notes into view.

## 2026-10-26 7:08 PM ET (Game Director)
- gw-followup-1026 f54aae0 (darker summer town nights, mimic notes scroll into view): PASSED Rule 19 (/workspace/qa/gw-f54aae0/). The near-black share on phone is about 46%, a bit over the 41% target but in line with the vale, and the signs and windows still read. Accepted. MB cleared to merge and publish, then the live check.
- Note: the live 13fc786 bundle hash doesn't match a clean rebuild (DI9OvSpw vs DgeyrgFX), so the deps folder may differ. Publish only through publish-game.sh.

## 2026-10-26 7:20 PM ET (Game Director)
- Live f54aae0 (gh-pages 5c28caa): PASSED the live check (/workspace/qa/gw-live-f54aae0/). Darker summer town nights and mimic notes scrolling into view are live. Will told it's done.

## 2026-10-28 21:15 ET | Game Director | gw-edgeprops-1028
- Rule 19 PASS (9395f51). GD OK to publish under Will's standing rule. Rollback a9a8afc.
- Small calls for the next batch: move the raven tree inside the fence (bring its sound back), and nudge the SE candle 1 tile out of the phone touch-button gap.

## 2026-10-30 ET | Master Builder | gw-c-1030
- Moss set (Will, 2026-10-30: "Yes, use them and redo the grave dirt darker and cooler."; kit-pixelkit 899ba09, soil 49ed87a) wired as looks only (src/game/mossart.ts, public/art/moss/). No tile, collision, door or number change.
  - Town cemetery: grave_soil on the dirt walk ring (PENDING GD), flagstone on the middle path (dirt at x17-18, y16-29), glow_moss on ~25% of the yard grass in 2x2 patches.
  - Vale: fen_water over swamp-biome water. Dungeons: glow_moss on ~10% of "grave"/"drowned" floor.
  - Props: amber lamps (16,17) (19,17) (16,28) (19,28); green lamps (16,21) (19,20); violet lamps (16,25) (19,25); orbs green (15,20), violet (14,25), amber (22,25). Lights r 30 (lamp) / 22 (orb), mood lights (low).
- GD item a (final, shipped 692a2cf): blade drawn BLADE_REST_OUT = 5 px further out before its sweep (sprite has a 3 px margin): lit edge 2 px outside the box at rest, 8 px at the wind-up peak (BLADE_PULL 6). Draw only; cycle 3.2 / tell 0.45 / sweep 0.35 / damage unchanged (scripts/blade-nudge.test.mjs).
- GD item b: "You climb back into the open air." holds the log for Game.LOG_HOLD_MS = 1500 ms; the biome/weather line waits, then shows.
- Bug fix found while testing item c: climbing out of the Opened Grave put the hero ON the crypt stair, which took him back down after the 0.45 s door cooldown (loop). He now stands one tile south of it.
- Fun pass: FUN.mossFlare, a cemetery lamp/orb's light grows up to x1.5 within 40 px of the hero.

### 2026-10-30 ET | Master Builder | gw-c-1030 batch C
- Blade: see GD item a above (final: 2 px rest, 8 px peak).
- Glow moss: soft edges via 4-bit autotile sheet public/art/moss/glow_moss_edges.png (kit moss_edges.py); looks only.
- Grave soil 49ed87a: approved by Game Director 2026-10-30.
- Blade final (GD call): BLADE_REST_OUT 5, BLADE_PULL 6 -> 2 px outside the box at rest, 8 px at the wind-up peak. Timing, hit window, telegraph, damage byte-identical to ba4cf88.

### 2026-10-30 ET | Master Builder | gw-d-1030 batch D (art only)
- APPROVED: Will yes via Game Director, Oct 30 2026: cool cemetery ground. Cemetery yard grass/ground -> cool blue-gray (kit cool_ground.py, locked #3a4048/#405060/#5a5e64 + tuft #4a6858, 4 seamless 16x16 variants); grave plots use grave soil. Fence, props, path, other biomes unchanged.
- APPROVED (GD call, Oct 30 2026): grave orbs softer, no facets, on a slate pedestal (kit orb_soft.py), slow pulse (3.2 s, glow alpha 0.45-1.0, light radius x0.85-1.15). Looks only: no collision, interaction, position or number change.
