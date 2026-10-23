/**
 * batch7 [OWNER-APPROVED 2026-10-23 Bill: bestiary book + achievements]: the pause menu's Bestiary and Badges tabs and
 * the badge toast. Foes are drawn from the existing sheets (foes.png stand pose, 16x32 cells; the festival sheets for
 * the Pumpkin Lord and Krampus); an entry not yet defeated is the same cell as a black silhouette.
 */
import { useState } from "react";
import { BADGES, BOOK_FAMILIES, BOOK_RANKS, BOOK_SPECIALS, BOOK_TOTAL, FAMILY_LABEL, RANK_LABEL, SHEET_RANK, bookReachable } from "./book";

const FOES = "/art/sprites/foes.png";
const OWN_SHEET: Record<string, string> = { krampus: "/art/sprites/krampus.png", pumpkinlord: "/art/sprites/pumpkin-lord.png" };

/** One 16x32 sprite cell, scaled `s` times, pixelated; `seen` false draws it as a silhouette. */
export function FoeCell({ family, rank, seen, s = 2 }: { family: string; rank: (typeof BOOK_RANKS)[number]; seen: boolean; s?: number }) {
  const own = OWN_SHEET[family];
  const fi = (BOOK_FAMILIES as readonly string[]).indexOf(family);
  const col = own ? 0 : (Math.max(0, fi) * 4 + SHEET_RANK[rank]) * 11;
  const width = own ? 176 : 11968;
  return (
    <span
      aria-hidden="true"
      data-seen={seen ? "1" : "0"}
      className="inline-block shrink-0"
      style={{
        width: 16 * s,
        height: 32 * s,
        backgroundImage: `url(${own ?? FOES})`,
        backgroundSize: `${width * s}px ${32 * s}px`,
        backgroundPosition: `-${col * 16 * s}px 0`,
        imageRendering: "pixelated",
        filter: seen ? "none" : "brightness(0) opacity(0.55)",
      }}
    />
  );
}

export function BookPage({ book }: { book: readonly string[] }) {
  const have = new Set(book);
  const [pick, setPick] = useState<string>("");
  const filled = book.filter((k) => !k.includes(":") || k.startsWith("s:") || bookReachable(k.split(":")[0], k.split(":")[1] as (typeof BOOK_RANKS)[number])).length;
  const info = (() => {
    if (!pick) return "Tap an entry. A silhouette is one you have not put to rest yet.";
    if (pick.startsWith("s:")) {
      const d = BOOK_SPECIALS.find((x) => `s:${x.id}` === pick);
      return d ? (have.has(pick) ? `${d.name}. ${FAMILY_LABEL[d.family] ?? d.family} kin. Health ${d.hp}, attack ${d.atk}, armour ${d.ac}. ${d.boss ? "A named boss." : "A guard of the deep floors."}` : "??? Not yet defeated.") : "";
    }
    const [f, r] = pick.split(":") as [string, (typeof BOOK_RANKS)[number]];
    if (!bookReachable(f, r)) return `${FAMILY_LABEL[f]} · ${RANK_LABEL[r]}: not in the vale yet.`;
    return have.has(pick) ? `${FAMILY_LABEL[f]} · ${RANK_LABEL[r]}. Put to rest.` : `??? · ${RANK_LABEL[r]}. Not yet defeated.`;
  })();
  return (
    <div className="flex flex-col gap-2 text-xs" data-testid="bestiary">
      <p className="text-muted" data-testid="book-count">Bestiary {filled} / {BOOK_TOTAL}</p>
      <p className="min-h-[2.5em] text-sm" data-testid="book-info">{info}</p>
      <div className="grid gap-1" style={{ gridTemplateColumns: "auto repeat(4, minmax(0, 1fr))" }}>
        <span />
        {BOOK_RANKS.map((r) => (
          <span key={r} className="text-center text-[10px] text-muted">{RANK_LABEL[r]}</span>
        ))}
        {BOOK_FAMILIES.map((f) => [
          <span key={f} className="self-center text-[10px] text-muted">{have.has(`${f}:mob`) || BOOK_RANKS.some((r) => have.has(`${f}:${r}`)) ? FAMILY_LABEL[f] : "???"}</span>,
          ...BOOK_RANKS.map((r) => {
            const k = `${f}:${r}`;
            const ok = bookReachable(f, r);
            return (
              <button key={k} type="button" data-book={k} disabled={!ok} className={`flex justify-center rounded border px-0 py-1 disabled:opacity-25 ${pick === k ? "border-primary" : "border-border"}`} onClick={() => setPick(k)}>
                <FoeCell family={f} rank={r} seen={have.has(k)} s={1.5} />
              </button>
            );
          }),
        ])}
      </div>
      <p className="mt-1 text-muted">Named foes</p>
      <div className="grid grid-cols-6 gap-1">
        {BOOK_SPECIALS.map((d) => {
          const k = `s:${d.id}`;
          return (
            <button key={k} type="button" data-book={k} title={have.has(k) ? d.name : "???"} className={`flex flex-col items-center rounded border px-0 py-1 ${pick === k ? "border-primary" : "border-border"}`} onClick={() => setPick(k)}>
              <FoeCell family={d.family} rank={d.boss ? "boss" : "mini"} seen={have.has(k)} s={1.5} />
              <span className="mt-0.5 w-full truncate text-center text-[9px]">{have.has(k) ? d.name : "???"}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function BadgesPage({ badges }: { badges: readonly string[] }) {
  return (
    <div className="flex flex-col gap-1 text-xs" data-testid="badges">
      <p className="text-muted">Badges {badges.filter((b) => BADGES.some((x) => x.id === b)).length} / {BADGES.length}</p>
      <div className="grid grid-cols-2 gap-1">
        {BADGES.map((b) => {
          const got = badges.includes(b.id);
          return (
            <button type="button" key={b.id} data-badge={b.id} data-got={got ? "1" : "0"} aria-label={`${b.name}: ${b.desc}${got ? " (earned)" : ""}`} className={`gw-badge rounded border px-2 py-1 text-left ${got ? "border-primary" : "border-border opacity-50"}`}>
              <div className="font-display text-sm">{got ? "★ " : "☆ "}{b.name}</div>
              <div className="text-muted">{b.desc}</div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/** The newest badge earned in the last 3.5 s, as a toast at the top of the screen. */
export function BadgeToast({ toasts }: { toasts: readonly { id: string; name: string; desc: string; at: number }[] }) {
  const now = Date.now();
  const live = toasts.filter((t) => now - t.at < 3500);
  if (!live.length) return null;
  const t = live[live.length - 1];
  return (
    <div data-testid="badge-toast" className="gw-panel gw-toast pointer-events-none absolute top-3 left-1/2 z-40 -translate-x-1/2 rounded border border-border bg-surface/95 px-4 py-2 text-center">
      <div className="text-[10px] uppercase tracking-widest text-muted">Badge earned</div>
      <div className="font-display text-base text-primary">★ {t.name}</div>
      <div className="text-xs text-muted">{t.desc}</div>
    </div>
  );
}
