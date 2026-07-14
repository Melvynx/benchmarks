import { useState, useMemo } from 'react'
import { useLocalStorage } from './hooks/useLocalStorage'
import { CITIES } from './data/cities'
import { getOverlapHours, getPairOverlapHours } from './utils/timezone'
import { ModeToggle } from './components/ModeToggle'
import { Settings } from './components/Settings'
import { CitySelector } from './components/CitySelector'
import { OverlapSummary } from './components/OverlapSummary'
import { DesktopGrid } from './components/DesktopGrid'
import { MobileGrid } from './components/MobileGrid'

export default function App() {
  const [cityIds, setCityIds] = useLocalStorage<string[]>('tz-cities', [
    'san-francisco',
    'denpasar',
    'geneva',
  ])
  const [mode, setMode] = useLocalStorage<'meeting' | 'base'>('tz-mode', 'meeting')
  const [wakeHour, setWakeHour] = useLocalStorage('tz-wake', 7)
  const [sleepHour, setSleepHour] = useLocalStorage('tz-sleep', 23)
  const [timeFormat, setTimeFormat] = useLocalStorage<'12h' | '24h'>('tz-format', '12h')
  const [settingsOpen, setSettingsOpen] = useState(false)

  const cities = useMemo(
    () => cityIds.map((id) => CITIES.find((c) => c.id === id)!).filter(Boolean),
    [cityIds],
  )

  const referenceCity = cities[0]

  const meetingOverlap = useMemo(() => {
    if (!referenceCity || cities.length < 2) return []
    return getOverlapHours(
      cities.map((c) => c.timezone),
      referenceCity.timezone,
      wakeHour,
      sleepHour,
    )
  }, [cities, referenceCity, wakeHour, sleepHour])

  const baseOverlaps = useMemo(() => {
    const map = new Map<string, number[]>()
    if (!referenceCity || cities.length < 2) return map
    for (const city of cities.slice(1)) {
      map.set(
        city.id,
        getPairOverlapHours(referenceCity.timezone, city.timezone, wakeHour, sleepHour),
      )
    }
    return map
  }, [cities, referenceCity, wakeHour, sleepHour])

  const isOverlapHour = (cityId: string, refHour: number): boolean => {
    if (mode === 'meeting') {
      return meetingOverlap.includes(refHour)
    }
    if (cityId === referenceCity?.id) return false
    return baseOverlaps.get(cityId)?.includes(refHour) ?? false
  }

  const removeCity = (id: string) => setCityIds((prev) => prev.filter((cid) => cid !== id))

  const addCity = (id: string) => {
    if (!cityIds.includes(id)) setCityIds((prev) => [...prev, id])
  }

  const promoteToReference = (id: string) => {
    setCityIds((prev) => [id, ...prev.filter((cid) => cid !== id)])
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50">
      <header className="border-b border-slate-800 px-4 py-3">
        <div className="max-w-[1440px] mx-auto flex items-center justify-between gap-4">
          <h1 className="text-lg font-bold tracking-tight text-slate-100">Claude Opus 4.6</h1>
          <ModeToggle mode={mode} onChange={setMode} />
          <button
            onClick={() => setSettingsOpen(!settingsOpen)}
            className="p-2 rounded-lg hover:bg-slate-800 transition-colors text-slate-400 hover:text-slate-200"
            aria-label="Settings"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 010 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 010-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28z"
              />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </button>
        </div>
      </header>

      {settingsOpen && (
        <Settings
          wakeHour={wakeHour}
          sleepHour={sleepHour}
          timeFormat={timeFormat}
          onWakeChange={setWakeHour}
          onSleepChange={setSleepHour}
          onFormatChange={setTimeFormat}
        />
      )}

      <main className="max-w-[1440px] mx-auto px-4 py-5 space-y-5">
        <CitySelector selectedIds={cityIds} onAdd={addCity} />

        {cities.length >= 2 && (
          <OverlapSummary
            mode={mode}
            cities={cities}
            meetingOverlap={meetingOverlap}
            baseOverlaps={baseOverlaps}
            timeFormat={timeFormat}
          />
        )}

        {cities.length > 0 && referenceCity && (
          <>
            <div className="hidden md:block">
              <DesktopGrid
                cities={cities}
                referenceCity={referenceCity}
                wakeHour={wakeHour}
                sleepHour={sleepHour}
                timeFormat={timeFormat}
                isOverlapHour={isOverlapHour}
                onRemove={removeCity}
                onPromote={promoteToReference}
              />
            </div>
            <div className="md:hidden">
              <MobileGrid
                cities={cities}
                referenceCity={referenceCity}
                wakeHour={wakeHour}
                sleepHour={sleepHour}
                timeFormat={timeFormat}
                isOverlapHour={isOverlapHour}
                onRemove={removeCity}
                onPromote={promoteToReference}
              />
            </div>
          </>
        )}

        {cities.length === 0 && (
          <div className="text-center py-20 text-slate-500">
            Add cities above to start comparing timezones
          </div>
        )}

        <p className="text-center text-xs text-slate-600 pt-2">
          Green cells = everyone awake
        </p>
      </main>
    </div>
  )
}
