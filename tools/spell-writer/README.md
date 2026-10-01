# Spell writer

This draws the bolts and bursts for Gravewake. A later game can ask it for the same elements.

Each spell is six frames of 16×16. One color per pixel. No glow and no blur.

```bash
python3 tools/spell-writer/make_gravewake.py
```

Strips land in `public/art/spells/gen`.

Bolts: fire, ice, lightning, venom, shadow, holy.
Solid beams: beam-fire, beam-ice, beam-lightning, beam-holy, beam-shadow, beam-venom.
A lightning bolt is the `lightning` strip. `orb` is a shot crossing the cell. `fire-rain` and `ice-rain` are falling drops.

In the game, a lightning-colored bolt uses the lightning strip. Any other bolt is a solid beam in that color. A ring or a mend is a flying orb. A nova or a cone of fire or ice is rain. Damage does not change.
