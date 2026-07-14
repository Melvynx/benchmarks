import { DrawingEditor } from "@/features/drawing/drawing-editor";
import { createFileRoute, useNavigate } from "@tanstack/react-router";

type DrawSearch = {
  inspiration?: string;
};

export const Route = createFileRoute("/orgs/$orgSlug/inspirations/draw")({
  validateSearch: (search: Record<string, unknown>): DrawSearch => ({
    inspiration:
      typeof search.inspiration === "string" ? search.inspiration : undefined,
  }),
  component: DrawInspirationRoute,
});

function DrawInspirationRoute() {
  const { orgSlug } = Route.useParams();
  const { inspiration } = Route.useSearch();
  const navigate = useNavigate();

  return (
    <DrawingEditor
      orgSlug={orgSlug}
      inspirationId={inspiration}
      onExit={() => {
        void navigate({ to: `/orgs/${orgSlug}/inspirations` });
      }}
      onSaved={(inspirationId) => {
        void navigate({
          to: `/orgs/${orgSlug}/inspirations/${inspirationId}`,
        });
      }}
    />
  );
}
