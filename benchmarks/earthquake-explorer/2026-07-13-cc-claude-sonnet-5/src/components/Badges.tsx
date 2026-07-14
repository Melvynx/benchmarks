import { ALERT_LABEL, classifyDepth } from "../lib/format";
import type { UsgsAlertLevel, UsgsReviewStatus } from "../types/earthquake";

const ALERT_DOT: Record<UsgsAlertLevel, string> = {
  green: "bg-alert-green",
  yellow: "bg-alert-yellow",
  orange: "bg-alert-orange",
  red: "bg-alert-red",
};

export function AlertBadge({ alert }: { alert: UsgsAlertLevel | null }) {
  if (!alert) return null;
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full border border-ink-600 bg-ink-850 px-2 py-0.5 text-[11px] font-medium uppercase tracking-wide text-ink-100"
      title={ALERT_LABEL[alert]}
    >
      <span className={`h-2 w-2 rounded-full ${ALERT_DOT[alert]}`} aria-hidden="true" />
      {alert} alert
    </span>
  );
}

export function TsunamiBadge({ tsunami }: { tsunami: boolean }) {
  if (!tsunami) return null;
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full border border-deep/60 bg-deep/15 px-2 py-0.5 text-[11px] font-medium uppercase tracking-wide text-ink-100"
      title="USGS issued tsunami information for this event"
    >
      <svg aria-hidden="true" width="11" height="11" viewBox="0 0 24 24" fill="none">
        <path d="M2 17c2-2 4-2 6 0s4 2 6 0 4-2 6 0" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
        <path d="M2 11c2-2 4-2 6 0s4 2 6 0 4-2 6 0" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" opacity="0.5" />
      </svg>
      Tsunami
    </span>
  );
}

const STATUS_LABEL: Record<UsgsReviewStatus, string> = {
  automatic: "Automatic",
  reviewed: "Reviewed",
  deleted: "Deleted",
};

export function ReviewStatusBadge({ status }: { status: UsgsReviewStatus }) {
  const reviewed = status === "reviewed";
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] font-medium uppercase tracking-wide ${
        reviewed ? "border-ink-500 text-ink-100" : "border-dashed border-ink-600 text-ink-300"
      }`}
      title={reviewed ? "Reviewed by a seismologist" : "Automatically generated; not yet reviewed by a person"}
    >
      {STATUS_LABEL[status]}
    </span>
  );
}

export function DepthBadge({ depthKm }: { depthKm: number | null }) {
  const cls = classifyDepth(depthKm);
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full border border-ink-600 px-2 py-0.5 text-[11px] font-medium uppercase tracking-wide text-ink-100"
      title={cls.description}
    >
      {cls.label} depth
    </span>
  );
}
