#!/usr/bin/env node
/**
 * playtest2b: proves the offline bundle (android/www) needs no network. Serves www/ on 127.0.0.1, opens it on the Phone preset
 * with every request to any other host ABORTED and recorded, starts a life, and fails on: an outside request, a failed or 404
 * local request, a page error, a console error, a service worker registration, or a missing title / canvas.
 *   node check-offline.mjs      (after node build-offline.mjs; needs the game's playwright: ../node_modules)
 */
import { createServer } from "node:http";
import { existsSync, readFileSync, statSync } from "node:fs";
import { dirname, extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const here = dirname(fileURLToPath(import.meta.url));
const www = join(here, "www");
const { chromium } = createRequire(join(here, "..", "package.json"))("playwright");
const TYPES = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".png": "image/png", ".svg": "image/svg+xml", ".json": "application/json", ".webmanifest": "application/manifest+json", ".jpg": "image/jpeg" };
if (!existsSync(join(www, "index.html"))) throw new Error("run node build-offline.mjs first");

const srv = createServer((req, res) => {
  const p = normalize(decodeURIComponent((req.url || "/").split("?")[0])).replace(/^(\.\.[/\\])+/, "");
  let f = join(www, p === "/" || p === "\\" ? "index.html" : p);
  if (!existsSync(f) || statSync(f).isDirectory()) { res.statusCode = 404; res.end("not found"); return; }
  res.setHeader("content-type", TYPES[extname(f)] || "application/octet-stream");
  res.end(readFileSync(f));
});
await new Promise((r) => srv.listen(0, "127.0.0.1", r));
const origin = `http://127.0.0.1:${srv.address().port}`;
const problems = [];
const browser = await chromium.launch();
try {
  const ctx = await browser.newContext({ viewport: { width: 844, height: 390 }, hasTouch: true, isMobile: true, serviceWorkers: "allow" });
  await ctx.addInitScript(() => { window.Capacitor = { isNativePlatform: () => true }; }); // what the Android app injects
  await ctx.route("**/*", (route) => {
    const u = route.request().url();
    if (u.startsWith(origin) || u.startsWith("data:") || u.startsWith("blob:")) return route.continue();
    problems.push(`outside request: ${u}`);
    return route.abort();
  });
  const page = await ctx.newPage();
  page.on("pageerror", (e) => problems.push(`page error: ${e}`));
  page.on("console", (m) => m.type() === "error" && problems.push(`console error: ${m.text()}`));
  page.on("response", (r) => r.status() >= 400 && problems.push(`HTTP ${r.status()}: ${r.url()}`));
  page.on("requestfailed", (r) => problems.push(`request failed: ${r.url()}`));
  await page.goto(origin + "/", { waitUntil: "domcontentloaded" });
  await page.waitForSelector('[data-testid="title"]', { timeout: 30000 });
  await page.waitForFunction(() => window.__screenTest?.ready?.(), null, { timeout: 120000 });
  await page.getByRole("button", { name: "Wake in town" }).click();
  await page.waitForTimeout(2500);
  const canvas = await page.$('canvas[data-testid="game-canvas"]');
  if (!canvas) problems.push("no game canvas after Wake in town");
  const sw = await page.evaluate(async () => (navigator.serviceWorker ? (await navigator.serviceWorker.getRegistrations()).length : 0));
  if (sw !== 0) problems.push(`a service worker registered (${sw})`);
} finally {
  await browser.close();
  srv.close();
}
if (problems.length) { console.error(problems.join("\n")); console.error(`OFFLINE CHECK FAILED (${problems.length})`); process.exit(1); }
console.log("OFFLINE CHECK OK: title, new life and canvas with every outside request blocked; 0 outside, 0 failed, 0 errors, no service worker");
