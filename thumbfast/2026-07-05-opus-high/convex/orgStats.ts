/* eslint-disable @typescript-eslint/no-explicit-any */
// Denormalized per-org counters (see `orgStats` table in schema.ts).
//
// Call `adjustOrgStats` from every mutation that inserts prompts,
// generations, or thumbnails, or transitions a thumbnail to "succeeded".
// Readers use `getOrgStats` and fall back to the legacy capped scans when no
// row exists yet (dormant orgs that have not written since this table
// shipped).

const SEED_ROW_LIMIT = 500;

export type OrgStatsDeltas = {
  prompts?: number;
  generations?: number;
  thumbnails?: number;
  succeededThumbnails?: number;
};

export async function getOrgStats(ctx: any, orgId: string) {
  return ctx.db
    .query("orgStats")
    .withIndex("by_organization", (q: any) => q.eq("organizationId", orgId))
    .first();
}

export async function adjustOrgStats(
  ctx: any,
  orgId: string,
  deltas: OrgStatsDeltas,
) {
  const existing = await getOrgStats(ctx, orgId);
  const now = Date.now();

  if (existing) {
    await ctx.db.patch(existing._id, {
      promptCount: Math.max(0, existing.promptCount + (deltas.prompts ?? 0)),
      generationCount: Math.max(
        0,
        existing.generationCount + (deltas.generations ?? 0),
      ),
      thumbnailCount: Math.max(
        0,
        existing.thumbnailCount + (deltas.thumbnails ?? 0),
      ),
      succeededThumbnailCount: Math.max(
        0,
        existing.succeededThumbnailCount + (deltas.succeededThumbnails ?? 0),
      ),
      updatedAt: now,
    });
    return;
  }

  // First counted write for this org: seed from bounded counts. Reads inside
  // a mutation see the transaction's own writes, so the seeded counts already
  // include the rows this mutation just wrote — the deltas are intentionally
  // NOT applied on top. Counts saturate at SEED_ROW_LIMIT, matching the cap
  // the legacy scans displayed; increments are exact from here on.
  const [prompts, generations, thumbnails, succeeded] = await Promise.all([
    ctx.db
      .query("prompts")
      .withIndex("by_organization", (q: any) => q.eq("organizationId", orgId))
      .take(SEED_ROW_LIMIT),
    ctx.db
      .query("generations")
      .withIndex("by_organization", (q: any) => q.eq("organizationId", orgId))
      .take(SEED_ROW_LIMIT),
    ctx.db
      .query("thumbnails")
      .withIndex("by_organization", (q: any) => q.eq("organizationId", orgId))
      .take(SEED_ROW_LIMIT),
    ctx.db
      .query("thumbnails")
      .withIndex("by_organization_status", (q: any) =>
        q.eq("organizationId", orgId).eq("status", "succeeded"),
      )
      .take(SEED_ROW_LIMIT),
  ]);

  await ctx.db.insert("orgStats", {
    organizationId: orgId,
    promptCount: prompts.length,
    generationCount: generations.length,
    thumbnailCount: thumbnails.length,
    succeededThumbnailCount: succeeded.length,
    createdAt: now,
    updatedAt: now,
  });
}
