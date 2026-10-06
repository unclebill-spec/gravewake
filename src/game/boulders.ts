/**
 * playtest1w [OWNER-APPROVED 2026-10-06 00:16 ET: playtest1w polish] (Bill, 2026-10-06 00:16 ET, "Fix all those things you
 * mentioned", 1v's open item 2): big boulders, clearly bigger than the hero. A rock is one 16 px tile, knee-high (1v); a
 * boulder stands on a 2x2 block of tiles (all four rock on the grid, so the body rule, the car's footprint, the routes and
 * the reach audit read it with no new code), drawn once over the block by tools/pixel-writer/boulder_writer.py (48x56
 * cells, the stone 40-46 px tall: 1.25-1.45x the hero's 32 px; seasons on the vale, a snow cap on the snow, embers in
 * the ash and foxfire in the swamp on its glow mask).
 *
 * Laid last on the vale (after the hamlets), seeded: a boulder only goes where its 2x2 block AND the ring of tiles round it
 * (4x4) are plain biome ground (no road, trail, water, ice, prop, lot or doorway), so it can never cut a path (the ring
 * round it stays open), and it keeps clear of every place a body must reach or fight at (BOULDER.keep). Pure: the same
 * tiles give the same boulders. Villages, the town and below ground have none.
 */
import { T, worldBiome, type WorldBiome } from "./content";
import { rng32, subSeed } from "../../tools/map-writer/map_writer";

/** Sheet cells (48x56, foot on row 54), how many per biome (one per `per` tiles of that biome), spacing, keep-clear radii. */
export const BOULDER = {
  cell: { w: 48, h: 56, foot: 54 },
  per: 650,
  gap: 9,
  keep: { lair: 10, door: 10, gate: 10, mouth: 5, wayrift: 6, npc: 5, landmark: 4, cache: 3, hamlet: 4, park: 7 },
  seed: "gravewake-boulders-1w",
} as const;
/** Sheet columns: two shapes per biome (the snow and swamp have their own stone dress); rows: the four seasons. */
export const BOULDER_KINDS = ["vale", "vale2", "snow", "snow2", "sand", "sand2", "ash", "ash2", "swamp", "swamp2"] as const;
export const BOULDER_SEASONS = ["autumn", "winter", "spring", "summer"] as const;
/** The biomes whose boulders glow at night (embers, foxfire): their cells on the glow mask. */
export const BOULDER_GLOW: ReadonlySet<string> = new Set(["ash", "swamp"]);
export const BOULDERS_SHEET = "/art/writer/wild-boulders.png";
export const BOULDERS_EM = "/art/writer/wild-boulders_em.png";

export type BoulderT = { x: number; y: number; biome: WorldBiome; kind: number };
const PLAIN = new Set<number>([T.grass, T.snow, T.ash, T.sand, T.swamp]);

/** The sheet column for a boulder of `biome` with shape bit k. */
export function boulderCol(biome: string, k: number): number {
  const b = biome === "snow" ? 2 : biome === "sand" ? 4 : biome === "ash" ? 6 : biome === "swamp" ? 8 : 0;
  return b + (k & 1);
}

/**
 * Lay the vale's boulders on `tiles` (w x h; written in place: each block's four tiles become rock). places: every spot a
 * body must reach or fight at, with the radius it keeps (tiles). Returns the boulders, top-left tile of each block.
 */
export function layBoulders(tiles: Uint8Array, w: number, h: number, places: { x: number; y: number; r: number }[]): BoulderT[] {
  const r = rng32(subSeed(BOULDER.seed, `${w}x${h}`));
  const area: Record<string, number> = {};
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (PLAIN.has(tiles[y * w + x])) area[worldBiome(x, y)] = (area[worldBiome(x, y)] ?? 0) + 1;
  const want: Record<string, number> = {};
  for (const [b, n] of Object.entries(area)) want[b] = Math.max(2, Math.round(n / BOULDER.per));
  const have: Record<string, number> = {};
  const out: BoulderT[] = [];
  const clearOf = (x: number, y: number) => places.every((p) => (x + 1 - p.x) ** 2 + (y + 1 - p.y) ** 2 > (p.r + 1) ** 2);
  const plainRing = (x: number, y: number) => {
    if (x < 3 || y < 3 || x + 4 > w - 3 || y + 4 > h - 3) return false;
    for (let dy = -1; dy <= 2; dy++) for (let dx = -1; dx <= 2; dx++) if (!PLAIN.has(tiles[(y + dy) * w + x + dx])) return false;
    return true;
  };
  const tries = w * h;
  for (let n = 0; n < tries; n++) {
    const x = 3 + Math.floor(r() * (w - 7));
    const y = 3 + Math.floor(r() * (h - 7));
    const b = worldBiome(x, y);
    if ((have[b] ?? 0) >= (want[b] ?? 0)) continue;
    if (worldBiome(x + 1, y + 1) !== b || !plainRing(x, y) || !clearOf(x, y)) continue;
    if (out.some((o) => Math.abs(o.x - x) < BOULDER.gap && Math.abs(o.y - y) < BOULDER.gap)) continue;
    for (let dy = 0; dy < 2; dy++) for (let dx = 0; dx < 2; dx++) tiles[(y + dy) * w + x + dx] = T.rock;
    out.push({ x, y, biome: b, kind: Math.floor(r() * 2) });
    have[b] = (have[b] ?? 0) + 1;
    if (Object.keys(want).every((k) => (have[k] ?? 0) >= want[k])) break;
  }
  return out.sort((a, b) => a.y - b.y || a.x - b.x);
}

/** Tile index -> the boulder whose block holds it (the draw skips the four tiles' rock and draws the boulder once). */
export function boulderIndex(list: BoulderT[], w: number): Map<number, BoulderT> {
  const m = new Map<number, BoulderT>();
  for (const b of list) for (let dy = 0; dy < 2; dy++) for (let dx = 0; dx < 2; dx++) m.set((b.y + dy) * w + b.x + dx, b);
  return m;
}
