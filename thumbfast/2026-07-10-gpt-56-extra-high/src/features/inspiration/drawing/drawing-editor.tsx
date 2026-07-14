import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  createDrawingInspirationRef,
  updateDrawingInspirationRef,
  uploadInspirationImageRef,
} from "@/features/inspiration/inspiration.convex";
import { validateImageFile } from "@/lib/validation/image-validation";
import { useBlocker } from "@tanstack/react-router";
import { useAction, useMutation } from "convex/react";
import { ArrowLeft, Check, CloudUpload, Loader2, Save } from "lucide-react";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
} from "react";
import { toast } from "sonner";
import { DrawingCanvas } from "./drawing-canvas";
import {
  cloneDrawingObject,
  createDrawingTemplate,
  createPersonPlaceholder,
  DRAWING_HEIGHT,
  DRAWING_WIDTH,
  serializeDrawingDocument,
  type DrawingDocument,
  type DrawingImageObject,
  type DrawingObject,
  type DrawingTemplateId,
  type DrawingTextObject,
  type DrawingTool,
} from "./drawing-document";
import { DrawingProperties } from "./drawing-properties";
import {
  exportDrawingPreview,
  type DrawingImageCache,
} from "./drawing-renderer";
import { DrawingToolbar } from "./drawing-toolbar";
import { useDrawingHistory } from "./use-drawing-history";

type DrawingEditorProps = {
  orgSlug: string;
  initialDocument: DrawingDocument;
  initialName?: string;
  inspirationId?: string;
  onCancel: () => void;
  onSaved: (inspirationId: string) => void;
};

type SavePhase = "idle" | "rendering" | "uploading" | "saving" | "saved";

function isEditableTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false;
  return (
    target instanceof HTMLInputElement ||
    target instanceof HTMLTextAreaElement ||
    target.isContentEditable
  );
}

async function getImageDimensions(file: File) {
  return new Promise<{ width: number; height: number }>((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(objectUrl);
      resolve({ width: image.naturalWidth, height: image.naturalHeight });
    };
    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("This image could not be read"));
    };
    image.src = objectUrl;
  });
}

function fitImageDimensions(width: number, height: number) {
  const maxWidth = 520;
  const maxHeight = 460;
  const scale = Math.min(maxWidth / width, maxHeight / height, 1);
  return {
    width: Math.max(80, width * scale),
    height: Math.max(80, height * scale),
  };
}

function saveStatusLabel(phase: SavePhase) {
  switch (phase) {
    case "rendering":
      return "Rendering preview";
    case "uploading":
      return "Uploading preview";
    case "saving":
      return "Saving inspiration";
    case "saved":
      return "Saved";
    case "idle":
      return null;
  }
}

export function DrawingEditor({
  orgSlug,
  initialDocument,
  initialName = "Untitled drawing",
  inspirationId,
  onCancel,
  onSaved,
}: DrawingEditorProps) {
  const createDrawing = useMutation(createDrawingInspirationRef);
  const updateDrawing = useMutation(updateDrawingInspirationRef);
  const uploadImage = useAction(uploadInspirationImageRef);
  const history = useDrawingHistory(initialDocument);
  const [name, setName] = useState(initialName);
  const savedNameRef = useRef(initialName.trim());
  const [tool, setTool] = useState<DrawingTool>("select");
  const [selectedObjectId, setSelectedObjectId] = useState<string | null>(null);
  const [editingTextId, setEditingTextId] = useState<string | null>(null);
  const editingTextIdRef = useRef<string | null>(null);
  const [textDraft, setTextDraftState] = useState("");
  const textDraftRef = useRef("");
  const [savePhase, setSavePhase] = useState<SavePhase>("idle");
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const clipboardRef = useRef<DrawingObject | null>(null);
  const imageCacheRef = useRef<DrawingImageCache>(new Map());
  const propertyGestureRef = useRef<DrawingDocument | null>(null);
  const allowNavigationRef = useRef(false);
  const isSaving =
    savePhase === "rendering" ||
    savePhase === "uploading" ||
    savePhase === "saving";
  const editingText = editingTextId
    ? history.document.objects.find(
        (object): object is DrawingTextObject =>
          object.id === editingTextId && object.type === "text",
      )
    : null;
  const hasUncommittedText = Boolean(
    editingText && textDraft !== editingText.text,
  );
  const isDirty =
    history.isDirty ||
    name.trim() !== savedNameRef.current ||
    hasUncommittedText;
  const disabled = isSaving || isUploadingImage;
  const shouldBlockNavigation = useCallback(
    () =>
      (isDirty || isSaving || isUploadingImage) && !allowNavigationRef.current,
    [isDirty, isSaving, isUploadingImage],
  );
  const blocker = useBlocker({
    shouldBlockFn: shouldBlockNavigation,
    enableBeforeUnload: isDirty || isSaving || isUploadingImage,
    withResolver: true,
  });

  const selectedObject = useMemo(
    () =>
      history.document.objects.find(
        (object) => object.id === selectedObjectId,
      ) ?? null,
    [history.document.objects, selectedObjectId],
  );

  const setTextDraft = useCallback((value: string) => {
    textDraftRef.current = value;
    setTextDraftState(value);
  }, []);

  const finishTextEditing = useCallback(() => {
    const objectId = editingTextIdRef.current;
    if (!objectId) return;
    const draft = textDraftRef.current.trimEnd();
    editingTextIdRef.current = null;
    setEditingTextId(null);

    history.commit((current) => ({
      ...current,
      objects: draft.trim()
        ? current.objects.map((object) =>
            object.id === objectId && object.type === "text"
              ? { ...object, text: draft }
              : object,
          )
        : current.objects.filter((object) => object.id !== objectId),
    }));
    if (!draft.trim()) setSelectedObjectId(null);
  }, [history]);

  const startTextEditing = useCallback(
    (object: DrawingTextObject) => {
      finishTextEditing();
      editingTextIdRef.current = object.id;
      setEditingTextId(object.id);
      setTextDraft(object.text);
    },
    [finishTextEditing, setTextDraft],
  );

  const deleteSelected = useCallback(() => {
    if (!selectedObjectId) return;
    finishTextEditing();
    history.commit((current) => ({
      ...current,
      objects: current.objects.filter(
        (object) => object.id !== selectedObjectId,
      ),
    }));
    setSelectedObjectId(null);
  }, [finishTextEditing, history, selectedObjectId]);

  const duplicateSelected = useCallback(() => {
    const current = history.documentRef.current;
    const object = current.objects.find((item) => item.id === selectedObjectId);
    if (!object) return;
    finishTextEditing();
    const duplicate = cloneDrawingObject(object);
    history.commit({ ...current, objects: [...current.objects, duplicate] });
    setSelectedObjectId(duplicate.id);
  }, [finishTextEditing, history, selectedObjectId]);

  const copySelected = useCallback(() => {
    const object = history.documentRef.current.objects.find(
      (item) => item.id === selectedObjectId,
    );
    if (!object) return;
    clipboardRef.current = structuredClone(object);
  }, [history.documentRef, selectedObjectId]);

  const pasteClipboard = useCallback(() => {
    const current = history.documentRef.current;
    const copied = clipboardRef.current;
    if (!copied) return;
    const pasted = cloneDrawingObject(copied);
    history.commit({ ...current, objects: [...current.objects, pasted] });
    setSelectedObjectId(pasted.id);
  }, [history]);

  const updateSelectedObject = useCallback(
    (object: DrawingObject) => {
      history.commit((current) => ({
        ...current,
        objects: current.objects.map((item) =>
          item.id === object.id ? object : item,
        ),
      }));
    },
    [history],
  );

  const previewSelectedObject = useCallback(
    (object: DrawingObject) => {
      history.preview((current) => ({
        ...current,
        objects: current.objects.map((item) =>
          item.id === object.id ? object : item,
        ),
      }));
    },
    [history],
  );

  const beginPropertyChange = useCallback(() => {
    propertyGestureRef.current ??= history.documentRef.current;
  }, [history.documentRef]);

  const finishPropertyChange = useCallback(() => {
    const before = propertyGestureRef.current;
    if (!before) return;
    propertyGestureRef.current = null;
    history.commitGesture(before);
  }, [history]);

  const insertPerson = useCallback(() => {
    finishTextEditing();
    const current = history.documentRef.current;
    const person = createPersonPlaceholder();
    history.commit({ ...current, objects: [...current.objects, person] });
    setSelectedObjectId(person.id);
    setTool("select");
  }, [finishTextEditing, history]);

  const applyTemplate = useCallback(
    (templateId: DrawingTemplateId) => {
      finishTextEditing();
      const current = history.documentRef.current;
      if (
        current.objects.length &&
        !window.confirm(
          "Replace the current drawing with this starter template?",
        )
      ) {
        return;
      }
      history.commit(createDrawingTemplate(templateId));
      setSelectedObjectId(null);
      setTool("select");
    },
    [finishTextEditing, history],
  );

  const handleImageFile = useCallback(
    async (event: ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      event.target.value = "";
      if (!file) return;

      setIsUploadingImage(true);
      try {
        validateImageFile(file);
        const [{ width, height }, src] = await Promise.all([
          getImageDimensions(file),
          uploadImage({
            orgSlug,
            bytes: await file.arrayBuffer(),
            fileName: file.name,
            contentType: file.type,
          }),
        ]);
        const fitted = fitImageDimensions(width, height);
        const imageObject: DrawingImageObject = {
          id: crypto.randomUUID(),
          type: "image",
          x: (1280 - fitted.width) / 2,
          y: (720 - fitted.height) / 2,
          ...fitted,
          opacity: 1,
          src,
          name: file.name,
          fit: "cover",
        };
        const current = history.documentRef.current;
        history.commit({
          ...current,
          objects: [...current.objects, imageObject],
        });
        setSelectedObjectId(imageObject.id);
        setTool("select");
        toast.success("Image added");
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Image upload failed",
        );
      } finally {
        setIsUploadingImage(false);
      }
    },
    [history, orgSlug, uploadImage],
  );

  const requestCancel = useCallback(() => {
    onCancel();
  }, [onCancel]);

  const handleSave = useCallback(async () => {
    if (isSaving || isUploadingImage) return;
    finishTextEditing();
    const snapshot = history.documentRef.current;
    const normalizedName = name.trim();
    if (snapshot.objects.length === 0) {
      toast.error("Add something to the canvas before saving");
      return;
    }
    if (!normalizedName) {
      toast.error("Give this inspiration a name");
      return;
    }

    try {
      setSavePhase("rendering");
      const drawingMetadata = serializeDrawingDocument(snapshot);
      const preview = await exportDrawingPreview(
        snapshot,
        imageCacheRef.current,
      );

      setSavePhase("uploading");
      const previewUrl = await uploadImage({
        orgSlug,
        bytes: await preview.arrayBuffer(),
        fileName: `drawing-${Date.now()}.png`,
        contentType: "image/png",
      });

      setSavePhase("saving");
      const saved = inspirationId
        ? await updateDrawing({
            orgSlug,
            inspirationId,
            name: normalizedName,
            previewUrl,
            drawingMetadata,
          })
        : await createDrawing({
            orgSlug,
            name: normalizedName,
            previewUrl,
            drawingMetadata,
          });

      history.markSaved(snapshot);
      savedNameRef.current = normalizedName;
      setSavePhase("saved");
      allowNavigationRef.current = true;
      toast.success(inspirationId ? "Drawing updated" : "Inspiration created");
      onSaved(saved.id);
    } catch (error) {
      setSavePhase("idle");
      toast.error(
        error instanceof Error ? error.message : "Could not save drawing",
      );
    }
  }, [
    createDrawing,
    finishTextEditing,
    history,
    inspirationId,
    isSaving,
    isUploadingImage,
    name,
    onSaved,
    orgSlug,
    updateDrawing,
    uploadImage,
  ]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.isComposing || disabled) return;
      const editableTarget = isEditableTarget(event.target);

      if (event.key === "Escape") {
        if (editingTextIdRef.current) {
          event.preventDefault();
          finishTextEditing();
          return;
        }
        if (editableTarget) {
          event.preventDefault();
          (event.target as HTMLElement).blur();
          return;
        }
        if (selectedObjectId) {
          event.preventDefault();
          setSelectedObjectId(null);
          return;
        }
        if (tool !== "select") {
          event.preventDefault();
          setTool("select");
        }
        return;
      }

      if (editableTarget) return;
      const modifier = event.metaKey || event.ctrlKey;
      const key = event.key.toLowerCase();

      if (modifier && key === "z") {
        event.preventDefault();
        if (event.shiftKey) history.redo();
        else history.undo();
        return;
      }
      if (event.ctrlKey && key === "y") {
        event.preventDefault();
        history.redo();
        return;
      }
      if (modifier && key === "c" && selectedObjectId) {
        event.preventDefault();
        copySelected();
        return;
      }
      if (modifier && key === "v" && clipboardRef.current) {
        event.preventDefault();
        pasteClipboard();
        return;
      }
      if (modifier && key === "d" && selectedObjectId && !event.repeat) {
        event.preventDefault();
        duplicateSelected();
        return;
      }
      if (
        (event.key === "Delete" || event.key === "Backspace") &&
        selectedObjectId &&
        !event.repeat
      ) {
        event.preventDefault();
        deleteSelected();
        return;
      }
      if (
        !modifier &&
        selectedObjectId &&
        ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(event.key)
      ) {
        const current = history.documentRef.current;
        const object = current.objects.find(
          (item) => item.id === selectedObjectId,
        );
        if (object) {
          event.preventDefault();
          const distance = event.shiftKey ? 10 : 1;
          const deltaX =
            event.key === "ArrowLeft"
              ? -distance
              : event.key === "ArrowRight"
                ? distance
                : 0;
          const deltaY =
            event.key === "ArrowUp"
              ? -distance
              : event.key === "ArrowDown"
                ? distance
                : 0;
          const visibleEdge = 28;
          history.commit({
            ...current,
            objects: current.objects.map((item) =>
              item.id === object.id
                ? {
                    ...item,
                    x: Math.min(
                      Math.max(item.x + deltaX, -item.width + visibleEdge),
                      DRAWING_WIDTH - visibleEdge,
                    ),
                    y: Math.min(
                      Math.max(item.y + deltaY, -item.height + visibleEdge),
                      DRAWING_HEIGHT - visibleEdge,
                    ),
                  }
                : item,
            ),
          });
        }
        return;
      }
      if (modifier) return;

      const shortcutTools: Partial<Record<string, DrawingTool>> = {
        v: "select",
        t: "text",
        a: "arrow",
        r: "rectangle",
        o: "ellipse",
        p: "pencil",
      };
      const shortcutTool = shortcutTools[key];
      if (shortcutTool) {
        event.preventDefault();
        finishTextEditing();
        setTool(shortcutTool);
        return;
      }
      if (key === "i") {
        event.preventDefault();
        fileInputRef.current?.click();
      }
      if (key === "s") {
        event.preventDefault();
        insertPerson();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    copySelected,
    deleteSelected,
    disabled,
    duplicateSelected,
    finishTextEditing,
    history,
    insertPerson,
    pasteClipboard,
    selectedObjectId,
    tool,
  ]);

  const statusLabel = saveStatusLabel(savePhase);

  return (
    <div className="fixed inset-0 z-50 flex min-h-0 flex-col bg-neutral-100 text-neutral-950 dark:bg-neutral-950 dark:text-neutral-50">
      <header className="flex h-16 shrink-0 items-center gap-3 border-b border-black/10 bg-white px-3 sm:px-5 dark:border-white/10 dark:bg-neutral-900">
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          onClick={requestCancel}
          disabled={disabled}
          aria-label="Back to inspirations"
        >
          <ArrowLeft className="size-4" />
        </Button>

        <Input
          value={name}
          onChange={(event) => setName(event.target.value)}
          maxLength={120}
          disabled={isSaving}
          aria-label="Inspiration name"
          className="h-9 w-full max-w-72 border-transparent bg-transparent px-2 font-semibold shadow-none hover:border-neutral-200 focus-visible:border-neutral-300 focus-visible:ring-0 dark:hover:border-neutral-700"
        />

        <div className="ml-auto flex items-center gap-3">
          {statusLabel ? (
            <span
              role="status"
              aria-live="polite"
              className="text-muted-foreground hidden items-center gap-1.5 text-xs sm:flex"
            >
              {savePhase === "saved" ? (
                <Check className="size-3.5" />
              ) : (
                <Loader2 className="size-3.5 animate-spin" />
              )}
              {statusLabel}
            </span>
          ) : isDirty ? (
            <span className="text-muted-foreground hidden text-xs sm:block">
              Unsaved changes
            </span>
          ) : null}
          <Button
            type="button"
            onClick={() => void handleSave()}
            disabled={
              disabled ||
              history.document.objects.length === 0 ||
              (Boolean(inspirationId) && !isDirty)
            }
          >
            {isSaving ? (
              <Loader2 className="size-4 animate-spin" />
            ) : inspirationId ? (
              <Save className="size-4" />
            ) : (
              <CloudUpload className="size-4" />
            )}
            {inspirationId ? "Save changes" : "Save inspiration"}
          </Button>
        </div>
      </header>

      <main className="flex min-h-0 flex-1 flex-col items-center gap-3 overflow-hidden p-3 sm:p-4">
        <DrawingToolbar
          tool={tool}
          canUndo={history.canUndo}
          canRedo={history.canRedo}
          isUploadingImage={isUploadingImage}
          disabled={isSaving}
          onToolChange={(nextTool) => {
            finishTextEditing();
            setTool(nextTool);
          }}
          onUndo={history.undo}
          onRedo={history.redo}
          onInsertImage={() => fileInputRef.current?.click()}
          onInsertPerson={insertPerson}
          onApplyTemplate={applyTemplate}
        />

        <div className="flex min-h-0 w-full flex-1 items-center justify-center">
          <div
            className="w-full"
            style={{
              width:
                "min(1280px, calc((100dvh - 13rem) * 16 / 9), calc(100vw - 1.5rem))",
            }}
          >
            <DrawingCanvas
              document={history.document}
              documentRef={history.documentRef}
              imageCache={imageCacheRef.current}
              selectedObjectId={selectedObjectId}
              editingTextId={editingTextId}
              textDraft={textDraft}
              tool={tool}
              disabled={disabled}
              setSelectedObjectId={setSelectedObjectId}
              setTool={setTool}
              setTextDraft={setTextDraft}
              onEditText={startTextEditing}
              onFinishText={finishTextEditing}
              commit={history.commit}
              preview={history.preview}
              commitGesture={history.commitGesture}
              cancelGesture={history.cancelGesture}
            />
          </div>
        </div>

        <DrawingProperties
          selectedObject={selectedObject}
          background={history.document.background}
          disabled={disabled}
          onObjectChange={updateSelectedObject}
          onObjectPreview={previewSelectedObject}
          onPropertyChangeStart={beginPropertyChange}
          onPropertyChangeEnd={finishPropertyChange}
          onBackgroundChange={(background) =>
            history.preview((current) => ({ ...current, background }))
          }
          onDuplicate={duplicateSelected}
          onDelete={deleteSelected}
        />

        <p
          id="drawing-shortcuts"
          className="text-muted-foreground hidden text-center text-[11px] sm:block"
        >
          Double-click text to edit · Shift constrains shapes · ⌘D duplicates
        </p>
      </main>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        tabIndex={-1}
        className="sr-only"
        onChange={(event) => void handleImageFile(event)}
      />

      <AlertDialog
        open={blocker.status === "blocked"}
        onOpenChange={(open) => {
          if (
            !open &&
            blocker.status === "blocked" &&
            !allowNavigationRef.current
          ) {
            blocker.reset();
          }
        }}
      >
        <AlertDialogContent
          className="z-[60]"
          overlayProps={{ className: "z-[60]" }}
        >
          <AlertDialogHeader>
            <AlertDialogTitle>Discard drawing?</AlertDialogTitle>
            <AlertDialogDescription>
              Your unsaved changes will be lost. You can keep editing or leave
              this page.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep editing</AlertDialogCancel>
            <AlertDialogAction
              disabled={disabled}
              onClick={() => {
                if (blocker.status !== "blocked") return;
                allowNavigationRef.current = true;
                blocker.proceed();
              }}
            >
              Discard and leave
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
