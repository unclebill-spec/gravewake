"""Freeze, as playtest2b shipped them (main 8d99f71), every public/, tools/ and rules/ file the wake batch has changed or
removed, under scripts/frozen/wake/files/<path>. The older check:game groups read these (see WAKE_SET in the check script)."""
import hashlib, json, os, subprocess
BASE = "8d99f71"
base = json.load(open("scripts/frozen/earlysinks/base-md5.json"))
out = "scripts/frozen/wake/files"
n = 0
for f, h in sorted(base.items()):
    if not f.startswith(("public/", "tools/", "rules/", "src/")):
        continue
    live = hashlib.md5(open(f, "rb").read()).hexdigest() if os.path.exists(f) else None
    dst = os.path.join(out, f)
    if live == h:
        if os.path.exists(dst):
            os.remove(dst)
        continue
    if f == "rules/GAME_LAYOUT_TWO.txt":
        continue  # gfx-lighting freezes it through gfxlView
    os.makedirs(os.path.dirname(dst), exist_ok=True)
    open(dst, "wb").write(subprocess.run(["git", "show", f"{BASE}:{f}"], capture_output=True, check=True).stdout)
    n += 1
print(n, "files frozen")
