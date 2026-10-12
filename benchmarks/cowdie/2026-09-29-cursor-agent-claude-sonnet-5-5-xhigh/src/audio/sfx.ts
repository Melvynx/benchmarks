type OscType = OscillatorType;

class Sfx {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private noise: AudioBuffer | null = null;
  muted = false;
  private lastBell = 0;

  private ensure() {
    if (this.muted) return null;
    if (!this.ctx) {
      const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!Ctor) return null;
      this.ctx = new Ctor();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.55;
      const comp = this.ctx.createDynamicsCompressor();
      this.master.connect(comp).connect(this.ctx.destination);
      const len = this.ctx.sampleRate;
      this.noise = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
      const d = this.noise.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    }
    if (this.ctx.state === 'suspended') void this.ctx.resume();
    return this.ctx;
  }

  unlock() {
    this.ensure();
  }

  setMuted(m: boolean) {
    this.muted = m;
    if (m && this.ctx) void this.ctx.suspend();
    else if (!m) this.ensure();
  }

  private tone(opts: {
    freq: number;
    to?: number;
    dur: number;
    type?: OscType;
    vol?: number;
    delay?: number;
    attack?: number;
    vibrato?: [number, number];
    filter?: number;
  }) {
    const ctx = this.ensure();
    if (!ctx || !this.master) return;
    const t0 = ctx.currentTime + (opts.delay ?? 0);
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = opts.type ?? 'sine';
    osc.frequency.setValueAtTime(opts.freq, t0);
    if (opts.to) osc.frequency.exponentialRampToValueAtTime(Math.max(1, opts.to), t0 + opts.dur);
    const vol = opts.vol ?? 0.3;
    const attack = opts.attack ?? 0.008;
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.linearRampToValueAtTime(vol, t0 + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + opts.dur);
    let node: AudioNode = osc;
    if (opts.filter) {
      const f = ctx.createBiquadFilter();
      f.type = 'lowpass';
      f.frequency.value = opts.filter;
      osc.connect(f);
      node = f;
    }
    node.connect(g).connect(this.master);
    if (opts.vibrato) {
      const lfo = ctx.createOscillator();
      const lg = ctx.createGain();
      lfo.frequency.value = opts.vibrato[0];
      lg.gain.value = opts.vibrato[1];
      lfo.connect(lg).connect(osc.frequency);
      lfo.start(t0);
      lfo.stop(t0 + opts.dur + 0.05);
    }
    osc.start(t0);
    osc.stop(t0 + opts.dur + 0.05);
  }

  private burst(opts: { dur: number; type: BiquadFilterType; freq: number; q?: number; vol?: number; delay?: number; to?: number }) {
    const ctx = this.ensure();
    if (!ctx || !this.master || !this.noise) return;
    const t0 = ctx.currentTime + (opts.delay ?? 0);
    const src = ctx.createBufferSource();
    src.buffer = this.noise;
    src.loop = true;
    const f = ctx.createBiquadFilter();
    f.type = opts.type;
    f.frequency.setValueAtTime(opts.freq, t0);
    if (opts.to) f.frequency.exponentialRampToValueAtTime(opts.to, t0 + opts.dur);
    f.Q.value = opts.q ?? 1;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.linearRampToValueAtTime(opts.vol ?? 0.3, t0 + 0.006);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + opts.dur);
    src.connect(f).connect(g).connect(this.master);
    src.start(t0, Math.random() * 0.5);
    src.stop(t0 + opts.dur + 0.05);
  }

  munch() {
    this.burst({ dur: 0.11, type: 'lowpass', freq: 1100, q: 0.8, vol: 0.5 });
    this.tone({ freq: 140, to: 60, dur: 0.12, vol: 0.35 });
    this.tone({ freq: 320, to: 200, dur: 0.06, vol: 0.08, type: 'triangle', delay: 0.02 });
  }

  crunch() {
    this.burst({ dur: 0.05, type: 'highpass', freq: 2600, q: 0.7, vol: 0.5 });
    this.burst({ dur: 0.07, type: 'bandpass', freq: 1800, q: 1.2, vol: 0.45, delay: 0.045 });
    this.tone({ freq: 180, to: 70, dur: 0.1, vol: 0.3 });
  }

  slurp() {
    this.tone({ freq: 260, to: 720, dur: 0.22, vol: 0.14, vibrato: [22, 60] });
    this.burst({ dur: 0.2, type: 'bandpass', freq: 900, to: 2400, q: 3, vol: 0.14 });
  }

  gulp() {
    this.tone({ freq: 240, to: 90, dur: 0.16, vol: 0.4 });
    this.tone({ freq: 160, to: 70, dur: 0.14, vol: 0.3, delay: 0.09 });
  }

  bite() {
    this.burst({ dur: 0.05, type: 'highpass', freq: 1800, vol: 0.4 });
    this.tone({ freq: 500, to: 250, dur: 0.06, vol: 0.14, type: 'triangle' });
  }

  moo(pitch = 1, dur = 1.0, vol = 0.34) {
    const ctx = this.ensure();
    if (!ctx || !this.master) return;
    const t0 = ctx.currentTime;
    const osc = ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(150 * pitch, t0);
    osc.frequency.linearRampToValueAtTime(205 * pitch, t0 + dur * 0.25);
    osc.frequency.linearRampToValueAtTime(178 * pitch, t0 + dur * 0.65);
    osc.frequency.exponentialRampToValueAtTime(120 * pitch, t0 + dur);
    const lfo = ctx.createOscillator();
    const lg = ctx.createGain();
    lfo.frequency.value = 5.5;
    lg.gain.value = 6 * pitch;
    lfo.connect(lg).connect(osc.frequency);
    const f1 = ctx.createBiquadFilter();
    f1.type = 'bandpass';
    f1.Q.value = 5;
    f1.frequency.setValueAtTime(420, t0);
    f1.frequency.linearRampToValueAtTime(720, t0 + dur * 0.3);
    f1.frequency.linearRampToValueAtTime(380, t0 + dur);
    const f2 = ctx.createBiquadFilter();
    f2.type = 'bandpass';
    f2.Q.value = 6;
    f2.frequency.setValueAtTime(900, t0);
    f2.frequency.linearRampToValueAtTime(1150, t0 + dur * 0.3);
    f2.frequency.linearRampToValueAtTime(760, t0 + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.linearRampToValueAtTime(vol, t0 + 0.08);
    g.gain.setValueAtTime(vol, t0 + dur * 0.7);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    const mix = ctx.createGain();
    mix.gain.value = 1.6;
    osc.connect(f1).connect(mix);
    osc.connect(f2).connect(mix);
    mix.connect(g).connect(this.master);
    osc.start(t0);
    lfo.start(t0);
    osc.stop(t0 + dur + 0.05);
    lfo.stop(t0 + dur + 0.05);
  }

  giggle() {
    for (let i = 0; i < 4; i++) {
      this.tone({
        freq: 640 + (i % 2) * 180 + i * 30,
        to: 820 + (i % 2) * 120,
        dur: 0.09,
        vol: 0.16,
        type: 'triangle',
        delay: i * 0.1,
        vibrato: [30, 20],
      });
    }
  }

  boop() {
    this.tone({ freq: 420, to: 880, dur: 0.09, vol: 0.3, type: 'sine' });
    this.tone({ freq: 1320, to: 1760, dur: 0.06, vol: 0.08, type: 'sine', delay: 0.03 });
  }

  pop(pitch = 1) {
    this.tone({ freq: 700 * pitch, to: 220 * pitch, dur: 0.09, vol: 0.28 });
    this.burst({ dur: 0.04, type: 'highpass', freq: 3000, vol: 0.2 });
  }

  sparkle() {
    [0, 4, 7, 12, 16].forEach((n, i) => {
      this.tone({ freq: 880 * Math.pow(2, n / 12), dur: 0.22, vol: 0.09, type: 'triangle', delay: i * 0.055 });
    });
  }

  levelUp() {
    [0, 4, 7, 12, 7, 12, 16].forEach((n, i) => {
      this.tone({ freq: 523 * Math.pow(2, n / 12), dur: 0.28, vol: 0.16, type: 'triangle', delay: i * 0.09 });
      this.tone({ freq: 523 * Math.pow(2, n / 12) * 2, dur: 0.2, vol: 0.05, type: 'sine', delay: i * 0.09 });
    });
  }

  bell() {
    const ctx = this.ensure();
    if (!ctx) return;
    const now = performance.now();
    if (now - this.lastBell < 110) return;
    this.lastBell = now;
    const base = 1900 + Math.random() * 200;
    this.tone({ freq: base, dur: 0.35, vol: 0.05 });
    this.tone({ freq: base * 1.5, dur: 0.25, vol: 0.035 });
    this.tone({ freq: base * 2.4, dur: 0.15, vol: 0.02 });
  }

  splash() {
    this.burst({ dur: 0.35, type: 'bandpass', freq: 1200, to: 500, q: 0.6, vol: 0.2 });
  }

  scrub() {
    this.burst({ dur: 0.12, type: 'bandpass', freq: 2200, q: 0.9, vol: 0.09 });
  }

  bubble() {
    const f = 500 + Math.random() * 500;
    this.tone({ freq: f, to: f * 1.8, dur: 0.07, vol: 0.09 });
  }

  plop() {
    this.tone({ freq: 220, to: 70, dur: 0.16, vol: 0.32 });
    this.burst({ dur: 0.1, type: 'lowpass', freq: 500, vol: 0.25 });
  }

  yawn() {
    this.tone({ freq: 380, to: 150, dur: 1.1, vol: 0.17, type: 'sawtooth', filter: 900, attack: 0.35, vibrato: [4, 10] });
  }

  snore() {
    this.tone({ freq: 90, to: 55, dur: 0.9, vol: 0.2, type: 'sawtooth', filter: 300, attack: 0.4, vibrato: [11, 12] });
  }

  tummy() {
    this.tone({ freq: 70, to: 48, dur: 0.75, vol: 0.34, type: 'sawtooth', filter: 260, attack: 0.15, vibrato: [14, 14] });
    this.tone({ freq: 95, to: 60, dur: 0.5, vol: 0.2, type: 'sawtooth', filter: 260, attack: 0.1, delay: 0.5, vibrato: [11, 10] });
  }

  purr() {
    this.tone({ freq: 62, dur: 0.6, vol: 0.2, type: 'sawtooth', filter: 240, attack: 0.15, vibrato: [24, 16] });
  }

  nope() {
    this.tone({ freq: 330, to: 250, dur: 0.14, vol: 0.2, type: 'triangle' });
    this.tone({ freq: 300, to: 200, dur: 0.18, vol: 0.2, type: 'triangle', delay: 0.16 });
  }

  boing() {
    this.tone({ freq: 220, to: 620, dur: 0.14, vol: 0.22, type: 'sine', vibrato: [18, 30] });
  }

  burp() {
    this.tone({ freq: 130, to: 62, dur: 0.38, vol: 0.32, type: 'sawtooth', filter: 420, vibrato: [30, 18] });
  }

  spicy() {
    this.burst({ dur: 0.9, type: 'highpass', freq: 3200, q: 0.5, vol: 0.13 });
    this.tone({ freq: 500, to: 1500, dur: 0.6, vol: 0.12, type: 'sawtooth', filter: 2200, vibrato: [16, 40] });
  }

  kick() {
    this.tone({ freq: 240, to: 90, dur: 0.12, vol: 0.4 });
    this.burst({ dur: 0.05, type: 'lowpass', freq: 900, vol: 0.25 });
  }

  bounce() {
    this.tone({ freq: 180, to: 110, dur: 0.09, vol: 0.14 });
  }

  whoosh() {
    this.burst({ dur: 0.25, type: 'bandpass', freq: 500, to: 1800, q: 0.8, vol: 0.1 });
  }

  wear() {
    this.tone({ freq: 660, to: 990, dur: 0.1, vol: 0.14, type: 'triangle' });
    this.tone({ freq: 990, to: 1320, dur: 0.12, vol: 0.12, type: 'triangle', delay: 0.07 });
  }

  click() {
    this.tone({ freq: 900, to: 600, dur: 0.05, vol: 0.1, type: 'triangle' });
  }

  wakeUp() {
    this.tone({ freq: 400, to: 700, dur: 0.18, vol: 0.14, type: 'triangle' });
    this.tone({ freq: 600, to: 900, dur: 0.18, vol: 0.12, type: 'triangle', delay: 0.14 });
  }

  lullaby() {
    [0, 4, 7, 4, 0].forEach((n, i) => {
      this.tone({ freq: 440 * Math.pow(2, n / 12), dur: 0.5, vol: 0.06, type: 'sine', delay: i * 0.28, attack: 0.05 });
    });
  }
}

export const sfx = new Sfx();
