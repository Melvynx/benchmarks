import type { CatalogCity, SummaryEntry } from "@/lib/types";

type SummaryPanelProps = {
  mode: "meeting" | "base";
  referenceCity: CatalogCity;
  meetingSummary: SummaryEntry | null;
  perCitySummary: SummaryEntry[];
};

export function SummaryPanel({
  mode,
  referenceCity,
  meetingSummary,
  perCitySummary,
}: SummaryPanelProps) {
  return (
    <section className="summary-card">
      <div className="summary-header">
        <div>
          <p className="panel-kicker">Overlap Summary</p>
          <h2>{mode === "meeting" ? "Shared availability" : "Reference-based availability"}</h2>
        </div>
        <p className="summary-reference">All ranges shown in {referenceCity.name}</p>
      </div>

      {mode === "meeting" && meetingSummary ? (
        <div className="summary-line">
          <div>
            <strong>{meetingSummary.count} overlap hours</strong>
            {meetingSummary.count === 0 ? (
              <p className="summary-warning">No common awake hours across the selected cities.</p>
            ) : null}
          </div>
          <div className="range-list">
            {meetingSummary.ranges.length ? (
              meetingSummary.ranges.map((range) => (
                <span key={range} className="range-pill">
                  {range}
                </span>
              ))
            ) : (
              <span className="range-pill muted">No overlap</span>
            )}
          </div>
        </div>
      ) : null}

      {mode === "base" ? (
        <div className="summary-stack">
          {perCitySummary.map((entry) => (
            <div key={entry.cityId} className="summary-line">
              <div>
                <strong>{entry.cityName}</strong>
                <p className="summary-meta">{entry.count} overlap hours with the reference city.</p>
                {entry.count === 0 ? (
                  <p className="summary-warning">No shared awake hours for this pair.</p>
                ) : null}
              </div>
              <div className="range-list">
                {entry.ranges.length ? (
                  entry.ranges.map((range) => (
                    <span key={`${entry.cityId}-${range}`} className="range-pill">
                      {range}
                    </span>
                  ))
                ) : (
                  <span className="range-pill muted">No overlap</span>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : null}
    </section>
  );
}
