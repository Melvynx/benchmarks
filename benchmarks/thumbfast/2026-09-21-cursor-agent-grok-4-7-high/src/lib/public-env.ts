type PublicEnv = Record<string, boolean | string | undefined>;

const getImportMetaEnv = () =>
  (import.meta as ImportMeta & { env: PublicEnv }).env;

const getProcessEnv = () =>
  typeof process === "undefined" ? undefined : process.env;

export function getPublicEnv(...keys: string[]) {
  const importMetaEnv = getImportMetaEnv();
  const processEnv = getProcessEnv();

  for (const key of keys) {
    const value = importMetaEnv[key] ?? processEnv?.[key];
    if (typeof value === "string" && value.length > 0) {
      return value;
    }
  }

  return undefined;
}

export function getConvexSiteUrl() {
  const explicitSiteUrl = getPublicEnv(
    "VITE_CONVEX_SITE_URL",
    "NEXT_PUBLIC_CONVEX_SITE_URL",
  );
  if (explicitSiteUrl) return explicitSiteUrl;

  const convexUrl = getPublicEnv("VITE_CONVEX_URL", "NEXT_PUBLIC_CONVEX_URL");
  if (!convexUrl) return undefined;

  try {
    const url = new URL(convexUrl);
    if (!url.hostname.endsWith(".convex.cloud")) return undefined;
    url.hostname = url.hostname.replace(/\.convex\.cloud$/, ".convex.site");
    return url.toString().replace(/\/$/, "");
  } catch {
    return undefined;
  }
}

export const isViteProd = () => getImportMetaEnv().PROD === true;
