import { useEffect, useRef, useState } from 'react';
import { Maximize2, Minus, Plus } from 'lucide-react';

import {
  applyMatrixToPoint,
  applyMatrixToVector,
  composeMatrices,
  invertMatrix,
  resizeFrameLocalAxes,
  rotationMatrixDegrees,
  rotateFrameAroundCenter,
  transformRectBounds,
  translationMatrix,
} from '@/core/geometry';
import {
  cloneSceneNode,
  createEllipseNode,
  createFrameNode,
  createImageNode,
  createLineNode,
  createPolygonNode,
  createRectangleNode,
  createStarNode,
  createTextNode,
} from '@/core/model';
import { IconButton } from '@/ui/primitives';

import { SceneRenderer, screenToWorld } from './rendering/SceneRenderer';
import { useCanvasSnapshot } from './EditorStore';

import type { Matrix2D, ResizeHandle, Vec2 } from '@/core/geometry';
import type { SceneNode } from '@/core/model';
import type { EditorStore } from './EditorStore';
import type { NodeRenderOverride } from './rendering/SceneRenderer';
import type { TransformHandle } from './rendering/SceneRenderer';
import type { Tool } from './sessionTypes';

interface CanvasStageProps {
  readonly store: EditorStore;
  readonly onContextMenuRequest: (screenPoint: Vec2, worldPoint: Vec2) => void;
}

interface InitialNodeTransform {
  readonly node: SceneNode;
  readonly parentWorld: Matrix2D;
}

type PointerGesture =
  | { readonly kind: 'idle' }
  | {
      readonly kind: 'pan';
      readonly startScreen: Vec2;
      readonly initialCamera: { readonly x: number; readonly y: number; readonly zoom: number };
    }
  | { readonly kind: 'marquee'; readonly startWorld: Vec2; readonly additive: boolean }
  | {
      readonly kind: 'move';
      readonly startWorld: Vec2;
      readonly initialNodes: ReadonlyMap<string, InitialNodeTransform>;
      readonly hasMoved: boolean;
    }
  | {
      readonly kind: 'resize';
      readonly startWorld: Vec2;
      readonly handle: ResizeHandle;
      readonly initialNode: InitialNodeTransform;
    }
  | {
      readonly kind: 'rotate';
      readonly startWorld: Vec2;
      readonly initialNode: InitialNodeTransform;
    }
  | {
      readonly kind: 'draw';
      readonly startWorld: Vec2;
      readonly currentWorld: Vec2;
      readonly tool: Exclude<Tool, 'move' | 'hand'>;
      readonly parentId: string | null;
      readonly parentWorld: Matrix2D | null;
    };

interface TextEditState {
  readonly nodeId: string;
  readonly value: string;
}

const HANDLE_MAP = {
  nw: 'north-west',
  n: 'north',
  ne: 'north-east',
  e: 'east',
  se: 'south-east',
  s: 'south',
  sw: 'south-west',
  w: 'west',
} as const satisfies Record<Exclude<TransformHandle, 'rotate'>, ResizeHandle>;

function toResizeHandle(handle: TransformHandle): ResizeHandle | null {
  return handle === 'rotate' ? null : HANDLE_MAP[handle];
}

function localPointer(event: PointerEvent | WheelEvent | MouseEvent, element: HTMLElement): Vec2 {
  const bounds = element.getBoundingClientRect();
  return { x: event.clientX - bounds.left, y: event.clientY - bounds.top };
}

function isTextInputTarget(target: EventTarget | null) {
  return (
    target instanceof HTMLInputElement ||
    target instanceof HTMLTextAreaElement ||
    target instanceof HTMLSelectElement ||
    (target instanceof HTMLElement && target.isContentEditable)
  );
}

function isDrawTool(tool: Tool): tool is Extract<PointerGesture, { kind: 'draw' }>['tool'] {
  return !['move', 'hand'].includes(tool);
}

function getDrawBounds(start: Vec2, current: Vec2, keepAspect: boolean, fromCenter: boolean) {
  let deltaX = current.x - start.x;
  let deltaY = current.y - start.y;
  if (keepAspect) {
    const size = Math.max(Math.abs(deltaX), Math.abs(deltaY));
    deltaX = Math.sign(deltaX || 1) * size;
    deltaY = Math.sign(deltaY || 1) * size;
  }
  const end = { x: start.x + deltaX, y: start.y + deltaY };
  const first = fromCenter ? { x: start.x - deltaX, y: start.y - deltaY } : start;
  return {
    x: Math.min(first.x, end.x),
    y: Math.min(first.y, end.y),
    width: Math.max(1, Math.abs(end.x - first.x)),
    height: Math.max(1, Math.abs(end.y - first.y)),
  };
}

function getNearestEditableFrameId(store: EditorStore, node: SceneNode | null): string | null {
  const document = store.getSnapshot().runtime.document;
  let current: SceneNode | null = node;
  let nearestFrameId: string | null = null;
  while (current) {
    if (current.locked) return null;
    if (current.type === 'frame' && nearestFrameId === null) nearestFrameId = current.id;
    current = current.parentId ? (document.nodes[current.parentId] ?? null) : null;
  }
  return nearestFrameId;
}

function isEffectivelyLocked(store: EditorStore, node: SceneNode) {
  const { runtime } = store.getSnapshot();
  const runtimeNode = runtime.getRuntimeNode(node.id);
  return (
    node.locked ||
    runtimeNode?.ancestorIds.some((ancestorId) => runtime.document.nodes[ancestorId]?.locked) ===
      true
  );
}

function toLocalPoint(worldPoint: Vec2, parentWorld: Matrix2D | null): Vec2 {
  return parentWorld ? applyMatrixToPoint(invertMatrix(parentWorld), worldPoint) : worldPoint;
}

function localBoundsToWorldRect(
  bounds: {
    readonly x: number;
    readonly y: number;
    readonly width: number;
    readonly height: number;
  },
  parentWorld: Matrix2D | null,
) {
  const worldBounds = transformRectBounds(
    bounds,
    parentWorld ?? { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 },
  );
  return {
    x: worldBounds.minX,
    y: worldBounds.minY,
    width: worldBounds.maxX - worldBounds.minX,
    height: worldBounds.maxY - worldBounds.minY,
  };
}

function nodeFrameWorldRect(frame: NodeRenderOverride, parentWorld: Matrix2D) {
  const matrix = composeMatrices(
    parentWorld,
    translationMatrix(frame.x ?? 0, frame.y ?? 0),
    rotationMatrixDegrees(frame.rotation ?? 0),
  );
  const bounds = transformRectBounds(
    { x: 0, y: 0, width: frame.width ?? 1, height: frame.height ?? 1 },
    matrix,
  );
  return {
    x: bounds.minX,
    y: bounds.minY,
    width: bounds.maxX - bounds.minX,
    height: bounds.maxY - bounds.minY,
  };
}

function readImageFile(file: File) {
  return new Promise<{ readonly uri: string; readonly width: number; readonly height: number }>(
    (resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => reject(new Error('The image could not be read.'));
      reader.onload = () => {
        if (typeof reader.result !== 'string') {
          reject(new Error('The image did not produce a usable data URL.'));
          return;
        }
        const uri = reader.result;
        const image = new Image();
        image.onerror = () => reject(new Error('The image format is not supported.'));
        image.onload = () =>
          resolve({ uri, width: image.naturalWidth, height: image.naturalHeight });
        image.src = uri;
      };
      reader.readAsDataURL(file);
    },
  );
}

function applyTextCaseForMeasurement(
  content: string,
  textCase: Extract<SceneNode, { type: 'text' }>['textCase'],
) {
  if (textCase === 'upper') return content.toLocaleUpperCase();
  if (textCase === 'lower') return content.toLocaleLowerCase();
  if (textCase === 'title') {
    return content.replace(/\b\p{L}/gu, (character) => character.toLocaleUpperCase());
  }
  return content;
}

function resizeTextNodeForContent(node: Extract<SceneNode, { type: 'text' }>, content: string) {
  if (node.autoResize === 'none') return { width: node.width, height: node.height };
  const context = document.createElement('canvas').getContext('2d');
  if (!context) return { width: node.width, height: node.height };
  context.font = `${node.fontStyle} ${node.fontWeight} ${node.fontSize}px "${node.fontFamily}", sans-serif`;
  const resolvedContent = applyTextCaseForMeasurement(content, node.textCase);
  const lineHeight = node.lineHeight <= 4 ? node.fontSize * node.lineHeight : node.lineHeight;
  const trackedWidth = (value: string) =>
    context.measureText(value).width +
    Math.max(0, Array.from(value).length - 1) * node.letterSpacing;

  if (node.autoResize === 'width-and-height') {
    const lines = resolvedContent.split('\n');
    return {
      width: Math.max(1, ...lines.map(trackedWidth)),
      height: Math.max(lineHeight, lines.length * lineHeight),
    };
  }

  const lines: string[] = [];
  for (const paragraph of resolvedContent.split('\n')) {
    const words = paragraph.split(/\s+/u).filter(Boolean);
    if (words.length === 0) {
      lines.push('');
      continue;
    }
    let line = words[0] ?? '';
    for (const word of words.slice(1)) {
      const candidate = `${line} ${word}`;
      if (trackedWidth(candidate) <= node.width) line = candidate;
      else {
        lines.push(line);
        line = word;
      }
    }
    lines.push(line);
  }
  return { width: node.width, height: Math.max(lineHeight, lines.length * lineHeight) };
}

function topLevelSelectedNodes(store: EditorStore) {
  const { runtime, session } = store.getSnapshot();
  const { document } = runtime;
  return [...session.selectedIds]
    .filter((id) => {
      const node = document.nodes[id];
      if (!node || isEffectivelyLocked(store, node)) return false;
      let parentId = node.parentId;
      while (parentId) {
        if (session.selectedIds.has(parentId)) return false;
        parentId = document.nodes[parentId]?.parentId ?? null;
      }
      return true;
    })
    .map((id) => document.nodes[id])
    .filter((node): node is SceneNode => node !== undefined);
}

export function CanvasStage({ store, onContextMenuRequest }: CanvasStageProps) {
  const snapshot = useCanvasSnapshot(store);
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneCanvasRef = useRef<HTMLCanvasElement>(null);
  const overlayCanvasRef = useRef<HTMLCanvasElement>(null);
  const textAreaRef = useRef<HTMLTextAreaElement>(null);
  const rendererRef = useRef<SceneRenderer | null>(null);
  const gestureRef = useRef<PointerGesture>({ kind: 'idle' });
  const activePointerIdRef = useRef<number | null>(null);
  const isSpacePressedRef = useRef(false);
  const renderFrameRef = useRef<number | null>(null);
  const lastCursorUpdateRef = useRef(0);
  const textEditRef = useRef<TextEditState | null>(null);
  const [textEdit, setTextEdit] = useState<TextEditState | null>(null);
  const [isFileDragging, setIsFileDragging] = useState(false);

  textEditRef.current = textEdit;

  useEffect(() => {
    const container = containerRef.current;
    const sceneCanvas = sceneCanvasRef.current;
    const overlayCanvas = overlayCanvasRef.current;
    if (!container || !sceneCanvas || !overlayCanvas) return;

    const scheduleRender = () => {
      if (renderFrameRef.current !== null) return;
      renderFrameRef.current = window.requestAnimationFrame(() => {
        renderFrameRef.current = null;
        const snapshot = store.getSnapshot();
        rendererRef.current?.render(snapshot.runtime, snapshot.session, snapshot.renderOverrides);
        positionTextEditor();
      });
    };

    const renderer = new SceneRenderer(sceneCanvas, overlayCanvas, scheduleRender);
    rendererRef.current = renderer;
    const resizeObserver = new ResizeObserver(([entry]) => {
      if (!entry) return;
      const { width, height } = entry.contentRect;
      renderer.resize(width, height);
      store.setViewport(width, height);
      scheduleRender();
    });
    resizeObserver.observe(container);
    const unsubscribe = store.subscribe(scheduleRender);
    scheduleRender();

    function positionTextEditor() {
      const editor = textAreaRef.current;
      const editing = textEditRef.current;
      if (!editor || !editing) return;
      const snapshot = store.getSnapshot();
      const drawn = renderer.getDrawnNode(editing.nodeId);
      const node = snapshot.runtime.document.nodes[editing.nodeId];
      if (!drawn || node?.type !== 'text') return;
      const zoom = snapshot.session.camera.zoom;
      const origin = {
        x: drawn.matrix.e * zoom + snapshot.session.camera.x,
        y: drawn.matrix.f * zoom + snapshot.session.camera.y,
      };
      const angle = Math.atan2(drawn.matrix.b, drawn.matrix.a);
      editor.style.left = `${origin.x}px`;
      editor.style.top = `${origin.y}px`;
      editor.style.width = `${Math.max(30, node.width * zoom)}px`;
      editor.style.height = `${Math.max(node.fontSize * 1.5, node.height * zoom)}px`;
      editor.style.fontFamily = `"${node.fontFamily}", sans-serif`;
      editor.style.fontSize = `${node.fontSize * zoom}px`;
      editor.style.fontWeight = `${node.fontWeight}`;
      editor.style.lineHeight = `${node.lineHeight <= 4 ? node.lineHeight : node.lineHeight / node.fontSize}`;
      editor.style.color = 'oklch(0.12 0 0)';
      editor.style.transform = `rotate(${angle}rad)`;
    }

    return () => {
      resizeObserver.disconnect();
      unsubscribe();
      if (renderFrameRef.current !== null) window.cancelAnimationFrame(renderFrameRef.current);
      rendererRef.current = null;
    };
  }, [store]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.code === 'Space' && !(event.target instanceof HTMLInputElement)) {
        isSpacePressedRef.current = true;
      }
      if (event.key === 'Escape' && gestureRef.current.kind !== 'idle') {
        const pointerId = activePointerIdRef.current;
        const container = containerRef.current;
        if (pointerId !== null && container?.hasPointerCapture(pointerId)) {
          container.releasePointerCapture(pointerId);
        }
        activePointerIdRef.current = null;
        gestureRef.current = { kind: 'idle' };
        store.clearRenderPreview();
      }
    };
    const onKeyUp = (event: KeyboardEvent) => {
      if (event.code === 'Space') isSpacePressedRef.current = false;
    };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, [store]);

  useEffect(() => {
    const onPaste = (event: ClipboardEvent) => {
      if (isTextInputTarget(event.target)) return;
      const file = [...(event.clipboardData?.files ?? [])].find((candidate) =>
        candidate.type.startsWith('image/'),
      );
      event.preventDefault();
      if (!file) {
        store.paste();
        return;
      }
      const snapshot = store.getSnapshot();
      const screenPoint = {
        x: snapshot.session.viewport.width / 2,
        y: snapshot.session.viewport.height / 2,
      };
      void placeImage(file, screenToWorld(screenPoint, snapshot.session));
    };
    window.addEventListener('paste', onPaste);
    return () => window.removeEventListener('paste', onPaste);
  }, [store]);

  const placeImage = async (file: File, worldPoint: Vec2) => {
    if (file.size > 20 * 1024 * 1024) {
      store.addToast('Image exceeds the 20 MB limit.', 'error');
      return;
    }
    try {
      const image = await readImageFile(file);
      const maxDimension = 420;
      const scale = Math.min(1, maxDimension / Math.max(image.width, image.height));
      const node = createImageNode({
        name: file.name || 'Pasted image',
        x: worldPoint.x,
        y: worldPoint.y,
        width: image.width * scale,
        height: image.height * scale,
        source: {
          kind: 'data-url',
          uri: image.uri,
          mimeType: file.type,
          intrinsicWidth: image.width,
          intrinsicHeight: image.height,
        },
        cornerRadii: { topLeft: 10, topRight: 10, bottomRight: 10, bottomLeft: 10 },
      });
      store.createNode(node);
      store.addToast('Image placed on canvas', 'success');
    } catch (error: unknown) {
      store.addToast(
        error instanceof Error ? error.message : 'The image could not be placed.',
        'error',
      );
    }
  };

  const startTextEdit = (nodeId: string) => {
    const node = store.document.nodes[nodeId];
    if (node?.type !== 'text' || isEffectivelyLocked(store, node)) return;
    setTextEdit({ nodeId, value: node.content });
    store.select(nodeId);
    store.setInteraction({ kind: 'text-edit', nodeId });
    window.requestAnimationFrame(() => {
      textAreaRef.current?.focus();
      textAreaRef.current?.select();
    });
  };

  const commitTextEdit = () => {
    const editing = textEditRef.current;
    if (!editing) return;
    const node = store.document.nodes[editing.nodeId];
    if (node?.type === 'text' && node.content !== editing.value) {
      const size = resizeTextNodeForContent(node, editing.value);
      store.updateNodes(
        [cloneSceneNode({ ...node, content: editing.value, ...size })],
        'Edit text',
      );
    }
    setTextEdit(null);
    store.setInteraction({ kind: 'idle' });
  };

  const onPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    const container = containerRef.current;
    if (!container || event.button > 1) return;
    if (
      event.target instanceof Element &&
      event.target.closest('button, input, textarea, select, [contenteditable="true"]')
    )
      return;
    container.setPointerCapture(event.pointerId);
    activePointerIdRef.current = event.pointerId;
    const screenPoint = localPointer(event.nativeEvent, container);
    const snapshot = store.getSnapshot();
    const worldPoint = screenToWorld(screenPoint, snapshot.session);
    const shouldPan =
      event.button === 1 || isSpacePressedRef.current || snapshot.session.activeTool === 'hand';
    if (shouldPan) {
      gestureRef.current = {
        kind: 'pan',
        startScreen: screenPoint,
        initialCamera: snapshot.session.camera,
      };
      store.setInteraction({ kind: 'panning', origin: screenPoint });
      return;
    }

    const selectedId =
      snapshot.session.selectedIds.size === 1 ? [...snapshot.session.selectedIds][0] : null;
    const handle = selectedId ? rendererRef.current?.hitTransformHandle(screenPoint) : null;
    const selectedNode = selectedId ? snapshot.runtime.document.nodes[selectedId] : null;
    if (
      handle &&
      selectedNode &&
      !isEffectivelyLocked(store, selectedNode) &&
      snapshot.session.activeTool === 'move'
    ) {
      const initialNode = {
        node: selectedNode,
        parentWorld: snapshot.runtime.getParentWorldMatrix(selectedNode.id),
      };
      const resizeHandle = toResizeHandle(handle);
      gestureRef.current = resizeHandle
        ? { kind: 'resize', startWorld: worldPoint, handle: resizeHandle, initialNode }
        : { kind: 'rotate', startWorld: worldPoint, initialNode };
      store.setInteraction({
        kind: 'transform',
        preview: { nodeIds: [selectedNode.id], kind: handle === 'rotate' ? 'rotate' : 'resize' },
      });
      return;
    }

    if (isDrawTool(snapshot.session.activeTool)) {
      const hit = snapshot.runtime.hitTest(worldPoint, 4 / snapshot.session.camera.zoom);
      const parentId = getNearestEditableFrameId(store, hit);
      const parentWorld = parentId ? snapshot.runtime.getWorldMatrix(parentId) : null;
      gestureRef.current = {
        kind: 'draw',
        startWorld: worldPoint,
        currentWorld: worldPoint,
        tool: snapshot.session.activeTool,
        parentId,
        parentWorld,
      };
      store.setInteraction({
        kind: 'drawing',
        preview: { nodeIds: [], kind: 'draw', bounds: { ...worldPoint, width: 1, height: 1 } },
      });
      return;
    }

    const hit = snapshot.runtime.hitTest(worldPoint, 4 / snapshot.session.camera.zoom);
    if (hit) {
      if (event.shiftKey) store.select(hit.id, true);
      else if (!snapshot.session.selectedIds.has(hit.id)) store.select(hit.id);
      const initialNodes = new Map<string, InitialNodeTransform>();
      for (const node of topLevelSelectedNodes(store)) {
        initialNodes.set(node.id, {
          node,
          parentWorld: snapshot.runtime.getParentWorldMatrix(node.id),
        });
      }
      gestureRef.current = { kind: 'move', startWorld: worldPoint, initialNodes, hasMoved: false };
      return;
    }

    if (!event.shiftKey) store.clearSelection();
    gestureRef.current = { kind: 'marquee', startWorld: worldPoint, additive: event.shiftKey };
    store.setInteraction({
      kind: 'marquee',
      marquee: { origin: worldPoint, current: worldPoint },
    });
  };

  const onPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const container = containerRef.current;
    if (!container) return;
    const screenPoint = localPointer(event.nativeEvent, container);
    const snapshot = store.getSnapshot();
    const worldPoint = screenToWorld(screenPoint, snapshot.session);
    if (performance.now() - lastCursorUpdateRef.current > 50) {
      lastCursorUpdateRef.current = performance.now();
      store.setCursorWorld(worldPoint.x, worldPoint.y);
    }

    const gesture = gestureRef.current;
    if (gesture.kind === 'idle') {
      const handle = rendererRef.current?.hitTransformHandle(screenPoint);
      if (handle) {
        container.style.cursor = cursorForHandle(handle);
        store.setHoveredId(null);
        return;
      }
      container.style.removeProperty('cursor');
      const hit = snapshot.runtime.hitTest(worldPoint, 3 / snapshot.session.camera.zoom);
      store.setHoveredId(hit?.id ?? null);
      return;
    }

    if (gesture.kind === 'pan') {
      store.setCamera({
        ...gesture.initialCamera,
        x: gesture.initialCamera.x + screenPoint.x - gesture.startScreen.x,
        y: gesture.initialCamera.y + screenPoint.y - gesture.startScreen.y,
      });
      return;
    }

    if (gesture.kind === 'marquee') {
      store.setInteraction({
        kind: 'marquee',
        marquee: { origin: gesture.startWorld, current: worldPoint },
      });
      return;
    }

    if (gesture.kind === 'draw') {
      const localBounds = getDrawBounds(
        toLocalPoint(gesture.startWorld, gesture.parentWorld),
        toLocalPoint(worldPoint, gesture.parentWorld),
        event.shiftKey,
        event.altKey,
      );
      gestureRef.current = { ...gesture, currentWorld: worldPoint };
      store.setInteraction({
        kind: 'drawing',
        preview: {
          nodeIds: [],
          kind: 'draw',
          bounds: localBoundsToWorldRect(localBounds, gesture.parentWorld),
        },
      });
      return;
    }

    if (gesture.kind === 'move') {
      let delta = {
        x: worldPoint.x - gesture.startWorld.x,
        y: worldPoint.y - gesture.startWorld.y,
      };
      if (event.shiftKey) {
        if (Math.abs(delta.x) >= Math.abs(delta.y)) delta = { x: delta.x, y: 0 };
        else delta = { x: 0, y: delta.y };
      }
      const selectedIds = new Set(gesture.initialNodes.keys());
      const snapped =
        snapshot.session.isSnappingEnabled && !event.metaKey && !event.ctrlKey
          ? snapshot.runtime.snapMove(selectedIds, delta.x, delta.y, snapshot.session.camera.zoom)
          : { x: delta.x, y: delta.y, guides: [] };
      const overrides = new Map<string, NodeRenderOverride>();
      for (const [id, initial] of gesture.initialNodes) {
        const parentDelta = applyMatrixToVector(invertMatrix(initial.parentWorld), {
          x: snapped.x,
          y: snapped.y,
        });
        overrides.set(id, {
          x: initial.node.x + parentDelta.x,
          y: initial.node.y + parentDelta.y,
        });
      }
      gestureRef.current = {
        ...gesture,
        hasMoved: Math.hypot(delta.x, delta.y) > 1 / snapshot.session.camera.zoom,
      };
      store.setRenderPreview(overrides, snapped.guides);
      store.setInteraction({
        kind: 'transform',
        preview: { nodeIds: [...selectedIds], kind: 'move' },
      });
      return;
    }

    if (gesture.kind === 'resize') {
      const { node, parentWorld } = gesture.initialNode;
      const result = resizeFrameLocalAxes({
        initial: node,
        handle: gesture.handle,
        startPointerWorld: gesture.startWorld,
        currentPointerWorld: worldPoint,
        parentWorld,
        keepAspectRatio: event.shiftKey,
        fromCenter: event.altKey,
        minWidth: 1,
        minHeight: 1,
      });
      store.setRenderPreview(new Map([[node.id, result.frame]]));
      store.setInteraction({
        kind: 'transform',
        preview: {
          nodeIds: [node.id],
          kind: 'resize',
          bounds: nodeFrameWorldRect(result.frame, parentWorld),
        },
      });
      return;
    }

    const { node, parentWorld } = gesture.initialNode;
    const result = rotateFrameAroundCenter({
      initial: node,
      startPointerWorld: gesture.startWorld,
      currentPointerWorld: worldPoint,
      parentWorld,
      snap: event.shiftKey,
      snapIncrementDegrees: 15,
    });
    store.setRenderPreview(new Map([[node.id, result.frame]]));
    store.setInteraction({
      kind: 'transform',
      preview: { nodeIds: [node.id], kind: 'rotate', angle: result.frame.rotation },
    });
  };

  const onPointerUp = (event: React.PointerEvent<HTMLDivElement>) => {
    const container = containerRef.current;
    if (!container) return;
    const screenPoint = localPointer(event.nativeEvent, container);
    const snapshot = store.getSnapshot();
    const worldPoint = screenToWorld(screenPoint, snapshot.session);
    const gesture = gestureRef.current;
    gestureRef.current = { kind: 'idle' };
    if (container.hasPointerCapture(event.pointerId))
      container.releasePointerCapture(event.pointerId);
    activePointerIdRef.current = null;

    if (gesture.kind === 'marquee') {
      const bounds = {
        minX: Math.min(gesture.startWorld.x, worldPoint.x),
        minY: Math.min(gesture.startWorld.y, worldPoint.y),
        maxX: Math.max(gesture.startWorld.x, worldPoint.x),
        maxY: Math.max(gesture.startWorld.y, worldPoint.y),
      };
      const ids = snapshot.runtime.getNodesInBounds(bounds, false);
      store.setSelection(gesture.additive ? [...snapshot.session.selectedIds, ...ids] : ids);
      store.clearRenderPreview();
      return;
    }

    if (gesture.kind === 'draw') {
      finishDrawGesture(gesture, worldPoint, event.shiftKey, event.altKey);
      return;
    }

    if (gesture.kind === 'move' || gesture.kind === 'resize' || gesture.kind === 'rotate') {
      const replacements: SceneNode[] = [];
      for (const [id, override] of snapshot.renderOverrides) {
        const node = snapshot.runtime.document.nodes[id];
        if (!node) continue;
        replacements.push(
          cloneSceneNode({
            ...node,
            ...(override.x === undefined ? {} : { x: override.x }),
            ...(override.y === undefined ? {} : { y: override.y }),
            ...(override.width === undefined ? {} : { width: override.width }),
            ...(override.height === undefined ? {} : { height: override.height }),
            ...(override.rotation === undefined ? {} : { rotation: override.rotation }),
          }),
        );
      }
      if (replacements.length > 0) {
        store.updateNodes(
          replacements,
          gesture.kind === 'move'
            ? 'Move layers'
            : gesture.kind === 'resize'
              ? 'Resize layer'
              : 'Rotate layer',
        );
      } else store.clearRenderPreview();
      return;
    }

    store.setInteraction({ kind: 'idle' });
  };

  const finishDrawGesture = (
    gesture: Extract<PointerGesture, { kind: 'draw' }>,
    worldPoint: Vec2,
    keepAspect: boolean,
    fromCenter: boolean,
  ) => {
    const snapshot = store.getSnapshot();
    let bounds = getDrawBounds(
      toLocalPoint(gesture.startWorld, gesture.parentWorld),
      toLocalPoint(worldPoint, gesture.parentWorld),
      keepAspect,
      fromCenter,
    );
    if (
      bounds.width < 3 / snapshot.session.camera.zoom &&
      bounds.height < 3 / snapshot.session.camera.zoom
    ) {
      const defaults =
        gesture.tool === 'text' ? { width: 180, height: 36 } : { width: 120, height: 80 };
      const localStart = toLocalPoint(gesture.startWorld, gesture.parentWorld);
      bounds = { x: localStart.x, y: localStart.y, ...defaults };
    }
    const common = {
      parentId: gesture.parentId,
      x: bounds.x,
      y: bounds.y,
      width: bounds.width,
      height: bounds.height,
    };
    const node = createNodeForTool(gesture.tool, common);
    store.createNode(node, gesture.parentId);
    store.setTool('move');
    store.clearRenderPreview();
    if (node.type === 'text') startTextEdit(node.id);
  };

  const onDoubleClick = (event: React.MouseEvent<HTMLDivElement>) => {
    const container = containerRef.current;
    if (!container) return;
    const screenPoint = localPointer(event.nativeEvent, container);
    const snapshot = store.getSnapshot();
    const node = snapshot.runtime.hitTest(
      screenToWorld(screenPoint, snapshot.session),
      4 / snapshot.session.camera.zoom,
    );
    if (node?.type === 'text') startTextEdit(node.id);
  };

  const onWheel = (event: React.WheelEvent<HTMLDivElement>) => {
    event.preventDefault();
    const container = containerRef.current;
    if (!container) return;
    if (event.ctrlKey || event.metaKey) {
      const point = localPointer(event.nativeEvent, container);
      const zoomFactor = Math.exp(-event.deltaY * 0.003);
      store.zoomAt(point.x, point.y, store.session.camera.zoom * zoomFactor);
      return;
    }
    store.panBy(-event.deltaX, -event.deltaY);
  };

  const onContextMenu = (event: React.MouseEvent<HTMLDivElement>) => {
    event.preventDefault();
    const container = containerRef.current;
    if (!container) return;
    const canvasPoint = localPointer(event.nativeEvent, container);
    // The menu is position: fixed, so its anchor must use viewport coordinates;
    // the world hit point remains in canvas coordinates.
    onContextMenuRequest(
      { x: event.clientX, y: event.clientY },
      screenToWorld(canvasPoint, store.session),
    );
  };

  const onDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsFileDragging(false);
    const container = containerRef.current;
    const file = [...event.dataTransfer.files].find((candidate) =>
      candidate.type.startsWith('image/'),
    );
    if (!container || !file) {
      store.addToast('Drop an image file to place it on the canvas.', 'error');
      return;
    }
    const screenPoint = localPointer(event.nativeEvent, container);
    void placeImage(file, screenToWorld(screenPoint, store.session));
  };

  return (
    <div
      ref={containerRef}
      className="canvas-region"
      data-tool={snapshot.session.activeTool}
      data-interaction={snapshot.session.interaction.kind}
      data-file-dragging={isFileDragging ? 'true' : undefined}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={(event) => {
        const container = containerRef.current;
        if (container?.hasPointerCapture(event.pointerId)) {
          container.releasePointerCapture(event.pointerId);
        }
        activePointerIdRef.current = null;
        gestureRef.current = { kind: 'idle' };
        store.clearRenderPreview();
      }}
      onDoubleClick={onDoubleClick}
      onWheel={onWheel}
      onContextMenu={onContextMenu}
      onDragEnter={(event) => {
        if ([...event.dataTransfer.items].some((item) => item.kind === 'file'))
          setIsFileDragging(true);
      }}
      onDragOver={(event) => event.preventDefault()}
      onDragLeave={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null))
          setIsFileDragging(false);
      }}
      onDrop={onDrop}
      role="application"
      tabIndex={0}
      aria-label="Infinite design canvas"
    >
      <canvas ref={sceneCanvasRef} className="canvas-layer canvas-layer--scene" />
      <canvas ref={overlayCanvasRef} className="canvas-layer canvas-layer--overlay" />
      {snapshot.session.areRulersVisible ? <span className="canvas-ruler-corner" /> : null}
      {textEdit ? (
        <textarea
          ref={textAreaRef}
          className="canvas-text-editor"
          value={textEdit.value}
          aria-label="Edit text layer"
          onChange={(event) => setTextEdit({ ...textEdit, value: event.currentTarget.value })}
          onBlur={commitTextEdit}
          onKeyDown={(event) => {
            if (event.key === 'Escape') {
              event.preventDefault();
              setTextEdit(null);
              store.setInteraction({ kind: 'idle' });
              return;
            }
            if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
              event.preventDefault();
              commitTextEdit();
            }
          }}
        />
      ) : null}
      {isFileDragging ? <div className="canvas-drop-state">Drop to place image</div> : null}
      <div className="zoom-control" aria-label="Canvas zoom controls">
        <IconButton
          label="Zoom out"
          tooltipSide="top"
          icon={<Minus size={14} />}
          onClick={() =>
            store.zoomAt(
              snapshot.session.viewport.width / 2,
              snapshot.session.viewport.height / 2,
              snapshot.session.camera.zoom / 1.2,
            )
          }
        />
        <button
          type="button"
          className="zoom-value"
          aria-label="Reset zoom to 100%"
          onClick={() =>
            store.zoomAt(
              snapshot.session.viewport.width / 2,
              snapshot.session.viewport.height / 2,
              1,
            )
          }
        >
          {Math.round(snapshot.session.camera.zoom * 100)}%
        </button>
        <IconButton
          label="Zoom in"
          tooltipSide="top"
          icon={<Plus size={14} />}
          onClick={() =>
            store.zoomAt(
              snapshot.session.viewport.width / 2,
              snapshot.session.viewport.height / 2,
              snapshot.session.camera.zoom * 1.2,
            )
          }
        />
        <IconButton
          label="Zoom to fit"
          tooltipSide="top"
          icon={<Maximize2 size={14} />}
          onClick={() => store.fitAll()}
        />
      </div>
    </div>
  );
}

function createNodeForTool(
  tool: Extract<PointerGesture, { kind: 'draw' }>['tool'],
  common: {
    readonly parentId: string | null;
    readonly x: number;
    readonly y: number;
    readonly width: number;
    readonly height: number;
  },
) {
  switch (tool) {
    case 'frame':
      return createFrameNode({ ...common, name: 'Frame' });
    case 'rectangle':
      return createRectangleNode({ ...common, name: 'Rectangle' });
    case 'ellipse':
      return createEllipseNode({ ...common, name: 'Ellipse' });
    case 'line':
      return createLineNode({
        ...common,
        name: 'Line',
        start: { x: 0, y: 0 },
        end: { x: common.width, y: common.height },
      });
    case 'polygon':
      return createPolygonNode({ ...common, name: 'Polygon' });
    case 'star':
      return createStarNode({ ...common, name: 'Star' });
    case 'text':
      return createTextNode({
        ...common,
        name: 'Text',
        content: 'Type something',
        fontSize: 24,
        lineHeight: 32,
      });
  }
}

function cursorForHandle(handle: TransformHandle) {
  const cursors = {
    nw: 'nwse-resize',
    n: 'ns-resize',
    ne: 'nesw-resize',
    e: 'ew-resize',
    se: 'nwse-resize',
    s: 'ns-resize',
    sw: 'nesw-resize',
    w: 'ew-resize',
    rotate: 'crosshair',
  } as const satisfies Record<TransformHandle, string>;
  return cursors[handle];
}
