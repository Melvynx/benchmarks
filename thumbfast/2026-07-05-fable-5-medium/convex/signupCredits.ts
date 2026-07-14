/* eslint-disable @typescript-eslint/no-explicit-any */
// Intentional any: this helper is called from generic Convex modules that use dynamic table APIs.
import {
  getCreditBalance,
  insertCreditTransaction,
  setCreditBalance,
} from "./credits";
import { INITIAL_FREE_CREDITS } from "./generationConfig";

const encoder = new TextEncoder();

export type SignupCreditGrantDecision = {
  fingerprint: string | null;
  existingGrant: boolean;
};

type Ctx = {
  db: any;
};

type SignupSessionFingerprintInput = {
  ipAddress?: string | null;
  userAgent?: string | null;
};

function normalizeSessionPart(value: string | null | undefined) {
  const normalized = value?.trim().toLowerCase() ?? "";
  return normalized || null;
}

function toHex(buffer: ArrayBuffer) {
  return Array.from(new Uint8Array(buffer), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
}

export async function createSignupFingerprint(
  input: SignupSessionFingerprintInput,
) {
  const ipAddress = normalizeSessionPart(input.ipAddress);
  const userAgent = normalizeSessionPart(input.userAgent);
  if (!ipAddress || !userAgent) return null;

  const digest = await crypto.subtle.digest(
    "SHA-256",
    encoder.encode(`${ipAddress}|${userAgent}`),
  );
  return toHex(digest);
}

export function getSignupCreditGrantAmount(
  decision: SignupCreditGrantDecision,
) {
  if (!decision.fingerprint) return 0;
  if (decision.existingGrant) return 0;
  return INITIAL_FREE_CREDITS;
}

export async function ensureSignupCreditBalance(
  ctx: Ctx,
  args: {
    organizationId: string;
    userId: string;
    fingerprint: string | null;
  },
) {
  const existingBalance = await getCreditBalance(ctx, args.organizationId);
  const existingGrant = args.fingerprint
    ? await ctx.db
        .query("signupCreditGrants")
        .withIndex("by_fingerprint", (q: any) =>
          q.eq("fingerprint", args.fingerprint),
        )
        .first()
    : null;

  if (existingBalance) {
    const existingPositiveBalance = Math.min(
      Math.max(0, Number(existingBalance.balance ?? 0)),
      INITIAL_FREE_CREDITS,
    );
    if (
      args.fingerprint &&
      !existingGrant &&
      existingPositiveBalance > Number.EPSILON
    ) {
      const now = Date.now();
      await ctx.db.insert("signupCreditGrants", {
        fingerprint: args.fingerprint,
        userId: args.userId,
        organizationId: args.organizationId,
        creditsGranted: existingPositiveBalance,
        createdAt: now,
        updatedAt: now,
      });
    }
    return;
  }

  const creditsGranted = getSignupCreditGrantAmount({
    fingerprint: args.fingerprint,
    existingGrant: Boolean(existingGrant),
  });
  const now = Date.now();

  await setCreditBalance(ctx, args.organizationId, creditsGranted, now);

  if (creditsGranted <= 0 || !args.fingerprint) return;

  await ctx.db.insert("signupCreditGrants", {
    fingerprint: args.fingerprint,
    userId: args.userId,
    organizationId: args.organizationId,
    creditsGranted,
    createdAt: now,
    updatedAt: now,
  });
  await insertCreditTransaction(ctx, {
    orgId: args.organizationId,
    amount: creditsGranted,
    type: "initial",
    reason: "Initial free thumbnails",
    now,
  });
}
