import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { SiteConfig } from "@/site-config";
import { useBlocker } from "@tanstack/react-router";
import { ArrowLeft, Check, Copy, Redo2, Save, Undo2 } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { DrawingCanvas } from "./drawing-canvas";
import {
  STARTER_TEMPLATES,
  createDocumentFromTemplate,
  createImage,
  createPerson,
  duplicateObject,
  serializeDrawingDocument,
  type DrawingDocument,
  type DrawingObject,
  type DrawingStarterTemplateId,
} from "./drawing-document";
import { DrawingProperties } from "./drawing-properties";
import { DrawingToolbar, type DrawingTool } from "./drawing-toolbar";
import { useDrawingHistory } from "./use-drawing-history";

type DrawingEditorProps = {
  initialDocument: DrawingDocument;
  initialTitle: string;
  initialPersisted: boolean;
  isSaving: boolean;
  isUploadingImage: boolean;
  onUploadImage: (file: File) => Promise<string>;
  onSave: (title: string, document: DrawingDocument) => Promise<string>;
  onSaved: (inspirationId: string) => void;
  onCancel: () => void;
};

const toolShortcuts: Partial<Record<string, DrawingTool>> = {
  v: "select",
  t: "text",
  a: "arrow",
  r: "rect",
  o: "ellipse",
  p: "pencil",
};

export function DrawingEditor({
  initialDocument,
  initialTitle,
  initialPersisted,
  isSaving,
  isUploadingImage,
  onUploadImage,
  onSave,
  onSaved,
  onCancel,
}: DrawingEditorProps) {
  const history = useDrawingHistory(initialDocument);
  const [tool, setTool] = useState<DrawingTool>("select");
  const [selectedObjectId, setSelectedObjectId] = useState<string | null>(null);
  const [editingTextId, setEditingTextId] = useState<string | null>(null);
  const [title, setTitle] = useState(initialTitle);
  const [savedSnapshot, setSavedSnapshot] = useState(() =>
    initialPersisted ? serializeDrawingDocument(initialDocument) : "",
  );
  const [savedTitle, setSavedTitle] = useState(
    initialPersisted ? initialTitle : "",
  );
  const clipboardRef = useRef<DrawingObject | null>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const allowNextNavigationRef = useRef(false);

  const currentSnapshot = useMemo(
    () => serializeDrawingDocument(history.document),
    [history.document],
  );
  const isDirty = currentSnapshot !== savedSnapshot || title !== savedTitle;
  const editorLocked = isSaving || isUploadingImage;
  const selectedObject = history.document.objects.find(
    (object) => object.id === selectedObjectId,
  );

  useEffect(() => {
    if (selectedObjectId && !selectedObject) setSelectedObjectId(null);
  }, [selectedObject, selectedObjectId]);

  useEffect(() => {
    const previousTitle = document.title;
    document.title = SiteConfig.title;
    return () => {
      document.title = previousTitle;
    };
  }, []);

  useBlocker({
    disabled: !isDirty,
    enableBeforeUnload: isDirty,
    shouldBlockFn: () => {
      if (allowNextNavigationRef.current) {
        allowNextNavigationRef.current = false;
        return false;
      }
      return !window.confirm(
        "Leave the drawing editor and discard unsaved changes?",
      );
    },
  });

  const commitDocument = useCallback(
    (previous: DrawingDocument, next: DrawingDocument) => {
      history.commitFrom(previous, next);
    },
    [history],
  );

  const removeSelectedObject = useCallback(() => {
    if (!selectedObjectId) return;
    const nextDocument = {
      ...history.document,
      objects: history.document.objects.filter(
        (object) => object.id !== selectedObjectId,
      ),
    };
    history.commit(nextDocument);
    setSelectedObjectId(null);
    setEditingTextId(null);
  }, [history, selectedObjectId]);

  const duplicateSelectedObject = useCallback(() => {
    const object = history.document.objects.find(
      (candidate) => candidate.id === selectedObjectId,
    );
    if (!object) return;
    const duplicate = keepObjectOnCanvas(
      duplicateObject(object),
      history.document,
    );
    history.commit({
      ...history.document,
      objects: [...history.document.objects, duplicate],
    });
    setSelectedObjectId(duplicate.id);
    setEditingTextId(null);
  }, [history, selectedObjectId]);

  const copySelectedObject = useCallback(() => {
    const object = history.document.objects.find(
      (candidate) => candidate.id === selectedObjectId,
    );
    if (!object) return;
    clipboardRef.current = object;
    toast.success("Object copied");
  }, [history.document.objects, selectedObjectId]);

  const pasteObject = useCallback(() => {
    const object = clipboardRef.current;
    if (!object) return;
    const duplicate = keepObjectOnCanvas(
      duplicateObject(object, 32),
      history.document,
    );
    history.commit({
      ...history.document,
      objects: [...history.document.objects, duplicate],
    });
    clipboardRef.current = duplicate;
    setSelectedObjectId(duplicate.id);
    setEditingTextId(null);
  }, [history]);

  const handleSave = useCallback(async () => {
    const normalizedTitle = title.trim() || "Untitled drawing";
    try {
      const savedDocument = history.document;
      const inspirationId = await onSave(normalizedTitle, savedDocument);
      setTitle(normalizedTitle);
      setSavedTitle(normalizedTitle);
      setSavedSnapshot(serializeDrawingDocument(savedDocument));
      allowNextNavigationRef.current = true;
      onSaved(inspirationId);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Could not save drawing",
      );
    }
  }, [history.document, onSave, onSaved, title]);

  const handleCancel = useCallback(() => {
    if (
      isDirty &&
      !window.confirm("Leave the drawing editor and discard unsaved changes?")
    ) {
      return;
    }
    allowNextNavigationRef.current = true;
    onCancel();
  }, [isDirty, onCancel]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target;
      const isEditable =
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        (target instanceof HTMLElement && target.isContentEditable);
      const modifier = event.metaKey || event.ctrlKey;
      const key = event.key.toLowerCase();

      if (event.key === "Escape") {
        event.preventDefault();
        if (isEditable && target instanceof HTMLElement) {
          target.blur();
          return;
        }
        if (editingTextId) {
          setEditingTextId(null);
          return;
        }
        if (selectedObjectId) {
          setSelectedObjectId(null);
        }
        return;
      }

      if (isEditable) return;
      if (editorLocked) return;

      if (modifier && key === "z") {
        event.preventDefault();
        if (event.shiftKey) history.redo();
        else history.undo();
        setEditingTextId(null);
        return;
      }
      if (modifier && key === "y") {
        event.preventDefault();
        history.redo();
        setEditingTextId(null);
        return;
      }
      if (modifier && key === "c" && selectedObjectId) {
        event.preventDefault();
        copySelectedObject();
        return;
      }
      if (modifier && key === "v") {
        event.preventDefault();
        pasteObject();
        return;
      }
      if (modifier && key === "d") {
        event.preventDefault();
        duplicateSelectedObject();
        return;
      }
      if (modifier && key === "s") {
        event.preventDefault();
        void handleSave();
        return;
      }
      if (
        (event.key === "Delete" || event.key === "Backspace") &&
        selectedObjectId
      ) {
        event.preventDefault();
        removeSelectedObject();
        return;
      }
      const shortcutTool = toolShortcuts[key];
      if (shortcutTool && !modifier) {
        event.preventDefault();
        setTool(shortcutTool);
        setEditingTextId(null);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    copySelectedObject,
    duplicateSelectedObject,
    editorLocked,
    editingTextId,
    handleSave,
    history,
    pasteObject,
    removeSelectedObject,
    selectedObjectId,
  ]);

  const insertPerson = () => {
    const person = keepObjectOnCanvas(createPerson(), history.document);
    history.commit({
      ...history.document,
      objects: [...history.document.objects, person],
    });
    setSelectedObjectId(person.id);
    setEditingTextId(null);
    setTool("select");
  };

  const handleImageFile = async (file: File | undefined) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Choose an image file");
      return;
    }

    try {
      const src = await onUploadImage(file);
      const object = createImage({
        src,
        alt: file.name,
        x: 380,
        y: 150,
        width: 520,
        height: 420,
      });
      history.commitWith((currentDocument) => ({
        ...currentDocument,
        objects: [...currentDocument.objects, object],
      }));
      setSelectedObjectId(object.id);
      setTool("select");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Image upload failed",
      );
    } finally {
      if (imageInputRef.current) imageInputRef.current.value = "";
    }
  };

  const applyTemplate = (templateId: string) => {
    if (
      history.document.objects.length > 0 &&
      !window.confirm("Replace the current canvas with this starter layout?")
    ) {
      return;
    }
    const template = createDocumentFromTemplate(
      templateId as DrawingStarterTemplateId,
    );
    history.commit(template);
    setSelectedObjectId(null);
    setEditingTextId(null);
    setTool("select");
  };

  const updateSelectedObject = (object: DrawingObject) => {
    history.commit({
      ...history.document,
      objects: history.document.objects.map((candidate) =>
        candidate.id === object.id ? object : candidate,
      ),
    });
  };

  return (
    <main className="bg-muted/50 fixed inset-0 z-50 flex min-h-0 flex-col overflow-hidden">
      <header className="bg-background flex h-16 shrink-0 items-center gap-3 border-b px-3 sm:px-5">
        <Button
          type="button"
          size="icon"
          variant="ghost"
          className="size-10 shrink-0 transition-transform active:scale-[0.96]"
          aria-label="Cancel and return"
          onClick={handleCancel}
        >
          <ArrowLeft className="size-4" />
        </Button>
        <div className="min-w-0 shrink-0">
          <h1 className="truncate text-sm font-semibold">{SiteConfig.title}</h1>
          <p className="text-muted-foreground hidden text-[11px] sm:block">
            Drawing inspiration
          </p>
        </div>
        <div className="mx-auto min-w-0 flex-1 sm:max-w-sm">
          <Input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            aria-label="Inspiration name"
            placeholder="Untitled drawing"
            maxLength={120}
            className="h-9 text-center"
          />
        </div>
        <div className="flex shrink-0 items-center gap-1 sm:gap-2">
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="hidden size-10 sm:inline-flex"
            aria-label="Undo"
            disabled={!history.canUndo || isSaving}
            onClick={history.undo}
          >
            <Undo2 className="size-4" />
          </Button>
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="hidden size-10 sm:inline-flex"
            aria-label="Redo"
            disabled={!history.canRedo || isSaving}
            onClick={history.redo}
          >
            <Redo2 className="size-4" />
          </Button>
          <span className="text-muted-foreground hidden items-center gap-1.5 text-xs lg:flex">
            {isDirty ? (
              "Unsaved"
            ) : (
              <>
                <Check className="size-3.5" /> Saved
              </>
            )}
          </span>
          <Button
            type="button"
            variant="ghost"
            className="hidden sm:inline-flex"
            disabled={isSaving}
            onClick={handleCancel}
          >
            Cancel
          </Button>
          <Button
            type="button"
            className="transition-transform active:scale-[0.96]"
            disabled={isSaving || isUploadingImage}
            onClick={() => void handleSave()}
          >
            {isSaving ? (
              <Spinner className="size-4" />
            ) : (
              <Save className="size-4" />
            )}
            <span className="hidden sm:inline">Save inspiration</span>
            <span className="sm:hidden">Save</span>
          </Button>
        </div>
      </header>

      <section className="relative flex min-h-0 flex-1 flex-col items-center overflow-auto px-4 pt-20 pb-16 sm:px-8">
        <div className="absolute top-3 left-1/2 z-20 max-w-[calc(100vw-2rem)] -translate-x-1/2 overflow-x-auto p-1">
          <DrawingToolbar
            tool={tool}
            templates={STARTER_TEMPLATES.map((template) => ({ ...template }))}
            disabled={isSaving || isUploadingImage}
            onToolChange={(nextTool) => {
              setTool(nextTool);
              setEditingTextId(null);
            }}
            onInsertImage={() => imageInputRef.current?.click()}
            onInsertPerson={insertPerson}
            onApplyTemplate={applyTemplate}
          />
        </div>

        <div className="my-auto w-[min(1120px,calc(100vw-3rem))] shrink-0">
          <DrawingCanvas
            document={history.document}
            tool={tool}
            disabled={editorLocked}
            selectedObjectId={selectedObjectId}
            editingTextId={editingTextId}
            onSelectObject={setSelectedObjectId}
            onToolChange={setTool}
            onPreviewDocument={history.preview}
            onCommitDocument={commitDocument}
            onStartTextEditing={setEditingTextId}
            onFinishTextEditing={() => setEditingTextId(null)}
          />
        </div>

        {selectedObject && !editingTextId ? (
          <div className="absolute right-3 bottom-3 z-20 md:top-20 md:right-4 md:bottom-auto">
            <DrawingProperties
              object={selectedObject}
              disabled={editorLocked}
              onChange={updateSelectedObject}
              onDuplicate={duplicateSelectedObject}
              onDelete={removeSelectedObject}
            />
          </div>
        ) : null}

        <div className="text-muted-foreground absolute bottom-4 left-1/2 hidden -translate-x-1/2 items-center gap-4 text-[11px] sm:flex">
          <span>Drag to move</span>
          <span>Shift to constrain</span>
          <span>Double-click text to edit</span>
          <span className="flex items-center gap-1">
            <Copy className="size-3" /> ⌘C / ⌘V
          </span>
        </div>
      </section>

      <input
        ref={imageInputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        className="sr-only"
        onChange={(event) => void handleImageFile(event.target.files?.[0])}
      />
    </main>
  );
}

function keepObjectOnCanvas(
  object: DrawingObject,
  document: DrawingDocument,
): DrawingObject {
  return {
    ...object,
    x: Math.max(0, Math.min(object.x, document.width - object.width)),
    y: Math.max(0, Math.min(object.y, document.height - object.height)),
  };
}
