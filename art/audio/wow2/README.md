# Gravewake wow2 SFX (Hearthmoor Sound)
New sounds for the cues marked **NEW SFX** in `staging/art/wow2/TIMINGS.md`. Mono OGG Vorbis, 44.1 kHz, highs rolled off above 9 kHz.
Length = frames × ms/frame. Offset = when to start the sound, measured from frame 0 of the effect.

| file | effect (frame) | length | offset | suggested volume | notes |
|---|---|---|---|---|---|
| whoosh-pillar.ogg | flame pillar start (f0) | 600 ms (6×100) | 0 ms | 0.8 | cold soft whoosh, crackle tail; one-shot, then ambient crackle |
| whoosh-wall-loop.ogg | fire wall (f0, loop) | 600 ms loop (6×100) | 0 ms | 0.6 | seamless loop; play whoosh-pillar once at wall start, then loop this until the wall ends |
| whoosh-relight.ogg | relight_burst_32 (f0) | 533 ms (8×67) | 0 ms | 0.7 | layer with wow/boss-relight.ogg at f0 |
| dissolve-ghost.ogg | wraith_dissolve_16x32 (f0) | 800 ms (8×100) | 0 ms | 0.8 | breathy choir sigh + airy shimmer |
| dissolve-ash-soft.ogg | ash_fireflies_16 (f0) | 800 ms (8×100) | 0 ms | 0.6 | softer, darker variant (-24 LUFS) |
| dissolve-wisp-rise.ogg | grave_wisp_16x32 (f0 of the ~2 s loop) | 600 ms (6×100) | 0 ms | 0.5 | reversed, rising; once on appear, not every cycle |

Levels: one-shots ≈ -18 LUFS (wisp -20, ash -24), wall loop -24 LUFS; all true peaks ≤ -2.5 dBFS (measured with 0.6 s silence padding).
Regenerate: `python3 make_wow2.py` (uses `../synth.py`).

## Review 2026-10-25 (Hearthmoor Sound)
Measured, not listened to: ffmpeg ebur128 (integrated LUFS and true peak, short clips padded with 0.3 s silence), numpy peak/DC/clipping, spectral centroid, energy share above 6 kHz, durations from libvorbis (soxi), and loop wrap checks (sample jump and slope at the wrap compared with the file's own sample-to-sample spread).
Note: ffmpeg's built-in Vorbis decoder drops about 128 samples at the end of these short files, which made the wall loop look like it clicked. Decoded with libvorbis (sox, which is what engines use), it is exactly 26,460 samples (600 ms) and the wrap jump is 0.009, below the file's median step. No click.

| file | status | LUFS | true peak | duration vs timing | notes |
|---|---|---|---|---|---|
| whoosh-pillar.ogg | READY | -18.7 | -6.5 dBFS | 600 / 600 ms | centroid 894 Hz, 0.3% energy above 6 kHz (soft), no DC, 7 KB |
| whoosh-wall-loop.ogg | READY | -23.8 (bed) | -7.9 | 600 / 600 ms loop | seamless under libvorbis decode (see above), 6 KB |
| whoosh-relight.ogg | READY | -18.2 | -5.4 | 533 / 533 ms | 7 KB |
| dissolve-ghost.ogg | READY | -19.2 | -7.1 | 800 / 800 ms | about 1 dB under the -18 target. Fine at volume 0.8, or raise to 0.9. 7 KB |
| dissolve-ash-soft.ogg | READY | -25.0 | -12.2 | 800 / 800 ms | quiet on purpose (soft variant), 7 KB |
| dissolve-wisp-rise.ogg | READY | -21.6 | -8.5 | 600 / 600 ms | 6 KB |

No files were changed. All six are mono, under 10 KB, have no clipping or DC, and carry almost nothing above 6 kHz, so nothing harsh.
