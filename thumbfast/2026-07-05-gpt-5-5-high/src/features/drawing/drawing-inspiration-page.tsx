import { Button } from "@/components/ui/button";
import { LoadingState } from "@/features/organization/loading-state";
import { useMutation } from "@/hooks/use-async-mutation";
import { useNavigate } from "@tanstack/react-router";
import {
  useAction as useConvexAction,
  useMutation as useConvexMutation,
} from "convex/react";
import { AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { DrawingEditor } from "./drawing-editor";
import {
  createEmptyDrawingDocument,
  describeDrawingDocument,
} from "./drawing-document";
import { renderDrawingDocumentToBlob } from "./drawing-renderer";
import type { DrawingDocument } from "./drawing-types";
import {
  createDrawingInspirationRef,
  updateDrawingInspirationRef,
  uploadInspirationImageRef,
} from "@/features/inspiration/inspiration.convex";
import { useInspiration } from "@/features/inspiration/inspiration.query";

type DrawingInspirationPageProps = {
  orgSlug: string;
  inspirationId?: string;
};

export function DrawingInspirationPage({
  orgSlug,
  inspirationId,
}: DrawingInspirationPageProps) {
  const navigate = useNavigate();
  const uploadPreview = useConvexAction(uploadInspirationImageRef);
  const createDrawing = useConvexMutation(createDrawingInspirationRef);
  const updateDrawing = useConvexMutation(updateDrawingInspirationRef);
  const { data: inspiration, isLoading } = useInspiration(
    orgSlug,
    inspirationId ?? "",
  );
  const isEditMode = Boolean(inspirationId);

  const saveMutation = useMutation({
    mutationFn: async (input: { title: string; document: DrawingDocument }) => {
      const blob = await renderDrawingDocumentToBlob(input.document);
      const previewUrl = await uploadPreview({
        orgSlug,
        bytes: await blob.arrayBuffer(),
        fileName: `drawing-${Date.now()}.png`,
        contentType: "image/png",
      });
      const description = describeDrawingDocument(input.document);

      if (inspirationId) {
        return updateDrawing({
          orgSlug,
          inspirationId,
          title: input.title,
          previewUrl,
          description,
          drawingMetadata: input.document,
        });
      }

      return createDrawing({
        orgSlug,
        title: input.title,
        previewUrl,
        description,
        drawingMetadata: input.document,
      });
    },
    onSuccess: async (savedInspiration) => {
      toast.success(
        isEditMode
          ? "Drawing inspiration saved"
          : "Drawing inspiration created",
      );
      await navigate({
        to: "/orgs/$orgSlug/inspirations/$inspirationId",
        params: { orgSlug, inspirationId: savedInspiration.id },
      });
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const handleCancel = () => {
    if (inspirationId) {
      void navigate({
        to: "/orgs/$orgSlug/inspirations/$inspirationId",
        params: { orgSlug, inspirationId },
      });
      return;
    }

    void navigate({
      to: "/orgs/$orgSlug/inspirations",
      params: { orgSlug },
    });
  };

  if (isEditMode && isLoading) {
    return <LoadingState label="Loading drawing" />;
  }

  if (isEditMode && inspiration && !inspiration.drawingMetadata) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-6 text-center">
        <AlertTriangle className="text-muted-foreground size-10" />
        <div className="flex max-w-md flex-col gap-1">
          <h1 className="text-lg font-semibold">
            This inspiration is not editable as a drawing
          </h1>
          <p className="text-muted-foreground text-sm">
            Only inspirations created from the drawing editor can be reopened
            with editable objects.
          </p>
        </div>
        <Button onClick={handleCancel}>Return to inspiration</Button>
      </div>
    );
  }

  return (
    <DrawingEditor
      mode={isEditMode ? "edit" : "create"}
      initialTitle={inspiration?.name ?? "Drawing inspiration"}
      initialDocument={
        inspiration?.drawingMetadata ?? createEmptyDrawingDocument()
      }
      saving={saveMutation.isPending}
      onCancel={handleCancel}
      onSave={async (title, document) => {
        await saveMutation.mutateAsync({ title, document });
      }}
    />
  );
}
