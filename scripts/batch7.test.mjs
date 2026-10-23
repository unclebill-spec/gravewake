// batch7 (2026-10-23): automated tests for the bestiary book, badges, New Game+, save backup and touch/pad UI rules.
import test from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

const dir = mkdtempSync(join(tmpdir(), "gw-b7-"));
const out = join(dir, "sim.mjs");
execFileSync("npx", ["esbuild", "src/game/sim.ts", "--bundle", "--platform=node", "--format=esm", "--log-level=error", `--outfile=${out}`], { stdio: ["ignore", "ignore", "inherit"] });
const bookOut = join(dir, "book.mjs");
execFileSync("npx", ["esbuild", "src/game/book.ts", "--bundle", "--platform=node", "--format=esm", "--log-level=error", `--outfile=${bookOut}`], { stdio: ["ignore", "ignore", "inherit"] });
const store = new Map();
globalThis.localStorage ??= { getItem: (k) => (store.has(k) ? store.get(k) : null), setItem: (k, v) => store.set(k, String(v)), removeItem: (k) => store.delete(k), clear: () => store.clear() };
const { Game } = await import(pathToFileURL(out).href);
const B = await import(pathToFileURL(bookOut).href);

function fresh() {
  const g = new Game();
  g.start("warrior", "str", "A");
  g.held?.clear?.();
  return g;
}

test("bestiary: 17 families x 4 ranks plus every named special; first defeat fills its entries", () => {
  assert.equal(B.BOOK_FAMILIES.length, 17);
  assert.equal(B.BOOK_RANKS.length, 4);
  assert.ok(B.BOOK_SPECIALS.some((d) => d.id === "hollowmourn"));
  assert.ok(B.BOOK_SPECIALS.some((d) => d.id === "krampus"));
  const g = fresh();
  assert.deepEqual(g.book, []);
  g.noteKill({ family: "zombie" });
  g.noteKill({ family: "zombie" });
  g.noteKill({ family: "lantern", boss: true, def: "lanternking" });
  g.noteKill({ family: "ghost", helper: true });
  assert.deepEqual([...g.book].sort(), ["lantern:boss", "s:lanternking", "zombie:mob"]);
});

test("bestiary: unreachable cells never count and a full book is every reachable cell plus every special", () => {
  assert.equal(B.bookReachable("cat", "mob"), false);
  assert.equal(B.bookReachable("zombie", "mob"), true);
  assert.equal(B.bookReachable("lich", "boss"), true);
  assert.equal(B.allBookKeys().length, B.BOOK_TOTAL);
  assert.ok(B.BOOK_TOTAL > 50 && B.BOOK_TOTAL <= 68 + B.BOOK_SPECIALS.length);
});

test("bestiary and badges survive a save and load; an old save without them still loads", () => {
  const g = fresh();
  g.noteKill({ family: "bat" });
  g.marks.push("bust");
  g.checkBadges();
  const rec = JSON.parse(JSON.stringify(g.saveRecord()));
  assert.deepEqual(rec.book, ["bat:mob"]);
  const h = new Game();
  h.loadRecord(rec);
  assert.deepEqual(h.book, ["bat:mob"]);
  assert.ok(h.badges.includes("first") && h.badges.includes("bust"));
  const old = { ...rec };
  delete old.book; delete old.badges; delete old.marks; delete old.ngPlus;
  const o = new Game();
  o.loadRecord(old);
  assert.deepEqual(o.book, []);
  assert.equal(o.ngPlus, 0);
});

test("badges: at least 20, each once, with a toast; silver, side areas and full-book rules", () => {
  assert.ok(B.BADGES.length >= 20);
  assert.equal(new Set(B.BADGES.map((b) => b.id)).size, B.BADGES.length);
  const g = fresh();
  g.coin = 1200;
  g.checkBadges();
  assert.ok(g.badges.includes("silver100") && g.badges.includes("silver1k") && !g.badges.includes("silver10k"));
  const n = g.toasts.length;
  g.checkBadges();
  assert.equal(g.toasts.length, n, "no second toast for the same badge");
  g.opened.add("side:orchard:done");
  g.checkBadges();
  assert.ok(g.badges.includes("orchard"));
  for (const k of B.allBookKeys()) g.book.push(k);
  g.checkBadges();
  for (const id of ["bookall", "story", "allbosses", "hollowmourn"]) assert.ok(g.badges.includes(id), id);
});

test("New Game+: keeps level, gear, coin, bestiary and badges; foes scale up; NG+ mark saved", () => {
  const g = fresh();
  g.level = 12; g.coin = 500; g.noteKill({ family: "bat" }); g.checkBadges();
  const eq = JSON.stringify(g.equip); const inv = g.inv.length;
  g.endingSeen = true;
  g.startNewGamePlus();
  assert.equal(g.ngPlus, 1); assert.equal(g.level, 12); assert.equal(g.coin, 500);
  assert.equal(JSON.stringify(g.equip), eq); assert.equal(g.inv.length, inv);
  assert.deepEqual(g.book, ["bat:mob"]); assert.ok(g.badges.includes("ngplus"));
  assert.equal(g.mode, "play"); assert.equal(g.hp, g.maxHp);
  const rec = JSON.parse(JSON.stringify(g.saveRecord()));
  assert.equal(rec.ngPlus, 1);
  const h = new Game(); h.loadRecord(rec); assert.equal(h.ngPlus, 1);
});

test("New Game+ scaling: hp x1.5 and attack x1.25 per loop, capped at three loops", async () => {
  const cOut = join(dir, "content.mjs");
  execFileSync("npx", ["esbuild", "src/game/content.ts", "--bundle", "--platform=node", "--format=esm", "--log-level=error", `--outfile=${cOut}`]);
  const C = await import(pathToFileURL(cOut).href);
  assert.deepEqual(C.ngScale(0), { hp: 1, atk: 1 });
  assert.deepEqual(C.ngScale(1), { hp: 1.5, atk: 1.25 });
  assert.deepEqual(C.ngScale(9), C.ngScale(3));
});

test("end credits: the roll credits the creator, the fonts (OFL) and the tools; the last scene plays Hollowmourn's voice", async () => {
  const src = (await import("node:fs")).readFileSync("src/game/credits.tsx", "utf8");
  assert.match(src, /CREATOR = "Bill Weathersbee"/);
  assert.match(src, /Jacquarda Bastarda 9[\s\S]*SIL Open Font License 1\.1/);
  assert.match(src, /Pixelify Sans[\s\S]*SIL Open Font License 1\.1/);
  assert.doesNotMatch(src, /device's own serif fonts/);
  const g = fresh();
  const said = [];
  g.audio = { voice: (b, w) => (said.push(`${b}-${w}`), true), ui() {}, coin() {} };
  g.ending = { scene: 0 };
  g.mode = "ending";
  const n = g.endingScenes().length;
  for (let i = 0; i < n; i++) g.nextEnding();
  assert.deepEqual(said.filter((s) => s.startsWith("hollowmourn")), ["hollowmourn-death"]);
  g.nextEnding();
  assert.equal(g.endingSeen, true);
});

test("pad and touch: every menu mode takes the pad (the ending too), badges are focusable, touch controls hide in keys mode", async () => {
  const src = (await import("node:fs")).readFileSync("src/game/Gravewake.tsx", "utf8");
  const nav = src.match(/const NAV_MODES = new Set\(\[([^\]]*)\]\)/)[1];
  for (const m of ["title", "talk", "shop", "casino", "prizes", "bank", "zeppelin", "pause", "level", "crypt", "dead", "map", "ending"]) assert.ok(nav.includes(`"${m}"`), m);
  assert.match(src, /data-testid="hud-touch"[\s\S]{0,120}hidden=\{keysMode\}/);
  assert.match(src, /\(pointer: fine\)"\)\.matches && \(w\.navigator\?\.maxTouchPoints \?\? 0\) === 0/);
  const book = (await import("node:fs")).readFileSync("src/game/BookPages.tsx", "utf8");
  assert.match(book, /<button type="button" key=\{b\.id\} data-badge/);
  const S = await import(pathToFileURL((execFileSync("npx", ["esbuild", "src/game/screen.ts", "--bundle", "--platform=node", "--format=esm", "--log-level=error", `--outfile=${join(dir, "screen.mjs")}`]), join(dir, "screen.mjs"))).href);
  // a 4-wide grid (the bestiary) is fully walkable with the d-pad
  const rs = []; for (let r = 0; r < 5; r++) for (let c = 0; c < 4; c++) rs.push({ x: c * 40, y: r * 40, w: 32, h: 32 });
  const seen = new Set([0]); const q = [0];
  while (q.length) { const a = q.shift(); for (const d of ["up", "down", "left", "right"]) { const n = S.navPick(rs, a, d); if (n >= 0 && !seen.has(n)) { seen.add(n); q.push(n); } } }
  assert.equal(seen.size, rs.length);
});
