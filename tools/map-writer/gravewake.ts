/**
 * Gravewake adapter for the map writer. Not imported by the game yet (phase 1 is the tool only).
 *
 * It does what carveFloor does after its rooms are laid: the game's own secret, trap, captive, and
 * mimic placement runs on the writer's grid, in the same order, with the same tile codes. So when the
 * owner approves a generated site, the game can call this in place of carveFloor for that one site.
 */
import { FAMILIES, T } from "../../src/game/content";
import { placeFeats, placeTraps, type FloorFeats } from "../../src/game/feats";
import { mimicChest } from "../../src/game/mimic";
import { placeCaptive } from "../../src/game/runs";
import { rng32, subSeed, writeDungeon, writeRift, type FoeEntry, type MapResult, type TileCodes } from "./map_writer";

export const GRAVEWAKE_CODES: TileCodes = { wall: T.wall, floor: T.floor, stairUp: T.stairU, stairDown: T.stairD, chest: T.chest, exit: T.exit };
/** A rift's way back is painted as the up stair: the game's placement code anchors on T.stairU, and floor 1's up stair already means "leave". */
export const RIFT_CODES: TileCodes = { ...GRAVEWAKE_CODES, exit: T.stairU };

/** "Dungeons: all except bat" (floor roamers). The mimic is not a family here; it wakes from a chest. */
export const DUNGEON_ROSTER: FoeEntry[] = FAMILIES.filter((m) => m.id !== "bat").map((m) => ({ id: m.id }));

export type Placed = { map: MapResult; feats: FloorFeats };

/** One generated floor plus the game's own placement on it. site is the id the feat seeds hash. */
export function gravewakeFloor(site: string, seed: number | string, floor: number, floors: number, level: number): Placed {
  const map = writeDungeon({ seed, floor, codes: GRAVEWAKE_CODES, roster: DUNGEON_ROSTER, level, down: floor < floors });
  const { tiles, w, h, spawns } = map;
  const feats = placeFeats(tiles, w, h, site, floor, floors, false);
  feats.traps = placeTraps(tiles, w, h, site, floor, floors, false, feats, spawns);
  const captive = placeCaptive(tiles, w, h, site, floor, floors, feats, spawns);
  if (captive) feats.captive = captive;
  const mimic = mimicChest(tiles, w, site, floor, floors, false, feats);
  if (mimic) feats.mimic = mimic;
  return { map, feats };
}

/**
 * One rift zone pocket. The pocket rerolls each day-night cycle, so it takes traps only (stateless overlays):
 * no secret rooms, no mimic, no captive, whose saved state is keyed by site and floor, not by layout.
 * roster: the rift tile's own families (the wild rule), since a rift is a pocket of its overworld tile.
 */
export function gravewakeRift(site: string, seed: number | string, level: number, roster: FoeEntry[] = DUNGEON_ROSTER): Placed {
  const map = writeRift({ seed, codes: RIFT_CODES, roster, level });
  const { tiles, w, h, spawns } = map;
  const feats: FloorFeats = { hidden: [] };
  feats.traps = placeTraps(tiles, w, h, site, 1, 1, true, feats, spawns);
  return { map, feats };
}

/** The boss-room guard of a generated floor: a seeded family from the roster and a Stalker affix the game already uses. */
export function guardPick(map: MapResult, roster: FoeEntry[] = DUNGEON_ROSTER): { id: string; affix: "fast" | "vortex" } {
  const r = rng32(subSeed(map.seed, "guard"));
  const id = roster[Math.floor(r() * roster.length)].id;
  return { id, affix: r() < 0.5 ? "fast" : "vortex" };
}
