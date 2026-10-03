/**
 * playtest1l [OWNER-APPROVED EXCEPTION 2026-10-03 09:21 ET: optional bloom glow and scanlines]: Bill asked (2026-10-03
 * 09:21 ET) for "an optional bloom glow and scanline setting" after the combat batch. Layout Two's "No bloom" law keeps
 * holding for the art itself; this is a player setting laid over the finished frame:
 *  - Bloom (Off / Low / High): the bright, saturated glow pixels of the playfield (neon blue cold fire, violet, red, lamps,
 *    spells, telegraph marks) bleed a soft halo. The game canvas itself is never redrawn, so its pixels stay crisp; the
 *    HUD, the minimap and every menu are DOM or their own canvases, above the layer, so they stay dry.
 *  - Scanlines (Off / Subtle / Strong): a CRT row pattern, one row per game pixel (Retro 320x240: 240 rows).
 * The bloom is one small WebGL1 pass: a smoothed copy of the frame at twice the glow size (2D drawImage), a bright-pass
 * into the glow buffer (half the game pixels seen), a separable blur (two passes on Low, three wider ones on High), and
 * the glow alone written to a glow-size canvas (premultiplied: colour g, alpha max(g), which composites as a screen blend)
 * that the browser scales up smoothly over the game canvas. The scanlines are a static 1 px wide column (one alpha per
 * device row), redrawn only when the size or the setting changes. Without WebGL bloom stays off and the scanlines still
 * work; a lost context hides the glow.
 * Looks only: nothing in the sim reads this, and the settings live in their own record (gravewake-postfx-v1).
 */
import type { PresetId, View } from "./screen";

export type BloomId = "off" | "low" | "high";
export type ScanId = "off" | "subtle" | "strong";
export const BLOOM_IDS: BloomId[] = ["off", "low", "high"];
export const SCAN_IDS: ScanId[] = ["off", "subtle", "strong"];
export const BLOOM_LABEL: Record<BloomId, string> = { off: "Off", low: "Low", high: "High" };
export const SCAN_LABEL: Record<ScanId, string> = { off: "Off", subtle: "Subtle", strong: "Strong" };

export interface FxSettings {
  /** Null: never picked, so the device default applies (see deviceBloom). */
  bloom: BloomId | null;
  scan: ScanId;
  /** The fps guard turned the default bloom off on this device (a player's own pick is never touched). */
  autoOff: boolean;
}
export const FX_KEY = "gravewake-postfx-v1";
export const DEFAULT_FX: FxSettings = { bloom: null, scan: "off", autoOff: false };

export const BLOOM = {
  low: { strength: 1.3, threshold: 0.55, passes: 2, spread: 1 },
  high: { strength: 2, threshold: 0.45, passes: 3, spread: 1.25 },
  /** Brightness knee above the threshold, and the saturation ramp: grey and white pixels (text, bone, snow) bloom little. */
  knee: 0.3,
  satLo: 0.3,
  satHi: 0.7,
  satFloor: 0.1,
  /** The glow buffer: half the game pixels seen, at most maxW wide. */
  scale: 0.5,
  maxW: 480,
};
export const SCAN = {
  /** Each game row darkens toward its foot: alpha = dark·q^pow (q 0 at the row's top, 1 at its foot). */
  subtle: { dark: 0.32, pow: 3 },
  strong: { dark: 0.55, pow: 2 },
  /** The column is one alpha per device row, at most this many rows (the browser stretches it past that). */
  maxRows: 4320,
};
/** The glow refresh: every frame while it costs at most `fast` ms (a smoothed average), else every second frame (a slow
 * device keeps half the cost; the halo is then one frame old at most). */
export const REFRESH = { fast: 4, ease: 0.1 };
/** The fps guard (the device default only): a 4 s window under 40 fps tries 4 s without; 20% faster turns it off. */
export const GUARD = { warm: 3000, window: 4000, floor: 40, gain: 1.2, rest: 60000, gap: 250 };

/**
 * The default for a player who never picked: Low on a capable device, Off where it would cost frames. Measured at 6x CPU
 * throttle (qa/playtest1l/PROGRESS.md): Phone landscape loses the most, so the Phone preset (and Auto on a touch screen,
 * which resolves to it) starts Off; so do a software renderer, two cores or fewer, 2 GB or less, and a device where the
 * fps guard already caught the bloom costing frames.
 */
export interface FxCaps {
  gl: boolean;
  soft: boolean;
  cores: number;
  memory: number | null;
}
export const PHONE_BLOOM: BloomId = "off";
export function deviceBloom(caps: FxCaps, eff: PresetId, autoOff = false): BloomId {
  if (!caps.gl || caps.soft || autoOff) return "off";
  if (caps.cores > 0 && caps.cores <= 2) return "off";
  if (caps.memory !== null && caps.memory <= 2) return "off";
  if (eff === "phone") return PHONE_BLOOM;
  return "low";
}
/** The bloom in force: the player's pick, else the device default; never without WebGL. */
export function effectiveBloom(s: FxSettings, caps: FxCaps, eff: PresetId): BloomId {
  if (!caps.gl) return "off";
  return s.bloom ?? deviceBloom(caps, eff, s.autoOff);
}

/** Read the saved record. Missing (every save from before playtest1l), unknown or broken values fall back field by field. */
export function parseFx(raw: string | null | undefined): FxSettings {
  let o: Record<string, unknown> = {};
  try {
    const v = raw ? JSON.parse(raw) : null;
    if (v && typeof v === "object" && !Array.isArray(v)) o = v as Record<string, unknown>;
  } catch {
    o = {};
  }
  const bloom = BLOOM_IDS.includes(o.bloom as BloomId) ? (o.bloom as BloomId) : o.bloom === true ? "low" : o.bloom === false ? "off" : null;
  const scan = SCAN_IDS.includes(o.scan as ScanId) ? (o.scan as ScanId) : o.scan === true ? "subtle" : "off";
  return { bloom, scan, autoOff: o.autoOff === true };
}
export function loadFx(): FxSettings {
  try {
    return parseFx(localStorage.getItem(FX_KEY));
  } catch {
    return { ...DEFAULT_FX };
  }
}
export function saveFx(s: FxSettings) {
  try {
    localStorage.setItem(FX_KEY, JSON.stringify(s));
  } catch {
    /* private mode: the setting still applies for this visit */
  }
}

/* ---------- The settings store (the options panel and the frame loop both read it) ---------- */

let cur: FxSettings | null = null;
const subs = new Set<() => void>();
export const fxStore = {
  get(): FxSettings {
    return (cur ??= loadFx());
  },
  set(patch: Partial<FxSettings>) {
    cur = { ...fxStore.get(), ...patch };
    saveFx(cur);
    for (const f of subs) f();
  },
  /** Re-read the record (a test, or another tab). */
  reload() {
    cur = loadFx();
    for (const f of subs) f();
  },
  subscribe(f: () => void) {
    subs.add(f);
    return () => {
      subs.delete(f);
    };
  },
};

/* ---------- The fps guard ---------- */

export interface Guard {
  phase: "watch" | "trial" | "rest" | "done";
  t0: number;
  n: number;
  last: number;
  /** fps measured with the bloom on (the trial compares against it). */
  on: number;
  until: number;
}
export const newGuard = (now: number): Guard => ({ phase: "watch", t0: now + GUARD.warm, n: 0, last: now, on: 0, until: 0 });
/**
 * One frame of the guard. "keep": bloom as it is; "trial": hold it off for this window; "drop": it costs frames, turn it
 * off. A gap (a hidden tab, a menu, the title) restarts the window, so only steady play is measured.
 */
export function guardStep(g: Guard, now: number): "keep" | "trial" | "drop" {
  if (g.phase === "done") return "drop";
  if (now - g.last > GUARD.gap) {
    g.t0 = Math.max(g.t0, now);
    g.n = 0;
  }
  g.last = now;
  if (g.phase === "rest") {
    if (now < g.until) return "keep";
    g.phase = "watch";
    g.t0 = now;
    g.n = 0;
  }
  const held = g.phase === "trial" ? "trial" : "keep";
  if (now < g.t0) return held;
  g.n++;
  if (now - g.t0 < GUARD.window) return held;
  const fps = (g.n * 1000) / (now - g.t0);
  g.t0 = now;
  g.n = 0;
  if (g.phase === "watch") {
    if (fps >= GUARD.floor) return "keep";
    g.phase = "trial";
    g.on = fps;
    return "trial";
  }
  if (fps > g.on * GUARD.gain) {
    g.phase = "done";
    return "drop";
  }
  g.phase = "rest";
  g.until = now + GUARD.rest;
  return "keep";
}

/* ---------- The pass ---------- */

const SOFT = /swiftshader|llvmpipe|softpipe|software|basic render/i;

const VS = "attribute vec2 p;varying vec2 uv;void main(){uv=p*0.5+0.5;gl_Position=vec4(p,0.0,1.0);}";
const FS_EXTRACT = `precision mediump float;varying vec2 uv;uniform sampler2D src;uniform vec2 tx;uniform float thr;
vec3 pick(vec2 o){vec3 c=texture2D(src,uv+o).rgb;float mx=max(c.r,max(c.g,c.b));float mn=min(c.r,min(c.g,c.b));
float sat=mx>0.001?(mx-mn)/mx:0.0;float w=smoothstep(thr,thr+${BLOOM.knee.toFixed(3)},mx)*mix(${BLOOM.satFloor.toFixed(3)},1.0,smoothstep(${BLOOM.satLo.toFixed(3)},${BLOOM.satHi.toFixed(3)},sat));return c*w;}
void main(){vec2 h=tx*0.25;gl_FragColor=vec4((pick(-h)+pick(h)+pick(vec2(h.x,-h.y))+pick(vec2(-h.x,h.y)))*0.25,1.0);}`;
const FS_BLUR = `precision mediump float;varying vec2 uv;uniform sampler2D src;uniform vec2 dir;uniform float k;uniform float fin;
void main(){vec3 c=texture2D(src,uv).rgb*0.227027;c+=(texture2D(src,uv+dir*1.384615).rgb+texture2D(src,uv-dir*1.384615).rgb)*0.316216;
c+=(texture2D(src,uv+dir*3.230769).rgb+texture2D(src,uv-dir*3.230769).rgb)*0.070270;c=clamp(c*k,0.0,1.0);
gl_FragColor=fin>0.5?vec4(c,max(c.r,max(c.g,c.b))):vec4(c,1.0);}`;

interface Prog {
  p: WebGLProgram;
  u: Record<string, WebGLUniformLocation | null>;
}

export interface FxFrame {
  bloom: BloomId;
  scan: ScanId;
  /** The glow buffer (and the glow canvas) in its own pixels. */
  glowW: number;
  glowH: number;
  /** The scanline column: device rows, and device rows per game row (0: no scanlines). */
  rows: number;
  rowPx: number;
}

/** Sizes for one frame: the glow at half the game pixels seen; the scanlines at one alpha per device row. */
export function fxSize(v: View, dpr: number, scan: ScanId, bloom: BloomId): FxFrame {
  const glowW = Math.max(16, Math.min(BLOOM.maxW, Math.round(v.worldW * BLOOM.scale)));
  const glowH = Math.max(16, Math.round((glowW * v.bufH) / Math.max(1, v.bufW)));
  const rows = scan === "off" ? 0 : Math.max(1, Math.min(SCAN.maxRows, Math.round(v.css.h * dpr)));
  const rowPx = scan === "off" ? 0 : rows / Math.max(1, v.worldH);
  return { bloom, scan, glowW, glowH, rows, rowPx };
}

/** The scanline column's alphas, one per device row (0..255). */
export function scanColumn(rows: number, rowPx: number, scan: ScanId): Uint8ClampedArray {
  const out = new Uint8ClampedArray(rows);
  if (scan === "off" || rowPx <= 0) return out;
  const S = SCAN[scan];
  for (let y = 0; y < rows; y++) {
    const q = ((y + 0.5) / rowPx) % 1;
    out[y] = Math.round(255 * S.dark * Math.pow(q, S.pow));
  }
  return out;
}

/** The shell's live pass (the options panel reads its caps for the default it shows). */
const reg: { fx: PostFx | null } = { fx: null };
export const activeFx = () => reg.fx;

export class PostFx {
  readonly root: HTMLElement;
  readonly glowCanvas: HTMLCanvasElement;
  readonly scanCanvas: HTMLCanvasElement;
  gl: WebGLRenderingContext | null = null;
  caps: FxCaps = { gl: false, soft: false, cores: 0, memory: null };
  lost = false;
  guard: Guard | null = null;
  /** The last frame drawn (null: nothing shown). Read by the checks and the audit. */
  last: FxFrame | null = null;
  private small: HTMLCanvasElement;
  private sctx: CanvasRenderingContext2D | null;
  private scanKey = "";
  /** Smoothed ms a glow refresh costs, and the frame counter for refreshing every second frame. */
  cost = 0;
  private tick = 0;
  private progs: { ex: Prog; blur: Prog } | null = null;
  private srcTex: WebGLTexture | null = null;
  private fb: { tex: WebGLTexture; fbo: WebGLFramebuffer }[] = [];
  private fbW = 0;
  private fbH = 0;

  constructor(root: HTMLElement, opts: { noGl?: boolean } = {}) {
    this.root = root;
    const doc = root.ownerDocument;
    const layer = (render: string) => {
      const c = doc.createElement("canvas");
      c.setAttribute("aria-hidden", "true");
      Object.assign(c.style, { position: "absolute", left: "0", top: "0", width: "100%", height: "100%", display: "none", pointerEvents: "none", imageRendering: render });
      root.appendChild(c);
      return c;
    };
    this.glowCanvas = layer("auto");
    this.glowCanvas.dataset.testid = "fx-glow";
    this.scanCanvas = layer("pixelated");
    this.scanCanvas.dataset.testid = "fx-scan";
    this.small = doc.createElement("canvas");
    this.sctx = this.small.getContext("2d");
    const nav = typeof navigator !== "undefined" ? (navigator as Navigator & { deviceMemory?: number }) : null;
    this.caps.cores = nav?.hardwareConcurrency ?? 0;
    this.caps.memory = typeof nav?.deviceMemory === "number" ? nav.deviceMemory : null;
    this.glowCanvas.addEventListener("webglcontextlost", (e) => {
      e.preventDefault();
      this.lost = true;
      this.progs = null;
    });
    this.glowCanvas.addEventListener("webglcontextrestored", () => {
      this.lost = false;
      this.init();
    });
    if (!opts.noGl) {
      try {
        this.gl = (this.glowCanvas.getContext("webgl", { alpha: true, antialias: false, depth: false, stencil: false, premultipliedAlpha: true, preserveDrawingBuffer: false }) as WebGLRenderingContext | null) ?? null;
      } catch {
        this.gl = null;
      }
    }
    if (this.gl) this.init();
    if (!this.progs || !this.sctx) {
      this.gl = null;
      this.caps.gl = false;
    }
    reg.fx = this;
  }

  private init() {
    const gl = this.gl;
    if (!gl) return;
    const mk = (fs: string, names: string[]): Prog | null => {
      const sh = (t: number, s: string) => {
        const o = gl.createShader(t);
        if (!o) return null;
        gl.shaderSource(o, s);
        gl.compileShader(o);
        return gl.getShaderParameter(o, gl.COMPILE_STATUS) ? o : null;
      };
      const v = sh(gl.VERTEX_SHADER, VS);
      const f = sh(gl.FRAGMENT_SHADER, fs);
      const p = gl.createProgram();
      if (!v || !f || !p) return null;
      gl.attachShader(p, v);
      gl.attachShader(p, f);
      gl.bindAttribLocation(p, 0, "p");
      gl.linkProgram(p);
      if (!gl.getProgramParameter(p, gl.LINK_STATUS)) return null;
      const u: Prog["u"] = {};
      for (const n of names) u[n] = gl.getUniformLocation(p, n);
      return { p, u };
    };
    const ex = mk(FS_EXTRACT, ["src", "tx", "thr"]);
    const blur = mk(FS_BLUR, ["src", "dir", "k", "fin"]);
    if (!ex || !blur) {
      this.progs = null;
      return;
    }
    this.progs = { ex, blur };
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    this.srcTex = this.tex(gl.NEAREST);
    this.fb = [];
    this.fbW = 0;
    this.fbH = 0;
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    const dbg = gl.getExtension("WEBGL_debug_renderer_info");
    const name = String((dbg ? gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER)) ?? "");
    this.caps.gl = true;
    this.caps.soft = SOFT.test(name);
  }

  private tex(filter: number) {
    const gl = this.gl!;
    const t = gl.createTexture()!;
    gl.bindTexture(gl.TEXTURE_2D, t);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, filter);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, filter);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    return t;
  }

  private glowBuffers(w: number, h: number) {
    const gl = this.gl!;
    if (this.fb.length === 2 && this.fbW === w && this.fbH === h) return;
    for (const b of this.fb) {
      gl.deleteTexture(b.tex);
      gl.deleteFramebuffer(b.fbo);
    }
    this.fb = [0, 1].map(() => {
      const tex = this.tex(gl.LINEAR);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
      const fbo = gl.createFramebuffer()!;
      gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
      return { tex, fbo };
    });
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    this.fbW = w;
    this.fbH = h;
  }

  /** The glow for one frame. False: bloom off, no WebGL, or the context is lost (the caller hides the glow). */
  drawGlow(src: HTMLCanvasElement, f: FxFrame): boolean {
    const gl = this.gl;
    const sc = this.sctx;
    if (f.bloom === "off" || !gl || !sc || !this.progs || this.lost || gl.isContextLost()) return false;
    const { ex, blur } = this.progs;
    const B = BLOOM[f.bloom];
    const sized = this.glowCanvas.width === f.glowW && this.glowCanvas.height === f.glowH && this.glowCanvas.style.display === "block";
    this.tick++;
    if (sized && this.cost > REFRESH.fast && this.tick % 2 === 1) return true;
    const t0 = typeof performance !== "undefined" ? performance.now() : 0;
    // A smoothed copy at twice the glow size: the only per-frame copy of the frame, and a small one.
    const sw = f.glowW * 2;
    const sh = f.glowH * 2;
    if (this.small.width !== sw) this.small.width = sw;
    if (this.small.height !== sh) this.small.height = sh;
    sc.imageSmoothingEnabled = true;
    sc.drawImage(src, 0, 0, sw, sh);
    if (this.glowCanvas.width !== f.glowW) this.glowCanvas.width = f.glowW;
    if (this.glowCanvas.height !== f.glowH) this.glowCanvas.height = f.glowH;
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.srcTex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, this.small);
    this.glowBuffers(f.glowW, f.glowH);
    const [a, b] = this.fb;
    gl.viewport(0, 0, f.glowW, f.glowH);
    gl.bindFramebuffer(gl.FRAMEBUFFER, a.fbo);
    gl.useProgram(ex.p);
    gl.uniform1i(ex.u.src, 0);
    gl.uniform2f(ex.u.tx, 1 / f.glowW, 1 / f.glowH);
    gl.uniform1f(ex.u.thr, B.threshold);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    gl.useProgram(blur.p);
    gl.uniform1i(blur.u.src, 0);
    for (let i = 0; i < B.passes; i++) {
      const s = B.spread * (1 + i);
      const lastPass = i === B.passes - 1;
      gl.bindFramebuffer(gl.FRAMEBUFFER, b.fbo);
      gl.bindTexture(gl.TEXTURE_2D, a.tex);
      gl.uniform2f(blur.u.dir, s / f.glowW, 0);
      gl.uniform1f(blur.u.k, 1);
      gl.uniform1f(blur.u.fin, 0);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      // The last vertical pass writes the glow, scaled by the strength, straight to the glow canvas.
      gl.bindFramebuffer(gl.FRAMEBUFFER, lastPass ? null : a.fbo);
      gl.bindTexture(gl.TEXTURE_2D, b.tex);
      gl.uniform2f(blur.u.dir, 0, s / f.glowH);
      gl.uniform1f(blur.u.k, lastPass ? B.strength : 1);
      gl.uniform1f(blur.u.fin, lastPass ? 1 : 0);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    }
    const ms = (typeof performance !== "undefined" ? performance.now() : 0) - t0;
    this.cost = this.cost === 0 ? ms : this.cost + (ms - this.cost) * REFRESH.ease;
    return true;
  }

  /** Take the layer out of the page (the shell's effect cleanup). */
  dispose() {
    this.glowCanvas.remove();
    this.scanCanvas.remove();
    if (reg.fx === this) reg.fx = null;
  }

  /** The scanline column; redrawn only when its rows, spacing or setting change. False: scanlines off. */
  drawScan(f: FxFrame): boolean {
    if (f.scan === "off" || f.rows <= 0) return false;
    const key = `${f.rows}:${f.rowPx.toFixed(4)}:${f.scan}`;
    if (key === this.scanKey) return true;
    const c = this.scanCanvas.getContext("2d");
    if (!c) return false;
    this.scanCanvas.width = 1;
    this.scanCanvas.height = f.rows;
    const col = scanColumn(f.rows, f.rowPx, f.scan);
    const img = c.createImageData(1, f.rows);
    for (let y = 0; y < f.rows; y++) img.data[y * 4 + 3] = col[y];
    c.putImageData(img, 0, 0);
    this.scanKey = key;
    return true;
  }
}

/**
 * One frame of the layer, called by the shell after the game canvas is drawn. Playfield modes only (not the title or the
 * full map). Keeps the layer on the game canvas's own box; shows the glow and the scanlines only when they drew.
 */
export function fxFrame(fx: PostFx | null, src: HTMLCanvasElement, v: View, dpr: number, mode: string, now = typeof performance !== "undefined" ? performance.now() : 0) {
  if (!fx) return;
  const s = fxStore.get();
  const play = mode !== "title" && mode !== "map";
  let bloom = play ? effectiveBloom(s, fx.caps, v.eff) : "off";
  // The fps guard watches the device default only (never a player's own pick).
  if (play && s.bloom === null && bloom !== "off") {
    const r = guardStep((fx.guard ??= newGuard(now)), now);
    if (r === "trial") bloom = "off";
    else if (r === "drop") {
      fxStore.set({ autoOff: true });
      bloom = "off";
    }
  }
  const scan = play ? s.scan : "off";
  const f = fxSize(v, dpr, scan, bloom);
  const glow = fx.drawGlow(src, f);
  const lines = fx.drawScan(f);
  fx.last = glow || lines ? { ...f, bloom: glow ? bloom : "off", scan: lines ? scan : "off" } : null;
  const show = (c: HTMLCanvasElement, on: boolean) => {
    const d = on ? "block" : "none";
    if (c.style.display !== d) c.style.display = d;
  };
  show(fx.glowCanvas, glow);
  show(fx.scanCanvas, lines);
  const st = fx.root.style;
  const ss = src.style;
  if (st.left !== ss.left) st.left = ss.left;
  if (st.top !== ss.top) st.top = ss.top;
  if (st.width !== ss.width) st.width = ss.width;
  if (st.height !== ss.height) st.height = ss.height;
  const tag = `${glow ? bloom : "off"}:${lines ? scan : "off"}`;
  if (fx.root.dataset.fx !== tag) fx.root.dataset.fx = tag;
}
