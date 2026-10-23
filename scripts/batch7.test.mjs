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
