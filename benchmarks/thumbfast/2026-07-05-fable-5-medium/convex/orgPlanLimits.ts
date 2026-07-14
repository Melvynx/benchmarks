import { getPlanLimitsWithOverrides } from "./generationConfig";

const ACTIVE_SUBSCRIPTION_STATUSES = new Set([
  "active",
  "trialing",
  "lifetime",
]);

type PlanLimitCtx = {
  db: {
    query: (table: string) => {
      withIndex: (
        indexName: string,
        cb: (q: { eq: (field: string, value: string) => unknown }) => unknown,
      ) => {
        take: (limit: number) => Promise<SubscriptionRow[]>;
      };
    };
  };
};

type SubscriptionRow = {
  status?: string | null;
  plan?: string | null;
  overrideLimits?: Parameters<typeof getPlanLimitsWithOverrides>[1];
  createdAt: number;
};

const MAX_SUBSCRIPTION_ROWS = 500;

export async function getActiveSubscription(
  ctx: PlanLimitCtx,
  orgId: string,
): Promise<SubscriptionRow | null> {
  const subscriptions = await ctx.db
    .query("subscriptions")
    .withIndex("by_organization", (q) => q.eq("organizationId", orgId))
    .take(MAX_SUBSCRIPTION_ROWS);

  return (
    subscriptions.find((subscription) =>
      ACTIVE_SUBSCRIPTION_STATUSES.has(subscription.status ?? ""),
    ) ??
    subscriptions.sort((a, b) => b.createdAt - a.createdAt).at(0) ??
    null
  );
}

export async function getOrgPlanLimits(ctx: PlanLimitCtx, orgId: string) {
  const subscription = await getActiveSubscription(ctx, orgId);
  return getPlanLimitsWithOverrides(
    subscription?.plan ?? "free",
    subscription?.overrideLimits,
  );
}
