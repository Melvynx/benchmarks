import { Easing, interpolate } from "remotion";
import { loadFont as loadGeist } from "@remotion/google-fonts/Geist";
import { loadFont as loadGeistMono } from "@remotion/google-fonts/GeistMono";
import { loadFont as loadCaveat } from "@remotion/google-fonts/Caveat";

export const sans = loadGeist("normal", {
  weights: ["400", "500", "600", "700"],
  subsets: ["latin"],
}).fontFamily;
export const mono = loadGeistMono("normal", {
  weights: ["400", "500"],
  subsets: ["latin"],
}).fontFamily;
export const hand = loadCaveat("normal", {
  weights: ["500", "700"],
  subsets: ["latin"],
}).fontFamily;

export const C = {
  flare: "#ff3300",
  flareSoft: "#ff633d",
  flareDeep: "#c4320a",
  ink: "#1a1614",
  paper: "#f8f7f4",
  void: "#08090a",
  muted: "#5f5853",
  border: "#e6e1da",
  peach: "#fff1ec",
  wash: "#f2f0ec",
  white: "#ffffff",
};

export const FPS = 30;
export const EASE = Easing.bezier(0.16, 1, 0.3, 1);
export const EASE_IN = Easing.bezier(0.7, 0, 0.84, 0);

export const tween = (
  frame: number,
  start: number,
  dur: number,
  from = 0,
  to = 1,
  easing = EASE,
) =>
  interpolate(frame, [start, start + dur], [from, to], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing,
  });

export const fmt = (n: number) => Math.round(n).toLocaleString("en-US");
