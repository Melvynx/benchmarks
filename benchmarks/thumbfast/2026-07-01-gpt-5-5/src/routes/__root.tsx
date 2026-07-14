import { cn } from "@/lib/utils";
import { authClient } from "@/lib/auth-client";
import {
  createRouteHeadFromMatches,
  shouldUseRootPageMetadata,
} from "@/lib/metadata";
import { ConvexBetterAuthProvider } from "@convex-dev/better-auth/react";
import { ConvexQueryClient } from "@convex-dev/react-query";
import { SignInDialog } from "@/features/auth/sign-in-dialog";
import { ReferralCapture } from "@/features/referral/referral-capture";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  HeadContent,
  Outlet,
  Scripts,
  createRootRouteWithContext,
  useLocation,
} from "@tanstack/react-router";
import type { ConvexReactClient } from "convex/react";
import { NuqsAdapter } from "nuqs/adapters/tanstack-router";
import { type PropsWithChildren, Suspense, useState } from "react";
import { Providers } from "../-providers";
import appCss from "../globals.css?url";

type RouterContext = {
  convexClient?: ConvexReactClient;
};

type RootSearch = {
  callbackUrl?: string;
  modal?: string;
};

export const Route = createRootRouteWithContext<RouterContext>()({
  validateSearch: (search: Record<string, unknown>): RootSearch => ({
    callbackUrl:
      typeof search.callbackUrl === "string" ? search.callbackUrl : undefined,
    modal: typeof search.modal === "string" ? search.modal : undefined,
  }),
  head: ({ matches }) => {
    const routeHead = shouldUseRootPageMetadata(matches)
      ? createRouteHeadFromMatches(matches)
      : { meta: [], links: [] };

    return {
      meta: [
        { charSet: "utf-8" },
        { name: "viewport", content: "width=device-width, initial-scale=1" },
        ...routeHead.meta,
      ],
      links: [
        { rel: "stylesheet", href: appCss },
        { rel: "icon", href: "/favicon.ico", sizes: "48x48" },
        { rel: "icon", type: "image/png", sizes: "512x512", href: "/icon.png" },
        {
          rel: "icon",
          type: "image/png",
          sizes: "192x192",
          href: "/icons/icon-192x192.png",
        },
        {
          rel: "icon",
          type: "image/png",
          sizes: "512x512",
          href: "/icons/icon-512x512.png",
        },
        { rel: "apple-touch-icon", href: "/apple-touch-icon.png" },
        ...(routeHead.links ?? []),
      ],
    };
  },
  component: RootLayout,
});

function RootLayout() {
  const { convexClient } = Route.useRouteContext();
  const location = useLocation();
  const isStaticLandingRequest = location.pathname === "/";
  const content = (
    <NuqsAdapter>
      <Providers>
        <ReferralCapture />
        <Suspense fallback={null}>
          <Outlet />
        </Suspense>
        <SignInDialog />
      </Providers>
    </NuqsAdapter>
  );
  const bodyContent =
    convexClient && !isStaticLandingRequest ? (
      <ConvexBetterAuthProvider client={convexClient} authClient={authClient}>
        <ConvexTanStackQueryProvider convexClient={convexClient}>
          {content}
        </ConvexTanStackQueryProvider>
      </ConvexBetterAuthProvider>
    ) : (
      content
    );

  return (
    <html lang="en" className="h-full" suppressHydrationWarning>
      <head>
        <HeadContent />
      </head>
      <body
        suppressHydrationWarning
        className={cn("bg-background h-full font-sans antialiased")}
      >
        {bodyContent}
        <Scripts />
      </body>
    </html>
  );
}

function ConvexTanStackQueryProvider({
  children,
  convexClient,
}: PropsWithChildren<{ convexClient: ConvexReactClient }>) {
  const [queryClient] = useState(() => {
    const convexQueryClient = new ConvexQueryClient(convexClient);
    const client = new QueryClient({
      defaultOptions: {
        queries: {
          queryKeyHashFn: convexQueryClient.hashFn(),
          queryFn: convexQueryClient.queryFn(),
        },
      },
    });

    convexQueryClient.connect(client);
    return client;
  });

  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}
