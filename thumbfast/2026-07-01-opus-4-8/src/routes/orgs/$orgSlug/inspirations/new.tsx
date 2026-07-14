import { InspirationDialog } from "@/features/inspiration/inspiration-dialog";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";

export const Route = createFileRoute("/orgs/$orgSlug/inspirations/new")({
  component: NewInspirationRoute,
});

function NewInspirationRoute() {
  const { orgSlug } = Route.useParams();
  const navigate = useNavigate({ from: "/orgs/$orgSlug/inspirations/new" });
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
      onSuccess={(inspirationId) => {
        void navigate({
          to: `/orgs/${orgSlug}/inspirations/${inspirationId}`,
        });
      }}
    />
  );
}
