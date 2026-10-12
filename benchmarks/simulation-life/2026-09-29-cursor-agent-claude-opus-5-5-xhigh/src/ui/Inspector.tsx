import { ACTION_LABEL, type Blob, type Simulation } from "../sim/engine";
import { fmtDuration } from "../sim/summary";
import type { Controller } from "../app/controller";

const TIMED = new Set(["eat", "hugged", "bud", "hug", "rest", "fade", "startled", "tired", "lurk", "wait"]);

export function Inspector({ ctl, sim, blob }: { ctl: Controller; sim: Simulation; blob: Blob }) {
  const p = sim.p;
  const blue = blob.group === "blue";
  const copyAt = blue ? p.blueCopyAt : p.redCopyAt;
  const energyPct = Math.max(0, Math.min(1, blob.energy / copyAt));
  const age = (blob.dead ? blob.diedAt || sim.time : sim.time) - blob.bornAt;
  const timed = TIMED.has(blob.action) && !blob.dead;
  const left = blob.action === "wait" ? blob.patience : blob.actionTime;
  const dur = blob.action === "wait" ? 0 : blob.actionDur;
  const vision = sim.visionOf(blob);
  const settings = ctl.viewSettings();

  return (
    <aside className={`inspector ${blob.group}`}>
      <header>
        <span className={`dot ${blob.group}`} />
        <div>
          <h3>{blob.name}</h3>
          <small>
            {blue ? "Blue blob" : "Red blob"} · generation {blob.generation}
          </small>
        </div>
        <button className="icon" aria-label="Close inspector" onClick={() => ctl.select(null)}>
          ×
        </button>
      </header>

      <div className="action-line">
        <span className="badge">{blob.dead ? "Faded away" : ACTION_LABEL[blob.action]}</span>
        {timed && left > 0 && <span className="time-left">{left.toFixed(1)}s left</span>}
      </div>
      {timed && dur > 0 && left > 0 && (
        <div className="progress">
          <i style={{ width: `${(1 - left / dur) * 100}%` }} />
        </div>
      )}

      <div className="energy">
        <div className="energy-label">
          <span>Energy</span>
          <b>
            {blob.energy.toFixed(1)} / {copyAt} to copy
          </b>
        </div>
        <div className="bar">
          <i style={{ width: `${energyPct * 100}%` }} />
        </div>
      </div>

      <dl className="facts">
        <dt>Age</dt>
        <dd>{fmtDuration(Math.max(0, age))}</dd>
        <dt>Speed now</dt>
        <dd>{blob.dead ? "–" : `${blob.speed.toFixed(2)} u/s`}</dd>
        <dt>Top speed</dt>
        <dd>{((blue ? p.blueSpeed : p.redSpeed) * blob.speedGene).toFixed(2)} u/s</dd>
        <dt>Sensing range</dt>
        <dd>{vision.toFixed(1)} u</dd>
        <dt>Speed trait</dt>
        <dd>{(blob.speedGene * 100).toFixed(1)}%</dd>
        <dt>Vision trait</dt>
        <dd>{(blob.visionGene * 100).toFixed(1)}%</dd>
        <dt>{blue ? "Fruit eaten" : "Hugs given"}</dt>
        <dd>{blue ? blob.fruitsEaten : blob.hugs}</dd>
        <dt>Parent</dt>
        <dd>{blob.parentName || "Original gardener"}</dd>
        <dt>Copies budded</dt>
        <dd>{blob.children}</dd>
        {blob.dead && blob.fadeCause && (
          <>
            <dt>Faded from</dt>
            <dd>{blob.fadeCause === "hug" ? "a draining hug" : "hunger"}</dd>
          </>
        )}
      </dl>

      <div className="inspector-actions">
        <label className="toggle">
          <input type="checkbox" checked={settings.follow} disabled={blob.dead} onChange={(e) => ctl.setView({ follow: e.target.checked })} />
          Follow
        </label>
        <label className="toggle">
          <input type="checkbox" checked={settings.showSense} onChange={(e) => ctl.setView({ showSense: e.target.checked })} />
          Sensing rings
        </label>
      </div>
    </aside>
  );
}
