import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent, type WheelEvent as ReactWheelEvent } from 'react';
import { ChartCanvas } from './ui/ChartCanvas';
import { Controls } from './ui/Controls';
import { Inspector } from './ui/Inspector';
import { Summary } from './ui/Summary';
import { randomizeParams } from './ui/randomize';
import { Engine } from './sim/engine';
import { fmtTime, summarize } from './sim/analysis';
import { DEFAULT_PARAMS, withPreset, type ParamKey, type Params, type Preset } from './sim/params';
import { WorldRenderer, type Camera, type Pick } from './render/worldRenderer';

const SPEEDS = [1, 2, 4, 8, 16];
const CAM_START: Camera = { yaw: -0.5, tilt: 0.95, zoom: 1 };
const REFRESH_MS = 250;

function clamp(v: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, v));
}

interface Drag {
  x: number;
  y: number;
  moved: boolean;
  id: number;
}

export function App() {
  const [engine] = useState(() => new Engine(DEFAULT_PARAMS));
  const [renderer] = useState(() => new WorldRenderer());
  const [draft, setDraft] = useState<Params>(DEFAULT_PARAMS);
  const [applied, setApplied] = useState<Params>(DEFAULT_PARAMS);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [selected, setSelected] = useState<Pick | null>(null);
  const [showTraits, setShowTraits] = useState(false);
  const [, setFrame] = useState(0);

  const stageRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const camRef = useRef<Camera>({ ...CAM_START });
  const selRef = useRef<Pick | null>(null);
  const hovRef = useRef<Pick | null>(null);
  const dragRef = useRef<Drag | null>(null);

  useEffect(() => {
    engine.playing = playing;
  }, [engine, playing]);

  useEffect(() => {
    engine.speed = speed;
  }, [engine, speed]);

  useEffect(() => {
    engine.setParams(draft);
  }, [engine, draft]);

  useEffect(() => {
    selRef.current = selected;
  }, [selected]);

  useEffect(() => {
    const id = window.setInterval(() => setFrame((f) => f + 1), REFRESH_MS);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    const stage = stageRef.current;
    if (!canvas || !stage) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let raf = 0;
    let last = performance.now();
    const frame = (now: number) => {
      const dt = Math.min(0.1, (now - last) / 1000);
      last = now;
      engine.advance(dt);

      const dpr = window.devicePixelRatio || 1;
      const w = stage.clientWidth;
      const h = stage.clientHeight;
      if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(h * dpr)) {
        canvas.width = Math.round(w * dpr);
        canvas.height = Math.round(h * dpr);
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      renderer.draw(ctx, w, h, engine.world, camRef.current, dt, selRef.current, hovRef.current);
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [engine, renderer]);

  const resetGarden = (p: Params) => {
    engine.reset(p);
    setApplied(p);
    setSelected(null);
    setFrame((f) => f + 1);
  };

  const togglePlay = () => setPlaying((on) => !on);

  const step = () => {
    setPlaying(false);
    engine.playing = false;
    engine.stepSecond();
    setFrame((f) => f + 1);
  };

  const changeParam = (key: ParamKey, value: number) => {
    setDraft((d) => ({ ...d, [key]: value }));
  };

  const applyPreset = (preset: Preset) => {
    const next = withPreset(draft, preset);
    setDraft(next);
    resetGarden(next);
  };

  const randomize = () => {
    const next = randomizeParams(draft);
    setDraft(next);
    resetGarden(next);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA') return;
      if (e.code === 'Space') {
        e.preventDefault();
        // Blur a focused button so its native Space click doesn't fire on keyup and double-toggle.
        if (tag === 'BUTTON') (e.target as HTMLElement).blur();
        togglePlay();
      } else if (e.key === 's' || e.key === 'S') {
        step();
      } else if (e.key === 'r' || e.key === 'R') {
        resetGarden(draft);
      } else if (e.key === 'Escape') {
        setSelected(null);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [draft]);

  const localXY = (e: ReactPointerEvent<HTMLCanvasElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };

  const onPointerDown = (e: ReactPointerEvent<HTMLCanvasElement>) => {
    dragRef.current = { x: e.clientX, y: e.clientY, moved: false, id: e.pointerId };
    e.currentTarget.setPointerCapture(e.pointerId);
    e.currentTarget.style.cursor = 'grabbing';
  };

  const onPointerMove = (e: ReactPointerEvent<HTMLCanvasElement>) => {
    const drag = dragRef.current;
    if (drag && drag.id === e.pointerId) {
      const dx = e.clientX - drag.x;
      const dy = e.clientY - drag.y;
      if (Math.abs(dx) + Math.abs(dy) > 3) drag.moved = true;
      drag.x = e.clientX;
      drag.y = e.clientY;
      if (drag.moved) {
        const cam = camRef.current;
        cam.yaw += dx * 0.008;
        cam.tilt = clamp(cam.tilt + dy * 0.004, 0.45, 1.3);
      }
      return;
    }
    const p = localXY(e);
    hovRef.current = renderer.pick(p.x, p.y);
    e.currentTarget.style.cursor = hovRef.current ? 'pointer' : 'grab';
  };

  const onPointerUp = (e: ReactPointerEvent<HTMLCanvasElement>) => {
    const drag = dragRef.current;
    dragRef.current = null;
    e.currentTarget.style.cursor = 'grab';
    if (!drag || drag.moved) return;
    const p = localXY(e);
    setSelected(renderer.pick(p.x, p.y));
  };

  const onPointerLeave = () => {
    hovRef.current = null;
  };

  const onWheel = (e: ReactWheelEvent<HTMLCanvasElement>) => {
    const cam = camRef.current;
    cam.zoom = clamp(cam.zoom * Math.exp(-e.deltaY * 0.0012), 0.6, 2.6);
  };

  const world = engine.world;
  const history = engine.history;
  const summary = summarize(history);
  const fruit = world.trees.reduce((sum, t) => sum + t.fruit, 0);

  return (
    <div className="app">
      <header className="topbar">
        <h1>Claude Haiku 5.5</h1>
        <div className="transport" role="toolbar" aria-label="Simulation controls">
          <button className="btn primary" onClick={togglePlay} aria-pressed={playing}>
            {playing ? 'Pause' : 'Play'}
          </button>
          <button className="btn" onClick={step} disabled={playing}>
            Step 1 s
          </button>
          <button className="btn" onClick={() => resetGarden(draft)}>
            Reset
          </button>
          <button className="btn" onClick={randomize}>
            Randomize
          </button>
          <div className="speeds" role="group" aria-label="Simulation speed">
            {SPEEDS.map((s) => (
              <button
                key={s}
                className={`speed ${speed === s ? 'on' : ''}`}
                onClick={() => setSpeed(s)}
                aria-pressed={speed === s}
              >
                {s}×
              </button>
            ))}
          </div>
        </div>
        <div className="chips">
          <span className="chip">Time {fmtTime(world.time)}</span>
          <span className="chip green">Fruit {fruit}</span>
          <span className="chip blue">Blue {world.blue.length}</span>
          <span className="chip red">Red {world.red.length}</span>
        </div>
      </header>

      <main className="layout">
        <aside className="panel">
          <Controls
            draft={draft}
            applied={applied}
            onChange={changeParam}
            onPreset={applyPreset}
            onApply={() => resetGarden(draft)}
          />
        </aside>

        <section className="center">
          <div className="stage" ref={stageRef}>
            <canvas
              ref={canvasRef}
              className="garden"
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
              onPointerLeave={onPointerLeave}
              onWheel={onWheel}
            />
            <div className="stage-hint">Drag to rotate · scroll to zoom · click to inspect · Space play · S step · R reset</div>
          </div>

          <div className="charts">
            <div className="card">
              <div className="card-head">
                <h2>Population over time</h2>
                <div className="legend">
                  <span className="lg green">fruit</span>
                  <span className="lg blue">blue</span>
                  <span className="lg red">red</span>
                </div>
              </div>
              <ChartCanvas kind="timeline" history={history} version={history.length} height={200} label="Population timeline" />
            </div>
            <div className="card">
              <div className="card-head">
                <h2>Blue vs red</h2>
                <div className="legend">
                  <span className="lg">x blue · y red</span>
                  <span className="lg">light → dark = early → late</span>
                </div>
              </div>
              <ChartCanvas kind="phase" history={history} version={history.length} height={240} label="Blue versus red phase plot" />
            </div>
          </div>

          <div className="card">
            <div className="card-head">
              <h2>Trait trends</h2>
              <button className="btn small" onClick={() => setShowTraits((on) => !on)} aria-pressed={showTraits}>
                {showTraits ? 'Hide' : 'Show'}
              </button>
            </div>
            {showTraits && (
              <>
                <div className="legend">
                  <span className="lg blue">blue speed (dashed) / vision</span>
                  <span className="lg red">red speed (dashed) / vision</span>
                </div>
                <ChartCanvas kind="traits" history={history} version={history.length} height={200} label="Trait trends" />
              </>
            )}
          </div>

          <Summary summary={summary} samples={history.length} />
        </section>

        <aside className="panel">
          <Inspector world={world} selected={selected} onClear={() => setSelected(null)} />
        </aside>
      </main>
    </div>
  );
}
