#!/usr/bin/env node
/**
 * playtest2b: change the Android package name (applicationId) everywhere it lives.
 *   node set-package.mjs com.example.gravewake
 * The package name is PERMANENT once an app with it is uploaded to Google Play, so Bill decides it (docs/PLAY_STORE.md has the
 * options). Run this BEFORE the first Play upload; then `npm run sync`. Touches: capacitor.config.json, app/build.gradle,
 * strings.xml, MainActivity.java (and its package folder).
 */
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const next = process.argv[2];
if (!next || !/^[a-z][a-z0-9_]*(\.[a-z][a-z0-9_]*)+$/.test(next)) {
  console.error("usage: node set-package.mjs <reverse.domain.name>   (lowercase letters, digits, underscores; at least two parts)");
  process.exit(2);
}
const cfgPath = join(here, "capacitor.config.json");
const cfg = JSON.parse(readFileSync(cfgPath, "utf8"));
const old = cfg.appId;
if (old === next) { console.log(`already ${next}`); process.exit(0); }
cfg.appId = next;
if (typeof cfg._appIdStatus === "string") cfg._appIdStatus = `SET by set-package.mjs to ${next}. Confirm with Bill that this is his decision: it is permanent on Google Play.`;
writeFileSync(cfgPath, JSON.stringify(cfg, null, 2) + "\n");

const app = join(here, "android", "app");
const sub = (file, pairs) => {
  if (!existsSync(file)) return;
  let s = readFileSync(file, "utf8");
  for (const [a, b] of pairs) s = s.split(a).join(b);
  writeFileSync(file, s);
};
sub(join(app, "build.gradle"), [[`namespace = "${old}"`, `namespace = "${next}"`], [`applicationId "${old}"`, `applicationId "${next}"`]]);
sub(join(app, "src/main/res/values/strings.xml"), [[`>${old}<`, `>${next}<`]]);
const javaRoot = join(app, "src/main/java");
const oldDir = join(javaRoot, ...old.split("."));
const newDir = join(javaRoot, ...next.split("."));
if (existsSync(join(oldDir, "MainActivity.java"))) {
  const src = readFileSync(join(oldDir, "MainActivity.java"), "utf8").replace(`package ${old};`, `package ${next};`);
  rmSync(join(oldDir, "MainActivity.java"));
  mkdirSync(newDir, { recursive: true });
  writeFileSync(join(newDir, "MainActivity.java"), src);
  // prune the emptied old package folders
  for (let d = oldDir; d !== javaRoot && existsSync(d) && readdirSync(d).length === 0; d = dirname(d)) rmSync(d, { recursive: true });
}
console.log(`package name ${old} -> ${next}. Now: npm run sync`);
