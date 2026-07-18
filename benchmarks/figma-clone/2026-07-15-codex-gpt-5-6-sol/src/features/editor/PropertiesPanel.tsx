import { useState, type ReactNode } from "react";

import { hexToRgba, rgbaToHex } from "../../core/export";
import { unionBounds } from "../../core/geometry";
import { rgba, solid } from "../../core/scene";
import { editorStore, useEditorStore } from "../../core/store";
import type { AutoLayout, Paint, RGBA, SceneNode } from "../../core/types";
import { IconButton, NumberInput, Section, SegmentedControl, TextInput } from "../../ui/Controls";
import { Icon } from "../../ui/Icon";

const MIXED = Symbol("mixed");
const recentColors: readonly RGBA[] = [rgba(95, 92, 230), rgba(245, 54, 140), rgba(24, 25, 29), rgba(255, 178, 145), rgba(141, 218, 220), rgba(255, 255, 255)];

function commonValue<T>(nodes: readonly SceneNode[], select: (node: SceneNode) => T): T | typeof MIXED {
  const first = nodes[0];
  if (!first) return MIXED;
  const value = select(first);
  return nodes.every((node) => Object.is(select(node), value)) ? value : MIXED;
}

function PropertyRow({ label, children }: { readonly label: string; readonly children: ReactNode }) {
  return <div className="property-row"><span className="property-label">{label}</span>{children}</div>;
}

function patchSelection(nodes: readonly SceneNode[], patch: Partial<SceneNode>, label: string): void {
  editorStore.updateNodes(label, Object.fromEntries(nodes.map((node) => [node.id, patch])));
}

export function PropertiesPanel() {
  const document = useEditorStore((state) => state.document);
  const selection = useEditorStore((state) => state.selection);
  const tab = useEditorStore((state) => state.ui.propertyTab);
  const nodes = selection.flatMap((id) => document.nodes[id] ? [document.nodes[id]] : []);
  return (
    <aside className="side-panel properties-panel">
      <div className="panel-tabs property-tabs">
        {(["design", "prototype", "inspect"] as const).map((value) => <button className={tab === value ? "is-active" : ""} key={value} onClick={() => editorStore.setUi({ propertyTab: value })}>{value[0]?.toUpperCase()}{value.slice(1)}</button>)}
      </div>
      {tab === "design" ? <DesignProperties nodes={nodes} /> : tab === "prototype" ? <PrototypePanel nodes={nodes} /> : <InspectPanel nodes={nodes} />}
    </aside>
  );
}

function DesignProperties({ nodes }: { readonly nodes: readonly SceneNode[] }) {
  if (nodes.length === 0) return <CanvasProperties />;
  const x = commonValue(nodes, (node) => node.x);
  const y = commonValue(nodes, (node) => node.y);
  const width = commonValue(nodes, (node) => node.width);
  const height = commonValue(nodes, (node) => node.height);
  const rotation = commonValue(nodes, (node) => node.rotation);
  const opacity = commonValue(nodes, (node) => node.opacity * 100);
  const first = nodes[0];
  if (!first) return null;
  return (
    <div className="properties-scroll">
      <div className="selection-heading"><span>{nodes.length === 1 ? first.name : `${nodes.length} layers`}</span><div><IconButton icon="component" label="Create component" onClick={() => editorStore.toast("Component created from selection")} /><IconButton icon="more" label="More actions" /></div></div>
      <AlignmentControls nodes={nodes} />
      <Section title="Position & size">
        <div className="field-grid">
          <NumberInput icon="X" label="X" mixed={x === MIXED} value={x === MIXED ? 0 : x} onCommit={(value) => patchSelection(nodes, { x: value }, "Change X position")} />
          <NumberInput icon="Y" label="Y" mixed={y === MIXED} value={y === MIXED ? 0 : y} onCommit={(value) => patchSelection(nodes, { y: value }, "Change Y position")} />
          <NumberInput icon="W" label="Width" min={1} mixed={width === MIXED} value={width === MIXED ? 0 : width} onCommit={(value) => patchSelection(nodes, { width: value }, "Change width")} />
          <NumberInput icon="H" label="Height" min={1} mixed={height === MIXED} value={height === MIXED ? 0 : height} onCommit={(value) => patchSelection(nodes, { height: value }, "Change height")} />
          <NumberInput icon="↻" label="Rotation" mixed={rotation === MIXED} value={rotation === MIXED ? 0 : rotation} onCommit={(value) => patchSelection(nodes, { rotation: value }, "Change rotation")} />
          <NumberInput icon="◐" label="Opacity" min={0} max={100} mixed={opacity === MIXED} value={opacity === MIXED ? 0 : opacity} onCommit={(value) => patchSelection(nodes, { opacity: value / 100 }, "Change opacity")} />
        </div>
        <label className="clip-row"><input type="checkbox" checked={first.type === "frame" ? first.clipContent : false} disabled={first.type !== "frame"} onChange={(event) => first.type === "frame" && editorStore.updateNodes("Toggle clipping", { [first.id]: { clipContent: event.target.checked } })} /><span>Clip content</span></label>
      </Section>
      {first.type === "frame" ? <AutoLayoutSection node={first} /> : null}
      {first.type === "text" ? <TypographySection node={first} /> : null}
      <FillSection nodes={nodes} />
      <StrokeSection nodes={nodes} />
      <EffectsSection nodes={nodes} />
      <ExportSection />
    </div>
  );
}

function AlignmentControls({ nodes }: { readonly nodes: readonly SceneNode[] }) {
  const align = (mode: "left" | "center" | "right" | "top" | "middle" | "bottom"): void => {
    const bounds = unionBounds(nodes.map((node) => ({ x: node.x, y: node.y, width: node.width, height: node.height })));
    if (!bounds) return;
    const patches = Object.fromEntries(nodes.map((node) => {
      const x = mode === "left" ? bounds.x : mode === "center" ? bounds.x + (bounds.width - node.width) / 2 : mode === "right" ? bounds.x + bounds.width - node.width : node.x;
      const y = mode === "top" ? bounds.y : mode === "middle" ? bounds.y + (bounds.height - node.height) / 2 : mode === "bottom" ? bounds.y + bounds.height - node.height : node.y;
      return [node.id, { x, y }];
    }));
    editorStore.updateNodes(`Align ${mode}`, patches);
  };
  return <div className="alignment-bar">{(["left", "center", "right", "top", "middle", "bottom"] as const).map((mode) => <button aria-label={`Align ${mode}`} key={mode} onClick={() => align(mode)}><span className={`align-icon align-${mode}`} /></button>)}</div>;
}

function FillSection({ nodes }: { readonly nodes: readonly SceneNode[] }) {
  const firstPaint = nodes[0]?.fills.find((paint) => paint.visible);
  const solidColor = firstPaint?.type === "solid" ? firstPaint.color : rgba(95, 92, 230);
  const [hex, setHex] = useState(rgbaToHex(solidColor));
  const updateColor = (color: RGBA): void => {
    const fills: readonly Paint[] = [solid(color)];
    patchSelection(nodes, { fills }, "Change fill");
    setHex(rgbaToHex(color));
  };
  return (
    <Section title="Fill" action={<IconButton icon="plus" label="Add fill" onClick={() => updateColor(rgba(95, 92, 230))} />}>
      <div className="color-control">
        <button className="color-swatch" style={{ background: firstPaint?.type === "linear" ? "linear-gradient(135deg,#7565de,#1d1f3a)" : rgbaToHex(solidColor) }} onClick={() => editorStore.toast("Color picker active — choose a recent color below")} />
        <div className="color-value"><input aria-label="Fill hex color" value={hex} onBlur={() => { const color = hexToRgba(hex, solidColor[3]); if (color) updateColor(color); else setHex(rgbaToHex(solidColor)); }} onChange={(event) => setHex(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") event.currentTarget.blur(); }} /><span>100%</span></div>
        <IconButton icon="eye" label="Toggle fill" onClick={() => patchSelection(nodes, { fills: nodes[0]?.fills.map((paint) => ({ ...paint, visible: !paint.visible })) ?? [] }, "Toggle fill")} />
      </div>
      <div className="recent-colors">{recentColors.map((color) => <button aria-label={`Use ${rgbaToHex(color)}`} key={rgbaToHex(color)} style={{ background: rgbaToHex(color) }} onClick={() => updateColor(color)} />)}</div>
    </Section>
  );
}

function StrokeSection({ nodes }: { readonly nodes: readonly SceneNode[] }) {
  const node = nodes[0];
  if (!node) return null;
  return (
    <Section title="Stroke" action={<IconButton icon="plus" label="Add stroke" onClick={() => patchSelection(nodes, { stroke: { ...node.stroke, visible: true, width: Math.max(1, node.stroke.width) } }, "Add stroke")} />}>
      <div className="color-control"><button className="color-swatch" style={{ background: rgbaToHex(node.stroke.color) }} /><div className="color-value"><span>{rgbaToHex(node.stroke.color)}</span><span>{Math.round(node.stroke.color[3] * 100)}%</span></div><IconButton icon={node.stroke.visible ? "eye" : "eyeOff"} label="Toggle stroke" onClick={() => patchSelection(nodes, { stroke: { ...node.stroke, visible: !node.stroke.visible } }, "Toggle stroke")} /></div>
      <div className="field-grid"><NumberInput icon="W" label="Stroke width" min={0} value={node.stroke.width} onCommit={(width) => patchSelection(nodes, { stroke: { ...node.stroke, width, visible: width > 0 } }, "Change stroke width")} /><label className="field"><span className="field-prefix">—</span><select value={node.stroke.align} onChange={(event) => patchSelection(nodes, { stroke: { ...node.stroke, align: event.target.value as "inside" | "center" | "outside" } }, "Change stroke align")}><option>inside</option><option>center</option><option>outside</option></select></label></div>
    </Section>
  );
}

function EffectsSection({ nodes }: { readonly nodes: readonly SceneNode[] }) {
  const node = nodes[0];
  if (!node) return null;
  const effect = node.effects[0];
  return (
    <Section title="Effects" action={<IconButton icon="plus" label="Add effect" onClick={() => patchSelection(nodes, { effects: [{ type: "drop-shadow", color: rgba(0, 0, 0, .18), offset: { x: 0, y: 8 }, blur: 24, spread: 0, visible: true }] }, "Add shadow")} />}>
      {effect ? <div className="effect-row"><span className="effect-icon">◒</span><select value={effect.type} onChange={() => undefined}><option>{effect.type}</option><option>layer-blur</option><option>inner-shadow</option></select><IconButton icon="eye" label="Toggle effect" onClick={() => patchSelection(nodes, { effects: node.effects.map((item, index) => index === 0 ? { ...item, visible: !item.visible } : item) }, "Toggle effect")} /></div> : <button className="empty-property-action" onClick={() => patchSelection(nodes, { effects: [{ type: "drop-shadow", color: rgba(0, 0, 0, .18), offset: { x: 0, y: 8 }, blur: 24, spread: 0, visible: true }] }, "Add shadow")}>Add a shadow or blur</button>}
    </Section>
  );
}

function AutoLayoutSection({ node }: { readonly node: Extract<SceneNode, { type: "frame" }> }) {
  const layout: AutoLayout = node.autoLayout ?? { direction: "vertical", gap: 12, padding: [24, 24, 24, 24], align: "start", sizing: "fixed" };
  const update = (patch: Partial<AutoLayout>): void => editorStore.updateNodes("Update auto layout", { [node.id]: { autoLayout: { ...layout, ...patch } } });
  return (
    <Section title="Auto layout" action={<IconButton icon={node.autoLayout ? "minus" : "plus"} label={node.autoLayout ? "Remove auto layout" : "Add auto layout"} onClick={() => editorStore.updateNodes(node.autoLayout ? "Remove auto layout" : "Add auto layout", { [node.id]: { autoLayout: node.autoLayout ? null : layout } })} />}>
      {node.autoLayout ? <><PropertyRow label="Direction"><SegmentedControl value={layout.direction} options={[{ value: "horizontal", label: "Horizontal", icon: "arrow" }, { value: "vertical", label: "Vertical", icon: "download" }]} onChange={(direction) => update({ direction })} /></PropertyRow><div className="field-grid"><NumberInput icon="↔" label="Gap" min={0} value={layout.gap} onCommit={(gap) => update({ gap })} /><NumberInput icon="□" label="Padding" min={0} value={layout.padding[0]} onCommit={(value) => update({ padding: [value, value, value, value] })} /></div><PropertyRow label="Sizing"><SegmentedControl value={layout.sizing} options={[{ value: "fixed", label: "Fixed" }, { value: "hug", label: "Hug" }]} onChange={(sizing) => update({ sizing })} /></PropertyRow></> : <p className="property-hint">Stack children with consistent spacing, padding, and alignment.</p>}
    </Section>
  );
}

function TypographySection({ node }: { readonly node: Extract<SceneNode, { type: "text" }> }) {
  const fonts: readonly Extract<SceneNode, { type: "text" }>["fontFamily"][] = ["Inter", "Roboto", "Poppins", "Playfair Display", "JetBrains Mono", "Space Grotesk"];
  return (
    <Section title="Typography">
      <label className="field full-field"><select value={node.fontFamily} onChange={(event) => editorStore.updateNodes("Change font", { [node.id]: { fontFamily: event.target.value as typeof node.fontFamily } })}>{fonts.map((font) => <option key={font}>{font}</option>)}</select></label>
      <div className="field-grid"><NumberInput icon="S" label="Font size" min={1} value={node.fontSize} onCommit={(fontSize) => editorStore.updateNodes("Change font size", { [node.id]: { fontSize } })} /><NumberInput icon="W" label="Weight" min={100} max={900} step={100} value={node.fontWeight} onCommit={(fontWeight) => editorStore.updateNodes("Change font weight", { [node.id]: { fontWeight } })} /><NumberInput icon="↕" label="Line height" min={.5} step={.05} value={node.lineHeight} onCommit={(lineHeight) => editorStore.updateNodes("Change line height", { [node.id]: { lineHeight } })} /><NumberInput icon="↔" label="Letter spacing" step={.1} value={node.letterSpacing} onCommit={(letterSpacing) => editorStore.updateNodes("Change letter spacing", { [node.id]: { letterSpacing } })} /></div>
      <SegmentedControl value={node.textAlign === "start" || node.textAlign === "end" ? "left" : node.textAlign} options={[{ value: "left", label: "Left" }, { value: "center", label: "Center" }, { value: "right", label: "Right" }]} onChange={(textAlign) => editorStore.updateNodes("Change text alignment", { [node.id]: { textAlign } })} />
    </Section>
  );
}

function ExportSection() {
  return <Section title="Export"><button className="export-row" onClick={() => window.dispatchEvent(new CustomEvent("editor-export", { detail: "png" }))}><span><strong>PNG</strong><small>2×</small></span><Icon name="download" size={16} /></button><button className="export-row" onClick={() => window.dispatchEvent(new CustomEvent("editor-export", { detail: "svg" }))}><span><strong>SVG</strong><small>Vector</small></span><Icon name="download" size={16} /></button></Section>;
}

function CanvasProperties() {
  const ui = useEditorStore((state) => state.ui);
  return (
    <div className="properties-scroll canvas-properties">
      <div className="selection-heading"><span>Canvas</span></div>
      <Section title="View">
        {[{ label: "Layout grid", key: "showGrid", value: ui.showGrid }, { label: "Rulers", key: "showRulers", value: ui.showRulers }, { label: "Pixel preview", key: "pixelPreview", value: ui.pixelPreview }].map((item) => <label className="toggle-row" key={item.key}><span>{item.label}</span><input type="checkbox" checked={item.value} onChange={(event) => editorStore.setUi({ [item.key]: event.target.checked })} /></label>)}
      </Section>
      <Section title="Local styles"><div className="style-list">{recentColors.slice(0, 5).map((color, index) => <button key={rgbaToHex(color)}><span style={{ background: rgbaToHex(color) }} /><div><strong>{["Brand / Primary", "Accent / Pink", "Ink / Strong", "Accent / Peach", "Accent / Mint"][index]}</strong><small>{rgbaToHex(color)}</small></div></button>)}</div></Section>
      <div className="canvas-tip"><Icon name="sparkle" /><div><strong>Pro tip</strong><p>Drop images anywhere, or paste directly from your clipboard.</p></div></div>
    </div>
  );
}

function PrototypePanel({ nodes }: { readonly nodes: readonly SceneNode[] }) {
  return <div className="panel-empty"><span className="empty-orb"><Icon name="play" /></span><h2>Prototype interactions</h2><p>{nodes.length ? "Connect this layer to a frame, then preview the flow." : "Select a layer to add an interaction."}</p>{nodes.length ? <button onClick={() => editorStore.toast("Interaction connector enabled")}><Icon name="plus" size={15} /> Add interaction</button> : null}</div>;
}

function InspectPanel({ nodes }: { readonly nodes: readonly SceneNode[] }) {
  const node = nodes[0];
  const code = node ? `/* ${node.name} */\nposition: absolute;\nleft: ${Math.round(node.x)}px;\ntop: ${Math.round(node.y)}px;\nwidth: ${Math.round(node.width)}px;\nheight: ${Math.round(node.height)}px;\nopacity: ${node.opacity};` : "Select a layer to inspect its values.";
  return <div className="inspect-panel"><div className="inspect-heading"><span>CSS</span><button onClick={() => { void navigator.clipboard?.writeText(code); editorStore.toast("CSS copied"); }}><Icon name="copy" size={14} /> Copy</button></div><pre>{code}</pre></div>;
}
