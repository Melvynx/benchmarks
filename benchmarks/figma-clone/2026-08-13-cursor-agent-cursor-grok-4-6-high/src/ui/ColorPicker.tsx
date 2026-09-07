import { colorToCss, colorToHex, hslToRgb, parseHex, rgbToHsl } from "../core/color";
import { rememberColor } from "../core/store";
import type { Color } from "../core/types";
import { useEditor } from "./use-editor";

export function ColorPicker({
  value,
  onChange,
}: {
  value: Color;
  onChange: (c: Color) => void;
}) {
  const recent = useEditor((s) => s.recentColors);
  const hsl = rgbToHsl(value);
  const hex = colorToHex(value);

  return (
    <div>
      <div className="swatch" style={{ background: colorToCss(value) }} />
      <div className="field" style={{ marginTop: 6 }}>
        <label>Hex</label>
        <input
          value={hex}
          onChange={(e) => {
            const c = parseHex(e.target.value);
            if (c) {
              onChange(c);
              rememberColor(c);
            }
          }}
        />
      </div>
      <div className="row3">
        <Num label="H" value={Math.round(hsl.h)} min={0} max={360} onChange={(h) => onChange(hslToRgb(h, hsl.s, hsl.l, value.a))} />
        <Num label="S" value={Math.round(hsl.s * 100)} min={0} max={100} onChange={(s) => onChange(hslToRgb(hsl.h, s / 100, hsl.l, value.a))} />
        <Num label="L" value={Math.round(hsl.l * 100)} min={0} max={100} onChange={(l) => onChange(hslToRgb(hsl.h, hsl.s, l / 100, value.a))} />
      </div>
      <input
        className="hue-range"
        type="range"
        min={0}
        max={360}
        value={hsl.h}
        onChange={(e) => onChange(hslToRgb(Number(e.target.value), hsl.s, hsl.l, value.a))}
      />
      <button
        className="btn"
        style={{ marginTop: 6, width: "100%" }}
        onClick={async () => {
          const Eye = (window as Window & { EyeDropper?: new () => { open: () => Promise<{ sRGBHex: string }> } }).EyeDropper;
          if (!Eye) return;
          const res = await new Eye().open();
          const c = parseHex(res.sRGBHex);
          if (c) {
            onChange(c);
            rememberColor(c);
          }
        }}
      >
        Eyedropper
      </button>
      <div className="recent">
        {recent.map((c, i) => (
          <button
            key={i}
            style={{ background: colorToCss(c) }}
            onClick={() => onChange(c)}
            aria-label={colorToHex(c)}
          />
        ))}
      </div>
    </div>
  );
}

function Num({
  label,
  value,
  min,
  max,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (n: number) => void;
}) {
  return (
    <div className="field">
      <label>{label}</label>
      <input type="number" min={min} max={max} value={value} onChange={(e) => onChange(Number(e.target.value))} />
    </div>
  );
}
