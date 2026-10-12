import { mkdirSync, writeFileSync } from "node:fs";
import { BEAT, DURATION, S, T, b } from "../src/timing.js";

const SR = 44100;
const N = Math.round(DURATION * SR);
const TAU = Math.PI * 2;

const bus = () => ({ l: new Float32Array(N), r: new Float32Array(N) });
const drums = bus();
const music = bus();
const fx = bus();
const send = bus();

let seed = 1234567;
const rnd = () => {
  seed |= 0;
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
const noise = () => rnd() * 2 - 1;
const midi = (n) => 440 * Math.pow(2, (n - 69) / 12);

function put(dst, t0, x, gain = 1, pan = 0, sendGain = 0) {
  const i0 = Math.round(t0 * SR);
  const gl = gain * Math.cos(((pan + 1) * Math.PI) / 4);
  const gr = gain * Math.sin(((pan + 1) * Math.PI) / 4);
  for (let i = 0; i < x.length; i++) {
    const k = i0 + i;
    if (k < 0 || k >= N) continue;
    dst.l[k] += x[i] * gl;
    dst.r[k] += x[i] * gr;
    if (sendGain) {
      send.l[k] += x[i] * gl * sendGain;
      send.r[k] += x[i] * gr * sendGain;
    }
  }
}

const buf = (sec) => new Float32Array(Math.max(1, Math.round(sec * SR)));

function kick() {
  const x = buf(0.5);
  let ph = 0;
  for (let i = 0; i < x.length; i++) {
    const t = i / SR;
    const f = 44 + 120 * Math.exp(-t * 28);
    ph += (TAU * f) / SR;
    let s = Math.sin(ph) * Math.exp(-t * 7.5);
    s += noise() * Math.exp(-t * 400) * 0.35;
    x[i] = Math.tanh(s * 1.6);
  }
  return x;
}

function clap() {
  const x = buf(0.35);
  let lp = 0, hp = 0, prev = 0;
  for (let i = 0; i < x.length; i++) {
    const t = i / SR;
    const n = noise();
    lp += (n - lp) * 0.55;
    hp = 0.86 * (hp + lp - prev);
    prev = lp;
    let env = Math.exp(-t * 22) * 0.6;
    for (const off of [0, 0.011, 0.022]) if (t >= off) env += Math.exp(-(t - off) * 260);
    x[i] = hp * env;
  }
  return x;
}

function hat(open = false) {
  const x = buf(open ? 0.28 : 0.09);
  let prev = 0;
  for (let i = 0; i < x.length; i++) {
    const t = i / SR;
    const n = noise();
    const h = n - prev;
    prev = n;
    x[i] = h * Math.exp(-t * (open ? 16 : 70)) * 0.6;
  }
  return x;
}

function bassNote(freq, len = 0.24) {
  const x = buf(len + 0.05);
  let ph = 0, lp = 0;
  for (let i = 0; i < x.length; i++) {
    const t = i / SR;
    ph += freq / SR;
    const saw = 2 * (ph % 1) - 1;
    const cut = 0.05 + 0.22 * Math.exp(-t * 14);
    lp += (saw - lp) * cut;
    const env = Math.min(1, t / 0.004) * (t < len ? 1 : Math.exp(-(t - len) * 60)) * Math.exp(-t * 3);
    x[i] = (lp * 0.9 + Math.sin(TAU * freq * (i / SR)) * 0.7) * env;
  }
  return x;
}

function padChord(notes, len) {
  const x = buf(len + 0.6);
  const voices = [];
  for (const n of notes) for (const d of [-0.12, 0, 0.11]) voices.push({ f: midi(n) * Math.pow(2, d / 12), ph: rnd() });
  let lp = 0, lp2 = 0;
  for (let i = 0; i < x.length; i++) {
    const t = i / SR;
    let s = 0;
    for (const v of voices) {
      v.ph += v.f / SR;
      s += 2 * (v.ph % 1) - 1;
    }
    s /= voices.length;
    lp += (s - lp) * 0.09;
    lp2 += (lp - lp2) * 0.09;
    const env = Math.min(1, t / 0.18) * (t < len ? 1 : Math.exp(-(t - len) * 9));
    x[i] = lp2 * env * 1.8;
  }
  return x;
}

function pluck(freq, len = 0.32) {
  const x = buf(len);
  let ph = 0, ph2 = 0, lp = 0;
  for (let i = 0; i < x.length; i++) {
    const t = i / SR;
    ph += freq / SR;
    ph2 += (freq * 1.006) / SR;
    const s = (2 * (ph % 1) - 1) * 0.5 + (2 * (ph2 % 1) - 1) * 0.5;
    const cut = 0.04 + 0.4 * Math.exp(-t * 20);
    lp += (s - lp) * cut;
    x[i] = lp * Math.min(1, t / 0.002) * Math.exp(-t * 11);
  }
  return x;
}

function whoosh(dur, { rise = 1, from = 250, to = 7000, peak = 0.7 } = {}) {
  const x = buf(dur);
  let low = 0, band = 0;
  for (let i = 0; i < x.length; i++) {
    const p = i / x.length;
    const fc = from * Math.pow(to / from, rise > 0 ? p : 1 - p);
    const f = 2 * Math.sin((Math.PI * fc) / SR);
    const n = noise();
    low += f * band;
    const high = n - low - 0.35 * band;
    band += f * high;
    const env = rise > 0 ? Math.pow(p, 1.8) * (p > 0.94 ? (1 - p) / 0.06 : 1) : Math.pow(Math.sin(Math.PI * p), 1.4);
    x[i] = band * env * 1.6 * peak;
  }
  return x;
}

function riser(dur) {
  const x = buf(dur);
  let ph = 0, prev = 0;
  for (let i = 0; i < x.length; i++) {
    const p = i / x.length;
    ph += (TAU * (180 + 1800 * p * p)) / SR;
    const n = noise();
    const h = n - prev;
    prev = n;
    x[i] = (Math.sin(ph) * 0.35 + h * 0.5) * Math.pow(p, 2.2) * (i > x.length - 300 ? (x.length - i) / 300 : 1);
  }
  return x;
}

function impact(len = 1.6) {
  const x = buf(len);
  let ph = 0, lp = 0;
  for (let i = 0; i < x.length; i++) {
    const t = i / SR;
    ph += (TAU * (28 + 60 * Math.exp(-t * 6))) / SR;
    lp += (noise() - lp) * 0.08;
    x[i] = Math.sin(ph) * Math.exp(-t * 2.4) * 1.1 + lp * Math.exp(-t * 5) * 1.2;
  }
  return x;
}

function thunk() {
  const x = buf(0.5);
  let ph = 0;
  for (let i = 0; i < x.length; i++) {
    const t = i / SR;
    ph += (TAU * (55 + 90 * Math.exp(-t * 26))) / SR;
    x[i] = Math.tanh(Math.sin(ph) * Math.exp(-t * 8) * 1.8 + noise() * Math.exp(-t * 260) * 0.25);
  }
  return x;
}

function tick(freq = 1800, len = 0.03) {
  const x = buf(len);
  for (let i = 0; i < x.length; i++) {
    const t = i / SR;
    x[i] = (Math.sin(TAU * freq * t) * 0.6 + noise() * 0.4) * Math.exp(-t * 260);
  }
  return x;
}

function pop(f0 = 480, f1 = 980, len = 0.16) {
  const x = buf(len);
  let ph = 0;
  for (let i = 0; i < x.length; i++) {
    const t = i / SR;
    ph += (TAU * (f0 + (f1 - f0) * (1 - Math.exp(-t * 40)))) / SR;
    x[i] = Math.sin(ph) * Math.exp(-t * 26) * Math.min(1, t / 0.002);
  }
  return x;
}

function sparkle(len = 1.2) {
  const x = buf(len);
  const partials = [2093, 2637, 3136, 4186];
  for (let i = 0; i < x.length; i++) {
    const t = i / SR;
    let s = 0;
    partials.forEach((f, k) => {
      const d = k * 0.045;
      if (t >= d) s += Math.sin(TAU * f * (t - d)) * Math.exp(-(t - d) * 5.5) * (0.5 / (k + 1) + 0.15);
    });
    x[i] = s * Math.min(1, t / 0.002);
  }
  return x;
}

function chime(f, len = 0.7) {
  const x = buf(len);
  for (let i = 0; i < x.length; i++) {
    const t = i / SR;
    x[i] = (Math.sin(TAU * f * t) + 0.35 * Math.sin(TAU * f * 2.01 * t)) * Math.exp(-t * 6) * Math.min(1, t / 0.002);
  }
  return x;
}

function stampBoom() {
  const x = buf(0.5);
  let ph = 0;
  for (let i = 0; i < x.length; i++) {
    const t = i / SR;
    ph += (TAU * (70 + 80 * Math.exp(-t * 30))) / SR;
    x[i] = Math.tanh(Math.sin(ph) * Math.exp(-t * 9) * 1.6 + noise() * Math.exp(-t * 90) * 0.5);
  }
  return x;
}

const kickSample = kick();
const clapSample = clap();
const hatC = hat(false);
const hatO = hat(true);
const kickTimes = [];

/* ---------- harmony: 2-beat chords, Am F C G ---------- */
const prog = [
  { root: 33, tones: [57, 60, 64], name: "Am" },
  { root: 29, tones: [53, 57, 60], name: "F" },
  { root: 36, tones: [55, 60, 64], name: "C" },
  { root: 31, tones: [55, 59, 62], name: "G" },
];
const chordAt = (beat) => prog[((Math.floor((beat - 10) / 2) % 4) + 4) % 4];

const inRange = (beat, a, z) => beat >= a && beat < z;

/* ---------- S1: tension ---------- */
{
  const drone = (root, len, gain) => {
    const x = buf(len);
    let ph = 0, ph2 = 0, lp = 0;
    for (let i = 0; i < x.length; i++) {
      const t = i / SR;
      ph += midi(root) / SR;
      ph2 += (midi(root) * 1.498) / SR;
      const s = (2 * (ph % 1) - 1) * 0.6 + (2 * (ph2 % 1) - 1) * 0.3;
      lp += (s - lp) * 0.02;
      x[i] = lp * gain * Math.min(1, t / 0.6) * Math.min(1, (len - t) / 0.4);
    }
    return x;
  };
  put(music, 0, drone(33, S.s2 - 0.05, 1.0), 0.2, 0, 0.35);
  put(music, 0, drone(34, S.s2 - 0.05, 0.6), 0.07, 0.3, 0.35);
  for (const c of [0.5, 2.5, 4.5, 6.5]) put(drums, b(c), thunk(), 0.4, 0, 0.12);
  for (let k = 4; k < 20; k++) put(fx, b(k * 0.5) + 0.05, tick(k % 2 ? 1500 : 2100, 0.025), 0.18, k % 2 ? -0.3 : 0.3);
  put(fx, b(6.5) - 0.02, whoosh(0.38, { rise: 0, from: 400, to: 4000, peak: 0.5 }), 0.4);
  put(fx, S.s2 - 0.9, riser(0.9), 0.55, 0, 0.2);
}

/* ---------- transitions ---------- */
put(fx, T.flood1[0], whoosh(0.85, { rise: 1, from: 200, to: 8000, peak: 0.9 }), 0.6, 0, 0.25);
put(fx, T.flood1[1], impact(), 0.75, 0, 0.3);
put(fx, T.flood1[1] + 0.1, whoosh(0.7, { rise: 0, from: 300, to: 6000, peak: 0.6 }), 0.35);
put(fx, T.slide2[0], whoosh(0.7, { rise: 1, from: 300, to: 5000, peak: 0.7 }), 0.45, 0, 0.15);
put(fx, T.slide3[0], whoosh(0.7, { rise: 1, from: 400, to: 6000, peak: 0.7 }), 0.45, 0.2, 0.15);
put(fx, T.fade4[0], whoosh(0.65, { rise: 0, from: 500, to: 4000, peak: 0.6 }), 0.4, 0, 0.2);
put(fx, T.slide5[0], whoosh(0.7, { rise: 1, from: 300, to: 5500, peak: 0.7 }), 0.45, -0.2, 0.15);
put(fx, T.flood6[0], whoosh(0.8, { rise: 1, from: 250, to: 7500, peak: 0.85 }), 0.55, 0, 0.25);
put(fx, T.flood6[1], impact(1.2), 0.5, 0, 0.25);
put(fx, T.zoom7[0], whoosh(0.6, { rise: 1, from: 500, to: 9000, peak: 0.7 }), 0.45, 0, 0.2);
put(fx, T.iris8[0], riser(0.6), 0.6, 0, 0.3);
put(fx, T.iris8[0], whoosh(0.6, { rise: 1, from: 300, to: 8000, peak: 0.8 }), 0.5, 0, 0.3);

/* ---------- groove: beats 10..84 and 89..93 ---------- */
const grooveBeats = [];
for (let k = 10; k < 84; k++) grooveBeats.push(k);
for (let k = 89; k < 93; k++) grooveBeats.push(k);

for (const k of grooveBeats) {
  const t = b(k);
  const c = chordAt(k);
  const full = inRange(k, 20, 84) || k >= 89;

  put(drums, t, kickSample, 0.95);
  kickTimes.push(t);

  if (full && k % 2 === 1) put(drums, t, clapSample, 0.42, 0.05, 0.12);
  else if (k >= 16 && k < 20 && k % 2 === 1) put(drums, t, clapSample, 0.3, 0.05, 0.1);

  put(drums, t + BEAT / 2, k % 4 === 3 ? hatO : hatC, 0.32, 0.18);
  if (k >= 34 || k >= 89) {
    put(drums, t + BEAT / 4, hatC, 0.12, -0.2);
    put(drums, t + (3 * BEAT) / 4, hatC, 0.14, 0.2);
  }

  const bn = midi(c.root + (k % 4 === 3 ? 12 : 0));
  put(music, t + BEAT / 2, bassNote(bn), 0.5);
  if (full) put(music, t + BEAT * 0.75, bassNote(midi(c.root)), 0.32);
}

/* ---------- pad ---------- */
for (let k = 10; k < 84; k += 2) {
  const c = chordAt(k);
  put(music, b(k), padChord(c.tones, BEAT * 2), 0.2, 0, 0.55);
}
for (let k = 84; k < 89; k += 1) {
  const c = chordAt(k);
  put(music, b(k), padChord(c.tones, BEAT), 0.23, 0, 0.6);
}
put(music, b(89), padChord([57, 60, 64, 67, 71], 4.2), 0.3, 0, 0.7);
put(music, b(89), bassNote(midi(33), 3.5), 0.55);

/* ---------- arp ---------- */
const arpBus = bus();
const arpPattern = [0, 1, 2, 1, 0, 2, 1, 2];
function arp(fromBeat, toBeat, step, gain) {
  let n = 0;
  for (let t = b(fromBeat); t < b(toBeat) - 1e-6; t += step, n++) {
    const beat = t / BEAT;
    const c = chordAt(Math.min(beat, 83.9999));
    const tone = c.tones[arpPattern[n % arpPattern.length] % 3] + 12 + (n % 8 === 7 ? 12 : 0);
    put(arpBus, t, pluck(midi(tone)), gain * (0.75 + 0.25 * ((n % 4) === 0)), ((n % 2) ? 0.4 : -0.4), 0.3);
  }
}
arp(14, 20, BEAT / 2, 0.16);
arp(20, 84, BEAT / 4, 0.15);
arp(84, 89, BEAT / 2, 0.18);
arp(89, 93, BEAT / 4, 0.14);

function pingPong(src, dl, dr, fb) {
  for (let i = 0; i < N; i++) {
    if (i >= dl) src.l[i] += src.l[i - dl] * fb;
    if (i >= dr) src.r[i] += src.r[i - dr] * fb;
  }
}
pingPong(arpBus, Math.round(BEAT * 0.75 * SR), Math.round(BEAT * 0.5 * SR), 0.38);
for (let i = 0; i < N; i++) {
  music.l[i] += arpBus.l[i];
  music.r[i] += arpBus.r[i];
}

/* ---------- UI / event sounds ---------- */
function typing(t0, dur, chars, step = 1, gain = 0.14) {
  for (let i = 0; i < chars; i += step) {
    const t = t0 + (dur * i) / chars;
    const f = 1500 + rnd() * 900;
    put(fx, t, tick(f, 0.028), gain * (0.6 + rnd() * 0.4), (rnd() - 0.5) * 0.5);
  }
}
function counterBlips(t0, dur, n = 8, base = 72) {
  for (let i = 0; i < n; i++) {
    const p = i / (n - 1);
    put(fx, t0 + dur * Math.pow(p, 0.7), pop(midi(base + Math.round(p * 12)) * 2, midi(base + Math.round(p * 12)) * 2.2, 0.08), 0.12, 0.2, 0.15);
  }
}

// S2
{
  const a = S.s2;
  put(fx, a + 0.12, sparkle(), 0.5, 0, 0.5);
  put(fx, a + 0.28, pop(300, 700), 0.25);
  put(fx, a + 1.25, whoosh(0.5, { rise: 0, from: 400, to: 3500, peak: 0.5 }), 0.3);
  const h = a + 1.55;
  put(fx, a + 1.6, pop(420, 900), 0.22, -0.4);
  put(fx, h + 0.22, pop(520, 1100), 0.3, -0.2, 0.2);
  put(fx, h + 0.55, pop(600, 1300), 0.3, 0.2, 0.2);
  put(fx, h + 0.95, pop(380, 800), 0.18, 0);
  put(fx, h + 1.15, pop(320, 700), 0.3, 0.3);
  put(fx, h + 2.05, tick(1200, 0.06), 0.3);
  put(fx, h + 2.3, chime(1318.5), 0.18, 0.2, 0.35);
}
// S3
{
  const a = S.s3;
  put(fx, a + 0.15, pop(260, 620), 0.3, -0.3);
  typing(a + 0.7, 1.0, 33, 1);
  [1.95, 2.75, 3.55].forEach((d, i) => {
    put(fx, a + d, pop(520 + i * 60, 900 + i * 80), 0.3, -0.1);
    counterBlips(a + d + 0.18, i === 0 ? 0.75 : 0.45, i === 0 ? 10 : 5, 72 + i * 2);
  });
  put(fx, a + 4.35, chime(987.8), 0.22, 0, 0.3);
  put(fx, a + 4.45, stampBoom(), 0.75, 0.15, 0.2);
  put(fx, a + 4.55, chime(1480), 0.12, 0.2, 0.4);
}
// S4
{
  const a = S.s4;
  put(fx, a + 0.15, pop(260, 620), 0.3, 0.3);
  typing(a + 0.8, 1.15, 46, 1);
  [2.35, 3.15, 3.95].forEach((d, i) => {
    put(fx, a + d, pop(520 + i * 60, 900 + i * 80), 0.3, -0.1);
    counterBlips(a + d + 0.18, 0.55, 6, 72 + i * 2);
  });
  put(fx, a + 3.2, pop(700, 1500, 0.2), 0.3, 0.2, 0.3);
  put(fx, a + 1.4, sparkle(0.8), 0.25, -0.2, 0.3);
  put(fx, a + 4.75, chime(987.8), 0.2, 0, 0.3);
  typing(a + 5.25, 0.95, 31, 1);
  put(fx, a + 6.55, tick(900, 0.05), 0.55, 0.4);
  put(fx, a + 6.6, pop(360, 1200, 0.35), 0.35, 0.4, 0.4);
  put(fx, a + 6.62, chime(1568), 0.22, 0.3, 0.5);
}
// S5
{
  const a = S.s5;
  put(fx, a + 0.2, pop(260, 620), 0.3, -0.2);
  typing(a + 0.7, 0.85, 19, 1);
  put(fx, a + 1.45, pop(500, 800, 0.1), 0.15, -0.3);
  put(fx, a + 1.85, pop(500, 800, 0.1), 0.15, 0.3);
  put(fx, a + 2.4, pop(400, 1400, 0.22), 0.4, 0.2, 0.35);
  put(fx, a + 2.85, chime(1760), 0.25, 0.1, 0.4);
  const wt = a + 3.45 + 0.55;
  put(fx, a + 3.7, whoosh(0.5, { rise: 0, from: 500, to: 5000, peak: 0.5 }), 0.3);
  for (let i = 0; i < 4; i++) put(fx, wt + i * 0.2, pop(440 + i * 70, 900 + i * 90, 0.14), 0.3, -0.2 + i * 0.13, 0.2);
  put(fx, wt + 1.3, pop(500, 1600, 0.25), 0.35, 0.2, 0.35);
  const tr = wt + 0.85;
  put(fx, tr, sparkle(0.9), 0.2, 0, 0.4);
  [0.15, 0.5, 0.85, 1.2].forEach((d, i) => put(fx, tr + d + 0.28, pop(600 + i * 120, 700 + i * 130, 0.1), 0.18, -0.1 + i * 0.1, 0.2));
  put(fx, tr + 1.87, chime(1975.5), 0.28, 0.2, 0.5);
}
// S6
{
  const a = S.s6;
  put(fx, a + 0.14, pop(260, 620), 0.3, -0.3);
  typing(a + 0.75, 1.85, 200, 2, 0.11);
  put(fx, a + 1.5, whoosh(0.35, { rise: 1, from: 800, to: 5000, peak: 0.4 }), 0.3);
  put(fx, a + 2.65, chime(1174.7), 0.22, 0, 0.35);
  put(fx, a + 2.95, whoosh(0.5, { rise: 0, from: 600, to: 6000, peak: 0.6 }), 0.35, 0.2);
  put(fx, a + 2.95, pop(300, 1500, 0.25), 0.4, 0.2, 0.3);
  put(fx, a + 3.3, chime(1568), 0.2, 0.2, 0.5);
}
// S7
{
  const a = S.s7;
  put(fx, a + 0.85, pop(300, 700), 0.3, 0.3);
  counterBlips(a + 0.95, 0.9, 12, 70);
  put(fx, a + 1.25, whoosh(0.3, { rise: 0, from: 800, to: 4500, peak: 0.5 }), 0.3);
  for (let i = 0; i < 4; i++) put(fx, a + 1.55 + i * 0.09 + 0.15, pop(400 + i * 60, 800 + i * 70, 0.14), 0.26, -0.3 + i * 0.2, 0.2);
  // slider sweep 3K -> 400K -> 40K
  const sweep = (t0, dur, f0, f1) => {
    const x = buf(dur);
    let ph = 0;
    for (let i = 0; i < x.length; i++) {
      const p = i / x.length;
      ph += (TAU * (f0 * Math.pow(f1 / f0, p))) / SR;
      x[i] = Math.sin(ph) * Math.sin(Math.PI * p) * 0.6;
    }
    return x;
  };
  put(fx, a + 2.0, sweep(0.75, 0.75, 400, 2400), 0.22, 0.1, 0.35);
  put(fx, a + 2.75, sweep(0.8, 0.8, 2400, 700), 0.18, 0.1, 0.35);
  put(fx, a + 3.55, chime(1318.5), 0.24, 0.2, 0.4);
}
// S8a
{
  const a = S.s8a;
  put(fx, a + 0.1, pop(260, 620), 0.28, 0);
  [0.3, 0.42, 0.54].forEach((d, i) => {
    put(fx, a + d + 0.05, whoosh(0.45, { rise: 0, from: 500, to: 4500, peak: 0.5 }), 0.22, -0.4 + i * 0.4);
    put(fx, a + d + 0.42, pop(500 + i * 100, 900 + i * 100, 0.14), 0.22, -0.4 + i * 0.4, 0.3);
  });
}
// S8b
{
  const a = S.s8b;
  put(fx, a - 0.02, impact(2.4), 0.9, 0, 0.35);
  put(fx, a - 0.02, sparkle(1.6), 0.4, 0, 0.6);
  put(fx, a + 0.1, pop(300, 720), 0.25, -0.2);
  put(fx, a + 0.24, pop(340, 800), 0.25, 0.2);
  put(fx, a + 0.75, pop(320, 700), 0.32, 0.3, 0.3);
  put(fx, a + 1.9, tick(1200, 0.06), 0.3);
  put(fx, a + 2.1, chime(1760, 1.6), 0.22, 0.2, 0.6);
}

/* ---------- sidechain, reverb, master ---------- */
const duck = new Float32Array(N).fill(1);
for (const tk of kickTimes) {
  const i0 = Math.round(tk * SR);
  const span = Math.round(0.32 * SR);
  for (let i = 0; i < span && i0 + i < N; i++) {
    const g = 1 - 0.75 * Math.exp(-(i / SR) * 9);
    if (g < duck[i0 + i]) duck[i0 + i] = g;
  }
}
for (let i = 0; i < N; i++) {
  music.l[i] *= duck[i];
  music.r[i] *= duck[i];
}

function reverb(src) {
  const combs = [1557, 1617, 1491, 1422, 1277, 1356];
  const aps = [225, 556, 441];
  const out = [new Float32Array(N), new Float32Array(N)];
  [src.l, src.r].forEach((ch, c) => {
    const spread = c ? 23 : 0;
    const acc = new Float32Array(N);
    for (const d0 of combs) {
      const d = d0 + spread;
      const fbuf = new Float32Array(d);
      let idx = 0, store = 0;
      const g = 0.86, damp = 0.32;
      for (let i = 0; i < N; i++) {
        const y = fbuf[idx];
        store = y * (1 - damp) + store * damp;
        fbuf[idx] = ch[i] + store * g;
        idx = (idx + 1) % d;
        acc[i] += y;
      }
    }
    let cur = acc;
    for (const d0 of aps) {
      const d = d0 + spread;
      const fbuf = new Float32Array(d);
      let idx = 0;
      const nxt = new Float32Array(N);
      for (let i = 0; i < N; i++) {
        const bufOut = fbuf[idx];
        const y = -cur[i] + bufOut;
        fbuf[idx] = cur[i] + bufOut * 0.5;
        idx = (idx + 1) % d;
        nxt[i] = y;
      }
      cur = nxt;
    }
    out[c] = cur;
  });
  return out;
}
const wet = reverb(send);

const outL = new Float32Array(N);
const outR = new Float32Array(N);
for (let i = 0; i < N; i++) {
  outL[i] = drums.l[i] + music.l[i] + fx.l[i] + wet[0][i] * 0.16;
  outR[i] = drums.r[i] + music.r[i] + fx.r[i] + wet[1][i] * 0.16;
}

const fadeIn = Math.round(0.01 * SR);
const fadeOut = Math.round(1.6 * SR);
let peak = 0;
for (let i = 0; i < N; i++) {
  const g = Math.min(1, i / fadeIn) * Math.min(1, (N - i) / fadeOut);
  outL[i] = Math.tanh(outL[i] * 1.7) * g;
  outR[i] = Math.tanh(outR[i] * 1.7) * g;
  peak = Math.max(peak, Math.abs(outL[i]), Math.abs(outR[i]));
}
const norm = 0.75 / peak;

const data = Buffer.alloc(N * 4);
for (let i = 0; i < N; i++) {
  data.writeInt16LE(Math.max(-32768, Math.min(32767, Math.round(outL[i] * norm * 32767))), i * 4);
  data.writeInt16LE(Math.max(-32768, Math.min(32767, Math.round(outR[i] * norm * 32767))), i * 4 + 2);
}
const header = Buffer.alloc(44);
header.write("RIFF", 0);
header.writeUInt32LE(36 + data.length, 4);
header.write("WAVE", 8);
header.write("fmt ", 12);
header.writeUInt32LE(16, 16);
header.writeUInt16LE(1, 20);
header.writeUInt16LE(2, 22);
header.writeUInt32LE(SR, 24);
header.writeUInt32LE(SR * 4, 28);
header.writeUInt16LE(4, 32);
header.writeUInt16LE(16, 34);
header.write("data", 36);
header.writeUInt32LE(data.length, 40);

mkdirSync(new URL("../build/", import.meta.url), { recursive: true });
writeFileSync(new URL("../build/audio.wav", import.meta.url), Buffer.concat([header, data]));
console.log(`audio.wav written: ${(N / SR).toFixed(3)}s, peak ${peak.toFixed(3)} -> normalised x${norm.toFixed(2)}`);
