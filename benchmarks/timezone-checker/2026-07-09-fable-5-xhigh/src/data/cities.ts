import type { City } from '../types';

/**
 * Predefined catalog — 34 cities across all major world regions.
 * Ordered by region, then alphabetically; the picker relies on this order
 * to render its region groups.
 */
export const CITIES: City[] = [
  // North America
  { id: 'chicago', name: 'Chicago', country: 'United States', region: 'North America', timeZone: 'America/Chicago' },
  { id: 'denver', name: 'Denver', country: 'United States', region: 'North America', timeZone: 'America/Denver' },
  { id: 'mexico-city', name: 'Mexico City', country: 'Mexico', region: 'North America', timeZone: 'America/Mexico_City' },
  { id: 'new-york', name: 'New York', country: 'United States', region: 'North America', timeZone: 'America/New_York' },
  { id: 'san-francisco', name: 'San Francisco', country: 'United States', region: 'North America', timeZone: 'America/Los_Angeles' },
  { id: 'toronto', name: 'Toronto', country: 'Canada', region: 'North America', timeZone: 'America/Toronto' },

  // South America
  { id: 'bogota', name: 'Bogotá', country: 'Colombia', region: 'South America', timeZone: 'America/Bogota' },
  { id: 'buenos-aires', name: 'Buenos Aires', country: 'Argentina', region: 'South America', timeZone: 'America/Argentina/Buenos_Aires' },
  { id: 'lima', name: 'Lima', country: 'Peru', region: 'South America', timeZone: 'America/Lima' },
  { id: 'sao-paulo', name: 'São Paulo', country: 'Brazil', region: 'South America', timeZone: 'America/Sao_Paulo' },

  // Europe
  { id: 'athens', name: 'Athens', country: 'Greece', region: 'Europe', timeZone: 'Europe/Athens' },
  { id: 'berlin', name: 'Berlin', country: 'Germany', region: 'Europe', timeZone: 'Europe/Berlin' },
  { id: 'geneva', name: 'Geneva', country: 'Switzerland', region: 'Europe', timeZone: 'Europe/Zurich' },
  { id: 'lisbon', name: 'Lisbon', country: 'Portugal', region: 'Europe', timeZone: 'Europe/Lisbon' },
  { id: 'london', name: 'London', country: 'United Kingdom', region: 'Europe', timeZone: 'Europe/London' },
  { id: 'paris', name: 'Paris', country: 'France', region: 'Europe', timeZone: 'Europe/Paris' },

  // Africa
  { id: 'cairo', name: 'Cairo', country: 'Egypt', region: 'Africa', timeZone: 'Africa/Cairo' },
  { id: 'cape-town', name: 'Cape Town', country: 'South Africa', region: 'Africa', timeZone: 'Africa/Johannesburg' },
  { id: 'lagos', name: 'Lagos', country: 'Nigeria', region: 'Africa', timeZone: 'Africa/Lagos' },
  { id: 'nairobi', name: 'Nairobi', country: 'Kenya', region: 'Africa', timeZone: 'Africa/Nairobi' },

  // Middle East
  { id: 'dubai', name: 'Dubai', country: 'United Arab Emirates', region: 'Middle East', timeZone: 'Asia/Dubai' },
  { id: 'istanbul', name: 'Istanbul', country: 'Türkiye', region: 'Middle East', timeZone: 'Europe/Istanbul' },
  { id: 'tel-aviv', name: 'Tel Aviv', country: 'Israel', region: 'Middle East', timeZone: 'Asia/Jerusalem' },

  // Asia
  { id: 'bangkok', name: 'Bangkok', country: 'Thailand', region: 'Asia', timeZone: 'Asia/Bangkok' },
  { id: 'denpasar', name: 'Denpasar', country: 'Indonesia', region: 'Asia', timeZone: 'Asia/Makassar' },
  { id: 'kathmandu', name: 'Kathmandu', country: 'Nepal', region: 'Asia', timeZone: 'Asia/Kathmandu' },
  { id: 'mumbai', name: 'Mumbai', country: 'India', region: 'Asia', timeZone: 'Asia/Kolkata' },
  { id: 'seoul', name: 'Seoul', country: 'South Korea', region: 'Asia', timeZone: 'Asia/Seoul' },
  { id: 'shanghai', name: 'Shanghai', country: 'China', region: 'Asia', timeZone: 'Asia/Shanghai' },
  { id: 'singapore', name: 'Singapore', country: 'Singapore', region: 'Asia', timeZone: 'Asia/Singapore' },
  { id: 'tokyo', name: 'Tokyo', country: 'Japan', region: 'Asia', timeZone: 'Asia/Tokyo' },

  // Oceania
  { id: 'adelaide', name: 'Adelaide', country: 'Australia', region: 'Oceania', timeZone: 'Australia/Adelaide' },
  { id: 'auckland', name: 'Auckland', country: 'New Zealand', region: 'Oceania', timeZone: 'Pacific/Auckland' },
  { id: 'sydney', name: 'Sydney', country: 'Australia', region: 'Oceania', timeZone: 'Australia/Sydney' },
];

export const CITY_BY_ID = new Map<string, City>(CITIES.map((city) => [city.id, city]));

export const DEFAULT_CITY_IDS = ['san-francisco', 'denpasar', 'geneva'];
