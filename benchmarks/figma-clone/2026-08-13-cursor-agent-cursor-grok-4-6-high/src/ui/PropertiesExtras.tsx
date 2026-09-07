import { colorToCss } from "../core/color";
import { defaultLayout } from "../core/factories";
import { downloadBlob, downloadText, exportSvg } from "../core/export";
import { addColorStyle, getState, updateSelected, viewDocument } from "../core/store";
import { FONT_FAMILIES, FONT_WEIGHTS } from "../core/types";
import type { SceneNode } from "../core/types";
import { drawScene } from "../render/scene-renderer";
import { ColorPicker } from "./ColorPicker";
import { Num } from "./Num";
import { useEditor } from "./use-editor";

export function LayoutEditor({ nodes }: { nodes: SceneNode[] }) {
  const f = nodes.find((n) => n.type === "frame" || n.type === "component");
  if (!f || (f.type !== "frame" && f.type !== "component")) return null;
  return (
    <div className="section">
      <div className="section-title">Auto layout</div>
      <button
        className="btn"
        onClick={() =>
          updateSelected((n) => {
            if (n.type === "frame" || n.type === "component") n.layout = n.layout ? null : defaultLayout();
          }, "Auto layout")
        }
      >
        {f.layout ? "Remove layout" : "Add auto layout"}
      </button>
      {f.layout && (
        <>
          <select
            value={f.layout.direction}
            onChange={(e) =>
              updateSelected((n) => {
                if ((n.type === "frame" || n.type === "component") && n.layout)
                  n.layout.direction = e.target.value as "horizontal" | "vertical";
              }, "Direction")
            }
          >
            <option value="horizontal">Horizontal</option>
            <option value="vertical">Vertical</option>
          </select>
          <Num
            label="Gap"
            value={f.layout.gap}
            onChange={(v) =>
              updateSelected((n) => {
                if ((n.type === "frame" || n.type === "component") && n.layout) n.layout.gap = v;
              }, "Gap")
            }
          />
        </>
      )}
    </div>
  );
}

export function ConstraintsEditor({ nodes }: { nodes: SceneNode[] }) {
  const n = nodes[0];
  if (!n) return null;
  return (
    <div className="section">
      <div className="section-title">Constraints</div>
      <select
        value={n.constraints.horizontal}
        onChange={(e) =>
          updateSelected((node) => {
            node.constraints.horizontal = e.target.value as typeof node.constraints.horizontal;
          }, "Constraint X")
        }
      >
        <option value="left">Left</option>
        <option value="right">Right</option>
        <option value="center">Center</option>
        <option value="left-right">Left and right</option>
        <option value="scale">Scale</option>
      </select>
      <select
        value={n.constraints.vertical}
        onChange={(e) =>
          updateSelected((node) => {
            node.constraints.vertical = e.target.value as typeof node.constraints.vertical;
          }, "Constraint Y")
        }
      >
        <option value="top">Top</option>
        <option value="bottom">Bottom</option>
        <option value="center">Center</option>
        <option value="top-bottom">Top and bottom</option>
        <option value="scale">Scale</option>
      </select>
    </div>
  );
}

export function TextEditor({ nodes }: { nodes: SceneNode[] }) {
  const t = nodes.find((n) => n.type === "text");
  if (!t || t.type !== "text") return null;
  return (
    <div className="section">
      <div className="section-title">Typography</div>
      <select
        value={t.text.fontFamily}
        onChange={(e) => updateSelected((n) => { if (n.type === "text") n.text.fontFamily = e.target.value; }, "Font")}
      >
        {FONT_FAMILIES.map((f) => (
          <option key={f} value={f}>{f}</option>
        ))}
      </select>
      <select
        value={t.text.fontWeight}
        onChange={(e) => updateSelected((n) => { if (n.type === "text") n.text.fontWeight = Number(e.target.value); }, "Weight")}
      >
        {FONT_WEIGHTS.map((w) => (
          <option key={w} value={w}>{w}</option>
        ))}
      </select>
      <Num label="Size" value={t.text.fontSize} onChange={(v) => updateSelected((n) => { if (n.type === "text") n.text.fontSize = v; }, "Size")} />
      <select
        value={t.text.align}
        onChange={(e) => updateSelected((n) => { if (n.type === "text") n.text.align = e.target.value as typeof t.text.align; }, "Align")}
      >
        <option value="left">Left</option>
        <option value="center">Center</option>
        <option value="right">Right</option>
      </select>
      <ColorPicker value={t.text.color} onChange={(c) => updateSelected((n) => { if (n.type === "text") n.text.color = c; }, "Text color")} />
    </div>
  );
}

export function ExportButtons() {
  return (
    <div className="section">
      <div className="section-title">Export</div>
      <button
        className="btn"
        onClick={() => {
          const st = getState();
          const doc = viewDocument();
          const canvas = document.createElement("canvas");
          canvas.width = 1600;
          canvas.height = 1000;
          const ctx = canvas.getContext("2d");
          if (!ctx) return;
          drawScene(ctx, doc, st.camera, { width: 1600, height: 1000, rulers: false, grid: false, pixelPreview: false });
          canvas.toBlob((blob) => { if (blob) downloadBlob(`${doc.name}.png`, blob); }, "image/png");
        }}
      >
        PNG
      </button>
      <button
        className="btn"
        onClick={() => {
          const doc = viewDocument();
          const canvas = document.createElement("canvas");
          const ctx = canvas.getContext("2d");
          downloadText(`${doc.name}.svg`, exportSvg(doc, getState().selection, (font, text) => {
            if (!ctx) return text.length * 7;
            ctx.font = font;
            return ctx.measureText(text).width;
          }), "image/svg+xml");
        }}
      >
        SVG
      </button>
    </div>
  );
}

export function StylesBlock() {
  const styles = useEditor((s) => s.document.colorStyles);
  return (
    <div className="section">
      <div className="section-title">Color styles</div>
      {styles.map((s) => (
        <button
          key={s.id}
          className="btn"
          onClick={() => updateSelected((n) => { n.fills = [structuredClone(s.paint)]; n.fillStyleId = s.id; }, "Style")}
        >
          <span className="swatch" style={{ width: 16, height: 16, display: "inline-block", background: s.paint.type === "solid" ? colorToCss(s.paint.color) : "#888" }} />
          {s.name}
        </button>
      ))}
      <button className="btn" onClick={() => addColorStyle("New style", { r: 0.2, g: 0.25, b: 0.32, a: 1 })}>Save style</button>
    </div>
  );
}
