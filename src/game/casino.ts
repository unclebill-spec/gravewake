/**
 * playtest1x [OWNER-APPROVED 2026-10-06 08:44 ET: playtest1x casino + town fixes] (Bill, 2026-10-06 08:44 ET: "The casino
 * only has one game now, instead of the three it's supposed to have, it has no singing stage, has no special shop guy ...
 * The inside area of the casino should be larger").
 *
 * The Felt is a bigger room (22x15 tiles; every other room stays 14x11) with three game tables, each with its own dealer
 * (roulette, blackjack, five-card draw poker; Bill 10:30 ET: blackjack and draw poker in place of the dice and high-low,
 * dealt in a close-up table view with big pixel-art cards, casino-cards.png), a singing stage at the back (velvet curtains, cold-fire footlights, a microphone,
 * and Velvet Odile, who sings on request), and the points merchant Corvin Tallow behind his prize counter, who keeps the
 * back shelf (the house prize and the croft's decor) the Felt's dealers always pointed at. Art: casino_writer.py
 * (room-casino.png, 32x32 cells in CASINO_KINDS order, and its glow mask). Pure data and rules: the sim and the draw read it.
 * No fight number is touched; a save made inside the old 14x11 casino lands on the same spot relative to the door.
 */
export const CASINO_SHEET = "/art/writer/room-casino.png";
export const CASINO_SHEET_EM = "/art/writer/room-casino_em.png";
export const CASINO_KINDS = ["roulette", "blackjack", "poker", "stage_l", "stage_m", "stage_r", "curtain_l", "curtain_r", "mic", "prizeshelf", "prizecounter"] as const;
export type CasinoKind = (typeof CASINO_KINDS)[number];
/** Each cell's opaque box (l, t, r, b), measured by casino_writer.boxes() (group playtest1x holds them equal). */
export const CASINO_BOX: Record<CasinoKind, [number, number, number, number]> = {
  roulette: [0, 9, 32, 31], blackjack: [0, 9, 32, 31], poker: [0, 9, 32, 31], stage_l: [1, 9, 32, 32], stage_m: [0, 13, 32, 32], stage_r: [0, 9, 31, 32],
  curtain_l: [1, 0, 31, 32], curtain_r: [1, 0, 31, 32], mic: [11, 5, 21, 32], prizeshelf: [0, 1, 32, 32], prizecounter: [0, 7, 32, 32],
};

/** Room sizes: the casino is bigger; every other room keeps 14x11. The door is the south wall's middle; the hero starts 2 rows in. */
export const ROOM_SIZE: Record<string, { w: number; h: number }> = { casino: { w: 22, h: 15 } };
export const OLD_ROOM = { w: 14, h: 11 } as const;
export function roomSize(kind: string): { w: number; h: number } {
  return ROOM_SIZE[kind] ?? OLD_ROOM;
}
export const roomDoorX = (w: number) => Math.floor(w / 2);

/**
 * A piece: its kind, its cell's top-left pixel, whether it stops bodies (the stage's boards and its mic are a platform one
 * steps up on, so they do not; the curtains and tables do), and the y it sorts at (a stage sorts at its boards' top so the
 * singer stands on it, not behind it).
 */
export type CasinoPiece = { k: CasinoKind; x: number; y: number; solid: boolean; z: number };
const P = (k: CasinoKind, x: number, y: number, solid = true, z = y + 30): CasinoPiece => ({ k, x, y, solid, z });
export const CASINO_FURNITURE: CasinoPiece[] = [
  P("curtain_l", 112, 0, true, 14), P("curtain_r", 240, 0, true, 14),
  P("stage_l", 144, 2, false, 16), P("stage_m", 176, 2, false, 16), P("stage_r", 208, 2, false, 16),
  P("mic", 168, -6, false, 25),
  P("roulette", 48, 80), P("blackjack", 272, 80), P("poker", 48, 160),
  P("prizeshelf", 272, 128), P("prizecounter", 272, 168),
];
/** The lights the pieces cast (cell offset and colour): the stage's cold fire, each table's neon, the prize counter. */
export const CASINO_LIGHT: Partial<Record<CasinoKind, { dx: number; dy: number; c: "blue" | "violet" | "red"; big?: boolean }>> = {
  mic: { dx: 16, dy: 10, c: "blue", big: true },
  roulette: { dx: 16, dy: 18, c: "red" },
  blackjack: { dx: 16, dy: 18, c: "blue" },
  poker: { dx: 16, dy: 18, c: "violet" },
  prizecounter: { dx: 16, dy: 10, c: "blue" },
};

/** The folk of the Felt (pixel feet). Each dealer runs one game; role "casino" opens that game's table. */
export const CASINO_GAMES = ["roulette", "blackjack", "poker"] as const;
export type CasinoGame = (typeof CASINO_GAMES)[number];
export const CASINO_FOLK = [
  { id: "dealer", name: "Dealer", role: "casino", coat: "#8a2030", x: 64, y: 84, game: "roulette" as CasinoGame },
  { id: "bjdealer", name: "Blackjack Dealer", role: "casino", coat: "#1c4030", x: 288, y: 84, game: "blackjack" as CasinoGame },
  { id: "pokerdealer", name: "Poker Dealer", role: "casino", coat: "#4a2a78", x: 64, y: 164, game: "poker" as CasinoGame },
  { id: "singer", name: "Velvet Odile", role: "singer", coat: "#6a4060", x: 200, y: 24, look: "tailor" },
  { id: "prizes", name: "Corvin Tallow", role: "prizes", coat: "#6a5040", x: 288, y: 166, look: "merchant" },
  { id: "patron1", name: "Gambler", role: "patron", coat: "#3a1830", x: 28, y: 118, look: "patron" },
  { id: "patron2", name: "Gambler", role: "patron", coat: "#1a2838", x: 324, y: 118, look: "patron" },
  { id: "patron3", name: "Listener", role: "patron", coat: "#3a2a44", x: 150, y: 60, look: "patron" },
  { id: "patron4", name: "Listener", role: "patron", coat: "#2a3140", x: 218, y: 60, look: "patron" },
];
export const gameOf = (npcId: string): CasinoGame => CASINO_FOLK.find((f) => f.id === npcId)?.game ?? "roulette";
/** The rug's top-left tile in the casino (the other rooms keep 5,5). */
export const CASINO_RUG = { x: 9, y: 6 } as const;
/** The casino's sign tile on the back wall (clear of the curtains and the stage). */
export const CASINO_SIGN_X = 5;

/** Points as the roulette always paid: a win 10% of the stake, a loss 5%, at least 1. */
export const pointsFor = (stake: number, won: boolean) => Math.max(1, Math.ceil(stake * (won ? 0.1 : 0.05)));

/**
 * The cards (playtest1x, Bill 10:30 ET). A card is 0..51: rank = c % 13 + 1 (1 Ace .. 13 King), suit = floor(c / 13)
 * (0 spades, 1 hearts, 2 diamonds, 3 clubs). casino-cards.png (casino_writer.card_sheet) has one CARD.w x CARD.h cell per
 * card at column rank - 1, row suit; the back is column 13, row 0. The shell draws them CARD.scale times up.
 */
export type Card = number;
export const CARD_SHEET = "/art/writer/casino-cards.png";
export const CARD = { w: 30, h: 42, cols: 14, rows: 4, back: 13, scale: 2 } as const;
export const rankOf = (c: Card) => (c % 13) + 1;
export const suitOf = (c: Card) => Math.floor(c / 13);
export const SUIT_NAMES = ["spades", "hearts", "diamonds", "clubs"] as const;
export const RANK_NAMES = ["", "Ace", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten", "Jack", "Queen", "King"];
export const cardName = (c: Card) => `${RANK_NAMES[rankOf(c)]} of ${SUIT_NAMES[suitOf(c)]}`;
/** A fresh 52-card deck, shuffled (Fisher-Yates) with the given random source (the sim passes Math.random, as the roulette). */
export function shuffled(rand: () => number): Card[] {
  const d = Array.from({ length: 52 }, (_, i) => i);
  for (let i = d.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [d[i], d[j]] = [d[j], d[i]];
  }
  return d;
}

/**
 * Blackjack: hit or stand; the dealer's hand is dealt face up (one card, then he draws once you stand: no hidden card) and he
 * draws to 16 and stands on every 17; over 21 busts; a two-card 21 is a blackjack and pays 3 to 2 (a push if the dealer makes
 * one too); a win pays even money, a tie is a push. Returns per silver staked, stake included.
 */
export const BJ = { stand: 17, bust: 21, blackjack: 2.5, win: 2, push: 1 } as const;
export function bjValue(cards: readonly Card[]): { total: number; soft: boolean } {
  let total = 0, aces = 0;
  for (const c of cards) {
    const r = rankOf(c);
    total += r === 1 ? 11 : Math.min(10, r);
    if (r === 1) aces++;
  }
  while (total > BJ.bust && aces > 0) { total -= 10; aces--; }
  return { total, soft: aces > 0 };
}
export const isBlackjack = (cards: readonly Card[]) => cards.length === 2 && bjValue(cards).total === 21;
/** The dealer draws from the deck until 17 or more (he stands on every 17). Mutates both arrays. */
export function dealerDraws(dealer: Card[], deck: Card[]): Card[] {
  while (bjValue(dealer).total < BJ.stand && deck.length) dealer.push(deck.pop() as Card);
  return dealer;
}
export type BjResult = "blackjack" | "win" | "push" | "lose" | "bust";
export function bjSettle(you: readonly Card[], dealer: readonly Card[]): BjResult {
  const a = bjValue(you).total, b = bjValue(dealer).total;
  if (a > BJ.bust) return "bust";
  if (isBlackjack(you)) return isBlackjack(dealer) ? "push" : "blackjack";
  if (isBlackjack(dealer)) return "lose";
  if (b > BJ.bust || a > b) return "win";
  return a === b ? "push" : "lose";
}
export const bjPays = (r: BjResult) => (r === "blackjack" ? BJ.blackjack : r === "win" ? BJ.win : r === "push" ? BJ.push : 0);

/**
 * Five-card draw against the dealer: both hands dealt face up, you pick the cards to hold and draw once, then the dealer
 * draws by the house rule (dealerHolds), and the better poker hand wins even money; equal hands push.
 */
export const POKER = { hand: 5, win: 2, push: 1 } as const;
export const HAND_NAMES = ["High card", "Pair", "Two pair", "Three of a kind", "Straight", "Flush", "Full house", "Four of a kind", "Straight flush"];
/** A hand's rank: its category (0 high card .. 8 straight flush) and the tie-break values (aces high; A-2-3-4-5 is a 5-high straight). */
export function pokerRank(cards: readonly Card[]): { cat: number; key: number[]; name: string } {
  const vals = cards.map((c) => (rankOf(c) === 1 ? 14 : rankOf(c))).sort((a, b) => b - a);
  const count = new Map<number, number>();
  for (const v of vals) count.set(v, (count.get(v) ?? 0) + 1);
  const groups = [...count.entries()].sort((a, b) => b[1] - a[1] || b[0] - a[0]);
  const flush = cards.length === 5 && cards.every((c) => suitOf(c) === suitOf(cards[0]));
  const uniq = [...new Set(vals)];
  let high = 0;
  if (uniq.length === 5 && uniq[0] - uniq[4] === 4) high = uniq[0];
  else if (uniq.length === 5 && uniq.join() === "14,5,4,3,2") high = 5;
  const sizes = groups.map((g) => g[1]);
  let cat = 0;
  if (high && flush) cat = 8;
  else if (sizes[0] === 4) cat = 7;
  else if (sizes[0] === 3 && sizes[1] === 2) cat = 6;
  else if (flush) cat = 5;
  else if (high) cat = 4;
  else if (sizes[0] === 3) cat = 3;
  else if (sizes[0] === 2 && sizes[1] === 2) cat = 2;
  else if (sizes[0] === 2) cat = 1;
  const key = high ? [cat, high] : [cat, ...groups.map((g) => g[0])];
  return { cat, key, name: HAND_NAMES[cat] };
}
/** 1 if a beats b, -1 if b beats a, 0 for equal hands. */
export function pokerCompare(a: readonly Card[], b: readonly Card[]): number {
  const x = pokerRank(a).key, y = pokerRank(b).key;
  for (let i = 0; i < Math.max(x.length, y.length); i++) if ((x[i] ?? 0) !== (y[i] ?? 0)) return (x[i] ?? 0) > (y[i] ?? 0) ? 1 : -1;
  return 0;
}
/** The house rule for the dealer's draw: a straight or better stands pat; a pair or more holds its matched cards; four to a flush holds them; else the highest card. */
export function dealerHolds(cards: readonly Card[]): boolean[] {
  const r = pokerRank(cards);
  if (r.cat >= 4) return cards.map(() => true);
  const val = (c: Card) => (rankOf(c) === 1 ? 14 : rankOf(c));
  if (r.cat >= 1) {
    const n = new Map<number, number>();
    for (const c of cards) n.set(val(c), (n.get(val(c)) ?? 0) + 1);
    return cards.map((c) => (n.get(val(c)) ?? 0) >= 2);
  }
  for (let s = 0; s < 4; s++) if (cards.filter((c) => suitOf(c) === s).length === 4) return cards.map((c) => suitOf(c) === s);
  const top = Math.max(...cards.map(val));
  let kept = false;
  return cards.map((c) => (!kept && val(c) === top ? (kept = true) : false));
}
/** Draw once: every card not held is replaced from the deck (in place). */
export function drawOnce(cards: Card[], held: readonly boolean[], deck: Card[]): Card[] {
  for (let i = 0; i < cards.length; i++) if (!held[i] && deck.length) cards[i] = deck.pop() as Card;
  return cards;
}

/** The table on show: the game, the stake, the deck, your hand, the dealer's, your holds, the phase and the last result. Never saved. */
export type CardTable = { game: "blackjack" | "poker"; stake: number; deck: Card[]; you: Card[]; dealer: Card[]; held: boolean[]; phase: "play" | "done"; result: string; paid: number };

/** Velvet Odile's songs: a tip, then each line shows over her for `beat` s while the melody plays (Hz; 0 = rest). */
export const SONG = {
  tip: 2,
  beat: 2.4,
  noteGap: 0.4,
  songs: [
    { name: "Lantern Low", lines: ["The lanterns burn a colder blue,", "the dead keep time with me and you,", "so lay your silver on the felt,", "and lose the way the living felt."], notes: [294, 330, 349, 330, 294, 262, 247, 0, 262, 294, 330, 294, 262, 247, 220, 0] },
    { name: "Grave Moon Waltz", lines: ["Under the grave moon, waltz with me,", "bone on the dice and ash on the sea,", "the house always keeps what the night lends,", "dance till the dark where the candle ends."], notes: [220, 277, 330, 277, 247, 294, 370, 294, 220, 277, 330, 440, 392, 330, 294, 0] },
    { name: "Velvet and Rust", lines: ["Velvet and rust on an old stage floor,", "I sang for a king and I'll sing for more,", "the cards went cold and the wheel went red,", "but a song keeps warm the ones long dead."], notes: [262, 311, 392, 311, 262, 233, 311, 0, 262, 311, 392, 466, 392, 311, 262, 0] },
  ],
} as const;
