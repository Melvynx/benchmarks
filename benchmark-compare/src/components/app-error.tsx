import type { ErrorComponentProps } from "@tanstack/react-router"
import {
  ChevronDownIcon,
  HouseIcon,
  RefreshCwIcon,
  TriangleAlertIcon,
} from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"

function errorMessage(error: unknown) {
  if (error instanceof Error && error.message) return error.message
  return "An unexpected error interrupted the comparison."
}

export function AppError({ error, reset }: ErrorComponentProps) {
  const detail = errorMessage(error)
  const connectionError = /failed to fetch|network|load failed/i.test(detail)

  return (
    <main className="grid min-h-svh bg-background px-5 py-10 text-foreground sm:px-8">
      <Card className="m-auto w-full max-w-lg p-0">
        <CardContent className="space-y-6 p-6 sm:p-8">
          <div className="flex items-center justify-between gap-4">
            <div className="grid size-11 place-items-center rounded-lg border border-primary/25 bg-primary/10 text-primary">
              <TriangleAlertIcon className="size-5" />
            </div>
            <Badge variant="outline" className="text-muted-foreground">
              {connectionError ? "Connection interrupted" : "Viewer error"}
            </Badge>
          </div>

          <div className="space-y-3">
            <p className="text-sm font-medium text-primary">
              Benchmark Compare
            </p>
            <h1 className="font-heading text-2xl font-semibold tracking-tight sm:text-3xl">
              We couldn’t load this view.
            </h1>
            <p className="max-w-md text-sm leading-6 text-muted-foreground sm:text-base">
              {connectionError
                ? "The local benchmark server stopped responding. Retry the request, or return to the workbench and choose the results again."
                : "The comparison hit an unexpected problem. Your benchmark files have not been changed."}
            </p>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row">
            <Button className="sm:flex-1" onClick={reset}>
              <RefreshCwIcon data-icon="inline-start" />
              Try again
            </Button>
            <Button variant="outline" className="sm:flex-1" asChild>
              <a href="/">
                <HouseIcon data-icon="inline-start" />
                Back to workbench
              </a>
            </Button>
          </div>

          <details className="group rounded-lg border text-sm">
            <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 font-medium text-muted-foreground select-none">
              Technical details
              <ChevronDownIcon className="size-4 transition-transform group-open:rotate-180" />
            </summary>
            <div className="border-t px-4 py-3">
              <code className="text-xs leading-5 break-words text-muted-foreground">
                {detail}
              </code>
            </div>
          </details>
        </CardContent>
      </Card>
    </main>
  )
}
