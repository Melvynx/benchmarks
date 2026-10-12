import type { City, Region } from '../types'

export const REGIONS: readonly Region[] = [
  'North America',
  'South America',
  'Europe',
  'Africa',
  'Middle East',
  'Asia',
  'Oceania',
]

/** Ordered by region, then alphabetically — the picker renders it as-is. */
export const CITIES: readonly City[] = [
  { id: 'chicago', name: 'Chicago', country: 'United States', region: 'North America', timeZone: 'America/Chicago', aliases: ['USA', 'US'] },
  { id: 'denver', name: 'Denver', country: 'United States', region: 'North America', timeZone: 'America/Denver', aliases: ['USA', 'US'] },
  { id: 'mexico-city', name: 'Mexico City', country: 'Mexico', region: 'North America', timeZone: 'America/Mexico_City' },
  { id: 'new-york', name: 'New York', country: 'United States', region: 'North America', timeZone: 'America/New_York', aliases: ['USA', 'US', 'NYC'] },
  { id: 'san-francisco', name: 'San Francisco', country: 'United States', region: 'North America', timeZone: 'America/Los_Angeles', aliases: ['USA', 'US', 'SF', 'California'] },
  { id: 'toronto', name: 'Toronto', country: 'Canada', region: 'North America', timeZone: 'America/Toronto' },

  { id: 'bogota', name: 'Bogotá', country: 'Colombia', region: 'South America', timeZone: 'America/Bogota' },
  { id: 'buenos-aires', name: 'Buenos Aires', country: 'Argentina', region: 'South America', timeZone: 'America/Argentina/Buenos_Aires' },
  { id: 'lima', name: 'Lima', country: 'Peru', region: 'South America', timeZone: 'America/Lima' },
  { id: 'sao-paulo', name: 'São Paulo', country: 'Brazil', region: 'South America', timeZone: 'America/Sao_Paulo' },

  { id: 'berlin', name: 'Berlin', country: 'Germany', region: 'Europe', timeZone: 'Europe/Berlin' },
  { id: 'geneva', name: 'Geneva', country: 'Switzerland', region: 'Europe', timeZone: 'Europe/Zurich' },
  { id: 'istanbul', name: 'Istanbul', country: 'Turkey', region: 'Europe', timeZone: 'Europe/Istanbul', aliases: ['Türkiye'] },
  { id: 'london', name: 'London', country: 'United Kingdom', region: 'Europe', timeZone: 'Europe/London', aliases: ['UK', 'England', 'Britain'] },
  { id: 'moscow', name: 'Moscow', country: 'Russia', region: 'Europe', timeZone: 'Europe/Moscow' },
  { id: 'paris', name: 'Paris', country: 'France', region: 'Europe', timeZone: 'Europe/Paris' },

  { id: 'cairo', name: 'Cairo', country: 'Egypt', region: 'Africa', timeZone: 'Africa/Cairo' },
  { id: 'johannesburg', name: 'Johannesburg', country: 'South Africa', region: 'Africa', timeZone: 'Africa/Johannesburg' },
  { id: 'lagos', name: 'Lagos', country: 'Nigeria', region: 'Africa', timeZone: 'Africa/Lagos' },
  { id: 'nairobi', name: 'Nairobi', country: 'Kenya', region: 'Africa', timeZone: 'Africa/Nairobi' },

  { id: 'dubai', name: 'Dubai', country: 'United Arab Emirates', region: 'Middle East', timeZone: 'Asia/Dubai', aliases: ['UAE'] },
  { id: 'tel-aviv', name: 'Tel Aviv', country: 'Israel', region: 'Middle East', timeZone: 'Asia/Jerusalem' },

  { id: 'bangkok', name: 'Bangkok', country: 'Thailand', region: 'Asia', timeZone: 'Asia/Bangkok' },
  { id: 'denpasar', name: 'Denpasar', country: 'Indonesia', region: 'Asia', timeZone: 'Asia/Makassar', aliases: ['Bali'] },
  { id: 'hong-kong', name: 'Hong Kong', country: 'China', region: 'Asia', timeZone: 'Asia/Hong_Kong' },
  { id: 'kathmandu', name: 'Kathmandu', country: 'Nepal', region: 'Asia', timeZone: 'Asia/Kathmandu' },
  { id: 'mumbai', name: 'Mumbai', country: 'India', region: 'Asia', timeZone: 'Asia/Kolkata' },
  { id: 'seoul', name: 'Seoul', country: 'South Korea', region: 'Asia', timeZone: 'Asia/Seoul' },
  { id: 'shanghai', name: 'Shanghai', country: 'China', region: 'Asia', timeZone: 'Asia/Shanghai' },
  { id: 'singapore', name: 'Singapore', country: 'Singapore', region: 'Asia', timeZone: 'Asia/Singapore' },
  { id: 'tokyo', name: 'Tokyo', country: 'Japan', region: 'Asia', timeZone: 'Asia/Tokyo' },

  { id: 'auckland', name: 'Auckland', country: 'New Zealand', region: 'Oceania', timeZone: 'Pacific/Auckland' },
  { id: 'honolulu', name: 'Honolulu', country: 'United States', region: 'Oceania', timeZone: 'Pacific/Honolulu', aliases: ['USA', 'US', 'Hawaii'] },
  { id: 'sydney', name: 'Sydney', country: 'Australia', region: 'Oceania', timeZone: 'Australia/Sydney' },
]

const CITY_BY_ID: ReadonlyMap<string, City> = new Map(CITIES.map((city) => [city.id, city]))

export function getCity(id: string): City | undefined {
  return CITY_BY_ID.get(id)
}

export const DEFAULT_CITY_IDS: readonly string[] = ['san-francisco', 'denpasar', 'geneva']
