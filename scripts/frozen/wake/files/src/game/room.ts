/**
 * playtest1n [OWNER-APPROVED 2026-10-03 15:41 ET: use-the-room combat]: the room as a weapon. Bill (2026-10-03 15:41 ET):
 * "Players can knock foes into spike traps and hazards; the existing knockback can be used, plus a short shove on the
 * attack. Hanging lanterns or braziers in dungeons can be hit to drop and start a short fire patch that burns foes and
 * ties into the 1k oiled/WILDFIRE statuses. Explosive or oil barrels can be hit or set alight. Some pillars break to give
 * a stun or splash. Foes should take hazards into account a little, without being too clever. Keep it fair to the
 * player, telegraph the hazards with the 1j marks and glow ... keep saves safe, and stay inside the fps budget."
 *
 * This module holds the numbers, the seeded placement and pure queries; sim.ts runs the effects (it owns hurtFoe, the
 * elements and the hero), and roomdraw.ts paints the props, the patches and their marks from the same state.
 * Nothing here is saved: a floor's props are placed from its seed every time it loads, so old saves load as they were.
 * No dice: placement hashes the dungeon and floor, and nothing here draws Math.random.
 */
import { T } from "./content";
import { featSeed, secretTile, spikeStage, type Trap } from "./feats";

export const ROOM_TAG = "[OWNER-APPROVED 2026-10-03 15:41 ET: use-the-room combat]";

export type PropKind = "lantern" | "oil" | "powder" | "pillar";
/** One prop on a floor tile. hp counts hits left; done once it has dropped, burst or broken; fuse > 0 while a powder
 * barrel's fuse burns (its blast mark fills over ROOM.fuse). */
export type RoomProp = { kind: PropKind; x: number; y: number; hp: number; done: boolean; fuse: number };
/** A fire or oil patch on the ground (px). A fire patch burns every ROOM.fireTick while life runs. */
export type Patch = { kind: "fire" | "oil"; x: number; y: number; r: number; life: number; max: number; tick: number };
/** A pillar toppling: a lane from (x, y) along (dx, dy) that lands when tell runs out; k is the prop it was. */
export type Fall = { x: number; y: number; dx: number; dy: number; tell: number; max: number; k: number };
/** A lantern falling off its hook: it lands at (x, y) when tell runs out, and its fire patch starts there. */
export type Drop = { x: number; y: number; tell: number; max: number };
export type RoomState = { props: RoomProp[]; patches: Patch[]; falls: Fall[]; drops: Drop[]; solid: Set<number> };

export const ROOM = {
  /** The shove on a slash or whirl, on top of every hit's old 3 px knockback: ROOM.shove px/s for ROOM.shoveFor s (about
   * 13 px, near a tile, enough to put a foe beside you onto the trap behind it). Minis and rares take shoveMini of it;
   * a boss none (it is not thrown about). */
  shove: 110,
  shoveFor: 0.12,
  shoveMini: 0.5,
  /** A foe shoved onto a spike trap springs it at once and reels this long. */
  spikeStun: 0.4,
  /** Hits each prop takes. */
  hp: { lantern: 1, oil: 1, powder: 1, pillar: 3 } as Record<PropKind, number>,
  /** A dropped lantern's fire patch, and the bigger one oil makes when it catches. */
  fireR: 20,
  fireBigR: 28,
  fireLife: 4,
  fireTick: 0.5,
  /** A struck lantern swings off its hook away from the blow and lands dropOut px past its post after dropTell s (its
   * red mark fills over that time), so the fire never starts under the hero who hit it. */
  dropTell: 0.35,
  dropOut: 14,
  /** An oil barrel's slick: foes in it are oiled (1k: fire on them is WILDFIRE) for oilSoak s after they step out. */
  oilR: 24,
  oilLife: 10,
  oilSoak: 6,
  /** A powder barrel's fuse and blast. Fair: escapeDistance 32 / 74 px/s + 0.2 s = 0.63 s, under the 0.8 s fuse. */
  fuse: 0.8,
  blastR: 32,
  blastStun: 0.6,
  /** A fire patch, a blast or another burning prop sets a prop alight within this reach (a chain reaction). */
  igniteR: 24,
  /** A pillar topples away from the hit: a lane fallLen long, fallHalf either side, landing after fallTell. */
  fallTell: 0.6,
  fallLen: 44,
  fallHalf: 10,
  stun: 1.5,
  /** Damage, as a share of the floor's trap hit (content.ts trapAtk). Foes take the room hard; the hero lightly. */
  foeSpike: 2,
  foeFire: 0.6,
  foeBlast: 3,
  foePillar: 2.5,
  heroFire: 0.4,
  heroBlast: 1,
  /** Foes a little wary: wary - 1 of every wary foes step round a live hazard; the rest walk on. Bosses never shy. */
  wary: 3,
  /** At most this many patches at once (the oldest goes first), and props per floor. */
  maxPatches: 6,
  maxProps: 5,
  /** One prop per this many floor tiles. A prop's tile has at least openMin of its 8 neighbours floor. Props keep gap
   * tiles from each other, stairGap from a stair, exit or chest, arriveGap from where the hero stands on arrival. */
  per: 30,
  openMin: 5,
  gap: 3,
  stairGap: 2,
  arriveGap: 3,
} as const;

/** The writer's cells (tools/pixel-writer/room_writer.py, room-props.png, 16x32). */
export const PROP_CELL = { lantern: 0, lanternBare: 1, oil: 2, powder: 3, staves: 4, pillar: 5, pillarLow: 6, rubble: 7 } as const;
export const ROOM_SHEETS = { props: "/art/writer/room-props.png", glow: "/art/writer/room-props_em.png", fire: "/art/writer/room-fire.png", oil: "/art/writer/room-oil.png" } as const;
/** The order props are dealt out on a floor: the four kinds, turned to start at the floor seed's pick (so each floor
 * mixes them differently), then a second lantern. The first maxProps that find room stand. */
export const PROP_KINDS: readonly PropKind[] = ["lantern", "oil", "powder", "pillar"];
export function propOrder(seed: number): PropKind[] {
  const s = (seed >>> 5) % PROP_KINDS.length;
  return [...PROP_KINDS.slice(s), ...PROP_KINDS.slice(0, s), "lantern"];
}

export function emptyRoom(): RoomState {
  return { props: [], patches: [], falls: [], drops: [], solid: new Set() };
}

/** FNV-style mix of a seed and an index into [0, 1). */
function roll(seed: number, i: number) {
  let n = (seed ^ Math.imul(i + 1, 0x9e3779b1)) >>> 0;
  n = Math.imul(n ^ (n >>> 15), 0x85ebca6b) >>> 0;
  n = Math.imul(n ^ (n >>> 13), 0xc2b2ae35) >>> 0;
  return ((n ^ (n >>> 16)) >>> 0) / 4294967296;
}

/** Walkable for the reach test (feats.ts's own rule: not rock, furnishing or a secret). */
function walks(t: number) {
  return t !== T.wall && t !== T.shelf && t !== T.cauldron && t !== T.moon && !secretTile(t);
}

/** Tiles reachable from (sx, sy), four-way, with the blocked set treated as rock. */
function reach(tiles: ArrayLike<number>, w: number, h: number, sx: number, sy: number, blocked: Set<number>) {
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
      if (seen[j] || blocked.has(j) || !walks(tiles[j])) continue;
      seen[j] = 1;
      q.push(j);
    }
  }
  return q.length;
}

/**
 * The props of one floor, from its seed. A prop stands only on a floor tile with at least ROOM.openMin of its eight
 * neighbours floor (a room's edge or middle, never a corridor), off every trap, secret, captive, mimic and chest (and
 * their neighbours), ROOM.stairGap tiles from a stair or exit, ROOM.arriveGap from the arrival spot and ROOM.gap from
 * each other; and the floor stays whole: with every prop as rock, all that was reachable from the arrival still is.
 * One prop per ROOM.per floor tiles, at most ROOM.maxProps.
 */
export function placeRoom(tiles: ArrayLike<number>, w: number, h: number, dungeon: string, floor: number, keepOff: readonly { x: number; y: number }[], arrive: { x: number; y: number }): RoomState {
  const room = emptyRoom();
  const near = (x: number, y: number, ps: readonly { x: number; y: number }[], d: number) => ps.some((p) => Math.max(Math.abs(p.x - x), Math.abs(p.y - y)) <= d);
  const stairs: { x: number; y: number }[] = [];
  let floors = 0;
  for (let i = 0; i < w * h; i++) {
    const t = tiles[i];
    if (t === T.floor) floors += 1;
    if (t === T.stairD || t === T.stairU || t === T.exit || t === T.chest) stairs.push({ x: i % w, y: Math.floor(i / w) });
  }
  const want = Math.min(ROOM.maxProps, Math.floor(floors / ROOM.per));
  if (want <= 0 || arrive.x < 0 || arrive.y < 0 || arrive.x >= w || arrive.y >= h) return room;
  const open: number[] = [];
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      if (tiles[y * w + x] !== T.floor) continue;
      let n = 0;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if ((dx || dy) && tiles[(y + dy) * w + x + dx] === T.floor) n += 1;
      if (n >= ROOM.openMin && !near(x, y, stairs, ROOM.stairGap) && !near(x, y, keepOff, 1) && !near(x, y, [arrive], ROOM.arriveGap)) open.push(y * w + x);
    }
  }
  const seed = featSeed(dungeon, floor, "room");
  const order = open.map((i, k) => ({ i, r: roll(seed, k) })).sort((a, b) => a.r - b.r || a.i - b.i);
  const base = reach(tiles, w, h, arrive.x, arrive.y, new Set());
  const deal = propOrder(seed);
  for (const { i } of order) {
    if (room.props.length >= want) break;
    const x = i % w;
    const y = Math.floor(i / w);
    if (near(x, y, room.props, ROOM.gap - 1)) continue;
    room.solid.add(i);
    if (reach(tiles, w, h, arrive.x, arrive.y, room.solid) !== base - room.solid.size) {
      room.solid.delete(i);
      continue;
    }
    const kind = deal[room.props.length];
    room.props.push({ kind, x, y, hp: ROOM.hp[kind], done: false, fuse: 0 });
  }
  return room;
}

/** The tiles a floor's other features keep props off (traps, secrets, the captive, the mimic). */
export function featSpots(f: { traps?: readonly Trap[]; captive?: { x: number; y: number }; mimic?: { x: number; y: number }; rune?: { door: { x: number; y: number }; marks: readonly { x: number; y: number }[] }; crack?: { wall: { x: number; y: number } } } | null): { x: number; y: number }[] {
  if (!f) return [];
  return [...(f.traps ?? []), ...(f.captive ? [f.captive] : []), ...(f.mimic ? [f.mimic] : []), ...(f.rune ? [f.rune.door, ...f.rune.marks] : []), ...(f.crack ? [f.crack.wall] : [])];
}

/** A prop stops everyone while it stands. A lantern's post stays when the lantern drops. */
export function propSolid(p: RoomProp) {
  return p.kind === "lantern" || !p.done;
}

export function centre(p: { x: number; y: number }, tile = 16) {
  return { x: p.x * tile + 8, y: p.y * tile + 10 };
}

/** The fire patch (or oil slick) under a point, if any. */
export function patchAt(room: RoomState, x: number, y: number, kind: Patch["kind"]) {
  return room.patches.find((p) => p.kind === kind && p.life > 0 && Math.hypot(x - p.x, y - p.y) < p.r);
}

/** Lay a patch; the oldest goes when there are ROOM.maxPatches. An oil slick lit is a big fire on its spot. */
export function addPatch(room: RoomState, kind: Patch["kind"], x: number, y: number, r: number) {
  const life = kind === "fire" ? ROOM.fireLife : ROOM.oilLife;
  room.patches.push({ kind, x, y, r, life, max: life, tick: 0 });
  while (room.patches.length > ROOM.maxPatches) room.patches.shift();
}

/** Can this prop still be struck or set alight? (Not once dropped, burst or broken, nor while its fuse burns.) */
export function propLive(p: RoomProp) {
  return !p.done && p.fuse <= 0;
}

/** Anything live on the floor at all (the sim skips its room pass on a quiet floor). */
export function roomBusy(room: RoomState) {
  return room.patches.length > 0 || room.falls.length > 0 || room.drops.length > 0 || room.props.some((p) => p.fuse > 0);
}

/** A struck point's reach test for a prop: its centre within reach + 8 px (a prop is a tile wide) and inside the
 * swing's half-angle, widened by the prop's own half width at that distance. */
export function inSwing(p: { x: number; y: number }, hx: number, hy: number, aim: number, half: number, reach: number, tile = 16) {
  const dx = p.x * tile + 8 - hx;
  const dy = p.y * tile + 8 - hy;
  const d = Math.hypot(dx, dy);
  if (d > reach + 8) return false;
  if (d < 10) return true;
  let diff = Math.abs(Math.atan2(dy, dx) - aim);
  if (diff > Math.PI) diff = Math.PI * 2 - diff;
  return diff <= half + Math.atan2(8, d);
}

/** A powder barrel's blast mark centre, while its fuse burns. */
export function fuses(room: RoomState) {
  return room.props.filter((p) => p.kind === "powder" && p.fuse > 0);
}

/** Is (x, y) inside the pillar's falling lane? */
export function inLane(f: Fall, x: number, y: number) {
  const rx = x - f.x;
  const ry = y - f.y;
  const t = rx * f.dx + ry * f.dy;
  if (t < -4 || t > ROOM.fallLen) return false;
  return Math.abs(rx * -f.dy + ry * f.dx) <= ROOM.fallHalf;
}

/**
 * A live hazard at (x, y) that a wary foe steps round: a fire patch, a burning fuse's blast mark, a spike that is rising
 * or up. Oil and a toppling pillar are not seen (foes are not that clever).
 */
export function hazardAt(room: RoomState, traps: readonly Trap[] | undefined, seconds: number, x: number, y: number, tile = 16) {
  if (patchAt(room, x, y, "fire")) return true;
  for (const p of room.props) if (p.kind === "powder" && p.fuse > 0 && Math.hypot(x - (p.x * tile + 8), y - (p.y * tile + 8)) < ROOM.blastR) return true;
  if (traps) {
    const tx = Math.floor(x / tile);
    const ty = Math.floor(y / tile);
    for (const t of traps) if (t.kind === "spike" && t.x === tx && t.y === ty && spikeStage(t, seconds) > 0) return true;
  }
  return false;
}

/** Wary or bold: a fixed pick per foe (its id), so the same foe always does the same. */
export function wary(id: string, boss: boolean) {
  if (boss) return false;
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return h % ROOM.wary !== 0;
}
