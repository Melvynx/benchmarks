const fs = require("fs");

const SAMPLE_RATE = 44100;
const DURATION = 45.0;
const NUM_SAMPLES = Math.floor(SAMPLE_RATE * DURATION);

// Stereo float buffers
const left = new Float32Array(NUM_SAMPLES);
const right = new Float32Array(NUM_SAMPLES);

function clamp(x, min, max) {
  return x < min ? min : x > max ? max : x;
}

// Soft saturation
function tanh(x) {
  const e2x = Math.exp(2 * clamp(x, -10, 10));
  return (e2x - 1) / (e2x + 1);
}

// MIDI to Hz
function mtof(midi) {
  return 440 * Math.pow(2, (midi - 69) / 12);
}

// Add a warm synth pad note
function addPad(startSec, durSec, midi, amp, pan = 0) {
  const start = Math.floor(startSec * SAMPLE_RATE);
  const len = Math.floor(durSec * SAMPLE_RATE);
  const freq = mtof(midi);
  let phase1 = 0, phase2 = 0.25, phase3 = 0.5;
  const inc1 = freq / SAMPLE_RATE;
  const inc2 = (freq * 1.003) / SAMPLE_RATE;
  const inc3 = (freq * 0.997) / SAMPLE_RATE;

  for (let i = 0; i < len && start + i < NUM_SAMPLES; i++) {
    const t = i / SAMPLE_RATE;
    const attack = Math.min(1, t / 0.35);
    const release = Math.min(1, (durSec - t) / 0.5);
    const env = attack * release * amp;

    // Warm filtered saw/triangle hybrid
    const s1 = Math.sin(2 * Math.PI * phase1) + 0.35 * Math.sin(4 * Math.PI * phase1);
    const s2 = Math.sin(2 * Math.PI * phase2) + 0.25 * Math.sin(6 * Math.PI * phase2);
    const s3 = Math.sin(2 * Math.PI * phase3);

    phase1 = (phase1 + inc1) % 1;
    phase2 = (phase2 + inc2) % 1;
    phase3 = (phase3 + inc3) % 1;

    const sig = (s1 + s2 + s3) * 0.33 * env;
    left[start + i] += sig * (1 - 0.3 * pan);
    right[start + i] += sig * (1 + 0.3 * pan);
  }
}

// Add a pluck / arpeggio note
function addPluck(startSec, durSec, midi, amp, pan = 0) {
  const start = Math.floor(startSec * SAMPLE_RATE);
  const len = Math.floor(durSec * SAMPLE_RATE);
  const freq = mtof(midi);
  let phase = 0;
  const inc = freq / SAMPLE_RATE;

  for (let i = 0; i < len && start + i < NUM_SAMPLES; i++) {
    const t = i / SAMPLE_RATE;
    const attack = Math.min(1, t / 0.006);
    const decay = Math.exp(-t * 9.5);
    const harmDecay = Math.exp(-t * 22.0);
    const env = attack * decay * amp;

    const sig =
      (Math.sin(2 * Math.PI * phase) +
        0.5 * harmDecay * Math.sin(4 * Math.PI * phase) +
        0.25 * harmDecay * Math.sin(6 * Math.PI * phase)) *
      env;
    phase = (phase + inc) % 1;

    left[start + i] += sig * (1 - 0.45 * pan);
    right[start + i] += sig * (1 + 0.45 * pan);
  }
}

// Add punchy sub kick
function addKick(startSec, amp = 0.32) {
  const start = Math.floor(startSec * SAMPLE_RATE);
  const len = Math.floor(0.28 * SAMPLE_RATE);
  let phase = 0;
  for (let i = 0; i < len && start + i < NUM_SAMPLES; i++) {
    const t = i / SAMPLE_RATE;
    const freq = 52 + 115 * Math.exp(-t * 36);
    phase += freq / SAMPLE_RATE;
    const env = Math.exp(-t * 11) * Math.min(1, t / 0.002);
    const click = Math.exp(-t * 140) * 0.25 * Math.sin(2 * Math.PI * 1200 * t);
    const sig = (Math.sin(2 * Math.PI * phase) * env + click) * amp;
    left[start + i] += sig;
    right[start + i] += sig;
  }
}

// Add crisp hi-hat / shaker
function addHat(startSec, dur = 0.045, amp = 0.06, pan = 0) {
  const start = Math.floor(startSec * SAMPLE_RATE);
  const len = Math.floor(dur * SAMPLE_RATE);
  for (let i = 0; i < len && start + i < NUM_SAMPLES; i++) {
    const t = i / SAMPLE_RATE;
    const env = Math.exp(-t / (dur * 0.28));
    // Metallic high-frequency noise
    const n = (Math.random() * 2 - 1) * Math.sin(2 * Math.PI * 6800 * t);
    const sig = n * env * amp;
    left[start + i] += sig * (1 - 0.4 * pan);
    right[start + i] += sig * (1 + 0.4 * pan);
  }
}

// Add scene transition whoosh / flare sweep
function addWhoosh(centerSec, dur = 0.55, amp = 0.16, dir = 1) {
  const startSec = centerSec - dur * 0.5;
  const start = Math.max(0, Math.floor(startSec * SAMPLE_RATE));
  const len = Math.floor(dur * SAMPLE_RATE);
  let lpL = 0, lpR = 0;
  let phase = 0;
  for (let i = 0; i < len && start + i < NUM_SAMPLES; i++) {
    const u = i / len; // 0..1
    const env = Math.sin(Math.PI * u) * Math.sin(Math.PI * u);
    const cutoff = 0.03 + 0.22 * env;
    const rawL = Math.random() * 2 - 1;
    const rawR = Math.random() * 2 - 1;
    lpL += cutoff * (rawL - lpL);
    lpR += cutoff * (rawR - lpR);

    // Subtle tonal pitch sweep
    const toneFreq = dir > 0 ? 180 + 520 * u : 680 - 480 * u;
    phase += toneFreq / SAMPLE_RATE;
    const tone = Math.sin(2 * Math.PI * phase) * 0.35;

    const pan = dir * (u * 1.4 - 0.7);
    left[start + i] += (lpL + tone) * env * amp * (1 - 0.4 * pan);
    right[start + i] += (lpR + tone) * env * amp * (1 + 0.4 * pan);
  }
}

// Add tactile UI click / pop
function addUiPop(sec, pitch = 920, amp = 0.14, pan = 0) {
  const start = Math.floor(sec * SAMPLE_RATE);
  const len = Math.floor(0.045 * SAMPLE_RATE);
  let phase = 0;
  for (let i = 0; i < len && start + i < NUM_SAMPLES; i++) {
    const t = i / SAMPLE_RATE;
    const f = pitch * (1 + 0.6 * Math.exp(-t * 90));
    phase += f / SAMPLE_RATE;
    const env = Math.exp(-t * 85);
    const sig = Math.sin(2 * Math.PI * phase) * env * amp;
    left[start + i] += sig * (1 - 0.3 * pan);
    right[start + i] += sig * (1 + 0.3 * pan);
  }
}

// Add success chime (two/three quick rising notes)
function addSuccessChime(sec, amp = 0.14) {
  addPluck(sec, 0.35, 72, amp, -0.2);       // C5
  addPluck(sec + 0.06, 0.40, 76, amp, 0.2); // E5
  addPluck(sec + 0.12, 0.55, 79, amp * 1.15, 0.0); // G5
  addPluck(sec + 0.18, 0.70, 83, amp * 1.1, 0.1);  // B5
}

// 1. Intro tension (0.0s - 3.1s): subtle low drone + glitch ticks
addPad(0.0, 3.1, 45, 0.12, -0.2); // A2
addPad(0.0, 3.1, 52, 0.09, 0.2);  // E3
for (let t = 0.25; t < 2.9; t += 0.22) {
  addUiPop(t, 420 + ((t * 370) % 500), 0.06, Math.sin(t * 7) * 0.5);
}

// 2. At t = 3.1s: THE LUMAIL FLARE SLASH!
addWhoosh(3.1, 0.65, 0.24, 1);
addKick(3.15, 0.38);
addSuccessChime(3.2, 0.16);

// 3. Main Groove (4.5s - 43.5s) at 120 BPM (beat = 0.5s, bar = 2.0s)
// Chord progression in F Lydian / C Major9 / A Minor9 / G6 (warm, optimistic, modern Apple/Linear aesthetic)
const chords = [
  [53, 60, 64, 69, 72], // Fmaj9 (F3, C4, E4, A4, C5)
  [48, 55, 64, 67, 71], // Cmaj7 (C3, G3, E4, G4, B4)
  [57, 64, 67, 71, 76], // Am9   (A3, E4, G4, B4, E5)
  [55, 62, 64, 69, 74], // G6/9  (G3, D4, E4, A4, D5)
];

let barIndex = 0;
for (let barStart = 4.5; barStart < 42.5; barStart += 2.0) {
  const chord = chords[barIndex % chords.length];
  // Warm pad
  chord.forEach((note, idx) => {
    addPad(barStart, 2.05, note, idx === 0 ? 0.11 : 0.065, (idx - 2) * 0.25);
  });

  // 16th-note melodic arpeggio (0.125s steps)
  const arpPattern = [1, 2, 3, 4, 2, 3, 4, 3];
  for (let step = 0; step < 16; step++) {
    const t = barStart + step * 0.125;
    if (t >= 42.5) break;
    const note = chord[arpPattern[step % arpPattern.length]];
    const accent = step % 4 === 0 ? 1.0 : 0.62;
    addPluck(t, 0.24, note + 12, 0.052 * accent, Math.sin(step * 1.3) * 0.5);

    // Hi-hats on 8ths and 16ths
    if (step % 2 === 0) {
      addHat(t, 0.04, 0.045, (step % 4 === 0 ? -0.3 : 0.3));
    } else if (barStart >= 10.0) {
      addHat(t, 0.025, 0.024, 0.1);
    }
  }

  // Kick on beats 0, 1.5, 2.5
  addKick(barStart, 0.26);
  if (barStart >= 10.0) {
    addKick(barStart + 0.75, 0.18);
    addKick(barStart + 1.0, 0.24);
  } else {
    addKick(barStart + 1.0, 0.22);
  }

  barIndex++;
}

// 4. Scene transitions & UI Sound Effects synced to our 9-scene choreography!
const transitions = [4.5, 10.2, 15.5, 21.0, 27.0, 32.5, 37.5, 41.8];
transitions.forEach((t, i) => {
  addWhoosh(t, 0.48, 0.16, i % 2 === 0 ? 1 : -1);
});

// Keycap pops in Scene 2 (Hero)
addUiPop(5.4, 880, 0.14, -0.2);
addUiPop(6.1, 1040, 0.14, 0.2);
// Button click at t = 8.4s
addUiPop(8.4, 620, 0.18, 0);
addSuccessChime(8.45, 0.12);

// Scene 3 Migration MCP tool calls
[11.4, 12.2, 13.0, 13.8].forEach((t, idx) => {
  addUiPop(t, 780 + idx * 110, 0.13, 0.15);
});
addSuccessChime(14.1, 0.13);

// Scene 4 Editor typing & AI tighten pop
for (let t = 16.3; t < 17.8; t += 0.09) {
  addUiPop(t, 1200 + ((t * 900) % 300), 0.045, -0.1);
}
addSuccessChime(18.5, 0.13);

// Scene 5 Agent MCP tool calls
[22.2, 23.1, 24.0, 24.9].forEach((t, idx) => {
  addUiPop(t, 820 + idx * 95, 0.13, -0.15);
});
addSuccessChime(25.4, 0.13);

// Scene 6 Workflow node pulses
[28.0, 28.8, 29.6, 30.4, 31.2].forEach((t, idx) => {
  addUiPop(t, 700 + idx * 120, 0.12, (idx - 2) * 0.2);
});

// Scene 7 SDK code & OTP priority lane delivery
for (let t = 33.2; t < 34.8; t += 0.11) {
  addUiPop(t, 1350 + ((t * 700) % 250), 0.04, -0.25);
}
addSuccessChime(35.6, 0.14);

// Scene 8 Pricing slider ticks
[38.5, 39.2, 39.9, 40.5].forEach((t, idx) => {
  addUiPop(t, 650 + idx * 140, 0.12, 0);
});

// Scene 9 Finale Resolve Chord (41.8s - 45.0s): Lush Cmaj9 / Fmaj9 resolution
const finaleChord = [48, 55, 60, 64, 67, 71, 74, 79]; // Cmaj9
finaleChord.forEach((note, idx) => {
  addPad(41.8, 3.1, note, idx < 2 ? 0.12 : 0.075, (idx - 3.5) * 0.18);
});
addKick(41.8, 0.34);
addSuccessChime(42.0, 0.16);

// Master limiter & fade-out in last 0.45s
for (let i = 0; i < NUM_SAMPLES; i++) {
  const t = i / SAMPLE_RATE;
  let fade = 1.0;
  if (t < 0.08) fade = t / 0.08;
  if (t > DURATION - 0.45) fade = Math.max(0, (DURATION - t) / 0.45);
  left[i] = tanh(left[i] * 1.15) * 0.85 * fade;
  right[i] = tanh(right[i] * 1.15) * 0.85 * fade;
}

// Write 16-bit PCM Stereo WAV
const dataSize = NUM_SAMPLES * 4;
const buf = Buffer.alloc(44 + dataSize);
buf.write("RIFF", 0);
buf.writeUInt32LE(36 + dataSize, 4);
buf.write("WAVE", 8);
buf.write("fmt ", 12);
buf.writeUInt32LE(16, 16);
buf.writeUInt16LE(1, 20); // PCM
buf.writeUInt16LE(2, 22); // 2 channels
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

fs.writeFileSync(".research/audio.wav", buf);
console.log("Generated .research/audio.wav (45.0s stereo 44.1kHz)");
