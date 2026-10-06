/**
 * Shared tables for Gravewake. Simulation and drawing both read from here
 * so a number, a name, or a tile id has one home.
 */
export const TILE = 16;

/**
 * playtest1e [OWNER-APPROVED 2026-10-02: playtest1e bigger world] (Bill: "the world and biomes feel super tiny"): the vale
 * is laid at twice the old 64x60 plan each way, so every biome has four times its old area. Every world place (mouths,
 * bosses, carts, the town door) sits at twice its old tile; the zone rule is the old rectangles at twice the size.
 */
/**
 * playtest1v [OWNER-APPROVED 2026-10-05 21:14 ET: playtest1v bigger biomes] (Bill: "double each area in size"): the vale
 * grows sqrt2 each way again (128x120 -> 181x170), so every wild biome has twice its 1e area; the town (its own 40x30
 * map) is unchanged. Every world place sits at round(1e tile x sqrt2) (WORLD.grow); scale = vale tiles per old plan tile.
 */
export const WORLD = { scale: 2 * Math.SQRT2, grow: Math.SQRT2, w: 181, h: 170, was: { w: 128, h: 120 } } as const;
/** playtest1v: a 1e world tile on the 1v vale. */
export function growTile(v: number) {
  return Math.round(v * WORLD.grow);
}
export type WorldBiome = "vale" | "snow" | "sand" | "ash" | "swamp";
/** The world's zone rule (one place for it): the old rectangles, read at WORLD.scale. */
export function worldBiome(tx: number, ty: number): WorldBiome {
  return planBiome(Math.floor(tx / WORLD.scale), Math.floor(ty / WORLD.scale));
}
/** The old 64x60 rectangles, on plan tiles (the camp and the town still read their own small grids with it). */
export function planBiome(x: number, y: number): WorldBiome {
  if (y < 16) return "snow";
  if (x > 48) return "sand";
  if (y > 46) return "ash";
  if (x > 26 && x < 42 && y > 22 && y < 40) return "swamp";
  return "vale";
}
/** The town's door on the vale and the road tile south of it (the old 32,44 and 32,46). */
export const WORLD_DOOR = { x: 91, y: 124 } as const; // playtest1v: 1e (64,88) x sqrt2
export const DAY_MS = 15 * 60 * 1000;
export const NIGHT_MS = 15 * 60 * 1000;
export const CYCLE_MS = DAY_MS + NIGHT_MS;

/** Tile ids. shelf, cauldron, moon, water, pool, and ice are also collision rules. */
export const T = {
  grass: 0,
  dirt: 1,
  road: 2,
  wall: 3,
  water: 4,
  tree: 5,
  rock: 6,
  floor: 7,
  door: 8,
  pump: 9,
  grave: 10,
  hearth: 11,
  stairD: 12,
  stairU: 13,
  pool: 14,
  snow: 15,
  ash: 16,
  sand: 17,
  swamp: 18,
  bone: 19,
  exit: 20,
  cobble: 21,
  chest: 22,
  cauldron: 23,
  shelf: 24,
  moon: 25,
  ice: 26,
  nets: 27,
  /** Dungeon secrets. All four are solid until solved or broken. See feats.ts. */
  runeDoor: 28,
  crack: 29,
  brazier: 30,
  statue: 31,
} as const;

export type Tile = (typeof T)[keyof typeof T];
export type ClassId = "warrior" | "wizard" | "assassin" | "vampire";
export type StatPath = "str" | "dex" | "int";
export type Slot = "head" | "chest" | "legs" | "feet" | "main" | "off" | "ring" | "neck";

/**
 * Gear, junk, bait, fish, gifts, and relics.
 * active is an off-hand spell and only fires for the hero.
 * aura is a passive and still works if a companion wears the piece.
 */
export type Item = {
  uid: string;
  name: string;
  kind: "weapon" | "armor" | "junk" | "gem" | "potion" | "jewel" | "gift" | "relic" | "bait" | "fish" | "tackle";
  /** Witchlit derby fish only (item 9): length in inches. Rides in the saved pack like any item field. */
  size?: number;
  rank: 1 | 2 | 3 | 4 | 5;
  slot?: Slot;
  armor?: "plate" | "cloth" | "leather" | "chain";
  atk?: number;
  ac?: number;
  bonus?: number;
  stack?: number;
  special?: string;
  hands?: 1 | 2;
  /** Off-hand spell. Works for the hero. Sleeps if a companion wears it. */
  active?: string;
  /** Passive. Still works on a companion. */
  aura?: string;
  gift?: string;
  /** Rank 4 set name. Two pieces add armor. Four add attack. */
  set?: string;
  /** Gem seated in a socket. Its bonus is gemBonus, not the old gem item. */
  gem?: string;
  gemBonus?: number;
};

export type MonsterDef = {
  id: string;
  name: string;
  family: string;
  tint: string;
  hp: number;
  atk: number;
  ac: number;
  xp: number;
  silver: number;
  boss?: boolean;
  mini?: boolean;
};

/** The four faces. A vampire borrows one special from each of the other three. */
export const CLASSES: Record<
  ClassId,
  { label: string; armor: Item["armor"]; blurb: string; specials: string[] }
> = {
  warrior: {
    label: "Warrior",
    armor: "plate",
    blurb: "Plate and a deep health pool. Swings that reach everyone close.",
    specials: ["Loadout Stance", "Earthshatter", "War Cry", "Execution"],
  },
  wizard: {
    label: "Dark Wizard",
    armor: "cloth",
    blurb: "Cloth and a mana pool. Lightning, deathbolts, curses, and a shade.",
    specials: ["Deathbolt", "Curse", "Summon Shade", "Grave Nova"],
  },
  assassin: {
    label: "Assassin",
    armor: "leather",
    blurb: "Leather, poison, a trap, and a vanish that always works.",
    specials: ["Ambush", "Envenom", "Tripwire", "Vanish"],
  },
  vampire: {
    label: "Vampire",
    armor: "chain",
    blurb: "Chain. Health is the only pool. The town knows your face.",
    specials: ["Earthshatter", "Deathbolt", "Ambush", "Vanish"],
  },
};

export type ArtKind = "heal" | "buff" | "ward" | "curse" | "drain" | "aggro" | "cleanse";
export type KitId =
  | "acolyte"
  | "witch"
  | "shade"
  | "devout"
  | "cunning"
  | "brawn"
  | "arcane"
  | "bound-priest"
  | "bound-alchemist"
  | "bound-mage";

export type Art = { name: string; need: number; kind: ArtKind; power: number; aoe?: boolean };

export type SpellShape = "bolt" | "ring" | "nova" | "mend" | "cone";

/** How a learned hero art looks, and which tree it belongs to. */
export const HERO_SPELLS: Record<string, { shape: SpellShape; color: string; tree: string }> = {
  "Loadout Stance": { shape: "ring", color: "#c4a050", tree: "warrior" },
  Earthshatter: { shape: "nova", color: "#8a6844", tree: "warrior" },
  "War Cry": { shape: "cone", color: "#c43838", tree: "warrior" },
  Execution: { shape: "bolt", color: "#c43838", tree: "warrior" },
  Deathbolt: { shape: "bolt", color: "#6a3a8a", tree: "wizard" },
  Curse: { shape: "ring", color: "#6a8a48", tree: "wizard" },
  "Summon Shade": { shape: "nova", color: "#2a241c", tree: "wizard" },
  "Grave Nova": { shape: "ring", color: "#f4e27a", tree: "wizard" },
  Ambush: { shape: "bolt", color: "#e8dcc8", tree: "assassin" },
  Envenom: { shape: "bolt", color: "#6a8a48", tree: "assassin" },
  Tripwire: { shape: "cone", color: "#c4a050", tree: "assassin" },
  Vanish: { shape: "nova", color: "#1a140c", tree: "assassin" },
};

/** Companion arts. need is the hero level required before the art is offered. */
const HEAL_TREE: Art[] = [
  { name: "Mend", need: 10, kind: "heal", power: 8 },
  { name: "Sanctify", need: 12, kind: "buff", power: 2 },
  { name: "Warding Hymn", need: 15, kind: "ward", power: 3 },
  { name: "Benediction", need: 18, kind: "heal", power: 16 },
  { name: "Dawn Veil", need: 22, kind: "cleanse", power: 12 },
];

const CURSE_TREE: Art[] = [
  { name: "Hex", need: 10, kind: "curse", power: 6 },
  { name: "Siphon", need: 12, kind: "drain", power: 7 },
  { name: "Wither", need: 15, kind: "curse", power: 10 },
  { name: "Blood Tithe", need: 18, kind: "drain", power: 12 },
  { name: "Crone's Mark", need: 22, kind: "curse", power: 9 },
];

const SHADE_TREE: Art[] = [
  { name: "Rake", need: 10, kind: "drain", power: 7 },
  { name: "Taunt", need: 12, kind: "aggro", power: 2 },
  { name: "Umbral Cleave", need: 15, kind: "drain", power: 8, aoe: true },
  { name: "Hunger", need: 18, kind: "drain", power: 13 },
  { name: "Grave Anchor", need: 22, kind: "aggro", power: 3 },
];

export const KITS: Record<KitId, { focus: "heal" | "curse" | "drain"; look: string; tree: Art[] }> = {
  acolyte: { focus: "heal", look: "priest", tree: HEAL_TREE },
  witch: { focus: "curse", look: "witch", tree: CURSE_TREE },
  shade: { focus: "drain", look: "shade", tree: SHADE_TREE },
  devout: {
    focus: "heal",
    look: "priest",
    tree: [
      { name: "Chapel Mend", need: 10, kind: "heal", power: 7 },
      { name: "Quiet Blessing", need: 14, kind: "buff", power: 2 },
      { name: "Lantern Ward", need: 18, kind: "ward", power: 3 },
      { name: "Last Rite", need: 22, kind: "heal", power: 14 },
    ],
  },
  cunning: {
    focus: "curse",
    look: "cutpurse", // playtest1: townsfolk never wear a hero look
    tree: [
      { name: "Needle Hex", need: 10, kind: "curse", power: 6 },
      { name: "Pocket Siphon", need: 14, kind: "drain", power: 7 },
      { name: "Low Cut", need: 18, kind: "curse", power: 9 },
      { name: "Garrote", need: 22, kind: "drain", power: 12 },
    ],
  },
  brawn: {
    focus: "drain",
    look: "sellsword", // playtest1: townsfolk never wear a hero look
    tree: [
      { name: "Shoulder", need: 10, kind: "drain", power: 7 },
      { name: "Bark", need: 14, kind: "aggro", power: 2 },
      { name: "Line Break", need: 18, kind: "drain", power: 10, aoe: true },
      { name: "Hold the Door", need: 22, kind: "ward", power: 3 },
    ],
  },
  arcane: {
    focus: "drain",
    look: "hedgemage", // playtest1: townsfolk never wear a hero look
    tree: [
      { name: "Star Prick", need: 10, kind: "drain", power: 6 },
      { name: "Ink Hex", need: 15, kind: "curse", power: 8 },
      { name: "Hunger", need: 18, kind: "drain", power: 11 },
      { name: "Star Bite", need: 20, kind: "drain", power: 14, aoe: true },
    ],
  },
  "bound-priest": { focus: "heal", look: "priest", tree: [...HEAL_TREE, { name: "Miracle", need: 20, kind: "heal", power: 24 }] },
  "bound-alchemist": { focus: "curse", look: "witch", tree: [...CURSE_TREE, { name: "Cauldron Hex", need: 20, kind: "curse", power: 14, aoe: true }] },
  "bound-mage": { focus: "drain", look: "mystic", tree: [...SHADE_TREE, { name: "Starfall", need: 20, kind: "drain", power: 15, aoe: true }] },
};

export type NightHabit = "out" | "home" | "sometimes";

export type Folk = {
  id: string;
  name: string;
  kit: KitId;
  gate: number;
  gift: string;
  night: NightHabit;
  home?: string;
  coat: string;
  dayX: number;
  dayY: number;
};

/** Townsfolk who can be hired or bitten. dayX and dayY are tiles, not pixels. */
export const FOLK: Folk[] = [
  { id: "mara", name: "Mara", kit: "devout", gate: 10, gift: "chocolate", night: "out", coat: "#6a5040", dayX: 6, dayY: 14 },
  { id: "bram", name: "Bram", kit: "brawn", gate: 10, gift: "flowers", night: "home", home: "bram", coat: "#5a4030", dayX: 8, dayY: 14 },
  { id: "pell", name: "Pell", kit: "cunning", gate: 15, gift: "violin", night: "home", home: "pell", coat: "#405060", dayX: 14, dayY: 14 },
  { id: "ivy", name: "Ivy", kit: "arcane", gate: 15, gift: "perfume", night: "home", home: "ivy", coat: "#704050", dayX: 30, dayY: 14 },
  { id: "sera", name: "Sera", kit: "devout", gate: 15, gift: "ring", night: "sometimes", coat: "#8a6070", dayX: 10, dayY: 14 },
  { id: "noll", name: "Noll", kit: "arcane", gate: 20, gift: "mirror", night: "home", home: "noll", coat: "#3a4060", dayX: 15, dayY: 20 },
  { id: "lute", name: "Lute", kit: "cunning", gate: 20, gift: "paintbrush", night: "sometimes", coat: "#6a5838", dayX: 12, dayY: 20 },
];

export const GIFTS: { gift: string; name: string; price: number }[] = [
  { gift: "chocolate", name: "Boxed chocolate", price: 12 },
  { gift: "flowers", name: "Grave lilies", price: 10 },
  { gift: "ring", name: "Thin silver ring", price: 18 },
  { gift: "perfume", name: "Night perfume", price: 16 },
  { gift: "violin", name: "Travel violin", price: 22 },
  { gift: "mirror", name: "Hand mirror", price: 14 },
  { gift: "paintbrush", name: "Sable brush", price: 14 },
];

export const RELIC_FOR: Record<string, { name: string; kit: KitId; who: string }> = {
  priest: { name: "Chapel tooth", kit: "bound-priest", who: "Priest" },
  alchemist: { name: "Cauldron pearl", kit: "bound-alchemist", who: "Madam Yarrow" },
  mystic: { name: "Star splinter", kit: "bound-mage", who: "Magus Quill" },
};

export const HIRE: Record<"priest" | "alchemist" | "mystic", { id: string; name: string; kit: KitId; native: ClassId; gate: number }> = {
  priest: { id: "acolyte", name: "Acolyte Bren", kit: "acolyte", native: "warrior", gate: 10 },
  alchemist: { id: "witch", name: "Sister Vetch", kit: "witch", native: "assassin", gate: 10 },
  mystic: { id: "shade", name: "Shade-at-Arms", kit: "shade", native: "wizard", gate: 10 },
};

export type HomeDef = { id: string; x: number; y: number; w: number; h: number; outX: number; outY: number; who: string };

/** Cottage footprints. They must match the houses stamped in buildTown. outX/outY is the dawn doorstep. */
export const HOMES: HomeDef[] = [
  { id: "bram", x: 3, y: 8, w: 6, h: 4, outX: 5, outY: 12, who: "Bram" },
  { id: "pell", x: 12, y: 8, w: 6, h: 4, outX: 14, outY: 12, who: "Pell" },
  { id: "ivy", x: 24, y: 8, w: 6, h: 4, outX: 26, outY: 12, who: "Ivy" },
  { id: "noll", x: 11, y: 22, w: 6, h: 5, outX: 13, outY: 21, who: "Noll" },
];

export function insideHome(home: HomeDef, tx: number, ty: number) {
  return tx > home.x && ty > home.y && tx < home.x + home.w - 1 && ty < home.y + home.h - 1;
}

/** Bait at the Drowned Hook. stack is how many casts one purchase covers. */
export const BAITS: { id: string; name: string; price: number; stack: number }[] = [
  { id: "nightcrawlers", name: "Nightcrawlers", price: 4, stack: 5 },
  { id: "leech", name: "Grave leeches", price: 8, stack: 3 },
  { id: "moth", name: "Moth husks", price: 7, stack: 3 },
  { id: "grub", name: "Bone grubs", price: 10, stack: 2 },
  { id: "newt", name: "Witch-eye newts", price: 14, stack: 2 },
];

export const CATCHES: { name: string; points: number }[] = [
  { name: "Pale carp", points: 2 },
  { name: "Lantern perch", points: 3 },
  { name: "Grave trout", points: 4 },
  { name: "Choir bass", points: 5 },
  { name: "Widow eel", points: 6 },
  { name: "Moon pike", points: 8 },
];

export const SEASONS = ["Lantern Night", "Gallows Fair", "Blood Moon", "Frost Wake", "Ash Market", "Swamp Miasma"] as const;

export type WeatherId = "still" | "light" | "heavy" | "storm" | "snow";
export const WEATHER_MS = 150 * 1000;
const WEATHER_ORDER: WeatherId[] = ["still", "light", "heavy", "storm", "snow"];

/** The plain five-step walk (still, light rain, heavy rain, storm, snow), each state WEATHER_MS long. Since item 13 the game reads seasons.ts seasonWeather, whose autumn deck opens with this walk. */
export function weatherAt(ms: number): WeatherId {
  const n = WEATHER_ORDER.length;
  const i = Math.floor(ms / WEATHER_MS) % n;
  return WEATHER_ORDER[(i + n) % n];
}

export function weatherName(id: WeatherId): string {
  if (id === "light") return "Light rain";
  if (id === "heavy") return "Heavy rain";
  if (id === "storm") return "Thunderstorm";
  if (id === "snow") return "Snow";
  return "Still air";
}

export const RANK_NAME = ["", "green", "blue", "purple", "gold", "red"] as const;

let uid = 1;
export function makeItem(partial: Omit<Item, "uid">): Item {
  uid += 1;
  return { uid: `i${uid}`, ...partial };
}

export function asRank(n: number): Item["rank"] {
  return Math.max(1, Math.min(5, Math.round(n))) as Item["rank"];
}

export function starterWeapon(cls: ClassId, path: StatPath): Item {
  if (cls === "wizard" || (cls === "vampire" && path === "int")) {
    return makeItem({ name: "Grave Wand", kind: "weapon", rank: 1, slot: "main", atk: 4 });
  }
  if (cls === "assassin" || (cls === "vampire" && path === "dex")) {
    return makeItem({ name: "Notched Dagger", kind: "weapon", rank: 1, slot: "main", atk: 5 });
  }
  return makeItem({ name: "Iron Arming Sword", kind: "weapon", rank: 1, slot: "main", atk: 5 });
}

export function starterArmor(cls: ClassId): Item {
  const armor = CLASSES[cls].armor!;
  const name =
    armor === "plate" ? "Dented Plate" : armor === "cloth" ? "Moth Cloak" : armor === "leather" ? "Soft Leathers" : "Dull Chain";
  return makeItem({ name, kind: "armor", rank: 1, slot: "chest", armor, ac: 2 });
}

/** Wild families at level 1. scaleMonster grows these numbers for the fight. */
export const FAMILIES: MonsterDef[] = [
  { id: "zombie", name: "Zombie", family: "zombie", tint: "#6a7a48", hp: 14, atk: 4, ac: 1, xp: 8, silver: 4 },
  { id: "skeleton", name: "Skeleton", family: "skeleton", tint: "#d9d0c0", hp: 10, atk: 5, ac: 0, xp: 8, silver: 5 },
  { id: "ghost", name: "Ghost", family: "ghost", tint: "#c5d4e8", hp: 8, atk: 6, ac: 0, xp: 9, silver: 3 },
  { id: "bat", name: "Bat", family: "bat", tint: "#3a2a44", hp: 6, atk: 3, ac: 0, xp: 5, silver: 2 },
  { id: "ghoul", name: "Ghoul", family: "ghoul", tint: "#7a5a3a", hp: 16, atk: 5, ac: 1, xp: 10, silver: 6 },
  { id: "witch", name: "Witch", family: "witch", tint: "#6a3a8a", hp: 12, atk: 7, ac: 0, xp: 12, silver: 8 },
  { id: "pumpkin", name: "Lantern Man", family: "lantern", tint: "#e07a2f", hp: 13, atk: 5, ac: 1, xp: 10, silver: 6 },
  { id: "scare", name: "Scarecrow", family: "scarecrow", tint: "#c4a15a", hp: 15, atk: 5, ac: 2, xp: 11, silver: 5 },
  { id: "wolf", name: "Werewolf", family: "wolf", tint: "#5a4030", hp: 18, atk: 7, ac: 1, xp: 14, silver: 8 },
  { id: "mummy", name: "Mummy", family: "mummy", tint: "#e6d2a2", hp: 20, atk: 6, ac: 3, xp: 14, silver: 9 },
  { id: "vamp", name: "Pale Courtier", family: "vampire", tint: "#8f2d3a", hp: 16, atk: 7, ac: 1, xp: 13, silver: 10 },
  { id: "tree", name: "Knot-Faced Elm", family: "tree", tint: "#3d4a28", hp: 22, atk: 6, ac: 3, xp: 15, silver: 7 },
];

/** Named bosses, plus the loot goblin. A slain boss can return later as the remnant in MINI_NAME. */
export const BOSSES: MonsterDef[] = [
  { id: "frank", name: "Frankenstein", family: "zombie", tint: "#7d8a55", hp: 70, atk: 10, ac: 4, xp: 40, silver: 30, boss: true },
  { id: "warlock", name: "Evil Warlock", family: "witch", tint: "#5a3080", hp: 60, atk: 12, ac: 2, xp: 44, silver: 34, boss: true },
  { id: "wrapped", name: "Wrapped King", family: "mummy", tint: "#e6d2a8", hp: 90, atk: 12, ac: 5, xp: 55, silver: 40, boss: true },
  { id: "lich", name: "The Lich", family: "lich", tint: "#8eb4d8", hp: 80, atk: 13, ac: 3, xp: 60, silver: 44, boss: true },
  { id: "lanternking", name: "Lantern King", family: "lantern", tint: "#e07a2f", hp: 100, atk: 14, ac: 4, xp: 70, silver: 50, boss: true },
  { id: "haysaint", name: "Hay Saint", family: "scarecrow", tint: "#c4a15a", hp: 96, atk: 14, ac: 4, xp: 70, silver: 48, boss: true },
  { id: "horseman", name: "Headless Horseman", family: "horse", tint: "#2a2428", hp: 120, atk: 16, ac: 5, xp: 80, silver: 60, boss: true },
  { id: "dracula", name: "Dracula", family: "vampire", tint: "#6a1020", hp: 140, atk: 18, ac: 5, xp: 90, silver: 70, boss: true },
  { id: "witchboss", name: "Wicked Witch", family: "witch", tint: "#3a6a30", hp: 130, atk: 17, ac: 3, xp: 88, silver: 66, boss: true },
  { id: "rootwidow", name: "Root Widow", family: "tree", tint: "#2a3820", hp: 150, atk: 16, ac: 6, xp: 92, silver: 68, boss: true },
  { id: "priest", name: "Undead Priest", family: "ghost", tint: "#9aa88a", hp: 55, atk: 9, ac: 2, xp: 36, silver: 24, boss: true },
  { id: "abbot", name: "Cursed Abbot", family: "skeleton", tint: "#c4b48a", hp: 58, atk: 9, ac: 3, xp: 36, silver: 24, boss: true },
  { id: "bride", name: "Gallows Bride", family: "ghost", tint: "#d0d8ea", hp: 80, atk: 11, ac: 2, xp: 50, silver: 40, boss: true },
  { id: "saint", name: "Carrion Saint", family: "lich", tint: "#8a9070", hp: 100, atk: 13, ac: 4, xp: 64, silver: 48, boss: true },
  { id: "ashmare", name: "Ash Mare", family: "horse", tint: "#4a4038", hp: 110, atk: 15, ac: 4, xp: 72, silver: 55, boss: true },
  { id: "wolfman", name: "Wolfman", family: "wolf", tint: "#4a3428", hp: 140, atk: 16, ac: 4, xp: 80, silver: 70, boss: true },
  { id: "shade", name: "Death Shade", family: "ghost", tint: "#8aa0c0", hp: 64, atk: 11, ac: 0, xp: 42, silver: 28, boss: true },
  { id: "mummyboss", name: "Giant Mummy", family: "mummy", tint: "#f0e0b0", hp: 120, atk: 14, ac: 6, xp: 70, silver: 60, boss: true },
  { id: "queen", name: "Vampire Queen", family: "vampire", tint: "#a02030", hp: 160, atk: 18, ac: 5, xp: 90, silver: 80, boss: true },
  { id: "tzar", name: "Drowned Tzar", family: "ghost", tint: "#3a6858", hp: 150, atk: 17, ac: 5, xp: 96, silver: 80, boss: true },
  { id: "leech", name: "Leech Bishop", family: "vampire", tint: "#4a2030", hp: 160, atk: 18, ac: 5, xp: 100, silver: 84, boss: true },
  { id: "goblin", name: "Loot Goblin", family: "goblin", tint: "#c4a050", hp: 28, atk: 6, ac: 1, xp: 20, silver: 15 },
];

/**
 * OWNER-APPROVED EXCEPTION 2026-10-01: FESTIVAL BOSSES. The only two bosses beyond the 21 above.
 * Festival nights only (festivals.ts); stats through scaleMonster with the normal boss bulk.
 */
export const FESTIVAL_BOSSES: MonsterDef[] = [
  { id: "pumpkinlord", name: "Pumpkin Lord", family: "pumpkinlord", tint: "#e07a2f", hp: 110, atk: 15, ac: 4, xp: 76, silver: 56, boss: true },
  { id: "krampus", name: "Krampus", family: "krampus", tint: "#3a2418", hp: 150, atk: 17, ac: 5, xp: 96, silver: 80, boss: true },
];

export const MINI_NAME: Record<string, string> = {
  frank: "The Surgeon's Aid",
  warlock: "Parish Acolyte",
  wrapped: "Canopic Guard",
  lich: "Dry Psalm",
  lanternking: "Wick Acolyte",
  haysaint: "Straw Deacon",
  horseman: "The Dullahan's Mare",
  dracula: "Blood Steward",
  witchboss: "Bog Sister",
  rootwidow: "Knot-Faced Elm",
  priest: "The Sexton",
  abbot: "The Prior",
  bride: "Gallows Witness",
  saint: "Carrion Choir",
  ashmare: "Cinder Foal",
  wolfman: "Winter Howl",
  shade: "Pale Afterimage",
  mummyboss: "Tomb Bearer",
  queen: "Court Favorite",
  tzar: "Drowned Page",
  leech: "Chapel Leech",
};

export type DungeonDef = {
  id: string;
  name: string;
  boss: string;
  level: number;
  floors: number;
  theme: string;
  tx: number;
  ty: number;
  town?: boolean;
  scale?: boolean;
  zeppelin?: boolean;
  pocket?: boolean;
  /** OWNER-APPROVED EXCEPTION 2026-10-01: MAP WRITER. Floors come from tools/map-writer; the boss room holds a Stalker pack. */
  gen?: boolean;
  /** OWNER-APPROVED EXCEPTION 2026-10-01: MAP WRITER. A rift zone: one generated pocket per day-night cycle. Not in DUNGEONS. */
  rift?: boolean;
};

/** Vale sites. grave and hearth sit under the town. pocket sites are short side caves. */
export const DUNGEONS: DungeonDef[] = [
  { id: "harrow", name: "Harrow Manor", boss: "frank", level: 10, floors: 8, theme: "harrow", tx: 62, ty: 96, zeppelin: true },
  { id: "ossuary", name: "Parish Ossuary", boss: "warlock", level: 12, floors: 6, theme: "ossuary", tx: 79, ty: 107, zeppelin: true },
  { id: "wraps", name: "Tomb of Wraps", boss: "wrapped", level: 22, floors: 8, theme: "wraps", tx: 153, ty: 51, zeppelin: true },
  { id: "carrion", name: "Fort Carrion", boss: "lich", level: 24, floors: 5, theme: "carrion", tx: 158, ty: 96, zeppelin: true },
  { id: "wick", name: "Abbey of the Last Wick", boss: "lanternking", level: 32, floors: 7, theme: "wick", tx: 124, ty: 141, zeppelin: true },
  { id: "warren", name: "Ember Warren", boss: "haysaint", level: 34, floors: 5, theme: "warren", tx: 102, ty: 153, zeppelin: true },
  { id: "chapel", name: "Hollow Chapel", boss: "horseman", level: 44, floors: 6, theme: "chapel", tx: 68, ty: 28, zeppelin: true },
  { id: "vesper", name: "Castle Vesper", boss: "dracula", level: 48, floors: 10, theme: "vesper", tx: 28, ty: 51, zeppelin: true },
  { id: "drowned", name: "Drowned Parish", boss: "witchboss", level: 62, floors: 9, theme: "drowned", tx: 102, ty: 79, zeppelin: true },
  { id: "blackroot", name: "Blackroot", boss: "rootwidow", level: 66, floors: 7, theme: "blackroot", tx: 85, ty: 102, zeppelin: true },
  { id: "pocketvale", name: "Vale Pocket", boss: "", level: 4, floors: 2, theme: "harrow", tx: 51, ty: 119, pocket: true },
  { id: "pocketwaste", name: "Waste Pocket", boss: "", level: 16, floors: 2, theme: "wraps", tx: 141, ty: 62, pocket: true },
  { id: "pocketcinder", name: "Cinder Pocket", boss: "", level: 26, floors: 2, theme: "warren", tx: 113, ty: 136, pocket: true },
  { id: "pocketwinter", name: "Winter Pocket", boss: "", level: 30, floors: 2, theme: "chapel", tx: 51, ty: 23, pocket: true },
  { id: "pocketswamp", name: "Swamp Pocket", boss: "", level: 40, floors: 2, theme: "drowned", tx: 96, ty: 68, pocket: true },
  // OWNER-APPROVED EXCEPTION 2026-10-01: MAP WRITER. One generated dungeon; no boss (a Stalker pack guards its boss room).
  { id: "barrow", name: "Shifting Barrow", boss: "", level: 14, floors: 3, theme: "cave", tx: 124, ty: 91, zeppelin: true, gen: true },
  { id: "grave", name: "Opened Grave", boss: "priest", level: 10, floors: 5, theme: "grave", tx: 0, ty: 0, town: true, scale: true },
  { id: "hearth", name: "Hearth Stair", boss: "abbot", level: 10, floors: 5, theme: "hearth", tx: 0, ty: 0, town: true, scale: true },
];

/**
 * OWNER-APPROVED EXCEPTION 2026-10-01: MAP WRITER. Rift zones: a site type of their own, not a pocket and not a
 * dungeon. Trash only (the rift tile's own families), a possible Stalker or Goblin, no boss. L = zone of the rift tile.
 * The pocket rerolls each day-night cycle; you come back out on the exact spot you went in from.
 */
export const RIFTS: DungeonDef[] = [{ id: "riftvale", name: "Ashen Rift", boss: "", level: 1, floors: 1, theme: "ossuary", tx: 28, ty: 85, rift: true }];

/** Map-writer site settings. seed is the world seed the generated floors and rifts hash from. */
export const MAP_WRITER = {
  seed: "gravewake",
  /** Seconds between ash swirls at a rift mouth you are near, and how near (tiles). Visual only. */
  swirlEvery: 1.2,
  swirlRange: 6,
};

export function dungeonById(id: string): DungeonDef | undefined {
  return DUNGEONS.find((d) => d.id === id) ?? RIFTS.find((d) => d.id === id);
}

export function monsterById(id: string): MonsterDef {
  return FAMILIES.find((m) => m.id === id) ?? BOSSES.find((m) => m.id === id) ?? FESTIVAL_BOSSES.find((m) => m.id === id) ?? FAMILIES[0];
}

/** Grow a baseline monster to the fight's level. A common foe is bulked to last about four swings. Bosses stay ahead of that. */
export function scaleMonster(def: MonsterDef, level: number): MonsterDef {
  const t = Math.max(1, level);
  const bulk = def.boss ? 2 : 4.6;
  return {
    ...def,
    hp: Math.round(def.hp * (0.55 + t * 0.1) * bulk),
    atk: Math.round(def.atk * (0.7 + t * 0.06)),
    ac: def.ac + Math.floor(t / 10),
    xp: Math.round(def.xp * (0.8 + t * 0.08)),
    silver: Math.round(def.silver * (0.7 + t * 0.06)),
  };
}

/**
 * Floor traps. New values, owner-approved for item 3. Damage runs through scaleMonster, the one
 * curve: a trap hits like a trash foe of base attack 5 at the floor's fight level.
 * Seconds: a spike cycle is 2.4 s; tips show for 0.25 s (two frames) before 0.5 s up.
 * A plate marks a circle of radius 20 for 0.5 s, the mini mark, then rearms after 2.5 s.
 */
export const TRAPS = {
  atk: 5,
  spikeCycle: 2.4,
  spikeDown: 1.5,
  spikeTell: 0.25,
  spikeUp: 0.5,
  plateTell: 0.5,
  plateRadius: 20,
  plateRearm: 2.5,
} as const;

/** A trap's attack at fight level L: round(5 * (0.70 + L * 0.06)). */
export function trapAtk(level: number): number {
  return scaleMonster({ id: "trap", name: "Trap", family: "trap", tint: "#140c10", hp: 1, atk: TRAPS.atk, ac: 0, xp: 0, silver: 0 }, level).atk;
}

/**
 * Floor curses (item 5) and the escort/rescue quest (item 6). Owner-approved list. These are the
 * only new numbers those two features use; nothing above was changed for them.
 * Curses: a run (enter a site, climb back out) draws at most one, seeded by the site and the
 * day-night cycle it was entered on. Never on a boss floor. Damage reuses the trap curve (trapAtk).
 * Rescue: one captive per listed site, on a seeded floor that is never the first or the boss floor.
 */
export const RUNS = {
  /** Share of runs that draw a curse. Half stay plain, so a curse reads as a twist and not a tax. */
  curseChance: 0.5,
  /** Lightless: lamp light in native px. Four tiles, inside the law's 3-5 tile off-hand light. */
  darkRadius: 64,
  /** Lightless: one dithered shade step at the edge of the light, in px. Never a blur. */
  darkEdge: 6,
  /** Ashen: seconds of ground mark before a fallen foe bursts. The mini mark and the plate tell. */
  ashTell: 0.5,
  /** Ashen: burst circle in px. Above brawler stand-off (16) so a melee kill is inside it; well under the 37 px a walk covers in 0.5 s. */
  ashRadius: 24,
  /** Extra silver on a cursed floor, percent of the foe's silver, dropped as a second pile. */
  bonus: { dark: 40, dry: 50, ash: 60 },
  /** Rescue: reach to break a chain, px. The same reach as a secret or a talk. */
  captiveReach: 24,
  /** Rescue: the freed captive walks this far behind your facing. The companion keeps 18, so they never stack. */
  escortBack: 30,
  /** Rescue: trail speed in px/s. The companion's own trail speed. */
  escortSpeed: 70,
  /** Rescue: past this many px (half a 4x screen) a lost captive steps up behind you, out of sight. */
  escortSnap: 160,
} as const;

export type CurseId = "dark" | "dry" | "ash";
export const CURSES: Record<CurseId, { name: string; line: string }> = {
  dark: { name: "Lightless", line: "The dark eats all but your lamp." },
  dry: { name: "Corked", line: "No draught will open on this floor." },
  ash: { name: "Ashen", line: "The dead burst into ash. Step out of the mark." },
};

/**
 * Townsfolk held below. Free one, lead them up the first stair (or through a town gate), and their
 * shop stocks the item from then on. body is a people.png role; seed picks one of that role's crowd
 * looks, never the look the shop's own keeper wears. The items copy stat lines already sold in town.
 */
export type Rescue = { id: string; name: string; dungeon: string; body: string; seed: string; shop: string; item: Omit<Item, "uid">; plea: string; home: string };
export const RESCUES: Rescue[] = [
  {
    id: "wren",
    name: "Wren",
    dungeon: "harrow",
    body: "shop",
    seed: "captive-wren-1",
    shop: "shop",
    item: { name: "Wren's Lamp", kind: "weapon", rank: 2, slot: "off", hands: 1, atk: 2, active: "Lantern Flare", bonus: 1 },
    plea: "Wren, from the general store. They chained me for the dark. Get me up the stairs.",
    home: "Wren runs for the general store. It stocks Wren's Lamp now.",
  },
  {
    id: "tansy",
    name: "Tansy",
    dungeon: "ossuary",
    body: "alchemist",
    seed: "captive-tansy",
    shop: "alchemist",
    item: { name: "Tansy's Locket", kind: "jewel", rank: 3, slot: "neck", bonus: 1, aura: "Ward", ac: 1 },
    plea: "Tansy. Madam Yarrow's girl. The bones sing at night. Take me home.",
    home: "Tansy is back at the cauldron. Yarrow sells Tansy's Locket now.",
  },
  {
    id: "corin",
    name: "Corin",
    dungeon: "wraps",
    body: "patron",
    seed: "captive-corin",
    shop: "hunter",
    item: { name: "Corin's Silvered Edge", kind: "weapon", rank: 3, slot: "main" },
    plea: "Corin. I carry for the hunter. The wraps took me for a tithe. Walk me out.",
    home: "Corin is home. The hunter's cabinet keeps Corin's Silvered Edge now.",
  },
];

/**
 * Mimic chests (item 4). OWNER-APPROVED EXCEPTION 2026-09-30: the mimic is a 13th family beyond the
 * roster's 12, and the one solo rare (no pack affix, no minions). It is not in FAMILIES, so no wild,
 * night, or floor-roamer pick can ever draw it; it only wakes from a dungeon chest.
 * Base numbers sit inside the twelve families' spread (HP 6-22, ATK 3-7, AC 0-3); silver is a chest's.
 */
export const MIMIC_DEF: MonsterDef = { id: "mimic", name: "Mimic", family: "mimic", tint: "#c4a050", hp: 16, atk: 6, ac: 2, xp: 14, silver: 12 };

/** Mimic tuning. The one block for item 4's new numbers. */
export const MIMICS = {
  /** Share of eligible floors whose plain chest is a mimic. About one floor in seven. */
  chance: 0.15,
  /** Rare level step and HP share: the roster's Stalker numbers, the only rare curve the law gives. */
  levelUp: 2,
  hpMult: 1.45,
  /** The bite lunge: px the mimic jumps toward its mark as the bite lands. Under a tile and a half. */
  lunge: 20,
  /** Chest drops a slain mimic leaves, from the chest table, plus one from the rare table (law: rare = table 2). */
  chestDrops: 2,
  rareDrops: 1,
  /**
   * OWNER-APPROVED COMBAT CHANGE 2026-09-30: the bite is the existing "line" shape (18 px mark, 16 px
   * band), swept from where the mimic stood to its mark. A sidestep of a tile clears it in the 0.35 s tell.
   */
  biteTag: "line",
  /** Sleeping tell (owner-approved): every hintEvery s a dormant mimic's lid lifts 1 px for hintFor s, a tooth glinting mid-breath. */
  hintEvery: 5,
  hintFor: 0.6,
} as const;

/** Sleeping-mimic hint cell at time t (s) for the chest at (x,y): -1 none, 0 lid up, 1 lid up with a tooth glint. Pure. */
export function mimicHint(t: number, x: number, y: number): number {
  const phase = (((t + ((x * 7 + y * 13) % 10) * 0.37) % MIMICS.hintEvery) + MIMICS.hintEvery) % MIMICS.hintEvery;
  if (phase >= MIMICS.hintFor) return -1;
  return phase > MIMICS.hintFor * 0.3 && phase < MIMICS.hintFor * 0.7 ? 1 : 0;
}

/**
 * Rescue follow-up (owner-approved 2026-09-30). A freed captive stands in town, gives one errand on
 * existing systems, and once it is done keeps a small stall of their own. Spots are open grass; no
 * town tile changes. State rides in the opened list: rq:<id>:taken, rq:<id>:kills:<n>, rq:<id>:done.
 * Stall stat lines are copies of stock already sold in town; prices come from the existing priceOf.
 */
export type RescueQuest = { id: string; x: number; y: number; stall: string; kind: "kill" | "fetch" | "deliver"; site?: string; need?: number; token?: string; to?: string; ask: string; nag: string; thanks: string; open: string };
export const RESCUE_QUESTS: RescueQuest[] = [
  {
    id: "wren",
    // Moved 2026-09-30 off the one-tile lane on row 7 into the open strip east of it (blocks no path).
    x: 19,
    y: 8,
    stall: "Wren's Lamps",
    kind: "kill",
    site: "harrow",
    need: 5,
    ask: "The manor's dark still crawls where they kept me. Put down five things on any Harrow floor and I will open a stall.",
    nag: "Harrow still crawls.",
    thanks: "Five fewer. I can sleep. The stall is open, and the lamps are trimmed.",
    open: "Lamps and a road blade. Light first, then steel.",
  },
  {
    id: "tansy",
    x: 25,
    y: 20,
    stall: "Tansy's Simples",
    kind: "fetch",
    ask: "Yarrow lost a stone to the bones. Bring me any gem, cut or rough, and I will brew for you myself.",
    nag: "Any gem. The bones keep them.",
    thanks: "That will hold a draught. My simples are yours to buy.",
    open: "Draughts, a ring, a stone when the day allows.",
  },
  {
    id: "corin",
    // Moved 2026-09-30 off the one-tile lane on row 7 into the open strip west of it (blocks no path).
    x: 9,
    y: 8,
    stall: "Corin's Pack",
    kind: "deliver",
    token: "Corin's sealed tithe",
    to: "undertaker",
    ask: "The wraps took me for a tithe. Carry this seal to the undertaker so they stop counting me among the dead.",
    nag: "The undertaker has not seen my seal.",
    thanks: "Counted among the living again. The hunter lets me sell what I carry.",
    open: "Steel and a coat, off the hunter's own rack.",
  },
];

/**
 * Escort under attack (owner-approved 2026-09-30). Gentle: a captive at your back is sturdy, foes turn
 * on them only every escortEvery-th swing they get with the captive in reach, and at 0 HP they are
 * knocked down, never killed. Hold Main beside them to help them up. Stairs wait for them.
 */
export const ESCORT = {
  /** HP: base plus per dungeon level. Harrow (L10) 60, Ossuary (L12) 66, Wraps (L22) 96. */
  hpBase: 30,
  hpPerLevel: 3,
  /** One swing in this many, while the captive is close, goes to the captive. */
  escortEvery: 4,
  /** Close: px from the foe. On its turn a foe this near walks over to the captive (they trail 30 px behind you). */
  notice: 56,
  /** Share of max HP a captive stands back up with. */
  upShare: 0.5,
} as const;

/**
 * Night bounty board (item 7). One name per night cycle, posted in the Guildhall. A named Family Stalker
 * (built as a pack, like every rare but the mimic) or a standing world remnant the chapel is not
 * already paying for. The one block for item 7's new numbers.
 */
export const BOUNTY = {
  /** When a world remnant stands, the share of nights the board posts it instead of a stalker. */
  remnantShare: 0.5,
  /** Silver per zone: twice the zone board's first-win pay (8/12/16/20/28), for a pack with a 1.45 HP rare. */
  pay: { "Decayed vale": 16, "Winter hollow": 24, "Dry waste": 32, Cinder: 40, "Scourge swamp": 56 } as Record<string, number>,
  /** A stalker's lair keeps this many tiles off the town gate (64,90), the first distance band (playtest1e: 8 old tiles, 16 now). */
  gateClear: 16,
  /** And this many tiles off a world boss, a dungeon mouth, the town gate tile, and a road merchant or watch. */
  lairClear: 4,
  /** The guild board tile in the Guildhall: the north wall, left of the trainer. Hold Main below it to read. */
  boardX: 5,
  boardY: 0,
  /** Names the guild gives a stalker. Seeded per night. */
  names: ["Old Gristle", "Mother Hush", "Tallow Tom", "Black Annis", "Gallows Jack", "the Widow's Dog", "Lantern Meg", "Pale Wick"],
} as const;

/** Risen that stand with a boss. One at low level, six past level 80. */
export function helperCount(level: number): number {
  if (level <= 15) return 1;
  if (level <= 30) return 2;
  if (level <= 45) return 3;
  if (level <= 60) return 4;
  if (level <= 80) return 5;
  return 6;
}

/** Stable noise in 0..1. Same inputs always match, so grass flecks and lightning do not flicker. */
export function hash(x: number, y: number, n = 1): number {
  const v = Math.sin(x * 127.1 + y * 311.7 + n * 74.7) * 43758.5453;
  return v - Math.floor(v);
}

/** Seeded RNG for one dungeon floor. Call it in a fixed order or the rooms shift. */
export function mulberry(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}
