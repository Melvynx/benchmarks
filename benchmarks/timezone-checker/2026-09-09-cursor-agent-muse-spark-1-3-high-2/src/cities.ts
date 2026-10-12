export interface City {
  id: string;
  name: string;
  country: string;
  region: string;
  timeZone: string;
}

export const CITY_CATALOG: City[] = [
  // North America
  { id: 'san-francisco', name: 'San Francisco', country: 'United States', region: 'North America', timeZone: 'America/Los_Angeles' },
  { id: 'new-york', name: 'New York', country: 'United States', region: 'North America', timeZone: 'America/New_York' },
  { id: 'mexico-city', name: 'Mexico City', country: 'Mexico', region: 'North America', timeZone: 'America/Mexico_City' },
  { id: 'toronto', name: 'Toronto', country: 'Canada', region: 'North America', timeZone: 'America/Toronto' },
  { id: 'honolulu', name: 'Honolulu', country: 'United States', region: 'North America', timeZone: 'Pacific/Honolulu' },
  // South America
  { id: 'sao-paulo', name: 'São Paulo', country: 'Brazil', region: 'South America', timeZone: 'America/Sao_Paulo' },
  { id: 'buenos-aires', name: 'Buenos Aires', country: 'Argentina', region: 'South America', timeZone: 'America/Argentina/Buenos_Aires' },
  { id: 'bogota', name: 'Bogotá', country: 'Colombia', region: 'South America', timeZone: 'America/Bogota' },
  { id: 'santiago', name: 'Santiago', country: 'Chile', region: 'South America', timeZone: 'America/Santiago' },
  // Europe
  { id: 'london', name: 'London', country: 'United Kingdom', region: 'Europe', timeZone: 'Europe/London' },
  { id: 'geneva', name: 'Geneva', country: 'Switzerland', region: 'Europe', timeZone: 'Europe/Zurich' },
  { id: 'paris', name: 'Paris', country: 'France', region: 'Europe', timeZone: 'Europe/Paris' },
  { id: 'berlin', name: 'Berlin', country: 'Germany', region: 'Europe', timeZone: 'Europe/Berlin' },
  { id: 'moscow', name: 'Moscow', country: 'Russia', region: 'Europe', timeZone: 'Europe/Moscow' },
  { id: 'reykjavik', name: 'Reykjavik', country: 'Iceland', region: 'Europe', timeZone: 'Atlantic/Reykjavik' },
  // Africa
  { id: 'cairo', name: 'Cairo', country: 'Egypt', region: 'Africa', timeZone: 'Africa/Cairo' },
  { id: 'lagos', name: 'Lagos', country: 'Nigeria', region: 'Africa', timeZone: 'Africa/Lagos' },
  { id: 'nairobi', name: 'Nairobi', country: 'Kenya', region: 'Africa', timeZone: 'Africa/Nairobi' },
  { id: 'cape-town', name: 'Cape Town', country: 'South Africa', region: 'Africa', timeZone: 'Africa/Johannesburg' },
  // Middle East
  { id: 'dubai', name: 'Dubai', country: 'UAE', region: 'Middle East', timeZone: 'Asia/Dubai' },
  { id: 'riyadh', name: 'Riyadh', country: 'Saudi Arabia', region: 'Middle East', timeZone: 'Asia/Riyadh' },
  { id: 'tel-aviv', name: 'Tel Aviv', country: 'Israel', region: 'Middle East', timeZone: 'Asia/Jerusalem' },
  { id: 'tehran', name: 'Tehran', country: 'Iran', region: 'Middle East', timeZone: 'Asia/Tehran' },
  // Asia
  { id: 'mumbai', name: 'Mumbai', country: 'India', region: 'Asia', timeZone: 'Asia/Kolkata' },
  { id: 'kathmandu', name: 'Kathmandu', country: 'Nepal', region: 'Asia', timeZone: 'Asia/Kathmandu' },
  { id: 'bangkok', name: 'Bangkok', country: 'Thailand', region: 'Asia', timeZone: 'Asia/Bangkok' },
  { id: 'singapore', name: 'Singapore', country: 'Singapore', region: 'Asia', timeZone: 'Asia/Singapore' },
  { id: 'hong-kong', name: 'Hong Kong', country: 'Hong Kong', region: 'Asia', timeZone: 'Asia/Hong_Kong' },
  { id: 'shanghai', name: 'Shanghai', country: 'China', region: 'Asia', timeZone: 'Asia/Shanghai' },
  { id: 'tokyo', name: 'Tokyo', country: 'Japan', region: 'Asia', timeZone: 'Asia/Tokyo' },
  { id: 'seoul', name: 'Seoul', country: 'South Korea', region: 'Asia', timeZone: 'Asia/Seoul' },
  { id: 'denpasar', name: 'Denpasar', country: 'Indonesia', region: 'Asia', timeZone: 'Asia/Makassar' },
  // Oceania
  { id: 'sydney', name: 'Sydney', country: 'Australia', region: 'Oceania', timeZone: 'Australia/Sydney' },
  { id: 'auckland', name: 'Auckland', country: 'New Zealand', region: 'Oceania', timeZone: 'Pacific/Auckland' },
];

export const CITY_BY_ID: Record<string, City> = Object.fromEntries(
  CITY_CATALOG.map((c) => [c.id, c]),
);

export const DEFAULT_CITY_IDS = ['san-francisco', 'denpasar', 'geneva'];
