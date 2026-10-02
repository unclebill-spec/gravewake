/**
 * Gravewake adapter for map-writer phase 2: biome noise blending on the vale.
 *
 * Looks only. The world's tiles, collision, zone names, levels, foe families, festival spots, and
 * saves all keep the hard rectangle rule in sim.ts. This hands draw.ts a "ground skin": which biome's
 * ground art each open-ground tile shows, plus the edges to fringe, so borders read as ragged,
 * dithered transitions instead of ruled lines. Roads, doors, water, ice, stairs, and dirt are never
 * re-skinned. Seeded by a fixed string, so every player and every load sees the same vale.
 */
import { T } from "../../src/game/content";
import { blendBiomes, type BlendResult } from "./map_writer";

/** Biome order in the skin: index -> the ground tile whose art it shows. */
export const VALE_BIOMES = ["vale", "winter", "waste", "cinder", "swamp"] as const;
export const VALE_GROUND: readonly number[] = [T.grass, T.snow, T.sand, T.ash, T.swamp];

/** The numbers: a fixed seed, borders wander up to 2 tiles either way, the big wobble is 6 tiles long. */
export const VALE_BLEND = { seed: "gravewake-vale", reach: 2, scale: 6 } as const;

/** Which ground spills over which at a border (one fringe per border): snow over sand over ash over swamp over grass. */
export const VALE_RANK: readonly number[] = [0, 4, 3, 2, 1];

/** Open ground and the props that stand on it (their ground shows round the trunk). Nothing else is re-skinned. */
export const VALE_BLENDABLE: readonly number[] = [T.grass, T.snow, T.sand, T.ash, T.swamp, T.tree, T.rock, T.pump, T.grave];

/** The world's own rectangle rule (buildWorld / biomeTile / propGround), as a skin index. */
export function valeBiomeAt(x: number, y: number): number {
  if (y < 16) return 1;
  if (x > 48) return 2;
  if (y > 46) return 3;
  if (x > 26 && x < 42 && y > 22 && y < 40) return 4;
  return 0;
}

/** The skin for one world grid. Pure: the same tiles give the same skin, byte for byte. */
export function valeSkin(tiles: ArrayLike<number>, w: number, h: number, seed: string | number = VALE_BLEND.seed): BlendResult {
  const base = new Uint8Array(w * h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) base[y * w + x] = valeBiomeAt(x, y);
  const open = new Set(VALE_BLENDABLE);
  return blendBiomes({ seed, w, h, base, names: [...VALE_BIOMES], blend: (i) => open.has(tiles[i]), reach: VALE_BLEND.reach, scale: VALE_BLEND.scale, rank: VALE_RANK });
}
