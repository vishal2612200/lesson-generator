# Development Setup

Local development workflow for AI Lesson Generator.

## Prerequisites

- **Node.js** 18+ and npm
- **Git** for version control
- **Supabase account** (free tier works)
- **OpenAI API key** ($5 credit recommended)
- **VS Code** (recommended) or other IDE

## Initial Setup

### 1. Clone Repository

```bash
git clone <repo-url>
cd lesson_generator
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Set Up Environment

```bash
cp env.txt .env
```

Edit `.env` with your credentials (see [Configuration](/docs/getting-started/configuration)).

### 4. Set Up Database

```bash
npx supabase db push
```

### 5. Start Development Servers

Open two terminals:

**Terminal 1** - Frontend:
```bash
npm run dev
```

**Terminal 2** - Worker:
```bash
npm run worker
```

Visit `http://localhost:3000`

## Development Workflow

### Running Tests

```bash
# All tests
npm test

# Watch mode
npm test -- --watch

# Specific test file
npm test componentKit/compiler.test.ts
```

### Type Checking

```bash
npm run tsc
```

### Linting

```bash
npm run lint
```

### Code Structure

```
src/
├── app/              # Next.js app directory
│   ├── api/          # API routes
│   └── lessons/      # Lesson pages
├── domains/          # Domain logic
│   └── lesson/       # Lesson domain
├── worker/           # Worker process
│   ├── generation/   # Generation logic
│   └── componentKit/ # Component generation
├── lib/              # Shared libraries
└── types/            # TypeScript types
```

## Key Commands

```bash
npm run dev          # Start Next.js dev server
npm run worker       # Start worker process
npm test             # Run tests
npm run tsc          # Type check
npm run lint         # Lint code
npm run build        # Production build
npm run docs         # Start Docusaurus
npm run docs:build   # Build documentation
```

## Development Tips

### Hot Reload

- Frontend: Automatic hot reload
- Worker: Restart manually (`Ctrl+C` then `npm run worker`)

### Debugging

- **Frontend**: Browser DevTools
- **Worker**: Check console output (terminal where worker is running)
- **Database**: Supabase Dashboard

### MOCK Mode

For testing without API costs:

```bash
# .env
LLM_API_KEY_OR_MOCK=MOCK
```

## Next Steps

- **[Code Structure](/docs/development/code-structure)** - Project organization
- **[Adding Features](/docs/development/adding-features)** - Contributing guidelines
- **[Testing](/docs/development/testing)** - Test strategy

