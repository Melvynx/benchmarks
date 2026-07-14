import { BillingSettings } from "@/features/billing/billing-settings";
import { createFileRoute, useParams } from "@tanstack/react-router";

export const Route = createFileRoute("/orgs/$orgSlug/settings/billing/usage")({
  component: BillingUsageRoute,
});

function BillingUsageRoute() {
  const { orgSlug } = useParams({
    from: "/orgs/$orgSlug/settings/billing/usage",
  });

  return <BillingSettings orgSlug={orgSlug} view="usage" />;
}
