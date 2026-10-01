/**
 * Mixer for a phone speaker. The tune sits in the middle register, where a
 * small speaker can actually move air. A sub drone at a whisper was silent.
 */
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
  }

  setMusic(v: number) {
    this.music = v;
    if (this.musicGain && this.ctx) this.musicGain.gain.setTargetAtTime(v, this.ctx.currentTime, 0.05);
  }

  setSfx(v: number) {
    this.sfx = v;
  }

  /** Pick the tune for town, night, a dungeon, or a fight. */
  mood(key: string) {
    if (key === this.moodKey) return;
    this.moodKey = key;
    this.step = 0;
  }

  /** Keep a few notes queued. Skipped until the context is actually running. */
  pump() {
    const ctx = this.ctx;
    if (!ctx || ctx.state !== "running" || !this.musicGain || this.music <= 0) return;
    const now = ctx.currentTime;
    if (this.noteAt < now) this.noteAt = now + 0.05;
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
    this.tone(220, 0.09, "triangle", 0.32);
    this.tone(440, 0.06, "square", 0.08);
  }

  spell() {
    this.tone(523, 0.14, "triangle", 0.26);
    this.tone(784, 0.1, "triangle", 0.14);
  }

  door() {
    this.tone(196, 0.12, "triangle", 0.28);
  }

  coin() {
    this.tone(880, 0.07, "triangle", 0.2);
    this.tone(1318, 0.1, "triangle", 0.12);
  }

  hurt() {
    this.tone(174, 0.16, "triangle", 0.34);
    this.tone(130, 0.12, "sawtooth", 0.08);
  }

  /** A rumble with enough mid in it that a phone speaker can carry it. */
  thunder() {
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
