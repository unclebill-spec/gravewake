// MB final pass 2 (2026-10-25): the cemetery's seeded grave mounds sit on bare yard grass, clear of paths, doors,
// the stair, the dig sites, the undertaker, the spawn and each other; they push the hero out like a grave and never trap him.
import test from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

const dir = mkdtempSync(join(tmpdir(), "gw-gm-"));
const out = join(dir, "sim.mjs");
execFileSync("npx", ["esbuild", "src/game/sim.ts", "--bundle", "--platform=node", "--format=esm", "--log-level=error", `--outfile=${out}`], { stdio: ["ignore", "ignore", "inherit"] });
const tp = join(dir, "tp.mjs");
execFileSync("npx", ["esbuild", "src/game/townplan.ts", "--bundle", "--platform=node", "--format=esm", "--log-level=error", `--outfile=${tp}`], { stdio: ["ignore", "ignore", "inherit"] });
const store = new Map();
globalThis.localStorage ??= { getItem: (k) => (store.has(k) ? store.get(k) : null), setItem: (k, v) => store.set(k, String(v)), removeItem: (k) => store.delete(k), clear: () => store.clear() };
const { Game } = await import(pathToFileURL(out).href);
const P = await import(pathToFileURL(tp).href);

function town() {
  const g = new Game();
  g.start("wizard", "int", "A");
  g.enterTown();
  return g;
}

test("grave mounds: seeded, on cemetery grass only, clear of everything", () => {
  const g = town();
  const ms = g.townMounds();
  const C = P.CEMETERY;
  assert.ok(ms.length >= 5, `mounds ${ms.length}`);
  assert.deepEqual(town().townMounds(), ms, "deterministic");
  const grass = g.tiles[ms[0].y * g.w + ms[0].x];
  const fence = new Set(P.cemeteryFence().map((f) => `${f.x},${f.y}`));
  const keep = [[C.stair.x, C.stair.y], [C.undertaker.x, C.undertaker.y], [P.TOWN_SPAWN.x, P.TOWN_SPAWN.y]];
  for (const m of ms) {
    assert.ok(m.x > C.x0 + 1 && m.x < C.x1 - 1 && m.y > C.y0 + 1 && m.y < C.y1 - 1, `in the yard ${m.x},${m.y}`);
    assert.equal(g.tiles[m.y * g.w + m.x], grass, "on bare grass (not a path, door, stair, grave or prop)");
    assert.ok(!C.path.includes(m.x), "off the path");
    assert.ok(!fence.has(`${m.x},${m.y}`));
    for (const [kx, ky] of C.graves) assert.ok(Math.abs(kx - m.x) + Math.abs(ky - m.y) > 1, `a dig site keeps its sides ${kx},${ky}`);
    for (const [kx, ky] of keep) assert.ok(Math.max(Math.abs(kx - m.x), Math.abs(ky - m.y)) > 1, `clear of ${kx},${ky}`);
    for (const n of g.npcs) assert.ok(Math.floor(n.x / 16) !== m.x || Math.floor(n.y / 16) !== m.y, `clear of ${n.id}`);
    for (const o of ms) if (o !== m) assert.ok(Math.max(Math.abs(o.x - m.x), Math.abs(o.y - m.y)) > 1, "no two touch");
    assert.ok(m.cell >= 0 && m.cell < P.MOUND_CELLS);
  }
});

test("grave mounds: push the hero out like a grave, never trap him, and every yard spot stays reachable", () => {
  const g = town();
  const ms = g.townMounds();
  for (const m of ms) {
    g.px = m.x * 16 + 8 + 1; g.py = m.y * 16 + 12 + 1;
    for (let i = 0; i < 4; i++) g.slideOffProps();
    assert.ok(Math.hypot(g.px - (m.x * 16 + 8), g.py - (m.y * 16 + 12)) >= 5.9, "pushed out");
  }
  // flood the yard from the north gate on walkable tiles, mounds as blocks: the stair, the dig sites and the undertaker are all reached
  const C = P.CEMETERY;
  const fence = new Set(P.cemeteryFence().map((f) => `${f.x},${f.y}`));
  const mound = new Set(ms.map((m) => `${m.x},${m.y}`));
  const walk = (x, y) => x >= C.x0 && x <= C.x1 && y >= C.y0 && y <= C.y1 && !fence.has(`${x},${y}`) && !mound.has(`${x},${y}`);
  const seen = new Set([`${C.path[0]},${C.y0}`]);
  const q = [[C.path[0], C.y0]];
  while (q.length) {
    const [x, y] = q.shift();
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const k = `${x + dx},${y + dy}`;
      if (!seen.has(k) && walk(x + dx, y + dy)) { seen.add(k); q.push([x + dx, y + dy]); }
    }
  }
  for (let y = C.y0 + 1; y < C.y1; y++) for (let x = C.x0 + 1; x < C.x1; x++) if (walk(x, y)) assert.ok(seen.has(`${x},${y}`), `reachable ${x},${y}`);
});
