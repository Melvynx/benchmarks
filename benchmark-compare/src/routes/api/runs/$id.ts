import { createFileRoute } from "@tanstack/react-router"

import { getRunGroup } from "@/lib/runs.server"

export const Route = createFileRoute("/api/runs/$id")({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const group = getRunGroup(params.id)
        if (!group) return new Response("Not found", { status: 404 })
        return Response.json(group, {
          headers: { "cache-control": "no-store" },
        })
      },
    },
  },
})
