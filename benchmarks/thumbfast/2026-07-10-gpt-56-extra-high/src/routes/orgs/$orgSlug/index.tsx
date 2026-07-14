import { OrgDashboard } from "@/features/organization/org-dashboard";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/orgs/$orgSlug/")({
  component: OrgDashboardRoute,
});

function OrgDashboardRoute() {
  const { orgSlug } = Route.useParams();
  return <OrgDashboard orgSlug={orgSlug} />;
}
