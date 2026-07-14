import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { ChartConfig } from "@/components/ui/chart";
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { Layout, LayoutContent } from "@/features/page/layout";
import { dayjs } from "@/lib/dayjs";
import { api } from "@convex/_generated/api";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "convex/react";
import { BadgeCheck, Flame, ListChecks, RadioTower } from "lucide-react";
import { useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, XAxis } from "recharts";
import {
  AdminPageHeader,
  AdminSearch,
  AdminStatCard,
  AdminTable,
} from "./_components/admin-shared";
import { AdminLeadsPageSkeleton } from "./_components/admin-skeletons";

const dailyChartConfig = {
  leads: {
    label: "Leads",
    color: "var(--chart-1)",
  },
  hot: {
    label: "Hot",
    color: "var(--chart-2)",
  },
} satisfies ChartConfig;

const typeChartConfig = {
  count: {
    label: "Leads",
    color: "var(--chart-3)",
  },
} satisfies ChartConfig;

const sourceChartConfig = {
  count: {
    label: "Leads",
    color: "var(--chart-4)",
  },
} satisfies ChartConfig;

export const Route = createFileRoute("/admin/leads")({
  component: AdminLeadsRoute,
  pendingComponent: AdminLeadsPageSkeleton,
});

function AdminLeadsRoute() {
  const leadsData = useQuery(api.admin.queries.listLeads, {});
  const [search, setSearch] = useState("");
  const leads = leadsData?.leads;
  const filteredLeads = useMemo(() => {
    const value = search.trim().toLowerCase();
    if (!value) return leads;

    return leads?.filter((lead) =>
      [
        lead.organizationName,
        lead.organizationId,
        lead.organizationSlug,
        lead.youtubeChannelTitle,
        lead.youtubeChannelUrl,
        lead.referralSourceLabel,
        lead.userTypeLabel,
        lead.status,
      ].some((field) =>
        String(field ?? "")
          .toLowerCase()
          .includes(value),
      ),
    );
  }, [leads, search]);

  return (
    <Layout size="lg">
      <LayoutContent>
        <div className="flex flex-col gap-6">
          <AdminPageHeader
            title="Leads"
            description="Review onboarding lead answers and acquisition context."
          />
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <AdminStatCard
              title="Total leads"
              value={leadsData?.stats.total.toLocaleString() ?? "-"}
              description="Answered onboarding"
              icon={ListChecks}
            />
            <AdminStatCard
              title="Hot leads"
              value={leadsData?.stats.hot.toLocaleString() ?? "-"}
              description={`${leadsData?.stats.cold ?? 0} cold leads`}
              icon={Flame}
            />
            <AdminStatCard
              title="YouTubers"
              value={leadsData?.stats.youtuber.toLocaleString() ?? "-"}
              description={`${leadsData?.stats.agency ?? 0} agencies`}
              icon={BadgeCheck}
            />
            <AdminStatCard
              title="From Melvynx"
              value={leadsData?.stats.fromMelvynx.toLocaleString() ?? "-"}
              description="Founder-sourced leads"
              icon={RadioTower}
            />
          </div>

          <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
            <Card className="py-0 xl:col-span-2">
              <CardHeader className="border-b px-6 py-4">
                <CardTitle className="text-base">Lead trend</CardTitle>
                <CardDescription>
                  New and hot onboarding leads over the last 30 days.
                </CardDescription>
              </CardHeader>
              <CardContent className="px-2 sm:p-6">
                <ChartContainer
                  config={dailyChartConfig}
                  className="aspect-auto h-[280px] w-full"
                >
                  <BarChart
                    accessibilityLayer
                    data={leadsData?.chartData ?? []}
                    margin={{ left: 12, right: 12 }}
                  >
                    <CartesianGrid vertical={false} />
                    <XAxis
                      dataKey="date"
                      tickLine={false}
                      axisLine={false}
                      tickMargin={8}
                      minTickGap={32}
                      tickFormatter={(value) =>
                        dayjs.utc(String(value)).format("MMM D")
                      }
                    />
                    <ChartTooltip
                      content={(props) => <ChartTooltipContent {...props} />}
                    />
                    <ChartLegend content={<ChartLegendContent />} />
                    <Bar
                      dataKey="leads"
                      fill="var(--color-leads)"
                      radius={[4, 4, 0, 0]}
                    />
                    <Bar
                      dataKey="hot"
                      fill="var(--color-hot)"
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ChartContainer>
              </CardContent>
            </Card>

            <Card className="py-0">
              <CardHeader className="border-b px-6 py-4">
                <CardTitle className="text-base">Lead type mix</CardTitle>
                <CardDescription>
                  Answers from the qualification step.
                </CardDescription>
              </CardHeader>
              <CardContent className="px-2 sm:p-6">
                <ChartContainer
                  config={typeChartConfig}
                  className="aspect-auto h-[280px] w-full"
                >
                  <BarChart
                    accessibilityLayer
                    data={leadsData?.typeChart ?? []}
                    margin={{ left: 12, right: 12 }}
                  >
                    <CartesianGrid vertical={false} />
                    <XAxis
                      dataKey="label"
                      tickLine={false}
                      axisLine={false}
                      tickMargin={8}
                    />
                    <ChartTooltip
                      content={(props) => <ChartTooltipContent {...props} />}
                    />
                    <Bar
                      dataKey="count"
                      fill="var(--color-count)"
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ChartContainer>
              </CardContent>
            </Card>

            <Card className="py-0">
              <CardHeader className="border-b px-6 py-4">
                <CardTitle className="text-base">Acquisition source</CardTitle>
                <CardDescription>
                  Where leads said they came from.
                </CardDescription>
              </CardHeader>
              <CardContent className="px-2 sm:p-6">
                <ChartContainer
                  config={sourceChartConfig}
                  className="aspect-auto h-[280px] w-full"
                >
                  <BarChart
                    accessibilityLayer
                    data={leadsData?.sourceChart ?? []}
                    margin={{ left: 12, right: 12 }}
                  >
                    <CartesianGrid vertical={false} />
                    <XAxis
                      dataKey="label"
                      tickLine={false}
                      axisLine={false}
                      tickMargin={8}
                    />
                    <ChartTooltip
                      content={(props) => <ChartTooltipContent {...props} />}
                    />
                    <Bar
                      dataKey="count"
                      fill="var(--color-count)"
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ChartContainer>
              </CardContent>
            </Card>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <AdminSearch
              value={search}
              onChange={setSearch}
              placeholder="Search leads..."
            />
          </div>

          <AdminTable
            headers={[
              "Lead",
              "Status",
              "Source",
              "Videos/month",
              "Subscribers",
              "Organization",
              "Created",
            ]}
            empty="No leads found."
            rows={filteredLeads?.map((lead) => [
              <span key="lead" className="min-w-0">
                <span className="block text-sm font-medium">
                  {lead.youtubeChannelTitle ?? lead.userTypeLabel}
                </span>
                <span className="text-muted-foreground line-clamp-1 text-xs">
                  {lead.youtubeChannelUrl ?? lead.userTypeLabel}
                </span>
              </span>,
              <LeadStatusBadge key="status" status={lead.status} />,
              <span key="source" className="text-sm">
                {lead.referralSourceLabel}
              </span>,
              <span key="videos">{lead.videosPerMonth ?? "-"}</span>,
              <span key="subscribers">
                {formatCompactNumber(lead.youtubeSubscriberCount)}
              </span>,
              <OrganizationCell
                key="org"
                organizationId={lead.organizationId}
                organizationName={lead.organizationName}
              />,
              <span key="created" className="text-muted-foreground text-sm">
                {dayjs(lead.createdAt).format("MMM D, YYYY")}
              </span>,
            ])}
          />
        </div>
      </LayoutContent>
    </Layout>
  );
}

function LeadStatusBadge({ status }: { status: string }) {
  return (
    <Badge variant={status === "hot" ? "default" : "outline"}>{status}</Badge>
  );
}

function OrganizationCell({
  organizationId,
  organizationName,
}: {
  organizationId: string;
  organizationName?: string | null;
}) {
  return (
    <Link
      to="/admin/organizations/$orgId"
      params={{ orgId: organizationId }}
      className="block max-w-56"
    >
      <span className="block truncate text-sm font-medium">
        {organizationName ?? "Untitled organization"}
      </span>
      <span className="text-muted-foreground block truncate font-mono text-xs">
        {organizationId}
      </span>
    </Link>
  );
}

function formatCompactNumber(value?: number | null) {
  if (typeof value !== "number") return "-";
  return Intl.NumberFormat("en", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);
}
