const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
const pointerQuery = window.matchMedia("(hover: hover) and (pointer: fine)");

export const env = {
  get reduced() {
    return motionQuery.matches;
  },
  get finePointer() {
    return pointerQuery.matches;
  },
};

export const clamp = (v: number, min: number, max: number): number =>
  v < min ? min : v > max ? max : v;

export const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;

export const easeOutExpo = (t: number): number =>
  t >= 1 ? 1 : 1 - Math.pow(2, -10 * t);

export const easeInOut = (t: number): number =>
  t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

type Frame = (dt: number, now: number) => void;
const subscribers = new Set<Frame>();
let last = performance.now();
let started = false;

function tick(now: number): void {
  const dt = Math.min(64, now - last);
  last = now;
  for (const fn of subscribers) fn(dt, now);
  requestAnimationFrame(tick);
}

export function onFrame(fn: Frame): () => void {
  subscribers.add(fn);
  if (!started) {
    started = true;
    requestAnimationFrame(tick);
  }
  return () => subscribers.delete(fn);
}

/** Shared pointer position, normalised and in pixels. */
export const pointer = { x: 0, y: 0, nx: 0.5, ny: 0.5, active: false };

window.addEventListener(
  "pointermove",
  (e) => {
    pointer.x = e.clientX;
    pointer.y = e.clientY;
    pointer.nx = e.clientX / window.innerWidth;
    pointer.ny = e.clientY / window.innerHeight;
    pointer.active = true;
  },
  { passive: true },
);
