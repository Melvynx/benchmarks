import { createFileRoute, redirect } from "@tanstack/react-router"

/** The list lives at /runs; the singular is a common typo worth catching. */
export const Route = createFileRoute("/run")({
  beforeLoad: () => {
    throw redirect({ to: "/runs" })
  },
})
