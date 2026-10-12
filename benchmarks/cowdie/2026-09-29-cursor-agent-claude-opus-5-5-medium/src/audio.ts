interface ToneOpts {
  f: number;
  to?: number;
  dur: number;
  type?: OscillatorType;
  vol?: number;
  delay?: number;
  attack?: number;
}

interface NoiseOpts {
  dur: number;
  vol?: number;
  freq?: number;
  to?: number;
  q?: number;
  type?: BiquadFilterType;
  delay?: number;
  attack?: number;
}

export class Sfx {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private noiseBuf: AudioBuffer | null = null;
  muted = false;

  ensure() {
    if (!this.ctx) {
      const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AC) return;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = this.muted ? 0 : 0.5;
      this.master.connect(this.ctx.destination);
      const len = this.ctx.sampleRate;
      this.noiseBuf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
      const d = this.noiseBuf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    }
    if (this.ctx.state === 'suspended') void this.ctx.resume();
  }

  setMuted(m: boolean) {
    this.muted = m;
    if (this.master && this.ctx) this.master.gain.setTargetAtTime(m ? 0 : 0.5, this.ctx.currentTime, 0.05);
  }

  private tone(o: ToneOpts) {
    const c = this.ctx;
    if (!c || !this.master || this.muted) return;
    const t0 = c.currentTime + (o.delay ?? 0);
    const osc = c.createOscillator();
    osc.type = o.type ?? 'sine';
    osc.frequency.setValueAtTime(o.f, t0);
    if (o.to) osc.frequency.exponentialRampToValueAtTime(o.to, t0 + o.dur);
    const g = c.createGain();
    const v = o.vol ?? 0.25;
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(v, t0 + (o.attack ?? 0.01));
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + o.dur);
    osc.connect(g).connect(this.master);
    osc.start(t0);
    osc.stop(t0 + o.dur + 0.05);
  }

  private noise(o: NoiseOpts) {
    const c = this.ctx;
    if (!c || !this.master || !this.noiseBuf || this.muted) return;
    const t0 = c.currentTime + (o.delay ?? 0);
    const src = c.createBufferSource();
    src.buffer = this.noiseBuf;
    src.loop = true;
    const f = c.createBiquadFilter();
    f.type = o.type ?? 'lowpass';
    f.frequency.setValueAtTime(o.freq ?? 1000, t0);
    if (o.to) f.frequency.exponentialRampToValueAtTime(o.to, t0 + o.dur);
    f.Q.value = o.q ?? 1;
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(o.vol ?? 0.2, t0 + (o.attack ?? 0.01));
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + o.dur);
    src.connect(f).connect(g).connect(this.master);
    src.start(t0, Math.random() * 0.5);
    src.stop(t0 + o.dur + 0.05);
  }

  moo(pitch = 1, len = 0.85, vol = 0.32) {
    const c = this.ctx;
    if (!c || !this.master || this.muted) return;
    const t0 = c.currentTime;
    const filter = c.createBiquadFilter();
    filter.type = 'lowpass';
    filter.Q.value = 5;
    filter.frequency.setValueAtTime(420, t0);
    filter.frequency.exponentialRampToValueAtTime(1500 * pitch, t0 + len * 0.3);
    filter.frequency.exponentialRampToValueAtTime(500, t0 + len);
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(vol, t0 + 0.1);
    g.gain.setValueAtTime(vol * 0.85, t0 + len * 0.7);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + len);
    const lfo = c.createOscillator();
    lfo.frequency.value = 5.5;
    const lfoGain = c.createGain();
    lfoGain.gain.value = 5 * pitch;
    lfo.connect(lfoGain);
    for (const detune of [1, 1.012]) {
      const o = c.createOscillator();
      o.type = 'sawtooth';
      const base = 165 * pitch * detune;
      o.frequency.setValueAtTime(base * 0.85, t0);
      o.frequency.exponentialRampToValueAtTime(base * 1.15, t0 + len * 0.25);
      o.frequency.exponentialRampToValueAtTime(base * 0.72, t0 + len);
      lfoGain.connect(o.frequency);
      o.connect(filter);
      o.start(t0);
      o.stop(t0 + len + 0.05);
    }
    lfo.start(t0);
    lfo.stop(t0 + len + 0.05);
    filter.connect(g).connect(this.master);
  }

  chomp() {
    this.noise({ dur: 0.1, vol: 0.45, freq: 1100, type: 'lowpass', q: 2 });
    this.tone({ f: 140, to: 60, dur: 0.09, type: 'square', vol: 0.06 });
  }
  pop() {
    this.tone({ f: 420, to: 1100, dur: 0.12, vol: 0.25 });
  }
  boing() {
    this.tone({ f: 200, to: 560, dur: 0.22, type: 'triangle', vol: 0.22 });
  }
  kick() {
    this.noise({ dur: 0.12, vol: 0.35, freq: 500, type: 'lowpass' });
    this.tone({ f: 160, to: 55, dur: 0.14, vol: 0.3 });
  }
  heart() {
    this.tone({ f: 880, dur: 0.12, vol: 0.12 });
    this.tone({ f: 1320, dur: 0.2, vol: 0.12, delay: 0.08 });
  }
  sparkle() {
    [1320, 1760, 2093, 2637].forEach((f, i) => this.tone({ f, dur: 0.14, type: 'triangle', vol: 0.08, delay: i * 0.05 }));
  }
  levelUp() {
    [523, 659, 784, 1047, 1319].forEach((f, i) => this.tone({ f, dur: 0.22, type: 'square', vol: 0.07, delay: i * 0.09 }));
  }
  yuck() {
    this.tone({ f: 320, to: 140, dur: 0.35, type: 'square', vol: 0.08 });
  }
  hot() {
    this.noise({ dur: 0.9, vol: 0.2, freq: 2500, to: 5000, type: 'highpass', attack: 0.05 });
    this.tone({ f: 700, to: 1500, dur: 0.5, type: 'square', vol: 0.06 });
  }
  plop() {
    this.tone({ f: 320, to: 70, dur: 0.22, vol: 0.32 });
    this.noise({ dur: 0.15, vol: 0.2, freq: 300, delay: 0.03 });
  }
  squeak() {
    this.tone({ f: 1100 + Math.random() * 500, to: 1900, dur: 0.07, vol: 0.06 });
  }
  snore() {
    this.noise({ dur: 1.3, vol: 0.09, freq: 260, to: 180, attack: 0.6, q: 4 });
  }
  growl() {
    this.tone({ f: 75, to: 52, dur: 0.8, type: 'sawtooth', vol: 0.05, attack: 0.2 });
    this.noise({ dur: 0.8, vol: 0.12, freq: 180, attack: 0.2 });
  }
  whoosh() {
    this.noise({ dur: 0.3, vol: 0.18, freq: 400, to: 2400, type: 'bandpass', q: 3 });
  }
  splash() {
    this.noise({ dur: 0.5, vol: 0.2, freq: 3000, to: 800, type: 'bandpass', q: 1 });
  }
  bell() {
    this.tone({ f: 1760, dur: 0.5, vol: 0.06 });
    this.tone({ f: 2640, dur: 0.35, vol: 0.03 });
  }
  giggle() {
    [900, 1100, 950, 1200].forEach((f, i) => this.tone({ f, to: f * 1.2, dur: 0.08, type: 'triangle', vol: 0.08, delay: i * 0.09 }));
  }
  yawn() {
    this.moo(0.75, 1.4, 0.22);
  }
}
