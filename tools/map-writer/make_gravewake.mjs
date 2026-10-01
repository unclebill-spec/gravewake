// Gravewake renders: three generated dungeon floors and one rift pocket, drawn with the game's
// existing writer tilesets by render_map.py (palette-locked). Nothing here is read by the game.
//   node tools/map-writer/make_gravewake.mjs <shots dir> [json dir]
import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { load } from "./bundle.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const shots = resolve(process.argv[2] ?? "shots");
const jsonDir = resolve(process.argv[3] ?? join(shots, "..", "qa", "map1", "json"));
mkdirSync(shots, { recursive: true });
mkdirSync(jsonDir, { recursive: true });
const M = await load('export * from "./map_writer";\nexport * from "./gravewake";\nexport { T, FAMILIES } from "../../src/game/content";\n', here);
const codes = { wall: M.T.wall, floor: M.T.floor, stairUp: M.T.stairU, stairDown: M.T.stairD, chest: M.T.chest, exit: M.T.stairU, crack: M.T.crack, runeDoor: M.T.runeDoor, brazier: M.T.brazier, statue: M.T.statue };
const families = Object.fromEntries(M.FAMILIES.map((f) => [f.id, f.family]));

// Floor 2 of 3: a full floor with a down stair, a rune vault, and traps. Level 20 is a stand-in;
// the real level comes from the game's Dungeon level rule once a site is approved.
const LEVEL = 20;
const jobs = [
  ...[101, 202, 303].map((seed) => ({ name: `map1_seed_${seed}`, theme: "cave", placed: M.gravewakeFloor(`gen${seed}`, seed, 2, 3, LEVEL) })),
  { name: "map1_rift_7", theme: "ossuary", placed: M.gravewakeRift("rift7", 7, LEVEL) },
];
const python = process.env.MAP_PYTHON ?? "python3";
for (const j of jobs) {
  const file = join(jsonDir, `${j.name}.json`);
  writeFileSync(file, JSON.stringify({ theme: j.theme, codes, families, map: M.toJSON(j.placed.map), feats: j.placed.feats }));
  execFileSync(python, [join(here, "render_map.py"), file, join(shots, `${j.name}.png`)], { stdio: "inherit" });
  const m = j.placed.map;
  const tags = m.rooms.map((r) => r.tag).filter((t) => t !== "room");
  console.log(`${j.name}: ${m.w}x${m.h}, ${m.rooms.length} rooms (${tags.join(", ") || "pocket"}), ${m.foes.length} foes, traps ${j.placed.feats.traps?.length ?? 0}, rune ${!!j.placed.feats.rune}, crack ${!!j.placed.feats.crack}, mimic ${!!j.placed.feats.mimic}`);
}
