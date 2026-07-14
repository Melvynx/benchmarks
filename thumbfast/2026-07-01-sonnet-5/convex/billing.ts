/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unnecessary-condition */
// Intentional any: this legacy Convex module still uses dynamic component and table APIs that cannot be typed precisely without a larger generated-API migration.
import { components, internal } from "./_generated/api";
import {
  action,
  internalMutation,
  internalQuery,
  mutation,
  query,
} from "./_generated/server";
import { authComponent, requireAuth } from "./auth/config";
import { v } from "convex/values";
import { getPlanLimitsWithOverrides } from "./generationConfig";
import { createSignupFingerprint } from "./signupCredits";

const MAX_ROWS = 500;
const CREDIT_LOGS_PAGE_SIZE = 100;
const internalApi = internal as any;
const ACTIVE_SUBSCRIPTION_STATUSES = new Set([
  "active",
  "trialing",
  "lifetime",
]);
const customProviderValidator = v.union(
  v.literal("openai"),
  v.literal("gemini"),
  v.literal("apiyi"),
);
type CustomProvider = "openai" | "gemini" | "apiyi";
const CUSTOM_USAGE_PROVIDERS = ["openai", "gemini", "apiyi"] as const;
const CUSTOM_USAGE_STATS_BACKFILL_ORG_ID = "__custom_api_key_usage_stats__";
const CUSTOM_USAGE_STATS_BACKFILL_PROVIDER = "__backfill__";
const CUSTOM_USAGE_STATS_BACKFILL_PERIOD = "status";
const CUSTOM_USAGE_STATS_BACKFILL_PERIOD_KEY = "complete";
const ONBOARDING_TRIAL_OFFER = {
  key: "onboarding_trial",
  plan: "pro",
  annual: false,
  trialDays: 7,
  trialCredits: 50,
} as const;

type CustomApiKeyUsageRow = {
  organizationId: string;
  provider: string;
  createdAt: number;
  requestCount?: number;
};
type CustomApiKeyUsageStatsRow = {
  provider: string;
  period: string;
  periodKey: string;
  requestCount: number;
};

type CustomApiKeyUsageTotals = Record<
  CustomProvider,
  { total: number; thisMonth: number }
>;
type CustomApiKeyUsageChartPoint = Record<CustomProvider, number> & {
  date: string;
};
const CUSTOM_USAGE_TOTAL_PERIOD = "total";
const CUSTOM_USAGE_DAY_PERIOD = "day";
const CUSTOM_USAGE_TOTAL_PERIOD_KEY = "all";

const PLANS = [
  {
    name: "pro",
    priceId: process.env.STRIPE_PRO_PLAN_ID ?? "",
    annualDiscountPriceId: process.env.STRIPE_PRO_YEARLY_PLAN_ID ?? "",
  },
  {
    name: "ultra",
    priceId: process.env.STRIPE_ULTRA_PLAN_ID ?? "",
    annualDiscountPriceId: process.env.STRIPE_ULTRA_YEARLY_PLAN_ID ?? "",
  },
  {
    name: "poweruser",
    priceId: process.env.STRIPE_POWERUSER_PRICE_ID ?? "",
    isLifetime: true,
  },
] as const;

const CREDIT_PACKS = [
  {
    id: "thumbnails_10",
    credits: 10,
    priceId: process.env.STRIPE_CREDITS_10_PRICE_ID ?? "",
  },
  {
    id: "thumbnails_50",
    credits: 50,
    priceId: process.env.STRIPE_CREDITS_50_PRICE_ID ?? "",
  },
  {
    id: "thumbnails_150",
    credits: 150,
    priceId: process.env.STRIPE_CREDITS_150_PRICE_ID ?? "",
  },
] as const;

async function requireUser(ctx: any) {
  const user = await authComponent.getAuthUser(ctx as never);
  return {
    id: String(user._id),
    email: user.email,
    name: user.name,
    role: (user as { role?: string }).role,
  };
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
    member,
    org: {
      id: String(org._id),
      name: org.name,
      slug: org.slug,
      logo: org.logo ?? null,
      stripeCustomerId: org.stripeCustomerId ?? null,
    },
  };
}

function requireBillingManager(member: { role?: string }) {
  if (member.role !== "owner" && member.role !== "admin") {
    throw new Error("Only organization admins can manage billing");
  }
}

function requireProductAdmin(user: { role?: string }) {
  if (user.role !== "admin") {
    throw new Error("Only product admins can manage APIYI keys");
  }
}

function assertMigrationSecret(secret: string) {
  const expected = process.env.MIGRATION_SECRET;
  if (!expected || secret !== expected) {
    throw new Error("Invalid migration secret");
  }
}

function getProviderLabel(provider: CustomProvider) {
  if (provider === "openai") return "OpenAI";
  if (provider === "gemini") return "Gemini";
  return "APIYI";
}

export function summarizeCustomApiKeyUsage(
  usageRows: CustomApiKeyUsageRow[],
  options: {
    now?: number;
    includeApiyi?: boolean;
  } = {},
): {
  totals: CustomApiKeyUsageTotals;
  chartData: CustomApiKeyUsageChartPoint[];
} {
  const now = options.now ?? Date.now();
  const monthStart = new Date(now);
  monthStart.setUTCDate(1);
  monthStart.setUTCHours(0, 0, 0, 0);
  const chartStart = now - 29 * 24 * 60 * 60 * 1000;
  const chartMap = new Map<string, CustomApiKeyUsageChartPoint>();
  for (let index = 0; index < 30; index += 1) {
    const date = new Date(chartStart + index * 24 * 60 * 60 * 1000)
      .toISOString()
      .slice(0, 10);
    chartMap.set(date, { date, openai: 0, gemini: 0, apiyi: 0 });
  }
  const totals: CustomApiKeyUsageTotals = {
    openai: { total: 0, thisMonth: 0 },
    gemini: { total: 0, thisMonth: 0 },
    apiyi: { total: 0, thisMonth: 0 },
  };

  for (const usage of usageRows) {
    if (
      usage.provider !== "openai" &&
      usage.provider !== "gemini" &&
      usage.provider !== "apiyi"
    ) {
      continue;
    }
    if (usage.provider === "apiyi" && options.includeApiyi === false) continue;
    const count = usage.requestCount ?? 0;
    totals[usage.provider].total += count;
    if (usage.createdAt >= monthStart.getTime()) {
      totals[usage.provider].thisMonth += count;
    }
    const date = new Date(usage.createdAt).toISOString().slice(0, 10);
    const point = chartMap.get(date);
    if (point) point[usage.provider] += count;
  }

  return {
    totals,
    chartData: Array.from(chartMap.values()),
  };
}

export function summarizeCustomApiKeyUsageStats(
  statsRows: CustomApiKeyUsageStatsRow[],
  options: {
    now?: number;
    includeApiyi?: boolean;
  } = {},
): {
  totals: CustomApiKeyUsageTotals;
  chartData: CustomApiKeyUsageChartPoint[];
} {
  const now = options.now ?? Date.now();
  const monthStart = new Date(now);
  monthStart.setUTCDate(1);
  monthStart.setUTCHours(0, 0, 0, 0);
  const monthStartKey = toCustomUsageDayKey(monthStart.getTime());
  const chartStart = now - 29 * 24 * 60 * 60 * 1000;
  const chartMap = new Map<string, CustomApiKeyUsageChartPoint>();
  for (let index = 0; index < 30; index += 1) {
    const date = toCustomUsageDayKey(chartStart + index * 24 * 60 * 60 * 1000);
    chartMap.set(date, { date, openai: 0, gemini: 0, apiyi: 0 });
  }
  const totals: CustomApiKeyUsageTotals = {
    openai: { total: 0, thisMonth: 0 },
    gemini: { total: 0, thisMonth: 0 },
    apiyi: { total: 0, thisMonth: 0 },
  };

  for (const row of statsRows) {
    if (
      row.provider !== "openai" &&
      row.provider !== "gemini" &&
      row.provider !== "apiyi"
    ) {
      continue;
    }
    if (row.provider === "apiyi" && options.includeApiyi === false) continue;

    if (
      row.period === CUSTOM_USAGE_TOTAL_PERIOD &&
      row.periodKey === CUSTOM_USAGE_TOTAL_PERIOD_KEY
    ) {
      totals[row.provider].total += row.requestCount;
      continue;
    }

    if (row.period !== CUSTOM_USAGE_DAY_PERIOD) continue;
    if (row.periodKey >= monthStartKey) {
      totals[row.provider].thisMonth += row.requestCount;
    }
    const point = chartMap.get(row.periodKey);
    if (point) point[row.provider] += row.requestCount;
  }

  return {
    totals,
    chartData: Array.from(chartMap.values()),
  };
}

function toCustomUsageDayKey(timestamp: number) {
  return new Date(timestamp).toISOString().slice(0, 10);
}

function getCustomUsageQueryStartKey(now: number) {
  const monthStart = new Date(now);
  monthStart.setUTCDate(1);
  monthStart.setUTCHours(0, 0, 0, 0);
  const chartStart = now - 29 * 24 * 60 * 60 * 1000;
  return toCustomUsageDayKey(Math.min(monthStart.getTime(), chartStart));
}

async function collectCustomApiKeyUsageStats(ctx: any, organizationId: string) {
  const now = Date.now();
  const dayStartKey = getCustomUsageQueryStartKey(now);
  const statsByProvider = await Promise.all(
    CUSTOM_USAGE_PROVIDERS.map(async (provider) => {
      const [total, days] = await Promise.all([
        ctx.db
          .query("customApiKeyUsageStats")
          .withIndex("by_organization_provider_period_key", (q: any) =>
            q
              .eq("organizationId", organizationId)
              .eq("provider", provider)
              .eq("period", CUSTOM_USAGE_TOTAL_PERIOD)
              .eq("periodKey", CUSTOM_USAGE_TOTAL_PERIOD_KEY),
          )
          .first(),
        ctx.db
          .query("customApiKeyUsageStats")
          .withIndex("by_organization_provider_period_key", (q: any) =>
            q
              .eq("organizationId", organizationId)
              .eq("provider", provider)
              .eq("period", CUSTOM_USAGE_DAY_PERIOD)
              .gte("periodKey", dayStartKey),
          )
          .collect(),
      ]);

      return [total, ...days].filter(Boolean);
    }),
  );

  return statsByProvider.flat() as CustomApiKeyUsageStatsRow[];
}

async function hasCustomApiKeyUsageStatsBackfill(ctx: any) {
  const backfill = await ctx.db
    .query("customApiKeyUsageStats")
    .withIndex("by_organization_provider_period_key", (q: any) =>
      q
        .eq("organizationId", CUSTOM_USAGE_STATS_BACKFILL_ORG_ID)
        .eq("provider", CUSTOM_USAGE_STATS_BACKFILL_PROVIDER)
        .eq("period", CUSTOM_USAGE_STATS_BACKFILL_PERIOD)
        .eq("periodKey", CUSTOM_USAGE_STATS_BACKFILL_PERIOD_KEY),
    )
    .first();
  return Boolean(backfill);
}

async function incrementCustomApiKeyUsageStat(
  ctx: any,
  args: {
    organizationId: string;
    provider: CustomProvider;
    period: string;
    periodKey: string;
    requestCount: number;
    now: number;
  },
) {
  const existing = await ctx.db
    .query("customApiKeyUsageStats")
    .withIndex("by_organization_provider_period_key", (q: any) =>
      q
        .eq("organizationId", args.organizationId)
        .eq("provider", args.provider)
        .eq("period", args.period)
        .eq("periodKey", args.periodKey),
    )
    .first();

  if (existing) {
    await ctx.db.patch(existing._id, {
      requestCount: existing.requestCount + args.requestCount,
      updatedAt: args.now,
    });
    return;
  }

  await ctx.db.insert("customApiKeyUsageStats", {
    organizationId: args.organizationId,
    provider: args.provider,
    period: args.period,
    periodKey: args.periodKey,
    requestCount: args.requestCount,
    createdAt: args.now,
    updatedAt: args.now,
  });
}

async function incrementCustomApiKeyUsageStats(
  ctx: any,
  args: {
    organizationId: string;
    provider: CustomProvider;
    requestCount: number;
    now: number;
  },
) {
  await Promise.all([
    incrementCustomApiKeyUsageStat(ctx, {
      ...args,
      period: CUSTOM_USAGE_TOTAL_PERIOD,
      periodKey: CUSTOM_USAGE_TOTAL_PERIOD_KEY,
    }),
    incrementCustomApiKeyUsageStat(ctx, {
      ...args,
      period: CUSTOM_USAGE_DAY_PERIOD,
      periodKey: toCustomUsageDayKey(args.now),
    }),
  ]);
}

async function rebuildCustomApiKeyUsageStatsFromRows(
  ctx: any,
  usageRows: CustomApiKeyUsageRow[],
) {
  const stats = await ctx.db.query("customApiKeyUsageStats").collect();
  await Promise.all(stats.map((row: any) => ctx.db.delete(row._id)));
  const statMap = new Map<
    string,
    {
      organizationId: string;
      provider: CustomProvider;
      period: string;
      periodKey: string;
      requestCount: number;
      createdAt: number;
      updatedAt: number;
    }
  >();

  for (const usage of usageRows) {
    if (
      usage.provider !== "openai" &&
      usage.provider !== "gemini" &&
      usage.provider !== "apiyi"
    ) {
      continue;
    }
    const requestCount = Math.max(1, Math.trunc(usage.requestCount ?? 1));
    const statKeys = [
      {
        period: CUSTOM_USAGE_TOTAL_PERIOD,
        periodKey: CUSTOM_USAGE_TOTAL_PERIOD_KEY,
      },
      {
        period: CUSTOM_USAGE_DAY_PERIOD,
        periodKey: toCustomUsageDayKey(usage.createdAt),
      },
    ];

    for (const statKey of statKeys) {
      const key = [
        usage.organizationId,
        usage.provider,
        statKey.period,
        statKey.periodKey,
      ].join(":");
      const existing = statMap.get(key);
      if (existing) {
        existing.requestCount += requestCount;
        existing.updatedAt = Math.max(existing.updatedAt, usage.createdAt);
        continue;
      }
      statMap.set(key, {
        organizationId: usage.organizationId,
        provider: usage.provider,
        period: statKey.period,
        periodKey: statKey.periodKey,
        requestCount,
        createdAt: usage.createdAt,
        updatedAt: usage.createdAt,
      });
    }
  }

  await Promise.all(
    [
      ...Array.from(statMap.values()),
      {
        organizationId: CUSTOM_USAGE_STATS_BACKFILL_ORG_ID,
        provider: CUSTOM_USAGE_STATS_BACKFILL_PROVIDER,
        period: CUSTOM_USAGE_STATS_BACKFILL_PERIOD,
        periodKey: CUSTOM_USAGE_STATS_BACKFILL_PERIOD_KEY,
        requestCount: usageRows.length,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
    ].map((row) => ctx.db.insert("customApiKeyUsageStats", row)),
  );
  return { rawRows: usageRows.length, statsRows: statMap.size };
}

async function collectRawCustomApiKeyUsage(ctx: any) {
  return (await ctx.db
    .query("customApiKeyUsage")
    .collect()) as CustomApiKeyUsageRow[];
}

async function collectRawCustomApiKeyUsageForOrg(
  ctx: any,
  organizationId: string,
) {
  // Fallback path only (runs until the stats backfill marker exists). Capped
  // so a heavy-usage org cannot push getBillingSummary over query read
  // limits; the summary may undercount in fallback mode for such orgs.
  return (await ctx.db
    .query("customApiKeyUsage")
    .withIndex("by_organization", (q: any) =>
      q.eq("organizationId", organizationId),
    )
    .take(5000)) as CustomApiKeyUsageRow[];
}

function getServerUrl() {
  const raw =
    process.env.BETTER_AUTH_URL ??
    process.env.SITE_URL ??
    process.env.VERCEL_PROJECT_PRODUCTION_URL ??
    process.env.VERCEL_URL ??
    "http://localhost:3000";
  return raw.startsWith("http") ? raw : `https://${raw}`;
}

function appendCheckoutSessionParam(url: string) {
  const separator = url.includes("?") ? "&" : "?";
  return `${url}${separator}session_id={CHECKOUT_SESSION_ID}`;
}

async function getTrialFingerprintForCurrentSession(ctx: any) {
  const auth = await requireAuth(ctx as never);
  const session = (auth.session as { session?: unknown }).session as
    | { ipAddress?: string | null; userAgent?: string | null }
    | undefined;

  return createSignupFingerprint({
    ipAddress: session?.ipAddress,
    userAgent: session?.userAgent,
  });
}

function randomToken(bytes = 24) {
  const values = new Uint8Array(bytes);
  crypto.getRandomValues(values);
  return Array.from(values, (value) =>
    value.toString(16).padStart(2, "0"),
  ).join("");
}

export const upgradeOrg = action({
  args: {
    orgSlug: v.string(),
    plan: v.string(),
    annual: v.boolean(),
    successUrl: v.string(),
    cancelUrl: v.string(),
    offer: v.optional(v.literal(ONBOARDING_TRIAL_OFFER.key)),
  },
  handler: async (ctx, args) => {
    const { member, org, user } = await requireOrg(ctx, args.orgSlug);
    requireBillingManager(member);
    const subscription = await ctx.runQuery(
      internalApi.billing.getSubscriptionForOrg,
      { organizationId: org.id },
    );

    if (subscription?.plan === "poweruser") {
      throw new Error("Lifetime plan users cannot change plans");
    }

    const plan = PLANS.find((candidate) => candidate.name === args.plan);
    if (!plan) throw new Error(`Plan "${args.plan}" not found`);

    const isLifetimePlan = args.plan === "poweruser";
    const isOnboardingTrial = args.offer === ONBOARDING_TRIAL_OFFER.key;
    if (
      isOnboardingTrial &&
      (args.plan !== ONBOARDING_TRIAL_OFFER.plan ||
        args.annual !== ONBOARDING_TRIAL_OFFER.annual ||
        isLifetimePlan)
    ) {
      throw new Error("This trial offer is not available for this plan");
    }
    if (isOnboardingTrial && subscription?.stripeSubscriptionId) {
      throw new Error("This trial offer has already been used");
    }
    const trialFingerprint = isOnboardingTrial
      ? await getTrialFingerprintForCurrentSession(ctx)
      : null;
    if (isOnboardingTrial) {
      if (!trialFingerprint) {
        throw new Error(
          "We could not verify this device for the free trial. Please try again from a signed-in browser session.",
        );
      }
      const existingTrial = await ctx.runQuery(
        internalApi.billing.getTrialRedemptionForUserOrFingerprint,
        {
          userId: user.id,
          fingerprint: trialFingerprint ?? undefined,
        },
      );
      if (existingTrial) {
        if (
          existingTrial.status === "pending" &&
          existingTrial.stripeCheckoutSessionUrl &&
          existingTrial.userId === user.id &&
          existingTrial.organizationId === org.id
        ) {
          return { url: existingTrial.stripeCheckoutSessionUrl };
        }
        throw new Error(
          "This free trial has already been used for this account or device.",
        );
      }
    }
    const priceId = isLifetimePlan
      ? plan.priceId
      : args.annual
        ? "annualDiscountPriceId" in plan
          ? plan.annualDiscountPriceId
          : ""
        : plan.priceId;
    if (!priceId) throw new Error(`Price ID not found for plan "${args.plan}"`);

    let stripeCustomerId =
      org.stripeCustomerId ?? subscription?.stripeCustomerId ?? null;
    if (!stripeCustomerId) {
      const customer = await ctx.runAction(
        internalApi.billingNode.createStripeCustomer,
        {
          email: user.email ?? undefined,
          name: user.name ?? org.name,
          organizationId: org.id,
        },
      );
      stripeCustomerId = customer.id;
      await ctx.runMutation(components.betterAuth.data.patchOrganization, {
        organizationId: org.id,
        update: { stripeCustomerId },
      });
    }

    const serverUrl = getServerUrl();
    const session = await ctx.runAction(
      internalApi.billingNode.createSubscriptionCheckoutSession,
      {
        customerId: stripeCustomerId,
        priceId,
        successUrl: appendCheckoutSessionParam(
          `${serverUrl}${args.successUrl}`,
        ),
        cancelUrl: `${serverUrl}${args.cancelUrl}`,
        organizationId: org.id,
        plan: args.plan,
        isLifetimePlan,
        offer: isOnboardingTrial ? ONBOARDING_TRIAL_OFFER.key : undefined,
        trialUserId: isOnboardingTrial ? user.id : undefined,
        trialFingerprint: trialFingerprint ?? undefined,
        trialDays: isOnboardingTrial
          ? ONBOARDING_TRIAL_OFFER.trialDays
          : undefined,
        trialCredits: isOnboardingTrial
          ? ONBOARDING_TRIAL_OFFER.trialCredits
          : undefined,
      },
    );
    if (isOnboardingTrial) {
      const redemption = await ctx.runMutation(
        internalApi.billing.recordTrialRedemption,
        {
          organizationId: org.id,
          userId: user.id,
          fingerprint: trialFingerprint,
          status: "pending",
          stripeCustomerId,
          stripeCheckoutSessionId: session.id,
          stripeCheckoutSessionUrl: session.url,
          checkoutExpiresAt: session.expiresAt ?? undefined,
        },
      );
      if (!redemption.created) {
        await ctx.runAction(
          internalApi.billingNode.expireStripeCheckoutSession,
          {
            sessionId: session.id,
          },
        );
        throw new Error(
          "This free trial has already been used for this account or device.",
        );
      }
    }
    return { url: session.url };
  },
});

export const openStripePortal = action({
  args: {
    orgSlug: v.string(),
    returnUrl: v.string(),
  },
  handler: async (ctx, args): Promise<{ url: string }> => {
    const { member, org } = await requireOrg(ctx, args.orgSlug);
    requireBillingManager(member);
    const subscription = await ctx.runQuery(
      internalApi.billing.getSubscriptionForOrg,
      { organizationId: org.id },
    );
    if (subscription?.plan === "poweruser") {
      throw new Error("Lifetime plan users cannot manage subscription");
    }

    const stripeCustomerId =
      org.stripeCustomerId ?? subscription?.stripeCustomerId ?? null;
    if (!stripeCustomerId) throw new Error("No Stripe customer found");

    const session = await ctx.runAction(
      internalApi.billingNode.createStripePortalSession,
      {
        customerId: stripeCustomerId,
        returnUrl: `${getServerUrl()}${args.returnUrl}`,
      },
    );

    return { url: session.url };
  },
});

export const purchaseCredits = action({
  args: {
    orgSlug: v.string(),
    packId: v.string(),
    successUrl: v.string(),
    cancelUrl: v.string(),
  },
  handler: async (ctx, args): Promise<{ url: string }> => {
    const { member, org, user } = await requireOrg(ctx, args.orgSlug);
    requireBillingManager(member);
    const subscription = await ctx.runQuery(
      internalApi.billing.getSubscriptionForOrg,
      { organizationId: org.id },
    );
    if (subscription?.plan === "poweruser") {
      throw new Error("Lifetime plan users cannot buy credits");
    }
    if (!subscription?.plan || subscription.plan === "free") {
      throw new Error("Buying credit packs requires a paid plan");
    }
    if (
      !subscription.status ||
      !["active", "trialing"].includes(subscription.status)
    ) {
      throw new Error("Your subscription must be active to buy credit packs.");
    }

    const pack = CREDIT_PACKS.find((candidate) => candidate.id === args.packId);
    if (!pack) throw new Error("Credit pack not found");
    if (!pack.priceId) throw new Error("Credit pack price is not configured");

    let stripeCustomerId =
      org.stripeCustomerId ?? subscription?.stripeCustomerId ?? null;
    if (!stripeCustomerId) {
      const customer = await ctx.runAction(
        internalApi.billingNode.createStripeCustomer,
        {
          email: user.email ?? undefined,
          name: user.name ?? org.name,
          organizationId: org.id,
        },
      );
      stripeCustomerId = customer.id;
      await ctx.runMutation(components.betterAuth.data.patchOrganization, {
        organizationId: org.id,
        update: { stripeCustomerId },
      });
    }

    const serverUrl = getServerUrl();
    const session = await ctx.runAction(
      internalApi.billingNode.createCreditCheckoutSession,
      {
        customerId: stripeCustomerId,
        priceId: pack.priceId,
        successUrl: `${serverUrl}${args.successUrl}?session_id={CHECKOUT_SESSION_ID}`,
        cancelUrl: `${serverUrl}${args.cancelUrl}`,
        organizationId: org.id,
        credits: pack.credits,
        packId: pack.id,
      },
    );

    return { url: session.url };
  },
});

export const getPaymentSummary = action({
  args: { orgSlug: v.string() },
  handler: async (ctx, args) => {
    const { member, org } = await requireOrg(ctx, args.orgSlug);
    requireBillingManager(member);
    const subscription = await ctx.runQuery(
      internalApi.billing.getSubscriptionForOrg,
      { organizationId: org.id },
    );
    const stripeCustomerId =
      org.stripeCustomerId ?? subscription?.stripeCustomerId ?? null;
    if (!stripeCustomerId) return { invoices: [], upcomingInvoice: null };

    return ctx.runAction(internalApi.billingNode.getStripePaymentSummary, {
      customerId: stripeCustomerId,
    });
  },
});

export const getCheckoutSessionSummary = action({
  args: {
    orgSlug: v.string(),
    sessionId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireOrg(ctx, args.orgSlug);
    if (!args.sessionId) return { type: "unknown", credits: null };

    return ctx.runAction(
      internalApi.billingNode.getStripeCheckoutSessionSummary,
      {
        sessionId: args.sessionId,
      },
    );
  },
});

export const getBillingSummary = query({
  args: { orgSlug: v.string() },
  handler: async (ctx, args) => {
    const { member, org, user } = await requireOrg(ctx, args.orgSlug);
    requireBillingManager(member);
    const [
      subscriptions,
      balance,
      transactions,
      providerKeys,
      customApiKeyUsageStats,
      customApiKeyUsageStatsBackfilled,
    ] = await Promise.all([
      ctx.db
        .query("subscriptions")
        .withIndex("by_organization", (q) => q.eq("organizationId", org.id))
        .take(MAX_ROWS),
      ctx.db
        .query("creditBalances")
        .withIndex("by_organization", (q) => q.eq("organizationId", org.id))
        .first(),
      ctx.db
        .query("creditTransactions")
        .withIndex("by_organization_created", (q) =>
          q.eq("organizationId", org.id),
        )
        .order("desc")
        .take(120),
      ctx.db
        .query("customProviderApiKeys")
        .withIndex("by_organization", (q) => q.eq("organizationId", org.id))
        .take(MAX_ROWS),
      collectCustomApiKeyUsageStats(ctx, org.id),
      hasCustomApiKeyUsageStatsBackfill(ctx),
    ]);
    const subscription =
      subscriptions.find((row) =>
        ACTIVE_SUBSCRIPTION_STATUSES.has(row.status ?? ""),
      ) ??
      subscriptions.sort((a, b) => b.createdAt - a.createdAt)[0] ??
      null;
    const plan = subscription?.plan ?? "free";
    const isProductAdmin = user.role === "admin";

    const customUsageSummary = customApiKeyUsageStatsBackfilled
      ? summarizeCustomApiKeyUsageStats(customApiKeyUsageStats, {
          includeApiyi: isProductAdmin,
        })
      : summarizeCustomApiKeyUsage(
          await collectRawCustomApiKeyUsageForOrg(ctx, org.id),
          {
            includeApiyi: isProductAdmin,
          },
        );

    return {
      org,
      subscription,
      plan,
      limits: getPlanLimitsWithOverrides(plan, subscription?.overrideLimits),
      credits: {
        balance: balance?.balance ?? 0,
        transactions: transactions.map((transaction) => ({
          id: String(transaction._id),
          amount: transaction.amount,
          type: transaction.type,
          reason: transaction.reason,
          createdAt: new Date(transaction.createdAt).toISOString(),
        })),
      },
      providerKeys: providerKeys
        .filter((key) => isProductAdmin || key.provider !== "apiyi")
        .map((key) => {
          const provider =
            key.provider === "openai" ||
            key.provider === "gemini" ||
            key.provider === "apiyi"
              ? key.provider
              : "gemini";
          return {
            id: String(key._id),
            provider,
            label: key.label ?? `${getProviderLabel(provider)} key`,
            maskedKey: key.start ? `${key.start}****` : null,
            createdAt: new Date(key.createdAt).toISOString(),
            updatedAt: new Date(key.updatedAt).toISOString(),
          };
        }),
      customApiKeyUsage: {
        totals: customUsageSummary.totals,
        chartData: customUsageSummary.chartData,
      },
    };
  },
});

export const listCreditTransactions = query({
  args: {
    orgSlug: v.string(),
    cursor: v.optional(v.union(v.string(), v.null())),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { member, org } = await requireOrg(ctx, args.orgSlug);
    requireBillingManager(member);
    const pageSize = Math.min(
      Math.max(args.limit ?? CREDIT_LOGS_PAGE_SIZE, 1),
      200,
    );

    const result = await ctx.db
      .query("creditTransactions")
      .withIndex("by_organization_created", (q) =>
        q.eq("organizationId", org.id),
      )
      .order("desc")
      .paginate({
        numItems: pageSize,
        cursor: args.cursor ?? null,
      });

    return {
      transactions: result.page.map((transaction) => ({
        id: String(transaction._id),
        amount: transaction.amount,
        type: transaction.type,
        reason: transaction.reason,
        createdAt: new Date(transaction.createdAt).toISOString(),
      })),
      continueCursor: result.continueCursor,
      isDone: result.isDone,
    };
  },
});

export const listApiKeys = query({
  args: { orgSlug: v.string() },
  handler: async (ctx, args) => {
    const { member, org } = await requireOrg(ctx, args.orgSlug);
    requireBillingManager(member);
    const keys = await ctx.runQuery(
      components.betterAuth.data.listApiKeysByOrganization,
      {
        organizationId: org.id,
        limit: MAX_ROWS,
      },
    );

    return {
      keys: keys.map((key: any) => ({
        id: String(key._id),
        name: key.name ?? "API key",
        start: key.start ?? null,
        prefix: key.prefix ?? null,
        enabled: key.enabled,
        createdAt: key.createdAt,
        updatedAt: key.updatedAt,
      })),
    };
  },
});

export const listCustomProviderApiKeys = query({
  args: { orgSlug: v.string() },
  handler: async (ctx, args) => {
    const { member, org, user } = await requireOrg(ctx, args.orgSlug);
    requireBillingManager(member);
    const isProductAdmin = user.role === "admin";
    const keys = await ctx.db
      .query("customProviderApiKeys")
      .withIndex("by_organization", (q) => q.eq("organizationId", org.id))
      .take(MAX_ROWS);

    return {
      keys: keys
        .filter((key) => isProductAdmin || key.provider !== "apiyi")
        .map((key) => ({
          id: String(key._id),
          provider: key.provider,
          label: key.label ?? `${key.provider} key`,
          maskedKey: key.start ? `${key.start}****` : null,
          createdAt: new Date(key.createdAt).toISOString(),
          updatedAt: new Date(key.updatedAt).toISOString(),
        })),
    };
  },
});

export const deleteCustomProviderApiKey = mutation({
  args: {
    orgSlug: v.string(),
    provider: customProviderValidator,
  },
  handler: async (ctx, args) => {
    const { member, org, user } = await requireOrg(ctx, args.orgSlug);
    requireBillingManager(member);
    if (args.provider === "apiyi") requireProductAdmin(user);
    const existing = await ctx.db
      .query("customProviderApiKeys")
      .withIndex("by_organization_provider", (q) =>
        q.eq("organizationId", org.id).eq("provider", args.provider),
      )
      .first();
    if (existing) await ctx.db.delete(existing._id);
    return { success: true };
  },
});

export const createApiKey = action({
  args: { orgSlug: v.string(), name: v.string() },
  handler: async (ctx, args) => {
    const { member, org } = await requireOrg(ctx, args.orgSlug);
    requireBillingManager(member);
    const key = `tf_${randomToken(32)}`;
    const start = key.slice(0, 12);
    const created = await ctx.runMutation(
      internalApi.billing.createApiKeyRecord,
      {
        organizationId: org.id,
        name: args.name.trim() || "API key",
        key,
        start,
      },
    );

    return { ...created, key };
  },
});

export const upsertCustomProviderApiKeyRecord = internalMutation({
  args: {
    organizationId: v.string(),
    provider: customProviderValidator,
    encryptedKey: v.string(),
    label: v.optional(v.string()),
    start: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const existing = await ctx.db
      .query("customProviderApiKeys")
      .withIndex("by_organization_provider", (q) =>
        q
          .eq("organizationId", args.organizationId)
          .eq("provider", args.provider),
      )
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        encryptedKey: args.encryptedKey,
        label: args.label,
        start: args.start,
        updatedAt: now,
      });
      return { id: String(existing._id), provider: args.provider };
    }

    const id = await ctx.db.insert("customProviderApiKeys", {
      organizationId: args.organizationId,
      provider: args.provider,
      encryptedKey: args.encryptedKey,
      label: args.label,
      start: args.start,
      createdAt: now,
      updatedAt: now,
    });
    return { id: String(id), provider: args.provider };
  },
});

export const recordCustomApiKeyUsage = internalMutation({
  args: {
    organizationId: v.string(),
    provider: customProviderValidator,
    model: v.string(),
    requestCount: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    await ctx.db.insert("customApiKeyUsage", {
      organizationId: args.organizationId,
      provider: args.provider,
      model: args.model,
      requestCount: args.requestCount ?? 1,
      createdAt: now,
      updatedAt: now,
    });
    await incrementCustomApiKeyUsageStats(ctx, {
      organizationId: args.organizationId,
      provider: args.provider,
      requestCount: args.requestCount ?? 1,
      now,
    });
    return { success: true };
  },
});

export const rebuildCustomApiKeyUsageStats = mutation({
  args: { secret: v.string() },
  handler: async (ctx, args) => {
    assertMigrationSecret(args.secret);
    return rebuildCustomApiKeyUsageStatsFromRows(
      ctx,
      await collectRawCustomApiKeyUsage(ctx),
    );
  },
});

export const deleteApiKey = mutation({
  args: { orgSlug: v.string(), keyId: v.string() },
  handler: async (ctx, args) => {
    const { member, org } = await requireOrg(ctx, args.orgSlug);
    requireBillingManager(member);
    const deleted = await ctx.runMutation(
      components.betterAuth.data.deleteApiKeyForOrganization,
      {
        keyId: args.keyId,
        organizationId: org.id,
      },
    );
    if (!deleted) throw new Error("API key not found");
    return { success: true };
  },
});

export const rotateApiKey = action({
  args: { orgSlug: v.string(), keyId: v.string() },
  handler: async (ctx, args) => {
    const { member, org } = await requireOrg(ctx, args.orgSlug);
    requireBillingManager(member);
    const key = `tf_${randomToken(32)}`;
    const start = key.slice(0, 12);
    const rotated = await ctx.runMutation(
      internalApi.billing.rotateApiKeyRecord,
      {
        organizationId: org.id,
        keyId: args.keyId,
        key,
        start,
      },
    );
    if (!rotated) throw new Error("API key not found");
    return { ...rotated, key };
  },
});

export const getSubscriptionForOrg = internalQuery({
  args: { organizationId: v.string() },
  handler: async (ctx, args) => {
    return ctx.db
      .query("subscriptions")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", args.organizationId),
      )
      .first();
  },
});

export const getSubscriptionByStripeSubscriptionId = internalQuery({
  args: { stripeSubscriptionId: v.string() },
  handler: async (ctx, args) => {
    return ctx.db
      .query("subscriptions")
      .withIndex("by_stripe_subscription", (q) =>
        q.eq("stripeSubscriptionId", args.stripeSubscriptionId),
      )
      .first();
  },
});

export const getTrialRedemptionForUserOrFingerprint = internalQuery({
  args: {
    userId: v.string(),
    fingerprint: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const isBlockingRedemption = (redemption: any) => {
      if (redemption.status === "started") return true;
      if (redemption.status !== "pending") return true;
      return (
        !redemption.checkoutExpiresAt || redemption.checkoutExpiresAt > now
      );
    };
    const byUser = await ctx.db
      .query("trialRedemptions")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .first();
    if (byUser && isBlockingRedemption(byUser)) return byUser;

    if (!args.fingerprint) return null;

    const byFingerprint = await ctx.db
      .query("trialRedemptions")
      .withIndex("by_fingerprint", (q) => q.eq("fingerprint", args.fingerprint))
      .first();
    return byFingerprint && isBlockingRedemption(byFingerprint)
      ? byFingerprint
      : null;
  },
});

export const upsertSubscriptionFromStripe = internalMutation({
  args: {
    organizationId: v.string(),
    plan: v.string(),
    stripeCustomerId: v.optional(v.string()),
    stripeSubscriptionId: v.optional(v.string()),
    status: v.optional(v.string()),
    periodStart: v.optional(v.number()),
    periodEnd: v.optional(v.number()),
    cancelAtPeriodEnd: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const byStripeId = args.stripeSubscriptionId
      ? await ctx.db
          .query("subscriptions")
          .withIndex("by_stripe_subscription", (q) =>
            q.eq("stripeSubscriptionId", args.stripeSubscriptionId),
          )
          .first()
      : null;
    const existing =
      byStripeId ??
      (await ctx.db
        .query("subscriptions")
        .withIndex("by_organization", (q) =>
          q.eq("organizationId", args.organizationId),
        )
        .first());
    const patch = {
      organizationId: args.organizationId,
      plan: args.plan,
      stripeCustomerId: args.stripeCustomerId,
      stripeSubscriptionId: args.stripeSubscriptionId,
      status: args.status,
      periodStart: args.periodStart,
      periodEnd: args.periodEnd,
      cancelAtPeriodEnd: args.cancelAtPeriodEnd,
      updatedAt: now,
    };

    if (existing) {
      await ctx.db.patch(existing._id, patch);
      return { id: String(existing._id), created: false };
    }

    const id = await ctx.db.insert("subscriptions", {
      ...patch,
      createdAt: now,
    });
    return { id: String(id), created: true };
  },
});

export const recordTrialRedemption = internalMutation({
  args: {
    organizationId: v.string(),
    userId: v.string(),
    fingerprint: v.optional(v.string()),
    status: v.optional(v.string()),
    stripeCustomerId: v.optional(v.string()),
    stripeSubscriptionId: v.optional(v.string()),
    stripeCheckoutSessionId: v.optional(v.string()),
    stripeCheckoutSessionUrl: v.optional(v.string()),
    checkoutExpiresAt: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const existing = await ctx.db
      .query("trialRedemptions")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .first();
    const existingByFingerprint = args.fingerprint
      ? await ctx.db
          .query("trialRedemptions")
          .withIndex("by_fingerprint", (q) =>
            q.eq("fingerprint", args.fingerprint),
          )
          .first()
      : null;
    const existingRecord = existing ?? existingByFingerprint;
    if (existingRecord) {
      const existingIsExpiredPending =
        existingRecord.status === "pending" &&
        existingRecord.checkoutExpiresAt &&
        existingRecord.checkoutExpiresAt <= now;
      const isSameCheckout =
        args.stripeCheckoutSessionId &&
        args.stripeCheckoutSessionId === existingRecord.stripeCheckoutSessionId;

      if (existingIsExpiredPending || isSameCheckout) {
        await ctx.db.patch(existingRecord._id, {
          organizationId: args.organizationId,
          userId: args.userId,
          fingerprint: args.fingerprint,
          status: args.status ?? existingRecord.status,
          stripeCustomerId: args.stripeCustomerId,
          stripeSubscriptionId:
            args.stripeSubscriptionId ?? existingRecord.stripeSubscriptionId,
          stripeCheckoutSessionId:
            args.stripeCheckoutSessionId ??
            existingRecord.stripeCheckoutSessionId,
          stripeCheckoutSessionUrl:
            args.stripeCheckoutSessionUrl ??
            existingRecord.stripeCheckoutSessionUrl,
          checkoutExpiresAt:
            args.checkoutExpiresAt ?? existingRecord.checkoutExpiresAt,
          updatedAt: now,
        });
        return {
          id: String(existingRecord._id),
          created: true,
          stripeCheckoutSessionId:
            args.stripeCheckoutSessionId ??
            existingRecord.stripeCheckoutSessionId ??
            null,
        };
      }

      return {
        id: String(existingRecord._id),
        created: false,
        stripeCheckoutSessionId: existingRecord.stripeCheckoutSessionId ?? null,
      };
    }

    const id = await ctx.db.insert("trialRedemptions", {
      organizationId: args.organizationId,
      userId: args.userId,
      fingerprint: args.fingerprint,
      status: args.status ?? "started",
      stripeCustomerId: args.stripeCustomerId,
      stripeSubscriptionId: args.stripeSubscriptionId,
      stripeCheckoutSessionId: args.stripeCheckoutSessionId,
      stripeCheckoutSessionUrl: args.stripeCheckoutSessionUrl,
      checkoutExpiresAt: args.checkoutExpiresAt,
      createdAt: now,
      updatedAt: now,
    });
    return {
      id: String(id),
      created: true,
      stripeCheckoutSessionId: args.stripeCheckoutSessionId ?? null,
    };
  },
});

export const markTrialReminderScheduled = internalMutation({
  args: {
    stripeSubscriptionId: v.string(),
    scheduledAt: v.number(),
  },
  handler: async (ctx, args) => {
    const subscription = await ctx.db
      .query("subscriptions")
      .withIndex("by_stripe_subscription", (q) =>
        q.eq("stripeSubscriptionId", args.stripeSubscriptionId),
      )
      .first();
    if (!subscription || subscription.trialReminderScheduledAt) {
      return { scheduled: false };
    }

    await ctx.db.patch(subscription._id, {
      trialReminderScheduledAt: args.scheduledAt,
      updatedAt: Date.now(),
    });
    return { scheduled: true };
  },
});

export const markTrialCreditsExpirationScheduled = internalMutation({
  args: {
    stripeSubscriptionId: v.string(),
    scheduledAt: v.number(),
  },
  handler: async (ctx, args) => {
    const subscription = await ctx.db
      .query("subscriptions")
      .withIndex("by_stripe_subscription", (q) =>
        q.eq("stripeSubscriptionId", args.stripeSubscriptionId),
      )
      .first();
    if (!subscription || subscription.trialCreditsExpireScheduledAt) {
      return { scheduled: false };
    }

    await ctx.db.patch(subscription._id, {
      trialCreditsExpireScheduledAt: args.scheduledAt,
      updatedAt: Date.now(),
    });
    return { scheduled: true };
  },
});

export const createApiKeyRecord = internalMutation({
  args: {
    organizationId: v.string(),
    name: v.string(),
    key: v.string(),
    start: v.string(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const record = await ctx.runMutation(
      components.betterAuth.data.createApiKey,
      {
        data: {
          configId: "default",
          name: args.name,
          start: args.start,
          referenceId: args.organizationId,
          prefix: "tf",
          key: args.key,
          enabled: true,
          rateLimitEnabled: false,
          requestCount: 0,
          createdAt: now,
          updatedAt: now,
        },
      },
    );

    return {
      id: String(record._id),
      name: record.name ?? args.name,
      start: record.start ?? args.start,
      prefix: record.prefix ?? "tf",
      enabled: record.enabled,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    };
  },
});

export const rotateApiKeyRecord = internalMutation({
  args: {
    organizationId: v.string(),
    keyId: v.string(),
    key: v.string(),
    start: v.string(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.runQuery(
      components.betterAuth.data.getApiKeyForOrganization,
      {
        keyId: args.keyId,
        organizationId: args.organizationId,
      },
    );
    if (!existing) return null;

    await ctx.runMutation(
      components.betterAuth.data.deleteApiKeyForOrganization,
      {
        keyId: args.keyId,
        organizationId: args.organizationId,
      },
    );

    const created = await ctx.runMutation(
      internalApi.billing.createApiKeyRecord,
      {
        organizationId: args.organizationId,
        name: existing.name ?? "API key",
        key: args.key,
        start: args.start,
      },
    );
    return created;
  },
});
