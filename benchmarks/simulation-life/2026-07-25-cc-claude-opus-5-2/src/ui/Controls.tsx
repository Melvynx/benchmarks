import { CONTROLS, RESET_KEYS, type ControlDef, type Params } from "../sim/params";

const GROUPS: { id: ControlDef["group"]; label: string; dot?: string }[] = [
  { id: "fruit", label: "Fruit & trees", dot: "#5aa03c" },
  { id: "blue", label: "Blue blobs", dot: "#3f8fdb" },
  { id: "red", label: "Red blobs", dot: "#e2604a" },
  { id: "world", label: "World & run" },
];

interface Props {
  params: Params;
  onChange: (key: keyof Params, value: number) => void;
}

export function Controls({ params, onChange }: Props) {
  return (
    <div className="controls">
      {GROUPS.map((g) => (
        <div key={g.id}>
          <div className="group-title">
            {g.dot && <i className="dot" style={{ background: g.dot }} />}
            {g.label}
          </div>
          {CONTROLS.filter((c) => c.group === g.id).map((c) => (
            <div className="ctl" key={c.key}>
              <label className="ctl-head" htmlFor={`ctl-${c.key}`}>
                <b>{c.label}</b>
                <span className="val">
                  {(c.format ?? String)(params[c.key])}
                  {RESET_KEYS.includes(c.key) && <span className="tag"> restart</span>}
                </span>
              </label>
              <div className="ctl-hint">{c.hint}</div>
              <input
                id={`ctl-${c.key}`}
                type="range"
                min={c.min}
                max={c.max}
                step={c.step}
                value={params[c.key]}
                onChange={(e) => onChange(c.key, Number(e.target.value))}
              />
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
