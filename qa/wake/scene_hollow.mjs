// The ending: the stair under Blackroot, Hollowmourn in the Wake Hall through his three phases, the Last Toll, the epilogue.
export default async function ({ page, ev, shot }) {
  const out = {};
  out.stair = await ev(() => {
    const g = window.__gw; g.level = 74; g.maxHp = 2000; g.hp = 2000; g.wakeOpen = true;
    g.enterDungeon("blackroot"); g.floor = 7; g.loadFloor("down");
    const T = g.tiles; let n = 0; for (let i = 0; i < T.length; i++) if (T[i] === g.tiles[g.tiles.findIndex(() => false)]) n++;
    return { floor: g.floor, mode: g.mode };
  });
  out.enter = await ev(() => {
    const g = window.__gw; g.enterDungeon("wake"); g.floor = 3; g.loadFloor("down"); if (g.fog) g.fog.fill(1);
    const r = g.roamers.find((x) => x.def === "hollowmourn"); if (!r) return "no lord";
    g.px = r.x - 60; g.py = r.y + 10; return { theme: g.theme, at: [r.x, r.y], boss: r.boss };
  });
  for (let i = 0; i < 30; i++) { await page.waitForTimeout(150); const ok = await ev(() => { const g = window.__gw; const r = g.roamers.find((x) => x.final); if (!r) { const b = g.roamers.find((x) => x.def === "hollowmourn"); if (b) { g.px = b.x - 20; g.py = b.y + 4; } } return !!r; }); if (ok) break; }
  out.fight = await ev(() => { const g = window.__gw; const r = g.roamers.find((x) => x.final); return r ? { hp: r.hp, max: r.max, atk: r.atk, ac: r.ac, xp: r.xp, silver: r.silver, helpers: g.roamers.filter((x) => x.helper).length, mood: g.mood } : "no fight"; });
  const keep = () => ev(() => { const g = window.__gw; g.hp = g.maxHp; });
  const wait = async (pred, n = 60) => { for (let i = 0; i < n; i++) { await page.waitForTimeout(120); await keep(); if (await ev(pred)) return true; } return false; };
  await wait(() => (window.__gw.roamers.find((x) => x.final)?.tell ?? 0) > 0.3, 90);
  out.p1 = await shot("hollow_p1");
  for (const [f, name] of [[0.6, "p2"], [0.3, "p3"]]) {
    await ev((f) => { const g = window.__gw; const r = g.roamers.find((x) => x.final); r.hp = Math.round(r.max * f); r.tell = 0; r.casting = ""; r.age = 20; }, f);
    await wait(() => (window.__gw.roamers.find((x) => x.final)?.phase ?? 1) >= (window.__gw.roamers.find((x) => x.final)?.hp / window.__gw.roamers.find((x) => x.final)?.max < 0.33 ? 3 : 2), 30);
    await wait(() => { const r = window.__gw.roamers.find((x) => x.final); return r && r.casting === "big" && (r.tell ?? 0) > 0.3; }, 90);
    out[name] = { shot: await shot(`hollow_${name}`), state: await ev(() => { const r = window.__gw.roamers.find((x) => x.final); return { phase: r.phase, big: r.big, tag: r.bigTag, mood: window.__gw.mood }; }) };
  }
  await ev(() => { const g = window.__gw; const r = g.roamers.find((x) => x.final); r.hp = Math.round(r.max * 0.04); });
  await wait(() => window.__gw.roamers.find((x) => x.final)?.pattern === "lasttoll", 20);
  out.lastToll = { shot: await shot("hollow_lasttoll"), log: await ev(() => window.__gw.logLine) };
  await ev(() => { const g = window.__gw; const r = g.roamers.find((x) => x.final); g.hurtFoe(r, 999999); return r.hp; });
  out.unkillable = await ev(() => window.__gw.roamers.find((x) => x.final)?.hp);
  await wait(() => window.__gw.roamers.find((x) => x.final)?.staggered, 30);
  out.afterToll = await ev(() => ({ hp: window.__gw.hp, max: window.__gw.maxHp, log: window.__gw.logLine }));
  await ev(() => { const g = window.__gw; const r = g.roamers.find((x) => x.final); g.hurtFoe(r, 1); });
  await page.waitForTimeout(400);
  out.ending = await ev(() => ({ mode: window.__gw.mode, scene: window.__gw.ending?.scene, mood: window.__gw.mood }));
  out.epi1 = await shot("hollow_epilogue1"); console.error(JSON.stringify(out));
  for (let i = 0; i < 8; i++) { await page.getByRole("button", { name: /Continue|Return/ }).click(); await page.waitForTimeout(80); }
  out.credits = await shot("hollow_credits");
  await page.getByRole("button", { name: /Return to the vale/ }).click(); await page.waitForTimeout(500);
  out.after = await ev(() => ({ mode: window.__gw.mode, map: window.__gw.mapId, endingSeen: window.__gw.endingSeen, saved: JSON.parse(localStorage.getItem("gravewake-autosave-v1") || "{}").rec?.endingSeen }));
  return out;
}
