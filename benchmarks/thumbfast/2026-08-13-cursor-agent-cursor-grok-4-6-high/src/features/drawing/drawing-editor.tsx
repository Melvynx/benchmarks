import { Button } from "@/components/ui/button";
import { dialogManager } from "@/features/dialog-manager/dialog-manager";
import { uploadInspirationImageRef } from "@/features/inspiration/inspiration.convex";
import { Loader2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { useAction as useConvexAction } from "convex/react";

import { DrawingCanvas } from "./drawing-canvas";
import { DrawingProperties } from "./drawing-properties";
import { DrawingToolbar } from "./drawing-toolbar";
import {
  documentDescription,
  documentHasPerson,
  documentTitle,
  serializeDrawingDocument,
  tryParseDrawingDocument,
} from "./drawing.document";
import { exportDrawingPng } from "./drawing.export";
import type { DrawingDocument } from "./drawing.schema";
import { useDrawingEditor } from "./use-drawing-editor";

export const DRAWING_PAGE_TITLE = "Cursor Grok 4.6";

type DrawingEditorProps = {
  orgSlug: string;
  initialDocument?: DrawingDocument | null;
  isLoading?: boolean;
  onCancel: () => void;
  onSave: (input: {
    imageBytes: ArrayBuffer;
    drawingData: string;
    title: string;
    description: string;
    hasPlaceholder: boolean;
  }) => Promise<void>;
};

export function DrawingEditor({
  orgSlug,
  initialDocument,
  isLoading = false,
  onCancel,
  onSave,
}: DrawingEditorProps) {
  const editor = useDrawingEditor(initialDocument);
  const { loadDocument, markSaved, insertImage } = editor;
  const uploadInspirationImage = useConvexAction(uploadInspirationImageRef);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const loadedRef = useRef(false);

  useEffect(() => {
    document.title = DRAWING_PAGE_TITLE;
  }, []);

  useEffect(() => {
    if (!initialDocument || loadedRef.current) return;
    loadedRef.current = true;
    loadDocument(initialDocument);
  }, [initialDocument, loadDocument]);

  const requestCancel = () => {
    if (!editor.isDirty) {
      onCancel();
      return;
    }
    dialogManager.confirm({
      title: "Discard drawing?",
      description: "You have unsaved changes. Leave without saving?",
      action: {
        label: "Discard",
        variant: "destructive",
        onClick: onCancel,
      },
    });
  };

  const handleSave = async () => {
    setIsSaving(true);
    setSaveError(null);
    try {
      const blob = await exportDrawingPng(editor.document);
      const imageBytes = await blob.arrayBuffer();
      await onSave({
        imageBytes,
        drawingData: serializeDrawingDocument(editor.document),
        title: documentTitle(editor.document),
        description: documentDescription(editor.document),
        hasPlaceholder: documentHasPerson(editor.document),
      });
      markSaved(editor.document);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to save drawing";
      setSaveError(message);
      toast.error(message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleInsertImage = () => {
    fileInputRef.current?.click();
  };

  const handleFile = async (file: File) => {
    try {
      const src = await uploadInspirationImage({
        orgSlug,
        bytes: await file.arrayBuffer(),
        fileName: file.name,
        contentType: file.type || "image/png",
      });
      const bitmap = await createImageBitmap(file);
      insertImage(src, { width: bitmap.width, height: bitmap.height });
      bitmap.close();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Image upload failed");
    }
  };

  if (isLoading) {
    return (
      <div className="bg-background flex min-h-svh items-center justify-center">
        <Loader2 className="text-muted-foreground size-6 animate-spin" />
      </div>
    );
  }

  return (
    <div className="bg-muted/40 flex h-svh flex-col overflow-hidden">
      <header className="bg-background flex items-center justify-between gap-3 border-b px-4 py-2">
        <div className="flex min-w-0 items-center gap-3">
          <h1 className="truncate text-base font-semibold">{DRAWING_PAGE_TITLE}</h1>
          {editor.isDirty ? (
            <span className="text-muted-foreground text-xs">Unsaved</span>
          ) : null}
        </div>
        <div className="flex items-center gap-2">
          <Button type="button" variant="ghost" onClick={requestCancel}>
            Cancel
          </Button>
          <Button type="button" onClick={() => void handleSave()} disabled={isSaving}>
            {isSaving ? <Loader2 className="size-4 animate-spin" /> : null}
            Save inspiration
          </Button>
        </div>
      </header>

      <div className="relative flex min-h-0 flex-1 flex-col">
        <div className="pointer-events-none absolute inset-x-0 top-3 z-10 flex justify-center">
          <DrawingToolbar
            tool={editor.tool}
            onToolChange={editor.setTool}
            onInsertPerson={editor.insertPerson}
            onInsertImage={handleInsertImage}
            onInsertTemplate={(templateId) => {
              if (editor.document.elements.length === 0) {
                editor.applyTemplate(templateId);
                return;
              }
              dialogManager.confirm({
                title: "Replace drawing?",
                description:
                  "This template will replace the current objects on the canvas.",
                action: {
                  label: "Replace",
                  onClick: () => editor.applyTemplate(templateId),
                },
              });
            }}
          />
        </div>

        {editor.selectedElements.length === 1 ? (
          <div className="pointer-events-none absolute top-20 right-4 z-10">
            <DrawingProperties
              elements={editor.selectedElements}
              onChange={editor.updateSelectedStyle}
            />
          </div>
        ) : null}

        <DrawingCanvas
          document={editor.document}
          selectedIds={editor.selectedIds}
          tool={editor.tool}
          editingTextId={editor.editingTextId}
          onPointerDown={editor.pointerDown}
          onPointerMove={editor.pointerMove}
          onPointerUp={editor.pointerUp}
          onDoubleClick={editor.doubleClick}
          onTextChange={editor.updateText}
          onTextEditEnd={editor.stopTextEditing}
        />

        {saveError ? (
          <p className="text-destructive absolute bottom-4 left-1/2 -translate-x-1/2 text-sm">
            {saveError}
          </p>
        ) : null}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = "";
          if (file) void handleFile(file);
        }}
      />
    </div>
  );
}

export function drawingFromInspiration(drawingData: string | null | undefined) {
  if (!drawingData) return null;
  return tryParseDrawingDocument(drawingData);
}
