/**
 * Dungeon secrets: rune doors and secret walls.
 *
 * Both are carved into a floor after carveFloor has laid its rooms, from a seed made of the
 * dungeon id and the floor number. No Math.random, so a floor always has the same secrets.
 * Rooms only go into solid rock: every tile of the room and its one-tile ring must be wall,
 * and the door or the cracked brick sits in the ring with open floor on its far side.
 */
import { T, TRAPS, mulberry } from "./content";

export const GLYPH_NAMES = ["moon", "eye", "cross"] as const;

export type Spot = { x: number; y: number };
export type Rect = { x: number; y: number; w: number; h: number };
/** A brazier or a saint in the wall. stand is the floor tile the hero uses it from. */
export type Mark = Spot & { glyph: number; stand: Spot };
export type RuneFeat = {
  kind: "brazier" | "statue";
  door: Spot;
  approach: Spot;
  room: Rect;
  chest: Spot;
  marks: Mark[];
  /** Brazier: light the glyphs in this order. Statue: smite the saint with order[0]. */
  order: number[];
};
export type CrackFeat = { wall: Spot; approach: Spot; room: Rect; chest: Spot };
/** A floor trap. phase (0..1) staggers spike cycles so a row of spikes does not move as one. */
export type Trap = Spot & { kind: "spike" | "plate"; phase: number };
/** hidden lists every room tile, opened or not, so fog and foe spawns can leave them alone. */
export type FloorFeats = { rune?: RuneFeat; crack?: CrackFeat; hidden: number[]; traps?: Trap[]; captive?: Spot; mimic?: Spot };

/** FNV-1a over the dungeon id and floor. */
export function featSeed(dungeon: string, floor: number, salt = "rune"): number {
  let h = 2166136261;
  const s = `${dungeon}:${floor}:${salt}`;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h >>> 0;
}

/** Rune vaults: floors 2, 5, 8 of a full dungeon, never the boss floor or a pocket cave. */
export function runeFloor(floor: number, floors: number, pocket: boolean) {
  return !pocket && floor < floors && floor % 3 === 2;
}

/** Secret walls: odd floors short of the boss, and the first floor of a pocket cave. */
export function crackFloor(floor: number, floors: number, pocket: boolean) {
  return pocket ? floor === 1 : floor < floors && floor % 2 === 1;
}

/** Tiles the secrets add. All solid; the hero, foes, and companions treat them as wall. */
export function secretTile(t: number) {
  return t === T.runeDoor || t === T.crack || t === T.brazier || t === T.statue;
}

/** Same rule the hero uses: walls, furniture, and the secrets stop you. Pools do not. */
function heroWalks(t: number) {
  return t !== T.wall && t !== T.shelf && t !== T.cauldron && t !== T.moon && !secretTile(t);
}

const open = (t: number) => t === T.floor || t === T.road;

/** Steps from a start tile over everything the hero can walk. -1 is out of reach. */
export function walkSteps(tiles: ArrayLike<number>, w: number, h: number, sx: number, sy: number) {
  const dist = new Int16Array(w * h).fill(-1);
  const q = [sy * w + sx];
  dist[q[0]] = 0;
  for (let k = 0; k < q.length; k++) {
    const i = q[k];
    const x = i % w;
    const y = Math.floor(i / w);
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx;
      const ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
      const j = ny * w + nx;
      if (dist[j] >= 0 || !heroWalks(tiles[j])) continue;
      dist[j] = dist[i] + 1;
      q.push(j);
    }
  }
  return dist;
}

const STAIRS = (t: number) => t === T.stairU || t === T.stairD;

/**
 * Every place a room of depth x width fits behind one wall tile. The room runs away from the
 * open tile; its whole ring must be rock so no existing floor, stair, or chest is touched.
 */
function roomSpots(tiles: Uint8Array, w: number, h: number, reach: Int16Array, depth: number, width: number, keep = new Set<number>()) {
  const out: { door: Spot; approach: Spot; room: Rect }[] = [];
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      if (tiles[y * w + x] !== T.wall) continue;
      for (const [dx, dy] of [[0, 1], [0, -1], [1, 0], [-1, 0]]) {
        const ax = x + dx;
        const ay = y + dy;
        if (ax < 1 || ay < 1 || ax >= w - 1 || ay >= h - 1) continue;
        const ai = ay * w + ax;
        if (!open(tiles[ai]) || reach[ai] < 0) continue;
        let nearStair = false;
        for (const [ex, ey] of [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1]]) if (STAIRS(tiles[(ay + ey) * w + ax + ex])) nearStair = true;
        if (nearStair) continue;
        const half = Math.floor((width - 1) / 2);
        let room: Rect;
        if (dy !== 0) room = { x: x - half, y: dy > 0 ? y - depth : y + 1, w: width, h: depth };
        else room = { x: dx > 0 ? x - depth : x + 1, y: y - half, w: depth, h: width };
        if (room.x < 1 || room.y < 1 || room.x + room.w > w - 1 || room.y + room.h > h - 1) continue;
        let rock = true;
        for (let yy = room.y - 1; yy <= room.y + room.h && rock; yy++) {
          for (let xx = room.x - 1; xx <= room.x + room.w; xx++) {
            if (tiles[yy * w + xx] !== T.wall || keep.has(yy * w + xx)) {
              rock = false;
              break;
            }
          }
        }
        if (rock) out.push({ door: { x, y }, approach: { x: ax, y: ay }, room });
      }
    }
  }
  return out;
}

/** The room tile farthest from the door, middle column. */
function farTile(room: Rect, door: Spot): Spot {
  if (door.y > room.y + room.h - 1) return { x: room.x + Math.floor(room.w / 2), y: room.y };
  if (door.y < room.y) return { x: room.x + Math.floor(room.w / 2), y: room.y + room.h - 1 };
  if (door.x > room.x + room.w - 1) return { x: room.x, y: room.y + Math.floor(room.h / 2) };
  return { x: room.x + room.w - 1, y: room.y + Math.floor(room.h / 2) };
}

function carveRoom(tiles: Uint8Array, w: number, room: Rect, hidden: number[]) {
  for (let y = room.y; y < room.y + room.h; y++) {
    for (let x = room.x; x < room.x + room.w; x++) {
      tiles[y * w + x] = T.floor;
      hidden.push(y * w + x);
    }
  }
}

/** Three braziers or saints: rock with walkable floor right below, near the door, apart from each other. */
function marksFor(tiles: Uint8Array, w: number, h: number, pick: { door: Spot; approach: Spot; room: Rect }, rng: () => number): Spot[] {
  const near = walkSteps(tiles, w, h, pick.approach.x, pick.approach.y);
  const r = pick.room;
  const ring = (x: number, y: number) => x >= r.x - 1 && x <= r.x + r.w && y >= r.y - 1 && y <= r.y + r.h;
  const cands: { x: number; y: number; d: number }[] = [];
  for (let y = 1; y < h - 2; y++) {
    for (let x = 1; x < w - 1; x++) {
      if (tiles[y * w + x] !== T.wall || ring(x, y)) continue;
      const below = (y + 1) * w + x;
      if (!open(tiles[below]) || near[below] < 0 || near[below] > 14) continue;
      if (Math.abs(x - pick.door.x) + Math.abs(y - pick.door.y) <= 2) continue;
      cands.push({ x, y, d: near[below] });
    }
  }
  cands.sort((a, b) => a.d - b.d || a.y - b.y || a.x - b.x);
  const pool = cands.slice(0, 10);
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  const chosen: Spot[] = [];
  for (const c of [...pool, ...cands.slice(10)]) {
    if (chosen.length === 3) break;
    if (chosen.some((o) => Math.abs(o.x - c.x) + Math.abs(o.y - c.y) < 3)) continue;
    chosen.push({ x: c.x, y: c.y });
  }
  return chosen;
}

/** Carve this floor's secrets into tiles in place. Returns where they went. */
export function placeFeats(tiles: Uint8Array, w: number, h: number, dungeon: string, floor: number, floors: number, pocket: boolean): FloorFeats {
  const feats: FloorFeats = { hidden: [] };
  const up = (() => {
    for (let i = 0; i < tiles.length; i++) if (tiles[i] === T.stairU) return { x: i % w, y: Math.floor(i / w) };
    return null;
  })();
  if (!up) return feats;
  if (runeFloor(floor, floors, pocket)) {
    const rng = mulberry(featSeed(dungeon, floor, "rune"));
    const kind = rng() < 0.5 ? "brazier" : "statue";
    const order = [0, 1, 2];
    for (let i = 2; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [order[i], order[j]] = [order[j], order[i]];
    }
    const reach = walkSteps(tiles, w, h, up.x, up.y);
    const spots = roomSpots(tiles, w, h, reach, 3, 3);
    // Start at a seeded spot and walk the list until one has three marks within reach.
    const start = Math.floor(rng() * Math.max(1, spots.length));
    const shuffle = rng();
    for (let k = 0; k < spots.length && !feats.rune; k++) {
      const pick = spots[(start + k) % spots.length];
      const chosen = marksFor(tiles, w, h, pick, mulberry(Math.floor(shuffle * 4294967296) + k));
      if (chosen.length < 3) continue;
      carveRoom(tiles, w, pick.room, feats.hidden);
      const chest = farTile(pick.room, pick.door);
      tiles[chest.y * w + chest.x] = T.chest;
      tiles[pick.door.y * w + pick.door.x] = T.runeDoor;
      const marks = chosen.map((c, glyph) => ({ ...c, glyph, stand: { x: c.x, y: c.y + 1 } }));
      for (const m of marks) tiles[m.y * w + m.x] = kind === "brazier" ? T.brazier : T.statue;
      feats.rune = { kind, door: pick.door, approach: pick.approach, room: pick.room, chest, marks, order };
    }
  }
  if (crackFloor(floor, floors, pocket)) {
    const rng = mulberry(featSeed(dungeon, floor, "crack"));
    const reach = walkSteps(tiles, w, h, up.x, up.y);
    // Keep clear of the vault's ring, so the two rooms never share a broken wall.
    const keep = new Set<number>();
    const v = feats.rune?.room;
    if (v) for (let y = v.y - 1; y <= v.y + v.h; y++) for (let x = v.x - 1; x <= v.x + v.w; x++) keep.add(y * w + x);
    const spots = roomSpots(tiles, w, h, reach, 2, 2, keep);
    if (spots.length) {
      const pick = spots[Math.floor(rng() * spots.length)];
      carveRoom(tiles, w, pick.room, feats.hidden);
      const chest = farTile(pick.room, pick.door);
      tiles[chest.y * w + chest.x] = T.chest;
      tiles[pick.door.y * w + pick.door.x] = T.crack;
      feats.crack = { wall: pick.door, approach: pick.approach, room: pick.room, chest };
    }
  }
  return feats;
}

// ---- Floor traps ----

/** Every floor but a boss floor. Pocket caves have no boss, so both their floors qualify. */
export function trapFloor(floor: number, floors: number, pocket: boolean) {
  return pocket || floor < floors;
}

/** 0 down, 1 tips showing (the tell, or the retract), 2 up. Only 2 hurts. */
export function spikeStage(trap: Trap, seconds: number): 0 | 1 | 2 {
  const c = TRAPS.spikeCycle;
  const t = (((seconds + trap.phase * c) % c) + c) % c;
  if (t < TRAPS.spikeDown) return 0;
  if (t < TRAPS.spikeDown + TRAPS.spikeTell) return 1;
  if (t < TRAPS.spikeDown + TRAPS.spikeTell + TRAPS.spikeUp) return 2;
  return 1;
}

/** Walkable tiles reachable from a start, with some tiles treated as blocked. */
function reachCount(tiles: ArrayLike<number>, w: number, h: number, sx: number, sy: number, blocked: Set<number>) {
  const seen = new Uint8Array(w * h);
  const q = [sy * w + sx];
  seen[q[0]] = 1;
  for (let k = 0; k < q.length; k++) {
    const i = q[k];
    const x = i % w;
    const y = Math.floor(i / w);
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx;
      const ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
      const j = ny * w + nx;
      if (seen[j] || blocked.has(j) || !heroWalks(tiles[j])) continue;
      seen[j] = 1;
      q.push(j);
    }
  }
  return q.length;
}

/**
 * Seeded spikes and plates on open floor. Never on or beside a stair, never on a spawn, a chest,
 * a secret, the tile you use a secret from, or inside a secret room. Never in a corridor, and
 * every trap must leave the floor whole: with all traps treated as walls, everything you could
 * reach before is still reachable, so there is always a trap-free way round.
 */
export function placeTraps(tiles: Uint8Array, w: number, h: number, dungeon: string, floor: number, floors: number, pocket: boolean, feats: FloorFeats, spawns: number[]): Trap[] {
  if (!trapFloor(floor, floors, pocket)) return [];
  const up = tiles.indexOf(T.stairU);
  if (up < 0) return [];
  const rng = mulberry(featSeed(dungeon, floor, "trap"));
  const off = new Set<number>([...spawns, ...feats.hidden]);
  const near = (p: Spot) => {
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) off.add((p.y + dy) * w + p.x + dx);
  };
  for (let i = 0; i < tiles.length; i++) {
    const t = tiles[i];
    if (t === T.stairU || t === T.stairD || secretTile(t)) near({ x: i % w, y: Math.floor(i / w) });
  }
  const r = feats.rune;
  if (r) for (const m of [r.approach, ...r.marks.map((m) => m.stand)]) off.add(m.y * w + m.x);
  if (feats.crack) off.add(feats.crack.approach.y * w + feats.crack.approach.x);
  const ux = up % w;
  const uy = Math.floor(up / w);
  const base = reachCount(tiles, w, h, ux, uy, new Set());
  const cands: number[] = [];
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const i = y * w + x;
      if (tiles[i] !== T.floor || off.has(i)) continue;
      let open = 0;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) if (heroWalks(tiles[(y + dy) * w + x + dx])) open += 1;
      if (open >= 3) cands.push(i);
    }
  }
  for (let i = cands.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [cands[i], cands[j]] = [cands[j], cands[i]];
  }
  const want: Trap["kind"][] = pocket ? ["spike", "plate"] : ["spike", "spike", "plate", "plate"];
  const out: Trap[] = [];
  const blocked = new Set<number>();
  for (const i of cands) {
    if (out.length === want.length) break;
    const x = i % w;
    const y = Math.floor(i / w);
    if (out.some((o) => Math.abs(o.x - x) + Math.abs(o.y - y) < 3)) continue;
    blocked.add(i);
    if (reachCount(tiles, w, h, ux, uy, blocked) !== base - blocked.size) {
      blocked.delete(i);
      continue;
    }
    out.push({ x, y, kind: want[out.length], phase: Math.floor(rng() * 8) / 8 });
  }
  return out;
}
