// gw-c-1030: Will's moss set (kit-pixelkit 899ba09 + soil pass 4 49ed87a) is looks only: props sit on open town ground,
// one per tile, clear of mounds, dig sites, the stair, the undertaker, the fence, street lamps and each other; the
// ground overlays never touch g.tiles, so collision is the same with the moss module loaded.
import test from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, writeFileSync, existsSync, readFileSync } from "node:fs";
import { decodePng } from "./art-check.mjs";
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

test("moss edges: mask bits match moss neighbours; the edge sheet is 16 masks x 4 variants, clear or opaque only", async () => {
  const { default: sharp } = await import("sharp").catch(() => ({ default: null }));
  assert.equal(M.mossMask("town", "", () => -1, 5, 5), 0);
  assert.ok(M.MOSS_URLS.includes(M.MOSS_EDGES));
  if (sharp) { const m = await sharp("public/art/moss/glow_moss_edges.png").metadata(); assert.equal(m.width, 256); assert.equal(m.height, 64); }
});

/** 16x16 RGBA cell from a decoded sheet. Column is the mask key, row the variant. */
function sheetCellRgba(img, col, row) {
  const out = new Uint8Array(16 * 16 * 4);
  for (let y = 0; y < 16; y++) out.set(img.rgba.subarray(((row * 16 + y) * img.w + col * 16) * 4, ((row * 16 + y) * img.w + col * 16) * 4 + 64), y * 64);
  return out;
}

test("moss inner corners: plain cells match today's edges; a concave corner picks a carved cell; palette stays locked", () => {
  const edges = decodePng(readFileSync("public/art/moss/glow_moss_edges.png"));
  const inner = decodePng(readFileSync("public/art/moss/glow_moss_inner.png"));
  assert.equal(edges.w, 256); assert.equal(edges.h, 64);
  assert.equal(inner.w, 4096); assert.equal(inner.h, 64);
  for (let row = 0; row < 4; row++) for (let col = 0; col < 16; col++) {
    assert.deepEqual(sheetCellRgba(inner, col, row), sheetCellRgba(edges, col, row), `no-corner cell col ${col} row ${row}`);
  }
  const py = readFileSync("/workspace/masters/gravewake/palette/palette_locked.py", "utf8");
  const locked = new Set([...py.slice(py.indexOf("LOCKED = frozenset(("), py.indexOf("PALETTE_V2_ADD")).matchAll(/"#([0-9a-fA-F]{6})"/g)].map((m) => m[1].toLowerCase()));
  assert.ok(locked.size > 100);
  const alphas = new Set();
  for (let i = 0; i < inner.rgba.length; i += 4) {
    const a = inner.rgba[i + 3];
    alphas.add(a);
    if (a) assert.ok(locked.has([...inner.rgba.subarray(i, i + 3)].map((c) => c.toString(16).padStart(2, "0")).join("")), `colour @${i}`);
  }
  assert.deepEqual([...alphas].sort((a, b) => a - b), [0, 255]);

  const g = town();
  const tileAt = (x, y) => (x < 0 || y < 0 || x >= g.w || y >= g.h ? -1 : g.tiles[y * g.w + x]);
  const mossAt = (x, y) => M.groundOverlay("town", "", tileAt(x, y), x, y) === M.MOSS.moss;
  let plain = null, corner = null;
  for (let y = 0; y < g.h; y++) for (let x = 0; x < g.w; x++) {
    if (!mossAt(x, y)) continue;
    const mask = M.mossMask("town", "", tileAt, x, y);
    const n = mossAt(x, y - 1), e = mossAt(x + 1, y), s = mossAt(x, y + 1), w = mossAt(x - 1, y);
    const expect = (n ? 1 : 0) | (e ? 2 : 0) | (s ? 4 : 0) | (w ? 8 : 0)
      | (n && e && !mossAt(x + 1, y - 1) ? 16 : 0) | (e && s && !mossAt(x + 1, y + 1) ? 32 : 0)
      | (s && w && !mossAt(x - 1, y + 1) ? 64 : 0) | (w && n && !mossAt(x - 1, y - 1) ? 128 : 0);
    assert.equal(mask, expect, `${x},${y}`);
    if (mask & 0xf0) corner ??= { x, y, mask }; else plain ??= { x, y, mask };
  }
  assert.ok(plain && (plain.mask & 0xf0) === 0, "a moss tile with no inner corner still uses the 4-bit cell");
  assert.ok(corner, "the yard has a concave moss corner");
  const row = M.variant(corner.x, corner.y);
  const side = corner.mask & 15;
  const carved = sheetCellRgba(inner, corner.mask, row);
  const base = sheetCellRgba(inner, side, row);
  assert.notDeepEqual(carved, base, "inner-corner mask picks a different cell than the open-edge cell");
  assert.match(readFileSync("src/game/draw.ts", "utf8"), /sheetCell\(ctx, MOSS_INNER, mossMask\(/);
  const tips = [[16, 15, 0], [32, 15, 15], [64, 0, 15], [128, 0, 0]];
  let near = 0;
  for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
    const i = (y * 16 + x) * 4;
    const changed = carved[i] !== base[i] || carved[i + 1] !== base[i + 1] || carved[i + 2] !== base[i + 2] || carved[i + 3] !== base[i + 3];
    if (carved[i + 3] === 255) {
      assert.equal(base[i + 3], 255);
      assert.equal(carved[i], base[i]); assert.equal(carved[i + 1], base[i + 1]); assert.equal(carved[i + 2], base[i + 2]);
    } else assert.equal(carved[i + 3], 0);
    if (!changed) continue;
    const close = tips.some(([bit, ox, oy]) => (corner.mask & bit) && Math.max(Math.abs(x - ox), Math.abs(y - oy)) <= 6);
    assert.ok(close, `carve left the corner at ${x},${y}`);
    near++;
  }
  assert.ok(near > 0, "the corner cell cleared pixels");
  assert.ok(M.MOSS_URLS.includes(M.MOSS_INNER));
});

// gw-d-1030 (EB Rule 19 on 50b4d0c): orb pulse period in game seconds, driven by the real sim clock (frame += dt * 8; draw uses frame / 8).
test("orb pulse: period 3.2 s +/- 0.1 in game seconds", () => {
  const g = town();
  const p = M.MOSS_PROPS.find((q) => q.kind === "orb");
  const dt = 0.01, ups = []; let prev = M.orbPulse(p, g.frame / 8), t = 0;
  for (let i = 0; i < 1200; i++) { g.update(dt); t += dt; const v = M.orbPulse(p, g.frame / 8); if (prev < 0.5 && v >= 0.5) ups.push(t); prev = v; }
  assert.ok(ups.length >= 3, `at least 3 rising crossings in 12 s (got ${ups.length})`);
  const per = (ups.at(-1) - ups[0]) / (ups.length - 1);
  assert.ok(Math.abs(per - 3.2) <= 0.1, `period ${per.toFixed(3)} s`);
});
