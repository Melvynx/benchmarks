import { createFileRoute } from "@tanstack/react-router"

import { getRunThumbnail } from "@/lib/runs.server"

export const Route = createFileRoute("/api/run-thumb/$runId/$task")({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const body = getRunThumbnail(params.runId, params.task)
        if (!body) return new Response("Not found", { status: 404 })
        return new Response(body, {
          headers: {
            // A capture rewrites the file in place, so revalidate every load.
            "cache-control": "no-cache",
            "content-type": "image/webp",
          },
        })
      },
    },
  },
})
