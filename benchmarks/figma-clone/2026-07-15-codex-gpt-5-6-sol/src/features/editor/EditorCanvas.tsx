import { useEffect, useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent } from "react";

import { readDocumentFile } from "../../core/export";
import {
  containsPoint,
  invert,
  nodeLocalMatrix,
  nodeWorldBounds,
  pointInNode,
  rotatePointAround,
  screenToWorld,
  transformPoint,
  unionBounds,
  worldMatrix,
} from "../../core/geometry";
import { createImageNode, createNodeForTool, orderedNodes } from "../../core/scene";
import { editorStore, useEditorStore } from "../../core/store";
import type { Bounds, Guide, Handle, NodeId, Point, SceneNode } from "../../core/types";
import { CanvasRenderer, selectionHandleAt, type RenderOverlay } from "../../render/canvas-renderer";

type Interaction =
  | { readonly type: "idle" }
  | { readonly type: "pan"; readonly screen: Point; readonly viewport: { x: number; y: number; zoom: number } }
  | { readonly type: "move"; readonly world: Point; readonly nodes: Readonly<Record<NodeId, SceneNode>>; readonly bounds: Bounds }
  | { readonly type: "marquee"; readonly start: Point; readonly current: Point }
  | { readonly type: "draw"; readonly start: Point; readonly node: SceneNode }
  | { readonly type: "resize"; readonly start: Point; readonly handle: Exclude<Handle, "rotate">; readonly node: SceneNode }
  | { readonly type: "rotate"; readonly center: Point; readonly startAngle: number; readonly node: SceneNode };

const IDLE: Interaction = { type: "idle" };
const SNAP_SCREEN_THRESHOLD = 6;
interface SnapCandidate { readonly distance: number; readonly target: number; readonly source: number; readonly bounds: Bounds; }

function pointerPosition(event: ReactPointerEvent<HTMLCanvasElement>, canvas: HTMLCanvasElement): Point {
  const bounds = canvas.getBoundingClientRect();
  return { x: event.clientX - bounds.left, y: event.clientY - bounds.top };
}

function normalizedBounds(start: Point, end: Point): Bounds {
  return { x: Math.min(start.x, end.x), y: Math.min(start.y, end.y), width: Math.abs(end.x - start.x), height: Math.abs(end.y - start.y) };
}

function selectableIds(selection: readonly NodeId[], nodes: Readonly<Record<NodeId, SceneNode>>): readonly NodeId[] {
  const selected = new Set(selection);
  return selection.filter((id) => {
    let parentId = nodes[id]?.parentId ?? null;
    while (parentId) {
      if (selected.has(parentId)) return false;
      parentId = nodes[parentId]?.parentId ?? null;
    }
    return true;
  });
}

function cursorFor(tool: string, interaction: Interaction): string {
  if (interaction.type === "pan") return "grabbing";
  if (interaction.type === "move") return "move";
  if (interaction.type === "rotate") return "crosshair";
  if (interaction.type === "resize") return `${interaction.handle}-resize`;
  if (tool === "hand") return "grab";
  if (tool === "text") return "text";
  if (tool === "select") return "default";
  return "crosshair";
}

function moveSnap(
  bounds: Bounds,
  delta: Point,
  selection: readonly NodeId[],
  renderer: CanvasRenderer,
  zoom: number,
): { delta: Point; guides: readonly Guide[] } {
  const moved = { x: bounds.x + delta.x, y: bounds.y + delta.y, width: bounds.width, height: bounds.height };
  const threshold = SNAP_SCREEN_THRESHOLD / zoom;
  const nearby = renderer.spatialIndex.query({ x: moved.x - 80, y: moved.y - 80, width: moved.width + 160, height: moved.height + 160 }).filter((id) => !selection.includes(id));
  const movingX = [moved.x, moved.x + moved.width / 2, moved.x + moved.width];
  const movingY = [moved.y, moved.y + moved.height / 2, moved.y + moved.height];
  let bestX: SnapCandidate | null = null;
  let bestY: SnapCandidate | null = null;
  for (const id of nearby) {
    const candidate = renderer.spatialIndex.boundsFor(id);
    if (!candidate) continue;
    const targetX = [candidate.x, candidate.x + candidate.width / 2, candidate.x + candidate.width];
    const targetY = [candidate.y, candidate.y + candidate.height / 2, candidate.y + candidate.height];
    for (const source of movingX) for (const target of targetX) {
      const snapDistance = Math.abs(target - source);
      if (snapDistance <= threshold && (!bestX || snapDistance < bestX.distance)) bestX = { distance: snapDistance, target, source, bounds: candidate };
    }
    for (const source of movingY) for (const target of targetY) {
      const snapDistance = Math.abs(target - source);
      if (snapDistance <= threshold && (!bestY || snapDistance < bestY.distance)) bestY = { distance: snapDistance, target, source, bounds: candidate };
    }
  }
  const snapped = { x: delta.x + (bestX ? bestX.target - bestX.source : 0), y: delta.y + (bestY ? bestY.target - bestY.source : 0) };
  const guides: Guide[] = [];
  if (bestX) guides.push({ axis: "x", value: bestX.target, from: Math.min(moved.y, bestX.bounds.y) - 20, to: Math.max(moved.y + moved.height, bestX.bounds.y + bestX.bounds.height) + 20 });
  if (bestY) guides.push({ axis: "y", value: bestY.target, from: Math.min(moved.x, bestY.bounds.x) - 20, to: Math.max(moved.x + moved.width, bestY.bounds.x + bestY.bounds.width) + 20 });
  return { delta: snapped, guides };
}

function parentDelta(node: SceneNode, delta: Point, nodes: Readonly<Record<NodeId, SceneNode>>): Point {
  if (!node.parentId) return delta;
  const parent = nodes[node.parentId];
  if (!parent) return delta;
  const inverse = invert(worldMatrix(parent, nodes));
  const origin = transformPoint(inverse, { x: 0, y: 0 });
  const endpoint = transformPoint(inverse, delta);
  return { x: endpoint.x - origin.x, y: endpoint.y - origin.y };
}

function resizedNode(node: SceneNode, handle: Exclude<Handle, "rotate">, worldDelta: Point, nodes: Readonly<Record<NodeId, SceneNode>>, shift: boolean, alt: boolean): SceneNode {
  const localDelta = parentDelta(node, worldDelta, nodes);
  const rotatedDelta = rotatePointAround(localDelta, { x: 0, y: 0 }, -node.rotation);
  const horizontal = handle.includes("e") ? 1 : handle.includes("w") ? -1 : 0;
  const vertical = handle.includes("s") ? 1 : handle.includes("n") ? -1 : 0;
  let width = Math.max(1, node.width + rotatedDelta.x * horizontal * (alt ? 2 : 1));
  let height = Math.max(1, node.height + rotatedDelta.y * vertical * (alt ? 2 : 1));
  if (shift && horizontal !== 0 && vertical !== 0) {
    const ratio = node.width / Math.max(1, node.height);
    if (Math.abs(width - node.width) > Math.abs(height - node.height)) height = width / ratio;
    else width = height * ratio;
  }
  const oldCenter = { x: node.x + node.width / 2, y: node.y + node.height / 2 };
  if (alt) return { ...node, x: oldCenter.x - width / 2, y: oldCenter.y - height / 2, width, height };
  const fixedLocal = {
    x: horizontal > 0 ? 0 : horizontal < 0 ? node.width : node.width / 2,
    y: vertical > 0 ? 0 : vertical < 0 ? node.height : node.height / 2,
  };
  const fixedParent = transformPoint(nodeLocalMatrix(node), fixedLocal);
  const newFixedLocal = {
    x: horizontal > 0 ? 0 : horizontal < 0 ? width : width / 2,
    y: vertical > 0 ? 0 : vertical < 0 ? height : height / 2,
  };
  const newCenterLocal = { x: width / 2, y: height / 2 };
  const rotatedOffset = rotatePointAround({ x: newFixedLocal.x - newCenterLocal.x, y: newFixedLocal.y - newCenterLocal.y }, { x: 0, y: 0 }, node.rotation);
  const newCenterParent = { x: fixedParent.x - rotatedOffset.x, y: fixedParent.y - rotatedOffset.y };
  return { ...node, x: newCenterParent.x - width / 2, y: newCenterParent.y - height / 2, width, height };
}

function imageFromFile(file: File, world: Point): Promise<SceneNode> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Unable to read image"));
    reader.onload = () => {
      if (typeof reader.result !== "string") return reject(new Error("Unable to read image"));
      const image = new Image();
      image.onload = () => {
        const scale = Math.min(1, 480 / Math.max(image.naturalWidth, image.naturalHeight));
        resolve(createImageNode(reader.result as string, world.x, world.y, image.naturalWidth * scale, image.naturalHeight * scale));
      };
      image.onerror = () => reject(new Error("Unsupported image"));
      image.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

export function EditorCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rendererRef = useRef(new CanvasRenderer());
  const interactionRef = useRef<Interaction>(IDLE);
  const overlayRef = useRef<RenderOverlay>({});
  const spacePressedRef = useRef(false);
  const [interaction, setInteractionState] = useState<Interaction>(IDLE);
  const tool = useEditorStore((state) => state.tool);
  const editingTextId = useEditorStore((state) => state.editingTextId);

  const setInteraction = (value: Interaction): void => {
    interactionRef.current = value;
    setInteractionState(value);
  };

  const render = (): void => {
    const canvas = canvasRef.current;
    if (canvas) rendererRef.current.draw(canvas, editorStore.getState(), overlayRef.current);
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    let animationFrame = 0;
    const schedule = (): void => {
      window.cancelAnimationFrame(animationFrame);
      animationFrame = window.requestAnimationFrame(render);
    };
    const resizeObserver = new ResizeObserver(schedule);
    resizeObserver.observe(canvas);
    const unsubscribe = editorStore.subscribe(schedule);
    window.addEventListener("editor-image-loaded", schedule);
    schedule();
    return () => {
      resizeObserver.disconnect(); unsubscribe(); window.removeEventListener("editor-image-loaded", schedule); window.cancelAnimationFrame(animationFrame);
    };
  }, []);

  useEffect(() => {
    const down = (event: KeyboardEvent): void => { if (event.code === "Space" && !event.repeat) spacePressedRef.current = true; };
    const up = (event: KeyboardEvent): void => { if (event.code === "Space") spacePressedRef.current = false; };
    window.addEventListener("keydown", down); window.addEventListener("keyup", up);
    return () => { window.removeEventListener("keydown", down); window.removeEventListener("keyup", up); };
  }, []);

  useEffect(() => {
    const paste = (event: ClipboardEvent): void => {
      const image = [...(event.clipboardData?.files ?? [])].find((file) => file.type.startsWith("image/"));
      if (!image) return;
      const state = editorStore.getState();
      const canvas = canvasRef.current;
      if (!canvas) return;
      const center = screenToWorld({ x: canvas.clientWidth / 2, y: canvas.clientHeight / 2 }, state.viewport);
      void imageFromFile(image, center).then((node) => editorStore.addNodes([node])).catch((error: unknown) => editorStore.toast(error instanceof Error ? error.message : "Unable to paste image"));
    };
    window.addEventListener("paste", paste);
    return () => window.removeEventListener("paste", paste);
  }, []);

  const hitNode = (world: Point): SceneNode | null => {
    const state = editorStore.getState();
    const candidates = new Set(rendererRef.current.spatialIndex.query({ x: world.x - 2, y: world.y - 2, width: 4, height: 4 }));
    const ordered = [...orderedNodes(state.document)].reverse();
    return ordered.find((node) => candidates.has(node.id) && node.visible && !node.locked && pointInNode(world, node, state.document.nodes)) ?? null;
  };

  const handlePointerDown = (event: ReactPointerEvent<HTMLCanvasElement>): void => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    if (event.button !== 0 && event.button !== 1) return;
    canvas.setPointerCapture(event.pointerId);
    const screen = pointerPosition(event, canvas);
    const state = editorStore.getState();
    const world = screenToWorld(screen, state.viewport);
    if (event.button === 1 || spacePressedRef.current || state.tool === "hand") {
      setInteraction({ type: "pan", screen, viewport: state.viewport });
      return;
    }
    if (state.tool !== "select") {
      if (state.tool === "comment") { editorStore.toast("Comment pinned to canvas"); return; }
      const nodeType = state.tool;
      if (nodeType === "frame" || nodeType === "rectangle" || nodeType === "ellipse" || nodeType === "line" || nodeType === "star" || nodeType === "text") {
        const node = createNodeForTool(nodeType, world.x, world.y);
        if (nodeType === "text") {
          editorStore.addNodes([node]); editorStore.setEditingText(node.id); editorStore.setTool("select");
          return;
        }
        const draft = { ...node, width: 1, height: nodeType === "line" ? 1 : 1 };
        overlayRef.current = { draft };
        setInteraction({ type: "draw", start: world, node: draft });
        render();
      }
      return;
    }
    const handle = selectionHandleAt(state, screen);
    const selectedNode = state.selection.length === 1 ? state.document.nodes[state.selection[0] ?? ""] : undefined;
    if (handle && selectedNode) {
      if (handle === "rotate") {
        const matrix = worldMatrix(selectedNode, state.document.nodes);
        const center = transformPoint(matrix, { x: selectedNode.width / 2, y: selectedNode.height / 2 });
        setInteraction({ type: "rotate", center, startAngle: Math.atan2(world.y - center.y, world.x - center.x), node: selectedNode });
      } else setInteraction({ type: "resize", start: world, handle, node: selectedNode });
      return;
    }
    const hit = hitNode(world);
    if (!hit) {
      if (!event.shiftKey) editorStore.clearSelection();
      setInteraction({ type: "marquee", start: world, current: world });
      overlayRef.current = { marquee: { x: world.x, y: world.y, width: 0, height: 0 } };
      return;
    }
    if (event.shiftKey) editorStore.toggleSelection(hit.id);
    else if (!state.selection.includes(hit.id)) editorStore.setSelection([hit.id]);
    const latest = editorStore.getState();
    const ids = selectableIds(latest.selection.includes(hit.id) ? latest.selection : [hit.id], latest.document.nodes);
    const nodes = Object.fromEntries(ids.flatMap((id) => latest.document.nodes[id] ? [[id, latest.document.nodes[id]]] : []));
    const bounds = unionBounds(Object.values(nodes).map((node) => nodeWorldBounds(node, latest.document.nodes)));
    if (bounds) setInteraction({ type: "move", world, nodes, bounds });
  };

  const handlePointerMove = (event: ReactPointerEvent<HTMLCanvasElement>): void => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const interaction = interactionRef.current;
    const screen = pointerPosition(event, canvas);
    const state = editorStore.getState();
    const world = screenToWorld(screen, state.viewport);
    if (interaction.type === "pan") {
      editorStore.setViewport({ ...interaction.viewport, x: interaction.viewport.x + screen.x - interaction.screen.x, y: interaction.viewport.y + screen.y - interaction.screen.y });
      return;
    }
    if (interaction.type === "marquee") {
      const marquee = normalizedBounds(interaction.start, world);
      overlayRef.current = { marquee };
      setInteraction({ ...interaction, current: world });
      render();
      return;
    }
    if (interaction.type === "draw") {
      let bounds = normalizedBounds(interaction.start, world);
      if (event.shiftKey) {
        const size = Math.max(bounds.width, bounds.height);
        bounds = { ...bounds, width: size, height: size };
      }
      const draft = { ...interaction.node, ...bounds };
      overlayRef.current = { draft };
      render();
      return;
    }
    if (interaction.type === "move") {
      const rawDelta = { x: world.x - interaction.world.x, y: world.y - interaction.world.y };
      const snapped = event.metaKey || event.ctrlKey ? { delta: rawDelta, guides: [] } : moveSnap(interaction.bounds, rawDelta, Object.keys(interaction.nodes), rendererRef.current, state.viewport.zoom);
      const patches = Object.fromEntries(Object.values(interaction.nodes).map((node) => {
        const delta = parentDelta(node, snapped.delta, state.document.nodes);
        return [node.id, { x: node.x + delta.x, y: node.y + delta.y }];
      }));
      editorStore.setPreview(patches, snapped.guides);
      return;
    }
    if (interaction.type === "resize") {
      const delta = { x: world.x - interaction.start.x, y: world.y - interaction.start.y };
      const resized = resizedNode(interaction.node, interaction.handle, delta, state.document.nodes, event.shiftKey, event.altKey);
      editorStore.setPreview({ [interaction.node.id]: resized });
      return;
    }
    if (interaction.type === "rotate") {
      const angle = Math.atan2(world.y - interaction.center.y, world.x - interaction.center.x);
      let rotation = interaction.node.rotation + (angle - interaction.startAngle) * 180 / Math.PI;
      if (event.shiftKey) rotation = Math.round(rotation / 15) * 15;
      editorStore.setPreview({ [interaction.node.id]: { rotation } });
    }
  };

  const handlePointerUp = (event: ReactPointerEvent<HTMLCanvasElement>): void => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const interaction = interactionRef.current;
    if (canvas.hasPointerCapture(event.pointerId)) canvas.releasePointerCapture(event.pointerId);
    if (interaction.type === "move") editorStore.commitPreview("Move layers");
    else if (interaction.type === "resize") editorStore.commitPreview("Resize layer");
    else if (interaction.type === "rotate") editorStore.commitPreview("Rotate layer");
    else if (interaction.type === "marquee") {
      const bounds = normalizedBounds(interaction.start, interaction.current);
      const state = editorStore.getState();
      const ids = rendererRef.current.spatialIndex.query(bounds).filter((id) => {
        const node = state.document.nodes[id];
        const nodeBounds = node ? nodeWorldBounds(node, state.document.nodes) : null;
        return node && node.visible && !node.locked && nodeBounds && containsPoint(bounds, { x: nodeBounds.x, y: nodeBounds.y }) && containsPoint(bounds, { x: nodeBounds.x + nodeBounds.width, y: nodeBounds.y + nodeBounds.height });
      });
      editorStore.setSelection(ids);
    } else if (interaction.type === "draw") {
      const draft = overlayRef.current.draft;
      if (draft && (draft.width > 2 || draft.height > 2)) editorStore.addNodes([draft]);
      editorStore.setTool("select");
    }
    overlayRef.current = {};
    editorStore.cancelPreview();
    setInteraction(IDLE);
    render();
  };

  const handleDoubleClick = (event: ReactPointerEvent<HTMLCanvasElement>): void => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const world = screenToWorld(pointerPosition(event, canvas), editorStore.getState().viewport);
    const hit = hitNode(world);
    if (hit?.type === "text") {
      editorStore.setSelection([hit.id]);
      editorStore.setEditingText(hit.id);
    }
  };

  const handleWheel = (event: React.WheelEvent<HTMLCanvasElement>): void => {
    event.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const state = editorStore.getState();
    const screen = { x: event.nativeEvent.offsetX, y: event.nativeEvent.offsetY };
    if (event.ctrlKey || event.metaKey) {
      const world = screenToWorld(screen, state.viewport);
      const zoom = Math.min(64, Math.max(0.1, state.viewport.zoom * Math.exp(-event.deltaY * 0.008)));
      editorStore.setViewport({ x: screen.x - world.x * zoom, y: screen.y - world.y * zoom, zoom });
    } else editorStore.setViewport({ ...state.viewport, x: state.viewport.x - event.deltaX, y: state.viewport.y - event.deltaY });
  };

  const handleDrop = (event: React.DragEvent<HTMLCanvasElement>): void => {
    event.preventDefault();
    const canvas = canvasRef.current;
    const file = event.dataTransfer.files[0];
    if (!canvas || !file) return;
    if (file.type === "application/json" || file.name.endsWith(".json")) {
      void readDocumentFile(file).then((document) => editorStore.importDocument(document)).catch((error: unknown) => editorStore.toast(error instanceof Error ? error.message : "Invalid document"));
      return;
    }
    if (!file.type.startsWith("image/")) return;
    const bounds = canvas.getBoundingClientRect();
    const world = screenToWorld({ x: event.clientX - bounds.left, y: event.clientY - bounds.top }, editorStore.getState().viewport);
    void imageFromFile(file, world).then((node) => editorStore.addNodes([node])).catch((error: unknown) => editorStore.toast(error instanceof Error ? error.message : "Unable to add image"));
  };

  return (
    <div className="canvas-surface">
      <canvas
        ref={canvasRef}
        className="editor-canvas"
        aria-label="Design canvas"
        style={{ cursor: cursorFor(tool, interaction) }}
        onContextMenu={(event) => event.preventDefault()}
        onDoubleClick={handleDoubleClick}
        onDragOver={(event) => event.preventDefault()}
        onDrop={handleDrop}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onWheel={handleWheel}
      />
      {editingTextId ? <InlineTextEditor id={editingTextId} /> : null}
    </div>
  );
}

function InlineTextEditor({ id }: { readonly id: NodeId }) {
  const node = useEditorStore((state) => state.document.nodes[id]);
  const nodes = useEditorStore((state) => state.document.nodes);
  const viewport = useEditorStore((state) => state.viewport);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const input = inputRef.current;
    if (!input) return;
    input.focus(); input.select();
  }, []);

  if (!node || node.type !== "text") return null;
  const matrix = worldMatrix(node, nodes);
  const style: CSSProperties = {
    width: node.width,
    height: Math.max(node.height, node.fontSize * node.lineHeight),
    transform: `matrix(${matrix.a * viewport.zoom}, ${matrix.b * viewport.zoom}, ${matrix.c * viewport.zoom}, ${matrix.d * viewport.zoom}, ${matrix.e * viewport.zoom + viewport.x}, ${matrix.f * viewport.zoom + viewport.y})`,
    fontFamily: node.fontFamily,
    fontSize: node.fontSize,
    fontWeight: node.fontWeight,
    fontStyle: node.italic ? "italic" : "normal",
    lineHeight: node.lineHeight,
    letterSpacing: node.letterSpacing,
    textAlign: node.textAlign === "start" || node.textAlign === "end" ? node.textAlign : node.textAlign,
  };
  const commit = (): void => {
    const value = inputRef.current?.value ?? node.text;
    if (value !== node.text) editorStore.updateNodes("Edit text", { [id]: { text: value } });
    editorStore.setEditingText(null);
  };
  return (
    <textarea
      ref={inputRef}
      className="inline-text-editor"
      defaultValue={node.text}
      style={style}
      onBlur={commit}
      onKeyDown={(event) => {
        event.stopPropagation();
        if (event.key === "Escape") { editorStore.setEditingText(null); inputRef.current?.blur(); }
        if ((event.metaKey || event.ctrlKey) && event.key === "Enter") inputRef.current?.blur();
      }}
    />
  );
}
