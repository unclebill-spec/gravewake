# QA warp: blade trap and secret wall (rift-confirm batch, 2026-10-26)

QA only. Nothing on screen; a normal player never sees it. The shell exposes it only when the URL has `?qa`.

1. Open the game with `?qa` (e.g. `http://localhost:8080/?qa`), start or continue a game.
2. In the browser console:
   - `__qaWarp("blade")` stands you two tiles south of the first swinging blade (seed order; today Harrow floor 1, blade at (12,7)).
   - `__qaWarp("secret")` stands you on the approach tile of the first secret (cracked) wall (today Harrow floor 1, wall at (24,13)).
   It returns `dungeon:floor:x,y` ("" if none) and logs "QA warp: ...".
3. Without `?qa`, `window.__qaWarp` is undefined.

In code: `Game.qaWarp(kind)` in `src/game/sim.ts`; covered by check group `riftconfirm`.

Also here: `qa/riftconfirm/` — `town_save.mjs` (a slot-1 save at a town tile, default (33,26)) and `repro.py` (replays the
Rule 19 rift repro on Phone 844x390 touch or desk 1280x720 and prints tiles, dialog state and console errors):

    npx node@22 qa/riftconfirm/town_save.mjs --out /tmp/town.json
    python3 qa/riftconfirm/repro.py http://localhost:8080/ /tmp/town.json /tmp/shots phone

- `window.__qaWarp("stair")` (gw-c-1030): from the vale into town, standing one tile south of the cemetery crypt stair, facing north. Press up / E to enter the Opened Grave. Returns `town:x,y`.
