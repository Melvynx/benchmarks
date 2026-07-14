import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/orgs/$orgSlug/users")({
  beforeLoad: ({ params }) => {
    throw redirect({
      to: "/orgs/$orgSlug/settings/members",
      params: { orgSlug: params.orgSlug },
      replace: true,
    });
  },
});
