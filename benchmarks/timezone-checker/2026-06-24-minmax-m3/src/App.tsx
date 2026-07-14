import { useEffect, useMemo, useState } from 'react'
import { CITY_BY_ID } from './data/cities'
import {
  computeOverlap,
  formatHourLabel,
  formatUtcOffset,
  getLocalHour,
  getTimezoneOffsetMinutes,
} from './lib/timezone'
import { DEFAULT_STATE, loadState, saveState } from './lib/storage'
import type { City, Mode, Settings } from './types'
import { useMediaQuery } from './hooks/useMediaQuery'
import { CityPicker } from './components/CityPicker'
import { DesktopGrid } from './components/DesktopGrid'
import { MobileGrid } from './components/MobileGrid'
import { ModeToggle } from './components/ModeToggle'
import { OverlapBadge } from './components/OverlapBadge'
import { SettingsPanel } from './components/SettingsPanel'
import { ClockIcon } from './components/icons'

export default function App() {
  const isDesktop = useMediaQuery('(min-width: 768px)')

  // Hydrate from localStorage
  const [cities, setCities] = useState<string[]>(() => loadState().cities)
  const [mode, setMode] = useState<Mode>(() => loadState().mode)
  const [settings, setSettings] = useState<Settings>(() => loadState().settings)
  const [now, setNow] = useState<Date>(() => new Date())

  useEffect(() => {
    saveState({ cities, mode, settings })
  }, [cities, mode, settings])

  // Tick the "now" reference every minute so the indicator stays fresh.
  useEffect(() => {
    const tick = () => setNow(new Date())
    const id = window.setInterval(tick, 60_000)
    return () => window.clearInterval(id)
  }, [])

  const cityObjects = useMemo(
    () => cities.map((id) => CITY_BY_ID.get(id)).filter((c): c is City => Boolean(c)),
    [cities],
  )

  const refCity = cityObjects[0]
  const otherCities = cityObjects.slice(1)

  const overlap = useMemo(() => {
    if (!refCity) return {}
    return computeOverlap(refCity, otherCities, settings, mode, now)
  }, [refCity, otherCities, settings, mode, now])

  const refNowHour = useMemo(() => {
    if (!refCity) return 0
    return getLocalHour(refCity.timezone, now)
  }, [refCity, now])

  const refNowOffset = useMemo(() => {
    if (!refCity) return ''
    return formatUtcOffset(getTimezoneOffsetMinutes(refCity.timezone, now))
  }, [refCity, now])

  const currentRefTime = useMemo(() => {
    if (!refCity) return ''
    return formatHourLabel(refNowHour, settings.timeFormat === '24h')
  }, [refCity, refNowHour, settings.timeFormat])

  const handleAdd = (city: City) => {
    setCities((prev) => (prev.includes(city.id) ? prev : [...prev, city.id]))
  }

  const handleRemove = (id: string) => {
    setCities((prev) => (prev.length <= 1 ? prev : prev.filter((c) => c !== id)))
  }

  const handlePromote = (id: string) => {
    setCities((prev) => {
      if (prev[0] === id) return prev
      const without = prev.filter((c) => c !== id)
      return [id, ...without]
    })
  }

  return (
    <div className="min-h-dvh">
      <div className="mx-auto flex max-w-[1480px] flex-col gap-6 px-4 py-6 sm:px-6 sm:py-10 lg:px-10">
        {/* Header */}
        <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-accent-500 to-accent-600 text-white shadow-lg shadow-accent-500/40">
                <ClockIcon width={20} height={20} />
              </span>
              <div className="flex flex-col">
                <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.25em] text-accent-400">
                  Timezone Overlap
                </span>
                <h1 className="text-balance text-3xl font-bold tracking-tight text-white sm:text-4xl">
                  MiniMax-M3
                </h1>
              </div>
            </div>
            <p className="max-w-2xl text-sm leading-relaxed text-ink-400">
              Find common meeting windows across cities or compare one base location against each
              teammate. Anchored to <span className="text-ink-200">your</span> awake window, with
              DST handled automatically.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            {refCity && (
              <div className="hidden flex-col items-end text-right md:flex">
                <span className="text-[10px] font-semibold uppercase tracking-widest text-ink-500">
                  Now in {refCity.name}
                </span>
                <span className="font-mono text-2xl font-bold text-ink-50">
                  {currentRefTime}
                </span>
                <span className="font-mono text-[10px] text-ink-500">{refNowOffset}</span>
              </div>
            )}
            <ModeToggle mode={mode} onChange={setMode} />
          </div>
        </header>

        {/* Controls */}
        <section className="flex flex-col gap-4 lg:flex-row lg:items-start">
          <div className="lg:flex-1">
            <CityPicker selectedIds={cities} onAdd={handleAdd} />
          </div>
          <div className="lg:max-w-[680px] lg:flex-1">
            <SettingsPanel settings={settings} onChange={setSettings} />
          </div>
        </section>

        {/* Overlap summary */}
        <section aria-label="Overlap summary">
          {mode === 'meeting' ? (
            <OverlapBadge
              label={otherCities.length === 0 ? 'Add another city' : 'Common awake window'}
              ranges={overlap['__all__']?.ranges ?? []}
              totalHours={overlap['__all__']?.totalHours ?? 0}
              use24h={settings.timeFormat}
              zeroMessage={
                otherCities.length === 0
                  ? 'Add at least one other city to compute overlap'
                  : 'No hours where everyone is simultaneously awake — try widening the awake window'
              }
              empty={otherCities.length === 0}
            />
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {otherCities.length === 0 ? (
                <OverlapBadge
                  label="Base mode"
                  ranges={[]}
                  totalHours={0}
                  use24h={settings.timeFormat}
                  zeroMessage="Add at least one other city to compare against the base"
                  empty
                />
              ) : (
                otherCities.map((c) => {
                  const info = overlap[c.id] ?? { hours: new Set(), ranges: [], totalHours: 0 }
                  return (
                    <OverlapBadge
                      key={c.id}
                      label={`${c.name} ↔ ${refCity?.name ?? ''}`}
                      ranges={info.ranges}
                      totalHours={info.totalHours}
                      use24h={settings.timeFormat}
                      zeroMessage={`No overlap with ${c.name} — try widening the awake window`}
                    />
                  )
                })
              )}
            </div>
          )}
        </section>

        {/* Grid */}
        <section aria-label="Timezone grid">
          {isDesktop ? (
            <DesktopGrid
              cityIds={cities}
              settings={settings}
              mode={mode}
              overlap={overlap}
              nowHour={refNowHour}
              onRemove={handleRemove}
              onPromote={handlePromote}
            />
          ) : (
            <MobileGrid
              cityIds={cities}
              settings={settings}
              mode={mode}
              overlap={overlap}
              nowHour={refNowHour}
              onRemove={handleRemove}
              onPromote={handlePromote}
            />
          )}
        </section>

        {/* Footer hint */}
        <footer className="mt-2 flex flex-col items-center gap-1.5 pb-2 text-center text-xs text-ink-500">
          <div className="inline-flex items-center gap-2 rounded-full border border-leaf-500/20 bg-leaf-500/5 px-3 py-1 font-medium text-leaf-300">
            <span className="h-1.5 w-1.5 rounded-full bg-leaf-400 pulse-leaf" />
            Green cells = everyone awake
          </div>
          <p>
            Anchored to <span className="text-ink-300">{refCity?.name ?? '—'}</span>
            {refCity && <span className="font-mono text-ink-500"> · {refNowOffset}</span>}
            {' · '}DST-aware · {cityObjects.length} {cityObjects.length === 1 ? 'city' : 'cities'}
          </p>
        </footer>
      </div>
    </div>
  )
}

// Silence "unused default" warning if any tooling complains.
void DEFAULT_STATE