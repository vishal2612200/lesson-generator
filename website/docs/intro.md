# Welcome to AI Lesson Generator

AI Lesson Generator is a production-ready system for generating interactive educational content powered by advanced AI. Transform your lesson outlines into engaging, interactive React components.

## What is AI Lesson Generator?

AI Lesson Generator uses large language models (LLMs) to create interactive educational content from simple text outlines. Whether you need quizzes, explanations, interactive simulations, or visual tutorials, the system generates fully functional, ready-to-use lessons.

## Key Features

### React Component Generation

AI Lesson Generator creates fully interactive, dynamic React components with:

- State-driven interactivity
- Real-time feedback
- Complex visualizations
- Interactive simulations
- Unlimited customization
- Rich text with markdown
- Quizzes and assessments
- Code examples with syntax highlighting
- Images, videos, and multimedia
- Callout boxes and visual elements

### Intelligent Processing

- **Real-Time Processing** - Supabase realtime channels with polling fallback for instant lesson generation
- **Multi-Agent System** - Planner and author agents working together for high-quality content
- **Automatic Validation** - 5-layer security validation ensures safe, high-quality output
- **Compilation & Repair** - Automatic TypeScript compilation with error repair loop
- **Quality Scoring** - Built-in quality assessment for educational effectiveness

### Production Ready

- **Secure Rendering** - Shadow DOM isolation for safe component rendering
- **Database Integration** - PostgreSQL with Supabase for reliable data storage
- **Traceability** - Complete generation traces for debugging and optimization
- **Scalable Architecture** - Designed for production workloads

## Quick Start

Get started in 5 minutes:

```bash
# Install dependencies
npm install

# Set up environment
cp env.txt .env
# Edit .env with your credentials

# Run database migrations
npx supabase db push

# Start the application
npm run dev      # Terminal 1 - Next.js frontend
npm run worker   # Terminal 2 - Lesson generation worker
```

Visit `http://localhost:3000` to create your first lesson!

## Documentation Structure

- **[Getting Started](/docs/getting-started/quickstart)** - Quick setup guide and installation
- **[User Guide](/docs/user-guide/creating-lessons)** - How to create and manage lessons
- **[Architecture](/docs/architecture/overview)** - System design and technical details
- **[Development](/docs/development/setup)** - Contributing and development workflow
- **[Deployment](/docs/deployment/overview)** - Production deployment guides
- **[API Reference](/docs/api/rest-api)** - API endpoints and database schema
- **[Operations](/docs/operations/monitoring)** - Monitoring, troubleshooting, and scaling

## Next Steps

- New to the system? Start with the [Quick Start Guide](/docs/getting-started/quickstart)
- Want to create lessons? Check out the [User Guide](/docs/user-guide/creating-lessons)
- Setting up locally? Follow the [Installation Guide](/docs/getting-started/installation)
- Need to understand the architecture? Read the [Architecture Overview](/docs/architecture/overview)

## Core Philosophy

**Content-agnostic renderer**: Zero hardcoded educational content. All content is dynamically generated from user prompts, ensuring flexibility and unlimited possibilities.

Whether you're an educator creating interactive lessons, a developer building educational tools, or a content creator generating engaging tutorials, AI Lesson Generator provides the infrastructure to bring your ideas to life.

