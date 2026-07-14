import { BillingSettings } from "@/features/billing/billing-settings";
import { createFileRoute, useParams } from "@tanstack/react-router";

export const Route = createFileRoute("/orgs/$orgSlug/settings/billing/history")({
  component: BillingHistoryRoute,
});

function BillingHistoryRoute() {
  const { orgSlug } = useParams({
    from: "/orgs/$orgSlug/settings/billing/history",
  });

  return <BillingSettings orgSlug={orgSlug} view="history" />;
}
