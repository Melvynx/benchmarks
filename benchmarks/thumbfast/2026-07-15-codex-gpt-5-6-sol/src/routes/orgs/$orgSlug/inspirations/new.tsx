import { InspirationDialog } from "@/features/inspiration/inspiration-dialog";
import { DrawingInspirationPage } from "@/features/drawing/drawing-inspiration-page";
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
  const { mode } = Route.useSearch();
  const navigate = useNavigate({ from: "/orgs/$orgSlug/inspirations/new" });
  const [open, setOpen] = useState(true);

  const closeToList = () => {
    setOpen(false);
    void navigate({ to: `/orgs/${orgSlug}/inspirations` });
  };

  if (mode === "drawing") {
    return (
      <DrawingInspirationPage
        orgSlug={orgSlug}
        onClose={closeToList}
        onSaved={(inspirationId) => {
          void navigate({
            to: "/orgs/$orgSlug/inspirations/$inspirationId",
            params: { orgSlug, inspirationId },
          });
        }}
      />
    );
  }

  return (
    <InspirationDialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) closeToList();
        setOpen(nextOpen);
      }}
      onDraw={() => {
        void navigate({ search: { mode: "drawing" } });
      }}
      onSuccess={(inspirationId) => {
        void navigate({
          to: `/orgs/${orgSlug}/inspirations/${inspirationId}`,
        });
      }}
    />
  );
}
