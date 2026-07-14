import type { EarthquakeEvent } from "../types/earthquake";

export interface ActivityAssessment {
  level: "quiet" | "ordinary" | "notable" | "concerning";
  label: string;
  description: string;
}

/**
 * A heuristic read on the currently loaded dataset, built only from USGS-provided
 * signals (alert level and significance) — never a fabricated baseline.
 */
export function assessActivity(events: EarthquakeEvent[]): ActivityAssessment {
  const hasRedOrange = events.some((e) => e.alert === "red" || e.alert === "orange");
  const hasHighSig = events.some((e) => (e.significance ?? 0) >= 650 || (e.magnitude ?? 0) >= 6.5);
  const hasModerateSig = events.some((e) => (e.significance ?? 0) >= 400 || (e.magnitude ?? 0) >= 5.5 || e.alert === "yellow" || e.alert === "green");

  if (hasRedOrange || hasHighSig) {
    return {
      level: "concerning",
      label: "Elevated attention",
      description: "At least one event in this period carries a high USGS significance score or impact alert and deserves a closer look.",
    };
  }
  if (hasModerateSig) {
    return {
      level: "notable",
      label: "Notable activity",
      description: "This period includes at least one moderate-to-strong event worth reviewing.",
    };
  }
  if (events.length === 0) {
    return { level: "quiet", label: "No activity recorded", description: "USGS has not located any events matching the current filters." };
  }
  return {
    level: "ordinary",
    label: "Ordinary background activity",
    description: "Events in this period fall within routine, everyday seismic background levels.",
  };
}

export function strongestEvent(events: EarthquakeEvent[]): EarthquakeEvent | null {
  if (events.length === 0) return null;
  return events.reduce((best, e) => ((e.magnitude ?? -Infinity) > (best.magnitude ?? -Infinity) ? e : best));
}
