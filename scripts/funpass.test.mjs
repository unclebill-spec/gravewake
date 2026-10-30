// gw-blade-1030 fun pass (src/game/funpass.ts): the blade's wind-up is drawn only during the telegraph and is small;
// the juice never changes the hit window (damage only in the sweep, in the lane) or the damage; FUN.blade off removes it all.
import test from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

const dir = mkdtempSync(join(tmpdir(), "gw-fun-"));
const root = process.cwd();
writeFileSync(join(dir, "b.ts"), `export * from "${root}/src/game/sim.ts";\nexport * as F from "${root}/src/game/feats.ts";\nexport * as C from "${root}/src/game/content.ts";\nexport * as FP from "${root}/src/game/funpass.ts";\n`);
execFileSync("npx", ["esbuild", join(dir, "b.ts"), "--bundle", "--platform=node", "--format=esm", "--log-level=error", "--loader:.png=empty", "--loader:.css=empty", `--outfile=${join(dir, "b.mjs")}`], { stdio: ["ignore", "ignore", "inherit"] });
const store = new Map();
globalThis.localStorage ??= { getItem: (k) => (store.has(k) ? store.get(k) : null), setItem: (k, v) => store.set(k, String(v)), removeItem: (k) => store.delete(k), clear: () => store.clear() };
globalThis.navigator ??= { getGamepads: () => [] };
const X = await import(pathToFileURL(join(dir, "b.mjs")).href);
const { F, C, FP } = X;

function bladeFloor() {
  const g = new X.Game();
  g.start("vampire", "str", "A");
  g.held.clear();
  for (const d of C.DUNGEONS) {
    g.enterDungeon(d.id);
    for (let f = 1; f <= d.floors; f++) {
      g.floor = f;
      g.loadFloor("start");
      if (g.feats?.blades?.length) return g;
    }
  }
  return null;
}

test("wind-up: only in the telegraph, cocks away from the swing, at most 6 px; 0 with FUN off", () => {
  const trap = { x: 5, y: 5, kind: "blade", phase: 0 };
  const c = C.TRAPS.bladeCycle;
  let inTell = 0;
  for (let i = 0; i < 2 * c * 100; i++) {
    const s = i / 100 + 0.001;
    const w = FP.bladeWindup(trap, s);
    const st = F.bladeStage(trap, s);
    if (st !== 1) assert.equal(w, 0, `no wind-up outside the telegraph at ${s}`);
    else if (w !== 0) inTell++;
    assert.ok(Math.abs(w) <= 6);
  }
  assert.ok(inTell > 10, "the wind-up shows during the telegraph");
  // late in the even-cycle telegraph the blade has cocked west (the sweep goes east)
  assert.ok(FP.bladeWindup(trap, c - C.TRAPS.bladeSweep - 0.15) < 0);
  FP.FUN.blade = false;
  try { assert.equal(FP.bladeWindup(trap, c - C.TRAPS.bladeSweep - 0.15), 0); } finally { FP.FUN.blade = true; }
});

test("gw-blade-b-1030 wind-up: a full 6 px pull-back held to the sweep, never a shiver (no sign flips, never shrinks)", () => {
  const trap = { x: 5, y: 5, kind: "blade", phase: 0 };
  const c = C.TRAPS.bladeCycle;
  const t0 = c - C.TRAPS.bladeSweep - C.TRAPS.bladeTell;
  for (const cyc of [0, 1]) {
    let prev = 0;
    for (let i = 1; i < 450; i++) {
      const s = cyc * c + t0 + (C.TRAPS.bladeTell * i) / 450;
      const w = FP.bladeWindup(trap, s);
      assert.ok(Math.abs(w) >= Math.abs(prev), `never shrinks at ${s}`);
      if (prev) assert.equal(Math.sign(w), Math.sign(prev), `no shiver at ${s}`);
      prev = w;
    }
    assert.equal(Math.abs(prev), 6);
    assert.equal(FP.bladeWindup(trap, cyc * c + t0 + C.TRAPS.bladeTell * 0.5), cyc === 0 ? -6 : 6);
  }
});

test("gw-blade-b-1030 cut shake: 2 px at the default Screen shake, scales with the slider, 0 with shake off", () => {
  assert.equal(FP.bladeCutPeakPx(0.65), 2);
  assert.equal(FP.bladeCutPeakPx(1), 3);
  assert.equal(FP.bladeCutPeakPx(0.3), 1);
  assert.equal(FP.bladeCutPeakPx(0), 0);
  // the game: a real blade cut sets the amplitude; it drops back to 2 when the shake is over
  const g = bladeFloor();
  assert.ok(g, "a floor with a blade");
  assert.equal(g.shakeMul, 0.65);
  assert.equal(g.shakeAmp, 2);
  const b = g.feats.blades[0];
  g.px = b.x * 16 + 8; g.py = b.y * 16 + 8; g.hp = 9999;
  let cut = false;
  for (let i = 0; i < 400 && !cut; i++) { g.iframe = 0; g.fallen = 0; const h = g.hp; g.worldMs += 20; g.tickTraps(0.02); cut = g.hp < h; }
  assert.ok(cut, "the blade cut the hero");
  assert.ok(Math.abs(g.shakeAmp - 2 / 0.65) < 1e-9 && g.shake >= 0.2 - 1e-9);
  const peak = (mul) => { let p = 0; for (let i = 0; i <= 2000; i++) p = Math.max(p, Math.abs(FP.shakeOffset((0.2 * i) / 2000, g.shakeAmp, mul))); return p; };
  assert.equal(peak(g.shakeMul), 2);
  assert.equal(peak(0), 0);
  for (let i = 0; i < 6; i++) g.update(0.05);
  assert.equal(g.shake, 0); assert.equal(g.shakeAmp, 2, "back to the plain amplitude after the shake");
  // a plain shake keeps its old size (2 x slider: 1 px at the default)
  let p = 0; for (let i = 0; i <= 2000; i++) p = Math.max(p, Math.abs(FP.shakeOffset((0.2 * i) / 2000, 2, 0.65)));
  assert.equal(p, 1);
});

test("fun pass keeps the hit window and the damage: hurt only in the sweep, by the same amount with FUN on or off", () => {
  const run = (fun) => {
    FP.FUN.blade = fun;
    const g = bladeFloor();
    assert.ok(g, "a floor with a blade");
    const b = g.feats.blades[0];
    g.px = b.x * 16 + 8; g.py = b.y * 16 + 8;
    g.hp = 9999;
    const hits = [];
    for (let i = 0; i < 400; i++) {
      g.iframe = 0; g.fallen = 0;
      const before = g.hp;
      g.worldMs += 20;
      g.tickTraps(0.02);
      if (g.hp < before) hits.push([F.bladeStage(b, g.worldMs / 1000), before - g.hp]);
    }
    return hits;
  };
  try {
    const on = run(true), off = run(false);
    assert.ok(on.length > 0);
    assert.ok(on.every(([st]) => st === 2), "only in the sweep");
    assert.deepEqual(on, off, "same hits and damage with the juice on or off");
  } finally { FP.FUN.blade = true; }
});

test("near-miss lines: a rare one about 1 in 12, never empty", () => {
  assert.equal(FP.nearMissLine(0.01, 0.5), FP.NEAR_MISS_RARE);
  for (let p = 0; p < 1; p += 0.1) assert.ok(FP.NEAR_MISS.includes(FP.nearMissLine(0.5, p)));
});
