// new-resources (HD-2D Cozy Builder, 2026-10-23): runs the art check under npm test.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { scan, problems, measure } from "./art-check.mjs";

test("art check: no sprite PNG under public/art breaks the colour, alpha or outline rules past its baseline", () => {
  const base = JSON.parse(readFileSync(new URL("./art-baseline.json", import.meta.url), "utf8")).files;
  assert.deepEqual(problems(scan(), base), []);
});

test("art check catches a soft pixel, too many colours and a missing outline", () => {
  const w = 8, h = 8, rgba = new Uint8Array(w * h * 4);
  for (let y = 1; y < 7; y++) for (let x = 1; x < 7; x++) rgba.set([200, 180 + x, 40 + y * 9, 255], (y * w + x) * 4);
  rgba[(3 * w + 3) * 4 + 3] = 128;
  const m = measure({ w, h, rgba });
  assert.equal(m.semi, 1);
  assert.equal(m.outline, 0);
  const all = { "x/a.png": { colours: 25, semi: 1, outline: 0 }, "x/b.png": { colours: 5, semi: 0, outline: 1 }, "x/c.png": { colours: 5, semi: 0, outline: 1 }, "x/d.png": { colours: 5, semi: 0, outline: 1 }, "x/e.png": { colours: 5, semi: 0, outline: 1 } };
  assert.equal(problems(all, {}).length, 3);
  assert.equal(problems(all, { "x/a.png": { colours: 25, semi: 1, noOutline: true } }).length, 0);
});
