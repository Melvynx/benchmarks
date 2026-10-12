import { describe, expect, it } from 'vitest';
import { CITIES, REGIONS } from './cities';
import { searchCities } from './search';

const names = (query: string) => searchCities(query).map((city) => city.name);

describe('city catalog', () => {
  it('has ~34 unique cities covering every region', () => {
    expect(CITIES.length).toBe(34);
    expect(new Set(CITIES.map((city) => city.id)).size).toBe(CITIES.length);
    for (const region of REGIONS) {
      expect(CITIES.some((city) => city.region === region), region).toBe(true);
    }
  });
});

describe('searchCities', () => {
  it('returns the whole catalog for an empty query', () => {
    expect(searchCities('  ')).toHaveLength(CITIES.length);
  });

  it('matches city names, ignoring case and accents', () => {
    expect(names('sao')[0]).toBe('São Paulo');
    expect(names('BOGOTA')[0]).toBe('Bogotá');
  });

  it('matches countries', () => {
    expect(names('india')).toEqual(['Mumbai']);
    expect(names('switzerland')).toEqual(['Geneva']);
    expect(names('united')).toEqual(expect.arrayContaining(['San Francisco', 'London', 'Dubai']));
  });

  it('matches aliases', () => {
    expect(names('bali')).toEqual(['Denpasar']);
    expect(names('nyc')).toEqual(['New York']);
  });

  it('ranks name prefixes above other matches', () => {
    expect(names('par')[0]).toBe('Paris');
  });

  it('returns nothing for unknown places', () => {
    expect(names('atlantis')).toEqual([]);
  });
});
