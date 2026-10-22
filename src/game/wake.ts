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
export const WAKE_SHEETS: Record<string, { url: string; em: string; w: number; h: number }> = {
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
