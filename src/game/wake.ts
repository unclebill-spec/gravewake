/**
 * Wake batch (2026-10-21): the four mini-bosses' homes and sheets, the ending's dungeon and its lord.
 * Placement is seeded (fixed floors), never Math.random.
 */

/** Each mini guards the middle floor of the dungeons in its XP gap (12-22, 34-44, 48-62). */
export const WAKE_MINI_AT: Record<string, string> = {
  ossuary: "wraithknight", // L12
  wraps: "wraithknight", // L22
  warren: "frostgolem", // L34
  chapel: "frostgolem", // L44
  vesper: "vampirelord", // L48
  drowned: "stormelemental", // L62
};
export function wakeMiniFloor(floors: number): number {
  return Math.max(1, Math.ceil(floors / 2));
}

/** Art's mini sheets: one row of 6 frames (idle0, idle1, wind-up, attack, hit, hurt), anchored bottom centre. */
export const WAKE_SHEETS: Record<string, { url: string; em: string; w: number; h: number }> = {
  wraithknight: { url: "/art/writer/wraith_knight.png", em: "/art/writer/wraith_knight_em.png", w: 32, h: 64 },
  vampirelord: { url: "/art/writer/vampire_lord.png", em: "/art/writer/vampire_lord_em.png", w: 32, h: 64 },
  frostgolem: { url: "/art/writer/frost_golem.png", em: "/art/writer/frost_golem_em.png", w: 48, h: 64 },
  stormelemental: { url: "/art/writer/storm_elemental.png", em: "/art/writer/storm_elemental_em.png", w: 48, h: 64 },
};
