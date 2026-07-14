export interface City {
  id: string
  name: string
  country: string
  timeZone: string
}

/** ~34 cities across major regions; IANA zones only */
export const CITY_CATALOG: City[] = [
  { id: 'sf', name: 'San Francisco', country: 'United States', timeZone: 'America/Los_Angeles' },
  { id: 'nyc', name: 'New York', country: 'United States', timeZone: 'America/New_York' },
  { id: 'chi', name: 'Chicago', country: 'United States', timeZone: 'America/Chicago' },
  { id: 'tor', name: 'Toronto', country: 'Canada', timeZone: 'America/Toronto' },
  { id: 'van', name: 'Vancouver', country: 'Canada', timeZone: 'America/Vancouver' },
  { id: 'mxc', name: 'Mexico City', country: 'Mexico', timeZone: 'America/Mexico_City' },
  { id: 'bog', name: 'Bogotá', country: 'Colombia', timeZone: 'America/Bogota' },
  { id: 'lim', name: 'Lima', country: 'Peru', timeZone: 'America/Lima' },
  { id: 'scl', name: 'Santiago', country: 'Chile', timeZone: 'America/Santiago' },
  { id: 'sao', name: 'São Paulo', country: 'Brazil', timeZone: 'America/Sao_Paulo' },
  { id: 'bue', name: 'Buenos Aires', country: 'Argentina', timeZone: 'America/Argentina/Buenos_Aires' },
  { id: 'lon', name: 'London', country: 'United Kingdom', timeZone: 'Europe/London' },
  { id: 'par', name: 'Paris', country: 'France', timeZone: 'Europe/Paris' },
  { id: 'ber', name: 'Berlin', country: 'Germany', timeZone: 'Europe/Berlin' },
  { id: 'gva', name: 'Geneva', country: 'Switzerland', timeZone: 'Europe/Zurich' },
  { id: 'mad', name: 'Madrid', country: 'Spain', timeZone: 'Europe/Madrid' },
  { id: 'lag', name: 'Lagos', country: 'Nigeria', timeZone: 'Africa/Lagos' },
  { id: 'cai', name: 'Cairo', country: 'Egypt', timeZone: 'Africa/Cairo' },
  { id: 'jnb', name: 'Johannesburg', country: 'South Africa', timeZone: 'Africa/Johannesburg' },
  { id: 'nbo', name: 'Nairobi', country: 'Kenya', timeZone: 'Africa/Nairobi' },
  { id: 'dxb', name: 'Dubai', country: 'United Arab Emirates', timeZone: 'Asia/Dubai' },
  { id: 'tlv', name: 'Tel Aviv', country: 'Israel', timeZone: 'Asia/Jerusalem' },
  { id: 'bom', name: 'Mumbai', country: 'India', timeZone: 'Asia/Kolkata' },
  { id: 'bkk', name: 'Bangkok', country: 'Thailand', timeZone: 'Asia/Bangkok' },
  { id: 'sin', name: 'Singapore', country: 'Singapore', timeZone: 'Asia/Singapore' },
  { id: 'mnl', name: 'Manila', country: 'Philippines', timeZone: 'Asia/Manila' },
  { id: 'jkt', name: 'Jakarta', country: 'Indonesia', timeZone: 'Asia/Jakarta' },
  { id: 'dps', name: 'Denpasar', country: 'Indonesia', timeZone: 'Asia/Makassar' },
  { id: 'hkg', name: 'Hong Kong', country: 'Hong Kong', timeZone: 'Asia/Hong_Kong' },
  { id: 'sha', name: 'Shanghai', country: 'China', timeZone: 'Asia/Shanghai' },
  { id: 'tyo', name: 'Tokyo', country: 'Japan', timeZone: 'Asia/Tokyo' },
  { id: 'sel', name: 'Seoul', country: 'South Korea', timeZone: 'Asia/Seoul' },
  { id: 'syd', name: 'Sydney', country: 'Australia', timeZone: 'Australia/Sydney' },
  { id: 'akl', name: 'Auckland', country: 'New Zealand', timeZone: 'Pacific/Auckland' },
]

const byId = new Map(CITY_CATALOG.map((c) => [c.id, c]))

export function getCityById(id: string): City | undefined {
  return byId.get(id)
}

export const DEFAULT_CITY_IDS = ['sf', 'dps', 'gva'] as const
