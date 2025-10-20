# Setup & Deployment Guide

**Target Audience**: Engineers setting up the system for the first time  
**Time to Complete**: 30-45 minutes

---

## Prerequisites

- **Node.js** 18+ and npm
- **Git** for version control
- **Supabase account** (free tier works)
- **OpenAI API key** ($5 credit recommended)
- **Vercel account** (optional, for deployment)

---

## Local Development Setup

### 1. Clone & Install

```bash
git clone <repo-url>
cd lesson_generator
npm install
```

### 2. Supabase Setup

#### Create Project
1. Go to [supabase.com](https://supabase.com)
2. Create new project
3. Wait 2-3 minutes for provisioning
4. Copy credentials from Settings → API

#### Run Migrations
```bash
# Install Supabase CLI
npm install -g supabase

# Link project
supabase link --project-ref <your-project-ref>

# Run migrations
npx supabase db push

# Verify tables created
npx supabase db diff
```

Expected tables:
- `lessons`
- `lesson_contents`
- `lesson_components`
- `traces`

### 3. Environment Configuration

```bash
cp env.txt .env
```

Edit `.env`:

```bash
# Supabase (from Settings → API)
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...  # Settings → API → service_role

# OpenAI
LLM_API_KEY_OR_MOCK=sk-xxx...  # or "MOCK" for testing
MODEL_NAME=gpt-4o              # or gpt-4o-mini for cheaper

# Security (generate random string)
SIGNING_KEY=$(openssl rand -base64 32)

# Optional
MODE=              # blank = components, "legacy" = blocks
LOG_LEVEL=info     # debug|info|warn|error
```

### 4. Start Services

```bash
# Terminal 1: Next.js dev server
npm run dev

# Terminal 2: Worker process
npm run worker
```

Visit http://localhost:3000

### 5. Test Generation

1. Enter outline: "A quiz on counting from 1 to 10"
2. Click "Generate Lesson"
3. Watch status change: queued → generating → generated
4. Click lesson to view

**Expected time**: 30-60 seconds for component-based lessons

---

## MOCK Mode (No API Costs)

For testing without OpenAI charges:

```bash
# .env
LLM_API_KEY_OR_MOCK=MOCK
```

**Behavior**:
- Worker returns placeholder TypeScript
- Instant generation (~1s)
- Content is generic but structurally valid
- Useful for: UI testing, CI/CD, development

---

## Production Deployment

### Option 1: Vercel (Recommended for Frontend)

#### Deploy Frontend

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel

# Set environment variables
vercel env add NEXT_PUBLIC_SUPABASE_URL
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY
vercel env add SUPABASE_SERVICE_ROLE_KEY
vercel env add LLM_API_KEY_OR_MOCK
vercel env add MODEL_NAME
vercel env add SIGNING_KEY

# Deploy production
vercel --prod
```

Or use GitHub integration:
1. Push to GitHub
2. Connect repo in Vercel dashboard
3. Add environment variables
4. Auto-deploys on push

### Option 2: Railway (Recommended for Worker)

#### Deploy Worker

```bash
# Install Railway CLI
npm i -g railway

# Login
railway login

# Initialize
railway init

# Add environment variables
railway variables set SUPABASE_SERVICE_ROLE_KEY=xxx
railway variables set LLM_API_KEY_OR_MOCK=sk-xxx
railway variables set MODEL_NAME=gpt-4o-mini
railway variables set NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
railway variables set NEXT_PUBLIC_SUPABASE_ANON_KEY=xxx

# Deploy
railway up
```

Configure start command in `railway.toml`:
```toml
[build]
builder = "NIXPACKS"

[deploy]
startCommand = "npm run worker"
restartPolicyType = "ON_FAILURE"
restartPolicyMaxRetries = 10
```

### Option 3: Render (Alternative)

Create `render.yaml`:
```yaml
services:
  - type: worker
    name: lesson-worker
    env: node
    buildCommand: npm install
    startCommand: npm run worker
    envVars:
      - key: SUPABASE_SERVICE_ROLE_KEY
        sync: false
      - key: LLM_API_KEY_OR_MOCK
        sync: false
      - key: MODEL_NAME
        value: gpt-4o-mini
      - key: NEXT_PUBLIC_SUPABASE_URL
        sync: false
      - key: NEXT_PUBLIC_SUPABASE_ANON_KEY
        sync: false
```

Deploy: `git push` to connected repo

### Option 4: Heroku

```bash
# Create app
heroku create lesson-worker

# Add buildpack
heroku buildpacks:add heroku/nodejs

# Set environment variables
heroku config:set SUPABASE_SERVICE_ROLE_KEY=xxx
heroku config:set LLM_API_KEY_OR_MOCK=sk-xxx
heroku config:set MODEL_NAME=gpt-4o-mini
heroku config:set NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
heroku config:set NEXT_PUBLIC_SUPABASE_ANON_KEY=xxx

# Update Procfile
echo "worker: npm run worker" > Procfile

# Deploy
git push heroku main

# Scale worker
heroku ps:scale worker=1
```

---

## Troubleshooting

### Worker Not Picking Up Jobs

**Symptoms**: Lessons stuck in "queued" status

**Debug**:
```bash
# Check worker logs
tail -f /tmp/worker.log

# Verify worker is running
ps aux | grep "tsx src/worker/cli.ts"

# Check database connection
npx supabase db ping
```

**Common Fixes**:
1. Restart worker: `pkill -f cli.ts && npm run worker`
2. Verify `SUPABASE_SERVICE_ROLE_KEY` is set
3. Check Supabase project is active (not paused)
4. Ensure `outline` column is included in select query

### Compilation Errors

**Symptoms**: Lessons stuck in "generating", then "failed"

**Debug**:
```sql
-- Check traces table
SELECT stage, metadata->>'error'
FROM traces
WHERE lesson_id = 'xxx'
ORDER BY created_at DESC;
```

**Common Issues**:
- LLM generating imports (should be inline)
- Using forbidden APIs (fetch, document, eval)
- TypeScript syntax errors

**Fix**: Check `safety.ts` patterns, update author agent prompt

### Rate Limiting (429 Errors)

**Symptoms**: "Rate limit exceeded" in logs

**Built-in Handling**:
- Auto-retry with exponential backoff (1s, 2s, 4s)
- Sequential processing (one job at a time)
- 8s delay between lessons

**Manual Override**:
```typescript
// src/worker/llm.ts
const MAX_RETRIES = 5;  // Increase
const BASE_DELAY = 2000;  // Longer initial delay
```

### UI Not Updating

**Symptoms**: Generated lesson doesn't appear

**Debug**:
```bash
# Check lesson status
curl http://localhost:3000/api/lessons/<id>

# Verify content saved
SELECT typescript_source IS NOT NULL
FROM lesson_contents
WHERE lesson_id = 'xxx';
```

**Common Fixes**:
1. Hard refresh browser (Cmd+Shift+R)
2. Check `lesson_contents` table has data
3. Verify API route returns content
4. Check browser console for errors

### Tailwind Styles Not Applied

**Symptoms**: Component renders but looks unstyled

**Fix**: Restart dev server after changing `tailwind.config.js`
```bash
pkill -f "next dev" && npm run dev
```

**Verify safelist**:
```javascript
// tailwind.config.js
safelist: [
  'p-2', 'p-4', 'bg-blue-500', 'text-white', ...
]
```

---

## Testing

### Run Tests

```bash
# All tests
npm test

# Watch mode (for development)
npm test -- --watch

# Specific test file
npm test componentKit/compiler.test.ts

# Coverage report
npm test -- --coverage
```

### Integration Test

Tests full flow: create lesson → worker processes → verify generated

```bash
npm test integration.test.ts
```

### Stress Test

Generates 5 lessons concurrently (uses MOCK mode):

```bash
npm test stress.test.ts
```

---

## Monitoring Production

### Key Metrics

1. **Generation Success Rate**
   ```sql
   SELECT 
     status,
     COUNT(*) as count,
     ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER(), 2) as percentage
   FROM lessons
   WHERE created_at > NOW() - INTERVAL '24 hours'
   GROUP BY status;
   ```

2. **Average Generation Time**
   ```sql
   SELECT 
     AVG(EXTRACT(EPOCH FROM (updated_at - created_at))) as avg_seconds
   FROM lessons
   WHERE status = 'generated'
     AND created_at > NOW() - INTERVAL '24 hours';
   ```

3. **Error Rates by Stage**
   ```sql
   SELECT 
     stage,
     COUNT(*) as error_count
   FROM traces
   WHERE metadata->>'error' IS NOT NULL
     AND created_at > NOW() - INTERVAL '24 hours'
   GROUP BY stage
   ORDER BY error_count DESC;
   ```

### Logging

Worker uses structured JSON logging:

```bash
# View all logs
tail -100 /tmp/worker.log

# Filter by level
grep '"level":"ERROR"' /tmp/worker.log

# Filter by lesson ID
grep '"lessonId":"abc-123"' /tmp/worker.log | jq .

# View only errors
grep -E '(ERROR|FATAL)' /tmp/worker.log | jq .
```

### Alerts (Setup in Production)

1. **High Failure Rate**: Alert if >10% failures in 1 hour
2. **Slow Generation**: Alert if avg time >120s
3. **Worker Down**: Alert if no successful generation in 10 minutes
4. **Rate Limiting**: Alert on 429 errors (approaching quota)

---

## Scaling Considerations

### Single Worker (Current)

- **Throughput**: ~30-60 lessons/hour
- **Cost**: $0.50-1.00/hour in LLM costs
- **Suitable for**: &lt;1000 lessons/day

### Multiple Workers (Future)

Would require:
1. Distributed locking (Redis/PostgreSQL advisory locks)
2. Worker coordination
3. Job queue (BullMQ, Celery, etc.)

**Not implemented yet** - current atomic CAS is sufficient for moderate load.

### Database Scaling

- Free tier: 500MB, 2 connections
- Pro tier: Unlimited connections, connection pooling
- Consider: Periodic cleanup of old traces

```sql
-- Archive old traces (keep 30 days)
DELETE FROM traces 
WHERE created_at < NOW() - INTERVAL '30 days';
```

---

## Cost Estimation

### OpenAI API Costs

**gpt-4o-mini** (recommended):
- Input: $0.15 / 1M tokens
- Output: $0.60 / 1M tokens
- Average lesson: 3K input + 1K output = $0.001

**gpt-4o** (higher quality):
- Input: $2.50 / 1M tokens
- Output: $10.00 / 1M tokens
- Average lesson: 3K input + 1K output = $0.018

### Infrastructure Costs

- **Vercel**: Free tier (hobby), or $20/month (pro)
- **Railway**: $5/month (dev), $20/month (prod)
- **Supabase**: Free tier (2 orgs), or $25/month (pro)

**Total monthly cost** (1000 lessons):
- Development: $0 (all free tiers)
- Production: $50-70/month + LLM costs

---

## Security Checklist

- [ ] Rotate `SIGNING_KEY` regularly
- [ ] Use environment variables (never commit keys)
- [ ] Enable Supabase RLS for user-facing tables
- [ ] Rate limit API endpoints
- [ ] Validate user input (sanitize outlines)
- [ ] Review generated content before publishing
- [ ] Monitor for malicious prompts
- [ ] Set up Supabase auth (if multi-tenant)
- [ ] Use HTTPS in production
- [ ] Implement CORS policies

---

## Maintenance Tasks

### Weekly
- Review error logs
- Check success rates
- Monitor costs

### Monthly
- Update dependencies: `npm update`
- Review and archive old traces
- Backup database
- Review OpenAI usage dashboard

### Quarterly
- Security audit (dependency vulnerabilities)
- Performance optimization
- Prompt engineering improvements
- User feedback analysis

---

## Quick Reference

```bash
# Development
npm run dev          # Start Next.js (port 3000)
npm run worker       # Start worker
npm test            # Run tests

# Database
npx supabase db push         # Run migrations
npx supabase db reset        # Reset local DB
npx supabase db diff         # Show schema changes

# Production
vercel --prod               # Deploy frontend
railway up                  # Deploy worker
heroku logs --tail          # View worker logs

# Debugging
tail -f /tmp/worker.log              # Worker logs
curl http://localhost:3000/api/lessons  # Test API
psql $DATABASE_URL                   # Direct DB access
```

---

## Support Resources

- **Architecture**: [ARCHITECTURE.md](./ARCHITECTURE.md)
- **Issues**: Create GitHub issue with logs and reproduction steps

