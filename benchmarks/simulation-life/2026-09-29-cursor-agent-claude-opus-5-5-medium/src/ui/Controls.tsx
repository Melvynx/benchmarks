import { PARAM_GROUPS, PRESETS, type ParamKey, type ParamMeta, type Params } from "../sim/params";

interface Props {
  params: Params;
  applied: Params;
  activePreset: string | null;
  onChange: (key: ParamKey, value: number) => void;
  onPreset: (id: string) => void;
  onApply: () => void;
}

function fmt(meta: ParamMeta, v: number) {
  if (meta.format) return meta.format(v);
  const decimals = meta.step >= 1 ? 0 : meta.step >= 0.1 ? 1 : 2;
  return `${v.toFixed(decimals)}${meta.unit ? ` ${meta.unit}` : ""}`;
}

function Slider({ meta, value, pending, accent, onChange }: { meta: ParamMeta; value: number; pending: boolean; accent: string; onChange: (v: number) => void }) {
  const pct = ((value - meta.min) / (meta.max - meta.min)) * 100;
  return (
    <label className={`slider ${pending ? "is-pending" : ""}`} title={meta.hint}>
      <div className="slider-top">
        <span className="slider-label">{meta.label}</span>
        <span className="slider-value">{fmt(meta, value)}</span>
      </div>
      <input
        type="range"
        min={meta.min}
        max={meta.max}
        step={meta.step}
        value={value}
        style={{ "--pct": `${pct}%`, "--accent": accent } as React.CSSProperties}
        onChange={(e) => onChange(Number(e.target.value))}
      />
      {meta.hint && <span className="slider-hint">{meta.hint}</span>}
    </label>
  );
}

export function Controls({ params, applied, activePreset, onChange, onPreset, onApply }: Props) {
  const pendingKeys = PARAM_GROUPS.flatMap((g) => g.params.filter((m) => m.onReset && params[m.key] !== applied[m.key]).map((m) => m.key));
  return (
    <div className="controls">
      <section className="panel-section">
        <h2 className="panel-title">Gardens</h2>
        <div className="presets">
          {PRESETS.map((p) => (
            <button key={p.id} className={`preset ${activePreset === p.id ? "is-active" : ""}`} onClick={() => onPreset(p.id)}>
              <span className="preset-emoji">{p.emoji}</span>
              <span className="preset-text">
                <strong>{p.name}</strong>
                <small>{p.blurb}</small>
              </span>
            </button>
          ))}
        </div>
      </section>

      {PARAM_GROUPS.map((g) => {
        const groupPending = g.params.some((m) => pendingKeys.includes(m.key));
        return (
          <section className="panel-section" key={g.id}>
            <h2 className="panel-title">
              <span className="dot" style={{ background: g.accent }} />
              {g.title}
              {g.id === "world" && <span className="tag">applies on restart</span>}
              {g.id !== "world" && <span className="tag tag-live">live</span>}
            </h2>
            {g.params.map((m) => (
              <Slider key={m.key} meta={m} value={params[m.key]} accent={g.accent} pending={pendingKeys.includes(m.key)} onChange={(v) => onChange(m.key, v)} />
            ))}
            {groupPending && (
              <button className="btn btn-apply" onClick={onApply}>
                ↻ Restart with new world
              </button>
            )}
          </section>
        );
      })}
    </div>
  );
}
