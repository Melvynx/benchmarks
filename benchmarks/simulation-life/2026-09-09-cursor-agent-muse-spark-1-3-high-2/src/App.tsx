import { useEffect, useMemo, useRef, useState } from 'react';
import { DEFAULTS, PRESETS, createWorld, stepWorld, summarize, type Blob, type SimParams, type World } from './sim';
import WorldView from './world';
import { MainChart, PhasePlot, TraitChart } from './charts';

const MODEL = 'muse-spark-1-3-high';

type Slider = { key: keyof SimParams; label: string; min: number; max: number; step: number; group: string };

const SLIDERS: Slider[] = [
  { key: 'fruitGrowth', label: 'Fruit growth speed', min: 0.005, max: 0.16, step: 0.005, group: 'Fruit' },
  { key: 'fruitLimit', label: 'Fruit limit / tree', min: 1, max: 12, step: 1, group: 'Fruit' },
  { key: 'fruitDelay', label: 'Fruit return delay', min: 0, max: 120, step: 2, group: 'Fruit' },
  { key: 'blueDrain', label: 'Blue energy use', min: 0.02, max: 0.35, step: 0.01, group: 'Blue' },
  { key: 'blueSpeed', label: 'Blue speed', min: 0.15, max: 1.2, step: 0.02, group: 'Blue' },
  { key: 'blueVision', label: 'Blue vision', min: 15, max: 110, step: 1, group: 'Blue' },
  { key: 'blueRepro', label: 'Blue copy threshold', min: 45, max: 99, step: 1, group: 'Blue' },
  { key: 'blueEatTime', label: 'Blue eating time', min: 6, max: 60, step: 1, group: 'Blue' },
  { key: 'redDrain', label: 'Red energy use', min: 0.02, max: 0.35, step: 0.01, group: 'Red' },
  { key: 'redSpeed', label: 'Red speed', min: 0.15, max: 1.3, step: 0.02, group: 'Red' },
  { key: 'redVision', label: 'Red vision', min: 15, max: 120, step: 1, group: 'Red' },
  { key: 'redStrength', label: 'Red contact strength', min: 4, max: 40, step: 1, group: 'Red' },
  { key: 'redRepro', label: 'Red copy threshold', min: 45, max: 99, step: 1, group: 'Red' },
  { key: 'redPause', label: 'Red pause time', min: 4, max: 80, step: 1, group: 'Red' },
  { key: 'nTrees', label: 'Starting fruit trees', min: 1, max: 14, step: 1, group: 'World' },
  { key: 'nBlue', label: 'Starting blue blobs', min: 0, max: 40, step: 1, group: 'World' },
  { key: 'nRed', label: 'Starting red blobs', min: 0, max: 40, step: 1, group: 'World' },
  { key: 'worldSize', label: 'World size', min: 60, max: 160, step: 2, group: 'World' },
  { key: 'seed', label: 'Random seed', min: 1, max: 999, step: 1, group: 'World' },
  { key: 'simSpeed', label: 'Simulation speed', min: 1, max: 8, step: 1, group: 'World' },
];

export default function App() {
  const [params, setParams] = useState<SimParams>({ ...DEFAULTS });
  const [playing, setPlaying] = useState(true);
  const [angle, setAngle] = useState(0.6);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [version, setVersion] = useState(0);
  const [preset, setPreset] = useState('balanced garden');
  const worldRef = useRef<World>(createWorld(DEFAULTS));
  const paramsRef = useRef(params);
  paramsRef.current = params;
  const playingRef = useRef(playing);
  playingRef.current = playing;

  useEffect(() => {
    document.title = MODEL;
  }, []);

  useEffect(() => {
    let raf = 0;
    const loop = () => {
      if (playingRef.current) {
        const w = worldRef.current;
        const live = paramsRef.current;
        w.params.fruitGrowth = live.fruitGrowth;
        w.params.fruitLimit = live.fruitLimit;
        w.params.fruitDelay = live.fruitDelay;
        w.params.blueDrain = live.blueDrain;
        w.params.blueSpeed = live.blueSpeed;
        w.params.blueVision = live.blueVision;
        w.params.blueRepro = live.blueRepro;
        w.params.blueEatTime = live.blueEatTime;
        w.params.redDrain = live.redDrain;
        w.params.redSpeed = live.redSpeed;
        w.params.redVision = live.redVision;
        w.params.redStrength = live.redStrength;
        w.params.redRepro = live.redRepro;
        w.params.redPause = live.redPause;
        w.params.worldSize = live.worldSize;
        w.params.simSpeed = live.simSpeed;
        w.params.seed = live.seed;
        for (let i = 0; i < live.simSpeed; i++) stepWorld(w);
        setVersion((v) => v + 1);
      }
      raf = requestAnimationFrame(loop);
    };
    const id = setInterval(() => {
      if (!playingRef.current) return;
    }, 1000);
    raf = requestAnimationFrame(loop);
    const timer = setInterval(() => {
      if (playingRef.current) setVersion((v) => v + 1);
    }, 4000);
    return () => {
      cancelAnimationFrame(raf);
      clearInterval(timer);
      clearInterval(id);
    };
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code === 'Space' && (e.target as HTMLElement).tagName !== 'INPUT') {
        e.preventDefault();
        setPlaying((p) => !p);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const w = worldRef.current;
  void version;
  const selected: Blob | null = useMemo(
    () => w.blobs.find((b) => b.id === selectedId) ?? null,
    [w.blobs, selectedId, version]
  );

  const reset = (p: SimParams) => {
    worldRef.current = createWorld(p);
    setSelectedId(null);
    setVersion((v) => v + 1);
  };

  const applyPreset = (name: string) => {
    const pr = PRESETS.find((x) => x.name === name);
    if (!pr) return;
    const base = { ...DEFAULTS, ...pr.patch };
    base.seed = params.seed;
    base.simSpeed = params.simSpeed;
    setParams(base);
    setPreset(name);
    reset(base);
  };

  const randomize = () => {
    const r = (a: number, b: number) => a + Math.random() * (b - a);
    const np: SimParams = {
      ...params,
      fruitGrowth: +r(0.02, 0.12).toFixed(3),
      fruitLimit: Math.round(r(3, 10)),
      fruitDelay: Math.round(r(15, 80)),
      blueDrain: +r(0.08, 0.2).toFixed(2),
      blueSpeed: +r(0.4, 0.75).toFixed(2),
      blueVision: Math.round(r(30, 70)),
      blueRepro: Math.round(r(65, 88)),
      blueEatTime: Math.round(r(14, 36)),
      redDrain: +r(0.08, 0.22).toFixed(2),
      redSpeed: +r(0.45, 0.8).toFixed(2),
      redVision: Math.round(r(40, 80)),
      redStrength: Math.round(r(12, 30)),
      redRepro: Math.round(r(70, 90)),
      redPause: Math.round(r(15, 45)),
      nTrees: Math.round(r(4, 10)),
      nBlue: Math.round(r(8, 20)),
      nRed: Math.round(r(3, 12)),
      seed: Math.round(r(1, 999)),
    };
    setParams(np);
    reset(np);
  };

  const step = () => {
    setPlaying(false);
    for (let i = 0; i < params.simSpeed; i++) stepWorld(worldRef.current);
    setVersion((v) => v + 1);
  };

  const blues = w.blobs.filter((b) => b.kind === 'blue').length;
  const reds = w.blobs.filter((b) => b.kind === 'red').length;
  const fruit = w.trees.reduce((a, t) => a + t.fruit, 0);
  const summary = summarize(w.history);

  const set = (k: keyof SimParams, v: number) => setParams((p) => ({ ...p, [k]: v }));

  const groups = ['Fruit', 'Blue', 'Red', 'World'];

  return (
    <div className="page">
      <header className="topbar">
        <div>
          <h1>{MODEL}</h1>
          <p className="sub">
            tick {w.tick} · <span className="dot blue" /> {blues} blue · <span className="dot red" /> {reds} red ·{' '}
            <span className="dot green" /> {fruit.toFixed(0)} fruit {playing ? '· playing' : '· paused'}
          </p>
        </div>
        <div className="transport">
          <button onClick={() => setPlaying((p) => !p)} className={playing ? 'warn' : 'go'}>
            {playing ? 'pause' : 'play'}
          </button>
          <button onClick={step}>step</button>
          <button onClick={() => reset(params)}>reset</button>
          <button onClick={randomize}>randomize</button>
        </div>
      </header>

      <div className="presets">
        {PRESETS.map((p) => (
          <button key={p.name} className={preset === p.name ? 'active' : ''} onClick={() => applyPreset(p.name)} title={p.desc}>
            {p.name}
          </button>
        ))}
      </div>

      <main className="grid">
        <section className="card worldCard">
          <WorldView world={w} version={version} selectedId={selectedId} onSelect={(b) => setSelectedId(b ? b.id : null)} angle={angle} onAngle={setAngle} />
          <div className="inspector">
            {selected ? (
              <div className="inspGrid">
                <div>
                  <strong>
                    <span className={selected.kind === 'blue' ? 'dot blue' : 'dot red'} /> #{selected.id} {selected.kind}
                  </strong>
                  <div>action: {selected.action}</div>
                  <div>
                    gen {selected.gen}
                    {selected.parent ? ` · child of #${selected.parent}` : ' · founder'}
                  </div>
                </div>
                <div>
                  <div className="ebar">
                    <div className="efill" style={{ width: `${Math.max(0, Math.min(100, selected.energy))}%` }} />
                  </div>
                  <div>energy {selected.energy.toFixed(1)} / 100</div>
                  <div>age {selected.age} ticks</div>
                </div>
                <div>
                  <div>speed ×{selected.speedTrait.toFixed(2)}</div>
                  <div>
                    sensing {( (selected.kind === 'blue' ? params.blueVision : params.redVision) * selected.visionTrait ).toFixed(0)} px
                  </div>
                  <div>
                    {(selected.action === 'eat' || selected.action === 'pause' || selected.action === 'stagger') && selected.actionT > 0
                      ? `timer: ${selected.actionT} ticks left`
                      : 'timer: —'}
                  </div>
                </div>
              </div>
            ) : (
              <div className="hint">Click a blob on the dish to inspect it — energy, age, action, traits, timers.</div>
            )}
          </div>
          <div className="legend">
            <span><i className="sw b" /> blue eats fruit</span>
            <span><i className="sw r" /> red sips blue energy on touch</span>
            <span><i className="sw g" /> fruit regrows after a delay</span>
          </div>
        </section>

        <aside className="card controls">
          <h2>living toy controls</h2>
          {groups.map((g) => (
            <div key={g} className="group">
              <h3>{g}</h3>
              {SLIDERS.filter((s) => s.group === g).map((s) => (
                <label key={s.key} className="slider">
                  <span>
                    {s.label} <b>{params[s.key]}</b>
                  </span>
                  <input
                    type="range"
                    min={s.min}
                    max={s.max}
                    step={s.step}
                    value={params[s.key]}
                    onChange={(e) => set(s.key, +e.target.value)}
                  />
                </label>
              ))}
            </div>
          ))}
        </aside>

        <section className="card charts">
          <h2>garden story</h2>
          <MainChart history={w.history} />
          <div className="two">
            <div>
              <h3>blue vs red phase</h3>
              <PhasePlot history={w.history} />
            </div>
            <div>
              <h3>inherited traits</h3>
              <TraitChart history={w.history} />
            </div>
          </div>
          <div className="summary">
            <h3>run summary</h3>
            <ul>
              {summary.map((s, i) => (
                <li key={i}>{s}</li>
              ))}
            </ul>
            <p className="stats">
              meals {w.cumEaten} · contacts {w.cumContacts} · born {w.cumBirthsB + w.cumBirthsR} · faded{' '}
              {w.cumDeathsB + w.cumDeathsR}
            </p>
          </div>
        </section>
      </main>
      <footer>space = play/pause · drag dish to spin · every curve comes from the energy rules, nothing is scripted</footer>
    </div>
  );
}
