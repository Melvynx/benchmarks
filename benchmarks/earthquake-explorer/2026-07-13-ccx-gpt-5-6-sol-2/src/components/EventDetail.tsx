import { useEffect, useRef } from 'react'
import { AlertTriangle, ArrowLeft, ExternalLink, Info, MapPin, Radio, Share2, Waves, X } from 'lucide-react'
import { depthClass, formatDateTime, formatDepth, formatMagnitude, formatRelativeTime, formatUtc, magnitudeLabel, significanceLabel } from '../lib/earthquakes'
import type { Earthquake } from '../types/earthquake'

interface EventDetailProps {
  event: Earthquake
  onClose: () => void
  onShare: () => void
}

function valueOrPending(value: number | null, suffix = ''): string {
  return value === null ? 'Not reported' : `${value.toLocaleString()}${suffix}`
}

export function EventDetail({ event, onClose, onShare }: EventDetailProps) {
  const depth = depthClass(event.depth)
  const detailRef = useRef<HTMLElement>(null)

  useEffect(() => {
    detailRef.current?.focus()
  }, [event.id])

  return (
    <aside ref={detailRef} className="detail" aria-labelledby="detail-title" tabIndex={-1}>
      <header className="detail__topbar">
        <button className="icon-button detail__back" type="button" onClick={onClose} aria-label="Return to earthquake overview"><ArrowLeft size={20} /></button>
        <span>Event dossier</span>
        <div className="detail__actions">
          <button className="icon-button" type="button" onClick={onShare} aria-label="Copy a link to this event"><Share2 size={18} /></button>
          <button className="icon-button detail__desktop-close" type="button" onClick={onClose} aria-label="Close event details"><X size={19} /></button>
        </div>
      </header>

      <div className="detail__hero">
        <div className={`detail__mag magnitude-${event.magnitude !== null && event.magnitude >= 6 ? 'major' : event.magnitude !== null && event.magnitude >= 5 ? 'strong' : event.magnitude !== null && event.magnitude >= 4 ? 'moderate' : 'minor'}`}>
          <span>M</span><strong>{formatMagnitude(event.magnitude)}</strong>
        </div>
        <div>
          <p className="eyebrow">{magnitudeLabel(event.magnitude)} · {significanceLabel(event.significance)}</p>
          <h2 id="detail-title">{event.place}</h2>
          <p className="detail__recency">Occurred {formatRelativeTime(event.time)}</p>
        </div>
      </div>

      <div className="detail__notice">
        <Info size={17} aria-hidden="true" />
        <p>Magnitude describes energy released, not expected damage. Impact depends on depth, distance, construction, and local conditions.</p>
      </div>

      <div className="detail__status-grid">
        <div><span>Alert level</span><strong className={event.alert ? `text-${event.alert}` : ''}>{event.alert ? `${event.alert[0].toUpperCase()}${event.alert.slice(1)}` : 'Not issued'}</strong></div>
        <div><span>Significance</span><strong>{event.significance}</strong></div>
        <div><span>Felt reports</span><strong>{valueOrPending(event.felt)}</strong></div>
        <div><span>Review</span><strong>{event.status === 'reviewed' ? 'Reviewed' : 'Automatic'}</strong></div>
      </div>

      {(event.alert || event.tsunami || event.status !== 'reviewed') && (
        <div className="detail__flags" aria-label="Event advisories">
          {event.alert && <span className={`status-tag status-tag--${event.alert}`}><AlertTriangle size={14} /> {event.alert} impact alert</span>}
          {event.tsunami && <span className="status-tag status-tag--tsunami"><Waves size={14} /> Tsunami flag in USGS record</span>}
          {event.status !== 'reviewed' && <span className="status-tag"><Radio size={14} /> Automatically located; values may change</span>}
        </div>
      )}

      <section className="detail__section" aria-labelledby="detail-time">
        <h3 id="detail-time">Time</h3>
        <dl className="detail__list">
          <div><dt>Your local time</dt><dd>{formatDateTime(event.time)}</dd></div>
          <div><dt>Universal time</dt><dd>{formatUtc(event.time)}</dd></div>
          <div><dt>USGS updated</dt><dd>{formatRelativeTime(event.updated)}</dd></div>
        </dl>
      </section>

      <section className="detail__section" aria-labelledby="detail-location">
        <h3 id="detail-location">Location &amp; depth</h3>
        <dl className="detail__list">
          <div><dt>Coordinates</dt><dd>{Math.abs(event.latitude).toFixed(3)}°{event.latitude >= 0 ? 'N' : 'S'}, {Math.abs(event.longitude).toFixed(3)}°{event.longitude >= 0 ? 'E' : 'W'}</dd></div>
          <div><dt>Depth</dt><dd>{formatDepth(event.depth)} · {depth[0].toUpperCase() + depth.slice(1)}</dd></div>
          <div><dt>Event type</dt><dd>{event.eventType}</dd></div>
          <div><dt>Network</dt><dd>{event.network.toUpperCase()} · {event.code}</dd></div>
        </dl>
      </section>

      {(event.cdi !== null || event.mmi !== null) && (
        <section className="detail__section" aria-labelledby="detail-intensity">
          <h3 id="detail-intensity">Reported intensity</h3>
          <dl className="detail__list">
            <div><dt>Community intensity (CDI)</dt><dd>{valueOrPending(event.cdi)}</dd></div>
            <div><dt>Estimated instrumental (MMI)</dt><dd>{valueOrPending(event.mmi)}</dd></div>
          </dl>
          <p className="detail__definition">Intensity describes observed or estimated shaking at locations; it is different from magnitude.</p>
        </section>
      )}

      <a className="detail__usgs-link" href={event.url} target="_blank" rel="noreferrer">
        <MapPin size={18} aria-hidden="true" />
        <span><strong>Open official USGS event page</strong><small>Authoritative details, revisions, and regional information</small></span>
        <ExternalLink size={17} aria-hidden="true" />
      </a>

      <p className="detail__disclaimer">Tectonic is an exploration tool, not an emergency alert service. Follow official local authorities for safety information.</p>
    </aside>
  )
}
