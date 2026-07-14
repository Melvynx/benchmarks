import { Button } from "@/components/ui/button";
import { Layout, LayoutContent } from "@/features/page/layout";
import { dayjs } from "@/lib/dayjs";
import { api } from "@convex/_generated/api";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "convex/react";
import { AdminOrgGenerationsPageSkeleton } from "../../_components/admin-skeletons";
import {
  AdminPageHeader,
  AdminTable,
  StatusBadge,
} from "../../_components/admin-shared";

export const Route = createFileRoute("/admin/organizations/$orgId/generations")(
  {
    component: AdminOrganizationGenerationsRoute,
    pendingComponent: AdminOrgGenerationsPageSkeleton,
  },
);

function AdminOrganizationGenerationsRoute() {
  const { orgId } = Route.useParams();
  const generations = useQuery(
    api.admin.queries.listGenerationsByOrganization,
    {
      organizationId: orgId,
    },
  );

  return (
    <Layout size="lg">
      <LayoutContent>
        <div className="flex flex-col gap-6">
          <AdminPageHeader
            title="Organization generations"
            description="Inspect generation jobs for one organization."
          />
          <Button asChild variant="outline" className="w-fit">
            <Link to="/admin/organizations/$orgId" params={{ orgId }}>
              Back to organization
            </Link>
          </Button>
          <AdminTable
            headers={[
              "Prompt",
              "Model",
              "Status",
              "Credits",
              "Created",
              "Error",
            ]}
            empty="No generations found."
            rows={generations?.map((generation) => [
              <span key="prompt" className="line-clamp-3 max-w-xl text-sm">
                {generation.prompt}
              </span>,
              <span key="model" className="text-muted-foreground text-sm">
                {generation.model}
              </span>,
              <StatusBadge key="status" value={generation.status} />,
              <span key="credits">{generation.chargedCreditCost ?? "-"}</span>,
              <span key="created" className="text-muted-foreground text-sm">
                {dayjs(generation.createdAt).format("MMM D, YYYY HH:mm")}
              </span>,
              <span key="error" className="line-clamp-2 max-w-xs text-xs">
                {generation.errorMessage ?? "-"}
              </span>,
            ])}
          />
        </div>
      </LayoutContent>
    </Layout>
  );
}
