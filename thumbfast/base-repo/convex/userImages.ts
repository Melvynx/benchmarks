/* eslint-disable @typescript-eslint/no-explicit-any */
// Intentional any: this legacy Convex module still uses dynamic component and table APIs that cannot be typed precisely without a larger generated-API migration.
import { components, internal } from "./_generated/api";
import { authComponent } from "./auth/config";
import {
  internalQueryGeneric,
  internalMutationGeneric,
  mutationGeneric,
  queryGeneric,
} from "convex/server";
import { CREDIT_COST_PER_IMAGE_DESCRIPTION, getCreditBalance } from "./credits";
import { getApiKeyModeForPlan } from "./generationConfig";
import { RUNTIME_TEXT_MODEL } from "../src/lib/ai/text-models";
import { v } from "convex/values";

type Ctx = {
  db: any;
  storage: any;
  runQuery: (fn: any, args: any) => Promise<any>;
  runMutation: (fn: any, args: any) => Promise<any>;
};

const MAX_ROWS = 500;
const internalApi = internal as any;
const ACTIVE_SUBSCRIPTION_STATUSES = new Set([
  "active",
  "trialing",
  "past_due",
]);

const asCtx = (ctx: unknown) => ctx as Ctx;

async function requireUser(ctx: Ctx) {
  const user = await authComponent.getAuthUser(ctx as never);
  return { id: String(user._id) };
}

async function requireOrg(ctx: Ctx, orgSlug: string) {
  const user = await requireUser(ctx);
  const org = await ctx.runQuery(
    components.betterAuth.data.getOrganizationBySlug,
    { slug: orgSlug },
  );
  if (!org) throw new Error("Organization not found");

  const member = await ctx.runQuery(
    components.betterAuth.data.getMemberByOrganizationAndUser,
    {
      organizationId: String(org._id),
      userId: user.id,
    },
  );
  if (!member) throw new Error("Organization not found");

  return { id: String(org._id), slug: org.slug, name: org.name };
}

function toUserImageRow(image: any) {
  return {
    id: String(image._id),
    orgId: image.organizationId,
    imageUrl: image.image?.url ?? "",
    name: image.label ?? "Untitled image",
    description: image.description ?? null,
    createdAt: new Date(image.createdAt).toISOString(),
  };
}

async function getActiveSubscription(ctx: Ctx, orgId: string) {
  const subscriptions = await ctx.db
    .query("subscriptions")
    .withIndex("by_organization", (q: any) => q.eq("organizationId", orgId))
    .take(MAX_ROWS);

  return (
    subscriptions.find((subscription: any) =>
      ACTIVE_SUBSCRIPTION_STATUSES.has(subscription.status ?? ""),
    ) ??
    subscriptions.sort((a: any, b: any) => b.createdAt - a.createdAt)[0] ??
    null
  );
}

async function getGeminiProviderKey(ctx: Ctx, orgId: string) {
  return ctx.db
    .query("customProviderApiKeys")
    .withIndex("by_organization_provider", (q: any) =>
      q.eq("organizationId", orgId).eq("provider", "gemini"),
    )
    .first();
}

async function getImageUploadAccess(ctx: Ctx, orgId: string) {
  const subscription = await getActiveSubscription(ctx, orgId);
  const plan = subscription?.plan ?? "free";
  const apiKeyMode = getApiKeyModeForPlan(plan);
  const geminiKey = await getGeminiProviderKey(ctx, orgId);

  if (apiKeyMode === "required") {
    if (!geminiKey) {
      throw new Error(
        "Your plan requires a Gemini API key for image upload. Please add your Gemini API key in Settings > API Keys.",
      );
    }

    return {
      orgId,
      plan,
      shouldDeductCredits: false,
      encryptedGeminiKey: geminiKey.encryptedKey as string,
    };
  }

  const balance = await getCreditBalance(ctx, orgId);
  const currentBalance = balance?.balance ?? 0;
  if (currentBalance + Number.EPSILON >= CREDIT_COST_PER_IMAGE_DESCRIPTION) {
    return {
      orgId,
      plan,
      shouldDeductCredits: true,
      encryptedGeminiKey: undefined,
    };
  }

  if (apiKeyMode === "fallback" && geminiKey) {
    return {
      orgId,
      plan,
      shouldDeductCredits: false,
      encryptedGeminiKey: geminiKey.encryptedKey as string,
    };
  }

  throw new Error(
    apiKeyMode === "fallback"
      ? "Insufficient credits for image upload. Add credits or configure a Gemini API key."
      : "Insufficient credits for image upload",
  );
}

export const generateUploadUrl = mutationGeneric({
  args: { orgSlug: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const appCtx = asCtx(ctx);
    if (args.orgSlug) {
      const org = await requireOrg(appCtx, args.orgSlug);
      await getImageUploadAccess(appCtx, org.id);
      return ctx.storage.generateUploadUrl();
    }
    await requireUser(appCtx);
    return ctx.storage.generateUploadUrl();
  },
});

export const generateAnalyzedUploadUrl = mutationGeneric({
  args: { orgSlug: v.string() },
  handler: async (ctx, args) => {
    const appCtx = asCtx(ctx);
    const org = await requireOrg(appCtx, args.orgSlug);
    await getImageUploadAccess(appCtx, org.id);
    return ctx.storage.generateUploadUrl();
  },
});

export const completeImageUpload = mutationGeneric({
  args: {
    storageId: v.id("_storage"),
  },
  handler: async (ctx, args) => {
    await requireUser(asCtx(ctx));
    const url = await ctx.storage.getUrl(args.storageId);
    if (!url) throw new Error("Uploaded image not found");
    return url;
  },
});

export const list = queryGeneric({
  args: { orgSlug: v.string() },
  handler: async (ctx, args) => {
    const appCtx = asCtx(ctx);
    const org = await requireOrg(appCtx, args.orgSlug);
    const images = await ctx.db
      .query("userImages")
      .withIndex("by_organization_created", (q: any) =>
        q.eq("organizationId", org.id),
      )
      .order("desc")
      .take(MAX_ROWS);

    return images.filter((image: any) => !image.deletedAt).map(toUserImageRow);
  },
});

export const create = mutationGeneric({
  args: {
    orgSlug: v.string(),
    imageUrl: v.string(),
    name: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const org = await requireOrg(asCtx(ctx), args.orgSlug);
    const now = Date.now();
    const label = args.name?.trim() || "Image";
    const id = await ctx.db.insert("userImages", {
      organizationId: org.id,
      image: { url: args.imageUrl },
      label,
      createdAt: now,
      updatedAt: now,
    });

    const image = await ctx.db.get(id);
    return toUserImageRow(image);
  },
});

export const createFromUpload = mutationGeneric({
  args: {
    orgSlug: v.string(),
    storageId: v.id("_storage"),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    contentType: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const org = await requireOrg(asCtx(ctx), args.orgSlug);
    const url = await ctx.storage.getUrl(args.storageId);
    if (!url) throw new Error("Uploaded image not found");

    const now = Date.now();
    const label = args.name?.trim() || "Image";
    const id = await ctx.db.insert("userImages", {
      organizationId: org.id,
      image: {
        url,
        key: String(args.storageId),
        contentType: args.contentType,
      },
      label,
      description: args.description,
      createdAt: now,
      updatedAt: now,
    });

    const image = await ctx.db.get(id);
    return toUserImageRow(image);
  },
});

export const rename = mutationGeneric({
  args: { orgSlug: v.string(), id: v.string(), name: v.string() },
  handler: async (ctx, args) => {
    const org = await requireOrg(asCtx(ctx), args.orgSlug);
    const imageId = ctx.db.normalizeId("userImages", args.id);
    const image = imageId ? await ctx.db.get(imageId) : null;
    if (!image || image.organizationId !== org.id || image.deletedAt) {
      throw new Error("Image not found");
    }
    const checkedImageId = image._id;

    const name = args.name.trim();
    if (!name) throw new Error("Name is required");

    await ctx.db.patch(checkedImageId, {
      label: name,
      updatedAt: Date.now(),
    });
    return { id: String(checkedImageId), name };
  },
});

export const uploadContext = internalQueryGeneric({
  args: { orgSlug: v.string() },
  handler: async (ctx, args) => {
    const appCtx = asCtx(ctx);
    const org = await requireOrg(appCtx, args.orgSlug);
    return getImageUploadAccess(appCtx, org.id);
  },
});

export const logCustomGeminiUsage = internalMutationGeneric({
  args: { orgId: v.string(), model: v.optional(v.string()) },
  handler: async (ctx, args) => {
    await ctx.runMutation(internalApi.billing.recordCustomApiKeyUsage, {
      organizationId: args.orgId,
      provider: "gemini",
      model: args.model ?? RUNTIME_TEXT_MODEL,
    });
    return { success: true };
  },
});

export const remove = mutationGeneric({
  args: { orgSlug: v.string(), id: v.string() },
  handler: async (ctx, args) => {
    const org = await requireOrg(asCtx(ctx), args.orgSlug);
    const imageId = ctx.db.normalizeId("userImages", args.id);
    const image = imageId ? await ctx.db.get(imageId) : null;
    if (!image || image.organizationId !== org.id || image.deletedAt) {
      throw new Error("Image not found");
    }
    const checkedImageId = image._id;

    await ctx.db.patch(checkedImageId, {
      deletedAt: Date.now(),
      updatedAt: Date.now(),
    });
    return { success: true };
  },
});
