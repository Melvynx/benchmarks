import { classifyMagnitude, formatMagnitude } from "../lib/format";

const RING_COLOR: Record<string, string> = {
  micro: "border-ink-500 text-ink-300",
  minor: "border-ink-400 text-ink-100",
  light: "border-intermediate text-intermediate",
  moderate: "border-shallow text-shallow",
  strong: "border-alert-orange text-alert-orange",
  major: "border-alert-red text-alert-red",
  great: "border-alert-red text-alert-red",
};

export function MagnitudeBadge({ magnitude, size = "md" }: { magnitude: number | null; size?: "sm" | "md" | "lg" }) {
  const cls = classifyMagnitude(magnitude);
  const dims = size === "lg" ? "h-14 w-14 text-xl" : size === "sm" ? "h-8 w-8 text-xs" : "h-10 w-10 text-sm";
  return (
    <div
      className={`tnum flex ${dims} shrink-0 items-center justify-center rounded-full border-2 font-semibold ${RING_COLOR[cls.key]}`}
      title={`Magnitude ${formatMagnitude(magnitude)} — ${cls.label}: ${cls.description}`}
    >
      {formatMagnitude(magnitude)}
    </div>
  );
}

export function MagnitudeClassLabel({ magnitude }: { magnitude: number | null }) {
  const cls = classifyMagnitude(magnitude);
  return <span>{cls.label}</span>;
}
