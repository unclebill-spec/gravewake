"""Wake batch art integration: copies Art's staged sheets (/workspace/gravewake/staging/art) into public/art.
Run from the repo root: python3 tools/wake-art/integrate.py [staging_dir]. Idempotent. Only copies and pastes whole cells;
it draws nothing. Each step names its README."""
import os, shutil, sys
from PIL import Image

ST = sys.argv[1] if len(sys.argv) > 1 else "/workspace/gravewake/staging/art"
W = "public/art/writer"
S = "public/art/sprites"
FAMS = "zombie skeleton ghost bat ghoul witch lantern scarecrow wolf mummy vampire tree lich horse goblin cat rat".split()
RANKS = ["mob", "boss", "mini", "rare"]


def cp(src, dst):
    os.makedirs(os.path.dirname(dst), exist_ok=True)
    shutil.copyfile(src, dst)


def palette():
    # palette_remap/README: copy remapped/* over public/art/writer/ (same names and sizes).
    d = f"{ST}/palette_remap/remapped"
    for n in sorted(os.listdir(d)):
        a, b = Image.open(f"{d}/{n}"), Image.open(f"{W}/{n}")
        assert a.size == b.size, n
        cp(f"{d}/{n}", f"{W}/{n}")


def ghosts():
    # ghost_trees/README: one 11-frame sheet per rank (mob, boss, mini, rare) with its glow mask. They ship beside the
    # sprite writer's foes.png (which stays the writer's own output) and the draw reads them for the ghost family.
    for rank in RANKS:
        cp(f"{ST}/ghost_trees/ghost_{rank}.png", f"{W}/ghost_{rank}.png")
        cp(f"{ST}/emissive_masks/ghost_{rank}_em.png", f"{W}/ghost_{rank}_em.png")


def trees():
    # ghost_trees/README: the ashpine, gloomoak, deadash and willow sheets and their wisp masks.
    for n in ("trees_64x96", "trees_48x64"):
        cp(f"{ST}/ghost_trees/{n}.png", f"{W}/ghost-{n}.png")
        cp(f"{ST}/emissive_masks/{n}_em.png", f"{W}/ghost-{n}_em.png")


def spells():
    # spells/README: bolt, trail and impact for six elements (fully emissive).
    for el in ("fire", "ice", "lightning", "holy", "shadow", "venom"):
        for k in ("bolt", "trail", "impact"):
            cp(f"{ST}/spells/{el}_{k}.png", f"public/art/spells/fx2/{el}_{k}.png")


def telegraphs():
    for n in os.listdir(f"{ST}/telegraphs"):
        if n.endswith(".png") and n != "contact_sheet.png":
            cp(f"{ST}/telegraphs/{n}", f"{W}/{n}")


def minis():
    for n in ("wraith_knight", "vampire_lord", "frost_golem", "storm_elemental"):
        cp(f"{ST}/mini_bosses/{n}.png", f"{W}/{n}.png")
        cp(f"{ST}/emissive_masks/{n}_em.png", f"{W}/{n}_em.png")


def final_boss():
    for p in (1, 2, 3):
        cp(f"{ST}/final_boss/hollowmourn_p{p}.png", f"{W}/hollowmourn_p{p}.png")
        cp(f"{ST}/emissive_masks/hollowmourn_p{p}_em.png", f"{W}/hollowmourn_p{p}_em.png")


if __name__ == "__main__":
    steps = sys.argv[2].split(",") if len(sys.argv) > 2 else ["palette", "ghosts", "trees", "spells", "telegraphs", "minis", "final_boss"]
    for s in steps:
        globals()[s]()
        print("ok", s)
