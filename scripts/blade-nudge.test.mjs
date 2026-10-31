// gw-c-1030 (GD queued item a): the resting/cocked blade is drawn 8 px further out (batch C: 5 px outside at rest) so the whole 6 px wind-up shows past
// the purple lane box. Draw only: the cycle, tell, sweep, hit lane and damage are byte-identical to live main ba4cf88.
import test from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

const dir = mkdtempSync(join(tmpdir(), "gw-bn-"));
writeFileSync(join(dir, "b.ts"), `export * from "${process.cwd()}/src/game/funpass.ts"; export * from "${process.cwd()}/src/game/feats.ts"; export { TRAPS } from "${process.cwd()}/src/game/content.ts";`);
execFileSync("npx", ["esbuild", join(dir, "b.ts"), "--bundle", "--platform=node", "--format=esm", "--log-level=error", "--loader:.png=empty", "--loader:.css=empty", `--outfile=${join(dir, "b.mjs")}`], { stdio: ["ignore", "ignore", "inherit"] });
const X = await import(pathToFileURL(join(dir, "b.mjs")).href);
const T = { x: 10, y: 5, phase: 0 };

test("blade nudge: the resting blade sits 5 px outside the lane box, plus the full wind-up in the tell", () => {
  const c = X.TRAPS.bladeCycle, sw = X.TRAPS.bladeSweep, tell = X.TRAPS.bladeTell;
  for (const n of [0, 1]) {
    const tellStart = n * c + c - sw - tell;
    for (const k of [0.35, 0.6, 0.99]) {
      const s = tellStart + k * tell;
      assert.equal(X.bladeStage(T, s), 1);
      const pos = X.bladeSwing(T, s); // -1 or 1: the lane end it waits at
      const cellX = Math.round((T.x + pos) * 16) + X.bladeWindup(T, s) + X.bladeRestNudge(T, s);
      const boxL = (T.x - 1) * 16, boxR = (T.x + 2) * 16;
      const outside = pos < 0 ? boxL - (cellX + X.BLADE_SPRITE_MARGIN) : cellX + 16 - X.BLADE_SPRITE_MARGIN - boxR;
      assert.equal(outside, 5 + Math.abs(X.bladeWindup(T, s)), `n${n} k${k}: ${outside}px outside`);
    }
    { // at rest (before the tell): 5 px out, no wind-up
      const s = n * c + 0.05 * (c - sw - tell); const pos = X.bladeSwing(T, s);
      const cellX = Math.round((T.x + pos) * 16) + X.bladeWindup(T, s) + X.bladeRestNudge(T, s);
      const outside = pos < 0 ? (T.x - 1) * 16 - (cellX + X.BLADE_SPRITE_MARGIN) : cellX + 16 - X.BLADE_SPRITE_MARGIN - (T.x + 2) * 16;
      assert.equal(X.bladeWindup(T, s), 0); assert.equal(outside, 5, `rest n${n}: ${outside}px`);
    }
    assert.equal(X.bladeRestNudge(T, n * c + c - sw + 0.01), 0, "no nudge in the sweep");
  }
  X.FUN.blade = false; assert.equal(X.bladeRestNudge(T, 0.1), 0); X.FUN.blade = true;
});

test("blade nudge: timing, hit window, telegraph and damage unchanged from live main", () => {
  execFileSync("git", ["diff", "--quiet", "ba4cf88", "--", "src/game/feats.ts", "src/game/content.ts", "src/game/fightlights.ts"]);
  const c = X.TRAPS.bladeCycle;
  for (let s = 0; s < 2 * c; s += c / 50) assert.equal(X.bladeRestNudge(T, s) !== 0, X.bladeStage(T, s) !== 2);
});
