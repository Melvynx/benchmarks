import {
  adminClient,
  emailOTPClient,
  lastLoginMethodClient,
  magicLinkClient,
  organizationClient,
} from "better-auth/client/plugins";
import { convexClient } from "@convex-dev/better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";
import { getServerUrl } from "./server-url";

export const authClient = createAuthClient({
  baseURL: getServerUrl(),
  plugins: [
    magicLinkClient(),
    organizationClient(),
    adminClient(),
    emailOTPClient(),
    lastLoginMethodClient(),
    convexClient(),
  ],
});

export type AuthClientType = typeof authClient;

export const { useSession, signOut } = authClient;
