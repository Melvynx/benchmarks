import type { Tool } from "../core/types";
import { setTool } from "../core/store";
import { ICONS, Icon } from "./Icon";
import { useEditor } from "./use-editor";

const TOOLS: { id: Tool; icon: keyof typeof ICONS; title: string }[] = [
  { id: "select", icon: "select", title: "Move (V)" },
  { id: "hand", icon: "hand", title: "Hand (H)" },
  { id: "frame", icon: "frame", title: "Frame (F)" },
  { id: "rectangle", icon: "rect", title: "Rectangle (R)" },
  { id: "ellipse", icon: "ellipse", title: "Ellipse (O)" },
  { id: "line", icon: "line", title: "Line (L)" },
  { id: "polygon", icon: "polygon", title: "Polygon (Y)" },
  { id: "star", icon: "star", title: "Star" },
  { id: "pen", icon: "pen", title: "Pen (P)" },
  { id: "text", icon: "text", title: "Text (T)" },
  { id: "comment", icon: "comment", title: "Comment (K)" },
  { id: "prototype", icon: "proto", title: "Prototype" },
  { id: "zoom", icon: "zoom", title: "Zoom (Z)" },
];

export function Toolbar() {
  const tool = useEditor((s) => s.tool);
  return (
    <nav className="toolbar" aria-label="Tools">
      {TOOLS.map((t) => (
        <button
          key={t.id}
          className={`tool${tool === t.id ? " active" : ""}`}
          title={t.title}
          aria-pressed={tool === t.id}
          onClick={() => setTool(t.id)}
        >
          <Icon d={ICONS[t.icon]} />
        </button>
      ))}
    </nav>
  );
}
