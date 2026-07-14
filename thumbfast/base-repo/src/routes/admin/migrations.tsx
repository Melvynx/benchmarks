import { Layout, LayoutContent } from "@/features/page/layout";
import { api } from "@convex/_generated/api";
import { createFileRoute } from "@tanstack/react-router";
import { makeFunctionReference } from "convex/server";
import { useAction, useQuery } from "convex/react";
import { Building2, ImageIcon, Link2, Users } from "lucide-react";
import { useEffect, useState } from "react";
import { AdminPageHeader, AdminStatCard } from "./_components/admin-shared";
import { AdminMigrationsPageSkeleton } from "./_components/admin-skeletons";

type DashboardCounters = {
  totalUsers: number;
  totalOrgs: number;
  totalThumbnails: number;
};

const getDashboardSnapshotRef = makeFunctionReference<
  "action",
  Record<string, never>,
  DashboardCounters
>("admin/actions:getDashboardSnapshot");

export const Route = createFileRoute("/admin/migrations")({
  component: AdminMigrationsRoute,
  pendingComponent: AdminMigrationsPageSkeleton,
});

function AdminMigrationsRoute() {
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
            title="Migrations"
            description="Operational counters used to compare imported Convex data."
          />
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <AdminStatCard
              title="Users"
              value={dashboard?.totalUsers ?? 0}
              description="Better Auth users"
              icon={Users}
            />
            <AdminStatCard
              title="Organizations"
              value={dashboard?.totalOrgs ?? 0}
              description="Better Auth organizations"
              icon={Building2}
            />
            <AdminStatCard
              title="Thumbnails"
              value={dashboard?.totalThumbnails ?? 0}
              description="Convex thumbnails"
              icon={ImageIcon}
            />
            <AdminStatCard
              title="Referral profiles"
              value={referral?.profiles ?? 0}
              description="Stored referral identities"
              icon={Link2}
            />
          </div>
        </div>
      </LayoutContent>
    </Layout>
  );
}
