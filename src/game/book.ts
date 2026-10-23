/**
 * batch7 [OWNER-APPROVED 2026-10-23 Bill: bestiary book + achievements]: the collection book and the badges.
 * The book extends the old `bestiary` (families met, used by the guild's page of 20): it keeps one entry per
 * family x rank on foes.png (17 x 4) plus one per named special (story bosses, festival bosses, the wake minis and
 * Hollowmourn), each filled in on its first defeat. Badges are earned once and saved. Pure data and rules here.
 */
import { BOSSES, FAMILIES, FESTIVAL_BOSSES, WAKE_MINIS, WAKE_LORD, type MonsterDef } from "./content";

/** foes.png families, in sheet order (public/art/sprites/ORDER.txt). */
export const BOOK_FAMILIES = ["zombie", "skeleton", "ghost", "bat", "ghoul", "witch", "lantern", "scarecrow", "wolf", "mummy", "vampire", "tree", "lich", "horse", "goblin", "cat", "rat"] as const;
/** The book's rank order (weakest first). SHEET_RANK maps it to the sheet's order (mob boss mini rare). */
export const BOOK_RANKS = ["mob", "rare", "mini", "boss"] as const;
export const SHEET_RANK: Record<(typeof BOOK_RANKS)[number], number> = { mob: 0, boss: 1, mini: 2, rare: 3 };
export const RANK_LABEL: Record<(typeof BOOK_RANKS)[number], string> = { mob: "Common", rare: "Rare", mini: "Mini-boss", boss: "Boss" };
export const FAMILY_LABEL: Record<string, string> = { zombie: "Zombie", skeleton: "Skeleton", ghost: "Ghost", bat: "Bat", ghoul: "Ghoul", witch: "Witch", lantern: "Lantern Man", scarecrow: "Scarecrow", wolf: "Werewolf", mummy: "Mummy", vampire: "Vampire", tree: "Knot-Faced Elm", lich: "Lich", horse: "Night Horse", goblin: "Goblin", cat: "Grave Cat", rat: "Crypt Rat" };

/** The named specials: every story boss and the loot goblin, the two festival bosses, the four wake minis, Hollowmourn. */
export const BOOK_SPECIALS: readonly MonsterDef[] = [...BOSSES, ...FESTIVAL_BOSSES, ...WAKE_MINIS, WAKE_LORD];
export const SPECIAL_IDS = new Set(BOOK_SPECIALS.map((d) => d.id));

export type BookFoe = { family?: string; boss?: boolean; mini?: boolean; rare?: boolean; naughty?: string; mimic?: boolean; def?: string; id?: string; helper?: boolean };
export function bookRank(f: BookFoe): (typeof BOOK_RANKS)[number] {
  return f.boss ? "boss" : f.mini ? "mini" : f.rare || f.naughty || f.mimic ? "rare" : "mob";
}
/** The book keys one defeat fills: its family x rank (when the family is on the sheet) and its special, if named. */
export function bookKeys(f: BookFoe): string[] {
  const out: string[] = [];
  if (f.family && (BOOK_FAMILIES as readonly string[]).includes(f.family)) out.push(`${f.family}:${bookRank(f)}`);
  const id = f.def ?? f.id;
  if (id && SPECIAL_IDS.has(id)) out.push(`s:${id}`);
  return out;
}
/**
 * Which family x rank cells a foe in this version can fill: wild families walk as commons and rares (the goblin as a
 * common), a named boss's family as a boss and as its remnant (mini), the wake minis as minis, Hollowmourn as a lich
 * boss. The rest (the cat and the rat are only critters) show on the page as "not in the vale yet" and never count.
 */
const WILD = new Set(FAMILIES.map((d) => d.family));
const BOSSY = new Set([...BOSSES.filter((d) => d.boss).map((d) => d.family), WAKE_LORD.family]);
const MINIS = new Set([...BOSSY, ...WAKE_MINIS.map((d) => d.family)]);
export function bookReachable(family: string, rank: (typeof BOOK_RANKS)[number]): boolean {
  if (rank === "mob") return WILD.has(family) || family === "goblin";
  if (rank === "rare") return WILD.has(family);
  if (rank === "mini") return MINIS.has(family);
  return BOSSY.has(family);
}
/** Every key a complete book holds (the reachable cells, then every special). */
export function allBookKeys(): string[] {
  return [...BOOK_FAMILIES.flatMap((f) => BOOK_RANKS.filter((r) => bookReachable(f, r)).map((r) => `${f}:${r}`)), ...BOOK_SPECIALS.map((d) => `s:${d.id}`)];
}
export const BOOK_TOTAL = allBookKeys().length;

/** The story bosses (the stained-glass windows in the Wake Hall) plus Hollowmourn. */
export const STORY_BOSSES = ["lanternking", "horseman", "dracula", "witchboss", "rootwidow", "wolfman", "queen", "tzar", "leech"];

export type BadgeView = {
  book: ReadonlySet<string>;
  marks: ReadonlySet<string>;
  silver: number;
  level: number;
  endingSeen: boolean;
  ngPlus: number;
  opened: ReadonlySet<string>;
};
export type Badge = { id: string; name: string; desc: string; test: (v: BadgeView) => boolean };
const beat = (id: string) => (v: BadgeView) => v.book.has(`s:${id}`);
export const BADGES: readonly Badge[] = [
  { id: "first", name: "First Rest", desc: "Put your first restless thing to bed.", test: (v) => v.book.size >= 1 },
  { id: "book10", name: "Field Notes", desc: "Fill 10 entries in the bestiary.", test: (v) => v.book.size >= 10 },
  { id: "book40", name: "Half the Book", desc: "Fill half the bestiary.", test: (v) => v.book.size >= Math.ceil(BOOK_TOTAL / 2) },
  { id: "bookall", name: "The Whole Vale", desc: "Fill every entry in the bestiary.", test: (v) => allBookKeys().every((k) => v.book.has(k)) },
  { id: "rare", name: "Odd One Out", desc: "Defeat a rare foe.", test: (v) => [...v.book].some((k) => k.endsWith(":rare")) },
  { id: "mini", name: "Middle Management", desc: "Defeat a mini-boss.", test: (v) => [...v.book].some((k) => k.endsWith(":mini")) },
  { id: "boss1", name: "Bell Toller", desc: "Defeat your first named boss.", test: (v) => BOSSES.some((b) => b.id !== "goblin" && v.book.has(`s:${b.id}`)) },
  { id: "lanternking", name: "Lights Out", desc: "Defeat the Lantern King.", test: beat("lanternking") },
  { id: "dracula", name: "Sunrise", desc: "Defeat Dracula.", test: beat("dracula") },
  { id: "rootwidow", name: "Uprooted", desc: "Defeat the Root Widow.", test: beat("rootwidow") },
  { id: "story", name: "Every Window Lit", desc: "Defeat every story boss.", test: (v) => STORY_BOSSES.every((id) => v.book.has(`s:${id}`)) },
  { id: "allbosses", name: "No Boss Left", desc: "Defeat every named boss, festival bosses and wake minis included.", test: (v) => BOOK_SPECIALS.every((d) => v.book.has(`s:${d.id}`)) },
  { id: "festival", name: "Seasonal Worker", desc: "Defeat the Pumpkin Lord or Krampus.", test: (v) => v.book.has("s:pumpkinlord") || v.book.has("s:krampus") },
  { id: "goblin", name: "Finders Keepers", desc: "Catch the Loot Goblin.", test: beat("goblin") },
  { id: "hollowmourn", name: "The Service Ends", desc: "Defeat Hollowmourn.", test: beat("hollowmourn") },
  { id: "orchard", name: "Orchard Keeper", desc: "Finish the Haunted Orchard errand.", test: (v) => v.opened.has("side:orchard:done") },
  { id: "crypt", name: "Bailed Out", desc: "Finish the Flooded Crypt errand.", test: (v) => v.opened.has("side:crypt:done") },
  { id: "bust", name: "Hit Me", desc: "Bust at the blackjack table.", test: (v) => v.marks.has("bust") },
  { id: "blackjack", name: "Twenty-One", desc: "Draw a blackjack.", test: (v) => v.marks.has("blackjack") },
  { id: "silver100", name: "Pocket Money", desc: "Hold 100 silver (purse and bank).", test: (v) => v.silver >= 100 },
  { id: "silver1k", name: "Comfortable", desc: "Hold 1,000 silver.", test: (v) => v.silver >= 1000 },
  { id: "silver10k", name: "Grave Robber", desc: "Hold 10,000 silver.", test: (v) => v.silver >= 10000 },
  { id: "lv10", name: "Seasoned", desc: "Reach level 10.", test: (v) => v.level >= 10 },
  { id: "lv30", name: "Veteran", desc: "Reach level 30.", test: (v) => v.level >= 30 },
  { id: "ending", name: "The Night Goes On", desc: "See the ending and the credits.", test: (v) => v.endingSeen || v.ngPlus > 0 },
  { id: "ngplus", name: "Once More", desc: "Begin New Game+.", test: (v) => v.ngPlus > 0 },
];
/** The badges this view has earned that `have` does not hold yet, in list order. */
export function newBadges(v: BadgeView, have: readonly string[]): Badge[] {
  return BADGES.filter((b) => !have.includes(b.id) && b.test(v));
}
