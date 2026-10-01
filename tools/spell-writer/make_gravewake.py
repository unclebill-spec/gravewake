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


if __name__ == "__main__":
    main()
