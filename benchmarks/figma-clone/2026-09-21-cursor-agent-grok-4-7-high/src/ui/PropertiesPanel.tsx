import { useState } from "react";
import { dropShadow, solidFill, rgba, defaultStroke } from "../engine/scene/factory";
import type { Effect, Fill, GeometricNode, TextNode } from "../engine/types";
import { FONT_FAMILIES, isFrameLike, isGeometric } from "../engine/types";
import { rgbaCss } from "../engine/color";
import { ColorPicker } from "./ColorPicker";
import { useEditorState } from "./context";
import { NumField, shared } from "./fields";
import { exportPNG, exportSVG } from "../engine/export/export";

export function PropertiesPanel() {
  const { editor } = useEditorState("chrome");
  const nodes = editor.selection.map((id) => editor.node(id)).filter((node): node is GeometricNode => !!node && isGeometric(node));
  return (
    <aside className="panel right">
      {nodes.length === 0 ? (
        <div className="prop-empty">
          <p>Select a layer to edit it.</p>
          <p className="dim">{editor.objectCount} objects on this page</p>
        </div>
      ) : (
        <SelectionProps nodes={nodes} />
      )}
    </aside>
  );
}

function SelectionProps({ nodes }: { nodes: GeometricNode[] }) {
  const { editor } = useEditorState("chrome");
  const [openFill, setOpenFill] = useState<number | null>(null);
  const xs = shared(nodes.map((node) => Math.round(node.x * 100) / 100));
  const ys = shared(nodes.map((node) => Math.round(node.y * 100) / 100));
  const ws = shared(nodes.map((node) => Math.round((editor.geomOf(node.id)?.width ?? node.width) * 100) / 100));
  const hs = shared(nodes.map((node) => Math.round((editor.geomOf(node.id)?.height ?? node.height) * 100) / 100));
  const rots = shared(nodes.map((node) => Math.round(node.rotation * 10) / 10));
  const opacity = shared(nodes.map((node) => node.opacity));
  const patch = (partial: Partial<GeometricNode>) => {
    for (const node of nodes) editor.patch(node.id, partial);
  };
  return (
    <div className="props">
      <div className="prop-head">{nodes.length === 1 ? nodes[0]?.name : `${nodes.length} selected`}</div>
      {nodes.length > 1 && (
        <div className="align-row">
          {(["left", "center", "right", "top", "middle", "bottom"] as const).map((mode) => (
            <button key={mode} type="button" onClick={() => editor.align(mode)}>{mode.slice(0, 1).toUpperCase()}</button>
          ))}
          <button type="button" onClick={() => editor.distribute("x")}>H</button>
          <button type="button" onClick={() => editor.distribute("y")}>V</button>
        </div>
      )}
      <section>
        <h3>Position</h3>
        <div className="grid2">
          <NumField editor={editor} label="X" value={xs.mixed ? "mixed" : xs.value} onChange={(value) => patch({ x: value })} />
          <NumField editor={editor} label="Y" value={ys.mixed ? "mixed" : ys.value} onChange={(value) => patch({ y: value })} />
          <NumField editor={editor} label="W" value={ws.mixed ? "mixed" : ws.value} onChange={(value) => patch({ width: Math.max(1, value) })} />
          <NumField editor={editor} label="H" value={hs.mixed ? "mixed" : hs.value} onChange={(value) => patch({ height: Math.max(0, value) })} />
          <NumField editor={editor} label="R" value={rots.mixed ? "mixed" : rots.value} onChange={(value) => patch({ rotation: value })} />
          <NumField editor={editor} label="%" value={opacity.mixed ? "mixed" : Math.round(opacity.value * 100)} onChange={(value) => patch({ opacity: Math.max(0, Math.min(1, value / 100)) })} />
        </div>
      </section>
      {nodes.length === 1 && nodes[0] && isFrameLike(nodes[0]) && <LayoutSection node={nodes[0]} />}
      {nodes.length === 1 && nodes[0] && <ConstraintSection node={nodes[0]} />}
      <section>
        <h3>Fill <button type="button" onClick={() => patch({ fills: [...(nodes[0]?.fills ?? []), solidFill(rgba(196, 201, 214))] })}>+</button></h3>
        {(nodes[0]?.fills ?? []).map((fill, index) => (
          <div key={fill.id} className="swatch-row">
            <button type="button" className="swatch" style={{ background: fill.type === "solid" ? rgbaCss(fill.color) : "linear-gradient(90deg,#fff,#4c7dff)" }} onClick={() => setOpenFill(openFill === index ? null : index)} />
            <span>{fill.type}</span>
            <button type="button" onClick={() => patch({ fills: nodes[0]!.fills.filter((item) => item.id !== fill.id) })}>×</button>
            {openFill === index && fill.type === "solid" && (
              <ColorPicker color={fill.color} onChange={(color) => patch({ fills: nodes[0]!.fills.map((item) => item.id === fill.id && item.type === "solid" ? { ...item, color } : item) })} />
            )}
            {openFill === index && fill.type !== "solid" && <GradientEditor fill={fill} onChange={(next) => patch({ fills: nodes[0]!.fills.map((item) => item.id === fill.id ? next : item) })} />}
          </div>
        ))}
        <button type="button" className="quiet" onClick={() => patch({ fills: [...(nodes[0]?.fills ?? []), { id: `lin-${Date.now()}`, type: "linear", angle: 90, opacity: 1, visible: true, stops: [{ offset: 0, color: rgba(255, 255, 255) }, { offset: 1, color: rgba(76, 125, 255) }] }] })}>Linear gradient</button>
      </section>
      <section>
        <h3>Stroke <button type="button" onClick={() => patch({ strokes: [...(nodes[0]?.strokes ?? []), defaultStroke()] })}>+</button></h3>
        {(nodes[0]?.strokes ?? []).map((stroke) => (
          <div key={stroke.id} className="grid2">
            <NumField editor={editor} label="W" value={stroke.width} onChange={(width) => patch({ strokes: nodes[0]!.strokes.map((item) => item.id === stroke.id ? { ...item, width } : item) })} />
            <label className="num">
              <span>Align</span>
              <select value={stroke.align} onChange={(event) => patch({ strokes: nodes[0]!.strokes.map((item) => item.id === stroke.id ? { ...item, align: event.target.value as typeof stroke.align } : item) })}>
                <option value="center">Center</option>
                <option value="inside">Inside</option>
                <option value="outside">Outside</option>
              </select>
            </label>
          </div>
        ))}
      </section>
      <section>
        <h3>Effects <button type="button" onClick={() => patch({ effects: [...(nodes[0]?.effects ?? []), dropShadow()] })}>+</button></h3>
        {(nodes[0]?.effects ?? []).map((effect) => (
          <EffectRow key={effect.id} effect={effect} onChange={(next) => patch({ effects: nodes[0]!.effects.map((item) => item.id === effect.id ? next : item) })} onRemove={() => patch({ effects: nodes[0]!.effects.filter((item) => item.id !== effect.id) })} />
        ))}
      </section>
      {nodes.length === 1 && nodes[0]?.type === "text" && <TextSection node={nodes[0]} />}
      {nodes.length === 1 && nodes[0] && (
        <section>
          <h3>Prototype</h3>
          <label className="num">
            <span>On click</span>
            <select
              value={nodes[0].prototypeTargetId ?? ""}
              onChange={(event) => patch({ prototypeTargetId: event.target.value || null })}
            >
              <option value="">None</option>
              {editor.order.filter((id) => editor.node(id)?.type === "frame").map((id) => (
                <option key={id} value={id}>{editor.node(id)?.name}</option>
              ))}
            </select>
          </label>
        </section>
      )}
      <section>
        <h3>Export</h3>
        <div className="align-row">
          <button type="button" onClick={() => void exportPNG(editor)}>PNG</button>
          <button type="button" onClick={() => exportSVG(editor)}>SVG</button>
        </div>
      </section>
    </div>
  );
}

function LayoutSection({ node }: { node: Extract<GeometricNode, { type: "frame" | "instance" }> }) {
  const { editor } = useEditorState("chrome");
  const patch = (partial: Partial<GeometricNode>) => editor.patch(node.id, partial);
  return (
    <section>
      <h3>Auto layout</h3>
      <div className="align-row">
        {(["none", "horizontal", "vertical"] as const).map((mode) => (
          <button key={mode} type="button" className={node.layoutMode === mode ? "on" : ""} onClick={() => patch({ layoutMode: mode } as Partial<GeometricNode>)}>{mode === "none" ? "Off" : mode === "horizontal" ? "Row" : "Column"}</button>
        ))}
      </div>
      {node.layoutMode !== "none" && (
        <div className="grid2">
          <NumField editor={editor} label="Gap" value={node.itemSpacing} onChange={(itemSpacing) => patch({ itemSpacing } as Partial<GeometricNode>)} />
          <NumField editor={editor} label="Pad" value={node.padding[0]} onChange={(value) => patch({ padding: [value, value, value, value] } as Partial<GeometricNode>)} />
        </div>
      )}
    </section>
  );
}

function ConstraintSection({ node }: { node: GeometricNode }) {
  const { editor } = useEditorState("chrome");
  return (
    <section>
      <h3>Constraints</h3>
      <div className="align-row">
        {(["left", "right", "left-right", "center", "scale"] as const).map((mode) => (
          <button key={mode} type="button" className={node.constraintH === mode ? "on" : ""} onClick={() => editor.patch(node.id, { constraintH: mode })}>{mode}</button>
        ))}
      </div>
      <div className="align-row">
        {(["top", "bottom", "top-bottom", "center", "scale"] as const).map((mode) => (
          <button key={mode} type="button" className={node.constraintV === mode ? "on" : ""} onClick={() => editor.patch(node.id, { constraintV: mode })}>{mode}</button>
        ))}
      </div>
    </section>
  );
}

function TextSection({ node }: { node: TextNode }) {
  const { editor } = useEditorState("chrome");
  const patch = (partial: Partial<TextNode>) => editor.patch(node.id, partial);
  return (
    <section>
      <h3>Typography</h3>
      <label className="num">
        <span>Font</span>
        <select value={node.fontFamily} onChange={(event) => patch({ fontFamily: event.target.value })}>
          {FONT_FAMILIES.map((family) => <option key={family}>{family}</option>)}
        </select>
      </label>
      <div className="grid2">
        <NumField editor={editor} label="Size" value={node.fontSize} onChange={(fontSize) => patch({ fontSize })} />
        <NumField editor={editor} label="Wt" value={node.fontWeight} onChange={(fontWeight) => patch({ fontWeight })} />
        <NumField editor={editor} label="Lh" value={node.lineHeight} onChange={(lineHeight) => patch({ lineHeight })} />
        <NumField editor={editor} label="Ls" value={node.letterSpacing} onChange={(letterSpacing) => patch({ letterSpacing })} />
      </div>
      <div className="align-row">
        {(["left", "center", "right"] as const).map((align) => (
          <button key={align} type="button" className={node.textAlign === align ? "on" : ""} onClick={() => patch({ textAlign: align })}>{align}</button>
        ))}
      </div>
    </section>
  );
}

function EffectRow({ effect, onChange, onRemove }: { effect: Effect; onChange: (effect: Effect) => void; onRemove: () => void }) {
  return (
    <div className="swatch-row">
      <span>{effect.type}</span>
      {effect.type === "drop-shadow" || effect.type === "inner-shadow" ? (
        <span className="dim">{effect.blur}px</span>
      ) : (
        <span className="dim">{effect.radius}px</span>
      )}
      <button type="button" onClick={onRemove}>×</button>
      <button type="button" onClick={() => onChange(effect.type === "layer-blur" || effect.type === "background-blur" ? { ...effect, radius: effect.radius + 2 } : { ...effect, blur: effect.blur + 2 })}>+</button>
    </div>
  );
}

function GradientEditor({ fill, onChange }: { fill: Fill; onChange: (fill: Fill) => void }) {
  if (fill.type === "solid") return null;
  return (
    <div className="picker">
      {fill.type === "linear" && (
        <label className="num">
          <span>Angle</span>
          <input type="number" value={fill.angle} onChange={(event) => onChange({ ...fill, angle: Number(event.target.value) })} />
        </label>
      )}
    </div>
  );
}
