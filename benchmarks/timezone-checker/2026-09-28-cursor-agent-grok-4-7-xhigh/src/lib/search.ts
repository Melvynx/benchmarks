import { CITIES } from '../data/cities';
import type { City } from '../types';

function fold(value: string): string {
  return value.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();
}

function tokens(value: string): string[] {
  return fold(value).split(/[^a-z0-9]+/).filter(Boolean);
}

function fieldsOf(city: City): string[] {
  return [city.name, city.country, ...(city.aliases ?? [])];
}

export function cityMatches(city: City, query: string): boolean {
  const q = fold(query).trim();
  if (!q) return true;
  const fields = fieldsOf(city);
  if (q.length < 3) {
    return fields.some((field) => tokens(field).some((token) => token.startsWith(q)));
  }
  return fields.some((field) => fold(field).includes(q));
}

function score(city: City, query: string): number {
  const q = fold(query).trim();
  const name = fold(city.name);
  if (name.startsWith(q)) return 0;
  if (name.includes(q)) return 1;
  const country = fold(city.country);
  if (country.startsWith(q)) return 2;
  if (country.includes(q)) return 3;
  return 4;
}

export function filterCities(selectedIds: readonly string[], query: string): City[] {
  const selected = new Set(selectedIds);
  const available = CITIES.filter((city) => !selected.has(city.id));
  const q = query.trim();
  if (!q) return available;
  return available
    .filter((city) => cityMatches(city, q))
    .sort((a, b) => score(a, q) - score(b, q) || a.name.localeCompare(b.name));
}
