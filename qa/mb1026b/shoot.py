# QA: load a season_jump save in the browser, screenshot the canvas, report near-black share (luma < 20).
import sys, json
from playwright.sync_api import sync_playwright
from PIL import Image
url, save, shot = sys.argv[1], sys.argv[2], sys.argv[3]
preset = sys.argv[4] if len(sys.argv) > 4 else "desk"
r = json.load(open(save))
vp = {"width": 844, "height": 390} if preset == "phone" else {"width": 1280, "height": 720}
with sync_playwright() as pw:
    b = pw.chromium.launch(headless=True, args=["--use-gl=swiftshader", "--enable-unsafe-swiftshader"])
    ctx = b.new_context(viewport=vp, has_touch=preset == "phone", is_mobile=preset == "phone", device_scale_factor=1)
    ctx.add_init_script("if(!sessionStorage.getItem('qa')){localStorage.setItem(%s,%s);sessionStorage.setItem('qa','1')}" % (json.dumps(r["key"]), json.dumps(r["value"])))
    pg = ctx.new_page(); errs = []
    pg.on("pageerror", lambda e: errs.append(str(e)))
    pg.on("console", lambda m: errs.append(m.text) if m.type == "error" else None)
    pg.goto(url, wait_until="load"); pg.wait_for_timeout(5000)
    pg.get_by_text("Slot 1").first.click(); pg.wait_for_timeout(int(sys.argv[5]) if len(sys.argv) > 5 else 4000)
    cv = pg.locator("canvas").first
    cv.screenshot(path=shot)
    im = Image.open(shot).convert("RGB"); px = list(im.getdata())
    nb = sum(1 for p in px if 0.299*p[0]+0.587*p[1]+0.114*p[2] < 20) / len(px)
    print(json.dumps({"shot": shot, "near_black": round(nb, 3), "errors": errs[:10]}))
    b.close()
