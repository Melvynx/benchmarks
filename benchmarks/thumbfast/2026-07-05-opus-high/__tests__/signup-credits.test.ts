import {
  createSignupFingerprint,
  ensureSignupCreditBalance,
  getSignupCreditGrantAmount,
} from "../convex/signupCredits";
import { INITIAL_FREE_CREDITS } from "../convex/generationConfig";
import { describe, expect, it } from "vitest";

describe("signup credit grants", () => {
  function createTestCtx() {
    const tables: Record<string, Record<string, unknown>[]> = {
      creditBalances: [],
      creditTransactions: [],
      signupCreditGrants: [],
    };

    return {
      tables,
      ctx: {
        db: {
          query(table: string) {
            return {
              withIndex: (
                _indexName: string,
                filterBuilder: (q: {
                  eq: (field: string, value: unknown) => {
                    field: string;
                    value: unknown;
                  };
                }) => { field: string; value: unknown },
              ) => {
                const filter = filterBuilder({
                  eq: (field, value) => ({ field, value }),
                });
                const rows = tables[table] ?? [];
                const matchingRows = rows.filter(
                  (row) => row[filter.field] === filter.value,
                );
                return {
                  first: async () => matchingRows[0] ?? null,
                };
              },
            };
          },
          insert: async (table: string, data: Record<string, unknown>) => {
            const rows = tables[table];
            const row = { _id: `${table}:${rows.length}`, ...data };
            rows.push(row);
            return row._id;
          },
          patch: async (id: string, data: Record<string, unknown>) => {
            for (const rows of Object.values(tables)) {
              const row = rows.find((item) => item._id === id);
              if (row) Object.assign(row, data);
            }
          },
        },
      },
    };
  }

  it("grants the initial free credits for the first normalized fingerprint", () => {
    expect(
      getSignupCreditGrantAmount({
        fingerprint: "abcdef1234567890",
        existingGrant: false,
      }),
    ).toBe(INITIAL_FREE_CREDITS);
  });

  it("grants 0 credits when the fingerprint was already granted", () => {
    expect(
      getSignupCreditGrantAmount({
        fingerprint: "abcdef1234567890",
        existingGrant: true,
      }),
    ).toBe(0);
  });

  it("grants 0 credits when no usable fingerprint is available", () => {
    expect(
      getSignupCreditGrantAmount({
        fingerprint: null,
        existingGrant: false,
      }),
    ).toBe(0);
  });

  it("creates a stable server-side fingerprint from session IP and user agent", async () => {
    const first = await createSignupFingerprint({
      ipAddress: " 203.0.113.10 ",
      userAgent: "Mozilla/5.0",
    });
    const second = await createSignupFingerprint({
      ipAddress: "203.0.113.10",
      userAgent: "mozilla/5.0",
    });

    expect(first).toMatch(/^[a-f0-9]{64}$/);
    expect(second).toBe(first);
  });

  it("does not create a fingerprint without both server session signals", async () => {
    await expect(
      createSignupFingerprint({ ipAddress: "203.0.113.10" }),
    ).resolves.toBeNull();
  });

  it("persists only one positive grant for the same fingerprint", async () => {
    const { ctx, tables } = createTestCtx();
    const fingerprint = await createSignupFingerprint({
      ipAddress: "203.0.113.10",
      userAgent: "Mozilla/5.0",
    });

    await ensureSignupCreditBalance(ctx, {
      organizationId: "org_1",
      userId: "user_1",
      fingerprint,
    });
    await ensureSignupCreditBalance(ctx, {
      organizationId: "org_2",
      userId: "user_2",
      fingerprint,
    });

    expect(tables.creditBalances).toMatchObject([
      { organizationId: "org_1", balance: INITIAL_FREE_CREDITS },
      { organizationId: "org_2", balance: 0 },
    ]);
    expect(tables.signupCreditGrants).toHaveLength(1);
    expect(tables.creditTransactions).toMatchObject([
      { organizationId: "org_1", amount: INITIAL_FREE_CREDITS, type: "initial" },
    ]);
  });

  it("creates an explicit zero balance when no fingerprint is available", async () => {
    const { ctx, tables } = createTestCtx();

    await ensureSignupCreditBalance(ctx, {
      organizationId: "org_1",
      userId: "user_1",
      fingerprint: null,
    });

    expect(tables.creditBalances).toMatchObject([
      { organizationId: "org_1", balance: 0 },
    ]);
    expect(tables.signupCreditGrants).toHaveLength(0);
    expect(tables.creditTransactions).toHaveLength(0);
  });

  it("reserves the fingerprint for existing positive balances without adding credits", async () => {
    const { ctx, tables } = createTestCtx();
    const fingerprint = await createSignupFingerprint({
      ipAddress: "203.0.113.10",
      userAgent: "Mozilla/5.0",
    });
    tables.creditBalances.push({
      _id: "creditBalances:0",
      organizationId: "org_existing",
      balance: INITIAL_FREE_CREDITS,
    });

    await ensureSignupCreditBalance(ctx, {
      organizationId: "org_existing",
      userId: "user_existing",
      fingerprint,
    });
    await ensureSignupCreditBalance(ctx, {
      organizationId: "org_new",
      userId: "user_new",
      fingerprint,
    });

    expect(tables.signupCreditGrants).toMatchObject([
      {
        organizationId: "org_existing",
        userId: "user_existing",
        creditsGranted: INITIAL_FREE_CREDITS,
      },
    ]);
    expect(tables.creditBalances).toMatchObject([
      { organizationId: "org_existing", balance: INITIAL_FREE_CREDITS },
      { organizationId: "org_new", balance: 0 },
    ]);
    expect(tables.creditTransactions).toHaveLength(0);
  });
});
