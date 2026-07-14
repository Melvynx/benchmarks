import { describe, expect, it } from "vitest";

import {
  canReadInspiration,
  getInspirationImageUrls,
  getReviewStatus,
  isAnonymizedImageUrl,
  resolveHasPlaceholder,
} from "../convex/lib/inspirationAccess";

const ownOrgId = "org_own";
const communityOrgId = "org_community";

describe("inspiration access", () => {
  it("allows the owner to use pending private inspirations", () => {
    expect(
      canReadInspiration(
        {
          organizationId: ownOrgId,
          adminReview: "PENDING",
        },
        ownOrgId,
      ),
    ).toBe(true);
  });

  it("allows another organization to use approved community inspirations", () => {
    expect(
      canReadInspiration(
        {
          organizationId: communityOrgId,
          isPublic: true,
          adminReview: "GOOD",
        },
        ownOrgId,
      ),
    ).toBe(true);
  });

  it("blocks another organization from using non-community inspirations", () => {
    expect(
      canReadInspiration(
        {
          organizationId: communityOrgId,
          isPublic: true,
          adminReview: "PENDING",
        },
        ownOrgId,
      ),
    ).toBe(false);
  });

  it("blocks another organization from using private approved inspirations", () => {
    expect(
      canReadInspiration(
        {
          organizationId: communityOrgId,
          isPublic: false,
          adminReview: "GOOD",
        },
        ownOrgId,
      ),
    ).toBe(false);
  });

  it("blocks deleted inspirations for owners and community users", () => {
    const deletedInspiration = {
      organizationId: ownOrgId,
      isPublic: true,
      adminReview: "GOOD",
      deletedAt: Date.now(),
    };

    expect(canReadInspiration(deletedInspiration, ownOrgId)).toBe(false);
    expect(canReadInspiration(deletedInspiration, communityOrgId)).toBe(false);
  });

  it("normalizes legacy reviewed inspirations as approved", () => {
    expect(getReviewStatus({ reviewedAt: Date.now() })).toBe("APPROVED");
  });

  it("uses every stored image from multi-image inspirations", () => {
    expect(
      getInspirationImageUrls({
        organizationId: communityOrgId,
        image: { url: "https://example.com/legacy.png" },
        images: [
          { url: "https://example.com/first.png" },
          { url: "https://example.com/second.png" },
        ],
      }),
    ).toEqual([
      "https://example.com/first.png",
      "https://example.com/second.png",
    ]);
  });

  it("detects anonymized inspirations from stored flag or image url", () => {
    expect(
      resolveHasPlaceholder(true, ["https://example.com/original.png"]),
    ).toBe(true);
    expect(
      resolveHasPlaceholder(false, [
        "https://cdn.example.com/inspirations/anonymized-123.jpeg",
      ]),
    ).toBe(true);
    expect(
      resolveHasPlaceholder(undefined, ["https://example.com/original.png"]),
    ).toBe(false);
    expect(isAnonymizedImageUrl("anonymized-123.jpeg")).toBe(true);
  });
});
