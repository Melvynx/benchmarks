export const CITY_CATALOG = [
  { id: 'san-francisco', city: 'San Francisco', country: 'United States', countryCode: 'US', zone: 'America/Los_Angeles', region: 'North America', code: 'SFO' },
  { id: 'new-york', city: 'New York', country: 'United States', countryCode: 'US', zone: 'America/New_York', region: 'North America', code: 'NYC' },
  { id: 'toronto', city: 'Toronto', country: 'Canada', countryCode: 'CA', zone: 'America/Toronto', region: 'North America', code: 'YYZ' },
  { id: 'vancouver', city: 'Vancouver', country: 'Canada', countryCode: 'CA', zone: 'America/Vancouver', region: 'North America', code: 'YVR' },
  { id: 'mexico-city', city: 'Mexico City', country: 'Mexico', countryCode: 'MX', zone: 'America/Mexico_City', region: 'North America', code: 'MEX' },
  { id: 'sao-paulo', city: 'São Paulo', country: 'Brazil', countryCode: 'BR', zone: 'America/Sao_Paulo', region: 'South America', code: 'GRU' },
  { id: 'buenos-aires', city: 'Buenos Aires', country: 'Argentina', countryCode: 'AR', zone: 'America/Argentina/Buenos_Aires', region: 'South America', code: 'EZE' },
  { id: 'london', city: 'London', country: 'United Kingdom', countryCode: 'GB', zone: 'Europe/London', region: 'Europe', code: 'LHR' },
  { id: 'lisbon', city: 'Lisbon', country: 'Portugal', countryCode: 'PT', zone: 'Europe/Lisbon', region: 'Europe', code: 'LIS' },
  { id: 'paris', city: 'Paris', country: 'France', countryCode: 'FR', zone: 'Europe/Paris', region: 'Europe', code: 'CDG' },
  { id: 'geneva', city: 'Geneva', country: 'Switzerland', countryCode: 'CH', zone: 'Europe/Zurich', region: 'Europe', code: 'GVA' },
  { id: 'berlin', city: 'Berlin', country: 'Germany', countryCode: 'DE', zone: 'Europe/Berlin', region: 'Europe', code: 'BER' },
  { id: 'stockholm', city: 'Stockholm', country: 'Sweden', countryCode: 'SE', zone: 'Europe/Stockholm', region: 'Europe', code: 'ARN' },
  { id: 'madrid', city: 'Madrid', country: 'Spain', countryCode: 'ES', zone: 'Europe/Madrid', region: 'Europe', code: 'MAD' },
  { id: 'athens', city: 'Athens', country: 'Greece', countryCode: 'GR', zone: 'Europe/Athens', region: 'Europe', code: 'ATH' },
  { id: 'cape-town', city: 'Cape Town', country: 'South Africa', countryCode: 'ZA', zone: 'Africa/Johannesburg', region: 'Africa', code: 'CPT' },
  { id: 'lagos', city: 'Lagos', country: 'Nigeria', countryCode: 'NG', zone: 'Africa/Lagos', region: 'Africa', code: 'LOS' },
  { id: 'nairobi', city: 'Nairobi', country: 'Kenya', countryCode: 'KE', zone: 'Africa/Nairobi', region: 'Africa', code: 'NBO' },
  { id: 'cairo', city: 'Cairo', country: 'Egypt', countryCode: 'EG', zone: 'Africa/Cairo', region: 'Africa', code: 'CAI' },
  { id: 'dubai', city: 'Dubai', country: 'United Arab Emirates', countryCode: 'AE', zone: 'Asia/Dubai', region: 'Middle East', code: 'DXB' },
  { id: 'tel-aviv', city: 'Tel Aviv', country: 'Israel', countryCode: 'IL', zone: 'Asia/Jerusalem', region: 'Middle East', code: 'TLV' },
  { id: 'mumbai', city: 'Mumbai', country: 'India', countryCode: 'IN', zone: 'Asia/Kolkata', region: 'Asia', code: 'BOM' },
  { id: 'kathmandu', city: 'Kathmandu', country: 'Nepal', countryCode: 'NP', zone: 'Asia/Kathmandu', region: 'Asia', code: 'KTM' },
  { id: 'bangkok', city: 'Bangkok', country: 'Thailand', countryCode: 'TH', zone: 'Asia/Bangkok', region: 'Asia', code: 'BKK' },
  { id: 'singapore', city: 'Singapore', country: 'Singapore', countryCode: 'SG', zone: 'Asia/Singapore', region: 'Asia', code: 'SIN' },
  { id: 'denpasar', city: 'Denpasar', country: 'Indonesia', countryCode: 'ID', zone: 'Asia/Makassar', region: 'Asia', code: 'DPS' },
  { id: 'hong-kong', city: 'Hong Kong', country: 'Hong Kong', countryCode: 'HK', zone: 'Asia/Hong_Kong', region: 'Asia', code: 'HKG' },
  { id: 'tokyo', city: 'Tokyo', country: 'Japan', countryCode: 'JP', zone: 'Asia/Tokyo', region: 'Asia', code: 'HND' },
  { id: 'seoul', city: 'Seoul', country: 'South Korea', countryCode: 'KR', zone: 'Asia/Seoul', region: 'Asia', code: 'ICN' },
  { id: 'shanghai', city: 'Shanghai', country: 'China', countryCode: 'CN', zone: 'Asia/Shanghai', region: 'Asia', code: 'PVG' },
  { id: 'perth', city: 'Perth', country: 'Australia', countryCode: 'AU', zone: 'Australia/Perth', region: 'Oceania', code: 'PER' },
  { id: 'sydney', city: 'Sydney', country: 'Australia', countryCode: 'AU', zone: 'Australia/Sydney', region: 'Oceania', code: 'SYD' },
  { id: 'melbourne', city: 'Melbourne', country: 'Australia', countryCode: 'AU', zone: 'Australia/Melbourne', region: 'Oceania', code: 'MEL' },
  { id: 'auckland', city: 'Auckland', country: 'New Zealand', countryCode: 'NZ', zone: 'Pacific/Auckland', region: 'Oceania', code: 'AKL' },
];

export const DEFAULT_CITY_IDS = ['san-francisco', 'denpasar', 'geneva'];

const numberFormatter = new Intl.NumberFormat('en-US', { minimumIntegerDigits: 2, useGrouping: false });

export function getOffsetMinutes(zone, date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: zone,
    timeZoneName: 'longOffset',
  }).formatToParts(date);
  const value = parts.find((part) => part.type === 'timeZoneName')?.value ?? 'GMT';
  const match = value.match(/GMT(?:(\+|−|-)(\d{1,2})(?::(\d{2}))?)?/);
  if (!match || !match[1]) return 0;
  const minutes = Number(match[2]) * 60 + Number(match[3] ?? 0);
  return (match[1] === '-' || match[1] === '−' ? -1 : 1) * minutes;
}

export function formatOffset(minutes) {
  if (minutes === 0) return 'UTC';
  const sign = minutes > 0 ? '+' : '−';
  const absolute = Math.abs(minutes);
  const hours = Math.floor(absolute / 60);
  const rest = absolute % 60;
  return `UTC${sign}${hours}${rest ? `:${numberFormatter.format(rest)}` : ''}`;
}

export function getZonedParts(date, zone) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: zone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date);
  return Object.fromEntries(parts.filter(({ type }) => type !== 'literal').map(({ type, value }) => [type, Number(value)]));
}

export function getTodayInZone(zone, date = new Date()) {
  const parts = getZonedParts(date, zone);
  return { year: parts.year, month: parts.month, day: parts.day };
}

export function localHourToDate({ year, month, day }, hour, zone) {
  const target = Date.UTC(year, month - 1, day, hour, 0);
  let result = new Date(target - getOffsetMinutes(zone, new Date(target)) * 60000);
  const observed = getZonedParts(result, zone);
  const observedTarget = Date.UTC(observed.year, observed.month - 1, observed.day, observed.hour, observed.minute);
  const correction = target - observedTarget;
  if (correction !== 0) result = new Date(result.getTime() + correction);
  return result;
}

export function getLocalHourForReferenceHour(referenceDate, referenceZone, cityZone) {
  const parts = getZonedParts(referenceDate, cityZone);
  return { hour: parts.hour, minute: parts.minute };
}

export function formatHour(hour, format = '12h') {
  if (format === '24h') return `${numberFormatter.format(hour)}:00`;
  const normalized = hour % 12 || 12;
  return `${normalized}${hour < 12 ? 'am' : 'pm'}`;
}

export function formatLocalTime({ hour, minute }, format = '12h') {
  if (format === '24h') return `${numberFormatter.format(hour)}:${numberFormatter.format(minute)}`;
  const normalized = hour % 12 || 12;
  return `${normalized}:${numberFormatter.format(minute)}${hour < 12 ? 'am' : 'pm'}`;
}

export function isAwake(hour, wake, sleep) {
  if (wake === sleep) return true;
  return wake < sleep ? hour >= wake && hour < sleep : hour >= wake || hour < sleep;
}

export function getRanges(hours) {
  if (!hours.length) return [];
  const sorted = [...hours].sort((a, b) => a - b);
  const ranges = [];
  let start = sorted[0];
  let previous = sorted[0];
  for (const hour of sorted.slice(1)) {
    if (hour !== previous + 1) {
      ranges.push({ start, end: previous + 1 });
      start = hour;
    }
    previous = hour;
  }
  ranges.push({ start, end: previous + 1 });
  if (ranges.length > 1 && ranges[0].start === 0 && ranges.at(-1).end === 24) {
    const ending = ranges.pop();
    const beginning = ranges.shift();
    ranges.unshift({ start: ending.start, end: beginning.end });
  }
  return ranges;
}

export function formatRange(range, format = '12h') {
  return `${formatHour(range.start % 24, format)} – ${formatHour(range.end % 24, format)}`;
}

export function getUtcDateLabel(zone, date = new Date()) {
  return new Intl.DateTimeFormat('en-US', { timeZone: zone, weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }).format(date);
}
