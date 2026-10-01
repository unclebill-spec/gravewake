/**
 * Core Keeper-style graphics pass, batches 1-2 (OWNER-APPROVED 2026-10-01: CORE KEEPER GRAPHICS PASS C1-C11).
 * The light layer, Option A of style/STYLE_TARGET_core_keeper.md section 6: a native-size light canvas filled
 * with the scene ambient, pre-baked light sprites added with "lighter", composited over the world with
 * "multiply". Emissives (flames, the portal vortex) and telegraphs are drawn after it.
 *
 * Nothing here is painted art: a light sprite is a multiplier, banded into five steps with a 4x4 Bayer dither
 * only at the band edges, pinned to world pixels so it never crawls (the lightlessMask trick). Every sprite is
 * baked once per (radius, colour, flicker step, dither phase) and cached, so a frame only blits.
 * Seeded and deterministic: no random source and no wall clock. Visual only: nothing in the sim reads it.
 */

export type RGB = readonly [number, number, number];

/** Runtime light colours from the doc (light buffer only, never painted). realm is the other-realm gate. */
export const LIGHTS = {
  torch: [1, 0.62, 0.3],
  candle: [1, 0.72, 0.4],
  pumpkin: [1, 0.5, 0.16],
  ghost: [0.35, 0.8, 1],
  hex: [0.62, 0.38, 1],
  moon: [0.55, 0.62, 0.9],
  realm: [0.5, 0.9, 0.45],
} as const satisfies Record<string, RGB>;

export const LIGHT = {
  /** Radius buckets in px; a light snaps to the nearest. */
  buckets: [24, 40, 56, 72, 96, 112],
  bands: 5,
  power: 1.8,
  /** The dither covers the top quarter of each band, and nothing else. */
  edge: 0.75,
  /** Flicker: four steps, one band down or up. */
  flicker: [0, -1, 0, 1],
  /** Lights per frame, nearest first (the doc's budget per room). */
  budget: 24,
  /** The hero's light: a carried torch below ground, a lantern outdoors at night. gfx2 (the owner's darkness pick,
   * 2026-10-01, for phone legibility): 96 below ground and 72 outdoors at night, up from 72 and 56. The sprite
   * radius is where the light reaches zero; the lit pool you see (band 1 and up, litPool) is 0.59 of it:
   * 57 px (3.5 tiles) below ground, inside the law's 3-5 tile off-hand light, and 43 px (2.7 tiles) outdoors. */
  hero: 96,
  heroNight: 72,
  sconce: 72,
  brazier: 56,
  doorLamp: 40,
  lantern: 40,
  gate: 72,
  bloom: 24,
  /** C5 moving lights (gfx2): a spell bolt, ring or mend in flight; a nova or cone burst; a flame foe (Lantern Man,
   * Lantern King, Pumpkin Lord, the Headless Horseman's lantern head), bigger on a boss. */
  bolt: 56,
  burst: 72,
  flameFoe: 56,
  flameBoss: 72,
  /** Actors never fall below this (the doc's actor clamp floor). */
  actorMin: 0.5,
  /** Wall tops take this share of the local light. */
  capLight: 0.35,
  /** Floor AO under a wall face, 2 px a step, 8 px deep (-55% at contact); and beside a side wall, 3 px. */
  aoFoot: [0.45, 0.45, 0.6, 0.6, 0.75, 0.75, 0.9, 0.9],
  aoSide: [0.6, 0.75, 0.9],
  /** Dungeon wall sconces: one in this many faces, never two within this many tiles. */
  sconceOdds: 4,
  sconceGap: 4,
  /** The doc's cave ambients are tuned for its mockup's big lit rooms; our rooms are smaller and the rock mass is
   * bigger, so they land at about 90% near-black. gfx1 lifted them 2.2x; gfx2 lifts them 3x (the owner's pick for
   * phone legibility, the most the check allows), toward the doc's "about 40% near-black" (measured headless). */
  ambientLift: 3,
  /** Outdoors at night the vale takes the moon; the town keeps its twilight (lighter), so its lamps still own the night. */
  worldNight: [0.38, 0.42, 0.62],
  townNight: [0.5, 0.5, 0.7],
} as const;

/** Ambient per cave theme. Four from the doc; the rest are each cave's liquid hue at about 15% value. */
export const AMBIENT_FIXED: Record<string, RGB> = {
  ossuary: [0.11, 0.08, 0.17],
  harrow: [0.08, 0.1, 0.14],
  drowned: [0.06, 0.12, 0.11],
  wick: [0.14, 0.08, 0.06],
};

/** The doc's ambient for a cave (fixed, or its liquid hue at about 15% value), before the lift. */
export function docAmbient(theme: string, liquid: string): RGB {
  const fixed = AMBIENT_FIXED[theme];
  if (fixed) return fixed;
  const n = parseInt(liquid.slice(1), 16);
  const c = [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  const top = Math.max(1, ...c);
  return [round3((c[0] / top) * 0.15), round3((c[1] / top) * 0.15), round3((c[2] / top) * 0.15)];
}

/** The cave ambient the game uses: the doc's, times LIGHT.ambientLift. */
export function ambientOf(theme: string, liquid: string): RGB {
  const a = docAmbient(theme, liquid);
  return [round3(a[0] * LIGHT.ambientLift), round3(a[1] * LIGHT.ambientLift), round3(a[2] * LIGHT.ambientLift)];
}

function round3(v: number) {
  return Math.round(v * 1000) / 1000;
}

const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];

/** Snap a radius to its bucket. */
export function bucket(r: number): number {
  let best: number = LIGHT.buckets[0];
  for (const b of LIGHT.buckets) if (Math.abs(b - r) < Math.abs(best - r)) best = b;
  return best;
}

/**
 * The light step (0..bands) at distance d from a light of radius r, for the world pixel (wx, wy).
 * Falloff (1-d/r)^1.8, five bands, dithered only in the top quarter of a band, and shifted by the flicker step.
 */
export function lightBand(d: number, r: number, wx: number, wy: number, flick = 0): number {
  if (d >= r) return 0;
  const v = Math.pow(1 - d / r, LIGHT.power);
  const q = v * LIGHT.bands;
  let b = Math.floor(q);
  const frac = q - b;
  if (frac > LIGHT.edge && b < LIGHT.bands) {
    const t = (frac - LIGHT.edge) / (1 - LIGHT.edge);
    if (t * 16 > BAYER[(wy & 3) * 4 + (wx & 3)] + 0.5) b++;
  }
  if (b === 0) return 0;
  return Math.max(0, Math.min(LIGHT.bands, b + flick));
}

const spriteCache = new Map<string, HTMLCanvasElement>();

/** One light sprite, 2r x 2r, for a sprite whose top-left lands on world pixel (sx, sy). Cached per dither phase. */
export function lightSprite(r: number, color: RGB, flick: number, sx: number, sy: number): HTMLCanvasElement | null {
  if (typeof document === "undefined") return null;
  const ph = (sx & 3) + 4 * (sy & 3);
  const key = `${r}|${color.join(",")}|${flick}|${ph}`;
  const hit = spriteCache.get(key);
  if (hit) return hit;
  const c = document.createElement("canvas");
  c.width = c.height = r * 2;
  const x = c.getContext("2d");
  if (!x) return null;
  const img = x.createImageData(r * 2, r * 2);
  for (let j = 0; j < r * 2; j++) {
    for (let i = 0; i < r * 2; i++) {
      const d = Math.hypot(i + 0.5 - r, j + 0.5 - r);
      const level = lightBand(d, r, sx + i, sy + j, flick) / LIGHT.bands;
      const o = (j * r * 2 + i) * 4;
      img.data[o] = Math.round(color[0] * level * 255);
      img.data[o + 1] = Math.round(color[1] * level * 255);
      img.data[o + 2] = Math.round(color[2] * level * 255);
      img.data[o + 3] = 255;
    }
  }
  x.putImageData(img, 0, 0);
  spriteCache.set(key, c);
  return c;
}

/** The radius of the pool a light visibly lifts (band 1 and up, before the dither), in px. */
export function litPool(r: number): number {
  return r * (1 - Math.pow(1 / LIGHT.bands, 1 / LIGHT.power));
}

/** The flicker step for a light: four steps, turned by the game frame and offset by the light's own seed. */
export function flickerStep(frame: number, seed: number): number {
  return LIGHT.flicker[(Math.floor(frame / 1.5) + seed) & 3];
}

export function rgbCss(c: RGB, k = 1): string {
  const f = (v: number) => Math.max(0, Math.min(255, Math.round(v * k * 255)));
  return `rgb(${f(c[0])},${f(c[1])},${f(c[2])})`;
}

/** How many light sprites are cached (the fps check reads it to prove the art is baked once, not per frame). */
export function lightCacheSize() {
  return spriteCache.size;
}
