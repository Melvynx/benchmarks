export type City = {
  id: string;
  name: string;
  country: string;
  timezone: string;
};

export const CITIES: City[] = [
  // North America
  { id: 'sf', name: 'San Francisco', country: 'USA', timezone: 'America/Los_Angeles' },
  { id: 'ny', name: 'New York', country: 'USA', timezone: 'America/New_York' },
  { id: 'chi', name: 'Chicago', country: 'USA', timezone: 'America/Chicago' },
  { id: 'mia', name: 'Miami', country: 'USA', timezone: 'America/New_York' },
  { id: 'tor', name: 'Toronto', country: 'Canada', timezone: 'America/Toronto' },
  { id: 'van', name: 'Vancouver', country: 'Canada', timezone: 'America/Vancouver' },
  { id: 'mex', name: 'Mexico City', country: 'Mexico', timezone: 'America/Mexico_City' },

  // South America
  { id: 'sp', name: 'São Paulo', country: 'Brazil', timezone: 'America/Sao_Paulo' },
  { id: 'ba', name: 'Buenos Aires', country: 'Argentina', timezone: 'America/Argentina/Buenos_Aires' },
  { id: 'bog', name: 'Bogotá', country: 'Colombia', timezone: 'America/Bogota' },

  // Europe
  { id: 'lon', name: 'London', country: 'UK', timezone: 'Europe/London' },
  { id: 'par', name: 'Paris', country: 'France', timezone: 'Europe/Paris' },
  { id: 'ber', name: 'Berlin', country: 'Germany', timezone: 'Europe/Berlin' },
  { id: 'mad', name: 'Madrid', country: 'Spain', timezone: 'Europe/Madrid' },
  { id: 'rom', name: 'Rome', country: 'Italy', timezone: 'Europe/Rome' },
  { id: 'gva', name: 'Geneva', country: 'Switzerland', timezone: 'Europe/Zurich' },
  { id: 'ams', name: 'Amsterdam', country: 'Netherlands', timezone: 'Europe/Amsterdam' },
  { id: 'lis', name: 'Lisbon', country: 'Portugal', timezone: 'Europe/Lisbon' },
  { id: 'waw', name: 'Warsaw', country: 'Poland', timezone: 'Europe/Warsaw' },
  { id: 'kie', name: 'Kyiv', country: 'Ukraine', timezone: 'Europe/Kyiv' },

  // Africa / Middle East
  { id: 'cpt', name: 'Cape Town', country: 'South Africa', timezone: 'Africa/Johannesburg' },
  { id: 'cai', name: 'Cairo', country: 'Egypt', timezone: 'Africa/Cairo' },
  { id: 'dxb', name: 'Dubai', country: 'UAE', timezone: 'Asia/Dubai' },
  { id: 'jed', name: 'Jeddah', country: 'Saudi Arabia', timezone: 'Asia/Riyadh' },

  // Asia
  { id: 'tok', name: 'Tokyo', country: 'Japan', timezone: 'Asia/Tokyo' },
  { id: 'seo', name: 'Seoul', country: 'South Korea', timezone: 'Asia/Seoul' },
  { id: 'sin', name: 'Singapore', country: 'Singapore', timezone: 'Asia/Singapore' },
  { id: 'hkg', name: 'Hong Kong', country: 'Hong Kong', timezone: 'Asia/Hong_Kong' },
  { id: 'bkk', name: 'Bangkok', country: 'Thailand', timezone: 'Asia/Bangkok' },
  { id: 'dps', name: 'Denpasar', country: 'Indonesia', timezone: 'Asia/Makassar' }, // Bali time!
  { id: 'jkt', name: 'Jakarta', country: 'Indonesia', timezone: 'Asia/Jakarta' },
  { id: 'del', name: 'New Delhi', country: 'India', timezone: 'Asia/Kolkata' }, // IST is +5:30
  { id: 'ktm', name: 'Kathmandu', country: 'Nepal', timezone: 'Asia/Kathmandu' }, // +5:45

  // Oceania
  { id: 'syd', name: 'Sydney', country: 'Australia', timezone: 'Australia/Sydney' },
  { id: 'mel', name: 'Melbourne', country: 'Australia', timezone: 'Australia/Melbourne' },
  { id: 'akl', name: 'Auckland', country: 'New Zealand', timezone: 'Pacific/Auckland' },
];

export const getCityById = (id: string) => CITIES.find((c) => c.id === id);
