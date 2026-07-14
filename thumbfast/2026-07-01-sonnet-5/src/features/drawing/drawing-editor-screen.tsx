import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { dialogManager } from "@/features/dialog-manager/dialog-manager";
import {
  createFromDrawingRef,
  uploadDrawingPreviewRef,
  uploadInspirationImageRef,
  updateDrawingRef,
} from "@/features/inspiration/inspiration.convex";
import { sceneHasPlaceholderPerson } from "@/features/inspiration/drawing-description";
import type { InspirationListItem } from "@/features/inspiration/inspiration.query";
import {
  useAction as useConvexAction,
  useMutation as useConvexMutation,
} from "convex/react";
import { Point } from "fabric";
import { ArrowLeft, Coins, Loader2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import {
  bringForward,
  bringToFront,
  duplicateSelection,
  deleteSelection,
  groupSelection,
  nudgeSelection,
  selectAll,
  sendBackward,
  sendToBack,
  ungroupSelection,
} from "./drawing-canvas-actions";
import { useDrawingEditorStore } from "./drawing-editor.store";
import { DrawingLayersPanel } from "./drawing-layers-panel";
import { DrawingObjectPanel } from "./drawing-object-panel";
import { DrawingTemplatePicker } from "./drawing-template-picker";
import { DrawingToolbar } from "./drawing-toolbar";
import {
  exportPreviewDataUrl,
  loadSceneIntoCanvas,
  sceneFromCanvas,
} from "./drawing-serialization";
import { getDrawingTemplate } from "./drawing-templates";
import {
  DRAWING_CANVAS_HEIGHT,
  DRAWING_CANVAS_WIDTH,
  type DrawingTool,
} from "./drawing.types";
import { FabricCanvas, type DrawingCanvasHandle } from "./fabric-canvas";

const TOOL_SHORTCUTS: Partial<Record<string, DrawingTool>> = {
  v: "select",
  h: "pan",
  r: "rect",
  o: "ellipse",
  l: "line",
  a: "arrow",
  t: "text",
  p: "freehand",
};

function isTypingTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false;
  return (
    target.tagName === "INPUT" ||
    target.tagName === "TEXTAREA" ||
    target.isContentEditable
  );
}

type DrawingEditorScreenProps = {
  orgSlug: string;
  initialInspiration?: InspirationListItem | null;
  onSaved: (inspiration: InspirationListItem) => void;
  onCancel: () => void;
};

export function DrawingEditorScreen({
  orgSlug,
  initialInspiration,
  onSaved,
  onCancel,
}: DrawingEditorScreenProps) {
  const mode = initialInspiration ? "edit" : "create";
  const [phase, setPhase] = useState<"template-picker" | "editing">(
    mode === "edit" ? "editing" : "template-picker",
  );
  const [selectedTemplateId, setSelectedTemplateId] = useState<
    string | undefined
  >(initialInspiration?.drawing?.templateId);
  const [canvasVersion, setCanvasVersion] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  const canvasHandleRef = useRef<DrawingCanvasHandle | null>(null);
  const [canvas, setCanvas] = useState<DrawingCanvasHandle["canvas"] | null>(
    null,
  );

  const setTool = useDrawingEditorStore((s) => s.setTool);
  const setZoom = useDrawingEditorStore((s) => s.setZoom);
  const undo = useDrawingEditorStore((s) => s.undo);
  const redo = useDrawingEditorStore((s) => s.redo);
  const isDirty = useDrawingEditorStore((s) => s.isDirty);
  const resetSession = useDrawingEditorStore((s) => s.resetSession);

  const createFromDrawing = useConvexAction(createFromDrawingRef);
  const uploadDrawingPreview = useConvexAction(uploadDrawingPreviewRef);
  const uploadInspirationImage = useConvexAction(uploadInspirationImageRef);
  const updateDrawing = useConvexMutation(updateDrawingRef);

  useEffect(() => resetSession, [resetSession]);

  const bumpVersion = () => setCanvasVersion((v) => v + 1);

  const zoomBy = (factor: number) => {
    if (!canvas) return;
    const nextZoom = Math.min(4, Math.max(0.1, canvas.getZoom() * factor));
    canvas.zoomToPoint(
      new Point(canvas.width / 2, canvas.height / 2),
      nextZoom,
    );
    setZoom(nextZoom);
  };

  const zoomReset = () => {
    if (!canvas) return;
    canvas.setZoom(1);
    canvas.absolutePan(new Point(0, 0));
    setZoom(1);
  };

  const handleUndo = () => {
    const json = undo();
    if (json) void canvasHandleRef.current?.restoreFromHistory(json);
  };

  const handleRedo = () => {
    const json = redo();
    if (json) void canvasHandleRef.current?.restoreFromHistory(json);
  };

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!canvas || isTypingTarget(event.target)) return;
      const activeObject = canvas.getActiveObject() as
        | { isEditing?: boolean }
        | undefined;
      if (activeObject?.isEditing) return;

      const meta = event.metaKey || event.ctrlKey;

      if (meta && event.key.toLowerCase() === "z") {
        event.preventDefault();
        if (event.shiftKey) handleRedo();
        else handleUndo();
        return;
      }
      if (meta && event.key.toLowerCase() === "y") {
        event.preventDefault();
        handleRedo();
        return;
      }
      if (meta && event.key.toLowerCase() === "d") {
        event.preventDefault();
        void duplicateSelection(canvas);
        return;
      }
      if (meta && event.key.toLowerCase() === "a") {
        event.preventDefault();
        selectAll(canvas);
        return;
      }
      if (meta && event.key.toLowerCase() === "g") {
        event.preventDefault();
        if (event.shiftKey) ungroupSelection(canvas);
        else groupSelection(canvas);
        return;
      }
      if (event.key === "Delete" || event.key === "Backspace") {
        event.preventDefault();
        deleteSelection(canvas);
        return;
      }
      if (event.key === "Escape") {
        canvas.discardActiveObject();
        canvas.requestRenderAll();
        setTool("select");
        return;
      }
      if (
        ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(event.key)
      ) {
        event.preventDefault();
        const step = event.shiftKey ? 10 : 1;
        const deltas: Record<string, [number, number]> = {
          ArrowUp: [0, -step],
          ArrowDown: [0, step],
          ArrowLeft: [-step, 0],
          ArrowRight: [step, 0],
        };
        const [dx, dy] = deltas[event.key];
        nudgeSelection(canvas, dx, dy, bumpVersion);
        return;
      }
      if (event.key === "]") {
        event.preventDefault();
        if (meta || event.shiftKey) bringToFront(canvas, bumpVersion);
        else bringForward(canvas, bumpVersion);
        return;
      }
      if (event.key === "[") {
        event.preventDefault();
        if (meta || event.shiftKey) sendToBack(canvas, bumpVersion);
        else sendBackward(canvas, bumpVersion);
        return;
      }
      if (event.key === "+" || event.key === "=") {
        event.preventDefault();
        zoomBy(1.1);
        return;
      }
      if (event.key === "-") {
        event.preventDefault();
        zoomBy(0.9);
        return;
      }
      if (meta && event.key === "0") {
        event.preventDefault();
        zoomReset();
        return;
      }

      const lower = event.key.toLowerCase();
      if (!meta && lower === "r" && event.shiftKey) {
        setTool("roundedRect");
        return;
      }
      if (!meta && !event.shiftKey && TOOL_SHORTCUTS[lower]) {
        setTool(TOOL_SHORTCUTS[lower]);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canvas]);

  useEffect(() => {
    if (!canvas) return;
    canvas.on("object:added", bumpVersion);
    canvas.on("object:removed", bumpVersion);
    canvas.on("object:modified", bumpVersion);
    canvas.on("selection:created", bumpVersion);
    canvas.on("selection:updated", bumpVersion);
    canvas.on("selection:cleared", bumpVersion);
    return () => {
      canvas.off("object:added", bumpVersion);
      canvas.off("object:removed", bumpVersion);
      canvas.off("object:modified", bumpVersion);
      canvas.off("selection:created", bumpVersion);
      canvas.off("selection:updated", bumpVersion);
      canvas.off("selection:cleared", bumpVersion);
    };
  }, [canvas]);

  const handleCanvasReady = (handle: DrawingCanvasHandle) => {
    canvasHandleRef.current = handle;
    setCanvas(handle.canvas);

    void handle.initializeScene(async (fabricCanvas) => {
      if (mode === "edit" && initialInspiration?.drawing) {
        await loadSceneIntoCanvas(fabricCanvas, initialInspiration.drawing);
        return;
      }
      const template = getDrawingTemplate(selectedTemplateId);
      template?.build(
        fabricCanvas,
        DRAWING_CANVAS_WIDTH,
        DRAWING_CANVAS_HEIGHT,
      );
    });
  };

  const handleSelectTemplate = (templateId: string) => {
    setSelectedTemplateId(templateId);
    setPhase("editing");
  };

  const handleSelectBlank = () => {
    setSelectedTemplateId(undefined);
    setPhase("editing");
  };

  const handleUploadImage = async (file: File) => {
    return uploadInspirationImage({
      orgSlug,
      bytes: await file.arrayBuffer(),
      fileName: file.name,
      contentType: file.type,
    });
  };

  const handleCancel = () => {
    if (!isDirty) {
      onCancel();
      return;
    }
    dialogManager.confirm({
      title: "Discard drawing?",
      description: "Your unsaved changes to this drawing will be lost.",
      variant: "destructive",
      action: {
        label: "Discard",
        variant: "destructive",
        onClick: () => onCancel(),
      },
    });
  };

  const handleSave = async () => {
    const handle = canvasHandleRef.current;
    if (!handle) return;

    setIsSaving(true);
    try {
      const previewDataUrl = exportPreviewDataUrl(
        handle.canvas,
        DRAWING_CANVAS_WIDTH,
        DRAWING_CANVAS_HEIGHT,
      );
      const scene = sceneFromCanvas(
        handle.canvas,
        DRAWING_CANVAS_WIDTH,
        DRAWING_CANVAS_HEIGHT,
        selectedTemplateId,
      );

      if (mode === "edit" && initialInspiration) {
        const previewUrl = await uploadDrawingPreview({
          orgSlug,
          imageDataUrl: previewDataUrl,
        });
        const updated = await updateDrawing({
          orgSlug,
          inspirationId: initialInspiration.id,
          previewUrl,
          drawing: scene,
          hasPlaceholder: sceneHasPlaceholderPerson(scene.scene),
        });
        toast.success("Drawing updated");
        onSaved(updated);
      } else {
        const template = getDrawingTemplate(selectedTemplateId);
        const created = await createFromDrawing({
          orgSlug,
          previewImageDataUrl: previewDataUrl,
          templateName: template?.name,
          drawing: scene,
        });
        toast.success("Inspiration created");
        onSaved(created);
      }
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to save drawing",
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="bg-background fixed inset-0 z-50 flex flex-col">
      <header className="flex items-center justify-between border-b px-4 py-2">
        <Button type="button" variant="ghost" size="sm" onClick={handleCancel}>
          <ArrowLeft className="size-4" />
          Back
        </Button>
        <span className="text-sm font-medium">
          {mode === "edit" ? "Edit drawing" : "New drawing"}
        </span>
        {phase === "editing" ? (
          <Button
            type="button"
            size="sm"
            onClick={() => void handleSave()}
            disabled={isSaving}
          >
            {isSaving && <Loader2 className="size-4 animate-spin" />}
            Save
            {mode === "create" && (
              <span className="ml-1 flex items-center gap-1 opacity-80">
                0.1
                <Coins className="size-3" />
              </span>
            )}
          </Button>
        ) : (
          <span />
        )}
      </header>

      {phase === "template-picker" ? (
        <DrawingTemplatePicker
          onSelectTemplate={handleSelectTemplate}
          onSelectBlank={handleSelectBlank}
        />
      ) : (
        <div className="flex flex-1 overflow-hidden">
          <div className="p-2">
            <DrawingToolbar
              canvas={canvas}
              canvasSize={{
                width: DRAWING_CANVAS_WIDTH,
                height: DRAWING_CANVAS_HEIGHT,
              }}
              onUploadImage={handleUploadImage}
              onUndo={handleUndo}
              onRedo={handleRedo}
              onZoomIn={() => zoomBy(1.1)}
              onZoomOut={() => zoomBy(0.9)}
              onZoomReset={zoomReset}
            />
          </div>

          <div className="bg-muted/40 flex flex-1 items-center justify-center overflow-auto p-8">
            <FabricCanvas
              width={DRAWING_CANVAS_WIDTH}
              height={DRAWING_CANVAS_HEIGHT}
              onReady={handleCanvasReady}
            />
          </div>

          <div className="flex w-72 shrink-0 flex-col gap-3 overflow-y-auto border-l p-3">
            <div>
              <h3 className="mb-2 text-xs font-semibold uppercase">Style</h3>
              <DrawingObjectPanel
                canvas={canvas}
                canvasVersion={canvasVersion}
                onChange={bumpVersion}
              />
            </div>
            <Separator />
            <div>
              <h3 className="mb-2 text-xs font-semibold uppercase">Layers</h3>
              <DrawingLayersPanel
                canvas={canvas}
                canvasVersion={canvasVersion}
                onChange={bumpVersion}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
