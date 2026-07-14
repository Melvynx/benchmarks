import {
  ChevronDown,
  ChevronRight,
  Eye,
  EyeOff,
  Frame as FrameIcon,
  Square,
  Circle,
  Type,
  Minus,
  Image as ImageIcon,
  Lock,
  Unlock,
  Pentagon,
  Search,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { useStore, setSelection } from '../state/store';
import {
  reparent,
  renameNode,
  setVisibility,
  setLocked,
} from '../state/actions';
import type { NodeId, SceneNode } from '../core/scene';
import { isFrame } from '../core/scene';

const iconFor = (n: SceneNode): React.ElementType => {
  switch (n.type) {
    case 'frame':
      return FrameIcon;
    case 'rectangle':
      return Square;
    case 'ellipse':
      return Circle;
    case 'polygon':
      return Pentagon;
    case 'line':
      return Minus;
    case 'text':
      return Type;
    case 'image':
      return ImageIcon;
  }
};

export const LeftPanel = (): JSX.Element => {
  const open = useStore((s) => s.leftPanelOpen);
  const [search, setSearch] = useState('');
  if (!open) return <div className="w-0" />;

  return (
    <div
      className="w-60 bg-panel-bg border-r border-panel-divider flex flex-col chrome-no-select"
      style={{ zIndex: 20 }}
    >
      <div className="h-10 flex items-center px-3 border-b border-panel-divider">
        <div className="flex items-center gap-1.5 flex-1 min-w-0 bg-panel-bgRaised rounded px-2">
          <Search size={12} className="text-text-tertiary" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="bg-transparent text-xs text-text-primary placeholder:text-text-tertiary w-full py-1 outline-none"
            placeholder="Find layer..."
          />
        </div>
      </div>
      <div className="flex-1 overflow-auto no-focus-ring py-1" tabIndex={0}>
        <LayerTree search={search} />
      </div>
    </div>
  );
};

const LayerTree = ({ search }: { search: string }): JSX.Element => {
  const doc = useStore((s) => s.doc);
  const selection = useStore((s) => s.selection);
  const page = doc.pages[doc.currentPageId];
  if (!page) return <div />;

  const expanded = useExpanded();
  const [dropTarget, setDropTarget] = useState<NodeId | null>(null);

  const matches = useMemo(() => {
    if (!search.trim()) return null;
    const query = search.toLowerCase();
    const out = new Set<NodeId>();
    for (const id in doc.nodes) {
      const n = doc.nodes[id]!;
      if (n.name.toLowerCase().includes(query)) out.add(id);
    }
    return out;
  }, [search, doc.nodes]);

  const handleDrop = (targetId: NodeId | null, dragId: NodeId) => {
    if (!dragId) return;
    reparent([dragId], targetId);
    setDropTarget(null);
  };

  return (
    <div>
      {[...page.children].reverse().map((id) => (
        <LayerRow
          key={id}
          id={id}
          depth={0}
          doc={doc}
          selection={selection}
          expanded={expanded}
          matches={matches}
          dropTarget={dropTarget}
          setDropTarget={setDropTarget}
          onDrop={handleDrop}
        />
      ))}
    </div>
  );
};

const useExpanded = () => {
  const [map, setMap] = useState<Record<NodeId, boolean>>({});
  const isOpen = (id: NodeId) => map[id] ?? true;
  const toggle = (id: NodeId) => setMap((m) => ({ ...m, [id]: !isOpen(id) }));
  return { isOpen, toggle };
};

const LayerRow = ({
  id,
  depth,
  doc,
  selection,
  expanded,
  matches,
  dropTarget,
  setDropTarget,
  onDrop,
}: {
  id: NodeId;
  depth: number;
  doc: import('../core/scene').Document;
  selection: NodeId[];
  expanded: ReturnType<typeof useExpanded>;
  matches: Set<NodeId> | null;
  dropTarget: NodeId | null;
  setDropTarget: (id: NodeId | null) => void;
  onDrop: (targetId: NodeId | null, dragId: NodeId) => void;
}): JSX.Element | null => {
  const [renaming, setRenaming] = useState(false);
  const node = doc.nodes[id];
  if (!node) return null;
  if (matches && !matches.has(id) && !doesSubtreeMatch(doc, id, matches)) return null;

  const Icon = iconFor(node);
  const selected = selection.includes(id);
  const hasChildren = isFrame(node) && node.children.length > 0;
  const isOpen = expanded.isOpen(id);
  const effectiveVisible = node.visible;
  const dropHighlight = dropTarget === id;

  return (
    <div>
      <div
        className={`layer-row group ${selected ? 'selected' : ''} ${dropHighlight ? 'ring-1 ring-accent' : ''}`}
        style={{ paddingLeft: 8 + depth * 12 }}
        onMouseDown={(e) => {
          if (e.shiftKey) {
            setSelection(
              selection.includes(id) ? selection.filter((s) => s !== id) : [...selection, id],
            );
          } else {
            setSelection([id]);
          }
        }}
        onDoubleClick={() => setRenaming(true)}
        draggable
        onDragStart={(e) => {
          e.dataTransfer.setData('application/x-vector-node', id);
          e.dataTransfer.effectAllowed = 'move';
        }}
        onDragOver={(e) => {
          if (isFrame(node)) {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';
            setDropTarget(id);
          }
        }}
        onDragLeave={() => {
          if (dropTarget === id) setDropTarget(null);
        }}
        onDrop={(e) => {
          e.preventDefault();
          const dragId = e.dataTransfer.getData('application/x-vector-node');
          if (dragId && isFrame(node) && dragId !== id) onDrop(id, dragId);
        }}
      >
        {hasChildren ? (
          <button
            className="w-3.5 h-3.5 flex items-center justify-center text-text-tertiary hover:text-text-primary"
            onClick={(e) => {
              e.stopPropagation();
              expanded.toggle(id);
            }}
          >
            {isOpen ? <ChevronDown size={10} /> : <ChevronRight size={10} />}
          </button>
        ) : (
          <div className="w-3.5 h-3.5" />
        )}
        <Icon size={12} className="shrink-0 text-text-tertiary" />
        {renaming ? (
          <input
            autoFocus
            defaultValue={node.name}
            className="bg-panel-bgRaised text-text-primary text-xs px-1 py-0.5 rounded outline-none flex-1 min-w-0"
            onBlur={(e) => {
              renameNode(id, e.target.value.trim() || node.name);
              setRenaming(false);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') e.currentTarget.blur();
              if (e.key === 'Escape') setRenaming(false);
              e.stopPropagation();
            }}
          />
        ) : (
          <span className="flex-1 min-w-0 truncate">{node.name}</span>
        )}
        <div className="opacity-0 group-hover:opacity-100 flex items-center gap-0.5 transition-opacity">
          <button
            className="w-5 h-5 flex items-center justify-center text-text-tertiary hover:text-text-primary"
            onClick={(e) => {
              e.stopPropagation();
              setLocked(id, !node.locked);
            }}
            title={node.locked ? 'Unlock' : 'Lock'}
          >
            {node.locked ? <Lock size={11} /> : <Unlock size={11} />}
          </button>
          <button
            className="w-5 h-5 flex items-center justify-center text-text-tertiary hover:text-text-primary"
            onClick={(e) => {
              e.stopPropagation();
              setVisibility(id, !effectiveVisible);
            }}
            title={effectiveVisible ? 'Hide' : 'Show'}
          >
            {effectiveVisible ? <Eye size={11} /> : <EyeOff size={11} />}
          </button>
        </div>
      </div>
      {isFrame(node) && isOpen && hasChildren && (
        <div>
          {[...node.children].reverse().map((cid) => (
            <LayerRow
              key={cid}
              id={cid}
              depth={depth + 1}
              doc={doc}
              selection={selection}
              expanded={expanded}
              matches={matches}
              dropTarget={dropTarget}
              setDropTarget={setDropTarget}
              onDrop={onDrop}
            />
          ))}
        </div>
      )}
    </div>
  );
};

const doesSubtreeMatch = (
  doc: import('../core/scene').Document,
  id: NodeId,
  matches: Set<NodeId>,
): boolean => {
  if (matches.has(id)) return true;
  const n = doc.nodes[id];
  if (!n || !isFrame(n)) return false;
  for (const c of n.children) if (doesSubtreeMatch(doc, c, matches)) return true;
  return false;
};
