import { BillingSettings } from "@/features/billing/billing-settings";
import {
  Outlet,
  createFileRoute,
  useLocation,
  useParams,
} from "@tanstack/react-router";

export const Route = createFileRoute("/orgs/$orgSlug/settings/billing")({
  component: BillingRoute,
});

function BillingRoute() {
  const { orgSlug } = useParams({
    from: "/orgs/$orgSlug/settings/billing",
  });
  const location = useLocation();
  const path = location.pathname;

  if (path.endsWith("/success") || path.endsWith("/cancel")) {
    return <Outlet />;
  }

  if (path.endsWith("/history")) {
    return <BillingSettings orgSlug={orgSlug} view="history" />;
  }

  if (path.endsWith("/logs")) {
    return <BillingSettings orgSlug={orgSlug} view="logs" />;
  }

  if (path.endsWith("/usage")) {
    return <BillingSettings orgSlug={orgSlug} view="usage" />;
  }

  if (path.endsWith("/plan")) {
    return <BillingSettings orgSlug={orgSlug} view="plan" />;
  }

  if (path.endsWith("/payment")) {
    return <BillingSettings orgSlug={orgSlug} view="payment" />;
  }

  return <BillingSettings orgSlug={orgSlug} />;
}
