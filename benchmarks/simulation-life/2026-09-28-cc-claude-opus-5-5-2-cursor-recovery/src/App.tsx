import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Runner } from './sim/runner.ts'
import { PARAM_DEFS, PRESETS, type ParamKey, type Params } from './sim/params.ts'
import { tellStory } from './sim/analysis.ts'
import { GardenView } from './render/garden.ts'
import { Controls } from './ui/Controls.tsx'
import { Timeline } from './ui/Timeline.tsx'
import { PhasePlot } from './ui/PhasePlot.tsx'
import { Traits } from './ui/Traits.tsx'
import { Summary } from './ui/Summary.tsx'
import { Inspector } from './ui/Inspector.tsx'
import { clock } from './ui/chart.ts'

const SPEEDS = [0.25, 0.5, 1, 2, 4, 8, 12, 20]
const LIVE_KEYS = PARAM_DEFS.filter((d) => !d.onReset).map((d) => d.key)

function randomized(base: Params): Params {
  const out = { ...base }
  for (const d of PARAM_DEFS) {
    if (d.key === 'seed' || d.key === 'worldSize') continue
    const jitter = d.group === 'world' ? 0.3 : 0.22
    const raw = base[d.key] * (1 + (Math.random() * 2 - 1) * jitter)
    const stepped = Math.round(raw / d.step) * d.step
    out[d.key] = Number(Math.min(d.max, Math.max(d.min, stepped)).toFixed(4))
  }
  out.seed = 1 + Math.floor(Math.random() * 99998)
  return out
}

export function App() {
  const runnerRef = useRef<Runner | null>(null)
  if (!runnerRef.current) {
    runnerRef.current = new Runner(PRESETS[0].params)
    runnerRef.current.playing = true
  }
  const runner = runnerRef.current
  const [params, setParams] = useState<Params>(runner.params)
  const [applied, setApplied] = useState<Params>(runner.params)
  const [presetId, setPresetId] = useState<string | null>(PRESETS[0].id)
  const [playing, setPlaying] = useState(true)
  const [speedIdx, setSpeedIdx] = useState(2)
  const [selected, setSelected] = useState<number | null>(null)
  const [follow, setFollow] = useState(false)
  const [, setTick] = useState(0)
  const stageRef = useRef<HTMLDivElement>(null)
  const viewRef = useRef<GardenView | null>(null)
  const selRef = useRef(selected)
  const followRef = useRef(follow)
  selRef.current = selected
  followRef.current = follow

  useEffect(() => {
    const view = new GardenView(stageRef.current!)
    viewRef.current = view
    if (import.meta.env.DEV) (window as unknown as { __garden: unknown }).__garden = { runner: runnerRef.current, view }
    view.onPick = (id) => {
      setSelected(id)
      if (id === null) setFollow(false)
    }
    let raf = 0
    let last = performance.now()
    let lastUi = 0
    const loop = (now: number) => {
      const dt = (now - last) / 1000
      last = now
      const r = runnerRef.current!
      r.advance(dt, (ev) => view.onEvents(ev))
      view.render(r.world, r.alpha, dt, selRef.current, followRef.current)
      if (now - lastUi > 140) {
        lastUi = now
        setTick((t) => (t + 1) % 1_000_000)
      }
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => {
      cancelAnimationFrame(raf)
      view.dispose()
      viewRef.current = null
    }
  }, [])

  const plant = useCallback(
    (p: Params, id: string | null, play?: boolean) => {
      runner.reset(p)
      setParams(p)
      setApplied(p)
      setPresetId(id)
      setSelected(null)
      setFollow(false)
      if (play !== undefined) {
        runner.playing = play
        setPlaying(play)
      }
    },
    [runner],
  )

  const paramsRef = useRef(params)
  paramsRef.current = params
  const presetIdRef = useRef(presetId)
  presetIdRef.current = presetId

  const onParam = useCallback(
    (key: ParamKey, value: number) => {
      const next = { ...paramsRef.current, [key]: value }
      paramsRef.current = next
      const live = { ...runner.params }
      for (const k of LIVE_KEYS) live[k] = next[k]
      runner.setParams(live)
      setParams(next)
    },
    [runner],
  )

  const onPreset = useCallback((id: string) => plant({ ...PRESETS.find((p) => p.id === id)!.params }, id, true), [plant])
  const onNewSeed = useCallback(() => plant({ ...paramsRef.current, seed: 1 + Math.floor(Math.random() * 99998) }, presetIdRef.current), [plant])

  const togglePlay = useCallback(() => {
    runner.playing = !runner.playing
    setPlaying(runner.playing)
  }, [runner])
  const step = useCallback(() => {
    runner.playing = false
    setPlaying(false)
    runner.stepBy(0.5, (ev) => viewRef.current?.onEvents(ev))
    setTick((t) => t + 1)
  }, [runner])
  const reset = useCallback(() => plant(params, presetId), [plant, params, presetId])
  const randomize = useCallback(() => plant(randomized(params), null, true), [plant, params])
  const setSpeed = (i: number) => {
    setSpeedIdx(i)
    runner.speed = SPEEDS[i]
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement
      if (t.closest('input, textarea, select, button')) return
      if (e.code === 'Space') {
        e.preventDefault()
        togglePlay()
      } else if (e.code === 'ArrowRight' && !runner.playing) {
        e.preventDefault()
        step()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [togglePlay, step, runner])

  const world = runner.world
  const version = world.history.version
  const story = useMemo(() => tellStory(world.history, world.params, world.totals), [world, version])
  const pending = PARAM_DEFS.filter((d) => d.onReset && params[d.key] !== applied[d.key])
  const [nb, nr] = world.counts

  return (
    <div className="app">
      <main className="main">
        <header className="top">
          <h1>Claude Opus 5.5</h1>
          <div className="hud" aria-label="Live counts">
            <span className="pill fruit" title="Ripe fruit on the trees / most the trees can hold">
              <FruitIcon />
              <b>{world.ripe}</b>
              <small>/ {world.fruitCapacity} fruit</small>
            </span>
            <span className="pill blue" title="Blue blobs alive">
              <BlobIcon color="#3b82ec" />
              <b>{nb}</b>
              <small>blue</small>
            </span>
            <span className="pill red" title="Red blobs alive">
              <BlobIcon color="#ec5448" />
              <b>{nr}</b>
              <small>red</small>
            </span>
            <span className="pill time" title="Garden time">
              <b>{clock(world.t)}</b>
            </span>
          </div>
        </header>

        <section className="stage-wrap">
          <div className="stage" ref={stageRef} />
          <div className="stage-hint">
            <span>Drag to spin · scroll to zoom · click a blob</span>
            <button
              type="button"
              onClick={() => {
                setFollow(false)
                viewRef.current?.frameCamera()
              }}
            >
              Reset view
            </button>
          </div>
          {selected !== null && (
            <Inspector
              world={world}
              id={selected}
              follow={follow}
              onFollow={setFollow}
              onClose={() => {
                setSelected(null)
                setFollow(false)
              }}
            />
          )}
          <MapKey />
          <div className="transport" role="toolbar" aria-label="Simulation controls">
            <button type="button" className="btn primary play" onClick={togglePlay} aria-label={playing ? 'Pause' : 'Play'}>
              {playing ? <PauseIcon /> : <PlayIcon />}
              <span>{playing ? 'Pause' : 'Play'}</span>
            </button>
            <button type="button" className="btn" onClick={step} title="Pause and advance half a second (→)">
              Step
            </button>
            <button type="button" className={`btn ${pending.length ? 'attn' : ''}`} onClick={reset} title="Replant the garden with the current settings">
              Reset
              {pending.length > 0 && <i className="dot" aria-label="Unapplied starting settings" />}
            </button>
            <button type="button" className="btn" onClick={randomize} title="Shuffle the rules a little, pick a new seed and replant">
              Randomize
            </button>
            <label className="speed">
              <span>Speed</span>
              <input type="range" min={0} max={SPEEDS.length - 1} step={1} value={speedIdx} onChange={(e) => setSpeed(Number(e.target.value))} aria-valuetext={`${SPEEDS[speedIdx]}×`} />
              <b>{SPEEDS[speedIdx]}×</b>
            </label>
          </div>
          {pending.length > 0 && (
            <div className="pending-bar">
              {pending.map((d) => d.label).join(', ')} changed. <button type="button" onClick={reset}>Reset</button> to plant the new garden.
            </div>
          )}
        </section>

        <section className="charts">
          <Timeline history={world.history} version={version} />
          <Summary story={story} totals={world.totals} counts={world.counts} ripe={world.ripe} capacity={world.fruitCapacity} />
          <PhasePlot history={world.history} version={version} loops={story.loops} />
          <Traits history={world.history} version={version} mutation={params.mutation} />
        </section>
      </main>

      <aside className="side">
        <Controls params={params} applied={applied} presetId={presetId} onParam={onParam} onPreset={onPreset} onNewSeed={onNewSeed} />
      </aside>
    </div>
  )
}

function MapKey() {
  return (
    <details className="map-key">
      <summary>What am I seeing?</summary>
      <ul>
        <li>
          <b className="k-fruit">●</b> Green fruit hangs on the trees. Eaten spots stay bare, then regrow.
        </li>
        <li>
          <b className="k-red">!</b> A red blob spotted a blue one and gives chase.
        </li>
        <li>
          <b className="k-blue">
            <svg viewBox="0 0 12 14" width="10" height="12" aria-hidden>
              <path d="M6 1C7 4 11 6.5 11 9.2A5 5 0 0 1 1 9.2C1 6.5 5 4 6 1z" fill="currentColor" />
            </svg>
          </b>{' '}
          A blue blob is scooting away. Under leaves it is harder to spot.
        </li>
        <li>
          <b className="k-gold">✦</b> A boop: the red glows and rests, and the blue loses energy.
        </li>
        <li>
          <b className="k-pink">♥</b> Splitting in two, using stored energy.
        </li>
        <li>
          <b className="k-muted">z</b> Full and resting. Pale blobs are running low on energy.
        </li>
      </ul>
    </details>
  )
}

function BlobIcon({ color }: { color: string }) {
  return (
    <svg viewBox="0 0 20 22" width="16" height="18" aria-hidden>
      <path d="M10 1c4.5 0 7.5 4 7.5 9.5S14.5 20 10 20s-7.5-4-7.5-9.5S5.5 1 10 1z" fill={color} />
      <ellipse cx="7.5" cy="10" rx="1.2" ry="1.6" fill="#1d2231" />
      <ellipse cx="12.5" cy="10" rx="1.2" ry="1.6" fill="#1d2231" />
    </svg>
  )
}

function FruitIcon() {
  return (
    <svg viewBox="0 0 20 20" width="16" height="16" aria-hidden>
      <circle cx="10" cy="11.5" r="6.5" fill="#8fd13a" />
      <path d="M10 5c0-2 1-3 3-3.5" stroke="#6b5a2e" strokeWidth="1.6" fill="none" strokeLinecap="round" />
      <ellipse cx="7.5" cy="9" rx="1.6" ry="2.2" fill="#fff" opacity=".5" />
    </svg>
  )
}

function PlayIcon() {
  return (
    <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden>
      <path d="M4 2.5v11l9.5-5.5z" fill="currentColor" />
    </svg>
  )
}

function PauseIcon() {
  return (
    <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden>
      <rect x="3.5" y="2.5" width="3" height="11" rx="1" fill="currentColor" />
      <rect x="9.5" y="2.5" width="3" height="11" rx="1" fill="currentColor" />
    </svg>
  )
}
