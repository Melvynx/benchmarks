import {
  buildLocalHourMap,
  buildOverlapInfo,
  computeOverlap,
  formatUtcOffset,
  getTimezoneOffsetMinutes,
  isAwake,
} from './src/lib/timezone.ts'
import { CITIES, CITY_BY_ID } from './src/data/cities.ts'

const log = (...args) => console.log(...args)
const assert = (cond, msg) => {
  if (!cond) {
    console.error('❌ FAIL:', msg)
    process.exitCode = 1
  } else {
    console.log('✓', msg)
  }
}

const ref = new Date('2026-06-24T12:00:00Z')

// Fractional offsets
const india = getTimezoneOffsetMinutes('Asia/Kolkata', ref)
const nepal = getTimezoneOffsetMinutes('Asia/Kathmandu', ref)
log('India offset (Asia/Kolkata):', india, '→', formatUtcOffset(india))
log('Nepal offset (Asia/Kathmandu):', nepal, '→', formatUtcOffset(nepal))
assert(india === 330, 'India should be +5:30 (330 min)')
assert(nepal === 345, 'Nepal should be +5:45 (345 min)')

// DST awareness — in June, NYC should be on EDT (-240), LA on PDT (-420)
const nyc = getTimezoneOffsetMinutes('America/New_York', ref)
const la = getTimezoneOffsetMinutes('America/Los_Angeles', ref)
log('NYC offset June 2026:', nyc, '→', formatUtcOffset(nyc))
log('LA offset June 2026:', la, '→', formatUtcOffset(la))
assert(nyc === -240, 'NYC in June should be EDT (UTC-4)')
assert(la === -420, 'LA in June should be PDT (UTC-7)')

// In January, NYC should be EST (-300), LA PST (-480)
const winter = new Date('2026-01-15T12:00:00Z')
const nycW = getTimezoneOffsetMinutes('America/New_York', winter)
const laW = getTimezoneOffsetMinutes('America/Los_Angeles', winter)
log('NYC offset Jan 2026:', nycW, '→', formatUtcOffset(nycW))
log('LA offset Jan 2026:', laW, '→', formatUtcOffset(laW))
assert(nycW === -300, 'NYC in January should be EST (UTC-5)')
assert(laW === -480, 'LA in January should be PST (UTC-8)')

// isAwake
assert(isAwake(7, { wakeHour: 7, sleepHour: 23, timeFormat: '12h' }) === true, '7am is awake')
assert(isAwake(22, { wakeHour: 7, sleepHour: 23, timeFormat: '12h' }) === true, '22 (10pm) is awake in 7-23 window')
assert(isAwake(23, { wakeHour: 7, sleepHour: 23, timeFormat: '12h' }) === false, '23 (11pm) is asleep (boundary)')
assert(isAwake(0, { wakeHour: 22, sleepHour: 6, timeFormat: '12h' }) === true, '0 is awake in night-shift')
assert(isAwake(5, { wakeHour: 22, sleepHour: 6, timeFormat: '12h' }) === true, '5am is awake in night-shift')
assert(isAwake(6, { wakeHour: 22, sleepHour: 6, timeFormat: '12h' }) === false, '6am is asleep in night-shift (boundary)')
assert(isAwake(22, { wakeHour: 22, sleepHour: 6, timeFormat: '12h' }) === true, '22 is awake in night-shift (boundary)')
assert(isAwake(12, { wakeHour: 22, sleepHour: 6, timeFormat: '12h' }) === false, 'noon is asleep in night-shift')

// Build local hour map for SF (UTC-7) -> Tokyo (UTC+9)
const sf = CITY_BY_ID.get('san-francisco')
const tokyo = CITY_BY_ID.get('tokyo')
const map = buildLocalHourMap(sf.timezone, tokyo.timezone, ref)
log('SF→Tokyo local hour map:', map.join(','))
// At SF midnight (UTC 07:00), Tokyo is 16:00. So map[0] should be 16.
assert(map[0] === 16, `SF midnight should map to Tokyo 16:00, got ${map[0]}`)
// At SF noon (UTC 19:00), Tokyo is 04:00 next day. So map[12] should be 4.
assert(map[12] === 4, `SF noon should map to Tokyo 04:00, got ${map[12]}`)

// Build local hour map for SF -> Denpasar (Asia/Makassar UTC+8)
const denpasar = CITY_BY_ID.get('denpasar')
const sfToDenpasar = buildLocalHourMap(sf.timezone, denpasar.timezone, ref)
log('SF→Denpasar:', sfToDenpasar.join(','))
// SF midnight (UTC 07:00) → Denpasar (UTC+8) = 15:00
assert(sfToDenpasar[0] === 15, `SF midnight → Denpasar 15:00, got ${sfToDenpasar[0]}`)

// Build local hour map for SF -> Geneva (Europe/Zurich, in June CEST UTC+2)
const geneva = CITY_BY_ID.get('geneva')
const sfToGeneva = buildLocalHourMap(sf.timezone, geneva.timezone, ref)
log('SF→Geneva (June):', sfToGeneva.join(','))
// SF midnight (UTC 07:00) → Geneva (UTC+2) = 09:00
assert(sfToGeneva[0] === 9, `SF midnight → Geneva 09:00 in June, got ${sfToGeneva[0]}`)

// Compute overlap (meeting mode) with default SF, Denpasar, Geneva and default settings 7-23
const settings = { wakeHour: 7, sleepHour: 23, timeFormat: '12h' }
const overlap = computeOverlap(sf, [denpasar, geneva], settings, 'meeting', ref)
log('Meeting mode overlap:', {
  hours: Array.from(overlap['__all__'].hours).sort((a, b) => a - b),
  ranges: overlap['__all__'].ranges,
  total: overlap['__all__'].totalHours,
})

// Sanity: when SF is at hour H, SF is "awake locally" iff H is in 7..22 (since 23 is sleep boundary)
// SF midnight = UTC 07:00 → Denpasar 15:00 → Geneva 09:00
// We want hours where ALL three are simultaneously in their awake window.
const expected = []
for (let h = 0; h < 24; h++) {
  const sfH = h
  const denpasarH = sfToDenpasar[h]
  const genevaH = sfToGeneva[h]
  if (
    isAwake(sfH, settings) &&
    isAwake(denpasarH, settings) &&
    isAwake(genevaH, settings)
  ) {
    expected.push(h)
  }
}
log('Expected overlap hours:', expected)
assert(
  Array.from(overlap['__all__'].hours).sort((a, b) => a - b).join(',') === expected.join(','),
  'Computed overlap matches expected',
)

// Base mode — SF vs Denpasar
const baseDen = computeOverlap(sf, [denpasar], settings, 'base', ref)
log('Base mode SF vs Denpasar:', {
  hours: Array.from(baseDen[denpasar.id].hours).sort((a, b) => a - b),
  ranges: baseDen[denpasar.id].ranges,
})
const expectedBase = []
for (let h = 0; h < 24; h++) {
  if (isAwake(h, settings) && isAwake(sfToDenpasar[h], settings)) expectedBase.push(h)
}
log('Expected base SF vs Denpasar hours:', expectedBase)
assert(
  Array.from(baseDen[denpasar.id].hours).sort((a, b) => a - b).join(',') === expectedBase.join(','),
  'Base mode SF vs Denpasar matches expected',
)

// Range detection — full day
const all24 = new Set(Array.from({ length: 24 }, (_, i) => i))
const all24Info = buildOverlapInfo(all24)
log('Full day ranges:', all24Info.ranges)
assert(all24Info.totalHours === 24, 'Full day = 24 hours')
assert(all24Info.ranges.length === 1, 'Full day = 1 range')
assert(all24Info.ranges[0].start === 0 && all24Info.ranges[0].endExclusive === 24, 'Full day range = 0 to 24')

// Range detection — wraparound {22, 23, 0, 1, 2}
const wrap = new Set([22, 23, 0, 1, 2])
const wrapInfo = buildOverlapInfo(wrap)
log('Wrap ranges:', wrapInfo.ranges)
assert(wrapInfo.ranges.length === 1, 'Wrap produces 1 range')
assert(wrapInfo.ranges[0].endExclusive > 24, 'Wrap range has endExclusive > 24')

// Empty overlap
const empty = buildOverlapInfo(new Set())
assert(empty.totalHours === 0, 'Empty = 0 hours')
assert(empty.ranges.length === 0, 'Empty = 0 ranges')

// City count
log('Total cities in catalog:', CITIES.length)
assert(CITIES.length >= 34, 'Catalog has at least 34 cities')

console.log('\n✓ All timezone math checks passed')