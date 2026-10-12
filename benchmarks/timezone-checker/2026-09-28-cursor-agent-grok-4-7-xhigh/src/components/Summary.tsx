import type { SummaryModel } from '../lib/board';

function Chips({ ranges }: { ranges: Array<{ key: string; label: string; title: string }> }) {
  return ranges.map((range) => (
    <span className="badge" key={range.key} title={range.title}>
      {range.label}
    </span>
  ));
}

export function Summary({ summary }: { summary: SummaryModel }) {
  if (summary.kind === 'hidden') return null;

  if (summary.kind === 'meeting') {
    return (
      <div className="summary" role="status" data-summary="meeting" data-count={summary.count}>
        <p className="summary-lead">{summary.headline}</p>
        <span className="summary-where">{summary.where}</span>
        {summary.warning ? <p className="banner-warn">{summary.warning}</p> : <Chips ranges={summary.ranges} />}
      </div>
    );
  }

  return (
    <div className="summary summary-base" role="status" data-summary="base">
      <p className="base-kicker">{summary.heading}</p>
      <ul className="base-list">
        {summary.lines.map((line) => (
          <li key={line.cityId} className="base-line" data-city={line.cityId} data-count={line.count}>
            <span className="base-name">{line.cityName}</span>
            <span className="base-detail">{line.detail}</span>
            {line.warning ? <span className="base-warn">{line.warning}</span> : <Chips ranges={line.ranges} />}
          </li>
        ))}
      </ul>
    </div>
  );
}
