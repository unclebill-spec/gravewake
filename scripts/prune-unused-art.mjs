// playtest1m (2026-10-03, TIDY): delete the art the game never loads, listed in scripts/frozen/playtest1m/removed-art.json.
// A full writer re-run writes some of it back (the pixel, spell and sprite writers' previews, the sprite writer's heroes.png,
// the brileta tool's rocks.png); run `node scripts/prune-unused-art.mjs` after one. Group playtest1m fails while any is back.
import { existsSync, readFileSync, rmSync } from "node:fs";

const { removed } = JSON.parse(readFileSync("scripts/frozen/playtest1m/removed-art.json", "utf8"));
const back = Object.keys(removed).filter((f) => f.startsWith("public/art/") && existsSync(f));
for (const f of back) rmSync(f);
console.log(back.length ? `removed ${back.length}: ${back.join(", ")}` : "nothing to prune");
