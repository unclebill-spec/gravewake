# QA season jump (MB sprint Oct 26 b, spec #14)

Dev/QA only; nothing here ships in the game UI.

- `node qa/mb1026b/season_jump.mjs <autumn|winter|spring|summer> [--festival] [--day] [--map world|town] --out save.json`
  writes a slot-1 save on that season's night (with `--festival`, festival night: harvest / krampus / bloom / ashen). Needs Node 22.
- `python3 qa/mb1026b/shoot.py <url> save.json shot.png [phone|desk] [waitms]` loads it in Chromium, clicks Slot 1,
  screenshots, prints near-black share and page errors.

Oct 26 run: all four festival saves loaded with 0 errors on Phone; boss/pack spawns and loot are covered by check group `festival`.
