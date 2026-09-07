---
name: org-api-route
description:
  Create or update organization-scoped public `/api/v1/*` routes backed by
  Better Auth API keys in NowStack. Use for API-key route work, org API
  actions/queries, API-key settings UI, public API docs, and future endpoint
  patterns that must resolve an organization from an API key.
---

# Org API Route

Build public API endpoints scoped to the organization that owns the API key.
Keep route files tiny, keep auth and org resolution centralized, and document
each endpoint as its own page.

## Read First

Before editing, read:

- `convex/_generated/ai/guidelines.md`
- `.agents/rules/api-routes.md`
- `.agents/rules/convex-authorization-dto.md`
- `.agents/rules/mdx.md` when touching docs
- Existing references:
  - `src/lib/api/public-api.ts`
  - `convex/apiKeys/functions.ts`
  - `convex/apiKeys/actions.ts`
  - `convex/apiKeys/queries.ts`
  - `src/routes/api/v1/me.ts`
  - `src/routes/api/v1/members.ts`
  - `src/routes/api/v1/members.$memberId.ts`
  - `src/routes/orgs/$orgSlug/(navigation)/settings/api-keys/index.tsx`
  - `content/docs/api-me.mdx`
  - `content/docs/api-members.mdx`
  - `content/docs/api-member.mdx`

## Architecture

- HTTP route files call only `createPublicApiHandler(...)`.
- Public Convex actions use `orgApiAction(...)`.
- Internal Convex reads use `orgApiQuery(...)`.
- `verifyApiKeyForOrg(...)` verifies the key and exposes `organizationId`.
- Do not duplicate API-key extraction, verification, or org lookup in route files.
- Do not call `authClient` from route files or the API-key settings UI.

## Response Shape

- Keep endpoint payloads focused on the resource requested.
- Do not attach `organization` to every response by default.
- Use `GET /api/v1/me` for the organization attached to the API key.
- Use resource endpoints for resource payloads only:
  - `GET /api/v1/members` returns `{ members }`.
  - `GET /api/v1/members/:memberId` returns `{ member }`.
  - `GET /api/v1/me` returns `{ organization }`.
- `createPublicApiHandler` strips `ok` and `status` from successful action
  results before sending JSON.
- Missing or invalid keys return `401`.
- Missing org or resource returns `404`.

## Documentation Rules

- Always create one doc page per public endpoint.
- Use `.agents/skills/add-documentation/scripts/create-doc.sh` for new docs,
  then replace the generated template with endpoint-specific content.
- Title pages by operation, not broad groups:
  - `List Organization Members API`
  - `Get Organization Member API`
  - `Current Organization API`
- Keep examples scoped to that endpoint only. Do not document list and detail
  endpoints on the same page.
- Add every new or changed endpoint doc to `CHANGELOG.md`.

## API-Key Settings UI

- Creation happens in a dialog.
- The newly generated key is revealed in a dialog only; never render a large
  inline one-time-key card under the page header.
- Existing keys render in a table.
- Row actions live in a dropdown menu, not inline icon buttons.
- The docs entry near the `API Keys` title should stay minimal: a simple text
  link labeled `Docs`.

## API Key CRUD Learning

`@better-auth/api-key@1.6.10` can throw `dynamic module import unsupported`
when its create/delete endpoint permission path runs inside a Convex mutation.
For organization API-key settings:

- Keep the outer function as `orgMutation(...)` with the repo's permission gate.
- Create and delete keys through `components.betterAuth.adapter`.
- Generate keys with the configured `nsk_` prefix.
- Store the SHA-256 base64url hash in the Better Auth `apikey` model.
- Return the raw key only once from the create mutation.
- Delete by both `_id` and `referenceId` so keys stay scoped to the active org.

## Workflow

1. Add or update the internal `orgApiQuery`.
2. Add or update the public `orgApiAction`.
3. Add or update the `src/routes/api/v1/*` route with `createPublicApiHandler`.
4. Add or update exactly one docs page per endpoint.
5. Update API-key settings UI only when the discoverability surface changes.
6. Update `CHANGELOG.md`.
7. Run `pnpm ts`, `pnpm lint:ci`, `pnpm test:ci`, and `pnpm build` when route
   behavior or docs are touched.
