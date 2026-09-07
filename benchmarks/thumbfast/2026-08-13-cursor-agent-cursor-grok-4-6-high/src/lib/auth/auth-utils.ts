export const normalizeAuthCallbackUrl = (
  callbackUrl: string | null | undefined,
  fallbackUrl = "/orgs",
): string => {
  if (
    !callbackUrl ||
    callbackUrl === "/" ||
    callbackUrl === "null" ||
    callbackUrl === "undefined"
  ) {
    return fallbackUrl;
  }

  const localCallbackUrl = callbackUrl.startsWith("/")
    ? callbackUrl
    : `/${callbackUrl}`;

  if (localCallbackUrl.startsWith("//")) {
    return fallbackUrl;
  }

  if (localCallbackUrl.startsWith("/auth/")) {
    return fallbackUrl;
  }

  return localCallbackUrl;
};

export const getCallbackUrl = (fallbackUrl: string): string => {
  const searchParams = new URLSearchParams(window.location.search);
  const callbackUrlParams = searchParams.get("callbackUrl");

  return normalizeAuthCallbackUrl(callbackUrlParams, fallbackUrl);
};
