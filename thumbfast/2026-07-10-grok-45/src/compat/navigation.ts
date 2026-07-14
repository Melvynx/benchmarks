import { useLocation, useMatches, useNavigate } from "@tanstack/react-router";
import { useMemo } from "react";

export function useRouter() {
  const navigate = useNavigate();

  return useMemo(
    () => ({
      push: (href: string) => void navigate({ to: href }),
      replace: (href: string) => void navigate({ to: href, replace: true }),
      refresh: () => window.location.reload(),
      back: () => window.history.back(),
      forward: () => window.history.forward(),
      prefetch: async () => undefined,
    }),
    [navigate],
  );
}

export function usePathname() {
  try {
    return useLocation({ select: (location) => location.pathname });
  } catch {
    return typeof window === "undefined" ? "/" : window.location.pathname;
  }
}

export function useSearchParams() {
  let searchStr = "";

  try {
    // eslint-disable-next-line react-hooks/rules-of-hooks -- Compatibility fallback for isolated unit tests without a RouterProvider.
    searchStr = useLocation({ select: (location) => location.searchStr });
  } catch {
    searchStr = typeof window === "undefined" ? "" : window.location.search;
  }

  return useMemo(() => new URLSearchParams(searchStr), [searchStr]);
}

export function useParams() {
  let matches: ReturnType<typeof useMatches>;

  try {
    // eslint-disable-next-line react-hooks/rules-of-hooks -- Compatibility fallback for isolated unit tests without a RouterProvider.
    matches = useMatches();
  } catch {
    return {};
  }

  return matches.reduce<Record<string, string>>((acc, match) => {
    Object.assign(acc, match.params);
    return acc;
  }, {});
}

export function redirect(href: string): never {
  throw new Response(null, {
    status: 307,
    headers: { Location: href },
  });
}

export function notFound(): never {
  throw new Response("Not found", { status: 404 });
}

export function unauthorized(): never {
  throw new Response("Unauthorized", { status: 401 });
}
