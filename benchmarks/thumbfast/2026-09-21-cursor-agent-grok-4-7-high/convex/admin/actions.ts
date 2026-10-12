/* eslint-disable @typescript-eslint/no-explicit-any */
// Intentional any: this legacy Convex module still uses dynamic component and table APIs that cannot be typed precisely without a larger generated-API migration.
import { v } from "convex/values";
import Stripe from "stripe";
import { components, internal } from "../_generated/api";
import { action, internalMutation, internalQuery } from "../_generated/server";
import { requireAdmin } from "../auth/config";

const internalApi = internal as any;
const REFUND_PRICE_PER_CREDIT_CENTS = 20;
const MAX_ROWS = 500;
const DASHBOARD_PAGE_SIZE = 500;
const DASHBOARD_MONTH_COUNT = 6;
const paidSubscriptionStatuses = ["active", "trialing", "lifetime"] as const;
const dashboardBillingStatuses = [
  "active",
  "trialing",
  "lifetime",
  "past_due",
  "canceled",
] as const;
const dashboardCreatedTableValidator = v.union(
  v.literal("generations"),
  v.literal("thumbnails"),
  v.literal("thumbnailErrors"),
);

const dashboardSubscriptionStatusValidator = v.union(
  v.literal("active"),
  v.literal("trialing"),
  v.literal("lifetime"),
  v.literal("past_due"),
  v.literal("canceled"),
);

type DashboardMonth = {
  key: string;
  start: number;
  end: number;
};

type CreatedPage = {
  createdAt: number[];
  isDone: boolean;
  continueCursor: string | null;
};

type AfterPage = {
  createdAt: number[];
  count: number;
  isDone: boolean;
  nextAfterValue: number | null;
  nextAfterSeen: number;
};

type CountPage = {
  count: number;
  isDone: boolean;
  continueCursor: string | null;
};

type CreditPage = {
  total: number;
  isDone: boolean;
  continueCursor: string | null;
};

type SubscriptionPage = {
  rows: {
    organizationId: string;
    plan: string;
    status: string | null;
    stripeCustomerId: string | null;
    stripeSubscriptionId: string | null;
    createdAt: number;
  }[];
  isDone: boolean;
  continueCursor: string | null;
};

type StripeCurrency = {
  currency: string | null;
  mixed: boolean;
};

const planPrices = [
  {
    name: "pro",
    priceId: process.env.STRIPE_PRO_PLAN_ID ?? "",
    yearlyPriceId: process.env.STRIPE_PRO_YEARLY_PLAN_ID ?? "",
  },
  {
    name: "ultra",
    priceId: process.env.STRIPE_ULTRA_PLAN_ID ?? "",
    yearlyPriceId: process.env.STRIPE_ULTRA_YEARLY_PLAN_ID ?? "",
  },
  {
    name: "poweruser",
    priceId: process.env.STRIPE_POWERUSER_PRICE_ID ?? "",
    yearlyPriceId: "",
  },
] as const;

function getStripe() {
  const stripeSecret = process.env.STRIPE_SECRET_KEY;
  if (!stripeSecret) throw new Error("Stripe is not configured");
  return new Stripe(stripeSecret, { typescript: true });
}

function getPlanPrice(plan: string, annual: boolean) {
  const candidate = planPrices.find((item) => item.name === plan);
  if (!candidate) throw new Error(`Plan "${plan}" is not available`);

  const priceId = annual ? candidate.yearlyPriceId : candidate.priceId;
  if (!priceId) {
    throw new Error(`Stripe price is not configured for ${plan}`);
  }

  return priceId;
}

function getPlanFromPrice(priceId?: string | null) {
  if (!priceId) return "free";
  return (
    planPrices.find(
      (plan) => plan.priceId === priceId || plan.yearlyPriceId === priceId,
    )?.name ?? "free"
  );
}

function getDashboardPlanFromPrice(price?: Stripe.Price | null) {
  if (!price) return "free";

  const metadataPlan =
    typeof price.metadata.plan === "string" ? price.metadata.plan : null;
  const lookupKey =
    typeof price.lookup_key === "string" ? price.lookup_key : null;
  const envPlan = getPlanFromPrice(price.id);
  const value = metadataPlan ?? lookupKey ?? envPlan;

  if (value.startsWith("pro")) return "pro";
  if (value.startsWith("ultra")) return "ultra";
  if (value.startsWith("poweruser")) return "poweruser";
  return envPlan;
}

function getSubscriptionMonthlyAmountCents(subscription: Stripe.Subscription) {
  return subscription.items.data.reduce((sum, item) => {
    const amount = item.price.unit_amount ?? 0;
    const quantity = item.quantity ?? 1;
    const recurring = item.price.recurring;

    switch (recurring?.interval) {
      case "year":
        return sum + (amount * quantity) / 12;
      case "month":
        return sum + amount * quantity;
      case "week":
        return sum + (amount * quantity * 52) / 12;
      case "day":
        return sum + (amount * quantity * 365) / 12;
      default:
        return sum;
    }
  }, 0);
}

async function listStripeSubscriptions(
  stripe: Stripe,
  status: "active" | "trialing" | "past_due",
) {
  const subscriptions: Stripe.Subscription[] = [];

  await stripe.subscriptions
    .list({
      status,
      limit: 100,
      expand: ["data.items.data.price"],
    })
    .autoPagingEach((subscription) => {
      subscriptions.push(subscription);
    });

  return subscriptions;
}

const getDashboardMonths = () => {
  const now = new Date();
  return Array.from({ length: DASHBOARD_MONTH_COUNT }, (_, index) => {
    const offset = DASHBOARD_MONTH_COUNT - 1 - index;
    const start = new Date(now.getFullYear(), now.getMonth() - offset, 1);
    const end = new Date(now.getFullYear(), now.getMonth() - offset + 1, 1);

    return {
      key: `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, "0")}`,
      start: start.getTime(),
      end: end.getTime(),
    };
  });
};

const createCreatedSummary = (months: DashboardMonth[]) => ({
  total: 0,
  monthCounts: new Map(months.map((month) => [month.key, 0])),
});

function addCreatedAtToSummary(
  summary: ReturnType<typeof createCreatedSummary>,
  months: DashboardMonth[],
  createdAt: number,
) {
  summary.total += 1;
  const month = months.find(
    (candidate) => createdAt >= candidate.start && createdAt < candidate.end,
  );
  if (month) {
    summary.monthCounts.set(
      month.key,
      (summary.monthCounts.get(month.key) ?? 0) + 1,
    );
  }
}

const toGrowthRows = (
  summary: ReturnType<typeof createCreatedSummary>,
  months: DashboardMonth[],
) =>
  months.map((month) => ({
    date: month.key,
    count: summary.monthCounts.get(month.key) ?? 0,
  }));

const toTotalGrowthRows = (
  monthCreatedAt: number[],
  months: DashboardMonth[],
) =>
  months.map((month) => ({
    date: month.key,
    count: monthCreatedAt.filter(
      (createdAt) => createdAt >= month.start && createdAt < month.end,
    ).length,
    total: monthCreatedAt.filter((createdAt) => createdAt < month.end).length,
  }));

function mergeStripeCurrency(
  state: StripeCurrency,
  subscription: Stripe.Subscription,
) {
  for (const item of subscription.items.data) {
    const currency = item.price.currency;
    if (!state.currency) state.currency = currency;
    if (state.currency !== currency) state.mixed = true;
  }
}

function getSubscriptionPatch(
  subscription: Stripe.Subscription,
  fallbackPlan?: string,
) {
  const item = subscription.items.data[0] as
    | Stripe.SubscriptionItem
    | undefined;
  const priceId = item?.price.id;
  const metadata = subscription.metadata as Record<string, string | undefined>;

  return {
    plan: metadata.plan ?? fallbackPlan ?? getPlanFromPrice(priceId),
    stripeCustomerId:
      typeof subscription.customer === "string"
        ? subscription.customer
        : subscription.customer.id,
    stripeSubscriptionId: subscription.id,
    status: subscription.status,
    periodStart: item?.current_period_start
      ? item.current_period_start * 1000
      : undefined,
    periodEnd: item?.current_period_end
      ? item.current_period_end * 1000
      : undefined,
    cancelAtPeriodEnd: subscription.cancel_at_period_end,
  };
}

function mapCharge(charge: Stripe.Charge) {
  return {
    id: charge.id,
    amount: charge.amount,
    amountRefunded: charge.amount_refunded,
    currency: charge.currency,
    paid: charge.paid,
    refunded: charge.refunded,
    status: charge.refunded ? "refunded" : charge.status,
    createdAt: charge.created * 1000,
    receiptUrl: charge.receipt_url ?? null,
  };
}

function getLatestRefundableCharge(charges: Stripe.Charge[]) {
  return (
    charges.find(
      (charge) =>
        charge.paid &&
        !charge.refunded &&
        charge.amount - charge.amount_refunded > 0,
    ) ?? null
  );
}

function computeRefundPreview(
  charge: Stripe.Charge | null,
  usedCredits: number,
) {
  if (!charge) return null;

  const remainingRefundableCents = Math.max(
    0,
    charge.amount - charge.amount_refunded,
  );
  const usedValueCents = Math.round(
    usedCredits * REFUND_PRICE_PER_CREDIT_CENTS,
  );
  const refundCents = Math.max(
    0,
    Math.min(remainingRefundableCents, charge.amount - usedValueCents),
  );

  return {
    chargeId: charge.id,
    paidCents: charge.amount,
    alreadyRefundedCents: charge.amount_refunded,
    remainingRefundableCents,
    usedCredits,
    usedValueCents,
    refundCents,
    currency: charge.currency,
    createdAt: charge.created * 1000,
  };
}

export const getOrganizationBillingSource = internalQuery({
  args: { organizationId: v.string() },
  handler: async (ctx, args) => {
    const rawOrgResult = await ctx.runQuery(
      components.betterAuth.data.getOrganizationById,
      { organizationId: args.organizationId },
    );
    if (!rawOrgResult) return null;
    const rawOrg = rawOrgResult as Record<string, unknown>;

    const subscriptions = await ctx.db
      .query("subscriptions")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", args.organizationId),
      )
      .take(MAX_ROWS);
    const newestSubscription =
      subscriptions.sort((a, b) => b.createdAt - a.createdAt).at(0) ?? null;
    const subscription =
      subscriptions.find((row) =>
        ["active", "trialing", "past_due", "lifetime"].includes(
          row.status ?? "",
        ),
      ) ?? newestSubscription;

    return {
      organization: {
        id: args.organizationId,
        name: String(rawOrg.name ?? ""),
        stripeCustomerId:
          typeof rawOrg.stripeCustomerId === "string"
            ? rawOrg.stripeCustomerId
            : null,
      },
      subscription,
      stripeCustomerId:
        (typeof rawOrg.stripeCustomerId === "string"
          ? rawOrg.stripeCustomerId
          : null) ??
        subscription?.stripeCustomerId ??
        null,
      stripeSubscriptionId: subscription?.stripeSubscriptionId ?? null,
    };
  },
});

export const getDashboardCreatedRowsPage = internalQuery({
  args: {
    table: dashboardCreatedTableValidator,
    cursor: v.optional(v.union(v.string(), v.null())),
  },
  handler: async (ctx, args) => {
    const db = ctx.db as any;
    const result = await db
      .query(args.table)
      .withIndex("by_created")
      .paginate({
        numItems: DASHBOARD_PAGE_SIZE,
        cursor: args.cursor ?? null,
      });

    return {
      createdAt: result.page.map((row: { createdAt: number }) => row.createdAt),
      isDone: result.isDone,
      continueCursor: result.continueCursor,
    };
  },
});

export const getDashboardOpenFeedbackPage = internalQuery({
  args: { cursor: v.optional(v.union(v.string(), v.null())) },
  handler: async (ctx, args) => {
    const result = await ctx.db
      .query("feedbacks")
      .withIndex("by_reply_closed_created", (q) =>
        q.eq("reply", undefined).eq("closedAt", undefined),
      )
      .paginate({
        numItems: DASHBOARD_PAGE_SIZE,
        cursor: args.cursor ?? null,
      });

    return {
      count: result.page.length,
      isDone: result.isDone,
      continueCursor: result.continueCursor,
    };
  },
});

export const getDashboardCreditBalancePage = internalQuery({
  args: { cursor: v.optional(v.union(v.string(), v.null())) },
  handler: async (ctx, args) => {
    const result = await ctx.db
      .query("creditBalances")
      .withIndex("by_organization")
      .paginate({
        numItems: DASHBOARD_PAGE_SIZE,
        cursor: args.cursor ?? null,
      });

    return {
      total: result.page.reduce((sum, row) => sum + row.balance, 0),
      isDone: result.isDone,
      continueCursor: result.continueCursor,
    };
  },
});

export const getDashboardSubscriptionsByStatusPage = internalQuery({
  args: {
    status: dashboardSubscriptionStatusValidator,
    cursor: v.optional(v.union(v.string(), v.null())),
  },
  handler: async (ctx, args) => {
    const result = await ctx.db
      .query("subscriptions")
      .withIndex("by_status_plan", (q) => q.eq("status", args.status))
      .paginate({
        numItems: DASHBOARD_PAGE_SIZE,
        cursor: args.cursor ?? null,
      });

    return {
      rows: result.page.map((row) => ({
        organizationId: row.organizationId,
        plan: row.plan,
        status: row.status ?? null,
        stripeCustomerId: row.stripeCustomerId ?? null,
        stripeSubscriptionId: row.stripeSubscriptionId ?? null,
        createdAt: row.createdAt,
      })),
      isDone: result.isDone,
      continueCursor: result.continueCursor,
    };
  },
});

export const getCreditUsageSince = internalQuery({
  args: { organizationId: v.string(), since: v.number() },
  handler: async (ctx, args) => {
    const transactions = await ctx.db
      .query("creditTransactions")
      .withIndex("by_organization_created", (q) =>
        q
          .eq("organizationId", args.organizationId)
          .gte("createdAt", args.since),
      )
      .order("desc")
      .take(MAX_ROWS);

    return transactions.reduce(
      (total, transaction) =>
        transaction.amount < 0 ? total + Math.abs(transaction.amount) : total,
      0,
    );
  },
});

export const recordRefund = internalMutation({
  args: {
    organizationId: v.string(),
    chargeId: v.string(),
    refundId: v.string(),
    refundCents: v.number(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("creditTransactions")
      .withIndex("by_organization_reference", (q) =>
        q
          .eq("organizationId", args.organizationId)
          .eq("referenceId", args.chargeId),
      )
      .take(MAX_ROWS);
    const alreadyRecorded = existing.some(
      (transaction) =>
        transaction.type === "refund" &&
        transaction.referenceId === args.chargeId,
    );

    if (alreadyRecorded) return { recorded: false };

    const now = Date.now();
    await ctx.db.insert("creditTransactions", {
      organizationId: args.organizationId,
      amount: 0,
      type: "refund",
      reason: `Admin refund ${args.refundId} for $${(args.refundCents / 100).toFixed(2)}`,
      referenceId: args.chargeId,
      createdAt: now,
      updatedAt: now,
    });

    return { recorded: true };
  },
});

async function readAuthCreatedSummary(
  ctx: any,
  kind: "user" | "organization",
  months: DashboardMonth[],
  now: number,
) {
  const summary = createCreatedSummary(months);
  const createdAtValues: number[] = [];
  let afterValue: number | null = null;
  let afterSeen = 0;

  for (;;) {
    // Cursor-like range windows are sequential by design; each page depends on the previous boundary.
    // eslint-disable-next-line no-await-in-loop
    const result: AfterPage = await ctx.runQuery(
      components.betterAuth.data.getAdminAuthDashboardPage,
      { kind, afterValue, afterSeen, now },
    );
    for (const createdAt of result.createdAt) {
      createdAtValues.push(createdAt);
      addCreatedAtToSummary(summary, months, createdAt);
    }
    if (result.isDone) break;
    afterValue = result.nextAfterValue;
    afterSeen = result.nextAfterSeen;
  }

  return {
    total: summary.total,
    growth: toTotalGrowthRows(createdAtValues, months),
  };
}

async function readActiveSessions(ctx: any, now: number) {
  let afterValue: number | null = null;
  let afterSeen = 0;
  let total = 0;

  for (;;) {
    // Cursor-like range windows are sequential by design; each page depends on the previous boundary.
    // eslint-disable-next-line no-await-in-loop
    const result: AfterPage = await ctx.runQuery(
      components.betterAuth.data.getAdminAuthDashboardPage,
      { kind: "activeSession", afterValue, afterSeen, now },
    );
    total += result.count;
    if (result.isDone) break;
    afterValue = result.nextAfterValue;
    afterSeen = result.nextAfterSeen;
  }

  return total;
}

async function readCreatedSummary(
  ctx: any,
  table: "generations" | "thumbnails" | "thumbnailErrors",
  months: DashboardMonth[],
) {
  const summary = createCreatedSummary(months);
  let cursor: string | null = null;

  for (;;) {
    // Cursor pagination is sequential by design; each page depends on the previous cursor.
    // eslint-disable-next-line no-await-in-loop
    const result: CreatedPage = await ctx.runQuery(
      internalApi.admin.actions.getDashboardCreatedRowsPage,
      { table, cursor },
    );
    for (const createdAt of result.createdAt) {
      addCreatedAtToSummary(summary, months, createdAt);
    }
    if (result.isDone) break;
    cursor = result.continueCursor;
  }

  return {
    total: summary.total,
    growth: toGrowthRows(summary, months),
  };
}

async function readOpenFeedback(ctx: any) {
  let cursor: string | null = null;
  let total = 0;

  for (;;) {
    // Cursor pagination is sequential by design; each page depends on the previous cursor.
    // eslint-disable-next-line no-await-in-loop
    const result: CountPage = await ctx.runQuery(
      internalApi.admin.actions.getDashboardOpenFeedbackPage,
      { cursor },
    );
    total += result.count;
    if (result.isDone) break;
    cursor = result.continueCursor;
  }

  return total;
}

async function readTotalCredits(ctx: any) {
  let cursor: string | null = null;
  let total = 0;

  for (;;) {
    // Cursor pagination is sequential by design; each page depends on the previous cursor.
    // eslint-disable-next-line no-await-in-loop
    const result: CreditPage = await ctx.runQuery(
      internalApi.admin.actions.getDashboardCreditBalancePage,
      { cursor },
    );
    total += result.total;
    if (result.isDone) break;
    cursor = result.continueCursor;
  }

  return total;
}

async function readSubscriptionsByStatus(ctx: any) {
  const rows: {
    organizationId: string;
    plan: string;
    status: string | null;
    stripeCustomerId: string | null;
    stripeSubscriptionId: string | null;
    createdAt: number;
  }[] = [];

  for (const status of dashboardBillingStatuses) {
    let cursor: string | null = null;

    for (;;) {
      // Cursor pagination is sequential by design; each page depends on the previous cursor.
      // eslint-disable-next-line no-await-in-loop
      const result: SubscriptionPage = await ctx.runQuery(
        internalApi.admin.actions.getDashboardSubscriptionsByStatusPage,
        { status, cursor },
      );
      rows.push(...result.rows);
      if (result.isDone) break;
      cursor = result.continueCursor;
    }
  }

  return rows;
}

function summarizeSubscriptions(
  subscriptions: Awaited<ReturnType<typeof readSubscriptionsByStatus>>,
) {
  const statusRank = new Map([
    ["active", 0],
    ["trialing", 1],
    ["lifetime", 2],
  ]);
  const paidByOrg = new Map<string, (typeof subscriptions)[number]>();

  for (const subscription of subscriptions) {
    if (!paidSubscriptionStatuses.includes(subscription.status as never)) {
      continue;
    }
    const existing = paidByOrg.get(subscription.organizationId);
    const rank = statusRank.get(subscription.status ?? "") ?? 99;
    const existingRank = statusRank.get(existing?.status ?? "") ?? 99;
    if (
      !existing ||
      rank < existingRank ||
      (rank === existingRank && subscription.createdAt > existing.createdAt)
    ) {
      paidByOrg.set(subscription.organizationId, subscription);
    }
  }

  const planCounts = Array.from(paidByOrg.values()).reduce<
    Record<string, number>
  >((counts, subscription) => {
    counts[subscription.plan] = (counts[subscription.plan] ?? 0) + 1;
    return counts;
  }, {});

  return {
    active: subscriptions.filter((row) => row.status === "active").length,
    trialing: subscriptions.filter((row) => row.status === "trialing").length,
    lifetime: subscriptions.filter((row) => row.status === "lifetime").length,
    pastDue: subscriptions.filter((row) => row.status === "past_due").length,
    canceled: subscriptions.filter((row) => row.status === "canceled").length,
    paidOrgs: paidByOrg.size,
    byPlan: Object.entries(planCounts)
      .map(([plan, count]) => ({ plan, count }))
      .sort((a, b) => b.count - a.count || a.plan.localeCompare(b.plan)),
  };
}

export const getDashboardSnapshot = action({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx as never);
    const now = Date.now();
    const months = getDashboardMonths();
    const stripe = getStripe();
    const [
      users,
      organizations,
      activeSessions,
      generations,
      thumbnails,
      errors,
      openFeedback,
      totalCredits,
      convexSubscriptions,
      active,
      trialing,
      pastDue,
    ] = await Promise.all([
      readAuthCreatedSummary(ctx, "user", months, now),
      readAuthCreatedSummary(ctx, "organization", months, now),
      readActiveSessions(ctx, now),
      readCreatedSummary(ctx, "generations", months),
      readCreatedSummary(ctx, "thumbnails", months),
      readCreatedSummary(ctx, "thumbnailErrors", months),
      readOpenFeedback(ctx),
      readTotalCredits(ctx),
      readSubscriptionsByStatus(ctx),
      listStripeSubscriptions(stripe, "active"),
      listStripeSubscriptions(stripe, "trialing"),
      listStripeSubscriptions(stripe, "past_due"),
    ]);
    const subscriptionSummary = summarizeSubscriptions(convexSubscriptions);
    const stripeSubscriptions = [...active, ...trialing, ...pastDue];
    const syncedStripeIds = new Set(
      convexSubscriptions.flatMap(
        (subscription: { stripeSubscriptionId: string | null }) =>
          subscription.stripeSubscriptionId
            ? [subscription.stripeSubscriptionId]
            : [],
      ),
    );
    const planCounts = new Map<string, number>();
    const stripeCurrency: StripeCurrency = { currency: null, mixed: false };
    const activeMrrCents = Math.round(
      active.reduce((total, subscription) => {
        mergeStripeCurrency(stripeCurrency, subscription);
        return total + getSubscriptionMonthlyAmountCents(subscription);
      }, 0),
    );
    const trialingMrrCents = Math.round(
      trialing.reduce((total, subscription) => {
        mergeStripeCurrency(stripeCurrency, subscription);
        return total + getSubscriptionMonthlyAmountCents(subscription);
      }, 0),
    );
    const pastDueMrrCents = Math.round(
      pastDue.reduce((total, subscription) => {
        mergeStripeCurrency(stripeCurrency, subscription);
        return total + getSubscriptionMonthlyAmountCents(subscription);
      }, 0),
    );

    for (const subscription of stripeSubscriptions) {
      const price = subscription.items.data.at(0)?.price;
      const plan = getDashboardPlanFromPrice(price);
      planCounts.set(plan, (planCounts.get(plan) ?? 0) + 1);
    }

    return {
      generatedAt: Date.now(),
      totalOrgs: organizations.total,
      totalUsers: users.total,
      activeSessions,
      premiumOrgs: subscriptionSummary.paidOrgs,
      totalGenerations: generations.total,
      totalThumbnails: thumbnails.total,
      openFeedback,
      openErrors: errors.total,
      totalCredits,
      subscriptionSummary,
      userGrowth: users.growth,
      organizationGrowth: organizations.growth,
      generationGrowth: generations.growth,
      thumbnailGrowth: thumbnails.growth,
      errorGrowth: errors.growth,
      billing: {
        generatedAt: Date.now(),
        currency: stripeCurrency.mixed
          ? "mixed"
          : (stripeCurrency.currency ?? "usd"),
        mrrCents: activeMrrCents,
        arrCents: activeMrrCents * 12,
        trialingMrrCents,
        pastDueMrrCents,
        activeSubscriptions: active.length,
        trialingSubscriptions: trialing.length,
        pastDueSubscriptions: pastDue.length,
        stripeSubscriptions: stripeSubscriptions.length,
        missingInConvex: stripeSubscriptions
          .filter((subscription) => !syncedStripeIds.has(subscription.id))
          .slice(0, 10)
          .map((subscription) => subscription.id),
        byPlan: Array.from(planCounts.entries())
          .map(([plan, count]) => ({ plan, count }))
          .sort((a, b) => b.count - a.count || a.plan.localeCompare(b.plan)),
      },
    };
  },
});

export const listOrganizationPayments = action({
  args: { organizationId: v.string() },
  handler: async (ctx, args) => {
    await requireAdmin(ctx as never);
    const source = await ctx.runQuery(
      internalApi.admin.actions.getOrganizationBillingSource,
      { organizationId: args.organizationId },
    );
    if (!source?.stripeCustomerId) {
      return { payments: [], refundable: null };
    }

    const stripe = getStripe();
    const charges = await stripe.charges.list({
      customer: source.stripeCustomerId,
      limit: 25,
    });
    const latestRefundable = getLatestRefundableCharge(charges.data);
    const usedCredits = latestRefundable
      ? await ctx.runQuery(internalApi.admin.actions.getCreditUsageSince, {
          organizationId: args.organizationId,
          since: latestRefundable.created * 1000,
        })
      : 0;

    return {
      payments: charges.data.map(mapCharge),
      refundable: computeRefundPreview(latestRefundable, usedCredits),
    };
  },
});

export const setOrganizationSubscriptionPlan = action({
  args: {
    organizationId: v.string(),
    plan: v.string(),
    annual: v.boolean(),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx as never);
    if (args.plan === "free") {
      throw new Error(
        "Use cancellation controls to move a customer off a paid plan",
      );
    }

    const source = await ctx.runQuery(
      internalApi.admin.actions.getOrganizationBillingSource,
      { organizationId: args.organizationId },
    );
    if (!source?.stripeCustomerId) {
      throw new Error("This organization does not have a Stripe customer");
    }

    const stripe = getStripe();
    const priceId = getPlanPrice(args.plan, args.annual);
    let subscription: Stripe.Subscription;

    if (source.stripeSubscriptionId) {
      const existing = await stripe.subscriptions.retrieve(
        source.stripeSubscriptionId,
      );
      const itemId = existing.items.data[0]?.id;
      if (!itemId) throw new Error("Stripe subscription has no editable item");
      subscription = await stripe.subscriptions.update(
        source.stripeSubscriptionId,
        {
          items: [{ id: itemId, price: priceId }],
          proration_behavior: "create_prorations",
          metadata: {
            ...existing.metadata,
            organizationId: args.organizationId,
            plan: args.plan,
          },
        },
      );
    } else {
      subscription = await stripe.subscriptions.create({
        customer: source.stripeCustomerId,
        items: [{ price: priceId }],
        metadata: {
          organizationId: args.organizationId,
          plan: args.plan,
        },
        payment_behavior: "error_if_incomplete",
      });
    }

    await ctx.runMutation(internalApi.billing.upsertSubscriptionFromStripe, {
      organizationId: args.organizationId,
      ...getSubscriptionPatch(subscription, args.plan),
    });

    return { subscriptionId: subscription.id };
  },
});

export const cancelOrganizationSubscription = action({
  args: { organizationId: v.string() },
  handler: async (ctx, args) => {
    await requireAdmin(ctx as never);
    const source = await ctx.runQuery(
      internalApi.admin.actions.getOrganizationBillingSource,
      { organizationId: args.organizationId },
    );
    if (!source?.stripeSubscriptionId) {
      throw new Error("This organization does not have a Stripe subscription");
    }

    const stripe = getStripe();
    const subscription = await stripe.subscriptions.update(
      source.stripeSubscriptionId,
      { cancel_at_period_end: true },
    );

    await ctx.runMutation(internalApi.billing.upsertSubscriptionFromStripe, {
      organizationId: args.organizationId,
      ...getSubscriptionPatch(subscription),
    });

    return { subscriptionId: subscription.id };
  },
});

export const reactivateOrganizationSubscription = action({
  args: { organizationId: v.string() },
  handler: async (ctx, args) => {
    await requireAdmin(ctx as never);
    const source = await ctx.runQuery(
      internalApi.admin.actions.getOrganizationBillingSource,
      { organizationId: args.organizationId },
    );
    if (!source?.stripeSubscriptionId) {
      throw new Error("This organization does not have a Stripe subscription");
    }

    const stripe = getStripe();
    const subscription = await stripe.subscriptions.update(
      source.stripeSubscriptionId,
      { cancel_at_period_end: false },
    );

    await ctx.runMutation(internalApi.billing.upsertSubscriptionFromStripe, {
      organizationId: args.organizationId,
      ...getSubscriptionPatch(subscription),
    });

    return { subscriptionId: subscription.id };
  },
});

export const processOrganizationRefund = action({
  args: {
    organizationId: v.string(),
    chargeId: v.optional(v.string()),
    cancelSubscription: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx as never);
    const source = await ctx.runQuery(
      internalApi.admin.actions.getOrganizationBillingSource,
      { organizationId: args.organizationId },
    );
    if (!source?.stripeCustomerId) {
      throw new Error("This organization does not have a Stripe customer");
    }

    const stripe = getStripe();
    const charges = await stripe.charges.list({
      customer: source.stripeCustomerId,
      limit: 25,
    });
    const charge = args.chargeId
      ? (charges.data.find((item) => item.id === args.chargeId) ?? null)
      : getLatestRefundableCharge(charges.data);
    if (!charge) throw new Error("No refundable charge was found");

    const usedCredits = await ctx.runQuery(
      internalApi.admin.actions.getCreditUsageSince,
      {
        organizationId: args.organizationId,
        since: charge.created * 1000,
      },
    );
    const preview = computeRefundPreview(charge, usedCredits);
    if (!preview || preview.refundCents <= 0) {
      throw new Error("There is no refundable amount left for this charge");
    }

    const refund = await stripe.refunds.create(
      {
        charge: charge.id,
        amount: preview.refundCents,
        metadata: {
          organizationId: args.organizationId,
          usedCredits: String(usedCredits),
        },
      },
      {
        idempotencyKey: `admin-refund-${charge.id}-${preview.refundCents}`,
      },
    );

    await ctx.runMutation(internalApi.admin.actions.recordRefund, {
      organizationId: args.organizationId,
      chargeId: charge.id,
      refundId: refund.id,
      refundCents: preview.refundCents,
    });

    if (args.cancelSubscription && source.stripeSubscriptionId) {
      const subscription = await stripe.subscriptions.cancel(
        source.stripeSubscriptionId,
      );
      await ctx.runMutation(internalApi.billing.upsertSubscriptionFromStripe, {
        organizationId: args.organizationId,
        ...getSubscriptionPatch(subscription),
      });
    }

    return {
      refundId: refund.id,
      refundCents: preview.refundCents,
      canceledSubscription: Boolean(args.cancelSubscription),
    };
  },
});
