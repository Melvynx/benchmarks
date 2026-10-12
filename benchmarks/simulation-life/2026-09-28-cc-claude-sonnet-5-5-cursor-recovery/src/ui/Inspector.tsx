import { useEffect, useState, type ReactNode } from 'react'
import { BLUE, C, type Action, type Blob, type World } from '../sim/world'
import { fmtClock } from './chartUtils'

interface Props {
  world: World
  selectedId: number | null
  follow: boolean
  onFollow: (f: boolean) => void
  onClose: () => void
  onSelect: (id: number) => void
}

const ACTION_LABEL: Record<Action, { blue: string; red: string; emoji: string }> = {
  wander: { blue: 'Strolling around', red: 'Prowling around', emoji: '🚶' },
  rest: { blue: 'Resting a moment', red: 'Resting a moment', emoji: '😌' },
  seek: { blue: 'Heading for fruit', red: 'Heading for fruit', emoji: '🍏' },
  search: { blue: 'Searching for a tree', red: 'Searching', emoji: '🔎' },
  gather: { blue: 'Gathering near a tree', red: 'Gathering', emoji: '🌳' },
  flee: { blue: 'Running from red', red: 'Running', emoji: '💨' },
  spread: { blue: 'Avoiding the crowd', red: 'Avoiding the crowd', emoji: '↔️' },
  eat: { blue: 'Chewing fruit', red: 'Chewing', emoji: '😋' },
  hunt: { blue: 'Hunting', red: 'Chasing a blue blob', emoji: '👀' },
  pause: { blue: 'Pausing', red: 'Pausing after contact', emoji: '💗' },
  stunned: { blue: 'Startled by contact', red: 'Startled', emoji: '💫' },
  fading: { blue: 'Fading away', red: 'Fading away', emoji: '🫧' },
}

function Row({ k, v, tone }: { k: string; v: ReactNode; tone?: string }) {
  return (
    <div className="row">
      <dt>{k}</dt>
      <dd className={tone}>{v}</dd>
    </div>
  )
}

export function Inspector({ world, selectedId, follow, onFollow, onClose, onSelect }: Props) {
  const [, setN] = useState(0)
  useEffect(() => {
    const id = window.setInterval(() => setN((n) => n + 1), 100)
    return () => window.clearInterval(id)
  }, [])

  const b: Blob | undefined = selectedId !== null ? world.byId.get(selectedId) : undefined

  if (!b) {
    return (
      <section className="panel inspector empty" aria-label="Blob inspector">
        <div className="panel-title">
          <h2>Blob inspector</h2>
        </div>
        <div className="inspector-empty">
          <div className="pointer" aria-hidden="true">
            👆
          </div>
          <p>Click any blob in the garden to see its energy, what it is doing and who its family is.</p>
        </div>
      </section>
    )
  }

  const p = world.params
  const isBlue = b.kind === BLUE
  const group = isBlue ? 'blue' : 'red'
  const label = ACTION_LABEL[b.action]
  const speed = Math.hypot(b.vx, b.vy)
  const maxSpeed = (isBlue ? p.blueSpeed : p.redSpeed) * b.speedGene
  const vision = (isBlue ? p.blueVision : p.redVision) * b.visionGene
  const copy = isBlue ? p.blueCopy : p.redCopy
  const energyPct = Math.min(100, (b.energy / C.MAX_ENERGY) * 100)
  const timerLeft = b.action === 'eat' || b.action === 'pause' || b.action === 'stunned' ? b.timer : 0
  const parent = b.parent ? world.byId.get(b.parent) : undefined
  const animLabel = b.action === 'eat' ? 'Eating time left' : b.action === 'pause' ? 'Pause time left' : b.action === 'stunned' ? 'Startle time left' : 'Animation time left'

  return (
    <section className={`panel inspector ${group}`} aria-label="Blob inspector">
      <div className="panel-title">
        <h2>Blob inspector</h2>
        <button type="button" className="mini" onClick={onClose} aria-label="Close inspector">
          ✕
        </button>
      </div>
      <div className="who">
        <span className={`avatar ${group}`} aria-hidden="true" />
        <div>
          <div className="name">{b.name}</div>
          <div className="sub">{isBlue ? 'Blue blob' : 'Red blob'} · generation {b.gen}</div>
        </div>
      </div>

      <div className="energy">
        <div className="energy-head">
          <span>Energy</span>
          <b>
            {b.energy.toFixed(0)} / {C.MAX_ENERGY}
          </b>
        </div>
        <div className="bar">
          <div className={`fill ${group}`} style={{ width: `${energyPct}%` }} />
          <div className="mark" style={{ left: `${copy}%` }} title={`Makes a copy at ${copy}`} />
        </div>
        <div className="bar-note">Copy mark at {copy}. Copying costs half of that in stored energy.</div>
      </div>

      <dl className="rows">
        <Row k="Doing now" v={`${label.emoji} ${isBlue ? label.blue : label.red}`} />
        <Row k="Age" v={fmtClock(b.age)} />
        <Row k="Speed" v={`${speed.toFixed(1)} of ${maxSpeed.toFixed(1)} u/s`} />
        <Row k="Sensing range" v={`${vision.toFixed(1)} u`} />
        <Row k={animLabel} v={timerLeft > 0 ? `${timerLeft.toFixed(1)} s` : 'none'} tone={timerLeft > 0 ? 'hot' : undefined} />
        {isBlue && <Row k="Startle shield" v={b.immune > 0 ? `${b.immune.toFixed(1)} s` : 'none'} />}
        <Row k="Speed trait" v={`${b.speedGene.toFixed(2)}× base`} />
        <Row k="Vision trait" v={`${b.visionGene.toFixed(2)}× base`} />
        <Row k={isBlue ? 'Fruit eaten' : 'Contacts made'} v={isBlue ? b.meals : b.contacts} />
        <Row k="Children" v={b.kids} />
        <Row
          k="Parent"
          v={
            b.parent === 0 ? (
              'Founder'
            ) : parent && !parent.dead ? (
              <button type="button" className="link" onClick={() => onSelect(parent.id)}>
                {parent.name}
              </button>
            ) : (
              'Gone'
            )
          }
        />
      </dl>

      <label className="check">
        <input type="checkbox" checked={follow} onChange={(e) => onFollow(e.target.checked)} />
        <span>Camera follows this blob</span>
      </label>
    </section>
  )
}
