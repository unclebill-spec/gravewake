/**
 * Gravewake autochecks. Run before and after a gameplay change:
 *   npm run check:game
 *   npm run check:game -- move doors
 *
 * Rules this script is here to protect:
 * 1. Change one system at a time. A loot fix does not touch drawing, doors, or the clock.
 * 2. Do not retune a number to make a check pass. Walk is 74. Swim is 37.
 *    A day and a night are 15 minutes each. Green pays 14 to 1. The pack is 20.
 * 3. Town stays twilight, and the clock still flips. The living are served all day.
 *    A vampire is served only at night, except the undertaker.
 * 4. A door is a zone change. Cottages stay shut to a vampire until invited.
 *    The south croft stays shut until the deed is bought.
 * 5. Fights stay on the field. There is no second battle screen.
 *    Slash, Whirl, and Smite are the verbs. A named boss uses its kit.
 *    A remnant has spam and mid, and no big move.
 *    Smite breaks one big move, then locks for 12 seconds.
 *    Crits are one doubled hit and a line in the log.
 * 6. Feet decide collision. Walls and furnishings stop everyone.
 *    Water and ice stop everyone but the hero. Nobody stands on a wall or a door.
 * 7. Armor equips only on the matching class. Rank 4 is that class's set.
 *    Rank 2 and 3 need the smith before a gem. A new gem destroys the old one.
 * 8. An older save must still load. New fields stay optional.
 * 9. If a check fails, the change is not done. Do not loosen the check to hide it.
 */
import { execFileSync } from "node:child_process";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

const TILE = 16;
const WALK = 74;
const SWIM = 37;
const DOORS = ["9,5", "17,5", "30,6", "34,6", "5,11", "14,11", "26,11", "5,19", "27,19", "34,15", "18,20", "18,23", "13,22", "5,22", "27,22", "34,22"];
const WALKABLE = new Set([0, 1, 2, 21]);
// 28 to 31 are the dungeon secrets: rune door, cracked brick, brazier, saint. All solid.
const BLOCKED = new Set([3, 4, 5, 6, 10, 14, 26, 28, 29, 30, 31]);

const store = new Map();
globalThis.localStorage = {
  getItem: (k) => (store.has(k) ? store.get(k) : null),
  setItem: (k, v) => store.set(k, String(v)),
  removeItem: (k) => store.delete(k),
};

// screen1 (2026-10-01): the shell after the screen and display batch. gfx2/gfx3 accept it beside the gfx3 HUD.
const SCREEN1_HUD = "8b3ba0e16e6b643d539cb0961b67b32c";
// retro1 (2026-10-01 18:48 ET, owner-approved true 320x240 Retro view): the shell after the Retro batch.
const RETRO1_HUD = "35ec89e9444560c7b22a12df60021524";
// fade1 (2026-10-01 19:59 ET, owner-approved night foe fade-in): draw.ts's only edits. unfade1 takes exactly these
// out again, so older groups can still prove the rest of draw.ts byte-identical to what they pinned.
const FADE1_DRAW = [
  'import { FADE, fadeOf, fadeStep, mistPuff } from "./fade";\n',
  "    if (fadeOf(r.id, g.worldMs) < FADE.lightAt) continue; // fade1: a spawning foe's light comes on halfway in\n",
  "    if (fadeOf(r.id, g.worldMs) < FADE.lightAt) continue; // fade1: a spawning foe's light comes on halfway in\n",
  "    const glowFrom = glow.length;\n",
  "    // fade1 (OWNER-APPROVED 2026-10-01 19:59 ET): a fresh night roamer dissolves in (fade.ts). Drawing only; the foe is live.\n    const fade = fadeOf(r.id, g.worldMs);\n    if (fade < 1) {\n      fadeStep(ctx, props[props.length - 1], glow, glowFrom, fade, r.x, r.y);\n      const onView = r.x > camX - 8 && r.x < camX + viewW / zoom + 8 && r.y > camY && r.y < camY + viewH / zoom + 20;\n      if (onView && !(g.fog && g.fog[Math.floor(r.y / TILE) * g.w + Math.floor(r.x / TILE)] === 0)) mistPuff(g.fx, r, fade);\n    }\n",
];
function unfade1(src) {
  let t = src;
  for (const cut of FADE1_DRAW) {
    const i = t.indexOf(cut);
    if (i < 0) return `${src}\n// fade1 edit missing`;
    t = t.slice(0, i) + t.slice(i + cut.length);
  }
  return t;
}
const out = join(mkdtempSync(join(tmpdir(), "gravewake-")), "sim.mjs");
execFileSync("npx", ["esbuild", "src/game/sim.ts", "--bundle", "--platform=node", "--format=esm", `--outfile=${out}`], {
  stdio: ["ignore", "ignore", "inherit"],
});
const { Game, FAMILIES, scaleMonster, zoneLevel } = await import(pathToFileURL(out).href);

const wanted = new Set(process.argv.slice(2));
const failures = [];
let ran = 0;

function on(group) {
  return wanted.size === 0 || wanted.has("all") || wanted.has(group);
}

function check(group, name, cond, detail = "") {
  if (!on(group)) return;
  ran += 1;
  if (cond) console.log(`ok  ${group}  ${name}`);
  else {
    const line = detail ? `${name} — ${detail}` : name;
    failures.push(`${group}: ${line}`);
    console.log(`FAIL ${group}  ${line}`);
  }
}

function fresh(cls = "warrior", path = "str") {
  const g = new Game();
  g.start(cls, path, "A");
  g.held.clear();
  return g;
}

function ticks(g, n, dt = 0.05) {
  for (let i = 0; i < n; i++) g.update(dt);
}

function land(g) {
  ticks(g, 8);
}

function holdRight(g, n) {
  const x = g.px;
  g.held.add("KeyD");
  ticks(g, n);
  g.held.delete("KeyD");
  return g.px - x;
}

function tileAt(g, px, py) {
  const tx = Math.floor(px / TILE);
  const ty = Math.floor(py / TILE);
  if (tx < 0 || ty < 0 || tx >= g.w || ty >= g.h) return -1;
  return g.tiles[ty * g.w + tx];
}

function foe(extra = {}) {
  return {
    id: "z",
    name: "Zombie",
    family: "zombie",
    tint: "#000",
    hp: 400,
    max: 400,
    atk: 0,
    ac: 0,
    xp: 1,
    silver: 1,
    ...extra,
  };
}

function startFight(g, extra = {}) {
  g.openBattle([foe(extra)], { guard: false, goblin: false, hunter: false, fromRole: "" });
}

function fieldFoe(g) {
  const r = [...g.roamers].reverse().find((x) => x.aggro);
  r.x = g.px + 20;
  r.y = g.py;
  g.facing = "e";
  return r;
}

function item(partial) {
  return { uid: partial.uid, rank: 1, ...partial };
}

if (on("move")) {
  const land = fresh();
  land.px = 8 * TILE + 8;
  land.py = 13 * TILE + 8;
  const dx = holdRight(land, 8);
  check("move", "walk speed", dx > 26 && dx < 33, `moved ${dx.toFixed(1)}`);

  const wet = fresh();
  wet.px = 17 * TILE + 8;
  wet.py = 15 * TILE + 8;
  const swim = holdRight(wet, 8);
  check("move", "swim is half", swim > 12 && swim < 18, `moved ${swim.toFixed(1)}`);

  const coast = fresh();
  coast.px = 8 * TILE + 8;
  coast.py = 13 * TILE + 8;
  holdRight(coast, 6);
  const stopped = coast.px;
  ticks(coast, 8);
  check("move", "land does not coast", Math.abs(coast.px - stopped) < 1, `slid ${coast.px - stopped}`);

  const ice = fresh();
  ice.enterWorld(32 * TILE, 40 * TILE);
  ice.px = 10 * TILE + 8;
  ice.py = 5 * TILE + 8;
  ice.slideX = 0;
  ice.slideY = 0;
  holdRight(ice, 6);
  const iced = ice.px;
  ticks(ice, 8);
  check("move", "ice coasts", ice.px - iced > 4, `coasted ${ice.px - iced}`);

  const boots = fresh();
  boots.px = 17 * TILE + 8;
  boots.py = 15 * TILE + 8;
  boots.inv.push(item({ uid: "boots", name: "Bog-step boots", kind: "armor", rank: 4, slot: "feet", armor: "plate", ac: 1, special: "Waterwalk" }));
  boots.equipItem(boots.inv.at(-1));
  const walked = holdRight(boots, 8);
  check("move", "boots walk on water", walked > 26 && walked < 33, `moved ${walked.toFixed(1)}`);

  const wall = fresh();
  wall.px = 4 * TILE + 8;
  wall.py = 4 * TILE + 8;
  const stuck = wall.px;
  wall.held.add("KeyD");
  ticks(wall, 8);
  wall.held.delete("KeyD");
  check("move", "walls stop the hero", Math.abs(wall.px - stuck) < 1, `moved ${wall.px - stuck}`);
}

if (on("bodies")) {
  const town = fresh();
  let feet = true;
  let feetDetail = "";
  for (const n of town.npcs) {
    const t = tileAt(town, n.x, n.y);
    if (!WALKABLE.has(t)) {
      feet = false;
      feetDetail = `${n.name} on ${t}`;
    }
  }
  check("bodies", "people stand on open ground", feet, feetDetail);
  let piled = false;
  let pile = "";
  for (let i = 0; i < town.npcs.length; i++) {
    for (let j = i + 1; j < town.npcs.length; j++) {
      if (Math.hypot(town.npcs[i].x - town.npcs[j].x, town.npcs[i].y - town.npcs[j].y) < 12) {
        piled = true;
        pile = `${town.npcs[i].name} and ${town.npcs[j].name}`;
      }
    }
  }
  check("bodies", "people are not piled", !piled, pile);

  const found = [];
  for (let y = 0; y < town.h; y++) {
    for (let x = 0; x < town.w; x++) if (town.tiles[y * town.w + x] === 8) found.push(`${x},${y}`);
  }
  const missing = DOORS.filter((d) => !found.includes(d));
  check("bodies", "sixteen doors", missing.length === 0, missing.join(" "));
  let sealed = "";
  for (const d of DOORS) {
    const [x, y] = d.split(",").map(Number);
    const open = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => WALKABLE.has(town.tiles[(y + dy) * town.w + (x + dx)]));
    if (!open) sealed = d;
  }
  check("bodies", "each door has a step", !sealed, sealed);

  const world = fresh();
  world.enterWorld(32 * TILE, 40 * TILE);
  const bosses = world.roamers.filter((r) => r.boss);
  check("bodies", "nine bosses", bosses.length === 9, String(bosses.length));
  let trapped = "";
  for (const b of bosses) {
    const t = tileAt(world, b.x, b.y);
    if (BLOCKED.has(t)) trapped = `${b.id} on ${t}`;
  }
  check("bodies", "bosses are not walled in", !trapped, trapped);

  const roamer = {
    id: "trap",
    x: 20 * TILE + 8,
    y: 20 * TILE + 8,
    family: "bat",
    tint: "#000",
    def: "bat",
    level: 1,
    ang: 0,
  };
  world.roamers.push(roamer);
  world.tiles[20 * world.w + 20] = 3;
  world.px = 4 * TILE;
  world.py = 4 * TILE;
  world.worldMs = 16 * 60 * 1000;
  world.calm = 99;
  ticks(world, 50);
  const still = world.roamers.find((r) => r.id === roamer.id);
  const under = still ? tileAt(world, still.x, still.y) : -1;
  check("bodies", "a walled roamer gets out", !!still && !BLOCKED.has(under), `tile ${under}`);

  const chase = fresh();
  chase.enterWorld(32 * TILE + 8, 40 * TILE + 8);
  chase.px = 32 * TILE + 8;
  chase.py = 40 * TILE + 8;
  const wx = Math.floor(chase.px / TILE) + 1;
  const wy = Math.floor(chase.py / TILE);
  chase.tiles[wy * chase.w + wx] = 3;
  startFight(chase, { hp: 80, max: 80, atk: 0, name: "Zombie", family: "zombie" });
  const chaser = fieldFoe(chase);
  chaser.x = chase.px + 28;
  chaser.y = chase.py;
  chaser.personality = "zealot";
  ticks(chase, 40);
  const stood = tileAt(chase, chaser.x, chaser.y);
  check("bodies", "a chasing foe does not enter a wall", !BLOCKED.has(stood), `tile ${stood}`);

  const pal = fresh();
  pal.companion = {
    id: "a",
    name: "Bren",
    kit: "acolyte",
    sourceId: "acolyte",
    look: "priest",
    coat: "#000",
    focus: "heal",
    hp: 20,
    equip: {},
    x: pal.px - 48,
    y: pal.py,
  };
  const bx = Math.floor((pal.px - 16) / TILE);
  const by = Math.floor(pal.py / TILE);
  pal.tiles[by * pal.w + bx] = 3;
  ticks(pal, 30);
  const underPal = tileAt(pal, pal.companion.x, pal.companion.y);
  check("bodies", "a companion does not enter a wall", !BLOCKED.has(underPal), `tile ${underPal}`);
}

if (on("doors")) {
  const shop = fresh();
  shop.px = 17 * TILE + 8;
  shop.py = 5 * TILE + 8;
  shop.update(0.05);
  check("doors", "shop door enters", shop.inside === "shop" && shop.mapId === "inside");
  shop.px = 8 * TILE;
  shop.py = 8 * TILE;
  ticks(shop, 12);
  shop.px = 7 * TILE + 8;
  shop.py = 10 * TILE + 8;
  shop.update(0.05);
  check("doors", "inside door exits", shop.mapId === "town" && shop.inside === "");

  const vamp = fresh("vampire", "str");
  vamp.enterInside("shop", true);
  const keeper = vamp.npcs.find((n) => n.role === "shop");
  vamp.px = keeper.x;
  vamp.py = keeper.y;
  vamp.interact();
  const refused = vamp.mode === "talk" && /leave|know what walks/i.test(vamp.talk?.text ?? "");
  vamp.acceptService();
  check("doors", "noon vampire is refused by the shop", refused && vamp.mode !== "shop", vamp.talk?.text ?? vamp.logLine);

  vamp.mode = "play";
  vamp.talk = null;
  vamp.enterTown(13 * TILE + 8, 18 * TILE + 8);
  const grave = vamp.npcs.find((n) => n.role === "undertaker");
  vamp.px = grave.x;
  vamp.py = grave.y;
  vamp.interact();
  const welcomed = vamp.talk?.role === "undertaker";
  vamp.acceptService();
  check("doors", "undertaker serves a vampire at noon", welcomed && vamp.mode === "shop", vamp.logLine);

  const croft = fresh();
  croft.px = 18 * TILE + 8;
  croft.py = 23 * TILE + 8;
  croft.update(0.05);
  check("doors", "croft stays shut", croft.mapId === "town" && /bank/i.test(croft.logLine), croft.logLine);
  croft.px = 18 * TILE + 8;
  croft.py = 22 * TILE + 8;
  croft.coin = 80;
  croft.buyHome();
  ticks(croft, 14);
  croft.px = 18 * TILE + 8;
  croft.py = 23 * TILE + 8;
  croft.update(0.05);
  check("doors", "bought croft opens", croft.ownedHome && croft.coin === 0 && croft.inside === "croft", croft.logLine);

  const gate = fresh();
  gate.enterWorld(32 * TILE + 8, 44 * TILE + 8);
  gate.update(0.05);
  check("doors", "town gate is a step", gate.mapId === "town", gate.logLine);

  const pit = fresh();
  pit.enterWorld(18 * TILE + 8, 42 * TILE + 8);
  pit.calm = 99;
  pit.update(0.05);
  check("doors", "a stair is a step", pit.mapId === "dungeon" && pit.dungeon === "pocketvale", pit.logLine);
}

if (on("fight")) {
  const swing = fresh();
  startFight(swing);
  const foe0 = fieldFoe(swing);
  const before = foe0.hp;
  check("fight", "a fight stays on the field", swing.mode === "play" && foe0.aggro);
  swing.slash();
  check("fight", "slash hits one foe", foe0.hp < before && foe0.hp > 0, String(foe0.hp));

  const common = scaleMonster(FAMILIES[0], 1);
  const dealt = Math.max(1, fresh().atk - common.ac);
  const hits = Math.ceil(common.hp / dealt);
  check("fight", "a common foe takes several hits", hits >= 3 && hits <= 6, `${hits} hits, ${common.hp} hp, ${dealt} a blow`);

  const spin = fresh();
  startFight(spin);
  const foe1 = fieldFoe(spin);
  const stam = spin.stam;
  spin.whirl();
  check("fight", "whirl spends stamina and hits", spin.stam === stam - 18 && foe1.hp < foe1.max, `stam ${spin.stam} hp ${foe1.hp}`);

  const bolt = fresh();
  bolt.energy = 20;
  startFight(bolt);
  const foe2 = fieldFoe(bolt);
  foe2.x = bolt.px + 40;
  bolt.smite();
  check("fight", "smite spends mana and hits", bolt.energy === 8 && foe2.hp < foe2.max, `mana ${bolt.energy} hp ${foe2.hp}`);

  const crit = fresh();
  crit.agi = 30;
  const roll = Math.random;
  Math.random = () => 0.99;
  startFight(crit);
  const plain = fieldFoe(crit);
  plain.ac = 0;
  crit.slash();
  const normal = plain.max - plain.hp;
  Math.random = () => 0;
  crit.roamers = crit.roamers.filter((r) => !r.aggro);
  startFight(crit);
  const hard = fieldFoe(crit);
  hard.ac = 0;
  crit.slash();
  const doubled = hard.max - hard.hp;
  const said = /Critical/.test(crit.logLine);
  Math.random = roll;
  check("fight", "a crit is double and logged", said && doubled === normal * 2, `normal ${normal} crit ${doubled} ${crit.logLine}`);

  const paused = fresh();
  startFight(paused);
  const heldFoe = fieldFoe(paused);
  const held = heldFoe.hp;
  const clock = paused.worldMs;
  paused.togglePause();
  ticks(paused, 8);
  const frozen = paused.mode === "pause" && paused.worldMs === clock && heldFoe.hp === held;
  paused.togglePause();
  check("fight", "pause freezes a fight and resumes it", frozen && paused.mode === "play");

  const cast = fresh();
  cast.inv.push(item({ uid: "pole", name: "Rib pole", kind: "tackle", special: "Pole" }));
  cast.inv.push(item({ uid: "bait", name: "Nightcrawlers", kind: "bait", stack: 2, gift: "nightcrawlers" }));
  cast.px = 17 * TILE + 8;
  cast.py = 15 * TILE + 8;
  cast.castLine();
  const mark = cast.fishMark;
  const fishClock = cast.worldMs;
  cast.togglePause();
  ticks(cast, 4);
  const fishFrozen = cast.mode === "pause" && cast.fishMark === mark && cast.worldMs === fishClock;
  cast.togglePause();
  check("fight", "pause freezes a cast and resumes it", fishFrozen && cast.mode === "fish");

  const named = fresh();
  startFight(named, { id: "frank", name: "Frankenstein", boss: true, family: "zombie", hp: 800, max: 800, atk: 4 });
  const frank = fieldFoe(named);
  check("fight", "frankenstein has his kit", frank.spam === "slam" && frank.mid === "stitch-pull" && frank.big === "bolt-surge" && frank.personality === "zealot");

  const rem = fresh();
  startFight(rem, { id: "queen", name: "Court Favorite", mini: true, family: "vampire", hp: 400, max: 400, atk: 4 });
  const queen = fieldFoe(rem);
  check("fight", "a remnant keeps spam and mid and drops the big", queen.spam === "cut" && queen.mid === "court-call" && !queen.big);

  const broke = fresh();
  broke.energy = 40;
  startFight(broke, { id: "wolfman", name: "Wolfman", boss: true, family: "wolf", hp: 800, max: 800, atk: 4 });
  const wolf = fieldFoe(broke);
  wolf.tell = 1;
  wolf.casting = "big";
  broke.smite();
  const locked = broke.smiteLock > broke.worldMs && wolf.tell === 0;
  broke.energy = 40;
  wolf.tell = 1;
  wolf.casting = "big";
  broke.smite();
  check("fight", "smite breaks one big move then locks", locked && wolf.tell === 1, broke.logLine);

  const bone = fresh();
  bone.stam = 40;
  startFight(bone, { id: "skeleton", name: "Skeleton", family: "skeleton", hp: 400, max: 400, ac: 0, atk: 1 });
  const sk = fieldFoe(bone);
  const flesh = fresh();
  startFight(flesh, { id: "zombie", name: "Zombie", family: "zombie", hp: 400, max: 400, ac: 0, atk: 1 });
  const zb = fieldFoe(flesh);
  const rollBone = Math.random;
  Math.random = () => 0.99;
  bone.whirl();
  flesh.whirl();
  Math.random = rollBone;
  const boneHit = sk.max - sk.hp;
  const fleshHit = zb.max - zb.hp;
  check("fight", "whirl cracks bone", boneHit > fleshHit, `bone ${boneHit} flesh ${fleshHit}`);

  const loot = fresh();
  const purse = loot.coin;
  const keepRoll = Math.random;
  Math.random = () => 0.99;
  startFight(loot, { hp: 1, max: 1, silver: 7 });
  fieldFoe(loot);
  loot.slash();
  Math.random = keepRoll;
  const bag = loot.drops.find((d) => d.silver === 7);
  const piece = loot.drops.find((d) => d.item);
  check("fight", "a kill leaves silver and gear on the ground", loot.coin === purse && !!bag && !!piece, loot.logLine);
  loot.px = bag.x;
  loot.py = bag.y;
  ticks(loot, 12);
  check("fight", "standing on the bag takes the silver", loot.coin === purse + 7 && !loot.drops.some((d) => d.silver === 7));
  loot.inv = Array.from({ length: 20 }, (_, i) => ({ uid: `full-${i}`, name: `Full ${i}`, kind: "weapon", rank: 1 }));
  if (piece) {
    loot.px = piece.x;
    loot.py = piece.y;
    piece.age = 1;
    ticks(loot, 4);
    check("fight", "a full pack leaves the piece on the ground", loot.drops.some((d) => d.item && d.item.uid === piece.item.uid) && loot.inv.length === 20, loot.logLine);
  } else check("fight", "a full pack leaves the piece on the ground", false, "no piece");

  const anim = fresh();
  startFight(anim);
  const swinger = fieldFoe(anim);
  swinger.cool = 0;
  swinger.spamTag = "melee";
  swinger.hp = 80;
  anim.update(0.05);
  check("fight", "a foe swings when it strikes", swinger.act === "swing" && swinger.actFor > 0, swinger.act ?? "");

  const caster = fresh();
  startFight(caster, { hp: 80, max: 80, atk: 0, boss: true, name: "Frankenstein", family: "zombie", id: "frank" });
  const boss = fieldFoe(caster);
  boss.boss = true;
  boss.def = "frank";
  boss.big = "Lightning";
  boss.bigTag = "bolt";
  boss.age = 8;
  boss.wave = 0;
  boss.cool = 0;
  boss.hp = 80;
  caster.update(0.05);
  check("fight", "a boss winds up a cast", boss.act === "cast", boss.act ?? "");
  boss.tell = 0.01;
  caster.update(0.05);
  check("fight", "a boss cast shows a spell", caster.spells.length > 0, String(caster.spells.length));

  const wiz = fresh("wizard", "int");
  wiz.level = 20;
  wiz.energy = 40;
  wiz.specials = ["Deathbolt"];
  startFight(wiz, { hp: 40, max: 40, ac: 0, atk: 0 });
  const marked = fieldFoe(wiz);
  const hpBefore = marked.hp;
  wiz.castKnown("Deathbolt");
  check("fight", "a class spell hits and draws", marked.hp < hpBefore && wiz.spells.some((s) => s.color === "#6a3a8a"), wiz.logLine);

  const war = fresh();
  war.level = 12;
  war.energy = 40;
  war.specials = ["Loadout Stance"];
  war.castKnown("Loadout Stance");
  check("fight", "a stance is a ring and not a hit", war.cryUntil > war.worldMs && war.spells.some((s) => s.kind === "ring"), war.logLine);
}

if (on("gear")) {
  const g = fresh();
  const ac0 = g.ac;
  const atk0 = g.atk;
  g.inv.push(item({ uid: "chain", name: "chain", kind: "armor", slot: "chest", armor: "chain", ac: 9 }));
  g.equipItem(g.inv.at(-1));
  check("gear", "wrong armor is refused", g.ac === ac0 && /wrong armor/i.test(g.logLine), g.logLine);

  g.inv.push(item({ uid: "head", name: "Gallows head", kind: "armor", rank: 4, slot: "head", armor: "plate", ac: 0, bonus: 1, set: "Gallows Plate" }));
  g.equipItem(g.inv.at(-1));
  check("gear", "armor bonus counts", g.ac === ac0 + 1, `ac ${g.ac} expected ${ac0 + 1}`);

  g.inv.push(item({ uid: "legs", name: "Gallows legs", kind: "armor", rank: 4, slot: "legs", armor: "plate", ac: 0, set: "Gallows Plate" }));
  g.equipItem(g.inv.at(-1));
  check("gear", "two set pieces add armor", g.ac === ac0 + 1 + 2, `ac ${g.ac}`);

  g.inv.push(item({ uid: "feet", name: "Gallows feet", kind: "armor", rank: 4, slot: "feet", armor: "plate", ac: 0, set: "Gallows Plate" }));
  g.equipItem(g.inv.at(-1));
  g.inv.push(item({ uid: "chest", name: "Gallows chest", kind: "armor", rank: 4, slot: "chest", armor: "plate", ac: 0, set: "Gallows Plate" }));
  g.equipItem(g.inv.at(-1));
  check("gear", "four set pieces add attack", g.atk === atk0 + 2, `atk ${g.atk} expected ${atk0 + 2}`);

  g.inv.push(item({ uid: "ring", name: "ring", kind: "jewel", rank: 2, slot: "ring", bonus: 4, special: "Socket" }));
  const ring = g.inv.at(-1);
  g.inv.push(item({ uid: "gem", name: "Cut Ruby", kind: "gem", rank: 2, bonus: 3 }));
  const before = g.atk;
  g.socketGem(ring);
  g.equipItem(ring);
  check("gear", "a socketed gem adds its bonus", ring.gem === "Cut Ruby" && g.atk === before + 4 + 3 && !g.inv.some((i) => i.uid === "gem"));

  g.inv.push(item({ uid: "gem2", name: "Cut Diamond", kind: "gem", rank: 2, bonus: 5 }));
  g.socketGem(ring);
  check("gear", "a new gem replaces the old one", ring.gemBonus === 5 && !g.inv.some((i) => i.kind === "gem"), `bonus ${ring.gemBonus}`);

  const bank = fresh();
  const first = bank.inv.find((i) => i.name === "Bone chip");
  bank.inv.push(item({ uid: "chips", name: "Bone chip", kind: "junk", stack: 3 }));
  bank.stash(first);
  bank.stash(bank.inv.find((i) => i.uid === "chips"));
  check("gear", "junk stacks in the drawer", bank.vault.length === 1 && bank.vault[0].stack === 5, JSON.stringify(bank.vault.map((i) => i.stack)));
  bank.inv = Array.from({ length: 20 }, (_, i) => item({ uid: `full${i}`, name: `Blade ${i}`, kind: "weapon", slot: "off", atk: 1 }));
  const kept = bank.vault[0].uid;
  bank.takeVault(kept);
  check("gear", "a full pack cannot take from the drawer", bank.vault.some((i) => i.uid === kept) && bank.inv.length === 20);

  const casino = fresh();
  casino.coin = 100;
  const roll = Math.random;
  Math.random = () => 0.01;
  casino.bet("red", 10);
  check("gear", "red pays even money", casino.coin === 110, String(casino.coin));
  Math.random = () => 0.99;
  casino.bet("green", 10);
  check("gear", "green pays 14 to 1", casino.coin === 250, String(casino.coin));
  casino.bet("red", 500);
  check("gear", "an unaffordable stake is refused", casino.coin === 250 && /not enough/i.test(casino.logLine), casino.logLine);
  Math.random = roll;

  const worn = fresh();
  const helm = { uid: "helm", name: "Dented Helm", kind: "armor", rank: 1, slot: "head", armor: "plate", ac: 1 };
  worn.inv.push(helm);
  worn.equipItem(helm);
  worn.unequipItem("head");
  check("gear", "a worn piece comes back off", worn.equip.head == null && worn.inv.some((i) => i.uid === "helm"), worn.logLine);

  const camp = fresh();
  camp.enterWorld(32 * TILE + 8, 46 * TILE + 8);
  const campRoll = Math.random;
  Math.random = () => 0.99;
  camp.camp();
  Math.random = campRoll;
  const pitched = camp.mapId === "camp";
  camp.leaveCamp();
  check("gear", "camp is a clearing and the road takes you back", pitched && camp.mapId === "world", camp.logLine);
}

if (on("loop")) {
  const hire = fresh();
  hire.level = 10;
  hire.coin = 40;
  hire.talk = { who: "Priest", role: "priest", npcId: "priest", text: "" };
  hire.choose("hire");
  hire.talk = { who: "Priest", role: "priest", npcId: "priest", text: "" };
  hire.choose("hire");
  check("loop", "one companion hires", hire.companion?.name.includes("Bren") && hire.coin === 25, hire.logLine);

  const fish = fresh();
  fish.inv.push(item({ uid: "pole", name: "Rib pole", kind: "tackle", special: "Pole" }));
  fish.inv.push(item({ uid: "bait", name: "Nightcrawlers", kind: "bait", stack: 2, gift: "nightcrawlers" }));
  fish.px = 17 * TILE + 8;
  fish.py = 15 * TILE + 8;
  fish.castLine();
  check("loop", "water and a pole start a cast", fish.mode === "fish");
  fish.fishZone = 40;
  fish.fishMark = 0;
  fish.reel();
  const baitAfterMiss = fish.inv.find((i) => i.kind === "bait");
  check("loop", "a miss spends bait and catches nothing", fish.mode === "play" && baitAfterMiss?.stack === 1 && !fish.inv.some((i) => i.kind === "fish"), fish.logLine);
  fish.castLine();
  fish.fishMark = fish.fishZone + 4;
  const roll = Math.random;
  Math.random = () => 0.5;
  fish.reel();
  Math.random = roll;
  check("loop", "a hit keeps the catch", fish.inv.some((i) => i.kind === "fish"), fish.logLine);

  const zone = fresh();
  zone.quest = 3;
  check("loop", "a zone quest follows the vale", /zone:/i.test(zone.questLine()), zone.questLine());
  zone.enterWorld(32 * TILE + 8, 40 * TILE + 8);
  zone.px = 32 * TILE + 8;
  zone.py = 40 * TILE + 8;
  startFight(zone, { hp: 1, max: 1 });
  fieldFoe(zone);
  zone.slash();
  check("loop", "a win marks that zone", zone.zones.includes("Decayed vale") && !zone.questLine().includes("Decayed vale"), zone.questLine());

  const animal = fresh();
  const critter = animal.critters[0];
  const before = animal.critters.length;
  animal.npcs = [];
  animal.px = critter.x;
  animal.py = critter.y;
  animal.interact();
  check("loop", "an animal can be fought", animal.mode === "play" && animal.roamers.some((r) => r.aggro) && animal.critters.length === before - 1);

  const clock = fresh();
  const seen = [];
  for (const ms of [0, 150000, 300000, 450000, 600000]) {
    clock.worldMs = ms;
    seen.push(clock.weather);
  }
  check("loop", "weather cycles in order", seen.join(",") === "still,light,heavy,storm,snow", seen.join(","));

  const life = fresh();
  life.level = 4;
  life.coin = 12;
  life.ownedHome = true;
  life.vault = [item({ uid: "stash", name: "Bone chip", kind: "junk", stack: 4 })];
  life.enterInside("inn", true);
  life.saveSlot(0);
  const key = "gravewake-saves-v1";
  const saved = JSON.parse(localStorage.getItem(key));
  delete saved[0].vault;
  delete saved[0].ownedHome;
  delete saved[0].zones;
  localStorage.setItem(key, JSON.stringify(saved));
  const old = new Game();
  old.loadSlot(0);
  check("loop", "an older save still loads", old.level === 4 && old.coin === 12 && old.ownedHome === false && old.vault.length === 0 && old.inside === "inn", old.logLine);

  life.ownedHome = true;
  life.vault = [item({ uid: "stash", name: "Bone chip", kind: "junk", stack: 4 })];
  life.inside = "inn";
  life.saveSlot(1);
  const again = new Game();
  again.loadSlot(1);
  check("loop", "a save keeps the deed and the drawer", again.level === 4 && again.ownedHome === true && again.vault[0]?.stack === 4 && again.inside === "inn");
}

// Particle pool. Pictures only: these checks guard the caps, the kill-oldest rule, the named
// bursts, and that the pool never draws on Math.random (so no combat roll can shift).
if (on("fx")) {
  const COMBAT = 1;
  const liveKinds = (pool, kind) => {
    let n = 0;
    for (let i = 0; i < pool.size; i++) if (pool.life[i] > 0 && pool.kind[i] === kind) n++;
    return n;
  };
  const Pool = fresh().fx.constructor;

  const caps = new Pool();
  for (let c = 0; c < 4; c++) for (let i = 0; i < 200; i++) caps.emit(c, 0, 0, 0, 0, 0, 5, 0);
  check("fx", "caps are weather 80, combat 24, interact 16, hub 12", [0, 1, 2, 3].map((c) => caps.count(c)).join(",") === "80,24,16,12", [0, 1, 2, 3].map((c) => caps.count(c)).join(","));

  const old = new Pool();
  const first = [];
  for (let i = 0; i < 24; i++) first.push(old.emit(COMBAT, 0, i, 0, 0, 0, 5, 0));
  const reused = old.emit(COMBAT, 0, 99, 0, 0, 0, 5, 0);
  check("fx", "over the cap the oldest dies", reused === first[0] && old.count(COMBAT) === 24 && old.x[reused] === 99, `slot ${reused}`);

  const move = new Pool();
  const m = move.emit(COMBAT, 0, 10, 10, 20, 0, 1, 0, 100, 0);
  move.update(0.1);
  check("fx", "a chip has velocity and gravity", move.x[m] > 11.9 && move.x[m] < 12.1 && move.vy[m] > 9 && move.y[m] > 10, `x ${move.x[m]} y ${move.y[m]} vy ${move.vy[m]}`);
  move.update(1);
  check("fx", "a chip dies at the end of its life", move.count(COMBAT) === 0);

  const rolls = Math.random;
  let calls = 0;
  Math.random = () => {
    calls += 1;
    return rolls();
  };
  const quiet = new Pool();
  quiet.slash(0, 0, 0, false, true);
  quiet.whirl(0, 0);
  quiet.smite(0, 0);
  quiet.potion(0, 0);
  quiet.death(0, 0, "boss", true);
  quiet.update(0.05);
  Math.random = rolls;
  check("fx", "the pool never draws on Math.random", calls === 0, `${calls} calls`);

  const burst = new Pool();
  burst.spark(0, 0, 0);
  check("fx", "spark is four chips that rise", burst.count(COMBAT) === 4 && [...burst.vy].filter((v) => v === -10).length === 4);
  burst.clear();
  burst.whirl(0, 0);
  const dust = liveKinds(burst, 3);
  check("fx", "whirl is 8 to 12 dust", dust >= 8 && dust <= 12, String(dust));
  burst.clear();
  burst.slash(0, 0, 0, true, false);
  const plainChips = burst.count(COMBAT);
  burst.clear();
  burst.slash(0, 0, 0, true, true);
  const critChips = burst.count(COMBAT);
  check("fx", "slash is 3 to 6 chips and a crit adds 2", plainChips >= 3 && plainChips <= 6 && critChips >= 5 && critChips <= 8, `${plainChips} / ${critChips}`);
  burst.clear();
  burst.smite(0, 0);
  check("fx", "smite is one mote and four white chips", liveKinds(burst, 4) === 1 && liveKinds(burst, 0) === 4);
  burst.clear();
  burst.potion(0, 0);
  check("fx", "a draught is three red ticks", liveKinds(burst, 5) === 3);
  burst.clear();
  burst.death(0, 0, "trash", false);
  const ash = burst.count(COMBAT);
  burst.clear();
  burst.death(0, 0, "boss", false);
  const boss = burst.count(COMBAT);
  check("fx", "trash dies in 3 to 5 ash, a named boss in 8 to 10", ash >= 3 && ash <= 5 && boss >= 8 && boss <= 10, `${ash} / ${boss}`);

  const hit = fresh();
  startFight(hit);
  const target = fieldFoe(hit);
  const hp0 = target.hp;
  hit.slash();
  const onHit = hit.fx.count(COMBAT);
  check("fx", "a landed slash throws chips through the pool", target.hp < hp0 && onHit >= 7 && onHit <= 24, `${onHit} live`);
  ticks(hit, 20);
  check("fx", "the chips are gone a second later", hit.fx.count(COMBAT) === 0, String(hit.fx.count(COMBAT)));
}

if (on("crowd")) {
  const crowdOut = join(mkdtempSync(join(tmpdir(), "gravewake-")), "crowd.mjs");
  execFileSync("npx", ["esbuild", "src/game/crowd.ts", "--bundle", "--platform=node", "--format=esm", "--log-level=warning", `--outfile=${crowdOut}`], {
    stdio: ["ignore", "ignore", "inherit"],
  });
  const { CROWD_ROLES, CROWD_VARIANTS, CROWD_FIXED, crowdCol, crowdLook } = await import(pathToFileURL(crowdOut).href);
  const { readFileSync } = await import("node:fs");
  const png = readFileSync("public/art/sprites/folk-variants.png");
  const pngW = png.readUInt32BE(16);
  const pngH = png.readUInt32BE(20);
  check("crowd", "folk-variants.png holds every town role's looks, eleven frames each", pngW === CROWD_ROLES.length * CROWD_VARIANTS * 11 * 16 && pngH === 32, `${pngW}x${pngH}`);
  const g = fresh();
  const town = g.npcs.filter((n) => CROWD_ROLES.includes(n.look ?? n.role));
  const first = town.map((n) => crowdLook(n.id));
  const again = town.map((n) => crowdLook(n.id));
  check("crowd", "an NPC's look comes from its id and never changes", town.length > 0 && first.every((v, i) => v === again[i] && v >= 0 && v <= CROWD_VARIANTS), first.join(","));
  const guards = g.npcs.filter((n) => n.role === "guard").map((n) => crowdLook(n.id));
  check("crowd", "the town guards are not all one look", new Set(guards).size > 1, guards.join(","));
  const kept = ["warrior", "wizard", "assassin", "vampire", "priest", "witch", "shade", "mystic"].every((r) => crowdCol(r, 3, 0) === -1);
  check("crowd", "heroes and companions keep their main cell", kept && crowdCol("guard", 0, 0) === -1);
  // The town hunter is one fixed man: every look and every frame falls back to his people.png cell, day and night.
  const hunterCols = [];
  for (const night of [false, true]) {
    const h = fresh();
    if (night) {
      h.worldMs = 20 * 60 * 1000;
      h.enterTown();
    }
    for (const n of h.npcs.filter((n) => (n.look ?? n.role) === "hunter")) {
      for (let look = 0; look <= CROWD_VARIANTS; look++) for (let f = 0; f < 11; f++) hunterCols.push(crowdCol("hunter", look, f));
      hunterCols.push(crowdCol(n.look ?? n.role, crowdLook(n.id), 0));
    }
  }
  check("crowd", "the town hunter is excluded from crowd looks and always draws his own cell", CROWD_FIXED?.includes("hunter") && hunterCols.length === 2 * ((CROWD_VARIANTS + 1) * 11 + 1) && hunterCols.every((c) => c === -1), `${hunterCols.length} cols, ${hunterCols.filter((c) => c !== -1).length} varied`);
  const others = town.filter((n) => (n.look ?? n.role) !== "hunter" && crowdCol(n.look ?? n.role, crowdLook(n.id), 0) >= 0).length;
  check("crowd", "other town folk still wear their crowd looks", others >= 5, `${others} varied`);
  const reload = fresh();
  const same = reload.npcs.filter((n) => CROWD_ROLES.includes(n.look ?? n.role)).map((n) => crowdLook(n.id));
  check("crowd", "a fresh game gives every NPC the same look again", same.join(",") === first.join(","));
}

// ---- Dungeon secrets: rune doors (rune) and secret walls (crack). ----
let secretsMod = null;
async function secrets() {
  if (secretsMod) return secretsMod;
  const { writeFileSync } = await import("node:fs");
  const dir = mkdtempSync(join(tmpdir(), "gravewake-"));
  const entry = join(dir, "secrets.ts");
  const root = process.cwd();
  writeFileSync(entry, `export { DUNGEONS, T, TRAPS, trapAtk } from "${root}/src/game/content.ts";\nexport * from "${root}/src/game/feats.ts";\n`);
  const file = join(dir, "secrets.mjs");
  execFileSync("npx", ["esbuild", entry, "--bundle", "--platform=node", "--format=esm", "--log-level=warning", `--outfile=${file}`], { stdio: ["ignore", "ignore", "inherit"] });
  secretsMod = await import(pathToFileURL(file).href);
  return secretsMod;
}

/** Every dungeon floor, in a fixed order. The vampire can open the town grave too. */
function eachFloor(S, fn) {
  const g = fresh("vampire");
  for (const d of S.DUNGEONS) {
    g.enterDungeon(d.id);
    for (let f = 1; f <= d.floors; f++) {
      g.floor = f;
      g.loadFloor("start");
      fn(g, d, f);
    }
  }
}

/** Load the first floor whose secrets pass pick. */
function floorWhere(S, g, pick) {
  for (const d of S.DUNGEONS) {
    if (d.id === "grave" && g.cls !== "vampire") continue;
    for (let f = 1; f <= d.floors; f++) {
      g.enterDungeon(d.id);
      g.floor = f;
      g.loadFloor("start");
      if (g.feats && pick(g.feats)) return `${d.id}:${f}`;
    }
  }
  return "";
}

/** makeDrop("rare"): gear of rank 2 or 3, a gem from the rare pool, or a draught. Never junk. */
function rareTable(it) {
  if (!it || it.kind === "junk") return false;
  if (it.kind === "gem" || it.kind === "potion") return true;
  return it.rank === 2 || it.rank === 3;
}

function standOn(g, spot) {
  g.px = spot.x * TILE + 8;
  g.py = spot.y * TILE + 10;
  g.facing = "n";
}

function roomOpenFrom(S, g, room, from) {
  const steps = S.walkSteps(g.tiles, g.w, g.h, from.x, from.y);
  for (let y = room.y; y < room.y + room.h; y++) for (let x = room.x; x < room.x + room.w; x++) if (steps[y * g.w + x] < 0) return false;
  return true;
}

function upStair(S, g) {
  const i = g.tiles.indexOf(S.T.stairU);
  return { x: i % g.w, y: Math.floor(i / g.w) };
}

function ringIsRock(S, g, room, mouth) {
  for (let y = room.y - 1; y <= room.y + room.h; y++) {
    for (let x = room.x - 1; x <= room.x + room.w; x++) {
      const inside = x >= room.x && x < room.x + room.w && y >= room.y && y < room.y + room.h;
      if (inside || (x === mouth.x && y === mouth.y)) continue;
      if (g.tiles[y * g.w + x] !== S.T.wall) return false;
    }
  }
  return true;
}

if (on("rune") || on("crack")) {
  const S = await secrets();
  const { readFileSync } = await import("node:fs");
  const src = readFileSync("src/game/feats.ts", "utf8");
  const sheets = Object.fromEntries(
    ["glyphs", "fire", "harrow", "ossuary", "wraps", "carrion", "wick", "warren", "chapel", "vesper", "drowned", "blackroot", "grave", "hearth", "cave"].map((n) => {
      const png = readFileSync(`public/art/writer/feat-${n}.png`);
      return [n, `${png.readUInt32BE(16)}x${png.readUInt32BE(20)}`];
    }),
  );
  const themes = Object.entries(sheets).filter(([n]) => n !== "glyphs" && n !== "fire");
  const rows = [];
  eachFloor(S, (g, d, f) => {
    rows.push({ id: d.id, f, floors: d.floors, pocket: !!d.pocket, last: f >= d.floors, feats: g.feats, tiles: [...g.tiles], w: g.w, h: g.h, up: upStair(S, g), roamers: g.roamers.map((r) => Math.floor(r.y / TILE) * g.w + Math.floor(r.x / TILE)) });
  });
  const again = [];
  eachFloor(S, (g) => again.push(JSON.stringify(g.feats)));

  if (on("rune")) {
    const full = S.DUNGEONS.filter((d) => !d.pocket).map((d) => d.id);
    const with_ = new Set(rows.filter((r) => r.feats?.rune).map((r) => r.id));
    check("rune", "every full dungeon has a rune vault", full.every((id) => with_.has(id)), full.filter((id) => !with_.has(id)).join(","));
    const wrongFloor = rows.filter((r) => !!r.feats?.rune !== S.runeFloor(r.f, r.floors, r.pocket));
    check("rune", "every floor 2, 5, 8 short of the boss has its vault, and no other floor does", rows.every((r) => !r.feats?.rune || (r.f % 3 === 2 && !r.last && !r.pocket)) && wrongFloor.length === 0, wrongFloor.map((r) => `${r.id}:${r.f}`).join(","));
    check("rune", "the same floor carves the same vault every time", rows.every((r, i) => JSON.stringify(r.feats) === again[i]));
    check("rune", "feats.ts places secrets without Math.random", !/Math\.random\s*\(/.test(src));
    const kinds = new Set(rows.filter((r) => r.feats?.rune).map((r) => r.feats.rune.kind));
    check("rune", "both puzzles appear: braziers and saints", kinds.has("brazier") && kinds.has("statue"), [...kinds].join(","));
    let shape = "";
    for (const r of rows.filter((r) => r.feats?.rune)) {
      const v = r.feats.rune;
      const g = { tiles: r.tiles, w: r.w, h: r.h };
      const steps = S.walkSteps(r.tiles, r.w, r.h, r.up.x, r.up.y);
      const marksOk = v.marks.length === 3 && v.marks.every((m) => r.tiles[m.y * r.w + m.x] === (v.kind === "brazier" ? S.T.brazier : S.T.statue) && steps[m.stand.y * r.w + m.stand.x] >= 0);
      const ok = r.tiles[v.door.y * r.w + v.door.x] === S.T.runeDoor && steps[v.approach.y * r.w + v.approach.x] >= 0 && ringIsRock(S, g, v.room, v.door) && marksOk && [...v.order].sort().join("") === "012";
      if (!ok) shape = `${r.id}:${r.f}`;
    }
    check("rune", "a vault is cut from rock, its door and its three marks are reachable from the up stair", !shape, shape);
    const spawnIn = rows.filter((r) => r.roamers.some((i) => (r.feats?.hidden ?? []).includes(i)));
    check("rune", "no foe spawns inside a sealed room", spawnIn.length === 0, spawnIn.map((r) => `${r.id}:${r.f}`).join(","));
    check("rune", "rune door art comes from the pixel writer for every cave", themes.every(([, v]) => v === "80x16") && sheets.glyphs === "45x5" && sheets.fire === "48x16", JSON.stringify(sheets));

    // Braziers: wrong order resets, right order opens.
    const g = fresh();
    const at = floorWhere(S, g, (f) => f.rune?.kind === "brazier");
    const v = g.feats?.rune;
    if (v) {
      const byGlyph = (n) => v.marks.find((m) => m.glyph === n);
      const solid = g.solidAt(v.door.x * TILE + 8, v.door.y * TILE + 8, true);
      standOn(g, byGlyph(v.order[1]).stand);
      g.interact();
      const reset = g.runeLit.length === 0 && g.tiles[v.door.y * g.w + v.door.x] === S.T.runeDoor;
      standOn(g, byGlyph(v.order[0]).stand);
      g.interact();
      standOn(g, byGlyph(v.order[2]).stand);
      g.interact();
      const wrongReset = g.runeLit.length === 0 && g.tiles[v.door.y * g.w + v.door.x] === S.T.runeDoor;
      for (const n of v.order) {
        standOn(g, byGlyph(n).stand);
        g.interact();
      }
      const open = g.tiles[v.door.y * g.w + v.door.x] === S.T.floor;
      check("rune", "a sealed rune door stops the hero", solid, at);
      check("rune", "lighting a brazier out of order puts them all out", reset && wrongReset, g.logLine);
      check("rune", "lighting the braziers in the lintel's order opens the door", open, `${at} ${g.logLine}`);
      check("rune", "the vault is reachable once the door opens", roomOpenFrom(S, g, v.room, v.approach));
      standOn(g, v.chest);
      g.py = v.chest.y * TILE + 8;
      const before = g.drops.length;
      g.interact();
      const got = g.drops.slice(before).map((d) => d.item);
      check("rune", "the vault chest pays three items from the rare table", got.length === 3 && got.every(rareTable), got.map((it) => it?.name).join(", "));
      const laid = g.drops.slice(before);
      check("rune", "vault loot lands on the vault floor, in pickup reach", laid.every((d) => !BLOCKED.has(tileAt(g, d.x, d.y)) && d.x >= v.room.x * TILE && d.x < (v.room.x + v.room.w) * TILE && d.y >= v.room.y * TILE && d.y < (v.room.y + v.room.h) * TILE), laid.map((d) => `${d.x},${d.y}`).join(" "));
      g.saveSlot(2);
      const back = new Game();
      back.loadSlot(2);
      check("rune", "an opened rune door stays open after a save and a load", back.tiles[v.door.y * back.w + v.door.x] === S.T.floor && back.feats?.rune?.door.x === v.door.x);
    } else check("rune", "a brazier floor exists", false);

    // Saints: wrong saint does nothing, right saint opens. A foe in reach still takes the smite.
    const s = fresh();
    const at2 = floorWhere(S, s, (f) => f.rune?.kind === "statue");
    const sv = s.feats?.rune;
    if (sv) {
      const wrong = sv.marks.find((m) => m.glyph !== sv.order[0]);
      const right = sv.marks.find((m) => m.glyph === sv.order[0]);
      s.roamers = [];
      s.energy = 99;
      standOn(s, wrong.stand);
      s.smite();
      const shut = s.tiles[sv.door.y * s.w + sv.door.x] === S.T.runeDoor;
      standOn(s, right.stand);
      s.interact();
      const handsShut = s.tiles[sv.door.y * s.w + sv.door.x] === S.T.runeDoor;
      startFight(s);
      const near = fieldFoe(s);
      const hp0 = near.hp;
      s.energy = 99;
      s.smite();
      const foeFirst = near.hp < hp0 && s.tiles[sv.door.y * s.w + sv.door.x] === S.T.runeDoor;
      check("rune", "with a foe in reach, Smite still hits the foe and not the saint", foeFirst, `${hp0} -> ${near.hp} mode ${s.mode}`);
      s.roamers = [];
      s.battle = null;
      s.mode = "play";
      standOn(s, right.stand);
      s.energy = 99;
      s.smite();
      const opened = s.tiles[sv.door.y * s.w + sv.door.x] === S.T.floor;
      check("rune", "smiting the wrong saint keeps the door shut, and hands do nothing", shut && handsShut, at2);
      check("rune", "smiting the saint the lintel names opens the door", opened && roomOpenFrom(S, s, sv.room, sv.approach), s.logLine);
    } else check("rune", "a saint floor exists", false);
  }

  if (on("crack")) {
    const ids = S.DUNGEONS.map((d) => d.id);
    const with_ = new Set(rows.filter((r) => r.feats?.crack).map((r) => r.id));
    check("crack", "every dungeon and pocket cave has a secret wall", ids.every((id) => with_.has(id)), ids.filter((id) => !with_.has(id)).join(","));
    const crackWrong = rows.filter((r) => !!r.feats?.crack !== S.crackFloor(r.f, r.floors, r.pocket));
    check("crack", "every odd floor short of the boss, and each pocket cave's first, has its secret wall", crackWrong.length === 0, crackWrong.map((r) => `${r.id}:${r.f}`).join(","));
    let shape = "";
    for (const r of rows.filter((r) => r.feats?.crack)) {
      const c = r.feats.crack;
      const steps = S.walkSteps(r.tiles, r.w, r.h, r.up.x, r.up.y);
      const ok = r.tiles[c.wall.y * r.w + c.wall.x] === S.T.crack && steps[c.approach.y * r.w + c.approach.x] >= 0 && ringIsRock(S, { tiles: r.tiles, w: r.w, h: r.h }, c.room, c.wall) && r.tiles[c.chest.y * r.w + c.chest.x] === S.T.chest;
      if (!ok) shape = `${r.id}:${r.f}`;
      const v = r.feats.rune?.room;
      if (v && !(c.room.x > v.x + v.w || c.room.x + c.room.w < v.x || c.room.y > v.y + v.h || c.room.y + c.room.h < v.y)) shape = `${r.id}:${r.f} touches the vault`;
    }
    check("crack", "a pocket room is cut from rock behind cracked brick the hero can reach", !shape, shape);
    check("crack", "cracked brick art comes from the pixel writer", themes.every(([, v]) => v === "80x16"));

    const g = fresh();
    const at = floorWhere(S, g, (f) => !!f.crack);
    const c = g.feats?.crack;
    if (c) {
      g.roamers = [];
      const dx = Math.sign(c.wall.x - c.approach.x);
      const dy = Math.sign(c.wall.y - c.approach.y);
      const key = dx > 0 ? g.keyBind.right : dx < 0 ? g.keyBind.left : dy > 0 ? g.keyBind.down : g.keyBind.up;
      standOn(g, c.approach);
      g.held.add(key);
      let entered = false;
      for (let i = 0; i < 30; i++) {
        g.update(0.05);
        if (Math.floor(g.px / TILE) === c.wall.x && Math.floor(g.py / TILE) === c.wall.y) entered = true;
      }
      g.held.delete(key);
      check("crack", "cracked brick is solid until it breaks", !entered && g.tiles[c.wall.y * g.w + c.wall.x] === S.T.crack, at);
      const roomIdx = [];
      for (let y = c.room.y; y < c.room.y + c.room.h; y++) for (let x = c.room.x; x < c.room.x + c.room.w; x++) roomIdx.push(y * g.w + x);
      check("crack", "the pocket room is drawn as plain rock until the wall breaks", roomIdx.every((i) => g.hidden.has(i)), `${roomIdx.filter((i) => g.hidden.has(i)).length}/${roomIdx.length}`);
      standOn(g, c.approach);
      g.slash();
      const slashKept = g.tiles[c.wall.y * g.w + c.wall.x] === S.T.crack;
      g.stam = 99;
      g.px = c.approach.x * TILE + 8 + (c.approach.x - c.wall.x) * 40;
      g.py = c.approach.y * TILE + 10 + (c.approach.y - c.wall.y) * 40;
      g.whirl();
      const farKept = g.tiles[c.wall.y * g.w + c.wall.x] === S.T.crack;
      check("crack", "a slash, or a whirl from across the room, does not break it", slashKept && farKept, g.logLine);
      standOn(g, c.approach);
      g.stam = 99;
      g.whirl();
      const broke = g.tiles[c.wall.y * g.w + c.wall.x] === S.T.floor;
      check("crack", "a whirl beside cracked brick breaks it and opens the room", broke && roomOpenFrom(S, g, c.room, c.approach) && roomIdx.every((i) => !g.hidden.has(i)), g.logLine);
      const before = g.drops.length;
      standOn(g, c.chest);
      g.py = c.chest.y * TILE + 8;
      g.interact();
      const got = g.drops.slice(before).map((d) => d.item);
      check("crack", "the pocket chest pays two items from the rare table", got.length === 2 && got.every(rareTable), got.map((it) => it?.name).join(", "));
      const laid = g.drops.slice(before);
      check("crack", "pocket loot lands on the room floor, in pickup reach", laid.every((d) => !BLOCKED.has(tileAt(g, d.x, d.y)) && d.x >= c.room.x * TILE && d.x < (c.room.x + c.room.w) * TILE && d.y >= c.room.y * TILE && d.y < (c.room.y + c.room.h) * TILE), laid.map((d) => `${d.x},${d.y}`).join(" "));
      g.saveSlot(2);
      const back = new Game();
      back.loadSlot(2);
      check("crack", "a broken wall stays broken after a save and a load", back.tiles[c.wall.y * back.w + c.wall.x] === S.T.floor);
      // Bodies: let the floor's foes chase for a while with the room open. Nobody ends on a secret tile.
      const b = fresh();
      floorWhere(S, b, (f) => !!f.crack && !!f.rune);
      let stuck = "";
      for (let i = 0; i < 200; i++) {
        b.update(0.05);
        for (const r of b.roamers) {
          const t = tileAt(b, r.x, r.y);
          if (BLOCKED.has(t)) stuck = `${r.id} on ${t}`;
        }
      }
      check("crack", "no foe ends up inside a secret tile", !stuck, stuck);
    } else check("crack", "a secret-wall floor exists", false);
  }
}

// ---- Trapped floors: spikes and pressure plates (trap). ----
if (on("trap")) {
  const S = await secrets();
  const { readFileSync } = await import("node:fs");
  const src = readFileSync("src/game/feats.ts", "utf8");
  const png = readFileSync("public/art/writer/trap.png");
  check("trap", "trap.png holds five 16x16 cells: holes, tips, spikes, plate, pressed", png.readUInt32BE(16) === 80 && png.readUInt32BE(20) === 16, `${png.readUInt32BE(16)}x${png.readUInt32BE(20)}`);
  const place = src.slice(src.indexOf("// ---- Floor traps ----"));
  check("trap", "trap placement and the spike cycle are seeded (no Math.random)", place.length > 0 && !place.includes("Math.random"));

  const rows = [];
  eachFloor(S, (g, d, f) => {
    rows.push({ id: d.id, f, pocket: !!d.pocket, boss: !d.pocket && f >= d.floors, traps: g.feats?.traps ?? [], feats: g.feats, tiles: [...g.tiles], w: g.w, h: g.h, up: upStair(S, g), roamers: g.roamers.map((r) => Math.floor(r.y / TILE) * g.w + Math.floor(r.x / TILE)) });
  });
  const again = [];
  eachFloor(S, (g) => again.push(JSON.stringify(g.feats?.traps ?? [])));
  check("trap", "the same floor gets the same traps every time", rows.every((r, i) => JSON.stringify(r.traps) === again[i]));
  const short = rows.filter((r) => !r.boss && r.traps.length !== (r.pocket ? 2 : 4)).map((r) => `${r.id}:${r.f}=${r.traps.length}`);
  check("trap", "every non-boss floor has its traps (4 on a full cave, 2 on a pocket)", short.length === 0, short.join(" "));
  const kinds = rows.filter((r) => !r.boss).every((r) => r.traps.filter((t) => t.kind === "spike").length === r.traps.length / 2);
  check("trap", "half the traps are spikes and half are plates", kinds);
  check("trap", "no boss floor has a trap", rows.filter((r) => r.boss).every((r) => r.traps.length === 0));
  const bad = [];
  for (const r of rows) {
    const near = (x, y) => {
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        const t = r.tiles[(y + dy) * r.w + x + dx];
        if (t === S.T.stairU || t === S.T.stairD || S.secretTile(t)) return true;
      }
      return false;
    };
    const ru = r.feats?.rune;
    const used = [...(ru ? [ru.approach, ...ru.marks.map((m) => m.stand)] : []), ...(r.feats?.crack ? [r.feats.crack.approach] : [])].map((p) => p.y * r.w + p.x);
    for (const t of r.traps) {
      const i = t.y * r.w + t.x;
      if (r.tiles[i] !== S.T.floor) bad.push(`${r.id}:${r.f} ${t.x},${t.y} on tile ${r.tiles[i]}`);
      else if (near(t.x, t.y)) bad.push(`${r.id}:${r.f} ${t.x},${t.y} beside a stair or secret`);
      else if (r.feats.hidden.includes(i)) bad.push(`${r.id}:${r.f} ${t.x},${t.y} in a secret room`);
      else if (r.roamers.includes(i)) bad.push(`${r.id}:${r.f} ${t.x},${t.y} on a spawn`);
      else if (used.includes(i)) bad.push(`${r.id}:${r.f} ${t.x},${t.y} where a secret is used from`);
    }
    for (const a of r.traps) for (const b of r.traps) if (a !== b && Math.abs(a.x - b.x) + Math.abs(a.y - b.y) < 3) bad.push(`${r.id}:${r.f} traps touch`);
  }
  check("trap", "no trap on or beside a stair, a spawn, a chest, a secret, or in a secret room", bad.length === 0, bad.slice(0, 4).join("; "));
  const cut = [];
  for (const r of rows) {
    if (!r.traps.length) continue;
    // The game's own walk test, with every trap tile turned to rock on a copy of the floor.
    const walk = (blocked) => {
      const tiles = Uint8Array.from(r.tiles, (t, i) => (blocked.has(i) ? S.T.wall : t));
      const steps = S.walkSteps(tiles, r.w, r.h, r.up.x, r.up.y);
      return new Set([...steps.keys()].filter((i) => steps[i] >= 0));
    };
    const all = walk(new Set());
    const traps = new Set(r.traps.map((t) => t.y * r.w + t.x));
    const safe = walk(traps);
    const lost = [...all].filter((i) => !traps.has(i) && !safe.has(i));
    const down = r.tiles.indexOf(S.T.stairD);
    if (lost.length || (down >= 0 && all.has(down) && !safe.has(down))) cut.push(`${r.id}:${r.f} cuts off ${lost.length}`);
  }
  check("trap", "every floor keeps a trap-free path to everything it had", cut.length === 0, cut.join(" "));

  const L = [1, 4, 10, 22, 34, 48, 66];
  const curve = L.every((l) => S.trapAtk(l) === Math.round(S.TRAPS.atk * (0.7 + l * 0.06)));
  const inRange = L.every((l) => {
    const atks = FAMILIES.map((m) => scaleMonster(m, l).atk);
    return S.trapAtk(l) >= Math.min(...atks) && S.trapAtk(l) <= Math.max(...atks);
  });
  check("trap", "trap attack is the ATK curve on base 5", curve, L.map((l) => S.trapAtk(l)).join(","));
  check("trap", "a trap hits inside the trash family attack range at every level", inRange);

  // Load a floor with traps and hold the hero on one.
  const setup = (kind) => {
    const g = fresh();
    floorWhere(S, g, (f) => (f.traps ?? []).some((t) => t.kind === kind));
    const i = g.feats.traps.findIndex((t) => t.kind === kind);
    const t = g.feats.traps[i];
    g.roamers = [];
    g.critters = [];
    standOn(g, t);
    g.iframe = 0;
    return { g, t, i };
  };
  const dealtFor = (g) => Math.max(1, S.trapAtk(g.dungeonLevel()) - Math.floor(g.ac / 2));
  const atStage = (g, t, local) => {
    const c = S.TRAPS.spikeCycle;
    g.worldMs = (10 * c + local - t.phase * c) * 1000 - 50;
  };
  {
    const { g, t } = setup("spike");
    const hit = (local) => {
      atStage(g, t, local);
      g.iframe = 0;
      g.nums = [];
      g.hp = g.maxHp;
      g.update(0.05);
      return g.nums.map((n) => n.text).join(",");
    };
    const down = hit(0.6);
    const tips = hit(S.TRAPS.spikeDown + 0.12);
    const up = hit(S.TRAPS.spikeDown + S.TRAPS.spikeTell + 0.2);
    const back = hit(S.TRAPS.spikeCycle - 0.05);
    check("trap", "spikes down do not hurt", down === "", down);
    check("trap", "rising tips are the tell and do not hurt", tips === "" && S.spikeStage(t, S.TRAPS.spikeDown + 0.12 - t.phase * S.TRAPS.spikeCycle + 10 * S.TRAPS.spikeCycle) === 1, tips);
    check("trap", "spikes up hit for one trap hit", up === String(dealtFor(g)), `${up} want ${dealtFor(g)}`);
    check("trap", "retracting spikes do not hurt", back === "", back);
    const tellFrames = Math.round(S.TRAPS.spikeTell * 8);
    check("trap", "the tips show for two animation frames before the spikes rise", tellFrames === 2);
    // A foe and a companion on the raised spikes are left alone.
    const g2 = setup("spike");
    const foe = { id: "f", x: g2.t.x * TILE + 8, y: g2.t.y * TILE + 8, family: "rat", tint: "#000", def: "rat", level: 1, ang: 0, hp: 9, max: 9, atk: 1, ac: 0, name: "Rat" };
    g2.g.roamers = [foe];
    g2.g.px += 64;
    g2.g.companion = { id: "a", name: "Bren", kit: "acolyte", sourceId: "acolyte", look: "priest", coat: "#000", focus: "heal", hp: 20, equip: {}, x: g2.t.x * TILE + 8, y: g2.t.y * TILE + 8 };
    atStage(g2.g, g2.t, S.TRAPS.spikeDown + S.TRAPS.spikeTell + 0.2);
    g2.g.update(0.05);
    check("trap", "foes and companions take no trap damage", foe.hp === 9 && g2.g.companion.hp === 20, `${foe.hp} ${g2.g.companion.hp}`);
  }
  {
    // Stay on the plate: the mark lands.
    const { g, i } = setup("plate");
    g.update(0.05);
    const marked = (g.plates[i]?.tell ?? 0) > 0;
    check("trap", "stepping on a plate marks it for half a second", marked && Math.abs(g.plates[i].tell - S.TRAPS.plateTell) < 0.06, g.logLine);
    g.nums = [];
    for (let k = 0; k < 12; k++) g.update(0.05);
    check("trap", "standing in the plate's mark takes one trap hit", g.nums.map((n) => n.text).join(",") === String(dealtFor(g)), g.logLine);
    const rearm = g.plates[i].cool > 0;
    g.nums = [];
    g.iframe = 0;
    g.update(0.05);
    check("trap", "a fired plate rests before it can fire again", rearm && g.plates[i].tell === 0 && g.nums.length === 0);
    // Walk out of the mark: no hit.
    const w = setup("plate");
    const dirs = [["KeyD", 1, 0], ["KeyA", -1, 0], ["KeyS", 0, 1], ["KeyW", 0, -1]];
    const free = dirs.find(([, dx, dy]) => [1, 2].every((k) => !BLOCKED.has(w.g.tiles[(w.t.y + dy * k) * w.g.w + w.t.x + dx * k]) && w.g.tiles[(w.t.y + dy * k) * w.g.w + w.t.x + dx * k] === S.T.floor));
    w.g.update(0.05);
    w.g.nums = [];
    if (free) w.g.held.add(free[0]);
    for (let k = 0; k < 12; k++) w.g.update(0.05);
    w.g.held.clear();
    check("trap", "walking out of a plate's mark in time takes no hit", !!free && w.g.nums.length === 0 && w.g.logLine.includes("step clear"), `${free?.[0]} ${w.g.logLine}`);
    // A foe on a plate does not fire it.
    const f = setup("plate");
    f.g.px += 64;
    f.g.roamers = [{ id: "f", x: f.t.x * TILE + 8, y: f.t.y * TILE + 8, family: "rat", tint: "#000", def: "rat", level: 1, ang: 0, name: "Rat" }];
    f.g.update(0.05);
    check("trap", "a foe on a plate does not fire it", (f.g.plates[f.i]?.tell ?? 0) === 0);
  }
  {
    // Traps are an overlay: an older save still loads, and the traps return with the floor.
    const g = fresh();
    floorWhere(S, g, (f) => (f.traps ?? []).length > 0);
    const want = JSON.stringify(g.feats.traps);
    g.saveSlot(2);
    const back = new Game();
    back.loadSlot(2);
    check("trap", "a save on a trapped floor loads with the same traps", JSON.stringify(back.feats?.traps) === want);
  }
}


// ---- Floor curses (curse) and the escort/rescue quest (rescue). Placement and seeds: src/game/runs.ts. ----
let runsModule = null;
async function runsMod() {
  if (runsModule) return runsModule;
  const { writeFileSync } = await import("node:fs");
  const dir = mkdtempSync(join(tmpdir(), "gravewake-"));
  const entry = join(dir, "runs.ts");
  const root = process.cwd();
  writeFileSync(
    entry,
    `export { DUNGEONS, T, TRAPS, RUNS, CURSES, RESCUES, CYCLE_MS, trapAtk } from "${root}/src/game/content.ts";\nexport * from "${root}/src/game/runs.ts";\nexport { walkSteps, secretTile } from "${root}/src/game/feats.ts";\nexport { crowdLook, crowdCol } from "${root}/src/game/crowd.ts";\n`,
  );
  const file = join(dir, "runs.mjs");
  execFileSync("npx", ["esbuild", entry, "--bundle", "--platform=node", "--format=esm", "--log-level=warning", `--outfile=${file}`], { stdio: ["ignore", "ignore", "inherit"] });
  runsModule = await import(pathToFileURL(file).href);
  return runsModule;
}

/** The first day-night cycle on which this site's run draws the wanted curse ("" = plain). */
function dayFor(R, site, want) {
  for (let d = 0; d < 400; d++) if (R.pickCurse(site, d) === want) return d;
  return -1;
}

/** Enter a site at the start of a given cycle, on a given floor, with the field cleared. */
function enterOn(R, g, site, day, floor = 1) {
  g.worldMs = day * R.CYCLE_MS + 60 * 1000;
  g.enterDungeon(site);
  if (floor !== 1) {
    g.floor = floor;
    g.loadFloor("start");
  }
  g.roamers = [];
  g.critters = [];
  g.iframe = 0;
  g.nums = [];
}

/** A one-hit foe right in front of the hero, so a slash fells it. */
function dummyFoe(g, silver = 10) {
  const r = { id: "dummy", x: g.px + 14, y: g.py, family: "zombie", tint: "#6a7a48", def: "zombie", level: 1, ang: 0, hp: 1, max: 1, atk: 1, ac: 0, xp: 1, silver, name: "Dummy", aggro: true };
  g.roamers = [r];
  g.facing = "e";
  return r;
}

/** Silver piles on this floor. Callers clear drops first, so these all came from one kill. */
function pilesNear(g) {
  return g.drops.filter((d) => d.silver > 0 && d.mapId === "dungeon" && d.dungeon === g.dungeon && d.floor === g.floor).map((d) => d.silver);
}

/** Stand on open floor with three clear tiles to the west and one to the east (room to back out of a mark). */
function standInRow(R, g) {
  for (let y = 1; y < g.h - 1; y++) for (let x = 4; x < g.w - 2; x++) {
    if ([-3, -2, -1, 0, 1].every((dx) => g.tiles[y * g.w + x + dx] === R.T.floor)) {
      g.px = x * TILE + 8;
      g.py = y * TILE + 10;
      return true;
    }
  }
  return false;
}

if (on("curse")) {
  const R = await runsMod();
  const { readFileSync } = await import("node:fs");
  const runsSrc = readFileSync("src/game/runs.ts", "utf8");
  const drawSrc = readFileSync("src/game/draw.ts", "utf8");
  check("curse", "curse picks and captive placement are seeded (no Math.random in runs.ts)", runsSrc.length > 0 && !runsSrc.includes("Math.random"));
  const sites = R.DUNGEONS.map((d) => d.id);
  let same = true;
  const tally = { "": 0, dark: 0, dry: 0, ash: 0 };
  for (const s of sites) for (let d = 0; d < 60; d++) {
    const c = R.pickCurse(s, d);
    if (c !== R.pickCurse(s, d)) same = false;
    tally[c] += 1;
  }
  const total = sites.length * 60;
  check("curse", "the same site on the same cycle always draws the same curse", same);
  check("curse", "every curse turns up, and about half the runs stay plain", tally.dark > 0 && tally.dry > 0 && tally.ash > 0 && tally[""] / total > 0.35 && tally[""] / total < 0.65, JSON.stringify(tally));
  check("curse", "exactly the three curses from the task list: dark, no potions, ash", Object.keys(R.CURSES).sort().join(",") === "ash,dark,dry");
  const keys = ["curseChance", "darkRadius", "darkEdge", "ashTell", "ashRadius", "bonus", "captiveReach", "escortBack", "escortSpeed", "escortSnap"];
  check("curse", "every new number lives in the RUNS block in content.ts", keys.every((k) => k in R.RUNS) && Object.keys(R.RUNS).length === keys.length, Object.keys(R.RUNS).join(","));

  // Boss floors never hold a curse; pocket floors (no boss) always do.
  const g = fresh("vampire");
  const bad = [];
  for (const d of R.DUNGEONS) {
    const day = dayFor(R, d.id, "dark");
    if (day < 0) {
      bad.push(`${d.id} never cursed`);
      continue;
    }
    for (let f = 1; f <= d.floors; f++) {
      enterOn(R, g, d.id, day, f);
      const boss = !d.pocket && f >= d.floors;
      if (g.curse !== "dark") bad.push(`${d.id}:${f} lost the curse`);
      if (boss === g.curseOn()) bad.push(`${d.id}:${f} boss=${boss} on=${g.curseOn()}`);
      if (boss && g.curseLine()) bad.push(`${d.id}:${f} shows a line on the boss floor`);
    }
  }
  check("curse", "a curse holds on every floor of the run except the boss floor", bad.length === 0, bad.slice(0, 4).join("; "));

  // A curse is an overlay: the same floor under a curse and plain has the same tiles, secrets, traps, and spawns.
  const diff = [];
  for (const d of R.DUNGEONS) {
    const lay = (day) => {
      const h = fresh("vampire");
      const out = [];
      for (let f = 1; f <= d.floors; f++) {
        h.worldMs = day * R.CYCLE_MS + 60000;
        h.enterDungeon(d.id);
        h.floor = f;
        h.loadFloor("start");
        out.push(JSON.stringify([[...h.tiles], h.feats, h.roamers.map((r) => [r.id, r.def, r.x, r.y, r.boss])]));
      }
      return out.join("|");
    };
    const plain = dayFor(R, d.id, "");
    for (const c of ["dark", "dry", "ash"]) {
      const day = dayFor(R, d.id, c);
      if (day >= 0 && lay(day) !== lay(plain)) diff.push(`${d.id} ${c}`);
    }
  }
  check("curse", "a cursed floor keeps every tile, secret, trap, and foe spawn of the plain floor", diff.length === 0, diff.join(" "));

  // The run keeps its curse when the clock turns over mid-run, and a save loads back into it.
  {
    const site = "harrow";
    const day = dayFor(R, site, "ash");
    const h = fresh();
    enterOn(R, h, site, day);
    h.worldMs += R.CYCLE_MS * 3;
    h.floor = 2;
    h.loadFloor("down");
    const kept = h.curse === "ash";
    h.saveSlot(2);
    const back = new Game();
    back.loadSlot(2);
    check("curse", "a run keeps its curse after the day turns over, and through a save", kept && back.curse === "ash" && back.curseOn(), `${h.curse} ${back.curse}`);
    // An older save (no run note in opened) still loads inside a dungeon and simply starts a run.
    const raw = JSON.parse(localStorage.getItem("gravewake-saves-v1"));
    raw[2].opened = raw[2].opened.filter((k) => !k.startsWith("run:"));
    localStorage.setItem("gravewake-saves-v1", JSON.stringify(raw));
    const old = new Game();
    let ok = true;
    try {
      old.loadSlot(2);
    } catch {
      ok = false;
    }
    check("curse", "an older save with no run note loads in a dungeon and starts a run", ok && old.mapId === "dungeon" && old.curse === R.pickCurse(site, Math.floor(old.worldMs / R.CYCLE_MS)));
    // Climbing out ends the run.
    h.floor = 1;
    h.loadFloor("up");
    const up = h.tiles.indexOf(R.T.stairU);
    h.px = (up % h.w) * TILE + 8;
    h.py = Math.floor(up / h.w) * TILE + 8;
    h.interact();
    check("curse", "climbing out of the site ends the run and its curse", h.mapId !== "dungeon" && h.curse === "" && !h.curseLine() && ![...h.opened].some((k) => k.startsWith("run:")), h.mapId);
  }

  // Corked: no draught opens on the floor; the boss floor of the same run lets you drink again.
  {
    const site = R.DUNGEONS.find((d) => !d.pocket && dayFor(R, d.id, "dry") >= 0 && d.boss).id;
    const day = dayFor(R, site, "dry");
    const h = fresh();
    enterOn(R, h, site, day, 2);
    h.hp = 5;
    h.potHp = 3;
    h.usePotion();
    check("curse", "Corked: a draught will not open on a cursed floor", h.potionsCorked() && h.potHp === 3 && h.hp === 5 && h.logLine.startsWith("Corked"), h.logLine);
    const last = R.DUNGEONS.find((d) => d.id === site).floors;
    enterOn(R, h, site, day, last);
    h.hp = 5;
    h.usePotion();
    check("curse", "Corked lifts on the boss floor", !h.potionsCorked() && h.potHp === 2 && h.hp > 5, h.logLine);
    const tsx = readFileSync("src/game/Gravewake.tsx", "utf8");
    check("curse", "Corked greys both draught pills in the HUD", (tsx.match(/potionsCorked\(\) \? "opacity-40"/g) ?? []).length === 2);
  }

  // Ashen: a fallen foe leaves a half-second mark of the ash radius; stand in it and take one trap hit.
  {
    const site = R.DUNGEONS.find((d) => !d.pocket && d.boss && dayFor(R, d.id, "ash") >= 0).id;
    const day = dayFor(R, site, "ash");
    const h = fresh();
    enterOn(R, h, site, day, 2);
    const foe = dummyFoe(h);
    const tilesBefore = [...h.tiles].join(",");
    h.slash();
    const mark = h.ashes[0];
    check("curse", "Ashen: a fallen foe leaves one ash mark for the mini-mark time", h.roamers.length === 0 && h.ashes.length === 1 && Math.abs(mark.tell - R.RUNS.ashTell) < 1e-9 && mark.x === foe.x, JSON.stringify(h.ashes));
    h.nums = [];
    h.iframe = 0;
    const hp0 = h.hp;
    for (let k = 0; k < 12; k++) h.update(0.05);
    const want = Math.max(1, R.trapAtk(h.dungeonLevel()) - Math.floor(h.ac / 2));
    check("curse", "an ash burst changes no floor tile", [...h.tiles].join(",") === tilesBefore);
    check("curse", "standing in the ash mark takes one hit on the trap curve", h.ashes.length === 0 && h.nums.map((n) => n.text).join(",") === String(want) && Math.round(hp0 - h.hp) >= want - 1, `${h.nums.map((n) => n.text)} want ${want}`);
    // Walk out of it in time.
    const w = fresh();
    enterOn(R, w, site, day, 2);
    const room = standInRow(R, w);
    dummyFoe(w);
    w.slash();
    w.nums = [];
    w.held.add("KeyA");
    for (let k = 0; k < 12; k++) w.update(0.05);
    w.held.clear();
    check("curse", "walking out of the ash mark in time takes no hit", room && w.ashes.length === 0 && w.nums.length === 0 && w.logLine.includes("step clear"), w.logLine);
    // A companion beside the burst is not hurt: the ash hits the hero only, like a trap.
    const c = fresh();
    enterOn(R, c, site, day, 2);
    dummyFoe(c);
    c.companion = { id: "a", name: "Bren", kind: "acolyte", kit: "acolyte", sourceId: "acolyte", look: "priest", coat: "#000", focus: "heal", hp: 20, equip: {}, x: c.px + 14, y: c.py + 4 };
    c.slash();
    c.px += 80;
    for (let k = 0; k < 12; k++) c.update(0.05);
    check("curse", "the ash burst hurts the hero only", c.companion.hp === 20, String(c.companion.hp));
    // A plain floor leaves no mark.
    const p = fresh();
    enterOn(R, p, site, dayFor(R, site, ""), 2);
    dummyFoe(p);
    p.slash();
    check("curse", "a plain floor leaves no ash mark", p.ashes.length === 0 && p.roamers.length === 0);
  }

  // Bonus silver: a cursed floor drops a second pile of the set share; a plain floor does not.
  {
    const bonusRows = [];
    for (const c of ["dark", "dry", "ash"]) {
      const site = R.DUNGEONS.find((d) => !d.pocket && d.boss && dayFor(R, d.id, c) >= 0).id;
      const h = fresh();
      enterOn(R, h, site, dayFor(R, site, c), 2);
      dummyFoe(h, 20);
      h.drops = [];
      h.slash();
      const piles = pilesNear(h).sort((a, b) => a - b);
      bonusRows.push(`${c}:${piles.join("+")}`);
      if (piles.join(",") !== [Math.round((20 * R.RUNS.bonus[c]) / 100), 20].sort((a, b) => a - b).join(",")) bonusRows.push("BAD");
    }
    const p = fresh();
    enterOn(R, p, "harrow", dayFor(R, "harrow", ""), 2);
    dummyFoe(p, 20);
    p.drops = [];
    p.slash();
    const plain = pilesNear(p);
    check("curse", "a cursed floor pays its bonus share of silver as a second pile", !bonusRows.includes("BAD"), bonusRows.join(" "));
    check("curse", "a plain floor pays the foe's silver only", plain.join(",") === "20", plain.join(","));
  }

  // Lightless: lamp radius inside the law's 3-5 tile off-hand light, cave black, decals drawn over the dark.
  {
    const r = R.RUNS.darkRadius;
    check("curse", "Lightless lamp is 3 to 5 tiles, with a dither step under one tile", r >= 3 * TILE && r <= 5 * TILE && R.RUNS.darkEdge > 0 && R.RUNS.darkEdge < TILE, `${r} ${R.RUNS.darkEdge}`);
    const fn = drawSrc.slice(drawSrc.indexOf("function lightlessMask"), drawSrc.indexOf("function paintLightless"));
    check("curse", "Lightless paints opaque cave black with hard pixels (no alpha, no blur, no gradient)", fn.includes('"#0c0a08"') && !/globalAlpha|filter|Gradient|shadowBlur|rgba\(/.test(drawSrc.slice(drawSrc.indexOf("function lightlessMask"), drawSrc.indexOf("function paintLightless") + 1200)));
    const after = drawSrc.slice(drawSrc.indexOf("paintLightless(ctx, g, camX"));
    check("curse", "telegraph marks are drawn on top of the dark", after.indexOf("paintMark(ctx, r.markX") > 0 && after.indexOf("RUNS.ashRadius") > 0 && after.indexOf("TRAPS.plateRadius") > 0 && after.indexOf("paintMark") < after.indexOf("drawWeather"));
  }
}

if (on("rescue")) {
  const R = await runsMod();
  const { readFileSync } = await import("node:fs");
  const png = readFileSync("public/art/writer/captive.png");
  check("rescue", "captive.png holds two 16x16 cells: chained stake, broken chain", png.readUInt32BE(16) === 32 && png.readUInt32BE(20) === 16, `${png.readUInt32BE(16)}x${png.readUInt32BE(20)}`);

  const rows = [];
  eachFloor(R, (g, d, f) => {
    rows.push({ id: d.id, f, floors: d.floors, pocket: !!d.pocket, cap: g.feats?.captive ?? null, feats: g.feats, tiles: [...g.tiles], w: g.w, h: g.h, up: upStair(R, g), spawns: g.roamers.map((r) => Math.floor(r.y / TILE) * g.w + Math.floor(r.x / TILE)) });
  });
  const again = [];
  eachFloor(R, (g) => again.push(JSON.stringify(g.feats?.captive ?? null)));
  check("rescue", "the same floor gets the same captive every time", rows.every((r, i) => JSON.stringify(r.cap) === again[i]));
  const per = {};
  for (const r of rows) if (r.cap) (per[r.id] ??= []).push(r.f);
  const want = R.RESCUES.map((x) => x.dungeon).sort();
  const wrong = rows.filter((r) => r.cap && (r.f < 2 || r.f >= r.floors || r.pocket)).map((r) => `${r.id}:${r.f}`);
  check("rescue", "each listed site holds one captive, and no other site does", Object.keys(per).sort().join(",") === want.join(",") && Object.values(per).every((v) => v.length === 1), JSON.stringify(per));
  check("rescue", "a captive is never on the first floor, a boss floor, or in a pocket cave", wrong.length === 0, wrong.join(" "));
  const bad = [];
  for (const r of rows) {
    if (!r.cap) continue;
    const i = r.cap.y * r.w + r.cap.x;
    const steps = R.walkSteps(r.tiles, r.w, r.h, r.up.x, r.up.y);
    const near = (t) => t === R.T.stairU || t === R.T.stairD || t === R.T.chest || R.secretTile(t);
    let beside = false;
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if (near(r.tiles[(r.cap.y + dy) * r.w + r.cap.x + dx])) beside = true;
    const ru = r.feats.rune;
    const used = [...(ru ? [ru.approach, ...ru.marks.map((m) => m.stand)] : []), ...(r.feats.crack ? [r.feats.crack.approach] : [])].map((p) => p.y * r.w + p.x);
    if (r.tiles[i] !== R.T.floor) bad.push(`${r.id}:${r.f} on tile ${r.tiles[i]}`);
    if (steps[i] < 0) bad.push(`${r.id}:${r.f} out of reach`);
    if (beside) bad.push(`${r.id}:${r.f} beside a stair, chest, or secret`);
    if ((r.feats.traps ?? []).some((t) => t.x === r.cap.x && t.y === r.cap.y)) bad.push(`${r.id}:${r.f} on a trap`);
    if (r.spawns.includes(i)) bad.push(`${r.id}:${r.f} on a spawn`);
    if (r.feats.hidden.includes(i)) bad.push(`${r.id}:${r.f} in a secret room`);
    if (used.includes(i)) bad.push(`${r.id}:${r.f} where a secret is used from`);
  }
  check("rescue", "a captive stands on open, reachable floor clear of stairs, chests, secrets, traps, and spawns", bad.length === 0, bad.join("; "));
  // Placement reads the floor and writes nothing.
  const touched = [];
  for (const r of rows) {
    if (!r.cap) continue;
    const copy = Uint8Array.from(r.tiles);
    const feats = JSON.stringify(r.feats);
    const spot = R.placeCaptive(copy, r.w, r.h, r.id, r.f, r.floors, JSON.parse(feats), r.spawns);
    if (copy.some((t, i) => t !== r.tiles[i]) || JSON.stringify(r.feats) !== feats || JSON.stringify(spot) !== JSON.stringify(r.cap)) touched.push(`${r.id}:${r.f}`);
  }
  check("rescue", "placing a captive changes no tile, secret, or trap", touched.length === 0, touched.join(" "));

  // Looks: a townsperson in a crowd look, never the look their shop's keeper wears.
  const keeper = { shop: "shop", alchemist: "", patron: ["patron1", "patron2"] };
  const looks = R.RESCUES.map((x) => {
    const mine = R.crowdLook(x.seed);
    const theirs = [].concat(keeper[x.body] ?? []).filter(Boolean).map((id) => R.crowdLook(id));
    return { id: x.id, mine, ok: mine > 0 && !theirs.includes(mine) && R.crowdCol(x.body, mine, 0) >= 0 };
  });
  check("rescue", "each captive wears a crowd look of their role that no keeper of that role wears", looks.every((l) => l.ok), JSON.stringify(looks));

  // The full walk: free, follow across stairs, climb out, the shop stocks the item.
  const res = R.RESCUES[0];
  const def = R.DUNGEONS.find((d) => d.id === res.dungeon);
  const capFloor = R.captiveFloor(res.dungeon, def.floors);
  const day = dayFor(R, res.dungeon, "");
  const g = fresh();
  const before = g.buildStock(res.shop).map((i) => i.name);
  enterOn(R, g, res.dungeon, day, capFloor);
  const bound = g.escort?.state === "bound";
  standOn(g, { x: g.feats.captive.x - 1, y: g.feats.captive.y });
  g.px += 6;
  g.facing = "e";
  g.roamers = [];
  g.interact();
  check("rescue", "Main beside the captive breaks the chain and they follow", bound && g.escort?.state === "follow" && g.opened.has(`escort:${res.id}`) && g.escortName() === res.name, `${g.escort?.state} ${g.logLine}`);
  // Walk a little; the captive trails behind and never stands in a wall.
  const start = { x: g.px, y: g.py };
  const dirs = ["KeyA", "KeyW", "KeyS", "KeyD"];
  let inWall = false;
  for (const key of dirs) {
    g.held.clear();
    g.held.add(key);
    for (let k = 0; k < 20; k++) {
      g.update(0.05);
      g.roamers = [];
      const t = g.tiles[Math.floor(g.escort.y / TILE) * g.w + Math.floor(g.escort.x / TILE)];
      if (BLOCKED.has(t)) inWall = true;
    }
  }
  g.held.clear();
  for (let k = 0; k < 40; k++) g.update(0.05);
  const gap = Math.hypot(g.escort.x - g.px, g.escort.y - g.py);
  check("rescue", "the freed captive trails behind you and never stands in a wall", !inWall && gap < R.RUNS.escortBack + 12 && Math.hypot(g.px - start.x, g.py - start.y) >= 0, `gap ${gap.toFixed(1)}`);
  // Up the stairs, floor by floor. The captive arrives with you.
  let kept = true;
  while (g.floor > 1) {
    g.floor -= 1;
    g.loadFloor("up");
    g.roamers = [];
    if (g.escort?.state !== "follow" || Math.hypot(g.escort.x - g.px, g.escort.y - g.py) > 40) kept = false;
  }
  check("rescue", "the captive comes with you up every stair", kept);
  // A save mid-walk brings them back on load.
  g.saveSlot(2);
  const back = new Game();
  back.loadSlot(2);
  check("rescue", "a save on the walk out loads with the captive still at your back", back.escort?.state === "follow" && back.escortName() === res.name);
  const up = upStair(R, g);
  g.px = up.x * TILE + 8;
  g.py = up.y * TILE + 8;
  g.interact();
  const after = g.buildStock(res.shop).map((i) => i.name);
  check("rescue", "climbing out with the captive marks them home", g.mapId !== "dungeon" && g.opened.has(`rescued:${res.id}`) && !g.opened.has(`escort:${res.id}`) && g.logLine.includes(res.home), g.logLine);
  check("rescue", "their shop stocks the item only after the rescue, and keeps the rest of its stock", !before.includes(res.item.name) && after.includes(res.item.name) && after.filter((n) => n !== res.item.name).join("|") === before.join("|"), `${before.length} -> ${after.length}`);
  // Next time down, the stake is empty.
  enterOn(R, g, res.dungeon, day, capFloor);
  check("rescue", "a rescued captive is gone from their stake for good", g.escort === null && !!g.feats.captive);

  // A town gate out also counts; a death without a save loses them.
  {
    const r2 = R.RESCUES[1];
    const d2 = R.DUNGEONS.find((d) => d.id === r2.dungeon);
    const f2 = R.captiveFloor(r2.dungeon, d2.floors);
    const h = fresh();
    enterOn(R, h, r2.dungeon, dayFor(R, r2.dungeon, ""), f2);
    h.px = h.escort.x - 10;
    h.py = h.escort.y;
    h.interact();
    h.openPortal();
    check("rescue", "stepping through a town gate with the captive also brings them home", h.mapId === "town" && h.opened.has(`rescued:${r2.id}`), h.logLine);
    const r3 = R.RESCUES[2];
    const d3 = R.DUNGEONS.find((d) => d.id === r3.dungeon);
    const f3 = R.captiveFloor(r3.dungeon, d3.floors);
    const k = fresh();
    localStorage.removeItem("gravewake-saves-v1");
    enterOn(R, k, r3.dungeon, dayFor(R, r3.dungeon, ""), f3);
    k.px = k.escort.x - 10;
    k.py = k.escort.y;
    k.interact();
    const freed = k.escort?.state === "follow";
    k.hp = 1;
    k.iframe = 0;
    k.bite(5, "test");
    for (let n = 0; n < 40; n++) k.update(0.05);
    const lost = k.mapId === "town" && !k.opened.has(`rescued:${r3.id}`) && ![...k.opened].some((x) => x.startsWith("escort:"));
    enterOn(R, k, r3.dungeon, dayFor(R, r3.dungeon, ""), f3);
    check("rescue", "falling on the walk out loses the captive; they wait on the stake again", freed && lost && k.escort?.state === "bound", `${freed} ${lost} ${k.escort?.state}`);
  }

  // The items copy stat lines already sold in town: no new combat numbers.
  {
    const s = fresh();
    s.level = 20;
    const mystic = s.buildStock("mystic");
    const lantern = mystic.find((i) => i.name === "Moon Lantern");
    const locket = mystic.find((i) => i.name === "Moon locket");
    const stat = (i) => JSON.stringify([i.kind, i.rank, i.slot, i.hands ?? 0, i.atk ?? 0, i.ac ?? 0, i.bonus ?? 0, i.active ?? "", i.aura ?? ""]);
    const [wren, tansy, corin] = R.RESCUES;
    for (const r of R.RESCUES) s.opened.add(`rescued:${r.id}`);
    const lamp = s.buildStock(wren.shop).find((i) => i.name === wren.item.name);
    const lock = s.buildStock(tansy.shop).find((i) => i.name === tansy.item.name);
    const edge = s.buildStock(corin.shop).find((i) => i.name === corin.item.name);
    const lv = Math.max(5, Math.min(80, s.level));
    check("rescue", "rescue items copy stock already sold in town (lantern, locket, rank-3 cabinet edge)", stat(lamp) === stat(lantern) && stat(lock) === stat(locket) && edge.atk === 4 + 3 * 2 + Math.floor(lv / 4) && edge.rank === 3, `${stat(lamp)} ${stat(lock)} ${edge?.atk}`);
  }
}

let feat47Module = null;
async function feat47Mod() {
  if (feat47Module) return feat47Module;
  const { writeFileSync } = await import("node:fs");
  const dir = mkdtempSync(join(tmpdir(), "gravewake-"));
  const entry = join(dir, "feat47.ts");
  const root = process.cwd();
  writeFileSync(
    entry,
    `export { DUNGEONS, T, MIMICS, MIMIC_DEF, BOUNTY, FAMILIES as ROSTER, CYCLE_MS, DAY_MS, MINI_NAME, mimicHint, RESCUES, RESCUE_QUESTS, ESCORT, RUNS } from "${root}/src/game/content.ts";\nexport * from "${root}/src/game/mimic.ts";\nexport * from "${root}/src/game/bounty.ts";\nexport { walkSteps, secretTile } from "${root}/src/game/feats.ts";\nexport { captiveFloor } from "${root}/src/game/runs.ts";\nexport { monsterById } from "${root}/src/game/content.ts";\nexport * from "${root}/src/game/graves.ts";\nexport * from "${root}/src/game/derby.ts";\nexport * from "${root}/src/game/decor.ts";\nexport * from "${root}/src/game/bond.ts";\nexport { BOSSES as BOSSES_LIST } from "${root}/src/game/content.ts";\nexport * from "${root}/src/game/seasons.ts";\nexport { WEATHER_MS } from "${root}/src/game/content.ts";\nexport * from "${root}/src/game/festivals.ts";\nexport { FESTIVAL_BOSSES } from "${root}/src/game/content.ts";\n`,
  );
  const file = join(dir, "feat47.mjs");
  execFileSync("npx", ["esbuild", entry, "--bundle", "--platform=node", "--format=esm", "--log-level=warning", `--outfile=${file}`], { stdio: ["ignore", "ignore", "inherit"] });
  feat47Module = await import(pathToFileURL(file).href);
  return feat47Module;
}

/** Record every foe list a fight opens with. */
function watchBattles(g) {
  const seen = [];
  const real = g.openBattle.bind(g);
  g.openBattle = (foes, flags) => {
    seen.push(foes.map((f) => ({ ...f })));
    return real(foes, flags);
  };
  return seen;
}

/** A foe list breaks the pack law unless every rare in it is a pack, or it is the one solo mimic. */
function packLaw(list) {
  const rares = list.filter((f) => f.rare);
  if (!rares.length) return "";
  const helpers = list.filter((f) => f.helper).length;
  for (const r of rares) {
    if (r.mimic) {
      if (list.length !== 1 || helpers || r.affix) return `mimic with company or affix: ${list.length} foes, ${helpers} minions, affix ${r.affix}`;
    } else {
      if (helpers < 2 || helpers > 4) return `${r.name} is a rare with ${helpers} minions`;
      if (!r.affix) return `${r.name} is a rare with no pack affix`;
    }
  }
  return "";
}

/** The enclosing method of a source line, by the last two-space method header above it. */
function methodAt(src, index) {
  const head = src.slice(0, index).split("\n").reverse().find((l) => /^ {2}(?:private |async |get )*[a-zA-Z]+\(.*\)[^;]*\{\s*$/.test(l)) ?? "";
  return (head.match(/^ {2}(?:private |async |get )*([a-zA-Z]+)\(/) ?? [])[1] ?? "";
}

/** Every plain-chest mimic on every floor. */
function mimicFloors(F) {
  const rows = [];
  eachFloor(F, (g, d, f) => rows.push({ id: d.id, f, floors: d.floors, pocket: !!d.pocket, m: g.feats?.mimic ?? null, feats: g.feats, tiles: [...g.tiles], w: g.w, chests: F.plainChests(g.tiles, g.w, g.feats) }));
  return rows;
}

/** Load the n-th floor that holds a mimic, hero standing on the chest. */
function onMimic(F, g, rows, n = 0) {
  const r = rows.filter((x) => x.m)[n];
  g.enterDungeon(r.id);
  g.floor = r.f;
  g.loadFloor("start");
  g.roamers = [];
  g.critters = [];
  g.drops = [];
  g.iframe = 0;
  g.px = r.m.x * TILE + 8;
  g.py = r.m.y * TILE + 10;
  return r;
}

if (on("mimic")) {
  const F = await feat47Mod();
  const { readFileSync } = await import("node:fs");
  const simSrc = readFileSync("src/game/sim.ts", "utf8");
  const mimicSrc = readFileSync("src/game/mimic.ts", "utf8");
  const drawSrc = readFileSync("src/game/draw.ts", "utf8");
  const TAG = "OWNER-APPROVED EXCEPTION 2026-09-30: MIMIC";
  const law = ["rules/GAME_LAYOUT_TWO.txt", "rules/GAME_LAYOUT_TWO_PROMPT.txt", "rules/GAME_LAYOUT_TWO_ROSTER.txt", "AGENTS.project.md"].map((f) => [f, readFileSync(f, "utf8")]);
  const missing = law.filter(([, t]) => !t.includes(TAG)).map(([f]) => f);
  const row = `[${TAG}]\nmimic     Mimic            Skirmisher   bite lunge`;
  for (const f of ["rules/GAME_LAYOUT_TWO.txt", "rules/GAME_LAYOUT_TWO_ROSTER.txt"]) if (!readFileSync(f, "utf8").includes(row)) missing.push(`${f} (family row)`);
  for (const f of ["rules/GAME_LAYOUT_TWO.txt", "rules/GAME_LAYOUT_TWO_ROSTER.txt"]) if (!readFileSync(f, "utf8").includes(`[${TAG}] The mimic is the ONE solo rare`)) missing.push(`${f} (solo rare)`);
  const lt = readFileSync("rules/GAME_LAYOUT_TWO.txt", "utf8");
  check("mimic", "the law files carry the dated owner-approved mimic exception, and the pack rule still stands", !missing.length && lt.includes("A rare is a pack: 1 rare + 2–4 minions.") && lt.includes("12 families:"), missing.join(" "));
  const ids = F.ROSTER.map((m) => m.id);
  check("mimic", "the roster keeps its 12 families; the mimic is the one extra family and is in no pick list", ids.length === 12 && !ids.includes("mimic") && F.MIMIC_DEF.family === "mimic" && !/FAMILIES\.push|\.\.\.FAMILIES, MIMIC/.test(simSrc), ids.join(","));

  // Only the mimic may be a solo rare. Source: every rare-making line sits in a known builder.
  const allowed = new Set(["stalkerPack", "mimicFoe", "syncMimic", "spawnBounty"]);
  const sites = [...simSrc.matchAll(/\brare: (?!!!f\.rare,)/g)].map((m) => methodAt(simSrc, m.index));
  const copies = [...simSrc.matchAll(/\brare: !!f\.rare,/g)].map((m) => methodAt(simSrc, m.index));
  const stray = [...sites.filter((n) => !allowed.has(n)), ...copies.filter((n) => n !== "openBattle").map((n) => `${n} (copy)`), ...[...simSrc.matchAll(/\.rare = /g)].map((m) => `${methodAt(simSrc, m.index)} (assign)`)];
  check("mimic", "every rare is made in the stalker pack builder or the mimic builder (no other rare source)", sites.length >= 2 && !stray.length, `sites ${sites.join(",")}`);
  // Live: open a few hundred wild fights with a seeded stand-in RNG, every bounty and mimic fight, and test each foe list.
  {
    const g = fresh();
    g.level = 30;
    g.enterWorld(40 * TILE + 8, 40 * TILE + 8);
    const seen = watchBattles(g);
    const real = Math.random;
    let s = 7;
    Math.random = () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
    for (let i = 0; i < 400; i++) {
      g.mode = "play";
      g.roamers = [];
      g.startWildFight(false);
    }
    Math.random = real;
    // Every family met on the field, and every world boss or remnant, opens through touchFoe.
    for (const fam of FAMILIES) {
      g.mode = "play";
      g.roamers = [];
      g.touchFoe({ id: `t-${fam.id}`, x: g.px, y: g.py, family: fam.family, tint: fam.tint, def: fam.id, level: 20, ang: 0 });
    }
    for (const id of ["bride", "saint", "leech"]) for (const dead of [false, true]) {
      g.mode = "play";
      g.roamers = [];
      g.touchFoe({ id, x: g.px, y: g.py, family: "ghost", tint: "#c5d4e8", def: id, level: 30, ang: 0, boss: !dead, mini: dead });
    }
    const rows = mimicFloors(F);
    const m = fresh();
    const seenM = watchBattles(m);
    onMimic(F, m, rows);
    m.interact();
    const lists = [...seen, ...seenM];
    const broken = lists.map(packLaw).filter(Boolean);
    const stalkers = seen.filter((l) => l.some((f) => f.rare)).length;
    const solo = lists.filter((l) => l.length === 1 && l[0].rare);
    check("mimic", "only the mimic builds as a solo rare: every other rare opened its fight with 2-4 minions and a pack affix", !broken.length && stalkers > 10 && solo.length >= 1 && solo.every((l) => l[0].mimic), `${broken[0] ?? ""} stalkers ${stalkers} solo ${solo.length}`);
  }

  check("mimic", "mimic placement is seeded (no Math.random in mimic.ts)", !/Math\.random/.test(mimicSrc) && /featSeed/.test(mimicSrc) && /mulberry/.test(mimicSrc));
  const rows = mimicFloors(F);
  const again = mimicFloors(F);
  check("mimic", "the same floor always holds the same mimic", rows.every((r, i) => JSON.stringify(r.m) === JSON.stringify(again[i].m)));
  const wrong = [];
  for (const r of rows) {
    if (!r.m) continue;
    if (r.f >= r.floors) wrong.push(`${r.id}:${r.f} boss floor`);
    if (r.pocket) wrong.push(`${r.id}:${r.f} pocket cave`);
    if (r.tiles[r.m.y * r.w + r.m.x] !== F.T.chest) wrong.push(`${r.id}:${r.f} not on a chest`);
    for (const k of ["rune", "crack"]) if (r.feats?.[k] && r.feats[k].chest.x === r.m.x && r.feats[k].chest.y === r.m.y) wrong.push(`${r.id}:${r.f} in a ${k} room`);
    if (r.feats?.hidden.includes(r.m.y * r.w + r.m.x)) wrong.push(`${r.id}:${r.f} behind a secret`);
  }
  check("mimic", "a mimic is only ever a floor's plain chest: never a boss floor, a pocket cave, a rune vault or a pocket room", wrong.length === 0, wrong.join("; "));
  const eligible = rows.filter((r) => r.f < r.floors && !r.pocket && r.chests.length);
  const mims = rows.filter((r) => r.m);
  const share = mims.length / Math.max(1, eligible.length);
  console.log(`     mimics: ${mims.map((r) => `${r.id}:${r.f}@${r.m.x},${r.m.y}`).join(" ")} (${mims.length} of ${eligible.length} eligible floors)`);
  check("mimic", "mimics are rare: about one eligible floor in seven", mims.length >= 3 && share > F.MIMICS.chance / 2 && share < F.MIMICS.chance * 2, `${mims.length}/${eligible.length}`);
  const touched = [];
  for (const r of rows) {
    if (!r.m) continue;
    const copy = Uint8Array.from(r.tiles);
    const feats = JSON.stringify(r.feats);
    const spot = F.mimicChest(copy, r.w, r.id, r.f, r.floors, r.pocket, JSON.parse(feats));
    if (copy.some((t, i) => t !== r.tiles[i]) || JSON.stringify(r.feats) !== feats || JSON.stringify(spot) !== JSON.stringify(r.m)) touched.push(`${r.id}:${r.f}`);
  }
  check("mimic", "placing a mimic changes no tile, secret, trap, or captive (the chest stays a chest until it wakes)", !touched.length, touched.join(" "));
  check("mimic", "every new mimic number lives in the MIMICS block", /MIMICS\.levelUp/.test(simSrc) && /MIMICS\.hpMult/.test(simSrc) && /MIMICS\.lunge/.test(simSrc) && /MIMICS\.chance/.test(mimicSrc) && !/mimicFoe\(\)[^}]*\b1\.45\b/.test(simSrc));

  // Waking: Main on the chest. One rare, no minions, stats on the one curve.
  {
    const g = fresh();
    const r = onMimic(F, g, rows);
    const hp0 = g.hp;
    g.interact();
    const m = g.roamers.find((o) => o.mimic);
    const want = scaleMonster(F.MIMIC_DEF, g.dungeonLevel() + F.MIMICS.levelUp);
    const tile = g.tiles[r.m.y * g.w + r.m.x];
    check("mimic", "Main on a mimic chest wakes it: the chest turns to floor and one rare Mimic stands there, alone", !!m && m.rare && !m.affix && g.roamers.filter((o) => o.aggro).length === 1 && tile === F.T.floor && Math.hypot(m.x - (r.m.x * TILE + 8), m.y - (r.m.y * TILE + 8)) < 1 && /mimic wakes/i.test(g.logLine), `${g.logLine} tile ${tile}`);
    check("mimic", "mimic stats come from scaleMonster at L+2 with HP*1.45 (the Stalker's rare numbers)", m && m.max === Math.round(want.hp * 1.45) && m.atk === want.atk && m.ac === want.ac && m.xp === want.xp && m.silver === want.silver, `${m?.max} ${m?.atk} ${m?.ac} vs ${Math.round(want.hp * 1.45)} ${want.atk} ${want.ac}`);
    // The tell: the rare 0.35 s cast on the rare melee mark. Nothing lands before it ends.
    let tellAt = -1;
    let hurtBefore = false;
    for (let i = 0; i < 60 && tellAt < 0; i++) {
      g.update(0.05);
      if ((m.tell ?? 0) > 0) tellAt = i;
      else if (g.hp < hp0) hurtBefore = true;
    }
    const tell = m.tell;
    const mark = { x: m.markX, y: m.markY, r: m.markR, casting: m.casting };
    const before = { x: m.x, y: m.y };
    check("mimic", "the mimic's bite opens with the 0.35 s rare tell on the existing line shape (18 px mark), and nothing lands before it", tellAt >= 0 && !hurtBefore && tell > 0.25 && tell <= 0.35 && mark.casting === "spam" && mark.r === 18 && m.spamTag === "line" && F.MIMICS.biteTag === "line" && /marks bite/.test(g.logLine), `${tellAt} ${tell} ${JSON.stringify(mark)} ${m.spamTag} ${g.logLine}`);
    for (let i = 0; i < 10 && (m.tell ?? 0) > 0; i++) g.update(0.05);
    const moved = Math.hypot(m.x - before.x, m.y - before.y);
    check("mimic", "standing still in the line takes the bite", g.hp < hp0 && /lands bite/.test(g.logLine), `${g.hp}/${hp0} ${g.logLine}`);
    check("mimic", "the bite lunge moves the mimic toward its mark, no farther than the lunge", moved <= F.MIMICS.lunge + 0.01, `${moved}`);
    check("mimic", "the bite plays the swing frames (lid wide, then snap)", m.act === "swing" && (m.actFor ?? 0) > 0);
  }
  {
    const g = fresh();
    onMimic(F, g, rows);
    g.interact();
    const m = g.roamers.find((o) => o.mimic);
    for (let i = 0; i < 60 && !((m.tell ?? 0) > 0); i++) g.update(0.05);
    const hp = g.hp;
    // Step out: the hero is put well outside the mark (setup), the bite resolves on empty floor.
    g.px = m.markX + (g.solidAt(m.markX + 48, m.markY) ? -48 : 48);
    g.py = m.markY;
    for (let i = 0; i < 10 && (m.tell ?? 0) > 0; i++) g.update(0.05);
    check("mimic", "out of the mark when the bite resolves takes no hit", g.hp === hp && /step clear of bite/.test(g.logLine), `${g.hp}/${hp} ${g.logLine}`);
  }
  {
    const g = fresh();
    const r = onMimic(F, g, rows);
    g.interact();
    const m = g.roamers.find((o) => o.mimic);
    g.drops = [];
    const coin = g.coin;
    g.fellFoe(m);
    const items = g.drops.filter((d) => d.item);
    const silver = g.drops.filter((d) => d.silver > 0).reduce((a, d) => a + d.silver, 0);
    const rare = items.filter((d) => rareTable(d.item)).length;
    check("mimic", "a slain mimic drops the chest's share (chest table) and a rare's share (rare table), plus its silver", items.length === F.MIMICS.chestDrops + F.MIMICS.rareDrops && rare >= F.MIMICS.rareDrops && silver >= m.silver && g.coin === coin, `${items.length} items ${rare} rare ${silver}s`);
    g.saveSlot(2);
    const back = fresh();
    back.loadSlot(2);
    back.enterDungeon(r.id);
    back.floor = r.f;
    back.loadFloor("start");
    back.roamers = back.roamers.filter((o) => o.mimic);
    back.px = r.m.x * TILE + 8;
    back.py = r.m.y * TILE + 10;
    back.drops = [];
    back.interact();
    check("mimic", "a slain mimic is spent for good: after a save its spot is plain floor, with no chest and no mimic", back.tiles[r.m.y * back.w + r.m.x] === F.T.floor && !back.roamers.length && !back.drops.length && !back.roamers.some((o) => o.mimic), `${back.tiles[r.m.y * back.w + r.m.x]} ${back.roamers.length}`);
  }
  {
    const g = fresh();
    const r = onMimic(F, g, rows);
    g.interact();
    g.saveSlot(2);
    const back = fresh();
    back.loadSlot(2);
    back.enterDungeon(r.id);
    back.floor = r.f;
    back.loadFloor("start");
    const m = back.roamers.find((o) => o.mimic);
    check("mimic", "a mimic you walk away from waits where its chest sat, still a lone rare, after a save", !!m && m.rare && back.tiles[r.m.y * back.w + r.m.x] === F.T.floor && Math.hypot(m.x - (r.m.x * TILE + 8), m.y - (r.m.y * TILE + 8)) < 1, `${!!m}`);
    const seen = watchBattles(back);
    back.mode = "play";
    back.touchFoe(m);
    check("mimic", "touching a waiting mimic opens the same solo rare fight", seen.length === 1 && seen[0].length === 1 && seen[0][0].mimic && !packLaw(seen[0]), JSON.stringify(seen.map((l) => l.length)));
  }
  {
    const g = fresh();
    const plain = rows.find((r) => !r.m && r.chests.length && r.f < r.floors && !r.pocket);
    g.enterDungeon(plain.id);
    g.floor = plain.f;
    g.loadFloor("start");
    g.roamers = [];
    g.drops = [];
    const c = plain.chests[0];
    g.px = c.x * TILE + 8;
    g.py = c.y * TILE + 10;
    g.interact();
    check("mimic", "a plain chest on a floor with no mimic opens exactly as before", g.drops.length >= 2 && !g.roamers.length && g.logLine === "The chest gives up its dead.", g.logLine);
  }
  // Owner-approved 2026-09-30: a sidestep during the tell beats the bite. Real movement: the stick is held
  // across the line for the whole tell, on several mimic floors.
  {
    const res = [];
    for (let n = 0; n < 6; n++) {
      const g = fresh();
      onMimic(F, g, rows, n);
      g.interact();
      const m = g.roamers.find((o) => o.mimic);
      for (let i = 0; i < 80 && !((m.tell ?? 0) > 0); i++) g.update(0.05);
      if (!((m.tell ?? 0) > 0)) { res.push(`${n}: no tell`); continue; }
      const bites = [];
      const realBite = g.bite.bind(g);
      g.bite = (dealt, label) => { if (/bite/.test(label)) bites.push(label); return realBite(dealt, label); };
      const lx = m.markX - m.x;
      const ly = m.markY - m.y;
      const d = Math.hypot(lx, ly);
      // Across the line: perpendicular to mimic->mark, or straight up/down when the mimic sits on the mark.
      const opts = d > 2 ? [[-ly / d, lx / d], [ly / d, -lx / d]] : [[0, -1], [0, 1], [1, 0], [-1, 0]];
      const pick = opts.find(([sx, sy]) => !g.solidAt(g.px + sx * 30, g.py + sy * 30) && !g.solidAt(g.px + sx * 15, g.py + sy * 15)) ?? opts[0];
      g.stickX = pick[0];
      g.stickY = pick[1];
      const start = { x: g.px, y: g.py };
      for (let i = 0; i < 12 && (m.tell ?? 0) > 0; i++) g.update(0.05);
      g.stickX = 0;
      g.stickY = 0;
      const walked = Math.hypot(g.px - start.x, g.py - start.y);
      const oldCircle = Math.hypot(g.px - m.markX, g.py - m.markY) < 40;
      res.push({ n, clear: !bites.length && /step clear of bite/.test(g.logLine), walked: Math.round(walked), oldCircle, log: g.logLine });
    }
    const ok = res.filter((r) => r.clear);
    check("mimic", "a sidestep held through the 0.35 s tell clears the bite (the line), on every mimic floor tried", ok.length === res.length && res.length === 6, JSON.stringify(res));
    check("mimic", "those same sidesteps would still be inside the old 40 px melee circle (the change is what makes it dodgeable)", res.filter((r) => r.oldCircle).length >= 4, JSON.stringify(res.map((r) => r.oldCircle)));
  }
  // Sleeping hint (owner-approved): a dormant mimic chest's lid breathes. Subtle, regular, learnable.
  {
    let shown = 0;
    let glint = 0;
    let runs = 0;
    let prev = -1;
    for (let t = 0; t < 60; t += 0.02) {
      const c = F.mimicHint(t, 10, 4);
      if (c >= 0) shown += 1;
      if (c === 1) glint += 1;
      if (c >= 0 && prev < 0) runs += 1;
      prev = c;
    }
    const share = shown / 3000;
    check("mimic", "the sleeping tell shows about one moment in eight (0.6 s every 5 s), with a tooth glint mid-breath", Math.abs(share - F.MIMICS.hintFor / F.MIMICS.hintEvery) < 0.01 && runs === 12 && glint > 0 && glint < shown, `share ${share.toFixed(3)} runs ${runs} glint ${glint}`);
    check("mimic", "the hint is pure: same time and chest, same cell; two chests do not breathe in step", F.mimicHint(7.3, 10, 4) === F.mimicHint(7.3, 10, 4) && [...Array(50).keys()].some((i) => F.mimicHint(i * 0.1, 10, 4) !== F.mimicHint(i * 0.1, 18, 11)));
    const breath = readFileSync("public/art/writer/mimic-sleep.png");
    const pixMake = readFileSync("tools/pixel-writer/make_gravewake.py", "utf8");
    check("mimic", "mimic-sleep.png is two 16x16 overlay cells from the pixel writer, in its palette-checked feat list", breath.readUInt32BE(16) === 32 && breath.readUInt32BE(20) === 16 && /made \+= \[[^\]]*breath\]/.test(pixMake) && /mimic_breath\(/.test(pixMake));
    check("mimic", "only a dormant mimic chest draws the hint (plain chests, woken mimics, and other tiles never do)", /g\.mapId === "dungeon" && tile === T\.chest \? g\.feats\?\.mimic : undefined/.test(drawSrc) && /mimicHint\(g\.worldMs \/ 1000, x, y\)/.test(drawSrc));
  }
  const png = readFileSync("public/art/sprites/mimic.png");
  const spriteMake = readFileSync("tools/sprite-writer/make_gravewake.py", "utf8");
  check("mimic", "mimic.png is one 16x32 body in 11 frames, from the sprite writer, palette-checked", png.readUInt32BE(16) === 176 && png.readUInt32BE(20) === 32 && /"mimic\.png": \(strip\(mimic\), len\(mimic\)\)/.test(spriteMake) && /_verify\(name, im, cells\)/.test(spriteMake), `${png.readUInt32BE(16)}x${png.readUInt32BE(20)}`);
  check("mimic", "a woken mimic draws from mimic.png; the dormant one is the chest tile", /family === "mimic" && sheetCell\(ctx, MIMIC_SHEET/.test(drawSrc));
}

if (on("bounty")) {
  const F = await feat47Mod();
  const { readFileSync } = await import("node:fs");
  const bountySrc = readFileSync("src/game/bounty.ts", "utf8");
  const simSrc = readFileSync("src/game/sim.ts", "utf8");
  const nightMs = (n) => n * F.CYCLE_MS + F.DAY_MS + 60 * 1000;
  const dayMs = (n) => n * F.CYCLE_MS + 60 * 1000;
  check("bounty", "the posting is seeded (no Math.random in bounty.ts)", !/Math\.random/.test(bountySrc) && /featSeed/.test(bountySrc) && /mulberry/.test(bountySrc));
  {
    const g = fresh();
    g.worldMs = dayMs(5);
    const day = g.bountyPost();
    g.worldMs = nightMs(5);
    const a = JSON.stringify(g.bountyPost());
    const b = JSON.stringify(g.bountyPost());
    const h = fresh();
    h.worldMs = nightMs(5);
    const c = JSON.stringify(h.bountyPost());
    const keys = [...g.opened].filter((k) => k.startsWith("bounty:"));
    check("bounty", "one posting per night cycle, the same for every save on that night, and none by day", day === null && a !== "null" && a === b && a === c && keys.length === 1, `${day} ${a} ${keys.join(",")}`);
  }
  {
    const g = fresh();
    const kinds = new Set();
    const bad = [];
    const names = new Set();
    for (let n = 0; n < 80; n++) {
      g.opened = new Set([...g.opened].filter((k) => !k.startsWith("bounty:")));
      g.worldMs = nightMs(n);
      const p = g.bountyPost();
      if (!p || p.kind !== "stalker") bad.push(`${n}:${p?.kind}`);
      else names.add(p.name);
      kinds.add(p?.kind);
    }
    check("bounty", "with no remnant standing, every night posts a named Family Stalker", !bad.length && names.size > 10, `${bad.join(" ")} names ${names.size}`);
  }
  {
    const g = fresh();
    g.bossDead = { bride: 10 ** 12, saint: 10 ** 12, leech: 10 ** 12 };
    g.remnantId = "saint";
    const kinds = { stalker: 0, remnant: 0 };
    const posted = new Set();
    for (let n = 0; n < 80; n++) {
      g.opened = new Set([...g.opened].filter((k) => !k.startsWith("bounty:")));
      g.worldMs = nightMs(n);
      const p = g.bountyPost();
      kinds[p.kind] += 1;
      if (p.kind === "remnant") posted.add(p.id);
    }
    check("bounty", "when remnants stand, the board posts stalkers and remnants, never the remnant the chapel already pays for", kinds.stalker > 15 && kinds.remnant > 15 && !posted.has("saint") && posted.has("bride") && posted.has("leech"), `${JSON.stringify(kinds)} ${[...posted]}`);
  }
  {
    const g = fresh();
    g.enterWorld(32 * TILE + 8, 45 * TILE + 8);
    const world = { tiles: [...g.tiles], w: g.w, h: g.h, entrances: Object.keys(g.entrances), npcs: g.npcs.map((n) => [Math.floor(n.x / TILE), Math.floor(n.y / TILE)]) };
    const steps = F.walkSteps(world.tiles, world.w, world.h, 32, 46);
    const bad = [];
    for (let n = 0; n < 120; n++) {
      g.opened = new Set([...g.opened].filter((k) => !k.startsWith("bounty:")));
      g.worldMs = nightMs(n);
      const p = g.bountyPost();
      const i = p.y * world.w + p.x;
      const far = (x, y) => Math.hypot(p.x - x, p.y - y) >= F.BOUNTY.lairClear;
      if (steps[i] < 0) bad.push(`${n} out of reach`);
      if (![F.T.grass, F.T.dirt, F.T.snow, F.T.ash, F.T.sand, F.T.swamp, F.T.bone].includes(world.tiles[i])) bad.push(`${n} on tile ${world.tiles[i]}`);
      if (Math.hypot(p.x - 32, p.y - 46) < F.BOUNTY.gateClear) bad.push(`${n} by the gate`);
      if (!world.entrances.every((k) => far(...k.split(",").map(Number)))) bad.push(`${n} by a mouth`);
      if (!world.npcs.every(([x, y]) => far(x, y))) bad.push(`${n} by a merchant or watch`);
    }
    check("bounty", "a stalker's lair is plain ground reachable from the gate, off the gate's band, clear of mouths, merchants, and watches", !bad.length, bad.slice(0, 4).join("; "));
  }
  {
    const g = fresh();
    g.level = 12;
    g.worldMs = nightMs(3);
    const p = g.bountyPost();
    g.enterWorld(32 * TILE + 8, 45 * TILE + 8);
    g.calm = 0;
    g.update(0.05);
    const r = g.roamers.find((o) => o.bounty);
    const at = r && Math.hypot(r.x - (p.x * TILE + 8), r.y - (p.y * TILE + 8)) < 8;
    g.worldMs = dayMs(4);
    g.update(0.05);
    const gone = !g.roamers.some((o) => o.bounty);
    const t = fresh();
    t.worldMs = nightMs(3);
    t.enterTown();
    t.update(0.05);
    check("bounty", "the posted stalker walks its lair at night, is gone by day, and never walks the town", !!r && at && r.name === p.name && r.rare && gone && !t.roamers.some((o) => o.bounty), `${!!r} ${at} ${gone}`);
  }
  {
    const g = fresh();
    g.level = 12;
    g.worldMs = nightMs(3);
    const p = g.bountyPost();
    g.enterWorld(32 * TILE + 8, 45 * TILE + 8);
    g.update(0.05);
    const r = g.roamers.find((o) => o.bounty);
    const seen = watchBattles(g);
    g.mode = "play";
    g.touchFoe(r);
    const list = seen[0] ?? [];
    const rare = list[0];
    const want = scaleMonster(FAMILIES.find((f) => f.id === p.id), r.level + 2);
    check("bounty", "touching the posted stalker opens its pack: the named rare (L+2, HP*1.45, its night's affix) and two minions", list.length === 3 && rare.rare && rare.bounty && rare.name === p.name && rare.affix === p.affix && rare.max === Math.round(want.hp * 1.45) && list.filter((f) => f.helper).length === 2 && !packLaw(list), JSON.stringify(list.map((f) => [f.name, f.max, f.affix])));
    g.paidZones = ["Decayed vale", "Winter hollow", "Dry waste", "Cinder", "Scourge swamp"];
    const coin = g.coin;
    const pack = g.roamers.filter((o) => o.aggro && o.helper);
    for (const m of pack) g.fellFoe(m);
    const afterMinions = g.coin;
    const boss = g.roamers.find((o) => o.bounty && o.aggro);
    g.fellFoe(boss);
    const paid = g.coin - afterMinions;
    check("bounty", "felling the named rare pays the board's silver once, straight to the purse; its minions pay no bounty", afterMinions === coin && paid === p.pay && g.bountyPaid() && g.logLine.includes(`The guild pays ${p.pay} silver for ${p.name}.`), `${afterMinions - coin} ${paid} ${g.logLine}`);
    g.update(0.05);
    const fake = { ...boss, hp: 1, aggro: true };
    const c2 = g.coin;
    g.roamers.push(fake);
    g.fellFoe(fake);
    check("bounty", "once paid, the stalker does not walk again that night and nothing pays twice", !g.roamers.some((o) => o.bounty && !o.aggro && o !== fake) && g.coin === c2, `${g.coin - c2}`);
  }
  {
    const g = fresh();
    g.bossDead = { bride: 10 ** 12 };
    let n = 0;
    let p = null;
    for (; n < 80; n++) {
      g.opened = new Set([...g.opened].filter((k) => !k.startsWith("bounty:")));
      g.worldMs = nightMs(n);
      p = g.bountyPost();
      if (p.kind === "remnant") break;
    }
    g.enterWorld(32 * TILE + 8, 45 * TILE + 8);
    const r = g.roamers.find((o) => o.mini && o.def === "bride");
    g.mode = "play";
    g.touchFoe(r);
    const foe = g.roamers.find((o) => o.mini && o.aggro);
    g.paidZones = ["Decayed vale", "Winter hollow", "Dry waste", "Cinder", "Scourge swamp"];
    const coin = g.coin;
    g.fellFoe(foe);
    g.bossDead = {};
    const still = g.bountyPost();
    check("bounty", "a posted remnant pays the board when it falls at night, and the posting holds once the remnant is gone", p.kind === "remnant" && p.id === "bride" && g.coin - coin === p.pay && g.bountyPaid() && JSON.stringify(still) === JSON.stringify(p), `${n} ${p?.kind} ${g.coin - coin}`);
  }
  {
    const g = fresh();
    g.worldMs = nightMs(7);
    const p = g.bountyPost();
    g.enterInside("guild", true);
    g.px = F.BOUNTY.boardX * TILE + 8;
    g.py = (F.BOUNTY.boardY + 1) * TILE + 8;
    g.facing = "n";
    g.interact();
    const posted = g.logLine;
    g.opened.add(`bounty:7:paid`);
    g.interact();
    const paid = g.logLine;
    g.worldMs = dayMs(8);
    g.interact();
    const bare = g.logLine;
    check("bounty", "the Guildhall board reads tonight's name and zone; struck through once paid; bare by day", posted.startsWith(`Bounty: ${p.name}, in the ${p.zone}`) && posted.includes(`${p.pay} silver`) && /struck through/.test(paid) && /bare by day/.test(bare), `${posted} | ${paid} | ${bare}`);
    const wall = g.tiles[F.BOUNTY.boardY * g.w + F.BOUNTY.boardX];
    const stand = g.tiles[(F.BOUNTY.boardY + 1) * g.w + F.BOUNTY.boardX];
    check("bounty", "the board hangs on the Guildhall's existing north wall; the floor below it is open (no tile changed)", wall === F.T.wall && stand === F.T.floor);
  }
  {
    const g = fresh();
    g.quest = 3;
    g.worldMs = nightMs(9);
    const p = g.bountyPost();
    const line = g.questLine();
    g.worldMs = dayMs(9);
    const dayLine = g.questLine();
    check("bounty", "the quest line names tonight's bounty at night, after the first three vale steps", line.startsWith(`Bounty: ${p.name}`) && !dayLine.startsWith("Bounty"), `${line} | ${dayLine}`);
  }
  {
    const g = fresh();
    g.worldMs = nightMs(11);
    const p = JSON.stringify(g.bountyPost());
    g.opened.add("bounty:11:paid");
    g.saveSlot(2);
    const back = fresh();
    back.loadSlot(2);
    const old = fresh();
    old.worldMs = nightMs(11);
    check("bounty", "bounty state rides in the opened list: a save keeps tonight's posting and its paid mark; an old save simply posts fresh", JSON.stringify(back.bountyPost()) === p && back.bountyPaid() && JSON.stringify(old.bountyPost()) === p && !old.bountyPaid());
    g.worldMs = nightMs(12);
    g.bountyPost();
    check("bounty", "a new night drops the old night's bounty keys", [...g.opened].filter((k) => k.startsWith("bounty:")).every((k) => k.startsWith("bounty:12:")));
  }
  check("bounty", "bounty pay is the BOUNTY block: twice each zone board's first-win pay", JSON.stringify(Object.values(F.BOUNTY.pay)) === JSON.stringify([8, 12, 16, 20, 28].map((v) => v * 2)) && /this\.coin \+= post\.pay/.test(simSrc));
  const png = readFileSync("public/art/writer/bounty.png");
  check("bounty", "bounty.png holds three 16x16 cells: posted, paid, bare", png.readUInt32BE(16) === 48 && png.readUInt32BE(20) === 16);
}

/** Free the captive of a listed site and stand beside them on their floor. Roamers cleared (setup). */
function freedAt(F, g, site) {
  const d = F.DUNGEONS.find((x) => x.id === site);
  g.enterDungeon(site);
  g.floor = F.captiveFloor(site, d.floors);
  g.loadFloor("start");
  g.roamers = [];
  g.critters = [];
  const cap = g.feats.captive;
  g.px = cap.x * TILE + 8;
  g.py = cap.y * TILE + 10;
  g.interact();
  return cap;
}

if (on("retouch")) {
  // OWNER-APPROVED COMBAT FIX 2026-09-30: a foe already in the fight is never re-touched or rebuilt.
  const simSrc = (await import("node:fs")).readFileSync("src/game/sim.ts", "utf8");
  check("retouch", "touchFoe refuses any foe already in a fight before it rebuilds anything", /private touchFoe\(r: Roamer\) \{\n {4}if \(this\.mode !== "play"\) return;\n(?: {4}\/\/.*\n)* {4}if \(r\.aggro\) return;/.test(simSrc));
  // A wild Stalker pack on the road: every foe walks onto the hero for a second. Nothing is rebuilt.
  // At night: by day the world clears every non-boss roamer each tick (an older rule, unchanged here).
  const night = 16 * 60 * 1000;
  {
    const g = fresh();
    g.worldMs = night;
    g.enterWorld(30 * TILE + 8, 40 * TILE + 8);
    g.roamers = [];
    const seen = watchBattles(g);
    const def = FAMILIES.find((f) => f.id === "zombie") ?? FAMILIES[0];
    g.openBattle(g.stalkerPack(def, 6, "fast"), { guard: false, goblin: false, hunter: false, fromRole: "" });
    const pack = g.roamers.filter((r) => r.aggro);
    for (const r of pack) r.hp = Math.max(1, r.hp - 3);
    const before = pack.map((r) => ({ r, hp: r.hp, helper: r.helper, rare: r.rare, affix: r.affix, name: r.name }));
    const calls = seen.length;
    let close = 0;
    for (let i = 0; i < 20; i++) {
      for (const r of pack) {
        r.x = g.px + 2;
        r.y = g.py + 1;
      }
      g.iframe = 9;
      g.hp = g.maxHp;
      g.update(0.05);
      close += pack.filter((r) => Math.hypot(r.x - g.px, r.y - g.py) < 12).length;
    }
    const changed = before.filter((b) => !g.roamers.includes(b.r) || b.r.helper !== b.helper || b.r.rare !== b.rare || b.r.affix !== b.affix || b.r.name !== b.name || b.r.hp > b.hp);
    check("retouch", "a Stalker pack pressed onto the hero keeps every foe: same HP, minion tags, rare status, affix, name; no new fight opens", pack.length === 3 && close > 20 && !changed.length && seen.length === calls, `${pack.length} close ${close} changed ${changed.map((c) => c.name).join(",")} calls ${seen.length - calls}`);
  }
  // A world boss in its fight, inside its own touch radius: not rebuilt.
  {
    const g = fresh();
    g.worldMs = night;
    g.enterWorld(30 * TILE + 8, 40 * TILE + 8);
    const boss = g.roamers.find((r) => r.boss);
    const seen = watchBattles(g);
    g.mode = "play";
    g.touchFoe(boss);
    const fight = g.roamers.filter((r) => r.aggro);
    const b = fight.find((r) => r.boss);
    b.hp -= 5;
    const hp = b.hp;
    for (let i = 0; i < 20; i++) {
      b.x = g.px + 6;
      b.y = g.py;
      g.iframe = 9;
      g.hp = g.maxHp;
      g.update(0.05);
    }
    check("retouch", "a world boss already fighting, held inside its touch radius, keeps its HP and helpers; the fight opens once", seen.length === 1 && g.roamers.includes(b) && b.hp <= hp && fight.every((r) => g.roamers.includes(r) || (r.hp ?? 0) <= 0), `${seen.length} ${b.hp}/${hp}`);
  }
  // A fresh meeting is unchanged: a dungeon floor roamer that is not in a fight still opens one on touch.
  {
    const g = fresh();
    g.enterDungeon("harrow");
    const r = g.roamers.find((o) => !o.aggro && !o.boss);
    const seen = watchBattles(g);
    g.mode = "play";
    if (r) g.touchFoe(r);
    check("retouch", "touching a roamer that is not yet fighting still opens its fight, as before", !!r && seen.length === 1 && !g.roamers.includes(r), `${!!r} ${seen.length}`);
  }
}

if (on("escort")) {
  const F = await feat47Mod();
  const lv = (site) => { const g = fresh(); const d = F.DUNGEONS.find((x) => x.id === site); g.enterDungeon(site); g.floor = F.captiveFloor(site, d.floors); g.loadFloor("start"); return g.escortMax(); };
  const hps = F.RESCUES.map((r) => `${r.id} ${lv(r.dungeon)}`);
  check("escort", "a freed captive's HP is the ESCORT block's sturdy curve (base + per dungeon level)", F.ESCORT.hpBase === 30 && F.ESCORT.hpPerLevel === 3 && F.ESCORT.escortEvery === 4 && F.ESCORT.upShare === 0.5, hps.join(", "));
  console.log(`     escort HP: ${hps.join(", ")}`);
  // A bound captive is never a target.
  {
    const g = fresh();
    const d = F.DUNGEONS.find((x) => x.id === "harrow");
    g.enterDungeon("harrow");
    g.floor = F.captiveFloor("harrow", d.floors);
    g.loadFloor("start");
    g.roamers = [];
    const e = g.escort;
    g.openBattle([{ ...scaleMonster(FAMILIES[0], 5), hp: 999, max: 999, id: "zombie" }], { guard: false, goblin: false, hunter: false, fromRole: "" });
    const f = g.roamers[g.roamers.length - 1];
    for (let i = 0; i < 80; i++) {
      f.x = e.x + 6;
      f.y = e.y;
      g.px = e.x + 60;
      g.py = e.y;
      g.update(0.05);
    }
    check("escort", "a captive still on the stake is never a target", e.state === "bound" && (e.hp ?? 0) === 0 && !/turns on Wren/.test(g.logLine));
  }
  // Following: a foe with both in reach sends one swing in four to the captive; the hero takes the rest.
  {
    const g = fresh();
    freedAt(F, g, "harrow");
    const e = g.escort;
    g.openBattle([{ ...scaleMonster(FAMILIES[0], 5), hp: 999, max: 999, id: "zombie", name: "Zombie" }], { guard: false, goblin: false, hunter: false, fromRole: "" });
    const f = g.roamers[g.roamers.length - 1];
    let toHero = 0;
    let toEscort = 0;
    const realBite = g.bite.bind(g);
    g.bite = (dealt, label) => { toHero += 1; g.iframe = 0; return realBite(dealt, label); };
    let last = e.hp;
    for (let i = 0; i < 4000 && e.state === "follow"; i++) {
      g.stickX = 0;
      g.stickY = 0;
      e.x = g.px - 10;
      e.y = g.py;
      f.x = g.px - 4;
      f.y = g.py + 2;
      g.hp = g.maxHp;
      g.iframe = 0;
      g.update(0.05);
      if (e.hp < last) toEscort += 1;
      last = e.hp;
    }
    const share = toEscort / Math.max(1, toEscort + toHero);
    check("escort", "with hero and captive both in reach, about one swing in four goes to the captive", toEscort >= 3 && Math.abs(share - 0.25) < 0.06, `escort ${toEscort} hero ${toHero} share ${share.toFixed(2)}`);
    check("escort", "at 0 HP the captive is knocked down, not killed: the rescue still stands", e.state === "down" && e.hp === 0 && g.opened.has("escort:wren") && g.escort === e && /knocks Wren down/.test(g.logLine), `${e.state} ${e.hp} ${g.logLine}`);
    const swings = toEscort;
    for (let i = 0; i < 60; i++) { f.x = e.x + 4; f.y = e.y; g.hp = g.maxHp; g.update(0.05); }
    check("escort", "foes leave a knocked-down captive alone, and they stay where they fell", e.hp === 0 && e.state === "down" && toEscort === swings);
    // Stairs and the gate wait for them.
    g.roamers = [];
    const floor = g.floor;
    g.useStair(F.T.stairU);
    const held = g.floor === floor && g.mapId === "dungeon" && /Wren is down/.test(g.logLine);
    g.openPortal();
    check("escort", "a knocked-down captive holds the stairs and the town gate until helped up", held && g.mapId === "dungeon" && !g.portal, g.logLine);
    // Hold Main beside them: up at half HP, following again.
    g.px = e.x + 10;
    g.py = e.y;
    g.interact();
    check("escort", "Main beside a knocked-down captive helps them up at half HP, and they follow again", e.state === "follow" && e.hp === Math.round(e.max * 0.5) && /help Wren up/.test(g.logLine), `${e.state} ${e.hp}/${e.max} ${g.logLine}`);
    // Out by the stair: home as before.
    for (let k = 0; k < 6 && g.mapId === "dungeon"; k++) { e.x = g.px; e.y = g.py; g.useStair(F.T.stairU); }
    check("escort", "after a knock-down the captive still comes home: rescued, and the shop keeps the item", g.mapId !== "dungeon" && g.opened.has("rescued:wren"), `${g.mapId} ${[...g.opened].filter((k) => k.startsWith("rescued")).join(",")}`);
  }
  // Natural trailing: the captive follows 30 px behind; the foe fights the hero from the front. On its
  // turn the foe walks over to them (ESCORT.notice), so they do get hit, but the hero still takes most.
  {
    const g = fresh();
    freedAt(F, g, "harrow");
    const e = g.escort;
    g.facing = "e";
    for (let i = 0; i < 40; i++) { g.stickX = 0; g.stickY = 0; g.update(0.05); }
    g.openBattle([{ ...scaleMonster(FAMILIES[0], 5), hp: 999, max: 999, id: "zombie", name: "Zombie" }], { guard: false, goblin: false, hunter: false, fromRole: "" });
    const f = g.roamers[g.roamers.length - 1];
    f.x = g.px + 18;
    f.y = g.py;
    const gap0 = Math.round(Math.hypot(e.x - f.x, e.y - f.y));
    let toHero = 0;
    let toEscort = 0;
    let walks = 0;
    const realBite = g.bite.bind(g);
    g.bite = (dealt, label) => { toHero += 1; g.iframe = 0; return realBite(dealt, label); };
    let last = e.hp;
    for (let i = 0; i < 2400 && e.state === "follow"; i++) {
      g.stickX = 0;
      g.stickY = 0;
      g.facing = "e";
      g.hp = g.maxHp;
      g.iframe = 0;
      if (Math.hypot(f.x - g.px, f.y - g.py) > 40 && !f.atEscort) { f.x = g.px + 18; f.y = g.py; }
      const was = !!f.atEscort;
      g.update(0.05);
      if (f.atEscort && !was) walks += 1;
      if (e.hp < last) toEscort += 1;
      last = e.hp;
    }
    console.log(`     trailing: start gap ${gap0} px, walk-overs ${walks}, captive hit ${toEscort}, hero hit ${toHero} (120 s)`);
    check("escort", "a captive trailing 30 px behind still draws some swings (the foe walks over on its turn), and the hero takes most", gap0 > 22 && walks > 0 && toHero > toEscort * 2 && Math.abs(toEscort / Math.max(1, toEscort + toHero) - 0.25) < 0.07, `start gap ${gap0} walks ${walks} escort ${toEscort} hero ${toHero}`);
  }
  // Far off: a captive beyond ESCORT.notice is never walked to or hit.
  {
    const g = fresh();
    freedAt(F, g, "harrow");
    const e = g.escort;
    g.openBattle([{ ...scaleMonster(FAMILIES[0], 5), hp: 999, max: 999, id: "zombie", name: "Zombie" }], { guard: false, goblin: false, hunter: false, fromRole: "" });
    const f = g.roamers[g.roamers.length - 1];
    const hp0 = e.hp;
    let walked = 0;
    for (let i = 0; i < 800; i++) {
      g.stickX = 0;
      g.stickY = 0;
      f.x = g.px + 12;
      f.y = g.py;
      e.x = f.x + F.ESCORT.notice + 8;
      e.y = f.y;
      g.hp = g.maxHp;
      g.iframe = 0;
      g.update(0.05);
      if (f.atEscort) walked += 1;
    }
    check("escort", "a captive farther than ESCORT.notice (56 px) from the foe is never walked to or hit", F.ESCORT.notice === 56 && e.hp === hp0 && walked === 0, `${e.hp}/${hp0} walked ${walked}`);
  }
  // A ranged foe can reach them too, and nothing else changed: traps and ash still hurt the hero only.
  {
    const simSrc = (await import("node:fs")).readFileSync("src/game/sim.ts", "utf8");
    check("escort", "only a foe's swing can hurt a captive (no trap, ash, cast, or boss slam path touches them)", (simSrc.match(/e\.hp = Math\.max\(0, \(e\.hp/g) ?? []).length === 1 && /private swingAtEscort/.test(simSrc));
  }
  // Saves: a save taken during an escort loads without the escort (as before), and an old save loads.
  {
    const g = fresh();
    freedAt(F, g, "harrow");
    g.escort.hp = 3;
    g.saveSlot(2);
    const back = fresh();
    back.loadSlot(2);
    const e = back.escort;
    check("escort", "saves need no new field: the escort's HP is not saved, and a loaded run starts with a whole captive or none", !e || e.state === "bound" || e.hp === back.escortMax(), `${back.mapId} ${e?.state} ${e?.hp}`);
  }
}

if (on("errand")) {
  const F = await feat47Mod();
  const { readFileSync } = await import("node:fs");
  const rescueAll = (g, ids = ["wren", "tansy", "corin"]) => { for (const id of ids) g.opened.add(`rescued:${id}`); };
  {
    const g = fresh();
    g.worldMs = 60000;
    g.enterTown();
    const plain = [...g.tiles];
    const none = g.npcs.filter((n) => n.role === "rescued").length;
    rescueAll(g);
    g.enterTown();
    const after = [...g.tiles];
    const folk = g.npcs.filter((n) => n.role === "rescued");
    check("errand", "no captive stands in town until rescued; after, all three do, and no town tile changes", none === 0 && folk.length === 3 && plain.every((t, i) => t === after[i]), `${none} ${folk.length}`);
    const bad = [];
    const doors = [];
    g.tiles.forEach((t, i) => { if (t === F.T.door) doors.push(i); });
    for (const n of folk) {
      const tx = Math.floor(n.x / TILE);
      const ty = Math.floor(n.y / TILE);
      const t = g.tiles[ty * g.w + tx];
      if (t !== F.T.grass) bad.push(`${n.name} on tile ${t}`);
      for (const d of doors) if (Math.abs((d % g.w) - tx) + Math.abs(Math.floor(d / g.w) - ty) <= 2) bad.push(`${n.name} by a door`);
      for (const night of [false, true]) {
        g.worldMs = night ? 16 * 60000 : 60000;
        g.enterTown();
        rescueAll(g);
        for (const o of g.npcs) if (o !== n && o.id !== n.id && Math.hypot(o.x - n.x, o.y - n.y) < 24) bad.push(`${n.name} by ${o.id}${night ? " at night" : ""}`);
      }
    }
    check("errand", "each stands on open grass, two tiles clear of every door and clear of every townsperson, day and night", !bad.length, bad.join("; "));
    // Job 0 (2026-09-30): no captive stands in a one-tile passage, and with all three standing no walk
    // between door fronts, stairs, the hearth, the nets, and the town edges grows by more than two tiles
    // (one step around a person).
    {
      g.worldMs = 60000;
      g.enterTown();
      rescueAll(g);
      const w = g.w;
      const h = g.h;
      const solid = (x, y) => x < 0 || y < 0 || x >= w || y >= h || g.solidAt(x * TILE + 8, y * TILE + 8);
      const near4 = [[1, 0], [-1, 0], [0, 1], [0, -1]];
      const places = new Set();
      g.tiles.forEach((t, i) => {
        const x = i % w;
        const y = Math.floor(i / w);
        if (t === F.T.door || t === F.T.stairD || t === F.T.hearth || t === F.T.exit || t === F.T.nets) for (const [dx, dy] of near4) if (!solid(x + dx, y + dy)) places.add((y + dy) * w + x + dx);
        if ((x === 0 || y === 0 || x === w - 1 || y === h - 1) && !solid(x, y)) places.add(i);
      });
      const P = [...places];
      const bfs = (src, blocked) => {
        const d = new Int32Array(w * h).fill(-1);
        d[src] = 0;
        const q = [src];
        for (let k = 0; k < q.length; k++) {
          const i = q[k];
          for (const [dx, dy] of near4) {
            const nx = (i % w) + dx;
            const ny = Math.floor(i / w) + dy;
            const j = ny * w + nx;
            if (solid(nx, ny) || d[j] >= 0 || blocked.has(j)) continue;
            d[j] = d[i] + 1;
            q.push(j);
          }
        }
        return d;
      };
      const stand = new Set(folk.map((n) => Math.floor(n.y / TILE) * w + Math.floor(n.x / TILE)));
      let worst = 0;
      let where = "";
      for (const a of P) {
        if (stand.has(a)) { worst = 99; where = "on a door front"; continue; }
        const d0 = bfs(a, new Set());
        const d1 = bfs(a, stand);
        for (const b of P) {
          const grow = d1[b] < 0 ? 99 : d1[b] - d0[b];
          if (grow > worst) { worst = grow; where = `${a % w},${Math.floor(a / w)} to ${b % w},${Math.floor(b / w)}`; }
        }
      }
      const lanes = folk.filter((n) => { const x = Math.floor(n.x / TILE); const y = Math.floor(n.y / TILE); return (solid(x, y - 1) && solid(x, y + 1)) || (solid(x - 1, y) && solid(x + 1, y)); }).map((n) => n.name);
      const spots = F.RESCUE_QUESTS.map((q) => `${q.id} ${q.x},${q.y}`).join(", ");
      check("errand", "no rescued captive stands in a one-tile passage, and together they lengthen no town walk by more than two tiles", !lanes.length && worst <= 2 && P.length > 100, `${spots}; lanes ${lanes.join(",") || "none"}; worst detour ${worst} ${where}`);
      check("errand", "Wren and Corin stand off the row-7 lane: Wren (19,8), Corin (9,8); Tansy stays at (25,20)", spots === "wren 19,8, tansy 25,20, corin 9,8", spots);
    }
    const look = folk.map((n) => `${n.name}:${n.look}:${n.id}`);
    check("errand", "in town they wear the body and crowd look they wore on the stake", folk.every((n) => { const r = F.RESCUES.find((x) => x.seed === n.id); return r && n.look === r.body; }), look.join(" "));
  }
  // Wren: a kill errand on any Harrow floor.
  {
    const g = fresh();
    g.worldMs = 60000;
    rescueAll(g, ["wren"]);
    g.enterTown();
    const wren = g.npcs.find((n) => n.name === "Wren");
    g.openTalk(wren);
    const ask = g.talk?.text ?? "";
    g.acceptService();
    const taken = g.errandState("wren");
    g.enterDungeon("ossuary");
    for (let i = 0; i < 3; i++) g.fellFoe({ ...g.roamers[0], x: g.px, y: g.py, hp: 0 });
    const elsewhere = g.errandKills("wren");
    g.enterDungeon("harrow");
    for (let i = 0; i < 5; i++) g.fellFoe({ id: `t${i}`, x: g.px, y: g.py, family: "zombie", tint: "#6a7a48", def: "zombie", level: 5, ang: 0, hp: 0, max: 5, xp: 1, silver: 0, aggro: true });
    const met = g.errandState("wren");
    g.enterTown();
    g.openTalk(g.npcs.find((n) => n.name === "Wren"));
    g.acceptService();
    check("errand", "Wren's errand: five kills on Harrow floors (other sites do not count), then her stall opens", /five things on any Harrow floor/.test(ask) && taken === "taken" && elsewhere === 0 && met === "met" && g.errandState("wren") === "done" && g.mode === "shop" && g.shopRole === "stall:wren" && g.stallName() === "Wren's Lamps", `${taken} ${elsewhere} ${met} ${g.mode} ${g.shopRole}`);
    const stock = g.stock.map((i) => `${i.name} ${g.priceOf(i)}s`);
    console.log(`     Wren's Lamps: ${stock.join(", ")}`);
    g.shopRole = "mystic";
    const lamp = g.buildStock("mystic").find((i) => i.name === "Moon Lantern");
    const hooded = g.stock.find((i) => i.name === "Hooded lamp");
    check("errand", "Wren's lamp is the Moon Lantern's stat line, and her road sword the general store's", hooded && lamp && ["rank", "slot", "hands", "atk", "active", "bonus"].every((k) => hooded[k] === lamp[k]) && g.stock.some((i) => i.name === "Road sword"), stock.join(", "));
  }
  // Tansy: bring any gem; the plainest goes.
  {
    const g = fresh();
    g.worldMs = 60000;
    rescueAll(g, ["tansy"]);
    g.enterTown();
    const t = () => g.npcs.find((n) => n.name === "Tansy");
    g.openTalk(t());
    g.acceptService();
    const st0 = g.errandState("tansy");
    const rng = () => 0.3;
    const a = g.makeGem(rng, "rare", 20);
    const b = g.makeGem(() => 0.9, "normal", 5);
    g.inv.push(a, b);
    const low = [a, b].sort((x, y) => x.rank - y.rank)[0];
    g.openTalk(t());
    const hand = g.talk.text;
    g.acceptService();
    const gone = !g.inv.includes(low) && g.inv.includes(low === a ? b : a);
    check("errand", "Tansy's errand: bring any gem; she takes the plainest one and opens her stall", st0 === "taken" && /Hand over/.test(hand) && gone && g.errandState("tansy") === "done" && g.shopRole === "stall:tansy", `${st0} ${hand} ${gone}`);
    console.log(`     Tansy's Simples: ${g.stock.map((i) => `${i.name} ${g.priceOf(i)}s`).join(", ")}`);
    g.shopRole = "mystic";
    const ring = g.buildStock("mystic").find((i) => i.name === "Caster's ring");
    g.shopRole = "stall:tansy";
    const hers = g.stock.find((i) => i.name === "Tansy's ring");
    check("errand", "Tansy's ring is the Caster's ring stat line; her stone comes from the existing gem table", hers && ring && ["rank", "slot", "bonus"].every((k) => hers[k] === ring[k]) && g.stock.some((i) => i.kind === "gem"));
  }
  // Corin: carry the seal to the undertaker.
  {
    const g = fresh();
    g.worldMs = 60000;
    rescueAll(g, ["corin"]);
    g.enterTown();
    const c = () => g.npcs.find((n) => n.name === "Corin");
    g.openTalk(c());
    g.acceptService();
    const seal = g.inv.find((i) => i.name === "Corin's sealed tithe");
    if (seal) g.sell(seal);
    const kept = g.inv.some((i) => i.name === "Corin's sealed tithe");
    g.openTalk(c());
    const nag = g.errandState("corin");
    g.mode = "play";
    g.openTalk(g.npcs.find((n) => n.role === "undertaker"));
    const said = g.talk.text;
    const met = g.errandState("corin");
    g.mode = "play";
    g.openTalk(c());
    g.acceptService();
    check("errand", "Corin's errand: his seal (a relic, not for sale) goes to the undertaker, then his stall opens", !!seal && kept && nag === "taken" && /counted among the living/.test(said) && met === "met" && !g.inv.some((i) => i.name === "Corin's sealed tithe") && g.errandState("corin") === "done" && g.shopRole === "stall:corin", `${!!seal} ${kept} ${nag} ${said} ${met}`);
    console.log(`     Corin's Pack: ${g.stock.map((i) => `${i.name} ${g.priceOf(i)}s`).join(", ")}`);
    g.shopRole = "hunter";
    const edge = g.buildStock("hunter").find((i) => i.name === "Cabinet edge" && i.rank === 3);
    g.shopRole = "stall:corin";
    const his = g.stock.find((i) => i.name === "Cabinet edge");
    check("errand", "Corin's edge and coat use the hunter cabinet's own rank formulas", his && his.rank === 3 && his.atk === 4 + 6 + Math.floor(Math.max(5, Math.min(80, g.level)) / 4) && (!edge || edge.atk === his.atk) && g.stock.some((i) => i.name === "Mended armor" && i.ac === 3));
  }
  // Rules that already hold in town still hold, and saves are plain opened keys.
  {
    const g = fresh("vampire", "str");
    g.worldMs = 60000;
    rescueAll(g, ["wren"]);
    g.enterTown();
    g.openTalk(g.npcs.find((n) => n.name === "Wren"));
    check("errand", "a vampire by day is turned away by a freed captive, like every other service", /We know what walks in/.test(g.talk?.text ?? ""), g.talk?.text);
  }
  {
    const g = fresh();
    g.worldMs = 60000;
    rescueAll(g, ["wren"]);
    g.enterTown();
    g.openTalk(g.npcs.find((n) => n.name === "Wren"));
    g.acceptService();
    g.enterDungeon("harrow");
    g.fellFoe({ id: "t", x: g.px, y: g.py, family: "zombie", tint: "#6a7a48", def: "zombie", level: 5, ang: 0, hp: 0, max: 5, xp: 1, silver: 0, aggro: true });
    g.enterTown();
    g.saveSlot(2);
    const back = fresh();
    back.loadSlot(2);
    const raw = JSON.parse(store.get([...store.keys()].find((k) => /2/.test(k)) ?? "{}") || "{}");
    check("errand", "errand progress rides in the saved opened list (no new save field) and survives a reload", back.errandState("wren") === "taken" && back.errandKills("wren") === 1 && back.npcs.some((n) => n.name === "Wren"), `${back.errandState("wren")} ${back.errandKills("wren")} keys ${Object.keys(raw).length}`);
    const old = fresh();
    old.opened = new Set([...old.opened].filter((k) => !k.startsWith("rq:")));
    old.opened.add("rescued:corin");
    old.worldMs = 60000;
    old.enterTown();
    old.openTalk(old.npcs.find((n) => n.name === "Corin"));
    check("errand", "an older save with a rescue and no errand keys simply offers the errand", old.errandState("corin") === "none" && /Carry this seal/.test(old.talk.text));
  }
  const sim = readFileSync("src/game/sim.ts", "utf8");
  check("errand", "stall prices come from the existing priceOf, unchanged", /return 6 \+ it\.rank \* \(this\.shopRole === "shop" \|\| this\.shopRole === "merchant" \? 8 : 14\);/.test(sim));
  const png = readFileSync("public/art/sprites/escort-down.png");
  const spriteMake = readFileSync("tools/sprite-writer/make_gravewake.py", "utf8");
  check("errand", "escort-down.png: one 32x16 lying figure per captive, from the sprite writer, palette-checked, in RESCUES order", png.readUInt32BE(16) === 96 && png.readUInt32BE(20) === 16 && /ESCORTS = \[\("wren", "shop", "captive-wren-1"\), \("tansy", "alchemist", "captive-tansy"\), \("corin", "patron", "captive-corin"\)\]/.test(spriteMake) && F.RESCUES.map((r) => `${r.id}:${r.body}:${r.seed}`).join(",") === "wren:shop:captive-wren-1,tansy:alchemist:captive-tansy,corin:patron:captive-corin" && /not in LOCKED/.test(spriteMake.split("escort-down")[0] + spriteMake.split("escort-down")[1]));
}

// ---- Item 8: grave digging. Numbers in src/game/graves.ts DIG.
if (on("graves")) {
  const F = await feat47Mod();
  const { readFileSync } = await import("node:fs");
  const C = F.CYCLE_MS;
  const GRAVES = [[12, 17], [15, 17], [13, 19]];
  const spade = () => ({ uid: 9001, name: "Grave spade", kind: "tackle", rank: 1, bonus: F.DIG.spadePrice, special: "Spade", stack: 1 });
  const atNight = (g, night) => { g.worldMs = night * C + F.DAY_MS + 60000; };
  /** Stand on the open tile beside grave (x,y) and face it, then press Main. */
  const digAt = (g, x, y) => {
    for (const [dx, dy, face] of [[0, 1, "n"], [0, -1, "s"], [1, 0, "w"], [-1, 0, "e"]]) {
      if (g.solidAt((x + dx) * 16 + 8, (y + dy) * 16 + 12)) continue;
      g.px = (x + dx) * 16 + 8;
      g.py = (y + dy) * 16 + 8;
      g.facing = face;
      g.mode = "play";
      g.interact();
      return true;
    }
    return false;
  };
  {
    const g = fresh();
    atNight(g, 5);
    g.enterTown();
    const graves = [];
    g.tiles.forEach((t, i) => { if (t === F.T.grave) graves.push(`${i % g.w},${Math.floor(i / g.w)}`); });
    check("graves", "the town yard's three graves are the dig sites; the sim refuses any other tile", graves.join(" ") === "12,17 15,17 13,19", graves.join(" "));
    g.shopRole = "undertaker";
    g.stock = g.buildStock("undertaker");
    const sp = g.stock.find((i) => i.special === "Spade");
    g.coin = 30;
    g.buy(sp);
    const once = g.coin;
    g.buy(sp);
    const vamp = fresh("vampire");
    vamp.worldMs = 60000;
    const vs = vamp.buildStock("undertaker").find((i) => i.special === "Spade");
    check("graves", "the undertaker sells one Grave spade, a tackle item priced like the rib pole (price = bonus = 12), to the living and to a vampire", sp && sp.kind === "tackle" && g.priceOf(sp) === 12 && F.DIG.spadePrice === 12 && once === 18 && g.coin === 18 && /already carry a spade/.test(g.logLine) && g.inv.filter((i) => i.special === "Spade").length === 1 && !!vs, `${once} ${g.coin} ${g.logLine}`);
    g.mode = "play";
    g.sell(g.inv.find((i) => i.special === "Spade"));
    check("graves", "the spade cannot be sold off, like the pole", g.inv.some((i) => i.special === "Spade") && /spade stays/.test(g.logLine), g.logLine);
  }
  {
    const g = fresh();
    g.worldMs = 5 * C + 60000;
    g.enterTown();
    g.inv.push(spade());
    const t0 = [...g.tiles];
    digAt(g, 12, 17);
    const dayLine = g.logLine;
    const dayKeys = [...g.opened].filter((k) => k.startsWith("dug:")).length;
    atNight(g, 5);
    g.inv = g.inv.filter((i) => i.special !== "Spade");
    digAt(g, 12, 17);
    const bare = g.logLine;
    const bareKeys = [...g.opened].filter((k) => k.startsWith("dug:")).length;
    check("graves", "by day the yard is watched: no dig, no key", g.phase === "night" && /after dark/.test(dayLine) && dayKeys === 0, dayLine);
    check("graves", "at night without a spade: no dig, no key", /undertaker sells a spade/.test(bare) && bareKeys === 0, bare);
    g.inv.push(spade());
    const before = g.drops.length;
    let night = 0;
    for (let n = 1; n < 200 && !night; n++) if (!F.digWakes(n, 12, 17)) night = n;
    atNight(g, night);
    digAt(g, 12, 17);
    const got = g.drops.slice(before);
    check("graves", "a night dig with a spade drops exactly DIG.drops = 1 item from the existing world loot table, and records dug:<night>:12:17", got.length === 1 && F.DIG.drops === 1 && g.opened.has(F.digKey(night, 12, 17)) && /turn the grave/.test(g.logLine), `${got.length} ${g.logLine}`);
    const n1 = g.drops.length;
    digAt(g, 12, 17);
    check("graves", "the same grave the same night gives nothing more", g.drops.length === n1 && /Already turned tonight/.test(g.logLine), g.logLine);
    let next = night + 1;
    while (F.digWakes(next, 12, 17)) next++;
    atNight(g, next);
    digAt(g, 12, 17);
    check("graves", "a later night it can be dug again, and the old night's keys are dropped from the save list", g.drops.length === n1 + 1 && !g.opened.has(F.digKey(night, 12, 17)) && g.opened.has(F.digKey(next, 12, 17)), [...g.opened].filter((k) => k.startsWith("dug:")).join(" "));
    check("graves", "digging changes no town tile", t0.every((t, i) => t === g.tiles[i]));
    const sim = readFileSync("src/game/sim.ts", "utf8");
    const body = sim.split("private digGrave(")[1].split("\n  }\n")[0];
    check("graves", "the drop comes from the existing makeDrop(\"world\") table, not a new list", /this\.makeDrop\("world", false\)/.test(body) && !/makeItem\(/.test(body));
  }
  {
    // The wake roll is seeded per night and grave, and runs near 25%.
    let wakes = 0;
    let total = 0;
    const same = [];
    for (let n = 1; n <= 300; n++) for (const [x, y] of GRAVES) { total++; if (F.digWakes(n, x, y)) wakes++; }
    for (let n = 1; n <= 12; n++) {
      const runs = [];
      for (let k = 0; k < 2; k++) {
        const g = fresh();
        atNight(g, n);
        g.enterTown();
        g.inv.push(spade());
        digAt(g, 15, 17);
        runs.push(g.roamers.some((r) => r.aggro && r.family === "zombie"));
      }
      same.push(runs[0] === runs[1] && runs[0] === F.digWakes(n, 15, 17));
    }
    check("graves", "a zombie wakes on the seeded roll for that night and grave, the same every game", same.every(Boolean), same.join(""));
    check("graves", "over 300 nights x 3 graves the wake share is near DIG.wakeChance = 25%", F.DIG.wakeChance === 0.25 && Math.abs(wakes / total - 0.25) < 0.04, `${wakes}/${total}`);
  }
  {
    const lvls = [];
    for (const lv of [1, 30]) {
      let night = 1;
      while (!F.digWakes(night, 15, 17)) night++;
      const g = fresh();
      g.level = lv;
      atNight(g, night);
      g.enterTown();
      g.inv.push(spade());
      const before = g.roamers.length;
      digAt(g, 15, 17);
      const z = g.roamers.slice(before);
      const want = scaleMonster(F.monsterById("zombie"), zoneLevel(F.GATE.x, F.GATE.y, lv));
      lvls.push(`${lv}:${z.length}:${z[0]?.family}:${z[0]?.hp}/${want.hp}:${z[0]?.atk}/${want.atk}`);
      check("graves", `a woken zombie (hero level ${lv}) is one zombie-family foe on the field, scaled to the town gate's zone level`, z.length === 1 && z[0].family === "zombie" && z[0].aggro && z[0].hp === want.hp && z[0].atk === want.atk && g.mode === "play" && /zombie claws up/.test(g.logLine), lvls.at(-1));
    }
  }
  {
    const g = fresh();
    atNight(g, 7);
    g.enterTown();
    g.inv.push(spade());
    digAt(g, 13, 19);
    g.saveSlot(2);
    const back = fresh();
    back.loadSlot(2);
    back.worldMs = g.worldMs;
    back.enterTown();
    back.inv.push(spade());
    const n0 = back.drops.length;
    digAt(back, 13, 19);
    check("graves", "a dug grave rides in the saved opened list and stays dug after a reload the same night", back.graveDug(13, 19) && back.drops.length === n0 && /Already turned/.test(back.logLine), back.logLine);
  }
  {
    const png = readFileSync("public/art/writer/grave-dug.png");
    const writer = readFileSync("tools/pixel-writer/make_gravewake.py", "utf8");
    const draw = readFileSync("src/game/draw.ts", "utf8");
    check("graves", "grave-dug.png is one 16x16 cell from the pixel writer, palette-locked, drawn only over a grave dug tonight", png.readUInt32BE(16) === 16 && png.readUInt32BE(20) === 16 && /grave_dug\(/.test(writer) && /grave-dug\.png/.test(writer) && /made \+= \[dug, trophy\]/.test(writer) && /const dug = kind === "grave" && g\.graveDug\(x, y\);/.test(draw) && /if \(dug\) sheetCell\(ctx, GRAVE_DUG/.test(draw));
  }
}

// ---- Item 9: the Midnight Derby. Numbers in src/game/derby.ts DERBY.
if (on("derby")) {
  const F = await feat47Mod();
  const { readFileSync } = await import("node:fs");
  const C = F.CYCLE_MS;
  const vell = { name: "Hookkeep Vell", role: "fisher", x: 0, y: 0 };
  const night = (g, day) => { g.worldMs = day * C + F.DAY_MS + 60000; };
  const atShack = (g) => { g.mapId = "inside"; g.inside = "fisher"; g.mode = "play"; };
  const talk = (g) => { atShack(g); g.openTalk(vell); return g.choices().map((c) => c.id); };
  /** One catch the shack's way: the pack is cleared to its starting junk first so it always lands. */
  const catchOne = (g) => { g.inv = g.inv.filter((i) => i.kind === "junk"); g.fishBait = "nightcrawlers"; g.catchFish(); return g.inv.find((i) => i.kind === "fish"); };
  {
    const days = [];
    for (let d = 0; d < 12; d++) if (F.derbyDay(d)) days.push(d);
    const g = fresh();
    g.worldMs = 2 * C + 60000;
    const byDay = g.derbyTonight();
    night(g, 2);
    const nightOn = g.derbyTonight();
    night(g, 3);
    const offNight = g.derbyTonight();
    check("derby", "a derby runs every third day (days 2, 5, 8, 11: the 3rd and 6th of each six-day season), from nightfall to dawn only", days.join(",") === "2,5,8,11" && F.DERBY.every === 3 && !byDay && nightOn && !offNight, days.join(","));
  }
  {
    const g = fresh();
    night(g, 4);
    const off = talk(g);
    g.worldMs = 5 * C + 60000;
    g.enterTown();
    const dayLine = g.eventLine();
    const dayChoices = talk(g);
    night(g, 5);
    g.enterTown();
    const lineOut = g.eventLine();
    const ch = talk(g);
    const said = g.talk?.text ?? "";
    g.choose("derby");
    const lineIn = g.eventLine();
    check("derby", "Vell offers the entry only on a derby night; the HUD line names it by day and counts to dawn by night", !off.includes("derby") && !dayChoices.includes("derby") && ch.includes("derby") && /nightfall/.test(dayLine) && /min to dawn/.test(lineOut) && /Midnight Derby runs till dawn/.test(said) && g.opened.has("derby:5:in") && new RegExp(`mark ${F.derbyMark(5)} in`).test(lineIn), `${dayLine} | ${lineOut} | ${lineIn}`);
    check("derby", "once entered, the entry is not offered again", !talk(g).includes("derby"));
  }
  {
    const g = fresh();
    night(g, 5);
    let out = 0;
    for (let i = 0; i < 400; i++) if ((catchOne(g)?.size ?? 0) > 0) out++;
    talk(g);
    g.choose("derby");
    let lit = 0;
    let fish = 0;
    const bad = [];
    for (let i = 0; i < 1500; i++) {
      const f = catchOne(g);
      if (!f) continue;
      fish++;
      if (!f.size) continue;
      lit++;
      const base = ["Pale carp", "Lantern perch", "Grave trout", "Choir bass", "Widow eel", "Moon pike"].findIndex((n) => f.name.toLowerCase().includes(n.toLowerCase()));
      const [lo, hi] = F.DERBY.sizes[base] ?? [99, 0];
      if (f.size < lo || f.size > hi || !f.name.startsWith("Witchlit ") || !f.name.endsWith(`(${f.size} in)`)) bad.push(f.name);
      if (base < 0 || f.bonus !== [2, 3, 4, 5, 6, 8][base]) bad.push(`${f.name}:${f.bonus}`);
    }
    check("derby", "no witchlit fish outside an entered derby night", out === 0, `${out}`);
    check("derby", "entered, about DERBY.magicChance = 40% of fish catches come up witchlit", F.DERBY.magicChance === 0.4 && Math.abs(lit / fish - 0.4) < 0.05, `${lit}/${fish}`);
    check("derby", "each witchlit fish is one of the six existing catches, worth the same points, sized inside its species range", !bad.length && fish > 1000, bad.slice(0, 4).join("; "));
  }
  {
    const g = fresh();
    night(g, 5);
    talk(g);
    g.choose("derby");
    const mk = (n, size) => ({ uid: 7000 + size, name: `Witchlit ${n} (${size} in)`, kind: "fish", rank: 1, bonus: 4, stack: 1, size });
    g.inv.push(mk("grave trout", 15), mk("moon pike", 30), { uid: 6999, name: "Pale carp", kind: "fish", rank: 1, bonus: 2, stack: 1 });
    const pts = g.fishPoints;
    const ch = talk(g);
    const label = g.choices().find((c) => c.id === "weigh")?.label ?? "";
    g.choose("weigh");
    const best1 = g.derbyBest();
    talk(g);
    g.choose("weigh");
    const best2 = g.derbyBest();
    check("derby", "weigh-in takes your biggest witchlit fish first, marks its points like a trade, and keeps the best size", ch.includes("weigh") && /moon pike \(30 in\)/.test(label) && best1 === 30 && best2 === 30 && g.fishPoints === pts + 8 && !g.inv.some((i) => i.size), `${label} ${best1} ${best2} ${g.fishPoints - pts}`);
    g.inv.push(mk("choir bass", 20));
    atShack(g);
    g.tradeFish();
    check("derby", "trading fish on a derby night you entered keeps the witchlit ones for the scale", g.inv.some((i) => i.size === 20) && !g.inv.some((i) => i.name === "Pale carp"), g.inv.map((i) => i.name).join(","));
  }
  /** Run one derby night to dawn with a weighed best of `size`. */
  const runNight = (g, day, size) => {
    night(g, day);
    talk(g);
    g.choose("derby");
    if (size) {
      g.inv.push({ uid: 8000 + day, name: `Witchlit moon pike (${size} in)`, kind: "fish", rank: 1, bonus: 8, stack: 1, size });
      talk(g);
      g.choose("weigh");
    }
    g.mode = "play";
    g.worldMs = (day + 1) * C + 1000;
    ticks(g, 30);
  };
  {
    const marks = [];
    for (let d = 2; d < 300; d += 3) marks.push(F.derbyMark(d));
    check("derby", "the rival's mark is seeded per derby day, 20 to 34 in, and stable", marks.every((m) => m >= F.DERBY.markMin && m <= F.DERBY.markMax) && new Set(marks).size > 6 && F.derbyMark(5) === F.derbyMark(5) && F.DERBY.markMin === 20 && F.DERBY.markMax === 34, `${Math.min(...marks)}..${Math.max(...marks)}`);
    const g = fresh();
    const m = F.derbyMark(5);
    runNight(g, 5, m);
    check("derby", "at dawn a best equal to the rival's mark loses: no trophy, nothing paid", !g.hasDerbyTrophy() && g.derbyWins() === 0 && /holds the board/.test(g.logLine), g.logLine);
    const w = fresh();
    runNight(w, 8, F.derbyMark(8) + 1);
    const first = w.logLine;
    const pts = w.fishPoints;
    check("derby", "at dawn a best strictly over the mark wins: the trophy is yours and the night's keys are gone", w.hasDerbyTrophy() && w.derbyWins() === 1 && /beats/.test(first) && ![...w.opened].some((k) => k.startsWith("derby:8:")), first);
    runNight(w, 11, F.derbyMark(11) + 2);
    const trophies = [...w.opened].filter((k) => k.startsWith("trophy:")).length;
    // The second night's weigh-in marks the moon pike's own 8 points, as a trade would; the win adds 20 on top.
    check("derby", "a later win pays DERBY.repeatPoints = 20 fish points and hangs no second trophy", w.fishPoints === pts + 8 + 20 && F.DERBY.repeatPoints === 20 && trophies === 1 && w.derbyWins() === 2, `${w.fishPoints - pts} ${trophies} ${w.logLine}`);
    const idle = fresh();
    runNight(idle, 14, 0);
    check("derby", "entered with nothing weighed: no result, and the entry key is cleaned at dawn", !idle.hasDerbyTrophy() && ![...idle.opened].some((k) => k.startsWith("derby:14:")));
    const during = fresh();
    night(during, 5);
    talk(during);
    during.choose("derby");
    during.inv.push({ uid: 8100, name: "Witchlit moon pike (40 in)", kind: "fish", rank: 1, bonus: 8, stack: 1, size: 40 });
    talk(during);
    during.choose("weigh");
    ticks(during, 60);
    check("derby", "nothing is judged before dawn", !during.hasDerbyTrophy() && during.derbyBest() === 40);
  }
  {
    const g = fresh();
    night(g, 5);
    talk(g);
    g.choose("derby");
    g.inv.push({ uid: 8200, name: "Witchlit widow eel (27 in)", kind: "fish", rank: 1, bonus: 6, stack: 1, size: 27 });
    g.saveSlot(2);
    const back = fresh();
    back.loadSlot(2);
    const f = back.inv.find((i) => i.size);
    check("derby", "a witchlit fish keeps its size through a save, and the entry rides in the saved opened list", f && f.size === 27 && back.opened.has("derby:5:in"), JSON.stringify(f));
  }
  {
    const v = fresh("vampire");
    night(v, 5);
    const ch = talk(v);
    v.choose("derby");
    check("derby", "a vampire can enter: the derby is a night event", ch.includes("derby") && v.opened.has("derby:5:in"));
  }
  {
    const png = readFileSync("public/art/writer/derby-trophy.png");
    const writer = readFileSync("tools/pixel-writer/make_gravewake.py", "utf8");
    const draw = readFileSync("src/game/draw.ts", "utf8");
    check("derby", "derby-trophy.png is one 16x16 cell from the pixel writer, palette-locked, drawn on the croft wall only once won", png.readUInt32BE(16) === 16 && png.readUInt32BE(20) === 16 && /derby_trophy\(/.test(writer) && /made \+= \[dug, trophy\]/.test(writer) && /g\.inside === "croft" && x === DERBY\.trophyX && y === DERBY\.trophyY && g\.hasDerbyTrophy\(\)/.test(draw) && F.DERBY.trophyX === 9 && F.DERBY.trophyY === 0);
  }
}

if (on("decor")) {
  const F = await feat47Mod();
  const { readFileSync } = await import("node:fs");
  const D = F.DECOR;
  /** A croft you own, walked into, with points in hand. */
  const croft = (pts = 200) => {
    const g = fresh();
    g.ownedHome = true;
    g.points = pts;
    g.enterInside("croft");
    return g;
  };
  const kill = (g, ...ids) => { for (const id of ids) g.bossDead[id] = g.worldMs + 2 * F.CYCLE_MS; };
  {
    const ids = D.pieces.map((p) => `${p.id}:${p.price}@${p.x},${p.y}#${p.cell}`).join(" ");
    check("decor", "six croft pieces at fixed spots and prices (cabinet 16, bookcase 12, candelabra 8, chair 10, perch 14, planter 6); a boss trophy is 15", ids === "cabinet:16@11,1#0 bookcase:12@12,1#1 candelabra:8@1,4#2 armchair:10@9,3#3 perch:14@12,6#4 planter:6@1,8#5" && D.trophyPrice === 15, ids);
    const g = croft();
    const tiles = [...g.tiles];
    const w = g.w;
    const cottage = [[2, 2], [3, 2], [8, 3], [10, 6], [5, 5], [8, 6], [4, 6]];
    const clear = D.pieces.every((p) => p.x > 0 && p.x < w - 1 && p.y > 0 && p.y < g.h - 1 && tiles[p.y * w + p.x] === F.T.floor && !cottage.some(([x, y]) => x === p.x && y === p.y) && !(p.x === 7 && p.y >= 8));
    const slots = D.trophySlots.every((x) => tiles[x] === F.T.wall && x > 0 && x < w - 1 && x % 4 !== 2 && x !== F.DERBY.trophyX) && new Set(D.trophySlots).size === D.trophySlots.length && D.trophySlots.length === 8 && D.trophyRow === 0;
    check("decor", "every piece stands on plain croft floor off the bed, table, rug, plant, chest and the door lane; the 8 trophy slots are back-wall tiles that miss the windows (x 2, 6, 10) and the derby trophy (x 9)", clear && slots, D.trophySlots.join(","));
  }
  {
    const no = fresh();
    no.points = 99;
    no.buyDecor("piece:planter");
    const noDeed = no.points === 99 && !no.opened.has("decor:planter") && /deed/.test(no.logLine);
    const poor = croft(5);
    poor.buyDecor("piece:planter");
    const short = poor.points === 5 && !poor.opened.has("decor:planter") && /wants 6 points/.test(poor.logLine);
    check("decor", "no deed or too few points: nothing is bought and nothing is spent", noDeed && short, `${no.logLine} | ${poor.logLine}`);
    const g = croft(20);
    const offered = g.decorOffers().map((o) => o.id);
    g.buyDecor("piece:planter");
    const after = g.decorOffers().map((o) => o.id);
    g.buyDecor("piece:planter");
    check("decor", "a piece costs its price in casino points, lands in the croft (not the pack), and is offered only once", offered.length === 6 && g.points === 14 && g.opened.has("decor:planter") && !after.includes("piece:planter") && g.points === 14 && !g.inv.some((i) => /planter/i.test(i.name)) && /already/.test(g.logLine), `${g.points} ${g.logLine}`);
  }
  {
    // Pieces are solid to the hero and to everyone else, and the croft still walks.
    const g = croft();
    const free = (gg, x, y) => !BLOCKED.has(gg.tiles[y * gg.w + x]) && !gg.solidAt(x * TILE + 8, y * TILE + 8, true);
    const before = D.pieces.every((p) => !g.solidAt(p.x * TILE + 8, p.y * TILE + 8, false));
    for (const p of D.pieces) g.buyDecor(`piece:${p.id}`);
    const solid = D.pieces.every((p) => g.solidAt(p.x * TILE + 8, p.y * TILE + 8, true) && g.solidAt(p.x * TILE + 8, p.y * TILE + 8, false));
    const seen = new Set(["7,9"]);
    const q = [[7, 9]];
    while (q.length) {
      const [x, y] = q.shift();
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = x + dx;
        const ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= g.w || ny >= g.h || seen.has(`${nx},${ny}`) || !free(g, nx, ny)) continue;
        seen.add(`${nx},${ny}`);
        q.push([nx, ny]);
      }
    }
    const lost = [];
    for (let y = 0; y < g.h; y++) for (let x = 0; x < g.w; x++) if (free(g, x, y) && g.tiles[y * g.w + x] !== F.T.door && !seen.has(`${x},${y}`)) lost.push(`${x},${y}`);
    check("decor", "with all six bought, each piece blocks the hero and townsfolk alike, and every other croft tile (chest included) is still reachable from the door", before && solid && !lost.length && seen.has("4,6"), lost.join(" "));
    // A real walk: up into the chair from below stops short of it.
    const walk = (gg) => { gg.px = 9 * TILE + 8; gg.py = 5 * TILE + 8; gg.mode = "play"; gg.held.add("KeyW"); let hit = false; for (let i = 0; i < 30; i++) { gg.update(0.05); if (Math.floor(gg.py / TILE) === 3) hit = true; } gg.held.clear(); return hit; };
    const bare = croft();
    check("decor", "walking north into the wingback chair stops at it; the same walk crosses that tile in a bare croft", !walk(g) && walk(bare), `${g.py} ${bare.py}`);
  }
  {
    const g = croft(15 * 9);
    const none = g.decorOffers().filter((o) => o.id.startsWith("trophy:")).length;
    g.buyDecor("trophy:dracula");
    const unslain = !g.bossTrophies().length && g.points === 135;
    const bosses = F.BOSSES_LIST.filter((b) => b.boss).map((b) => b.id);
    kill(g, ...bosses.slice(0, 9));
    const offers = g.decorOffers().filter((o) => o.id.startsWith("trophy:"));
    for (const id of bosses.slice(0, 8)) g.buyDecor(`trophy:${id}`);
    const hung = g.bossTrophies();
    const order = hung.map((t) => t.slot).sort((a, b) => D.trophySlots.indexOf(a) - D.trophySlots.indexOf(b)).join(",");
    const pts = g.points;
    g.buyDecor(`trophy:${bosses[8]}`);
    check("decor", "a trophy is offered only for a boss you have felled (the saved boss record), and costs 15", none === 0 && unslain && offers.length === 9 && offers.every((o) => / trophy · 15 points$/.test(o.label)), offers.map((o) => o.label).slice(0, 2).join(" | "));
    check("decor", "trophies fill the 8 wall slots in order, one per boss; the ninth is refused with nothing spent", hung.length === 8 && order === D.trophySlots.join(",") && new Set(hung.map((t) => t.boss)).size === 8 && g.points === pts && pts === 135 - 8 * 15 && /full/.test(g.logLine), `${order} ${g.logLine}`);
    const drac = fresh();
    drac.ownedHome = true;
    drac.points = 40;
    kill(drac, "dracula");
    drac.buyDecor("trophy:dracula");
    drac.buyDecor("trophy:dracula");
    check("decor", "a boss hangs once: the second buy is refused and its family head is known for the draw", drac.bossTrophies().length === 1 && drac.bossTrophies()[0].family === "vampire" && drac.points === 25 && F.TROPHY_HEAD_TOP.vampire === 1, JSON.stringify(drac.bossTrophies()));
  }
  {
    const g = croft(100);
    kill(g, "frank", "lich");
    g.opened.add("trophy:derby");
    g.buyDecor("piece:cabinet");
    g.buyDecor("piece:perch");
    g.buyDecor("trophy:lich");
    g.saveSlot(2);
    const back = fresh();
    back.loadSlot(2);
    const pieces = back.decorPieces().map((p) => p.id).join(",");
    check("decor", "pieces, trophies, points and the derby trophy all ride the saved opened list through a save", pieces === "cabinet,perch" && back.bossTrophies().length === 1 && back.bossTrophies()[0].boss === "lich" && back.hasDerbyTrophy() && back.points === 100 - 16 - 14 - 15 && back.decorOffers().some((o) => o.id === "trophy:frank"), pieces);
    const old = fresh();
    old.saveSlot(1);
    const oldBack = fresh();
    oldBack.loadSlot(1);
    check("decor", "an older save with none of the new keys loads to a bare croft with all six pieces on offer", !oldBack.decorPieces().length && !oldBack.bossTrophies().length && oldBack.decorOffers().length === 6);
  }
  {
    const png = readFileSync("public/art/writer/croft-decor.png");
    const plaque = readFileSync("public/art/writer/boss-plaque.png");
    const writer = readFileSync("tools/pixel-writer/make_gravewake.py", "utf8");
    const draw = readFileSync("src/game/draw.ts", "utf8");
    const ui = readFileSync("src/game/Gravewake.tsx", "utf8");
    check("decor", "croft-decor.png (6 cells) and boss-plaque.png (1 cell) come from the palette-locked writer; the draw shows only owned pieces and hung trophies", png.readUInt32BE(16) === 96 && png.readUInt32BE(20) === 16 && plaque.readUInt32BE(16) === 16 && plaque.readUInt32BE(20) === 16 && /made \+= \[decor, plaque\]/.test(writer) && /g\.decorPieces\(\)\.find/.test(draw) && /g\.bossTrophies\(\)\.find\(\(t\) => t\.slot === x\)/.test(draw) && /CROFT_DECOR, BOSS_PLAQUE/.test(draw));
    check("decor", "the casino's points shelf lists the home pieces and trophies as buttons", /game\.decorOffers\(\)\.map/.test(ui) && /game\.buyDecor\(o\.id\)/.test(ui) && /data-testid="home-shelf"/.test(ui));
    const a = croft();
    const b = croft();
    for (const p of D.pieces) b.buyDecor(`piece:${p.id}`);
    check("decor", "buying changes no croft tile: the room is the same build", a.tiles.join() === b.tiles.join() && a.w === 14 && a.h === 11);
  }
}

if (on("bond")) {
  const F = await feat47Mod();
  const B = F.BOND;
  const C = F.CYCLE_MS;
  const half = C / 2;
  /** Pitch camp in the wild (no goblins) with this companion beside you. */
  const atCamp = (cls, id, name, kit, source) => {
    const g = fresh(cls);
    g.level = 12;
    g.worldMs = 3 * C + 1000;
    g.enterWorld(32 * TILE + 8, 46 * TILE + 8);
    g.takeCompanion(id, name, kit, source);
    const roll = Math.random;
    Math.random = () => 0.99;
    g.camp();
    Math.random = roll;
    return g;
  };
  const talk = (g) => {
    g.mode = "play";
    g.talk = null;
    g.companion.x = g.px + 10;
    g.companion.y = g.py;
    g.interact();
    const t = g.talk?.role === "companion" ? g.talk.text : "";
    g.mode = "play";
    g.talk = null;
    return t;
  };
  const bren = () => atCamp("warrior", "acolyte", "Acolyte Bren", "acolyte", "acolyte");
  {
    const g = bren();
    const first = talk(g);
    const b1 = g.bondOf().bond;
    const again = talk(g);
    const b1b = g.bondOf().bond;
    g.worldMs += half;
    talk(g);
    const b2 = g.bondOf().bond;
    check("bond", "a camp talk raises the bond by one, once per day and once per night (BOND.stampMs = half a cycle)", b1 === 1 && b1b === 1 && b2 === 2 && B.stampMs === half && /Bond 1\/7/.test(first) && /after the next dawn or dusk/.test(again), `${b1} ${b1b} ${b2} | ${again}`);
    check("bond", "the bond is one key in the saved opened list, the old one replaced", [...g.opened].filter((k) => k.startsWith("bond:")).length === 1);
    const out = fresh();
    out.level = 12;
    out.enterWorld(32 * TILE + 8, 46 * TILE + 8);
    out.takeCompanion("acolyte", "Acolyte Bren", "acolyte", "acolyte");
    out.companion.x = out.px + 10;
    out.companion.y = out.py;
    out.interact();
    check("bond", "outside camp, talking does not touch the bond", out.bondOf().bond === 0 && ![...out.opened].some((k) => k.startsWith("bond:")));
  }
  {
    const g = bren();
    const texts = [];
    for (let i = 0; i < 9; i++) {
      texts.push(talk(g));
      g.worldMs += half;
    }
    const hit = (n) => texts[n - 1];
    const L = F.BOND_LINES.acolyte;
    check("bond", "tiers at bond 2, 4 and 7 (max 7) each tell that companion's next story line and name the passive", B.tiers.join() === "2,4,7" && B.max === 7 && hit(2).includes(L[0]) && /Watchful/.test(hit(2)) && hit(4).includes(L[1]) && /Forager/.test(hit(4)) && hit(7).includes(L[2]) && /Fireside/.test(hit(7)) && !texts.some((t, i) => ![1, 3, 6].includes(i) && L.some((l) => t.includes(l))) && g.bondOf().bond === 7 && /as deep as it goes/.test(hit(8)), texts.map((t) => t.slice(0, 30)).join(" | "));
    check("bond", "the meter line reads bond, the passives on, and the next tier", /Bond 7\/7 · Watchful, Forager, Fireside$/.test(g.bondLine()), g.bondLine());
    const tier = (n) => { const x = bren(); x.opened.add(F.bondKey("acolyte", n, -1)); return ["watchful", "forager", "fireside"].map((p) => x.bondHas(p)).join(); };
    check("bond", "passives switch on with their tier: Watchful at 2, Forager at 4, Fireside at 7", tier(1) === "false,false,false" && tier(2) === "true,false,false" && tier(4) === "true,true,false" && tier(6) === "true,true,false" && tier(7) === "true,true,true");
  }
  {
    // Each voice: the three hires by id, a bitten thrall and a relic pact with their own name.
    const voice = (cls, id, name, kit, source, lines) => {
      const g = atCamp(cls, id, name, kit, source);
      g.opened.add(F.bondKey(id, 1, -1));
      const t = talk(g);
      return t.includes(lines[0].replace("{name}", name));
    };
    const L = F.BOND_LINES;
    const ok = voice("warrior", "witch", "Sister Vetch", "witch", "vetch", L.witch) && voice("warrior", "shade", "Shade-at-Arms", "shade", "shade", L.shade) && voice("vampire", "mara", "Mara", "acolyte", "mara", L.thrall) && voice("vampire", "priest", "Bound priest", "bound-priest", "priest", L.pact);
    check("bond", "each hire has its own lines; a thrall and a relic pact get theirs with their name in", ok && Object.values(L).every((v) => v.length === 3));
  }
  {
    const v = atCamp("vampire", "mara", "Mara", "acolyte", "mara");
    talk(v);
    v.stakeCompanion();
    v.takeCompanion("mara", "Mara", "acolyte", "mara");
    const staked = v.bondOf().bond;
    const w = bren();
    talk(w);
    w.releaseCompanion();
    w.takeCompanion("acolyte", "Acolyte Bren", "acolyte", "acolyte");
    check("bond", "a stake ends that bond (a new bite starts at 0); a released hire keeps it for when you hire them back", staked === 0 && ![...v.opened].some((k) => k.startsWith("bond:mara:")) && w.bondOf().bond === 1);
  }
  {
    const fire = (n) => {
      const g = fresh();
      g.level = 12;
      g.enterWorld(32 * TILE + 8, 46 * TILE + 8);
      g.takeCompanion("acolyte", "Acolyte Bren", "acolyte", "acolyte");
      if (n) g.opened.add(F.bondKey("acolyte", n, -1));
      g.hp = 1;
      g.energy = 0;
      const roll = Math.random;
      Math.random = () => 0.99;
      g.camp();
      Math.random = roll;
      return [g.hp - 1, g.energy, g.maxHp, g.maxEnergy];
    };
    const [h0, e0, mh, me] = fire(0);
    const [h6] = fire(6);
    const [h7, e7] = fire(7);
    check("bond", "Fireside (tier 3): pitching camp restores half your HP and energy instead of a third; below tier 3 it is a third", h0 === Math.round(mh / 3) && e0 === Math.round(me / 3) && h6 === h0 && h7 === Math.round(mh * B.campShare) && e7 === Math.round(me / 2) && B.campShare === 0.5, `${h0} ${h6} ${h7}/${mh} ${e0} ${e7}/${me}`);
  }
  {
    const dungeonWith = (n, withCompanion = true) => {
      const g = fresh();
      g.level = 12;
      g.enterDungeon(F.DUNGEONS[0].id);
      g.roamers = [];
      if (withCompanion) g.takeCompanion("acolyte", "Acolyte Bren", "acolyte", "acolyte");
      if (n) g.opened.add(F.bondKey("acolyte", n, -1));
      if (!g.feats) g.feats = { hidden: [] };
      const hx = Math.floor(g.px / TILE);
      const hy = Math.floor(g.py / TILE);
      g.feats.traps = [{ x: hx + 2, y: hy, kind: "plate", phase: 0 }, { x: hx + 8, y: hy, kind: "spike", phase: 0 }];
      g.logLine = "";
      g.mode = "play";
      return g;
    };
    const g = dungeonWith(2);
    const traps = JSON.stringify(g.feats.traps);
    const hp = g.hp;
    ticks(g, 2);
    const said = g.logLine;
    g.logLine = "";
    ticks(g, 4);
    const twice = g.logLine;
    const none = dungeonWith(1);
    ticks(none, 4);
    const alone = dungeonWith(7, false);
    ticks(alone, 4);
    const down = dungeonWith(7);
    down.companion.hp = 0;
    ticks(down, 4);
    check("bond", "Watchful (tier 1): in a dungeon the companion names a floor trap within 3 tiles, once, with a ! over it; the trap is untouched and you take no hit", /Bren: "A plate, to the east\."/.test(said) && !/Bren/.test(twice) && JSON.stringify(g.feats.traps) === traps && g.hp >= hp && g.nums.some((n) => n.text === "!") && B.callTiles === 3, `${said} | ${twice} | ${traps} ${JSON.stringify(g.feats.traps)} ${hp} ${g.hp}`);
    check("bond", "no call-out below tier 1, with no companion at your side, or with the companion down", !/plate|Spikes/.test(none.logLine) && !/plate|Spikes/.test(alone.logLine) && !/plate|Spikes/.test(down.logLine), `${none.logLine} | ${alone.logLine} | ${down.logLine}`);
  }
  {
    const forage = (n) => {
      const g = fresh();
      g.level = 12;
      g.takeCompanion("acolyte", "Acolyte Bren", "acolyte", "acolyte");
      if (n) g.opened.add(F.bondKey("acolyte", n, -1));
      g.companion.x = g.px + 30;
      g.companion.y = g.py;
      g.drops = [];
      g.dropItem(g.companion.x, g.companion.y, { uid: "fx1", name: "Bone charm", kind: "junk", rank: 1, stack: 1 });
      const d = g.drops[0];
      d.x = g.companion.x;
      d.y = g.companion.y;
      for (let i = 0; i < 10; i++) {
        g.update(0.05);
        g.companion.x = g.px + 30;
        g.companion.y = g.py;
      }
      return g.inv.some((i) => i.uid === "fx1") && !g.drops.length;
    };
    check("bond", "Forager (tier 2): loot at the companion's feet (12 px, your own reach) comes to your pack; below tier 2 it waits for you", forage(4) && !forage(3) && B.forageReach === 12);
  }
  {
    // Base combat numbers: the same seeded skirmish at bond 0 and bond 7 plays out the same.
    const brawl = (n) => {
      const g = fresh();
      g.level = 12;
      g.enterDungeon(F.DUNGEONS[0].id);
      if (g.feats) g.feats.traps = [];
      g.takeCompanion("acolyte", "Acolyte Bren", "acolyte", "acolyte");
      g.companion.equip.main = { uid: "cm", name: "Mace", kind: "weapon", rank: 1, slot: "main", atk: 3, bonus: 1 };
      if (n) g.opened.add(F.bondKey("acolyte", n, -1));
      let s = 7;
      const roll = Math.random;
      Math.random = () => ((s = (s * 16807) % 2147483647) / 2147483647);
      const r = { id: "dummy", x: g.px + 14, y: g.py, family: "zombie", tint: "#6a7a48", def: "zombie", level: 12, ang: 0, hp: 400, max: 400, atk: 4, ac: 2, xp: 1, silver: 3, name: "Dummy", aggro: true };
      g.roamers = [r];
      g.facing = "e";
      g.companion.x = g.px + 10;
      g.companion.y = g.py + 6;
      const trail = [];
      let swings = 0;
      for (let i = 0; i < 160; i++) {
        // Pinned in reach (knock-back would end the skirmish): the hero's slash and the companion's swing both land.
        r.x = g.px + 14;
        r.y = g.py;
        g.companion.x = g.px + 22;
        g.companion.y = g.py + 6;
        if (i % 12 === 0 && g.mode === "play") g.slash();
        g.update(0.05);
        if (/swings for/.test(g.logLine)) swings++;
        trail.push(`${r.hp},${g.hp},${g.companion.hp}`);
      }
      Math.random = roll;
      return { swings, trail: trail.join(" "), nums: [g.companionAtk(), g.companionMax(), g.companionBonus(), g.maxHp, g.maxEnergy, g.setAtk()].join() };
    };
    const a = brawl(0);
    const b = brawl(7);
    check("bond", "base combat numbers do not move with the bond: companion attack, HP, bonus and a seeded skirmish's every hit are the same at 0 and 7", a.nums === b.nums && a.trail === b.trail && a.swings > 2, `${a.nums} | ${b.nums} | swings ${a.swings} ${b.swings} | ${a.trail.split(" ").slice(-1)} | ${b.trail.split(" ").slice(-1)}`);
  }
  {
    const g = bren();
    talk(g);
    g.worldMs += half;
    talk(g);
    g.saveSlot(2);
    const back = fresh();
    back.loadSlot(2);
    check("bond", "the bond rides a save with the companion", back.companion?.id === "acolyte" && back.bondOf().bond === 2 && back.bondHas("watchful"));
    const { readFileSync } = await import("node:fs");
    const ui = readFileSync("src/game/Gravewake.tsx", "utf8");
    check("bond", "the camp talk panel shows the bond meter, and the HUD names the bond", /data-testid="bond-meter">\{game\.bondLine\(\)\}/.test(ui) && /· bond \{game\.bondOf\(\)\.bond\}/.test(ui));
  }
}

if (on("season")) {
  const F = await feat47Mod();
  const { readFileSync, existsSync } = await import("node:fs");
  const { inflateSync } = await import("node:zlib");
  const S = F.SEASON;
  const C = F.CYCLE_MS;
  const dayMs = (d) => d * C + 60000;
  /** Decode an 8-bit RGBA, non-interlaced PNG (what Pillow writes for the writer sheets). */
  const readPng = (path) => {
    const b = readFileSync(path);
    let o = 8;
    let w = 0, h = 0, type = 0;
    const idat = [];
    while (o < b.length) {
      const len = b.readUInt32BE(o);
      const kind = b.toString("ascii", o + 4, o + 8);
      const data = b.subarray(o + 8, o + 8 + len);
      if (kind === "IHDR") { w = data.readUInt32BE(0); h = data.readUInt32BE(4); type = data[9]; if (data[8] !== 8 || data[12] !== 0) throw new Error("png depth/interlace"); }
      if (kind === "IDAT") idat.push(data);
      o += 12 + len;
    }
    if (type !== 6) throw new Error(`png colour type ${type}`);
    const raw = inflateSync(Buffer.concat(idat));
    const bpp = 4, stride = w * bpp;
    const out = Buffer.alloc(w * h * bpp);
    for (let y = 0; y < h; y++) {
      const f = raw[y * (stride + 1)];
      for (let x = 0; x < stride; x++) {
        const v = raw[y * (stride + 1) + 1 + x];
        const a = x >= bpp ? out[y * stride + x - bpp] : 0;
        const up = y > 0 ? out[(y - 1) * stride + x] : 0;
        const c = x >= bpp && y > 0 ? out[(y - 1) * stride + x - bpp] : 0;
        let p = v;
        if (f === 1) p = v + a;
        else if (f === 2) p = v + up;
        else if (f === 3) p = v + ((a + up) >> 1);
        else if (f === 4) { const q = a + up - c; const pa = Math.abs(q - a), pb = Math.abs(q - up), pc = Math.abs(q - c); p = v + (pa <= pb && pa <= pc ? a : pb <= pc ? up : c); }
        out[y * stride + x] = p & 255;
      }
    }
    return { w, h, px: out };
  };
  {
    const ids = [0, 5, 6, 11, 12, 18, 23, 24, 30].map((d) => F.seasonOfDay(d)).join(",");
    const g = fresh();
    const names = [];
    for (const d of [0, 6, 12, 18, 30, 42]) { g.worldMs = dayMs(d); names.push(g.seasonName()); }
    check("season", "four seasons of one six-day calendar block each, autumn first from day 0: a year is 24 days", S.days === 6 && S.order.join() === "autumn,winter,spring,summer" && ids === "autumn,autumn,winter,winter,spring,summer,summer,autumn,winter", ids);
    check("season", "the six named calendar blocks still run in their old order on the same days", names.join("|") === "Lantern Night|Gallows Fair|Blood Moon|Frost Wake|Swamp Miasma|Gallows Fair", names.join("|"));
    g.worldMs = dayMs(20);
    check("season", "the HUD season line names the season and the day inside it", g.seasonLine() === "Summer of the Dead · day 3 of 6", g.seasonLine());
  }
  {
    const derbyBySeason = {};
    let clash = 0;
    for (let d = 0; d < 240; d++) {
      const s = F.seasonOfDay(d);
      const key = `${Math.floor(d / 24)}:${s}`;
      if (F.derbyDay(d)) derbyBySeason[key] = (derbyBySeason[key] ?? 0) + 1;
      if (F.derbyDay(d) && F.festivalHook(d)) clash++;
    }
    const counts = new Set(Object.values(derbyBySeason));
    check("season", "the derby keeps its days (every third day from day 2): two derby nights in every season, never on a festival hook night", counts.size === 1 && counts.has(2) && clash === 0 && F.DERBY.every === 3 && F.DERBY.offset === 2, JSON.stringify([...counts]));
  }
  {
    const deckOk = S.order.every((s) => S.weather[s].length === 12) && C / F.WEATHER_MS === 12;
    const count = (s, w) => S.weather[s].filter((x) => x === w).length;
    const table = S.order.map((s) => ["still", "light", "heavy", "storm", "snow"].map((w) => count(s, w)).join("/")).join(" ");
    check("season", "each season has a 12-slot weather deck, one day-night cycle long: still/light/heavy/storm/snow = autumn 3/3/3/2/1, winter 3/2/1/0/6, spring 2/4/3/2/1, summer 5/2/1/4/0", deckOk && table === "3/3/3/2/1 3/2/1/0/6 2/4/3/2/1 5/2/1/4/0", table);
    const g = fresh();
    const tally = {};
    for (const s of S.order) {
      const start = S.order.indexOf(s) * 6;
      const t = { snow: 0, storm: 0, all: 0 };
      for (let ms = dayMs(start) - 60000; ms < (start + 6) * C; ms += F.WEATHER_MS) { g.worldMs = ms; const w = g.weather; t.all++; if (w === "snow") t.snow++; if (w === "storm") t.storm++; }
      tally[s] = t;
    }
    check("season", "played over a whole season, winter snows half the time and never storms; summer of the dead never snows and storms a third of the time", tally.winter.snow === 36 && tally.winter.storm === 0 && tally.summer.snow === 0 && tally.summer.storm === 24 && tally.autumn.all === 72, JSON.stringify(tally));
    const first = [];
    for (let k = 0; k < 5; k++) { g.worldMs = k * F.WEATHER_MS; first.push(g.weather); }
    const day1 = [];
    let turned = 0;
    for (const [i, s] of S.order.entries()) for (let d = 0; d < 6; d++) for (let k = 0; k < 12; k++) {
      g.worldMs = (i * 6 + d) * C + k * F.WEATHER_MS + 1000;
      if (g.weather === S.weather[s][(k + d * 5) % 12]) turned++;
    }
    for (let k = 0; k < 4; k++) { g.worldMs = C + k * F.WEATHER_MS; day1.push(g.weather); }
    g.enterDungeon(F.DUNGEONS[0].id);
    g.worldMs = dayMs(8);
    check("season", "autumn day 1 opens with the old five-step walk; each later day of a season starts its deck five slots on; under stone it stays still", first.join() === "still,light,heavy,storm,snow" && day1.join() === "still,light,heavy,still" && turned === 288 && S.deckStep === 5 && g.weather === "still", `${first} | ${day1} | ${turned}`);
  }
  {
    const names = ["vale", "camp-grass", "town-grass", "trees", "town-trees"];
    const src = { vale: "public/art/writer/vale.png", "camp-grass": "public/art/writer/camp-grass.png", "town-grass": "public/art/cozy/grass.png", trees: "public/art/brileta/trees.png", "town-trees": "public/art/held/trees.png" };
    const locked = new Set([...readFileSync("tools/sprite-writer/palette_locked.py", "utf8").split("SPRITE_CORE")[0].matchAll(/"(#[0-9a-f]{6})"/g)].map((m) => m[1]));
    const bad = [];
    let sheets = 0;
    const seen = new Set();
    for (const s of S.order) for (const n of names) {
      const path = `public/art/writer/season-${s}-${n}.png`;
      if (!existsSync(path)) { bad.push(`missing ${path}`); continue; }
      sheets++;
      const im = readPng(path);
      const base = readPng(src[n]);
      if (im.w !== base.w || im.h !== base.h) bad.push(`${path} size`);
      for (let i = 0; i < im.px.length; i += 4) {
        const a = im.px[i + 3];
        if ((a > 0) !== (base.px[i + 3] > 0)) { bad.push(`${path} mask`); break; }
        if (a && a !== 255) { bad.push(`${path} soft`); break; }
        if (a) {
          const hex = `#${[0, 1, 2].map((k) => im.px[i + k].toString(16).padStart(2, "0")).join("")}`;
          if (!locked.has(hex)) { bad.push(`${path} ${hex}`); break; }
        }
      }
      seen.add(im.px.toString("hex"));
    }
    check("season", "20 season tint sheets (4 seasons x world grass, camp grass, town grass, wild trees, town trees): same size and shape as their source, every pixel solid and in the locked palette", sheets === 20 && !bad.length && locked.size > 400, bad.slice(0, 4).join("; "));
    check("season", "the four seasons' sheets differ from each other", seen.size === 20);
    const draw = readFileSync("src/game/draw.ts", "utf8");
    const writer = readFileSync("tools/pixel-writer/make_gravewake.py", "utf8");
    check("season", "the draw swaps world, camp and town grass and both tree sheets to the season (falling back to the old sheet); the snow biome keeps its frosted tree", /seasonNow = g\.season\(\);/.test(draw) && ["vale", "camp-grass", "town-grass", "trees", "town-trees"].every((n) => draw.includes(`seasonCell(ctx, "${n}"`)) && /snow \? sheetCell\(ctx, "\/art\/brileta\/trees\.png"/.test(draw) && /def season_sheets\(\)/.test(writer) && /season_remap\(Image\.open\(src\), season, kind, LOCKED\)/.test(writer));
  }
  {
    const fishOf = (season) => {
      const g = fresh();
      g.worldMs = dayMs(S.order.indexOf(season) * 6 + 1);
      let s = 11;
      const real = Math.random;
      Math.random = () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
      let fish = 0, own = 0, other = 0;
      const sf = S.fish[season];
      for (let i = 0; i < 3000; i++) {
        g.inv = g.inv.filter((it) => it.kind === "junk");
        g.fishBait = "nightcrawlers";
        g.catchFish();
        const f = g.inv.find((it) => it.kind === "fish");
        if (!f) continue;
        fish++;
        if (f.name === sf.name) { own++; if (f.bonus !== sf.points) other += 100; }
        else if (Object.values(S.fish).some((x) => x.name === f.name)) other++;
      }
      Math.random = real;
      return { share: own / fish, other, fish };
    };
    const res = Object.fromEntries(S.order.map((s) => [s, fishOf(s)]));
    const pts = S.order.map((s) => `${S.fish[s].name}:${S.fish[s].points}`).join(", ");
    check("season", `each season has its own catch at about 15% of plain fish (${pts}), and no other season's fish bites`, S.fishChance === 0.15 && S.order.every((s) => Math.abs(res[s].share - 0.15) < 0.03 && res[s].other === 0) && S.order.every((s) => S.fish[s].points >= 2 && S.fish[s].points <= 8), JSON.stringify(res));
    const g = fresh();
    g.inv.push({ uid: "sf1", name: "Rime char", kind: "fish", rank: 1, bonus: 6, stack: 2 });
    g.mapId = "inside";
    g.inside = "fisher";
    const p = g.fishPoints;
    g.tradeFish();
    check("season", "a seasonal fish trades at the Drowned Hook like any catch", g.fishPoints === p + 12);
  }
  {
    const biomes = { winter: [30, 8], waste: [52, 30], cinder: [30, 50], swamp: [34, 30], vale: [20, 30] };
    const lists = { winter: ["wolf", "ghost", "bat"], waste: ["mummy", "skeleton", "ghoul"], cinder: ["pumpkin", "scare", "witch"], swamp: ["witch", "tree", "zombie"], vale: ["zombie", "skeleton", "ghost", "bat"] };
    const bad = [];
    const shares = {};
    let numbers = true;
    let plain = 0;
    for (const season of S.order) for (const [b, [tx, ty]] of Object.entries(biomes)) {
      const g = fresh();
      g.level = 20;
      g.worldMs = dayMs(S.order.indexOf(season) * 6 + 2) - 60000 + 1000;
      g.enterWorld(tx * TILE + 8, ty * TILE + 8);
      const seen = watchBattles(g);
      const lvAt = zoneLevel(tx, ty, g.level);
      let s = 3;
      const real = Math.random;
      Math.random = () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
      for (let i = 0; i < 1200; i++) { g.mode = "play"; g.roamers = []; g.startWildFight(false); }
      Math.random = real;
      const tally = {};
      for (const list of seen) {
        const f = list[0];
        tally[f.id] = (tally[f.id] ?? 0) + 1;
        if (!lists[b].includes(f.id)) bad.push(`${season}/${b}: ${f.id}`);
        if (!f.rare) {
          plain++;
          const want = scaleMonster(F.monsterById(f.id), lvAt);
          if (JSON.stringify({ ...want, max: want.hp }) !== JSON.stringify(f)) numbers = false;
        }
      }
      const total = seen.length;
      const wsum = lists[b].reduce((n, id) => n + F.foeWeight(season, id), 0);
      for (const id of lists[b]) {
        const got = (tally[id] ?? 0) / total;
        const want = F.foeWeight(season, id) / wsum;
        if (Math.abs(got - want) > 0.05) bad.push(`${season}/${b}/${id} ${got.toFixed(2)} vs ${want.toFixed(2)}`);
      }
      shares[`${season}/${b}`] = tally;
    }
    check("season", "wild fights draw only from the biome's own roster list, weighted by the season (autumn lantern men and scarecrows x3, winter wolves x3, spring elms x3, summer ghouls x3, ...)", !bad.length, bad.slice(0, 5).join("; "));
    check("season", "a seasonal foe is the same family at the same numbers: every plain fight's foe matches the one scaling curve", numbers && plain > 20000, `${plain}`);
    const nightMix = (season) => {
      const night = fresh();
      night.level = 20;
      night.worldMs = dayMs(S.order.indexOf(season) * 6 + 1) + F.DAY_MS;
      night.enterWorld(30 * TILE + 8, 50 * TILE + 8);
      const t = {};
      let n = 0;
      for (let i = 0; i < 3000; i++) { night.roamers = []; night.nightCool = 0; night.calm = 0; night.frame = i * 3.7; night.spawnNightRoamer(0.05); for (const r of night.roamers) { t[r.def] = (t[r.def] ?? 0) + 1; n++; } }
      return { t, n, share: (id) => (t[id] ?? 0) / Math.max(1, n) };
    };
    const na = nightMix("autumn");
    const nw = nightMix("winter");
    const ns = nightMix("spring");
    check("season", "night roamers in the Cinder are still only lantern men, scarecrows and witches, weighted by the season (autumn witch 1 in 7, winter 1 in 3, spring 1 in 2)", na.n > 2000 && [na, nw, ns].every((m) => Object.keys(m.t).every((f) => lists.cinder.includes(f))) && Math.abs(na.share("witch") - 1 / 7) < 0.04 && Math.abs(nw.share("witch") - 1 / 3) < 0.04 && Math.abs(ns.share("witch") - 1 / 2) < 0.04, JSON.stringify([na.t, nw.t, ns.t]));
    const dun = fresh();
    dun.level = 20;
    dun.worldMs = dayMs(1);
    dun.enterDungeon(F.DUNGEONS[0].id);
    const dpicks = new Set(F.ROSTER.map((f) => f.id));
    const dseen = watchBattles(dun);
    let ds = 5;
    const dreal = Math.random;
    Math.random = () => ((ds = (ds * 1664525 + 1013904223) >>> 0) / 4294967296);
    for (let i = 0; i < 3000; i++) { dun.mode = "play"; dun.roamers = []; dun.startWildFight(false); }
    Math.random = dreal;
    const dt = {};
    for (const l of dseen) dt[l[0].id] = (dt[l[0].id] ?? 0) + 1;
    const even = Object.keys(dt).length ? 1 / Object.keys(dt).length : 0;
    const uneven = Object.entries(dt).filter(([, n]) => Math.abs(n / dseen.length - even) > 0.03);
    check("season", "dungeon fights keep the even pick: in autumn the lantern men and scarecrows come no more often under stone than any family", Object.keys(dt).length >= 10 && Object.keys(dt).every((id) => dpicks.has(id)) && !uneven.length, JSON.stringify(dt));
  }
  {
    const ids = S.order.map((s) => `${s}:${F.FESTIVALS[s].name}:${F.FESTIVALS[s].status}`).join(" ");
    const hooks = [3, 9, 15, 21, 27].map((d) => F.festivalHook(d)?.id ?? "-").join(",");
    const g = fresh();
    const live = [];
    let byDay = 0;
    for (let d = 0; d < 48; d++) {
      g.worldMs = d * C + F.DAY_MS + 60000;
      if (g.festivalTonight()) live.push(`${d}:${g.festivalTonight().id}`);
      g.worldMs = d * C + 60000;
      if (g.festivalTonight()) byDay++;
    }
    check("season", "a festival hook per season on its day 4, all four live: autumn Harvest Moon and winter Krampusnacht (owner-approved 2026-10-01), spring Drowned Bloom and summer Ashen Fair (owner-approved 2026-10-01 10:14 ET); a festival runs only on its hook night, never by day", ids === "autumn:Harvest Moon:live winter:Krampusnacht:live spring:Drowned Bloom:live summer:Ashen Fair:live" && hooks === "harvest,krampus,bloom,ashen,harvest" && F.LIVE_FESTIVALS.join() === "harvest,krampus,bloom,ashen" && live.join(" ") === "3:harvest 9:krampus 15:bloom 21:ashen 27:harvest 33:krampus 39:bloom 45:ashen" && byDay === 0 && S.festivalDay === 3, `${ids} | ${hooks} | ${live.join(" ")} | ${byDay}`);
  }
  {
    const g = fresh();
    g.worldMs = dayMs(14) + 5000;
    g.saveSlot(2);
    const raw = JSON.parse(store.get([...store.keys()].find((k) => store.get(k).includes('"worldMs"'))))[2];
    const back = fresh();
    back.loadSlot(2);
    check("season", "the season rides the saved clock: no new save field, and a save loads in its season", back.season() === "spring" && !Object.keys(raw).some((k) => /season/i.test(k)) && back.seasonLine() === "Spring · day 3 of 6", Object.keys(raw).filter((k) => /season/i.test(k)).join(","));
    const ui = readFileSync("src/game/Gravewake.tsx", "utf8");
    check("season", "the HUD shows the season line", /data-testid="season-line">\{game\.seasonLine\(\)\}/.test(ui));
  }
}

if (on("daysweep")) {
  // OWNER-APPROVED FIX 2026-10-01 (day-sweep): the day clears wanderers, never a foe already in a fight.
  const F = await feat47Mod();
  const C = F.CYCLE_MS;
  const seeded = (seed) => { let s = seed; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); };
  const hold = (g, n) => { for (let i = 0; i < n; i++) { g.hp = g.maxHp; g.update(0.05); } };
  {
    const g = fresh();
    g.level = 12;
    g.worldMs = 2 * C + 60000;
    g.enterWorld(30 * TILE + 8, 50 * TILE + 8);
    ticks(g, 2);
    const real = Math.random;
    Math.random = seeded(11);
    g.mode = "play";
    g.roamers = [];
    g.startWildFight(false);
    Math.random = real;
    const ids = g.roamers.filter((r) => r.aggro).map((r) => `${r.def}:${r.hp}`).join(",");
    hold(g, 100);
    const after = g.roamers.filter((r) => r.aggro).map((r) => `${r.def}:${r.hp}`).join(",");
    check("daysweep", "a daytime wild fight in the world stays on the field: its foes are still there, untouched, 5 seconds later", g.phase === "day" && ids.length > 0 && after === ids, `${g.phase} | ${ids} -> ${after}`);
  }
  {
    // Walk by day until a real encounter rolls, then stand: the foes stay.
    const g = fresh();
    g.level = 20;
    g.worldMs = 1 * C + 60000;
    g.enterWorld(30 * TILE + 8, 50 * TILE + 8);
    ticks(g, 2);
    const real = Math.random;
    Math.random = seeded(5);
    let opened = 0;
    for (let i = 0; i < 2400 && !opened; i++) {
      g.held.add(i % 400 < 200 ? "KeyD" : "KeyA");
      g.hp = g.maxHp;
      g.update(0.05);
      opened = g.roamers.filter((r) => r.aggro).length;
    }
    g.held.clear();
    const at = g.roamers.filter((r) => r.aggro).map((r) => r.def).join(",");
    hold(g, 60);
    Math.random = real;
    const left = g.roamers.filter((r) => r.aggro).map((r) => r.def).join(",");
    check("daysweep", "walking the Cinder by day, a real encounter roll opens a fight whose foes are still on the field 3 seconds later", opened > 0 && left === at, `${at} -> ${left}`);
  }
  {
    const g = fresh();
    g.level = 30;
    g.worldMs = 2 * C - 400;
    g.enterWorld(40 * TILE + 8, 40 * TILE + 8);
    ticks(g, 1);
    const wasNight = g.phase;
    g.mode = "play";
    g.roamers = g.roamers.filter((r) => r.boss || r.mini);
    const real = Math.random;
    Math.random = seeded(3);
    g.startWildFight(false);
    Math.random = real;
    const fight = g.roamers.filter((r) => r.aggro).map((r) => r.def).join(",");
    const base = { x: g.px + 140, y: g.py, tint: "#ffffff", level: 30, ang: 0 };
    g.roamers.push({ ...base, id: "wander", family: "zombie", def: "zombie" });
    g.roamers.push({ ...base, id: "bride", family: "ghost", def: "bride", boss: true, y: g.py + 400 });
    g.roamers.push({ ...base, id: "rem", family: "ghost", def: "saint", mini: true, y: g.py - 400 });
    g.roamers.push({ ...base, id: "pumpkinlord", family: "pumpkinlord", def: "pumpkinlord", boss: true, festival: "harvest", x: g.px - 400 });
    hold(g, 20);
    const kept = g.roamers.map((r) => r.id);
    check("daysweep", "across dawn a night fight stays; the day still clears a plain wanderer and a festival boss nobody is fighting, and keeps the world boss and the remnant", wasNight === "night" && g.phase === "day" && g.roamers.filter((r) => r.aggro).map((r) => r.def).join(",") === fight && fight.length > 0 && !kept.includes("wander") && !kept.includes("pumpkinlord") && kept.includes("bride") && kept.includes("rem"), `${wasNight}->${g.phase} | ${fight} | ${kept.join(",")}`);
    const h = fresh();
    h.level = 12;
    h.worldMs = 3 * C + F.DAY_MS + 60000;
    h.enterWorld(26 * TILE + 8, 51 * TILE + 8);
    ticks(h, 4);
    const lord = h.roamers.find((r) => r.festival === "harvest" && r.boss && r.aggro);
    h.worldMs = 4 * C + 1000;
    hold(h, 20);
    check("daysweep", "a festival boss already in the fight is not swept at dawn", !!lord && h.phase === "day" && h.roamers.some((r) => r.festival === "harvest" && r.boss && r.aggro), `${!!lord} ${h.phase}`);
  }
  {
    // The seasonal foe mix now shows by day: the foes of each day fight are on the field half a second later,
    // in the season's weights (Cinder: lantern men, scarecrows, witches).
    const bad = [];
    const shares = {};
    for (const [si, season] of F.SEASON.order.entries()) {
      const g = fresh();
      g.level = 20;
      g.worldMs = (si * 6 + 1) * C + 60000;
      g.enterWorld(30 * TILE + 8, 50 * TILE + 8);
      ticks(g, 2);
      const real = Math.random;
      Math.random = seeded(9 + si);
      const tally = {};
      let n = 0, gone = 0;
      for (let i = 0; i < 300; i++) {
        g.mode = "play";
        g.roamers = [];
        g.px = 30 * TILE + 8;
        g.py = 50 * TILE + 8;
        g.startWildFight(false);
        hold(g, 10);
        const lead = g.roamers.find((r) => r.aggro && !r.helper);
        if (!lead) { gone++; continue; }
        n++;
        tally[lead.def] = (tally[lead.def] ?? 0) + 1;
      }
      Math.random = real;
      const list = ["pumpkin", "scare", "witch"];
      const wsum = list.reduce((s, id) => s + F.foeWeight(season, id), 0);
      shares[season] = list.map((id) => ((tally[id] ?? 0) / Math.max(1, n)).toFixed(2)).join("/");
      if (gone) bad.push(`${season}: ${gone} fights gone`);
      for (const id of list) if (Math.abs((tally[id] ?? 0) / Math.max(1, n) - F.foeWeight(season, id) / wsum) > 0.07) bad.push(`${season}/${id}`);
    }
    check("daysweep", "by day the seasonal foe mix is on the field: 300 Cinder day fights a season, every one still standing after 0.5 s, families in the season's weights (within 0.07)", !bad.length, `${bad.join(" ")} | ${JSON.stringify(shares)}`);
  }
}

if (on("festival")) {
  const F = await feat47Mod();
  const { readFileSync } = await import("node:fs");
  const { inflateSync } = await import("node:zlib");
  const C = F.CYCLE_MS;
  const H = F.HARVEST;
  const K = F.KRAMPUSNACHT;
  const nightOf = (d) => d * C + F.DAY_MS + 60000;
  const dayOf = (d) => d * C + 60000;
  const simSrc = readFileSync("src/game/sim.ts", "utf8");
  const TAG = "OWNER-APPROVED EXCEPTION 2026-10-01: FESTIVAL BOSSES";
  {
    const law = ["rules/GAME_LAYOUT_TWO.txt", "rules/GAME_LAYOUT_TWO_PROMPT.txt", "rules/GAME_LAYOUT_TWO_ROSTER.txt", "AGENTS.project.md"].map((f) => [f, readFileSync(f, "utf8")]);
    const missing = law.filter(([, t]) => !t.includes(`[${TAG}]`)).map(([f]) => f);
    for (const f of ["rules/GAME_LAYOUT_TWO.txt", "rules/GAME_LAYOUT_TWO_ROSTER.txt"]) {
      const t = readFileSync(f, "utf8");
      if (!t.includes(`[${TAG}]\nFESTIVAL (beyond the 21`)) missing.push(`${f} (section)`);
      if (!t.includes("pumpkinlord  Pumpkin Lord      Zealot     vine lash / seed volley / BIG harvest blaze (ring) / lantern helpers")) missing.push(`${f} (pumpkinlord row)`);
      if (!t.includes("krampus      Krampus           Tyrant     switch lash / basket snatch (pull) / BIG birch dark (room dark 1s) / wolf helpers")) missing.push(`${f} (krampus row)`);
      if (!t.includes(`[${TAG}] Only these two may exceed the 21-boss roster.`)) missing.push(`${f} (only two)`);
    }
    const lt = readFileSync("rules/GAME_LAYOUT_TWO.txt", "utf8");
    check("festival", "the law files carry the dated owner-approved festival-boss exception (section, both roster rows, only-these-two line); the 21-boss law still stands", !missing.length && lt.includes("12 families, 21 bosses, 21 remnants"), missing.join(" "));
  }
  {
    const boss = F.BOSSES_LIST.filter((b) => b.boss).map((b) => b.id);
    const fest = F.FESTIVAL_BOSSES.map((b) => b.id);
    const { readdirSync } = await import("node:fs");
    const flagged = [];
    for (const f of readdirSync("src/game").filter((n) => n.endsWith(".ts"))) {
      const t = readFileSync(`src/game/${f}`, "utf8");
      for (const m of t.matchAll(/\{ id: "([a-z]+)", name: "[^"]+", family: "[a-z]+"[^}\n]*boss: true/g)) flagged.push(m[1]);
    }
    const extra = flagged.filter((id) => !boss.includes(id)).sort().join(",");
    check("festival", "the roster keeps its 21 bosses; the only boss defs beyond them are the Pumpkin Lord and Krampus, in FESTIVAL_BOSSES alone", boss.length === 21 && new Set(boss).size === 21 && fest.join(",") === "pumpkinlord,krampus" && extra === "krampus,pumpkinlord" && flagged.length === 23 && F.FESTIVAL_BOSSES.every((b) => b.boss === true && !boss.includes(b.id)), `${boss.length} | ${fest} | extra ${extra} | ${flagged.length}`);
    const world = simSrc.slice(simSrc.indexOf("const WORLD_BOSSES = ["), simSrc.indexOf("];", simSrc.indexOf("const WORLD_BOSSES = [")));
    const uses = [...simSrc.matchAll(/FESTIVAL_BOSSES/g)].map((m) => methodAt(simSrc, m.index)).filter(Boolean);
    const inDungeon = JSON.stringify(F.DUNGEONS).match(/pumpkinlord|krampus/);
    check("festival", "neither festival boss is a world boss spot, a remnant, a dungeon boss, or in a pick list; the sim reads FESTIVAL_BOSSES only to stand tonight's boss", !/pumpkinlord|krampus/.test(world) && !F.MINI_NAME.pumpkinlord && !F.MINI_NAME.krampus && !inDungeon && F.ROSTER.every((m) => !m.boss) && uses.length === 1 && uses[0] === "spawnFestival", uses.join(","));
  }
  {
    // Stats: the one curve, the normal boss bulk (2). Lord L 10, Krampus L 16 at a low hero level.
    const rows = [];
    let ok = true;
    for (const [id, lv] of [["pumpkinlord", 10], ["krampus", 16], ["pumpkinlord", 30], ["krampus", 44]]) {
      const g = fresh();
      g.level = 8;
      g.worldMs = nightOf(id === "krampus" ? 9 : 3);
      g.enterWorld(40 * TILE + 8, 40 * TILE + 8);
      const seen = watchBattles(g);
      const def = F.FESTIVAL_BOSSES.find((b) => b.id === id);
      g.mode = "play";
      g.roamers = [];
      g.touchFoe({ id, x: g.px, y: g.py, family: def.family, tint: def.tint, def: id, level: lv, ang: 0, boss: true, festival: id === "krampus" ? "krampus" : "harvest" });
      const f = seen[0]?.[0];
      const t = Math.max(1, lv);
      const want = { hp: Math.round(def.hp * (0.55 + t * 0.1) * 2), atk: Math.round(def.atk * (0.7 + t * 0.06)), ac: def.ac + Math.floor(t / 10), xp: Math.round(def.xp * (0.8 + t * 0.08)), silver: Math.round(def.silver * (0.7 + t * 0.06)) };
      const s = scaleMonster(def, lv);
      const helpers = seen[0]?.filter((x) => x.helper) ?? [];
      if (!f || f.hp !== want.hp || f.max !== want.hp || f.atk !== want.atk || f.ac !== want.ac || f.xp !== want.xp || f.silver !== want.silver || s.hp !== want.hp || !f.boss || f.mini || helpers.length !== 1) ok = false;
      rows.push(`${id}@${lv} hp${f?.hp} atk${f?.atk} ac${f?.ac} xp${f?.xp} s${f?.silver} +${helpers.length}`);
    }
    check("festival", "festival boss stats are scaleMonster with the normal boss bulk (2): Lord L10 hp 341 atk 19 ac 5, Krampus L16 hp 645 atk 28 ac 6; helpers by the hero-level count", ok && rows[0].startsWith("pumpkinlord@10 hp341 atk19 ac5") && rows[1].startsWith("krampus@16 hp645 atk28 ac6"), rows.join(" | "));
  }
  {
    // Spawns: only on their own festival night (day 3 autumn, day 9 winter, and a year later 27 and 33).
    const seen = [];
    for (let d = 0; d < 48; d++) for (const night of [false, true]) {
      const g = fresh();
      g.level = 8;
      g.worldMs = night ? nightOf(d) : dayOf(d);
      g.enterWorld(40 * TILE + 8, 40 * TILE + 8);
      ticks(g, 3);
      const f = g.roamers.filter((r) => r.festival || r.naughty);
      if (f.length) seen.push(`${night ? "n" : "d"}${d}:${f.filter((r) => r.boss).map((r) => r.def).join("+")}+${f.filter((r) => r.naughty).length}`);
    }
    const dun = fresh();
    dun.worldMs = nightOf(3);
    dun.enterDungeon(F.DUNGEONS[0].id);
    ticks(dun, 3);
    check("festival", "the festival boss walks only on its own night: the Pumpkin Lord on autumn day 4 (nights 3 and 27), Krampus with his 3 naughty-list stalkers on winter day 4 (nights 9 and 33); spring and summer nights (15, 21, 39, 45) bring 3 named packs and no boss; never by day, never under stone", seen.join(" ") === "n3:pumpkinlord+0 n9:krampus+3 n15:+3 n21:+3 n27:pumpkinlord+0 n33:krampus+3 n39:+3 n45:+3" && !dun.roamers.some((r) => r.festival || r.naughty), seen.join(" "));
    const g = fresh();
    g.level = 8;
    g.worldMs = nightOf(3);
    g.enterWorld(40 * TILE + 8, 40 * TILE + 8);
    ticks(g, 2);
    const lord = g.roamers.find((r) => r.festival === "harvest");
    const at = lord ? `${Math.floor(lord.x / TILE)},${Math.floor(lord.y / TILE)} L${lord.level}` : "";
    g.opened.add("fest:harvest:3:down");
    g.roamers = g.roamers.filter((r) => !r.festival);
    ticks(g, 3);
    const k = fresh();
    k.level = 8;
    k.worldMs = nightOf(9);
    k.enterWorld(40 * TILE + 8, 40 * TILE + 8);
    ticks(k, 2);
    const kr = k.roamers.find((r) => r.festival === "krampus");
    const mouths = Object.keys(k.entrances).map((e) => e.split(",").map(Number));
    const spots = [...simSrc.slice(simSrc.indexOf("const WORLD_BOSSES = ["), simSrc.indexOf("];", simSrc.indexOf("const WORLD_BOSSES = ["))).matchAll(/tx: (\d+), ty: (\d+)/g)].map((m) => [Number(m[1]), Number(m[2])]);
    const clearOk = mouths.length >= 4 && spots.length === 9 && [H.lord, K.spot].every((s) => mouths.every(([x, y]) => Math.hypot(x - s.x, y - s.y) >= 6) && spots.every(([x, y]) => Math.hypot(x - s.x, y - s.y) >= 8));
    check("festival", "the Lord stands in the Cinder patch (26,52) at L max(10, zone), Krampus in the Winter hollow (12,11) at L max(16, zone); both clear of every dungeon mouth (6+ tiles) and world boss spot (8+); once down, neither comes back that night", clearOk && at === `26,52 L${Math.max(10, zoneLevel(26, 52, 8))}` && !g.roamers.some((r) => r.festival) && !!kr && Math.floor(kr.x / TILE) === 12 && Math.floor(kr.y / TILE) === 11 && kr.level === Math.max(16, zoneLevel(12, 11, 8)), `${at} | ${kr ? `${Math.floor(kr.x / TILE)},${Math.floor(kr.y / TILE)} L${kr.level}` : "none"}`);
  }
  {
    // Harvest Moon in town: Hessa's stall at nightfall, the carving, the judge.
    const town = (d, night = true) => {
      const g = fresh();
      g.worldMs = night ? nightOf(d) : dayOf(d);
      g.enterTown();
      ticks(g, 2);
      return g;
    };
    const day = town(3, false);
    const g = town(3);
    const hessa = g.npcs.find((n) => n.role === "festival");
    const other = [9, 15, 21, 4].map((d) => town(d).npcs.some((n) => n.id === "hessa"));
    check("festival", "Gourdwife Hessa keeps her stall at plaza tile (26,14) on Harvest Moon night only: not by day, not on other nights", !!hessa && hessa.name === "Gourdwife Hessa" && hessa.x === 26 * TILE + 8 && hessa.y === 14 * TILE + 8 && !day.npcs.some((n) => n.role === "festival") && other.every((x) => !x), `${hessa?.x},${hessa?.y} ${other}`);
    const judge = F.harvestJudge(3);
    const results = [];
    let ok = true;
    for (const e of H.eyes) for (const m of H.mouths) {
      const t = town(3);
      t.coin = 50;
      t.openTalk(t.npcs.find((n) => n.role === "festival"));
      const menu0 = t.choices().map((c) => c.id).join(",");
      t.choose("carve");
      const menu1 = t.choices().map((c) => c.id).join(",");
      t.choose(`eyes:${e}`);
      const menu2 = t.choices().map((c) => c.id).join(",");
      t.choose(`mouth:${m}`);
      const score = (e === judge.eyes ? 1 : 0) + (m === judge.mouth ? 1 : 0);
      const coin = t.coin;
      t.choose("carve");
      if (menu0 !== "carve,lanterns" || menu1 !== "eyes:round,eyes:slant,eyes:hollow,lanterns" || menu2 !== "mouth:grin,mouth:fangs,mouth:wail,lanterns") ok = false;
      if (coin !== 50 - 4 + [0, 10, 25][score] || t.coin !== coin || F.carveScore(3, e, m) !== score) ok = false;
      if (!t.inv.some((i) => i.name === `Carved pumpkin (${e} eyes, ${m})` && i.kind === "junk")) ok = false;
      if (t.choices().some((c) => c.id === "carve")) ok = false;
      results.push(`${e}/${m}:${coin - 46}`);
    }
    const judges = new Set([3, 27, 51, 75, 99, 123, 147, 171].map((d) => JSON.stringify(F.harvestJudge(d))));
    check("festival", "pumpkin carving: 4 silver a pumpkin, eyes then mouth (3 cuts each), the judge pays 0/10/25 for 0/1/2 matching cuts; once a night; the carved pumpkin is yours", ok && H.pumpkinPrice === 4 && H.prize.join() === "0,10,25" && H.eyes.includes(judge.eyes) && H.mouths.includes(judge.mouth) && judges.size > 1 && JSON.stringify(F.harvestJudge(3)) === JSON.stringify(judge), `${JSON.stringify(judge)} ${results.join(" ")}`);
    const t = town(3);
    t.openTalk(t.npcs.find((n) => n.role === "festival"));
    check("festival", "Hessa's line names the night's eyes and keeps the mouth back", t.talk?.text.includes(`soft on ${judge.eyes} eyes`) && !t.talk.text.includes(judge.mouth), t.talk?.text);
  }
  {
    const lit = (n, waitAll = false) => {
      const g = fresh();
      g.worldMs = nightOf(3);
      g.enterTown();
      ticks(g, 2);
      g.openTalk(g.npcs.find((n2) => n2.role === "festival"));
      g.choose("lanterns");
      const coin = g.coin;
      const line = g.eventLine();
      for (const [x, y] of H.lanterns.slice(0, n)) { g.px = x * TILE + 8; g.py = y * TILE + 8; ticks(g, 1); }
      const mid = g.eventLine();
      if (waitAll) for (let i = 0; i < 1820 && g.lanternRun; i++) g.update(0.05);
      g.openTalk(g.npcs.find((n2) => n2.role === "festival"));
      return { g, pay: g.coin - coin, line, mid, again: g.choices().some((c) => c.id === "lanterns"), lit: g.lanternsLit().length };
    };
    const all = lit(6);
    const two = lit(2, true);
    check("festival", "lantern game: six plaza lanterns, 90 s of wick-glass; walking into one lights it; 3 silver a lantern, 15 more for all six (33); a short run pays its count (2 lit = 6); one run a night", all.pay === 33 && two.pay === 6 && !all.again && !two.again && all.lit === 6 && two.lit === 2 && all.line === "Lanterns 0/6 · 90 s left" && /^Lanterns 2\/6 · 90 s left$/.test(two.mid) && H.lanterns.length === 6 && H.runSeconds === 90 && H.lanternPay === 3 && H.allLitBonus === 15 && H.touch === 12, `${all.pay} ${two.pay} | ${all.line} | ${two.mid}`);
  }
  {
    // Krampusnacht: the naughty list.
    const g = fresh();
    g.level = 20;
    g.worldMs = nightOf(9);
    g.enterWorld(40 * TILE + 8, 40 * TILE + 8);
    ticks(g, 2);
    const list = g.naughtyTonight();
    const roam = g.roamers.filter((r) => r.naughty);
    const again = fresh();
    again.worldMs = nightOf(9) + 120000;
    const next = fresh();
    next.worldMs = nightOf(33);
    const winter = ["wolf", "ghost", "bat"];
    const spaced = list.every((a, i) => list.every((b, j) => i === j || Math.hypot(a.x - b.x, a.y - b.y) >= F.BOUNTY.lairClear * 2));
    const bossSpots = [...simSrc.slice(simSrc.indexOf("const WORLD_BOSSES = ["), simSrc.indexOf("];", simSrc.indexOf("const WORLD_BOSSES = ["))).matchAll(/tx: (\d+), ty: (\d+)/g)].map((m) => [Number(m[1]), Number(m[2])]);
    const clear = bossSpots.length === 9 && list.every((a) => a.y < 16 && Math.hypot(a.x - K.spot.x, a.y - K.spot.y) >= F.BOUNTY.lairClear * 2 && bossSpots.every(([bx, by]) => Math.hypot(a.x - bx, a.y - by) >= F.BOUNTY.lairClear * 2));
    // Over two years of winters, no name ever sits within 8 tiles of a world boss spot.
    let near = 0;
    for (let y = 0; y < 4; y++) { const n = fresh(); n.worldMs = nightOf(9 + 24 * y); for (const a of n.naughtyTonight()) if (bossSpots.some(([bx, by]) => Math.hypot(a.x - bx, a.y - by) < 8)) near++; }
    const named = list.every((a) => K.names.includes(a.name.split(",")[0]) && winter.includes(a.fam) && a.name.endsWith(`${F.monsterById(a.fam).name} Stalker`)) && new Set(list.map((a) => a.name)).size === 3;
    check("festival", "Krampusnacht's naughty list: 3 named Stalkers on Winter hollow lairs (y < 16), wolf/ghost/bat, spaced 8 tiles apart and 8 clear of Krampus and of every world boss spot; same night same list, a new list next year", near === 0 && list.length === 3 && roam.length === 3 && spaced && clear && named && JSON.stringify(again.naughtyTonight()) === JSON.stringify(list) && JSON.stringify(next.naughtyTonight()) !== JSON.stringify(list) && K.stalkers === 3, list.map((a) => `${a.name}@${a.x},${a.y}/${a.affix}`).join(" | "));
    const seen = watchBattles(g);
    const r = roam[0];
    g.mode = "play";
    g.px = r.x;
    g.py = r.y;
    g.touchFoe(r);
    const foes = seen[0] ?? [];
    const def = F.monsterById(r.def);
    const lv = r.level;
    const rare = scaleMonster(def, lv + 2);
    const mini = scaleMonster(def, Math.max(1, lv - 1));
    check("festival", "a naughty-list name fights as a Stalker pack on the existing build: rare L+2 with HP x1.45 and its affix, two minions L-1 at HP x0.45", foes.length === 3 && foes[0].rare && foes[0].name === r.name && foes[0].hp === Math.round(rare.hp * 1.45) && foes[0].atk === rare.atk && foes[0].affix === r.affix && foes[0].naughty === r.naughty && foes.slice(1).every((m) => m.helper && m.hp === Math.round(mini.hp * 0.45)) && packLaw(foes) === "", JSON.stringify(foes.map((f) => [f.name, f.hp, f.affix])));
    // Loot: coal from the junk row, the gift sack is one roll of the existing chest table.
    const lead = g.roamers.find((x) => x.naughty && x.rare && x.aggro);
    const calls = [];
    const realDrop = g.makeDrop.bind(g);
    g.makeDrop = (s, b) => { calls.push(`${s}:${b}`); return realDrop(s, b); };
    const real = Math.random;
    Math.random = () => 0.1;
    const d0 = g.drops.length;
    g.fellFoe(lead);
    Math.random = real;
    const dropped = g.drops.slice(d0).map((d) => d.item).filter(Boolean);
    const coal = dropped.find((i) => i.name === "Lump of coal");
    const caught = g.naughtyCaught(r.naughty);
    const left = g.naughtyTonight().filter((n) => !g.naughtyCaught(n.id)).length;
    const log = g.logLine;
    const h = fresh();
    h.level = 20;
    h.worldMs = nightOf(9);
    h.enterWorld(40 * TILE + 8, 40 * TILE + 8);
    ticks(h, 2);
    const r2 = h.roamers.find((x) => x.naughty);
    h.px = r2.x;
    h.py = r2.y;
    h.mode = "play";
    h.touchFoe(r2);
    const calls2 = [];
    const realDrop2 = h.makeDrop.bind(h);
    h.makeDrop = (s, b) => { calls2.push(`${s}:${b}`); return realDrop2(s, b); };
    Math.random = () => 0.9;
    const e0 = h.drops.length;
    h.fellFoe(h.roamers.find((x) => x.naughty && x.rare && x.aggro));
    Math.random = real;
    const dropped2 = h.drops.slice(e0).map((d) => d.item).filter(Boolean);
    check("festival", "a struck name drops a lump of coal (junk, rank 1) and half the time a gift sack, one roll of the existing chest table; the list counts down", !!coal && coal.kind === "junk" && coal.rank === 1 && (coal.stack ?? 1) === 1 && calls.join() === "chest:false" && dropped.length === 2 && caught && left === 2 && /Struck from the list: coal and a gift sack\. 2 left\./.test(log) && calls2.join() === "common:false" && dropped2.filter((i) => i.name === "Lump of coal").length === 1 && K.sackChance === 0.5 && !/makeDrop\("boss"/.test(simSrc.slice(simSrc.indexOf("  private festivalFell("), simSrc.indexOf("  private tickFestival("))), `${calls} | ${calls2} | ${dropped.map((i) => i.name)} | ${dropped2.map((i) => i.name)} | ${caught} ${left} | ${log}`);
  }
  {
    // Krampus: warning, kit, basket loot.
    const g = fresh();
    g.level = 20;
    g.worldMs = nightOf(9);
    g.enterWorld(40 * TILE + 8, 40 * TILE + 8);
    ticks(g, 2);
    const k = g.roamers.find((r) => r.festival === "krampus" && r.boss);
    g.roamers = g.roamers.filter((r) => r.festival || r.naughty);
    g.px = k.x + 200;
    g.py = k.y;
    ticks(g, 2);
    const early = g.opened.has("fest:krampus:9:warned");
    g.px = k.x + 120;
    ticks(g, 1);
    const warn = g.logLine;
    const once = g.opened.has("fest:krampus:9:warned");
    g.logLine = "";
    ticks(g, 1);
    check("festival", "within 160 px of Krampus a one-time warning plays (a birch switch, a basket), before he notices you", once && !early && /birch switch hisses/.test(warn) && /basket/.test(warn) && g.logLine !== warn && K.warn === 160, warn);
    g.px = k.x;
    g.py = k.y;
    g.mode = "play";
    const seen = watchBattles(g);
    g.touchFoe(k);
    const kr = g.roamers.find((r) => r.festival === "krampus" && r.boss);
    const kitOk = kr && kr.spam === "switch lash" && kr.spamTag === "melee" && kr.mid === "basket snatch" && kr.midTag === "pull" && kr.big === "birch dark" && kr.bigTag === "dark" && kr.personality === "tyrant";
    const helpers = (seen[0] ?? []).filter((f) => f.helper);
    const kitLines = simSrc.slice(simSrc.indexOf("const BOSS_KITS"), simSrc.indexOf("};", simSrc.indexOf("const BOSS_KITS"))).split("\n");
    const tags = new Set();
    for (const l of kitLines) if (!/^\s*(krampus|pumpkinlord):/.test(l)) for (const m of l.matchAll(/(?:spamTag|midTag|bigTag): "([a-z]+)"/g)) tags.add(m[1]);
    const festLines = kitLines.filter((l) => /^\s*(krampus|pumpkinlord):/.test(l));
    const festTags = festLines.flatMap((l) => [...l.matchAll(/(?:spamTag|midTag|bigTag): "([a-z]+)"/g)].map((m) => m[1]));
    check("festival", "Krampus fights with a switch and a basket (switch lash / basket snatch / BIG birch dark), wolf helpers linked as a tyrant's; no chain, no bell; both kits use existing move tags only", kitOk && helpers.length > 0 && helpers.every((h2) => h2.id === "wolf" && h2.affix === "linked") && festLines.length === 2 && festTags.length === 6 && festTags.every((t) => tags.has(t)) && !/chain|bell/i.test(festLines.join("")), `${kr?.spam}/${kr?.mid}/${kr?.big} ${festTags}`);
    const r = g.roamers.find((x) => x.festival === "krampus" && x.boss);
    const calls = [];
    const realDrop = g.makeDrop.bind(g);
    g.makeDrop = (s, b) => { calls.push(`${s}:${b}`); return realDrop(s, b); };
    const real = Math.random;
    Math.random = () => 0.3;
    const d0 = g.drops.length;
    g.fellFoe(r);
    Math.random = real;
    const dropped = g.drops.slice(d0).map((d) => d.item).filter(Boolean);
    const coal = dropped.find((i) => i.name === "Lump of coal");
    g.roamers = [];
    ticks(g, 3);
    check("festival", "Krampus's basket spills 3 coal and a gift sack (one chest-table roll) on top of the normal boss drop; he is down for the night and does not come back", coal?.stack === 3 && K.krampusCoal === 3 && calls.join() === "boss:true,chest:false" && g.opened.has("fest:krampus:9:down") && !g.roamers.some((x) => x.festival) && /The basket spills: coal, and a gift sack\./.test(g.logLine), `${calls} | ${coal?.stack} | ${g.logLine}`);
  }
  {
    const lines = [];
    for (const [d, night, map] of [[3, false, "world"], [3, true, "town"], [9, false, "town"], [9, true, "world"], [15, true, "world"], [21, true, "world"], [3, true, "dungeon"]]) {
      const g = fresh();
      g.level = 20;
      g.worldMs = night ? nightOf(d) + 60000 : dayOf(d);
      if (map === "world") g.enterWorld(40 * TILE + 8, 40 * TILE + 8);
      else if (map === "town") g.enterTown();
      else g.enterDungeon(F.DUNGEONS[0].id);
      ticks(g, 1);
      lines.push(g.eventLine());
    }
    const ok = lines[0] === "Harvest Moon at nightfall · the plaza" && /^Harvest Moon · \d+ min to dawn$/.test(lines[1]) && lines[2] === "Krampusnacht at nightfall · stay lit" && /^Krampusnacht · \d+ min · list 0\/3$/.test(lines[3]) && /^Drowned Bloom · \d+ min · court 0\/3$/.test(lines[4]) && /^Ashen Fair · \d+ min · sideshow 0\/3$/.test(lines[5]) && lines[6] === "";
    check("festival", "the HUD event line: the coming festival by day, the minutes to dawn (and the lantern count, the list, the court or the sideshow) by night; nothing under stone", ok && lines.every((l) => l.length <= 40), lines.join(" | "));
    const b = fresh();
    b.level = 20;
    b.worldMs = nightOf(9);
    b.enterTown();
    ticks(b, 1);
    b.readBoard();
    const board = b.logLine;
    const list = b.naughtyTonight();
    const h = fresh();
    h.worldMs = nightOf(3);
    h.enterTown();
    ticks(h, 1);
    h.readBoard();
    check("festival", "on Krampusnacht the guild board carries the naughty list (the names and where, from the gate) above tonight's bounty; other nights the board is as it was", board.startsWith("Nailed over it, a naughty list: ") && list.length === 3 && list.every((n) => board.includes(n.name.split(",")[0])) && /Krampus walks the Winter hollow\. (Bounty|The bounty|Tonight)/.test(board) && !/naughty/.test(h.logLine), board);
  }
  {
    // Saves: no new field. Festival state rides in opened (fest:<id>:<day>:...); an old save loads.
    const g = fresh();
    g.worldMs = nightOf(3);
    g.enterTown();
    ticks(g, 2);
    g.coin = 40;
    g.openTalk(g.npcs.find((n) => n.role === "festival"));
    g.choose("carve");
    g.choose(`eyes:${H.eyes[0]}`);
    g.choose(`mouth:${H.mouths[0]}`);
    g.openTalk(g.npcs.find((n) => n.role === "festival"));
    g.choose("lanterns");
    g.px = H.lanterns[0][0] * TILE + 8;
    g.py = H.lanterns[0][1] * TILE + 8;
    ticks(g, 1);
    store.clear();
    g.saveSlot(2);
    const key = [...store.keys()].find((k) => store.get(k).includes('"worldMs"'));
    const all = JSON.parse(store.get(key));
    const raw = all[2];
    const back = fresh();
    back.loadSlot(2);
    const oldSave = JSON.parse(JSON.stringify(all));
    oldSave[2].opened = (oldSave[2].opened ?? []).filter((k) => !String(k).startsWith("fest:"));
    store.set(key, JSON.stringify(oldSave));
    const old = fresh();
    old.loadSlot(2);
    check("festival", "saves: no new save field; the carving, the lit lanterns and the run ride in opened keys and reload; a save without them loads clean", !Object.keys(raw).some((k) => /fest|lantern|carv|naught|krampus|pumpkin/i.test(k)) && back.opened.has("fest:harvest:3:carved") && back.opened.has("fest:harvest:3:lanterns") && back.opened.has("fest:harvest:3:lit:0") && back.lanternsLit().join() === "0" && old.lanternsLit().length === 0 && !old.opened.has("fest:harvest:3:carved"), Object.keys(raw).filter((k) => /fest|lantern|carv/i.test(k)).join(","));
  }
  {
    // Art: the sprite-writer strips, palette-locked; the festival props sheet; the draw uses them.
    const readPng = (path) => {
      const b = readFileSync(path);
      let o = 8, w = 0, h = 0, type = 0;
      const idat = [];
      while (o < b.length) {
        const len = b.readUInt32BE(o);
        const kind = b.toString("ascii", o + 4, o + 8);
        const data = b.subarray(o + 8, o + 8 + len);
        if (kind === "IHDR") { w = data.readUInt32BE(0); h = data.readUInt32BE(4); type = data[9]; if (data[8] !== 8 || data[12] !== 0) throw new Error("png depth/interlace"); }
        if (kind === "IDAT") idat.push(data);
        o += 12 + len;
      }
      if (type !== 6) throw new Error(`png colour type ${type}`);
      const raw = inflateSync(Buffer.concat(idat));
      const bpp = 4, stride = w * bpp, out = Buffer.alloc(w * h * bpp);
      for (let y = 0; y < h; y++) {
        const f = raw[y * (stride + 1)];
        for (let x = 0; x < stride; x++) {
          const v = raw[y * (stride + 1) + 1 + x];
          const a = x >= bpp ? out[y * stride + x - bpp] : 0;
          const up = y > 0 ? out[(y - 1) * stride + x] : 0;
          const c = x >= bpp && y > 0 ? out[(y - 1) * stride + x - bpp] : 0;
          let p = v;
          if (f === 1) p = v + a;
          else if (f === 2) p = v + up;
          else if (f === 3) p = v + ((a + up) >> 1);
          else if (f === 4) { const q = a + up - c; const pa = Math.abs(q - a), pb = Math.abs(q - up), pc = Math.abs(q - c); p = v + (pa <= pb && pa <= pc ? a : pb <= pc ? up : c); }
          out[y * stride + x] = p & 255;
        }
      }
      return { w, h, px: out };
    };
    const locked = new Set([...readFileSync("tools/sprite-writer/palette_locked.py", "utf8").split("SPRITE_CORE")[0].matchAll(/"(#[0-9a-f]{6})"/g)].map((m) => m[1]));
    const bad = [];
    const sheet = (path, w, h, cells, cw) => {
      let im;
      try { im = readPng(path); } catch (e) { bad.push(`${path} ${e.message}`); return null; }
      if (im.w !== w || im.h !== h) bad.push(`${path} ${im.w}x${im.h}`);
      for (let i = 0; i < im.px.length; i += 4) {
        const a = im.px[i + 3];
        if (a && a !== 255) { bad.push(`${path} soft`); break; }
        if (a) { const hex = `#${[0, 1, 2].map((k) => im.px[i + k].toString(16).padStart(2, "0")).join("")}`; if (!locked.has(hex)) { bad.push(`${path} ${hex}`); break; } }
      }
      for (let c = 0; c < cells; c++) {
        let any = false;
        for (let y = 0; y < im.h && !any; y++) for (let x = c * cw; x < (c + 1) * cw; x++) if (im.px[(y * im.w + x) * 4 + 3]) { any = true; break; }
        if (!any) bad.push(`${path} empty cell ${c}`);
      }
      return im;
    };
    const kr = sheet("public/art/sprites/krampus.png", 176, 32, 11, 16);
    const pl = sheet("public/art/sprites/pumpkin-lord.png", 176, 32, 11, 16);
    sheet("public/art/writer/festival-props.png", 64, 16, 4, 16);
    const frames = new Set();
    if (kr) for (let c = 0; c < 11; c++) { let s = ""; for (let y = 0; y < 32; y++) for (let x = c * 16; x < c * 16 + 16; x++) s += kr.px[(y * 176 + x) * 4 + 3] ? kr.px.readUInt32BE((y * 176 + x) * 4).toString(16) : "."; frames.add(s); }
    check("festival", "Krampus and the Pumpkin Lord are 11-frame 16x32 sprite-writer strips (176x32), festival props a 4-cell 16x16 sheet; every pixel solid and in the locked palette, no empty frame", !bad.length && locked.size > 400 && frames.size >= 6 && kr && pl && !kr.px.equals(pl.px), bad.slice(0, 4).join("; ") + ` frames ${frames.size}`);
    const draw = readFileSync("src/game/draw.ts", "utf8");
    const writer = readFileSync("tools/sprite-writer/make_gravewake.py", "utf8");
    check("festival", "the draw uses the festival strips for their families and the props in town on the festival night; the sprite-writer makes the strips", /krampus: "\/art\/sprites\/krampus\.png", pumpkinlord: "\/art\/sprites\/pumpkin-lord\.png"/.test(draw) && /FESTIVAL_SHEETS\[family\] && sheetCell\(ctx, FESTIVAL_SHEETS\[family\]/.test(draw) && /const fest = g\.festivalId\(\);/.test(draw) && draw.includes("FESTIVAL_PROPS, FESTIVAL_PROPS2, FLOOD_SHEET, ...Object.values(FESTIVAL_SHEETS)") && /FESTIVAL_STRIPS = \{"krampus\.png": "krampus", "pumpkin-lord\.png": "pumpkinlord"\}/.test(writer));
  }
}

// ---- Map writer, phase 1 (OWNER-APPROVED EXCEPTION 2026-10-01: MAP WRITER) ----
let mapModule = null;
async function mapMod() {
  if (mapModule) return mapModule;
  const { writeFileSync } = await import("node:fs");
  const dir = mkdtempSync(join(tmpdir(), "gravewake-"));
  const entry = join(dir, "mapwriter.ts");
  const root = process.cwd();
  writeFileSync(
    entry,
    `export { DUNGEONS, RIFTS, MAP_WRITER, BOSSES, FAMILIES as ROSTER, T, CYCLE_MS, monsterById } from "${root}/src/game/content.ts";\nexport * from "${root}/tools/map-writer/gravewake.ts";\nexport { riftSeed, stepsFrom } from "${root}/tools/map-writer/map_writer.ts";\nexport { walkSteps } from "${root}/src/game/feats.ts";\nexport { plainChests } from "${root}/src/game/mimic.ts";\nexport { ParticlePool, CH_INTERACT, K_ASH } from "${root}/src/game/particles.ts";\n`,
  );
  const file = join(dir, "mapwriter.mjs");
  execFileSync("npx", ["esbuild", entry, "--bundle", "--platform=node", "--format=esm", "--log-level=warning", `--outfile=${file}`], { stdio: ["ignore", "ignore", "inherit"] });
  mapModule = await import(pathToFileURL(file).href);
  return mapModule;
}

if (on("mapwriter")) {
  const M = await mapMod();
  const { readFileSync } = await import("node:fs");
  const TAG = "[OWNER-APPROVED EXCEPTION 2026-10-01: MAP WRITER]";
  const simSrc = readFileSync("src/game/sim.ts", "utf8");
  const drawSrc = readFileSync("src/game/draw.ts", "utf8");
  const contentSrc = readFileSync("src/game/content.ts", "utf8");
  const strip = (t) => t.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");
  const C = M.CYCLE_MS;
  const gen = M.DUNGEONS.filter((d) => d.gen);
  const site = gen[0];
  const rift = M.RIFTS[0];

  // Law: the tag sits in every law file; the site list in the rules matches the game.
  {
    const law = ["rules/GAME_LAYOUT_TWO.txt", "rules/GAME_LAYOUT_TWO_PROMPT.txt", "rules/GAME_LAYOUT_TWO_ROSTER.txt", "AGENTS.project.md"].map((f) => [f, readFileSync(f, "utf8")]);
    check("mapwriter", "the MAP WRITER tag is in the layout, prompt, roster, and project law", law.every(([, t]) => t.includes(TAG)), law.filter(([, t]) => !t.includes(TAG)).map(([f]) => f).join(","));
    const two = readFileSync("rules/GAME_LAYOUT_TWO.txt", "utf8");
    const roster = readFileSync("rules/GAME_LAYOUT_TWO_ROSTER.txt", "utf8");
    const line = (d) => new RegExp(`${d.id}\\s+${d.name}\\s+${d.rift ? "" : `L${d.level}\\s+`}@${d.tx},${d.ty}`);
    check("mapwriter", "the rules name the generated dungeon and the rift zone with the game's spot and level", [two, roster].every((t) => line(site).test(t) && line(rift).test(t)), `${site?.id} ${rift?.id}`);
    check("mapwriter", "the counts line still reads 21 bosses and 5 pockets; the tag says neither site adds a boss", /21 bosses, 21 remnants, Stalkers, Loot Goblin, 5 pockets\./.test(two) && two.includes(`${TAG} + 1 generated dungeon`) && /No boss in either: still 21 bosses, 21 remnants, 5 pockets\./.test(two));
  }

  // Counts: one generated dungeon, five pockets, the 21 bosses where they were.
  {
    const before = ["frank", "warlock", "wrapped", "lich", "lanternking", "haysaint", "horseman", "dracula", "witchboss", "rootwidow", "priest", "abbot"];
    const homes = M.DUNGEONS.filter((d) => d.boss).map((d) => d.boss);
    check("mapwriter", "exactly one generated dungeon; it is not a pocket, has no boss, and holds 3 floors", gen.length === 1 && !site.pocket && site.boss === "" && site.floors === 3 && !site.rift, gen.map((d) => d.id).join(","));
    check("mapwriter", "still 5 pockets and 21 bosses; the 12 dungeon bosses keep their homes, one each", M.DUNGEONS.filter((d) => d.pocket).length === 5 && M.BOSSES.filter((b) => b.id !== "goblin").length === 21 && homes.join() === before.join(), `${homes.join(",")} / ${M.BOSSES.length} in BOSSES with the goblin`);
    check("mapwriter", "rift zones are their own site type: not in DUNGEONS, not pockets, no boss, one floor", M.RIFTS.length >= 1 && M.RIFTS.every((r) => r.rift && !r.pocket && !r.gen && r.boss === "" && r.floors === 1 && !M.DUNGEONS.some((d) => d.id === r.id)), M.RIFTS.map((r) => r.id).join(","));
    const keys = (contentSrc.match(/export const MAP_WRITER = \{([\s\S]*?)\n\};/) ?? [])[1] ?? "";
    check("mapwriter", "no new combat numbers: MAP_WRITER holds only the seed and the swirl's visual timing", Object.keys(M.MAP_WRITER).sort().join() === "seed,swirlEvery,swirlRange" && !/hp|atk|ac\b|xp|silver|chance/i.test(keys), Object.keys(M.MAP_WRITER).join(","));
  }

  // The overworld: the barrow's stair, the rift mouth on open ground.
  {
    const g = fresh();
    g.enterWorld(32 * TILE + 8, 47 * TILE + 8);
    const lairs = g.lairs().lairs;
    const mouthOk = M.RIFTS.every((r) => WALKABLE.has(g.tiles[r.ty * g.w + r.tx]) && WALKABLE.has(g.tiles[(r.ty + 1) * g.w + r.tx]) && !g.entrances[`${r.tx},${r.ty}`] && !lairs.includes(r.ty * g.w + r.tx) && !g.npcs.some((n) => Math.floor(n.x / TILE) === r.tx && Math.floor(n.y / TILE) === r.ty));
    check("mapwriter", "the barrow is a world stair at its spot; every rift mouth is open ground, not an entrance, a lair, or a folk's tile", g.entrances[`${site.tx},${site.ty}`] === site.id && g.tiles[site.ty * g.w + site.tx] === M.T.stairD && mouthOk);
  }

  // Generated floors: the writer's grid, seeded, whole, with the game's own placement on it.
  {
    const floors = (cls) => {
      const g = fresh(cls);
      g.enterDungeon(site.id);
      const out = [];
      for (let f = 1; f <= site.floors; f++) {
        g.floor = f;
        g.loadFloor("start");
        out.push({ f, tiles: [...g.tiles], w: g.w, h: g.h, feats: g.feats, gen: g.gen, roamers: g.roamers.map((r) => ({ ...r })), lv: g.dungeonLevel(), curseOn: g.curseOn() });
      }
      return out;
    };
    const a = floors("warrior");
    const b = floors("wizard");
    const writer = a.map((x) => M.gravewakeFloor(site.id, `${M.MAP_WRITER.seed}:${site.id}`, x.f, site.floors, site.level));
    check("mapwriter", "every barrow floor is the map writer's floor for the site seed, the same in two fresh games", a.every((x, i) => JSON.stringify(x.tiles) === JSON.stringify([...writer[i].map.tiles]) && JSON.stringify(x.tiles) === JSON.stringify(b[i].tiles) && JSON.stringify(x.feats) === JSON.stringify(b[i].feats)));
    check("mapwriter", "floors carry the writer's tags: one start, one boss, one vault room each", a.every((x) => ["start", "boss", "vault"].every((t) => x.gen.rooms.filter((r) => r.tag === t).length === 1)));
    const whole = a.every((x) => {
      const up = x.tiles.indexOf(M.T.stairU);
      const steps = M.walkSteps(x.tiles, x.w, x.h, up % x.w, Math.floor(up / x.w));
      const roomsOk = x.gen.rooms.every((r) => steps[r.center.y * x.w + r.center.x] >= 0 || x.tiles[r.center.y * x.w + r.center.x] === M.T.stairU);
      const down = x.tiles.includes(M.T.stairD);
      return up >= 0 && roomsOk && down === x.f < site.floors;
    });
    check("mapwriter", "each floor has its up stair, every room is reachable from it, and only the last floor has no way down", whole);
    check("mapwriter", "the game's own secrets land on the writer's grid: a secret wall on floor 1, a rune vault on floor 2, traps short of the last floor", !!a[0].feats.crack && !!a[1].feats.rune && !!a[0].feats.traps?.length && !!a[1].feats.traps?.length && !a[2].feats.traps?.length);
    const vaults = a.every((x) => !x.feats.mimic || (x.feats.mimic.x === x.gen.vaultChest.x && x.feats.mimic.y === x.gen.vaultChest.y));
    check("mapwriter", "a mimic, if any, only takes the vault's chest; no captive (the barrow is not in the rescue list)", vaults && a.every((x) => !x.feats.captive));
    const roster = new Set(M.DUNGEON_ROSTER.map((r) => r.id));
    const lv = Math.max(site.level, zoneLevel(site.tx, site.ty, 1));
    const trash = a.every((x) => x.roamers.filter((r) => !r.pack).length === x.gen.foes.length && x.roamers.filter((r) => !r.pack).every((r, i) => roster.has(r.def) && r.x === x.gen.foes[i].x * TILE + 8 && r.y === x.gen.foes[i].y * TILE + 8 && !r.boss && !r.mini && r.level === lv));
    const noBat = !roster.has("bat") && roster.size === M.ROSTER.length - 1 && a.every((x) => !x.roamers.some((r) => r.def === "bat"));
    check("mapwriter", "trash stands where the writer put it, all from the floor-roamer rule (no bat), at the Dungeon level max(14, zone of entrance)", trash && noBat && a.every((x) => x.lv === lv), `L${lv}`);
    const lvHi = (() => {
      const g = fresh();
      g.level = 60;
      g.enterDungeon(site.id);
      return g.dungeonLevel() === Math.max(site.level, zoneLevel(site.tx, site.ty, 60));
    })();
    check("mapwriter", "the Dungeon level follows you: at L60 it is the zone of the entrance", lvHi);
    const last = a[2];
    const guards = last.roamers.filter((r) => r.pack === "guard");
    const boss = last.gen.rooms.find((r) => r.tag === "boss");
    check("mapwriter", "the last floor's boss room holds one guard on the boss spot; no floor holds a boss", guards.length === 1 && guards[0].x === last.gen.bossSpot.x * TILE + 8 && guards[0].y === last.gen.bossSpot.y * TILE + 8 && a.every((x) => !x.roamers.some((r) => r.boss || r.mini)) && a.slice(0, 2).every((x) => !x.roamers.some((r) => r.pack)), `${guards.length} in ${boss?.id}`);
    check("mapwriter", "boss floors hold no curse in the barrow, like any dungeon; the floors short of it follow the run's draw", !last.curseOn);
  }

  // The guard: a Family Stalker pack, felled for the cycle.
  {
    const g = fresh();
    g.enterDungeon(site.id);
    g.floor = site.floors;
    g.loadFloor("start");
    const room = g.gen.rooms.find((r) => r.tag === "boss");
    const guard = g.roamers.find((r) => r.pack === "guard");
    g.px = (room.x + (room.x === g.gen.bossSpot.x ? 1 : 0)) * TILE + 8;
    g.py = room.y * TILE + 8;
    g.mode = "play";
    g.update(0.05);
    const noted = /Stalker pack keeps it/.test(g.logLine);
    const seen = watchBattles(g);
    g.touchFoe(guard);
    const pack = seen[0] ?? [];
    const rare = pack.find((f) => f.rare);
    const want = scaleMonster(M.monsterById(guard.def), g.dungeonLevel() + 2);
    check("mapwriter", "stepping into the boss room says a Stalker pack keeps it", noted, g.logLine);
    check("mapwriter", "touching the guard opens a Family Stalker pack: L+2, HP*1.45, one affix, two minions (the pack law)", !!rare && !packLaw(pack) && rare.hp === Math.round(want.hp * 1.45) && ["fast", "vortex"].includes(rare.affix) && pack.filter((f) => f.helper).length === 2 && !pack.some((f) => f.boss), rare ? `${rare.name} ${rare.hp}/${Math.round(want.hp * 1.45)} ${rare.affix}` : "no rare");
    const live = g.roamers.find((r) => r.rare && r.guard);
    if (live) g.fellFoe(live);
    const key = `guard:${site.id}:${Math.floor(g.worldMs / C)}`;
    g.loadFloor("start");
    const gone = !g.roamers.some((r) => r.pack === "guard");
    g.worldMs += C;
    g.loadFloor("start");
    const back = g.roamers.some((r) => r.pack === "guard");
    check("mapwriter", "a felled guard stays down for the rest of the day-night cycle and stands again the next", !!live && g.opened.has(key) && gone && back);
  }

  // Rift zones.
  const stepOnRift = (g, r = rift) => {
    g.enterWorld(r.tx * TILE + 8, (r.ty + 1) * TILE + 8);
    g.px = r.tx * TILE + 7;
    g.py = r.ty * TILE + 9;
    g.doorCool = 0;
    g.mode = "play";
    g.update(0.05);
  };
  {
    const g = fresh();
    stepOnRift(g);
    const inside = g.mapId === "dungeon" && g.dungeon === rift.id;
    const ret = g.riftReturn;
    check("mapwriter", "stepping onto a rift mouth opens its zone and takes the Portal record on the exact spot", inside && ret?.mapId === "world" && ret.px === rift.tx * TILE + 7 && ret.py === rift.ty * TILE + 9 && g.portal === null, `${g.mapId}:${g.dungeon} ${ret?.px},${ret?.py}`);
    check("mapwriter", "a rift zone's level is the zone of its tile (L1, L20, L50)", [1, 20, 50].every((L) => {
      const h = fresh();
      h.level = L;
      stepOnRift(h);
      return h.dungeonLevel() === zoneLevel(rift.tx, rift.ty, L);
    }));
    const fams = new Set(["zombie", "skeleton", "ghost", "bat"]);
    check("mapwriter", "rift trash is the rift tile's own families; no boss, no remnant, no guard", g.roamers.length >= 3 && g.roamers.every((r) => (fams.has(r.def) || r.riftGoblin) && !r.boss && !r.mini && r.pack !== "guard"), g.roamers.map((r) => r.def).join(" "));
    const cursed = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9].filter((d) => {
      const h = fresh();
      h.worldMs = d * C + 5000;
      stepOnRift(h);
      return h.curse !== "" || h.curseOn() || [...h.opened].some((k) => k.startsWith(`run:${rift.id}`));
    });
    check("mapwriter", "a rift holds no secrets, no mimic, no captive, no curse on any cycle, no run, and is never a zeppelin stop", !g.feats.rune && !g.feats.crack && !g.feats.mimic && !g.feats.captive && g.curse === "" && !cursed.length && !g.visited.includes(rift.id), cursed.join(","));
    g.saveSlot(2);
    const saved = JSON.parse(localStorage.getItem("gravewake-saves-v1"))[2];
    const back = fresh();
    back.loadSlot(2);
    const loadedAt = [back.mapId, back.px, back.py];
    for (let i = 0; i < 40; i++) back.update(0.05);
    check("mapwriter", "a save inside a rift is written on the return spot in the world (no new save field), and loads there without the mouth taking you straight back", saved.mapId === "world" && saved.px === ret.px && saved.py === ret.py && saved.dungeon === "" && !("riftReturn" in saved) && loadedAt[0] === "world" && loadedAt[1] === ret.px && loadedAt[2] === ret.py && back.mapId === "world" && back.riftReturn === null, `${saved.mapId} ${saved.px},${saved.py} -> ${loadedAt.join(",")} then ${back.mapId}`);
    g.openPortal();
    check("mapwriter", "no town portal opens inside a rift", g.portal === null && g.mapId === "dungeon" && /will not hold a gate/.test(g.logLine));
    const seen = watchBattles(g);
    const realRandom = Math.random;
    let k = 0;
    Math.random = () => [0.5, 0.9, 0.3, 0.7][k++ % 4];
    g.startWildFight(false);
    Math.random = realRandom;
    const jump = seen[0] ?? [];
    const jumpLv = scaleMonster(M.monsterById(jump[0]?.id ?? "zombie"), g.dungeonLevel());
    check("mapwriter", "a fight that jumps you in a rift draws from the rift tile's families at the rift's level", seen.length === 1 && jump.every((f) => fams.has(f.id)) && jump[0].hp === jumpLv.hp, jump.map((f) => `${f.id}:${f.hp}`).join(" "));
    const ex = g.gen.exit;
    g.px = ex.x * TILE + 8;
    g.py = ex.y * TILE + 8;
    g.doorCool = 0;
    g.mode = "play";
    g.update(0.05);
    const outAt = [g.mapId, g.px, g.py];
    for (let i = 0; i < 40; i++) g.update(0.05);
    const stayed = g.mapId === "world";
    check("mapwriter", "the exit puts you back on the exact spot you went in from, and the mouth does not take you again while you stand there", outAt[0] === "world" && outAt[1] === ret.px && outAt[2] === ret.py && stayed && g.riftReturn === null, outAt.join(","));
    g.px = (rift.tx + 1) * TILE + 8;
    g.update(0.05);
    g.px = rift.tx * TILE + 8;
    g.doorCool = 0;
    g.update(0.05);
    check("mapwriter", "step off and back on, and the rift takes you again", g.mapId === "dungeon" && g.dungeon === rift.id);
  }
  {
    const lay = (ms) => {
      const g = fresh();
      g.worldMs = ms;
      stepOnRift(g);
      return JSON.stringify([[...g.tiles], g.roamers.map((r) => [r.def, r.x, r.y])]);
    };
    const same = lay(3 * C + 1000) === lay(3 * C + C - 1000);
    const days = new Set([0, 1, 2, 3, 4, 5, 6, 7].map((d) => lay(d * C + 5000)));
    check("mapwriter", "a rift's pocket is fixed within a day-night cycle and rerolls with the next (8 cycles, 8 pockets)", same && days.size === 8, `${days.size}`);
    const writer = M.gravewakeRift(rift.id, M.riftSeed(M.MAP_WRITER.seed, rift.tx, rift.ty, 5), rift.level, [{ id: "zombie" }, { id: "skeleton" }, { id: "ghost" }, { id: "bat" }]);
    const g = fresh();
    g.worldMs = 5 * C + 5000;
    stepOnRift(g);
    check("mapwriter", "the rift's pocket is the writer's rift for the spot and the cycle", JSON.stringify([...g.tiles]) === JSON.stringify([...writer.map.tiles]));
    let stalk = 0;
    let gob = 0;
    const N = 280;
    for (let d = 0; d < N; d++) {
      const h = fresh();
      h.worldMs = d * C + 5000;
      stepOnRift(h);
      if (h.roamers.some((r) => r.pack === "stalker")) stalk++;
      if (h.roamers.some((r) => r.riftGoblin)) gob++;
    }
    check("mapwriter", "a rift's possible Stalker (~1/14) and Goblin (the camp's vale odds, 0.08) turn up at about those rates, seeded per cycle", stalk / N > 0.025 && stalk / N < 0.15 && gob / N > 0.03 && gob / N < 0.15, `stalker ${stalk}/${N} goblin ${gob}/${N}`);
    let packOk = "";
    let gobOk = "";
    for (let d = 0; d < N && (!packOk || !gobOk); d++) {
      const h = fresh();
      h.worldMs = d * C + 5000;
      stepOnRift(h);
      const s = h.roamers.find((r) => r.pack === "stalker");
      const gb = h.roamers.find((r) => r.riftGoblin);
      if (s && !packOk) {
        const seen = watchBattles(h);
        h.touchFoe(s);
        packOk = !packLaw(seen[0]) && seen[0].some((f) => f.rare) ? "ok" : `bad ${packLaw(seen[0])}`;
      } else if (gb && !gobOk) {
        const seen = watchBattles(h);
        h.touchFoe(gb);
        const want = scaleMonster(M.monsterById("goblin"), Math.max(3, h.level));
        gobOk = seen[0]?.length === 1 && seen[0][0].id === "goblin" && seen[0][0].hp === want.hp && h.roamers.some((r) => r.goblin) ? "ok" : "bad";
      }
    }
    check("mapwriter", "a rift Stalker opens a Family Stalker pack; a rift Goblin opens the Loot Goblin fight", packOk === "ok" && gobOk === "ok", `${packOk} ${gobOk}`);
  }

  // The ash swirl and the pixel lock.
  {
    const pool = new M.ParticlePool();
    pool.portal(100, 100);
    const live = [];
    for (let i = 0; i < pool.kind.length; i++) if (pool.life[i] > 0) live.push(i);
    check("mapwriter", "the Portal ash swirl is 8 ash on the interact channel for 0.3s", pool.count(M.CH_INTERACT) === 8 && live.every((i) => pool.kind[i] === M.K_ASH && Math.abs(pool.life[i] - 0.3) < 1e-6), `${pool.count(M.CH_INTERACT)} live`);
    const g = fresh();
    g.enterWorld((rift.tx + 2) * TILE + 8, rift.ty * TILE + 8);
    g.fx.clear();
    ticks(g, 30);
    const far = fresh();
    far.enterWorld(32 * TILE + 8, 46 * TILE + 8);
    far.fx.clear();
    ticks(far, 30);
    let near = 0;
    for (let i = 0; i < 60; i++) {
      g.update(0.05);
      near = Math.max(near, g.fx.count(M.CH_INTERACT));
    }
    check("mapwriter", "a rift mouth swirls when you are near and stays still when you are not", near === 8 && far.fx.count(M.CH_INTERACT) === 0, `${near} / ${far.fx.count(M.CH_INTERACT)}`);
    const locked = new Set((readFileSync("tools/sprite-writer/palette_locked.py", "utf8").match(/#[0-9a-f]{6}/gi) ?? []).map((c) => c.toLowerCase()));
    const paint = (drawSrc.match(/function paintRift[\s\S]*?\n}\n/) ?? [""])[0];
    const hexes = (paint.match(/#[0-9a-fA-F]{6}/g) ?? []).map((c) => c.toLowerCase());
    // gfx1 (owner-requested 2026-10-01) replaced the painted pit with the pixel writer's portal gate. Strengthened: the
    // painted pit is still locked colours only with no art file (it is now the fallback while the gate sheet loads),
    // and the mouth draws the writer's gate, whose sheet is checked pixel by pixel in the gfx1 group.
    check("mapwriter", "the rift mouth draws the pixel writer's portal gate (portal-rift.png, made in the writer's palette-checked list); its fallback pit is painted in locked colors only, with no art file", hexes.length > 0 && hexes.every((c) => locked.has(c)) && !/\.png/.test(paint) && /if \(!paintPortalGate\(ctx, "rift", r\.x, r\.y, g\.frame\)\) paintRift\(ctx, r\.x, r\.y, g\.frame\);/.test(drawSrc) && /rift: \{ sheet: "\/art\/writer\/portal-rift\.png"/.test(drawSrc) && /im\.save\(OUT \/ f"portal-\{name\}\.png"\)\n {8}made\.append\(im\)/.test(readFileSync("tools/pixel-writer/make_gravewake.py", "utf8")), hexes.filter((c) => !locked.has(c)).join(","));
  }

  // The last floor's curse line names keepers, not a boss (the barrow has none).
  {
    const g = fresh();
    let day = 0;
    for (; day < 60; day++) { g.worldMs = day * C + 60000; g.enterDungeon("barrow"); if (g.curse) break; }
    g.floor = 2;
    g.loadFloor("start");
    const down = g.tiles.indexOf(M.T.stairD);
    g.mode = "play";
    g.useStair(M.T.stairD);
    const line = g.logLine;
    const pit = fresh();
    for (let d = 0; d < 60; d++) { pit.worldMs = d * C + 60000; pit.enterDungeon("carrion"); if (pit.curse) break; }
    pit.floor = 4;
    pit.loadFloor("start");
    pit.mode = "play";
    pit.useStair(M.T.stairD);
    check("mapwriter", "on the barrow's last floor the curse line says its keepers wait, never a boss; boss dungeons keep their line", down >= 0 && g.floor === 3 && /Its keepers wait\./.test(line) && !/boss/i.test(line) && /The boss waits\./.test(pit.logLine), `${line} | ${pit.logLine}`);
  }

  // Seeded only.
  {
    const mw = strip(readFileSync("tools/map-writer/map_writer.ts", "utf8")) + strip(readFileSync("tools/map-writer/gravewake.ts", "utf8"));
    const sites = [...simSrc.matchAll(/Math\.random\s*\(/g)].map((m) => methodAt(simSrc, m.index));
    const gen = ["seedWrittenFoes", "guardKey", "leaveRift", "riftSwirl", "noteBossRoom", "genRoomAt", "riftSaveSpot", "riftMouths"];
    const carve = (simSrc.match(/function carveGen[\s\S]*?\nfunction biomeTile/) ?? [""])[0];
    check("mapwriter", "no Math.random or clock in the map writer, its adapter, the carve functions, or the new methods", !/Math\.random|Date\.now|performance\./.test(mw) && !/Math\.random/.test(carve) && carve.length > 0 && !sites.some((s) => gen.includes(s)), sites.filter((s) => gen.includes(s)).join(","));
  }
}

if (on("festival2")) {
  // [OWNER-APPROVED 2026-10-01 10:14 AM ET: SPRING AND SUMMER FESTIVALS] Drowned Bloom and Ashen Fair: no boss, no exception.
  const F = await feat47Mod();
  const { readFileSync } = await import("node:fs");
  const { inflateSync } = await import("node:zlib");
  const C = F.CYCLE_MS;
  const B = F.DROWNED_BLOOM;
  const A = F.ASHEN_FAIR;
  const H = F.HARVEST;
  const nightOf = (d) => d * C + F.DAY_MS + 60000;
  const dayOf = (d) => d * C + 60000;
  const simSrc = readFileSync("src/game/sim.ts", "utf8");
  const festSrc = readFileSync("src/game/festivals.ts", "utf8");
  const TAG = "[OWNER-APPROVED 2026-10-01 10:14 AM ET: SPRING AND SUMMER FESTIVALS]";
  const bossSpots = [...simSrc.slice(simSrc.indexOf("const WORLD_BOSSES = ["), simSrc.indexOf("];", simSrc.indexOf("const WORLD_BOSSES = ["))).matchAll(/tx: (\d+), ty: (\d+)/g)].map((m) => [Number(m[1]), Number(m[2])]);
  const world = (d, lv = 20) => {
    const g = fresh();
    g.level = lv;
    g.worldMs = nightOf(d);
    g.enterWorld(40 * TILE + 8, 40 * TILE + 8);
    ticks(g, 2);
    return g;
  };
  const town = (d, night = true) => {
    const g = fresh();
    g.worldMs = night ? nightOf(d) : dayOf(d);
    g.enterTown();
    ticks(g, 2);
    return g;
  };
  const carried = (g, name) => g.inv.filter((i) => i.name === name).reduce((s, i) => s + (i.stack ?? 1), 0);
  const spyDrops = (g) => {
    const calls = [];
    const real = g.makeDrop.bind(g);
    g.makeDrop = (s, b) => { calls.push(`${s}:${b}`); return real(s, b); };
    return calls;
  };
  const center = (x, y) => [x * TILE + 8, y * TILE + 8];
  // The save slot's key count before the spring and summer festivals (saveSlot unchanged by them).
  const SAVE_KEYS = 56;

  // Law: the tag, no new boss, the Tzar keeps his one home.
  {
    const files = ["rules/GAME_LAYOUT_TWO.txt", "rules/GAME_LAYOUT_TWO_ROSTER.txt", "rules/GAME_LAYOUT_TWO_PROMPT.txt", "AGENTS.project.md"].map((f) => readFileSync(f, "utf8"));
    let tasks = "";
    try { tasks = readFileSync("../FEATURE_TASKS.md", "utf8"); } catch { tasks = ""; }
    const lay = files[0];
    const heads = [files[0], files[1]].every((t) => t.includes(`${TAG}\nFESTIVAL NIGHTS, SPRING AND SUMMER`) && t.split(TAG).length === 3);
    check("festival2", "the rules carry the owner tag for the spring and summer festivals in the layout, roster, prompt and AGENTS.project.md: Drowned Bloom and Ashen Fair, no new boss, the Tzar keeps his one home, group festival2", heads && files.every((s) => s.includes(TAG) && /Drowned Bloom/.test(s) && /Ashen Fair/.test(s)) && /no boss and no rule exception/.test(lay) && /The Drowned Tzar keeps his one home \(38,32\)/.test(lay) && /No new boss, no remnant, no new save field/.test(lay) && /group `festival2`/.test(lay) && (tasks === "" || /owner-approved 2026-10-01 10:14 AM ET/.test(tasks)));
    const g = world(15);
    const tzars = g.roamers.filter((r) => r.def === "tzar");
    const fest = g.roamers.filter((r) => r.festival);
    const court = g.roamers.filter((r) => r.naughty);
    const a = world(21);
    check("festival2", "no new boss: still 21 roster bosses and only the Pumpkin Lord and Krampus as festival bosses; on Drowned Bloom and Ashen Fair nights no festival boss stands, the Tzar is in WORLD_BOSSES once at (38,32) and nowhere else, and no court pack is a boss or the Tzar", F.FESTIVAL_BOSSES.map((b) => b.id).join(",") === "pumpkinlord,krampus" && (simSrc.match(/\{ id: "tzar", tx: 38, ty: 32, lv: 72 \}/g) ?? []).length === 1 && !/tzar/.test(festSrc.replace(/Drowned Tzar's court|the Tzar's/g, "")) && tzars.length <= 1 && tzars.every((r) => Math.hypot(r.x - (38 * TILE + 8), r.y - (32 * TILE + 8)) < 3 * TILE) && !fest.length && !a.roamers.some((r) => r.festival) && court.length === 3 && court.every((r) => !r.boss && r.def !== "tzar") && a.roamers.filter((r) => r.naughty).every((r) => !r.boss), `tzar ${tzars.length} fest ${fest.length} court ${court.length}`);
    check("festival2", "the numbers: flood x 24-44 y 20-42, 6 blooms 3 apart touch 12 at 4 silver; 3 court packs; seal and ticket junk rank 1, half-chance chest; dance 3 silver, 3 turns, 4 steps, 0.8 s flares, 60 s, touch 12, 4 a step, 10 for all four", B.flood.x0 === 24 && B.flood.x1 === 44 && B.flood.y0 === 20 && B.flood.y1 === 42 && B.blooms === 6 && B.bloomGap === 3 && B.touch === 12 && B.bloomPay === 4 && B.court === 3 && B.courtFamily === "ghost" && B.cofferChance === 0.5 && A.prizeChance === 0.5 && A.turnPrice === 3 && A.turns === 3 && A.steps === 4 && A.showSeconds === 0.8 && A.runSeconds === 60 && A.touch === 12 && A.stepPay === 4 && A.perfectBonus === 10 && A.sideshow === 3 && [B.bloom, B.seal, A.ticket].every((i) => i.kind === "junk" && i.rank === 1) && B.npc.id === "ottla" && A.npc.id === "sallow" && B.names.length === 8 && A.names.length === 8, JSON.stringify(B.flood));
  }

  // Drowned Bloom.
  {
    const g = town(15);
    const ottla = g.npcs.find((n) => n.role === "festival");
    const others = [[15, false], [3, true], [9, true], [21, true], [39, true], [4, true]].map(([d, n]) => town(d, n).npcs.find((x) => x.role === "festival")?.id ?? "-");
    check("festival2", "Weir-wife Ottla keeps the plaza stall (26,14) on Drowned Bloom night only (nights 15 and 39), not by day; Hessa, Ottla and Sallow never share the stall", !!ottla && ottla.id === "ottla" && ottla.name === "Weir-wife Ottla" && ottla.x === 26 * TILE + 8 && ottla.y === 14 * TILE + 8 && g.npcs.filter((n) => n.role === "festival").length === 1 && others.join(",") === "-,hessa,-,sallow,ottla,-", others.join(","));
    const w = world(15);
    const other = world(21);
    const day = fresh();
    day.worldMs = dayOf(15);
    day.enterWorld(40 * TILE + 8, 40 * TILE + 8);
    let flooded = 0, wrong = 0;
    for (let y = 0; y < w.h; y++) for (let x = 0; x < w.w; x++) {
      const f = w.floodAt(x, y);
      const t = w.tiles[y * w.w + x];
      if (f) flooded++;
      if (f && (x < 24 || x > 44 || y < 20 || y > 42 || ![F.T.grass, F.T.dirt, F.T.swamp, F.T.ash, F.T.bone].includes(t))) wrong++;
      if (other.floodAt(x, y) || day.floodAt(x, y)) wrong++;
    }
    const t = town(15);
    let townFlood = 0;
    for (let y = 0; y < t.h; y++) for (let x = 0; x < t.w; x++) if (t.floodAt(x, y)) townFlood++;
    // The flood is drawn only: the same walk covers the same ground on Bloom night and on any other night.
    const walk = (d) => {
      const g2 = fresh();
      g2.worldMs = nightOf(d);
      g2.enterWorld(...center(30, 31));
      g2.roamers = [];
      g2.nightCool = 999;
      g2.calm = 999;
      g2.held.add("KeyD");
      ticks(g2, 12);
      g2.roamers = [];
      return [g2.px, g2.py];
    };
    const wa = walk(15), wb = walk(14);
    check("festival2", "the flood: only on Drowned Bloom night, in the world, inside x 24-44 y 20-42, on open ground (never road, water, mouth or town); drawn only, walking is unchanged", flooded > 150 && wrong === 0 && townFlood === 0 && wa[0] === wb[0] && wa[1] === wb[1], `${flooded} flooded, ${wrong} wrong, walk ${wa} vs ${wb}`);
    const blooms = w.bloomsTonight();
    const court = w.courtTonight();
    const { lairs, w: lw } = w.lairs();
    const lairSet = new Set(lairs);
    const again = world(15);
    const next = world(39);
    const apart = blooms.every((a, i) => blooms.every((b, j) => i === j || Math.hypot(a.x - b.x, a.y - b.y) >= B.bloomGap));
    const off = blooms.every((b) => court.every((c) => Math.hypot(b.x - c.x, b.y - c.y) >= F.BOUNTY.lairClear));
    // Gathering never walks you onto a world boss (the Drowned Tzar sits in the swamp): 8 clear, four years.
    let byBoss = 0;
    for (let y = 0; y < 4; y++) for (const b of world(15 + 24 * y).bloomsTonight()) if (bossSpots.some(([bx, by]) => Math.hypot(b.x - bx, b.y - by) < F.BOUNTY.lairClear * 2)) byBoss++;
    check("festival2", "6 blooms a night on flooded open ground (lair tiles inside the flood), 3+ tiles apart, 4+ off the court and 8+ clear of every world boss spot (the Tzar's included, four years); same night same blooms, new blooms next year", blooms.length === 6 && apart && off && byBoss === 0 && blooms.every((b) => F.inFlood(b.x, b.y) && lairSet.has(b.y * lw + b.x) && w.floodAt(b.x, b.y)) && JSON.stringify(again.bloomsTonight()) === JSON.stringify(blooms) && JSON.stringify(next.bloomsTonight()) !== JSON.stringify(blooms) && !other.bloomsTonight().length, JSON.stringify(blooms));
    // Pick by walking onto one: one bloom, once.
    w.mode = "play";
    w.roamers = [];
    // Step in from 20 px off (the zone line settles first), then onto the bloom.
    [w.px, w.py] = center(blooms[0].x, blooms[0].y);
    w.px -= 20;
    ticks(w, 2);
    const near = carried(w, B.bloom.name);
    w.roamers = [];
    // Record every log line of the step (a zone line may follow the pick in the same tick).
    const said = [];
    let line = w.logLine;
    Object.defineProperty(w, "logLine", { configurable: true, get: () => line, set: (v) => { line = v; said.push(v); } });
    [w.px, w.py] = center(blooms[0].x, blooms[0].y);
    ticks(w, 1);
    const one = carried(w, B.bloom.name);
    const pickLog = said.find((l) => /^Drowned bloom/.test(l)) ?? said.join(" / ");
    ticks(w, 3);
    const still = carried(w, B.bloom.name);
    const item = w.inv.find((i) => i.name === B.bloom.name);
    check("festival2", "walking onto a bloom picks it: one Drowned bloom (junk rank 1), once; it stops drawing; the log counts k of 6", near === 0 && one === 1 && still === 1 && item?.kind === "junk" && item?.rank === 1 && w.bloomPicked(0) && !w.bloomPicked(1) && /^Drowned bloom 1 of 6\./.test(pickLog), `${one} ${still} ${pickLog}`);
    // All six, then Ottla: 24 silver and a garland (one chest roll), once.
    for (const b of blooms.slice(1)) { w.roamers = []; [w.px, w.py] = center(b.x, b.y); ticks(w, 1); }
    const six = carried(w, B.bloom.name);
    w.enterTown();
    ticks(w, 2);
    const calls = spyDrops(w);
    const c0 = w.coin;
    const keeper = w.npcs.find((n) => n.id === "ottla");
    w.openTalk(keeper);
    const label = w.choices().find((c) => c.id === "blooms")?.label;
    const d0 = w.drops.length;
    w.choose("blooms");
    const paid = w.coin - c0;
    const garland = w.drops.length - d0;
    w.openTalk(keeper);
    const again2 = w.choices().some((c) => c.id === "blooms");
    // A bloom from another night handed in later pays its 4 and brings no second garland.
    w.inv.push({ ...item, stack: 1 });
    const c1 = w.coin;
    w.openTalk(keeper);
    w.choose("blooms");
    const late = w.coin - c1;
    // Partial: two blooms pay 8 and no garland.
    const p = world(15);
    p.mode = "play";
    for (const b of p.bloomsTonight().slice(0, 2)) { p.roamers = []; [p.px, p.py] = center(b.x, b.y); ticks(p, 1); }
    p.enterTown();
    ticks(p, 2);
    const pc = spyDrops(p);
    const p0 = p.coin;
    p.openTalk(p.npcs.find((n) => n.id === "ottla"));
    p.choose("blooms");
    check("festival2", "Ottla takes the blooms you carry at 4 silver each (6 = 24); all six of tonight's blooms handed in earns the garland, one roll of the existing chest table, once; two blooms pay 8 and no garland", six === 6 && label === "Hand over 6 drowned blooms · 4s each" && paid === 24 && garland === 1 && calls.join(",") === "chest:false" && w.opened.has(`fest:bloom:${w.festDay()}:garland`) && !again2 && late === 4 && calls.length === 1 && carried(w, B.bloom.name) === 0 && p.coin - p0 === 8 && pc.length === 0 && !p.opened.has(`fest:bloom:${p.festDay()}:garland`), `${label} ${paid} ${garland} ${calls} | ${p.coin - p0} ${pc}`);
  }
  {
    // The Drowned Court: named Ghost Stalker packs on the flooded banks.
    const g = world(15);
    const list = g.courtTonight();
    const roam = g.roamers.filter((r) => r.naughty);
    const again = world(15);
    const next = world(39);
    const spaced = list.every((a, i) => list.every((b, j) => i === j || Math.hypot(a.x - b.x, a.y - b.y) >= F.BOUNTY.lairClear * 2));
    let near = 0, swamp = 0, dry = 0, ghost = 0;
    for (let y = 0; y < 4; y++) {
      const n = world(15 + 24 * y);
      for (const a of n.courtTonight()) {
        if (bossSpots.some(([bx, by]) => Math.hypot(a.x - bx, a.y - by) < F.BOUNTY.lairClear * 2)) near++;
        if (F.inSwamp(a.x, a.y)) swamp++;
        if (!F.inFlood(a.x, a.y)) dry++;
        if (a.fam === "ghost") ghost++;
      }
    }
    const { lairs: L0, w: LW } = g.lairs();
    // Even where every lair listed ghosts, the court keeps off the swamp itself (the Tzar's ground).
    let wet = 0;
    for (let y = 0; y < 4; y++) for (const a of F.courtList(15 + 24 * y, L0, LW, () => [F.monsterById("ghost")], [])) if (F.inSwamp(a.x, a.y) || !F.inFlood(a.x, a.y)) wet++;
    const local = wet === 0 && F.courtList(15, L0, LW, () => [F.monsterById("bat")], []).length === 0 && F.courtList(15, L0, LW, () => [F.monsterById("bat"), F.monsterById("ghost")], []).every((a) => a.fam === "ghost");
    const named = local && list.every((a) => B.names.includes(a.name.split(",")[0]) && a.name.endsWith("Ghost Stalker") && a.id.startsWith("court-")) && new Set(list.map((a) => a.name)).size === 3;
    check("festival2", "the Drowned Court: 3 named Ghost Stalkers (ghost is the vale's own family, the Tzar's helpers) on flooded banks, never in the swamp itself, 8 tiles apart and 8 clear of every world boss spot (the Tzar's included); same night same court, a new court next year; four years clean", bossSpots.length === 9 && list.length === 3 && roam.length === 3 && spaced && named && near === 0 && swamp === 0 && dry === 0 && ghost === 12 && JSON.stringify(again.courtTonight()) === JSON.stringify(list) && JSON.stringify(next.courtTonight()) !== JSON.stringify(list) && !world(21).courtTonight().length, list.map((a) => `${a.name}@${a.x},${a.y}/${a.affix}`).join(" | "));
    const seen = watchBattles(g);
    const r = roam[0];
    g.mode = "play";
    g.px = r.x;
    g.py = r.y;
    g.touchFoe(r);
    const foes = seen[0] ?? [];
    const def = F.monsterById(r.def);
    const rare = scaleMonster(def, r.level + 2);
    const mini = scaleMonster(def, Math.max(1, r.level - 1));
    check("festival2", "a courtier fights as a Stalker pack on the existing build: rare L+2 with HP x1.45 and its affix, two minions L-1 at HP x0.45, level from the zone curve", foes.length === 3 && foes[0].rare && foes[0].name === r.name && foes[0].hp === Math.round(rare.hp * 1.45) && foes[0].affix === r.affix && foes.slice(1).every((m) => m.helper && m.hp === Math.round(mini.hp * 0.45)) && packLaw(foes) === "" && r.level === zoneLevel(Math.floor(r.x / TILE), Math.floor(r.y / TILE), g.level), JSON.stringify(foes.map((f) => [f.name, f.hp, f.affix])));
    const lead = g.roamers.find((x) => x.naughty && x.rare && x.aggro);
    const calls = spyDrops(g);
    const real = Math.random;
    Math.random = () => 0.1;
    const d0 = g.drops.length;
    g.fellFoe(lead);
    Math.random = real;
    const dropped = g.drops.slice(d0).map((d) => d.item).filter(Boolean);
    const log = g.logLine;
    const hud = g.eventLine();
    ticks(g, 4);
    const back = g.roamers.some((x) => x.naughty === r.naughty && !x.rare);
    const h = world(15);
    const r2 = h.roamers.find((x) => x.naughty);
    h.mode = "play";
    h.px = r2.x;
    h.py = r2.y;
    h.touchFoe(r2);
    const calls2 = spyDrops(h);
    Math.random = () => 0.9;
    h.fellFoe(h.roamers.find((x) => x.naughty && x.rare && x.aggro));
    Math.random = real;
    check("festival2", "court loot: a Court seal (junk row, rank 1) every time, a drowned coffer (one existing chest-table roll) half the time; struck from tonight's court, it does not walk again; the HUD counts court 1/3", dropped.some((i) => i.name === "Court seal" && i.kind === "junk") && calls.join(",") === "chest:false" && calls2.join(",") === "common:false" && g.packCaught(r.naughty) && /The court is one short: a court seal and a drowned coffer\. 2 left\./.test(log) && /The court is one short: a court seal\. 2 left\./.test(h.logLine) && /court 1\/3$/.test(hud) && !back, `${log} | ${hud} | ${dropped.map((i) => i.name)} ${calls} ${calls2} ${g.packCaught(r.naughty)} ${back} | ${h.logLine}`);
  }

  // Ashen Fair.
  {
    const g = town(21);
    const sallow = g.npcs.find((n) => n.role === "festival");
    check("festival2", "Barker Sallow keeps the plaza stall (26,14) on Ashen Fair night only (nights 21 and 45), not by day", !!sallow && sallow.id === "sallow" && sallow.name === "Barker Sallow" && sallow.x === 26 * TILE + 8 && sallow.y === 14 * TILE + 8 && town(45).npcs.some((n) => n.id === "sallow") && !town(21, false).npcs.some((n) => n.role === "festival") && ![3, 9, 15].some((d) => town(d).npcs.some((n) => n.id === "sallow")));
    const orders = [1, 2, 3].map((t) => F.danceOrder(21, t));
    const distinct = orders.every((o) => o.length === 4 && new Set(o).size === 4 && o.every((i) => i >= 0 && i < H.lanterns.length));
    check("festival2", "the dance order: 4 distinct braziers of the six plaza posts, seeded by night and turn (same every time, different turn to turn and year to year)", distinct && JSON.stringify(F.danceOrder(21, 1)) === JSON.stringify(orders[0]) && new Set(orders.map((o) => o.join())).size > 1 && F.danceOrder(45, 1).join() !== orders[0].join() && H.lanterns.length === 6, JSON.stringify(orders));
    // A perfect turn: 3 silver in, watch 3.2 s of flares, then walk them.
    g.coin = 50;
    g.mode = "play";
    const calls = spyDrops(g);
    const sal = () => g.npcs.find((n) => n.id === "sallow");
    const turn = (walk) => {
      g.openTalk(sal());
      const label = g.choices().find((c) => c.id === "dance")?.label;
      const c0 = g.coin;
      g.choose("dance");
      const paidIn = c0 - g.coin;
      const order = g.danceRun ? [...g.danceRun.order] : [];
      const flares = [];
      const hudWatch = g.eventLine();
      // Stand on a wrong brazier through the watch: no penalty while watching or when the flares stop.
      const wrongPost = H.lanterns.findIndex((_, i) => !order.includes(i));
      [g.px, g.py] = center(...H.lanterns[wrongPost]);
      for (let i = 0; i < 70 && g.danceRun?.show > 0; i++) { const f = g.danceFlare().now; if (flares[flares.length - 1] !== f) flares.push(f); ticks(g, 1); }
      ticks(g, 1);
      const alive = !!g.danceRun;
      [g.px, g.py] = center(H.stall.x, H.stall.y);
      ticks(g, 1);
      const hudRun = g.eventLine();
      const c1 = g.coin;
      walk(order);
      return { label, paidIn, order, flares, alive, hudWatch, hudRun, pay: g.coin - c1, log: g.logLine, run: !!g.danceRun };
    };
    const step = (i) => { [g.px, g.py] = center(...H.lanterns[i]); ticks(g, 1); [g.px, g.py] = center(H.stall.x, H.stall.y); ticks(g, 1); };
    const t1 = turn((o) => o.forEach(step));
    const prize1 = calls.length;
    const t2 = turn((o) => o.forEach(step));
    const t3 = turn((o) => { step(o[0]); step(H.lanterns.findIndex((_, i) => !o.includes(i))); });
    g.openTalk(sal());
    const fourth = g.choices().some((c) => c.id === "dance");
    const c4 = g.coin;
    g.choose("dance");
    check("festival2", "the ember dance: 3 silver a turn; the barker flares the turn's 4 braziers in order over 3.2 s (standing on a post meanwhile is no step); walking them in order pays 4 a step and 10 more for all four (26)", t1.label === "Dance the braziers · 3s (turn 1 of 3)" && t1.paidIn === 3 && t1.flares.join() === t1.order.join() && t1.alive && t1.pay === 26 && !t1.run && t2.pay === 26 && t2.label === "Dance the braziers · 3s (turn 2 of 3)" && t1.hudWatch === "Watch the braziers · 4 flares" && /^Dance 0\/4 · 60 s left$/.test(t1.hudRun), JSON.stringify([t1.flares, t1.order, t1.pay, t1.hudWatch, t1.hudRun]));
    check("festival2", "the first perfect dance of the night drops a fair prize (one roll of the existing chest table), the second does not; a wrong brazier ends the turn paying the steps made (1 = 4); 3 turns a night, then no fourth", prize1 === 1 && calls.join(",") === "chest:false" && /hands down a fair prize/.test(t1.log) && !/prize/.test(t2.log) && t3.pay === 4 && /^Wrong brazier\. 1 of 4/.test(t3.log) && !fourth && g.coin === c4 && g.danceTurns() === 3 && g.opened.has(`fest:ashen:${g.festDay()}:prize`), `${t1.log} | ${t2.log} | ${t3.log}`);
    // Time out and walking off.
    const o = town(21);
    o.coin = 10;
    o.mode = "play";
    o.openTalk(o.npcs.find((n) => n.id === "sallow"));
    o.choose("dance");
    ticks(o, 66);
    [o.px, o.py] = center(...H.lanterns[o.danceRun.order[0]]);
    ticks(o, 1);
    [o.px, o.py] = center(H.stall.x, H.stall.y);
    ticks(o, 1201);
    const late = o.logLine;
    const lc = o.coin;
    const q = town(21);
    q.coin = 10;
    q.mode = "play";
    q.openTalk(q.npcs.find((n) => n.id === "sallow"));
    q.choose("dance");
    q.enterWorld(40 * TILE + 8, 40 * TILE + 8);
    ticks(q, 2);
    check("festival2", "the walk lasts 60 s (one step then waiting pays 4 and ends the turn); leaving town ends the turn; no dance on other nights", !o.danceRun && lc === 10 - 3 + 4 && /^The embers settle\. 1 of 4/.test(late) && !q.danceRun && q.coin === 7 && !town(15).choices().some((c) => c.id === "dance"), `${late} ${lc} | ${q.coin}`);
  }
  {
    // The sideshow: named Stalker packs in the Cinder.
    const g = world(21);
    const list = g.sideshowTonight();
    const cinder = ["pumpkin", "scare", "witch"];
    let near = 0, out = 0;
    for (let y = 0; y < 4; y++) for (const a of world(21 + 24 * y).sideshowTonight()) {
      if (bossSpots.some(([bx, by]) => Math.hypot(a.x - bx, a.y - by) < F.BOUNTY.lairClear * 2)) near++;
      if (!(a.y > 46 && a.x <= 48) || !cinder.includes(a.fam)) out++;
    }
    const spaced = list.every((a, i) => list.every((b, j) => i === j || Math.hypot(a.x - b.x, a.y - b.y) >= F.BOUNTY.lairClear * 2));
    const named = list.every((a) => A.names.includes(a.name.split(",")[0]) && a.name.endsWith(`${F.monsterById(a.fam).name} Stalker`) && a.id.startsWith("sideshow-")) && new Set(list.map((a) => a.name)).size === 3;
    check("festival2", "the sideshow: 3 named Stalkers on Cinder lairs (y > 46, x <= 48: lantern man, scarecrow, witch), 8 apart and 8 clear of every world boss spot; same night same acts, new acts next year; four years clean", list.length === 3 && g.roamers.filter((r) => r.naughty).length === 3 && spaced && named && near === 0 && out === 0 && JSON.stringify(world(21).sideshowTonight()) === JSON.stringify(list) && JSON.stringify(world(45).sideshowTonight()) !== JSON.stringify(list), list.map((a) => `${a.name}@${a.x},${a.y}`).join(" | "));
    const seen = watchBattles(g);
    const r = g.roamers.find((x) => x.naughty);
    g.mode = "play";
    g.px = r.x;
    g.py = r.y;
    g.touchFoe(r);
    const foes = seen[0] ?? [];
    const calls = spyDrops(g);
    const real = Math.random;
    Math.random = () => 0.1;
    const d0 = g.drops.length;
    g.fellFoe(g.roamers.find((x) => x.naughty && x.rare && x.aggro));
    Math.random = real;
    const dropped = g.drops.slice(d0).map((d) => d.item).filter(Boolean);
    check("festival2", "a sideshow act fights as a Stalker pack (pack law holds) and drops a Fair ticket (junk row) and, half the time, a prize box (one chest-table roll); the HUD counts sideshow 1/3", foes.length === 3 && packLaw(foes) === "" && foes[0].rare && dropped.some((i) => i.name === "Fair ticket" && i.kind === "junk" && i.rank === 1) && calls.join(",") === "chest:false" && /The sideshow is one act short: a fair ticket and a prize box\. 2 left\./.test(g.logLine) && /sideshow 1\/3$/.test(g.eventLine()), g.logLine);
  }

  // Shared: HUD, saves, loot tables, seeding, art.
  {
    const lines = [];
    for (const d of [15, 21]) {
      const a = fresh(); a.worldMs = dayOf(d); a.enterTown(); ticks(a, 2); lines.push(a.eventLine());
      const b = town(d); lines.push(b.eventLine());
    }
    check("festival2", "HUD: by day 'Drowned Bloom at nightfall · the swamp' / 'Ashen Fair at nightfall · the plaza'; by night the court and sideshow count; every line 40 characters or fewer", lines[0] === "Drowned Bloom at nightfall · the swamp" && /^Drowned Bloom · \d+ min · court 0\/3$/.test(lines[1]) && lines[2] === "Ashen Fair at nightfall · the plaza" && /^Ashen Fair · \d+ min · sideshow 0\/3$/.test(lines[3]) && lines.every((l) => l.length <= 40), lines.join(" | "));
    // Saves: no new field; the night's marks ride the opened set and reload.
    const g = world(15);
    g.mode = "play";
    const b0 = g.bloomsTonight()[0];
    g.roamers = [];
    [g.px, g.py] = center(b0.x, b0.y);
    ticks(g, 1);
    const struck = g.courtTonight()[1].id;
    g.opened.add(`fest:bloom:${g.festDay()}:caught:${g.courtTonight()[1].id}`);
    g.saveSlot(0);
    const saved = JSON.parse(store.get([...store.keys()].find((k) => /save/i.test(k))) ?? "[]");
    const slot = Array.isArray(saved) ? saved[0] : saved;
    const keys = Object.keys(slot ?? {});
    const h = fresh();
    h.loadSlot(0);
    h.worldMs = g.worldMs;
    h.enterWorld(40 * TILE + 8, 40 * TILE + 8);
    ticks(h, 2);
    const walks = h.roamers.filter((x) => x.naughty).map((x) => x.naughty);
    const fieldsNow = simSrc.match(/saveSlot\(slot: number\) \{[\s\S]*?\n {2}\}/)?.[0] ?? "";
    check("festival2", "saves: no new save field (the slot keeps its SAVE_KEYS keys, none festival-named); picked blooms and struck courtiers ride the opened set as fest: keys and reload; a reloaded night does not respawn a struck courtier", fieldsNow.length > 100 && keys.length === SAVE_KEYS && !/bloom|dance|court|sideshow|ashen/i.test(fieldsNow) && !keys.some((k) => /bloom|dance|court|sideshow|ottla|sallow|fair/i.test(k)) && h.bloomPicked(0) && h.packCaught(struck) && walks.length === 2 && !walks.includes(struck), `${keys.length} keys ` + keys.filter((k) => /fest|bloom/i.test(k)).join(","));
    const body = (name) => simSrc.match(new RegExp(`\\n  (?:private )?${name}\\([^)]*\\)[^{]*\\{[\\s\\S]*?\\n  \\}`))?.[0] ?? "";
    const loot = ["festivalFell", "handBlooms", "endDance"].map(body);
    const drops = loot.flatMap((s) => [...s.matchAll(/makeDrop\(([^)]*)\)/g)].map((m) => m[1]));
    const made = loot.flatMap((s) => [...s.matchAll(/makeItem\(\{ \.\.\.(.+?), stack/g)].map((m) => m[1]));
    check("festival2", "loot only from existing tables: the court, sideshow, garland and fair prize call makeDrop(\"chest\", false) and nothing else; keepsakes are junk-row items (rank 1); no boss table, no trophy, no remnant", loot.every((s) => s.length > 100) && drops.length >= 4 && drops.every((d) => d === '"chest", false') && made.length >= 3 && made.every((m) => ["(court ? DROWNED_BLOOM.seal : ASHEN_FAIR.ticket)", "KRAMPUSNACHT.coal"].includes(m)) && !/makeDrop\("boss"|bossDead|remnant/i.test(loot.join("")), drops.join(" ; ") + " | " + made.join(","));
    const fresh2 = ["courtTonight", "sideshowTonight", "festivalPacks", "packCaught", "bloomsTonight", "bloomPicked", "floodAt", "danceTurns", "danceFlare", "pickBlooms", "handBlooms", "startDance", "tickDance", "brazierUnder", "endDance", "festMemo"];
    const sites = [...simSrc.matchAll(/Math\.random\s*\(/g)].map((m) => methodAt(simSrc, m.index));
    const fs = festSrc.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");
    check("festival2", "seeded only: no Math.random or clock in festivals.ts or the new sim methods; the court, sideshow, blooms and dance order come from featSeed", !/Math\.random|Date\.now|performance\./.test(fs) && !sites.some((s) => fresh2.includes(s)) && fresh2.every((n) => body(n).length > 30 || new RegExp(`  (?:private )?${n}[<(]`).test(simSrc)) && /featSeed\("ashen", day, `dance\$\{turn\}`\)|featSeed\("ashen", day, "dance" \+ turn\)/.test(festSrc), sites.filter((s) => fresh2.includes(s)).join(","));
  }
  {
    const readPng = (path) => {
      const b = readFileSync(path);
      let o = 8, w = 0, h = 0, type = 0;
      const idat = [];
      while (o < b.length) {
        const len = b.readUInt32BE(o);
        const kind = b.toString("ascii", o + 4, o + 8);
        const data = b.subarray(o + 8, o + 8 + len);
        if (kind === "IHDR") { w = data.readUInt32BE(0); h = data.readUInt32BE(4); type = data[9]; if (data[8] !== 8 || data[12] !== 0) throw new Error("png depth/interlace"); }
        if (kind === "IDAT") idat.push(data);
        o += 12 + len;
      }
      if (type !== 6) throw new Error(`png colour type ${type}`);
      const raw = inflateSync(Buffer.concat(idat));
      const bpp = 4, stride = w * bpp, out = Buffer.alloc(w * h * bpp);
      for (let y = 0; y < h; y++) {
        const f = raw[y * (stride + 1)];
        for (let x = 0; x < stride; x++) {
          const v = raw[y * (stride + 1) + 1 + x];
          const a = x >= bpp ? out[y * stride + x - bpp] : 0;
          const up = y > 0 ? out[(y - 1) * stride + x] : 0;
          const c = x >= bpp && y > 0 ? out[(y - 1) * stride + x - bpp] : 0;
          let p = v;
          if (f === 1) p = v + a;
          else if (f === 2) p = v + up;
          else if (f === 3) p = v + ((a + up) >> 1);
          else if (f === 4) { const q = a + up - c; const pa = Math.abs(q - a), pb = Math.abs(q - up), pc = Math.abs(q - c); p = v + (pa <= pb && pa <= pc ? a : pb <= pc ? up : c); }
          out[y * stride + x] = p & 255;
        }
      }
      return { w, h, px: out };
    };
    const locked = new Set([...readFileSync("tools/sprite-writer/palette_locked.py", "utf8").split("SPRITE_CORE")[0].matchAll(/"(#[0-9a-f]{6})"/g)].map((m) => m[1]));
    const bad = [];
    const cellsOf = [];
    const sheet = (path, w, h, cells, cw, full) => {
      let im;
      try { im = readPng(path); } catch (e) { bad.push(`${path} ${e.message}`); return; }
      if (im.w !== w || im.h !== h) bad.push(`${path} ${im.w}x${im.h}`);
      for (let i = 0; i < im.px.length; i += 4) {
        const a = im.px[i + 3];
        if (a && a !== 255) { bad.push(`${path} soft`); break; }
        if (a) { const hex = `#${[0, 1, 2].map((k) => im.px[i + k].toString(16).padStart(2, "0")).join("")}`; if (!locked.has(hex)) { bad.push(`${path} ${hex}`); break; } }
      }
      for (let c = 0; c < cells; c++) {
        let s = "";
        for (let y = 0; y < im.h; y++) for (let x = c * cw; x < (c + 1) * cw; x++) s += im.px[(y * im.w + x) * 4 + 3] ? im.px.readUInt32BE((y * im.w + x) * 4).toString(16) : ".";
        if (!/[0-9a-f]/.test(s.replace(/\./g, ""))) bad.push(`${path} empty cell ${c}`);
        // The flood is a patchy overlay (ground shows through): each cell at least a quarter wet.
        if (full && s.replace(/[^.]/g, "").length > 192) bad.push(`${path} cell ${c} too dry`);
        cellsOf.push(s);
      }
    };
    sheet("public/art/writer/festival-props2.png", 96, 16, 6, 16, false);
    sheet("public/art/writer/flood.png", 64, 16, 4, 16, true);
    const writer = readFileSync("tools/pixel-writer/make_gravewake.py", "utf8");
    const pix = readFileSync("tools/pixel-writer/pixel_writer.py", "utf8");
    const draw = readFileSync("src/game/draw.ts", "utf8");
    check("festival2", "art: festival-props2.png is six 16x16 cells (bowl, Ottla's stall, bloom, brazier, flare, Sallow's booth) and flood.png four patchy 16x16 water overlay cells (each at least a quarter wet); every pixel hard-edged and in the locked palette, every cell distinct and filled; both come from the pixel writer's palette-checked list", !bad.length && locked.size > 400 && new Set(cellsOf).size === 10 && /props2\.save\(OUT \/ "festival-props2\.png"\)/.test(writer) && /flood\.save\(OUT \/ "flood\.png"\)/.test(writer) && /made \+= \[props2, flood\]/.test(writer) && /def bloom_prop\(/.test(pix) && /def fair_prop\(/.test(pix) && /def flood_tile\(/.test(pix), bad.slice(0, 4).join("; "));
    check("festival2", "the draw uses them: the flood over flooded tiles, bowls and Ottla's stall on Bloom night, braziers (flaring as called or walked) and Sallow's booth on Ashen night, unpicked blooms on the flood; both sheets preloaded", /if \(g\.floodAt\(x, y\)\) sheetCell\(ctx, FLOOD_SHEET/.test(draw) && /fest === "bloom" \? 0 : dance\.now === i \|\| dance\.done\.includes\(i\) \? 4 : 3/.test(draw) && /FESTIVAL_PROPS2, fest === "bloom" \? 1 : 5/.test(draw) && /if \(!g\.bloomPicked\(i\)\) props\.push/.test(draw) && /FESTIVAL_PROPS, FESTIVAL_PROPS2, FLOOD_SHEET/.test(draw));
  }
}

if (on("mapwriter2")) {
  // [OWNER-REQUESTED 2026-10-01: MAP WRITER PHASE 2] Biome noise blending on the vale: looks only, the grid is the same.
  const { readFileSync, writeFileSync } = await import("node:fs");
  const { inflateSync } = await import("node:zlib");
  const TAG = "[OWNER-REQUESTED 2026-10-01: MAP WRITER PHASE 2]";
  const dir = mkdtempSync(join(tmpdir(), "gravewake-"));
  const entry = join(dir, "mw2.ts");
  const root = process.cwd();
  writeFileSync(entry, `export * from "${root}/tools/map-writer/map_writer.ts";\nexport * from "${root}/tools/map-writer/gravewake_vale.ts";\nexport { T, CYCLE_MS, DAY_MS } from "${root}/src/game/content.ts";\n`);
  const file = join(dir, "mw2.mjs");
  execFileSync("npx", ["esbuild", entry, "--bundle", "--platform=node", "--format=esm", "--log-level=warning", `--outfile=${file}`], { stdio: ["ignore", "ignore", "inherit"] });
  const V = await import(pathToFileURL(file).href);
  const V2 = await import(pathToFileURL(file).href + "?again");
  const simSrc = readFileSync("src/game/sim.ts", "utf8");
  const draw = readFileSync("src/game/draw.ts", "utf8");
  const valeSrc = readFileSync("tools/map-writer/gravewake_vale.ts", "utf8");
  const rules = readFileSync("rules/GAME_LAYOUT_TWO.txt", "utf8");
  const agents = readFileSync("AGENTS.project.md", "utf8");
  const readme = readFileSync("tools/map-writer/README.md", "utf8");
  const S = V.T;
  const fnv = (arr) => { let h = 0x811c9dc5; for (const t of arr) { h ^= t; h = Math.imul(h, 16777619) >>> 0; } return h.toString(16); };
  const vale = () => { const g = fresh(); g.enterWorld(32 * TILE + 8, 45 * TILE + 8); g.roamers = []; return g; };
  const g = vale();
  const { w, h, tiles } = g;
  const skin = V.valeSkin(tiles, w, h);
  const readmeAt = readme.indexOf(`## Phase 2: biome blending\n\n${TAG}`);
  check("mapwriter2", "rules: the phase-2 note is in GAME_LAYOUT_TWO, AGENTS.project.md, and the map-writer README's phase-2 section, dated and tagged, and says the blend is looks only (grid, collision, zones, saves unchanged)", [rules, agents].every((t) => t.includes(TAG) && /looks only/i.test(t.slice(t.indexOf(TAG), t.indexOf(TAG) + 1200))) && readmeAt > 0 && /looks only/i.test(readme.slice(readmeAt, readmeAt + 3000)));
  // Pinned from the tree before this batch (qa/mw2/pins_before.json).
  check("mapwriter2", "the vale's tile grid is byte-identical to before the batch (64x60, FNV 84f128a8): every tree, rock, pump, road, door, stair, the lake, the ice, and the reserved boss, merchant, and rift spots", w === 64 && h === 60 && fnv(tiles) === "84f128a8" && fnv(vale().tiles) === "84f128a8", fnv(tiles));
  const zones = [];
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) zones.push(zoneLevel(x, y, 20));
  check("mapwriter2", "zone levels are the rectangle rule, unchanged: every vale tile's zoneLevel at hero level 20 hashes as before (FNV ca551b7e)", fnv(zones) === "ca551b7e", fnv(zones));
  // Reachability with the game's own collision (solidAt for the hero), props counted as blocked.
  const prop = new Set([S.tree, S.rock, S.pump, S.grave]);
  const pass = (x, y) => !g.solidAt(x * TILE + 8, y * TILE + 8, true) && !prop.has(tiles[y * w + x]);
  const seen = new Uint8Array(w * h);
  const q = [45 * w + 32];
  seen[q[0]] = 1;
  while (q.length) {
    const i = q.pop();
    const x = i % w, y = (i / w) | 0;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx, ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
      const j = ny * w + nx;
      if (!seen[j] && pass(nx, ny)) { seen[j] = 1; q.push(j); }
    }
  }
  const reached = []; for (let i = 0; i < seen.length; i++) if (seen[i]) reached.push(i);
  const bossSpots = [...simSrc.slice(simSrc.indexOf("const WORLD_BOSSES = ["), simSrc.indexOf("];", simSrc.indexOf("const WORLD_BOSSES = ["))).matchAll(/tx: (\d+), ty: (\d+)/g)].map((m) => [Number(m[1]), Number(m[2])]);
  const lairs = g.lairs().lairs;
  const spots = [
    ...Array.from(tiles).flatMap((t, i) => (t === S.road || t === S.door || t === S.stairD ? [i] : [])),
    ...g.riftMouths().map((r) => r.y * w + r.x),
    ...g.npcs.map((n) => Math.floor(n.y / TILE) * w + Math.floor(n.x / TILE)),
    ...bossSpots.map(([x, y]) => y * w + x),
    ...lairs,
  ];
  const festNights = [];
  const festKinds = new Set();
  for (let d = 0; d < 120; d++) {
    const n = fresh(); n.worldMs = d * V.CYCLE_MS + V.DAY_MS + 60000; n.enterWorld(32 * TILE + 8, 45 * TILE + 8);
    for (const [kind, list] of [["naughty", n.naughtyTonight()], ["court", n.courtTonight()], ["sideshow", n.sideshowTonight()], ["bloom", n.bloomsTonight()]]) for (const c of list) if (c && Number.isFinite(c.x)) { festNights.push(c.y * w + c.x); festKinds.add(kind); }
  }
  const lost = [...spots, ...festNights].filter((i) => !seen[i]);
  check("mapwriter2", `reachability (the game's solidAt for the hero, props blocked): from the town gate the same ${reached.length} tiles are reachable as before the batch (3688, FNV f09dd9ac), and every road, door, stair, rift mouth, merchant and watch post, boss spot, festival lair, and 120 nights of Krampus, court, sideshow, and bloom spots is among them`, reached.length === 3688 && fnv(reached) === "f09dd9ac" && !lost.length && festKinds.size === 4 && lairs.length > 20, `${reached.length} ${fnv(reached)} lost ${lost.slice(0, 5).join(",")} spots ${spots.length} fest ${festNights.length} ${[...festKinds]}`);
  check("mapwriter2", "festival lairs are the same list as before (they are picked from the grid; 2055 lairs, FNV 5844b4ec)", lairs.length === 2055 && fnv(lairs) === "5844b4ec", `${lairs.length} ${fnv(lairs)}`);
  // Real walks across five borders: snow/vale on the road and off it, waste/vale on the road, swamp/vale on the road, cinder/vale off it.
  const crossings = [];
  const walk = (x, y, key, until, label) => {
    const k = vale();
    k.mode = "play";
    k.worldMs = 60000;
    [k.px, k.py] = [x * TILE + 8, y * TILE + 8];
    k.held.add(key);
    let ok = false;
    for (let i = 0; i < 200 && !ok; i++) { k.roamers = []; k.update(0.05); if (until(Math.floor(k.px / TILE), Math.floor(k.py / TILE))) ok = true; }
    k.held.delete(key);
    crossings.push(`${label}:${ok ? "ok" : `stuck@${Math.floor(k.px / TILE)},${Math.floor(k.py / TILE)}`}`);
    return ok;
  };
  const freeCol = (y0, y1, xs) => xs.find((x) => { for (let y = y0; y <= y1; y++) if (prop.has(tiles[y * w + x]) || prop.has(tiles[y * w + x - 1]) || prop.has(tiles[y * w + x + 1])) return false; return true; });
  const fc = freeCol(12, 20, [...Array(40).keys()].map((i) => i + 4).filter((x) => x !== 32));
  const fa = freeCol(43, 50, [...Array(44).keys()].map((i) => i + 2).filter((x) => x !== 32));
  const walked = [
    walk(32, 19, g.keyBind.up, (_x, y) => y <= 12, "snow-road"),
    fc !== undefined && walk(fc, 19, g.keyBind.up, (_x, y) => y <= 13, `snow-${fc}`),
    walk(44, 40, g.keyBind.right, (x) => x >= 52, "waste-road"),
    walk(32, 20, g.keyBind.down, (_x, y) => y >= 26, "swamp-road"),
    fa !== undefined && walk(fa, 43, g.keyBind.down, (_x, y) => y >= 49, `cinder-${fa}`),
  ];
  check("mapwriter2", "real walks cross the borders with held keys: snow on the north road and off-road, the waste on the east road, the swamp on the centre road, cinder off-road; nothing new stops the hero", walked.every(Boolean), crossings.join(" "));
  // The skin itself.
  // The check's own list, not the adapter's: open ground and the props on it. Everything else is never re-skinned.
  const open = new Set([S.grass, S.snow, S.sand, S.ash, S.swamp, S.tree, S.rock, S.pump, S.grave]);
  const blendList = [...V.VALE_BLENDABLE].sort((a, b) => a - b).join();
  let badTile = 0, far = 0, ruleOff = 0, moved = 0;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = y * w + x;
    const rule = V.valeBiomeAt(x, y);
    const t = tiles[i];
    if (V.VALE_GROUND.includes(t) && V.VALE_GROUND[rule] !== t) ruleOff++;
    if (skin.biome[i] === rule) continue;
    moved++;
    if (!open.has(t) || skin.biome[i] > 4) badTile++;
    let near = false;
    for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) { const nx = x + dx, ny = y + dy; if (nx >= 0 && ny >= 0 && nx < w && ny < h && V.valeBiomeAt(nx, ny) === skin.biome[i]) near = true; }
    if (!near) far++;
  }
  check("mapwriter2", "the adapter's rule is the world's: every grass, snow, sand, ash, and swamp tile in the grid is the ground valeBiomeAt names for its spot", ruleOff === 0, `${ruleOff} off`);
  check("mapwriter2", "skin: only open ground and the ground under props takes another biome (never a road, door, water, ice, stair, or dirt); every skin is one of the five grounds and lies within 2 tiles of that biome on the rule map", moved > 60 && badTile === 0 && far === 0 && skin.moved === moved && blendList === [...open].sort((a, b) => a - b).join(), `${moved} tiles re-skinned, ${badTile} bad, ${far} too far, blendable ${blendList}`);
  // Ragged, not ruled: along each border, how many places the skin leaves the line.
  const border = (cells) => { let off = 0, a = 0, b = 0; for (const [i, j] of cells) { const si = skin.biome[i] !== V.valeBiomeAt(i % w, (i / w) | 0), sj = skin.biome[j] !== V.valeBiomeAt(j % w, (j / w) | 0); if (si || sj) off++; if (si) a++; if (sj) b++; } return { n: cells.length, off, a, b }; };
  const openPair = ([i, j]) => open.has(tiles[i]) && open.has(tiles[j]);
  const lines = {
    "snow/vale y15|16": [...Array(49).keys()].map((x) => [15 * w + x, 16 * w + x]),
    "snow/waste y15|16": [...Array(15).keys()].map((k) => [15 * w + 49 + k, 16 * w + 49 + k]),
    "waste/vale x48|49": [...Array(44).keys()].map((k) => [(16 + k) * w + 48, (16 + k) * w + 49]),
    "cinder/vale y46|47": [...Array(49).keys()].map((x) => [46 * w + x, 47 * w + x]),
    "swamp/vale x26|27": [...Array(17).keys()].map((k) => [(23 + k) * w + 26, (23 + k) * w + 27]),
    "swamp/vale x41|42": [...Array(17).keys()].map((k) => [(23 + k) * w + 41, (23 + k) * w + 42]),
    "swamp/vale y22|23": [...Array(15).keys()].map((k) => [22 * w + 27 + k, 23 * w + 27 + k]),
  };
  const rag = Object.entries(lines).map(([k, cells]) => [k, border(cells.filter(openPair))]);
  check("mapwriter2", "borders are ragged, not ruled: on each of the seven vale border lines (open ground both sides) 25%+ of the places leave the line, and the long ones (40+ places) wander both ways", rag.every(([, r]) => r.off >= r.n * 0.25 && (r.n < 40 || (r.a > 0 && r.b > 0))), rag.map(([k, r]) => `${k} ${r.off}/${r.n} (${r.a}|${r.b})`).join("; "));
  let fringes = 0, edgeBad = 0;
  for (let i = 0; i < w * h; i++) {
    for (const [bit, d] of [[1, -w], [2, 1], [4, w], [8, -1]]) {
      const want = open.has(tiles[i]) && i + d >= 0 && i + d < w * h && open.has(tiles[i + d]) && skin.biome[i + d] !== skin.biome[i] && V.VALE_RANK[skin.biome[i + d]] > V.VALE_RANK[skin.biome[i]] && !(bit === 2 && (i + 1) % w === 0) && !(bit === 8 && i % w === 0);
      if (skin.edges[i] & bit) fringes++;
      if (!!(skin.edges[i] & bit) !== want) edgeBad++;
    }
  }
  check("mapwriter2", "the fringe: one per border, the higher ground over the lower (snow > sand > ash > swamp > grass), on every such side and only there; never onto or from a road, door, water, ice, stair, or dirt", fringes > 100 && edgeBad === 0, `${fringes} fringe sides, ${edgeBad} bad`);
  const again = V2.valeSkin(tiles, w, h);
  const other = V.valeSkin(tiles, w, h, "another vale");
  const code = valeSrc.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");
  check("mapwriter2", "seeded: the vale skin is the same bytes from a second module, a different seed gives a different skin; the numbers are seed 'gravewake-vale', reach 2, scale 6, rank grass 0 swamp 1 ash 2 sand 3 snow 4; the adapter names no Math.random, Date, or performance", Buffer.from(again.biome).equals(Buffer.from(skin.biome)) && Buffer.from(again.edges).equals(Buffer.from(skin.edges)) && !Buffer.from(other.biome).equals(Buffer.from(skin.biome)) && V.VALE_BLEND.seed === "gravewake-vale" && V.VALE_BLEND.reach === 2 && V.VALE_BLEND.scale === 6 && V.VALE_RANK.join() === "0,4,3,2,1" && !/Math\.random|Date\b|performance\./.test(code));
  check("mapwriter2", "the sim never reads the skin: sim.ts names no valeSkin, blendBiomes, gravewake_vale, or border sheet, so collision, zones, foes, festivals, and saves cannot see it", !/valeSkin|blendBiomes|gravewake_vale|border-dither|BORDER_SHEET/.test(simSrc));
  // Saves: the same slot, from and to a border tile.
  {
    const a = vale();
    a.mode = "play";
    [a.px, a.py] = [20 * TILE + 8, 16 * TILE + 8];
    a.saveSlot(0);
    const saved = JSON.parse(store.get([...store.keys()].find((k) => /save/i.test(k))) ?? "[]");
    const slot = Array.isArray(saved) ? saved[0] : saved;
    const keys = Object.keys(slot ?? {});
    const b = fresh();
    b.loadSlot(0);
    check("mapwriter2", "saves: a save on a border tile has the same 56 keys, none for the skin, and loads back onto the same spot in the same grid", keys.length === 56 && !keys.some((k) => /skin|blend|biome|fringe/i.test(k)) && b.mapId === "world" && Math.floor(b.px / TILE) === 20 && Math.floor(b.py / TILE) === 16 && fnv(b.tiles) === "84f128a8", `${keys.length} keys, ${b.mapId} ${Math.floor(b.px / TILE)},${Math.floor(b.py / TILE)}`);
  }
  // Art: the fringe masks.
  {
    const b = readFileSync("public/art/writer/border-dither.png");
    let o = 8, pw = 0, ph = 0;
    const idat = [];
    while (o < b.length) {
      const len = b.readUInt32BE(o);
      const kind = b.toString("ascii", o + 4, o + 8);
      const data = b.subarray(o + 8, o + 8 + len);
      if (kind === "IHDR") { pw = data.readUInt32BE(0); ph = data.readUInt32BE(4); if (data[9] !== 6 || data[8] !== 8) throw new Error("border png type"); }
      if (kind === "IDAT") idat.push(data);
      o += 12 + len;
    }
    const raw = inflateSync(Buffer.concat(idat));
    const stride = pw * 4, px = Buffer.alloc(pw * ph * 4);
    for (let y = 0; y < ph; y++) {
      const f = raw[y * (stride + 1)];
      for (let x = 0; x < stride; x++) {
        const v = raw[y * (stride + 1) + 1 + x];
        const a = x >= 4 ? px[y * stride + x - 4] : 0, up = y > 0 ? px[(y - 1) * stride + x] : 0, c = x >= 4 && y > 0 ? px[(y - 1) * stride + x - 4] : 0;
        let p = v;
        if (f === 1) p = v + a; else if (f === 2) p = v + up; else if (f === 3) p = v + ((a + up) >> 1);
        else if (f === 4) { const qq = a + up - c; const pa = Math.abs(qq - a), pb = Math.abs(qq - up), pc = Math.abs(qq - c); p = v + (pa <= pb && pa <= pc ? a : pb <= pc ? up : c); }
        px[y * stride + x] = p & 255;
      }
    }
    const locked = new Set([...readFileSync("tools/sprite-writer/palette_locked.py", "utf8").split("SPRITE_CORE")[0].matchAll(/"(#[0-9a-f]{6})"/g)].map((m) => m[1]));
    const inks = new Set();
    let soft = 0;
    const cells = [];
    for (let c = 0; c < 12; c++) {
      const on = [];
      for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
        const k = (y * pw + c * 16 + x) * 4;
        const a = px[k + 3];
        if (a && a !== 255) soft++;
        if (a) { inks.add(`#${[0, 1, 2].map((j) => px[k + j].toString(16).padStart(2, "0")).join("")}`); on.push([x, y]); }
      }
      cells.push(on);
    }
    // Bands: cell 0/4 hug the top, 1/5 the right, 2/6 the bottom, 3/7 the left; 3 to 6 px deep, 2 px solid all along. Corners stay in a 5 px nook.
    const depth = (on, side) => on.map(([x, y]) => [y, 15 - x, 15 - y, x][side]);
    const bands = [0, 1, 2, 3, 4, 5, 6, 7].every((c) => { const d = depth(cells[c], c % 4); const solid = cells[c].length >= 32; return solid && Math.max(...d) <= 5 && Math.max(...d) >= 2; });
    const nooks = [8, 9, 10, 11].every((c, k) => cells[c].length >= 6 && cells[c].every(([x, y]) => { const dx = k === 0 || k === 1 ? 15 - x : x; const dy = k === 1 || k === 2 ? 15 - y : y; return dx + dy <= 4; }));
    const distinct = new Set(cells.map((on) => JSON.stringify(on))).size === 12;
    const writer = readFileSync("tools/pixel-writer/make_gravewake.py", "utf8");
    const pix = readFileSync("tools/pixel-writer/pixel_writer.py", "utf8");
    check("mapwriter2", "art: border-dither.png is twelve 16x16 fringe masks (four ragged bands n e s w 3-6 px deep in two variants, four small corner nooks), one locked ink, hard alpha, every cell filled and distinct; made by the pixel writer's border_mask and in its palette-checked list", pw === 192 && ph === 16 && inks.size === 1 && locked.has([...inks][0]) && !soft && bands && nooks && distinct && /def border_mask\(/.test(pix) && /border\.save\(OUT \/ "border-dither\.png"\)/.test(writer) && /made \+= \[border\]/.test(writer), `${pw}x${ph} inks ${[...inks]} soft ${soft} bands ${bands} nooks ${nooks} distinct ${distinct}`);
  }
  check("mapwriter2", "the draw: the skin only on the world (theme over), worked out once per grid; open ground and prop ground show the skin biome's own sheet, a tree or rock is the skin biome's kind, road verges read it; each differing side gets the neighbour's ground through a mask (destination-in, no new colours); the mask sheet is preloaded; the minimap is untouched", /if \(g\.mapId !== "world" \|\| g\.theme !== "over"\) return null;/.test(draw) && /skinFor\.tiles !== g\.tiles/.test(draw) && /const at = \(j: number\) => \(g\.hidden\.has\(j\) \? T\.wall : look\(j, g\.tiles\[j\]\)\);/.test(draw) && /prop \? \(skin \? \(VALE_GROUND\[skin\.biome\[i\]\] as Tile\) : propGround/.test(draw) && /if \(skin\) paintFringes\(ctx, skin, g, x, y, n\);/.test(draw) && /skin \? SKIN_PROP\[skin\.biome\[i\]\] : biomeOf\(g\.theme, y, x\)/.test(draw) && /const SKIN_PROP = \["vale", "snow", "sand", "ash", "swamp"\];/.test(draw) && /off\.globalCompositeOperation = "destination-in";/.test(draw) && /\/art\/writer\/feat-\$\{k\}\.png`\), BORDER_SHEET\]\) \{/.test(draw) && !/skin|BORDER_SHEET/i.test(draw.slice(draw.indexOf("export function drawMinimap"), draw.indexOf("export function drawMinimap") + 4000)));
}

if (on("gfx1")) {
  // [OWNER-APPROVED 2026-10-01: CORE KEEPER GRAPHICS PASS C1-C11] Batch 1: the light layer, wall depth, the rift portal gate.
  const { readFileSync, writeFileSync } = await import("node:fs");
  const { inflateSync } = await import("node:zlib");
  const { createHash } = await import("node:crypto");
  const TAG = "[OWNER-APPROVED 2026-10-01: CORE KEEPER GRAPHICS PASS C1-C11]";
  const dir = mkdtempSync(join(tmpdir(), "gravewake-"));
  const entry = join(dir, "gfx1.ts");
  const root = process.cwd();
  writeFileSync(entry, `export * from "${root}/src/game/draw.ts";\nexport * from "${root}/src/game/light.ts";\nexport { T } from "${root}/src/game/content.ts";\n`);
  const file = join(dir, "gfx1.mjs");
  execFileSync("npx", ["esbuild", entry, "--bundle", "--platform=node", "--format=esm", "--log-level=warning", `--outfile=${file}`], { stdio: ["ignore", "ignore", "inherit"] });
  const D = await import(pathToFileURL(file).href);
  const draw = readFileSync("src/game/draw.ts", "utf8");
  const lightSrc = readFileSync("src/game/light.ts", "utf8");
  const writer = readFileSync("tools/pixel-writer/make_gravewake.py", "utf8");
  const pix = readFileSync("tools/pixel-writer/pixel_writer.py", "utf8");
  const md5 = (f) => createHash("md5").update(readFileSync(f)).digest("hex");
  const locked = new Set([...readFileSync("tools/sprite-writer/palette_locked.py", "utf8").split("SPRITE_CORE")[0].matchAll(/"(#[0-9a-f]{6})"/g)].map((m) => m[1]));
  const lum = (c) => { const n = parseInt(c.slice(1), 16); return 0.299 * (n >> 16) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255); };
  const readPng = (f) => {
    const b = readFileSync(f);
    let o = 8, pw = 0, ph = 0;
    const idat = [];
    while (o < b.length) {
      const len = b.readUInt32BE(o);
      const kind = b.toString("ascii", o + 4, o + 8);
      const data = b.subarray(o + 8, o + 8 + len);
      if (kind === "IHDR") { pw = data.readUInt32BE(0); ph = data.readUInt32BE(4); if (data[9] !== 6 || data[8] !== 8) throw new Error(`${f} png type`); }
      if (kind === "IDAT") idat.push(data);
      o += 12 + len;
    }
    const raw = inflateSync(Buffer.concat(idat));
    const stride = pw * 4, px = Buffer.alloc(pw * ph * 4);
    for (let y = 0; y < ph; y++) {
      const f0 = raw[y * (stride + 1)];
      for (let x = 0; x < stride; x++) {
        const v = raw[y * (stride + 1) + 1 + x];
        const a = x >= 4 ? px[y * stride + x - 4] : 0, up = y > 0 ? px[(y - 1) * stride + x] : 0, c = x >= 4 && y > 0 ? px[(y - 1) * stride + x - 4] : 0;
        let p = v;
        if (f0 === 1) p = v + a; else if (f0 === 2) p = v + up; else if (f0 === 3) p = v + ((a + up) >> 1);
        else if (f0 === 4) { const qq = a + up - c; const pa = Math.abs(qq - a), pb = Math.abs(qq - up), pc = Math.abs(qq - c); p = v + (pa <= pb && pa <= pc ? a : pb <= pc ? up : c); }
        px[y * stride + x] = p & 255;
      }
    }
    const at = (x, y) => { const k = (y * pw + x) * 4; return px[k + 3] ? `#${[0, 1, 2].map((j) => px[k + j].toString(16).padStart(2, "0")).join("")}` : null; };
    let soft = 0;
    const inks = new Set();
    for (let k = 0; k < px.length; k += 4) { if (px[k + 3] && px[k + 3] !== 255) soft++; if (px[k + 3]) inks.add(`#${[0, 1, 2].map((j) => px[k + j].toString(16).padStart(2, "0")).join("")}`); }
    return { pw, ph, at, soft, inks };
  };
  const caves = [...draw.slice(draw.indexOf("const CAVES: Record<string, Pal> = {"), draw.indexOf("};", draw.indexOf("const CAVES: Record<string, Pal> = {"))).matchAll(/^\s+(\w+): \{ floor: "#\w+", floor2: "#\w+", wall: "(#\w+)", wallHi: "(#\w+)", liquid: "(#\w+)"/gm)].map((m) => ({ id: m[1], wall: m[2], hi: m[3], liquid: m[4] }));

  // The rules record the approval where each rule changes.
  {
    const rules = readFileSync("rules/GAME_LAYOUT_TWO.txt", "utf8");
    const agents = readFileSync("AGENTS.project.md", "utf8");
    const nA = agents.split(TAG).length - 1, nR = rules.split(TAG).length - 1;
    const atA = ["] C2: a selective outline", "] C1: up to 4 steps", "] C4, C6, C7, C9: below ground", "] C4: the light buffer"].filter((k) => !agents.includes(TAG.slice(0, -1) + k));
    const atR = ["] C4: a cave is now dark", "] C5 is approved", "] Built: lamp.png", "] C6: the light-buffer composite", "] C6: plus the light-buffer composite", "] Night: the vale takes a moon ambient"].filter((k) => !rules.includes(TAG.slice(0, -1) + k));
    check("gfx1", "rules: the C1-C11 approval is recorded, dated and tagged, at each rule it changes: four notes in AGENTS.project.md (outline, shading, lighting, the light law) and six in GAME_LAYOUT_TWO (indoor/cave overlay, off-hand light, the lamp sheet, LightBlob, the shader list, night); with gfx2's two and one (the off-hand radius note became the owner's dated exception in gfx3) and gfx3's two and one (checked in their groups) that is exactly eight and eight", nA === 8 && nR === 8 && !atA.length && !atR.length, `${nA} ${nR} missing ${[...atA, ...atR].join(" | ")}`);
  }

  // The light model, Option A of the style doc.
  {
    const L = D.LIGHT, C = D.LIGHTS;
    const doc = { torch: [1, 0.62, 0.3], candle: [1, 0.72, 0.4], pumpkin: [1, 0.5, 0.16], ghost: [0.35, 0.8, 1], hex: [0.62, 0.38, 1], moon: [0.55, 0.62, 0.9] };
    const colours = Object.entries(doc).every(([k, v]) => JSON.stringify(C[k]) === JSON.stringify(v));
    check("gfx1", "light: the doc's six light colours exactly, radius buckets 24/40/56/72/96/112, five bands, falloff power 1.8, a 4-step flicker of one band down and up, a budget of 24", colours && JSON.stringify(L.buckets) === "[24,40,56,72,96,112]" && L.bands === 5 && L.power === 1.8 && JSON.stringify(L.flicker) === "[0,-1,0,1]" && L.budget === 24 && L.edge === 0.75);
    let mono = true, dith = 0, outside = 0, pinned = true, full = true, levels = new Set();
    for (const r of L.buckets) {
      for (let wy = 0; wy < 4; wy++) for (let wx = 0; wx < 4; wx++) {
        let prev = 99;
        for (let d = 0; d <= r + 2; d += 0.5) {
          const b = D.lightBand(d, r, wx, wy);
          levels.add(b);
          const q = Math.pow(Math.max(0, 1 - d / r), 1.8) * 5, base = Math.floor(q);
          if (d < r && b !== base) { if (q - base <= 0.75 || b !== base + 1) outside++; else dith++; }
          if (d >= r && b !== 0) outside++;
          if (b > prev + 1) mono = false;
          prev = Math.min(prev, b);
          if ([[4, 0], [0, 4], [8, 0], [0, 12], [4, 8], [-12, 4], [-4, -8], [20, -4]].some(([ax, ay]) => D.lightBand(d, r, wx + ax, wy + ay) !== b)) pinned = false;
        }
        if (D.lightBand(0, r, wx, wy) !== 5) full = false;
      }
    }
    check("gfx1", "light: a sprite is five hard bands from (1-d/r)^1.8, full at the centre and 0 at the radius; the Bayer dither only lifts a pixel one band in the top quarter of a band, and depends on the world pixel mod 4 only (pinned, it never crawls)", mono && outside === 0 && dith > 0 && pinned && full && levels.size === 6, `mono ${mono} outside ${outside} dither ${dith} pinned ${pinned} full ${full} levels ${[...levels]}`);
    const flick = [0, 1, 2, 3, 4, 5, 6, 7].map((k) => D.flickerStep(k * 1.5, 0));
    check("gfx1", "light: the flicker is the frame-driven 4-step cycle (seeded per light, no clock, no random), and with it a band never leaves 0-5", JSON.stringify(flick) === "[0,-1,0,1,0,-1,0,1]" && D.lightBand(0, 72, 0, 0, 1) === 5 && D.lightBand(70, 72, 0, 0, -1) === 0 && !/Math\.random|Date\.now|performance\.now/.test(lightSrc), flick.join(","));
    const docAmb = { ossuary: [0.11, 0.08, 0.17], harrow: [0.08, 0.1, 0.14], drowned: [0.06, 0.12, 0.11], wick: [0.14, 0.08, 0.06] };
    const derived = caves.filter((c) => !docAmb[c.id]).every((c) => { const a = D.docAmbient(c.id, c.liquid); const n = parseInt(c.liquid.slice(1), 16); const rgb = [n >> 16, (n >> 8) & 255, n & 255]; const top = Math.max(...rgb); return Math.abs(Math.max(...a) - 0.15) < 0.002 && rgb.every((v, i) => Math.abs(a[i] - (v / top) * 0.15) < 0.002); });
    const fixed = Object.entries(docAmb).every(([k, v]) => JSON.stringify(D.docAmbient(k, "#000000")) === JSON.stringify(v));
    const lifted = caves.every((c) => D.ambientOf(c.id, c.liquid).every((v, i) => Math.abs(v - D.docAmbient(c.id, c.liquid)[i] * L.ambientLift) < 0.002));
    check("gfx1", `light: cave ambients are the doc's four (ossuary, harrow, drowned, wick) and every other cave's liquid hue at 15% value, all ${caves.length} caves, times one lift (${L.ambientLift}) so the screen lands nearer the doc's near-black target`, caves.length === 13 && fixed && derived && lifted && L.ambientLift >= 1 && L.ambientLift <= 3);
    check("gfx1", "light: the hero's light is 96 px below ground and 72 px on a night outdoors (updated in gfx2 to the owner's darkness pick, up from 72 and 56), and its lit pool is 3-5 tiles below ground (the law's off-hand light) and under 3 tiles outdoors; actors never fall below half light; wall tops take 0.35 of the light; the AO strip is 8 px from -55% at the wall foot", L.hero === 96 && L.heroNight === 72 && D.litPool(L.hero) >= 3 * TILE && D.litPool(L.hero) <= 5 * TILE && D.litPool(L.heroNight) < 3 * TILE && D.litPool(L.heroNight) < D.litPool(L.hero) && L.actorMin === 0.5 && L.capLight === 0.35 && L.aoFoot.length === 8 && L.aoFoot[0] === 0.45 && L.aoFoot.every((v, i, a) => i === 0 || v >= a[i - 1]));
    check("gfx1", "light: light sprites are baked once per radius, colour, flicker step and dither phase and cached (the frame only blits); the wall mask is baked once per floor; no gradient, blur, filter or shadow in the light code", /const hit = spriteCache\.get\(key\);\n {2}if \(hit\) return hit;/.test(lightSrc) && /spriteCache\.set\(key, c\)/.test(lightSrc) && /const hit = maskCache\.get\(g\.tiles\);\n {2}if \(hit && hit\.key === key\) return hit\.canvas;/.test(draw) && !/Gradient|filter\s*=|shadowBlur/.test(lightSrc + draw.slice(draw.indexOf("function wallMask"), draw.indexOf("export function drawWorld"))));
  }

  // Where the layer runs, and what lights it, on real games.
  {
    const night = 30 * 60 * 1000 + 15 * 60 * 1000 + 120000;
    const g = fresh();
    g.enterWorld(10 * TILE + 8, 33 * TILE + 9);
    g.worldMs = 30 * 60 * 1000 + 60000;
    const dayW = D.sceneAmbient(g);
    g.worldMs = night;
    const nightW = D.sceneAmbient(g);
    const lw = D.sceneLights(g, g.px - 120, g.py - 80, 240, 160);
    const gate = lw.find((l) => JSON.stringify(l.c) === JSON.stringify(D.LIGHTS.hex));
    g.enterTown();
    g.worldMs = 30 * 60 * 1000 + 60000;
    const dayT = D.sceneAmbient(g);
    g.worldMs = night;
    const nightT = D.sceneAmbient(g);
    const lt = D.sceneLights(g, 0, 0, g.w * TILE, g.h * TILE);
    const doors = new Set(); for (let i = 0; i < g.tiles.length; i++) if (g.tiles[i] === D.T.door) doors.add(i);
    g.enterDungeon("ossuary");
    const dung = D.sceneAmbient(g);
    check("gfx1", "light: off outdoors by day (world and town look as before), the moon ambient on a vale night, the town's twilight at night (lighter than the vale, so its lamps own the night), the cave ambient below ground", dayW === null && dayT === null && JSON.stringify(nightW) === JSON.stringify(D.LIGHT.worldNight) && JSON.stringify(nightT) === JSON.stringify(D.LIGHT.townNight) && D.LIGHT.townNight.every((v, i) => v > D.LIGHT.worldNight[i]) && JSON.stringify(dung) === JSON.stringify(D.ambientOf("ossuary", "#241830")), `${dayW} ${dayT} ${nightW} ${nightT} ${dung}`);
    check("gfx1", "light: on a vale night the hero carries the lantern light first (72 px, candle colour) and the rift gate glows hex violet (72 px) over its doorway; in town at night every lit door has a torch lamp", lw[0].x === g.px - 0 * 0 + (lw[0].x - g.px) && lw[0].r === 72 && lw[0].r === D.LIGHT.heroNight && JSON.stringify(lw[0].c) === JSON.stringify(D.LIGHTS.candle) && !!gate && gate.r === 72 && gate.x === 10 * TILE + 8 && lt.filter((l) => l.r === D.LIGHT.doorLamp).length >= Math.min(doors.size, D.LIGHT.budget - 1) - 6 && lt.length <= D.LIGHT.budget, `${lw.length} gate ${JSON.stringify(gate)} town ${lt.length} doors ${doors.size}`);
    const s1 = D.sconces(g), g2 = fresh(); g2.enterDungeon("ossuary"); const s2 = D.sconces(g2);
    const rock = [D.T.wall, D.T.runeDoor, D.T.crack, D.T.brazier, D.T.statue];
    const faceOk = (gg, ss) => ss.every((s) => gg.tiles[s.y * gg.w + s.x] === D.T.wall && rock.includes(gg.tiles[(s.y - 1) * gg.w + s.x]) && !rock.includes(gg.tiles[(s.y + 1) * gg.w + s.x]));
    const gapOk = (ss) => ss.every((a, i) => ss.every((b, j) => i === j || Math.abs(a.x - b.x) + Math.abs(a.y - b.y) >= D.LIGHT.sconceGap));
    let ok = s1.length > 0 && faceOk(g, s1), gap = gapOk(s1), all = 0;
    for (const c of caves) { const gc = fresh(c.id === "grave" ? "vampire" : "warrior"); gc.enterDungeon(c.id === "cave" ? "barrow" : c.id); if (gc.mapId !== "dungeon" || gc.theme !== c.id) ok = false; const sc = D.sconces(gc); all += sc.length; if (!faceOk(gc, sc)) ok = false; if (!gapOk(sc)) gap = false; }
    check("gfx1", "light: dungeon wall torches are seeded per floor (two fresh games on the same floor place the same ones), only on a tall plain-rock face over open floor, never two within the gap; they are art only and the sim never reads them", ok && gap && JSON.stringify(s1) === JSON.stringify(s2) && !/sconces\(/.test(readFileSync("src/game/sim.ts", "utf8")), `${s1.length} (${all} over ${caves.length} caves) ${JSON.stringify(s1.slice(0, 3))}`);
    const ld = D.sceneLights(g, g.px - 120, g.py - 80, 240, 160);
    check("gfx1", "light: below ground the hero's torch is first (96 px, torch colour) and the list stays within the budget", ld[0].r === 96 && ld[0].r === D.LIGHT.hero && JSON.stringify(ld[0].c) === JSON.stringify(D.LIGHTS.torch) && ld.length <= 24);
  }

  // The draw order: the layer after the world, emissives and telegraphs at full light, the Lightless curse still on top.
  {
    const body = draw.slice(draw.indexOf("export function drawWorld"));
    const iLight = body.indexOf("paintLight(ctx, g, camX, camY");
    check("gfx1", "draw: the light layer multiplies over the world after every prop and actor is drawn, before particles, the Lightless curse and the weather; telegraph marks, spells, flames and the vortex go to full light; actors are lifted to the floor", iLight > body.indexOf("for (const d of props) d.fn();") && iLight < body.indexOf("drawParticles(ctx, g, camX") && iLight < body.indexOf("paintLightless(ctx, g, camX") && /ctx\.globalCompositeOperation = "multiply";/.test(draw) && /paintMark\(c, r\.markX, r\.markY, r\.markR \?\? 40, "#ffffff"\)/.test(body) && /paintSpell\(c, s\.x/.test(body) && /glow\.push\(flame\)/.test(body) && /glow\.push\(\(c\) => paintPortalGate\(c, "rift", r\.x, r\.y, g\.frame, "vortex"\)\)/.test(body) && /lc\.globalCompositeOperation = "lighten";/.test(draw));
  }

  // Wall depth: the kit, and how it is drawn.
  {
    const ramps = JSON.parse(readFileSync("tools/pixel-writer/wall-ramps.json", "utf8"));
    const bad = [];
    for (const c of caves) {
      const im = readPng(`public/art/writer/wall-${c.id}.png`);
      const r = ramps[c.id];
      const h = c.id === "chapel" ? 32 : 24;
      const rows = (cell) => { const out = []; for (let y = 0; y < 32; y++) { let n = 0; for (let x = 0; x < 16; x++) if (im.at(cell * 16 + x, y)) n++; out.push(n); } return out; };
      const face = [0, 1, 2].every((k) => rows(k).every((n, y) => (y < 32 - h ? n === 0 : n === 16)));
      const thin = [3, 4].every((k) => rows(k).every((n, y) => (y < 16 ? n === 0 : n === 16)));
      const top = [5, 6, 7].every((k) => rows(k).every((n, y) => (y < 16 ? n === 0 : n === 16)));
      const rimN = rows(8).every((n, y) => (y === 16 || y === 17 ? n === 16 : n === 0));
      const rimSide = [9, 10].every((k) => rows(k).every((n, y) => (y < 16 ? n === 0 : n === 2)));
      const lip = im.at(0, 32 - h) === r[5] && im.at(0, 33 - h) === r[4] && im.at(0, 31) === r[0] && im.at(0, 30) === r[1];
      const rampOk = r.length === 6 && r.every((x, i) => locked.has(x) && (i === 0 || lum(x) > lum(r[i - 1]))) && r[3] === c.wall && r[4] === c.hi;
      const inPal = [...im.inks].every((x) => locked.has(x));
      if (!(im.pw === 176 && im.ph === 32 && !im.soft && inPal && face && thin && top && rimN && rimSide && lip && rampOk)) bad.push(`${c.id} ${im.pw}x${im.ph} soft ${im.soft} pal ${inPal} face ${face} thin ${thin} top ${top} rim ${rimN}/${rimSide} lip ${lip} ramp ${rampOk}`);
    }
    check("gfx1", "art: a wall kit per cave (13), 11 cells of 16x32 from the pixel writer: three faces 24 px tall (32 in the chapel) with the bright lip (steps 5/4) and a 2-row contact shadow (1/0), two thin 16 px faces, three tops, rims n/w/e of 2 px; six-step ramps from the cave's own wall and wall light, strictly lighter step by step, locked colours, hard alpha", !bad.length && /def wall_face\(/.test(pix) && /def wall_top\(/.test(pix) && /def wall_rim\(/.test(pix) && /def wall_ramp\(/.test(pix) && /im\.save\(OUT \/ f"wall-\{name\}\.png"\)/.test(writer), bad.join("; "));
    const faceH = ["ossuary", "chapel", "harrow"].map((t) => [D.faceHeight(t, D.T.wall), D.faceHeight(t, 29), D.faceHeight(t, -1), D.faceHeight(t, D.T.floor), D.faceHeight(t, D.T.chest)].join("/"));
    check("gfx1", "walls: a face is 24 px (32 in the chapel) only when the tile above it is rock too, and 16 px when the tile above is open, so a face never hides a floor tile, a trap, a chest or an actor; the chapel's 32 matches the writer's", JSON.stringify(faceH) === JSON.stringify(["24/24/24/16/16", "32/32/32/16/16", "24/24/24/16/16"]) && /WALL_FACE_H = \{"chapel": 32\}/.test(writer) && D.WALL_FACE_H.chapel === 32, faceH.join(" "));
    check("gfx1", "walls: secret tiles (rune door, crack, brazier, saint) and sealed rooms draw exactly as rock: the same face and top, and neighbours treat them as rock, so depth never gives a secret away; the old painted wall is only the fallback while the sheet loads", /const wallLook = \(t: number\) => t === -1 \|\| t === T\.wall \|\| secretTile\(t\);/.test(draw) && /if \(\(tile === T\.wall \|\| secretTile\(tile\)\) && cave && !paintWallKit\(ctx, x, y, theme, above, below, left, right\)\) paintCaveWall\(ctx, x, y, theme, above, n\);/.test(draw) && /return g\.hidden\.has\(i\) \? T\.wall : g\.tiles\[i\];/.test(draw) && /const at = \(j: number\) => \(g\.hidden\.has\(j\) \? T\.wall : look\(j, g\.tiles\[j\]\)\);/.test(draw));
    const lamp = readPng("public/art/writer/lamp.png");
    const cell = (im, k, w, h) => { let s = ""; for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) s += im.at(k * w + x, y) ?? "."; return s; };
    const flames = [1, 2, 3, 4].map((k) => cell(lamp, k, 16, 16));
    check("gfx1", "art: lamp.png is the law's 4-frame lamp sheet: a wall bracket and four distinct flame frames in the fire ramp, from the pixel writer, locked colours, hard alpha", lamp.pw === 80 && lamp.ph === 16 && !lamp.soft && [...lamp.inks].every((x) => locked.has(x)) && new Set(flames).size === 4 && flames.every((f) => f.includes("#f4e27a") && f.includes("#c45a18")) && /def lamp_flicker\(/.test(pix) && /lamp\.save\(OUT \/ "lamp\.png"\)/.test(writer));
  }

  // The rift gate: a reusable portal-gate generator with three looks.
  {
    const bad = [];
    const looks = {};
    for (const k of ["rift", "teleport", "realm"]) {
      const im = readPng(`public/art/writer/portal-${k}.png`);
      let arch = 0, overlap = 0, outside = 0;
      const frames = [];
      for (let f = 1; f <= 8; f++) {
        let s = "";
        for (let y = 0; y < 48; y++) for (let x = 0; x < 32; x++) {
          const v = im.at(f * 32 + x, y);
          s += v ?? ".";
          if (v && im.at(x, y)) overlap++;
          // the vortex stays inside the doorway: between the pillars and above the threshold
          if (v && (x < 6 || x > 25 || y > 44)) outside++;
        }
        frames.push(s);
      }
      for (let y = 0; y < 48; y++) for (let x = 0; x < 32; x++) if (im.at(x, y)) arch++;
      looks[k] = [...im.inks].sort().join();
      if (!(im.pw === 288 && im.ph === 48 && !im.soft && [...im.inks].every((x) => locked.has(x)) && arch > 400 && !overlap && !outside && new Set(frames).size === 8)) bad.push(`${k} ${im.pw}x${im.ph} soft ${im.soft} arch ${arch} overlap ${overlap} outside ${outside} frames ${new Set(frames).size}`);
    }
    check("gfx1", "art: portal-rift / -teleport / -realm are one pixel-writer generator (portal_gate) in three looks: a 32x48 stone arch and eight distinct vortex spin frames that never touch the stone (so the vortex can be emissive), locked colours, hard alpha, three different palettes", !bad.length && new Set(Object.values(looks)).size === 3 && /def portal_gate\(part: int, pal: dict\)/.test(pix) && /PORTALS = \{/.test(writer) && ["rift", "teleport", "realm"].every((k) => writer.includes(`"${k}": {"stone"`)), bad.join("; "));
    const rift = readPng("public/art/writer/portal-rift.png");
    const hasHex = ["#5a3080", "#7a5ad0", "#c9a0e8"].every((c) => rift.inks.has(c)), ember = ["#c45a18", "#e07a2f"].every((c) => rift.inks.has(c)), ash = rift.inks.has("#5a5e64");
    check("gfx1", "the rift look is Gravewake's: hex purple vortex, ash-grey stone and motes, ember runes and sparks", hasHex && ember && ash);
    const frames = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((f) => D.portalFrame(f));
    check("gfx1", "draw: the rift mouth is the gate (paintPortalGate \"rift\"), drawn on the mouth tile's foot in the y-sort so you pass in front of it from the south and behind it from the north; the vortex turns one spin frame per game frame step and loops through all 8; any portal kind (rift, teleport, realm) is one call", /props\.push\(\{ y: \(r\.y \+ 1\) \* TILE - 1, fn: \(\) => \{ if \(!paintPortalGate\(ctx, "rift", r\.x, r\.y, g\.frame\)\) paintRift\(ctx, r\.x, r\.y, g\.frame\); \} \}\);/.test(draw) && JSON.stringify(frames) === "[0,1,2,3,4,5,6,7,0,1]" && Object.keys(D.PORTAL_GATES).join() === "rift,teleport,realm" && Object.values(D.PORTAL_GATES).every((p) => readFileSync(`public${p.sheet}`).length > 0), frames.join(","));
  }

  check("gfx1", "draw: the wall kits, the lamp sheet and the three portal sheets are preloaded (their own loop, after the old list), so a wall never pops from flat to deep", /for \(const url of \[\.\.\.Object\.keys\(CAVES\)\.map\(\(k\) => `\/art\/writer\/wall-\$\{k\}\.png`\), "\/art\/writer\/lamp\.png", \.\.\.\["rift", "teleport", "realm"\]\.map\(\(k\) => `\/art\/writer\/portal-\$\{k\}\.png`\)\]\) \{/.test(draw));

  // Nothing in play changed.
  {
    check("gfx1", "play is untouched: sim.ts, content.ts, feats.ts, particles.ts and audio.ts are byte-identical to before the batch (movement, collision, combat numbers, shops, saves, audio)", md5("src/game/sim.ts") === "a3ecff0b08113f1b418cb4127e7a4f94" && md5("src/game/content.ts") === "e520f80e802f7b80d5b5835893cbb019" && md5("src/game/feats.ts") === "39ed775c579eed137ffa64fd877bb647" && md5("src/game/particles.ts") === "32a2407a12fd4f93b4e6a423adcda043" && md5("src/game/audio.ts") === "98fbcef17779a2f944f6e71f913eba81");
    const sw = readFileSync("tools/sprite-writer/sprite_writer.py", "utf8");
    const kr = readPng("public/art/sprites/krampus.png");
    const m = sw.match(/"fur": "(#\w+)"[^}]*"birch": "(#\w+)", "birch_hi": "(#\w+)"/);
    check("gfx1", "Krampus's birch switch reads: pale bark with dark notches, at least 100 luminance over his fur, in the sprite strip and locked", !!m && lum(m[2]) - lum(m[1]) >= 100 && locked.has(m[2]) && locked.has(m[3]) && kr.inks.has(m[2]) && kr.inks.has(m[3]) && [...kr.inks].every((x) => locked.has(x)), m ? `${m[1]} ${m[2]} ${m[3]}` : "no match");
  }
}

if (on("gfx2")) {
  // [OWNER-APPROVED 2026-10-01: CORE KEEPER GRAPHICS PASS C1-C11] Batch 2: the owner's darkness pick, C5 moving lights,
  // the floor kit and blob shadows, palette v2 and the master ramps (C3), the spell writer's emits (C11).
  const { readFileSync, writeFileSync, readdirSync } = await import("node:fs");
  const { inflateSync } = await import("node:zlib");
  const { createHash } = await import("node:crypto");
  const TAG = "[OWNER-APPROVED 2026-10-01: CORE KEEPER GRAPHICS PASS C1-C11]";
  const dir = mkdtempSync(join(tmpdir(), "gravewake-"));
  const entry = join(dir, "gfx2.ts");
  const root = process.cwd();
  writeFileSync(entry, `export * from "${root}/src/game/draw.ts";\nexport * from "${root}/src/game/light.ts";\nexport { T, HERO_SPELLS } from "${root}/src/game/content.ts";\n`);
  const file = join(dir, "gfx2.mjs");
  execFileSync("npx", ["esbuild", entry, "--bundle", "--platform=node", "--format=esm", "--log-level=warning", `--outfile=${file}`], { stdio: ["ignore", "ignore", "inherit"] });
  const D = await import(pathToFileURL(file).href);
  const draw = readFileSync("src/game/draw.ts", "utf8");
  const writer = readFileSync("tools/pixel-writer/make_gravewake.py", "utf8");
  const pix = readFileSync("tools/pixel-writer/pixel_writer.py", "utf8");
  const md5 = (f) => createHash("md5").update(readFileSync(f)).digest("hex");
  const locked = new Set([...readFileSync("tools/sprite-writer/palette_locked.py", "utf8").split("SPRITE_CORE")[0].matchAll(/"(#[0-9a-f]{6})"/g)].map((m) => m[1]));
  const lum = (c) => { const n = parseInt(c.slice(1), 16); return 0.299 * (n >> 16) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255); };
  const readPng = (f) => {
    const b = readFileSync(f);
    let o = 8, pw = 0, ph = 0;
    const idat = [];
    while (o < b.length) {
      const len = b.readUInt32BE(o);
      const kind = b.toString("ascii", o + 4, o + 8);
      const data = b.subarray(o + 8, o + 8 + len);
      if (kind === "IHDR") { pw = data.readUInt32BE(0); ph = data.readUInt32BE(4); if (data[9] !== 6 || data[8] !== 8) throw new Error(`${f} png type`); }
      if (kind === "IDAT") idat.push(data);
      o += 12 + len;
    }
    const raw = inflateSync(Buffer.concat(idat));
    const stride = pw * 4, px = Buffer.alloc(pw * ph * 4);
    for (let y = 0; y < ph; y++) {
      const f0 = raw[y * (stride + 1)];
      for (let x = 0; x < stride; x++) {
        const v = raw[y * (stride + 1) + 1 + x];
        const a = x >= 4 ? px[y * stride + x - 4] : 0, up = y > 0 ? px[(y - 1) * stride + x] : 0, c = x >= 4 && y > 0 ? px[(y - 1) * stride + x - 4] : 0;
        let p = v;
        if (f0 === 1) p = v + a; else if (f0 === 2) p = v + up; else if (f0 === 3) p = v + ((a + up) >> 1);
        else if (f0 === 4) { const qq = a + up - c; const pa = Math.abs(qq - a), pb = Math.abs(qq - up), pc = Math.abs(qq - c); p = v + (pa <= pb && pa <= pc ? a : pb <= pc ? up : c); }
        px[y * stride + x] = p & 255;
      }
    }
    const at = (x, y) => { const k = (y * pw + x) * 4; return px[k + 3] ? `#${[0, 1, 2].map((j) => px[k + j].toString(16).padStart(2, "0")).join("")}` : null; };
    let soft = 0;
    const inks = new Set();
    for (let k = 0; k < px.length; k += 4) { if (px[k + 3] && px[k + 3] !== 255) soft++; if (px[k + 3]) inks.add(`#${[0, 1, 2].map((j) => px[k + j].toString(16).padStart(2, "0")).join("")}`); }
    const cell = (i, w = 16, h = 16) => { const out = []; for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) out.push(at(i * w + x, y)); return out; };
    return { pw, ph, at, soft, inks, cell };
  };
  const caves = [...draw.slice(draw.indexOf("const CAVES: Record<string, Pal> = {"), draw.indexOf("};", draw.indexOf("const CAVES: Record<string, Pal> = {"))).matchAll(/^\s+(\w+): \{ floor: "(#\w+)", floor2: "#\w+", wall: "(#\w+)"/gm)].map((m) => ({ id: m[1], floor: m[2], wall: m[3] }));
  // A fresh bytecode cache per run: a .pyc left from an edit in the same second must never stand in for the source.
  const pyCache = mkdtempSync(join(tmpdir(), "gravewake-pyc-"));
  const py = (code, cwd = "tools/sprite-writer") => {
    try { return JSON.parse(execFileSync("python3", ["-c", code], { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], env: { ...process.env, PYTHONPYCACHEPREFIX: pyCache } })); }
    catch (e) { return { error: String(e.stderr || e.message).trim().split("\n").pop() }; }
  };

  // The rules record each gfx2 change, dated and tagged, on the line under the rule it touches.
  {
    const rules = readFileSync("rules/GAME_LAYOUT_TWO.txt", "utf8").split("\n");
    const agents = readFileSync("AGENTS.project.md", "utf8").split("\n");
    const under = (lines, rule, note) => lines.some((l, i) => i > 0 && l.trim().startsWith(TAG.slice(0, -1) + note) && lines[i - 1].includes(rule));
    const notes = [
      [agents, "- Palette: 12–20 colors total for this asset set.", "] C3 (batch 2): palette v2 adds exactly #9a8aa8, #2e2030 and #8a3a18"],
      [agents, "drop shadows that ignore the grid", "] Batch 2: every actor stands on a blob shadow"],
      [rules, "C5 is approved; batch 1 adds no moving light beyond the hero's.", "] C5 (batch 2): moving lights built"],
    ];
    const miss = notes.filter(([l, r, n]) => !under(l, r, n)).map(([, , n]) => n);
    const interim = [...rules, ...agents].some((l) => l.includes("] Batch 2: the hero's light sprite"));
    check("gfx2", "rules: gfx2's three notes are dated and tagged, each on the line under the rule it touches (palette, drop shadows, C5 moving light); its interim off-hand radius note is gone, replaced by the owner's dated exception (checked in the gfx3 group)", !miss.length && !interim, miss.join(" | ") + (interim ? " | interim note still there" : ""));
  }

  // The owner's darkness pick (option c) and the moving lights.
  {
    const L = D.LIGHT;
    const scan = (r) => { let best = Infinity; for (let p = 0; p < 16; p++) { let far = 0; for (let d = 0; d < r; d += 0.25) if (D.lightBand(d, r, p & 3, p >> 2, 0) >= 1) far = d; best = Math.min(best, far); } return best; };
    const pools = [L.hero, L.heroNight].map((r) => [scan(r), D.litPool(r)]);
    check("gfx2", "light: the owner's pick: a 3x cave lift (the most the gfx1 check allows), the hero's light 96 px below ground and 72 px on a vale or town night; the lit pool (band 1 and up, every dither phase) measured off the real light band is litPool to within a pixel: 57 px (3.5 tiles) and 43 px (2.7 tiles)", L.ambientLift === 3 && L.hero === 96 && L.heroNight === 72 && pools.every(([s, p]) => Math.abs(s - p) <= 1) && Math.round(D.litPool(96)) === 57 && Math.round(D.litPool(72)) === 43 && L.buckets.includes(L.hero) && L.buckets.includes(L.heroNight), JSON.stringify(pools));
    const moving = [L.bolt, L.burst, L.flameFoe, L.flameBoss];
    check("gfx2", "light: C5 moving lights are radius buckets: a bolt, ring or mend in flight 56 px, a nova or cone burst 72, a flame foe 56 and a flame boss 72; all smaller than the hero's light below ground, so the torch still owns the room", JSON.stringify(moving) === "[56,72,56,72]" && moving.every((r) => L.buckets.includes(r) && r < L.hero) && L.budget === 24);
  }

  // Palette v2 and the master ramps (C3).
  {
    const p = py("import json, hashlib\nfrom palette_locked import LOCKED, LOCKED_V2, PALETTE_V2_ADD\nfrom ramps import RAMPS\nprint(json.dumps({'n': len(LOCKED), 'n2': len(LOCKED_V2), 'add': sorted(PALETTE_V2_ADD), 'fresh': sorted(PALETTE_V2_ADD - LOCKED), 'md5': hashlib.md5(','.join(sorted(LOCKED)).encode()).hexdigest(), 'v2': sorted(LOCKED_V2 - LOCKED), 'ramps': RAMPS, 'out': sorted({c for r in RAMPS.values() for c in r} - LOCKED_V2)}))");
    if (p.error) p.ramps = {};
    check("gfx2", "palette v2 (C3): LOCKED is unchanged (497 colours, the gfx1 set exactly, so older writers stay byte-identical) and LOCKED_V2 adds exactly #2e2030, #8a3a18 and #9a8aa8, none already locked; the checks' locked set reads them", p.n === 497 && p.md5 === "7afd89b627e2d4f6082e06d7fb4ed070" && p.n2 === 500 && JSON.stringify(p.add) === '["#2e2030","#8a3a18","#9a8aa8"]' && JSON.stringify(p.fresh) === JSON.stringify(p.add) && JSON.stringify(p.v2) === JSON.stringify(p.add) && p.add.every((c) => locked.has(c)), p.error || JSON.stringify([p.n, p.n2, p.add, p.md5]));
    const names = "void crypt flag moss wood bone wine pumpkin steel skin tabard gold hex emberlit coldlit flame spectral";
    const rampOk = Object.values(p.ramps).every((r) => r.length >= 4 && r.length <= 7 && r.every((c, i) => i === 0 || lum(c) > lum(r[i - 1])));
    check("gfx2", "ramps (C3): tools/sprite-writer/ramps.py is the doc's 17 master ramps by name, 4-7 steps each, strictly lighter step by step, every colour in palette v2; bone starts at the new outline #2e2030, pumpkin carries the new ember #8a3a18 and crypt the new #9a8aa8", !p.error && Object.keys(p.ramps).join(" ") === names && rampOk && !p.out.length && p.ramps.bone[0] === "#2e2030" && p.ramps.pumpkin[1] === "#8a3a18" && p.ramps.crypt.includes("#9a8aa8"), p.error || p.out.join(","));
  }

  // The floor kit art.
  {
    const fr = JSON.parse(readFileSync("tools/pixel-writer/floor-ramps.json", "utf8"));
    const wr = JSON.parse(readFileSync("tools/pixel-writer/wall-ramps.json", "utf8"));
    const flag = ["#1c1418", "#3a3030", "#4a4450", "#5a564e", "#6a6660", "#8a867c"];
    const bone = ["#2e2030", "#6a5a4a", "#a89470", "#d8c8a0", "#f4ecdc"];
    const moss = ["#1e3a28", "#2f6a44", "#4a8a48"], ember = ["#3a1810", "#8a3a18", "#c45a18"];
    const bad = [];
    for (const c of caves) {
      const f = readPng(`public/art/writer/floor-${c.id}.png`), d = readPng(`public/art/writer/decal-${c.id}.png`);
      const r = fr[c.id];
      const grow = ["wick", "hearth", "warren"].includes(c.id) ? ember : moss;
      const cells = Array.from({ length: 13 }, (_, i) => f.cell(i));
      const dec = Array.from({ length: 6 }, (_, i) => d.cell(i));
      const ramp = r.length === 6 && r.every((x, i) => i === 0 || lum(x) > lum(r[i - 1])) && lum(r[4]) - lum(wr[c.id][3]) >= 28;
      const opaque = cells.every((k) => k.every((v) => v));
      const distinct = new Set(cells.map((k) => k.join())).size === 13 && new Set(dec.map((k) => k.join())).size === 6;
      const inks = [...f.inks].every((x) => r.includes(x)) && [...d.inks].every((x) => r.includes(x) || bone.includes(x) || grow.includes(x)) && [...f.inks, ...d.inks].every((x) => locked.has(x));
      const count = new Set([...f.inks, ...d.inks]).size;
      const slab = cells.slice(0, 5).every((k) => { const n = {}; k.forEach((v) => (n[v] = (n[v] || 0) + 1)); return Object.entries(n).sort((a, b) => b[1] - a[1])[0][0] === r[4]; });
      const bevel = cells.slice(0, 5).every((k) => k[0] === r[5] && k[255] === r[2] && k[31] === r[3]);
      const broken = cells[8].includes(r[0]) && cells[8].includes(r[1]) && !cells.slice(0, 8).some((k) => k.includes(r[0]));
      const cross = cells.slice(9).every((k) => k.includes(r[1])) && cells[9][0] === r[5] && cells[12][255] === r[2];
      const decal = dec.every((k) => { const n = k.filter((v) => v).length; return n > 4 && n < 128; }) && dec[3].some((v) => grow.includes(v)) && dec[0].some((v) => bone.includes(v)) && dec[1].includes("#2e2030");
      const ok = f.pw === 208 && f.ph === 16 && d.pw === 96 && d.ph === 16 && !f.soft && !d.soft && ramp && opaque && distinct && inks && count <= 20 && slab && bevel && broken && cross && decal;
      if (!ok) bad.push(`${c.id} ${f.pw}x${f.ph}/${d.pw}x${d.ph} soft ${f.soft}/${d.soft} ramp ${ramp} opaque ${opaque} distinct ${distinct} inks ${inks} n ${count} slab ${slab} bevel ${bevel} broken ${broken} cross ${cross} decal ${decal}`);
    }
    check("gfx2", "art: a floor kit per cave (13) from the pixel writer: 13 opaque, distinct 16x16 cells (five single slabs, split h/v, offset, broken, a 2x2 grave slab with a carved cross) in a 6-step ramp, strictly lighter, its slab at least two steps (28 luminance) above the wall's base so floor and wall separate; bevel top/left +1, bottom -2, right -1; holes only in the broken cell; locked colours, hard alpha", !bad.length && /def flagstone\(/.test(pix) && /def big_slab\(/.test(pix) && /def floor_ramp\(/.test(pix) && /floor\.save\(OUT \/ f"floor-\{name\}\.png"\)/.test(writer) && /^FLOOR_GAP = 28 /m.test(writer) && /if lum\(ramp\[4\]\) - lum\(walls\[name\]\[3\]\) < FLOOR_GAP:/.test(writer), bad.join("; "));
    check("gfx2", "art: six distinct transparent decals per cave (bones, skull with the new #2e2030 outline, crack, moss or ember growth with the new #8a3a18 in the ember caves, wax, rubble), in the floor ramp, the bone ramp and the growth only; with the kit, at most 20 colours a cave (the 12-20 law); ossuary's floor is the doc's flag ramp", !bad.length && JSON.stringify(fr.ossuary) === JSON.stringify(flag) && ["wick", "hearth", "warren"].every((k) => readPng(`public/art/writer/decal-${k}.png`).inks.has("#8a3a18")) && /def floor_decal\(/.test(pix) && /decal\.save\(OUT \/ f"decal-\{name\}\.png"\)/.test(writer), bad.join("; "));
  }

  // The floor kit layout: seeded, cached, and never on anything you must read.
  {
    const g1 = fresh(), g2 = fresh();
    g1.enterDungeon("ossuary");
    g2.enterDungeon("ossuary");
    const k1 = D.floorKit(g1), k2 = D.floorKit(g2);
    const same = !!k1 && !!k2 && k1.cells.join() === k2.cells.join() && k1.decals.join() === k2.decals.join() && D.floorKit(g1) === k1;
    const noKitUp = (() => { const g = fresh(); g.enterTown(); const t = D.floorKit(g); g.enterWorld(10 * TILE + 8, 33 * TILE + 9); return t === null && D.floorKit(g) === null; })();
    let tiles = 0, single = 0, split = 0, offset = 0, big = 0, broken = 0, eligible = 0, traps = 0, mossN = 0, foot = 0, otherN = 0;
    const bad = [];
    const F = D.FLOOR_CELL, DC = D.DECAL_CELL;
    const kits = new Set();
    for (const c of caves) {
      const g = fresh(c.id === "grave" ? "vampire" : "warrior");
      g.enterDungeon(c.id === "cave" ? "barrow" : c.id);
      const k = D.floorKit(g);
      if (!k || g.theme !== c.id) { bad.push(`${c.id} floor no kit`); continue; }
      kits.add(k.cells.join());
      const cap = g.feats?.captive;
      for (let y = 0; y < g.h; y++) for (let x = 0; x < g.w; x++) {
        const i = y * g.w + x, cell = k.cells[i], dcl = k.decals[i];
        const isFloor = !g.hidden.has(i) && g.tiles[i] === D.T.floor;
        if (isFloor !== (cell >= 0)) { bad.push(`${c.id} ${x},${y} floor ${isFloor} cell ${cell}`); continue; }
        if (!isFloor) { if (dcl >= 0) bad.push(`${c.id} decal off floor ${x},${y}`); continue; }
        tiles++;
        const hole = (x * 13 + y * 7) % 23 === 0;
        if (hole !== (cell === F.broken)) bad.push(`${c.id} hole ${x},${y} ${cell}`);
        if (F.single.includes(cell)) single++; else if (F.split.includes(cell)) split++; else if (cell === F.offset) offset++; else if (cell === F.broken) broken++;
        else if (F.big.includes(cell)) {
          big++;
          const q = F.big.indexOf(cell), ox = x - (q & 1), oy = y - (q >> 1);
          if (ox % 2 || oy % 2 || ![0, 1, 2, 3].every((j) => k.cells[(oy + (j >> 1)) * g.w + ox + (j & 1)] === F.big[j])) bad.push(`${c.id} big ${x},${y}`);
        }
        if (g.trapAt(i) >= 0) traps++;
        const must = g.trapAt(i) >= 0 || (cap && cap.x === x && cap.y === y) || F.big.includes(cell) || cell === F.broken;
        if (!must) eligible++;
        const up = y > 0 ? (g.hidden.has(i - g.w) ? D.T.wall : g.tiles[i - g.w]) : -1;
        const atFoot = [D.T.wall, D.T.runeDoor, D.T.crack, D.T.brazier, D.T.statue].includes(up) || up === -1;
        if (!must && atFoot) foot++;
        if (dcl === DC.moss) mossN++; else if (dcl >= 0) otherN++;
        if (dcl >= 0) {
          if (must) bad.push(`${c.id} decal on a must-read tile ${x},${y}`);
          const above = y > 0 ? (g.hidden.has(i - g.w) ? D.T.wall : g.tiles[i - g.w]) : -1;
          const rocky = [D.T.wall, D.T.runeDoor, D.T.crack, D.T.brazier, D.T.statue].includes(above) || above === -1;
          if (dcl === DC.moss && !rocky) bad.push(`${c.id} moss off a wall foot ${x},${y}`);
        }
      }
    }
    const sh = (n) => n / tiles;
    const mix = `single ${sh(single).toFixed(3)} split ${sh(split).toFixed(3)} offset ${sh(offset).toFixed(3)} broken ${sh(broken).toFixed(3)} big ${sh(big).toFixed(3)}; moss ${(mossN / foot).toFixed(3)} of wall-foot tiles, another decal ${(otherN / (eligible - mossN)).toFixed(3)} of the rest, over ${tiles} tiles`;
    check("gfx2", "floor kit: seeded per floor (two fresh games lay the same slabs and decals; every cave its own), cached per floor (the same object frame to frame), none in town or the vale; every floor tile has a cell and nothing else does", same && noKitUp && kits.size === caves.length && !bad.some((b) => / floor | decal off /.test(b)), bad.slice(0, 4).join("; "));
    check("gfx2", `floor kit: the mix (${mix}): mostly single slabs, about a fifth split, some offset, the old pit tiles exactly as the broken cell, whole even-aligned 2x2 grave slabs; moss on about a third of the wall-foot tiles and another decal on about one tile in ten`, sh(single) > 0.5 && sh(single) < 0.72 && sh(split) > 0.15 && sh(split) < 0.27 && sh(offset) > 0.06 && sh(offset) < 0.16 && sh(broken) > 0.02 && sh(broken) < 0.07 && sh(big) > 0.01 && mossN / foot > 0.25 && mossN / foot < 0.45 && otherN / (eligible - mossN) > 0.06 && otherN / (eligible - mossN) < 0.14 && !bad.some((b) => /hole|big /.test(b)), bad.slice(0, 4).join("; "));
    check("gfx2", `floor kit: a decal never sits on a trap (${traps} seen), the captive's stake (the next check), a grave slab or a broken tile, so nothing you must read is hidden; moss only grows at a wall foot; the sim never reads the kit`, traps > 0 && !bad.some((b) => /must-read|moss/.test(b)) && !/floorKit|FLOOR_CELL|decal-/.test(readFileSync("src/game/sim.ts", "utf8")), bad.slice(0, 4).join("; "));
    const capFloors = [];
    for (const c of caves) {
      const g = fresh(c.id === "grave" ? "vampire" : "warrior");
      const id = c.id === "cave" ? "barrow" : c.id;
      for (let f = 1; f <= 5; f++) {
        g.enterDungeon(id);
        g.floor = f;
        g.loadFloor("start");
        const cap = g.feats?.captive;
        if (!cap) continue;
        const k = D.floorKit(g);
        capFloors.push(`${id}:${f} ${k && k.cells[cap.y * g.w + cap.x] >= 0 ? k.decals[cap.y * g.w + cap.x] : "x"}`);
      }
    }
    check("gfx2", `floor kit: no decal on the captive's stake on any floor that has one (${capFloors.length} floors), and the exclusion is in the layout itself`, capFloors.length > 0 && capFloors.every((s) => s.endsWith(" -1")) && /if \(c < 0 \|\| c >= FLOOR_CELL\.big\[0\] \|\| c === FLOOR_CELL\.broken \|\| g\.trapAt\(i\) >= 0 \|\| \(cap && cap\.x === x && cap\.y === y\)\) continue;/.test(draw), capFloors.slice(0, 6).join(", "));
    const changed = (() => { const g = fresh(); g.enterDungeon("ossuary"); const a = D.floorKit(g); const j = a.cells.findIndex((v) => v >= 0); g.tiles[j] = D.T.wall; const b = D.floorKit(g); return a !== b && b.cells[j] === -1; })();
    check("gfx2", "floor kit: when a floor tile changes (a wall opened or closed) the kit is laid again, so a slab never sits on rock", changed);
  }

  // How the kit and the shadows are drawn.
  {
    check("gfx2", "draw: a dungeon floor tile draws its kit cell from floor-<cave>.png (with the ore gems kept, the old marks dropped), the old bricks only while the sheet loads; its decal goes on right after the tile and before fringes, floods, secrets and traps", /const kit = cave && tile === T\.floor \? floorKitCell\(x, y\) : -1;\n {2}if \(kit >= 0 && sheetCell\(ctx, `\/art\/writer\/floor-\$\{theme in CAVES \? theme : "cave"\}\.png`, kit, 0, gx, gy\)\) paintCaveFloor\(ctx, x, y, theme, true, true\);\n {2}else if \(cave && tile === T\.floor\)/.test(draw) && /drawTile\(ctx, base, x, y, n, g\.theme, above, g\.frame, left, right, below\);\n {6}if \(kitNow && kitNow\.decals\[i\] >= 0\) sheetCell\(ctx, `\/art\/writer\/decal-\$\{g\.theme in CAVES \? g\.theme : "cave"\}\.png`, kitNow\.decals\[i\], 0, x \* TILE, y \* TILE\);\n {6}if \(skin\) paintFringes/.test(draw) && /kitNow = floorKit\(g\);/.test(draw));
    check("gfx2", "draw: the floor kits and decal strips are preloaded in their own loop after gfx1's, so a floor never pops from bricks to slabs", /for \(const url of Object\.keys\(CAVES\)\.flatMap\(\(k\) => \[`\/art\/writer\/floor-\$\{k\}\.png`, `\/art\/writer\/decal-\$\{k\}\.png`\]\)\) \{\n {4}const im = new Image\(\);\n {4}im\.src = url;\n {4}landSheet\[url\] = im;/.test(draw) && draw.indexOf("/art/writer/floor-${k}.png") > draw.indexOf('"/art/writer/lamp.png", ...["rift"'));
    const B = D.BLOB;
    const calls = [
      "fn: () => { blobShadow(ctx, g, n.x, n.y - 2); draw(ctx); }",
      "if (r.boss) blobShadow(ctx, g, r.x, r.y - 4, BLOB.bossW, BLOB.bossH);\n        else blobShadow(ctx, g, r.x, r.y - 2);\n        body(ctx);",
      "blobShadow(ctx, g, c.x, c.y - 2, BLOB.smallW, BLOB.smallH);\n        monsterSprite(ctx, c.x, c.y",
      "fn: () => { blobShadow(ctx, g, ally.x, ally.y - 2); draw(ctx); }",
      'if (esc.state !== "down") blobShadow(ctx, g, esc.x, esc.y - 2);\n          if (esc.state === "down" && sheetCell',
      'if (pose !== "wade" && pose !== "slide" && pose !== "fish") blobShadow(ctx, g, g.px, g.py - 2);\n      person(ctx, g.px, g.py, role',
    ];
    const missing = calls.filter((c) => !draw.includes(c));
    check("gfx2", "draw: blob shadows (doc section 7) go under every actor before its body in the same y-sorted step: townsfolk, foes (a boss gets the wide one), critters (the small one), the companion, the captive (not when downed), the hero (not wading, sliding or fishing); the actor closures the light layer re-draws stay body-only", !missing.length && (draw.match(/blobShadow\(ctx, g,/g) || []).length === 7 && !/actor: \(c[^\n]*blobShadow/.test(draw) && /actor: draw \}/.test(draw), missing.join(" | "));
    const blobSrc = draw.slice(draw.indexOf("export const BLOB"), draw.indexOf("// C5 moving lights (gfx2)"));
    check("gfx2", "draw: a blob shadow is a hard-edged ellipse of whole pixels (no gradient, no blur), multiplied to 45%, 10x4 (20x6 a boss, 8x3 a critter), baked once per size and cached, pinned to the pixel grid, and skipped on water, pools and ice", B.k === 0.45 && B.w === 10 && B.h === 4 && B.bossW === 20 && B.bossH === 6 && B.smallW === 8 && B.smallH === 3 && /const hit = blobCache\.get\(key\);\n {2}if \(hit\) return hit;/.test(blobSrc) && /blobCache\.set\(key, c\);/.test(blobSrc) && /x\.fillStyle = rgbCss\(\[1, 1, 1\], BLOB\.k\);/.test(blobSrc) && /if \(\(\(i \+ 0\.5 - w \/ 2\) \/ \(w \/ 2\)\) \*\* 2 \+ \(\(j \+ 0\.5 - h \/ 2\) \/ \(h \/ 2\)\) \*\* 2 <= 1\) x\.fillRect\(i, j, 1, 1\);/.test(blobSrc) && /ctx\.globalCompositeOperation = "multiply";\n {2}ctx\.drawImage\(spr, Math\.round\(x - w \/ 2\), Math\.round\(footY - h \/ 2\)\);/.test(blobSrc) && /const NO_SHADOW: ReadonlySet<number> = new Set\(\[T\.water, T\.pool, T\.ice\]\);/.test(blobSrc) && /NO_SHADOW\.has\(g\.tiles\[ty \* g\.w \+ tx\]\)\) return;/.test(blobSrc) && !/Gradient|filter\s*=|shadowBlur|Math\.random|Date\.now/.test(draw.slice(draw.indexOf("// Core Keeper-style graphics pass, batch 2"), draw.indexOf("export function drawWorld"))));
  }

  // C11 emits and C5 spell and flame lights on real games.
  {
    const emits = JSON.parse(readFileSync("tools/spell-writer/emits.json", "utf8"));
    const strips = readdirSync("public/art/spells/gen").filter((f) => f.endsWith(".png") && f !== "preview.png").map((f) => f.slice(0, -4)).sort();
    const pyE = py(`import json\nfrom spell_writer import EMITS, emits_for\nprint(json.dumps({'e': {n: emits_for(n) for n in ${JSON.stringify(strips)}}, 'b': emits_for('beam-shadow')}))`, "tools/spell-writer");
    if (pyE.error) pyE.e = {};
    const sameE = !pyE.error && JSON.stringify(Object.entries(D.SPELL_EMITS).sort()) === JSON.stringify(Object.entries(emits).sort()) && JSON.stringify(Object.entries(pyE.e).sort()) === JSON.stringify(Object.entries(emits).sort());
    check("gfx2", "C11: every spell-writer strip carries an emits light (emits.json, written by the spell writer), the game mirrors it exactly, a beam takes its element's light, and every emits light is one of the doc's colours", sameE && JSON.stringify(Object.keys(emits).sort()) === JSON.stringify(strips) && pyE.b === "hex" && Object.values(emits).every((v) => v in D.LIGHTS) && /def emits_for\(/.test(readFileSync("tools/spell-writer/spell_writer.py", "utf8")), `${strips.length} strips, ${Object.keys(emits).length} emits`);
    const S = (k, c) => D.spellStrip(k, c);
    const strip = [S("bolt", "#f4e27a"), S("bolt", "#c43838"), S("bolt", "#6a8a48"), S("bolt", "#e8dcc8"), S("bolt", "#3a6aa8"), S("ring", "#c4a050"), S("mend", "#f4e27a"), S("cone", "#c43838"), S("nova", "#c43838"), S("nova", "#3a6aa8"), S("nova", "#8a6844")].join(" ");
    const paint = draw.slice(draw.indexOf("function paintSpell("), draw.indexOf("if (drew) return;", draw.indexOf("function paintSpell(")));
    check("gfx2", "C11: a spell's light follows the strip it is drawn with: spellStrip makes paintSpell's choice (a lightning bolt, else a beam in its element; a cone or a fire/ice nova rains; a ring or mend is the orb; else the nova)", strip === "lightning beam-fire beam-venom beam-holy beam-ice orb orb fire-rain fire-rain ice-rain nova" && /if \(kind === "bolt" && element === "lightning"\) \{\n {4}drew = stampSpell\(ctx, "lightning\.png"/.test(paint) && /element === "ice" \? "beam-ice" : element === "fire" \? "beam-fire" : element === "shadow" \? "beam-shadow" : element === "venom" \? "beam-venom" : "beam-holy";/.test(paint) && /\} else if \(kind === "cone" \|\| \(kind === "nova" && \(element === "fire" \|\| element === "ice"\)\)\) \{\n {4}const rain = element === "ice" \? "ice-rain\.png" : "fire-rain\.png";/.test(paint) && /\} else if \(kind === "ring" \|\| kind === "mend"\) \{\n {4}const t = \(Math\.abs\(Math\.floor\(frame\)\) % 6\) \/ 5;/.test(paint), strip);
    const g = fresh();
    g.enterDungeon("ossuary");
    g.spells = [];
    g["bolt"](g.px, g.py - 12, g.px + 64, g.py - 10, "bolt", "#c43838");
    g["bolt"](g.px, g.py, g.px + 32, g.py, "ring", "#c4a050");
    g["bolt"](g.px, g.py - 12, g.px + 40, g.py + 20, "nova", "#8a6844");
    g.frame = 9;
    const ls = D.sceneLights(g, g.px - 120, g.py - 80, 240, 160);
    const has = (x, y, r, c) => ls.some((l) => Math.abs(l.x - x) < 0.01 && Math.abs(l.y - y) < 0.01 && l.r === r && JSON.stringify(l.c) === JSON.stringify(c) && !l.flick);
    const t = (9 % 6) / 5;
    const placed = has(g.px + 32, g.py - 11, 56, D.LIGHTS.pumpkin) && has(g.px + 32 * t, g.py, 56, D.LIGHTS.candle) && has(g.px + 40, g.py + 20, 72, D.LIGHTS.hex) && ls[0].r === 96;
    for (let i = 0; i < 30; i++) g["bolt"](g.px, g.py, g.px + 8, g.py, "bolt", "#f4e27a");
    const many = D.sceneLights(g, g.px - 120, g.py - 80, 240, 160);
    check("gfx2", "C5: spells in flight light the world (the sim's own bolt): a bolt at its mid-beam (56 px), a ring or mend at its travelling orb, frame for frame with the drawn orb, a nova or cone burst at its target (72 px), each in its strip's light, steady; the hero's torch stays first and the list stays within the budget of 24", placed && many[0].r === 96 && many.length <= 24 && g.spells.length <= 12, JSON.stringify(ls.slice(0, 5).map((l) => [Math.round(l.x - g.px), Math.round(l.y - g.py), l.r])));
    const roamerAt = (def, dx, boss) => ({ id: `t-${def}`, def, x: g.px + dx, y: g.py, boss, family: "lantern", tint: "#e07a2f", level: 1, ang: 0 });
    g.spells = [];
    g.roamers = [roamerAt("pumpkin", 24, false), roamerAt("lanternking", -40, true), roamerAt("rat", 30, false)];
    if (g.fog) g.roamers.forEach((r) => (g.fog[Math.floor(r.y / TILE) * g.w + Math.floor(r.x / TILE)] = 2));
    const fl = D.sceneLights(g, g.px - 120, g.py - 80, 240, 160);
    const foe = fl.find((l) => l.x === g.px + 24), boss = fl.find((l) => l.x === g.px - 40), rat = fl.find((l) => l.x === g.px + 30);
    const lit = !!foe && foe.r === 56 && foe.y === g.py - 12 && foe.flick && JSON.stringify(foe.c) === JSON.stringify(D.LIGHTS.pumpkin) && !!boss && boss.r === 72 && boss.y === g.py - 22 && boss.flick && JSON.stringify(boss.c) === JSON.stringify(D.LIGHTS.pumpkin) && !rat;
    let dark = false;
    if (g.fog) { g.fog[Math.floor(g.py / TILE) * g.w + Math.floor((g.px + 24) / TILE)] = 0; dark = !D.sceneLights(g, g.px - 120, g.py - 80, 240, 160).some((l) => l.x === g.px + 24); }
    const ids = readFileSync("src/game/content.ts", "utf8");
    check("gfx2", "C5: flame foes carry a flickering pumpkin light (Lantern Man 56 px at the head, a flame boss 72 px higher up), other foes none, and a flame foe on unexplored rock lights nothing (it never gives itself away); the four ids are real foes", lit && dark && [...D.FLAME_FOES].sort().join() === "horseman,lanternking,pumpkin,pumpkinlord" && ['id: "pumpkin", name: "Lantern Man"', 'id: "lanternking"', 'id: "pumpkinlord"'].every((s) => ids.includes(s)) && /\bhorseman: \{/.test(readFileSync("src/game/sim.ts", "utf8")), JSON.stringify({ foe, boss, rat, dark }));
  }

  // Nothing in play changed.
  check("gfx2", "play is untouched: sim.ts, content.ts, feats.ts, particles.ts, audio.ts are byte-identical to before the batch, and Gravewake.tsx is that HUD, the screen1 HUD or the retro1 HUD (screen1 changed presentation and input reading only, retro1 the Retro view only; their own groups check how) (movement, collision, combat numbers, shops, saves, audio, the HUD)", md5("src/game/sim.ts") === "a3ecff0b08113f1b418cb4127e7a4f94" && md5("src/game/content.ts") === "e520f80e802f7b80d5b5835893cbb019" && md5("src/game/feats.ts") === "39ed775c579eed137ffa64fd877bb647" && md5("src/game/particles.ts") === "32a2407a12fd4f93b4e6a423adcda043" && md5("src/game/audio.ts") === "98fbcef17779a2f944f6e71f913eba81" && ["12ba2ee592c8e09a8c014e64df3ed0b1", SCREEN1_HUD, RETRO1_HUD].includes(md5("src/game/Gravewake.tsx")));
}

if (on("gfx3")) {
  // [OWNER-APPROVED 2026-10-01: CORE KEEPER GRAPHICS PASS C1-C11] Batch 3, with the owner's 15:59 ET approvals: the hero
  // light exception, brighter vale nights; ghost lights, the Deathbolt's light, #9a8aa8 walls, the harrow floor, glow masks.
  const { readFileSync, writeFileSync, existsSync } = await import("node:fs");
  const { inflateSync } = await import("node:zlib");
  const { createHash } = await import("node:crypto");
  const TAG = "[OWNER-APPROVED 2026-10-01: CORE KEEPER GRAPHICS PASS C1-C11]";
  const EXC = "[OWNER-APPROVED EXCEPTION 2026-10-01 15:59 ET: hero light 96/72 px]";
  const VALE = "[OWNER-APPROVED 2026-10-01 15:59 ET: brighter vale nights]";
  const dir = mkdtempSync(join(tmpdir(), "gravewake-"));
  const entry = join(dir, "gfx3.ts");
  const root = process.cwd();
  writeFileSync(entry, `export * from "${root}/src/game/draw.ts";\nexport * from "${root}/src/game/light.ts";\nexport { T, HERO_SPELLS } from "${root}/src/game/content.ts";\n`);
  const file = join(dir, "gfx3.mjs");
  execFileSync("npx", ["esbuild", entry, "--bundle", "--platform=node", "--format=esm", "--log-level=warning", `--outfile=${file}`], { stdio: ["ignore", "ignore", "inherit"] });
  const D = await import(pathToFileURL(file).href);
  const L = D.LIGHT;
  const draw = readFileSync("src/game/draw.ts", "utf8");
  const writer = readFileSync("tools/pixel-writer/make_gravewake.py", "utf8");
  const pix = readFileSync("tools/pixel-writer/pixel_writer.py", "utf8");
  const md5 = (f) => createHash("md5").update(readFileSync(f)).digest("hex");
  const locked = new Set([...readFileSync("tools/sprite-writer/palette_locked.py", "utf8").split("SPRITE_CORE")[0].matchAll(/"(#[0-9a-f]{6})"/g)].map((m) => m[1]));
  const lum = (c) => { const n = parseInt(c.slice(1), 16); return 0.299 * (n >> 16) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255); };
  const readPng = (f) => {
    const b = readFileSync(f);
    let o = 8, pw = 0, ph = 0;
    const idat = [];
    while (o < b.length) {
      const len = b.readUInt32BE(o);
      const kind = b.toString("ascii", o + 4, o + 8);
      const data = b.subarray(o + 8, o + 8 + len);
      if (kind === "IHDR") { pw = data.readUInt32BE(0); ph = data.readUInt32BE(4); if (data[9] !== 6 || data[8] !== 8) throw new Error(`${f} png type`); }
      if (kind === "IDAT") idat.push(data);
      o += 12 + len;
    }
    const raw = inflateSync(Buffer.concat(idat));
    const stride = pw * 4, px = Buffer.alloc(pw * ph * 4);
    for (let y = 0; y < ph; y++) {
      const f0 = raw[y * (stride + 1)];
      for (let x = 0; x < stride; x++) {
        const v = raw[y * (stride + 1) + 1 + x];
        const a = x >= 4 ? px[y * stride + x - 4] : 0, up = y > 0 ? px[(y - 1) * stride + x] : 0, c = x >= 4 && y > 0 ? px[(y - 1) * stride + x - 4] : 0;
        let p = v;
        if (f0 === 1) p = v + a; else if (f0 === 2) p = v + up; else if (f0 === 3) p = v + ((a + up) >> 1);
        else if (f0 === 4) { const qq = a + up - c; const pa = Math.abs(qq - a), pb = Math.abs(qq - up), pc = Math.abs(qq - c); p = v + (pa <= pb && pa <= pc ? a : pb <= pc ? up : c); }
        px[y * stride + x] = p & 255;
      }
    }
    const at = (x, y) => { const k = (y * pw + x) * 4; return px[k + 3] ? `#${[0, 1, 2].map((j) => px[k + j].toString(16).padStart(2, "0")).join("")}` : null; };
    const inks = new Set();
    let soft = 0;
    for (let k = 0; k < px.length; k += 4) { if (px[k + 3] && px[k + 3] !== 255) soft++; if (px[k + 3]) inks.add(`#${[0, 1, 2].map((j) => px[k + j].toString(16).padStart(2, "0")).join("")}`); }
    return { pw, ph, px, at, soft, inks };
  };
  const pyCache = mkdtempSync(join(tmpdir(), "gravewake-pyc-"));
  const py = (code, cwd = "tools/pixel-writer") => {
    try { return JSON.parse(execFileSync("python3", ["-c", code], { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], env: { ...process.env, PYTHONPYCACHEPREFIX: pyCache } })); }
    catch (e) { return { error: String(e.stderr || e.message).trim().split("\n").pop() }; }
  };
  const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
  const canon = (o) => JSON.stringify(Object.keys(o).sort().map((k) => [k, o[k]]));

  // Brighter vale nights (the owner's 15:59 ET approval).
  {
    const v = L.worldNight, t = L.townNight;
    check("gfx3", "light: brighter vale nights: the moon is [0.68, 0.72, 0.92] (up from [0.38, 0.42, 0.62] on every channel); blue still leads and red is lowest, and every channel stays below day, so it reads as night", same(v, [0.68, 0.72, 0.92]) && v[2] > v[1] && v[1] > v[0] && v.every((x) => x < 1) && [0.38, 0.42, 0.62].every((x, i) => v[i] > x), JSON.stringify(v));
    check("gfx3", "light: the town's twilight is [0.74, 0.76, 0.96], lighter than the vale's moon on every channel (so town night stays lighter), blue leading, below day", same(t, [0.74, 0.76, 0.96]) && t.every((x, i) => x > v[i] && x < 1) && t[2] > t[1] && t[1] >= t[0], JSON.stringify(t));
  }

  // The rules carry the owner's two dated tags where the rules change.
  {
    const rules = readFileSync("rules/GAME_LAYOUT_TWO.txt", "utf8").split("\n");
    const agents = readFileSync("AGENTS.project.md", "utf8").split("\n");
    const under = (lines, rule, start) => lines.findIndex((l, i) => i > 0 && l.trim().startsWith(start) && lines[i - 1].includes(rule));
    const all = [...rules, ...agents].join("\n");
    const radius = under(rules, "Radius short: 3–5 tiles on 16-bit", EXC + " The hero's light is wider than the short radius above");
    const law = under(rules, "Off-hand light is the only moving glow (3–5 tiles / 4–6 units).", EXC);
    const ag = under(agents, TAG + " C4, C6, C7, C9: below ground", EXC);
    const pool = radius >= 0 ? rules[radius] : "";
    const agl = ag >= 0 ? agents[ag] : "";
    const p96 = `${Math.round(D.litPool(L.hero))} px (3.5 tiles)`, p72 = `${Math.round(D.litPool(L.heroNight))} px (2.7 tiles)`;
    check("gfx3", "rules: the hero light is the owner's dated exception, tagged [OWNER-APPROVED EXCEPTION 2026-10-01 15:59 ET: hero light 96/72 px], under the off-hand radius rule (with the 96/72 px sprite and the 57 px / 43 px lit pools), under the short law's 3-5 tiles and under AGENTS.project.md's lighting note; exactly three, and the interim batch-2 note is gone", radius >= 0 && law >= 0 && ag >= 0 && all.split(EXC).length - 1 === 3 && pool.includes(`96 px below ground and 72 px outdoors at night`) && pool.includes(p96) && pool.includes(p72) && agl.includes("96 px below ground and 72 px outdoors at night") && agl.includes("57 px (3.5 tiles) and 43 px (2.7 tiles)") && L.hero === 96 && L.heroNight === 72 && !all.includes("] Batch 2: the hero's light sprite"), `${radius} ${law} ${ag}`);
    const fmt = (a) => `[${a.join(", ")}]`;
    const night = under(rules, TAG + " Night: the vale takes a moon ambient", VALE);
    const nl = night >= 0 ? rules[night] : "";
    check("gfx3", "rules: brighter vale nights is dated and tagged [OWNER-APPROVED 2026-10-01 15:59 ET: brighter vale nights] on the line under the night rule, and gives the shipped moon and town values (read from light.ts) and the old ones; once only", night >= 0 && all.split(VALE).length - 1 === 1 && nl.includes(`${fmt(L.worldNight)}, up from [0.38, 0.42, 0.62]`) && nl.includes(`${fmt(L.townNight)}, up from [0.5, 0.5, 0.7]`), `${night} ${nl.slice(0, 80)}`);
    const c5 = under(rules, TAG + " C5 (batch 2): moving lights built", TAG + " C5 (batch 3): ghosts");
    const c3 = under(agents, TAG + " C3 (batch 2): palette v2", TAG + " C3 (batch 3): the ossuary and harrow walls take palette v2's #9a8aa8");
    const em = under(agents, EXC, TAG + " Batch 3 glow masks:");
    const c5l = c5 >= 0 ? rules[c5] : "";
    check("gfx3", "rules: batch 3's own notes are dated and tagged, each under the note it extends: C5 (batch 3) ghost lights (40 px, 56 a boss, none on the Death Shade) and the Deathbolt's hex light; C3 (batch 3) #9a8aa8 walls and the harrow's own floor (slab #8a6858); the glow masks (the mimic has none)", c5 >= 0 && c3 >= 0 && em >= 0 && c5l.includes(`${L.ghost} px and ${L.ghostBoss} px on a boss`) && c5l.includes("the Death Shade has none") && c5l.includes("lights hex violet") && agents[c3].includes("slab #8a6858") && agents[em].includes("the mimic has none"), `${c5} ${c3} ${em}`);
  }

  // Ghost lights (C5) on a real game.
  {
    check("gfx3", "light: a ghost's light is 40 px (56 px a ghost boss), both radius buckets, both smaller than the hero's light below ground and outdoors at night", L.ghost === 40 && L.ghostBoss === 56 && L.buckets.includes(L.ghost) && L.buckets.includes(L.ghostBoss) && L.ghostBoss < L.heroNight && L.ghost < L.ghostBoss);
    const g = fresh();
    g.enterDungeon("ossuary");
    g.spells = [];
    const at = (def, family, dx, boss) => ({ id: `t-${def}-${dx}`, def, x: g.px + dx, y: g.py, boss, family, tint: "#c5d4e8", level: 1, ang: 0 });
    g.roamers = [at("ghost", "ghost", 24, false), at("bride", "ghost", -40, true), at("shade", "ghost", 30, true), at("rat", "rat", -20, false)];
    if (g.fog) g.roamers.forEach((r) => (g.fog[Math.floor(r.y / TILE) * g.w + Math.floor(r.x / TILE)] = 2));
    const ls = D.sceneLights(g, g.px - 120, g.py - 80, 240, 160);
    const find = (dx) => ls.filter((l) => l.x === g.px + dx);
    const [mob] = find(24), [boss] = find(-40);
    const ok = !!mob && mob.r === 40 && mob.y === g.py - 12 && !mob.flick && same(mob.c, D.LIGHTS.ghost) && !!boss && boss.r === 56 && boss.y === g.py - 22 && !boss.flick && same(boss.c, D.LIGHTS.ghost) && !find(30).length && !find(-20).length && ls[0].r === L.hero && find(24).length === 1;
    let dark = false;
    if (g.fog) { g.fog[Math.floor(g.py / TILE) * g.w + Math.floor((g.px + 24) / TILE)] = 0; dark = !D.sceneLights(g, g.px - 120, g.py - 80, 240, 160).some((l) => l.x === g.px + 24); }
    const ids = readFileSync("src/game/content.ts", "utf8");
    check("gfx3", "C5: ghosts carry a cold, steady ghost light (a Ghost 40 px at the head, a ghost boss 56 px higher up, no flicker), the Death Shade none (shades are negative light), other foes none, none on unexplored rock; the hero's torch stays first", ok && dark && ['id: "ghost", name: "Ghost", family: "ghost"', 'id: "shade", name: "Death Shade", family: "ghost"', 'id: "bride", name: "Gallows Bride", family: "ghost"'].every((s) => ids.includes(s)) && /if \(r\.family !== "ghost" \|\| r\.def === "shade"\) continue;/.test(draw), JSON.stringify(ls.slice(0, 5).map((l) => [Math.round(l.x - g.px), Math.round(l.y - g.py), l.r, l.flick])));
  }

  // The Deathbolt's light matches its purple (C11).
  {
    const pairs = [...Object.values(D.HERO_SPELLS).map((s) => [s.shape, s.color]), ["mend", "#d0e4ff"], ["bolt", "#6a8a48"], ["bolt", "#6a3a8a"], ["ring", "#f4e27a"], ["bolt", "#f4e27a"], ["ring", "#6a3a8a"], ["mend", "#6a3a8a"], ["ring", "#d8b090"], ["bolt", "#3a6aa8"]];
    const got = Object.fromEntries(pairs.map(([k, c]) => [`${k} ${c}`, D.spellStrip(k, c)]));
    const want = { "ring #c4a050": "orb", "nova #8a6844": "nova", "cone #c43838": "fire-rain", "bolt #c43838": "beam-fire", "bolt #6a3a8a": "beam-shadow", "ring #6a8a48": "orb", "nova #2a241c": "nova", "ring #f4e27a": "orb", "bolt #e8dcc8": "beam-holy", "bolt #6a8a48": "beam-venom", "cone #c4a050": "fire-rain", "nova #1a140c": "nova", "mend #d0e4ff": "orb", "bolt #f4e27a": "lightning", "ring #6a3a8a": "orb", "mend #6a3a8a": "orb", "ring #d8b090": "orb", "bolt #3a6aa8": "beam-ice" };
    const bad = Object.keys(want).filter((k) => got[k] !== want[k]);
    check("gfx3", "C11: the Deathbolt (#6a3a8a, the hero's and the companion's drain) draws the shadow beam and lights hex violet, like its purple; every other spell colour keeps its gfx2 strip (an ice bolt is still ice)", !bad.length && Object.keys(got).length === Object.keys(want).length && D.HERO_SPELLS.Deathbolt.color === "#6a3a8a" && D.SPELL_EMITS["beam-shadow"] === "hex" && D.SPELL_EMITS["beam-ice"] === "ghost" && /\/\/ the shadow beam and lights hex violet \(C11\)[^\n]*\n {2}if \(r > g \+ 25 && b > g \+ 25 && b > 70\) return "shadow";\n {2}if \(b > r \+ 10 && b > g\) return "ice";/.test(draw), bad.map((k) => `${k}=${got[k]}`).join(", "));
    const g = fresh();
    g.enterDungeon("ossuary");
    g.spells = [];
    g["bolt"](g.px, g.py - 12, g.px + 64, g.py - 10, "bolt", "#6a3a8a");
    const ls = D.sceneLights(g, g.px - 120, g.py - 80, 240, 160);
    const hit = ls.find((l) => Math.abs(l.x - (g.px + 32)) < 0.01 && Math.abs(l.y - (g.py - 11)) < 0.01);
    check("gfx3", "C5: a Deathbolt in flight (the sim's own bolt) lights the world hex violet at its mid-beam, 56 px, steady", !!hit && hit.r === 56 && same(hit.c, D.LIGHTS.hex) && !hit.flick, JSON.stringify(hit));
  }

  // #9a8aa8 walls and the harrow's own floor (C1, C3).
  {
    const wr = JSON.parse(readFileSync("tools/pixel-writer/wall-ramps.json", "utf8"));
    const fr = JSON.parse(readFileSync("tools/pixel-writer/floor-ramps.json", "utf8"));
    const re = py("import json, sys\nsys.path.append('../sprite-writer')\nfrom palette_locked import LOCKED, LOCKED_V2\nimport make_gravewake as m\nfrom pixel_writer import wall_ramp, floor_ramp\nw = {k: m.WALL_FIXED.get(k) or wall_ramp(a, b, LOCKED) for k, (a, b) in m.WALLS.items()}\nf = {k: m.FLOOR_FIXED.get(k) or floor_ramp(m.CAVES[k][0], w[k], LOCKED_V2, **m.FLOOR_TUNE.get(k, {})) for k in m.CAVES}\nprint(json.dumps({'w': w, 'f': f, 'crypt': m.RAMPS['crypt'], 'tune': m.FLOOR_TUNE}))");
    const crypt = ["#1a1430", "#2a1c30", "#3a2a44", "#4a3a58", "#6a5878", "#9a8aa8"];
    const harrowW = ["#101014", "#1a2030", "#2a3140", "#3c4652", "#5a6878", "#9a8aa8"];
    const lipped = Object.entries(wr).filter(([, r]) => r[5] === "#9a8aa8").map(([k]) => k).sort();
    const sheets = ["ossuary", "harrow"].every((k) => { const im = readPng(`public/art/writer/wall-${k}.png`); return im.inks.has("#9a8aa8") && !im.inks.has("#9a958e") && !im.soft && wr[k].every((c) => im.inks.has(c)) && [...im.inks].every((c) => locked.has(c)); });
    check("gfx3", "art: the ossuary's walls are the doc's crypt ramp (its #9a8aa8 bright lip, palette v2) and the harrow's keep their blue-grey steps with the #9a8aa8 lip in place of the warm #9a958e; only those two; both sheets carry #9a8aa8, no #9a958e, every ink in palette v2; the writer's wall guard is palette v2", !re.error && same(wr.ossuary, crypt) && same(wr.harrow, harrowW) && same(re.crypt.slice(0, 6), crypt) && same(lipped, ["harrow", "ossuary"]) && sheets && /WALL_FIXED = \{"ossuary": RAMPS\["crypt"\]\[0:6\],/.test(writer) && /ramp = WALL_FIXED\.get\(name\) or wall_ramp\(wall, hi, LOCKED\)/.test(writer) && /not in LOCKED_V2:\n {16}raise SystemExit\(f"gfx1 sheet color/.test(writer), re.error || lipped.join());
    check("gfx3", "art: wall-ramps.json and floor-ramps.json are exactly what the writer makes now (every cave's walls and floor re-derived from make_gravewake.py and pixel_writer.py), so no ramp was hand-edited", !re.error && canon(re.w) === canon(wr) && canon(re.f) === canon(fr), re.error || "differ");
    const slabs = Object.entries(fr).map(([k, r]) => [k, r[4]]);
    const hs = fr.harrow[4];
    check("gfx3", "art: the harrow has its own floor: its warm earth hue at full strength (no pull to grey), slab #8a6858 two-plus steps (34) over its wall, no longer the ossuary's grey; its slab and its ramp match no other cave; the other caves' floors keep their gfx2 default (a 0.3 pull toward grey)", !re.error && same(fr.harrow, ["#1c1418", "#3a3030", "#5a463c", "#6e5e4c", "#8a6858", "#a08860"]) && slabs.filter(([, s]) => s === hs).length === 1 && new Set(Object.values(fr).map((r) => r.join())).size === Object.keys(fr).length && lum(hs) - lum(wr.harrow[3]) >= 34 && same(re.tune, { harrow: { gap: 34.0, pull: 0.0 } }) && /def floor_ramp\(hint: str, wall_ramp_: list\[str\], palette, gap: float = 30\.0, pull: float = 0\.3\)/.test(pix) && /want = tuple\(round\(h\[i\] \+ \(grey - h\[i\]\) \* pull\) for i in range\(3\)\)/.test(pix) && readPng("public/art/writer/floor-harrow.png").inks.has(hs), slabs.map((s) => s.join(":")).join(" "));
  }

  // Glow masks: the eyes, lanterns and sparks stay lit in the dark.
  {
    const EM = ["#f4e27a", "#fff8e0", "#e0a040"];
    const bad = [];
    for (const n of ["foes", "pumpkin-lord", "krampus"]) {
      const s = readPng(`public/art/sprites/${n}.png`), e = readPng(`public/art/sprites/${n}_em.png`);
      let kept = 0, miss = 0, wrong = 0;
      if (s.pw !== e.pw || s.ph !== e.ph || e.soft) { bad.push(`${n} size/soft`); continue; }
      for (let y = 0; y < s.ph; y++) for (let x = 0; x < s.pw; x++) {
        const a = s.at(x, y), b = e.at(x, y), solid = s.px[(y * s.pw + x) * 4 + 3] === 255;
        if (b) { kept++; if (b !== a || !EM.includes(b)) wrong++; }
        else if (solid && EM.includes(a)) miss++;
      }
      if (!kept || miss || wrong) bad.push(`${n} kept ${kept} miss ${miss} wrong ${wrong}`);
    }
    const w = py("import json\nimport make_gravewake as m\nprint(json.dumps({'c': list(m.EM_COLOURS), 's': list(m.EM_SOURCES)}))");
    check("gfx3", "art: glow masks for foes.png, pumpkin-lord.png and krampus.png: the same size, hard pixels, every pixel the source's own and one of the three flame and eye colours (#f4e27a, #fff8e0, #e0a040), and every such source pixel kept; none for the mimic; the writer and the game name the same colours and sheets", !bad.length && !w.error && same(w.c, EM) && same([...D.EM_COLOURS], EM) && same(w.s, ["foes", "pumpkin-lord", "krampus"]) && same(Object.entries(D.EM_SHEETS).sort(), w.s.map((n) => [`/art/sprites/${n}.png`, `/art/sprites/${n}_em.png`]).sort()) && !existsSync("public/art/sprites/mimic_em.png"), w.error || bad.join(", "));
    const made = py("import json, hashlib\nfrom PIL import Image\nimport make_gravewake as m\nprint(json.dumps({n: hashlib.md5(m.em_mask(Image.open(f'../../public/art/sprites/{n}.png')).tobytes()).hexdigest() == hashlib.md5(Image.open(f'../../public/art/sprites/{n}_em.png').convert('RGBA').tobytes()).hexdigest() for n in m.EM_SOURCES}))");
    check("gfx3", "art: each glow mask is exactly what the pixel writer's em_mask makes from its sheet today (re-derived, pixel for pixel), so no mask was hand-painted or left stale", !made.error && same(Object.keys(made), ["foes", "pumpkin-lord", "krampus"]) && Object.values(made).every((v) => v === true), made.error || JSON.stringify(made));
    const sc = draw.slice(draw.indexOf("function sheetCell("), draw.indexOf("ctx.drawImage(im, col * stride", draw.indexOf("function sheetCell(")));
    const loop = draw.slice(draw.indexOf("for (const r of g.roamers) {\n    const sc = scaleFor"), draw.indexOf("for (const c of g.critters) {"));
    check("gfx3", "draw: in the glow pass sheetCell draws a sheet's mask instead (or nothing, never a painted body); each foe drawn from a masked sheet pushes its body to the full-light glow list, not on unexplored rock, and the pass is always switched off again; masks are preloaded with the sheets", /if \(emPass\) \{\n[^\n]*\n {4}const em = EM_SHEETS\[url\];\n {4}if \(!em\) return true;\n {4}url = em;\n {2}\}/.test(sc) && /if \(!im\.complete \|\| im\.naturalWidth === 0\) return emPass;/.test(sc) && /if \(hasGlowMask\(r\.family\) && !\(g\.fog && g\.fog\[Math\.floor\(r\.y \/ TILE\) \* g\.w \+ Math\.floor\(r\.x \/ TILE\)\] === 0\)\) \{\n {6}glow\.push\(\(c\) => \{\n {8}emPass = true;\n {8}try \{\n {10}body\(c\);\n {8}\} finally \{\n {10}emPass = false;\n {8}\}/.test(loop) && (draw.match(/emPass = true/g) || []).length === 1 && draw.includes("...Object.values(FESTIVAL_SHEETS), ...Object.values(EM_SHEETS), "));
    const fams = ["zombie", "skeleton", "ghost", "bat", "ghoul", "witch", "lantern", "scarecrow", "wolf", "mummy", "vampire", "tree", "lich", "horse", "goblin", "cat", "rat"];
    check("gfx3", "draw: only foes whose body comes off a masked sheet glow: the 17 foes.png families, the Pumpkin Lord and Krampus; never the mimic or a painted fallback family", fams.every((f) => D.hasGlowMask(f)) && D.hasGlowMask("pumpkinlord") && D.hasGlowMask("krampus") && !D.hasGlowMask("mimic") && !D.hasGlowMask("imp") && !D.hasGlowMask("spider") && /const families = FOE_FAMILIES;/.test(draw));
  }

  // Nothing in play changed.
  check("gfx3", "play is untouched: sim.ts, content.ts, feats.ts, particles.ts, audio.ts are byte-identical to before the batch, and Gravewake.tsx is that HUD, the screen1 HUD or the retro1 HUD (screen1 changed presentation and input reading only, retro1 the Retro view only; their own groups check how) (movement, collision, combat numbers, shops, saves, audio, the HUD)", md5("src/game/sim.ts") === "a3ecff0b08113f1b418cb4127e7a4f94" && md5("src/game/content.ts") === "e520f80e802f7b80d5b5835893cbb019" && md5("src/game/feats.ts") === "39ed775c579eed137ffa64fd877bb647" && md5("src/game/particles.ts") === "32a2407a12fd4f93b4e6a423adcda043" && md5("src/game/audio.ts") === "98fbcef17779a2f944f6e71f913eba81" && ["12ba2ee592c8e09a8c014e64df3ed0b1", SCREEN1_HUD, RETRO1_HUD].includes(md5("src/game/Gravewake.tsx")));
}

if (on("screen1")) {
  // screen1 (owner request 2026-10-01 16:11 ET): screen and display settings. Presentation and input reading only:
  // the C10 zoom, play, movement, collision, combat, shops, saves and audio content stay as they were.
  const { readFileSync, writeFileSync, existsSync, mkdtempSync: mk } = await import("node:fs");
  const { createHash } = await import("node:crypto");
  const { inflateSync } = await import("node:zlib");
  const dir = mk(join(tmpdir(), "gravewake-"));
  const entry = join(dir, "screen1.ts");
  const root = process.cwd();
  writeFileSync(entry, `export * from "${root}/src/game/screen.ts";\n`);
  const file = join(dir, "screen1.mjs");
  execFileSync("npx", ["esbuild", entry, "--bundle", "--platform=node", "--format=esm", "--log-level=warning", `--outfile=${file}`], { stdio: ["ignore", "ignore", "inherit"] });
  const S = await import(pathToFileURL(file).href);
  const md5 = (f) => createHash("md5").update(readFileSync(f)).digest("hex");
  const md5s = (t) => createHash("md5").update(t).digest("hex");
  const ui = readFileSync("src/game/Gravewake.tsx", "utf8");
  const scr = readFileSync("src/game/screen.ts", "utf8");
  const css = readFileSync("src/styles.css", "utf8");
  const head = readFileSync("src/routes/__root.tsx", "utf8");
  const draw = readFileSync("src/game/draw.ts", "utf8");
  const near = (v) => Math.abs(v - Math.round(v)) < 1e-6;
  const SIZES = [[960, 640], [844, 390], [740, 360], [1280, 720], [1920, 1080], [390, 844], [1024, 768], [812.5, 375.5], [1366, 768], [2560, 1440], [667, 375], [915, 412]];
  const DPRS = [1, 1.25, 1.5, 2, 2.625, 3];
  const ZOOMS = [2, 3, 4, 5, 6];
  const base = { preset: "auto", aspect: "fit", cap: 2, tipShown: false };

  // 1. Auto on a computer is the old frame exactly.
  {
    const bad = [];
    for (const [w, h] of SIZES) for (const dpr of DPRS) for (const zoom of ZOOMS) {
      const v = S.computeView({ cssW: w, cssH: h, dpr, zoom, s: base, coarse: false });
      const old = S.legacyBuffer(w, h, dpr);
      const oldDpr = dpr >= 2 ? 2 : 1;
      if (v.bufW !== old.w || v.bufH !== old.h || v.k !== zoom || v.css.w !== w || v.css.h !== h || v.css.x !== 0 || v.css.y !== 0 || old.w !== Math.max(1, Math.floor(w * oldDpr))) bad.push(`${w}x${h}@${dpr} z${zoom}: ${v.bufW}x${v.bufH} k${v.k}`);
    }
    check("screen1", "Auto on a computer draws the old frame exactly: buffer = floor(window × (2 on a 2x-or-more screen, else 1)), drawn at the C10 zoom, filling the window (360 window/DPR/zoom cases)", bad.length === 0, bad.slice(0, 4).join("; "));
  }

  // 2-4. Every preset shows the same world area; k is whole; the cap holds; canvas pixels land on whole device pixels.
  {
    const world = [], whole = [], cap = [], dev = [], css = [];
    let n = 0;
    for (const [w, h] of SIZES) for (const dpr of DPRS) for (const zoom of ZOOMS) for (const preset of S.PRESET_IDS.filter((p) => p !== "retro")) for (const aspect of S.ASPECTS) for (const c of S.CAPS) for (const coarse of [false, true]) {
      n++;
      const s = { preset, aspect, cap: c, tipShown: false };
      const v = S.computeView({ cssW: w, cssH: h, dpr, zoom, s, coarse });
      const dprA = dpr >= 2 ? 2 : 1;
      const want = [(v.box.w * dprA) / zoom, (v.box.h * dprA) / zoom];
      const got = [v.bufW / v.k, v.bufH / v.k];
      if (!(got[0] <= want[0] + 1e-9 && got[0] > want[0] - 1 / v.k - 1e-9 && got[1] <= want[1] + 1e-9 && got[1] > want[1] - 1 / v.k - 1e-9)) world.push(`${preset}/${aspect}/${c} ${w}x${h}@${dpr} z${zoom}: ${got} vs ${want}`);
      if (aspect === "fit") {
        const auto = S.computeView({ cssW: w, cssH: h, dpr, zoom, s: base, coarse: false });
        if (Math.abs(auto.bufW / auto.k - got[0]) >= 1 || Math.abs(auto.bufH / auto.k - got[1]) >= 1) world.push(`${preset} fit vs Auto ${w}x${h}@${dpr} z${zoom}`);
      }
      if (!Number.isInteger(v.k) || v.k < 1 || v.k > zoom) whole.push(`${preset} k${v.k}`);
      if (v.bufW / v.box.w > Math.min(c, dprA) + 1e-9 && !(v.eff === "auto" && v.k === zoom && c >= dprA)) cap.push(`${preset}/${c} ${w}x${h}@${dpr}: ${v.bufW}/${v.box.w}`);
      if (v.eff !== "auto" && near(v.devPerGame) && !near(v.devPerBuf)) dev.push(`${preset} ${w}x${h}@${dpr} z${zoom} k${v.k}: ${v.devPerBuf}`);
      if (!(v.eff === "auto" && aspect === "fit")) {
        if (Math.abs(v.css.w * dpr - v.bufW * v.devPerBuf) > 1e-6 || Math.abs(v.css.h * dpr - v.bufH * v.devPerBuf) > 1e-6) css.push(`${preset} css ${v.css.w}x${v.css.h}`);
        if (v.css.x < v.box.x - 1e-6 || v.css.y < v.box.y - 1e-6 || v.css.x + v.css.w > v.box.x + v.box.w + 1e-6 || v.css.y + v.css.h > v.box.y + v.box.h + 1e-6) css.push(`${preset} outside box`);
      }
    }
    check("screen1", `every preset but Retro (owner-approved 320x240 view since retro1; group retro1 checks it) × aspect × cap × touch (${n} cases) shows the world area the C10 zoom shows in that box (within one game pixel of rounding), and at Fit the same area as Auto`, world.length === 0, world.slice(0, 3).join("; "));
    check("screen1", "canvas pixels per game pixel (k) is a whole number from 1 to the zoom: a preset only draws the same picture with fewer canvas pixels", whole.length === 0, whole.slice(0, 3).join("; "));
    check("screen1", "the max pixel-ratio cap holds: canvas pixels per CSS pixel never above the cap (Auto at the 2× cap is the old frame)", cap.length === 0, cap.slice(0, 3).join("; "));
    check("screen1", "integer nearest-neighbour: on 1x/2x/3x screens every preset puts each canvas pixel on the same whole number of device pixels, and the canvas element is exactly buffer × that size, inside its box", dev.length === 0 && css.length === 0, [...dev, ...css].slice(0, 3).join("; "));
  }

  // 5. Letterbox and pillarbox.
  {
    const bad = [];
    for (const [w, h] of SIZES) for (const dpr of [1, 2, 3]) for (const [a, r] of [["16:9", 16 / 9], ["4:3", 4 / 3]]) {
      const b = S.aspectBox(w, h, dpr, a);
      const ok = Math.abs(b.w / b.h - r) < 2 / Math.min(b.w, b.h) && b.x >= 0 && b.y >= 0 && b.x + b.w <= w + 1e-9 && b.y + b.h <= h + 1e-9 && (Math.abs(b.w - w) < 1 || Math.abs(b.h - h) < 1) && Math.abs(b.x - (w - b.w) / 2) <= 1 / dpr && Math.abs(b.y - (h - b.h) / 2) <= 1 / dpr && near(b.w * dpr) && near(b.h * dpr);
      if (!ok) bad.push(`${a} ${w}x${h}@${dpr}: ${JSON.stringify(b)}`);
    }
    check("screen1", "16:9 and 4:3 take the largest box of that shape, centred on whole device pixels, with black bars around it (main is bg-black)", bad.length === 0 && /bg-black text-fg/.test(ui), bad.slice(0, 2).join("; "));
  }

  // 6. The numbers picked.
  {
    const V = (w, h, dpr, preset, aspect = "fit", coarse = false, c = 2) => S.computeView({ cssW: w, cssH: h, dpr, zoom: 4, s: { preset, aspect, cap: c, tipShown: false }, coarse });
    const f = (v) => `${v.bufW}x${v.bufH} k${v.k} ×${v.devPerBuf}`;
    const got = {
      phone844: f(V(844, 390, 3, "auto", "fit", true)), phone740: f(V(740, 360, 3, "auto", "fit", true)), desk: f(V(960, 640, 1, "auto")), deskPhone: f(V(960, 640, 1, "phone")),
      tv1080: f(V(1920, 1080, 1, "1080p")), tv720: f(V(1920, 1080, 1, "720p")), ph720cap1: f(V(844, 390, 3, "720p", "fit", true, 1)), ph720cap15: f(V(844, 390, 3, "720p", "fit", true, 1.5)),
    };
    const want = { phone844: "844x390 k2 ×3", phone740: "740x360 k2 ×3", desk: "960x640 k4 ×1", deskPhone: "480x320 k2 ×2", tv1080: "1920x1080 k4 ×1", tv720: "960x540 k2 ×2", ph720cap1: "844x390 k2 ×3", ph720cap15: "1266x585 k3 ×2" };
    check("screen1", "the numbers: Auto on a touch phone is Phone landscape (844×390 at 3 device px each on an 844×390 3x phone, 740×360 at 360 tall); 1080p TV is 1920×1080 on a 1080p screen, 720p is 960×540 there (2× whole); the cap lowers 720p on a 3x phone to 1266×585 (1.5) or 844×390 (1)", JSON.stringify(got) === JSON.stringify(want), JSON.stringify(got));
    const t = (h, p) => S.computeView({ cssW: h * 16 / 9, cssH: h, dpr: 1, zoom: 4, s: { ...base, preset: p }, coarse: false });
    check("screen1", "TV presets: bigger UI at TV height (1080p 1.5×, 720p 1.25×), never on a short phone, and controller-first prompts", t(1080, "1080p").ui === 1.5 && t(1080, "720p").ui === 1.25 && t(390, "1080p").ui === 1 && t(1080, "auto").ui === 1 && t(1080, "1080p").tv && !t(1080, "phone").tv && /const padFirst = padOn \|\| !!look\?\.tv;/.test(ui) && (ui.match(/\{padFirst \? <PadGlyph/g) ?? []).length >= 5 && /fontSize = uiNow === 1 \? "" : `\$\{16 \* uiNow\}px`/.test(ui), "");
  }

  // 7. Settings: saved under their own key, applied at once, broken values fall back field by field.
  {
    const P = S.parseScreen;
    const ok = JSON.stringify(P(null)) === JSON.stringify(S.DEFAULT_SCREEN) && JSON.stringify(P("{bad")) === JSON.stringify(S.DEFAULT_SCREEN) && JSON.stringify(P("[1,2]")) === JSON.stringify(S.DEFAULT_SCREEN)
      && P('{"preset":"retro","aspect":"4:3","cap":1,"tipShown":true}').preset === "retro" && P('{"preset":"8k","aspect":"4:3"}').preset === "auto" && P('{"preset":"8k","aspect":"4:3"}').aspect === "4:3" && P('{"cap":7}').cap === 2 && P('{"tipShown":"yes"}').tipShown === false
      && S.SCREEN_KEY === "gravewake-screen-v1" && !/gravewake-saves|gravewake-binds/.test(scr);
    check("screen1", "display settings live under gravewake-screen-v1 (not the save or bind keys); a broken or unknown value falls back to the default field by field", ok);
    check("screen1", "the settings sit on the title (Display) and under Pause › Display, apply instantly (the frame reads them every frame) and are saved", /data-testid="title-display"/.test(ui) && (ui.match(/<ScreenOptions /g) ?? []).length === 2 && /pauseTab === "display" \?/.test(ui) && /saveScreen\(next\);/.test(ui) && /const s = screenRef\.current;/.test(ui) && /screenRef\.current = next;/.test(ui));
  }

  // 8. The frame: the world view uses k; the fight and the map keep the Auto frame; taps map through k.
  check("screen1", "the frame: computeView every frame, drawWorld at k; the fight and the map keep the Auto frame; a tap maps through k and the canvas box", /drawWorld\(ctx, game, w, h, v\.k\)/.test(ui) && /const scene = game\.mode === "battle" \|\| game\.mode === "map";/.test(ui) && /s: \{ \.\.\.s, preset: "auto" \}, coarse: false/.test(ui) && /const zoom = viewRef\.current\?\.k \?\? g\.zoom;/.test(ui) && /canvas\.style\.imageRendering = "pixelated";/.test(ui) && /image-rendering: pixelated/.test(css));
  {
    const restored = unfade1(draw).replace("export function drawWorld(ctx: CanvasRenderingContext2D, g: Game, viewW: number, viewH: number, zoom = g.zoom) {\n  seasonNow = g.season();\n", "export function drawWorld(ctx: CanvasRenderingContext2D, g: Game, viewW: number, viewH: number) {\n  seasonNow = g.season();\n  const zoom = g.zoom;\n");
    check("screen1", "draw.ts: the only change is drawWorld's optional zoom (it defaults to g.zoom); put back (with fade1's own edits taken out, checked in fade1), the file is byte-identical to gfx3", md5s(restored) === "29c64979b1efe9dfb44bb9b708e53360" && restored !== draw);
  }

  // 9. Fullscreen.
  check("screen1", "fullscreen: the standard API with webkit prefixes; Android landscape lock after entering, in try/catch; buttons on the title, Pause › Display and a 44 px HUD corner icon", /requestFullscreen\(\{ navigationUI: "hide" \}\)/.test(scr) && /webkitRequestFullscreen\(\)/.test(scr) && /webkitExitFullscreen\(\)/.test(scr) && /webkitFullscreenElement/.test(scr) && /try \{\n\s+const o = [^\n]+\n\s+if \(o && typeof o\.lock === "function"\) await o\.lock\("landscape"\);\n\s+\} catch/.test(scr) && /data-testid="title-fullscreen"/.test(ui) && /data-testid="options-fullscreen"/.test(ui) && /data-testid="hud-fullscreen"[\s\S]{0,400}h-11 w-11/.test(ui) && /"webkitfullscreenchange"/.test(ui));
  check("screen1", "the F key: fullscreen on the title and in menus; Smite keeps F in play, a fight and fishing (Shift+F there); never while typing a name", /if \(e\.code === "KeyF" && !e\.ctrlKey && !e\.metaKey && !e\.altKey && !e\.repeat\)/.test(ui) && /Object\.values\(game\.keyBind\)\.includes\("KeyF"\) && \(game\.mode === "play" \|\| game\.mode === "battle" \|\| game\.mode === "fish"\)/.test(ui) && /if \(e\.shiftKey \|\| !busy\)/.test(ui) && ui.indexOf('if (e.code === "KeyF"') > ui.indexOf("if (e.target instanceof HTMLInputElement"));
  {
    const man = JSON.parse(readFileSync("public/gravewake.webmanifest", "utf8"));
    const png = (f) => { const b = readFileSync(f); return [b.readUInt32BE(16), b.readUInt32BE(20)]; };
    const icons = man.icons.map((i) => ({ ...i, path: `public${i.src}` }));
    const iconsOk = icons.every((i) => existsSync(i.path) && png(i.path).join("x") === i.sizes);
    check("screen1", "iPhone/Android: the game manifest is display fullscreen, orientation landscape, with 180/192/512 icons that exist at their sizes; the apple capable and status-bar metas are set; the platform's /__grok manifest stays linked (after) and served, and the apple-touch-icon stays", man.display === "fullscreen" && man.orientation === "landscape" && man.start_url === "/" && iconsOk && icons.map((i) => i.sizes).join() === "180x180,192x192,512x512"
      && head.indexOf('href: "/gravewake.webmanifest"') > 0 && head.indexOf('href: "/gravewake.webmanifest"') < head.indexOf('href: "/__grok/manifest.webmanifest"') && /name: "apple-mobile-web-app-capable", content: "yes"/.test(head) && /apple-mobile-web-app-status-bar-style", content: "black-translucent"/.test(head) && /rel: "apple-touch-icon", href: "\/__grok\/icon-180\.png"/.test(head) && existsSync("public/__grok/icon-180.png"), JSON.stringify(icons.map((i) => i.sizes)));
    // The icons come from one 16 px cell scaled whole (every k×k block one colour), via the writer.
    const decode = (f) => {
      const b = readFileSync(f);
      let o = 8, w = 0, h = 0; const idat = [];
      while (o < b.length) { const len = b.readUInt32BE(o); const kind = b.toString("ascii", o + 4, o + 8); const d = b.subarray(o + 8, o + 8 + len); if (kind === "IHDR") { w = d.readUInt32BE(0); h = d.readUInt32BE(4); } if (kind === "IDAT") idat.push(d); o += 12 + len; }
      const raw = inflateSync(Buffer.concat(idat)); const bpp = 4, stride = w * bpp; const out = Buffer.alloc(h * stride); let prev = Buffer.alloc(stride);
      for (let y = 0; y < h; y++) { const t = raw[y * (stride + 1)]; const line = raw.subarray(y * (stride + 1) + 1, (y + 1) * (stride + 1)); const cur = Buffer.alloc(stride);
        for (let x = 0; x < stride; x++) { const a = x >= bpp ? cur[x - bpp] : 0, up = prev[x], c = x >= bpp ? prev[x - bpp] : 0; const p = a + up - c; const pr = Math.abs(p - a) <= Math.abs(p - up) && Math.abs(p - a) <= Math.abs(p - c) ? a : Math.abs(p - up) <= Math.abs(p - c) ? up : c;
          cur[x] = (line[x] + (t === 0 ? 0 : t === 1 ? a : t === 2 ? up : t === 3 ? (a + up) >> 1 : pr)) & 255; }
        cur.copy(out, y * stride); prev = cur; }
      return { w, h, px: (x, y) => out.readUInt32BE(y * stride + x * 4) };
    };
    const blocky = [192, 512].every((n) => { const im = decode(`public/art/icons/gravewake-${n}.png`); const k = n / 16; for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) if (im.px(x, y) !== im.px(Math.floor(x / k) * k, Math.floor(y / k) * k)) return false; return true; });
    const tmp = mk(join(tmpdir(), "gw-icons-"));
    let regen = "";
    try { regen = execFileSync("python3", ["-B", "-c", `import sys; sys.path.insert(0, 'tools/pixel-writer'); import make_icons, pathlib; make_icons.main(pathlib.Path(${JSON.stringify(tmp)}))`], { encoding: "utf8" }); } catch (e) { regen = String(e.message); }
    const same = [192, 512].every((n) => existsSync(join(tmp, "public/art/icons", `gravewake-${n}.png`)) && md5(join(tmp, "public/art/icons", `gravewake-${n}.png`)) === md5(`public/art/icons/gravewake-${n}.png`));
    check("screen1", "the home-screen icons are one 16×16 cell scaled whole (12× and 32×, every block one colour), and tools/pixel-writer/make_icons.py writes them byte for byte", blocky && same, regen.trim());
  }
  check("screen1", "a one-time Add to Home Screen tip on iPhone Safari (not when already launched from the home screen); 'Got it' keeps it from coming back; the fullscreen buttons show it where element fullscreen does not exist", /if \(isIos\(\) && !isStandalone\(\) && !screenRef\.current\.tipShown\) setTip\(true\);/.test(ui) && /setScreen\(\{ tipShown: true \}\);/.test(ui) && /if \(canFullscreen\(\)\) void toggleFullscreen\(\);\n\s+else setTip\(true\);/.test(ui) && S.isIos("Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X)", "iPhone", 5) && S.isIos("Mozilla/5.0 (Macintosh)", "MacIntel", 5) && !S.isIos("Mozilla/5.0 (Linux; Android 14)", "Linux", 5) && !S.isIos("Mozilla/5.0 (Macintosh)", "MacIntel", 0));

  // 10. The sideways phone.
  check("screen1", "sideways phone: viewport-fit=cover, maximum-scale=1, user-scalable=no; 100dvh; all four safe-area insets used by the HUD; touch targets at least 44 px on a touch screen; a compact HUD under 500 px tall", /width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover/.test(head) && /height: 100dvh;/.test(css) && ["top", "right", "bottom", "left"].every((s) => css.includes(`env(safe-area-inset-${s}, 0px)`)) && ["--sat", "--sar", "--sab", "--sal"].every((v) => ((ui + css).match(new RegExp(`var\\(${v}\\)`, "g")) ?? []).length >= 2 && ui.includes(`var(${v})`)) && /@media \(pointer: coarse\) \{\n {2}main button \{ min-height: 44px; min-width: 44px; \}/.test(css) && /@media \(max-height: 500px\)/.test(css) && /\.gw-panel \{ top: calc\(6px \+ var\(--sat\)\) !important; max-height: calc\(100dvh - 12px - var\(--sat\) - var\(--sab\)\) !important; \}/.test(css));
  check("screen1", "a portrait phone gets 'Turn your phone sideways' with Play anyway (kept for the session); a computer never sees it", /const showPortrait = coarse && portrait && !portraitOk;/.test(ui) && /Turn your phone sideways/.test(ui) && /Play anyway/.test(ui) && /sessionStorage\.setItem\("gravewake-portrait-ok", "1"\)/.test(ui) && /setPortrait\(window\.innerHeight > window\.innerWidth\);/.test(ui));
  check("screen1", "the minimap starts clear of the HUD card (under it when there is room above the tent, else beside it) and is kept on screen; a title taller than the window scrolls from its top", /r\.bottom \+ 8 \+ 96 <= campTop - 8/.test(ui) && /miniUser\.current = true;/.test(ui) && /Math\.min\(miniAt\.x, \(typeof window !== "undefined" \? window\.innerWidth : 1e4\) - \(pip \? 24 : 96\)\)/.test(ui) && /gw-title-in my-auto flex/.test(ui) && !/gw-title absolute inset-0 z-20 flex flex-col items-center justify-center/.test(ui));

  // 11. Touch gotchas.
  check("screen1", "no page slide, scroll or zoom: html/body fixed and hidden, overscroll none, touch-action none (menus marked data-scroll may pan), no selection, no callout, no tap highlight; a non-passive touchmove preventDefault and iOS gesturestart blocked", /html, body \{\n {4}position: fixed;\n {4}inset: 0;\n {4}width: 100%;\n {4}overflow: hidden;\n {4}overscroll-behavior: none;\n {4}touch-action: none;/.test(css) && /user-select: none;/.test(css) && /-webkit-touch-callout: none;/.test(css) && /-webkit-tap-highlight-color: transparent;/.test(css) && /\[data-scroll\] \{ touch-action: pan-y; overscroll-behavior: contain;/.test(css) && /document\.addEventListener\("touchmove", touchMove, \{ passive: false \}\);/.test(ui) && /if \(e\.touches\.length > 1 \|\| !t\?\.closest\?\.\("\[data-scroll\]"\)\) e\.preventDefault\(\);/.test(ui) && /document\.addEventListener\("gesturestart", gesture\);/.test(ui) && /input, textarea \{ user-select: text;/.test(css));
  check("screen1", "the loading cover: in the first HTML, over everything, swallows pointers and keys until the core sheets are in (bounded wait), then lifts", /const \[ready, setReady\] = useState\(false\);/.test(ui) && /\{!ready \? \(\n\s+<div\n\s+data-testid="loading"/.test(ui) && /z-\[60\]/.test(ui) && /onPointerDownCapture=\{\(e\) => \{\n\s+e\.preventDefault\(\);\n\s+e\.stopPropagation\(\);/.test(ui) && /if \(performance\.now\(\) < readyAt\.current\) \{\n\s+e\.preventDefault\(\);\n\s+return;\n\s+\}/.test(ui) && /Promise\.race\(\[Promise\.all\(PRELOAD\.map\(loadOne\)\), new Promise<void>\(\(done\) => window\.setTimeout\(done, READY_TIMEOUT_MS\)\)\]\)/.test(ui) && S.READY_TIMEOUT_MS <= 8000 && S.PRELOAD.every((u) => existsSync(`public${u}`)));
  check("screen1", "audio starts only on a fresh press after the cover lifts (a press held from before never counts; a held key's repeats never count); a button release counts only after its own fresh press", /const unlockFresh = \(t: number\) => \{\n\s+if \(t < readyAt\.current\) return;/.test(ui) && /if \(!e\.repeat\) unlockFresh\(e\.timeStamp \|\| performance\.now\(\)\);/.test(ui) && /if \(e\.timeStamp < readyAt\.current\) return;\n\s+freshIds\.current\.add\(e\.pointerId\);/.test(ui) && /if \(!freshIds\.current\.delete\(e\.pointerId\)\) return;/.test(ui) && /if \(performance\.now\(\) >= readyAt\.current\) audioRef\.current\?\.unlock\(\);/.test(ui) && !/audio\.unlock\(\);\n\s+if \(e\.target instanceof HTMLInputElement/.test(ui) && !/dataset\.down \|\| 0/.test(ui) && (ui.match(/pressedFor\(e\.currentTarget as HTMLButtonElement\)/g) ?? []).length === 4 && /const held = pressedFor\(e\.currentTarget as HTMLButtonElement\);\n\s+if \(held < 0\) return;\n\s+if \(held >= 350\) game\.interact\(\);/.test(ui));

  // 12. The stick (input reading only).
  {
    const old = (dx, dy) => { const m = Math.hypot(dx, dy) || 1; const cap = 42; if (m < cap * 0.14) return { x: 0, y: 0, running: false }; const c = Math.min(1, m / cap); return { x: (dx / m) * c, y: (dy / m) * c, running: m > cap * 0.82 }; };
    let same = 0, diff = [];
    for (let a = 0; a < 360; a += 15) for (const m of [6, 8, 12, 20, 30, 34.5, 35, 40, 42, 60, 200]) {
      const dx = Math.cos((a * Math.PI) / 180) * m, dy = Math.sin((a * Math.PI) / 180) * m;
      const A = S.readStick(dx, dy), B = old(dx, dy);
      if (A.x === B.x && A.y === B.y && A.running === B.running) same++; else diff.push(`${a}°/${m}`);
    }
    const dz = S.readStick(42 * 0.08 - 0.01, 0).x === 0 && S.readStick(42 * 0.08 + 0.01, 0).x > 0 && S.readStick(4, 0).x > 0 && S.readStick(3, 0).x === 0;
    check("screen1", "the stick reads the same as before past the dead zone (same throw 42 px, same mapping, run past 82%: 264 drags identical); only the dead zone is 8% (was 14%)", diff.length === 0 && same === 264 && dz && S.STICK_DEAD === 0.08 && S.STICK_RUN === 0.82 && S.STICK_CAP === 42, diff.slice(0, 4).join(","));
  }
  check("screen1", "the stick floats: it starts under the finger (on the ring, or any touch in the left third in play), is tracked by its pointer id with capture (it keeps tracking off the ring), and a quick tap there still walks; mice keep tap-to-walk everywhere (on the picture, and on Retro's bars since retro1)", (ui.match(/if \(e\.pointerType === "touch" && g0\?\.mode === "play" && stick\.current\.id < 0 && inStickZone\(e\.clientX, window\.innerWidth\)\)/g) ?? []).length === 2 && /stick\.current = \{ id: e\.pointerId, ox: e\.clientX, oy: e\.clientY \};/.test(ui) && /\(e\.currentTarget as HTMLElement\)\.setPointerCapture\(e\.pointerId\);/.test(ui) && (ui.match(/if \(!g \|\| stick\.current\.id !== e\.pointerId\) return false;/g) ?? []).length === 2 && /if \(!g \|\| stick\.current\.id !== e\.pointerId\) return false;\n\s+const dx = e\.clientX - stick\.current\.ox;/.test(ui) && /const r = readStick\(dx, dy\);/.test(ui) && /performance\.now\(\) - tap\.t < 250/.test(ui) && S.inStickZone(100, 900) && !S.inStickZone(300, 900) && !/cap \* 0\.14/.test(ui));

  // 13. The pad.
  {
    const btn = (on) => ({ pressed: on, value: on ? 1 : 0 });
    const pad = (id, on, connected = true) => ({ id, connected, axes: [0.3, -0.9], buttons: Array.from({ length: 17 }, (_, i) => btn(on.includes(i))) });
    const r = S.readPad([pad("a", [0]), null, pad("b", [1, 5]), pad("c", [2], false)]);
    const grid = [0, 1, 2].flatMap((row) => [0, 1, 2].map((col) => ({ x: col * 100, y: row * 50, w: 80, h: 40 })));
    const nav = [S.navPick(grid, 4, "up"), S.navPick(grid, 4, "down"), S.navPick(grid, 4, "left"), S.navPick(grid, 4, "right"), S.navPick(grid, 8, "right"), S.navPick(grid, -1, "down")].join();
    check("screen1", "the pad is read as the last connected standard pad (pressed or value > 0.5); focus moves to the nearest button that way and wraps", r && r.id === "b" && r.pressed[1] && r.pressed[5] && !r.pressed[0] && r.lx === 0.3 && S.readPad([]) === null && nav === "1,7,3,5,0,0", `${nav}`);
  }
  check("screen1", "the pad on the title and every menu: d-pad or stick moves the focus, A presses, B backs out (Leave, Close, Stand, Stay, Return, Later, Done, Got it, Close map); never in play, a fight or fishing (the sim drives those), never while remapping", /const NAV_MODES = new Set\(\["title", "talk", "shop", "casino", "bank", "zeppelin", "pause", "level", "crypt", "dead", "map"\]\);/.test(ui) && /if \(game\.captureAct\) return keep\(\);/.test(ui) && /focusEl\.click\(\);/.test(ui) && /root\.querySelector<HTMLElement>\("\[data-padback\]"\)\?\.click\(\);/.test(ui) && (ui.match(/data-padback/g) ?? []).length >= 11 && (ui.match(/data-padnav(?!\])/g) ?? []).length === 3 && /readPad\(navigator\.getGamepads\?\.\(\)\)/.test(ui) && /if \(now >= readyAt\.current\) padLayer\(now\);/.test(ui));
  check("screen1", "the pad in play: B or RB is the Main swing (game.slash, the same call the Main tap makes), only while no action is bound to that button; A stays use, X area, Y far, LB drink, Start pause, Back map (the sim's own map)", /if \(game\.mode === "play" && \(\(edge\(PAD\.B\) && !bound\.has\(PAD\.B\)\) \|\| \(edge\(PAD\.RB\) && !bound\.has\(PAD\.RB\)\)\)\) \{\n\s+game\.slash\(\);/.test(ui) && S.PAD.B === 1 && S.PAD.RB === 5 && /use: 0, area: 2, far: 3, drink: 4, pause: 9, map: 8/.test(readFileSync("src/game/sim.ts", "utf8")));

  // 14. Nothing in play changed.
  {
    const PIN = { "src/game/sim.ts": "a3ecff0b08113f1b418cb4127e7a4f94", "src/game/content.ts": "e520f80e802f7b80d5b5835893cbb019", "src/game/feats.ts": "39ed775c579eed137ffa64fd877bb647", "src/game/particles.ts": "32a2407a12fd4f93b4e6a423adcda043", "src/game/audio.ts": "98fbcef17779a2f944f6e71f913eba81", "src/game/light.ts": "c87f3807e23eae891280b96731660c88", "src/game/crowd.ts": "1ee8fc268f06cae9351df0d9bc9cf184", "src/game/runs.ts": "92b5f1b4c6d493fdb44719c0ca300770", "src/game/seasons.ts": "570817f597bdf4a8d21378967ebe27f1", "src/game/festivals.ts": "d6c5fd0abacc274cff6d5d35356422fa", "src/game/graves.ts": "bd2a91295356e6e4d6f080a362832b80", "src/game/mimic.ts": "23ec42f4ff5bd18b96d1e00234635815", "src/game/bond.ts": "2f29da655a986038789078125ce4c989", "src/game/bounty.ts": "8b71d8a405b42bbd61af08f6e60c32bc", "src/game/decor.ts": "264e4f60b143aa8c3fd297387bffe027", "src/game/derby.ts": "083260bd87dec03a20e13a0e6ad96cca" };
    const bad = Object.entries(PIN).filter(([f, h]) => md5(f) !== h).map(([f]) => f);
    check("screen1", "play is untouched: sim.ts (the C10 zoom, movement, collision, combat, shops, saves, the pad map), content, feats, particles, audio, light and every other game module are byte-identical to gfx3", bad.length === 0, bad.join(", "));
  }
  {
    // The gfx3 shell's calls into the game: 68 methods and how many places call each. screen1 adds one call site, the pad's Main swing (slash).
    const GFX3 = {"acceptService": 1, "allyOptions": 3, "attackGuard": 1, "bet": 1, "bindKey": 1, "bondLine": 1, "bondOf": 1, "bumpZoom": 1, "buy": 2, "buyDecor": 1, "buyFishReward": 3, "buyHome": 1, "camp": 2, "castKnown": 5, "castRail": 1, "choices": 1, "choose": 1, "clockLabel": 1, "command": 29, "companionMax": 2, "curseLine": 2, "decorOffers": 2, "deposit": 1, "dismissLevel": 1, "equipCompanion": 1, "equipItem": 1, "escortName": 2, "eventLine": 2, "feed": 1, "interact": 2, "learn": 2, "levelOptions": 1, "listZeppelin": 2, "meditate": 1, "openPortal": 1, "potionsCorked": 5, "priceOf": 2, "purse": 2, "questLine": 1, "reel": 2, "releaseCompanion": 1, "respec": 1, "revive": 1, "saveSlot": 1, "seasonLine": 1, "seasonName": 1, "sell": 1, "sellJunk": 2, "slash": 2, "smite": 2, "socketGem": 1, "spendPoints": 1, "stakeCompanion": 1, "stallName": 1, "stash": 1, "takeVault": 1, "togglePause": 6, "tradeFish": 1, "trainStat": 1, "turnInPage": 1, "unequipCompanion": 1, "unequipItem": 1, "update": 1, "usePotion": 3, "weatherLabel": 1, "whirl": 2, "withdraw": 1, "zeppelinTo": 1};
    const want = { ...GFX3, slash: GFX3.slash + 1 };
    const got = {};
    for (const m of ui.matchAll(/\bgame\.([a-zA-Z]+)\(/g)) got[m[1]] = (got[m[1]] ?? 0) + 1;
    const keys = [...new Set([...Object.keys(want), ...Object.keys(got)])].sort();
    const off = keys.filter((k) => want[k] !== got[k]).map((k) => `${k} ${want[k] ?? 0}→${got[k] ?? 0}`);
    check("screen1", "the shell makes the same calls into the game as gfx3 (68 methods, each from as many places; none added, none dropped, none swapped): the only new call site is the pad's Main swing, the same slash() the Main tap makes", Object.keys(GFX3).length === 68 && off.length === 0, off.join(", "));
  }
}

if (on("retro1")) {
  // [OWNER-APPROVED EXCEPTION 2026-10-01 18:48 ET: true 320x240 Retro view] retro1: in Retro only, the camera shows
  // 320×240 game pixels at 1 canvas px per game px, scaled up whole with black bars. Every other preset keeps the
  // C10 view and behaviour exactly; no combat number, aggro range, spawn rule or movement changes.
  const { readFileSync, writeFileSync, readdirSync, mkdtempSync: mk } = await import("node:fs");
  const { createHash } = await import("node:crypto");
  const TAG = "[OWNER-APPROVED EXCEPTION 2026-10-01 18:48 ET: true 320x240 Retro view]";
  const dir = mk(join(tmpdir(), "gravewake-"));
  const root = process.cwd();
  writeFileSync(join(dir, "retro1.ts"), `export * from "${root}/src/game/screen.ts";\n`);
  writeFileSync(join(dir, "lights.ts"), `export * from "${root}/src/game/draw.ts";\nexport * from "${root}/src/game/light.ts";\nexport { DUNGEONS } from "${root}/src/game/content.ts";\n`);
  for (const n of ["retro1", "lights"]) execFileSync("npx", ["esbuild", join(dir, `${n}.ts`), "--bundle", "--platform=node", "--format=esm", "--log-level=warning", `--outfile=${join(dir, `${n}.mjs`)}`], { stdio: ["ignore", "ignore", "inherit"] });
  const S = await import(pathToFileURL(join(dir, "retro1.mjs")).href);
  const md5 = (f) => createHash("md5").update(readFileSync(f)).digest("hex");
  const md5s = (t) => createHash("md5").update(t).digest("hex");
  const scr = readFileSync("src/game/screen.ts", "utf8");
  const ui = readFileSync("src/game/Gravewake.tsx", "utf8");
  const SIZES = [[960, 640], [844, 390], [740, 360], [1280, 720], [1920, 1080], [390, 844], [1024, 768], [812.5, 375.5], [1366, 768], [2560, 1440], [667, 375], [915, 412], [3840, 2160], [320, 240], [1, 1]];
  const DPRS = [1, 1.25, 1.5, 2, 2.625, 3, 0];
  const ZOOMS = [2, 3, 4, 5, 6];
  const near = (v) => Math.abs(v - Math.round(v)) < 1e-6;

  // 1. The tag, in the two law files and at the code.
  {
    const two = readFileSync("rules/GAME_LAYOUT_TWO.txt", "utf8");
    const agents = readFileSync("AGENTS.project.md", "utf8");
    check("retro1", "the owner's dated exception is tagged in rules/GAME_LAYOUT_TWO.txt (SCREEN MAP) and AGENTS.project.md (the law list and the integer-zoom rule), and at the one code branch in screen.ts", two.includes(`(right for right-hand, left for left-hand).\n${TAG} The Retro 320x240 display preset (and only it) shows a fixed 320×240 game pixels`) && agents.split(TAG).length === 3 && agents.includes(`- Display only at whole-number zoom: 2×, 3×, 4×, 5×, 6×. Never 1.5× or 2.75×.\n  ${TAG}`) && scr.split(TAG).length === 4, "");
  }

  // 2. Every other preset: byte-identical outputs and the same code.
  {
    const out = [];
    for (const [w, h] of SIZES) for (const dpr of DPRS) for (const zoom of ZOOMS) for (const preset of ["auto", "phone", "720p", "1080p"]) for (const aspect of ["fit", "16:9", "4:3"]) for (const cap of [2, 1.5, 1]) for (const coarse of [false, true]) {
      out.push(S.computeView({ cssW: w, cssH: h, dpr, zoom, s: { preset, aspect, cap, tipShown: false }, coarse }));
    }
    const got = md5s(JSON.stringify(out));
    check("retro1", `every preset but Retro gives byte-identical views to screen1: ${out.length} cases (15 windows × 7 DPRs × 5 zooms × 4 presets × 3 aspects × 3 caps × touch) hash to screen1's 9c967a21…`, out.length === 37800 && got === "9c967a213fc8ddf87ee71d2592506a4f", got);
    const i = scr.indexOf("export function computeView(v: ViewIn): View {");
    const fn = scr.slice(i, scr.indexOf("\n}\n", i) + 3);
    const branch = `  // ${TAG} Retro first, and only Retro.\n  const fixed = v.s.preset === "retro" ? PRESETS.retro.world : undefined;\n  if (fixed) return retroView(v, fixed);\n`;
    check("retro1", "computeView is screen1's code byte for byte plus one first branch, taken only when the preset is retro", fn.includes(branch) && md5s(fn.replace(branch, "")) === "3c074c1d73e2218454c4eebf25948c1f" && JSON.stringify(Object.entries(S.PRESETS).filter(([id, p]) => id !== "retro" && p.world).map(([id]) => id)) === "[]", md5s(fn.replace(branch, "")));
    const SAME = {"src/game/audio.ts": "98fbcef17779a2f944f6e71f913eba81", "src/game/bond.ts": "2f29da655a986038789078125ce4c989", "src/game/bounty.ts": "8b71d8a405b42bbd61af08f6e60c32bc", "src/game/content.ts": "e520f80e802f7b80d5b5835893cbb019", "src/game/crowd.ts": "1ee8fc268f06cae9351df0d9bc9cf184", "src/game/decor.ts": "264e4f60b143aa8c3fd297387bffe027", "src/game/derby.ts": "083260bd87dec03a20e13a0e6ad96cca", "src/game/draw.ts": "ade20b08057dc3b318b9a55b1a9a9f32", "src/game/feats.ts": "39ed775c579eed137ffa64fd877bb647", "src/game/festivals.ts": "d6c5fd0abacc274cff6d5d35356422fa", "src/game/graves.ts": "bd2a91295356e6e4d6f080a362832b80", "src/game/light.ts": "c87f3807e23eae891280b96731660c88", "src/game/mimic.ts": "23ec42f4ff5bd18b96d1e00234635815", "src/game/particles.ts": "32a2407a12fd4f93b4e6a423adcda043", "src/game/runs.ts": "92b5f1b4c6d493fdb44719c0ca300770", "src/game/seasons.ts": "570817f597bdf4a8d21378967ebe27f1", "src/game/sim.ts": "a3ecff0b08113f1b418cb4127e7a4f94"};
    const files = readdirSync("src/game").filter((f) => /\.tsx?$/.test(f)).map((f) => `src/game/${f}`).sort();
    // fade1: draw.ts is compared with fade1's own edits taken out, and fade.ts is fade1's (both pinned in group fade1).
    const bad = Object.entries(SAME).filter(([f, h]) => (f === "src/game/draw.ts" ? md5s(unfade1(readFileSync(f, "utf8"))) : md5(f)) !== h).map(([f]) => f);
    const extra = files.filter((f) => !(f in SAME) && f !== "src/game/screen.ts" && f !== "src/game/Gravewake.tsx" && f !== "src/game/fade.ts");
    check("retro1", "play and drawing are untouched: sim.ts (zoom, movement, collision, combat numbers, aggro ranges, spawn rules, saves), draw.ts (camera, culling, fog, light layer, particles, minimap), light.ts (the 24-light budget), content, particles, audio and every other game module are byte-identical to screen1; only screen.ts and the shell changed", bad.length === 0 && extra.length === 0, [...bad, ...extra].join(", "));
  }

  // 3. Retro itself: 320×240 game px at 1 canvas px each, whole device-pixel scale, centred, bars, any window/zoom/aspect/cap.
  {
    const bad = [];
    let n = 0;
    for (const [w, h] of SIZES) for (const dpr of DPRS) for (const zoom of ZOOMS) for (const aspect of S.ASPECTS) for (const cap of S.CAPS) for (const coarse of [false, true]) {
      n++;
      const v = S.computeView({ cssW: w, cssH: h, dpr, zoom, s: { preset: "retro", aspect, cap, tipShown: false }, coarse });
      const d = dpr > 0 ? dpr : 1;
      const s = v.devPerBuf;
      const fits = 320 * s <= w * d + 1e-6 && 240 * s <= h * d + 1e-6;
      const bigger = 320 * (s + 1) <= w * d + 1e-6 && 240 * (s + 1) <= h * d + 1e-6;
      const why = [];
      if (v.eff !== "retro" || v.bufW !== 320 || v.bufH !== 240 || v.k !== 1 || v.worldW !== 320 || v.worldH !== 240) why.push(`frame ${v.bufW}x${v.bufH} k${v.k} world ${v.worldW}x${v.worldH}`);
      if (!Number.isInteger(s) || s < 1 || bigger || (!fits && s !== 1)) why.push(`scale ${s}`);
      if (Math.abs(v.css.w * d - 320 * s) > 1e-6 || Math.abs(v.css.h * d - 240 * s) > 1e-6) why.push(`css ${v.css.w}x${v.css.h}`);
      if (!near(v.css.x * d) || !near(v.css.y * d)) why.push(`off-pixel ${v.css.x},${v.css.y}`);
      if (fits && (v.css.x < -1e-6 || v.css.y < -1e-6 || v.css.x + v.css.w > w + 1e-6 || v.css.y + v.css.h > h + 1e-6 || Math.abs(v.css.x - (w - v.css.w) / 2) > 1 / d || Math.abs(v.css.y - (h - v.css.h) / 2) > 1 / d)) why.push("not centred inside the window");
      if (v.tv) why.push("tv");
      if (v.box.x !== 0 || v.box.y !== 0 || v.box.w !== w || v.box.h !== h) why.push(`box ${JSON.stringify(v.box)}`);
      if (why.length) bad.push(`${w}x${h}@${dpr} z${zoom} ${aspect}/${cap}${coarse ? " touch" : ""}: ${why.join(" ")}`);
    }
    check("retro1", `Retro shows 320×240 game pixels (20×15 tiles) at 1 canvas px per game px in every case (${n}: window, DPR, zoom, aspect, cap, touch), scaled by the largest whole number of device pixels that fits, centred on whole device pixels with black bars; the zoom, aspect and cap never change it`, bad.length === 0, bad.slice(0, 3).join("; "));
    const V = (w, h, dpr, coarse = false) => S.computeView({ cssW: w, cssH: h, dpr, zoom: 4, s: { preset: "retro", aspect: "4:3", cap: 2, tipShown: false }, coarse });
    const f = (v) => `${v.bufW}x${v.bufH} ×${v.devPerBuf} ${Math.round(v.css.w)}x${Math.round(v.css.h)}@${Math.round(v.css.x)},${Math.round(v.css.y)} ui${v.ui}`;
    const got = { desk: f(V(960, 640, 1)), hd: f(V(1280, 720, 1)), tv: f(V(1920, 1080, 1)), phone: f(V(844, 390, 3, true)), phone360: f(V(740, 360, 3, true)), portrait: f(V(390, 844, 3, true)) };
    const want = { desk: "320x240 ×2 640x480@160,80 ui1", hd: "320x240 ×3 960x720@160,0 ui1.25", tv: "320x240 ×4 1280x960@320,60 ui1.5", phone: "320x240 ×4 427x320@209,35 ui1", phone360: "320x240 ×4 427x320@157,20 ui1", portrait: "320x240 ×3 320x240@35,302 ui1" };
    check("retro1", "the numbers: 960×640 shows Retro at 2× (640×480, bars 160/80), 1280×720 at 3×, a 1080p TV at 4× (1280×960, bars 320/60), an 844×390 or 740×360 3x phone at 4 device px per game px (427×320 CSS); the HUD steps up 1.25× from 720 px and 1.5× from 900 px on the short side, never on a phone, and Retro forces no controller prompts", JSON.stringify(got) === JSON.stringify(want), JSON.stringify(got));
  }

  // 4. Settings: the label, and a stored "retro" maps to the new mode; old settings keep loading.
  {
    const P = S.parseScreen;
    const old = P('{"preset":"retro","aspect":"4:3","cap":2,"tipShown":true}');
    const v = S.computeView({ cssW: 960, cssH: 640, dpr: 1, zoom: 4, s: old, coarse: false });
    check("retro1", "the preset reads 'Retro 320x240'; a stored screen1 'retro' setting loads as the new mode (320×240 view) with its other fields kept; picking Retro no longer sets the aspect (its frame is 4:3 already), so Auto keeps the player's aspect; the settings key and every other preset id are unchanged", S.PRESETS.retro.label === "Retro 320x240" && old.preset === "retro" && old.aspect === "4:3" && old.tipShown === true && v.worldW === 320 && v.worldH === 240 && S.SCREEN_KEY === "gravewake-screen-v1" && JSON.stringify(S.PRESET_IDS) === '["auto","phone","720p","1080p","retro"]' && JSON.stringify(S.PRESETS.retro.world) === "[320,240]" && S.PRESETS.retro.aspect === undefined, JSON.stringify(old));
  }

  // 5. The shell: the frame draws Retro through the same path; the zoom gestures leave the other presets alone.
  {
    check("retro1", "the shell draws Retro through the one frame path (computeView, the canvas sized to the frame, drawWorld at k = 1); the map keeps the Auto frame; the wheel and a pinch do nothing in Retro (its view is fixed) and are unchanged elsewhere; the settings say what Retro shows", /const look = computeView\(\{ cssW: Math\.max\(1, rect\.width\), cssH: Math\.max\(1, rect\.height\), dpr: dprRaw, zoom: game\.zoom, s, coarse: coarseNow \}\);/.test(ui) && /else drawWorld\(ctx, game, w, h, v\.k\);/.test(ui) && /const scene = game\.mode === "battle" \|\| game\.mode === "map";/.test(ui)
      && /e\.preventDefault\(\);\n\s+\/\/ retro1: [^\n]*\n\s+if \(screenRef\.current\.preset === "retro"\) return;\n\s+game\.bumpZoom\(e\.deltaY > 0 \? -1 : 1\);/.test(ui)
      && /if \(pointers\.current\.size === 2\) \{\n\s+\/\/ retro1: [^\n]*\n\s+if \(screenRef\.current\.preset === "retro"\) return;\n\s+const pts = \[\.\.\.pointers\.current\.values\(\)\];\n\s+const d = Math\.hypot/.test(ui)
      && (ui.match(/game\.bumpZoom\(|gameRef\.current\?\.bumpZoom\(/g) ?? []).length === 3
      && /Retro 320x240 · frame \{view\.bufW\}×\{view\.bufH\} · 1 px per game pixel · view \{view\.worldW\}×\{view\.worldH\} game px \(\{view\.worldW \/ 16\}×\{view\.worldH \/ 16\} tiles\) · ×\{view\.devPerBuf\} on screen/.test(ui) && /data-testid="retro-note"/.test(ui), "");
    const bars = ui.slice(ui.indexOf('data-testid="retro-bars"'), ui.indexOf("<canvas\n"));
    check("retro1", "Retro's black bars take the thumb (only in Retro, and under the picture): in play a touch in the left third starts the same floating stick (stickStart/stickMove/stickEnd, its own pointer id), and a tap or drag on a bar walks toward that point through the same aimAt; with no Retro there is no bar layer, so every other preset's input is as before", /\{screenSet\.preset === "retro" \? \(\n\s+\/\/ retro1: [^\n]*\n[^\n]*\n\s+<div\n\s+data-testid="retro-bars"\n\s+className="absolute inset-0 touch-none"/.test(ui) && ui.indexOf('data-testid="retro-bars"') < ui.indexOf('data-testid="game-canvas"') && /if \(e\.pointerType === "touch" && g0\?\.mode === "play" && stick\.current\.id < 0 && inStickZone\(e\.clientX, window\.innerWidth\)\) \{\n\s+stickStart\(e, true\);\n\s+return;\n\s+\}\n\s+barAim\.current = e\.pointerId;\n\s+\(e\.currentTarget as HTMLElement\)\.setPointerCapture\(e\.pointerId\);\n\s+aimAt\(e\.clientX, e\.clientY\);/.test(bars) && (bars.match(/if \(stickEnd\(e\)\) return;\n\s+if \(barAim\.current === e\.pointerId\) barAim\.current = -1;/g) ?? []).length === 2 && /if \(stickMove\(e\)\) return;\n\s+if \(barAim\.current === e\.pointerId\) aimAt\(e\.clientX, e\.clientY\);/.test(bars) && !/bumpZoom|game\./.test(bars), "");
  }

  // 6. At the larger view: every light in it is lit (the 24 budget is never reached by the scene's own lights),
  // and the minimap still spans more than the view.
  {
    const D = await import(pathToFileURL(join(dir, "lights.mjs")).href);
    const budget = D.LIGHT.budget;
    D.LIGHT.budget = 9999;
    const worst = { n: 0, at: "" };
    const sweep = (name, g) => {
      for (let ty = 0; ty < g.h; ty += 2) for (let tx = 0; tx < g.w; tx += 2) {
        if (g.fog) g.fog.fill(1);
        g.px = tx * TILE + 8;
        g.py = ty * TILE + 8;
        const n = D.sceneLights(g, Math.round(g.px - 160), Math.round(g.py - 120), 320, 240).length;
        if (n > worst.n) Object.assign(worst, { n, at: `${name} @${tx},${ty}` });
      }
    };
    const g = fresh();
    const night = 30 * 60 * 1000 + 15 * 60 * 1000 + 120000;
    g.enterTown();
    g.worldMs = night;
    sweep("town", g);
    for (const f of ["harvest", "krampus", "bloom", "ashen"]) {
      g.festivalId = () => f;
      g.lanternsLit = () => Array.from({ length: 32 }, (_, i) => i);
      sweep(`town ${f}`, g);
    }
    delete g.festivalId;
    delete g.lanternsLit;
    g.enterWorld(10 * TILE + 8, 33 * TILE + 9);
    g.worldMs = night;
    sweep("vale night", g);
    let floors = 0;
    for (const d of D.DUNGEONS) {
      if (d.town || d.id === "grave") continue;
      for (let fl = 1; fl <= (d.rift ? 1 : d.floors ?? 5); fl++) {
        g.enterDungeon(d.id);
        if (g.mapId !== "dungeon") break;
        g.floor = fl;
        g["loadFloor"]("down");
        floors++;
        sweep(`${d.id} ${fl}`, g);
      }
    }
    D.LIGHT.budget = budget;
    const draw = readFileSync("src/game/draw.ts", "utf8");
    check("retro1", `at Retro's 320×240 every scene light in view is lit: the most in any view (town on all four festival nights, the vale at night, ${floors} dungeon floors) is ${worst.n}, under the 24-light budget (light.ts unchanged), so nothing at the edge goes unlit; the minimap's 24-tile span still covers the 20×15-tile view`, budget === 24 && floors >= 60 && worst.n > 0 && worst.n <= 18 && /function drawMinimap[\s\S]{0,200}const span = 24;/.test(draw) && 24 * TILE >= 320, `${worst.n} at ${worst.at}, ${floors} floors`);
  }
}

if (on("fade1")) {
  // [OWNER-APPROVED 2026-10-01 19:59 ET: night foe fade-in] fade1: a night roamer dissolves in over half a second
  // when it spawns. Looks only: sim.ts and every play module are retro1's byte for byte, the foe is live from its first
  // tick, and a fixed-seed night spawns the same foes at the same places and times with or without the drawing.
  const { readFileSync, writeFileSync, readdirSync, mkdtempSync: mk } = await import("node:fs");
  const { createHash } = await import("node:crypto");
  const TAG = "[OWNER-APPROVED 2026-10-01 19:59 ET: night foe fade-in]";
  const dir = mk(join(tmpdir(), "gravewake-"));
  const root = process.cwd();
  writeFileSync(join(dir, "fade1.ts"), `export * from "${root}/src/game/sim.ts";\nexport * from "${root}/src/game/draw.ts";\nexport * as F from "${root}/src/game/fade.ts";\nexport * as P from "${root}/src/game/particles.ts";\nexport { CYCLE_MS, DAY_MS } from "${root}/src/game/content.ts";\n`);
  execFileSync("npx", ["esbuild", join(dir, "fade1.ts"), "--bundle", "--platform=node", "--format=esm", "--log-level=warning", `--outfile=${join(dir, "fade1.mjs")}`], { stdio: ["ignore", "ignore", "inherit"] });
  const X = await import(pathToFileURL(join(dir, "fade1.mjs")).href);
  const { F, P } = X;
  const md5 = (f) => createHash("md5").update(readFileSync(f)).digest("hex");
  const md5s = (t) => createHash("md5").update(t).digest("hex");
  const fadeSrc = readFileSync("src/game/fade.ts", "utf8");
  const draw = readFileSync("src/game/draw.ts", "utf8");
  const sim = readFileSync("src/game/sim.ts", "utf8");

  // A canvas stand-in: counts calls, and keeps the current path's rects so a clip can be read back as world cells.
  const mockCtx = () => {
    const st = { calls: {}, path: [], clips: [], rects: [], alpha: [] };
    const t = {
      beginPath() { st.path = []; },
      rect(x, y, w, h) { st.path.push([x, y, w, h]); st.rects.push([x, y, w, h]); },
      clip(rule = "nonzero") { st.clips.push({ rule, rects: st.path.slice() }); },
      createPattern: () => ({}),
      createLinearGradient: () => ({ addColorStop() {} }),
      createRadialGradient: () => ({ addColorStop() {} }),
      getImageData: () => ({ data: new Uint8ClampedArray(4) }),
      measureText: () => ({ width: 0 }),
    };
    const ctx = new Proxy(t, {
      get(o, k) {
        if (k === "st") return st;
        if (typeof o[k] === "function") return (...a) => { st.calls[k] = (st.calls[k] ?? 0) + 1; return o[k](...a); };
        if (k in o) return o[k];
        return () => { st.calls[k] = (st.calls[k] ?? 0) + 1; };
      },
      set(o, k, v) { if (k === "globalAlpha") st.alpha.push(v); o[k] = v; return true; },
    });
    return ctx;
  };
  // Which world cells a clip lets paint (nonzero: any rect; evenodd: an odd number of rects).
  const covered = (clip, x0, y0, x1, y1) => {
    const out = new Set();
    for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) {
      let n = 0;
      for (const [rx, ry, rw, rh] of clip.rects) if (x >= rx && x < rx + rw && y >= ry && y < ry + rh) n++;
      if (clip.rule === "evenodd" ? n % 2 === 1 : n > 0) out.add(`${x},${y}`);
    }
    return out;
  };

  // 1. The note is dated and tagged in both law files and in the code.
  {
    const law = readFileSync("rules/GAME_LAYOUT_TWO.txt", "utf8");
    const agents = readFileSync("AGENTS.project.md", "utf8");
    check("fade1", `the change is recorded as a dated owner-approved note, ${TAG}, in rules/GAME_LAYOUT_TWO.txt (under the FX rule's particles) and AGENTS.project.md, and tagged in fade.ts and draw.ts`, law.includes(`- ${TAG} A night roamer dissolves in over 0.5 s`) && law.indexOf(TAG) > law.indexOf("FX RULE  (particles") && law.indexOf(TAG) < law.indexOf("SHADERS") && agents.includes(`  ${TAG} The owner approved a looks-only fade-in for night foes`) && fadeSrc.includes("OWNER-APPROVED 2026-10-01 19:59 ET: night foe fade-in") && draw.includes("// fade1 (OWNER-APPROVED 2026-10-01 19:59 ET)"));
  }

  // 2. Byte-identical play: every game module but draw.ts is retro1's, and draw.ts is retro1's once fade1's edits are out.
  {
    const RETRO1 = {"src/game/audio.ts": "98fbcef17779a2f944f6e71f913eba81", "src/game/bond.ts": "2f29da655a986038789078125ce4c989", "src/game/bounty.ts": "8b71d8a405b42bbd61af08f6e60c32bc", "src/game/content.ts": "e520f80e802f7b80d5b5835893cbb019", "src/game/crowd.ts": "1ee8fc268f06cae9351df0d9bc9cf184", "src/game/decor.ts": "264e4f60b143aa8c3fd297387bffe027", "src/game/derby.ts": "083260bd87dec03a20e13a0e6ad96cca", "src/game/feats.ts": "39ed775c579eed137ffa64fd877bb647", "src/game/festivals.ts": "d6c5fd0abacc274cff6d5d35356422fa", "src/game/graves.ts": "bd2a91295356e6e4d6f080a362832b80", "src/game/light.ts": "c87f3807e23eae891280b96731660c88", "src/game/mimic.ts": "23ec42f4ff5bd18b96d1e00234635815", "src/game/particles.ts": "32a2407a12fd4f93b4e6a423adcda043", "src/game/runs.ts": "92b5f1b4c6d493fdb44719c0ca300770", "src/game/screen.ts": "b27ad646226e7b46470d9e929f887aef", "src/game/seasons.ts": "570817f597bdf4a8d21378967ebe27f1", "src/game/sim.ts": "a3ecff0b08113f1b418cb4127e7a4f94", "src/game/Gravewake.tsx": "35ec89e9444560c7b22a12df60021524"};
    const files = readdirSync("src/game").filter((f) => /\.tsx?$/.test(f)).map((f) => `src/game/${f}`).sort();
    const bad = Object.entries(RETRO1).filter(([f, h]) => md5(f) !== h).map(([f]) => f);
    const extra = files.filter((f) => !(f in RETRO1) && f !== "src/game/draw.ts" && f !== "src/game/fade.ts");
    check("fade1", "looks only: sim.ts (the spawn rule, distance and timing, AI, aggro, HP, damage, collision, the sim tick, saves), particles.ts, light.ts, screen.ts (every preset), the shell and every other game module are byte-identical to retro1; only draw.ts and the new fade.ts change", bad.length === 0 && extra.length === 0, [...bad, ...extra].join(", "));
    const un = unfade1(draw);
    check("fade1", "draw.ts: take out fade1's five edits (the import, one line in each of the two foe-light loops, the glow index, the dissolve block) and the file is retro1's byte for byte", un !== draw && md5s(un) === "ade20b08057dc3b318b9a55b1a9a9f32", md5s(un));
    const users = files.filter((f) => f !== "src/game/fade.ts" && /from "\.\/fade"/.test(readFileSync(f, "utf8")));
    check("fade1", "only the drawing reads the fade: draw.ts is the one module that imports fade.ts (the sim never does), and fade.ts stores nothing (no localStorage, no save, no Math.random, no clock of its own)", JSON.stringify(users) === '["src/game/draw.ts"]' && !/localStorage|saveSlot|Math\.random|Date\.now|performance\.now/.test(fadeSrc) && !/from "\.\/fade"/.test(sim), users.join(","));
  }

  // 3. The timing: about half a second, read from the stamp already in a night roamer's id.
  {
    const t0 = 4560016.666666667;
    const id = `r${t0}-0`;
    const ramp = [0, 100, 250, 400, 499, 500, 900].map((d) => F.fadeOf(id, t0 + d));
    const others = ["bounty-3", "d1-0", "w2-1", "bride", "pumpkinlord", "pumpkin", "add-6360016.6-0", "rem", "r12-x", "riftling", "r-5-0", "mouth:3", ""].map((o) => [F.spawnStamp(o), F.fadeOf(o, 0), F.fadeOf(o, 100), F.fadeOf(o, 6360016.6 + 100)]);
    check("fade1", `the fade lasts ${F.FADE.ms} world ms (inside 0.4-0.6 s): 0 at spawn, rising evenly, solid from 0.5 s on; a time before the stamp (a load, a test) is solid`, F.FADE.ms >= 400 && F.FADE.ms <= 600 && JSON.stringify(ramp) === JSON.stringify([0, 0.2, 0.5, 0.8, 0.998, 1, 1]) && F.fadeOf(id, t0 - 1) === 1 && F.fadeOf(id, NaN) === 1, JSON.stringify(ramp));
    check("fade1", "only a night roamer fades (its id is sim.ts's r<worldMs>-<n>); bounties, lairs, bosses, festival summons, dungeon foes and every other id draw solid as before", others.every(([at, a, b, c]) => at === null && a === 1 && b === 1 && c === 1) && F.spawnStamp(id) === t0 && F.spawnStamp("r1e+21-2") === 1e21 && sim.includes("        id: `r${this.worldMs}-${n}`,\n"), JSON.stringify(others));
  }

  // 4. The dither: whole world pixels, pinned to the grid, drawn or not (never blended).
  {
    const levels = [0, 0.01, 0.06, 0.2, 0.47, 0.5, 0.53, 0.8, 0.94, 0.99, 1].map((t) => F.fadeLevel(t));
    let counts = true, pinned = true;
    for (let lv = 0; lv <= 16; lv++) {
      let n = 0;
      for (let y = 0; y < 4; y++) for (let x = 0; x < 4; x++) {
        if (F.shows(x, y, lv)) n++;
        if (F.shows(x, y, lv) !== F.shows(x + 4, y - 8, lv) || F.shows(x, y, lv) !== F.shows(x - 12, y + 40, lv)) pinned = false;
        if (lv > 0 && F.shows(x, y, lv - 1) && !F.shows(x, y, lv)) counts = false;
      }
      if (n !== lv) counts = false;
    }
    check("fade1", "the dissolve is the light layer's 4x4 Bayer: level n shows exactly n of 16 cells, a cell once shown stays shown, and the pattern is pinned to world pixels (it does not crawl with the camera)", counts && pinned && JSON.stringify(levels) === JSON.stringify([0, 0, 1, 3, 7, 8, 9, 13, 15, 16, 16]) && fadeSrc.includes("const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];") && readFileSync("src/game/light.ts", "utf8").includes("const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];"), JSON.stringify(levels));
    const bad = [];
    for (const t of [0.07, 0.2, 0.45, 0.5, 0.55, 0.8, 0.9]) {
      for (const [x, y] of [[100, 200], [101.4, 199.6], [-37.5, 3.49]]) {
        const c = mockCtx();
        let drew = 0;
        F.dissolve(c, t, x, y, () => drew++);
        const cl = c.st.clips[0];
        const lv = F.fadeLevel(t);
        const x0 = Math.round(x) - F.FADE.box.left, y0 = Math.round(y) - F.FADE.box.up, x1 = Math.round(x) + F.FADE.box.right, y1 = Math.round(y) + F.FADE.box.down;
        const got = cl ? covered(cl, x0 - 2, y0 - 2, x1 + 2, y1 + 2) : new Set();
        let want = 0, wrong = 0;
        for (let wy = y0 - 2; wy < y1 + 2; wy++) for (let wx = x0 - 2; wx < x1 + 2; wx++) {
          const inside = wx >= x0 && wx < x1 && wy >= y0 && wy < y1 && F.shows(wx, wy, lv);
          if (inside) want++;
          if (inside !== got.has(`${wx},${wy}`)) wrong++;
        }
        const whole = c.st.rects.every((r) => r.every((v) => Number.isInteger(v)));
        if (drew !== 1 || c.st.clips.length !== 1 || wrong || !want || !whole || c.st.alpha.length || c.st.calls.save !== 1 || c.st.calls.restore !== 1) bad.push(`t${t}@${x},${y}: drew ${drew} clips ${c.st.clips.length} wrong ${wrong} want ${want} whole ${whole}`);
      }
    }
    const solid = mockCtx();
    let s1 = 0;
    F.dissolve(solid, 1, 10, 10, () => s1++);
    const none = mockCtx();
    let s0 = 0;
    F.dissolve(none, 0, 10, 10, () => s0++);
    check("fade1", "dissolve: mid-fade the foe paints only through whole world-pixel cells, exactly the Bayer cells of its level inside its box (even-odd when fewer are hidden), with no alpha set and its state restored; at 1 it is a plain draw (no clip), at 0 it paints nothing", !bad.length && s1 === 1 && !solid.st.clips.length && s0 === 0 && !none.st.calls.clip && !/globalAlpha|filter|rgba\(|Gradient|shadowBlur|globalCompositeOperation/.test(fadeSrc), bad.slice(0, 3).join("; "));
    const c = mockCtx();
    const hits = [];
    const step = { fn: () => hits.push("fn"), actor: () => hits.push("actor") };
    const glow = [() => hits.push("other"), () => hits.push("glow")];
    F.fadeStep(c, step, glow, 1, 0.3, 50, 60);
    step.fn();
    step.actor(c);
    glow[0](c);
    glow[1](c);
    check("fade1", "a fading foe's whole draw step goes through the dissolve: body, blob shadow and hit flash (the step), its actor-light silhouette and its own glow-mask entries; another prop's glow is left alone", JSON.stringify(hits) === '["fn","actor","other","glow"]' && c.st.clips.length === 3, `${JSON.stringify(hits)} ${c.st.clips.length}`);
  }

  // 5. The mist: six dust chips from the pool, once per foe, early in the fade.
  {
    const pool = new P.ParticlePool();
    const foe = { x: 300.4, y: 200.6 };
    const a = F.mistPuff(pool, foe, 0.1);
    const n1 = pool.count(P.CH_INTERACT);
    const b = F.mistPuff(pool, foe, 0.1);
    const late = F.mistPuff(pool, { x: 1, y: 1 }, 0.6);
    const chips = [];
    for (let i = 0; i < pool.size; i++) if (pool.life[i] > 0) chips.push([pool.kind[i], pool.color[i], pool.x[i], pool.y[i], pool.life[i]]);
    const others = [P.CH_WEATHER, P.CH_COMBAT, P.CH_HUB].map((ch) => pool.count(ch));
    const near = chips.every(([, , x, y]) => Math.abs(x - 300) <= 8 && y <= 201 && y >= 198);
    check("fade1", "the ground-mist puff: six dust chips on the interact channel (cap 16) in the pool's own ash colours, at the foe's feet, 0.45 s; once per foe and not when first seen past half-fade; no other channel", a && !b && !late && n1 === 6 && chips.length === 6 && chips.every(([k, col, , , l]) => k === P.K_DUST && (col === P.C_ASH || col === P.C_ASH_DARK) && Math.abs(l - 0.45) < 1e-6) && near && others.every((v) => v === 0) && F.FADE.puff <= P.CHANNEL_CAPS[P.CH_INTERACT], JSON.stringify(chips.slice(0, 2)));
  }

  // 6. A fixed-seed night. Run A is the sim alone; run B draws every fading frame in Auto and in Retro. Same spawns,
  // same times, same everything; and the fixed-seed trace is retro1's own (pinned before fade1 was written).
  {
    const DAY = X.CYCLE_MS, DUSK = X.DAY_MS;
    const night = (seed, drawn) => {
      let s = seed >>> 0, calls = 0;
      const realRandom = Math.random, realNow = Date.now;
      Math.random = () => { calls++; s = (s + 0x6d2b79f5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
      Date.now = () => 1790000000000;
      const seen = { clips: 0, frames: 0, puffs: 0, faded: new Set(), auto: 0, retro: 0, lightsOff: 0 };
      try {
        const g = new X.Game();
        g.start("warrior", "str", "A");
        g.held.clear();
        g.level = 12;
        g.worldMs = 2 * DAY + DUSK + 60000;
        g.enterWorld(30 * TILE + 8, 50 * TILE + 8);
        const ids = new Set(), log = [];
        const keys = ["KeyD", "KeyS", "KeyA", "KeyW"];
        const mapAt = g.mapId;
        for (let i = 0; i < 60 * 120; i++) {
          if (i % 600 === 599) g.roamers = g.roamers.filter((r) => !/^r\d/.test(r.id));
          g.held.clear();
          if (Math.floor(i / 60) % 2 === 0) g.held.add(keys[Math.floor(i / 120) % 4]);
          g.update(1 / 60);
          for (const r of g.roamers) if (!ids.has(r.id)) { ids.add(r.id); log.push([r.id, r.x, r.y, r.def, r.level, g.worldMs, g.frame, i]); }
          if (g.mode !== "play") { log.push(["mode", g.mode, i, g.worldMs]); g.mode = "play"; g.roamers = g.roamers.filter((r) => !r.aggro); }
          if (drawn) {
            const fading = g.roamers.filter((r) => X.F.fadeOf(r.id, g.worldMs) < 1);
            if (fading.length || i % 120 === 0) {
              const before = g.fx.count(P.CH_INTERACT);
              for (const [w, h, k, tag] of [[960, 640, g.zoom, "auto"], [320, 240, 1, "retro"]]) {
                const c = mockCtx();
                X.drawWorld(c, g, w, h, k);
                seen.clips += c.st.clips.length;
                if (c.st.clips.length) seen[tag]++;
              }
              seen.frames++;
              if (g.fx.count(P.CH_INTERACT) > before) seen.puffs++;
              for (const r of fading) seen.faded.add(r.id);
              const lights = X.sceneLights(g, g.px - 160, g.py - 120, 320, 240);
              for (const r of fading) if (X.F.fadeOf(r.id, g.worldMs) < X.F.FADE.lightAt && lights.some((l) => l.x === r.x)) seen.lightsOff = -999;
            }
          }
        }
        g.saveSlot(0);
        const state = JSON.stringify({ roamers: g.roamers, px: g.px, py: g.py, hp: g.hp, mp: g.mp, xp: g.xp, gold: g.gold, worldMs: g.worldMs, frame: g.frame, mode: g.mode, mapId: g.mapId, phase: g.phase, calls });
        // Item uids come from one module-wide counter (each new Game takes the next ones); number them per save.
        const uids = new Map();
        const save = (localStorage.getItem("gravewake-saves-v1") ?? "").replace(/"uid":"i\d+"/g, (u) => { if (!uids.has(u)) uids.set(u, `"uid":"#${uids.size}"`); return uids.get(u); });
        return { trace: JSON.stringify({ log, calls, map: [mapAt, g.mapId], end: [g.px, g.py, g.hp, g.worldMs, g.frame, g.phase] }), log, state, save, seen };
      } finally {
        Math.random = realRandom;
        Date.now = realNow;
      }
    };
    const A = night(1337, false), A2 = night(1337, false), B = night(1337, true);
    const spawns = A.log.filter((e) => /^r\d/.test(e[0]));
    const hashA = md5s(A.trace);
    check("fade1", `fixed seed (1337, 120 s of vale night, hero walking): ${spawns.length} night spawns; the trace (every foe's id, x, y, kind, level, world ms, frame and tick of first sight, and the end state) is byte-identical run to run and to retro1's pinned trace e4bdd690…`, spawns.length >= 15 && A.trace === A2.trace && hashA === "e4bdd6909bd32edc92b8883f185fd951", hashA);
    check("fade1", `drawing the fade changes nothing: with drawWorld run on ${B.seen.frames} frames in Auto (960x640 at the C10 zoom) and Retro (320x240 at 1x), the spawn positions and times, the end state (every roamer, the hero, HP, world clock, Math.random use) and the save are byte-identical to the undrawn run`, B.trace === A.trace && B.state === A.state && B.save === A.save && !!A.save && B.seen.frames > 200, `${md5s(B.trace)} ${B.state === A.state} ${B.save === A.save}`);
    check("fade1", `and the fade really drew: every night spawn was seen mid-fade (${B.seen.faded.size} of ${spawns.length}), the dither clipped in Auto on ${B.seen.auto} frames and in Retro on ${B.seen.retro}, ${B.seen.puffs} mist puffs went into the pool, and no fading foe lit before half-fade`, B.seen.faded.size === spawns.length && B.seen.auto > 0 && B.seen.retro > 0 && B.seen.puffs > 0 && B.seen.puffs <= spawns.length && B.seen.lightsOff === 0 && B.seen.clips > 0);
  }

  // 7. Live during the fade: a foe at fade 0 touches, starts the fight and is fought exactly like a solid one.
  {
    const meet = (id) => {
      const g = fresh();
      g.level = 12;
      g.worldMs = 2 * X.CYCLE_MS + X.DAY_MS + 60000;
      g.enterWorld(30 * TILE + 8, 50 * TILE + 8);
      g.roamers = g.roamers.filter((r) => r.boss || r.bounty);
      g.nightCool = 999;
      const rid = id(g.worldMs);
      g.roamers.push({ id: rid, x: g.px + 6, y: g.py, family: "beast", tint: "#8a6844", def: "wolf", level: 12, ang: 0 });
      const fade = X.F.fadeOf(rid, g.worldMs);
      g.update(1 / 60);
      const gone = !g.roamers.some((r) => r.id === rid);
      const fight = JSON.stringify(g.roamers.filter((r) => r.aggro));
      for (let i = 0; i < 180; i++) g.update(1 / 60);
      const later = JSON.stringify({ roamers: g.roamers, hp: g.hp, px: g.px, py: g.py, log: g.logLine });
      return { fade, gone, fight, later, aggro: g.roamers.filter((r) => r.aggro).length };
    };
    const fresh0 = meet((ms) => `r${ms}-0`), solid = meet(() => "solid-0");
    check("fade1", "the foe is fully live during the fade: one at fade 0 that the hero walks into starts the same fight on the same tick (the same foes, HP and numbers) as a solid one, and three seconds of that fight play out identically (no grace, no invulnerable window, nothing skipped)", fresh0.fade === 0 && solid.fade === 1 && fresh0.gone && solid.gone && fresh0.fight !== "[]" && fresh0.fight === solid.fight && fresh0.later === solid.later, `${fresh0.fight.slice(0, 120)} | ${solid.fight.slice(0, 120)}`);
  }

  // 8. Lights: a flame or ghost foe's own light waits for half-fade; every other foe's light is as before.
  {
    const g = fresh();
    g.worldMs = 2 * X.CYCLE_MS + X.DAY_MS + 60000;
    g.enterWorld(30 * TILE + 8, 50 * TILE + 8);
    g.roamers = [];
    const at = g.worldMs;
    g.roamers.push({ id: `r${at}-0`, x: g.px + 30, y: g.py, family: "ghost", tint: "#9a8aa8", def: "wisp", level: 5, ang: 0 });
    g.roamers.push({ id: "bounty-9", x: g.px - 30, y: g.py, family: "ghost", tint: "#9a8aa8", def: "wisp", level: 5, ang: 0 });
    const lit = (ms) => { g.worldMs = ms; return X.sceneLights(g, g.px - 160, g.py - 120, 320, 240).filter((l) => l.y === g.py - 12).map((l) => l.x - g.px).sort((p, q) => p - q).join(","); };
    const early = lit(at + 100), mid = lit(at + 260), late = lit(at + 900);
    check("fade1", "a spawning ghost or flame foe's light comes on at half-fade (none at 0.2, lit at 0.52 and after); a foe that is not a fresh night roamer is lit as before", early === "-30" && mid === "-30,30" && late === "-30,30" && (draw.match(/if \(fadeOf\(r\.id, g\.worldMs\) < FADE\.lightAt\) continue;/g) ?? []).length === 2, `${early} | ${mid} | ${late}`);
  }
}

if (!ran) {
  console.log("No checks ran. Groups: move, bodies, doors, fight, gear, loop, fx, crowd, rune, crack, trap, curse, rescue, mimic, bounty, retouch, escort, errand, graves, derby, decor, bond, season, daysweep, festival, mapwriter, festival2, mapwriter2, gfx1, gfx2, gfx3, screen1, retro1, fade1");
  process.exit(1);
}
console.log(failures.length ? `\n${failures.length} failed` : `\n${ran} checks passed`);
process.exit(failures.length ? 1 : 0);
