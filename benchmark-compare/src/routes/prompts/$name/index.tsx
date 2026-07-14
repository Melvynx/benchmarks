import { createFileRoute, redirect } from "@tanstack/react-router"

import { loadPromptCatalog } from "@/lib/prompts"

export const Route = createFileRoute("/prompts/$name/")({
  loader: async ({ params }) => {
    const prompt = (await loadPromptCatalog()).find(
      (item) => item.slug === params.name
    )
    if (!prompt) throw redirect({ to: "/prompts" })
    throw redirect({
      to: "/prompts/$name/$version",
      params: { name: prompt.slug, version: prompt.latestVersion },
    })
  },
})
