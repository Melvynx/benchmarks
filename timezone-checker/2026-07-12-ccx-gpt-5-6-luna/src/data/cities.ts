export type City = {
  id: string
  name: string
  country: string
  countryCode: string
  timezone: string
  region: string
  accent: string
}

export const CITIES: City[] = [
  { id: 'san-francisco', name: 'San Francisco', country: 'United States', countryCode: 'US', timezone: 'America/Los_Angeles', region: 'North America', accent: '#77b8a8' },
  { id: 'new-york', name: 'New York', country: 'United States', countryCode: 'US', timezone: 'America/New_York', region: 'North America', accent: '#77b8a8' },
  { id: 'toronto', name: 'Toronto', country: 'Canada', countryCode: 'CA', timezone: 'America/Toronto', region: 'North America', accent: '#77b8a8' },
  { id: 'mexico-city', name: 'Mexico City', country: 'Mexico', countryCode: 'MX', timezone: 'America/Mexico_City', region: 'North America', accent: '#77b8a8' },
  { id: 'sao-paulo', name: 'São Paulo', country: 'Brazil', countryCode: 'BR', timezone: 'America/Sao_Paulo', region: 'South America', accent: '#e3a86c' },
  { id: 'buenos-aires', name: 'Buenos Aires', country: 'Argentina', countryCode: 'AR', timezone: 'America/Argentina/Buenos_Aires', region: 'South America', accent: '#e3a86c' },
  { id: 'london', name: 'London', country: 'United Kingdom', countryCode: 'GB', timezone: 'Europe/London', region: 'Europe', accent: '#d49a98' },
  { id: 'lisbon', name: 'Lisbon', country: 'Portugal', countryCode: 'PT', timezone: 'Europe/Lisbon', region: 'Europe', accent: '#d49a98' },
  { id: 'paris', name: 'Paris', country: 'France', countryCode: 'FR', timezone: 'Europe/Paris', region: 'Europe', accent: '#d49a98' },
  { id: 'geneva', name: 'Geneva', country: 'Switzerland', countryCode: 'CH', timezone: 'Europe/Zurich', region: 'Europe', accent: '#d49a98' },
  { id: 'berlin', name: 'Berlin', country: 'Germany', countryCode: 'DE', timezone: 'Europe/Berlin', region: 'Europe', accent: '#d49a98' },
  { id: 'madrid', name: 'Madrid', country: 'Spain', countryCode: 'ES', timezone: 'Europe/Madrid', region: 'Europe', accent: '#d49a98' },
  { id: 'rome', name: 'Rome', country: 'Italy', countryCode: 'IT', timezone: 'Europe/Rome', region: 'Europe', accent: '#d49a98' },
  { id: 'stockholm', name: 'Stockholm', country: 'Sweden', countryCode: 'SE', timezone: 'Europe/Stockholm', region: 'Europe', accent: '#d49a98' },
  { id: 'johannesburg', name: 'Johannesburg', country: 'South Africa', countryCode: 'ZA', timezone: 'Africa/Johannesburg', region: 'Africa', accent: '#f1c27d' },
  { id: 'cairo', name: 'Cairo', country: 'Egypt', countryCode: 'EG', timezone: 'Africa/Cairo', region: 'Africa', accent: '#f1c27d' },
  { id: 'nairobi', name: 'Nairobi', country: 'Kenya', countryCode: 'KE', timezone: 'Africa/Nairobi', region: 'Africa', accent: '#f1c27d' },
  { id: 'lagos', name: 'Lagos', country: 'Nigeria', countryCode: 'NG', timezone: 'Africa/Lagos', region: 'Africa', accent: '#f1c27d' },
  { id: 'dubai', name: 'Dubai', country: 'United Arab Emirates', countryCode: 'AE', timezone: 'Asia/Dubai', region: 'Middle East', accent: '#bda7df' },
  { id: 'riyadh', name: 'Riyadh', country: 'Saudi Arabia', countryCode: 'SA', timezone: 'Asia/Riyadh', region: 'Middle East', accent: '#bda7df' },
  { id: 'mumbai', name: 'Mumbai', country: 'India', countryCode: 'IN', timezone: 'Asia/Kolkata', region: 'Asia', accent: '#b8a3e7' },
  { id: 'new-delhi', name: 'New Delhi', country: 'India', countryCode: 'IN', timezone: 'Asia/Kolkata', region: 'Asia', accent: '#b8a3e7' },
  { id: 'singapore', name: 'Singapore', country: 'Singapore', countryCode: 'SG', timezone: 'Asia/Singapore', region: 'Asia', accent: '#b8a3e7' },
  { id: 'tokyo', name: 'Tokyo', country: 'Japan', countryCode: 'JP', timezone: 'Asia/Tokyo', region: 'Asia', accent: '#b8a3e7' },
  { id: 'seoul', name: 'Seoul', country: 'South Korea', countryCode: 'KR', timezone: 'Asia/Seoul', region: 'Asia', accent: '#b8a3e7' },
  { id: 'hong-kong', name: 'Hong Kong', country: 'Hong Kong', countryCode: 'HK', timezone: 'Asia/Hong_Kong', region: 'Asia', accent: '#b8a3e7' },
  { id: 'bangkok', name: 'Bangkok', country: 'Thailand', countryCode: 'TH', timezone: 'Asia/Bangkok', region: 'Asia', accent: '#b8a3e7' },
  { id: 'jakarta', name: 'Jakarta', country: 'Indonesia', countryCode: 'ID', timezone: 'Asia/Jakarta', region: 'Asia', accent: '#b8a3e7' },
  { id: 'denpasar', name: 'Denpasar', country: 'Indonesia', countryCode: 'ID', timezone: 'Asia/Makassar', region: 'Asia', accent: '#b8a3e7' },
  { id: 'manila', name: 'Manila', country: 'Philippines', countryCode: 'PH', timezone: 'Asia/Manila', region: 'Asia', accent: '#b8a3e7' },
  { id: 'perth', name: 'Perth', country: 'Australia', countryCode: 'AU', timezone: 'Australia/Perth', region: 'Oceania', accent: '#f29b81' },
  { id: 'sydney', name: 'Sydney', country: 'Australia', countryCode: 'AU', timezone: 'Australia/Sydney', region: 'Oceania', accent: '#f29b81' },
  { id: 'melbourne', name: 'Melbourne', country: 'Australia', countryCode: 'AU', timezone: 'Australia/Melbourne', region: 'Oceania', accent: '#f29b81' },
  { id: 'auckland', name: 'Auckland', country: 'New Zealand', countryCode: 'NZ', timezone: 'Pacific/Auckland', region: 'Oceania', accent: '#f29b81' },
]

export const DEFAULT_CITY_IDS = ['san-francisco', 'denpasar', 'geneva']

export const getCity = (id: string) => CITIES.find((city) => city.id === id)
