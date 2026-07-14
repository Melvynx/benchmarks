import { BillingSettings } from "@/features/billing/billing-settings";
import { createFileRoute, useParams } from "@tanstack/react-router";

export const Route = createFileRoute("/orgs/$orgSlug/settings/billing/logs")({
  component: BillingLogsRoute,
});

function BillingLogsRoute() {
  const { orgSlug } = useParams({
    from: "/orgs/$orgSlug/settings/billing/logs",
  });

  return <BillingSettings orgSlug={orgSlug} view="logs" />;
}
