import { ACTION_LABEL, type Blob } from "../sim/types";
import type { Params } from "../sim/params";

interface Props {
  blob: Blob | null;
  params: Params;
  time: number;
}

function pct(v: number) {
  return `${Math.round(v * 100)}%`;
}

export function Inspector({ blob, params, time }: Props) {
  if (!blob) {
    return (
      <div className="inspector">
        <p className="empty">
          Click any blob on the dish to follow what it is doing, how much energy it
          has left, and where it came from.
        </p>
      </div>
    );
  }

  const isBlue = blob.species === "blue";
  const tone = isBlue ? "var(--blue)" : "var(--red)";
  const energy = blob.energy / blob.maxEnergy;
  const speed = (isBlue ? params.blueSpeed : params.redSpeed) * blob.traits.speed;
  const vision = (isBlue ? params.blueVision : params.redVision) * blob.traits.vision;
  const threshold = isBlue ? params.blueRepro : params.redRepro;
  const busy = blob.timer > 0 && (blob.action === "eat" || blob.action === "rest");

  return (
    <div className="inspector">
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
        <i className="dot" style={{ background: tone, width: 12, height: 12 }} />
        <b>{isBlue ? "Blue blob" : "Red blob"}</b>
        <span style={{ color: "var(--muted)", fontSize: 12 }}>#{blob.id}</span>
      </div>

      <div className="ctl-hint">Energy {blob.energy.toFixed(0)} / {blob.maxEnergy}</div>
      <div className="meter">
        <i
          style={{
            width: pct(Math.max(0, Math.min(1, energy))),
            background: energy > 0.35 ? "#63b95a" : "#e8a13c",
          }}
        />
      </div>

      <div className="ctl-hint">
        Toward a copy of itself — needs {threshold}
      </div>
      <div className="meter">
        <i
          style={{
            width: pct(Math.max(0, Math.min(1, blob.energy / threshold))),
            background: tone,
          }}
        />
      </div>

      <dl className="rows">
        <dt>Doing now</dt>
        <dd>{ACTION_LABEL[blob.action]}</dd>
        {busy && (
          <>
            <dt>Time left</dt>
            <dd>
              {blob.timer.toFixed(1)}s of {blob.timerTotal.toFixed(1)}s
            </dd>
          </>
        )}
        <dt>Age</dt>
        <dd>
          {blob.age.toFixed(0)}s of ~{blob.maxAge.toFixed(0)}s
        </dd>
        <dt>Speed</dt>
        <dd>
          {speed.toFixed(2)} <span style={{ color: "var(--muted)" }}>×{blob.traits.speed.toFixed(2)}</span>
        </dd>
        <dt>Sensing range</dt>
        <dd>
          {vision.toFixed(1)} <span style={{ color: "var(--muted)" }}>×{blob.traits.vision.toFixed(2)}</span>
        </dd>
        <dt>Body upkeep</dt>
        <dd>×{blob.traits.metabolism.toFixed(2)}</dd>
        <dt>Family line</dt>
        <dd>
          gen {blob.generation}
          {blob.parent > 0 ? ` · from #${blob.parent}` : " · founder"}
        </dd>
        <dt>Copies made</dt>
        <dd>{blob.children}</dd>
        <dt>{isBlue ? "Fruit eaten" : "Contacts made"}</dt>
        <dd>{blob.meals}</dd>
        {isBlue && (
          <>
            <dt>Under a canopy</dt>
            <dd>{blob.hidden ? "yes — hidden" : "no"}</dd>
          </>
        )}
        {!isBlue && (
          <>
            <dt>Chasing for</dt>
            <dd>
              {blob.chase.toFixed(1)}s / gives up at {blob.patience.toFixed(1)}s
            </dd>
          </>
        )}
        <dt>Watched at</dt>
        <dd>{time.toFixed(0)}s</dd>
      </dl>
    </div>
  );
}
