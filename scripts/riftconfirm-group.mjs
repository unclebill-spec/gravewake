// rift-confirm (Will, 2026-10-26): group riftconfirm. Every rift that zones you asks Yes/No each time you step on its
// mouth; the world waits while it asks; No steps you back; stepping on again asks again; Yes crosses.
// Kept in its own file; gravewake-check.mjs only calls run().
import { execFileSync } from "node:child_process";
import { mkdtempSync, writeFileSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

export async function run(check) {
  const dir = mkdtempSync(join(tmpdir(), "gravewake-riftconfirm-"));
  const root = process.cwd();
  writeFileSync(join(dir, "b.ts"), `export * from "${root}/src/game/sim.ts";\nexport { RIFTS } from "${root}/src/game/content.ts";\nexport * as WR from "${root}/src/game/wayrifts.ts";\n`);
  execFileSync("npx", ["esbuild", join(dir, "b.ts"), "--bundle", "--platform=node", "--format=esm", "--log-level=error", "--loader:.png=empty", "--loader:.css=empty", `--outfile=${join(dir, "b.mjs")}`], { stdio: ["ignore", "ignore", "inherit"] });
  const X = await import(pathToFileURL(join(dir, "b.mjs")).href);
  const TILE = 16;
  const tile = (g) => `${Math.floor(g.px / TILE)},${Math.floor(g.py / TILE)}`;
  const hold = (g, key, secs) => { g.held.add(g.keyBind[key]); for (let t = 0; t < secs; t += 1 / 60) g.update(1 / 60); g.held.delete(g.keyBind[key]); };
  const idle = (g, secs) => { for (let t = 0; t < secs; t += 1 / 60) g.update(1 / 60); };
  const fresh = () => { const g = new X.Game(); g.enterTown(33 * TILE + 8, 26 * TILE + 8); g.mode = "play"; g.worldMs = 12 * 60 * 1000; return g; };

  // QA repro: stand at (33,26), hold W 1.3 s, then hold S 1 s
  const g = fresh();
  hold(g, "up", 1.3);
  const ask1 = g.riftAsk, at1 = tile(g);
  check("riftconfirm", `the dialog appears: holding W from (33,26) stops on the festival rift's mouth with "Enter the rift?" up (${ask1?.id} at ${at1})`, !!ask1 && ask1.id === "way:hub-fest" && at1 === "33,22" && g.mapId === "town");
  // held movement (keys and the touch stick) doesn't cross; nothing else moves either
  const t0 = g.worldMs;
  hold(g, "up", 1);
  g.stickX = 0; g.stickY = -1; idle(g, 0.5); g.stickX = 0; g.stickY = 0;
  hold(g, "down", 1);
  check("riftconfirm", `held movement doesn't cross: 2.5 s of W, the stick and S later the hero is still on the mouth (${tile(g)}), still asked, still in town, the world clock frozen (${g.worldMs - t0} ms), no travel`, tile(g) === "33,22" && !!g.riftAsk && g.mapId === "town" && g.worldMs === t0 && !g.travel);
  // No pushes back to the tile you came from
  g.answerRift(false);
  const back = tile(g);
  idle(g, 0.5);
  check("riftconfirm", `No pushes back: off the mouth to the tile the hero came from (${back}), the dialog gone and it stays gone while standing there (${!g.riftAsk})`, back === "33,23" && !g.riftAsk && tile(g) === "33,23" && g.mapId === "town");
  // re-entry prompts again
  hold(g, "up", 0.6);
  check("riftconfirm", `re-entry prompts again: stepping back onto the mouth asks again (${g.riftAsk?.id} at ${tile(g)})`, g.riftAsk?.id === "way:hub-fest" && tile(g) === "33,22");
  // Esc-equivalent from a sideways approach steps back sideways
  g.answerRift(true);
  idle(g, 3);
  check("riftconfirm", `Yes enters: the rift takes the hero to this season's festival twin on the vale (${g.mapId} ${tile(g)})`, g.mapId === "world" && !g.riftAsk);

  // every rift type that zones the player asks: the Ashen Rift's mouth on the vale and a wild portal
  const r = X.RIFTS[0];
  const h = new X.Game(); h.enterWorld(r.tx * TILE + 8, (r.ty + 2) * TILE + 8); h.mode = "play";
  hold(h, "up", 1.5);
  const askedR = h.riftAsk?.id === `rift:${r.id}` && h.mapId === "world";
  h.answerRift(true); idle(h, 0.2);
  check("riftconfirm", `the vale's ${r.name} asks too (${askedR}) and Yes zones in (${h.mapId})`, askedR && h.mapId === "dungeon");
  const src = readFileSync("src/game/sim.ts", "utf8"), ui = readFileSync("src/game/Gravewake.tsx", "utf8");
  check("riftconfirm", "no 'once per wake' gating left; the wild portal and sealed/seasonal wayrifts go through the same ask (sealed ones that can't take you only say when they wake); the UI has tappable Yes/No and E/Enter, Esc, arrows", !/festRiftAsked|festRiftWait|FEST_RIFT_ASK/.test(src) && /wild \? "wild"/.test(src) && /wayLink\(way, this\.season\(\)\) \? way/.test(src) && /data-testid="rift-yes"/.test(ui) && /data-testid="rift-no"/.test(ui) && /e\.code === "KeyE" \|\| e\.code === "Enter"/.test(ui) && /e\.code === "Escape"/.test(ui));
  // QA warp (qa/warp): lands beside a blade and a secret wall; the shell only exposes it with ?qa
  const q1 = new X.Game(); const wb = q1.qaWarp("blade"); const nearB = q1.feats?.blades?.[0];
  const q2 = new X.Game(); const ws = q2.qaWarp("secret"); const cw = q2.feats?.crack?.wall;
  const okB = !!wb && nearB && Math.abs(Math.floor(q1.px / TILE) - nearB.x) <= 2 && Math.abs(Math.floor(q1.py / TILE) - nearB.y) <= 3;
  const okS = !!ws && cw && Math.abs(Math.floor(q2.px / TILE) - cw.x) <= 2 && Math.abs(Math.floor(q2.py / TILE) - cw.y) <= 2;
  check("riftconfirm", `QA warp lands beside a swinging blade (${wb}) and a secret wall (${ws}), and the shell hooks it only behind ?qa`, okB && okS && /has\("qa"\)\) window\.__qaWarp/.test(ui));
  // a sealed (out of season) far wayrift doesn't open the dialog
  const sealed = X.WR.WAYRIFTS.find((w) => w.season && !X.WR.wayAwake(w, h.season()));
  if (sealed) {
    const s = new X.Game(); s.enterWorld(sealed.x * TILE + 8, (sealed.y + 1) * TILE + 8); s.mode = "play";
    s.doorCool = 0; s.px = sealed.x * TILE + 8; s.py = sealed.y * TILE + 8; s.update(1 / 60);
    check("riftconfirm", `a sealed ${sealed.name} doesn't ask and doesn't take you (it can't)`, !s.riftAsk && s.mapId === "world" && !s.travel, `${s.riftAsk?.id} ${tile(s)} ${s.logLine}`);
  }
}
