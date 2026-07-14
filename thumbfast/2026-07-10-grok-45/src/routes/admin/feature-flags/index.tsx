import { Switch } from "@/components/ui/switch";
import { Layout, LayoutContent } from "@/features/page/layout";
import { api } from "@convex/_generated/api";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery } from "convex/react";
import type { ReactNode } from "react";
import { toast } from "sonner";
import { AdminPageHeader, AdminTable } from "../_components/admin-shared";
import { AdminFeatureFlagsPageSkeleton } from "../_components/admin-skeletons";

export const Route = createFileRoute("/admin/feature-flags/")({
  component: AdminFeatureFlagsRoute,
  pendingComponent: AdminFeatureFlagsPageSkeleton,
});

function FlagName({ label, flagKey }: { label: string; flagKey: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      {label ? <span className="text-sm font-medium">{label}</span> : null}
      <span className="text-muted-foreground font-mono text-xs">{flagKey}</span>
    </div>
  );
}

function AdminFeatureFlagsRoute() {
  const flags = useQuery(api.admin.queries.listFeatureFlags, {});
  const routingDashboard = useQuery(
    api.admin.queries.getGenerationRoutingDashboard,
    {},
  );
  const setFlag = useMutation(api.admin.mutations.setFeatureFlag);
  const setRoutingSettings = useMutation(
    api.admin.mutations.setGenerationRoutingSettings,
  );

  const apiyiFirst = routingDashboard
    ? !routingDashboard.settings.forceOfficialFirst
    : null;

  const rows: ReactNode[][] | undefined =
    flags === undefined
      ? undefined
      : [
          // Generation routing is managed alongside the declared flags. It keeps
          // its own storage because the generation path and the routing logs
          // page read it, but it is toggled here like any other flag.
          [
            <FlagName
              key="name"
              label="Generation routing: APIYI first"
              flagKey="apiyi-first"
            />,
            <span
              key="desc"
              className="text-muted-foreground line-clamp-2 max-w-md text-sm"
            >
              Try APIYI before the official provider.
            </span>,
            <Switch
              key="switch"
              checked={apiyiFirst ?? false}
              disabled={apiyiFirst === null}
              aria-label="APIYI before official providers"
              onCheckedChange={(checked) =>
                void setRoutingSettings({
                  forceOfficialFirst: !checked,
                }).then(() =>
                  toast.success(
                    checked
                      ? "APIYI is now first"
                      : "Official provider is now first",
                  ),
                )
              }
            />,
          ],
          ...flags.map((flag) => [
            <FlagName key="name" label={flag.label ?? ""} flagKey={flag.key} />,
            <span
              key="desc"
              className="text-muted-foreground line-clamp-2 max-w-md text-sm"
            >
              {flag.description ?? "-"}
            </span>,
            <Switch
              key="switch"
              checked={flag.enabled}
              aria-label={flag.key}
              onCheckedChange={(checked) =>
                void setFlag({
                  key: flag.key,
                  enabled: checked,
                  description: flag.description ?? undefined,
                }).then(() => toast.success("Feature flag updated"))
              }
            />,
          ]),
        ];

  return (
    <Layout size="lg">
      <LayoutContent>
        <div className="flex flex-col gap-6">
          <AdminPageHeader
            title="Feature Flags"
            description="Toggle platform and product flags. Declared flags always appear here."
          />
          <AdminTable
            headers={["Flag", "Description", "Enabled"]}
            empty="No feature flags found."
            rows={rows}
          />
        </div>
      </LayoutContent>
    </Layout>
  );
}
