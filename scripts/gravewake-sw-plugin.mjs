/**
 * install1 (OWNER-APPROVED 2026-10-01 22:14 ET): the offline service worker, written at build time.
 *
 * The client build emits `sw.js` next to index.html. It precaches the built assets (hashed JS/CSS) and the public
 * art, in a cache named for a hash of every precached file, so each republish installs a fresh cache and the old
 * ones are deleted. index.html is network-first (a republish is picked up on the next launch); everything else is
 * cache-first from that versioned cache. skipWaiting + clients.claim: a new build takes over at once.
 * Not used in dev (the page only registers it in a production build, on https or localhost).
 */
import { createHash } from "node:crypto";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";

/** Public files that are not part of the game (social cards, the platform's install tutorial). */
export const SW_SKIP_PUBLIC = [/^__grok\/install\//, /^og\.jpg$/, /^x-banner\.jpg$/, /^sw\.js$/, /(^|\/)\./];
/** Never answered by the worker: server routes, auth, the platform manifest, the install tutorial. */
export const SW_PASS = "^(api/|auth/|_serverFn|__grok/manifest)";

export function listPublic(dir) {
  if (!dir || !existsSync(dir)) return [];
  const out = [];
  const walk = (d) => {
    for (const name of readdirSync(d).sort()) {
      const p = join(d, name);
      if (statSync(p).isDirectory()) walk(p);
      else out.push(relative(dir, p).split(sep).join("/"));
    }
  };
  walk(dir);
  return out.filter((f) => !SW_SKIP_PUBLIC.some((re) => re.test(f)));
}

/** The cache version: a hash over every precached file's name and bytes. */
export function swVersion(files) {
  const h = createHash("sha256");
  for (const [name, bytes] of [...files].sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))) {
    h.update(name);
    h.update("\0");
    h.update(createHash("sha256").update(bytes).digest());
  }
  return h.digest("hex").slice(0, 16);
}

/** The worker's source. `urls` are relative to the worker's scope; "./" (the page) is always first. */
export function swSource(version, urls) {
  const list = ["./", ...urls.filter((u) => u !== "./")];
  return `/* Gravewake service worker (install1). Generated at build time by scripts/gravewake-sw-plugin.mjs. */
const VERSION = ${JSON.stringify(version)};
const PREFIX = "gravewake-";
const CACHE = PREFIX + VERSION;
const PRECACHE = ${JSON.stringify(list)};
const PASS = new RegExp(${JSON.stringify(SW_PASS)});
const scope = () => self.registration.scope;
const inScope = (url) => url.origin === self.location.origin && url.href.startsWith(scope());
const local = (url) => url.href.slice(scope().length).split("#")[0];

self.addEventListener("install", (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    await Promise.all(PRECACHE.map(async (u) => {
      const url = new URL(u, scope()).href;
      try {
        const res = await fetch(new Request(url, { cache: "reload" }));
        if (res.ok) await cache.put(url, res);
      } catch (_e) { /* offline during install: the file is fetched (and kept) on first use */ }
    }));
    await self.skipWaiting();
  })());
});

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    for (const key of await caches.keys()) if (key.startsWith(PREFIX) && key !== CACHE) await caches.delete(key);
    await self.clients.claim();
  })());
});

async function page(request) {
  const cache = await caches.open(CACHE);
  const home = new URL("./", scope()).href;
  const net = fetch(request).then(async (res) => {
    const path = local(new URL(request.url)).split("?")[0];
    if (res.ok && (path === "" || path === "index.html")) await cache.put(home, res.clone());
    return res;
  });
  try {
    // Network first, so a republished build is what opens; a dead or stalled network falls back after 4 s.
    return await Promise.race([net, new Promise((_ok, no) => setTimeout(() => no(new Error("slow")), 4000))]);
  } catch (_e) {
    const hit = (await cache.match(request, { ignoreSearch: true })) || (await cache.match(home));
    return hit || net;
  }
}

async function file(request) {
  const cache = await caches.open(CACHE);
  const hit = await cache.match(request, { ignoreSearch: true });
  if (hit) return hit;
  const res = await fetch(request);
  const path = local(new URL(request.url));
  if (res.ok && res.type === "basic" && /^(assets|art)\\//.test(path)) await cache.put(request, res.clone());
  return res;
}

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (!inScope(url) || PASS.test(local(url)) || url.searchParams.has("install")) return;
  event.respondWith(request.mode === "navigate" ? page(request) : file(request));
});
`;
}

/** The Vite plugin: client build only. */
export function gravewakeSwPlugin() {
  let publicDir = "";
  return {
    name: "gravewake:service-worker",
    apply: "build",
    applyToEnvironment: (env) => env.name === "client",
    configResolved(config) {
      publicDir = config.publicDir;
    },
    generateBundle(_options, bundle) {
      const files = [];
      for (const [name, out] of Object.entries(bundle)) {
        if (name.startsWith(".") || name.endsWith(".map") || name === "sw.js") continue;
        files.push([name, out.type === "chunk" ? out.code : out.source]);
      }
      for (const f of listPublic(publicDir)) files.push([f, readFileSync(join(publicDir, f))]);
      const version = swVersion(files);
      this.emitFile({ type: "asset", fileName: "sw.js", source: swSource(version, files.map(([n]) => n).sort()) });
    },
  };
}
