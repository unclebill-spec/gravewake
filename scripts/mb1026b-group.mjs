// MB sprint Oct 26 (b): group mb1026b (QA specs 2-FEATURE-SPECS #2, #13, #14 and first-time-player idea 4).
// Kept in its own file so the merge with mb-sprint-1026 stays easy; gravewake-check.mjs only calls run().
import { execFileSync } from "node:child_process";

function py(code) {
  return JSON.parse(execFileSync("python3", ["-c", code], { encoding: "utf8", cwd: "tools/pixel-writer" }));
}

export async function run(check) {
  // Spec #2 secret walls: the crack reads at Phone zoom.
  const r = py(`
import json, sys
sys.path.insert(0, ".")
from PIL import Image
import make_gravewake as m
from crack_bright import brighter
from palette_locked import LOCKED
out = {}
for name, (wall, hi) in m.WALLS.items():
    im = Image.open(f"../../public/art/writer/feat-{name}.png").convert("RGBA")
    px = [im.getpixel((x, y)) for x in range(32) for y in range(16)]
    cols = {"#%02x%02x%02x" % p[:3] for p in px if p[3]}
    lip = sum(1 for p in px if p[3] and "#%02x%02x%02x" % p[:3] == brighter(hi))
    out[name] = {"off": sorted(c for c in cols if c not in LOCKED), "lip": lip, "lighter": brighter(hi) != hi}
print(json.dumps(out))
`);
  const bad = Object.entries(r).filter(([, v]) => v.off.length || v.lip < 20 || !v.lighter).map(([k, v]) => `${k}:${JSON.stringify(v)}`);
  check("mb1026b", "secret walls: every cave's two crack cells carry a full lit lip (>= 20 px) one locked-palette shade brighter than the wall light, 0 off-palette pixels", bad.length === 0, bad.join(" "));

  // Spec #13 seasons: summer vale nights are lifted (measured 70% -> 20% near-black, desk; 18% Phone); every other season is untouched.
  const js = execFileSync("npx", ["esbuild", "src/game/nightlift.ts", "--bundle", "--platform=node", "--format=esm", "--log-level=error"], { encoding: "utf8" });
  const nl = await import("data:text/javascript;base64," + Buffer.from(js).toString("base64"));
  const base = [0.32, 0.34, 0.62];
  const other = ["autumn", "winter", "spring"].every((s) => nl.valeNight(s, base) === base);
  const sn = nl.valeNight("summer", base);
  const lifted = sn.every((v, i) => v > base[i]) && sn[2] > sn[0] && sn[2] > sn[1];
  const fs = await import("node:fs");
  const draw = fs.readFileSync("src/game/draw.ts", "utf8");
  const wired = (draw.match(/valeNight\(g\.season\(\), LIGHT\.worldNight\)/g) || []).length === 2;
  // Rift-confirm batch (A): summer is darker via a second, deeper checker level (measured 18% -> 40% near-black, Phone).
  const deep = nl.valeNightDeep("summer");
  const deepOk = !!deep && deep.every((v, i) => v < sn[i] && v > base[i]) && deep[2] > deep[0] && deep[2] > deep[1];
  const deepOther = ["autumn", "winter", "spring"].every((s) => nl.valeNightDeep(s) === null);
  const deepWired = /valeNightDeep\(g\.season\(\)\)/.test(draw) && /deepChecker\(lc,/.test(draw);
  // gw-followup-1026 (a): the town's summer night takes the same checker, darker than LIGHT.townNight (Phone 12% -> ~41%).
  const tb = [0.36, 0.38, 0.68];
  const tn = nl.townNight("summer", tb);
  const td = nl.townNightDeep("summer");
  const townOk = tn.every((v, i) => v < tb[i]) && !!td && td.every((v, i) => v < tn[i]) && tn[2] > tn[0] && td[2] > td[0] && ["autumn", "winter", "spring"].every((x) => nl.townNight(x, tb) === tb && nl.townNightDeep(x) === null) && /townNight\(g\.season\(\), LIGHT\.townNight\)/.test(draw) && /townNightDeep\(g\.season\(\)\)/.test(draw);
  check("mb1026b", "seasons: summer town night is the same two-level blue-led checker, darker than LIGHT.townNight (~41% near-black on Phone); autumn/winter/spring keep LIGHT.townNight exactly, no checker", townOk, JSON.stringify({ tn, td }));
  check("mb1026b", "seasons: summer night on vale/village/camp is a world-locked 1px checker of two blue-led levels between LIGHT.worldNight and the old lift (darker, ~40% near-black on Phone); autumn/winter/spring keep LIGHT.worldNight exactly, no checker", other && lifted && wired && deepOk && deepOther && deepWired, JSON.stringify({ other, sn, deep, deepOther, wired, deepWired }));

  // Spec #14: the QA season jump lands each season's festival night (no game UI involved).
  const { seasonSave } = await import("../qa/mb1026b/season_jump.mjs");
  const want = { autumn: "harvest", winter: "krampus", spring: "bloom", summer: "ashen" };
  const got = {};
  for (const s of Object.keys(want)) { const r = await seasonSave(s, { festival: true }); got[s] = `${r.season}/${r.phase}/${r.festival}/${r.value ? "saved" : "nosave"}`; }
  const okJ = Object.entries(want).every(([s, f]) => got[s] === `${s}/night/${f}/saved`);
  check("mb1026b", "festival QA jump: qa/mb1026b/season_jump.mjs saves Harvest, Krampusnacht, Drowned Bloom and Ashen Fair nights into slot 1", okJ, JSON.stringify(got));

  // First-time-player idea 4: rift labels "Kind: place" lifted clear of the hero; a short violet arrival flash.
  const rf = await import("data:text/javascript;base64," + Buffer.from(execFileSync("npx", ["esbuild", "src/game/riftflash.ts", "--bundle", "--platform=node", "--format=esm", "--log-level=error"], { encoding: "utf8" })).toString("base64"));
  const colon = rf.riftLabelText("Drowned Bloom rift (sealed)") === "Sealed rift: Drowned Bloom" && /drawRiftLabel\(ctx, \(t\) => drawLabel/.test(draw);
  const raised = rf.LABEL_LIFT >= 8 && /WAYRIFT\.stand\) \* TILE - 2 - LABEL_LIFT/.test(draw);
  const lv = [rf.riftFlashLevel(null), rf.riftFlashLevel({ t: 0.1, moved: false }), rf.riftFlashLevel({ t: 99, moved: true })];
  const pal = fs.readFileSync("tools/sprite-writer/palette_locked.py", "utf8").toLowerCase().includes(rf.RIFT_FLASH_COL);
  check("mb1026b", "rift labels: every label reads 'Kind: place' and rides LABEL_LIFT px higher; arrival flash is a locked violet, only after the move, gone within RIFT_FLASH s", colon && raised && lv.every((v) => v === 0) && pal && rf.RIFT_FLASH < 0.5, JSON.stringify({ colon, raised, lv, pal }));
}
