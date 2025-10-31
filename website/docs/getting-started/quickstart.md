# Quick Start

Get AI Lesson Generator up and running in 5 minutes.

## Prerequisites

- **Node.js** 18+ and npm
- **Supabase account** (free tier works)
- **OpenAI API key** ($5 credit recommended)

## Step 1: Clone and Install

```bash
git clone <repo-url>
cd lesson_generator
npm install
```

## Step 2: Set Up Supabase

1. Go to [supabase.com](https://supabase.com) and create a new project
2. Wait 2-3 minutes for provisioning
3. Copy your credentials from **Settings** → **API**:
   - Project URL (for `NEXT_PUBLIC_SUPABASE_URL`)
   - Anon Key (for `NEXT_PUBLIC_SUPABASE_ANON_KEY`)
   - Service Role Key (for `SUPABASE_SERVICE_ROLE_KEY`)

## Step 3: Configure Environment

```bash
cp env.txt .env
```

Edit `.env` and add your credentials:

```bash
# Supabase (from Settings → API)
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...  # Service Role, NOT anon key!

# OpenAI
LLM_API_KEY_OR_MOCK=sk-xxx...  # or "MOCK" for testing without API costs
MODEL_NAME=gpt-4o              # or gpt-4o-mini for cheaper

# Security (generate random string)
SIGNING_KEY=your-random-secret-key
```

## Step 4: Set Up Database

```bash
# Run migrations
npx supabase db push
```

This creates all required tables:
- `lessons` - Lesson metadata
- `lesson_contents` - Generated content storage
- `traces` - Generation debugging traces
- `generation_attempts` - Attempt tracking

## Step 5: Start Services

Open two terminals:

**Terminal 1** - Frontend:
```bash
npm run dev
```

**Terminal 2** - Worker:
```bash
npm run worker
```

## Step 6: Create Your First Lesson

1. Visit `http://localhost:3000`
2. Enter a lesson outline, for example:
   ```
   Introduction to Machine Learning
   • What is ML?
   • Types of ML algorithms
   • Real-world applications
   • Getting started with Python
   ```
3. Click **Generate Lesson**
4. Wait 30-60 seconds for generation
5. Click the lesson card to view the generated content

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
- Useful for UI testing and development

## Next Steps

- **[Installation Guide](/docs/getting-started/installation)** - Detailed setup instructions
- **[Configuration](/docs/getting-started/configuration)** - All environment variables explained
- **[Creating Lessons](/docs/user-guide/creating-lessons)** - How to create and generate lessons

## Troubleshooting

### Worker Not Processing Lessons

**Symptoms**: Lessons stuck in "queued" status

**Fix**:
1. Check worker is running: `ps aux | grep "tsx src/worker/cli.ts"`
2. Verify `SUPABASE_SERVICE_ROLE_KEY` is set correctly
3. Restart worker: `pkill -f cli.ts && npm run worker`

### Database Connection Errors

**Fix**:
1. Verify Supabase project is active (not paused)
2. Check environment variables are correct
3. Test connection: `npx supabase db ping`

### Generation Errors

**Fix**:
1. Check worker console output (where worker is running)
2. Verify API key is valid
3. Check lesson traces in the lesson detail page

For more help, see the [Troubleshooting Guide](/docs/operations/troubleshooting).

