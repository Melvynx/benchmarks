import type { CellState, TimeFormat } from "../types";
import { formatClock, formatClockParts } from "../lib/format";

const STATE_LABEL: Record<CellState, string> = {
  sleep: "asleep",
  awake: "awake",
  overlap: "overlap",
};

type Props = {
  hour: number;
  minute: number;
  state: CellState;
  format: TimeFormat;
  cityName: string;
  now: boolean;
  referenceHour: number;
};

export function HourCell({ hour, minute, state, format, cityName, now, referenceHour }: Props) {
  const label = formatClock(hour, minute, format);
  const parts = formatClockParts(hour, minute, format);
  return (
    <td
      className={["cell", state, now ? "is-now" : ""].filter(Boolean).join(" ")}
      data-state={state}
      data-hour={referenceHour}
      aria-label={`${label} in ${cityName}, ${STATE_LABEL[state]}`}
    >
      <span className="cell-hour">{parts.primary}</span>
      {parts.secondary ? <span className="cell-suffix">{parts.secondary}</span> : null}
    </td>
  );
}
