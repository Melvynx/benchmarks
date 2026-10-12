import { writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const SR = 48000, DUR = 45, N = SR * DUR;
const BPM = 128, BEAT = 60 / BPM, BAR = BEAT * 4, bt = (n) => n * BEAT;
const T = { s2: bt(8), s3: bt(16), s4: bt(30), s5: bt(42), s6: bt(54), s7a: bt(64), s7b: bt(72), s8a: bt(84), s8b: bt(90) };

let seed = 1337;
const rnd = () => { seed |= 0; seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
const noise = () => rnd() * 2 - 1;
const midi = (n) => 440 * Math.pow(2, (n - 69) / 12);
const TAU = Math.PI * 2;
const clamp = (x, a, b) => Math.min(b, Math.max(a, x));

const buf = () => new Float32Array(N);
const bus = { dry: [buf(), buf()], music: [buf(), buf()], fx: [buf(), buf()], rev: [buf(), buf()], arp: [buf(), buf()] };
const kicks = [];

function put(b, t0, data, gain = 1, pan = 0, revSend = 0) {
  const i0 = Math.round(t0 * SR);
  const gl = gain * Math.cos((pan + 1) * Math.PI / 4), gr = gain * Math.sin((pan + 1) * Math.PI / 4);
  for (let i = 0; i < data.length; i++) {
    const n = i0 + i; if (n < 0 || n >= N) continue;
    b[0][n] += data[i] * gl; b[1][n] += data[i] * gr;
    if (revSend) { bus.rev[0][n] += data[i] * revSend * gl; bus.rev[1][n] += data[i] * revSend * gr; }
  }
}
const mk = (dur, fn) => { const n = Math.round(dur * SR), o = new Float32Array(n); for (let i = 0; i < n; i++) o[i] = fn(i / SR, i); return o; };

/* ---------- filters ---------- */
function svfSweep(x, fcFn, q, mode) {
  let low = 0, band = 0; const o = new Float32Array(x.length);
  for (let i = 0; i < x.length; i++) {
    const f = 2 * Math.sin(Math.PI * clamp(fcFn(i / SR), 20, 9000) / SR);
    low += f * band; const high = x[i] - low - q * band; band += f * high;
    o[i] = mode === 'bp' ? band : mode === 'lp' ? low : high;
  }
  return o;
}
const svf = (x, fc, q, mode) => svfSweep(x, () => fc, q, mode);
function onePoleLP(x, fc) { const a = 1 - Math.exp(-TAU * fc / SR); let y = 0; const o = new Float32Array(x.length); for (let i = 0; i < x.length; i++) { y += a * (x[i] - y); o[i] = y; } return o; }

/* ---------- instruments ---------- */
function kick(t, g = 1) {
  const d = new Float32Array(Math.round(0.55 * SR));
  let ph = 0;
  for (let i = 0; i < d.length; i++) {
    const s = i / SR, f = 46 + 130 * Math.exp(-s / 0.026);
    ph += TAU * f / SR;
    const a = (1 - Math.exp(-s / 0.0012)) * Math.exp(-s / 0.19);
    d[i] = Math.tanh(1.7 * Math.sin(ph) * a) + (s < 0.004 ? noise() * 0.25 * (1 - s / 0.004) : 0);
  }
  put(bus.dry, t, d, 0.9 * g);
  kicks.push(t);
}
function clap(t, g = 1) {
  const n = noise; const x = mk(0.32, (s) => {
    const burst = [0, 0.011, 0.022].reduce((a, b) => a + (s >= b ? Math.exp(-(s - b) / 0.006) : 0), 0);
    return n() * (burst * 0.7 + Math.exp(-s / 0.09) * 0.5);
  });
  put(bus.dry, t, svf(x, 1700, 0.9, 'bp'), 1.5 * g, 0.05, 0.22);
}
function snare(t, g = 1) {
  const x = mk(0.3, (s) => noise() * Math.exp(-s / 0.07));
  const bp = svf(x, 2200, 0.7, 'bp');
  const tone = mk(0.2, (s) => Math.sin(TAU * 185 * s) * Math.exp(-s / 0.05) * 0.5);
  put(bus.dry, t, bp, 1.3 * g, 0, 0.15); put(bus.dry, t, tone, 0.5 * g);
}
function hat(t, g = 1, open = false) {
  const len = open ? 0.28 : 0.06, tau = open ? 0.08 : 0.014;
  const x = mk(len, (s) => noise() * Math.exp(-s / tau));
  put(bus.dry, t, svf(x, 7800, 0.6, 'hp'), 0.32 * g, 0.12);
}
function bass(t, note, dur, g = 1) {
  const f = midi(note);
  const d = mk(dur + 0.08, (s) => {
    const a = Math.min(1, s / 0.006) * (s < dur ? 1 : Math.max(0, 1 - (s - dur) / 0.08)) * (0.55 + 0.45 * Math.exp(-s / 0.09));
    return a * (Math.sin(TAU * f * s) + 0.45 * Math.sin(TAU * 2 * f * s) + 0.2 * Math.sin(TAU * 3 * f * s) + 0.55 * Math.sin(TAU * (f / 2) * s));
  });
  put(bus.music, t, onePoleLP(d, 900), 0.6 * g);
}
function padChord(t, notes, dur, g = 1) {
  for (const [ci, n] of notes.entries()) {
    for (const [k, det] of [[0, -6], [1, 6]]) {
      const f = midi(n) * Math.pow(2, det / 1200);
      const d = mk(dur + 0.6, (s) => {
        const a = Math.min(1, s / 0.45) * (s < dur ? 1 : Math.max(0, 1 - (s - dur) / 0.6));
        let v = 0; for (let h = 1; h <= 7; h++) v += Math.sin(TAU * f * h * s + h * 0.7) / Math.pow(h, 1.6);
        return v * a;
      });
      put(bus.music, t, onePoleLP(d, 2600), 0.075 * g, k ? 0.6 : -0.6, 0.35);
    }
  }
}
function pluck(t, note, g = 1, pan = 0) {
  const f = midi(note);
  const d = mk(0.9, (s) => {
    let v = 0;
    for (let h = 1; h <= 9; h++) { if (f * h > 10000) break; v += Math.sin(TAU * f * h * s) / Math.pow(h, 1.15) * Math.exp(-s / (0.42 / (1 + 0.55 * (h - 1)))); }
    return v * Math.min(1, s / 0.002);
  });
  put(bus.arp, t, d, 0.24 * g, pan, 0.3);
}
function riser(t0, t1, g = 1) {
  const dur = t1 - t0; const x = mk(dur, () => noise());
  const f = svfSweep(x, (s) => 250 * Math.pow(30, s / dur), 1.6, 'bp');
  for (let i = 0; i < f.length; i++) { const p = i / f.length; f[i] *= Math.pow(p, 2.2); }
  const tone = mk(dur, (s) => Math.sin(TAU * (180 * Math.pow(7, s / dur)) * s) * Math.pow(s / dur, 2) * 0.12);
  put(bus.fx, t0, f, 1.5 * g, 0, 0.2); put(bus.fx, t0, tone, g);
}
function whoosh(tc, dur = 0.7, up = true, g = 1) {
  const x = mk(dur, () => noise());
  const f = svfSweep(x, (s) => (up ? 400 * Math.pow(9, s / dur) : 3600 * Math.pow(0.11, s / dur)), 1.3, 'bp');
  for (let i = 0; i < f.length; i++) f[i] *= Math.pow(Math.sin(Math.PI * i / f.length), 2);
  put(bus.fx, tc - dur / 2, f, 1.0 * g, 0, 0.25);
}
function impact(t, g = 1) {
  const sub = mk(1.6, (s) => Math.sin(TAU * (34 + 40 * Math.exp(-s / 0.09)) * s) * Math.exp(-s / 0.45));
  put(bus.fx, t, sub, 1.1 * g);
  const boom = mk(0.9, (s) => noise() * Math.exp(-s / 0.18));
  put(bus.fx, t, svf(boom, 500, 0.6, 'lp'), 0.9 * g, 0, 0.3);
  const crash = mk(2.4, (s) => noise() * Math.exp(-s / 0.55));
  put(bus.fx, t, svf(crash, 5200, 0.5, 'hp'), 0.32 * g, 0, 0.45);
}
function tick(t, g = 1, f = 4200, pan = 0) {
  const x = mk(0.012, (s) => noise() * Math.exp(-s / 0.0028));
  const c = mk(0.012, (s) => Math.sin(TAU * 1900 * s) * Math.exp(-s / 0.0022));
  put(bus.fx, t, svf(x, f, 1.5, 'bp'), 0.5 * g, pan); put(bus.fx, t, c, 0.14 * g, pan);
}
function pop(t, f0 = 420, f1 = 900, g = 1, pan = 0) {
  let ph = 0; const d = mk(0.14, (s) => { const f = f0 + (f1 - f0) * (1 - Math.exp(-s / 0.025)); ph += TAU * f / SR; return Math.sin(ph) * Math.exp(-s / 0.045) * Math.min(1, s / 0.002); });
  put(bus.fx, t, d, 0.42 * g, pan, 0.15);
}
function chime(t, note, g = 1, pan = 0) {
  const f = midi(note);
  const d = mk(1.1, (s) => (Math.sin(TAU * f * s) * Math.exp(-s / 0.34) + 0.4 * Math.sin(TAU * f * 2.756 * s) * Math.exp(-s / 0.12) + 0.25 * Math.sin(TAU * f * 5.4 * s) * Math.exp(-s / 0.05)) * Math.min(1, s / 0.002));
  put(bus.fx, t, d, 0.26 * g, pan, 0.4);
}
function blip(t, g = 1) { const d = mk(0.07, (s) => Math.sin(TAU * 1180 * s) * Math.exp(-s / 0.018)); put(bus.fx, t, d, 0.2 * g, 0.1, 0.1); }
function zip(t, dur = 0.3, f0 = 500, f1 = 2600, g = 1, pan = 0) {
  let ph = 0; const d = mk(dur, (s) => { const p = s / dur; const f = f0 * Math.pow(f1 / f0, p); ph += TAU * f / SR; return Math.sin(ph) * Math.sin(Math.PI * p) * 0.5; });
  put(bus.fx, t, d, 0.3 * g, pan, 0.25);
}
function thunk(t, g = 1) {
  const d = mk(0.12, (s) => Math.sin(TAU * (160 - 90 * s / 0.12) * s) * Math.exp(-s / 0.03)); put(bus.fx, t, d, 0.6 * g);
  tick(t, 1.2 * g, 3000);
}
function shimmer(t, dur = 0.8, g = 1) {
  const d = mk(dur, (s) => { const p = s / dur; let v = 0; for (const k of [1, 1.5, 2, 3]) v += Math.sin(TAU * 520 * k * Math.pow(4, p) * s); return v * 0.18 * Math.sin(Math.PI * p) * (0.6 + 0.4 * Math.sin(TAU * 22 * s)); });
  put(bus.fx, t, d, 0.35 * g, 0, 0.4);
}
const SCALE = [72, 74, 76, 79, 81, 84, 86, 88];
const sc = (i) => SCALE[clamp(i, 0, SCALE.length - 1)];

/* ---------- music arrangement ---------- */
const CH = {
  Am: { r: 45, n: [57, 60, 64, 69], arp: [57, 60, 64, 72] },
  F: { r: 41, n: [53, 57, 60, 65], arp: [53, 57, 60, 69] },
  C: { r: 48, n: [55, 60, 64, 67], arp: [60, 64, 67, 72] },
  G: { r: 43, n: [55, 59, 62, 67], arp: [59, 62, 67, 71] },
};
const prog = ['Am', 'F', 'C', 'G'];
const chordAt = (bar) => (bar >= 22 ? 'C' : prog[bar % 4]);
const totalBars = DUR / BAR;

const FULL0 = T.s3, END_FULL = T.s8b;
for (let bar = 0; bar < totalBars; bar++) {
  const t0 = bar * BAR, ch = CH[chordAt(bar)];
  // pad
  if (t0 >= T.s2 - 0.01) padChord(t0, ch.n, BAR + 0.2, bar >= 22 ? 1.25 : 1);
  for (let b = 0; b < 4; b++) {
    const t = t0 + b * BEAT;
    // kick
    if (t < 1.8) { if (b === 0 && bar === 0) kick(t, 0.85); }
    else if (t >= T.s2 - 0.01 && t < FULL0 - 0.01) { if (b % 2 === 0) kick(t, 0.9); }
    else if (t >= FULL0 - 0.01 && t < END_FULL - 0.01) kick(t, 1);
    else if (t >= END_FULL - 0.01) { if (b % 2 === 0) kick(t, 0.95); }
    // clap
    if (t >= FULL0 - 0.01 && t < END_FULL - 0.01 && (b === 1 || b === 3)) clap(t, 1);
    if (t >= T.s2 + BAR - 0.01 && t < FULL0 - 0.01 && b === 3) clap(t, 0.6);
    // hats
    if (t >= 0.9 && t < T.s2 - 0.05) hat(t, 0.85 + b * 0.1);
    if (t >= T.s2 - 0.01 && t < END_FULL) { hat(t + BEAT / 2, 0.9); if (t >= FULL0) { hat(t + BEAT / 4, 0.32); hat(t + 3 * BEAT / 4, 0.32); } }
    if (t >= FULL0 - 0.01 && t < END_FULL && (b === 1 || b === 3)) hat(t + BEAT / 2, 0.8, true);
    // bass
    if (t >= T.s2 - 0.01 && t < END_FULL + 0.01) {
      const full = t >= FULL0 - 0.01;
      for (let e = 0; e < 2; e++) {
        const tt = t + e * BEAT / 2;
        if (!full && e === 0 && b % 2 === 1) continue;
        const oct = (b === 3 && e === 1) ? 12 : 0;
        bass(tt, ch.r + oct, BEAT / 2 * 0.82, full ? 1 : 0.75);
      }
    }
    if (t >= END_FULL - 0.01 && b === 0) bass(t, ch.r, BAR * 0.9, 1);
    // arp (8ths)
    if (t >= 0.9) {
      const seq = [0, 1, 2, 3, 2, 1, 2, 3];
      for (let e = 0; e < 2; e++) {
        const idx = seq[(b * 2 + e) % 8];
        const tt = t + e * BEAT / 2;
        const intro = tt < T.s2;
        if (intro && (b * 2 + e) % 2 === 1 && tt < 2.6) continue;
        pluck(tt, ch.arp[idx], (intro ? 0.95 : tt >= FULL0 ? 1 : 0.8) * (e === 0 ? 1 : 0.8), ((b * 2 + e) % 2 ? 0.35 : -0.35));
      }
    }
  }
}

/* transitions: whooshes, fills, riser & impacts */
riser(2.45, T.s2, 1.7);
impact(T.s2, 1);
[[T.s3, 'up'], [T.s4, 'left'], [T.s5, 'down'], [T.s6, 'right'], [T.s7a, 'left'], [T.s7b, 'down'], [T.s8a, 'up']].forEach(([t, d], i) => {
  whoosh(t, 0.76, i % 2 === 0, 1.1);
  hat(t - 0.02, 1.4, true);
  // 16th snare fill on the beat before the cut
  for (let k = 0; k < 4; k++) snare(t - BEAT + k * BEAT / 4 - 0.16, 0.3 + k * 0.16);
  if (t !== T.s3) pop(t + 0.02, 220, 110, 0.6);
});
riser(T.s8b - 0.7, T.s8b, 0.9);
whoosh(T.s8b, 0.7, true, 1.1);
impact(T.s8b, 1.05);
for (let k = 0; k < 4; k++) snare(T.s8b - BEAT + k * BEAT / 4 - 0.16, 0.3 + k * 0.16);

/* ---------- UI sound design (mirrors timeline.js) ---------- */
// S1: chips + strike
for (let i = 0; i < 7; i++) pop(0.32 + i * 0.09 + 0.12, 300 + i * 55, 620 + i * 90, 0.7, -0.6 + i * 0.2);
zip(1.3, 0.34, 700, 3200, 0.7);
for (let i = 0; i < 7; i++) zip(1.95 + i * 0.04 + 0.1, 0.35, 1200, 320, 0.25, -0.6 + i * 0.2);
// S2
zip(T.s2 + 0.12, 0.3, 500, 2400, 0.9);
zip(T.s2 + 0.38, 0.28, 800, 3000, 0.9);
chime(T.s2 + 0.7, 88, 0.7);
whoosh(bt(10) + 0.4, 0.8, true, 0.8);
pop(bt(11) + 0.1 + 0.35 + 0.05, 500, 1000, 0.9, -0.2); chime(bt(11) + 0.1 + 0.4, 84, 0.6, -0.2);
pop(bt(11) + 0.1 + 0.55 + 0.05, 560, 1100, 0.9, 0.2); chime(bt(11) + 0.1 + 0.6, 88, 0.6, 0.2);
for (let i = 0; i < 6; i++) tick(bt(11) + 0.1 + i * 0.09 + 0.15, 0.4, 5200);

const typeTicks = (t0, chars, cps, g = 0.5, every = 2) => { for (let i = 0; i < chars; i += every) tick(t0 + i / cps, g * (0.7 + 0.3 * rnd()), 3400 + rnd() * 2200, (rnd() - 0.5) * 0.3); };
const countTicks = (t0, dur, n = 10, g = 0.4, f0 = 3000) => { for (let i = 0; i < n; i++) { const p = i / (n - 1); tick(t0 + dur * (1 - Math.pow(1 - p, 1 / 3)), g, f0 + p * 2500); } };

// S3
let b = T.s3;
pop(b + 0.55 + 0.05, 500, 1000, 0.9); pop(b + 0.3 + 0.2, 200, 300, 0.4);
typeTicks(b + 0.95, 47, 64);
[[1.85, 2.2, 0], [2.75, 3.1, 1], [3.65, 4.0, 2]].forEach(([c, r, i]) => { blip(b + c + 0.05); chime(b + r + 0.05, sc(i + 1), 0.8, 0.2); countTicks(b + r, 0.5, 9, 0.3); });
typeTicks(b + 4.6, 42, 64, 0.5); chime(b + 4.6 + 42 / 64, 84, 0.8);
pop(b + 3.55 + 0.1, 300, 800, 1.2); chime(b + 3.55 + 0.2, 79, 0.9);
for (let i = 0; i < 6; i++) tick(b + 2.8 + i * 0.07 + 0.05, 0.4, 4800, -0.3 + i * 0.12);
// S4
b = T.s4;
typeTicks(b + 0.95, 18, 34, 0.5, 1);
pop(b + 1.5 + 0.05, 420, 900, 0.8);
for (let i = 0; i < 3; i++) tick(b + 1.7 + i * 0.09 + 0.1, 0.4, 3800);
pop(b + 2.15 + 0.1, 500, 1000, 0.8, -0.3); pop(b + 2.2 + 0.1, 520, 1040, 0.6, 0.3);
shimmer(b + 2.85, 0.85, 0.9);
zip(b + 2.35, 0.45, 500, 1800, 0.5);
whoosh(b + 3.75 + 0.25, 0.5, false, 0.6);
const tNew = b + 3.75 + 0.35;
typeTicks(tNew, 16, 38, 0.5, 1); typeTicks(tNew + 0.45, 30, 48, 0.5, 2);
pop(tNew + 0.75 + 0.1, 400, 900, 1); chime(tNew + 0.75 + 0.2, 84, 0.9); chime(tNew + 1.0, 88, 0.6);
// S5
b = T.s5;
for (let i = 0; i < 6; i++) pop(b + 0.55 + i * 0.1 + 0.08, 330 + i * 40, 700 + i * 60, 0.55, -0.7 + i * 0.28);
thunk(b + 1.35 + 0.1, 1); chime(b + 1.35 + 0.2, 79, 0.9);
chime(b + 1.65 + 0.05, sc(0), 0.8, -0.5);
[[1.75, 2.1, 1, -0.3], [2.45, 2.8, 2, -0.1], [3.15, 3.5, 3, 0.1], [3.85, 4.25, 4, 0.3]].forEach(([a, z, i, p]) => { zip(b + a, z - a, 600, 2200, 0.55, p); chime(b + z + 0.03, sc(i), 0.85, p); });
zip(b + 3.85, 0.4, 500, 1900, 0.4, -0.3);
chime(b + 4.28, sc(5), 0.6, -0.3);
// S6
b = T.s6;
[31, 26, 24, 34, 31, 42, 4].forEach((n, i) => typeTicks(b + 0.85 + i * 0.25, 10, 45, 0.45, 1));
blip(b + 2.7); chime(b + 2.75, 84, 0.9);
whoosh(b + 2.9 + 0.15, 0.36, true, 0.7); pop(b + 2.9 + 0.55, 300, 700, 0.6);
chime(b + 2.9 + 0.5, 91, 1.0, 0.3);
// S7a
b = T.s7a;
{ // slot machine ticks: one tick per name crossing (ease-out)
  const t0 = b + 0.35, t1 = b + 1.75; let last = 0;
  for (let i = 0; i <= 600; i++) { const p = i / 600, e = 1 - Math.pow(1 - p, 4), pos = e * 4 * 3; const k = Math.floor(pos); if (k > last) { last = k; tick(t0 + (t1 - t0) * p, 0.7, 2800 + k * 160, 0); } }
  pop(t1 + 0.05, 500, 1000, 0.7);
}
pop(b + 0.25 + 0.05, 380, 800, 0.7);
typeTicks(b + 0.6, 33, 66, 0.5);
[[1.2, 1.42, 0.55, 20], [1.72, 1.9, 0.3, 8], [2.1, 2.28, 0.2, 5]].forEach(([c, r, d, n], i) => { blip(b + c + 0.05); chime(b + r + 0.05, sc(i + 1), 0.7, 0.2); countTicks(b + r, d, n, 0.28); });
chime(b + 2.55 + 0.05, 79, 0.6);
pop(b + 2.5 + 0.1, 300, 800, 1.1); chime(b + 2.5 + 0.2, 84, 1.0); chime(b + 2.5 + 0.3, 91, 0.7);
// S7b
b = T.s7b;
whoosh(b + 0.7 + 0.2, 0.5, true, 0.5); whoosh(b + 0.9 + 0.2, 0.5, true, 0.5);
countTicks(b + 1.3, 1.6, 22, 0.35, 2500);
pop(b + 1.55 + 0.1, 400, 900, 0.8); chime(b + 1.55 + 0.2, 86, 0.9);
zip(b + 1.15, 0.5, 500, 1800, 0.4);
for (let i = 0; i < 6; i++) tick(b + 1.2 + i * 0.08 + 0.05, 0.35, 4400);
// S8a
b = T.s8a;
countTicks(b + 0.2, 1.3, 26, 0.35, 2600);
chime(b + 1.55, 84, 0.9); chime(b + 1.6, 91, 0.7);
whoosh(b + 0.95, 0.5, true, 0.5);
// S8b
b = T.s8b;
pop(b + 0.35, 260, 620, 1.0); zip(b + 0.2, 0.4, 400, 2000, 0.6);
whoosh(b + 0.55, 0.6, true, 0.6);
shimmer(b + 0.65, 0.9, 0.8);
pop(b + 0.95 + 0.1, 380, 900, 1.1); chime(b + 0.95 + 0.15, 84, 1.0); chime(b + 1.05, 88, 0.8); chime(b + 1.15, 91, 0.7); chime(b + 1.3, 96, 0.6);
for (let i = 0; i < 8; i++) chime(b + 1.5 + i * 0.16, sc(2 + (i % 5)), 0.35, -0.5 + (i % 5) * 0.25);

/* ---------- sidechain, effects and mix-down ---------- */
const duck = new Float32Array(N).fill(1);
for (const tk of kicks) {
  const i0 = Math.round(tk * SR), len = Math.round(0.42 * SR);
  for (let i = 0; i < len && i0 + i < N; i++) { const s = i / SR; const v = 1 - 0.72 * Math.exp(-s / 0.11) * Math.min(1, s / 0.004 + 0.02); if (v < duck[i0 + i]) duck[i0 + i] = v; }
}
for (const ch of [0, 1]) for (let i = 0; i < N; i++) { bus.music[ch][i] *= duck[i]; bus.arp[ch][i] *= 0.5 + 0.5 * duck[i]; }

// ping-pong delay on the arp
const dl = Math.round(BEAT * 0.75 * SR), fb = 0.38;
{
  const l = new Float32Array(N), r = new Float32Array(N);
  for (let i = 0; i < N; i++) {
    const inL = bus.arp[0][i] + bus.arp[1][i];
    l[i] = inL * 0.5 + (i >= dl ? fb * r[i - dl] : 0);
    r[i] = (i >= dl ? fb * l[i - dl] : 0);
  }
  for (let i = 0; i < N; i++) { bus.arp[0][i] += l[i] * 0.8; bus.arp[1][i] += r[i] * 0.8; }
}

// Schroeder/Freeverb-style reverb
function reverb(inp, spread) {
  const combs = [1116, 1188, 1277, 1356, 1422, 1491, 1557, 1617].map((n) => Math.round((n + spread) * SR / 44100));
  const aps = [556, 441, 341, 225].map((n) => Math.round((n + spread) * SR / 44100));
  const out = new Float32Array(N);
  for (const cl of combs) {
    const b = new Float32Array(cl); let idx = 0, filt = 0;
    for (let i = 0; i < N; i++) { const y = b[idx]; filt = y * 0.8 + filt * 0.2; b[idx] = inp[i] + filt * 0.86; if (++idx >= cl) idx = 0; out[i] += y * 0.12; }
  }
  for (const al of aps) {
    const b = new Float32Array(al); let idx = 0;
    for (let i = 0; i < N; i++) { const x = out[i], y = b[idx]; out[i] = -x + y; b[idx] = x + y * 0.5; if (++idx >= al) idx = 0; }
  }
  return out;
}
const revL = reverb(bus.rev[0], 0), revR = reverb(bus.rev[1], 23);

const out = [new Float32Array(N), new Float32Array(N)];
const MG = 0.85;
for (let i = 0; i < N; i++) {
  const t = i / SR;
  const fadeOut = t > DUR - 0.8 ? Math.pow(Math.max(0, (DUR - t) / 0.8), 1.5) : 1;
  const fadeIn = Math.min(1, t / 0.01);
  for (let c = 0; c < 2; c++) {
    const rv = c ? revR[i] : revL[i];
    let v = bus.dry[c][i] + bus.music[c][i] + bus.arp[c][i] + bus.fx[c][i] * 0.9 + rv * 0.55;
    v = Math.tanh(v * MG * 0.8);
    out[c][i] = v * fadeOut * fadeIn;
  }
}
let peak = 0; for (let c = 0; c < 2; c++) for (let i = 0; i < N; i++) peak = Math.max(peak, Math.abs(out[c][i]));
const norm = 0.89 / peak;

const pcm = Buffer.alloc(44 + N * 4);
pcm.write('RIFF', 0); pcm.writeUInt32LE(36 + N * 4, 4); pcm.write('WAVE', 8); pcm.write('fmt ', 12); pcm.writeUInt32LE(16, 16);
pcm.writeUInt16LE(1, 20); pcm.writeUInt16LE(2, 22); pcm.writeUInt32LE(SR, 24); pcm.writeUInt32LE(SR * 4, 28); pcm.writeUInt16LE(4, 32); pcm.writeUInt16LE(16, 34);
pcm.write('data', 36); pcm.writeUInt32LE(N * 4, 40);
for (let i = 0; i < N; i++) for (let c = 0; c < 2; c++) pcm.writeInt16LE(Math.round(clamp(out[c][i] * norm, -1, 1) * 32767), 44 + i * 4 + c * 2);
const raw = path.join(here, 'audio-raw.wav');
writeFileSync(raw, pcm);

const meas = spawnSync('ffmpeg', ['-hide_banner', '-nostats', '-i', raw, '-af', 'ebur128', '-f', 'null', '-'], { encoding: 'utf8' });
const lufs = Number((/I:\s+(-?[\d.]+) LUFS/.exec(meas.stderr.split('Summary:')[1] || '') || [])[1]);
const TARGET = -15;
const gainDb = Number.isFinite(lufs) ? TARGET - lufs : 0;
console.log(`measured ${lufs} LUFS → applying ${gainDb.toFixed(2)} dB`);
const r = spawnSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', raw, '-af', `volume=${gainDb}dB,aresample=192000,alimiter=limit=0.84:attack=2:release=80:level=disabled,aresample=48000`, '-ar', '48000', '-ac', '2', '-t', String(DUR), path.join(here, 'audio.wav')], { stdio: 'inherit' });
if (r.status !== 0) throw new Error('ffmpeg gain failed');
console.log('audio.wav written; kicks:', kicks.length, 'peak(before norm):', peak.toFixed(2));
