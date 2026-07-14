import { api } from "@convex/_generated/api";
import {
  fetchAuthMutationForRequest,
  fetchAuthQueryForRequest,
} from "@/lib/auth-server";
import { RESERVED_SLUGS } from "@/lib/organizations/reserved-slugs";
import { SiteConfig } from "@/site-config";
import { getSessionCookie } from "better-auth/cookies";

type ProxyRequest = Request;

type ProxySession = {
  session: { userId: string };
  user: {
    id: string;
    email: string;
    name: string | null;
    role?: string | null;
  };
};

const authCookiePrefix =
  process.env.BETTER_AUTH_COOKIE_PREFIX ?? SiteConfig.appId;

export const extractOrgSlug = (pathname: string) => {
  if (!pathname.startsWith("/orgs/")) return null;

  const slugStartIndex = "/orgs/".length;
  const slashIndex = pathname.indexOf("/", slugStartIndex);
  const slug =
    slashIndex === -1
      ? pathname.substring(slugStartIndex)
      : pathname.substring(slugStartIndex, slashIndex);

  const isValidSlug = slug && slug !== "" && pathname !== "/orgs";
  return isValidSlug ? slug : null;
};

export const validateSession = async (
  request: ProxyRequest,
): Promise<ProxySession | null> => {
  const sessionCookie = getSessionCookie(request, {
    cookiePrefix: authCookiePrefix,
  });

  if (!sessionCookie) return null;

  try {
    const profile = await fetchAuthQueryForRequest(
      request,
      api.app.getProfile,
      {},
    );
    return {
      session: { userId: profile.user.id },
      user: {
        id: profile.user.id,
        email: profile.user.email,
        name: profile.user.name,
      },
    };
  } catch {
    return null;
  }
};

export const findUserOrganization = async (
  request: ProxyRequest,
  slug: string,
  _userId: string,
) => {
  try {
    const result = await fetchAuthQueryForRequest(
      request,
      api.app.orgSettings,
      { orgSlug: slug },
    );
    return { id: result.org.id, slug: result.org.slug };
  } catch {
    return null;
  }
};

export const getFirstUserOrganization = async (
  request: ProxyRequest,
  _userId: string,
) => {
  try {
    const result = await fetchAuthMutationForRequest(
      request,
      api.app.firstOrg,
      {},
    );
    const slug = result.redirectTo.startsWith("/orgs/")
      ? result.redirectTo.slice("/orgs/".length).split("/")[0]
      : null;

    return slug ? { id: slug, slug } : null;
  } catch {
    return null;
  }
};

const getRequestUrl = (request: ProxyRequest) => new URL(request.url);

export const redirectToOrgList = (request: ProxyRequest) => {
  const url = getRequestUrl(request);
  url.pathname = "/orgs";
  return Response.redirect(url);
};

export const validateAdminAccess = async (request: ProxyRequest) => {
  const session = await validateSession(request);
  return session?.user.role === "admin" ? session.user : null;
};

export const redirectToRoot = (request: ProxyRequest) => {
  const url = getRequestUrl(request);
  url.pathname = "/";
  return Response.redirect(url);
};

export const isAdminRoute = (pathname: string) => {
  return pathname.startsWith("/admin");
};

export const isReservedSlug = (slug: string) => {
  return RESERVED_SLUGS.includes(slug);
};

export const buildOrgRedirectUrl = (request: ProxyRequest, newSlug: string) => {
  const newUrl = new URL(request.url);
  const parts = getRequestUrl(request).pathname.split("/");
  parts[2] = newSlug;
  newUrl.pathname = parts.join("/");
  return Response.redirect(newUrl);
};
