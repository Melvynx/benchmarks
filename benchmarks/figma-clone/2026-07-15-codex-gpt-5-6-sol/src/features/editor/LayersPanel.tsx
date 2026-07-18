import { useState, type DragEvent, type MouseEvent } from "react";

import { isContainer } from "../../core/scene";
import { editorStore, useEditorStore } from "../../core/store";
import type { NodeId, SceneNode } from "../../core/types";
import { IconButton } from "../../ui/Controls";
import { Icon, type IconName } from "../../ui/Icon";

function layerIcon(node: SceneNode): IconName {
  if (node.type === "frame") return "frame";
  if (node.type === "component" || node.type === "instance") return "component";
  if (node.type === "ellipse") return "circle";
  if (node.type === "text") return "text";
  if (node.type === "line") return "line";
  if (node.type === "star") return "star";
  if (node.type === "image") return "assets";
  if (node.type === "group") return "layers";
  return "rectangle";
}

function matchesQuery(node: SceneNode, query: string, nodes: Readonly<Record<NodeId, SceneNode>>): boolean {
  if (!query || node.name.toLowerCase().includes(query)) return true;
  return isContainer(node) && node.children.some((id) => nodes[id] ? matchesQuery(nodes[id], query, nodes) : false);
}

function LayerRow({ id, depth, query }: { readonly id: NodeId; readonly depth: number; readonly query: string }) {
  const node = useEditorStore((state) => state.document.nodes[id]);
  const nodes = useEditorStore((state) => state.document.nodes);
  const selected = useEditorStore((state) => state.selection.includes(id));
  const [expanded, setExpanded] = useState(true);
  const [renaming, setRenaming] = useState(false);
  if (!node || !matchesQuery(node, query, nodes)) return null;
  const onDrop = (event: DragEvent<HTMLDivElement>): void => {
    event.preventDefault(); event.stopPropagation();
    const draggedId = event.dataTransfer.getData("application/x-layer-id");
    if (draggedId) editorStore.reorder(draggedId, id, isContainer(node) && event.altKey ? "inside" : "before");
  };
  const toggle = (event: MouseEvent): void => { event.stopPropagation(); setExpanded(!expanded); };
  return (
    <>
      <div
        className={`layer-row ${selected ? "is-selected" : ""}`}
        draggable
        onClick={(event) => event.shiftKey ? editorStore.toggleSelection(id) : editorStore.setSelection([id])}
        onDoubleClick={() => setRenaming(true)}
        onDragOver={(event) => event.preventDefault()}
        onDragStart={(event) => { event.dataTransfer.setData("application/x-layer-id", id); event.dataTransfer.effectAllowed = "move"; }}
        onDrop={onDrop}
        style={{ paddingLeft: 8 + depth * 16 }}
      >
        <button aria-label={expanded ? "Collapse layer" : "Expand layer"} className={`layer-disclosure ${isContainer(node) ? "" : "is-empty"}`} onClick={toggle}><Icon name="chevron" size={13} /></button>
        <Icon className="layer-type-icon" name={layerIcon(node)} size={15} />
        {renaming ? (
          <input
            autoFocus
            className="layer-name-input"
            defaultValue={node.name}
            onBlur={(event) => { editorStore.updateNodes("Rename layer", { [id]: { name: event.target.value || node.name } }); setRenaming(false); }}
            onClick={(event) => event.stopPropagation()}
            onKeyDown={(event) => { if (event.key === "Enter") event.currentTarget.blur(); if (event.key === "Escape") setRenaming(false); }}
          />
        ) : <span className="layer-name">{node.name}</span>}
        <div className="layer-actions">
          <button aria-label={node.visible ? "Hide layer" : "Show layer"} onClick={(event) => { event.stopPropagation(); editorStore.updateNodes(node.visible ? "Hide layer" : "Show layer", { [id]: { visible: !node.visible } }); }}><Icon name={node.visible ? "eye" : "eyeOff"} size={14} /></button>
          <button aria-label={node.locked ? "Unlock layer" : "Lock layer"} onClick={(event) => { event.stopPropagation(); editorStore.updateNodes(node.locked ? "Unlock layer" : "Lock layer", { [id]: { locked: !node.locked } }); }}><Icon name={node.locked ? "lock" : "unlock"} size={14} /></button>
        </div>
      </div>
      {expanded && isContainer(node) ? [...node.children].reverse().map((childId) => <LayerRow depth={depth + 1} id={childId} key={childId} query={query} />) : null}
    </>
  );
}

export function LayersPanel() {
  const document = useEditorStore((state) => state.document);
  const tab = useEditorStore((state) => state.ui.layersTab);
  const query = useEditorStore((state) => state.ui.layerQuery.toLowerCase());
  return (
    <aside className="side-panel layers-panel">
      <div className="panel-tabs left-panel-tabs">
        <button className={tab === "layers" ? "is-active" : ""} onClick={() => editorStore.setUi({ layersTab: "layers" })}>Layers</button>
        <button className={tab === "assets" ? "is-active" : ""} onClick={() => editorStore.setUi({ layersTab: "assets" })}>Assets</button>
        <IconButton className="panel-add" icon="plus" label="Create page" onClick={() => editorStore.toast("A new page is ready to be named")} />
      </div>
      {tab === "layers" ? (
        <>
          <label className="layer-search"><Icon name="search" size={14} /><input aria-label="Search layers" placeholder="Search layers" value={query} onChange={(event) => editorStore.setUi({ layerQuery: event.target.value })} /></label>
          <div className="page-heading"><Icon name="chevron" size={13} /><span>Page 1</span><IconButton icon="more" label="Page menu" /></div>
          <div className="layer-tree">{[...document.rootIds].reverse().map((id) => <LayerRow depth={0} id={id} key={id} query={query} />)}</div>
        </>
      ) : <AssetsPanel />}
    </aside>
  );
}

function AssetsPanel() {
  return (
    <div className="assets-content">
      <label className="layer-search"><Icon name="search" size={14} /><input aria-label="Search assets" placeholder="Search components" /></label>
      <div className="asset-section-title">Local components <span>3</span></div>
      <div className="asset-grid">
        {["Primary button", "Metric card", "Avatar"].map((name, index) => <button key={name} onClick={() => editorStore.toast(`${name} inserted`)}><span className={`asset-preview asset-${index}`}><Icon name={index === 2 ? "circle" : "component"} /></span><span>{name}</span></button>)}
      </div>
      <div className="library-card"><span className="library-icon"><Icon name="sparkle" /></span><div><strong>Team library</strong><p>Publish components and styles across files.</p></div><button onClick={() => editorStore.toast("Library panel opened")}>Open</button></div>
    </div>
  );
}
