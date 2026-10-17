import { City } from '../types';

export const CITIES_CATALOG: City[] = [
  // North America
  {
    id: 'san-francisco',
    name: 'San Francisco',
    country: 'United States',
    region: 'North America',
    timezone: 'America/Los_Angeles',
  },
  {
    id: 'new-york',
    name: 'New York',
    country: 'United States',
    region: 'North America',
    timezone: 'America/New_York',
  },
  {
    id: 'chicago',
    name: 'Chicago',
    country: 'United States',
    region: 'North America',
    timezone: 'America/Chicago',
  },
  {
    id: 'denver',
    name: 'Denver',
    country: 'United States',
    region: 'North America',
    timezone: 'America/Denver',
  },
  {
    id: 'toronto',
    name: 'Toronto',
    country: 'Canada',
    region: 'North America',
    timezone: 'America/Toronto',
  },
  {
    id: 'vancouver',
    name: 'Vancouver',
    country: 'Canada',
    region: 'North America',
    timezone: 'America/Vancouver',
  },
  {
    id: 'mexico-city',
    name: 'Mexico City',
    country: 'Mexico',
    region: 'North America',
    timezone: 'America/Mexico_City',
  },

  // South America
  {
    id: 'sao-paulo',
    name: 'São Paulo',
    country: 'Brazil',
    region: 'South America',
    timezone: 'America/Sao_Paulo',
  },
  {
    id: 'buenos-aires',
    name: 'Buenos Aires',
    country: 'Argentina',
    region: 'South America',
    timezone: 'America/Argentina/Buenos_Aires',
  },
  {
    id: 'santiago',
    name: 'Santiago',
    country: 'Chile',
    region: 'South America',
    timezone: 'America/Santiago',
  },
  {
    id: 'bogota',
    name: 'Bogotá',
    country: 'Colombia',
    region: 'South America',
    timezone: 'America/Bogota',
  },
  {
    id: 'lima',
    name: 'Lima',
    country: 'Peru',
    region: 'South America',
    timezone: 'America/Lima',
  },

  // Europe
  {
    id: 'geneva',
    name: 'Geneva',
    country: 'Switzerland',
    region: 'Europe',
    timezone: 'Europe/Zurich',
  },
  {
    id: 'london',
    name: 'London',
    country: 'United Kingdom',
    region: 'Europe',
    timezone: 'Europe/London',
  },
  {
    id: 'paris',
    name: 'Paris',
    country: 'France',
    region: 'Europe',
    timezone: 'Europe/Paris',
  },
  {
    id: 'berlin',
    name: 'Berlin',
    country: 'Germany',
    region: 'Europe',
    timezone: 'Europe/Berlin',
  },
  {
    id: 'madrid',
    name: 'Madrid',
    country: 'Spain',
    region: 'Europe',
    timezone: 'Europe/Madrid',
  },
  {
    id: 'amsterdam',
    name: 'Amsterdam',
    country: 'Netherlands',
    region: 'Europe',
    timezone: 'Europe/Amsterdam',
  },
  {
    id: 'lisbon',
    name: 'Lisbon',
    country: 'Portugal',
    region: 'Europe',
    timezone: 'Europe/Lisbon',
  },
  {
    id: 'athens',
    name: 'Athens',
    country: 'Greece',
    region: 'Europe',
    timezone: 'Europe/Athens',
  },

  // Africa
  {
    id: 'cairo',
    name: 'Cairo',
    country: 'Egypt',
    region: 'Africa',
    timezone: 'Africa/Cairo',
  },
  {
    id: 'lagos',
    name: 'Lagos',
    country: 'Nigeria',
    region: 'Africa',
    timezone: 'Africa/Lagos',
  },
  {
    id: 'nairobi',
    name: 'Nairobi',
    country: 'Kenya',
    region: 'Africa',
    timezone: 'Africa/Nairobi',
  },
  {
    id: 'johannesburg',
    name: 'Johannesburg',
    country: 'South Africa',
    region: 'Africa',
    timezone: 'Africa/Johannesburg',
  },

  // Middle East
  {
    id: 'dubai',
    name: 'Dubai',
    country: 'United Arab Emirates',
    region: 'Middle East',
    timezone: 'Asia/Dubai',
  },
  {
    id: 'tel-aviv',
    name: 'Tel Aviv',
    country: 'Israel',
    region: 'Middle East',
    timezone: 'Asia/Jerusalem',
  },
  {
    id: 'istanbul',
    name: 'Istanbul',
    country: 'Turkey',
    region: 'Middle East',
    timezone: 'Europe/Istanbul',
  },

  // Asia
  {
    id: 'denpasar',
    name: 'Denpasar',
    country: 'Indonesia',
    region: 'Asia',
    timezone: 'Asia/Makassar',
  },
  {
    id: 'mumbai',
    name: 'Mumbai',
    country: 'India',
    region: 'Asia',
    timezone: 'Asia/Kolkata',
  },
  {
    id: 'kathmandu',
    name: 'Kathmandu',
    country: 'Nepal',
    region: 'Asia',
    timezone: 'Asia/Kathmandu',
  },
  {
    id: 'bangkok',
    name: 'Bangkok',
    country: 'Thailand',
    region: 'Asia',
    timezone: 'Asia/Bangkok',
  },
  {
    id: 'singapore',
    name: 'Singapore',
    country: 'Singapore',
    region: 'Asia',
    timezone: 'Asia/Singapore',
  },
  {
    id: 'tokyo',
    name: 'Tokyo',
    country: 'Japan',
    region: 'Asia',
    timezone: 'Asia/Tokyo',
  },
  {
    id: 'seoul',
    name: 'Seoul',
    country: 'South Korea',
    region: 'Asia',
    timezone: 'Asia/Seoul',
  },

  // Oceania
  {
    id: 'sydney',
    name: 'Sydney',
    country: 'Australia',
    region: 'Oceania',
    timezone: 'Australia/Sydney',
  },
  {
    id: 'auckland',
    name: 'Auckland',
    country: 'New Zealand',
    region: 'Oceania',
    timezone: 'Pacific/Auckland',
  },
];

export const DEFAULT_CITY_IDS = ['san-francisco', 'denpasar', 'geneva'];

export const CITY_BY_ID = new Map<string, City>(
  CITIES_CATALOG.map((city) => [city.id, city])
);
