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

export type City = {
  id: string;
  city: string;
  country: string;
  region: Region;
  timeZone: string;
};

export const CITIES: readonly City[] = [
  { id: 'san-francisco', city: 'San Francisco', country: 'United States', region: 'North America', timeZone: 'America/Los_Angeles' },
  { id: 'new-york', city: 'New York', country: 'United States', region: 'North America', timeZone: 'America/New_York' },
  { id: 'chicago', city: 'Chicago', country: 'United States', region: 'North America', timeZone: 'America/Chicago' },
  { id: 'denver', city: 'Denver', country: 'United States', region: 'North America', timeZone: 'America/Denver' },
  { id: 'toronto', city: 'Toronto', country: 'Canada', region: 'North America', timeZone: 'America/Toronto' },
  { id: 'mexico-city', city: 'Mexico City', country: 'Mexico', region: 'North America', timeZone: 'America/Mexico_City' },
  { id: 'sao-paulo', city: 'São Paulo', country: 'Brazil', region: 'South America', timeZone: 'America/Sao_Paulo' },
  { id: 'buenos-aires', city: 'Buenos Aires', country: 'Argentina', region: 'South America', timeZone: 'America/Argentina/Buenos_Aires' },
  { id: 'bogota', city: 'Bogotá', country: 'Colombia', region: 'South America', timeZone: 'America/Bogota' },
  { id: 'santiago', city: 'Santiago', country: 'Chile', region: 'South America', timeZone: 'America/Santiago' },
  { id: 'london', city: 'London', country: 'United Kingdom', region: 'Europe', timeZone: 'Europe/London' },
  { id: 'paris', city: 'Paris', country: 'France', region: 'Europe', timeZone: 'Europe/Paris' },
  { id: 'geneva', city: 'Geneva', country: 'Switzerland', region: 'Europe', timeZone: 'Europe/Zurich' },
  { id: 'berlin', city: 'Berlin', country: 'Germany', region: 'Europe', timeZone: 'Europe/Berlin' },
  { id: 'amsterdam', city: 'Amsterdam', country: 'Netherlands', region: 'Europe', timeZone: 'Europe/Amsterdam' },
  { id: 'madrid', city: 'Madrid', country: 'Spain', region: 'Europe', timeZone: 'Europe/Madrid' },
  { id: 'stockholm', city: 'Stockholm', country: 'Sweden', region: 'Europe', timeZone: 'Europe/Stockholm' },
  { id: 'cairo', city: 'Cairo', country: 'Egypt', region: 'Africa', timeZone: 'Africa/Cairo' },
  { id: 'lagos', city: 'Lagos', country: 'Nigeria', region: 'Africa', timeZone: 'Africa/Lagos' },
  { id: 'johannesburg', city: 'Johannesburg', country: 'South Africa', region: 'Africa', timeZone: 'Africa/Johannesburg' },
  { id: 'nairobi', city: 'Nairobi', country: 'Kenya', region: 'Africa', timeZone: 'Africa/Nairobi' },
  { id: 'dubai', city: 'Dubai', country: 'United Arab Emirates', region: 'Middle East', timeZone: 'Asia/Dubai' },
  { id: 'tel-aviv', city: 'Tel Aviv', country: 'Israel', region: 'Middle East', timeZone: 'Asia/Jerusalem' },
  { id: 'riyadh', city: 'Riyadh', country: 'Saudi Arabia', region: 'Middle East', timeZone: 'Asia/Riyadh' },
  { id: 'mumbai', city: 'Mumbai', country: 'India', region: 'Asia', timeZone: 'Asia/Kolkata' },
  { id: 'kathmandu', city: 'Kathmandu', country: 'Nepal', region: 'Asia', timeZone: 'Asia/Kathmandu' },
  { id: 'bangkok', city: 'Bangkok', country: 'Thailand', region: 'Asia', timeZone: 'Asia/Bangkok' },
  { id: 'singapore', city: 'Singapore', country: 'Singapore', region: 'Asia', timeZone: 'Asia/Singapore' },
  { id: 'hong-kong', city: 'Hong Kong', country: 'Hong Kong', region: 'Asia', timeZone: 'Asia/Hong_Kong' },
  { id: 'tokyo', city: 'Tokyo', country: 'Japan', region: 'Asia', timeZone: 'Asia/Tokyo' },
  { id: 'shanghai', city: 'Shanghai', country: 'China', region: 'Asia', timeZone: 'Asia/Shanghai' },
  { id: 'denpasar', city: 'Denpasar', country: 'Indonesia', region: 'Asia', timeZone: 'Asia/Makassar' },
  { id: 'sydney', city: 'Sydney', country: 'Australia', region: 'Oceania', timeZone: 'Australia/Sydney' },
  { id: 'auckland', city: 'Auckland', country: 'New Zealand', region: 'Oceania', timeZone: 'Pacific/Auckland' },
];

export const CITY_BY_ID = new Map(CITIES.map((city) => [city.id, city]));

export const DEFAULT_CITY_IDS = ['san-francisco', 'denpasar', 'geneva'] as const;
