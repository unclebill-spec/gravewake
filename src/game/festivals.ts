/**
 * Festival nights (FEATURE_TASKS item 12 Harvest Moon, item 14 winter Krampusnacht, spring Drowned Bloom and
 * summer Ashen Fair), on the season hooks
 * of seasons.ts: the festival night is the night of in-season day SEASON.festivalDay (0-based 3).
 *
 * OWNER-APPROVED EXCEPTION 2026-10-01: FESTIVAL BOSSES. The Pumpkin Lord and Krampus are the only two
 * bosses beyond the 21-boss roster. They live in FESTIVAL_BOSSES (content.ts), never in BOSSES, a world
 * spot list, a dungeon, a remnant table, or a pick list, and they only stand on their own festival night.
 * Their stats run through scaleMonster with the normal boss bulk (boss: true), like every boss.
 *
 * OWNER-APPROVED 2026-10-01 10:14 AM ET: SPRING AND SUMMER FESTIVALS. Drowned Bloom (spring: the swamp
 * floods, Weir-wife Ottla's bloom gathering, the Drowned Court) and Ashen Fair (summer: Barker Sallow's
 * ember dance under a burning moon, the Cinder sideshow). Neither adds a boss or a rule exception: the
 * court and the sideshow are named Stalker packs on the existing build, the Drowned Tzar keeps his one
 * world spot (38,32), and every prize is the existing junk row or one roll of the existing chest table.
 *
 * Pure data and picks here; the sim owns state (opened keys fest:<id>:<day>:...).
 */
import { BOUNTY, mulberry, type MonsterDef } from "./content";
import { featSeed, type Spot } from "./feats";
import { GATE } from "./bounty";

export const HARVEST = {
  /** The festival stall in the town plaza (town tile), open from dusk to dawn on Harvest Moon night. */
  stall: { x: 26, y: 14 },
  npc: { id: "hessa", name: "Gourdwife Hessa", look: "alchemist" },
  /** Pumpkin carving: buy a pumpkin, cut the eyes, cut the mouth; the night's judge pays for a match. */
  pumpkinPrice: 4,
  eyes: ["round", "slant", "hollow"] as const,
  mouths: ["grin", "fangs", "wail"] as const,
  /** Silver from the judge for 0, 1, or 2 cuts that match the night's taste. */
  prize: [0, 10, 25],
  /** Lantern game: light six plaza lanterns by walking into each before the wick-glass runs out. */
  lanterns: [
    [5, 7],
    [15, 7],
    [28, 7],
    [3, 20],
    [25, 20],
    [36, 20],
  ] as [number, number][],
  runSeconds: 90,
  /** A lantern lights when the hero's feet come within this many px of its tile centre. */
  touch: 12,
  lanternPay: 3,
  allLitBonus: 15,
  /** The Pumpkin Lord's patch: open Cinder ash, 8.5 tiles south-west of the town gate (32,46), 10 tiles from any
   * dungeon mouth and 14 from any world boss spot (so a fight never spills into a stair or a boss). */
  lord: { x: 26, y: 52, lv: 10 },
};

export const KRAMPUSNACHT = {
  /** Krampus stands in the Winter hollow, well west of the Wolfman (32,6), from dusk to dawn: open snow,
   * 6.7 tiles from the nearest dungeon mouth and 10 from any world boss spot. */
  spot: { x: 12, y: 11, lv: 16 },
  /** Naughty-list stalkers: packs on the existing Stalker build, named off the list, in the Winter hollow. */
  stalkers: 3,
  names: ["Greedy Tobiah", "Liar Agnes", "Little Mott the Biter", "Sly Hanne", "Sour Piet", "Wicked Lise", "Gutter Klaus", "Spiteful Wenna"],
  /** Within this many px of Krampus, the one warning line plays. */
  warn: 160,
  /** Loot: every list name drops a lump of coal (a junk item, the junk row's rank 1). */
  coal: { name: "Lump of coal", kind: "junk" as const, rank: 1 as const },
  /** A list name also drops a gift sack this often; the sack holds one roll of the chest table. */
  sackChance: 0.5,
  /** Krampus's own basket: one gift sack (chest table) and three coal, on top of the normal boss drop. */
  krampusCoal: 3,
};

export type Naughty = { id: string; name: string; fam: string; x: number; y: number; affix: "fast" | "vortex" };

/** The night's judge: the eyes and mouth the judge will pay for. One reveal (the eyes) goes in Hessa's line. */
export function harvestJudge(day: number) {
  const rng = mulberry(featSeed("harvest", day, "judge"));
  return { eyes: HARVEST.eyes[Math.floor(rng() * HARVEST.eyes.length)], mouth: HARVEST.mouths[Math.floor(rng() * HARVEST.mouths.length)] };
}

/** Matches between a carving and the judge, 0 to 2. */
export function carveScore(day: number, eyes: string, mouth: string) {
  const j = harvestJudge(day);
  return (eyes === j.eyes ? 1 : 0) + (mouth === j.mouth ? 1 : 0);
}

/**
 * The night's naughty list: KRAMPUSNACHT.stalkers names on Winter hollow lairs (bounty lairTiles, y < 16),
 * at least BOUNTY.lairClear * 2 (8 tiles) from Krampus, from each other, and from every world boss spot in
 * `bosses` (so a name never sits on the Wolfman's doorstep). Same night, same list.
 */
export function naughtyList(day: number, lairs: number[], w: number, familiesAt: (x: number, y: number) => MonsterDef[], bosses: Spot[] = []): Naughty[] {
  const rng = mulberry(featSeed("krampus", day, "list"));
  const k = KRAMPUSNACHT.spot;
  const pool = lairs.filter((i) => {
    const x = i % w;
    const y = Math.floor(i / w);
    return y < 16 && Math.hypot(x - k.x, y - k.y) >= BOUNTY.lairClear * 2 && Math.hypot(x - GATE.x, y - GATE.y) >= BOUNTY.gateClear && bosses.every((b) => Math.hypot(x - b.x, y - b.y) >= BOUNTY.lairClear * 2);
  });
  const out: Naughty[] = [];
  const names = [...KRAMPUSNACHT.names];
  for (let n = 0; n < 40 && out.length < KRAMPUSNACHT.stalkers && pool.length; n++) {
    const at = pool[Math.floor(rng() * pool.length)];
    const x = at % w;
    const y = Math.floor(at / w);
    if (out.some((o) => Math.hypot(o.x - x, o.y - y) < BOUNTY.lairClear * 2)) continue;
    const fams = familiesAt(x, y);
    const fam = fams[Math.floor(rng() * fams.length)];
    const given = names.splice(Math.floor(rng() * names.length), 1)[0];
    out.push({ id: `naughty-${day}-${out.length}`, name: `${given}, ${fam.name} Stalker`, fam: fam.id, x, y, affix: rng() < 0.5 ? "fast" : "vortex" });
  }
  return out;
}

export type { Spot };

// ---- Spring and summer festivals (owner-approved 2026-10-01 10:14 AM ET), on the same hooks: the night of
// in-season day 4. Neither adds a boss. The Drowned Tzar keeps his one home (38,32); his court is named
// Stalker packs on the existing build. Loot rolls the existing junk row and chest table only.

/** Spring: Drowned Bloom. The swamps flood and the Drowned Tzar's court rises. */
export const DROWNED_BLOOM = {
  /** The flood: the swamp (x 27-41, y 23-39) and 3 tiles of bank around it. Drawn only: nothing walks differently. */
  flood: { x0: 24, x1: 44, y0: 20, y1: 42 },
  /** Ottla keeps the plaza stall (the stall tile Hessa uses on Harvest Moon). */
  npc: { id: "ottla", name: "Weir-wife Ottla", look: "fisher" },
  /** Bloom gathering: six blooms surface on flooded open ground, 3+ tiles apart. Walk onto one to pick it. */
  blooms: 6,
  bloomGap: 3,
  touch: 12,
  bloom: { name: "Drowned bloom", kind: "junk" as const, rank: 1 as const },
  /** Ottla pays this much a bloom; all six of tonight's blooms handed in earns a garland (one chest-table roll). */
  bloomPay: 4,
  /** The Drowned Court: named Ghost Stalker packs (the Tzar's own helper family) risen on the flooded banks: the
   * 3-tile band round the swamp, which is vale ground and lists ghost. 8 tiles apart, 8 clear of every world boss spot. */
  court: 3,
  courtFamily: "ghost",
  names: ["Lady Ysolde", "Ser Mallow the Bloated", "Chamberlain Grech", "the Weeping Duchess", "Page Teodor", "Countess Brine", "Old Usher Pell", "the Silt Herald"],
  /** Every courtier drops a court seal (junk row, rank 1); this often also a drowned coffer (one chest-table roll). */
  seal: { name: "Court seal", kind: "junk" as const, rank: 1 as const },
  cofferChance: 0.5,
};

/** Summer: Ashen Fair. Carnival games under a burning moon. */
export const ASHEN_FAIR = {
  npc: { id: "sallow", name: "Barker Sallow", look: "casino" },
  /** The ember dance on the six plaza posts (HARVEST.lanterns): the barker flares `steps` braziers in turn,
   * one every `showSeconds`; then walk them in that order inside `runSeconds`. A wrong brazier ends the turn. */
  turnPrice: 3,
  turns: 3,
  steps: 4,
  showSeconds: 0.8,
  runSeconds: 60,
  touch: 12,
  stepPay: 4,
  /** All four steps: this much more, and the night's first perfect dance wins a fair prize (one chest-table roll). */
  perfectBonus: 10,
  /** The sideshow: named Stalker packs on Cinder lairs (y > 46, x <= 48), 8 apart and 8 clear of every world boss spot. */
  sideshow: 3,
  names: ["Gristle the Fire-Eater", "Madame Cinders", "the Grinning Gourd", "Strawman Hob", "the Tallow Twins", "Long Meg the Stilt-Walker", "Ashjaw the Swallower", "Mother Soot"],
  ticket: { name: "Fair ticket", kind: "junk" as const, rank: 1 as const },
  prizeChance: 0.5,
};

/** On Drowned Bloom night, is this world tile under the flood? */
export function inFlood(x: number, y: number) {
  const f = DROWNED_BLOOM.flood;
  return x >= f.x0 && x <= f.x1 && y >= f.y0 && y <= f.y1;
}

/** The swamp itself (x 27-41, y 23-39); the flood's banks are the rest of the flood. */
export function inSwamp(x: number, y: number) {
  return x > 26 && x < 42 && y > 22 && y < 40;
}

/** Named packs on a pool of lairs: `count` names, 8 tiles apart (BOUNTY.lairClear * 2), seeded by tag and day. */
function namedPacks(tag: string, day: number, pool: number[], w: number, count: number, names: readonly string[], familiesAt: (x: number, y: number) => MonsterDef[], only = ""): Naughty[] {
  const rng = mulberry(featSeed(tag, day, "list"));
  const out: Naughty[] = [];
  const left = [...names];
  for (let n = 0; n < 60 && out.length < count && pool.length; n++) {
    const at = pool[Math.floor(rng() * pool.length)];
    const x = at % w;
    const y = Math.floor(at / w);
    if (out.some((o) => Math.hypot(o.x - x, o.y - y) < BOUNTY.lairClear * 2)) continue;
    const here = familiesAt(x, y);
    const fams = only ? here.filter((m) => m.id === only) : here;
    if (!fams.length) continue;
    const fam = fams[Math.floor(rng() * fams.length)];
    const given = left.splice(Math.floor(rng() * left.length), 1)[0];
    out.push({ id: `${tag}-${day}-${out.length}`, name: `${given}, ${fam.name} Stalker`, fam: fam.id, x, y, affix: rng() < 0.5 ? "fast" : "vortex" });
  }
  return out;
}

const clearOf = (x: number, y: number, bosses: Spot[]) => bosses.every((b) => Math.hypot(x - b.x, y - b.y) >= BOUNTY.lairClear * 2);

/** The night's Drowned Court: DROWNED_BLOOM.court Ghost Stalkers on the flooded banks. Same night, same court. */
export function courtList(day: number, lairs: number[], w: number, familiesAt: (x: number, y: number) => MonsterDef[], bosses: Spot[] = []): Naughty[] {
  const pool = lairs.filter((i) => inFlood(i % w, Math.floor(i / w)) && !inSwamp(i % w, Math.floor(i / w)) && clearOf(i % w, Math.floor(i / w), bosses));
  return namedPacks("court", day, pool, w, DROWNED_BLOOM.court, DROWNED_BLOOM.names, familiesAt, DROWNED_BLOOM.courtFamily);
}

/** The night's sideshow: ASHEN_FAIR.sideshow names on Cinder lairs (y > 46, x <= 48: the Cinder's own families,
 * lantern man, scarecrow, witch). Same night, same sideshow. */
export function sideshowList(day: number, lairs: number[], w: number, familiesAt: (x: number, y: number) => MonsterDef[], bosses: Spot[] = []): Naughty[] {
  const pool = lairs.filter((i) => Math.floor(i / w) > 46 && i % w <= 48 && clearOf(i % w, Math.floor(i / w), bosses));
  return namedPacks("sideshow", day, pool, w, ASHEN_FAIR.sideshow, ASHEN_FAIR.names, familiesAt);
}

/** Tonight's blooms: DROWNED_BLOOM.blooms flooded lair tiles, bloomGap apart, off the court's lairs, and 8 clear of
 * every world boss spot (gathering never walks you onto the Drowned Tzar). */
export function bloomSpots(day: number, lairs: number[], w: number, court: Spot[] = [], bosses: Spot[] = []): Spot[] {
  const rng = mulberry(featSeed("bloom", day, "blooms"));
  const pool = lairs.filter((i) => inFlood(i % w, Math.floor(i / w)) && court.every((c) => Math.hypot(c.x - (i % w), c.y - Math.floor(i / w)) >= BOUNTY.lairClear) && clearOf(i % w, Math.floor(i / w), bosses));
  const out: Spot[] = [];
  for (let n = 0; n < 200 && out.length < DROWNED_BLOOM.blooms && pool.length; n++) {
    const at = pool[Math.floor(rng() * pool.length)];
    const x = at % w;
    const y = Math.floor(at / w);
    if (out.some((o) => Math.hypot(o.x - x, o.y - y) < DROWNED_BLOOM.bloomGap)) continue;
    out.push({ x, y });
  }
  return out;
}

/** One ember-dance turn's order: ASHEN_FAIR.steps distinct braziers of the six, seeded by night and turn. */
export function danceOrder(day: number, turn: number): number[] {
  const rng = mulberry(featSeed("ashen", day, `dance${turn}`));
  const left = HARVEST.lanterns.map((_, i) => i);
  const out: number[] = [];
  while (out.length < ASHEN_FAIR.steps) out.push(left.splice(Math.floor(rng() * left.length), 1)[0]);
  return out;
}
