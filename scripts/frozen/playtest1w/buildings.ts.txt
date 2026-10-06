/**
 * playtest1t [OWNER-APPROVED 2026-10-04 14:09 ET: playtest1t varied buildings] (Bill, 2026-10-04 14:09 ET: "draw a
 * variety of buildings so all of them don't look exactly the same, but make sure the buildings fit the world and
 * surroundings"). Picture only: the town grid, collision, doors and entry are untouched.
 *
 * The town's wall blocks are split into lots, one per room door (Noll's cottage and the South Croft share a block: two
 * lots, split where the block's column height changes). Every lot has its own writer sheet
 * (tools/pixel-writer/house_writer.py, public/art/writer/town-bldg-<room>.png and its _em glow mask): one row per
 * variant, one column per season, each cell exactly the lot's width and the lot's height plus its headroom (the room up
 * to the next building's roof limit), so the building covers its whole solid lot, stands on its south edge, has its door
 * on the door tile and is never cut. A lot shows one variant, picked by a seeded hash of its room (BLDG.seed), so the
 * town looks the same on every load, save and machine. Each variant keeps its room's interior style (interiors.ts
 * ROOM_STYLE: cabin rooms are timber outside, stone rooms stone, slate rooms blue boards).
 */
import { SEASON, type SeasonId } from "./seasons";

/** Per room: lot w, h (tiles), the door's column in the lot, headroom (px), its interior style, its variant count. */
export const BLDG_LOTS = {
  inn: { w: 8, h: 5, door: 3, head: 32, style: "cabin", n: 2 },
  shop: { w: 6, h: 5, door: 2, head: 32, style: "cabin", n: 2 },
  guild: { w: 7, h: 5, door: 6, head: 32, style: "cabin", n: 2 },
  bank: { w: 5, h: 5, door: 1, head: 32, style: "stone", n: 2 },
  bram: { w: 6, h: 4, door: 2, head: 14, style: "stone", n: 2 },
  pell: { w: 6, h: 4, door: 2, head: 14, style: "cabin", n: 2 },
  ivy: { w: 6, h: 4, door: 2, head: 14, style: "cabin", n: 2 },
  chapel: { w: 8, h: 5, door: 3, head: 46, style: "cabin", n: 2 },
  casino: { w: 7, h: 5, door: 3, head: 46, style: "cabin", n: 2 },
  smith: { w: 6, h: 5, door: 2, head: 48, style: "cabin", n: 2 },
  fisher: { w: 3, h: 4, door: 1, head: 22, style: "slate", n: 2 },
  tailor: { w: 7, h: 5, door: 3, head: 30, style: "cabin", n: 2 },
  noll: { w: 6, h: 5, door: 2, head: 40, style: "slate", n: 2 },
  croft: { w: 3, h: 4, door: 1, head: 30, style: "slate", n: 2 },
  alchemy: { w: 7, h: 5, door: 3, head: 30, style: "cabin", n: 2 },
  mystic: { w: 5, h: 5, door: 1, head: 30, style: "stone", n: 2 },
} as const;
export type BldgRoom = keyof typeof BLDG_LOTS;

/** The pick's seed, the season columns, the shadow (multiply, as the blob shadows: style doc section 7). */
export const BLDG = {
  seed: "gravewake-bldg-1t-3",
  seasons: ["autumn", "winter", "spring", "summer"] as SeasonId[],
  shadow: { k: 0.45, south: 4, east: 3, up: 22 },
} as const;

export const bldgSheet = (room: string) => `/art/writer/town-bldg-${room}.png`;
export const bldgEm = (room: string) => `/art/writer/town-bldg-${room}_em.png`;
export const BLDG_SHEETS: string[] = Object.keys(BLDG_LOTS).flatMap((r) => [bldgSheet(r), bldgEm(r)]);

/** FNV-1a over the seed and the room id, then a final mix: a lot's variant, the same everywhere and every time. */
export function variantOf(room: string): number {
  const def = BLDG_LOTS[room as BldgRoom];
  if (!def) return 0;
  let n = 2166136261;
  const s = `${BLDG.seed}:${room}`;
  for (let i = 0; i < s.length; i++) n = Math.imul(n ^ s.charCodeAt(i), 16777619) >>> 0;
  // FNV's low bits follow the characters' parity alone; a final mix spreads every bit before the pick
  n ^= n >>> 16;
  n = Math.imul(n, 2246822507) >>> 0;
  n = (n ^ (n >>> 13)) >>> 0;
  return n % def.n;
}

/** The season's column in a building sheet (autumn, winter, spring, summer; anything else is autumn). */
export const seasonCol = (s: string) => Math.max(0, BLDG.seasons.indexOf(s as SeasonId));
export const SEASON_COLS = SEASON.order.length;

export type Lot = { room: string; x: number; y: number; w: number; h: number; doorX: number; doorY: number };

/**
 * The town's lots: each wall/door block, split into runs of columns of the same height (a block that holds two rooms,
 * like Noll's cottage and the South Croft, steps down where one ends), each run with exactly one room door on its south
 * row. A run with no room door (none today) is left out. Pure: the same grid gives the same lots.
 */
export function townLots(w: number, h: number, tiles: ArrayLike<number>, wall: number, door: number, roomAt: (x: number, y: number) => { id: string } | undefined): Lot[] {
  const solid = (x: number, y: number) => x >= 0 && y >= 0 && x < w && y < h && (tiles[y * w + x] === wall || tiles[y * w + x] === door);
  const seen = new Uint8Array(w * h);
  const out: Lot[] = [];
  for (let i = 0; i < w * h; i++) {
    if (seen[i] || !solid(i % w, (i - (i % w)) / w)) continue;
    const cells: number[] = [];
    const stack = [i];
    seen[i] = 1;
    while (stack.length) {
      const k = stack.pop()!;
      cells.push(k);
      const kx = k % w;
      const ky = (k - kx) / w;
      for (const [nx, ny] of [[kx - 1, ky], [kx + 1, ky], [kx, ky - 1], [kx, ky + 1]]) {
        if (!solid(nx, ny) || seen[ny * w + nx]) continue;
        seen[ny * w + nx] = 1;
        stack.push(ny * w + nx);
      }
    }
    // each column's span (top, bottom) in this block
    const span = new Map<number, [number, number]>();
    for (const k of cells) {
      const kx = k % w;
      const ky = (k - kx) / w;
      const s = span.get(kx);
      span.set(kx, s ? [Math.min(s[0], ky), Math.max(s[1], ky)] : [ky, ky]);
    }
    const cols = [...span.keys()].sort((a, b) => a - b);
    let a = 0;
    while (a < cols.length) {
      let b = a;
      const [t0, b0] = span.get(cols[a])!;
      while (b + 1 < cols.length && cols[b + 1] === cols[b] + 1 && span.get(cols[b + 1])![0] === t0 && span.get(cols[b + 1])![1] === b0) b++;
      const x0 = cols[a];
      const x1 = cols[b];
      let lot: Lot | null = null;
      for (let x = x0; x <= x1; x++) {
        if (tiles[b0 * w + x] !== door) continue;
        const r = roomAt(x, b0);
        if (r && !lot) lot = { room: r.id, x: x0, y: t0, w: x1 - x0 + 1, h: b0 - t0 + 1, doorX: x, doorY: b0 };
      }
      if (lot) out.push(lot);
      a = b + 1;
    }
  }
  return out;
}

/**
 * A lot's headroom: how far its roof may rise over the lot before it meets the next building north of it (the draw's
 * roof limit: two pixels under that building's south edge). No building above: up to the map's top.
 */
export function lotHead(lot: Lot, w: number, tiles: ArrayLike<number>, wall: number, door: number): number {
  for (let ty = lot.y - 1; ty >= 0; ty--) {
    for (let tx = lot.x; tx < lot.x + lot.w; tx++) {
      const t = tiles[ty * w + tx];
      if (t === wall || t === door) return lot.y * 16 - ((ty + 1) * 16 + 2);
    }
  }
  return lot.y * 16;
}

/** Where a lot's sheet cell is and where it lands (world px): the cell's bottom on the lot's south edge. */
export function lotCell(lot: Lot, season: string): { sx: number; sy: number; w: number; h: number; dx: number; dy: number } | null {
  const def = BLDG_LOTS[lot.room as BldgRoom];
  if (!def || def.w !== lot.w || def.h !== lot.h) return null;
  const w = def.w * 16;
  const h = def.h * 16 + def.head;
  return { sx: seasonCol(season) * w, sy: variantOf(lot.room) * h, w, h, dx: lot.x * 16, dy: (lot.y + lot.h) * 16 - h };
}
