import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { deleteCommand, duplicateCommand, groupCommand, insertCommand, updateManyCommand, updateNodeCommand, type NodePatch } from "../commands/commands";
import { exportJson } from "../export/exporters";
import { boundsFromPoints, nodeBounds } from "../geometry/bounds";
import { screenToWorld } from "../geometry/matrix";
import { createEllipse, createFrame, createImage, createLine, createPolygon, createRectangle, createText } from "../scene/factory";
import { descendants, updateNodes } from "../scene/graph";
import { renderEditor, type SmartGuide } from "../scene/render";
import { activeDocument, useEditorStore } from "../state/editorStore";
import {
  handleAt,
  hitTest,
  marqueeSelection,
  pointerPoint,
  rotateNodeFromPointer,
  selectionBounds,
  smartSnap,
  transformByHandle,
  type Handle,
} from "../tools/input";
import type { EditorDocument, NodeId, Point, SceneNode, Tool } from "../types/nodes";

type Interaction =
  | Readonly<{ kind: "idle" }>
  | Readonly<{ kind: "pan"; start: Point; viewportStart: { x: number; y: number; zoom: number } }>
  | Readonly<{ kind: "marquee"; startWorld: Point; currentWorld: Point }>
  | Readonly<{ kind: "drag"; startWorld: Point; nodeIds: readonly NodeId[]; before: Record<NodeId, NodePatch>; guides: readonly SmartGuide[] }>
  | Readonly<{ kind: "resize"; handle: Exclude<Handle, null | "body">; startWorld: Point; nodeId: NodeId; before: NodePatch }>
  | Readonly<{ kind: "draw"; nodeId: NodeId; before: NodePatch }>;

type TextEdit = Readonly<{ id: NodeId; value: string; rect: DOMRect }>;

type Props = Readonly<{ document: EditorDocument }>;

export function CanvasViewport({ document }: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const shellRef = useRef<HTMLDivElement | null>(null);
  const [size, setSize] = useState({ width: 800, height: 600 });
  const [interaction, setInteraction] = useState<Interaction>({ kind: "idle" });
  const [textEdit, setTextEdit] = useState<TextEdit | null>(null);
  const state = useEditorStore();
  const viewport = state.viewport;

  const marquee = interaction.kind === "marquee"
    ? normalizedBounds(interaction.startWorld, interaction.currentWorld)
    : null;
  const guides = useMemo(() => (interaction.kind === "drag" ? interaction.guides : []), [interaction]);

  const render = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const ratio = window.devicePixelRatio || 1;
    canvas.width = Math.max(1, Math.floor(size.width * ratio));
    canvas.height = Math.max(1, Math.floor(size.height * ratio));
    canvas.style.width = `${size.width}px`;
    canvas.style.height = `${size.height}px`;
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    renderEditor(ctx, document, size.width, size.height, {
      viewport,
      gridVisible: state.gridVisible,
      rulersVisible: state.rulersVisible,
      selection: document.selection,
      marquee,
      smartGuides: guides,
      editingTextId: textEdit?.id ?? null,
    });
  }, [document, guides, marquee, size.height, size.width, state.gridVisible, state.rulersVisible, textEdit?.id, viewport]);

  useEffect(() => {
    render();
  }, [render]);

  useEffect(() => {
    const element = shellRef.current;
    if (!element) return;
    const observer = new ResizeObserver(([entry]) => {
      setSize({ width: entry.contentRect.width, height: entry.contentRect.height });
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const rerender = () => render();
    window.addEventListener("atelier:image-loaded", rerender);
    return () => window.removeEventListener("atelier:image-loaded", rerender);
  }, [render]);

  useEffect(() => {
    const exportHandler = () => exportJson(activeDocument(useEditorStore.getState()));
    window.addEventListener("atelier:export-json", exportHandler);
    return () => window.removeEventListener("atelier:export-json", exportHandler);
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (textEdit && event.key !== "Escape" && event.key !== "Meta") return;
      handleShortcut(event, textEdit, setTextEdit);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [textEdit]);

  const cursor = useMemo(() => cursorFor(state.tool, interaction, document, viewport, shellRef.current), [document, interaction, state.tool, viewport]);

  const onPointerDown = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const element = event.currentTarget;
    element.setPointerCapture(event.pointerId);
    const screen = pointerPoint(event, element);
    const world = screenToWorld(viewport, screen);
    if (event.button === 1 || state.tool === "hand") {
      setInteraction({ kind: "pan", start: screen, viewportStart: viewport });
      return;
    }
    if (state.tool === "select") {
      const handle = handleAt(document, viewport, screen);
      if (handle && handle !== "body") {
        const id = document.selection[0];
        const node = document.nodes[id];
        if (!node) return;
        setInteraction({ kind: "resize", handle, startWorld: world, nodeId: id, before: snapshotPatch(node) });
        return;
      }
      const candidates = state.spatialIndex.point(world, 8 / viewport.zoom);
      const hit = hitTest(document, world, candidates);
      if (hit) {
        const selection = event.shiftKey ? toggle(document.selection, hit) : document.selection.includes(hit) ? document.selection : [hit];
        state.select(selection);
        const before = Object.fromEntries(selection.map((id) => [id, snapshotPatch(document.nodes[id])]).filter((entry): entry is [NodeId, NodePatch] => Boolean(entry[1])));
        setInteraction({ kind: "drag", startWorld: world, nodeIds: selection, before, guides: [] });
        return;
      }
      if (!event.shiftKey) state.select([]);
      setInteraction({ kind: "marquee", startWorld: world, currentWorld: world });
      return;
    }
    if (state.tool === "text") {
      const node = createText(document.rootId, world.x, world.y, "Text");
      state.execute(insertCommand(node));
      beginTextEdit(node.id, node, element, setTextEdit);
      return;
    }
    if (state.tool === "image") {
      const input = window.document.createElement("input");
      input.type = "file";
      input.accept = "image/*";
      input.onchange = () => {
        const file = input.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = () => {
          if (typeof reader.result === "string") state.execute(insertCommand(createImage(document.rootId, world.x, world.y, reader.result)));
        };
        reader.readAsDataURL(file);
      };
      input.click();
      return;
    }
    const node = createDrawable(state.tool, document.rootId, world);
    if (!node) return;
    state.execute(insertCommand(node));
    setInteraction({ kind: "draw", nodeId: node.id, before: snapshotPatch(node) });
  };

  const onPointerMove = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const element = event.currentTarget;
    const screen = pointerPoint(event, element);
    const world = screenToWorld(viewport, screen);
    if (interaction.kind === "pan") {
      state.setViewport({ ...viewport, x: interaction.viewportStart.x + screen.x - interaction.start.x, y: interaction.viewportStart.y + screen.y - interaction.start.y });
      return;
    }
    if (interaction.kind === "marquee") {
      setInteraction({ ...interaction, currentWorld: world });
      const ids = marqueeSelection(document, normalizedBounds(interaction.startWorld, world));
      state.select(ids);
      return;
    }
    if (interaction.kind === "drag") {
      const dx = world.x - interaction.startWorld.x;
      const dy = world.y - interaction.startWorld.y;
      const proposed = Object.fromEntries(interaction.nodeIds.map((id) => {
        const before = interaction.before[id];
        return before ? [id, { x: Number(before.x ?? 0) + dx, y: Number(before.y ?? 0) + dy }] : [id, { x: 0, y: 0 }];
      }));
      const snap = event.altKey ? { adjusted: proposed, guides: [] } : smartSnap(document, interaction.nodeIds, proposed);
      const patches = Object.fromEntries(Object.entries(snap.adjusted).map(([id, point]) => [id, { x: point.x, y: point.y }]));
      state.setDocument(updateNodes(document, patchToNodes(document, patches)));
      setInteraction({ ...interaction, guides: snap.guides });
      return;
    }
    if (interaction.kind === "resize") {
      const node = document.nodes[interaction.nodeId];
      if (!node) return;
      const next = interaction.handle === "rotate"
        ? rotateNodeFromPointer(node, world, event.shiftKey)
        : transformByHandle(node, interaction.handle, interaction.startWorld, world, { shift: event.shiftKey, alt: event.altKey });
      state.setDocument(updateNodes(document, { [node.id]: next }));
      return;
    }
    if (interaction.kind === "draw") {
      const node = document.nodes[interaction.nodeId];
      if (!node) return;
      const beforeX = Number(interaction.before.x ?? node.x);
      const beforeY = Number(interaction.before.y ?? node.y);
      const x = Math.min(beforeX, world.x);
      const y = Math.min(beforeY, world.y);
      const width = Math.max(2, Math.abs(world.x - beforeX));
      const height = Math.max(2, Math.abs(world.y - beforeY));
      state.setDocument(updateNodes(document, { [node.id]: { ...node, x, y, width: event.shiftKey ? Math.max(width, height) : width, height: event.shiftKey ? Math.max(width, height) : height } }));
    }
  };

  const onPointerUp = () => {
    if (interaction.kind === "drag") {
      const after = Object.fromEntries(interaction.nodeIds.map((id) => {
        const node = activeDocument(useEditorStore.getState()).nodes[id];
        return node ? [id, snapshotPatch(node)] : [id, {}];
      }));
      state.execute(updateManyCommand("Move", interaction.before, after));
    } else if (interaction.kind === "resize") {
      const node = activeDocument(useEditorStore.getState()).nodes[interaction.nodeId];
      if (node) state.execute(updateNodeCommand(interaction.handle === "rotate" ? "Rotate" : "Resize", node.id, interaction.before, snapshotPatch(node)));
    } else if (interaction.kind === "draw") {
      const node = activeDocument(useEditorStore.getState()).nodes[interaction.nodeId];
      if (node) state.execute(updateNodeCommand("Draw", node.id, interaction.before, snapshotPatch(node)));
    }
    setInteraction({ kind: "idle" });
  };

  const onWheel = (event: React.WheelEvent<HTMLCanvasElement>) => {
    event.preventDefault();
    const screen = pointerPoint(event, event.currentTarget);
    if (event.ctrlKey || event.metaKey) {
      const nextZoom = Math.min(64, Math.max(0.1, viewport.zoom * Math.exp(-event.deltaY * 0.002)));
      const world = screenToWorld(viewport, screen);
      state.setViewport({ zoom: nextZoom, x: screen.x - world.x * nextZoom, y: screen.y - world.y * nextZoom });
    } else {
      state.setViewport({ ...viewport, x: viewport.x - event.deltaX, y: viewport.y - event.deltaY });
    }
  };

  const onDoubleClick = (event: React.MouseEvent<HTMLCanvasElement>) => {
    const world = screenToWorld(viewport, pointerPoint(event, event.currentTarget));
    const hit = hitTest(document, world, state.spatialIndex.point(world, 8 / viewport.zoom));
    const node = hit ? document.nodes[hit] : null;
    if (node?.type === "text") beginTextEdit(node.id, node, event.currentTarget, setTextEdit);
  };

  const onDrop = (event: React.DragEvent<HTMLCanvasElement>) => {
    event.preventDefault();
    const file = [...event.dataTransfer.files].find((item) => item.type.startsWith("image/"));
    if (!file) return;
    const world = screenToWorld(viewport, pointerPoint(event, event.currentTarget));
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") state.execute(insertCommand(createImage(document.rootId, world.x, world.y, reader.result)));
    };
    reader.readAsDataURL(file);
  };

  const commitText = () => {
    if (!textEdit) return;
    const node = activeDocument(useEditorStore.getState()).nodes[textEdit.id];
    if (node?.type === "text") {
      state.execute(updateNodeCommand("Edit text", node.id, { text: node.text }, { text: textEdit.value }));
    }
    setTextEdit(null);
  };

  return (
    <section className="canvas-shell" ref={shellRef}>
      <canvas
        ref={canvasRef}
        className="canvas"
        style={{ cursor }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onWheel={onWheel}
        onDoubleClick={onDoubleClick}
        onDrop={onDrop}
        onDragOver={(event) => event.preventDefault()}
      />
      {textEdit ? (
        <textarea
          className="text-editor"
          style={{ left: textEdit.rect.left, top: textEdit.rect.top, width: textEdit.rect.width, height: textEdit.rect.height }}
          value={textEdit.value}
          autoFocus
          onChange={(event) => setTextEdit({ ...textEdit, value: event.target.value })}
          onBlur={commitText}
          onKeyDown={(event) => {
            if (event.key === "Escape") setTextEdit(null);
            if ((event.metaKey || event.ctrlKey) && event.key === "Enter") commitText();
          }}
        />
      ) : null}
    </section>
  );
}

function handleShortcut(event: KeyboardEvent, textEdit: TextEdit | null, setTextEdit: (edit: TextEdit | null) => void): void {
  const store = useEditorStore.getState();
  const document = activeDocument(store);
  const meta = event.metaKey || event.ctrlKey;
  const key = event.key.toLowerCase();
  if (textEdit && event.key === "Escape") {
    setTextEdit(null);
    event.preventDefault();
    return;
  }
  if (!meta && ["v", "h", "f", "r", "o", "l", "s", "t", "i", "c"].includes(key)) {
    const tools: Record<string, Tool> = { v: "select", h: "hand", f: "frame", r: "rectangle", o: "ellipse", l: "line", s: "polygon", t: "text", i: "image", c: "comment" };
    store.setTool(tools[key]);
    event.preventDefault();
    return;
  }
  if (meta && key === "z") {
    if (event.shiftKey) store.redo();
    else store.undo();
    event.preventDefault();
    return;
  }
  if (meta && key === "a") {
    store.select(Object.keys(document.nodes).filter((id) => id !== document.rootId));
    event.preventDefault();
    return;
  }
  if ((event.key === "Backspace" || event.key === "Delete") && document.selection.length) {
    store.execute(deleteCommand(document.selection, snapshotSubtrees(document, document.selection)));
    event.preventDefault();
    return;
  }
  if (meta && ["c", "x"].includes(key)) {
    store.setClipboard({ nodeIds: document.selection });
    if (key === "x" && document.selection.length) store.execute(deleteCommand(document.selection, snapshotSubtrees(document, document.selection)));
    event.preventDefault();
    return;
  }
  if (meta && ["v", "d"].includes(key)) {
    const ids = key === "v" ? store.clipboard?.nodeIds ?? document.selection : document.selection;
    if (ids.length) store.execute(duplicateCommand(ids));
    event.preventDefault();
    return;
  }
  if (meta && key === "g" && document.selection.length > 1) {
    const bounds = selectionBounds(document);
    if (bounds) store.execute(groupCommand(document.selection, createFrame(document.rootId, bounds.x - 16, bounds.y - 16, bounds.width + 32, bounds.height + 32)));
    event.preventDefault();
    return;
  }
  if (meta && key === "0") {
    store.setViewport({ x: 360, y: 160, zoom: 1 });
    event.preventDefault();
    return;
  }
  if (meta && key === "1") {
    const bounds = selectionBounds(document);
    if (bounds) store.setViewport({ zoom: 1, x: 420 - bounds.x, y: 220 - bounds.y });
    event.preventDefault();
    return;
  }
  if (meta && event.key === "/") {
    store.toggleGrid();
    event.preventDefault();
    return;
  }
  if (document.selection.length && ["arrowleft", "arrowright", "arrowup", "arrowdown"].includes(key)) {
    const amount = event.shiftKey ? 10 : 1;
    const dx = key === "arrowleft" ? -amount : key === "arrowright" ? amount : 0;
    const dy = key === "arrowup" ? -amount : key === "arrowdown" ? amount : 0;
    const before = Object.fromEntries(document.selection.map((id) => [id, snapshotPatch(document.nodes[id])]).filter((entry): entry is [NodeId, NodePatch] => Boolean(entry[1])));
    const after = Object.fromEntries(document.selection.map((id) => {
      const node = document.nodes[id];
      return node ? [id, { x: node.x + dx, y: node.y + dy }] : [id, {}];
    }));
    store.execute(updateManyCommand("Nudge", before, after));
    event.preventDefault();
  }
  if (meta && ["]", "["].includes(event.key)) {
    reorderSelection(document, event.key === "]", event.shiftKey);
    event.preventDefault();
  }
}

function reorderSelection(document: EditorDocument, forward: boolean, edge: boolean): void {
  const store = useEditorStore.getState();
  const selected = document.selection[0];
  const node = selected ? document.nodes[selected] : null;
  const parent = node?.parentId ? document.nodes[node.parentId] : null;
  if (!node || !parent) return;
  const children = [...parent.children];
  const index = children.indexOf(node.id);
  if (index < 0) return;
  children.splice(index, 1);
  children.splice(edge ? (forward ? children.length : 0) : Math.max(0, Math.min(children.length, index + (forward ? 1 : -1))), 0, node.id);
  store.execute({
    label: "Reorder layer",
    apply: (doc) => ({ ...doc, nodes: { ...doc.nodes, [parent.id]: { ...parent, children } }, updatedAt: new Date().toISOString() }),
    revert: (doc) => ({ ...doc, nodes: { ...doc.nodes, [parent.id]: { ...parent, children: parent.children } }, updatedAt: new Date().toISOString() }),
  });
}

function createDrawable(tool: Tool, parentId: NodeId, point: Point): SceneNode | null {
  switch (tool) {
    case "frame":
      return createFrame(parentId, point.x, point.y, 2, 2);
    case "rectangle":
      return createRectangle(parentId, point.x, point.y, 2, 2);
    case "ellipse":
      return createEllipse(parentId, point.x, point.y, 2, 2);
    case "line":
      return createLine(parentId, point.x, point.y, 2, 2);
    case "polygon":
      return createPolygon(parentId, point.x, point.y, 2, 2);
    default:
      return null;
  }
}

function beginTextEdit(id: NodeId, node: SceneNode, canvas: HTMLCanvasElement, setTextEdit: (edit: TextEdit | null) => void): void {
  if (node.type !== "text") return;
  const viewport = useEditorStore.getState().viewport;
  const rect = canvas.getBoundingClientRect();
  const bounds = boundsFromPoints(nodeBounds(node) ? [
    { x: node.x * viewport.zoom + viewport.x + rect.left, y: node.y * viewport.zoom + viewport.y + rect.top },
    { x: (node.x + node.width) * viewport.zoom + viewport.x + rect.left, y: (node.y + node.height) * viewport.zoom + viewport.y + rect.top },
  ] : []);
  setTextEdit({ id, value: node.text, rect: new DOMRect(bounds.x, bounds.y, bounds.width, bounds.height) });
}

function snapshotPatch(node: SceneNode | undefined): NodePatch {
  if (!node) return {};
  return {
    name: node.name,
    parentId: node.parentId,
    children: node.children,
    x: node.x,
    y: node.y,
    width: node.width,
    height: node.height,
    rotation: node.rotation,
    opacity: node.opacity,
    visible: node.visible,
    locked: node.locked,
    blendMode: node.blendMode,
    constraints: node.constraints,
    fills: node.fills,
    strokes: node.strokes,
    effects: node.effects,
    ...extraPatch(node),
  };
}

function extraPatch(node: SceneNode): NodePatch {
  switch (node.type) {
    case "text":
      return { text: node.text, fontFamily: node.fontFamily, fontWeight: node.fontWeight, fontSize: node.fontSize, lineHeight: node.lineHeight, letterSpacing: node.letterSpacing, align: node.align, verticalAlign: node.verticalAlign };
    case "frame":
      return { clip: node.clip, autoLayout: node.autoLayout, cornerRadius: node.cornerRadius };
    case "rectangle":
    case "image":
      return { cornerRadius: node.cornerRadius };
    case "line":
      return { points: node.points };
    case "polygon":
      return { sides: node.sides, star: node.star, innerRadius: node.innerRadius };
    case "ellipse":
      return {};
  }
}

function patchToNodes(document: EditorDocument, patches: Record<string, NodePatch>): Record<NodeId, SceneNode> {
  const nodes: Record<NodeId, SceneNode> = {};
  for (const [id, patch] of Object.entries(patches)) {
    const node = document.nodes[id];
    if (node) nodes[id] = { ...node, ...patch };
  }
  return nodes;
}

function normalizedBounds(a: Point, b: Point) {
  return { x: Math.min(a.x, b.x), y: Math.min(a.y, b.y), width: Math.abs(a.x - b.x), height: Math.abs(a.y - b.y) };
}

function toggle(selection: readonly NodeId[], id: NodeId): NodeId[] {
  return selection.includes(id) ? selection.filter((item) => item !== id) : [...selection, id];
}

function snapshotSubtrees(document: EditorDocument, ids: readonly NodeId[]): Record<NodeId, SceneNode> {
  const all = new Set(ids.flatMap((id) => [id, ...descendants(document, id)]));
  return Object.fromEntries([...all].map((id) => [id, document.nodes[id]]).filter((entry): entry is [NodeId, SceneNode] => Boolean(entry[1])));
}

function cursorFor(tool: Tool, interaction: Interaction, document: EditorDocument, viewport: { x: number; y: number; zoom: number }, element: HTMLElement | null): string {
  if (interaction.kind === "pan") return "grabbing";
  if (tool === "hand") return "grab";
  if (tool !== "select" || !element) return tool === "text" ? "text" : "crosshair";
  return "default";
}
