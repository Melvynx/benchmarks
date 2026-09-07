import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react'
import { Engine } from './sim/engine'
import { DEFAULT_PARAMS, PRESETS, isSetupParam, type ParamKey, type Params } from './sim/params'
import { Garden } from './components/Garden'
import { Controls } from './components/Controls'
import { Inspector } from './components/Inspector'
import { Charts } from './components/Charts'
import './App.css'

function sameParams(a: Params, b: Params) {
  return (Object.keys(a) as ParamKey[]).every((k) => k === 'seed' || a[k] === b[k])
}

export default function App() {
  const engineRef = useRef<Engine | null>(null)
  if (!engineRef.current) engineRef.current = new Engine(DEFAULT_PARAMS)
  const engine = engineRef.current

  useSyncExternalStore(engine.subscribe, engine.getSnapshot)

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

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement) return
      if (e.code === 'Space') {
        e.preventDefault()
        engine.setRunning(!engine.running)
      } else if (e.code === 'Period') {
        engine.stepOnce()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [engine])

  const selected = engine.selected()
  const fruitCapacity = world.trees.length * params.fruitLimit

  return (
    <div className="app">
      <header className="top">
        <h1>Cursor Grok 4.6</h1>
        <div className="transport">
          <button type="button" className={engine.running ? 'primary' : ''} onClick={() => engine.setRunning(true)}>
            Play
          </button>
          <button type="button" onClick={() => engine.setRunning(false)}>
            Pause
          </button>
          <button type="button" onClick={() => engine.stepOnce()}>
            Step
          </button>
          <button type="button" onClick={() => engine.reset()}>
            Reset
          </button>
          <button type="button" onClick={onRandomize}>
            Randomize
          </button>
          <label className="speed">
            Speed
            <input
              type="range"
              min={0.25}
              max={8}
              step={0.25}
              value={engine.speed}
              aria-label="Simulation speed"
              onChange={(e) => engine.setSpeed(Number(e.target.value))}
            />
            <span>{engine.speed.toFixed(2)}×</span>
          </label>
        </div>
      </header>

      <nav className="presets" aria-label="Garden presets">
        {PRESETS.map((p) => (
          <button
            key={p.id}
            type="button"
            className={activePreset === p.id ? 'chip on' : 'chip'}
            title={p.blurb}
            onClick={() => onPreset(p.id)}
          >
            {p.name}
          </button>
        ))}
      </nav>

      <aside className="left">
        <Controls params={params} onParam={onParam} />
      </aside>

      <main className="stage">
        <Garden engine={engine} onPick={(id) => engine.select(id)} />
        <div className="live" aria-live="polite">
          <span className="fruit">{world.counts.fruit} fruit</span>
          <span className="blue">{world.counts.blue} blue</span>
          <span className="red">{world.counts.red} red</span>
          <span className="time">{world.t.toFixed(0)}s</span>
        </div>
      </main>

      <aside className="right">
        <Inspector blob={selected} params={params} onClose={() => engine.select(null)} />
        <Charts
          samples={engine.history.samples}
          version={engine.history.version}
          fruitCapacity={fruitCapacity}
          blueAlive={world.counts.blue}
          redAlive={world.counts.red}
        />
      </aside>
    </div>
  )
}
