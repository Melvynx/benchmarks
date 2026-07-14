import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Layout, LayoutContent } from "@/features/page/layout";
import { createFileRoute } from "@tanstack/react-router";
import { makeFunctionReference } from "convex/server";
import { useAction } from "convex/react";
import {
  Activity,
  AlertTriangle,
  Building2,
  Coins,
  DollarSign,
  ImageIcon,
  MessageSquare,
  RefreshCw,
  Sparkles,
  TrendingUp,
  Users,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { AdminPageHeader, AdminStatCard } from "./_components/admin-shared";
import { AdminDashboardSkeleton } from "./_components/admin-skeletons";

type StripeBillingSummary = {
  generatedAt: number;
  currency: string;
  mrrCents: number;
  arrCents: number;
  trialingMrrCents: number;
  pastDueMrrCents: number;
  activeSubscriptions: number;
  trialingSubscriptions: number;
  pastDueSubscriptions: number;
  stripeSubscriptions: number;
  missingInConvex: string[];
  byPlan: { plan: string; count: number }[];
};

type AdminDashboardSnapshot = {
  generatedAt: number;
  totalOrgs: number;
  totalUsers: number;
  activeSessions: number;
  premiumOrgs: number;
  totalGenerations: number;
  totalThumbnails: number;
  openFeedback: number;
  openErrors: number;
  totalCredits: number;
  subscriptionSummary: {
    active: number;
    trialing: number;
    lifetime: number;
    pastDue: number;
    canceled: number;
    paidOrgs: number;
    byPlan: { plan: string; count: number }[];
  };
  userGrowth: TotalGrowthRow[];
  organizationGrowth: TotalGrowthRow[];
  generationGrowth: { date: string; count: number }[];
  thumbnailGrowth: { date: string; count: number }[];
  errorGrowth: { date: string; count: number }[];
  billing: StripeBillingSummary;
};

type TotalGrowthRow = {
  date: string;
  count: number;
  total: number;
};

const getDashboardSnapshotRef = makeFunctionReference<
  "action",
  Record<string, never>,
  AdminDashboardSnapshot
>("admin/actions:getDashboardSnapshot");

export const Route = createFileRoute("/admin/")({
  component: AdminDashboardRoute,
  pendingComponent: AdminDashboardSkeleton,
});

function AdminDashboardRoute() {
  const getDashboardSnapshot = useAction(getDashboardSnapshotRef);
  const [dashboard, setDashboard] = useState<AdminDashboardSnapshot | null>(
    null,
  );
  const [dashboardError, setDashboardError] = useState<string | null>(null);
  const [dashboardLoading, setDashboardLoading] = useState(true);

  useEffect(() => {
    let canceled = false;

    async function loadDashboardSnapshot() {
      setDashboardLoading(true);
      setDashboardError(null);
      try {
        const result = await getDashboardSnapshot({});
        if (!canceled) setDashboard(result);
      } catch (error) {
        if (!canceled) {
          setDashboard(null);
          setDashboardError(
            error instanceof Error ? error.message : "Dashboard unavailable",
          );
        }
      } finally {
        if (!canceled) setDashboardLoading(false);
      }
    }

    void loadDashboardSnapshot();

    return () => {
      canceled = true;
    };
  }, [getDashboardSnapshot]);

  const billing = dashboard?.billing ?? null;
  const billingDescription = dashboardError
    ? "Dashboard unavailable"
    : dashboardLoading
      ? "Loading snapshot"
      : "Live from Stripe";

  return (
    <Layout size="lg">
      <LayoutContent>
        <div className="flex flex-col gap-6">
          <AdminPageHeader
            title="Dashboard"
            description="Exact Convex counts, live Stripe revenue, and operational queues."
          />

          <section className="flex flex-col gap-3">
            <SectionTitle
              title="Billing"
              description={billingDescription}
              icon={DollarSign}
            />
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <AdminStatCard
                title="MRR"
                value={
                  billing
                    ? formatMoney(billing.mrrCents, billing.currency)
                    : "-"
                }
                description="Active Stripe subscriptions"
                icon={DollarSign}
              />
              <AdminStatCard
                title="ARR"
                value={
                  billing
                    ? formatMoney(billing.arrCents, billing.currency)
                    : "-"
                }
                description="MRR annualized"
                icon={TrendingUp}
              />
              <AdminStatCard
                title="Active"
                value={formatOptionalNumber(billing?.activeSubscriptions)}
                description="Paid subscriptions in Stripe"
                icon={RefreshCw}
              />
              <AdminStatCard
                title="Trials"
                value={formatOptionalNumber(billing?.trialingSubscriptions)}
                description={
                  billing
                    ? `${formatMoney(billing.trialingMrrCents, billing.currency)} pending MRR`
                    : "Trialing Stripe subscriptions"
                }
                icon={Activity}
              />
            </div>
            {dashboardError ? (
              <Card>
                <CardContent className="text-muted-foreground py-4 text-sm">
                  Dashboard snapshot could not be loaded: {dashboardError}
                </CardContent>
              </Card>
            ) : null}
          </section>

          <section className="flex flex-col gap-3">
            <SectionTitle
              title="Platform"
              description="Exact Convex counts"
              icon={Building2}
            />
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <AdminStatCard
                title="Organizations"
                value={formatOptionalNumber(dashboard?.totalOrgs)}
                description="Total workspaces"
                icon={Building2}
              />
              <AdminStatCard
                title="Users"
                value={formatOptionalNumber(dashboard?.totalUsers)}
                description="Registered accounts"
                icon={Users}
              />
              <AdminStatCard
                title="Active Sessions"
                value={formatOptionalNumber(dashboard?.activeSessions)}
                description="Non-expired auth sessions"
                icon={Activity}
              />
              <AdminStatCard
                title="Paid Orgs"
                value={formatOptionalNumber(dashboard?.premiumOrgs)}
                description="Convex active, trial, lifetime"
                icon={DollarSign}
              />
            </div>
          </section>

          <section className="flex flex-col gap-3">
            <SectionTitle
              title="Operations"
              description="Exact product activity"
              icon={Sparkles}
            />
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <AdminStatCard
                title="Generations"
                value={formatOptionalNumber(dashboard?.totalGenerations)}
                description="Generation jobs"
                icon={Sparkles}
              />
              <AdminStatCard
                title="Thumbnails"
                value={formatOptionalNumber(dashboard?.totalThumbnails)}
                description="Stored generated assets"
                icon={ImageIcon}
              />
              <AdminStatCard
                title="Credits"
                value={formatOptionalNumber(dashboard?.totalCredits)}
                description="Total remaining balance"
                icon={Coins}
              />
              <AdminStatCard
                title="Errors"
                value={formatOptionalNumber(dashboard?.openErrors)}
                description="Thumbnail error records"
                icon={AlertTriangle}
              />
              <AdminStatCard
                title="Open Feedback"
                value={formatOptionalNumber(dashboard?.openFeedback)}
                description="Without admin reply"
                icon={MessageSquare}
              />
              <AdminStatCard
                title="Past Due"
                value={formatOptionalNumber(billing?.pastDueSubscriptions)}
                description={
                  billing
                    ? `${formatMoney(billing.pastDueMrrCents, billing.currency)} at risk`
                    : "Stripe past due"
                }
                icon={AlertTriangle}
              />
            </div>
          </section>

          <div className="grid gap-4 lg:grid-cols-2">
            <MetricList
              title="User Growth"
              description="Better Auth users by month"
              rows={dashboard?.userGrowth.map((row: TotalGrowthRow) => ({
                label: row.date,
                value: `${row.count} new / ${row.total} total`,
              }))}
            />
            <MetricList
              title="Organization Growth"
              description="Better Auth organizations by month"
              rows={dashboard?.organizationGrowth.map(
                (row: TotalGrowthRow) => ({
                  label: row.date,
                  value: `${row.count} new / ${row.total} total`,
                }),
              )}
            />
            <MetricList
              title="Generation Growth"
              description="Convex generation jobs by month"
              rows={dashboard?.generationGrowth.map((row) => ({
                label: row.date,
                value: `${row.count} generations`,
              }))}
            />
            <MetricList
              title="Thumbnail Growth"
              description="Convex thumbnail assets by month"
              rows={dashboard?.thumbnailGrowth.map((row) => ({
                label: row.date,
                value: `${row.count} thumbnails`,
              }))}
            />
            <PlanMixList
              title="Stripe Plan Mix"
              description="Live subscriptions by plan"
              rows={dashboardError ? [] : billing?.byPlan}
              emptyLabel={
                dashboardLoading ? "Loading Stripe" : "No Stripe plans"
              }
            />
            <PlanMixList
              title="Convex Plan Mix"
              description="Synced paid organizations by plan"
              rows={dashboard?.subscriptionSummary.byPlan}
              emptyLabel="No paid plans"
            />
          </div>

          {billing?.missingInConvex.length ? (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Stripe Sync Gaps</CardTitle>
                <CardDescription>
                  Stripe subscriptions present in live billing but not synced to
                  Convex.
                </CardDescription>
              </CardHeader>
              <CardContent className="text-muted-foreground text-sm">
                {billing.missingInConvex.join(", ")}
              </CardContent>
            </Card>
          ) : null}
        </div>
      </LayoutContent>
    </Layout>
  );
}

function SectionTitle(props: {
  title: string;
  description: string;
  icon: LucideIcon;
}) {
  const Icon = props.icon;

  return (
    <div className="flex items-center justify-between gap-3">
      <div className="min-w-0">
        <h2 className="text-lg font-semibold">{props.title}</h2>
        <p className="text-muted-foreground text-sm">{props.description}</p>
      </div>
      <Icon className="text-muted-foreground size-5 shrink-0" />
    </div>
  );
}

function MetricList(props: {
  title: string;
  description: string;
  rows?: { label: string; value: string }[];
}) {
  const rows = props.rows;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{props.title}</CardTitle>
        <CardDescription>{props.description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {rows
          ? rows.map((row) => (
              <div
                key={row.label}
                className="flex items-center justify-between gap-3"
              >
                <span className="text-muted-foreground text-sm">
                  {row.label}
                </span>
                <span className="text-sm font-medium">{row.value}</span>
              </div>
            ))
          : Array.from({ length: 6 }).map((_, index) => (
              <div key={index} className="bg-muted h-4 animate-pulse rounded" />
            ))}
      </CardContent>
    </Card>
  );
}

function PlanMixList(props: {
  title: string;
  description: string;
  rows?: { plan: string; count: number }[];
  emptyLabel: string;
}) {
  const rows = props.rows;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{props.title}</CardTitle>
        <CardDescription>{props.description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {rows ? (
          rows.length > 0 ? (
            rows.map((row) => (
              <div
                key={row.plan}
                className="flex items-center justify-between gap-3"
              >
                <span className="text-muted-foreground text-sm capitalize">
                  {row.plan}
                </span>
                <span className="text-sm font-medium">
                  {row.count.toLocaleString()}
                </span>
              </div>
            ))
          ) : (
            <div className="text-muted-foreground text-sm">
              {props.emptyLabel}
            </div>
          )
        ) : (
          Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="bg-muted h-4 animate-pulse rounded" />
          ))
        )}
      </CardContent>
    </Card>
  );
}

function formatOptionalNumber(value?: number) {
  return typeof value === "number" ? value.toLocaleString() : "-";
}

function formatMoney(cents: number, currency: string) {
  if (currency === "mixed") {
    return `${(cents / 100).toLocaleString()} mixed`;
  }

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency.toUpperCase(),
    maximumFractionDigits: 0,
  }).format(cents / 100);
}
