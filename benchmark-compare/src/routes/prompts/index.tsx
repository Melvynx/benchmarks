import { Link, createFileRoute } from "@tanstack/react-router"
import { ArrowRightIcon, FlaskConicalIcon, Layers3Icon } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { loadPromptCatalog } from "@/lib/prompts"

export const Route = createFileRoute("/prompts/")({
  loader: () => loadPromptCatalog(),
  head: () => ({
    meta: [
      { title: "Benchmark Prompts" },
      {
        name: "description",
        content: "Versioned prompts used by the public model benchmarks.",
      },
    ],
  }),
  component: PromptCatalog,
})

function PromptCatalog() {
  const prompts = Route.useLoaderData()
  const versionCount = prompts.reduce(
    (total, prompt) => total + prompt.versions.length,
    0
  )

  return (
    <main className="mx-auto min-h-svh w-full max-w-6xl px-4 py-8 sm:px-6 sm:py-12">
      <nav className="mb-10 flex items-center justify-between gap-4">
        <Link
          to="/"
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          Benchmark Compare
        </Link>
        <Badge variant="outline">Canonical local catalog</Badge>
      </nav>

      <header className="max-w-3xl">
        <div className="mb-4 flex size-11 items-center justify-center rounded-xl border bg-card">
          <FlaskConicalIcon className="size-5 text-primary" />
        </div>
        <h1 className="font-heading text-4xl font-semibold tracking-tight text-balance sm:text-5xl">
          Benchmark prompts
        </h1>
        <p className="mt-4 text-base leading-7 text-muted-foreground sm:text-lg">
          The exact, versioned task specifications used to compare coding
          models. Every new run snapshots the latest local version.
        </p>
        <div className="mt-6 flex flex-wrap gap-2 text-sm text-muted-foreground">
          <span>{prompts.length} prompt families</span>
          <span aria-hidden="true">·</span>
          <span>{versionCount} immutable versions</span>
        </div>
      </header>

      <section className="mt-12 grid gap-3 md:grid-cols-2" aria-label="Prompts">
        {prompts.map((prompt) => (
          <Card
            key={prompt.slug}
            className="group transition-colors hover:border-primary/40"
          >
            <CardContent className="flex h-full items-start gap-4 p-5">
              <div className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted">
                <Layers3Icon className="size-4 text-muted-foreground" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="font-heading font-medium">{prompt.title}</h2>
                    <p className="mt-1 truncate font-mono text-xs text-muted-foreground">
                      {prompt.slug}
                    </p>
                  </div>
                  <Badge variant="secondary">{prompt.latestVersion}</Badge>
                </div>
                <div className="mt-5 flex items-center justify-between gap-3">
                  <span className="text-xs text-muted-foreground">
                    {prompt.versions.length}{" "}
                    {prompt.versions.length === 1 ? "version" : "versions"}
                  </span>
                  <Link
                    to="/prompts/$name/$version"
                    params={{
                      name: prompt.slug,
                      version: prompt.latestVersion,
                    }}
                    className="inline-flex items-center gap-1.5 text-sm font-medium text-primary"
                  >
                    Read prompt
                    <ArrowRightIcon className="size-3.5 transition-transform group-hover:translate-x-0.5" />
                  </Link>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </section>
    </main>
  )
}
