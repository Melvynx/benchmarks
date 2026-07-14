// Fullscreen drawing editor page body. Owns loading an existing drawing,
// saving (render preview + persist scene), image upload, and the
// unsaved-changes guard. Layout: a header bar, a floating toolbar, a floating
// properties panel, and a centered 16:9 canvas.

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { dialogManager } from "@/features/dialog-manager/dialog-manager";
import {
  drawingDocumentRef,
  saveDrawingRef,
  uploadInspirationImageRef,
} from "@/features/inspiration/inspiration.convex";
import { STAGE_HEIGHT, STAGE_WIDTH } from "./drawing-document";
import { cn } from "@/lib/utils";
import {
  useAction as useConvexAction,
  useQuery as useConvexQuery,
} from "convex/react";
import { ArrowLeft, Loader2, Save } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { DrawingCanvas } from "./drawing-canvas";
import { deserializeDocument } from "./drawing-document";
import { createImage } from "./drawing-factory";
import { DrawingProperties } from "./drawing-properties";
import { renderDocumentToDataUrl } from "./drawing-render";
import { useDrawingStore } from "./drawing-store";
import { DrawingToolbar } from "./drawing-toolbar";
import { useDrawingShortcuts } from "./use-drawing-shortcuts";

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

type DrawingEditorProps = {
  orgSlug: string;
  inspirationId?: string;
  onExit: () => void;
  onSaved: (inspirationId: string) => void;
};

export function DrawingEditor({
  orgSlug,
  inspirationId,
  onExit,
  onSaved,
}: DrawingEditorProps) {
  const saveDrawing = useConvexAction(saveDrawingRef);
  const uploadImage = useConvexAction(uploadInspirationImageRef);

  const loadDocument = useDrawingStore((state) => state.loadDocument);
  const reset = useDrawingStore((state) => state.reset);
  const addElement = useDrawingStore((state) => state.addElement);
  const isDirty = useDrawingStore((state) => state.isDirty);
  const elementCount = useDrawingStore((state) => state.elements.length);

  const [title, setTitle] = useState("Untitled drawing");
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const loadedRef = useRef(false);

  const existing = useConvexQuery(
    drawingDocumentRef,
    inspirationId ? { orgSlug, inspirationId } : "skip",
  );

  // Initialise the store: reset for a new drawing, or hydrate from an existing
  // one exactly once (so we never clobber in-progress edits on re-render).
  useEffect(() => {
    if (!inspirationId) {
      reset();
      setTitle("Untitled drawing");
      loadedRef.current = true;
      return;
    }
    if (existing === undefined || loadedRef.current) return;
    loadedRef.current = true;
    setTitle(existing.title || "Untitled drawing");
    const { document } = deserializeDocument(existing.drawing);
    loadDocument(document);
  }, [existing, inspirationId, loadDocument, reset]);

  // Reset the one-shot load guard when switching which drawing we edit.
  useEffect(() => {
    loadedRef.current = false;
  }, [inspirationId]);

  // Warn before the browser unloads with unsaved changes.
  useEffect(() => {
    const handler = (event: BeforeUnloadEvent) => {
      if (useDrawingStore.getState().isDirty) {
        event.preventDefault();
        event.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, []);

  const handleSave = useCallback(async () => {
    const store = useDrawingStore.getState();
    if (store.elements.length === 0) {
      toast.error("Add something to your drawing first");
      return;
    }
    if (isSaving) return;
    setIsSaving(true);
    try {
      const document = store.getDocument();
      const imageDataUrl = await renderDocumentToDataUrl(document);
      const drawing = store.getSerialized();
      const result = await saveDrawing({
        orgSlug,
        inspirationId,
        title: title.trim() || "Untitled drawing",
        imageDataUrl,
        drawing,
      });
      store.markSaved();
      toast.success(inspirationId ? "Drawing updated" : "Drawing saved");
      onSaved(result.id);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to save drawing",
      );
    } finally {
      setIsSaving(false);
    }
  }, [inspirationId, isSaving, onSaved, orgSlug, saveDrawing, title]);

  useDrawingShortcuts({ onSave: handleSave });

  const handleExit = useCallback(() => {
    if (!useDrawingStore.getState().isDirty) {
      onExit();
      return;
    }
    dialogManager.confirm({
      title: "Discard unsaved changes?",
      description:
        "You have unsaved changes to this drawing. Leaving now will discard them.",
      variant: "destructive",
      action: {
        label: "Discard",
        variant: "destructive",
        onClick: async () => {
          useDrawingStore.getState().markSaved();
          onExit();
        },
      },
    });
  }, [onExit]);

  const handleImageFile = useCallback(
    async (file: File) => {
      if (file.size > MAX_IMAGE_BYTES) {
        toast.error("Image is too large (max 5MB)");
        return;
      }
      setIsUploadingImage(true);
      try {
        const url = await uploadImage({
          orgSlug,
          bytes: await file.arrayBuffer(),
          fileName: file.name,
          contentType: file.type,
        });
        const ratio = await loadImageRatio(url).catch(() => 1.6);
        addElement(
          createImage({ x: STAGE_WIDTH / 2, y: STAGE_HEIGHT / 2 }, url, ratio),
        );
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Failed to upload image",
        );
      } finally {
        setIsUploadingImage(false);
      }
    },
    [addElement, orgSlug, uploadImage],
  );

  const isLoadingExisting = Boolean(inspirationId) && existing === undefined;
  const isMissingDrawing =
    Boolean(inspirationId) &&
    existing !== undefined &&
    existing.drawing === null;

  return (
    <div className="bg-muted/40 fixed inset-0 z-50 flex flex-col">
      <header className="border-border bg-background flex items-center justify-between gap-3 border-b px-4 py-2.5">
        <div className="flex min-w-0 items-center gap-2">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={handleExit}
            aria-label="Back"
          >
            <ArrowLeft className="size-4" />
          </Button>
          <Input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Untitled drawing"
            className="h-9 w-56 font-medium"
            aria-label="Drawing name"
          />
        </div>
        <div className="flex items-center gap-2">
          {isDirty ? (
            <span className="text-muted-foreground hidden text-xs sm:inline">
              Unsaved changes
            </span>
          ) : null}
          <Button type="button" variant="ghost" onClick={handleExit}>
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleSave}
            disabled={isSaving || elementCount === 0 || isLoadingExisting}
          >
            {isSaving ? (
              <Loader2 className="mr-2 size-4 animate-spin" />
            ) : (
              <Save className="mr-2 size-4" />
            )}
            {inspirationId ? "Save drawing" : "Save as inspiration"}
          </Button>
        </div>
      </header>

      <main className="relative flex flex-1 items-center justify-center overflow-hidden p-4 sm:p-6">
        {isLoadingExisting ? (
          <div className="text-muted-foreground flex items-center gap-2">
            <Loader2 className="size-5 animate-spin" />
            Loading drawing…
          </div>
        ) : isMissingDrawing ? (
          <div className="flex flex-col items-center gap-3 text-center">
            <p className="text-muted-foreground text-sm">
              This inspiration has no editable drawing.
            </p>
            <Button variant="outline" onClick={onExit}>
              Go back
            </Button>
          </div>
        ) : (
          <>
            <div className="absolute inset-x-0 top-3 z-20 flex justify-center px-4">
              <DrawingToolbar
                onImageFile={handleImageFile}
                isUploadingImage={isUploadingImage}
              />
            </div>

            <div className="absolute top-20 left-4 z-20 hidden md:block">
              <DrawingProperties />
            </div>

            <div
              className={cn("w-full")}
              style={{
                maxWidth: `calc((100vh - 160px) * ${STAGE_WIDTH} / ${STAGE_HEIGHT})`,
              }}
            >
              <DrawingCanvas />
            </div>
          </>
        )}
      </main>
    </div>
  );
}

async function loadImageRatio(url: string): Promise<number> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.crossOrigin = "anonymous";
    image.onload = () =>
      resolve(image.naturalWidth / Math.max(image.naturalHeight, 1));
    image.onerror = reject;
    image.src = url;
  });
}
