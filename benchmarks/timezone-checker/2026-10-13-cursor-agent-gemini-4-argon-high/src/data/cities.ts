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
  aliases?: string[];
}

export const CITY_CATALOG: City[] = [
  // North America
  {
    id: 'san-francisco',
    name: 'San Francisco',
    country: 'United States',
    timeZone: 'America/Los_Angeles',
    region: 'North America',
    aliases: ['USA', 'US', 'California', 'PST', 'PDT', 'Los Angeles'],
  },
  {
    id: 'new-york',
    name: 'New York',
    country: 'United States',
    timeZone: 'America/New_York',
    region: 'North America',
    aliases: ['USA', 'US', 'NYC', 'EST', 'EDT'],
  },
  {
    id: 'chicago',
    name: 'Chicago',
    country: 'United States',
    timeZone: 'America/Chicago',
    region: 'North America',
    aliases: ['USA', 'US', 'CST', 'CDT'],
  },
  {
    id: 'denver',
    name: 'Denver',
    country: 'United States',
    timeZone: 'America/Denver',
    region: 'North America',
    aliases: ['USA', 'US', 'MST', 'MDT'],
  },
  {
    id: 'toronto',
    name: 'Toronto',
    country: 'Canada',
    timeZone: 'America/Toronto',
    region: 'North America',
  },
  {
    id: 'mexico-city',
    name: 'Mexico City',
    country: 'Mexico',
    timeZone: 'America/Mexico_City',
    region: 'North America',
    aliases: ['CDMX'],
  },

  // South America
  {
    id: 'sao-paulo',
    name: 'São Paulo',
    country: 'Brazil',
    timeZone: 'America/Sao_Paulo',
    region: 'South America',
    aliases: ['Sao Paulo'],
  },
  {
    id: 'buenos-aires',
    name: 'Buenos Aires',
    country: 'Argentina',
    timeZone: 'America/Argentina/Buenos_Aires',
    region: 'South America',
  },
  {
    id: 'santiago',
    name: 'Santiago',
    country: 'Chile',
    timeZone: 'America/Santiago',
    region: 'South America',
  },
  {
    id: 'bogota',
    name: 'Bogotá',
    country: 'Colombia',
    timeZone: 'America/Bogota',
    region: 'South America',
    aliases: ['Bogota'],
  },

  // Europe
  {
    id: 'london',
    name: 'London',
    country: 'United Kingdom',
    timeZone: 'Europe/London',
    region: 'Europe',
    aliases: ['UK', 'Britain', 'England', 'GMT', 'BST'],
  },
  {
    id: 'paris',
    name: 'Paris',
    country: 'France',
    timeZone: 'Europe/Paris',
    region: 'Europe',
    aliases: ['CET', 'CEST'],
  },
  {
    id: 'geneva',
    name: 'Geneva',
    country: 'Switzerland',
    timeZone: 'Europe/Zurich',
    region: 'Europe',
    aliases: ['Zurich', 'CET', 'CEST'],
  },
  {
    id: 'berlin',
    name: 'Berlin',
    country: 'Germany',
    timeZone: 'Europe/Berlin',
    region: 'Europe',
    aliases: ['CET', 'CEST'],
  },
  {
    id: 'amsterdam',
    name: 'Amsterdam',
    country: 'Netherlands',
    timeZone: 'Europe/Amsterdam',
    region: 'Europe',
    aliases: ['Holland'],
  },
  {
    id: 'madrid',
    name: 'Madrid',
    country: 'Spain',
    timeZone: 'Europe/Madrid',
    region: 'Europe',
    aliases: ['Barcelona'],
  },
  {
    id: 'lisbon',
    name: 'Lisbon',
    country: 'Portugal',
    timeZone: 'Europe/Lisbon',
    region: 'Europe',
  },

  // Africa
  {
    id: 'cairo',
    name: 'Cairo',
    country: 'Egypt',
    timeZone: 'Africa/Cairo',
    region: 'Africa',
  },
  {
    id: 'lagos',
    name: 'Lagos',
    country: 'Nigeria',
    timeZone: 'Africa/Lagos',
    region: 'Africa',
    aliases: ['WAT'],
  },
  {
    id: 'nairobi',
    name: 'Nairobi',
    country: 'Kenya',
    timeZone: 'Africa/Nairobi',
    region: 'Africa',
    aliases: ['EAT'],
  },
  {
    id: 'johannesburg',
    name: 'Johannesburg',
    country: 'South Africa',
    timeZone: 'Africa/Johannesburg',
    region: 'Africa',
    aliases: ['Cape Town', 'SAST'],
  },

  // Middle East
  {
    id: 'dubai',
    name: 'Dubai',
    country: 'United Arab Emirates',
    timeZone: 'Asia/Dubai',
    region: 'Middle East',
    aliases: ['UAE', 'Abu Dhabi'],
  },
  {
    id: 'tel-aviv',
    name: 'Tel Aviv',
    country: 'Israel',
    timeZone: 'Asia/Jerusalem',
    region: 'Middle East',
    aliases: ['Jerusalem'],
  },
  {
    id: 'istanbul',
    name: 'Istanbul',
    country: 'Turkey',
    timeZone: 'Europe/Istanbul',
    region: 'Middle East',
    aliases: ['Turkiye'],
  },

  // Asia
  {
    id: 'mumbai',
    name: 'Mumbai',
    country: 'India',
    timeZone: 'Asia/Kolkata',
    region: 'Asia',
    aliases: ['New Delhi', 'Bangalore', 'Bengaluru', 'Kolkata', 'IST'],
  },
  {
    id: 'kathmandu',
    name: 'Kathmandu',
    country: 'Nepal',
    timeZone: 'Asia/Kathmandu',
    region: 'Asia',
    aliases: ['NPT'],
  },
  {
    id: 'bangkok',
    name: 'Bangkok',
    country: 'Thailand',
    timeZone: 'Asia/Bangkok',
    region: 'Asia',
    aliases: ['Chiang Mai', 'ICT'],
  },
  {
    id: 'singapore',
    name: 'Singapore',
    country: 'Singapore',
    timeZone: 'Asia/Singapore',
    region: 'Asia',
    aliases: ['SGT'],
  },
  {
    id: 'denpasar',
    name: 'Denpasar',
    country: 'Indonesia',
    timeZone: 'Asia/Makassar',
    region: 'Asia',
    aliases: ['Bali', 'Canggu', 'Ubud', 'WITA'],
  },
  {
    id: 'tokyo',
    name: 'Tokyo',
    country: 'Japan',
    timeZone: 'Asia/Tokyo',
    region: 'Asia',
    aliases: ['Osaka', 'Kyoto', 'JST'],
  },
  {
    id: 'seoul',
    name: 'Seoul',
    country: 'South Korea',
    timeZone: 'Asia/Seoul',
    region: 'Asia',
    aliases: ['Korea', 'KST'],
  },

  // Oceania
  {
    id: 'sydney',
    name: 'Sydney',
    country: 'Australia',
    timeZone: 'Australia/Sydney',
    region: 'Oceania',
    aliases: ['Melbourne', 'AEST', 'AEDT'],
  },
  {
    id: 'adelaide',
    name: 'Adelaide',
    country: 'Australia',
    timeZone: 'Australia/Adelaide',
    region: 'Oceania',
    aliases: ['ACST', 'ACDT'],
  },
  {
    id: 'auckland',
    name: 'Auckland',
    country: 'New Zealand',
    timeZone: 'Pacific/Auckland',
    region: 'Oceania',
    aliases: ['NZ', 'NZST', 'NZDT'],
  },
];

export const DEFAULT_CITY_IDS = ['san-francisco', 'denpasar', 'geneva'];
