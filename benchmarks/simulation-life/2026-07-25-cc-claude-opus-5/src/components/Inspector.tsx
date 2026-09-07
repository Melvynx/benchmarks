import type { Blob } from '../sim/types'
import type { Params } from '../sim/params'
import { CONST } from '../sim/world'
import { seriesColor, type Mode } from '../theme'

type Props = { blob: Blob | null; params: Params; mode: Mode; time: number; onClose: () => void }

const ACTION_TEXT: Record<Blob['action'], string> = {
  wander: 'Wandering',
  seek: 'Heading for fruit',
  eat: 'Eating',
  flee: 'Running from red',
  avoid: 'Getting out of the crush',
  gather: 'Waiting by a tree',
  hunt: 'Closing on a blue blob',
  contact: 'Making contact',
  rest: 'Resting it off',
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="insp-row">
      <span className="insp-label">{label}</span>
      <span className="insp-value">{value}</span>
    </div>
  )
}

export function Inspector({ blob, params, mode, time, onClose }: Props) {
  if (!blob) {
    return (
      <div className="panel inspector inspector-empty">
        <h3 className="panel-title">Inspect</h3>
        <p className="muted">Click any blob in the garden to follow what it is doing.</p>
      </div>
    )
  }

  const color = seriesColor(blob.kind, mode)
  const speed = (blob.kind === 'blue' ? params.blueSpeed : params.redSpeed) * blob.traits.speed
  const vision = (blob.kind === 'blue' ? params.blueVision : params.redVision) * blob.traits.vision
  const energyPct = Math.max(0, Math.min(100, (blob.energy / CONST.maxEnergy) * 100))
  const copyAt = blob.kind === 'blue' ? params.blueCopy : params.redCopy
  const locked = blob.actionTimer > 0

  return (
    <div className="panel inspector">
      <h3 className="panel-title">
        <span className="dot" style={{ background: color }} />
        {blob.kind === 'blue' ? 'Blue blob' : 'Red blob'} #{blob.id}
        <button className="ghost close" onClick={onClose} aria-label="Stop inspecting">
          ✕
        </button>
      </h3>

      <div className="energy-bar" title={`${blob.energy.toFixed(0)} of ${CONST.maxEnergy}`}>
        <div className="energy-fill" style={{ width: `${energyPct}%`, background: color }} />
        <div className="energy-mark" style={{ left: `${(copyAt / CONST.maxEnergy) * 100}%` }} title={`Copies itself at ${copyAt}`} />
      </div>

      <div className="insp-grid">
        <Row label="Energy" value={`${blob.energy.toFixed(0)} / ${CONST.maxEnergy}`} />
        <Row label="Copies at" value={String(copyAt)} />
        <Row label="Doing" value={ACTION_TEXT[blob.action]} />
        <Row label="Age" value={`${blob.age.toFixed(0)}s of ~${blob.lifespan.toFixed(0)}s`} />
        <Row label="Speed" value={speed.toFixed(0)} />
        <Row label="Sensing range" value={vision.toFixed(0)} />
        {locked && <Row label="Animation left" value={`${blob.actionTimer.toFixed(1)}s`} />}
        {blob.kind === 'blue' && blob.immunity > 0 && <Row label="Recovering" value={`${blob.immunity.toFixed(1)}s`} />}
        {blob.kind === 'blue' && <Row label="Under cover" value={blob.sheltered ? 'yes' : 'no'} />}
        {blob.kind === 'red' && <Row label="Rivals nearby" value={blob.crowding.toFixed(1)} />}
        <Row label={blob.kind === 'blue' ? 'Fruit eaten' : 'Contacts'} value={String(blob.meals)} />
        <Row label="Children" value={String(blob.children)} />
        <Row label="Generation" value={String(blob.generation)} />
        <Row label="Parent" value={blob.parentId < 0 ? 'founder' : `#${blob.parentId}`} />
        <Row label="Born at" value={`${blob.bornAt.toFixed(0)}s`} />
        <Row label="Alive for" value={`${(time - blob.bornAt).toFixed(0)}s`} />
      </div>

      <div className="traits">
        <span className="traits-title">Inherited traits</span>
        {(['speed', 'vision', 'thrift'] as const).map((t) => (
          <div key={t} className="trait-bar-row">
            <span className="trait-bar-label">{t}</span>
            <div className="trait-bar">
              <div className="trait-bar-base" />
              <div
                className="trait-bar-fill"
                style={{
                  left: `${((Math.min(blob.traits[t], 1) - CONST.traitMin) / (CONST.traitMax - CONST.traitMin)) * 100}%`,
                  width: `${(Math.abs(blob.traits[t] - 1) / (CONST.traitMax - CONST.traitMin)) * 100}%`,
                  background: color,
                }}
              />
            </div>
            <span className="trait-bar-value">{blob.traits[t].toFixed(2)}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
