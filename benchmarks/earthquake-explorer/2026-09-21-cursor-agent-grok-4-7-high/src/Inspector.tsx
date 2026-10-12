import {
  depthZone,
  feltLabel,
  formatCoord,
  formatDepth,
  formatStamp,
  formatStampUtc,
  intensityLabel,
  magTypeLabel,
  significance,
  statusLabel,
} from './format';
import { magBand, magColor } from './magnitude';
import type { Quake } from './types';

type InspectorProps = {
  quake: Quake;
  onClose: () => void;
};

function Fact({ label, value, wide = false }: { label: string; value: string; wide?: boolean }) {
  return (
    <div className={wide ? 'span2' : undefined}>
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}

export function Inspector({ quake, onClose }: InspectorProps) {
  const band = magBand(quake.mag);
  const zone = depthZone(quake.depth);
  const depthPct = Math.max(0, Math.min(100, (Math.max(0, quake.depth) / 700) * 100));
  const color = magColor(quake.mag);

  return (
    <aside className="inspector" aria-label="Earthquake detail">
      <div className="inspector-top">
        <p className="inspector-kicker">Selected event</p>
        <button type="button" className="text-btn" onClick={onClose}>
          Close
        </button>
      </div>
      <div className="inspector-hero">
        <p className="inspector-mag" style={{ color }}>
          {quake.mag.toFixed(1)}
        </p>
        <div>
          <p className="inspector-band" style={{ color }}>
            {band.label}
          </p>
          <p className="inspector-sub">
            {magTypeLabel(quake.magType)} · {statusLabel(quake.status)}
          </p>
        </div>
      </div>
      <p className="inspector-place">{quake.place}</p>
      <p className="inspector-time">{formatStamp(quake.time)}</p>
      <p className="inspector-time">{formatStampUtc(quake.time)}</p>
      {quake.type !== 'earthquake' ? <p className="kind">{quake.type}</p> : null}
      {quake.tsunami ? <p className="flag">USGS tsunami flag is set for this event.</p> : null}
      {quake.alert ? <p className={`pager pager-${quake.alert}`}>PAGER alert {quake.alert}</p> : null}
      <div className="depth-block">
        <div>
          <p className="depth-k">Depth</p>
          <p className="depth-v">{formatDepth(quake.depth)}</p>
          <p className="depth-note">
            {zone.label}. {zone.note}
          </p>
        </div>
        <div className="well" aria-hidden="true">
          <div className="well-track">
            <span className="well-mark" style={{ top: `calc(${depthPct}% - 1px)` }} />
          </div>
          <div className="well-labels">
            <span>surface</span>
            <span>700 km</span>
          </div>
        </div>
      </div>
      <dl className="facts">
        <Fact label="Coordinates" value={formatCoord(quake.lat, quake.lon)} wide />
        <Fact label="Significance" value={`${quake.sig.toLocaleString()} · ${significance(quake.sig)}`} />
        <Fact label="Felt reports" value={feltLabel(quake.felt)} />
        <Fact label="Community intensity" value={intensityLabel(quake.cdi)} wide />
        {quake.mmi !== null ? <Fact label="ShakeMap intensity" value={intensityLabel(quake.mmi)} /> : null}
        {quake.nst !== null ? <Fact label="Stations" value={quake.nst.toLocaleString()} /> : null}
        {quake.gap !== null ? <Fact label="Azimuthal gap" value={`${Math.round(quake.gap)}°`} /> : null}
        {quake.rms !== null ? <Fact label="RMS residual" value={`${quake.rms.toFixed(2)} s`} /> : null}
        {quake.dmin !== null ? <Fact label="Nearest station" value={`${quake.dmin.toFixed(2)}°`} /> : null}
      </dl>
      <a className="usgs" href={quake.url} target="_blank" rel="noopener noreferrer">
        USGS event page
      </a>
    </aside>
  );
}
