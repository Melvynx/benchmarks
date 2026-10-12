import type { City } from '../types';

export const CITIES: readonly City[] = [
  { id: 'san-francisco', name: 'San Francisco', country: 'United States', region: 'North America', timeZone: 'America/Los_Angeles', aliases: ['SF', 'USA', 'US', 'Bay Area'] },
  { id: 'new-york', name: 'New York', country: 'United States', region: 'North America', timeZone: 'America/New_York', aliases: ['NYC', 'USA', 'US'] },
  { id: 'chicago', name: 'Chicago', country: 'United States', region: 'North America', timeZone: 'America/Chicago', aliases: ['USA', 'US'] },
  { id: 'denver', name: 'Denver', country: 'United States', region: 'North America', timeZone: 'America/Denver', aliases: ['USA', 'US'] },
  { id: 'vancouver', name: 'Vancouver', country: 'Canada', region: 'North America', timeZone: 'America/Vancouver' },
  { id: 'mexico-city', name: 'Mexico City', country: 'Mexico', region: 'North America', timeZone: 'America/Mexico_City' },
  { id: 'sao-paulo', name: 'São Paulo', country: 'Brazil', region: 'South America', timeZone: 'America/Sao_Paulo', aliases: ['Sao Paulo'] },
  { id: 'buenos-aires', name: 'Buenos Aires', country: 'Argentina', region: 'South America', timeZone: 'America/Argentina/Buenos_Aires' },
  { id: 'bogota', name: 'Bogotá', country: 'Colombia', region: 'South America', timeZone: 'America/Bogota', aliases: ['Bogota'] },
  { id: 'santiago', name: 'Santiago', country: 'Chile', region: 'South America', timeZone: 'America/Santiago' },
  { id: 'london', name: 'London', country: 'United Kingdom', region: 'Europe', timeZone: 'Europe/London', aliases: ['UK', 'Britain'] },
  { id: 'geneva', name: 'Geneva', country: 'Switzerland', region: 'Europe', timeZone: 'Europe/Zurich', aliases: ['Geneve', 'Genève'] },
  { id: 'paris', name: 'Paris', country: 'France', region: 'Europe', timeZone: 'Europe/Paris' },
  { id: 'berlin', name: 'Berlin', country: 'Germany', region: 'Europe', timeZone: 'Europe/Berlin' },
  { id: 'lisbon', name: 'Lisbon', country: 'Portugal', region: 'Europe', timeZone: 'Europe/Lisbon' },
  { id: 'stockholm', name: 'Stockholm', country: 'Sweden', region: 'Europe', timeZone: 'Europe/Stockholm' },
  { id: 'cairo', name: 'Cairo', country: 'Egypt', region: 'Africa', timeZone: 'Africa/Cairo' },
  { id: 'lagos', name: 'Lagos', country: 'Nigeria', region: 'Africa', timeZone: 'Africa/Lagos' },
  { id: 'johannesburg', name: 'Johannesburg', country: 'South Africa', region: 'Africa', timeZone: 'Africa/Johannesburg' },
  { id: 'nairobi', name: 'Nairobi', country: 'Kenya', region: 'Africa', timeZone: 'Africa/Nairobi' },
  { id: 'dubai', name: 'Dubai', country: 'United Arab Emirates', region: 'Middle East', timeZone: 'Asia/Dubai', aliases: ['UAE'] },
  { id: 'tel-aviv', name: 'Tel Aviv', country: 'Israel', region: 'Middle East', timeZone: 'Asia/Jerusalem' },
  { id: 'istanbul', name: 'Istanbul', country: 'Turkey', region: 'Middle East', timeZone: 'Europe/Istanbul' },
  { id: 'mumbai', name: 'Mumbai', country: 'India', region: 'Asia', timeZone: 'Asia/Kolkata', aliases: ['Bombay'] },
  { id: 'kathmandu', name: 'Kathmandu', country: 'Nepal', region: 'Asia', timeZone: 'Asia/Kathmandu' },
  { id: 'bangkok', name: 'Bangkok', country: 'Thailand', region: 'Asia', timeZone: 'Asia/Bangkok' },
  { id: 'singapore', name: 'Singapore', country: 'Singapore', region: 'Asia', timeZone: 'Asia/Singapore' },
  { id: 'hong-kong', name: 'Hong Kong', country: 'Hong Kong', region: 'Asia', timeZone: 'Asia/Hong_Kong', aliases: ['HK'] },
  { id: 'tokyo', name: 'Tokyo', country: 'Japan', region: 'Asia', timeZone: 'Asia/Tokyo' },
  { id: 'seoul', name: 'Seoul', country: 'South Korea', region: 'Asia', timeZone: 'Asia/Seoul', aliases: ['Korea'] },
  { id: 'denpasar', name: 'Denpasar', country: 'Indonesia', region: 'Asia', timeZone: 'Asia/Makassar', aliases: ['Bali'] },
  { id: 'sydney', name: 'Sydney', country: 'Australia', region: 'Oceania', timeZone: 'Australia/Sydney' },
  { id: 'auckland', name: 'Auckland', country: 'New Zealand', region: 'Oceania', timeZone: 'Pacific/Auckland' },
  { id: 'honolulu', name: 'Honolulu', country: 'United States', region: 'Oceania', timeZone: 'Pacific/Honolulu', aliases: ['Hawaii', 'USA', 'US'] },
];

export const CITY_BY_ID: ReadonlyMap<string, City> = new Map(CITIES.map((city) => [city.id, city]));

export function citiesInOrder(ids: readonly string[]): City[] {
  const cities: City[] = [];
  for (const id of ids) {
    const city = CITY_BY_ID.get(id);
    if (city) cities.push(city);
  }
  return cities;
}
