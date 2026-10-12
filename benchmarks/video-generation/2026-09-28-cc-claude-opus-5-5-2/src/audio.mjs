// Synthesizes a 45s 120 BPM soundtrack synced to the scene cuts -> build/music.wav
import fs from 'node:fs';
const SR = 44100, DUR = 45, N = SR * DUR;
const L = new Float32Array(N), R = new Float32Array(N);
const BEAT = 0.5;
let seed = 7; const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647) * 2 - 1;
const add = (i, l, r = l) => { if (i >= 0 && i < N) { L[i] += l; R[i] += r; } };
const mtof = m => 440 * Math.pow(2, (m - 69) / 12);

function kick(t, g = 1) {
  const s = Math.floor(t * SR); let ph = 0;
  for (let i = 0; i < SR * 0.45; i++) {
    const x = i / SR, f = 45 + 110 * Math.exp(-x * 28);
    ph += 2 * Math.PI * f / SR;
    const v = Math.sin(ph) * Math.exp(-x * 7) * g * 0.9 + (i < 90 ? rnd() * 0.15 * g : 0);
    add(s + i, v);
  }
}
function hat(t, g = 1, open = false) {
  const s = Math.floor(t * SR); let prev = 0; const d = open ? 9 : 45;
  for (let i = 0; i < SR * (open ? 0.25 : 0.06); i++) {
    const n = rnd(); const hp = n - prev; prev = n;
    const v = hp * Math.exp(-(i / SR) * d) * 0.1 * g;
    add(s + i, v * 0.8, v);
  }
}
function clap(t, g = 1) {
  const s = Math.floor(t * SR); let lp = 0;
  for (let i = 0; i < SR * 0.22; i++) {
    const x = i / SR; const env = (x < 0.03 ? (Math.floor(x * 300) % 3 === 0 ? 1 : 0.4) : 1) * Math.exp(-x * 16);
    const n = rnd(); lp += (n - lp) * 0.35;
    add(s + i, (n - lp) * env * 0.22 * g);
  }
}
function bass(t, midi, len, g = 1) {
  const s = Math.floor(t * SR), f = mtof(midi); let lp = 0;
  for (let i = 0; i < SR * len; i++) {
    const x = i / SR; const ph = (x * f) % 1;
    const saw = 2 * ph - 1; const cutoff = 0.05 + 0.25 * Math.exp(-x * 14);
    lp += (saw - lp) * cutoff;
    const env = Math.min(1, x * 200) * Math.exp(-x * 3.5) * Math.min(1, (len - x) * 60);
    add(s + i, (lp * 0.5 + Math.sin(2 * Math.PI * f * x) * 0.5) * env * 0.32 * g);
  }
}
function pad(t, notes, len, g = 1) {
  const s = Math.floor(t * SR);
  for (let i = 0; i < SR * len; i++) {
    const x = i / SR; const env = Math.min(1, x / 0.6) * Math.min(1, (len - x) / 0.8);
    let l = 0, r = 0;
    for (const m of notes) {
      const f = mtof(m);
      l += Math.sin(2 * Math.PI * f * 0.997 * x) + 0.3 * Math.sin(2 * Math.PI * f * 2.002 * x);
      r += Math.sin(2 * Math.PI * f * 1.003 * x) + 0.3 * Math.sin(2 * Math.PI * f * 1.998 * x);
    }
    add(s + i, l * env * 0.028 * g, r * env * 0.028 * g);
  }
}
function pluck(t, midi, g = 1) {
  const s = Math.floor(t * SR), f = mtof(midi);
  for (let i = 0; i < SR * 0.4; i++) {
    const x = i / SR; const v = (Math.sin(2 * Math.PI * f * x) + 0.4 * Math.sin(4 * Math.PI * f * x)) * Math.exp(-x * 10) * 0.09 * g;
    add(s + i, v * (0.7 + 0.3 * Math.sin(midi)), v * (0.7 - 0.3 * Math.sin(midi)));
  }
}
function whoosh(tEnd, len = 0.7, g = 1) {
  const s = Math.floor((tEnd - len) * SR); let lp = 0, lp2 = 0;
  for (let i = 0; i < SR * (len + 0.35); i++) {
    const x = i / SR; const p = Math.min(1, x / len);
    const env = x < len ? Math.pow(p, 2.2) : Math.exp(-(x - len) * 12);
    const n = rnd(); const c = 0.02 + 0.5 * p * p; lp += (n - lp) * c; lp2 += (lp - lp2) * c;
    const pan = Math.sin(x * 6);
    add(s + i, lp2 * env * 0.5 * g * (1 - pan * 0.4), lp2 * env * 0.5 * g * (1 + pan * 0.4));
  }
}
function boom(t, g = 1) {
  const s = Math.floor(t * SR); let ph = 0;
  for (let i = 0; i < SR * 1.6; i++) {
    const x = i / SR; const f = 38 + 60 * Math.exp(-x * 10); ph += 2 * Math.PI * f / SR;
    add(s + i, Math.sin(ph) * Math.exp(-x * 2.4) * 0.8 * g);
  }
}
function riser(t0, t1, g = 1) {
  const s = Math.floor(t0 * SR), n = Math.floor((t1 - t0) * SR); let ph = 0;
  for (let i = 0; i < n; i++) {
    const p = i / n; const f = 200 + 1600 * p * p; ph += 2 * Math.PI * f / SR;
    add(s + i, Math.sin(ph) * p * p * 0.05 * g + rnd() * p * p * 0.03 * g);
  }
}

// Progression: Am - F - C - G (one chord per bar = 2s)
const prog = [[57, 60, 64], [53, 57, 60], [48, 55, 60, 64], [55, 59, 62]];
const roots = [45, 41, 48, 43];

// Intro 0-4: pad + logo boom
pad(0, [57, 64, 69], 4.3, 1.2);
riser(0, 1.1, 0.8);
boom(1.1, 1);
[69, 72, 76, 81].forEach((m, i) => pluck(1.8 + i * 0.12, m, 0.9));
whoosh(3.9, 1.0, 1.1);

// Main groove 4.0 - 40.3
for (let bar = 0; bar < 18; bar++) {
  const t = 4 + bar * 2; if (t >= 40.3) break;
  const c = bar % 4;
  pad(t, prog[c].map(m => m + 12), 2.05, 0.9);
  for (let b = 0; b < 4; b++) {
    const bt = t + b * BEAT; if (bt >= 40.3) break;
    kick(bt, b === 0 ? 1 : 0.85);
    if (bt >= 8.3) { hat(bt + BEAT / 2, 1); if (b % 2 === 1) clap(bt, 0.9); }
    if (bt >= 15.3) hat(bt + BEAT * 0.25, 0.45), hat(bt + BEAT * 0.75, 0.45);
    for (let e = 0; e < 2; e++) bass(bt + e * BEAT / 2, roots[c] + (e ? 12 : 0), 0.22, bt < 8.3 ? 0.6 : 1);
  }
  if (bt8(t)) [0, 3, 7, 10].forEach((d, i) => pluck(t + 1.5 + i * 0.125, prog[c][0] + 12 + d, 0.6));
}
function bt8(t) { return t >= 15 && t < 38; }

// Transition sweeps
[8.35, 14.5, 22.2, 27.4, 32.4, 36.6].forEach(t => whoosh(t, 0.6, 0.9));
// Cover hit
boom(14.5, 0.6);
// Outro: riser into final hit
whoosh(40.7, 0.9, 1.1);
riser(40.3, 42.3, 1);
pad(40.4, [57, 64, 69, 72], 2.2, 1.1);
boom(42.3, 1.2); kick(42.3, 1.2); clap(42.3, 0.8);
pad(42.3, [57, 60, 64, 69, 76], 2.7, 1.4);
[76, 81, 84, 88].forEach((m, i) => pluck(42.4 + i * 0.1, m, 0.8));

// Master: normalize + soft clip + fade out
let peak = 0; for (let i = 0; i < N; i++) peak = Math.max(peak, Math.abs(L[i]), Math.abs(R[i]));
const gain = 0.9 / peak;
const buf = Buffer.alloc(44 + N * 4);
buf.write('RIFF', 0); buf.writeUInt32LE(36 + N * 4, 4); buf.write('WAVE', 8); buf.write('fmt ', 12);
buf.writeUInt32LE(16, 16); buf.writeUInt16LE(1, 20); buf.writeUInt16LE(2, 22); buf.writeUInt32LE(SR, 24);
buf.writeUInt32LE(SR * 4, 28); buf.writeUInt16LE(4, 32); buf.writeUInt16LE(16, 34); buf.write('data', 36); buf.writeUInt32LE(N * 4, 40);
for (let i = 0; i < N; i++) {
  const x = i / SR; const fade = Math.min(1, x / 0.05) * Math.min(1, (DUR - x) / 1.2);
  const l = Math.tanh(L[i] * gain * 1.2) * fade, r = Math.tanh(R[i] * gain * 1.2) * fade;
  buf.writeInt16LE(Math.round(l * 32000), 44 + i * 4); buf.writeInt16LE(Math.round(r * 32000), 46 + i * 4);
}
fs.mkdirSync('build', { recursive: true });
fs.writeFileSync('build/music.wav', buf);
console.log('wrote build/music.wav');
