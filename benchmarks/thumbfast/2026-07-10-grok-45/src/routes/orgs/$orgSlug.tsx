import { OrgShell } from "@/features/organization/org-shell";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/orgs/$orgSlug")({
  component: OrgShell,
});
