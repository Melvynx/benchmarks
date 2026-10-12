import { describe, expect, it } from "vitest";
import { FOODS, getFood } from "./foods";
import {
  MAX_OFFLINE_MINUTES,
  REFUSE_FULLNESS,
  applyBathe,
  applyBite,
  applyPlay,
  createPet,
  decay,
  feedBlock,
  levelFromXp,
  loadState,
  serializeState,
  setAsleep,
  stageFromLevel,
  tick,
  xpForLevel,
  xpProgress,
} from "./state";

const MINUTE = 60_000;
const NOW = 1_700_000_000_000;

describe("levels and stages", () => {
  it("maps xp to levels using quadratic thresholds", () => {
    expect(levelFromXp(0)).toBe(1);
    expect(levelFromXp(25)).toBe(2);
    expect(levelFromXp(100)).toBe(3);
    expect(levelFromXp(225)).toBe(4);
    expect(levelFromXp(99)).toBe(2);
  });

  it("reports progress inside the current level", () => {
    expect(xpForLevel(3)).toBe(100);
    const progress = xpProgress(62.5);
    expect(progress.level).toBe(2);
    expect(progress.ratio).toBeCloseTo(0.5);
  });

  it("grows Cowdie through three stages", () => {
    expect(stageFromLevel(1)).toBe("Baby");
    expect(stageFromLevel(3)).toBe("Kid");
    expect(stageFromLevel(5)).toBe("Adult");
  });
});

describe("decay", () => {
  it("lowers fullness faster than energy while awake", () => {
    const pet = createPet(NOW);
    const after = decay(pet, 60);
    expect(after.fullness).toBeLessThan(pet.fullness);
    expect(pet.energy - after.energy).toBeLessThan(pet.fullness - after.fullness);
  });

  it("restores energy while asleep and wakes Cowdie at full energy", () => {
    const sleeping = setAsleep({ ...createPet(NOW), energy: 40 }, true);
    const rested = decay(sleeping, 60);
    expect(rested.energy).toBeGreaterThan(sleeping.energy);
    expect(decay(sleeping, 120).asleep).toBe(false);
  });

  it("makes Cowdie fall asleep when energy runs out", () => {
    const tired = { ...createPet(NOW), energy: 0.1 };
    expect(decay(tired, 5).asleep).toBe(true);
  });

  it("caps offline decay so long absences stay friendly", () => {
    const pet = createPet(NOW);
    const shortAway = tick(pet, NOW + MAX_OFFLINE_MINUTES * MINUTE);
    const longAway = tick(pet, NOW + 30 * 24 * 60 * MINUTE);
    expect(longAway.fullness).toBeCloseTo(shortAway.fullness);
    expect(longAway.savedAt).toBe(NOW + 30 * 24 * 60 * MINUTE);
  });
});

describe("feeding", () => {
  const apple = getFood("apple");
  const fish = getFood("fish");

  it("applies a bite share of the food effect and xp", () => {
    const pet = createPet(NOW);
    const bitten = applyBite(pet, apple, 0.5);
    expect(bitten.fullness).toBeCloseTo(pet.fullness + apple.effect.fullness * 0.5);
    expect(bitten.xp).toBeCloseTo(apple.effect.xp * 0.5);
  });

  it("never pushes a stat above 100", () => {
    const pet = { ...createPet(NOW), fullness: 95 };
    expect(applyBite(pet, fish, 1).fullness).toBe(100);
  });

  it("refuses food once Cowdie is full", () => {
    const stuffed = { ...createPet(NOW), fullness: REFUSE_FULLNESS };
    expect(feedBlock(stuffed, apple)).toBe("full");
    expect(feedBlock(createPet(NOW), apple)).toBeNull();
  });

  it("locks foods behind levels", () => {
    const baby = createPet(NOW);
    expect(feedBlock(baby, getFood("cookie"))).toBe("locked");
    const kid = { ...createPet(NOW), xp: xpForLevel(3) };
    expect(feedBlock(kid, getFood("cookie"))).toBeNull();
    expect(feedBlock(kid, getFood("cupcake"))).toBe("locked");
  });

  it("defines every food with a unique id", () => {
    const ids = new Set(FOODS.map((food) => food.id));
    expect(ids.size).toBe(FOODS.length);
  });
});

describe("other care actions", () => {
  it("bathing restores cleanliness and play costs energy", () => {
    const pet = { ...createPet(NOW), hygiene: 30, energy: 80 };
    expect(applyBathe(pet, 1).hygiene).toBe(70);
    expect(applyBathe(pet, 0.5).hygiene).toBe(50);
    expect(applyPlay(pet).energy).toBe(70);
  });
});

describe("save loading", () => {
  it("creates a fresh pet for missing or broken saves", () => {
    expect(loadState(null, NOW).name).toBe("Cowdie");
    expect(loadState("not json", NOW).fullness).toBe(createPet(NOW).fullness);
    expect(loadState('{"fullness":"x"}', NOW).xp).toBe(0);
  });

  it("round-trips a saved pet and decays for elapsed time", () => {
    const saved = { ...createPet(NOW), xp: 150, meals: 4, fullness: 80 };
    const restored = loadState(serializeState(saved), NOW + 60 * MINUTE);
    expect(restored.xp).toBe(150);
    expect(restored.meals).toBe(4);
    expect(restored.fullness).toBeLessThan(80);
    expect(restored.savedAt).toBe(NOW + 60 * MINUTE);
  });
});
