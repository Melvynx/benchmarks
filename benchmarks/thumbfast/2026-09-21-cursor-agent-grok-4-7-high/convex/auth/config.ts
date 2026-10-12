/* eslint-disable @typescript-eslint/no-explicit-any */
// Intentional any: this legacy Convex module still uses dynamic component and table APIs that cannot be typed precisely without a larger generated-API migration.
import { createClient, type GenericCtx } from "@convex-dev/better-auth";
import { convex } from "@convex-dev/better-auth/plugins";
import { betterAuth } from "better-auth";
import { type GenericDataModel, componentsGeneric } from "convex/server";
import {
  admin,
  emailOTP,
  lastLoginMethod,
  organization,
} from "better-auth/plugins";
import { Lumail } from "lumail";
import authConfig from "../auth.config";
import betterAuthSchema from "../betterAuth/schema";
import { throwUnauthorized } from "../utils/errors";
import { ac, roles } from "./permissions";
import { up } from "up-fetch";
import {
  defaultMarkdownEmailBadgeImageUrl,
  renderMarkdownEmail,
} from "../email/markdownEmail";

type DataModel = GenericDataModel;

const components = componentsGeneric() as unknown as {
  betterAuth: Parameters<
    typeof createClient<DataModel, typeof betterAuthSchema>
  >[0];
};

const withHttps = (host?: string) => {
  if (!host) return null;
  if (host.startsWith("http://") || host.startsWith("https://")) return host;
  return `https://${host}`;
};

const siteUrl =
  process.env.BETTER_AUTH_URL ??
  process.env.SITE_URL ??
  withHttps(process.env.VERCEL_URL) ??
  "http://localhost:3000";
const authCookiePrefix = process.env.BETTER_AUTH_COOKIE_PREFIX ?? "thumbfast";
const upfetch = up(fetch);
const EMAIL_NAME_MAX_LENGTH = 9;

const shouldLogEmailOtpForVerification = (email: string) => {
  const normalizedEmail = email.trim().toLowerCase();
  return (
    process.env.LOG_AUTH_OTP === "true" ||
    normalizedEmail.startsWith("playwright-test-") ||
    normalizedEmail.includes("+test")
  );
};

const getNameFromEmail = (email: string) => {
  const localPart = email.split("@")[0] ?? "";
  const name = localPart
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "")
    .slice(0, EMAIL_NAME_MAX_LENGTH);

  return name || "user";
};

const normalizeOrigin = (origin: string) => {
  try {
    return new URL(origin).origin;
  } catch {
    return null;
  }
};

const getLocalTrustedOrigins = () => {
  const ports = new Set([
    "3000",
    "3001",
    "3002",
    "3003",
    "3035",
    "3036",
    "3037",
    "5173",
    "5174",
    "9342",
  ]);
  const configuredPort = process.env.PORT;
  if (configuredPort) {
    ports.add(configuredPort);
  }

  return Array.from(ports).flatMap((port) => [
    `http://localhost:${port}`,
    `http://127.0.0.1:${port}`,
    `http://0.0.0.0:${port}`,
  ]);
};

const getVercelTrustedOrigins = () => [
  "https://thumbfa-st-codelynx.vercel.app",
  "https://thumbfa-st-git-main-codelynx.vercel.app",
  "https://thumbfa-st-git-beta-codelynx.vercel.app",
];

const getTrustedOrigins = () => {
  const configuredOrigins =
    process.env.BETTER_AUTH_TRUSTED_ORIGINS ??
    process.env.TRUSTED_ORIGINS ??
    "";
  const origins = [
    siteUrl,
    process.env.BETTER_AUTH_URL,
    process.env.SITE_URL,
    withHttps(process.env.VERCEL_URL),
    withHttps(process.env.VERCEL_BRANCH_URL),
    withHttps(process.env.VERCEL_PROJECT_PRODUCTION_URL),
    "https://thumbfa.st",
    "https://beta.thumbfa.st",
    ...getVercelTrustedOrigins(),
    ...getLocalTrustedOrigins(),
    ...configuredOrigins.split(","),
  ]
    .filter((origin): origin is string => Boolean(origin))
    .map((origin) => normalizeOrigin(origin.trim()))
    .filter((origin): origin is string => Boolean(origin));

  return Array.from(new Set(origins));
};

type SocialProvidersType = Parameters<typeof betterAuth>[0]["socialProviders"];
type SignupLumailUser = {
  id?: unknown;
  email?: unknown;
  name?: unknown;
};
type SignupLumailOrganization = {
  id?: unknown;
  _id?: unknown;
  name?: unknown;
};

const getSocialProviders = (): SocialProvidersType => {
  const providers: SocialProvidersType = {};
  if (process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET) {
    providers.github = {
      clientId: process.env.GITHUB_CLIENT_ID,
      clientSecret: process.env.GITHUB_CLIENT_SECRET,
    };
  }
  if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
    providers.google = {
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    };
  }
  return providers;
};

const createLumailSubscriberForSignup = async (params: {
  user: SignupLumailUser;
  organization?: SignupLumailOrganization;
}) => {
  if (typeof params.user.email !== "string") return;

  const apiKey = process.env.LUMAIL_API_TOKEN;
  if (!apiKey) return;

  const organizationId = params.organization
    ? (params.organization.id ?? params.organization._id)
    : null;
  const fields: Record<string, string> = {};

  if (typeof params.organization?.name === "string") {
    fields.Organization = params.organization.name;
  }
  if (organizationId) {
    fields.OrganizationId = String(organizationId);
  }

  const lumail = new Lumail({ apiKey });
  await lumail.subscribers.create({
    email: params.user.email,
    name: typeof params.user.name === "string" ? params.user.name : null,
    tags: ["onboarding"],
    fields,
    resubscribe: true,
    triggerWorkflows: true,
  });
};

export const authComponent = createClient<DataModel, typeof betterAuthSchema>(
  components.betterAuth,
  {
    local: { schema: betterAuthSchema },
    verbose: false,
  },
);

type AuthCtx = Parameters<typeof authComponent.getAuth>[1];

export const createAuthOptions = (ctx: GenericCtx) =>
  ({
    secret: process.env.BETTER_AUTH_SECRET,
    baseURL: siteUrl,
    trustedOrigins: getTrustedOrigins(),
    database: authComponent.adapter(ctx),
    databaseHooks: {
      user: {
        create: {
          before: async (user: { email?: unknown; name?: unknown }) => {
            if (typeof user.email !== "string") return;

            return {
              data: {
                ...user,
                name: getNameFromEmail(user.email),
              },
            };
          },
          after: async (user: SignupLumailUser) => {
            try {
              await createLumailSubscriberForSignup({ user });
            } catch (error) {
              // eslint-disable-next-line no-console -- Surface production Lumail signup failures in Convex logs.
              console.warn(
                "[lumail-signup] Failed to create subscriber after user create",
                {
                  email:
                    typeof user.email === "string" ? user.email : undefined,
                  message:
                    error instanceof Error ? error.message : "Unknown error",
                },
              );
            }
          },
        },
      },
    },
    session: {
      expiresIn: 60 * 60 * 24 * 20,
      updateAge: 60 * 60 * 24 * 7,
    },
    advanced: {
      cookiePrefix: authCookiePrefix,
    },
    emailAndPassword: {
      enabled: true,
    },
    user: {
      changeEmail: { enabled: true },
      deleteUser: { enabled: true },
    },
    socialProviders: getSocialProviders(),
    plugins: [
      organization({
        ac,
        roles,
        organizationLimit: 1,
        membershipLimit: 10,
        autoCreateOrganizationOnSignUp: true,
        organizationHooks: {
          afterCreateOrganization: async ({ organization, user }) => {
            try {
              await createLumailSubscriberForSignup({ organization, user });
            } catch (error) {
              // eslint-disable-next-line no-console -- Surface production Lumail signup failures in Convex logs.
              console.warn("[lumail-signup] Failed to create subscriber", {
                email: typeof user.email === "string" ? user.email : undefined,
                organizationId: organization.id,
                message:
                  error instanceof Error ? error.message : "Unknown error",
              });
              return;
            }
          },
        },
      }),
      emailOTP({
        sendVerificationOTP: async ({ email, otp, type }) => {
          if (shouldLogEmailOtpForVerification(email)) {
            // eslint-disable-next-line no-console -- Test-only OTP visibility for dev-browser verification.
            console.info("[auth-email-otp]", { email, otp, type });
          }

          const apiKey = process.env.RESEND_API_KEY;
          const from = process.env.EMAIL_FROM;

          if (!apiKey || !from) {
            throw new Error("Email delivery is not configured");
          }

          const subject =
            type === "forget-password"
              ? "Reset your Thumbfa.st password"
              : "Your Thumbfa.st verification code";
          const emailContent = renderMarkdownEmail({
            preview: `Your Thumbfa.st verification code is ${otp}`,
            badgeLabel: "Thumbfa.st",
            badgeImageUrl: defaultMarkdownEmailBadgeImageUrl,
            markdown: `
              # Your Thumbfa.st verification code

              Enter this code to securely continue to your account.

              \`\`\`
              ${otp}
              \`\`\`

              It expires shortly. If you did not request this code, you can safely ignore this email.
            `,
          });

          await upfetch("https://api.resend.com/emails", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${apiKey}`,
            },
            body: {
              from,
              to: email,
              subject,
              text: emailContent.text,
              html: emailContent.html,
            },
          });
        },
      }),
      admin({}),
      lastLoginMethod({}),
      convex({ authConfig }),
    ],
  }) as any;

export async function requireAuth(ctx: AuthCtx) {
  const { auth, headers } = await authComponent.getAuth(createAuth, ctx);
  const session = await auth.api.getSession({ headers });

  if (!session?.user) {
    throwUnauthorized();
  }

  return { auth, headers, session };
}

export async function requireAdmin(ctx: AuthCtx) {
  const { auth, headers } = await authComponent.getAuth(createAuth, ctx);
  const session = await auth.api.getSession({ headers });
  const user = session?.user as { role?: string } | undefined;

  if (user?.role !== "admin") {
    throwUnauthorized();
  }

  return { auth, headers, session };
}

export const createAuth = (ctx: GenericCtx) =>
  betterAuth(createAuthOptions(ctx));
