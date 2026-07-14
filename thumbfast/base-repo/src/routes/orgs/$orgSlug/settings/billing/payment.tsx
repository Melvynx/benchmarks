import { BillingSettings } from "@/features/billing/billing-settings";
import { createFileRoute, useParams } from "@tanstack/react-router";

export const Route = createFileRoute("/orgs/$orgSlug/settings/billing/payment")(
  {
    component: BillingPaymentRoute,
  },
);

function BillingPaymentRoute() {
  const { orgSlug } = useParams({
    from: "/orgs/$orgSlug/settings/billing/payment",
  });

  return <BillingSettings orgSlug={orgSlug} view="payment" />;
}
