/**
 * install1 (OWNER-APPROVED 2026-10-01 22:14 ET): the Install button, on the title and under Pause › Display.
 * A plain <button>, so touch, the keyboard (Tab, Enter) and the controller's menu focus all reach it.
 */
import { installer, installView, requestIosTip, useInstallState } from "./install";

export function InstallButton({ where }: { where: "title" | "options" }) {
  const state = useInstallState();
  const view = installView(state, where);
  if (!view.button && !view.note) return null;
  const go = () => {
    if (state === "ios") requestIosTip();
    else void installer()?.install();
  };
  const button = view.button ? (
    <button type="button" data-testid={`${where}-install`} className={where === "title" ? "rounded border border-primary px-3 py-2 text-sm" : "rounded border border-primary px-3 py-2"} onClick={go}>
      {view.button}
    </button>
  ) : null;
  if (where === "title") return button;
  return (
    <div className="flex w-full flex-col gap-1" data-testid="install-options">
      {button ? <div>{button}</div> : null}
      {view.note ? <p className="text-xs text-muted" data-testid="install-note">{view.note}</p> : null}
    </div>
  );
}
