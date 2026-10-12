import { useCallback, useEffect, useRef, useState } from 'react'
import { Charts } from './components/Charts'
import { Controls } from './components/Controls'
import { Garden } from './components/Garden'
import { Inspector } from './components/Inspector'
import { summarise } from './sim/analysis'
import { Engine } from './sim/engine'
import { clampParam, isSetupParam, PRESETS, randomParams, type ParamKey, type Params, type Preset } from './sim/params'
import { DEFAULT_PARAMS } from './sim/params'

export function App() {
  const engineRef = useRef<Engine | null>(null)
  if (!engineRef.current) engineRef.current = new Engine({ ...DEFAULT_PARAMS })
  const engine = engineRef.current

  const [params, setParams] = useState<Params>(engine.params)
  const [playing, setPlaying] = useState(true)
  const [simSpeed, setSimSpeed] = useState(1)
  const [tick, setTick] = useState(0)
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [presetId, setPresetId] = useState<string | null>('balanced')
  const [setupDirty, setSetupDirty] = useState(false)

  useEffect(() => {
    const id = window.setInterval(() => setTick((value) => value + 1), 200)
    return () => window.clearInterval(id)
  }, [])

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target
      if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement) return
      if (event.code === 'Space') {
        event.preventDefault()
        setPlaying((value) => !value)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const onSelect = useCallback((id: number | null) => setSelectedId(id), [])

  const applyParams = (next: Params, resetWorld: boolean) => {
    const clean = { ...next }
    ;(Object.keys(clean) as ParamKey[]).forEach((key) => {
      clean[key] = clampParam(key, clean[key])
    })
    engine.setParams(clean)
    if (resetWorld) engine.reset()
    setParams(clean)
    setTick((value) => value + 1)
  }

  const onChange = (key: ParamKey, value: number) => {
    const next = { ...params, [key]: clampParam(key, value) }
    applyParams(next, false)
    setPresetId(null)
    if (isSetupParam(key)) setSetupDirty(true)
  }

  const onPreset = (preset: Preset) => {
    applyParams(preset.params, true)
    setPresetId(preset.id)
    setSetupDirty(false)
    setSelectedId(null)
  }

  const reset = () => {
    applyParams(params, true)
    setSetupDirty(false)
    setSelectedId(null)
  }

  const randomize = () => {
    applyParams(randomParams(), true)
    setPresetId(null)
    setSetupDirty(false)
    setSelectedId(null)
    setSimSpeed(1)
  }

  const step = () => {
    engine.run(0.5)
    setTick((value) => value + 1)
  }

  const world = engine.world
  const selected = selectedId == null ? null : (world.blobs.find((blob) => blob.id === selectedId) ?? null)
  const summary = summarise(engine.history, world.trees.length * params.fruitLimit, world.counts.blue, world.counts.red)
  void tick

  return (
    <div className="app">
      <header className="top">
        <h1>Grok 4.7</h1>
        <div className="transport">
          <button type="button" onClick={() => setPlaying(true)} aria-pressed={playing}>
            Play
          </button>
          <button type="button" onClick={() => setPlaying(false)} aria-pressed={!playing}>
            Pause
          </button>
          <button type="button" onClick={step}>
            Step
          </button>
          <button type="button" onClick={reset}>
            Reset
          </button>
          <button type="button" onClick={randomize}>
            Randomize
          </button>
        </div>
        <label className="speed">
          Simulation speed
          <input
            type="range"
            min={0.25}
            max={8}
            step={0.25}
            value={simSpeed}
            onChange={(event) => setSimSpeed(Number(event.target.value))}
          />
          <b>{trim(simSpeed)}×</b>
        </label>
        <div className="live">
          <span>
            <i className="swatch fruit" /> Fruit <strong data-testid="count-fruit">{world.counts.fruit}</strong>
          </span>
          <span>
            <i className="swatch blue" /> Blue <strong data-testid="count-blue">{world.counts.blue}</strong>
          </span>
          <span>
            <i className="swatch red" /> Red <strong data-testid="count-red">{world.counts.red}</strong>
          </span>
          <span data-testid="clock">{formatTime(world.t)}</span>
        </div>
      </header>
      <div className="workspace">
        <Controls
          params={params}
          presets={PRESETS}
          activePreset={presetId}
          setupDirty={setupDirty}
          onChange={onChange}
          onPreset={onPreset}
        />
        <div className="stage">
          <Garden engine={engine} playing={playing} simSpeed={simSpeed} selectedId={selectedId} onSelect={onSelect} />
          <p className="hint">Drag the dish to turn it. Click a blob.</p>
        </div>
        <div className="side">
          <Charts samples={engine.history} summary={summary} />
          <Inspector blob={selected} missing={selectedId != null && selected == null} params={params} onClear={() => setSelectedId(null)} />
        </div>
      </div>
    </div>
  )
}

function formatTime(t: number) {
  const seconds = Math.floor(t)
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

function trim(value: number) {
  return Number(value.toFixed(2)).toString()
}
