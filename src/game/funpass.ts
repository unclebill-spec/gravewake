/**
 * gw-blade-1030 fun pass (docs/standard-game-update.md "Fun pass"): juice for the swinging blade only. Picture, sound and log
 * lines; no rule, timing, damage or BALANCE number changes. Everything here sits behind FUN.blade (false = the blade as merged
 * in mb-sprint-1026, plus nothing). Player-visible bits are listed in HANDOFF.md under "Fun pass".
 */
import { TRAPS } from "./content";
import type { Trap } from "./feats";

export const FUN = { blade: true };

/** Wind-up (draw only): through the telegraph (bladeTell s) the blade cocks back up to 4 px away from the way it will swing,
 * and shivers 1 px in the last 0.12 s. Returns a pixel offset to add to its drawn x. 0 outside the telegraph or with FUN off. */
export function bladeWindup(trap: Trap, seconds: number): number {
  if (!FUN.blade) return 0;
  const c = TRAPS.bladeCycle;
  const s = seconds + trap.phase * c;
  const n = Math.floor(s / c);
  const t = s - n * c;
  const tellStart = c - TRAPS.bladeSweep - TRAPS.bladeTell;
  if (t < tellStart || t >= c - TRAPS.bladeSweep) return 0;
  const k = (t - tellStart) / TRAPS.bladeTell; // 0..1
  const dir = n % 2 === 0 ? 1 : -1; // the swing's way: it cocks the other way
  const back = Math.round(4 * k * k);
  const shiver = c - TRAPS.bladeSweep - t < 0.12 ? (Math.floor(seconds * 60) % 2 ? 1 : -1) : 0;
  return -dir * back + shiver;
}

/** Near-miss lines: the hero stood in the lane during the telegraph and stepped out before the sweep. 1 in 12 gets the rare one. */
export const NEAR_MISS = ["Close shave!", "The blade hisses past.", "Steel whistles by your ear."] as const;
export const NEAR_MISS_RARE = "The blade trims your hair. Stylish.";
export function nearMissLine(roll: number, pick: number): string {
  return roll < 1 / 12 ? NEAR_MISS_RARE : NEAR_MISS[Math.floor(pick * NEAR_MISS.length) % NEAR_MISS.length];
}
