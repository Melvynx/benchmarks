import { ExternalLink, X } from 'lucide-react';
import { useEffect, useRef } from 'react';

import { SceneRenderer } from '@/editor/rendering/SceneRenderer';
import { SceneRuntime } from '@/editor/sceneRuntime';
import { DEFAULT_SESSION } from '@/editor/sessionTypes';
import { IconButton } from '@/ui/primitives';
import { useFocusTrap } from '@/ui/useFocusManagement';

import type { EditorStore } from '@/editor/EditorStore';

export interface PreviewModalProps {
  readonly store: EditorStore;
  readonly onClose: () => void;
}

export function PreviewModal({ store, onClose }: PreviewModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<HTMLCanvasElement>(null);
  const overlayRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const stage = stageRef.current;
    const scene = sceneRef.current;
    const overlay = overlayRef.current;
    if (!stage || !scene || !overlay) return;
    const renderer = new SceneRenderer(scene, overlay, () => render());

    const render = () => {
      const snapshot = store.getSnapshot();
      const selectedId = [...snapshot.session.selectedIds][0];
      let rootId = selectedId ?? snapshot.document.rootIds[0];
      while (rootId && snapshot.document.nodes[rootId]?.parentId) {
        rootId = snapshot.document.nodes[rootId]?.parentId ?? rootId;
      }
      if (!rootId) return;
      const previewDocument = { ...snapshot.document, rootIds: [rootId] };
      const runtime = new SceneRuntime(previewDocument);
      const bounds = runtime.getWorldBounds(rootId);
      if (!bounds) return;
      const width = stage.clientWidth;
      const height = stage.clientHeight;
      renderer.resize(width, height);
      const frameWidth = Math.max(1, bounds.maxX - bounds.minX);
      const frameHeight = Math.max(1, bounds.maxY - bounds.minY);
      const zoom = Math.min((width - 96) / frameWidth, (height - 96) / frameHeight, 1.6);
      const session = {
        ...DEFAULT_SESSION,
        camera: {
          zoom,
          x: (width - frameWidth * zoom) / 2 - bounds.minX * zoom,
          y: (height - frameHeight * zoom) / 2 - bounds.minY * zoom,
        },
        viewport: { width, height },
        selectedIds: new Set<string>(),
        isGridVisible: false,
        areRulersVisible: false,
      };
      renderer.render(runtime, session);
    };

    const resizeObserver = new ResizeObserver(render);
    resizeObserver.observe(stage);
    const unsubscribe = store.subscribe(render);
    render();
    return () => {
      resizeObserver.disconnect();
      unsubscribe();
    };
  }, [store]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  useFocusTrap({ enabled: true, containerRef: dialogRef });

  return (
    <div
      ref={dialogRef}
      className="preview-backdrop"
      role="dialog"
      aria-modal="true"
      aria-label="Presentation preview"
    >
      <header className="preview-toolbar">
        <span className="preview-toolbar__status">
          <span className="status-dot" aria-hidden="true" />
          Presenting locally
        </span>
        <span className="preview-toolbar__hint">
          <ExternalLink size={13} aria-hidden="true" />
          Esc to return to editor
        </span>
        <IconButton label="Close preview" icon={<X size={16} />} onClick={onClose} />
      </header>
      <div ref={stageRef} className="preview-stage">
        <canvas ref={sceneRef} className="canvas-layer canvas-layer--scene" />
        <canvas ref={overlayRef} className="canvas-layer canvas-layer--overlay" />
      </div>
    </div>
  );
}
