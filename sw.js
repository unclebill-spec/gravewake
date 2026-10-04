/* Gravewake service worker (install1). Generated at build time by scripts/gravewake-sw-plugin.mjs. */
const VERSION = "3e42ddcc2c41aed2";
const PREFIX = "gravewake-";
const CACHE = PREFIX + VERSION;
const PRECACHE = ["./","__grok/icon-180.png","art/brileta/CREDITS.txt","art/brileta/trees.png","art/held/HELD.txt","art/held/trees.png","art/icons/gravewake-192.png","art/icons/gravewake-512-maskable.png","art/icons/gravewake-512.png","art/spells/fx/cast-fire.png","art/spells/fx/cast-holy.png","art/spells/fx/cast-ice.png","art/spells/fx/cast-lightning.png","art/spells/fx/cast-shadow.png","art/spells/fx/cast-venom.png","art/spells/fx/impact-fire.png","art/spells/fx/impact-holy.png","art/spells/fx/impact-ice.png","art/spells/fx/impact-lightning.png","art/spells/fx/impact-shadow.png","art/spells/fx/impact-venom.png","art/spells/fx/preview-playtest1h.png","art/spells/fx/shock-fire.png","art/spells/fx/shock-holy.png","art/spells/fx/shock-ice.png","art/spells/fx/shock-lightning.png","art/spells/fx/shock-shadow.png","art/spells/fx/shock-venom.png","art/spells/fx/whirl.png","art/spells/gen/beam-fire.png","art/spells/gen/beam-holy.png","art/spells/gen/beam-ice.png","art/spells/gen/beam-lightning.png","art/spells/gen/beam-shadow.png","art/spells/gen/beam-venom.png","art/spells/gen/cone.png","art/spells/gen/fire-rain.png","art/spells/gen/fire.png","art/spells/gen/holy.png","art/spells/gen/ice-rain.png","art/spells/gen/ice.png","art/spells/gen/lightning.png","art/spells/gen/nova.png","art/spells/gen/orb.png","art/spells/gen/ring.png","art/spells/gen/shadow.png","art/spells/gen/venom.png","art/sprites/ORDER.txt","art/sprites/allies-dirs.png","art/sprites/allies.png","art/sprites/escort-down.png","art/sprites/foes-dirs.png","art/sprites/foes-dirs_em.png","art/sprites/foes.png","art/sprites/foes_em.png","art/sprites/folk-variants-dirs.png","art/sprites/folk-variants.png","art/sprites/krampus-dirs.png","art/sprites/krampus-dirs_em.png","art/sprites/krampus.png","art/sprites/krampus_em.png","art/sprites/mimic-dirs.png","art/sprites/mimic.png","art/sprites/moves-dirs.png","art/sprites/moves.png","art/sprites/people-dirs.png","art/sprites/people.png","art/sprites/portraits.png","art/sprites/pumpkin-lord-dirs.png","art/sprites/pumpkin-lord-dirs_em.png","art/sprites/pumpkin-lord.png","art/sprites/pumpkin-lord_em.png","art/writer/CREDITS.txt","art/writer/border-dither.png","art/writer/boss-plaque.png","art/writer/bounty.png","art/writer/brick-blackroot.png","art/writer/brick-carrion.png","art/writer/brick-cave.png","art/writer/brick-chapel.png","art/writer/brick-drowned.png","art/writer/brick-grave.png","art/writer/brick-harrow.png","art/writer/brick-hearth.png","art/writer/brick-ossuary.png","art/writer/brick-vesper.png","art/writer/brick-warren.png","art/writer/brick-wick.png","art/writer/brick-wraps.png","art/writer/camp-dirt.png","art/writer/camp-fire.png","art/writer/camp-fire_em.png","art/writer/camp-gear.png","art/writer/camp-gear_em.png","art/writer/camp-grass.png","art/writer/camp-icon.png","art/writer/camp-tent.png","art/writer/camp-tent_em.png","art/writer/captive.png","art/writer/cave-liquid-blackroot.png","art/writer/cave-liquid-carrion.png","art/writer/cave-liquid-cave.png","art/writer/cave-liquid-chapel.png","art/writer/cave-liquid-drowned.png","art/writer/cave-liquid-grave.png","art/writer/cave-liquid-harrow.png","art/writer/cave-liquid-hearth.png","art/writer/cave-liquid-ossuary.png","art/writer/cave-liquid-vesper.png","art/writer/cave-liquid-warren.png","art/writer/cave-liquid-wick.png","art/writer/cave-liquid-wraps.png","art/writer/cave-ore.png","art/writer/croft-decor.png","art/writer/decal-blackroot.png","art/writer/decal-carrion.png","art/writer/decal-cave.png","art/writer/decal-chapel.png","art/writer/decal-drowned.png","art/writer/decal-grave.png","art/writer/decal-harrow.png","art/writer/decal-hearth.png","art/writer/decal-ossuary.png","art/writer/decal-vesper.png","art/writer/decal-warren.png","art/writer/decal-wick.png","art/writer/decal-wraps.png","art/writer/derby-trophy.png","art/writer/feat-blackroot.png","art/writer/feat-carrion.png","art/writer/feat-cave.png","art/writer/feat-chapel.png","art/writer/feat-drowned.png","art/writer/feat-fire.png","art/writer/feat-glyphs.png","art/writer/feat-grave.png","art/writer/feat-harrow.png","art/writer/feat-hearth.png","art/writer/feat-ossuary.png","art/writer/feat-vesper.png","art/writer/feat-warren.png","art/writer/feat-wick.png","art/writer/feat-wraps.png","art/writer/festival-props.png","art/writer/festival-props2.png","art/writer/flood.png","art/writer/floor-blackroot.png","art/writer/floor-carrion.png","art/writer/floor-cave.png","art/writer/floor-chapel.png","art/writer/floor-drowned.png","art/writer/floor-grave.png","art/writer/floor-harrow.png","art/writer/floor-hearth.png","art/writer/floor-ossuary.png","art/writer/floor-vesper.png","art/writer/floor-warren.png","art/writer/floor-wick.png","art/writer/floor-wraps.png","art/writer/font-small.png","art/writer/grave-dug.png","art/writer/lamp.png","art/writer/loot.png","art/writer/mimic-sleep.png","art/writer/pit-blackroot.png","art/writer/pit-carrion.png","art/writer/pit-cave.png","art/writer/pit-chapel.png","art/writer/pit-drowned.png","art/writer/pit-grave.png","art/writer/pit-harrow.png","art/writer/pit-hearth.png","art/writer/pit-ossuary.png","art/writer/pit-vesper.png","art/writer/pit-warren.png","art/writer/pit-wick.png","art/writer/pit-wraps.png","art/writer/portal-realm.png","art/writer/portal-rift.png","art/writer/portal-teleport.png","art/writer/preview-playtest1h.png","art/writer/preview-playtest1i.png","art/writer/prop-bones.png","art/writer/prop-chest.png","art/writer/prop-mimic-lid.png","art/writer/room-boards.png","art/writer/room-fire.png","art/writer/room-floor-cabin.png","art/writer/room-floor-slate.png","art/writer/room-floor-stone.png","art/writer/room-floor-warm.png","art/writer/room-floor.png","art/writer/room-furn.png","art/writer/room-furn_em.png","art/writer/room-kit.png","art/writer/room-kit_em.png","art/writer/room-oil.png","art/writer/room-props.png","art/writer/room-props_em.png","art/writer/room-rug.png","art/writer/room-rugs.png","art/writer/room-wall-cabin.png","art/writer/room-wall-cabin_em.png","art/writer/room-wall-slate.png","art/writer/room-wall-slate_em.png","art/writer/room-wall-stone.png","art/writer/room-wall-stone_em.png","art/writer/room-wall-warm.png","art/writer/room-wall-warm_em.png","art/writer/room-wall.png","art/writer/room-wall_em.png","art/writer/season-autumn-camp-grass.png","art/writer/season-autumn-town-grass.png","art/writer/season-autumn-town-trees.png","art/writer/season-autumn-trees.png","art/writer/season-autumn-vale.png","art/writer/season-spring-camp-grass.png","art/writer/season-spring-town-grass.png","art/writer/season-spring-town-trees.png","art/writer/season-spring-trees.png","art/writer/season-spring-vale.png","art/writer/season-summer-camp-grass.png","art/writer/season-summer-town-grass.png","art/writer/season-summer-town-trees.png","art/writer/season-summer-trees.png","art/writer/season-summer-vale.png","art/writer/season-winter-camp-grass.png","art/writer/season-winter-town-grass.png","art/writer/season-winter-town-trees.png","art/writer/season-winter-trees.png","art/writer/season-winter-vale.png","art/writer/swamp-path.png","art/writer/town-cabin.png","art/writer/town-cabin_em.png","art/writer/town-cobble.png","art/writer/town-dirt.png","art/writer/town-fence.png","art/writer/town-grass.png","art/writer/town-house-slate.png","art/writer/town-house-slate_em.png","art/writer/town-house-stone.png","art/writer/town-house-stone_em.png","art/writer/town-house-warm.png","art/writer/town-house-warm_em.png","art/writer/town-icon.png","art/writer/town-icon_em.png","art/writer/town-map-icon.png","art/writer/town-pool.png","art/writer/town-signs.png","art/writer/town-signs_em.png","art/writer/trail-ash.png","art/writer/trail-sand.png","art/writer/trail-snow.png","art/writer/trail-vale.png","art/writer/trap.png","art/writer/vale-road.png","art/writer/vale.png","art/writer/wall-blackroot.png","art/writer/wall-carrion.png","art/writer/wall-cave.png","art/writer/wall-chapel.png","art/writer/wall-drowned.png","art/writer/wall-grave.png","art/writer/wall-harrow.png","art/writer/wall-hearth.png","art/writer/wall-ossuary.png","art/writer/wall-vesper.png","art/writer/wall-warren.png","art/writer/wall-wick.png","art/writer/wall-wraps.png","art/writer/water.png","art/writer/wayrift-icon.png","art/writer/wayrift.png","art/writer/wayrift_em.png","art/writer/wild-ash.png","art/writer/wild-border-rim.png","art/writer/wild-border.png","art/writer/wild-boss-aura.png","art/writer/wild-boss-aura_em.png","art/writer/wild-deadwood.png","art/writer/wild-deadwood_em.png","art/writer/wild-entrances.png","art/writer/wild-entrances_em.png","art/writer/wild-flecks.png","art/writer/wild-graves.png","art/writer/wild-graves_em.png","art/writer/wild-ice.png","art/writer/wild-opened-grave.png","art/writer/wild-opened-grave_em.png","art/writer/wild-pumpkin-big.png","art/writer/wild-pumpkin-big_em.png","art/writer/wild-pumpkin-small.png","art/writer/wild-pumpkin-small_em.png","art/writer/wild-rocks.png","art/writer/wild-rocks_em.png","art/writer/wild-sand.png","art/writer/wild-shore.png","art/writer/wild-snow.png","art/writer/wild-stairs-themes.png","art/writer/wild-stairs.png","art/writer/wild-swamp.png","art/writer/wild-trees-autumn.png","art/writer/wild-trees-autumn_em.png","art/writer/wild-trees-spring.png","art/writer/wild-trees-spring_em.png","art/writer/wild-trees-summer.png","art/writer/wild-trees-summer_em.png","art/writer/wild-trees-winter.png","art/writer/wild-trees-winter_em.png","art/writer/wild-water-town.png","art/writer/wild-water.png","assets/index-D8LZ77Jk.js","assets/routes-9HdVcu2M.js","assets/styles-CXBvrE_o.css","favicon.svg","gravewake.webmanifest"];
const PASS = new RegExp("^(api/|auth/|_serverFn|__grok/manifest)");
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
  if (res.ok && res.type === "basic" && /^(assets|art)\//.test(path)) await cache.put(request, res.clone());
  return res;
}

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (!inScope(url) || PASS.test(local(url)) || url.searchParams.has("install")) return;
  event.respondWith(request.mode === "navigate" ? page(request) : file(request));
});
