import { MOOD_LABEL } from "../sim/summary";
import { DiceIcon, PauseIcon, PlayIcon, ResetIcon, StepIcon } from "./icons";
import { ctrl, fmtTime, shallowEqual, useSim } from "./sim";

const SPEEDS = [0.5, 1, 2, 4, 8, 16, 32];

export function Header() {
  const s = useSim(
    (x) => ({ running: x.running, sec: Math.floor(x.time), speed: x.params.simSpeed, hv: Math.floor(x.historyVersion / 4) }),
    shallowEqual,
  );
  const summary = ctrl.summary();

  return (
    <header className="topbar">
      <h1 className="title">Claude Opus 5.5</h1>

      <div className="transport" role="group" aria-label="Simulation controls">
        <button
          className={`btn btn-play ${s.running ? "is-running" : ""}`}
          onClick={() => ctrl.toggle()}
          title={s.running ? "Pause (Space)" : "Play (Space)"}
          aria-label={s.running ? "Pause" : "Play"}
        >
          {s.running ? <PauseIcon /> : <PlayIcon />}
          <span>{s.running ? "Pause" : "Play"}</span>
        </button>
        <button className="btn" onClick={() => ctrl.stepOnceManual()} disabled={s.running} title="Step half a second (→)" aria-label="Step">
          <StepIcon />
          <span>Step</span>
        </button>
        <button className="btn" onClick={() => ctrl.reset()} title="Reset with current settings (R)" aria-label="Reset">
          <ResetIcon />
          <span>Reset</span>
        </button>
        <button
          className="btn"
          onClick={() => ctrl.randomize()}
          title="Random settings and seed, then play"
          aria-label="Randomize"
        >
          <DiceIcon />
          <span>Randomize</span>
        </button>
      </div>

      <div className="speed-chips" role="group" aria-label="Simulation speed">
        {SPEEDS.map((v) => (
          <button
            key={v}
            className={`chip ${Math.abs(s.speed - v) < 1e-6 ? "is-on" : ""}`}
            aria-pressed={Math.abs(s.speed - v) < 1e-6}
            onClick={() => ctrl.setParam("simSpeed", v)}
          >
            {v}×
          </button>
        ))}
      </div>

      <div className="topbar-end">
        <div className="clock" title="Garden time">
          <span className="clock-label">garden time</span>
          <span className="clock-value">{fmtTime(s.sec)}</span>
        </div>
        <span className={`mood mood-${summary.mood}`}>{MOOD_LABEL[summary.mood]}</span>
      </div>
    </header>
  );
}
