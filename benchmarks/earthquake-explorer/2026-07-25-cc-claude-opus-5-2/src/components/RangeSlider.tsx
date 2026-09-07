import { useId } from "react";

export interface RangeSliderProps {
  label: string;
  min: number;
  max: number;
  step: number;
  value: [number, number];
  onChange: (value: [number, number]) => void;
  /** Renders the numeric read-out, e.g. "M 2.5 – 10". */
  format: (value: number) => string;
  /** Optional gradient painted behind the track to preview the colour ramp. */
  trackBackground?: string;
}

/**
 * Two stacked native range inputs. Keeps full keyboard and screen-reader
 * support, which a div-based slider would have to reimplement badly.
 */
export function RangeSlider({
  label,
  min,
  max,
  step,
  value,
  onChange,
  format,
  trackBackground,
}: RangeSliderProps) {
  const id = useId();
  const [low, high] = value;
  const span = max - min || 1;
  const leftPct = ((low - min) / span) * 100;
  const rightPct = ((high - min) / span) * 100;

  return (
    <div className="range">
      <div className="range-head">
        <label className="control-label" htmlFor={`${id}-low`}>
          {label}
        </label>
        <output className="range-value">
          {format(low)} – {format(high)}
        </output>
      </div>

      <div className="range-track-wrap">
        <div
          className="range-track"
          style={trackBackground ? { backgroundImage: trackBackground } : undefined}
        />
        <div className="range-fill" style={{ left: `${leftPct}%`, right: `${100 - rightPct}%` }} />

        <input
          id={`${id}-low`}
          className="range-input range-input-low"
          type="range"
          min={min}
          max={max}
          step={step}
          value={low}
          aria-label={`${label}, minimum`}
          onChange={(e) => onChange([Math.min(Number(e.target.value), high), high])}
        />
        <input
          id={`${id}-high`}
          className="range-input range-input-high"
          type="range"
          min={min}
          max={max}
          step={step}
          value={high}
          aria-label={`${label}, maximum`}
          onChange={(e) => onChange([low, Math.max(Number(e.target.value), low)])}
        />
      </div>
    </div>
  );
}
