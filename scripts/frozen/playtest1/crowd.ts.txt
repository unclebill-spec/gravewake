/**
 * Crowd looks for town folk. folk-variants.png holds CROWD_VARIANTS extra looks per town role
 * (eleven frames each, roles in CROWD_ROLES order); look 0 is the role's people.png cell.
 * The look comes from a hash of the NPC's id, so it is the same every frame, save, and reload.
 * Picture only: nothing here touches movement, collision, combat, or timers.
 */
export const CROWD_SHEET = "/art/sprites/folk-variants.png";
export const CROWD_VARIANTS = 4;
export const CROWD_ROLES = ["guard", "hunter", "undertaker", "zeppelin", "inn", "shop", "guild", "bank", "casino", "patron", "smith", "tailor", "fisher", "merchant", "alchemist", "portal"];
/**
 * Roles that are one fixed person and always wear their people.png cell. The town hunter is one man,
 * day and night. His looks stay in folk-variants.png (the sheet is a writer output and is not redrawn);
 * they are simply never picked.
 */
export const CROWD_FIXED: readonly string[] = ["hunter"];

/** FNV-1a over the id. Stable and pure; never Math.random. */
export function crowdLook(seed: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  h ^= h >>> 15;
  h = Math.imul(h, 0x2c1b3c6d);
  h ^= h >>> 12;
  return (h >>> 0) % (CROWD_VARIANTS + 1);
}

/** Column in folk-variants.png for a role's look and frame, or -1 when people.png should be used. */
export function crowdCol(role: string, look: number, frameCol: number): number {
  const r = CROWD_ROLES.indexOf(role);
  if (CROWD_FIXED.includes(role)) return -1;
  if (r < 0 || look <= 0 || look > CROWD_VARIANTS) return -1;
  return (r * CROWD_VARIANTS + look - 1) * 11 + frameCol;
}
