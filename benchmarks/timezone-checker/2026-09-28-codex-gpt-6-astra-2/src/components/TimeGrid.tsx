import { useState } from 'react';
import { ArrowUpRight, Moon, Sun, X } from 'lucide-react';
import type { City } from '../cities';
import { formatTime, HOURS, inRanges, isAwake, localMinutes, offsetLabel, wrap, type Mode, type Settings, type TimeRange } from '../time';

interface Props {
  cities: City[]; offsets: number[]; settings: Settings; mode: Mode; now: Date;
  meetingRanges: TimeRange[]; pairRanges: TimeRange[][]; selectedMinute: number | null;
  onSelect: (minute: number) => void; onPromote: (id: string) => void; onRemove: (id: string) => void;
}

export function TimeGrid(props: Props) {
  const { cities, offsets, settings, mode, now, meetingRanges, pairRanges, selectedMinute, onSelect, onPromote, onRemove } = props;
  const [hoveredHour, setHoveredHour] = useState<number | null>(null);
  if (!cities.length) return null;
  const currentHour = Math.floor(localMinutes(cities[0].timezone, now) / 60);

  function cityInfo(city: City, index: number, mobile = false) {
    return <div className={`city-info ${mobile ? 'mobile-city-info' : ''}`}>
      <div className="city-name-line"><button className="city-name" onClick={() => onPromote(city.id)} title={index === 0 ? `${city.name} is your reference city` : `Make ${city.name} your reference city`}><span className="city-flag" aria-hidden="true">{city.flag}</span><span>{city.name}</span>{index !== 0 && <ArrowUpRight className="promote-icon" size={12} />}</button>{index === 0 && <span className="ref-badge">REF</span>}</div>
      <div className="city-meta"><span>{offsetLabel(offsets[index])}</span><span className="meta-dot">·</span><span>{formatTime(localMinutes(city.timezone, now), settings.format)} now</span></div>
      {mobile && <button className="mobile-remove" onClick={() => onRemove(city.id)} aria-label={`Remove ${city.name}`}><X size={13} /></button>}
    </div>;
  }

  function cell(city: City, index: number, hour: number) {
    const minute = hour * 60;
    const local = wrap(minute + offsets[index] - offsets[0]);
    const awake = isAwake(local, settings);
    const ranges = mode === 'meeting' ? meetingRanges : index === 0 ? pairRanges.flat() : pairRanges[index - 1];
    const overlap = cities.length > 1 && inRanges(minute, ranges);
    const state = overlap ? 'overlap' : awake ? 'awake' : 'sleeping';
    const selected = selectedMinute !== null && Math.floor(selectedMinute / 60) === hour;
    const localHour = Math.floor(local / 60);
    const showPeriod = localHour === 0 || localHour === 12;
    return <button key={`${city.id}-${hour}`} className={`hour-cell ${state} ${hoveredHour === hour ? 'column-hover' : ''} ${selected ? 'selected' : ''} ${local % 60 ? 'fractional' : ''}`} data-state={state} data-hour={hour} data-city={city.id} aria-label={`${city.name}, ${formatTime(local, settings.format)}: ${overlap ? 'overlap' : awake ? 'awake' : 'sleeping'}`} aria-pressed={selected} onClick={() => onSelect(minute)} onMouseEnter={() => setHoveredHour(hour)} onMouseLeave={() => setHoveredHour(null)} onFocus={() => setHoveredHour(hour)} onBlur={() => setHoveredHour(null)}>
      <span>{settings.format === '24h' && local % 60 === 0 ? String(localHour).padStart(2, '0') : formatTime(local, settings.format, true)}</span>
      {settings.format === '12h' && <small className={showPeriod ? 'period-emphasis' : ''}>{localHour < 12 ? 'am' : 'pm'}</small>}
      {showPeriod && <span className="day-symbol">{localHour === 0 ? <Moon size={8} /> : <Sun size={8} />}</span>}
    </button>;
  }

  return <>
    <div className="desktop-grid" aria-label="Hourly timezone comparison">
      <div className="desktop-grid-inner">
        <div className="grid-header grid-row"><div className="grid-location-label">CITY / LOCAL TIME</div><div className="hour-track">{HOURS.map(hour => <div key={hour} className={`hour-heading ${hour === currentHour ? 'current-hour' : ''}`} title={`${formatTime(hour * 60, settings.format)} in ${cities[0].name}`}><span>{settings.format === '24h' ? String(hour).padStart(2, '0') : hour % 12 || 12}</span>{hour === currentHour && <span className="now-label">NOW</span>}</div>)}</div><span /></div>
        {cities.map((city, index) => <div className={`grid-row city-row ${index === 0 ? 'reference-row' : ''}`} key={city.id}>{cityInfo(city, index)}<div className="hour-track">{HOURS.map(hour => cell(city, index, hour))}</div><button className="icon-button remove-city" onClick={() => onRemove(city.id)} aria-label={`Remove ${city.name}`}><X size={15} /></button></div>)}
        <div className="grid-row day-period-row"><span /><div className="day-periods"><span>Midnight</span><span>Morning</span><span>Afternoon</span><span>Evening</span></div><span /></div>
      </div>
    </div>
    <div className="mobile-grid" aria-label="Hourly timezone comparison, cities in columns">
      <div className="mobile-grid-inner" style={{ gridTemplateColumns: `48px repeat(${cities.length}, minmax(84px, 1fr))` }}>
        <div className="mobile-time-heading">HOUR</div>{cities.map((city, index) => <div className="mobile-city-heading" key={city.id}>{cityInfo(city, index, true)}</div>)}
        {HOURS.map(hour => <div className="mobile-hour-row" key={hour}><div className={`mobile-hour-label ${hour === currentHour ? 'current-hour' : ''}`}>{formatTime(hour * 60, settings.format)}{hour === currentHour && <small>now</small>}</div>{cities.map((city, index) => cell(city, index, hour))}</div>)}
      </div>
    </div>
  </>;
}
