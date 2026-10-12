import { PARAM_SPECS, type Params } from '../sim/params';

/** Jitters every tuning value ±15% (clamped and snapped to its step). Keeps world size, picks a new seed. */
export function randomizeParams(base: Params): Params {
  const next: Params = { ...base };
  for (const spec of PARAM_SPECS) {
    if (spec.key === 'worldSize') continue;
    if (spec.key === 'seed') {
      next.seed = 1 + Math.floor(Math.random() * 99998);
      continue;
    }
    const jitter = 1 + (Math.random() * 2 - 1) * 0.15;
    const snapped = Math.round((base[spec.key] * jitter) / spec.step) * spec.step;
    next[spec.key] = Math.min(spec.max, Math.max(spec.min, Number(snapped.toFixed(6))));
  }
  return next;
}
