import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { dialogManager } from "@/features/dialog-manager/dialog-manager";
import {
  createDrawingInspirationRef,
  updateDrawingInspirationRef,
  uploadInspirationImageRef,
} from "@/features/inspiration/inspiration.convex";
import { useInspiration } from "@/features/inspiration/inspiration.query";
import { useMutation } from "@/hooks/use-async-mutation";
import { useAction as useConvexAction } from "convex/react";
import { ArrowLeft, Loader2, Save } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { DrawingCanvas } from "./components/drawing-canvas";
import { DrawingProperties } from "./components/drawing-properties";
import { DrawingToolbar } from "./components/drawing-toolbar";
import {
  createEmptyDrawingDocument,
  serializeDrawingDocument,
  tryParseDrawingDocument,
} from "./drawing.document";
import { exportDrawingToBlob } from "./drawing.render";
import { useDrawingEditor } from "./use-drawing-editor";

type DrawingEditorPageProps = {
  orgSlug: string;
  inspirationId?: string;
  onClose: () => void;
  onSaved: (inspirationId: string) => void;
};

export function DrawingEditorPage({
  orgSlug,
  inspirationId,
  onClose,
  onSaved,
}: DrawingEditorPageProps) {
  const isEditing = Boolean(inspirationId);
  const { data: inspiration, isLoading } = useInspiration(
    orgSlug,
    inspirationId ?? "",
  );
  const editor = useDrawingEditor();
  const loadDocument = editor.loadDocument;
  const markSaved = editor.markSaved;
  const uploadInspirationImage = useConvexAction(uploadInspirationImageRef);
  const createDrawing = useConvexAction(createDrawingInspirationRef);
  const updateDrawing = useConvexAction(updateDrawingInspirationRef);
  const [title, setTitle] = useState("Untitled drawing");
  const [titleDirty, setTitleDirty] = useState(false);
  const [loadedId, setLoadedId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const documentRef = useRef(editor.document);
  documentRef.current = editor.document;

  useEffect(() => {
    if (!inspirationId) {
      if (loadedId !== "new") {
        loadDocument(createEmptyDrawingDocument());
        setTitle("Untitled drawing");
        setTitleDirty(false);
        setLoadedId("new");
      }
      return;
    }

    if (!inspiration || loadedId === inspiration.id) return;

    const drawing = tryParseDrawingDocument(inspiration.drawingData);
    if (!drawing) {
      toast.error("This inspiration has no editable drawing data");
      onClose();
      return;
    }

    loadDocument(drawing);
    setTitle(inspiration.name || "Untitled drawing");
    setTitleDirty(false);
    setLoadedId(inspiration.id);
  }, [inspiration, inspirationId, loadDocument, loadedId, onClose]);

  const isDirty = editor.isDirty || titleDirty;

  const saveMutation = useMutation({
    mutationFn: async () => {
      const blob = await exportDrawingToBlob(documentRef.current);
      const bytes = await blob.arrayBuffer();
      const previewUrl = await uploadInspirationImage({
        orgSlug,
        bytes,
        fileName: `drawing-${Date.now()}.png`,
        contentType: "image/png",
      });

      const drawingData = serializeDrawingDocument(documentRef.current);
      const trimmedTitle = title.trim() || "Untitled drawing";

      if (inspirationId) {
        return updateDrawing({
          orgSlug,
          inspirationId,
          title: trimmedTitle,
          imageUrl: previewUrl,
          drawingData,
        });
      }

      return createDrawing({
        orgSlug,
        title: trimmedTitle,
        imageUrl: previewUrl,
        drawingData,
      });
    },
    onSuccess: (data) => {
      markSaved(documentRef.current);
      setTitleDirty(false);
      toast.success(isEditing ? "Drawing updated" : "Drawing saved as inspiration");
      onSaved(data.id);
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const requestClose = () => {
    if (!isDirty) {
      onClose();
      return;
    }

    dialogManager.confirm({
      title: "Discard unsaved changes?",
      description: "Your drawing has unsaved changes. Leave without saving?",
      action: {
        label: "Discard",
        variant: "destructive",
        onClick: () => onClose(),
      },
      cancel: {
        label: "Keep editing",
      },
    });
  };

  const handleInsertImage = () => {
    fileInputRef.current?.click();
  };

  const handleImageSelected = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    try {
      const bytes = await file.arrayBuffer();
      const url = await uploadInspirationImage({
        orgSlug,
        bytes,
        fileName: file.name,
        contentType: file.type || "image/png",
      });
      const image = new Image();
      image.crossOrigin = "anonymous";
      await new Promise<void>((resolve, reject) => {
        image.onload = () => resolve();
        image.onerror = () => reject(new Error("Failed to load image"));
        image.src = url;
      });
      await editor.insertImage(url, image.naturalWidth, image.naturalHeight);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Image upload failed");
    }
  };

  if (isEditing && isLoading && loadedId !== inspirationId) {
    return (
      <div className="bg-background flex h-dvh items-center justify-center">
        <Loader2 className="text-muted-foreground size-6 animate-spin" />
      </div>
    );
  }

  return (
    <div className="bg-background relative flex h-dvh flex-col overflow-hidden">
      <header className="bg-background z-30 flex h-14 shrink-0 items-center justify-between gap-3 border-b px-4">
        <div className="flex min-w-0 items-center gap-3">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={requestClose}
            className="gap-1.5"
          >
            <ArrowLeft className="size-4" />
            Back
          </Button>
          <Input
            value={title}
            onChange={(event) => {
              setTitle(event.target.value);
              setTitleDirty(true);
            }}
            className="focus-visible:border-border h-8 max-w-xs border-transparent bg-transparent px-2 text-sm font-medium shadow-none"
            aria-label="Drawing title"
          />
          {isDirty ? (
            <span className="text-muted-foreground text-xs">Unsaved</span>
          ) : null}
        </div>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={requestClose}
            disabled={saveMutation.isPending}
          >
            Cancel
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={() => saveMutation.mutate()}
            disabled={saveMutation.isPending}
            className="gap-1.5"
          >
            {saveMutation.isPending ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <Save className="size-3.5" />
            )}
            {isEditing ? "Save drawing" : "Save as inspiration"}
          </Button>
        </div>
      </header>

      <div className="relative flex min-h-0 flex-1 flex-col">
        <DrawingToolbar editor={editor} onInsertImage={handleInsertImage} />
        <DrawingProperties editor={editor} />
        <DrawingCanvas editor={editor} />
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        className="hidden"
        onChange={handleImageSelected}
      />
    </div>
  );
}
