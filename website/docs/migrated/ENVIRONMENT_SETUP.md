# Environment Setup - Fix for No Traces

## The Problem
Your environment variables are not set! The `env.txt` file shows placeholder values:
```
SUPABASE_URL={{SUPABASE_URL}}
DATABASE_URL={{DATABASE_URL}}
SUPABASE_SERVICE_ROLE_KEY={{SUPABASE_SERVICE_ROLE_KEY}}
```

This is why no traces are being inserted - the worker can't connect to the database.

## The Solution

You need to create a `.env.local` file with your actual Supabase credentials.

### Step 1: Get Your Supabase Credentials

1. Go to [Supabase Dashboard](https://app.supabase.com)
2. Select your project
3. Go to **Settings** → **API**
4. Copy these values:
   - **Project URL** (for `SUPABASE_URL`)
   - **Service Role Key** (for `SUPABASE_SERVICE_ROLE_KEY`) - NOT the anon key!
   - **Database URL** (for `DATABASE_URL`) - Go to **Settings** → **Database**

### Step 2: Create .env.local File

Create a file called `.env.local` in your project root:

```bash
# Create the file
touch .env.local
```

Add your actual values:

```bash
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
DATABASE_URL=postgresql://postgres:[YOUR-PASSWORD]@db.your-project-id.supabase.co:5432/postgres

# LLM Configuration
LLM_API_KEY_OR_MOCK=your-openai-api-key-or-MOCK
MODEL_NAME=gpt-4

# Optional
SIGNING_KEY=your-signing-key-here
```

### Step 3: Verify Setup

```bash
# Check if variables are loaded
echo "SUPABASE_URL: $SUPABASE_URL"
echo "DATABASE_URL: $DATABASE_URL"

# Test database connection
npm run check-traces
```

### Step 4: Restart Everything

```bash
# Stop your worker (Ctrl+C)
# Restart it
npm run worker

# In another terminal, restart your Next.js app
npm run dev
```

## Quick Test

After setting up `.env.local`:

1. **Test database connection**:
   ```bash
   npm run check-traces
   ```

2. **Test trace insertion**:
   ```bash
   npm run test-traces
   ```

3. **Generate a lesson** and watch worker logs for:
   ```
   [Generator] ✅ Trace inserted successfully: <uuid>
   ```

## Common Issues

### Wrong Service Role Key
- ❌ Using `anon` key (starts with `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9`)
- ✅ Use `service_role` key (starts with `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9` but different)

### Wrong Database URL Format
- ❌ `postgres://...` (old format)
- ✅ `postgresql://...` (new format)

### Missing Password in DATABASE_URL
- ❌ `postgresql://postgres@host:5432/db`
- ✅ `postgresql://postgres:YOUR_PASSWORD@host:5432/db`

## Security Note

- `.env.local` is gitignored (won't be committed)
- Never commit real credentials to git
- The `env.txt` file is just a template

## Still Having Issues?

If traces still don't work after setting up `.env.local`:

1. **Check worker logs** - Look for database connection errors
2. **Run diagnostics**:
   ```bash
   npm run check-traces
   npm run test-traces
   ```
3. **Verify Supabase project** - Make sure it's active and not paused

---

**TL;DR**: Create `.env.local` with real Supabase credentials, restart worker, generate lesson, watch for ✅ in logs.
