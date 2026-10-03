/**
 * playtest1i ([OWNER-REQUESTED 2026-10-02 19:43 ET: playtest1h art and loading audit], part 2): every building's inside
 * drawn to the finish of its outside. Looks only: no tile, wall, door, NPC spot or collision changes (sim.ts buildRoom
 * keeps every room's grid). Bill (2026-10-02 19:43 ET): "make sure the inside of buildings is up to date and quality of
 * textures as the outside".
 *
 * Art: tools/pixel-writer/interior_writer.py (make_gravewake.playtest1i()), palette v3, hard alpha.
 */

/**
 * Each room's outside style (the town footprint its door is on: the log cabin, or the stone, timber or slate-boarded
 * house the town draw picks for it), so the inside matches the outside. "warm" (the timber house) has no room behind a
 * door today; its floor and wall are drawn for the next one.
 */
export type RoomStyle = "cabin" | "stone" | "slate" | "warm";
export const ROOM_STYLE: Record<string, RoomStyle> = {
  inn: "cabin", shop: "cabin", guild: "cabin", pell: "cabin", ivy: "cabin", chapel: "cabin", casino: "cabin", smith: "cabin", tailor: "cabin", alchemy: "cabin",
  bank: "stone", bram: "stone", mystic: "stone",
  fisher: "slate", noll: "slate", croft: "slate",
};
export const ROOM_STYLES: readonly RoomStyle[] = ["cabin", "stone", "slate", "warm"];
/** A style's signature glow (its sconces, and the light they cast). */
export const STYLE_GLOW: Record<RoomStyle, "blue" | "violet" | "red"> = { cabin: "blue", stone: "violet", slate: "blue", warm: "red" };
export const roomStyle = (id: string | null | undefined): RoomStyle => ROOM_STYLE[id ?? ""] ?? "cabin";

export const roomFloor = (s: RoomStyle) => `/art/writer/room-floor-${s}.png`;
export const roomWall = (s: RoomStyle) => `/art/writer/room-wall-${s}.png`;
export const roomWallEm = (s: RoomStyle) => `/art/writer/room-wall-${s}_em.png`;
export const ROOM_FURN = "/art/writer/room-furn.png";
export const ROOM_FURN_EM = "/art/writer/room-furn_em.png";
export const ROOM_RUGS = "/art/writer/room-rugs.png";
/** The rug's row block in room-rugs.png (two 16 px rows per style). */
export const rugRow = (s: RoomStyle) => ROOM_STYLES.indexOf(s) * 2;

/** Cell order in room-furn.png (32 px cells; forge and cauldron have a second frame). interior_writer.FURN. */
export const FURN = {
  counter: 0, bookcase: 1, narrow: 2, pew: 3, altar: 4, anvil: 5, forge: 6, forge2: 7, cardtable: 8, cauldron: 9, cauldron2: 10,
  orrery: 11, net: 12, crates: 13, potions: 14, inntable: 15, strongbox: 16, mannequin: 17, rack: 18,
} as const;
export type FurnKind = keyof typeof FURN;
/** Pieces with a second frame, and the light each glowing piece casts (pixel offset in its cell, and colour). */
export const FURN_ANIM: Partial<Record<FurnKind, FurnKind>> = { forge: "forge2", cauldron: "cauldron2" };
export const FURN_LIGHT: Partial<Record<FurnKind, { dx: number; dy: number; c: "blue" | "violet" | "red"; big?: boolean }>> = {
  forge: { dx: 16, dy: 20, c: "red", big: true },
  cauldron: { dx: 16, dy: 14, c: "blue", big: true },
  altar: { dx: 16, dy: 10, c: "blue" },
  orrery: { dx: 16, dy: 13, c: "violet" },
  inntable: { dx: 15, dy: 9, c: "red" },
  counter: { dx: 25, dy: 11, c: "blue" },
};

export type Piece = { k: FurnKind; x: number; y: number };
/**
 * Each room's furniture: kind and top-left pixel of its 32x32 cell. The pieces stand on the spots the old painted shapes
 * held (the shelf, hearth, cauldron, moon and net tiles, the smith's forge and anvil, the casino table, the counters),
 * clear of the door (7,10), the hero's start (7,8), every keeper's spot and the guild board (5,0).
 */
export const ROOM_FURNITURE: Record<string, Piece[]> = {
  inn: [{ k: "inntable", x: 120, y: 26 }, { k: "crates", x: 176, y: 120 }],
  shop: [{ k: "bookcase", x: 32, y: 16 }, { k: "bookcase", x: 160, y: 16 }, { k: "potions", x: 80, y: 18 }, { k: "counter", x: 120, y: 58 }],
  guild: [{ k: "bookcase", x: 32, y: 16 }, { k: "bookcase", x: 160, y: 16 }, { k: "counter", x: 120, y: 58 }, { k: "rack", x: 176, y: 104 }],
  bank: [{ k: "bookcase", x: 32, y: 16 }, { k: "bookcase", x: 160, y: 16 }, { k: "strongbox", x: 80, y: 18 }, { k: "counter", x: 120, y: 58 }],
  tailor: [{ k: "bookcase", x: 32, y: 16 }, { k: "bookcase", x: 160, y: 16 }, { k: "mannequin", x: 80, y: 18 }, { k: "counter", x: 120, y: 58 }],
  chapel: [{ k: "altar", x: 104, y: 18 }, { k: "pew", x: 40, y: 66 }, { k: "pew", x: 160, y: 66 }],
  casino: [{ k: "cardtable", x: 104, y: 48 }],
  smith: [{ k: "forge", x: 40, y: 8 }, { k: "anvil", x: 128, y: 40 }, { k: "rack", x: 176, y: 104 }],
  alchemy: [{ k: "narrow", x: 24, y: 16 }, { k: "narrow", x: 168, y: 16 }, { k: "cauldron", x: 104, y: 32 }, { k: "potions", x: 40, y: 64 }],
  mystic: [{ k: "narrow", x: 24, y: 16 }, { k: "narrow", x: 168, y: 16 }, { k: "orrery", x: 104, y: 32 }],
  fisher: [{ k: "net", x: 48, y: 26 }, { k: "net", x: 152, y: 26 }, { k: "crates", x: 176, y: 120 }],
};
export const roomFurniture = (id: string | null | undefined): Piece[] => ROOM_FURNITURE[id ?? ""] ?? [];

/**
 * The croft (the hero's home) had no base furnishings at all, only what you buy (decor.ts) and the chest: a bed and an
 * iron stove from the hearth kit (looks.ts KIT_CELL bed 0, stove 4), clear of every decor slot, the derby trophy and the chest.
 */
export const ROOM_KIT_EXTRA: Record<string, { cell: number; x: number; y: number; lit?: { x: number; y: number } }[]> = {
  croft: [
    { cell: 0, x: 32, y: 26 },
    { cell: 4, x: 64, y: 2, lit: { x: 80, y: 22 } },
  ],
};
export const roomKitExtra = (id: string | null | undefined) => ROOM_KIT_EXTRA[id ?? ""] ?? [];

/** Every sheet the interiors draw, loaded up front with the room art. */
export const INTERIOR_SHEETS: string[] = [
  ...ROOM_STYLES.flatMap((s) => [roomFloor(s), roomWall(s), roomWallEm(s)]),
  ROOM_FURN, ROOM_FURN_EM, ROOM_RUGS,
];
