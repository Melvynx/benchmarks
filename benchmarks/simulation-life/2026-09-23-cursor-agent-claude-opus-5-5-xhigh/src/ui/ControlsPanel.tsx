import { memo, useId } from "react";
import {
  META_BY_KEY,
  PARAM_META,
  PRESETS,
  RULES,
  type ParamGroup,
  type ParamKey,
  type ParamMeta,
} from "../sim/params";
import { DiceIcon, InfoIcon, ResetIcon } from "./icons";
import { ctrl, shallowEqual, useSim } from "./sim";

const GROUPS: { id: ParamGroup; title: string; note?: string }[] = [
  { id: "garden", title: "Garden & fruit" },
  { id: "blue", title: "Blue blobs", note: "eat fruit" },
  { id: "red", title: "Red blobs", note: "draw energy from blue" },
  { id: "world", title: "World" },
];

const SLIDER_RES = 1000;

function toSlider(m: ParamMeta, v: number) {
  if (!m.log) return v;
  return (Math.log(v / m.min) / Math.log(m.max / m.min)) * SLIDER_RES;
}

function fromSlider(m: ParamMeta, s: number) {
  if (!m.log) return s;
  const v = m.min * Math.pow(m.max / m.min, s / SLIDER_RES);
  return Math.round(v / m.step) * m.step;
}

const Slider = memo(function Slider({ k, value, pending }: { k: ParamKey; value: number; pending: boolean }) {
  const m = META_BY_KEY[k];
  const id = useId();
  return (
    <div className={`slider ${pending ? "is-pending" : ""}`}>
      <div className="slider-top">
        <label htmlFor={id} className="slider-label">
          {m.label}
          <span className="help" tabIndex={0} aria-label={m.help}>
            <InfoIcon />
            <span className="tip" role="tooltip">
              {m.help}
            </span>
          </span>
          {m.resetOnly && <span className="tag">on reset</span>}
        </label>
        <output htmlFor={id} className="slider-value">
          {m.format(value)}
        </output>
      </div>
      <input
        id={id}
        type="range"
        className={`range range-${m.group}`}
        min={m.log ? 0 : m.min}
        max={m.log ? SLIDER_RES : m.max}
        step={m.log ? 1 : m.step}
        value={toSlider(m, value)}
        onChange={(e) => ctrl.setParam(k, fromSlider(m, Number(e.target.value)))}
        style={{ ["--fill" as string]: `${((toSlider(m, value) - (m.log ? 0 : m.min)) / ((m.log ? SLIDER_RES : m.max) - (m.log ? 0 : m.min))) * 100}%` }}
      />
    </div>
  );
});

function SeedField({ value, pending }: { value: number; pending: boolean }) {
  const id = useId();
  const m = META_BY_KEY.seed;
  return (
    <div className={`slider seed ${pending ? "is-pending" : ""}`}>
      <div className="slider-top">
        <label htmlFor={id} className="slider-label">
          Random seed
          <span className="help" tabIndex={0} aria-label={META_BY_KEY.seed.help}>
            <InfoIcon />
            <span className="tip" role="tooltip">
              {META_BY_KEY.seed.help}
            </span>
          </span>
          <span className="tag">on reset</span>
        </label>
      </div>
      <input
        type="range"
        className="range range-world seed-range"
        aria-label="Random seed"
        min={m.min}
        max={m.max}
        step={1}
        value={value}
        onChange={(e) => ctrl.setParam("seed", Number(e.target.value))}
        style={{ ["--fill" as string]: `${((value - m.min) / (m.max - m.min)) * 100}%` }}
      />
      <div className="seed-row">
        <input
          id={id}
          type="number"
          className="seed-input"
          min={1}
          max={9999}
          value={value}
          onChange={(e) => {
            const v = Number(e.target.value);
            if (Number.isFinite(v) && v >= 1) ctrl.setParam("seed", v);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") ctrl.reset();
          }}
        />
        <button className="btn small" onClick={() => ctrl.newSeed()} title="New random seed and reset">
          <DiceIcon width={15} height={15} />
          New seed
        </button>
      </div>
    </div>
  );
}

function PresetPicker({ active }: { active: string | null }) {
  return (
    <div className="presets" role="radiogroup" aria-label="Presets">
      {PRESETS.map((p) => (
        <button
          key={p.id}
          role="radio"
          aria-checked={active === p.id}
          className={`preset preset-${p.id} ${active === p.id ? "is-on" : ""}`}
          onClick={() => ctrl.applyPreset(p.id)}
        >
          <span className="preset-art" aria-hidden />
          <span className="preset-name">{p.name}</span>
          <span className="preset-blurb">{p.blurb}</span>
        </button>
      ))}
    </div>
  );
}

function Rules() {
  return (
    <details className="rules">
      <summary>How the garden works</summary>
      <ul>
        <li>
          Every blob spends energy to move; faster moves cost more (speed squared). Waiting still burns about a quarter as
          much.
        </li>
        <li>Blue blobs restore {RULES.fruitEnergy} energy from each fruit. An eaten branch rests, then slowly regrows.</li>
        <li>
          Red blobs restore energy by gently touching a blue blob, keeping {Math.round(RULES.redEfficiency * 100)}% of what they
          draw. A blue left with none fades.
        </li>
        <li>
          At the copy threshold a blob spends {Math.round(RULES.copyOverhead * 100)}% of it and splits the rest with its
          copy. Copies inherit speed and vision genes with a little drift.
        </li>
        <li>
          Blue flees any red it can see and dashes under the nearest tree. Each tree hides {RULES.shelterSlots} blue out of
          red's sight, but a frightened hider won't copy.
        </li>
        <li>
          Red tires after {RULES.chaseStamina}s of chasing, pauses after every contact, and alternates hunting with
          lurking to save energy.
        </li>
        <li>Seeing further costs a little extra energy even while standing still.</li>
      </ul>
    </details>
  );
}

export function ControlsPanel() {
  const params = useSim((x) => x.params, shallowEqual);
  const presetId = useSim((x) => x.presetId);
  const pending = useSim((x) => x.pendingReset, (a, b) => a.join() === b.join());

  return (
    <aside className="panel" aria-label="Settings">
      <section className="panel-section">
        <h2 className="panel-title">Presets</h2>
        <PresetPicker active={presetId} />
      </section>

      {pending.length > 0 && (
        <div className="pending">
          <span>
            <b>{pending.map((k) => META_BY_KEY[k].label).join(", ")}</b> will apply when the garden resets.
          </span>
          <button className="btn small primary" onClick={() => ctrl.reset()}>
            <ResetIcon width={15} height={15} />
            Reset now
          </button>
        </div>
      )}

      {GROUPS.map((g) => (
        <section key={g.id} className={`panel-section group-${g.id}`}>
          <h2 className="panel-title">
            {g.title}
            {g.note && <span className="panel-note">{g.note}</span>}
          </h2>
          {PARAM_META.filter((m) => m.group === g.id).map((m) =>
            m.key === "seed" ? (
              <SeedField key={m.key} value={params.seed} pending={pending.includes("seed")} />
            ) : (
              <Slider key={m.key} k={m.key} value={params[m.key]} pending={pending.includes(m.key)} />
            ),
          )}
        </section>
      ))}

      <Rules />
      <p className="shortcuts">
        <kbd>Space</kbd> play/pause · <kbd>→</kbd> step · <kbd>R</kbd> reset · <kbd>F</kbd> follow · <kbd>Esc</kbd> deselect
      </p>
    </aside>
  );
}
