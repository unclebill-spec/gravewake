# QA: replay the Rule 19 rift repro in Chromium (stand at (33,26), hold W 1.3 s, hold S 1 s) and answer the dialog.
# Usage: python3 qa/riftconfirm/repro.py <url> save.json <outdir> [phone|desk]
# Prints JSON: tile after each step, whether "Enter the rift?" is up, and console/page errors.
import sys, json, os
from playwright.sync_api import sync_playwright
url, save, out = sys.argv[1], sys.argv[2], sys.argv[3]
preset = sys.argv[4] if len(sys.argv) > 4 else "desk"
phone = preset == "phone"
os.makedirs(out, exist_ok=True)
r = json.load(open(save))
vp = {"width": 844, "height": 390} if phone else {"width": 1280, "height": 720}
res = {"preset": preset, "steps": []}
with sync_playwright() as pw:
    b = pw.chromium.launch(headless=True, args=["--use-gl=swiftshader", "--enable-unsafe-swiftshader"])
    ctx = b.new_context(viewport=vp, has_touch=phone, is_mobile=phone, device_scale_factor=1)
    ctx.add_init_script("if(!sessionStorage.getItem('qa')){localStorage.setItem(%s,%s);sessionStorage.setItem('qa','1')}" % (json.dumps(r["key"]), json.dumps(r["value"])))
    pg = ctx.new_page(); errs = []
    pg.on("pageerror", lambda e: errs.append(str(e)))
    pg.on("console", lambda m: errs.append(m.text) if m.type == "error" else None)
    pg.goto(url, wait_until="load"); pg.wait_for_timeout(5000)
    pg.get_by_text("Slot 1").first.click(); pg.wait_for_timeout(3000)
    def tile():
        return pg.evaluate("() => [Math.floor(window.__controlsTest.getX()/16), Math.floor(window.__controlsTest.getY()/16)]")
    def asked():
        return pg.locator("[data-testid='rift-ask']").count() > 0
    def step(name, shot=None):
        res["steps"].append({"step": name, "tile": tile(), "dialog": asked()})
        if shot: pg.screenshot(path=os.path.join(out, shot))
    def hold(key, ms):
        pg.keyboard.down(key); pg.wait_for_timeout(ms); pg.keyboard.up(key)
    step("start", f"{preset}-0-start.png")
    hold("KeyW", 1300); step("held W 1.3 s", f"{preset}-1-dialog.png")
    hold("KeyS", 1000); step("then held S 1 s (must not move)")
    if phone:
        # the touch stick: a drag on the left side must not move the hero either
        pg.mouse.move(120, 300); pg.mouse.down(); pg.mouse.move(120, 220, steps=5); pg.wait_for_timeout(800); pg.mouse.up()
        step("stick drag up 0.8 s (must not move)")
        pg.locator("[data-testid='rift-no']").tap()
    else:
        hold("ArrowRight", 50); pg.keyboard.press("Escape")
    pg.wait_for_timeout(600); step("No/Esc (pushed back)", f"{preset}-2-after-no.png")
    hold("KeyW", 700); step("step on again (prompts again)")
    if phone: pg.locator("[data-testid='rift-yes']").tap()
    else: pg.keyboard.press("KeyE")
    pg.wait_for_timeout(4000); step("Yes (crossed)", f"{preset}-3-after-yes.png")
    res["mode"] = pg.evaluate("() => window.__screenTest && window.__screenTest.mode()")
    res["errors"] = errs[:10]
    print(json.dumps(res))
    b.close()
