/**
 * Particle pool. Short bursts only: chips, dust, ash, ticks, one mote.
 * Law: rules/GAME_LAYOUT_TWO.txt, FX RULE and PARTICLES.
 * - Fixed, preallocated struct-of-arrays. Nothing is allocated per frame or per burst.
 * - Four channels with their own caps. Over the cap, the oldest particle in that channel dies.
 * - One tiny atlas of hard-pixel silhouettes, one palette color per pixel, no alpha fade,
 *   no bloom, no soft clouds, no per-chip collision. Drawn at integer positions in one pass.
 * - Visual only. Nothing here reads or writes combat state, and it never touches Math.random,
 *   so it cannot shift a roll the simulation makes.
 * The spell-writer strips (beams, bolts, orbs, rain) are not drawn here.
 */

export const CH_WEATHER = 0;
export const CH_COMBAT = 1;
export const CH_INTERACT = 2;
export const CH_HUB = 3;
/** weather 80, combat 24, interact 16, hub 12. */
export const CHANNEL_CAPS = [80, 24, 16, 12] as const;

/** Silhouettes. Each has a full frame and a small late-life frame. */
export const K_SPARK = 0;
export const K_BONE = 1;
export const K_ASH = 2;
export const K_DUST = 3;
export const K_RING = 4;
export const K_TICK = 5;
export const KIND_NAMES = ["spark", "bone", "ash", "dust", "ring", "tick"] as const;

/**
 * Atlas masks, native pixels. '#' is lit. [full, small]. Every cell fits 8×8.
 * spark stays 2×2 in both frames so the old spark() looks the same as before.
 */
export const ATLAS_MASKS: readonly (readonly [readonly string[], readonly string[]])[] = [
  [["##", "##"], ["##", "##"]],
  [["#.#", ".#.", "#.#"], ["##"]],
  [[".#", "##"], ["#"]],
  [["##"], ["#"]],
  [[".##.", "#..#", "#..#", ".##."], [".#.", "#.#", ".#."]],
  [["#", "#"], ["#"]],
];
export const ATLAS_CELL = 8;

/**
 * Particle palette. Every entry is a color the game already draws with (draw.ts / sim.ts),
 * so the pool adds no new hue.
 */
export const FX_PALETTE = [
  "#f4e27a", // 0 spark gold (the old spark color)
  "#e6dcc8", // 1 bone
  "#c45a18", // 2 rust
  "#c4a574", // 3 dust
  "#8a867c", // 4 ash pale
  "#4a4038", // 5 ash dark
  "#f4f0ea", // 6 white (hit flash white)
  "#8f2d3a", // 7 potion red
  "#e07a2f", // 8 ember
  "#8a6844", // 9 dirt brown
] as const;
export const C_GOLD = 0;
export const C_BONE = 1;
export const C_RUST = 2;
export const C_DUST = 3;
export const C_ASH = 4;
export const C_ASH_DARK = 5;
export const C_WHITE = 6;
export const C_RED = 7;

function hexRgb(hex: string): [number, number, number] {
  const v = hex.replace("#", "");
  return [parseInt(v.slice(0, 2), 16), parseInt(v.slice(2, 4), 16), parseInt(v.slice(4, 6), 16)];
}
const PALETTE_RGB = FX_PALETTE.map(hexRgb);

/** Nearest palette entry. A color the palette already has maps to itself. */
export function paletteIndex(hex: string): number {
  const i = (FX_PALETTE as readonly string[]).indexOf(hex.toLowerCase());
  if (i >= 0) return i;
  if (!/^#[0-9a-f]{6}$/i.test(hex)) return C_GOLD;
  const [r, g, b] = hexRgb(hex);
  let best = 0;
  let bestD = Infinity;
  for (let k = 0; k < PALETTE_RGB.length; k++) {
    const [pr, pg, pb] = PALETTE_RGB[k];
    const d = (pr - r) ** 2 + (pg - g) ** 2 + (pb - b) ** 2;
    if (d < bestD) {
      bestD = d;
      best = k;
    }
  }
  return best;
}

const TOTAL = CHANNEL_CAPS.reduce((a, b) => a + b, 0);
const BASE: number[] = [];
{
  let at = 0;
  for (const cap of CHANNEL_CAPS) {
    BASE.push(at);
    at += cap;
  }
}

export class ParticlePool {
  readonly size = TOTAL;
  readonly x = new Float32Array(TOTAL);
  readonly y = new Float32Array(TOTAL);
  readonly vx = new Float32Array(TOTAL);
  readonly vy = new Float32Array(TOTAL);
  /** Seconds left. 0 or less is a free slot. */
  readonly life = new Float32Array(TOTAL);
  readonly maxLife = new Float32Array(TOTAL);
  /** Pixels per second squared, positive is down. */
  readonly grav = new Float32Array(TOTAL);
  /** Fraction of velocity lost per second. */
  readonly drag = new Float32Array(TOTAL);
  readonly kind = new Uint8Array(TOTAL);
  readonly color = new Uint8Array(TOTAL);
  /** Birth order, for kill-oldest. */
  readonly born = new Float64Array(TOTAL);
  private serial = 0;
  private seed = 0x9e3779b9;

  /** Private xorshift. The simulation's Math.random is never consumed here. */
  rand() {
    let s = this.seed | 0;
    s ^= s << 13;
    s ^= s >>> 17;
    s ^= s << 5;
    this.seed = s;
    return (s >>> 0) / 4294967296;
  }

  /** Whole number in [lo, hi]. */
  randInt(lo: number, hi: number) {
    return lo + Math.floor(this.rand() * (hi - lo + 1));
  }

  /** Live particles in one channel. */
  count(channel: number) {
    let n = 0;
    const b = BASE[channel];
    for (let i = b; i < b + CHANNEL_CAPS[channel]; i++) if (this.life[i] > 0) n++;
    return n;
  }

  clear() {
    this.life.fill(0);
  }

  /** Take a slot in the channel. A free one if there is one, else the oldest. Returns the index. */
  emit(channel: number, kind: number, x: number, y: number, vx: number, vy: number, life: number, color: number, grav = 0, drag = 0) {
    const b = BASE[channel];
    const end = b + CHANNEL_CAPS[channel];
    let slot = -1;
    let oldest = b;
    for (let i = b; i < end; i++) {
      if (this.life[i] <= 0) {
        slot = i;
        break;
      }
      if (this.born[i] < this.born[oldest]) oldest = i;
    }
    if (slot < 0) slot = oldest;
    this.x[slot] = x;
    this.y[slot] = y;
    this.vx[slot] = vx;
    this.vy[slot] = vy;
    this.life[slot] = life;
    this.maxLife[slot] = life;
    this.grav[slot] = grav;
    this.drag[slot] = drag;
    this.kind[slot] = kind;
    this.color[slot] = color;
    this.born[slot] = ++this.serial;
    return slot;
  }

  /** One tight loop over the arrays. Velocity, then drag, then gravity, then life. */
  update(dt: number) {
    if (dt <= 0) return;
    for (let i = 0; i < TOTAL; i++) {
      if (this.life[i] <= 0) continue;
      const keep = Math.max(0, 1 - this.drag[i] * dt);
      this.vx[i] *= keep;
      this.vy[i] = this.vy[i] * keep + this.grav[i] * dt;
      this.x[i] += this.vx[i] * dt;
      this.y[i] += this.vy[i] * dt;
      this.life[i] -= dt;
    }
  }

  /** Late in life a chip shows its small frame. Detail in the texture, not the count. */
  frameOf(i: number) {
    return this.life[i] < this.maxLife[i] * 0.35 ? 1 : 0;
  }

  // ---- Named bursts. Visual only; called at event points that already exist. ----

  /** The old spark(): four 2×2 chips born around the point, rising 10 px/s. Same look as before. */
  spark(x: number, y: number, color: number) {
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2;
      this.emit(CH_COMBAT, K_SPARK, x + Math.cos(a) * 5, y + Math.sin(a) * 4, 0, -10, 0.28, color);
    }
  }

  /** Slash connects: 3 to 6 rust or bone chips for 0.15s, thrown along the swing. A crit adds 2. */
  slash(x: number, y: number, aim: number, bone: boolean, crit: boolean) {
    const n = this.randInt(3, 6) + (crit ? 2 : 0);
    for (let i = 0; i < n; i++) {
      const a = aim + (this.rand() - 0.5) * 2.1;
      const sp = 45 + this.rand() * 35;
      const color = bone ? C_BONE : this.rand() < 0.5 ? C_RUST : C_BONE;
      this.emit(CH_COMBAT, bone || this.rand() < 0.5 ? K_BONE : K_SPARK, x, y, Math.cos(a) * sp, Math.sin(a) * sp - 20, 0.15, color, 220, 2);
    }
  }

  /** Whirl: 8 to 12 dust specks in a ring at the feet for 0.2s, pushed outward. */
  whirl(x: number, y: number) {
    const n = this.randInt(8, 12);
    const spin = this.rand() * Math.PI * 2;
    for (let i = 0; i < n; i++) {
      const a = spin + (i / n) * Math.PI * 2;
      const cx = Math.cos(a);
      const cy = Math.sin(a) * 0.5;
      this.emit(CH_COMBAT, K_DUST, x + cx * 7, y + cy * 7, cx * 55, cy * 55, 0.2, C_DUST, 0, 5);
    }
  }

  /** Smite lands: one bolt mote and four white impact chips. */
  smite(x: number, y: number) {
    this.emit(CH_COMBAT, K_RING, x, y, 0, -12, 0.26, C_GOLD, 0, 1);
    for (let i = 0; i < 4; i++) {
      const a = Math.PI / 4 + (i / 4) * Math.PI * 2;
      this.emit(CH_COMBAT, K_SPARK, x, y, Math.cos(a) * 50, Math.sin(a) * 40, 0.2, C_WHITE, 120, 3);
    }
  }

  /**
   * Portal: 8 ash in a swirl for 0.3s, on the interact channel (rules: INTERACT, "Portal 8 ash swirl 0.3s").
   * Map writer (OWNER-APPROVED EXCEPTION 2026-10-01): a rift mouth swirls when you are near, go in, or come out.
   */
  portal(x: number, y: number) {
    const spin = this.rand() * Math.PI * 2;
    for (let i = 0; i < 8; i++) {
      const a = spin + (i / 8) * Math.PI * 2;
      const cx = Math.cos(a);
      const cy = Math.sin(a) * 0.5;
      // Tangent velocity: the ring turns as it closes in.
      this.emit(CH_INTERACT, K_ASH, x + cx * 9, y + cy * 9, -cy * 40 - cx * 12, cx * 20 - cy * 12, 0.3, i % 2 ? C_ASH_DARK : C_ASH, 0, 1);
    }
  }

  /** Health draught: three red ticks rising off the chest. */
  potion(x: number, y: number) {
    for (let i = 0; i < 3; i++) this.emit(CH_COMBAT, K_TICK, x - 4 + i * 4, y - (i === 1 ? 2 : 0), 0, -26, 0.4, C_RED, 0, 1.5);
  }

  /** A foe falls. Trash: 3 to 5 ash (bone for bone kin). Elite: 3 more. Named boss: 8 to 10 bone, outward. */
  death(x: number, y: number, tier: "trash" | "elite" | "boss", bone: boolean) {
    if (tier === "boss") {
      const n = this.randInt(8, 10);
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2 + this.rand() * 0.4;
        const sp = 50 + this.rand() * 30;
        this.emit(CH_COMBAT, K_BONE, x, y, Math.cos(a) * sp, Math.sin(a) * sp * 0.6 - 25, 0.6, i % 3 === 2 ? C_ASH : C_BONE, 140, 2);
      }
      return;
    }
    const n = this.randInt(3, 5) + (tier === "elite" ? 3 : 0);
    for (let i = 0; i < n; i++) {
      const vx = (this.rand() - 0.5) * 24;
      const vy = -12 - this.rand() * 12;
      const kind = bone && i % 2 === 0 ? K_BONE : K_ASH;
      const color = kind === K_BONE ? C_BONE : i % 2 ? C_ASH_DARK : C_ASH;
      this.emit(CH_COMBAT, kind, x + (this.rand() - 0.5) * 8, y - this.rand() * 6, vx, vy, 0.6 + this.rand() * 0.2, color, -8, 1.5);
    }
  }
}

/**
 * Build the atlas: one row per palette color, two cells per silhouette (full, small).
 * Every lit pixel is one flat palette color. Returns null outside a browser.
 */
export function buildAtlas(): HTMLCanvasElement | null {
  if (typeof document === "undefined") return null;
  const c = document.createElement("canvas");
  c.width = ATLAS_MASKS.length * 2 * ATLAS_CELL;
  c.height = FX_PALETTE.length * ATLAS_CELL;
  const ctx = c.getContext("2d");
  if (!ctx) return null;
  ctx.imageSmoothingEnabled = false;
  for (let row = 0; row < FX_PALETTE.length; row++) {
    ctx.fillStyle = FX_PALETTE[row];
    for (let k = 0; k < ATLAS_MASKS.length; k++) {
      for (let f = 0; f < 2; f++) {
        const mask = ATLAS_MASKS[k][f];
        const ox = (k * 2 + f) * ATLAS_CELL;
        const oy = row * ATLAS_CELL;
        for (let my = 0; my < mask.length; my++) {
          for (let mx = 0; mx < mask[my].length; mx++) if (mask[my][mx] === "#") ctx.fillRect(ox + mx, oy + my, 1, 1);
        }
      }
    }
  }
  return c;
}

/** Size of a silhouette frame, so a chip can be centered on its point. */
export function maskSize(kind: number, frame: number): [number, number] {
  const m = ATLAS_MASKS[kind][frame];
  return [m[0].length, m.length];
}
