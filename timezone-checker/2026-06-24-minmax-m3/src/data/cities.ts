import type { City, Region } from '../types'

export const CITIES: City[] = [
  // North America
  { id: 'san-francisco', name: 'San Francisco', country: 'United States', region: 'North America', timezone: 'America/Los_Angeles' },
  { id: 'seattle', name: 'Seattle', country: 'United States', region: 'North America', timezone: 'America/Los_Angeles' },
  { id: 'los-angeles', name: 'Los Angeles', country: 'United States', region: 'North America', timezone: 'America/Los_Angeles' },
  { id: 'denver', name: 'Denver', country: 'United States', region: 'North America', timezone: 'America/Denver' },
  { id: 'chicago', name: 'Chicago', country: 'United States', region: 'North America', timezone: 'America/Chicago' },
  { id: 'new-york', name: 'New York', country: 'United States', region: 'North America', timezone: 'America/New_York' },
  { id: 'toronto', name: 'Toronto', country: 'Canada', region: 'North America', timezone: 'America/Toronto' },
  { id: 'vancouver', name: 'Vancouver', country: 'Canada', region: 'North America', timezone: 'America/Vancouver' },
  { id: 'mexico-city', name: 'Mexico City', country: 'Mexico', region: 'North America', timezone: 'America/Mexico_City' },
  { id: 'honolulu', name: 'Honolulu', country: 'United States', region: 'North America', timezone: 'Pacific/Honolulu' },

  // South America
  { id: 'bogota', name: 'Bogotá', country: 'Colombia', region: 'South America', timezone: 'America/Bogota' },
  { id: 'lima', name: 'Lima', country: 'Peru', region: 'South America', timezone: 'America/Lima' },
  { id: 'santiago', name: 'Santiago', country: 'Chile', region: 'South America', timezone: 'America/Santiago' },
  { id: 'sao-paulo', name: 'São Paulo', country: 'Brazil', region: 'South America', timezone: 'America/Sao_Paulo' },
  { id: 'buenos-aires', name: 'Buenos Aires', country: 'Argentina', region: 'South America', timezone: 'America/Argentina/Buenos_Aires' },

  // Europe
  { id: 'london', name: 'London', country: 'United Kingdom', region: 'Europe', timezone: 'Europe/London' },
  { id: 'dublin', name: 'Dublin', country: 'Ireland', region: 'Europe', timezone: 'Europe/Dublin' },
  { id: 'lisbon', name: 'Lisbon', country: 'Portugal', region: 'Europe', timezone: 'Europe/Lisbon' },
  { id: 'paris', name: 'Paris', country: 'France', region: 'Europe', timezone: 'Europe/Paris' },
  { id: 'madrid', name: 'Madrid', country: 'Spain', region: 'Europe', timezone: 'Europe/Madrid' },
  { id: 'amsterdam', name: 'Amsterdam', country: 'Netherlands', region: 'Europe', timezone: 'Europe/Amsterdam' },
  { id: 'berlin', name: 'Berlin', country: 'Germany', region: 'Europe', timezone: 'Europe/Berlin' },
  { id: 'zurich', name: 'Zürich', country: 'Switzerland', region: 'Europe', timezone: 'Europe/Zurich' },
  { id: 'geneva', name: 'Geneva', country: 'Switzerland', region: 'Europe', timezone: 'Europe/Zurich' },
  { id: 'rome', name: 'Rome', country: 'Italy', region: 'Europe', timezone: 'Europe/Rome' },
  { id: 'stockholm', name: 'Stockholm', country: 'Sweden', region: 'Europe', timezone: 'Europe/Stockholm' },
  { id: 'athens', name: 'Athens', country: 'Greece', region: 'Europe', timezone: 'Europe/Athens' },

  // Africa
  { id: 'lagos', name: 'Lagos', country: 'Nigeria', region: 'Africa', timezone: 'Africa/Lagos' },
  { id: 'accra', name: 'Accra', country: 'Ghana', region: 'Africa', timezone: 'Africa/Accra' },
  { id: 'cairo', name: 'Cairo', country: 'Egypt', region: 'Africa', timezone: 'Africa/Cairo' },
  { id: 'nairobi', name: 'Nairobi', country: 'Kenya', region: 'Africa', timezone: 'Africa/Nairobi' },
  { id: 'johannesburg', name: 'Johannesburg', country: 'South Africa', region: 'Africa', timezone: 'Africa/Johannesburg' },

  // Middle East
  { id: 'istanbul', name: 'Istanbul', country: 'Turkey', region: 'Middle East', timezone: 'Europe/Istanbul' },
  { id: 'tel-aviv', name: 'Tel Aviv', country: 'Israel', region: 'Middle East', timezone: 'Asia/Jerusalem' },
  { id: 'dubai', name: 'Dubai', country: 'United Arab Emirates', region: 'Middle East', timezone: 'Asia/Dubai' },
  { id: 'riyadh', name: 'Riyadh', country: 'Saudi Arabia', region: 'Middle East', timezone: 'Asia/Riyadh' },
  { id: 'tehran', name: 'Tehran', country: 'Iran', region: 'Middle East', timezone: 'Asia/Tehran' },

  // Asia
  { id: 'karachi', name: 'Karachi', country: 'Pakistan', region: 'Asia', timezone: 'Asia/Karachi' },
  { id: 'mumbai', name: 'Mumbai', country: 'India', region: 'Asia', timezone: 'Asia/Kolkata' },
  { id: 'delhi', name: 'Delhi', country: 'India', region: 'Asia', timezone: 'Asia/Kolkata' },
  { id: 'kathmandu', name: 'Kathmandu', country: 'Nepal', region: 'Asia', timezone: 'Asia/Kathmandu' },
  { id: 'dhaka', name: 'Dhaka', country: 'Bangladesh', region: 'Asia', timezone: 'Asia/Dhaka' },
  { id: 'bangkok', name: 'Bangkok', country: 'Thailand', region: 'Asia', timezone: 'Asia/Bangkok' },
  { id: 'jakarta', name: 'Jakarta', country: 'Indonesia', region: 'Asia', timezone: 'Asia/Jakarta' },
  { id: 'denpasar', name: 'Denpasar', country: 'Indonesia', region: 'Asia', timezone: 'Asia/Makassar' },
  { id: 'singapore', name: 'Singapore', country: 'Singapore', region: 'Asia', timezone: 'Asia/Singapore' },
  { id: 'hong-kong', name: 'Hong Kong', country: 'Hong Kong', region: 'Asia', timezone: 'Asia/Hong_Kong' },
  { id: 'shanghai', name: 'Shanghai', country: 'China', region: 'Asia', timezone: 'Asia/Shanghai' },
  { id: 'beijing', name: 'Beijing', country: 'China', region: 'Asia', timezone: 'Asia/Shanghai' },
  { id: 'seoul', name: 'Seoul', country: 'South Korea', region: 'Asia', timezone: 'Asia/Seoul' },
  { id: 'tokyo', name: 'Tokyo', country: 'Japan', region: 'Asia', timezone: 'Asia/Tokyo' },

  // Oceania
  { id: 'perth', name: 'Perth', country: 'Australia', region: 'Oceania', timezone: 'Australia/Perth' },
  { id: 'sydney', name: 'Sydney', country: 'Australia', region: 'Oceania', timezone: 'Australia/Sydney' },
  { id: 'melbourne', name: 'Melbourne', country: 'Australia', region: 'Oceania', timezone: 'Australia/Melbourne' },
  { id: 'auckland', name: 'Auckland', country: 'New Zealand', region: 'Oceania', timezone: 'Pacific/Auckland' },
]

export const CITY_BY_ID = new Map(CITIES.map((c) => [c.id, c]))

export const DEFAULT_CITY_IDS = ['san-francisco', 'denpasar', 'geneva']

export const REGIONS: Region[] = [
  'North America',
  'South America',
  'Europe',
  'Africa',
  'Middle East',
  'Asia',
  'Oceania',
]