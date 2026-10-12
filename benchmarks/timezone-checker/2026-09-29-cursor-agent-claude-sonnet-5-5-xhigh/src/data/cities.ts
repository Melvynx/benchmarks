export const REGIONS = [
  'North America',
  'South America',
  'Europe',
  'Africa',
  'Middle East',
  'Asia',
  'Oceania',
] as const

export type Region = (typeof REGIONS)[number]

export interface City {
  id: string
  name: string
  country: string
  /** IANA time zone identifier, resolved by the browser's Intl database. */
  timeZone: string
  region: Region
  /** Extra search terms (nicknames, states, former names). */
  aliases?: readonly string[]
}

export const CITIES: readonly City[] = [
  // North America
  { id: 'san-francisco', name: 'San Francisco', country: 'United States', timeZone: 'America/Los_Angeles', region: 'North America', aliases: ['SF', 'California', 'USA', 'Bay Area', 'Pacific'] },
  { id: 'denver', name: 'Denver', country: 'United States', timeZone: 'America/Denver', region: 'North America', aliases: ['Colorado', 'USA', 'Mountain'] },
  { id: 'chicago', name: 'Chicago', country: 'United States', timeZone: 'America/Chicago', region: 'North America', aliases: ['Illinois', 'USA', 'Central'] },
  { id: 'new-york', name: 'New York', country: 'United States', timeZone: 'America/New_York', region: 'North America', aliases: ['NYC', 'USA', 'Eastern'] },
  { id: 'toronto', name: 'Toronto', country: 'Canada', timeZone: 'America/Toronto', region: 'North America', aliases: ['Ontario'] },
  { id: 'mexico-city', name: 'Mexico City', country: 'Mexico', timeZone: 'America/Mexico_City', region: 'North America', aliases: ['CDMX'] },

  // South America
  { id: 'sao-paulo', name: 'São Paulo', country: 'Brazil', timeZone: 'America/Sao_Paulo', region: 'South America' },
  { id: 'buenos-aires', name: 'Buenos Aires', country: 'Argentina', timeZone: 'America/Argentina/Buenos_Aires', region: 'South America' },
  { id: 'bogota', name: 'Bogotá', country: 'Colombia', timeZone: 'America/Bogota', region: 'South America' },
  { id: 'santiago', name: 'Santiago', country: 'Chile', timeZone: 'America/Santiago', region: 'South America' },

  // Europe
  { id: 'london', name: 'London', country: 'United Kingdom', timeZone: 'Europe/London', region: 'Europe', aliases: ['UK', 'England', 'Britain', 'GMT'] },
  { id: 'lisbon', name: 'Lisbon', country: 'Portugal', timeZone: 'Europe/Lisbon', region: 'Europe' },
  { id: 'paris', name: 'Paris', country: 'France', timeZone: 'Europe/Paris', region: 'Europe' },
  { id: 'geneva', name: 'Geneva', country: 'Switzerland', timeZone: 'Europe/Zurich', region: 'Europe', aliases: ['Zurich', 'Genève'] },
  { id: 'berlin', name: 'Berlin', country: 'Germany', timeZone: 'Europe/Berlin', region: 'Europe' },
  { id: 'athens', name: 'Athens', country: 'Greece', timeZone: 'Europe/Athens', region: 'Europe' },
  { id: 'istanbul', name: 'Istanbul', country: 'Türkiye', timeZone: 'Europe/Istanbul', region: 'Europe', aliases: ['Turkey'] },

  // Africa
  { id: 'lagos', name: 'Lagos', country: 'Nigeria', timeZone: 'Africa/Lagos', region: 'Africa' },
  { id: 'cairo', name: 'Cairo', country: 'Egypt', timeZone: 'Africa/Cairo', region: 'Africa' },
  { id: 'nairobi', name: 'Nairobi', country: 'Kenya', timeZone: 'Africa/Nairobi', region: 'Africa' },
  { id: 'johannesburg', name: 'Johannesburg', country: 'South Africa', timeZone: 'Africa/Johannesburg', region: 'Africa', aliases: ['Joburg'] },

  // Middle East
  { id: 'dubai', name: 'Dubai', country: 'United Arab Emirates', timeZone: 'Asia/Dubai', region: 'Middle East', aliases: ['UAE'] },
  { id: 'tel-aviv', name: 'Tel Aviv', country: 'Israel', timeZone: 'Asia/Jerusalem', region: 'Middle East', aliases: ['Jerusalem'] },
  { id: 'riyadh', name: 'Riyadh', country: 'Saudi Arabia', timeZone: 'Asia/Riyadh', region: 'Middle East' },

  // Asia
  { id: 'mumbai', name: 'Mumbai', country: 'India', timeZone: 'Asia/Kolkata', region: 'Asia', aliases: ['Bombay', 'Delhi', 'Bangalore', 'Kolkata'] },
  { id: 'kathmandu', name: 'Kathmandu', country: 'Nepal', timeZone: 'Asia/Kathmandu', region: 'Asia' },
  { id: 'bangkok', name: 'Bangkok', country: 'Thailand', timeZone: 'Asia/Bangkok', region: 'Asia' },
  { id: 'denpasar', name: 'Denpasar', country: 'Indonesia', timeZone: 'Asia/Makassar', region: 'Asia', aliases: ['Bali'] },
  { id: 'singapore', name: 'Singapore', country: 'Singapore', timeZone: 'Asia/Singapore', region: 'Asia' },
  { id: 'hong-kong', name: 'Hong Kong', country: 'China', timeZone: 'Asia/Hong_Kong', region: 'Asia' },
  { id: 'tokyo', name: 'Tokyo', country: 'Japan', timeZone: 'Asia/Tokyo', region: 'Asia' },

  // Oceania
  { id: 'sydney', name: 'Sydney', country: 'Australia', timeZone: 'Australia/Sydney', region: 'Oceania' },
  { id: 'auckland', name: 'Auckland', country: 'New Zealand', timeZone: 'Pacific/Auckland', region: 'Oceania' },
  { id: 'honolulu', name: 'Honolulu', country: 'United States', timeZone: 'Pacific/Honolulu', region: 'Oceania', aliases: ['Hawaii', 'USA'] },
]

export const CITY_BY_ID: ReadonlyMap<string, City> = new Map(CITIES.map((city) => [city.id, city]))

export const DEFAULT_CITY_IDS: readonly string[] = ['san-francisco', 'denpasar', 'geneva']

const stripDiacritics = (value: string) => value.normalize('NFD').replace(/\p{Diacritic}/gu, '')

export const normalizeSearch = (value: string) => stripDiacritics(value).toLowerCase().trim()

export function matchesCity(city: City, query: string): boolean {
  const needle = normalizeSearch(query)
  if (!needle) return true
  const haystack = [city.name, city.country, ...(city.aliases ?? [])].map(normalizeSearch)
  return haystack.some((entry) => entry.includes(needle))
}
