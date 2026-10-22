// charfix: the vampire, mummy, horseman and a big boss (the Count), plus the moving families (ghost, tree, scarecrow, bat, rat, cat).
export default async function ({ page, ev, shot }) {
  const out = {};
  const lineup = (list, tag) => page.evaluate(([list, tag]) => {
    const g = window.__gw; g.level = 74; g.hp = g.maxHp = 5000;
    g.zoom = 3; if (g.fog) g.fog.fill(1);
    const t = g.roamers[0] ?? { id: "t", x: 0, y: 0, family: "zombie", tint: "#888", hp: 10, max: 10, atk: 1, ac: 0, xp: 1, silver: 0 };
    const hx = g.px, hy = g.py;
    g.roamers = list.map(([fam, rank], i) => ({ ...JSON.parse(JSON.stringify(t)), family: fam, def: undefined, boss: rank === "boss", mini: rank === "mini", rare: rank === "rare", id: "cf" + i + fam + rank, final: false, early: false, helper: false, name: fam, mood: undefined, x: hx + (rank === "boss" || rank === "mini" ? 70 : i * 22 - (list.length - 1) * 11), y: hy + (rank === "boss" || rank === "mini" ? -24 : -30), aggro: rank === "boss" || rank === "mini", hp: 9999, max: 9999, moving: tag === "walk", tell: 0, casting: "", actFor: 0 }));
    return { at: [hx, hy], n: g.roamers.length, fams: g.roamers.map((r) => r.family) };
  }, [list, tag]);
  out.small = await lineup([["vampire", "mob"], ["mummy", "mob"], ["horse", "mob"], ["ghost", "mob"], ["tree", "mob"], ["scarecrow", "mob"]], "stand");
  await page.waitForTimeout(400); out.dbg = await ev(() => ({ fl: window.__gw.floor, w: window.__gw.w, r: window.__gw.roamers.map((r) => r.family + ":" + Math.round(r.x) + "," + Math.round(r.y)), p: [window.__gw.px, window.__gw.py] })); out.s1 = await shot("charfix_small_a");
  await page.waitForTimeout(700); out.s2 = await shot("charfix_small_b");
  out.small2 = await lineup([["bat", "mob"], ["rat", "mob"], ["cat", "mob"], ["vampire", "rare"], ["mummy", "rare"], ["horse", "rare"]], "stand");
  await page.waitForTimeout(400); out.s3 = await shot("charfix_small_c");
  out.walk = await lineup([["ghost", "mob"], ["tree", "mob"], ["scarecrow", "mob"], ["bat", "mob"], ["horse", "mob"], ["mummy", "mob"]], "walk");
  out.walkY = [];
  for (let i = 0; i < 6; i++) { await page.waitForTimeout(130); out.walkY.push(await ev(() => window.__gw.roamers.map((r) => r.family + (r.moving ? "*" : "")).join(" "))); if (i === 2 || i === 3) await shot("charfix_walk_" + i); }
  out.big = await lineup([["vampire", "boss"]], "stand");
  await page.waitForTimeout(800); out.b1 = await shot("charfix_big_count");
  out.big2 = await lineup([["horse", "boss"]], "stand");
  await page.waitForTimeout(800); out.b2 = await shot("charfix_big_horseman");
  out.big3 = await lineup([["mummy", "mini"]], "stand");
  await page.waitForTimeout(800); out.b3 = await shot("charfix_mini_mummy");
  return out;
}
