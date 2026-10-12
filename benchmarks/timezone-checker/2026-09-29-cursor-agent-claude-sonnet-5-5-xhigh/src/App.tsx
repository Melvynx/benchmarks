import { Anchor, SlidersHorizontal, Users } from 'lucide-react'
import { useCallback, useState } from 'react'
import { CityPicker } from './components/CityPicker'
import { CityGrid } from './components/grid/CityGrid'
import { Header } from './components/Header'
import { Legend } from './components/Legend'
import { OverlapSummary } from './components/OverlapSummary'
import { SettingsPanel } from './components/SettingsPanel'
import { SegmentedControl, type SegmentOption } from './components/ui/SegmentedControl'
import { useGrid } from './hooks/useGrid'
import { useNow } from './hooks/useNow'
import type { Mode } from './lib/types'
import { useAppState } from './state/useAppState'

const SETTINGS_PANEL_ID = 'settings-panel'

const MODE_OPTIONS: readonly SegmentOption<Mode>[] = [
  { value: 'meeting', label: 'Meeting', icon: <Users className="size-4" aria-hidden="true" /> },
  { value: 'base', label: 'Base', icon: <Anchor className="size-4" aria-hidden="true" /> },
]

export function App() {
  const [state, dispatch] = useAppState()
  const now = useNow()
  const grid = useGrid(state, now)
  const [settingsOpen, setSettingsOpen] = useState(false)

  const onPromote = useCallback((id: string) => dispatch({ type: 'city/promote', id }), [dispatch])
  const onRemove = useCallback((id: string) => dispatch({ type: 'city/remove', id }), [dispatch])

  const { mode, settings } = state
  const reference = grid.rows[0]

  return (
    <div className="min-h-dvh">
      <main className="mx-auto flex w-full max-w-6xl flex-col gap-5 px-4 py-6 sm:py-10 lg:px-6">
        <Header />

        <div className="relative flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-4">
            <SegmentedControl
              label="Mode"
              value={mode}
              options={MODE_OPTIONS}
              onChange={(next) => dispatch({ type: 'mode/set', mode: next })}
              className="w-full sm:w-auto sm:[&>button]:min-w-28"
            />
            <p className="hidden max-w-64 text-sm leading-snug text-ink-2 lg:block">
              {mode === 'meeting' || !reference
                ? 'One shared window when everyone is awake.'
                : `Each city compared only with ${reference.city.name}.`}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2 sm:flex">
            <CityPicker
              selectedIds={state.cityIds}
              now={now}
              onAdd={(id) => dispatch({ type: 'city/add', id })}
            />
            <button
              type="button"
              aria-expanded={settingsOpen}
              aria-controls={SETTINGS_PANEL_ID}
              onClick={() => setSettingsOpen((open) => !open)}
              className={`inline-flex h-11 items-center justify-center gap-2 rounded-xl border px-4 text-sm font-semibold ${
                settingsOpen
                  ? 'border-ink bg-surface-2'
                  : 'border-line bg-surface hover:border-line-strong hover:bg-surface-2'
              }`}
            >
              <SlidersHorizontal className="size-4" aria-hidden="true" />
              Settings
            </button>
          </div>
        </div>

        {settingsOpen && (
          <SettingsPanel
            id={SETTINGS_PANEL_ID}
            settings={settings}
            onChange={(patch) => dispatch({ type: 'settings/patch', patch })}
            onReset={() => dispatch({ type: 'reset' })}
          />
        )}

        {grid.summary && reference ? (
          <OverlapSummary
            summary={grid.summary}
            reference={reference}
            cityCount={grid.rows.length}
            format={settings.format}
          />
        ) : (
          reference && (
            <p className="rounded-2xl border border-dashed border-line-strong px-4 py-3 text-sm text-ink-2">
              Add at least one more city to find overlapping hours.
            </p>
          )
        )}

        <CityGrid
          grid={grid}
          mode={mode}
          format={settings.format}
          now={now}
          onPromote={onPromote}
          onRemove={onRemove}
          onRestoreDefaults={() => dispatch({ type: 'cities/reset' })}
        />

        <Legend mode={mode} referenceName={reference?.city.name ?? null} />
      </main>
    </div>
  )
}
