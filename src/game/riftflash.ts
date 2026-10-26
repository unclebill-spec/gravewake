/**
 * MB sprint Oct 26 (b), first-time-player idea 4: a short violet palette flash on wayrift arrival, so the zone change
 * reads as a choice and not a glitch. A Bayer-dithered veil of one locked violet (no alpha), thinning out over
 * RIFT_FLASH s once the sim has moved you. Visual only. The label lift lives here too: rift labels sit LABEL_LIFT px higher.
 */
import { WAYRIFT } from "./wayrifts";

export const RIFT_FLASH = 0.28;
export const RIFT_FLASH_COL = "#7a5ad0";
/** Extra px a wayrift's name rides above its dais, clear of the hero's head. */
export const LABEL_LIFT = 10;
const BAYER4 = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];

/** 0..1 strength of the arrival flash (0 when none). */
export function riftFlashLevel(tr: { t: number; moved?: boolean } | null | undefined): number {
  if (!tr || !tr.moved) return 0;
  const k = (tr.t - WAYRIFT.out) / RIFT_FLASH;
  return k < 0 || k >= 1 ? 0 : 1 - k;
}

export function paintRiftFlash(ctx: CanvasRenderingContext2D, tr: { t: number; moved?: boolean } | null | undefined, camX: number, camY: number, viewW: number, viewH: number, zoom: number) {
  const lv = riftFlashLevel(tr);
  if (lv <= 0) return;
  ctx.setTransform(zoom, 0, 0, zoom, -camX * zoom, -camY * zoom);
  const cut = Math.round(lv * 6); // up to 6 of 16 cells: a veil, never a wash
  ctx.fillStyle = RIFT_FLASH_COL;
  const x0 = Math.floor(camX), y0 = Math.floor(camY);
  for (let y = y0; y < camY + viewH / zoom; y++)
    for (let x = x0; x < camX + viewW / zoom; x++) if (BAYER4[(y & 3) * 4 + (x & 3)] < cut) ctx.fillRect(x, y, 1, 1);
}

const ROW_COL: Record<string, string> = { bone: "#f4efe4", blue: "#9ae4ff", violet: "#c9a0e8", red: "#ff3a50", gold: "#f4e27a" };
const INK = "#140c10";

/** A wayrift label as "Kind: place". "X rift (sealed)" reads "Sealed rift: X". */
export function riftLabelText(label: string): string {
  const m = /^(.*) rift \(sealed\)$/.exec(label);
  return m ? `Sealed rift: ${m[1]}` : label;
}

/**
 * The label font (looks.ts, byte-pinned by playtest2b) has no colon, so the colon goes in as a space and two
 * stamped dots (glyph column 1, rows 1 and 3, ink round each), exactly where a colon glyph would sit in the cell.
 */
export function drawRiftLabel(ctx: CanvasRenderingContext2D, draw: (text: string) => boolean, label: string, cx: number, y: number, row: string) {
  const text = riftLabelText(label);
  const i = text.indexOf(":");
  if (!draw(i < 0 ? text : text.slice(0, i) + " " + text.slice(i + 1)) || i < 0) return;
  const shown = (i < 0 ? text : text.slice(0, i) + " " + text.slice(i + 1)).toUpperCase().replace(/[^A-Z0-9 '.,\-!?&]/g, "");
  const ci = text.slice(0, i).toUpperCase().replace(/[^A-Z0-9 '.,\-!?&]/g, "").length;
  const L = Math.round(cx - (shown.length * 4 + 1) / 2);
  const T = Math.round(y - 7);
  const dx = L + 2 + ci * 4;
  for (const dy of [T + 2, T + 4]) {
    ctx.fillStyle = INK;
    for (const [ox, oy] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) ctx.fillRect(dx + ox, dy + oy, 1, 1);
  }
  ctx.fillStyle = ROW_COL[row] ?? ROW_COL.bone;
  for (const dy of [T + 2, T + 4]) ctx.fillRect(dx, dy, 1, 1);
}
