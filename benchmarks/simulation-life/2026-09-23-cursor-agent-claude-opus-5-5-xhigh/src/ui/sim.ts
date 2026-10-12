import { useRef, useSyncExternalStore } from "react";
import { SimController, type Snapshot } from "../engine/controller";

export const ctrl = new SimController();

if (import.meta.env.DEV) (window as unknown as { __garden: SimController }).__garden = ctrl;

/** Subscribes to the controller, re-rendering only when the selected slice changes. */
export function useSim<T>(select: (s: Snapshot) => T, eq: (a: T, b: T) => boolean = Object.is): T {
  const cache = useRef<{ snap: Snapshot; val: T } | null>(null);
  const get = () => {
    const snap = ctrl.getSnapshot();
    const cur = cache.current;
    if (cur && cur.snap === snap) return cur.val;
    const val = select(snap);
    if (cur && eq(cur.val, val)) {
      cur.snap = snap;
      return cur.val;
    }
    cache.current = { snap, val };
    return val;
  };
  return useSyncExternalStore(ctrl.subscribe, get, get);
}

export function shallowEqual<T extends object>(a: T, b: T): boolean {
  if (a === b) return true;
  const ka = Object.keys(a) as (keyof T)[];
  if (ka.length !== Object.keys(b).length) return false;
  return ka.every((k) => Object.is(a[k], b[k]));
}

export const fmtTime = (t: number) => {
  const s = Math.floor(t);
  const m = Math.floor(s / 60);
  if (m < 1) return `${s}s`;
  const h = Math.floor(m / 60);
  if (h < 1) return `${m}m ${String(s % 60).padStart(2, "0")}s`;
  return `${h}h ${String(m % 60).padStart(2, "0")}m`;
};
