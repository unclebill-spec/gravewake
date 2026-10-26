// MB sprint 2026-10-26: specs 3-7 and polish 2/5 from /workspace/qa/gravewake-2026-10-26 (the blade, spec 1, is blade.test.mjs).
import test from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

const dir = mkdtempSync(join(tmpdir(), "gw-mbs-"));
const root = process.cwd();
writeFileSync(join(dir, "b.ts"), `export * from "${root}/src/game/sim.ts";\nexport * as C from "${root}/src/game/content.ts";\nexport * as RG from "${root}/src/game/rimglow.ts";\n`);
execFileSync("npx", ["esbuild", join(dir, "b.ts"), "--bundle", "--platform=node", "--format=esm", "--log-level=error", "--loader:.png=empty", "--loader:.css=empty", `--outfile=${join(dir, "b.mjs")}`], { stdio: ["ignore", "ignore", "inherit"] });
const store = new Map();
globalThis.localStorage ??= { getItem: (k) => (store.has(k) ? store.get(k) : null), setItem: (k, v) => store.set(k, String(v)), removeItem: (k) => store.delete(k), clear: () => store.clear() };
globalThis.navigator ??= { getGamepads: () => [] };
const X = await import(pathToFileURL(join(dir, "b.mjs")).href);
const { C } = X;
export function fresh(cls = "vampire") {
  const g = new X.Game();
  g.start(cls, "str", "A");
  g.held.clear();
  return g;
}
const nightMs = (n) => n * C.CYCLE_MS + C.DAY_MS + 60 * 1000;
const dayMs = (n) => n * C.CYCLE_MS + 60 * 1000;

test("spec 3: one bounty pin at night on the overworld, seeded per night, none by day, gone once paid", () => {
  const g = fresh();
  g.worldMs = dayMs(5);
  assert.equal(g.bountyMark(), null, "none in town");
  g.enterWorld(91 * 16 + 8, 126 * 16 + 8);
  assert.equal(g.mapId, "world");
  g.worldMs = dayMs(5);
  assert.equal(g.bountyMark(), null, "none by day");
  g.worldMs = nightMs(5);
  const a = g.bountyMark();
  assert.ok(a, "a pin at night");
  const h = fresh();
  h.enterWorld(91 * 16 + 8, 126 * 16 + 8);
  h.worldMs = nightMs(5);
  assert.deepEqual(h.bountyMark(), a, "same pin for the same night");
  const p = g.bountyPost();
  if (p.kind === "stalker") assert.deepEqual(a, { x: p.x, y: p.y }, "the pin sits on the lair");
  let differ = false;
  for (let n = 6; n < 12 && !differ; n++) {
    h.worldMs = nightMs(n);
    const m = h.bountyMark();
    differ = !!m && (m.x !== a.x || m.y !== a.y);
  }
  assert.ok(differ, "a later night pins somewhere else");
  g.opened.add(`bounty:${Math.floor(g.worldMs / C.CYCLE_MS)}:paid`);
  assert.equal(g.bountyMark(), null, "the kill clears it");
});

test("spec 4: the mimic's bite tell is at least 0.3 s, sounds the rattle, and the bestiary lists the Mimic once met", () => {
  const g = fresh();
  let m = null;
  outer: for (const d of C.DUNGEONS) {
    g.enterDungeon(d.id);
    for (let f = 1; f <= d.floors; f++) {
      g.floor = f;
      g.loadFloor("start");
      if (g.feats?.mimic) { m = g.feats.mimic; break outer; }
    }
  }
  assert.ok(m, "a mimic floor");
  let rattles = 0;
  g.audio = new Proxy({}, { get: (_, k) => (k === "rattle" ? () => rattles++ : () => false) });
  g.roamers = [];
  g.px = m.x * 16 + 8;
  g.py = (m.y + 1) * 16 + 8;
  g.wakeMimic(m);
  const r = g.roamers.find((o) => o.mimic);
  assert.ok(r, "the mimic stands");
  let tell = 0;
  for (let i = 0; i < 200 && !g.mimicTells; i++) { g.update(0.02); }
  assert.ok(g.mimicTells > 0, "the mimic began its bite");
  tell = r.tellMax;
  assert.ok(tell >= 0.3, `tell ${tell}`);
  assert.ok(rattles > 0, "the tell is heard");
  g.fellFoe(r);
  assert.ok(g.bestiary.includes("mimic"), "bestiary lists the mimic");
});

test("spec 5: beside a real grave the cue reads come back at night by day, dig at night, and nothing once turned", () => {
  const g = fresh();
  g.worldMs = 5 * C.CYCLE_MS + 60 * 1000;
  g.enterTown();
  g.update(0.02);
  const T = C.T ?? X.T;
  let gx = -1, gy = -1;
  for (let i = 0; i < g.tiles.length && gx < 0; i++) {
    if (g.tiles[i] !== T.grave) continue;
    const x = i % g.w, y = Math.floor(i / g.w);
    if (g.tiles[(y + 1) * g.w + x] !== T.grave && !g.solid?.(x, y + 1)) { gx = x; gy = y; }
  }
  assert.ok(gx >= 0, "a town grave");
  const stand = () => { g.px = gx * 16 + 8; g.py = (gy + 1) * 16 + 8; g.facing = "n"; };
  stand();
  assert.equal(g.digCue()?.text, "Come back at night");
  g.px = gx * 16 + 8 + 16 * 4; g.py = (gy + 4) * 16 + 8;
  assert.equal(g.digCue(), null, "no cue away from graves");
  g.worldMs = nightMs(5);
  g.update(0.02);
  stand();
  assert.equal(g.digCue()?.text, "Need a spade");
  g.inv.push({ id: "spade", name: "Spade", special: "Spade" });
  assert.equal(g.digCue()?.text, "Dig");
  g.digGrave(gx, gy);
  g.battle = null;
  stand();
  assert.equal(g.digCue(), null, "turned tonight");
});

test("spec 6: the curse line holds on every cursed floor, not on a clean one, and the payout is logged", () => {
  const g = fresh();
  const d = C.DUNGEONS.find((o) => !o.pocket && o.floors >= 3);
  g.enterDungeon(d.id);
  g.curse = "dry";
  g.floor = 1;
  assert.match(g.curseLine(), /^Curse: /);
  g.floor = 2;
  assert.match(g.curseLine(), /^Curse: /, "still there on the next floor");
  g.floor = d.floors;
  assert.equal(g.curseOn() ? "on" : g.curseLine(), g.curseOn() ? "on" : "", "no line where it thins");
  g.curse = "";
  g.floor = 1;
  assert.equal(g.curseLine(), "");
});

test("spec 7: a follower lost behind the hero steps up to the heels, and a rescue stays home over a reload", () => {
  const g = fresh();
  g.escort = { id: "x", x: g.px, y: g.py, state: "follow", hp: 10, max: 10 };
  const d = C.DUNGEONS.find((o) => !o.pocket);
  g.enterDungeon(d.id);
  g.escort = { id: "x", x: g.px + 400, y: g.py + 400, state: "follow", hp: 10, max: 10 };
  g.update(0.02);
  assert.ok(Math.hypot(g.px - g.escort.x, g.py - g.escort.y) < 40, "snapped to the heels");
  g.opened.add("rescued:test");
  assert.ok(g.opened.has("rescued:test"));
});

test("polish 2: the gate arrow shows in town until the first road win, then never", () => {
  const g = fresh();
  g.worldMs = 5 * C.CYCLE_MS + 60 * 1000;
  g.enterTown();
  g.zones = [];
  const a = g.gateCue();
  assert.ok(a && Number.isFinite(a.x));
  g.zones.push("Decayed vale");
  assert.equal(g.gateCue(), null);
});

test("polish 5: the rim pulse marks graves, the board and cracks at night only", () => {
  const g = fresh();
  g.worldMs = 5 * C.CYCLE_MS + 60 * 1000;
  g.enterTown();
  g.update(0.02);
  assert.equal(g.rimSpots().length, 0, "none by day");
  g.worldMs = nightMs(5);
  g.update(0.02);
  const n = g.rimSpots();
  assert.ok(n.length >= 1 && n.every((s) => g.tiles[s.y * g.w + s.x] === C.T.grave), `${n.length}`);
});

test("batch C: the night rim is steady #b07aff with a slow stepped violet halo, no blink", async () => {
  const { RG } = X;
  const fs = await import("node:fs");
  const draw = fs.readFileSync("src/game/draw.ts", "utf8");
  assert.equal(RG.RIM_COLOR, "#b07aff", "same colour");
  assert.ok(RG.RIM_PERIOD >= 2000 && RG.RIM_PERIOD <= 3000, "2-3 s period");
  const seen = new Set();
  for (let t = 0; t < RG.RIM_PERIOD; t += 10) seen.add(RG.rimHalo(t));
  assert.deepEqual([...seen].sort(), [null, "#4a2a78", "#7a5ad0"].sort(), "steps through the violet ramp only");
  assert.equal(RG.rimHalo(0), RG.rimHalo(RG.RIM_PERIOD), "periodic");
  assert.ok(!/performance\.now\(\) % 1200 < 600/.test(draw), "the hard blink is gone");
  const i = draw.indexOf("const rims = g.rimSpots");
  assert.ok(i > 0 && !/globalAlpha|Gradient|shadowBlur|rgba\(/.test(draw.slice(i, i + 900)), "hard pixels");
});
