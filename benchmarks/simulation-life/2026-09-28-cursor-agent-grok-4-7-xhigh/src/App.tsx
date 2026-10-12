import { useEffect, useMemo, useRef, useState, type RefObject } from 'react'
import { Charts } from './components/Charts'
import { Controls } from './components/Controls'
import { Inspector } from './components/Inspector'
import { createWorld, setupMismatch, tally } from './sim/engine'
import { presetById, randomParams } from './sim/presets'
import { summarize } from './sim/summary'
import type { Agent, Params, World } from './sim/types'
import { mountGarden } from './scene/mountGarden'

const START = presetById('balanced').params

export function App() {
  const [params, setParams] = useState<Params>(START)
  const [presetId, setPresetId] = useState('balanced')
  const [playing, setPlaying] = useState(true)
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [frame, setFrame] = useState(0)
  const worldRef = useRef<World | null>(null)
  if (worldRef.current == null) worldRef.current = createWorld(params)
  const paramsRef = useRef(params)
  paramsRef.current = params
  const playingRef = useRef(playing)
  playingRef.current = playing
  const selectedRef = useRef<number | null>(selectedId)
  selectedRef.current = selectedId
  const stepRef = useRef(0)
  const onFrameRef = useRef(() => {})
  onFrameRef.current = () => setFrame((value) => value + 1)
  const snapshotRef = useRef<Agent | null>(null)
  const sideRef = useRef<HTMLDivElement>(null)

  const world = worldRef.current
  const counts = tally(world)
  const story = useMemo(() => summarize(world.history), [frame, world])
  const live = selectedId == null ? null : (world.agents.find((agent) => agent.id === selectedId) ?? null)
  if (live) snapshotRef.current = { ...live }
  const shown = live ?? (selectedId != null && snapshotRef.current?.id === selectedId ? snapshotRef.current : null)
  const dirty = setupMismatch(world, params)

  function plant(next: Params, id: string) {
    const copy = { ...next }
    paramsRef.current = copy
    setParams(copy)
    setPresetId(id)
    worldRef.current = createWorld(copy)
    snapshotRef.current = null
    selectedRef.current = null
    setSelectedId(null)
    setFrame((value) => value + 1)
  }

  function patch(partial: Partial<Params>) {
    setParams((current) => {
      const next = { ...current, ...partial }
      paramsRef.current = next
      return next
    })
    setPresetId('custom')
  }

  useEffect(() => {
    if (selectedId != null) sideRef.current?.scrollTo({ top: 0, behavior: 'smooth' })
  }, [selectedId])

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const tag = (event.target as HTMLElement | null)?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'BUTTON') return
      if (event.code === 'Space') {
        event.preventDefault()
        setPlaying((value) => !value)
      } else if (event.key === '.') {
        stepRef.current += 1
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const holdTimer = useRef<number | null>(null)
  function startHold() {
    stepRef.current += 1
    holdTimer.current = window.setInterval(() => {
      stepRef.current += 1
    }, 80)
    const stop = () => {
      if (holdTimer.current != null) window.clearInterval(holdTimer.current)
      holdTimer.current = null
      window.removeEventListener('pointerup', stop)
    }
    window.addEventListener('pointerup', stop)
  }

  const actions = summarizeActions(counts.actions)

  return (
    <div className="app">
      <header className="top">
        <h1>Grok 4.7</h1>
        <div className="transport">
          <button type="button" aria-pressed={playing} onClick={() => setPlaying(true)}>
            Play
          </button>
          <button type="button" aria-pressed={!playing} onClick={() => setPlaying(false)}>
            Pause
          </button>
          <button type="button" onPointerDown={startHold}>
            Step
          </button>
          <button type="button" className={dirty ? 'alert' : ''} onClick={() => plant(params, presetId)}>
            Reset
          </button>
          <button
            type="button"
            onClick={() => {
              plant(randomParams(), 'custom')
              setPlaying(true)
            }}
          >
            Randomize
          </button>
          <span className="beat">Beat {counts.tick}</span>
        </div>
      </header>
      <Controls params={params} presetId={presetId} dirty={dirty} onChange={patch} onPreset={(id) => {
        plant(presetById(id).params, id)
        setPlaying(true)
      }} />
      <main className="stage">
        <GardenCanvas
          worldRef={worldRef}
          paramsRef={paramsRef}
          playingRef={playingRef}
          selectedRef={selectedRef}
          stepRef={stepRef}
          onFrameRef={onFrameRef}
          setSelected={setSelectedId}
        />
        <div className="hud">
          <span><i className="swatch fruit" /> {counts.fruit.toFixed(1)} <small>{counts.ripe} ripe</small></span>
          <span><i className="swatch blue" /> {counts.blue}</span>
          <span><i className="swatch red" /> {counts.red}</span>
          {!playing ? <span className="paused">Paused</span> : null}
        </div>
        <p className="stage-hint">Drag to turn the dish. Click a blob.</p>
        {actions ? <p className="actions">{actions}</p> : null}
      </main>
      <div className="side" ref={sideRef}>
        <Inspector agent={shown} missing={selectedId != null && live == null} params={params} />
        <Charts history={world.history} story={story} frame={frame} />
        <p className="lifetime">
          Blue born {world.bornBlue} · faded {world.diedBlue}
          <br />
          Red born {world.bornRed} · faded {world.diedRed}
        </p>
      </div>
    </div>
  )
}

function GardenCanvas({
  worldRef,
  paramsRef,
  playingRef,
  selectedRef,
  stepRef,
  onFrameRef,
  setSelected,
}: {
  worldRef: RefObject<World | null>
  paramsRef: RefObject<Params>
  playingRef: RefObject<boolean>
  selectedRef: RefObject<number | null>
  stepRef: RefObject<number>
  onFrameRef: RefObject<() => void>
  setSelected: (id: number | null) => void
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    return mountGarden(canvas, {
      getWorld: () => worldRef.current!,
      getParams: () => paramsRef.current,
      getPlaying: () => playingRef.current,
      consumeSteps: () => {
        const extra = stepRef.current
        stepRef.current = 0
        return extra
      },
      getSelected: () => selectedRef.current,
      setSelected: (id) => {
        selectedRef.current = id
        setSelected(id)
      },
      onFrame: () => onFrameRef.current(),
    })
  }, [onFrameRef, paramsRef, playingRef, selectedRef, setSelected, stepRef, worldRef])
  return <canvas ref={canvasRef} />
}

function summarizeActions(actions: Record<string, number>) {
  const labels: Record<string, string> = {
    'blue:seek-fruit': 'seeking fruit',
    'blue:eat': 'eating',
    'blue:flee': 'fleeing',
    'blue:avoid': 'spreading out',
    'red:seek-blue': 'chasing',
    'red:contact': 'visiting',
    'red:pause': 'pausing',
  }
  return Object.entries(actions)
    .filter(([key]) => labels[key])
    .map(([key, count]) => `${count} ${labels[key]}`)
    .join(' · ')
}
