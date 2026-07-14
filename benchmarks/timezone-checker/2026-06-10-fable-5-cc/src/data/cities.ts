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
  timeZone: string;
  region: Region;
}

export const CITIES: City[] = [
  // North America
  { id: 'san-francisco', name: 'San Francisco', country: 'United States', timeZone: 'America/Los_Angeles', region: 'North America' },
  { id: 'denver', name: 'Denver', country: 'United States', timeZone: 'America/Denver', region: 'North America' },
  { id: 'chicago', name: 'Chicago', country: 'United States', timeZone: 'America/Chicago', region: 'North America' },
  { id: 'new-york', name: 'New York', country: 'United States', timeZone: 'America/New_York', region: 'North America' },
  { id: 'toronto', name: 'Toronto', country: 'Canada', timeZone: 'America/Toronto', region: 'North America' },
  { id: 'mexico-city', name: 'Mexico City', country: 'Mexico', timeZone: 'America/Mexico_City', region: 'North America' },

  // South America
  { id: 'bogota', name: 'Bogotá', country: 'Colombia', timeZone: 'America/Bogota', region: 'South America' },
  { id: 'santiago', name: 'Santiago', country: 'Chile', timeZone: 'America/Santiago', region: 'South America' },
  { id: 'sao-paulo', name: 'São Paulo', country: 'Brazil', timeZone: 'America/Sao_Paulo', region: 'South America' },
  { id: 'buenos-aires', name: 'Buenos Aires', country: 'Argentina', timeZone: 'America/Argentina/Buenos_Aires', region: 'South America' },

  // Europe
  { id: 'lisbon', name: 'Lisbon', country: 'Portugal', timeZone: 'Europe/Lisbon', region: 'Europe' },
  { id: 'london', name: 'London', country: 'United Kingdom', timeZone: 'Europe/London', region: 'Europe' },
  { id: 'paris', name: 'Paris', country: 'France', timeZone: 'Europe/Paris', region: 'Europe' },
  { id: 'geneva', name: 'Geneva', country: 'Switzerland', timeZone: 'Europe/Zurich', region: 'Europe' },
  { id: 'berlin', name: 'Berlin', country: 'Germany', timeZone: 'Europe/Berlin', region: 'Europe' },
  { id: 'athens', name: 'Athens', country: 'Greece', timeZone: 'Europe/Athens', region: 'Europe' },
  { id: 'moscow', name: 'Moscow', country: 'Russia', timeZone: 'Europe/Moscow', region: 'Europe' },

  // Africa
  { id: 'lagos', name: 'Lagos', country: 'Nigeria', timeZone: 'Africa/Lagos', region: 'Africa' },
  { id: 'cairo', name: 'Cairo', country: 'Egypt', timeZone: 'Africa/Cairo', region: 'Africa' },
  { id: 'nairobi', name: 'Nairobi', country: 'Kenya', timeZone: 'Africa/Nairobi', region: 'Africa' },
  { id: 'johannesburg', name: 'Johannesburg', country: 'South Africa', timeZone: 'Africa/Johannesburg', region: 'Africa' },

  // Middle East
  { id: 'istanbul', name: 'Istanbul', country: 'Türkiye', timeZone: 'Europe/Istanbul', region: 'Middle East' },
  { id: 'tel-aviv', name: 'Tel Aviv', country: 'Israel', timeZone: 'Asia/Jerusalem', region: 'Middle East' },
  { id: 'dubai', name: 'Dubai', country: 'United Arab Emirates', timeZone: 'Asia/Dubai', region: 'Middle East' },

  // Asia
  { id: 'mumbai', name: 'Mumbai', country: 'India', timeZone: 'Asia/Kolkata', region: 'Asia' },
  { id: 'kathmandu', name: 'Kathmandu', country: 'Nepal', timeZone: 'Asia/Kathmandu', region: 'Asia' },
  { id: 'bangkok', name: 'Bangkok', country: 'Thailand', timeZone: 'Asia/Bangkok', region: 'Asia' },
  { id: 'singapore', name: 'Singapore', country: 'Singapore', timeZone: 'Asia/Singapore', region: 'Asia' },
  { id: 'hong-kong', name: 'Hong Kong', country: 'Hong Kong SAR', timeZone: 'Asia/Hong_Kong', region: 'Asia' },
  { id: 'denpasar', name: 'Denpasar', country: 'Indonesia', timeZone: 'Asia/Makassar', region: 'Asia' },
  { id: 'tokyo', name: 'Tokyo', country: 'Japan', timeZone: 'Asia/Tokyo', region: 'Asia' },
  { id: 'seoul', name: 'Seoul', country: 'South Korea', timeZone: 'Asia/Seoul', region: 'Asia' },

  // Oceania
  { id: 'sydney', name: 'Sydney', country: 'Australia', timeZone: 'Australia/Sydney', region: 'Oceania' },
  { id: 'auckland', name: 'Auckland', country: 'New Zealand', timeZone: 'Pacific/Auckland', region: 'Oceania' },
];

export const CITY_BY_ID: ReadonlyMap<string, City> = new Map(CITIES.map((city) => [city.id, city]));

export const DEFAULT_CITY_IDS = ['san-francisco', 'denpasar', 'geneva'];
