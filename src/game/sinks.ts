/**
 * fun-early-sinks (Bill, 2026-10-21): an exciting first five minutes and silver sinks past the 240-silver bone car.
 *
 * EARLY: Old Mulch, the Grave-Warden. A short scripted elite just south of the road gate on the vale (a recoloured ghoul,
 * existing sprites, no map change), tuned for level 1-3. Once only (saved). Pays silver, a rank-2 weapon upgrade, a
 * draught and the free "Grave-Warden" title.
 *
 * SINKS: priced against the game's real income. Start purse 35; zone board 8-28 once per zone; bounties 16-56 a night;
 * a level-1 trash foe ~3-5 silver, a boss pile ~40-120; shop rank-4 pieces 38-62; croft 80; car 240. So a mid-game night is
 * worth ~60-150 silver. Trophies run 40-200 each (nine world bosses and ten dungeon bosses: ~2,000 to fill the wall),
 * cosmetics 60-500, casino silver prizes 45-320, wayrift attunement 90 / 180 / 400. Several nights each, never required.
 */

export const EARLY = {
  /** Vale tile, a few steps south of the road gate (bounty.ts GATE 91,126). openNear moves it to open ground. */
  tx: 91,
  ty: 131,
  name: "Old Mulch, the Grave-Warden",
  /** Base family (existing sprite, drawn in its own tint inside the palette). */
  def: "ghoul",
  tint: "#8a4a32",
  /** Fight level is the hero's, clamped to this band. */
  minLv: 2,
  maxLv: 3,
  /** HP times a level-matched ghoul (an elite, ~8-11 swings at level 1), and its swing times (kept gentle). */
  hpMul: 1.8,
  atkMul: 0.85,
  xp: 46,
  silver: 30,
  /** Within this many px of him, he notices and the fight opens. */
  notice: 40,
  title: "Grave-Warden",
} as const;

export const EARLY_LINES = {
  hint: "A spade rings past the road gate. Something old is digging up the vale road.",
  open: "Old Mulch rises from his own grave, spade in hand. \"No one walks my road!\"",
  won: (silver: number, weapon: string) =>
    `Old Mulch falls back into his grave. ${silver} silver, a ${weapon} and a draught. The town will call you Grave-Warden.`,
};

export type Sink = { id: string; role: string; label: string; price: number; kind: "trophy" | "title" | "prize" | "rift"; need?: string };

/** Boss trophies: the price by the boss's level (40 + 2 x lv, max 200). Bought at Corvin's counter once that boss has fallen. */
export function trophyPrice(lv: number) {
  return Math.min(200, 40 + 2 * Math.round(lv));
}

export const TITLES: { id: string; name: string; price: number; role: string; need?: string }[] = [
  { id: "title:warden", name: EARLY.title, price: 0, role: "" },
  { id: "title:baron", name: "Bone-Car Baron", price: 90, role: "carman", need: "car" },
  { id: "title:regular", name: "Velvet Regular", price: 140, role: "prizes" },
  { id: "title:lantern", name: "Lantern-Bearer", price: 220, role: "carman", need: "car" },
  { id: "title:lord", name: "Lord of the Vale", price: 500, role: "prizes" },
];

/** Casino silver prizes (Corvin's front shelf). */
export const PRIZES: { id: string; name: string; price: number; give: "potions" | "mana" | "dice" | "chandelier" }[] = [
  { id: "prize:crate", name: "House draught crate (3 draughts)", price: 45, give: "potions" },
  { id: "prize:tonic", name: "Velvet tonic pair (2 mana)", price: 40, give: "mana" },
  { id: "prize:dice", name: "Gilded bone dice (keepsake)", price: 120, give: "dice" },
  { id: "prize:chandelier", name: "Felt chandelier (croft keepsake)", price: 320, give: "chandelier" },
];

/** Wayrift attunement, bought from the mystic, in order. Applied when you step out of a wayrift. */
export const RIFT_TIERS: { id: string; name: string; price: number; text: string }[] = [
  { id: "rift:1", name: "Rift attunement I", price: 90, text: "arrive with a quarter of your energy back" },
  { id: "rift:2", name: "Rift attunement II", price: 180, text: "and a quarter of your health" },
  { id: "rift:3", name: "Rift attunement III", price: 400, text: "and a 15 s ward on landing" },
];
export const RIFT_WARD_MS = 15000;
