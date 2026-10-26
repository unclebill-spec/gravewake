/**
 * MB sprint Oct 26 (b), QA spec #13 (HANDOFF known issue): summer vale nights were ~84% near-black because the summer
 * ground is darker. Summer alone takes a lifted moon on the vale, villages and camp; blue still leads so it reads as
 * night, and every other season keeps LIGHT.worldNight exactly. Visual only: nothing in the sim reads it.
 */
import type { SeasonId } from "./seasons";

import type { RGB } from "./light";

/** Summer's vale night (LIGHT.worldNight is [0.32, 0.34, 0.62]). */
export const SUMMER_NIGHT: RGB = [0.44, 0.46, 0.76];

/**
 * Oct 26 rift-confirm batch (A), summer nights darker: the summer ground's main colours sit right at near-black, so one
 * flat level jumps from ~20% (SUMMER_NIGHT) to ~60-67% (two hundredths lower). Instead of one level, every other pixel
 * (a world-locked 1px checker, the light layer's own ordered dither, no anti-alias) takes this deeper level: ~40%
 * near-black on Phone. Lights, the hero's silhouette floor and emissives (neon) still sit on top, unchanged.
 */
export const SUMMER_NIGHT_DEEP: RGB = [0.4, 0.42, 0.72];

export function valeNight(season: SeasonId, base: RGB): RGB {
  return season === "summer" ? SUMMER_NIGHT : base;
}

/** The checker's second level, or null where the night is one flat level (every season but summer). */
export function valeNightDeep(season: SeasonId): RGB | null {
  return season === "summer" ? SUMMER_NIGHT_DEEP : null;
}
