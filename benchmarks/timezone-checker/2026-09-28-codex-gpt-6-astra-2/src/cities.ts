export interface City {
  id: string;
  name: string;
  country: string;
  timezone: string;
  flag: string;
  region: string;
}

export const CITIES: City[] = [
  { id: 'san-francisco', name: 'San Francisco', country: 'United States', timezone: 'America/Los_Angeles', flag: '🇺🇸', region: 'North America' },
  { id: 'los-angeles', name: 'Los Angeles', country: 'United States', timezone: 'America/Los_Angeles', flag: '🇺🇸', region: 'North America' },
  { id: 'vancouver', name: 'Vancouver', country: 'Canada', timezone: 'America/Vancouver', flag: '🇨🇦', region: 'North America' },
  { id: 'chicago', name: 'Chicago', country: 'United States', timezone: 'America/Chicago', flag: '🇺🇸', region: 'North America' },
  { id: 'new-york', name: 'New York', country: 'United States', timezone: 'America/New_York', flag: '🇺🇸', region: 'North America' },
  { id: 'toronto', name: 'Toronto', country: 'Canada', timezone: 'America/Toronto', flag: '🇨🇦', region: 'North America' },
  { id: 'mexico-city', name: 'Mexico City', country: 'Mexico', timezone: 'America/Mexico_City', flag: '🇲🇽', region: 'North America' },
  { id: 'bogota', name: 'Bogotá', country: 'Colombia', timezone: 'America/Bogota', flag: '🇨🇴', region: 'South America' },
  { id: 'sao-paulo', name: 'São Paulo', country: 'Brazil', timezone: 'America/Sao_Paulo', flag: '🇧🇷', region: 'South America' },
  { id: 'buenos-aires', name: 'Buenos Aires', country: 'Argentina', timezone: 'America/Argentina/Buenos_Aires', flag: '🇦🇷', region: 'South America' },
  { id: 'london', name: 'London', country: 'United Kingdom', timezone: 'Europe/London', flag: '🇬🇧', region: 'Europe' },
  { id: 'lisbon', name: 'Lisbon', country: 'Portugal', timezone: 'Europe/Lisbon', flag: '🇵🇹', region: 'Europe' },
  { id: 'paris', name: 'Paris', country: 'France', timezone: 'Europe/Paris', flag: '🇫🇷', region: 'Europe' },
  { id: 'geneva', name: 'Geneva', country: 'Switzerland', timezone: 'Europe/Zurich', flag: '🇨🇭', region: 'Europe' },
  { id: 'berlin', name: 'Berlin', country: 'Germany', timezone: 'Europe/Berlin', flag: '🇩🇪', region: 'Europe' },
  { id: 'istanbul', name: 'Istanbul', country: 'Türkiye', timezone: 'Europe/Istanbul', flag: '🇹🇷', region: 'Europe' },
  { id: 'cape-town', name: 'Cape Town', country: 'South Africa', timezone: 'Africa/Johannesburg', flag: '🇿🇦', region: 'Africa' },
  { id: 'lagos', name: 'Lagos', country: 'Nigeria', timezone: 'Africa/Lagos', flag: '🇳🇬', region: 'Africa' },
  { id: 'nairobi', name: 'Nairobi', country: 'Kenya', timezone: 'Africa/Nairobi', flag: '🇰🇪', region: 'Africa' },
  { id: 'cairo', name: 'Cairo', country: 'Egypt', timezone: 'Africa/Cairo', flag: '🇪🇬', region: 'Africa' },
  { id: 'dubai', name: 'Dubai', country: 'United Arab Emirates', timezone: 'Asia/Dubai', flag: '🇦🇪', region: 'Middle East' },
  { id: 'riyadh', name: 'Riyadh', country: 'Saudi Arabia', timezone: 'Asia/Riyadh', flag: '🇸🇦', region: 'Middle East' },
  { id: 'mumbai', name: 'Mumbai', country: 'India', timezone: 'Asia/Kolkata', flag: '🇮🇳', region: 'Asia' },
  { id: 'kathmandu', name: 'Kathmandu', country: 'Nepal', timezone: 'Asia/Kathmandu', flag: '🇳🇵', region: 'Asia' },
  { id: 'bangkok', name: 'Bangkok', country: 'Thailand', timezone: 'Asia/Bangkok', flag: '🇹🇭', region: 'Asia' },
  { id: 'singapore', name: 'Singapore', country: 'Singapore', timezone: 'Asia/Singapore', flag: '🇸🇬', region: 'Asia' },
  { id: 'denpasar', name: 'Denpasar', country: 'Indonesia', timezone: 'Asia/Makassar', flag: '🇮🇩', region: 'Asia' },
  { id: 'hong-kong', name: 'Hong Kong', country: 'China', timezone: 'Asia/Hong_Kong', flag: '🇭🇰', region: 'Asia' },
  { id: 'shanghai', name: 'Shanghai', country: 'China', timezone: 'Asia/Shanghai', flag: '🇨🇳', region: 'Asia' },
  { id: 'seoul', name: 'Seoul', country: 'South Korea', timezone: 'Asia/Seoul', flag: '🇰🇷', region: 'Asia' },
  { id: 'tokyo', name: 'Tokyo', country: 'Japan', timezone: 'Asia/Tokyo', flag: '🇯🇵', region: 'Asia' },
  { id: 'perth', name: 'Perth', country: 'Australia', timezone: 'Australia/Perth', flag: '🇦🇺', region: 'Oceania' },
  { id: 'sydney', name: 'Sydney', country: 'Australia', timezone: 'Australia/Sydney', flag: '🇦🇺', region: 'Oceania' },
  { id: 'auckland', name: 'Auckland', country: 'New Zealand', timezone: 'Pacific/Auckland', flag: '🇳🇿', region: 'Oceania' },
];

export const DEFAULT_CITIES = ['san-francisco', 'denpasar', 'geneva'];
