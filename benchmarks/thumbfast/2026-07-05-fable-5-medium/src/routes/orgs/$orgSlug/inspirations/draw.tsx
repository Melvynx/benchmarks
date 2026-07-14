import { buttonVariants } from "@/components/ui/button";
import { DrawingEditor } from "@/features/drawing/drawing-editor";
import {
  createDrawingInspirationRef,
  getDrawingInspirationRef,
  updateDrawingInspirationRef,
  uploadDrawingPreviewRef,
} from "@/features/drawing/drawing.convex";
import { exportDrawingToPng } from "@/features/drawing/drawing-export";
import {
  type DrawingDocument,
  createEmptyDrawing,
  parseDrawing,
  serializeDrawing,
} from "@/features/drawing/drawing.schema";
import { uploadInspirationImageRef } from "@/features/inspiration/inspiration.convex";
import { LoadingState } from "@/features/organization/loading-state";
import Link from "@/compat/link";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import {
  useAction as useConvexAction,
  useMutation as useConvexMutation,
  useQuery as useConvexQuery,
} from "convex/react";
import { useState } from "react";
import { toast } from "sonner";

type DrawSearch = {
  inspirationId?: string;
};

export const Route = createFileRoute("/orgs/$orgSlug/inspirations/draw")({
  validateSearch: (search: Record<string, unknown>): DrawSearch => ({
    inspirationId:
      typeof search.inspirationId === "string" && search.inspirationId
        ? search.inspirationId
        : undefined,
  }),
  component: DrawInspirationRoute,
});

function DrawInspirationRoute() {
  const { orgSlug } = Route.useParams();
  const { inspirationId } = Route.useSearch();

  if (!inspirationId) {
    return (
      <DrawInspirationEditor
        key="new"
        orgSlug={orgSlug}
        inspirationId={undefined}
        initialDoc={createEmptyDrawing()}
        initialTitle=""
      />
    );
  }

  return (
    <ExistingDrawingLoader orgSlug={orgSlug} inspirationId={inspirationId} />
  );
}

function ExistingDrawingLoader({
  orgSlug,
  inspirationId,
}: {
  orgSlug: string;
  inspirationId: string;
}) {
  const data = useConvexQuery(getDrawingInspirationRef, {
    orgSlug,
    inspirationId,
  });

  if (data === undefined) {
    return <LoadingState label="Loading drawing" />;
  }

  const doc = parseDrawing(data.drawing);
  if (!doc) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4">
        <p className="text-muted-foreground text-sm">
          This drawing could not be loaded.
        </p>
        <Link
          href={`/orgs/${orgSlug}/inspirations`}
          className={buttonVariants({ variant: "outline" })}
        >
          Back to inspirations
        </Link>
      </div>
    );
  }

  return (
    <DrawInspirationEditor
      key={inspirationId}
      orgSlug={orgSlug}
      inspirationId={inspirationId}
      initialDoc={doc}
      initialTitle={data.title}
    />
  );
}

function DrawInspirationEditor({
  orgSlug,
  inspirationId,
  initialDoc,
  initialTitle,
}: {
  orgSlug: string;
  inspirationId: string | undefined;
  initialDoc: DrawingDocument;
  initialTitle: string;
}) {
  const navigate = useNavigate();
  const [saving, setSaving] = useState(false);
  const uploadPreview = useConvexAction(uploadDrawingPreviewRef);
  const uploadImage = useConvexAction(uploadInspirationImageRef);
  const createDrawing = useConvexMutation(createDrawingInspirationRef);
  const updateDrawing = useConvexMutation(updateDrawingInspirationRef);

  const handleSave = async ({
    doc,
    title,
  }: {
    doc: DrawingDocument;
    title: string;
  }) => {
    if (doc.elements.length === 0) {
      toast.error("Draw something before saving");
      return null;
    }
    setSaving(true);
    try {
      const previewDataUrl = await exportDrawingToPng(doc);
      const previewUrl = await uploadPreview({
        orgSlug,
        imageDataUrl: previewDataUrl,
      });
      const drawing = serializeDrawing(doc);
      const saved = inspirationId
        ? await updateDrawing({
            orgSlug,
            inspirationId,
            title,
            previewUrl,
            drawing,
          })
        : await createDrawing({ orgSlug, title, previewUrl, drawing });
      toast.success(
        inspirationId ? "Drawing updated" : "Drawing inspiration created",
      );
      return saved.id;
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to save drawing",
      );
      return null;
    } finally {
      setSaving(false);
    }
  };

  const handleUploadImage = async (file: File) => {
    if (file.size > 5 * 1024 * 1024) {
      throw new Error("Image is too large (max 5MB)");
    }
    return uploadImage({
      orgSlug,
      bytes: await file.arrayBuffer(),
      fileName: file.name,
      contentType: file.type,
    });
  };

  return (
    <DrawingEditor
      initialDoc={initialDoc}
      initialTitle={initialTitle}
      saving={saving}
      saveLabel={inspirationId ? "Save drawing" : "Save as inspiration"}
      onSave={handleSave}
      onSaved={(savedId) => {
        void navigate({
          to: "/orgs/$orgSlug/inspirations/$inspirationId",
          params: { orgSlug, inspirationId: savedId },
        });
      }}
      onExit={() => {
        void navigate({
          to: "/orgs/$orgSlug/inspirations",
          params: { orgSlug },
        });
      }}
      onUploadImage={handleUploadImage}
    />
  );
}
