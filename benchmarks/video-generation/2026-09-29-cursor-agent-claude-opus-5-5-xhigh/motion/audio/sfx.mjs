// Procedural sound design for the Lumail launch video. Writes audio/sfx.wav (48 kHz, stereo, 16-bit).
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const SR = 48000;
const DUR = 45;
const N = SR * DUR;
const L = new Float32Array(N);
const R = new Float32Array(N);

let seed = 20260929;
const rnd = () => {
  seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
  return seed / 4294967296;
};
const noise = () => rnd() * 2 - 1;
const TAU = Math.PI * 2;

const add = (i, v, pan = 0) => {
  if (i < 0 || i >= N) return;
  const a = ((pan + 1) * Math.PI) / 4;
  L[i] += v * Math.cos(a) * Math.SQRT2;
  R[i] += v * Math.sin(a) * Math.SQRT2;
};

const coeffs = (type, f, q) => {
  const w = (TAU * Math.min(f, SR * 0.45)) / SR;
  const cos = Math.cos(w);
  const alpha = Math.sin(w) / (2 * q);
  let b0, b1, b2;
  if (type === 'bp') [b0, b1, b2] = [alpha, 0, -alpha];
  else if (type === 'lp') [b0, b1, b2] = [(1 - cos) / 2, 1 - cos, (1 - cos) / 2];
  else [b0, b1, b2] = [(1 + cos) / 2, -(1 + cos), (1 + cos) / 2];
  const a0 = 1 + alpha;
  return {b0: b0 / a0, b1: b1 / a0, b2: b2 / a0, a1: (-2 * cos) / a0, a2: (1 - alpha) / a0};
};
class Biquad {
  x1 = 0;
  x2 = 0;
  y1 = 0;
  y2 = 0;
  run(c, x) {
    const y = c.b0 * x + c.b1 * this.x1 + c.b2 * this.x2 - c.a1 * this.y1 - c.a2 * this.y2;
    this.x2 = this.x1;
    this.x1 = x;
    this.y2 = this.y1;
    this.y1 = y;
    return y;
  }
}
const expLerp = (a, b, k) => a * Math.pow(b / a, k);
const idx = (t) => Math.round(t * SR);

// ---------- instruments ----------

const click = (t, g = 0.5, pan = 0) => {
  const i0 = idx(t);
  const hp = new Biquad();
  const c = coeffs('hp', 2200, 0.7);
  for (let n = 0; n < SR * 0.02; n++) {
    const e = Math.exp(-n / (SR * 0.0016));
    add(i0 + n, hp.run(c, noise()) * e * g, pan);
    add(i0 + n, Math.sin((TAU * 1500 * n) / SR) * Math.exp(-n / (SR * 0.005)) * g * 0.35, pan);
  }
  // release click
  const i1 = i0 + idx(0.085);
  const hp2 = new Biquad();
  for (let n = 0; n < SR * 0.012; n++) add(i1 + n, hp2.run(c, noise()) * Math.exp(-n / (SR * 0.001)) * g * 0.45, pan);
};

const tick = (t, g = 0.18, f0 = 4200, pan = 0, q = 5) => {
  const i0 = idx(t);
  const bp = new Biquad();
  const c = coeffs('bp', f0, q);
  for (let n = 0; n < SR * 0.014; n++) add(i0 + n, bp.run(c, noise()) * Math.exp(-n / (SR * 0.0014)) * g * 4, pan);
};

const pop = (t, f0 = 700, g = 0.35, pan = 0, decay = 0.05) => {
  const i0 = idx(t);
  let ph = 0;
  for (let n = 0; n < SR * decay * 6; n++) {
    const f = f0 * (1 + 1.4 * Math.exp(-n / (SR * 0.01)));
    ph += (TAU * f) / SR;
    const e = Math.min(1, n / (SR * 0.0015)) * Math.exp(-n / (SR * decay));
    add(i0 + n, (Math.sin(ph) + 0.18 * Math.sin(2 * ph)) * e * g, pan);
  }
};

const thock = (t, f0 = 200, g = 0.45, pan = 0) => {
  const i0 = idx(t);
  let ph = 0;
  const lp = new Biquad();
  const c = coeffs('lp', 1800, 0.8);
  for (let n = 0; n < SR * 0.25; n++) {
    const f = f0 * (1 + 0.9 * Math.exp(-n / (SR * 0.012)));
    ph += (TAU * f) / SR;
    const e = Math.min(1, n / (SR * 0.001)) * Math.exp(-n / (SR * 0.045));
    add(i0 + n, (Math.sin(ph) * e + lp.run(c, noise()) * Math.exp(-n / (SR * 0.004)) * 0.5) * g, pan);
  }
};

const whoosh = (t, dur, g = 0.3, f0 = 300, f1 = 3500, pan0 = 0, pan1 = 0, peak = 0.6) => {
  const i0 = idx(t);
  const len = idx(dur);
  const bp = [new Biquad(), new Biquad()];
  let c = coeffs('bp', f0, 1.1);
  for (let n = 0; n < len; n++) {
    const x = n / len;
    if (n % 32 === 0) c = coeffs('bp', expLerp(f0, f1, x), 1.1);
    const e = x < peak ? Math.pow(x / peak, 2) : Math.pow((1 - x) / (1 - peak), 1.6);
    const s = bp[0].run(c, noise());
    const s2 = bp[1].run(c, noise());
    const p = pan0 + (pan1 - pan0) * x;
    add(i0 + n, s * e * g * 2.2, Math.max(-1, p - 0.25));
    add(i0 + n, s2 * e * g * 2.2, Math.min(1, p + 0.25));
  }
};

const riser = (t0, t1, g = 0.3) => {
  const i0 = idx(t0);
  const len = idx(t1 - t0);
  const bp = new Biquad();
  const lp = new Biquad();
  let c = coeffs('bp', 200, 2);
  let cl = coeffs('lp', 400, 0.7);
  const phs = [0, 0, 0];
  for (let n = 0; n < len; n++) {
    const x = n / len;
    if (n % 32 === 0) {
      c = coeffs('bp', expLerp(250, 7000, x), 1.6);
      cl = coeffs('lp', expLerp(500, 9000, x), 0.9);
    }
    const e = Math.pow(x, 2.2);
    let saw = 0;
    [0.994, 1, 1.007].forEach((d, k) => {
      const f = expLerp(110, 880, Math.pow(x, 1.4)) * d;
      phs[k] = (phs[k] + f / SR) % 1;
      saw += 2 * phs[k] - 1;
    });
    const trem = 0.75 + 0.25 * Math.sin(TAU * expLerp(4, 22, x) * (n / SR));
    const v = (bp.run(c, noise()) * 1.8 + lp.run(cl, saw / 3) * 0.35) * e * g * trem;
    add(i0 + n, v, -0.3);
    add(i0 + n, v * 0.95, 0.3);
  }
};

const impact = (t, g = 1, tail = 1.4) => {
  const i0 = idx(t);
  let ph = 0;
  for (let n = 0; n < SR * 1.3; n++) {
    const f = 34 + 70 * Math.exp(-n / (SR * 0.07));
    ph += (TAU * f) / SR;
    const e = Math.min(1, n / (SR * 0.002)) * Math.exp(-n / (SR * 0.42));
    add(i0 + n, Math.sin(ph) * e * g * 0.95, 0);
  }
  const lps = [new Biquad(), new Biquad()];
  let c = coeffs('lp', 9000, 0.7);
  for (let n = 0; n < SR * tail; n++) {
    const x = n / (SR * tail);
    if (n % 32 === 0) c = coeffs('lp', expLerp(9000, 250, Math.min(1, x * 1.6)), 0.7);
    const e = Math.exp(-n / (SR * 0.09)) + 0.18 * Math.exp(-n / (SR * 0.55));
    add(i0 + n, lps[0].run(c, noise()) * e * g * 0.55, -0.6);
    add(i0 + n, lps[1].run(c, noise()) * e * g * 0.55, 0.6);
  }
  const hp = new Biquad();
  const ch = coeffs('hp', 1500, 0.7);
  for (let n = 0; n < SR * 0.01; n++) add(i0 + n, hp.run(ch, noise()) * Math.exp(-n / (SR * 0.0015)) * g * 0.8, 0);
};

const bell = (t, f, g = 0.2, pan = 0, tau = 0.6) => {
  const i0 = idx(t);
  const parts = [
    [1, 1, 1],
    [2.0, 0.28, 0.6],
    [2.76, 0.16, 0.4],
    [5.4, 0.06, 0.25],
  ];
  for (let n = 0; n < SR * tau * 5; n++) {
    const a = Math.min(1, n / (SR * 0.003));
    let v = 0;
    for (const [m, amp, tm] of parts) v += Math.sin((TAU * f * m * n) / SR) * amp * Math.exp(-n / (SR * tau * tm));
    add(i0 + n, v * a * g, pan);
  }
};
const chime = (t, freqs, g = 0.18, spacing = 0.07, pan = 0) =>
  freqs.forEach((f, k) => bell(t + k * spacing, f, g, pan + (k - (freqs.length - 1) / 2) * 0.2));

const shimmer = (t, dur, g = 0.08, count = 36) => {
  for (let k = 0; k < count; k++) bell(t + rnd() * dur, 1800 + rnd() * 5200, g * (0.5 + rnd() * 0.5), noise() * 0.8, 0.12 + rnd() * 0.12);
};

const square = (t, f, dur, g = 0.12, pan = 0) => {
  const i0 = idx(t);
  const lp = new Biquad();
  const c = coeffs('lp', 3200, 0.7);
  for (let n = 0; n < SR * (dur + 0.03); n++) {
    const x = n / SR;
    const e = Math.min(1, x / 0.002) * (x < dur ? 1 : Math.exp(-(x - dur) / 0.008)) * Math.exp(-x / 0.4);
    const v = ((f * x) % 1 < 0.5 ? 1 : -1) * e;
    add(i0 + n, lp.run(c, v) * g, pan);
  }
};
const errorDing = (t, pan = 0) => {
  square(t, 587, 0.07, 0.1, pan);
  square(t + 0.07, 392, 0.14, 0.1, pan);
};

const zap = (t, g = 0.35) => {
  const i0 = idx(t);
  let ph = 0;
  for (let n = 0; n < SR * 0.4; n++) {
    const x = n / (SR * 0.4);
    const f = expLerp(2400, 50, Math.min(1, x * 1.3));
    ph += (TAU * f) / SR;
    const e = Math.exp(-x * 4) * Math.min(1, n / (SR * 0.002));
    add(i0 + n, (Math.sin(ph) * 0.8 + noise() * 0.15 * Math.exp(-x * 12)) * e * g, 0);
  }
};

const pad = (t0, t1, freqs, g = 0.05) => {
  const i0 = idx(t0);
  const len = idx(t1 - t0);
  freqs.forEach((f0, k) => {
    const lp = new Biquad();
    const c = coeffs('lp', 1400, 0.6);
    const phs = [rnd(), rnd(), rnd()];
    for (let n = 0; n < len; n++) {
      const x = n / SR;
      const e = Math.min(1, x / 0.8) * Math.min(1, (len - n) / (SR * 1.0));
      let saw = 0;
      [0.996, 1, 1.004].forEach((d, j) => {
        phs[j] = (phs[j] + (f0 * d) / SR) % 1;
        saw += 2 * phs[j] - 1;
      });
      add(i0 + n, lp.run(c, saw / 3) * e * g, k % 2 ? 0.35 : -0.35);
    }
  });
};

const typing = (t0, t1, cps, g = 0.12, pan = 0) => {
  for (let t = t0; t < t1; t += (1 / cps) * (0.75 + rnd() * 0.5)) tick(t, g * (0.6 + rnd() * 0.5), 2600 + rnd() * 2400, pan + noise() * 0.1, 3);
};

const rollTicks = (t0, t1, rate, g = 0.08, f0 = 3200) => {
  for (let t = t0; t < t1; t += 1 / rate) tick(t, g, f0 + noise() * 300, noise() * 0.3);
};

// ---------- cues (seconds, video timeline) ----------

// 0–5 problem
pop(0.0, 1300, 0.22, 0, 0.03);
[0.22, 0.42, 0.78, 0.92, 1.06].forEach((t, i) => thock(t, 170 + i * 12, 0.22, (i % 2 ? 0.2 : -0.2)));
[1.5, 1.61, 1.72].forEach((t, i) => square(t, 523 * [1, 1.26, 1.5][i], 0.05, 0.07));
whoosh(1.85, 0.6, 0.18, 400, 2500, 0, 0);
[2.0, 2.11, 2.22, 2.33, 2.44].forEach((t) => tick(t, 0.1, 1800, 0, 2));
errorDing(2.75, -0.15);
errorDing(2.95, 0.05);
errorDing(3.12, 0.25);
whoosh(3.2, 0.5, 0.08, 800, 3000, 0.6, 0.5);
click(3.78, 0.55, 0.5);
zap(3.86, 0.3);
riser(4.1, 5.0, 0.32);
impact(5.0, 1.0);

// 5–11 reveal
whoosh(5.02, 0.35, 0.14, 2500, 600, 0, 0);
whoosh(5.55, 0.55, 0.16, 1800, 300, 0, 0);
pop(5.9, 420, 0.25, 0, 0.06);
whoosh(6.25, 0.45, 0.14, 500, 2600, 0.2, -0.3);
whoosh(7.4, 0.6, 0.12, 400, 3000, 0, 0);
thock(7.85, 210, 0.2, -0.3);
pop(7.97, 880, 0.26, -0.1, 0.05);
bell(7.99, 1760, 0.05, -0.1, 0.4);
thock(8.12, 230, 0.2, 0.2);
[8.26, 8.33, 8.4, 8.47].forEach((t, i) => thock(t, 240 + i * 15, 0.14, -0.3 + i * 0.2));
pop(8.62, 660, 0.26, 0.1, 0.05);
thock(8.78, 260, 0.22, 0.3);
shimmer(9.15, 0.5, 0.035, 14);
whoosh(10.4, 0.55, 0.14, 3000, 600, 0, 0);

// 11–17 agent
whoosh(11.05, 0.7, 0.2, 300, 2200, 0.8, 0.3);
[12.1, 12.18, 12.26, 12.34].forEach((t, i) => pop(t, 520 * Math.pow(1.122, i * 2), 0.14, -0.6 + i * 0.1, 0.04));
typing(11.8, 13.0, 40, 0.11, 0.35);
[13.1, 13.8, 14.5].forEach((t, i) => {
  thock(t, 250 + i * 30, 0.2, 0.35);
  rollTicks(t + 0.32, t + 0.7, 30, 0.05, 3600);
  bell(t + 0.33, [1175, 1319, 1480][i], 0.07, 0.35, 0.35);
});
chime(15.3, [1319, 1760], 0.11, 0.08, 0.35);
typing(15.85, 16.75, 34, 0.09, 0.35);
whoosh(16.55, 0.47, 0.22, 400, 5000, 0.3, 0);
impact(17.0, 0.75, 1.0);

// 17–23 editor
whoosh(17.05, 0.6, 0.14, 350, 2000, 0, 0);
typing(17.55, 18.35, 36, 0.11, 0);
pop(18.5, 760, 0.18, -0.3, 0.04);
click(19.12, 0.35, -0.3);
whoosh(19.16, 0.56, 0.05, 1200, 4000, -0.4, 0.2, 0.5);
pop(19.8, 980, 0.2, -0.3, 0.035);
click(20.36, 0.4, -0.2);
shimmer(20.42, 0.55, 0.06, 30);
whoosh(20.45, 0.5, 0.06, 2000, 7000, -0.3, 0.3, 0.4);
pop(21.0, 1040, 0.18, -0.3, 0.04);
bell(21.02, 2093, 0.05, -0.3, 0.35);
rollTicks(20.7, 21.1, 45, 0.04, 3800);
click(22.0, 0.45, 0.5);
chime(22.12, [1568, 2093], 0.1, 0.06, 0.5);
whoosh(22.55, 0.5, 0.2, 2800, 350, 0, 0);

// 23–29 workflow
[23.35, 23.48, 23.61, 23.74].forEach((t, i) => thock(t, 180 + i * 28, 0.26, -0.6 + i * 0.3));
[23.98, 24.06].forEach((t, i) => thock(t, 320 + i * 40, 0.2, 0.7));
click(24.32, 0.45, 0.7);
pop(24.42, 880, 0.22, 0.7, 0.05);
bell(24.44, 1760, 0.06, 0.7, 0.4);
pop(24.55, 1200, 0.12, -0.6, 0.03);
pop(24.95, 1000, 0.14, -0.3, 0.03);
whoosh(25.0, 0.45, 0.07, 1500, 4000, -0.3, -0.2);
for (let t = 25.4; t < 26.05; t += 0.065) tick(t, 0.07, 5200, 0, 8);
pop(26.2, 800, 0.14, 0.35, 0.03);
pop(26.3, 1320, 0.16, 0.4, 0.035);
whoosh(26.45, 0.3, 0.06, 1500, 3800, 0.4, 0.7);
chime(26.75, [1319, 1661], 0.09, 0.06, 0.7);
const YES = [0, 1, 3, 4, 6, 7, 8, 10, 11, 13, 14, 16];
for (let i = 0; i < 17; i++) tick(26.95 + i * 0.12 + 0.92, 0.06, YES.includes(i) ? 3600 : 2200, YES.includes(i) ? 0.6 : 0.8, 6);
whoosh(28.45, 0.6, 0.26, 180, 1400, 0, 0, 0.75);

// 29–34 transactional
typing(29.25, 30.85, 60, 0.08, 0.4);
chime(31.3, [1568], 0.07, 0.06, 0.4);
whoosh(31.5, 0.42, 0.2, 600, 7000, -0.7, -0.2, 0.8);
bell(31.9, 2349, 0.06, -0.4, 0.4);
chime(31.95, [1397, 1865], 0.12, 0.09, 0.45);
rollTicks(32.05, 32.55, 40, 0.05, 4200);
whoosh(33.45, 0.55, 0.22, 1400, 200, 0, 0, 0.5);

// 34–39 pricing
whoosh(34.25, 0.5, 0.1, 400, 2400, 0.6, 0.4);
whoosh(34.45, 0.5, 0.06, 1500, 4000, -0.5, 0.2, 0.5);
click(35.5, 0.4, -0.4);
[35.9, 36.12, 36.33, 36.55].forEach((t) => tick(t, 0.12, 2800, -0.3, 4));
rollTicks(35.65, 36.65, 26, 0.035, 5000);
whoosh(35.68, 0.52, 0.16, 500, 2800, 0.5, 0.6, 0.55);
pop(36.2, 620, 0.22, 0.6, 0.06);
bell(36.22, 1245, 0.06, 0.6, 0.45);
click(36.75, 0.25, -0.3);
rollTicks(36.9, 38.3, 22, 0.04, 3000);
pop(37.0, 1100, 0.2, 0.2, 0.05);
whoosh(38.6, 0.42, 0.18, 2500, 500, 0.3, -0.7);

// 39–42 migrate
riser(39.0, 41.98, 0.3);
[39.12, 39.46, 39.74, 39.98, 40.18, 40.34, 40.47, 40.58, 40.68].forEach((t, i) => tick(t, 0.17, 2200 + i * 260, 0.2, 4));
pop(40.68, 700, 0.24, 0.2, 0.05);
[39.3, 39.52, 39.72, 39.92, 40.14, 40.42].forEach((t) => tick(t, 0.08, 1600, -0.2, 5));
typing(39.45, 40.0, 60, 0.09, 0);
[40.1, 40.32, 40.54].forEach((t, i) => pop(t, 900 + i * 120, 0.12, 0.1, 0.03));
chime(40.85, [1760, 2217], 0.08, 0.06, 0);
whoosh(40.85, 0.3, 0.05, 1500, 5000, -0.4, 0.4, 0.4);
whoosh(41.55, 0.45, 0.2, 5000, 400, 0, 0, 0.8);

// 42–45 end card
impact(42.0, 1.15, 1.8);
bell(42.02, 440, 0.1, 0, 1.4);
bell(42.02, 880, 0.05, 0, 1.0);
whoosh(42.6, 0.45, 0.12, 400, 2400, -0.2, 0.3);
pad(42.2, 45.0, [220, 277.18, 329.63, 440], 0.035);
pop(43.3, 520, 0.24, 0, 0.06);
click(44.12, 0.5, 0.1);
pop(44.13, 660, 0.2, 0, 0.05);
chime(44.16, [880, 1109, 1319, 1760], 0.1, 0.05, 0);
shimmer(44.14, 0.6, 0.05, 30);

// ---------- write ----------
let peak = 0;
for (let i = 0; i < N; i++) peak = Math.max(peak, Math.abs(L[i]), Math.abs(R[i]));
// Soft-clip the bus: quiet UI sounds pass nearly untouched, impacts saturate instead of forcing global gain down.
const soft = (x) => 0.9 * Math.tanh(x / 0.9);
for (let i = 0; i < N; i++) {
  L[i] = soft(L[i]);
  R[i] = soft(R[i]);
}
const norm = 1;
const buf = Buffer.alloc(44 + N * 4);
buf.write('RIFF', 0);
buf.writeUInt32LE(36 + N * 4, 4);
buf.write('WAVE', 8);
buf.write('fmt ', 12);
buf.writeUInt32LE(16, 16);
buf.writeUInt16LE(1, 20);
buf.writeUInt16LE(2, 22);
buf.writeUInt32LE(SR, 24);
buf.writeUInt32LE(SR * 4, 28);
buf.writeUInt16LE(4, 32);
buf.writeUInt16LE(16, 34);
buf.write('data', 36);
buf.writeUInt32LE(N * 4, 40);
for (let i = 0; i < N; i++) {
  buf.writeInt16LE(Math.round(Math.max(-1, Math.min(1, L[i] * norm)) * 32767), 44 + i * 4);
  buf.writeInt16LE(Math.round(Math.max(-1, Math.min(1, R[i] * norm)) * 32767), 46 + i * 4);
}
const out = path.join(path.dirname(fileURLToPath(import.meta.url)), 'sfx.wav');
fs.writeFileSync(out, buf);
console.log(`wrote ${out} peak=${peak.toFixed(3)} norm=${norm.toFixed(3)}`);
