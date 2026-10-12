import { localLabel, type CellInfo, type TimeFormat } from "../lib/time";

export function Cell({ cell, format }: { cell: CellInfo; format: TimeFormat }) {
  const state = cell.overlap ? "overlap" : cell.awake ? "awake" : "sleep";
  return (
    <div className={`cell ${state}`} data-state={state} title={`${localLabel(cell.localMinutes, format, false)} local`}>
      {localLabel(cell.localMinutes, format)}
    </div>
  );
}
