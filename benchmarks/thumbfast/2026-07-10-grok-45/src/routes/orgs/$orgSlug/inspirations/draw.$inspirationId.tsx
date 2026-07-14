import { DrawingEditorPage } from "@/features/drawing/drawing-editor-page";
import { useRouter } from "@/compat/navigation";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute(
  "/orgs/$orgSlug/inspirations/draw/$inspirationId",
)({
  component: EditDrawingInspirationRoute,
});

function EditDrawingInspirationRoute() {
  const { orgSlug, inspirationId } = Route.useParams();
  const router = useRouter();

  return (
    <DrawingEditorPage
      orgSlug={orgSlug}
      inspirationId={inspirationId}
      onClose={() => {
        router.push(`/orgs/${orgSlug}/inspirations/${inspirationId}`);
      }}
      onSaved={(savedId) => {
        router.push(`/orgs/${orgSlug}/inspirations/${savedId}`);
      }}
    />
  );
}
