import { createFileRoute } from "@tanstack/react-router"

import { getBenchmarkEvidence } from "@/lib/benchmarks.server"

export const Route = createFileRoute("/api/evidence/$")({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const evidence = getBenchmarkEvidence(params._splat || "")
        if (!evidence) return new Response("Not found", { status: 404 })
        return Response.json(evidence, {
          headers: { "cache-control": "no-store" },
        })
      },
    },
  },
})
