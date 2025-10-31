# Deployment Overview

Production deployment architecture for AI Lesson Generator.

## Architecture

```
┌─────────────┐
│   Vercel    │ ── Frontend (Next.js)
└──────┬──────┘
       │
       ↓
┌─────────────┐
│  Supabase   │ ── Database & Realtime
└──────┬──────┘
       │
       ↓
┌─────────────┐
│  Railway/   │ ── Worker Process
│  Render     │
└─────────────┘
```

## Components

### Frontend (Vercel)

- Next.js application
- API routes
- Static assets
- Environment variables

### Database (Supabase)

- PostgreSQL database
- Realtime subscriptions
- Row Level Security
- Migrations

### Worker (Railway/Render/Heroku)

- Background processing
- Lesson generation
- LLM integration
- Continuous running

## Deployment Steps

1. **Deploy Frontend** - [Vercel Deployment](/docs/deployment/vercel)
2. **Set Up Database** - [Database Setup](/docs/deployment/database)
3. **Deploy Worker** - [Worker Deployment](/docs/deployment/worker)
4. **Configure Environment** - [Environment Variables](/docs/deployment/environment-variables)

## Next Steps

- **[Vercel](/docs/deployment/vercel)** - Frontend deployment
- **[Worker](/docs/deployment/worker)** - Worker deployment
- **[Database](/docs/deployment/database)** - Database setup

