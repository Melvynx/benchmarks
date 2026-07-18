import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { ChartConfig } from "@/components/ui/chart";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Layout, LayoutContent } from "@/features/page/layout";
import { dialogManager } from "@/features/dialog-manager/dialog-manager";
import { dayjs } from "@/lib/dayjs";
import { api } from "@convex/_generated/api";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery } from "convex/react";
import {
  CheckCircle,
  MessageSquare,
  MoreHorizontal,
  RotateCcw,
  Star,
  X,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  XAxis,
} from "recharts";
import { toast } from "sonner";
import { z } from "zod";
import {
  AdminPageHeader,
  AdminSearch,
  AdminStatCard,
} from "../_components/admin-shared";
import { AdminFeedbackPageSkeleton } from "../_components/admin-skeletons";

export const Route = createFileRoute("/admin/feedback/")({
  validateSearch: z.object({
    search: z.string().optional().default(""),
    status: z
      .enum(["all", "open", "replied", "closed"])
      .optional()
      .default("all"),
    rating: z.string().optional().default(""),
    sort: z
      .enum(["newest", "oldest", "rating-desc", "rating-asc"])
      .optional()
      .default("newest"),
  }),
  component: AdminFeedbackRoute,
  pendingComponent: AdminFeedbackPageSkeleton,
});

const ratingChartConfig = {
  count: { label: "Count", color: "var(--chart-1)" },
} satisfies ChartConfig;

const statusChartConfig = {
  open: { label: "Open", color: "var(--chart-1)" },
  replied: { label: "Replied", color: "var(--chart-2)" },
  closed: { label: "Closed", color: "var(--chart-3)" },
} satisfies ChartConfig;

const STATUS_OPTIONS = [
  { value: "all", label: "All" },
  { value: "open", label: "Open" },
  { value: "replied", label: "Replied" },
  { value: "closed", label: "Closed" },
] as const;

const SORT_OPTIONS = [
  { value: "newest", label: "Newest first" },
  { value: "oldest", label: "Oldest first" },
  { value: "rating-desc", label: "Rating: high to low" },
  { value: "rating-asc", label: "Rating: low to high" },
] as const;

function AdminFeedbackRoute() {
  const { search, status, rating, sort } = Route.useSearch();
  const navigate = useNavigate({ from: "/admin/feedback/" });

  const data = useQuery(api.admin.queries.getFeedbackDashboard, {
    search: search || undefined,
    status,
    rating: rating ? Number(rating) : undefined,
    sort,
  });

  const replyFeedback = useMutation(api.admin.mutations.replyFeedback);
  const closeFeedback = useMutation(api.admin.mutations.closeFeedback);
  const reopenFeedback = useMutation(api.admin.mutations.reopenFeedback);

  const setParam = (
    key: "search" | "status" | "rating" | "sort",
    value: string | undefined,
  ) =>
    void navigate({
      search: (prev) => ({ ...prev, [key]: value }),
    });

  const stats = data?.stats;
  const feedbacks = data?.feedbacks;

  const statusPieData = stats
    ? [
        { name: "open", value: stats.openCount, fill: "var(--chart-1)" },
        { name: "replied", value: stats.repliedCount, fill: "var(--chart-2)" },
        { name: "closed", value: stats.closedCount, fill: "var(--chart-3)" },
      ].filter((d) => d.value > 0)
    : [];

  return (
    <Layout size="lg">
      <LayoutContent>
        <div className="flex flex-col gap-6">
          <AdminPageHeader
            title="Feedback"
            description="Review product feedback and record admin replies."
          />

          {/* Stat cards */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <AdminStatCard
              title="Total feedback"
              value={stats?.total.toLocaleString() ?? "-"}
              description="All time submissions"
              icon={MessageSquare}
            />
            <AdminStatCard
              title="Avg. rating"
              value={
                stats?.avgRating != null
                  ? `${stats.avgRating.toFixed(1)} / 5`
                  : "-"
              }
              description={`Based on ${(stats?.ratingDistribution ?? []).reduce((s, d) => s + d.count, 0)} rated submissions`}
              icon={Star}
            />
            <AdminStatCard
              title="Open"
              value={stats?.openCount.toLocaleString() ?? "-"}
              description="Awaiting reply"
              icon={MessageSquare}
            />
            <AdminStatCard
              title="Replied"
              value={stats?.repliedCount.toLocaleString() ?? "-"}
              description={
                stats
                  ? `${stats.total > 0 ? Math.round((stats.repliedCount / stats.total) * 100) : 0}% reply rate`
                  : "–"
              }
              icon={CheckCircle}
            />
          </div>

          {/* Charts */}
          <div className="grid gap-4 lg:grid-cols-3">
            {/* Rating distribution */}
            <div className="bg-card rounded-lg border p-5 lg:col-span-2">
              <p className="mb-0.5 text-sm font-semibold">
                Rating Distribution
              </p>
              <p className="text-muted-foreground mb-4 text-xs">
                Breakdown of user satisfaction scores
              </p>
              <ChartContainer
                config={ratingChartConfig}
                className="h-[160px] w-full"
              >
                <BarChart
                  data={stats?.ratingDistribution ?? []}
                  margin={{ left: 0, right: 0 }}
                >
                  <CartesianGrid vertical={false} />
                  <XAxis
                    dataKey="label"
                    tickLine={false}
                    axisLine={false}
                    tickMargin={6}
                    tick={{ fontSize: 11 }}
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
            </div>

            {/* Status breakdown */}
            <div className="bg-card rounded-lg border p-5">
              <p className="mb-0.5 text-sm font-semibold">Status Breakdown</p>
              <p className="text-muted-foreground mb-4 text-xs">
                Open vs Replied vs Closed
              </p>
              {stats && stats.total > 0 ? (
                <>
                  <ChartContainer
                    config={statusChartConfig}
                    className="h-[120px] w-full"
                  >
                    <PieChart>
                      <ChartTooltip
                        content={(props) => (
                          <ChartTooltipContent {...props} hideLabel />
                        )}
                      />
                      <Pie
                        data={statusPieData}
                        dataKey="value"
                        nameKey="name"
                        innerRadius="55%"
                        outerRadius="80%"
                        paddingAngle={2}
                      >
                        {statusPieData.map((entry) => (
                          <Cell key={entry.name} fill={entry.fill} />
                        ))}
                      </Pie>
                    </PieChart>
                  </ChartContainer>
                  <div className="mt-3 flex flex-col gap-1.5">
                    <StatusLegendRow
                      label="Open"
                      value={stats.openCount}
                      color="var(--chart-1)"
                    />
                    <StatusLegendRow
                      label="Replied"
                      value={stats.repliedCount}
                      color="var(--chart-2)"
                    />
                    <StatusLegendRow
                      label="Closed"
                      value={stats.closedCount}
                      color="var(--chart-3)"
                    />
                  </div>
                </>
              ) : (
                <p className="text-muted-foreground text-sm">No data yet.</p>
              )}
            </div>
          </div>

          {/* Filters */}
          <div className="flex flex-wrap items-center gap-3">
            <AdminSearch
              value={search}
              onChange={(v) => setParam("search", v || undefined)}
              className="max-w-sm"
            />
            {/* Status tabs */}
            <div className="flex items-center gap-1 rounded-md border p-1">
              {STATUS_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setParam("status", opt.value)}
                  className={`rounded px-3 py-1.5 text-xs font-medium transition-colors ${
                    status === opt.value
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-muted"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            {/* Rating filter */}
            <Select
              value={rating || "all"}
              onValueChange={(v) =>
                setParam("rating", v === "all" ? undefined : v)
              }
            >
              <SelectTrigger className="w-36 text-xs">
                <SelectValue placeholder="All ratings" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All ratings</SelectItem>
                {[0, 1, 2, 3, 4, 5].map((r) => (
                  <SelectItem key={r} value={String(r)}>
                    Rating: {r} ★
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {/* Sort */}
            <Select value={sort} onValueChange={(v) => setParam("sort", v)}>
              <SelectTrigger className="w-44 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SORT_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {feedbacks !== undefined && (
              <span className="text-muted-foreground ml-auto text-xs">
                {feedbacks.length} result{feedbacks.length !== 1 ? "s" : ""}
              </span>
            )}
          </div>

          {/* Table */}
          <div className="rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[38%]">Feedback</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead className="w-20">Rating</TableHead>
                  <TableHead className="w-24">Status</TableHead>
                  <TableHead className="w-28">Created</TableHead>
                  <TableHead className="w-12" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {feedbacks === undefined &&
                  Array.from({ length: 6 }).map((_, i) => (
                    <TableRow key={i}>
                      {Array.from({ length: 6 }).map((_, j) => (
                        <TableCell key={j}>
                          <Skeleton className="h-4 w-24" />
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                {feedbacks?.length === 0 && (
                  <TableRow>
                    <TableCell
                      colSpan={6}
                      className="text-muted-foreground h-24 text-center text-sm"
                    >
                      No feedback found.
                    </TableCell>
                  </TableRow>
                )}
                {feedbacks?.map((fb) => {
                  const fbStatus = fb.closedAt
                    ? "closed"
                    : fb.reply
                      ? "replied"
                      : "open";
                  return (
                    <TableRow
                      key={fb.id}
                      className={fb.closedAt ? "opacity-60" : undefined}
                    >
                      <TableCell>
                        <span className="line-clamp-2 max-w-sm text-sm">
                          {fb.message || (
                            <span className="text-muted-foreground italic">
                              No message
                            </span>
                          )}
                        </span>
                      </TableCell>
                      <TableCell>
                        {fb.user ? (
                          <Link
                            to="/admin/users/$userId"
                            params={{ userId: fb.user.id }}
                            className="block max-w-48 truncate text-sm font-medium underline-offset-2 hover:underline"
                          >
                            {fb.user.email}
                          </Link>
                        ) : fb.organizationId ? (
                          <Link
                            to="/admin/organizations/$orgId"
                            params={{ orgId: fb.organizationId }}
                            className="text-muted-foreground hover:text-foreground block max-w-48 truncate font-mono text-xs underline-offset-2 hover:underline"
                          >
                            {fb.organizationId}
                          </Link>
                        ) : (
                          <span className="text-muted-foreground text-sm">
                            -
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <span className="text-sm font-medium">
                            {fb.rating ?? "-"}
                          </span>
                          {fb.rating != null && (
                            <Star className="text-primary size-3 fill-current" />
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <FeedbackStatusBadge status={fbStatus} />
                      </TableCell>
                      <TableCell>
                        <span className="text-muted-foreground text-sm">
                          {dayjs(fb.createdAt).format("MMM D, YYYY")}
                        </span>
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="size-7 p-0"
                              aria-label="Open actions"
                            >
                              <MoreHorizontal className="size-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem asChild>
                              <Link
                                to="/admin/feedback/$feedbackId"
                                params={{ feedbackId: fb.id }}
                              >
                                View detail
                              </Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() =>
                                dialogManager.input({
                                  title: "Reply note",
                                  description:
                                    "Stores the reply on the feedback record.",
                                  input: {
                                    label: "Reply",
                                    defaultValue: fb.reply ?? "",
                                  },
                                  action: {
                                    label: "Save",
                                    onClick: async (reply) => {
                                      if (!reply?.trim()) return;
                                      await replyFeedback({
                                        feedbackId: fb.id as never,
                                        reply: reply.trim(),
                                      });
                                      toast.success("Reply saved");
                                    },
                                  },
                                })
                              }
                            >
                              Reply
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            {fb.closedAt ? (
                              <DropdownMenuItem
                                onClick={async () => {
                                  await reopenFeedback({
                                    feedbackId: fb.id as never,
                                  });
                                  toast.success("Feedback reopened");
                                }}
                              >
                                <RotateCcw className="mr-2 size-3.5" />
                                Reopen
                              </DropdownMenuItem>
                            ) : (
                              <DropdownMenuItem
                                onClick={async () => {
                                  await closeFeedback({
                                    feedbackId: fb.id as never,
                                  });
                                  toast.success("Feedback closed");
                                }}
                                className="text-muted-foreground"
                              >
                                <X className="mr-2 size-3.5" />
                                Mark as closed
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </div>
      </LayoutContent>
    </Layout>
  );
}

function FeedbackStatusBadge({
  status,
}: {
  status: "open" | "replied" | "closed";
}) {
  if (status === "replied") return <Badge variant="default">replied</Badge>;
  if (status === "closed") return <Badge variant="secondary">closed</Badge>;
  return <Badge variant="outline">open</Badge>;
}

function StatusLegendRow({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: string;
}) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <div
          className="size-2.5 rounded-full"
          style={{ backgroundColor: color }}
        />
        <span className="text-muted-foreground text-xs">{label}</span>
      </div>
      <span className="text-xs font-semibold">{value}</span>
    </div>
  );
}
