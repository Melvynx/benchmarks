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
  /** IATA city code, used where a full name cannot fit (dense mobile columns). */
  code: string
  country: string
  region: Region
  timeZone: string
  /** Extra search terms: nicknames, former names, well-known abbreviations. */
  aliases?: readonly string[]
}

export const CITIES: readonly City[] = [
  { id: 'honolulu', name: 'Honolulu', code: 'HNL', country: 'United States', region: 'North America', timeZone: 'Pacific/Honolulu', aliases: ['Hawaii', 'USA'] },
  { id: 'san-francisco', name: 'San Francisco', code: 'SFO', country: 'United States', region: 'North America', timeZone: 'America/Los_Angeles', aliases: ['SF', 'Bay Area', 'California', 'USA'] },
  { id: 'denver', name: 'Denver', code: 'DEN', country: 'United States', region: 'North America', timeZone: 'America/Denver', aliases: ['Colorado', 'USA'] },
  { id: 'mexico-city', name: 'Mexico City', code: 'MEX', country: 'Mexico', region: 'North America', timeZone: 'America/Mexico_City', aliases: ['CDMX'] },
  { id: 'chicago', name: 'Chicago', code: 'CHI', country: 'United States', region: 'North America', timeZone: 'America/Chicago', aliases: ['Illinois', 'USA'] },
  { id: 'new-york', name: 'New York', code: 'NYC', country: 'United States', region: 'North America', timeZone: 'America/New_York', aliases: ['USA'] },
  { id: 'toronto', name: 'Toronto', code: 'YTO', country: 'Canada', region: 'North America', timeZone: 'America/Toronto', aliases: ['Ontario'] },

  { id: 'bogota', name: 'Bogotá', code: 'BOG', country: 'Colombia', region: 'South America', timeZone: 'America/Bogota' },
  { id: 'santiago', name: 'Santiago', code: 'SCL', country: 'Chile', region: 'South America', timeZone: 'America/Santiago' },
  { id: 'buenos-aires', name: 'Buenos Aires', code: 'BUE', country: 'Argentina', region: 'South America', timeZone: 'America/Argentina/Buenos_Aires' },
  { id: 'sao-paulo', name: 'São Paulo', code: 'SAO', country: 'Brazil', region: 'South America', timeZone: 'America/Sao_Paulo' },

  { id: 'london', name: 'London', code: 'LON', country: 'United Kingdom', region: 'Europe', timeZone: 'Europe/London', aliases: ['UK', 'England', 'Britain'] },
  { id: 'lisbon', name: 'Lisbon', code: 'LIS', country: 'Portugal', region: 'Europe', timeZone: 'Europe/Lisbon', aliases: ['Lisboa'] },
  { id: 'paris', name: 'Paris', code: 'PAR', country: 'France', region: 'Europe', timeZone: 'Europe/Paris' },
  { id: 'geneva', name: 'Geneva', code: 'GVA', country: 'Switzerland', region: 'Europe', timeZone: 'Europe/Zurich', aliases: ['Genève', 'Genf'] },
  { id: 'berlin', name: 'Berlin', code: 'BER', country: 'Germany', region: 'Europe', timeZone: 'Europe/Berlin', aliases: ['Deutschland'] },
  { id: 'istanbul', name: 'Istanbul', code: 'IST', country: 'Türkiye', region: 'Europe', timeZone: 'Europe/Istanbul', aliases: ['Turkey'] },

  { id: 'casablanca', name: 'Casablanca', code: 'CAS', country: 'Morocco', region: 'Africa', timeZone: 'Africa/Casablanca' },
  { id: 'lagos', name: 'Lagos', code: 'LOS', country: 'Nigeria', region: 'Africa', timeZone: 'Africa/Lagos' },
  { id: 'cairo', name: 'Cairo', code: 'CAI', country: 'Egypt', region: 'Africa', timeZone: 'Africa/Cairo' },
  { id: 'johannesburg', name: 'Johannesburg', code: 'JNB', country: 'South Africa', region: 'Africa', timeZone: 'Africa/Johannesburg', aliases: ['Joburg'] },
  { id: 'nairobi', name: 'Nairobi', code: 'NBO', country: 'Kenya', region: 'Africa', timeZone: 'Africa/Nairobi' },

  { id: 'tel-aviv', name: 'Tel Aviv', code: 'TLV', country: 'Israel', region: 'Middle East', timeZone: 'Asia/Jerusalem' },
  { id: 'dubai', name: 'Dubai', code: 'DXB', country: 'United Arab Emirates', region: 'Middle East', timeZone: 'Asia/Dubai', aliases: ['UAE'] },
  { id: 'tehran', name: 'Tehran', code: 'THR', country: 'Iran', region: 'Middle East', timeZone: 'Asia/Tehran' },

  { id: 'mumbai', name: 'Mumbai', code: 'BOM', country: 'India', region: 'Asia', timeZone: 'Asia/Kolkata', aliases: ['Bombay'] },
  { id: 'kathmandu', name: 'Kathmandu', code: 'KTM', country: 'Nepal', region: 'Asia', timeZone: 'Asia/Kathmandu' },
  { id: 'bangkok', name: 'Bangkok', code: 'BKK', country: 'Thailand', region: 'Asia', timeZone: 'Asia/Bangkok' },
  { id: 'singapore', name: 'Singapore', code: 'SIN', country: 'Singapore', region: 'Asia', timeZone: 'Asia/Singapore' },
  { id: 'denpasar', name: 'Denpasar', code: 'DPS', country: 'Indonesia', region: 'Asia', timeZone: 'Asia/Makassar', aliases: ['Bali'] },
  { id: 'shanghai', name: 'Shanghai', code: 'SHA', country: 'China', region: 'Asia', timeZone: 'Asia/Shanghai' },
  { id: 'tokyo', name: 'Tokyo', code: 'TYO', country: 'Japan', region: 'Asia', timeZone: 'Asia/Tokyo' },

  { id: 'sydney', name: 'Sydney', code: 'SYD', country: 'Australia', region: 'Oceania', timeZone: 'Australia/Sydney' },
  { id: 'auckland', name: 'Auckland', code: 'AKL', country: 'New Zealand', region: 'Oceania', timeZone: 'Pacific/Auckland' },
]

export const CITY_BY_ID: ReadonlyMap<string, City> = new Map(CITIES.map((city) => [city.id, city]))

export const DEFAULT_CITY_IDS: readonly string[] = ['san-francisco', 'denpasar', 'geneva']

const normalize = (value: string) =>
  value
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .trim()

/** Terms the city picker matches against besides the city name itself. */
export function searchKeywords(city: City): string[] {
  return [city.country, city.region, city.code, ...(city.aliases ?? [])]
}

const wordStartsWith = (text: string, query: string) => text.split(/[\s-]+/).some((word) => word.startsWith(query))

/**
 * Ranks a city for a search query: name prefix > word prefix > substring > keyword matches.
 * Returns 0 for no match. Accent-insensitive, so "sao" finds São Paulo.
 */
export function citySearchScore(name: string, query: string, keywords: readonly string[] = []): number {
  const q = normalize(query)
  if (!q) return 1
  const n = normalize(name)
  if (n.startsWith(q)) return 1
  if (wordStartsWith(n, q)) return 0.9
  if (n.includes(q)) return 0.7
  const terms = keywords.map(normalize)
  if (terms.some((term) => term.startsWith(q))) return 0.6
  if (terms.some((term) => wordStartsWith(term, q))) return 0.5
  return 0
}
