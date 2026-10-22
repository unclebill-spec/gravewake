/**
 * Wake batch step 5 (2026-10-21) [OWNER-APPROVED 2026-10-21: boss variety; more phases for the story bosses]:
 * every roster boss gets its own big move per phase in place of the shared aimed ring, and a phase change for each gate.
 * The story bosses (the big dungeon lords) have three phases at 66% and 33%, each with a new move; the minor bosses one
 * change at 50%. Existing tags and tells only (telegraph.ts), so every mark stays fair and the damage numbers do not move:
 * a big still lands for the same attack + 4 as before (sim.ts resolveCast). Hollowmourn has his own script (wake.ts).
 *   pat "aim": a mark on the hero; "nova": a ring round the boss's own body; "echo": an aimed mark, then a second where you
 *   stepped (the old phase-two echo, now one boss's move rather than everyone's).
 */
export type BigMove = { name: string; tag: "ring" | "line" | "cone" | "pull" | "dark" | "summon"; pat: "aim" | "nova" | "echo" };
export type BossPlan = { gates: number[]; moves: BigMove[] };

const minor = (a: BigMove, b: BigMove): BossPlan => ({ gates: [0.5], moves: [a, b] });
const story = (a: BigMove, b: BigMove, c: BigMove): BossPlan => ({ gates: [0.66, 0.33], moves: [a, b, c] });

export const BOSS_PLANS: Record<string, BossPlan> = {
  // minor bosses: one change at 50%
  frank: minor({ name: "galvanic arc", tag: "line", pat: "aim" }, { name: "bolt-surge", tag: "ring", pat: "nova" }),
  warlock: minor({ name: "black candle", tag: "ring", pat: "echo" }, { name: "candle-snuff", tag: "dark", pat: "aim" }),
  priest: minor({ name: "grave-rite", tag: "cone", pat: "aim" }, { name: "lych-gate", tag: "pull", pat: "aim" }),
  abbot: minor({ name: "chapel-knell", tag: "ring", pat: "nova" }, { name: "procession of bones", tag: "line", pat: "echo" }),
  wrapped: minor({ name: "bandage-cage", tag: "pull", pat: "aim" }, { name: "canopic quake", tag: "ring", pat: "nova" }),
  lich: minor({ name: "death-word", tag: "cone", pat: "aim" }, { name: "rime lance", tag: "line", pat: "echo" }),
  haysaint: minor({ name: "scare-choir", tag: "ring", pat: "nova" }, { name: "crow-sweep", tag: "cone", pat: "echo" }),
  bride: minor({ name: "vow-bell", tag: "ring", pat: "echo" }, { name: "veil-drag", tag: "pull", pat: "aim" }),
  shade: minor({ name: "umbral split", tag: "summon", pat: "aim" }, { name: "shadow-step lash", tag: "line", pat: "aim" }),
  saint: minor({ name: "last-office", tag: "ring", pat: "nova" }, { name: "carrion psalm", tag: "dark", pat: "aim" }),
  mummyboss: minor({ name: "sarcophagus-fall", tag: "ring", pat: "aim" }, { name: "sandstorm drag", tag: "pull", pat: "aim" }),
  ashmare: minor({ name: "ash-gallop", tag: "line", pat: "aim" }, { name: "cinder ring", tag: "ring", pat: "nova" }),
  // story bosses: three phases at 66% and 33%, a new move in each
  lanternking: story({ name: "last-wick", tag: "dark", pat: "aim" }, { name: "lantern rain", tag: "ring", pat: "echo" }, { name: "wickfire sweep", tag: "cone", pat: "aim" }),
  horseman: story({ name: "ride-through", tag: "line", pat: "aim" }, { name: "pumpkin barrage", tag: "ring", pat: "echo" }, { name: "headless charge", tag: "line", pat: "echo" }),
  dracula: story({ name: "crimson stare", tag: "cone", pat: "aim" }, { name: "blood tide", tag: "ring", pat: "nova" }, { name: "night's embrace", tag: "pull", pat: "aim" }),
  witchboss: story({ name: "drown-cauldron", tag: "ring", pat: "aim" }, { name: "broom-dive", tag: "line", pat: "echo" }, { name: "bog hex", tag: "dark", pat: "aim" }),
  rootwidow: story({ name: "canopy-drop", tag: "ring", pat: "echo" }, { name: "root-snare", tag: "pull", pat: "aim" }, { name: "thorn crown", tag: "ring", pat: "nova" }),
  wolfman: story({ name: "winter-maul", tag: "cone", pat: "aim" }, { name: "moon-howl", tag: "ring", pat: "nova" }, { name: "pack hunt", tag: "summon", pat: "aim" }),
  queen: story({ name: "throne-gaze", tag: "cone", pat: "aim" }, { name: "court dance", tag: "ring", pat: "nova" }, { name: "royal decree", tag: "line", pat: "aim" }),
  tzar: story({ name: "flood-ring", tag: "ring", pat: "nova" }, { name: "undertow lane", tag: "line", pat: "echo" }, { name: "drowned crown", tag: "pull", pat: "aim" }),
  leech: story({ name: "mass", tag: "pull", pat: "aim" }, { name: "communion", tag: "ring", pat: "nova" }, { name: "red vespers", tag: "dark", pat: "aim" }),
};

/** The phase (1-based) a boss is in at this share of its HP. */
export function planPhase(plan: BossPlan, frac: number): number {
  return 1 + plan.gates.filter((g) => frac <= g).length;
}
export function planMove(plan: BossPlan, phase: number): BigMove {
  return plan.moves[Math.max(0, Math.min(plan.moves.length - 1, phase - 1))];
}
