---
name: step-06-setup-convex-env
description: Strict step 5 - interactively collect env values and set them in Convex env
prev_step: steps/step-05-update-landing.md
next_step: steps/step-07-finalize.md
---

# Step 5: Configure Convex Env

## Mandatory Rules

- Configure backend runtime variables in Convex env only.
- Use `pnpm exec convex env set KEY "value"` for every provided value.
- Verify with `pnpm exec convex env list`.
- Do not write backend runtime secrets to `.env`, `.env.local`, or Vercel env.
- Cloudflare provisioning secrets are setup-only secrets. Save only `CLOUDFLARE_ACCOUNT_ID` and `CLOUDFLARE_API_TOKEN` in local `.env` when configuring R2, then let the R2 setup helper write app runtime R2 credentials into Convex env.
- Do not ask for every variable one by one. Ask by service group.
- If the user skips a service, record it in `{convex_env_skipped}` and continue.
- Cloudflare R2 is part of the standard NowStack backend setup. Always configure R2 with the Cloudflare API helper and never mark R2 as not applicable because the brief does not mention uploads.

## Gate

Start only if Step 4 is complete.

Before asking env values, read `INIT_CHECKLIST.md` and verify:

- `[x] Step 4 complete`
- `Current step: 5`

Update `INIT_CHECKLIST.md` when starting:

- Check `[x] Step 5 started`.

For each service group, ask for `KEY=value` lines or `skip`, then STOP until the user answers. Do not ask multiple service groups in one message unless the user explicitly asks to configure everything at once.

## Required Explanation

Before asking for values, explain:

```text
Backend runtime secrets for this project live in Convex env, not in local env files. I will set provided runtime values with `pnpm exec convex env set KEY value` and verify them with `pnpm exec convex env list`.

Cloudflare R2 is special: the Cloudflare API token is a local setup/provisioning token, so I will save only `CLOUDFLARE_ACCOUNT_ID` and `CLOUDFLARE_API_TOKEN` in `.env`, then use the Cloudflare API to create the bucket and create bucket-scoped S3-compatible R2 credentials. Those app runtime credentials go to Convex env.
```

## Service Groups

Ask interactively for each group. The user can paste `KEY=value` lines or say `skip`.

Process groups strictly in this order:

1. Base/Auth
2. Email
3. Stripe
4. Files / Cloudflare R2

After each group is handled, verify with `pnpm exec convex env list`, update `{convex_env_configured}` / `{convex_env_skipped}`, and ask the next group.

Also update `INIT_CHECKLIST.md` after each group:

- Base/Auth handled -> check `[x] Base/Auth env handled`.
- Email handled -> check `[x] Email env handled`.
- Stripe handled -> check `[x] Stripe env handled`.
- Files/R2 provisioning token collected or manual credentials chosen -> check `[x] Cloudflare R2 provisioning token collected or manual credentials chosen`.
- R2 bucket created or reused -> check `[x] Cloudflare R2 bucket created or reused`.
- R2 custom domain attached or r2.dev fallback selected -> check `[x] Cloudflare R2 custom domain attached or r2.dev fallback recorded`.
- R2 S3 credentials created or provided -> check `[x] Cloudflare R2 S3 credentials created or provided`.
- Files/R2 handled -> check `[x] Files/R2 env handled`.

### Base/Auth

Variables:

- `SITE_URL`
- `BETTER_AUTH_SECRET`
- `BETTER_AUTH_TRUSTED_ORIGINS` or `TRUSTED_ORIGINS`
- `GITHUB_CLIENT_ID`
- `GITHUB_CLIENT_SECRET`
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`

Default only when missing and safe:

```bash
pnpm exec convex env set SITE_URL "http://localhost:3000"
```

If `BETTER_AUTH_SECRET` is missing and the user wants automatic generation:

```bash
pnpm exec convex env set BETTER_AUTH_SECRET "$(openssl rand -base64 32)"
```

### Email

Variables:

- `RESEND_API_KEY`
- `EMAIL_FROM`
- `EMAIL_CONTACT`

Do not invent a sender domain. If there is no verified sender, skip and list it in the final summary.

### Stripe

Variables:

- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `STRIPE_PRO_PLAN_ID`
- `STRIPE_PRO_YEARLY_PLAN_ID`
- `STRIPE_ULTRA_PLAN_ID`
- `STRIPE_ULTRA_YEARLY_PLAN_ID`

If `STRIPE_SECRET_KEY` is provided, register `https://<deployment>.convex.site/stripe/webhook` in Stripe and store the signing secret in Convex env as `STRIPE_WEBHOOK_SECRET`.

Verify the Stripe env values:

```bash
pnpm exec convex env list | rg 'STRIPE_WEBHOOK_SECRET|STRIPE_SECRET_KEY'
```

### Files / Cloudflare R2

Always ask this group. Do not treat it as not applicable when the product brief does not mention uploads. R2 remains required because it is the only supported file backend and should be present for the standard NowStack setup.

Do not ask the user to manually create the bucket or manually create S3 access keys. Ask for the Cloudflare provisioning token and account id, then run the setup helper.

For the public file URL, prefer a custom Cloudflare domain when the product domain is available:

1. If the user provided a custom file domain, use it exactly, such as `r2.example.com`.
2. Otherwise derive `r2.{SiteConfig.domain}`, such as `r2.example.com`.
3. If Cloudflare cannot find/attach that zone, fall back to the managed `r2.dev` URL.

Explain the least-privilege token rule:

```text
For NowStack uploads/downloads through Cloudflare R2, use R2 Full Access unless you are also deploying Workers. The required Cloudflare permission is `workers_r2` edit. Do not request Workers Scripts, KV, DNS, or broad account permissions for normal R2 upload setup.

If you want me to create the bucket-scoped S3 token and try `r2.<your-domain>` automatically, use the NowStack R2 Provisioning token. It adds `account_api_tokens` edit for token creation, `zone` read for custom-domain zone discovery, and `dns` edit because Cloudflare adds the DNS record when connecting an R2 custom domain.
```

Use this default token link when the user only needs R2 provisioning and can paste or manually create S3 keys:

```text
https://dash.cloudflare.com/?to=/:account/api-tokens&permissionGroupKeys=%5B%7B%22key%22%3A%22workers_r2%22%2C%22type%22%3A%22edit%22%7D%5D&name=R2%20Full%20Access
```

Use this provisioning token link when the agent should create the bucket, create the bucket-scoped S3-compatible access token automatically, and try the `r2.<domain>` custom domain before falling back to `r2.dev`:

```text
https://dash.cloudflare.com/?to=/:account/api-tokens&permissionGroupKeys=%5B%7B%22key%22%3A%22workers_r2%22%2C%22type%22%3A%22edit%22%7D%2C%7B%22key%22%3A%22account_api_tokens%22%2C%22type%22%3A%22edit%22%7D%2C%7B%22key%22%3A%22zone%22%2C%22type%22%3A%22read%22%7D%2C%7B%22key%22%3A%22dns%22%2C%22type%22%3A%22edit%22%7D%5D&name=NowStack%20R2%20Provisioning
```

Ask for these setup values:

- `CLOUDFLARE_ACCOUNT_ID`
- `CLOUDFLARE_API_TOKEN`
- optional `CLOUDFLARE_ZONE_ID` when the user already knows the zone id
- optional `R2_S3_BUCKET_NAME` (default: `{app_id}`)
- optional `R2_CUSTOM_DOMAIN` if the user wants an exact custom domain instead of `r2.{SiteConfig.domain}`
- optional `R2_URL` only if the user already has a public R2 URL and does not want this helper to attach a custom domain

When the user provides the values, save only Cloudflare setup values (`CLOUDFLARE_ACCOUNT_ID`, `CLOUDFLARE_API_TOKEN`, optional `CLOUDFLARE_ZONE_ID`) in local `.env`. Do not commit `.env`; it is ignored.

Then run:

```bash
node .agents/skills/init-project/scripts/setup-cloudflare-r2.mjs --bucket "{app_id}" --save-cloudflare-env
```

If the user provided an exact custom file domain, pass it explicitly:

```bash
node .agents/skills/init-project/scripts/setup-cloudflare-r2.mjs --bucket "{app_id}" --custom-domain "r2.example.com" --save-cloudflare-env
```

If the user provided a base domain and it differs from `SiteConfig.domain`, pass it explicitly:

```bash
node .agents/skills/init-project/scripts/setup-cloudflare-r2.mjs --bucket "{app_id}" --domain "example.com" --save-cloudflare-env
```

The helper must:

- create or reuse the R2 bucket through Cloudflare API `POST /accounts/{account_id}/r2/buckets`;
- attach `r2.{domain}` as the bucket custom domain when Cloudflare can resolve the zone;
- enable the managed `r2.dev` URL only when no custom `R2_URL` is provided and the custom domain cannot be attached;
- create a bucket-scoped read/write R2 API token through Cloudflare API;
- derive S3-compatible credentials from the token response (`Access Key ID = token id`, `Secret Access Key = SHA-256(token value)`);
- write these runtime env vars into Convex env:

- `R2_S3_URL`
- `R2_S3_ACCESS_KEY_ID`
- `R2_S3_SECRET_ACCESS_KEY`
- `R2_S3_BUCKET_NAME`
- `R2_URL`

Verify:

```bash
pnpm exec convex env list | rg 'R2_S3_URL|R2_S3_ACCESS_KEY_ID|R2_S3_SECRET_ACCESS_KEY|R2_S3_BUCKET_NAME|R2_URL'
```

If the helper fails with missing token-management permission, ask the user to regenerate the token with the provisioning link above. If the user refuses that broader setup token, stop automatic token creation and ask them to paste manually created R2 S3 credentials from the R2 dashboard.

Update `INIT_CHECKLIST.md`:

- Fill `Cloudflare R2 bucket` with the bucket name.
- Fill `Cloudflare R2 token mode` with `provisioned` when the helper created the bucket-scoped token, or `manual_credentials` if the user chose to paste S3 credentials.
- Fill `Cloudflare R2 public URL mode` with `custom_domain`, `r2_dev`, or `explicit`.
- Check the Cloudflare R2 boxes listed above.

## Setting Values

For pasted `KEY=value` lines, set each one:

```bash
pnpm exec convex env set KEY "value"
```

Then verify:

```bash
pnpm exec convex env list
```

Store successfully written keys in `{convex_env_configured}`.

When all applicable groups are configured or skipped, declare:

Before loading Step 6, update `INIT_CHECKLIST.md`:

- Check `[x] Convex env list verified`.
- Check `[x] Step 5 complete`.
- Set `Current step` to `6`.
- Set `Waiting for` to `none`.

```text
INIT STATE: step=6; waiting_for=none; completed=repo_bootstrapped,convex_checked,identity_set,project_brief_received,claude_updated,config_updated,theme_step_complete,landing_updated,convex_env_done
```

Then load `./step-07-finalize.md`.
