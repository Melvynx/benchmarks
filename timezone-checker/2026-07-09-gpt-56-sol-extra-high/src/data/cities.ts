import type { City, PlannerState } from '../types';

export const CITY_CATALOG = [
  { id: 'san-francisco', name: 'San Francisco', country: 'United States', timeZone: 'America/Los_Angeles' },
  { id: 'vancouver', name: 'Vancouver', country: 'Canada', timeZone: 'America/Vancouver' },
  { id: 'denver', name: 'Denver', country: 'United States', timeZone: 'America/Denver' },
  { id: 'chicago', name: 'Chicago', country: 'United States', timeZone: 'America/Chicago' },
  { id: 'new-york', name: 'New York', country: 'United States', timeZone: 'America/New_York' },
  { id: 'mexico-city', name: 'Mexico City', country: 'Mexico', timeZone: 'America/Mexico_City' },
  { id: 'toronto', name: 'Toronto', country: 'Canada', timeZone: 'America/Toronto' },
  { id: 'sao-paulo', name: 'São Paulo', country: 'Brazil', timeZone: 'America/Sao_Paulo' },
  { id: 'buenos-aires', name: 'Buenos Aires', country: 'Argentina', timeZone: 'America/Argentina/Buenos_Aires' },
  { id: 'lima', name: 'Lima', country: 'Peru', timeZone: 'America/Lima' },
  { id: 'london', name: 'London', country: 'United Kingdom', timeZone: 'Europe/London' },
  { id: 'lisbon', name: 'Lisbon', country: 'Portugal', timeZone: 'Europe/Lisbon' },
  { id: 'geneva', name: 'Geneva', country: 'Switzerland', timeZone: 'Europe/Zurich' },
  { id: 'berlin', name: 'Berlin', country: 'Germany', timeZone: 'Europe/Berlin' },
  { id: 'helsinki', name: 'Helsinki', country: 'Finland', timeZone: 'Europe/Helsinki' },
  { id: 'kyiv', name: 'Kyiv', country: 'Ukraine', timeZone: 'Europe/Kyiv' },
  { id: 'casablanca', name: 'Casablanca', country: 'Morocco', timeZone: 'Africa/Casablanca' },
  { id: 'lagos', name: 'Lagos', country: 'Nigeria', timeZone: 'Africa/Lagos' },
  { id: 'cairo', name: 'Cairo', country: 'Egypt', timeZone: 'Africa/Cairo' },
  { id: 'nairobi', name: 'Nairobi', country: 'Kenya', timeZone: 'Africa/Nairobi' },
  { id: 'cape-town', name: 'Cape Town', country: 'South Africa', timeZone: 'Africa/Johannesburg' },
  { id: 'dubai', name: 'Dubai', country: 'United Arab Emirates', timeZone: 'Asia/Dubai' },
  { id: 'tel-aviv', name: 'Tel Aviv', country: 'Israel', timeZone: 'Asia/Jerusalem' },
  { id: 'mumbai', name: 'Mumbai', country: 'India', timeZone: 'Asia/Kolkata' },
  { id: 'kathmandu', name: 'Kathmandu', country: 'Nepal', timeZone: 'Asia/Kathmandu' },
  { id: 'bangkok', name: 'Bangkok', country: 'Thailand', timeZone: 'Asia/Bangkok' },
  { id: 'denpasar', name: 'Denpasar', country: 'Indonesia', timeZone: 'Asia/Makassar' },
  { id: 'singapore', name: 'Singapore', country: 'Singapore', timeZone: 'Asia/Singapore' },
  { id: 'hong-kong', name: 'Hong Kong', country: 'Hong Kong', timeZone: 'Asia/Hong_Kong' },
  { id: 'tokyo', name: 'Tokyo', country: 'Japan', timeZone: 'Asia/Tokyo' },
  { id: 'seoul', name: 'Seoul', country: 'South Korea', timeZone: 'Asia/Seoul' },
  { id: 'perth', name: 'Perth', country: 'Australia', timeZone: 'Australia/Perth' },
  { id: 'sydney', name: 'Sydney', country: 'Australia', timeZone: 'Australia/Sydney' },
  { id: 'auckland', name: 'Auckland', country: 'New Zealand', timeZone: 'Pacific/Auckland' },
  { id: 'honolulu', name: 'Honolulu', country: 'United States', timeZone: 'Pacific/Honolulu' },
] as const satisfies readonly City[];

export const CITY_BY_ID = new Map<string, City>(
  CITY_CATALOG.map((city) => [city.id, city]),
);

export const DEFAULT_STATE: PlannerState = {
  cityIds: ['san-francisco', 'denpasar', 'geneva'],
  mode: 'meeting',
  wakeHour: 7,
  sleepHour: 23,
  timeFormat: '12h',
};
