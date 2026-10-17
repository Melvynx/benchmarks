import { createFileRoute } from "@tanstack/react-router"

import { getRunThumbnail } from "@/lib/runs.server"

export const Route = createFileRoute("/api/run-thumb/$runId/$task")({
  server: {
    handlers: {
      GET: async ({ params, request }) => {
        const thumbnail = getRunThumbnail(params.runId, params.task)
        if (!thumbnail) return new Response("Not found", { status: 404 })
        const headers = {
          // A capture rewrites the file in place, so revalidate every load;
          // the size/mtime ETag turns an unchanged image into a 304.
          "cache-control": "no-cache",
          etag: thumbnail.etag,
        }
        if (request.headers.get("if-none-match") === thumbnail.etag) {
          return new Response(null, { status: 304, headers })
        }
        return new Response(thumbnail.read(), {
          headers: { ...headers, "content-type": "image/webp" },
        })
      },
    },
  },
})
