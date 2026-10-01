/**
 * Home decorating (item 10, owner-approved feature list 2026-09-30).
 *
 * Reuses what is already in the game: the points the Felt already pays on every spin, the Felt's
 * own points shelf, the South Croft (only once its deed is bought), the boss kill record the game
 * already keeps (bossDead), the boss-rank sprites in foes.png, and the saved opened list:
 *   decor:<id>                    a piece of furniture stands in the croft
 *   trophy:boss:<slot>:<bossId>   a boss trophy hangs in that back-wall slot
 * The derby trophy (item 9) keeps its own spot on the back wall; no slot here touches it.
 */

/** One piece of furniture: what it costs in points and the croft tile it stands on (it is solid). */
export type DecorPiece = { id: string; name: string; price: number; x: number; y: number; cell: number };

/** Item 10's own numbers. */
export const DECOR = {
  /** Furniture, in the cell order of croft-decor.png. Every spot is against a wall and blocks no walk. */
  pieces: [
    { id: "cabinet", name: "Curio cabinet", price: 16, x: 11, y: 1, cell: 0 },
    { id: "bookcase", name: "Coffin bookcase", price: 12, x: 12, y: 1, cell: 1 },
    { id: "candelabra", name: "Iron candelabra", price: 8, x: 1, y: 4, cell: 2 },
    { id: "armchair", name: "Wingback chair", price: 10, x: 9, y: 3, cell: 3 },
    { id: "perch", name: "Raven perch", price: 14, x: 12, y: 6, cell: 4 },
    { id: "planter", name: "Nightshade planter", price: 6, x: 1, y: 8, cell: 5 },
  ] as DecorPiece[],
  /** A boss trophy costs this many points, once that boss has fallen to you. */
  trophyPrice: 15,
  /**
   * Back-wall (row 0) slots for boss trophies, filled in this order. The croft's windows sit at
   * x 2, 6 and 10, and the derby trophy at x 9, so none of those are slots.
   */
  trophySlots: [4, 8, 3, 11, 5, 7, 1, 12],
  trophyRow: 0,
};

export function decorKey(id: string) {
  return `decor:${id}`;
}

export function trophyKey(slot: number, boss: string) {
  return `trophy:boss:${slot}:${boss}`;
}

/** Parse a trophy key, or null. */
export function readTrophy(key: string): { slot: number; boss: string } | null {
  const m = /^trophy:boss:(\d+):(.+)$/.exec(key);
  return m ? { slot: Number(m[1]), boss: m[2] } : null;
}

/**
 * Where each family's boss-rank head starts in /art/sprites/foes.png (the first painted row of its
 * stand frame). The trophy shows the 10 rows from there: the crown and the face.
 */
export const TROPHY_HEAD_TOP: Record<string, number> = {
  zombie: 0, skeleton: 1, ghost: 6, bat: 8, ghoul: 4, witch: 0, lantern: 0, scarecrow: 0, wolf: 1,
  mummy: 2, vampire: 1, tree: 0, lich: 1, horse: 4, goblin: 3, cat: 13, rat: 17,
};
