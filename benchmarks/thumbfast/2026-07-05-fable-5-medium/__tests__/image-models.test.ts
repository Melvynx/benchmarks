import {
  IMAGE_MODELS,
  getImageModelRouteForGeneration,
  getPublicImageModels,
  getPublicModelId,
  getModelCreditCost,
  getModelLabel,
  resolveModelId,
} from "@/lib/ai/image-models";
import { getConvexModelCreditCost } from "../convex/generationConfig";
import { describe, expect, it } from "vitest";

describe("image-models", () => {
  it("registers GPT Image 2 with the official OpenAI API model id", () => {
    expect(IMAGE_MODELS["gpt-image-2"]).toMatchObject({
      id: "gpt-image-2",
      label: "GPT Image 2",
      apiModelId: "gpt-image-2",
      creditCost: 1,
      pricing: {
        imageOutputPer1MUsd: 30,
      },
    });
  });

  it("resolves legacy GPT model ids to GPT Image 2", () => {
    expect(resolveModelId("gpt-image")).toBe("gpt-image-2");
    expect(resolveModelId("gpt-image-1.5")).toBe("gpt-image-2");
  });

  it("returns GPT Image 2 credit cost and label for legacy ids", () => {
    expect(getModelCreditCost("gpt-image-1.5")).toBe(1);
    expect(getModelLabel("gpt-image-1.5")).toBe("GPT Image 2");
  });

  it("only exposes canonical model variants publicly", () => {
    expect(getPublicImageModels().map((model) => model.id)).toEqual([
      "gemini-3-pro",
      "gemini-3.1-flash",
      "gpt-image-2",
    ]);
    expect(getPublicModelId("gemini-3.1-flash-apiyi")).toBe("gemini-3.1-flash");
    expect(getPublicModelId("gpt-image-2-apiyi")).toBe("gpt-image-2");
  });

  it("shows configured public credit costs by default", () => {
    expect(
      getPublicImageModels().map((model) => [
        model.id,
        model.creditCost,
        model.pickerDetails,
      ]),
    ).toEqual([
      ["gemini-3-pro", 1, "1 token usage"],
      ["gemini-3.1-flash", 0.8, "0.8 tokens • recommended"],
      ["gpt-image-2", 1, "1 token usage"],
    ]);
  });

  it("uses the same credit costs in Convex generation config", () => {
    expect(getConvexModelCreditCost("gemini-3-pro")).toBe(1);
    expect(getConvexModelCreditCost("gemini-3-pro-apiyi")).toBe(1);
    expect(getConvexModelCreditCost("gemini-3.1-flash")).toBe(0.8);
    expect(getConvexModelCreditCost("gemini-3.1-flash-apiyi")).toBe(0.8);
    expect(getConvexModelCreditCost("gpt-image-2")).toBe(1);
    expect(getConvexModelCreditCost("gpt-image-2-apiyi")).toBe(1);
  });

  it("routes custom API key generations only to official providers", () => {
    expect(
      getImageModelRouteForGeneration("gemini-3.1-flash", {
        forceOfficialFirst: false,
        useCustomApiKeys: true,
      }),
    ).toEqual(["gemini-3.1-flash"]);
    expect(
      getImageModelRouteForGeneration("gpt-image-2-apiyi", {
        forceOfficialFirst: false,
        useCustomApiKeys: true,
      }),
    ).toEqual(["gpt-image-2"]);
  });

  it("can keep APIYI first when a custom APIYI key is available", () => {
    expect(
      getImageModelRouteForGeneration("gemini-3.1-flash", {
        forceOfficialFirst: false,
        useCustomApiKeys: true,
        useManagedRouteWithCustomApiKeys: true,
        customApiKeyAvailability: { apiyi: true },
      }),
    ).toEqual(["gemini-3.1-flash-apiyi"]);
  });

  it("filters custom API key routes to configured providers", () => {
    expect(
      getImageModelRouteForGeneration("gemini-3.1-flash", {
        forceOfficialFirst: true,
        useCustomApiKeys: true,
        useManagedRouteWithCustomApiKeys: true,
        customApiKeyAvailability: { apiyi: true },
      }),
    ).toEqual(["gemini-3.1-flash-apiyi"]);
  });

  it("keeps managed generations on the configured fallback route", () => {
    expect(
      getImageModelRouteForGeneration("gemini-3.1-flash", {
        forceOfficialFirst: false,
        useCustomApiKeys: false,
      }),
    ).toEqual(["gemini-3.1-flash-apiyi", "gemini-3.1-flash"]);
  });
});
