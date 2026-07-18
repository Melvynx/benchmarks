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

  if (mode === "drawing") {
    return (
      <DrawingInspirationPage
        orgSlug={orgSlug}
        onCancel={() => {
          void navigate({
            to: "/orgs/$orgSlug/inspirations",
            params: { orgSlug },
          });
        }}
        onSaved={(inspirationId) => {
          void navigate({
            to: "/orgs/$orgSlug/inspirations/$inspirationId",
            params: { orgSlug, inspirationId },
            search: {},
          });
        }}
      />
    );
  }

  return <NewInspirationDialogRoute orgSlug={orgSlug} navigate={navigate} />;
}

function NewInspirationDialogRoute({
  orgSlug,
  navigate,
}: {
  orgSlug: string;
  navigate: ReturnType<typeof useNavigate>;
}) {
  const [open, setOpen] = useState(true);

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
      onCreateDrawing={() => {
        setOpen(false);
        void navigate({
          to: "/orgs/$orgSlug/inspirations/new",
          params: { orgSlug },
          search: { mode: "drawing" },
        });
      }}
      onSuccess={(inspirationId) => {
        void navigate({
          to: "/orgs/$orgSlug/inspirations/$inspirationId",
          params: { orgSlug, inspirationId },
          search: {},
        });
      }}
    />
  );
}
