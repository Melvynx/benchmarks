/* eslint-disable @typescript-eslint/no-explicit-any */
import { google } from "@ai-sdk/google";
import { generateObject } from "ai";
import { actionGeneric, mutationGeneric, queryGeneric } from "convex/server";
import { v } from "convex/values";
import { z } from "zod";
import { getOrgPlanLimits } from "../orgPlanLimits";
import { getDisplayThumbnailUrl } from "../thumbnailUrls";
import {
  MAX_ROWS,
  asCtx,
  requireOrg,
  toStoredImage,
  toStoredImageUrl,
} from "./shared";

const DEFAULT_MAX_PERSONS = 2;
const PAID_MAX_PERSONS = 1000;
const RUNTIME_TEXT_MODEL = "gemini-3.1-flash-lite";
const NOT_PERSON_MARKER = "NOT_PERSON";

const PersonDescriptionSchema = z.object({
  description: z.string().min(3),
});

class NotPersonError extends Error {
  constructor(
    message = "This image doesn't contain a person. Please upload a photo with a clearly visible face.",
  ) {
    super(message);
    this.name = "NotPersonError";
  }
}

function toPersonRow(person: any) {
  return {
    id: String(person._id),
    orgId: person.organizationId,
    name: person.name,
    description: person.description ?? "",
    images: (person.images ?? []).map(toStoredImageUrl).filter(Boolean),
    createdAt: new Date(person.createdAt).toISOString(),
    updatedAt: new Date(person.updatedAt).toISOString(),
  };
}

async function describePersonImages(imageUrls: string[]) {
  if (imageUrls.length === 0) {
    throw new Error("At least one image URL is required");
  }

  const result = await generateObject({
    model: google(RUNTIME_TEXT_MODEL),
    schema: PersonDescriptionSchema,
    messages: [
      {
        role: "user",
        content: [
          ...imageUrls.map((url) => ({
            type: "image" as const,
            image: url,
          })),
          {
            type: "text",
            text: `<task>
Analyze the image and describe the person, OR reject if no person is visible.
</task>

<instructions>
1. First, determine if a real human person or face is clearly visible
2. If YES: Write a short description (max 15 words, under 100 characters)
3. If NO: Return exactly "${NOT_PERSON_MARKER}"
</instructions>

<output_rules>
- If person visible: Include hair color, glasses, facial hair, hat/cap if visible
- If NO person visible: Return exactly "${NOT_PERSON_MARKER}" (objects, landscapes, animals, logos, text = not a person)
</output_rules>`,
          },
        ],
      },
    ],
  });

  const description = result.object.description;
  if (description === NOT_PERSON_MARKER) {
    throw new NotPersonError();
  }

  return description.slice(0, 150);
}

async function getMaxPersons(ctx: { db: any }, organizationId: string) {
  const subscription = await ctx.db
    .query("subscriptions")
    .withIndex("by_organization", (q: any) =>
      q.eq("organizationId", organizationId),
    )
    .first();

  return subscription?.plan && subscription.plan !== "free"
    ? PAID_MAX_PERSONS
    : DEFAULT_MAX_PERSONS;
}

export const listPersons = queryGeneric({
  args: { orgSlug: v.string() },
  handler: async (ctx, args) => {
    const { org } = await requireOrg(asCtx(ctx), args.orgSlug);
    const people = await ctx.db
      .query("people")
      .withIndex("by_organization_created", (q: any) =>
        q.eq("organizationId", org.id),
      )
      .order("desc")
      .take(MAX_ROWS);

    return people.filter((person: any) => !person.deletedAt).map(toPersonRow);
  },
});

export const personDetail = queryGeneric({
  args: { orgSlug: v.string(), personId: v.string() },
  handler: async (ctx, args) => {
    const { org } = await requireOrg(asCtx(ctx), args.orgSlug);
    const personId = ctx.db.normalizeId("people", args.personId);
    const person = personId ? await ctx.db.get(personId) : null;
    if (!person || person.organizationId !== org.id || person.deletedAt) {
      throw new Error("Person not found");
    }

    return toPersonRow(person);
  },
});

export const personThumbnails = queryGeneric({
  args: { orgSlug: v.string(), personId: v.string() },
  handler: async (ctx, args) => {
    const appCtx = asCtx(ctx);
    const { org } = await requireOrg(appCtx, args.orgSlug);
    const limits = await getOrgPlanLimits(appCtx, org.id);
    const personId = ctx.db.normalizeId("people", args.personId);
    const person = personId ? await ctx.db.get(personId) : null;
    if (!person || person.organizationId !== org.id || person.deletedAt) {
      throw new Error("Person not found");
    }

    const generations = await ctx.db
      .query("generations")
      .withIndex("by_organization_created", (q: any) =>
        q.eq("organizationId", org.id),
      )
      .order("desc")
      .take(MAX_ROWS);

    const rows = await Promise.all(
      generations
        .filter(
          (generation: any) =>
            !generation.hiddenAt &&
            (generation.personIds ?? []).includes(args.personId),
        )
        .map(async (generation: any) => {
          const [prompt, thumbnails] = await Promise.all([
            generation.promptId ? ctx.db.get(generation.promptId) : null,
            ctx.db
              .query("thumbnails")
              .withIndex("by_generation", (q: any) =>
                q.eq("generationId", generation._id),
              )
              .order("desc")
              .take(MAX_ROWS),
          ]);

          if (!prompt || prompt.deletedAt || prompt.organizationId !== org.id) {
            return [];
          }

          return thumbnails
            .filter(
              (thumbnail: any) =>
                !thumbnail.hiddenAt &&
                getDisplayThumbnailUrl(thumbnail, {
                  canViewCleanImage: limits.noWatermark,
                }),
            )
            .map((thumbnail: any) => {
              const imageUrl = getDisplayThumbnailUrl(thumbnail, {
                canViewCleanImage: limits.noWatermark,
              });
              return {
                id: String(thumbnail._id),
                promptId: String(prompt._id),
                imageUrl: imageUrl ?? "",
                createdAt: new Date(thumbnail.createdAt).toISOString(),
              };
            });
        }),
    );

    return rows
      .flat()
      .sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      )
      .slice(0, 12);
  },
});

export const createPerson = mutationGeneric({
  args: {
    orgSlug: v.string(),
    name: v.string(),
    description: v.string(),
    images: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    const appCtx = asCtx(ctx);
    const { org } = await requireOrg(appCtx, args.orgSlug);
    const name = args.name.trim();
    const description = args.description.trim();

    if (!name) throw new Error("Name is required");
    if (args.images.length === 0) {
      throw new Error("At least one image is required");
    }
    if (args.images.length > 1) {
      throw new Error(
        "Only one image is allowed per person. Create separate persons for multiple faces.",
      );
    }

    const people = await ctx.db
      .query("people")
      .withIndex("by_organization", (q: any) => q.eq("organizationId", org.id))
      .take(MAX_ROWS);
    const currentCount = people.filter(
      (person: any) => !person.deletedAt,
    ).length;
    const maxPersons = await getMaxPersons(appCtx, org.id);

    if (currentCount >= maxPersons) {
      throw new Error(
        `You have reached your limit of ${maxPersons} persons. Upgrade to create more.`,
      );
    }

    const now = Date.now();
    const personId = await ctx.db.insert("people", {
      organizationId: org.id,
      name,
      description,
      images: args.images.map(toStoredImage),
      createdAt: now,
      updatedAt: now,
    });

    const person = await ctx.db.get(personId);
    return toPersonRow(person);
  },
});

export const updatePerson = mutationGeneric({
  args: {
    orgSlug: v.string(),
    personId: v.string(),
    name: v.string(),
    description: v.string(),
    images: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    const { org } = await requireOrg(asCtx(ctx), args.orgSlug);
    const personId = ctx.db.normalizeId("people", args.personId);
    const person = personId ? await ctx.db.get(personId) : null;
    const name = args.name.trim();
    const description = args.description.trim();

    if (!person || person.organizationId !== org.id || person.deletedAt) {
      throw new Error("Person not found");
    }
    if (!name) throw new Error("Name is required");
    if (args.images.length === 0) {
      throw new Error("At least one image is required");
    }
    if (args.images.length > 1) {
      throw new Error(
        "Only one image is allowed per person. Create separate persons for multiple faces.",
      );
    }

    await ctx.db.patch(person._id, {
      name,
      description,
      images: args.images.map(toStoredImage),
      updatedAt: Date.now(),
    });

    return toPersonRow(await ctx.db.get(person._id));
  },
});

export const deletePerson = mutationGeneric({
  args: { orgSlug: v.string(), personId: v.string() },
  handler: async (ctx, args) => {
    const { org } = await requireOrg(asCtx(ctx), args.orgSlug);
    const personId = ctx.db.normalizeId("people", args.personId);
    const person = personId ? await ctx.db.get(personId) : null;

    if (!person || person.organizationId !== org.id || person.deletedAt) {
      throw new Error("Person not found");
    }

    await ctx.db.patch(person._id, {
      deletedAt: Date.now(),
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});

export const generatePersonImageUploadUrl = mutationGeneric({
  args: { orgSlug: v.string() },
  handler: async (ctx, args) => {
    await requireOrg(asCtx(ctx), args.orgSlug);
    return ctx.storage.generateUploadUrl();
  },
});

export const resolvePersonImageUpload = mutationGeneric({
  args: { orgSlug: v.string(), storageId: v.id("_storage") },
  handler: async (ctx, args) => {
    await requireOrg(asCtx(ctx), args.orgSlug);
    const url = await ctx.storage.getUrl(args.storageId);
    if (!url) throw new Error("Upload failed");
    return url;
  },
});

export const generatePersonDescription = actionGeneric({
  args: { orgSlug: v.string(), images: v.array(v.string()) },
  handler: async (ctx, args) => {
    await requireOrg(asCtx(ctx), args.orgSlug);
    if (args.images.length === 0) {
      throw new Error("At least one image is required");
    }
    if (args.images.length > 2) {
      throw new Error("Maximum 2 images allowed");
    }

    try {
      const description = await describePersonImages(args.images);
      return { description };
    } catch (error) {
      if (error instanceof NotPersonError) {
        throw new Error(error.message);
      }
      throw new Error(
        error instanceof Error
          ? error.message
          : "Failed to generate description",
      );
    }
  },
});
