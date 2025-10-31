# Installation Guide

Detailed installation instructions for AI Lesson Generator.

## System Requirements

### Required

- **Node.js** 18.0 or higher
- **npm** 9.0 or higher (comes with Node.js)
- **Git** for version control

### Recommended

- **Supabase account** (free tier sufficient)
- **OpenAI API key** with at least $5 credit
- **PostgreSQL** client tools (optional, for direct DB access)

## Installation Steps

### 1. Clone the Repository

```bash
git clone <repo-url>
cd lesson_generator
```

### 2. Install Dependencies

```bash
npm install
```

This installs all required packages:
- Next.js 14+ for the frontend
- Supabase client libraries
- OpenAI SDK
- TypeScript and build tools
- Testing frameworks

### 3. Set Up Supabase

#### Create Supabase Project

1. Go to [supabase.com](https://supabase.com)
2. Sign in or create an account
3. Click **New Project**
4. Enter project details:
   - **Name**: Your project name
   - **Database Password**: Save this password securely
   - **Region**: Choose closest to your users
5. Wait 2-3 minutes for provisioning

#### Get Credentials

1. Go to **Settings** → **API**
2. Copy these values:
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **Anon Public Key** → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - **Service Role Key** → `SUPABASE_SERVICE_ROLE_KEY` (scroll down to find this)

**Important**: Use the **Service Role Key**, not the anon key, for the worker process.

### 4. Set Up Environment Variables

```bash
cp env.txt .env
```

Edit `.env` with your credentials:

```bash
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# OpenAI Configuration
LLM_API_KEY_OR_MOCK=sk-xxx...  # Your OpenAI API key
MODEL_NAME=gpt-4o              # or gpt-4o-mini

# Security
SIGNING_KEY=$(openssl rand -base64 32)  # Generate random secret

# Optional Configuration
LOG_LEVEL=info                   # debug|info|warn|error
```

#### Generate Signing Key

```bash
openssl rand -base64 32
```

Copy the output to `SIGNING_KEY` in your `.env` file.

### 5. Run Database Migrations

```bash
npx supabase db push
```

This creates the following tables:

- **lessons** - Lesson metadata and status
- **lesson_contents** - Generated TypeScript and compiled JavaScript
- **traces** - Generation traces for debugging
- **generation_attempts** - Attempt tracking

#### Verify Migration

```bash
# List all tables
npx supabase db diff

# Connect to database (optional)
npx supabase db shell
```

### 6. Verify Installation

#### Test Database Connection

```bash
npm run check-traces
```

Should output: `Database connection successful`

#### Test Trace Insertion

```bash
npm run test-traces
```

Should output: `Trace inserted successfully`

### 7. Start Development Server

#### Terminal 1: Frontend

```bash
npm run dev
```

Visit `http://localhost:3000` - you should see the lesson generator homepage.

#### Terminal 2: Worker

```bash
npm run worker
```

You should see logs like:
```
[Worker] Starting queue processor...
[Worker] Connected to Supabase
[Worker] Listening for queued lessons...
```

## Installation Verification

### Create Test Lesson

1. Visit `http://localhost:3000`
2. Enter a test outline:
   ```
   Test Lesson
   • Sample content
   ```
3. Click **Generate Lesson**
4. Watch the worker terminal for processing logs
5. Lesson should appear as "generating" then "generated"

### Check Database

```bash
# Connect to Supabase database
npx supabase db shell

# Query lessons table
SELECT id, title, status, created_at FROM lessons ORDER BY created_at DESC LIMIT 5;
```

## Post-Installation

### Install Additional Tools (Optional)

```bash
# Supabase CLI (if not already installed)
npm install -g supabase

# Type checking
npm run tsc

# Linting
npm run lint

# Run tests
npm test
```

### Development Tools

- **VS Code** - Recommended IDE
- **Supabase Dashboard** - Database management UI
- **Postman** - API testing (optional)

## Next Steps

- **[Configuration Guide](/docs/getting-started/configuration)** - Detailed configuration options
- **[Creating Lessons](/docs/user-guide/creating-lessons)** - How to use the system
- **[Development Setup](/docs/development/setup)** - Local development workflow

## Common Installation Issues

### Node Version Mismatch

**Error**: `The engine "node" is incompatible`

**Fix**: Upgrade Node.js:
```bash
# Using nvm
nvm install 18
nvm use 18

# Or download from nodejs.org
```

### Supabase Connection Errors

**Error**: `Invalid API key` or connection refused

**Fix**:
1. Verify project is not paused
2. Check environment variables are correct
3. Ensure you're using the Service Role Key for the worker

### Migration Errors

**Error**: `relation already exists`

**Fix**: Reset database (development only):
```bash
npx supabase db reset
```

For production, see [Database Deployment](/docs/deployment/database).

### Permission Errors

**Error**: `EACCES` when installing packages

**Fix**: Use npm without sudo:
```bash
npm config set prefix ~/.npm-global
export PATH=~/.npm-global/bin:$PATH
```

For more help, see the [Troubleshooting Guide](/docs/operations/troubleshooting).

