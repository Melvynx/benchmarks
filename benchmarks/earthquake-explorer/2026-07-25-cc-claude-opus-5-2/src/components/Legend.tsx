import { RAMPS, rampGradient, stopPositions, type ColorMode } from "../lib/color";

/**
 * The legend is generated from the same ramp definition that paints the map,
 * so a swatch can never disagree with a dot.
 */
export function Legend({ mode }: { mode: ColorMode }) {
  const ramp = RAMPS[mode];
  const positions = stopPositions(ramp);

  return (
    <div className="legend" aria-label={`Colour scale: ${ramp.name}`}>
      <div className="legend-head">
        <span className="legend-title">{ramp.name}</span>
        <span className="legend-unit">{ramp.unit}</span>
      </div>
      <div className="legend-bar" style={{ background: rampGradient(ramp) }} />
      <div className="legend-ticks">
        {ramp.stops.map((stop, i) =>
          stop.label ? (
            <span
              key={stop.at}
              className="legend-tick"
              style={{
                left: `${positions[i] * 100}%`,
                transform:
                  i === 0
                    ? "translateX(0)"
                    : i === ramp.stops.length - 1
                      ? "translateX(-100%)"
                      : "translateX(-50%)",
              }}
            >
              {stop.label}
            </span>
          ) : null,
        )}
      </div>
      <p className="legend-blurb">{ramp.blurb}</p>
      <div className="legend-size">
        <span className="legend-size-label">Dot size</span>
        <span className="legend-size-dots" aria-hidden="true">
          <i style={{ width: 5, height: 5 }} />
          <i style={{ width: 9, height: 9 }} />
          <i style={{ width: 15, height: 15 }} />
          <i style={{ width: 23, height: 23 }} />
        </span>
        <span className="legend-size-label">M1 → M7+</span>
      </div>
    </div>
  );
}
