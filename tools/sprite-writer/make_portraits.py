"""playtest1b: write public/art/sprites/portraits.png (48 x 64 per class, in HEROES order) and a x4 preview.
Checks every pixel against palette v3 and that nothing is soft."""

from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from PIL import Image

from palette_locked import LOCKED_V3
from portrait_writer import PORTRAITS, H, W

OUT = Path(__file__).resolve().parents[2] / "public" / "art" / "sprites"
ORDER = ["warrior", "wizard", "assassin", "vampire"]


def main() -> None:
    sheet = Image.new("RGBA", (W * len(ORDER), H), (0, 0, 0, 0))
    for i, k in enumerate(ORDER):
        sheet.paste(PORTRAITS[k]().image(), (i * W, 0))
    for r, g, b, a in sheet.getdata():
        if a not in (0, 255) or (a and f"#{r:02x}{g:02x}{b:02x}" not in LOCKED_V3):
            raise SystemExit("portraits: off palette v3 or soft")
    sheet.save(OUT / "portraits.png")
    sheet.resize((sheet.width * 4, sheet.height * 4), Image.NEAREST).save(OUT / "preview-portraits.png")
    print("portraits", sheet.size, "palette v3 locked")


if __name__ == "__main__":
    main()
