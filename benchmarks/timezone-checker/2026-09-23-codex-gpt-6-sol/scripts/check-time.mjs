import assert from 'node:assert/strict'
import { CITIES } from '../src/cities.ts'
import { buildSchedule, formatOffset, getOffsetMinutes, getRanges, isAwake } from '../src/time.ts'

const city = id => CITIES.find(item => item.id === id)
const settings = { wakeHour: 7, sleepHour: 23, timeFormat: '12h' }
const now = new Date('2026-09-23T12:00:00Z')

assert.equal(CITIES.length, 34)
assert.equal(formatOffset(getOffsetMinutes('America/Los_Angeles', now)), 'UTC−07:00')
assert.equal(formatOffset(getOffsetMinutes('America/Los_Angeles', new Date('2026-01-23T12:00:00Z'))), 'UTC−08:00')
assert.equal(formatOffset(getOffsetMinutes('Asia/Kathmandu', now)), 'UTC+05:45')
assert.equal(isAwake({ hour: 23, minute: 30 }, 22, 6), true)
assert.equal(isAwake({ hour: 6, minute: 0 }, 22, 6), false)
assert.equal(isAwake({ hour: 15, minute: 0 }, 8, 8), true)

const meeting = buildSchedule([city('san-francisco'), city('denpasar'), city('geneva')], settings, 'meeting', now)
assert.equal(meeting.meetingHours.filter(Boolean).length, 2)
assert.equal(meeting.rows.every(row => row.cells[7].overlap), true)
assert.equal(meeting.rows.every(row => row.cells[22].overlap), true)
const base = buildSchedule([city('san-francisco'), city('denpasar'), city('geneva')], settings, 'base', now)
assert.equal(base.rows[1].cells[16].overlap, true)
assert.equal(base.rows[2].cells[16].overlap, false)
assert.equal(base.rows[0].cells[16].overlap, true)

const fractional = buildSchedule([city('geneva'), city('mumbai'), city('kathmandu')], settings, 'meeting', now)
assert.equal(fractional.rows[0].cells.every((cell, hour) => cell.local?.hour === hour), true)
assert.equal(fractional.rows[1].cells.every(cell => cell.local?.minute === 30), true)
assert.equal(fractional.rows[2].cells.every(cell => cell.local?.minute === 45), true)

const spring = buildSchedule([city('san-francisco'), city('geneva')], settings, 'meeting', new Date('2026-03-08T12:00:00Z'))
assert.equal(spring.clockChangeDay, true)
assert.equal(spring.rows.every(row => row.cells[2].skipped && row.cells[2].local === null), true)
assert.equal(spring.meetingHours[2], false)
const fall = buildSchedule([city('san-francisco'), city('geneva')], settings, 'meeting', new Date('2026-11-01T12:00:00Z'))
assert.equal(fall.clockChangeDay, true)

const noOverlap = buildSchedule([city('san-francisco'), city('denpasar')], { ...settings, wakeHour: 9, sleepHour: 17 }, 'meeting', now)
assert.equal(noOverlap.meetingHours.some(Boolean), false)

const hours = Array(24).fill(false)
for (const hour of [0, 1, 7, 8, 23]) hours[hour] = true
assert.deepEqual(getRanges(hours), [{ start: 0, end: 2 }, { start: 7, end: 9 }, { start: 23, end: 24 }])

console.log('Timezone checks passed')
