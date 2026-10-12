import { useState } from "react";
import type { Controller } from "../app/controller";
import { PARAM_META, PRESETS, type GroupId, type ParamMeta } from "../sim/params";

const GROUPS: { id: GroupId; title: string; tone: string }[] = [
  { id: "fruit", title: "Fruit", tone: "fruit" },
  { id: "blue", title: "Blue blobs", tone: "blue" },
  { id: "red", title: "Red blobs", tone: "red" },
  { id: "start", title: "Starting garden", tone: "start" },
  { id: "sim", title: "Simulation", tone: "sim" },
];

function Slider({ ctl, meta }: { ctl: Controller; meta: ParamMeta }) {
  const v = ctl.params[meta.key];
  const pending = !meta.live && v !== ctl.sim.p[meta.key];
  return (
    <label className={`param ${pending ? "pending" : ""}`}>
      <span className="param-head">
        <span>{meta.label}</span>
        <output>{meta.format(v)}</output>
      </span>
      <input
        type="range"
        min={meta.min}
        max={meta.max}
        step={meta.step}
        value={v}
        onChange={(e) => ctl.setParam(meta.key, Number(e.target.value))}
      />
      <span className="hint">{meta.hint(v, ctl.params)}</span>
    </label>
  );
}

export function Sidebar({ ctl }: { ctl: Controller }) {
  const [open, setOpen] = useState<Record<GroupId, boolean>>({ fruit: true, blue: true, red: true, start: true, sim: false });
  const pending = ctl.pendingKeys();
  const active = PRESETS.find((p) => p.id === ctl.presetId);

  return (
    <nav className="sidebar">
      <section className="panel">
        <h2>Presets</h2>
        <div className="presets">
          {PRESETS.map((p) => (
            <button key={p.id} className={`preset ${p.id === ctl.presetId ? "on" : ""}`} onClick={() => ctl.applyPreset(p.id)}>
              {p.name}
            </button>
          ))}
        </div>
        <p className="blurb">{active ? active.blurb : "Custom rules. Pick a preset to start from a known garden."}</p>
      </section>

      {GROUPS.map((g) => (
        <section key={g.id} className={`panel group-${g.tone}`}>
          <button className="group-head" onClick={() => setOpen({ ...open, [g.id]: !open[g.id] })} aria-expanded={open[g.id]}>
            <span className={`swatch ${g.tone}`} />
            {g.title}
            {g.id === "start" && pending.length > 0 && <span className="pending-badge">reset to apply</span>}
            <span className="caret">{open[g.id] ? "−" : "+"}</span>
          </button>
          {open[g.id] && (
            <div className="params">
              {PARAM_META.filter((m) => m.group === g.id).map((m) => (
                <Slider key={m.key} ctl={ctl} meta={m} />
              ))}
              {g.id === "start" && (
                <div className={`param seed ${ctl.params.seed !== ctl.sim.p.seed ? "pending" : ""}`}>
                  <span className="param-head">
                    <span>Random seed</span>
                  </span>
                  <div className="seed-row">
                    <input
                      type="number"
                      min={1}
                      value={ctl.params.seed}
                      onChange={(e) => ctl.setParam("seed", Number(e.target.value))}
                      aria-label="Random seed"
                    />
                    <button
                      className="ghost"
                      title="Roll a new seed"
                      onClick={() => ctl.setParam("seed", Math.floor(Math.random() * 99999) + 1)}
                    >
                      Roll
                    </button>
                    <button className="primary small" disabled={!pending.length} onClick={ctl.reset}>
                      Plant
                    </button>
                  </div>
                  <span className="hint">Same seed + same settings = the same garden, blob for blob.</span>
                </div>
              )}
            </div>
          )}
        </section>
      ))}
    </nav>
  );
}
