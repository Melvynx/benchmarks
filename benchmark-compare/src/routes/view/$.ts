import { createFileRoute } from "@tanstack/react-router"

import { getBenchmarkAsset } from "@/lib/benchmarks.server"

export const Route = createFileRoute("/view/$")({
  server: {
    handlers: {
      GET: async ({ params, request }) => {
        const asset = getBenchmarkAsset(params._splat || "")
        if (!asset) return new Response("Not found", { status: 404 })
        const headers = new Headers({
          "cache-control": "no-store, max-age=0",
          "content-type": asset.contentType,
        })
        if (asset.body instanceof Blob) {
          const size = asset.body.size
          headers.set("accept-ranges", "bytes")
          headers.set("content-length", String(size))
          const range = request.headers.get("range")
          if (range) {
            const match = /^bytes=(\d*)-(\d*)$/.exec(range)
            const start = match?.[1] ? Number(match[1]) : Math.max(0, size - Number(match?.[2]))
            const end = match?.[1] && match[2] ? Math.min(Number(match[2]), size - 1) : size - 1
            if (!match || (!match[1] && !match[2]) || !Number.isSafeInteger(start) || start > end || start >= size) {
              headers.set("content-range", `bytes */${size}`)
              headers.delete("content-length")
              return new Response(null, { status: 416, headers })
            }
            headers.set("content-range", `bytes ${start}-${end}/${size}`)
            headers.set("content-length", String(end - start + 1))
            return new Response(asset.body.slice(start, end + 1), { status: 206, headers })
          }
        }
        return new Response(asset.body, { headers })
      },
    },
  },
})
