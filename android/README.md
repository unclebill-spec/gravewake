# Gravewake for Android (Capacitor, offline bundle) — playtest2b

[OWNER-APPROVED 2026-10-17 01:38 ET: Play Store cleanup per Legal Bot recs] Preparation only. Nothing here has been signed, uploaded or submitted to Google Play. See `../docs/PLAY_STORE.md` for the checklist, the package-name options and what only Bill can do.

- **Offline**: the game is built at the site root and copied into `www/` (about 6.5 MB). The app loads it from the device (https://localhost inside the WebView), makes no network requests, declares no Android permissions and carries no SDKs.
- **Target API 36** (Android 16): `android/variables.gradle` (`compileSdkVersion = 36`, `targetSdkVersion = 36`, minSdk 24).
- **Package name**: `capacitor.config.json` `appId` = `com.gravewake.game` is **proposed, Bill decides** (permanent on Google Play). `node set-package.mjs <new.id>` changes it everywhere.

## Commands (Node 22; from this folder)

| Command | What |
|---|---|
| `npm install` | install Capacitor 8 (the game's own `package.json` does not carry it) |
| `npm run bundle` | build the game and write `www/` (`build-offline.mjs`) |
| `npm run check:offline` | open `www/` on the Phone preset with every outside request blocked; fails on any outside request, failed file, page error or console error |
| `npm run sync` | bundle, then `cap sync android` |
| `npm run apk:debug` | bundle, sync, `gradlew assembleDebug` (needs JDK 21 and the Android SDK, platform 36; set `JAVA_HOME`, `ANDROID_HOME`) |
| `npm run aab:release` | the Play bundle; needs `android/keystore.properties` (the upload key; git-ignored, never commit it) |

The live site and the GitHub Pages build never see any of this: `build-offline.mjs` never sets `GRAVEWAKE_BASE`.

Before adding INTERNET, a plugin or any SDK: update the privacy policy and the Play Data safety form first.
