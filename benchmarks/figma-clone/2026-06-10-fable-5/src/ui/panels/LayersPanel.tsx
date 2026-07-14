import { memo, useEffect, useMemo, useRef, useState, type JSX } from 'react';
import type { NodeId, SceneDocument, SceneNode } from '../../scene/types';
import { childIdsOf, isContainer } from '../../scene/types';
import { ancestorIds, paintOrderIds } from '../../scene/traversal';
import { renameNode, reparentNodes, toggleLock, toggleVisibility } from '../../store/actions';
import { setHover, setSelection, useEditor, editorStore } from '../../store/store';
import {
  IChevronDown,
  IChevronRight,
  IEllipse,
  IEye,
  IEyeOff,
  IFolder,
  IFrame,
  IImage,
  ILine,
  ILock,
  IPolygon,
  IRect,
  ISearch,
  IStar,
  IText,
  IUnlock,
} from '../icons';

const ROW_HEIGHT = 28;

interface Row {
  id: NodeId;
  depth: number;
  isContainer: boolean;
  expanded: boolean;
}

interface DragState {
  ids: NodeId[];
  /** Visual indicator: a line between rows or a container highlight. */
  target:
    | { kind: 'between'; displayIndex: number; parentId: NodeId | null; insertIndex: number }
    | { kind: 'inside'; containerId: NodeId }
    | null;
}

function typeIcon(node: SceneNode): JSX.Element {
  if (node.type === 'rect' && node.fills.some((f) => f.enabled && f.type === 'image')) return <IImage size={12} />;
  switch (node.type) {
    case 'frame':
      return <IFrame size={12} />;
    case 'group':
      return <IFolder size={12} />;
    case 'rect':
      return <IRect size={12} />;
    case 'ellipse':
      return <IEllipse size={12} />;
    case 'line':
      return <ILine size={12} />;
    case 'polygon':
      return <IPolygon size={12} />;
    case 'star':
      return <IStar size={12} />;
    case 'text':
      return <IText size={12} />;
  }
}

function buildRows(doc: SceneDocument, expanded: ReadonlySet<NodeId>, query: string): Row[] {
  const rows: Row[] = [];
  const q = query.trim().toLowerCase();
  if (q !== '') {
    for (const id of [...paintOrderIds(doc)].reverse()) {
      const node = doc.nodes[id];
      if (node && node.name.toLowerCase().includes(q)) {
        rows.push({ id, depth: 0, isContainer: false, expanded: false });
      }
    }
    return rows;
  }
  const visit = (ids: readonly NodeId[], depth: number): void => {
    for (let i = ids.length - 1; i >= 0; i--) {
      const id = ids[i];
      const node = id ? doc.nodes[id] : undefined;
      if (!id || !node) continue;
      const container = isContainer(node);
      const isExpanded = container && expanded.has(id);
      rows.push({ id, depth, isContainer: container, expanded: isExpanded });
      if (isExpanded) visit(childIdsOf(node), depth + 1);
    }
  };
  visit(doc.rootIds, 0);
  return rows;
}

export function LayersPanel(): JSX.Element {
  const doc = useEditor((s) => s.doc);
  const selection = useEditor((s) => s.selection);
  const hoverId = useEditor((s) => s.hoverId);
  const [query, setQuery] = useState('');
  const [expanded, setExpanded] = useState<ReadonlySet<NodeId>>(() => new Set());
  const [drag, setDrag] = useState<DragState | null>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Keep ancestors of the selection expanded so it is always visible.
  useEffect(() => {
    if (selection.length === 0) return;
    setExpanded((prev) => {
      let next: Set<NodeId> | null = null;
      for (const id of selection) {
        for (const ancestor of ancestorIds(doc, id)) {
          if (!prev.has(ancestor)) {
            next = next ?? new Set(prev);
            next.add(ancestor);
          }
        }
      }
      return next ?? prev;
    });
  }, [selection, doc]);

  const rows = useMemo(() => buildRows(doc, expanded, query), [doc, expanded, query]);

  const toggleExpand = (id: NodeId): void => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const onRowSelect = (id: NodeId, e: React.PointerEvent): void => {
    const current = editorStore.getState().selection;
    if (e.shiftKey || e.metaKey || e.ctrlKey) {
      setSelection(current.includes(id) ? current.filter((s) => s !== id) : [...current, id]);
    } else if (!current.includes(id)) {
      setSelection([id]);
    }
  };

  // -------------------------------------------------------------------------
  // Drag & drop (pointer-based)
  // -------------------------------------------------------------------------

  const beginDrag = (id: NodeId, e: React.PointerEvent): void => {
    if (query !== '') return; // no DnD inside search results
    if (e.button !== 0) return;
    const startY = e.clientY;
    const startX = e.clientX;
    let started = false;

    const move = (ev: PointerEvent): void => {
      if (!started && Math.hypot(ev.clientY - startY, ev.clientX - startX) < 4) return;
      if (!started) {
        started = true;
        const current = editorStore.getState().selection;
        const ids = current.includes(id) ? current : [id];
        setDrag({ ids, target: null });
      }
      const list = listRef.current;
      if (!list) return;
      const rect = list.getBoundingClientRect();
      const y = ev.clientY - rect.top + list.scrollTop;
      const fraction = y / ROW_HEIGHT;
      const rowIndex = Math.floor(fraction);
      const within = fraction - rowIndex;

      const state = editorStore.getState();
      const currentRows = buildRows(state.doc, expanded, '');
      const dragIds = state.selection.includes(id) ? state.selection : [id];
      const dragSet = new Set(dragIds);

      let target: DragState['target'] = null;
      if (rowIndex >= currentRows.length) {
        // Below everything → drop at the bottom of the root stack.
        target = { kind: 'between', displayIndex: currentRows.length, parentId: null, insertIndex: 0 };
      } else {
        const row = currentRows[rowIndex];
        if (row && !dragSet.has(row.id) && !ancestorIds(state.doc, row.id).some((a) => dragSet.has(a))) {
          const node = state.doc.nodes[row.id];
          if (node && row.isContainer && within > 0.3 && within < 0.7) {
            target = { kind: 'inside', containerId: row.id };
          } else if (node) {
            const after = within >= 0.5; // visually below the row
            const parentId = node.parentId;
            const siblings = parentId === null ? state.doc.rootIds : childIdsOf(state.doc.nodes[parentId] ?? node);
            const idx = siblings.indexOf(row.id);
            // Display is reverse z-order: "above" a row = higher index.
            const insertIndex = after ? idx : idx + 1;
            target = { kind: 'between', displayIndex: rowIndex + (after ? 1 : 0), parentId, insertIndex };
          }
        }
      }
      setDrag({ ids: dragIds, target });
    };

    const up = (): void => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      setDrag((current) => {
        if (current?.target) {
          if (current.target.kind === 'inside') {
            const container = editorStore.getState().doc.nodes[current.target.containerId];
            reparentNodes(current.ids, current.target.containerId, container ? childIdsOf(container).length : 0);
            setExpanded((prev) => new Set(prev).add((current.target as { containerId: NodeId }).containerId));
          } else {
            reparentNodes(current.ids, current.target.parentId, current.target.insertIndex);
          }
        }
        return null;
      });
    };

    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  };

  const indicatorIndex = drag?.target?.kind === 'between' ? drag.target.displayIndex : null;
  const insideId = drag?.target?.kind === 'inside' ? drag.target.containerId : null;

  return (
    <aside className="panel layers-panel">
      <div className="layers-search">
        <ISearch size={13} />
        <input
          placeholder="Search layers…"
          value={query}
          spellCheck={false}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.stopPropagation()}
        />
        {query !== '' && (
          <button className="icon-btn" onClick={() => setQuery('')} title="Clear search">
            ✕
          </button>
        )}
      </div>
      <div className="layers-list" ref={listRef} onPointerLeave={() => setHover(null)}>
        {rows.length === 0 && <div className="layers-empty">{query ? 'No matches' : 'No layers yet'}</div>}
        {rows.map((row, i) => {
          const node = doc.nodes[row.id];
          if (!node) return null;
          return (
            <LayerRow
              key={row.id}
              node={node}
              depth={row.depth}
              isContainer={row.isContainer}
              expanded={row.expanded}
              selected={selection.includes(row.id)}
              hovered={hoverId === row.id}
              dimmed={drag?.ids.includes(row.id) ?? false}
              dropInside={insideId === row.id}
              showIndicatorAbove={indicatorIndex === i}
              onToggleExpand={toggleExpand}
              onSelect={onRowSelect}
              onBeginDrag={beginDrag}
            />
          );
        })}
        {indicatorIndex === rows.length && <div className="drop-indicator" />}
      </div>
    </aside>
  );
}

interface LayerRowProps {
  node: SceneNode;
  depth: number;
  isContainer: boolean;
  expanded: boolean;
  selected: boolean;
  hovered: boolean;
  dimmed: boolean;
  dropInside: boolean;
  showIndicatorAbove: boolean;
  onToggleExpand: (id: NodeId) => void;
  onSelect: (id: NodeId, e: React.PointerEvent) => void;
  onBeginDrag: (id: NodeId, e: React.PointerEvent) => void;
}

const LayerRow = memo(function LayerRow({
  node,
  depth,
  isContainer: container,
  expanded,
  selected,
  hovered,
  dimmed,
  dropInside,
  showIndicatorAbove,
  onToggleExpand,
  onSelect,
  onBeginDrag,
}: LayerRowProps): JSX.Element {
  const [renaming, setRenaming] = useState(false);

  return (
    <>
      {showIndicatorAbove && <div className="drop-indicator" />}
      <div
        className={[
          'layer-row',
          selected ? 'is-selected' : '',
          hovered ? 'is-hovered' : '',
          dimmed ? 'is-dragging' : '',
          dropInside ? 'is-drop-target' : '',
          !node.visible ? 'is-hidden' : '',
        ]
          .filter(Boolean)
          .join(' ')}
        style={{ paddingLeft: 8 + depth * 14 }}
        onPointerDown={(e) => {
          onSelect(node.id, e);
          onBeginDrag(node.id, e);
        }}
        onPointerEnter={() => setHover(node.id)}
        onDoubleClick={() => setRenaming(true)}
      >
        <button
          className={`layer-chevron${container ? '' : ' is-leaf'}`}
          onPointerDown={(e) => e.stopPropagation()}
          onClick={() => container && onToggleExpand(node.id)}
          tabIndex={-1}
        >
          {container ? expanded ? <IChevronDown size={10} /> : <IChevronRight size={10} /> : null}
        </button>
        <span className="layer-icon">{typeIcon(node)}</span>
        {renaming ? (
          <input
            className="layer-rename"
            autoFocus
            defaultValue={node.name}
            spellCheck={false}
            onFocus={(e) => e.target.select()}
            onPointerDown={(e) => e.stopPropagation()}
            onKeyDown={(e) => {
              e.stopPropagation();
              if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
              if (e.key === 'Escape') {
                (e.target as HTMLInputElement).value = node.name;
                (e.target as HTMLInputElement).blur();
              }
            }}
            onBlur={(e) => {
              setRenaming(false);
              if (e.target.value !== node.name) renameNode(node.id, e.target.value);
            }}
          />
        ) : (
          <span className="layer-name">{node.name}</span>
        )}
        <span className="layer-actions" onPointerDown={(e) => e.stopPropagation()}>
          <button
            className={`icon-btn layer-action${node.locked ? ' is-on' : ''}`}
            title={node.locked ? 'Unlock' : 'Lock'}
            onClick={() => toggleLock([node.id])}
          >
            {node.locked ? <ILock size={12} /> : <IUnlock size={12} />}
          </button>
          <button
            className={`icon-btn layer-action${!node.visible ? ' is-on' : ''}`}
            title={node.visible ? 'Hide' : 'Show'}
            onClick={() => toggleVisibility([node.id])}
          >
            {node.visible ? <IEye size={12} /> : <IEyeOff size={12} />}
          </button>
        </span>
      </div>
    </>
  );
});
