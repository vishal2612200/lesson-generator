# Environment Variables

Production environment configuration.

## Required Variables

### Supabase

```bash
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...  # Worker only
```

### OpenAI

```bash
LLM_API_KEY_OR_MOCK=sk-xxx...
MODEL_NAME=gpt-4o-mini  # or gpt-4o
```

### Security

```bash
SIGNING_KEY=your-random-secret
```

## Optional Variables

### API Path Configuration (Frontend/API)

These variables affect the API path (`POST /api/lessons`):

```bash
# Default generation strategy (API path only)
DEFAULT_GENERATION_STRATEGY=single

# Enable intelligent routing between strategies (API path only)
ENABLE_HYBRID_ROUTING=true

# Complexity threshold for multi-agent (0-100, API path only)
COMPLEXITY_THRESHOLD=70
```

### Worker Path Configuration

These variables affect the worker path (background processing):

```bash
# Generation mode for worker
MODE=  # blank = multi-agent (default), legacy = uses generateLessonHybrid()

# Enable planner agent (part of multi-agent system)
ENABLE_MULTI_AGENT_PLANNER=true
```

### Common Configuration

```bash
# Log level (applies to both paths)
LOG_LEVEL=info
```

**Note**: The API path always calls `generateLessonHybrid()` which uses `DEFAULT_GENERATION_STRATEGY`, `ENABLE_HYBRID_ROUTING`, and `COMPLEXITY_THRESHOLD` for routing. The worker path uses `MODE` for routing instead.

## Setting Variables

### Vercel

1. Dashboard → **Settings** → **Environment Variables**
2. Add each variable
3. Select environments (Production, Preview, Development)

### Railway

```bash
railway variables set KEY=value
```

### Render

Dashboard → **Environment** → Add variables

### Heroku

```bash
heroku config:set KEY=value
```

## Security

- Never commit secrets
- Use different keys per environment
- Rotate keys regularly
- Monitor usage

## Next Steps

- **[Vercel](/docs/deployment/vercel)** - Frontend deployment
- **[Worker](/docs/deployment/worker)** - Worker deployment

