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
  check("mb1026b", "seasons: summer night ambient lifted on vale/village/camp (still blue-led), autumn/winter/spring keep LIGHT.worldNight exactly", other && lifted && wired, JSON.stringify({ other, sn, wired }));
}
