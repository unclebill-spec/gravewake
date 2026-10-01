# Sprite writer

This draws the people and creatures for Gravewake. A later game can use the same file.

People are 16×32, facing the camera at the 3/4 Stardew angle. One color per pixel. A 1px warm dark
outline (`#140c10`). No blur. Each material gets two or three shade steps; light comes from the
upper right, shadow sits on the left and underneath.

Every color must already be one of the game's locked colors (`palette_locked.py`, frozen from the
hex literals in `src/game/*.ts` and the first sprite set). `Sprite.set` refuses anything else, and
shade steps are picked from that list, never mixed. The first sprite set's colors are tried first.

Each body has eleven frames, in this order:
stand, idle, walk0, walk1, walk2, swing0 (wind-up), swing1 (hit), swing2 (follow-through),
cast0 (gather), cast1 (release), cast2 (scatter).

- idle: the hips drop and shift a pixel, one hand goes to the hip, the eyes blink.
- walk: planted / passing (body up a pixel) / planted, with the arms swinging against the legs.
- swing: weapon raised behind the head, then down in front with an arc trail, then low across the body.
- cast: hands (or a staff tip) gather a small glow, release it overhead, then a few sparks scatter.
  Glow and trail pixels are plain palette pixels drawn after the outline; there is no glow effect.

The feet of every standing person end on row 28 (outline on row 29) and the body centre stays on
x 7.5, so the game's draw anchor does not move. `make_gravewake.py` checks the palette, the strip
sizes, and the feet before it writes.

```bash
python3 tools/sprite-writer/make_gravewake.py
```

That writes `public/art/sprites`. For another game:

```python
from sprite_writer import POSES, human, creature, strip

strip([human("warrior", p) for p in POSES]).save("hero.png")
strip([creature("wolf", p, "boss") for p in POSES]).save("boss.png")
strip([human("guard", p, variant=2) for p in POSES]).save("guard-2.png")
```

`human(role, pose, rank="mob", sash=None, variant=0)`: a role from `PEOPLE`, one of the eleven poses.
`variant` above 0 gives a seeded crowd look for town roles (skin, hair and hair shape, beard, clothes
from the palette); the hat, tool, and silhouette stay the role's own. Gravewake's strips use variant 0.

`creature(kind, pose, rank)`: humanoid families (`MONSTERS`) reuse the person skeleton with their own
heads; ghost, bat, scarecrow, tree, horse, cat, and rat are drawn per pose (`DRAWN`).
Ranks: `boss` is more ornate (crown, gold trim, cape or darker dress), `mini` wears an iron band and a
rust-red sash or brand, `rare` is re-tinted (`RARE_DRESS`, `FAMILY_RARE`) and carries a gold star.

Add a role in `PEOPLE`, a humanoid in `MONSTERS`, or a function in `DRAWN` when a game needs a new body.
Do not scale a photo down to fill the gap.
