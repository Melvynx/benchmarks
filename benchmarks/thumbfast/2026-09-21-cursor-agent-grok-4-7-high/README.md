# Thumbfa.st

AI-powered YouTube thumbnail generator SaaS.

## Setup the project

Please follow the [NOW.TS Course](https://codeline.app/courses/clqn8pmte0001lr54itcjzl59/lessons/clqn8pz990003112iia11p7uo) to setup the project.

## Environment Variables Setup

Before running the application, you'll need to configure several environment variables. Copy the `.env-template` file to `.env` and fill in the required values:

```bash
cp .env-template .env
```

### Convex

Thumbfa.st uses Convex for application data and Better Auth storage.

```bash
pnpm convex:dev
```

Set the Convex URLs used by the app:

```bash
VITE_CONVEX_URL="https://..."
# Optional: inferred from VITE_CONVEX_URL when it is a *.convex.cloud URL.
VITE_CONVEX_SITE_URL="https://..."
CONVEX_DEPLOYMENT="dev:..."
CONVEX_DEPLOY_KEY="..."
```

### Redis (Required)

Redis is **required** for caching and provides ~90% performance improvement.

#### Option 1: Local Redis Installation

**macOS** (using Homebrew):

```bash
# Install Redis
brew install redis

# Start Redis server
brew services start redis

# Or run manually
redis-server
```

See the [official macOS installation guide](https://redis.io/docs/latest/operate/oss_and_stack/install/archive/install-redis/install-redis-on-mac-os/) for more details.

**Windows**:

Download and install Redis from the [official Windows guide](https://redis.io/docs/latest/operate/oss_and_stack/install/install-redis/install-redis-on-windows/).

**Linux**:

```bash
# Ubuntu/Debian
sudo apt-get install redis-server

# Start Redis
sudo systemctl start redis-server
```

After installation, add to your `.env`:

```bash
REDIS_URL=redis://localhost:6379
```

#### Option 2: Docker (Quick Setup)

```bash
# Start Redis with Docker
docker run -d -p 6379:6379 redis:alpine

# Add to .env
REDIS_URL=redis://localhost:6379
```

#### Option 3: Redis Cloud Services (Recommended for Production)

For production deployments, we recommend using a managed Redis service:

**Upstash** (Serverless Redis):

- Free tier: 10,000 commands/day
- Serverless with pay-per-use pricing
- Sign up at [console.upstash.com](https://console.upstash.com)
- Copy your Redis URL and add to `.env`

**Redis Cloud** (Official Redis):

- Free tier: 30MB RAM
- Managed by Redis Labs
- Sign up at [redis.com/try-free](https://redis.com/try-free/)
- Get your connection URL from the dashboard

**Railway**:

- $5/month for 512MB RAM
- Simple setup and deployment
- Go to [railway.app](https://railway.app) and deploy Redis

For detailed setup instructions for each provider, see the [Redis Setup Guide](./docs/redis-setup.md).

### Better-Auth

For [Better-Auth](https://www.better-auth.com/), we recommend starting with the GitHub provider. You can add more providers later.

By default, the template also includes Magic Link (requires Resend setup) and email/password authentication.

You'll need a `GITHUB_CLIENT_ID` and `GITHUB_CLIENT_SECRET` from [GitHub Developer Settings](https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/creating-an-oauth-app).

Configure these settings:

- `Authorization callback URL`: `http://localhost:3000/api/auth/callback/github`
- `Homepage URL`: `http://localhost:3000`

Then add to your `.env`:

```bash
GITHUB_CLIENT_ID="YOUR_GITHUB_ID"
GITHUB_CLIENT_SECRET="YOUR_GITHUB_SECRET"
```

Generate a `BETTER_AUTH_SECRET`:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

Copy the result and add it to your `.env`:

```bash
BETTER_AUTH_SECRET="YOUR_SECRET"
```

### Resend

Create a [Resend account](https://resend.com) and [create an API key](https://resend.com/api-keys). You'll also need to [configure a domain](https://resend.com/domains) - either your application's domain or any domain you own.

- [Tutorial for Resend API keys](https://resend.com/docs/dashboard/api-keys/introduction)
- [Tutorial for Resend domains](https://resend.com/docs/dashboard/domains/introduction)

Add the API key to your `.env`:

```bash
RESEND_API_KEY="YOUR_API_KEY"
EMAIL_FROM="contact@yourdomain.com"
NEXT_PUBLIC_EMAIL_CONTACT="your@email.com"
```

#### Resend Audience (Optional)

An audience allows you to send marketing emails to your users (e.g., product launch announcements, promotions).

The application works without an audience, but it's useful for sending bulk emails to your user base.

To create an audience:

1. Go to [Resend Audiences](https://resend.com/audiences)
2. Create a new audience
3. Copy the audience ID and add it to your `.env`:

```bash
RESEND_AUDIENCE_ID="YOUR_AUDIENCE_ID"
```

### Stripe

If you don't have a Stripe account yet, [create one](https://dashboard.stripe.com/register).

Follow [this documentation](https://stripe.com/docs/development/get-started) to get your **test** API keys.

Add them to your `.env`:

```bash
STRIPE_SECRET_KEY="sk_test_..."
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY="pk_test_..."
```

#### Stripe Webhooks

Stripe webhooks are handled by Convex at:

```text
https://<deployment>.convex.site/stripe/webhook
```

Create a Stripe webhook endpoint for that Convex URL and copy the signing
secret into Convex env:

```bash
STRIPE_WEBHOOK_SECRET="whsec_..."
```

### Uploadthing

[Uploadthing](https://uploadthing.com/) is a SaaS for managing images in your application.

Go to your [Uploadthing dashboard](https://uploadthing.com/dashboard/) and get a token:

```bash
UPLOADTHING_TOKEN='YOUR_TOKEN'
```

### Starting the Application

Once all environment variables are configured, install dependencies and start the development server:

```bash
pnpm install
pnpm dev
```

Test that everything works by:

- Logging in with GitHub
- Creating an account
- Verifying emails are sent
- Testing other features

## Caching

NOW.TS uses **Redis caching** to provide exceptional performance, reducing database queries by ~90% and middleware execution time from ~200-500ms to <20ms.

### Why Redis is Required

Without caching:

- Every page navigation hits the database 2-3 times
- Middleware validates sessions and organization membership repeatedly
- External Stripe API calls on every page load
- Slow response times and high database load

With Redis caching:

- 80-95% of requests served from cache
- Session validation cached for 5 minutes
- Organization lookups cached for 5 minutes
- Stripe subscription data cached for 1 hour
- **~90% performance improvement**

### Quick Setup

**For local development**:

```bash
# Start Redis with Docker
docker run -d -p 6379:6379 redis:alpine

# Add to .env.local
REDIS_URL=redis://localhost:6379
```

**For production** (recommended providers):

- **Railway**: $5/month - [Setup Guide](./docs/redis-setup.md#railway-recommended)
- **Redis Cloud**: Free tier available - [Setup Guide](./docs/redis-setup.md#redis-cloud-free-tier-available)
- **Upstash**: Pay-per-use - [Setup Guide](./docs/redis-setup.md#upstash-serverless-redis)

See [docs/redis-setup.md](./docs/redis-setup.md) for complete setup instructions.

### What's Cached

- **Session validation** (5 min TTL) - Better Auth cookie caching + Redis
- **Organization membership** (5 min TTL) - Middleware checks
- **User's organizations** (10 min TTL) - Organization list
- **Stripe subscriptions** (1 hour TTL) - Billing data

### Cache Invalidation

Caches are automatically invalidated when:

- User updates their profile
- Organization settings change
- Membership changes (add/remove members)
- Subscription updates via Stripe webhooks

### Performance Impact

Real-world metrics:

- Middleware execution: ~200-500ms → <20ms (**~90% faster**)
- Database queries per request: 2-3 → ~0.2 (**90% reduction**)
- Cache hit rate: 80-95% after warmup
- Page load improvement: 30-50% faster overall

## Contributions

Feel free to create a pull request with any changes you think valuable

x
