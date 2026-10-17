import fs from "fs";

const SAMPLE_RATE = 48000;
const DURATION = 45.0;
const NUM_SAMPLES = Math.floor(SAMPLE_RATE * DURATION);

const left = new Float32Array(NUM_SAMPLES);
const right = new Float32Array(NUM_SAMPLES);

function clamp(x, min = -1, max = 1) {
  return Math.max(min, Math.min(max, x));
}

function softClip(x) {
  return Math.tanh(x * 1.15);
}

// Deterministic PRNG for clean noise textures
let seed = 421337;
function rand() {
  seed = (seed * 1664525 + 1013904223) >>> 0;
  return (seed / 4294967296) * 2 - 1;
}

function midiToFreq(m) {
  return 440 * Math.pow(2, (m - 69) / 12);
}

// Add a warm electric-piano / glass marimba note
function addNote(startSec, durSec, midi, amp, pan = 0, brightness = 1.0) {
  const f = midiToFreq(midi);
  const start = Math.floor(startSec * SAMPLE_RATE);
  const len = Math.floor(durSec * SAMPLE_RATE);
  const panL = Math.cos(((pan + 1) * Math.PI) / 4);
  const panR = Math.sin(((pan + 1) * Math.PI) / 4);

  for (let i = 0; i < len; i++) {
    const idx = start + i;
    if (idx >= NUM_SAMPLES) break;
    const t = i / SAMPLE_RATE;
    const env = Math.min(1, t / 0.008) * Math.exp(-t * (3.2 / durSec));
    const modEnv = Math.exp(-t * 14);
    const mod = Math.sin(2 * Math.PI * f * 2 * t) * 0.65 * brightness * modEnv;
    const sig =
      (Math.sin(2 * Math.PI * f * t + mod) +
        0.25 * Math.sin(2 * Math.PI * f * 2 * t) * Math.exp(-t * 6) +
        0.08 * Math.sin(2 * Math.PI * f * 3 * t) * Math.exp(-t * 12)) *
      env *
      amp;
    left[idx] += sig * panL;
    right[idx] += sig * panR;
  }
}

// Warm analog pad chord
function addPad(startSec, durSec, midis, amp) {
  const start = Math.floor(startSec * SAMPLE_RATE);
  const len = Math.floor(durSec * SAMPLE_RATE);
  const freqs = midis.map(midiToFreq);

  for (let i = 0; i < len; i++) {
    const idx = start + i;
    if (idx >= NUM_SAMPLES) break;
    const t = i / SAMPLE_RATE;
    const attack = Math.min(1, t / 0.35);
    const release = Math.min(1, (durSec - t) / 0.45);
    const env = Math.max(0, attack * release);
    let sL = 0;
    let sR = 0;
    for (let k = 0; k < freqs.length; k++) {
      const f = freqs[k];
      const detune = 1 + (k - 1.5) * 0.0018;
      const v1 = Math.sin(2 * Math.PI * f * t);
      const v2 = Math.sin(2 * Math.PI * f * detune * t + 0.7);
      const sub = 0.25 * Math.sin(2 * Math.PI * (f * 0.5) * t);
      const pan = (k / Math.max(1, freqs.length - 1)) * 0.6 - 0.3;
      sL += (v1 * (0.6 - pan * 0.3) + v2 * 0.4 + sub * 0.5) / freqs.length;
      sR += (v1 * (0.6 + pan * 0.3) + v2 * 0.4 + sub * 0.5) / freqs.length;
    }
    left[idx] += sL * env * amp;
    right[idx] += sR * env * amp;
  }
}

// Warm sub bass
function addBass(startSec, durSec, midi, amp) {
  const f = midiToFreq(midi);
  const start = Math.floor(startSec * SAMPLE_RATE);
  const len = Math.floor(durSec * SAMPLE_RATE);
  for (let i = 0; i < len; i++) {
    const idx = start + i;
    if (idx >= NUM_SAMPLES) break;
    const t = i / SAMPLE_RATE;
    const env = Math.min(1, t / 0.015) * Math.min(1, (durSec - t) / 0.08) * Math.exp(-t * 1.1);
    const sig =
      (Math.sin(2 * Math.PI * f * t) +
        0.35 * Math.sin(2 * Math.PI * f * 2 * t) * Math.exp(-t * 4.5)) *
      env *
      amp;
    left[idx] += sig;
    right[idx] += sig;
  }
}

// Soft kick drum
function addKick(startSec, amp = 0.32) {
  const start = Math.floor(startSec * SAMPLE_RATE);
  const len = Math.floor(0.22 * SAMPLE_RATE);
  let phase = 0;
  for (let i = 0; i < len; i++) {
    const idx = start + i;
    if (idx >= NUM_SAMPLES) break;
    const t = i / SAMPLE_RATE;
    const freq = 46 + 115 * Math.exp(-t * 36);
    phase += (2 * Math.PI * freq) / SAMPLE_RATE;
    const env = Math.exp(-t * 14);
    const click = Math.exp(-t * 180) * 0.18;
    const s = (Math.sin(phase) * env + click) * amp;
    left[idx] += s;
    right[idx] += s;
  }
}

// Crisp hi-hat / shaker tick
function addHat(startSec, durSec = 0.035, amp = 0.05, pan = 0) {
  const start = Math.floor(startSec * SAMPLE_RATE);
  const len = Math.floor(durSec * SAMPLE_RATE);
  const panL = Math.cos(((pan + 1) * Math.PI) / 4);
  const panR = Math.sin(((pan + 1) * Math.PI) / 4);
  let prev = 0;
  for (let i = 0; i < len; i++) {
    const idx = start + i;
    if (idx >= NUM_SAMPLES) break;
    const t = i / SAMPLE_RATE;
    const n = rand();
    const hp = n - prev;
    prev = n;
    const env = Math.exp(-t / (durSec * 0.28));
    left[idx] += hp * env * amp * panL;
    right[idx] += hp * env * amp * panR;
  }
}

// Tactile UI click / terminal key tick
function addUiClick(startSec, freq = 1800, amp = 0.07, pan = 0) {
  const start = Math.floor(startSec * SAMPLE_RATE);
  const len = Math.floor(0.018 * SAMPLE_RATE);
  const panL = Math.cos(((pan + 1) * Math.PI) / 4);
  const panR = Math.sin(((pan + 1) * Math.PI) / 4);
  for (let i = 0; i < len; i++) {
    const idx = start + i;
    if (idx >= NUM_SAMPLES) break;
    const t = i / SAMPLE_RATE;
    const env = Math.exp(-t * 260);
    const tone = Math.sin(2 * Math.PI * freq * t) + 0.5 * Math.sin(2 * Math.PI * freq * 2.4 * t);
    const s = tone * env * amp;
    left[idx] += s * panL;
    right[idx] += s * panR;
  }
}

// Smooth cinematic whoosh for transitions
function addWhoosh(startSec, durSec = 0.45, amp = 0.11, dir = 1) {
  const start = Math.floor(startSec * SAMPLE_RATE);
  const len = Math.floor(durSec * SAMPLE_RATE);
  let lp = 0;
  for (let i = 0; i < len; i++) {
    const idx = start + i;
    if (idx >= NUM_SAMPLES) break;
    const u = i / len;
    const env = Math.sin(Math.PI * u) ** 1.6;
    const cutoff = 0.03 + 0.18 * Math.sin(Math.PI * u);
    lp = lp + cutoff * (rand() - lp);
    const pan = (u * 2 - 1) * 0.65 * dir;
    const panL = Math.cos(((pan + 1) * Math.PI) / 4);
    const panR = Math.sin(((pan + 1) * Math.PI) / 4);
    left[idx] += lp * env * amp * panL;
    right[idx] += lp * env * amp * panR;
  }
}

// Signature Lumail harmonic shimmer chime
function addLumailChime(startSec, amp = 0.14) {
  const notes = [65, 69, 72, 76, 81]; // F4, A4, C5, E5, A5 (Fmaj9)
  notes.forEach((n, idx) => {
    addNote(startSec + idx * 0.045, 1.8, n, amp * (1 - idx * 0.1), (idx - 2) * 0.25, 1.4);
  });
}

// Chord progression across 45 seconds (2.5s per bar = 18 bars)
const progression = [
  { root: 41, chord: [57, 60, 64, 67] }, // Fmaj9
  { root: 40, chord: [55, 59, 62, 64] }, // Em7
  { root: 45, chord: [57, 60, 64, 69] }, // Am9
  { root: 43, chord: [55, 59, 62, 67] }, // G6
];

for (let bar = 0; bar < 18; bar++) {
  const t0 = bar * 2.5;
  const p = progression[bar % progression.length];
  const isFinal = bar === 17;
  const dur = isFinal ? 2.45 : 2.5;

  addPad(t0, dur, p.chord, isFinal ? 0.15 : 0.13);
  addBass(t0, dur * 0.92, p.root, 0.22);

  if (bar >= 1 && bar < 17) {
    // Rhythmic pulse (every 0.625s = 96 BPM quarter note)
    for (let beat = 0; beat < 4; beat++) {
      const bt = t0 + beat * 0.625;
      if (beat === 0 || beat === 2) {
        addKick(bt, bar >= 6 && bar <= 12 ? 0.28 : 0.22);
      }
      if (beat === 1 || beat === 3) {
        addHat(bt, 0.04, 0.045, beat === 1 ? -0.25 : 0.25);
      }
      addHat(bt + 0.3125, 0.025, 0.03, (beat % 2 === 0 ? 1 : -1) * 0.35);

      // Arpeggio marimba plucks
      const arpNote = p.chord[(beat + bar) % p.chord.length] + (beat === 3 ? 12 : 0);
      addNote(bt, 0.55, arpNote, 0.075, ((beat % 3) - 1) * 0.35, 0.9);
    }
  }
}

// Scene transition whooshes & signature sound effects synced to visual acts
const transitions = [0.15, 2.15, 5.0, 10.5, 16.0, 22.0, 27.5, 33.0, 39.5, 42.0];
transitions.forEach((t, i) => {
  addWhoosh(Math.max(0, t - 0.18), 0.42, 0.12, i % 2 === 0 ? 1 : -1);
});

// Logo lockup chimes at Act I (2.2s) and Act IX (42.1s)
addLumailChime(2.2, 0.13);
addLumailChime(42.1, 0.15);

// Terminal & MCP typing clicks in Act II (6.0-9.5s), Act III (11.5-14.8s), Act IV (17.2-21.0s), Act VI (28.2-31.5s)
const typingWindows = [
  [5.8, 9.4, 16],
  [11.3, 14.8, 14],
  [17.0, 21.2, 18],
  [28.2, 31.4, 15],
];
for (const [s, e, rate] of typingWindows) {
  const step = 1 / rate;
  for (let t = s; t < e; t += step) {
    const jitter = (rand() * 0.35) * step;
    const freq = 1400 + ((Math.floor(t * 23) % 7) * 180);
    addUiClick(t + jitter, freq, 0.045, (rand() * 0.5));
  }
}

// Priority lane fast delivery zip at 30.2s
addWhoosh(30.1, 0.25, 0.15, 1);
addNote(30.3, 0.6, 81, 0.11, 0.3, 1.5);
addNote(30.38, 0.8, 88, 0.12, 0.4, 1.6);

// Pricing slider ticks in Act VII (34.2s - 38.5s)
for (let i = 0; i < 12; i++) {
  addUiClick(34.2 + i * 0.32, 1100 + i * 95, 0.055, (i / 12) * 0.6 - 0.3);
}

// Master envelope with clean fade-in (0.08s) and fade-out (44.4s -> 45.0s)
for (let i = 0; i < NUM_SAMPLES; i++) {
  const t = i / SAMPLE_RATE;
  const fadeIn = Math.min(1, t / 0.08);
  const fadeOut = Math.min(1, (DURATION - t) / 0.55);
  const env = Math.max(0, fadeIn * fadeOut);
  left[i] = softClip(left[i] * env);
  right[i] = softClip(right[i] * env);
}

// Write 16-bit stereo WAV
const dataSize = NUM_SAMPLES * 4;
const buf = Buffer.alloc(44 + dataSize);
buf.write("RIFF", 0);
buf.writeUInt32LE(36 + dataSize, 4);
buf.write("WAVE", 8);
buf.write("fmt ", 12);
buf.writeUInt32LE(16, 16);
buf.writeUInt16LE(1, 20); // PCM
buf.writeUInt16LE(2, 22); // Stereo
buf.writeUInt32LE(SAMPLE_RATE, 24);
buf.writeUInt32LE(SAMPLE_RATE * 4, 28);
buf.writeUInt16LE(4, 32);
buf.writeUInt16LE(16, 34);
buf.write("data", 36);
buf.writeUInt32LE(dataSize, 40);

let offset = 44;
for (let i = 0; i < NUM_SAMPLES; i++) {
  const sL = Math.max(-32768, Math.min(32767, Math.round(left[i] * 32767)));
  const sR = Math.max(-32768, Math.min(32767, Math.round(right[i] * 32767)));
  buf.writeInt16LE(sL, offset);
  buf.writeInt16LE(sR, offset + 2);
  offset += 4;
}

fs.writeFileSync("audio.wav", buf);
console.log("Generated audio.wav:", (buf.length / 1024 / 1024).toFixed(2), "MB");
