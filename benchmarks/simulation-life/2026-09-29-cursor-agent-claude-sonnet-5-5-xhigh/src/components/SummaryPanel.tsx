import { analyze } from '../analysis';
import type { World } from '../sim/engine';

export function SummaryPanel({ world }: { world: World }) {
  const a = analyze(world);
  return (
    <div className={`summary tone-${a.tone}`}>
      <div className="verdict">
        <strong>{a.title}</strong>
        <p>{a.lead}</p>
      </div>
      {a.story.length > 0 && (
        <ul className="story">
          {a.story.map((line, i) => (
            <li key={i} className={`mark-${line.mark}`}>
              <i aria-hidden="true" />
              <span>{line.text}</span>
            </li>
          ))}
        </ul>
      )}
      {a.facts.length > 0 && (
        <dl className="facts">
          {a.facts.map((f) => (
            <div key={f.label}>
              <dt>{f.label}</dt>
              <dd>{f.value}</dd>
              {f.sub && <small>{f.sub}</small>}
            </div>
          ))}
        </dl>
      )}
    </div>
  );
}
