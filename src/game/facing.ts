/**
 * playtest1o ([OWNER-REQUESTED 2026-10-03 19:49 ET: playtest1o motion, collision and art check]): which way every body
 * faces, and the sheet cell that shows it. Looks only: nothing here moves, collides or saves.
 *
 * Bill (2026-10-03 19:49 ET): "the sprites all interact correctly and walk the right directions? Characters walk and
 * don't float". Before, every strip was a body facing the camera; only the hero turned (mirrored for west), so a
 * townsperson, a companion or a foe walking up the screen or sideways still showed its face, and a cat or a rat
 * walked backwards half the time. The sprite writer now draws every body from behind and from the side
 * (tools/sprite-writer/dirs_writer.py, the -dirs sheets: row 0 back, row 2 side facing right; same columns as the strip).
 *
 * Faces use draw.ts's old numbers: 0 south (front), 1 east, 2 north (back), 3 west (the side view mirrored).
 * The hero faces the way the game says (g.facing, which also aims the swing). Everyone else faces the way they
 * moved since the last frame drawn; a body standing still keeps its facing, a foe in a fight and a townsperson the
 * hero walks up to turn to the hero. Diagonals take the stronger axis, as the hero's own facing does, with a little
 * hold so a path near 45 degrees does not flicker.
 */
export type Face = 0 | 1 | 2 | 3;
const S = "/art/sprites/";
/** Each body strip and its -dirs sheet (back row 0, side row 2 in 16 px rows). */
export const DIRS: Record<string, string> = Object.fromEntries(
  ["people", "allies", "folk-variants", "moves", "foes", "mimic", "krampus", "pumpkin-lord"].map((n) => [`${S}${n}.png`, `${S}${n}-dirs.png`]),
);
/** Glow masks of the -dirs sheets (the same flame and eye colours as foes_em; from behind the eyes are gone). */
export const DIRS_EM: Record<string, string> = Object.fromEntries(["foes", "krampus", "pumpkin-lord"].map((n) => [`${S}${n}-dirs.png`, `${S}${n}-dirs_em.png`]));
export const DIRS_SHEETS: string[] = [...Object.values(DIRS), ...Object.values(DIRS_EM)];
/** Families drawn in profile already, facing right (sprite writer SIDE_NATIVE): they only ever mirror. */
export const SIDE_NATIVE = new Set(["horse", "cat", "rat"]);
/** A move of this many px between two frames turns a body; more than JUMP is a teleport (a door, a load), not a step. */
export const FACE = { move: 0.05, hold: 1.15, jump: 24, near: 40 } as const;

/** The sheet and row a face is drawn from, and whether it is mirrored. */
export function viewOf(face: number): { dirs: boolean; row: number; flip: boolean } {
  if (face === 2) return { dirs: true, row: 0, flip: false };
  if (face === 1) return { dirs: true, row: 2, flip: false };
  if (face === 3) return { dirs: true, row: 2, flip: true };
  return { dirs: false, row: 0, flip: false };
}

/** The face for a step (dx, dy): the stronger axis; near a diagonal the old face holds if it is one of the two. */
export function axisFace(dx: number, dy: number, was: Face = 0): Face {
  const h: Face = dx > 0 ? 1 : 3;
  const v: Face = dy > 0 ? 0 : 2;
  const ax = Math.abs(dx);
  const ay = Math.abs(dy);
  if (ax > ay * FACE.hold) return h;
  if (ay > ax * FACE.hold) return v;
  if (was === h || was === v) return was;
  return ay >= ax ? v : h; // an exact diagonal goes up or down, as the hero's own facing does
}

type Mem = { x: number; y: number; f: Face; side: 1 | 3; t: number };
const mem = new WeakMap<object, Mem>();

/**
 * The face of one body this frame (call once per body per frame; the body object is its key). moving: the game's own
 * "the feet moved" flag. look: who it turns to when it stands (null: keeps its face). hold: a shove or stun keeps
 * the face (a foe knocked back does not turn its back on you).
 */
export function faceOf(body: object, x: number, y: number, moving: boolean, look: { x: number; y: number } | null = null, hold = false, t = 0): { face: Face; side: 1 | 3 } {
  let m = mem.get(body);
  if (!m) {
    m = { x, y, f: look ? axisFace(look.x - x, look.y - y) : 0, side: 1, t };
    if (look && look.x < x) m.side = 3;
    mem.set(body, m);
  }
  const dx = x - m.x;
  const dy = y - m.y;
  const far = Math.hypot(dx, dy);
  if (far > FACE.jump) {
    m.x = x;
    m.y = y;
  } else if (!hold && moving && far > FACE.move) {
    m.f = axisFace(dx, dy, m.f);
    m.x = x;
    m.y = y;
  } else if (!hold && !moving && look && Math.hypot(look.x - x, look.y - y) > 1) {
    m.f = axisFace(look.x - x, look.y - y, m.f);
    m.x = x;
    m.y = y;
  } else if (far > FACE.move) {
    m.x = x;
    m.y = y;
  }
  if (m.f === 1) m.side = 1;
  else if (m.f === 3) m.side = 3;
  else if (Math.abs(dx) > FACE.move && moving && !hold) m.side = dx > 0 ? 1 : 3;
  m.t = t;
  return { face: m.f, side: m.side };
}
/** The hero's face from the game's facing letter (the old person() numbers). */
export const heroFace = (f: string): Face => (f === "n" ? 2 : f === "w" ? 3 : f === "e" ? 1 : 0);
/** The nearest of some bodies (a companion mid-swing turns to the closest foe). */
export function nearestOf<T extends { x: number; y: number }>(list: readonly T[], x: number, y: number): T | null {
  let best: T | null = null;
  let d = Infinity;
  for (const b of list) {
    const e = Math.hypot(b.x - x, b.y - y);
    if (e < d) {
      d = e;
      best = b;
    }
  }
  return best;
}
