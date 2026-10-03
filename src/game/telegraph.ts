/**
 * playtest1j [OWNER-APPROVED 2026-10-03: telegraphed attacks]: readable warnings before big attacks, boss phases and
 * patterns. Bill (2026-10-03 08:41 ET): "foes, and bosses most of all, show a readable warning before big attacks ... so
 * you can dodge out. Bosses get 2-3 patterns and change phase at 50% HP. Keep it fair on touch controls."
 *
 * The sim keeps one combat language (Layout Two): a foe marks a spot, the mark fills over its tell, and whoever stands in
 * it when the tell ends eats the hit. This module only holds the numbers and pure helpers; sim.ts reads them and draw.ts
 * paints the marks and the wind-up glow from the same state (r.tell, r.tellMax, r.casting, r.markX/Y/R, r.phase).
 *
 * Fair on touch: every mid and big mark can be walked out of from its centre at walking pace, with TELL.reaction to spare
 * (a thumb on the stick is slower than a key). The rare's 0.35 s tint (the law's short tell) is unchanged.
 */

/** Walking pace (px/s, the law's 74). */
export const WALK_PACE = 74;

export const TELL = {
  /** Base tells by slot (the law: rare 0.35 s tint, mini 0.5 s mark, boss big 0.8-1.2 s). */
  spam: 0.35,
  mid: 0.5,
  big: 1,
  /** Phase two's big is quicker (the law's floor, 0.8 s), never under the fair floor. */
  bigPhase2: 0.8,
  /** The echo: a second mark where the hero stepped to. */
  echo: 0.6,
  /** Seconds kept back for a thumb on a touch stick to react. */
  reaction: 0.2,
  /** The law's cap for a boss's big tell. */
  cap: 1.2,
} as const;

export const PHASE = {
  /** A boss turns to phase two at or under this share of its HP. */
  at: 0.5,
  /** Big moves come this often (s) in phase one (the old cycle) and two. */
  cycle1: 8,
  cycle2: 6,
  /** The nova: a ring around the boss itself. */
  novaR: 52,
  /** The phase-change roar: the boss stands, glowing, for this long (no hit). */
  roar: 0.8,
} as const;

/** The mark radius a tag paints (the sim's old table, unchanged). */
export function markRadius(tag: string): number {
  return tag === "line" ? 18 : tag === "cone" ? 64 : tag === "pull" ? 56 : 40;
}

/** A line's hit half-width (sim nearLine: 16 px either side of the sweep). */
export const LINE_HALF = 16;
/** The distance a hero standing on the mark's centre must walk to be clear of it. A line is stepped off sideways. */
export function escapeDistance(tag: string, rad: number): number {
  return tag === "line" ? LINE_HALF : rad;
}

/** The fair floor: walk out from the centre at WALK_PACE with TELL.reaction to spare. */
export function fairTell(tag: string, rad: number): number {
  return Math.round((escapeDistance(tag, rad) / WALK_PACE + TELL.reaction) * 100) / 100;
}

/**
 * The tell a cast gets. Spam (a rare's tint, the mimic's bite) keeps the law's 0.35 s; a mid or big mark is never shorter
 * than its fair floor, and a big never longer than the law's cap.
 */
export function tellFor(slot: "mid" | "big" | "spam", tag: string, base: number, rad = markRadius(tag)): number {
  if (slot === "spam") return base;
  const t = Math.max(base, fairTell(tag, rad));
  return slot === "big" ? Math.min(TELL.cap, t) : t;
}

/** Big moves that hit a spot (a summon, a shield or a blink is not aimed at the ground, so it keeps its one form). */
export const PATTERN_TAGS = new Set(["ring", "cone", "line", "pull", "dark"]);
/**
 * The big-move pattern a boss uses on its n-th big (n from 0): phase one always aims at the hero; phase two alternates
 * the nova (a ring round the boss itself: get away from it) and aim + echo (a second mark where the hero stepped to).
 */
export type Pattern = "aim" | "nova" | "echo";
export function bigPattern(phase: number, n: number, tag = "ring"): Pattern {
  if (phase < 2 || !PATTERN_TAGS.has(tag)) return "aim";
  return n % 2 === 0 ? "nova" : "echo";
}

/** Telegraph colours (Bill's gloom-and-glow neon): big red, mid violet, a rare's short tint cold blue. */
export const MARK_NEON = { big: "#ff3a4f", mid: "#b07aff", spam: "#4ab8ff", trap: "#b07aff" } as const;
export type MarkSlot = keyof typeof MARK_NEON;
export function markSlot(casting: string | undefined): MarkSlot {
  return casting === "big" ? "big" : casting === "spam" ? "spam" : "mid";
}
/** How far a tell has run, 0 at the start to 1 as it lands. */
export function tellProgress(tell: number | undefined, max: number | undefined): number {
  if (!max || max <= 0 || tell == null) return 1;
  return Math.max(0, Math.min(1, 1 - tell / max));
}
