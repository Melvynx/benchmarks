# PostHog Analytics - Thumbfa.st

## Architecture

```
Browser                    Next.js Server              PostHog (EU)
  |                            |                          |
  |-- /ph/static/:path* ----->|-- eu-assets.i.posthog -->|
  |-- /ph/:path* ------------>|-- eu.i.posthog.com ----->|
  |                            |                          |
  | posthog-js (client)        | posthog-node (server)    |
  | - pageviews                | - generation events      |
  | - identify                 | - billing events         |
  | - UI interactions          | - content events         |
```

**Proxy**: All PostHog requests go through `/ph/*` rewrites in `next.config.ts` to bypass ad blockers. No direct requests to `posthog.com`.

**Region**: EU (`eu.i.posthog.com`)

## Environment Variables

```bash
NEXT_PUBLIC_POSTHOG_KEY="phc_..."     # PostHog project API key
NEXT_PUBLIC_POSTHOG_HOST="/ph"         # Proxy path (NOT posthog.com)
```

## Key Files

| File                                        | Purpose                                     |
| ------------------------------------------- | ------------------------------------------- |
| `next.config.ts`                            | Proxy rewrites (`/ph/*` -> PostHog EU)      |
| `src/lib/posthog.ts`                        | Server-side client (posthog-node singleton) |
| `src/features/posthog/posthog-provider.tsx` | Client init, PageView, Identify components  |
| `src/features/posthog/posthog-events.ts`    | Type-safe event catalog (`POSTHOG_EVENTS`)  |
| `app/providers.tsx`                         | PostHogProvider wraps entire app            |

## Event Catalog

### Naming Convention: `category:action` (snake_case)

### Auth Events (Client-side)

| Event                 | Trigger              | Properties |
| --------------------- | -------------------- | ---------- |
| `auth:signup_started` | Sign up form success | `method`   |
| `auth:signin_started` | Sign in form success | `method`   |

### Generation Events (Server-side)

| Event                    | Trigger                 | Properties                                   |
| ------------------------ | ----------------------- | -------------------------------------------- |
| `generation:created`     | New thumbnail generated | `model`, `credits_cost`, `prompt_length`     |
| `generation:regenerated` | Thumbnail regenerated   | `model`, `generation_number`, `credits_cost` |
| `generation:cancelled`   | Generation cancelled    | `pending_count`, `refunded_credits`          |
| `generation:enhanced`    | AI prompt enhancement   | `credits_cost`                               |

### Billing Events (Server-side)

| Event                       | Trigger                  | Properties                         |
| --------------------------- | ------------------------ | ---------------------------------- |
| `billing:upgrade_initiated` | Checkout session created | `plan`, `is_annual`, `is_lifetime` |

### Content Events (Server-side)

| Event                    | Trigger                | Properties                  |
| ------------------------ | ---------------------- | --------------------------- |
| `inspiration:created`    | New inspiration added  | `type`, `has_anonymization` |
| `inspiration:anonymized` | Inspiration anonymized | `mode`                      |
| `person:created`         | Person/talent added    | -                           |
| `video:created`          | Video project created  | `has_youtube_url`           |
| `image:uploaded`         | User image uploaded    | `has_auto_analysis`         |

### Engagement Events (Client-side)

| Event                  | Trigger               | Properties     |
| ---------------------- | --------------------- | -------------- |
| `thumbnail:downloaded` | Download button click | `thumbnail_id` |
| `thumbnail:copied`     | Copy to clipboard     | `thumbnail_id` |

### Other Events (Server-side)

| Event                  | Trigger             | Properties     |
| ---------------------- | ------------------- | -------------- |
| `onboarding:completed` | Onboarding finished | -              |
| `feedback:submitted`   | Feedback form sent  | `review_score` |

### Automatic Events (PostHog built-in)

| Event          | Description                                          |
| -------------- | ---------------------------------------------------- |
| `$pageview`    | Manual capture on route change (via PostHogPageView) |
| `$pageleave`   | Auto-captured by posthog-js                          |
| `$autocapture` | Click/input tracking (posthog-js default)            |

## User Identification

Authenticated users are identified client-side via `PostHogIdentify` component:

```
distinct_id: user.id
properties:
  - email
  - name
  - plan (free/pro/ultra/poweruser)
  - org_slug
  - org_name
```

Server-side events use `ctx.org.id` as distinct_id for org-scoped actions.

## PostHog Dashboard

**Dashboard**: "Thumbfa.st - Product Analytics" (pinned)
**URL**: https://eu.posthog.com/project/36048/dashboard/546576

### Insights

| Insight               | Type       | Description                                        |
| --------------------- | ---------- | -------------------------------------------------- |
| Daily Traffic         | Line chart | Pageviews + unique visitors over time              |
| Device Split          | Pie chart  | Mobile vs Desktop vs Tablet                        |
| Geo Distribution      | World map  | Pageviews by country                               |
| Browser Distribution  | Pie chart  | Chrome, Safari, Firefox, etc.                      |
| OS Distribution       | Pie chart  | macOS, Windows, iOS, Android, etc.                 |
| Sign Ups & Sign Ins   | Line chart | Daily auth events                                  |
| Thumbnail Generations | Line chart | New + regenerated thumbnails per day               |
| Feature Usage         | Bar chart  | Generations, Inspirations, Persons, Videos, Images |
| Billing - Upgrades    | Line chart | Upgrade attempts by plan                           |
| Downloads & Copies    | Line chart | Thumbnail download/copy engagement                 |

## Adding New Events

1. Add event name to `src/features/posthog/posthog-events.ts`:

```ts
export const POSTHOG_EVENTS = {
  // ...existing events
  MY_NEW_EVENT: "category:action_name",
} as const;
```

2. **Server-side** (in `*.action.ts`):

```ts
import { trackServerEvent } from "@/lib/posthog";
import { POSTHOG_EVENTS } from "@/features/posthog/posthog-events";

void trackServerEvent(ctx.org.id, POSTHOG_EVENTS.MY_NEW_EVENT, {
  property_name: value,
});
```

3. **Client-side** (in React components):

```ts
import posthog from "posthog-js";
import { POSTHOG_EVENTS } from "@/features/posthog/posthog-events";

posthog.capture(POSTHOG_EVENTS.MY_NEW_EVENT, {
  property_name: value,
});
```

4. Update this file with the new event.

## Property Naming Rules

- Use `snake_case` for all properties
- Boolean properties: `has_` or `is_` prefix (e.g., `has_youtube_url`, `is_annual`)
- ID properties: `_id` suffix (e.g., `thumbnail_id`)
- Count properties: `_count` suffix (e.g., `pending_count`)

## Optimization Tips

- **Ad blocker bypass**: Already handled via `/ph/*` proxy rewrites
- **Session recordings**: Enable in PostHog settings for replay debugging
- **Feature flags**: Use `posthog.isFeatureEnabled("flag-name")` client-side
- **Person profiles**: Set to `"always"` - all users get profiles
- **Autocapture**: Enabled by default - tracks clicks/inputs automatically
- **Page leave**: Enabled - tracks when users navigate away

## Testing Locally

1. Set `NEXT_PUBLIC_POSTHOG_KEY` in `.env`
2. Open browser DevTools > Network tab
3. Filter by `/ph/` - you should see requests to your proxy
4. Check PostHog Live Events: https://eu.posthog.com/project/36048/events
