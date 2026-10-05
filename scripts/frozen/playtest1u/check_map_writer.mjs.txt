// Unit-style checks for the map writer. Run from the game root: node tools/map-writer/check_map_writer.mjs
// Core group: determinism, connectivity, room tagging, phase-2 biome blending and the biome slot. Game-agnostic codes.
// gravewake group: the game's own secret, trap, captive, and mimic placement on the writer's grid.
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { load } from "./bundle.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const SEEDS = Number(process.env.MAP_SEEDS ?? 300);
let pass = 0;
let fail = 0;
function check(group, text, ok, detail = "") {
  if (ok) pass++;
  else fail++;
  console.log(`${ok ? "PASS" : "FAIL"} [${group}] ${text}${detail ? ` (${detail})` : ""}`);
}

const entry = 'export * from "./map_writer";\nexport * from "./gravewake";\nexport * from "./gravewake_vale";\nexport { RESCUES, DUNGEONS } from "../../src/game/content";\nexport { captiveFloor } from "../../src/game/runs";\n';
const A = await load(entry, here);
const B = await load(entry, here);
const C = { wall: 1, floor: 2, stairUp: 3, stairDown: 4, chest: 5, exit: 6 };
const roster = [{ id: "a" }, { id: "b", weight: 2 }, { id: "c" }];
const dun = (M, seed, extra = {}) => M.writeDungeon({ seed, codes: C, roster, level: 17, down: true, ...extra });
const rift = (M, seed, extra = {}) => M.writeRift({ seed, codes: C, roster, level: 9, ...extra });
const sig = (m) => createHash("md5").update(JSON.stringify(A.toJSON(m))).digest("hex");

// ---- Determinism ----
{
  let same = 0;
  let sameRift = 0;
  const tileHashes = new Set();
  const riftHashes = new Set();
  for (let s = 0; s < 40; s++) {
    if (sig(dun(A, s)) === sig(dun(A, s)) && sig(dun(A, s)) === sig(dun(B, s))) same++;
    if (sig(rift(A, s)) === sig(rift(A, s)) && sig(rift(A, s)) === sig(rift(B, s))) sameRift++;
    tileHashes.add(createHash("md5").update(dun(A, s).tiles).digest("hex"));
    riftHashes.add(createHash("md5").update(rift(A, s).tiles).digest("hex"));
  }
  check("core", "same seed, same dungeon: 40 seeds, twice in one module and once in a fresh module, identical tiles, rooms, foes", same === 40, `${same}/40`);
  check("core", "same seed, same rift: 40 seeds, identical in both modules", sameRift === 40, `${sameRift}/40`);
  check("core", "string seeds are stable too", sig(dun(A, "harrow:gen")) === sig(dun(B, "harrow:gen")) && sig(rift(A, "rift@12,30")) === sig(rift(B, "rift@12,30")));
  check("core", "different seeds give different maps (40 seeds, at least 39 distinct dungeons and rifts)", tileHashes.size >= 39 && riftHashes.size >= 39, `${tileHashes.size} / ${riftHashes.size}`);
  check("core", "the floor number changes the map; the same floor does not", sig(dun(A, 7, { floor: 1 })) !== sig(dun(A, 7, { floor: 2 })) && sig(dun(A, 7, { floor: 2 })) === sig(dun(B, 7, { floor: 2 })));
  check("core", "riftSeed: one overworld spot always gives one seed; a neighbour gives another; an epoch rerolls it and the same epoch does not", A.riftSeed(5, 12, 30) === B.riftSeed(5, 12, 30) && A.riftSeed(5, 12, 30) !== A.riftSeed(5, 13, 30) && A.riftSeed(5, 12, 30, 3) === B.riftSeed(5, 12, 30, 3) && A.riftSeed(5, 12, 30, 3) !== A.riftSeed(5, 12, 30, 4) && A.riftSeed(5, 12, 30, 0) !== A.riftSeed(5, 12, 30));
  const realRandom = Math.random;
  const realNow = Date.now;
  let threw = "";
  Math.random = () => {
    throw new Error("Math.random called");
  };
  Date.now = () => {
    throw new Error("Date.now called");
  };
  try {
    for (let s = 0; s < 20; s++) {
      dun(A, s);
      rift(A, s);
      dun(A, s, { biome: { names: ["a", "b"], weights: (x) => [x < 20 ? 1 : 0, x < 20 ? 0 : 1] } });
      A.valeSkin(new Uint8Array(64 * 60), 64, 60, s);
    }
  } catch (e) {
    threw = String(e.message);
  } finally {
    Math.random = realRandom;
    Date.now = realNow;
  }
  check("core", "no Math.random and no clock: generation runs with both trapped to throw", threw === "", threw);
  const code = readFileSync(join(here, "map_writer.ts"), "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\/\/.*$/gm, "");
  const vale = readFileSync(join(here, "gravewake_vale.ts"), "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\/\/.*$/gm, "");
  check("core", "map_writer.ts and gravewake_vale.ts code (comments stripped) never names Math.random, Date, or performance", !/Math\.random|Date\b|performance\./.test(code) && !/Math\.random|Date\b|performance\./.test(vale));
}

// ---- Connectivity and tagging ----
const walkD = (t) => t === C.floor || t === C.stairUp || t === C.stairDown;
const inRoom = (r, x, y) => x >= r.x && y >= r.y && x < r.x + r.w && y < r.y + r.h;
{
  const bad = { reach: [], tags: [], border: [], foes: [] };
  let roomsSeen = 0;
  for (let s = 0; s < SEEDS; s++) {
    const m = dun(A, s);
    const { w, h, tiles } = m;
    const d = A.stepsFrom(tiles, w, h, m.stairs.up.x, m.stairs.up.y, walkD);
    const at = (p) => d[p.y * w + p.x] >= 0;
    let ok = true;
    for (const r of m.rooms) {
      roomsSeen++;
      for (let y = r.y; y < r.y + r.h; y++) for (let x = r.x; x < r.x + r.w; x++) if (tiles[y * w + x] !== C.chest && d[y * w + x] < 0) ok = false;
    }
    for (let i = 0; i < tiles.length; i++) if (walkD(tiles[i]) && d[i] < 0) ok = false;
    const chestNear = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => d[(m.vaultChest.y + dy) * w + m.vaultChest.x + dx] >= 0);
    if (!ok || !at(m.stairs.down) || !at(m.bossSpot) || !chestNear || !m.foes.every(at)) bad.reach.push(s);
    for (let x = 0; x < w; x++) if (tiles[x] !== C.wall || tiles[(h - 1) * w + x] !== C.wall) bad.border.push(s);
    for (let y = 0; y < h; y++) if (tiles[y * w] !== C.wall || tiles[y * w + w - 1] !== C.wall) bad.border.push(s);
    const by = (t) => m.rooms.filter((r) => r.tag === t);
    const [st, bo, va] = [by("start"), by("boss"), by("vault")];
    const tagOk =
      st.length === 1 &&
      bo.length === 1 &&
      va.length === 1 &&
      m.rooms.length >= 3 &&
      inRoom(st[0], m.stairs.up.x, m.stairs.up.y) &&
      inRoom(bo[0], m.bossSpot.x, m.bossSpot.y) &&
      inRoom(bo[0], m.stairs.down.x, m.stairs.down.y) &&
      inRoom(va[0], m.vaultChest.x, m.vaultChest.y) &&
      tiles[m.vaultChest.y * w + m.vaultChest.x] === C.chest &&
      tiles.filter((t) => t === C.chest).length === 1 &&
      tiles.filter((t) => t === C.stairUp).length === 1 &&
      tiles.filter((t) => t === C.stairDown).length === 1 &&
      m.rooms.every((r) => r.tag === "boss" || r.depth <= bo[0].depth) &&
      m.rooms.every((r) => r.depth === d[r.center.y * w + r.center.x]);
    if (!tagOk) bad.tags.push(s);
    const plain = new Set(m.rooms.filter((r) => r.tag === "room").map((r) => r.id));
    const foeOk =
      m.foes.length > 0 &&
      m.foes.every((f) => plain.has(f.room) && inRoom(m.rooms[f.room], f.x, f.y) && tiles[f.y * w + f.x] === C.floor && f.level === 17 && roster.some((r) => r.id === f.id)) &&
      new Set(m.foes.map((f) => f.y * w + f.x)).size === m.foes.length &&
      m.spawns.length === m.foes.length + 1 &&
      m.spawns.includes(m.bossSpot.y * w + m.bossSpot.x);
    if (!foeOk) bad.foes.push(s);
  }
  check("core", `connectivity: in ${SEEDS} dungeons every room tile, every walkable tile, both stairs, the boss spot, every foe, and the vault chest's side are reachable from the up stair`, !bad.reach.length, bad.reach.slice(0, 5).join(","));
  check("core", `tagging: in ${SEEDS} dungeons exactly one start (holds the up stair), one boss (the deepest room by walking steps; holds the boss spot and the down stair), one vault (holds the one chest)`, !bad.tags.length, bad.tags.slice(0, 5).join(","));
  check("core", "the map edge is solid wall on every dungeon", !bad.border.length, bad.border.slice(0, 5).join(","));
  check("core", "foes: only in plain rooms, on floor, one per tile, from the roster, level passed through untouched; spawns = foes + boss spot", !bad.foes.length, `${bad.foes.slice(0, 5).join(",")} rooms seen ${roomsSeen}`);
}
{
  const bad = [];
  for (let s = 0; s < SEEDS; s++) {
    const m = rift(A, s);
    const { w, h, tiles } = m;
    const d = A.stepsFrom(tiles, w, h, m.arrive.x, m.arrive.y, (t) => t === C.floor || t === C.exit);
    let ok = tiles[m.exit.y * w + m.exit.x] === C.exit && Math.abs(m.exit.x - m.arrive.x) + Math.abs(m.exit.y - m.arrive.y) === 1 && tiles[m.arrive.y * w + m.arrive.x] === C.floor;
    for (let i = 0; i < tiles.length; i++) if (tiles[i] !== C.wall && d[i] < 0) ok = false;
    for (let x = 0; x < w; x++) if (tiles[x] !== C.wall || tiles[(h - 1) * w + x] !== C.wall) ok = false;
    for (let y = 0; y < h; y++) if (tiles[y * w] !== C.wall || tiles[y * w + w - 1] !== C.wall) ok = false;
    ok &&= m.foes.length >= 3 && m.foes.every((f) => d[f.y * w + f.x] >= 4 && f.level === 9) && !m.bossSpot && !m.vaultChest && m.rooms.length === 1;
    ok &&= tiles.filter((t) => t === C.exit).length === 1;
    ok &&= tiles.filter((t) => t !== C.wall).length >= (w - 4) * (h - 4) * 0.4;
    if (!ok) bad.push(s);
  }
  check("core", `rift: in ${SEEDS} pockets one connected cave, one exit with the arrival tile beside it, every open tile reachable, edge solid, 3+ foes at least 4 steps out, open cave at least 40% of the interior, no boss, no vault`, !bad.length, bad.slice(0, 5).join(","));
}

{
  let tree = 0;
  let loops = 0;
  for (let s = 0; s < 60; s++) {
    const m = dun(A, s);
    if (m.corridors.length === m.rooms.length - 1 + 2) loops++;
    const t = dun(A, s, { loops: 0 });
    if (t.corridors.length === t.rooms.length - 1) tree++;
  }
  check("core", "corridors: a spanning tree plus the asked-for loops (default 2; loops 0 gives a plain tree)", loops === 60 && tree === 60, `${loops}/60, ${tree}/60`);
}

// ---- Phase 2: biome blending and the biome slot ----
{
  // A seeded random map of rectangles, as a game lays its regions: 2-5 biomes, 4-9 rects over a base.
  const rectMap = (seed) => {
    const r = A.rng32(A.subSeed(seed, "rects"));
    const w = 20 + Math.floor(r() * 50);
    const h = 16 + Math.floor(r() * 50);
    const k = 2 + Math.floor(r() * 4);
    const base = new Uint8Array(w * h);
    for (let n = 4 + Math.floor(r() * 6); n > 0; n--) {
      const x0 = Math.floor(r() * w), y0 = Math.floor(r() * h), rw = 2 + Math.floor(r() * w / 2), rh = 2 + Math.floor(r() * h / 2), b = Math.floor(r() * k);
      for (let y = y0; y < Math.min(h, y0 + rh); y++) for (let x = x0; x < Math.min(w, x0 + rw); x++) base[y * w + x] = b;
    }
    const holes = new Set();
    for (let n = Math.floor(w * h * 0.1); n > 0; n--) holes.add(Math.floor(r() * w * h));
    return { w, h, base, names: Array.from({ length: k }, (_, i) => `b${i}`), blend: (i) => !holes.has(i), holes };
  };
  let bounded = 0, same = 0, differs = 0, zero = 0, maskOk = 0, movedAny = 0;
  const bad = [];
  const N = 200;
  for (let s = 0; s < N; s++) {
    const m = rectMap(s);
    const reach = 1 + (s % 3);
    // Odd seeds pass a rank (which biome's fringe goes over which); even seeds mark every differing side.
    const rank = s % 2 ? m.names.map((_, k) => (k * 7 + s) % m.names.length) : undefined;
    const o = { seed: s, w: m.w, h: m.h, base: m.base, names: m.names, blend: m.blend, reach, scale: 3 + (s % 6), rank };
    const a = A.blendBiomes(o);
    const b = B.blendBiomes(o);
    const c = A.blendBiomes({ ...o, seed: s + 1000 });
    const z = A.blendBiomes({ ...o, reach: 0 });
    if (Buffer.from(a.biome).equals(Buffer.from(b.biome)) && Buffer.from(a.edges).equals(Buffer.from(b.edges)) && Buffer.from(a.corners).equals(Buffer.from(b.corners))) same++;
    if (!Buffer.from(a.biome).equals(Buffer.from(c.biome))) differs++;
    if (Buffer.from(z.biome).equals(Buffer.from(m.base)) && z.moved === 0) zero++;
    if (a.moved > 0) movedAny++;
    // A tile only moves if it may blend, and only to a biome lying within reach on the base map.
    let ok = true, moved = 0;
    for (let y = 0; y < m.h && ok; y++) for (let x = 0; x < m.w; x++) {
      const i = y * m.w + x;
      if (a.biome[i] === m.base[i]) continue;
      moved++;
      if (m.holes.has(i)) { ok = false; break; }
      let near = false;
      for (let dy = -reach; dy <= reach && !near; dy++) for (let dx = -reach; dx <= reach; dx++) {
        const nx = x + dx, ny = y + dy;
        if (nx >= 0 && ny >= 0 && nx < m.w && ny < m.h && m.base[ny * m.w + nx] === a.biome[i]) { near = true; break; }
      }
      if (!near) { ok = false; break; }
    }
    if (ok && moved === a.moved) bounded++;
    else bad.push(s);
    // Edge and corner bits, recomputed from the layer.
    let mk = true;
    const at = (x, y) => (x < 0 || y < 0 || x >= m.w || y >= m.h ? -1 : y * m.w + x);
    const dif = (i, j) => j >= 0 && m.blend(j) && a.biome[j] !== a.biome[i] && (!rank || rank[a.biome[j]] > rank[a.biome[i]]);
    for (let y = 0; y < m.h && mk; y++) for (let x = 0; x < m.w; x++) {
      const i = y * m.w + x;
      if (!m.blend(i)) { if (a.edges[i] || a.corners[i]) mk = false; continue; }
      const e = (dif(i, at(x, y - 1)) ? 1 : 0) | (dif(i, at(x + 1, y)) ? 2 : 0) | (dif(i, at(x, y + 1)) ? 4 : 0) | (dif(i, at(x - 1, y)) ? 8 : 0);
      const cn = (!(e & 3) && dif(i, at(x + 1, y - 1)) ? 1 : 0) | (!(e & 6) && dif(i, at(x + 1, y + 1)) ? 2 : 0) | (!(e & 12) && dif(i, at(x - 1, y + 1)) ? 4 : 0) | (!(e & 9) && dif(i, at(x - 1, y - 1)) ? 8 : 0);
      if (a.edges[i] !== e || a.corners[i] !== cn) { mk = false; break; }
    }
    if (mk) maskOk++;
  }
  check("core", `blendBiomes on ${N} seeded rectangle maps (2-5 biomes, reach 1-3, 10% of tiles not blendable): a tile only changes if it may blend, and only to a biome lying within reach on the base map; moved counts the changes`, bounded === N, bad.slice(0, 5).join(","));
  check("core", "blendBiomes is seeded: same options give the same layer, edges, and corners (two module instances); another seed gives another layer; reach 0 gives the base map back", same === N && differs >= N * 0.95 && zero === N && movedAny >= N * 0.95, `same ${same}/${N} differ ${differs}/${N} reach0 ${zero}/${N} moved ${movedAny}/${N}`);
  check("core", "blendBiomes edge and corner bits match a recompute from the layer (a blendable side neighbour of another biome, ranked higher when a rank is given; a corner only where both sides beside it are unmarked; none on tiles that may not blend)", maskOk === N, `${maskOk}/${N}`);
  // A ruled line becomes ragged: two biomes split at row 30 of 64x60.
  {
    const w = 64, h = 60;
    const base = new Uint8Array(w * h);
    for (let i = 30 * w; i < w * h; i++) base[i] = 1;
    let ragged = 0, up = 0, down = 0, worst = 0;
    for (let s = 0; s < 20; s++) {
      const r = A.blendBiomes({ seed: s, w, h, base, names: ["a", "b"] });
      for (let x = 0; x < w; x++) {
        let first = h;
        for (let y = 0; y < h; y++) if (r.biome[y * w + x] === 1) { first = y; break; }
        const off = first - 30;
        if (off) ragged++;
        if (off < 0) up++;
        if (off > 0) down++;
        let col = 0;
        for (let y = 0; y < h; y++) if (r.biome[y * w + x] !== base[y * w + x]) col = Math.max(col, Math.abs(y - (y < 30 ? 29 : 30)) + 1);
        worst = Math.max(worst, col);
      }
    }
    check("core", "a straight border comes back ragged (default reach 2, scale 6): over 20 seeds, 30%+ of columns leave the ruled line, it wanders both ways, and never past 2 tiles", ragged >= 20 * 64 * 0.3 && up >= 20 * 64 * 0.1 && down >= 20 * 64 * 0.1 && worst <= 2, `${ragged}/${20 * 64} off the line (${up} up, ${down} down), furthest ${worst}`);
  }
  // The slot on the writer's maps.
  const one = dun(A, 3, { biome: { names: ["vale"] } });
  let refused = "";
  try {
    dun(A, 3, { biome: { names: ["vale", "waste"] } });
  } catch (e) {
    refused = String(e.message);
  }
  check("core", "biome slot: one biome is accepted and fills the biome layer with 0; the tiles match a map without the slot", one.biomeNames.join() === "vale" && one.biome.length === one.w * one.h && one.biome.every((b) => b === 0) && sig({ ...one, biomeNames: ["default"] }) === sig(dun(A, 3)));
  const field = { names: ["vale", "waste", "cinder"], weights: (x, y) => [x < 16 ? 1 : 0, x >= 16 && y < 12 ? 1 : 0, x >= 16 && y >= 12 ? 1 : 0] };
  let slot = 0;
  for (let s = 0; s < 40; s++) {
    for (const [make, plain] of [[dun, dun], [rift, rift]]) {
      const m = make(A, s, { biome: field });
      const m2 = make(B, s, { biome: field });
      const p = plain(A, s);
      const plainSig = sig({ ...m, biome: p.biome, biomeNames: p.biomeNames });
      const valid = m.biome.length === m.w * m.h && m.biome.every((b) => b < 3);
      // Away from the borders (3+ tiles), the heaviest weight wins.
      let far = true;
      for (let y = 0; y < m.h; y++) for (let x = 0; x < m.w; x++) {
        const want = x < 16 ? 0 : y < 12 ? 1 : 2;
        const clear = Math.abs(x - 15.5) > 3 && (x < 16 || Math.abs(y - 11.5) > 3);
        if (clear && m.biome[y * m.w + x] !== want) far = false;
      }
      if (valid && far && plainSig === sig(p) && Buffer.from(m.biome).equals(Buffer.from(m2.biome)) && m.biome.some((b) => b === 2)) slot++;
    }
  }
  check("core", "biome slot (phase 2, replaces the old 'two biomes are refused' check): two or more names need weights (refused without); with weights the layer is the heaviest name per tile, roughed up by blendBiomes, seeded (two module instances agree), and the tiles, rooms, and foes are byte-identical to a map without the slot (dungeon and rift, 40 seeds)", /need weights/.test(refused) && slot === 80, `${refused} | ${slot}/80`);
}

// ---- Gravewake placement on the writer's grid ----
{
  const T = { wall: 3, floor: 7, stairD: 12, stairU: 13, chest: 22 };
  const codes = A.GRAVEWAKE_CODES;
  check("gravewake", "the adapter paints the game's own tile codes", codes.wall === T.wall && codes.floor === T.floor && codes.stairUp === T.stairU && codes.stairDown === T.stairD && codes.chest === T.chest);
  check("gravewake", "the roster is the dungeon floor-roamer rule: every family but bat", A.DUNGEON_ROSTER.length === 11 && !A.DUNGEON_ROSTER.some((f) => f.id === "bat"), A.DUNGEON_ROSTER.map((f) => f.id).join(" "));
  const n = Math.min(SEEDS, 80);
  const rate = { rune: 0, crack: 0, traps: 0, captive: 0, mimic: 0 };
  const broken = [];
  for (let s = 0; s < n; s++) {
    for (let floor = 1; floor <= 3; floor++) {
      const raw = A.writeDungeon({ seed: s, floor, codes, roster: A.DUNGEON_ROSTER, level: 20, down: floor < 3 });
      const { map, feats } = A.gravewakeFloor(`gen${s}`, s, floor, 3, 20);
      const { w, h, tiles } = map;
      // Placement only adds: every tile the writer laid is still there, except its rock and a chest a mimic sits on.
      let ok = true;
      for (let i = 0; i < tiles.length; i++) if (raw.tiles[i] !== T.wall && raw.tiles[i] !== tiles[i]) ok = false;
      // Traps are overlays; with every trap treated as wall, all of the writer's open tiles stay reachable.
      const trap = new Set((feats.traps ?? []).map((t) => t.y * w + t.x));
      const walk = (t) => t === T.floor || t === T.stairU || t === T.stairD;
      const up = map.stairs.up;
      const blocked = tiles.map((t, i) => (trap.has(i) ? T.wall : t));
      const d = A.stepsFrom(blocked, w, h, up.x, up.y, walk);
      for (let i = 0; i < tiles.length; i++) if (walk(raw.tiles[i]) && !trap.has(i) && d[i] < 0) ok = false;
      if (feats.captive && map.spawns.includes(feats.captive.y * w + feats.captive.x)) ok = false;
      if ((feats.traps ?? []).some((t) => map.spawns.includes(t.y * w + t.x))) ok = false;
      if (feats.mimic && tiles[feats.mimic.y * w + feats.mimic.x] !== T.chest) ok = false;
      if (!ok) broken.push(`${s}/${floor}`);
      if (floor === 2 && feats.rune) rate.rune++;
      if (floor === 1 && feats.crack) rate.crack++;
      if (floor < 3 && feats.traps?.length) rate.traps++;
      if (feats.captive) rate.captive++;
      if (feats.mimic) rate.mimic++;
    }
  }
  check("gravewake", `placeFeats, placeTraps, placeCaptive, mimicChest run on ${n} seeds x 3 floors: nothing the writer laid is overwritten, traps never cut a route or sit on a spawn, a captive never on a spawn, a mimic only on a chest`, !broken.length, broken.slice(0, 5).join(","));
  check("gravewake", "a rune vault fits on 90%+ of floor 2s, a secret wall on 90%+ of floor 1s, traps on 90%+ of non-boss floors", rate.rune >= n * 0.9 && rate.crack >= n * 0.9 && rate.traps >= n * 2 * 0.9, `rune ${rate.rune}/${n} crack ${rate.crack}/${n} traps ${rate.traps}/${n * 2} captive ${rate.captive}/${n * 3} (no RESCUES entry for a new site)`);
  check("gravewake", "with a per-seed site id, the game's own mimic roll lands on the writer's vault chest on some floors (MIMICS.chance, not a new number)", rate.mimic > 0, `${rate.mimic}/${n * 2} eligible floors`);
  // Captives belong to the sites in RESCUES. Lend each one's id to the writer's grid: the game's rule still finds a spot.
  const lent = A.RESCUES.map((r) => {
    const def = A.DUNGEONS.find((d) => d.id === r.dungeon);
    const floor = A.captiveFloor(r.dungeon, def.floors);
    let got = 0;
    for (let s = 0; s < 20; s++) {
      const { map, feats } = A.gravewakeFloor(r.dungeon, s, floor, def.floors, 20);
      const c = feats.captive;
      if (c && map.tiles[c.y * map.w + c.x] === T.floor && !map.spawns.includes(c.y * map.w + c.x)) got++;
    }
    return `${r.dungeon}:${got}/20`;
  });
  check("gravewake", "placeCaptive finds a legal spot on the writer's grid for every RESCUES site id on its captive floor (20 seeds each)", lent.every((x) => x.endsWith(":20/20")), lent.join(" "));
  const r1 = A.gravewakeRift("rift", 11, 20);
  const r2 = B.gravewakeRift("rift", 11, 20);
  let riftOk = 0;
  let riftCrack = 0;
  for (let s = 0; s < n; s++) {
    const { map, feats } = A.gravewakeRift("rift", s, 20);
    const trap = new Set((feats.traps ?? []).map((t) => t.y * map.w + t.x));
    const blocked = map.tiles.map((t, i) => (trap.has(i) ? T.wall : t));
    const d = A.stepsFrom(blocked, map.w, map.h, map.exit.x, map.exit.y, (t) => t === T.floor || t === T.stairU);
    if (map.foes.every((f) => d[f.y * map.w + f.x] >= 0) && map.tiles[map.exit.y * map.w + map.exit.x] === T.stairU) riftOk++;
    if (feats.crack || feats.rune || feats.mimic) riftCrack++;
  }
  check("gravewake", "rift zone placement: the exit is the game's up stair, traps only (no secrets, they would not survive a reroll), traps never cut off a foe, same seed same pocket", riftOk === n && riftCrack === 0 && JSON.stringify(A.toJSON(r1.map)) === JSON.stringify(A.toJSON(r2.map)) && JSON.stringify(r1.feats) === JSON.stringify(r2.feats), `${riftOk}/${n}, secret rooms ${riftCrack}/${n}`);
}

// ---- Phase 3: the overworld ([OWNER-APPROVED 2026-10-02: playtest1e bigger world]) ----
{
  const O = { ground0: 1, ground1: 2, road: 3, trail: 4, tree: 5, rock: 6, water: 7, cache: 8, grave: 9, pump: 10, ice: 11 };
  const codes = { road: O.road, trail: O.trail, tree: O.tree, rock: O.rock, water: O.water, cache: O.cache, grave: O.grave, pump: O.pump, ice: O.ice };
  const dress = (ground, kinds) => ({ ground, trees: 0.14, rocks: 0.03, pump: 0.01, pond: "water", landmarks: 4, caches: 2, kinds });
  const sites = [{ x: 10, y: 10 }, { x: 70, y: 12 }, { x: 15, y: 50 }, { x: 66, y: 52 }];
  const opts = (seed, extra = {}) => ({ seed, w: 80, h: 64, codes, biomes: [dress(O.ground0, ["stones", "graves", "pond", "patch"]), dress(O.ground1, ["glade", "pond", "stones", "graves"])], biomeAt: (x) => (x < 40 ? 0 : 1), roads: [{ x0: 40, y0: 0, x1: 40, y1: 63 }, { x0: 0, y0: 32, x1: 79, y1: 32 }], sites, stamps: [{ x: 20, y: 20, w: 6, h: 5, tile: O.water }], edge: 2, spacing: 10, ...extra });
  const hashO = (r) => createHash("md5").update(r.tiles).update(JSON.stringify([r.landmarks, r.caches])).digest("hex");
  const seeds = [...Array(12).keys()].map((s) => `ow-${s}`);
  const same = seeds.filter((s) => hashO(A.writeOverworld(opts(s))) === hashO(A.writeOverworld(opts(s))) && hashO(A.writeOverworld(opts(s))) === hashO(B.writeOverworld(opts(s)))).length;
  const distinct = new Set(seeds.map((s) => hashO(A.writeOverworld(opts(s))))).size;
  check("overworld", "same options, same bytes (tiles, landmarks, caches), across two separate loads; different seeds give different vales", same === seeds.length && distinct === seeds.length, `${same}/${seeds.length} same, ${distinct} distinct`);
  const walk = (t) => t !== O.tree && t !== O.rock && t !== O.water && t !== O.ice;
  let reach = 0, spaced = 0, edged = 0, stamped = 0, roads = 0, caches = 0, kinds = new Set();
  for (const s of seeds) {
    const r = A.writeOverworld(opts(s));
    const d = A.stepsFrom(r.tiles, r.w, r.h, 40, 32, walk);
    const spots = [...sites, ...r.landmarks, ...r.caches];
    // a pond landmark is its water: it counts when its shore is reachable (any tile within 4)
    const near = (p) => { for (let y = p.y - 4; y <= p.y + 4; y++) for (let x = p.x - 4; x <= p.x + 4; x++) if (x >= 0 && y >= 0 && x < r.w && y < r.h && d[y * r.w + x] >= 0) return true; return false; };
    if (spots.every((p) => (p.kind === "pond" ? near(p) : d[p.y * r.w + p.x] >= 0))) reach++;
    const lm = r.landmarks;
    if (lm.length >= 6 && lm.every((a, i) => lm.every((b, j) => i === j || Math.hypot(a.x - b.x, a.y - b.y) >= 10))) spaced++;
    let band = true;
    for (let y = 0; y < r.h; y++) for (let x = 0; x < r.w; x++) {
      if (!(x < 2 || y < 2 || x >= r.w - 2 || y >= r.h - 2)) continue;
      const t = r.tiles[y * r.w + x];
      if (t !== O.tree && t !== O.road) band = false;
    }
    if (band) edged++;
    let st = true;
    for (let y = 20; y < 25; y++) for (let x = 20; x < 26; x++) if (r.tiles[y * r.w + x] !== O.water) st = false;
    if (st) stamped++;
    let rd = true;
    for (let y = 0; y < 64; y++) if (r.tiles[y * r.w + 40] !== O.road) rd = false;
    for (let x = 0; x < 80; x++) if (r.tiles[32 * r.w + x] !== O.road) rd = false;
    if (rd) roads++;
    if (r.caches.length >= 2 && r.caches.every((c) => r.tiles[c.y * r.w + c.x] === O.cache)) caches++;
    for (const l of lm) kinds.add(l.kind);
  }
  check("overworld", "every site, landmark (a pond by its shore) and cache is reachable from the crossroads on foot (trees, rocks, water and ice block), on every seed", reach === seeds.length, `${reach}/${seeds.length}`);
  check("overworld", "landmarks are spread out: at least six per vale, each at least the spacing from every other, and every kind turns up across seeds", spaced === seeds.length && kinds.size === 5, `${spaced}/${seeds.length} ${[...kinds].join(",")}`);
  check("overworld", "the edge band is dense forest except where a road runs out; the stamp (a lake) is untouched; the roads run end to end; every cache sits on a cache tile", edged === seeds.length && stamped === seeds.length && roads === seeds.length && caches === seeds.length, `edge ${edged} stamp ${stamped} roads ${roads} caches ${caches}`);
}

console.log(`\nmap-writer checks: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
