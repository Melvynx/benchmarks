import { writeFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { S, T, b, BEAT, DURATION } from "../src/timing.js";

const root = join(fileURLToPath(new URL(".", import.meta.url)), "..");
const SR = 44100;
const N = Math.round(DURATION * SR);
const TAU = Math.PI * 2;

let seed = 1337;
const rnd = () => {
  seed |= 0;
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
const noise = () => rnd() * 2 - 1;
const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);
const clamp = (v, a = 0, z = 1) => Math.min(z, Math.max(a, v));

/* ---------- buses ---------- */
const mk = () => new Float32Array(N);
const bus = { mL: mk(), mR: mk(), xL: mk(), xR: mk(), vL: mk(), vR: mk() };

function place(buf, t, { gain = 1, pan = 0, verb = 0, to = "x" } = {}) {
  const start = Math.round(t * SR);
  const a = Math.cos(((pan + 1) * Math.PI) / 4);
  const c = Math.sin(((pan + 1) * Math.PI) / 4);
  const L = bus[to + "L"], R = bus[to + "R"];
  for (let i = 0; i < buf.length; i++) {
    const j = start + i;
    if (j < 0) continue;
    if (j >= N) break;
    const v = buf[i] * gain;
    L[j] += v * a;
    R[j] += v * c;
    if (verb) {
      bus.vL[j] += v * a * verb;
      bus.vR[j] += v * c * verb;
    }
  }
}

/* ---------- filters ---------- */
function svf(input, cutoff, q, mode) {
  const out = new Float32Array(input.length);
  let ic1 = 0, ic2 = 0;
  const k = 1 / q;
  for (let i = 0; i < input.length; i++) {
    const fc = clamp(typeof cutoff === "function" ? cutoff(i / SR) : cutoff, 20, SR * 0.45);
    const g = Math.tan((Math.PI * fc) / SR);
    const a1 = 1 / (1 + g * (g + k)), a2 = g * a1, a3 = g * a2;
    const v3 = input[i] - ic2;
    const v1 = a1 * ic1 + a2 * v3;
    const v2 = ic2 + a2 * ic1 + a3 * v3;
    ic1 = 2 * v1 - ic1;
    ic2 = 2 * v2 - ic2;
    out[i] = mode === "lp" ? v2 : mode === "bp" ? v1 : input[i] - k * v1 - v2;
  }
  return out;
}

const env = (t, a, d, s = 0) => (t < a ? t / a : s + (1 - s) * Math.exp(-(t - a) / d));

/* ---------- oscillators ---------- */
const blep = (t, dt) => {
  if (t < dt) { t /= dt; return t + t - t * t - 1; }
  if (t > 1 - dt) { t = (t - 1) / dt; return t * t + t + t + 1; }
  return 0;
};
function saw(freq, len, detuneCents = 0) {
  const out = new Float32Array(len);
  const f = freq * Math.pow(2, detuneCents / 1200);
  const dt = f / SR;
  let ph = rnd();
  for (let i = 0; i < len; i++) {
    out[i] = 2 * ph - 1 - blep(ph, dt);
    ph += dt;
    if (ph >= 1) ph -= 1;
  }
  return out;
}
function sine(freqFn, len) {
  const out = new Float32Array(len);
  let ph = 0;
  for (let i = 0; i < len; i++) {
    const f = typeof freqFn === "function" ? freqFn(i / SR) : freqFn;
    ph += (TAU * f) / SR;
    out[i] = Math.sin(ph);
  }
  return out;
}

/* ---------- voices (mono buffers) ---------- */
function kick(gain = 1) {
  const len = Math.round(0.5 * SR);
  const o = sine((t) => 46 + 130 * Math.exp(-t * 34), len);
  for (let i = 0; i < len; i++) {
    const t = i / SR;
    const click = i < 90 ? noise() * 0.5 * (1 - i / 90) : 0;
    o[i] = Math.tanh((o[i] * env(t, 0.001, 0.16) * 1.5 + click) * 1.3) * gain;
    o[i] *= t > 0.44 ? Math.max(0, 1 - (t - 0.44) / 0.06) : 1;
  }
  return o;
}
function clap(gain = 1) {
  const len = Math.round(0.32 * SR);
  const raw = new Float32Array(len);
  for (let i = 0; i < len; i++) {
    const t = i / SR;
    let e = env(t, 0.001, 0.09);
    for (const off of [0, 0.011, 0.022]) if (t >= off && t < off + 0.01) e = Math.max(e, 1 - (t - off) / 0.01);
    raw[i] = noise() * e;
  }
  const o = svf(raw, 1500, 1.4, "bp");
  return o.map((v) => v * 2.4 * gain);
}
function hat(open = false, gain = 1) {
  const len = Math.round((open ? 0.24 : 0.07) * SR);
  const raw = new Float32Array(len);
  for (let i = 0; i < len; i++) raw[i] = noise() * env(i / SR, 0.0005, open ? 0.06 : 0.015);
  return svf(raw, 7500, 0.9, "hp").map((v) => v * gain);
}
function bass(freq, dur, gain = 1) {
  const len = Math.round((dur + 0.06) * SR);
  const a = saw(freq, len, -6), c = saw(freq, len, 6);
  const raw = new Float32Array(len);
  const sub = sine(freq, len);
  for (let i = 0; i < len; i++) raw[i] = (a[i] + c[i]) * 0.5;
  const f = svf(raw, (t) => 240 + 1500 * Math.exp(-t * 16), 1.1, "lp");
  for (let i = 0; i < len; i++) {
    const t = i / SR;
    const e = Math.min(t / 0.004, 1) * (t > dur ? Math.max(0, 1 - (t - dur) / 0.06) : 1);
    f[i] = (f[i] * 0.85 + sub[i] * 0.75) * e * gain;
  }
  return f;
}
function pluck(freq, dur = 0.28, gain = 1, bright = 1) {
  const len = Math.round(dur * SR);
  const a = saw(freq, len, -7), c = saw(freq, len, 7), o8 = saw(freq * 2, len, 0);
  const raw = new Float32Array(len);
  for (let i = 0; i < len; i++) raw[i] = a[i] * 0.5 + c[i] * 0.5 + o8[i] * 0.18;
  const f = svf(raw, (t) => 700 + 5200 * bright * Math.exp(-t * 15), 1.0, "lp");
  for (let i = 0; i < len; i++) {
    const t = i / SR;
    f[i] *= env(t, 0.002, 0.075) * (t > dur - 0.03 ? Math.max(0, (dur - t) / 0.03) : 1) * gain;
  }
  return f;
}
function pad(freqs, dur, gain = 1) {
  const len = Math.round(dur * SR);
  const raw = new Float32Array(len);
  for (const fr of freqs)
    for (const d of [-9, 0, 9]) {
      const s = saw(fr, len, d);
      for (let i = 0; i < len; i++) raw[i] += s[i] / (freqs.length * 3);
    }
  const f = svf(raw, (t) => 900 + 700 * Math.sin(t * 0.9), 0.8, "lp");
  for (let i = 0; i < len; i++) {
    const t = i / SR;
    f[i] *= Math.min(1, t / 0.4) * Math.min(1, (dur - t) / 0.5) * gain;
  }
  return f;
}
function bell(freq, dur = 1.2, gain = 1) {
  const len = Math.round(dur * SR);
  const o = new Float32Array(len);
  const parts = [[1, 1, 3.2], [2.756, 0.45, 5], [5.404, 0.22, 8], [0.5, 0.35, 2.4]];
  for (const [m, a, dec] of parts) {
    let ph = 0;
    for (let i = 0; i < len; i++) {
      ph += (TAU * freq * m) / SR;
      o[i] += Math.sin(ph) * a * Math.exp(-(i / SR) * dec);
    }
  }
  for (let i = 0; i < len; i++) o[i] *= Math.min(1, i / (0.002 * SR)) * gain * 0.5;
  return o;
}
function whoosh(dur, up = true, gain = 1, lo = 260, hi = 7000) {
  const len = Math.round(dur * SR);
  const raw = new Float32Array(len);
  for (let i = 0; i < len; i++) raw[i] = noise();
  const f = svf(
    raw,
    (t) => {
      const p = clamp(t / dur);
      const q = up ? p : 1 - p;
      return lo * Math.pow(hi / lo, q * q);
    },
    2.2,
    "bp",
  );
  for (let i = 0; i < len; i++) {
    const p = i / len;
    const e = up ? Math.pow(Math.sin(Math.min(p, 1) * Math.PI * 0.5), 2.2) * (p > 0.92 ? (1 - p) / 0.08 : 1) : Math.pow(Math.cos(p * Math.PI * 0.5), 1.6);
    f[i] *= e * gain * 3.2;
  }
  return f;
}
function riser(dur, gain = 1) {
  const len = Math.round(dur * SR);
  const raw = new Float32Array(len);
  for (let i = 0; i < len; i++) raw[i] = noise();
  const f = svf(raw, (t) => 400 + 9000 * Math.pow(t / dur, 2.2), 1.6, "hp");
  const tone = sine((t) => 180 + 1500 * Math.pow(t / dur, 2), len);
  for (let i = 0; i < len; i++) {
    const p = i / len;
    f[i] = (f[i] * 0.9 + tone[i] * 0.16) * Math.pow(p, 1.7) * gain * 1.6;
  }
  return f;
}
function impact(gain = 1, dur = 1.6) {
  const len = Math.round(dur * SR);
  const o = sine((t) => 34 + 60 * Math.exp(-t * 9), len);
  const raw = new Float32Array(len);
  for (let i = 0; i < len; i++) raw[i] = noise() * env(i / SR, 0.001, 0.35);
  const n = svf(raw, 900, 0.8, "lp");
  for (let i = 0; i < len; i++) {
    const t = i / SR;
    o[i] = Math.tanh((o[i] * env(t, 0.002, 0.55) * 1.4 + n[i] * 0.7) * 1.2) * gain;
    if (t > dur - 0.2) o[i] *= Math.max(0, (dur - t) / 0.2);
  }
  return o;
}
function crash(dur = 1.6, gain = 1) {
  const len = Math.round(dur * SR);
  const raw = new Float32Array(len);
  for (let i = 0; i < len; i++) raw[i] = noise() * env(i / SR, 0.002, 0.55);
  return svf(raw, 5200, 0.7, "hp").map((v) => v * gain * 0.8);
}
function tick(freq = 2400, gain = 1) {
  const len = Math.round(0.03 * SR);
  const o = new Float32Array(len);
  let ph = 0;
  for (let i = 0; i < len; i++) {
    const t = i / SR;
    ph += (TAU * freq) / SR;
    o[i] = (Math.sin(ph) * 0.7 + noise() * 0.35) * env(t, 0.0003, 0.006) * gain;
  }
  return svf(o, 1400, 0.8, "hp");
}
function pop(f0 = 620, gain = 1) {
  const len = Math.round(0.16 * SR);
  const o = sine((t) => f0 * (1 + 0.9 * Math.exp(-t * 60)), len);
  for (let i = 0; i < len; i++) o[i] *= env(i / SR, 0.001, 0.035) * gain;
  return o;
}
function thump(gain = 1) {
  const len = Math.round(0.4 * SR);
  const o = sine((t) => 52 + 70 * Math.exp(-t * 28), len);
  for (let i = 0; i < len; i++) o[i] = Math.tanh(o[i] * env(i / SR, 0.001, 0.11) * 1.6) * gain;
  return o;
}
function glide(f0, f1, dur, gain = 1) {
  const len = Math.round(dur * SR);
  const o = sine((t) => f0 * Math.pow(f1 / f0, clamp(t / dur)), len);
  const o2 = sine((t) => 2 * f0 * Math.pow(f1 / f0, clamp(t / dur)), len);
  for (let i = 0; i < len; i++) {
    const t = i / SR;
    o[i] = (o[i] + o2[i] * 0.22) * Math.min(1, t / 0.03) * Math.min(1, (dur - t) / 0.06) * gain;
  }
  return o;
}

/* ---------- score ---------- */
const beatOf = (t) => t / BEAT;
const CH = {
  C: { bass: 36, tones: [60, 64, 67, 72], padN: [48, 55, 64] },
  G: { bass: 31, tones: [59, 62, 67, 71], padN: [47, 55, 62] },
  Am: { bass: 33, tones: [57, 60, 64, 69], padN: [45, 52, 60] },
  F: { bass: 29, tones: [57, 60, 65, 69], padN: [45, 53, 60] },
};
const prog = [];
{
  const order = ["C", "G", "Am", "F"];
  let bt = 10, k = 0;
  while (bt < 86) { prog.push([bt, bt + 4, order[k % 4]]); bt += 4; k++; }
  prog.push([86, 89, "F"]);
  prog.push([89, 97, "C"]);
}
const chordAt = (bt) => (prog.find(([a, z]) => bt >= a && bt < z) || prog[prog.length - 1])[2];

const sectionOf = (bt) => (bt < 10 ? "intro" : bt < 20 ? "A" : bt < 34 ? "B" : bt < 50 ? "C" : bt < 64 ? "D" : bt < 74 ? "E" : bt < 84 ? "F" : bt < 89 ? "G" : "H");

const kicks = [];
const duck = (t) => {
  let g = 1;
  for (let i = kicks.length - 1; i >= 0; i--) {
    const dt = t - kicks[i];
    if (dt >= 0) { g = 1 - 0.68 * Math.exp(-dt / 0.085); break; }
  }
  return g;
};

// kick schedule first (needed by sidechained parts)
for (let bt = 10; bt < 96; bt++) {
  const sec = sectionOf(bt);
  let g = 0;
  if (sec === "A" || sec === "B" || sec === "C" || sec === "E" || sec === "F") g = 1;
  else if (sec === "D") g = bt >= 58 ? 1 : 0.6;
  else if (sec === "G") g = bt % 2 === 0 ? 0.8 : 0;
  else if (sec === "H") g = bt < 93 ? 0.95 : 0;
  if (g > 0) { kicks.push(b(bt)); place(kick(g), b(bt), { gain: 0.95, to: "m" }); }
}
// intro impacts on each pain cut
const cuts = [b(0.5), b(2.5), b(4.5), b(6.5)];
cuts.forEach((c, i) => {
  place(thump(1), c, { gain: 0.85 + i * 0.05, to: "m" });
  place(impact(0.7, 1.1), c, { gain: 0.5, verb: 0.25, to: "m" });
  place(whoosh(0.34, false, 0.5, 300, 6000), c, { verb: 0.2, to: "x", gain: 0.5 });
  place(hat(true, 0.5), c, { gain: 0.35, pan: (i % 2) - 0.5, to: "x" });
});

// drone with slow filter opening
{
  const len = Math.round(b(10) * SR) + Math.round(0.4 * SR);
  const raw = new Float32Array(len);
  for (const [fr, d] of [[55, -8], [55, 8], [110, 0], [82.4, 5]]) {
    const s = saw(fr, len, d);
    for (let i = 0; i < len; i++) raw[i] += s[i] * (fr === 110 ? 0.16 : 0.3);
  }
  const f = svf(raw, (t) => 130 + 700 * Math.pow(t / b(10), 1.6), 1.2, "lp");
  const sub = sine(55, len);
  for (let i = 0; i < len; i++) {
    const t = i / SR;
    f[i] = (f[i] + sub[i] * 0.35) * Math.min(1, t / 0.5) * (0.28 + 0.16 * (t / b(10))) * (t > b(10) ? Math.max(0, 1 - (t - b(10)) / 0.4) : 1);
  }
  place(f, 0, { to: "m", verb: 0.12 });
}
// clock ticks during the "Tuesday night" beat, 8th notes
for (let i = 0; i < 8; i++) {
  const t = b(4.5) + i * (BEAT / 4);
  place(tick(i % 2 ? 1900 : 2500, 0.55), t, { gain: 0.55, pan: -0.2 + 0.4 * (i % 2), to: "x" });
}
// build: snare roll + riser into the drop
place(riser(b(10) - b(6.5), 0.7), b(6.5), { to: "m", verb: 0.15 });
for (let bt = 8; bt < 10; bt += 0.5) {
  const steps = bt < 9 ? 0.5 : 0.25;
  place(clap(0.5 + (bt - 8) * 0.25), b(bt), { gain: 0.55, pan: 0.1, verb: 0.2, to: "m" });
  if (bt >= 9) place(clap(0.5 + (bt - 8) * 0.25), b(bt + 0.25), { gain: 0.5, pan: -0.1, to: "m" });
}
for (let i = 0; i < 6; i++) place(clap(0.9), b(9.5) + i * (BEAT / 12), { gain: 0.3 + i * 0.05, to: "m" });

// the drop
place(crash(1.8, 1), b(10), { gain: 0.55, verb: 0.2, to: "m" });
place(impact(1, 1.6), b(10), { gain: 0.8, verb: 0.2, to: "m" });
place(whoosh(0.55, true, 0.9, 300, 9000), b(10) - 0.55, { verb: 0.25, to: "x", gain: 0.8 });

// per-step groove: hats, claps, bass, arp
for (let s = 40; s < 96 * 4; s++) {
  const bt = s / 4;
  const t = b(bt);
  const sec = sectionOf(bt);
  if (t >= DURATION - 0.05) break;
  const step = s % 4;
  const ch = CH[chordAt(bt)];
  const rel = bt - 10;
  const barBeat = ((rel % 4) + 4) % 4;

  // hats
  if (sec !== "G" && sec !== "H") {
    if (step === 2) place(hat(true, 0.8), t, { gain: 0.32, pan: 0.25, to: "m" });
    else if ((sec === "C" || sec === "E" || sec === "F" || sec === "B") && (step === 1 || step === 3)) place(hat(false, 0.7), t, { gain: 0.15 + (step === 3 ? 0.04 : 0), pan: step === 1 ? -0.2 : 0.2, to: "m" });
  }
  // claps on 2 & 4
  if (step === 0 && (barBeat === 1 || barBeat === 3) && (sec === "B" || sec === "C" || sec === "E" || sec === "F" || (sec === "A" && bt >= 14) || (sec === "D" && bt >= 58)))
    place(clap(1), t, { gain: 0.42, pan: 0.05, verb: 0.16, to: "m" });

  // offbeat bass with sidechain
  const bassOn = (sec === "A" && bt >= 12) || sec === "B" || sec === "C" || sec === "D" || sec === "E" || sec === "F" || (sec === "H" && bt < 92);
  if (bassOn && step === 2) {
    const m = ch.bass + (barBeat === 3 ? 12 : 0);
    const buf = bass(mtof(m), BEAT * 0.42, 1);
    for (let i = 0; i < buf.length; i++) buf[i] *= duck(t + i / SR);
    place(buf, t, { gain: sec === "D" && bt < 58 ? 0.42 : 0.62, to: "m" });
  }
  // sustained sub on downbeats for weight
  if (bassOn && step === 0 && Math.round(rel) % 4 === 0 && sec !== "H") {
    const buf = sine(mtof(ch.bass), Math.round(BEAT * 1.6 * SR));
    for (let i = 0; i < buf.length; i++) buf[i] *= duck(t + i / SR) * Math.min(1, i / 400) * Math.max(0, 1 - i / buf.length) * 0.5;
    place(buf, t, { gain: 0.55, to: "m" });
  }

  // arp (16ths) with filter accent and stereo ping-pong
  const arpOn = (sec === "A" && bt >= 12) || sec === "B" || sec === "C" || sec === "E" || sec === "F" || (sec === "D") || (sec === "H" && bt < 91);
  if (arpOn) {
    const pattern = [0, 1, 2, 3, 2, 1, 3, 2];
    const idx = pattern[s % 8];
    const octUp = sec === "F" || sec === "E" ? 0 : 0;
    const note = ch.tones[idx] + octUp + (sec === "D" ? 0 : 0);
    const lvl = sec === "D" ? 0.8 : sec === "A" ? 0.75 : 1;
    const buf = pluck(mtof(note), BEAT * 0.3, 0.55, step === 0 ? 1.2 : 0.8);
    for (let i = 0; i < buf.length; i++) buf[i] *= duck(t + i / SR);
    place(buf, t, { gain: 0.34 * lvl, pan: s % 2 ? 0.45 : -0.45, verb: 0.3, to: "m" });
  }

  // pad chords at chord changes
  if (step === 0 && Number.isInteger(bt)) {
    const seg = prog.find(([a, z]) => bt === a);
    if (seg && bt >= 10) {
      const dur = Math.min((seg[1] - seg[0]) * BEAT + 0.3, DURATION - t);
      const buf = pad(ch.padN.map(mtof), dur, 1);
      const padGain = sec === "G" ? 0.36 : sec === "D" ? 0.3 : sec === "H" ? 0.34 : 0.22;
      for (let i = 0; i < buf.length; i++) buf[i] *= sec === "G" || sec === "H" ? 1 : duck(t + i / SR);
      place(buf, t, { gain: padGain, verb: 0.35, to: "m" });
    }
  }
}

// chord stab on the drop and bell sparkle over the logo
[60, 64, 67, 72].forEach((m, i) => place(pluck(mtof(m), 0.7, 1, 1.4), b(10) + i * 0.012, { gain: 0.3, pan: (i - 1.5) * 0.35, verb: 0.4, to: "m" }));
place(bell(mtof(84), 1.6, 1), S.s2 + 0.12, { gain: 0.5, verb: 0.5, to: "x", pan: 0.15 });
place(bell(mtof(91), 1.6, 1), S.s2 + 0.2, { gain: 0.32, verb: 0.5, to: "x", pan: -0.2 });

// proof section: warm bell melody (half-time)
[[84, 76], [85, 79], [86, 81], [87, 79], [88, 84]].forEach(([bt, m], i) => place(bell(mtof(m), 1.1, 1), b(bt), { gain: 0.32, verb: 0.55, pan: i % 2 ? 0.3 : -0.3, to: "m" }));

// finale
place(riser(b(89) - b(86.5), 0.8), b(86.5), { to: "m", verb: 0.15 });
place(crash(3.0, 1), b(89), { gain: 0.6, verb: 0.25, to: "m" });
place(impact(1, 2.4), b(89), { gain: 0.85, verb: 0.2, to: "m" });
[48, 55, 60, 64, 67, 72].forEach((m, i) => place(pluck(mtof(m), 1.4, 1, 1.5), b(89) + i * 0.014, { gain: 0.3, pan: (i - 2.5) * 0.3, verb: 0.5, to: "m" }));
place(pad([48, 55, 60, 64, 67].map(mtof), DURATION - b(89) - 0.05, 1), b(89), { gain: 0.34, verb: 0.5, to: "m" });
place(bell(mtof(96), 3.2, 1), b(89) + 0.5, { gain: 0.22, verb: 0.7, pan: 0.3, to: "x" });
place(bell(mtof(88), 3.2, 1), b(90.5), { gain: 0.18, verb: 0.7, pan: -0.3, to: "x" });

/* ---------- transitions ---------- */
const trans = [
  [T.flood1[0], T.flood1[1], true], [T.slide2[0], T.slide2[1]], [T.slide3[0], T.slide3[1]],
  [T.fade4[0], T.fade4[1]], [T.slide5[0], T.slide5[1]], [T.flood6[0], T.flood6[1]],
  [T.zoom7[0], T.zoom7[1]], [T.iris8[0], T.iris8[1]],
];
trans.forEach(([a, z], i) => {
  if (i === 0) return;
  place(whoosh(z - a + 0.08, i % 2 === 0, 0.8, 250, 8000), a, { verb: 0.22, to: "x", gain: 0.85, pan: i % 2 ? 0.2 : -0.2 });
  place(thump(0.9), z, { to: "m", gain: 0.5 });
  place(hat(true, 1), z, { to: "x", gain: 0.25 });
});

/* ---------- ui sound design ---------- */
const typeTicks = (t0, dur, n, gain = 0.5, stride = 1) => {
  for (let i = 0; i < n; i += stride) {
    const t = t0 + (i / n) * dur;
    place(tick(1800 + rnd() * 1700, 1), t, { gain: gain * (0.7 + rnd() * 0.5), pan: (rnd() - 0.5) * 0.4, to: "x" });
  }
};
const pops = (t0, n, step, f0, gain = 0.4, pf = 1.0) => {
  for (let i = 0; i < n; i++) place(pop(f0 * Math.pow(pf, i), 1), t0 + i * step, { gain, pan: (i % 2 ? 0.2 : -0.2), verb: 0.15, to: "x" });
};
const swipe = (t, dur = 0.22, gain = 0.5) => place(whoosh(dur, true, 1, 1200, 9000), t, { gain, verb: 0.1, to: "x" });
const ping = (t, m = 84, gain = 0.3) => place(bell(mtof(m), 0.7, 1), t, { gain, verb: 0.4, to: "x", pan: 0.1 });
const countTicks = (t0, dur, n, f0 = 1500, gain = 0.3) => {
  for (let i = 0; i < n; i++) {
    const p = i / n;
    place(tick(f0 + 1600 * p, 1), t0 + dur * (1 - Math.pow(1 - p, 2.2)) * 1, { gain, pan: (rnd() - 0.5) * 0.3, to: "x" });
  }
};

{ // S2
  const a = S.s2, h = a + 1.55;
  swipe(a + 0.28, 0.35, 0.5);
  place(whoosh(0.8, true, 0.8, 200, 3200), a + 1.25, { gain: 0.5, verb: 0.2, to: "x" });
  ping(a + 1.9, 88, 0.16);
  pops(h, 1, 0, 700, 0.3);
  for (let i = 0; i < 7; i++) place(tick(2100 + i * 160, 1), h + 0.1 + i * 0.06, { gain: 0.35, pan: -0.4 + i * 0.13, to: "x" });
  place(pop(500, 1), h + 0.22, { gain: 0.55, verb: 0.2, to: "x", pan: -0.25 });
  place(pop(620, 1), h + 0.55, { gain: 0.55, verb: 0.2, to: "x", pan: 0.25 });
  swipe(h + 0.95, 0.4, 0.3);
  place(pop(430, 1), h + 1.15, { gain: 0.6, verb: 0.2, to: "x" });
  place(tick(3000, 1), h + 2.05, { gain: 0.4, to: "x" });
}
{ // S3
  const a = S.s3;
  swipe(a + 0.05, 0.4, 0.35);
  place(whoosh(0.5, true, 0.6, 250, 5000), a + 0.15, { gain: 0.4, to: "x" });
  for (let i = 0; i < 12; i++) place(tick(2000 + (i % 4) * 300, 1), a + 0.3 + i * 0.05, { gain: 0.22, pan: -0.5 + i * 0.09, to: "x" });
  typeTicks(a + 0.7, 1.0, 33, 0.45);
  swipe(a + 1.15, 0.5, 0.45);
  pops(a + 1.7, 3, 0.24, 540, 0.42, 1.12);
  [a + 1.95, a + 2.75, a + 3.55].forEach((t, i) => { ping(t, 79 + i * 3, 0.26); countTicks(t + 0.18, i === 0 ? 0.75 : 0.45, i === 0 ? 20 : 6, 1400, 0.24); });
  ping(a + 4.35, 88, 0.3);
  place(thump(1), a + 4.45, { gain: 0.9, to: "m" });
  place(crash(0.7, 1), a + 4.45, { gain: 0.3, to: "x" });
  place(pop(300, 1), a + 4.45, { gain: 0.6, to: "x" });
}
{ // S4
  const a = S.s4;
  swipe(a + 0.05, 0.4, 0.35);
  place(whoosh(0.5, true, 0.6, 250, 5000), a + 0.15, { gain: 0.4, to: "x" });
  for (let i = 0; i < 5; i++) place(tick(2200 + i * 240, 1), a + 0.32 + i * 0.06, { gain: 0.25, pan: -0.3 + i * 0.15, to: "x" });
  swipe(a + 0.95, 0.4, 0.28);
  swipe(a + 1.25, 0.4, 0.28);
  place(pop(660, 1), a + 1.4, { gain: 0.6, verb: 0.3, to: "x" });
  place(pop(380, 1), a + 1.6, { gain: 0.5, to: "x" });
  typeTicks(a + 0.8, 1.15, 46, 0.42);
  [a + 2.35, a + 3.15, a + 3.95].forEach((t, i) => { ping(t, 79 + i * 3, 0.26); countTicks(t + 0.18, 0.55, 8, 1500, 0.22); });
  for (let i = 0; i < 26; i++) place(tick(2600 + rnd() * 2000, 1), a + 2.4 + i * 0.02, { gain: 0.16, pan: (rnd() - 0.5) * 0.9, to: "x" });
  place(pop(720, 1), a + 3.2, { gain: 0.6, verb: 0.3, to: "x" });
  ping(a + 4.75, 86, 0.28);
  swipe(a + 5.05, 0.3, 0.25);
  typeTicks(a + 5.25, 0.95, 31, 0.42);
  place(whoosh(0.95, true, 0.5, 400, 3800), a + 5.55, { gain: 0.4, to: "x" });
  const tc = a + 6.55;
  place(pop(260, 1), tc, { gain: 0.9, to: "x" });
  place(tick(1500, 1), tc, { gain: 0.8, to: "x" });
  place(thump(1), tc + 0.05, { gain: 0.8, to: "m" });
  ping(tc + 0.05, 84, 0.34);
  ping(tc + 0.18, 91, 0.3);
  ping(tc + 0.31, 96, 0.22);
}
{ // S5
  const a = S.s5;
  swipe(a + 0.1, 0.4, 0.3);
  place(whoosh(0.5, true, 0.6, 250, 5000), a + 0.2, { gain: 0.35, to: "x" });
  for (let i = 0; i < 5; i++) place(tick(2100 + i * 250, 1), a + 0.32 + i * 0.06, { gain: 0.22, pan: -0.3 + i * 0.15, to: "x" });
  swipe(a + 0.75, 0.35, 0.25);
  typeTicks(a + 0.7, 0.85, 19, 0.5);
  swipe(a + 1.45, 0.3, 0.2);
  swipe(a + 1.85, 0.3, 0.2);
  place(pop(540, 1), a + 2.4, { gain: 0.6, verb: 0.3, to: "x" });
  place(tick(1200, 1), a + 2.3, { gain: 0.5, to: "x" });
  place(glide(1400, 600, 0.3, 1), a + 2.85, { gain: 0.3, verb: 0.2, to: "x" });
  place(pop(700, 1), a + 2.85, { gain: 0.6, verb: 0.3, to: "x" });
  const sw = a + 3.45, wt = sw + 0.55, tr = wt + 0.85;
  place(whoosh(0.7, true, 0.7, 250, 6500), sw - 0.05, { gain: 0.6, verb: 0.2, to: "x" });
  for (let i = 0; i < 4; i++) place(pop(500 * Math.pow(1.122, i * 2), 1), wt + i * 0.2, { gain: 0.55, verb: 0.2, to: "x", pan: (i - 1.5) * 0.25 });
  pops(wt + 0.95, 2, 0.1, 620, 0.4);
  place(pop(900, 1), wt + 1.3, { gain: 0.6, verb: 0.3, to: "x" });
  ping(wt + 1.3, 91, 0.2);
  [0.15, 0.5, 0.85, 1.2, 1.67].forEach((o, i) => place(tick(1900 + i * 280, 1), tr + o, { gain: 0.5, pan: -0.15 + i * 0.07, to: "x" }));
  place(glide(500, 1100, 0.3, 1), tr + 1.42, { gain: 0.22, to: "x" });
  ping(tr + 1.87, 88, 0.36);
  place(thump(0.9), tr + 1.87, { gain: 0.6, to: "m" });
}
{ // S6
  const a = S.s6;
  swipe(a + 0.05, 0.4, 0.3);
  place(whoosh(0.5, true, 0.6, 250, 5000), a + 0.14, { gain: 0.35, to: "x" });
  for (let i = 0; i < 5; i++) place(tick(2200 + i * 200, 1), a + 0.32 + i * 0.14, { gain: 0.25, pan: -0.3 + i * 0.15, to: "x" });
  swipe(a + 0.9, 0.4, 0.25);
  typeTicks(a + 0.75, 1.85, 167, 0.28, 2);
  swipe(a + 1.5, 0.3, 0.55);
  place(whoosh(0.6, true, 0.6, 400, 6000), a + 1.5, { gain: 0.3, to: "x" });
  ping(a + 2.65, 86, 0.3);
  place(whoosh(0.85, true, 0.9, 300, 7500), a + 2.95, { gain: 0.6, verb: 0.2, to: "x" });
  place(thump(1), a + 2.95, { gain: 0.65, to: "m" });
  ping(a + 3.05, 91, 0.3);
}
{ // S7
  const a = S.s7;
  swipe(a + 0.2, 0.3, 0.28);
  for (let i = 0; i < 6; i++) place(tick(2100 + i * 180, 1), a + 0.28 + i * 0.07, { gain: 0.26, pan: -0.4 + i * 0.16, to: "x" });
  place(pop(500, 1), a + 0.85, { gain: 0.5, verb: 0.2, to: "x" });
  countTicks(a + 0.95, 0.9, 22, 1400, 0.22);
  swipe(a + 1.25, 0.28, 0.55);
  for (let i = 0; i < 4; i++) place(pop(430 * Math.pow(1.19, i), 1), a + 1.55 + i * 0.09, { gain: 0.5, verb: 0.2, to: "x", pan: (i - 1.5) * 0.3 });
  place(glide(280, 2600, 0.75, 1), a + 2.0, { gain: 0.2, verb: 0.2, to: "x" });
  place(glide(2600, 520, 0.8, 1), a + 2.75, { gain: 0.2, verb: 0.2, to: "x" });
  [a + 2.22, a + 2.4, a + 2.52].forEach((t, i) => place(pop(760 + i * 140, 1), t, { gain: 0.32, to: "x" }));
  [a + 3.0, a + 3.5].forEach((t, i) => place(pop(1000 - i * 220, 1), t, { gain: 0.3, to: "x" }));
  place(thump(0.9), a + 3.55, { gain: 0.5, to: "m" });
  ping(a + 3.6, 88, 0.3);
}
{ // S8a
  const a = S.s8a;
  swipe(a + 0.1, 0.3, 0.25);
  swipe(a + 0.16, 0.4, 0.28);
  for (let i = 0; i < 3; i++) {
    place(whoosh(0.4, true, 0.6, 300, 4200), a + 0.3 + i * 0.12, { gain: 0.35, to: "x", pan: (i - 1) * 0.4 });
    place(pop(360 + i * 60, 1), a + 0.55 + i * 0.12, { gain: 0.45, verb: 0.3, to: "x", pan: (i - 1) * 0.4 });
  }
}
{ // S8b
  const a = S.s8b;
  place(pop(480, 1), a - 0.3 + 0.35, { gain: 0.6, verb: 0.3, to: "x" });
  swipe(a - 0.15, 0.4, 0.4);
  swipe(a + 0.1, 0.4, 0.4);
  swipe(a + 0.24, 0.4, 0.4);
  place(pop(420, 1), a + 0.75, { gain: 0.6, verb: 0.3, to: "x" });
  swipe(a + 1.0, 0.4, 0.3);
  place(tick(3000, 1), a + 1.9, { gain: 0.45, to: "x" });
  ping(a + 2.3, 96, 0.2);
}

/* ---------- reverb (Schroeder, stereo) ---------- */
function reverb(inL, inR) {
  const out = [new Float32Array(N), new Float32Array(N)];
  const combs = [[1557, 1617, 1491, 1422], [1580, 1640, 1514, 1445]];
  const aps = [[225, 556], [241, 579]];
  [inL, inR].forEach((inp, ch) => {
    const lines = combs[ch].map((d) => ({ buf: new Float32Array(d), i: 0, lp: 0 }));
    const apl = aps[ch].map((d) => ({ buf: new Float32Array(d), i: 0 }));
    for (let n = 0; n < N; n++) {
      let s = 0;
      const x = inp[n] * 0.03;
      for (const c of lines) {
        const y = c.buf[c.i];
        c.lp = y * 0.62 + c.lp * 0.38;
        c.buf[c.i] = x + c.lp * 0.86;
        c.i = (c.i + 1) % c.buf.length;
        s += y;
      }
      for (const a of apl) {
        const y = a.buf[a.i];
        const v = s + y * 0.5;
        a.buf[a.i] = v;
        s = y - v * 0.5;
        a.i = (a.i + 1) % a.buf.length;
      }
      out[ch][n] = s;
    }
  });
  return out;
}
const [rvL, rvR] = reverb(bus.vL, bus.vR);

/* ---------- master ---------- */
const L = new Float32Array(N), R = new Float32Array(N);
for (let i = 0; i < N; i++) {
  L[i] = bus.mL[i] * 0.9 + bus.xL[i] * 0.85 + rvL[i] * 0.9;
  R[i] = bus.mR[i] * 0.9 + bus.xR[i] * 0.85 + rvR[i] * 0.9;
}
let peak = 0;
for (let i = 0; i < N; i++) peak = Math.max(peak, Math.abs(L[i]), Math.abs(R[i]));
const fadeIn = Math.round(0.02 * SR), fadeOut = Math.round(0.35 * SR);
const pcm = Buffer.alloc(N * 8);
const STAGE = 0.3;
for (let i = 0; i < N; i++) {
  let g = 1;
  if (i < fadeIn) g = i / fadeIn;
  if (i > N - fadeOut) g = Math.max(0, (N - i) / fadeOut);
  pcm.writeFloatLE(L[i] * STAGE * g, i * 8);
  pcm.writeFloatLE(R[i] * STAGE * g, i * 8 + 4);
}
const hdr = Buffer.alloc(44);
hdr.write("RIFF", 0); hdr.writeUInt32LE(36 + pcm.length, 4); hdr.write("WAVE", 8); hdr.write("fmt ", 12);
hdr.writeUInt32LE(16, 16); hdr.writeUInt16LE(3, 20); hdr.writeUInt16LE(2, 22); hdr.writeUInt32LE(SR, 24);
hdr.writeUInt32LE(SR * 8, 28); hdr.writeUInt16LE(8, 32); hdr.writeUInt16LE(32, 34); hdr.write("data", 36); hdr.writeUInt32LE(pcm.length, 40);
await writeFile(join(root, "tools", ".render", "audio.wav"), Buffer.concat([hdr, pcm]));
console.log(`audio.wav ${DURATION}s ${SR}Hz stereo float, mix peak ${(peak * STAGE).toFixed(2)}, kicks ${kicks.length}`);
