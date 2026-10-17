import { memo, type CSSProperties } from "react";
import type { Engine } from "../engine";
import {
  DEFAULT_PARAMS,
  PARAM_SPECS,
  PRESETS,
  type ParamGroup,
  type ParamKey,
  type ParamSpec,
  type Params,
} from "../sim/params";
import { ChevronIcon, DiceIcon } from "./icons";

const GROUPS: { id: ParamGroup; title: string; tone: string; note: string }[] = [
  { id: "garden", title: "Fruit trees", tone: "green", note: "Live: changes apply right away" },
  { id: "blue", title: "Blue blobs", tone: "blue", note: "Eat fruit · flee reds · hide under trees" },
  { id: "red", title: "Red blobs", tone: "red", note: "Boop blues · slow down when hungry" },
  { id: "start", title: "New garden", tone: "sand", note: "Applied when you press Reset" },
];

const PRESET_DOTS: Record<string, [number, number, number]> = {
  balanced: [3, 3, 2],
  rich: [5, 4, 3],
  redheavy: [3, 2, 4],
  fragile: [3, 3, 3],
  lowfruit: [1, 2, 1],
  meadow: [3, 5, 0],
};

interface Props {
  engine: Engine;
  params: Params;
  presetId: string | null;
  /** Comma-joined reset-only keys, a string so memo can compare by value. */
  pending: string;
}

export const ControlPanel = memo(function ControlPanel({ engine, params, presetId, pending: pendingKey }: Props) {
  const active = PRESETS.find((p) => p.id === presetId);
  const pending = pendingKey ? (pendingKey.split(",") as ParamKey[]) : [];
  return (
    <aside className="panel" aria-label="Garden controls">
      <section className="card presets">
        <div className="card-head">
          <h2>Presets</h2>
          <span className="muted small">Each one plants a fresh garden</span>
        </div>
        <div className="preset-grid">
          {PRESETS.map((p) => (
            <button
              key={p.id}
              type="button"
              className={`preset ${p.id === presetId ? "active" : ""}`}
              onClick={() => engine.applyPreset(p.id)}
              title={p.blurb}
            >
              <span className="preset-dots" aria-hidden>
                {(["fruit", "blue", "red"] as const).map((k, i) => (
                  <span key={k} className={`pd pd-${k}`} style={{ "--n": PRESET_DOTS[p.id][i] } as CSSProperties} />
                ))}
              </span>
              <span className="preset-name">{p.name.replace(/ garden$/, "")}</span>
            </button>
          ))}
        </div>
        <p className="preset-blurb">{active ? active.blurb : "Custom settings. Tweak away, or pick a preset to start over."}</p>
      </section>

      {GROUPS.map((g) => (
        <details key={g.id} className={`card group tone-${g.tone}`} open>
          <summary>
            <span className="group-dot" aria-hidden />
            <span className="group-title">{g.title}</span>
            <span className="group-note">{g.note}</span>
            <ChevronIcon className="chev" />
          </summary>
          <div className="group-body">
            {PARAM_SPECS.filter((s) => s.group === g.id).map((s) =>
              s.key === "seed" ? (
                <SeedField key={s.key} engine={engine} value={params.seed} pending={pending.includes("seed")} />
              ) : (
                <Slider
                  key={s.key}
                  spec={s}
                  value={params[s.key]}
                  pending={pending.includes(s.key)}
                  onChange={(v) => engine.setParam(s.key, v)}
                />
              ),
            )}
          </div>
        </details>
      ))}
    </aside>
  );
});

function Slider({
  spec,
  value,
  pending,
  onChange,
}: {
  spec: ParamSpec;
  value: number;
  pending: boolean;
  onChange: (v: number) => void;
}) {
  const pct = ((value - spec.min) / (spec.max - spec.min)) * 100;
  const def = DEFAULT_PARAMS[spec.key];
  const modified = Math.abs(value - def) > spec.step / 2;
  const id = `p-${spec.key}`;
  return (
    <div className={`slider ${pending ? "pending" : ""}`}>
      <div className="slider-top">
        <label htmlFor={id}>{spec.label}</label>
        {modified && (
          <button
            type="button"
            className="restore"
            onClick={() => onChange(def)}
            title={`Back to default (${spec.format(def)})`}
            aria-label={`Restore ${spec.label} default`}
          />
        )}
        <span className="value">{spec.format(value)}</span>
      </div>
      <input
        id={id}
        type="range"
        min={spec.min}
        max={spec.max}
        step={spec.step}
        value={value}
        style={{ "--pct": `${pct}%` } as CSSProperties}
        onChange={(e) => onChange(Number(e.target.value))}
      />
      <div className="hint">
        {spec.hint}
        {pending && <span className="pending-tag">reset to apply</span>}
      </div>
    </div>
  );
}

function SeedField({ engine, value, pending }: { engine: Engine; value: number; pending: boolean }) {
  return (
    <div className={`slider seed ${pending ? "pending" : ""}`}>
      <div className="slider-top">
        <label htmlFor="p-seed">Random seed</label>
      </div>
      <div className="seed-row">
        <input
          id="p-seed"
          type="number"
          min={1}
          max={999999}
          value={value}
          onChange={(e) => engine.setParam("seed", Number(e.target.value) || 1)}
        />
        <button type="button" className="btn ghost" onClick={() => engine.newSeed()} title="New seed and reset">
          <DiceIcon /> New seed
        </button>
      </div>
      <div className="hint">
        Same seed + same settings = same story
        {pending && <span className="pending-tag">reset to apply</span>}
      </div>
    </div>
  );
}
