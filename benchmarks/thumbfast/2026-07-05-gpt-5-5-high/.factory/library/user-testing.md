# User Testing

Testing surface, resource cost classification per surface.

---

## Validation Surface

- **Browser**: Primary surface. All features are UI interactions on listing pages.
- Pages to test: /orgs/{orgSlug}/thumbnails, /orgs/{orgSlug}/inspirations, /orgs/{orgSlug}/videos, /orgs/{orgSlug}/persons
- Requires authentication (Better Auth) and org context

## Validation Concurrency

- **agent-browser**: Max concurrent: 2 (each instance needs a dev server connection; reduced from 3 given current machine load)
- Dev server: `pnpm dev -p 3001` on port 3001 (port 3000 occupied by another Next.js instance)
- BETTER_AUTH_URL must be set to http://localhost:3001 when starting dev server on port 3001

## Authentication

- Better Auth uses cookie `thumbfast.session_token` (NOT `better-auth.session_token` - the app uses a custom prefix from SiteConfig.appId = 'thumbfast')
- **CRITICAL**: The cookie value must be HMAC-SHA-256 signed. Raw session token alone will NOT work.
- Session token for test user (melvynmal@gmail.com): Look up from `session` table in DB (query: `SELECT token FROM session WHERE userId = '...' ORDER BY expiresAt DESC LIMIT 1`)
- To generate the signed cookie, you need to:
  1. Read BETTER_AUTH_SECRET from .env file
  2. Sign the token with HMAC-SHA-256: `signature = HMAC-SHA-256(secret, token)` encoded as base64url (no padding)
  3. Cookie value = `token.signature`
- Test org slug: `melvynma-ce2f`
- Data available: 145 prompts/thumbnails, 203 inspirations, 42 videos, 8 persons

## Browser Right-Click Testing

- `agent-browser click --button right` may NOT trigger contextmenu events properly
- **Workaround**: Use JavaScript to dispatch a `MouseEvent('contextmenu')` on the target element:
  ```js
  const el = document.querySelector('...');
  const rect = el.getBoundingClientRect();
  el.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, clientX: rect.x + rect.width/2, clientY: rect.y + rect.height/2 }));
  ```

## Flow Validator Guidance: Browser

### Setup
- Base URL: http://localhost:3001
- Authentication: Set **signed** cookie `thumbfast.session_token` before navigating. See "Authentication" section above for signing instructions.
- Raw session token: Look up from `session` table in DB for the test user
- BETTER_AUTH_SECRET is in `/Users/melvynx/Developer/saas/thumbfa.st/.env`
- Org slug: `melvynma-ce2f`

### Page URLs
- Thumbnails: `/orgs/melvynma-ce2f/thumbnails`
- Inspirations: `/orgs/melvynma-ce2f/inspirations`
- Videos: `/orgs/melvynma-ce2f/videos`
- Persons: `/orgs/melvynma-ce2f/persons`

### Isolation Rules
- All validators share the same database and dev server
- Validators should NOT delete or rename items that other validators might need
- For rename/delete testing: use items from the END of the list to avoid conflicts
- Each validator should only interact with its assigned page(s)
- Do NOT create new items — test with existing data only

### Context Menu Testing
- Right-click: Use standard right-click (contextmenu event) on a card
- Hover: Move mouse over a card to reveal the "..." button
- The "..." button should have a MoreVertical icon inside
- Context menus and dropdown menus are rendered via Radix UI portals (look for `[data-radix-popper-content-wrapper]` or `[role="menu"]` in the DOM)
