"""Wake leftovers [OWNER-APPROVED 2026-10-21 20:43 ET: build out the ending's leftovers per design/ending.md]:
The Bellringer, Hollowmourn's remnant (design/ending.md 7): a mourner wraith ringing a hand-bell. Not the lich.

Original, code-drawn with sprite_writer.Sprite (palette v3, hard alpha, 1 px warm outline), 16x32 base, 6 frames in one
row, the same columns as the wake minis (wake.ts WAKE_SHEETS): 0 idle, 1 idle bob, 2 wind-up (bell raised), 3 ring
(bell swung down, sound lines), 4 hit (the ring's follow-through), 5 hurt. The game draws it whole-pixel at x3 (the
remnant rank). Also writes bellringer_em.png: the eyes, the candle flame and the sound lines only.
Run: python3 bellringer_writer.py
"""

from __future__ import annotations

from pathlib import Path

from sprite_writer import Sprite, strip

OUT = Path(__file__).resolve().parents[2] / "public" / "art" / "writer"
INK = "#140c10"
HOOD = ("#3a4458", "#5a6878", "#8aa0c0")
COAT = ("#2a3140", "#3a4a5c", "#5a6878")
TUNIC = ("#2a1848", "#4a2a78")
BELT = "#4a382c"
EYE = "#7ec8e0"
IRON = ("#2a2a2e", "#4a4a50", "#8a8e94")
SOUND = "#c5d4e8"
WAX = "#d8c8a0"
FLAME = "#7ec8e0"


def frame(n: int) -> tuple[Sprite, Sprite]:
    s, em = Sprite(16, 32), Sprite(16, 32)
    bob = 1 if n == 1 else 0
    hurt = n == 5
    dx = -1 if hurt else 0
    y0 = 4 + bob
    # hood and soft-shadow face
    s.rect(5 + dx, y0, 6, 6, HOOD[1]); s.rect(6 + dx, y0 - 1, 4, 1, HOOD[1]); s.rect(5 + dx, y0, 1, 6, HOOD[0]); s.rect(10 + dx, y0 + 1, 1, 4, HOOD[2])
    s.rect(6 + dx, y0 + 2, 4, 3, COAT[0])
    for x in (7, 9):
        s.set(x + dx, y0 + 3, EYE); em.set(x + dx, y0 + 3, EYE)
    # hooded coat over a violet tunic, belted
    s.rect(4 + dx, y0 + 6, 8, 15, COAT[1]); s.rect(4 + dx, y0 + 6, 1, 15, COAT[0]); s.rect(11 + dx, y0 + 6, 1, 15, COAT[2])
    s.rect(7 + dx, y0 + 7, 2, 13, TUNIC[1]); s.rect(7 + dx, y0 + 7, 1, 13, TUNIC[0])
    s.rect(4 + dx, y0 + 13, 8, 1, BELT)
    # legs (a ragged hem, wraith feet)
    s.rect(5 + dx, y0 + 21, 2, 6 - bob, COAT[0]); s.rect(9 + dx, y0 + 21, 2, 6 - bob, COAT[0])
    # off hand: a candle
    s.rect(2 + dx, y0 + 12, 2, 4, WAX); s.set(2 + dx, y0 + 11, FLAME); em.set(2 + dx, y0 + 11, FLAME)
    # the hand-bell: held low (idle), raised (wind-up), swung down with sound lines (ring/hit)
    if n in (0, 1, 5):
        bx, by = 12 + dx, y0 + 12
    elif n == 2:
        bx, by = 12, y0 - 2
        s.rect(11, y0 + 1, 1, 6, COAT[2])  # the raised arm
    else:
        bx, by = 12, y0 + 9
    s.rect(bx, by, 3, 1, IRON[1]); s.rect(bx - 1 if bx > 12 else bx, by + 1, 4 if bx > 12 else 3, 2, IRON[1]); s.set(bx + 1, by - 1, IRON[2]); s.set(bx + 1, by + 3, IRON[0])
    if n in (3, 4):
        for i, (x, y) in enumerate(((15, by - 2), (15, by + 4), (14, by - 3), (14, by + 5))):
            if n == 3 or i < 2:
                s.set(x, y, SOUND); em.set(x, y, SOUND)
    s.outline(INK)
    for y in range(32):  # the outline never covers a lit pixel
        for x in range(16):
            if em.get(x, y):
                s.set(x, y, em.get(x, y))
    return s, em


def main() -> None:
    made = [frame(n) for n in range(6)]
    strip([a for a, _ in made]).save(OUT / "bellringer.png")
    strip([b for _, b in made]).save(OUT / "bellringer_em.png")
    print("bellringer.png 96x32, bellringer_em.png")


if __name__ == "__main__":
    main()
