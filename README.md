# Gravewake

A gothic Halloween real-time field-combat game for the browser: a Stardew-like 16px pixel-locked world with a town, the vale, dungeons, rifts, seasons and festivals.

## Run it
```
npm install
npm run dev
```
Build with `npm run build`. Game checks: `npm run check:game`.

## Layout
- `src/game` — simulation, drawing, lighting, particles
- `public/art` — palette-locked sprite sheets
- `tools/` — the art and map generators (sprite, pixel, spell, brileta trees, map writer)
- `rules/`, `AGENTS.project.md` — project rules
