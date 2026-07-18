import { ClientSessionGuard } from "@/lib/auth/client-route-guard";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/orgs")({
  ssr: false,
  component: ClientSessionGuard,
});
