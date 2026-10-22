// Wake batch headless phone run + screenshots (based on qa/gfx3/gfx3.mjs's setup: the __gw game handle off the canvas fiber).
// Usage: node shots.mjs <url> <outdir> <scenes,comma> ; scenes: town, mulch, mini, bolt, hollow, wake
import { chromium } from "/workspace/gravewake/gh-repo/node_modules/playwright/index.mjs";
import { mkdirSync, writeFileSync } from "node:fs";
const url = process.argv[2] ?? "http://127.0.0.1:8093/";
const OUT = process.argv[3] ?? "/workspace/gravewake/shots/wake";
const scenes = (process.argv[4] ?? "town").split(",");
mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch();
const desk = process.env.GW_DESK === "1";
const ctx = await browser.newContext(desk ? { viewport: { width: 960, height: 540 }, deviceScaleFactor: 1 } : { viewport: { width: 844, height: 390 }, deviceScaleFactor: 1, hasTouch: true, isMobile: true });
const page = await ctx.newPage();
const errors = [];
page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
page.on("pageerror", (e) => errors.push(String(e)));
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
const ev = (fn, arg) => page.evaluate(fn, arg);
const res = { scenes: {} };
// a real walk on the phone: hold the D key equivalent through the touch stick is flaky headless; use the keyboard
{ const a = await ev(() => [window.__gw.px, window.__gw.py]); await page.keyboard.down("KeyD"); await page.waitForTimeout(700); await page.keyboard.up("KeyD"); const b = await ev(() => [window.__gw.px, window.__gw.py]); res.walked = Math.hypot(b[0] - a[0], b[1] - a[1]); }
const shot = async (n) => { const p = `${OUT}/${n}.png`; await page.screenshot({ path: p }); return p; };
const SETUPS = globalThis.WAKE_SETUPS ?? {};
for (const sc of scenes) {
  try {
    if (sc === "town") { await page.waitForTimeout(400); res.scenes.town = await shot("town"); continue; }
    const mod = await import(`./scene_${sc}.mjs`);
    res.scenes[sc] = await mod.default({ page, ev, shot });
  } catch (e) { res.scenes[sc] = `ERR ${e}`; }
}
res.errors = errors;
writeFileSync(`${OUT}/run.json`, JSON.stringify(res, null, 1));
console.log(JSON.stringify(res, null, 1));
await browser.close();
