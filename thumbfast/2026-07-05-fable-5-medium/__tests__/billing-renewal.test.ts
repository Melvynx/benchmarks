import { getSubscriptionRenewalGrant } from "../convex/billingRenewal";
import { describe, expect, it } from "vitest";

describe("getSubscriptionRenewalGrant", () => {
  it("grants renewal credits when Stripe advances an active billing period", () => {
    expect(
      getSubscriptionRenewalGrant({
        previousPeriodStart: 1_700_000_000_000,
        nextPeriodStart: 1_702_678_400_000,
        nextStatus: "active",
        nextPlan: "pro",
      }),
    ).toEqual({
      plan: "pro",
      type: "subscription_renewal",
    });
  });

  it("does not grant credits for non-renewal subscription updates", () => {
    expect(
      getSubscriptionRenewalGrant({
        previousPeriodStart: 1_700_000_000_000,
        nextPeriodStart: 1_700_000_000_000,
        nextStatus: "active",
        nextPlan: "pro",
      }),
    ).toBeNull();
  });

  it("does not grant credits unless the subscription is active", () => {
    expect(
      getSubscriptionRenewalGrant({
        previousPeriodStart: 1_700_000_000_000,
        nextPeriodStart: 1_702_678_400_000,
        nextStatus: "trialing",
        nextPlan: "pro",
      }),
    ).toBeNull();
  });

  it("does not grant credits for non-renewing plans", () => {
    expect(
      getSubscriptionRenewalGrant({
        previousPeriodStart: 1_700_000_000_000,
        nextPeriodStart: 1_702_678_400_000,
        nextStatus: "active",
        nextPlan: "poweruser",
      }),
    ).toBeNull();
  });

  it("does not grant credits for unknown future plans by default", () => {
    expect(
      getSubscriptionRenewalGrant({
        previousPeriodStart: 1_700_000_000_000,
        nextPeriodStart: 1_702_678_400_000,
        nextStatus: "active",
        nextPlan: "enterprise",
      }),
    ).toBeNull();
  });
});
