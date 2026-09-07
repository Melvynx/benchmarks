import { defaultStroke, uniformCorners } from "../core/factories";
import { align, booleanSelection, makeComponent, selectedNodes, stack, updateSelected } from "../core/store";
import type { Paint, SceneNode } from "../core/types";
import { ColorPicker } from "./ColorPicker";
import { Num } from "./Num";
import { ConstraintsEditor, ExportButtons, LayoutEditor, StylesBlock, TextEditor } from "./PropertiesExtras";
import { useEditor } from "./use-editor";

function mixed<T>(values: T[]): T | "Mixed" {
  const first = values[0];
  if (first === undefined) return "Mixed";
  return values.every((v) => Object.is(v, first)) ? first : "Mixed";
}

export function PropertiesPanel() {
  useEditor((s) => s.selection);
  useEditor((s) => s.revision);
  const nodes = selectedNodes();
  if (nodes.length === 0) {
    return (
      <aside className="panel">
        <div className="panel-head">Design</div>
        <div className="panel-body">
          <div className="empty">Select a layer to edit position, fill, stroke, type, and auto-layout.</div>
        </div>
      </aside>
    );
  }
  const x = mixed(nodes.map((n) => round(n.x)));
  const y = mixed(nodes.map((n) => round(n.y)));
  const w = mixed(nodes.map((n) => round(n.width)));
  const h = mixed(nodes.map((n) => round(n.height)));
  const rot = mixed(nodes.map((n) => round(n.rotation)));
  const op = mixed(nodes.map((n) => round(n.opacity * 100)));
  return (
    <aside className="panel">
      <div className="panel-head">{nodes.length > 1 ? `${nodes.length} selected` : nodes[0]?.name}</div>
      <div className="panel-body">
        <div className="align-row">
          {(["left", "center", "right", "top", "middle", "bottom"] as const).map((m) => (
            <button key={m} className="btn" onClick={() => align(m)}>{m[0]}</button>
          ))}
        </div>
        <div className="section">
          <div className="section-title">Position</div>
          <div className="row">
            <Num label="X" value={x} onChange={(v) => updateSelected((n) => { n.x = v; }, "X")} />
            <Num label="Y" value={y} onChange={(v) => updateSelected((n) => { n.y = v; }, "Y")} />
            <Num label="W" value={w} onChange={(v) => updateSelected((n) => { n.width = Math.max(1, v); }, "W")} />
            <Num label="H" value={h} onChange={(v) => updateSelected((n) => { n.height = Math.max(1, v); }, "H")} />
            <Num label="R" value={rot} onChange={(v) => updateSelected((n) => { n.rotation = v; }, "Rotate")} />
            <Num label="%" value={op} onChange={(v) => updateSelected((n) => { n.opacity = Math.min(1, Math.max(0, v / 100)); }, "Opacity")} />
          </div>
        </div>
        <CornersEditor nodes={nodes} />
        <FillEditor fill={nodes[0]?.fills[0]} />
        <StrokeEditor nodes={nodes} />
        <EffectsEditor />
        <LayoutEditor nodes={nodes} />
        <ConstraintsEditor nodes={nodes} />
        <TextEditor nodes={nodes} />
        <div className="section">
          <div className="align-row">
            <button className="btn" onClick={() => stack("forward")}>Forward</button>
            <button className="btn" onClick={() => stack("backward")}>Back</button>
            <button className="btn" onClick={() => makeComponent()}>Component</button>
          </div>
        </div>
        <div className="section">
          {(["union", "subtract", "intersect", "exclude"] as const).map((op) => (
            <button key={op} className="btn" onClick={() => booleanSelection(op)}>{op}</button>
          ))}
        </div>
        <ExportButtons />
        <StylesBlock />
      </div>
    </aside>
  );
}

function CornersEditor({ nodes }: { nodes: SceneNode[] }) {
  const first = nodes.find(
    (n) => n.type === "rectangle" || n.type === "frame" || n.type === "image" || n.type === "component",
  );
  if (!first || (first.type !== "rectangle" && first.type !== "frame" && first.type !== "image" && first.type !== "component")) {
    return null;
  }
  return (
    <div className="section">
      <div className="section-title">Corners</div>
      <Num
        label="Radius"
        value={first.cornerRadius.tl}
        onChange={(v) =>
          updateSelected((n) => {
            if (n.type === "rectangle" || n.type === "frame" || n.type === "image" || n.type === "component") {
              n.cornerRadius = uniformCorners(Math.max(0, v));
            }
          }, "Radius")
        }
      />
    </div>
  );
}

function FillEditor({ fill }: { fill: Paint | undefined }) {
  const color = fill?.type === "solid" ? fill.color : { r: 0.85, g: 0.85, b: 0.85, a: 1 };
  return (
    <div className="section">
      <div className="section-title">Fill</div>
      <ColorPicker
        value={color}
        onChange={(c) => updateSelected((n) => { n.fills = [{ type: "solid", color: c, opacity: 1 }]; }, "Fill")}
      />
    </div>
  );
}

function StrokeEditor({ nodes }: { nodes: SceneNode[] }) {
  const s = nodes[0]?.strokes[0];
  return (
    <div className="section">
      <div className="section-title">Stroke</div>
      <Num
        label="Width"
        value={s?.thickness ?? 0}
        onChange={(v) =>
          updateSelected((n) => {
            const st = n.strokes[0] ?? defaultStroke();
            st.thickness = Math.max(0, v);
            n.strokes = v <= 0 ? [] : [st];
          }, "Stroke")
        }
      />
    </div>
  );
}

function EffectsEditor() {
  return (
    <div className="section">
      <div className="section-title">Effects</div>
      <button
        className="btn"
        onClick={() =>
          updateSelected((n) => {
            n.effects = [...n.effects, { type: "drop-shadow", color: { r: 0, g: 0, b: 0, a: 0.25 }, x: 0, y: 8, blur: 16, spread: 0, visible: true }];
          }, "Shadow")
        }
      >
        Drop shadow
      </button>
    </div>
  );
}

function round(n: number): number {
  return Math.round(n * 100) / 100;
}
