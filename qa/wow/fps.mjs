// wow batch: phone fps (844x390, CPU slowed 4x through CDP) at night spots. Usage: node fps.mjs <url> [label]
import { chromium } from "/workspace/gravewake/gh-repo/node_modules/playwright/index.mjs";
const url = process.argv[2] ?? "http://127.0.0.1:8096/";
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 844, height: 390 }, deviceScaleFactor: 1, hasTouch: true, isMobile: true });
const page = await ctx.newPage();
await page.goto(url, { waitUntil: "networkidle" });
await page.evaluate(() => { localStorage.clear(); localStorage.setItem("gravewake-screen-v1", JSON.stringify({ preset: "phone", aspect: "fit", cap: 1, tipShown: true })); });
await page.goto(url, { waitUntil: "networkidle" });
await page.getByRole("button", { name: "Wake in town" }).click();
await page.waitForTimeout(1500);
await page.evaluate(() => {
  const c = document.querySelector("canvas");
  const key = Object.keys(c).find((k) => k.startsWith("__reactFiber$"));
  for (let f = c[key]; f; f = f.return) for (let s = f.memoizedState; s; s = s.next) {
    const v = s.memoizedState;
    if (v && typeof v === "object" && v.current && typeof v.current.update === "function" && "px" in v.current) { window.__gw = v.current; return; }
  }
});
const cdp = await ctx.newCDPSession(page);
await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 });
const SPOTS = { plaza: [33, 25], cemetery: [18, 23], casino: [45, 27], smithy: [52, 28] };
const out = {};
for (const [n, [x, y]] of Object.entries(SPOTS)) {
  await page.evaluate(([x, y]) => { const g = window.__gw; g.mode = "play"; g.worldMs = 21 * 60 * 1000; if (g.mapId !== "town") g.enterTown(); g.px = x * 16 + 8; g.py = y * 16 + 8; }, [x, y]);
  await page.waitForTimeout(1500);
  out[n] = await page.evaluate(() => new Promise((res) => { let n = 0; const t0 = performance.now(); const f = () => { n++; if (performance.now() - t0 < 4000) requestAnimationFrame(f); else res(Math.round((n / (performance.now() - t0)) * 10000) / 10); }; requestAnimationFrame(f); }));
}
console.log(JSON.stringify({ label: process.argv[3] ?? "", fps: out }));
await browser.close();
