export interface City {
  id: string
  name: string
  country: string
  timezone: string
  flag: string
}

export const CITIES: City[] = [
  // North America
  { id: 'san-francisco', name: 'San Francisco', country: 'USA', timezone: 'America/Los_Angeles', flag: '🇺🇸' },
  { id: 'los-angeles', name: 'Los Angeles', country: 'USA', timezone: 'America/Los_Angeles', flag: '🇺🇸' },
  { id: 'denver', name: 'Denver', country: 'USA', timezone: 'America/Denver', flag: '🇺🇸' },
  { id: 'chicago', name: 'Chicago', country: 'USA', timezone: 'America/Chicago', flag: '🇺🇸' },
  { id: 'new-york', name: 'New York', country: 'USA', timezone: 'America/New_York', flag: '🇺🇸' },
  { id: 'toronto', name: 'Toronto', country: 'Canada', timezone: 'America/Toronto', flag: '🇨🇦' },
  { id: 'mexico-city', name: 'Mexico City', country: 'Mexico', timezone: 'America/Mexico_City', flag: '🇲🇽' },
  // South America
  { id: 'sao-paulo', name: 'São Paulo', country: 'Brazil', timezone: 'America/Sao_Paulo', flag: '🇧🇷' },
  { id: 'buenos-aires', name: 'Buenos Aires', country: 'Argentina', timezone: 'America/Argentina/Buenos_Aires', flag: '🇦🇷' },
  { id: 'bogota', name: 'Bogotá', country: 'Colombia', timezone: 'America/Bogota', flag: '🇨🇴' },
  { id: 'santiago', name: 'Santiago', country: 'Chile', timezone: 'America/Santiago', flag: '🇨🇱' },
  // Europe
  { id: 'london', name: 'London', country: 'UK', timezone: 'Europe/London', flag: '🇬🇧' },
  { id: 'paris', name: 'Paris', country: 'France', timezone: 'Europe/Paris', flag: '🇫🇷' },
  { id: 'geneva', name: 'Geneva', country: 'Switzerland', timezone: 'Europe/Zurich', flag: '🇨🇭' },
  { id: 'berlin', name: 'Berlin', country: 'Germany', timezone: 'Europe/Berlin', flag: '🇩🇪' },
  { id: 'amsterdam', name: 'Amsterdam', country: 'Netherlands', timezone: 'Europe/Amsterdam', flag: '🇳🇱' },
  { id: 'stockholm', name: 'Stockholm', country: 'Sweden', timezone: 'Europe/Stockholm', flag: '🇸🇪' },
  { id: 'moscow', name: 'Moscow', country: 'Russia', timezone: 'Europe/Moscow', flag: '🇷🇺' },
  { id: 'istanbul', name: 'Istanbul', country: 'Turkey', timezone: 'Europe/Istanbul', flag: '🇹🇷' },
  // Africa
  { id: 'cairo', name: 'Cairo', country: 'Egypt', timezone: 'Africa/Cairo', flag: '🇪🇬' },
  { id: 'lagos', name: 'Lagos', country: 'Nigeria', timezone: 'Africa/Lagos', flag: '🇳🇬' },
  { id: 'nairobi', name: 'Nairobi', country: 'Kenya', timezone: 'Africa/Nairobi', flag: '🇰🇪' },
  { id: 'johannesburg', name: 'Johannesburg', country: 'South Africa', timezone: 'Africa/Johannesburg', flag: '🇿🇦' },
  // Middle East
  { id: 'dubai', name: 'Dubai', country: 'UAE', timezone: 'Asia/Dubai', flag: '🇦🇪' },
  { id: 'riyadh', name: 'Riyadh', country: 'Saudi Arabia', timezone: 'Asia/Riyadh', flag: '🇸🇦' },
  { id: 'tel-aviv', name: 'Tel Aviv', country: 'Israel', timezone: 'Asia/Jerusalem', flag: '🇮🇱' },
  // Asia
  { id: 'mumbai', name: 'Mumbai', country: 'India', timezone: 'Asia/Kolkata', flag: '🇮🇳' },
  { id: 'kathmandu', name: 'Kathmandu', country: 'Nepal', timezone: 'Asia/Kathmandu', flag: '🇳🇵' },
  { id: 'bangkok', name: 'Bangkok', country: 'Thailand', timezone: 'Asia/Bangkok', flag: '🇹🇭' },
  { id: 'denpasar', name: 'Denpasar', country: 'Indonesia', timezone: 'Asia/Makassar', flag: '🇮🇩' },
  { id: 'singapore', name: 'Singapore', country: 'Singapore', timezone: 'Asia/Singapore', flag: '🇸🇬' },
  { id: 'hong-kong', name: 'Hong Kong', country: 'China', timezone: 'Asia/Hong_Kong', flag: '🇭🇰' },
  { id: 'tokyo', name: 'Tokyo', country: 'Japan', timezone: 'Asia/Tokyo', flag: '🇯🇵' },
  { id: 'seoul', name: 'Seoul', country: 'South Korea', timezone: 'Asia/Seoul', flag: '🇰🇷' },
  // Oceania
  { id: 'sydney', name: 'Sydney', country: 'Australia', timezone: 'Australia/Sydney', flag: '🇦🇺' },
  { id: 'auckland', name: 'Auckland', country: 'New Zealand', timezone: 'Pacific/Auckland', flag: '🇳🇿' },
]
