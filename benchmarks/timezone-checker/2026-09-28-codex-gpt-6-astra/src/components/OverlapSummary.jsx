import { CheckCheck, Moon } from 'lucide-react';
import { duration, formatTime } from '../time';
import Flag from './Flag';

function Ranges({ windows, format }) {
  return (
    <div className="summary-ranges">
      {windows.map(([start, end]) => (
        <span className="range-badge" key={start}>
          {formatTime(start, format)} <span>—</span> {end === 1440 && format === '24' ? '24:00' : formatTime(end, format)}
          {end === 1440 && <small title="Next day"> +1</small>}
        </span>
      ))}
    </div>
  );
}

export default function OverlapSummary({ rows, windows, mode, format }) {
  if (rows.length < 2) return null;
  const reference = rows[0];
  if (mode === 'base') {
    return (
      <div className="overlap-summary base-summary" aria-live="polite">
        <div className="base-summary-label">
          <CheckCheck size={18} />
          <span>Time in common with <strong>{reference.name}</strong></span>
          <small>IN REFERENCE TIME</small>
        </div>
        {rows.slice(1).map(row => (
          <div className="base-summary-row" key={row.id}>
            <span><Flag code={row.code} />{row.name}</span>
            <strong>{row.windows.length ? duration(row.windows) : 'No overlap'}</strong>
            {row.windows.length ? <Ranges windows={row.windows} format={format} /> : (
              <div className="summary-ranges"><span className="no-overlap-text">Try widening your awake window</span></div>
            )}
          </div>
        ))}
      </div>
    );
  }
  return (
    <div className={`overlap-summary ${!windows.length ? 'no-overlap' : ''}`} aria-live="polite">
      <div className="summary-icon">{windows.length ? <CheckCheck size={24} /> : <Moon size={22} />}</div>
      <div className="summary-text">
        <div className="summary-title">
          {windows.length ? (
            <><strong>{duration(windows)}</strong> of shared possibility<span className="all-cities-badge">ALL {rows.length} CITIES</span></>
          ) : 'No shared hours just yet'}
        </div>
        <p>
          {windows.length ? 'A good time to get everyone together.' : 'Try a wider awake window or compare cities in Base mode.'}
          {' '}<span>{reference.name} time.</span>
        </p>
      </div>
      <Ranges windows={windows} format={format} />
    </div>
  );
}
