import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react'
import { DEFAULT_PARAMS, type Params } from './sim/params'
import { Runner, SPEEDS } from './sim/runner'
import { fmtTime } from './sim/analysis'
import type { GardenScene } from './render/scene'
import { GardenView } from './ui/GardenView'
import { Toolbar } from './ui/Toolbar'
import { ControlPanel } from './ui/ControlPanel'
import { Inspector } from './ui/Inspector'
import { TimelineChart } from './ui/TimelineChart'
import { PhasePlot, TraitTrends } from './ui/SideCharts'
import { Story } from './ui/Story'

const TITLE = 'Claude Sonnet 5.5'

declare global {
  interface Window {
    __garden?: { runner: Runner; scene: GardenScene | null }
  }
}

export function App() {
  const runner = useMemo(() => new Runner(DEFAULT_PARAMS), [])
  const sceneRef = useRef<GardenScene | null>(null)
  const [pv, force] = useReducer((n: number) => n + 1, 0)
  const [tick, setTick] = useState(0)
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [follow, setFollow] = useState(false)
  const [autoRotate, setAutoRotate] = useState(true)

  const staged = useMemo<Params>(
    () => ({ ...runner.staged }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [runner, pv],
  )
  const applied = useMemo<Params>(
    () => ({ ...runner.world.params }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [runner, runner.world, pv],
  )

  useEffect(() => {
    document.title = TITLE
  }, [])

  useEffect(() => {
    window.__garden = { runner, scene: sceneRef.current }
    return () => {
      window.__garden = undefined
    }
  }, [runner])

  const onFrame = useCallback(() => setTick((n) => n + 1), [])

  const clearSelection = useCallback(() => {
    setSelectedId(null)
    setFollow(false)
    sceneRef.current?.select(null)
  }, [])

  const act = useMemo(
    () => ({
      toggle: () => {
        runner.toggle()
        force()
      },
      step: () => {
        runner.stepOnce(1)
        force()
      },
      reset: () => {
        runner.reset()
        clearSelection()
        force()
      },
      randomize: () => {
        runner.randomize()
        clearSelection()
        force()
      },
      speed: (s: number) => {
        runner.setSpeed(s)
        force()
      },
      preset: (id: string) => {
        runner.loadPreset(id)
        clearSelection()
        force()
      },
      param: <K extends keyof Params>(key: K, value: Params[K]) => {
        runner.setParam(key, value)
        runner.presetId = 'custom'
        force()
      },
    }),
    [runner, clearSelection],
  )

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement | null)?.tagName
      if (tag === 'INPUT' && (e.target as HTMLInputElement).type !== 'range') return
      if (tag === 'TEXTAREA' || tag === 'SELECT') return
      if (e.metaKey || e.ctrlKey || e.altKey) return
      switch (e.key) {
        case ' ':
          if (tag === 'BUTTON') return
          e.preventDefault()
          act.toggle()
          break
        case 's':
        case 'S':
          act.step()
          break
        case 'r':
        case 'R':
          act.reset()
          break
        case 'n':
        case 'N':
          act.randomize()
          break
        case 'Escape':
          clearSelection()
          break
        case '+':
        case '=': {
          const i = SPEEDS.indexOf(runner.speed)
          act.speed(SPEEDS[Math.min(SPEEDS.length - 1, i + 1)])
          break
        }
        case '-': {
          const i = SPEEDS.indexOf(runner.speed)
          act.speed(SPEEDS[Math.max(0, i - 1)])
          break
        }
      }
    }
    const onClick = (e: MouseEvent) => {
      if (e.detail === 0) return
      ;(e.target as HTMLElement | null)?.closest('button')?.blur()
    }
    window.addEventListener('keydown', onKey)
    window.addEventListener('click', onClick)
    return () => {
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('click', onClick)
    }
  }, [act, clearSelection, runner])

  const world = runner.world
  const running = runner.playing || runner.stepping

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <span className="logo" aria-hidden="true">
            <i className="b" />
            <i className="r" />
          </span>
          <h1>{TITLE}</h1>
        </div>
        <Toolbar
          playing={running}
          speed={runner.speed}
          onToggle={act.toggle}
          onStep={act.step}
          onReset={act.reset}
          onRandomize={act.randomize}
          onSpeed={act.speed}
        />
      </header>

      <aside className="col-left">
        <ControlPanel
          staged={staged}
          applied={applied}
          presetId={runner.presetId}
          pendingRestart={runner.pendingRestart}
          onChange={act.param}
          onPreset={act.preset}
          onRestart={act.reset}
        />
      </aside>

      <main className="col-main">
        <div className="stage">
          <GardenView
            runner={runner}
            selectedId={selectedId}
            follow={follow}
            onPick={(id) => {
              setSelectedId(id)
              if (id === null) setFollow(false)
            }}
            onFrame={onFrame}
            onScene={(s) => {
              sceneRef.current = s
              if (window.__garden) window.__garden.scene = s
            }}
          />
          <div className="hud" aria-live="off">
            <span className="pill time">
              <b>{fmtTime(world.t)}</b> garden time
            </span>
            <span className="pill fruit">
              <i />
              Fruit <b>{world.fruitCount}</b>
            </span>
            <span className="pill blue">
              <i />
              Blue <b>{world.blueCount}</b>
            </span>
            <span className="pill red">
              <i />
              Red <b>{world.redCount}</b>
            </span>
          </div>
          <div className="stage-tools">
            <button
              type="button"
              className={`chip-btn${autoRotate ? ' on' : ''}`}
              onClick={() => {
                const next = !autoRotate
                setAutoRotate(next)
                sceneRef.current?.setAutoRotate(next)
              }}
            >
              Auto-rotate
            </button>
            <button type="button" className="chip-btn" onClick={() => sceneRef.current?.fitCamera(false)}>
              Recenter
            </button>
          </div>
          <div className="stage-hint">Drag to rotate · scroll to zoom · click a blob to inspect it</div>
          {!running && world.t < 0.5 && (
            <button type="button" className="big-play" onClick={act.toggle}>
              <span aria-hidden="true">▶</span> Press play
            </button>
          )}
        </div>
        <TimelineChart world={world} tick={tick} />
      </main>

      <aside className="col-right">
        <Inspector
          world={world}
          selectedId={selectedId}
          follow={follow}
          onFollow={setFollow}
          onClose={clearSelection}
          onSelect={(id) => {
            setSelectedId(id)
            sceneRef.current?.select(id)
          }}
        />
        <Story world={world} tick={tick} />
        <PhasePlot world={world} tick={tick} />
        <TraitTrends world={world} tick={tick} />
        <section className="panel rules" aria-label="How the rules connect">
          <div className="panel-title">
            <h2>How it fits together</h2>
          </div>
          <ol className="rules-list">
            <li>
              <b>Fruit</b> grows on trees and returns slowly after it is picked.
            </li>
            <li>
              <b className="blue">Blue</b> eats fruit for energy and copies itself when it is full.
            </li>
            <li>
              <b className="red">Red</b> gets energy from a gentle contact with blue, then rests.
            </li>
            <li>Moving, waiting and copying all cost energy, so nobody grows for free.</li>
          </ol>
        </section>
      </aside>
    </div>
  )
}
