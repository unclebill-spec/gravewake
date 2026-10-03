/**
 * playtest1l [OWNER-APPROVED EXCEPTION 2026-10-03 09:21 ET: optional bloom glow and scanlines]: the Bloom glow and
 * Scanlines rows of the Display options (title › Display and Pause › Display). Plain buttons, so touch, the pad's menu
 * focus (d-pad / stick, A) and the keyboard all reach them; a pick is saved at once (gravewake-postfx-v1).
 */
import { useSyncExternalStore } from "react";
import type { View } from "./screen";
import { BLOOM_IDS, BLOOM_LABEL, SCAN_IDS, SCAN_LABEL, activeFx, deviceBloom, effectiveBloom, fxStore } from "./postfx";

export function FxOptions({ view }: { view: View | null }) {
  const s = useSyncExternalStore(fxStore.subscribe, fxStore.get, fxStore.get);
  const caps = activeFx()?.caps ?? { gl: false, soft: false, cores: 0, memory: null };
  const eff = view?.eff ?? "auto";
  const bloom = effectiveBloom(s, caps, eff);
  const def = deviceBloom(caps, eff, s.autoOff);
  const btn = (on: boolean) => `rounded border px-2 py-1 text-xs disabled:opacity-40 ${on ? "border-primary bg-bg" : "border-border"}`;
  return (
    <div className="flex flex-col gap-2" data-testid="fx-options">
      <p className="text-xs text-muted">Bloom glow</p>
      <div className="flex flex-wrap gap-1">
        {BLOOM_IDS.map((id) => (
          <button key={id} type="button" data-testid={`bloom-${id}`} aria-pressed={bloom === id} disabled={!caps.gl && id !== "off"} className={btn(bloom === id)} onClick={() => fxStore.set({ bloom: id })}>
            {BLOOM_LABEL[id]}
            {s.bloom === null && caps.gl && id === def ? " (default)" : ""}
          </button>
        ))}
      </div>
      {!caps.gl ? (
        <p className="text-xs text-muted" data-testid="bloom-note">
          Bloom needs WebGL, so it stays off on this device. Scanlines still work.
        </p>
      ) : s.bloom === null && s.autoOff ? (
        <p className="text-xs text-muted" data-testid="bloom-note">
          Bloom was turned off to keep the game smooth here. Pick Low or High to bring it back.
        </p>
      ) : null}
      <p className="text-xs text-muted">Scanlines</p>
      <div className="flex flex-wrap gap-1">
        {SCAN_IDS.map((id) => (
          <button key={id} type="button" data-testid={`scan-${id}`} aria-pressed={s.scan === id} className={btn(s.scan === id)} onClick={() => fxStore.set({ scan: id })}>
            {SCAN_LABEL[id]}
            {id === "strong" && eff === "retro" ? " (CRT)" : ""}
          </button>
        ))}
      </div>
    </div>
  );
}
