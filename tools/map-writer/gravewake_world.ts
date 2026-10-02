/**
 * Gravewake adapter for map-writer phase 3: the overworld ([OWNER-APPROVED 2026-10-02: playtest1e bigger world]).
 *
 * The vale is 128x120 (twice the old 64x60 plan each way). The zone rule stays the old rectangles at twice the size
 * (content.ts worldBiome); this lays the ground, groves, roads, trails, landmarks and trail caches on it, seeded by a
 * fixed string, so every player and every load sees the same vale. sim.ts buildWorld passes the places that must stay
 * open (mouths, bosses, carts, watches, the town door) and then puts its own stairs, door and folk on the grid.
 */
import { T, WORLD, WORLD_DOOR, worldBiome, type WorldBiome } from "../../src/game/content";
import { writeOverworld, type OverworldBiome, type OverworldResult, type Spot } from "./map_writer";

export const WORLD_SEED = "gravewake-world-1e";
/** Biome order for the writer (index = position). */
export const WORLD_BIOMES: readonly WorldBiome[] = ["vale", "snow", "sand", "ash", "swamp"];
/** Each biome's dressing: tree and rock chances, its landmark kinds and how many, and its trail caches. */
export const WORLD_DRESS: Record<WorldBiome, OverworldBiome> = {
  vale: { ground: T.grass, trees: 0.13, rocks: 0.02, pump: 0.012, pond: "water", landmarks: 7, caches: 4, kinds: ["stones", "graves", "patch", "glade", "pond"] },
  snow: { ground: T.snow, trees: 0.12, rocks: 0.03, pond: "ice", landmarks: 6, caches: 3, kinds: ["pond", "stones", "glade", "graves"] },
  sand: { ground: T.sand, trees: 0.05, rocks: 0.05, pond: "water", landmarks: 5, caches: 3, kinds: ["stones", "graves", "pond", "glade"] },
  ash: { ground: T.ash, trees: 0.1, rocks: 0.04, pump: 0.01, pond: "water", landmarks: 6, caches: 3, kinds: ["patch", "graves", "stones", "glade"] },
  swamp: { ground: T.swamp, trees: 0.16, rocks: 0.01, pond: "water", landmarks: 4, caches: 2, kinds: ["pond", "glade", "graves"] },
};
/** The fixed water: the old lake (18-23, 28-32) and ice sheet (8-13, 4-6) at twice the size; the bridge column crosses the lake. */
export const WORLD_LAKE = { x: 36, y: 56, w: 12, h: 10 } as const;
export const WORLD_ICE = { x: 16, y: 8, w: 12, h: 6 } as const;
export const WORLD_BRIDGE = { x: 42, y0: 56, y1: 65 } as const;
/** The old roads at twice the size: the north-south road through the town door, the east-west road, the winter road. */
export const WORLD_ROADS = [
  { x0: WORLD_DOOR.x, y0: 0, x1: WORLD_DOOR.x, y1: WORLD.h - 1 },
  { x0: 0, y0: 80, x1: WORLD.w - 1, y1: 80 },
  { x0: 0, y0: 16, x1: WORLD.w - 1, y1: 16 },
  { x0: WORLD_BRIDGE.x, y0: WORLD_BRIDGE.y0 - 1, x1: WORLD_BRIDGE.x, y1: WORLD_BRIDGE.y1 + 1 },
];

/** The vale's grid: the writer's ground, groves, roads, trails, landmarks and caches. Pure and seeded. */
export function gravewakeWorld(sites: Spot[]): OverworldResult {
  return writeOverworld({
    seed: WORLD_SEED,
    w: WORLD.w,
    h: WORLD.h,
    codes: { road: T.road, trail: T.dirt, tree: T.tree, rock: T.rock, water: T.water, cache: T.chest, grave: T.grave, pump: T.pump, ice: T.ice },
    biomes: WORLD_BIOMES.map((b) => WORLD_DRESS[b]),
    biomeAt: (x, y) => WORLD_BIOMES.indexOf(worldBiome(x, y)),
    roads: WORLD_ROADS,
    sites,
    stamps: [
      { ...WORLD_LAKE, tile: T.water },
      { ...WORLD_ICE, tile: T.ice },
    ],
    edge: 2,
    spacing: 12,
  });
}
