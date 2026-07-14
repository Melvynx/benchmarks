import { DrawingEditorPage } from "@/features/drawing/drawing-editor-page";
import { useRouter } from "@/compat/navigation";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/orgs/$orgSlug/inspirations/draw/")({
  component: DrawInspirationRoute,
});

function DrawInspirationRoute() {
  const { orgSlug } = Route.useParams();
  const router = useRouter();

  return (
    <DrawingEditorPage
      orgSlug={orgSlug}
      onClose={() => {
        router.push(`/orgs/${orgSlug}/inspirations`);
      }}
      onSaved={(inspirationId) => {
        router.push(`/orgs/${orgSlug}/inspirations/${inspirationId}`);
      }}
    />
  );
}
