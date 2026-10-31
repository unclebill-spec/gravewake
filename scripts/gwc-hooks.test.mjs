// gw-c-1030: GD queued items b (the climb-out line holds 1.5 s before biome/weather) and c (the ?qa stair warp).
import test from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

const dir = mkdtempSync(join(tmpdir(), "gw-hk-"));
const out = join(dir, "sim.mjs");
execFileSync("npx", ["esbuild", "src/game/sim.ts", "--bundle", "--platform=node", "--format=esm", "--log-level=error", `--outfile=${out}`], { stdio: ["ignore", "ignore", "inherit"] });
const store = new Map();
globalThis.localStorage ??= { getItem: (k) => (store.has(k) ? store.get(k) : null), setItem: (k, v) => store.set(k, String(v)), removeItem: (k) => store.delete(k), clear: () => store.clear() };
const { Game } = await import(pathToFileURL(out).href);

function vampAtStair() {
  const g = new Game(); g.start("vampire", "int", "A");
  const r = g.qaWarp("stair");
  assert.match(r, /^town:\d+,\d+$/);
  assert.equal(g.mapId, "town");
  g.held.add("ArrowUp"); g.held.add("KeyW");
  for (let i = 0; i < 120 && g.mapId !== "dungeon"; i++) g.update(1 / 60);
  g.held.clear();
  return { g, r };
}

test("qa stair warp: from the vale to the cemetery stair; walking up enters the Opened Grave", () => {
  const { g, r } = vampAtStair();
  assert.equal(g.mapId, "dungeon", `entered from ${r}`);
  assert.equal(g.dungeon, "grave");
});

test("climb-out line holds 1.5 s before biome/weather lines take the log", () => {
  const { g } = vampAtStair();
  g.useStair(g.tiles[Math.floor(g.py / 16) * g.w + Math.floor(g.px / 16)]);
  const line = g.logLine;
  assert.match(line, /You climb back into the open air/);
  assert.equal(g.logHoldUntil - g.worldMs, g.constructor.LOG_HOLD_MS);
  assert.equal(g.mapId, "town");
  g.weatherMark = "__other"; g.seenBiome = "__other";
  for (let i = 0; i < 60; i++) g.update(1 / 60);
  assert.equal(g.logLine, line, "still readable at 1 s");
  for (let i = 0; i < 60; i++) g.update(1 / 60);
  assert.equal(g.mapId, "town", "no loop back down the crypt stair after climbing out");
});
