import { createServerFn } from "@tanstack/react-start"

export const getBenchmarkCatalog = createServerFn({ method: "GET" }).handler(
  async () => {
    const { getBenchmarkEntries } = await import("./benchmarks.server")
    return getBenchmarkEntries()
  }
)
