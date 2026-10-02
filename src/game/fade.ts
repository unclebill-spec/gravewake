/**
 * fade1 (OWNER-APPROVED 2026-10-01 19:59 ET: night foe fade-in). A night roamer dissolves in over half a
 * second when it spawns instead of popping onto the screen. Looks only: the foe is fully live from its first
 * tick (it wanders, touches and is fought exactly as before) and only its drawing fades. Nothing new is
 * stored, saved or ticked: the age comes from the spawn stamp the sim already writes into a night roamer's id
 * (`r${worldMs}-${n}`, sim.ts spawnNightRoamer), read against g.worldMs at draw time.
 *
 * The dissolve is a pinned 4x4 Bayer dither on world pixels (the light layer's matrix): each world pixel of the
 * foe, its blob shadow, its glow mask and its actor-light silhouette is drawn or not, never blended, so every
 * pixel on screen is one of the sprite's own palette colours (no alpha, no in-between colour). The pattern is
 * fixed to the world grid, so it does not crawl as the camera moves, and it scales with the frame like every
 * other world pixel in every preset (Retro draws it at 1 canvas px per game px).
 *
 * fade2 (OWNER-APPROVED 2026-10-01 21:20 ET: festival foe fade-in, minimal sim.ts spawn-time tag). Festival foes
 * fade the same way: a festival boss and a named festival pack (Harvest Moon, Krampusnacht, Drowned Bloom, Ashen Fair)
 * as they walk onto the vale, the helpers and pack minions that join their fight, and anything they summon. The sim
 * writes one number on those foes only, spawnAt (the world ms they appeared at); it is never saved and play never
 * reads it. Bounties, rift foes and dungeon foes carry no tag and draw as before. A festival foe that is already
 * there when a scene starts (a load, walking onto the vale, waking) draws solid: only one that appears later fades.
 *
 * The ground-mist puff is six dust chips from the existing particle pool (interact channel, cap 16), ash
 * colours already in its palette, emitted once per foe from the draw side, and only when the foe is on screen
 * and not on unexplored ground (FX rule: offscreen or fogged = don't spawn). The sim never reads the pool.
 */
import { CH_INTERACT, C_ASH, C_ASH_DARK, K_DUST, type ParticlePool } from "./particles";

export const FADE = {
  /** The dissolve, in world ms (0.5 s; pauses with the world). */
  ms: 500,
  /** A flame or ghost foe's own light comes on halfway through. */
  lightAt: 0.5,
  /** Mist chips in the puff, and how late in the fade a first sight still puffs. */
  puff: 6,
  puffBefore: 0.5,
  /** fade2: a tagged foe that appeared within this many world ms of its scene starting was already there. */
  sceneGrace: 250,
  /** The dither box around the foe's feet, in world px (a mob sprite plus its shadow and hit flash). */
  box: { left: 16, right: 16, up: 40, down: 8 },
} as const;

const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
const NIGHT_ID = /^r(\d+(?:\.\d+)?(?:e[+-]?\d+)?)-\d+$/;

/** The world ms a night roamer spawned at, read from its id; null for any other foe. */
export function spawnStamp(id: string): number | null {
  const m = NIGHT_ID.exec(id);
  if (!m) return null;
  const at = Number(m[1]);
  return Number.isFinite(at) ? at : null;
}

/** A foe as the fade reads it: its id and, on a festival foe (fade2), the sim's spawn-time tag. */
export type Fading = { id: string; spawnAt?: number };

/**
 * 0 at spawn to 1 when fully drawn. A night roamer reads the stamp in its id (fade1); a festival foe reads its
 * spawnAt tag (fade2), and only if it appeared after its scene began (`since`, from sceneStart). Any other foe is 1.
 */
export function fadeOf(foe: string | Fading, worldMs: number, since = -Infinity): number {
  const id = typeof foe === "string" ? foe : foe.id;
  const tag = typeof foe === "string" ? undefined : foe.spawnAt;
  if (typeof tag === "number" && Number.isFinite(tag)) {
    if (!(tag - since > FADE.sceneGrace)) return 1;
    const age = worldMs - tag;
    if (!(age >= 0) || age >= FADE.ms) return 1;
    return age / FADE.ms;
  }
  const at = spawnStamp(id);
  if (at === null) return 1;
  const age = worldMs - at;
  if (!(age >= 0) || age >= FADE.ms) return 1;
  return age / FADE.ms;
}

/** What makes a scene: the map, the dungeon and the floor. */
export type SceneOf = { mapId: string; dungeon?: string; floor?: number; worldMs: number };
const scene = { key: "", last: NaN, start: -Infinity };

/**
 * fade2: the world ms the scene on screen began at. A new map, dungeon or floor starts one, and so does any jump in
 * the world clock (a load, a sleep, a time skip: backwards, or more than a second forward). Drawing only.
 */
export function sceneStart(g: SceneOf): number {
  const key = `${g.mapId}|${g.dungeon ?? ""}|${g.floor ?? ""}`;
  const jump = !(g.worldMs >= scene.last) || g.worldMs - scene.last > 1000;
  if (key !== scene.key || jump) {
    scene.key = key;
    scene.start = g.worldMs;
  }
  scene.last = g.worldMs;
  return scene.start;
}

/** How many of the 16 Bayer cells show: 0 (none) to 16 (all). */
export function fadeLevel(t: number): number {
  if (!(t < 1)) return 16;
  return Math.max(0, Math.min(16, Math.floor(t * 17)));
}

/** Is world pixel (x, y) drawn at this level? Pinned to the world grid. */
export function shows(x: number, y: number, level: number): boolean {
  return BAYER[(y & 3) * 4 + (x & 3)] < level;
}

/**
 * Draw `draw` through the dither for fade t, around the foe standing at (x, y). At t >= 1 it is a plain call.
 * The clip is whole world-pixel rects (fewer of the shown or the hidden cells, even-odd for the hidden).
 */
export function dissolve(c: CanvasRenderingContext2D, t: number, x: number, y: number, draw: (c: CanvasRenderingContext2D) => void, k = 1) {
  const level = fadeLevel(t);
  if (level >= 16) {
    draw(c);
    return;
  }
  if (level <= 0) return;
  // fade2: k scales the box with the sprite (a festival boss is drawn at 2x).
  const x0 = Math.round(x) - FADE.box.left * k;
  const y0 = Math.round(y) - FADE.box.up * k;
  const x1 = Math.round(x) + FADE.box.right * k;
  const y1 = Math.round(y) + FADE.box.down * k;
  const hide = level > 8;
  c.save();
  c.beginPath();
  if (hide) c.rect(x0, y0, x1 - x0, y1 - y0);
  for (let wy = y0; wy < y1; wy++) {
    for (let wx = x0; wx < x1; wx++) if (shows(wx, wy, level) !== hide) c.rect(wx, wy, 1, 1);
  }
  c.clip(hide ? "evenodd" : "nonzero");
  try {
    draw(c);
  } finally {
    c.restore();
  }
}

/** A y-sorted draw step as drawWorld builds it. */
export type FadeStep = { fn: () => void; actor?: (c: CanvasRenderingContext2D) => void };

/**
 * Put a fading foe's draw step (body, shadow, hit flash), its actor-light silhouette and its glow-mask entries
 * (glow[from..]) through the dissolve. The closures themselves are unchanged; only where they may paint is.
 */
export function fadeStep(ctx: CanvasRenderingContext2D, step: FadeStep, glow: ((c: CanvasRenderingContext2D) => void)[], from: number, t: number, x: number, y: number, k = 1) {
  const fn = step.fn;
  step.fn = () => dissolve(ctx, t, x, y, () => fn(), k);
  const actor = step.actor;
  if (actor) step.actor = (c) => dissolve(c, t, x, y, actor, k);
  for (let i = from; i < glow.length; i++) {
    const paint = glow[i];
    glow[i] = (c) => dissolve(c, t, x, y, paint, k);
  }
}

const puffed = new WeakSet<object>();

/**
 * The ground-mist puff: once per foe, early in its fade. Six dust chips spread low and sideways from its feet
 * and settle in under half a second. Fixed offsets, no random draw. Returns whether it puffed.
 */
export function mistPuff(fx: ParticlePool, foe: { x: number; y: number }, t: number): boolean {
  if (puffed.has(foe)) return false;
  puffed.add(foe);
  if (!(t < FADE.puffBefore)) return false;
  const x = Math.round(foe.x);
  const y = Math.round(foe.y);
  for (let i = 0; i < FADE.puff; i++) {
    const side = i % 2 ? 1 : -1;
    const k = i >> 1;
    fx.emit(CH_INTERACT, K_DUST, x + side * (2 + k * 3), y - 1 - (k & 1), side * (10 + k * 6), -3 - k * 2, 0.45, k === 1 ? C_ASH : C_ASH_DARK, 0, 3);
  }
  return true;
}
