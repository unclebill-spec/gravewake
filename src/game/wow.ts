/**
 * wow batch [OWNER-REQUESTED 2026-10-22 Bill: "sparkles and bright neon against dark"]: the neon particle layer.
 * - Two fixed pools, preallocated, nothing allocated per frame: pixel sparks (1-3 px squares on whole pixels, white core,
 *   then the hue's saturated tube colour, then its deep tail) and sprite effects cut from Art's wow pack (public/art/wow,
 *   6 hue rows: blue, cyan, violet, magenta, red, green). Hard caps; low effects halves them.
 * - Style lock: no bloom, no smoothing, no gradients. The glow is the light layer's emissive pass (the same pass the _em
 *   sheets use): every sprite and spark is drawn on the body and pushed again on the glow pass.
 * - Visual only. It watches the game (hp, level, drops, silver, travel) and never writes it; its dice are its own (no
 *   Math.random), so a roll the simulation makes cannot shift. Damage, HP and saves are untouched.
 */
import type { Game } from "./sim";
import { CEMETERY, TOWN_BLOCKS } from "./townplan";
import { T } from "./content";
import { WAYRIFTS, WAYRIFT, wayAwake } from "./wayrifts";

export const WOW_DIR = "/art/wow";
export const WOW2_DIR = "/art/wow2";
/** Art's sheets: [url, cell w, cell h, frames]. */
export const WOW_SHEETS = {
  flash: [`${WOW_DIR}/flash_64.png`, 64, 64, 8],
  burst64: [`${WOW_DIR}/burst_64.png`, 64, 64, 8],
  burst32: [`${WOW_DIR}/burst_32.png`, 32, 32, 8],
  shower: [`${WOW_DIR}/shower_16x32.png`, 16, 32, 6],
  motes: [`${WOW_DIR}/motes_16.png`, 16, 16, 6],
  twinkle: [`${WOW_DIR}/loot_twinkle_16.png`, 16, 16, 6],
  sparkle: [`${WOW_DIR}/sparkle_16.png`, 16, 16, 6],
  glint: [`${WOW_DIR}/glint_16.png`, 16, 16, 5],
  fireflies: [`${WOW_DIR}/fireflies_16.png`, 16, 16, 4],
  embers: [`${WOW_DIR}/embers_16.png`, 16, 16, 6],
  exhaust: [`${WOW_DIR}/exhaust_16.png`, 16, 16, 6],
  orbit: [`${WOW_DIR}/wayrift_orbit_48x64.png`, 48, 64, 8],
  orbit2: [`${WOW_DIR}/wayrift2_orbit_24x32.png`, 24, 32, 8],
  // MB final pass: Art's wow2 pack (public/art/wow2, README rows blue, cyan, violet, magenta, red, green; relight row 6 gold)
  bolt: [`${WOW2_DIR}/bolt_16x64.png`, 16, 64, 8],
  scorch: [`${WOW2_DIR}/scorch_sparks_16.png`, 16, 16, 6],
  wraith: [`${WOW2_DIR}/wraith_dissolve_16x32.png`, 16, 32, 8],
  ash: [`${WOW2_DIR}/ash_fireflies_16.png`, 16, 16, 8],
  relit: [`${WOW2_DIR}/relight_burst_32.png`, 32, 32, 8],
  star: [`${WOW2_DIR}/falling_star_32.png`, 32, 32, 6],
  gwisp: [`${WOW2_DIR}/grave_wisp_16x32.png`, 16, 32, 6],
} as const;
export type WowSheet = keyof typeof WOW_SHEETS;
export const HUE = { blue: 0, cyan: 1, violet: 2, magenta: 3, red: 4, green: 5, gold: 6, silver: 7 } as const;
/** Hue ramps sampled from Art's sheets (core, pale, tube, deep); gold and silver from loot_twinkle's legendary and common rows. */
export const WOW_RAMP: readonly (readonly [string, string, string, string])[] = [
  ["#e7f4ff", "#9ae4ff", "#4ab8ff", "#3a6ad0"],
  ["#f0fffc", "#aafff4", "#2affe0", "#14a0a8"],
  ["#f4fbff", "#c9a0e8", "#b07aff", "#7a5ad0"],
  ["#fff0fc", "#ffb0f0", "#ff3ad8", "#b01e9a"],
  ["#fff8ee", "#ffd0d0", "#ff3a50", "#c43838"],
  ["#f4ffe8", "#c8ff9a", "#5aff4a", "#1e9a3a"],
  ["#fff8ee", "#fff8e0", "#f4e27a", "#e0a040"],
  ["#f4fbff", "#e7f4ff", "#b0b6bc", "#7a8088"],
];
/** Loot twinkle rows (Art): common silver, uncommon green, rare blue, epic violet, legendary gold, mythic magenta.
 * The game's item ranks (content.ts RANK_NAME: 1 green, 2 blue, 3 purple, 4 gold, 5 red) map by their colour; a silver-only
 * drop twinkles common. Rare (rank 2) gets Bill's teal pillar, epic and up the violet one. */
export const LOOT_ROW = [0, 1, 2, 3, 4, 5] as const;
export function lootTier(rank: number | null): number {
  return rank == null ? 0 : Math.max(1, Math.min(5, rank));
}
export const WOW = {
  /** Pool caps (normal, low effects). */
  sparks: [320, 140],
  sprites: [96, 48],
  /** Low effects: a 3 s window under this fps switches it on (and it stays on); localStorage "gravewake-wow" = "low" forces it. */
  lowFps: 40,
  lowWindow: 3,
  fireflies: [6, 3],
  relight: 1.6,
  relightMulch: 2.6,
} as const;

const img: Record<string, HTMLImageElement | null> = {};
function sheet(url: string): HTMLImageElement | null {
  if (typeof Image === "undefined") return null;
  let im = img[url];
  if (im === undefined) {
    im = new Image();
    im.src = url;
    img[url] = im;
  }
  return im && im.complete && im.naturalWidth > 0 ? im : null;
}
export function warmWow() {
  for (const s of Object.values(WOW_SHEETS)) sheet(s[0]);
}

/* ---------- dice: our own, never Math.random ---------- */
let seed = 0x9e3779b9;
function rnd(): number {
  seed ^= seed << 13;
  seed ^= seed >>> 17;
  seed ^= seed << 5;
  return ((seed >>> 0) % 100000) / 100000;
}

/* ---------- pools ---------- */
const SN = WOW.sparks[0];
const sx = new Float32Array(SN), sy = new Float32Array(SN), svx = new Float32Array(SN), svy = new Float32Array(SN);
const slife = new Float32Array(SN), smax = new Float32Array(SN), sgrav = new Float32Array(SN);
const shue = new Uint8Array(SN), ssize = new Uint8Array(SN);
let sNext = 0;
const PN = WOW.sprites[0];
const px_ = new Float32Array(PN), py_ = new Float32Array(PN), pvy = new Float32Array(PN), pvx = new Float32Array(PN);
const pt = new Float32Array(PN), pdur = new Float32Array(PN);
const psheet = new Uint8Array(PN), prow = new Uint8Array(PN), pstep = new Uint8Array(PN), ploop = new Uint8Array(PN);
let pNext = 0;
const SHEET_KEYS = Object.keys(WOW_SHEETS) as WowSheet[];

export const wowState = { low: false, slow: 0, win: 0, frames: 0, sparks: 0, sprites: 0 };
function capS() { return wowState.low ? WOW.sparks[1] : WOW.sparks[0]; }
function capP() { return wowState.low ? WOW.sprites[1] : WOW.sprites[0]; }

/** One spark (world px). life s; size 1-3. Over the cap, the oldest slot is reused. */
export function spark(x: number, y: number, vx: number, vy: number, life: number, hue: number, size = 1, grav = 0) {
  const cap = capS();
  let i = -1;
  for (let k = 0; k < cap; k++) {
    const j = (sNext + k) % cap;
    if (slife[j] <= 0) { i = j; break; }
  }
  if (i < 0) i = sNext % cap;
  sNext = (i + 1) % cap;
  sx[i] = x; sy[i] = y; svx[i] = vx; svy[i] = vy; slife[i] = life; smax[i] = life; shue[i] = hue; ssize[i] = Math.max(1, Math.min(3, size)); sgrav[i] = grav;
}
/** One sprite effect: step = game frames (60 fps) per sheet frame; loop plays for dur seconds. */
export function sprite(k: WowSheet, row: number, x: number, y: number, step: number, opts: { loop?: number; vx?: number; vy?: number } = {}) {
  const cap = capP();
  let i = -1;
  for (let n = 0; n < cap; n++) {
    const j = (pNext + n) % cap;
    if (pdur[j] <= 0) { i = j; break; }
  }
  if (i < 0) i = pNext % cap;
  pNext = (i + 1) % cap;
  const frames = WOW_SHEETS[k][3];
  psheet[i] = SHEET_KEYS.indexOf(k); prow[i] = row; px_[i] = x; py_[i] = y; pstep[i] = step; pt[i] = 0;
  ploop[i] = opts.loop ? 1 : 0;
  pdur[i] = opts.loop ?? (frames * step) / 60;
  pvx[i] = opts.vx ?? 0; pvy[i] = opts.vy ?? 0;
}
export function liveCounts() {
  let s = 0, p = 0;
  for (let i = 0; i < SN; i++) if (slife[i] > 0) s++;
  for (let i = 0; i < PN; i++) if (pdur[i] > 0) p++;
  return { sparks: s, sprites: p };
}

/* ---------- effects ---------- */
function ring(x: number, y: number, n: number, speed: number, hue: number, life: number, up = 0, grav = 0) {
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + rnd() * 0.3;
    const v = speed * (0.7 + rnd() * 0.6);
    spark(x, y, Math.cos(a) * v, Math.sin(a) * v * 0.6 - up, life * (0.7 + rnd() * 0.6), hue, 1 + Math.floor(rnd() * 2), grav);
  }
}
export function fxHit(x: number, y: number, hue: number, crit: boolean) {
  ring(x, y, crit ? 14 : 7, crit ? 70 : 50, hue, 0.35, 10, 120);
  if (crit && hue === HUE.blue) { sprite("bolt", HUE.blue, x, y - 24, 4); sprite("scorch", HUE.blue, x, y + 8, 4); } // wow2: a lightning crit strikes
  if (crit) {
    sprite("burst32", HUE.red, x, y, 3);
    // ember trail: a slow rising stream that cools from white to ember red
    for (let i = 0; i < 10; i++) spark(x + (rnd() - 0.5) * 8, y + (rnd() - 0.5) * 6, (rnd() - 0.5) * 18, -20 - rnd() * 40, 0.7 + rnd() * 0.5, HUE.red, 1 + Math.floor(rnd() * 2), -10);
  }
}
export function fxLevelUp(x: number, y: number) {
  sprite("flash", HUE.blue, x, y - 12, 4);
  sprite("burst64", HUE.blue, x, y - 12, 3);
  for (let i = 0; i < 28; i++) {
    const a = (i / 28) * Math.PI * 2;
    spark(x + Math.cos(a) * 14, y - 4 + Math.sin(a) * 6, 0, -26 - rnd() * 22, 1 + rnd() * 0.6, i % 2 ? HUE.cyan : HUE.blue, 2, -6);
  }
  for (let c = 0; c < 4; c++) sprite("shower", c % 2 ? HUE.cyan : HUE.blue, x - 24 + c * 16, y - 40, 4, { loop: 1.5 });
}
export function fxBoss(x: number, y: number, mulch: boolean) {
  sprite("flash", HUE.red, x, y - 16, 4);
  sprite("burst64", HUE.red, x, y - 16, 3);
  if (mulch) { sprite("burst64", HUE.magenta, x, y - 16, 4); sprite("flash", HUE.violet, x, y - 16, 5); }
  ring(x, y - 16, mulch ? 64 : 36, mulch ? 110 : 80, HUE.red, 0.9, 20, 90);
  ring(x, y - 16, mulch ? 40 : 20, 60, mulch ? HUE.magenta : HUE.gold, 1.1, 30, 60);
  const cols = mulch ? 6 : 4;
  for (let c = 0; c < cols; c++) sprite("shower", c % 2 ? HUE.magenta : HUE.red, x - (cols * 8) + c * 16 + 8, y - 56, 4, { loop: 1.5 });
  sprite("relit", 6, x, y - 10, 4); // wow2: the gold relight burst
  relight.push({ x, y: y - 10, t: mulch ? WOW.relightMulch : WOW.relight, max: mulch ? WOW.relightMulch : WOW.relight, big: mulch });
}
export function fxLoot(x: number, y: number, rank: number | null) {
  const tier = lootTier(rank);
  if (tier >= 2) {
    pillars.push({ x, y, t: 1.4, hue: tier === 2 ? HUE.cyan : HUE.violet });
    ring(x, y - 6, tier >= 3 ? 18 : 12, 40, tier === 2 ? HUE.cyan : HUE.violet, 0.8, 20, 40);
    if (tier >= 4) for (let c = 0; c < 3; c++) sprite("shower", tier >= 5 ? HUE.magenta : HUE.violet, x - 16 + c * 16, y - 36, 4, { loop: 1.5 });
  }
  sprite("twinkle", LOOT_ROW[tier], x, y - 6, 6);
}
export function fxCoin(x: number, y: number) {
  sprite("glint", HUE.cyan, x, y, 4);
  for (let i = 0; i < 8; i++) spark(x + (rnd() - 0.5) * 6, y, (rnd() - 0.5) * 30, -20 - rnd() * 30, 0.5, HUE.gold, 1 + Math.floor(rnd() * 2), 80);
}
export function fxRift(x: number, y: number) {
  sprite("burst64", HUE.violet, x, y, 3);
  sprite("flash", HUE.blue, x, y, 4);
  // a swirl: sparks spun inward on a tightening spiral (start on the rim, aimed round and in)
  for (let i = 0; i < 36; i++) {
    const a = (i / 36) * Math.PI * 2, r = 30 + rnd() * 10;
    spark(x + Math.cos(a) * r, y + Math.sin(a) * r * 0.6, -Math.sin(a) * 60 - Math.cos(a) * 40, Math.cos(a) * 36 - Math.sin(a) * 24, 0.7, i % 3 ? HUE.violet : HUE.cyan, 2);
  }
  relight.push({ x, y, t: 1.2, max: 1.2, big: false, hue: "violet" });
}

/* ---------- relight lamps and loot pillars (read by draw.ts) ---------- */
export const relight: { x: number; y: number; t: number; max: number; big: boolean; hue?: "violet" }[] = [];
export const pillars: { x: number; y: number; t: number; hue: number }[] = [];

/* ---------- the watcher ---------- */
type Seen = { hp: number; boss: boolean; mulch: boolean; x: number; y: number };
const seenFoe = new WeakMap<object, Seen>();
const seenDrop = new WeakSet<object>();
const watch = { game: null as Game | null, level: 0, coin: 0, travel: false, map: "", lastT: 0, trophyT: 3, carT: 0, starT: 5, twinkleOn: false };

/** Sound hooks: the bus's wow() (null-safe; the check harness has no audio). */
type WowBus = { wow?: (k: "loot-common" | "loot-rare" | "loot-epic" | "levelup" | "coin-glint" | "trophy-shimmer" | "boss-relight" | "hit-spark" | "wayrift-swirl" | "whoosh-relight" | "dissolve-ghost" | "dissolve-ash-soft" | "dissolve-wisp-rise") => void; wowLoop?: (on: boolean) => void };
function bus(g: Game): WowBus | null {
  return (g as unknown as { audio: WowBus | null }).audio ?? null;
}

/** Spell colour to hue (the spell writer's elements: fire red, ice cyan, lightning blue, venom green, shadow violet, holy gold). */
export function hueOfElement(el: string): number {
  return el === "fire" ? HUE.red : el === "ice" ? HUE.cyan : el === "lightning" ? HUE.blue : el === "venom" ? HUE.green : el === "shadow" ? HUE.violet : el === "holy" ? HUE.gold : HUE.cyan;
}

/** Each frame: catch the moments by comparing with the last frame (visual only). hueAt picks a hit's spell colour. */
export function wowWatch(g: Game, dt: number, hueAt: (x: number, y: number) => number) {
  const fresh = watch.game !== g || watch.map !== g.mapId + (g.inside ?? "");
  if (fresh) {
    watch.game = g; watch.level = g.level; watch.coin = g.coin; watch.travel = !!g.travel; watch.map = g.mapId + (g.inside ?? "");
    for (const d of g.drops) seenDrop.add(d);
    for (const r of g.roamers) seenFoe.set(r, { hp: r.hp ?? 0, boss: !!(r.boss || r.mini || r.final || r.early), mulch: !!r.early, x: r.x, y: r.y });
    return;
  }
  const b = bus(g);
  if (g.level > watch.level) { fxLevelUp(g.px, g.py); b?.wow?.("levelup"); }
  watch.level = g.level;
  if (g.coin < watch.coin && g.mapId === "inside") { fxCoin(g.px, g.py - 30); b?.wow?.("coin-glint"); }
  watch.coin = g.coin;
  const trav = !!g.travel;
  if (trav && !watch.travel) { fxRift(g.px, g.py - 8); b?.wow?.("wayrift-swirl"); }
  watch.travel = trav;
  const atk = (g as unknown as { atk: number }).atk ?? 1;
  for (const r of g.roamers) {
    const hp = r.hp ?? 0;
    const s = seenFoe.get(r);
    if (!s) { seenFoe.set(r, { hp, boss: !!(r.boss || r.mini || r.final || r.early), mulch: !!r.early, x: r.x, y: r.y }); continue; }
    if (hp < s.hp && s.hp > 0) {
      const crit = s.hp - hp >= atk * 1.6;
      fxHit(r.x, r.y - 10, hueAt(r.x, r.y - 10), crit);
      b?.wow?.("hit-spark");
      if (hp <= 0 && s.boss) { fxBoss(r.x, r.y, s.mulch); b?.wow?.("boss-relight"); b?.wow?.("whoosh-relight"); }
      else if (hp <= 0) {
        // wow2: a foe's death. Spirits dissolve into smoke and glyphs, the rest into ash and fireflies.
        const spirit = /ghost|wraith|spirit|shade|banshee|lich|wisp|phantom/.test(String((r as { def?: string }).def ?? ""));
        if (spirit) { sprite("wraith", hueAt(r.x, r.y - 10) % 6, r.x, r.y - 16, 6); b?.wow?.("dissolve-ghost"); }
        else { sprite("ash", Math.floor(rnd() * 3), r.x, r.y - 8, 6); b?.wow?.("dissolve-ash-soft"); }
      }
    }
    s.hp = hp; s.x = r.x; s.y = r.y;
  }
  for (const d of g.drops) {
    if (seenDrop.has(d)) continue;
    seenDrop.add(d);
    if (d.mapId !== g.mapId) continue;
    const rank = d.item ? d.item.rank : null;
    fxLoot(d.x, d.y, rank);
    if (d.item) b?.wow?.(rank! >= 3 ? "loot-epic" : rank === 2 ? "loot-rare" : "loot-common");
  }
  // low effects: a slow window turns it on for good (localStorage "gravewake-wow" = "low" forces it)
  wowState.win += dt;
  wowState.frames += 1;
  if (wowState.win >= WOW.lowWindow) {
    if (wowState.frames / wowState.win < WOW.lowFps) wowState.slow += 1;
    else wowState.slow = 0;
    if (wowState.slow >= 2) wowState.low = true;
    wowState.win = 0; wowState.frames = 0;
  }
}
export function wowLowForced(): boolean {
  try { return typeof localStorage !== "undefined" && localStorage.getItem("gravewake-wow") === "low"; } catch { return false; }
}

/* ---------- ambience ---------- */
type View = { x: number; y: number; w: number; h: number };
const inView = (v: View, x: number, y: number, m = 24) => x > v.x - m && y > v.y - m && x < v.x + v.w + m && y < v.y + v.h + m;
let ffAlive = 0;
const ffT = new Float32Array(8);

/** Night and dungeon spawners. fires: the scene's warm lights (forge, braziers, camp fires). */
export function wowAmbient(g: Game, dt: number, v: View, night: boolean, fires: { x: number; y: number }[], cave: boolean, frame: number) {
  const low = wowState.low ? 0.5 : 1;
  const b = bus(g);
  let twinkle = false;
  if (night) {
    // red embers over fires and the forge
    for (const f of fires) if (inView(v, f.x, f.y) && rnd() < dt * 2 * low) sprite("embers", HUE.red, f.x + (rnd() - 0.5) * 8, f.y - 10, 6, { vy: -10 });
    // cemetery soul motes (cyan and violet) off each grave in view
    if (g.mapId === "town") {
      for (let y = CEMETERY.y0; y <= CEMETERY.y1; y++) for (let x = CEMETERY.x0; x <= CEMETERY.x1; x++) {
        if (g.tiles[y * g.w + x] !== T.grave) continue;
        const wx = x * 16 + 8, wy = y * 16;
        if (!inView(v, wx, wy, 0)) continue;
        twinkle = true;
        if (rnd() < dt / 40 * low) { sprite("gwisp", HUE.violet, wx, wy - 12, 6, { loop: 2 }); b?.wow?.("dissolve-wisp-rise"); } // wow2: a grave wakes
        if (rnd() < dt / 3 * low) sprite("motes", (x + y) % 2 ? HUE.cyan : HUE.violet, wx + (rnd() - 0.5) * 8, wy - 4, 8, { vy: -10 });
      }
    }
    // wow2: a falling star now and then (1 every 4-10 s) high in the view, outdoors
    if (g.mapId === "world" || g.mapId === "town" || g.mapId === "village") {
      watch.starT -= dt;
      if (watch.starT <= 0) {
        watch.starT = 4 + rnd() * 6;
        sprite("star", rnd() < 0.5 ? HUE.cyan : HUE.violet, v.x + 24 + rnd() * Math.max(1, v.w - 48), v.y + 16 + rnd() * Math.max(1, v.h * 0.25), 3);
      }
    }
    // green and cyan fireflies, a few per screen, outdoors
    if (g.mapId === "world" || g.mapId === "town" || g.mapId === "village") {
      twinkle = true;
      const want = wowState.low ? WOW.fireflies[1] : WOW.fireflies[0];
      ffAlive = 0;
      for (let i = 0; i < 8; i++) if (ffT[i] > 0) { ffT[i] -= dt; ffAlive++; }
      if (ffAlive < want && rnd() < dt * 3) {
        const x = v.x + 16 + rnd() * (v.w - 32), y = v.y + 24 + rnd() * (v.h - 48);
        const t = g.tiles[Math.floor(y / 16) * g.w + Math.floor(x / 16)];
        if (t === T.grass || t === T.dirt || t === T.swamp || t === T.grave || t === T.tree) {
          const life = 3 + rnd() * 3;
          for (let i = 0; i < 8; i++) if (ffT[i] <= 0) { ffT[i] = life; break; }
          sprite("fireflies", rnd() < 0.5 ? HUE.green : HUE.cyan, x, y, 8, { loop: life, vx: (rnd() - 0.5) * 6, vy: (rnd() - 0.5) * 6 });
        }
      }
    }
  }
  // dungeon crystals: a sparkle off an ore crystal in view about every 2 s, a glint now and then
  if (cave && g.mapId === "dungeon") {
    const x0 = Math.max(0, Math.floor(v.x / 16)), y0 = Math.max(0, Math.floor(v.y / 16));
    const x1 = Math.min(g.w - 1, Math.ceil((v.x + v.w) / 16)), y1 = Math.min(g.h - 1, Math.ceil((v.y + v.h) / 16));
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
      if (g.tiles[y * g.w + x] !== T.floor || (g.fog && g.fog[y * g.w + x] === 0)) continue;
      const ore = (x * 13 + y * 7) % 19;
      if (ore > 1) continue;
      const r = rnd();
      if (r < dt / 2 * low) sprite("sparkle", [HUE.violet, HUE.blue, HUE.red, HUE.green][(x + y) % 4], x * 16 + 4 + rnd() * 8, y * 16 + 4 + rnd() * 6, 5);
      else if (r < dt / 2 * low + dt / 4 * low) sprite("glint", [HUE.violet, HUE.blue, HUE.red, HUE.green][(x + y) % 4], x * 16 + 8, y * 16 + 8, 4);
    }
  }
  // the trophy wall: a slow shimmer down a trophy now and then, and its quiet chime
  if (g.mapId === "inside" && g.inside === "croft") {
    const heads = g.bossTrophies();
    if (heads.length) {
      watch.trophyT -= dt;
      if (watch.trophyT <= 0) {
        watch.trophyT = 3 + rnd() * 2;
        const h = heads[Math.floor(rnd() * heads.length)];
        sprite("glint", HUE.violet, h.slot * 16 + 8, 8, 4);
        sprite("sparkle", HUE.magenta, h.slot * 16 + 4 + rnd() * 8, 2 + rnd() * 8, 5);
        b?.wow?.("trophy-shimmer");
      }
    }
  }
  // the bone car: magenta and blue exhaust motes from the tailpipe while it moves
  if (g.driving && g.mapId === "world") {
    watch.carT -= dt;
    if (watch.carT <= 0 && g.moving) {
      watch.carT = 20 / 60;
      const f = g.carFacing;
      const back = f === "e" ? -22 : f === "w" ? 22 : 0;
      const up = f === "n" ? -2 : f === "s" ? -26 : -12;
      sprite("exhaust", (frame >> 4) % 2 ? 4 : 1, g.px + back, g.py + up, 6, { vx: back > 0 ? 8 : back < 0 ? -8 : 0, vy: -10 });
    }
  }
  if (twinkle !== watch.twinkleOn) { watch.twinkleOn = twinkle; b?.wowLoop?.(twinkle); }
}

/** Advance both pools (s) and cull what drifted far off the view. */
export function wowStep(dt: number, v: View) {
  for (let i = 0; i < SN; i++) {
    if (slife[i] <= 0) continue;
    slife[i] -= dt;
    svy[i] += sgrav[i] * dt;
    sx[i] += svx[i] * dt;
    sy[i] += svy[i] * dt;
    if (!inView(v, sx[i], sy[i], 64)) slife[i] = 0;
  }
  for (let i = 0; i < PN; i++) {
    if (pdur[i] <= 0) continue;
    pt[i] += dt;
    px_[i] += pvx[i] * dt;
    py_[i] += pvy[i] * dt;
    if (pt[i] >= pdur[i] || !inView(v, px_[i], py_[i], 96)) pdur[i] = 0;
  }
  for (let i = relight.length - 1; i >= 0; i--) if ((relight[i].t -= dt) <= 0) relight.splice(i, 1);
  for (let i = pillars.length - 1; i >= 0; i--) if ((pillars[i].t -= dt) <= 0) pillars.splice(i, 1);
}

const rect = (ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, c: string) => { ctx.fillStyle = c; ctx.fillRect(x, y, w, h); };

/** Draw both pools (the body pass, and again on the glow pass). Culled to the view. */
export function wowPaint(ctx: CanvasRenderingContext2D, v: View, frame: number, g: Game) {
  ctx.imageSmoothingEnabled = false;
  for (const p of pillars) paintPillar(ctx, p, frame);
  // standing loot twinkles: one per item every 1.5-3 s, its rarity's row
  for (const d of g.drops) {
    if (d.mapId !== g.mapId || !inView(v, d.x, d.y)) continue;
    const per = 90 + ((Math.round(d.x) * 7 + Math.round(d.y) * 3) % 90);
    const k = (frame + Math.round(d.x * 13)) % per;
    if (k < 36) {
      const tier = lootTier(d.item ? d.item.rank : null);
      const im = sheet(WOW_SHEETS.twinkle[0]);
      if (im) ctx.drawImage(im, Math.floor(k / 6) * 16, LOOT_ROW[tier] * 16, 16, 16, Math.round(d.x) - 8 + ((d.age ?? 0) > 0 ? 0 : 0), Math.round(d.y) - 16, 16, 16);
    }
  }
  for (let i = 0; i < PN; i++) {
    if (pdur[i] <= 0) continue;
    const [url, w, h, frames] = WOW_SHEETS[SHEET_KEYS[psheet[i]]];
    const x = Math.round(px_[i]) - (w >> 1), y = Math.round(py_[i]) - (h >> 1);
    if (x + w < v.x || y + h < v.y || x > v.x + v.w || y > v.y + v.h) continue;
    const im = sheet(url);
    if (!im) continue;
    const f = Math.floor((pt[i] * 60) / pstep[i]);
    const cell = ploop[i] ? f % frames : Math.min(frames - 1, f);
    const row = Math.min(prow[i], im.naturalHeight / h - 1);
    ctx.drawImage(im, cell * w, row * h, w, h, x, y, w, h);
  }
  for (let i = 0; i < SN; i++) {
    if (slife[i] <= 0) continue;
    const x = Math.round(sx[i]), y = Math.round(sy[i]);
    if (x < v.x || y < v.y || x > v.x + v.w || y > v.y + v.h) continue;
    const k = 1 - slife[i] / smax[i];
    const ramp = WOW_RAMP[shue[i]];
    const s = k > 0.7 ? Math.max(1, ssize[i] - 1) : ssize[i];
    rect(ctx, x, y, s, s, k < 0.15 ? ramp[0] : k < 0.35 ? ramp[1] : k < 0.75 ? ramp[2] : ramp[3]);
  }
}

/** A loot pillar: a 3 px column of the rarity's tube colour with a white core, dithered thinner as it rises and fades. */
function paintPillar(ctx: CanvasRenderingContext2D, p: { x: number; y: number; t: number; hue: number }, frame: number) {
  const ramp = WOW_RAMP[p.hue];
  const k = p.t / 1.4;
  const h = Math.round(56 * Math.min(1, (1 - k) * 4));
  const x = Math.round(p.x), base = Math.round(p.y) - 2;
  for (let i = 0; i < h; i++) {
    const y = base - i;
    const top = i / Math.max(1, h);
    if (top > k + 0.3 && (i + frame) % 2) continue; // the column dithers away from the top as it fades
    rect(ctx, x - 1, y, 1, 1, ramp[2]);
    rect(ctx, x + 1, y, 1, 1, ramp[2]);
    rect(ctx, x, y, 1, 1, top < 0.8 ? ramp[0] : ramp[1]);
    if (i % 3 === 0 && top < 0.5) { rect(ctx, x - 2, y, 1, 1, ramp[3]); rect(ctx, x + 2, y, 1, 1, ramp[3]); }
  }
}

/** The casino's neon sign (town): a marquee over the door, CASINO in magenta tubes, a cyan frame of chasing bulbs, a
 * stuttering letter now and then. Lit at night (on the glow pass too); a dim unlit tube by day. */
const CASINO_LOT = TOWN_BLOCKS.find((b) => b.room === "casino");
const FONT: Record<string, string[]> = {
  C: ["###", "#..", "#..", "#..", "###"],
  A: [".#.", "#.#", "###", "#.#", "#.#"],
  S: ["###", "#..", "###", "..#", "###"],
  I: ["###", ".#.", ".#.", ".#.", "###"],
  N: ["#.#", "###", "###", "###", "#.#"],
  O: ["###", "#.#", "#.#", "#.#", "###"],
};
export function casinoSignSpot(): { x: number; y: number; w: number; h: number } | null {
  if (!CASINO_LOT) return null;
  const w = 33, h = 11;
  return { x: CASINO_LOT.doorX * 16 + 8 - (w >> 1), y: CASINO_LOT.doorY * 16 - h - 2, w, h };
}
export function paintCasinoSign(ctx: CanvasRenderingContext2D, frame: number, lit: boolean) {
  const s = casinoSignSpot();
  if (!s) return;
  const M = WOW_RAMP[HUE.magenta], C = WOW_RAMP[HUE.cyan];
  rect(ctx, s.x, s.y, s.w, s.h, "#140c10");
  // the chasing bulbs round the frame
  const per = 2 * (s.w + s.h) - 4;
  let n = 0;
  const step = (x: number, y: number) => {
    const on = lit && ((n + (frame >> 3)) % 4 === 0);
    rect(ctx, x, y, 1, 1, on ? C[0] : lit ? C[2] : C[3]);
    n += 1;
  };
  for (let x = s.x; x < s.x + s.w; x += 2) step(x, s.y);
  for (let y = s.y + 2; y < s.y + s.h; y += 2) step(s.x + s.w - 1, y);
  for (let x = s.x + s.w - 3; x >= s.x; x -= 2) step(x, s.y + s.h - 1);
  for (let y = s.y + s.h - 3; y > s.y; y -= 2) step(s.x, y);
  void per;
  // CASINO, one letter stutters off for a beat about every 4 s
  const word = "CASINO";
  const dead = (frame % 240) < 10 ? 3 : (frame % 240) < 14 ? -1 : (frame % 240) < 18 ? 3 : -1;
  for (let i = 0; i < word.length; i++) {
    const m = FONT[word[i]];
    const on = lit && i !== dead;
    for (let r = 0; r < 5; r++) for (let c = 0; c < 3; c++) if (m[r][c] === "#") rect(ctx, s.x + 3 + i * 5 + c, s.y + 3 + r, 1, 1, on ? (r === 2 && c === 1 ? M[0] : M[2]) : M[3]);
  }
}

/** Wayrift orbit overlay (Art's orbit sheets, stepped with the swirl). Bill wants wow, so the orbit is drawn twice (blue and
 * violet, half a turn apart) at both sizes, and motes are drawn in from the rim. */
export function paintWayOrbit(ctx: CanvasRenderingContext2D, cx: number, cy: number, cell: number) {
  const big = sheet(WOW_SHEETS.orbit[0]), small = sheet(WOW_SHEETS.orbit2[0]);
  const c2 = (cell + 4) % 8;
  if (big) {
    ctx.drawImage(big, cell * 48, HUE.violet * 64, 48, 64, Math.round(cx) - 24, Math.round(cy) - 32, 48, 64);
    ctx.drawImage(big, c2 * 48, HUE.blue * 64, 48, 64, Math.round(cx) - 24, Math.round(cy) - 32, 48, 64);
  }
  if (small) {
    ctx.drawImage(small, cell * 24, HUE.cyan * 32, 24, 32, Math.round(cx) - 12, Math.round(cy) - 16, 24, 32);
    ctx.drawImage(small, c2 * 24, HUE.magenta * 32, 24, 32, Math.round(cx) - 12, Math.round(cy) - 16, 24, 32);
  }
}
/** Inward motes into each awake wayrift in view (a few a second). */
export function wayMotes(g: Game, dt: number, v: View, map: "town" | "world") {
  for (const w of WAYRIFTS) {
    if (w.map !== map || !wayAwake(w, g.season())) continue;
    const cx = w.x * 16 + (WAYRIFT.fw * 16) / 2, cy = (w.y - 1) * 16 + 16;
    if (!inView(v, cx, cy, 0)) continue;
    if (rnd() < dt * (wowState.low ? 6 : 14)) {
      const a = rnd() * Math.PI * 2, r = 26 + rnd() * 12;
      spark(cx + Math.cos(a) * r, cy + Math.sin(a) * r * 0.7, -Math.cos(a) * r * 1.4 - Math.sin(a) * 20, -Math.sin(a) * r * 1.0 + Math.cos(a) * 14, 0.7, rnd() < 0.5 ? HUE.violet : HUE.cyan, 1 + Math.floor(rnd() * 2));
    }
  }
}

/** Dungeon mouths on the vale: a faint dithered violet halo and a slow mote. */
export function paintMouthGlow(ctx: CanvasRenderingContext2D, x: number, y: number, frame: number) {
  const R = WOW_RAMP[HUE.violet];
  const pulse = (frame >> 4) % 4;
  for (let a = 0; a < 24; a++) {
    if ((a + pulse) % 2) continue;
    const t = (a / 24) * Math.PI * 2;
    rect(ctx, Math.round(x + Math.cos(t) * 13), Math.round(y + Math.sin(t) * 7), 1, 1, a % 4 === pulse ? R[1] : R[3]);
  }
}

/** A boss telegraph's neon edge: the mark's rim as a dithered ring of the tell's colour that pulses (2 frames bright of 8). */
export function paintTellEdge(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, hue: number, frame: number) {
  if (r <= 0 || r > 200) return;
  const R = WOW_RAMP[hue];
  const bright = (frame >> 2) % 4 === 0;
  const n = Math.max(24, Math.round(r * 2.4));
  for (let i = 0; i < n; i++) {
    if (!bright && i % 2) continue;
    const t = (i / n) * Math.PI * 2;
    const px = Math.round(x + Math.cos(t) * r), py = Math.round(y + Math.sin(t) * r * 0.5);
    rect(ctx, px, py, 1, 1, bright ? R[0] : R[2]);
    if (bright) rect(ctx, px, py + 1, 1, 1, R[2]);
  }
}

/** Hollowmourn's Lights Out and Last Toll: everything black but a hard-edged pool round his lantern (row by row, no gradient). */
export function paintBlackout(ctx: CanvasRenderingContext2D, v: View, lx: number, ly: number, r: number) {
  ctx.fillStyle = "#050308";
  const x0 = Math.floor(v.x) - 1, x1 = Math.ceil(v.x + v.w) + 1;
  for (let y = Math.floor(v.y) - 1; y <= Math.ceil(v.y + v.h) + 1; y++) {
    const dy = y - ly;
    if (Math.abs(dy) >= r) { ctx.fillRect(x0, y, x1 - x0, 1); continue; }
    const half = Math.floor(Math.sqrt(r * r - dy * dy));
    ctx.fillRect(x0, y, Math.max(0, lx - half - x0), 1);
    ctx.fillRect(lx + half, y, Math.max(0, x1 - (lx + half)), 1);
  }
}
