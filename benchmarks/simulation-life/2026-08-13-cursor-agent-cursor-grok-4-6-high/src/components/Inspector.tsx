import type { Blob } from '../sim/types'
import type { Params } from '../sim/params'
import { CONST } from '../sim/world'
import { ACTION_LABEL, SERIES } from '../theme'

type Props = {
  blob: Blob | null
  params: Params
  onClose: () => void
}

export function Inspector({ blob, params, onClose }: Props) {
  if (!blob) {
    return (
      <section className="inspector empty">
        <p>Click a blob on the dish to inspect it.</p>
      </section>
    )
  }

  const color = blob.kind === 'blue' ? SERIES.blue : SERIES.red
  const energyPct = Math.max(0, Math.min(100, (blob.energy / CONST.maxEnergy) * 100))
  const timer = blob.actionTimer > 0 ? blob.actionTimer : 0
  const speed = (blob.kind === 'blue' ? params.blueSpeed : params.redSpeed) * blob.traits.speed
  const vision = (blob.kind === 'blue' ? params.blueVision : params.redVision) * blob.traits.vision

  return (
    <section className="inspector">
      <header>
        <span className="swatch" style={{ background: color }} />
        <h2>{blob.kind === 'blue' ? 'Blue blob' : 'Red blob'}</h2>
        <button type="button" className="ghost" onClick={onClose} aria-label="Close inspector">
          Close
        </button>
      </header>
      <dl>
        <Row label="Energy" value={`${blob.energy.toFixed(1)} / ${CONST.maxEnergy}`} />
        <div className="meter" aria-hidden="true">
          <span style={{ width: `${energyPct}%`, background: color }} />
        </div>
        <Row label="Age" value={`${blob.age.toFixed(1)}s / ${blob.lifespan.toFixed(0)}s`} />
        <Row label="Action" value={ACTION_LABEL[blob.action] ?? blob.action} />
        <Row label="Speed" value={speed.toFixed(1)} />
        <Row label="Sensing range" value={vision.toFixed(1)} />
        <Row label="Thrift" value={blob.traits.thrift.toFixed(2)} />
        {timer > 0 && <Row label="Time left" value={`${timer.toFixed(2)}s`} />}
        <Row label="Generation" value={String(blob.generation)} />
        <Row label="Parent" value={blob.parentId < 0 ? 'founder' : `#${blob.parentId}`} />
        <Row label="Meals" value={String(blob.meals)} />
        <Row label="Children" value={String(blob.children)} />
      </dl>
    </section>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <>
      <dt>{label}</dt>
      <dd>{value}</dd>
    </>
  )
}
