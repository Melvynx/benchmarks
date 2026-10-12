import { describe, expect, it } from 'vitest';
import { applyFood, catchUp, decay, getMood, growthScale, levelInfo, stageName, xpNeeded, type Stats } from './logic';

const base: Stats = { fullness: 60, joy: 60, energy: 60, clean: 60 };

describe('levels', () => {
  it('starts at level 1 with zero xp', () => {
    expect(levelInfo(0)).toEqual({ level: 1, into: 0, need: xpNeeded(1) });
  });

  it('levels up exactly on the threshold', () => {
    expect(levelInfo(xpNeeded(1) - 1).level).toBe(1);
    expect(levelInfo(xpNeeded(1)).level).toBe(2);
    expect(levelInfo(xpNeeded(1) + xpNeeded(2)).level).toBe(3);
  });

  it('caps at the max level', () => {
    expect(levelInfo(999999).level).toBe(12);
  });

  it('grows with level and names stages', () => {
    expect(growthScale(8)).toBeGreaterThan(growthScale(1));
    expect(stageName(1)).toBe('Baby calf');
    expect(stageName(6)).toBe('Big cow');
  });
});

describe('decay', () => {
  it('drains belly, joy, energy and freshness while awake', () => {
    const next = decay(base, 1, { sleeping: false, poops: 0 });
    expect(next.fullness).toBeLessThan(base.fullness);
    expect(next.joy).toBeLessThan(base.joy);
    expect(next.energy).toBeLessThan(base.energy);
    expect(next.clean).toBeLessThan(base.clean);
  });

  it('restores energy while sleeping', () => {
    const next = decay(base, 1, { sleeping: true, poops: 0 });
    expect(next.energy).toBeGreaterThan(base.energy);
  });

  it('poops make things dirtier faster', () => {
    const clean = decay(base, 1, { sleeping: false, poops: 0 });
    const messy = decay(base, 1, { sleeping: false, poops: 3 });
    expect(messy.clean).toBeLessThan(clean.clean);
  });

  it('never leaves the 0..100 range', () => {
    const low = decay({ fullness: 1, joy: 1, energy: 1, clean: 1 }, 30, { sleeping: false, poops: 2 });
    expect(Object.values(low).every((v) => v >= 0 && v <= 100)).toBe(true);
    const high = decay({ ...base, energy: 99 }, 30, { sleeping: true, poops: 0 });
    expect(high.energy).toBe(100);
  });
});

describe('feeding', () => {
  it('raises belly and joy and clamps at 100', () => {
    const out = applyFood({ ...base, fullness: 95 }, 'apple', 'grass');
    expect(out.stats.fullness).toBe(100);
    expect(out.delta.fullness).toBe(5);
    expect(out.loved).toBe(false);
  });

  it('gives a bonus for the favourite food', () => {
    const normal = applyFood(base, 'cookie', 'apple');
    const loved = applyFood(base, 'cookie', 'cookie');
    expect(loved.loved).toBe(true);
    expect(loved.stats.joy).toBeGreaterThan(normal.stats.joy);
    expect(loved.xp).toBeGreaterThan(normal.xp);
  });
});

describe('mood', () => {
  it('prioritises sleeping, then hunger, then sleepiness, then mess, then sadness', () => {
    const worst: Stats = { fullness: 5, joy: 5, energy: 5, clean: 5 };
    expect(getMood(worst, true)).toBe('sleeping');
    expect(getMood(worst, false)).toBe('hungry');
    expect(getMood({ ...worst, fullness: 80 }, false)).toBe('sleepy');
    expect(getMood({ ...worst, fullness: 80, energy: 80 }, false)).toBe('dirty');
    expect(getMood({ ...worst, fullness: 80, energy: 80, clean: 80 }, false)).toBe('sad');
  });

  it('is happy when everything is fine', () => {
    expect(getMood({ fullness: 90, joy: 90, energy: 90, clean: 90 }, false)).toBe('happy');
  });
});

describe('catch up', () => {
  it('does nothing without elapsed time', () => {
    const r = catchUp(base, false, 0, 0);
    expect(r.stats).toEqual(base);
    expect(r.poopsAdded).toBe(0);
  });

  it('never drains below the friendly floors', () => {
    const r = catchUp({ fullness: 50, joy: 50, energy: 50, clean: 50 }, false, 0, 24 * 3600 * 1000);
    expect(r.stats.fullness).toBeGreaterThanOrEqual(12);
    expect(r.stats.joy).toBeGreaterThanOrEqual(18);
    expect(r.stats.clean).toBeGreaterThanOrEqual(18);
    expect(r.awayMinutes).toBe(480);
    expect(r.poopsAdded).toBe(2);
  });

  it('wakes a sleeping pet that is fully rested', () => {
    const r = catchUp({ ...base, energy: 50 }, true, 0, 10 * 60 * 1000);
    expect(r.sleeping).toBe(false);
    expect(r.stats.energy).toBeGreaterThan(85);
  });
});
