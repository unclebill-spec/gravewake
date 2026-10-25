/**
 * townwide (Bill, 2026-10-22: "make the Gravewake town larger inside so it isn't cramped. The cemetery and the wayrift
 * portal park need open room and must not sit behind buildings"). The town grows from 40x30 to 58x42 (2.03x the area).
 *
 * The old plan is spread, not redrawn: wide streets and gaps are put in between the old blocks (OLD_TO_NEW), so every
 * building keeps its size, its sign and its door on its south face, and every spot the game names (a doorstep, a
 * townsperson's day tile, a gate) keeps its place in the plan. The cemetery moves to its own open yard west of the
 * avenue (CEMETERY) and the portal park to its own cobbled plaza east of it (PLAZA), both in clear view of the streets.
 * Pure data: no imports, so content, sim, draw and the checks can all read it.
 */
export const TOWN_W = 58;
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
// Each lot keeps its old column's residue mod 6 (the town draw's pick: an even five-wide lot is a cabin, else house x0 % 3),
// so every building wears the outside it always had and its room's inside still matches (interiors.ts ROOM_STYLE).
export const TOWN_BLOCKS: TownBlock[] = [
  block("inn", 2, 2, 8, 5, 3),
  block("shop", 12, 2, 6, 5, 2),
  block("fisher", 20, 3, 3, 4, 1),
  block("guild", 36, 2, 7, 5, 6),
  block("bank", 45, 2, 5, 5, 1),
  block("bram", 3, 11, 6, 4, 2),
  block("pell", 12, 11, 6, 4, 2),
  block("ivy", 36, 11, 6, 4, 2),
  block("chapel", 2, 20, 8, 5, 3),
  block("casino", 42, 20, 7, 5, 3),
  block("smith", 50, 20, 6, 5, 2),
  block("tailor", 2, 32, 7, 5, 3),
  block("noll", 11, 32, 6, 5, 2),
  block("croft", 20, 33, 3, 4, 1),
  block("alchemy", 42, 32, 7, 5, 3),
  block("mystic", 51, 32, 5, 5, 1),
];
export const blockOf = (room: string) => TOWN_BLOCKS.find((b) => b.room === room)!;

/** The cemetery yard (inclusive), its path column pair, the crypt stair and the graves. */
export const CEMETERY = {
  x0: 12, y0: 18, x1: 24, y1: 27,
  path: [17, 18] as [number, number],
  stair: { x: 18, y: 19 },
  // the old yard's three dig sites (graves.ts), spread over the new yard
  graves: [[14, 21], [21, 21], [15, 24]] as [number, number][],
  undertaker: { x: 20, y: 19 },
} as const;

/** The portal plaza (inclusive cobble square) and the park in it: the old 6x4 park block moved by (dx, dy). */
export const PLAZA = { x0: 29, y0: 18, x1: 39, y1: 27 } as const;
export const PARK = { dx: 15, dy: 7 } as const;
/** The park's pieces in new tiles: the wayrift's tile, the statues' and the arch's top-left tiles, the pool. */
export const PARK_AT = {
  core: { x: 16 + PARK.dx, y: 14 + PARK.dy, w: 6, h: 4 },
  rift: { x: 18 + PARK.dx, y: 15 + PARK.dy },
  statues: [[16 + PARK.dx, 13 + PARK.dy], [21 + PARK.dx, 13 + PARK.dy]] as [number, number][],
  arch: { x: 17 + PARK.dx, y: 16 + PARK.dy },
  pool: { x: 20 + PARK.dx, y: 16 + PARK.dy },
} as const;

/** The car showroom moves with the south lane: the old lot (29, 27) moved by (dx, dy). */
export const SHOW = { dx: 18, dy: 10 } as const;
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

/** carlot (Bill, 2026-10-22): the bone car's own yard by the south gate: a low picket fence down both sides (x 32 and 39,
 * rows 38-40), open to the lane on the north; the town fence closes its south. bonecar.ts SHOWROOM sits inside. */
export const CAR_LOT = { x0: 32, x1: 39, y0: 38, y1: 40 } as const;
export function carLotFence(): { x: number; y: number; cell: number }[] {
  const out: { x: number; y: number; cell: number }[] = [];
  for (let y = CAR_LOT.y0; y <= CAR_LOT.y1; y++) for (const x of [CAR_LOT.x0, CAR_LOT.x1]) out.push({ x, y, cell: y === CAR_LOT.y0 ? 2 : 1 });
  return out;
}

/**
 * MB final pass 2 (Bill, 2026-10-25, "Do the violet slate version"): the cemetery's grave mounds, the writer's
 * grave-mounds.png (tools/pixel-writer/mound_writer.py, 16x32 cells). A fixed seed picks grass tiles inside the yard
 * only: never on the path or the dirt walk, never by the crypt stair or the undertaker (8 sides) or a dig site (4 sides),
 * never beside another mound (so every row and column stays walkable). `open(x, y)` says a tile is bare grass.
 * Looks plus a grave's push-out; g.tiles is never touched, so saves and the town grid are as they were.
 */
export const MOUND_CELLS = 6;
export function graveMounds(open: (x: number, y: number) => boolean, seed = 4101, want = 7): { x: number; y: number; cell: number }[] {
  const c = CEMETERY;
  const keep: [number, number][] = [[c.stair.x, c.stair.y], [c.undertaker.x, c.undertaker.y]];
  const byGrave = (x: number, y: number) => c.graves.some(([gx, gy]) => Math.abs(gx - x) + Math.abs(gy - y) <= 1); // a dig site keeps its four sides
  const near = (x: number, y: number, ps: readonly (readonly [number, number])[]) => ps.some(([px, py]) => Math.abs(px - x) <= 1 && Math.abs(py - y) <= 1);
  const spots: [number, number][] = [];
  for (let y = c.y0 + 2; y <= c.y1 - 2; y++) {
    for (let x = c.x0 + 2; x <= c.x1 - 2; x++) {
      if (x === c.path[0] || x === c.path[1]) continue; // the path
      if (near(x, y, keep) || byGrave(x, y) || !open(x, y)) continue;
      spots.push([x, y]);
    }
  }
  let s = seed >>> 0;
  const rnd = () => ((s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 4294967296);
  for (let i = spots.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [spots[i], spots[j]] = [spots[j], spots[i]]; }
  const out: { x: number; y: number; cell: number }[] = [];
  for (const [x, y] of spots) {
    if (out.length >= want) break;
    if (near(x, y, out.map((m) => [m.x, m.y] as [number, number]))) continue;
    out.push({ x, y, cell: out.length % MOUND_CELLS });
  }
  return out.sort((a, b) => a.y - b.y || a.x - b.x);
}
