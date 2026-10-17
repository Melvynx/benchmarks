import { useEffect, useMemo, useState } from 'react'
import { cityById } from './data/cities'
import { loadState, saveState } from './lib/storage'
import {
  currentHourInTz,
  currentTimeInTz,
  formatLocalMinutes,
  formatUtcOffset,
  getUtcOffsetMinutes,
  isAwake,
  localMinutes,
} from './lib/time'
import type { EnrichedCity } from './lib/grid'
import CityPicker from './components/CityPicker'
import DesktopGrid from './components/DesktopGrid'
import MobileGrid from './components/MobileGrid'
import OverlapSummary from './components/OverlapSummary'
import SettingsPanel from './components/SettingsPanel'
import { useMediaQuery } from './hooks/useMediaQuery'

export default function App() {
  const [initial] = useState(loadState)
  const [cityIds, setCityIds] = useState<string[]>(initial.cityIds)
  const [wake, setWake] = useState(initial.wake)
  const [sleep, setSleep] = useState(initial.sleep)
  const [format, setFormat] = useState(initial.format)
  const [mode, setMode] = useState(initial.mode)
  const [now, setNow] = useState(() => new Date())

  const isMobile = useMediaQuery('(max-width: 767px)')

  // keep clocks fresh
  useEffect(() => {
    const t = window.setInterval(() => setNow(new Date()), 30_000)
    return () => window.clearInterval(t)
  }, [])

  // persistence
  useEffect(() => {
    saveState({ cityIds, wake, sleep, format, mode })
  }, [cityIds, wake, sleep, format, mode])

  const cities = useMemo(
    () => cityIds.map(cityById).filter((c): c is NonNullable<typeof c> => Boolean(c)),
    [cityIds],
  )

  const { enriched, meetingHours, baseHoursByCityId, nowHour } = useMemo(() => {
    if (cities.length === 0) {
      return { enriched: [] as EnrichedCity[], meetingHours: [] as number[], baseHoursByCityId: {} as Record<string, number[]>, nowHour: null as number | null }
    }
    const ref = cities[0]
    const refOffset = getUtcOffsetMinutes(ref.tz, now)
    const offsets = cities.map((c) => getUtcOffsetMinutes(c.tz, now))

    // awake[cityIndex][refHour]
    const awake = cities.map((_, ci) =>
      Array.from({ length: 24 }, (_, h) => isAwake(localMinutes(h, offsets[ci], refOffset), wake, sleep)),
    )

    const meeting: number[] = []
    for (let h = 0; h < 24; h++) if (awake.every((row) => row[h])) meeting.push(h)
    const meetingSet = new Set(meeting)

    const baseById: Record<string, number[]> = {}
    cities.forEach((city, ci) => {
      const hours: number[] = []
      for (let h = 0; h < 24; h++) {
        if (ci === 0 ? awake[0][h] : awake[0][h] && awake[ci][h]) hours.push(h)
      }
      baseById[city.id] = hours
    })
    const baseSets: Record<string, Set<number>> = Object.fromEntries(
      Object.entries(baseById).map(([k, v]) => [k, new Set(v)]),
    )

    const rows: EnrichedCity[] = cities.map((city, ci) => ({
      city,
      offsetMinutes: offsets[ci],
      offsetLabel: formatUtcOffset(offsets[ci]),
      currentTime: currentTimeInTz(city.tz, format, now),
      isRef: ci === 0,
      cells: Array.from({ length: 24 }, (_, h) => {
        const mins = localMinutes(h, offsets[ci], refOffset)
        const overlap = mode === 'meeting' ? meetingSet.has(h) && awake[ci][h] : (baseSets[city.id]?.has(h) ?? false) && awake[ci][h]
        return { refHour: h, localMins: mins, label: formatLocalMinutes(mins, format), awake: awake[ci][h], overlap }
      }),
    }))

    return { enriched: rows, meetingHours: meeting, baseHoursByCityId: baseById, nowHour: currentHourInTz(ref.tz, now) }
  }, [cities, wake, sleep, format, mode, now])

  const refCity = cities[0]

  function addCity(id: string) {
    setCityIds((prev) => (prev.includes(id) ? prev : [...prev, id]))
  }
  function removeCity(id: string) {
    setCityIds((prev) => prev.filter((x) => x !== id))
  }
  function promoteCity(id: string) {
    setCityIds((prev) => (prev[0] === id ? prev : [id, ...prev.filter((x) => x !== id)]))
  }

  return (
    <div className="app">
      <header className="topbar">
        <div className="topbar-inner">
          <div>
            <h1>muse-wonder-full-1.0</h1>
            <p className="tagline">Timezone overlap checker — find the hours when your whole team is awake.</p>
          </div>
          <div className="mode-toggle" role="group" aria-label="Mode">
            <button type="button" className={mode === 'meeting' ? 'mode-btn active' : 'mode-btn'} aria-pressed={mode === 'meeting'} onClick={() => setMode('meeting')}>
              Meeting Mode
            </button>
            <button type="button" className={mode === 'base' ? 'mode-btn active' : 'mode-btn'} aria-pressed={mode === 'base'} onClick={() => setMode('base')}>
              Base Mode
            </button>
          </div>
        </div>
        <p className="mode-hint">
          {mode === 'meeting'
            ? 'Meeting Mode: one shared window when everyone across all cities is awake at once — for scheduling a group call.'
            : `Base Mode: each city is compared only against the base${refCity ? ` (${refCity.name})` : ''}, so every row can highlight a different window.`}
        </p>
      </header>

      <main className="main">
        <div className="controls">
          <SettingsPanel wake={wake} sleep={sleep} format={format} onWake={setWake} onSleep={setSleep} onFormat={setFormat} />
          <section className="panel add-panel" aria-label="Add city">
            <div className="panel-head">
              <h2>Cities</h2>
              <p>Click a city name to make it the reference. The first city anchors every calculation.</p>
            </div>
            <CityPicker selectedIds={cityIds} onAdd={addCity} />
          </section>
        </div>

        <OverlapSummary mode={mode} format={format} cities={cities} meetingHours={meetingHours} baseHoursByCityId={baseHoursByCityId} />

        {cities.length === 0 ? (
          <div className="empty">
            <p>No cities selected yet. Add a city above to start comparing timezones.</p>
          </div>
        ) : isMobile ? (
          <MobileGrid cities={enriched} format={format} nowHour={nowHour} onPromote={promoteCity} onRemove={removeCity} />
        ) : (
          <DesktopGrid cities={enriched} format={format} nowHour={nowHour} onPromote={promoteCity} onRemove={removeCity} />
        )}

        <footer className="legend" aria-label="Legend">
          <span className="legend-item"><span className="swatch overlap" /> Overlap</span>
          <span className="legend-item"><span className="swatch awake" /> Awake, no overlap</span>
          <span className="legend-item"><span className="swatch sleeping" /> Sleeping</span>
          <span className="hint">
            {mode === 'meeting'
              ? 'Green cells = everyone awake'
              : `Green cells = awake at the same time as ${refCity ? refCity.name : 'the base city'}`}
          </span>
          <span className="footnote">Offsets use today&apos;s date, so daylight saving is handled automatically. Hours are shown in {refCity ? refCity.name : 'reference'} time across the top{isMobile ? '/side' : ''}.</span>
        </footer>
      </main>
    </div>
  )
}
