export const clamp = (v: number, min = 0, max = 1) => Math.min(max, Math.max(min, v));
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const range = (v: number, a: number, b: number) => clamp((v - a) / (b - a));
export const smoothstep = (a: number, b: number, v: number) => {
  const t = range(v, a, b);
  return t * t * (3 - 2 * t);
};

export const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);
export const easeInOutCubic = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
export const easeInOutSine = (t: number) => -(Math.cos(Math.PI * t) - 1) / 2;
export const easeInQuad = (t: number) => t * t;
export const easeOutExpo = (t: number) => (t === 1 ? 1 : 1 - Math.pow(2, -10 * t));

/** Frame-rate independent damping factor. */
export const damp = (factor: number, dt: number) => 1 - Math.pow(1 - factor, dt * 60);

export const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
export const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)").matches;

type Tick = (time: number, dt: number) => void;
const ticks = new Set<Tick>();
let last = performance.now();

export function onTick(fn: Tick) {
  ticks.add(fn);
  return () => ticks.delete(fn);
}

function loop(time: number) {
  const dt = Math.min(0.05, (time - last) / 1000);
  last = time;
  ticks.forEach((fn) => fn(time, dt));
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);

/** Tracks an element's document offset so scroll handlers avoid per-frame layout reads. */
export function trackBox(el: HTMLElement) {
  const box = { top: 0, height: 0 };
  const measure = () => {
    const r = el.getBoundingClientRect();
    box.top = r.top + window.scrollY;
    box.height = r.height;
  };
  measure();
  new ResizeObserver(measure).observe(el);
  window.addEventListener("resize", measure);
  return box;
}

/** Progress (0..1) of a tall pinned section: 0 when its top meets the viewport top, 1 when its bottom meets the viewport bottom. */
export function pinProgress(box: { top: number; height: number }) {
  const span = box.height - window.innerHeight;
  return span <= 0 ? 0 : clamp((window.scrollY - box.top) / span);
}

export function inView(box: { top: number; height: number }, margin = 0) {
  const y = window.scrollY;
  return y + window.innerHeight + margin > box.top && y - margin < box.top + box.height;
}

export const shuffle = <T,>(arr: T[]) => {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

export const pick = <T,>(arr: T[]) => arr[Math.floor(Math.random() * arr.length)];
