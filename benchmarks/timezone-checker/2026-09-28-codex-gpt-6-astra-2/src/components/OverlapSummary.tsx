import { ArrowRight, CircleCheck, Moon, Users } from 'lucide-react';
import type { City } from '../cities';
import { duration, formatTime, type Mode, type TimeFormat, type TimeRange } from '../time';

interface Props { cities: City[]; mode: Mode; format: TimeFormat; meetingRanges: TimeRange[]; pairRanges: TimeRange[][]; onSelect: (minute: number) => void }

function Ranges({ ranges, format, onSelect }: { ranges: TimeRange[]; format: TimeFormat; onSelect: (minute: number) => void }) {
  return <div className="range-badges">{ranges.map(range => <button className="range-badge" key={range.start} onClick={() => onSelect(range.start)} title="Inspect the start of this overlap window">{formatTime(range.start, format)}<span>—</span>{range.end === 1440 && format === '24h' ? '24:00' : formatTime(range.end, format)}<ArrowRight size={13} /></button>)}</div>;
}

export function OverlapSummary({ cities, mode, format, meetingRanges, pairRanges, onSelect }: Props) {
  if (cities.length < 2) return null;
  if (mode === 'base') return <section className="base-summary" aria-label="Overlap with reference city" aria-live="polite">
    <div className="base-summary-heading"><Users size={16} /><span>Time together with <strong>{cities[0].name}</strong></span><small>All times in {cities[0].name}</small></div>
    {cities.slice(1).map((city, index) => <div className={`pair-summary ${!pairRanges[index].length ? 'no-overlap' : ''}`} key={city.id}>
      <span className="pair-city"><span aria-hidden="true">{city.flag}</span>{city.name}</span>
      <strong className="pair-duration">{duration(pairRanges[index])}<span> overlap</span></strong>
      {pairRanges[index].length ? <Ranges ranges={pairRanges[index]} format={format} onSelect={onSelect} /> : <span className="pair-warning"><Moon size={14} /> No shared awake time</span>}
    </div>)}
  </section>;
  return <section className={`overlap-summary ${!meetingRanges.length ? 'no-overlap' : ''}`} aria-label="Meeting overlap" aria-live="polite">
    <div className="summary-icon">{meetingRanges.length ? <CircleCheck size={22} strokeWidth={1.7} /> : <Moon size={22} />}</div>
    <div className="summary-copy"><div><strong>{meetingRanges.length ? `${duration(meetingRanges)} of common ground` : 'A little out of sync'}</strong>{meetingRanges.length > 0 && <span className="everyone-badge">Everyone’s awake</span>}</div><p>{meetingRanges.length ? `Your shared meeting windows, in ${cities[0].name} time.` : 'No shared awake hours. Try adjusting the awake window or switching to Base mode.'}</p></div>
    <Ranges ranges={meetingRanges} format={format} onSelect={onSelect} />
  </section>;
}
