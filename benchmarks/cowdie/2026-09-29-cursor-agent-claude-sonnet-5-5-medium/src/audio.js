let ctx = null;
let master = null;
let muted = localStorage.getItem('cowdie-muted') === '1';

function ac() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = 0.55;
    master.connect(ctx.destination);
  }
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

function tone({ type = 'sine', f0, f1 = f0, dur = 0.2, gain = 0.25, delay = 0, attack = 0.01, lp = 0, vib = 0 }) {
  const c = ac();
  if (!c || muted) return;
  const t = c.currentTime + delay;
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = type;
  o.frequency.setValueAtTime(f0, t);
  o.frequency.exponentialRampToValueAtTime(Math.max(1, f1), t + dur);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(gain, t + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  let node = o;
  if (lp) {
    const f = c.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.setValueAtTime(lp * 0.6, t);
    f.frequency.linearRampToValueAtTime(lp, t + dur * 0.35);
    f.frequency.linearRampToValueAtTime(lp * 0.5, t + dur);
    o.connect(f);
    node = f;
  }
  if (vib) {
    const l = c.createOscillator();
    const lg = c.createGain();
    l.frequency.value = 6;
    lg.gain.value = vib;
    l.connect(lg).connect(o.frequency);
    l.start(t);
    l.stop(t + dur + 0.05);
  }
  node.connect(g).connect(master);
  o.start(t);
  o.stop(t + dur + 0.05);
}

function noise({ dur = 0.08, freq = 900, q = 1.2, gain = 0.3, delay = 0, type = 'bandpass' }) {
  const c = ac();
  if (!c || muted) return;
  const t = c.currentTime + delay;
  const len = Math.floor(c.sampleRate * dur);
  const buf = c.createBuffer(1, len, c.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
  const s = c.createBufferSource();
  s.buffer = buf;
  const f = c.createBiquadFilter();
  f.type = type;
  f.frequency.value = freq;
  f.Q.value = q;
  const g = c.createGain();
  g.gain.value = gain;
  s.connect(f).connect(g).connect(master);
  s.start(t);
}

export const sfx = {
  get muted() { return muted; },
  setMuted(v) { muted = v; localStorage.setItem('cowdie-muted', v ? '1' : '0'); },
  unlock() { ac(); },
  moo(pitch = 1) {
    tone({ type: 'sawtooth', f0: 150 * pitch, f1: 105 * pitch, dur: 1.0, gain: 0.32, attack: 0.09, lp: 1100, vib: 5 });
    tone({ type: 'triangle', f0: 300 * pitch, f1: 210 * pitch, dur: 1.0, gain: 0.12, attack: 0.09, lp: 900 });
  },
  squeak() { tone({ type: 'triangle', f0: 620, f1: 980, dur: 0.14, gain: 0.2 }); },
  munch() {
    noise({ dur: 0.07, freq: 1100, q: 0.9, gain: 0.55 });
    noise({ dur: 0.07, freq: 700, q: 0.9, gain: 0.45, delay: 0.14 });
    noise({ dur: 0.07, freq: 1000, q: 0.9, gain: 0.5, delay: 0.28 });
  },
  gulp() { tone({ type: 'sine', f0: 260, f1: 90, dur: 0.22, gain: 0.35 }); },
  pop() { tone({ type: 'sine', f0: 420, f1: 900, dur: 0.1, gain: 0.25 }); },
  boing() { tone({ type: 'sine', f0: 200, f1: 520, dur: 0.22, gain: 0.25, vib: 30 }); },
  thud() { tone({ type: 'sine', f0: 110, f1: 45, dur: 0.16, gain: 0.35 }); },
  purr() { tone({ type: 'sawtooth', f0: 48, f1: 44, dur: 0.5, gain: 0.16, lp: 200, vib: 12 }); },
  splash() { noise({ dur: 0.9, freq: 3800, q: 0.5, gain: 0.25, type: 'highpass' }); },
  nope() {
    tone({ type: 'square', f0: 220, f1: 180, dur: 0.12, gain: 0.1 });
    tone({ type: 'square', f0: 200, f1: 150, dur: 0.16, gain: 0.1, delay: 0.14 });
  },
  chime() {
    [523, 659, 784, 1046].forEach((f, i) => tone({ type: 'triangle', f0: f, f1: f, dur: 0.35, gain: 0.2, delay: i * 0.09 }));
  },
  yawn() { tone({ type: 'sawtooth', f0: 210, f1: 120, dur: 1.2, gain: 0.14, attack: 0.4, lp: 700 }); },
  burp() { tone({ type: 'sawtooth', f0: 90, f1: 55, dur: 0.35, gain: 0.3, lp: 400, vib: 40 }); },
};
