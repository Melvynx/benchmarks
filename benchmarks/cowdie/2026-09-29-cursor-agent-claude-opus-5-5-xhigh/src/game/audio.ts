let ctx: AudioContext | null = null;
let sfxBus: GainNode | null = null;
let musicBus: GainNode | null = null;
let noise: AudioBuffer | null = null;
let musicTimer: number | null = null;

const prefs = { sound: true, music: true, sleepy: false };

export function initAudio() {
  if (ctx) {
    if (ctx.state === "suspended") void ctx.resume();
    return;
  }
  const AC =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext: typeof AudioContext })
      .webkitAudioContext;
  if (!AC) return;
  ctx = new AC();
  const master = ctx.createGain();
  master.gain.value = 0.9;
  const comp = ctx.createDynamicsCompressor();
  comp.threshold.value = -14;
  comp.ratio.value = 3;
  master.connect(comp).connect(ctx.destination);
  sfxBus = ctx.createGain();
  sfxBus.gain.value = prefs.sound ? 1 : 0;
  sfxBus.connect(master);
  musicBus = ctx.createGain();
  musicBus.gain.value = prefs.music ? musicLevel() : 0;
  musicBus.connect(master);

  noise = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
  const d = noise.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;

  startMusic();
}

function musicLevel() {
  return prefs.sleepy ? 0.05 : 0.11;
}

export function setAudioPrefs(sound: boolean, music: boolean, sleepy: boolean) {
  prefs.sound = sound;
  prefs.music = music;
  prefs.sleepy = sleepy;
  if (!ctx || !sfxBus || !musicBus) return;
  const t = ctx.currentTime;
  sfxBus.gain.setTargetAtTime(sound ? 1 : 0, t, 0.05);
  musicBus.gain.setTargetAtTime(music ? musicLevel() : 0, t, 0.4);
}

function env(g: GainNode, t: number, peak: number, attack: number, release: number) {
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(peak, t + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t + attack + release);
}

function tone(
  type: OscillatorType,
  f0: number,
  f1: number,
  dur: number,
  peak = 0.25,
  delay = 0,
  bus: AudioNode | null = sfxBus,
) {
  if (!ctx || !bus) return;
  const t = ctx.currentTime + delay;
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = type;
  o.frequency.setValueAtTime(f0, t);
  o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
  env(g, t, peak, Math.min(0.02, dur * 0.2), dur);
  o.connect(g).connect(bus);
  o.start(t);
  o.stop(t + dur + 0.05);
}

function noiseBurst(
  dur: number,
  freq: number,
  q: number,
  peak = 0.3,
  delay = 0,
  filterType: BiquadFilterType = "bandpass",
  freqEnd?: number,
) {
  if (!ctx || !sfxBus || !noise) return;
  const t = ctx.currentTime + delay;
  const src = ctx.createBufferSource();
  src.buffer = noise;
  src.loop = true;
  const f = ctx.createBiquadFilter();
  f.type = filterType;
  f.frequency.setValueAtTime(freq, t);
  if (freqEnd) f.frequency.exponentialRampToValueAtTime(freqEnd, t + dur);
  f.Q.value = q;
  const g = ctx.createGain();
  env(g, t, peak, Math.min(0.015, dur * 0.3), dur);
  src.connect(f).connect(g).connect(sfxBus);
  src.start(t, Math.random() * 0.5);
  src.stop(t + dur + 0.05);
}

function moo(pitch = 1, length = 1, peak = 0.32) {
  if (!ctx || !sfxBus) return;
  const t = ctx.currentTime;
  const dur = 0.85 * length;
  const f0 = 150 * pitch;
  const out = ctx.createGain();
  out.gain.setValueAtTime(0.0001, t);
  out.gain.exponentialRampToValueAtTime(peak, t + 0.09);
  out.gain.setValueAtTime(peak * 0.9, t + dur * 0.7);
  out.gain.exponentialRampToValueAtTime(0.0001, t + dur);

  const formant = ctx.createBiquadFilter();
  formant.type = "bandpass";
  formant.Q.value = 2.2;
  formant.frequency.setValueAtTime(700 * pitch, t);
  formant.frequency.linearRampToValueAtTime(1100 * pitch, t + dur * 0.35);
  formant.frequency.linearRampToValueAtTime(520 * pitch, t + dur);
  const low = ctx.createBiquadFilter();
  low.type = "lowpass";
  low.frequency.value = 2200;

  const vib = ctx.createOscillator();
  const vibGain = ctx.createGain();
  vib.frequency.value = 5.5;
  vibGain.gain.setValueAtTime(0, t);
  vibGain.gain.linearRampToValueAtTime(5 * pitch, t + dur * 0.6);
  vib.connect(vibGain);

  for (const detune of [-7, 6]) {
    const o = ctx.createOscillator();
    o.type = "sawtooth";
    o.detune.value = detune;
    o.frequency.setValueAtTime(f0 * 0.9, t);
    o.frequency.exponentialRampToValueAtTime(f0 * 1.12, t + dur * 0.25);
    o.frequency.exponentialRampToValueAtTime(f0 * 0.8, t + dur);
    vibGain.connect(o.frequency);
    o.connect(formant);
    o.start(t);
    o.stop(t + dur + 0.05);
  }
  formant.connect(low).connect(out).connect(sfxBus);
  vib.start(t);
  vib.stop(t + dur + 0.05);
}

const NOTE = (n: number) => 440 * Math.pow(2, (n - 69) / 12);

export const sfx = {
  moo: (pitch = 1) => moo(pitch),
  sadMoo: (pitch = 1) => moo(pitch * 0.82, 1.35, 0.26),
  yawn: (pitch = 1) => moo(pitch * 0.75, 1.6, 0.18),
  chomp: () => {
    noiseBurst(0.07, 1600 + Math.random() * 900, 1.1, 0.32);
    tone("sine", 160, 60, 0.07, 0.25);
  },
  crunch: () => {
    noiseBurst(0.05, 2600, 0.8, 0.22);
    noiseBurst(0.05, 1900, 0.8, 0.18, 0.05);
  },
  pop: () => tone("sine", 380, 980, 0.09, 0.28),
  boing: () => {
    tone("triangle", 260, 620, 0.12, 0.25);
    tone("triangle", 620, 420, 0.18, 0.18, 0.1);
  },
  sparkle: () => {
    [84, 88, 91, 96].forEach((n, i) => tone("sine", NOTE(n), NOTE(n), 0.25, 0.1, i * 0.055));
  },
  levelUp: () => {
    [72, 76, 79, 84, 88].forEach((n, i) => {
      tone("triangle", NOTE(n), NOTE(n), 0.35, 0.16, i * 0.09);
      tone("sine", NOTE(n + 12), NOTE(n + 12), 0.3, 0.05, i * 0.09);
    });
  },
  whoosh: () => noiseBurst(0.3, 500, 1.4, 0.16, 0, "bandpass", 2600),
  bubble: () => {
    const f = 700 + Math.random() * 700;
    tone("sine", f, f * 1.8, 0.07, 0.1);
  },
  rinse: () => {
    for (let i = 0; i < 10; i++) {
      const f = 900 + Math.random() * 1400;
      tone("sine", f, f * 1.6, 0.05, 0.06, i * 0.09 + Math.random() * 0.05);
    }
    noiseBurst(1.1, 3000, 0.5, 0.06, 0, "highpass");
  },
  bonk: () => {
    tone("sine", 240, 110, 0.14, 0.3);
    noiseBurst(0.04, 1200, 1, 0.15);
  },
  plop: () => {
    tone("sine", 220, 80, 0.16, 0.3);
    noiseBurst(0.06, 500, 2, 0.12, 0.02);
  },
  sweep: () => {
    noiseBurst(0.22, 3000, 0.7, 0.14, 0, "highpass");
    [91, 96].forEach((n, i) => tone("sine", NOTE(n), NOTE(n), 0.2, 0.08, 0.12 + i * 0.06));
  },
  click: () => tone("sine", 900, 700, 0.035, 0.08),
  giggle: () => {
    [0, 0.09, 0.18].forEach((d, i) => tone("triangle", 620 + i * 60, 820 + i * 80, 0.07, 0.12, d));
  },
  crack: () => {
    noiseBurst(0.05, 3200, 1.5, 0.3);
    tone("square", 1400, 600, 0.03, 0.05);
  },
  kick: () => {
    tone("sine", 140, 55, 0.12, 0.35);
    noiseBurst(0.05, 900, 0.8, 0.18);
  },
  deny: () => {
    tone("triangle", 330, 320, 0.12, 0.15);
    tone("triangle", 250, 240, 0.16, 0.15, 0.14);
  },
  sneeze: () => {
    noiseBurst(0.35, 900, 0.6, 0.08, 0, "bandpass", 2400);
    noiseBurst(0.18, 2500, 0.6, 0.3, 0.38, "bandpass", 900);
  },
  sizzle: () => noiseBurst(0.6, 5000, 0.4, 0.08, 0, "highpass"),
};

const CHORDS = [
  [60, 64, 67],
  [57, 60, 64],
  [53, 57, 60],
  [55, 59, 62],
];
const SCALE = [72, 74, 76, 79, 81, 84, 86, 88];

function pluck(freq: number, when: number, peak: number, decay: number) {
  if (!ctx || !musicBus) return;
  const o = ctx.createOscillator();
  const o2 = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = "triangle";
  o2.type = "sine";
  o.frequency.value = freq;
  o2.frequency.value = freq * 2;
  const g2 = ctx.createGain();
  g2.gain.value = 0.25;
  g.gain.setValueAtTime(0.0001, when);
  g.gain.exponentialRampToValueAtTime(peak, when + 0.012);
  g.gain.exponentialRampToValueAtTime(0.0001, when + decay);
  o.connect(g);
  o2.connect(g2).connect(g);
  g.connect(musicBus);
  o.start(when);
  o2.start(when);
  o.stop(when + decay + 0.05);
  o2.stop(when + decay + 0.05);
}

function startMusic() {
  if (!ctx || musicTimer !== null) return;
  const beat = 60 / 88 / 2;
  let step = 0;
  let next = ctx.currentTime + 0.3;
  let last = SCALE[2];
  musicTimer = window.setInterval(() => {
    if (!ctx) return;
    while (next < ctx.currentTime + 0.4) {
      const bar = Math.floor(step / 8) % CHORDS.length;
      const chord = CHORDS[bar];
      const inBar = step % 8;
      const sleepy = prefs.sleepy;
      if (inBar === 0) pluck(NOTE(chord[0] - 12), next, 0.35, 1.8);
      if (inBar === 4 && !sleepy) pluck(NOTE(chord[2] - 12), next, 0.22, 1.2);
      if (inBar % 2 === 0 && !sleepy) pluck(NOTE(chord[(inBar / 2) % 3]), next, 0.12, 0.6);
      const chance = sleepy ? 0.18 : 0.42;
      if (Math.random() < chance) {
        const idx = Math.max(
          0,
          Math.min(SCALE.length - 1, SCALE.indexOf(last) + Math.round((Math.random() - 0.5) * 4)),
        );
        last = SCALE[idx];
        pluck(NOTE(last), next, sleepy ? 0.12 : 0.2, 0.9);
      }
      step++;
      next += sleepy ? beat * 1.6 : beat;
    }
  }, 100);
}
