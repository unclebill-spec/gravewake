/**
 * Companion bond meter (item 11, owner-approved feature list 2026-09-30).
 *
 * Reuses the companion the game already has (a hire, a bitten thrall, or a relic pact), the camp
 * talk that already exists, and the saved opened list:
 *   bond:<companionId>:<bond>:<stamp>   bond so far, and the half-cycle (a day or a night) of the last talk that counted
 * One camp talk counts per day and per night. Each tier tells one story line and turns on one small
 * passive. No passive touches a combat number: damage, HP, armor, cooldowns, foe stats and the
 * companion's own swing all stay as they are.
 */
import { CYCLE_MS } from "./content";

export type BondPassive = "watchful" | "forager" | "fireside";

/** Item 11's own numbers. */
export const BOND = {
  /** Bond reached for tiers 1, 2 and 3. */
  tiers: [2, 4, 7],
  max: 7,
  /** One counted talk per half-cycle: a day or a night. */
  stampMs: CYCLE_MS / 2,
  /** Tier 1 (Watchful): in a dungeon the companion calls out a floor trap this many tiles from you. Words only. */
  callTiles: 3,
  /** Tier 2 (Forager): the companion picks up loot at its own feet, inside this reach (yours is 12 px). */
  forageReach: 12,
  /** Tier 3 (Fireside): pitching camp restores this share of HP and energy instead of a third. */
  campShare: 1 / 2,
  passives: ["watchful", "forager", "fireside"] as BondPassive[],
  names: { watchful: "Watchful", forager: "Forager", fireside: "Fireside" } as Record<BondPassive, string>,
  blurbs: {
    watchful: "calls out floor traps near you",
    forager: "picks up loot at their own feet",
    fireside: "camp restores half your HP and energy",
  } as Record<BondPassive, string>,
};

export function bondStamp(ms: number) {
  return Math.floor(ms / BOND.stampMs);
}

/** How many tiers this much bond has reached (0 to 3). */
export function bondTier(bond: number) {
  return BOND.tiers.filter((t) => bond >= t).length;
}

export function bondKey(id: string, bond: number, stamp: number) {
  return `bond:${id}:${bond}:${stamp}`;
}

/** Parse a bond key, or null. */
export function readBond(key: string): { id: string; bond: number; stamp: number } | null {
  const m = /^bond:(.+):(\d+):(-?\d+)$/.exec(key);
  return m ? { id: m[1], bond: Number(m[2]), stamp: Number(m[3]) } : null;
}

/**
 * Story lines, one per tier. The three guild hires each have their own; a bitten thrall and a relic
 * pact share a voice with their own name in it.
 */
export const BOND_LINES: Record<string, [string, string, string]> = {
  acolyte: [
    "I was left on the chapel step in a flour sack. The old priest said the dead were the only ones quiet enough to raise me.",
    "I buried him myself, in the yard by the ladder. I still sweep his stone when no one is looking.",
    "He told me a lantern is only worth what it walks beside. I think I finally understand. Walk on; I am with you.",
  ],
  witch: [
    "Vetch is not my name. It is what grows where a witch is burned. I took it so I would not forget.",
    "My sisters went into the swamp to bargain with the leech-thing. I went the other way. I have never decided if that was cowardice.",
    "If the Bishop ever rises in front of us, do not hold me back. Just keep the fire lit for after.",
  ],
  shade: [
    "I was a shield-man for a lord who sold the gate. I hold the line now for whoever does not.",
    "I do not sleep. I stand at the edge of the light and count. Tonight I counted to you, and stopped.",
    "A shade remembers one oath. Mine was to a dead man. I am trading it, here, for a living one.",
  ],
  thrall: [
    "{name} watches the fire and speaks without turning: \"I keep forgetting the taste of bread. I remember the bakery, though.\"",
    "{name} says: \"I tried to hate you. It does not take. Something in the bite left a thread, and the thread pulls toward you.\"",
    "{name} says: \"If they come with stakes, they will come through me first. Not because I must. Because I would.\"",
  ],
  pact: [
    "{name} turns the relic over in a cold hand: \"Every office wants a master. I had worse ones than you.\"",
    "{name} says: \"The town thinks I am lost. Let it. Lost things are left alone, and I would rather be left alone with you.\"",
    "{name} says: \"The relic's hold is gone, you know. It went a while ago. I stayed anyway.\"",
  ],
};
