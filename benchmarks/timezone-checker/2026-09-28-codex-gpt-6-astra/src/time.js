export const CITIES = [
  ['san-francisco','San Francisco','United States','America/Los_Angeles','US'],
  ['denpasar','Denpasar','Indonesia','Asia/Makassar','ID'],
  ['geneva','Geneva','Switzerland','Europe/Zurich','CH'],
  ['new-york','New York','United States','America/New_York','US'],
  ['los-angeles','Los Angeles','United States','America/Los_Angeles','US'],
  ['chicago','Chicago','United States','America/Chicago','US'],
  ['toronto','Toronto','Canada','America/Toronto','CA'],
  ['vancouver','Vancouver','Canada','America/Vancouver','CA'],
  ['mexico-city','Mexico City','Mexico','America/Mexico_City','MX'],
  ['sao-paulo','São Paulo','Brazil','America/Sao_Paulo','BR'],
  ['buenos-aires','Buenos Aires','Argentina','America/Argentina/Buenos_Aires','AR'],
  ['bogota','Bogotá','Colombia','America/Bogota','CO'],
  ['london','London','United Kingdom','Europe/London','GB'],
  ['paris','Paris','France','Europe/Paris','FR'],
  ['berlin','Berlin','Germany','Europe/Berlin','DE'],
  ['lisbon','Lisbon','Portugal','Europe/Lisbon','PT'],
  ['amsterdam','Amsterdam','Netherlands','Europe/Amsterdam','NL'],
  ['istanbul','Istanbul','Türkiye','Europe/Istanbul','TR'],
  ['cape-town','Cape Town','South Africa','Africa/Johannesburg','ZA'],
  ['nairobi','Nairobi','Kenya','Africa/Nairobi','KE'],
  ['lagos','Lagos','Nigeria','Africa/Lagos','NG'],
  ['cairo','Cairo','Egypt','Africa/Cairo','EG'],
  ['dubai','Dubai','United Arab Emirates','Asia/Dubai','AE'],
  ['tel-aviv','Tel Aviv','Israel','Asia/Jerusalem','IL'],
  ['mumbai','Mumbai','India','Asia/Kolkata','IN'],
  ['kathmandu','Kathmandu','Nepal','Asia/Kathmandu','NP'],
  ['bangkok','Bangkok','Thailand','Asia/Bangkok','TH'],
  ['singapore','Singapore','Singapore','Asia/Singapore','SG'],
  ['hong-kong','Hong Kong','China','Asia/Hong_Kong','HK'],
  ['tokyo','Tokyo','Japan','Asia/Tokyo','JP'],
  ['seoul','Seoul','South Korea','Asia/Seoul','KR'],
  ['sydney','Sydney','Australia','Australia/Sydney','AU'],
  ['perth','Perth','Australia','Australia/Perth','AU'],
  ['auckland','Auckland','New Zealand','Pacific/Auckland','NZ'],
].map(([id,name,country,zone,code]) => ({id,name,country,zone,code}));
export const DEFAULTS = {
  cityIds: ['san-francisco', 'denpasar', 'geneva'],
  mode: 'meeting', wake: 7, sleep: 23, format: '12',
};

export const mod = (number, base = 1440) => ((number % base) + base) % base;

export function offsetMinutes(zone, date = new Date()) {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: zone, timeZoneName: 'longOffset',
  });
  const offset = formatter.formatToParts(date).find(part => part.type === 'timeZoneName').value;
  const match = offset.match(/GMT([+-])(\d{2}):(\d{2})/);
  if (!match) return 0;
  return (match[1] === '+' ? 1 : -1) * (Number(match[2]) * 60 + Number(match[3]));
}

export function offsetLabel(offset) {
  const absolute = Math.abs(offset);
  const minutes = absolute % 60 ? ':' + String(absolute % 60).padStart(2, '0') : '';
  return `UTC${offset < 0 ? '−' : '+'}${Math.floor(absolute / 60)}${minutes}`;
}

export function isAwake(minute, wake, sleep) {
  const localMinute = mod(minute);
  const start = wake * 60;
  const end = sleep * 60;
  if (start === end) return true;
  return start < end
    ? localMinute >= start && localMinute < end
    : localMinute >= start || localMinute < end;
}

export function formatTime(minute, format = '12', compact = false) {
  const localMinute = mod(minute);
  const hours = Math.floor(localMinute / 60);
  const minutes = localMinute % 60;
  if (format === '24') return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
  const minuteLabel = minutes ? ':' + String(minutes).padStart(2, '0') : '';
  const period = compact ? '' : hours < 12 ? 'am' : 'pm';
  return `${hours % 12 || 12}${minuteLabel}${period}`;
}

export function calculate(cities, settings, date = new Date()) {
  if (!cities.length) return { rows: [], common: [], windows: [] };
  const offsets = cities.map(city => offsetMinutes(city.zone, date));
  const rows = cities.map((city, index) => ({
    ...city, offset: offsets[index], delta: offsets[index] - offsets[0],
  }));
  const common = Array.from({ length: 1440 }, (_, minute) =>
    rows.every(row => isAwake(minute + row.delta, settings.wake, settings.sleep))
  );

  for (const row of rows) {
    row.availability = settings.mode === 'meeting' ? common : Array.from({ length: 1440 }, (_, minute) =>
      isAwake(minute, settings.wake, settings.sleep) &&
      isAwake(minute + row.delta, settings.wake, settings.sleep)
    );
    row.windows = getWindows(row.availability);
  }

  if (settings.mode === 'base' && rows.length > 1) {
    const comparisons = rows.slice(1);
    rows[0].availability = Array.from({ length: 1440 }, (_, minute) =>
      comparisons.some(row => row.availability[minute])
    );
    rows[0].windows = getWindows(rows[0].availability);
  }
  return { rows, common, windows: getWindows(common) };
}

// The extra iteration closes a range ending at midnight (minute 1440).
export function getWindows(minutes) {
  const windows = [];
  let start = null;
  for (let minute = 0; minute <= minutes.length; minute++) {
    if (minutes[minute] && start === null) start = minute;
    if (!minutes[minute] && start !== null) {
      windows.push([start, minute]);
      start = null;
    }
  }
  return windows;
}

export function duration(windows) {
  const minutes = windows.reduce((total, [start, end]) => total + end - start, 0);
  const hours = Math.floor(minutes / 60);
  if (minutes % 60 === 0) return `${hours} ${hours === 1 ? 'hour' : 'hours'}`;
  return hours ? `${hours}h ${minutes % 60}m` : `${minutes}m`;
}

const validHour = value => Number.isInteger(value) && value >= 0 && value <= 23;

export function restore() {
  try {
    const saved = JSON.parse(localStorage.getItem('common-hours-v1'));
    if (!saved || typeof saved !== 'object') return DEFAULTS;
    return {
      cityIds: Array.isArray(saved.cityIds)
        ? [...new Set(saved.cityIds.filter(id => CITIES.some(city => city.id === id)))]
        : DEFAULTS.cityIds,
      mode: saved.mode === 'base' ? 'base' : 'meeting',
      wake: validHour(saved.wake) ? saved.wake : 7,
      sleep: validHour(saved.sleep) ? saved.sleep : 23,
      format: saved.format === '24' ? '24' : '12',
    };
  } catch { return DEFAULTS; }
}
