import { afterEach, describe, expect, it } from "vitest";
import { buildAdminNotificationMessage } from "../src/lib/admin-notification-message";
import { buildMessage } from "../src/lib/server/admin-notifications";

const originalVercelEnv = process.env.VERCEL_ENV;
const originalNodeEnv = process.env.NODE_ENV;

afterEach(() => {
  if (originalVercelEnv === undefined) {
    delete process.env.VERCEL_ENV;
  } else {
    process.env.VERCEL_ENV = originalVercelEnv;
  }
  if (originalNodeEnv === undefined) {
    delete process.env.NODE_ENV;
  } else {
    process.env.NODE_ENV = originalNodeEnv;
  }
});

function countMatches(value: string, pattern: RegExp) {
  return value.match(pattern)?.length ?? 0;
}

describe("admin notification messages", () => {
  const details = [
    { label: "Organization", value: "AIDD'org" },
    { label: "Org slug", value: "benoitso-9eee" },
    { label: "Customer email", value: "ben@ai-driven-dev.fr" },
    { label: "Plan", value: "pro" },
    { label: "Price", value: "$19/month" },
    { label: "Status", value: "canceled" },
    { label: "Trial end", value: null },
  ];

  it("formats billing alerts into clean Telegram HTML", () => {
    const message = buildAdminNotificationMessage({
      title: "Subscription churned",
      event: "billing.churned",
      environment: "production",
      details,
      now: new Date("2026-06-07T12:04:50.525Z"),
    });

    expect(message).toContain("<b>Thumbfa.st admin alert</b>");
    expect(message).toContain("<b>Subscription churned</b>");
    expect(message).toContain("A customer canceled their subscription.");
    expect(message).toContain("<b>Context</b>");
    expect(message).toContain("• Event: <code>billing.churned</code>");
    expect(message).toContain("• Environment: <code>production</code>");
    expect(message).toContain("<b>Details</b>");
    expect(message).toContain("• Organization: <code>AIDD'org</code>");
    expect(message).toContain("• Customer email: <code>ben@ai-driven-dev.fr</code>");
    expect(message).not.toContain("Trial end");
    expect(message).toContain("<b>Time</b>\n<code>2026-06-07 12:04:50 UTC</code>");
  });

  it("escapes HTML-sensitive values", () => {
    const message = buildAdminNotificationMessage({
      title: "Server <failed>",
      event: "server.route_error",
      environment: "production",
      details: [{ label: "Error", value: "bad <script> & worse" }],
      now: new Date("2026-06-07T12:04:50.525Z"),
    });

    expect(message).toContain("<b>Server &lt;failed&gt;</b>");
    expect(message).toContain("<code>bad &lt;script&gt; &amp; worse</code>");
  });

  it("uses the runtime environment wrapper for server alerts", () => {
    process.env.VERCEL_ENV = "production";
    process.env.NODE_ENV = "test";

    const message = buildMessage({
      title: "Subscription churned",
      event: "billing.churned",
      details,
      now: new Date("2026-06-07T12:04:50.525Z"),
    });

    expect(message).toContain("• Environment: <code>production</code>");
  });

  it("keeps over-limit messages valid Telegram HTML", () => {
    const message = buildAdminNotificationMessage({
      title: "Subscription churned",
      event: "billing.churned",
      environment: "production",
      details: Array.from({ length: 20 }, (_, index) => ({
        label: `Long detail ${index} <tag>`,
        value: `value-${index} & `.repeat(300),
      })),
      now: new Date("2026-06-07T12:04:50.525Z"),
    });

    expect(message.length).toBeLessThanOrEqual(3500);
    expect(countMatches(message, /<b>/g)).toBe(countMatches(message, /<\/b>/g));
    expect(countMatches(message, /<code>/g)).toBe(
      countMatches(message, /<\/code>/g),
    );
    expect(message).not.toMatch(/&(?!amp;|lt;|gt;)/);
    expect(message).toContain("[message truncated]");
    expect(message).toContain("<b>Time</b>\n<code>2026-06-07 12:04:50 UTC</code>");
  });

  it("keeps escaped context values under Telegram limits", () => {
    const message = buildAdminNotificationMessage({
      title: "&".repeat(300),
      event: `custom.event.${"&".repeat(300)}`,
      environment: `prod-${"<".repeat(300)}`,
      details: [],
      now: new Date("2026-06-07T12:04:50.525Z"),
    });

    expect(message.length).toBeLessThanOrEqual(3500);
    expect(countMatches(message, /<b>/g)).toBe(countMatches(message, /<\/b>/g));
    expect(countMatches(message, /<code>/g)).toBe(
      countMatches(message, /<\/code>/g),
    );
    expect(message).not.toMatch(/&(?!amp;|lt;|gt;)/);
  });
});
