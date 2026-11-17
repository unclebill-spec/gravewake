# faults1117: the 11 planted faults the polish fail-proof sweep missed (gw-left-1117, 2026-11-17)

Source: the polish sweep logs `/workspace/gravewake/qa/polish/checks/sweep_{0,1}.log` (plan `sweep_plan.json`): 210 CAUGHT,
41 CAUGHT(pin-only), 13 MISSED. Two of the 13 are controls that must pass (2005 extra credit, 2008 no-op), so 11 real misses:

| id | group(s) | planted fault |
|---|---|---|
| 0256 | gfx1 | frozen light.ts actorMin 0.5 -> 0.3 (actors may sink into the dark) |
| 0296 | gfx2 | frozen light.ts bolt 56 -> 48 (bolt light off the radius buckets) |
| 0352 | gfx3 | frozen light.ts worldNight -> [1,1,1] (vale night as bright as day) |
| 0976 | playtest1h | stray edit in particles.ts (Whirl note) |
| 1016 | playtest1i | room-boards.png (old boards fallback) gets a trailing byte |
| 1344 | playtest1o+p+q | folk-variants-dirs.png gets a trailing byte |
| 1392 | playtest1p+q+r+s | big/ghost-boss.png gets a trailing byte |
| 1456 | playtest1o+q | foes-dirs_em.png back to playtest1q's (witch boss eyes glow from behind) |
| 1504 | playtest1r+s | big/wolf-boss.png back to playtest1q's sheet |
| 1560 | playtest1r+s | big/mimic-rare.png back to playtest1r's sheet |
| 1800 | playtest1z2 | frozen earlysinks sim: camp layout builds the rift (fight) stage |

Fix (check side only, scripts/gravewake-check.mjs "faults1117" block): those groups read frozen/redirected copies, so they
never saw the mutated file. New pins: the frozen light constants, the Whirl note, PNGs end at IEND, the three sheets differ
from their old frozen versions, the camp-stage line. `before.log` = all 11 MISSED on 66d77f2; re-run:
`python3 qa/faults1117/verify.py <tree>` (needs /workspace/gravewake/qa/playtest2b + polish on the build box).
