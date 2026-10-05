/**
 * playtest1u [OWNER-APPROVED 2026-10-04 21:00 ET: playtest1u HUD declutter] (Bill, 2026-10-04 9:00 and 9:01 PM ET): the HUD
 * has no Pause button. A quick double tap on the character panel (the portrait and its compact card, top left) pauses or
 * resumes; a double tap anywhere else does nothing special, and a single tap there does nothing. Esc/P, the pad's Start,
 * the pause on minimize or on leaving fullscreen, "Tap to resume" and "Leave game?" are as they were. The panel keeps only
 * the name and level, the bars, the purse and clock, the companion and the lines that matter now; the rarer ones are in
 * the pause menu. The log hides a few seconds after its line changes, the corner map is smaller and see-through, and the
 * right-hand buttons are a little smaller and fade while idle. Numbers only here (Gravewake.tsx reads them).
 */
export const HUD_TAG = "[OWNER-APPROVED 2026-10-04 21:00 ET: playtest1u HUD declutter]";

/** Two taps within ms of each other, at most px apart, on the panel; the one-time hint shows hintS s of play. */
export const HUD_TAP = { ms: 300, px: 32, hintS: 8 } as const;
/** The panel's least touch area (css px) on every preset. */
export const HUD_HIT = 44;
/** The log shows this long (ms) after its line changes; the touch buttons fade this long (ms) after the last press. */
export const HUD_FADE = { log: 4000, idle: 3000, idleOpacity: 0.55, busyOpacity: 0.92 } as const;
/** The corner map's css size (its canvas stays 96 px) and its opacity. */
export const MINI_CSS = 80;
export const MINI_OPACITY = 0.82;
export const PAUSE_HINT_KEY = "gravewake-hint-pause-v1";

export type Tap = { t: number; x: number; y: number };
/** Is this tap (at t ms, x, y css px) the second of a double tap after `last`? */
export function doubleTap(last: Tap | null, t: number, x: number, y: number): boolean {
  return !!last && t - last.t >= 0 && t - last.t <= HUD_TAP.ms && Math.hypot(x - last.x, y - last.y) <= HUD_TAP.px;
}
