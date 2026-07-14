/* eslint-disable @typescript-eslint/no-explicit-any */
// Intentional any: this legacy Convex module still uses dynamic component and table APIs that cannot be typed precisely without a larger generated-API migration.
import { components, internal } from "./_generated/api";
import { action, internalMutation, mutation, query } from "./_generated/server";
import { authComponent } from "./auth/config";
import { adjustOrgStats } from "./orgStats";
import { v } from "convex/values";
import { up } from "up-fetch";

const REFERRAL_SOURCE_VALUES = [
  "melvynx",
  "twitter",
  "youtube",
  "google",
  "friend",
  "other",
] as const;

const USER_TYPE_VALUES = ["youtuber", "agency", "curious"] as const;
const AUTO_NAME_TITLE = "Generating title...";
const PUBLIC_INSPIRATION_REVIEW_STATUSES = new Set(["GOOD", "APPROVED"]);
const upfetch = up(fetch);
const internalApi = internal as any;

async function requireUser(ctx: any) {
  const user = await authComponent.getAuthUser(ctx as never);
  return { id: String(user._id), email: user.email, name: user.name };
}

async function requireOrg(ctx: any, orgSlug: string) {
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

  return {
    user,
    org: {
      id: String(org._id),
      name: org.name,
      slug: org.slug,
      logo: org.logo ?? null,
    },
  };
}

async function scheduleAdminNotification(
  ctx: any,
  args: {
    event: string;
    title: string;
    dedupeKey?: string;
    details?: {
      label: string;
      value?: string | number | boolean | null;
    }[];
  },
) {
  try {
    await ctx.scheduler.runAfter(
      0,
      internalApi.telegram.sendAdminNotification,
      args,
    );
  } catch (error) {
    void error;
  }
}

function assertOneOf<T extends readonly string[]>(value: string, values: T) {
  if (!values.includes(value)) {
    throw new Error("Invalid onboarding answer");
  }
}

async function ensureOrgInspiration(
  ctx: any,
  orgId: string,
  inspirationId: string,
) {
  const id = ctx.db.normalizeId("inspirations", inspirationId);
  const source = id ? await ctx.db.get(id) : null;
  if (!source || source.deletedAt) throw new Error("Inspiration not found");
  if (source.organizationId === orgId) return String(source._id);
  if (
    source.isPublic === false ||
    !PUBLIC_INSPIRATION_REVIEW_STATUSES.has(source.adminReview ?? "")
  ) {
    throw new Error("Inspiration not found");
  }

  const now = Date.now();
  const copyId = await ctx.db.insert("inspirations", {
    organizationId: orgId,
    title: source.title,
    description: source.description,
    sourceUrl: source.sourceUrl,
    sourceVideoTitle: source.sourceVideoTitle,
    sourceVideoAuthor: source.sourceVideoAuthor,
    sourceVideoThumbnailUrl: source.sourceVideoThumbnailUrl,
    image: source.image,
    images: source.images,
    categories: source.categories,
    hasPlaceholder: source.hasPlaceholder,
    anonymizedSubject: source.anonymizedSubject,
    anonymizedText: source.anonymizedText,
    anonymizedLogos: source.anonymizedLogos,
    anonymizedTextDescription: source.anonymizedTextDescription,
    isPublic: false,
    adminReview: "DENY",
    createdAt: now,
    updatedAt: now,
  });
  return String(copyId);
}

async function fetchYoutubeChannelData(youtubeChannelUrl: string) {
  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) return null;

  const url = new URL(youtubeChannelUrl);
  const handle = url.pathname.split("/").find((part) => part.startsWith("@"));
  if (!handle) return null;

  const data = await upfetch<{
    items?: {
      id: string;
      snippet?: {
        title?: string;
        description?: string;
        thumbnails?: { high?: { url?: string }; default?: { url?: string } };
      };
      statistics?: {
        subscriberCount?: string;
        videoCount?: string;
        viewCount?: string;
      };
    }[];
  }>(
    `https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics&forHandle=${encodeURIComponent(handle.slice(1))}&key=${apiKey}`,
  ).catch(() => null);
  if (!data) return null;
  const item = data.items?.[0];
  if (!item) return null;

  return {
    channelId: item.id,
    title: item.snippet?.title,
    description: item.snippet?.description,
    thumbnailUrl:
      item.snippet?.thumbnails?.high?.url ??
      item.snippet?.thumbnails?.default?.url,
    subscriberCount: item.statistics?.subscriberCount
      ? Number(item.statistics.subscriberCount)
      : undefined,
    videoCount: item.statistics?.videoCount
      ? Number(item.statistics.videoCount)
      : undefined,
    viewCount: item.statistics?.viewCount
      ? Number(item.statistics.viewCount)
      : undefined,
  };
}

export const completeOnboarding = mutation({
  args: { orgSlug: v.string() },
  handler: async (ctx, args) => {
    const { org, user } = await requireOrg(ctx, args.orgSlug);
    const now = Date.now();
    const existing = await ctx.db
      .query("onboardingStates")
      .withIndex("by_organization", (q) => q.eq("organizationId", org.id))
      .first();
    const shouldNotify = !existing?.completedAt;

    if (existing) {
      await ctx.db.patch(existing._id, {
        completedAt: now,
        updatedAt: now,
      });
    } else {
      await ctx.db.insert("onboardingStates", {
        organizationId: org.id,
        completedAt: now,
        createdAt: now,
        updatedAt: now,
      });
    }

    if (shouldNotify) {
      await scheduleAdminNotification(ctx, {
        event: "onboarding.completed",
        title: "User completed onboarding",
        dedupeKey: `onboarding:completed:${org.id}`,
        details: [
          { label: "Organization", value: org.name },
          { label: "Org slug", value: org.slug },
          { label: "User name", value: user.name },
          { label: "User email", value: user.email },
        ],
      });
    }

    return { success: true };
  },
});

export const status = query({
  args: { orgSlug: v.string() },
  handler: async (ctx, args) => {
    const { org } = await requireOrg(ctx, args.orgSlug);
    const state = await ctx.db
      .query("onboardingStates")
      .withIndex("by_organization", (q) => q.eq("organizationId", org.id))
      .first();

    return {
      completedAt: state?.completedAt ?? null,
      questionsAnsweredAt: state?.questionsAnsweredAt ?? null,
    };
  },
});

export const submitLeadQuestions = action({
  args: {
    orgSlug: v.string(),
    referralSource: v.string(),
    userType: v.string(),
    youtubeChannelUrl: v.optional(v.string()),
    videosPerMonth: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { org } = await requireOrg(ctx, args.orgSlug);
    assertOneOf(args.referralSource, REFERRAL_SOURCE_VALUES);
    assertOneOf(args.userType, USER_TYPE_VALUES);

    const youtubeData =
      args.userType === "youtuber" && args.youtubeChannelUrl
        ? await fetchYoutubeChannelData(args.youtubeChannelUrl)
        : null;

    await ctx.runMutation(internalApi.onboarding.saveLeadQuestions, {
      organizationId: org.id,
      referralSource: args.referralSource,
      userType: args.userType,
      youtubeChannelUrl: args.youtubeChannelUrl,
      videosPerMonth: args.videosPerMonth,
      youtubeFetched: Boolean(youtubeData),
      youtubeData: youtubeData ?? undefined,
    });

    if (youtubeData?.title || youtubeData?.thumbnailUrl) {
      await ctx.runMutation(components.betterAuth.data.patchOrganization, {
        organizationId: org.id,
        update: {
          name: youtubeData.title ?? org.name,
          logo: youtubeData.thumbnailUrl ?? org.logo,
        },
      });
    }

    return { success: true, youtubeFetched: Boolean(youtubeData) };
  },
});

export const generatePersonDescription = action({
  args: { images: v.array(v.string()) },
  handler: async () => {
    return { description: "" };
  },
});

export const createPerson = mutation({
  args: {
    orgSlug: v.string(),
    name: v.string(),
    description: v.string(),
    images: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    const { org } = await requireOrg(ctx, args.orgSlug);
    const name = args.name.trim();
    if (!name) throw new Error("Name is required");
    if (args.images.length > 1) {
      throw new Error(
        "Only one image is allowed per person. Create separate persons for multiple faces.",
      );
    }

    const now = Date.now();
    const id = await ctx.db.insert("people", {
      organizationId: org.id,
      name,
      description: args.description,
      images: args.images.map((url) => ({ url })),
      createdAt: now,
      updatedAt: now,
    });

    return {
      id: String(id),
      orgId: org.id,
      name,
      description: args.description,
      images: args.images,
      createdAt: new Date(now).toISOString(),
      updatedAt: new Date(now).toISOString(),
    };
  },
});

export const createPrompt = mutation({
  args: {
    orgSlug: v.string(),
    textPrompt: v.string(),
    personIds: v.array(v.string()),
    inspirationIds: v.array(v.string()),
    userImageIds: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    const { org } = await requireOrg(ctx, args.orgSlug);
    const textPrompt = args.textPrompt.trim();
    if (!textPrompt) throw new Error("Prompt is required");
    const inspirationIds = await Promise.all(
      args.inspirationIds.map(async (inspirationId) =>
        ensureOrgInspiration(ctx, org.id, inspirationId),
      ),
    );

    const now = Date.now();
    const id = await ctx.db.insert("prompts", {
      organizationId: org.id,
      title: AUTO_NAME_TITLE,
      prompt: textPrompt,
      personIds: args.personIds,
      inspirationIds,
      userImageIds: args.userImageIds,
      createdAt: now,
      updatedAt: now,
    });
    await adjustOrgStats(ctx, org.id, { prompts: 1 });
    await ctx.scheduler.runAfter(0, internalApi.editorNode.autoNamePrompt, {
      orgId: org.id,
      promptId: String(id),
    });

    return { id: String(id) };
  },
});

export const saveLeadQuestions = internalMutation({
  args: {
    organizationId: v.string(),
    referralSource: v.string(),
    userType: v.string(),
    youtubeChannelUrl: v.optional(v.string()),
    videosPerMonth: v.optional(v.number()),
    youtubeFetched: v.boolean(),
    youtubeData: v.optional(
      v.object({
        channelId: v.string(),
        title: v.optional(v.string()),
        description: v.optional(v.string()),
        thumbnailUrl: v.optional(v.string()),
        subscriberCount: v.optional(v.number()),
        videoCount: v.optional(v.number()),
        viewCount: v.optional(v.number()),
      }),
    ),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const existingResponse = await ctx.db
      .query("onboardingResponses")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", args.organizationId),
      )
      .first();
    const response = {
      organizationId: args.organizationId,
      referralSource: args.referralSource,
      userType: args.userType,
      youtubeChannelUrl: args.youtubeChannelUrl,
      videosPerMonth: args.videosPerMonth,
      youtubeFetched: args.youtubeFetched,
      youtubeChannelId: args.youtubeData?.channelId,
      youtubeChannelTitle: args.youtubeData?.title,
      youtubeChannelDescription: args.youtubeData?.description,
      youtubeChannelThumbnail: args.youtubeData?.thumbnailUrl,
      youtubeSubscriberCount: args.youtubeData?.subscriberCount,
      youtubeVideoCount: args.youtubeData?.videoCount,
      youtubeViewCount: args.youtubeData?.viewCount,
      updatedAt: now,
    };

    if (existingResponse) {
      await ctx.db.patch(existingResponse._id, response);
    } else {
      await ctx.db.insert("onboardingResponses", {
        ...response,
        createdAt: now,
      });
    }

    const existingState = await ctx.db
      .query("onboardingStates")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", args.organizationId),
      )
      .first();
    if (existingState) {
      await ctx.db.patch(existingState._id, {
        questionsAnsweredAt: now,
        updatedAt: now,
      });
    } else {
      await ctx.db.insert("onboardingStates", {
        organizationId: args.organizationId,
        questionsAnsweredAt: now,
        createdAt: now,
        updatedAt: now,
      });
    }

    return { success: true };
  },
});
