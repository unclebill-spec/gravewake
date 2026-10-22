/**
 * billvid (Bill, 2026-10-22: "collision consistency"): the town's standing props the sim and the draw share. A street lamp
 * (gfx-lighting: on a cobble edge whose tile above is grass or dirt, LIGHT.streetGap apart, never by a door) has a small
 * iron base that stops bodies; its post and head above are looks only.
 */
import { T } from "./content";
import { LIGHT } from "./light";
import { SHOWROOM } from "./bonecar";

const cache = new WeakMap<object, { x: number; y: number }[]>();
export function streetLampSpots(w: number, h: number, tiles: Uint8Array): { x: number; y: number }[] {
  const hit = cache.get(tiles);
  if (hit) return hit;
  const out: { x: number; y: number }[] = [];
  const road = (t: number) => t === T.cobble || t === T.road;
  const open = (t: number) => t === T.dirt || t === T.grass;
  for (let y = 1; y + 1 < h; y++) {
    for (let x = 1; x + 1 < w; x++) {
      if (!road(tiles[y * w + x]) || !open(tiles[(y - 1) * w + x])) continue;
      if (out.some((p) => Math.abs(p.x - x) + Math.abs(p.y - y) < LIGHT.streetGap)) continue;
      let door = false;
      for (let j = -2; j <= 1 && !door; j++) for (let i = -2; i <= 2 && !door; i++) door = tiles[(y + j) * w + x + i] === T.door;
      if (!door) out.push({ x, y });
    }
  }
  cache.set(tiles, out);
  return out;
}
/** A lamp's base box in px (its foot is (x * 16 + 7, y * 16), drawn 4 px wide): [x0, y0, x1, y1]. */
export const LAMP_BASE = { dx0: -2, dx1: 4, dy0: -3, dy1: 2 } as const;
export function lampBaseAt(lamps: { x: number; y: number }[], px: number, py: number): boolean {
  for (const l of lamps) {
    const fx = l.x * 16 + 7, fy = l.y * 16;
    if (px >= fx + LAMP_BASE.dx0 && px < fx + LAMP_BASE.dx1 && py >= fy + LAMP_BASE.dy0 && py < fy + LAMP_BASE.dy1) return true;
  }
  return false;
}
/** Does the box [x0, x1) x [y0, y1) (px) overlap any lamp's base? */
export function lampBaseHits(lamps: { x: number; y: number }[], x0: number, y0: number, x1: number, y1: number): boolean {
  for (const l of lamps) {
    const fx = l.x * 16 + 7, fy = l.y * 16;
    if (x1 > fx + LAMP_BASE.dx0 && x0 < fx + LAMP_BASE.dx1 && y1 > fy + LAMP_BASE.dy0 && y0 < fy + LAMP_BASE.dy1) return true;
  }
  return false;
}
/** billvid (Bill, 2026-10-22): the bone car display is solid: the lot and the ropes and posts round it (x0..x1+1, y0..y1+1). */
export function showroomSolid(tx: number, ty: number): boolean {
  return tx >= SHOWROOM.x0 && tx <= SHOWROOM.x1 + 1 && ty >= SHOWROOM.y0 && ty <= SHOWROOM.y1 + 1;
}
