// gw-left-1117: short phone views at the south town gate show four ring rows past the fence.
// Desktop edge clamp stays. Camera only: this file never builds town tiles.
import test from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

const dir = mkdtempSync(join(tmpdir(), "gw-south-"));
const entry = join(dir, "e.ts");
writeFileSync(entry, `export { cameraFor } from "${process.cwd()}/src/game/draw.ts"; export { casinoSignSpot } from "${process.cwd()}/src/game/wow.ts";`);
const out = join(dir, "b.mjs");
execFileSync("npx", ["esbuild", entry, "--bundle", "--platform=node", "--format=esm", "--log-level=error", `--outfile=${out}`], { stdio: ["ignore", "ignore", "inherit"] });
const store = new Map();
globalThis.localStorage ??= { getItem: (k) => (store.has(k) ? store.get(k) : null), setItem: (k, v) => store.set(k, String(v)), removeItem: (k) => store.delete(k), clear: () => store.clear() };
const { cameraFor, casinoSignSpot } = await import(pathToFileURL(out).href);

const TILE = 16;
const MAP_H = 42 * TILE;
const gate = { px: 28 * TILE + 8, py: 40 * TILE + 8, w: 58, h: 42, mapId: "town" };
const past = (cam, viewH, zoom) => cam.y + viewH / zoom - MAP_H;

test("phone south gate shows ring rows past the fence; desktop and mid-town stay clamped", () => {
  const phone = cameraFor(gate, 915, 412, 4);
  const phonePast = past(phone, 412, 4);
  assert.ok(phonePast >= 40, `915x412 ring ${phonePast}px`); // ~2.7 rows: the hero's whole sprite stays on screen
  assert.ok(phone.y <= gate.py - 36, "hero sprite stays inside the top edge");
  const narrow = cameraFor(gate, 844, 390, 4);
  const narrowPast = past(narrow, 390, 4);
  assert.ok(narrowPast >= 32, `844x390 ring ${narrowPast}px`); // ~2.3 rows
  // Same x as a centred clamp. The bias is vertical only.
  assert.equal(phone.x, cameraFor({ ...gate, mapId: "over" }, 915, 412, 4).x);

  const desk = cameraFor(gate, 1280, 720, 4);
  assert.equal(desk.y, MAP_H - 720 / 4);
  assert.ok(past(desk, 720, 4) <= 0);
  const lap = cameraFor(gate, 960, 540, 4);
  assert.equal(lap.y, MAP_H - 540 / 4);
  assert.ok(past(lap, 540, 4) <= 0);

  const mid = cameraFor({ ...gate, py: 16 * TILE + 8 }, 915, 412, 4);
  assert.equal(mid.y, cameraFor({ ...gate, py: 16 * TILE + 8, mapId: "over" }, 915, 412, 4).y);
  // Two tiles north of the ease: still the edge clamp, no ring forced on.
  const shy = cameraFor({ ...gate, py: MAP_H - 4 * TILE }, 915, 412, 4);
  assert.ok(past(shy, 412, 4) <= 0, `ease start ${past(shy, 412, 4)}`);
  // Halfway down the ease is between the clamp and the full four rows (no one-frame pop).
  const half = cameraFor({ ...gate, py: MAP_H - 3 * TILE }, 915, 412, 4);
  const halfPast = past(half, 412, 4);
  assert.ok(halfPast > 0 && halfPast < phonePast, `ease ${halfPast}`);
});

test("casino stand at zoom 4 keeps the neon sign inside a phone view", () => {
  const spot = casinoSignSpot();
  assert.ok(spot);
  const stand = { px: 45 * TILE + 8, py: 25 * TILE + 8, w: 58, h: 42, mapId: "town" };
  for (const [w, h] of [[915, 412], [844, 390]]) {
    const cam = cameraFor(stand, w, h, 4);
    const vh = h / 4;
    assert.ok(cam.y <= spot.y, `${w}x${h} sign top ${spot.y} cam ${cam.y}`);
    assert.ok(cam.y + vh >= spot.y + spot.h, `${w}x${h} sign bottom cut`);
  }
});
