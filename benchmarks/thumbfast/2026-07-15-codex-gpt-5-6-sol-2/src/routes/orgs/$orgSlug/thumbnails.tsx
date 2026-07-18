import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/orgs/$orgSlug/thumbnails")({
  component: Outlet,
});

