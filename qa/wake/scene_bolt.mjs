// A spell bolt in flight: a wizard's bolt at a foe on the vale, shot mid-flight, then at the hit.
export default async function ({ page, ev, shot }) {
  await ev(() => { const g = window.__gw; g.worldMs = 30 * 60 * 1000 + 60000; g.enterWorld(91 * 16 + 8, 120 * 16 + 8); g.roamers = []; });
  await page.waitForTimeout(300);
  const out = [];
  for (const color of ["#e07a2f", "#7ab8e8", "#6a3a8a"]) {
    await ev((color) => { const g = window.__gw; g.spells.push({ x: g.px, y: g.py - 8, tx: g.px + 90, ty: g.py - 30, life: 0.9, max: 0.9, kind: "bolt", color }); }, color);
    await page.waitForTimeout(130);
    out.push(await shot(`bolt_${color.slice(1)}`));
    await page.waitForTimeout(500);
  }
  return out;
}
