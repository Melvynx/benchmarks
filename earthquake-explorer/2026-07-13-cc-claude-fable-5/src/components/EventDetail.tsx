import type { Quake } from "../types";
import {
  DEPTH_BAND_LABEL,
  depthBandOf,
  formatCoords,
  formatDepth,
  formatFullLocal,
  formatMag,
  formatUtc,
  magBand,
  relativeTime,
  significanceNote,
} from "../lib/quake";

const ALERT_EXPLAIN: Record<string, string> = {
  green: "USGS PAGER estimates little to no impact from shaking.",
  yellow: "USGS PAGER estimates localized impact is possible.",
  orange: "USGS PAGER estimates significant regional impact is possible.",
  red: "USGS PAGER estimates major impact is possible. Follow local authorities.",
};

type Props = {
  quake: Quake;
  now: number;
  onBack: () => void;
  onLocate: () => void;
};

function Row({ label, children, hint }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="detail-row">
      <dt>
        {label}
        {hint && (
          <button type="button" className="hint" aria-label={`What does ${label.toLowerCase()} mean?`}>
            ?<span role="tooltip" className="hint-pop">{hint}</span>
          </button>
        )}
      </dt>
      <dd>{children}</dd>
    </div>
  );
}

export function EventDetail({ quake: q, now, onBack, onLocate }: Props) {
  const band = magBand(q.mag);
  const note = significanceNote(q);
  const depthBand = depthBandOf(q.depth);

  return (
    <article className="detail" aria-label={`Event detail: ${q.title}`}>
      <div className="detail-top">
        <button type="button" className="btn-ghost" onClick={onBack}>
          <span aria-hidden="true">←</span> Back to stream
        </button>
        <button type="button" className="btn-ghost" onClick={onLocate}>
          Center on map
        </button>
      </div>

      <header className="detail-head">
        <div className={`detail-mag band-${band}`}>
          <span className="detail-mag-value mono">{formatMag(q.mag)}</span>
          <span className="detail-mag-label">magnitude</span>
        </div>
        <div>
          <h2 className="detail-place">{q.place ?? q.title}</h2>
          <p className="detail-when mono">
            {relativeTime(q.time, now)} · {formatFullLocal(q.time)}
          </p>
          <p className="detail-when mono detail-utc">{formatUtc(q.time)}</p>
        </div>
      </header>

      <p className={`detail-note tone-${note.tone}`}>{note.label}</p>
      {(q.alert === "orange" || q.alert === "red" || q.tsunami) && (
        <p className="detail-safety">
          For safety guidance, rely on local authorities and the official USGS event page — not this
          explorer.
        </p>
      )}

      <dl className="detail-grid">
        <Row
          label="Depth"
          hint="Distance below the surface. Shallow events (under 70 km) are usually felt more strongly at the surface than deep ones of the same magnitude."
        >
          {q.depth != null ? (
            <>
              <span className="mono">{formatDepth(q.depth, 1)} km</span>
              {depthBand && <span className="dd-sub">{DEPTH_BAND_LABEL[depthBand]}</span>}
            </>
          ) : (
            <span className="dd-missing">Not yet determined</span>
          )}
        </Row>
        <Row
          label="Significance"
          hint="A USGS score (0–1000+) combining magnitude, felt reports and estimated impact. Higher means more noteworthy — it is not a damage measurement."
        >
          {q.sig != null ? <span className="mono">{q.sig}</span> : <span className="dd-missing">Not available</span>}
        </Row>
        <Row label="Felt reports" hint="How many people told USGS they felt this event, via the “Did You Feel It?” program.">
          {q.felt != null && q.felt > 0 ? (
            <span className="mono">{q.felt.toLocaleString("en-US")}</span>
          ) : (
            <span className="dd-missing">None reported</span>
          )}
        </Row>
        <Row
          label="PAGER alert"
          hint="USGS PAGER estimates the humanitarian impact of shaking: green, yellow, orange or red. Not every event receives an assessment."
        >
          {q.alert ? (
            <>
              <span className={`tag tag-alert-${q.alert}`}>{q.alert}</span>
              <span className="dd-sub">{ALERT_EXPLAIN[q.alert]}</span>
            </>
          ) : (
            <span className="dd-missing">Not assessed</span>
          )}
        </Row>
        <Row label="Tsunami" hint="Flags whether USGS points to tsunami information for this event. It is not itself a warning — check official tsunami centers.">
          {q.tsunami ? (
            <>
              <span className="tag tag-tsunami">tsunami info issued</span>
              <span className="dd-sub">See tsunami.gov or your local authority for the actual advisory status.</span>
            </>
          ) : (
            "No tsunami information"
          )}
        </Row>
        <Row label="Review status" hint="Automatic solutions come straight from instruments; reviewed ones have been checked by a seismologist and may be revised.">
          {q.status === "reviewed" ? "Reviewed by a seismologist" : q.status ? "Automatic (preliminary)" : <span className="dd-missing">Unknown</span>}
        </Row>
        <Row label="Coordinates">
          <span className="mono">{formatCoords(q.lat, q.lon)}</span>
        </Row>
        <Row label="Event type">{q.type.replace(/_/g, " ")}</Row>
        <Row label="Last updated by USGS">
          <span className="mono">{relativeTime(q.updated, now)}</span>
        </Row>
        <Row label="Event ID">
          <span className="mono">{q.id}</span>
        </Row>
      </dl>

      {q.url && (
        <a className="detail-usgs" href={q.url} target="_blank" rel="noopener noreferrer">
          Official USGS event page <span aria-hidden="true">↗</span>
        </a>
      )}
      <p className="detail-caveat">
        Magnitude alone does not predict damage — depth, distance, geology and construction all matter.
        Data may be revised as USGS reviews the event.
      </p>
    </article>
  );
}
