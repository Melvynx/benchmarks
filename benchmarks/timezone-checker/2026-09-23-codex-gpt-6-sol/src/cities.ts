export type Region = 'North America' | 'South America' | 'Europe' | 'Africa' | 'Middle East' | 'Asia' | 'Oceania'

export type City = {
  id: string
  name: string
  country: string
  region: Region
  timeZone: string
}

export const CITIES: City[] = [
  { id: 'san-francisco', name: 'San Francisco', country: 'United States', region: 'North America', timeZone: 'America/Los_Angeles' },
  { id: 'los-angeles', name: 'Los Angeles', country: 'United States', region: 'North America', timeZone: 'America/Los_Angeles' },
  { id: 'chicago', name: 'Chicago', country: 'United States', region: 'North America', timeZone: 'America/Chicago' },
  { id: 'new-york', name: 'New York', country: 'United States', region: 'North America', timeZone: 'America/New_York' },
  { id: 'toronto', name: 'Toronto', country: 'Canada', region: 'North America', timeZone: 'America/Toronto' },
  { id: 'mexico-city', name: 'Mexico City', country: 'Mexico', region: 'North America', timeZone: 'America/Mexico_City' },
  { id: 'bogota', name: 'Bogotá', country: 'Colombia', region: 'South America', timeZone: 'America/Bogota' },
  { id: 'sao-paulo', name: 'São Paulo', country: 'Brazil', region: 'South America', timeZone: 'America/Sao_Paulo' },
  { id: 'buenos-aires', name: 'Buenos Aires', country: 'Argentina', region: 'South America', timeZone: 'America/Argentina/Buenos_Aires' },
  { id: 'santiago', name: 'Santiago', country: 'Chile', region: 'South America', timeZone: 'America/Santiago' },
  { id: 'london', name: 'London', country: 'United Kingdom', region: 'Europe', timeZone: 'Europe/London' },
  { id: 'lisbon', name: 'Lisbon', country: 'Portugal', region: 'Europe', timeZone: 'Europe/Lisbon' },
  { id: 'paris', name: 'Paris', country: 'France', region: 'Europe', timeZone: 'Europe/Paris' },
  { id: 'geneva', name: 'Geneva', country: 'Switzerland', region: 'Europe', timeZone: 'Europe/Zurich' },
  { id: 'berlin', name: 'Berlin', country: 'Germany', region: 'Europe', timeZone: 'Europe/Berlin' },
  { id: 'amsterdam', name: 'Amsterdam', country: 'Netherlands', region: 'Europe', timeZone: 'Europe/Amsterdam' },
  { id: 'casablanca', name: 'Casablanca', country: 'Morocco', region: 'Africa', timeZone: 'Africa/Casablanca' },
  { id: 'lagos', name: 'Lagos', country: 'Nigeria', region: 'Africa', timeZone: 'Africa/Lagos' },
  { id: 'nairobi', name: 'Nairobi', country: 'Kenya', region: 'Africa', timeZone: 'Africa/Nairobi' },
  { id: 'cape-town', name: 'Cape Town', country: 'South Africa', region: 'Africa', timeZone: 'Africa/Johannesburg' },
  { id: 'dubai', name: 'Dubai', country: 'United Arab Emirates', region: 'Middle East', timeZone: 'Asia/Dubai' },
  { id: 'riyadh', name: 'Riyadh', country: 'Saudi Arabia', region: 'Middle East', timeZone: 'Asia/Riyadh' },
  { id: 'tel-aviv', name: 'Tel Aviv', country: 'Israel', region: 'Middle East', timeZone: 'Asia/Jerusalem' },
  { id: 'mumbai', name: 'Mumbai', country: 'India', region: 'Asia', timeZone: 'Asia/Kolkata' },
  { id: 'kathmandu', name: 'Kathmandu', country: 'Nepal', region: 'Asia', timeZone: 'Asia/Kathmandu' },
  { id: 'bangkok', name: 'Bangkok', country: 'Thailand', region: 'Asia', timeZone: 'Asia/Bangkok' },
  { id: 'singapore', name: 'Singapore', country: 'Singapore', region: 'Asia', timeZone: 'Asia/Singapore' },
  { id: 'hong-kong', name: 'Hong Kong', country: 'China', region: 'Asia', timeZone: 'Asia/Hong_Kong' },
  { id: 'tokyo', name: 'Tokyo', country: 'Japan', region: 'Asia', timeZone: 'Asia/Tokyo' },
  { id: 'seoul', name: 'Seoul', country: 'South Korea', region: 'Asia', timeZone: 'Asia/Seoul' },
  { id: 'denpasar', name: 'Denpasar', country: 'Indonesia', region: 'Asia', timeZone: 'Asia/Makassar' },
  { id: 'sydney', name: 'Sydney', country: 'Australia', region: 'Oceania', timeZone: 'Australia/Sydney' },
  { id: 'melbourne', name: 'Melbourne', country: 'Australia', region: 'Oceania', timeZone: 'Australia/Melbourne' },
  { id: 'auckland', name: 'Auckland', country: 'New Zealand', region: 'Oceania', timeZone: 'Pacific/Auckland' },
]

export const CITY_BY_ID = new Map(CITIES.map(city => [city.id, city]))
