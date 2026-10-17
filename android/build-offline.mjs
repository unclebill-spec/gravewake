#!/usr/bin/env node
/**
 * playtest2b (Play Store prep): bundle Gravewake OFFLINE into android/www, ready for `cap sync android`.
 *
 *   node build-offline.mjs            (from android/; Node 22)
 *
 * What it does: (1) runs the normal production build of the game at the site root (base "/", which is what Capacitor serves:
 * https://localhost/), (2) renders the app shell (index.html) the way every Pages build does (vite preview, then fetch "/"),
 * (3) copies the static output into www/, dropping what an installed app does not need or must not carry: the service worker
 * (the app is its own offline cache; a worker would only duplicate it), the social-card images, the web install tutorial and
 * the platform-only manifest link (that file is served by a web host, not shipped), and (4) writes www/BUNDLE.json (file count,
 * bytes, a content hash) so the bundle is easy to compare. Nothing is fetched from the network at run time: check-offline.mjs
 * proves it. The live site and the Pages build are untouched (this never sets GRAVEWAKE_BASE).
 */
import { spawn, spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { dirname, join, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");
const www = join(here, "www");
const PORT = Number(process.env.GW_BUNDLE_PORT || 4391);
const npm = process.platform === "win32" ? "npm.cmd" : "npm";

if (Number(process.versions.node.split(".")[0]) < 22) throw new Error("Node 22 or newer is required (HANDOFF.md: Run it)");

// 1. the production build at the site root (never the /gravewake/ Pages base)
const env = { ...process.env };
delete env.GRAVEWAKE_BASE;
const b = spawnSync(npm, ["run", "build"], { cwd: root, env, stdio: "inherit" });
if (b.status !== 0) throw new Error("npm run build failed");
const staticDir = join(root, ".vercel", "output", "static");
if (!existsSync(join(staticDir, "assets"))) throw new Error(`no build output at ${staticDir}`);

// 2. the app shell, rendered by the preview server
async function shell() {
  const srv = spawn(npm, ["run", "preview", "--", "--port", String(PORT), "--strictPort"], { cwd: root, env, stdio: "ignore", detached: true });
  try {
    for (let i = 0; i < 120; i++) {
      try {
        const r = await fetch(`http://127.0.0.1:${PORT}/`);
        if (r.ok) return await r.text();
      } catch {
        /* not up yet */
      }
      await new Promise((r) => setTimeout(r, 500));
    }
    throw new Error("preview server did not answer");
  } finally {
    try {
      process.kill(-srv.pid);
    } catch {
      srv.kill();
    }
  }
}
let html = await shell();
if (!html.includes('data-testid="title"')) throw new Error("the rendered shell has no title screen");
// the platform manifest is a web-host route, not a shipped file
html = html.replace(/<link rel="manifest" href="\/__grok\/manifest\.webmanifest"\/>/, "");

// 3. www/
rmSync(www, { recursive: true, force: true });
mkdirSync(www, { recursive: true });
const SKIP = [/^sw\.js$/, /^og\.jpg$/, /^x-banner\.jpg$/, /^__grok\/install(\/|$)/];
const rel = (p) => relative(staticDir, p).split(sep).join("/");
cpSync(staticDir, www, { recursive: true, filter: (src) => !SKIP.some((re) => re.test(rel(src))) });
writeFileSync(join(www, "index.html"), html);

// 4. BUNDLE.json
const files = [];
(function walk(d) {
  for (const n of readdirSync(d).sort()) {
    const p = join(d, n);
    if (statSync(p).isDirectory()) walk(p);
    else if (n !== "BUNDLE.json") files.push(p);
  }
})(www);
const h = createHash("sha256");
let bytes = 0;
for (const f of files) {
  const buf = readFileSync(f);
  bytes += buf.length;
  h.update(rel2(f)).update("\0").update(createHash("sha256").update(buf).digest());
}
function rel2(p) {
  return relative(www, p).split(sep).join("/");
}
const info = { files: files.length, bytes, sha256: h.digest("hex").slice(0, 16), webDir: "www", base: "/", serviceWorker: false };
writeFileSync(join(www, "BUNDLE.json"), JSON.stringify(info, null, 2) + "\n");
console.log(`offline bundle: ${info.files} files, ${(bytes / 1048576).toFixed(1)} MB, ${info.sha256} -> ${www}`);
