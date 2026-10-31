# Walk-frame probe disagreement (GD queued item d), Master Builder gw-c-1030, 2026-10-30

Question: EB (blade-b ba4cf88 report, row 5b) measured 71%/71%/48% still frames on phone; the live 41bedc7 report measured 0/86.

## What I checked
- walk.py and res-4650/4652-{phone,desk}.json here (4650 and 4652 = the two builds, phone 844x390 and desk 1280x720).
- Town open run (ArrowDown, 154 frames after the 5-frame ramp): 0.0% still on all 4 runs. With the wall frames left in: 11.8-12.0%.
- Dungeon run from the blade warp spot (harrow 1, 12,9): the open floor runs are only right 5 / up 4 / down 2 / left 1 tiles. The hero moved 71-75 px and then stood against the wall for ~114 of 175 frames: 65-67.5% "still" raw, 0.0-1.8% once frames after the last move are trimmed (the 1.8% is 1 frame of 56 on desk).
- EB's method (row 5b): setPos, then hold the key for 120 rAF and count the middle 108 frames with no wall trim. 108 frames at 1.23 px/frame is ~133 px, more than any open run at that spot (left is 1 tile, so left saturates first; right is 5 tiles). So EB's still frames are wall contact, the same artifact the live report described for its eastward runs (40-44 zero frames after 68 px).
- sim.ts movement code was not touched by blade-b or by this branch; step size 1.228-1.243 px at 60 Hz (~74 px/s) matches spec in both reports.

## Unsure
- I could not reproduce EB's exact 71/71/48 split (their exact setPos spot isn't recorded); the direction of the asymmetry (left freezes more in my data, right more in theirs) depends on the start tile.
- Headless 60 Hz only. Not checked on a real phone or a 120 Hz display.

## Verdict
Not a game bug: the probe counted frames spent pushed against a wall. No code change. Confidence: medium-high (high that open-ground walking has 0 stall frames; medium on explaining EB's exact numbers).
Probe fix for next time: trim frames after the last position change (walk.py already does this) or pick a start with >= 140 px of open floor.
