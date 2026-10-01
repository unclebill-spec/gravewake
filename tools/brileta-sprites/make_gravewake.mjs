/**
 * Turn brileta trees and boulders into Gravewake strips.
 * Soft edges are snapped. Colors are mapped onto a short palette.
 * Run: node tools/brileta-sprites/make_gravewake.mjs
 */
import { writeFileSync, mkdirSync } from "node:fs";
import { deflateSync } from "node:zlib";
import { generateTree, TreeArchetype } from "./dist/trees.js";
import { generateBoulder } from "./dist/boulders.js";

const GREEN = ["#3a2418", "#5a3828", "#8a6040", "#1a3018", "#2e4a28", "#4a7838", "#7aa048"];
const DEAD = ["#2a2018", "#4a3828", "#6a5840", "#8a7860"];
const ROCK = ["#2a2824", "#4a4e54", "#7a8088", "#b0b6bc"];

function hex(h) {
  return [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
}
function nearest(r, g, b, palette) {
  let best = palette[0];
  let score = 1e9;
  for (const c of palette) {
    const d = (r - c[0]) ** 2 + (g - c[1]) ** 2 + (b - c[2]) ** 2;
    if (d < score) {
      score = d;
      best = c;
    }
  }
  return best;
}

/** Snap one generated canvas onto a fixed palette. Alpha is on or off. */
function snap(canvas, palette) {
  const colors = palette.map(hex);
  const { width, height, data } = canvas;
  const out = [];
  for (let i = 0; i < width * height; i++) {
    const a = data[i * 4 + 3];
    if (a < 140) {
      out.push(null);
      continue;
    }
    out.push(nearest(data[i * 4], data[i * 4 + 1], data[i * 4 + 2], colors));
  }
  return { w: width, h: height, px: out };
}

function scale(src, tw, th) {
  const px = Array(tw * th).fill(null);
  for (let y = 0; y < th; y++) {
    for (let x = 0; x < tw; x++) {
      const sx = Math.min(src.w - 1, Math.floor((x * src.w) / tw));
      const sy = Math.min(src.h - 1, Math.floor((y * src.h) / th));
      px[y * tw + x] = src.px[sy * src.w + sx];
    }
  }
  return { w: tw, h: th, px };
}

function outline(src, ink) {
  const { w, h, px } = src;
  const next = px.slice();
  const c = hex(ink);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (px[y * w + x]) continue;
      const edge = [
        [x - 1, y],
        [x + 1, y],
        [x, y - 1],
        [x, y + 1],
      ].some(([nx, ny]) => nx >= 0 && ny >= 0 && nx < w && ny < h && px[ny * w + nx]);
      if (edge) next[y * w + x] = c;
    }
  }
  return { w, h, px: next };
}

function fit(src, size) {
  const inner = size - 2;
  const scaleN = Math.min(inner / src.w, inner / src.h, 1);
  const tw = Math.max(1, Math.round(src.w * scaleN));
  const th = Math.max(1, Math.round(src.h * scaleN));
  const body = outline(scale(src, tw, th), "#140c10");
  const px = Array(size * size).fill(null);
  const ox = Math.floor((size - body.w) / 2);
  const oy = size - body.h;
  for (let y = 0; y < body.h; y++) {
    for (let x = 0; x < body.w; x++) {
      const c = body.px[y * body.w + x];
      if (c && oy + y >= 0 && ox + x >= 0 && ox + x < size) px[(oy + y) * size + x + ox] = c;
    }
  }
  return { w: size, h: size, px };
}

/** Lay snow on the crown. The trunk and the lower leaves stay. */
function snowCap(frame) {
  let minY = frame.h;
  let maxY = 0;
  for (let i = 0; i < frame.px.length; i++) {
    if (!frame.px[i]) continue;
    const y = Math.floor(i / frame.w);
    if (y < minY) minY = y;
    if (y > maxY) maxY = y;
  }
  const cut = minY + Math.floor((maxY - minY) * 0.55);
  const light = hex("#f4fbff");
  const shade = hex("#c5d8e6");
  for (let y = minY; y <= cut; y++) {
    for (let x = 0; x < frame.w; x++) {
      const c = frame.px[y * frame.w + x];
      if (!c) continue;
      const key = c[0].toString(16).padStart(2, "0") + c[1].toString(16).padStart(2, "0") + c[2].toString(16).padStart(2, "0");
      if (key === "7aa048" || key === "4a7838" || key === "2e4a28") {
        frame.px[y * frame.w + x] = y < minY + 3 ? light : shade;
      }
    }
  }
  return frame;
}

function png(frames) {
  const w = frames.reduce((s, f) => s + f.w, 0);
  const h = frames[0].h;
  const raw = Buffer.alloc((w * 4 + 1) * h);
  let ox = 0;
  for (const frame of frames) {
    for (let y = 0; y < h; y++) {
      const row = y * (w * 4 + 1);
      raw[row] = 0;
      for (let x = 0; x < frame.w; x++) {
        const c = frame.px[y * frame.w + x];
        const i = row + 1 + (ox + x) * 4;
        if (!c) continue;
        raw[i] = c[0];
        raw[i + 1] = c[1];
        raw[i + 2] = c[2];
        raw[i + 3] = 255;
      }
    }
    ox += frame.w;
  }
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const chunk = (type, data) => {
    const t = Buffer.from(type);
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length);
    const crc = Buffer.alloc(4);
    crc.writeUInt32BE(crc32(Buffer.concat([t, data])) >>> 0);
    return Buffer.concat([len, t, data, crc]);
  };
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  return Buffer.concat([sig, chunk("IHDR", ihdr), chunk("IDAT", deflateSync(raw)), chunk("IEND", Buffer.alloc(0))]);
}

const CRC = new Uint32Array(256);
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  CRC[n] = c;
}
function crc32(buf) {
  let c = 0xffffffff;
  for (const b of buf) c = CRC[(c ^ b) & 255] ^ (c >>> 8);
  return c ^ 0xffffffff;
}

const trees = [
  ...[1, 4, 8, 11].map((seed) => fit(snap(generateTree(seed, 20, TreeArchetype.DECIDUOUS).canvas, GREEN), 32)),
  ...[2, 6].map((seed) => fit(snap(generateTree(seed, 20, TreeArchetype.CONIFER).canvas, GREEN), 32)),
  ...[3, 7].map((seed) => fit(snap(generateTree(seed, 20, TreeArchetype.DEAD).canvas, DEAD), 32)),
  fit(snap(generateTree(5, 20, TreeArchetype.SAPLING).canvas, GREEN), 32),
  snowCap(fit(snap(generateTree(4, 20, TreeArchetype.DECIDUOUS).canvas, GREEN), 32)),
];
const rocks = [1, 5, 9, 14].map((seed) => fit(snap(generateBoulder(seed, 16).canvas, ROCK), 16));

const out = new URL("../../public/art/brileta/", import.meta.url);
mkdirSync(out, { recursive: true });
writeFileSync(new URL("trees.png", out), png(trees));
writeFileSync(new URL("rocks.png", out), png(rocks));
writeFileSync(
  new URL("CREDITS.txt", out),
  "Trees and boulders generated with brileta-sprites by Mark Ayzenshtat, MIT.\nhttps://github.com/mayz/brileta-sprites\nColors snapped to the Gravewake palette by tools/brileta-sprites/make_gravewake.mjs.\n",
);
console.log("wrote", trees.length, "trees and", rocks.length, "rocks");
