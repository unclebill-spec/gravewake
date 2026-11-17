"""faults1117: re-run the 11 planted faults the polish sweep MISSED (+2 controls) against a tree.
Usage: python3 verify.py <tree> [ids...]   (copies the tree to /tmp/f1117_w, never touches the tree itself)"""
import os, sys, json, subprocess
Q = "/workspace/gravewake/qa"
sys.path.insert(0, f"{Q}/playtest2b")
import fail_proofs as fp  # noqa: E402
FAULTS = [256, 296, 352, 976, 1016, 1344, 1392, 1456, 1504, 1560, 1800]
CONTROLS = [2005, 2008]
tree = os.path.abspath(sys.argv[1])
ids = [int(x) for x in sys.argv[2:]] or FAULTS + CONTROLS
plan = {r["id"]: r for r in json.load(open(f"{Q}/polish/checks/sweep_plan.json"))["kept"]}
W = f"/tmp/f1117_w{os.getpid()}"
subprocess.run(f"rm -rf {W} {W}.fpbak && mkdir -p {W} && cd {tree} && tar --exclude=./node_modules --exclude=./.vercel --exclude=./.git --exclude=./dist -cf - . | (cd {W} && tar xf -) && ln -s {tree}/node_modules {W}/node_modules", shell=True, check=True)
bad = 0
for i in ids:
    line = fp.run_one(W, plan[i])
    print(line.split("\n")[0] if "MISSED" in line else line[:600], flush=True)
    ok = ("MISSED" in line) if i in CONTROLS else ("CAUGHT" in line)
    bad += not ok
print("RESULT", "PASS" if not bad else f"FAIL ({bad} wrong)")
subprocess.run(f"rm -rf {W} {W}.fpbak", shell=True)
