/**
 * Wake batch (2026-10-21): the four mini-bosses' homes and sheets, the ending's dungeon and its lord.
 * Placement is seeded (fixed floors), never Math.random.
 */

/** Each mini guards the middle floor of the dungeons in its XP gap (12-22, 34-44, 48-62). */
export const WAKE_MINI_AT: Record<string, string> = {
  ossuary: "wraithknight", // L12
  wraps: "wraithknight", // L22
  warren: "frostgolem", // L34
  chapel: "frostgolem", // L44
  vesper: "vampirelord", // L48
  drowned: "stormelemental", // L62
};
export function wakeMiniFloor(floors: number): number {
  return Math.max(1, Math.ceil(floors / 2));
}

/** Art's mini sheets: one row of 6 frames (idle0, idle1, wind-up, attack, hit, hurt), anchored bottom centre. */
export const WAKE_SHEETS: Record<string, { url: string; em: string; w: number; h: number; k?: number }> = {
  // wake leftovers: the Bellringer, Hollowmourn's remnant (bellringer_writer.py, 16x32 drawn whole-pixel x3)
  hollowmourn: { url: "/art/writer/bellringer.png", em: "/art/writer/bellringer_em.png", w: 16, h: 32, k: 3 },
  wraithknight: { url: "/art/writer/wraith_knight.png", em: "/art/writer/wraith_knight_em.png", w: 32, h: 64 },
  vampirelord: { url: "/art/writer/vampire_lord.png", em: "/art/writer/vampire_lord_em.png", w: 32, h: 64 },
  frostgolem: { url: "/art/writer/frost_golem.png", em: "/art/writer/frost_golem_em.png", w: 48, h: 64 },
  stormelemental: { url: "/art/writer/storm_elemental.png", em: "/art/writer/storm_elemental_em.png", w: 48, h: 64 },
};

// ---- The ending (design/ending.md) ----
/** [OWNER-APPROVED 2026-10-21: Hollowmourn only, three phases at 66%/33%; every other boss keeps the 50% rule] */
export const WAKE_PHASES = [0.66, 0.33];
/** The scripted Last Toll at 5% HP: 4 s unkillable, a 1.2 s whole-arena ring that only Smite breaks. */
export const WAKE_LAST = 0.05;
/** His big move by phase and count: P1 The Toll; P2 The Procession and The Toll in turn; P3 Toll, Lights Out, Procession. */
export function wakeBig(phase: number, n: number): { name: string; tag: string } {
  const toll = { name: "The Toll", tag: "ring" };
  const proc = { name: "The Procession", tag: "line" };
  const dark = { name: "Lights Out", tag: "dark" };
  if (phase <= 1) return toll;
  if (phase === 2) return n % 2 ? proc : toll;
  return [toll, dark, proc][n % 3];
}
/** Art's Hollowmourn sheets (96x176 frames, bottom-centre anchor), one per phase; columns in staging README. */
export const WAKE_LORD_SHEETS = [1, 2, 3].map((p) => ({ url: `/art/writer/hollowmourn_p${p}.png`, em: `/art/writer/hollowmourn_p${p}_em.png`, w: 96, h: 176 }));
export function wakeLordCol(r: { casting?: string; big?: string; tell?: number; pattern?: string; flash?: number; staggered?: boolean; actFor?: number; lastToll?: number }, frame: number, phase: number): number {
  if (r.pattern === "lasttoll" || (r.lastToll ?? 0) > 0) return phase >= 3 ? 10 : 6;
  if (r.staggered || (r.flash ?? 0) > 0.06) return 5;
  if (r.casting === "big") {
    if (r.big === "Lights Out" && phase >= 3) return 9;
    if (r.big === "The Procession" && phase >= 2) return 8;
    return (r.tell ?? 0) > 0.15 ? 6 : 7;
  }
  if (r.casting === "mid") return phase >= 2 ? 8 : 2;
  if ((r.actFor ?? 0) > 0) return (r.actFor ?? 0) > 0.2 ? 2 : (r.actFor ?? 0) > 0.1 ? 3 : 4;
  return Math.floor(frame / 10) % 2;
}

/** The eight epilogue scenes (6), then the credits, then the world (post-game). */
export function epilogue(cls: string, companion: string | null): { title: string; lines: string[] }[] {
  const cl: Record<string, string> = {
    vampire: "Someone has left a lamp lit on your doorstep, the first one ever. The town knows your face. Tonight, they left the light on for it.",
    wizard: "Your deathbolt tome falls open to a blank page, and the ink writes \"rest\" by itself.",
    assassin: "Your knives hang on the wall, and you sleep through the night with the window open.",
    warrior: "Your plate sits on its stand and you sit beside it in your shirt, hearing the night with no bell in it.",
  };
  return [
    { title: "The stair up", lines: ["Blackroot's dead trees have one green bud each. The bone car waits at the top, its skull lamps still neon blue.", "It's quiet out here. You've never heard it this quiet."] },
    { title: "Town at dusk", lines: ["For the first time no bell rings at nightfall. The townsfolk stand in their doorways, listening.", "Mara: \"Is it over?\"  Bram: \"Something is. Kettle's on, either way.\""] },
    { title: "The graveyard", lines: ["The dead don't rise tonight. A few ghosts sit up on their graves anyway, looking at the stars. One waves.", "Some of them stayed. Not because they were called. Because they like it here."] },
    { title: "The inn", lines: ["Pell plays the violin, Ivy dances badly on purpose, and Noll pretends not to cry at a song. Lute paints the Wake Bell from memory on the wall.", `${companion ?? "Mara"}: "You're allowed to rest too, you know."`] },
    { title: "Home", lines: [cl[cls] ?? cl.warrior] },
    { title: "The remnants", lines: ["Out in the vale the old bosses' remnants still walk some nights, but they're slower, and a few stop at the edge of town to look at the lights.", "They don't know who to mourn for now."] },
    { title: "Festival morning", lines: ["Seasons go on: the pumpkins come up, Krampus still sulks in winter, the casino still cheats (a little).", "Gravewake still wakes. It just isn't called any more."] },
    { title: "The End", lines: ["The cracked Wake Bell under Blackroot, roots growing round it, a single glow orb resting on it like a candle.", "The End. The night goes on."] },
  ];
}

// ---- Wake leftovers [OWNER-APPROVED 2026-10-21 20:43 ET]: the Wake Hall and his three moves (design/ending.md 2.2-3.3) ----
/** The Wake Hall: a 20x20 round crypt (tiles 2..21 x 3..22) on a 24x25 floor; the stair up comes in from the south. */
export const HALL = { x: 2, y: 3, w: 20, h: 20, cx: 12, cy: 13 } as const;
export const HALL_MAP = { w: 24, h: 25, up: { x: 6, y: 23 } } as const;
/** Four cold-fire braziers at the compass points (1 tile each, solid; their sprite is 16x32). */
export const BRAZIERS = [{ x: 11, y: 4 }, { x: 20, y: 12 }, { x: 11, y: 21 }, { x: 3, y: 12 }];
/** Eight open graves (2x1 tiles each, walls once open) in a ring 6 tiles from the middle; the lanes between are open. */
export const GRAVES = Array.from({ length: 8 }, (_, k) => {
  const a = (k * Math.PI) / 4 + Math.PI / 8;
  return { x: Math.round(HALL.cx + 6 * Math.cos(a) - 1), y: Math.round(HALL.cy + 6 * Math.sin(a) - 0.5), a };
});
/** The stained-glass windows along the north wall: one per story boss, lit once he is beaten (unbeaten: dark panes). */
export const WINDOWS = ["lanternking", "horseman", "dracula", "witchboss", "rootwidow", "wolfman", "queen", "tzar", "leech"].map((id, i) => ({ id, x: 3 + i * 2 }));
/** The three big moves' numbers (doc 3.1-3.3). */
export const TOLL = { gaps: [24, 72, 120], half: 8, step: 350, gapHalfAngle: Math.atan2(16, 96) };
export const PROC = { lanes: 4, laneH: 32, speed: 120, coffinW: 32, coffinH: 24 };
export const ORBS = { n: 3, light: 28, speed: 20, reach: 102 };

/** The Wake Hall's tiles: rock all round, the 20x20 hall, a short way in from the south with the stair up. */
export function carveWakeHall(T: { wall: number; floor: number; stairU: number }): { tiles: Uint8Array; w: number; h: number; fog: Uint8Array; hall: { x: number; y: number; w: number; h: number } } {
  const { w, h } = HALL_MAP;
  const tiles = new Uint8Array(w * h).fill(T.wall);
  for (let y = HALL.y; y < HALL.y + HALL.h; y++) for (let x = HALL.x; x < HALL.x + HALL.w; x++) tiles[y * w + x] = T.floor;
  // round the crypt: the corners are rock
  for (const [x, y] of [[0, 0], [1, 0], [0, 1], [19, 0], [18, 0], [19, 1], [0, 19], [1, 19], [0, 18], [19, 19], [18, 19], [19, 18]]) tiles[(HALL.y + y) * w + HALL.x + x] = T.wall;
  for (const b of BRAZIERS) tiles[b.y * w + b.x] = T.wall;
  tiles[HALL_MAP.up.y * w + HALL_MAP.up.x] = T.stairU;
  tiles[HALL_MAP.up.y * w + HALL_MAP.up.x + 1] = T.floor;
  return { tiles, w, h, fog: new Uint8Array(w * h), hall: { x: HALL.x, y: HALL.y, w: HALL.w, h: HALL.h } };
}
export function isBrazier(x: number, y: number): boolean {
  return BRAZIERS.some((b) => b.x === x && b.y === y);
}
export function graveAt(x: number, y: number): number {
  return GRAVES.findIndex((g) => g.y === y && (g.x === x || g.x + 1 === x));
}

/** Doc 2.1: his intro, with one line for your class after the third. */
export function wakeIntro(cls: string): string[] {
  const tag: Record<string, string> = {
    vampire: '"A child of the night, come to stop the night. How sweet."',
    wizard: '"You borrow from the dead. I keep their books."',
    assassin: '"Quiet feet. Good. Bells hate noise."',
    warrior: '"Plate. A fellow mourner, then."',
  };
  return [
    "The bell rings far below. The cold fire round the hall bends toward the centre.",
    'Hollowmourn, kneeling at the Bell: "Hush. You\'ll wake them."',
    'He stands. "Oh. You\'re the one who keeps putting my mourners to bed. I dug this vale\'s first grave, little one. I know where every one of them sleeps."',
    `Hollowmourn: ${tag[cls] ?? tag.warrior}`,
    'Hollowmourn: "Every grave in this vale is a pew. Every night is a service. I\'m the only one who never misses it."',
    'Hollowmourn: "Sit. The service is long."',
  ];
}
/** Doc 5.2: his two named drops. */
export const SEXTON_SPADE = { name: "The Sexton's Spade", kind: "weapon" as const, rank: 5 as const, slot: "main" as const, hands: 2 as const, special: "Cold fire" };
export const BELL_SHARD = { name: "The Bell-Shard", kind: "relic" as const, rank: 5 as const, special: "Trophy" };
