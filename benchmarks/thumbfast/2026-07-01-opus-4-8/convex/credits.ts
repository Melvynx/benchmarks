/* eslint-disable @typescript-eslint/no-explicit-any */
// Intentional any: this legacy Convex module still uses dynamic component and table APIs that cannot be typed precisely without a larger generated-API migration.
import { internalMutationGeneric } from "convex/server";
import { v } from "convex/values";
import { getPlanLimitsForPlan } from "./generationConfig";

export const CREDIT_COST_PER_INSPIRATION = 0.1;
export const CREDIT_COST_PER_ANONYMIZATION = 1;
export const CREDIT_COST_PER_IMAGE_DESCRIPTION = 0.05;
export const CREDIT_COST_PER_PERSON_IMAGE_CHECK = 0.1;
const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;
const YEARLY_SUBSCRIPTION_THRESHOLD_DAYS = 32;
const MAX_ROWS = 500;

type Ctx = {
  db: any;
};

export async function getCreditBalance(ctx: Ctx, orgId: string) {
  return ctx.db
    .query("creditBalances")
    .withIndex("by_organization", (q: any) => q.eq("organizationId", orgId))
    .first();
}

export async function setCreditBalance(
  ctx: Ctx,
  orgId: string,
  balance: number,
  now: number,
  subscriptionCreditsRemaining?: number,
) {
  const existing = await getCreditBalance(ctx, orgId);
  if (existing) {
    await ctx.db.patch(existing._id, {
      balance,
      ...(subscriptionCreditsRemaining !== undefined
        ? { subscriptionCreditsRemaining }
        : {}),
      updatedAt: now,
    });
    return existing._id;
  }

  return ctx.db.insert("creditBalances", {
    organizationId: orgId,
    balance,
    ...(subscriptionCreditsRemaining !== undefined
      ? { subscriptionCreditsRemaining }
      : {}),
    createdAt: now,
    updatedAt: now,
  });
}

export async function insertCreditTransaction(
  ctx: Ctx,
  args: {
    orgId: string;
    amount: number;
    type: string;
    reason: string;
    referenceId?: string;
    now: number;
  },
) {
  await ctx.db.insert("creditTransactions", {
    organizationId: args.orgId,
    amount: args.amount,
    type: args.type,
    reason: args.reason,
    referenceId: args.referenceId,
    createdAt: args.now,
    updatedAt: args.now,
  });
}

export async function addCredits(
  ctx: Ctx,
  orgId: string,
  amount: number,
  type: string,
  reason: string,
  referenceId?: string,
) {
  if (amount <= 0) return;
  const now = Date.now();
  const balance = await getCreditBalance(ctx, orgId);
  await setCreditBalance(ctx, orgId, (balance?.balance ?? 0) + amount, now);
  await insertCreditTransaction(ctx, {
    orgId,
    amount,
    type,
    reason,
    referenceId,
    now,
  });
}

export async function deductCredits(
  ctx: Ctx,
  orgId: string,
  amount: number,
  type: string,
  reason: string,
  referenceId?: string,
) {
  if (amount <= 0) return;
  const now = Date.now();
  const balance = await getCreditBalance(ctx, orgId);
  const currentBalance = balance?.balance ?? 0;
  const subscriptionCreditsRemaining = Math.max(
    0,
    balance?.subscriptionCreditsRemaining ?? 0,
  );
  const subscriptionCreditsUsed = Math.min(
    amount,
    subscriptionCreditsRemaining,
  );
  if (currentBalance + Number.EPSILON < amount) {
    throw new Error("Insufficient credits");
  }
  await setCreditBalance(
    ctx,
    orgId,
    currentBalance - amount,
    now,
    subscriptionCreditsRemaining - subscriptionCreditsUsed,
  );
  await insertCreditTransaction(ctx, {
    orgId,
    amount: -amount,
    type,
    reason,
    referenceId,
    now,
  });
}

async function refreshSubscriptionCredits(
  ctx: Ctx,
  args: {
    orgId: string;
    plan: string;
    type: "subscription_start" | "subscription_renewal";
    referenceId?: string;
    amount?: number;
  },
) {
  const now = Date.now();
  const amount = args.amount ?? getPlanLimitsForPlan(args.plan).credits;
  if (amount <= 0) return { credited: false, amount: 0 };

  const balance = await getCreditBalance(ctx, args.orgId);
  const currentBalance = balance?.balance ?? 0;
  const unusedSubscriptionCredits = Math.min(
    Math.max(0, balance?.subscriptionCreditsRemaining ?? 0),
    currentBalance,
  );
  const netChange = amount - unusedSubscriptionCredits;

  await setCreditBalance(
    ctx,
    args.orgId,
    currentBalance + netChange,
    now,
    amount,
  );

  await insertCreditTransaction(ctx, {
    orgId: args.orgId,
    amount,
    type: args.type,
    reason: `${args.plan} credits`,
    referenceId: args.referenceId,
    now,
  });

  if (unusedSubscriptionCredits > 0) {
    await insertCreditTransaction(ctx, {
      orgId: args.orgId,
      amount: -unusedSubscriptionCredits,
      type: "subscription_expired",
      reason: "Unused subscription credits reset",
      referenceId: args.referenceId,
      now,
    });
  }

  return { credited: true, amount };
}

async function expireSubscriptionCreditsForOrg(
  ctx: Ctx,
  orgId: string,
  referenceId?: string,
  type = "subscription_expired",
  reason = "Subscription canceled",
) {
  const balance = await getCreditBalance(ctx, orgId);
  if (!balance) return { expired: false, amount: 0 };

  const unusedSubscriptionCredits = Math.min(
    Math.max(0, balance.subscriptionCreditsRemaining ?? 0),
    balance.balance,
  );
  if (unusedSubscriptionCredits <= 0) {
    await setCreditBalance(ctx, orgId, balance.balance, Date.now(), 0);
    return { expired: false, amount: 0 };
  }

  const now = Date.now();
  await setCreditBalance(
    ctx,
    orgId,
    balance.balance - unusedSubscriptionCredits,
    now,
    0,
  );
  await insertCreditTransaction(ctx, {
    orgId,
    amount: -unusedSubscriptionCredits,
    type,
    reason,
    referenceId,
    now,
  });

  return { expired: true, amount: unusedSubscriptionCredits };
}

async function getLastSubscriptionCreditRefillDate(ctx: Ctx, orgId: string) {
  const refills = await Promise.all(
    ["subscription_start", "subscription_renewal"].map((type) =>
      ctx.db
        .query("creditTransactions")
        .withIndex("by_organization_type_created", (q: any) =>
          q.eq("organizationId", orgId).eq("type", type),
        )
        .order("desc")
        .first(),
    ),
  );

  const refillDates = refills
    .filter(Boolean)
    .map((transaction: any) => transaction.createdAt as number);

  return refillDates.length > 0 ? Math.max(...refillDates) : null;
}

function isYearlySubscription(periodStart?: number, periodEnd?: number) {
  if (!periodStart || !periodEnd) return false;

  const periodLengthDays = (periodEnd - periodStart) / (1000 * 60 * 60 * 24);
  return periodLengthDays > YEARLY_SUBSCRIPTION_THRESHOLD_DAYS;
}

async function hasCreditTransactionForReference(
  ctx: Ctx,
  args: { orgId: string; type: string; referenceId?: string },
) {
  if (!args.referenceId) return false;
  const existingTransactions = await ctx.db
    .query("creditTransactions")
    .withIndex("by_organization_reference", (q: any) =>
      q.eq("organizationId", args.orgId).eq("referenceId", args.referenceId),
    )
    .take(MAX_ROWS);

  return existingTransactions.some(
    (transaction: any) => transaction.type === args.type,
  );
}

function getMonthlyRefillReferenceId(stripeSubscriptionId?: string) {
  const month = new Date().toISOString().slice(0, 7);
  return stripeSubscriptionId
    ? `${stripeSubscriptionId}:monthly:${month}`
    : `monthly:${month}`;
}

export const add = internalMutationGeneric({
  args: {
    orgId: v.string(),
    amount: v.number(),
    type: v.string(),
    reason: v.string(),
    referenceId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await addCredits(
      ctx,
      args.orgId,
      args.amount,
      args.type,
      args.reason,
      args.referenceId,
    );
    return { success: true };
  },
});

export const deduct = internalMutationGeneric({
  args: {
    orgId: v.string(),
    amount: v.number(),
    type: v.string(),
    reason: v.string(),
    referenceId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await deductCredits(
      ctx,
      args.orgId,
      args.amount,
      args.type,
      args.reason,
      args.referenceId,
    );
    return { success: true };
  },
});

export const grantSubscriptionCredits = internalMutationGeneric({
  args: {
    orgId: v.string(),
    plan: v.string(),
    type: v.union(
      v.literal("subscription_start"),
      v.literal("subscription_renewal"),
      v.literal("purchase"),
      v.literal("bonus"),
    ),
    referenceId: v.optional(v.string()),
    amount: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    if (await hasCreditTransactionForReference(ctx, args)) {
      return { credited: false, amount: 0, duplicate: true };
    }

    if (
      args.type === "subscription_start" ||
      args.type === "subscription_renewal"
    ) {
      return refreshSubscriptionCredits(ctx, {
        orgId: args.orgId,
        plan: args.plan,
        type: args.type,
        referenceId: args.referenceId,
        amount: args.amount,
      });
    }

    const amount = args.amount ?? getPlanLimitsForPlan(args.plan).credits;
    if (amount <= 0) return { credited: false, amount: 0 };

    await addCredits(
      ctx,
      args.orgId,
      amount,
      args.type,
      `${args.plan} credits`,
      args.referenceId,
    );
    return { credited: true, amount };
  },
});

export const expireSubscriptionCredits = internalMutationGeneric({
  args: {
    orgId: v.string(),
    referenceId: v.optional(v.string()),
    type: v.optional(v.string()),
    reason: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return expireSubscriptionCreditsForOrg(
      ctx,
      args.orgId,
      args.referenceId,
      args.type,
      args.reason,
    );
  },
});

export const refillYearlySubscriptionCredits = internalMutationGeneric({
  args: {},
  handler: async (ctx) => {
    const subscriptionPages = await Promise.all(
      ["pro", "ultra"].map(async (plan) => {
        const rows = await ctx.db
          .query("subscriptions")
          .withIndex("by_status_plan", (q: any) =>
            q.eq("status", "active").eq("plan", plan),
          )
          .take(MAX_ROWS);
        return rows;
      }),
    );
    const subscriptions = subscriptionPages.flat();

    const results = await Promise.all(
      subscriptions.map(async (subscription: any) => {
        if (
          !isYearlySubscription(
            subscription.periodStart,
            subscription.periodEnd,
          )
        ) {
          return "skipped";
        }

        const lastRefill = await getLastSubscriptionCreditRefillDate(
          ctx,
          subscription.organizationId,
        );
        if (!lastRefill || Date.now() - lastRefill < THIRTY_DAYS_MS) {
          return "skipped";
        }

        const result = await refreshSubscriptionCredits(ctx, {
          orgId: subscription.organizationId,
          plan: subscription.plan,
          type: "subscription_renewal",
          referenceId: getMonthlyRefillReferenceId(
            subscription.stripeSubscriptionId,
          ),
        });

        return result.credited ? "credited" : "skipped";
      }),
    );

    const creditsAdded = results.filter(
      (result) => result === "credited",
    ).length;
    const skipped = results.filter((result) => result === "skipped").length;

    return {
      success: true,
      creditsAdded,
      skipped,
      total: subscriptions.length,
    };
  },
});
