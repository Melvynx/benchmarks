import { LoadingState } from "@/features/organization/loading-state";
import { getCallbackUrl } from "@/lib/auth/auth-utils";
import { createFileRoute } from "@tanstack/react-router";
import { useEffect } from "react";

type AuthNewUserSearch = {
  callbackUrl?: string;
};

export const Route = createFileRoute("/auth/new-user")({
  validateSearch: (search: Record<string, unknown>): AuthNewUserSearch => ({
    callbackUrl:
      typeof search.callbackUrl === "string" ? search.callbackUrl : undefined,
  }),
  component: AuthNewUserRoute,
});

function AuthNewUserRoute() {
  const { callbackUrl } = Route.useSearch();

  useEffect(() => {
    window.location.replace(getCallbackUrl(callbackUrl ?? "/orgs"));
  }, [callbackUrl]);

  return <LoadingState label="Opening workspace" />;
}
