import {
  createPageHead,
  getPageMetadataFromMatches,
  metadataToHead,
  shouldUseRootPageMetadata,
} from "@/lib/metadata";
import { describe, expect, it } from "vitest";

describe("metadata helpers", () => {
  it("converts legacy page metadata into TanStack head tags", () => {
    const head = metadataToHead({
      title: "About Thumbfa.st",
      description: "About the AI thumbnail generator.",
      keywords: ["thumbnail", "youtube"],
      alternates: { canonical: "/about" },
      openGraph: {
        title: "About Thumbfa.st",
        description: "Founder and mission.",
        images: "/about.png",
      },
    });

    expect(findTitle(head.meta)).toBe("About Thumbfa.st");
    expect(findMeta(head.meta, "name", "description")).toBe(
      "About the AI thumbnail generator.",
    );
    expect(findMeta(head.meta, "name", "keywords")).toBe("thumbnail, youtube");
    expect(findMeta(head.meta, "property", "og:image")).toBe(
      "https://thumbfa.st/about.png",
    );
    expect(head.links).toContainEqual({
      rel: "canonical",
      href: "https://thumbfa.st/about",
    });
  });

  it("uses post loader data for route-specific metadata", () => {
    const page = getPageMetadataFromMatches([
      { routeId: "__root__", pathname: "/" },
      {
        fullPath: "/posts/$slug",
        pathname: "/posts/better-thumbnails",
        params: { slug: "better-thumbnails" },
        loaderData: {
          post: {
            slug: "better-thumbnails",
            attributes: {
              title: "Better YouTube Thumbnails",
              description: "A practical guide.",
              keywords: ["youtube", "thumbnails"],
              coverUrl: "/posts/better.png",
            },
          },
        },
      },
    ]);

    expect(page).toMatchObject({
      title: "Better YouTube Thumbnails",
      description: "A practical guide.",
      image: "/posts/better.png",
      path: "/posts/better-thumbnails",
      type: "article",
    });

    const head = createPageHead(page);
    expect(findMeta(head.meta, "property", "og:image")).toBe(
      "https://thumbfa.st/posts/better.png",
    );
  });

  it("creates noindex metadata for private organization routes", () => {
    const page = getPageMetadataFromMatches([
      { routeId: "__root__", pathname: "/" },
      {
        fullPath: "/orgs/$orgSlug/settings/billing/usage",
        pathname: "/orgs/acme-studio/settings/billing/usage",
        params: { orgSlug: "acme-studio" },
      },
    ]);
    const head = createPageHead(page);

    expect(findTitle(head.meta)).toBe(
      "Billing Usage - Acme Studio - Thumbfa.st",
    );
    expect(findMeta(head.meta, "name", "robots")).toBe("noindex,nofollow");
    expect(head.links).toEqual([]);
  });

  it("keeps root metadata fallback out of routes with their own head", () => {
    expect(
      shouldUseRootPageMetadata([
        { routeId: "__root__", pathname: "/" },
        {
          fullPath: "/thumbnail-generator",
          pathname: "/thumbnail-generator",
        },
      ]),
    ).toBe(false);

    expect(
      shouldUseRootPageMetadata([
        { routeId: "__root__", pathname: "/" },
        {
          fullPath: "/orgs/$orgSlug/settings/billing/usage",
          pathname: "/orgs/acme-studio/settings/billing/usage",
          params: { orgSlug: "acme-studio" },
        },
      ]),
    ).toBe(true);
  });
});

function findTitle(meta: ReturnType<typeof createPageHead>["meta"]) {
  return meta.find((tag) => "title" in tag)?.title;
}

function findMeta(
  meta: ReturnType<typeof createPageHead>["meta"],
  attribute: "name" | "property",
  key: string,
) {
  if (attribute === "name") {
    const tag = meta.find(
      (tag) => "name" in tag && tag.name === key && "content" in tag,
    );
    return tag && "content" in tag ? tag.content : undefined;
  }
  const tag = meta.find(
    (tag) => "property" in tag && tag.property === key && "content" in tag,
  );
  return tag && "content" in tag ? tag.content : undefined;
}
