"""Build Gravewake's people and creatures.

    python3 tools/sprite-writer/make_gravewake.py

Each body is eleven frames: stand, idle, walk0, walk1, walk2,
swing0 (wind-up), swing1 (hit), swing2 (follow-through),
cast0 (gather), cast1 (release), cast2 (scatter).

The script checks its own output before it writes: every pixel is one of the
game's locked colors, every strip keeps its size, and every standing person
still has feet on row 28 so the game's draw anchor holds.
"""

from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from PIL import Image

from palette_locked import LOCKED
from sprite_writer import MOVES, POSES, creature, festival_boss, human, human_move, lying, strip

OUT = Path(__file__).resolve().parents[2] / "public" / "art" / "sprites"

FOLK = [
    "warrior", "wizard", "assassin", "vampire",
    "priest", "witch", "shade", "mystic",
    "guard", "hunter", "undertaker", "zeppelin",
    "inn", "shop", "guild", "bank", "casino", "patron",
    "smith", "tailor", "fisher", "merchant", "alchemist", "portal",
    # playtest1: the companion kits' own looks (they wore hero classes before). Appended, so every index holds.
    "sellsword", "cutpurse", "hedgemage",
]
ALLIES = FOLK[:8] + FOLK[24:27]
HEROES = FOLK[:4]
FAMILIES = [
    "zombie", "skeleton", "ghost", "bat", "ghoul", "witch", "lantern", "scarecrow",
    "wolf", "mummy", "vampire", "tree", "lich", "horse", "goblin", "cat", "rat",
]
RANKS = ["mob", "boss", "mini", "rare"]
SASH = "#3a78a8"
# Town roles get seeded crowd looks in folk-variants.png. Look 0 stays in people.png.
CROWD = FOLK[8:24] + FOLK[24:27]
CROWD_VARIANTS = 4
# OWNER-APPROVED EXCEPTION 2026-09-30: the mimic, a 13th family and the one solo rare. Its own strip,
# rank rare only (it only ever wakes as a rare), so foes.png and ORDER.txt stay byte-identical.
# mimic.png: eleven frames, stand idle walk0 walk1 walk2 swing0 swing1 swing2 cast0 cast1 cast2.
MIMIC = "mimic"
# OWNER-APPROVED EXCEPTION 2026-10-01: FESTIVAL BOSSES (Harvest Moon, Krampusnacht).
FESTIVAL_STRIPS = {"krampus.png": "krampus", "pumpkin-lord.png": "pumpkinlord"}
# Owner-approved 2026-09-30: a freed captive knocked down on the escort. One 32x16 cell each, in the
# order of RESCUES in src/game/content.ts (id, people.png body, crowd seed). The look is the crowd look
# the game picks from the seed (crowd.ts crowdLook), so the figure on the floor is the one that walked.
ESCORTS = [("wren", "shop", "captive-wren-1"), ("tansy", "alchemist", "captive-tansy"), ("corin", "patron", "captive-corin")]


def crowd_look(seed: str) -> int:
    """crowd.ts crowdLook, bit for bit: FNV-1a over the seed, two mixing steps, mod looks + 1."""
    h = 0x811C9DC5
    for ch in seed:
        h ^= ord(ch)
        h = (h * 0x01000193) & 0xFFFFFFFF
    h ^= h >> 15
    h = (h * 0x2C1B3C6D) & 0xFFFFFFFF
    h ^= h >> 12
    return h % (CROWD_VARIANTS + 1)


def pack(make):
    return [make(pose) for pose in POSES]


def _verify(name: str, im: Image.Image, cells: int) -> None:
    if im.size != (16 * cells, 32):
        raise SystemExit(f"{name}: size {im.size}, expected {(16 * cells, 32)}")
    bad = set()
    data = im.convert("RGBA").tobytes()
    for i in range(0, len(data), 4):
        r, g, b, a = data[i], data[i + 1], data[i + 2], data[i + 3]
        if a == 0:
            continue
        if a != 255:
            raise SystemExit(f"{name}: a pixel is not fully opaque")
        c = f"#{r:02x}{g:02x}{b:02x}"
        if c not in LOCKED:
            bad.add(c)
    if bad:
        raise SystemExit(f"{name}: colors outside the locked palette: {sorted(bad)}")


def _feet(sprites, label: str) -> None:
    """A standing person keeps the lowest body pixel on row 28 and its outline on row 29."""
    stand = sprites[0]
    rows = [y for y in range(32) if any(stand.p[y][x] for x in range(16))]
    if rows and rows[-1] != 29:
        raise SystemExit(f"{label}: the stand frame ends on row {rows[-1]}, expected 29")


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    people_rows = [pack(lambda pose, role=role: human(role, pose)) for role in FOLK]
    for role, row in zip(FOLK, people_rows):
        if role != "shade":  # the shade floats on a torn hem
            _feet(row, role)
    people = [sprite for row in people_rows for sprite in row]
    heroes = [sprite for role in HEROES for sprite in pack(lambda pose, role=role: human(role, pose))]
    allies = [sprite for role in ALLIES for sprite in pack(lambda pose, role=role: human(role, pose, sash=SASH))]
    foes = [
        sprite
        for kind in FAMILIES
        for rank in RANKS
        for sprite in pack(lambda pose, kind=kind, rank=rank: creature(kind, pose, rank))
    ]
    crowd = [
        sprite
        for role in CROWD
        for v in range(1, CROWD_VARIANTS + 1)
        for sprite in pack(lambda pose, role=role, v=v: human(role, pose, variant=v))
    ]
    # playtest1: moves.png, the swim, slide, fish and climb poses, MOVES frames per role in FOLK order.
    moves = [human_move(role, move) for role in FOLK for move in MOVES]
    mimic = pack(lambda pose: creature(MIMIC, pose, "rare"))
    for pose, sprite in zip(POSES, mimic):
        rows = [y for y in range(32) if any(sprite.p[y][x] for x in range(16))]
        if pose == "stand" and rows[-1] != 29:
            raise SystemExit(f"mimic: the stand frame ends on row {rows[-1]}, expected 29")
    # OWNER-APPROVED EXCEPTION 2026-10-01: FESTIVAL BOSSES. Their own strips (boss format: 16x32, eleven
    # frames), so foes.png and ORDER.txt stay byte-identical. Drawn at boss scale by the game.
    fest = {name: pack(lambda pose, kind=kind: festival_boss(kind, pose)) for name, kind in FESTIVAL_STRIPS.items()}
    for name, row in fest.items():
        rows = [y for y in range(32) if any(row[0].p[y][x] for x in range(16))]
        if rows[-1] != 29:
            raise SystemExit(f"{name}: the stand frame ends on row {rows[-1]}, expected 29")
    sheets = {
        "people.png": (strip(people), len(people)),
        "heroes.png": (strip(heroes), len(heroes)),
        "allies.png": (strip(allies), len(allies)),
        "foes.png": (strip(foes), len(foes)),
        "folk-variants.png": (strip(crowd), len(crowd)),
        "mimic.png": (strip(mimic), len(mimic)),
        "moves.png": (strip(moves), len(moves)),
        **{name: (strip(row), len(row)) for name, row in fest.items()},
    }
    down = strip([lying(human(body, "stand", variant=crowd_look(seed))) for _, body, seed in ESCORTS])
    if down.size != (32 * len(ESCORTS), 16):
        raise SystemExit(f"escort-down.png: size {down.size}")
    for name, (im, cells) in sheets.items():
        _verify(name, im, cells)
    for i in range(0, len(down.tobytes()), 4):
        r, g, b, a = down.tobytes()[i : i + 4]
        if a and (a != 255 or f"#{r:02x}{g:02x}{b:02x}" not in LOCKED):
            raise SystemExit("escort-down.png: a pixel is soft or outside the locked palette")
    down.save(OUT / "escort-down.png")
    for name, (im, _) in sheets.items():
        im.save(OUT / name)
    sample = strip(people[:12] + foes[:6])
    sample.resize((sample.width * 3, sample.height * 3), Image.NEAREST).save(OUT / "preview.png")
    (OUT / "ORDER.txt").write_text(
        "Eleven frames each: stand idle walk0 walk1 walk2 swing0 swing1 swing2 cast0 cast1 cast2.\n"
        "people.png and heroes.png and allies.png use this role order:\n"
        + " ".join(FOLK)
        + "\nallies.png is the first eight roles, with a blue sash.\n"
        "foes.png families, and inside each family the ranks mob boss mini rare:\n"
        + " ".join(FAMILIES)
        + f"\nfolk-variants.png: crowd looks 1..{CROWD_VARIANTS} for each town role, in this order, "
        "eleven frames per look (look 0 is the people.png cell):\n"
        + " ".join(CROWD)
        + "\nallies.png also holds the three companion looks after the eight: sellsword cutpurse hedgemage.\n"
        "moves.png: " + " ".join(MOVES) + " for each role, in the people.png role order.\n"
        "Drawn by tools/sprite-writer.\n"
    )
    print(f"people {len(people)} allies {len(allies)} foes {len(foes)} crowd {len(crowd)}")


if __name__ == "__main__":
    main()
