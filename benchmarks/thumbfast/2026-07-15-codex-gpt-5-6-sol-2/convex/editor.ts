/* eslint-disable @typescript-eslint/no-explicit-any */
// Intentional any: this legacy Convex module still uses dynamic component and table APIs that cannot be typed precisely without a larger generated-API migration.
import { enhancePrompt as enhancePromptWithGemini } from "../src/lib/ai/gemini";
import { components, internal } from "./_generated/api";
import { authComponent } from "./auth/config";
import {
  actionGeneric,
  internalMutationGeneric,
  makeFunctionReference,
  mutationGeneric,
  queryGeneric,
} from "convex/server";
import { v } from "convex/values";
import {
  getApiKeyModeForPlan,
  getConvexDefaultRouteModel,
  getConvexModelCreditCost,
  getConvexModelProvider,
  getConvexModelRoute,
  getConvexOfficialRouteModel,
  resolveConvexImageModel,
  type ConvexImageProvider,
} from "./generationConfig";
import { addCredits, deductCredits, getCreditBalance } from "./credits";
import { getActiveSubscription, getOrgPlanLimits } from "./orgPlanLimits";
import { adjustOrgStats } from "./orgStats";
import {
  getDisplayThumbnailFields,
  getDisplayThumbnailUrl,
  getGenerationSourceThumbnailUrl,
} from "./thumbnailUrls";
import {
  canReadInspiration,
  getInspirationImageUrls,
} from "./lib/inspirationAccess";

type Ctx = {
  db: any;
  scheduler: {
    runAfter: (delayMs: number, fn: any, args: any) => Promise<any>;
  };
  runQuery: (fn: any, args: any) => Promise<any>;
  runMutation: (fn: any, args: any) => Promise<any>;
};
type CustomApiKeyUsageProvider = "openai" | "gemini" | "apiyi";
type CustomApiKeyUsageInput = {
  provider: CustomApiKeyUsageProvider;
  model: string;
  requestCount?: number;
};

const MAX_ROWS = 500;
const AUTO_NAME_TITLE = "Generating title...";
const CREDIT_COST_PER_AUTO_NAME = 0.1;
const RUNTIME_TEXT_MODEL = "gemini-3.1-flash-lite";
const STALE_GENERATION_TIMEOUT_MS = 12 * 60 * 1000;
// Wait before emailing so a logged-in user has time to be notified in-app first.
const GENERATION_NOTIFICATION_EMAIL_DELAY_MS = 60 * 1000;
// Only surface in-app toasts for generations that finished very recently.
const GENERATION_NOTIFICATION_WINDOW_MS = 10 * 60 * 1000;
const autoNamePromptRef = makeFunctionReference<
  "action",
  { orgId: string; promptId: string },
  { skipped: boolean; name?: string }
>("editorNode:autoNamePrompt");
const expireStaleGenerationRef = makeFunctionReference<
  "mutation",
  { orgId: string; generationId: string },
  { skipped: boolean; failedCount?: number }
>("editor:expireStaleGeneration");
const notifyGenerationCompletedRef = makeFunctionReference<
  "action",
  { generationId: string },
  { sent: boolean }
>("notifications:notifyGenerationCompleted");
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
    { organizationId: String(org._id), userId: user.id },
  );
  if (!member) throw new Error("Organization not found");

  return {
    user,
    member,
    org: {
      id: String(org._id),
      name: org.name,
      slug: org.slug,
      logo: org.logo ?? null,
      subscription: null,
    },
  };
}

function toStoredImageUrl(value: any) {
  if (!value) return null;
  if (typeof value === "string") return value;
  return value.url ?? null;
}

function toUserImageRow(image: any) {
  return {
    id: String(image._id),
    orgId: image.organizationId,
    imageUrl: toStoredImageUrl(image.image) ?? "",
    name: image.label ?? "Untitled image",
    description: image.description ?? null,
    createdAt: new Date(image.createdAt).toISOString(),
  };
}

function getInspirationGenerationDescription(inspiration: any) {
  const parts = [inspiration.description].filter(Boolean);
  const anonymizedInstructions: string[] = [];

  if (inspiration.drawingDocument) {
    parts.push(
      [
        "DRAWING INSPIRATION RULES:",
        "This preview is a user-created composition sketch, not a finished thumbnail to copy literally.",
        "Use it as loose guidance for hierarchy, placement, arrows, callouts, and emphasis.",
        "Transform it into a polished, realistic YouTube thumbnail.",
        "Replace person placeholders with a real subject, rewrite rough text, improve proportions, and freely redesign drawn shapes or inserted images when that makes the result stronger.",
      ].join(" "),
    );
  }

  if (inspiration.anonymizedText) {
    anonymizedInstructions.push(
      [
        "TEXT PLACEHOLDER RULES:",
        "This inspiration contains anonymized text markers such as LOREM 1, IPSUM 2, DOLOR 3, or SIT AMET 4.",
        "Those markers are editable placeholders, not final copy.",
        "If the user prompt targets a numbered lorem or text marker, replace that specific marker with the user requested text.",
        "Never output lorem ipsum words or their marker numbers unless the user explicitly asks for those exact words.",
        "If the user does not provide replacement text for a marker, remove the marker text and number from the final image.",
      ].join(" "),
    );
  }

  if (inspiration.anonymizedLogos) {
    anonymizedInstructions.push(
      [
        "LOGO PLACEHOLDER RULES:",
        "This inspiration contains anonymized logo placeholders marked with visible numbers such as 1, 2, 3.",
        "Each numbered square or rounded-square is a temporary logo placeholder, including its background shape, number, card, plaque, and texture.",
        "If the user prompt targets logo 1, logo 2, logo 3, or another numbered logo marker, replace the entire placeholder with the requested logo or referenced image.",
        "Do not keep the placeholder square behind the new logo unless the user explicitly asks for a background tile.",
        "If the user asks to write names above logos, write only the requested names and never include the placeholder numbers.",
        "If the user does not specify a replacement for a numbered logo marker, do not invent a new brand logo. Remove the number and keep the composition clean with an unbranded mark or no logo slot.",
        "Never output placeholder numbers on or near logos in the final image.",
      ].join(" "),
    );
  }

  if (inspiration.anonymizedSubject || inspiration.hasPlaceholder) {
    anonymizedInstructions.push(
      [
        "SUBJECT PLACEHOLDER RULES:",
        "Any grey mannequin or wireframe person in this inspiration is a placeholder for a real person.",
        "Replace it with the selected person reference or a photorealistic person and never keep mannequin texture, blank faces, or grid lines.",
      ].join(" "),
    );
  }

  if (anonymizedInstructions.length > 0) {
    parts.push(anonymizedInstructions.join(" "));
  }

  return parts.join("\n");
}

function promptTitleNeedsAi(title: string | null | undefined, prompt: string) {
  void prompt;
  return title?.trim() === AUTO_NAME_TITLE;
}

async function getCustomProviderKey(
  ctx: Ctx,
  orgId: string,
  provider: ConvexImageProvider,
) {
  return ctx.db
    .query("customProviderApiKeys")
    .withIndex("by_organization_provider", (q: any) =>
      q.eq("organizationId", orgId).eq("provider", provider),
    )
    .first();
}

async function getWatermarkEnabled(ctx: Ctx) {
  const flag = await ctx.db
    .query("featureFlags")
    .withIndex("by_key", (q: any) => q.eq("key", "watermark"))
    .first();
  return flag?.enabled ?? true;
}

async function getGenerationRoutingSettings(ctx: Ctx) {
  const settings = await ctx.db
    .query("generationRoutingSettings")
    .withIndex("by_key", (q: any) => q.eq("key", "default"))
    .first();
  return {
    forceOfficialFirst: Boolean(settings?.forceOfficialFirst),
  };
}

async function recordCustomApiKeyUsage(
  ctx: Ctx,
  orgId: string,
  usage: CustomApiKeyUsageInput,
) {
  return ctx.runMutation((internal as any).billing.recordCustomApiKeyUsage, {
    organizationId: orgId,
    provider: usage.provider,
    model: usage.model,
    requestCount: usage.requestCount,
  });
}

async function recordCustomApiKeyUsages(
  ctx: Ctx,
  orgId: string,
  usages: CustomApiKeyUsageInput[],
) {
  const usageByProviderAndModel = new Map<string, CustomApiKeyUsageInput>();
  for (const usage of usages) {
    const key = `${usage.provider}:${usage.model}`;
    const existing = usageByProviderAndModel.get(key);
    if (existing) {
      existing.requestCount =
        (existing.requestCount ?? 1) + (usage.requestCount ?? 1);
      continue;
    }
    usageByProviderAndModel.set(key, {
      ...usage,
      requestCount: usage.requestCount ?? 1,
    });
  }

  const usageWrites = Array.from(
    usageByProviderAndModel.values(),
    async (usage) => {
      await recordCustomApiKeyUsage(ctx, orgId, usage);
    },
  );
  await Promise.all(usageWrites);
}

async function getGenerationAccess(
  ctx: Ctx,
  orgId: string,
  model: string,
  count: number,
  routingForceOfficialFirst: boolean,
) {
  const subscription = await getActiveSubscription(ctx, orgId);
  const plan = subscription?.plan ?? "free";
  const limits = await getOrgPlanLimits(ctx, orgId);
  const resolvedModel = resolveConvexImageModel(model);
  const routingDefaultModel = getConvexDefaultRouteModel(
    resolvedModel,
    routingForceOfficialFirst,
  );
  const route = getConvexModelRoute(resolvedModel, routingForceOfficialFirst);
  const defaultProvider = getConvexModelProvider(routingDefaultModel);
  const officialRouteModel = getConvexOfficialRouteModel(resolvedModel);
  const officialRouteProvider = route
    .map((routeModel) => getConvexModelProvider(routeModel))
    .find((routeProvider) => routeProvider !== "apiyi");
  const customKeyProvider =
    defaultProvider === "apiyi" ? officialRouteProvider : defaultProvider;
  const apiKeyMode = getApiKeyModeForPlan(plan);
  const [providerKey, apiyiKey] = await Promise.all([
    customKeyProvider && apiKeyMode !== "disabled"
      ? getCustomProviderKey(ctx, orgId, customKeyProvider)
      : Promise.resolve(null),
    apiKeyMode !== "disabled" &&
    route.some((routeModel) => getConvexModelProvider(routeModel) === "apiyi")
      ? getCustomProviderKey(ctx, orgId, "apiyi")
      : Promise.resolve(null),
  ]);
  const creditCost = getConvexModelCreditCost(routingDefaultModel) * count;
  const balance = await getCreditBalance(ctx, orgId);
  const currentBalance = balance?.balance ?? 0;

  if (count > limits.maxGenerations) {
    throw new Error(
      `Your plan allows up to ${limits.maxGenerations} thumbnails at once`,
    );
  }

  if (
    route.some(
      (routeModel) => getConvexModelProvider(routeModel) === "openai",
    ) &&
    !limits.gptImageAccess
  ) {
    throw new Error("GPT Image models require a Pro plan or higher");
  }

  if (defaultProvider === "apiyi") {
    if (apiKeyMode === "required") {
      if (apiyiKey) {
        return {
          resolvedModel,
          requestedModel: resolvedModel,
          routingDefaultModel,
          routingForceOfficialFirst,
          useCustomApiKey: true,
          chargedCreditCost: 0,
          applyWatermark: false,
        };
      }

      if (!providerKey && officialRouteProvider) {
        throw new Error(
          officialRouteProvider === "openai"
            ? "GPT Image models require an OpenAI API key"
            : "Gemini models require a Gemini API key",
        );
      }
      return {
        resolvedModel: officialRouteModel,
        requestedModel: resolvedModel,
        routingDefaultModel: officialRouteModel,
        routingForceOfficialFirst,
        useCustomApiKey: true,
        chargedCreditCost: 0,
        applyWatermark: false,
      };
    }

    if (currentBalance + Number.EPSILON >= creditCost) {
      return {
        resolvedModel,
        requestedModel: resolvedModel,
        routingDefaultModel,
        routingForceOfficialFirst,
        useCustomApiKey: false,
        chargedCreditCost: creditCost,
        applyWatermark: (await getWatermarkEnabled(ctx)) && !limits.noWatermark,
      };
    }

    if (apiKeyMode === "fallback" && apiyiKey) {
      return {
        resolvedModel,
        requestedModel: resolvedModel,
        routingDefaultModel,
        routingForceOfficialFirst,
        useCustomApiKey: true,
        chargedCreditCost: 0,
        applyWatermark: false,
      };
    }

    if (apiKeyMode === "fallback" && providerKey) {
      return {
        resolvedModel: officialRouteModel,
        requestedModel: resolvedModel,
        routingDefaultModel: officialRouteModel,
        routingForceOfficialFirst,
        useCustomApiKey: true,
        chargedCreditCost: 0,
        applyWatermark: false,
      };
    }

    throw new Error(
      apiKeyMode === "fallback"
        ? "Insufficient credits. Add credits or configure a matching custom API key."
        : "Insufficient credits. Please upgrade or purchase more credits.",
    );
  }

  if (apiKeyMode === "required") {
    if (!providerKey && !apiyiKey) {
      throw new Error(
        defaultProvider === "openai"
          ? "GPT Image models require an OpenAI API key"
          : "Gemini models require a Gemini API key",
      );
    }

    if (apiyiKey) {
      return {
        resolvedModel,
        requestedModel: resolvedModel,
        routingDefaultModel,
        routingForceOfficialFirst,
        useCustomApiKey: true,
        chargedCreditCost: 0,
        applyWatermark: false,
      };
    }

    return {
      resolvedModel: officialRouteModel,
      requestedModel: resolvedModel,
      routingDefaultModel: officialRouteModel,
      routingForceOfficialFirst,
      useCustomApiKey: true,
      chargedCreditCost: 0,
      applyWatermark: false,
    };
  }

  if (currentBalance + Number.EPSILON >= creditCost) {
    return {
      resolvedModel,
      requestedModel: resolvedModel,
      routingDefaultModel,
      routingForceOfficialFirst,
      useCustomApiKey: false,
      chargedCreditCost: creditCost,
      applyWatermark: (await getWatermarkEnabled(ctx)) && !limits.noWatermark,
    };
  }

  if (apiKeyMode === "fallback" && apiyiKey) {
    return {
      resolvedModel,
      requestedModel: resolvedModel,
      routingDefaultModel,
      routingForceOfficialFirst,
      useCustomApiKey: true,
      chargedCreditCost: 0,
      applyWatermark: false,
    };
  }

  if (apiKeyMode === "fallback" && providerKey) {
    return {
      resolvedModel: officialRouteModel,
      requestedModel: resolvedModel,
      routingDefaultModel: officialRouteModel,
      routingForceOfficialFirst,
      useCustomApiKey: true,
      chargedCreditCost: 0,
      applyWatermark: false,
    };
  }

  throw new Error(
    apiKeyMode === "fallback"
      ? "Insufficient credits. Add credits or configure a matching custom API key."
      : "Insufficient credits. Please upgrade or purchase more credits.",
  );
}

function toThumbnailRow(thumbnail: any, noWatermark: boolean) {
  return {
    id: String(thumbnail._id),
    generationId: thumbnail.generationId ? String(thumbnail.generationId) : "",
    ...getDisplayThumbnailFields(thumbnail, {
      canViewCleanImage: noWatermark,
    }),
    status: thumbnail.status,
    error: thumbnail.errorMessage ?? null,
    model: thumbnail.model ?? null,
    generationTimeMs: thumbnail.generationTimeMs ?? null,
    isStarred: Boolean(thumbnail.starredAt),
    claimedAt: thumbnail.claimedAt
      ? new Date(thumbnail.claimedAt).toISOString()
      : null,
    createdAt: new Date(thumbnail.createdAt).toISOString(),
  };
}

async function getPromptOrThrow(ctx: Ctx, orgId: string, promptId: string) {
  const id = ctx.db.normalizeId("prompts", promptId);
  const prompt = id ? await ctx.db.get(id) : null;
  if (!prompt || prompt.organizationId !== orgId || prompt.deletedAt) {
    throw new Error("Prompt not found");
  }
  return prompt;
}

async function resolveGenerationReferences(
  ctx: Ctx,
  orgId: string,
  args: {
    personIds?: string[];
    inspirationIds?: string[];
    userImageIds?: string[];
  },
) {
  const [people, inspirations, userImages] = await Promise.all([
    Promise.all(
      (args.personIds ?? []).map(async (id) => {
        const docId = ctx.db.normalizeId("people", id);
        const person = docId ? await ctx.db.get(docId) : null;
        return person && person.organizationId === orgId && !person.deletedAt
          ? person
          : null;
      }),
    ),
    Promise.all(
      (args.inspirationIds ?? []).map(async (id) => {
        const docId = ctx.db.normalizeId("inspirations", id);
        const inspiration = docId ? await ctx.db.get(docId) : null;
        return inspiration && canReadInspiration(inspiration, orgId)
          ? inspiration
          : null;
      }),
    ),
    Promise.all(
      (args.userImageIds ?? []).map(async (id) => {
        const docId = ctx.db.normalizeId("userImages", id);
        const image = docId ? await ctx.db.get(docId) : null;
        return image && image.organizationId === orgId && !image.deletedAt
          ? image
          : null;
      }),
    ),
  ]);

  return {
    personImageUrls: people
      .filter(Boolean)
      .flatMap((person: any) => person.images ?? [])
      .map(toStoredImageUrl)
      .filter(Boolean),
    inspirationUrls: inspirations
      .filter(Boolean)
      .flatMap((inspiration: any) => getInspirationImageUrls(inspiration)),
    userImages: userImages.filter(Boolean).map(toUserImageRow),
  };
}

async function generationsForPrompt(
  ctx: Ctx,
  promptId: string,
  noWatermark: boolean,
) {
  const id = ctx.db.normalizeId("prompts", promptId);
  if (!id) return [];

  const generations = await ctx.db
    .query("generations")
    .withIndex("by_prompt", (q: any) => q.eq("promptId", id))
    .order("desc")
    .take(MAX_ROWS);

  const visibleGenerations = generations.filter(
    (generation: any) => !generation.hiddenAt,
  );

  return Promise.all(
    visibleGenerations.map(async (generation: any, index: number) => {
      const thumbnails = await ctx.db
        .query("thumbnails")
        .withIndex("by_generation", (q: any) =>
          q.eq("generationId", generation._id),
        )
        .order("desc")
        .take(MAX_ROWS);
      const visibleThumbnails = thumbnails.filter(
        (thumbnail: any) => !thumbnail.hiddenAt,
      );
      // Skip person/inspiration lookups when the generation already carries
      // denormalized URLs (the `??` fallbacks below never read them then).
      const references = await resolveGenerationReferences(
        ctx,
        generation.organizationId,
        {
          personIds: generation.personImageUrls
            ? []
            : (generation.personIds ?? []),
          inspirationIds: generation.inspirationUrls
            ? []
            : (generation.inspirationIds ?? []),
          userImageIds: generation.userImageIds ?? [],
        },
      );

      let baseImageUrl = generation.baseImageUrl ?? null;
      if (generation.baseThumbnailId) {
        const baseThumbnailId = ctx.db.normalizeId(
          "thumbnails",
          generation.baseThumbnailId,
        );
        const baseThumbnail = baseThumbnailId
          ? await ctx.db.get(baseThumbnailId)
          : null;
        if (baseThumbnail?.organizationId === generation.organizationId) {
          baseImageUrl = getDisplayThumbnailUrl(baseThumbnail, {
            canViewCleanImage: noWatermark,
          });
        }
      }

      return {
        id: String(generation._id),
        promptId: generation.promptId ? String(generation.promptId) : promptId,
        generationNumber: visibleGenerations.length - index,
        pendingCount: visibleThumbnails.filter((thumbnail: any) =>
          ["pending", "processing"].includes(thumbnail.status),
        ).length,
        textPrompt: generation.prompt,
        personIds: generation.personIds ?? [],
        inspirationIds: generation.inspirationIds ?? [],
        userImageIds: generation.userImageIds ?? [],
        userImages: references.userImages,
        personImageUrls:
          generation.personImageUrls ?? references.personImageUrls,
        inspirationUrls:
          generation.inspirationUrls ?? references.inspirationUrls,
        baseImageUrl,
        baseThumbnailId: generation.baseThumbnailId
          ? String(generation.baseThumbnailId)
          : null,
        editPrompt: generation.editPrompt ?? null,
        model: generation.model,
        aspectRatio: generation.aspectRatio ?? "16:9",
        createdAt: new Date(generation.createdAt).toISOString(),
        thumbnails: visibleThumbnails.map((thumbnail: any) =>
          toThumbnailRow(thumbnail, noWatermark),
        ),
      };
    }),
  );
}

async function toPromptRow(ctx: Ctx, prompt: any, noWatermark: boolean) {
  const generations = await generationsForPrompt(
    ctx,
    String(prompt._id),
    noWatermark,
  );
  return {
    id: String(prompt._id),
    orgId: prompt.organizationId,
    name: prompt.title,
    textPrompt: prompt.prompt,
    personIds: prompt.personIds ?? [],
    inspirationIds: prompt.inspirationIds ?? [],
    userImageIds: prompt.userImageIds ?? [],
    userImages: (
      await resolveGenerationReferences(ctx, prompt.organizationId, {
        userImageIds: prompt.userImageIds ?? [],
      })
    ).userImages,
    createdAt: new Date(prompt.createdAt).toISOString(),
    generations,
    _count: { generations: generations.length },
  };
}

export const listPrompts = queryGeneric({
  args: {
    orgSlug: v.string(),
    search: v.optional(v.string()),
    cursor: v.optional(v.string()),
    limit: v.optional(v.number()),
    refreshNonce: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const appCtx = asCtx(ctx);
    const { org } = await requireOrg(appCtx, args.orgSlug);
    const limit = Math.min(Math.max(args.limit ?? 20, 1), 100);
    const cursorCreatedAt = args.cursor ? Number(args.cursor) : null;
    const search = args.search?.trim().toLowerCase();
    const batchSize = Math.min(limit * 3, 100);
    let nextCreatedAt = Number.isFinite(cursorCreatedAt)
      ? cursorCreatedAt
      : null;
    let hasMoreRows = false;
    const maxBatches = Math.ceil(MAX_ROWS / batchSize);
    const rows: any[] = [];

    const loadPromptRows = async (remainingBatches: number): Promise<void> => {
      if (remainingBatches <= 0 || rows.length >= limit + 1) return;

      const prompts = await ctx.db
        .query("prompts")
        .withIndex("by_organization_created", (q: any) => {
          const organizationQuery = q.eq("organizationId", org.id);
          return nextCreatedAt == null
            ? organizationQuery
            : organizationQuery.lt("createdAt", nextCreatedAt);
        })
        .order("desc")
        .take(batchSize);

      hasMoreRows = prompts.length === batchSize;
      if (prompts.length === 0) return;

      nextCreatedAt = prompts[prompts.length - 1]?.createdAt ?? null;

      rows.push(
        ...prompts.filter((prompt: any) => {
          if (prompt.deletedAt) return false;
          if (!search) return true;
          return `${prompt.title ?? ""} ${prompt.prompt ?? ""}`
            .toLowerCase()
            .includes(search);
        }),
      );

      await loadPromptRows(remainingBatches - 1);
    };

    await loadPromptRows(maxBatches);

    const pageRows = rows.slice(0, limit);
    const limits = await getOrgPlanLimits(appCtx, org.id);
    const noWatermark = Boolean(limits.noWatermark);
    const items = await Promise.all(
      pageRows.map(async (prompt: any) =>
        toPromptRow(appCtx, prompt, noWatermark),
      ),
    );
    const hasNextPage = rows.length > limit || hasMoreRows;
    const cursorRow = pageRows[pageRows.length - 1] as
      | { createdAt: number }
      | undefined;
    const nextCursor = hasNextPage ? cursorRow?.createdAt : undefined;

    return {
      items,
      nextCursor: nextCursor === undefined ? undefined : String(nextCursor),
    };
  },
});

export const getPrompt = queryGeneric({
  args: { orgSlug: v.string(), promptId: v.string() },
  handler: async (ctx, args) => {
    const appCtx = asCtx(ctx);
    const { org } = await requireOrg(appCtx, args.orgSlug);
    const prompt = await getPromptOrThrow(appCtx, org.id, args.promptId);
    const limits = await getOrgPlanLimits(appCtx, org.id);
    return toPromptRow(appCtx, prompt, Boolean(limits.noWatermark));
  },
});

export const recentGenerationNotifications = queryGeneric({
  args: { orgSlug: v.string() },
  handler: async (ctx, args) => {
    const appCtx = asCtx(ctx);
    const { org, user } = await requireOrg(appCtx, args.orgSlug);
    const cutoff = Date.now() - GENERATION_NOTIFICATION_WINDOW_MS;
    // Only generations completed after `cutoff` qualify (filtered below).
    // A generation completes within STALE_GENERATION_TIMEOUT_MS of creation,
    // so bounding the index range on _creationTime with a wide margin reads
    // only the handful of recent rows instead of the last 50 every poll.
    const creationCutoff =
      cutoff - STALE_GENERATION_TIMEOUT_MS - 30 * 60 * 1000;

    const generations = await ctx.db
      .query("generations")
      .withIndex("by_organization_status", (q: any) =>
        q
          .eq("organizationId", org.id)
          .eq("status", "succeeded")
          .gte("_creationTime", creationCutoff),
      )
      .order("desc")
      .take(50);

    const pendingCandidates = generations.filter(
      (generation: any) =>
        !generation.hiddenAt &&
        !generation.notifiedAt &&
        generation.createdByUserId === user.id &&
        (generation.completedAt ?? 0) > cutoff,
    );

    if (pendingCandidates.length === 0) return [];

    const acknowledged = await Promise.all(
      pendingCandidates.map(async (generation: any) => {
        const acknowledgement = await ctx.db
          .query("generationNotificationAcknowledgements")
          .withIndex("by_generation_user", (q: any) =>
            q.eq("generationId", generation._id).eq("userId", user.id),
          )
          .first();
        return acknowledgement;
      }),
    );
    const pending = pendingCandidates.filter(
      (_generation: any, index: number) => !acknowledged[index],
    );

    if (pending.length === 0) return [];

    const limits = await getOrgPlanLimits(appCtx, org.id);
    const noWatermark = Boolean(limits.noWatermark);

    const items = await Promise.all(
      pending.map(async (generation: any) => {
        const thumbnails = await ctx.db
          .query("thumbnails")
          .withIndex("by_generation", (q: any) =>
            q.eq("generationId", generation._id),
          )
          .take(MAX_ROWS);
        const succeeded = thumbnails.find(
          (thumbnail: any) =>
            thumbnail.status === "succeeded" && !thumbnail.hiddenAt,
        );
        return {
          id: String(generation._id),
          promptId: generation.promptId ? String(generation.promptId) : null,
          promptText: generation.prompt as string,
          imageUrl: getDisplayThumbnailUrl(succeeded, {
            canViewCleanImage: noWatermark,
          }),
          completedAt: generation.completedAt ?? null,
        };
      }),
    );

    return items.filter((item) => Boolean(item.imageUrl));
  },
});

export const markGenerationNotified = mutationGeneric({
  args: { orgSlug: v.string(), generationId: v.string() },
  handler: async (ctx, args) => {
    const { org, user } = await requireOrg(asCtx(ctx), args.orgSlug);
    const generationId = ctx.db.normalizeId("generations", args.generationId);
    const generation = generationId ? await ctx.db.get(generationId) : null;
    if (
      !generation ||
      generation.organizationId !== org.id ||
      generation.createdByUserId !== user.id
    ) {
      return { ok: false };
    }
    const now = Date.now();
    await ctx.db.insert("generationNotificationAcknowledgements", {
      organizationId: org.id,
      generationId: generation._id,
      userId: user.id,
      createdAt: now,
      updatedAt: now,
    });
    return { ok: true };
  },
});

export const createPrompt = mutationGeneric({
  args: {
    orgSlug: v.string(),
    textPrompt: v.string(),
    personIds: v.optional(v.array(v.string())),
    inspirationIds: v.optional(v.array(v.string())),
    userImageIds: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const { org } = await requireOrg(asCtx(ctx), args.orgSlug);
    const now = Date.now();
    const promptId = await ctx.db.insert("prompts", {
      organizationId: org.id,
      title: AUTO_NAME_TITLE,
      prompt: args.textPrompt,
      personIds: args.personIds ?? [],
      inspirationIds: args.inspirationIds ?? [],
      userImageIds: args.userImageIds ?? [],
      createdAt: now,
      updatedAt: now,
    });
    await adjustOrgStats(asCtx(ctx), org.id, { prompts: 1 });
    await asCtx(ctx).scheduler.runAfter(0, autoNamePromptRef, {
      orgId: org.id,
      promptId: String(promptId),
    });
    return { id: String(promptId), promptId: String(promptId) };
  },
});

export const createThumbnailGeneration = mutationGeneric({
  args: {
    orgSlug: v.string(),
    promptId: v.optional(v.string()),
    prompt: v.string(),
    model: v.string(),
    aspectRatio: v.string(),
    count: v.optional(v.number()),
    personIds: v.optional(v.array(v.string())),
    inspirationIds: v.optional(v.array(v.string())),
    userImageIds: v.optional(v.array(v.string())),
    baseImageUrl: v.optional(v.string()),
    baseThumbnailId: v.optional(v.string()),
    editPrompt: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const appCtx = asCtx(ctx);
    const { org, user } = await requireOrg(appCtx, args.orgSlug);
    const now = Date.now();
    const count = Math.min(Math.max(Math.floor(args.count ?? 1), 1), 4);
    const routingSettings = await getGenerationRoutingSettings(appCtx);
    const access = await getGenerationAccess(
      appCtx,
      org.id,
      args.model,
      count,
      routingSettings.forceOfficialFirst,
    );
    const existingPrompt = args.promptId
      ? await getPromptOrThrow(appCtx, org.id, args.promptId)
      : null;
    let resolvedBaseImageUrl = args.baseImageUrl;
    if (args.baseThumbnailId) {
      const thumbnailId = ctx.db.normalizeId(
        "thumbnails",
        args.baseThumbnailId,
      );
      const thumbnail = thumbnailId ? await ctx.db.get(thumbnailId) : null;
      if (!thumbnail || thumbnail.organizationId !== org.id) {
        throw new Error("Source thumbnail not found");
      }
      resolvedBaseImageUrl =
        getGenerationSourceThumbnailUrl(thumbnail) ?? resolvedBaseImageUrl;
    }

    const references = await resolveGenerationReferences(appCtx, org.id, args);
    let shouldAutoNamePrompt = false;
    const promptId =
      existingPrompt?._id ??
      (await ctx.db.insert("prompts", {
        organizationId: org.id,
        title: AUTO_NAME_TITLE,
        prompt: args.prompt,
        model: access.resolvedModel,
        personIds: args.personIds ?? [],
        inspirationIds: args.inspirationIds ?? [],
        userImageIds: args.userImageIds ?? [],
        createdAt: now,
        updatedAt: now,
      }));
    shouldAutoNamePrompt = !existingPrompt;

    const generationId = await ctx.db.insert("generations", {
      organizationId: org.id,
      promptId,
      prompt: args.prompt,
      model: access.resolvedModel,
      requestedModel: access.requestedModel,
      routingDefaultModel: access.routingDefaultModel,
      routingForceOfficialFirst: access.routingForceOfficialFirst,
      status: "processing",
      aspectRatio: args.aspectRatio,
      personIds: args.personIds ?? [],
      inspirationIds: args.inspirationIds ?? [],
      userImageIds: args.userImageIds ?? [],
      personImageUrls: references.personImageUrls,
      inspirationUrls: references.inspirationUrls,
      baseImageUrl: resolvedBaseImageUrl,
      baseThumbnailId: args.baseThumbnailId,
      editPrompt: args.editPrompt,
      useCustomApiKey: access.useCustomApiKey,
      chargedCreditCost: access.chargedCreditCost,
      applyWatermark: access.applyWatermark,
      createdByUserId: user.id,
      createdAt: now,
      updatedAt: now,
    });

    await deductCredits(
      appCtx,
      org.id,
      access.chargedCreditCost,
      "generation",
      "thumbnail generation",
      String(generationId),
    );

    const thumbnailIds = await Promise.all(
      Array.from({ length: count }, async () =>
        ctx.db.insert("thumbnails", {
          organizationId: org.id,
          generationId,
          status: "pending",
          model: access.resolvedModel,
          requestedModel: access.requestedModel,
          routingDefaultModel: access.routingDefaultModel,
          createdAt: now,
          updatedAt: now,
        }),
      ),
    );
    await adjustOrgStats(appCtx, org.id, {
      prompts: existingPrompt ? 0 : 1,
      generations: 1,
      thumbnails: count,
    });

    await Promise.all(
      thumbnailIds.map(async (thumbnailId: any) =>
        appCtx.scheduler.runAfter(
          0,
          (internal as any).editorNode.runThumbnailGeneration,
          {
            orgId: org.id,
            generationId: String(generationId),
            thumbnailId: String(thumbnailId),
          },
        ),
      ),
    );
    await appCtx.scheduler.runAfter(
      STALE_GENERATION_TIMEOUT_MS,
      expireStaleGenerationRef,
      {
        orgId: org.id,
        generationId: String(generationId),
      },
    );
    if (shouldAutoNamePrompt) {
      await appCtx.scheduler.runAfter(0, autoNamePromptRef, {
        orgId: org.id,
        promptId: String(promptId),
      });
    }

    return {
      promptId: String(promptId),
      generationId: String(generationId),
      thumbnailId: String(thumbnailIds[0]),
      thumbnailIds: thumbnailIds.map((id: any) => String(id)),
    };
  },
});

export const preparePromptAutoName = internalMutationGeneric({
  args: { orgId: v.string(), promptId: v.string() },
  handler: async (ctx, args) => {
    const appCtx = asCtx(ctx);
    const promptId = ctx.db.normalizeId("prompts", args.promptId);
    const prompt = promptId ? await ctx.db.get(promptId) : null;
    if (
      !prompt ||
      prompt.organizationId !== args.orgId ||
      prompt.deletedAt ||
      !promptTitleNeedsAi(prompt.title, prompt.prompt)
    ) {
      return { shouldGenerate: false as const };
    }

    const [people, inspirations, subscription, balance] = await Promise.all([
      Promise.all(
        (prompt.personIds ?? []).map(async (id: string) => {
          const docId = ctx.db.normalizeId("people", id);
          const person = docId ? await ctx.db.get(docId) : null;
          return person?.organizationId === args.orgId && !person.deletedAt
            ? person
            : null;
        }),
      ),
      Promise.all(
        (prompt.inspirationIds ?? []).map(async (id: string) => {
          const docId = ctx.db.normalizeId("inspirations", id);
          const inspiration = docId ? await ctx.db.get(docId) : null;
          return inspiration && canReadInspiration(inspiration, args.orgId)
            ? inspiration
            : null;
        }),
      ),
      getActiveSubscription(appCtx, args.orgId),
      getCreditBalance(appCtx, args.orgId),
    ]);

    const plan = subscription?.plan ?? "free";
    const apiKeyMode = getApiKeyModeForPlan(plan);
    const geminiKey =
      apiKeyMode !== "disabled"
        ? await getCustomProviderKey(appCtx, args.orgId, "gemini")
        : null;
    const hasAutoNameCredits =
      (balance?.balance ?? 0) + Number.EPSILON >= CREDIT_COST_PER_AUTO_NAME;
    const useCustomApiKey =
      apiKeyMode === "required" ||
      (apiKeyMode === "fallback" && !hasAutoNameCredits && Boolean(geminiKey));

    if (apiKeyMode === "required" && !geminiKey) {
      return { shouldGenerate: false as const };
    }

    return {
      shouldGenerate: true as const,
      orgId: args.orgId,
      promptId: String(prompt._id),
      textPrompt: prompt.prompt,
      personDescriptions: people
        .map((person: any) => person?.description)
        .filter(Boolean),
      inspirationDescription: inspirations
        .map((inspiration: any) => inspiration?.description)
        .filter(Boolean)
        .join("\n\n"),
      encryptedGeminiKey: useCustomApiKey ? geminiKey?.encryptedKey : undefined,
      shouldDeductCredits: !useCustomApiKey && hasAutoNameCredits,
    };
  },
});

export const applyPromptAutoName = internalMutationGeneric({
  args: {
    orgId: v.string(),
    promptId: v.string(),
    name: v.string(),
    shouldDeductCredits: v.boolean(),
    usedCustomApiKey: v.boolean(),
  },
  handler: async (ctx, args) => {
    const promptId = ctx.db.normalizeId("prompts", args.promptId);
    const prompt = promptId ? await ctx.db.get(promptId) : null;
    if (!prompt || prompt.organizationId !== args.orgId || prompt.deletedAt) {
      throw new Error("Prompt not found");
    }
    if (!promptTitleNeedsAi(prompt.title, prompt.prompt)) {
      return { skipped: true };
    }

    const name = args.name.trim().slice(0, 100);
    if (!name) return { skipped: true };

    await ctx.db.patch(prompt._id, { title: name, updatedAt: Date.now() });

    if (args.shouldDeductCredits) {
      try {
        await deductCredits(
          asCtx(ctx),
          args.orgId,
          CREDIT_COST_PER_AUTO_NAME,
          "auto_name",
          "prompt auto-name",
          String(prompt._id),
        );
      } catch {
        // Auto-naming should not undo a successfully generated AI title.
      }
    }

    if (args.usedCustomApiKey) {
      await recordCustomApiKeyUsage(asCtx(ctx), args.orgId, {
        provider: "gemini",
        model: RUNTIME_TEXT_MODEL,
      });
    }

    return { skipped: false, name };
  },
});

export const claimThumbnailGeneration = internalMutationGeneric({
  args: {
    orgId: v.string(),
    generationId: v.string(),
    thumbnailId: v.string(),
  },
  handler: async (ctx, args) => {
    const appCtx = asCtx(ctx);
    const generationId = ctx.db.normalizeId("generations", args.generationId);
    const thumbnailId = ctx.db.normalizeId("thumbnails", args.thumbnailId);
    const generation = generationId ? await ctx.db.get(generationId) : null;
    const thumbnail = thumbnailId ? await ctx.db.get(thumbnailId) : null;

    if (
      !generationId ||
      !thumbnailId ||
      !generation ||
      !thumbnail ||
      generation.organizationId !== args.orgId ||
      thumbnail.organizationId !== args.orgId ||
      thumbnail.generationId !== generationId
    ) {
      throw new Error("Generation not found");
    }

    if (thumbnail.status !== "pending") {
      return { claimed: false, status: thumbnail.status };
    }

    const now = Date.now();
    await ctx.db.patch(thumbnailId, {
      status: "processing",
      claimedAt: now,
      updatedAt: now,
    });

    const [people, inspirations, userImages, openaiKey, geminiKey, apiyiKey] =
      await Promise.all([
        Promise.all(
          (generation.personIds ?? []).map(async (id: string) => {
            const docId = ctx.db.normalizeId("people", id);
            return docId ? ctx.db.get(docId) : null;
          }),
        ),
        Promise.all(
          (generation.inspirationIds ?? []).map(async (id: string) => {
            const docId = ctx.db.normalizeId("inspirations", id);
            return docId ? ctx.db.get(docId) : null;
          }),
        ),
        Promise.all(
          (generation.userImageIds ?? []).map(async (id: string) => {
            const docId = ctx.db.normalizeId("userImages", id);
            return docId ? ctx.db.get(docId) : null;
          }),
        ),
        generation.useCustomApiKey
          ? getCustomProviderKey(appCtx, args.orgId, "openai")
          : Promise.resolve(null),
        generation.useCustomApiKey
          ? getCustomProviderKey(appCtx, args.orgId, "gemini")
          : Promise.resolve(null),
        generation.useCustomApiKey
          ? getCustomProviderKey(appCtx, args.orgId, "apiyi")
          : Promise.resolve(null),
      ]);

    let baseImageUrl = generation.baseImageUrl;
    if (generation.baseThumbnailId) {
      const sourceId = ctx.db.normalizeId(
        "thumbnails",
        generation.baseThumbnailId,
      );
      const source = sourceId ? await ctx.db.get(sourceId) : null;
      baseImageUrl = getGenerationSourceThumbnailUrl(source) ?? baseImageUrl;
    }

    const visiblePeople = people.filter(
      (person: any) =>
        person?.organizationId === args.orgId && !person.deletedAt,
    );
    const visibleInspirations = inspirations.filter(
      (inspiration: any) =>
        inspiration && canReadInspiration(inspiration, args.orgId),
    );
    const visibleInspirationImages = visibleInspirations.flatMap(
      (inspiration: any) => getInspirationImageUrls(inspiration),
    );
    const visibleUserImages = userImages.filter(
      (image: any) => image?.organizationId === args.orgId && !image.deletedAt,
    );

    return {
      claimed: true,
      prompt: generation.prompt,
      model: generation.model,
      requestedModel: generation.requestedModel ?? generation.model,
      routingDefaultModel: generation.routingDefaultModel ?? generation.model,
      routingForceOfficialFirst: Boolean(generation.routingForceOfficialFirst),
      aspectRatio: generation.aspectRatio ?? "16:9",
      personDescriptions: visiblePeople
        .map((person: any) => person.description)
        .filter(Boolean),
      personImages: generation.personImageUrls ?? [],
      inspirationDescription: visibleInspirations
        .map((inspiration: any) =>
          getInspirationGenerationDescription(inspiration),
        )
        .filter(Boolean)
        .join("\n\n"),
      inspirationImages: visibleInspirationImages,
      hasPlaceholderMannequin: visibleInspirations.some(
        (inspiration: any) =>
          inspiration.anonymizedSubject || inspiration.hasPlaceholder,
      ),
      hasAnonymizedTextPlaceholders: visibleInspirations.some(
        (inspiration: any) => inspiration.anonymizedText,
      ),
      hasAnonymizedLogoPlaceholders: visibleInspirations.some(
        (inspiration: any) => inspiration.anonymizedLogos,
      ),
      userImages: visibleUserImages.map(toUserImageRow),
      baseImageUrl,
      editPrompt: generation.editPrompt,
      applyWatermark: Boolean(generation.applyWatermark),
      useCustomApiKey: Boolean(generation.useCustomApiKey),
      encryptedApiKeys: {
        openai: openaiKey?.encryptedKey,
        gemini: geminiKey?.encryptedKey,
        apiyi: apiyiKey?.encryptedKey,
      },
    };
  },
});

export const finishGeneration = internalMutationGeneric({
  args: {
    orgId: v.string(),
    generationId: v.string(),
    thumbnailId: v.string(),
    status: v.union(v.literal("succeeded"), v.literal("failed")),
    model: v.string(),
    url: v.optional(v.string()),
    watermarkedUrl: v.optional(v.string()),
    errorMessage: v.optional(v.string()),
    generationTimeMs: v.optional(v.number()),
    customKeyProvider: v.optional(
      v.union(v.literal("openai"), v.literal("gemini"), v.literal("apiyi")),
    ),
    customKeyUsages: v.optional(
      v.array(
        v.object({
          provider: v.union(
            v.literal("openai"),
            v.literal("gemini"),
            v.literal("apiyi"),
          ),
          model: v.string(),
          requestCount: v.optional(v.number()),
        }),
      ),
    ),
    requestedModel: v.optional(v.string()),
    routingDefaultModel: v.optional(v.string()),
    routingFinalProvider: v.optional(v.string()),
    routingFinalApi: v.optional(v.string()),
    routingFinalApiModelId: v.optional(v.string()),
    routingFallbackUsed: v.optional(v.boolean()),
    routingAttempts: v.optional(
      v.array(
        v.object({
          model: v.string(),
          provider: v.string(),
          api: v.string(),
          apiModelId: v.string(),
          status: v.union(v.literal("succeeded"), v.literal("failed")),
          durationMs: v.number(),
          error: v.optional(v.string()),
          customKeyProvider: v.optional(
            v.union(
              v.literal("openai"),
              v.literal("gemini"),
              v.literal("apiyi"),
            ),
          ),
        }),
      ),
    ),
  },
  handler: async (ctx, args) => {
    const generationId = ctx.db.normalizeId("generations", args.generationId);
    const thumbnailId = ctx.db.normalizeId("thumbnails", args.thumbnailId);
    const generation = generationId ? await ctx.db.get(generationId) : null;
    const thumbnail = thumbnailId ? await ctx.db.get(thumbnailId) : null;
    if (
      !generationId ||
      !thumbnailId ||
      generation?.organizationId !== args.orgId ||
      thumbnail?.organizationId !== args.orgId
    ) {
      throw new Error("Generation not found");
    }
    if (thumbnail.status !== "processing" && thumbnail.status !== "pending") {
      return { skipped: true };
    }
    if (
      thumbnail.status === "failed" &&
      thumbnail.errorMessage === "cancelled"
    ) {
      return { skipped: true };
    }
    if (
      args.status === "succeeded" &&
      generation.applyWatermark &&
      !args.watermarkedUrl
    ) {
      throw new Error("Watermarked image is required for this generation");
    }
    const now = Date.now();
    const storedRoutingAttempts = args.routingAttempts?.map((attempt) => {
      const { customKeyProvider: _customKeyProvider, ...storedAttempt } =
        attempt;
      return storedAttempt;
    });
    await ctx.db.patch(thumbnailId, {
      status: args.status,
      model: args.model,
      url: args.url,
      watermarkedUrl: generation.applyWatermark
        ? args.watermarkedUrl
        : undefined,
      errorMessage: args.errorMessage,
      generationTimeMs: args.generationTimeMs,
      requestedModel: args.requestedModel,
      routingDefaultModel: args.routingDefaultModel,
      routingFinalProvider: args.routingFinalProvider,
      routingFinalApi: args.routingFinalApi,
      routingFinalApiModelId: args.routingFinalApiModelId,
      routingFallbackUsed: args.routingFallbackUsed,
      routingAttempts: storedRoutingAttempts,
      updatedAt: now,
    });
    if (args.status === "succeeded") {
      await adjustOrgStats(asCtx(ctx), args.orgId, { succeededThumbnails: 1 });
    }
    if (args.routingAttempts?.length) {
      await Promise.all(
        args.routingAttempts.map(async (attempt, index) =>
          ctx.db.insert("generationRoutingEvents", {
            organizationId: args.orgId,
            generationId,
            thumbnailId,
            requestedModel: args.requestedModel ?? generation.model,
            defaultModel: args.routingDefaultModel ?? generation.model,
            model: attempt.model,
            provider: attempt.provider,
            api: attempt.api,
            apiModelId: attempt.apiModelId,
            status: attempt.status,
            durationMs: attempt.durationMs,
            fallbackUsed: index > 0,
            attemptIndex: index,
            error: attempt.error,
            createdAt: now,
            updatedAt: now,
          }),
        ),
      );
    }
    const customKeyUsages =
      args.customKeyUsages ??
      (args.customKeyProvider
        ? [{ provider: args.customKeyProvider, model: args.model }]
        : []);
    if (customKeyUsages.length > 0) {
      await recordCustomApiKeyUsages(asCtx(ctx), args.orgId, customKeyUsages);
    }
    if (args.status === "failed") {
      await ctx.db.insert("thumbnailErrors", {
        organizationId: args.orgId,
        thumbnailId,
        generationId,
        message: args.errorMessage ?? "Generation failed",
        context: { model: args.model },
        createdAt: now,
        updatedAt: now,
      });
      const allThumbnails = await ctx.db
        .query("thumbnails")
        .withIndex("by_generation", (q: any) =>
          q.eq("generationId", generationId),
        )
        .take(MAX_ROWS);
      if (!generation.useCustomApiKey && generation.chargedCreditCost) {
        await addCredits(
          asCtx(ctx),
          args.orgId,
          generation.chargedCreditCost / Math.max(allThumbnails.length, 1),
          "refund",
          "generation failed",
          String(generationId),
        );
      }
    }

    const thumbnails = await ctx.db
      .query("thumbnails")
      .withIndex("by_generation", (q: any) =>
        q.eq("generationId", generationId),
      )
      .take(MAX_ROWS);
    const hasInFlight = thumbnails.some((row: any) =>
      ["pending", "processing"].includes(row.status),
    );
    const hasSucceeded = thumbnails.some(
      (row: any) => row.status === "succeeded",
    );
    await ctx.db.patch(generationId, {
      status: hasInFlight
        ? "processing"
        : hasSucceeded
          ? "succeeded"
          : "failed",
      errorMessage: hasInFlight ? undefined : args.errorMessage,
      completedAt: hasInFlight ? undefined : now,
      updatedAt: now,
    });

    const justCompletedWithSuccess =
      !hasInFlight && hasSucceeded && !generation.completedAt;
    if (justCompletedWithSuccess) {
      await asCtx(ctx).scheduler.runAfter(
        GENERATION_NOTIFICATION_EMAIL_DELAY_MS,
        notifyGenerationCompletedRef,
        { generationId: String(generationId) },
      );
    }
    return { skipped: false };
  },
});

export const expireStaleGeneration = internalMutationGeneric({
  args: {
    orgId: v.string(),
    generationId: v.string(),
  },
  handler: async (ctx, args) => {
    const generationId = ctx.db.normalizeId("generations", args.generationId);
    const generation = generationId ? await ctx.db.get(generationId) : null;
    if (
      !generationId ||
      !generation ||
      generation.organizationId !== args.orgId
    ) {
      throw new Error("Generation not found");
    }

    const thumbnails = await ctx.db
      .query("thumbnails")
      .withIndex("by_generation", (q: any) =>
        q.eq("generationId", generationId),
      )
      .take(MAX_ROWS);
    const inFlightThumbnails = thumbnails.filter((thumbnail: any) =>
      ["pending", "processing"].includes(thumbnail.status),
    );

    if (inFlightThumbnails.length === 0) {
      return { skipped: true };
    }

    const now = Date.now();
    const cutoff = now - STALE_GENERATION_TIMEOUT_MS;
    const staleThumbnails = inFlightThumbnails.filter((thumbnail: any) => {
      const startedAt = thumbnail.claimedAt ?? thumbnail.createdAt;
      return startedAt <= cutoff;
    });

    if (staleThumbnails.length === 0) {
      return { skipped: true };
    }

    const errorMessage =
      "Generation timed out before the provider returned an image";

    await Promise.all(
      staleThumbnails.map(async (thumbnail: any) =>
        ctx.db.patch(thumbnail._id, {
          status: "failed",
          errorMessage,
          updatedAt: now,
        }),
      ),
    );

    await Promise.all(
      staleThumbnails.map(async (thumbnail: any) =>
        ctx.db.insert("thumbnailErrors", {
          organizationId: args.orgId,
          thumbnailId: thumbnail._id,
          generationId,
          message: errorMessage,
          context: { model: thumbnail.model ?? generation.model },
          createdAt: now,
          updatedAt: now,
        }),
      ),
    );

    if (!generation.useCustomApiKey && generation.chargedCreditCost) {
      await addCredits(
        asCtx(ctx),
        args.orgId,
        (generation.chargedCreditCost * staleThumbnails.length) /
          Math.max(thumbnails.length, 1),
        "refund",
        "generation timed out",
        String(generationId),
      );
    }

    const remainingInFlightCount =
      inFlightThumbnails.length - staleThumbnails.length;
    const hasSucceeded = thumbnails.some(
      (thumbnail: any) => thumbnail.status === "succeeded",
    );

    await ctx.db.patch(generationId, {
      status:
        remainingInFlightCount > 0
          ? "processing"
          : hasSucceeded
            ? "succeeded"
            : "failed",
      errorMessage:
        remainingInFlightCount > 0 || hasSucceeded ? undefined : errorMessage,
      completedAt: remainingInFlightCount > 0 ? undefined : now,
      updatedAt: now,
    });

    return { skipped: false, failedCount: staleThumbnails.length };
  },
});

export const updatePromptName = mutationGeneric({
  args: { orgSlug: v.string(), promptId: v.string(), name: v.string() },
  handler: async (ctx, args) => {
    const { org } = await requireOrg(asCtx(ctx), args.orgSlug);
    const prompt = await getPromptOrThrow(asCtx(ctx), org.id, args.promptId);
    const name = args.name.trim() || "Untitled";
    await ctx.db.patch(prompt._id, { title: name, updatedAt: Date.now() });
    return { id: String(prompt._id), name };
  },
});

export const deletePrompt = mutationGeneric({
  args: { orgSlug: v.string(), promptId: v.string() },
  handler: async (ctx, args) => {
    const appCtx = asCtx(ctx);
    const { org } = await requireOrg(appCtx, args.orgSlug);
    const prompt = await getPromptOrThrow(appCtx, org.id, args.promptId);
    await ctx.db.patch(prompt._id, {
      deletedAt: Date.now(),
      updatedAt: Date.now(),
    });
    return { id: String(prompt._id) };
  },
});

export const cancelGeneration = mutationGeneric({
  args: { orgSlug: v.string(), generationId: v.string() },
  handler: async (ctx, args) => {
    const { org } = await requireOrg(asCtx(ctx), args.orgSlug);
    const generationId = ctx.db.normalizeId("generations", args.generationId);
    const generation = generationId ? await ctx.db.get(generationId) : null;
    if (!generation || generation.organizationId !== org.id) {
      throw new Error("Generation not found");
    }
    const checkedGenerationId = generation._id;
    const thumbnails = await ctx.db
      .query("thumbnails")
      .withIndex("by_generation", (q: any) =>
        q.eq("generationId", checkedGenerationId),
      )
      .take(MAX_ROWS);
    const now = Date.now();
    await Promise.all(
      thumbnails
        .filter((thumbnail: any) =>
          ["pending", "processing"].includes(thumbnail.status),
        )
        .map(async (thumbnail: any) =>
          ctx.db.patch(thumbnail._id, {
            status: "failed",
            errorMessage: "cancelled",
            updatedAt: now,
          }),
        ),
    );
    await ctx.db.patch(checkedGenerationId, {
      status: "failed",
      errorMessage: "cancelled",
      completedAt: now,
      updatedAt: now,
    });
    return { id: String(checkedGenerationId) };
  },
});

export const deleteGeneration = mutationGeneric({
  args: { orgSlug: v.string(), generationId: v.string() },
  handler: async (ctx, args) => {
    const { org } = await requireOrg(asCtx(ctx), args.orgSlug);
    const generationId = ctx.db.normalizeId("generations", args.generationId);
    const generation = generationId ? await ctx.db.get(generationId) : null;
    if (!generation || generation.organizationId !== org.id) {
      throw new Error("Generation not found");
    }
    const checkedGenerationId = generation._id;
    const thumbnails = await ctx.db
      .query("thumbnails")
      .withIndex("by_generation", (q: any) =>
        q.eq("generationId", checkedGenerationId),
      )
      .take(MAX_ROWS);
    const now = Date.now();
    await Promise.all(
      thumbnails.map(async (thumbnail: any) =>
        ctx.db.patch(thumbnail._id, { hiddenAt: now, updatedAt: now }),
      ),
    );
    await ctx.db.patch(checkedGenerationId, { hiddenAt: now, updatedAt: now });
    return { id: String(checkedGenerationId) };
  },
});

export const deleteThumbnail = mutationGeneric({
  args: { orgSlug: v.string(), thumbnailId: v.string() },
  handler: async (ctx, args) => {
    const { org } = await requireOrg(asCtx(ctx), args.orgSlug);
    const thumbnailId = ctx.db.normalizeId("thumbnails", args.thumbnailId);
    const thumbnail = thumbnailId ? await ctx.db.get(thumbnailId) : null;
    if (!thumbnail || thumbnail.organizationId !== org.id) {
      throw new Error("Thumbnail not found");
    }
    const checkedThumbnailId = thumbnail._id;
    await ctx.db.patch(checkedThumbnailId, {
      hiddenAt: Date.now(),
      updatedAt: Date.now(),
    });
    return { id: String(checkedThumbnailId) };
  },
});

export const toggleThumbnailStar = mutationGeneric({
  args: { orgSlug: v.string(), thumbnailId: v.string() },
  handler: async (ctx, args) => {
    const { org } = await requireOrg(asCtx(ctx), args.orgSlug);
    const thumbnailId = ctx.db.normalizeId("thumbnails", args.thumbnailId);
    const thumbnail = thumbnailId ? await ctx.db.get(thumbnailId) : null;
    if (!thumbnail || thumbnail.organizationId !== org.id) {
      throw new Error("Thumbnail not found");
    }
    const checkedThumbnailId = thumbnail._id;
    const now = Date.now();
    const nextStarredAt = thumbnail.starredAt ? undefined : now;
    await ctx.db.patch(checkedThumbnailId, {
      starredAt: nextStarredAt,
      updatedAt: now,
    });
    return {
      id: String(checkedThumbnailId),
      isStarred: Boolean(nextStarredAt),
    };
  },
});

export const enhancePrompt = actionGeneric({
  args: { textPrompt: v.string() },
  handler: async (_ctx, args) => {
    const textPrompt = args.textPrompt.trim();
    if (!textPrompt) return { enhanced: textPrompt };
    try {
      return { enhanced: await enhancePromptWithGemini(textPrompt) };
    } catch {
      return { enhanced: textPrompt };
    }
  },
});
