import { convexBetterAuthReactStart } from "@convex-dev/better-auth/react-start";
import { getToken as getConvexAuthToken } from "@convex-dev/better-auth/utils";
import { ConvexHttpClient } from "convex/browser";
import type {
  FunctionReference,
  FunctionReturnType,
  OptionalRestArgs,
} from "convex/server";
import { getConvexSiteUrl, getPublicEnv } from "@/lib/public-env";
import { SiteConfig } from "@/site-config";

const convexUrl =
  getPublicEnv("VITE_CONVEX_URL", "NEXT_PUBLIC_CONVEX_URL") ?? "";

const convexSiteUrl = getConvexSiteUrl() ?? "";

export const {
  handler,
  getToken,
  fetchAuthQuery,
  fetchAuthMutation,
  fetchAuthAction,
} = convexBetterAuthReactStart({
  convexUrl,
  convexSiteUrl,
  cookiePrefix: process.env.BETTER_AUTH_COOKIE_PREFIX ?? SiteConfig.appId,
});

async function getAuthenticatedClient(request: Request) {
  const { token } = await getConvexAuthToken(convexSiteUrl, request.headers, {
    cookiePrefix: process.env.BETTER_AUTH_COOKIE_PREFIX ?? SiteConfig.appId,
  });
  const client = new ConvexHttpClient(convexUrl);

  if (token) {
    client.setAuth(token);
  }

  return client;
}

export async function fetchAuthQueryForRequest<
  Query extends FunctionReference<"query">,
>(request: Request, query: Query, ...args: OptionalRestArgs<Query>) {
  const client = await getAuthenticatedClient(request);
  return client.query(query, ...args) as Promise<FunctionReturnType<Query>>;
}

export async function fetchAuthMutationForRequest<
  Mutation extends FunctionReference<"mutation">,
>(request: Request, mutation: Mutation, ...args: OptionalRestArgs<Mutation>) {
  const client = await getAuthenticatedClient(request);
  return client.mutation(mutation, ...args) as Promise<
    FunctionReturnType<Mutation>
  >;
}

export async function fetchAuthActionForRequest<
  Action extends FunctionReference<"action">,
>(request: Request, action: Action, ...args: OptionalRestArgs<Action>) {
  const client = await getAuthenticatedClient(request);
  return client.action(action, ...args) as Promise<FunctionReturnType<Action>>;
}
