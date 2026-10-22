/**
 * townwide (Bill, 2026-10-22: "make the Gravewake town larger inside so it isn't cramped. The cemetery and the wayrift
 * portal park need open room and must not sit behind buildings"). The town grows from 40x30 to 56x42 (1.96x the area).
 *
 * The old plan is spread, not redrawn: wide streets and gaps are put in between the old blocks (OLD_TO_NEW), so every
 * building keeps its size, its sign and its door on its south face, and every spot the game names (a doorstep, a
 * townsperson's day tile, a gate) keeps its place in the plan. The cemetery moves to its own open yard west of the
 * avenue (CEMETERY) and the portal park to its own cobbled plaza east of it (PLAZA), both in clear view of the streets.
 * Pure data: no imports, so content, sim, draw and the checks can all read it.
 */
export const TOWN_W = 56;
export const TOWN_H = 42;
/** The plan's version on a save: a town position saved without it is from the old 40x30 town. */
export const TOWN_PLAN = 2;

/** Old column -> new column: gaps inserted before old columns 10 (+3), 20 (+4), 22 (+7) and 31 (+2). */
export function townX(x: number): number {
  return x < 10 ? x : x < 20 ? x + 3 : x < 22 ? x + 7 : x < 31 ? x + 14 : x + 16;
}
/** Old row -> new row: gaps inserted before old rows 8 (+3), 14 (+3), 21 (+2), 22 (+2) and 28 (+2). */
export function townY(y: number): number {
  return y < 8 ? y : y < 14 ? y + 3 : y < 21 ? y + 6 : y < 22 ? y + 8 : y < 28 ? y + 10 : y + 12;
}

/** The streets (rows and the avenue's columns, inclusive). */
export const STREETS = { north: [15, 16], south: [29, 30], avenue: [27, 28], lane: 37 } as const;

/** Every building: its block (tiles), its door (on its south row). */
export type TownBlock = { room: string; x: number; y: number; w: number; h: number; doorX: number; doorY: number };
const block = (room: string, x: number, y: number, w: number, h: number, door: number): TownBlock => ({ room, x, y, w, h, doorX: x + door, doorY: y + h - 1 });
export const TOWN_BLOCKS: TownBlock[] = [
  block("inn", 2, 2, 8, 5, 3),
  block("shop", 15, 2, 6, 5, 2),
  block("fisher", 22, 3, 3, 4, 1),
  block("guild", 38, 2, 7, 5, 6),
  block("bank", 49, 2, 5, 5, 1),
  block("bram", 3, 11, 6, 4, 2),
  block("pell", 15, 11, 6, 4, 2),
  block("ivy", 38, 11, 6, 4, 2),
  block("chapel", 2, 20, 8, 5, 3),
  block("casino", 38, 20, 7, 5, 3),
  block("smith", 48, 20, 6, 5, 2),
  block("tailor", 2, 32, 7, 5, 3),
  block("noll", 14, 32, 6, 5, 2),
  block("croft", 21, 33, 3, 4, 1),
  block("alchemy", 38, 32, 7, 5, 3),
  block("mystic", 49, 32, 5, 5, 1),
];
export const blockOf = (room: string) => TOWN_BLOCKS.find((b) => b.room === room)!;

/** The cemetery yard (inclusive), its path column pair, the crypt stair and the graves. */
export const CEMETERY = {
  x0: 12, y0: 18, x1: 24, y1: 27,
  path: [17, 18] as [number, number],
  stair: { x: 18, y: 19 },
  graves: [[14, 21], [21, 21], [14, 24], [21, 24], [16, 26]] as [number, number][],
  undertaker: { x: 20, y: 19 },
} as const;

/** The portal plaza (inclusive cobble square) and the park in it: the old 6x4 park block moved by (dx, dy). */
export const PLAZA = { x0: 29, y0: 18, x1: 37, y1: 27 } as const;
export const PARK = { dx: 14, dy: 7 } as const;
/** The park's pieces in new tiles: the wayrift's tile, the statues' and the arch's top-left tiles, the pool. */
export const PARK_AT = {
  core: { x: 16 + PARK.dx, y: 14 + PARK.dy, w: 6, h: 4 },
  rift: { x: 18 + PARK.dx, y: 15 + PARK.dy },
  statues: [[16 + PARK.dx, 13 + PARK.dy], [21 + PARK.dx, 13 + PARK.dy]] as [number, number][],
  arch: { x: 17 + PARK.dx, y: 16 + PARK.dy },
  pool: { x: 20 + PARK.dx, y: 16 + PARK.dy },
} as const;

/** The car showroom moves with the south lane: the old lot (29, 27) moved by (dx, dy). */
export const SHOW = { dx: 14, dy: 10 } as const;
/** The zeppelin pad (inclusive). */
export const ZEP_PAD = { x0: 50, y0: 12, x1: 53, y1: 14 } as const;
/** Where the hero stands on a fresh wake (and where an old save's town position is put): the avenue at the plaza. */
export const TOWN_SPAWN = { x: 27, y: 20 } as const;

/** Is (tx, ty) inside a 40x30 town position that the old plan used? (An old save's town spot.) */
export const OLD_TOWN = { w: 40, h: 30 } as const;

/**
 * The cemetery's picket fence (the writer's town-fence cells: 0 a run, 1 a side, 2 a gate post), on the yard's edge
 * tiles, open where the path crosses its north and south sides. The town draws it and it stops bodies, as a yard fence.
 */
export function cemeteryFence(): { x: number; y: number; cell: number }[] {
  const c = CEMETERY;
  const out: { x: number; y: number; cell: number }[] = [];
  const gap = (x: number) => x === c.path[0] || x === c.path[1];
  for (let x = c.x0; x <= c.x1; x++) {
    for (const y of [c.y0, c.y1]) {
      if (gap(x)) continue;
      out.push({ x, y, cell: gap(x - 1) || gap(x + 1) ? 2 : 0 });
    }
  }
  for (let y = c.y0 + 1; y < c.y1; y++) for (const x of [c.x0, c.x1]) out.push({ x, y, cell: 1 });
  return out;
}
