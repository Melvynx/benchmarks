import { MAX_ENERGY, type Blob, type World } from '../sim/engine';
import type { Params } from '../sim/params';
import { fmtClock } from '../analysis';
import { actionInfo, blobName } from '../names';

interface Props {
  blob: Blob;
  world: World;
  params: Params;
  onSelect: (id: number) => void;
  onClose: () => void;
}

const CAUSES: Record<string, string> = {
  starved: 'ran out of energy',
  drained: 'was drained by a red blob',
  old: 'lived a full life',
};

export function Inspector({ blob, world, params, onSelect, onClose }: Props) {
  const isBlue = blob.kind === 'blue';
  const dead = blob.dead;
  const info = actionInfo(blob.action, blob.kind, dead);
  const threshold = isBlue ? params.blueCopy : params.redCopy;
  const baseSpeed = isBlue ? params.blueSpeed : params.redSpeed;
  const baseVision = isBlue ? params.blueVision : params.redVision;
  const speedNow = Math.hypot(blob.vx, blob.vy);
  const maxSpeed = baseSpeed * blob.traits.speed;
  const vision = baseVision * blob.traits.vision;
  const energyPct = Math.max(0, Math.min(1, blob.energy / MAX_ENERGY));
  const thresholdPct = Math.min(1, threshold / MAX_ENERGY);
  const locked = !dead && blob.lock > 0.02 && blob.lockTotal > 0;
  const lockPct = locked ? Math.max(0, Math.min(1, blob.lock / blob.lockTotal)) : 0;
  const parent = blob.parent ? world.blobAt(blob.parent) : undefined;
  const familyNo = isBlue ? blob.family : Math.max(1, blob.family - world.stats.blueFounders);
  const relatives = dead ? 0 : world.blobs.filter((b) => b.family === blob.family && !b.dead && b.id !== blob.id).length;
  const dv = (v: number) => {
    const d = Math.round((v - 1) * 100);
    return d === 0 ? 'average' : `${d > 0 ? '+' : ''}${d}%`;
  };

  return (
    <aside className={`inspector ${isBlue ? 'is-blue' : 'is-red'}${dead ? ' is-dead' : ''}`} aria-label="Selected blob">
      <header>
        <span className="portrait" aria-hidden="true" />
        <div className="who">
          <h3>{blobName(blob.id)}</h3>
          <span className="pill">{isBlue ? 'Blue group' : 'Red group'}</span>
        </div>
        <button className="icon-btn" onClick={onClose} aria-label="Close inspector" title="Close">
          ×
        </button>
      </header>

      <div className="action">
        <strong>{info.label}</strong>
        <span>{dead ? (blob.cause ? `This blob ${CAUSES[blob.cause]}.` : info.detail) : info.detail}</span>
        {locked && (
          <div className="lock">
            <div className="lock-row">
              <span>{info.lockLabel || 'Busy'}</span>
              <b>{blob.lock.toFixed(1)}s</b>
            </div>
            <div className="bar">
              <i style={{ width: `${lockPct * 100}%` }} />
            </div>
          </div>
        )}
      </div>

      <div className="stat">
        <div className="lock-row">
          <span>Energy</span>
          <b>
            {Math.round(blob.energy)} <em>/ copy at {threshold}</em>
          </b>
        </div>
        <div className="bar energy">
          <i style={{ width: `${energyPct * 100}%` }} />
          <s style={{ left: `${thresholdPct * 100}%` }} title="Copy threshold" />
        </div>
      </div>

      <dl className="grid">
        <div>
          <dt>Age</dt>
          <dd>{fmtClock(blob.age)}</dd>
        </div>
        <div>
          <dt>Old age at</dt>
          <dd>~{fmtClock(blob.lifespan)}</dd>
        </div>
        <div>
          <dt>Speed now</dt>
          <dd>
            {speedNow.toFixed(1)} <em>/ {maxSpeed.toFixed(1)} u/s</em>
          </dd>
        </div>
        <div>
          <dt>Sensing range</dt>
          <dd>{vision.toFixed(1)} u</dd>
        </div>
      </dl>

      <div className="traits">
        <h4>Inherited traits</h4>
        <div className="trait">
          <span>Speed</span>
          <b>×{blob.traits.speed.toFixed(2)}</b>
          <em>{dv(blob.traits.speed)}</em>
        </div>
        <div className="trait">
          <span>Vision</span>
          <b>×{blob.traits.vision.toFixed(2)}</b>
          <em>{dv(blob.traits.vision)}</em>
        </div>
      </div>

      <div className="family">
        <h4>Family</h4>
        <p>
          {blob.generation === 0 ? 'Founder of family ' : `Generation ${blob.generation} in family `}
          <b>#{familyNo}</b>
          {relatives > 0 ? `, ${relatives} living relative${relatives === 1 ? '' : 's'}` : ''}.
        </p>
        <p>
          {blob.kids} {blob.kids === 1 ? 'copy' : 'copies'} made
          {parent && !parent.dead ? (
            <>
              {' · parent '}
              <button className="link" onClick={() => onSelect(parent.id)}>
                {blobName(parent.id)}
              </button>
            </>
          ) : blob.parent ? ' · parent has faded' : ''}
          .
        </p>
        <p className="muted">{isBlue ? `${blob.eaten} fruit eaten` : `${blob.contacts} gentle ${blob.contacts === 1 ? 'contact' : 'contacts'}`}</p>
      </div>
    </aside>
  );
}
