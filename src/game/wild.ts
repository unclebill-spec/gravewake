/**
 * playtest1c (owner-requested 2026-10-02, batch C art audit, C1): the outdoor world's art, redrawn by the pixel writer
 * (tools/pixel-writer/wild_writer.py, palette v3) in Bill's "gloom and glow" at the playtest1b pixel scale.
 *
 * Bill's notes this answers: old third-party trees, rocks, dead trees and pumpkins; "some trees ridiculously tiny";
 * small brown stick saplings; water and ice in a boxy tile grid (the town pond too); oversized town gravestones;
 * dead trees on flat grey patches; the tiny-ladder dungeon entrances. Picture only: nothing here moves, collides or
 * saves, and g.tiles is never read for anything but the look.
 */
import { DUNGEONS } from "./content";

export const WILD_TREES: Record<string, string> = {
  autumn: "/art/writer/wild-trees-autumn.png",
  winter: "/art/writer/wild-trees-winter.png",
  spring: "/art/writer/wild-trees-spring.png",
  summer: "/art/writer/wild-trees-summer.png",
};
export const WILD_TREES_EM: Record<string, string> = {
  autumn: "/art/writer/wild-trees-autumn_em.png",
  winter: "/art/writer/wild-trees-winter_em.png",
  spring: "/art/writer/wild-trees-spring_em.png",
  summer: "/art/writer/wild-trees-summer_em.png",
};
/** 32x48 tree cells in wild_writer TREE_KINDS order. */
export const TREE_CELL = { oak: 0, oak2: 1, elm: 2, poplar: 3, pine: 4, pine2: 5, birch: 6, yew: 7 } as const;
/** The yew carries cold-fire wisps: the only tree cell with a glow mask. */
export const TREE_GLOW = new Set<number>([TREE_CELL.yew]);
export const DEADWOOD = "/art/writer/wild-deadwood.png";
export const DEADWOOD_EM = "/art/writer/wild-deadwood_em.png";
/** 32x48 deadwood cells: three charred cinder trees, three drowned willows, two bleached waste thorns. */
export const DEAD_CELL = { cinder: [0, 1, 2], willow: [3, 4, 5], thorn: [6, 7] } as const;
export const ROCKS = "/art/writer/wild-rocks.png";
export const ROCKS_EM = "/art/writer/wild-rocks_em.png";
/** 16x16 boulder cells per biome (the swamp shares the vale's mossy stones). */
export const ROCK_CELL: Record<string, readonly number[]> = { vale: [0, 1, 2, 3], swamp: [0, 1, 2, 3], snow: [4, 5], ash: [6, 7], sand: [8, 9], town: [10, 11], camp: [0, 1, 2, 3] };
export const ROCK_GLOW = new Set<number>([6, 7]);
export const GRAVES = "/art/writer/wild-graves.png";
export const GRAVES_EM = "/art/writer/wild-graves_em.png";
/** 16x32 headstone cells: round, cross, obelisk, candle (frame 0), then the candle's second flicker frame. */
export const GRAVE_CELL = { round: 0, cross: 1, obelisk: 2, candle: 3, candle2: 4 } as const;
export const ENTRANCES = "/art/writer/wild-entrances.png";
export const ENTRANCES_EM = "/art/writer/wild-entrances_em.png";
/** 48x48 dungeon mouths, two flicker frames each: stairwell 0 1, crypt 2 3, barrow 4 5. */
export const ENTRANCE_CELL = { stairwell: 0, crypt: 2, barrow: 4 } as const;
export type EntranceKind = keyof typeof ENTRANCE_CELL;
/** The town's Opened Grave: 32x32 over 2x2 tiles, the stair tile its bottom-right quarter; two flicker frames. */
export const OPENED_GRAVE = "/art/writer/wild-opened-grave.png";
export const OPENED_GRAVE_EM = "/art/writer/wild-opened-grave_em.png";
/** 16x16 floor stairs (0 down into the dark, 1 up into the light), in place of the old drawn ladder. */
export const STAIRS = "/art/writer/wild-stairs.png";
/** Wrapping 128x128 sheets laid by world position, so water, ice and the biome grounds show no tile grid. */
export const TEX = 128;
export const WATER = "/art/writer/wild-water.png";
export const WATER_TOWN = "/art/writer/wild-water-town.png";
export const ICE = "/art/writer/wild-ice.png";
export const WILD_GROUND: Record<string, string> = {
  snow: "/art/writer/wild-snow.png",
  ash: "/art/writer/wild-ash.png",
  sand: "/art/writer/wild-sand.png",
  swamp: "/art/writer/wild-swamp.png",
};
/** Frames per wrapping sheet, and how many game frames (g.frame, 8 a second) each one shows. */
export const TEX_FRAMES = { water: 4, ice: 3 } as const;
export const TEX_TICKS = { water: 4, ice: 12 } as const;
/** Shore rims (16x16), one row per look, laid where a water or ice tile meets dry ground. */
export const SHORE = "/art/writer/wild-shore.png";
export const SHORE_SIDE = { n: 0, e: 1, s: 2, w: 3 } as const;
export const SHORE_ROW = { bank: 0, stone: 1, snowbank: 2 } as const;
export const PUMPKIN_SMALL = "/art/writer/wild-pumpkin-small.png";
export const PUMPKIN_SMALL_EM = "/art/writer/wild-pumpkin-small_em.png";
export const PUMPKIN_BIG = "/art/writer/wild-pumpkin-big.png";
export const PUMPKIN_BIG_EM = "/art/writer/wild-pumpkin-big_em.png";
/** The soft biome fringe masks (border-dither's twelve-cell layout; only the alpha is read): rounded drifts, not a
 * toothed 2-4 px saw edge, where the vale meets the snow, the waste, the cinders and the swamp. */
export const WILD_BORDER = "/art/writer/wild-border.png";
/** The neighbour biome's crumbs over a fringed tile, thinning across it: rows snow sand ash swamp, cells n e s w. */
export const WILD_FLECKS = "/art/writer/wild-flecks.png";
/** A boss's cold-fire ground ring, 32x16, four turning frames (bosses draw at the people's scale; the ring marks them). */
export const BOSS_AURA = "/art/writer/wild-boss-aura.png";
export const BOSS_AURA_EM = "/art/writer/wild-boss-aura_em.png";
export const AURA_FRAMES = 4;

/** Every wild sheet, so the draw can ask for them all up front (no first-frame pop from the fallback pixels). */
export const WILD_SHEETS: string[] = [
  ...Object.values(WILD_TREES),
  ...Object.values(WILD_TREES_EM),
  DEADWOOD,
  DEADWOOD_EM,
  ROCKS,
  ROCKS_EM,
  GRAVES,
  GRAVES_EM,
  ENTRANCES,
  ENTRANCES_EM,
  OPENED_GRAVE,
  OPENED_GRAVE_EM,
  STAIRS,
  WATER,
  WATER_TOWN,
  ICE,
  ...Object.values(WILD_GROUND),
  SHORE,
  PUMPKIN_SMALL,
  PUMPKIN_SMALL_EM,
  PUMPKIN_BIG,
  PUMPKIN_BIG_EM,
  BOSS_AURA,
  BOSS_AURA_EM,
  WILD_BORDER,
  WILD_FLECKS,
];

/** Which mouth a dungeon wears on the vale: a mason's stairwell for the manors, forts, chapels and the abbey; a crypt
 * mouth for the ossuary, the tomb, the drowned parish and the grave; a barrow arch for the warrens, roots, pockets. */
const MOUTH: Record<string, EntranceKind> = {
  harrow: "stairwell",
  carrion: "stairwell",
  chapel: "stairwell",
  vesper: "stairwell",
  wick: "stairwell",
  hearth: "stairwell",
  ossuary: "crypt",
  wraps: "crypt",
  drowned: "crypt",
  grave: "crypt",
  warren: "barrow",
  blackroot: "barrow",
  cave: "barrow",
};
export function entranceKind(dungeonId: string): EntranceKind {
  const d = DUNGEONS.find((x) => x.id === dungeonId);
  if (!d) return "barrow";
  if (d.pocket || d.gen) return "barrow";
  return MOUTH[d.theme] ?? "barrow";
}
/** The two cold-fire braziers of each mouth, in the 48x48 cell (for the light layer at night). */
export const ENTRANCE_LAMPS: Record<EntranceKind, [number, number][]> = {
  stairwell: [[11, 4], [36, 4]],
  crypt: [[10, 27], [37, 27]],
  barrow: [[6, 33], [41, 33]],
};
/** One pick per tile, the same every frame: a stable hash of the tile. */
export function tileRoll(x: number, y: number, n: number): number {
  return Math.abs(x * 7 + y * 13 + ((x * y) % 5)) % n;
}
