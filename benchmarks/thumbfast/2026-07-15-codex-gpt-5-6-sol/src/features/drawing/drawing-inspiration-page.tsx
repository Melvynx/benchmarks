import { Button } from "@/components/ui/button";
import {
  createDrawingInspirationRef,
  updateDrawingInspirationRef,
  uploadInspirationImageRef,
} from "@/features/inspiration/inspiration.convex";
import type { InspirationListItem } from "@/features/inspiration/inspiration.query";
import { useAction, useMutation } from "convex/react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  deserializeDrawingDocument,
  getDrawingTitle,
  serializeDrawingDocument,
  type DrawingDocument,
} from "./drawing-document";
import { DrawingEditor, DRAWING_EDITOR_MODEL_NAME } from "./drawing-editor";
import { exportDrawingPreview } from "./drawing-renderer";

type DrawingInspirationPageProps = {
  orgSlug: string;
  inspiration?: InspirationListItem;
  onClose: () => void;
  onSaved: (inspirationId: string) => void;
};

export function DrawingInspirationPage({
  orgSlug,
  inspiration,
  onClose,
  onSaved,
}: DrawingInspirationPageProps) {
  const uploadPreview = useAction(uploadInspirationImageRef);
  const createDrawing = useMutation(createDrawingInspirationRef);
  const updateDrawing = useMutation(updateDrawingInspirationRef);
  const initialDocument = useMemo(
    () => deserializeDrawingDocument(inspiration?.drawingMetadata),
    [inspiration?.drawingMetadata],
  );
  const initialMetadata = useMemo(
    () => serializeDrawingDocument(initialDocument),
    [initialDocument],
  );
  const [currentDocument, setCurrentDocument] =
    useState<DrawingDocument>(initialDocument);
  const [savedMetadata, setSavedMetadata] = useState(initialMetadata);
  const [isSaving, setIsSaving] = useState(false);
  const [showCloseConfirm, setShowCloseConfirm] = useState(false);
  const currentMetadata = useMemo(
    () => serializeDrawingDocument(currentDocument),
    [currentDocument],
  );
  const isDirty = currentMetadata !== savedMetadata;

  useEffect(() => {
    const previousTitle = document.title;
    const enforceTitle = () => {
      if (document.title !== DRAWING_EDITOR_MODEL_NAME) {
        document.title = DRAWING_EDITOR_MODEL_NAME;
      }
    };
    enforceTitle();
    const frame = window.requestAnimationFrame(enforceTitle);
    const observer = new MutationObserver(enforceTitle);
    observer.observe(document.head, {
      childList: true,
      subtree: true,
      characterData: true,
    });
    return () => {
      window.cancelAnimationFrame(frame);
      observer.disconnect();
      document.title = previousTitle;
    };
  }, []);

  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!isDirty) return;
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [isDirty]);

  const handleDocumentChange = useCallback((document: DrawingDocument) => {
    setCurrentDocument(document);
  }, []);

  const requestClose = () => {
    if (isDirty) {
      setShowCloseConfirm(true);
      return;
    }
    onClose();
  };

  const save = async (document: DrawingDocument) => {
    if (document.objects.length === 0 || isSaving) return;
    setIsSaving(true);

    try {
      const drawingMetadata = serializeDrawingDocument(document);
      const preview = await exportDrawingPreview(document);
      const previewUrl = await uploadPreview({
        orgSlug,
        bytes: await preview.arrayBuffer(),
        fileName: `drawing-${Date.now()}.png`,
        contentType: "image/png",
      });
      const title = getDrawingTitle(document);
      const saved = inspiration
        ? await updateDrawing({
            orgSlug,
            inspirationId: inspiration.id,
            previewUrl,
            drawingMetadata,
            title,
          })
        : await createDrawing({
            orgSlug,
            previewUrl,
            drawingMetadata,
            title,
          });

      setSavedMetadata(drawingMetadata);
      toast.success(inspiration ? "Drawing updated" : "Inspiration created");
      onSaved(saved.id);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Could not save drawing",
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
      <DrawingEditor
        initialDocument={initialDocument}
        isDirty={isDirty}
        isSaving={isSaving}
        onDocumentChange={handleDocumentChange}
        onSave={(document) => void save(document)}
        onCancel={requestClose}
      />

      {showCloseConfirm ? (
        <div
          className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/25 p-4 backdrop-blur-[2px]"
          role="alertdialog"
          aria-modal="true"
          aria-labelledby="discard-drawing-title"
        >
          <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl">
            <h2
              id="discard-drawing-title"
              className="text-base font-bold text-slate-950"
            >
              Discard this drawing?
            </h2>
            <p className="mt-1.5 text-sm leading-6 text-slate-500">
              Your unsaved changes will be lost.
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowCloseConfirm(false)}
                autoFocus
              >
                Keep editing
              </Button>
              <Button type="button" variant="destructive" onClick={onClose}>
                Discard
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
