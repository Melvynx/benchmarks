import { describe, expect, it } from "vitest";
import {
  ORGANIZATION_LINKS,
  getOrganizationNavigation,
} from "../src/features/organization/org-navigation.links";
import { canAccessThumbnailAgent } from "../src/features/agent/thumbnail-agent-access";
import type { AuthRole } from "../src/lib/auth/auth-permissions";

const thumbnailLinksCount = ORGANIZATION_LINKS[0].links.length - 1;

describe("getOrganizationNavigation", () => {
  it("should replace organization slug in all URLs", () => {
    const slug = "test-org";
    const userRoles: AuthRole[] = ["member"];

    const result = getOrganizationNavigation(slug, userRoles);

    // Check that all links have the slug replaced
    result.forEach((group) => {
      if (group.defaultOpenStartPath) {
        expect(group.defaultOpenStartPath).not.toContain(":organizationSlug");
        expect(group.defaultOpenStartPath).toContain(slug);
      }

      group.links.forEach((link) => {
        expect(link.href).not.toContain(":organizationSlug");
        expect(link.href).toContain(slug);
      });
    });
  });

  it("should filter links based on user roles - member", () => {
    const slug = "test-org";
    const userRoles: AuthRole[] = ["member"];

    const result = getOrganizationNavigation(slug, userRoles);

    // All 3 groups present (Thumbnails, Resources, Organization with Referral)
    expect(result).toHaveLength(ORGANIZATION_LINKS.length);
    expect(result[0].links).toHaveLength(thumbnailLinksCount);
    expect(result[1].links).toHaveLength(ORGANIZATION_LINKS[1].links.length);
    expect(result[0].links.map((link) => link.label)).not.toContain("Agent");
  });

  it("should filter links based on user roles - admin with agent disabled", () => {
    const slug = "test-org";
    const userRoles: AuthRole[] = ["admin"];

    const result = getOrganizationNavigation(slug, userRoles);

    expect(result[0].links).toHaveLength(thumbnailLinksCount);
    expect(result[1].links).toHaveLength(ORGANIZATION_LINKS[1].links.length);
    expect(result[0].links.map((link) => link.label)).not.toContain("Agent");

    // Admin can access Settings, Members, Billing (not Danger Zone)
    const orgGroup = result[2];
    const allowedLinks = orgGroup.links;
    expect(allowedLinks.map((link) => link.label)).toContain("Settings");
    expect(allowedLinks.map((link) => link.label)).toContain("Members");
    expect(allowedLinks.map((link) => link.label)).toContain("Billing");
    expect(allowedLinks.map((link) => link.label)).not.toContain("Danger Zone");
  });

  it("should filter links based on user roles - owner with agent disabled", () => {
    const slug = "test-org";
    const userRoles: AuthRole[] = ["owner"];

    const result = getOrganizationNavigation(slug, userRoles);

    // Owner can access all links except feature-flagged Agent while disabled
    expect(result[0].links).toHaveLength(thumbnailLinksCount);
    expect(result[1].links).toHaveLength(ORGANIZATION_LINKS[1].links.length);
    expect(result[0].links.map((link) => link.label)).not.toContain("Agent");
    const orgGroup = result[2];
    const allowedLinks = orgGroup.links;
    expect(allowedLinks.length).toEqual(ORGANIZATION_LINKS[2].links.length);
    expect(allowedLinks.map((link) => link.label)).toContain("Settings");
    expect(allowedLinks.map((link) => link.label)).toContain("Members");
    expect(allowedLinks.map((link) => link.label)).toContain("Billing");
    expect(allowedLinks.map((link) => link.label)).toContain("Danger Zone");
  });

  it("should handle undefined user roles", () => {
    const slug = "test-org";
    const userRoles = undefined;

    const result = getOrganizationNavigation(slug, userRoles);

    // All 3 groups present (no-role links exist in each group)
    expect(result).toHaveLength(ORGANIZATION_LINKS.length);
    expect(result[0].links).toHaveLength(thumbnailLinksCount);
    expect(result[1].links).toHaveLength(ORGANIZATION_LINKS[1].links.length);
    expect(result[0].links.map((link) => link.label)).not.toContain("Agent");
  });

  it("should hide Agent from members even when enabled", () => {
    const result = getOrganizationNavigation("test-org", ["member"], {
      thumbnailAgentEnabled: true,
    });

    expect(result[0].links.map((link) => link.label)).not.toContain("Agent");
  });

  it("should show Agent to admins when enabled", () => {
    const result = getOrganizationNavigation("test-org", ["admin"], {
      thumbnailAgentEnabled: true,
    });

    expect(result[0].links.map((link) => link.label)).toContain("Agent");
  });

  it("should show Agent to owners when enabled", () => {
    const result = getOrganizationNavigation("test-org", ["owner"], {
      thumbnailAgentEnabled: true,
    });

    expect(result[0].links.map((link) => link.label)).toContain("Agent");
  });
});

describe("canAccessThumbnailAgent", () => {
  it("should require admin or owner and the thumbnail agent flag", () => {
    expect(
      canAccessThumbnailAgent({
        role: "member",
        features: { thumbnailAgentEnabled: true },
      }),
    ).toBe(false);
    expect(
      canAccessThumbnailAgent({
        role: "admin",
        features: { thumbnailAgentEnabled: false },
      }),
    ).toBe(false);
    expect(
      canAccessThumbnailAgent({
        role: "admin",
        features: { thumbnailAgentEnabled: true },
      }),
    ).toBe(true);
    expect(
      canAccessThumbnailAgent({
        role: "owner",
        features: { thumbnailAgentEnabled: true },
      }),
    ).toBe(true);
  });
});
