/**
 * playtest1k [OWNER-APPROVED 2026-10-03: elemental combos, companion commands]: spells and statuses react. Bill
 * (2026-10-03 08:41 ET): "Fire on poisoned or oiled foes explodes, ice then lightning shatters for bonus damage, and
 * lightning in water or on wet foes chains. Use the element sets from 1h's spell fx. Show a combo name pop and a distinct
 * effect, and keep the balance modest."
 *
 * Pure numbers and rules; sim.ts applies them (statuses on field foes are never saved), draw.ts shows them. Elements are
 * the six fx strips playtest1h draws (fire, ice, lightning, venom, shadow, holy): each hero spell and companion art carries
 * the element its colour already draws (the check proves the two tables agree with draw.ts spellElement / fxElement).
 */
export type Element = "fire" | "ice" | "lightning" | "venom" | "shadow" | "holy";
export const ELEMENTS: readonly Element[] = ["fire", "ice", "lightning", "venom", "shadow", "holy"];

/** Each hero spell's element: the 1h fx strip its colour draws. */
export const SPELL_ELEMENT: Record<string, Element> = {
  "Loadout Stance": "fire",
  Earthshatter: "lightning",
  "War Cry": "fire",
  Execution: "fire",
  Deathbolt: "shadow",
  Curse: "venom",
  "Summon Shade": "shadow",
  "Grave Nova": "lightning",
  Ambush: "holy",
  Envenom: "venom",
  Tripwire: "fire",
  Vanish: "shadow",
};

/** A companion art's element (castAlly's colours: curse green venom, drain purple shadow, the rest gold lightning). */
export function artElement(kind: string): Element | null {
  if (kind === "curse") return "venom";
  if (kind === "drain") return "shadow";
  if (kind === "aggro") return "lightning";
  return null;
}

export const STATUS = {
  /** A venom hit poisons for this long (s). Poison itself does no damage: it is fuel for fire. */
  poison: 6,
  /** Wet and chill linger this long (s) after the foe leaves the water, the rain, the snow or the ice. */
  linger: 2,
  /** One reaction per foe in this many seconds. */
  comboCool: 3,
} as const;

/** Foes that are oiled by nature: wax, pitch, straw and resin (lanterns, pumpkins, scarecrows, mummies). */
export const OILED_FAMILIES = new Set(["lantern", "pumpkinlord", "scarecrow", "mummy"]);
/** Foes that are rimed by nature (frost on them already): the lich. */
export const RIMED_FAMILIES = new Set(["lich"]);
/** Weather that soaks a foe in the open, and weather that chills one. */
export const WET_WEATHER = new Set(["light", "heavy", "storm"]);
export const COLD_WEATHER = new Set(["snow"]);

export const COMBO = {
  /** Fire on a poisoned foe: VENOM BLAST; on an oiled one: WILDFIRE. Bonus on the target, a splash round it. */
  blastBonus: 0.5,
  blastSplash: 0.3,
  blastR: 32,
  /** Lightning on a chilled foe: SHATTER, a bonus on the target (the chill is spent). */
  shatterBonus: 0.6,
  /** Lightning on a wet foe: CHAIN, arcs to up to chainMax other foes within chainR (wet ones first). */
  chainShare: 0.4,
  chainR: 56,
  chainMax: 2,
  /** The combo name pop's life (s), and the most on screen at once. */
  popLife: 1.1,
  popMax: 6,
} as const;

export type ComboId = "blast" | "wildfire" | "shatter" | "chain";
export const COMBO_NAME: Record<ComboId, string> = { blast: "VENOM BLAST", wildfire: "WILDFIRE", shatter: "SHATTER", chain: "CHAIN" };
/** The pop's font row (draw.ts FontRow) and the burst's colour: each one its element's (fire red, ice blue, lightning gold). */
export const COMBO_ROW: Record<ComboId, "red" | "blue" | "gold"> = { blast: "red", wildfire: "red", shatter: "blue", chain: "gold" };
export const COMBO_COLOR: Record<ComboId, string> = { blast: "#e04a2a", wildfire: "#e04a2a", shatter: "#7ac8ff", chain: "#f4e27a" };

export type Status = { poison?: number; wet?: number; chill?: number; comboCool?: number };

/**
 * The reaction an element hit sets off on a foe with these statuses (or none). Shatter goes before chain (a frozen foe
 * in the rain shatters); fire spends the poison first, then the oil.
 */
export function reaction(el: Element | null, s: Status, oiled: boolean): ComboId | null {
  if (!el || (s.comboCool ?? 0) > 0) return null;
  if (el === "fire") return (s.poison ?? 0) > 0 ? "blast" : oiled ? "wildfire" : null;
  if (el === "lightning") return (s.chill ?? 0) > 0 ? "shatter" : (s.wet ?? 0) > 0 ? "chain" : null;
  return null;
}

/** A combo's bonus on its target, from the hit that set it off (at least 1). */
export function comboBonus(id: ComboId, dealt: number): number {
  const k = id === "shatter" ? COMBO.shatterBonus : id === "chain" ? 0 : COMBO.blastBonus;
  return k ? Math.max(1, Math.round(dealt * k)) : 0;
}
/** What a splash or a chain arc deals to each foe it reaches. */
export function comboSpread(id: ComboId, dealt: number): number {
  return Math.max(1, Math.round(dealt * (id === "chain" ? COMBO.chainShare : COMBO.blastSplash)));
}
