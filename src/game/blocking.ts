/**
 * playtest1o ([OWNER-REQUESTED 2026-10-03 19:49 ET: playtest1o motion, collision and art check]): the furniture and the
 * yard fences stop bodies where they are drawn.
 *
 * Bill (2026-10-03 19:49 ET): "Characters walk and don't float and have the correct collision? The inside of houses are
 * updated?" Before, the 1i trade furniture (counters, pews, the altar, the anvil, the card table, crates, the rack...),
 * the hearth kit (beds, tables, dressers, stoves, plants) and the town's picket yards were looks only: the hero walked
 * straight through a bed or a fence. Now each piece has a foot (the floor it stands on, in px, cut from its writer cell's
 * opaque box: a piece against the back wall stands from the wall down, a piece out on the floor on its lower band, so a
 * body can still pass behind the top of a table and be hidden by it the way the y-sort draws it). A yard fence stops
 * bodies on its whole tile, with the gate gap left open.
 *
 * Every keeper, the door, the hero's start, the guild board and the croft's slots and chest stay clear, and every room's
 * floor stays one connected piece (group playtest1o checks it).
 */
import { ROOM_FURNITURE, ROOM_KIT_EXTRA, type FurnKind } from "./interiors";
import { ROOM_DRESS } from "./looks";

/** A rectangle of floor, px, end-exclusive. */
export type Box = { x0: number; y0: number; x1: number; y1: number };
/** The opaque box of each 32x32 writer cell (room-furn.png by FURN order, room-kit.png by KIT_CELL), l, t, r, b. */
export const FURN_BOX: Record<FurnKind, [number, number, number, number]> = {
  counter: [0, 9, 32, 32], bookcase: [0, 1, 32, 32], narrow: [7, 1, 25, 32], pew: [0, 8, 32, 30], altar: [2, 7, 30, 32], anvil: [2, 11, 30, 30],
  forge: [1, 0, 31, 32], forge2: [1, 0, 31, 32], cardtable: [0, 11, 32, 31], cauldron: [3, 6, 29, 31], cauldron2: [3, 6, 29, 31], orrery: [3, 4, 30, 32],
  net: [1, 2, 31, 27], crates: [1, 5, 31, 31], potions: [1, 5, 31, 31], inntable: [1, 7, 31, 31], strongbox: [3, 5, 29, 31], mannequin: [9, 7, 30, 32], rack: [2, 3, 30, 31],
};
export const KIT_BOX: Record<number, [number, number, number, number]> = { 0: [0, 3, 32, 32], 1: [0, 5, 32, 30], 2: [3, 2, 29, 32], 3: [10, 6, 22, 20], 4: [2, 1, 30, 32], 5: [2, 1, 30, 32] };
/**
 * The foot: 1 px in from each side and 2 px up from the bottom (the piece's edge line and cast shade, so a body can
 * pass along its front); the lower `band` px of a floor piece; from the wall's foot (y 16) down for a wall piece.
 */
export const FOOT = { inset: 1, bottom: 2, band: 12, wall: 16, wallPiece: 30 } as const;

export function footOf(x: number, y: number, box: readonly [number, number, number, number]): Box {
  const [l, t, r, b] = box;
  const top = y + t;
  const bottom = y + b;
  const againstWall = top <= FOOT.wallPiece;
  const y0 = againstWall ? Math.max(top, FOOT.wall) : Math.max(top, bottom - FOOT.bottom - FOOT.band);
  return { x0: x + l + FOOT.inset, y0, x1: x + r - FOOT.inset, y1: bottom - FOOT.bottom };
}

const roomCache = new Map<string, Box[]>();
/** Every foot in a room: its trade furniture, its kind's hearth kit, and the croft's own bed and stove. */
export function roomFeet(inside: string | null | undefined, theme: string): Box[] {
  const key = `${inside ?? ""}|${theme}`;
  const hit = roomCache.get(key);
  if (hit) return hit;
  const out: Box[] = [];
  for (const p of ROOM_FURNITURE[inside ?? ""] ?? []) out.push(footOf(p.x, p.y, FURN_BOX[p.k]));
  const kind = theme.startsWith("room:") ? theme.slice(5) : "";
  for (const d of [...(ROOM_DRESS[kind] ?? []), ...(ROOM_KIT_EXTRA[inside ?? ""] ?? [])]) {
    const box = KIT_BOX[d.cell];
    if (box) out.push(footOf(d.x, d.y, box));
  }
  roomCache.set(key, out);
  return out;
}
export const inBox = (b: Box, px: number, py: number) => px >= b.x0 && px < b.x1 && py >= b.y0 && py < b.y1;
/** Does a point of floor sit on a piece of furniture? */
export function furnitureAt(inside: string | null | undefined, theme: string, px: number, py: number): boolean {
  for (const b of roomFeet(inside, theme)) if (inBox(b, px, py)) return true;
  return false;
}

/**
 * The town's yard fences: the pieces the town draws (draw.ts yardFences hands this out) and the tiles that stop bodies.
 * Each building is a connected block of wall and door tiles; a home (a cottage, a croft, or a house with no room behind
 * its door) is ringed one tile out on town grass, with the door's gate left open. cell 0 rail, 1 side, 2 gate post.
 * playtest1o: a rail is left out where the ring runs along the face of the next building (the one-tile lane between two
 * rows of houses): fenced, that lane shut the inn's and the shop's doors in (their stoop was a one-tile box) and the fence
 * stood against their front wall. The rail ends in a gate post at each such opening.
 */
export function yardPieces(
  w: number,
  h: number,
  tiles: ArrayLike<number>,
  wall: number,
  door: number,
  grass: number,
  roomAt: (x: number, y: number) => { kind: string } | undefined,
  yardKinds: ReadonlySet<string> = YARD_KINDS,
): { x: number; y: number; cell: number }[] {
  const seen = new Uint8Array(w * h);
  const out: { x: number; y: number; cell: number }[] = [];
  const taken = new Set<number>();
  const solid = (i: number) => tiles[i] === wall || tiles[i] === door;
  type B = { x: number; y: number; w: number; h: number; doorX: number; doorY: number };
  const blds: B[] = [];
  for (let i = 0; i < w * h; i++) {
    if (seen[i] || !solid(i)) continue;
    let x0 = w, y0 = h, x1 = -1, y1 = -1, doorX = -1, doorY = -1;
    const stack = [i];
    seen[i] = 1;
    while (stack.length) {
      const k = stack.pop()!;
      const kx = k % w;
      const ky = (k - kx) / w;
      x0 = Math.min(x0, kx);
      y0 = Math.min(y0, ky);
      x1 = Math.max(x1, kx);
      y1 = Math.max(y1, ky);
      if (tiles[k] === door && doorX < 0) {
        doorX = kx;
        doorY = ky;
      }
      for (const m of [kx > 0 ? k - 1 : -1, kx + 1 < w ? k + 1 : -1, ky > 0 ? k - w : -1, ky + 1 < h ? k + w : -1]) {
        if (m < 0 || seen[m] || !solid(m)) continue;
        seen[m] = 1;
        stack.push(m);
      }
    }
    blds.push({ x: x0, y: y0, w: x1 - x0 + 1, h: y1 - y0 + 1, doorX, doorY });
  }
  const doors: { x: number; y: number; bx: number }[] = [];
  for (const b of blds) for (let ty = b.y; ty < b.y + b.h; ty++) for (let tx = b.x; tx < b.x + b.w; tx++) if (tiles[ty * w + tx] === door && roomAt(tx, ty)) doors.push({ x: tx, y: ty, bx: b.x });
  const built = (tx: number, ty: number) => tx >= 0 && ty >= 0 && tx < w && ty < h && solid(ty * w + tx);
  for (const b of blds) {
    const room = b.doorX >= 0 ? roomAt(b.doorX, b.doorY) : undefined;
    if (room && !yardKinds.has(room.kind)) continue;
    const x0 = b.x - 1, y0 = b.y - 1, x1 = b.x + b.w, y1 = b.y + b.h;
    const southDoor = b.doorY === b.y + b.h - 1;
    const mine = doors.filter((d) => d.bx === b.x && d.y >= b.y && d.y < b.y + b.h);
    const doorGap = (tx: number, ty: number) => (southDoor ? ty === y1 && (tx === b.doorX || mine.some((d) => d.x === tx)) : b.doorX >= 0 && Math.abs(tx - b.doorX) + Math.abs(ty - b.doorY) === 1);
    // the lane along the next building's face stays open (the tile beyond the ring is another building)
    const near = (tx: number, ty: number, dx: number, dy: number) => built(tx + dx, ty + dy) || built(tx + dx + dy, ty + dy + dx) || built(tx + dx - dy, ty + dy - dx);
    const lane = (tx: number, ty: number) => (ty === y0 && near(tx, ty, 0, -1)) || (ty === y1 && near(tx, ty, 0, 1)) || (tx === x0 && near(tx, ty, -1, 0)) || (tx === x1 && near(tx, ty, 1, 0));
    const gap = (tx: number, ty: number) => doorGap(tx, ty) || lane(tx, ty);
    const open = (tx: number, ty: number) => tx >= 0 && ty >= 0 && tx < w && ty < h && tiles[ty * w + tx] === grass;
    for (let ty = y0; ty <= y1; ty++) {
      for (let tx = x0; tx <= x1; tx++) {
        const edge = ty === y0 || ty === y1 || tx === x0 || tx === x1;
        if (!edge || !open(tx, ty) || gap(tx, ty) || taken.has(ty * w + tx)) continue;
        const nextToGap = gap(tx - 1, ty) || gap(tx + 1, ty);
        const side = (tx === x0 || tx === x1) && ty !== y0 && ty !== y1;
        taken.add(ty * w + tx);
        out.push({ x: tx, y: ty, cell: nextToGap ? 2 : side ? 1 : 0 });
      }
    }
  }
  return out;
}
/** The yard fence tiles that stop bodies (every piece the town draws). */
export function yardFenceTiles(...a: Parameters<typeof yardPieces>): Set<number> {
  const w = a[0];
  return new Set(yardPieces(...a).map((p) => p.y * w + p.x));
}
/** Home kinds that keep a fenced yard (draw.ts YARD_KINDS). */
export const YARD_KINDS: ReadonlySet<string> = new Set(["cottage", "croft"]);
