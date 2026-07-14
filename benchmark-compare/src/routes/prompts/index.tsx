import { Link, createFileRoute } from "@tanstack/react-router"
import { ArrowRightIcon, ImagesIcon } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { loadPromptCatalog } from "@/lib/prompts"

const featuredPromptSlug = "elysian-taste-challenge"
const promptOnlyPreviewSlugs = new Set([
  "thumbfast-drawing-inspiration-editor",
  "youtube-thumbnail-generator",
])

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
  const featuredPrompt = prompts.find(
    (prompt) => prompt.slug === featuredPromptSlug
  )
  const galleryPrompts = featuredPrompt
    ? [featuredPrompt, ...prompts.filter((prompt) => prompt !== featuredPrompt)]
    : prompts

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
          <ImagesIcon className="size-5 text-primary" />
        </div>
        <h1 className="font-heading text-4xl font-semibold tracking-tight text-balance sm:text-5xl">
          Benchmark prompts
        </h1>
        <p className="mt-4 text-base leading-7 text-muted-foreground sm:text-lg">
          See the challenge before you read it. Each preview comes from a real
          benchmark output, paired with the exact versioned specification used
          to create it.
        </p>
        <div className="mt-6 flex flex-wrap gap-2 text-sm text-muted-foreground">
          <span>{prompts.length} prompt families</span>
          <span aria-hidden="true">·</span>
          <span>{versionCount} immutable versions</span>
        </div>
      </header>

      <section
        className="mt-12 grid gap-4 md:grid-cols-2"
        aria-label="Prompt gallery"
      >
        {galleryPrompts.map((prompt) => {
          const isFeatured = prompt.slug === featuredPromptSlug
          const isPromptOnlyPreview = promptOnlyPreviewSlugs.has(prompt.slug)

          return (
            <Link
              key={prompt.slug}
              to="/prompts/$name/$version"
              params={{
                name: prompt.slug,
                version: prompt.latestVersion,
              }}
              className={`group overflow-hidden rounded-xl border bg-card transition-colors hover:border-primary/50 focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none ${
                isFeatured ? "md:col-span-2" : ""
              }`}
            >
              <div
                className={`relative overflow-hidden border-b bg-muted ${
                  isFeatured ? "aspect-[16/7]" : "aspect-video"
                }`}
              >
                <div
                  aria-hidden="true"
                  className="absolute inset-0 flex items-center justify-center p-6 text-center font-mono text-xs text-muted-foreground"
                >
                  Preview unavailable
                </div>
                <img
                  src={`/prompt-previews/${prompt.slug}.jpg`}
                  alt={`Preview for ${prompt.title}`}
                  width={1280}
                  height={720}
                  className="absolute inset-0 size-full object-cover transition-transform duration-300 ease-out group-hover:scale-[1.015] motion-reduce:transform-none motion-reduce:transition-none"
                />
                <span className="absolute top-3 left-3 border border-white/15 bg-black/80 px-2 py-1 font-mono text-[10px] tracking-wide text-white uppercase">
                  {isPromptOnlyPreview ? "Prompt preview" : "Live output"}
                </span>
              </div>

              <div className="flex items-start justify-between gap-4 p-4 sm:p-5">
                <div className="min-w-0">
                  <h2
                    className={`font-heading font-medium tracking-tight ${
                      isFeatured ? "text-xl sm:text-2xl" : "text-base"
                    }`}
                  >
                    {prompt.title}
                  </h2>
                  <p className="mt-1 truncate font-mono text-xs text-muted-foreground">
                    {prompt.slug}
                  </p>
                  <p className="mt-3 text-xs text-muted-foreground">
                    {prompt.versions.length}{" "}
                    {prompt.versions.length === 1 ? "version" : "versions"}
                  </p>
                </div>

                <div className="flex shrink-0 flex-col items-end gap-4">
                  <Badge variant="secondary">{prompt.latestVersion}</Badge>
                  <span className="inline-flex items-center gap-1.5 text-sm font-medium text-primary">
                    Read prompt
                    <ArrowRightIcon className="size-3.5 transition-transform group-hover:translate-x-0.5" />
                  </span>
                </div>
              </div>
            </Link>
          )
        })}
      </section>
    </main>
  )
}
