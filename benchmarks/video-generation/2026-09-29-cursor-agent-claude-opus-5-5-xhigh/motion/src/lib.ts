import {Easing, interpolate, interpolateColors, spring} from 'remotion';
import {loadFont as loadGeist} from '@remotion/google-fonts/Geist';
import {loadFont as loadGeistMono} from '@remotion/google-fonts/GeistMono';

export const FPS = 60;
export const W = 1920;
export const H = 1080;

export const sans = loadGeist('normal', {
  weights: ['400', '500', '600', '700'],
  subsets: ['latin'],
}).fontFamily;
export const mono = loadGeistMono('normal', {
  weights: ['400', '500'],
  subsets: ['latin'],
}).fontFamily;

// Lumail design tokens, lifted from lumail.io globals.css
export const C = {
  paper: '#f8f7f4',
  ink: '#1a1614',
  void: '#08090a',
  flare: '#ff3300',
  accent: '#c4320a',
  accentDark: '#ff633d',
  coral: '#f26a4b',
  wash: '#fbeee7',
  peach: '#ffe3d9',
  accentBg: '#fff1ec',
  card: '#ffffff',
  border: '#e6e1da',
  muted: '#5f5853',
  mutedDark: '#8a8f98',
  secondary: '#f0ede8',
  mutedBg: '#f2f0ec',
  green: '#0e9f6e',
  greenDark: '#3fbd87',
  white: '#f7f8f8',
};

export const E = {
  out: Easing.bezier(0.16, 1, 0.3, 1),
  outSoft: Easing.bezier(0.22, 1, 0.36, 1),
  inOut: Easing.bezier(0.83, 0, 0.17, 1),
  inOutSoft: Easing.bezier(0.65, 0, 0.35, 1),
  in: Easing.bezier(0.7, 0, 0.84, 0),
  inSoft: Easing.bezier(0.55, 0, 1, 0.45),
  linear: Easing.linear,
};

export const tw = (
  t: number,
  t0: number,
  t1: number,
  a: number,
  b: number,
  ease: (x: number) => number = E.out,
) =>
  interpolate(t, [t0, t1], [a, b], {
    easing: ease,
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

export const pr = (t: number, t0: number, dur: number, ease: (x: number) => number = E.out) =>
  tw(t, t0, t0 + dur, 0, 1, ease);

export const sp = (
  t: number,
  t0: number,
  config: {damping?: number; stiffness?: number; mass?: number} = {},
) =>
  t <= t0
    ? 0
    : spring({
        frame: (t - t0) * FPS,
        fps: FPS,
        config: {damping: 14, stiffness: 170, mass: 0.7, ...config},
      });

export const mix = (a: number, b: number, k: number) => a + (b - a) * k;

export const colorMix = (a: string, b: string, k: number) =>
  interpolateColors(Math.min(1, Math.max(0, k)), [0, 1], [a, b]);

export const typed = (text: string, t: number, t0: number, cps: number) =>
  text.slice(0, Math.max(0, Math.min(text.length, Math.floor((t - t0) * cps))));

export const fmt = (n: number) => Math.round(n).toLocaleString('en-US');

export const blink = (t: number, rate = 2) => (Math.floor(t * rate * 2) % 2 === 0 ? 1 : 0);
