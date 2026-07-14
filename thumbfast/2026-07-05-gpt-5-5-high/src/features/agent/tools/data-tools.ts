import { fetchAuthQueryForRequest } from "@/lib/auth-server";
import { tool } from "ai";
import { makeFunctionReference } from "convex/server";
import { z } from "zod";
import type { ToolContext } from "./types";

type PersonToolItem = {
  id: string;
  name?: string | null;
  description?: string | null;
  imageUrl?: string | null;
};

type UserImageToolItem = {
  id: string;
  name?: string | null;
  description?: string | null;
  imageUrl?: string | null;
};

type PromptToolItem = {
  id: string;
  title?: string | null;
  prompt?: string | null;
  textPrompt?: string | null;
  inspirations?: unknown[];
  persons?: unknown[];
  generations?: {
    id: string;
    model?: string | null;
    thumbnails?: {
      id: string;
      imageUrl?: string | null;
    }[];
  }[];
};

const searchInspirationsRef = makeFunctionReference<
  "query",
  { orgSlug: string; q?: string; limit: number },
  unknown[]
>("inspiration:search");

const listPersonsRef = makeFunctionReference<
  "query",
  { orgSlug: string },
  PersonToolItem[]
>("app:listPersons");

const listUserImagesRef = makeFunctionReference<
  "query",
  { orgSlug: string },
  UserImageToolItem[]
>("app:listUserImages");

const listPromptsRef = makeFunctionReference<
  "query",
  { orgSlug: string },
  { items: PromptToolItem[] }
>("editor:listPrompts");

export function createDataTools(ctx: ToolContext) {
  return {
    search_inspirations: tool({
      description:
        "Search inspiration thumbnails by topic, style, or category. Results are displayed to the user as a visual gallery.",
      inputSchema: z.object({
        query: z.string().optional().describe("Search in name and description"),
        category: z.string().optional().describe("Filter by category"),
        limit: z.number().int().min(1).max(20).default(10),
      }),
      execute: async ({ query, limit }) => {
        const inspirations = await fetchAuthQueryForRequest(
          ctx.request,
          searchInspirationsRef,
          {
            orgSlug: ctx.orgSlug,
            q: query,
            limit,
          },
        );

        return { inspirations };
      },
    }),

    get_persons: tool({
      description:
        "Get persons available for thumbnail generation. Results are displayed to the user as visual cards.",
      inputSchema: z.object({
        limit: z.number().int().min(1).max(10).default(5),
      }),
      execute: async ({ limit }) => {
        const persons = await fetchAuthQueryForRequest(
          ctx.request,
          listPersonsRef,
          { orgSlug: ctx.orgSlug },
        );

        if (persons.length === 0) {
          return {
            persons: [],
            message:
              "No persons found. Ask the user to add a person before generating thumbnails with a consistent face.",
          };
        }

        return { persons: persons.slice(0, limit) };
      },
    }),

    get_user_images: tool({
      description:
        "Search uploaded images such as logos, products, and objects to use in thumbnails.",
      inputSchema: z.object({
        search: z.string().optional().describe("Search by name or description"),
        limit: z.number().int().min(1).max(20).default(10),
      }),
      execute: async ({ search, limit }) => {
        const images = await fetchAuthQueryForRequest(
          ctx.request,
          listUserImagesRef,
          { orgSlug: ctx.orgSlug },
        );
        const normalizedSearch = search?.trim().toLowerCase();
        const filtered = normalizedSearch
          ? images.filter((image) =>
              `${image.name ?? ""} ${image.description ?? ""}`
                .toLowerCase()
                .includes(normalizedSearch),
            )
          : images;

        return { images: filtered.slice(0, limit) };
      },
    }),

    get_prompt_examples: tool({
      description:
        "Get recent prompt examples from this org's past thumbnail generations.",
      inputSchema: z.object({
        limit: z.number().int().min(1).max(20).default(10),
      }),
      execute: async ({ limit }) => {
        const prompts = await fetchAuthQueryForRequest(
          ctx.request,
          listPromptsRef,
          { orgSlug: ctx.orgSlug },
        );

        return {
          examples: prompts.items.slice(0, limit).map((prompt) => ({
            prompt: prompt.textPrompt ?? prompt.prompt ?? prompt.title,
            hadInspirations: (prompt.inspirations ?? []).length > 0,
            hadPerson: (prompt.persons ?? []).length > 0,
            model: prompt.generations?.[0]?.model ?? null,
            thumbnailUrl:
              prompt.generations?.[0]?.thumbnails?.[0]?.imageUrl ?? null,
          })),
        };
      },
    }),

    get_recent_thumbnails: tool({
      description:
        "Get recently generated thumbnails. Results are displayed as a visual gallery.",
      inputSchema: z.object({
        limit: z.number().int().min(1).max(20).default(10),
      }),
      execute: async ({ limit }) => {
        const prompts = await fetchAuthQueryForRequest(
          ctx.request,
          listPromptsRef,
          { orgSlug: ctx.orgSlug },
        );
        const thumbnails = prompts.items
          .flatMap((prompt) =>
            (prompt.generations ?? []).flatMap((generation) =>
              (generation.thumbnails ?? []).map((thumbnail) => ({
                id: thumbnail.id,
                imageUrl: thumbnail.imageUrl,
                promptId: prompt.id,
                generationId: generation.id,
                prompt: prompt.textPrompt ?? prompt.prompt ?? prompt.title,
              })),
            ),
          )
          .filter((thumbnail) => Boolean(thumbnail.imageUrl))
          .slice(0, limit);

        return { thumbnails };
      },
    }),
  };
}
