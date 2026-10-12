// Tiny pub/sub so the 3D scene can react to game actions without re-rendering React per frame.
const listeners = new Map();

export function on(name, fn) {
  if (!listeners.has(name)) listeners.set(name, new Set());
  listeners.get(name).add(fn);
  return () => listeners.get(name)?.delete(fn);
}

export function emit(name, payload) {
  listeners.get(name)?.forEach((fn) => fn(payload));
}
