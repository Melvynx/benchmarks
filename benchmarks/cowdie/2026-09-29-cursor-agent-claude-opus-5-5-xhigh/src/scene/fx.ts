import { Color, Vector3 } from "three";

export type FxKind =
  | "heart"
  | "sparkle"
  | "bubble"
  | "crumb"
  | "steam"
  | "zzz"
  | "confetti"
  | "drop"
  | "dust"
  | "star";

export interface Particle {
  pos: Vector3;
  vel: Vector3;
  age: number;
  life: number;
  size: number;
  rot: Vector3;
  spin: Vector3;
  color: Color;
  gravity: number;
  drag: number;
  seed: number;
  sway: number;
}

export const FX_CAPACITY: Record<FxKind, number> = {
  heart: 90,
  sparkle: 220,
  bubble: 200,
  crumb: 200,
  steam: 140,
  zzz: 24,
  confetti: 260,
  drop: 260,
  dust: 120,
  star: 40,
};

export const particles: Record<FxKind, Particle[]> = {
  heart: [],
  sparkle: [],
  bubble: [],
  crumb: [],
  steam: [],
  zzz: [],
  confetti: [],
  drop: [],
  dust: [],
  star: [],
};

export interface EmitOptions {
  count?: number;
  speed?: number;
  spread?: number;
  up?: number;
  dir?: Vector3;
  size?: number;
  sizeJitter?: number;
  life?: number;
  color?: string | string[];
  gravity?: number;
  drag?: number;
  radius?: number;
  sway?: number;
}

const tmp = new Vector3();

export function emit(kind: FxKind, origin: Vector3, o: EmitOptions = {}) {
  const {
    count = 1,
    speed = 1,
    spread = 1,
    up = 0,
    dir,
    size = 0.1,
    sizeJitter = 0.3,
    life = 1,
    color = "#ffffff",
    gravity = 0,
    drag = 0.5,
    radius = 0,
    sway = 0,
  } = o;
  const list = particles[kind];
  const cap = FX_CAPACITY[kind];
  const colors = Array.isArray(color) ? color : [color];
  for (let i = 0; i < count; i++) {
    if (list.length >= cap) list.shift();
    tmp
      .set(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5)
      .normalize()
      .multiplyScalar(spread);
    const vel = dir ? dir.clone().multiplyScalar(speed).add(tmp.multiplyScalar(speed * 0.5)) : tmp.clone().multiplyScalar(speed);
    vel.y += up;
    const pos = origin.clone();
    if (radius > 0) {
      pos.add(
        new Vector3(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5)
          .normalize()
          .multiplyScalar(radius * Math.random()),
      );
    }
    list.push({
      pos,
      vel,
      age: 0,
      life: life * (0.75 + Math.random() * 0.5),
      size: size * (1 - sizeJitter / 2 + Math.random() * sizeJitter),
      rot: new Vector3(Math.random() * 6, Math.random() * 6, Math.random() * 6),
      spin: new Vector3(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).multiplyScalar(10),
      color: new Color(colors[Math.floor(Math.random() * colors.length)]),
      gravity,
      drag,
      seed: Math.random() * 100,
      sway,
    });
  }
}

export const CONFETTI = ["#ff7eb3", "#ffd166", "#7ad3ff", "#8be28b", "#c3a6ff", "#ff9f6b"];
export const HEARTS = ["#ff5d8f", "#ff7eb3", "#ff94c2"];
