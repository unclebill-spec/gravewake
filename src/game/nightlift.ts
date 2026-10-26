/**
 * MB sprint Oct 26 (b), QA spec #13 (HANDOFF known issue): summer vale nights were ~84% near-black because the summer
 * ground is darker. Summer alone takes a lifted moon on the vale, villages and camp; blue still leads so it reads as
 * night, and every other season keeps LIGHT.worldNight exactly. Visual only: nothing in the sim reads it.
 */
import type { SeasonId } from "./seasons";

import type { RGB } from "./light";

/** Summer's vale night (LIGHT.worldNight is [0.32, 0.34, 0.62]). */
export const SUMMER_NIGHT: RGB = [0.44, 0.46, 0.76];

export function valeNight(season: SeasonId, base: RGB): RGB {
  return season === "summer" ? SUMMER_NIGHT : base;
}
