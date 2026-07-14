import type { City } from '../types';

export const CITIES = [
  { id: 'san-francisco', name: 'San Francisco', country: 'United States', countryCode: 'US', timeZone: 'America/Los_Angeles' },
  { id: 'new-york', name: 'New York', country: 'United States', countryCode: 'US', timeZone: 'America/New_York' },
  { id: 'vancouver', name: 'Vancouver', country: 'Canada', countryCode: 'CA', timeZone: 'America/Vancouver' },
  { id: 'toronto', name: 'Toronto', country: 'Canada', countryCode: 'CA', timeZone: 'America/Toronto' },
  { id: 'mexico-city', name: 'Mexico City', country: 'Mexico', countryCode: 'MX', timeZone: 'America/Mexico_City' },
  { id: 'honolulu', name: 'Honolulu', country: 'United States', countryCode: 'US', timeZone: 'Pacific/Honolulu' },
  { id: 'bogota', name: 'Bogotá', country: 'Colombia', countryCode: 'CO', timeZone: 'America/Bogota' },
  { id: 'sao-paulo', name: 'São Paulo', country: 'Brazil', countryCode: 'BR', timeZone: 'America/Sao_Paulo' },
  { id: 'buenos-aires', name: 'Buenos Aires', country: 'Argentina', countryCode: 'AR', timeZone: 'America/Argentina/Buenos_Aires' },
  { id: 'london', name: 'London', country: 'United Kingdom', countryCode: 'GB', timeZone: 'Europe/London' },
  { id: 'lisbon', name: 'Lisbon', country: 'Portugal', countryCode: 'PT', timeZone: 'Europe/Lisbon' },
  { id: 'paris', name: 'Paris', country: 'France', countryCode: 'FR', timeZone: 'Europe/Paris' },
  { id: 'geneva', name: 'Geneva', country: 'Switzerland', countryCode: 'CH', timeZone: 'Europe/Zurich' },
  { id: 'berlin', name: 'Berlin', country: 'Germany', countryCode: 'DE', timeZone: 'Europe/Berlin' },
  { id: 'kyiv', name: 'Kyiv', country: 'Ukraine', countryCode: 'UA', timeZone: 'Europe/Kyiv' },
  { id: 'reykjavik', name: 'Reykjavík', country: 'Iceland', countryCode: 'IS', timeZone: 'Atlantic/Reykjavik' },
  { id: 'lagos', name: 'Lagos', country: 'Nigeria', countryCode: 'NG', timeZone: 'Africa/Lagos' },
  { id: 'cairo', name: 'Cairo', country: 'Egypt', countryCode: 'EG', timeZone: 'Africa/Cairo' },
  { id: 'cape-town', name: 'Cape Town', country: 'South Africa', countryCode: 'ZA', timeZone: 'Africa/Johannesburg' },
  { id: 'nairobi', name: 'Nairobi', country: 'Kenya', countryCode: 'KE', timeZone: 'Africa/Nairobi' },
  { id: 'dubai', name: 'Dubai', country: 'United Arab Emirates', countryCode: 'AE', timeZone: 'Asia/Dubai' },
  { id: 'riyadh', name: 'Riyadh', country: 'Saudi Arabia', countryCode: 'SA', timeZone: 'Asia/Riyadh' },
  { id: 'tel-aviv', name: 'Tel Aviv', country: 'Israel', countryCode: 'IL', timeZone: 'Asia/Jerusalem' },
  { id: 'mumbai', name: 'Mumbai', country: 'India', countryCode: 'IN', timeZone: 'Asia/Kolkata' },
  { id: 'kathmandu', name: 'Kathmandu', country: 'Nepal', countryCode: 'NP', timeZone: 'Asia/Kathmandu' },
  { id: 'bangkok', name: 'Bangkok', country: 'Thailand', countryCode: 'TH', timeZone: 'Asia/Bangkok' },
  { id: 'singapore', name: 'Singapore', country: 'Singapore', countryCode: 'SG', timeZone: 'Asia/Singapore' },
  { id: 'hong-kong', name: 'Hong Kong', country: 'Hong Kong', countryCode: 'HK', timeZone: 'Asia/Hong_Kong' },
  { id: 'shanghai', name: 'Shanghai', country: 'China', countryCode: 'CN', timeZone: 'Asia/Shanghai' },
  { id: 'tokyo', name: 'Tokyo', country: 'Japan', countryCode: 'JP', timeZone: 'Asia/Tokyo' },
  { id: 'seoul', name: 'Seoul', country: 'South Korea', countryCode: 'KR', timeZone: 'Asia/Seoul' },
  { id: 'jakarta', name: 'Jakarta', country: 'Indonesia', countryCode: 'ID', timeZone: 'Asia/Jakarta' },
  { id: 'denpasar', name: 'Denpasar', country: 'Indonesia', countryCode: 'ID', timeZone: 'Asia/Makassar' },
  { id: 'perth', name: 'Perth', country: 'Australia', countryCode: 'AU', timeZone: 'Australia/Perth' },
  { id: 'sydney', name: 'Sydney', country: 'Australia', countryCode: 'AU', timeZone: 'Australia/Sydney' },
  { id: 'auckland', name: 'Auckland', country: 'New Zealand', countryCode: 'NZ', timeZone: 'Pacific/Auckland' },
] as const satisfies readonly City[];

export const CITY_BY_ID = new Map<string, City>(CITIES.map((city) => [city.id, city]));

export const DEFAULT_CITY_IDS = ['san-francisco', 'denpasar', 'geneva'] as const;

export function getFlagEmoji(countryCode: string): string {
  return countryCode
    .toUpperCase()
    .split('')
    .map((character) => String.fromCodePoint(127397 + character.charCodeAt(0)))
    .join('');
}
