import { createFileRoute } from "@tanstack/react-router"

import { getBenchmarkEntries } from "@/lib/benchmarks.server"

export const Route = createFileRoute("/api/catalog")({
  server: {
    handlers: {
      GET: async () =>
        Response.json(
          {
            generatedAt: new Date().toISOString(),
            entries: getBenchmarkEntries(),
          },
          { headers: { "cache-control": "no-store" } }
        ),
    },
  },
})
