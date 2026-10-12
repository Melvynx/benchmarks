import type { City } from '../types'

export function normalize(text: string): string {
  return text
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .trim()
}

function score(city: City, query: string): number {
  const name = normalize(city.name)
  if (name.startsWith(query)) return 0
  if (name.split(/\s+/).some((word) => word.startsWith(query))) return 1
  if (name.includes(query)) return 2
  const others = [city.country, ...(city.aliases ?? [])].map(normalize)
  if (others.some((term) => term.startsWith(query))) return 3
  if (others.some((term) => term.includes(query))) return 4
  return -1
}

/** Matches on city name, country and aliases. Empty query keeps catalog order. */
export function searchCities(query: string, cities: readonly City[]): City[] {
  const q = normalize(query)
  if (!q) return [...cities]
  return cities
    .map((city, index) => ({ city, index, rank: score(city, q) }))
    .filter((entry) => entry.rank >= 0)
    .sort((a, b) => a.rank - b.rank || a.index - b.index)
    .map((entry) => entry.city)
}
