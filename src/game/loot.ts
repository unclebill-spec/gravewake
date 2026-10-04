/**
 * playtest1o ([OWNER-REQUESTED 2026-10-03 19:49 ET: playtest1o motion, collision and art check]): the loot icons. Looks only.
 *
 * Bill (2026-10-03 19:49 ET): "All the graphics in the entire game are upgraded to the same level?" The drops on the
 * ground were the last world art still painted as two or three flat rectangles (draw.ts paintDrop), and the Pack
 * listed gear as words only. tools/pixel-writer/loot_writer.py draws each as a 16x16 writer cell (loot.png, LOOT
 * order); the ground drop and the Pack's slots and rows use the same cell.
 */
import type { Item } from "./content";

export const LOOT_SHEET = "/art/writer/loot.png";
/** The ore crystals a cave floor shows now and then (loot_writer.ore): violet, blue, red, green. */
export const ORE_SHEET = "/art/writer/cave-ore.png";
/** Cell order in loot.png (loot_writer.LOOT). */
export const LOOT = ["silver", "potion", "mana", "gem", "head", "chest", "legs", "feet", "ring", "neck", "off", "fish", "bait", "weapon", "bundle", "jewel"] as const;
export type LootKind = (typeof LOOT)[number];

/** The icon for a drop or an item: silver, a draught by its drink, gear by its slot (a locket is a necklace), then by kind. */
export function lootKind(item: Pick<Item, "kind" | "slot" | "bonus"> | null | undefined, silver = 0): LootKind {
  if (silver > 0 || !item) return "silver";
  if (item.kind === "potion") return (item.bonus ?? 1) === 2 ? "mana" : "potion";
  if (item.slot === "main") return "weapon";
  if (item.slot) return item.slot;
  if (item.kind === "gem") return "gem";
  if (item.kind === "jewel") return "jewel";
  if (item.kind === "fish") return "fish";
  if (item.kind === "bait") return "bait";
  if (item.kind === "weapon") return "weapon";
  return "bundle";
}
export const lootCell = (item: Pick<Item, "kind" | "slot" | "bonus"> | null | undefined, silver = 0): number => LOOT.indexOf(lootKind(item, silver));
/** The empty slot's icon in the Pack (the same cell, dimmed). */
export const slotCell = (slot: string): number => LOOT.indexOf((slot === "main" ? "weapon" : slot) as LootKind);
