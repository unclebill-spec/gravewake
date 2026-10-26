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
