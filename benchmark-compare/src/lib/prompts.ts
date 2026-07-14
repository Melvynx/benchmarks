import { createServerFn } from "@tanstack/react-start"

type PromptVersionInput = {
  slug: string
  version: string
}

export const loadPromptCatalog = createServerFn({ method: "GET" }).handler(
  async () => {
    const { getPromptCatalog } = await import("./prompts.server")
    return getPromptCatalog()
  }
)

export const loadPromptVersion = createServerFn({ method: "GET" })
  .validator((input: PromptVersionInput) => input)
  .handler(async ({ data }) => {
    const { getPromptVersion } = await import("./prompts.server")
    return getPromptVersion(data.slug, data.version)
  })
