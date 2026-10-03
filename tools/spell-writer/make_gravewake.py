"""Build Gravewake's spell strips.

    python3 tools/spell-writer/make_gravewake.py

Each file is six 16×16 frames.
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from PIL import Image

from spell_writer import emits_for, frames_for, strip

OUT = Path(__file__).resolve().parents[2] / "public" / "art" / "spells" / "gen"
NAMES = [
    "fire", "ice", "lightning", "venom", "shadow", "holy",
    "beam-fire", "beam-ice", "beam-lightning", "beam-holy", "beam-shadow", "beam-venom",
    "orb", "fire-rain", "ice-rain",
    "ring", "nova", "cone",
]


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    preview = []
    for name in NAMES:
        frames = frames_for(name)
        strip(frames).save(OUT / f"{name}.png")
        preview.extend(frames[:1])
    sheet = strip(preview)
    sheet.resize((sheet.width * 4, sheet.height * 4), Image.NEAREST).save(OUT / "preview.png")
    # C11: the light each strip casts, for the engine's light layer (src/game/draw.ts SPELL_EMITS mirrors it)
    emits = {name: emits_for(name) for name in NAMES}
    (Path(__file__).resolve().parent / "emits.json").write_text(json.dumps(emits, indent=1, sort_keys=True) + "\n")
    print(f"wrote {len(NAMES)} strips to {OUT}")


def playtest1h(out: Path = OUT.parent / "fx") -> dict:
    """playtest1h ([OWNER-REQUESTED 2026-10-02 19:43 ET: playtest1h art and loading audit]): the cast, impact, area and
    whirl strips (fx_writer.py) that frame the bolts above, in public/art/spells/fx (gen/ stays the bolts and their emits).
    The strips above are untouched. Runs on its own:
    python3 -c "import make_gravewake as m; m.playtest1h()"  (from this folder)."""
    sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "sprite-writer"))
    from fx_writer import strips
    from palette_locked import LOCKED_V3

    out.mkdir(parents=True, exist_ok=True)
    made = strips()
    for name, im in made.items():
        for r, g, b, a in im.convert("RGBA").getdata():
            if a not in (0, 255):
                raise SystemExit(f"{name}: a soft pixel (alpha {a})")
            if a and f"#{r:02x}{g:02x}{b:02x}" not in LOCKED_V3:
                raise SystemExit(f"{name}: #{r:02x}{g:02x}{b:02x} is not in palette v3")
        im.save(out / name)
    rows = [n for n in sorted(made) if n != "whirl.png"] + ["whirl.png"]
    sheet = Image.new("RGBA", (392, sum(made[n].height + 2 for n in rows) + 4), (20, 14, 18, 255))
    y = 2
    for n in rows:
        sheet.alpha_composite(made[n], (4, y))
        y += made[n].height + 2
    sheet.resize((sheet.width * 2, sheet.height * 2), Image.NEAREST).save(out / "preview-playtest1h.png")
    return made


if __name__ == "__main__":
    main()
