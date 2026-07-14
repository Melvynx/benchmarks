import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Item,
  ItemContent,
  ItemDescription,
  ItemFooter,
  ItemGroup,
  ItemHeader,
  ItemMedia,
  ItemTitle,
} from "@/components/ui/item";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Layout, LayoutContent } from "@/features/page/layout";
import { getModelLabel } from "@/lib/ai/image-models";
import { dayjs } from "@/lib/dayjs";
import { formatDurationMs } from "@/lib/format/duration";
import { cn } from "@/lib/utils";
import { api } from "@convex/_generated/api";
import {
  createFileRoute,
  Link,
  useNavigate,
  useSearch,
} from "@tanstack/react-router";
import { useMutation, useQuery } from "convex/react";
import {
  Activity,
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Building2,
  CheckCircle2,
  Clock,
  GitBranch,
  Loader2,
  RouteIcon,
  Split,
  XCircle,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import {
  AdminPageHeader,
  AdminSearch,
  AdminStatCard,
  StatusBadge,
} from "../_components/admin-shared";
import {
  AdminLogsListSkeleton,
  AdminLogsPageSkeleton,
} from "../_components/admin-skeletons";

const STATUS_OPTIONS = [
  { value: "all", label: "All statuses" },
  { value: "succeeded", label: "Succeeded" },
  { value: "failed", label: "Failed" },
] as const;

const FALLBACK_OPTIONS = [
  { value: "all", label: "All attempts" },
  { value: "yes", label: "Fallback only" },
  { value: "no", label: "First attempt only" },
] as const;

const ROUTING_ICON: Record<string, LucideIcon> = {
  succeeded: CheckCircle2,
  failed: XCircle,
  pending: Loader2,
  processing: Loader2,
};

export const Route = createFileRoute("/admin/generations/logs")({
  validateSearch: z.object({
    search: z.string().optional().default(""),
    status: z.string().optional(),
    api: z.string().optional(),
    fallback: z.enum(["yes", "no"]).optional(),
  }),
  component: AdminGenerationsLogsRoute,
  pendingComponent: AdminLogsPageSkeleton,
});

type RoutingLog = NonNullable<
  ReturnType<
    typeof useQuery<typeof api.admin.queries.listGenerationRoutingLogs>
  >
>[number];

function AdminGenerationsLogsRoute() {
  const search = useSearch({ from: "/admin/generations/logs" });
  const navigate = useNavigate({ from: "/admin/generations/logs" });
  const logs = useQuery(api.admin.queries.listGenerationRoutingLogs, {
    search: search.search || undefined,
    status: search.status,
    api: search.api,
    fallback: search.fallback,
  });
  const routingDashboard = useQuery(
    api.admin.queries.getGenerationRoutingDashboard,
    {},
  );
  const setRoutingSettings = useMutation(
    api.admin.mutations.setGenerationRoutingSettings,
  );
  const forceOfficialFirst =
    routingDashboard?.settings.forceOfficialFirst ?? false;

  const apiOptions = Object.entries(routingDashboard?.apiCounts ?? {})
    .sort((a, b) => b[1] - a[1])
    .map(([name, count]) => ({ value: name, label: `${name} (${count})` }));

  return (
    <Layout size="lg">
      <LayoutContent>
        <div className="flex flex-col gap-6">
          <AdminPageHeader
            title="API logs"
            description="Per-API call routing events for generation jobs."
            action={
              <div className="flex flex-wrap items-center gap-2">
                <Button asChild variant="outline" size="sm">
                  <Link to="/admin/generations">
                    <ArrowLeft className="size-4" />
                    Back to generations
                  </Link>
                </Button>
                <div className="flex items-center gap-3 rounded-lg border px-3 py-2">
                  <div className="min-w-0">
                    <div className="text-sm font-medium">Official first</div>
                    <div className="text-muted-foreground text-xs">
                      Try APIYI first when disabled
                    </div>
                  </div>
                  <Switch
                    checked={forceOfficialFirst}
                    disabled={!routingDashboard}
                    aria-label="Force official provider first"
                    onCheckedChange={(checked) =>
                      void setRoutingSettings({
                        forceOfficialFirst: checked,
                      }).then(() =>
                        toast.success(
                          checked
                            ? "Official provider is now first"
                            : "APIYI is now first",
                        ),
                      )
                    }
                  />
                </div>
              </div>
            }
          />

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <AdminStatCard
              title="Routing"
              value={forceOfficialFirst ? "Official" : "APIYI"}
              description="Default provider tested first"
              icon={RouteIcon}
            />
            <AdminStatCard
              title="Attempts"
              value={routingDashboard?.totals.attempts ?? "-"}
              description="Recent provider attempts"
              icon={Activity}
            />
            <AdminStatCard
              title="Fallbacks"
              value={routingDashboard?.totals.fallbackCount ?? "-"}
              description="Recent thumbnails using fallback"
              icon={GitBranch}
            />
            <AdminStatCard
              title="Failed attempts"
              value={routingDashboard?.totals.failedAttempts ?? "-"}
              description="Provider attempts that failed"
              icon={Split}
            />
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <AdminSearch
              value={search.search}
              placeholder="Search model, provider, or error..."
              onChange={(value) =>
                void navigate({
                  search: (prev) => ({ ...prev, search: value }),
                })
              }
            />
            {apiOptions.length > 0 ? (
              <Select
                value={search.api ?? "all"}
                onValueChange={(value) =>
                  void navigate({
                    search: (prev) => ({
                      ...prev,
                      api: value === "all" ? undefined : value,
                    }),
                  })
                }
              >
                <SelectTrigger className="w-44">
                  <SelectValue placeholder="API" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All APIs</SelectItem>
                  {apiOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : null}
            <Select
              value={search.status ?? "all"}
              onValueChange={(value) =>
                void navigate({
                  search: (prev) => ({
                    ...prev,
                    status: value === "all" ? undefined : value,
                  }),
                })
              }
            >
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={search.fallback ?? "all"}
              onValueChange={(value) =>
                void navigate({
                  search: (prev) => ({
                    ...prev,
                    fallback:
                      value === "yes" || value === "no" ? value : undefined,
                  }),
                })
              }
            >
              <SelectTrigger className="w-44">
                <SelectValue placeholder="Fallback" />
              </SelectTrigger>
              <SelectContent>
                {FALLBACK_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {logs === undefined ? (
            <AdminLogsListSkeleton />
          ) : logs.length === 0 ? (
            <EmptyLogs />
          ) : (
            <ItemGroup className="gap-3">
              {logs.map((event) => (
                <LogCard key={event.id} event={event} />
              ))}
            </ItemGroup>
          )}
        </div>
      </LayoutContent>
    </Layout>
  );
}

function LogCard(props: { event: RoutingLog }) {
  const { event } = props;
  const isSucceeded = event.status === "succeeded";
  const isFailed = event.status === "failed";
  const Icon = ROUTING_ICON[event.status] ?? Clock;
  const showRoutingDecision =
    event.requestedModel !== event.model || event.defaultModel !== event.model;

  return (
    <Item variant="outline" className="hover:bg-accent/30 items-start">
      <ItemMedia
        className={cn(
          "size-10 self-start rounded-md border",
          isSucceeded && "border-emerald-500/30 bg-emerald-500/10",
          isFailed && "border-destructive/30 bg-destructive/10",
          !isSucceeded && !isFailed && "bg-muted",
        )}
      >
        <Icon
          className={cn(
            "size-5",
            isSucceeded && "text-emerald-600",
            isFailed && "text-destructive",
            !isSucceeded && !isFailed && "text-muted-foreground",
            event.status === "processing" && "animate-spin",
          )}
        />
      </ItemMedia>

      <ItemContent className="min-w-0 gap-2">
        <ItemHeader>
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge value={event.status} />
            <Badge variant="outline" className="font-mono text-xs">
              {event.api}
            </Badge>
            <span className="text-muted-foreground text-xs">
              {event.provider}
            </span>
            {event.fallbackUsed ? (
              <Badge variant="secondary" className="text-xs">
                Fallback
              </Badge>
            ) : null}
            <span className="text-muted-foreground text-xs">
              attempt #{event.attemptIndex + 1}
            </span>
          </div>
          <span
            className="text-muted-foreground shrink-0 text-xs"
            title={dayjs(event.createdAt).format("MMM D, YYYY HH:mm:ss")}
          >
            {dayjs(event.createdAt).fromNow()}
          </span>
        </ItemHeader>

        <ItemTitle className="flex flex-wrap items-baseline gap-2">
          <span className="text-sm">
            {getModelLabel(event.model) ?? event.model}
          </span>
          <span className="text-muted-foreground truncate font-mono text-xs">
            {event.apiModelId}
          </span>
        </ItemTitle>

        <ItemDescription className="text-muted-foreground flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
          <DurationLabel ms={event.durationMs} status={event.status} />
          {showRoutingDecision ? (
            <span className="inline-flex items-center gap-1">
              <span>requested:</span>
              <span className="text-foreground font-mono">
                {event.requestedModel}
              </span>
              <ArrowRight className="size-2.5" />
              <span className="text-foreground font-mono">
                {event.defaultModel}
              </span>
            </span>
          ) : null}
          {event.generationId ? (
            <Link
              to="/admin/generations"
              search={{ search: event.generationId }}
              className="hover:text-foreground inline-flex items-center gap-1 font-mono underline-offset-2 hover:underline"
            >
              gen: {event.generationId.slice(0, 12)}…
            </Link>
          ) : null}
          <Link
            to="/admin/organizations/$orgId"
            params={{ orgId: event.organizationId }}
            className="hover:text-foreground inline-flex items-center gap-1 font-mono underline-offset-2 hover:underline"
          >
            <Building2 className="size-3" />
            {event.organizationId.slice(0, 12)}…
          </Link>
        </ItemDescription>

        {event.error ? (
          <ItemFooter>
            <div className="bg-destructive/10 text-destructive border-destructive/20 flex w-full items-start gap-2 rounded-md border px-3 py-2 text-xs">
              <AlertCircle className="mt-0.5 size-3.5 shrink-0" />
              <span className="line-clamp-3 whitespace-pre-wrap">
                {event.error}
              </span>
            </div>
          </ItemFooter>
        ) : null}
      </ItemContent>
    </Item>
  );
}

function DurationLabel(props: { ms: number | null; status: string }) {
  if (props.ms === null) return null;
  const isSucceeded = props.status === "succeeded";
  const isSlow = props.ms > 30_000;
  const isFast = props.ms < 5_000;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1",
        isSucceeded && isFast && "text-emerald-600",
        isSucceeded && isSlow && "text-amber-600",
      )}
    >
      <Clock className="size-3" />
      {formatDurationMs(props.ms)}
    </span>
  );
}

function EmptyLogs() {
  return (
    <div className="bg-card flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed py-16 text-center">
      <div className="bg-muted flex size-12 items-center justify-center rounded-full">
        <Activity className="text-muted-foreground size-5" />
      </div>
      <p className="text-sm font-medium">No routing events found</p>
      <p className="text-muted-foreground text-xs">
        Try changing the search or filter.
      </p>
    </div>
  );
}
