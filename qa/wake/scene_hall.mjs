// Wake leftovers: the Wake Hall arena and each of Hollowmourn's three moves (Toll, Procession, Lights Out + red orb).
export default async function ({ page, ev, shot }) {
  const out = {};
  const keep = () => ev(() => { const g = window.__gw; g.hp = g.maxHp; });
  const wait = async (pred, n = 60) => { for (let i = 0; i < n; i++) { await page.waitForTimeout(100); await keep(); if (await ev(pred)) return true; } return false; };
  out.enter = await ev(() => {
    const g = window.__gw; g.level = 74; g.maxHp = 3000; g.hp = 3000; g.wakeOpen = true;
    for (const id of ["lanternking", "horseman", "dracula", "witchboss", "rootwidow", "wolfman"]) g.bossDead[id] = 1;
    g.enterDungeon("wake"); g.floor = 3; g.loadFloor("down"); if (g.fog) g.fog.fill(1);
    return { w: g.w, h: g.h, px: g.px, py: g.py };
  });
  await page.waitForTimeout(600);
  out.arenaStair = await shot("hall_arena_stair");
  await ev(() => { const g = window.__gw; const b = g.roamers.find((x) => x.def === "hollowmourn"); g.px = b.x - 40; g.py = b.y + 70; });
  await wait(() => !!window.__gw.roamers.find((x) => x.final), 40);
  out.intro = [];
  for (let i = 0; i < 6; i++) { await page.waitForTimeout(i ? 2600 : 300); await keep(); out.intro.push(await ev(() => window.__gw.logLine)); if (i === 3) out.introShot = await shot("hall_intro_classline"); }
  const force = (phase, n) => page.evaluate(([phase, n]) => { const g = window.__gw; const r = g.roamers.find((x) => x.final); r.phase = phase; r.bigN = n; r.casting = ""; r.tell = 0; g.wake.rings = []; g.wake.procs = []; g.wakeLordBig(r); return { big: r.big, pattern: r.pattern, tell: r.tell }; }, [phase, n]);
  const tellAt = async (f) => { for (let i = 0; i < 40; i++) { await page.waitForTimeout(100); await keep(); if (await page.evaluate((f) => { const r = window.__gw.roamers.find((x) => x.final); return !r || !r.tellMax || r.tell <= 0 || 1 - r.tell / r.tellMax >= f; }, f)) return; } };
  out.toll = await force(1, 0); await tellAt(0.6); out.tollTell = await shot("hall_toll_tell");
  await wait(() => window.__gw.wake.rings.length > 0, 40); await page.waitForTimeout(150); out.tollRings = await shot("hall_toll_rings");
  await ev(() => { const g = window.__gw; const r = g.roamers.find((x) => x.final); r.hp = Math.round(r.max * 0.6); });
  await page.waitForTimeout(300);
  out.open = await ev(() => window.__gw.wake.open);
  out.toll2 = await force(2, 0); await wait(() => window.__gw.wake.rings.length > 0, 60); await page.waitForTimeout(200); out.tollGaps = await shot("hall_toll_gaps_graves");
  out.proc = await force(2, 1); await tellAt(0.6); out.procTell = await shot("hall_procession_tell");
  await wait(() => window.__gw.wake.procs.length > 0, 40); await page.waitForTimeout(500); out.procCoffins = await shot("hall_procession_coffins");
  await page.waitForTimeout(2500);
  await ev(() => { window.__gw.wake.dark = true; });
  out.dark = await force(3, 1); await tellAt(0.5); out.darkTell = await shot("hall_lightsout_tell");
  await ev(() => { const g = window.__gw; const r = g.roamers.find((x) => x.final); r.hp = Math.round(r.max * 0.15); });
  out.red = await force(3, 1); await tellAt(0.5); out.redShot = await shot("hall_lightsout_red");
  out.orbs = await ev(() => window.__gw.wake.orbs.map((o) => ({ x: Math.round(o.x), y: Math.round(o.y), red: o.red })));
  await ev(() => { const g = window.__gw; const r = g.roamers.find((x) => x.final); r.tell = 0; r.casting = ""; r.hp = Math.round(r.max * 0.04); });
  await wait(() => window.__gw.roamers.find((x) => x.final)?.pattern === "lasttoll", 30);
  await ev(() => { const g = window.__gw; const r = g.roamers.find((x) => x.final); g.hurtFoe(r, 999999); });
  await wait(() => window.__gw.roamers.find((x) => x.final)?.staggered, 40);
  await ev(() => { const g = window.__gw; const r = g.roamers.find((x) => x.final); g.hurtFoe(r, 1); });
  await page.waitForTimeout(400);
  out.drops = await ev(() => window.__gw.inv.filter((i) => /Sexton|Bell-Shard/.test(i.name)).map((i) => ({ name: i.name, kind: i.kind, atk: i.atk, rank: i.rank })));
  out.mode = await ev(() => window.__gw.mode);
  return out;
}
