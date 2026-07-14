import { Layout, LayoutContent } from "@/features/page/layout";
import { api } from "@convex/_generated/api";
import { createFileRoute } from "@tanstack/react-router";
import { makeFunctionReference } from "convex/server";
import { useAction, useQuery } from "convex/react";
import { Building2, ImageIcon, Link2, Users } from "lucide-react";
import { useEffect, useState } from "react";
import { AdminPageHeader, AdminStatCard } from "./_components/admin-shared";
import { AdminFunnelPageSkeleton } from "./_components/admin-skeletons";

type DashboardCounters = {
  totalUsers: number;
  totalOrgs: number;
  totalGenerations: number;
};

const getDashboardSnapshotRef = makeFunctionReference<
  "action",
  Record<string, never>,
  DashboardCounters
>("admin/actions:getDashboardSnapshot");

export const Route = createFileRoute("/admin/funnel")({
  component: AdminFunnelRoute,
  pendingComponent: AdminFunnelPageSkeleton,
});

function AdminFunnelRoute() {
  const getDashboardSnapshot = useAction(getDashboardSnapshotRef);
  const [dashboard, setDashboard] = useState<DashboardCounters | null>(null);
  const referral = useQuery(api.admin.queries.getReferralStats, {});

  useEffect(() => {
    let canceled = false;

    async function loadDashboard() {
      const result = await getDashboardSnapshot({});
      if (!canceled) setDashboard(result);
    }

    void loadDashboard();

    return () => {
      canceled = true;
    };
  }, [getDashboardSnapshot]);

  return (
    <Layout size="lg">
      <LayoutContent>
        <div className="flex flex-col gap-6">
          <AdminPageHeader
            title="Funnel"
            description="Track account, organization, generation, and referral movement."
          />
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <AdminStatCard
              title="Users"
              value={dashboard?.totalUsers ?? 0}
              description="Signed-up accounts"
              icon={Users}
            />
            <AdminStatCard
              title="Organizations"
              value={dashboard?.totalOrgs ?? 0}
              description="Created workspaces"
              icon={Building2}
            />
            <AdminStatCard
              title="Generations"
              value={dashboard?.totalGenerations ?? 0}
              description="Thumbnail jobs"
              icon={ImageIcon}
            />
            <AdminStatCard
              title="Referral records"
              value={referral?.records ?? 0}
              description={`${referral?.pending ?? 0} pending rewards`}
              icon={Link2}
            />
          </div>
        </div>
      </LayoutContent>
    </Layout>
  );
}
