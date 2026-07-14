import {
  isDisposableEmailDomain,
  normalizeEmailForFraudChecks,
} from "@/features/referral/referral-email";
import { describe, expect, it } from "vitest";

describe("referral email normalization", () => {
  it("normalizes gmail aliases and dots", () => {
    const email = normalizeEmailForFraudChecks("John.Doe+promo@Gmail.com");
    expect(email).toBe("johndoe@gmail.com");
  });

  it("keeps non-gmail local-part aliases as-is", () => {
    const email = normalizeEmailForFraudChecks("Jane+tag@company.com");
    expect(email).toBe("jane+tag@company.com");
  });
});

describe("disposable domain detection", () => {
  it("detects known disposable domains", () => {
    expect(isDisposableEmailDomain("test@mailinator.com")).toBe(true);
  });

  it("allows standard domains", () => {
    expect(isDisposableEmailDomain("test@gmail.com")).toBe(false);
  });
});
