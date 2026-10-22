// A wake mini-boss: Parish Ossuary's middle floor (the Wraith Knight), hero level 14 beside it, shot during its wind-up.
export default async function ({ page, ev, shot }) {
  const out = [];
  for (const [dg, lv] of [["ossuary", 14], ["warren", 36]]) {
    const ok = await ev(([dg, lv]) => {
      const g = window.__gw; g.level = lv; g.worldMs = 30 * 60 * 1000 + 60000;
      g.enterDungeon(dg);
      for (let i = 0; i < 12 && !g.roamers.some((r) => r.mini && r.def); i++) { g.floor += 1; g.loadFloor("down"); }
      return g.roamers.filter((r) => r.mini).map((r) => r.def).join(",") + " floor " + g.floor;
    }, [dg, lv]);
    out.push(ok);
    await ev(() => { const g = window.__gw; const m = g.roamers.find((r) => r.mini && r.def); if (m) { g.px = m.x - 34; g.py = m.y + 6; if (g.fog) g.fog.fill(1); } g.roamers = g.roamers.filter((r) => r.mini); g.hp = g.maxHp; });
    let n = 0;
    for (let i = 0; i < 50 && n < 1; i++) { await page.waitForTimeout(120); const t = await ev(() => { const g = window.__gw; g.hp = g.maxHp; const m = g.roamers.find((r) => r.mini); return m ? (m.tell ?? 0) : -1; }); if (t > 0.1) { out.push(await shot(`mini_${dg}`)); n++; } }
    if (!n) out.push(await shot(`mini_${dg}_idle`));
  }
  return out;
}
