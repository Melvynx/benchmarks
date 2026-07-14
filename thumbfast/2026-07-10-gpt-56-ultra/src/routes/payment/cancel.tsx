import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/payment/cancel")({
  beforeLoad: () => {
    throw redirect({ to: "/orgs", replace: true });
  },
});
