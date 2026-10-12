import { ACTION_LABEL, BLUE, MAX_ENERGY, type Blob, type World } from '../sim/world.ts'

const TIMED: Partial<Record<Blob['action'], string>> = {
  eat: 'Chewing',
  pause: 'Resting after boop',
  bud: 'Splitting in two',
  startled: 'Startled',
  bump: 'Squabbling',
}

const FADE_CAUSE: Record<Blob['causeOfFade'], string> = {
  '': '',
  hunger: 'ran out of energy',
  boop: 'was booped down to zero energy',
  age: 'grew old',
}

export function Inspector({ world, id, follow, onFollow, onClose }: { world: World; id: number; follow: boolean; onFollow: (v: boolean) => void; onClose: () => void }) {
  const b = world.findBlob(id)
  if (!b) {
    return (
      <aside className="inspector">
        <div className="insp-head">
          <b>That blob has faded away.</b>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="Close inspector">
            ×
          </button>
        </div>
        <p className="muted">Click another blob to follow its story.</p>
      </aside>
    )
  }
  const blue = b.kind === BLUE
  const speedNow = Math.hypot(b.vx, b.vy)
  const top = world.speedOf(b)
  const vision = world.visionOf(b)
  const use = world.energyUseOf(b, speedNow)
  const copyAt = blue ? world.params.blueCopyAt : world.params.redCopyAt
  const timed = TIMED[b.action]
  const parent = b.parentId ? world.findBlob(b.parentId) : undefined
  const pct = Math.max(0, Math.min(1, b.energy / MAX_ENERGY))

  return (
    <aside className={`inspector ${blue ? 'is-blue' : 'is-red'}`} aria-live="polite">
      <div className="insp-head">
        <span className="insp-avatar" aria-hidden>
          <svg viewBox="0 0 40 44" width="34" height="38">
            <ellipse cx="20" cy="41" rx="13" ry="2.5" fill="rgba(0,0,0,.15)" />
            <path d="M20 3c9 0 15 8 15 19s-6 19-15 19S5 33 5 22 11 3 20 3z" fill={blue ? '#3b82ec' : '#ec5448'} />
            <ellipse cx="14" cy="13" rx="4" ry="5.5" fill="#fff" opacity=".4" />
            <ellipse cx="15.5" cy="21" rx="2" ry="2.8" fill="#1d2231" />
            <ellipse cx="24.5" cy="21" rx="2" ry="2.8" fill="#1d2231" />
            <path d="M17 27q3 3 6 0" stroke="#1d2231" strokeWidth="1.8" fill="none" strokeLinecap="round" />
          </svg>
        </span>
        <div className="insp-title">
          <b>{b.name}</b>
          <span className={`chip ${blue ? 'chip-blue' : 'chip-red'}`}>{blue ? 'Blue blob' : 'Red blob'}</span>
        </div>
        <button type="button" className="icon-btn" onClick={onClose} aria-label="Close inspector">
          ×
        </button>
      </div>

      {!b.alive ? (
        <p className="insp-action faded">Fading away: {FADE_CAUSE[b.causeOfFade]}.</p>
      ) : (
        <p className="insp-action">{ACTION_LABEL[b.action]}</p>
      )}

      {timed && b.alive && b.actionTime > 0 && (
        <div className="meter-row">
          <span>{timed}</span>
          <span className="num">{b.actionTime.toFixed(1)}s left</span>
          <div className="meter thin">
            <i style={{ width: `${(1 - b.actionTime / Math.max(0.01, b.actionDur)) * 100}%` }} />
          </div>
        </div>
      )}

      <div className="meter-row">
        <span>Energy</span>
        <span className="num">
          {b.energy.toFixed(0)} / {MAX_ENERGY}
        </span>
        <div className="meter energy">
          <i style={{ width: `${pct * 100}%` }} />
          <em style={{ left: `${(copyAt / MAX_ENERGY) * 100}%` }} title={`Copies itself at ${copyAt} energy`} />
        </div>
        <small className="muted">
          Burning {use.toFixed(2)}/s · copies at {copyAt}
        </small>
      </div>

      <dl className="insp-grid">
        <dt>Age</dt>
        <dd>
          {b.age.toFixed(0)}s <small>of ~{b.maxAge.toFixed(0)}s</small>
        </dd>
        <dt>Speed</dt>
        <dd>
          {speedNow.toFixed(1)} <small>/ {top.toFixed(1)} u/s top</small>
        </dd>
        <dt>Sensing range</dt>
        <dd>{vision.toFixed(1)} u</dd>
        <dt>Traits</dt>
        <dd>
          speed ×{b.speedGene.toFixed(2)} · vision ×{b.visionGene.toFixed(2)}
        </dd>
        <dt>Family</dt>
        <dd>
          gen {b.generation}
          {b.parentId ? ` · child of ${parent ? parent.name : `#${b.parentId}`}` : ' · founder'} · {b.children} {b.children === 1 ? 'copy' : 'copies'}
        </dd>
        <dt>{blue ? 'Fruit eaten' : 'Boops'}</dt>
        <dd>{b.meals}</dd>
        {blue && (
          <>
            <dt>Status</dt>
            <dd>
              {[b.sheltered ? 'under leaves' : 'in the open', b.huntedBy ? `chased by ${b.huntedBy} red` : '', b.immuneFor > 0 ? 'just booped' : '']
                .filter(Boolean)
                .join(' · ')}
            </dd>
          </>
        )}
      </dl>

      <label className="toggle">
        <input type="checkbox" checked={follow} onChange={(e) => onFollow(e.target.checked)} />
        <span>Follow with camera</span>
      </label>
    </aside>
  )
}
