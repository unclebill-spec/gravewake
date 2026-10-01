// Bundle a TypeScript entry with esbuild (the same `npx esbuild` the game's check suite uses) and import it.
// Each call writes a fresh file, so two calls give two separate module instances.
import { execFileSync } from "node:child_process";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

let n = 0;

/** source: TypeScript text with imports relative to `dir`. Returns the imported module. */
export async function load(source, dir) {
  const tmp = mkdtempSync(join(tmpdir(), "map-writer-"));
  const entry = join(dir, `.map-writer-entry-${process.pid}-${n}.ts`);
  const file = join(tmp, `bundle-${n++}.mjs`);
  writeFileSync(entry, source);
  try {
    execFileSync("npx", ["esbuild", entry, "--bundle", "--platform=node", "--format=esm", "--log-level=warning", `--outfile=${file}`], { stdio: ["ignore", "ignore", "inherit"] });
  } finally {
    execFileSync("rm", ["-f", entry]);
  }
  return import(pathToFileURL(file).href);
}
