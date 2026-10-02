/**
 * playtest1b (owner-requested 2026-10-02 00:52 ET, batch B1 "looks"): name labels, shop signs and the town icon.
 *
 * Bill's "gloom and glow": dark scenes full of glowing things, his signature glows neon blue cold fire (top pick),
 * violet neon and red neon. All the art is the pixel writer's (tools/pixel-writer/glow_writer.py, palette v3: the
 * locked set plus four neon tubes); this file only places it. Picture only: nothing here moves, collides or saves.
 */
import type { RGB } from "./light";

export const FONT_SHEET = "/art/writer/font-small.png";
export const SIGN_SHEET = "/art/writer/town-signs.png";
export const SIGN_EM = "/art/writer/town-signs_em.png";
export const TOWN_ICON = "/art/writer/town-icon.png";
export const TOWN_ICON_EM = "/art/writer/town-icon_em.png";
export const TOWN_MAP_ICON = "/art/writer/town-map-icon.png";
export const CAMP_ICON = "/art/writer/camp-icon.png";
export const PORTRAITS = "/art/sprites/portraits.png";
/** playtest1b B2 (owner-requested 2026-10-02): the camp and the room interiors, hearth writer (palette v3). */
export const CAMP_TENT = "/art/writer/camp-tent.png";
export const CAMP_TENT_EM = "/art/writer/camp-tent_em.png";
export const CAMP_FIRE = "/art/writer/camp-fire.png";
export const CAMP_FIRE_EM = "/art/writer/camp-fire_em.png";
export const CAMP_GEAR = "/art/writer/camp-gear.png";
export const CAMP_GEAR_EM = "/art/writer/camp-gear_em.png";
export const ROOM_WALL = "/art/writer/room-wall.png";
export const ROOM_WALL_EM = "/art/writer/room-wall_em.png";
export const ROOM_KIT = "/art/writer/room-kit.png";
export const ROOM_KIT_EM = "/art/writer/room-kit_em.png";
export const ROOM_RUG = "/art/writer/room-rug.png";
export const ROOM_BOARDS = "/art/writer/room-boards.png";
export const HEARTH_SHEETS = [CAMP_TENT, CAMP_TENT_EM, CAMP_FIRE, CAMP_FIRE_EM, CAMP_GEAR, CAMP_GEAR_EM, ROOM_WALL, ROOM_WALL_EM, ROOM_KIT, ROOM_KIT_EM, ROOM_RUG, ROOM_BOARDS];
/** Cell order in camp-gear.png (then the lantern's and the mark's second frames at 7 and 8). */
export const GEAR = { seat: 0, bedroll: 1, pack: 2, lantern: 3, caps: 4, stones: 5, mark: 6, lantern2: 7, mark2: 8 } as const;
/** Cell order in room-wall.png (then the sconce's second frame at 6) and room-kit.png (32px cells; the stove's second frame at 5). */
export const ROOM_CELL = { plain: 0, window: 1, sconce: 2, shelf: 3, side: 4, door: 5, sconce2: 6 } as const;
export const KIT_CELL = { bed: 0, table: 1, dresser: 2, plant: 3, stove: 4, stove2: 5 } as const;
/**
 * The camp's fixed dressing (looks only; the camp grid is the same every time): where each piece stands, by tile.
 * The tent stands on its footprint (3..7, 2..5) and the fire on the hearth tile; these sit around them.
 */
export const CAMP_DRESS: { x: number; y: number; cell: number; lit?: boolean }[] = [
  { x: 9, y: 7, cell: GEAR.seat },
  { x: 11, y: 9, cell: GEAR.seat },
  { x: 9, y: 9, cell: GEAR.bedroll },
  { x: 6, y: 6, cell: GEAR.pack },
  { x: 12, y: 5, cell: GEAR.lantern, lit: true },
  { x: 3, y: 7, cell: GEAR.lantern, lit: true },
];
/** A room's furnishings by kind: the kit cell and its top-left pixel. Looks only, on the spots the old painted shapes held. */
export const ROOM_DRESS: Record<string, { cell: number; x: number; y: number; lit?: { x: number; y: number } }[]> = {
  cottage: [
    { cell: KIT_CELL.bed, x: 32, y: 26 },
    { cell: KIT_CELL.table, x: 120, y: 32, lit: { x: 135, y: 39 } },
    { cell: KIT_CELL.dresser, x: 176, y: 0 },
    { cell: KIT_CELL.stove, x: 64, y: 2, lit: { x: 80, y: 22 } },
    { cell: KIT_CELL.plant, x: 152, y: 90 },
  ],
  inn: [{ cell: KIT_CELL.bed, x: 32, y: 26 }],
};
export const LOOKS_SHEETS = [FONT_SHEET, SIGN_SHEET, SIGN_EM, TOWN_ICON, TOWN_ICON_EM, TOWN_MAP_ICON, CAMP_ICON, PORTRAITS];

/** The font's character order and colour rows (glow_writer.py FONT_CHARS / FONT_ROWS). Glyphs are 3x5 in 4x6 cells. */
export const FONT_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789 '.,-!?&";
export const FONT_ROW = { bone: 0, blue: 1, violet: 2, red: 3, ink: 4, gold: 5 } as const;
export type FontRow = keyof typeof FONT_ROW;

/** Sign order on town-signs.png (two frames each) and each trade's glow. */
export const SIGN_KINDS = ["inn", "shop", "guild", "bank", "cottage", "chapel", "casino", "smith", "fisher", "croft", "tailor", "alchemy", "mystic"] as const;
export const SIGN_GLOW: Record<string, "blue" | "violet" | "red"> = { inn: "blue", shop: "violet", guild: "red", bank: "blue", cottage: "violet", chapel: "blue", casino: "red", smith: "red", fisher: "blue", croft: "violet", tailor: "violet", alchemy: "blue", mystic: "violet" };
/** The three signature glows as light-layer colours (light buffer only, never painted). */
export const NEON_LIGHT: Record<"blue" | "violet" | "red", RGB> = { blue: [0.3, 0.72, 1], violet: [0.69, 0.48, 1], red: [1, 0.23, 0.31] };

/** Name labels: who shows one, and how near (tiles) a townsperson must be. Bosses always show. */
export const LABEL = { near: 6, lift: 31 } as const;
/** Trades: a townsperson who sells or serves wears a cold-blue name; everyone else is bone. */
export const TRADE_ROLES: ReadonlySet<string> = new Set(["inn", "shop", "guild", "bank", "casino", "smith", "tailor", "fisher", "merchant", "alchemist", "portal", "zeppelin", "mystic", "undertaker"]);

const art: Record<string, HTMLImageElement> = {};
function img(url: string): HTMLImageElement | null {
  if (typeof Image === "undefined") return null;
  let im = art[url];
  if (!im) {
    im = new Image();
    im.src = url;
    art[url] = im;
  }
  return im.complete && im.naturalWidth > 0 ? im : null;
}
// Up front, so a sign or a name never pops in a frame late.
if (typeof Image !== "undefined") for (const url of LOOKS_SHEETS) img(url);

/** Upper-cased and cut to what the font draws. */
export function labelText(text: string): string {
  return [...text.toUpperCase()].filter((ch) => FONT_CHARS.includes(ch)).join("");
}

export const labelWidth = (text: string) => labelText(text).length * 4 + 1;

const labelCache = new Map<string, HTMLCanvasElement>();
/** The label as a small canvas: the glyphs in their colour over a 1 px ink outline. Cached per text and colour. */
export function labelCanvas(text: string, row: FontRow): HTMLCanvasElement | null {
  const t = labelText(text);
  const key = `${row}:${t}`;
  const hit = labelCache.get(key);
  if (hit) return hit;
  const font = img(FONT_SHEET);
  if (!font || typeof document === "undefined" || !t) return null;
  const c = document.createElement("canvas");
  c.width = t.length * 4 + 1;
  c.height = 7;
  const x = c.getContext("2d");
  if (!x) return null;
  x.imageSmoothingEnabled = false;
  const blit = (r: number, ox: number, oy: number) => {
    for (let i = 0; i < t.length; i++) {
      const col = FONT_CHARS.indexOf(t[i]);
      x.drawImage(font, col * 4, r * 6, 3, 5, 1 + i * 4 + ox, 1 + oy, 3, 5);
    }
  };
  for (const [ox, oy] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) blit(FONT_ROW.ink, ox, oy);
  blit(FONT_ROW[row], 0, 0);
  labelCache.set(key, c);
  return c;
}

/** A label centred on cx with its bottom at y (world pixels). */
export function drawLabel(ctx: CanvasRenderingContext2D, text: string, cx: number, y: number, row: FontRow): boolean {
  const c = labelCanvas(text, row);
  if (!c) return false;
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(c, Math.round(cx - c.width / 2), Math.round(y - c.height));
  return true;
}

/** Signs flicker on a seeded beat: mostly the steady tube, now and then the bright frame. Never Math.random. */
export function signFrame(frame: number, seed: number): number {
  const beat = Math.floor(frame / 3) + seed * 7;
  return beat % 11 === 0 || beat % 17 === 0 ? 1 : 0;
}

/** A hanging sign: its bracket's root at (x, y), the board below it. em draws the neon mask only (the glow pass). */
export function drawSign(ctx: CanvasRenderingContext2D, kind: string, x: number, y: number, frame: number, seed: number, em = false): boolean {
  const k = SIGN_KINDS.indexOf(kind as (typeof SIGN_KINDS)[number]);
  const sheet = img(em ? SIGN_EM : SIGN_SHEET);
  if (k < 0 || !sheet) return false;
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(sheet, (k * 2 + signFrame(frame, seed)) * 16, 0, 16, 16, Math.round(x), Math.round(y), 16, 16);
  return true;
}

/** Where a building's sign hangs: off the wall right of its door, the board at head height beside the doorway. */
export function signSpot(doorX: number, doorY: number): { x: number; y: number } {
  return { x: doorX * 16 + 13, y: doorY * 16 - 9 };
}

/** The town on the vale: the walled hamlet stands on the vale's town door, centred, its foot on the door's foot. */
export function drawTownIcon(ctx: CanvasRenderingContext2D, tx: number, ty: number, frame: number, em = false): boolean {
  const sheet = img(em ? TOWN_ICON_EM : TOWN_ICON);
  if (!sheet) return false;
  const f = Math.floor(frame / 4) % 7 === 0 ? 1 : 0;
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(sheet, f * 48, 0, 48, 40, tx * 16 + 8 - 24, (ty + 1) * 16 - 40, 48, 40);
  return true;
}

/** The town gate's two lanterns, for the light layer (world pixels). */
export function townIconLamps(tx: number, ty: number): { x: number; y: number }[] {
  const ox = tx * 16 + 8 - 24;
  const oy = (ty + 1) * 16 - 40;
  return [{ x: ox + 16, y: oy + 21 }, { x: ox + 32, y: oy + 21 }];
}

/** The map screen's town: 12x12 at k map pixels each, its foot on the door tile's foot. */
export function drawTownMapIcon(ctx: CanvasRenderingContext2D, cx: number, bottom: number, k: number): boolean {
  const sheet = img(TOWN_MAP_ICON);
  if (!sheet) return false;
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(sheet, 0, 0, 12, 12, Math.round(cx - 6 * k), Math.round(bottom - 12 * k), 12 * k, 12 * k);
  return true;
}
