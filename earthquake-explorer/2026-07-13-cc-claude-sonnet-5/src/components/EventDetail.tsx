import { useEffect, useRef } from "react";
import type { EarthquakeEvent } from "../types/earthquake";
import { MagnitudeBadge } from "./MagnitudeBadge";
import { AlertBadge, DepthBadge, ReviewStatusBadge, TsunamiBadge } from "./Badges";
import {
  ALERT_LABEL,
  classifyDepth,
  classifyMagnitude,
  formatCoordinates,
  formatDepth,
  formatLocalDateTime,
  formatMagnitude,
  formatRelativeTime,
  formatSignificance,
  formatUtc,
} from "../lib/format";

export interface EventDetailProps {
  event: EarthquakeEvent;
  nowMs: number;
  onBack: () => void;
  onClose: () => void;
  backLabel: string;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-[11px] font-medium uppercase tracking-wide text-ink-400">{label}</dt>
      <dd className="tnum mt-0.5 text-[13.5px] text-ink-50">{children}</dd>
    </div>
  );
}

export function EventDetail({ event, nowMs, onBack, onClose, backLabel }: EventDetailProps) {
  const magClass = classifyMagnitude(event.magnitude);
  const depthClass = classifyDepth(event.depthKm);
  const headingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    headingRef.current?.focus();
  }, [event.id]);

  return (
    <div className="flex h-full flex-col overflow-y-auto" aria-labelledby="event-detail-heading">
      <div className="flex items-center justify-between border-b border-ink-800 px-4 py-3">
        <button
          type="button"
          onClick={onBack}
          className="flex min-h-11 items-center gap-1.5 rounded-md px-2 text-[13px] font-medium text-ink-300 hover:text-ink-50"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          {backLabel}
        </button>
        <button
          type="button"
          onClick={onClose}
          className="flex h-11 w-11 items-center justify-center rounded-md text-ink-300 hover:text-ink-50 lg:hidden"
          aria-label="Close details"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
          </svg>
        </button>
      </div>

      <div className="px-4 py-4">
        <div className="flex items-start gap-3">
          <MagnitudeBadge magnitude={event.magnitude} size="lg" />
          <div className="min-w-0">
            <h2
              id="event-detail-heading"
              ref={headingRef}
              tabIndex={-1}
              className="text-[17px] font-semibold leading-tight text-ink-50 outline-none"
            >
              {event.place}
            </h2>
            <p className="mt-1 text-[12.5px] text-ink-300">
              {magClass.label} earthquake · {formatRelativeTime(event.timeMs, nowMs)}
            </p>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap gap-1.5">
          <AlertBadge alert={event.alert} />
          <TsunamiBadge tsunami={event.tsunami} />
          <DepthBadge depthKm={event.depthKm} />
          <ReviewStatusBadge status={event.status} />
        </div>

        <p className="mt-3 rounded-md border border-ink-700 bg-ink-900/60 p-2.5 text-[12px] leading-relaxed text-ink-300">
          {magClass.description}
        </p>

        <dl className="mt-5 grid grid-cols-2 gap-x-4 gap-y-4">
          <Field label="Local time">{formatLocalDateTime(event.timeMs)}</Field>
          <Field label="Universal time">{formatUtc(event.timeMs)}</Field>
          <Field label="Depth">
            {formatDepth(event.depthKm)}
            <span className="block text-[11px] font-normal text-ink-400">{depthClass.description}</span>
          </Field>
          <Field label="Coordinates">{formatCoordinates(event.latitude, event.longitude)}</Field>
          <Field label="Significance">
            {formatSignificance(event.significance)}
            <span className="block text-[11px] font-normal text-ink-400">USGS composite score of size, reach and impact</span>
          </Field>
          <Field label="Magnitude type">{event.magType ?? "Not reported"}</Field>
          <Field label="Felt reports">
            {event.felt !== null ? `${event.felt.toLocaleString()} people` : "None submitted"}
          </Field>
          <Field label="Reported intensity">
            {event.cdi !== null ? `${event.cdi.toFixed(1)} CDI` : event.mmi !== null ? `${event.mmi.toFixed(1)} MMI` : "Not available"}
          </Field>
          {event.alert && <Field label="Alert level">{ALERT_LABEL[event.alert]}</Field>}
          <Field label="Last updated">{formatRelativeTime(event.updatedMs, nowMs)}</Field>
          {event.gap !== null && (
            <Field label="Azimuthal gap">
              {event.gap.toFixed(0)}°
              <span className="block text-[11px] font-normal text-ink-400">Lower is a more reliable location</span>
            </Field>
          )}
          {event.nst !== null && <Field label="Reporting stations">{event.nst}</Field>}
        </dl>

        <details className="mt-5 rounded-md border border-ink-700 p-3">
          <summary className="cursor-pointer text-[12.5px] font-medium text-ink-100">What do these terms mean?</summary>
          <dl className="mt-2 space-y-2 text-[12px] leading-relaxed text-ink-300">
            <div>
              <dt className="font-medium text-ink-100">Magnitude (M{formatMagnitude(event.magnitude)})</dt>
              <dd>A logarithmic measure of the energy released. It does not by itself predict damage — depth, distance, and local building conditions matter just as much.</dd>
            </div>
            <div>
              <dt className="font-medium text-ink-100">Depth</dt>
              <dd>How far below the surface the rupture started. Shallow events are often felt more strongly even at a lower magnitude.</dd>
            </div>
            <div>
              <dt className="font-medium text-ink-100">Significance</dt>
              <dd>A 0–1000+ USGS score combining magnitude, felt reports, and other factors to flag events worth a closer look.</dd>
            </div>
            <div>
              <dt className="font-medium text-ink-100">Alert level</dt>
              <dd>PAGER economic/casualty impact estimate. Only computed for a subset of significant events.</dd>
            </div>
          </dl>
        </details>

        <div className="mt-5 space-y-2">
          <a
            href={event.url}
            target="_blank"
            rel="noreferrer"
            className="flex min-h-11 items-center justify-center gap-2 rounded-md border border-ink-600 bg-ink-850 px-4 text-[13px] font-medium text-ink-50 hover:border-accent hover:text-accent"
          >
            View official USGS event page
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M7 17L17 7M9 7h8v8" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </a>
          <p className="px-1 text-[11px] leading-relaxed text-ink-500">
            Data from the U.S. Geological Survey and may be revised as review continues. This tool is for exploration only —
            it is not an emergency alert service and cannot predict earthquakes. For safety guidance, contact your local
            emergency authorities.
          </p>
        </div>
      </div>
    </div>
  );
}
