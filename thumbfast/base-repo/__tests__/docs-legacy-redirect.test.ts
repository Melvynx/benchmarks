import * as fs from "fs";
import * as path from "path";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/features/referral/referral.service", () => ({
  getReferralCookieConfig: vi.fn(),
}));

vi.mock("@/lib/auth/proxy-utils", () => ({
  buildOrgRedirectUrl: vi.fn(),
  extractOrgSlug: vi.fn(() => null),
  findUserOrganization: vi.fn(),
  getFirstUserOrganization: vi.fn(),
  isAdminRoute: vi.fn(() => false),
  isReservedSlug: vi.fn(() => false),
  redirectToOrgList: vi.fn(() => Response.redirect("https://thumbfa.st/orgs")),
  redirectToRoot: vi.fn(() => Response.redirect("https://thumbfa.st/")),
  validateAdminAccess: vi.fn(),
  validateSession: vi.fn(),
}));

const LEGACY_DOCS_PATHS = [
  "/docs/person-best-practices",
  "/docs/create-thumbnail",
  "/docs/edit-thumbnail",
  "/docs/inspiration-guide",
  "/docs/images-guide",
  "/docs/effective-prompting",
  "/docs/mcp-setup",
  "/docs/api-overview",
  "/docs/tools/generation",
];

function collectFiles(directory: string, extensions: string[]): string[] {
  if (!fs.existsSync(directory)) {
    return [];
  }

  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const entryPath = path.join(directory, entry.name);

    if (entry.isDirectory()) {
      return collectFiles(entryPath, extensions);
    }

    return extensions.some((extension) => entry.name.endsWith(extension))
      ? [entryPath]
      : [];
  });
}

import { proxy } from "../proxy";

describe("docs legacy redirects", () => {
  it.each([
    ["/docs/person-best-practices", "/docs/guides/person-best-practices"],
    ["/docs/person-best-practices/", "/docs/guides/person-best-practices"],
    ["/docs/create-thumbnail", "/docs/guides/create-thumbnail"],
    ["/docs/edit-thumbnail", "/docs/guides/edit-thumbnail"],
    ["/docs/inspiration-guide", "/docs/guides/inspiration-guide"],
    ["/docs/images-guide", "/docs/guides/images-guide"],
    ["/docs/effective-prompting", "/docs/guides/effective-prompting"],
    ["/docs/mcp-setup", "/docs/api-reference/mcp-setup"],
    ["/docs/api-overview", "/docs/api-reference"],
    ["/docs/tools/generation", "/docs/api-reference/tools-generation"],
  ])("redirects %s to %s", async (from, to) => {
    const request = new Request(`https://thumbfa.st${from}?ref=keep`);

    const response = await proxy(request);

    expect(response.status).toBe(308);
    expect(response.headers.get("location")).toBe(
      `https://thumbfa.st${to}?ref=keep`,
    );
  });

  it("does not expose legacy docs URLs in docs content or tool descriptions", () => {
    const files = collectFiles(path.join(process.cwd(), "content/docs"), [
      ".mdx",
    ]);

    const offenders = files.flatMap((file) => {
      const content = fs.readFileSync(file, "utf8");

      return LEGACY_DOCS_PATHS.flatMap((legacyPath) =>
        content.includes(`thumbfa.st${legacyPath}`) ||
        content.includes(`](${legacyPath}`) ||
        content.includes(`href="${legacyPath}`)
          ? [`${path.relative(process.cwd(), file)}: ${legacyPath}`]
          : [],
      );
    });

    expect(offenders).toEqual([]);
  });
});
