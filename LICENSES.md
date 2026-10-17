# Gravewake: third-party licenses (playtest2b, 2026-10-17)

The in-game screen (Pause > Credits, or Title > Display > Credits and Licenses) is `src/game/credits.tsx`. Keep the two in step.

## Art that ships in this build

| Pack | Used for | Author | License | Where |
|---|---|---|---|---|
| brileta-sprites | trees (and their season tints) | Mark Ayzenshtat | MIT (full notice below) | `public/art/brileta/trees.png`, `public/art/brileta/CREDITS.txt`, `tools/brileta-sprites/LICENSE` |
| Cozy asset pack 1.0 | town / sand / camp trees (and their season tints) | Ishtar Pixels | CC0 1.0 | `public/art/held/trees.png`, `public/art/held/HELD.txt` |

Everything else is drawn in code by the game's own writers (`tools/*`). Sound and music are synthesized in code (`src/game/audio.ts`); no audio files. Text uses the device's own serif fonts; no font files ship.

### brileta-sprites (MIT)

```
MIT License

Copyright (C) 2026 Mark Ayzenshtat

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
```

## Packs used by earlier test builds (NOT in this build)

These were removed from `public/art` in playtest1m (2026-10-03; `scripts/frozen/playtest1m/removed-art.json`). They are credited in the game anyway, with their license names, so nothing is owed if one is ever put back. **If any of them is re-added, its attribution is mandatory (the two CC-BY ones) and its sheet must come back with its license file.**

| Pack | Author | License |
|---|---|---|
| DawnLike 16x16 Universal Rogue-like tileset v1.81 (palette by DawnBringer) | DragonDePlatino | **CC-BY 4.0** (attribution required) |
| Scare Crow | TanBoonHing | **CC-BY 3.0** (attribution required) |
| Halloween pixel art tileset, top down (Land of Pixels) | marceles | free for games; no resale of the sheets |
| Tiny Creatures | Clint Bellanger | CC0 |
| Pixel Art Spells | DevWizard | CC0 |
| Pumpkin Garden | NettySvit | CC0 |
| Horses, Arne16 | DualR, edited by zwonky | CC0 |
| Grass and ground textures (brown_grass_16) | AV Reference | CC0 |

## Code in the game's bundle

Direct production dependencies from `package.json` (versions as installed 2026-10-17). `lightningcss` and `typescript` are build-time tools and are not in the shipped bundle. Before a Play release, regenerate the full transitive notices (for example `npx license-checker --production --csv`) and keep them with the release; the table below lists direct dependencies only.

| Package | Version | License | Copyright line (from its LICENSE file) |
|---|---|---|---|
| @hookform/resolvers | 5.9.1 | MIT | Copyright (c) 2019-present Beier(Bill) Luo |
| @radix-ui/react-accordion | 1.2.20 | MIT | Copyright (c) 2022 WorkOS |
| @radix-ui/react-alert-dialog | 1.1.23 | MIT | Copyright (c) 2022 WorkOS |
| @radix-ui/react-avatar | 1.2.6 | MIT | Copyright (c) 2022 WorkOS |
| @radix-ui/react-checkbox | 1.3.11 | MIT | Copyright (c) 2022 WorkOS |
| @radix-ui/react-collapsible | 1.1.20 | MIT | Copyright (c) 2022 WorkOS |
| @radix-ui/react-dialog | 1.1.23 | MIT | Copyright (c) 2022 WorkOS |
| @radix-ui/react-dropdown-menu | 2.1.24 | MIT | Copyright (c) 2022 WorkOS |
| @radix-ui/react-label | 2.1.15 | MIT | Copyright (c) 2022 WorkOS |
| @radix-ui/react-popover | 1.1.23 | MIT | Copyright (c) 2022 WorkOS |
| @radix-ui/react-progress | 1.1.16 | MIT | Copyright (c) 2022 WorkOS |
| @radix-ui/react-radio-group | 1.4.7 | MIT | Copyright (c) 2022 WorkOS |
| @radix-ui/react-scroll-area | 1.2.18 | MIT | Copyright (c) 2022 WorkOS |
| @radix-ui/react-select | 2.3.7 | MIT | Copyright (c) 2022 WorkOS |
| @radix-ui/react-separator | 1.1.15 | MIT | Copyright (c) 2022 WorkOS |
| @radix-ui/react-slider | 1.4.7 | MIT | Copyright (c) 2022 WorkOS |
| @radix-ui/react-slot | 1.3.3 | MIT | Copyright (c) 2022 WorkOS |
| @radix-ui/react-switch | 1.3.7 | MIT | Copyright (c) 2022 WorkOS |
| @radix-ui/react-tabs | 1.1.21 | MIT | Copyright (c) 2022 WorkOS |
| @radix-ui/react-toggle | 1.1.18 | MIT | Copyright (c) 2022 WorkOS |
| @radix-ui/react-toggle-group | 1.1.19 | MIT | Copyright (c) 2022 WorkOS |
| @radix-ui/react-tooltip | 1.2.16 | MIT | Copyright (c) 2022 WorkOS |
| @tailwindcss/vite | 4.3.3 | MIT | Copyright (c) Tailwind Labs, Inc. |
| @tanstack/react-query | 5.103.2 | MIT | Copyright (c) 2021-present Tanner Linsley |
| @tanstack/react-router | 1.170.39 | MIT | Copyright (c) 2021-present Tanner Linsley |
| @tanstack/react-start | 1.168.58 | MIT | Copyright (c) 2021-present Tanner Linsley |
| @tanstack/react-table | 8.21.3 | MIT | Copyright (c) 2016 Tanner Linsley |
| @tanstack/router-plugin | 1.168.40 | MIT | Copyright (c) 2021-present Tanner Linsley |
| @vitejs/plugin-react | 5.2.0 | MIT | Copyright (c) 2019-present, Yuxi (Evan) You and Vite contributors |
| class-variance-authority | 0.7.1 | Apache-2.0 | "Licensor" shall mean the copyright owner or entity authorized by |
| clsx | 2.1.1 | MIT | Copyright (c) Luke Edwards <luke.edwards05@gmail.com> (lukeed.com) |
| cmdk | 1.1.1 | MIT | Copyright (c) 2022 Paco Coursey |
| date-fns | 4.4.0 | MIT | Copyright (c) 2021 Sasha Koss and Lesha Koss https://kossnocorp.mit-license.org |
| lightningcss | 1.33.0 | MPL-2.0 | applicable copyright doctrines of fair use, fair dealing, or other |
| lucide-react | 0.510.0 | ISC | Copyright (c) for portions of Lucide are held by Cole Bemis 2013-2022 as part of Feather (MIT). All other copyright (c) for Lucide are held by Lucide Contributors 2022. |
| nitro | 3.0.260610-beta | MIT | Copyright (c) Pooya Parsa <pooya@pi0.io> and Nitro contributors |
| react | 19.3.0 | MIT | Copyright (c) Meta Platforms, Inc. and affiliates. |
| react-day-picker | 9.14.0 | MIT | Copyright (c) 2014-2025 Giampaolo Bellavite <io@gpbl.dev> and contributors |
| react-dom | 19.3.0 | MIT | Copyright (c) Meta Platforms, Inc. and affiliates. |
| react-hook-form | 7.88.0 | MIT | Copyright (c) 2019-present Beier(Bill) Luo |
| react-resizable-panels | 4.13.3 | MIT | Copyright (c) 2018 Brian Vaughn |
| recharts | 2.15.4 | MIT | Copyright (c) 2015-present recharts |
| sonner | 2.0.8 | MIT | Copyright (c) 2023 Emil Kowalski |
| tailwind-merge | 3.7.0 | MIT | Copyright (c) 2021 Dany Castillo |
| tailwindcss | 4.3.3 | MIT | Copyright (c) Tailwind Labs, Inc. |
| tw-animate-css | 1.4.0 | MIT | Copyright (c) 2025 Wombosvideo |
| typescript | 5.9.3 | Apache-2.0 | "Licensor" shall mean the copyright owner or entity authorized by the copyright owner that is granting the License. |
| vaul | 1.1.2 | MIT | Copyright (c) 2023 Emil Kowalski |
| vite | 8.3.1 | MIT | Copyright (c) 2019-present, VoidZero Inc. and Vite contributors |
| zod | 4.6.5 | MIT | Copyright (c) 2025 Colin McDonnell |
| zustand | 5.0.15 | MIT | Copyright (c) 2019 Paul Henschel |
