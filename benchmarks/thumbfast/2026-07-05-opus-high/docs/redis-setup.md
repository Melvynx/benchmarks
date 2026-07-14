# Redis Setup Guide

Redis is **required** for now.ts to cache session validation and organization data, providing ~90% performance improvement.

## Quick Start

The fastest way to get started is with **Railway** (recommended for production) or **Docker** (for local development).

### Railway (Recommended for Production)

1. Go to [railway.app](https://railway.app) and sign in
2. Click "New Project" → "Deploy Redis"
3. Once deployed, go to your Redis service
4. Click "Variables" tab and copy the `REDIS_URL`
5. Add to your `.env`:
   ```bash
   REDIS_URL=redis://default:password@host.railway.app:port
   ```

**Pricing**: $5/month for 512MB RAM

### Local Development (Docker)

```bash
# Start Redis locally
docker run -d -p 6379:6379 redis:alpine

# Add to .env.local
REDIS_URL=redis://localhost:6379
```

---

## Provider Options

### 1. Railway (Recommended)

**Best for**: Production deployments, Next.js hosting

**Setup**:

1. Create account at [railway.app](https://railway.app)
2. New Project → Deploy Redis
3. Copy connection URL from Variables tab
4. Add to environment variables

**Connection URL format**:

```bash
REDIS_URL=redis://default:YOUR_PASSWORD@YOUR_HOST.railway.app:PORT
```

**Pricing**:

- $5/month base
- 512MB RAM included
- Additional usage billed

**Pros**:

- Simple setup
- Automatic backups
- Integrated with Railway hosting
- Good performance

**Cons**:

- Requires Railway account
- Fixed monthly cost

---

### 2. Redis Cloud (Free Tier Available)

**Best for**: Getting started, small projects

**Setup**:

1. Go to [redis.com/try-free](https://redis.com/try-free/)
2. Create account and new database
3. Choose "Redis Stack" or "Redis"
4. Copy connection details from database page
5. Construct connection URL

**Connection URL format**:

```bash
REDIS_URL=redis://default:YOUR_PASSWORD@redis-12345.c123.region.cloud.redislabs.com:12345
```

**Pricing**:

- **Free tier**: 30MB RAM, 30 connections
- Paid plans start at $10/month

**Pros**:

- Free tier available
- Managed by Redis Labs (official)
- Global replication options
- High availability

**Cons**:

- Free tier is limited (30MB)
- More complex dashboard

---

### 3. Upstash (Serverless Redis)

**Best for**: Serverless deployments, pay-per-request model

**Setup**:

1. Go to [console.upstash.com](https://console.upstash.com)
2. Create database
3. Choose region close to your deployment
4. Copy **native Redis connection URL** (not REST API)
5. Add to environment variables

**Connection URL format**:

```bash
REDIS_URL=redis://default:YOUR_TOKEN@YOUR_HOST.upstash.io:PORT
```

**Pricing**:

- Free tier: 10,000 commands/day
- Pay-per-request: $0.20 per 100K commands

**Pros**:

- True serverless (pay-per-use)
- Global replication
- REST API available
- Free tier generous

**Cons**:

- Costs can be unpredictable with high traffic
- Slightly higher latency than dedicated Redis

---

### 4. Self-Hosted (Advanced)

**Best for**: Full control, existing infrastructure

**Docker Compose**:

```yaml
version: "3.8"
services:
  redis:
    image: redis:alpine
    ports:
      - "6379:6379"
    volumes:
      - redis-data:/data
    command: redis-server --appendonly yes

volumes:
  redis-data:
```

**Connection URL**:

```bash
REDIS_URL=redis://localhost:6379
```

**Production considerations**:

- Set up Redis persistence (AOF or RDB)
- Configure password: `redis-server --requirepass YOUR_PASSWORD`
- Enable TLS for production
- Set up monitoring and alerts
- Consider Redis Cluster for high availability

---

## Environment Variables

Add to your `.env` file:

```bash
# Redis (Required)
REDIS_URL="redis://default:password@host:port"
```

### Connection String Formats

**Standard Redis**:

```bash
redis://default:password@host:port
```

**With database number**:

```bash
redis://default:password@host:port/0
```

**With TLS**:

```bash
rediss://default:password@host:port
```

---

## Verification

### Check Connection

After setting up Redis, verify the connection:

```bash
# Start your dev server
pnpm dev
```

You should see in the console:

```
[Redis] Connected successfully
```

### Test Cache Functionality

1. Navigate to any organization page: `/orgs/your-org`
2. Refresh the page
3. Check Redis keys:

```bash
# If using local Redis
redis-cli KEYS "*"

# You should see keys like:
# org:your-slug:member:user-id
# session:session-id
```

---

## Common Issues

### Connection Refused

**Error**: `ECONNREFUSED` or `Connection refused`

**Solution**:

- Verify `REDIS_URL` is correct
- Check Redis server is running
- For Docker: ensure port 6379 is exposed
- For Railway/Cloud: verify connection URL hasn't changed

### Authentication Failed

**Error**: `NOAUTH Authentication required` or `ERR invalid password`

**Solution**:

- Ensure password is included in connection URL
- Format: `redis://default:YOUR_PASSWORD@host:port`
- Check for special characters in password (may need URL encoding)

### Timeout Errors

**Error**: Connection timeout

**Solution**:

- Check network/firewall settings
- For cloud providers: verify IP whitelist
- Try increasing timeout in `src/lib/redis.ts`

### SSL/TLS Issues

**Error**: `SSL routines` or certificate errors

**Solution**:

- Use `rediss://` (with double 's') for TLS connections
- Add `tls: { rejectUnauthorized: false }` in redis.ts for development
- For production, use proper SSL certificates

---

## Performance Monitoring

### Check Cache Hit Rate

Monitor Redis performance with:

```bash
# For local Redis
redis-cli INFO stats
```

Look for:

- `keyspace_hits`: Number of successful cache hits
- `keyspace_misses`: Number of cache misses
- **Hit rate**: `hits / (hits + misses) * 100%`

**Target**: 80-95% hit rate after warmup period

### Memory Usage

```bash
redis-cli INFO memory
```

**Expected usage for typical SaaS**:

- Small (<1000 users): 10-50MB
- Medium (1000-10000 users): 50-200MB
- Large (>10000 users): 200MB-1GB

---

## Production Checklist

Before deploying to production:

- [ ] Redis URL added to production environment variables
- [ ] Connection uses TLS (`rediss://`) if supported by provider
- [ ] Password is strong and secure
- [ ] Firewall rules configured (if self-hosted)
- [ ] Monitoring set up for connection issues
- [ ] Backup strategy in place (for critical data)
- [ ] Max memory policy configured (`maxmemory-policy allkeys-lru`)
- [ ] Connection pooling limits appropriate for your traffic

---

## Migration from Development to Production

### Step 1: Choose Production Provider

- Railway for simplicity
- Redis Cloud for managed service
- Upstash for serverless

### Step 2: Create Production Redis Instance

Follow provider-specific setup above

### Step 3: Update Environment Variables

```bash
# In Vercel/Railway/Render dashboard
REDIS_URL=redis://default:password@prod-host:port
```

### Step 4: Deploy and Verify

- Deploy updated code
- Check logs for "[Redis] Connected successfully"
- Monitor cache hit rates
- Verify performance improvements

---

## Cost Comparison

| Provider        | Free Tier           | Paid Tier       | Best For                         |
| --------------- | ------------------- | --------------- | -------------------------------- |
| **Railway**     | None                | $5/mo (512MB)   | Production, all-in-one hosting   |
| **Redis Cloud** | 30MB free           | $10/mo (1GB)    | Getting started, managed service |
| **Upstash**     | 10K cmds/day        | $0.20/100K cmds | Serverless, variable traffic     |
| **Self-hosted** | Infrastructure cost | Server costs    | Full control, existing infra     |

**Recommendation**:

- Development: Local Docker (free)
- Small production: Redis Cloud free tier
- Medium/Large production: Railway or Redis Cloud paid
- Enterprise: Self-hosted or Redis Enterprise

---

## Troubleshooting

### App won't start

**Symptom**: Error message "REDIS_URL environment variable is required"

**Fix**: Add `REDIS_URL` to your `.env` file

### Cache not working

**Symptom**: Performance not improved, no cache keys in Redis

**Fix**:

1. Verify Redis connection: Check startup logs
2. Test manually: `redis-cli PING` should return `PONG`
3. Check cache implementation: Look for cache errors in logs

### Development vs Production

**Issue**: Works locally but not in production

**Fix**:

- Ensure `REDIS_URL` is set in production environment
- Verify connection string format matches provider
- Check for TLS requirements (`rediss://` vs `redis://`)
- Review provider-specific firewall/IP rules

---

## Support

- Redis documentation: [redis.io/documentation](https://redis.io/documentation)
- ioredis (our client): [github.com/redis/ioredis](https://github.com/redis/ioredis)
- Railway support: [help.railway.app](https://help.railway.app)
- Redis Cloud support: Contact through Redis Cloud dashboard

For now.ts specific issues, check the main README or open an issue on GitHub.
