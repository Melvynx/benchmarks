export const MINUTES_PER_HOUR = 60;
export const HOURS_PER_DAY = 24;
export const MINUTES_PER_DAY = MINUTES_PER_HOUR * HOURS_PER_DAY;

/** Euclidean modulo: always returns a value in `[0, modulus)`. */
export function mod(value: number, modulus: number): number {
  return ((value % modulus) + modulus) % modulus;
}
