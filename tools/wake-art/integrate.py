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
    # ghost_trees/README: each rank sheet into the ghost family's 11-frame run of foes.png (and its glow mask); the -dirs
    # sheet (rows: back, east, west) gets the same front art (east as is, west turned over, back with no eye glow).
    fam = FAMS.index("ghost")
    for sheet, em, rows in ((f"{S}/foes.png", f"{S}/foes_em.png", 1), (f"{S}/foes-dirs.png", f"{S}/foes-dirs_em.png", 3)):
        body, glow = Image.open(sheet).convert("RGBA"), Image.open(em).convert("RGBA")
        for r, rank in enumerate(RANKS):
            x0 = (fam * 4 + r) * 11 * 16
            art = Image.open(f"{ST}/ghost_trees/ghost_{rank}.png").convert("RGBA")
            msk = Image.open(f"{ST}/emissive_masks/ghost_{rank}_em.png").convert("RGBA")
            for row in range(rows):
                y0 = row * 32
                a, m = art, msk
                if rows == 3 and row == 2:  # west: each frame turned over
                    a, m = Image.new("RGBA", art.size), Image.new("RGBA", msk.size)
                    for c in range(11):
                        a.paste(art.crop((c * 16, 0, c * 16 + 16, 32)).transpose(Image.FLIP_LEFT_RIGHT), (c * 16, 0))
                        m.paste(msk.crop((c * 16, 0, c * 16 + 16, 32)).transpose(Image.FLIP_LEFT_RIGHT), (c * 16, 0))
                if rows == 3 and row == 0:
                    m = Image.new("RGBA", msk.size)  # from behind the eyes are gone
                body.paste(Image.new("RGBA", (176, 32)), (x0, y0))
                body.paste(a, (x0, y0))
                glow.paste(Image.new("RGBA", (176, 32)), (x0, y0))
                glow.paste(m, (x0, y0))
        body.save(sheet)
        glow.save(em)


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
