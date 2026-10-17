import type { Engine } from "../engine";
import {
  BLUE,
  CHASE_GIVE_UP,
  blobCopyAt,
  blobMaxSpeed,
  blobVision,
  vigor,
  type Blob,
} from "../sim/simulation";
import { fmtClock } from "./Charts";
import { CameraIcon, CloseIcon } from "./icons";
import { ACTION_LABEL, actionDetail, blobName } from "./names";

function timerInfo(b: Blob): { label: string; left: number; total: number } | null {
  switch (b.action) {
    case "eat":
      return { label: "Chewing", left: b.timer, total: b.timerTotal };
    case "rest":
      return { label: "Pause after boop", left: b.timer, total: b.timerTotal };
    case "tired":
      return { label: "Catching breath", left: Math.max(0, b.think), total: 2 };
    case "hunt":
      return { label: "Chase stamina", left: Math.max(0, CHASE_GIVE_UP - b.chase), total: CHASE_GIVE_UP };
    default:
      return null;
  }
}

function Gene({ label, value }: { label: string; value: number }) {
  const pct = ((value - 0.5) / 1.3) * 100;
  const mid = ((1 - 0.5) / 1.3) * 100;
  return (
    <div className="gene">
      <span>{label}</span>
      <div className="gene-bar">
        <i className="gene-mid" style={{ left: `${mid}%` }} />
        <i className="gene-dot" style={{ left: `${pct}%` }} />
      </div>
      <b>×{value.toFixed(2)}</b>
    </div>
  );
}

export function Inspector({ engine, blob }: { engine: Engine; blob: Blob }) {
  const sim = engine.sim;
  const p = sim.params;
  const isBlue = blob.kind === BLUE;
  const copyAt = blobCopyAt(p, blob);
  const energyPct = Math.min(100, (blob.energy / copyAt) * 100);
  const speedNow = Math.hypot(blob.vx, blob.vz);
  const top = blobMaxSpeed(p, blob);
  const vision = blobVision(p, blob);
  const t = blob.alive ? timerInfo(blob) : null;
  const parent = blob.parentId > 0 ? sim.byId.get(blob.parentId) : undefined;
  let kidsAlive = 0;
  if (blob.children > 0) for (const o of sim.blobs) if (o.parentId === blob.id && o.alive) kidsAlive++;
  const name = blobName(blob.id);

  return (
    <div className={`inspector card ${isBlue ? "is-blue" : "is-red"} ${blob.alive ? "" : "gone"}`} role="dialog" aria-label={`${name} details`}>
      <div className="insp-head">
        <div className={`avatar ${isBlue ? "blue" : "red"}`} aria-hidden>
          <i className="e l" />
          <i className="e r" />
          <i className="m" />
        </div>
        <div className="insp-title">
          <strong>{name}</strong>
          <span>
            {isBlue ? "Blue blob" : "Red blob"} · generation {blob.gen + 1}
          </span>
        </div>
        <div className="insp-actions">
          {blob.alive && (
            <button
              type="button"
              className={`icon-btn ${engine.follow ? "on" : ""}`}
              onClick={() => engine.setFollow(!engine.follow)}
              title="Follow with camera (F)"
              aria-pressed={engine.follow}
            >
              <CameraIcon />
            </button>
          )}
          <button type="button" className="icon-btn" onClick={() => engine.select(null)} title="Close (Esc)">
            <CloseIcon />
          </button>
        </div>
      </div>

      {!blob.alive && (
        <div className="insp-gone">
          {blob.cause === "booped"
            ? `Booped by a red at ${fmtClock(blob.diedAt)}. Its energy became red energy.`
            : `Faded at ${fmtClock(blob.diedAt)} after running out of energy.`}
        </div>
      )}

      <div className="insp-energy">
        <div className="row">
          <span>Energy</span>
          <b>
            {Math.max(0, blob.energy).toFixed(0)} <em>/ {copyAt} to copy</em>
          </b>
        </div>
        <div className="bar">
          <i style={{ width: `${Math.max(0, energyPct)}%` }} />
        </div>
      </div>

      {blob.alive && (
        <div className="insp-action">
          <div className="action-label">{ACTION_LABEL[blob.action]}</div>
          <p>{actionDetail(blob)}</p>
          {t && (
            <div className="timer">
              <span>{t.label}</span>
              <div className="bar thin">
                <i style={{ width: `${Math.min(100, (t.left / Math.max(0.01, t.total)) * 100)}%` }} />
              </div>
              <b>{t.left.toFixed(1)}s</b>
            </div>
          )}
        </div>
      )}

      <dl className="insp-stats">
        <div>
          <dt>Age</dt>
          <dd>{fmtClock(blob.age)}</dd>
        </div>
        <div>
          <dt>Speed</dt>
          <dd>
            {speedNow.toFixed(1)} <em>/ {top.toFixed(1)} top</em>
          </dd>
        </div>
        <div>
          <dt>Sensing</dt>
          <dd>{vision.toFixed(1)} u</dd>
        </div>
        <div>
          <dt>{isBlue ? "Fruit eaten" : "Boops"}</dt>
          <dd>{blob.meals}</dd>
        </div>
        {!isBlue && (
          <div>
            <dt>Vigor</dt>
            <dd>{Math.round(vigor(p, blob) * 100)}%</dd>
          </div>
        )}
        {isBlue && (
          <div>
            <dt>Cover</dt>
            <dd>{blob.sheltered ? "Under a tree" : "In the open"}</dd>
          </div>
        )}
      </dl>

      <div className="insp-genes">
        <Gene label="Speed gene" value={blob.speedGene} />
        <Gene label="Vision gene" value={blob.visionGene} />
      </div>

      <div className="insp-family">
        <span>
          Parent:{" "}
          {blob.parentId === 0 ? (
            <em>original settler</em>
          ) : parent && parent.alive ? (
            <button type="button" className="link" onClick={() => engine.select(parent.id)}>
              {blobName(parent.id)}
            </button>
          ) : (
            <em>{blobName(blob.parentId)} (gone)</em>
          )}
        </span>
        <span>
          Babies: <b>{blob.children}</b>
          {blob.children > 0 && <em> ({kidsAlive} alive)</em>}
        </span>
      </div>
    </div>
  );
}
