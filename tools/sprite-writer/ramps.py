"""Palette v2 ramps (style/STYLE_TARGET_core_keeper.md section 4), dark to light.

[OWNER-APPROVED 2026-10-01: CORE KEEPER GRAPHICS PASS C1-C11] C3: the master palette arranged as ramps. Every colour
is in LOCKED_V2 (LOCKED plus the three C3 colours). An asset uses at most 4 ramps (20 colours); step 0 is reserved
for an outline or a contact shadow. flame and spectral are emissive only.
"""

from __future__ import annotations

from palette_locked import LOCKED_V2

RAMPS = {
    "void": ["#07060a", "#100c12", "#1a1424", "#241830"],
    "crypt": ["#1a1430", "#2a1c30", "#3a2a44", "#4a3a58", "#6a5878", "#9a8aa8", "#c8b8d0"],
    "flag": ["#1c1418", "#2a2428", "#3a3030", "#4a4450", "#5a564e", "#6a6660", "#8a867c"],
    "moss": ["#102018", "#1e3a28", "#2f6a44", "#4a8a48", "#9ec060"],
    "wood": ["#1a1008", "#3a2818", "#5a3828", "#8a5a30", "#b09060"],
    "bone": ["#2e2030", "#6a5a4a", "#a89470", "#d8c8a0", "#f4ecdc"],
    "wine": ["#140810", "#4a1020", "#8a2030", "#c43838", "#e07088"],
    "pumpkin": ["#3a1810", "#8a3a18", "#c45a18", "#e07a2f", "#e0a040"],
    "steel": ["#101014", "#2a2a2e", "#4a4e54", "#8a8e94", "#d8dce0", "#f4f0e8"],
    "skin": ["#3a1e1c", "#6a3a28", "#a06050", "#e8b898", "#f0d8c8"],
    "tabard": ["#101820", "#1a2848", "#2a4568", "#3a78a8", "#8eb4d8"],
    "gold": ["#3a2818", "#6a4818", "#c4a050", "#f0d060", "#fff0c0"],
    "hex": ["#140c28", "#2a1848", "#5a3080", "#7a5ad0", "#c9a0e8"],
    "emberlit": ["#2a1810", "#4a2818", "#6a3a28", "#8a5a30", "#c08060", "#e0b060"],
    "coldlit": ["#1a2030", "#2a3140", "#3a4a68", "#5a6878", "#8aa0c8"],
    "flame": ["#c45a18", "#e07a2f", "#f0d060", "#fff0c0"],
    "spectral": ["#163044", "#3a78a8", "#7ec8e0", "#d0e4ff", "#f4fbff"],
}

MISSING = sorted({c for r in RAMPS.values() for c in r} - LOCKED_V2)
if MISSING:
    raise SystemExit(f"ramp colours not in LOCKED_V2: {MISSING}")


def ramps_of(colours) -> set[str]:
    """The ramps an asset's colours touch (a colour in several ramps counts for the first only)."""
    out = set()
    for c in colours:
        for name, r in RAMPS.items():
            if c in r:
                out.add(name)
                break
    return out
