import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { SiteConfig } from "@/site-config";
import {
  useAction as useConvexAction,
  useMutation as useConvexMutation,
  useQuery as useConvexQuery,
} from "convex/react";
import { AlertCircle, ArrowLeft } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  createDrawingInspirationRef,
  drawingInspirationDetailRef,
  updateDrawingInspirationRef,
  uploadDrawingImageRef,
} from "./drawing.convex";
import {
  createEmptyDrawingDocument,
  type DrawingDocument,
} from "./drawing-document";
import { DrawingEditor } from "./drawing-editor";
import { exportDrawingDocumentToPngBlob } from "./drawing-renderer";

type DrawingInspirationPageProps = {
  orgSlug: string;
  inspirationId?: string;
  onCancel: () => void;
  onSaved: (inspirationId: string) => void;
};

export function DrawingInspirationPage({
  orgSlug,
  inspirationId,
  onCancel,
  onSaved,
}: DrawingInspirationPageProps) {
  const detail = useConvexQuery(
    drawingInspirationDetailRef,
    inspirationId ? { orgSlug, inspirationId } : "skip",
  );
  const createDrawing = useConvexMutation(createDrawingInspirationRef);
  const updateDrawing = useConvexMutation(updateDrawingInspirationRef);
  const uploadImage = useConvexAction(uploadDrawingImageRef);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);

  useEffect(() => {
    const previousTitle = document.title;
    document.title = SiteConfig.title;
    return () => {
      document.title = previousTitle;
    };
  }, []);

  const uploadDrawingFile = async (file: File) => {
    setIsUploadingImage(true);
    try {
      return await uploadImage({
        orgSlug,
        bytes: await file.arrayBuffer(),
        fileName: file.name,
        contentType: file.type || "image/png",
      });
    } finally {
      setIsUploadingImage(false);
    }
  };

  const saveDrawing = async (
    title: string,
    drawingDocument: DrawingDocument,
  ): Promise<string> => {
    setIsSaving(true);
    try {
      const previewBlob = await exportDrawingDocumentToPngBlob(drawingDocument);
      const previewUrl = await uploadImage({
        orgSlug,
        bytes: await previewBlob.arrayBuffer(),
        fileName: `drawing-preview-${inspirationId ?? Date.now()}.png`,
        contentType: "image/png",
      });

      const saved = inspirationId
        ? await updateDrawing({
            orgSlug,
            inspirationId,
            title,
            previewUrl,
            drawingDocument,
          })
        : await createDrawing({
            orgSlug,
            title,
            previewUrl,
            drawingDocument,
          });

      toast.success(
        inspirationId ? "Drawing updated" : "Drawing inspiration created",
      );
      return saved.id;
    } finally {
      setIsSaving(false);
    }
  };

  if (inspirationId && detail === undefined) {
    return <DrawingPageLoading />;
  }

  if (inspirationId && !detail) {
    return (
      <DrawingPageError
        message="This drawing could not be loaded."
        onCancel={onCancel}
      />
    );
  }

  const initialDocument =
    detail?.drawingDocument ?? createEmptyDrawingDocument();
  const initialTitle = detail?.name ?? "Untitled drawing";

  return (
    <DrawingEditor
      key={inspirationId ?? "new-drawing"}
      initialDocument={initialDocument}
      initialTitle={initialTitle}
      initialPersisted={Boolean(inspirationId)}
      isSaving={isSaving}
      isUploadingImage={isUploadingImage}
      onUploadImage={uploadDrawingFile}
      onSave={saveDrawing}
      onSaved={onSaved}
      onCancel={onCancel}
    />
  );
}

function DrawingPageLoading() {
  return (
    <main className="bg-muted fixed inset-0 z-50 flex items-center justify-center">
      <div className="bg-background flex items-center gap-3 rounded-xl px-5 py-4 shadow-[0_0_0_1px_rgba(0,0,0,0.08),0_12px_32px_rgba(0,0,0,0.08)]">
        <Spinner className="size-4" />
        <span className="text-sm">Loading drawing</span>
      </div>
    </main>
  );
}

function DrawingPageError({
  message,
  onCancel,
}: {
  message: string;
  onCancel: () => void;
}) {
  return (
    <main className="bg-muted fixed inset-0 z-50 flex items-center justify-center p-6">
      <div className="bg-background flex max-w-sm flex-col items-center rounded-xl p-6 text-center shadow-[0_0_0_1px_rgba(0,0,0,0.08),0_12px_32px_rgba(0,0,0,0.08)]">
        <AlertCircle className="text-destructive mb-3 size-6" />
        <p className="text-sm font-medium">Could not open drawing</p>
        <p className="text-muted-foreground mt-1 text-sm">{message}</p>
        <Button
          type="button"
          variant="outline"
          className="mt-5"
          onClick={onCancel}
        >
          <ArrowLeft className="size-4" />
          Return
        </Button>
      </div>
    </main>
  );
}
