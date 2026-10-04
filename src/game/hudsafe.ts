/**
 * playtest1q [OWNER-APPROVED 2026-10-04 05:43 ET: playtest1q detailed big bosses, wizard back view, Phone boss label]:
 * a boss's name stays clear of the HUD.
 *
 * Bill (2026-10-04 05:43 ET, "A b and c pls"; C): on the Phone preset a 5x boss on the right of the view tucked its
 * red name under the log panel. The HUD is DOM over the game canvas, so the draw cannot see it; this module measures
 * the HUD panels the player can see (the stats card, the minimap, the log, the equip row, the fullscreen, camp, pause
 * and touch buttons, the stick and the orders strip) as boxes in the canvas's own buffer pixels, at most every
 * HUD_SAFE.every frames, and the label is placed in the safe area: the view less those boxes.
 *
 *   placeLabel: over the head as before; if that is off the view or under a panel, the same height moved sideways
 *   (at most HUD_SAFE.shift px plus half the label) to the nearest clear spot; then flipped under its feet, straight or
 *   moved sideways; when nowhere is clear (a panel over the whole body), it is clamped inside the view over the head.
 *
 * Looks only: a label is a picture. With no DOM (node checks) and no boxes set, every label is where it always was.
 */
export const HUD_SAFE = {
  /** measure the panels at most this often (frames), and whenever the canvas changes size */
  every: 8,
  /** keep this many game px between a label and a panel or the view's edge */
  pad: 1,
  /** how far sideways (game px, past half the label) a label may move before it flips under the feet */
  shift: 48,
  /** a flipped label's top sits this far under the feet */
  under: 4,
} as const;

/** The HUD pieces a label must not sit under (any that is on screen and has a size). */
export const HUD_SELECTORS = [
  '[data-testid="hud-card"]',
  '[data-testid="minimap"]',
  ".gw-log",
  ".gw-equip",
  '[data-testid="hud-fullscreen"]',
  '[data-testid="hud-camp"]',
  '[data-testid="hud-orders"]',
  ".gw-stick",
  ".gw-main",
  "button",
] as const;

export type Box = { x: number; y: number; w: number; h: number };

const overlaps = (a: Box, b: Box) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
const inside = (a: Box, v: Box) => a.x >= v.x && a.y >= v.y && a.x + a.w <= v.x + v.w && a.y + a.h <= v.y + v.h;

let testBoxes: Box[] | null = null;
/** For checks and tools: stand-in HUD boxes in buffer px (null: measure the DOM again). */
export function setHudBoxes(boxes: Box[] | null): void {
  testBoxes = boxes;
}

let seen: { at: number; w: number; h: number; boxes: Box[] } | null = null;
/** The HUD panels over a canvas, in its buffer pixels (throttled; [] with no DOM). */
export function hudBoxes(canvas: HTMLCanvasElement | undefined | null, frame: number): Box[] {
  if (testBoxes) return testBoxes;
  if (!canvas || typeof document === "undefined" || typeof canvas.getBoundingClientRect !== "function") return [];
  if (seen && seen.w === canvas.width && seen.h === canvas.height && frame - seen.at < HUD_SAFE.every && frame >= seen.at) return seen.boxes;
  const c = canvas.getBoundingClientRect();
  const boxes: Box[] = [];
  if (c.width > 0 && c.height > 0) {
    const kx = canvas.width / c.width;
    const ky = canvas.height / c.height;
    for (const el of Array.from(document.querySelectorAll(HUD_SELECTORS.join(",")))) {
      const r = (el as HTMLElement).getBoundingClientRect();
      if (r.width < 1 || r.height < 1) continue;
      const style = typeof getComputedStyle === "function" ? getComputedStyle(el as HTMLElement) : null;
      if (style && (style.visibility === "hidden" || style.display === "none" || Number(style.opacity) === 0)) continue;
      const b = { x: (r.left - c.left) * kx, y: (r.top - c.top) * ky, w: r.width * kx, h: r.height * ky };
      if (b.x + b.w <= 0 || b.y + b.h <= 0 || b.x >= canvas.width || b.y >= canvas.height) continue;
      boxes.push(b);
    }
  }
  seen = { at: frame, w: canvas.width, h: canvas.height, boxes };
  return boxes;
}

/** Buffer-pixel boxes to world-pixel boxes for a camera at (camX, camY) drawn at zoom px per game px. */
export function worldBoxes(boxes: Box[], camX: number, camY: number, zoom: number): Box[] {
  return boxes.map((b) => ({ x: camX + b.x / zoom, y: camY + b.y / zoom, w: b.w / zoom, h: b.h / zoom }));
}

export type Placed = { cx: number; y: number; how: "above" | "shift" | "below" | "belowShift" | "clamped" };
/**
 * Where a label w x h goes (drawLabel's centre x and bottom y): over the head (bottom at `above`) at cx, or under the
 * feet (top at `feet` + HUD_SAFE.under), inside `view` and clear of `hud` (world px), as the module note says.
 */
export function placeLabel(cx: number, above: number, feet: number, w: number, h: number, view: Box, hud: Box[]): Placed {
  const p = HUD_SAFE.pad;
  const v = { x: view.x + p, y: view.y + p, w: view.w - 2 * p, h: view.h - 2 * p };
  const grown = hud.map((b) => ({ x: b.x - p, y: b.y - p, w: b.w + 2 * p, h: b.h + 2 * p }));
  const at = (x: number, bottom: number): Box => ({ x: Math.round(x - w / 2), y: Math.round(bottom - h), w, h });
  const clear = (x: number, bottom: number) => {
    const b = at(x, bottom);
    return inside(b, v) && !grown.some((g) => overlaps(b, g));
  };
  const below = feet + HUD_SAFE.under + h;
  if (clear(cx, above)) return { cx, y: above, how: "above" };
  const reach = HUD_SAFE.shift + Math.ceil(w / 2);
  const side = (bottom: number) => {
    for (let d = 1; d <= reach; d++) for (const s of [cx + d, cx - d]) if (clear(s, bottom)) return s;
    return null;
  };
  const s1 = side(above);
  if (s1 !== null) return { cx: s1, y: above, how: "shift" };
  if (clear(cx, below)) return { cx, y: below, how: "below" };
  const s2 = side(below);
  if (s2 !== null) return { cx: s2, y: below, how: "belowShift" };
  const x = Math.min(Math.max(cx, v.x + w / 2), v.x + v.w - w / 2);
  const y = Math.min(Math.max(above, v.y + h), v.y + v.h);
  return { cx: x, y, how: "clamped" };
}
