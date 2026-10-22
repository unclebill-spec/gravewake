/**
 * playtest1v [OWNER-APPROVED 2026-10-05 21:31 ET: playtest1v map fog + bone car]: the bone car. A steam automobile of
 * skeleton bones (tools/pixel-writer/bone_car_writer.py: rib-cage body, skull headlamps in neon-blue cold fire, bone-spoke
 * wheels, brass boiler and pipes) sold in town from behind velvet ropes by a salesman. Once owned it is driven on the
 * vale only, at CAR.speed times the walk (74 px/s). It never enters a door, a stair, a dungeon mouth, a rift, a wayrift or
 * a village: touching one stops it and you step down, the car waiting there. A foe that takes notice, a hit, a fight or
 * a fall puts you down too; no blow is struck from the seat. It collides like the hero, by its own footprint (side on
 * and end on), and does not go into water. Saved: owned, and where it stands on the vale (world px).
 *
 * Price: 240 silver. The economy at 1u: a croft is 80, a guild hire 15-40, a shop rank-4 piece ~38-62, a bounty 16-40
 * a night. 240 is three crofts, six to ten nights of bounties: a mid-game prize, not a starting one.
 */
export const CAR = {
  price: 240,
  /** Times the walk (74 px/s): 2.25 -> 166.5 px/s. The run is 110 (1.49x). */
  speed: 2.25,
  walk: 74,
  /** Footprints round the seat (the hero's px, py): side on (facing e/w) and end on (facing n/s). */
  foot: { side: { x: 22, y0: -4, y1: 5 }, end: { x: 7, y0: -12, y1: 5 } },
  /** How close (px) you stand to step in with Use. */
  near: 28,
  /** A noticing foe this close (px) puts you down. */
  foeNear: 10 * 16,
  /** Steam: a puff every steamEvery s while driving (every 3x that while parked with the fire up), life puffLife s. */
  steamEvery: 0.16,
  puffLife: 0.9,
  puffMax: 14,
  /** The bone rattle: a clack every rattleEvery s of driving. */
  rattleEvery: 0.42,
  /** Sheet: 64x48 cells, rows side / front / back, cols wheel frame 0, 1, the rider's front layer. Foot on row 45. */
  cell: { w: 64, h: 48, foot: 45 },
  /** Where it waits on the vale once bought: on the road east of the town gate, clear of the hub wayrifts (tiles). */
  park: { x: 96, y: 125 },
} as const;

/** The town showroom: the roped lot (tiles, inclusive), where the car stands in it, the salesman, the rope posts. */
export const SHOWROOM = {
  x0: 29,
  y0: 27,
  x1: 32,
  y1: 28,
  /** The car's seat point (px): its 64 px body centred on the lot, its wheels on the lot's bottom row. */
  carX: 29 * 16 + 32,
  carY: 28 * 16 + 3,
  salesman: { id: "carman", name: "Ossian Sprocket", x: 28 * 16 + 8, y: 28 * 16 + 8, coat: "#3a2c24", role: "carman" },
  posts: [
    [29, 27],
    [33, 27],
    [29, 29],
    [33, 29],
    [31, 29],
  ] as [number, number][],
} as const;

export const CAR_LINES = {
  pitch: `Ossian Sprocket polishes a femur. "The Ossuary Runabout. Rib-cage body, a boiler that never cools, skull lamps that see through any night. ${CAR.price} silver and she is yours, waiting by the road gate."`,
  owned: `Ossian Sprocket tips his hat. "She waits by the road gate, or wherever you left her on the vale. Press the car button, or B, or Use beside her."`,
  poor: (coin: number) => `Ossian Sprocket shakes his head. "${CAR.price} silver, friend. You have ${coin}. Come back when your purse rattles like she does."`,
  sold: `Ossian Sprocket hands you a brass key shaped like a knucklebone. "Sold! She waits by the road gate outside town. Use beside her, the car button, or B, to climb in."`,
  on: "You climb into the bone car. The boiler hisses awake.",
  off: "You step down. The bone car ticks as it cools.",
  door: "The bone car will not fit through there. You step down; it waits outside.",
  fight: "A foe takes notice. You leap down from the bone car.",
  hit: "The blow throws you from the bone car.",
  noFight: "No blow from the seat. Step down from the bone car first.",
  noRoom: "There is no room for the bone car here.",
  notHere: "The bone car runs on the open vale only.",
  far: "The bone car rattles up the road to you.",
  water: "The bone car will not go into the water.",
} as const;

export type CarFacing = "e" | "w" | "n" | "s";

/** The footprint box of the car round (x, y) facing f, as the corner and edge points the body rule tests. */
export function carPoints(x: number, y: number, f: CarFacing): [number, number][] {
  const s = f === "e" || f === "w" ? CAR.foot.side : CAR.foot.end;
  const out: [number, number][] = [];
  for (const dx of [-s.x, -s.x / 2, 0, s.x / 2, s.x]) for (const dy of [s.y0, s.y1]) out.push([x + dx, y + dy]);
  out.push([x - s.x, y + (s.y0 + s.y1) / 2], [x + s.x, y + (s.y0 + s.y1) / 2]);
  return out;
}

/** The sheet row for a facing (west is the side row mirrored). */
export function carRow(f: CarFacing): number {
  return f === "e" || f === "w" ? 0 : f === "s" ? 1 : 2;
}

/** Is tile (tx, ty) inside the showroom's roped lot (posts and ropes included)? */
export function inShowroom(tx: number, ty: number): boolean {
  return tx >= SHOWROOM.x0 && tx <= SHOWROOM.x1 && ty >= SHOWROOM.y0 && ty <= SHOWROOM.y1;
}
