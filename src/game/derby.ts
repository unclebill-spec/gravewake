/**
 * The Midnight Derby (item 9, owner-approved feature list 2026-09-30): a fishing tournament at the
 * Drowned Hook.
 *
 * Reuses the existing fishing (cast, reel band, CATCHES, bait bias), the day-night calendar (a derby
 * night is fixed by the day count, like the six-day season names), the Hookkeep's talk panel, and the
 * saved opened list. While you are entered, some catches come up witchlit: a magical fish with a size.
 * Weigh your biggest at the shack before dawn. Beat the board's mark and a trophy hangs in your croft.
 */
import { CYCLE_MS, mulberry } from "./content";
import { featSeed } from "./feats";

/** Item 9's own numbers. Nothing in combat changes. */
export const DERBY = {
  /** A derby night every this many day-night cycles: day 2, 5, 8 ... (the 3rd and 6th of each six-day season). */
  every: 3,
  offset: 2,
  /** Share of catches that come up witchlit while you are entered. */
  magicChance: 0.4,
  /** Witchlit size range in inches, in CATCHES order (Pale carp ... Moon pike). */
  sizes: [
    [8, 14],
    [9, 16],
    [12, 22],
    [14, 26],
    [18, 34],
    [22, 40],
  ] as [number, number][],
  /** The board's mark to beat: the rival's best, seeded per derby, in inches. */
  markMin: 20,
  markMax: 34,
  /** A later win, with the trophy already on your wall, pays this many fish points. */
  repeatPoints: 20,
  /** Where the trophy hangs: the croft's back wall, right of centre. */
  trophyX: 9,
  trophyY: 0,
} as const;

/** The day count of a world time. */
export function dayOf(ms: number) {
  return Math.floor(ms / CYCLE_MS);
}

/** True on a derby day. The derby itself runs through that day's night. */
export function derbyDay(day: number) {
  return day >= 0 && day % DERBY.every === DERBY.offset;
}

/** The board's mark for one derby: the rival's best, seeded by the day. */
export function derbyMark(day: number) {
  const r = mulberry(featSeed("derby", day, "mark"))();
  return DERBY.markMin + Math.floor(r * (DERBY.markMax - DERBY.markMin + 1));
}

/** A witchlit catch's size for CATCHES index i, from a roll in [0, 1). */
export function derbySize(i: number, roll: number) {
  const [lo, hi] = DERBY.sizes[Math.max(0, Math.min(DERBY.sizes.length - 1, i))];
  return lo + Math.floor(roll * (hi - lo + 1));
}

/** The rival on the board (a name only). */
export function derbyRival(day: number) {
  const names = ["Old Marrow", "Widow Pike", "Hollis the Ferryman", "Sister Reed"];
  return names[Math.floor(mulberry(featSeed("derby", day, "rival"))() * names.length)];
}
