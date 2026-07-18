import { SiteConfig } from "@/site-config";

export type Metadata = {
  [key: string]: unknown;
  title?: string | { default?: string; template?: string };
  description?: string;
  keywords?: string[] | string;
  alternates?: {
    canonical?: string;
  };
  openGraph?: {
    title?: string;
    description?: string;
    url?: string;
    type?: string;
    images?:
      | string
      | string[]
      | {
          url?: string;
        }
      | {
          url?: string;
        }[];
  };
  twitter?: {
    card?: string;
    title?: string;
    description?: string;
    images?:
      | string
      | string[]
      | {
          url?: string;
        }
      | {
          url?: string;
        }[];
  };
  robots?:
    | string
    | {
        index?: boolean;
        follow?: boolean;
      };
};

type MetaTag =
  | { title: string }
  | { charSet: string }
  | { name: string; content: string }
  | { property: string; content: string };

type LinkTag = {
  rel: string;
  href: string;
  sizes?: string;
  type?: string;
};

export type RouteHead = {
  meta: MetaTag[];
  links?: LinkTag[];
};

export type PageMetadata = {
  title: string;
  description?: string;
  path?: string;
  image?: string | null;
  keywords?: string[] | string;
  noIndex?: boolean;
  type?: string;
};

export type RouteMatchForMetadata = {
  routeId?: unknown;
  fullPath?: unknown;
  pathname?: unknown;
  params?: unknown;
  loaderData?: unknown;
  status?: unknown;
  globalNotFound?: unknown;
};

type MetadataImageValue =
  | string
  | string[]
  | { url?: string }
  | { url?: string }[]
  | undefined;

export const combineWithParentMetadata =
  (metadata: Metadata) => async (): Promise<Metadata> => {
    return metadata;
  };

export const orgMetadata = async (orgSlug: string): Promise<Metadata> => {
  const name = orgSlug
    .split("-")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");

  return {
    title: {
      default: name || SiteConfig.title,
      template: `%s · ${name || SiteConfig.title} · ${SiteConfig.title}`,
    },
  };
};

export function absoluteUrl(pathOrUrl?: string | null) {
  if (!pathOrUrl) return SiteConfig.prodUrl;
  if (/^https?:\/\//i.test(pathOrUrl)) return pathOrUrl;
  if (pathOrUrl.startsWith("/")) return `${SiteConfig.prodUrl}${pathOrUrl}`;
  return `${SiteConfig.prodUrl}/${pathOrUrl}`;
}

export function withSiteTitle(_title: string) {
  return SiteConfig.title;
}

export function formatScopedTitle(parts: (string | null | undefined)[]) {
  return withSiteTitle(
    parts
      .map((part) => part?.trim())
      .filter((part): part is string => Boolean(part))
      .join(" - "),
  );
}

export function metadataToHead(metadata: Metadata): RouteHead {
  const title = resolveMetadataTitle(metadata.title);
  const description = metadata.description;
  const canonical = metadata.alternates?.canonical;
  const openGraph = metadata.openGraph;
  const twitter = metadata.twitter;
  const image =
    resolveImage(openGraph?.images ?? twitter?.images) ?? SiteConfig.ogImage;
  const robots = resolveRobots(metadata.robots);

  const meta = buildMetaTags({
    title,
    description,
    image,
    keywords: metadata.keywords,
    noIndex: robots === "noindex,nofollow",
    path: typeof openGraph?.url === "string" ? openGraph.url : canonical,
    type: openGraph?.type,
    ogTitle: openGraph?.title,
    ogDescription: openGraph?.description,
    twitterCard: twitter?.card,
    twitterTitle: twitter?.title,
    twitterDescription: twitter?.description,
  });

  if (robots && !meta.some((tag) => "name" in tag && tag.name === "robots")) {
    meta.push({ name: "robots", content: robots });
  }

  return {
    meta,
    links: canonical
      ? [{ rel: "canonical", href: absoluteUrl(canonical) }]
      : [],
  };
}

export function createPageHead(metadata: PageMetadata): RouteHead {
  return {
    meta: buildMetaTags({
      title: metadata.title,
      description: metadata.description,
      image: metadata.image ?? SiteConfig.ogImage,
      keywords: metadata.keywords,
      noIndex: metadata.noIndex,
      path: metadata.path,
      type: metadata.type,
    }),
    links:
      metadata.path && !metadata.noIndex
        ? [{ rel: "canonical", href: absoluteUrl(metadata.path) }]
        : [],
  };
}

export function createRouteHeadFromMatches(
  matches: readonly RouteMatchForMetadata[],
): RouteHead {
  return createPageHead(getPageMetadataFromMatches(matches));
}

export function shouldUseRootPageMetadata(
  matches: readonly RouteMatchForMetadata[],
) {
  const match = getDeepestMatch(matches);
  const pathname = normalizePath(readString(match?.pathname) ?? "/");
  if (pathname === "/") return true;

  const routeKey = normalizeRouteKey(
    readString(match?.fullPath) ?? readString(match?.routeId) ?? pathname,
  );

  return (
    !ROUTES_WITH_ROUTE_HEAD.has(routeKey) &&
    !ROUTES_WITH_ROUTE_HEAD.has(pathname)
  );
}

export function getPageMetadataFromMatches(
  matches: readonly RouteMatchForMetadata[],
): PageMetadata {
  const match = getDeepestMatch(matches);
  const pathname = normalizePath(readString(match?.pathname) ?? "/");
  const routeId = readString(match?.routeId);
  const fullPath = readString(match?.fullPath) ?? routeId ?? pathname;
  const params = readRecord(match?.params);

  if (fullPath === "/posts/$slug") {
    const post = readRecord(readRecord(match?.loaderData)?.post);
    const attributes = readRecord(post?.attributes);
    const title = readString(attributes?.title);
    if (title) {
      return {
        title,
        description: readString(attributes?.description),
        keywords: readStringArray(attributes?.keywords),
        image: readString(attributes?.coverUrl),
        path: `/posts/${readString(post?.slug) ?? params?.slug ?? ""}`,
        type: "article",
      };
    }
  }

  if (fullPath === "/posts/categories/$category") {
    const category = readString(params?.category) ?? "Category";
    return {
      title: `${humanizeSegment(category)} Articles`,
      description: `Read ${humanizeSegment(category).toLowerCase()} articles from ${SiteConfig.title}.`,
      path: `/posts/categories/${category}`,
    };
  }

  if (fullPath === "/docs/" || fullPath === "/docs/$") {
    const doc = getDocFromLoaderData(match?.loaderData);
    if (doc) {
      const attributes = readRecord(doc.attributes);
      const title = readString(attributes?.title);
      return {
        title: title ? `${title} Docs` : "Documentation",
        description:
          readString(attributes?.description) ??
          `Documentation and guides for ${SiteConfig.title}.`,
        keywords: readStringArray(attributes?.keywords),
        image: readString(attributes?.coverUrl),
        path: pathname,
      };
    }

    return {
      title: "Documentation",
      description: `Documentation and guides for ${SiteConfig.title}.`,
      path: "/docs",
    };
  }

  if (fullPath === "/changelog/$slug") {
    const changelog = readRecord(match?.loaderData);
    const attributes = readRecord(changelog?.attributes);
    const title =
      readString(attributes?.title) ??
      (readString(attributes?.version)
        ? `Version ${readString(attributes?.version)}`
        : "Changelog Entry");
    return {
      title,
      description: `Release notes and product updates for ${title}.`,
      image: readString(attributes?.image),
      path: `/changelog/${readString(changelog?.slug) ?? params?.slug ?? ""}`,
      type: "article",
    };
  }

  if (pathname === "/") {
    return {
      title: SiteConfig.title,
      description:
        "Generate scroll-stopping YouTube thumbnails in seconds with AI. Face-consistent, style-matching, A/B test ready. Try free. No credit card required.",
      path: "/",
    };
  }

  const exact = STATIC_PUBLIC_METADATA[pathname];
  if (exact) return exact;

  if (pathname.startsWith("/orgs")) {
    return getOrgRoutePageMetadata(
      pathname,
      readString(params?.orgSlug) ?? getOrgSlugFromPath(pathname),
    );
  }

  if (pathname.startsWith("/admin")) {
    return createPrivateMetadata(
      ADMIN_PAGE_TITLES[normalizeRouteKey(fullPath)] ??
        titleFromPath(pathname, "Admin"),
      "Admin workspace for platform operations.",
      pathname,
    );
  }

  if (pathname.startsWith("/account")) {
    return createPrivateMetadata(
      ACCOUNT_PAGE_TITLES[normalizeRouteKey(fullPath)] ??
        titleFromPath(pathname, "Account"),
      "Manage your account and security settings.",
      pathname,
    );
  }

  if (pathname.startsWith("/auth")) {
    return createPrivateMetadata(
      AUTH_PAGE_TITLES[normalizeRouteKey(fullPath)] ??
        titleFromPath(pathname, "Authentication"),
      "Access your Thumbfa.st account.",
      pathname,
    );
  }

  if (pathname.startsWith("/payment")) {
    return createPrivateMetadata(
      "Payment",
      "Payment status for your account.",
      pathname,
    );
  }

  return {
    title: titleFromPath(pathname, SiteConfig.title),
    description: SiteConfig.description,
    path: pathname,
  };
}

export function getOrgRoutePageMetadata(
  pathname: string,
  orgSlug?: string | null,
  orgName?: string | null,
): PageMetadata {
  const slug = orgSlug || getOrgSlugFromPath(pathname);
  const displayName = orgName?.trim() || humanizeSegment(slug || "Workspace");
  const label = getOrgRouteLabel(pathname, slug);

  return createPrivateMetadata(
    formatScopedTitle([label, displayName]),
    `${label} for ${displayName}.`,
    pathname,
  );
}

function buildMetaTags(input: {
  title: string;
  description?: string;
  image?: string | null;
  keywords?: string[] | string;
  noIndex?: boolean;
  path?: string;
  type?: string;
  ogTitle?: string;
  ogDescription?: string;
  twitterCard?: string;
  twitterTitle?: string;
  twitterDescription?: string;
}): MetaTag[] {
  const title = withSiteTitle(input.title);
  const description = input.description ?? SiteConfig.description;
  const image = absoluteUrl(input.image ?? SiteConfig.ogImage);
  const tags: MetaTag[] = [
    { title },
    { name: "description", content: description },
    { property: "og:type", content: input.type ?? "website" },
    { property: "og:site_name", content: SiteConfig.title },
    { property: "og:title", content: input.ogTitle ?? title },
    { property: "og:description", content: input.ogDescription ?? description },
    { property: "og:image", content: image },
    {
      name: "twitter:card",
      content: input.twitterCard ?? "summary_large_image",
    },
    { name: "twitter:title", content: input.twitterTitle ?? title },
    {
      name: "twitter:description",
      content: input.twitterDescription ?? description,
    },
    { name: "twitter:image", content: image },
  ];

  if (input.path) {
    tags.push({ property: "og:url", content: absoluteUrl(input.path) });
  }

  if (input.keywords) {
    tags.push({
      name: "keywords",
      content: Array.isArray(input.keywords)
        ? input.keywords.join(", ")
        : input.keywords,
    });
  }

  if (input.noIndex) {
    tags.push({ name: "robots", content: "noindex,nofollow" });
  }

  return tags;
}

function resolveMetadataTitle(title: Metadata["title"]) {
  if (typeof title === "string") return title;
  return title?.default ?? SiteConfig.title;
}

function resolveImage(value: MetadataImageValue) {
  if (!value) return null;
  if (typeof value === "string") return value;
  if (Array.isArray(value)) {
    if (value.length === 0) return null;
    const first = value[0];
    if (typeof first === "string") return first;
    return first.url ?? null;
  }
  return value.url ?? null;
}

function resolveRobots(robots: Metadata["robots"]) {
  if (!robots) return null;
  if (typeof robots === "string") return robots;
  if (robots.index === false || robots.follow === false)
    return "noindex,nofollow";
  return null;
}

function createPrivateMetadata(
  title: string,
  description: string,
  path: string,
): PageMetadata {
  return {
    title,
    description,
    path,
    noIndex: true,
  };
}

function getDeepestMatch(matches: readonly RouteMatchForMetadata[]) {
  return [...matches]
    .reverse()
    .find((match) => match.status !== "redirected" && !match.globalNotFound);
}

function getDocFromLoaderData(loaderData: unknown) {
  const data = readRecord(loaderData);
  const directDoc = readRecord(data?.doc);
  if (directDoc) return directDoc;

  const tree = readRecord(data?.tree);
  const rootDocs = Array.isArray(tree?.rootDocs) ? tree.rootDocs : [];
  const allDocs = Array.isArray(data?.allDocs) ? data.allDocs : [];
  return readRecord(rootDocs[0]) ?? readRecord(allDocs[0]);
}

function normalizePath(path: string) {
  if (path === "/") return path;
  return path.replace(/\/+$/, "");
}

function normalizeRouteKey(routeKey: string) {
  return routeKey.replace(/\/+$/, "");
}

function readRecord(value: unknown): Record<string, unknown> | null {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return null;
}

function readString(value: unknown) {
  return typeof value === "string" && value.trim() ? value : undefined;
}

function readStringArray(value: unknown) {
  if (!Array.isArray(value)) return undefined;
  const strings = value.filter(
    (item): item is string => typeof item === "string",
  );
  return strings.length > 0 ? strings : undefined;
}

function titleFromPath(pathname: string, fallback: string) {
  const segments = pathname.split("/").filter(Boolean);
  const lastSegment = segments.at(-1);
  if (!lastSegment) return fallback;
  return humanizeSegment(lastSegment);
}

function humanizeSegment(segment: string) {
  return segment
    .replace(/^\$/, "")
    .replace(/[-_]+/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function getOrgSlugFromPath(pathname: string) {
  const segments = pathname.split("/").filter(Boolean);
  return segments[0] === "orgs" ? segments[1] : undefined;
}

function getOrgRouteLabel(pathname: string, orgSlug?: string) {
  const slug = orgSlug || getOrgSlugFromPath(pathname);
  const basePath = slug ? `/orgs/${slug}` : "/orgs";
  const rest = normalizePath(pathname).slice(basePath.length) || "/";

  if (rest === "/" || rest === "") return "Dashboard";
  if (rest === "/agent") return "Thumbnail Agent";
  if (rest === "/generations") return "Generations";
  if (rest === "/images") return "Images";
  if (rest === "/inspirations" || rest === "/inspirations/")
    return "Inspirations";
  if (rest === "/inspirations/new") return "New Inspiration";
  if (/^\/inspirations\/[^/]+$/.test(rest)) return "Inspiration";
  if (rest === "/persons") return "Persons";
  if (rest === "/persons/new") return "New Person";
  if (/^\/persons\/[^/]+$/.test(rest)) return "Person";
  if (rest === "/thumbnails" || rest === "/thumbnails/") return "Thumbnails";
  if (rest === "/thumbnails/new") return "New Thumbnail";
  if (/^\/thumbnails\/[^/]+$/.test(rest)) return "Thumbnail";
  if (rest === "/videos" || rest === "/videos/") return "Videos";
  if (/^\/videos\/[^/]+$/.test(rest)) return "Video";
  if (rest === "/onboard") return "Onboarding";
  if (rest === "/settings") return "Settings";
  if (rest === "/settings/api-keys") return "Provider API Keys";
  if (rest === "/settings/billing") return "Billing";
  if (rest === "/settings/billing/plan") return "Billing Plan";
  if (rest === "/settings/billing/history") return "Credit History";
  if (rest === "/settings/billing/usage") return "Billing Usage";
  if (rest === "/settings/billing/payment") return "Payment Method";
  if (rest === "/settings/billing/logs") return "Credit Logs";
  if (rest === "/settings/billing/success") return "Billing Success";
  if (rest === "/settings/billing/cancel") return "Cancel Subscription";
  if (rest === "/settings/developer") return "Developer";
  if (rest === "/settings/members") return "Members";
  if (rest === "/settings/referral") return "Referral";
  if (rest === "/settings/danger") return "Danger Zone";

  return titleFromPath(rest, "Workspace");
}

const STATIC_PUBLIC_METADATA: Partial<Record<string, PageMetadata>> = {
  "/about": {
    title: `About ${SiteConfig.title}`,
    description:
      "Learn about Thumbfa.st, our mission to empower YouTubers with AI-powered thumbnail generation, and meet the founder behind the platform.",
    path: "/about",
  },
  "/contact": {
    title: "Contact",
    description:
      "Contact Thumbfa.st for questions about AI thumbnail generation, support, or product feedback.",
    path: "/contact",
  },
  "/posts": {
    title: "Blog",
    description:
      "Read practical thumbnail strategy, AI workflow, and YouTube growth notes from Thumbfa.st.",
    path: "/posts",
  },
  "/changelog": {
    title: "Changelog",
    description:
      "Stay up to date with Thumbfa.st features, improvements, and fixes.",
    path: "/changelog",
  },
  "/docs": {
    title: "Documentation",
    description: `Documentation and guides for ${SiteConfig.title}.`,
    path: "/docs",
  },
  "/tools": {
    title: `Free YouTube Tools - ${SiteConfig.title}`,
    description:
      "Free YouTube tools for creators. Download thumbnails, generate video cards, anonymize images, and more.",
    path: "/tools",
  },
  "/tools/youtube-thumbnail": {
    title: `Free YouTube Thumbnail Downloader - ${SiteConfig.title}`,
    description:
      "Extract and download YouTube video thumbnails in all available resolutions. Free, no signup required.",
    path: "/tools/youtube-thumbnail",
  },
  "/tools/youtube-video-card": {
    title: `Free YouTube Video Card Generator - ${SiteConfig.title}`,
    description:
      "Create customizable YouTube video cards with full theme control and export as PNG.",
    path: "/tools/youtube-video-card",
  },
  "/tools/anonymize": {
    title: `Anonymize YouTube Thumbnails - ${SiteConfig.title}`,
    description:
      "Anonymize YouTube thumbnails and images by replacing people with wireframe mannequins.",
    path: "/tools/anonymize",
  },
};

const ROUTES_WITH_ROUTE_HEAD = new Set([
  "/ab-testing",
  "/about",
  "/agents",
  "/ai-thumbnail-generator",
  "/ai-thumbnail-maker",
  "/anonymize",
  "/changelog",
  "/changelog/$slug",
  "/contact",
  "/create-thumbnail-fast",
  "/create-thumbnail",
  "/docs",
  "/docs/$",
  "/face-consistency",
  "/for-enterprise",
  "/for-thumbnail-designers",
  "/for-youtubers",
  "/free-thumbnail-maker",
  "/generate-thumbnail",
  "/inspiration-library",
  "/legal/privacy",
  "/legal/terms",
  "/posts",
  "/posts/$slug",
  "/posts/categories/$category",
  "/thumbfast",
  "/thumbnail-creator",
  "/thumbnail-design-tool",
  "/thumbnail-generator",
  "/tools",
  "/tools/anonymize",
  "/tools/youtube-thumbnail",
  "/tools/youtube-video-card",
  "/video-management",
  "/youtube-thumbnail-generator",
  "/youtube-thumbnail-maker",
]);

const AUTH_PAGE_TITLES: Record<string, string> = {
  "/auth/signin": "Sign in",
  "/auth/signup": "Create account",
  "/auth/start": "Get started",
  "/auth/forget-password": "Reset password",
  "/auth/verify": "Verify email",
  "/auth/goodbye": "Account deleted",
  "/auth/new-user": "Opening workspace",
};

const ACCOUNT_PAGE_TITLES: Record<string, string> = {
  "/account": "Account",
  "/account/change-email": "Change email",
  "/account/change-password": "Change password",
  "/account/danger": "Danger Zone",
  "/account/email": "Email Settings",
};

const ADMIN_PAGE_TITLES: Record<string, string> = {
  "/admin": "Admin",
  "/admin/": "Admin Dashboard",
  "/admin/users": "Admin Users",
  "/admin/users/": "Admin Users",
  "/admin/users/$userId": "Admin User Details",
  "/admin/organizations": "Admin Organizations",
  "/admin/organizations/": "Admin Organizations",
  "/admin/organizations/$orgId": "Admin Organization Details",
  "/admin/organizations/$orgId/generations": "Admin Organization Generations",
  "/admin/generations": "Admin Generations",
  "/admin/generations/": "Admin Generations",
  "/admin/generations/logs": "Generation Logs",
  "/admin/inspirations": "Admin Inspirations",
  "/admin/inspirations/": "Admin Inspirations",
  "/admin/inspirations/interactive": "Interactive Inspirations",
  "/admin/feedback": "Admin Feedback",
  "/admin/feedback/": "Admin Feedback",
  "/admin/feedback/$feedbackId": "Admin Feedback Details",
  "/admin/referrals": "Admin Referrals",
  "/admin/referrals/": "Admin Referrals",
  "/admin/errors": "Admin Errors",
  "/admin/errors/": "Admin Errors",
  "/admin/feature-flags": "Feature Flags",
  "/admin/feature-flags/": "Feature Flags",
  "/admin/leads": "Admin Leads",
  "/admin/funnel": "Admin Funnel",
  "/admin/migrations": "Admin Migrations",
};
