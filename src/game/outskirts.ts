/**
 * outskirts [OWNER-REQUESTED 2026-10-22: Bill, the ring outside the town fence]: sparse, gloomy and dead, with neon.
 * Picture only: everything here lies past the town map's edge (nothing walks there), so none of it can block a path,
 * a gate or an exit. The roads out of each gate stay bare strips. Pure layout here; draw.ts paints it.
 */
import { TOWN_W, TOWN_H } from "./townplan";

/** How deep (tiles) the sparse ring runs past the fence; the old deep forest stands beyond it. */
export const RING = 10; // deep enough that the tall forest crowns past it stop short of the camera's pad
/** How far (tiles) the town camera may run past the fence to show the ring. */
export const CAM_PAD = 3;
/** One tree in this many ring tiles survives the thinning (the forest used to fill every one). */
export const TREE_KEEP = 0.05;
export const PROP_ODDS = 0.07;
export const HUES = ["blue", "cyan", "violet", "magenta", "red", "green"] as const;
export type Hue = (typeof HUES)[number];
/** RGB light colours of the hues (the tube colours of palette v4). */
export const HUE_LIGHT: Record<Hue, [number, number, number]> = {
  blue: [0.29, 0.72, 1], cyan: [0.16, 1, 0.88], violet: [0.69, 0.48, 1], magenta: [1, 0.23, 0.85], red: [1, 0.23, 0.31], green: [0.35, 1, 0.29],
};
export const SHEETS = {
  ground: "/art/writer/outskirts-ground.png", props: "/art/writer/outskirts-props.png",
  candle: "/art/writer/outskirts-candle.png", candleEm: "/art/writer/outskirts-candle_em.png",
  wisp: "/art/writer/outskirts-wisp.png", wispEm: "/art/writer/outskirts-wisp_em.png", halo: "/art/writer/outskirts-halo.png",
  propsVar: "/art/writer/outskirts-props-var.png", treeVar: "/art/writer/outskirts-tree-var.png",
  tree: "/art/writer/outskirts-tree.png", raven: "/art/writer/outskirts-raven.png", ravenEm: "/art/writer/outskirts-raven_em.png",
} as const;

const hash = (x: number, y: number, k: number) => {
  let h = (x * 374761393 + y * 668265263 + k * 2246822519) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
};
/** Tiles past the fence on this side: 0 inside the map. */
export function depth(x: number, y: number, w = TOWN_W, h = TOWN_H): number {
  return Math.max(-x, x - (w - 1), -y, y - (h - 1), 0);
}
/** The bare roads out of the gates (north/south x 27-28, west/east y 15-16 and 29), a tile of verge each side. */
export function onRoad(x: number, y: number, w = TOWN_W, h = TOWN_H): boolean {
  if ((y < 0 || y >= h) && x >= 25 && x <= 30) return true;
  if ((x < 0 || x >= w) && ((y >= 14 && y <= 17) || (y >= 28 && y <= 30))) return true;
  return false;
}
/** The dead raven tree: its foot tile (the 32x48 sprite stands centred on it), south of the fence near the gate road. */
export const RAVEN_TREE = { x: 21, y: TOWN_H + 1 } as const;
/** The perch, in pixels from the tree's foot (the level end of its right bough). */
export const PERCH = { dx: 9, dy: -36 } as const;
/** The raven takes off with the hero this near (px), and comes back once the hero is this far. */
export const RAVEN_FLEE = 3.5 * 16;
export const RAVEN_BACK = 7 * 16;
const nearTree = (x: number, y: number) => Math.abs(x - RAVEN_TREE.x) <= 1 && y >= RAVEN_TREE.y - 2 && y <= RAVEN_TREE.y;

/** oskart: the share of ring props from outskirts-props-var.png, and of ring survivor trees drawn as the perchless dead tree. */
export const VAR_SHARE = 0.33;
export const TREE_VAR_SHARE = 0.6;
/** oskart: does this ring survivor stand as the dead tree (outskirts-tree-var.png) rather than a forest tree? */
export function treeVar(x: number, y: number): boolean {
  return ringTile(x, y) && hash(x, y, 10) < TREE_VAR_SHARE;
}
export function ringTile(x: number, y: number): boolean {
  const d = depth(x, y);
  return d >= 1 && d <= RING;
}
/** Does the forest keep its tree here? Deep forest past the ring; a rare survivor in it; never on a road or the raven's spot. */
export function treeShows(x: number, y: number): boolean {
  if (!ringTile(x, y)) return true;
  if (onRoad(x, y) || nearTree(x, y)) return false;
  return depth(x, y) >= RING - 1 && hash(x, y, 1) < TREE_KEEP * 3; // only at the ring's far edge, so no tall crown reaches the fence
}
/** The ground cell (outskirts-ground.png): ash with slate and pale patches from a coarse noise. */
export function groundCell(x: number, y: number): number {
  const p = hash(Math.floor(x / 3), Math.floor(y / 3), 2);
  if (p < 0.2) return hash(x, y, 3) < 0.3 ? 5 : 4;
  if (p > 0.84) return hash(x, y, 3) < 0.3 ? 7 : 6;
  return Math.floor(hash(x, y, 4) * 4);
}
/** A scattered prop (outskirts-props.png cell, flipped or not), or -1. One per tile at most: none overlap. */
export function propAt(x: number, y: number): { cell: number; flip: boolean; sheet?: 1 } | null {
  if (!ringTile(x, y) || onRoad(x, y) || nearTree(x, y) || depth(x, y) < 1 || MOVED_IN.has(`${x},${y}`)) return null;
  if (hash(x, y, 5) >= PROP_ODDS) return null;
  if (treeShows(x, y)) return null;
  if (candles().some((c) => c.x === x && c.y === y)) return null;
  const r = hash(x, y, 6);
  // oskart (Art's polish drop): a third of the props come from the variant sheet (skull pile, grave crosses, cracked skull, tufts)
  if (hash(x, y, 8) < VAR_SHARE) return { cell: Math.floor(hash(x, y, 9) * 8), flip: hash(x, y, 7) < 0.5, sheet: 1 };
  return { cell: r < 0.3 ? Math.floor(r / 0.1) : r < 0.65 ? 3 + Math.floor((r - 0.3) / 0.0875) : 7 + Math.floor((r - 0.65) / 0.117), flip: hash(x, y, 7) < 0.5 };
}
/** gw-phone-1028 r2 (EB note 3): the town camera now stops at the map edge, so the three south-ring pieces a phone used to
 * see below the fence (grave cross, wisp lantern, candle shrine) stand just inside it, on open ground (row TOWN_H-2), off
 * the avenue, the car lot and the gates. Picture only, like the rest: nothing walks into them or is stopped by them. */
export type Candle = { x: number; y: number; hue: Hue; inside?: true };
export type Wisp = { x: number; y: number; hue: Hue; seed: number; inside?: true };
/** The grave cross that stood at (23, TOWN_H) in the ring (outskirts-props-var.png cell 2, flipped), now inside the fence. */
export const INSIDE_PROPS: readonly { x: number; y: number; cell: number; flip: boolean; sheet: 1 }[] = [{ x: 25, y: TOWN_H - 2, cell: 2, flip: true, sheet: 1 }];
const MOVED_IN = new Set([`23,${TOWN_H}`]);
/** A handful of each, hand set round the ring (tiles), off the roads, apart from each other. gw-edgeprops-1028: the town camera
 * stops at the map edge, so the N, W and E ones (inside: true) stand on open grass just inside the fence (row 1 in the
 * north; columns 3 and TOWN_W - 4 west and east, clear of the HUD panels on a phone), off the roads, paths, doors and NPC spots; the rest stay in the ring, off-camera and silent. */
const CANDLES: Candle[] = [
  { x: 18, y: TOWN_H, hue: "green" }, { x: 31, y: TOWN_H - 2, hue: "magenta", inside: true }, { x: 3, y: 26, hue: "cyan", inside: true },
  { x: TOWN_W - 4, y: 8, hue: "violet", inside: true }, { x: 12, y: 1, hue: "red", inside: true }, { x: TOWN_W - 4, y: 39, hue: "green", inside: true },
];
const WISPS: Wisp[] = [
  { x: 24, y: TOWN_H - 2, hue: "blue", seed: 0, inside: true }, { x: 37, y: TOWN_H + 1, hue: "red", seed: 1 }, { x: 3, y: 8, hue: "violet", seed: 2, inside: true },
  { x: TOWN_W - 4, y: 26, hue: "green", seed: 3, inside: true }, { x: 40, y: 1, hue: "cyan", seed: 4, inside: true }, { x: -2, y: 35, hue: "magenta", seed: 5 },
  { x: 8, y: TOWN_H + 1, hue: "cyan", seed: 6 },
];
export const candles = (): readonly Candle[] => CANDLES;
export const wisps = (): readonly Wisp[] => WISPS;
/** A wisp's pixel spot this frame: a slow drift and bob in whole pixels. */
export function wispAt(w: Wisp, frame: number): { x: number; y: number } {
  const t = frame / 60 + w.seed * 1.7;
  return { x: w.x * 16 + 8 + Math.round(5 * Math.sin(t * 0.37)), y: w.y * 16 + 2 + Math.round(3 * Math.sin(t * 1.1)) };
}
/** The raven: its idle cell this frame (0 idle, 1 head turned, 2 wing ruffle, 3 blink), a step every 12 frames. */
export function ravenIdle(frame: number): number {
  const s = Math.floor(frame / 12) % 24;
  return s === 5 ? 3 : s >= 9 && s < 13 ? 1 : s >= 17 && s < 19 ? 2 : 0;
}
