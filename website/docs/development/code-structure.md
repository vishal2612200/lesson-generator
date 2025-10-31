# Code Structure

Project organization and key directories explained.

## Directory Structure

```
lesson_generator/
├── src/
│   ├── app/                    # Next.js app directory
│   │   ├── api/                # API routes
│   │   │   ├── lessons/        # Lesson API
│   │   │   └── internal/       # Internal API
│   │   ├── lessons/            # Lesson pages
│   │   │   └── [id]/           # Lesson detail
│   │   └── page.tsx            # Homepage
│   ├── domains/                # Domain logic
│   │   └── lesson/
│   │       ├── application/    # Use cases
│   │       ├── domain/         # Domain models
│   │       ├── infrastructure/ # Repository implementations
│   │       └── ui/             # UI components
│   ├── worker/                 # Worker process
│   │   ├── generation/         # Generation logic
│   │   ├── componentKit/       # Component generation
│   │   ├── content/            # Content generation
│   │   ├── common/              # Shared utilities
│   │   └── cli.ts              # Worker entry point
│   ├── lib/                     # Shared libraries
│   │   └── supabase/           # Supabase clients
│   └── types/                   # TypeScript types
├── supabase/
│   └── migrations/              # Database migrations
├── tests/                        # Test files
├── website/                      # Docusaurus docs
└── package.json
```

## Key Directories

### `src/app/`

Next.js app directory:

- **`api/`** - API routes (REST endpoints)
- **`lessons/`** - Lesson pages (UI)
- **`page.tsx`** - Homepage

### `src/domains/lesson/`

Domain-driven design structure:

- **`application/`** - Use cases (CreateLesson, GetLesson, etc.)
- **`domain/`** - Domain models and entities
- **`infrastructure/`** - Repository implementations (Supabase)
- **`ui/`** - UI components (ShadowRenderer for React components)

### `src/worker/`

Worker process for lesson generation:

- **`generation/`** - Generation logic (single-agent)
- **`componentKit/`** - Component generation (multi-agent)
- **`content/`** - Content generation (prompts, validation)
- **`common/`** - Shared utilities (LLM, logger, security)
- **`cli.ts`** - Worker entry point

### `supabase/migrations/`

Database migrations:

- **`001_initial_schema.sql`** - Initial tables
- **`002_multi_agent_traces.sql`** - Trace improvements
- **`003_fix_lesson_contents_duplication.sql`** - Bug fixes
- **`004_claim_next_lesson.sql`** - RPC functions
- **`005_rls_policies.sql`** - Security policies

## Code Organization Principles

### Domain-Driven Design

- **Domain**: Core business logic
- **Application**: Use cases
- **Infrastructure**: External integrations
- **UI**: Presentation layer

### Separation of Concerns

- **API Layer**: REST endpoints
- **Domain Layer**: Business logic
- **Infrastructure Layer**: External services
- **UI Layer**: Presentation

### Dependency Direction

```
UI → Application → Domain ← Infrastructure
```

## Next Steps

- **[Adding Features](/docs/development/adding-features)** - Contributing guidelines
- **[Testing](/docs/development/testing)** - Test strategy
- **[Debugging](/docs/development/debugging)** - Debugging tips

