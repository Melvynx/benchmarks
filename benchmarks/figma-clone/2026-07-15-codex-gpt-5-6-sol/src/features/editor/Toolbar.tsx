import { editorStore, useEditorStore } from "../../core/store";
import type { Tool } from "../../core/types";
import { IconButton } from "../../ui/Controls";
import type { IconName } from "../../ui/Icon";

const tools: readonly { tool: Tool; icon: IconName; label: string; shortcut: string }[] = [
  { tool: "select", icon: "arrow", label: "Move", shortcut: "V" },
  { tool: "frame", icon: "frame", label: "Frame", shortcut: "F" },
  { tool: "rectangle", icon: "rectangle", label: "Rectangle", shortcut: "R" },
  { tool: "ellipse", icon: "circle", label: "Ellipse", shortcut: "O" },
  { tool: "line", icon: "line", label: "Line", shortcut: "L" },
  { tool: "star", icon: "star", label: "Star", shortcut: "S" },
  { tool: "text", icon: "text", label: "Text", shortcut: "T" },
  { tool: "hand", icon: "hand", label: "Hand", shortcut: "H" },
  { tool: "comment", icon: "comment", label: "Comment", shortcut: "C" },
];

export function Toolbar() {
  const activeTool = useEditorStore((state) => state.tool);
  return (
    <div className="toolbar" role="toolbar" aria-label="Editor tools">
      {tools.map((item, index) => (
        <div className={index === 1 || index === 7 ? "toolbar-item toolbar-divider" : "toolbar-item"} key={item.tool}>
          <IconButton active={activeTool === item.tool} icon={item.icon} label={`${item.label}  ${item.shortcut}`} onClick={() => editorStore.setTool(item.tool)} />
        </div>
      ))}
    </div>
  );
}
