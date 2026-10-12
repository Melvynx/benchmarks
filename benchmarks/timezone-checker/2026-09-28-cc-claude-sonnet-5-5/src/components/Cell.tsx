import { formatCell, type CityView, type HourFormat } from "../lib/time";

export function Cell({ cell, format }: { cell: CityView["cells"][number]; format: HourFormat }) {
  const { main, sub } = formatCell(cell.local, format);
  const state = cell.overlap ? "overlap" : cell.awake ? "awake" : "asleep";
  return (
    <div className={`cell ${state}`} title={`${main}${sub} — ${state === "asleep" ? "sleeping" : state === "awake" ? "awake" : "overlap"}`}>
      <span className={main.includes(":") ? "cell-main frac" : "cell-main"}>{main}</span>
      {sub && <span className="cell-sub">{sub}</span>}
    </div>
  );
}
