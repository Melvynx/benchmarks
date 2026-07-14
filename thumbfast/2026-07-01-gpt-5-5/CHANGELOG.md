# Changelog

## 2026-06-27

REFACTOR: Make admin Telegram alerts a single minimalist line - `buildAdminNotificationMessage` (`src/lib/admin-notification-message.ts`) now emits one line prefixed by a per-event emoji (🎉 onboarding, 💰 upgrade, 👋 churn, 🔴 error, 🔔 default) followed by the title and detail values joined with `·`. Drops the "admin alert" header, generic event summary, Context/Event/Environment block, org slug, and timestamp.

## 2026-06-25

FEATURE: Limit persons to a single reference image and add a post-upload AI quality check. The image uploaders in the create-person dialog, the person form, and onboarding now cap at 1 photo (with copy/toasts steering users to create separate persons for multiple faces), and `createPerson`/`updatePerson` (in `convex/app/people.ts` and `convex/onboarding.ts`) reject more than one image. After a photo uploads, a new `checkPersonImageQuality` action (`convex/personQualityNode.ts`, charges 0.1 credit via the shared `geminiFeatureAccess` flow) calls Gemini (`analyzePersonImageQuality` in `src/lib/ai/gemini.ts`) to verify the person faces the camera with the full face visible, is well framed, has even/monotone lighting, and a neutral or slight-smile expression - then shows an "Are the parameters correct?" dialog (`src/features/person/person-quality-dialog.tsx`) with per-criterion feedback and Use/Replace actions.

## 2026-06-12

FEATURE: Rework the admin Feature Flags page into one unified switch list. Declared flags now come from a code registry (`convex/featureFlags.ts`) - `thumbnail-agent` (off) and `watermark` (on) always appear with a label and short description even before a database row exists (merged in `listFeatureFlags`), so admins no longer free-text the exact key to enable the Thumbnail Agent beta. Generation routing ("APIYI first") is now a row in the same list, toggles are switches instead of Enable/Disable buttons, and descriptions are shortened so the table fits.

FEATURE: Add a denormalized `orgStats` counter table (prompt/generation/thumbnail/succeeded-thumbnail counts per org, lazily seeded on first counted write with legacy capped-scan fallback) so the dashboard `orgSummary` and the admin organization list/detail no longer scan up to 1000 docs per org just to display counts - the admin org list previously read up to 50k docs per page, past Convex's 16k-doc query limit. Also bound the `recentGenerationNotifications` poll to recently created generations via an index `_creationTime` range (was 50 docs per poll), scan only legacy `adminReview`-less rows in the community inspiration list (instead of the 500 newest of the whole table, which also silently dropped older legacy rows), and cap the `getBillingSummary` raw-usage fallback at 5000 rows.

FIX: Convex codegen/deploy was broken by an `@/lib/up-fetch` aliased import in `src/features/inspiration/youtube-utils.ts` (compiled under `convex/tsconfig.json` via `inspirationActions.ts`, which cannot resolve the alias); switched it to a relative import.

REFACTOR: Reduce Convex database bandwidth on hot paths. `listPrompts`/`getPrompt`/`listThumbnails`/`orgSummary` now resolve org plan limits once per query instead of once per prompt (was up to 60 subscription lookups per gallery load), `generationsForPrompt` no longer re-fetches the prompt doc and skips person/inspiration reference lookups when generations already carry denormalized URLs, `orgSummary` bounds its analytics thumbnail scan to the 30-day window, `listGenerations` dedupes per-thumbnail generation/prompt fetches with a request-scoped cache, the yearly-credit-refill cron uses a new `by_organization_type_created` index (2 doc reads per org instead of scanning the last 100 transactions - also fixes refills being silently skipped for orgs with 100+ newer transactions), admin user/org search and the inspiration/leads admin lists replace unbounded `collect()` with capped `take()`, and the Lumail backfill pagination reads up to the requested page instead of the whole user table per cursor step.

FEATURE: Add the "Agents generations" beta flow (admin-gated via the `thumbnail-agent` feature flag): the `analyze_youtube_video` agent tool now actually watches YouTube videos via Gemini native video understanding (`src/lib/ai/youtube-video.ts`, URL passed as a file part - replaces the metadata-only `fetch_youtube_transcript` stub) and returns summary, hook, transcript highlights, visual moments, 3 thumbnail concepts, and overlay text ideas; the agent system prompt gains an autonomous video pipeline (a pasted YouTube URL auto-runs analyze -> research -> generate 3 thumbnails -> create_video without questions, step budget raised 8 -> 16); the agent index page detects YouTube URLs and shows a video preview card with an Auto-generate CTA; the chat UI is rebuilt on AI Elements (Conversation, PromptInput, Tool, Shimmer in `src/components/ai-elements/`) with a new video analysis card.

FIX: Agent chat thumbnail grid no longer shows queued generations as red "Failed" cards - it subscribes to the prompt via Convex (`usePrompt`) and upgrades each card live from a "Generating..." state to the final image (or a real failure state).

FIX: Agent chat routes under `/orgs/{slug}/agent/{chatId}` never mounted because the agent layout route did not render `<Outlet />` for child matches; the landing UI now yields to child routes via `useChildMatches()`.

FIX: Agent chat endpoint passed the org name string to `buildAgentSystemPrompt` which expects a full context object (crashing the prompt builder at runtime); it now fetches real workspace context from the new `app:agentPromptContext` Convex query (person count, recent prompt count, top inspiration categories, uploaded image names).

## 2026-06-10

FEATURE: Redesign the admin referrals page (`/admin/referrals`) with a referral settings dialog (`updateReferralSettings` admin mutation editing credits per referral, caps, expiries, and anti-abuse thresholds), a searchable referrer table showing each user's referrals and credits earned, and a recent referral activity table with referred users and statuses, all backed by a new `getReferralDashboard` admin query.

REFACTOR: Optimize landing page load performance. Recompress `public/landing` images in place (25MB to 5.3MB, marquee thumbnails resized to 640px / larger visuals to 1000px), convert heavy PNGs (`person-face`, `person-melvyn`, `about-me`) to WebP, default the `@/compat/image` shim to `loading="lazy"` + `decoding="async"` with a working `priority` prop (drops the 80 eager `<link rel="preload" as="image">` tags from the homepage head to 1), and add nitro routeRules serving `/landing/**` and `/icons/**` as immutable (1 year) and `/images/**` with a 7-day stale-while-revalidate cache.

## 2026-06-05

CHORE: Make AGENTS.md the canonical agent instructions file and turn CLAUDE.md into a symlink pointing to it (previously the reverse).

## 2026-05-30

FIX: Stop generation thumbnails rendering blank for churned/downgraded orgs. `getDisplayThumbnailUrl` now falls back to the clean image url when a viewer cannot see clean images but no `watermarkedUrl` exists (thumbnails generated on a paid plan have no watermark). Watermark precedence is unchanged for thumbnails that have one, so free users still see watermarked images for newly generated content.

## 2026-05-28

FEATURE: Make the inspiration detail title (`/orgs/:slug/inspirations/:id`) editable inline via `TitleUpdateForm`, matching the thumbnail and video pages. Wire it to the existing `inspiration:updateName` mutation.

FEATURE: Notify users when a thumbnail generation finishes while they are away from it. Show a Sonner toast with the generated image and a "View" call to action when the generation completes on a different page, and email the user (with the generated image and a link) when no in-app client acknowledges the completion. Add `createdByUserId`/`notifiedAt` to generations, a `recentGenerationNotifications` query, a `markGenerationNotified` mutation, and a scheduled `notifications.notifyGenerationCompleted` email action. Extract a shared `sendMarkdownEmail` helper and add optional `heroImageUrl` support to the markdown email renderer.

## 2026-05-26

FIX: Rebuild `/admin` dashboard metrics so totals are no longer capped at 500. Convex counts now page through indexed queries for users, organizations, sessions, generations, thumbnails, credits, errors, feedback, and paid-plan summaries. Add live Stripe billing summary cards for MRR, ARR, active subscriptions, trials, past-due subscriptions, plan mix, and Stripe-to-Convex sync gaps.

## 2026-05-25

CONTENT: Add public "BETA: New Application Deploy" changelog entry with a local minimalist changelog image. Align the Pro plan runtime limit and public pricing copy to 150 thumbnails/month at the same $19/month price.

CHORE: Remove `/admin/thumbnails` route (duplicate of `/admin/inspirations` workflow). Delete `src/routes/admin/thumbnails/index.tsx`, `src/routes/admin/thumbnails/$thumbnailId.tsx`, the `listThumbnails` and `getThumbnailById` Convex admin queries, and the `setThumbnailStarred` / `setThumbnailPublicHidden` admin mutations. Drop "Templates" navigation entry and `/admin/thumbnails*` metadata entries.

REFACTOR: Refactor `/admin/generations/logs` UI with `Item` composition replacing the dense `AdminTable`. Each routing event now renders as a card row with a colored status icon medium (success/failure/pending), badges for api/provider/fallback/attempt, model name + raw apiModelId, optional routing-decision indicator (requested -> default -> actual model when they differ), duration with semantic color hints, linked generation and organization, and inline expanded error block (no longer truncated to one cell). Replace raw `<button>` API filter chips with shadcn `<Button variant="secondary"\|"ghost">` for visual consistency with `/admin/generations`. Remove duplicate local `formatDuration` and use the shared `formatDurationMs` from `@/lib/format/duration`. Add proper empty-state and skeleton components.

REFACTOR: Refactor `/admin/errors` page with `Item` composition, stat cards (Total / Last 24h / Affected orgs), proper destructive theming for the message, clickable links to organization (`/admin/organizations/$orgId`) and generation (`/admin/generations?search=...`), relative timestamp with full-date tooltip, and a new "View stack" button that opens a `StackTraceDialog` rendering the previously-dropped `stack` field. Add custom empty state and skeleton components.

REFACTOR: Refactor `/admin/generations` UI with `Item` composition primitive for cleaner row layout. Thumbnails now respect their actual aspect ratio (16:9 / 9:16 / 1:1) instead of forced square crops via `getAspectRatioClass(generation.aspectRatio)`. Clicking any thumbnail opens a new `AdminGenerationDetailDialog` showing the full image (object-contain) alongside metadata and a complete generation flow timeline of routing events (model attempts, provider, api, status, duration, fallback indicator, errors).

## 2026-05-23

FEATURE: Add `/admin/thumbnails` gallery, a thumbnail-first review surface separate from the job-centric generations page. Renders a responsive 1/2/3/4-column grid of aspect-ratio-aware tiles (16:9 default, 9:16 and 1:1 supported) with prompt, friendly model label (Nano Banana Pro / Nano Banana 2 / GPT Image 2), duration, relative time, and a subtle fallback hint. Failed thumbnails get a red ring + Failed pill and inline error; in-flight ones get an amber ring + Generating placeholder; starred ones show an amber star chip. Stats are inlined into the page header (no card grid) to keep visual weight on the images. Includes search, status filter, starred-only filter, skeleton loading, and a filter-aware empty state. Adds matching "Thumbnails" sidebar link and a `listThumbnails` admin Convex query that joins each thumbnail with its generation prompt.

FEATURE: Redesign `/admin/generations` with a card-based modern layout that surfaces the actual generated thumbnails (up to 4 per job), prompt, status, requested model, fallback badge, routing summary, duration, credit cost, and a relative-time stamp. Replaces the dense dual-table layout. Stat cards now focus on generation-level totals (succeeded, failed, in-flight). Adds a status segmented filter and a primary "API logs" button in the header.

FEATURE: Move per-API routing events to their own page at `/admin/generations/logs`. New route renders the routing dashboard stats (attempts, fallbacks, failed attempts), API-breakdown chips that filter the table on click, plus search and status/fallback dropdown filters. Each row shows API/provider, model, status badge with fallback indicator, attempt number, color-coded duration, relative time, error, and a link back to the source generation. Adds matching sidebar link "Generation Logs".

REFACTOR: Add `listGenerationRoutingLogs` Convex query supporting search, status, api, and fallback filters. Extend `listGenerations` to also return thumbnail previews (up to 4), aspect ratio, charged credit cost, fallback-used flag, and average per-thumbnail duration so the new card layout can render without extra round-trips.

## 2026-05-17

CHORE: Remove unused migration-era files and dependencies after the TanStack/Convex cleanup. Reconfigure Knip to track the active route tree, server routes, Convex functions, scripts, tests, and aliases so future file/dependency cleanup is checked against the current implementation.

## 2026-05-04

FIX: Make changelog dismissal instant. Replace `useOptimistic` + `useTransition` + `router.refresh()` with a local `useState<Set<string>>` of dismissed slugs and fire-and-forget server actions. Removes the per-click round-trip that disabled all dismiss buttons until the RSC re-fetch completed - users can now dismiss many changelogs in rapid succession with no waiting. Server-side Redis state is still persisted, so dismissals stick across reloads.

## 2026-05-03

FEATURE: Add date range picker to admin funnel page. Self-contained `FunnelRangeSelector` (popover with presets: Today / Yesterday / Last 7 days / Last 30 days / Month to date / Last month, plus a range-mode calendar) drives `from`/`to` URL params via nuqs `parseAsIsoDate`. Server scopes the funnel cohort by `user.createdAt` window (default last 30 days). All four metrics, the conversion funnel chart, and the user table reflect the selected cohort. Adds shadcn `Calendar` (`react-day-picker` v9) ported from Lumail.

## 2026-05-01

FEATURE: Confirm dialog when Generate is clicked within 10 seconds of the previous trigger. Tracks the last generate timestamp in a ref; rapid re-clicks (or Cmd+Enter) on either the create or edit Generate button now open `dialogManager.confirm("You just generated", "Do you want to generate more?")` with Continue / Cancel - prevents accidental double-generations while leaving the first click and post-cooldown clicks instant.

REFACTOR: Remove the percentage readout from the generation loader placeholder. The elapsed-time line and progress bar remain; the synthetic `%` text was visually noisy alongside them.

## 2026-04-30

FIX: Edits started from a free-tier thumbnail no longer bake the watermark into the new image. The Edit click now sends a `baseThumbnailId` alongside the (watermarked) preview URL; the server resolves the clean unwatermarked `Thumbnail.imageUrl` from the database and feeds that to the AI, while the UI keeps showing the watermarked preview so the paywall stays intact. Adds `Generation.baseThumbnailId` and threads it through `createPendingGenerationAction`, the legacy `generateThumbnailAction`, and the QStash worker. The "Reuse" affordance also restores `editingThumbnailId` from the prior generation so re-runs preserve the clean source link, and the worker logs a warning if a stored `baseThumbnailId` no longer resolves at processing time.

FEATURE: Show real elapsed time on the generation loader. The processing placeholder now renders the actual seconds elapsed since the worker claimed the job (e.g. `12s`, `1m 4s`) as the primary readout, with the synthetic 0-90% progress bar kept underneath as a secondary visual cue. The pending placeholder gains a `Queued · 4s` line driven by `Thumbnail.createdAt` so users can see how long a slot has been waiting in the queue.

## 2026-04-29

REFACTOR: Migrate thumbnail generation from synchronous client-driven HTTP loop to QStash background jobs. Click "Generate" now returns in <1s; a Vercel worker function (`/api/qstash/generate-thumbnail`, `maxDuration=300`) runs the AI call asynchronously. Each thumbnail row is pre-created with `status` (pending/processing/completed/failed) and a unique `idempotencyKey`; the worker atomically claims the row before invoking Gemini/GPT, so QStash retries (or accidental double-publishes) cannot run the AI twice. Frontend polls every 2s while pending, then stops. Tab closure no longer orphans generations. Old `/api/orgs/[orgId]/generations/[generationId]/generate` route and client-side `useGenerationLoop` hook are removed.

CHORE: Add `pnpm dev:services` script (concurrently runs the local QStash CLI on :8081 and the Stripe webhook listener) following Lumail's pattern. `src/lib/qstash.ts` now uses `Client({ baseUrl: QSTASH_URL })` and the worker route uses `verifySignatureAppRouter` from `@upstash/qstash/nextjs` so signing keys are read from env automatically. Local dev no longer needs an ngrok tunnel - the QStash CLI ships pre-shared dev token + signing keys, included in `.env-template`.

FIX: Watermark text rendered as empty rectangles ("000000…") on Vercel because librsvg fell back to missing-glyph boxes when `Arial/Helvetica/sans-serif` was unavailable in the serverless runtime. Embed `Geist-Bold.otf` as a base64 `@font-face` inside the SVG so the watermark renders "thumbfa.st" reliably regardless of installed system fonts.

## 2026-04-28

REFACTOR: Reorder onboarding flow so "About You" lead questions come AFTER Add Person + Pick Style instead of being the first gate. New order: Add Person → Pick Style → About You → Prompt. Skips the questions step on Pick Style → Prompt for users who already answered. Reduces drop-off by getting users invested before asking qualification questions.

REFACTOR: Rebuild `/admin/users` on the same DataTable pattern as `/admin/organizations` - shared search/filter popover/column-visibility toolbar, sortable Joined column, Role + Status filter dropdowns, Status badge (Active/Banned/Unverified), and avatar-style user cell. Drops dead `user-row.tsx`, `user-table.tsx`, `admin-filters.tsx`, and unused `search-params.ts`.

FIX: Drop "Lumail will be notified for: …" line from the admin refund dialog - internal plumbing leaked into admin UI. Show "Account: <email>" instead.

FEATURE: Add visual conversion funnel chart to `/admin/funnel`. Horizontal bars per stage (Signups → Generated → Used 5+ Credits → Converted) with widths proportional to counts, stage-to-stage conversion % (color-coded green/amber/red), drop-off count, and % of total signups.

FIX: Onboarding lead questions step could silently get stuck on "How many videos do you publish per month?" because `form.handleSubmit()` swallowed schema errors with no UI feedback. Submit paths (videosPerMonth Continue + curious auto-submit) now read field values directly and call `mutation.mutate()`, surfacing real server errors as toasts. Also trim+write back the YouTube URL in step 2 so non-canonical whitespace doesn't sneak past local validation and break the schema later.

FEATURE: Add admin one-click refund button on `/admin/organizations/[orgId]`. Computes a prorated Stripe refund using the published terms formula (`paid - credits_used × $0.20`, free credits count as used), shows a preview dialog with breakdown, optionally cancels the active subscription, writes a `CreditTransaction` audit row, and notifies Lumail. Idempotent on the latest refundable charge.

FEATURE: Restrict credit pack purchases to paid plans (Pro/Ultra). `purchaseCreditsAction` now rejects free-plan orgs via `requirePaidPlan`, and `BuyCreditsCard` is hidden for free users on `/settings/billing` - they see the Pro upsell card instead. Pro/Ultra still buy lifetime credits as before; Poweruser remains blocked (BYOK).

## 2026-04-26

FEATURE: Store both clean and watermarked thumbnail versions in S3 - free users see/download watermarked, paid users see/download clean. New `Thumbnail.watermarkedImageUrl` field; clean image is canonical and used for forks/edits. When a free user upgrades, every existing thumbnail instantly switches to clean (no regeneration needed).
FEATURE: Add "Remove watermark" CTA card in the editor (on /thumbnails/new and /thumbnails/[id]) for free-plan users, opens the org-plan upgrade dialog
FEATURE: Add hero image to "Watermark on free plan" changelog entry, generated via Gemini 3 Pro Image
REFACTOR: Generation pipeline now uploads BOTH a clean and a watermarked copy to R2 in parallel when a watermark would apply, instead of baking the watermark into the only saved file
REFACTOR: Rebuild /admin/feature-flags as a proper DataTable (TanStack Table) matching /admin/organizations style. Layout back to `size="lg"`, columns: Flag (label + key chip), Description, Default badge, Last changed (dayjs), Status (Switch). Includes DataTableViewOptions toggle for column visibility. Drops the prior Card-per-flag form. Optimistic switch toggle with onError rollback and per-row pending state via TanStack Table `meta`.
FEATURE: Add internal feature flag system with admin UI at /admin/feature-flags. New `FeatureFlag` Prisma model (key/enabled/description/updatedAt/updatedByUserId), `FEATURE_FLAGS` registry in `src/features/feature-flags/feature-flags.constants.ts`, service with Redis cache (60s TTL, invalidated on write), `setFeatureFlagAction` admin server action, and a Switch-based admin page. First flag: `watermark` (default ON) - acts as a global kill switch for the free-tier watermark.
REFACTOR: Watermark gate in generate route now uses `getFeatureFlag("watermark") && !ctx.organization.limits.noWatermark` (flag = kill switch, plan limit = paid-plan benefit) instead of the inline `!isPaidPlan(plan)` check
FEATURE: Add public changelog entry announcing the free-tier watermark and the "No watermark on exports" benefit for all paid plans (Pro, Ultra, Poweruser)
FEATURE: Add `noWatermark: boolean` to plan limits so the watermark-removal benefit is encoded in the structured plan limits (false for free, true for pro/ultra/poweruser/trial). Surfaces in the existing `getPlanFeatures()` pricing display via a new `LIMITS_CONFIG.noWatermark` entry with the Droplet icon.
REFACTOR: Tighten watermark spacing - reduce gap between logo and text (LOGO_TEXT_GAP_RATIO 0.35 → 0.1, TEXT_PAD_X_RATIO 0.5 → 0.2) so the wordmark sits closer to the icon
FEATURE: Add Credit Policy card on /settings/billing/usage explaining how credits work — monthly allowance ({plan} credits/month), subscription credits left this period (X / Y), bonus/purchased credits balance, next reset date, and notice that subscription credits expire at renewal while purchased/bonus/referral credits never expire
FEATURE: Extend CreditBalance tooltip to mention that subscription credits reset each month (unused ones expire) while purchased & bonus credits never expire
FEATURE: Add admin "Reconcile Credits" button on org page (/admin/organizations/[orgId]) that previews the legitimate balance (active subscription credits + INITIAL_FREE_CREDITS + sum of non-sub positive transactions - non-sub usage) and expires any ghost credits accumulated under the pre-2026-03-05 subscription system that stacked credits without expiration. Shows a breakdown dialog with current balance, sub active, legit non-sub, target balance, and the adjustment amount before applying. Adjustment is recorded as an `admin_adjustment` transaction with full metadata (admin id/email, before/after, breakdown) for audit trail; preserves `subscriptionCreditsRemaining` untouched.
CHORE: Set `YOUTUBE_API_KEY` in `.env` to enable YouTube Data API v3 channel enrichment during onboarding; fix `.env-template` to use the correct variable name (was `YOUTUBE_DATA_API_KEY`)

## 2026-04-25

FEATURE: Add admin Leads dashboard (/admin/leads) with hot/cold lead segmentation, stats cards (hot, cold, youtuber, agency, from-Melvynx counts), and searchable paginated table showing org, user type, YouTube channel, subs, videos/month, source
FEATURE: Integrate YouTube Data API v3 to enrich organizations when a YouTuber provides their channel link during onboarding — auto-fills org name + logo, stores channel ID/title/description/subscriber/video/view counts (`YOUTUBE_API_KEY` env var, optional)
FEATURE: Add sequential one-question-at-a-time onboarding lead qualification step with "Where did you hear about us?" (From Melvynx / Twitter / YouTube / Google / Friend / Other), user type (YouTuber / Agency / Curious), and conditional YouTube channel link + videos-per-month follow-ups based on user type
FEATURE: Add admin funnel page (/admin/funnel) with signup → 1 thumbnail → 4+ credits → conversion stats and a paginated per-user table showing each user's funnel state
FEATURE: Watermark free-tier generations with the thumbfa.st logo and wordmark in the bottom-left corner — applied via sharp composite between crop and S3 upload, gated by `isPaidPlan`, falls through to the original buffer on any failure so generation never 500s on watermarking
FIX: IP-based signup fraud check and rate limiter were silently bypassed. Two reasons: (1) `organizationCreation.afterCreate` is fired from a programmatic `auth.api.createOrganization` call where Better Auth does NOT propagate `ctx.request`, so `request` was always undefined; (2) the session row is created AFTER `databaseHooks.user.create` returns, so the session-table fallback also returned null. Moved IP extraction + `checkSignupFraud` + `signupCreditsRateLimit` + `getOrCreateCreditBalance` into `user.create.after`, where `req` is the real GenericEndpointContext with headers. Added `extractIpFromRequest` helper supporting `cf-connecting-ip` / `x-real-ip` / `x-forwarded-for` / `x-vercel-forwarded-for` / `fastly-client-ip` / `true-client-ip`. Covers OTP, password, and OAuth signup paths.

## 2026-04-22

FIX: Pass organizationId explicitly to inviteMember so invitations work with header-based org routing (no longer relies on removed active-org session state)

## 2026-04-21

FEATURE: Center-crop generated thumbnails to the exact target aspect ratio (1536x1024 → 1536x864 for 16:9, 1024x1536 → 864x1536 for 9:16) in-memory via sharp before S3 upload — no-op when the source already matches
FIX: Tell GPT Image 2 about its true canvas size and the aspect-ratio safe zone so 16:9 YouTube thumbnails keep key content inside the 1536x864 center crop
REFACTOR: Use isOpenAiImageModel provider helper in credit-validation, can-generate, generate route, and generation tools instead of hardcoded "gpt-image-2" string checks
REFACTOR: Parameterize generateWithGPT with apiModelId so the function works for any OpenAI image model without hardcoding
REFACTOR: Drop duplicate ImageModel type alias in credit-validation.ts in favor of the canonical type from image-models.ts
FEATURE: Add GPT Image 2 model support in the editor and generation pipeline
FEATURE: Map legacy gpt-image and gpt-image-1.5 IDs to GPT Image 2 for zero-downtime rollout
FEATURE: Add official GPT Image 2 pricing details in the picker and changelog
FEATURE: Add public changelog entry for the GPT Image 2 launch
REFACTOR: Switch OpenAI image generation calls to the official gpt-image-2 API model ID
UPDATE: Keep GPT Image 2 at 1.5 internal credits while referencing official OpenAI token pricing

## 2026-03-26

CHORE: Remove outreach pipeline (youtube-discovery, outreach service, cron, Prisma model)
REFACTOR: Add outline variant to aspect ratio and thumbnail count toggle groups
REFACTOR: Use short labels in model selector trigger, full labels in dropdown
FIX: Fix OpenAI logo invisible in dark mode with dark:invert
FIX: Show error message when image upload exceeds 2MB instead of infinite loading
FIX: Standardize all image upload size limits to 2MB to match server action body size limit
FIX: Disable bold, italic, and strike formatting in prompt editor - only mentions allowed
REFACTOR: Use shared validateImageFile for server-side upload validation

## 2026-03-25

FEATURE: Add OAuth refresh token fallback for YouTube discovery when API key is not set
FEATURE: Add inline thumbnail generation in generate_thumbnail tool handler
FEATURE: Add daily YouTube outreach automation pipeline (cron + manual trigger)
FEATURE: Add OutreachCandidate Prisma model for tracking pipeline runs
FEATURE: Add YouTube Data API v3 discovery service for finding creators (5k-100k subs)
FEATURE: Add outreach email copy generation via Gemini
FEATURE: Add manual trigger endpoint at /api/cron/youtube-outreach/trigger

## 2026-03-02

FIX: Replace hardcoded codeline.app URLs with SiteConfig.prodUrl in sitemap, blog post, and category metadata
FIX: Reduce free tier monthly credits from 5 to 3
FEATURE: Add TRIAL_LIMITS config for trial subscription limits
REFACTOR: Increase initial free credits from 5 to 10 for new signups
FIX: Fix image upload preview showing letterboxed space by using object-cover instead of object-contain
FIX: Update org-navigation-links tests for new 3-group navigation structure

## 2026-03-01

FEATURE: Agent generate*thumbnail supports promptId to group multiple generations under same prompt
FIX: Edit thumbnail now adds generation to existing prompt instead of creating new prompt
REFACTOR: Separate Get/Show tools in agent chat - all tools (get, search, generate, edit) are internal, show*\* tools display visual content
FEATURE: Add PostHog analytics with EU proxy, event tracking across 17 events, and product dashboard
FEATURE: Add beta badge to Agent sidebar link

## 2026-02-28

FIX: Fix IDOR - scope agent chat lookup and update by orgId to prevent cross-org access
FIX: Fix IDOR - add orgId filter to userImage query in executeGeneration
FIX: Add Zod validation on agent chat API request body
FIX: Add error handling in onFinish callback to prevent silent message loss
FIX: Fix N+1 query in get_persons tool - single query instead of per-person count
FIX: Replace raw fetch with upfetch + 10s timeout for transcript API
FIX: Add error state display when agent chat streaming fails
FIX: Add loading fallback for agent chat page Suspense boundary
FIX: Add ARIA labels to all agent chat interactive elements (buttons, textareas)
FIX: Add keyboard accessibility to recent chats dropdown (Escape to close, aria-expanded)
FIX: Make suggestion chips grid responsive (single column on mobile)

## 2026-02-27

REFACTOR: Extract shared executeGeneration() helper - eliminate 150+ lines of duplication between generate_thumbnail and edit_thumbnail tools
CHORE: Delete dead agent.schema.ts and transcript/route.ts (logic moved to agent tools)
FIX: Reduce agent chat credit cost from 1 to 0.2 per conversation
REFACTOR: Move recent conversations to dropdown button (top-right) instead of bottom section causing scroll
REFACTOR: Transform agent into multimodal chat with suggestions, thumbnail editing, YouTube transcript as tool, recent thumbnails browsing, and message persistence on page reload
FEATURE: Add edit_thumbnail tool - agent can modify existing thumbnails using edit-from pipeline
FEATURE: Add fetch_youtube_transcript tool - agent extracts transcript from YouTube URLs during conversation
FEATURE: Add get_recent_thumbnails tool - agent can browse user's past generated thumbnails
FIX: Fix page reload losing chat messages - load initial messages from DB via server component
REFACTOR: Replace transcript-first landing page with suggestion chips (YouTube URL, browse inspirations, create from scratch, show recent)
FEATURE: Add Agent Mode - chat-based thumbnail generator that analyzes video transcripts, finds inspirations/persons, and generates 3 different thumbnails automatically using AI SDK with Gemini 3.1 Pro and tool calling
FIX: Improve agent system prompt to produce realistic YouTube-style thumbnails instead of AI-looking ones - enforce short prompts, always use inspirations
FEATURE: Add create_video tool - agent automatically creates a video entry with thumbnails and title after generation
FEATURE: Show thinking blocks, tool call details (args, results), and generated thumbnails inline in agent chat
FIX: Improve YouTube transcript extraction with proper User-Agent headers and innertube API fallback
REFACTOR: Restructure agent pages - /agent is landing with big input, /agent/[chatId] is conversation with URL persistence
REFACTOR: Replace YouTube scraping with TranscriptAPI service for reliable transcript extraction
FIX: Hide transcript content in chat messages, show "Transcript attached" instead
FIX: Agent uses plain text instead of markdown in responses
FIX: Fix agent tool calls and thinking blocks not rendering - handle both static (tool-xxx) and dynamic-tool part types, extract toolName from type for static parts
FIX: Fix inspiration search Prisma query - two OR clauses overwriting each other when filtering by query and org
FEATURE: Add get_prompt_examples tool - agent learns from org's successful past prompts before generating
FIX: Switch Gemini 3.1 Pro thinking config from thinkingBudget to thinkingLevel: "high" with includeThoughts
REFACTOR: Rewrite agent system prompt - force deep deliberate work (4+ inspiration searches, handpicked selections with reasoning, simplicity philosophy)
FEATURE: Add previous conversations list on agent landing page
FEATURE: Add clickable links in agent tool results - thumbnails link to prompt page, videos link to video page
REFACTOR: Redesign agent chat UI - ChatGPT-style input with ring focus, auto-grow textarea, stop button, scroll-to-bottom FAB, fade gradient, grouped collapsible tool calls, thumbnail hover overlay, typing dots indicator, matching landing page

## 2026-02-26

FIX: Use per-model credit cost in client-side balance check and legacy generation actions instead of flat 1-credit charge
FEATURE: Add per-model credit pricing - Nano Banana 2 costs 0.80 credits instead of 1, defined in IMAGE_MODELS constant
REFACTOR: Reorganize sidebar menu into "Thumbnails" (Dashboard, Thumbnails, Generations) and "Resources" (Persons, Inspirations, Images, Videos) groups for cleaner navigation
FIX: Clamp long prompt text in generation gallery to prevent overflow
REFACTOR: Rename image model IDs to descriptive names (gemini -> gemini-3-pro, gemini-flash -> gemini-3.1-flash, gpt-image -> gpt-image-1.5) with legacy ID resolution for zero-downtime migration
FEATURE: Persist selected image generation model in localStorage across sessions
FIX: Handle Gemini content policy blocks in anonymization with clean user-facing error messages
REFACTOR: Redesign inspiration detail page with hero image, badge row, and anonymization status display
FEATURE: Add search bar to inspirations page with debounced filtering
REFACTOR: Move bulk import access into Add Inspiration dialog, simplify header to title + actions row
REFACTOR: Change API keys flow — "Test" becomes "Test and add" that validates then saves in one click, remove separate Save button
FIX: Add revalidatePath to API keys save/clear actions so UI refreshes automatically after submit
REFACTOR: Simplify dashboard header — remove description, replace AI icon with plain "Create thumbnail" button, add "Create inspiration" secondary button with dialog
FEATURE: Add Nano Banana 2 (gemini-3.1-flash-image-preview) as third image generation model
FEATURE: Update Nano Banana 2 blog post with real side-by-side comparisons, example images, and detailed model research
FEATURE: Add changelog entry for Nano Banana 2 model launch
REFACTOR: Switch inspiration anonymization from Nano Banana Pro to Nano Banana 2 (faster, cheaper)
FIX: Auto-close inspiration dialog on non-anonymize create, rename "Close" to "Create" after anonymization

## 2026-02-22

REFACTOR: Update blog post detail page design to match NOW.TS UI — clean article layout with standalone cover image, badge row (date/reading time), and proper prose rendering
FIX: Store mini card preview snapshot in history instead of raw thumbnail — shows actual card with theme/colors
FEATURE: Add blog post about thumbnail anonymization to bypass Gemini AI restrictions
FEATURE: Strip numeric prefix (001-) from post filenames when generating URL slugs
FEATURE: Add blog post explaining how to get YouTube video thumbnails via ytimg CDN
FEATURE: Add blog post for free YouTube video card generator tool
FIX: Merge all color pickers into a single collapsible "Colors" section under Style
FEATURE: Persist all video card settings (theme + video data) to localStorage so they restore on revisit
FIX: Loading a new YouTube URL only updates title/channel/avatar/thumbnail — never overwrites theme or display toggles
FIX: Match broll repo card style with outer padding/border, proper scale system, and inner thumbnail border-radius
FIX: Add channel avatar image support with auto-fetch from YouTube page and manual URL input
FIX: Switch to fully client-side PNG export using html-to-image (remove server render API route)
FIX: Replace Light/Dark buttons with compact Sun/Moon toggle switch
FIX: Merge Display toggles with inline editable inputs (duration, views, published date show input when enabled)
FIX: Add images.unsplash.com to Next.js image remotePatterns to fix blog crash
FIX: Replace all 404 Unsplash photo IDs with curl-verified working ones across blog posts
FIX: Delete posts loading.tsx so static blog page never shows a loader
FIX: Disable no-html-link-for-pages ESLint rule (false positive with App Router + content/posts path)
FIX: Remove shadow from PostCard, update blog title to "Thumbfa.st Blog", remove grid background
REFACTOR: Redesign blog page with hero section, remove tag cloud
REFACTOR: Redesign PostCard with polished image card, hover zoom, and clean typography

## 2026-02-22

FEATURE: Add free YouTube Video Card Generator tool at /tools/youtube-video-card with full theme customization, PNG export, copy to clipboard, and localStorage history
FEATURE: Add blog post for YouTube Video Card Generator tool
FEATURE: Add YouTube Video Card Generator to footer tools navigation
FEATURE: Add /tools index page listing all free tools with cards and SEO
FEATURE: Add "Tools" link to header navigation
FEATURE: Add "All Tools" link to footer tools section
FEATURE: Add blog post showcasing the free YouTube tools collection

## 2026-02-21

FIX: Force light mode on entire tool page (header+footer), fix card spacing by dropping Card wrapper for tight thumbnail layout
REFACTOR: Redesign YouTube thumbnail tool with hero section, centered input, light-mode, and premium card layout
FEATURE: Add free YouTube thumbnail extractor tool at /tools/youtube-thumbnail
FEATURE: Add Tools section to footer with YouTube Thumbnail Downloader link
FEATURE: Add blog post showcasing the YouTube thumbnail extractor tool
FEATURE: Add /settings/referral page with referral link, copy button, and stats in sidebar navigation

## 2026-02-18

FIX: Add videoUrl to changelog AttributeSchema to fix Zod v4 strict validation rejecting v110 entry
FEATURE: Add referral admin dashboard with stats cards, top referrers table, and recent referrals table
FIX: Replace blinking red progress overlay with smooth dark overlay in inspiration anonymize dialog
FIX: Sort premium organizations (PRO, ULTRA, lifetime) first in admin organizations list
FIX: Fix duplicate React key in pagination ellipsis (use distinct ellipsis-start/ellipsis-end)
FIX: Fix duplicate key in inspiration marquee for doubled array
FIX: Replace index key with card.name in org plan dialog
FIX: Add missing sizes to 3 Image fill components in magic-section
FIX: Replace raw fetch() in useEffect with useQuery + upfetch in admin payments component
FIX: Replace array index keys with stable identifiers across 12 components
FIX: Add iframe title attribute for accessibility in hero section
FIX: Replace scale:0 with scale:0.95 + opacity:0 for natural entrance animation
FIX: Remove autoFocus attributes from dialog, description, and title update forms
FIX: Remove unused handleRootRedirect export from proxy-utils
FEATURE: Add prefers-reduced-motion CSS media query for accessibility (WCAG 2.3.3)
FEATURE: Add metadata exports to pages for SEO (not-found, payment, account, demo)
REFACTOR: Add sizes attribute to 40+ next/image fill components for responsive optimization
REFACTOR: Convert 17 raw img tags to next/image for automatic optimization
REFACTOR: Wrap recharts components with next/dynamic for code splitting (~30kb saved)
FIX: Make Esc hint in dialog footer a clickable ghost button to close the dialog
FIX: Remove empty divider and padding in dialog when there's no body content (confirm/input fields)
FIX: React Doctor audit — add passive scroll listener, fix lazy useState, remove redundant nav role, replace anchor tags with next/link, add iframe titles, fix generation-gallery default prop
FEATURE: Add admin fake generation mode — use public images instead of Gemini API, credits auto-refunded, toggle visible only to admins in editor
FEATURE: Add changelog system with MDX-based entries, Redis dismiss state, stacked sidebar widget, public timeline page with build-time caching, and nav/footer/docs links
FIX: Fix referral dialog - remove duplicate copy button, add copied state feedback, use 2-column share layout
FEATURE: Send email notification to referrer when they earn credits from a referral (max 1 email/day)
UPDATE: Reduce initial free credits from 7 to 5 to encourage referral sharing
REFACTOR: Add proper Prisma relations to referral models with onDelete Cascade/SetNull
FIX: Fix dialog manager tests to match restyled footer bar (Esc hint instead of cancel button)
FIX: Add missing env vars to Playwright CI workflow (Lumail, Upstash, updated secrets)

## 2026-02-17

FIX: Update `outline-filled` button variant with accent border for better visibility on colored surfaces
REFACTOR: Restyle dialog manager (confirm, input, custom) with bordered ring, header/body/footer layout, and Esc/Enter keyboard hints
REFACTOR: Refactor Image Gallery dialog to use bordered dialog components
FIX: Fix thumbnail click-to-open-detail blocked by hover overlay intercepting all clicks
FIX: Add missing Esc close indicator and use InlineTooltip + outline-filled variant in thumbnail detail dialog footer
FIX: Fix invisible outline buttons in dark mode dialog footers by adding bg-background
REFACTOR: Extract bordered dialog components to shared `@/components/bordered-dialog.tsx` and adopt in thumbnail-detail, video-selector, and create-person dialogs
FIX: Replace custom button element with Button component in bulk import dialog for consistency
REFACTOR: Refactor inspiration dialog to use reusable layout components - replace DialogContent, DialogHeader wrappers with InspirationDialogContent, InspirationDialogHeader, InspirationDialogBody, InspirationDialogFooter, and DialogEscClose
REFACTOR: Use reusable layout components in inspiration detail dialog - replace duplicated styling with InspirationDialogContent, InspirationDialogHeader, InspirationDialogBody, InspirationDialogFooter, and DialogEscClose
REFACTOR: Use reusable layout components in inspiration multi-selector - replace duplicated styling with InspirationDialogContent, InspirationDialogFooter, and Button component for footer actions
REFACTOR: Use reusable layout components in bulk import dialog - replace duplicated styling with InspirationDialogContent, InspirationDialogHeader, InspirationDialogBody, and InspirationDialogFooter
REFACTOR: Use reusable layout components in pixelate editor dialog - replace duplicated styling with InspirationDialogContent, InspirationDialogHeader, InspirationDialogBody, and InspirationDialogFooter
FEATURE: Add thumbnail detail dialog - click any thumbnail to view full-size with prompt sidebar, reference images, and labeled action buttons (edit, fork, copy, download, add to video, reuse)
FEATURE: Add anonymize button to inspiration detail dialog with Replace/Duplicate flow
REFACTOR: Redesign inspiration detail dialog with ring styling, footer bar, and consistent UI matching other inspiration dialogs
FEATURE: Add hasPlaceholder field to Inspiration model - track anonymized inspirations and enforce stronger mannequin replacement in generation prompts
FIX: Add mannequin placeholder replacement instructions to thumbnail generation prompts (Gemini + GPT) - never reproduce wireframe mannequins from anonymized inspirations
FIX: Improve inspiration dialog loader - skeleton-style loading overlay, 50% image opacity during processing, animated progress bar, "Image generation can take longer..." message at 90%
FEATURE: Add retry button to inspiration dialog - show retry on anonymization error and on done phase when anonymization was used
FIX: Fix custom API key usage tracking - use generation-level flag instead of inferring from plan mode, log usage on failed generations, add custom key support to REST API trigger tool
FIX: Add custom API key usage tracking to ALL text/analysis operations - enhance prompt, describe image, auto-name, person description, inspiration analysis, anonymization, backfill categories, video titles, and tool API endpoints
FIX: Improve AI-generated inspiration titles to be more appealing and clickbait-style with power words and YouTube energy
FIX: Enforce custom API keys for ALL AI operations - poweruser plans now use their own keys for enhance prompt, auto-name, image description, image generation (sync paths), tool API endpoints, video title generation, and video internal title generation
FIX: Make inspirations page mobile-friendly - collapse secondary actions into dropdown on mobile, add flex-wrap to LayoutActions
FEATURE: Add PWA support for iOS Add to Home Screen - manifest icons, apple web app metadata, viewport-fit cover, safe area CSS
FIX: Simplify anonymization prompt - describe mannequin inline instead of sending placeholder image, fix position/color drift
FIX: Remove "Docs Terms" links from settings layout
REFACTOR: Rename "API Keys" to "Custom API Keys" in sidebar navigation
FIX: Make API Keys settings page full width

## 2026-02-16

FIX: Improve anonymization prompt clarity - explicitly separate what to preserve (exact body/hand/pose position) vs what to remove (facial features, clothing, accessories)
FEATURE: Add bulk import for inspirations - import up to 100 thumbnail images at once with sequential AI processing, progress tracking, and error summary
FIX: Rename nowts/now-ts references to thumbfa.st in conductor scripts and package.json
REFACTOR: Restyle CreatePersonDialog to match InspirationDialog - custom dark container, bordered header, icon input, absolute footer bar with Kbd hint
FIX: Wrap validateCreditForFeature/validateCreditOrApiKey in try-catch in tool handlers so credit errors return proper ToolResult instead of generic 500
FIX: Move credit deduction to AFTER inspiration DB insert in create_inspiration tool handler to prevent charging for failed inspirations
FEATURE: Add progress overlay with estimated time bar on both inspiration dialog and thumbnail generation placeholders
FIX: Fix interval memory leak and setTimeout race condition in inspiration dialog
FIX: Fix "Create" tooltip linking to wrong docs page
FIX: Use validateCreditForFeature/validateCreditOrApiKey everywhere - fix powerusers being charged credits in user-image upload, inspiration tools, image tools, and remove redundant double-checks in generation tools
FIX: Improve anonymization prompt to enforce completely featureless mannequin (no eyes, no facial details)
FIX: Fix hydration mismatch in SidebarUserButton by guarding session data with isClient check
FEATURE: Add "Create & Anonymize" button to inspiration dialog that replaces people with placeholder mannequin using Gemini AI (1 credit)
REFACTOR: Redesign inspiration dialog - larger size, smart auto-detect input (YouTube URL vs upload), matching video-selector styling with ring/shadow and footer shortcuts
FEATURE: Add anonymize inspiration documentation page with guide on how it works, costs, and tips

## 2026-02-13

FEATURE: Add star indicator on GOOD (featured) inspirations in the multi-selector
FIX: Show latest successful thumbnail instead of empty image when the most recent generation failed

## 2026-02-11

FIX: Fix video selector dialog width shifting by setting fixed width and full-width skeletons
FIX: Allow exporting thumbnails when at least 1 slot is filled instead of requiring all 3

## 2026-02-08

REFACTOR: Redesign footer with editorial layout, outlined brand watermark, and refined typography hierarchy
CHORE: Rename and add 14 new generation images to hero marquee
CHORE: Update Terms of Service to clarify generated thumbnails can be used for marketing and advertising purposes
FEATURE: Add dynamic page metadata with entity names (video title, person name, inspiration name, prompt name) for better browser tab identification across all org pages

## 2026-02-05

FEATURE: Add Blog link to docs header and main site header navigation
CHORE: Add unique Unsplash cover images for all 50 blog posts
FEATURE: Add 50 SEO blog posts targeting AI YouTube thumbnails, thumbnail makers, thumbnail generation, and AI tools keywords (1 post/day from Feb 6 to Mar 27)
FEATURE: Add /llms.txt route with auto-generated documentation paths from doc-manager and post-manager
CHORE: Upgrade tchao SDK from 1.0.2 to 1.1.0 and use TchaoProvider with impersonation support and user plan metadata
REFACTOR: Pivot landing page messaging from time-saved to performance/CTR results (hero, stats, benefits, CTA, about, problem sections)
REFACTOR: Premium CMD+K style for inspiration multi-selector dialog (ring shadow, footer with keyboard hints, cleaner filters)
FIX: Invalidate TanStack Query cache after adding thumbnail to video for data sync
REFACTOR: Unify video selector dialogs into single component using only thumbnailId (remove generationId logic)
REFACTOR: Premium CMD+K style for video selector dialogs (ring shadow, keyboard hints, clean list layout)
FEATURE: Add auth-aware buttons to 401 unauthorized page (sign in with redirect or go to orgs)
FIX: Fix all broken documentation links across the codebase (missing /guides/ and /api-reference/ prefixes)

## 2026-02-04

FEATURE: Add drag-n-drop and multi-file upload for extra images in editor
FIX: Show "Create Person" CTA in editor when no persons exist
FIX: Fix mobile chat UI word wrapping, width, and padding issues

- Add word-break and overflow-wrap rules to .chat-prose for proper text wrapping
- Add mobile-specific styles for Tchao widget container
- Fix 100vw overflow issue by using 100% instead
  CHORE: Remove unnecessary conditional fallbacks in Tchao snippet (lint fix)

## 2026-02-03

FIX: Show 1 thumbnail per row on mobile for generations page (was 2)

## 2026-02-02

FIX: Remove video from onboarding step 3

## 2026-02-01

REFACTOR: Clean up settings UI - remove global floating legal footer, add minimalist Docs/Terms links to settings header origin/feature/fix-mobile-chat-ui

## 2026-01-31

UPDATE: Change Alex Paris testimonial quote to "I love this product."

## 2026-01-30

REFACTOR: Migrate documentation to Lumail-style architecture

- Add hierarchical folder structure with meta.json ordering
- Add "use cache" + cacheLife("max") caching strategy
- Convert to catch-all [[...slug]] routing for nested paths
- Add DocCard, DocCardGrid, DocSection, DocCardWrapper MDX components
- Reorganize content into /guides and /api-reference folders
- Add folder-based sidebar navigation with top-level sections

FEATURE: Add Podcast Thumbnails documentation page with video tutorial
FEATURE: Add Academy section to dashboard with links to key documentation

FEATURE: Add Podcast section to landing page showing guest swap capability

FEATURE: Add "last saved video" quick-add with undo (YouTube Music style)

- First + click opens video selector dialog
- After selecting a video, preference saved in sessionStorage
- Subsequent + clicks auto-add to last saved video
- Undo clears preference and returns to dialog selection

UPDATE: Optimize YouTube title generation prompt with viral formulas

- Add thinking process for better title analysis
- Include proven viral title formulas (curiosity, challenge, listicles, comparison, authority, regret)
- Add language auto-detection from context
- Improve rules for length, capitalization, and emotional triggers

FIX: Use React Query for video selector dialog with proper invalidation

- Refactor VideoSelectorDialog to use useQuery instead of local state
- Invalidate video queries after creating/adding to video
- Video list now properly refreshes after mutations

FIX: Video export failing with "Failed to fetch" due to CORS

- Use /api/proxy-image route to bypass CORS when downloading thumbnails for ZIP export

FIX: Use TitleUpdateForm for video title instead of custom Input

- Create VideoTitleEditor component using shared TitleUpdateForm
- Consistent title editing UX with Generations page
- Move description save/cancel buttons near the textarea instead of page header

FIX: Video selector dialog now shows videos with thumbnail previews

- Add thumbnail preview images to video list in selector dialog
- Show slot fill status (e.g., "2/3 slots") for each video
- Fix listVideosAction to include video generation thumbnails
- Simplify add-to-video flow by removing unnecessary loading state tracking

## 2026-01-29

FEATURE: Add MCP and API documentation with auto-generated tool reference

- Add /docs/mcp-setup for MCP integration guide (Claude Desktop, Claude Code, Cursor)
- Add /docs/api-overview for REST API documentation
- Add script to auto-generate tool docs from TypeScript definitions (pnpm generate:docs)
- Generate 5 tool reference pages: tools-generation, tools-person, tools-inspiration, tools-image, tools-credits

UPDATE: Enrich all MCP/API tool descriptions with documentation links and usage guides

- generate_thumbnail: prompting tips, image/person/inspiration usage from docs
- generate_variation: workflow for adding images to variations
- create_person: image requirements, description field importance, what to avoid
- create_inspiration: style reference concepts and best practices
- upload_image, list_images, search_images, get_image: how to reference images in prompts

FEATURE: Add search_images tool to find images by name/description in MCP/API
FEATURE: Add get_image tool to retrieve specific image details in MCP/API
FEATURE: Add imageIds parameter to generate_variation tool for adding images to variations

FEATURE: Add unified tools system with MCP and REST API support

- Create 18 tools across 5 categories (generation, person, inspiration, image, credits)
- Add MCP adapter for Claude Desktop and AI agent integration at /api/mcp
- Add REST API adapter at /api/v1/tools/[toolName]
- Add API key authentication system with tf\_ prefixed keys
- Add Developer settings page for API key management at /settings/developer
- Add tool discovery endpoint at GET /api/v1/tools
- Add Developer link in sidebar navigation

## 2026-01-27

FIX: Disable org selector dropdown when user has only one org (no empty dropdown)
FIX: Prevent users from creating multiple organizations to claim free credits twice - organization limit reduced from 5 to 1, "Add new org" link hidden when user has org, /orgs/new page redirects to existing org

REFACTOR: API keys settings page now uses Layout components for consistency with other pages

FEATURE: Add Lumail.io integration for email subscriber tracking - creates subscriber on signup with "onboarding" tag, adds "paid" tag + revenue tracking on subscription, adds "churn" tag on cancellation
FEATURE: Add Lumail subscribers migration in admin panel - backfill existing organizations to Lumail with proper tags

FIX: Plan descriptions now correctly differentiate AI models - Free shows "Gemini model only" with Gemini-specific description, Paid plans show "Gemini + OpenAI models"

## 2026-01-26

REFACTOR: Remove floating Product Hunt popup from root layout
UPDATE: Replace hero Product Hunt badge with official "Top Post" badge
UPDATE: Add Product Hunt "Top Post" badge to footer

FIX: Add "Load more" button to inspirations page for better pagination UX and IntersectionObserver fallback
FIX: Dashboard page now only shows GOOD/APPROVED inspirations (was showing all including PENDING/DENY)

REFACTOR: Extract credit validation into reusable credit-validation.ts utility
REFACTOR: validateCreditOrApiKey() now validates model-specific API keys (OpenAI for GPT, Gemini for Gemini model)
FIX: Poweruser with GPT Image model now requires OpenAI API key specifically (not just any API key)
FIX: Poweruser with Gemini model now requires Gemini API key specifically
FIX: All generation actions now skip credit deduction for poweruser/fallback modes
UPDATE: Clear error messages when missing specific API key for selected model

FEATURE: Add guards to prevent PowerUser (lifetime plan) from changing plans or buying credits
UPDATE: PowerUser billing page shows "Power User Plan" card with link to API keys instead of credits

FIX: Admin inspirations page now shows GOOD status first, followed by APPROVED, PENDING, DENY

UPDATE: Modernize API keys usage chart with shadcn/ui chart components and stats header

REFACTOR: Clean up API key mode logic with ApiKeyMode type ("disabled" | "fallback" | "required")
REFACTOR: Add getApiKeyMode(), isPlanRequiringCustomApiKeys(), requireCustomApiKeysIfNeeded() utilities
UPDATE: API Keys page shows different messaging for Poweruser (required) vs Pro (fallback) plans
FIX: Poweruser plan now properly enforces API key requirement before generation

FEATURE: Add auto-copy for pixelating non-owned inspirations - copies inspiration with adminReview=DENY before pixelating

UPDATE: Lifetime plan shows "API Keys" badge instead of credits, links to API keys settings
UPDATE: Lifetime plan billing page shows "Custom API keys (required)" instead of "fallback"
FIX: Fix getOrgActiveSubscription to include lifetime status and handle missing stripeSubscriptionId

REFACTOR: Extract shared utilities - image validation, Stripe helpers, plan validation
REFACTOR: Add UNLIMITED_THRESHOLD constant to auth-plans.ts - replace magic number 1000
REFACTOR: Use CHART_DAYS and MS_PER_DAY constants in api-keys.action.ts

FEATURE: Add usage chart to API Keys dashboard - visualize 30-day custom API key usage with stacked bar chart
UPDATE: Use custom API keys for all AI features - inspiration descriptions, person descriptions, and image generation now use org API keys

FIX: Lifetime plan always shows checkout instead of portal, and auto-cancels active Stripe subscription on purchase
FIX: Fix PricingCard "No active organization" error - extract org slug from URL pathname instead of Zustand store
FEATURE: Show "You are signed in" dialog on landing page for authenticated users instead of auto-redirect to dashboard
FIX: Redirect to /orgs after sign-in from landing page instead of back to /
FEATURE: Add adminReview field to Inspiration model for community moderation - GOOD (featured), APPROVED (public), DENY/PENDING (owner-only)
FEATURE: Add admin Inspirations dashboard with search, filter by status, and inline status management
FEATURE: Add Tinder-style interactive review page for quick inspiration moderation at /admin/inspirations/interactive

FIX: Fix proxy header set before null check - move header assignment after slug validation
FIX: Add lifetime plan validation in Stripe webhook - prevent non-lifetime plans from being processed as lifetime
FIX: Fix race condition in cancel generation refund - use actual pending count difference for refund calculation
FEATURE: Add PowerUser lifetime plan ($199 one-time) - unlimited access with custom API keys, no recurring subscription
FEATURE: Add custom API keys for PRO/ULTRA users - use own OpenAI/Gemini keys as fallback when credits depleted
FEATURE: Add usage tracking for custom API keys - display monthly and total generations in API Keys dashboard
UPDATE: Show all plan features in billing plan page - display credits, generations, inspirations, persons, support, GPT Image access
CHORE: Remove NOW.TS documentation files (testimonials product) - keep only thumbnail-related docs
FEATURE: Add AI person validation during description generation - reject images without visible person/face with NotPersonError

## 2026-01-25

FIX: Fix GPT Image model tooltip in editor and show model access in pricing cards
FEATURE: Reserve GPT Image 1.5 model for Pro/Ultra users - add gptImageAccess plan limit
FEATURE: Add admin thumbnail detail page with full generation thread, person/inspiration images
UPDATE: Show person and inspiration images in admin generations list cards
UPDATE: Reduce initial free credits from 10 to 7 for new users
FIX: Fix hydration mismatch in SidebarUserButton by using useIsClient hook for avatar fallback
REFACTOR: Replace Product Hunt widget with custom styled badge inline with thumbnail count badge
FEATURE: Add "How to Use Images" documentation page with video tutorial for image referencing
UPDATE: Change editor Images section link from Tella video to /docs/images-guide
FEATURE: Add "Using Reference Images (Objects and Logos)" section to effective-prompting docs
FIX: Fix credit system floating point precision issues - migrate balance/amount from Float to Decimal(10,2) in database
FIX: Fix race condition in credit deduction - use atomic database-level check with WHERE balance >= amount
FIX: Fix Credits Used displaying negative values in admin panel - convert Decimal to Number for arithmetic
FIX: Add missing refund when user cancels pending generations - credits are now returned
FIX: Make admin credit deduction atomic - remove racy pre-check, rely on atomic deductCredits
FEATURE: Add empty state message in My Library tab when no inspirations exist
FIX: Fix autoGenerate race condition causing duplicate thumbnails - use ref instead of state, wait for prompt fetch, skip if generations exist
FEATURE: Add Product Hunt featured badge to hero section
FEATURE: Add plan-based limits for inspirations (10 free/1000 pro) and persons (2 free/1000 pro) with Upstash rate limit for signup credits (1/IP/30 days)
FEATURE: Add content policy verification for inspiration images - block illegal/inappropriate content via AI analysis
UPDATE: Show 9 curated inspirations in onboarding instead of random ones
FEATURE: Auto-generate thumbnail after onboarding completion via ?autoGenerate=true param
REFACTOR: Remove description field from onboarding person form - auto-generate from uploaded images
FEATURE: Add Product Hunt badge in bottom left corner (shows after 5s, dismissable, persists to localStorage)
FEATURE: Add /auth/start dedicated landing CTA page with marketing copy and sign-in providers
UPDATE: Update all landing page CTAs to use /auth/start instead of /auth/signup
UPDATE: Update contact and about pages with Thumbfa.st company information (was referencing NOW.TS)
FIX: Increase marquee animation speed on mobile only (30s vs 120s) for hero and inspiration sections
UPDATE: Add "Learn how to use images" link to Tella video tutorial in editor Images section
FIX: Persist uploaded image name changes to database on Enter/blur
FIX: Fix inspiration panel infinite scroll not loading more items when content already visible on open
FIX: Increase inspiration panel height from 60vh/70vh to 70vh/80vh for better browsing
FEATURE: Add double-click to edit uploaded image name in editor
REFACTOR: Make image upload atomic - AI analysis completes before image appears in UI (no more "Analyzing..." state)
FEATURE: Add "Bypass AI Restriction" landing page section with Tella video demo and pixelate tool features
UPDATE: Update admin migration script to backfill UserImage descriptions (finds images without description, calls AI, updates record)
FEATURE: Add tabs in editor Images section to switch between "Selected" images and "Gallery"
REFACTOR: Store images in UserImage table with name/description, reference by ID in Prompt/Generation
REFACTOR: Replace uploadedImages JSON with userImageIds array referencing UserImage records
REFACTOR: Update editor store to use userImageIds array instead of storing image objects
REFACTOR: Update uploaded-images-list component to work with UserImageData and use image IDs instead of URLs
REFACTOR: Update editor form to use new userImages system from store and getUserImageIds() method
REFACTOR: Update editor actions to use userImageIds instead of uploadedImages
UPDATE: Improve hero section mobile layout - separate video and marquee into distinct sections for cleaner UX
UPDATE: Unify persons and inspirations page card styling to match thumbnails page (rounded-2xl, shadow-md, border, hover ring effect)
REFACTOR: Redesign person edit page with compact single-card layout (images grid with add/remove, name/description inline, drag-and-drop upload, footer with save button)
REFACTOR: Redesign inspiration edit page with compact single-card layout (images grid with inline add/remove, simple visibility toggle, footer with metadata and save button)
FEATURE: Add pixelate editor for inspiration images (canvas-based region selection, adjustable pixel size, multi-region support)
FEATURE: Add "Pixelate" button on hover over inspiration images in detail dialog
FEATURE: Update AI prompts to replace pixelated face regions with referenced person's face
FEATURE: Add user-defined names for uploaded images (e.g., "React Logo", "Website") with editable inline UI
FEATURE: Add auto-description for uploaded images (0.05 credits) with named labels in AI prompts
REFACTOR: Change uploadedImages from String[] to JSON storing {url, description, name}[] for better AI context
FEATURE: Add describeUploadedImage() AI function for 4-9 word image descriptions
FEATURE: Add describeUploadedImageAction server action with credit deduction
FEATURE: Add admin migration route /api/admin/migrate-uploaded-images for backfilling existing data
FEATURE: Add admin Migrations page (/admin/migrations) with UI for running image description backfill
FEATURE: Add clickable selected inspirations in editor that open detail dialog showing name, category, all thumbnails, and AI description
UPDATE: Enlarge inspiration picker dialog 2-3x on desktop (max-w-6xl, 70vh height) with responsive grid (2 cols mobile, 4 cols tablet, 5 cols desktop)
REFACTOR: Simplify person creation with dialog-based workflow (dropzone + name field, AI auto-generates description on submit)

## 2026-01-24

UPDATE: Redesign thumbnails page card with glassmorphism person/style images in top-left corner, dark gradient overlay, hover ring effect, and cleaner layout
FEATURE: Add "Bypass AI Policy Blocks" documentation page with video tutorial explaining how to pixelate faces to bypass Google AI safety filters
FEATURE: Add help link in thumbnail error card when AI Policy error occurs (links to bypass-ai-policy docs)
FIX: Fix 401 errors on API routes by extracting org slug/id from URL path instead of relying on x-org-slug header (supports both slug and ID in /api/orgs/[orgId]/ routes)
UPDATE: Increase dashboard recent generations from 10 to 20 thumbnails (4 rows at xl breakpoint)
UPDATE: Redesign InspirationSection with Infinite Steal Mode marquee (7 before/after examples, red accents, horizontal scroll animation)
FEATURE: Add thumbnail categories (Tutorial, Vlog, Gaming, Review, Entertainment, News, Music, Education, Lifestyle, Other) with AI auto-classification during inspiration creation
FEATURE: Add category filter dropdown in inspiration selector for easy search
FEATURE: Add backfillInspirationCategoriesAction to run category finder on existing inspirations using Gemini 2.0 Flash
FEATURE: Add /demo-orginitly page with 10 variations of inspiration section (grid, horizontal, stacked overlay, dark theme, split screen, timeline, gallery, card stack, minimal line, floating blur)
REFACTOR: Redesign demo section to match real editor UI 1:1 (Card with textarea, 3-column reference sections, bottom control bar, generation gallery with thumbnails grid)
UPDATE: Hero with 2-row marquee (opposite directions), exact 16:9 video ratio, slower animation (120s)
UPDATE: Replace Sparkles icon with Loader icon in demo section generating state
FEATURE: Add /final hero page combining compact gallery layout with bold typography (underlined Midjourney)
FEATURE: Add CtaButton component with rounded-2xl design, larger size, shadow effects, and hover animations
UPDATE: Apply new CtaButton to hero section and CTA section for consistent design
UPDATE: Redesign feature icons with subtle muted background, border and shadow (removed "Killer Feature" badges)
REFACTOR: Download all landing page images to public/landing/ for SEO optimization (use Next.js Image with local files instead of external CDN URLs)
FIX: Fix ClientMarkdown text visibility in light mode by adding text-foreground class
FEATURE: Add About section with founder story and A/B test proof image showing AI thumbnail 2x performance
REFACTOR: Extract feature components into separate files in features/ folder (FaceToThumbnailsFeature, InspirationFeature, MultiThumbnailFeature, RotatingThumbnails)
FEATURE: Add InspirationFeature card showing inspiration -> result transformation visual
FEATURE: Add auto-rotating multi-thumbnail showcase (buttons 1-4 show corresponding number of thumbnails, auto-cycles every 2.5s)
FEATURE: Add /demo page with 10 creative hero section variations (split screen, centered, asymmetric, stacked cards, glass morphism, bold typography, feature grid, diagonal split, compact gallery, full bleed video)
UPDATE: Redesign "Killer Feature" card with face-to-thumbnails visual (shows face image, arrow, and rotating generated thumbnails)
FIX: Make pricing plans grid fully responsive (1 column on mobile, 3 columns on lg; prevents awkward 2-1 layout on medium screens)
FIX: Make live demo section fully responsive with mobile-first approach (compact sidebar, scaled icons/text, responsive grid layout)
REFACTOR: Modernize BenefitsSection - remove hover effects and gradients while keeping card borders; consistent with landing page design system
FEATURE: Add dynamic thumbnail count badge in hero (fetched from /api/stats/thumbnails-count with 1-day cache)
UPDATE: Add new thumbnail examples to hero marquee slider
UPDATE: Replace hero screenshot with Tella video iframe for better product demonstration

## 2026-01-15

REFACTOR: Replace session-based organization context with header-based routing (x-org-slug header set by middleware)
REFACTOR: Remove setActiveOrganization calls from proxy, route handlers, and org list
REFACTOR: Simplify get-org.ts to read organization slug from headers instead of session state
REFACTOR: Remove OrgAutoSelect component (no longer needed with header-based approach)
FEATURE: Enable multi-tab support for different organizations (each tab now has independent org context via URL)
FIX: Reduce membership cache TTL from 5 minutes to 30 seconds for faster access revocation
FIX: Handle null organization slug explicitly in proxy to prevent user-controlled header injection
FIX: Add "default" to reserved slugs to prevent inaccessible organizations
FIX: Add explicit empty string validation for x-org-slug header
FIX: Optimize double owner lookup in getCurrentOrg by caching find result

## 2026-01-14

FEATURE: Add model icons to model selector (yellow Banana icon for Nano Banana Pro, OpenAI logo for GPT Image 1.5)
FEATURE: Enable model selection for all users by removing localStorage feature flag
UPDATE: Replace landing page testimonials with new reviews (Alex So Yes with custom SVG, Alex Paris, and content creator reviews)
FEATURE: Sort organizations with active subscriptions (active/trialing) first in admin organizations list
FIX: Fix usage graph timezone issue by using UTC consistently for date formatting (prevents transactions from being counted on wrong days due to timezone conversion)
FEATURE: Add "Manage Billing" button to open Stripe customer portal in billing layout (visible on all billing pages)
FEATURE: Add ThumbnailError table with detailed error tracking (type, message, stack, metadata) and admin Errors page with search and filter capabilities

## 2026-01-11

FIX: Add error field to thumbnail API responses to display generation failure messages in UI

## 2026-01-07

FEATURE: Add click-to-view dialog for admin generations thumbnails showing full image, prompt, organization, date, model, and actions
REFACTOR: Improve admin generations page UI with proper Item component structure (ItemGroup, ItemFooter), cleaner 4-column grid layout, and better visual hierarchy
FEATURE: Add tooltip on disabled generation count options (2, 4) for free users with Pro upgrade message
FEATURE: Display all thumbnails individually on generations page (instead of 1 per generation)
FEATURE: Display all thumbnails individually on admin generations page
FIX: Upgrade style reference picker toggle UI (ToggleGroup to Tabs, "Mine" to "My Library", "All" to "Community")
FIX: Fix infinite scroll using scroll event listener with delayed element query (100ms for dialog render)
FIX: Fix selected inspirations not displaying by saving to store BEFORE addInspirationId call
FIX: Allow fetching public inspirations by ID in API (OR condition for orgId or isPublic)
FIX: Add useQueries to fetch missing inspiration data for selected items from different filter tabs
FIX: Add "Scroll for more..." indicator when more pages are available
FIX: Update inspirations page toggle to use Tabs with "My Library" / "Community" labels

## 2026-01-05

FEATURE: Add diagnostic logging for Gemini API responses (finishReason, safety ratings, file counts)
FEATURE: Display failed generation errors in thumbnail gallery instead of showing nothing
FIX: Handle IMAGE_SAFETY and IMAGE_OTHER finishReasons with user-friendly error messages
FIX: Handle blockReason:OTHER when Gemini rejects prompt before generating (no candidates)
UPDATE: Improve error messages to clarify AI policy blocks are from Google, not the app

## 2026-01-02

FIX: Fix admin generations grid layout issue (replace ItemGroup with div to resolve flex/grid conflict)
FEATURE: Add organization-specific generations page at /admin/organizations/[orgId]/generations
FEATURE: Add "View Generations" button to organization detail page
FEATURE: Add comprehensive Terms of Service compliant with US/Delaware law (arbitration, liability caps, FTC-compliant refund policy)
FEATURE: Add Privacy Policy with CCPA rights, AI vendor disclosures (Google/OpenAI), GPC compliance, and data retention policies
CHORE: Update company info to Codelynx, LLC (Delaware)
FEATURE: Add generation count display in admin organization credits panel
REFACTOR: Replace inline credit adjustment form with dialog (single amount input: +100 or -100)
REFACTOR: Modernize credits management UI with compact stat cards, responsive grid layout, and cleaner transaction table

## 2025-12-29

FEATURE: Add generation limits per plan (2 for free, 4 for paid)
FEATURE: Add priority support via live chat for paid plans
FIX: Disable trial period on Ultra plan (only 5 free credits for starting)
FEATURE: Add Heyo chat snippet for user identification and support
FEATURE: Add clickable generation cards with detail dialog in admin panel
REFACTOR: Update admin generations list to use Item component for cleaner UI

## 2025-12-26

FIX: Add loading state to thumbnail download and copy buttons to prevent multiple clicks
REFACTOR: Improve APEX slash command with proper XML structure, YAML frontmatter, and clear phase definitions
CHORE: Update CLAUDE.md with detailed Editor feature architecture documentation
FEATURE: Add branch button to thumbnails for quick iteration with pre-selected inspiration and persons
FIX: Add infinite scroll to inspirations page for All and Mine tabs
FEATURE: Increase recent activity display from 5 to 10 transactions on credits page
FIX: Add close button and backdrop click to close custom dialogs
REFACTOR: Simplify tutorial dialog to show one video with links to more tutorials
FEATURE: Add reply button to admin feedback page to send email responses
REFACTOR: Improve admin feedback detail page with cleaner UI layout
FEATURE: Make user clickable in feedback detail to navigate to user profile
FEATURE: Add admin generations page to view all thumbnails across organizations
FEATURE: Make credits display clickable to redirect to billing page
FEATURE: Add gradient border to premium user avatar in sidebar

## 2025-12-25

CHORE: Add action
CHORE: Update credit pack prices and introduce new tiers
REFACTOR: Refactor thumbnail actions into reusable component

## 2025-12-24

FEATURE: Redirect unauthenticated users to signup on plans page

## 2025-12-23

FEATURE: Add subscription upsell card to credits page

## 2025-12-21

FEATURE: Use maxresdefault thumbnails and fetch youtube video titles for inspirations
FIX: Display selected inspiration thumbnails in style references
FIX: Fix upload functionality
FEATURE: Update tutorial videos for inspiration and editor
FIX: Redirect to orgs page after sign-in
FEATURE: Add inspiration filter

## 2025-12-19

FEATURE: Add shift+enter shortcut to submit thumbnail generation
CHORE: Add missing environment variables to playwright workflow
FEATURE: Block svg and gif file uploads

## 2025-12-17

FEATURE: Add GPT Image 1.5 model support

## 2025-12-16

FIX: Prevent form submission on image buttons in multi-image-uploader

## 2025-12-15

CHORE: Format global styles
FEATURE: Restructure pricing and add monthly credit refill cron

## 2025-12-14

FIX: Fix editor logic
FIX: Fix inspiration dialog
FEATURE: Improve inspiration visibility with image grid and auto-close

## 2025-12-12

FEATURE: Show images only with hover text and edit redirect for generations
FIX: Fix navigation

## 2025-12-11

FIX: Show generate button label only during mutation
FIX: Disable cacheComponents feature due to incompatibility with API routes
FIX: Complete inspirationId to inspirationIds migration
FEATURE: Allow concurrent generations with upfront credit deduction

## 2025-12-10

FIX: Remove invalid thinkingConfig from Gemini 3 Pro API call
FEATURE: Add generation loop
FEATURE: Execute all generations in parallel with staggered starts and add timeout protection
REFACTOR: Use API route instead of previous logic
FIX: Fix generation loop to process all pending thumbnails sequentially
FEATURE: Implement client-side sequential generation with throttling
FIX: Charge credits only for successful generations and add comprehensive logging
FIX: Fix all bugs and errors
FEATURE: Add "Use this" functionality and thumbnails gallery for inspirations
FIX: Round floating point values in credit balance displays
FEATURE: Add onboarding

## 2025-12-09

FIX: Fix onboarding
FIX: Remove duplicate file after upload completes in multi-image-uploader
CHORE: Update logo and onboarding
CHORE: Consolidate migrations into single initial migration
FIX: Publish demo post for build
CHORE: Add initial codebase

## 2025-12-04

REFACTOR: Refactor with Lumail learning
