import { LoadingState } from "@/features/organization/loading-state";
import { getStoredReferralCode } from "@/features/referral/referral-cookie";
import { api } from "@convex/_generated/api";
import { createFileRoute } from "@tanstack/react-router";
import { useConvexAuth, useMutation } from "convex/react";
import { useEffect, useRef } from "react";

export const Route = createFileRoute("/orgs/")({
  component: OrgsRedirectRoute,
});

function OrgsRedirectRoute() {
  const firstOrg = useMutation(api.app.firstOrg);
  const { isAuthenticated, isLoading } = useConvexAuth();
  const hasStartedRef = useRef(false);

  useEffect(() => {
    if (hasStartedRef.current) return;
    if (isLoading) return;

    if (!isAuthenticated) {
      hasStartedRef.current = true;
      window.location.replace(
        `/auth/signin?callbackUrl=${encodeURIComponent("/orgs")}`,
      );
      return;
    }

    hasStartedRef.current = true;

    let isCancelled = false;
    const redirectToFirstOrg = async () => {
      for (let attempt = 0; attempt < 10; attempt += 1) {
        try {
          // eslint-disable-next-line no-await-in-loop
          const data = await firstOrg({
            referralCode: getStoredReferralCode() ?? undefined,
          });
          if (isCancelled) return;

          const orgSlug = data.redirectTo.split("/").filter(Boolean).at(1);
          if (!orgSlug) throw new Error("Invalid organization redirect path");

          window.location.replace(data.redirectTo);
          return;
        } catch {
          // eslint-disable-next-line no-await-in-loop
          await new Promise((resolve) => window.setTimeout(resolve, 500));
        }
      }

      if (!isCancelled) {
        window.location.replace(
          `/auth/signin?callbackUrl=${encodeURIComponent("/orgs")}`,
        );
      }
    };

    void redirectToFirstOrg();

    return () => {
      isCancelled = true;
    };
  }, [firstOrg, isAuthenticated, isLoading]);

  return <LoadingState label="Loading workspace" />;
}
