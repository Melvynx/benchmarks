---
name: step-04-postdeploy
description: Stripe webhook, OAuth callback URLs, Resend domain verification, and end-to-end smoke test
prev_step: step-03-deploy.md
next_step: (end of workflow)
---

# Step 4: Post-Deploy Configuration

## Goal

Configure the small set of external services that genuinely cannot be set up before the prod URL exists, then run a smoke test.

## EXECUTION SEQUENCE

### 1. Stripe webhook endpoint (creates `STRIPE_WEBHOOK_SECRET`)

The webhook is a Convex `httpAction` mounted at `https://{convex_prod_site_url}/stripe/webhook`. Signature verification happens inside Convex, so `STRIPE_WEBHOOK_SECRET` must live in **Convex prod env** (not Vercel — the secret isn't read from there).

**Manual setup — if `stripe` CLI is available, use it (live mode requires `--live`):**

```bash
# For live mode (real prod launch with sk_live_* keys):
stripe webhook_endpoints create \
  --url "https://{convex_prod_site_url}/stripe/webhook" \
  --enabled-events "checkout.session.completed" \
  --enabled-events "customer.subscription.updated" \
  --enabled-events "customer.subscription.deleted" \
  --description "{App Name} production webhook" \
  --live \
  --confirm

# For test mode (rehearsal):
stripe webhook_endpoints create \
  --url "https://{convex_prod_site_url}/stripe/webhook" \
  --enabled-events "checkout.session.completed" \
  --enabled-events "customer.subscription.updated" \
  --enabled-events "customer.subscription.deleted" \
  --description "{App Name} production webhook (test mode)" \
  --confirm
```

The CLI prints the new endpoint object. Get the signing secret with:

```bash
# Replace WEBHOOK_ID with the id from the create response (we_...)
stripe webhook_endpoints retrieve WEBHOOK_ID --live  # for live
# Or
stripe webhook_endpoints retrieve WEBHOOK_ID         # for test
```

**Note:** the signing secret (`whsec_*`) is ONLY shown once at creation in the dashboard but the Stripe CLI's `retrieve` does not return it. So we MUST capture it from the `create` command's output (look for `secret` in the JSON response). If we missed it, the user has to roll the secret in the dashboard.

**If `stripe` CLI is not available, instruct the user manually:**

```
Stripe CLI not installed. Manual steps:

  1. Open https://dashboard.stripe.com/webhooks (use the live-mode toggle if launching for real)
  2. "Add an endpoint"
  3. Endpoint URL:   https://{convex_prod_site_url}/stripe/webhook
  4. Events:
       - checkout.session.completed
       - customer.subscription.updated
       - customer.subscription.deleted
  5. After creating, click the endpoint → "Signing secret" → "Reveal"
  6. Paste the whsec_... value here:
```

Once the user pastes (or the CLI prints) `whsec_*`, install it in **Convex prod env** (not Vercel — the webhook handler runs in Convex, that's where the secret is read):

```bash
pnpm exec convex env set --prod STRIPE_WEBHOOK_SECRET "{whsec_value}"
pnpm exec convex env list --prod | grep STRIPE_WEBHOOK_SECRET   # verify
```

No Vercel redeploy is needed — the change takes effect on the next webhook delivery.

### 2. OAuth callback URLs

Better Auth callback URLs are `https://{prod_domain}/api/auth/callback/{provider}`.

#### GitHub

If user chose option (B) in step 01 (new OAuth app for prod), the callback URL was already set during creation - skip.

If user chose option (A) (reuse), the callback URL on the existing app must be updated:

```
GitHub OAuth callback update:
  1. https://github.com/settings/developers
  2. Click your "{app_name}" OAuth App
  3. "Authorization callback URL":  https://{prod_domain}/api/auth/callback/github
  4. Save

Note: this breaks local dev OAuth. To keep dev working, create a SEPARATE OAuth App for dev with localhost callback.
```

#### Google

Google supports multiple authorized redirect URIs per client. ADD (don't replace) the prod URI:

```
Google OAuth callback - ADD prod URI:
  1. https://console.cloud.google.com/apis/credentials
  2. Click your OAuth client
  3. "Authorized redirect URIs" → "+ ADD URI"
  4. Add: https://{prod_domain}/api/auth/callback/google
  5. Save (do NOT remove the localhost URI)
```

If `{has_oauth_google}=false`, skip.

### 3. Resend domain verification

If `EMAIL_FROM` was set to `onboarding@resend.dev` in step 01, Resend will silently drop emails to non-test addresses. Verify the domain now:

```
Resend domain verification:
  1. https://resend.com/domains
  2. "Add Domain" → enter {prod_domain}
  3. Resend prints DNS records (TXT for verification, MX/CNAME for DKIM)
  4. Add the records to your DNS provider
       - If domain is on Cloudflare, dashboard → DNS → Records → Add
       - If domain is on Vercel DNS, run:
           vercel dns add {prod_domain} <name> <type> <value>
  5. Wait until status = "Verified" (typically 1-15 min)

Once verified, update EMAIL_FROM in Convex prod:
  pnpm exec convex env set --prod EMAIL_FROM "{App Name} <noreply@{prod_domain}>"
```

If user already has a verified Resend domain, skip - this was handled in step 01.

### 4. Smoke test

Run a basic end-to-end check:

```bash
# Homepage
curl -sIo /dev/null -w "homepage: %{http_code}\n" https://{prod_url}

# API auth handshake (Better Auth's session endpoint)
curl -sIo /dev/null -w "auth session: %{http_code}\n" https://{prod_url}/api/auth/get-session

# Convex prod backend health
curl -sIo /dev/null -w "convex http: %{http_code}\n" https://{convex_prod_site_url}/.well-known/openid-configuration
```

Expected:

- homepage: `200`
- auth session: `200` (returns `{"user":null,"session":null}` for unauthenticated)
- convex http: `200` or `404` (404 is fine if `.well-known` is not exposed - we just want a TCP/TLS handshake)

Then walk the user through the manual smoke checklist:

```
Manual smoke test - please verify:
  [ ] Open https://{prod_domain} - landing page loads
  [ ] Click "Sign up" → enter email → receive OTP/magic link in inbox (NOT spam)
  [ ] Click "Sign in with GitHub" → OAuth round-trip works (no callback error)
  [ ] Visit /pricing → click "Subscribe" → Stripe checkout opens with PROD product
  [ ] Complete a checkout (use test card 4242 if {stripe_mode}=test, or a real card if live)
  [ ] After payment, /orgs/{slug} shows the upgraded plan
  [ ] Stripe Dashboard → Webhooks → see checkout.session.completed delivered (200)
```

### 5. Post-launch reminders

```
Production is live. A few things to bookmark:

  - Vercel dashboard:  https://vercel.com/{vercel_team_slug}/{vercel_project_name}
  - Convex dashboard:  pnpm exec convex dashboard --prod
  - Stripe dashboard:  https://dashboard.stripe.com/webhooks
  - Logs (live):       vercel logs https://{prod_domain} --follow
  - Convex logs:       pnpm exec convex logs --prod

Future deploys: just `git push` to the production branch. Vercel auto-deploys, the build runs `pnpm exec convex deploy --cmd 'pnpm run build'` first, and your Convex backend stays in sync.

To ROLL BACK if something breaks:
  vercel rollback                          # interactive picker
  vercel rollback https://<prev-deployment>.vercel.app
```

## CONTEXT BOUNDARIES

<available_state>
From step 00-03:

- Production is deployed and reachable
- All env vars set EXCEPT possibly `STRIPE_WEBHOOK_SECRET` (not created until step 04.1)
  </available_state>

<produced_state>
After this step:

- `STRIPE_WEBHOOK_SECRET` set in Convex prod env (real value)
- OAuth callback URLs updated for GitHub and (optionally) Google
- Resend domain verified (if needed)
- Smoke test results visible to the user
  </produced_state>

## SUCCESS METRICS

✅ Stripe webhook endpoint exists for `https://{convex_prod_site_url}/stripe/webhook`
✅ A test webhook delivery returns 200 from the prod app
✅ Sign in / sign up works end-to-end with email and at least one OAuth provider
✅ Resend dashboard shows the prod domain as Verified
✅ User has bookmarked the dashboards / log commands

## FAILURE MODES

❌ Putting `STRIPE_WEBHOOK_SECRET` in Vercel instead of Convex prod env
❌ Creating the Stripe webhook in TEST mode when launching with LIVE keys (or vice versa)
❌ Replacing instead of ADDING the Google authorized redirect URI (breaks local dev)
❌ Leaving `EMAIL_FROM=onboarding@resend.dev` in prod after Resend domain is verified
❌ Skipping the manual smoke test - cloud env can be perfect and the app still broken end-to-end

## DONE

The workflow ends here. Print a final summary:

```
🎉 Production launch complete

  App:                  https://{prod_domain}
  Convex prod:          {convex_prod_deployment}
  Vercel project:       {vercel_team_slug}/{vercel_project_name}
  Stripe mode:          {stripe_mode}
  Webhook configured:   yes
  OAuth providers:      {list of configured}

Next time you `git push`, Vercel rebuilds and `pnpm exec convex deploy` syncs the backend automatically. No further setup needed.
```
