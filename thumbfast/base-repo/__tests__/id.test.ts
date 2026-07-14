import { formatId, generateSlug, getNameFromEmail } from "@/lib/format/id";
import { describe, expect, it } from "vitest";

describe("id utilities", () => {
  describe("formatId", () => {
    it("should replace spaces with hyphens", () => {
      expect(formatId("hello world")).toBe("hello-world");
    });

    it("should remove special characters", () => {
      expect(formatId("hello@world!")).toBe("helloworld");
    });

    it("should convert to lowercase", () => {
      expect(formatId("HelloWorld")).toBe("helloworld");
    });

    it("should keep alphanumeric characters, hyphens, and underscores", () => {
      expect(formatId("hello_world-123")).toBe("hello_world-123");
    });

    it("should handle complex strings", () => {
      expect(formatId("Hello World! @#$%^&*()")).toBe("hello-world-");
    });
  });

  describe("generateSlug", () => {
    it("should format the input string and append a random ID", () => {
      const slug = generateSlug("Hello World");

      // Check that it starts with the formatted input
      expect(slug).toMatch(/^hello-world-[a-f0-9]{4}$/);
    });

    it("should generate different slugs for the same input", () => {
      const slug1 = generateSlug("Test");
      const slug2 = generateSlug("Test");

      // The base should be the same
      expect(slug1.startsWith("test-")).toBe(true);
      expect(slug2.startsWith("test-")).toBe(true);

      // But the full slugs should be different due to random suffix
      expect(slug1).not.toBe(slug2);
    });
  });

  describe("getNameFromEmail", () => {
    it("should extract name from simple email", () => {
      expect(getNameFromEmail("john@example.com")).toBe("john");
    });

    it("should handle email with plus addressing", () => {
      expect(getNameFromEmail("john+test@example.com")).toBe("johntest");
    });

    it("should remove special characters and cap names at 9 characters", () => {
      expect(getNameFromEmail("sma4rt4-user@example.com")).toBe("sma4rt4us");
    });

    it("should return fallback for email names without alphanumeric characters", () => {
      expect(getNameFromEmail("---@example.com")).toBe("user");
    });
  });
});
