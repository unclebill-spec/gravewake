/* eslint-disable react-refresh/only-export-components -- playtest2b: the credits data and the screen live together on purpose (one file, no fast-refresh needed) */
/**
 * playtest2b [OWNER-APPROVED 2026-10-17 01:38 ET: Play Store cleanup per Legal Bot recs]: the in-game Credits and Licenses
 * screen, opened from the title (Credits) and from the pause menu (the Credits tab). Every credit here was checked against the
 * license files that ship (public/art/brileta/CREDITS.txt + tools/brileta-sprites/LICENSE, public/art/held/HELD.txt): only
 * two third-party packs still ship art, both as tree sheets the pixel writer also tints for the seasons. The packs the game
 * used before playtest1m removed their files (scripts/frozen/playtest1m/removed-art.json) are thanked in their own block,
 * marked as not in this version. Addresses are plain text, never links: the game makes no network requests.
 */
import type { ReactNode } from "react";

export type Credit = { id: string; what: string; title: string; author: string; license: string; url: string; files: string[] };

/** Third-party art in this build (each file listed ships in public/art). */
export const CREDITS_ART: readonly Credit[] = [
  {
    id: "brileta",
    what: "Trees of the wild (and their season tints)",
    title: "brileta-sprites",
    author: "Mark Ayzenshtat",
    license: "MIT License (full notice below)",
    url: "https://github.com/mayz/brileta-sprites",
    files: ["public/art/brileta/trees.png"],
  },
  {
    id: "cozy",
    what: "Trees in town, on the sand and at the camp (and their season tints)",
    title: "Cozy asset pack 1.0",
    author: "Ishtar Pixels",
    license: "CC0 1.0 (public domain)",
    url: "https://opengameart.org/content/cozy-asset-pack-10",
    files: ["public/art/held/trees.png"],
  },
];

/** Everything that is not a pack. */
export const CREDITS_INHOUSE =
  "Everything else you see is drawn in code by Gravewake's own pixel, sprite, spell and map writers. Music and sound are synthesized in code. Text uses the two fonts below.";

/** batch7: the game's maker (the end-credits roll opens with this). */
export const CREATOR = "Bill Weathersbee";

/** batch7: the menu fonts (both SIL Open Font License 1.1; texts in src/menus/art/OFL-*.txt). */
export const CREDITS_FONTS: readonly { name: string; author: string; license: string; url: string }[] = [
  { name: "Jacquarda Bastarda 9", author: "The Soft Type Project Authors", license: "SIL Open Font License 1.1", url: "https://github.com/scfried/soft-type-jacquarda-bastarda" },
  { name: "Pixelify Sans", author: "The Pixelify Sans Project Authors", license: "SIL Open Font License 1.1", url: "https://github.com/eifetx/Pixelify-Sans" },
];

/** batch7: the tools the game is built with (not shipped in the bundle). */
export const CREDITS_TOOLS: readonly { name: string; license: string }[] = [
  { name: "TypeScript (Microsoft)", license: "Apache-2.0" },
  { name: "Vite (VoidZero Inc. and Vite contributors)", license: "MIT" },
  { name: "esbuild (Evan Wallace)", license: "MIT" },
  { name: "Playwright (Microsoft)", license: "Apache-2.0" },
];

/** Packs used by earlier test builds; none of their files ship (removed in playtest1m, 2026-10-03). */
export const CREDITS_EARLIER: readonly Omit<Credit, "files" | "what">[] = [
  { id: "dawnlike", title: "DawnLike 16x16 Universal Rogue-like tileset v1.81", author: "DragonDePlatino, palette by DawnBringer", license: "CC-BY 4.0", url: "https://opengameart.org/content/dawnlike-16x16-universal-rogue-like-tileset-v181" },
  { id: "scarecrow", title: "Scare Crow", author: "TanBoonHing", license: "CC-BY 3.0", url: "https://opengameart.org/content/scare-crow" },
  { id: "landofpixels", title: "Land of Pixels Halloween tileset", author: "marceles", license: "free for games, no resale of the sheets", url: "https://opengameart.org/content/halloween-pixel-art-tileset-top-down" },
  { id: "tinycreatures", title: "Tiny Creatures", author: "Clint Bellanger", license: "CC0", url: "https://opengameart.org/content/tiny-creatures" },
  { id: "spells", title: "Pixel Art Spells", author: "DevWizard", license: "CC0", url: "https://opengameart.org/content/pixel-art-spells" },
  { id: "pumpkin", title: "Pumpkin Garden", author: "NettySvit", license: "CC0", url: "https://opengameart.org/content/pumpkin-garden-tiles" },
  { id: "horses", title: "Horses - Arne16", author: "original art by DualR, edited by zwonky", license: "CC0", url: "https://opengameart.org/content/horses-arne16" },
  { id: "grass", title: "Grass and ground textures (brown_grass_16)", author: "AV Reference", license: "CC0", url: "https://opengameart.org/content/grass-and-ground-textures" },
];

/** tools/brileta-sprites/LICENSE, word for word (the MIT terms ask for the notice in every copy). */
export const BRILETA_MIT = `MIT License

Copyright (C) 2026 Mark Ayzenshtat

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.`;

/** Open-source code inside the game's own bundle (all MIT; full texts in LICENSES.md). */
export const CREDITS_SOFTWARE: readonly { name: string; license: string }[] = [
  { name: "React and React DOM (Meta Platforms, Inc. and affiliates)", license: "MIT" },
  { name: "TanStack Router and TanStack Start (Tanner Linsley)", license: "MIT" },
  { name: "Tailwind CSS (Tailwind Labs, Inc.)", license: "MIT" },
];

/** No policy page exists yet; the URL goes here before the Play release (do not invent one). */
export const PRIVACY_LINE = "Privacy policy: link to be added before release";

function Block({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <h3 className="font-display text-base text-primary">{title}</h3>
      {children}
    </div>
  );
}

/** The screen's body: used in the title's Credits panel and the pause menu's Credits tab. */
export function CreditsBody({ onClose }: { onClose?: () => void }) {
  return (
    <div data-testid="credits" className="flex flex-col gap-3 text-sm select-text">
      <div className="flex items-center justify-between gap-2">
        <h2 className="font-display text-xl">Credits and Licenses</h2>
        {onClose ? (
          <button type="button" data-testid="credits-close" data-padback className="h-10 rounded border border-primary bg-bg px-3 text-xs" onClick={onClose}>
            Close
          </button>
        ) : null}
      </div>
      <Block title="Art">
        <ul className="flex flex-col gap-2">
          {CREDITS_ART.map((c) => (
            <li key={c.id} data-testid={`credit-${c.id}`}>
              <div>{c.what}</div>
              <div className="text-muted">
                {c.title} by {c.author}. {c.license}.
              </div>
              <div className="text-xs break-all text-muted">{c.url}</div>
            </li>
          ))}
        </ul>
        <p className="text-muted">{CREDITS_INHOUSE}</p>
      </Block>
      <Block title="Fonts">
        <ul className="flex flex-col gap-1 text-muted" data-testid="credits-fonts">
          {CREDITS_FONTS.map((f) => (
            <li key={f.name}>
              {f.name} by {f.author}. {f.license}. <span className="text-xs break-all">{f.url}</span>
            </li>
          ))}
        </ul>
      </Block>
      <Block title="brileta-sprites license">
        <pre data-testid="credits-mit" className="text-xs leading-snug whitespace-pre-wrap text-muted">{BRILETA_MIT}</pre>
      </Block>
      <Block title="Code">
        <ul className="flex flex-col gap-1 text-muted">
          {CREDITS_SOFTWARE.map((s) => (
            <li key={s.name}>
              {s.name}: {s.license} License.
            </li>
          ))}
        </ul>
      </Block>
      <Block title="Built with">
        <ul className="flex flex-col gap-1 text-muted">
          {CREDITS_TOOLS.map((s) => (
            <li key={s.name}>
              {s.name}: {s.license} License.
            </li>
          ))}
        </ul>
      </Block>
      <Block title="With thanks (earlier builds)">
        <p className="text-xs text-muted">These packs were in earlier test builds. None of their art is in this version.</p>
        <ul className="flex flex-col gap-1 text-xs text-muted" data-testid="credits-earlier">
          {CREDITS_EARLIER.map((c) => (
            <li key={c.id} data-testid={`credit-${c.id}`}>
              {c.title} by {c.author}. {c.license}. <span className="break-all">{c.url}</span>
            </li>
          ))}
        </ul>
      </Block>
      <p data-testid="credits-privacy" className="text-muted">
        {PRIVACY_LINE}
      </p>
    </div>
  );
}

/** batch7: the end-credits roll after the epilogue: the maker first, then every credit, scrolling up on its own. */
export function CreditsRoll() {
  return (
    <div data-testid="credits-roll" className="gw-roll relative h-56 overflow-hidden" aria-live="off">
      <div className="gw-roll-track flex flex-col items-center gap-4 text-center">
        <p className="font-display text-2xl text-primary">Gravewake</p>
        <div>
          <p className="text-xs uppercase tracking-widest text-muted">Created by</p>
          <p data-testid="credits-creator" className="font-display text-xl">{CREATOR}</p>
        </div>
        <p className="text-sm">Thank you for keeping the vale company.</p>
        <div className="text-left"><CreditsBody /></div>
        <p className="font-display text-lg text-primary">The bells are quiet now.</p>
      </div>
    </div>
  );
}
