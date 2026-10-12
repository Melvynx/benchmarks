export type City = {
  id: string
  name: string
  country: string
  timezone: string
  countryCode: string
}

export const CITIES: City[] = [
  { id: 'san-francisco', name: 'San Francisco', country: 'United States', timezone: 'America/Los_Angeles', countryCode: 'US' },
  { id: 'new-york', name: 'New York', country: 'United States', timezone: 'America/New_York', countryCode: 'US' },
  { id: 'vancouver', name: 'Vancouver', country: 'Canada', timezone: 'America/Vancouver', countryCode: 'CA' },
  { id: 'toronto', name: 'Toronto', country: 'Canada', timezone: 'America/Toronto', countryCode: 'CA' },
  { id: 'chicago', name: 'Chicago', country: 'United States', timezone: 'America/Chicago', countryCode: 'US' },
  { id: 'denver', name: 'Denver', country: 'United States', timezone: 'America/Denver', countryCode: 'US' },
  { id: 'anchorage', name: 'Anchorage', country: 'United States', timezone: 'America/Anchorage', countryCode: 'US' },
  { id: 'honolulu', name: 'Honolulu', country: 'United States', timezone: 'Pacific/Honolulu', countryCode: 'US' },
  { id: 'mexico-city', name: 'Mexico City', country: 'Mexico', timezone: 'America/Mexico_City', countryCode: 'MX' },
  { id: 'bogota', name: 'Bogotá', country: 'Colombia', timezone: 'America/Bogota', countryCode: 'CO' },
  { id: 'sao-paulo', name: 'São Paulo', country: 'Brazil', timezone: 'America/Sao_Paulo', countryCode: 'BR' },
  { id: 'buenos-aires', name: 'Buenos Aires', country: 'Argentina', timezone: 'America/Argentina/Buenos_Aires', countryCode: 'AR' },
  { id: 'lisbon', name: 'Lisbon', country: 'Portugal', timezone: 'Europe/Lisbon', countryCode: 'PT' },
  { id: 'london', name: 'London', country: 'United Kingdom', timezone: 'Europe/London', countryCode: 'GB' },
  { id: 'geneva', name: 'Geneva', country: 'Switzerland', timezone: 'Europe/Zurich', countryCode: 'CH' },
  { id: 'paris', name: 'Paris', country: 'France', timezone: 'Europe/Paris', countryCode: 'FR' },
  { id: 'reykjavik', name: 'Reykjavík', country: 'Iceland', timezone: 'Atlantic/Reykjavik', countryCode: 'IS' },
  { id: 'lagos', name: 'Lagos', country: 'Nigeria', timezone: 'Africa/Lagos', countryCode: 'NG' },
  { id: 'cairo', name: 'Cairo', country: 'Egypt', timezone: 'Africa/Cairo', countryCode: 'EG' },
  { id: 'nairobi', name: 'Nairobi', country: 'Kenya', timezone: 'Africa/Nairobi', countryCode: 'KE' },
  { id: 'johannesburg', name: 'Johannesburg', country: 'South Africa', timezone: 'Africa/Johannesburg', countryCode: 'ZA' },
  { id: 'dubai', name: 'Dubai', country: 'United Arab Emirates', timezone: 'Asia/Dubai', countryCode: 'AE' },
  { id: 'riyadh', name: 'Riyadh', country: 'Saudi Arabia', timezone: 'Asia/Riyadh', countryCode: 'SA' },
  { id: 'mumbai', name: 'Mumbai', country: 'India', timezone: 'Asia/Kolkata', countryCode: 'IN' },
  { id: 'kathmandu', name: 'Kathmandu', country: 'Nepal', timezone: 'Asia/Kathmandu', countryCode: 'NP' },
  { id: 'bangkok', name: 'Bangkok', country: 'Thailand', timezone: 'Asia/Bangkok', countryCode: 'TH' },
  { id: 'singapore', name: 'Singapore', country: 'Singapore', timezone: 'Asia/Singapore', countryCode: 'SG' },
  { id: 'hong-kong', name: 'Hong Kong', country: 'Hong Kong', timezone: 'Asia/Hong_Kong', countryCode: 'HK' },
  { id: 'manila', name: 'Manila', country: 'Philippines', timezone: 'Asia/Manila', countryCode: 'PH' },
  { id: 'denpasar', name: 'Denpasar', country: 'Indonesia', timezone: 'Asia/Makassar', countryCode: 'ID' },
  { id: 'tokyo', name: 'Tokyo', country: 'Japan', timezone: 'Asia/Tokyo', countryCode: 'JP' },
  { id: 'seoul', name: 'Seoul', country: 'South Korea', timezone: 'Asia/Seoul', countryCode: 'KR' },
  { id: 'sydney', name: 'Sydney', country: 'Australia', timezone: 'Australia/Sydney', countryCode: 'AU' },
  { id: 'melbourne', name: 'Melbourne', country: 'Australia', timezone: 'Australia/Melbourne', countryCode: 'AU' },
  { id: 'auckland', name: 'Auckland', country: 'New Zealand', timezone: 'Pacific/Auckland', countryCode: 'NZ' },
]

export const DEFAULT_CITY_IDS = ['san-francisco', 'denpasar', 'geneva']
