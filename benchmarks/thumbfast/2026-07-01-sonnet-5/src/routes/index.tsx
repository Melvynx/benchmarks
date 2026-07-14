import { createFileRoute } from "@tanstack/react-router";
import { TanStackHomePage } from "./-home-page";

export const Route = createFileRoute("/")({
  component: TanStackHomePage,
  headers: () => ({
    "Cache-Control":
      "public, max-age=0, s-maxage=86400, stale-while-revalidate=604800",
  }),
});
