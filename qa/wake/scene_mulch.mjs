// Old Mulch on the vale by the road gate: stand the hero beside him, let him wind up, shoot during the tell (blue rune ring).
export default async function ({ page, ev, shot }) {
  await ev(() => { const g = window.__gw; g.worldMs = 30 * 60 * 1000 + 60000; g.enterWorld(91 * 16 + 8, 128 * 16 + 8); g.hp = g.maxHp; });
  await page.waitForTimeout(500);
  await ev(() => { const g = window.__gw; const m = g.roamers.find((r) => r.early); if (m) { g.px = m.x - 30; g.py = m.y + 4; } g.roamers = g.roamers.filter((r) => r.early); });
  const out = [];
  for (let i = 0; i < 40; i++) {
    await page.waitForTimeout(150);
    const st = await ev(() => { const g = window.__gw; g.hp = g.maxHp; const m = g.roamers.find((r) => r.early); return m ? { tell: m.tell ?? 0, act: m.actFor ?? 0, mode: g.mode } : null; });
    if (st && st.tell > 0 && out.length < 2) { out.push(await shot(`mulch_tell_${out.length}`)); await page.waitForTimeout(250); }
    if (out.length >= 2) break;
  }
  if (!out.length) out.push(await shot("mulch_notell"));
  return out;
}
