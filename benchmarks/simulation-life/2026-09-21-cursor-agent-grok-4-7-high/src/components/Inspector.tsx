import { actionLabel, blobName, showsTimeLeft } from '../sim/labels'
import type { Params } from '../sim/params'
import { CONST } from '../sim/world'
import type { Blob } from '../sim/types'

type Props = {
  blob: Blob | null
  missing: boolean
  params: Params
  onClear: () => void
}

export function Inspector({ blob, missing, params, onClear }: Props) {
  if (!blob) {
    return (
      <section className="panel inspector">
        <h2>Blob</h2>
        {missing ? (
          <>
            <p>That blob faded.</p>
            <button type="button" onClick={onClear}>
              Close
            </button>
          </>
        ) : (
          <p>Click a blob in the dish to inspect it.</p>
        )}
      </section>
    )
  }

  const maxSpeed = (blob.group === 'blue' ? params.blueSpeed : params.redSpeed) * blob.traits.speed
  const vision = (blob.group === 'blue' ? params.blueVision : params.redVision) * blob.traits.vision
  const faces = ['Round eyes', 'Bright eyes', 'Sleepy eyes']
  return (
    <section className="panel inspector" data-testid="inspector">
      <header className="panel-head">
        <h2>
          <i className={blob.group === 'blue' ? 'swatch blue' : 'swatch red'} />
          {blobName(blob.id)}
        </h2>
        <p>{blob.group === 'blue' ? 'Blue blob' : 'Red blob'}</p>
      </header>
      <div className="energy">
        <span>Energy {blob.energy.toFixed(1)}</span>
        <div className="bar">
          <div style={{ width: `${Math.max(0, Math.min(100, (blob.energy / CONST.maxEnergy) * 100))}%` }} />
        </div>
      </div>
      <dl>
        <dt>Age</dt>
        <dd>{blob.age.toFixed(1)}s</dd>
        <dt>Current action</dt>
        <dd>{actionLabel(blob.action)}</dd>
        <dt>Speed</dt>
        <dd>{maxSpeed.toFixed(1)}</dd>
        <dt>Sensing range</dt>
        <dd>{vision.toFixed(0)}</dd>
        <dt>Time left</dt>
        <dd>{showsTimeLeft(blob.action) && blob.actionTimer > 0 ? `${blob.actionTimer.toFixed(1)}s` : 'None'}</dd>
        <dt>Speed trait</dt>
        <dd>{blob.traits.speed.toFixed(2)}×</dd>
        <dt>Vision trait</dt>
        <dd>{blob.traits.vision.toFixed(2)}×</dd>
        <dt>Thrift</dt>
        <dd>{blob.traits.thrift.toFixed(2)}×</dd>
        <dt>Generation</dt>
        <dd>{blob.generation}</dd>
        <dt>Parent</dt>
        <dd>{blob.parentId < 0 ? 'Founder' : blobName(blob.parentId)}</dd>
        <dt>Children</dt>
        <dd>{blob.children}</dd>
        <dt>Meals</dt>
        <dd>{blob.meals}</dd>
        <dt>Face</dt>
        <dd>{faces[blob.face] ?? 'Round eyes'}</dd>
        {blob.group === 'blue' ? (
          <>
            <dt>Cover</dt>
            <dd>{blob.sheltered ? 'Under a tree' : 'In the open'}</dd>
          </>
        ) : null}
      </dl>
    </section>
  )
}
