export type SubscriptionRenewalInput = {
  previousPeriodStart?: number | null;
  nextPeriodStart?: number | null;
  nextStatus?: string | null;
  nextPlan?: string | null;
};

const RENEWING_CREDIT_PLANS = new Set(["pro", "ultra"]);

export function getSubscriptionRenewalGrant({
  previousPeriodStart,
  nextPeriodStart,
  nextStatus,
  nextPlan,
}: SubscriptionRenewalInput) {
  if (nextStatus !== "active") return null;
  if (!nextPlan || !RENEWING_CREDIT_PLANS.has(nextPlan)) return null;
  if (!previousPeriodStart || !nextPeriodStart) return null;
  if (nextPeriodStart <= previousPeriodStart) return null;

  return {
    plan: nextPlan,
    type: "subscription_renewal" as const,
  };
}
