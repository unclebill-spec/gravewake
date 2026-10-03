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

## Cast, impact, area and whirl strips (playtest1h)

[OWNER-REQUESTED 2026-10-02 19:43 ET: playtest1h art and loading audit] `fx_writer.py` draws the beats around the bolts: `cast-<el>` (four 16×16 frames, a turning sigil at the hand),
`impact-<el>` (six 32×32 frames: a hot core, a broken ring that runs out, thrown chips), `shock-<el>` (six 64×32 frames,
an area burst on the ground for a self-centred art or a nova) for fire, ice, lightning, venom, shadow and holy, and
`whirl` (six 48×24 frames, Whirl's foot dust ring). `make_gravewake.playtest1h()` writes them to `public/art/spells/fx`
with `preview-playtest1h.png` (not `gen/`, whose strips each carry an emits light). Palette v3, hard alpha. The game
draws them in `paintSpellPhased`; damage and timings do not change.
