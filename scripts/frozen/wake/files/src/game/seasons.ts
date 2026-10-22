/**
 * Seasons (FEATURE_TASKS item 13, owner-requested 2026-10-01).
 *
 * Four seasons ride the existing calendar: one season is one six-day calendar block (the block whose
 * name seasonName() already shows), so the order is autumn, winter, spring, summer of the dead and a
 * year is 24 day-night cycles. Day 0 is the first day of autumn. Everything here is read from the
 * world clock, so nothing new is saved and an older save simply wakes in the season of its clock.
 *
 * What a season changes:
 *   - tints: ground and tree sheets remapped by the pixel writer into the locked palette (draw.ts)
 *   - weather: a 12-slot deck per season (one slot = WEATHER_MS, 12 slots = one day-night cycle)
 *   - fish: one seasonal catch, at fish-shack points inside the existing 2-8 range
 *   - foes: weights over the families each biome already lists (no family moves biome, no new numbers)
 *   - festival: a hook for one festival night per season (see FESTIVALS); the festivals live in festivals.ts.
 *     All four are live: Harvest Moon, Krampusnacht, Drowned Bloom, Ashen Fair (the last two owner-approved
 *     2026-10-01 10:14 AM ET, no new boss).
 */
import { CYCLE_MS, WEATHER_MS, type WeatherId } from "./content";

export type SeasonId = "autumn" | "winter" | "spring" | "summer";

export type FestivalHook = {
  id: string;
  name: string;
  /** "live": built and running on its night. "proposed": not confirmed by the owner, not built. */
  status: "live" | "held" | "planned" | "proposed";
  /** Where its spec lives, if anywhere. */
  spec: string;
};

export const SEASON = {
  order: ["autumn", "winter", "spring", "summer"] as SeasonId[],
  /** Days in a season: one six-day calendar block. */
  days: 6,
  names: { autumn: "Autumn", winter: "Winter", spring: "Spring", summer: "Summer of the Dead" } as Record<SeasonId, string>,
  /**
   * Weather decks, 12 slots each (one day-night cycle). Each day of the season starts the deck 5 slots
   * further on, so storms do not always land at the same hour. Autumn day 0 opens with the old
   * five-step walk (still, light, heavy, storm, snow).
   */
  weather: {
    autumn: ["still", "light", "heavy", "storm", "snow", "still", "light", "heavy", "still", "light", "heavy", "storm"],
    winter: ["snow", "still", "snow", "light", "snow", "still", "snow", "heavy", "snow", "still", "snow", "light"],
    spring: ["light", "heavy", "still", "light", "storm", "heavy", "light", "still", "heavy", "light", "storm", "snow"],
    summer: ["still", "storm", "still", "light", "still", "storm", "heavy", "still", "storm", "light", "still", "storm"],
  } as Record<SeasonId, WeatherId[]>,
  deckStep: 5,
  /**
   * Foe weights inside each biome's own family list (GAME_LAYOUT_TWO_ROSTER biome lists). A family not
   * named here weighs 1. A weight never adds a family to a biome that does not list it.
   */
  foes: {
    autumn: { pumpkin: 3, scare: 3, zombie: 2, ghoul: 2 },
    winter: { wolf: 3, ghost: 2, skeleton: 2 },
    spring: { tree: 3, witch: 2, zombie: 2, bat: 2 },
    summer: { ghoul: 3, mummy: 2, skeleton: 2, zombie: 2 },
  } as Record<SeasonId, Record<string, number>>,
  /** Seasonal catch: share of plain fish catches (not witchlit derby fish, gems or gear) that are the season's fish. */
  fishChance: 0.15,
  fish: {
    autumn: { name: "Harvest gar", points: 5 },
    winter: { name: "Rime char", points: 6 },
    spring: { name: "Bloom-gill dace", points: 4 },
    summer: { name: "Corpse-light koi", points: 7 },
  } as Record<SeasonId, { name: string; points: number }>,
  /** The festival night's day inside its season (0-5). Day 3 is never a derby day (derby days are 2 and 5 of a block). */
  festivalDay: 3,
};

/** One festival hook per season. festivalTonight() is null unless the hook's id is in LIVE_FESTIVALS. */
export const FESTIVALS: Record<SeasonId, FestivalHook> = {
  autumn: { id: "harvest", name: "Harvest Moon", status: "live", spec: "FEATURE_TASKS item 12 (festivals.ts)" },
  winter: { id: "krampus", name: "Krampusnacht", status: "live", spec: "FEATURE_TASKS item 14, winter (festivals.ts)" },
  spring: { id: "bloom", name: "Drowned Bloom", status: "live", spec: "FEATURE_TASKS item 14, spring (festivals.ts; owner-approved 2026-10-01 10:14 ET)" },
  summer: { id: "ashen", name: "Ashen Fair", status: "live", spec: "FEATURE_TASKS item 14, summer (festivals.ts; owner-approved 2026-10-01 10:14 ET)" },
};

/** Festivals made live: Harvest Moon and Krampusnacht (owner-approved 2026-10-01), Drowned Bloom and Ashen Fair
 * (owner-approved 2026-10-01 10:14 ET). All four hooks are built. */
export const LIVE_FESTIVALS: string[] = ["harvest", "krampus", "bloom", "ashen"];

export function dayNumber(ms: number) {
  return Math.floor(ms / CYCLE_MS);
}

export function seasonOfDay(day: number): SeasonId {
  const n = SEASON.order.length;
  const i = Math.floor(Math.max(0, day) / SEASON.days) % n;
  return SEASON.order[i];
}

export function seasonAt(ms: number): SeasonId {
  return seasonOfDay(dayNumber(ms));
}

/** Day inside the season, 0 to SEASON.days - 1. */
export function dayInSeason(ms: number) {
  return Math.max(0, dayNumber(ms)) % SEASON.days;
}

/** The weather for this moment: the season's deck, turned on by the day inside the season. */
export function seasonWeather(ms: number): WeatherId {
  const t = Math.max(0, ms);
  const deck = SEASON.weather[seasonAt(t)];
  const slot = Math.floor((t % CYCLE_MS) / WEATHER_MS);
  return deck[(slot + dayInSeason(t) * SEASON.deckStep) % deck.length];
}

/** Weight of a family this season. */
export function foeWeight(season: SeasonId, id: string) {
  return SEASON.foes[season][id] ?? 1;
}

/** Pick one def from a biome's own list with the season's weights. r is one roll in [0, 1). */
export function seasonPick<T extends { id: string }>(picks: T[], season: SeasonId, r: number): T {
  const total = picks.reduce((n, p) => n + foeWeight(season, p.id), 0);
  let x = r * total;
  for (const p of picks) {
    x -= foeWeight(season, p.id);
    if (x < 0) return p;
  }
  return picks[picks.length - 1];
}

/** The festival hook that would fall on this day, whether or not it is built. */
export function festivalHook(day: number): FestivalHook | null {
  if (day < 0 || day % SEASON.days !== SEASON.festivalDay) return null;
  return FESTIVALS[seasonOfDay(day)];
}

/** The season sheet for one of the tinted ground/tree sheets (made by the pixel writer). */
export function seasonSheet(season: SeasonId, name: "vale" | "camp-grass" | "town-grass" | "trees" | "town-trees") {
  return `/art/writer/season-${season}-${name}.png`;
}
