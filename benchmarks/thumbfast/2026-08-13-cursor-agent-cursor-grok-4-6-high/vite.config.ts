import tailwindcss from "@tailwindcss/vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import { nitro } from "nitro/vite";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { defineConfig } from "vite";
import fm from "front-matter";

const staticMarketingPagePaths = [
  "/",
  "/about",
  "/ab-testing",
  "/agents",
  "/ai-thumbnail-generator",
  "/ai-thumbnail-maker",
  "/anonymize",
  "/contact",
  "/create-thumbnail",
  "/create-thumbnail-fast",
  "/face-consistency",
  "/for-enterprise",
  "/for-thumbnail-designers",
  "/for-youtubers",
  "/free-thumbnail-maker",
  "/generate-thumbnail",
  "/inspiration-library",
  "/legal/privacy",
  "/legal/terms",
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
];

type FrontMatterAttributes = {
  status?: string;
  tags?: string[];
};

function walkFiles(directory: string, extension: string): string[] {
  if (!existsSync(directory)) {
    return [];
  }

  const files: string[] = [];

  for (const entry of readdirSync(directory)) {
    const filePath = join(directory, entry);
    const stats = statSync(filePath);

    if (stats.isDirectory()) {
      files.push(...walkFiles(filePath, extension));
      continue;
    }

    if (entry.endsWith(extension)) {
      files.push(filePath);
    }
  }

  return files;
}

function readPublishedMdx(filePath: string) {
  const matter = fm<FrontMatterAttributes>(readFileSync(filePath, "utf8"));
  if (matter.attributes.status === "draft") {
    return null;
  }
  return matter;
}

function getPostPaths() {
  const postsDirectory = join(import.meta.dirname, "content/posts");
  const posts = walkFiles(postsDirectory, ".mdx")
    .map((filePath) => {
      const matter = readPublishedMdx(filePath);
      if (!matter) {
        return null;
      }
      const fileName = filePath.split(sep).at(-1);
      if (!fileName) {
        return null;
      }
      return {
        path: `/posts/${fileName.replace(".mdx", "").replace(/^\d+-/, "")}`,
        tags: matter.attributes.tags ?? [],
      };
    })
    .filter((post): post is { path: string; tags: string[] } => post !== null);
  const categoryPaths = Array.from(
    new Set(posts.flatMap((post) => post.tags)),
  ).map((tag) => `/posts/categories/${tag}`);

  return ["/posts", ...posts.map((post) => post.path), ...categoryPaths];
}

function getChangelogPaths() {
  const changelogDirectory = join(import.meta.dirname, "content/changelog");
  const changelogs = walkFiles(changelogDirectory, ".mdx")
    .map((filePath) => {
      const matter = readPublishedMdx(filePath);
      if (!matter) {
        return null;
      }
      const fileName = filePath.split(sep).at(-1);
      if (!fileName) {
        return null;
      }
      return `/changelog/${fileName.replace(".mdx", "")}`;
    })
    .filter((path): path is string => path !== null);

  return ["/changelog", ...changelogs];
}

function getDocsPaths() {
  const docsDirectory = join(import.meta.dirname, "content/docs");
  const docs = walkFiles(docsDirectory, ".mdx")
    .map((filePath) => {
      const relativePath = relative(docsDirectory, filePath);
      const slug = relativePath
        .replace(/\.mdx$/, "")
        .split(sep)
        .filter((part) => part !== "index")
        .join("/");

      return slug ? `/docs/${slug}` : "/docs";
    })
    .filter((path) => path !== "/docs");

  return ["/docs", ...docs];
}

const publicPagePaths = [
  ...staticMarketingPagePaths,
  ...getPostPaths(),
  ...getChangelogPaths(),
  ...getDocsPaths(),
];

const publicPages = Array.from(new Set(publicPagePaths)).map((path) => ({
  path,
  prerender: { enabled: true },
}));

export default defineConfig({
  base: "/",
  envPrefix: ["VITE_", "NEXT_PUBLIC_"],
    server: { port: Number(process.env.PORT) || 9309 },
  resolve: {
    tsconfigPaths: true,
  },
  ssr: {
    noExternal: ["@convex-dev/better-auth"],
    external: [
      "stripe",
      "resend",
      "dotenv",
      "@aws-sdk/client-s3",
      "@resvg/resvg-js",
    ],
  },
  plugins: [
    tailwindcss(),
    tanstackStart({
      router: {
        routeFileIgnorePrefix: "-",
        routeFileIgnorePattern:
          "\\.(action|schema|links)\\.ts|_components|_actions|(?:^|/)(?:loading|error|not-found|global-error)(?:\\.|/)",
      },
      prerender: {
        enabled: true,
        autoSubfolderIndex: true,
        crawlLinks: false,
        autoStaticPathsDiscovery: false,
        failOnError: false,
      },
      pages: publicPages,
    }),
    nitro({
      serverDir: "server",
      // Marketing assets are versioned by filename — rename the file when
      // replacing its content, otherwise browsers keep the old one for a year.
      routeRules: {
        "/landing/**": {
          headers: { "cache-control": "public, max-age=31536000, immutable" },
        },
        "/icons/**": {
          headers: { "cache-control": "public, max-age=31536000, immutable" },
        },
        "/images/**": {
          headers: {
            "cache-control":
              "public, max-age=604800, stale-while-revalidate=2592000",
          },
        },
      },
      serverAssets: [
        { baseName: "docs", dir: "content/docs" },
        { baseName: "posts", dir: "content/posts" },
        { baseName: "changelog", dir: "content/changelog" },
      ],
    } as Parameters<typeof nitro>[0]),
    viteReact(),
  ],
});
