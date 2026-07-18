export type Region =
  | 'North America'
  | 'South America'
  | 'Europe'
  | 'Africa'
  | 'Middle East'
  | 'Asia'
  | 'Oceania';

export interface City {
  id: string;
  name: string;
  country: string;
  /** IANA timezone identifier */
  tz: string;
  region: Region;
  /** Alternative names users might search for */
  aka?: string[];
}

/**
 * Predefined catalog spanning every major world region.
 * Ordered by region (group order in the picker), then roughly west → east.
 */
export const CITIES: City[] = [
  // North America
  { id: 'honolulu', name: 'Honolulu', country: 'United States', tz: 'Pacific/Honolulu', region: 'North America' },
  { id: 'san-francisco', name: 'San Francisco', country: 'United States', tz: 'America/Los_Angeles', region: 'North America' },
  { id: 'vancouver', name: 'Vancouver', country: 'Canada', tz: 'America/Vancouver', region: 'North America' },
  { id: 'chicago', name: 'Chicago', country: 'United States', tz: 'America/Chicago', region: 'North America' },
  { id: 'mexico-city', name: 'Mexico City', country: 'Mexico', tz: 'America/Mexico_City', region: 'North America' },
  { id: 'new-york', name: 'New York', country: 'United States', tz: 'America/New_York', region: 'North America' },
  // South America
  { id: 'bogota', name: 'Bogotá', country: 'Colombia', tz: 'America/Bogota', region: 'South America' },
  { id: 'santiago', name: 'Santiago', country: 'Chile', tz: 'America/Santiago', region: 'South America' },
  { id: 'sao-paulo', name: 'São Paulo', country: 'Brazil', tz: 'America/Sao_Paulo', region: 'South America' },
  { id: 'buenos-aires', name: 'Buenos Aires', country: 'Argentina', tz: 'America/Argentina/Buenos_Aires', region: 'South America' },
  // Europe
  { id: 'london', name: 'London', country: 'United Kingdom', tz: 'Europe/London', region: 'Europe' },
  { id: 'lisbon', name: 'Lisbon', country: 'Portugal', tz: 'Europe/Lisbon', region: 'Europe' },
  { id: 'paris', name: 'Paris', country: 'France', tz: 'Europe/Paris', region: 'Europe' },
  { id: 'geneva', name: 'Geneva', country: 'Switzerland', tz: 'Europe/Zurich', region: 'Europe' },
  { id: 'berlin', name: 'Berlin', country: 'Germany', tz: 'Europe/Berlin', region: 'Europe' },
  { id: 'madrid', name: 'Madrid', country: 'Spain', tz: 'Europe/Madrid', region: 'Europe' },
  { id: 'athens', name: 'Athens', country: 'Greece', tz: 'Europe/Athens', region: 'Europe' },
  { id: 'kyiv', name: 'Kyiv', country: 'Ukraine', tz: 'Europe/Kyiv', region: 'Europe' },
  { id: 'moscow', name: 'Moscow', country: 'Russia', tz: 'Europe/Moscow', region: 'Europe' },
  { id: 'istanbul', name: 'Istanbul', country: 'Türkiye', tz: 'Europe/Istanbul', region: 'Europe' },
  // Africa
  { id: 'casablanca', name: 'Casablanca', country: 'Morocco', tz: 'Africa/Casablanca', region: 'Africa' },
  { id: 'lagos', name: 'Lagos', country: 'Nigeria', tz: 'Africa/Lagos', region: 'Africa' },
  { id: 'cairo', name: 'Cairo', country: 'Egypt', tz: 'Africa/Cairo', region: 'Africa' },
  { id: 'nairobi', name: 'Nairobi', country: 'Kenya', tz: 'Africa/Nairobi', region: 'Africa' },
  { id: 'johannesburg', name: 'Johannesburg', country: 'South Africa', tz: 'Africa/Johannesburg', region: 'Africa' },
  // Middle East
  { id: 'tel-aviv', name: 'Tel Aviv', country: 'Israel', tz: 'Asia/Jerusalem', region: 'Middle East' },
  { id: 'riyadh', name: 'Riyadh', country: 'Saudi Arabia', tz: 'Asia/Riyadh', region: 'Middle East' },
  { id: 'dubai', name: 'Dubai', country: 'United Arab Emirates', tz: 'Asia/Dubai', region: 'Middle East' },
  { id: 'tehran', name: 'Tehran', country: 'Iran', tz: 'Asia/Tehran', region: 'Middle East' },
  // Asia
  { id: 'karachi', name: 'Karachi', country: 'Pakistan', tz: 'Asia/Karachi', region: 'Asia' },
  { id: 'mumbai', name: 'Mumbai', country: 'India', tz: 'Asia/Kolkata', region: 'Asia' },
  { id: 'kathmandu', name: 'Kathmandu', country: 'Nepal', tz: 'Asia/Kathmandu', region: 'Asia' },
  { id: 'dhaka', name: 'Dhaka', country: 'Bangladesh', tz: 'Asia/Dhaka', region: 'Asia' },
  { id: 'bangkok', name: 'Bangkok', country: 'Thailand', tz: 'Asia/Bangkok', region: 'Asia' },
  { id: 'jakarta', name: 'Jakarta', country: 'Indonesia', tz: 'Asia/Jakarta', region: 'Asia' },
  { id: 'denpasar', name: 'Denpasar', country: 'Indonesia', tz: 'Asia/Makassar', region: 'Asia', aka: ['Bali'] },
  { id: 'singapore', name: 'Singapore', country: 'Singapore', tz: 'Asia/Singapore', region: 'Asia' },
  { id: 'hong-kong', name: 'Hong Kong', country: 'Hong Kong', tz: 'Asia/Hong_Kong', region: 'Asia' },
  { id: 'shanghai', name: 'Shanghai', country: 'China', tz: 'Asia/Shanghai', region: 'Asia' },
  { id: 'seoul', name: 'Seoul', country: 'South Korea', tz: 'Asia/Seoul', region: 'Asia' },
  { id: 'tokyo', name: 'Tokyo', country: 'Japan', tz: 'Asia/Tokyo', region: 'Asia' },
  // Oceania
  { id: 'perth', name: 'Perth', country: 'Australia', tz: 'Australia/Perth', region: 'Oceania' },
  { id: 'adelaide', name: 'Adelaide', country: 'Australia', tz: 'Australia/Adelaide', region: 'Oceania' },
  { id: 'sydney', name: 'Sydney', country: 'Australia', tz: 'Australia/Sydney', region: 'Oceania' },
  { id: 'auckland', name: 'Auckland', country: 'New Zealand', tz: 'Pacific/Auckland', region: 'Oceania' },
];

export const CITY_BY_ID: ReadonlyMap<string, City> = new Map(CITIES.map((c) => [c.id, c]));

export const DEFAULT_CITY_IDS: string[] = ['san-francisco', 'denpasar', 'geneva'];
