import { ACTION_LABEL, type Simulation } from "../sim/simulation";

const CAUSE: Record<string, string> = {
  starved: "ran out of energy",
  old: "drifted off of old age",
  contact: "was booped until its energy ran out",
};

const TIMED = new Set(["eating", "pausing", "copying", "tired", "napping", "startled"]);

interface Props {
  sim: Simulation;
  id: number;
  follow: boolean;
  onFollow: (on: boolean) => void;
  onClose: () => void;
  onSelect: (id: number) => void;
}

export function Inspector({ sim, id, follow, onFollow, onClose, onSelect }: Props) {
  const b = sim.byId.get(id);
  if (!b) {
    const grave = sim.graveyard.get(id);
    return (
      <div className="inspector is-gone">
        <div className="insp-head">
          <span className={`insp-dot ${grave?.kind ?? "blue"}`} />
          <strong>Blob #{id}</strong>
          <button className="icon-btn" onClick={onClose} aria-label="Close">✕</button>
        </div>
        <p className="insp-gone">💫 This blob {grave ? CAUSE[grave.cause] : "faded away"}{grave ? ` at ${Math.floor(grave.time)}s` : ""}.</p>
      </div>
    );
  }
  const copy = sim.copyThresholdOf(b);
  const max = sim.maxEnergyOf(b);
  const pct = Math.min(100, (b.energy / max) * 100);
  const copyPct = (copy / max) * 100;
  const speed = Math.hypot(b.vx, b.vz);
  const kindName = b.kind === "blue" ? "Blue" : "Red";
  const parent = b.parentId ? sim.byId.get(b.parentId) : undefined;
  return (
    <div className={`inspector ${b.kind}`}>
      <div className="insp-head">
        <span className={`insp-dot ${b.kind}`} />
        <strong>
          {kindName} blob #{b.id}
        </strong>
        <span className="badge">gen {b.generation}</span>
        <button className="icon-btn" onClick={onClose} aria-label="Close">✕</button>
      </div>

      <div className="insp-action">
        <span>{ACTION_LABEL[b.action]}</span>
        {b.hidden && b.kind === "blue" && <span className="badge soft">under leaves</span>}
      </div>
      {TIMED.has(b.action) && b.timerMax > 0 && (
        <div className="insp-timer">
          <div className="bar">
            <div className="bar-fill timer" style={{ width: `${Math.max(0, (b.timer / b.timerMax) * 100)}%` }} />
          </div>
          <small>{Math.max(0, b.timer).toFixed(1)}s left</small>
        </div>
      )}

      <div className="insp-energy">
        <div className="row">
          <span>Energy</span>
          <strong>
            {b.energy.toFixed(0)} <small>/ copy at {copy}</small>
          </strong>
        </div>
        <div className="bar">
          <div className={`bar-fill ${b.kind}`} style={{ width: `${pct}%` }} />
          <div className="bar-mark" style={{ left: `${copyPct}%` }} title="Copy threshold" />
        </div>
      </div>

      <dl className="insp-grid">
        <dt>Age</dt>
        <dd>
          {b.age.toFixed(0)}s <small>/ ~{b.lifespan.toFixed(0)}s</small>
        </dd>
        <dt>Speed</dt>
        <dd>
          {speed.toFixed(1)} <small>/ {sim.speedOf(b).toFixed(1)} u/s</small>
        </dd>
        <dt>Sensing</dt>
        <dd>{sim.visionOf(b).toFixed(1)} u</dd>
        <dt>Traits</dt>
        <dd>
          speed ×{b.speedGene.toFixed(2)} · vision ×{b.visionGene.toFixed(2)}
        </dd>
        <dt>{b.kind === "blue" ? "Fruit eaten" : "Boops"}</dt>
        <dd>{b.meals}</dd>
        <dt>Family</dt>
        <dd>
          {b.children} {b.children === 1 ? "copy" : "copies"}
          {b.parentId ? (
            <>
              {" · parent "}
              {parent ? (
                <button className="link" onClick={() => onSelect(parent.id)}>
                  #{b.parentId}
                </button>
              ) : (
                <span>#{b.parentId}</span>
              )}
            </>
          ) : (
            " · founder"
          )}
        </dd>
      </dl>
      <label className="toggle small">
        <input type="checkbox" checked={follow} onChange={(e) => onFollow(e.target.checked)} />
        <span>Follow with camera</span>
      </label>
    </div>
  );
}
