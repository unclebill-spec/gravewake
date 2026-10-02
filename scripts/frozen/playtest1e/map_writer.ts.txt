/**
 * Map writer: seeded procedural maps on a plain tile grid.
 *
 * The fourth writer, next to the sprite, pixel, and spell writers. It knows nothing about any one
 * game: you pass the tile codes, the foe roster, and the level, and it hands back a grid plus the
 * rooms, stairs, spawns, and foes it chose. The grid is the same shape a hand-carved floor uses
 * (tiles: Uint8Array, row-major, width w, height h), so a game's own secret, trap, mimic, and
 * captive placement can run on it afterwards.
 *
 * Seeded only. The same options give the same map, byte for byte. No Math.random, no clock.
 *
 * Phase 1: one dungeon floor (rooms and corridors, tagged start / boss / vault) and one rift
 * pocket (a cave blob with an exit back).
 *
 * Phase 2: biome noise blending. `blendBiomes` takes a hard per-tile biome map (straight edges, as a
 * game lays its regions) and returns a ragged one: each tile may take a biome from up to `reach`
 * tiles away, picked by a seeded, smooth domain warp, plus a per-tile edge mask for drawing a dithered
 * fringe. It only says which biome a tile looks like; the caller decides what that changes (in
 * Gravewake: the ground art only, see gravewake_vale.ts). The `biome` slot on writeDungeon and
 * writeRift fills its layer the same way and never changes the tiles.
 */

// ---- Seeds ----

/** FNV-1a over a string, or a number folded to 32 bits. */
export function hashSeed(seed: number | string): number {
  if (typeof seed === "number") return (Math.floor(seed) ^ 0x9e3779b9) >>> 0;
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h >>> 0;
}

/** Mix a seed with labels, so each part of a map (rooms, foes, a floor, a rift spot) has its own stream. */
export function subSeed(seed: number | string, ...parts: (number | string)[]): number {
  return hashSeed(`${hashSeed(seed)}:${parts.join(":")}`);
}

/** mulberry32. Returns [0, 1). */
export function rng32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * The seed a rift at an overworld tile uses, so one spot always opens the same pocket. Pass an epoch
 * (a day-night cycle, a week, a run) to reroll it on that clock; the same epoch gives the same pocket.
 */
export function riftSeed(worldSeed: number | string, tx: number, ty: number, epoch?: number): number {
  const spot = subSeed(worldSeed, "rift", tx, ty);
  return epoch === undefined ? spot : subSeed(spot, "epoch", epoch);
}

// ---- Types ----

/** The tile codes the writer paints. Pass your game's own numbers. */
export type TileCodes = {
  wall: number;
  floor: number;
  stairUp: number;
  stairDown: number;
  chest: number;
  /** The rift's way back. */
  exit: number;
};

export type Rect = { x: number; y: number; w: number; h: number };
export type Spot = { x: number; y: number };
export type RoomTag = "start" | "boss" | "vault" | "room";
export type Room = Rect & { id: number; tag: RoomTag; center: Spot; /** walking steps from the up stair */ depth: number };
/** A foe entry from your roster. weight defaults to 1. */
export type FoeEntry = { id: string; weight?: number };
/** A foe the writer placed. level is passed through untouched; stats are the game's job. */
export type FoePlacement = Spot & { id: string; level: number; room: number };

/**
 * A biome field names the biomes and returns, per tile, one weight per name. One name fills the
 * layer with 0. Two or more need `weights`: the heaviest name wins each tile (ties go to the earlier
 * name), then blendBiomes roughs up the borders. The layer is a label for the caller; the writer's
 * tiles, rooms, and foes are the same with or without it.
 */
export type BiomeField = { names: string[]; weights?: (x: number, y: number) => ArrayLike<number>; reach?: number; scale?: number };

export type MapResult = {
  kind: "dungeon" | "rift";
  seed: number;
  w: number;
  h: number;
  tiles: Uint8Array;
  rooms: Room[];
  corridors: Spot[][];
  stairs: { up: Spot | null; down: Spot | null };
  /** Rift only: the exit tile and the tile you arrive on, next to it. */
  exit: Spot | null;
  arrive: Spot | null;
  /** Where the boss stands, in the boss room. The writer does not pick a boss. */
  bossSpot: Spot | null;
  /** The vault's chest tile. */
  vaultChest: Spot | null;
  foes: FoePlacement[];
  /** Tile indices (y * w + x) of every foe spot and the boss spot: pass as `spawns` to trap and captive placement. */
  spawns: number[];
  /** Per-tile index into biomeNames. One biome (or none) fills it with 0. */
  biome: Uint8Array;
  biomeNames: string[];
};

export type DungeonOptions = {
  seed: number | string;
  /** Floor number, mixed into the seed. Default 1. */
  floor?: number;
  codes: TileCodes;
  roster: FoeEntry[];
  level: number;
  width?: number;
  height?: number;
  /** How many rooms to aim for. Default [7, 10]. */
  rooms?: [number, number];
  roomW?: [number, number];
  roomH?: [number, number];
  /** Foes in each plain room. Default [1, 2]. Start, vault, and boss rooms get none. */
  foesPerRoom?: [number, number];
  /** Extra corridors beyond the spanning tree, for loops. Default 2. */
  loops?: number;
  /** Put a down stair in the boss room (behind the boss). Default false. */
  down?: boolean;
  biome?: BiomeField;
};

export type RiftOptions = {
  seed: number | string;
  codes: TileCodes;
  roster: FoeEntry[];
  level: number;
  width?: number;
  height?: number;
  /** Starting rock fill for the cave blob. Default 0.42. */
  fill?: number;
  /** Smallest kept cave, as a share of the interior; seeded re-rolls until it fits (up to 8). Default 0.4. */
  minOpen?: number;
  /** Smoothing passes. Default 4. */
  passes?: number;
  /** Foes in the pocket. Default [3, 5]. */
  foes?: [number, number];
  biome?: BiomeField;
};

// ---- Helpers ----

const DIRS: [number, number][] = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
];

function between(r: () => number, lo: number, hi: number) {
  return lo + Math.floor(r() * (hi - lo + 1));
}

function biomeLayer(w: number, h: number, field: BiomeField | undefined, seed: number) {
  const names = field?.names?.length ? [...field.names] : ["default"];
  if (names.length === 1) return { names, layer: new Uint8Array(w * h) };
  if (names.length > 255) throw new Error("map-writer: at most 255 biomes");
  const weights = field?.weights;
  if (!weights) throw new Error("map-writer: two or more biomes need weights(x, y), one per name");
  const base = new Uint8Array(w * h);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const wt = weights(x, y);
      let best = 0;
      for (let k = 1; k < names.length; k++) if ((wt[k] ?? 0) > (wt[best] ?? 0)) best = k;
      base[y * w + x] = best;
    }
  }
  const { biome } = blendBiomes({ seed: subSeed(seed, "biome"), w, h, base, names, reach: field?.reach, scale: field?.scale });
  return { names, layer: biome };
}

// ---- Biome blending (phase 2) ----

export type BlendOptions = {
  seed: number | string;
  w: number;
  h: number;
  /** The hard biome map: per tile (y * w + x), an index into names. */
  base: ArrayLike<number>;
  names: string[];
  /** Tiles that may take a neighbouring biome. Others keep their base biome and get no fringe. Default: every tile. */
  blend?: (i: number) => boolean;
  /** How far, in tiles, a border may wander either way. Default 2. 0 gives the base map back. */
  reach?: number;
  /** Size, in tiles, of the big wobble along a border. Default 6. A second wobble a third the size, at the same weight, breaks up long runs. */
  scale?: number;
  /**
   * Which biome spills over which, for the fringe: per name, a rank. A side is marked only when the neighbour ranks
   * higher, so each border gets one fringe (the higher biome's ground over the lower), not two facing ones.
   * Default: every differing side is marked, both ways.
   */
  rank?: ArrayLike<number>;
};

/** Edge bits: which side of a tile touches a different biome. Corner bits: a diagonal differs while both sides beside it match. */
export const EDGE = { n: 1, e: 2, s: 4, w: 8 } as const;
export const CORNER = { ne: 1, se: 2, sw: 4, nw: 8 } as const;

export type BlendResult = {
  w: number;
  h: number;
  names: string[];
  /** Per tile: the biome it looks like. Differs from base only on blendable tiles within reach of a border. */
  biome: Uint8Array;
  /** Per tile: EDGE bits where a blendable side neighbour looks like another biome (that ranks higher, if rank is given). */
  edges: Uint8Array;
  /** Per tile: CORNER bits, for the diagonal case the edges miss. */
  corners: Uint8Array;
  /** Tiles whose biome moved off the base map. */
  moved: number;
};

/** A lattice value in [-1, 1] for one noise channel. */
function lattice(seed: number, ch: number, ix: number, iy: number) {
  let h = (seed ^ Math.imul(ch + 1, 0x27d4eb2d)) >>> 0;
  h = Math.imul(h ^ Math.imul(ix | 0, 0x85ebca6b), 0xc2b2ae35) >>> 0;
  h = Math.imul(h ^ Math.imul(iy | 0, 0x165667b1), 0x9e3779b1) >>> 0;
  h ^= h >>> 15;
  h = Math.imul(h, 0x2c1b3c6d) >>> 0;
  h ^= h >>> 12;
  return ((h >>> 0) / 4294967295) * 2 - 1;
}

/** Smooth value noise in [-1, 1]: lattice points `cell` tiles apart, eased between. */
function valueNoise(seed: number, ch: number, x: number, y: number, cell: number) {
  const fx = x / cell;
  const fy = y / cell;
  const ix = Math.floor(fx);
  const iy = Math.floor(fy);
  const ease = (t: number) => t * t * (3 - 2 * t);
  const tx = ease(fx - ix);
  const ty = ease(fy - iy);
  const a = lattice(seed, ch, ix, iy);
  const b = lattice(seed, ch, ix + 1, iy);
  const c = lattice(seed, ch, ix, iy + 1);
  const d = lattice(seed, ch, ix + 1, iy + 1);
  return (a + (b - a) * tx) * (1 - ty) + (c + (d - c) * tx) * ty;
}

/**
 * Rough up the borders of a hard biome map. Each blendable tile looks up the base map at a seeded,
 * smoothly warped spot no more than `reach` tiles away (both axes), so a border wanders up to
 * `reach` either way and never moves anything further than that. Seeded only: same options, same bytes.
 */
export function blendBiomes(o: BlendOptions): BlendResult {
  const { w, h, base, names } = o;
  if (base.length !== w * h) throw new Error("map-writer: base must be w * h");
  const reach = Math.max(0, Math.floor(o.reach ?? 2));
  const scale = Math.max(1, o.scale ?? 6);
  const blend = o.blend ?? (() => true);
  const seed = subSeed(o.seed, "blend");
  const biome = new Uint8Array(w * h);
  let moved = 0;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = y * w + x;
      const own = base[i];
      if (own < 0 || own >= names.length) throw new Error(`map-writer: base biome ${own} at ${x},${y} is not in names`);
      biome[i] = own;
      if (!reach || !blend(i)) continue;
      const warp = (ch: number) => {
        const n = (valueNoise(seed, ch, x, y, scale) + valueNoise(seed, ch + 2, x, y, scale / 3)) * 0.45;
        return Math.max(-reach, Math.min(reach, Math.round(n * (reach + 0.49))));
      };
      const sx = Math.max(0, Math.min(w - 1, x + warp(0)));
      const sy = Math.max(0, Math.min(h - 1, y + warp(1)));
      const look = base[sy * w + sx];
      if (look !== own) {
        biome[i] = look;
        moved++;
      }
    }
  }
  const edges = new Uint8Array(w * h);
  const corners = new Uint8Array(w * h);
  const at = (x: number, y: number) => (x < 0 || y < 0 || x >= w || y >= h ? -1 : y * w + x);
  const rank = o.rank;
  const differs = (i: number, j: number) => j >= 0 && blend(j) && biome[j] !== biome[i] && (!rank || (rank[biome[j]] ?? 0) > (rank[biome[i]] ?? 0));
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = y * w + x;
      if (!blend(i)) continue;
      let e = 0;
      if (differs(i, at(x, y - 1))) e |= EDGE.n;
      if (differs(i, at(x + 1, y))) e |= EDGE.e;
      if (differs(i, at(x, y + 1))) e |= EDGE.s;
      if (differs(i, at(x - 1, y))) e |= EDGE.w;
      edges[i] = e;
      let c = 0;
      if (!(e & (EDGE.n | EDGE.e)) && differs(i, at(x + 1, y - 1))) c |= CORNER.ne;
      if (!(e & (EDGE.s | EDGE.e)) && differs(i, at(x + 1, y + 1))) c |= CORNER.se;
      if (!(e & (EDGE.s | EDGE.w)) && differs(i, at(x - 1, y + 1))) c |= CORNER.sw;
      if (!(e & (EDGE.n | EDGE.w)) && differs(i, at(x - 1, y - 1))) c |= CORNER.nw;
      corners[i] = c;
    }
  }
  return { w, h, names: [...names], biome, edges, corners, moved };
}

/** Steps from (sx, sy) over tiles `walk` accepts. -1 where it cannot reach. */
export function stepsFrom(tiles: ArrayLike<number>, w: number, h: number, sx: number, sy: number, walk: (t: number) => boolean): Int32Array {
  const d = new Int32Array(w * h).fill(-1);
  const q = [sy * w + sx];
  d[q[0]] = 0;
  for (let k = 0; k < q.length; k++) {
    const i = q[k];
    const x = i % w;
    const y = (i / w) | 0;
    for (const [dx, dy] of DIRS) {
      const nx = x + dx;
      const ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
      const j = ny * w + nx;
      if (d[j] >= 0 || !walk(tiles[j])) continue;
      d[j] = d[i] + 1;
      q.push(j);
    }
  }
  return d;
}

function pickFoe(r: () => number, roster: FoeEntry[]): string {
  const total = roster.reduce((s, f) => s + (f.weight ?? 1), 0);
  let roll = r() * total;
  for (const f of roster) {
    roll -= f.weight ?? 1;
    if (roll < 0) return f.id;
  }
  return roster[roster.length - 1].id;
}

function inside(room: Rect, x: number, y: number) {
  return x >= room.x && y >= room.y && x < room.x + room.w && y < room.y + room.h;
}

// ---- Dungeon ----

/** One dungeon floor: rooms, corridors, an up stair in the start room, a boss room, a vault room. */
export function writeDungeon(o: DungeonOptions): MapResult {
  const w = o.width ?? 48;
  const h = o.height ?? 32;
  const floor = o.floor ?? 1;
  const seed = subSeed(o.seed, "dungeon", floor);
  const c = o.codes;
  if (!o.roster.length) throw new Error("map-writer: empty roster");
  const { names, layer } = biomeLayer(w, h, o.biome, seed);
  const tiles = new Uint8Array(w * h).fill(c.wall);
  const r = rng32(subSeed(seed, "rooms"));
  const [rMin, rMax] = o.rooms ?? [7, 10];
  const [wMin, wMax] = o.roomW ?? [4, 8];
  const [hMin, hMax] = o.roomH ?? [3, 6];
  const want = between(r, rMin, rMax);
  const rects: Rect[] = [];
  // Rooms keep a 2-tile margin from the edge and 2 tiles of rock between each other,
  // so secret rooms (which need solid rock and a ring) still find space.
  for (let tries = 0; tries < 600 && rects.length < want; tries++) {
    const rw = between(r, wMin, wMax);
    const rh = between(r, hMin, hMax);
    const rx = between(r, 2, w - rw - 3);
    const ry = between(r, 2, h - rh - 3);
    const box = { x: rx, y: ry, w: rw, h: rh };
    if (rects.some((o2) => rx < o2.x + o2.w + 2 && o2.x < rx + rw + 2 && ry < o2.y + o2.h + 2 && o2.y < ry + rh + 2)) continue;
    rects.push(box);
  }
  if (rects.length < 3) throw new Error("map-writer: map too small for three rooms");
  for (const b of rects) for (let y = b.y; y < b.y + b.h; y++) for (let x = b.x; x < b.x + b.w; x++) tiles[y * w + x] = c.floor;
  const centers = rects.map((b) => ({ x: b.x + (b.w >> 1), y: b.y + (b.h >> 1) }));
  // Spanning tree (Prim, by Manhattan distance between centers), then a few seeded loops.
  const dist = (a: number, b: number) => Math.abs(centers[a].x - centers[b].x) + Math.abs(centers[a].y - centers[b].y);
  const linked = new Set<number>([0]);
  const edges: [number, number][] = [];
  while (linked.size < rects.length) {
    let best: [number, number] | null = null;
    for (const a of linked) for (let b = 0; b < rects.length; b++) if (!linked.has(b) && (!best || dist(a, b) < dist(best[0], best[1]))) best = [a, b];
    edges.push(best!);
    linked.add(best![1]);
  }
  const lr = rng32(subSeed(seed, "loops"));
  const loops = o.loops ?? 2;
  for (let k = 0, guard = 0; k < loops && guard < 50; guard++) {
    const a = Math.floor(lr() * rects.length);
    const b = Math.floor(lr() * rects.length);
    if (a === b || edges.some(([p, q]) => (p === a && q === b) || (p === b && q === a))) continue;
    edges.push([a, b]);
    k++;
  }
  const degree = new Array(rects.length).fill(0);
  for (const [a, b] of edges) {
    degree[a]++;
    degree[b]++;
  }
  const corridors: Spot[][] = [];
  const cr = rng32(subSeed(seed, "corridors"));
  for (const [a, b] of edges) {
    const path: Spot[] = [];
    let { x, y } = centers[a];
    const t = centers[b];
    const horizFirst = cr() < 0.5;
    const stepX = () => {
      while (x !== t.x) {
        x += Math.sign(t.x - x);
        path.push({ x, y });
      }
    };
    const stepY = () => {
      while (y !== t.y) {
        y += Math.sign(t.y - y);
        path.push({ x, y });
      }
    };
    if (horizFirst) {
      stepX();
      stepY();
    } else {
      stepY();
      stepX();
    }
    const dug = path.filter((p) => !rects.some((b2) => inside(b2, p.x, p.y)));
    for (const p of dug) tiles[p.y * w + p.x] = c.floor;
    corridors.push(dug);
  }
  // Tags. Start: a seeded pick among the dead-end rooms (or any room). Boss: the room farthest
  // from the up stair by walking steps. Vault: the farthest of the rest, preferring dead ends.
  const tr = rng32(subSeed(seed, "tags"));
  const leaves = rects.map((_, i) => i).filter((i) => degree[i] === 1);
  const startPool = leaves.length ? leaves : rects.map((_, i) => i);
  const start = startPool[Math.floor(tr() * startPool.length)];
  const up = { ...centers[start] };
  tiles[up.y * w + up.x] = c.stairUp;
  const walk = (t: number) => t === c.floor || t === c.stairUp || t === c.stairDown;
  const d = stepsFrom(tiles, w, h, up.x, up.y, walk);
  const depth = centers.map((p) => d[p.y * w + p.x]);
  const order = rects.map((_, i) => i).filter((i) => i !== start).sort((a, b) => depth[b] - depth[a] || a - b);
  const boss = order[0];
  const rest = order.slice(1);
  const restLeaves = rest.filter((i) => degree[i] === 1);
  const vault = (restLeaves.length ? restLeaves : rest)[0];
  const rooms: Room[] = rects.map((b, i) => ({
    ...b,
    id: i,
    tag: i === start ? "start" : i === boss ? "boss" : i === vault ? "vault" : "room",
    center: centers[i],
    depth: depth[i],
  }));
  // Vault chest: the corner tile farthest from the vault's center that is not a corridor mouth.
  const vb = rects[vault];
  const corners = [
    { x: vb.x, y: vb.y },
    { x: vb.x + vb.w - 1, y: vb.y },
    { x: vb.x, y: vb.y + vb.h - 1 },
    { x: vb.x + vb.w - 1, y: vb.y + vb.h - 1 },
  ];
  const mouth = (p: Spot) => DIRS.some(([dx, dy]) => {
    const nx = p.x + dx;
    const ny = p.y + dy;
    return !inside(vb, nx, ny) && tiles[ny * w + nx] !== c.wall;
  });
  const vaultChest = corners.find((p) => !mouth(p)) ?? corners[0];
  tiles[vaultChest.y * w + vaultChest.x] = c.chest;
  const bb = rects[boss];
  const bossSpot = { ...centers[boss] };
  let down: Spot | null = null;
  if (o.down) {
    down = { x: bb.x + bb.w - 1, y: bb.y };
    if (down.x === bossSpot.x && down.y === bossSpot.y) down = { x: bb.x, y: bb.y };
    tiles[down.y * w + down.x] = c.stairDown;
  }
  // Foes in plain rooms only, on floor tiles, never on the stair, a corridor mouth, or each other.
  const fr = rng32(subSeed(seed, "foes"));
  const [fMin, fMax] = o.foesPerRoom ?? [1, 2];
  const foes: FoePlacement[] = [];
  for (const room of rooms) {
    if (room.tag !== "room") continue;
    const n = between(fr, fMin, fMax);
    const cells: Spot[] = [];
    for (let y = room.y; y < room.y + room.h; y++) for (let x = room.x; x < room.x + room.w; x++) if (tiles[y * w + x] === c.floor) cells.push({ x, y });
    for (let k = 0; k < n && cells.length; k++) {
      const at = cells.splice(Math.floor(fr() * cells.length), 1)[0];
      foes.push({ ...at, id: pickFoe(fr, o.roster), level: o.level, room: room.id });
    }
  }
  return {
    kind: "dungeon",
    seed,
    w,
    h,
    tiles,
    rooms,
    corridors,
    stairs: { up, down },
    exit: null,
    arrive: null,
    bossSpot,
    vaultChest,
    foes,
    spawns: [...foes.map((f) => f.y * w + f.x), bossSpot.y * w + bossSpot.x],
    biome: layer,
    biomeNames: names,
  };
}

/** Cellular-automaton cave: seeded rock fill, smoothing passes, keep the largest open region. */
function caveBlob(w: number, h: number, r: () => number, fill: number, passes: number, c: TileCodes) {
  const edge = (x: number, y: number) => x < 2 || y < 2 || x >= w - 2 || y >= h - 2;
  let rock = new Uint8Array(w * h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) rock[y * w + x] = edge(x, y) || r() < fill ? 1 : 0;
  for (let p = 0; p < passes; p++) {
    const next = new Uint8Array(w * h);
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        if (edge(x, y)) {
          next[y * w + x] = 1;
          continue;
        }
        let n = 0;
        for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) n += rock[(y + dy) * w + x + dx];
        next[y * w + x] = n >= 5 ? 1 : 0;
      }
    }
    rock = next;
  }
  const tiles = new Uint8Array(w * h);
  for (let i = 0; i < tiles.length; i++) tiles[i] = rock[i] ? c.wall : c.floor;
  const region = new Int32Array(w * h).fill(-1);
  let best = -1;
  let size = 0;
  let id = 0;
  for (let i = 0; i < tiles.length; i++) {
    if (tiles[i] !== c.floor || region[i] >= 0) continue;
    const d = stepsFrom(tiles, w, h, i % w, (i / w) | 0, (t) => t === c.floor);
    let n = 0;
    for (let j = 0; j < d.length; j++) {
      if (d[j] < 0) continue;
      region[j] = id;
      n++;
    }
    if (n > size) {
      size = n;
      best = id;
    }
    id++;
  }
  for (let i = 0; i < tiles.length; i++) if (tiles[i] === c.floor && region[i] !== best) tiles[i] = c.wall;
  return { tiles, size };
}

// ---- Rift pocket ----

/** A rift pocket: one connected cave blob, an exit tile back, foes spread across it. No boss. */
export function writeRift(o: RiftOptions): MapResult {
  const w = o.width ?? 32;
  const h = o.height ?? 22;
  const seed = subSeed(o.seed, "rift");
  const c = o.codes;
  if (!o.roster.length) throw new Error("map-writer: empty roster");
  const { names, layer } = biomeLayer(w, h, o.biome, seed);
  const fill = o.fill ?? 0.42;
  const minOpen = o.minOpen ?? 0.4;
  const interior = (w - 4) * (h - 4);
  let tiles = new Uint8Array(w * h);
  let bestSize = 0;
  // Seeded re-rolls (attempt 0, 1, ...) until the kept cave is big enough. Still one map per seed.
  for (let attempt = 0; attempt < 8; attempt++) {
    const cave = caveBlob(w, h, rng32(subSeed(seed, "fill", attempt)), fill, o.passes ?? 4, c);
    tiles = cave.tiles;
    bestSize = cave.size;
    if (bestSize >= interior * minOpen) break;
  }
  if (bestSize < 12) throw new Error("map-writer: rift came out too small; lower fill");
  // Exit: the open tile nearest the middle, with open floor below it to arrive on.
  const mid = { x: w >> 1, y: h >> 1 };
  let exit: Spot | null = null;
  let arrive: Spot | null = null;
  let bestD = Infinity;
  for (let y = 1; y < h - 2; y++) {
    for (let x = 1; x < w - 1; x++) {
      if (tiles[y * w + x] !== c.floor || tiles[(y + 1) * w + x] !== c.floor) continue;
      const dd = Math.abs(x - mid.x) + Math.abs(y - mid.y);
      if (dd < bestD) {
        bestD = dd;
        exit = { x, y };
        arrive = { x, y: y + 1 };
      }
    }
  }
  if (!exit || !arrive) throw new Error("map-writer: rift has no exit spot");
  tiles[exit.y * w + exit.x] = c.exit;
  // Foes: spread out, farthest-first from the arrival tile, at least 4 steps from it.
  const walk = (t: number) => t === c.floor || t === c.exit;
  const d = stepsFrom(tiles, w, h, arrive.x, arrive.y, walk);
  const fr = rng32(subSeed(seed, "foes"));
  const [fMin, fMax] = o.foes ?? [3, 5];
  const n = between(fr, fMin, fMax);
  const open: number[] = [];
  for (let i = 0; i < tiles.length; i++) if (tiles[i] === c.floor && d[i] >= 4) open.push(i);
  const chosen: number[] = [];
  for (let k = 0; k < n && open.length; k++) {
    // First pick seeded; then each next is the open tile farthest (Manhattan) from all chosen.
    let pick = -1;
    if (!chosen.length) pick = open[Math.floor(fr() * open.length)];
    else {
      let far = -1;
      for (const i of open) {
        const m = Math.min(...chosen.map((j) => Math.abs((i % w) - (j % w)) + Math.abs(((i / w) | 0) - ((j / w) | 0))));
        if (m > far) {
          far = m;
          pick = i;
        }
      }
    }
    chosen.push(pick);
    open.splice(open.indexOf(pick), 1);
  }
  const foes = chosen.map((i) => ({ x: i % w, y: (i / w) | 0, id: pickFoe(fr, o.roster), level: o.level, room: 0 }));
  let minX = w;
  let minY = h;
  let maxX = 0;
  let maxY = 0;
  for (let i = 0; i < tiles.length; i++) if (tiles[i] !== c.wall) {
    minX = Math.min(minX, i % w);
    maxX = Math.max(maxX, i % w);
    minY = Math.min(minY, (i / w) | 0);
    maxY = Math.max(maxY, (i / w) | 0);
  }
  const room: Room = { id: 0, tag: "start", x: minX, y: minY, w: maxX - minX + 1, h: maxY - minY + 1, center: exit, depth: 0 };
  return {
    kind: "rift",
    seed,
    w,
    h,
    tiles,
    rooms: [room],
    corridors: [],
    stairs: { up: null, down: null },
    exit,
    arrive,
    bossSpot: null,
    vaultChest: null,
    foes,
    spawns: chosen,
    biome: layer,
    biomeNames: names,
  };
}

/** A plain JSON view (tiles as a number array) for renderers and saves. */
export function toJSON(m: MapResult) {
  return { ...m, tiles: Array.from(m.tiles), biome: Array.from(m.biome) };
}
