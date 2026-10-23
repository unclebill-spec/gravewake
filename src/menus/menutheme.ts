/**
 * menus-restyle (2026-10-23, first pass for Bill's review): the gothic menu chrome (menus.css) plus its feel: Sound's jsfxr
 * UI blips (staging/jsfxr: ui-move on hover / pad focus, ui-select on a press, ui-back on a back or close button) and a short
 * close tween. Looks and sound only: it only listens, never stops or changes an event, and never touches the game state.
 */
import "./menus.css";
import moveUrl from "./art/ui-move.ogg";
import selectUrl from "./art/ui-select.ogg";
import backUrl from "./art/ui-back.ogg";

const MENU = ".gw-panel, .gw-title, [data-padmodal]";
const BACK = /^(leave|later|close|back|resume|no|stay|hide display|cancel)\b/i;
const VOL = 0.45;

type Cue = "move" | "select" | "back";

/** A small pool per cue, so quick presses overlap instead of cutting off. */
function makeCues(): (c: Cue) => void {
  const urls: Record<Cue, string> = { move: moveUrl, select: selectUrl, back: backUrl };
  const pools: Partial<Record<Cue, HTMLAudioElement[]>> = {};
  const turn: Record<Cue, number> = { move: 0, select: 0, back: 0 };
  let lastMove = 0;
  return (c) => {
    if (typeof Audio === "undefined") return;
    const now = performance.now();
    if (c === "move") { if (now - lastMove < 60) return; lastMove = now; }
    const pool = (pools[c] ??= Array.from({ length: 3 }, () => { const a = new Audio(urls[c]); a.preload = "auto"; a.volume = VOL; return a; }));
    const a = pool[turn[c]++ % pool.length];
    try { a.currentTime = 0; void a.play().catch(() => {}); } catch { /* no sound before the first gesture */ }
  };
}

function isMenuButton(el: EventTarget | null): HTMLButtonElement | null {
  if (!(el instanceof Element)) return null;
  const b = el.closest("button");
  return b && !b.disabled && b.closest(MENU) ? b : null;
}

/** The dialogue box gets the parchment frame (it is the one panel with the companion/folk talk choices). */
function tagTalk(root: ParentNode, mode: string) {
  for (const p of Array.from(root.querySelectorAll<HTMLElement>(".gw-panel"))) p.classList.toggle("gw-parch", mode === "talk");
}

export function installMenuTheme(): () => void {
  if (typeof document === "undefined") return () => {};
  const cue = makeCues();
  let hovered: Element | null = null;
  const over = (e: PointerEvent) => {
    if (e.pointerType !== "mouse") return;
    const b = isMenuButton(e.target);
    if (b && b !== hovered) cue("move");
    hovered = b;
  };
  const click = (e: MouseEvent) => {
    const b = isMenuButton(e.target);
    if (!b) return;
    cue(b.hasAttribute("data-padback") || BACK.test((b.textContent ?? "").trim()) ? "back" : "select");
  };
  document.addEventListener("pointerover", over, { passive: true });
  document.addEventListener("click", click, { capture: true, passive: true });

  // where each open panel sits, so a closing one can be ghosted out where it was
  const rects = new WeakMap<Element, DOMRect>();
  const reduced = () => window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
  const remember = () => {
    for (const p of Array.from(document.querySelectorAll(".gw-panel, [data-padmodal] > div"))) rects.set(p, p.getBoundingClientRect());
    tagTalk(document, window.__screenTest?.mode() ?? "");
  };
  const ghost = (n: Element) => {
    const r = rects.get(n);
    if (!r || r.width === 0 || reduced()) return;
    const g = n.cloneNode(true) as HTMLElement;
    g.removeAttribute("data-testid"); g.removeAttribute("data-padnav"); g.removeAttribute("data-padmodal");
    for (const el of Array.from(g.querySelectorAll("[data-testid],[data-padnav],[data-padmodal],[data-padfirst],[data-padback],[id]"))) {
      for (const a of ["data-testid", "data-padnav", "data-padmodal", "data-padfirst", "data-padback", "id"]) el.removeAttribute(a);
    }
    g.setAttribute("aria-hidden", "true");
    g.style.cssText += `;position:fixed;left:${r.left}px;top:${r.top}px;width:${r.width}px;height:${r.height}px;margin:0;z-index:60;right:auto;bottom:auto;max-height:none`;
    g.classList.add("gw-closing");
    document.body.appendChild(g);
    window.setTimeout(() => g.remove(), 160);
  };
  const mo = new MutationObserver((list) => {
    for (const m of list) {
      for (const n of Array.from(m.removedNodes)) {
        if (!(n instanceof Element)) continue;
        if (n.matches(".gw-panel")) ghost(n);
        else if (n.matches("[data-padmodal]")) { const inner = n.firstElementChild; if (inner) ghost(inner); }
      }
      if (m.type === "attributes" && m.attributeName === "data-padfocus" && m.target instanceof Element && m.target.hasAttribute("data-padfocus")) cue("move");
    }
    remember();
  });
  const main = document.querySelector("main") ?? document.body;
  mo.observe(main, { childList: true, subtree: true, attributes: true, attributeFilter: ["data-padfocus"] });
  const tick = window.setInterval(remember, 250);
  remember();
  return () => {
    document.removeEventListener("pointerover", over);
    document.removeEventListener("click", click, { capture: true });
    mo.disconnect();
    window.clearInterval(tick);
  };
}
