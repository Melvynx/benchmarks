import { extractIpFromRequest } from "@/lib/extract-ip";
import { describe, expect, it } from "vitest";

describe("extractIpFromRequest", () => {
  it("returns null when input is missing or empty", () => {
    expect(extractIpFromRequest(null)).toBeNull();
    expect(extractIpFromRequest(undefined)).toBeNull();
    expect(extractIpFromRequest({})).toBeNull();
  });

  it("reads x-forwarded-for from a Request", () => {
    const request = new Request("https://example.com", {
      headers: { "x-forwarded-for": "203.0.113.10, 70.41.3.18" },
    });
    expect(extractIpFromRequest(request)).toBe("203.0.113.10");
  });

  it("reads from a Headers object on .headers", () => {
    const headers = new Headers({ "x-real-ip": "198.51.100.7" });
    expect(extractIpFromRequest({ headers })).toBe("198.51.100.7");
  });

  it("prefers cf-connecting-ip over x-forwarded-for", () => {
    const headers = new Headers({
      "cf-connecting-ip": "192.0.2.5",
      "x-forwarded-for": "203.0.113.10",
    });
    expect(extractIpFromRequest({ headers })).toBe("192.0.2.5");
  });

  it("reads from a plain object with lowercase header keys", () => {
    expect(
      extractIpFromRequest({
        headers: { "x-forwarded-for": "203.0.113.99" },
      }),
    ).toBe("203.0.113.99");
  });

  it("falls through nested context with .request", () => {
    const inner = new Request("https://example.com", {
      headers: { "x-real-ip": "198.51.100.42" },
    });
    expect(extractIpFromRequest({ request: inner })).toBe("198.51.100.42");
  });

  it("returns null when no known header is present", () => {
    const headers = new Headers({ "user-agent": "vitest" });
    expect(extractIpFromRequest({ headers })).toBeNull();
  });
});
