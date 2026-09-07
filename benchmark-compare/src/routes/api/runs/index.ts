import { createFileRoute } from "@tanstack/react-router"

import { listRunGroups } from "@/lib/runs.server"

export const Route = createFileRoute("/api/runs/")({
  server: {
    handlers: {
      GET: async () =>
        Response.json(
          { generatedAt: new Date().toISOString(), groups: listRunGroups() },
          { headers: { "cache-control": "no-store" } }
        ),
    },
  },
})
