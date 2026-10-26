/**
 * Rift-confirm batch (C), 2026-10-26: the night rim on interactables (graves, the bounty board, cracked brick) was a
 * hard 600 ms on / 600 ms off blink. It is now a steady 1px #b07aff rim (the same colour) with a slow, low halo pulse:
 * a 1px ring just outside it that steps through the palette's violet ramp (none, #4a2a78, #7a5ad0) and back over
 * RIM_PERIOD ms. Stepped and palette-locked: hard pixels only, no alpha, no anti-alias. Pure; draw.ts paints it.
 */
export const RIM_COLOR = "#b07aff";
export const RIM_PERIOD = 2400;
/** The halo's steps, dimmest first (null: no halo). Violet ramp shades below the rim. */
export const RIM_HALO: readonly (string | null)[] = [null, "#4a2a78", "#7a5ad0"];

/** The halo colour at time ms: a stepped triangle wave (0,1,2,1,...) over RIM_PERIOD. */
export function rimHalo(ms: number): string | null {
  const p = (((ms % RIM_PERIOD) + RIM_PERIOD) % RIM_PERIOD) / RIM_PERIOD;
  const tri = p < 0.5 ? p * 2 : 2 - p * 2; // 0..1..0
  const step = Math.min(RIM_HALO.length - 1, Math.floor(tri * RIM_HALO.length));
  return RIM_HALO[step];
}
