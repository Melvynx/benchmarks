import {
  ChevronRight,
  Circle,
  Eye,
  EyeOff,
  Frame,
  Group,
  Image as ImageIcon,
  Layers3,
  Lock,
  Minus,
  Pentagon,
  Search,
  Square,
  Star,
  Type,
  Unlock,
  X,
  type LucideIcon,
} from 'lucide-react';
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type DragEvent,
  type KeyboardEvent,
  type MouseEvent,
} from 'react';

import {
  flattenScene,
  getAncestorIds,
  getDescendantIds,
  isContainerNode,
  isDescendantOf,
  type NodeId,
  type SceneDocument,
  type SceneNode,
  type SceneNodeType,
} from '@/core/model';
import { IconButton } from '@/ui/primitives';

const LAYER_DRAG_MIME = 'application/x-gpt-5-6-sol-layers';

const NODE_ICONS: Readonly<Record<SceneNodeType, LucideIcon>> = {
  frame: Frame,
  group: Group,
  rectangle: Square,
  ellipse: Circle,
  line: Minus,
  text: Type,
  image: ImageIcon,
  polygon: Pentagon,
  star: Star,
};

export type LayerDropPlacement = 'before' | 'inside' | 'after' | 'root-end';

export interface LayerMoveRequest {
  readonly nodeIds: readonly NodeId[];
  readonly targetId: NodeId | null;
  readonly targetParentId: NodeId | null;
  readonly targetIndex: number;
  readonly placement: LayerDropPlacement;
}

export interface LayersPanelProps {
  readonly scene: SceneDocument;
  readonly selectedIds: ReadonlySet<NodeId>;
  readonly onSelectionChange: (nodeIds: readonly NodeId[], primaryNodeId: NodeId | null) => void;
  readonly onRename: (nodeId: NodeId, name: string) => void;
  readonly onSetVisibility: (nodeId: NodeId, visible: boolean) => void;
  readonly onSetLocked: (nodeId: NodeId, locked: boolean) => void;
  readonly onMove: (request: LayerMoveRequest) => void;
  readonly className?: string;
}

interface LayerRow {
  readonly node: SceneNode;
  readonly depth: number;
  readonly parentId: NodeId | null;
  readonly index: number;
}

interface DragTarget {
  readonly targetId: NodeId | null;
  readonly placement: LayerDropPlacement;
}

function initialExpandedIds(scene: SceneDocument): ReadonlySet<NodeId> {
  const ids = new Set<NodeId>();
  scene.rootIds.forEach((nodeId) => {
    const node = scene.nodes[nodeId];
    if (node && isContainerNode(node)) ids.add(node.id);
  });
  return ids;
}

function createSearchInclusion(scene: SceneDocument, query: string): ReadonlySet<NodeId> | null {
  const normalizedQuery = query.trim().toLocaleLowerCase();
  if (!normalizedQuery) return null;

  const includedIds = new Set<NodeId>();
  flattenScene(scene).forEach((node) => {
    const searchableText = `${node.name} ${node.type}`.toLocaleLowerCase();
    if (!searchableText.includes(normalizedQuery)) return;
    includedIds.add(node.id);
    getAncestorIds(scene, node.id).forEach((ancestorId) => includedIds.add(ancestorId));
    if (isContainerNode(node)) {
      getDescendantIds(scene, node.id).forEach((descendantId) => includedIds.add(descendantId));
    }
  });
  return includedIds;
}

function createVisibleRows(
  scene: SceneDocument,
  expandedIds: ReadonlySet<NodeId>,
  searchInclusion: ReadonlySet<NodeId> | null,
): readonly LayerRow[] {
  const rows: LayerRow[] = [];

  const visit = (nodeIds: readonly NodeId[], depth: number, parentId: NodeId | null) => {
    nodeIds.forEach((nodeId, index) => {
      const node = scene.nodes[nodeId];
      if (!node || (searchInclusion && !searchInclusion.has(nodeId))) return;
      rows.push({ node, depth, parentId, index });
      if (!isContainerNode(node)) return;
      if (searchInclusion || expandedIds.has(node.id)) visit(node.childIds, depth + 1, node.id);
    });
  };

  visit(scene.rootIds, 0, null);
  return rows;
}

function getTopLevelDragIds(
  scene: SceneDocument,
  requestedIds: ReadonlySet<NodeId>,
): readonly NodeId[] {
  return flattenScene(scene)
    .map((node) => node.id)
    .filter(
      (nodeId) =>
        requestedIds.has(nodeId) &&
        !getAncestorIds(scene, nodeId).some((ancestorId) => requestedIds.has(ancestorId)),
    );
}

function resolveDropRequest(
  scene: SceneDocument,
  nodeIds: readonly NodeId[],
  target: DragTarget,
): LayerMoveRequest | null {
  if (target.placement === 'root-end') {
    return {
      nodeIds,
      targetId: null,
      targetParentId: null,
      targetIndex: scene.rootIds.filter((nodeId) => !nodeIds.includes(nodeId)).length,
      placement: 'root-end',
    };
  }

  if (!target.targetId) return null;
  const targetNode = scene.nodes[target.targetId];
  if (!targetNode) return null;

  if (target.placement === 'inside') {
    if (!isContainerNode(targetNode)) return null;
    return {
      nodeIds,
      targetId: targetNode.id,
      targetParentId: targetNode.id,
      targetIndex: targetNode.childIds.filter((nodeId) => !nodeIds.includes(nodeId)).length,
      placement: 'inside',
    };
  }

  let sourceSiblingIds: readonly NodeId[];
  if (targetNode.parentId === null) {
    sourceSiblingIds = scene.rootIds;
  } else {
    const parentNode = scene.nodes[targetNode.parentId];
    if (!parentNode || !isContainerNode(parentNode)) return null;
    sourceSiblingIds = parentNode.childIds;
  }
  const siblingIds = sourceSiblingIds.filter((nodeId) => !nodeIds.includes(nodeId));
  const targetIndex = siblingIds.indexOf(targetNode.id);
  if (targetIndex < 0) return null;

  return {
    nodeIds,
    targetId: targetNode.id,
    targetParentId: targetNode.parentId,
    targetIndex: targetIndex + (target.placement === 'after' ? 1 : 0),
    placement: target.placement,
  };
}

function joinClasses(...classes: readonly (string | false | null | undefined)[]): string {
  return classes.filter(Boolean).join(' ');
}

export function LayersPanel({
  scene,
  selectedIds,
  onSelectionChange,
  onRename,
  onSetVisibility,
  onSetLocked,
  onMove,
  className,
}: LayersPanelProps) {
  const [query, setQuery] = useState('');
  const [expandedIds, setExpandedIds] = useState<ReadonlySet<NodeId>>(() =>
    initialExpandedIds(scene),
  );
  const [activeRowId, setActiveRowId] = useState<NodeId | null>(null);
  const [editingId, setEditingId] = useState<NodeId | null>(null);
  const [renameDraft, setRenameDraft] = useState('');
  const [draggedIds, setDraggedIds] = useState<readonly NodeId[]>([]);
  const [dragTarget, setDragTarget] = useState<DragTarget | null>(null);
  const selectionAnchorRef = useRef<NodeId | null>(null);
  const cancelRenameCommitRef = useRef(false);
  const rowRefs = useRef(new Map<NodeId, HTMLDivElement>());
  const searchInputRef = useRef<HTMLInputElement>(null);

  const searchInclusion = useMemo(() => createSearchInclusion(scene, query), [query, scene]);
  const rows = useMemo(
    () => createVisibleRows(scene, expandedIds, searchInclusion),
    [expandedIds, scene, searchInclusion],
  );
  const rowIds = useMemo(() => rows.map((row) => row.node.id), [rows]);

  useEffect(() => {
    const firstSelectedId = rowIds.find((nodeId) => selectedIds.has(nodeId));
    if (firstSelectedId) setActiveRowId(firstSelectedId);
  }, [rowIds, selectedIds]);

  useEffect(() => {
    if (selectedIds.size === 0) return;
    setExpandedIds((currentIds) => {
      const nextIds = new Set(currentIds);
      selectedIds.forEach((nodeId) => {
        if (scene.nodes[nodeId]) {
          getAncestorIds(scene, nodeId).forEach((ancestorId) => nextIds.add(ancestorId));
        }
      });
      return nextIds.size === currentIds.size ? currentIds : nextIds;
    });
  }, [scene, selectedIds]);

  const setExpanded = (nodeId: NodeId, expanded: boolean) => {
    setExpandedIds((currentIds) => {
      const nextIds = new Set(currentIds);
      if (expanded) nextIds.add(nodeId);
      else nextIds.delete(nodeId);
      return nextIds;
    });
  };

  const startRenaming = (node: SceneNode) => {
    setEditingId(node.id);
    setRenameDraft(node.name);
  };

  const commitRename = (node: SceneNode) => {
    const nextName = renameDraft.trim();
    if (nextName && nextName !== node.name) onRename(node.id, nextName);
    setEditingId(null);
  };

  const selectRow = (
    nodeId: NodeId,
    event: Pick<MouseEvent, 'shiftKey' | 'metaKey' | 'ctrlKey'>,
  ) => {
    let nextIds: readonly NodeId[];
    const toggleSelection = event.metaKey || event.ctrlKey;

    if (event.shiftKey && selectionAnchorRef.current) {
      const anchorIndex = rowIds.indexOf(selectionAnchorRef.current);
      const currentIndex = rowIds.indexOf(nodeId);
      if (anchorIndex >= 0 && currentIndex >= 0) {
        const range = rowIds.slice(
          Math.min(anchorIndex, currentIndex),
          Math.max(anchorIndex, currentIndex) + 1,
        );
        nextIds = toggleSelection ? [...new Set([...selectedIds, ...range])] : range;
      } else {
        nextIds = [nodeId];
      }
    } else if (toggleSelection) {
      const nextSelection = new Set(selectedIds);
      if (nextSelection.has(nodeId)) nextSelection.delete(nodeId);
      else nextSelection.add(nodeId);
      nextIds = [...nextSelection];
      selectionAnchorRef.current = nodeId;
    } else {
      nextIds = [nodeId];
      selectionAnchorRef.current = nodeId;
    }

    setActiveRowId(nodeId);
    onSelectionChange(nextIds, nodeId);
  };

  const focusRow = (nodeId: NodeId) => {
    setActiveRowId(nodeId);
    rowRefs.current.get(nodeId)?.focus({ preventScroll: true });
  };

  const handleRowKeyDown = (event: KeyboardEvent<HTMLDivElement>, row: LayerRow) => {
    const rowIndex = rowIds.indexOf(row.node.id);
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      const nextIndex = rowIndex + (event.key === 'ArrowDown' ? 1 : -1);
      const nextId = rowIds[nextIndex];
      if (nextId) focusRow(nextId);
      return;
    }
    if (event.key === 'ArrowRight' && isContainerNode(row.node)) {
      event.preventDefault();
      if (!expandedIds.has(row.node.id)) setExpanded(row.node.id, true);
      else {
        const nextRow = rows[rowIndex + 1];
        if (nextRow && nextRow.depth > row.depth) focusRow(nextRow.node.id);
      }
      return;
    }
    if (event.key === 'ArrowLeft') {
      event.preventDefault();
      if (isContainerNode(row.node) && expandedIds.has(row.node.id)) {
        setExpanded(row.node.id, false);
      } else if (row.parentId) {
        focusRow(row.parentId);
      }
      return;
    }
    if (event.key === 'Enter' || event.key === 'F2') {
      event.preventDefault();
      startRenaming(row.node);
      return;
    }
    if (event.key === ' ') {
      event.preventDefault();
      selectRow(row.node.id, event);
    }
  };

  const isValidDropTarget = (targetId: NodeId): boolean =>
    draggedIds.length > 0 &&
    !draggedIds.some(
      (draggedId) => draggedId === targetId || isDescendantOf(scene, targetId, draggedId),
    );

  const handleDragStart = (event: DragEvent<HTMLDivElement>, nodeId: NodeId) => {
    const requestedIds = selectedIds.has(nodeId) ? selectedIds : new Set([nodeId]);
    const topLevelIds = getTopLevelDragIds(scene, requestedIds);
    setDraggedIds(topLevelIds);
    setDragTarget(null);
    if (!selectedIds.has(nodeId)) onSelectionChange([nodeId], nodeId);
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData(LAYER_DRAG_MIME, JSON.stringify(topLevelIds));
    event.dataTransfer.setData('text/plain', topLevelIds.join(','));
  };

  const handleDragOverRow = (event: DragEvent<HTMLDivElement>, row: LayerRow) => {
    if (!isValidDropTarget(row.node.id)) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
    const bounds = event.currentTarget.getBoundingClientRect();
    const relativeY = (event.clientY - bounds.top) / bounds.height;
    const placement: LayerDropPlacement =
      isContainerNode(row.node) && relativeY >= 0.25 && relativeY <= 0.75
        ? 'inside'
        : relativeY < 0.5
          ? 'before'
          : 'after';
    setDragTarget({ targetId: row.node.id, placement });
  };

  const commitDrop = (event: DragEvent, target: DragTarget) => {
    event.preventDefault();
    const request = resolveDropRequest(scene, draggedIds, target);
    if (request) onMove(request);
    setDraggedIds([]);
    setDragTarget(null);
  };

  const hasNodes = scene.rootIds.length > 0;
  const hasSearchResults = rows.length > 0;

  return (
    <aside className={joinClasses('layers-panel', className)} aria-label="Layers panel">
      <div className="panel-heading">
        <div>
          <h2>Layers</h2>
          <span>{Object.keys(scene.nodes).length}</span>
        </div>
      </div>

      <label className="layers-search">
        <Search size={14} aria-hidden="true" />
        <input
          ref={searchInputRef}
          type="search"
          value={query}
          placeholder="Search layers"
          aria-label="Search layers"
          onChange={(event) => setQuery(event.currentTarget.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && rowIds[0]) {
              event.preventDefault();
              focusRow(rowIds[0]);
            }
            if (event.key === 'Escape' && query) {
              event.preventDefault();
              setQuery('');
            }
          }}
        />
        {query ? (
          <button type="button" aria-label="Clear layer search" onClick={() => setQuery('')}>
            <X size={13} aria-hidden="true" />
          </button>
        ) : null}
      </label>

      {!hasNodes ? (
        <div className="panel-empty-state">
          <Layers3 size={26} aria-hidden="true" />
          <strong>No layers yet</strong>
          <p>Draw a shape, frame, or text layer to begin.</p>
        </div>
      ) : !hasSearchResults ? (
        <div className="panel-empty-state">
          <Search size={24} aria-hidden="true" />
          <strong>No matching layers</strong>
          <p>Try a different name or layer type.</p>
          <button type="button" onClick={() => setQuery('')}>
            Clear search
          </button>
        </div>
      ) : (
        <div className="layers-tree-scroll">
          <div
            className="layers-tree"
            role="tree"
            aria-label="Document layers"
            aria-multiselectable
          >
            {rows.map((row) => {
              const { node } = row;
              const NodeIcon = NODE_ICONS[node.type];
              const container = isContainerNode(node);
              const expanded = container && (searchInclusion !== null || expandedIds.has(node.id));
              const selected = selectedIds.has(node.id);
              const targetPlacement =
                dragTarget?.targetId === node.id ? dragTarget.placement : undefined;

              return (
                <div
                  ref={(element) => {
                    if (element) rowRefs.current.set(node.id, element);
                    else rowRefs.current.delete(node.id);
                  }}
                  key={node.id}
                  role="treeitem"
                  aria-level={row.depth + 1}
                  aria-selected={selected}
                  aria-expanded={container ? expanded : undefined}
                  className="layer-row"
                  data-selected={selected ? '' : undefined}
                  data-hidden={!node.visible ? '' : undefined}
                  data-locked={node.locked ? '' : undefined}
                  data-drop={targetPlacement}
                  tabIndex={
                    activeRowId === node.id || (!activeRowId && rowIds[0] === node.id) ? 0 : -1
                  }
                  draggable={editingId !== node.id}
                  style={{ '--layer-depth': row.depth } as CSSProperties}
                  onFocus={() => setActiveRowId(node.id)}
                  onClick={(event) => selectRow(node.id, event)}
                  onDoubleClick={(event) => {
                    event.preventDefault();
                    startRenaming(node);
                  }}
                  onKeyDown={(event) => handleRowKeyDown(event, row)}
                  onDragStart={(event) => handleDragStart(event, node.id)}
                  onDragOver={(event) => handleDragOverRow(event, row)}
                  onDrop={(event) => {
                    if (dragTarget?.targetId === node.id) commitDrop(event, dragTarget);
                  }}
                  onDragEnd={() => {
                    setDraggedIds([]);
                    setDragTarget(null);
                  }}
                >
                  <span className="layer-row__indent" aria-hidden="true" />
                  {container && !searchInclusion ? (
                    <button
                      type="button"
                      className="layer-row__disclosure"
                      aria-label={`${expanded ? 'Collapse' : 'Expand'} ${node.name}`}
                      onClick={(event) => {
                        event.stopPropagation();
                        setExpanded(node.id, !expanded);
                      }}
                    >
                      <ChevronRight size={13} aria-hidden="true" />
                    </button>
                  ) : (
                    <span className="layer-row__disclosure-spacer" aria-hidden="true" />
                  )}
                  <NodeIcon
                    className="layer-row__type"
                    size={14}
                    strokeWidth={1.7}
                    aria-hidden="true"
                  />
                  {editingId === node.id ? (
                    <input
                      className="layer-row__rename"
                      value={renameDraft}
                      aria-label={`Rename ${node.name}`}
                      autoFocus
                      onFocus={(event) => event.currentTarget.select()}
                      onChange={(event) => setRenameDraft(event.currentTarget.value)}
                      onClick={(event) => event.stopPropagation()}
                      onBlur={() => {
                        if (cancelRenameCommitRef.current) {
                          cancelRenameCommitRef.current = false;
                          return;
                        }
                        commitRename(node);
                      }}
                      onKeyDown={(event) => {
                        event.stopPropagation();
                        if (event.key === 'Enter') {
                          event.preventDefault();
                          commitRename(node);
                        }
                        if (event.key === 'Escape') {
                          event.preventDefault();
                          cancelRenameCommitRef.current = true;
                          setEditingId(null);
                        }
                      }}
                    />
                  ) : (
                    <span className="layer-row__name">{node.name}</span>
                  )}
                  <div className="layer-row__actions" onClick={(event) => event.stopPropagation()}>
                    <IconButton
                      label={node.visible ? `Hide ${node.name}` : `Show ${node.name}`}
                      tooltipSide="left"
                      icon={node.visible ? <Eye size={13} /> : <EyeOff size={13} />}
                      active={!node.visible}
                      onClick={() => onSetVisibility(node.id, !node.visible)}
                    />
                    <IconButton
                      label={node.locked ? `Unlock ${node.name}` : `Lock ${node.name}`}
                      tooltipSide="left"
                      icon={node.locked ? <Lock size={13} /> : <Unlock size={13} />}
                      active={node.locked}
                      onClick={() => onSetLocked(node.id, !node.locked)}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          {draggedIds.length > 0 ? (
            <div
              className="layers-root-drop"
              data-active={dragTarget?.placement === 'root-end' ? '' : undefined}
              onDragOver={(event) => {
                event.preventDefault();
                event.dataTransfer.dropEffect = 'move';
                setDragTarget({ targetId: null, placement: 'root-end' });
              }}
              onDrop={(event) => commitDrop(event, { targetId: null, placement: 'root-end' })}
            >
              Move to top level
            </div>
          ) : null}
        </div>
      )}
    </aside>
  );
}
