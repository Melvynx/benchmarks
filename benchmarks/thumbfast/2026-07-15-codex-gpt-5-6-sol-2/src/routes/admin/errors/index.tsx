import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Item,
  ItemContent,
  ItemDescription,
  ItemGroup,
  ItemHeader,
  ItemTitle,
} from "@/components/ui/item";
import { Layout, LayoutContent } from "@/features/page/layout";
import { dayjs } from "@/lib/dayjs";
import { api } from "@convex/_generated/api";
import {
  createFileRoute,
  Link,
  useNavigate,
  useSearch,
} from "@tanstack/react-router";
import { useQuery } from "convex/react";
import {
  AlertCircle,
  AlertTriangle,
  Building2,
  Clock4,
  ImageOff,
  Code2,
} from "lucide-react";
import { useState } from "react";
import { z } from "zod";
import {
  AdminPageHeader,
  AdminSearch,
  AdminStatCard,
} from "../_components/admin-shared";
import {
  AdminErrorListSkeleton,
  AdminErrorsPageSkeleton,
} from "../_components/admin-skeletons";

const DAY_MS = 24 * 60 * 60 * 1000;

export const Route = createFileRoute("/admin/errors/")({
  validateSearch: z.object({
    search: z.string().optional().default(""),
  }),
  component: AdminErrorsRoute,
  pendingComponent: AdminErrorsPageSkeleton,
});

type ErrorRow = NonNullable<
  ReturnType<typeof useQuery<typeof api.admin.queries.listThumbnailErrors>>
>[number];

function AdminErrorsRoute() {
  const { search } = useSearch({ from: "/admin/errors/" });
  const navigate = useNavigate({ from: "/admin/errors/" });
  const errors = useQuery(api.admin.queries.listThumbnailErrors, {
    search: search || undefined,
  });

  const [selectedErrorId, setSelectedErrorId] = useState<string | null>(null);
  const selectedError =
    selectedErrorId && errors
      ? (errors.find((e) => e.id === selectedErrorId) ?? null)
      : null;

  const counts = computeStats(errors);

  return (
    <Layout size="lg">
      <LayoutContent>
        <div className="flex flex-col gap-6">
          <AdminPageHeader
            title="Errors"
            description="Investigate thumbnail generation failures."
          />

          <div className="grid gap-4 md:grid-cols-3">
            <AdminStatCard
              title="Total"
              value={errors?.length ?? "-"}
              description="Recent errors"
              icon={AlertTriangle}
            />
            <AdminStatCard
              title="Last 24h"
              value={counts.last24h ?? "-"}
              description="Errors in the last day"
              icon={Clock4}
            />
            <AdminStatCard
              title="Affected orgs"
              value={counts.uniqueOrgs ?? "-"}
              description="Unique organizations"
              icon={Building2}
            />
          </div>

          <AdminSearch
            value={search}
            placeholder="Search error message..."
            onChange={(value) =>
              void navigate({ search: (prev) => ({ ...prev, search: value }) })
            }
          />

          {errors === undefined ? (
            <AdminErrorListSkeleton />
          ) : errors.length === 0 ? (
            <EmptyErrors />
          ) : (
            <ItemGroup className="gap-3">
              {errors.map((error) => (
                <ErrorCard
                  key={error.id}
                  error={error}
                  onShowStack={() => setSelectedErrorId(error.id)}
                />
              ))}
            </ItemGroup>
          )}
        </div>
      </LayoutContent>

      <StackTraceDialog
        open={selectedError !== null}
        onOpenChange={(open) => {
          if (!open) setSelectedErrorId(null);
        }}
        error={selectedError}
      />
    </Layout>
  );
}

function ErrorCard(props: { error: ErrorRow; onShowStack: () => void }) {
  const { error } = props;

  return (
    <Item variant="outline" className="hover:bg-accent/30 items-start">
      <ItemContent className="min-w-0 gap-2">
        <ItemHeader>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="destructive" className="text-xs">
              <AlertCircle className="size-3" />
              Error
            </Badge>
            {error.stack ? (
              <Button
                variant="ghost"
                size="sm"
                className="h-6 px-2 text-xs"
                onClick={props.onShowStack}
              >
                <Code2 className="size-3" />
                View stack
              </Button>
            ) : null}
          </div>
          <span
            className="text-muted-foreground shrink-0 text-xs"
            title={dayjs(error.createdAt).format("MMM D, YYYY HH:mm:ss")}
          >
            {dayjs(error.createdAt).fromNow()}
          </span>
        </ItemHeader>

        <ItemTitle className="text-destructive block text-sm leading-relaxed font-normal">
          {error.message}
        </ItemTitle>

        <ItemDescription className="text-muted-foreground flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
          <Link
            to="/admin/organizations/$orgId"
            params={{ orgId: error.organizationId }}
            className="hover:text-foreground inline-flex items-center gap-1 font-mono underline-offset-2 hover:underline"
          >
            <Building2 className="size-3" />
            {error.organizationId.slice(0, 12)}…
          </Link>
          {error.generationId ? (
            <Link
              to="/admin/generations"
              search={{ search: error.generationId }}
              className="hover:text-foreground inline-flex items-center gap-1 font-mono underline-offset-2 hover:underline"
            >
              gen: {error.generationId.slice(0, 12)}…
            </Link>
          ) : null}
          {error.thumbnailId ? (
            <span className="font-mono">
              thumb: {error.thumbnailId.slice(0, 12)}…
            </span>
          ) : null}
        </ItemDescription>
      </ItemContent>
    </Item>
  );
}

function StackTraceDialog(props: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  error: ErrorRow | null;
}) {
  if (!props.error) return null;
  return (
    <Dialog open={props.open} onOpenChange={props.onOpenChange}>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Stack trace</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-3">
          <p className="text-destructive text-sm">{props.error.message}</p>
          <pre className="bg-muted max-h-[60vh] overflow-auto rounded-md p-3 font-mono text-xs whitespace-pre-wrap">
            {props.error.stack ?? "No stack trace available."}
          </pre>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function EmptyErrors() {
  return (
    <div className="bg-card flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed py-16 text-center">
      <div className="bg-muted flex size-12 items-center justify-center rounded-full">
        <ImageOff className="text-muted-foreground size-5" />
      </div>
      <p className="text-sm font-medium">No errors found</p>
      <p className="text-muted-foreground text-xs">
        Generation failures will appear here.
      </p>
    </div>
  );
}

function computeStats(rows: ErrorRow[] | undefined) {
  if (!rows) return { last24h: null, uniqueOrgs: null };
  const cutoff = Date.now() - DAY_MS;
  const last24h = rows.filter((row) => row.createdAt >= cutoff).length;
  const uniqueOrgs = new Set(rows.map((row) => row.organizationId)).size;
  return { last24h, uniqueOrgs };
}
