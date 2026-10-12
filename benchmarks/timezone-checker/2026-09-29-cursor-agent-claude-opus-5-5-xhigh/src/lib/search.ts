import { CITIES, type City } from './cities';

export function normalizeSearch(value: string): string {
  return value.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase().trim();
}

const words = (value: string) => value.split(/[\s\-/_]+/);

function scoreCity(city: City, query: string): number {
  const name = normalizeSearch(city.name);
  const country = normalizeSearch(city.country);

  if (name === query) return 100;
  if (name.startsWith(query)) return 90;
  if (words(name).some((word) => word.startsWith(query))) return 80;
  if (city.aliases.some((alias) => normalizeSearch(alias) === query)) return 75;
  if (country.startsWith(query) || words(country).some((word) => word.startsWith(query))) return 70;
  if (city.countryCode.toLowerCase() === query) return 65;
  if (city.aliases.some((alias) => normalizeSearch(alias).startsWith(query))) return 60;
  if (name.includes(query)) return 50;
  if (country.includes(query)) return 40;
  if (normalizeSearch(city.region).startsWith(query)) return 30;
  if (normalizeSearch(city.timeZone).includes(query)) return 20;
  return 0;
}

/** Empty query → full catalog in its natural (region) order. Otherwise ranked matches. */
export function searchCities(query: string, catalog: readonly City[] = CITIES): City[] {
  const normalized = normalizeSearch(query);
  if (!normalized) return [...catalog];

  return catalog
    .map((city) => ({ city, score: scoreCity(city, normalized) }))
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score || a.city.name.localeCompare(b.city.name))
    .map(({ city }) => city);
}
