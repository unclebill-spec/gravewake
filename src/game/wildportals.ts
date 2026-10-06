/**
 * playtest1z [OWNER-APPROVED 2026-10-06 17:14 ET: playtest1z portal redesign + wild spawn portals + mini quest]:
 * rare wild spawn portals on the vale (NOT in town/villages, NOT on a platform, HALF the size of the current 1y
 * wayrifts = 12x16 art on a 1x1 footprint). They pop up, spawn bad guys around them, and zoning in opens a
 * procedural mini-dungeon. Modest rewards; no main-game damage/HP retune.
 * playtest1z2 (Bill's 17:14 ET clarification): entering rolls ONE of three layouts, seeded from born:
 *   "arena"  — a mini-boss plus little foes; clearing it pays a modest reward and opens the way home. No camp.
 *   "floors" — clear the floor, a ladder down to a mini-boss, clear it (modest reward), then home. No camp.
 *   "camp"   — straight into Elder Thorn's camp; his portal leads to the quest pocket (heads or ring); turn in to him.
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

/** playtest1z2: the three entry layouts. */
export type WildLayout = "arena" | "floors" | "camp";
export const WILD_LAYOUTS: readonly WildLayout[] = ["arena", "floors", "camp"] as const;

export type WildPortal = {
  /** Vale tile of the mouth. */
  x: number;
  y: number;
  /** World ms when it appeared. */
  born: number;
  /** Layout once entered (playtest1z2: one of three). Seeded from born. */
  layout: WildLayout;
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
/** playtest1z2: modest pay for clearing an arena or the floors' mini-boss (half the quest's; no fight numbers move). */
export const WILD_CLEAR_REWARD = { silver: 14, points: 6 } as const;

/** Seeded pick: same born → same layout/quest. playtest1z2: one of three (arena, floors, camp). */
export function wildLayout(born: number): WildLayout {
  return WILD_LAYOUTS[(born >>> 0) % 3];
}

/** playtest1z2: a stage name a run can be in (rift = arena or the floors' first floor; deep = the floors' mini-boss). */
export type WildStage = "rift" | "deep" | "camp" | "quest";
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
 * wildrift = clear floor / arena; wilddeep = the floors' mini-boss below the ladder (playtest1z2);
 * wildcamp = camp with Elder Thorn; wildquest = quest pocket beyond his portal.
 */
export const WILD_MAP = {
  rift: "wildrift",
  deep: "wilddeep",
  camp: "wildcamp",
  quest: "wildquest",
} as const;

/** playtest1z2: is this dungeon id one of the wild-run maps (a save made in one has no run to resume)? */
export function isWildMap(id: string | undefined | null): boolean {
  return !!id && (Object.values(WILD_MAP) as string[]).includes(id);
}

/** Carve helpers: dimensions for each stage. */
export const WILD_SIZE = {
  arena: { w: 22, h: 16 },
  floors: { w: 20, h: 14 },
  deep: { w: 16, h: 12 },
  camp: { w: 14, h: 12 },
  quest: { w: 18, h: 12 },
} as const;
