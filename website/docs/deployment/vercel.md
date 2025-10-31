# Vercel Deployment

Deploy the Next.js frontend to Vercel.

## Prerequisites

- Vercel account
- GitHub repository
- Environment variables ready

## Deployment

### Option 1: Vercel CLI

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel

# Set environment variables
vercel env add NEXT_PUBLIC_SUPABASE_URL
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY
# ... add all variables

# Deploy production
vercel --prod
```

### Option 2: GitHub Integration

1. Push to GitHub
2. Connect repo in Vercel dashboard
3. Add environment variables
4. Auto-deploys on push

## Environment Variables

Add in Vercel Dashboard → Settings → Environment Variables:

**Frontend** (safe to expose):
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

**All Environments**:
- `SUPABASE_SERVICE_ROLE_KEY`
- `LLM_API_KEY_OR_MOCK`
- `MODEL_NAME`
- `SIGNING_KEY`

## Build Configuration

Vercel auto-detects Next.js. No build config needed.

## Documentation Deployment

Documentation is built and served from `/docs`:

```json
{
  "buildCommand": "npm run build:all",
  "rewrites": [
    { "source": "/docs", "destination": "/docs/index.html" }
  ]
}
```

## Next Steps

- **[Worker Deployment](/docs/deployment/worker)** - Deploy worker process
- **[Database Setup](/docs/deployment/database)** - Set up database

