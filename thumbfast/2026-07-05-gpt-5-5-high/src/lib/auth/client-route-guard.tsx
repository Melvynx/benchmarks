import { LoadingState } from "@/features/organization/loading-state";
import { OrgShellSkeleton } from "@/features/organization/org-shell";
import { useSession } from "@/lib/auth-client";
import { normalizeAuthCallbackUrl } from "@/lib/auth/auth-utils";
import { Outlet, useLocation } from "@tanstack/react-router";
import {
  useEffect,
  useMemo,
  useRef,
  type PropsWithChildren,
  type ReactNode,
} from "react";

export function ClientSessionGuard({ children }: PropsWithChildren): ReactNode {
  const session = useSession();
  const location = useLocation();
  const hasRedirectedRef = useRef(false);
  const currentCallbackUrl = `${location.pathname}${location.searchStr}`;
  const callbackUrl = useMemo(() => {
    if (location.pathname.startsWith("/auth/")) return "/orgs";
    return normalizeAuthCallbackUrl(currentCallbackUrl);
  }, [currentCallbackUrl, location.pathname]);
  const orgSlug = getOrgSlugFromPathname(location.pathname);

  useEffect(() => {
    if (session.isPending || session.data || hasRedirectedRef.current) return;
    hasRedirectedRef.current = true;
    window.location.replace(
      `/auth/signin?callbackUrl=${encodeURIComponent(callbackUrl)}`,
    );
  }, [callbackUrl, session.data, session.isPending]);

  if (session.isPending) {
    if (orgSlug) {
      return (
        <OrgShellSkeleton orgSlug={orgSlug} pathname={location.pathname} />
      );
    }

    return <LoadingState label="Loading workspace" />;
  }

  if (!session.data) {
    if (orgSlug) {
      return (
        <OrgShellSkeleton orgSlug={orgSlug} pathname={location.pathname} />
      );
    }

    return <LoadingState label="Redirecting to sign in" />;
  }

  return children ?? <Outlet />;
}

function getOrgSlugFromPathname(pathname: string) {
  const [, orgsSegment, orgSlug] = pathname.split("/");

  if (orgsSegment !== "orgs" || !orgSlug) return null;
  return orgSlug;
}
