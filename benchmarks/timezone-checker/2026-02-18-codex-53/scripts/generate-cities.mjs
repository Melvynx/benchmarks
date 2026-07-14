import { writeFileSync } from 'node:fs';
import { find } from 'geo-tz';

const restCountriesUrl = 'https://restcountries.com/v3.1/all?fields=name,capital,cca2,capitalInfo';

const usStateCapitals = [
  ['Montgomery', 'United States', 'America/Chicago'],
  ['Juneau', 'United States', 'America/Juneau'],
  ['Phoenix', 'United States', 'America/Phoenix'],
  ['Little Rock', 'United States', 'America/Chicago'],
  ['Sacramento', 'United States', 'America/Los_Angeles'],
  ['Denver', 'United States', 'America/Denver'],
  ['Hartford', 'United States', 'America/New_York'],
  ['Dover', 'United States', 'America/New_York'],
  ['Tallahassee', 'United States', 'America/New_York'],
  ['Atlanta', 'United States', 'America/New_York'],
  ['Honolulu', 'United States', 'Pacific/Honolulu'],
  ['Boise', 'United States', 'America/Boise'],
  ['Springfield', 'United States', 'America/Chicago'],
  ['Indianapolis', 'United States', 'America/Indiana/Indianapolis'],
  ['Des Moines', 'United States', 'America/Chicago'],
  ['Topeka', 'United States', 'America/Chicago'],
  ['Frankfort', 'United States', 'America/New_York'],
  ['Baton Rouge', 'United States', 'America/Chicago'],
  ['Augusta', 'United States', 'America/New_York'],
  ['Annapolis', 'United States', 'America/New_York'],
  ['Boston', 'United States', 'America/New_York'],
  ['Lansing', 'United States', 'America/Detroit'],
  ['Saint Paul', 'United States', 'America/Chicago'],
  ['Jackson', 'United States', 'America/Chicago'],
  ['Jefferson City', 'United States', 'America/Chicago'],
  ['Helena', 'United States', 'America/Denver'],
  ['Lincoln', 'United States', 'America/Chicago'],
  ['Carson City', 'United States', 'America/Los_Angeles'],
  ['Concord', 'United States', 'America/New_York'],
  ['Trenton', 'United States', 'America/New_York'],
  ['Santa Fe', 'United States', 'America/Denver'],
  ['Albany', 'United States', 'America/New_York'],
  ['Raleigh', 'United States', 'America/New_York'],
  ['Bismarck', 'United States', 'America/Chicago'],
  ['Columbus', 'United States', 'America/New_York'],
  ['Oklahoma City', 'United States', 'America/Chicago'],
  ['Salem', 'United States', 'America/Los_Angeles'],
  ['Harrisburg', 'United States', 'America/New_York'],
  ['Providence', 'United States', 'America/New_York'],
  ['Columbia', 'United States', 'America/New_York'],
  ['Pierre', 'United States', 'America/Chicago'],
  ['Nashville', 'United States', 'America/Chicago'],
  ['Austin', 'United States', 'America/Chicago'],
  ['Salt Lake City', 'United States', 'America/Denver'],
  ['Montpelier', 'United States', 'America/New_York'],
  ['Richmond', 'United States', 'America/New_York'],
  ['Olympia', 'United States', 'America/Los_Angeles'],
  ['Charleston', 'United States', 'America/New_York'],
  ['Madison', 'United States', 'America/Chicago'],
  ['Cheyenne', 'United States', 'America/Denver'],
  ['Washington', 'United States', 'America/New_York'],
];

const majorCities = [
  ['San Francisco', 'United States', 'America/Los_Angeles'],
  ['Los Angeles', 'United States', 'America/Los_Angeles'],
  ['Chicago', 'United States', 'America/Chicago'],
  ['Miami', 'United States', 'America/New_York'],
  ['Seattle', 'United States', 'America/Los_Angeles'],
  ['San Diego', 'United States', 'America/Los_Angeles'],
  ['Las Vegas', 'United States', 'America/Los_Angeles'],
  ['Portland', 'United States', 'America/Los_Angeles'],
  ['Houston', 'United States', 'America/Chicago'],
  ['Dallas', 'United States', 'America/Chicago'],
  ['Minneapolis', 'United States', 'America/Chicago'],
  ['Detroit', 'United States', 'America/Detroit'],
  ['Philadelphia', 'United States', 'America/New_York'],
  ['San Jose', 'United States', 'America/Los_Angeles'],
  ['Orlando', 'United States', 'America/New_York'],
  ['New York City', 'United States', 'America/New_York'],
  ['Toronto', 'Canada', 'America/Toronto'],
  ['Vancouver', 'Canada', 'America/Vancouver'],
  ['Montreal', 'Canada', 'America/Toronto'],
  ['Calgary', 'Canada', 'America/Edmonton'],
  ['Mexico City', 'Mexico', 'America/Mexico_City'],
  ['Monterrey', 'Mexico', 'America/Monterrey'],
  ['Sao Paulo', 'Brazil', 'America/Sao_Paulo'],
  ['Rio de Janeiro', 'Brazil', 'America/Sao_Paulo'],
  ['Buenos Aires', 'Argentina', 'America/Argentina/Buenos_Aires'],
  ['Santiago', 'Chile', 'America/Santiago'],
  ['Lima', 'Peru', 'America/Lima'],
  ['Bogota', 'Colombia', 'America/Bogota'],
  ['Quito', 'Ecuador', 'America/Guayaquil'],
  ['London', 'United Kingdom', 'Europe/London'],
  ['Manchester', 'United Kingdom', 'Europe/London'],
  ['Paris', 'France', 'Europe/Paris'],
  ['Lyon', 'France', 'Europe/Paris'],
  ['Bordeaux', 'France', 'Europe/Paris'],
  ['Marseille', 'France', 'Europe/Paris'],
  ['Berlin', 'Germany', 'Europe/Berlin'],
  ['Munich', 'Germany', 'Europe/Berlin'],
  ['Madrid', 'Spain', 'Europe/Madrid'],
  ['Barcelona', 'Spain', 'Europe/Madrid'],
  ['Rome', 'Italy', 'Europe/Rome'],
  ['Milan', 'Italy', 'Europe/Rome'],
  ['Geneva', 'Switzerland', 'Europe/Zurich'],
  ['Lausanne', 'Switzerland', 'Europe/Zurich'],
  ['Zürich', 'Switzerland', 'Europe/Zurich'],
  ['Amsterdam', 'Netherlands', 'Europe/Amsterdam'],
  ['Brussels', 'Belgium', 'Europe/Brussels'],
  ['Vienna', 'Austria', 'Europe/Vienna'],
  ['Prague', 'Czechia', 'Europe/Prague'],
  ['Warsaw', 'Poland', 'Europe/Warsaw'],
  ['Lisbon', 'Portugal', 'Europe/Lisbon'],
  ['Dublin', 'Ireland', 'Europe/Dublin'],
  ['Stockholm', 'Sweden', 'Europe/Stockholm'],
  ['Oslo', 'Norway', 'Europe/Oslo'],
  ['Copenhagen', 'Denmark', 'Europe/Copenhagen'],
  ['Helsinki', 'Finland', 'Europe/Helsinki'],
  ['Athens', 'Greece', 'Europe/Athens'],
  ['Istanbul', 'Turkey', 'Europe/Istanbul'],
  ['Cairo', 'Egypt', 'Africa/Cairo'],
  ['Nairobi', 'Kenya', 'Africa/Nairobi'],
  ['Lagos', 'Nigeria', 'Africa/Lagos'],
  ['Johannesburg', 'South Africa', 'Africa/Johannesburg'],
  ['Casablanca', 'Morocco', 'Africa/Casablanca'],
  ['Dubai', 'United Arab Emirates', 'Asia/Dubai'],
  ['Doha', 'Qatar', 'Asia/Qatar'],
  ['Riyadh', 'Saudi Arabia', 'Asia/Riyadh'],
  ['Tel Aviv', 'Israel', 'Asia/Jerusalem'],
  ['Mumbai', 'India', 'Asia/Kolkata'],
  ['Delhi', 'India', 'Asia/Kolkata'],
  ['Bengaluru', 'India', 'Asia/Kolkata'],
  ['Karachi', 'Pakistan', 'Asia/Karachi'],
  ['Dhaka', 'Bangladesh', 'Asia/Dhaka'],
  ['Bangkok', 'Thailand', 'Asia/Bangkok'],
  ['Singapore', 'Singapore', 'Asia/Singapore'],
  ['Kuala Lumpur', 'Malaysia', 'Asia/Kuala_Lumpur'],
  ['Jakarta', 'Indonesia', 'Asia/Jakarta'],
  ['Manila', 'Philippines', 'Asia/Manila'],
  ['Hong Kong', 'China', 'Asia/Hong_Kong'],
  ['Shanghai', 'China', 'Asia/Shanghai'],
  ['Beijing', 'China', 'Asia/Shanghai'],
  ['Seoul', 'South Korea', 'Asia/Seoul'],
  ['Tokyo', 'Japan', 'Asia/Tokyo'],
  ['Osaka', 'Japan', 'Asia/Tokyo'],
  ['Taipei', 'Taiwan', 'Asia/Taipei'],
  ['Sydney', 'Australia', 'Australia/Sydney'],
  ['Melbourne', 'Australia', 'Australia/Melbourne'],
  ['Brisbane', 'Australia', 'Australia/Brisbane'],
  ['Perth', 'Australia', 'Australia/Perth'],
  ['Auckland', 'New Zealand', 'Pacific/Auckland'],
  ['Wellington', 'New Zealand', 'Pacific/Auckland'],
  ['Honolulu', 'United States', 'Pacific/Honolulu'],
];

const normalize = (value) =>
  value
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

const countriesResponse = await fetch(restCountriesUrl);
if (!countriesResponse.ok) {
  throw new Error(`Failed to fetch countries: ${countriesResponse.status}`);
}

const countries = await countriesResponse.json();

const entries = [];

for (const country of countries) {
  const capital = Array.isArray(country.capital) ? country.capital[0] : null;
  const latlng = country.capitalInfo?.latlng;
  if (!capital || !latlng || latlng.length < 2) {
    continue;
  }

  const [lat, lng] = latlng;
  const timezones = find(lat, lng);
  if (!Array.isArray(timezones) || timezones.length === 0) {
    continue;
  }

  entries.push({
    city: capital,
    country: country.name.common,
    timeZone: timezones[0],
    tags: ['capital'],
  });
}

for (const [city, country, timeZone] of usStateCapitals) {
  entries.push({ city, country, timeZone, tags: ['state-capital'] });
}

for (const [city, country, timeZone] of majorCities) {
  entries.push({ city, country, timeZone, tags: ['major'] });
}

const seen = new Set();
const deduped = [];

for (const entry of entries) {
  const key = `${normalize(entry.city)}|${normalize(entry.country)}|${entry.timeZone}`;
  if (seen.has(key)) {
    continue;
  }
  seen.add(key);
  deduped.push(entry);
}

deduped.sort((a, b) => a.city.localeCompare(b.city) || a.country.localeCompare(b.country));

const fileHeader = `// Generated by scripts/generate-cities.mjs\n`;
const content = `${fileHeader}export const CITY_DATA = ${JSON.stringify(deduped, null, 2)};\n`;
writeFileSync(new URL('../src/data/cities.js', import.meta.url), content);

console.log(`Generated ${deduped.length} cities.`);
