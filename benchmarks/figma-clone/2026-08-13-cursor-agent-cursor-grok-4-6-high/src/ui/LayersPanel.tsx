import { isParent } from "../core/factories";
import { activePage } from "../core/scene";
import {
  patchUi,
  renameNode,
  reorderNode,
  setSelection,
  toggleLocked,
  toggleVisible,
  viewDocument,
} from "../core/store";
import type { NodeId } from "../core/types";
import { ICONS, Icon } from "./Icon";
import { useEditor } from "./use-editor";

export function LayersPanel() {
  const doc = useEditor((s) => s.document);
  const selection = useEditor((s) => s.selection);
  const query = useEditor((s) => s.ui.layerQuery);
  const renaming = useEditor((s) => s.ui.renamingId);
  const page = activePage(doc);

  return (
    <aside className="panel left">
      <div className="panel-head">Layers</div>
      <div className="panel-body">
        <input
          className="search"
          placeholder="Search layers"
          value={query}
          onChange={(e) => patchUi({ layerQuery: e.target.value })}
        />
        {page.children.length === 0 && (
          <div className="empty">Draw a frame or shape. F, R, O, T, or drop an image.</div>
        )}
        {page.children.map((id, i) => (
          <LayerRow
            key={id}
            id={id}
            depth={0}
            index={i}
            parentId={null}
            query={query.toLowerCase()}
            selection={selection}
            renaming={renaming}
          />
        ))}
      </div>
    </aside>
  );
}

function LayerRow({
  id,
  depth,
  index,
  parentId,
  query,
  selection,
  renaming,
}: {
  id: NodeId;
  depth: number;
  index: number;
  parentId: NodeId | null;
  query: string;
  selection: NodeId[];
  renaming: NodeId | null;
}) {
  const node = viewDocument().nodes[id];
  if (!node) return null;
  const match = !query || node.name.toLowerCase().includes(query);
  const kids = isParent(node) ? node.children : [];
  const childMatch = kids.some((cid) => layerMatches(cid, query));
  if (!match && !childMatch) return null;

  return (
    <>
      <div
        className={`layer${selection.includes(id) ? " selected" : ""}`}
        style={{ paddingLeft: 6 + depth * 12 }}
        draggable
        onDragStart={(e) => {
          e.dataTransfer.setData("text/layer-id", id);
        }}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          const src = e.dataTransfer.getData("text/layer-id");
          if (src) reorderNode(src, parentId, index);
        }}
        onClick={(e) => setSelection([id], e.shiftKey)}
        onDoubleClick={() => patchUi({ renamingId: id })}
      >
        <span className="layer-name">
          {renaming === id ? (
            <input
              autoFocus
              defaultValue={node.name}
              onBlur={(e) => {
                renameNode(id, e.target.value);
                patchUi({ renamingId: null });
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") (e.target as HTMLInputElement).blur();
              }}
            />
          ) : (
            node.name
          )}
        </span>
        <button className="icon-btn" title="Visibility" onClick={(e) => { e.stopPropagation(); toggleVisible([id]); }}>
          <Icon d={ICONS.eye} size={14} />
        </button>
        <button className="icon-btn" title="Lock" onClick={(e) => { e.stopPropagation(); toggleLocked([id]); }}>
          <Icon d={ICONS.lock} size={14} />
        </button>
      </div>
      {kids.map((cid, i) => (
        <LayerRow
          key={cid}
          id={cid}
          depth={depth + 1}
          index={i}
          parentId={id}
          query={query}
          selection={selection}
          renaming={renaming}
        />
      ))}
    </>
  );
}

function layerMatches(id: NodeId, query: string): boolean {
  if (!query) return true;
  const n = viewDocument().nodes[id];
  if (!n) return false;
  if (n.name.toLowerCase().includes(query)) return true;
  if (isParent(n)) return n.children.some((c) => layerMatches(c, query));
  return false;
}
