import { DrawingEditor, DRAWING_PAGE_TITLE, drawingFromInspiration } from "@/features/drawing/drawing-editor";
import {
  createDrawingInspirationRef,
  updateDrawingInspirationRef,
} from "@/features/drawing/drawing.convex";
import { useInspiration } from "@/features/inspiration/inspiration.query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useAction as useConvexAction } from "convex/react";
import { toast } from "sonner";

type DrawSearch = {
  inspirationId?: string;
};

export const Route = createFileRoute("/orgs/$orgSlug/inspirations/draw")({
  validateSearch: (search: Record<string, unknown>): DrawSearch => ({
    inspirationId:
      typeof search.inspirationId === "string" ? search.inspirationId : undefined,
  }),
  head: () => ({
    meta: [{ title: DRAWING_PAGE_TITLE }],
  }),
  component: DrawInspirationRoute,
});

function DrawInspirationRoute() {
  const { orgSlug } = Route.useParams();
  const { inspirationId } = Route.useSearch();
  const navigate = useNavigate({ from: "/orgs/$orgSlug/inspirations/draw" });
  const createDrawing = useConvexAction(createDrawingInspirationRef);
  const updateDrawing = useConvexAction(updateDrawingInspirationRef);
  const { data: inspiration, isLoading } = useInspiration(
    orgSlug,
    inspirationId ?? "",
  );

  const goBack = () => {
    if (inspirationId) {
      void navigate({
        to: "/orgs/$orgSlug/inspirations/$inspirationId",
        params: { orgSlug, inspirationId },
      });
      return;
    }
    void navigate({ to: "/orgs/$orgSlug/inspirations", params: { orgSlug } });
  };

  return (
    <DrawingEditor
      orgSlug={orgSlug}
      isLoading={Boolean(inspirationId) && isLoading}
      initialDocument={
        inspirationId
          ? drawingFromInspiration(inspiration?.drawingData)
          : null
      }
      onCancel={goBack}
      onSave={async (input) => {
        const saved = inspirationId
          ? await updateDrawing({
              orgSlug,
              inspirationId,
              bytes: input.imageBytes,
              drawingData: input.drawingData,
              title: input.title,
              description: input.description,
              hasPlaceholder: input.hasPlaceholder,
            })
          : await createDrawing({
              orgSlug,
              bytes: input.imageBytes,
              drawingData: input.drawingData,
              title: input.title,
              description: input.description,
              hasPlaceholder: input.hasPlaceholder,
            });
        toast.success(
          inspirationId ? "Drawing updated" : "Drawing saved as inspiration",
        );
        void navigate({
          to: "/orgs/$orgSlug/inspirations/$inspirationId",
          params: { orgSlug, inspirationId: saved.id },
        });
      }}
    />
  );
}
