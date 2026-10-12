import type { FoodDef } from "./foods";

export const STAT_MAX = 100;
/** Cowdie refuses food once fullness reaches this value. */
export const REFUSE_FULLNESS = 92;
/** Offline time that counts toward decay, so coming back after a week is not a disaster. */
export const MAX_OFFLINE_MINUTES = 12 * 60;
export const SAVE_KEY = "cowdie:save:v1";

export interface Stats {
  fullness: number;
  happiness: number;
  energy: number;
  hygiene: number;
}

export interface PetState extends Stats {
  name: string;
  xp: number;
  meals: number;
  asleep: boolean;
  savedAt: number;
}

export type Stage = "Baby" | "Kid" | "Adult";
export type FeedBlock = "locked" | "full";

export function clamp(value: number, min = 0, max = STAT_MAX): number {
  return Math.min(max, Math.max(min, value));
}

export function levelFromXp(xp: number): number {
  return 1 + Math.floor(Math.sqrt(Math.max(0, xp) / 25));
}

export function xpForLevel(level: number): number {
  const n = Math.max(0, level - 1);
  return 25 * n * n;
}

export function xpProgress(xp: number): { level: number; ratio: number } {
  const level = levelFromXp(xp);
  const start = xpForLevel(level);
  const end = xpForLevel(level + 1);
  return { level, ratio: clamp((xp - start) / (end - start), 0, 1) };
}

export function stageFromLevel(level: number): Stage {
  if (level <= 2) return "Baby";
  if (level <= 4) return "Kid";
  return "Adult";
}

export function createPet(now: number, name = "Cowdie"): PetState {
  return {
    name,
    fullness: 60,
    happiness: 70,
    energy: 90,
    hygiene: 85,
    xp: 0,
    meals: 0,
    asleep: false,
    savedAt: now,
  };
}

/** Passive stat decay for a number of minutes. Pure: returns a new state. */
export function decay(state: PetState, minutes: number): PetState {
  if (minutes <= 0) return state;
  const hungerPenalty = state.fullness < 20 ? 0.35 : 0;
  const next: PetState = {
    ...state,
    fullness: clamp(state.fullness + (state.asleep ? -0.5 : -0.9) * minutes),
    happiness: clamp(state.happiness + (state.asleep ? -0.1 : -0.35 - hungerPenalty) * minutes),
    energy: clamp(state.energy + (state.asleep ? 1.8 : -0.35) * minutes),
    hygiene: clamp(state.hygiene + (state.asleep ? -0.1 : -0.25) * minutes),
  };
  if (!next.asleep && next.energy <= 0) next.asleep = true;
  if (next.asleep && next.energy >= STAT_MAX) next.asleep = false;
  return next;
}

/** Brings a saved pet up to date with the wall clock. */
export function tick(state: PetState, now: number): PetState {
  const elapsed = (now - state.savedAt) / 60_000;
  const minutes = Math.min(Math.max(elapsed, 0), MAX_OFFLINE_MINUTES);
  return { ...decay(state, minutes), savedAt: now };
}

export function feedBlock(state: PetState, food: FoodDef): FeedBlock | null {
  if (levelFromXp(state.xp) < food.unlockLevel) return "locked";
  if (state.fullness >= REFUSE_FULLNESS) return "full";
  return null;
}

/** Applies a share (0..1) of a food's effect. Called once per bite so the HUD can animate. */
export function applyBite(state: PetState, food: FoodDef, share: number): PetState {
  const e = food.effect;
  return {
    ...state,
    fullness: clamp(state.fullness + e.fullness * share),
    happiness: clamp(state.happiness + e.happiness * share),
    energy: clamp(state.energy + e.energy * share),
    hygiene: clamp(state.hygiene + e.hygiene * share),
    xp: state.xp + e.xp * share,
  };
}

export function countMeal(state: PetState): PetState {
  return { ...state, meals: state.meals + 1 };
}

export function applyPlay(state: PetState): PetState {
  return {
    ...state,
    happiness: clamp(state.happiness + 14),
    energy: clamp(state.energy - 10),
    fullness: clamp(state.fullness - 3),
    hygiene: clamp(state.hygiene - 3),
    xp: state.xp + 5,
  };
}

export function applyPoke(state: PetState): PetState {
  return { ...state, happiness: clamp(state.happiness + 2) };
}

/** A full bath is 40 hygiene; pass a share (0..1) to spread it over the bath animation. */
export function applyBathe(state: PetState, share: number): PetState {
  return {
    ...state,
    hygiene: clamp(state.hygiene + 40 * share),
    happiness: clamp(state.happiness + 4 * share),
    xp: state.xp + 4 * share,
  };
}

export function setAsleep(state: PetState, asleep: boolean): PetState {
  return { ...state, asleep };
}

const NUMERIC_KEYS = ["fullness", "happiness", "energy", "hygiene", "xp", "meals", "savedAt"] as const;

/** Parses a save blob. Anything malformed falls back to a fresh pet. */
export function loadState(raw: string | null, now: number): PetState {
  if (!raw) return createPet(now);
  try {
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null) return createPet(now);
    const record = parsed as Record<string, unknown>;
    for (const key of NUMERIC_KEYS) {
      if (typeof record[key] !== "number" || !Number.isFinite(record[key])) return createPet(now);
    }
    const base: PetState = {
      name: typeof record.name === "string" && record.name.trim() ? record.name.slice(0, 16) : "Cowdie",
      fullness: clamp(record.fullness as number),
      happiness: clamp(record.happiness as number),
      energy: clamp(record.energy as number),
      hygiene: clamp(record.hygiene as number),
      xp: Math.max(0, record.xp as number),
      meals: Math.max(0, Math.floor(record.meals as number)),
      asleep: record.asleep === true,
      savedAt: record.savedAt as number,
    };
    return tick(base, now);
  } catch {
    return createPet(now);
  }
}

export function serializeState(state: PetState): string {
  return JSON.stringify(state);
}
