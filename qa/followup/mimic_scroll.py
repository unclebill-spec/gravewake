# QA (gw-followup-1026 b): Phone 844x390 touch. Open pause > Bestiary, tap the bottom Mimic tile, and report whether the
# notes text (data-testid=book-info) is in view. Usage: python3 mimic_scroll.py <url> <save.json> <shot.png>
import sys, json
from playwright.sync_api import sync_playwright
url, save, shot = sys.argv[1:4]
r = json.load(open(save))
with sync_playwright() as pw:
    b = pw.chromium.launch(headless=True, args=["--use-gl=swiftshader", "--enable-unsafe-swiftshader"])
    ctx = b.new_context(viewport={"width": 844, "height": 390}, has_touch=True, is_mobile=True, device_scale_factor=1)
    ctx.add_init_script("if(!sessionStorage.getItem('qa')){localStorage.setItem(%s,%s);sessionStorage.setItem('qa','1')}" % (json.dumps(r["key"]), json.dumps(r["value"])))
    pg = ctx.new_page(); errs = []
    pg.on("pageerror", lambda e: errs.append(str(e)))
    pg.on("console", lambda m: errs.append(m.text) if m.type == "error" else None)
    pg.goto(url, wait_until="load"); pg.wait_for_timeout(5000)
    pg.get_by_text("Slot 1").first.click(); pg.wait_for_timeout(3000)
    pg.keyboard.press("Escape"); pg.wait_for_timeout(800)
    pg.get_by_test_id("tab-book").tap(); pg.wait_for_timeout(500)
    tile = pg.locator('[data-book="p:mimic"]')
    tile.scroll_into_view_if_needed(); pg.wait_for_timeout(300)
    vis = lambda: pg.evaluate("""() => { const e = document.querySelector('[data-testid=book-info]'); const r = e.getBoundingClientRect(); return r.top >= 0 && r.bottom <= innerHeight; }""")
    before = vis()
    tile.tap(); pg.wait_for_timeout(600)
    after = vis(); text = pg.get_by_test_id("book-info").inner_text()
    pg.screenshot(path=shot)
    print(json.dumps({"info_visible_before_tap": before, "info_visible_after_tap": after, "mimic_text": text.startswith("Mimic."), "errors": errs}))
    b.close()
