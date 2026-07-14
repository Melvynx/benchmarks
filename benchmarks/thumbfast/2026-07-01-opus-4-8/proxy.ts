import {
  buildOrgRedirectUrl,
  extractOrgSlug,
  findUserOrganization,
  getFirstUserOrganization,
  isAdminRoute,
  isReservedSlug,
  redirectToOrgList,
  redirectToRoot,
  validateAdminAccess,
  validateSession,
} from "@/lib/auth/proxy-utils";
import { REFERRAL_COOKIE_NAME } from "@/features/referral/referral.constants";
import { getReferralCookieConfig } from "@/features/referral/referral.service";

const DOCS_LEGACY_REDIRECTS: Record<string, string> = {
  "/docs/person-best-practices": "/docs/guides/person-best-practices",
  "/docs/create-thumbnail": "/docs/guides/create-thumbnail",
  "/docs/edit-thumbnail": "/docs/guides/edit-thumbnail",
  "/docs/inspiration-guide": "/docs/guides/inspiration-guide",
  "/docs/images-guide": "/docs/guides/images-guide",
  "/docs/effective-prompting": "/docs/guides/effective-prompting",
  "/docs/mcp-setup": "/docs/api-reference/mcp-setup",
  "/docs/api-overview": "/docs/api-reference",
  "/docs/tools/generation": "/docs/api-reference/tools-generation",
};

function redirectLegacyDocsUrl(request: Request, destinationPath: string) {
  const url = new URL(request.url);
  url.pathname = destinationPath;
  return Response.redirect(url, 308);
}

function parseCookieHeader(request: Request, name: string) {
  const cookieHeader = request.headers.get("cookie");
  if (!cookieHeader) return null;

  return (
    cookieHeader
      .split(";")
      .map((part) => part.trim())
      .find((part) => part.startsWith(`${name}=`))
      ?.slice(name.length + 1) ?? null
  );
}

function nextResponse() {
  return new Response(null, { status: 200 });
}

function appendCookie(
  response: Response,
  cookie: {
    name: string;
    value: string;
    maxAge: number;
    httpOnly: boolean;
    sameSite: "lax";
    secure: boolean;
    path: string;
  },
) {
  const parts = [
    `${cookie.name}=${encodeURIComponent(cookie.value)}`,
    `Max-Age=${cookie.maxAge}`,
    `Path=${cookie.path}`,
    `SameSite=${cookie.sameSite}`,
  ];
  if (cookie.httpOnly) parts.push("HttpOnly");
  if (cookie.secure) parts.push("Secure");
  response.headers.append("Set-Cookie", parts.join("; "));
  return response;
}

export async function proxy(request: Request) {
  const requestUrl = new URL(request.url);
  const { pathname } = requestUrl;
  const pathnameWithoutTrailingSlash =
    pathname !== "/" ? pathname.replace(/\/$/, "") : pathname;
  const legacyDocsDestination =
    DOCS_LEGACY_REDIRECTS[pathnameWithoutTrailingSlash];

  if (legacyDocsDestination) {
    return redirectLegacyDocsUrl(request, legacyDocsDestination);
  }

  const referralParam = requestUrl.searchParams.get("ref");
  const existingReferralCookie = parseCookieHeader(
    request,
    REFERRAL_COOKIE_NAME,
  );

  const referralCookieConfig =
    !existingReferralCookie && referralParam
      ? await getReferralCookieConfig(referralParam.trim().toUpperCase())
      : null;

  const withReferralCookie = (response: Response) => {
    if (!referralCookieConfig) {
      return response;
    }

    return appendCookie(response, {
      name: REFERRAL_COOKIE_NAME,
      value: referralCookieConfig.code,
      maxAge: referralCookieConfig.maxAgeSeconds,
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
    });
  };

  if (pathname === "/") {
    return withReferralCookie(nextResponse());
  }

  if (isAdminRoute(pathname)) {
    const adminUser = await validateAdminAccess(request);
    if (!adminUser) {
      return withReferralCookie(redirectToRoot(request));
    }
    return withReferralCookie(nextResponse());
  }

  const slug = extractOrgSlug(pathname);
  if (!slug) return withReferralCookie(nextResponse());

  if (slug === "default") {
    const session = await validateSession(request);
    if (!session) return withReferralCookie(nextResponse());

    const firstOrg = await getFirstUserOrganization(
      request,
      session.session.userId,
    );
    if (firstOrg?.slug) {
      return withReferralCookie(buildOrgRedirectUrl(request, firstOrg.slug));
    }
    return withReferralCookie(redirectToOrgList(request));
  }

  if (isReservedSlug(slug)) {
    return withReferralCookie(nextResponse());
  }

  const session = await validateSession(request);
  if (!session) return withReferralCookie(nextResponse());

  const org = await findUserOrganization(request, slug, session.session.userId);

  if (!org) {
    return withReferralCookie(redirectToOrgList(request));
  }

  // If org has no slug (data integrity issue), redirect to org list
  if (!org.slug) {
    return withReferralCookie(redirectToOrgList(request));
  }

  if (slug !== org.slug) {
    return withReferralCookie(buildOrgRedirectUrl(request, org.slug));
  }

  const response = nextResponse();
  response.headers.set("x-org-slug", org.slug);
  return withReferralCookie(response);
}

export const config = {
  matcher: ["/((?!api|assets|favicon.ico|sitemap.xml|robots.txt).*)"],
};
