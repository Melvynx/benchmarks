import { DrawingInspirationPage } from "@/features/drawing/drawing-inspiration-page";
import { InspirationDialog } from "@/features/inspiration/inspiration-dialog";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";

type NewInspirationSearch = {
  mode?: "drawing";
};

export const Route = createFileRoute("/orgs/$orgSlug/inspirations/new")({
  validateSearch: (search: Record<string, unknown>): NewInspirationSearch => ({
    mode: search.mode === "drawing" ? "drawing" : undefined,
  }),
  component: NewInspirationRoute,
});

function NewInspirationRoute() {
  const { orgSlug } = Route.useParams();
  const search = Route.useSearch();
  const navigate = useNavigate({ from: "/orgs/$orgSlug/inspirations/new" });
  const [open, setOpen] = useState(true);

  if (search.mode === "drawing") {
    return <DrawingInspirationPage orgSlug={orgSlug} />;
  }

  const closeToList = () => {
    setOpen(false);
    void navigate({ to: `/orgs/${orgSlug}/inspirations` });
  };

  return (
    <InspirationDialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) closeToList();
        setOpen(nextOpen);
      }}
      onSuccess={(inspirationId) => {
        void navigate({
          to: `/orgs/${orgSlug}/inspirations/${inspirationId}`,
        });
      }}
    />
  );
}
