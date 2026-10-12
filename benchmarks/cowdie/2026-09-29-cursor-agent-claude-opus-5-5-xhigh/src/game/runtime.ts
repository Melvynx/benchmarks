import { Vector3, type Camera } from "three";
import type { FoodId, Reaction } from "./content";

export const view: { camera: Camera | null; canvas: HTMLCanvasElement | null } = {
  camera: null,
  canvas: null,
};

/** Per-frame mutable state shared between the 3D scene and game logic (never triggers React renders). */
export const pet = {
  pos: new Vector3(0, 0, 0.4),
  heading: 0,
  mouth: new Vector3(0, 0.9, 1),
  head: new Vector3(0, 1.2, 0.8),
  scale: 0.74,
  eating: false,
  busy: false,
  lying: 0,
};

export const pointer = {
  x: 0,
  y: 0,
  down: false,
  movedAt: 0,
  world: new Vector3(0, 1, 2),
};

export const drag = {
  pos: new Vector3(),
  valid: false,
};

export const ball = {
  pos: new Vector3(1.5, 0.3, 0.5),
  vel: new Vector3(),
  radius: 0.28,
  lastGroundTouch: 0,
};

export const env = {
  night: 0,
};

/** Screen px covered by HUD chrome above/below the play area; the camera recentres into the gap. */
export const ui = { top: 0, bottom: 0 };

/** Thought-bubble DOM anchor; the cow writes its screen position every frame. */
export const bubble = { el: null as HTMLElement | null };

/** DOM nodes of floating "+N" texts, positioned by the scene every frame. */
export const floatEls = new Map<number, HTMLElement>();

export const ISLAND_RADIUS = 4.45;
export const ROAM_RADIUS = 3.25;
export const BED_POS = { x: -1.2, z: -1.0 };

export interface Obstacle {
  x: number;
  z: number;
  r: number;
}

export const OBSTACLES: Obstacle[] = [
  { x: -2.45, z: -2.35, r: 1.15 },
  { x: 2.55, z: -1.9, r: 0.55 },
  { x: 2.45, z: 1.75, r: 1.0 },
  { x: -3.25, z: 0.9, r: 0.3 },
  { x: -2.55, z: 2.35, r: 0.35 },
];

export const controls: { enabled: (v: boolean) => void } = {
  enabled: () => {},
};

export type CowEvent =
  | { type: "eat"; food: FoodId; reaction: Reaction; ground?: boolean }
  | { type: "refuse"; reason: "full" | "busy" | "cooldown" }
  | { type: "boop" }
  | { type: "pet" }
  | { type: "giggle" }
  | { type: "poop" }
  | { type: "levelup"; grew: boolean }
  | { type: "hatch" }
  | { type: "wake" }
  | { type: "sleep" }
  | { type: "sick" }
  | { type: "rinse" }
  | { type: "headbutt" }
  | { type: "moo" };

type Listener = (e: CowEvent) => void;
const listeners = new Set<Listener>();

export const cowEvents = {
  emit(e: CowEvent) {
    listeners.forEach((l) => l(e));
  },
  on(l: Listener) {
    listeners.add(l);
    return () => {
      listeners.delete(l);
    };
  },
};

export function forward(heading: number, out = new Vector3()) {
  return out.set(Math.sin(heading), 0, Math.cos(heading));
}

export function rand(a: number, b: number) {
  return a + Math.random() * (b - a);
}

export function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Keeps a point on walkable ground: inside the roam circle and outside obstacles. */
export function constrain(p: { x: number; z: number }, pad = 0.45) {
  for (const o of OBSTACLES) {
    const dx = p.x - o.x;
    const dz = p.z - o.z;
    const d = Math.hypot(dx, dz);
    const min = o.r + pad;
    if (d < min && d > 1e-4) {
      p.x = o.x + (dx / d) * min;
      p.z = o.z + (dz / d) * min;
    }
  }
  const r = Math.hypot(p.x, p.z);
  if (r > ROAM_RADIUS) {
    p.x *= ROAM_RADIUS / r;
    p.z *= ROAM_RADIUS / r;
  }
  return p;
}
