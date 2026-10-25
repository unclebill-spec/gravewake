# Gravewake on Google Play: checklist and status

Written in playtest2b (2026-10-17) from Legal Bot's `app_store_plan.md` (2026-10-05). Nothing has been uploaded, signed or submitted to Google Play. Every "Bill" item below needs Bill's own account, identity, money or decision.

Legend: DONE = in the repo and checked; PREPARED = config/script exists, needs Bill's input to finish; BILL = only Bill can do it.

## A. Build and code (Master Builder side)

| # | Item | Status | Where / notes |
|---|---|---|---|
| 1 | Target Android 16 (API 36) | DONE | `android/android/variables.gradle`: `compileSdkVersion = 36`, `targetSdkVersion = 36` (minSdk 24). Google requires API 36 for new apps and updates from 2026-08-31 (Legal Bot §4; the plan mentions a possible extension to 2026-11-01, so 36 is the safe target). A debug APK built clean with it (Capacitor 8.5.3, JDK 21, SDK platform 36 / build-tools 36.0.0; `aapt2 dump badging`: `targetSdkVersion 36`, `compileSdkVersion 36`, 10.5 MB, no INTERNET). |
| 2 | Bundle the game OFFLINE (not the live site) | DONE (build); PREPARED (release) | `android/` is a Capacitor wrapper. `node build-offline.mjs` builds the game at the site root and copies it into `android/www` (about 6.5 MB, 609 files; Play's limit is 200 MB). No service worker, no social-card images, no web install tutorial. `node check-offline.mjs` loads the bundle with every outside request blocked and fails on any outside request, failed or 404 file, page error or console error. The Android manifest declares NO permissions (not even INTERNET). The live site and the GitHub Pages build are unchanged. |
| 3 | Permanent package name | PREPARED; BILL decides | `android/capacitor.config.json` `appId` is `com.gravewake.game`, **proposed, Bill decides**. It can never be changed or reused once an app with it is uploaded. `node set-package.mjs <new.id>` renames it everywhere. Options below. |
| 4 | Remove template login code and p2p | DONE | `src/lib/auth/` (including `preview.ts`), `src/lib/multiplayer/p2p.ts`, `src/lib/app-data/`, `src/lib/db.ts`, `env.server.ts`, the preview-host bridge, the DB migration scripts and their dependencies (better-auth, jose, kysely, pg, PGLite) are gone. Before removing them, a search of `src/` found that nothing in the game imported them; the only live reference was the `AuthProvider` / `PreviewHostBridge` wrapper in `src/routes/__root.tsx`, now removed. The game has no server, database, account or network code. The secret note stays: the template's `PREVIEW_CLIENT_SECRET` value must never be committed (`gh-sync.sh` still scans for the secret's known prefix and the usual token patterns, and now also refuses `.jks`, `.keystore` and `keystore.properties`). |
| 5 | In-game Credits and Licenses | DONE | `src/game/credits.tsx`. Open it from Pause > the **Credits** tab, or Title > Display > **Credits and Licenses** (a row inside the existing Display panel; no new title or HUD button). Lists the brileta-sprites MIT notice in full, Cozy pack (CC0), the code credits, and thanks to the earlier-build packs including **DawnLike (CC-BY 4.0)** and **Scare Crow (CC-BY 3.0)**. Note: those two packs' files were removed from `public/art` in playtest1m, so they are not in this build; they are credited anyway so nothing is owed if they return. Full texts: `LICENSES.md`. |
| 6 | Privacy link inside the app | PREPARED; BILL | The Credits screen has the line "Privacy policy: link to be added before release". Google wants the policy link in the app and in Play Console. No policy page exists yet; the URL must be put in `PRIVACY_LINE` in `src/game/credits.tsx` once Bill publishes it (a plain-text address, not a link: the app makes no network requests). |
| 7 | Release signing | PREPARED; BILL | `android/android/app/build.gradle` reads `android/android/keystore.properties` if it exists. The file and every `.jks` / `.keystore` are git-ignored and must never be committed. Use Play App Signing: Google holds the app signing key, Bill keeps only an upload key. |
| 8 | Build the release bundle (AAB) | PREPARED; BILL | `cd android && npm install && npm run aab:release` once the package name, signing file and `versionCode` are set. Not run: it needs Bill's upload key. |
| 9 | Store graphics | BILL | 512x512 icon, 1024x500 feature graphic, at least 2 screenshots (3+ 16:9 gameplay shots to be eligible for game recommendation slots). The Capacitor project still has Capacitor's default launcher icon and splash: replace them with Gravewake art before upload (`android/android/app/src/main/res/mipmap-*` and `drawable*`). |

## B. Decisions and rating

| Item | Status | Notes |
|---|---|---|
| Content rating: the roulette table is simulated gambling | Noted | Google's published definitions put simulated gambling at ESRB Teen / PEGI 12 / IARC 12+. Answer the IARC questionnaire honestly; the questionnaire sets the rating. Retake it whenever content changes. |
| Target audience | **13+ only** | Choose only 13-15, 16-17 and 18+. Do NOT select any under-13 group and do NOT join the Families program: Families policy lists real or simulated gambling as a violation. Keep store copy and art clearly teen/adult and spooky (cute pixel art can read as aimed at kids). |
| Keep roulette or cut it | BILL | Cutting it would allow a lower rating. Never sell coins usable at the table. |
| Data safety form | Ready to answer "no data collected or shared" | True of this code: no accounts, analytics, ads, crash reporting, network or SDKs; saves stay on the device. Update the form, the policy and the ratings BEFORE adding any of those. |
| Ads | None | Answer "No ads". |
| Price model | BILL | Free app cannot be switched to paid later (Legal Bot §5.6, §8). |

## C. Only Bill can do these

1. Decide the package name (below) and the studio / developer name.
2. Form the Games LLC, get the D-U-N-S number (free, up to ~30 days) and open the Google Play **organization** developer account (US$25 once; ID, organization document, website, phones, payments profile matching D&B exactly). See `/workspace/legal/app_store_plan.md` §1-2.
3. Publish a privacy policy at a public URL (not a PDF) and put its address in the Credits screen.
4. Create the **upload key** and `keystore.properties`, enroll in Play App Signing, build the AAB.
5. Complete the Play Console forms: content rating questionnaire (IARC), target audience 13+, Data safety (no data), Ads (none), app access (no login), contact email, price and countries.
6. Store listing: name (30 chars), short description (80), full description (4,000), icon, feature graphic, screenshots; category Game > Role Playing; support email. Do not name other games; do not write seasonal event dates.
7. Upload to internal testing, then closed testing, then production (an organization account has no 12-tester rule, but a friends-and-family test is still worth it). Play a real phone build first: this wrapper has been built and its bundle tested in a browser with the network blocked, but not run on a device or emulator here.
8. Fail-proof sweep: DONE. The inherited `check:game` was repaired and is green (1061); the full inherited sweep (235 mutations, 2 workers, logs `qa/playtest2b/checks/sweep_*.log`, last written 2026-10-24 13:22 ET) finished 235/235: 197 CAUGHT + 38 CAUGHT(pin-only), 0 missed. This release gate is clear.

## D. Package name options (permanent: choose once)

Rules: lowercase letters, digits and underscores; at least two parts; no hyphens; must be unique on Google Play; reverse-domain is the convention.

| Option | Package name | For | Against |
|---|---|---|---|
| **A (proposed, in the config)** | `com.gravewake.game` | Short, brand-based, easy to say. Fine if Bill registers `gravewake.com` (or never needs a domain match). | Ideally needs a domain he controls; if the LLC later wants one studio namespace for several games, this does not give it. Availability on Play is not verified. |
| B | `com.<studio-domain>.gravewake` (for example `com.<studio>.gravewake` with the Games LLC's own domain) | What Legal Bot recommends ("reverse-domain based on the studio domain plus `.gravewake`"): one namespace for every later game, and it matches the publisher on the listing. | Blocked until the LLC name and studio domain are chosen. |
| C | `io.github.unclebill_spec.gravewake` | Works today with no domain; mirrors the Pages URL he already owns. | Ties a permanent id to a personal GitHub handle, awkward once the LLC is the publisher; reads as hobby project. |

Recommendation: B if the studio domain will be settled within a few weeks (the D-U-N-S wait gives time); otherwise A. Avoid C for a paid or LLC-published game.
