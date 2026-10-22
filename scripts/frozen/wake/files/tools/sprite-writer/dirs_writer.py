"""playtest1o [OWNER-REQUESTED 2026-10-03 19:49 ET: playtest1o motion, collision and art check]: every body from
behind and from the side.

Bill (2026-10-03 19:49 ET): "the sprites all interact correctly and walk the right directions?" Every older strip is a
body facing the camera, so a person walking up the screen or sideways still showed its face. This draws the same
bodies, frame for frame, in two more views and writes one -dirs sheet per strip, two 32 px rows each:

    row 0 (y 0..31):  back  — walking up the screen; no face, the hair, hood, helm or cape behind (mirrored:
                      what a body holds on its right is on the screen's right seen from behind)
    row 1 (y 32..63): side  — walking right; the game mirrors it for walking left

Columns match the source strip exactly (same body, same eleven poses, same order), so the game picks a cell the way
it always has and only changes the sheet and the row. The profile families (horse, cat, rat) are already drawn
facing right, so both rows are their one frame. Feet stay on row 28 (outline 29), palette locked, hard alpha.

    python3 tools/sprite-writer/dirs_writer.py      (make_gravewake.py runs it too)

playtest1p [OWNER-APPROVED 2026-10-04 01:10 ET: playtest1p view polish and big bosses]: the views are laid by hand
(views_writer.py: a true profile with a stride and swinging arms, the back of the head and body), and a third row:

    row 2 (y 64..95): west — walking left, its own drawing: the hands keep what they hold (facing east the weapon
                      hand is the far one, facing west the near one), so it is not the east row in a mirror. Drawn
                      creatures and the swim, slide and fish moves have no hand to keep: their west row is the east
                      row turned over.
"""

from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from PIL import Image

import sprite_writer as sw
from palette_locked import LOCKED
from sprite_writer import MOVES, POSES, creature, festival_boss, human, human_move, strip

VIEWS = ("back", "side", "west")  # playtest1p: the west row
EM_COLOURS = ("#f4e27a", "#fff8e0", "#e0a040")  # the pixel writer's glow-mask colours (pixel-writer make_gravewake.EM_COLOURS)
EM_SOURCES = ("foes", "pumpkin-lord", "krampus")


def bodies(m) -> dict[str, list]:
    """Every strip make_gravewake.main() writes, as lists of Sprites, drawn in the current sw.VIEW."""
    pack = lambda make: [make(pose) for pose in POSES]  # noqa: E731
    return {
        "people": [sp for role in m.FOLK for sp in pack(lambda pose, role=role: human(role, pose))],
        "allies": [sp for role in m.ALLIES for sp in pack(lambda pose, role=role: human(role, pose, sash=m.SASH))],
        "foes": [sp for kind in m.FAMILIES for rank in m.RANKS for sp in pack(lambda pose, kind=kind, rank=rank: creature(kind, pose, rank))],
        "folk-variants": [sp for role in m.CROWD for v in range(1, m.CROWD_VARIANTS + 1) for sp in pack(lambda pose, role=role, v=v: human(role, pose, variant=v))],
        "moves": [human_move(role, move) for role in m.FOLK for move in MOVES],
        "mimic": pack(lambda pose: creature(m.MIMIC, pose, "rare")),
        **{name[:-4]: pack(lambda pose, kind=kind: festival_boss(kind, pose)) for name, kind in m.FESTIVAL_STRIPS.items()},
    }


def em_mask(src: Image.Image) -> Image.Image:
    keep = {tuple(int(c[i:i + 2], 16) for i in (1, 3, 5)) for c in EM_COLOURS}
    src = src.convert("RGBA")
    em = Image.new("RGBA", src.size, (0, 0, 0, 0))
    sp, ep = src.load(), em.load()
    for y in range(src.size[1]):
        for x in range(src.size[0]):
            r, g, b, a = sp[x, y]
            if a == 255 and (r, g, b) in keep:
                ep[x, y] = (r, g, b, 255)
    return em


def _check(name: str, im: Image.Image, width: int) -> None:
    if im.size != (width, 32 * len(VIEWS)):
        raise SystemExit(f"{name}: size {im.size}, expected {(width, 32 * len(VIEWS))}")
    data = im.convert("RGBA").tobytes()
    bad = set()
    for i in range(0, len(data), 4):
        r, g, b, a = data[i : i + 4]
        if a and (a != 255 or f"#{r:02x}{g:02x}{b:02x}" not in LOCKED):
            bad.add(f"#{r:02x}{g:02x}{b:02x}/{a}")
    if bad:
        raise SystemExit(f"{name}: soft or off-palette pixels {sorted(bad)[:6]}")


def _mirror_back(name: str, back: Image.Image, m) -> Image.Image:
    """From behind, a body's right hand is on the right of the screen: each back cell is mirrored, so a shield, a staff
    or a lantern held on one side of the front view is on the other side seen from behind (the game mirrors the side
    view the same way, round the cell's middle). The profile families keep their one frame as drawn."""
    out = back.copy()
    for c in range(back.width // 16):
        if name == "foes" and m.FAMILIES[c // (len(m.RANKS) * len(POSES))] in sw.SIDE_NATIVE:
            continue
        cell = back.crop((c * 16, 0, c * 16 + 16, 32))
        out.paste(cell.transpose(Image.FLIP_LEFT_RIGHT), (c * 16, 0))
    return out


def main(out: Path | None = None) -> dict[str, Image.Image]:
    import make_gravewake as m

    out = out or m.OUT
    rows: dict[str, list[Image.Image]] = {}
    try:
        for view in VIEWS:
            sw.VIEW = "side" if view == "west" else view
            sw.WEST = view == "west"
            for name, sprites in bodies(m).items():
                if name in ("people", "foes", "mimic", "krampus", "pumpkin-lord"):
                    # a standing body keeps its feet on row 28, outline 29, in every view (the shade and the
                    # festival bosses' hems aside, as in make_gravewake)
                    for k in range(0, len(sprites), len(POSES)):
                        st = sprites[k]
                        ys = [y for y in range(32) if any(st.p[y][x] for x in range(16))]
                        who = f"{name}[{k // len(POSES)}] {view}"
                        if name == "people" and m.FOLK[k // len(POSES)] == "shade":
                            continue
                        if ys and ys[-1] != 29 and name != "foes":
                            raise SystemExit(f"{who}: the stand frame ends on row {ys[-1]}, expected 29")
                rows.setdefault(name, []).append(strip(sprites))
    finally:
        sw.VIEW = "front"
        sw.WEST = False
    made: dict[str, Image.Image] = {}
    for name, (back, side, west) in rows.items():
        src = Image.open(out / f"{name}.png")
        sheet = Image.new("RGBA", (src.width, 32 * len(VIEWS)), (0, 0, 0, 0))
        sheet.alpha_composite(_mirror_back(name, back.convert("RGBA"), m), (0, 0))
        sheet.alpha_composite(side.convert("RGBA"), (0, 32))
        sheet.alpha_composite(west.convert("RGBA"), (0, 64))
        _check(f"{name}-dirs.png", sheet, src.width)
        made[f"{name}-dirs.png"] = sheet
    for name in EM_SOURCES:
        made[f"{name}-dirs_em.png"] = em_mask(made[f"{name}-dirs.png"])
    for n, im in made.items():
        im.save(out / n)
    return made


if __name__ == "__main__":
    print(" ".join(sorted(main())))
