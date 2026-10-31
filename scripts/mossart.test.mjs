// gw-c-1030: Will's moss set (kit-pixelkit 899ba09 + soil pass 4 49ed87a) is looks only: props sit on open town ground,
// one per tile, clear of mounds, dig sites, the stair, the undertaker, the fence, street lamps and each other; the
// ground overlays never touch g.tiles, so collision is the same with the moss module loaded.
import test from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, writeFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

const dir = mkdtempSync(join(tmpdir(), "gw-moss-"));
const entry = join(dir, "e.ts");
writeFileSync(entry, `export * as S from "${process.cwd()}/src/game/sim.ts"; export * as P from "${process.cwd()}/src/game/townplan.ts"; export * as M from "${process.cwd()}/src/game/mossart.ts"; export * as C from "${process.cwd()}/src/game/content.ts"; export * as F from "${process.cwd()}/src/game/funpass.ts";`);
const out = join(dir, "b.mjs");
execFileSync("npx", ["esbuild", entry, "--bundle", "--platform=node", "--format=esm", "--log-level=error", `--outfile=${out}`], { stdio: ["ignore", "ignore", "inherit"] });
const store = new Map();
globalThis.localStorage ??= { getItem: (k) => (store.has(k) ? store.get(k) : null), setItem: (k, v) => store.set(k, String(v)), removeItem: (k) => store.delete(k), clear: () => store.clear() };
const { S, P, M, C, F } = await import(pathToFileURL(out).href);
const T = C.T;
function town() { const g = new S.Game(); g.start("wizard", "int", "A"); g.enterTown(); return g; }

test("moss props: open ground, one sprite per tile, nothing overlapped", () => {
  const g = town();
  const Y = P.CEMETERY;
  const busy = new Set();
  for (const m of g.townMounds()) { busy.add(`${m.x},${m.y}`); busy.add(`${m.x},${m.y - 1}`); }
  for (const f of P.cemeteryFence()) busy.add(`${f.x},${f.y}`);
  busy.add(`${Y.stair.x},${Y.stair.y}`); busy.add(`${Y.undertaker.x},${Y.undertaker.y}`);
  for (let i = 0; i < g.tiles.length; i++) if (g.tiles[i] === T.grave) { const x = i % g.w, y = (i / g.w) | 0; for (const [dx, dy] of [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1]]) busy.add(`${x + dx},${y + dy}`); }
  for (const n of g.npcs ?? []) busy.add(`${Math.floor(n.x / 16)},${Math.floor(n.y / 16)}`);
  const seen = new Set();
  for (const p of M.MOSS_PROPS) {
    const k = `${p.x},${p.y}`;
    assert.ok(!seen.has(k), `one prop per tile ${k}`); seen.add(k);
    assert.ok(!busy.has(k), `clear of mounds, graves, fence, stair, undertaker, npcs ${k}`);
    const t = g.tiles[p.y * g.w + p.x];
    assert.ok(t === T.grass, `on open grass ${k} (tile ${t})`);
    assert.ok(existsSync(`public${M.propSheet(p)}`) && existsSync(`public${M.propEm(p)}`));
  }
  assert.equal(M.MOSS_PROPS.length, 11);
});

test("moss ground: overlays only, cemetery soil/flagstone/moss, deterministic", () => {
  const g = town(); const before = Array.from(g.tiles);
  let soil = 0, flag = 0, moss = 0;
  for (let y = 0; y < g.h; y++) for (let x = 0; x < g.w; x++) {
    const o = M.groundOverlay("town", "", g.tiles[y * g.w + x], x, y);
    assert.equal(o, M.groundOverlay("town", "", g.tiles[y * g.w + x], x, y));
    if (o === M.MOSS.soil) soil++; else if (o === M.MOSS.flag) flag++; else if (o === M.MOSS.moss) moss++;
    if (o) assert.ok(x >= P.CEMETERY.x0 - 1 && x <= P.CEMETERY.x1 + 1 && y >= P.CEMETERY.y0 - 3 && y <= P.CEMETERY.y1 + 3, `in the cemetery ${x},${y}`);
  }
  assert.ok(soil >= 20 && flag >= 10 && moss >= 8, `soil ${soil} flag ${flag} moss ${moss}`);
  assert.deepEqual(Array.from(g.tiles), before, "tiles untouched");
  assert.equal(M.groundOverlay("world", "over", T.water, 3, 3, true), M.MOSS.fen);
  assert.equal(M.groundOverlay("world", "over", T.water, 3, 3, false), null);
  for (const u of M.MOSS_URLS) assert.ok(existsSync(`public${u}`), u);
});

test("fun pass mossFlare: 1 away, up to 1.5 beside, off with FUN.mossFlare false", () => {
  assert.equal(F.mossFlare(100), 1);
  assert.equal(F.mossFlare(0), 1.5);
  F.FUN.mossFlare = false; assert.equal(F.mossFlare(0), 1); F.FUN.mossFlare = true;
});
