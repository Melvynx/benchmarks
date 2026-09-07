export type Region =
  | 'North America'
  | 'South America'
  | 'Europe'
  | 'Africa'
  | 'Middle East'
  | 'Asia'
  | 'Oceania'

export interface City {
  id: string
  name: string
  country: string
  region: Region
  timeZone: string
  flag: string
}

export const CITIES: readonly City[] = [
  // North America (6)
  { id: 'san-francisco', name: 'San Francisco', country: 'United States', region: 'North America', timeZone: 'America/Los_Angeles', flag: '🇺🇸' },
  { id: 'denver', name: 'Denver', country: 'United States', region: 'North America', timeZone: 'America/Denver', flag: '🇺🇸' },
  { id: 'chicago', name: 'Chicago', country: 'United States', region: 'North America', timeZone: 'America/Chicago', flag: '🇺🇸' },
  { id: 'new-york', name: 'New York', country: 'United States', region: 'North America', timeZone: 'America/New_York', flag: '🇺🇸' },
  { id: 'toronto', name: 'Toronto', country: 'Canada', region: 'North America', timeZone: 'America/Toronto', flag: '🇨🇦' },
  { id: 'mexico-city', name: 'Mexico City', country: 'Mexico', region: 'North America', timeZone: 'America/Mexico_City', flag: '🇲🇽' },

  // South America (4)
  { id: 'sao-paulo', name: 'São Paulo', country: 'Brazil', region: 'South America', timeZone: 'America/Sao_Paulo', flag: '🇧🇷' },
  { id: 'buenos-aires', name: 'Buenos Aires', country: 'Argentina', region: 'South America', timeZone: 'America/Argentina/Buenos_Aires', flag: '🇦🇷' },
  { id: 'bogota', name: 'Bogotá', country: 'Colombia', region: 'South America', timeZone: 'America/Bogota', flag: '🇨🇴' },
  { id: 'lima', name: 'Lima', country: 'Peru', region: 'South America', timeZone: 'America/Lima', flag: '🇵🇪' },

  // Europe (7)
  { id: 'london', name: 'London', country: 'United Kingdom', region: 'Europe', timeZone: 'Europe/London', flag: '🇬🇧' },
  { id: 'lisbon', name: 'Lisbon', country: 'Portugal', region: 'Europe', timeZone: 'Europe/Lisbon', flag: '🇵🇹' },
  { id: 'paris', name: 'Paris', country: 'France', region: 'Europe', timeZone: 'Europe/Paris', flag: '🇫🇷' },
  { id: 'geneva', name: 'Geneva', country: 'Switzerland', region: 'Europe', timeZone: 'Europe/Zurich', flag: '🇨🇭' },
  { id: 'berlin', name: 'Berlin', country: 'Germany', region: 'Europe', timeZone: 'Europe/Berlin', flag: '🇩🇪' },
  { id: 'stockholm', name: 'Stockholm', country: 'Sweden', region: 'Europe', timeZone: 'Europe/Stockholm', flag: '🇸🇪' },
  { id: 'istanbul', name: 'Istanbul', country: 'Turkey', region: 'Europe', timeZone: 'Europe/Istanbul', flag: '🇹🇷' },

  // Africa (4)
  { id: 'cairo', name: 'Cairo', country: 'Egypt', region: 'Africa', timeZone: 'Africa/Cairo', flag: '🇪🇬' },
  { id: 'lagos', name: 'Lagos', country: 'Nigeria', region: 'Africa', timeZone: 'Africa/Lagos', flag: '🇳🇬' },
  { id: 'nairobi', name: 'Nairobi', country: 'Kenya', region: 'Africa', timeZone: 'Africa/Nairobi', flag: '🇰🇪' },
  { id: 'johannesburg', name: 'Johannesburg', country: 'South Africa', region: 'Africa', timeZone: 'Africa/Johannesburg', flag: '🇿🇦' },

  // Middle East (3)
  { id: 'dubai', name: 'Dubai', country: 'United Arab Emirates', region: 'Middle East', timeZone: 'Asia/Dubai', flag: '🇦🇪' },
  { id: 'tel-aviv', name: 'Tel Aviv', country: 'Israel', region: 'Middle East', timeZone: 'Asia/Jerusalem', flag: '🇮🇱' },
  { id: 'tehran', name: 'Tehran', country: 'Iran', region: 'Middle East', timeZone: 'Asia/Tehran', flag: '🇮🇷' },

  // Asia (8)
  { id: 'mumbai', name: 'Mumbai', country: 'India', region: 'Asia', timeZone: 'Asia/Kolkata', flag: '🇮🇳' },
  { id: 'kathmandu', name: 'Kathmandu', country: 'Nepal', region: 'Asia', timeZone: 'Asia/Kathmandu', flag: '🇳🇵' },
  { id: 'bangkok', name: 'Bangkok', country: 'Thailand', region: 'Asia', timeZone: 'Asia/Bangkok', flag: '🇹🇭' },
  { id: 'singapore', name: 'Singapore', country: 'Singapore', region: 'Asia', timeZone: 'Asia/Singapore', flag: '🇸🇬' },
  { id: 'hong-kong', name: 'Hong Kong', country: 'Hong Kong', region: 'Asia', timeZone: 'Asia/Hong_Kong', flag: '🇭🇰' },
  { id: 'denpasar', name: 'Denpasar', country: 'Indonesia', region: 'Asia', timeZone: 'Asia/Makassar', flag: '🇮🇩' },
  { id: 'tokyo', name: 'Tokyo', country: 'Japan', region: 'Asia', timeZone: 'Asia/Tokyo', flag: '🇯🇵' },
  { id: 'seoul', name: 'Seoul', country: 'South Korea', region: 'Asia', timeZone: 'Asia/Seoul', flag: '🇰🇷' },

  // Oceania (2)
  { id: 'sydney', name: 'Sydney', country: 'Australia', region: 'Oceania', timeZone: 'Australia/Sydney', flag: '🇦🇺' },
  { id: 'auckland', name: 'Auckland', country: 'New Zealand', region: 'Oceania', timeZone: 'Pacific/Auckland', flag: '🇳🇿' },
] as const

export const DEFAULT_CITY_IDS = ['san-francisco', 'denpasar', 'geneva']

const CITY_MAP = new Map<string, City>(CITIES.map((c) => [c.id, c]))

export function getCity(id: string): City | undefined {
  return CITY_MAP.get(id)
}

export function searchCities(query: string, excludeIds: readonly string[] = []): City[] {
  const q = query.trim().toLowerCase()
  const excluded = new Set(excludeIds)
  return CITIES.filter((city) => {
    if (excluded.has(city.id)) return false
    if (!q) return true
    return (
      city.name.toLowerCase().includes(q) ||
      city.country.toLowerCase().includes(q) ||
      city.region.toLowerCase().includes(q)
    )
  })
}
