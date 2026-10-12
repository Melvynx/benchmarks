// Deterministic 120 BPM score + SFX locked to the video timeline → out/soundtrack.wav
import fs from 'node:fs';
import path from 'node:path';

const SR = 44100;
const DUR = 45;
const N = SR * DUR;
const TAU = Math.PI * 2;

const fx = [new Float32Array(N), new Float32Array(N)];
const mus = [new Float32Array(N), new Float32Array(N)];
const rev = new Float32Array(N);
const duck = new Float32Array(N).fill(1);

let seed = 0x1a2b3c;
const rnd = () => {
	seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
	return seed / 4294967296;
};
const noise = () => rnd() * 2 - 1;
const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));

const put = (bus, i, v, pan = 0, send = 0) => {
	if (i < 0 || i >= N) return;
	const a = ((pan + 1) * Math.PI) / 4;
	bus[0][i] += v * Math.cos(a) * Math.SQRT2;
	bus[1][i] += v * Math.sin(a) * Math.SQRT2;
	if (send) rev[i] += v * send;
};

class Biquad {
	constructor(type, f, q = 0.707) {
		this.type = type;
		this.x1 = this.x2 = this.y1 = this.y2 = 0;
		this.set(f, q);
	}
	set(f, q = this.q) {
		this.q = q;
		const w = (TAU * clamp(f, 20, SR * 0.45)) / SR;
		const c = Math.cos(w);
		const al = Math.sin(w) / (2 * q);
		let b0, b1, b2;
		if (this.type === 'lp') [b0, b1, b2] = [(1 - c) / 2, 1 - c, (1 - c) / 2];
		else if (this.type === 'hp') [b0, b1, b2] = [(1 + c) / 2, -(1 + c), (1 + c) / 2];
		else [b0, b1, b2] = [al, 0, -al];
		const a0 = 1 + al;
		this.b0 = b0 / a0;
		this.b1 = b1 / a0;
		this.b2 = b2 / a0;
		this.a1 = (-2 * c) / a0;
		this.a2 = (1 - al) / a0;
	}
	run(x) {
		const y = this.b0 * x + this.b1 * this.x1 + this.b2 * this.x2 - this.a1 * this.y1 - this.a2 * this.y2;
		this.x2 = this.x1;
		this.x1 = x;
		this.y2 = this.y1;
		this.y1 = y;
		return y;
	}
}

// ---------- instruments ----------
const kick = (t0, g = 1) => {
	const i0 = Math.round(t0 * SR);
	let ph = 0;
	for (let k = 0; k < 0.5 * SR; k++) {
		const t = k / SR;
		ph += (TAU * (44 + 110 * Math.exp(-t * 32))) / SR;
		let v = Math.sin(ph) * Math.exp(-t * 6.5) + noise() * Math.exp(-t * 500) * 0.3;
		v = Math.tanh(v * 1.5) * 0.85 * g;
		put(fx, i0 + k, v);
	}
	for (let k = 0; k < 0.45 * SR; k++) {
		const i = i0 + k;
		if (i >= N) break;
		const d = 1 - 0.62 * Math.exp(-(k / SR) * 9);
		if (d < duck[i]) duck[i] = d;
	}
};

const clap = (t0, g = 1) => {
	const i0 = Math.round(t0 * SR);
	const bp = new Biquad('bp', 1400, 0.9);
	for (let k = 0; k < 0.4 * SR; k++) {
		const t = k / SR;
		let env = Math.exp(-t * 16) * 0.55;
		for (const d of [0, 0.012, 0.024]) if (t >= d) env += Math.exp(-(t - d) * 160);
		const v = bp.run(noise()) * env * g * 0.55;
		put(fx, i0 + k, v, 0.05, 0.35);
	}
};

const hat = (t0, g = 1, open = false) => {
	const i0 = Math.round(t0 * SR);
	const hp = new Biquad('hp', 7500, 0.8);
	const len = (open ? 0.35 : 0.08) * SR;
	const pan = (rnd() - 0.5) * 0.5;
	for (let k = 0; k < len; k++) {
		const t = k / SR;
		const v = hp.run(noise()) * Math.exp(-t * (open ? 12 : 65)) * g * 0.3;
		put(fx, i0 + k, v, pan, 0.05);
	}
};

const bass = (t0, f, dur, g = 1) => {
	const i0 = Math.round(t0 * SR);
	const lp = new Biquad('lp', 400, 1.1);
	let ph = rnd();
	for (let k = 0; k < dur * SR; k++) {
		const t = k / SR;
		if (k % 16 === 0) lp.set(180 + 1100 * Math.exp(-t * 16), 1.1);
		ph += f / SR;
		const saw = 2 * (ph % 1) - 1;
		const env = clamp(t / 0.004) * clamp((dur - t) / 0.04);
		const v = (lp.run(saw) * 0.6 + Math.sin(TAU * f * 0.5 * t) * 0.5) * env * g;
		put(mus, i0 + k, v);
	}
};

const sub = (t0, f, dur, g = 1) => {
	const i0 = Math.round(t0 * SR);
	for (let k = 0; k < dur * SR; k++) {
		const t = k / SR;
		const env = clamp(t / 0.01) * Math.exp(-t * 1.1) * clamp((dur - t) / 0.5);
		put(mus, i0 + k, (Math.sin(TAU * f * t) * 0.7 + Math.sin(TAU * f * 2 * t) * 0.2) * env * g);
	}
};

const pad = (t0, freqs, dur, g, cutoffAt, atk = 0.25) => {
	const i0 = Math.round(t0 * SR);
	const rel = 0.7;
	const len = Math.round((dur + rel) * SR);
	const lpL = new Biquad('lp', 900, 0.8);
	const lpR = new Biquad('lp', 900, 0.8);
	const osc = [];
	for (const f of freqs)
		for (const d of [-1, 0, 1]) osc.push({f: f * 2 ** ((d * 9) / 1200), ph: rnd(), pan: d * 0.6});
	for (let k = 0; k < len; k++) {
		const t = k / SR;
		if (k % 32 === 0) {
			const c = cutoffAt(t0 + t);
			lpL.set(c, 0.8);
			lpR.set(c, 0.8);
		}
		let l = 0;
		let r = 0;
		for (const o of osc) {
			o.ph += o.f / SR;
			const s = 2 * (o.ph % 1) - 1;
			l += s * (1 - o.pan) * 0.5;
			r += s * (1 + o.pan) * 0.5;
		}
		const env = clamp(t / atk) * (t > dur ? clamp(1 - (t - dur) / rel) : 1);
		const i = i0 + k;
		if (i >= N) break;
		const vl = lpL.run(l) * env * g;
		const vr = lpR.run(r) * env * g;
		mus[0][i] += vl;
		mus[1][i] += vr;
		rev[i] += (vl + vr) * 0.12;
	}
};

const pluck = (t0, f, g = 1, pan = 0) => {
	const i0 = Math.round(t0 * SR);
	const lp = new Biquad('lp', 3000, 1.4);
	let ph = rnd();
	for (let k = 0; k < 0.55 * SR; k++) {
		const t = k / SR;
		if (k % 16 === 0) lp.set(500 + 4200 * Math.exp(-t * 15), 1.4);
		ph += f / SR;
		const p = ph % 1;
		const s = (2 * p - 1) * 0.6 + (p < 0.5 ? 0.4 : -0.4);
		const v = lp.run(s) * Math.exp(-t * 7.5) * clamp(t / 0.002) * g;
		put(mus, i0 + k, v, pan, 0.4);
	}
};

const bell = (t0, f, g = 1, decay = 3, pan = 0) => {
	const i0 = Math.round(t0 * SR);
	const parts = [
		[1, 1],
		[2.0, 0.45],
		[3.01, 0.22],
		[4.23, 0.1],
	];
	for (let k = 0; k < 2.5 * SR; k++) {
		const t = k / SR;
		let v = 0;
		parts.forEach(([m, a], j) => {
			v += Math.sin(TAU * f * m * t) * a * Math.exp(-t * decay * (1 + j * 0.7));
		});
		put(fx, i0 + k, v * g * clamp(t / 0.003), pan, 0.45);
	}
};

const whoosh = (t0, dur, f0, f1, g = 1, p0 = -0.6, p1 = 0.6) => {
	const i0 = Math.round(t0 * SR);
	const bp = new Biquad('bp', f0, 1.3);
	for (let k = 0; k < dur * SR; k++) {
		const x = k / (dur * SR);
		if (k % 16 === 0) bp.set(f0 * (f1 / f0) ** x, 1.3);
		const env = x < 0.72 ? (x / 0.72) ** 2 : ((1 - x) / 0.28) ** 1.3;
		put(fx, i0 + k, bp.run(noise()) * env * g, p0 + (p1 - p0) * x, 0.25);
	}
};

const riser = (t0, dur, g = 1) => {
	const i0 = Math.round(t0 * SR);
	const hp = new Biquad('hp', 400, 0.9);
	let ph = 0;
	for (let k = 0; k < dur * SR; k++) {
		const x = k / (dur * SR);
		if (k % 16 === 0) hp.set(300 + 5000 * x * x, 0.9);
		ph += (180 + 900 * x * x) / SR;
		const v = (hp.run(noise()) * 0.8 + (2 * (ph % 1) - 1) * 0.12) * x ** 2.4 * g;
		put(fx, i0 + k, v, Math.sin(x * 12) * 0.3, 0.3);
	}
};

const impact = (t0, g = 1) => {
	const i0 = Math.round(t0 * SR);
	const lp = new Biquad('lp', 1400, 0.7);
	let ph = 0;
	for (let k = 0; k < 2.2 * SR; k++) {
		const t = k / SR;
		ph += (TAU * (30 + 70 * Math.exp(-t * 8))) / SR;
		const v = (Math.sin(ph) * Math.exp(-t * 2.6) + lp.run(noise()) * Math.exp(-t * 9) * 0.55) * g;
		put(fx, i0 + k, Math.tanh(v * 1.3) * 0.9, 0, 0.35);
	}
};

const pop = (t0, f = 700, g = 1, pan = 0) => {
	const i0 = Math.round(t0 * SR);
	let ph = 0;
	for (let k = 0; k < 0.16 * SR; k++) {
		const t = k / SR;
		ph += (TAU * f * (1 + 0.7 * (1 - Math.exp(-t * 45)))) / SR;
		const v = Math.sin(ph) * Math.exp(-t * 32) * clamp(t / 0.001) * g;
		put(fx, i0 + k, v, pan, 0.18);
	}
};

const ding = (t0, f = 1250, g = 1, pan = 0) => {
	const i0 = Math.round(t0 * SR);
	for (let k = 0; k < 0.6 * SR; k++) {
		const t = k / SR;
		const v = (Math.sin(TAU * f * t) + Math.sin(TAU * f * 1.5 * t) * 0.5) * Math.exp(-t * 9) * clamp(t / 0.002) * g;
		put(fx, i0 + k, v, pan, 0.3);
	}
};

const tick = (t0, g = 1) => {
	const i0 = Math.round(t0 * SR);
	const hp = new Biquad('hp', 2500, 0.7);
	const pan = (rnd() - 0.5) * 0.4;
	const gg = g * (0.6 + rnd() * 0.5);
	for (let k = 0; k < 0.025 * SR; k++) {
		const t = k / SR;
		put(fx, i0 + k, hp.run(noise()) * Math.exp(-t * 650) * gg, pan, 0.05);
	}
};

const click = (t0, g = 1) => {
	tick(t0, 0.5 * g);
	tick(t0 + 0.07, 0.35 * g);
	const i0 = Math.round(t0 * SR);
	for (let k = 0; k < 0.06 * SR; k++) {
		const t = k / SR;
		put(fx, i0 + k, Math.sin(TAU * 170 * t) * Math.exp(-t * 70) * 0.35 * g);
	}
};

const chime = (t0, g = 1) => {
	bell(t0, 1318.5, 0.16 * g, 5, -0.2);
	bell(t0 + 0.08, 1975.5, 0.13 * g, 5, 0.2);
};

const scribble = (t0, dur, g = 1) => {
	const i0 = Math.round(t0 * SR);
	const bp = new Biquad('bp', 3200, 1.8);
	for (let k = 0; k < dur * SR; k++) {
		const t = k / SR;
		const am = Math.abs(Math.sin(TAU * 7.5 * t + Math.sin(TAU * 1.3 * t) * 2)) ** 2;
		const env = clamp(t / 0.05) * clamp((dur - t) / 0.08);
		put(fx, i0 + k, bp.run(noise()) * am * env * g, 0.1);
	}
};

const shimmer = (t0, dur, g = 1) => {
	for (let s = 0; s < dur; s += 0.035 + rnd() * 0.03) {
		bell(t0 + s, 2000 + rnd() * 3000, 0.035 * g, 14, (rnd() - 0.5) * 1.2);
	}
};

// ---------- score ----------
const NOTE = {
	A2: 110, F2: 87.31, C3: 130.81, G2: 98,
	F3: 174.61, G3: 196, A3: 220, B3: 246.94, C4: 261.63, D4: 293.66, E4: 329.63, G4: 392, A4: 440, B4: 493.88,
	C5: 523.25, D5: 587.33, E5: 659.25, F4: 349.23, F5: 698.46, G5: 783.99, A5: 880, B5: 987.77, C6: 1046.5,
};
const CH = [
	{root: NOTE.A2, pad: [NOTE.A3, NOTE.C4, NOTE.E4, NOTE.G4], arp: [440, 523.25, 659.25, 880, 659.25, 523.25, 783.99, 659.25]},
	{root: NOTE.F2, pad: [NOTE.F3, NOTE.A3, NOTE.C4, NOTE.E4], arp: [349.23, 440, 523.25, 698.46, 523.25, 440, 659.25, 523.25]},
	{root: NOTE.C3, pad: [NOTE.G3, NOTE.C4, NOTE.E4, NOTE.B4], arp: [523.25, 659.25, 783.99, 1046.5, 783.99, 659.25, 987.77, 783.99]},
	{root: NOTE.G2, pad: [NOTE.G3, NOTE.B3, NOTE.D4, NOTE.A4], arp: [392, 493.88, 587.33, 783.99, 587.33, 493.88, 880, 587.33]},
];

const cutoff = (t) => {
	if (t < 4) return 250 + 1500 * (t / 4) ** 2;
	if (t >= 38 && t < 40.72) return 500 + 2600 * ((t - 38) / 2.72) ** 2;
	if (t >= 40.72) return 2600 - 1400 * clamp((t - 40.72) / 4);
	if (t >= 29 && t < 33.5) return 900;
	return 1500;
};

for (let bar = 0; bar < 19; bar++) {
	const t = bar * 2;
	const c = CH[bar % 4];
	pad(t, c.pad, 2.05, bar < 2 ? 0.075 : 0.046, cutoff, bar === 0 ? 1.2 : 0.12);
	if (t >= 4) {
		for (let j = 0; j < 4; j++) {
			bass(t + 0.25 + j * 0.5, j === 3 ? c.root * 2 : c.root, 0.21, 0.34);
		}
	}
	if (t >= 8) {
		for (let j = 0; j < 8; j++) {
			const at = t + j * 0.25;
			if (at < 8.5 || at >= 38) continue;
			const dark = at >= 29 && at < 33.5;
			pluck(at, c.arp[j] * (dark ? 0.5 : 1), dark ? 0.085 : 0.105, j % 2 ? 0.35 : -0.35);
		}
	}
}
pad(38, [NOTE.F3, NOTE.A3, NOTE.C4, NOTE.E4], 2.72, 0.07, cutoff, 0.3);
pad(40.72, [NOTE.C4, NOTE.E4, NOTE.G4, NOTE.B4, NOTE.D5], 3.6, 0.055, cutoff, 0.02);
sub(40.72, 65.41, 4.28, 0.5);
[523.25, 659.25, 783.99, 987.77, 1046.5, 783.99, 659.25, 987.77].forEach((f, j) => {
	pluck(41.2 + j * 0.25, f, 0.06 * (1 - j * 0.07), j % 2 ? 0.4 : -0.4);
});
bell(40.72, NOTE.C5, 0.12, 1.2, 0);
bell(40.72, NOTE.G5, 0.07, 1.4, 0.3);

for (let t = 4; t < 38; t += 0.5) kick(t, 0.82);
for (let t = 8.5; t < 38; t += 1) if (t < 29 || t >= 33.5) clap(t, 0.8);
for (let t = 4.25; t < 38; t += 0.5) hat(t, 0.9);
for (let t = 13.625; t < 29; t += 0.25) hat(t, 0.35);
for (let t = 33.625; t < 37.9; t += 0.25) hat(t, 0.35);
for (const t of [7.75, 12.75, 18.75, 23.75, 28.75, 32.75, 37.75]) hat(t, 0.7, true);
kick(40.72, 1);

// ---------- SFX (global seconds, matched to the video) ----------
pop(0.05, 880, 0.12);
impact(0.35, 0.45);
pop(0.36, 520, 0.28);
shimmer(0.4, 0.5, 1.2);
whoosh(0.6, 0.8, 500, 2500, 0.08);
whoosh(1.4, 0.8, 900, 3500, 0.14, -0.4, 0.4);
scribble(2.05, 0.62, 0.05);
for (let i = 0; i < 26; i++) tick(2.25 + i * 0.022 + 0.28, 0.07);
riser(2.9, 1.1, 0.33);
whoosh(3.35, 0.65, 300, 5000, 0.3, -0.2, 0.2);
impact(4.0, 1.0);

pop(4.8, 640, 0.2);
[0, 1, 2, 3, 4, 5].forEach((i) => ding(5.2 + i * 0.14, 1100 + (i % 3) * 170, 0.06, i % 2 ? 0.5 : -0.5));
whoosh(6.5, 0.4, 3000, 900, 0.12, 0.3, -0.3);
whoosh(6.9, 0.65, 400, 2500, 0.22, -0.7, 0.7);
scribble(7.3, 0.55, 0.05);
whoosh(7.95, 0.6, 250, 4000, 0.28, 0, 0);

pop(8.42, 760, 0.2, -0.2);
shimmer(8.5, 0.3, 0.8);
pop(8.95, 680, 0.2, 0.2);
for (let i = 0; i < 13; i++) tick(10.4 + i / 22, 0.08);
click(11.9, 0.8);
chime(12.2, 1);
whoosh(12.95, 0.6, 350, 3200, 0.24, 0, 0);

for (let i = 0; i < 48; i++) tick(13.75 + i / 40, 0.065);
for (const [a, r] of [[15.1, 15.45], [15.7, 16.05], [16.3, 16.65]]) {
	pop(a, 900, 0.1, 0.3);
	ding(r, 1500, 0.045, 0.3);
}
for (let i = 0; i < 42; i += 2) tick(16.95 + i / 64, 0.05);
whoosh(17.5, 0.35, 600, 2000, 0.1, 0.3, 0.3);
click(18.45, 0.8);
chime(18.58, 1);
whoosh(18.95, 0.55, 500, 6000, 0.32, 0.8, -0.8);

for (let i = 0; i < 28; i++) tick(19.55 + i / 38, 0.065);
pop(20.38, 820, 0.15, -0.3);
whoosh(22.0, 0.35, 1500, 3500, 0.06, -0.3, 0.2);
pop(22.25, 950, 0.12, -0.2);
click(22.72, 0.7);
shimmer(22.85, 0.6, 1.4);
pop(23.25, 600, 0.2, -0.3);
whoosh(23.95, 0.6, 4000, 400, 0.22, -0.2, -0.4);

[0, 1, 2, 3, 4].forEach((i) => pop(24.42 + i * 0.08, 600 + i * 90, 0.1, -0.6 + i * 0.3));
ding(25.3, 1320, 0.07);
for (let i = 0; i < 14; i++) tick(25.55 + i * 0.3, 0.05);

whoosh(28.95, 0.7, 200, 1600, 0.3, 0.6, -0.2);
impact(29.1, 0.45);
for (let i = 0; i < 190; i += 3) tick(29.6 + i / 150, 0.05);
ding(30.9, 1400, 0.06, 0.4);
whoosh(31.1, 0.7, 800, 7000, 0.3, -0.8, 0.8);
chime(31.72, 1);

for (let i = 0; i < 8; i++) whoosh(33.0 + i * 0.035, 0.28, 1200, 4000, 0.05, 0, 0);
for (let i = 0; i < 18; i++) tick(33.9 + i * 0.072, 0.045);
for (const tt of [34.35, 34.75, 35.05]) pop(tt, 1100, 0.07, 0.2);
for (let i = 0; i < 30; i++) tick(35.5 + 1.4 * (i / 30) ** 1.6, 0.035);
scribble(36.9, 0.6, 0.05);

whoosh(37.95, 0.6, 300, 3000, 0.22, 0, 0);
for (let i = 0; i < 8; i++) whoosh(38.25 + i * 0.06, 0.45, 700, 2400, 0.05, i % 2 ? 0.8 : -0.8, 0);
for (let i = 1; i < 9; i++) tick(38.55 + i * 0.21, 0.09);
riser(39.3, 1.42, 0.4);
whoosh(40.15, 0.6, 5000, 300, 0.25, 0.6, 0);
impact(40.72, 1.0);
shimmer(40.8, 0.6, 1.3);
whoosh(41.28, 0.7, 700, 2800, 0.12, -0.4, 0.2);
whoosh(41.5, 0.6, 1500, 4500, 0.06, 0, 0.5);
pop(42.35, 700, 0.16);
click(43.6, 0.6);

// ---------- reverb (Freeverb-style) ----------
const reverb = (input, spread) => {
	const out = new Float32Array(N);
	const combs = [1116, 1188, 1277, 1356, 1422, 1491, 1557, 1617].map((d) => ({
		buf: new Float32Array(d + spread),
		i: 0,
		lp: 0,
	}));
	const aps = [556, 441, 341, 225].map((d) => ({buf: new Float32Array(d + spread), i: 0}));
	const fb = 0.85;
	const damp = 0.25;
	for (let n = 0; n < N; n++) {
		const x = input[n] * 0.02;
		let y = 0;
		for (const c of combs) {
			const o = c.buf[c.i];
			c.lp = o * (1 - damp) + c.lp * damp;
			c.buf[c.i] = x + c.lp * fb;
			c.i = (c.i + 1) % c.buf.length;
			y += o;
		}
		for (const a of aps) {
			const o = a.buf[a.i];
			a.buf[a.i] = y + o * 0.5;
			a.i = (a.i + 1) % a.buf.length;
			y = o - y;
		}
		out[n] = y;
	}
	return out;
};
const wetL = reverb(rev, 0);
const wetR = reverb(rev, 23);

// ---------- master ----------
const out = [new Float32Array(N), new Float32Array(N)];
let peak = 0;
for (let i = 0; i < N; i++) {
	const t = i / SR;
	const fade = t > 43.6 ? 0.5 + 0.5 * Math.cos((Math.PI * (t - 43.6)) / 1.4) : 1;
	for (let ch = 0; ch < 2; ch++) {
		const wet = ch ? wetR[i] : wetL[i];
		let v = fx[ch][i] + mus[ch][i] * duck[i] + wet * 1.1;
		v = Math.tanh(v * 0.9) * fade;
		out[ch][i] = v;
		peak = Math.max(peak, Math.abs(v));
	}
}
const norm = 0.89 / peak;
const buf = Buffer.alloc(44 + N * 4);
buf.write('RIFF', 0);
buf.writeUInt32LE(36 + N * 4, 4);
buf.write('WAVEfmt ', 8);
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
	buf.writeInt16LE(Math.round(clamp(out[0][i] * norm, -1, 1) * 32767), 44 + i * 4);
	buf.writeInt16LE(Math.round(clamp(out[1][i] * norm, -1, 1) * 32767), 46 + i * 4);
}
const dest = path.resolve(import.meta.dirname, '../out/soundtrack.wav');
fs.mkdirSync(path.dirname(dest), {recursive: true});
fs.writeFileSync(dest, buf);
console.log('wrote', dest, 'peak', peak.toFixed(3));
