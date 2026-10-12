import { useCurrentOrg } from "@/features/organization/current-org-store";
import { useSession } from "@/lib/auth-client";
import { getPublicEnv } from "@/lib/public-env";
import { useLocation } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { TchaoProvider } from "tchao/react";

type UserWithRole = {
  role?: string | null;
};

const TCHAO_WEBSITE_ID = "kd7fy7jtm53h4ybr4rtfdjey4x807f68";

export function TchaoSnippet() {
  const [canLoad, setCanLoad] = useState(false);
  const location = useLocation();
  const websiteId =
    getPublicEnv("VITE_TCHAO_WEBSITE_ID", "NEXT_PUBLIC_TCHAO_WEBSITE_ID") ??
    TCHAO_WEBSITE_ID;

  useEffect(() => {
    if ("requestIdleCallback" in window) {
      const idleId = window.requestIdleCallback(() => setCanLoad(true));
      return () => window.cancelIdleCallback(idleId);
    }

    const timeoutId = globalThis.setTimeout(() => setCanLoad(true), 1500);
    return () => globalThis.clearTimeout(timeoutId);
  }, []);

  if (!canLoad) {
    return null;
  }

  const routeOrgSlug = location.pathname.match(/^\/orgs\/([^/]+)/)?.[1];

  if (!routeOrgSlug) {
    return <TchaoProvider websiteId={websiteId} />;
  }

  return (
    <DeferredAuthenticatedTchaoSnippet
      routeOrgSlug={routeOrgSlug}
      websiteId={websiteId}
    />
  );
}

function DeferredAuthenticatedTchaoSnippet({
  routeOrgSlug,
  websiteId,
}: {
  routeOrgSlug: string;
  websiteId: string;
}) {
  const session = useSession();
  const currentOrg = useCurrentOrg();
  const user = session.data?.user;
  const userRole = (user as UserWithRole | undefined)?.role ?? undefined;
  const isImpersonating = Boolean(session.data?.session.impersonatedBy);
  const currentRouteOrg =
    routeOrgSlug && currentOrg?.slug === routeOrgSlug ? currentOrg : null;
  const visitorMetadata = useMemo(() => {
    if (!currentRouteOrg) return undefined;

    return {
      plan: currentRouteOrg.subscription?.plan ?? "free",
      orgSlug: currentRouteOrg.slug,
      orgName: currentRouteOrg.name,
    };
  }, [currentRouteOrg]);

  if (session.isPending || isImpersonating) {
    return null;
  }

  return (
    <TchaoProvider
      websiteId={websiteId}
      visitorEmail={user?.email}
      visitorName={user?.name}
      visitorId={user?.id}
      visitorRole={userRole}
      visitorMetadata={visitorMetadata}
    />
  );
}
