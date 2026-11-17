# Phone and desktop looks shots for the south-gate ring, the casino sign, and cemetery moss.
# Usage: python3 qa/left1117/shots.py <url> [--tag before]
#   url    the ?qa build (vite dev or preview). A town save is written with
#          `node qa/riftconfirm/town_save.mjs` and loaded the way riftconfirm/repro.py loads one.
#   --tag  optional name piece. "before" writes left-1117-before-<preset>-<shot>.png.
#          Omit it for the after shots: left-1117-<phone|desk>-<gate|casino|moss>.png
# Chromium is headless with SwiftShader. Phone is 915x412 with touch. Desk is 1280x720.
# Zoom stays 4 (the game default, also set on the ?qa hook when that hook is present).
import json, os, subprocess, sys, tempfile

from playwright.sync_api import sync_playwright

OUT = "/workspace/gw-shots"
# Just inside the south road gate (townplan avenue x 27-28, fence on the last row).
# One tile south of the casino door (townplan casino block door).
# Cemetery yard grass, where mossart paints glow-moss patches.
SPOTS = {
    "gate": (28, 40),
    "casino": (45, 25),
    "moss": (16, 22),
}
PRESETS = {
    "phone": {"width": 915, "height": 412, "has_touch": True, "is_mobile": True},
    "desk": {"width": 1280, "height": 720, "has_touch": False, "is_mobile": False},
}


def town_save(path: str) -> dict:
    subprocess.check_call(
        ["node", "qa/riftconfirm/town_save.mjs", "28,40", "--out", path],
        cwd=os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))) or ".",
    )
    # town_save.mjs is run from the repo root; the caller passes cwd via the script location.
    return json.load(open(path))


def main() -> None:
    args = sys.argv[1:]
    if not args or args[0].startswith("-"):
        print("usage: python3 qa/left1117/shots.py <url> [--tag before]", file=sys.stderr)
        sys.exit(2)
    url = args[0]
    tag = ""
    if "--tag" in args:
        tag = args[args.index("--tag") + 1]
    root = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    os.makedirs(OUT, exist_ok=True)
    save_path = os.path.join(tempfile.mkdtemp(prefix="gw-left1117-"), "save.json")
    subprocess.check_call(["node", "qa/riftconfirm/town_save.mjs", "28,40", "--out", save_path], cwd=root)
    save = json.load(open(save_path))
    report = {"url": url, "tag": tag, "shots": []}
    with sync_playwright() as pw:
        # System Chrome when Playwright's downloaded Chromium is not on this machine.
        # Same headless SwiftShader flags as qa/riftconfirm/repro.py.
        launch = dict(headless=True, args=["--use-gl=swiftshader", "--enable-unsafe-swiftshader"])
        chrome = "/usr/bin/google-chrome"
        if os.path.exists(chrome):
            launch["executable_path"] = chrome
        browser = pw.chromium.launch(**launch)
        for preset, vp in PRESETS.items():
            ctx = browser.new_context(
                viewport={"width": vp["width"], "height": vp["height"]},
                has_touch=vp["has_touch"],
                is_mobile=vp["is_mobile"],
                device_scale_factor=1,
            )
            ctx.add_init_script(
                "if(!sessionStorage.getItem('qa')){localStorage.setItem(%s,%s);sessionStorage.setItem('qa','1')}"
                % (json.dumps(save["key"]), json.dumps(save["value"]))
            )
            pg = ctx.new_page()
            errs = []
            pg.on("pageerror", lambda e: errs.append(str(e)))
            pg.on("console", lambda m: errs.append(m.text) if m.type == "error" else None)
            pg.goto(url, wait_until="load")
            pg.wait_for_function("() => window.__screenTest && window.__screenTest.ready()", timeout=30000)
            pg.wait_for_timeout(400)
            if pg.evaluate("() => window.__screenTest.mode()") == "title":
                pg.get_by_text("Slot 1").first.click()
                pg.wait_for_function("() => window.__screenTest.mode() === 'play'", timeout=15000)
                pg.wait_for_timeout(600)
            for name, (tx, ty) in SPOTS.items():
                placed = pg.evaluate(
                    """([tx, ty]) => {
                      const g = window.__controlsTest;
                      if (window.__qaPlace) return window.__qaPlace(tx, ty, 4);
                      g.setPos(tx * 16 + 8, ty * 16 + 8);
                      return 'setPos';
                    }""",
                    [tx, ty],
                )
                pg.evaluate("() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)))")
                info = pg.evaluate(
                    """() => {
                      const v = window.__screenTest.view();
                      const x = window.__controlsTest.getX();
                      const y = window.__controlsTest.getY();
                      return { mode: window.__screenTest.mode(), x, y, tile: [Math.floor(x/16), Math.floor(y/16)],
                        zoom: v && v.k, worldH: v && v.worldH, eff: v && v.eff, buf: v && [v.bufW, v.bufH] };
                    }"""
                )
                piece = f"left-1117-{tag}-{preset}-{name}.png" if tag else f"left-1117-{preset}-{name}.png"
                path = os.path.join(OUT, piece)
                pg.screenshot(path=path)
                report["shots"].append({"file": path, "preset": preset, "shot": name, "placed": placed, "info": info, "errors": errs[:6]})
            ctx.close()
        browser.close()
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
