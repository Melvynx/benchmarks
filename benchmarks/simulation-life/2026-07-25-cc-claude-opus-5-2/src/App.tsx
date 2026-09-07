import { useCallback, useRef, useState } from "react";
import { DEFAULTS, PRESETS, RESET_KEYS, type Params } from "./sim/params";
import { DT, World } from "./sim/world";
import { GardenCanvas } from "./ui/GardenCanvas";
import { Controls } from "./ui/Controls";
import { Inspector } from "./ui/Inspector";
import {
  PhasePlot,
  PopulationChart,
  StatGrid,
  SummaryPanel,
  TraitChart,
} from "./ui/Charts";

const TITLE = "Claude Opus 5";

function clock(t: number) {
  const m = Math.floor(t / 60);
  const s = Math.floor(t % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function App() {
  const [params, setParams] = useState<Params>({ ...DEFAULTS });
  const [running, setRunning] = useState(true);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [preset, setPreset] = useState<string | null>("balanced");
  const [version, setVersion] = useState(0);
  const worldRef = useRef<World>(null as unknown as World);
  if (worldRef.current === null) worldRef.current = new World(DEFAULTS);

  const pulse = useCallback(() => setVersion((v) => v + 1), []);

  const apply = useCallback((next: Params, rebuild: boolean) => {
    setParams(next);
    if (rebuild) {
      worldRef.current.reset(next);
      setSelectedId(null);
    } else {
      worldRef.current.params = { ...next };
    }
  }, []);

  const onControl = useCallback(
    (key: keyof Params, value: number) => {
      setParams((prev) => {
        const next = { ...prev, [key]: value };
        if (RESET_KEYS.includes(key)) {
          worldRef.current.reset(next);
          setSelectedId(null);
        } else {
          worldRef.current.params = { ...next };
        }
        setPreset(null);
        return next;
      });
    },
    [],
  );

  const world = worldRef.current;
  const counts = world.counts();
  const selected = selectedId === null ? null : world.findBlob(selectedId);

  const step = () => {
    for (let i = 0; i < Math.round(0.5 / DT); i++) world.step();
    pulse();
  };

  const randomize = () => {
    const r = (a: number, b: number) => a + Math.random() * (b - a);
    const next: Params = {
      ...params,
      seed: 1 + Math.floor(Math.random() * 9999),
      fruitGrowth: Number(r(0.08, 0.34).toFixed(2)),
      fruitLimit: Math.round(r(3, 10)),
      fruitReturnDelay: Number(r(1, 8).toFixed(1)),
      blueEnergyUse: Number(r(1.2, 2.4).toFixed(2)),
      blueSpeed: Number(r(2.6, 4).toFixed(1)),
      blueVision: Number(r(7, 15).toFixed(1)),
      redEnergyUse: Number(r(1, 1.8).toFixed(2)),
      redSpeed: Number(r(4.2, 5.8).toFixed(1)),
      redVision: Number(r(6, 14).toFixed(1)),
      redContact: Math.round(r(26, 46)),
      redPause: Number(r(1.6, 3.6).toFixed(1)),
      trees: Math.round(r(14, 34)),
      blueStart: Math.round(r(14, 44)),
      redStart: Math.round(r(4, 16)),
    };
    setPreset(null);
    apply(next, true);
  };

  return (
    <div className="app">
      <header className="masthead">
        <h1>{TITLE}</h1>
        <div className="clock">
          {clock(world.time)} · {world.history.length} samples recorded
        </div>
      </header>

      <div className="layout">
        <div className="stack">
        <section className="card stage">
          <div className="stage-wrap">
            <GardenCanvas
              worldRef={worldRef}
              running={running}
              speed={params.simSpeed}
              selectedId={selectedId}
              onSelect={setSelectedId}
              onPulse={pulse}
            />
            <div className="hud">
              <span className="pill">
                <i className="dot" style={{ background: "var(--blue)" }} />
                {counts.blue} blue
              </span>
              <span className="pill">
                <i className="dot" style={{ background: "var(--red)" }} />
                {counts.red} red
              </span>
              <span className="pill">
                <i className="dot" style={{ background: "var(--fruit)" }} />
                {counts.fruit} fruit
              </span>
              <span className="pill">{params.simSpeed.toFixed(2)}× speed</span>
            </div>
            <div className="hint">Drag the dish to spin it · click a blob to inspect</div>
          </div>
          <div className="transport">
            <button className="btn primary" onClick={() => setRunning((r) => !r)}>
              {running ? "Pause" : "Play"}
            </button>
            <button className="btn" onClick={step} disabled={running}>
              Step
            </button>
            <button
              className="btn"
              onClick={() => {
                world.reset(params);
                setSelectedId(null);
                pulse();
              }}
            >
              Reset
            </button>
            <button className="btn" onClick={randomize}>
              Randomize
            </button>
          </div>
        </section>

        <section className="card">
          <h2>Fruit, blue and red over time</h2>
          <PopulationChart history={world.history} version={version} />
        </section>
        </div>

        <aside className="sidebar">
          <section className="card">
            <h2>Presets</h2>
            <div className="presets">
              {PRESETS.map((p) => (
                <button
                  key={p.id}
                  className={`preset${preset === p.id ? " on" : ""}`}
                  onClick={() => {
                    setPreset(p.id);
                    apply({ ...DEFAULTS, ...p.params, simSpeed: params.simSpeed }, true);
                  }}
                >
                  <b>{p.name}</b>
                  <span>{p.blurb}</span>
                </button>
              ))}
            </div>
          </section>

          <section className="card">
            <h2>Selected blob</h2>
            <Inspector blob={selected} params={params} time={world.time} />
          </section>

          <section className="card">
            <h2>Controls</h2>
            <Controls params={params} onChange={onControl} />
          </section>
        </aside>
      </div>

      <div className="charts trio">
        <section className="card">
          <h2>Run summary</h2>
          <SummaryPanel history={world.history} stats={world.stats} version={version} />
          <StatGrid stats={world.stats} />
        </section>
        <section className="card">
          <h2>Blue against red</h2>
          <PhasePlot history={world.history} version={version} />
        </section>
        <section className="card">
          <h2>Trait trends</h2>
          <TraitChart history={world.history} version={version} />
        </section>
      </div>
    </div>
  );
}
