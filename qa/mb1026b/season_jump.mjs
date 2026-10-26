// QA only (not in the game UI): write a localStorage save that wakes in a chosen season, night, map and spot.
// Usage: node qa/mb1026b/season_jump.mjs <autumn|winter|spring|summer> [--festival] [--day] [--map world|town] [--out file]
// Spec 2-FEATURE-SPECS #14: a dev/QA way to jump the season. Prints {key, value} for localStorage.
import { execFileSync } from "node:child_process";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

const args = process.argv.slice(2);
const season = args.find((a) => !a.startsWith("--") && !/\.json$/.test(a)) ?? "summer";
const opt = (k, d) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : d; };
const dir = mkdtempSync(join(tmpdir(), "gw-sj-"));
const out = join(dir, "sim.mjs");
execFileSync("npx", ["esbuild", "src/game/sim.ts", "--bundle", "--platform=node", "--format=esm", "--log-level=error", `--outfile=${out}`], { stdio: ["ignore", "ignore", "inherit"] });
const store = new Map();
globalThis.localStorage ??= { getItem: (k) => (store.has(k) ? store.get(k) : null), setItem: (k, v) => store.set(k, String(v)), removeItem: (k) => store.delete(k), clear: () => store.clear() };
const S = await import(pathToFileURL(out).href);
export async function seasonSave(season, { festival = false, day = false, map = "world", cls = "warrior" } = {}) {
  const g = new S.Game();
  g.start(cls, "str", "QA");
  const order = ["autumn", "winter", "spring", "summer"];
  const si = order.indexOf(season);
  if (si < 0) throw new Error(`season ${season}?`);
  const cycle = S.CYCLE_MS ?? 30 * 60 * 1000;
  const d = si * 6 + (festival ? 3 : 1); // festivalDay 3; day 1 is never a derby or festival night
  g.worldMs = d * cycle + (day ? 5 * 60 * 1000 : 15 * 60 * 1000 + 5 * 60 * 1000);
  if (map === "town") g.enterTown();
  else { g.enterTown(); g.enterWorld(91 * 16 + 8, 127 * 16 + 8); } // three tiles south of the vale's town door
  g.saveSlot(0);
  return { key: "gravewake-saves-v1", value: localStorage.getItem("gravewake-saves-v1"), season: g.season?.() ?? season, phase: g.phase, festival: g.festivalId?.() ?? "", map: g.mapId };
}
if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const r = await seasonSave(season, { festival: args.includes("--festival"), day: args.includes("--day"), map: opt("--map", "world") });
  const f = opt("--out", "");
  if (f) writeFileSync(f, JSON.stringify(r));
  console.log(JSON.stringify({ ...r, value: `${r.value.length} chars` }));
}
