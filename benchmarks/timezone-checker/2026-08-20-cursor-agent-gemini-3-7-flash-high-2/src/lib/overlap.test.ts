import { describe, it, expect } from 'vitest';
import { CITIES_CATALOG } from '../data/cities';
import { calculateLocalTimeForRefHour, isHourAwake, getOverlapRanges } from './timezone';

describe('Overlap Logic for Meeting and Base Modes', () => {
  const sf = CITIES_CATALOG.find((c) => c.id === 'san-francisco')!;
  const denpasar = CITIES_CATALOG.find((c) => c.id === 'denpasar')!;
  const geneva = CITIES_CATALOG.find((c) => c.id === 'geneva')!;

  const testDate = new Date('2026-08-20T12:00:00Z');
  const wakeHour = 7;
  const sleepHour = 23;

  it('should find exact overlap hours between San Francisco, Denpasar, and Geneva', () => {
    const commonHours: number[] = [];

    for (let refHour = 0; refHour < 24; refHour++) {
      const sfLocal = calculateLocalTimeForRefHour(sf.timezone, sf.timezone, refHour, testDate);
      const denpasarLocal = calculateLocalTimeForRefHour(sf.timezone, denpasar.timezone, refHour, testDate);
      const genevaLocal = calculateLocalTimeForRefHour(sf.timezone, geneva.timezone, refHour, testDate);

      const sfAwake = isHourAwake(sfLocal.localHour, wakeHour, sleepHour);
      const denpasarAwake = isHourAwake(denpasarLocal.localHour, wakeHour, sleepHour);
      const genevaAwake = isHourAwake(genevaLocal.localHour, wakeHour, sleepHour);

      if (sfAwake && denpasarAwake && genevaAwake) {
        commonHours.push(refHour);
      }
    }

    // Let's analyze:
    // SF hour 7 AM: SF=7am (awake), Denpasar=22 (10pm, awake <23), Geneva=16 (4pm, awake). -> Overlap!
    // SF hour 22 (10 PM): SF=10pm (awake), Denpasar=13 (1pm next day, awake), Geneva=7 (7am next day, awake). -> Overlap!
    expect(commonHours).toEqual([7, 22]);

    const ranges = getOverlapRanges(commonHours, '12h');
    expect(ranges).toHaveLength(2);
    expect(ranges[0].formatted).toBe('7am — 8am');
    expect(ranges[1].formatted).toBe('10pm — 11pm');
    expect(ranges[0].hoursCount).toBe(1);
    expect(ranges[1].hoursCount).toBe(1);
  });

  it('should calculate independent pairwise overlaps in Base Mode', () => {
    // SF vs Denpasar:
    const sfDenpasarHours: number[] = [];
    for (let refHour = 0; refHour < 24; refHour++) {
      const sfLocal = calculateLocalTimeForRefHour(sf.timezone, sf.timezone, refHour, testDate);
      const denpasarLocal = calculateLocalTimeForRefHour(sf.timezone, denpasar.timezone, refHour, testDate);

      if (
        isHourAwake(sfLocal.localHour, wakeHour, sleepHour) &&
        isHourAwake(denpasarLocal.localHour, wakeHour, sleepHour)
      ) {
        sfDenpasarHours.push(refHour);
      }
    }
    // SF vs Geneva:
    const sfGenevaHours: number[] = [];
    for (let refHour = 0; refHour < 24; refHour++) {
      const sfLocal = calculateLocalTimeForRefHour(sf.timezone, sf.timezone, refHour, testDate);
      const genevaLocal = calculateLocalTimeForRefHour(sf.timezone, geneva.timezone, refHour, testDate);

      if (
        isHourAwake(sfLocal.localHour, wakeHour, sleepHour) &&
        isHourAwake(genevaLocal.localHour, wakeHour, sleepHour)
      ) {
        sfGenevaHours.push(refHour);
      }
    }

    expect(sfDenpasarHours.length).toBeGreaterThan(0);
    expect(sfGenevaHours.length).toBeGreaterThan(0);

    const denpasarRanges = getOverlapRanges(sfDenpasarHours, '12h');
    const genevaRanges = getOverlapRanges(sfGenevaHours, '12h');

    expect(denpasarRanges.length).toBeGreaterThan(0);
    expect(genevaRanges.length).toBeGreaterThan(0);
  });
});
