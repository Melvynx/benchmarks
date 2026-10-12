export const REGIONS = [
  'North America',
  'South America',
  'Europe',
  'Africa',
  'Middle East',
  'Asia',
  'Oceania',
] as const;

export type Region = (typeof REGIONS)[number];

export interface City {
  readonly id: string;
  readonly name: string;
  readonly country: string;
  readonly countryCode: string;
  readonly region: Region;
  /** IANA timezone identifier. */
  readonly timeZone: string;
  /** Extra search terms: nicknames, local spellings, country abbreviations. */
  readonly aliases: readonly string[];
}

const USA = ['USA', 'America'];

export const CITIES: readonly City[] = [
  // North America
  { id: 'san-francisco', name: 'San Francisco', country: 'United States', countryCode: 'US', region: 'North America', timeZone: 'America/Los_Angeles', aliases: ['SF', 'Bay Area', 'Silicon Valley', 'Pacific', ...USA] },
  { id: 'denver', name: 'Denver', country: 'United States', countryCode: 'US', region: 'North America', timeZone: 'America/Denver', aliases: ['Mountain', ...USA] },
  { id: 'chicago', name: 'Chicago', country: 'United States', countryCode: 'US', region: 'North America', timeZone: 'America/Chicago', aliases: ['Central', ...USA] },
  { id: 'new-york', name: 'New York', country: 'United States', countryCode: 'US', region: 'North America', timeZone: 'America/New_York', aliases: ['NYC', 'Eastern', ...USA] },
  { id: 'toronto', name: 'Toronto', country: 'Canada', countryCode: 'CA', region: 'North America', timeZone: 'America/Toronto', aliases: [] },
  { id: 'mexico-city', name: 'Mexico City', country: 'Mexico', countryCode: 'MX', region: 'North America', timeZone: 'America/Mexico_City', aliases: ['CDMX'] },
  { id: 'honolulu', name: 'Honolulu', country: 'United States', countryCode: 'US', region: 'North America', timeZone: 'Pacific/Honolulu', aliases: ['Hawaii', ...USA] },

  // South America
  { id: 'bogota', name: 'Bogotá', country: 'Colombia', countryCode: 'CO', region: 'South America', timeZone: 'America/Bogota', aliases: [] },
  { id: 'santiago', name: 'Santiago', country: 'Chile', countryCode: 'CL', region: 'South America', timeZone: 'America/Santiago', aliases: [] },
  { id: 'sao-paulo', name: 'São Paulo', country: 'Brazil', countryCode: 'BR', region: 'South America', timeZone: 'America/Sao_Paulo', aliases: ['Brasil'] },
  { id: 'buenos-aires', name: 'Buenos Aires', country: 'Argentina', countryCode: 'AR', region: 'South America', timeZone: 'America/Argentina/Buenos_Aires', aliases: [] },

  // Europe
  { id: 'london', name: 'London', country: 'United Kingdom', countryCode: 'GB', region: 'Europe', timeZone: 'Europe/London', aliases: ['UK', 'England', 'Britain'] },
  { id: 'lisbon', name: 'Lisbon', country: 'Portugal', countryCode: 'PT', region: 'Europe', timeZone: 'Europe/Lisbon', aliases: ['Lisboa'] },
  { id: 'paris', name: 'Paris', country: 'France', countryCode: 'FR', region: 'Europe', timeZone: 'Europe/Paris', aliases: [] },
  { id: 'berlin', name: 'Berlin', country: 'Germany', countryCode: 'DE', region: 'Europe', timeZone: 'Europe/Berlin', aliases: ['Deutschland'] },
  { id: 'geneva', name: 'Geneva', country: 'Switzerland', countryCode: 'CH', region: 'Europe', timeZone: 'Europe/Zurich', aliases: ['Genève', 'Suisse', 'Schweiz'] },
  { id: 'istanbul', name: 'Istanbul', country: 'Turkey', countryCode: 'TR', region: 'Europe', timeZone: 'Europe/Istanbul', aliases: ['Türkiye'] },
  { id: 'moscow', name: 'Moscow', country: 'Russia', countryCode: 'RU', region: 'Europe', timeZone: 'Europe/Moscow', aliases: [] },

  // Africa
  { id: 'lagos', name: 'Lagos', country: 'Nigeria', countryCode: 'NG', region: 'Africa', timeZone: 'Africa/Lagos', aliases: [] },
  { id: 'cairo', name: 'Cairo', country: 'Egypt', countryCode: 'EG', region: 'Africa', timeZone: 'Africa/Cairo', aliases: [] },
  { id: 'nairobi', name: 'Nairobi', country: 'Kenya', countryCode: 'KE', region: 'Africa', timeZone: 'Africa/Nairobi', aliases: [] },
  { id: 'johannesburg', name: 'Johannesburg', country: 'South Africa', countryCode: 'ZA', region: 'Africa', timeZone: 'Africa/Johannesburg', aliases: ['Joburg'] },

  // Middle East
  { id: 'tel-aviv', name: 'Tel Aviv', country: 'Israel', countryCode: 'IL', region: 'Middle East', timeZone: 'Asia/Jerusalem', aliases: [] },
  { id: 'dubai', name: 'Dubai', country: 'United Arab Emirates', countryCode: 'AE', region: 'Middle East', timeZone: 'Asia/Dubai', aliases: ['UAE'] },
  { id: 'tehran', name: 'Tehran', country: 'Iran', countryCode: 'IR', region: 'Middle East', timeZone: 'Asia/Tehran', aliases: [] },

  // Asia
  { id: 'mumbai', name: 'Mumbai', country: 'India', countryCode: 'IN', region: 'Asia', timeZone: 'Asia/Kolkata', aliases: ['Bombay'] },
  { id: 'kathmandu', name: 'Kathmandu', country: 'Nepal', countryCode: 'NP', region: 'Asia', timeZone: 'Asia/Kathmandu', aliases: [] },
  { id: 'bangkok', name: 'Bangkok', country: 'Thailand', countryCode: 'TH', region: 'Asia', timeZone: 'Asia/Bangkok', aliases: [] },
  { id: 'singapore', name: 'Singapore', country: 'Singapore', countryCode: 'SG', region: 'Asia', timeZone: 'Asia/Singapore', aliases: [] },
  { id: 'denpasar', name: 'Denpasar', country: 'Indonesia', countryCode: 'ID', region: 'Asia', timeZone: 'Asia/Makassar', aliases: ['Bali'] },
  { id: 'tokyo', name: 'Tokyo', country: 'Japan', countryCode: 'JP', region: 'Asia', timeZone: 'Asia/Tokyo', aliases: [] },
  { id: 'seoul', name: 'Seoul', country: 'South Korea', countryCode: 'KR', region: 'Asia', timeZone: 'Asia/Seoul', aliases: ['Korea'] },

  // Oceania
  { id: 'sydney', name: 'Sydney', country: 'Australia', countryCode: 'AU', region: 'Oceania', timeZone: 'Australia/Sydney', aliases: [] },
  { id: 'auckland', name: 'Auckland', country: 'New Zealand', countryCode: 'NZ', region: 'Oceania', timeZone: 'Pacific/Auckland', aliases: ['NZ'] },
];

const CITY_BY_ID: ReadonlyMap<string, City> = new Map(CITIES.map((city) => [city.id, city]));

export const DEFAULT_CITY_IDS: readonly string[] = ['san-francisco', 'denpasar', 'geneva'];

export function getCity(id: string): City | undefined {
  return CITY_BY_ID.get(id);
}

export function isKnownCity(id: unknown): id is string {
  return typeof id === 'string' && CITY_BY_ID.has(id);
}

export function resolveCities(ids: readonly string[]): City[] {
  return ids.map(getCity).filter((city): city is City => city !== undefined);
}
