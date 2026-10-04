/**
 * playtest1j [OWNER-APPROVED 2026-10-03: telegraphed attacks, dynamic fight lights]: the telegraph marks, the wind-up glow
 * and the moving lights of a fight. Bill (2026-10-03 08:41 ET): "spell projectiles, impacts, fire and the telegraph markers
 * cast moving light into dark rooms, dungeons and night, in the gloom-and-glow palette (neon blue cold fire, violet, red).
 * Respect the fps budget, so use a light pool and caching and test on low presets."
 *
 * Looks only: nothing in the sim reads this. Marks are baked once per (radius, colour, fill step, hot) and cached, so a
 * frame blits; fight lights come from a fixed pool of FIGHT.pool lamps reused every frame (no allocation in a fight), and
 * they share light.ts's 24-light budget with everything else (sceneLights trims nearest first).
 */
import { LIGHT, bucket, type RGB } from "./light";
import { NEON_LIGHT } from "./looks";
import { MARK_NEON, markSlot, tellProgress, type MarkSlot } from "./telegraph";
import { bodyR, footOf, headroom, scaleOf } from "./bigboss"; // playtest1p [OWNER-APPROVED 2026-10-04 01:10 ET: playtest1p view polish and big bosses]

export const FIGHT = {
  /** Fight lamps per frame, at most (the pool's size). */
  pool: 12,
  /** A mark's fill is drawn in this many steps (so a mark bakes at most steps + 1 sprites per size and colour). */
  steps: 8,
  /** The last share of a tell, when the mark's rim doubles: it is about to land. */
  hot: 0.8,
  /** The wind-up glow round a foe's feet, and its light. */
  windR: 10,
  windLight: 24,
  /** A spell's neon core (in flight) and its impact flash. */
  coreLight: 24,
  impactLight: 40,
  /** A boss's phase-change roar. */
  roarLight: 72,
  /** Ash bursts (fire) and pressure plates. */
  ashLight: 40,
  plateLight: 24,
  /** Most marks cached (a fight uses a handful of sizes). */
  cacheMax: 400,
} as const;

/** The neon a spell's light core takes from its fx element (1h's fx strips: fire, ice, lightning, venom, shadow, holy). */
export const ELEMENT_NEON: Record<string, keyof typeof NEON_LIGHT> = {
  fire: "red",
  ice: "blue",
  lightning: "blue",
  venom: "violet",
  shadow: "violet",
  holy: "blue",
};
export const SLOT_NEON: Record<MarkSlot, keyof typeof NEON_LIGHT> = { big: "red", mid: "violet", spam: "blue", trap: "violet" };

type Lamp = { x: number; y: number; r: number; c: RGB; seed: number; flick: boolean };
const pool: Lamp[] = Array.from({ length: FIGHT.pool }, () => ({ x: 0, y: 0, r: 24, c: NEON_LIGHT.blue, seed: 0, flick: false }));
let used = 0;
/** The pool itself (the check reads it: the same objects every frame). */
export function fightPool(): readonly Lamp[] {
  return pool;
}
function lamp(x: number, y: number, r: number, c: RGB, flick: boolean, seed = 0): Lamp | null {
  if (used >= pool.length) return null;
  const l = pool[used++];
  l.x = Math.round(x);
  l.y = Math.round(y);
  l.r = bucket(r);
  l.c = c;
  l.flick = flick;
  l.seed = seed & 3;
  return l;
}

export type FightView = {
  roamers: readonly { x: number; y: number; tell?: number; tellMax?: number; casting?: string; markX?: number; markY?: number; markR?: number; boss?: boolean; phase?: number; flash?: number; act?: string; mini?: boolean; rare?: boolean; naughty?: string; mimic?: boolean }[];
  spells: readonly { x: number; y: number; tx: number; ty: number; kind: string; color: string; life: number; max?: number }[];
  ashes: readonly { x: number; y: number; tell: number }[];
  plates: readonly { tell: number }[];
  traps: readonly { x: number; y: number }[];
  fog?: ArrayLike<number> | null;
  w: number;
};

/**
 * The fight's moving lights, from the pool: each live mark (its slot's neon, growing as it fills), the casting foe's
 * wind-up, a boss's phase roar, each spell's neon core (its element) riding the head and flashing at the impact, ash
 * bursts (red fire) and live pressure plates. Pushed onto out; sceneLights trims the lot to the budget.
 */
export function fightLights(
  v: FightView,
  out: Lamp[],
  element: (color: string) => string,
  head: (s: FightView["spells"][number]) => { x: number; y: number; hit: boolean },
  tile: number,
): number {
  used = 0;
  const dark = (x: number, y: number) => !!v.fog && v.fog[Math.floor(y / tile) * v.w + Math.floor(x / tile)] === 0;
  const push = (l: Lamp | null) => void (l && out.push(l));
  for (const r of v.roamers) {
    if ((r.tell ?? 0) > 0 && r.markX != null && r.markY != null) {
      const c = NEON_LIGHT[SLOT_NEON[markSlot(r.casting)]];
      const p = tellProgress(r.tell, r.tellMax);
      push(lamp(r.markX, r.markY, Math.max(40, (r.markR ?? 40) * (1 + 0.5 * p)), c, false, 1));
      // playtest1p [OWNER-APPROVED 2026-10-04 01:10 ET: playtest1p view polish and big bosses]: a big body's wind-up and
      // roar light from its middle and reach as far past it as a people-scale body's do past theirs
      const s = scaleOf(r);
      if (!dark(r.x, r.y)) push(lamp(r.x, r.y - (s > 1 ? Math.round(headroom(s) / 2) : 10), FIGHT.windLight + bodyR(r) * 2, c, true, 2));
    } else if (r.boss && (r.phase ?? 1) >= 2 && (r.flash ?? 0) > 0 && r.act === "cast" && !dark(r.x, r.y)) {
      const s = scaleOf(r);
      push(lamp(r.x, r.y - (s > 1 ? Math.round(headroom(s) * 0.6) : 16), FIGHT.roarLight + bodyR(r) * 2, NEON_LIGHT.red, true, 3));
    }
  }
  for (const s of v.spells) {
    const h = head(s);
    push(lamp(h.x, h.y, h.hit ? FIGHT.impactLight : FIGHT.coreLight, NEON_LIGHT[ELEMENT_NEON[element(s.color)] ?? "blue"], h.hit, 0));
  }
  for (const a of v.ashes) push(lamp(a.x, a.y, FIGHT.ashLight, NEON_LIGHT.red, true, Math.floor(a.x)));
  v.traps.forEach((t, i) => {
    if ((v.plates[i]?.tell ?? 0) > 0) push(lamp(t.x * tile + 8, t.y * tile + 8, FIGHT.plateLight, NEON_LIGHT.violet, false, 1));
  });
  return used;
}

// ---- the marks ----

const markCache = new Map<string, HTMLCanvasElement>();
export function markCacheSize() {
  return markCache.size;
}

/**
 * One ground mark: a whole-pixel ellipse (rad wide, rad/2 tall, the old box's footprint) with a 1 px rim (2 px when hot),
 * filled from the centre out to the tell's progress with a 25% checker and a solid leading edge. Cached.
 */
function markSprite(rad: number, color: string, step: number, hot: boolean, fill = true): HTMLCanvasElement | null {
  if (typeof document === "undefined") return null;
  const key = `${rad}|${color}|${step}|${hot ? 1 : 0}|${fill ? 1 : 0}`;
  const hit = markCache.get(key);
  if (hit) return hit;
  if (markCache.size >= FIGHT.cacheMax) markCache.clear();
  const w = rad * 2 + 1;
  const h = rad + 1;
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const x = c.getContext("2d");
  if (!x) return null;
  x.fillStyle = color;
  const a = rad;
  const b = rad / 2;
  const f = step / FIGHT.steps;
  for (let j = 0; j < h; j++) {
    for (let i = 0; i < w; i++) {
      const dx = (i - rad) / a;
      const dy = (j - b) / b;
      const d = Math.sqrt(dx * dx + dy * dy);
      if (d > 1) continue;
      const edge = 1 - d;
      const rim = edge * a < (hot ? 2 : 1);
      const lead = f > 0 && Math.abs(d - f) * a < 0.75;
      const dots = fill && d < f && (i + j * 2) % 4 === 0;
      if (rim || lead || dots) x.fillRect(i, j, 1, 1);
    }
  }
  markCache.set(key, c);
  return c;
}

/** A ground mark, filled to progress p (0 to 1); rimOnly keeps just its rim and leading edge (drawn over the actors). */
export function paintTellMark(ctx: CanvasRenderingContext2D, mx: number, my: number, rad: number, color: string, p: number, rimOnly = false) {
  const r = Math.max(4, Math.round(rad));
  const step = Math.round(Math.max(0, Math.min(1, p)) * FIGHT.steps);
  const spr = markSprite(r, color, step, p >= FIGHT.hot, !rimOnly);
  if (!spr) return;
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(spr, Math.round(mx) - r, Math.round(my - r / 2));
}

/** A line's lane: dotted rims 16 px either side of the sweep, filled from the foe toward the mark to progress p. */
export function paintTellLane(ctx: CanvasRenderingContext2D, x0: number, y0: number, x1: number, y1: number, half: number, color: string, p: number, rimOnly = false) {
  const dx = x1 - x0;
  const dy = y1 - y0;
  const len = Math.hypot(dx, dy) || 1;
  const ux = dx / len;
  const uy = dy / len;
  const nx = -uy * half;
  const ny = (ux * half) / 2;
  ctx.fillStyle = color;
  const hot = p >= FIGHT.hot;
  for (let t = 0; t <= len; t += hot ? 2 : 3) {
    const cx = x0 + ux * t;
    const cy = y0 + uy * t;
    ctx.fillRect(Math.round(cx + nx), Math.round(cy + ny), 1, 1);
    ctx.fillRect(Math.round(cx - nx), Math.round(cy - ny), 1, 1);
    if (!rimOnly && t <= len * p && Math.floor(t) % 6 === 0) for (let k = -half + 4; k < half; k += 6) ctx.fillRect(Math.round(cx + (nx / half) * k), Math.round(cy + (ny / half) * k), 1, 1);
  }
  paintTellMark(ctx, x1, y1, half, color, p, rimOnly);
}

/** The wind-up glow: a pulsing ring round the casting foe's feet (and a wider one on a boss). */
export function paintWindup(ctx: CanvasRenderingContext2D, x: number, y: number, color: string, frame: number, boss: boolean, foot = 0) {
  const r = (boss ? FIGHT.windR + 6 : FIGHT.windR) + foot + (Math.floor(frame / 4) % 2); // playtest1p: round a big body's foot
  paintTellMark(ctx, x, y, r, color, 0);
}

export type TellView = FightView & { plateTell: number; ashTell: number; plateR: number; ashR: number; frame: number };

/**
 * Every live telegraph in the scene (foe marks and wind-ups, live plates, ash bursts), on the ground under the actors;
 * white paints the light layer's mask; rimOnly (over the Lightless dark) keeps rims and leading edges so actors stay clear.
 */
export function paintTells(ctx: CanvasRenderingContext2D, v: TellView, white: boolean, tile: number, half: number, rimOnly = false) {
  const col = (s: MarkSlot) => (white ? "#ffffff" : MARK_NEON[s]);
  for (const r of v.roamers) {
    if ((r.tell ?? 0) <= 0 || r.markX == null || r.markY == null) continue;
    const s = markSlot(r.casting);
    const p = tellProgress(r.tell, r.tellMax);
    if ((r.markR ?? 40) === 18) paintTellLane(ctx, r.x, r.y, r.markX, r.markY, half, col(s), p, rimOnly);
    else paintTellMark(ctx, r.markX, r.markY, r.markR ?? 40, col(s), p, rimOnly);
    paintWindup(ctx, r.x, r.y, col(s), v.frame, !!r.boss, footOf(r).rx); // playtest1p
  }
  v.traps.forEach((t, i) => {
    const tell = v.plates[i]?.tell ?? 0;
    if (tell > 0) paintTellMark(ctx, t.x * tile + 8, t.y * tile + 8, v.plateR, col("trap"), 1 - tell / v.plateTell, rimOnly);
  });
  for (const a of v.ashes) paintTellMark(ctx, a.x, a.y, v.ashR, white ? "#ffffff" : MARK_NEON.big, 1 - a.tell / v.ashTell, rimOnly);
}

/** For the light check: lights carried by a fight never exceed the pool, and LIGHT.budget still caps the scene. */
export const FIGHT_BUDGET = { pool: FIGHT.pool, scene: LIGHT.budget } as const;
