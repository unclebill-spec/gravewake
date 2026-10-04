/**
 * playtest1p [OWNER-APPROVED 2026-10-04 01:10 ET: playtest1p view polish and big bosses]: how big a boss, a mini and a
 * rare are, and everything that has to grow with them so a fight stays fair.
 *
 * Bill (2026-10-04 01:10 ET): "bigger boss" — bosses at least 5x the player's size, minis and rares 2 to 3x. Since
 * playtest1c every boss was a people-scale body in a cold-fire ring. The scale rule (AGENTS.project.md, playtest1p):
 *
 *   BIG: boss 5, mini 3 (a remnant), rare 2 (a Stalker, a mimic, a naughty-list name), everyone else 1. Linear: a
 *   boss's cell is 80x160 against the hero's 16x32. The sprite writer draws each big rank at its own size
 *   (tools/sprite-writer/boss_writer.py, /art/sprites/big/); the 1x cell scaled whole-pixel stands in while it loads.
 *
 *   BODY (the hurtbox): how far past its feet point a body reaches. The hero's swing, the companion's and a spell's
 *   reach count to the body's edge, and the body's own reach (its swing, its cone, its nova) starts there.
 *   FOOT (the ground it stands on): walls and props stop the whole foot, so a big body never stands half in a wall, and
 *   the hero cannot walk into a fighting big body's foot (it can always step out).
 *   ARENA: the open ground a fight with a big body needs round its spot: its foot plus the dodge room (DODGE).
 *
 * Aimed marks keep their size (they are on the hero's spot: walking out of one takes as long as before); a nova round
 * the body grows by its BODY, and its tell grows with the radius (telegraph.ts tellFor), so it can still be walked out of.
 */
export const BIG = { boss: 5, mini: 3, rare: 2, mob: 1 } as const;
export type BigRank = keyof typeof BIG;
export const BODY: Record<BigRank, number> = { boss: 22, mini: 11, rare: 5, mob: 0 };
export const FOOT: Record<BigRank, { rx: number; ry: number }> = { boss: { rx: 18, ry: 8 }, mini: { rx: 9, ry: 4 }, rare: { rx: 4, ry: 2 }, mob: { rx: 0, ry: 0 } };
/** The ground clear of walls a fight needs past a big body's foot, so the hero can circle it (3 tiles). */
export const DODGE = 48;
/** A big body steps in from this far past its BODY when a fight opens (a mob from 28 px, as before). */
export const SPAWN_GAP = 1.6;
/** In a fight with a big body within `near` px the camera frames the body and the hero together (the box round both,
 * centred), the hero's own body always kept `edge` px inside the view; when both cannot fit, the hero stays in and the
 * far side of the big body is what goes off screen. (A 5x boss is 143 px tall: on a phone's ~195 px high view a lean
 * halfway to its middle cut up to 20 px off its head with the hero level with it.) */
export const CAM = { near: 260, edge: 12, heroUp: 28, heroW: 8 } as const;

export type Ranked = { boss?: boolean; mini?: boolean; rare?: boolean; naughty?: string; mimic?: boolean };
export function rankOf(r: Ranked): BigRank {
  return r.boss ? "boss" : r.mini ? "mini" : r.rare || r.naughty || r.mimic ? "rare" : "mob";
}
export const scaleOf = (r: Ranked): number => BIG[rankOf(r)];
export const bodyR = (r: Ranked): number => BODY[rankOf(r)];
export const footOf = (r: Ranked): { rx: number; ry: number } => FOOT[rankOf(r)];
/** The open radius a fight with this body needs round its feet. */
export const arenaR = (r: Ranked): number => (rankOf(r) === "mob" ? 0 : FOOT[rankOf(r)].rx + DODGE);

/** How far into a foot ellipse a point is: under 1 is inside. */
export function footDepth(fx: number, fy: number, foot: { rx: number; ry: number }, x: number, y: number): number {
  if (!foot.rx) return Infinity;
  const dx = (x - fx) / foot.rx;
  const dy = (y - fy) / foot.ry;
  return dx * dx + dy * dy;
}
/** The points of a foot the walls are tested at (its middle and its rim). A mob's foot is its one point. */
export function footPoints(x: number, y: number, foot: { rx: number; ry: number }): [number, number][] {
  if (!foot.rx) return [[x, y]];
  const out: [number, number][] = [[x, y]];
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    out.push([x + Math.cos(a) * foot.rx, y + Math.sin(a) * foot.ry]);
  }
  return out;
}

const SHEET = "/art/sprites/big/";
const FESTIVAL_BIG: Record<string, string> = { pumpkinlord: "pumpkin-lord", krampus: "krampus" };
/** The big sheet a body draws from (four views down: front, back, east, west; eleven poses across), or null. */
export function bigSheet(family: string, rank: BigRank): string | null {
  if (rank === "mob") return null;
  if (FESTIVAL_BIG[family]) return rank === "boss" ? `${SHEET}${FESTIVAL_BIG[family]}-boss.png` : null;
  if (family === "mimic") return `${SHEET}mimic-rare.png`;
  return `${SHEET}${family}-${rank}.png`;
}
export const bigMask = (url: string): string => url.replace(/\.png$/, "_em.png");
/** The big sheet's row for a face (0 south, 1 east, 2 north, 3 west). */
export const bigRow = (face: number): number => (face === 2 ? 1 : face === 1 ? 2 : face === 3 ? 3 : 0);
/** Where a scale-s cell's top-left sits from the feet point: the feet stay on the 1x foot line (row 29 two px up). */
export const cellAt = (s: number): { dx: number; dy: number; w: number; h: number } => ({ dx: -8 * s, dy: -2 - 30 * s, w: 16 * s, h: 32 * s });
/** How high the top of a scale-s body stands over its feet (a label or health bar goes over it). */
export const headroom = (s: number): number => 28 * s + 3;
