/**
 * playtest1u [OWNER-APPROVED 2026-10-04 21:02 ET: playtest1u tap targeting] (Bill, 2026-10-04 9:02 PM ET): tap a monster
 * to lock onto it, and the hero walks into range and fights it with the fitting attack until it drops.
 *
 * The rule (sim.ts Game.tapAt / tickLock read it; pure numbers and choices only here, nothing saved):
 *   - A tap (a touch, or a mouse click on PC) picks the foe under the finger: the nearest whose drawn body, grown by a
 *     touch slop, holds the point. A big body's box is its own shape (bigshapes.ts through halfOf and topOf), so a tap on
 *     a boss's shoulder or a bat's wing locks it; a common foe's box is its 16 px sprite and its head.
 *   - Tapping the locked foe again, tapping open ground (which walks there, as a tap always has) or moving (the stick, the
 *     keys, the pad) lets go. A button pressed by hand (Main, Whirl, Smite, an art, a rail spell, a draught) goes at once
 *     and holds the auto attack off for `manual` s.
 *   - Locked, the hero walks to the foe by the tiles (round walls, props and water), never into a live telegraphed mark
 *     (an aimed circle, a nova round the body, a line sweep: allyspace.ts inArea); standing in one, it steps out by the
 *     nearest way first, as the companion does (allyspace.ts exits). A wandering foe is walked up to, so the fight opens as
 *     it always does on touch; the lock then rides to the body that steps in.
 *   - In range it uses pickAttack's choice, at most every `swing` s for the free Main swing (the buttons' own costs and
 *     cooldowns hold for the rest). When the foe drops, the lock moves to the nearest other foe already fighting the hero
 *     within `next` px; else it clears.
 * Damage, costs, cooldowns, reach and every number of the fight are unchanged: the auto attack presses the same verbs.
 */
import { halfOf, rankOf, topOf, type Ranked } from "./bigboss";
import { reaction, SPELL_ELEMENT, type Status } from "./combos";

export const TAP_FIGHT_TAG = "[OWNER-APPROVED 2026-10-04 21:02 ET: playtest1u tap targeting]";

export const TAP = {
  /** The touch slop (world px) a foe's box grows by at the least; the shell passes about 22 css px in world px. */
  slop: 6,
  /** A common foe's box: half-width, height over its feet, depth under them (px). */
  mobHalf: 8,
  mobTop: 22,
  under: 4,
  /** After a foe drops, the lock moves to another foe fighting the hero this close (px), or clears. */
  next: 96,
  /** A button pressed by hand holds the auto attack off this long (s). */
  manual: 0.6,
  /** The free Main swing's pace (s), about a quick player's tapping. */
  swing: 0.45,
  /** Re-plan the walk this often (s). */
  repath: 0.25,
  /** The tiles searched for a way to the foe (a square this many tiles out from the hero). */
  span: 20,
  /** Below this share of HP, with a draught in the bag, it drinks first. */
  low: 0.3,
  /** At most one draught this often (s). */
  drinkGap: 8,
  /** Foes within this of the hero (px) make a cluster worth a Whirl (or an area art) at `crowd`. */
  crowd: 3,
  /** It stands this far past a mark's edge (px; allyspace.ts ALLY_SPACE.pad). */
  pad: 8,
} as const;

/** The reach (px) of each verb: Main's cone (36 to the body's edge), Whirl's ring (28 to the edge), Smite's and a rail
 * spell's (96 to the middle), an art's (100; Ambush 30), its area's radius (sim.ts castKnown). */
export const REACH = { slash: 36, whirl: 28, smite: 96, rail: 96, art: 100, ambush: 30 } as const;
export const AREA_ART: Record<string, number> = { Earthshatter: 40, "Summon Shade": 56, "Grave Nova": 72 };
export const SELF_ART = new Set(["Loadout Stance", "War Cry", "Vanish"]);

export type TapBox = { x0: number; y0: number; x1: number; y1: number };
/** A foe's tap box: its drawn body round its feet (x, y). */
export function tapBox(r: Ranked & { x: number; y: number }): TapBox {
  const big = rankOf(r) !== "mob";
  const half = big ? halfOf(r) : TAP.mobHalf;
  const top = big ? topOf(r) : TAP.mobTop;
  return { x0: r.x - half, y0: r.y - top, x1: r.x + half, y1: r.y + TAP.under };
}
/** The foe under a tap: of those whose box grown by slop holds (x, y), the one whose box middle is nearest. -1: none. */
export function tapHit(list: (Ranked & { x: number; y: number })[], x: number, y: number, slop: number = TAP.slop): number {
  let best = -1;
  let bd = Infinity;
  list.forEach((r, i) => {
    const b = tapBox(r);
    if (x < b.x0 - slop || x > b.x1 + slop || y < b.y0 - slop || y > b.y1 + slop) return;
    // inside the box itself counts nearer than in its slop, so a small foe in front of a big one is still picked
    const inside = x >= b.x0 && x <= b.x1 && y >= b.y0 && y <= b.y1;
    const d = Math.hypot(x - (b.x0 + b.x1) / 2, y - (b.y0 + b.y1) / 2) + (inside ? 0 : 1000);
    if (d < bd) {
      bd = d;
      best = i;
    }
  });
  return best;
}

export type Verb = "slash" | "whirl" | "smite" | "art" | "rail" | "potion" | "close";
export type Choice = { verb: Verb; name?: string; reach: number; edge: boolean; why: string };
export type FightState = {
  /** Hero to the foe's middle (px) and the foe's hurt radius (its edge is dist - body). */
  dist: number;
  body: number;
  hpFrac: number;
  potions: number;
  drinkReady: boolean;
  vampire: boolean;
  wizard: boolean;
  stam: number;
  mana: number;
  blood: number;
  spellCool: number;
  /** Learned class arts (in kit order) and rail spells. */
  arts: string[];
  rails: string[];
  /** Fighting foes within each area's reach of the hero (by radius px). */
  near: (rad: number) => number;
  /** The foe winds up a big telegraphed cast and Smite may break it now. */
  bigCast: boolean;
  smiteReady: boolean;
  foeHpFrac: number;
  status: Status;
  oiled: boolean;
  swingReady: boolean;
};
const SMITE_COST = 12;
const WHIRL_COST = 18;
const ART_COST = { mana: 6, blood: 4 };
const RAIL_COST = 2;

/**
 * The fitting attack. In order: a draught when low; Smite to break a big cast; an area (Whirl, or an area art) on a
 * cluster; an art whose element sets off a combo on the foe's statuses (fire on poison or oil, lightning on chill or
 * wet); far off, a ranged art, a rail spell, or (a wizard's) Smite; up close Execution on a foe under 40%, else Main.
 * Out of every reach it walks in to Main's ("close").
 */
export function pickAttack(s: FightState): Choice {
  const edgeD = s.dist - s.body;
  const canArt = (n: string) => s.spellCool <= 0 && (s.vampire ? s.blood >= ART_COST.blood : s.mana >= ART_COST.mana) && s.arts.includes(n);
  const artReach = (n: string) => (n === "Ambush" ? REACH.ambush : REACH.art);
  const canSmite = s.vampire ? s.blood >= SMITE_COST : s.mana >= SMITE_COST;
  if (s.hpFrac < TAP.low && s.potions > 0 && s.drinkReady) return { verb: "potion", reach: Infinity, edge: false, why: "low" };
  if (s.bigCast && s.smiteReady && canSmite && s.dist < REACH.smite) return { verb: "smite", reach: REACH.smite, edge: false, why: "break" };
  const canWhirl = s.vampire ? s.blood >= WHIRL_COST : s.stam >= WHIRL_COST;
  if (canWhirl && edgeD <= REACH.whirl && s.near(REACH.whirl + 16) >= TAP.crowd) return { verb: "whirl", reach: REACH.whirl, edge: true, why: "cluster" };
  for (const [n, rad] of Object.entries(AREA_ART)) if (canArt(n) && s.dist <= rad && s.near(rad) >= TAP.crowd) return { verb: "art", name: n, reach: rad, edge: false, why: "cluster" };
  for (const n of s.arts) {
    if (SELF_ART.has(n) || n in AREA_ART || !canArt(n) || s.dist >= artReach(n)) continue;
    if (reaction(SPELL_ELEMENT[n] ?? null, s.status, s.oiled)) return { verb: "art", name: n, reach: artReach(n), edge: false, why: "combo" };
  }
  if (edgeD > REACH.slash) {
    for (const n of ["Deathbolt", "Curse", "Envenom"]) if (canArt(n) && s.dist < REACH.art) return { verb: "art", name: n, reach: REACH.art, edge: false, why: "far" };
    if (s.rails.length && (s.vampire ? s.blood >= RAIL_COST : s.mana >= RAIL_COST) && s.dist < REACH.rail) return { verb: "rail", name: s.rails[0], reach: REACH.rail, edge: false, why: "far" };
    if (s.wizard && canSmite && s.dist < REACH.smite) return { verb: "smite", reach: REACH.smite, edge: false, why: "far" };
    return { verb: "close", reach: REACH.slash, edge: true, why: "walk" };
  }
  if (s.foeHpFrac < 0.4 && canArt("Execution")) return { verb: "art", name: "Execution", reach: REACH.art, edge: false, why: "finish" };
  if (canArt("Ambush") && s.dist < REACH.ambush) return { verb: "art", name: "Ambush", reach: REACH.ambush, edge: false, why: "close" };
  return { verb: "slash", reach: REACH.slash, edge: true, why: s.swingReady ? "close" : "wait" };
}
