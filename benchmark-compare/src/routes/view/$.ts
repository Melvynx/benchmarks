import { createFileRoute } from "@tanstack/react-router"

import { getBenchmarkAsset } from "@/lib/benchmarks.server"

export const Route = createFileRoute("/view/$")({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const asset = getBenchmarkAsset(params._splat || "")
        if (!asset) return new Response("Not found", { status: 404 })
        return new Response(asset.body, {
          headers: {
            "cache-control": "no-store, max-age=0",
            "content-type": asset.contentType,
          },
        })
      },
    },
  },
})
