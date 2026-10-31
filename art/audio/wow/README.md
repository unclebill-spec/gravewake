# Gravewake "wow" SFX
Mono OGG Vorbis (q1, 44.1 kHz), all original procedural audio from `make_wow.py` (needs numpy + ffmpeg; it reuses `../synth.py`).
One-shots are about -18 LUFS unless noted (short files are measured with silence padding). Highs are rolled off around 6.5 to 8.5 kHz, and true peaks stay at or below -2.8 dBFS.

| File | Moment | Suggested vol | Pitch var | Stacking |
|---|---|---|---|---|
| loot-common.ogg | common item drop/pickup | 0.8 | ±3% | cap 2, 60 ms cooldown |
| loot-rare.ogg | rare (teal) drop | 0.9 | ±2% | cap 1 |
| loot-epic.ogg | epic (violet) drop | 1.0 | none | cap 1, ducks loot-common |
| levelup.ogg | level up | 1.0 | none | cap 1 |
| coin-glint.ogg | purchase / coin spend | 0.8 | ±4% | cap 2, 50 ms |
| trophy-shimmer.ogg | trophy/achievement idle glint (-28 LUFS) | 0.7 | ±3% | cap 1 |
| boss-relight.ogg | boss defeated, candles relight | 1.0 | none | cap 1 |
| hit-spark-1/2/3.ogg | neon hit sparks (pick at random, no repeats) | 0.6 | ±4% | cap 3, 40 ms cooldown |
| wayrift-swirl.ogg | wayrift activation | 0.9 | ±2% | cap 1 |
| wisp-twinkle.ogg | 8 s seamless loop, firefly twinkles (-28 LUFS) | 0.6 | none | loop, 1 instance per area |
