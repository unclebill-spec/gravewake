/**
 * playtest1s [OWNER-APPROVED 2026-10-04 13:42 ET: playtest1s companion steps back from a boss]: the companion gives a big
 * body room. Bill (2026-10-04 13:42 ET): "Have my companion step back when a boss walks up". Until now a companion (on
 * Focus most of all) stood fast at a boss's edge while the boss walked into it, and stood in a telegraphed mark until it
 * landed.
 *
 * The rule (sim.ts Game.allySpace reads it once a move; numbers and pure geometry only here, nothing saved):
 *   - A big body (a boss, a mini or a rare: bigboss.ts rankOf) in a fight whose own shape (bigshapes.ts through bodyR and
 *     footOf: the wider of its hurt radius and its foot toward the companion) comes within `near` px of the companion has
 *     walked up to it. The companion backs off to the spacing ring, `ring` px past that edge (inside its own swing reach,
 *     28 past the edge, so a Focus keeps hitting from there), on the hero's side of the body (at most `side` radians round
 *     from the hero), clear of the hero's feet, walls, props, fire, a lit fuse's blast, spike plates and other marks. It
 *     walks round the body, never through it, and minds it until it is `leave` px past the ring.
 *   - A live telegraphed mark (an aimed circle, a nova round the body, a line sweep) it stands in, it steps out of by the
 *     nearest way, `pad` px past the mark's edge, and keeps its order's spot out of the mark until the mark lands; then
 *     it goes back in (a Focus darts back to the body's edge).
 *   - A companion taunting the body holds its ground (playtest1k: the taunted body walks to it and its marks land on it;
 *     that is the order's point). It still backs off if the body walks into it.
 *   - Stay holds the spot it was told to; it steps aside like the others and walks back when the spot is clear.
 * Damage, reach, tells and every number of the fight are unchanged; only where the companion stands moves.
 */
export const ALLY_SPACE_TAG = "[OWNER-APPROVED 2026-10-04 13:42 ET: playtest1s companion steps back from a boss]";

export const ALLY_SPACE = {
  /** A big body's edge this close (px) has walked up to the companion. */
  near: 12,
  /** The spacing ring: px past the body's edge (the companion's swing reaches 28 past it). */
  ring: 22,
  /** It minds the body until it stands this far past the ring. */
  leave: 8,
  /** How far round the body from the hero's side (radians, about 65 degrees) the ring spot may be. */
  side: 1.13,
  /** The most it walks round the body in one leg (radians), so its way goes round the body, not through it. */
  arc: 0.5,
  /** The ring spot keeps this far from the hero's feet. */
  heroGap: 12,
  /** It stands this far past a mark's edge. */
  pad: 8,
  /** Seconds without getting anywhere before it tries the body's other side. */
  stuck: 0.5,
} as const;

/** The half-width of a line sweep (telegraph.ts LINE_HALF; sim nearLine). */
export const SWEEP_HALF = 16;

export type Pt = { x: number; y: number };
export type Foot = { rx: number; ry: number };
/** A telegraphed area: a circle (x, y, r) or a line sweep from (x0, y0) to (x, y). */
export type Area = { x0: number; y0: number; x: number; y: number; r: number; line: boolean };

export const wrap = (a: number): number => Math.atan2(Math.sin(a), Math.cos(a));

/** How far a big body reaches toward angle a: the wider of its hurt radius and its foot ellipse that way. */
export function edgeAt(body: number, foot: Foot, a: number): number {
  const f = foot.rx && foot.ry ? (foot.rx * foot.ry) / Math.hypot(foot.ry * Math.cos(a), foot.rx * Math.sin(a)) : 0;
  return Math.max(body, f);
}

/** The gap (px) from a big body's edge to a point (negative inside it). */
export function gapOf(b: Pt, body: number, foot: Foot, x: number, y: number): number {
  return Math.hypot(x - b.x, y - b.y) - edgeAt(body, foot, Math.atan2(y - b.y, x - b.x));
}

/** The spot on the spacing ring at angle a. */
export function ringAt(b: Pt, body: number, foot: Foot, a: number, ring: number = ALLY_SPACE.ring): Pt {
  const r = edgeAt(body, foot, a) + ring;
  return { x: b.x + Math.cos(a) * r, y: b.y + Math.sin(a) * r };
}

/** The ring angle on the hero's side: the companion's own angle round the body, held within `side` of the hero's
 * (mirror: the far side of the hero's, for a companion that got stuck on the near one). */
export function sideAngle(b: Pt, c: Pt, hero: Pt, side: number = ALLY_SPACE.side, mirror = false): number {
  const ah = Math.atan2(hero.y - b.y, hero.x - b.x);
  let d = wrap(Math.atan2(c.y - b.y, c.x - b.x) - ah);
  if (mirror) d = -d || side;
  return ah + Math.max(-side, Math.min(side, d));
}

/** Is a point in an area (grown by pad px)? */
export function inArea(m: Area, x: number, y: number, pad = 0): boolean {
  if (!m.line) return Math.hypot(x - m.x, y - m.y) < m.r + pad;
  const dx = m.x - m.x0;
  const dy = m.y - m.y0;
  const len = dx * dx + dy * dy || 1;
  const t = Math.max(0, Math.min(1, ((x - m.x0) * dx + (y - m.y0) * dy) / len));
  return Math.hypot(x - (m.x0 + dx * t), y - (m.y0 + dy * t)) < SWEEP_HALF + pad;
}

/** The nearest spot pad px out of an area from p (a circle: straight out from its middle; a sweep: straight off its
 * line), then its neighbours round the area, nearest first; `toward` breaks a tie at the very middle. */
export function exits(m: Area, p: Pt, toward: Pt, pad: number = ALLY_SPACE.pad): Pt[] {
  const out: Pt[] = [];
  if (!m.line) {
    const d = Math.hypot(p.x - m.x, p.y - m.y);
    const a0 = d > 0.5 ? Math.atan2(p.y - m.y, p.x - m.x) : Math.atan2(toward.y - m.y, toward.x - m.x);
    const r = m.r + pad;
    for (let k = 0; k <= 8; k++) for (const s of k ? [1, -1] : [1]) out.push({ x: m.x + Math.cos(a0 + s * k * 0.35) * r, y: m.y + Math.sin(a0 + s * k * 0.35) * r });
    return out;
  }
  const dx = m.x - m.x0;
  const dy = m.y - m.y0;
  const L = Math.hypot(dx, dy) || 1;
  const ux = dx / L;
  const uy = dy / L;
  const t = Math.max(0, Math.min(L, (p.x - m.x0) * ux + (p.y - m.y0) * uy));
  const side = (p.x - m.x0) * -uy + (p.y - m.y0) * ux;
  const s0 = Math.abs(side) > 0.5 ? Math.sign(side) : Math.sign((toward.x - m.x0) * -uy + (toward.y - m.y0) * ux) || 1;
  const off = SWEEP_HALF + pad;
  for (const s of [s0, -s0]) for (const k of [0, 12, -12, 24, -24]) {
    const tt = t + k;
    out.push({ x: m.x0 + ux * tt - uy * off * s, y: m.y0 + uy * tt + ux * off * s });
  }
  out.push({ x: m.x + ux * off, y: m.y + uy * off });
  return out;
}

/** Push a spot out of an area (the order's spot while a mark is live): straight out, pad px past its edge. */
export function pushOut(m: Area, p: Pt, toward: Pt, pad: number = ALLY_SPACE.pad): Pt {
  return inArea(m, p.x, p.y, pad) ? exits(m, p, toward, pad)[0] : p;
}
