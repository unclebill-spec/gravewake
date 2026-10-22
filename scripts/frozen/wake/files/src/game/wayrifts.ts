/**
 * Wayrifts: standing portals ([OWNER-APPROVED 2026-10-02: playtest1f portals], owner-requested
 * 2026-10-02 09:42 ET, batch D2). Visible, animated rifts in the Gravewake palette (tools/pixel-writer/rift_writer.py:
 * neon-blue cold fire round a violet swirl with a red-glowing heart).
 *
 * playtest1y [OWNER-APPROVED 2026-10-06 16:27 ET: playtest1y wayrifts + wizard lightning + interior doors]: each wayrift is half size (24x32 art on a 2x1 footprint, standing one tile above it).
 *
 * playtest1z [OWNER-APPROVED 2026-10-06 17:14 ET: playtest1z portal redesign + wild spawn portals + mini quest]:
 * only the SEASONAL festival portal sits in town (center park with statues and an arch, on a round/octagon pad).
 * Ashen Rift, Shifting Barrow, Waste Pocket and the festival far twins are scattered in the biomes (also on octagon
 * pads). The old half-circle hub platforms north of town are gone. Far biome portals return to the town park.
 * Platforms are round/octagon pads (steering). The sim keeps no new save key for travel: a journey is over in a second.
 *
 * The festival hub rift leads to this season's festival zone; the other three festival zones' rifts are sealed
 * (dim, no fire) until their own season. Pure data and picks here; the sim (sim.ts) and the draw (draw.ts) read it.
 */
import { FESTIVALS, type SeasonId } from "./seasons";

export type Wayrift = {
  id: string;
  name: string;
  /** Footprint top-left tile (playtest1y: 2 wide, 1 tall). */
  x: number;
  y: number;
  /** Map the rift stands on: town park or the vale. */
  map: "town" | "world";
  /** A hub rift is the town's seasonal park portal; far rifts stand at their places. */
  hub: boolean;
  /** Raised octagon pad under this rift (playtest1z; wild spawn portals have none). */
  platform: boolean;
  /** The rift it leads to; a festival hub leads to this season's festival rift instead. */
  to?: string;
  /** A festival rift: awake only in its own season. */
  season?: SeasonId;
  /** The festival hub (its twin changes with the season). */
  festival?: boolean;
};

export const WAYRIFT = {
  /** Seconds the swirl takes to close over you, then to open at the far rift. */
  out: 0.55,
  back: 0.55,
  /** Night light (cold blue) at an awake rift, px radius; sealed ones give none. */
  light: 72,
  /** Swirl frames in the sheet (cell 8 is the sealed look). */
  frames: 8,
  /** playtest1y: half-size footprint and art. */
  fw: 2,
  fh: 1,
  artW: 24,
  artH: 32,
  /** Tiles the art stands above the footprint. */
  stand: 1,
  /** playtest1z: octagon pad sheet cell size (3x3 tiles). */
  platW: 48,
  platH: 48,
  platTiles: 3,
  /** The map-writer pass that keeps each footprint clear: rows above the footprint (the art) and a side margin. */
  clearUp: 2,
  clearSide: 1,
} as const;

/**
 * playtest1z [OWNER-APPROVED 2026-10-06 17:14 ET: playtest1z portal redesign + wild spawn portals + mini quest]:
 * one seasonal hub in the town park; other portals scattered in biomes (no half-circle hub north of town).
 * Town park footprint at (18,15) — center plaza west of the north-south cobble, north of the graves.
 * Biome far twins kept clear of villages/lairs (near their places, slightly deeper into each biome).
 */
export const WAYRIFTS: readonly Wayrift[] = [
  // town center park — seasonal only
  { id: "hub-fest", name: "Festival wayrift", x: 18, y: 15, map: "town", hub: true, platform: true, festival: true },
  // festival zones (one awake a season) — scattered, on octagon pads
  { id: "fest-harvest", name: "Harvest Moon wayrift", x: 65, y: 147, map: "world", hub: false, platform: true, to: "hub-fest", season: "autumn" },
  { id: "fest-krampus", name: "Krampusnacht wayrift", x: 38, y: 27, map: "world", hub: false, platform: true, to: "hub-fest", season: "winter" },
  { id: "fest-bloom", name: "Drowned Bloom wayrift", x: 102, y: 59, map: "world", hub: false, platform: true, to: "hub-fest", season: "spring" },
  { id: "fest-ashen", name: "Ashen Fair wayrift", x: 40, y: 141, map: "world", hub: false, platform: true, to: "hub-fest", season: "summer" },
  // special places scattered in biomes (return to town park; no town outbound twin)
  { id: "rift", name: "Ashen Rift wayrift", x: 26, y: 88, map: "world", hub: false, platform: true, to: "hub-fest" },
  { id: "barrow", name: "Shifting Barrow wayrift", x: 138, y: 90, map: "world", hub: false, platform: true, to: "hub-fest" },
  { id: "waste", name: "Waste Pocket wayrift", x: 142, y: 52, map: "world", hub: false, platform: true, to: "hub-fest" },
];

/** Where each far rift's place is called in a line ("You step out by ..."). */
export const WAYRIFT_PLACE: Record<string, string> = {
  "fest-harvest": "the Pumpkin Lord's patch",
  "fest-krampus": "the Winter hollow",
  "fest-bloom": "the Drowned Court's banks",
  "fest-ashen": "the Cinder sideshow",
  rift: "the Ashen Rift",
  barrow: "the Shifting Barrow",
  waste: "the Waste Pocket",
  "hub-fest": "the festival park in town",
};

/** The rift writer's sheets: 24x32 cells, 0-7 the swirl, 8 the sealed look. */
export const WAYRIFT_SHEET = "/art/writer/wayrift2.png";
export const WAYRIFT_EM = "/art/writer/wayrift2_em.png";
export const WAYRIFT_ICON = "/art/writer/wayrift-icon.png";
/** playtest1z: octagon pad (48x48, lit and sealed cells). */
export const WAYRIFT_PLATFORM = "/art/writer/wayrift-platform.png";
/** playtest1z: park props. */
export const PARK_STATUE = "/art/writer/park-statue.png";
export const PARK_ARCH = "/art/writer/park-arch.png";
export const SWAMP_PATH = "/art/writer/swamp-path.png";
export const WAYRIFT_SHEETS = [WAYRIFT_SHEET, WAYRIFT_EM, WAYRIFT_ICON, WAYRIFT_PLATFORM, PARK_STATUE, PARK_ARCH, SWAMP_PATH];

/** The name over a rift when you stand near it. */
export function wayLabel(w: Wayrift, season: SeasonId): string {
  if (w.festival) return `Wayrift: ${FESTIVALS[season].name}`;
  if (w.season && w.season !== season) return `${FESTIVALS[w.season].name} rift (sealed)`;
  if (!w.hub) return "Wayrift: the festival park in town";
  return w.name.replace("Wayrift to the ", "Wayrift: ");
}

export const wayriftById = (id: string) => WAYRIFTS.find((w) => w.id === id);
/** Mouth = west footprint tile (both footprint tiles accept travel). */
export const wayMouth = (w: Wayrift) => ({ x: w.x, y: w.y });
export const wayFront = (w: Wayrift) => ({ x: w.x, y: w.y + WAYRIFT.fh });

export function wayAwake(w: Wayrift, season: SeasonId): boolean {
  return !w.season || w.season === season;
}

export function wayLink(w: Wayrift, season: SeasonId): Wayrift | null {
  if (!wayAwake(w, season)) return null;
  if (w.festival) return WAYRIFTS.find((f) => f.season === season) ?? null;
  return (w.to && wayriftById(w.to)) || null;
}

export function wayFestival(w: Wayrift, season: SeasonId) {
  return FESTIVALS[w.season ?? season];
}

/** One cold-blue night light at each awake rift's mouth (on the map it stands on). */
export function wayLights(season: SeasonId, map: "town" | "world", tile = 16): { x: number; y: number; seed: number }[] {
  const out: { x: number; y: number; seed: number }[] = [];
  for (const w of WAYRIFTS) {
    if (w.map !== map) continue;
    if (!wayAwake(w, season)) continue;
    const m = wayMouth(w);
    out.push({ x: m.x * tile + tile / 2, y: m.y * tile + tile / 2, seed: m.x & 3 });
  }
  return out;
}

/** The rift whose footprint holds this tile on the given map, or undefined. */
export function wayriftAt(tx: number, ty: number, map: "town" | "world" = "world"): Wayrift | undefined {
  return WAYRIFTS.find((w) => w.map === map && tx >= w.x && tx < w.x + WAYRIFT.fw && ty >= w.y && ty < w.y + WAYRIFT.fh);
}

/** playtest1z: octagon pad rim solid (3x3) except the 2x1 footprint mouth. */
export function wayPlatformSolid(tx: number, ty: number, map: "town" | "world" = "world"): boolean {
  for (const w of WAYRIFTS) {
    if (!w.platform || w.map !== map) continue;
    // platform top-left = rift footprint top-left (mouth in NW of the 3x3)
    if (tx >= w.x && tx < w.x + WAYRIFT.platTiles && ty >= w.y && ty < w.y + WAYRIFT.platTiles) {
      if (tx >= w.x && tx < w.x + WAYRIFT.fw && ty >= w.y && ty < w.y + WAYRIFT.fh) return false;
      // octagon cut: corner tiles of the 3x3 are open (rounder pad)
      const lx = tx - w.x;
      const ly = ty - w.y;
      if ((lx === 0 || lx === 2) && (ly === 0 || ly === 2)) return false;
      return true;
    }
  }
  return false;
}

export function waySolid(tx: number, ty: number, map: "town" | "world" = "world"): boolean {
  return wayPlatformSolid(tx, ty, map);
}

export function wayMouthAt(tx: number, ty: number, map: "town" | "world" = "world"): Wayrift | undefined {
  return wayriftAt(tx, ty, map);
}

export function wayArtAt(px: number, py: number, map: "town" | "world" = "world", tile = 16): Wayrift | undefined {
  return WAYRIFTS.find((w) => {
    if (w.map !== map) return false;
    const ax = w.x * tile + (WAYRIFT.fw * tile - WAYRIFT.artW) / 2;
    const ay = (w.y - WAYRIFT.stand) * tile;
    return px >= ax && px < ax + WAYRIFT.artW && py >= ay && py < ay + WAYRIFT.artH;
  });
}

/**
 * Lay the world wayrifts on the vale's grid (sim.ts layWorld). Town park rifts are laid in buildTown.
 */
export function stampWayrifts(tiles: Uint8Array, w: number, h: number, codes: { road: number; trail: number; tree: number; rock: number; pump: number; water: number; ice: number }, ground: (x: number, y: number) => number, open: (t: number) => boolean): number {
  const clearable = (t: number) => t === codes.tree || t === codes.rock || t === codes.pump;
  const world = WAYRIFTS.filter((r) => r.map === "world");
  for (const r of world) {
    const pad = r.platform ? WAYRIFT.platTiles : WAYRIFT.fw;
    for (let y = r.y - WAYRIFT.clearUp; y <= r.y + Math.max(WAYRIFT.fh, pad) + 1; y++) {
      for (let x = r.x - WAYRIFT.clearSide; x <= r.x + pad - 1 + WAYRIFT.clearSide; x++) {
        if (x < 0 || y < 0 || x >= w || y >= h) continue;
        const i = y * w + x;
        const inside = x >= r.x && x < r.x + WAYRIFT.fw && y >= r.y && y <= r.y + WAYRIFT.fh;
        if (clearable(tiles[i]) || (inside && (tiles[i] === codes.water || tiles[i] === codes.ice))) tiles[i] = ground(x, y);
      }
    }
  }
  let cut = 0;
  for (const r of world) {
    const f = wayFront(r);
    const cost = new Int32Array(w * h).fill(1 << 30);
    const prev = new Int32Array(w * h).fill(-1);
    const start = f.y * w + f.x;
    if (start < 0 || start >= w * h) continue;
    cost[start] = 0;
    const buckets: number[][] = [[start]];
    let hit = -1;
    for (let c = 0; c < buckets.length && hit < 0; c++) {
      const b = buckets[c];
      for (let k = 0; k < b.length; k++) {
        const i = b[k];
        if (cost[i] !== c) continue;
        const t = tiles[i];
        if (t === codes.road || t === codes.trail) {
          hit = i;
          break;
        }
        const x = i % w;
        const y = (i - x) / w;
        for (const [dx, dy] of [[0, 1], [1, 0], [-1, 0], [0, -1]]) {
          const nx = x + dx;
          const ny = y + dy;
          if (nx < 2 || ny < 2 || nx >= w - 2 || ny >= h - 2 || wayriftAt(nx, ny, "world")) continue;
          const j = ny * w + nx;
          const nt = tiles[j];
          if (!open(nt) && !clearable(nt)) continue;
          const nc = c + (clearable(nt) ? 1 : 0);
          if (nc >= cost[j]) continue;
          cost[j] = nc;
          prev[j] = i;
          (buckets[nc] ??= []).push(j);
        }
      }
    }
    for (let i = hit; i >= 0 && i !== start; i = prev[i]) {
      if (clearable(tiles[i])) {
        tiles[i] = codes.trail;
        cut++;
      }
    }
  }
  return cut;
}
