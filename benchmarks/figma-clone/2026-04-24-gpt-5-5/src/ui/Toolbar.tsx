import {
  Circle,
  Frame,
  Hand,
  Image,
  Layers,
  LineChart,
  MessageSquare,
  MousePointer2,
  PenLine,
  Redo2,
  Square,
  Type,
  Undo2,
} from "lucide-react";
import type { Tool } from "../types/nodes";
import { useEditorStore } from "../state/editorStore";

const tools: readonly { id: Tool; label: string; shortcut: string; icon: typeof MousePointer2 }[] = [
  { id: "select", label: "Move", shortcut: "V", icon: MousePointer2 },
  { id: "hand", label: "Hand", shortcut: "H", icon: Hand },
  { id: "frame", label: "Frame", shortcut: "F", icon: Frame },
  { id: "rectangle", label: "Rectangle", shortcut: "R", icon: Square },
  { id: "ellipse", label: "Ellipse", shortcut: "O", icon: Circle },
  { id: "line", label: "Line", shortcut: "L", icon: LineChart },
  { id: "polygon", label: "Star", shortcut: "S", icon: PenLine },
  { id: "text", label: "Text", shortcut: "T", icon: Type },
  { id: "image", label: "Image", shortcut: "I", icon: Image },
  { id: "comment", label: "Comment", shortcut: "C", icon: MessageSquare },
];

export function Toolbar() {
  const tool = useEditorStore((state) => state.tool);
  const setTool = useEditorStore((state) => state.setTool);
  const undo = useEditorStore((state) => state.undo);
  const redo = useEditorStore((state) => state.redo);
  return (
    <header className="toolbar">
      <div className="brand">
        <Layers size={17} />
        <span>Atelier Vector</span>
        <span className="model-badge">GPT 5.5</span>
      </div>
      <div className="tool-group" role="toolbar" aria-label="Tools">
        {tools.map((item) => {
          const Icon = item.icon;
          return (
            <button key={item.id} className={tool === item.id ? "icon-button active" : "icon-button"} title={`${item.label} (${item.shortcut})`} onClick={() => setTool(item.id)}>
              <Icon size={17} />
            </button>
          );
        })}
      </div>
      <div className="tool-group">
        <button className="icon-button" title="Undo" onClick={undo}>
          <Undo2 size={17} />
        </button>
        <button className="icon-button" title="Redo" onClick={redo}>
          <Redo2 size={17} />
        </button>
        <button className="toolbar-command" onClick={() => window.dispatchEvent(new Event("atelier:export-json"))}>Export</button>
      </div>
    </header>
  );
}
