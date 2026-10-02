# Gravewake handoff

**Read this first, then `CHANGELOG.md` and `AGENTS.project.md`. `rules/` holds the project law.**

## What it is
Gravewake is a gothic Halloween web game with real-time field combat. It uses a Stardew-like 16px pixel lock, and is built with Vite, TypeScript and React on canvas. Published build: https://pepper-iris-lotus-coral.grok.me (the owner republishes it from the source zips).

## Run it
- Use Node 22, and `npm install` (the lockfile is out of sync with `npm ci`).
- `npm run dev` starts the dev server. `npm run build` builds; serve the playable build from a site root.
- Checks: `npm run typecheck`, `npm run lint`, `npm test`, `npm run check:game` (the main game check, 641 as of playtest1b), and `node tools/map-writer/check_map_writer.mjs`.
- Art writers are in `tools/`: sprite-writer, pixel-writer, spell-writer, brileta-sprites and map-writer. They need Python 3 with Pillow.

## Owner's standing preferences (Bill Weathersbee)
- Keep replies brief. Build one or two features at a time, check how they play, then send screenshots plus the source and playable zips.
- Run every check before and after a change. Placement is seeded only, never `Math.random`.
- Art is palette-locked and must be made through the writers, never hand-drawn.
- Don't touch movement, collision, combat numbers, shops or audio unless that is the bug. Silent audio counts as a bug.
- Saves stay backward compatible.
- A rule conflict needs the owner's approval, recorded as a dated `[OWNER-APPROVED EXCEPTION YYYY-MM-DD ...]` tag.
- He plays on his phone (touch), with a Bluetooth gamepad, and with WASD and mouse on a PC. All three must work.
- Portal reference art is in `style/rift_refs` on the builder machine. It's for style only; draw fresh.
- Before any push: scan the files and history for secrets. `src/lib/auth/preview.ts` reads `PREVIEW_CLIENT_SECRET` from env in this repo, and the template's hard-coded value must never be committed.
- Keep `CHANGELOG.md` and this file current, and use descriptive commits.

## Current state (2026-10-01)
- The feature list is done, festivals are done for all four seasons, map writer phases 1–2 are done, and graphics pass rounds 1–3 are done.
- Screen and display settings are done (screen1), and a true 320×240 Retro mode is done (retro1, an owner-approved exception).

## Known issues
- Lint has 10 problems that predate this work; test1 is 177/195 with a known failing list.
- Summer vale nights stay dark (84% near-black) because the summer ground is darker.
- Near a biome border, the HUD zone name can disagree with how the ground looks, because the blend is visual only.
- Rift gate pillars overlap walkable tiles (art only).

## Next steps
1. Owner decisions: whether to also fade bounty, rift and dungeon foes (festival foes are done in fade2); touch input on the 16:9 and 4:3 bars. Deferred: auto-pause in portrait, and pad buttons for specials 1–4.
2. Graphics items the owner still needs to decide: C2 (selective outline), C8 (chibi proportions), C10 (native resolution/zoom in `sim.ts`), pillars, light occlusion, and the UI reskin.
3. Open small questions: decor pricing (casino points or fish points), and optional seeded grave mounds.

## Play link (GitHub Pages)
- https://unclebill-spec.github.io/gravewake/ is served from the `gh-pages` branch. To update it, run `GRAVEWAKE_BASE=/gravewake/ npm run build:pages` and copy the output, including index.html, 404.html and .nojekyll, to the root of gh-pages.
