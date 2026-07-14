import { api } from "@convex/_generated/api";
import { ConvexHttpClient } from "convex/browser";
import { makeFunctionReference } from "convex/server";
import { config } from "dotenv";

if (process.env.CONVEX_E2E_SKIP_DOTENV !== "true") {
  config({ path: ".env.local", quiet: true });
  config({ quiet: true });
}

let resolvedConvexUrl: string | null | Promise<string | null> | undefined =
  process.env.VITE_CONVEX_URL ?? process.env.NEXT_PUBLIC_CONVEX_URL ?? null;

async function resolveConvexUrl() {
  if (typeof resolvedConvexUrl === "string") {
    return resolvedConvexUrl;
  }

  if (resolvedConvexUrl) {
    return resolvedConvexUrl;
  }

  const baseUrl = process.env.PLAYWRIGHT_TEST_BASE_URL;
  if (!baseUrl) {
    return null;
  }

  resolvedConvexUrl = discoverConvexUrlFromApp(baseUrl);
  return resolvedConvexUrl;
}

async function discoverConvexUrlFromApp(baseUrl: string) {
  const headers = getPreviewHeaders();
  const rootUrl = new URL("/", baseUrl);
  const rootHtml = await fetchText(rootUrl, headers);
  const directMatch = findConvexUrl(rootHtml);
  if (directMatch) {
    return directMatch;
  }

  const assetPaths = [...rootHtml.matchAll(/(?:src|href)="([^"]+\.js)"/g)]
    .map((match) => match[1])
    .filter(Boolean);

  const assetMatches = await Promise.all(
    assetPaths.map(async (assetPath) => {
      const assetUrl = new URL(assetPath, rootUrl);
      const asset = await fetchText(assetUrl, headers).catch(() => "");
      return findConvexUrl(asset);
    }),
  );

  for (const assetMatch of assetMatches) {
    if (assetMatch) return assetMatch;
  }

  return null;
}

function getPreviewHeaders() {
  const bypass = process.env.VERCEL_AUTOMATION_BYPASS_SECRET;
  return bypass ? { "x-vercel-protection-bypass": bypass } : undefined;
}

async function fetchText(url: URL, headers?: Record<string, string>) {
  const response = await fetch(url, { headers });
  if (!response.ok) {
    throw new Error(`Failed to fetch ${url.toString()}: ${response.status}`);
  }
  return response.text();
}

function findConvexUrl(value: string) {
  return (
    value.match(
      /(?:VITE_CONVEX_URL|NEXT_PUBLIC_CONVEX_URL):`(https:\/\/[a-z0-9-]+\.convex\.cloud)`/,
    )?.[1] ??
    value.match(
      /(?:VITE_CONVEX_URL|NEXT_PUBLIC_CONVEX_URL)["']?\s*[:=]\s*["'](https:\/\/[a-z0-9-]+\.convex\.cloud)["']/,
    )?.[1] ??
    null
  );
}

async function getClient() {
  const convexUrl = await resolveConvexUrl();
  if (!convexUrl) {
    throw new Error(
      "VITE_CONVEX_URL, NEXT_PUBLIC_CONVEX_URL, or a discoverable preview Convex URL is required for Convex E2E helpers",
    );
  }
  return new ConvexHttpClient(convexUrl);
}

export async function getLatestEmailOtp(args: {
  email: string;
  type: "sign-in" | "forget-password";
}) {
  const result = await (
    await getClient()
  ).query(api.testHelpers.latestEmailOtp, args);
  return result.otp as string | null;
}

export async function setTestSubscription(args: {
  orgSlug: string;
  plan: string;
  status?: string;
}) {
  return (await getClient()).mutation(
    makeFunctionReference<
      "mutation",
      { orgSlug: string; plan: string; status?: string },
      null
    >("testHelpers:setTestSubscription"),
    args,
  );
}

export async function setTestUserRole(args: {
  email: string;
  role: "admin" | "user";
}) {
  return (await getClient()).mutation(
    makeFunctionReference<
      "mutation",
      { email: string; role: "admin" | "user" },
      null
    >("testHelpers:setTestUserRole"),
    args,
  );
}
