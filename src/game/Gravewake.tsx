import { useEffect, useRef, useState, type ReactNode } from "react";
import { CLASSES, type ClassId, type StatPath } from "./content";
import { AudioBus } from "./audio";
import { drawBattle, drawMap, drawMinimap, drawPortrait, drawWorld } from "./draw";
import { ACTS, Game, type Act } from "./sim";

/**
 * The shell around the simulation. The canvas draws the world.
 * This component draws the menus and forwards keys, the stick, and the mouse.
 */
export function Gravewake() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const miniRef = useRef<HTMLCanvasElement>(null);
  const gameRef = useRef<Game | null>(null);
  const audioRef = useRef<AudioBus | null>(null);
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const [tick, setTick] = useState(0);
  const [cls, setCls] = useState<ClassId>("warrior");
  const [path, setPath] = useState<StatPath>("str");
  const [name, setName] = useState("Wanderer");
  const [stake, setStake] = useState(5);
  const [bankN, setBankN] = useState(10);
  const stick = useRef({ id: -1, ox: 0, oy: 0 });
  const [miniAt, setMiniAt] = useState({ x: 8, y: 132 });
  const [pip, setPip] = useState(false);
  const miniTap = useRef(0);
  const drag = useRef<{ id: number; dx: number; dy: number } | null>(null);
  const pinchD = useRef<number | null>(null);
  const [pauseTab, setPauseTab] = useState<"pack" | "guide" | "pad">("pack");

  /**
   * Own the game and the mixer for the life of the page. The test hook is for the smoke pass.
   */
  useEffect(() => {
    const audio = new AudioBus();
    audioRef.current = audio;
    const game = new Game();
    game.audio = audio;
    gameRef.current = game;
    window.__controlsTest = {
      getX: () => game.px,
      getY: () => game.py,
      getYaw: () => (game.facing === "w" ? Math.PI : game.facing === "e" ? 0 : game.facing === "n" ? -Math.PI / 2 : Math.PI / 2),
      getSpeed: () => (game.held.size || game.stickX || game.stickY ? 1 : 0),
      setKeys: (codes: string[]) => {
        game.held = new Set(codes);
      },
      setPos: (x: number, y: number) => {
        game.px = x;
        game.py = y;
      },
      use: () => game.interact(),
      setTime: (ms: number) => {
        game.worldMs = ms;
      },
    };
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d")!;
    let raf = 0;
    let last = performance.now();
    const frame = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      game.update(dt);
      const rect = canvas.getBoundingClientRect();
      const dpr = (window.devicePixelRatio || 1) >= 2 ? 2 : 1;
      const w = Math.max(1, Math.floor(rect.width * dpr));
      const h = Math.max(1, Math.floor(rect.height * dpr));
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
      }
      canvas.style.imageRendering = "pixelated";
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.imageSmoothingEnabled = false;
      ctx.fillStyle = "#140e12";
      ctx.fillRect(0, 0, w, h);
      if (game.mode !== "title") {
        if (game.mode === "battle") drawBattle(ctx, game, w, h);
        else if (game.mode === "map") drawMap(ctx, game, w, h);
        else drawWorld(ctx, game, w, h);
      }
      const mini = miniRef.current;
      if (mini && game.mode !== "title" && game.mode !== "map") {
        if (mini.width !== 96) mini.width = 96;
        if (mini.height !== 96) mini.height = 96;
        const mctx = mini.getContext("2d");
        if (mctx) drawMinimap(mctx, game, 96);
      }
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    const id = window.setInterval(() => setTick((n) => n + 1), 200);
    const down = (e: KeyboardEvent) => {
      audio.unlock();
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (game.captureAct) {
        e.preventDefault();
        game.bindKey(game.captureAct, e.code);
        setTick((n) => n + 1);
        return;
      }
      game.held.add(e.code);
      if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Space"].includes(e.code)) e.preventDefault();
      const bind = game.keyBind;
      if (game.mode === "fish") {
        if (e.code === bind.use || e.code === "Space") {
          e.preventDefault();
          game.reel();
        }
        if (e.code === bind.pause || e.code === "Escape") game.togglePause();
        setTick((n) => n + 1);
        return;
      }
      if (game.mode === "battle") {
        if (e.code === bind.pause || e.code === "Escape" || e.code === "KeyI" || e.code === "KeyC") {
          game.togglePause();
          setTick((n) => n + 1);
          return;
        }
        if (game.battle?.turn === "ally") {
          const opts = game.allyOptions();
          if (e.code === bind.use || e.code === "Space") game.command("strike");
          if (e.code === bind.area) game.command("guard");
          if (e.code === "Digit1") game.command(opts[0] ?? "");
          if (e.code === "Digit2") game.command(opts[1] ?? "");
          if (e.code === "Digit3") game.command(opts[2] ?? "");
          if (e.code === "Digit4") game.command(opts[3] ?? "");
          setTick((n) => n + 1);
          return;
        }
        if (e.code === bind.use || e.code === "Space") game.command("strike");
        if (e.code === bind.area) game.command("cleave");
        if (e.code === bind.far) game.command("ranged");
        if (e.code === "Digit1") game.command(game.specials[0] ?? "");
        if (e.code === "Digit2") game.command(game.specials[1] ?? "");
        if (e.code === "Digit3") game.command(game.specials[2] ?? "");
        if (e.code === "Digit4") game.command(game.specials[3] ?? "");
        if (e.code === bind.drink) game.command("potion");
        setTick((n) => n + 1);
        return;
      }
      if (e.code === bind.use || e.code === "Space") {
        e.preventDefault();
        game.slash();
      }
      if (e.code === bind.area) game.whirl();
      if (e.code === bind.far) game.smite();
      if (e.code === bind.drink) game.usePotion();
      if (e.code === "Digit1") game.castKnown(game.specials[0] ?? "");
      if (e.code === "Digit2") game.castKnown(game.specials[1] ?? "");
      if (e.code === "Digit3") game.castKnown(game.specials[2] ?? "");
      if (e.code === "Digit4") game.castKnown(game.specials[3] ?? "");
      const pauseKey = e.code === bind.pause || e.code === "Escape";
      const packKey = (e.code === "KeyI" || e.code === "KeyC") && !pauseKey;
      if (pauseKey) {
        if (game.mode === "map") game.mode = "play";
        else game.togglePause();
      } else if (packKey && game.mode !== "title" && game.mode !== "map") game.togglePause();
      if (e.code === bind.map && game.mode === "play") game.mode = "map";
      else if (e.code === bind.map && game.mode === "map") game.mode = "play";
      setTick((n) => n + 1);
    };
    const up = (e: KeyboardEvent) => game.held.delete(e.code);
    const blur = () => game.held.clear();
    const vis = () => {
      if (document.visibilityState === "visible") void audio.ctx?.resume();
    };
    const wheel = (e: WheelEvent) => {
      if (game.mode === "title") return;
      e.preventDefault();
      game.bumpZoom(e.deltaY > 0 ? -1 : 1);
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    window.addEventListener("blur", blur);
    document.addEventListener("visibilitychange", vis);
    canvas.addEventListener("wheel", wheel, { passive: false });
    return () => {
      cancelAnimationFrame(raf);
      window.clearInterval(id);
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
      window.removeEventListener("blur", blur);
      document.removeEventListener("visibilitychange", vis);
      canvas.removeEventListener("wheel", wheel);
      delete window.__controlsTest;
    };
  }, []);

  const game = gameRef.current;
  void tick;
  const unlock = () => audioRef.current?.unlock();
  const bump = () => setTick((n) => n + 1);

  const begin = () => {
    unlock();
    gameRef.current?.start(cls, path, name);
    bump();
  };

  const aim = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const g = gameRef.current;
    const canvas = canvasRef.current;
    if (!g || !canvas || g.mode !== "play") return;
    const rect = canvas.getBoundingClientRect();
    const sx = ((e.clientX - rect.left) / rect.width) * canvas.width;
    const sy = ((e.clientY - rect.top) / rect.height) * canvas.height;
    const zoom = g.zoom;
    const camX = Math.round(g.px - canvas.width / (2 * zoom));
    const camY = Math.round(g.py - canvas.height / (2 * zoom));
    g.setGoal(camX + sx / zoom, camY + sy / zoom);
  };

  /** Title, HUD, and the panel for whichever mode the simulation is in. */
  return (
    <main className="relative h-full w-full overflow-hidden bg-bg text-fg">
      <canvas
        ref={canvasRef}
        className="absolute inset-0 h-full w-full touch-none"
        style={{ imageRendering: "pixelated" }}
        onPointerDown={(e) => {
          unlock();
          pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
          (e.currentTarget as HTMLCanvasElement).setPointerCapture(e.pointerId);
          const g = gameRef.current;
          if (pointers.current.size === 2) {
            const pts = [...pointers.current.values()];
            pinchD.current = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
            if (g) g.goal = null;
            return;
          }
          pinchD.current = null;
          if (pointers.current.size === 1) aim(e);
        }}
        onPointerMove={(e) => {
          if (!pointers.current.has(e.pointerId)) return;
          pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
          if (pointers.current.size === 2) {
            const pts = [...pointers.current.values()];
            const d = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
            const prev = pinchD.current ?? d;
            if (d - prev > 22) {
              gameRef.current?.bumpZoom(1);
              pinchD.current = d;
            } else if (prev - d > 22) {
              gameRef.current?.bumpZoom(-1);
              pinchD.current = d;
            }
            return;
          }
          if (pointers.current.size === 1) aim(e);
        }}
        onPointerUp={(e) => {
          pointers.current.delete(e.pointerId);
          pinchD.current = null;
        }}
        onPointerCancel={(e) => {
          pointers.current.delete(e.pointerId);
          pinchD.current = null;
        }}
      />
      {game?.mode === "title" || !game ? (
        <section className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-3 overflow-auto bg-bg px-4 py-6">
          <p className="text-xs tracking-[0.28em] text-muted uppercase">Twilight vale</p>
          <h1 className="font-display text-5xl text-primary">Gravewake</h1>
          <p className="max-w-md text-center text-sm text-muted">
            Choose a face. Three slots keep a life. Tap the ground to walk. Pinch to look closer. A pad can drive the same buttons.
          </p>
          <label className="flex w-full max-w-lg flex-col gap-1 text-sm">
            Name
            <input value={name} onChange={(e) => setName(e.target.value)} className="rounded border border-border bg-surface px-3 py-2 text-fg" />
          </label>
          <div className="grid w-full max-w-lg grid-cols-2 gap-2">
            {(Object.keys(CLASSES) as ClassId[]).map((id) => (
              <button key={id} type="button" onClick={() => setCls(id)} className={`flex gap-2 rounded border px-2 py-2 text-left ${cls === id ? "border-primary bg-surface" : "border-border"}`}>
                <Portrait role={id} />
                <span>
                  <span className="block font-display text-lg leading-tight">{CLASSES[id].label}</span>
                  <span className="text-xs text-muted">{CLASSES[id].blurb}</span>
                </span>
              </button>
            ))}
          </div>
          {cls === "vampire" ? (
            <div className="flex flex-wrap gap-2">
              {(["str", "dex", "int"] as StatPath[]).map((p) => (
                <button key={p} type="button" onClick={() => setPath(p)} className={`rounded border px-3 py-2 ${path === p ? "border-primary" : "border-border"}`}>
                  {p === "str" ? "Strength" : p === "dex" ? "Dexterity" : "Intelligence"}
                </button>
              ))}
            </div>
          ) : null}
          <button type="button" onClick={begin} className="rounded bg-primary px-6 py-3 font-display text-lg text-bg">
            Wake in town
          </button>
          <div className="grid w-full max-w-lg grid-cols-3 gap-2">
            {[0, 1, 2].map((slot) => (
              <button
                key={slot}
                type="button"
                disabled={!game?.hasSave(slot)}
                onClick={() => {
                  unlock();
                  gameRef.current?.loadSlot(slot);
                  bump();
                }}
                className="rounded border border-border px-2 py-2 text-left text-xs disabled:opacity-40"
              >
                <span className="block font-display text-sm">Slot {slot + 1}</span>
                <span className="text-muted">{game?.saveBrief(slot) ?? "Empty"}</span>
              </button>
            ))}
          </div>
        </section>
      ) : null}

      {game && game.mode !== "title" ? (
        <>
          <header className="pointer-events-none absolute top-0 right-0 left-0 z-10 flex items-start justify-between gap-2 p-2">
            <div
              className="pointer-events-auto max-w-[14rem] rounded border border-border bg-surface/90 px-3 py-2 text-xs"
              style={{ opacity: game.iframe > 0 && Math.floor(game.frame * 10) % 2 === 0 ? 0.45 : 1 }}
            >
              <div className="font-display text-base text-fg">{game.name}</div>
              <div className="text-muted">
                Lv {game.level} {CLASSES[game.cls].label}
              </div>
              <div className="mt-1 h-2 w-full bg-bg">
                <div
                  className="h-2"
                  style={{
                    width: `${Math.max(0, Math.min(100, (game.hp / game.maxHp) * 100))}%`,
                    backgroundImage: "repeating-linear-gradient(90deg, #8f2d2d 0 3px, #c45a4a 3px 4px)",
                  }}
                />
              </div>
              {game.cls === "vampire" ? (
                <div className="mt-1 h-2 w-full bg-bg">
                  <div className="h-2 bg-danger" style={{ width: `${Math.max(0, Math.min(100, (game.blood / 20) * 100))}%` }} />
                </div>
              ) : (
                <>
                  <div className="mt-1 h-2 w-full bg-bg">
                    <div className="h-2 bg-primary" style={{ width: `${Math.max(0, Math.min(100, (game.energy / Math.max(1, game.maxEnergy)) * 100))}%` }} />
                  </div>
                  <div className="mt-1 h-2 w-full bg-bg">
                    <div className="h-2" style={{ width: `${Math.max(0, Math.min(100, (game.stam / 40) * 100))}%`, background: "#c4a574" }} />
                  </div>
                </>
              )}
              {game.companion ? (
                <div className="mt-1 text-muted">
                  {game.companion.name} {game.companion.hp > 0 ? `${game.companion.hp}/${game.companionMax()}` : "down"} · bond {game.bondOf().bond}
                </div>
              ) : null}
              <div className="mt-1 text-muted">
                {game.purse()} · {game.clockLabel()}
              </div>
              {game.curseLine() ? <div className="text-primary" data-testid="curse-line">{game.curseLine()}</div> : null}
              {game.eventLine() ? <div className="text-primary" data-testid="event-line">{game.eventLine()}</div> : null}
              {game.escortName() ? <div className="text-muted" data-testid="escort-line">{game.escortName()} follows you</div> : null}
              {game.wading ? <div className="text-primary">Swimming · half speed</div> : null}
              {game.sliding ? <div className="text-primary">Ice underfoot</div> : null}
              {game.fishPoints > 0 ? <div className="text-muted">Fish points {game.fishPoints}</div> : null}
              <div className="text-muted">{game.seasonName()}</div>
              <div className="text-muted" data-testid="season-line">{game.seasonLine()}</div>
              <div className="mt-1 flex gap-1 text-[10px]">
                <span className="rounded border border-border px-1">{game.phase === "night" ? "Night" : "Day"}</span>
                <span className="rounded border border-border px-1">WX {game.weatherLabel()}</span>
              </div>
              <button
                type="button"
                className="mt-2 h-8 w-full rounded border border-primary bg-bg text-xs"
                onPointerDown={(e) => {
                  unlock();
                  (e.currentTarget as HTMLButtonElement).dataset.down = String(performance.now());
                }}
                onPointerUp={(e) => {
                  const started = Number((e.currentTarget as HTMLButtonElement).dataset.down || 0);
                  if (performance.now() - started < 350) return;
                  game.togglePause();
                  bump();
                }}
              >
                {game.mode === "pause" ? "Resume" : "Pause"}
              </button>
            </div>
            <div className="pointer-events-auto max-w-[13rem] rounded border border-border bg-surface/90 px-3 py-2 text-xs text-muted">
              <div>{game.combatLog ? game.logLine : ""}</div>
              <div className="mt-1">{game.questLine()}</div>
            </div>
          </header>

          {game.mode !== "map" ? (
            <canvas
              ref={miniRef}
              width={96}
              height={96}
              className={`absolute z-10 touch-none border border-border bg-bg ${pip ? "h-6 w-6" : "h-24 w-24"}`}
              style={{ left: miniAt.x, top: miniAt.y, imageRendering: "pixelated" }}
              onPointerDown={(e) => {
                const now = performance.now();
                if (now - miniTap.current < 280) setPip((v) => !v);
                miniTap.current = now;
                drag.current = { id: e.pointerId, dx: e.clientX - miniAt.x, dy: e.clientY - miniAt.y };
                (e.target as HTMLElement).setPointerCapture(e.pointerId);
              }}
              onPointerMove={(e) => {
                if (!drag.current || drag.current.id !== e.pointerId) return;
                setMiniAt({ x: e.clientX - drag.current.dx, y: e.clientY - drag.current.dy });
              }}
              onPointerUp={() => {
                drag.current = null;
              }}
            />
          ) : null}

          <div className="absolute top-28 right-2 z-10 flex flex-col gap-1">
            {Object.values(game.equip)
              .filter((it) => it?.active)
              .slice(0, 4)
              .map((it) => (
                <button
                  key={it!.uid}
                  type="button"
                  className="h-8 w-16 rounded border border-border bg-surface text-[10px]"
                  onPointerDown={() => {
                    unlock();
                    game.castRail(it!.active ?? "");
                    bump();
                  }}
                >
                  {it!.active}
                </button>
              ))}
          </div>

          {game.fallen > 0 ? (
            <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/75 px-6 text-center">
              <p className="font-display text-2xl text-fg">You drop. The ash is patient.</p>
            </div>
          ) : null}

          <button
            type="button"
            aria-label={game.mapId === "camp" ? "Break camp" : "Pitch camp"}
            className="absolute bottom-36 left-3 z-10 h-12 w-12 border border-border bg-surface"
            style={{ imageRendering: "pixelated" }}
            onPointerDown={() => {
              unlock();
              game.camp();
              bump();
            }}
          >
            <svg viewBox="0 0 16 16" className="h-8 w-8">
              <rect width="16" height="16" fill="#1c1814" />
              <rect x="2" y="11" width="12" height="2" fill="#4a3020" />
              <rect x="3" y="8" width="2" height="3" fill="#6a3c28" />
              <rect x="5" y="6" width="2" height="5" fill="#6a3c28" />
              <rect x="7" y="4" width="2" height="7" fill="#c4a574" />
              <rect x="9" y="6" width="2" height="5" fill="#6a3c28" />
              <rect x="11" y="8" width="2" height="3" fill="#6a3c28" />
              <rect x="7" y="12" width="2" height="2" fill="#e07a2f" />
              <rect x="6" y="13" width="4" height="1" fill="#f0c080" />
            </svg>
          </button>

          <div className="absolute right-3 bottom-3 z-10 flex flex-col items-end gap-2">
            <div className="flex max-w-[220px] flex-wrap justify-end gap-1">
              {game.specials.slice(0, 4).map((s) => (
                <button
                  key={s}
                  type="button"
                  className="h-10 max-w-16 rounded border border-border bg-surface px-1 text-[10px] leading-tight"
                  onPointerDown={() => {
                    unlock();
                    game.castKnown(s);
                    bump();
                  }}
                >
                  {s}
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                className="h-12 w-14 rounded border border-border bg-surface text-xs"
                onPointerDown={() => {
                  unlock();
                  game.whirl();
                  bump();
                }}
              >
                Whirl
              </button>
              <button
                type="button"
                className="h-12 w-14 rounded border border-border bg-surface text-xs"
                onPointerDown={() => {
                  unlock();
                  game.smite();
                  bump();
                }}
              >
                Smite
              </button>
            </div>
            <button
              type="button"
              className="h-16 w-16 rounded-full border border-primary bg-surface text-sm"
              onPointerDown={(e) => {
                unlock();
                (e.currentTarget as HTMLButtonElement).dataset.down = String(performance.now());
              }}
              onPointerUp={(e) => {
                const started = Number((e.currentTarget as HTMLButtonElement).dataset.down || 0);
                const held = performance.now() - started;
                if (held >= 350) game.interact();
                else game.slash();
                bump();
              }}
            >
              Main
            </button>
            <div className="flex gap-2">
              <button
                type="button"
                aria-disabled={game.potionsCorked()}
                data-testid="pot-hp"
                className={`h-10 w-14 rounded-full border border-border bg-surface text-[10px] ${game.potionsCorked() ? "opacity-40" : ""}`}
                onPointerDown={(e) => {
                  (e.currentTarget as HTMLButtonElement).dataset.down = String(performance.now());
                }}
                onPointerUp={(e) => {
                  const started = Number((e.currentTarget as HTMLButtonElement).dataset.down || 0);
                  if (performance.now() - started >= 250) {
                    game.usePotion();
                    bump();
                  }
                }}
              >
                {game.potionsCorked() ? "Corked" : `HP ${game.potHp}`}
              </button>
              <button
                type="button"
                aria-disabled={game.potionsCorked()}
                className={`h-10 w-14 rounded-full border border-border bg-surface text-[10px] ${game.potionsCorked() ? "opacity-40" : "opacity-60"}`}
                onPointerDown={(e) => {
                  (e.currentTarget as HTMLButtonElement).dataset.down = String(performance.now());
                }}
                onPointerUp={(e) => {
                  const started = Number((e.currentTarget as HTMLButtonElement).dataset.down || 0);
                  if (performance.now() - started < 250) return;
                  if (game.cls === "vampire") return;
                  game.usePotion();
                  bump();
                }}
              >
                {game.cls === "vampire" ? "Blood" : `MP ${game.potMana}`}
              </button>
            </div>
          </div>

          <div
            className="absolute bottom-4 left-3 z-10 h-28 w-28 touch-none rounded-full border border-border bg-surface/70"
            onPointerDown={(e) => {
              unlock();
              stick.current = { id: e.pointerId, ox: e.clientX, oy: e.clientY };
              (e.target as HTMLElement).setPointerCapture(e.pointerId);
            }}
            onPointerMove={(e) => {
              if (stick.current.id !== e.pointerId) return;
              const dx = e.clientX - stick.current.ox;
              const dy = e.clientY - stick.current.oy;
              const m = Math.hypot(dx, dy) || 1;
              const cap = 42;
              if (m < cap * 0.14) {
                game.stickX = 0;
                game.stickY = 0;
                game.running = false;
                return;
              }
              const c = Math.min(1, m / cap);
              game.stickX = (dx / m) * c;
              game.stickY = (dy / m) * c;
              game.running = m > cap * 0.82;
            }}
            onPointerUp={(e) => {
              if (stick.current.id !== e.pointerId) return;
              stick.current.id = -1;
              game.stickX = 0;
              game.stickY = 0;
              game.running = false;
            }}
          />

          {game.mode === "talk" && game.talk ? (
            <Panel>
              <h2 className="font-display text-xl">{game.talk.who}</h2>
              <p className="text-sm">{game.talk.text}</p>
              {game.talk.role === "companion" && game.companion ? <p className="text-xs text-muted" data-testid="bond-meter">{game.bondLine()}</p> : null}
              <div className="flex flex-wrap gap-2">
                <button type="button" className="rounded bg-primary px-3 py-2 text-bg" onClick={() => { game.acceptService(); bump(); }}>
                  Continue
                </button>
                {game.choices().map((c) => (
                  <button key={c.id} type="button" className="rounded border border-primary px-3 py-2" onClick={() => { game.choose(c.id); bump(); }}>
                    {c.label}
                  </button>
                ))}
                {game.cls === "vampire" && game.talk.role === "folk" ? (
                  <button type="button" className="rounded border border-border px-3 py-2" onClick={() => { game.feed(); bump(); }}>
                    Feed
                  </button>
                ) : null}
                {game.talk.role === "guard" ? (
                  <button type="button" className="rounded border border-danger px-3 py-2" onClick={() => { game.attackGuard(); bump(); }}>
                    Draw steel
                  </button>
                ) : null}
                <button type="button" className="rounded border border-border px-3 py-2" onClick={() => { game.mode = "play"; game.talk = null; bump(); }}>
                  Leave
                </button>
              </div>
            </Panel>
          ) : null}

          {game.mode === "shop" ? (
            <Panel>
              <h2 className="font-display text-xl">
                {game.shopRole.startsWith("stall:") ? game.stallName() : game.shopRole === "guild" ? "Guild" : game.shopRole === "mystic" ? "Moon and Star" : game.shopRole === "alchemist" ? "The Cauldron" : game.shopRole === "fisher" ? "The Drowned Hook" : "Counter"}
              </h2>
              {game.shopRole === "guild" ? (
                <div className="flex flex-col gap-2">
                  {CLASSES[game.cls].specials.map((s) => (
                    <button key={s} type="button" className="rounded border border-border px-3 py-2 text-left text-sm" onClick={() => { game.learn(s); bump(); }}>
                      {s}
                      {game.specials.includes(s) ? ` · rank ${(game.ranks[s] ?? 0) + 1}` : ""}
                    </button>
                  ))}
                  {game.bestiary.length >= 20 ? (
                    <button type="button" className="rounded border border-border px-3 py-2 text-left text-sm" onClick={() => { game.turnInPage(); bump(); }}>
                      Turn in the page · 40s
                    </button>
                  ) : null}
                  <div className="flex flex-wrap gap-2">
                    {(["str", "dex", "int", "sta", "agi", "fort"] as const).map((s) => (
                      <button key={s} type="button" className="rounded border border-border px-2 py-2 text-xs" onClick={() => { game.trainStat(s); bump(); }}>
                        {s.toUpperCase()} {game[s]} · 20s
                      </button>
                    ))}
                  </div>
                  <button type="button" className="rounded border border-border px-3 py-2 text-sm" onClick={() => { game.respec(); bump(); }}>
                    Undo arts · 25s
                  </button>
                </div>
              ) : game.shopRole === "fisher" ? (
                <div className="flex flex-col gap-2">
                  <p className="text-sm text-muted">Fish points {game.fishPoints}. Silver buys the pole and the bait. The catch buys the rest.</p>
                  {game.stock.map((it) => (
                    <button key={it.uid} type="button" className="rounded border border-border px-3 py-2 text-left text-sm" onClick={() => { game.buy(it); bump(); }}>
                      {it.name}
                      {it.kind === "bait" ? ` · ×${it.stack ?? 1}` : ""} · {game.priceOf(it)}s
                    </button>
                  ))}
                  <button type="button" className="rounded border border-border px-3 py-2 text-sm" onClick={() => { game.tradeFish(); bump(); }}>
                    Trade the catch
                  </button>
                  <button type="button" className="rounded border border-primary px-3 py-2 text-left text-sm" onClick={() => { game.buyFishReward("boots"); bump(); }}>
                    Bog-step boots · walk the water · 40
                  </button>
                  <button type="button" className="rounded border border-border px-3 py-2 text-left text-sm" onClick={() => { game.buyFishReward("charm"); bump(); }}>
                    Gill charm · 24
                  </button>
                  <button type="button" className="rounded border border-border px-3 py-2 text-left text-sm" onClick={() => { game.buyFishReward("ring"); bump(); }}>
                    Hooked ring · 18
                  </button>
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  {game.stock.map((it) => (
                    <button key={it.uid} type="button" className="rounded border border-border px-3 py-2 text-left text-sm" onClick={() => { game.buy(it); bump(); }}>
                      {it.name} · {rankWord(it.rank)} · {game.priceOf(it)}s
                    </button>
                  ))}
                  <button type="button" className="rounded border border-border px-3 py-2 text-sm" onClick={() => { game.sellJunk(); bump(); }}>
                    Sell all junk
                  </button>
                </div>
              )}
              <button type="button" className="rounded border border-border px-3 py-2" onClick={() => { game.mode = "play"; bump(); }}>
                Close
              </button>
            </Panel>
          ) : null}

          {game.mode === "casino" ? (
            <Panel>
              <h2 className="font-display text-xl">Roulette</h2>
              <p className="text-sm text-muted">Red or black pays 1:1. Green pays 14:1. Points {game.points}. Stake {Math.min(stake, Math.max(0, game.coin))}s.</p>
              <input type="range" min={1} max={Math.max(1, game.coin)} value={Math.min(stake, Math.max(1, game.coin))} onChange={(e) => setStake(Number(e.target.value))} />
              <div className="flex gap-2">
                {(["red", "black", "green"] as const).map((c) => (
                  <button key={c} type="button" className="rounded border border-border px-3 py-2" onClick={() => { game.bet(c, Math.min(stake, game.coin)); bump(); }}>
                    {c}
                  </button>
                ))}
              </div>
              <button type="button" className="rounded border border-border px-3 py-2 text-sm" onClick={() => { game.spendPoints(); bump(); }}>
                Points shelf · 20
              </button>
              {game.decorOffers().length ? (
                <div className="flex flex-col gap-1" data-testid="home-shelf">
                  <p className="text-xs text-muted">Home shelf · carried to your croft{game.ownedHome ? "" : " (needs the croft deed)"}</p>
                  <div className="flex flex-wrap gap-1">
                    {game.decorOffers().map((o) => (
                      <button key={o.id} type="button" data-testid={`decor-${o.id.replace(":", "-")}`} className="rounded border border-border px-2 py-1 text-xs" onClick={() => { game.buyDecor(o.id); bump(); }}>
                        {o.label}
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}
              <button type="button" className="rounded border border-border px-3 py-2" onClick={() => { game.mode = "play"; bump(); }}>
                Stand
              </button>
            </Panel>
          ) : null}

          {game.mode === "bank" ? (
            <Panel>
              <h2 className="font-display text-xl">Bank</h2>
              <p className="text-sm text-muted">No fee at this counter. Purse {game.coin}s · drawer {game.bank}s.</p>
              <input type="range" min={1} max={Math.max(1, game.coin + game.bank)} value={bankN} onChange={(e) => setBankN(Number(e.target.value))} />
              <div className="flex gap-2">
                <button type="button" className="rounded border border-border px-3 py-2" onClick={() => { game.deposit(bankN); bump(); }}>
                  Deposit
                </button>
                <button type="button" className="rounded border border-border px-3 py-2" onClick={() => { game.withdraw(bankN); bump(); }}>
                  Withdraw
                </button>
              </div>
              <button type="button" className="rounded border border-primary px-3 py-2 text-sm" onClick={() => { game.buyHome(); bump(); }}>
                {game.ownedHome ? "Croft deed held" : "Buy the south croft · 80s"}
              </button>
              <p className="text-xs text-muted">Pack into the drawer. Junk, bait, and fish stack. Gear keeps its own slot.</p>
              <ul className="max-h-28 overflow-auto text-sm">
                {game.inv.map((it) => (
                  <li key={it.uid} className="flex items-center justify-between gap-2 border-b border-border py-1">
                    <span>{it.name}{it.stack ? ` x${it.stack}` : ""}</span>
                    <button type="button" className="rounded border border-border px-2 py-1 text-xs" onClick={() => { game.stash(it); bump(); }}>
                      Stash
                    </button>
                  </li>
                ))}
              </ul>
              <ul className="max-h-28 overflow-auto text-sm">
                {game.vault.map((it) => (
                  <li key={it.uid} className="flex items-center justify-between gap-2 border-b border-border py-1">
                    <span>{it.name}{it.stack ? ` x${it.stack}` : ""}</span>
                    <button type="button" className="rounded border border-border px-2 py-1 text-xs" onClick={() => { game.takeVault(it.uid); bump(); }}>
                      Take
                    </button>
                  </li>
                ))}
              </ul>
              <button type="button" className="rounded border border-border px-3 py-2" onClick={() => { game.mode = "play"; bump(); }}>
                Leave
              </button>
            </Panel>
          ) : null}

          {game.mode === "zeppelin" ? (
            <Panel>
              <h2 className="font-display text-xl">Zeppelin</h2>
              <p className="text-sm text-muted">Town to a deep dungeon you have already entered. Not the grave. Not the hearth.</p>
              {game.listZeppelin().length === 0 ? <p className="text-sm">The tower has nowhere to go yet.</p> : null}
              {game.listZeppelin().map((d) => (
                <button key={d.id} type="button" className="rounded border border-border px-3 py-2 text-left text-sm" onClick={() => { game.zeppelinTo(d.id); bump(); }}>
                  {d.name}
                </button>
              ))}
              <button type="button" className="rounded border border-border px-3 py-2" onClick={() => { game.mode = "play"; bump(); }}>
                Stay
              </button>
            </Panel>
          ) : null}

          {game.mode === "battle" && game.battle ? (
            <Panel>
              {game.combatLog ? game.battle.log.slice(0, 2).map((line, i) => <p key={i} className="text-sm text-muted">{line}</p>) : null}
              {game.battle.turn === "act" ? (
                <p className="text-sm">The turn plays out.</p>
              ) : game.battle.turn === "ally" && game.companion ? (
                <div className="flex flex-wrap gap-2">
                  <p className="w-full text-sm">{game.companion.name}'s turn. They keep their own arts.</p>
                  <button type="button" className="rounded bg-primary px-3 py-2 text-bg" onClick={() => { game.command("strike"); bump(); }}>
                    Strike
                  </button>
                  <button type="button" className="rounded border border-border px-3 py-2" onClick={() => { game.command("cleave"); bump(); }}>
                    Cleave
                  </button>
                  <button type="button" className="rounded border border-border px-3 py-2" onClick={() => { game.command("ranged"); bump(); }}>
                    Ranged
                  </button>
                  {game.allyOptions().map((s) => (
                    <button key={s} type="button" className="rounded border border-border px-3 py-2" onClick={() => { game.command(s); bump(); }}>
                      {s}
                    </button>
                  ))}
                  <button type="button" className="rounded border border-border px-3 py-2" onClick={() => { game.command("guard"); bump(); }}>
                    Guard
                  </button>
                </div>
              ) : (
              <div className="flex flex-wrap gap-2">
                <button type="button" className="rounded bg-primary px-3 py-2 text-bg" onClick={() => { game.command("strike"); bump(); }}>
                  Strike
                </button>
                <button type="button" className="rounded border border-border px-3 py-2" onClick={() => { game.command("cleave"); bump(); }}>
                  Cleave
                </button>
                <button type="button" className="rounded border border-border px-3 py-2" onClick={() => { game.command("ranged"); bump(); }}>
                  Ranged
                </button>
                {game.specials.map((s) => (
                  <button key={s} type="button" className="rounded border border-border px-3 py-2" onClick={() => { game.command(s); bump(); }}>
                    {s}
                  </button>
                ))}
                {game.equip.off?.active ? (
                  <button type="button" className="rounded border border-primary px-3 py-2" onClick={() => { game.command(game.equip.off?.active ?? ""); bump(); }}>
                    {game.equip.off.active}
                  </button>
                ) : null}
                {game.battle.phylactery === "whole" ? (
                  <button type="button" className="rounded border border-primary px-3 py-2" onClick={() => { game.command("Phylactery"); bump(); }}>
                    Break phylactery
                  </button>
                ) : null}
                {game.battle.goblin ? (
                  <>
                    <button type="button" className="rounded border border-border px-3 py-2" onClick={() => { game.command("drive"); bump(); }}>
                      Drive off
                    </button>
                    <button type="button" className="rounded border border-border px-3 py-2" onClick={() => { game.command("rummage"); bump(); }}>
                      Let it rummage
                    </button>
                  </>
                ) : null}
                <button type="button" className="rounded border border-border px-3 py-2" onClick={() => { game.command("potion"); bump(); }}>
                  Draught
                </button>
                <button type="button" className="rounded border border-border px-3 py-2" onClick={() => { game.command("flee"); bump(); }}>
                  Flee
                </button>
              </div>
              )}
            </Panel>
          ) : null}

          {game.mode === "fish" ? (
            <Panel>
              <h2 className="font-display text-xl">Cast</h2>
              <p className="text-sm">{game.fishLine}</p>
              <div className="relative h-4 w-full bg-bg">
                <div className="absolute top-0 h-4 bg-primary/50" style={{ left: `${game.fishZone}%`, width: "22%" }} />
                <div className="absolute top-0 h-4 w-1 bg-fg" style={{ left: `${game.fishMark}%` }} />
              </div>
              <button type="button" className="rounded bg-primary px-3 py-2 text-bg" onClick={() => { game.reel(); bump(); }}>
                Reel
              </button>
              <button type="button" className="rounded border border-border px-3 py-2" onClick={() => { game.mode = "play"; bump(); }}>
                Cut the line
              </button>
            </Panel>
          ) : null}

          {game.mode === "pause" ? (
            <Panel>
              <h2 className="font-display text-xl">Pause</h2>
              <div className="flex gap-2">
                {(["pack", "guide", "pad"] as const).map((tab) => (
                  <button key={tab} type="button" className={`rounded border px-2 py-1 text-xs ${pauseTab === tab ? "border-primary" : "border-border"}`} onClick={() => setPauseTab(tab)}>
                    {tab === "pack" ? "Pack" : tab === "guide" ? "Guide" : "Controller"}
                  </button>
                ))}
              </div>
              {pauseTab === "guide" ? (
                <div className="text-sm text-muted">
                  <p>{keyLabel(game.keyBind.up)}{keyLabel(game.keyBind.left)}{keyLabel(game.keyBind.down)}{keyLabel(game.keyBind.right)} or the arrows walk. The stick does the same. Tap the ground, or drag a finger, and you follow.</p>
                  <p>Pinch in to step back. Spread two fingers to step closer. The wheel does that on a computer.</p>
                  <p>{keyLabel(game.keyBind.use)} uses a door, a chest, or a person. {keyLabel(game.keyBind.area)} is a wide swing. {keyLabel(game.keyBind.far)} is a far shot. {keyLabel(game.keyBind.drink)} drinks.</p>
                  <p>{keyLabel(game.keyBind.pause)} pauses, and so does the Pause button. A fight or a cast waits and comes back. {keyLabel(game.keyBind.map)} opens the map. A paired pad uses the same actions. Remap them under Controller.</p>
                  <p>Town stays twilight. A lit door is a threshold: step through it and the room is its own place, and the door behind you leads back out. The clock still has a day and a night, each fifteen minutes. A vampire is served only at night.</p>
                  <p>Weather turns on its own: still air, light rain, hard rain, a thunderstorm, then snow. Each holds for a few minutes. Stone roofs keep it off you. Thunder is a low rumble, not a crack.</p>
                  <p>Roads are quieter than the brush. Do not cross the east bridge at level 1. The tent button, above the stick, pitches camp only in the wild. The south mark breaks it.</p>
                  <p>Three save slots wait on the title. One companion walks with you. The living hire from level 10. A vampire bites at night instead.</p>
                  <p>Open water is a swim at half speed. Ice slides. Bog-step boots walk the water. The Drowned Hook, on the south street, sells a pole and creepy bait. Use beside water, then reel. Trade the catch there for points.</p>
                </div>
              ) : pauseTab === "pad" ? (
                <div className="text-sm">
                  <p className="text-muted">{game.padName ? `Pad: ${game.padName}` : "No pad yet. Pair a Bluetooth controller, then press a button."}</p>
                  <p className="text-xs text-muted">Standard layout: stick and d-pad move, A uses, X is area, Y is far, LB drinks, Start pauses, Back opens the map. Tap a row, then press a key or a pad button.</p>
                  <div className="flex flex-col gap-1">
                    {ACTS.map((act) => (
                      <button
                        key={act}
                        type="button"
                        className={`rounded border px-2 py-1 text-left text-xs ${game.captureAct === act ? "border-primary" : "border-border"}`}
                        onClick={() => {
                          game.captureAct = act;
                          bump();
                        }}
                      >
                        {act} · {keyLabel(game.keyBind[act])} · {padLabel(game.padBind[act])}
                        {game.captureAct === act ? " · press a key or button" : ""}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <>
              <p className="text-sm text-muted">
                {game.purse()} · pack {game.inv.length}/20 · STR {game.str} DEX {game.dex} INT {game.int} STA {game.sta} AGI {game.agi} FOR {game.fort}
              </p>
              <p className="text-xs text-muted">ATK {game.atk} · AC {game.ac} · known {game.bestiary.length} kinds</p>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <p className="text-muted">{game.name}</p>
                  {(["head", "chest", "legs", "feet", "main", "off", "ring", "neck"] as const).map((slot) => {
                    const it = game.equip[slot];
                    const held = slot === "off" && game.equip.main?.hands === 2;
                    return (
                      <button
                        key={slot}
                        type="button"
                        disabled={!it || held}
                        className="mt-1 block w-full rounded border border-border px-2 py-1 text-left disabled:opacity-60"
                        onClick={() => {
                          game.unequipItem(slot);
                          bump();
                        }}
                      >
                        {slot}: {held ? "both hands" : it ? it.name : "empty"}
                      </button>
                    );
                  })}
                </div>
                <div>
                  <p className="text-muted">{game.companion ? game.companion.name : "No companion"}</p>
                  {game.companion
                    ? (["head", "chest", "legs", "feet", "main", "off", "ring", "neck"] as const).map((slot) => {
                        const it = game.companion?.equip[slot];
                        const held = slot === "off" && game.companion?.equip.main?.hands === 2;
                        return (
                          <button
                            key={slot}
                            type="button"
                            disabled={!it || held}
                            className="mt-1 block w-full rounded border border-border px-2 py-1 text-left disabled:opacity-60"
                            onClick={() => {
                              game.unequipCompanion(slot);
                              bump();
                            }}
                          >
                            {slot}: {held ? "both hands" : it ? it.name : "empty"}
                          </button>
                        );
                      })
                    : null}
                </div>
              </div>
              <ul className="max-h-36 overflow-auto text-sm">
                {game.inv.map((it) => (
                  <li key={it.uid} className="flex items-center justify-between gap-2 border-b border-border py-1">
                    <span>
                      {it.name} · {it.kind} {rankWord(it.rank)}
                      {it.atk ? ` atk ${it.atk}` : ""}
                      {it.ac ? ` ac ${it.ac}` : ""}
                      {it.gem ? ` · ${it.gem}` : ""}
                      {it.set ? ` · ${it.set}` : ""}
                      {it.stack ? ` x${it.stack}` : ""}
                    </span>
                    <span className="flex gap-1">
                      {it.slot ? (
                        <>
                          <button type="button" className="rounded border border-border px-2 py-1 text-xs" onClick={() => { game.equipItem(it); bump(); }}>
                            Wear
                          </button>
                          {(it.special === "Socket" || it.rank >= 4) && (it.kind === "weapon" || it.kind === "armor" || it.kind === "jewel") ? (
                            <button type="button" className="rounded border border-border px-2 py-1 text-xs" onClick={() => { game.socketGem(it); bump(); }}>
                              Socket
                            </button>
                          ) : null}
                          {game.companion ? (
                            <button type="button" className="rounded border border-border px-2 py-1 text-xs" onClick={() => { game.equipCompanion(it); bump(); }}>
                              Give
                            </button>
                          ) : null}
                        </>
                      ) : null}
                      {it.kind !== "potion" ? (
                        <button type="button" className="rounded border border-border px-2 py-1 text-xs" onClick={() => { game.sell(it); bump(); }}>
                          Sell
                        </button>
                      ) : null}
                    </span>
                  </li>
                ))}
              </ul>
              {game.companion ? (
                <div className="text-sm">
                  <p className="text-muted">
                    {game.companion.name} · {game.companion.hp}/{game.companionMax()} · {game.allyOptions().join(", ") || "no art yet"}
                  </p>
                  <button type="button" className="mt-1 rounded border border-border px-3 py-2 text-sm" onClick={() => { game.releaseCompanion(); bump(); }}>
                    {game.cls === "vampire" ? "They are bound" : "Release companion"}
                  </button>
                </div>
              ) : (
                <p className="text-xs text-muted">No companion. Level 10 opens the church, the cauldron, and the moon shop. A vampire bites instead.</p>
              )}
              <div className="flex flex-wrap gap-2">
                {[0, 1, 2].map((s) => (
                  <button key={s} type="button" className="rounded border border-border px-3 py-2 text-sm" onClick={() => { game.saveSlot(s); bump(); }}>
                    Save {s + 1}
                  </button>
                ))}
              </div>
              <div className="flex flex-wrap gap-2">
                <button type="button" className="rounded border border-border px-3 py-2 text-sm" onClick={() => { game.camp(); bump(); }}>
                  Pitch camp
                </button>
                <button type="button" className="rounded border border-border px-3 py-2 text-sm" onClick={() => { game.openPortal(); bump(); }}>
                  Town portal
                </button>
                <button type="button" className="rounded border border-border px-3 py-2 text-sm" onClick={() => { game.sellJunk(); bump(); }}>
                  Sell junk
                </button>
              </div>
              <label className="text-sm text-muted">
                Music
                <input type="range" min={0} max={100} defaultValue={70} onChange={(e) => audioRef.current?.setMusic(Number(e.target.value) / 100)} />
              </label>
              <label className="text-sm text-muted">
                Effects
                <input type="range" min={0} max={100} defaultValue={80} onChange={(e) => audioRef.current?.setSfx(Number(e.target.value) / 100)} />
              </label>
              <label className="text-sm text-muted">
                Screen shake
                <input type="range" min={0} max={100} defaultValue={65} onChange={(e) => { game.shakeMul = Number(e.target.value) / 100; }} />
              </label>
              <label className="flex items-center gap-2 text-sm text-muted">
                <input type="checkbox" checked={game.combatLog} onChange={(e) => { game.combatLog = e.target.checked; bump(); }} />
                Combat log
              </label>
                </>
              )}
              <button type="button" className="rounded bg-primary px-3 py-2 text-bg" onClick={() => { game.togglePause(); bump(); }}>
                Return
              </button>
            </Panel>
          ) : null}

          {game.mode === "map" ? (
            <button type="button" className="absolute bottom-4 left-1/2 z-10 -translate-x-1/2 rounded bg-primary px-4 py-2 text-bg" onClick={() => { game.mode = "play"; bump(); }}>
              Close map
            </button>
          ) : null}

          {game.mode === "level" ? (
            <Panel>
              <h2 className="font-display text-xl">Level {game.level}</h2>
              <p className="text-sm">Choose an art to learn, or sharpen one you know.</p>
              {game.levelOptions().map((s) => (
                <button key={s.name} type="button" className="rounded border border-border px-3 py-2 text-left" onClick={() => { game.learn(s.name); bump(); }}>
                  {s.sharpen ? `Sharpen ${s.name}` : `Learn ${s.name}`}
                </button>
              ))}
              <button type="button" className="rounded border border-border px-3 py-2" onClick={() => { game.dismissLevel(); bump(); }}>
                Later
              </button>
            </Panel>
          ) : null}

          {game.mode === "crypt" ? (
            <Panel>
              <h2 className="font-display text-xl">Crypt</h2>
              <p className="text-sm">{game.logLine}</p>
              <p className="text-xs text-muted">They rest. You do not. Meditation can still draw a thief. A stake is final.</p>
              <button type="button" className="rounded bg-primary px-3 py-2 text-bg" onClick={() => { game.meditate(); bump(); }}>
                Meditate
              </button>
              {game.companion ? (
                <button type="button" className="rounded border border-danger px-3 py-2" onClick={() => { game.stakeCompanion(); bump(); }}>
                  Stake {game.companion.name}
                </button>
              ) : null}
            </Panel>
          ) : null}

          {game.mode === "dead" ? (
            <Panel>
              <h2 className="font-display text-xl">Fallen</h2>
              <p className="text-sm">{game.logLine}</p>
              <button type="button" className="rounded bg-primary px-3 py-2 text-bg" onClick={() => { game.revive(); bump(); }}>
                Rise
              </button>
            </Panel>
          ) : null}
        </>
      ) : null}
    </main>
  );
}

/** Small canvas bust for one class on the select screen. */
function Portrait({ role }: { role: string }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext("2d");
    if (!ctx) return;
    drawPortrait(ctx, role);
  }, [role]);
  return <canvas ref={ref} width={64} height={80} className="h-20 w-16 shrink-0" />;
}

/** KeyboardEvent.code turned into a short label for the remap list. */
function keyLabel(code: string) {
  if (code.startsWith("Key")) return code.slice(3);
  if (code.startsWith("Digit")) return code.slice(5);
  if (code === "Escape") return "Esc";
  if (code === "Space") return "Space";
  if (code.startsWith("Arrow")) return code.slice(5);
  return code;
}

function padLabel(n: number) {
  return ["A", "B", "X", "Y", "LB", "RB", "LT", "RT", "Back", "Start", "L3", "R3", "Up", "Down", "Left", "Right"][n] ?? String(n);
}

function rankWord(rank: number) {
  return ["", "green", "blue", "purple", "gold", "red"][rank] ?? String(rank);
}

/** The dark card used by talk, shops, and the pause menu. */
function Panel({ children }: { children: ReactNode }) {
  return (
    <section className="absolute top-24 right-3 left-3 z-20 flex max-h-[48%] flex-col gap-2 overflow-auto rounded border border-border bg-surface/95 p-3 md:left-auto md:w-[28rem]">
      {children}
    </section>
  );
}

declare global {
  interface Window {
    __controlsTest?: {
      getX: () => number;
      getY: () => number;
      getYaw: () => number;
      getSpeed: () => number;
      setKeys: (codes: string[]) => void;
      setPos?: (x: number, y: number) => void;
      setTime?: (ms: number) => void;
      use?: () => void;
    };
  }
}
