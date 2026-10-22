// wow batch: night screenshots of each effect (phone 844x390). Usage: node shots.mjs <url> <outdir>
import { chromium } from "/workspace/gravewake/gh-repo/node_modules/playwright/index.mjs";
import { mkdirSync } from "node:fs";
const url = process.argv[2] ?? "http://127.0.0.1:8096/";
const out = process.argv[3] ?? "/workspace/gravewake/qa/wow/shots";
mkdirSync(out, { recursive: true });
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 844, height: 390 }, deviceScaleFactor: 1, hasTouch: true, isMobile: true });
const page = await ctx.newPage();
page.on("pageerror", (e) => console.log("pageerror", e.message));
await page.goto(url, { waitUntil: "networkidle" });
await page.evaluate(() => { localStorage.clear(); localStorage.setItem("gravewake-screen-v1", JSON.stringify({ preset: "phone", aspect: "fit", cap: 1, tipShown: true })); });
await page.goto(url, { waitUntil: "networkidle" });
await page.getByRole("button", { name: "Wake in town" }).click();
await page.waitForTimeout(1500);
await page.evaluate(async () => {
  const c = document.querySelector("canvas");
  const key = Object.keys(c).find((k) => k.startsWith("__reactFiber$"));
  for (let f = c[key]; f; f = f.return) for (let s = f.memoizedState; s; s = s.next) {
    const v = s.memoizedState;
    if (v && typeof v === "object" && v.current && typeof v.current.update === "function" && "px" in v.current) window.__gw = v.current;
  }
  window.__wow = await import("/src/game/wow.ts");
});
const at = (x, y, map = "town") => page.evaluate(([x, y, map]) => {
  const g = window.__gw; g.mode = "play"; g.worldMs = 21 * 60 * 1000;
  if (map === "town" && (g.mapId !== "town")) g.enterTown();
  if (map === "world") g.enterWorld(x * 16 + 8, y * 16 + 8);
  g.px = x * 16 + 8; g.py = y * 16 + 8;
}, [x, y, map]);
const shot = async (name, wait = 600) => { await page.waitForTimeout(wait); await page.screenshot({ path: `${out}/${name}.png` }); console.log(name); };
const fx = (code) => page.evaluate(code);

await at(18, 23); await shot("cemetery-motes", 4000);
await at(34, 24); await shot("wayrift-orbit-plaza", 1500);
await fx(() => { const g = window.__gw; window.__wow.fxRift(33 * 16 + 16, 21 * 16 + 16); }); await shot("wayrift-swirl", 250);
await at(45, 26); await shot("casino-neon", 3000); await fx(() => { window.__gw.zoom = 2; }); await shot("casino-neon-zoom2", 1500); await fx(() => { window.__gw.zoom = 4; });
await at(52, 29); await shot("forge-embers", 3500);
await at(30, 30); await fx(() => { const g = window.__gw; g.level += 1; }); await shot("levelup", 350);
await fx(() => { const g = window.__gw; for (const [dx, rank] of [[-40, null], [-20, 1], [0, 2], [20, 3], [40, 4], [60, 5]]) window.__wow.fxLoot(g.px + dx, g.py + 20, rank); }); await shot("loot-pillars", 300);
await fx(() => { const g = window.__gw; window.__wow.fxBoss(g.px + 40, g.py, true); }); await shot("boss-kill-mulch", 300);
await fx(() => { const g = window.__gw; window.__wow.fxHit(g.px - 30, g.py - 10, 0, false); window.__wow.fxHit(g.px + 30, g.py - 10, 4, true); }); await shot("hit-crit", 120);
await page.evaluate(() => { const g = window.__gw; g.enterInside("croft", true); g.worldMs = 21 * 60 * 1000; window.__wow.fxCoin(g.px, g.py - 30); });
await shot("croft-trophy-coin", 250);
await page.evaluate(() => { const g = window.__gw; g.enterTown(); g.enterDungeon("ossuary"); });
await shot("dungeon-ore-sparkle", 4000);
await at(70, 100, "world"); await shot("world-night-fireflies", 4000);
await browser.close();
