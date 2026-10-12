import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { Controller } from "../app/controller";
import { GardenView } from "../render/garden";
import { META_BY_KEY } from "../sim/params";
import { fmtTime } from "../sim/summary";
import { Inspector } from "./Inspector";
import { PhasePlot } from "./PhasePlot";
import { Sidebar } from "./Sidebar";
import { StoryPanel } from "./StoryPanel";
import { Timeline } from "./Timeline";

export function App() {
  const [ctl] = useState(() => new Controller());
  const version = useSyncExternalStore(ctl.subscribe, ctl.getVersion);
  const worldRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = worldRef.current;
    if (!el) return;
    const view = new GardenView(el);
    ctl.attach(view);
    return () => {
      ctl.detach();
      view.dispose();
    };
  }, [ctl]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "BUTTON") return;
      if (e.code === "Space") {
        e.preventDefault();
        ctl.toggle();
      } else if (e.key === "s") ctl.step();
      else if (e.key === "r") ctl.reset();
      else if (e.key === "Escape") ctl.select(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [ctl]);

  const sim = ctl.sim;
  const counts = sim.counts();
  const fruit = sim.ripeFruit();
  const speedMeta = META_BY_KEY.simSpeed;
  const settings = ctl.viewSettings();
  const selected = ctl.selectedSnapshot;

  return (
    <div className="app">
      <header className="topbar">
        <h1>Claude Opus 5.5</h1>
        <div className="transport">
          <button className="primary" onClick={ctl.toggle} aria-label={ctl.running ? "Pause" : "Play"}>
            {ctl.running ? "Pause" : "Play"}
          </button>
          <button onClick={ctl.step} title="Advance one simulated second (S)">
            Step
          </button>
          <button onClick={ctl.reset} title="Replant with the current settings (R)">
            Reset
          </button>
          <button onClick={ctl.randomize} title="New seed and a gentle nudge to every rule">
            Randomize
          </button>
        </div>
        <label className="speed">
          <span>Speed</span>
          <input
            type="range"
            min={speedMeta.min}
            max={speedMeta.max}
            step={speedMeta.step}
            value={ctl.params.simSpeed}
            onChange={(e) => ctl.setParam("simSpeed", Number(e.target.value))}
          />
          <output>{speedMeta.format(ctl.params.simSpeed)}</output>
        </label>
        <div className="stats">
          <span className="stat time">{fmtTime(sim.time)}</span>
          <span className="stat fruit">
            <i />
            {fruit}
          </span>
          <span className="stat blue">
            <i />
            {counts.blue}
          </span>
          <span className="stat red">
            <i />
            {counts.red}
          </span>
        </div>
      </header>

      <div className="body">
        <Sidebar ctl={ctl} />
        <main className="main">
          <div className="world">
            <div className="world-canvas" ref={worldRef} />
            {selected && <Inspector ctl={ctl} sim={sim} blob={selected} />}
            <div className="world-hint">Drag to rotate · scroll to zoom · click a blob to inspect</div>
            <div className="world-toggles">
              <label className="toggle">
                <input type="checkbox" checked={settings.autoSpin} onChange={(e) => ctl.setView({ autoSpin: e.target.checked })} />
                Slow spin
              </label>
              <button className="ghost small" onClick={() => ctl.view?.frameCamera()}>
                Recenter
              </button>
            </div>
            {!ctl.running && <div className="paused-pill">Paused</div>}
            {ctl.running && ctl.lagging && <div className="paused-pill lag">Running as fast as this device allows</div>}
          </div>
          <div className="dock">
            <Timeline sim={sim} version={version} />
            <PhasePlot sim={sim} version={version} />
            <StoryPanel sim={sim} version={version} />
          </div>
        </main>
      </div>
    </div>
  );
}
