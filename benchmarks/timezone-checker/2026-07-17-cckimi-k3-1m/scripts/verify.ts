/**
 * Self-contained verification: timezone math, overlap computation for both
 * modes, and a full server-side render of the App with default settings.
 * Run with `pnpm test`.
 */
import { createElement } from 'react';
import { renderToString } from 'react-dom/server';
import App from '../src/App';
import { CITIES, CITY_BY_ID, DEFAULT_CITY_IDS } from '../src/lib/cities';
import { buildGrid } from '../src/lib/overlap';
import {
  formatOffset,
  formatRange,
  getOffsetMinutes,
  isAwake,
  localHourToUtc,
  toRanges,
} from '../src/lib/time';

let failures = 0;
function check(name: string, cond: boolean) {
  if (cond) console.log(`  ok  ${name}`);
  else {
    failures++;
    console.error(`FAIL  ${name}`);
  }
}

const july = Date.UTC(2026, 6, 17, 12, 0, 0); // northern summer → DST active in US/EU
const jan = Date.UTC(2026, 0, 17, 12, 0, 0);

// --- catalog ---
check('catalog has ~34+ cities', CITIES.length >= 30 && CITIES.length <= 45);
check('default cities exist', DEFAULT_CITY_IDS.every((id) => CITY_BY_ID.has(id)));
check('all regions covered', ['North America', 'South America', 'Europe', 'Africa', 'Middle East', 'Asia', 'Oceania'].every((r) => CITIES.some((c) => c.region === r)));

// --- offsets / DST ---
check('SF is UTC-7 in July (PDT)', getOffsetMinutes('America/Los_Angeles', july) === -420);
check('SF is UTC-8 in January (PST)', getOffsetMinutes('America/Los_Angeles', jan) === -480);
check('Geneva is UTC+2 in July (CEST)', getOffsetMinutes('Europe/Zurich', july) === 120);
check('Geneva is UTC+1 in January (CET)', getOffsetMinutes('Europe/Zurich', jan) === 60);
check('Denpasar stays UTC+8 (no DST)', getOffsetMinutes('Asia/Makassar', jan) === 480);
check('Kathmandu is UTC+5:45', getOffsetMinutes('Asia/Kathmandu', july) === 345);
check('Mumbai is UTC+5:30', getOffsetMinutes('Asia/Kolkata', july) === 330);

// --- local hour → UTC instant ---
check(
  'SF 9:00 PDT = 16:00 UTC',
  localHourToUtc('America/Los_Angeles', 2026, 7, 17, 9) === Date.UTC(2026, 6, 17, 16),
);
check(
  'Kathmandu 9:00 = 03:15 UTC (fractional)',
  localHourToUtc('Asia/Kathmandu', 2026, 7, 17, 9) === Date.UTC(2026, 6, 17, 3, 15),
);

// --- awake window ---
check('normal window 7–23', isAwake(7, 7, 23) && isAwake(22.99, 7, 23) && !isAwake(23, 7, 23) && !isAwake(6.99, 7, 23));
check('overnight window 22–6', isAwake(22, 22, 6) && isAwake(3, 22, 6) && !isAwake(12, 22, 6) && !isAwake(6, 22, 6));
check('wake === sleep means always awake', isAwake(0, 8, 8) && isAwake(12, 8, 8) && isAwake(23.5, 8, 8));

// --- ranges ---
const flags = Array.from({ length: 24 }, (_, h) => (h >= 2 && h < 5) || h === 22);
const ranges = toRanges(flags);
check('toRanges splits non-contiguous runs', ranges.length === 2 && ranges[0].start === 2 && ranges[0].end === 5 && ranges[1].start === 22 && ranges[1].end === 23);
check('range end runs to 24', toRanges(Array.from({ length: 24 }, (_, h) => h >= 20))[0].end === 24);
check('formatRange 12h (end exclusive)', formatRange({ start: 9, end: 12 }, true) === '9am – 12pm');
check('formatRange 24h midnight end', formatRange({ start: 9, end: 24 }, false) === '09:00 – 24:00');
check('formatOffset whole hours', formatOffset(-420) === 'UTC−7' && formatOffset(120) === 'UTC+2');
check('formatOffset fractional', formatOffset(345) === 'UTC+5:45');

// --- grid: default cities, meeting mode (July, deterministic) ---
const defaultCities = DEFAULT_CITY_IDS.map((id) => CITY_BY_ID.get(id)!);
const meeting = buildGrid(defaultCities, 'meeting', 7, 23, july)!;
check('reference city is first city', meeting.refCity.id === 'san-francisco');
check('meeting overlap = {7am, 10pm} in SF time', meeting.meetingCount === 2);
check(
  'meeting ranges are 7am–8am and 10pm–11pm',
  meeting.meetingRanges.length === 2 &&
    meeting.meetingRanges[0].start === 7 &&
    meeting.meetingRanges[0].end === 8 &&
    meeting.meetingRanges[1].start === 22 &&
    meeting.meetingRanges[1].end === 23,
);
check(
  'meeting mode: every row shares the same flags',
  meeting.rows.every((r) => r.overlapFlags.every((f, i) => f === meeting.meetingFlags[i])),
);
check(
  'overlap cells are always awake',
  meeting.rows.every((r) => r.cells.every((c) => !c.overlap || c.awake)),
);

// --- grid: base mode ---
const base = buildGrid(defaultCities, 'base', 7, 23, july)!;
check('base: Geneva vs SF overlap = 8h', base.rows[2].overlapCount === 8);
check('base: Denpasar vs SF overlap = 8h', base.rows[1].overlapCount === 8);
check('base: reference row is the union (14h)', base.rows[0].overlapCount === 14);
check(
  'base: cities highlight different hours than meeting mode',
  base.rows[1].overlapFlags.some((f, i) => f !== meeting.meetingFlags[i]),
);

// --- fractional minutes flow into cells ---
const frac = buildGrid([CITY_BY_ID.get('kathmandu')!, CITY_BY_ID.get('san-francisco')!], 'meeting', 7, 23, july)!;
const sfCellAtKath9 = frac.rows[1].cells[9];
check(
  'Kathmandu ref 9:00 → SF shows 20:15 (fractional offset)',
  sfCellAtKath9.localHour === 20 && sfCellAtKath9.localMinute === 15,
);

// --- overnight window grid sanity ---
// Night shift (22→6): SF is awake {22,23,0..5} while Geneva is awake {13..20}
// and Denpasar {7..14} — so no shared hours, but individual rows stay correct.
const night = buildGrid(defaultCities, 'meeting', 22, 6, july)!;
check('overnight window: no meeting overlap for default trio', night.meetingCount === 0);
check(
  'overnight window: SF awake exactly 8h',
  night.rows[0].cells.filter((c) => c.awake).length === 8,
);
check(
  'overnight window: Geneva awake exactly 8h',
  night.rows[2].cells.filter((c) => c.awake).length === 8,
);

// --- full render (SSR) with fresh-storage defaults ---
const store = new Map<string, string>();
(globalThis as Record<string, unknown>).localStorage = {
  getItem: (k: string) => store.get(k) ?? null,
  setItem: (k: string, v: string) => void store.set(k, v),
  removeItem: (k: string) => void store.delete(k),
  clear: () => store.clear(),
  key: () => null,
  get length() {
    return store.size;
  },
};
const html = renderToString(createElement(App));
// React SSR separates adjacent text nodes with <!-- --> — flatten for assertions.
const flat = html.replace(/<!-- -->/g, '');
check('renders model name as title', flat.includes('k3[1m]'));
check('renders default cities', flat.includes('San Francisco') && flat.includes('Denpasar') && flat.includes('Geneva'));
check('renders REF badge', flat.includes('REF'));
check('renders default hint', flat.includes('Green cells = everyone awake'));
check('renders overlap summary', /shared (hour|hours)/.test(flat) && flat.includes('range'));
check('renders UTC offsets', flat.includes('UTC−7') && flat.includes('UTC+8') && flat.includes('UTC+2'));

if (failures > 0) {
  console.error(`\n${failures} check(s) failed`);
  process.exit(1);
}
console.log('\nAll checks passed ✓');
