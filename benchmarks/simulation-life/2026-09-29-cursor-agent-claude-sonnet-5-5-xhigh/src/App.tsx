import { useCallback, useEffect, useState } from 'react';
import { PhaseChart } from './charts/PhaseChart';
import { TimelineChart } from './charts/TimelineChart';
import { TraitChart } from './charts/TraitChart';
import { Inspector } from './components/Inspector';
import { ParamSlider } from './components/ParamSlider';
import { SummaryPanel } from './components/SummaryPanel';
import { WorldCanvas } from './components/WorldCanvas';
import { fmtClock } from './analysis';
import { WorldView } from './render/worldView';
import { Simulator } from './sim/controller';
import type { Blob } from './sim/engine';
import { BLUE_SPECS, FRUIT_SPECS, PRESETS, RED_SPECS, SPEED_SPEC, WORLD_SPECS, type ParamKey, type ParamSpec } from './sim/params';

const QUICK_SPEEDS = [1, 2, 4, 8, 16];

function useSimulation() {
  const [sim] = useState(() => {
    const s = new Simulator();
    s.play();
    return s;
  });
  const [view] = useState(() => new WorldView());
  const [, setTick] = useState(0);
  const bump = useCallback(() => setTick((t) => t + 1), []);

  useEffect(() => {
    let key = '';
    const id = window.setInterval(() => {
      const k = `${sim.world.time.toFixed(2)}|${sim.worldVersion}|${sim.playing}`;
      if (k !== key) {
        key = k;
        bump();
      }
    }, 200);
    return () => window.clearInterval(id);
  }, [sim, bump]);

  return { sim, view, bump };
}

function Icon({ name }: { name: 'play' | 'pause' | 'step' | 'reset' | 'dice' | 'plus' | 'minus' | 'home' }) {
  const paths: Record<string, string> = {
    play: 'M8 5.5v13l11-6.5z',
    pause: 'M7 5h3.5v14H7zM13.5 5H17v14h-3.5z',
    step: 'M6 5.5v13l8-6.5zM16 5h2.5v14H16z',
    reset: 'M12 5a7 7 0 1 1-6.6 4.7M5 4v5.5h5.5',
    dice: 'M6 4h12a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2zM9 9h.01M15 9h.01M12 12h.01M9 15h.01M15 15h.01',
    plus: 'M12 5v14M5 12h14',
    minus: 'M5 12h14',
    home: 'M4 11l8-7 8 7M6 10v9h4v-5h4v5h4v-9',
  };
  const filled = name === 'play' || name === 'pause' || name === 'step';
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" fill={filled ? 'currentColor' : 'none'} stroke={filled ? 'none' : 'currentColor'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d={paths[name]} />
    </svg>
  );
}

export function App() {
  const { sim, view, bump } = useSimulation();
  const [selected, setSelected] = useState<Blob | null>(null);
  const [energyBars, setEnergyBars] = useState(false);
  const world = sim.world;
  const params = sim.params;

  useEffect(() => {
    view.options.energyBars = energyBars;
  }, [view, energyBars]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (e.code !== 'Space' || (t && /^(INPUT|BUTTON|TEXTAREA|SELECT)$/.test(t.tagName))) return;
      e.preventDefault();
      sim.toggle();
      bump();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [sim, bump]);

  const select = useCallback(
    (id: number) => {
      const b = id ? (sim.world.blobAt(id) ?? null) : null;
      view.selectedId = b ? b.id : 0;
      setSelected(b);
    },
    [sim, view],
  );

  const clearSelection = () => {
    view.selectedId = 0;
    setSelected(null);
  };

  const rebuildAfter = (fn: () => void) => {
    fn();
    clearSelection();
    bump();
  };

  const setParam = (key: ParamKey, value: number) => {
    const rebuild = key === 'seed' || WORLD_SPECS.some((s) => s.key === key);
    if (rebuild) rebuildAfter(() => sim.setParam(key, value));
    else {
      sim.setParam(key, value);
      bump();
    }
  };

  const activePreset = PRESETS.find((p) => p.id === sim.presetId);
  const paused = !sim.playing;
  const capacity = world.fruitCapacity;

  const group = (title: string, specs: ParamSpec[], tone: 'fruit' | 'blue' | 'red' | 'world', open = true) => (
    <details className={`group tone-${tone}`} open={open}>
      <summary>
        <span className="dot" />
        {title}
      </summary>
      <div className="group-body">
        {specs.map((spec) => (
          <ParamSlider key={spec.key} spec={spec} tone={tone} value={params[spec.key]} onChange={(v) => setParam(spec.key, v)} />
        ))}
      </div>
    </details>
  );

  return (
    <div className="app">
      <header className="topbar">
        <h1>Claude Sonnet 5.5</h1>
        <nav className="presets" aria-label="Presets">
          {PRESETS.map((p) => (
            <button
              key={p.id}
              className={`chip${sim.presetId === p.id ? ' on' : ''}`}
              title={p.blurb}
              onClick={() =>
                rebuildAfter(() => {
                  sim.applyPreset(p.id);
                })
              }
            >
              {p.name}
            </button>
          ))}
          {!sim.presetId && <span className="chip custom">Custom mix</span>}
        </nav>
      </header>

      <div className="layout">
        <aside className="controls" aria-label="Garden settings">
          <p className="preset-blurb">{activePreset ? activePreset.blurb : 'Custom settings. Pick a preset to start over from a known garden.'}</p>
          {group('Fruit', FRUIT_SPECS, 'fruit')}
          {group('Blue blobs', BLUE_SPECS, 'blue')}
          {group('Red blobs', RED_SPECS, 'red')}
          <details className="group tone-world" open>
            <summary>
              <span className="dot" />
              Garden setup
            </summary>
            <div className="group-body">
              {WORLD_SPECS.map((spec) => (
                <ParamSlider key={spec.key} spec={spec} tone="world" value={params[spec.key]} onChange={(v) => setParam(spec.key, v)} />
              ))}
              <div className="seed-row">
                <label htmlFor="seed">Seed</label>
                <input
                  id="seed"
                  type="number"
                  min={1}
                  max={99999}
                  value={params.seed}
                  onChange={(e) => {
                    const v = Math.max(1, Math.min(99999, Math.round(Number(e.target.value) || 1)));
                    setParam('seed', v);
                  }}
                />
                <button className="icon-btn" title="Roll a new seed" aria-label="Roll a new seed" onClick={() => setParam('seed', 1 + Math.floor(Math.random() * 9999))}>
                  <Icon name="dice" />
                </button>
              </div>
              <label className="toggle">
                <input type="checkbox" checked={energyBars} onChange={(e) => setEnergyBars(e.target.checked)} />
                <span>Show energy bars on every blob</span>
              </label>
            </div>
          </details>
        </aside>

        <main className="main">
          <section className="card stage-card" aria-label="Garden">
            <div className="stage">
              <WorldCanvas sim={sim} view={view} onPick={select} />

              <div className="hud" aria-live="off">
                <span className="hud-chip">
                  <i className="d-time" />
                  {fmtClock(world.time)}
                </span>
                <span className="hud-chip">
                  <i className="d-blue" />
                  Blue <b>{world.blueCount}</b>
                </span>
                <span className="hud-chip">
                  <i className="d-red" />
                  Red <b>{world.redCount}</b>
                </span>
                <span className="hud-chip">
                  <i className="d-fruit" />
                  Fruit <b>{world.fruitCount}</b>
                  <small>/{capacity}</small>
                </span>
                {paused && <span className="hud-chip paused">Paused</span>}
              </div>

              <div className="view-tools">
                <button className="icon-btn glass" title="Zoom in" aria-label="Zoom in" onClick={() => view.cam.setZoom(view.cam.zoom * 1.15)}>
                  <Icon name="plus" />
                </button>
                <button className="icon-btn glass" title="Zoom out" aria-label="Zoom out" onClick={() => view.cam.setZoom(view.cam.zoom / 1.15)}>
                  <Icon name="minus" />
                </button>
                <button className="icon-btn glass" title="Reset view" aria-label="Reset view" onClick={() => view.cam.resetView()}>
                  <Icon name="home" />
                </button>
              </div>

              <p className="stage-hint">Drag to rotate · click a blob to inspect</p>

              {selected && <Inspector blob={selected} world={world} params={params} onSelect={select} onClose={clearSelection} />}
            </div>

            <div className="transport">
              <div className="buttons">
                <button
                  className="btn primary"
                  onClick={() => {
                    sim.toggle();
                    bump();
                  }}
                >
                  <Icon name={paused ? 'play' : 'pause'} />
                  {paused ? 'Play' : 'Pause'}
                </button>
                <button
                  className="btn"
                  title="Advance one second of garden time"
                  onClick={() => {
                    sim.pause();
                    sim.stepSeconds(1);
                    bump();
                  }}
                >
                  <Icon name="step" />
                  Step
                </button>
                <button
                  className="btn"
                  title="Restart with the current settings"
                  onClick={() => rebuildAfter(() => sim.reset())}
                >
                  <Icon name="reset" />
                  Reset
                </button>
                <button className="btn" title="Jitter the settings and start a new garden" onClick={() => rebuildAfter(() => sim.randomize())}>
                  <Icon name="dice" />
                  Randomize
                </button>
              </div>
              <div className="speed">
                <ParamSlider spec={SPEED_SPEC} tone="world" value={params.speed} onChange={(v) => setParam('speed', v)} />
                <div className="quick">
                  {QUICK_SPEEDS.map((s) => (
                    <button key={s} className={`mini${params.speed === s ? ' on' : ''}`} onClick={() => setParam('speed', s)}>
                      {s}×
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </section>

          <section className="charts" aria-label="Charts">
            <div className="card wide">
              <h2>Timeline</h2>
              <TimelineChart world={world} />
            </div>
            <div className="card">
              <h2>Run summary</h2>
              <SummaryPanel world={world} />
            </div>
            <div className="card">
              <h2>Blue vs red</h2>
              <PhaseChart world={world} />
            </div>
            <div className="card">
              <h2>Trait trends</h2>
              <TraitChart world={world} />
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}
