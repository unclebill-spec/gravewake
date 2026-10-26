// Rift-confirm batch (B), 2026-10-26: group mimicpage. The bestiary has one Mimic page in the book's format.
import { readFileSync } from "node:fs";

export async function run(check) {
  const src = readFileSync("src/game/BookPages.tsx", "utf8");
  const sim = readFileSync("src/game/sim.ts", "utf8");
  const lore = /lore: "The lid shudders\. The chest has teeth\. A mimic wakes\./.test(src) && sim.includes("The lid shudders. The chest has teeth. A mimic wakes.");
  const sprite = /mimic: "\/art\/sprites\/mimic\.png"/.test(src) && /<FoeCell family="mimic" rank="rare"/.test(src);
  const page = /data-testid="book-mimic"/.test(src) && /data-book=\{MIMIC_PAGE\.key\}/.test(src) && /tells: "[^"]+0\.35 s tell/.test(src) && /MIMIC_PAGE\.tells/.test(src);
  const book = readFileSync("src/game/book.ts", "utf8");
  const noKey = !/mimic/.test(book.match(/BOOK_FAMILIES = \[[^\]]*\]/)[0]);
  check("mimicpage", "bestiary: one Mimic page (its mimic.png sprite, name, the game's own wake line as lore, its sleeping and bite tells) in the book's cell format; not a book key, so the count, badges and save are unchanged", lore && sprite && page && noKey, JSON.stringify({ lore, sprite, page, noKey }));
  // gw-followup-1026 (b): tapping the bottom Mimic tile scrolls its notes into view (browser: qa/followup/mimic_scroll.py).
  const scroll = /ref=\{infoRef\}[^>]*data-testid="book-info"/.test(src) && /if \(pick === MIMIC_PAGE\.key\) infoRef\.current\?\.scrollIntoView/.test(src);
  check("mimicpage", "bestiary: tapping the bottom Mimic tile scrolls the notes text (book-info) into view", scroll);
}
