import { createFileRoute, redirect } from "@tanstack/react-router";
import { AdminInspirationsPageSkeleton } from "../_components/admin-skeletons";

export const Route = createFileRoute("/admin/inspirations/interactive")({
  beforeLoad: () => {
    throw redirect({ to: "/admin/inspirations", replace: true });
  },
  pendingComponent: AdminInspirationsPageSkeleton,
});
