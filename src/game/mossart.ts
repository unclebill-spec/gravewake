/**
 * gw-c-1030 (Master Builder): Will's approved gloom-glow moss set (kit-pixelkit 899ba09, Will: "Yes, use them and redo the
 * grave dirt darker and cooler") wired in as LOOKS ONLY: ground variants painted over existing tiles and picture-only
 * props. Nothing here touches g.tiles, collision, doors, foes or saves.
 * - grave_soil (pass 4, kit 49ed87a; PENDING Game Director): the cemetery's dirt walk ring.
 * - flagstone: the cemetery's middle path (street to street, past the crypt stair).
 * - glow_moss: seeded patches on the cemetery's grass, and a few on the Opened Grave and Drowned dungeon floors.
 * - fen_water: the vale's swamp (fen) water.
 * - props (16x16, one whole sprite on its own open tile): lamps along the cemetery path, orbs as yard decor.
 */
import { CEMETERY } from "./townplan";
import { T } from "./content";

export const MOSS = {
  soil: "/art/moss/grave_soil.png", moss: "/art/moss/glow_moss.png", flag: "/art/moss/flagstone.png", fen: "/art/moss/fen_water.png",
} as const;
export type MossHue = "amber" | "green" | "violet";
export type MossProp = { x: number; y: number; kind: "lamp" | "orb"; hue: MossHue };
export const propSheet = (p: MossProp) => `/art/moss/${p.kind}_${p.hue}.png`;
export const propEm = (p: MossProp) => `/art/moss/${p.kind}_${p.hue}_em.png`;
/** Light colour per hue (amber = the warm torch tone, green/violet = the outskirts neon). */
export const MOSS_LIGHT: Record<MossHue, [number, number, number]> = { amber: [1, 0.62, 0.24], green: [0.35, 1, 0.29], violet: [0.69, 0.48, 1] };
export const MOSS_LIGHT_R = { lamp: 30, orb: 22 } as const;

const c = CEMETERY;
/** Lamps flank the flagstone path (amber at both street gates, green and violet in the yard); orbs sit in yard corners.
 * Every spot is open town grass, off the mounds' 16x32 bodies, the dig sites' four sides, the stair and the undertaker
 * (scripts/mossart.test.mjs proves it on the real town grid). */
export const MOSS_PROPS: readonly MossProp[] = [
  { x: c.path[0] - 1, y: c.y0 - 1, kind: "lamp", hue: "amber" }, { x: c.path[1] + 1, y: c.y0 - 1, kind: "lamp", hue: "amber" },
  { x: c.path[0] - 1, y: c.y1 + 1, kind: "lamp", hue: "amber" }, { x: c.path[1] + 1, y: c.y1 + 1, kind: "lamp", hue: "amber" },
  { x: c.path[0] - 1, y: 21, kind: "lamp", hue: "green" }, { x: c.path[1] + 1, y: 20, kind: "lamp", hue: "green" },
  { x: c.path[0] - 1, y: 25, kind: "lamp", hue: "violet" }, { x: c.path[1] + 1, y: 25, kind: "lamp", hue: "violet" },
  { x: 15, y: 20, kind: "orb", hue: "green" }, { x: 14, y: 25, kind: "orb", hue: "violet" }, { x: 22, y: 25, kind: "orb", hue: "amber" },
];

const hash = (x: number, y: number, k: number) => {
  let h = (x * 374761393 + y * 668265263 + k * 2246822519) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
};
export const variant = (x: number, y: number) => Math.floor(hash(x, y, 7) * 4);
const inYard = (x: number, y: number) => x > c.x0 && x < c.x1 && y > c.y0 && y < c.y1;
const onPath = (x: number, y: number) => x === c.path[0] || x === c.path[1];
/** Moss patches: a coarse 2x2 cell noise so moss clumps into patches instead of a checker of single tiles. */
export const MOSS_SHARE = 0.32;
const mossy = (x: number, y: number, k: number, share: number) => hash(x >> 1, y >> 1, k) < share && hash(x, y, k + 1) < 0.8;
export const DUNGEON_MOSS = { themes: ["grave", "drowned"], share: 0.07 } as const;

/** The overlay sheet for a tile (drawn over its ground), or null. skinSwamp: on the vale, is this tile's biome the swamp? */
export function groundOverlay(mapId: string, theme: string, tile: number, x: number, y: number, skinSwamp = false): string | null {
  if (mapId === "town") {
    if (tile === T.dirt && onPath(x, y) && y > c.y0 - 3 && y < c.y1 + 3) return MOSS.flag;
    if (tile === T.dirt && inYard(x, y)) return MOSS.soil;
    if (tile === T.grass && inYard(x, y) && !onPath(x, y) && mossy(x, y, 11, MOSS_SHARE)) return MOSS.moss;
    return null;
  }
  if (mapId === "world" && skinSwamp && tile === T.water) return MOSS.fen;
  if (mapId === "dungeon" && (DUNGEON_MOSS.themes as readonly string[]).includes(theme) && tile === T.floor && mossy(x, y, 23, DUNGEON_MOSS.share * 2)) return MOSS.moss;
  return null;
}

/** Every moss sheet, for the preloader. */
export const MOSS_URLS: string[] = [...Object.values(MOSS), ...(["lamp", "orb"] as const).flatMap((k) => (["amber", "green", "violet"] as const).flatMap((h) => [`/art/moss/${k}_${h}.png`, `/art/moss/${k}_${h}_em.png`]))];
