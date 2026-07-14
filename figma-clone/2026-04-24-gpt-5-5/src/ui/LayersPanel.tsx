import { ChevronDown, Eye, EyeOff, Lock, Search, Unlock } from "lucide-react";
import { useMemo, useState } from "react";
import { reorderCommand, updateNodeCommand } from "../commands/commands";
import { getChildren } from "../scene/graph";
import { useEditorStore } from "../state/editorStore";
import type { EditorDocument, NodeId, SceneNode } from "../types/nodes";

type Props = Readonly<{ document: EditorDocument }>;

export function LayersPanel({ document }: Props) {
  const [query, setQuery] = useState("");
  const [renaming, setRenaming] = useState<NodeId | null>(null);
  const selection = document.selection;
  const rootChildren = useMemo(() => getChildren(document, document.rootId).reverse(), [document]);

  return (
    <aside className="panel layers-panel">
      <div className="panel-heading">
        <h2>Layers</h2>
        <span>{Object.keys(document.nodes).length - 1}</span>
      </div>
      <label className="search">
        <Search size={14} />
        <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search layers" />
      </label>
      <div className="layer-tree">
        {rootChildren.map((node) => (
          <LayerRow key={node.id} document={document} node={node} depth={0} query={query} selected={selection.includes(node.id)} renaming={renaming} setRenaming={setRenaming} />
        ))}
      </div>
    </aside>
  );
}

type RowProps = Readonly<{
  document: EditorDocument;
  node: SceneNode;
  depth: number;
  query: string;
  selected: boolean;
  renaming: NodeId | null;
  setRenaming(id: NodeId | null): void;
}>;

function LayerRow({ document, node, depth, query, selected, renaming, setRenaming }: RowProps) {
  const store = useEditorStore();
  const [open, setOpen] = useState(true);
  const children = getChildren(document, node.id).reverse();
  const matches = query.trim() === "" || node.name.toLowerCase().includes(query.toLowerCase());
  if (!matches && !children.some((child) => child.name.toLowerCase().includes(query.toLowerCase()))) return null;
  return (
    <div>
      <div
        className={selected ? "layer-row selected" : "layer-row"}
        style={{ paddingLeft: 8 + depth * 14 }}
        draggable
        onDragStart={(event) => event.dataTransfer.setData("text/layer-id", node.id)}
        onDragOver={(event) => event.preventDefault()}
        onDrop={(event) => {
          event.preventDefault();
          const draggedId = event.dataTransfer.getData("text/layer-id");
          const dragged = document.nodes[draggedId];
          if (!dragged || dragged.parentId !== node.parentId || !node.parentId) return;
          const parent = document.nodes[node.parentId];
          const before = parent.children;
          const after = [...before.filter((id) => id !== draggedId)];
          after.splice(after.indexOf(node.id), 0, draggedId);
          store.execute(reorderCommand(parent.id, before, after));
        }}
        onClick={() => store.select([node.id])}
        onDoubleClick={() => setRenaming(node.id)}
      >
        <button className="disclosure" onClick={(event) => { event.stopPropagation(); setOpen(!open); }}>
          {children.length ? <ChevronDown size={13} className={open ? "" : "closed"} /> : null}
        </button>
        {renaming === node.id ? (
          <input
            className="rename"
            defaultValue={node.name}
            autoFocus
            onBlur={(event) => {
              store.execute(updateNodeCommand("Rename", node.id, { name: node.name }, { name: event.target.value || node.name }));
              setRenaming(null);
            }}
            onKeyDown={(event) => {
              if (event.key === "Enter") event.currentTarget.blur();
              if (event.key === "Escape") setRenaming(null);
            }}
          />
        ) : (
          <span className="layer-name">{node.name}</span>
        )}
        <button className="row-icon" title={node.visible ? "Hide" : "Show"} onClick={(event) => {
          event.stopPropagation();
          store.execute(updateNodeCommand(node.visible ? "Hide" : "Show", node.id, { visible: node.visible }, { visible: !node.visible }));
        }}>
          {node.visible ? <Eye size={13} /> : <EyeOff size={13} />}
        </button>
        <button className="row-icon" title={node.locked ? "Unlock" : "Lock"} onClick={(event) => {
          event.stopPropagation();
          store.execute(updateNodeCommand(node.locked ? "Unlock" : "Lock", node.id, { locked: node.locked }, { locked: !node.locked }));
        }}>
          {node.locked ? <Lock size={13} /> : <Unlock size={13} />}
        </button>
      </div>
      {open ? children.map((child) => (
        <LayerRow key={child.id} document={document} node={child} depth={depth + 1} query={query} selected={document.selection.includes(child.id)} renaming={renaming} setRenaming={setRenaming} />
      )) : null}
    </div>
  );
}
