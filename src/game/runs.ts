/**
 * Floor curses and the escort/rescue quest: where they fall and which run gets which.
 *
 * Both are overlays. Nothing here writes a tile, moves a foe spawn, or touches a secret or a trap.
 * Seeds are FNV-1a (featSeed) into the shared mulberry RNG, so the same site on the same day-night
 * cycle always draws the same curse, and a captive always waits on the same floor and tile.
 */
import { CURSES, RESCUES, RUNS, T, mulberry, type CurseId, type Rescue } from "./content";
import { featSeed, secretTile, walkSteps, type FloorFeats, type Spot } from "./feats";

export const CURSE_IDS = Object.keys(CURSES) as CurseId[];

/** The curse a run draws, or "" for a plain run. day is the day-night cycle the run began on. */
export function pickCurse(dungeon: string, day: number): CurseId | "" {
  const rng = mulberry(featSeed(dungeon, day, "curse"));
  if (rng() >= RUNS.curseChance) return "";
  return CURSE_IDS[Math.floor(rng() * CURSE_IDS.length)];
}

/** A curse holds on every floor of the run but the boss floor. Pocket caves have no boss. */
export function curseFloor(floor: number, floors: number, pocket: boolean) {
  return pocket || floor < floors;
}

/** The captive held in this site, if any. */
export function rescueFor(dungeon: string): Rescue | undefined {
  return RESCUES.find((r) => r.dungeon === dungeon);
}

/** The floor a captive waits on: seeded, never floor 1 (too short a walk) and never the boss floor. */
export function captiveFloor(dungeon: string, floors: number): number {
  if (floors < 3) return 0;
  const rng = mulberry(featSeed(dungeon, 0, "captive"));
  return 2 + Math.floor(rng() * (floors - 2));
}

/**
 * The tile a captive stands on. Open floor the hero can reach from the up stair; never on or beside
 * a stair, a chest, or a secret; never on a trap, a foe spawn, the tile a secret is used from, or in a
 * secret room. Seeded pick among the farthest reachable tiles, so the walk out means something.
 */
export function placeCaptive(tiles: ArrayLike<number>, w: number, h: number, dungeon: string, floor: number, floors: number, feats: FloorFeats, spawns: number[]): Spot | null {
  const res = rescueFor(dungeon);
  if (!res || captiveFloor(dungeon, floors) !== floor || floor >= floors) return null;
  let up = -1;
  for (let i = 0; i < tiles.length; i++) if (tiles[i] === T.stairU) up = i;
  if (up < 0) return null;
  const steps = walkSteps(tiles, w, h, up % w, Math.floor(up / w));
  const off = new Set<number>([...spawns, ...feats.hidden, ...(feats.traps ?? []).map((t) => t.y * w + t.x)]);
  const r = feats.rune;
  if (r) for (const m of [r.approach, ...r.marks.map((m) => m.stand)]) off.add(m.y * w + m.x);
  if (feats.crack) off.add(feats.crack.approach.y * w + feats.crack.approach.x);
  for (let i = 0; i < tiles.length; i++) {
    const t = tiles[i];
    if (t !== T.stairU && t !== T.stairD && t !== T.chest && !secretTile(t)) continue;
    const x = i % w;
    const y = Math.floor(i / w);
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) off.add((y + dy) * w + x + dx);
  }
  const cands: { i: number; d: number }[] = [];
  for (let i = 0; i < tiles.length; i++) {
    if (tiles[i] !== T.floor || off.has(i) || steps[i] < 0) continue;
    cands.push({ i, d: steps[i] });
  }
  if (!cands.length) return null;
  cands.sort((a, b) => b.d - a.d || a.i - b.i);
  const pool = cands.slice(0, 8);
  const rng = mulberry(featSeed(dungeon, floor, "captive-spot"));
  const pick = pool[Math.floor(rng() * pool.length)];
  return { x: pick.i % w, y: Math.floor(pick.i / w) };
}
