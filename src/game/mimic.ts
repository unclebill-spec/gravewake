/**
 * Mimic chests (item 4): which plain chest on a floor is a mimic.
 *
 * An overlay, like the captive: nothing here writes a tile or moves a spawn. Only a floor's plain
 * chest can be a mimic, never a rune-vault or pocket-room chest, never on a boss floor, never in a
 * pocket cave. FNV-1a (featSeed) into the shared mulberry RNG: the same floor always answers the same.
 */
import { MIMICS, T, mulberry } from "./content";
import { featSeed, type FloorFeats, type Spot } from "./feats";

/** The plain chests on a floor: chest tiles that are not a secret room's chest. Reading order. */
export function plainChests(tiles: ArrayLike<number>, w: number, feats: FloorFeats | null): Spot[] {
  const out: Spot[] = [];
  for (let i = 0; i < tiles.length; i++) {
    if (tiles[i] !== T.chest) continue;
    const x = i % w;
    const y = Math.floor(i / w);
    if (feats?.rune && feats.rune.chest.x === x && feats.rune.chest.y === y) continue;
    if (feats?.crack && feats.crack.chest.x === x && feats.crack.chest.y === y) continue;
    out.push({ x, y });
  }
  return out;
}

/** The chest on this floor that is a mimic, or null. */
export function mimicChest(tiles: ArrayLike<number>, w: number, dungeon: string, floor: number, floors: number, pocket: boolean, feats: FloorFeats | null): Spot | null {
  if (pocket || floor >= floors) return null;
  const chests = plainChests(tiles, w, feats);
  if (!chests.length) return null;
  const rng = mulberry(featSeed(dungeon, floor, "mimic"));
  if (rng() >= MIMICS.chance) return null;
  return chests[Math.floor(rng() * chests.length)];
}
