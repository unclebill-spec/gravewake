#!/usr/bin/env node
// new-resources [OWNER-APPROVED 2026-10-23, HD-2D Cozy Builder]: art check for sprite PNGs under public/art.
// A PNG fails when it has more than 20 colours, any semi-transparent pixel, or no dark outline where its folder's
// art has one. Art that already broke a rule on 2026-10-23 is in scripts/art-baseline.json and may not get worse.
// `node scripts/art-check.mjs` checks; `node scripts/art-check.mjs --baseline` rewrites the baseline (art untouched).
import { readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { join, relative, dirname } from "node:path";
import { inflateSync } from "node:zlib";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const ART = join(ROOT, "public/art");
const BASE = join(ROOT, "scripts/art-baseline.json");
export const MAX_COLOURS = 20;
const OUTLINE_DARK = 110; // luma at or under this counts as a dark outline pixel
const OUTLINE_MIN = 0.5; // share of silhouette-edge pixels that must be dark

export function decodePng(buf) {
  if (buf.readUInt32BE(0) !== 0x89504e47) throw new Error("not a png");
  let p = 8, w = 0, h = 0, depth = 0, type = 0, inter = 0, pal = null, trns = null;
  const idat = [];
  while (p < buf.length) {
    const len = buf.readUInt32BE(p), kind = buf.toString("ascii", p + 4, p + 8), d = buf.subarray(p + 8, p + 8 + len);
    if (kind === "IHDR") { w = d.readUInt32BE(0); h = d.readUInt32BE(4); depth = d[8]; type = d[9]; inter = d[12]; }
    else if (kind === "PLTE") pal = d;
    else if (kind === "tRNS") trns = d;
    else if (kind === "IDAT") idat.push(d);
    else if (kind === "IEND") break;
    p += 12 + len;
  }
  if (inter) throw new Error("interlaced png");
  const ch = { 0: 1, 2: 3, 3: 1, 4: 2, 6: 4 }[type];
  const bpp = Math.max(1, (ch * depth) >> 3), stride = (w * ch * depth + 7) >> 3;
  const raw = inflateSync(Buffer.concat(idat)), out = Buffer.alloc(stride * h);
  for (let y = 0; y < h; y++) {
    const f = raw[y * (stride + 1)], src = y * (stride + 1) + 1, row = y * stride;
    for (let x = 0; x < stride; x++) {
      const a = x >= bpp ? out[row + x - bpp] : 0, b = y ? out[row - stride + x] : 0, c = x >= bpp && y ? out[row - stride + x - bpp] : 0;
      let v = raw[src + x];
      if (f === 1) v += a; else if (f === 2) v += b; else if (f === 3) v += (a + b) >> 1;
      else if (f === 4) { const pp = a + b - c, pa = Math.abs(pp - a), pb = Math.abs(pp - b), pc = Math.abs(pp - c); v += pa <= pb && pa <= pc ? a : pb <= pc ? b : c; }
      out[row + x] = v & 255;
    }
  }
  const rgba = new Uint8Array(w * h * 4), max = (1 << depth) - 1;
  const sample = (row, i) => depth === 8 ? out[row + i] : depth === 16 ? out[row + i * 2] : (out[row + ((i * depth) >> 3)] >> (8 - depth - ((i * depth) & 7))) & max;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const row = y * stride, o = (y * w + x) * 4;
    if (type === 3) { const i = sample(row, x); rgba.set([pal[i * 3], pal[i * 3 + 1], pal[i * 3 + 2], trns && i < trns.length ? trns[i] : 255], o); }
    else if (type === 0 || type === 4) { const g = depth === 8 || depth === 16 ? sample(row, x * ch) : Math.round((sample(row, x) * 255) / max); rgba.set([g, g, g, type === 4 ? sample(row, x * ch + 1) : 255], o); }
    else { rgba.set([sample(row, x * ch), sample(row, x * ch + 1), sample(row, x * ch + 2), type === 6 ? sample(row, x * ch + 3) : 255], o); }
  }
  return { w, h, rgba };
}

/** Colours (opaque ones), semi-transparent pixel count, and the dark share of the silhouette edge (null: no edge). */
export function measure({ w, h, rgba }) {
  const cols = new Set();
  let semi = 0, edge = 0, dark = 0;
  const op = (x, y) => x >= 0 && y >= 0 && x < w && y < h && rgba[(y * w + x) * 4 + 3] === 255;
  for (let i = 0; i < w * h; i++) {
    const a = rgba[i * 4 + 3];
    if (a > 0 && a < 255) semi++;
    if (a > 0) cols.add((rgba[i * 4] << 16) | (rgba[i * 4 + 1] << 8) | rgba[i * 4 + 2]);
  }
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    if (!op(x, y)) continue;
    const inside = x > 0 && y > 0 && x < w - 1 && y < h - 1;
    if (!inside || (op(x - 1, y) && op(x + 1, y) && op(x, y - 1) && op(x, y + 1))) continue;
    edge++;
    const o = (y * w + x) * 4;
    if (0.299 * rgba[o] + 0.587 * rgba[o + 1] + 0.114 * rgba[o + 2] <= OUTLINE_DARK) dark++;
  }
  return { colours: cols.size, semi, outline: edge >= 8 ? Math.round((dark / edge) * 100) / 100 : null };
}

function walk(dir, out = []) {
  for (const n of readdirSync(dir).sort()) {
    const f = join(dir, n);
    if (statSync(f).isDirectory()) walk(f, out);
    else if (n.endsWith(".png")) out.push(f);
  }
  return out;
}

/** Every PNG's metrics, keyed by its path under public/art. */
export function scan() {
  const all = {};
  for (const f of walk(ART)) {
    try { all[relative(ART, f)] = measure(decodePng(readFileSync(f))); }
    catch (e) { all[relative(ART, f)] = { error: String(e.message) }; }
  }
  return all;
}

/** Folders whose art is outlined: most of their files have a dark silhouette edge. */
function outlinedFolders(all) {
  const by = {};
  for (const [k, m] of Object.entries(all)) {
    if (m.outline == null) continue;
    const d = dirname(k);
    (by[d] ??= []).push(m.outline >= OUTLINE_MIN);
  }
  return new Set(Object.entries(by).filter(([, v]) => v.length >= 3 && v.filter(Boolean).length / v.length >= 0.75).map(([d]) => d));
}

export function problems(all, base) {
  const outlined = outlinedFolders(all), out = [];
  for (const [k, m] of Object.entries(all)) {
    const b = base[k] ?? {};
    if (m.error) { if (!b.error) out.push(`${k}: unreadable (${m.error})`); continue; }
    if (m.colours > MAX_COLOURS && m.colours > (b.colours ?? MAX_COLOURS)) out.push(`${k}: ${m.colours} colours (max ${MAX_COLOURS}${b.colours ? `, baseline ${b.colours}` : ""})`);
    if (m.semi > (b.semi ?? 0)) out.push(`${k}: ${m.semi} semi-transparent pixels${b.semi ? ` (baseline ${b.semi})` : ""}`);
    if (outlined.has(dirname(k)) && m.outline != null && m.outline < OUTLINE_MIN && !b.noOutline) out.push(`${k}: no dark outline (${m.outline} of its edge dark; its folder is outlined)`);
  }
  return out;
}

/** The allowlist: only the rules each file already broke, at today's level. */
export function baselineOf(all) {
  const outlined = outlinedFolders(all), base = {};
  for (const [k, m] of Object.entries(all)) {
    const e = {};
    if (m.error) e.error = true;
    else {
      if (m.colours > MAX_COLOURS) e.colours = m.colours;
      if (m.semi > 0) e.semi = m.semi;
      if (outlined.has(dirname(k)) && m.outline != null && m.outline < OUTLINE_MIN) e.noOutline = true;
    }
    if (Object.keys(e).length) base[k] = e;
  }
  return base;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const all = scan();
  if (process.argv.includes("--baseline")) {
    const base = baselineOf(all);
    writeFileSync(BASE, JSON.stringify({ note: "art-check baseline 2026-10-23 (HD-2D Cozy Builder): art that already broke a rule; it may not get worse. Art was not edited.", files: base }, null, 1) + "\n");
    console.log(`baseline: ${Object.keys(all).length} pngs, ${Object.keys(base).length} allowlisted`);
  } else {
    const base = JSON.parse(readFileSync(BASE, "utf8")).files;
    const bad = problems(all, base);
    for (const b of bad) console.log("FAIL " + b);
    console.log(`art-check: ${Object.keys(all).length} pngs, ${Object.keys(base).length} on the baseline, ${bad.length} problems`);
    process.exit(bad.length ? 1 : 0);
  }
}
