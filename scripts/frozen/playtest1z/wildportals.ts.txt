/**
 * playtest1z [OWNER-APPROVED 2026-10-06 17:14 ET: playtest1z portal redesign + wild spawn portals + mini quest]:
 * rare wild spawn portals on the vale (NOT in town/villages, NOT on a platform, HALF the size of the current 1y
 * wayrifts = 12x16 art on a 1x1 footprint). They pop up, spawn bad guys around them, and zoning in opens a
 * procedural mini-dungeon (clear floor or mini-boss arena) ending in a camp with a wise old man who gives a
 * small fetch/kill quest through a second portal. Modest rewards; no main-game damage/HP retune.
 */
export const WILD_PORTAL = {
  /** Art size: half of wayrift2 (24x32) → 12x16. */
  artW: 12,
  artH: 16,
  fw: 1,
  fh: 1,
  stand: 1,
  frames: 8,
  light: 48,
  /** Chance per check tick (~every 8 s of play on the vale) that a portal tries to spawn when none is up. */
  chance: 0.08,
  /** Seconds between spawn rolls. */
  rollEvery: 8,
  /** How long a wild portal stays on the vale if never entered. */
  life: 90,
  /** Foes it bleeds onto the vale around its mouth while open. */
  spawnEvery: 4,
  spawnCap: 4,
  /** Keep clear of town door, villages, lairs (tiles). */
  townClear: 18,
  villageClear: 10,
  lairClear: 8,
} as const;

export const WILD_PORTAL_SHEET = "/art/writer/wayrift3.png";
export const WILD_PORTAL_EM = "/art/writer/wayrift3_em.png";

export type WildPortal = {
  /** Vale tile of the mouth. */
  x: number;
  y: number;
  /** World ms when it appeared. */
  born: number;
  /** Layout once entered: "arena" (A) or "floors" (B). Seeded from born. */
  layout: "arena" | "floors";
  /** Quest flavor once the camp is reached. */
  quest: "heads" | "ring";
};

export type WildQuest = {
  kind: "heads" | "ring";
  /** How many heads still needed (heads quest). */
  need: number;
  /** Heads gathered. */
  have: number;
  /** Ring found? */
  ring: boolean;
  /** Spoken with the old man (quest accepted). */
  taken: boolean;
  /** Turned in. */
  done: boolean;
};

export const WILD_QUEST_REWARD = { silver: 28, points: 12 } as const;

/** Seeded pick: same born → same layout/quest. */
export function wildLayout(born: number): "arena" | "floors" {
  return (born >>> 0) % 2 === 0 ? "arena" : "floors";
}
export function wildQuestKind(born: number): "heads" | "ring" {
  return ((born >>> 3) & 1) === 0 ? "heads" : "ring";
}

export function wildMouth(p: WildPortal) {
  return { x: p.x, y: p.y };
}
export function wildFront(p: WildPortal) {
  return { x: p.x, y: p.y + WILD_PORTAL.fh };
}

export function wildArtAt(p: WildPortal, px: number, py: number, tile = 16): boolean {
  const ax = p.x * tile + (tile - WILD_PORTAL.artW) / 2;
  const ay = (p.y - WILD_PORTAL.stand) * tile;
  return px >= ax && px < ax + WILD_PORTAL.artW && py >= ay && py < ay + WILD_PORTAL.artH;
}

/** Quest copy for the wise old man. */
export function wildQuestPitch(q: WildQuest): string {
  if (q.done) return `Elder Thorn smiles. "You have done well. Rest, then the rift will take you home."`;
  if (!q.taken) {
    return q.kind === "heads"
      ? `Elder Thorn leans on his staff. "A rift spat horrors into my camp. Bring me three of their heads, and I will open the way home."`
      : `Elder Thorn leans on his staff. "The rift-lord stole my ring. Slay him beyond that portal and bring it back."`;
  }
  if (q.kind === "heads") {
    return q.have >= q.need
      ? `Elder Thorn nods. "The heads are enough. Hand them over."`
      : `Elder Thorn waits. "I still need ${q.need - q.have} more heads."`;
  }
  return q.ring ? `Elder Thorn's eyes brighten. "My ring! Give it here."` : `Elder Thorn waits. "The ring still lies with the rift-lord beyond that portal."`;
}

export function wildQuestLog(q: WildQuest): string {
  if (q.done) return "Wild rift quest complete.";
  if (!q.taken) return "Speak to Elder Thorn.";
  if (q.kind === "heads") return `Heads for Elder Thorn: ${q.have}/${q.need}.`;
  return q.ring ? "Return the ring to Elder Thorn." : "Find Elder Thorn's ring on the rift-lord.";
}

/**
 * Mini-dungeon map ids used while inside a wild portal run.
 * wildrift = clear floor / arena; wildcamp = camp with Elder Thorn; wildquest = quest pocket beyond his portal.
 */
export const WILD_MAP = {
  rift: "wildrift",
  camp: "wildcamp",
  quest: "wildquest",
} as const;

/** Carve helpers: dimensions for each stage. */
export const WILD_SIZE = {
  arena: { w: 22, h: 16 },
  floors: { w: 20, h: 14 },
  camp: { w: 14, h: 12 },
  quest: { w: 18, h: 12 },
} as const;
