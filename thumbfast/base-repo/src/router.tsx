import { createRouter, type ErrorComponentProps } from "@tanstack/react-router";
import { ConvexReactClient } from "convex/react";
import { AlertCircle, House, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getUserFacingErrorMessage } from "@/lib/errors/user-facing-error";
import { getPublicEnv } from "@/lib/public-env";
import { routeTree } from "./routeTree.gen";

function getConvexClient() {
  const convexUrl = getPublicEnv("VITE_CONVEX_URL", "NEXT_PUBLIC_CONVEX_URL");
  if (!convexUrl) return undefined;
  return new ConvexReactClient(convexUrl);
}

function DefaultErrorComponent({ error, reset }: ErrorComponentProps) {
  const message = getUserFacingErrorMessage(error);

  return (
    <main className="bg-background flex min-h-dvh items-center justify-center px-4 py-8">
      <Card className="mx-auto w-full max-w-md lg:p-6">
        <CardHeader className="flex flex-col items-center justify-center gap-3 text-center">
          <div className="bg-destructive/10 text-destructive flex size-10 shrink-0 items-center justify-center rounded-md">
            <AlertCircle className="size-5" />
          </div>
          <div className="space-y-2">
            <CardTitle>Something went wrong</CardTitle>
            <CardDescription className="mx-auto max-w-sm">
              {message}
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2">
          <Button type="button" onClick={reset} className="w-full">
            <RefreshCw className="size-4" />
            Retry
          </Button>
          <Button asChild variant="outline" className="w-full">
            <a href="/">
              <House className="size-4" />
              Home
            </a>
          </Button>
        </CardContent>
      </Card>
    </main>
  );
}

export function getRouter() {
  const router = createRouter({
    routeTree,
    defaultErrorComponent: DefaultErrorComponent,
    scrollRestoration: true,
    unmaskOnReload: true,
    defaultNotFoundComponent: () => (
      <main className="flex h-full flex-col items-center justify-center gap-8">
        <div className="space-y-3 text-center">
          <p className="bg-muted relative rounded px-[0.3rem] py-[0.2rem] font-mono text-sm font-semibold">
            404
          </p>
          <h1 className="font-caption scroll-m-20 text-4xl font-extrabold tracking-tight lg:text-5xl">
            Page not found
          </h1>
          <p className="leading-7">
            Sorry, we couldn't find the page you're looking for.
          </p>
        </div>
        <a
          href="/"
          className="bg-primary text-primary-foreground hover:bg-primary/90 inline-flex h-10 items-center justify-center rounded-md px-4 py-2 text-sm font-medium"
        >
          Go back home
        </a>
      </main>
    ),
    defaultPendingComponent: () => null,
    defaultPendingMinMs: 0,
    context: { convexClient: getConvexClient() },
  });
  return router;
}

declare module "@tanstack/react-router" {
  interface Register {
    router: ReturnType<typeof getRouter>;
  }
}
