/**
 * gw-blade-1030 fun pass (docs/standard-game-update.md "Fun pass"): juice for the swinging blade only. Picture, sound and log
 * lines; no rule, timing, damage or BALANCE number changes. Everything here sits behind FUN.blade (false = the blade as merged
 * in mb-sprint-1026, plus nothing). Player-visible bits are listed in HANDOFF.md under "Fun pass".
 */
import { TRAPS } from "./content";
import type { Trap } from "./feats";

export const FUN = { blade: true, mossFlare: true };

/** gw-c-1030 fun pass (moss set): a cemetery lamp or orb flares up as the hero walks by. Light radius multiplier for a
 * prop light at distance d px from the hero: 1 past MOSS_FLARE_R, up to 1 + MOSS_FLARE_GAIN right beside it. Looks only. */
export const MOSS_FLARE_R = 40;
export const MOSS_FLARE_GAIN = 0.5;
export function mossFlare(d: number): number {
  if (!FUN.mossFlare || d >= MOSS_FLARE_R) return 1;
  return 1 + MOSS_FLARE_GAIN * (1 - Math.max(0, d) / MOSS_FLARE_R);
}

/** Wind-up (draw only). gw-blade-b-1030 (GD fast-follow B): through the telegraph (bladeTell s) the blade cocks back
 * BLADE_PULL px against the way it will swing, reaching it in the first BLADE_PULL_IN of the tell and holding it, so it
 * shows past the purple box's end (draw.ts paints the cocked blade over the box). No shiver. Returns a pixel offset for its
 * drawn x; 0 outside the telegraph or with FUN off. The hit window, the tell start and the damage are untouched. */
export const BLADE_PULL = 6;
export const BLADE_PULL_IN = 0.35;
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
  return -dir * Math.max(1, Math.round(BLADE_PULL * Math.min(1, k / BLADE_PULL_IN)));
}

/** gw-c-1030 (GD queued item a): the blade sprite's lit pixels start BLADE_SPRITE_MARGIN px inside its 16 px cell, so at
 * the lane end only 6 - 3 = 3 px of the wind-up showed past the purple box. Before the sweep (rest and tell) the blade is
 * drawn BLADE_REST_OUT px further out the way it will swing from, so the full 6 px pull reads outside the box. Draw only:
 * bladeStage, bladeSwing, the hit lane, the tell and the damage are untouched (scripts/blade-nudge.test.mjs). */
export const BLADE_SPRITE_MARGIN = 3;
export const BLADE_REST_OUT = 3;
export function bladeRestNudge(trap: Trap, seconds: number): number {
  if (!FUN.blade) return 0;
  const c = TRAPS.bladeCycle;
  const s = seconds + trap.phase * c;
  const n = Math.floor(s / c);
  const t = s - n * c;
  if (t >= c - TRAPS.bladeSweep) return 0;
  return -(n % 2 === 0 ? 1 : -1) * BLADE_REST_OUT;
}

/** gw-blade-b-1030: the camera shake a blade cut asks for, in px at the default Screen shake (0.65). The shake's amplitude
 * is (amp x the slider), so the cut sets amp = BLADE_CUT_SHAKE_PX / 0.65: 2 px at the default, scaled by the slider, 0 off. */
export const SHAKE_DEFAULT_MUL = 0.65;
export const BASE_SHAKE_AMP = 2;
export const BLADE_CUT_SHAKE_PX = 2;
/** The drawn shake offset in px for a shake timer, amplitude and slider (draw.ts uses this). */
export function shakeOffset(shake: number, amp: number, mul: number): number {
  return shake > 0 ? Math.round(Math.sin(shake * 40) * amp * mul) : 0;
}
/** The largest shake a cut can draw over its 0.2 s, at a slider value. */
export function bladeCutPeakPx(mul: number): number {
  let peak = 0;
  for (let i = 0; i <= 2000; i++) peak = Math.max(peak, Math.abs(shakeOffset((0.2 * i) / 2000, BLADE_CUT_SHAKE_PX / SHAKE_DEFAULT_MUL, mul)));
  return peak;
}

/** Near-miss lines: the hero stood in the lane during the telegraph and stepped out before the sweep. 1 in 12 gets the rare one. */
export const NEAR_MISS = ["Close shave!", "The blade hisses past.", "Steel whistles by your ear."] as const;
export const NEAR_MISS_RARE = "The blade trims your hair. Stylish.";
export function nearMissLine(roll: number, pick: number): string {
  return roll < 1 / 12 ? NEAR_MISS_RARE : NEAR_MISS[Math.floor(pick * NEAR_MISS.length) % NEAR_MISS.length];
}
