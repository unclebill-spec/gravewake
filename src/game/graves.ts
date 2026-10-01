/**
 * Grave digging at night (item 8, owner-approved feature list 2026-09-30).
 *
 * Reuses what is already in the game: the town yard's own grave tiles (no tile is written), a tool
 * sold like the Rib pole (tackle, by the undertaker), the existing "world" drop table, the zombie
 * family at the town gate's zone level, and the saved opened list. Each grave can be turned once a
 * night. Whether a zombie claws up is seeded by night and grave (FNV-1a into mulberry), so a reload
 * cannot reroll it.
 */
import { mulberry } from "./content";
import { featSeed } from "./feats";

/** Item 8's own numbers. Nothing else in combat changes. */
export const DIG = {
  /** The tool: sold by the undertaker at this price (tackle price is its bonus, as the Rib pole's 15). */
  spadePrice: 12,
  /** Share of digs that wake a zombie beside the grave. About one in four. */
  wakeChance: 0.25,
  /** Drops from the existing "world" table (the trail-cache table) per dig. */
  drops: 1,
} as const;

/** The opened-list key for one grave turned on one night. */
export function digKey(night: number, x: number, y: number) {
  return `dug:${night}:${x}:${y}`;
}

/** True when this grave, dug on this night, wakes a zombie. Same night and grave, same answer. */
export function digWakes(night: number, x: number, y: number) {
  return mulberry(featSeed("dig", night, `${x},${y}`))() < DIG.wakeChance;
}
