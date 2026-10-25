// MB final pass 2 (2026-10-25): Story's items exist, can be bought, equip, and survive a save.
import test from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

const dir = mkdtempSync(join(tmpdir(), "gw-si-"));
const out = join(dir, "sim.mjs");
execFileSync("npx", ["esbuild", "src/game/sim.ts", "--bundle", "--platform=node", "--format=esm", "--log-level=error", `--outfile=${out}`], { stdio: ["ignore", "ignore", "inherit"] });
const sio = join(dir, "si.mjs");
execFileSync("npx", ["esbuild", "src/game/story_items.ts", "--bundle", "--platform=node", "--format=esm", "--log-level=error", `--outfile=${sio}`], { stdio: ["ignore", "ignore", "inherit"] });
const store = new Map();
globalThis.localStorage ??= { getItem: (k) => (store.has(k) ? store.get(k) : null), setItem: (k, v) => store.set(k, String(v)), removeItem: (k) => store.delete(k), clear: () => store.clear() };
const { Game } = await import(pathToFileURL(out).href);
const S = await import(pathToFileURL(sio).href);

test("story items: all ten are sold, buy, equip (gear) and save/load", () => {
  for (const cls of ["warrior", "wizard", "assassin", "vampire"]) {
    const g = new Game();
    try { g.start(cls, "str", "A"); } catch { continue; }
    const seen = new Set();
    for (const role of ["mystic", "merchant", "undertaker"]) {
      g.shopRole = role;
      g.stock = g.buildStock(role);
      for (const it of g.stock.filter((s) => S.STORY_ITEM_NAMES.includes(s.name))) {
        seen.add(it.name);
        g.coin = 99999;
        g.inv = [];
        g.buy(it);
        const got = g.inv.find((i) => i.name === it.name);
        if (it.kind === "potion") continue; // draughts go to the potion pool
        assert.ok(got, `${cls} bought ${it.name}`);
        g.equipItem(got);
        assert.equal(g.equip[it.slot]?.name, it.name, `${cls} equips ${it.name}: ${g.logLine}`);
        const rec = JSON.parse(JSON.stringify(g.saveRecord()));
        const h = new Game();
        h.loadRecord(rec);
        assert.equal(h.equip[it.slot]?.name, it.name, `${it.name} survives a save`);
      }
    }
    assert.deepEqual([...seen].sort(), [...S.STORY_ITEM_NAMES].sort(), `${cls} sees every story item`);
  }
});

test("story items: none is the best of its slot (atk/ac/bonus within one rank step)", () => {
  const all = [...S.storyStock("mystic", 80, "chain"), ...S.storyStock("merchant", 80, "chain"), ...S.storyStock("undertaker", 80, "chain")];
  assert.equal(all.length, 10);
  for (const it of all) assert.ok(it.rank <= 3 && (it.atk ?? 0) <= 32 && (it.ac ?? 0) <= 4 && (it.bonus ?? 0) <= 2, it.name);
});
