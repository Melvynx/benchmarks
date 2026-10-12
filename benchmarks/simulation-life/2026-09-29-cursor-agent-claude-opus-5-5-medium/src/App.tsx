import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { Engine } from "./engine";
import { WorldView } from "./render/world";
import { DEFAULT_PARAMS, presetParams, RESET_KEYS, type ParamKey, type Params } from "./sim/params";
import { fmtTime, PhaseChart, TimelineChart, TraitChart } from "./ui/charts";
import { Controls } from "./ui/Controls";
import { Inspector } from "./ui/Inspector";
import { Summary } from "./ui/Summary";

const SPEEDS = [0.5, 1, 2, 3, 5, 8, 12];

function randomParams(base: Params): Params {
  const r = Math.random;
  const jitter = (v: number, amt: number, min: number, max: number, step: number) => {
    const x = v * (1 + (r() * 2 - 1) * amt);
    return Math.min(max, Math.max(min, Math.round(x / step) * step));
  };
  const d = DEFAULT_PARAMS;
  return {
    ...base,
    fruitGrowth: +jitter(d.fruitGrowth, 0.5, 0.05, 0.6, 0.01).toFixed(2),
    fruitLimit: jitter(d.fruitLimit, 0.4, 2, 10, 1),
    fruitDelay: jitter(d.fruitDelay, 0.6, 0.5, 12, 0.5),
    blueEnergyUse: +jitter(1, 0.25, 0.6, 1.6, 0.05).toFixed(2),
    blueSpeed: +jitter(d.blueSpeed, 0.2, 1.5, 5, 0.1).toFixed(1),
    blueVision: jitter(d.blueVision, 0.25, 3, 10, 0.25),
    blueCopy: jitter(d.blueCopy, 0.2, 45, 120, 1),
    blueEatTime: +jitter(d.blueEatTime, 0.4, 0.4, 3, 0.1).toFixed(1),
    redEnergyUse: +jitter(1, 0.25, 0.6, 1.6, 0.05).toFixed(2),
    redSpeed: +jitter(d.redSpeed, 0.15, 2, 5, 0.1).toFixed(1),
    redVision: jitter(d.redVision, 0.25, 3, 9, 0.25),
    redContact: jitter(d.redContact, 0.3, 20, 90, 1),
    redCopy: jitter(d.redCopy, 0.25, 80, 200, 1),
    redPause: +jitter(d.redPause, 0.4, 1, 8, 0.1).toFixed(1),
    trees: jitter(d.trees, 0.4, 5, 30, 1),
    blues: jitter(d.blues, 0.5, 10, 90, 1),
    reds: jitter(d.reds, 0.6, 2, 30, 1),
    worldSize: jitter(d.worldSize, 0.2, 12, 24, 1),
    seed: 1 + Math.floor(r() * 9998),
  };
}

export default function App() {
  const engineRef = useRef<Engine | null>(null);
  if (!engineRef.current) engineRef.current = new Engine(DEFAULT_PARAMS);
  const engine = engineRef.current;
  const version = useSyncExternalStore(engine.subscribe, engine.getVersion);

  const worldRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<WorldView | null>(null);
  const [params, setParams] = useState<Params>(DEFAULT_PARAMS);
  const [applied, setApplied] = useState<Params>(DEFAULT_PARAMS);
  const [activePreset, setActivePreset] = useState<string | null>("balanced");
  const [selected, setSelected] = useState<number | null>(null);
  const [follow, setFollow] = useState(false);
  const [intents, setIntents] = useState(true);
  const [autoRotate, setAutoRotate] = useState(false);
  const [sideTab, setSideTab] = useState<"phase" | "traits">("phase");
  const [windowSecs, setWindowSecs] = useState<number | null>(null);

  useEffect(() => {
    const el = worldRef.current!;
    const view = new WorldView(el);
    viewRef.current = view;
    view.onPick = (id) => setSelected(id);
    engine.attach(view);
    return () => {
      engine.detach();
      view.dispose();
      viewRef.current = null;
    };
  }, [engine]);

  useEffect(() => {
    viewRef.current?.setSelected(selected);
    if (selected === null) setFollow(false);
  }, [selected]);
  useEffect(() => {
    if (viewRef.current) viewRef.current.follow = follow;
  }, [follow]);
  useEffect(() => {
    if (viewRef.current) viewRef.current.showIntents = intents;
  }, [intents]);
  useEffect(() => {
    const v = viewRef.current;
    if (!v) return;
    v.controls.autoRotate = autoRotate;
    v.controls.autoRotateSpeed = 0.6;
  }, [autoRotate]);

  const restart = useCallback(
    (p: Params, play = engine.playing) => {
      setParams(p);
      setApplied(p);
      setSelected(null);
      engine.reset(p);
      engine.setPlaying(play);
    },
    [engine],
  );

  const onChange = (key: ParamKey, value: number) => {
    const next = { ...params, [key]: value };
    setParams(next);
    setActivePreset(null);
    engine.setParams(next);
  };

  const togglePlay = useCallback(() => engine.setPlaying(!engine.playing), [engine]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement && e.target.type !== "range" && e.target.type !== "checkbox") return;
      if (e.code === "Space") {
        e.preventDefault();
        togglePlay();
      } else if (e.key === "s" || e.key === "S") engine.step(1);
      else if (e.key === "r" || e.key === "R") restart(params);
      else if (e.key === "Escape") setSelected(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [engine, params, restart, togglePlay]);

  const sim = engine.sim;
  const blue = sim.count("blue");
  const red = sim.count("red");
  const fruit = sim.countFruit();
  const pendingReset = RESET_KEYS.some((k) => params[k] !== applied[k]);
  const speedIdx = SPEEDS.indexOf(params.simSpeed);

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <span className="brand-mark" aria-hidden>
            <i className="b" />
            <i className="r" />
          </span>
          <h1>Claude Opus 5.5</h1>
        </div>

        <div className="transport">
          <button className={`btn btn-play ${engine.playing ? "is-playing" : ""}`} onClick={togglePlay} title="Play / pause (space)">
            {engine.playing ? "❚❚ Pause" : "▶ Play"}
          </button>
          <button className="btn" onClick={() => engine.step(1)} disabled={engine.playing} title="Advance 1 second (S)">
            Step
          </button>
          <button className={`btn ${pendingReset ? "btn-attn" : ""}`} onClick={() => restart(params)} title="Restart this garden (R)">
            ↻ Reset
          </button>
          <button className="btn" onClick={() => { setActivePreset(null); restart(randomParams(params), true); }} title="Random rules + new seed">
            🎲 Randomize
          </button>
          <div className="speed" title="Simulation speed">
            <span>Speed</span>
            <div className="seg">
              {SPEEDS.map((s) => (
                <button key={s} className={s === params.simSpeed ? "on" : ""} onClick={() => onChange("simSpeed", s)}>
                  {s}×
                </button>
              ))}
            </div>
            {speedIdx < 0 && <em>{params.simSpeed}×</em>}
          </div>
        </div>

        <div className="counters">
          <div className="counter c-fruit">
            <b>{fruit}</b>
            <span>fruit</span>
          </div>
          <div className="counter c-blue">
            <b>{blue}</b>
            <span>blue</span>
          </div>
          <div className="counter c-red">
            <b>{red}</b>
            <span>red</span>
          </div>
          <div className="counter c-time">
            <b>{fmtTime(sim.time)}</b>
            <span>garden time</span>
          </div>
        </div>
      </header>

      <main className="stage">
        <section className="world-card">
          <div className="world" ref={worldRef} />
          <div className="world-hint">Drag to spin the dish · scroll to zoom · click a blob to inspect it</div>
          <div className="world-toggles">
            <label className="toggle">
              <input type="checkbox" checked={intents} onChange={(e) => setIntents(e.target.checked)} />
              <span>Show intentions</span>
            </label>
            <label className="toggle">
              <input type="checkbox" checked={autoRotate} onChange={(e) => setAutoRotate(e.target.checked)} />
              <span>Slow spin</span>
            </label>
          </div>
          <div className="legend">
            <span><i className="lg-fruit" />fruit</span>
            <span><i className="lg-blue" />blue: eats fruit</span>
            <span><i className="lg-red" />red: boops blue</span>
            <span className="legend-note">bigger & brighter = more energy</span>
          </div>
          {!engine.playing && sim.time === 0 && (
            <button className="big-play" onClick={togglePlay}>
              ▶ Let it grow
            </button>
          )}
          {selected !== null && (
            <Inspector sim={sim} id={selected} follow={follow} onFollow={setFollow} onClose={() => setSelected(null)} onSelect={setSelected} />
          )}
        </section>

        <section className="charts">
          <div className="card card-timeline">
            <div className="card-head">
              <h3>Garden story</h3>
              <div className="chips">
                <span className="chip c-fruit">● fruit <small>(right axis)</small></span>
                <span className="chip c-blue">● blue</span>
                <span className="chip c-red">● red</span>
              </div>
              <div className="seg small">
                <button className={windowSecs === null ? "on" : ""} onClick={() => setWindowSecs(null)}>All</button>
                <button className={windowSecs === 180 ? "on" : ""} onClick={() => setWindowSecs(180)}>Last 3 min</button>
              </div>
            </div>
            <div className="card-body">
              <TimelineChart history={sim.history} version={version} stats={sim.stats} windowSecs={windowSecs} />
            </div>
          </div>
          <div className="card card-side">
            <div className="card-head">
              <div className="seg small">
                <button className={sideTab === "phase" ? "on" : ""} onClick={() => setSideTab("phase")}>Blue vs red</button>
                <button className={sideTab === "traits" ? "on" : ""} onClick={() => setSideTab("traits")}>Traits</button>
              </div>
              <small className="card-note">{sideTab === "phase" ? "loops = waves" : "solid speed · dashed vision"}</small>
            </div>
            <div className="card-body">
              {sideTab === "phase" ? <PhaseChart history={sim.history} version={version} /> : <TraitChart history={sim.history} version={version} />}
            </div>
          </div>
          <div className="card card-summary">
            <div className="card-head">
              <h3>What happened</h3>
            </div>
            <div className="card-body scroll">
              <Summary sim={sim} version={version} />
            </div>
          </div>
        </section>
      </main>

      <aside className="panel">
        <Controls
          params={params}
          applied={applied}
          activePreset={activePreset}
          onChange={onChange}
          onPreset={(id) => {
            setActivePreset(id);
            restart(presetParams(id, params), true);
          }}
          onApply={() => restart(params)}
        />
        <p className="panel-foot">Space play/pause · S step · R reset · Esc deselect</p>
      </aside>
    </div>
  );
}
