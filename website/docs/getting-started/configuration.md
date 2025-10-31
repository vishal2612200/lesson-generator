# Configuration

Complete guide to environment variables and configuration options.

## Required Environment Variables

### Supabase Configuration

```bash
# Frontend - Public URL (safe to expose)
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co

# Frontend - Anon Key (safe to expose, has RLS restrictions)
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Backend - Service Role Key (NEVER expose, bypasses RLS)
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Where to find**:
- Go to Supabase Dashboard → **Settings** → **API**
- Project URL → `NEXT_PUBLIC_SUPABASE_URL`
- Anon Public Key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- Service Role Key → `SUPABASE_SERVICE_ROLE_KEY` (scroll down)

**Important**: The Service Role Key bypasses Row Level Security. Never commit it to version control or expose it in client-side code.

### OpenAI Configuration

```bash
# Your OpenAI API key (or "MOCK" for testing)
LLM_API_KEY_OR_MOCK=sk-xxx...

# Model to use for generation
MODEL_NAME=gpt-4o  # or gpt-4o-mini
```

**Model Options**:
- `gpt-4o` - Highest quality, ~$0.01-0.03 per lesson
- `gpt-4o-mini` - Good quality, ~$0.001-0.003 per lesson (recommended)

**MOCK Mode**:
Set `LLM_API_KEY_OR_MOCK=MOCK` for testing without API costs:
- Returns placeholder content
- Instant generation (~1s)
- Useful for UI testing and development

### Security

```bash
# Random secret for signing/internal requests
SIGNING_KEY=your-random-secret-key
```

**Generate**:
```bash
openssl rand -base64 32
```

## Optional Configuration

### Generation Strategy

**Note**: These configuration options apply to the **API path** only (synchronous generation via `POST /api/lessons`). The worker path uses the `MODE` environment variable instead (see below).

```bash
# Default generation strategy (API path only)
DEFAULT_GENERATION_STRATEGY=single  # 'single' or 'multi'

# Enable intelligent routing between strategies (API path only)
ENABLE_HYBRID_ROUTING=true  # Set to 'false' to disable

# Complexity threshold for multi-agent (0-100, API path only)
COMPLEXITY_THRESHOLD=70  # Higher = more likely to use multi-agent
```

**Strategies**:
- `single` - Single-agent generation (faster, simpler)
- `multi` - Multi-agent generation (higher quality for complex topics)

**Hybrid Routing**: When enabled, the API path automatically chooses between single and multi-agent based on topic complexity.

**Worker Path Configuration**: The worker path uses the `MODE` environment variable:
- `MODE` not set (default): Uses multi-agent generation via `orchestrateComponentGeneration()` with pedagogy inference
- `MODE=legacy`: Uses `generateLessonHybrid()` which routes based on complexity (similar to API path)

### Multi-Agent System

```bash
# Enable planner agent (part of multi-agent system)
ENABLE_MULTI_AGENT_PLANNER=true  # Set to 'false' to disable planner
```

When disabled, multi-agent mode uses author agent only (faster but less structured).


### Logging

```bash
# Log level
LOG_LEVEL=info  # debug|info|warn|error
```

**Levels**:
- `debug` - Verbose logging (development)
- `info` - Standard logging (default)
- `warn` - Warnings and errors only
- `error` - Errors only (production)

Logs are output to console (stdout/stderr). In production, logs are captured by your hosting platform.

## Configuration Files

### `.env` (Development)

Local development environment variables. Never commit to version control.

```bash
# Add to .gitignore
.env
.env.local
.env*.local
```

### `env.txt` (Template)

Template file with placeholder values. Safe to commit.

```bash
NEXT_PUBLIC_SUPABASE_URL={{SUPABASE_URL}}
NEXT_PUBLIC_SUPABASE_ANON_KEY={{SUPABASE_ANON_KEY}}
# ...
```

## Production Configuration

### Vercel (Frontend)

Add environment variables in Vercel Dashboard:
1. Go to **Settings** → **Environment Variables**
2. Add each variable for appropriate environments:
   - **Production**
   - **Preview**
   - **Development**

**Frontend Variables** (safe to expose):
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

### Worker (Railway/Render/Heroku)

Add environment variables in your hosting dashboard:

**Backend Variables** (keep secret):
- `SUPABASE_SERVICE_ROLE_KEY`
- `LLM_API_KEY_OR_MOCK`
- `MODEL_NAME`
- `SIGNING_KEY`

**Optional**:
- `DEFAULT_GENERATION_STRATEGY`
- `ENABLE_HYBRID_ROUTING`
- `COMPLEXITY_THRESHOLD`
- `LOG_LEVEL`

## Environment Variable Priority

1. **System environment variables** (highest priority)
2. **`.env.local`** (local overrides)
3. **`.env`** (development defaults)
4. **Default values** (lowest priority)

## Validation

### Check Configuration

```bash
# Test database connection
npm run check-traces

# Test trace insertion
npm run test-traces

# Verify environment variables are loaded
node -e "console.log(process.env.NEXT_PUBLIC_SUPABASE_URL)"
```

### Common Configuration Errors

#### Missing Required Variables

**Error**: `NEXT_PUBLIC_SUPABASE_URL is not defined`

**Fix**: Ensure all required variables are in `.env`

#### Wrong Service Role Key

**Error**: `Invalid API key` or permission denied

**Fix**: Use Service Role Key, not Anon Key, for `SUPABASE_SERVICE_ROLE_KEY`

#### Invalid Model Name

**Error**: `Model not found`

**Fix**: Use valid model names: `gpt-4o` or `gpt-4o-mini`

#### MOCK Mode Not Working

**Error**: Still making API calls when `MOCK` is set

**Fix**: Ensure `LLM_API_KEY_OR_MOCK=MOCK` (no quotes, exact value)

## Security Best Practices

1. **Never commit `.env`** - Already in `.gitignore`
2. **Rotate secrets regularly** - Especially `SIGNING_KEY`
3. **Use different keys** - Separate Service Role Key for worker
4. **Limit API key permissions** - Use minimum required OpenAI permissions
5. **Monitor usage** - Check Supabase and OpenAI dashboards regularly

## Next Steps

- **[Installation](/docs/getting-started/installation)** - Complete setup guide
- **[Deployment](/docs/deployment/environment-variables)** - Production configuration
- **[Operations](/docs/operations/monitoring)** - Monitoring and logging

