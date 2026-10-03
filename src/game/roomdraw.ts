/**
 * playtest1n [OWNER-APPROVED 2026-10-03 15:41 ET: use-the-room combat]: painting the room a fight can use. Looks only:
 * nothing in the sim reads this. The props are the room writer's art (tools/pixel-writer/room_writer.py: room-props,
 * its emissive copy, room-fire, room-oil), y-sorted with the actors; the patches lie on the ground; every hazard that is
 * about to land wears a 1j neon mark that fills over its tell (a lantern's landing spot and a powder barrel's blast red,
 * a toppling pillar's lane violet), and a burning patch keeps a red rim. Fire, lit lanterns, fuses and falls cast fight
 * light from a fixed pool (no allocation in a fight), inside light.ts's scene budget like every other light.
 */
import { LIGHTS } from "./light";
import { NEON_LIGHT } from "./looks";
import { MARK_NEON } from "./telegraph";
import { paintTellLane, paintTellMark } from "./fightlights";
import { PROP_CELL, ROOM, ROOM_SHEETS, type RoomProp, type RoomState } from "./room";
import type { RGB } from "./light";

export const ROOM_LIGHT = {
  /** Lamps per frame for the room, at most (its own pool). */
  pool: 10,
  lantern: 40,
  fire: 48,
  fireBig: 64,
  fuse: 32,
  fall: 32,
} as const;

type View = { mapId: string; room: RoomState; fog: ArrayLike<number> | null; w: number; frame: number };
type Box = { x: number; y: number; w: number; h: number };
type Prop = { y: number; fn: () => void; actor?: (c: CanvasRenderingContext2D) => void };
type Glow = (c: CanvasRenderingContext2D) => void;

const sheets: Partial<Record<string, HTMLImageElement>> = {};
function sheet(url: string): HTMLImageElement | null {
  if (typeof Image === "undefined") return null;
  let im = sheets[url];
  if (!im) {
    im = new Image();
    im.src = url;
    sheets[url] = im;
  }
  return im.complete && im.naturalWidth > 0 ? im : null;
}
/** Warm the four sheets as soon as the draw loads, so the first prop never pops in. */
export function warmRoom() {
  for (const u of Object.values(ROOM_SHEETS)) sheet(u);
}
warmRoom();

/** The cell a prop shows now. */
export function propCell(p: RoomProp, falling: boolean): number {
  if (p.kind === "lantern") return p.done ? PROP_CELL.lanternBare : PROP_CELL.lantern;
  if (p.kind === "oil") return p.done ? PROP_CELL.staves : PROP_CELL.oil;
  if (p.kind === "powder") return p.done ? PROP_CELL.staves : PROP_CELL.powder;
  if (p.done) return falling ? PROP_CELL.pillarLow : PROP_CELL.rubble;
  return p.hp <= 1 ? PROP_CELL.pillarLow : PROP_CELL.pillar;
}

function cell(ctx: CanvasRenderingContext2D, url: string, col: number, dx: number, dy: number, cw = 16, ch = 32, sx = 0, sy = 0, sw = cw, sh = ch) {
  const im = sheet(url);
  if (!im) return false;
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(im, col * cw + sx, sy, sw, sh, Math.round(dx), Math.round(dy), sw, sh);
  return true;
}

const unseen = (v: View, x: number, y: number) => !!v.fog && v.fog[y * v.w + x] === 0;
const near = (b: Box, x: number, y: number, pad: number) => x > b.x - pad && x < b.x + b.w + pad && y > b.y - pad && y < b.y + b.h + pad;

/** A patch's art, stretched to its radius (the writer's 32x16 cell is a 14x6 ellipse at r = 14). */
function patchArt(ctx: CanvasRenderingContext2D, kind: "fire" | "oil", x: number, y: number, r: number, frame: number, fade: number) {
  const url = kind === "fire" ? ROOM_SHEETS.fire : ROOM_SHEETS.oil;
  const im = sheet(url);
  if (!im) return;
  const w = Math.round((r * 32) / 14);
  const h = Math.round(w / 2);
  const f = kind === "fire" ? Math.floor(frame / 6) % 4 : 0;
  ctx.imageSmoothingEnabled = false;
  const a = ctx.globalAlpha;
  ctx.globalAlpha = a * Math.max(0.25, Math.min(1, fade));
  ctx.drawImage(im, f * 32, 0, 32, 16, Math.round(x - w / 2), Math.round(y - (h * 9) / 16), w, h);
  ctx.globalAlpha = a;
}

/** The marks of everything about to land (and the rims of burning patches). white paints the light mask. */
function marks(ctx: CanvasRenderingContext2D, v: View, white: boolean, rimOnly: boolean) {
  const red = white ? "#ffffff" : MARK_NEON.big;
  const violet = white ? "#ffffff" : MARK_NEON.mid;
  for (const d of v.room.drops) paintTellMark(ctx, d.x, d.y, ROOM.fireR, red, 1 - d.tell / d.max, rimOnly);
  for (const p of v.room.props) if (p.kind === "powder" && p.fuse > 0) paintTellMark(ctx, p.x * 16 + 8, p.y * 16 + 10, ROOM.blastR, red, 1 - p.fuse / ROOM.fuse, rimOnly);
  for (const f of v.room.falls) paintTellLane(ctx, f.x, f.y, f.x + f.dx * ROOM.fallLen, f.y + f.dy * ROOM.fallLen, ROOM.fallHalf, violet, 1 - f.tell / f.max, rimOnly);
  for (const pa of v.room.patches) if (pa.kind === "fire" && pa.life > 0) paintTellMark(ctx, pa.x, pa.y, pa.r, red, 0, true);
}

/**
 * The room in the world pass, below ground only: the patches and marks are painted now (on the ground, under the
 * actors); each prop joins the y-sorted props; flames, fuses, fire and the marks join the glow (full light).
 */
export function roomScene(ctx: CanvasRenderingContext2D, v: View, props: Prop[], glow: Glow[], box: Box) {
  if (v.mapId !== "dungeon") return;
  const room = v.room;
  for (const pa of room.patches) {
    if (pa.life <= 0 || !near(box, pa.x, pa.y, pa.r + 8)) continue;
    patchArt(ctx, pa.kind, pa.x, pa.y, pa.r, v.frame + Math.floor(pa.x), pa.kind === "fire" ? pa.life / 0.6 : pa.life / 1.5);
  }
  marks(ctx, v, false, false);
  room.props.forEach((p, k) => {
    if (unseen(v, p.x, p.y) || !near(box, p.x * 16 + 8, p.y * 16, 40)) return;
    const fall = room.falls.find((f) => f.k === k);
    const c = propCell(p, !!fall);
    let dx = p.x * 16;
    let dy = p.y * 16 - 16;
    if (fall) {
      const t = 1 - fall.tell / fall.max;
      dx += Math.round(fall.dx * t * t * 10);
      dy += Math.round(fall.dy * t * t * 6 + t * t * 4);
    } else if (p.kind === "powder" && p.fuse > 0 && Math.floor(v.frame / 3) % 2) dx += 1;
    const draw = (cx: CanvasRenderingContext2D) => cell(cx, ROOM_SHEETS.props, c, dx, dy);
    props.push({ y: (p.y + 1) * 16 - 1, fn: () => draw(ctx), actor: (cx) => draw(cx) });
    if (c === PROP_CELL.lantern || c === PROP_CELL.powder) glow.push((cx) => cell(cx, ROOM_SHEETS.glow, c, dx, dy));
  });
  // A lantern on its way down: its cage (the writer's lit cell, cropped) falls from the hook to its mark.
  for (const d of room.drops) {
    const t = 1 - d.tell / d.max;
    const hx = d.x;
    const hy = d.y - 26 + t * t * 26;
    const draw = (cx: CanvasRenderingContext2D) => cell(cx, ROOM_SHEETS.props, PROP_CELL.lantern, hx - 3, hy - 8, 16, 32, 8, 7, 7, 10);
    props.push({ y: d.y, fn: () => draw(ctx), actor: draw });
    glow.push((cx) => cell(cx, ROOM_SHEETS.glow, PROP_CELL.lantern, hx - 3, hy - 8, 16, 32, 8, 7, 7, 10));
  }
  glow.push((cx) => {
    for (const pa of room.patches) if (pa.kind === "fire" && pa.life > 0 && near(box, pa.x, pa.y, pa.r + 8)) patchArt(cx, "fire", pa.x, pa.y, pa.r, v.frame + Math.floor(pa.x), 1);
    marks(cx, v, true, false);
  });
}

/** Over the Lightless curse's dark: just the rims and leading edges, so a hazard always reads. */
export function roomRims(ctx: CanvasRenderingContext2D, v: View) {
  if (v.mapId === "dungeon") marks(ctx, v, false, true);
}

type Lamp = { x: number; y: number; r: number; c: RGB; seed: number; flick: boolean };
const pool: Lamp[] = Array.from({ length: ROOM_LIGHT.pool }, () => ({ x: 0, y: 0, r: 24, c: NEON_LIGHT.red, seed: 0, flick: false }));
/** The pool itself (the check reads it: the same objects every frame). */
export function roomPool(): readonly Lamp[] {
  return pool;
}

/** The room's lights from the pool: fire patches, fuses and falls first (they are what must read), then lit lanterns
 * on explored floor. Pushed onto out; the scene's budget trims the lot, nearest first. */
export function roomLights(v: View, out: Lamp[]): number {
  if (v.mapId !== "dungeon") return 0;
  let used = 0;
  const lamp = (x: number, y: number, r: number, c: RGB, flick: boolean, seed: number) => {
    if (used >= pool.length) return;
    const l = pool[used++];
    l.x = Math.round(x);
    l.y = Math.round(y);
    l.r = r;
    l.c = c;
    l.flick = flick;
    l.seed = seed & 3;
    out.push(l);
  };
  const room = v.room;
  for (const pa of room.patches) if (pa.kind === "fire" && pa.life > 0) lamp(pa.x, pa.y - 4, pa.r > ROOM.fireR ? ROOM_LIGHT.fireBig : ROOM_LIGHT.fire, NEON_LIGHT.red, true, Math.floor(pa.x));
  for (const p of room.props) if (p.kind === "powder" && p.fuse > 0) lamp(p.x * 16 + 8, p.y * 16 - 4, ROOM_LIGHT.fuse + (1 - p.fuse / ROOM.fuse) * 24, NEON_LIGHT.red, true, 1);
  for (const f of room.falls) lamp(f.x + f.dx * ROOM.fallLen * 0.5, f.y + f.dy * ROOM.fallLen * 0.5, ROOM_LIGHT.fall, NEON_LIGHT.violet, false, 2);
  for (const d of room.drops) lamp(d.x, d.y - 8, ROOM_LIGHT.lantern, LIGHTS.torch, true, 3);
  for (const p of room.props) if (p.kind === "lantern" && !p.done && !unseen(v, p.x, p.y)) lamp(p.x * 16 + 11, p.y * 16 - 4, ROOM_LIGHT.lantern, NEON_LIGHT.red, true, p.x);
  return used;
}
