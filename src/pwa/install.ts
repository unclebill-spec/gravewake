/**
 * install1 (OWNER-APPROVED 2026-10-01 22:14 ET): install Gravewake as an app, in one tap.
 *
 * - Chrome/Edge (Android, Windows, Mac, Linux, ChromeOS) fire `beforeinstallprompt`; it is held here and the
 *   Install button replays it. `appinstalled`, or running in an installed window, hides the button.
 * - iPhone/iPad Safari has no prompt: the button opens screen1's Share → Add to Home Screen tip instead.
 * - Any other browser: no button on the title; a one-line note under Display.
 * - The service worker (scripts/gravewake-sw-plugin.mjs) is registered only in a production build, only on
 *   https or localhost. Presentation only: nothing here touches the sim or the saves.
 */
import { useEffect, useRef, useSyncExternalStore } from "react";
import { isIos } from "../game/screen";

export type InstallState = "installed" | "ready" | "ios" | "unsupported";
export type InstallChoice = "accepted" | "dismissed" | "unavailable";
/** What Chromium hands `beforeinstallprompt` listeners. */
export type InstallPromptEvent = Event & { prompt: () => Promise<unknown>; userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform?: string }> };
/** The parts of `window` the installer reads (a mock in the checks). */
export type InstallWindow = Pick<Window, "addEventListener"> & {
  matchMedia?: (q: string) => { matches: boolean; addEventListener?: (t: "change", f: () => void) => void };
  navigator: { userAgent?: string; platform?: string; maxTouchPoints?: number; standalone?: boolean };
  document?: { fullscreenElement?: Element | null; webkitFullscreenElement?: Element | null };
};

const INSTALLED_MODES = ["(display-mode: standalone)", "(display-mode: minimal-ui)", "(display-mode: window-controls-overlay)"];
const FULLSCREEN_MODE = "(display-mode: fullscreen)";

/** Running from the home screen or as a desktop app (not merely full screen in a tab). */
export function runningInstalled(win: InstallWindow): boolean {
  if (win.navigator.standalone === true) return true;
  const on = (q: string) => !!win.matchMedia?.(q).matches;
  if (INSTALLED_MODES.some(on)) return true;
  // The manifest asks for fullscreen. A tab put full screen by the Fullscreen API has a fullscreen element; the app does not.
  return on(FULLSCREEN_MODE) && !win.document?.fullscreenElement && !win.document?.webkitFullscreenElement;
}

export function createInstaller(win: InstallWindow) {
  let held: InstallPromptEvent | null = null;
  let installed = false;
  let busy = false;
  const subs = new Set<() => void>();
  const emit = () => subs.forEach((f) => f());
  win.addEventListener("beforeinstallprompt", (e: Event) => {
    e.preventDefault();
    held = e as InstallPromptEvent;
    // Chromium only offers this while the app is not installed (e.g. after an uninstall).
    installed = false;
    emit();
  });
  win.addEventListener("appinstalled", () => {
    installed = true;
    held = null;
    emit();
  });
  for (const q of [...INSTALLED_MODES, FULLSCREEN_MODE]) win.matchMedia?.(q).addEventListener?.("change", emit);
  const state = (): InstallState => {
    if (installed) return "installed";
    if (held) return "ready";
    if (runningInstalled(win)) return "installed";
    if (isIos(win.navigator.userAgent ?? "", win.navigator.platform ?? "", win.navigator.maxTouchPoints ?? 0)) return "ios";
    return "unsupported";
  };
  /** Show the browser's own install dialog. A prompt is good for one use; Chromium sends a fresh one if allowed. */
  const install = async (): Promise<InstallChoice> => {
    const p = held;
    if (!p || busy) return "unavailable";
    busy = true;
    try {
      await p.prompt();
      const { outcome } = await p.userChoice;
      held = null;
      if (outcome === "accepted") installed = true;
      return outcome;
    } catch {
      held = null;
      return "dismissed";
    } finally {
      busy = false;
      emit();
    }
  };
  const subscribe = (f: () => void) => {
    subs.add(f);
    return () => {
      subs.delete(f);
    };
  };
  return { state, install, subscribe };
}

export type Installer = ReturnType<typeof createInstaller>;

/** What each place shows. The title stays clean: no button where the browser cannot install. */
export function installView(state: InstallState, where: "title" | "options"): { button: string | null; note: string | null } {
  if (state === "installed") return { button: null, note: null };
  if (state === "ready") return { button: where === "title" ? "Install" : "Install app", note: where === "options" ? "Adds Gravewake to your home screen or desktop. It opens full screen and plays offline." : null };
  if (state === "ios") return { button: where === "title" ? "Install" : "Install app", note: where === "options" ? "On iPhone and iPad: Share, then Add to Home Screen." : null };
  return { button: null, note: where === "options" ? "This browser cannot install Gravewake. Chrome or Edge can (Android or a computer), and Safari on iPhone via Share → Add to Home Screen." : null };
}

/** The service worker runs only on https, or on this machine (localhost) for testing. */
export function swAllowed(loc: { protocol: string; hostname: string }): boolean {
  if (loc.protocol === "https:") return true;
  if (loc.protocol !== "http:") return false;
  const h = loc.hostname;
  return h === "localhost" || h === "127.0.0.1" || h === "[::1]" || h.endsWith(".localhost");
}

type SwWindow = {
  location: { protocol: string; hostname: string };
  navigator: { serviceWorker?: { register: (url: string, o: { scope: string; updateViaCache: "none" }) => Promise<unknown> } };
  document: { readyState: string };
  addEventListener: (t: "load", f: () => void, o?: { once: boolean }) => void;
};

/** Register `sw.js` from the site base (a GitHub Pages subpath build uses its own base). False when it does not. */
export function registerServiceWorker(win: SwWindow, prod: boolean, base = "/"): boolean {
  const sw = win.navigator.serviceWorker;
  if (!prod || !sw || !swAllowed(win.location)) return false;
  const root = base.endsWith("/") ? base : `${base}/`;
  const go = () => {
    sw.register(`${root}sw.js`, { scope: root, updateViaCache: "none" }).catch(() => {
      /* no worker: the game still runs online */
    });
  };
  if (win.document.readyState === "complete") go();
  else win.addEventListener("load", go, { once: true });
  return true;
}

let shared: Installer | null = null;
/** The page's one installer, listening from first import (the prompt can come before React mounts). */
export function installer(): Installer | null {
  if (typeof window === "undefined") return null;
  if (!shared) {
    shared = createInstaller(window as unknown as InstallWindow);
    const env = import.meta.env as { PROD?: boolean; BASE_URL?: string } | undefined;
    registerServiceWorker(window as unknown as SwWindow, env?.PROD === true, env?.BASE_URL ?? "/");
  }
  return shared;
}
installer();

const none = () => () => {};
export function useInstallState(): InstallState {
  const inst = installer();
  return useSyncExternalStore(inst ? inst.subscribe : none, () => (inst ? inst.state() : "unsupported"), () => "unsupported");
}

const TIP_EVENT = "gravewake:a2hs-tip";
/** Ask the shell to show screen1's Add to Home Screen tip. */
export function requestIosTip() {
  if (typeof window !== "undefined") window.dispatchEvent(new Event(TIP_EVENT));
}
/** The shell listens once, and shows its tip. */
export function useIosTipRequest(show: () => void) {
  const latest = useRef(show);
  useEffect(() => {
    latest.current = show;
  });
  useEffect(() => {
    const f = () => latest.current();
    window.addEventListener(TIP_EVENT, f);
    return () => window.removeEventListener(TIP_EVENT, f);
  }, []);
}
