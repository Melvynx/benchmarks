import { ACTION_LABELS } from '../sim/types'
import type { Agent, Params } from '../sim/types'

type Props = {
  agent: Agent | null
  missing: boolean
  params: Params
}

export function Inspector({ agent, missing, params }: Props) {
  if (!agent) {
    return (
      <section className="inspector empty">
        <h2>Blob</h2>
        <p>Click a blue or red blob. Drag the dish to turn it.</p>
      </section>
    )
  }
  const speedParam = agent.kind === 'blue' ? params.blueSpeed : params.redSpeed
  const visionParam = agent.kind === 'blue' ? params.blueVision : params.redVision
  const threshold = agent.kind === 'blue' ? params.blueCopy : params.redCopy
  const speed = speedParam * agent.traitSpeed
  const vision = visionParam * agent.traitVision
  const pct = Math.max(0, Math.min(100, (agent.energy / Math.max(1, threshold)) * 100))
  const busy = agent.timer > 0 && (agent.action === 'eat' || agent.action === 'pause' || agent.action === 'contact' || agent.action === 'flee')
  return (
    <section className={`inspector ${agent.kind}`}>
      <h2>
        <i className={`swatch ${agent.kind}`} />
        {agent.kind === 'blue' ? 'Blue blob' : 'Red blob'}
        <span>#{agent.id}</span>
      </h2>
      {missing ? <p className="gone">This blob faded. These are its last numbers.</p> : null}
      <div className="energy">
        <span>Energy {agent.energy.toFixed(1)}</span>
        <span>Copy at {Math.round(threshold)}</span>
      </div>
      <div className="bar" aria-hidden="true">
        <span style={{ width: `${pct}%` }} />
      </div>
      <dl>
        <div>
          <dt>Age</dt>
          <dd>{agent.age} beats</dd>
        </div>
        <div>
          <dt>Action</dt>
          <dd>{ACTION_LABELS[agent.action]}</dd>
        </div>
        <div>
          <dt>Doing</dt>
          <dd>{agent.detail}</dd>
        </div>
        <div>
          <dt>Speed</dt>
          <dd>
            {speed.toFixed(2)}× <small>trait {agent.traitSpeed.toFixed(2)}</small>
          </dd>
        </div>
        <div>
          <dt>Sensing range</dt>
          <dd>
            {vision.toFixed(1)} <small>trait {agent.traitVision.toFixed(2)}</small>
          </dd>
        </div>
        <div>
          <dt>Metabolism</dt>
          <dd>{agent.traitMetabolism.toFixed(2)}×</dd>
        </div>
        <div>
          <dt>Time left</dt>
          <dd>{busy ? `${agent.timer} beats` : 'Free'}</dd>
        </div>
        <div>
          <dt>Family</dt>
          <dd>
            Generation {agent.generation}
            {agent.parentId != null ? ` · from #${agent.parentId}` : ' · founder'}
            <small>born beat {agent.bornTick}</small>
          </dd>
        </div>
      </dl>
    </section>
  )
}
