import { useEffect, useRef, useState, type CSSProperties } from "react";
import { Engine, SPEEDS } from "./engine";
import { SPEC_BY_KEY } from "./sim/params";
import { BLUE, RED } from "./sim/simulation";
import { ControlPanel } from "./ui/ControlPanel";
import { PhasePlot, TimelineChart, TraitChart, fmtClock } from "./ui/Charts";
import { CameraIcon, DiceIcon, PauseIcon, PlayIcon, ResetIcon, StepIcon, TargetIcon } from "./ui/icons";
import { Inspector } from "./ui/Inspector";
import { SummaryCard } from "./ui/SummaryCard";
import { useEngineVersion } from "./ui/useEngine";

function isTyping(el: EventTarget | null): boolean {
  if (!(el instanceof HTMLElement)) return false;
  if (el.isContentEditable || el.tagName === "TEXTAREA" || el.tagName === "SELECT") return true;
  return el.tagName === "INPUT" && (el as HTMLInputElement).type !== "range";
}

export function App() {
  const [engine] = useState(() => new Engine());
  const version = useEngineVersion(engine);
  const stageRef = useRef<HTMLDivElement>(null);
  const [touched, setTouched] = useState(false);

  useEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    engine.attach(el);
    if (import.meta.env.DEV) (window as unknown as { __garden?: Engine }).__garden = engine;
    return () => engine.detach();
  }, [engine]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || isTyping(e.target)) return;
      switch (e.key) {
        case " ":
          e.preventDefault();
          if (!e.repeat) engine.togglePlay();
          break;
        case "s":
        case "S":
        case "ArrowRight":
          if (e.key === "ArrowRight" && e.target instanceof HTMLInputElement) return;
          engine.stepOnce();
          break;
        case "r":
        case "R":
          engine.reset();
          break;
        case "f":
        case "F":
          if (engine.selection?.blob.alive) engine.setFollow(!engine.follow);
          break;
        case "Escape":
          engine.select(null);
          break;
        case "+":
        case "=":
          engine.setSpeed(SPEEDS[Math.min(SPEEDS.length - 1, SPEEDS.indexOf(engine.speed) + 1)]);
          break;
        case "-":
          engine.setSpeed(SPEEDS[Math.max(0, SPEEDS.indexOf(engine.speed) - 1)]);
          break;
      }
    };
    // Space is play/pause everywhere; stop it from also "clicking" whichever button has focus.
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.key === " " && !isTyping(e.target)) e.preventDefault();
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, [engine]);

  const sim = engine.sim;
  const pending = engine.pendingReset();
  const sel = engine.selection?.blob ?? null;
  const speedIdx = Math.max(0, SPEEDS.indexOf(engine.speed));
  const nb = sim.counts[BLUE];
  const nr = sim.counts[RED];

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <svg className="logo" viewBox="0 0 40 40" aria-hidden>
            <ellipse cx="15" cy="23" rx="10" ry="12" fill="#3f88ff" />
            <ellipse cx="27" cy="25" rx="9" ry="10.5" fill="#ff5263" />
            <circle cx="12" cy="21" r="1.6" fill="#1c1a2b" />
            <circle cx="17.5" cy="21" r="1.6" fill="#1c1a2b" />
            <circle cx="25" cy="23.5" r="1.5" fill="#1c1a2b" />
            <circle cx="30" cy="23.5" r="1.5" fill="#1c1a2b" />
            <circle cx="20" cy="8" r="4" fill="#b6ea3c" />
          </svg>
          <h1>Claude Opus 5.5</h1>
        </div>

        <div className="transport" role="toolbar" aria-label="Simulation">
          <button type="button" className="btn primary play" onClick={() => engine.togglePlay()} title="Play / pause (Space)">
            {engine.running ? <PauseIcon /> : <PlayIcon />}
            {engine.running ? "Pause" : "Play"}
          </button>
          <button type="button" className="btn" onClick={() => engine.stepOnce()} title="Advance one second (S)">
            <StepIcon /> Step
          </button>
          <button type="button" className="btn" onClick={() => engine.reset()} title="Plant this garden again (R)">
            <ResetIcon /> Reset
          </button>
          <button type="button" className="btn" onClick={() => engine.randomize()} title="Random settings and seed">
            <DiceIcon /> Randomize
          </button>
        </div>

        <label className="speed">
          <span>Speed</span>
          <input
            type="range"
            min={0}
            max={SPEEDS.length - 1}
            step={1}
            value={speedIdx}
            onChange={(e) => engine.setSpeed(SPEEDS[Number(e.target.value)])}
            style={{ "--pct": `${(speedIdx / (SPEEDS.length - 1)) * 100}%` } as CSSProperties}
            aria-valuetext={`${engine.speed} times`}
          />
          <b>{engine.speed}×</b>
        </label>
      </header>

      <main className="main">
        <section className="stage card" aria-label="Garden">
          <div className="stage-canvas" ref={stageRef} onPointerDown={() => setTouched(true)} />

          <div className="hud">
            <div className="count fruit" title="Ripe fruit / fruit spots">
              <i />
              <b>{sim.fruitCount}</b>
              <span>fruit</span>
            </div>
            <div className="count blue">
              <i />
              <b>{nb}</b>
              <span>blue</span>
            </div>
            <div className="count red">
              <i />
              <b>{nr}</b>
              <span>red</span>
            </div>
            <div className="count clock">
              <b>{fmtClock(sim.time)}</b>
              {!engine.running && <span className="paused">paused</span>}
            </div>
          </div>

          <div className="stage-tools">
            {sel?.alive && (
              <button
                type="button"
                className={`icon-btn float ${engine.follow ? "on" : ""}`}
                onClick={() => engine.setFollow(!engine.follow)}
                title="Follow selected blob (F)"
              >
                <CameraIcon />
              </button>
            )}
            <button type="button" className="icon-btn float" onClick={() => engine.frameCamera()} title="Recenter camera">
              <TargetIcon />
            </button>
          </div>

          {pending.length > 0 && (
            <div className="pending-banner">
              <span>
                New garden settings ready: {pending.map((k) => SPEC_BY_KEY[k].label.toLowerCase()).join(", ")}.
              </span>
              <button type="button" className="btn primary small" onClick={() => engine.reset()}>
                <ResetIcon /> Plant it
              </button>
            </div>
          )}

          {nb === 0 && nr === 0 && sim.time > 1 && (
            <div className="empty-card">
              <strong>The dish is empty</strong>
              <span>Only trees are left. Plant a new garden or try another preset.</span>
              <button type="button" className="btn primary" onClick={() => engine.reset()}>
                <ResetIcon /> Reset
              </button>
            </div>
          )}

          {!touched && !sel && (
            <div className="stage-hint">Drag to spin the dish · scroll to zoom · click a blob to meet it</div>
          )}

          {sel && <Inspector key={sel.id} engine={engine} blob={sel} />}
        </section>

        <section className="charts">
          <TimelineChart sim={sim} version={version} />
          <SummaryCard sim={sim} />
          <PhasePlot sim={sim} version={version} />
          <TraitChart sim={sim} version={version} mutation={engine.params.mutation} />
        </section>
      </main>

      <ControlPanel engine={engine} params={engine.params} presetId={engine.presetId} pending={pending.join(",")} />

      <footer className="foot">
        <span>
          <kbd>Space</kbd> play/pause · <kbd>S</kbd> step · <kbd>R</kbd> reset · <kbd>F</kbd> follow · <kbd>Esc</kbd>{" "}
          deselect · <kbd>+</kbd>/<kbd>−</kbd> speed
        </span>
        <span className="muted">
          Seed {sim.startParams.seed} · {sim.trees.length} trees · {Math.round(engine.fps)} fps
        </span>
      </footer>
    </div>
  );
}
