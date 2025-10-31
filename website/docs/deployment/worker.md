# Worker Deployment

Deploy the worker process to Railway, Render, or Heroku.

## Option 1: Railway

### Setup

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

### Configuration

Create `railway.toml`:

```toml
[build]
builder = "NIXPACKS"

[deploy]
startCommand = "npm run worker"
restartPolicyType = "ON_FAILURE"
restartPolicyMaxRetries = 10
```

## Option 2: Render

### Setup

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

## Option 3: Heroku

### Setup

```bash
# Create app
heroku create lesson-worker

# Add buildpack
heroku buildpacks:add heroku/nodejs

# Set environment variables
heroku config:set SUPABASE_SERVICE_ROLE_KEY=xxx
heroku config:set LLM_API_KEY_OR_MOCK=sk-xxx
heroku config:set MODEL_NAME=gpt-4o-mini

# Update Procfile
echo "worker: npm run worker" > Procfile

# Deploy
git push heroku main

# Scale worker
heroku ps:scale worker=1
```

## Required Environment Variables

- `SUPABASE_SERVICE_ROLE_KEY`
- `LLM_API_KEY_OR_MOCK`
- `MODEL_NAME`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

## Monitoring

### Logs

- **Railway**: `railway logs`
- **Render**: Dashboard logs
- **Heroku**: `heroku logs --tail`

### Health Checks

Worker should:
- Process lessons continuously
- Log generation events
- Handle errors gracefully

## Next Steps

- **[Database Setup](/docs/deployment/database)** - Database configuration
- **[Environment Variables](/docs/deployment/environment-variables)** - Configuration guide

