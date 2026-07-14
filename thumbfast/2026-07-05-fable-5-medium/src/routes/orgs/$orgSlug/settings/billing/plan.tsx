import { BillingSettings } from "@/features/billing/billing-settings";
import { createFileRoute, redirect, useParams } from "@tanstack/react-router";

type BillingPlanSearch = {
  session_id?: string;
};

export const Route = createFileRoute("/orgs/$orgSlug/settings/billing/plan")({
  validateSearch: (search: Record<string, unknown>): BillingPlanSearch => ({
    session_id:
      typeof search.session_id === "string" ? search.session_id : undefined,
  }),
  beforeLoad: ({ params, search }) => {
    if (!search.session_id) return;

    throw redirect({
      to: "/orgs/$orgSlug/settings/billing/success",
      params: { orgSlug: params.orgSlug },
      search: { session_id: search.session_id },
      replace: true,
    });
  },
  component: BillingPlanRoute,
});

function BillingPlanRoute() {
  const { orgSlug } = useParams({
    from: "/orgs/$orgSlug/settings/billing/plan",
  });

  return <BillingSettings orgSlug={orgSlug} view="plan" />;
}
