import { useState } from 'react';
import { ArrowRight, Clock3, Globe2, Info, X } from 'lucide-react';
import { mod, isAwake, formatTime, offsetLabel } from '../time';
import Flag from './Flag';

const HOURS = Array.from({ length: 24 }, (_, hour) => hour);

function CityInfo({ row, index, mobile, onPromote }) {
  return (
    <div className="city-info">
      <div className="city-name-line">
        <Flag code={row.code} />
        <button className="city-name" onClick={() => onPromote(row.id)}
          title={index === 0 ? 'Reference city' : `Make ${row.name} the reference city`}>
          {row.name}
        </button>
        {index === 0 && <span className="ref-tag">REF</span>}
      </div>
      <div className="city-meta">
        {!mobile && <span>{row.country}<span className="meta-dot">·</span></span>}
        {offsetLabel(row.offset)}
      </div>
    </div>
  );
}

function HourCell({ row, hour, settings, cityCount, hovered, onHover }) {
  const minute = mod(hour * 60 + row.delta);
  const awake = isAwake(minute, settings.wake, settings.sleep);
  const overlap = cityCount > 1 && row.availability[hour * 60];
  const day = Math.floor((hour * 60 + row.delta) / 1440);
  const status = overlap ? 'Shared availability' : awake ? 'Awake' : 'Sleeping';
  const label = `${row.name}: ${formatTime(minute, settings.format)}${day ? ` (${day > 0 ? 'next' : 'previous'} day)` : ''} · ${status}`;
  return (
    <div className={`hour-cell ${awake ? 'awake' : 'sleeping'} ${overlap ? 'overlap' : ''} ${minute % 60 ? 'fractional-hour' : ''} ${hovered ? 'column-hover' : ''}`}
      onMouseEnter={() => onHover(hour)} onMouseLeave={() => onHover(null)} aria-label={label} title={label}>
      <span>{formatTime(minute, settings.format, true)}</span>
      {settings.format === '12' && <small>{minute < 720 ? 'a' : 'p'}</small>}
      {minute === 0 && row.delta !== 0 && <i className="day-marker" />}
    </div>
  );
}

export default function TimeGrid({ rows, settings, onPromote, onRemove, onRestore }) {
  const [hover, setHover] = useState(null);
  const reference = rows[0];
  const hourCell = (row, hour) => <HourCell key={hour} row={row} hour={hour} settings={settings}
    cityCount={rows.length} hovered={hover === hour} onHover={setHover} />;
  return (
    <>
      {rows.length > 0 ? (
        <>
          <div className={`desktop-grid ${settings.format === '24' ? 'format-24' : ''}`} aria-label="City hours, desktop comparison">
            <div className="grid-label-row">
              <div className="location-label">CITY / TIMEZONE</div>
              <div className="hour-axis">
                {HOURS.map(hour => (
                  <span key={hour} className={hover === hour ? 'axis-hover' : ''}>
                    {settings.format === '24' ? String(hour).padStart(2, '0') : <>{hour % 12 || 12}<small>{hour < 12 ? 'a' : 'p'}</small></>}
                  </span>
                ))}
              </div>
              <div />
            </div>
            {rows.map((row, index) => (
              <div className={`city-row ${index === 0 ? 'reference-row' : ''}`} key={row.id}>
                <CityInfo row={row} index={index} onPromote={onPromote} />
                <div className="hours-row">{HOURS.map(hour => hourCell(row, hour))}</div>
                <button className="remove-city" onClick={() => onRemove(row.id)} aria-label={`Remove ${row.name}`}><X size={14} /></button>
              </div>
            ))}
          </div>
          <div className="mobile-grid" aria-label="City hours, mobile comparison">
            <div className="mobile-grid-inner" style={{ gridTemplateColumns: `38px repeat(${rows.length}, minmax(85px, 1fr))` }}>
              <div className="mobile-time-label"><Clock3 size={15} /></div>
              {rows.map((row, index) => (
                <div className={`mobile-city-head ${index === 0 ? 'reference-head' : ''}`} key={row.id}>
                  <CityInfo row={row} index={index} mobile onPromote={onPromote} />
                  <button aria-label={`Remove ${row.name}`} onClick={() => onRemove(row.id)}><X size={12} /></button>
                </div>
              ))}
              {HOURS.map(hour => (
                <div className="mobile-hour-row" key={hour}>
                  <span className="mobile-axis">{settings.format === '24' ? String(hour).padStart(2, '0') : `${hour % 12 || 12}${hour < 12 ? 'a' : 'p'}`}</span>
                  {rows.map(row => <HourCell key={row.id} row={row} hour={hour} settings={settings}
                    cityCount={rows.length} hovered={hover === hour} onHover={setHover} />)}
                </div>
              ))}
            </div>
          </div>
        </>
      ) : (
        <div className="empty-state">
          <Globe2 size={36} /><h3>Your world starts with a city.</h3>
          <p>Add your first city to start finding time in common.</p>
          <button onClick={onRestore}>Use the default cities <ArrowRight size={14} /></button>
        </div>
      )}
      <div className="grid-footer">
        <div className="legend">
          <span><i className="legend-overlap" />Overlap</span>
          <span><i className="legend-awake" />Awake</span>
          <span><i className="legend-asleep" />Sleeping</span>
        </div>
        <span className="reference-note"><Info size={13} />{reference ? `24 hours in ${reference.name} time` : 'Add a city to get started'}</span>
      </div>
    </>
  );
}
