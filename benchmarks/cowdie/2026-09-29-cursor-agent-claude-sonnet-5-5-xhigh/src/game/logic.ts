import { FAVORITE_BONUS, FOOD_BY_ID, MAX_LEVEL, STAGES, type FoodId, type StatKey } from './config';

export type Stats = Record<StatKey, number>;
export type Mood = 'sleeping' | 'hungry' | 'sleepy' | 'dirty' | 'sad' | 'happy' | 'content';

export const clamp = (v: number, lo = 0, hi = 100) => Math.min(hi, Math.max(lo, v));

export const xpNeeded = (level: number) => 30 + (level - 1) * 20;

export function levelInfo(xp: number) {
  let level = 1;
  let rest = Math.max(0, xp);
  while (level < MAX_LEVEL && rest >= xpNeeded(level)) {
    rest -= xpNeeded(level);
    level += 1;
  }
  const need = xpNeeded(level);
  return { level, into: level >= MAX_LEVEL ? need : rest, need };
}

export function stageName(level: number) {
  let name = STAGES[0].name;
  for (const s of STAGES) if (level >= s.minLevel) name = s.name;
  return name;
}

export const growthScale = (level: number) => 0.84 + Math.min(level - 1, 9) * 0.034;

export function getMood(s: Stats, sleeping: boolean): Mood {
  if (sleeping) return 'sleeping';
  if (s.fullness < 25) return 'hungry';
  if (s.energy < 22) return 'sleepy';
  if (s.clean < 25) return 'dirty';
  if (s.joy < 30) return 'sad';
  const avg = (s.fullness + s.joy + s.energy + s.clean) / 4;
  if (s.joy >= 70 && avg >= 58) return 'happy';
  return 'content';
}

export const RATES = {
  fullness: { awake: 2.6, asleep: 1.0 },
  energyDrain: 1.1,
  energyRest: 12,
  clean: { awake: 0.8, asleep: 0.3, perPoop: 1.2 },
  joy: { awake: 1.0, asleep: 0.2, hungry: 1.4, dirty: 0.9 },
};

export function decay(s: Stats, minutes: number, ctx: { sleeping: boolean; poops: number }): Stats {
  const { sleeping, poops } = ctx;
  const fullness = clamp(s.fullness - (sleeping ? RATES.fullness.asleep : RATES.fullness.awake) * minutes);
  let joyRate = sleeping ? RATES.joy.asleep : RATES.joy.awake;
  if (fullness < 25) joyRate += RATES.joy.hungry;
  if (s.clean < 25) joyRate += RATES.joy.dirty;
  const joy = clamp(s.joy - joyRate * minutes);
  const energy = clamp(s.energy + (sleeping ? RATES.energyRest : -RATES.energyDrain) * minutes);
  const cleanRate = (sleeping ? RATES.clean.asleep : RATES.clean.awake) + poops * RATES.clean.perPoop;
  const clean = clamp(s.clean - cleanRate * minutes);
  return { fullness, joy, energy, clean };
}

export interface FoodOutcome {
  stats: Stats;
  delta: { fullness: number; joy: number; energy: number };
  xp: number;
  loved: boolean;
}

export function applyFood(s: Stats, food: FoodId, favorite: FoodId): FoodOutcome {
  const def = FOOD_BY_ID[food];
  const loved = favorite === food;
  const fullness = def.fullness + (loved ? FAVORITE_BONUS.fullness : 0);
  const joy = def.joy + (loved ? FAVORITE_BONUS.joy : 0);
  const energy = def.energy;
  const next: Stats = {
    ...s,
    fullness: clamp(s.fullness + fullness),
    joy: clamp(s.joy + joy),
    energy: clamp(s.energy + energy),
  };
  return {
    stats: next,
    delta: {
      fullness: Math.round(next.fullness - s.fullness),
      joy: Math.round(next.joy - s.joy),
      energy: Math.round(next.energy - s.energy),
    },
    xp: def.xp + (loved ? FAVORITE_BONUS.xp : 0),
    loved,
  };
}

const FLOORS: Stats = { fullness: 12, joy: 18, energy: 15, clean: 18 };
const MAX_AWAY_MIN = 8 * 60;

export interface CatchUpResult {
  stats: Stats;
  sleeping: boolean;
  poopsAdded: number;
  awayMinutes: number;
}

export function catchUp(
  stats: Stats,
  sleeping: boolean,
  poops: number,
  elapsedMs: number,
): CatchUpResult {
  const awayMinutes = Math.max(0, Math.min(elapsedMs / 60000, MAX_AWAY_MIN));
  let cur = { ...stats };
  let isSleeping = sleeping;
  let left = awayMinutes;
  while (left > 0) {
    const step = Math.min(1, left);
    left -= step;
    cur = decay(cur, step, { sleeping: isSleeping, poops });
    if (isSleeping && cur.energy >= 100) isSleeping = false;
  }
  const floored = (k: StatKey) => Math.max(cur[k], Math.min(stats[k], FLOORS[k]));
  return {
    stats: {
      fullness: floored('fullness'),
      joy: floored('joy'),
      energy: floored('energy'),
      clean: floored('clean'),
    },
    sleeping: isSleeping,
    poopsAdded: Math.min(2, Math.floor(awayMinutes / 25)),
    awayMinutes,
  };
}
