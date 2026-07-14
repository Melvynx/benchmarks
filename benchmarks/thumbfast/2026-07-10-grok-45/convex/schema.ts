import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

const timestamps = {
  createdAt: v.number(),
  updatedAt: v.number(),
};

const legacy = {
  legacyId: v.optional(v.string()),
};

const orgScoped = {
  organizationId: v.string(),
  ...timestamps,
  ...legacy,
};

const storedImage = v.object({
  url: v.string(),
  key: v.optional(v.string()),
  width: v.optional(v.number()),
  height: v.optional(v.number()),
  contentType: v.optional(v.string()),
});

const routingAttempt = v.object({
  model: v.string(),
  provider: v.string(),
  api: v.string(),
  apiModelId: v.string(),
  status: v.string(),
  durationMs: v.optional(v.number()),
  error: v.optional(v.string()),
});

export default defineSchema({
  people: defineTable({
    ...orgScoped,
    name: v.string(),
    description: v.optional(v.string()),
    images: v.array(storedImage),
    deletedAt: v.optional(v.number()),
  })
    .index("by_organization", ["organizationId"])
    .index("by_legacy", ["legacyId"])
    .index("by_organization_created", ["organizationId", "createdAt"]),

  inspirations: defineTable({
    ...orgScoped,
    title: v.string(),
    description: v.optional(v.string()),
    sourceUrl: v.optional(v.string()),
    sourceVideoTitle: v.optional(v.string()),
    sourceVideoAuthor: v.optional(v.string()),
    sourceVideoThumbnailUrl: v.optional(v.string()),
    image: storedImage,
    images: v.optional(v.array(storedImage)),
    categories: v.optional(v.array(v.string())),
    hasPlaceholder: v.optional(v.boolean()),
    anonymizedSubject: v.optional(v.boolean()),
    anonymizedText: v.optional(v.boolean()),
    anonymizedLogos: v.optional(v.boolean()),
    anonymizedTextDescription: v.optional(v.string()),
    isPublic: v.optional(v.boolean()),
    adminReview: v.optional(v.string()),
    reviewedAt: v.optional(v.number()),
    deletedAt: v.optional(v.number()),
    sourceType: v.optional(v.string()),
    drawingData: v.optional(v.string()),
    // Compat fields from other drawing experiments on the shared Convex deploy
    drawing: v.optional(v.string()),
    drawingMetadata: v.optional(v.string()),
  })
    .index("by_organization", ["organizationId"])
    .index("by_legacy", ["legacyId"])
    .index("by_created", ["createdAt"])
    .index("by_admin_review_created", ["adminReview", "createdAt"])
    .index("by_public_review_created", ["isPublic", "adminReview", "createdAt"])
    .index("by_organization_created", ["organizationId", "createdAt"]),

  prompts: defineTable({
    ...orgScoped,
    title: v.string(),
    prompt: v.string(),
    negativePrompt: v.optional(v.string()),
    model: v.optional(v.string()),
    personIds: v.optional(v.array(v.string())),
    inspirationIds: v.optional(v.array(v.string())),
    userImageIds: v.optional(v.array(v.string())),
    deletedAt: v.optional(v.number()),
  })
    .index("by_organization", ["organizationId"])
    .index("by_legacy", ["legacyId"])
    .index("by_organization_created", ["organizationId", "createdAt"])
    .searchIndex("by_prompt", { searchField: "prompt" }),

  generations: defineTable({
    ...orgScoped,
    promptId: v.optional(v.id("prompts")),
    prompt: v.string(),
    model: v.string(),
    requestedModel: v.optional(v.string()),
    routingDefaultModel: v.optional(v.string()),
    routingForceOfficialFirst: v.optional(v.boolean()),
    status: v.string(),
    aspectRatio: v.optional(v.string()),
    personIds: v.optional(v.array(v.string())),
    inspirationIds: v.optional(v.array(v.string())),
    userImageIds: v.optional(v.array(v.string())),
    personImageUrls: v.optional(v.array(v.string())),
    inspirationUrls: v.optional(v.array(v.string())),
    baseImageUrl: v.optional(v.string()),
    baseThumbnailId: v.optional(v.string()),
    editPrompt: v.optional(v.string()),
    useCustomApiKey: v.optional(v.boolean()),
    chargedCreditCost: v.optional(v.number()),
    applyWatermark: v.optional(v.boolean()),
    errorMessage: v.optional(v.string()),
    completedAt: v.optional(v.number()),
    hiddenAt: v.optional(v.number()),
    createdByUserId: v.optional(v.string()),
    notifiedAt: v.optional(v.number()),
  })
    .index("by_organization", ["organizationId"])
    .index("by_legacy", ["legacyId"])
    .index("by_prompt", ["promptId"])
    .index("by_created", ["createdAt"])
    .index("by_status_created", ["status", "createdAt"])
    .index("by_organization_status", ["organizationId", "status"])
    .index("by_organization_created", ["organizationId", "createdAt"]),

  generationNotificationAcknowledgements: defineTable({
    organizationId: v.string(),
    generationId: v.id("generations"),
    userId: v.string(),
    ...timestamps,
  })
    .index("by_generation", ["generationId"])
    .index("by_generation_user", ["generationId", "userId"]),

  thumbnails: defineTable({
    ...orgScoped,
    generationId: v.optional(v.id("generations")),
    url: v.optional(v.string()),
    watermarkedUrl: v.optional(v.string()),
    status: v.string(),
    model: v.string(),
    requestedModel: v.optional(v.string()),
    routingDefaultModel: v.optional(v.string()),
    routingFinalProvider: v.optional(v.string()),
    routingFinalApi: v.optional(v.string()),
    routingFinalApiModelId: v.optional(v.string()),
    routingFallbackUsed: v.optional(v.boolean()),
    routingAttempts: v.optional(v.array(routingAttempt)),
    claimedAt: v.optional(v.number()),
    hiddenAt: v.optional(v.number()),
    starredAt: v.optional(v.number()),
    publicHiddenAt: v.optional(v.number()),
    errorMessage: v.optional(v.string()),
    generationTimeMs: v.optional(v.number()),
  })
    .index("by_organization", ["organizationId"])
    .index("by_legacy", ["legacyId"])
    .index("by_generation", ["generationId"])
    .index("by_created", ["createdAt"])
    .index("by_organization_status", ["organizationId", "status"])
    .index("by_organization_created", ["organizationId", "createdAt"]),

  videos: defineTable({
    ...orgScoped,
    title: v.string(),
    youtubeUrl: v.optional(v.string()),
    description: v.optional(v.string()),
    selectedThumbnailId: v.optional(v.id("thumbnails")),
    closedAt: v.optional(v.number()),
    deletedAt: v.optional(v.number()),
  })
    .index("by_organization", ["organizationId"])
    .index("by_legacy", ["legacyId"])
    .index("by_organization_created", ["organizationId", "createdAt"]),

  videoGenerations: defineTable({
    ...orgScoped,
    videoId: v.id("videos"),
    generationId: v.id("generations"),
    slot: v.optional(v.union(v.number(), v.null())),
    selectedThumbnailId: v.optional(v.id("thumbnails")),
  })
    .index("by_video", ["videoId"])
    .index("by_legacy", ["legacyId"])
    .index("by_generation", ["generationId"]),

  videoTitles: defineTable({
    ...orgScoped,
    videoId: v.id("videos"),
    title: v.string(),
    score: v.optional(v.number()),
  })
    .index("by_video", ["videoId"])
    .index("by_legacy", ["legacyId"]),

  userImages: defineTable({
    ...orgScoped,
    image: storedImage,
    label: v.optional(v.string()),
    description: v.optional(v.string()),
    deletedAt: v.optional(v.number()),
  })
    .index("by_organization", ["organizationId"])
    .index("by_legacy", ["legacyId"])
    .index("by_organization_created", ["organizationId", "createdAt"]),

  thumbnailErrors: defineTable({
    ...orgScoped,
    thumbnailId: v.optional(v.id("thumbnails")),
    generationId: v.optional(v.id("generations")),
    message: v.string(),
    stack: v.optional(v.string()),
    // Intentional any: error diagnostics accept arbitrary provider JSON.
    context: v.optional(v.any()),
  })
    .index("by_organization", ["organizationId"])
    .index("by_legacy", ["legacyId"])
    .index("by_created", ["createdAt"])
    .index("by_thumbnail", ["thumbnailId"])
    .index("by_generation", ["generationId"]),

  generationRoutingEvents: defineTable({
    ...orgScoped,
    generationId: v.optional(v.id("generations")),
    thumbnailId: v.optional(v.id("thumbnails")),
    requestedModel: v.string(),
    defaultModel: v.string(),
    model: v.string(),
    provider: v.string(),
    api: v.string(),
    apiModelId: v.string(),
    status: v.string(),
    durationMs: v.optional(v.number()),
    fallbackUsed: v.boolean(),
    attemptIndex: v.number(),
    error: v.optional(v.string()),
  })
    .index("by_organization", ["organizationId"])
    .index("by_created", ["createdAt"])
    .index("by_status_created", ["status", "createdAt"])
    .index("by_generation", ["generationId"])
    .index("by_thumbnail", ["thumbnailId"]),

  agentChats: defineTable({
    ...orgScoped,
    title: v.optional(v.string()),
    // Intentional any: AI SDK UI messages are heterogeneous JSON payloads.
    messages: v.array(v.any()),
  })
    .index("by_organization", ["organizationId"])
    .index("by_legacy", ["legacyId"])
    .index("by_organization_created", ["organizationId", "createdAt"]),

  featureFlags: defineTable({
    key: v.string(),
    enabled: v.boolean(),
    description: v.optional(v.string()),
    ...timestamps,
    ...legacy,
  })
    .index("by_key", ["key"])
    .index("by_legacy", ["legacyId"]),

  generationRoutingSettings: defineTable({
    key: v.string(),
    forceOfficialFirst: v.boolean(),
    ...timestamps,
  }).index("by_key", ["key"]),

  feedbacks: defineTable({
    userId: v.optional(v.string()),
    organizationId: v.optional(v.string()),
    rating: v.optional(v.number()),
    message: v.string(),
    reply: v.optional(v.string()),
    closedAt: v.optional(v.number()),
    ...timestamps,
    ...legacy,
  })
    .index("by_user", ["userId"])
    .index("by_organization", ["organizationId"])
    .index("by_legacy", ["legacyId"])
    .index("by_reply_created", ["reply", "createdAt"])
    .index("by_reply_closed_created", ["reply", "closedAt", "createdAt"])
    .index("by_created", ["createdAt"])
    .searchIndex("by_message", { searchField: "message" }),

  newsletterSubscriptions: defineTable({
    email: v.string(),
    source: v.optional(v.string()),
    ...timestamps,
  }).index("by_email", ["email"]),

  changelogDismissals: defineTable({
    userId: v.string(),
    slug: v.string(),
    ...timestamps,
  })
    .index("by_user", ["userId"])
    .index("by_user_slug", ["userId", "slug"]),

  changelogStates: defineTable({
    userId: v.string(),
    latestSeenSlug: v.optional(v.string()),
    ...timestamps,
  }).index("by_user", ["userId"]),

  adminNotificationDeliveries: defineTable({
    dedupeKey: v.string(),
    event: v.string(),
    title: v.string(),
    status: v.string(),
    attempts: v.number(),
    sentAt: v.optional(v.number()),
    error: v.optional(v.string()),
    ...timestamps,
  })
    .index("by_dedupe_key", ["dedupeKey"])
    .index("by_event_created", ["event", "createdAt"]),

  onboardingResponses: defineTable({
    organizationId: v.string(),
    referralSource: v.string(),
    userType: v.string(),
    youtubeChannelUrl: v.optional(v.string()),
    videosPerMonth: v.optional(v.number()),
    youtubeFetched: v.optional(v.boolean()),
    youtubeChannelId: v.optional(v.string()),
    youtubeChannelTitle: v.optional(v.string()),
    youtubeChannelDescription: v.optional(v.string()),
    youtubeChannelThumbnail: v.optional(v.string()),
    youtubeSubscriberCount: v.optional(v.number()),
    youtubeVideoCount: v.optional(v.number()),
    youtubeViewCount: v.optional(v.number()),
    ...timestamps,
  })
    .index("by_organization", ["organizationId"])
    .index("by_created", ["createdAt"]),

  onboardingStates: defineTable({
    organizationId: v.string(),
    completedAt: v.optional(v.number()),
    questionsAnsweredAt: v.optional(v.number()),
    ...timestamps,
  }).index("by_organization", ["organizationId"]),

  // Denormalized per-org counters so dashboards and admin lists do not have
  // to scan prompts/generations/thumbnails just to display counts. Rows are
  // lazily seeded from bounded counts on the first counted write for an org;
  // orgs without a row fall back to the legacy capped scans.
  orgStats: defineTable({
    organizationId: v.string(),
    promptCount: v.number(),
    generationCount: v.number(),
    thumbnailCount: v.number(),
    succeededThumbnailCount: v.number(),
    ...timestamps,
  }).index("by_organization", ["organizationId"]),

  creditBalances: defineTable({
    organizationId: v.string(),
    balance: v.number(),
    subscriptionCreditsRemaining: v.optional(v.number()),
    ...timestamps,
    ...legacy,
  })
    .index("by_organization", ["organizationId"])
    .index("by_legacy", ["legacyId"]),

  creditTransactions: defineTable({
    organizationId: v.string(),
    amount: v.number(),
    type: v.string(),
    reason: v.string(),
    referenceId: v.optional(v.string()),
    ...timestamps,
    ...legacy,
  })
    .index("by_organization", ["organizationId"])
    .index("by_legacy", ["legacyId"])
    .index("by_organization_reference", ["organizationId", "referenceId"])
    .index("by_organization_created", ["organizationId", "createdAt"])
    .index("by_organization_type_created", [
      "organizationId",
      "type",
      "createdAt",
    ]),

  signupCreditGrants: defineTable({
    fingerprint: v.string(),
    userId: v.string(),
    organizationId: v.string(),
    creditsGranted: v.number(),
    ...timestamps,
    ...legacy,
  })
    .index("by_fingerprint", ["fingerprint"])
    .index("by_user", ["userId"])
    .index("by_organization", ["organizationId"])
    .index("by_legacy", ["legacyId"]),

  trialRedemptions: defineTable({
    organizationId: v.string(),
    userId: v.string(),
    fingerprint: v.optional(v.string()),
    status: v.optional(v.string()),
    stripeCustomerId: v.optional(v.string()),
    stripeSubscriptionId: v.optional(v.string()),
    stripeCheckoutSessionId: v.optional(v.string()),
    stripeCheckoutSessionUrl: v.optional(v.string()),
    checkoutExpiresAt: v.optional(v.number()),
    ...timestamps,
    ...legacy,
  })
    .index("by_user", ["userId"])
    .index("by_fingerprint", ["fingerprint"])
    .index("by_organization", ["organizationId"])
    .index("by_stripe_subscription", ["stripeSubscriptionId"])
    .index("by_stripe_checkout_session", ["stripeCheckoutSessionId"])
    .index("by_legacy", ["legacyId"]),

  subscriptions: defineTable({
    organizationId: v.string(),
    plan: v.string(),
    stripeCustomerId: v.optional(v.string()),
    stripeSubscriptionId: v.optional(v.string()),
    status: v.optional(v.string()),
    periodStart: v.optional(v.number()),
    periodEnd: v.optional(v.number()),
    cancelAtPeriodEnd: v.optional(v.boolean()),
    trialReminderScheduledAt: v.optional(v.number()),
    trialCreditsExpireScheduledAt: v.optional(v.number()),
    // Intentional any: admin overrides are sparse plan-limit JSON objects.
    overrideLimits: v.optional(v.any()),
    ...timestamps,
    ...legacy,
  })
    .index("by_organization", ["organizationId"])
    .index("by_status_plan", ["status", "plan"])
    .index("by_plan", ["plan"])
    .index("by_legacy", ["legacyId"])
    .index("by_stripe_customer", ["stripeCustomerId"])
    .index("by_stripe_subscription", ["stripeSubscriptionId"]),

  customProviderApiKeys: defineTable({
    organizationId: v.string(),
    provider: v.string(),
    encryptedKey: v.string(),
    label: v.optional(v.string()),
    start: v.optional(v.string()),
    ...timestamps,
    ...legacy,
  })
    .index("by_organization", ["organizationId"])
    .index("by_legacy", ["legacyId"])
    .index("by_organization_provider", ["organizationId", "provider"]),

  customApiKeyUsage: defineTable({
    organizationId: v.string(),
    provider: v.string(),
    model: v.string(),
    requestCount: v.number(),
    totalCost: v.optional(v.number()),
    ...timestamps,
    ...legacy,
  })
    .index("by_organization", ["organizationId"])
    .index("by_legacy", ["legacyId"])
    .index("by_organization_provider", ["organizationId", "provider"]),

  customApiKeyUsageStats: defineTable({
    organizationId: v.string(),
    provider: v.string(),
    period: v.string(),
    periodKey: v.string(),
    requestCount: v.number(),
    ...timestamps,
    ...legacy,
  })
    .index("by_organization", ["organizationId"])
    .index("by_legacy", ["legacyId"])
    .index("by_organization_provider_period_key", [
      "organizationId",
      "provider",
      "period",
      "periodKey",
    ]),

  referralProfiles: defineTable({
    userId: v.string(),
    code: v.string(),
    payoutEmail: v.optional(v.string()),
    ...timestamps,
    ...legacy,
  })
    .index("by_user", ["userId"])
    .index("by_legacy", ["legacyId"])
    .index("by_created", ["createdAt"])
    .index("by_code", ["code"]),

  referralRecords: defineTable({
    profileId: v.id("referralProfiles"),
    referredUserId: v.optional(v.string()),
    referredOrganizationId: v.optional(v.string()),
    status: v.string(),
    rewardAmount: v.optional(v.number()),
    ...timestamps,
    ...legacy,
  })
    .index("by_profile", ["profileId"])
    .index("by_legacy", ["legacyId"])
    .index("by_status", ["status"])
    .index("by_created", ["createdAt"]),

  referralSettings: defineTable({
    key: v.string(),
    // Intentional any: referral settings stores versioned JSON config.
    value: v.any(),
    ...timestamps,
    ...legacy,
  })
    .index("by_key", ["key"])
    .index("by_legacy", ["legacyId"]),
});
