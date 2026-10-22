// Step 5: a story boss (Dracula, 3 phases) and a minor one (Frankenstein, 1 change): phases and their own big moves.
export default async function ({ page, ev, shot }) {
  const out = {};
  for (const [dg, id, lv] of [["vesper", "dracula", 50], ["harrow", "frank", 8]]) {
    const ok = await ev(([dg, lv]) => { const g = window.__gw; g.level = lv; g.maxHp = 5000; g.hp = 5000; g.worldMs = 9e6; g.bossDead = {}; g.enterDungeon(dg); const def = g.floors; for (let i = 0; i < 12; i++) { if (g.roamers.some((r) => r.boss)) break; g.floor += 1; g.loadFloor("down"); } if (g.fog) g.fog.fill(1); const b = g.roamers.find((r) => r.boss); if (!b) return "no boss"; g.px = b.x - 20; g.py = b.y + 4; return b.def; }, [dg, lv]);
    const seen = [];
    for (let i = 0; i < 400; i++) {
      await page.waitForTimeout(100);
      const s = await ev((id) => { const g = window.__gw; g.hp = g.maxHp; const r = g.roamers.find((x) => x.boss && x.def === id && x.aggro); if (!r) { const b = g.roamers.find((x) => x.boss); if (b) { g.px = b.x - 20; g.py = b.y + 4; } return null; } r.age = Math.max(r.age ?? 0, 7); const f = (r.hp / r.max); return { phase: r.phase ?? 1, big: r.casting === "big" ? `${r.big}/${r.bigTag}/${r.pattern || "aim"}` : "", f: Math.round(f * 100) }; }, id);
      if (s && s.big && !seen.includes(`${s.phase}:${s.big}`)) { seen.push(`${s.phase}:${s.big}`); if (seen.length <= 4) out[`${id}_${seen.length}`] = await shot(`variety_${id}_${seen.length}`); }
      if (i % 50 === 49) await ev((id) => { const g = window.__gw; const r = g.roamers.find((x) => x.boss && x.def === id); if (r) { r.hp = Math.round(r.hp * 0.6); } }, id);
    }
    out[id] = { ok, seen, log: await ev(() => window.__gw.logLine) };
    await ev(() => { const g = window.__gw; g.roamers = []; });
  }
  return out;
}
