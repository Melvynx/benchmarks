import {
  summarizeCustomApiKeyUsage,
  summarizeCustomApiKeyUsageStats,
} from "../convex/billing";
import { getCustomKeyUsages } from "../convex/editorNode";
import { describe, expect, it } from "vitest";

describe("custom API key usage stats", () => {
  it("summarizes aggregate stats without scanning every raw usage row", () => {
    const now = Date.UTC(2026, 4, 25, 12);
    const rows = [
      {
        provider: "gemini",
        period: "total",
        periodKey: "all",
        requestCount: 503,
      },
      {
        provider: "gemini",
        period: "day",
        periodKey: "2026-04-10",
        requestCount: 501,
      },
      {
        provider: "gemini",
        period: "day",
        periodKey: "2026-05-20",
        requestCount: 2,
      },
    ];

    const summary = summarizeCustomApiKeyUsageStats(rows, { now });

    expect(summary.totals.gemini).toEqual({ total: 503, thisMonth: 2 });
    expect(
      summary.chartData.find((point) => point.date === "2026-05-20"),
    ).toMatchObject({
      gemini: 2,
    });
  });

  it("hides APIYI usage from non-product-admin summaries", () => {
    const now = Date.UTC(2026, 4, 25, 12);
    const rows = [
      {
        provider: "apiyi",
        period: "total",
        periodKey: "all",
        requestCount: 7,
      },
      {
        provider: "apiyi",
        period: "day",
        periodKey: "2026-05-20",
        requestCount: 7,
      },
    ];

    const summary = summarizeCustomApiKeyUsageStats(rows, {
      now,
      includeApiyi: false,
    });

    expect(summary.totals.apiyi).toEqual({ total: 0, thisMonth: 0 });
    expect(
      summary.chartData.find((point) => point.date === "2026-05-20"),
    ).toMatchObject({
      apiyi: 0,
    });
  });

  it("can still summarize raw legacy rows for backfill checks", () => {
    const now = Date.UTC(2026, 4, 25, 12);
    const rows = [
      {
        organizationId: "org_1",
        provider: "openai",
        model: "gpt-image-2",
        requestCount: 3,
        createdAt: Date.UTC(2026, 4, 20, 12),
      },
    ];

    expect(summarizeCustomApiKeyUsage(rows, { now }).totals.openai).toEqual({
      total: 3,
      thisMonth: 3,
    });
  });

  it("keeps one usage event per custom-key provider attempt", () => {
    expect(
      getCustomKeyUsages([
        { model: "gemini-3.1-flash-apiyi", customKeyProvider: "apiyi" },
        { model: "gemini-3.1-flash", customKeyProvider: "gemini" },
        { model: "gpt-image-2" },
      ]),
    ).toEqual([
      { provider: "apiyi", model: "gemini-3.1-flash-apiyi" },
      { provider: "gemini", model: "gemini-3.1-flash" },
    ]);
  });
});
