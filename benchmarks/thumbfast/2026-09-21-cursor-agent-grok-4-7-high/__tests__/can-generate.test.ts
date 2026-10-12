import { canGenerate, canUseApiKeys } from "@/features/credits/can-generate";
import { describe, expect, it } from "vitest";

describe("canUseApiKeys", () => {
  it("returns false when apiKeyMode is disabled", () => {
    expect(
      canUseApiKeys({
        apiKeyMode: "disabled",
        hasCustomApiKeys: { openai: true, gemini: true },
        model: "gemini-3-pro",
      }),
    ).toBe(false);
  });

  it("returns false when apiKeyMode is undefined", () => {
    expect(
      canUseApiKeys({
        apiKeyMode: undefined,
        hasCustomApiKeys: { openai: true, gemini: true },
        model: "gemini-3-pro",
      }),
    ).toBe(false);
  });

  it("returns false when hasCustomApiKeys is undefined", () => {
    expect(
      canUseApiKeys({
        apiKeyMode: "required",
        hasCustomApiKeys: undefined,
        model: "gemini-3-pro",
      }),
    ).toBe(false);
  });

  it("returns true for gemini model with gemini key in required mode", () => {
    expect(
      canUseApiKeys({
        apiKeyMode: "required",
        hasCustomApiKeys: { openai: false, gemini: true },
        model: "gemini-3-pro",
      }),
    ).toBe(true);
  });

  it("returns true for gemini-flash model with gemini key in fallback mode", () => {
    expect(
      canUseApiKeys({
        apiKeyMode: "fallback",
        hasCustomApiKeys: { openai: false, gemini: true },
        model: "gemini-3.1-flash",
      }),
    ).toBe(true);
  });

  it("returns false for gpt model without openai key", () => {
    expect(
      canUseApiKeys({
        apiKeyMode: "required",
        hasCustomApiKeys: { openai: false, gemini: true },
        model: "gpt-image-2",
      }),
    ).toBe(false);
  });

  it("returns true for gpt model with openai key", () => {
    expect(
      canUseApiKeys({
        apiKeyMode: "required",
        hasCustomApiKeys: { openai: true, gemini: false },
        model: "gpt-image-2",
      }),
    ).toBe(true);
  });

  it("returns true for legacy gpt-image-1.5 ids with openai key", () => {
    expect(
      canUseApiKeys({
        apiKeyMode: "required",
        hasCustomApiKeys: { openai: true, gemini: false },
        model: "gpt-image-1.5" as never,
      }),
    ).toBe(true);
  });

  it("returns false for gemini model without gemini key", () => {
    expect(
      canUseApiKeys({
        apiKeyMode: "fallback",
        hasCustomApiKeys: { openai: true, gemini: false },
        model: "gemini-3-pro",
      }),
    ).toBe(false);
  });

  it("returns true for routeable models with an APIYI key", () => {
    expect(
      canUseApiKeys({
        apiKeyMode: "required",
        hasCustomApiKeys: { openai: false, gemini: false, apiyi: true },
        model: "gemini-3.1-flash",
      }),
    ).toBe(true);
  });
});

describe("canGenerate", () => {
  describe("disabled mode (free plan)", () => {
    it("allows generation with enough credits", () => {
      const result = canGenerate({
        balance: 5,
        apiKeyMode: "disabled",
        hasCustomApiKeys: { openai: false, gemini: false },
        model: "gemini-3-pro",
        thumbnailCount: 2,
      });
      expect(result.hasEnoughCredits).toBe(true);
      expect(result.isOutOfCredits).toBe(false);
      expect(result.canUseApiKeys).toBe(false);
    });

    it("blocks generation with insufficient credits", () => {
      const result = canGenerate({
        balance: 0.5,
        apiKeyMode: "disabled",
        hasCustomApiKeys: { openai: false, gemini: false },
        model: "gemini-3-pro",
        thumbnailCount: 2,
      });
      expect(result.hasEnoughCredits).toBe(false);
      expect(result.isOutOfCredits).toBe(false);
    });

    it("allows Nano Banana 2 at its 0.8 credit cost", () => {
      const result = canGenerate({
        balance: 0.8,
        apiKeyMode: "disabled",
        hasCustomApiKeys: { openai: false, gemini: false },
        model: "gemini-3.1-flash",
        thumbnailCount: 1,
      });
      expect(result.hasEnoughCredits).toBe(true);
    });

    it("blocks Nano Banana Pro when balance is below its 1 credit cost", () => {
      const result = canGenerate({
        balance: 0.8,
        apiKeyMode: "disabled",
        hasCustomApiKeys: { openai: false, gemini: false },
        model: "gemini-3-pro",
        thumbnailCount: 1,
      });
      expect(result.hasEnoughCredits).toBe(false);
    });

    it("shows out of credits when balance is 0", () => {
      const result = canGenerate({
        balance: 0,
        apiKeyMode: "disabled",
        hasCustomApiKeys: { openai: false, gemini: false },
        model: "gemini-3-pro",
        thumbnailCount: 1,
      });
      expect(result.hasEnoughCredits).toBe(false);
      expect(result.isOutOfCredits).toBe(true);
    });
  });

  describe("required mode (poweruser plan)", () => {
    it("allows generation with API key even with 0 credits", () => {
      const result = canGenerate({
        balance: 0,
        apiKeyMode: "required",
        hasCustomApiKeys: { openai: false, gemini: true },
        model: "gemini-3-pro",
        thumbnailCount: 4,
      });
      expect(result.hasEnoughCredits).toBe(true);
      expect(result.isOutOfCredits).toBe(false);
      expect(result.canUseApiKeys).toBe(true);
    });

    it("blocks generation when wrong API key is configured", () => {
      const result = canGenerate({
        balance: 0,
        apiKeyMode: "required",
        hasCustomApiKeys: { openai: true, gemini: false },
        model: "gemini-3-pro",
        thumbnailCount: 1,
      });
      expect(result.hasEnoughCredits).toBe(false);
      expect(result.isOutOfCredits).toBe(true);
      expect(result.canUseApiKeys).toBe(false);
    });

    it("allows gpt model with openai key and 0 credits", () => {
      const result = canGenerate({
        balance: 0,
        apiKeyMode: "required",
        hasCustomApiKeys: { openai: true, gemini: false },
        model: "gpt-image-2",
        thumbnailCount: 2,
      });
      expect(result.hasEnoughCredits).toBe(true);
      expect(result.isOutOfCredits).toBe(false);
    });

    it("allows generation with an APIYI key and 0 credits", () => {
      const result = canGenerate({
        balance: 0,
        apiKeyMode: "required",
        hasCustomApiKeys: { openai: false, gemini: false, apiyi: true },
        model: "gemini-3.1-flash",
        thumbnailCount: 2,
      });
      expect(result.hasEnoughCredits).toBe(true);
      expect(result.isOutOfCredits).toBe(false);
      expect(result.canUseApiKeys).toBe(true);
    });
  });

  describe("fallback mode (pro/ultra plan)", () => {
    it("allows generation with credits even without API keys", () => {
      const result = canGenerate({
        balance: 5,
        apiKeyMode: "fallback",
        hasCustomApiKeys: { openai: false, gemini: false },
        model: "gemini-3-pro",
        thumbnailCount: 2,
      });
      expect(result.hasEnoughCredits).toBe(true);
      expect(result.isOutOfCredits).toBe(false);
    });

    it("allows generation with API key when credits are 0", () => {
      const result = canGenerate({
        balance: 0,
        apiKeyMode: "fallback",
        hasCustomApiKeys: { openai: false, gemini: true },
        model: "gemini-3.1-flash",
        thumbnailCount: 3,
      });
      expect(result.hasEnoughCredits).toBe(true);
      expect(result.isOutOfCredits).toBe(false);
    });

    it("blocks when no credits and no matching API key", () => {
      const result = canGenerate({
        balance: 0,
        apiKeyMode: "fallback",
        hasCustomApiKeys: { openai: true, gemini: false },
        model: "gemini-3-pro",
        thumbnailCount: 1,
      });
      expect(result.hasEnoughCredits).toBe(false);
      expect(result.isOutOfCredits).toBe(true);
    });
  });

  describe("undefined creditsData (loading state)", () => {
    it("blocks generation when data is not yet loaded", () => {
      const result = canGenerate({
        balance: undefined,
        apiKeyMode: undefined,
        hasCustomApiKeys: undefined,
        model: "gemini-3-pro",
        thumbnailCount: 1,
      });
      expect(result.hasEnoughCredits).toBe(false);
      expect(result.isOutOfCredits).toBe(true);
    });
  });
});
