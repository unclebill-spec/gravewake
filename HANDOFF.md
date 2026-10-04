# Gravewake handoff

**Read this first, then `CHANGELOG.md` and `AGENTS.project.md`. `rules/` holds the project law.**

## What it is
Gravewake is a gothic Halloween web game with real-time field combat. It uses a Stardew-like 16px pixel lock, and is built with Vite, TypeScript and React on canvas. Published build: https://pepper-iris-lotus-coral.grok.me (the owner republishes it from the source zips).

## Run it
- Use Node 22, and `npm install` (the lockfile is out of sync with `npm ci`).
- `npm run dev` starts the dev server. `npm run build` builds; serve the playable build from a site root.
- Checks: `npm run typecheck`, `npm run lint`, `npm test`, `npm run check:game` (the main game check, 920 as of playtest1p), and `node tools/map-writer/check_map_writer.mjs`.
- Art writers are in `tools/`: sprite-writer, pixel-writer, spell-writer, brileta-sprites and map-writer. They need Python 3 with Pillow.

## Owner's standing preferences (Bill Weathersbee)
- Keep replies brief. Build one or two features at a time, check how they play, then send screenshots plus the source and playable zips.
- Run every check before and after a change. Placement is seeded only, never `Math.random`.
- Art is palette-locked and must be made through the writers, never hand-drawn.
- Don't touch movement, collision, combat numbers, shops or audio unless that is the bug. Silent audio counts as a bug. [OWNER-APPROVED 2026-10-03] Exception: the playtest1j/1k combat batch (telegraphs, boss phases, elemental combos, companion commands, fight lights), which Bill approved on 2026-10-03 at 08:41 ET, and playtest1n's use-the-room combat (approved 2026-10-03 15:41 ET).
- Saves stay backward compatible.
- A rule conflict needs the owner's approval, recorded as a dated `[OWNER-APPROVED EXCEPTION YYYY-MM-DD ...]` tag.
- He plays on his phone (touch), with a Bluetooth gamepad, and with WASD and mouse on a PC. All three must work.
- Portal reference art is in `style/rift_refs` on the builder machine. It's for style only; draw fresh.
- Before any push: scan the files and history for secrets. `src/lib/auth/preview.ts` reads `PREVIEW_CLIENT_SECRET` from env in this repo, and the template's hard-coded value must never be committed.
- Keep `CHANGELOG.md` and this file current, and use descriptive commits.

## Current state (2026-10-04, playtest1p)
- The feature list is done, festivals are done for all four seasons, map writer phases 1–3 are done (the 128x120 vale), and graphics pass rounds 1–3 and art audits 1–2 are done.
- Screen and display settings are done (screen1), and a true 320×240 Retro mode is done (retro1, an owner-approved exception).
- playtest1e–1g: the bigger world and edge border, wayrift portals, swamp paths, and biome trail art.
- playtest1h (Bill's 2026-10-02 19:43 ET art and loading audit, part 1): every asset resolves, with 0 failed loads across 56 scenes. Chests, mimic lids, dungeon liquids, bones and the chapel aisle are writer art now, and spells have cast, impact and area beats.
- playtest1i (part 2): every room is drawn in its building's outside style (cabin, stone or slate floor, wall, sconces and rug; `src/game/interiors.ts`), with writer furniture (`interior_writer.py`, 35 pieces) in place of painted blocks, a bed and stove in the croft, and blue/violet/red lights. Map walk: the cart road, town dirt and camp clearing now blend into their grass. The "warm" timber style is drawn but no room uses it yet.
- playtest1j [OWNER-APPROVED 2026-10-03: telegraphed attacks, dynamic fight lights] (Bill, 2026-10-03 08:41 ET, an owner-approved combat change; Layout Two's TELEGRAPHS and MONSTER TIERS carry the dated notes): fair telegraphs (every mid and big mark can be walked out of at 74 px/s with 0.2 s to spare; bigs stay within 0.8 to 1.2 s), boss phase two at 50% HP (a roar, then bigs every 6 s alternating the nova and aim + echo), neon marks with a wind-up glow, and pooled moving fight lights (12 lamps inside the 24-light budget). `src/game/telegraph.ts`, `src/game/fightlights.ts`.
- playtest1k [OWNER-APPROVED 2026-10-03: elemental combos, companion commands] (Bill, 2026-10-03 08:41 ET, re-confirmed 10:03 ET; Layout Two's PAD MAP and WEAKNESSES carry the dated notes): elemental combos (VENOM BLAST, WILDFIRE, SHATTER, CHAIN; run-only statuses from venom, rain, swamp, snow, ice and oiled families; at most two per cast, one per foe per 3 s) and four companion orders (Taunt, Heal or guard me, Focus my target, Stay or follow) on keys Z X R V, pad RT LT R3 L3 and a touch strip beside the stick. No save fields. `src/game/combos.ts`, `src/game/commands.ts`.
- playtest1l [OWNER-APPROVED EXCEPTION 2026-10-03 09:21 ET: optional bloom glow and scanlines] (Bill, 2026-10-03 09:21 ET; an exception to Layout Two's "No bloom", noted under every such line): Display options rows Bloom glow Off / Low / High and Scanlines Off / Subtle / Strong, saved in their own record `gravewake-postfx-v1`. Bloom is a small WebGL1 glow layer over the untouched game canvas (half the game pixels, scaled up smoothly); scanlines are a static 2D column (work without WebGL). Defaults: scanlines Off; bloom Low only on a capable desktop GPU, Off on Phone / touch / software renderer / 2 cores or fewer / 2 GB or less, plus an fps guard that turns the default off for good if it costs frames. HUD stays dry. `src/game/postfx.ts`, `src/game/FxOptions.tsx`.

- playtest1m (Bill, 2026-10-03 15:41 ET; tidy, no gameplay change): test1 195 tests, 188 pass, 0 fail, 7 app-template tests retired with a dated reason while the builder files they read are absent; lint 0 (fixed in code); 55 never-loaded art files left public/art and 51 stay with reasons (`scripts/frozen/playtest1m/removed-art.json`). After a full writer re-run, run `node scripts/prune-unused-art.mjs`.
- playtest1n [OWNER-APPROVED 2026-10-03 15:41 ET: use-the-room combat] (Bill, 2026-10-03 15:41 ET; Layout Two's knockback lines and THE ROOM / WARY FOES / FAIR carry the dated notes): below ground a Slash or Whirl shoves a foe about a tile (onto spike traps: 2x and a 0.4 s reel), and each floor stands up to 5 seeded props: hanging lanterns that drop fire, oil barrels that make a slick (fire on it is a big fire, oiled foes WILDFIRE), powder barrels with a 0.8 s fuse and r 32 blast, and 3-hit pillars that topple down a violet lane (2.5x, 1.5 s stun). Two foes in three shy from live hazards. Every hazard is marked before it lands; nothing is saved. `src/game/room.ts`, `src/game/roomdraw.ts`, `tools/pixel-writer/room_writer.py`; sim.ts and draw.ts frozen as 1m under `scripts/frozen/playtest1n/`.
- playtest1o [OWNER-REQUESTED 2026-10-03 19:49 ET: playtest1o motion, collision and art check] (Bill, 2026-10-03 19:49 ET): bodies face the way they walk (back and side views from `tools/sprite-writer/dirs_writer.py`, `src/game/facing.ts`; horse, cat and rat only mirror), critters walk their frames, room furniture, the hearth kit and the town's yard fences stop you where they are drawn (`src/game/blocking.ts`; every room stays one connected floor), each room shows its sign and name inside and the HUD says "Inside <name>", and loot and cave ore are writer art (`tools/pixel-writer/loot_writer.py`, `src/game/loot.ts`). sim, draw, the shell, three writer files and the owner notes frozen as 1n under `scripts/frozen/playtest1o/`.
- playtest1p [OWNER-APPROVED 2026-10-04 01:10 ET: playtest1p view polish and big bosses] (Bill, 2026-10-04 01:10 ET): hand-laid back and side walk views (`tools/sprite-writer/views_writer.py`; the `-dirs` sheets are 96 tall with west as its own row), and big bosses (`src/game/bigboss.ts`, `tools/sprite-writer/boss_writer.py`, 108 sheets in `public/art/sprites/big/`) with hurtbox, foot, cleared arenas and a camera that frames the boss and the hero together. sim, draw, facing, fightlights, three writer files, the `-dirs` sheets and the owner notes frozen as 1o under `scripts/frozen/playtest1p/`.
- **BOSS SCALE RULE (keep it; `src/game/bigboss.ts` `BIG`):** boss 5x, mini 3x (a remnant), rare 2x (a Stalker leader, a mimic, a naughty-list name), everyone else 1x, linear against the hero's 16x32 cell. A new boss, mini or rare needs its big sheet from `boss_writer.py`, a `BODY` hurtbox and `FOOT`, and its foot plus `DODGE` 48 px of open ground wherever it is met (run `qa/playtest1p/arena.mjs`). Summons and trophy ghosts stay people scale. See `AGENTS.project.md` ## playtest1p.
## Known issues
- test1 skips 7 app-template tests while `.grok/` builder files, `server/` and `migrations/` are absent (see playtest1m in the CHANGELOG).
- Summer vale nights stay dark (84% near-black) because the summer ground is darker.
- Near a biome border, the HUD zone name can disagree with how the ground looks, because the blend is visual only.
- Rift gate pillars overlap walkable tiles (art only).
- A 960x540 desktop window at zoom 4 (a 135 px high view) cannot show a 5x boss (143 px) whole; Retro and Phone landscape can. On Phone a boss on the right can tuck its name under the log panel.
- Big sprites are the 1x art magnified by rule (crisp but chunky); a writer pass that draws bosses at full size (more detail) is an option for the owner.

## Next steps
1. Owner decisions: whether to also fade bounty, rift and dungeon foes (festival foes are done in fade2); touch input on the 16:9 and 4:3 bars. Deferred: auto-pause in portrait, and pad buttons for specials 1–4.
2. Graphics items the owner still needs to decide: C2 (selective outline), C8 (chibi proportions), C10 (native resolution/zoom in `sim.ts`), pillars, light occlusion, and the UI reskin.
3. Open small questions: decor pricing (casino points or fish points), and optional seeded grave mounds.

## Play link (GitHub Pages)
- https://unclebill-spec.github.io/gravewake/ is served from the `gh-pages` branch. To update it, run `GRAVEWAKE_BASE=/gravewake/ npm run build:pages` and copy the output, including index.html, 404.html and .nojekyll, to the root of gh-pages.
