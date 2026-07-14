import { AlignCenter, AlignHorizontalSpaceAround, AlignLeft, AlignRight, Download, FileJson, ImageDown, Rows3, Columns3 } from "lucide-react";
import { useMemo } from "react";
import { updateManyCommand, updateNodeCommand } from "../commands/commands";
import { downloadSelectionPng, downloadSelectionSvg, exportJson } from "../export/exporters";
import { resolveAutoLayout } from "../scene/autoLayout";
import { activeDocument, useEditorStore } from "../state/editorStore";
import type { EditorDocument, FontFamily, NodeId, SceneNode } from "../types/nodes";
import { firstSolidHex, solidFill } from "./color";

type Props = Readonly<{ document: EditorDocument }>;

const fonts: readonly FontFamily[] = ["Inter", "Roboto", "Poppins", "Playfair Display", "JetBrains Mono", "Space Grotesk"];

export function PropertiesPanel({ document }: Props) {
  const store = useEditorStore();
  const nodes = useMemo(() => document.selection.map((id) => document.nodes[id]).filter((node): node is SceneNode => Boolean(node)), [document]);
  const primary = nodes[0];
  return (
    <aside className="panel properties-panel">
      <div className="panel-heading">
        <h2>Inspector</h2>
        <span>{nodes.length ? `${nodes.length} selected` : "No selection"}</span>
      </div>
      {!primary ? <EmptyInspector /> : (
        <>
          <Section title="Position">
            <NumberGrid>
              <NumberField label="X" value={mixed(nodes, "x")} onChange={(value) => patchMany(nodes, { x: value })} />
              <NumberField label="Y" value={mixed(nodes, "y")} onChange={(value) => patchMany(nodes, { y: value })} />
              <NumberField label="W" value={mixed(nodes, "width")} onChange={(value) => patchMany(nodes, { width: value })} />
              <NumberField label="H" value={mixed(nodes, "height")} onChange={(value) => patchMany(nodes, { height: value })} />
              <NumberField label="Rot" value={mixed(nodes, "rotation")} onChange={(value) => patchMany(nodes, { rotation: value })} />
              <NumberField label="Op" value={mixed(nodes, "opacity")} step={0.05} onChange={(value) => patchMany(nodes, { opacity: Math.min(1, Math.max(0, value)) })} />
            </NumberGrid>
          </Section>

          <Section title="Appearance">
            <label className="field-row">
              <span>Fill</span>
              <input type="color" value={firstSolidHex(primary.fills)} onChange={(event) => patchMany(nodes, { fills: [solidFill(event.target.value)] })} />
            </label>
            <label className="field-row">
              <span>Stroke</span>
              <input type="number" min={0} value={primary.strokes[0]?.width ?? 0} onChange={(event) => patchMany(nodes, { strokes: [{ color: { r: 31, g: 33, b: 35, a: 1 }, width: Number(event.target.value), align: "inside", dash: [] }] })} />
            </label>
            <div className="swatches">
              {store.recentColors.map((color) => (
                <button key={color} style={{ background: color }} title={color} onClick={() => patchMany(nodes, { fills: [solidFill(color)] })} />
              ))}
            </div>
          </Section>

          {primary.type === "text" ? (
            <Section title="Text">
              <label className="field-row">
                <span>Font</span>
                <select value={primary.fontFamily} onChange={(event) => patchOne(primary, { fontFamily: event.target.value })}>
                  {fonts.map((font) => <option key={font}>{font}</option>)}
                </select>
              </label>
              <NumberGrid>
                <NumberField label="Size" value={primary.fontSize} onChange={(value) => patchOne(primary, { fontSize: value })} />
                <NumberField label="Weight" value={primary.fontWeight} step={100} onChange={(value) => patchOne(primary, { fontWeight: value })} />
                <NumberField label="Line" value={primary.lineHeight} step={0.05} onChange={(value) => patchOne(primary, { lineHeight: value })} />
                <NumberField label="Track" value={primary.letterSpacing} onChange={(value) => patchOne(primary, { letterSpacing: value })} />
              </NumberGrid>
              <div className="segmented">
                {(["left", "center", "right"] as const).map((align) => (
                  <button key={align} className={primary.align === align ? "active" : ""} onClick={() => patchOne(primary, { align })}>
                    {align === "left" ? <AlignLeft size={14} /> : align === "center" ? <AlignCenter size={14} /> : <AlignRight size={14} />}
                  </button>
                ))}
              </div>
            </Section>
          ) : null}

          {primary.type === "frame" ? (
            <Section title="Auto layout">
              <div className="segmented">
                <button className={primary.autoLayout?.direction === "horizontal" ? "active" : ""} onClick={() => patchOne(primary, { autoLayout: { ...(primary.autoLayout ?? defaultLayout()), direction: "horizontal" } })}><Columns3 size={14} /></button>
                <button className={primary.autoLayout?.direction === "vertical" ? "active" : ""} onClick={() => patchOne(primary, { autoLayout: { ...(primary.autoLayout ?? defaultLayout()), direction: "vertical" } })}><Rows3 size={14} /></button>
              </div>
              <NumberGrid>
                <NumberField label="Gap" value={primary.autoLayout?.gap ?? 0} onChange={(value) => patchOne(primary, { autoLayout: { ...(primary.autoLayout ?? defaultLayout()), gap: value } })} />
                <NumberField label="Pad" value={primary.autoLayout?.padding.left ?? 0} onChange={(value) => patchOne(primary, { autoLayout: { ...(primary.autoLayout ?? defaultLayout()), padding: { top: value, right: value, bottom: value, left: value } } })} />
              </NumberGrid>
              <button className="wide-command" onClick={() => store.setDocument(resolveAutoLayout(activeDocument(useEditorStore.getState()), primary.id))}>Resolve layout</button>
            </Section>
          ) : null}

          <Section title="Align">
            <div className="segmented">
              <button onClick={() => align(nodes, "left")}><AlignLeft size={14} /></button>
              <button onClick={() => align(nodes, "center")}><AlignCenter size={14} /></button>
              <button onClick={() => align(nodes, "right")}><AlignRight size={14} /></button>
              <button onClick={() => distribute(nodes)}><AlignHorizontalSpaceAround size={14} /></button>
            </div>
          </Section>

          <Section title="Export">
            <div className="export-row">
              <button onClick={() => exportJson(document)}><FileJson size={14} /> JSON</button>
              <button onClick={() => downloadSelectionPng(document)}><ImageDown size={14} /> PNG</button>
              <button onClick={() => downloadSelectionSvg(document)}><Download size={14} /> SVG</button>
            </div>
          </Section>
        </>
      )}
    </aside>
  );
}

function EmptyInspector() {
  return (
    <div className="empty-panel">
      <p>Select a layer or draw with the toolbar. Paste and drop images directly onto the canvas.</p>
    </div>
  );
}

function Section({ title, children }: Readonly<{ title: string; children: React.ReactNode }>) {
  return (
    <section className="inspector-section">
      <h3>{title}</h3>
      {children}
    </section>
  );
}

function NumberGrid({ children }: Readonly<{ children: React.ReactNode }>) {
  return <div className="number-grid">{children}</div>;
}

function NumberField({ label, value, step = 1, onChange }: Readonly<{ label: string; value: number | "Mixed"; step?: number; onChange(value: number): void }>) {
  return (
    <label className="number-field">
      <span>{label}</span>
      <input type="number" step={step} value={value === "Mixed" ? "" : round(value)} placeholder={value === "Mixed" ? "Mixed" : undefined} onChange={(event) => onChange(Number(event.target.value))} />
    </label>
  );
}

function mixed<T extends "x" | "y" | "width" | "height" | "rotation" | "opacity">(nodes: readonly SceneNode[], key: T): number | "Mixed" {
  const first = nodes[0]?.[key];
  return nodes.every((node) => node[key] === first) ? first ?? 0 : "Mixed";
}

function patchOne(node: SceneNode, patch: Record<string, unknown>): void {
  useEditorStore.getState().execute(updateNodeCommand("Change property", node.id, Object.fromEntries(Object.keys(patch).map((key) => [key, node[key as keyof SceneNode]])), patch));
}

function patchMany(nodes: readonly SceneNode[], patch: Record<string, unknown>): void {
  const before = Object.fromEntries(nodes.map((node) => [node.id, Object.fromEntries(Object.keys(patch).map((key) => [key, node[key as keyof SceneNode]]))]));
  const after = Object.fromEntries(nodes.map((node) => [node.id, patch]));
  useEditorStore.getState().execute(updateManyCommand("Change properties", before, after));
}

function align(nodes: readonly SceneNode[], mode: "left" | "center" | "right"): void {
  if (nodes.length < 2) return;
  const left = Math.min(...nodes.map((node) => node.x));
  const right = Math.max(...nodes.map((node) => node.x + node.width));
  const center = (left + right) / 2;
  const after = Object.fromEntries(nodes.map((node) => [node.id, { x: mode === "left" ? left : mode === "right" ? right - node.width : center - node.width / 2 }]));
  const before = Object.fromEntries(nodes.map((node) => [node.id, { x: node.x }]));
  useEditorStore.getState().execute(updateManyCommand("Align", before, after));
}

function distribute(nodes: readonly SceneNode[]): void {
  if (nodes.length < 3) return;
  const sorted = [...nodes].sort((a, b) => a.x - b.x);
  const left = sorted[0].x;
  const right = sorted[sorted.length - 1].x + sorted[sorted.length - 1].width;
  const total = sorted.reduce((sum, node) => sum + node.width, 0);
  const gap = (right - left - total) / (sorted.length - 1);
  let cursor = left;
  const after: Record<NodeId, { x: number }> = {};
  const before: Record<NodeId, { x: number }> = {};
  for (const node of sorted) {
    before[node.id] = { x: node.x };
    after[node.id] = { x: cursor };
    cursor += node.width + gap;
  }
  useEditorStore.getState().execute(updateManyCommand("Distribute", before, after));
}

function defaultLayout() {
  return { direction: "vertical" as const, gap: 12, padding: { top: 16, right: 16, bottom: 16, left: 16 }, alignItems: "stretch" as const, justifyContent: "start" as const, hugContents: false };
}

function round(value: number): number {
  return Math.round(value * 100) / 100;
}
