import { useMemo } from 'react'
import type { World } from '../sim/world'
import { summarize } from '../sim/analysis'

export function Story({ world, tick }: { world: World; tick: number }) {
  const s = useMemo(
    () => summarize(world),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [world, tick],
  )
  return (
    <section className={`panel story mood-${s.mood}`} aria-label="Run summary">
      <div className="panel-title">
        <h2>Run summary</h2>
        <span className="hint">written from the recorded history</span>
      </div>
      <p className="headline">{s.headline}</p>
      <ul className="story-lines">
        {s.lines.map((l, i) => (
          <li key={i}>{l}</li>
        ))}
      </ul>
      <dl className="chips">
        {s.chips.map((c) => (
          <div key={c.label} className="chip">
            <dt>{c.label}</dt>
            <dd>{c.value}</dd>
          </div>
        ))}
      </dl>
    </section>
  )
}
