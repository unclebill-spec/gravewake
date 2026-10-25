/**
 * MB final pass 2 (Bill approved stats 2026-10-25): Story's items (docs/story/items.md) as real gear.
 * New names only; no existing item, foe, damage formula or HP is touched. Items are plain Item objects
 * (saved whole in the pack), so old saves load unchanged. Each is a sidegrade or a small step for its
 * tier against the shop gear it sits beside. The quests in docs/story are not built, so all are sold
 * in existing shops (appended after the seeded rolls, so seeded stock is unchanged).
 */
import { makeItem, type Item } from "./content";

type Armor = NonNullable<Item["armor"]>;

/** Name, where it is sold, and its stats, for HANDOFF and tests. */
export const STORY_ITEM_NAMES = [
  "Spectral Scythe", "Wraithbane Torch", "Mourner's Robe", "Ember Mittens", "Moonlit Mince Pie",
  "Wraith Soup", "Sage's Tea Set", "Lamplighter's Handbell", "Bone Car Lantern", "Silvered Thistle Pin",
] as const;

/** What a shop role adds. lv is the shop's level clamp (5..80); armor is the hero's class armour. */
export function storyStock(role: string, lv: number, armor: Armor): Item[] {
  if (role === "mystic") {
    return [
      // vs Moon Lantern (r2 off, atk 2, bonus 1, Lantern Flare): more bite, no bonus
      makeItem({ name: "Wraithbane Torch", kind: "weapon", rank: 2, slot: "off", hands: 1, atk: 3, active: "Lantern Flare" }),
      // vs Moon locket (r3 neck, bonus 1, ac 1, Ward): more bonus, no ward or armour
      makeItem({ name: "Lamplighter's Handbell", kind: "jewel", rank: 3, slot: "neck", bonus: 2 }),
      // vs Caster's ring (r2 ring, bonus 2): a little armour instead of bonus
      makeItem({ name: "Sage's Tea Set", kind: "jewel", rank: 2, slot: "ring", bonus: 1, ac: 1 }),
      // r3 ring: one rank up on Caster's ring, a small step
      makeItem({ name: "Bone Car Lantern", kind: "jewel", rank: 3, slot: "ring", bonus: 2, ac: 1 }),
      // r2 neck: armour over bonus
      makeItem({ name: "Silvered Thistle Pin", kind: "jewel", rank: 2, slot: "neck", ac: 1, bonus: 1 }),
    ];
  }
  if (role === "shop" || role === "merchant") {
    return [
      // the game has no hands slot: the mittens are a r1 ring (vs Tansy's/Hooked ring r2 bonus 2)
      makeItem({ name: "Ember Mittens", kind: "jewel", rank: 1, slot: "ring", ac: 1 }),
      // consumables: draughts by another name (Spirit and Health draught values)
      makeItem({ name: "Moonlit Mince Pie", kind: "potion", rank: 1, bonus: 2 }),
      makeItem({ name: "Wraith Soup", kind: "potion", rank: 1, bonus: 1 }),
    ];
  }
  if (role === "undertaker") {
    return [
      // vs Cabinet edge r3 (atk 4+6+lv/4, one hand): +2 atk but two hands (no off-hand)
      makeItem({ name: "Spectral Scythe", kind: "weapon", rank: 3, slot: "main", hands: 2, atk: 4 + 3 * 2 + Math.floor(lv / 4) + 2 }),
      // vs Mended armor r3 (ac 4): same armour, +1 bonus, the hero's own armour type
      makeItem({ name: "Mourner's Robe", kind: "armor", rank: 3, slot: "chest", armor, ac: 4, bonus: 1 }),
    ];
  }
  return [];
}
