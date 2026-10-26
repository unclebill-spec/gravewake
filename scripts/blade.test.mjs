// MB sprint 2026-10-26 (FEATURE_TASKS #3): the swinging blade. Seeded placement, a telegraph before every sweep,
// no hit outside the lane, foes in the lane are hit, the spikes and plates unchanged, the sheet palette-locked.
import test from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

const dir = mkdtempSync(join(tmpdir(), "gw-blade-"));
const root = process.cwd();
writeFileSync(join(dir, "b.ts"), `export * from "${root}/src/game/sim.ts";\nexport * as F from "${root}/src/game/feats.ts";\nexport * as C from "${root}/src/game/content.ts";\n`);
execFileSync("npx", ["esbuild", join(dir, "b.ts"), "--bundle", "--platform=node", "--format=esm", "--log-level=error", "--loader:.png=empty", "--loader:.css=empty", `--outfile=${join(dir, "b.mjs")}`], { stdio: ["ignore", "ignore", "inherit"] });
const store = new Map();
globalThis.localStorage ??= { getItem: (k) => (store.has(k) ? store.get(k) : null), setItem: (k, v) => store.set(k, String(v)), removeItem: (k) => store.delete(k), clear: () => store.clear() };
globalThis.navigator ??= { getGamepads: () => [] };
const X = await import(pathToFileURL(join(dir, "b.mjs")).href);
const { F, C } = X;

function floors(fn) {
  const g = new X.Game();
  g.start("vampire", "str", "A");
  g.held.clear();
  for (const d of C.DUNGEONS) {
    g.enterDungeon(d.id);
    for (let f = 1; f <= d.floors; f++) {
      g.floor = f;
      g.loadFloor("start");
      fn(g, d, f);
    }
  }
}

test("blades: seeded, on open floor, kept apart from the trap list", () => {
  const a = [];
  const b = [];
  let n = 0;
  floors((g, d, f) => {
    const bl = g.feats?.blades ?? [];
    a.push(JSON.stringify(bl));
    n += bl.length;
    if (d.pocket || f >= d.floors) assert.equal(bl.length, 0, `${d.id}:${f} pocket/boss floor has no blade`);
    for (const t of bl) {
      for (const dx of [-1, 0, 1]) assert.equal(g.tiles[t.y * g.w + t.x + dx], C.T.floor, `${d.id}:${f} lane on floor`);
      assert.ok(!(g.feats.traps ?? []).some((k) => k.kind === "blade"), "traps list keeps spikes and plates only");
    }
  });
  floors((g) => b.push(JSON.stringify(g.feats?.blades ?? [])));
  assert.deepEqual(a, b, "same blades on reload");
  assert.ok(n >= 5, `blades placed: ${n}`);
});

test("blades: a telegraph of at least 0.4 s before every sweep", () => {
  assert.ok(C.TRAPS.bladeTell >= 0.4);
  const t = { x: 5, y: 5, kind: "blade", phase: 0.25 };
  let prev = 0;
  let tellFor = 0;
  for (let s = 0; s < 20; s += 0.01) {
    const st = F.bladeStage(t, s);
    if (st === 1) tellFor += 0.01;
    if (st === 2 && prev !== 2 && s > 1) assert.ok(prev === 1 && tellFor >= 0.39, `tell ${tellFor.toFixed(2)} before a sweep at ${s.toFixed(2)}`);
    if (st === 0) tellFor = 0;
    prev = st;
  }
});

test("blades: hurt in the lane only, and foes in it are hit", () => {
  let done = false;
  floors((g) => {
    if (done || !(g.feats?.blades ?? []).length) return;
    done = true;
    const t = g.feats.blades[0];
    const cyc = C.TRAPS.bladeCycle;
    // find a sweep time
    let sweep = 0;
    for (let s = 100; s < 100 + cyc; s += 0.01) if (F.bladeStage(t, s) === 2) { sweep = s + 0.05; break; }
    const foe = g.roamers.find((r) => g.liveFoe(r));
    g.roamers = foe ? [foe] : [];
    // outside the lane (two rows off): no hurt
    g.worldMs = sweep * 1000;
    g.px = t.x * 16 + 8; g.py = (t.y + 2) * 16 + 8;
    const hp0 = g.hp;
    g.tickTraps(0.016);
    assert.equal(g.hp, hp0, "no hit outside the lane");
    // in the lane at rest: no hurt
    let rest = 0;
    for (let s = 100; s < 100 + cyc; s += 0.01) if (F.bladeStage(t, s) === 0) { rest = s; break; }
    g.worldMs = rest * 1000; g.py = t.y * 16 + 8; g.iframe = 0;
    g.tickTraps(0.016);
    assert.equal(g.hp, hp0, "no hit at rest");
    // in the lane on the sweep: hurt
    g.worldMs = sweep * 1000; g.iframe = 0; g.fallen = 0;
    g.tickTraps(0.016);
    assert.ok(g.hp < hp0, `hit in the sweep ${hp0} -> ${g.hp}`);
    // a foe in the lane on the sweep is hit (as after a shove)
    if (foe) {
      foe.x = t.x * 16 + 8; foe.y = t.y * 16 + 8; foe.bladeAt = undefined;
      const f0 = foe.hp;
      g.px = t.x * 16 + 8; g.py = (t.y + 3) * 16 + 8;
      g.tickRoom(0.016);
      assert.ok(foe.hp < f0 || !g.roamers.includes(foe), `foe hit ${f0} -> ${foe.hp}`);
    }
    // the shared hazard helper sees the lane
    assert.ok(g.trapsAll().includes(t));
  });
  assert.ok(done, "found a blade floor");
});

test("blade.png: four 16x16 cells", async () => {
  const { readFileSync } = await import("node:fs");
  const png = readFileSync("public/art/writer/blade.png");
  assert.equal(png.readUInt32BE(16), 64);
  assert.equal(png.readUInt32BE(20), 16);
});
