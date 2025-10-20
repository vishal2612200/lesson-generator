# AI Lesson Generator

Production-ready AI system for generating interactive educational content (quizzes, explanations, interactive components, and structured blocks).

## Quick Start

```bash
npm install
cp env.txt .env
npx supabase db push
npm run dev      # Terminal 1
npm run worker   # Terminal 2
```

Visit http://localhost:3000

## What’s here vs the detailed docs

This page is a high-level entry point. For details, use the dedicated guides:

- Architecture: see [ARCHITECTURE.md](./ARCHITECTURE.md)
- Setup & deployment: see [SETUP.md](./SETUP.md)
- Environment configuration fix: see [ENVIRONMENT_SETUP.md](./ENVIRONMENT_SETUP.md)
- Tracing access: see [TRACING_ACCESS.md](./TRACING_ACCESS.md)
- Tracing guide: see [TRACING_GUIDE.md](./TRACING_GUIDE.md)
- Vercel deployment notes: see [VERCEL_DEPLOYMENT.md](./VERCEL_DEPLOYMENT.md)

## Capabilities

- Structured block lessons (text, quizzes, code, images, tabs, columns)
- Fully interactive React component lessons
- Safety validation, compilation, repair, and tracing

## Links

- Source: app and worker code under `src/`
- Scripts and tests under `scripts/` and `tests/`

---

Need help? Start with [SETUP.md](./SETUP.md) and [TRACING_GUIDE.md](./TRACING_GUIDE.md).
