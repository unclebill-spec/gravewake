// QA only: write a slot-1 save standing in town at a tile (default (33,26), four south of the festival rift's mouth).
// Usage: node qa/riftconfirm/town_save.mjs [x,y] --out save.json   (Node 22)
import { execFileSync } from "node:child_process";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
const args = process.argv.slice(2);
const at = (args.find((a) => /^\d+,\d+$/.test(a)) ?? "33,26").split(",").map(Number);
const oi = args.indexOf("--out");
const dir = mkdtempSync(join(tmpdir(), "gw-rc-"));
execFileSync("npx", ["esbuild", "src/game/sim.ts", "--bundle", "--platform=node", "--format=esm", "--log-level=error", "--loader:.png=empty", `--outfile=${join(dir, "sim.mjs")}`], { stdio: ["ignore", "ignore", "inherit"] });
const store = new Map();
globalThis.localStorage ??= { getItem: (k) => (store.has(k) ? store.get(k) : null), setItem: (k, v) => store.set(k, String(v)), removeItem: (k) => store.delete(k), clear: () => store.clear() };
const S = await import(pathToFileURL(join(dir, "sim.mjs")).href);
const g = new S.Game();
g.start("warrior", "str", "QA");
g.enterTown(at[0] * 16 + 8, at[1] * 16 + 8);
g.saveSlot(0);
const r = { key: "gravewake-saves-v1", value: localStorage.getItem("gravewake-saves-v1"), at };
if (oi >= 0) writeFileSync(args[oi + 1], JSON.stringify(r));
console.log(JSON.stringify({ ...r, value: `${r.value.length} chars` }));
