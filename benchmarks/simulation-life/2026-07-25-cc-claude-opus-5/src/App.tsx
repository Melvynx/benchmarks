import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react'
import { Engine } from './sim/engine'
import { DEFAULT_PARAMS, PRESETS, isSetupParam, type ParamKey, type Params } from './sim/params'
import { Garden } from './components/Garden'
import { Controls } from './components/Controls'
import { Inspector } from './components/Inspector'
import { ChartsPanel } from './components/ChartsPanel'
import type { Mode } from './theme'
import './App.css'

/** Two settings match if only the seed differs — the seed just re-rolls a preset. */
function sameParams(a: Params, b: Params) {
  return (Object.keys(a) as ParamKey[]).every((k) => k === 'seed' || a[k] === b[k])
}

function usePrefersDark(): Mode {
  const [mode, setMode] = useState<Mode>(() =>
    typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light',
  )
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const on = () => setMode(mq.matches ? 'dark' : 'light')
    mq.addEventListener('change', on)
    return () => mq.removeEventListener('change', on)
  }, [])
  return mode
}

export default function App() {
  const engineRef = useRef<Engine | null>(null)
  if (!engineRef.current) engineRef.current = new Engine(DEFAULT_PARAMS)
  const engine = engineRef.current

  const version = useSyncExternalStore(engine.subscribe, engine.getSnapshot)
  const mode = usePrefersDark()

  // The world mutates in place inside the animation loop, so the readouts and
  // charts are pulled on a steady tick instead of re-rendering per step.
  const [, setTick] = useState(0)
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 120)
    return () => clearInterval(id)
  }, [])

  const params = engine.params
  const world = engine.world

  const activePreset = useMemo(() => PRESETS.find((p) => sameParams(p.params, params))?.id ?? null, [params])

  const onParam = useCallback(
    (key: ParamKey, value: number) => {
      // Setup values describe the garden that gets built, so they only bite on reset.
      if (isSetupParam(key)) engine.reset({ ...engine.params, [key]: value })
      else engine.setParam(key, value)
    },
    [engine],
  )

  const onPreset = useCallback(
    (id: string) => {
      const preset = PRESETS.find((p) => p.id === id)
      if (!preset) return
      engine.reset({ ...preset.params })
      engine.setRunning(true)
    },
    [engine],
  )

  const onRandomize = useCallback(() => {
    engine.reset({ ...engine.params, seed: Math.floor(Math.random() * 99999999) + 1 })
    engine.setRunning(true)
  }, [engine])

  const onPick = useCallback((id: number | null) => engine.select(id), [engine])

  const selected = engine.selected()
  const fruitCapacity = world.trees.length * params.fruitLimit

  return (
    <div className="app" data-mode={mode}>
      <header className="topbar">
        <h1>Opus 5</h1>
        <div className="readout" aria-live="off">
          <span className="stat">
            <span className="stat-label">Time</span>
            <span className="stat-value">{world.t.toFixed(0)}s</span>
          </span>
          <span className="stat stat-fruit">
            <span className="stat-label">Fruit</span>
            <span className="stat-value">{world.counts.fruit}</span>
          </span>
          <span className="stat stat-blue">
            <span className="stat-label">Blue</span>
            <span className="stat-value">{world.counts.blue}</span>
          </span>
          <span className="stat stat-red">
            <span className="stat-label">Red</span>
            <span className="stat-value">{world.counts.red}</span>
          </span>
        </div>
      </header>

      <main className="layout">
        <section className="stage">
          <Garden engine={engine} mode={mode} version={version} onPick={onPick} />
          <p className="stage-hint">Drag to turn the garden · click a blob to inspect it</p>
        </section>

        <aside className="side">
          <Inspector blob={selected} params={params} mode={mode} time={world.t} onClose={() => engine.select(null)} />
          <Controls
            params={params}
            running={engine.running}
            speed={engine.speed}
            activePreset={activePreset}
            onParam={onParam}
            onPreset={onPreset}
            onPlay={() => engine.setRunning(!engine.running)}
            onStep={() => engine.stepOnce()}
            onReset={() => engine.reset()}
            onRandomize={onRandomize}
            onSpeed={(v) => engine.setSpeed(v)}
          />
        </aside>

        <section className="story">
          <ChartsPanel
            samples={engine.history.samples}
            samplesVersion={engine.history.version}
            mode={mode}
            fruitCapacity={fruitCapacity}
            blueAlive={world.counts.blue}
            redAlive={world.counts.red}
          />
        </section>
      </main>
    </div>
  )
}
