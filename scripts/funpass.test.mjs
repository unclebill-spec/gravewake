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

test("wind-up: only in the telegraph, cocks away from the swing, at most 5 px; 0 with FUN off", () => {
  const trap = { x: 5, y: 5, kind: "blade", phase: 0 };
  const c = C.TRAPS.bladeCycle;
  let inTell = 0;
  for (let i = 0; i < 2 * c * 100; i++) {
    const s = i / 100 + 0.001;
    const w = FP.bladeWindup(trap, s);
    const st = F.bladeStage(trap, s);
    if (st !== 1) assert.equal(w, 0, `no wind-up outside the telegraph at ${s}`);
    else if (w !== 0) inTell++;
    assert.ok(Math.abs(w) <= 5);
  }
  assert.ok(inTell > 10, "the wind-up shows during the telegraph");
  // late in the even-cycle telegraph the blade has cocked west (the sweep goes east)
  assert.ok(FP.bladeWindup(trap, c - C.TRAPS.bladeSweep - 0.15) < 0);
  FP.FUN.blade = false;
  try { assert.equal(FP.bladeWindup(trap, c - C.TRAPS.bladeSweep - 0.15), 0); } finally { FP.FUN.blade = true; }
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
