export type Region =
  | 'North America'
  | 'South America'
  | 'Europe'
  | 'Africa'
  | 'Middle East'
  | 'Asia'
  | 'Oceania'

export interface City {
  /** Stable identifier persisted in localStorage. */
  id: string
  name: string
  country: string
  region: Region
  /** IANA timezone identifier. */
  timeZone: string
}

export const CITIES: readonly City[] = [
  // North America
  { id: 'san-francisco', name: 'San Francisco', country: 'United States', region: 'North America', timeZone: 'America/Los_Angeles' },
  { id: 'denver', name: 'Denver', country: 'United States', region: 'North America', timeZone: 'America/Denver' },
  { id: 'chicago', name: 'Chicago', country: 'United States', region: 'North America', timeZone: 'America/Chicago' },
  { id: 'new-york', name: 'New York', country: 'United States', region: 'North America', timeZone: 'America/New_York' },
  { id: 'toronto', name: 'Toronto', country: 'Canada', region: 'North America', timeZone: 'America/Toronto' },
  { id: 'mexico-city', name: 'Mexico City', country: 'Mexico', region: 'North America', timeZone: 'America/Mexico_City' },
  // South America
  { id: 'sao-paulo', name: 'São Paulo', country: 'Brazil', region: 'South America', timeZone: 'America/Sao_Paulo' },
  { id: 'buenos-aires', name: 'Buenos Aires', country: 'Argentina', region: 'South America', timeZone: 'America/Argentina/Buenos_Aires' },
  { id: 'bogota', name: 'Bogotá', country: 'Colombia', region: 'South America', timeZone: 'America/Bogota' },
  { id: 'lima', name: 'Lima', country: 'Peru', region: 'South America', timeZone: 'America/Lima' },
  // Europe
  { id: 'london', name: 'London', country: 'United Kingdom', region: 'Europe', timeZone: 'Europe/London' },
  { id: 'lisbon', name: 'Lisbon', country: 'Portugal', region: 'Europe', timeZone: 'Europe/Lisbon' },
  { id: 'paris', name: 'Paris', country: 'France', region: 'Europe', timeZone: 'Europe/Paris' },
  { id: 'geneva', name: 'Geneva', country: 'Switzerland', region: 'Europe', timeZone: 'Europe/Zurich' },
  { id: 'berlin', name: 'Berlin', country: 'Germany', region: 'Europe', timeZone: 'Europe/Berlin' },
  { id: 'stockholm', name: 'Stockholm', country: 'Sweden', region: 'Europe', timeZone: 'Europe/Stockholm' },
  { id: 'istanbul', name: 'Istanbul', country: 'Türkiye', region: 'Europe', timeZone: 'Europe/Istanbul' },
  // Africa
  { id: 'cairo', name: 'Cairo', country: 'Egypt', region: 'Africa', timeZone: 'Africa/Cairo' },
  { id: 'lagos', name: 'Lagos', country: 'Nigeria', region: 'Africa', timeZone: 'Africa/Lagos' },
  { id: 'nairobi', name: 'Nairobi', country: 'Kenya', region: 'Africa', timeZone: 'Africa/Nairobi' },
  { id: 'johannesburg', name: 'Johannesburg', country: 'South Africa', region: 'Africa', timeZone: 'Africa/Johannesburg' },
  // Middle East
  { id: 'dubai', name: 'Dubai', country: 'United Arab Emirates', region: 'Middle East', timeZone: 'Asia/Dubai' },
  { id: 'tel-aviv', name: 'Tel Aviv', country: 'Israel', region: 'Middle East', timeZone: 'Asia/Jerusalem' },
  { id: 'tehran', name: 'Tehran', country: 'Iran', region: 'Middle East', timeZone: 'Asia/Tehran' },
  // Asia
  { id: 'mumbai', name: 'Mumbai', country: 'India', region: 'Asia', timeZone: 'Asia/Kolkata' },
  { id: 'kathmandu', name: 'Kathmandu', country: 'Nepal', region: 'Asia', timeZone: 'Asia/Kathmandu' },
  { id: 'bangkok', name: 'Bangkok', country: 'Thailand', region: 'Asia', timeZone: 'Asia/Bangkok' },
  { id: 'singapore', name: 'Singapore', country: 'Singapore', region: 'Asia', timeZone: 'Asia/Singapore' },
  { id: 'hong-kong', name: 'Hong Kong', country: 'Hong Kong', region: 'Asia', timeZone: 'Asia/Hong_Kong' },
  { id: 'denpasar', name: 'Denpasar', country: 'Indonesia', region: 'Asia', timeZone: 'Asia/Makassar' },
  { id: 'tokyo', name: 'Tokyo', country: 'Japan', region: 'Asia', timeZone: 'Asia/Tokyo' },
  { id: 'seoul', name: 'Seoul', country: 'South Korea', region: 'Asia', timeZone: 'Asia/Seoul' },
  // Oceania
  { id: 'sydney', name: 'Sydney', country: 'Australia', region: 'Oceania', timeZone: 'Australia/Sydney' },
  { id: 'auckland', name: 'Auckland', country: 'New Zealand', region: 'Oceania', timeZone: 'Pacific/Auckland' },
]

const CITY_INDEX = new Map(CITIES.map((city) => [city.id, city]))

export function getCity(id: string): City | undefined {
  return CITY_INDEX.get(id)
}

export const DEFAULT_CITY_IDS = ['san-francisco', 'denpasar', 'geneva']

/** Case- and accent-insensitive search over city and country names. */
export function searchCities(query: string, excludeIds: Iterable<string> = []): City[] {
  const excluded = new Set(excludeIds)
  const needle = normalize(query.trim())
  return CITIES.filter((city) => {
    if (excluded.has(city.id)) return false
    if (!needle) return true
    return normalize(city.name).includes(needle) || normalize(city.country).includes(needle)
  })
}

function normalize(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
}
