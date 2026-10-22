"""Follow-up 2026-10-21: the plain ghost's two eyes glow. Rebuilds public/art/writer/ghost_mob_em.png from ghost_mob.png:
dirs_writer.em_mask (the EM_COLOURS pixels) plus the eye pixels (#9ec8e8 in the face box, x 5..10, rows 6..12) as #fff8e0.
The -dirs sheet is left alone: its back is faceless and its side shows no eyes (charfix 03)."""
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent))
from PIL import Image
from dirs_writer import em_mask

ROOT = Path(__file__).resolve().parents[2]
EYE, GLOW = (0x9E, 0xC8, 0xE8), (0xFF, 0xF8, 0xE0, 255)


def main() -> None:
    src = Image.open(ROOT / "public/art/writer/ghost_mob.png").convert("RGBA")
    em = em_mask(src)
    sp, ep = src.load(), em.load()
    for f in range(src.size[0] // 16):
        for y in range(6, 13):
            for x in range(5, 11):
                p = sp[f * 16 + x, y]
                if p[3] == 255 and p[:3] == EYE:
                    ep[f * 16 + x, y] = GLOW
    em.save(ROOT / "public/art/writer/ghost_mob_em.png")


if __name__ == "__main__":
    main()
