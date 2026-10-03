/**
 * playtest1k [OWNER-APPROVED 2026-10-03: elemental combos, companion commands]: one-tap orders for the bond companion.
 * Bill (2026-10-03 08:41 ET): "Taunt, Heal or Guard me, Focus my target, and Stay or Follow. They need a touch UI that fits
 * the HUD and display presets, plus gamepad and keyboard binds. Companions without a heal can use a fallback such as
 * guarding."
 *
 * Numbers and labels only; sim.ts (Game.order) carries them out. Orders are never saved: a loaded game follows.
 */
export type Order = "taunt" | "guard" | "focus" | "stay";
export const ORDERS: readonly Order[] = ["taunt", "guard", "focus", "stay"];

export const ORDER = {
  /** Taunt: foes within tauntR of the companion turn on it for taunt s (a boss for half that); taunt6 s when the
   * companion knows a taunting art (Taunt, Bark, Grave Anchor). It falls back when it drops under tauntFloor of its HP. */
  tauntR: 72,
  taunt: 4,
  tauntArt: 6,
  tauntFloor: 0.3,
  /** Heal or Guard me: a companion with a heal casts its best heal now; one without guards you for guard s: it steps
   * to your side and every hit on you is cut to guardCut of itself (never under 1). */
  guard: 5,
  guardCut: 0.7,
  /** Focus my target: the foe you last hit (or the nearest within focusR) for focus s; it walks over to reach it. */
  focus: 8,
  focusR: 120,
  /** Stay: it holds its spot and fights from there; it catches up by itself past stayLeash tiles. */
  stayLeash: 10,
  /** Cooldowns (s). */
  cool: { taunt: 12, guard: 10, focus: 3, stay: 0.4 } as Record<Order, number>,
} as const;

/** Button and log labels (the touch strip's short labels fit a 40 px button; the long ones go in help and binds). */
export const ORDER_LABEL: Record<Order, { short: string; long: string }> = {
  taunt: { short: "Taunt", long: "Taunt" },
  guard: { short: "Aid", long: "Heal or guard me" },
  focus: { short: "Focus", long: "Focus my target" },
  stay: { short: "Stay", long: "Stay or follow" },
};
