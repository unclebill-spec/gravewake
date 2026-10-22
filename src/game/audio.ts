/**
 * Mixer for a phone speaker. The tune sits in the middle register, where a
 * small speaker can actually move air. A sub drone at a whisper was silent.
 */
/**
 * Wake batch audio (staging/audio, CC0, see public/art/audio/LICENSES.md): 36 OGG loops and 10 one-shots. Each file is
 * fetched and decoded once (cache by url); the music crossfades over 0.6 s; while a file plays the synth is skipped, and
 * while a file is missing, loading or failed the synth plays as before, so the game is never silent.
 */
const MUSIC_DIR = "/art/audio/music/";
const SFX_DIR = "/art/audio/sfx/";
export const DUNGEON_MUSIC = ["harrow", "ossuary", "wraps", "carrion", "wick", "warren", "chapel", "vesper", "drowned", "blackroot", "cave", "grave", "hearth", "wake"];
export const ROOM_MUSIC = ["alchemy", "bank", "casino", "chapel", "cottage", "croft", "fisher", "guild", "inn", "mystic", "shop", "smith", "tailor"];
/** The music file (name, no folder) for a mood key, by the staging README's table. */
export function musicFor(key: string): string {
  if (key === "finale") return "music-finale";
  if (key.startsWith("battle:boss-final")) return "music-boss-final";
  if (key.startsWith("battle")) return "music-battle";
  const [map, a, b] = key.split(":");
  if (map === "dungeon") return `dungeon-${DUNGEON_MUSIC.includes(a) ? a : "cave"}`;
  if (map === "inside") return a === "room" ? `room-${ROOM_MUSIC.includes(b) ? b : "cottage"}` : "room-cottage";
  if (map === "camp") return "music-camp";
  const night = key.endsWith(":night");
  if (map === "town") return night ? "music-night" : "music-town-day";
  if (map === "world" || map === "village") return night ? "music-night" : "music-world-day";
  return night ? "music-night" : "music-town-day";
}
/** Per-call trims for a phone speaker (the files peak near -3 dBFS; the synth's beeps sat around 0.2-0.34). */
export const SFX_TRIM: Record<string, number> = { hit: 0.55, spell: 0.45, door: 0.5, coin: 0.45, hurt: 0.6, steam: 0.4, rattle: 0.35, thunder: 0.6, toll: 0.7, sting: 0.7 };
const SFX_FILE: Record<string, string> = { hit: "sfx-hit", spell: "sfx-spell", door: "sfx-door", coin: "sfx-coin", hurt: "sfx-hurt", steam: "sfx-steam", rattle: "sfx-rattle", thunder: "sfx-thunder", toll: "sfx-toll", sting: "sting-boss-early" };
const FADE = 0.6;
/** polish: a file mastered well under the rest is lifted to sit with them (mean dB: harrow -23.8 against the dungeons' -16.3;
 * its peak is -3.1 dB, so x1.8 (+5.1 dB) keeps headroom under the master). */
export const MUSIC_TRIM: Record<string, number> = { "dungeon-harrow": 1.8 };
/** How long the casino bed stays ducked after a jukebox note (a note comes every 0.4 s). */
const SONG_HOLD = 0.9;

export class AudioBus {
  ctx: AudioContext | null = null;
  music = 0.7;
  sfx = 0.8;
  private started = false;
  private moodKey = "";
  private step = 0;
  private noteAt = 0;
  private out: GainNode | null = null;
  private musicGain: GainNode | null = null;
  private comp: DynamicsCompressorNode | null = null;
  /** Decoded files by url; "loading" while a fetch is out, null when it failed (the synth covers it). */
  private bufs = new Map<string, AudioBuffer | "loading" | null>();
  /** The file playing on the music bus: its name, its sources (one, or the boss's three stems) and their gains. */
  private cur: { file: string; srcs: AudioBufferSourceNode[]; gains: GainNode[]; bed: GainNode } | null = null;
  private want = "";
  private silentUntil = 0;
  private jukeboxUntil = 0;
  private bossPhase = 1;
  private hush = false;

  /** Start the context on a user gesture. Later calls only resume it. */
  unlock() {
    if (this.started) {
      if (this.ctx && this.ctx.state !== "running") void this.ctx.resume();
      if (this.ctx && this.noteAt < this.ctx.currentTime) this.noteAt = this.ctx.currentTime + 0.05;
      return;
    }
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new AC();
    this.ctx = ctx;
    this.started = true;
    void ctx.resume();
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -14;
    comp.knee.value = 12;
    comp.ratio.value = 3;
    comp.attack.value = 0.01;
    comp.release.value = 0.2;
    const out = ctx.createGain();
    out.gain.value = 0.9;
    comp.connect(out);
    out.connect(ctx.destination);
    this.out = out;
    this.comp = comp;
    const musicGain = ctx.createGain();
    musicGain.gain.value = this.music;
    musicGain.connect(comp);
    this.musicGain = musicGain;
    this.noteAt = ctx.currentTime + 0.05;
    this.step = 0;
    // decode once: the current mood's file first, then the one-shots
    if (this.moodKey) this.mood(this.moodKey, true);
    for (const f of Object.values(SFX_FILE)) void this.load(`${SFX_DIR}${f}.ogg`);
  }

  /** Fetch and decode a file once; later calls return the cached buffer (or null while loading or after a failure). */
  private load(url: string): AudioBuffer | null {
    const have = this.bufs.get(url);
    if (have !== undefined) return have === "loading" ? null : have;
    const ctx = this.ctx;
    if (!ctx || typeof fetch === "undefined") return null;
    this.bufs.set(url, "loading");
    fetch(url)
      .then((r) => (r.ok ? r.arrayBuffer() : Promise.reject(new Error(String(r.status)))))
      .then((ab) => new Promise<AudioBuffer>((res, rej) => { const p = ctx.decodeAudioData(ab, res, rej); if (p && typeof (p as Promise<AudioBuffer>).catch === "function") (p as Promise<AudioBuffer>).catch(rej); }))
      .then((buf) => {
        this.bufs.set(url, buf);
        if (url.startsWith(MUSIC_DIR) && this.want && url.includes(`/${this.want}.ogg`)) this.startFile(this.want);
        if (this.want === "music-boss-final" && url.includes("music-boss-final")) this.startFile(this.want);
      })
      .catch(() => this.bufs.set(url, null));
    return null;
  }

  /** Start the wanted file once its buffer (and, for the boss, all three stems) is decoded; crossfade from the last one. */
  private startFile(file: string) {
    const ctx = this.ctx;
    if (!ctx || !this.musicGain || this.cur?.file === file || ctx.currentTime < this.silentUntil - FADE) return;
    const names = file === "music-boss-final" ? ["music-boss-final", "music-boss-final-p2", "music-boss-final-p3"] : [file];
    const bufs = names.map((n) => this.load(`${MUSIC_DIR}${n}.ogg`));
    if (bufs.some((b) => !b)) return;
    const t0 = Math.max(ctx.currentTime + 0.02, this.silentUntil);
    const bed = ctx.createGain();
    bed.gain.setValueAtTime(0.0001, ctx.currentTime);
    bed.gain.setValueAtTime(0.0001, t0);
    bed.gain.linearRampToValueAtTime(1, t0 + FADE);
    bed.connect(this.musicGain);
    const srcs: AudioBufferSourceNode[] = [];
    const gains: GainNode[] = [];
    bufs.forEach((b, i) => {
      const src = ctx.createBufferSource();
      src.buffer = b;
      src.loop = true;
      const g = ctx.createGain();
      g.gain.value = (i === 0 ? (names.length > 1 ? 1.4 : 1) : i < this.bossPhase ? 1 : 0) * (MUSIC_TRIM[names[i]] ?? 1); // the base alone sits ~3 dB up in phase 1
      src.connect(g);
      g.connect(bed);
      src.start(t0); // one start time: the stems stay sample-aligned
      srcs.push(src);
      gains.push(g);
    });
    this.fadeOut();
    this.cur = { file, srcs, gains, bed };
  }

  private fadeOut(over = FADE) {
    const ctx = this.ctx;
    const c = this.cur;
    if (!ctx || !c) return;
    const t = ctx.currentTime;
    c.bed.gain.cancelScheduledValues(t);
    c.bed.gain.setValueAtTime(c.bed.gain.value, t);
    c.bed.gain.linearRampToValueAtTime(0.0001, t + over);
    for (const s of c.srcs) s.stop(t + over + 0.05);
    this.cur = null;
  }

  /** Hollowmourn's music builds with his phases: phase 2 brings in the p2 stem, phase 3 the bell stem (1.5 s ramps). */
  bossStage(phase: number) {
    this.bossPhase = phase;
    const ctx = this.ctx;
    const c = this.cur;
    if (!ctx || !c || c.file !== "music-boss-final") return;
    c.gains.forEach((g, i) => {
      if (i === 0) { g.gain.setTargetAtTime(phase > 1 ? 1 : 1.4, ctx.currentTime, 0.4); return; }
      g.gain.cancelScheduledValues(ctx.currentTime);
      g.gain.setValueAtTime(g.gain.value, ctx.currentTime);
      g.gain.linearRampToValueAtTime(i < phase ? 1 : 0, ctx.currentTime + 1.5);
    });
  }

  /** Lights Out: the music hushes to about 0.3 and comes back after. */
  setHush(on: boolean) {
    if (this.hush === on) return;
    this.hush = on;
    if (this.musicGain && this.ctx) this.musicGain.gain.setTargetAtTime(on ? this.music * 0.3 : this.music, this.ctx.currentTime, 0.25);
  }

  /** The casino jukebox is singing: the room bed ducks to 0.35 while notes come, and comes back when it stops. */
  jukebox() {
    if (this.ctx) this.jukeboxUntil = this.ctx.currentTime + SONG_HOLD;
  }

  /** Play a one-shot file through the compressor at the SFX level; false if it is not decoded (the caller beeps). */
  private shot(name: string): boolean {
    const ctx = this.ctx;
    if (!ctx || ctx.state !== "running" || this.sfx <= 0 || !this.comp) return false;
    const buf = this.load(`${SFX_DIR}${SFX_FILE[name]}.ogg`);
    if (!buf) return false;
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const g = ctx.createGain();
    g.gain.value = this.sfx * (SFX_TRIM[name] ?? 0.5);
    src.connect(g);
    g.connect(this.comp);
    src.start();
    return true;
  }

  /** The Wake Bell's toll (Hollowmourn's Toll wind-up, his phase beats, the Last Toll). */
  toll() {
    if (!this.shot("toll")) { this.tone(110, 0.9, "triangle", 0.3); this.tone(165, 0.7, "sine", 0.12); }
  }

  /** The first boss or mini to turn on you in a save (the sim keeps the flag). */
  sting() {
    if (!this.shot("sting")) { this.tone(196, 0.3, "triangle", 0.26); this.tone(147, 0.5, "triangle", 0.2); }
  }

  setMusic(v: number) {
    this.music = v;
    if (this.musicGain && this.ctx) this.musicGain.gain.setTargetAtTime(v, this.ctx.currentTime, 0.05);
  }

  setSfx(v: number) {
    this.sfx = v;
  }

  /** Pick the tune for town, night, a dungeon, or a fight. */
  mood(key: string, force = false) {
    if (key === this.moodKey && !force) return;
    const was = this.moodKey;
    this.moodKey = key;
    this.step = 0;
    const file = musicFor(key);
    if (file === this.want && !force) return; // several keys share a file: no restart
    this.want = file;
    if (!this.ctx) return;
    if (file === "music-finale" && was !== "finale") {
      // the Last Toll: the stems fade over 1 s, then 2 s of silence (no synth either), then the finale
      this.fadeOut(1);
      this.silentUntil = this.ctx.currentTime + 3;
      for (const n of [file]) void this.load(`${MUSIC_DIR}${n}.ogg`);
      setTimeout(() => this.startFile(file), 3000);
      return;
    }
    if (file === "music-boss-final") this.bossPhase = 1;
    const names = file === "music-boss-final" ? ["music-boss-final", "music-boss-final-p2", "music-boss-final-p3"] : [file];
    for (const n of names) this.load(`${MUSIC_DIR}${n}.ogg`);
    if (names.every((n) => this.bufs.get(`${MUSIC_DIR}${n}.ogg`) instanceof AudioBuffer)) this.startFile(file);
    else this.fadeOut(); // the synth plays while the file loads
  }

  /** Keep a few notes queued. Skipped until the context is actually running. */
  pump() {
    const ctx = this.ctx;
    if (!ctx || ctx.state !== "running" || !this.musicGain || this.music <= 0) return;
    const now = ctx.currentTime;
    if (this.noteAt < now) this.noteAt = now + 0.05;
    if (now < this.silentUntil) return; // the 2 s before the finale
    if (this.cur) {
      // a file is playing: no synth notes. The casino bed ducks under the jukebox.
      if (this.cur.file === "room-casino") this.cur.bed.gain.setTargetAtTime(now < this.jukeboxUntil ? 0.35 : 1, now, 0.15);
      this.noteAt = now + 0.05;
      return;
    }
    const { notes, gap } = this.pattern();
    const horizon = now + 0.35;
    let guard = 0;
    while (this.noteAt < horizon && guard < 8) {
      const freq = notes[this.step % notes.length];
      this.step = (this.step + 1) % notes.length;
      if (freq) this.playNote(this.noteAt, freq);
      this.noteAt += gap;
      guard += 1;
    }
  }

  private pattern(): { notes: number[]; gap: number } {
    const key = this.moodKey;
    if (key.startsWith("battle")) return { notes: [330, 0, 392, 330, 294, 0, 440, 349], gap: 0.2 };
    if (key.includes("dungeon")) return { notes: [196, 233, 294, 0, 174, 220, 262, 0], gap: 0.46 };
    if (key.includes("casino")) return { notes: [247, 294, 370, 294, 220, 247, 330, 196], gap: 0.32 };
    if (key.includes("inside")) return { notes: [196, 247, 294, 247, 220, 196, 262, 220], gap: 0.5 };
    if (key.includes("night")) return { notes: [220, 262, 330, 262, 196, 233, 294, 220], gap: 0.48 };
    return { notes: [220, 262, 330, 392, 330, 262, 294, 247], gap: 0.36 };
  }

  private playNote(time: number, freq: number) {
    const ctx = this.ctx;
    const bus = this.musicGain;
    if (!ctx || !bus) return;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = 1800;
    o.type = "triangle";
    o.frequency.setValueAtTime(freq, time);
    g.gain.setValueAtTime(0.0001, time);
    g.gain.exponentialRampToValueAtTime(0.28, time + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, time + 0.3);
    o.connect(g);
    g.connect(filter);
    filter.connect(bus);
    o.start(time);
    o.stop(time + 0.34);
  }

  /** One beep the speaker can produce. Mid pitches, not a sub sine. */
  tone(freq: number, dur: number, type: OscillatorType, gain = 0.2) {
    const ctx = this.ctx;
    if (!ctx || ctx.state !== "running" || this.sfx <= 0 || !this.comp) return;
    const t = ctx.currentTime;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = 2400;
    o.type = type;
    o.frequency.setValueAtTime(Math.min(freq, 1400), t);
    const peak = Math.max(0.001, gain * this.sfx);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(peak, t + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t + Math.max(0.06, dur));
    o.connect(g);
    g.connect(filter);
    filter.connect(this.comp);
    o.start(t);
    o.stop(t + dur + 0.04);
  }

  hit() {
    if (this.shot("hit")) return;
    this.tone(220, 0.09, "triangle", 0.32);
    this.tone(440, 0.06, "square", 0.08);
  }

  spell() {
    if (this.shot("spell")) return;
    this.tone(523, 0.14, "triangle", 0.26);
    this.tone(784, 0.1, "triangle", 0.14);
  }

  door() {
    if (this.shot("door")) return;
    this.tone(196, 0.12, "triangle", 0.28);
  }

  coin() {
    if (this.shot("coin")) return;
    this.tone(880, 0.07, "triangle", 0.2);
    this.tone(1318, 0.1, "triangle", 0.12);
  }

  hurt() {
    if (this.shot("hurt")) return;
    this.tone(174, 0.16, "triangle", 0.34);
    this.tone(130, 0.12, "sawtooth", 0.08);
  }

  /** playtest1v [OWNER-APPROVED 2026-10-05 21:31 ET: playtest1v map fog + bone car]: the bone car's boiler hiss (a short
   * noise breath through the same low-pass) and a whistle. */
  steam() {
    if (this.shot("steam")) return;
    this.hiss(0.32, 0.14);
    this.tone(1046, 0.12, "triangle", 0.06);
  }

  /** playtest1v: the bone car's rattle, three dry clacks of bone. */
  rattle() {
    if (this.shot("rattle")) return;
    this.tone(330, 0.03, "square", 0.05);
    this.tone(247, 0.03, "square", 0.04);
    this.tone(392, 0.025, "square", 0.035);
  }

  private hiss(dur: number, gain: number) {
    const ctx = this.ctx;
    if (!ctx || ctx.state !== "running" || !this.comp || this.sfx <= 0) return;
    const n = Math.floor(ctx.sampleRate * dur);
    const buf = ctx.createBuffer(1, n, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < n; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / n);
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const g = ctx.createGain();
    g.gain.value = gain * this.sfx;
    src.connect(g);
    g.connect(this.comp);
    src.start();
  }

  /** A rumble with enough mid in it that a phone speaker can carry it. */
  thunder() {
    if (this.shot("thunder")) return;
    this.tone(110, 0.42, "triangle", 0.3);
    this.tone(220, 0.28, "triangle", 0.16);
    this.rumble();
  }

  private rumble() {
    const ctx = this.ctx;
    if (!ctx || ctx.state !== "running" || !this.comp || this.sfx <= 0) return;
    const n = Math.floor(ctx.sampleRate * 0.4);
    const buf = ctx.createBuffer(1, n, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < n; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / n);
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = 320;
    const g = ctx.createGain();
    g.gain.value = 0.22 * this.sfx;
    src.connect(filter);
    filter.connect(g);
    g.connect(this.comp);
    src.start();
  }
}
