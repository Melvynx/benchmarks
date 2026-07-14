import { Link, createFileRoute, notFound } from "@tanstack/react-router"
import { ArrowLeftIcon, ExternalLinkIcon, FileTextIcon } from "lucide-react"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"

import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { loadPromptVersion } from "@/lib/prompts"

export const Route = createFileRoute("/prompts/$name/$version")({
  loader: async ({ params }) => {
    const prompt = await loadPromptVersion({
      data: { slug: params.name, version: params.version },
    })
    if (!prompt) throw notFound()
    return prompt
  },
  head: ({ loaderData }) => ({
    meta: [
      {
        title: `${loaderData?.title || "Prompt"} ${loaderData?.version || ""}`,
      },
      {
        name: "description",
        content: loaderData
          ? `Canonical ${loaderData.title} benchmark prompt, ${loaderData.version}.`
          : "Canonical benchmark prompt.",
      },
    ],
  }),
  component: PromptPage,
})

function PromptPage() {
  const prompt = Route.useLoaderData()

  return (
    <main className="mx-auto min-h-svh w-full max-w-6xl px-4 py-8 sm:px-6 sm:py-12">
      <nav className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <Link
          to="/prompts"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeftIcon className="size-4" />
          All prompts
        </Link>
        <code className="rounded-md bg-muted px-2 py-1 text-xs text-muted-foreground">
          {prompt.repositoryPath}
        </code>
      </nav>

      <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_18rem]">
        <article className="min-w-0">
          <header className="mb-8 border-b pb-8">
            <div className="flex flex-wrap items-center gap-2">
              <Badge>{prompt.version}</Badge>
              {prompt.version === prompt.latestVersion ? (
                <Badge variant="outline">Latest</Badge>
              ) : null}
            </div>
            <h1 className="mt-4 font-heading text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
              {prompt.title}
            </h1>
            <p className="mt-3 font-mono text-sm text-muted-foreground">
              {prompt.slug}
            </p>
          </header>

          <div className="transcript-markdown prompt-markdown">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {prompt.content}
            </ReactMarkdown>
          </div>
        </article>

        <aside className="space-y-4 lg:sticky lg:top-8">
          <Card>
            <CardContent className="p-4">
              <h2 className="text-sm font-medium">Versions</h2>
              <div className="mt-3 flex flex-wrap gap-2">
                {prompt.versions.map((item) => (
                  <Link
                    key={item.version}
                    to="/prompts/$name/$version"
                    params={{ name: prompt.slug, version: item.version }}
                    className="rounded-md border px-2.5 py-1.5 font-mono text-xs data-[status=active]:border-primary data-[status=active]:text-primary"
                  >
                    {item.version}
                  </Link>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <FileTextIcon className="size-4 text-muted-foreground" />
                <h2 className="text-sm font-medium">Benchmark results</h2>
              </div>
              {prompt.results.length > 0 ? (
                <ul className="mt-3 space-y-2">
                  {prompt.results.map((result) => (
                    <li key={result.id}>
                      <Link
                        to="/"
                        search={{ compare: [result.id] }}
                        className="group/result block rounded-md border p-2.5 hover:border-primary/40"
                      >
                        <span className="block text-sm font-medium">
                          {result.model}
                        </span>
                        <span className="mt-1 flex items-center justify-between gap-2 text-xs text-muted-foreground">
                          {result.date}
                          <ExternalLinkIcon className="size-3 opacity-60" />
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-3 text-sm leading-6 text-muted-foreground">
                  No recorded run is linked to this exact version yet.
                </p>
              )}
            </CardContent>
          </Card>
        </aside>
      </div>
    </main>
  )
}
