/**
 * playtest1v [OWNER-APPROVED 2026-10-05 21:14 ET: playtest1v hamlet zones] (Bill, 2026-10-05 21:14 ET): a hamlet on the
 * open vale is now a small village icon (a clutch of 2-3 roofs from the 1u hamlet sheets, lit at night, marked on the
 * corner map). Stepping onto the doorstep of its middle roof (or tapping it, which walks you there) zones you into the
 * village's own little map: a few of its biome's buildings round a green (one of the 1u layouts, 3-4 lots, every lot a
 * hamlet sheet in its season with its lamp), a trader on the green, a tree line, and a gap in the south trees that puts you
 * back on the vale one tile south of the doorstep you came in by. No foe walks a village map.
 *
 * Pure and seeded: the same village id always lays the same map. sim.ts owns the trip (enterVillage, leaveVillage, the
 * save, the portal); draw.ts draws the map as the vale (theme "over") in the village's biome.
 */
import { T } from "./content";
import { HAMLET_KINDS, type HamletBiomeId, type HamletLotT, type HamletT } from "./hamlets";
import { HAMLET_PLANS, VILLAGE_PLANS, WORLD_DRESS } from "../../tools/map-writer/gravewake_world";
import { rng32, subSeed } from "../../tools/map-writer/map_writer";

/** The village map: size (tiles), the tree border, the gap's width in the south trees, how many trees and rocks dot the margins. */
export const VILLAGE = { w: 24, h: 18, border: 2, gap: 3, props: 10, seed: "gravewake-village-1v" } as const;
/** Each biome's village names, taken in the order the writer laid that biome's icons. */
export const VILLAGE_NAMES: Record<HamletBiomeId, readonly string[]> = {
  snow: ["Rimefold", "Hollowcairn", "Frostwick", "Whitlow", "Sleetmoor"],
  sand: ["Dunmere", "Saltreach", "Ochre Well", "Sandwhistle", "Glasspan"],
  ash: ["Cinderby", "Emberlow", "Soot Hollow", "Kilnmouth", "Clinkerhythe"],
  swamp: ["Reedmire", "Mudlantern", "Stillwater", "Bogsend", "Wickfen"],
};
/** The trader on each biome's green (the merchant role, its own coat). */
export const VILLAGE_VENDOR: Record<HamletBiomeId, { name: string; coat: string }> = {
  snow: { name: "Hollow Trader", coat: "#d0d8e4" },
  sand: { name: "Waste Trader", coat: "#c4b48a" },
  ash: { name: "Cinder Trader", coat: "#4a4038" },
  swamp: { name: "Bog Trader", coat: "#2a4030" },
};
export type VillageT = {
  id: string;
  name: string;
  biome: HamletBiomeId;
  w: number;
  h: number;
  tiles: Uint8Array;
  /** The village's buildings as a hamlet on this little grid (draw.ts draws its lots, lamps and walk like the vale's). */
  hamlet: HamletT;
  /** Where you stand on arrival (tile), just inside the south gap; the gap's exit tiles. */
  arrive: { x: number; y: number };
  exits: number[];
  vendor: { x: number; y: number; name: string; coat: string };
};

/** 1u's walk rule for a box of lots round a green: down from each north-row door to the green's middle row, along it and out both sides. */
export function hamletWalk(box: { x: number; y: number; w: number }, lots: { x: number; y: number; h: number; doorX: number; doorY: number }[], w: number): { cells: Set<number>; mid: number } {
  const north = lots.filter((l) => l.y === box.y);
  const south = lots.filter((l) => l.y !== box.y);
  const southTop = south.length ? Math.min(...south.map((l) => l.y)) : box.y + 6;
  const mid = Math.floor((box.y + 3 + southTop - 1) / 2);
  const cells = new Set<number>();
  for (const l of north) for (let y = l.doorY + 1; y <= mid; y++) cells.add(y * w + l.doorX);
  for (let x = box.x - 1; x <= box.x + box.w; x++) cells.add(mid * w + x);
  return { cells, mid };
}

const walkable = (t: number) => t !== T.wall && t !== T.tree && t !== T.rock && t !== T.exit;
function steps(tiles: Uint8Array, w: number, h: number, from: number): Int32Array {
  const d = new Int32Array(w * h).fill(-1);
  const q = [from];
  d[from] = 0;
  for (let k = 0; k < q.length; k++) {
    const i = q[k];
    const x = i % w;
    const y = (i - x) / w;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx;
      const ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
      const j = ny * w + nx;
      if (d[j] >= 0 || !walkable(tiles[j])) continue;
      d[j] = d[i] + 1;
      q.push(j);
    }
  }
  return d;
}

/** One village's map, from its id, biome and the order its icon was laid in. Pure and seeded. */
export function buildVillage(id: string, biome: HamletBiomeId, index: number): VillageT {
  const { w, h, border, gap } = VILLAGE;
  const r = rng32(subSeed(VILLAGE.seed, id));
  const ground = WORLD_DRESS[biome].ground;
  const tiles = new Uint8Array(w * h).fill(ground);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (x < border || y < border || x >= w - border || y >= h - border) tiles[y * w + x] = T.tree;
  // the south gap: the border trees open on `gap` columns; the edge row there is the way out
  const gx = Math.floor((w - gap) / 2);
  const exits: number[] = [];
  for (let x = gx; x < gx + gap; x++) {
    for (let y = h - border; y < h - 1; y++) tiles[y * w + x] = ground;
    tiles[(h - 1) * w + x] = T.exit;
    exits.push((h - 1) * w + x);
  }
  // the buildings: one of the 1u layouts (3-4 lots), centred, a row below the north trees
  const planId = VILLAGE_PLANS[Math.floor(r() * VILLAGE_PLANS.length)];
  const P = HAMLET_PLANS[planId];
  const bx = Math.floor((w - P.w) / 2);
  const by = border + 1;
  const lots: HamletLotT[] = P.lots.map((l) => ({ x: bx + l.x, y: by + l.y, w: l.w, h: l.h, doorX: bx + l.x + l.door, doorY: by + l.y + l.h - 1, size: l.size, variant: Math.floor(r() * 2), kind: HAMLET_KINDS[biome][l.size] }));
  for (const l of lots) for (let y = l.y; y < l.y + l.h; y++) for (let x = l.x; x < l.x + l.w; x++) tiles[y * w + x] = T.wall;
  const { cells, mid } = hamletWalk({ x: bx, y: by, w: P.w }, lots, w);
  const arrive = { x: gx + Math.floor(gap / 2), y: h - border - 1 };
  // the path out: the shortest walk from the green's middle row to the gap, laid as walk cells too
  const d = steps(tiles, w, h, arrive.y * w + arrive.x);
  let at = mid * w + bx + Math.floor(P.w / 2);
  if (d[at] < 0) at = mid * w + bx - 1;
  for (let guard = 0; guard < w * h && d[at] > 0; guard++) {
    cells.add(at);
    const x = at % w;
    const y = (at - x) / w;
    const next = [[0, 1], [-1, 0], [1, 0], [0, -1]].map(([dx, dy]) => (y + dy) * w + (x + dx)).find((j) => j >= 0 && j < w * h && d[j] === d[at] - 1);
    if (next === undefined) break;
    at = next;
  }
  cells.add(arrive.y * w + arrive.x);
  for (let y = arrive.y + 1; y < h - 1; y++) cells.add(y * w + arrive.x);
  // the trader: the open green tile (in the box, off every walk cell and doorstep) nearest the box's middle
  const doorsteps = new Set(lots.map((l) => (l.doorY + 1) * w + l.doorX));
  let vendor = { x: bx - 1, y: mid - 1 };
  let best = Infinity;
  const cx = bx + P.w / 2 - 0.5;
  for (let y = by; y < by + P.h; y++) {
    for (let x = bx; x < bx + P.w; x++) {
      const i = y * w + x;
      if (tiles[i] !== ground || cells.has(i) || doorsteps.has(i)) continue;
      const s = Math.abs(x - cx) + Math.abs(y - mid) * 1.2;
      if (s < best) {
        best = s;
        vendor = { x, y };
      }
    }
  }
  // a few trees and rocks in the side margins, each kept only if every walk cell, doorstep and the trader stay reached
  const need = [...cells, ...doorsteps, vendor.y * w + vendor.x];
  const keepOff = new Set<number>(need);
  for (let n = 0; n < VILLAGE.props * 3 && n < 200; n++) {
    const x = border + Math.floor(r() * (w - 2 * border));
    const y = border + Math.floor(r() * (h - 2 * border - 1));
    const i = y * w + x;
    const t = r() < 0.7 ? T.tree : T.rock;
    if (tiles[i] !== ground || keepOff.has(i)) continue;
    if (x >= bx - 2 && x <= bx + P.w + 1 && y >= by - 1 && y <= by + P.h) continue;
    if (Math.abs(x - arrive.x) <= 2 && y >= arrive.y - 2) continue;
    tiles[i] = t;
    const dd = steps(tiles, w, h, arrive.y * w + arrive.x);
    if (need.some((j) => dd[j] < 0)) tiles[i] = ground;
  }
  const names = VILLAGE_NAMES[biome];
  const hamlet: HamletT = { x: bx, y: by, w: P.w, h: P.h, biome, lots, walk: [...cells].filter((i) => tiles[i] !== T.wall && tiles[i] !== T.exit).sort((a, b) => a - b), id, name: names[index % names.length] };
  return { id, name: hamlet.name ?? id, biome, w, h, tiles, hamlet, arrive, exits, vendor: { ...vendor, ...VILLAGE_VENDOR[biome] } };
}
