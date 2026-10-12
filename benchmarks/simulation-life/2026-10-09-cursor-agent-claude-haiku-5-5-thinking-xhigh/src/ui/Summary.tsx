import type { RunSummary } from '../sim/analysis';

interface SummaryProps {
  summary: RunSummary;
  samples: number;
}

export function Summary({ summary, samples }: SummaryProps) {
  return (
    <section className="card summary">
      <h2>Run summary</h2>
      {samples < 2 ? (
        <p className="muted">Nothing recorded yet. Press play and the story writes itself.</p>
      ) : (
        <>
          <p className="headline">{summary.headline}</p>
          <ul>
            {summary.lines.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}
