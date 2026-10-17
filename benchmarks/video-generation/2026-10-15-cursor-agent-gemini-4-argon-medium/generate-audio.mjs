import fs from "fs";

const SAMPLE_RATE = 44100;
const DURATION = 45.0;
const NUM_SAMPLES = Math.floor(SAMPLE_RATE * DURATION);

const left = new Float32Array(NUM_SAMPLES);
const right = new Float32Array(NUM_SAMPLES);

// Helper: soft saturation
function tanh(x) {
  if (x > 3) return 1;
  if (x < -3) return -1;
  const x2 = x * x;
  return (x * (27 + x2)) / (27 + 9 * x2);
}

// Helper: add stereo tone with envelope
function addTone(startSec, durSec, freqFn, ampFn, pan = 0, wave = "sine") {
  const startIdx = Math.max(0, Math.floor(startSec * SAMPLE_RATE));
  const endIdx = Math.min(NUM_SAMPLES, Math.floor((startSec + durSec) * SAMPLE_RATE));
  let phase = 0;
  const lGain = Math.cos(((pan + 1) * Math.PI) / 4);
  const rGain = Math.sin(((pan + 1) * Math.PI) / 4);

  for (let i = startIdx; i < endIdx; i++) {
    const t = (i - startIdx) / SAMPLE_RATE;
    const norm = t / durSec;
    const freq = typeof freqFn === "function" ? freqFn(t, norm) : freqFn;
    const amp = typeof ampFn === "function" ? ampFn(t, norm) : ampFn;
    phase += (2 * Math.PI * freq) / SAMPLE_RATE;
    let s = 0;
    if (wave === "sine") {
      s = Math.sin(phase);
    } else if (wave === "triangle") {
      s = (2 / Math.PI) * Math.asin(Math.sin(phase));
    } else if (wave === "warm") {
      s = 0.7 * Math.sin(phase) + 0.2 * Math.sin(phase * 2) + 0.08 * Math.sin(phase * 3);
    } else if (wave === "pad") {
      s =
        0.55 * Math.sin(phase) +
        0.25 * Math.sin(phase * 1.003 + 0.4) +
        0.15 * Math.sin(phase * 2.0) +
        0.05 * Math.sin(phase * 0.5);
    }
    left[i] += s * amp * lGain;
    right[i] += s * amp * rGain;
  }
}

// Helper: filtered noise whoosh / riser
function addWhoosh(centerSec, durSec, peakAmp = 0.12, panDir = 1) {
  const startSec = centerSec - durSec * 0.5;
  const startIdx = Math.max(0, Math.floor(startSec * SAMPLE_RATE));
  const endIdx = Math.min(NUM_SAMPLES, Math.floor((startSec + durSec) * SAMPLE_RATE));
  let lp1 = 0;
  let lp2 = 0;
  let seed = Math.floor(centerSec * 12345 + 6789);
  for (let i = startIdx; i < endIdx; i++) {
    const t = (i - startIdx) / SAMPLE_RATE;
    const norm = t / durSec;
    seed = (seed * 1664525 + 1013904223) >>> 0;
    const white = (seed / 0xffffffff) * 2 - 1;
    // Sweep filter cutoff up then down
    const env = Math.sin(norm * Math.PI);
    const alpha = 0.015 + 0.14 * Math.pow(env, 1.5);
    lp1 += alpha * (white - lp1);
    lp2 += alpha * (lp1 - lp2);
    const pan = (norm * 2 - 1) * 0.65 * panDir;
    const lGain = Math.cos(((pan + 1) * Math.PI) / 4);
    const rGain = Math.sin(((pan + 1) * Math.PI) / 4);
    const amp = peakAmp * Math.pow(env, 2);
    left[i] += lp2 * amp * lGain;
    right[i] += lp2 * amp * rGain;
  }
}

// Helper: UI click / keystroke tick
function addTick(sec, pitch = 1400, amp = 0.08, pan = 0) {
  addTone(
    sec,
    0.028,
    (t) => pitch * Math.exp(-t * 45),
    (t, norm) => amp * Math.exp(-norm * 6) * Math.sin(norm * Math.PI),
    pan,
    "triangle"
  );
}

// Helper: Harmonic chime (for milestones / badges)
function addChime(sec, baseFreq = 523.25, amp = 0.08, pan = 0) {
  const ratios = [1, 1.25, 1.5, 2];
  ratios.forEach((r, idx) => {
    addTone(
      sec + idx * 0.045,
      0.55,
      baseFreq * r,
      (t, norm) => amp * Math.pow(1 - norm, 2.2) * Math.min(1, t / 0.012),
      pan + (idx - 1.5) * 0.15,
      "warm"
    );
  });
}

// 1. Warm Cinematic Chord Progression (Fmaj9 -> G6 -> Am9 -> Cmaj9 / Em7)
// 120 BPM -> 1 bar = 2.0s
const chords = [
  // Intro tension (0 - 1.8s)
  { start: 0.0, dur: 1.8, notes: [110.0, 164.81, 220.0, 246.94], amp: 0.045 },
  // Flare drop & Scene 1 Hero (1.8 - 5.0s) - Fmaj9
  { start: 1.8, dur: 3.4, notes: [87.31, 174.61, 220.0, 261.63, 329.63, 392.0], amp: 0.065 },
  // Scene 2 Migration (5.0 - 10.5s) - G6 -> Am9
  { start: 5.0, dur: 2.8, notes: [98.0, 196.0, 246.94, 293.66, 329.63], amp: 0.06 },
  { start: 7.6, dur: 3.1, notes: [110.0, 220.0, 261.63, 329.63, 392.0, 493.88], amp: 0.062 },
  // Scene 3 Visual Editor (10.5 - 16.5s) - Fmaj9 -> Cmaj9
  { start: 10.5, dur: 3.2, notes: [87.31, 174.61, 220.0, 261.63, 329.63, 392.0], amp: 0.062 },
  { start: 13.5, dur: 3.2, notes: [130.81, 196.0, 246.94, 293.66, 329.63, 392.0], amp: 0.062 },
  // Scene 4 AI Agents & 139 MCP Tools (16.5 - 23.0s) - Dm9 -> Em7 -> Am9
  { start: 16.5, dur: 3.3, notes: [73.42, 146.83, 220.0, 261.63, 329.63, 349.23], amp: 0.065 },
  { start: 19.6, dur: 3.6, notes: [82.41, 164.81, 246.94, 293.66, 392.0], amp: 0.065 },
  // Scene 5 Workflows (23.0 - 29.0s) - Fmaj9 -> G6
  { start: 23.0, dur: 3.2, notes: [87.31, 174.61, 220.0, 261.63, 329.63, 392.0], amp: 0.062 },
  { start: 26.0, dur: 3.2, notes: [98.0, 196.0, 246.94, 293.66, 392.0, 440.0], amp: 0.065 },
  // Scene 6 Transactional Priority Lane (29.0 - 34.5s) - Am9 -> Em7
  { start: 29.0, dur: 2.9, notes: [110.0, 220.0, 261.63, 329.63, 392.0, 493.88], amp: 0.066 },
  { start: 31.7, dur: 3.0, notes: [82.41, 164.81, 246.94, 293.66, 392.0, 493.88], amp: 0.066 },
  // Scene 7 Fair Pricing (34.5 - 40.0s) - Fmaj9 -> G13
  { start: 34.5, dur: 2.9, notes: [87.31, 174.61, 220.0, 261.63, 329.63, 392.0], amp: 0.065 },
  { start: 37.2, dur: 3.0, notes: [98.0, 196.0, 246.94, 329.63, 392.0, 440.0], amp: 0.068 },
  // Scene 8 Finale (40.0 - 45.0s) - Glorious Cmaj9 resolution
  { start: 40.0, dur: 4.95, notes: [65.41, 130.81, 196.0, 246.94, 293.66, 329.63, 392.0, 523.25], amp: 0.072 },
];

for (const c of chords) {
  c.notes.forEach((freq, idx) => {
    const pan = ((idx % 2 === 0 ? -1 : 1) * (idx + 1)) / (c.notes.length + 1) * 0.55;
    addTone(
      c.start,
      c.dur,
      freq,
      (t, norm) => {
        const attack = Math.min(1, t / 0.25);
        const release = Math.pow(Math.max(0, 1 - norm), 0.85);
        return (c.amp / Math.sqrt(c.notes.length)) * attack * release;
      },
      pan,
      "pad"
    );
  });
}

// 2. Rhythmic Pulse & Sub-bass (from 1.8s to 43.5s, 120 BPM = 0.5s beat)
for (let beat = 4; beat < 87; beat++) {
  const sec = beat * 0.5;
  // Soft kick / sub pulse
  addTone(
    sec,
    0.22,
    (t) => 55 + 95 * Math.exp(-t * 32),
    (t, norm) => 0.13 * Math.exp(-norm * 4.5) * Math.min(1, t / 0.005),
    0,
    "sine"
  );
  // Off-beat subtle marimba/synth pluck
  const scale = [261.63, 293.66, 329.63, 392.0, 440.0, 523.25, 587.33, 659.25];
  const note = scale[(beat * 3 + 1) % scale.length];
  addTone(
    sec + 0.25,
    0.18,
    note,
    (t, norm) => 0.032 * Math.pow(1 - norm, 2.5) * Math.min(1, t / 0.008),
    ((beat % 3) - 1) * 0.35,
    "warm"
  );
}

// 3. Scene Transition Whooshes & Key Event SFX
// t = 1.8s: Flare laser slice & impact drop
addWhoosh(1.8, 0.7, 0.22, 1);
addTone(
  1.8,
  0.85,
  (t) => 140 * Math.exp(-t * 5) + 42,
  (t, norm) => 0.24 * Math.pow(1 - norm, 1.8) * Math.min(1, t / 0.006),
  0,
  "warm"
);
addChime(1.85, 523.25, 0.09, 0);

// Scene transitions
[5.0, 10.5, 16.5, 23.0, 29.0, 34.5, 40.0].forEach((sec, idx) => {
  addWhoosh(sec, 0.65, 0.15, idx % 2 === 0 ? 1 : -1);
});

// Terminal typing & MCP chimes in Scene 2 (5.5s - 9.8s)
for (let t = 5.4; t < 6.5; t += 0.065) addTick(t, 1500 + ((t * 1000) % 400), 0.045, -0.2);
addChime(6.8, 587.33, 0.07, 0.2); // 12,847 contacts
addChime(7.8, 659.25, 0.07, 0.25); // 14 tags
addChime(8.7, 783.99, 0.075, 0.3); // 3 workflows
addChime(9.4, 1046.5, 0.085, 0.0); // Done in 8 minutes

// Visual Editor typing & AI polish shimmer in Scene 3 (11.2s - 15.8s)
for (let t = 11.2; t < 12.6; t += 0.07) addTick(t, 1300 + ((t * 900) % 350), 0.04, -0.15);
addTick(13.2, 900, 0.09, 0.1); // Click "Tighten with AI"
addChime(13.5, 659.25, 0.085, 0.15); // AI shimmer

// Agent MCP network pings in Scene 4 (17.2s - 22.2s)
[17.3, 18.0, 18.7, 19.4, 20.1, 20.8, 21.5].forEach((sec, i) => {
  addTone(
    sec,
    0.25,
    440 * Math.pow(1.12246, i),
    (t, norm) => 0.055 * Math.pow(1 - norm, 2) * Math.min(1, t / 0.008),
    ((i % 2) * 2 - 1) * 0.4,
    "warm"
  );
});

// Workflow node activations in Scene 5 (23.8s - 28.2s)
[23.8, 24.8, 25.8, 26.8, 27.7].forEach((sec, i) => {
  addChime(sec, 440 * Math.pow(1.12246, i), 0.065, (i - 2) * 0.2);
});

// Priority lane high-speed OTP streak in Scene 6 (31.2s)
addWhoosh(31.4, 0.5, 0.2, 1);
addChime(31.65, 880, 0.09, 0.3);

// Pricing cards pop-in in Scene 7 (35.5s - 38.5s)
[35.6, 36.2, 36.8, 37.4].forEach((sec, i) => {
  addTick(sec, 1100 + i * 200, 0.07, (i - 1.5) * 0.25);
});
addChime(36.2, 659.25, 0.08, -0.1); // Creator $20 highlight

// Finale CTA click & resolution shimmer in Scene 8 (42.5s)
addTick(42.4, 1000, 0.1, 0);
addChime(42.5, 523.25, 0.11, 0);
addChime(42.85, 783.99, 0.09, 0);

// Master fade-in (first 0.15s) and smooth fade-out (last 0.6s) + soft limiter
for (let i = 0; i < NUM_SAMPLES; i++) {
  const t = i / SAMPLE_RATE;
  let masterEnv = 1.0;
  if (t < 0.15) masterEnv = t / 0.15;
  if (t > DURATION - 0.6) masterEnv = Math.max(0, (DURATION - t) / 0.6);
  left[i] = tanh(left[i] * masterEnv * 1.1) * 0.85;
  right[i] = tanh(right[i] * masterEnv * 1.1) * 0.85;
}

// Write 16-bit PCM Stereo WAV
const dataSize = NUM_SAMPLES * 4;
const buffer = Buffer.alloc(44 + dataSize);
buffer.write("RIFF", 0);
buffer.writeUInt32LE(36 + dataSize, 4);
buffer.write("WAVE", 8);
buffer.write("fmt ", 12);
buffer.writeUInt32LE(16, 16);
buffer.writeUInt16LE(1, 20); // PCM
buffer.writeUInt16LE(2, 22); // 2 channels
buffer.writeUInt32LE(SAMPLE_RATE, 24);
buffer.writeUInt32LE(SAMPLE_RATE * 4, 28);
buffer.writeUInt16LE(4, 32);
buffer.writeUInt16LE(16, 34);
buffer.write("data", 36);
buffer.writeUInt32LE(dataSize, 40);

let offset = 44;
for (let i = 0; i < NUM_SAMPLES; i++) {
  const lSample = Math.max(-32768, Math.min(32767, Math.floor(left[i] * 32767)));
  const rSample = Math.max(-32768, Math.min(32767, Math.floor(right[i] * 32767)));
  buffer.writeInt16LE(lSample, offset);
  buffer.writeInt16LE(rSample, offset + 2);
  offset += 4;
}

fs.writeFileSync("audio.wav", buffer);
console.log("Generated audio.wav:", (buffer.length / 1024 / 1024).toFixed(2), "MB");
