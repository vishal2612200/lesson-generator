# Architecture Overview

High-level system architecture and design principles of AI Lesson Generator.

## System Overview

AI Lesson Generator is a production-ready system for generating interactive educational content powered by advanced AI. It transforms simple text outlines into fully interactive React components.

## Core Philosophy

**Content-agnostic renderer**: Zero hardcoded educational content. All content is dynamically generated from user prompts, ensuring unlimited flexibility and possibilities.

## High-Level Architecture

```
┌─────────────┐
│   Browser   │ ── User Interface (Next.js)
└──────┬──────┘
       │
       ↓
┌─────────────────────────────────┐
│  Next.js API Routes               │
│  • POST /api/lessons              │
│  • GET  /api/lessons              │
│  • GET  /api/lessons/[id]         │
└──────┬────────────────────────────┘
       │
       ↓
┌─────────────────────────────────┐
│  Supabase PostgreSQL             │
│  • lessons (metadata)            │
│  • lesson_contents (generated)  │
│  • traces (debugging)            │
└──────┬────────────────────────────┘
       │
       ↓ (realtime + polling)
┌─────────────────────────────────┐
│  Worker Process                 │
│  • Claim queued lessons         │
│  • Route to generation          │
│  • Call LLM                     │
│  • Validate & compile            │
│  • Save results                 │
└──────┬──────────────────────────┘
       │
       ↓
┌─────────────────────────────────┐
│  UI Renderer                    │
│  • React Component → Shadow DOM  │
│  • Real-time updates            │
└─────────────────────────────────┘
```

## Key Components

### 1. Frontend (Next.js)

**Purpose**: User interface for creating and viewing lessons

**Technologies**:
- Next.js 14+ (React framework)
- TypeScript
- Tailwind CSS
- Supabase client library

**Key Features**:
- Lesson creation interface
- Real-time status updates via Supabase realtime
- Component rendering in Shadow DOM via custom web components

**Location**: `src/app/`

### 2. API Layer (Next.js API Routes)

**Purpose**: REST API for lesson management and rendering

**Endpoints**:
- `POST /api/lessons` - Create new lesson (synchronous generation, max 5 min)
  * Always calls `generateLessonHybrid()` which routes internally based on complexity
  * Does NOT check MODE env var (complexity-based routing)
- `GET /api/lessons` - List all lessons
- `GET /api/lessons/[id]` - Get lesson details with content
- `GET /api/lessons/[id]/bundle` - Get bundle info for ShadowRenderer
- `GET /api/lessons/[id]/module` - Get compiled ESM JavaScript module
- `POST /api/internal/generate/[id]` - Internal generation endpoint
  * Manual generation trigger or fallback endpoint
  * Routes based on MODE env var (similar to worker path)

**Features**:
- Rate limiting (10 requests/minute per IP)
- Synchronous lesson generation via API
- Module compilation for Shadow DOM rendering
- Error handling and status management

**Location**: `src/app/api/`

### 3. Database (Supabase PostgreSQL)

**Purpose**: Persistent storage for lessons, content, and traces

**Tables**:
- `lessons` - Lesson metadata and status
- `lesson_contents` - Generated TypeScript and compiled JavaScript
- `traces` - Generation traces for debugging
- `generation_attempts` - Attempt tracking

**Features**:
- Row Level Security (RLS)
- Realtime subscriptions
- Automatic migrations

**Location**: `supabase/migrations/`

### 4. Worker Process

**Purpose**: Background processing for lesson generation

**Responsibilities**:
- Listen for queued lessons (realtime + polling)
- Atomically claim lessons using CAS updates
- Route to appropriate generator:
  - Default: `orchestrateComponentGeneration()` (multi-agent system)
  - Legacy: `generateLessonHybrid()` (when MODE=legacy is set)
- Infer pedagogy settings from topic keywords
- Call LLM with structured prompts
- Validate and compile generated code
- Save results to database (UPSERT to lesson_contents)

**Technologies**:
- TypeScript
- Supabase admin client
- OpenAI SDK
- TypeScript compiler (tsc)
- esbuild (for module transformation)

**Location**: `src/worker/`

### 5. Generation System

**Purpose**: Generate interactive React components from outlines

**Generation Approach**:
- **React Component Generation** - Fully interactive components
  - State-driven interactivity
  - Complex visualizations
  - Interactive simulations
  - Unlimited customization
  - Single-agent and multi-agent strategies

**Location**: `src/worker/generation/`, `src/worker/componentKit/`

### 6. Rendering System

**Purpose**: Safely render generated components

**Components**:
- **ShadowRenderer** - Shadow DOM React component rendering
- **Custom Web Element** - `<lesson-renderer>` element for isolation
- **Component Detection** - Automatic React component detection

**Location**: `src/app/lessons/renderer/`, `src/domains/lesson/ui/`

## Data Flow

### Lesson Creation Flow

#### API Path (Synchronous)

```
1. User submits outline via POST /api/lessons
   ↓
2. CreateLessonAndGenerate use case
   ↓
3. Creates lesson with status "generating"
   ↓
4. Calls generateLessonHybrid() directly (synchronous)
   ↓
5. generateLessonHybrid() routes internally:
   - Analyzes topic complexity
   - Routes to single-agent or multi-agent based on complexity
   - If multi-agent: calls orchestrateComponentGeneration()
   - If single-agent: calls generateLesson()
   (Note: API path does NOT check MODE env var)
   ↓
6. LLM generates content
   ↓
7. Validation and compilation
   ↓
8. Content saved to lesson_contents (UPSERT)
   ↓
9. Status updated to "generated" or "failed"
   ↓
10. API returns lesson data
```

#### Worker Path (Asynchronous - Alternative)

```
1. Lesson created with status "queued" (alternative flow)
   ↓
2. Worker detects new lesson (realtime or polling)
   ↓
3. Worker atomically claims lesson (CAS update)
   ↓
4. Status changes to "generating"
   ↓
5. Worker routes to generator based on MODE env var:
   - Default (MODE not set): orchestrateComponentGeneration() (multi-agent)
     * Infers pedagogy settings from topic keywords
     * Calls orchestrateComponentGeneration() directly
   - Legacy (MODE=legacy): generateLessonHybrid()
     * Uses complexity-based routing internally
   ↓
6. LLM generates content
   ↓
7. Validation and compilation
   ↓
8. Content saved to lesson_contents (UPSERT)
   ↓
9. Status updated to "generated" or "failed"
   ↓
10. Frontend updates via realtime
```

**Note**: The current implementation uses the API path (synchronous generation). The worker path exists as an alternative for background processing.

### Rendering Flow

```
1. User opens lesson detail page
   ↓
2. GET /api/lessons/[id] fetches lesson and content
   ↓
3. System detects React component patterns
   ↓
4. ShadowRenderer creates Shadow DOM via custom web element
   - Fetches bundle from API
   - Transforms TSX to ESM module (esbuild)
   - Dynamically imports module
   - Renders component in Shadow DOM
   ↓
5. Content displayed to user
```

## Design Decisions

### 1. Realtime-First Processing

**Problem**: Polling-based systems have latency and miss events

**Solution**: Supabase realtime channels with polling fallback

**Benefits**:
- Instant processing on INSERT/UPDATE
- Polling fallback for missed events
- Efficient and reliable

### 2. Atomic Job Claiming

**Problem**: Multiple workers could claim the same job

**Solution**: Compare-And-Set (CAS) atomic update

**Benefits**:
- No duplicate processing
- Fair distribution across workers
- Reliable status updates

### 3. Content-Agnostic Rendering

**Problem**: Hardcoded content limits flexibility

**Solution**: Dynamic generation from user prompts

**Benefits**:
- Unlimited possibilities
- No content restrictions
- Flexible and extensible

### 4. Shadow DOM Component Execution

**Problem**: Executing arbitrary user-generated code is unsafe

**Solution**: Shadow DOM with custom web component isolation

**Benefits**:
- Safe execution environment
- Style and DOM isolation
- Security validation layers
- Better performance than iframes

## Technology Stack

### Frontend

- **Next.js 14+** - React framework with server-side rendering
- **TypeScript** - Type-safe development
- **Tailwind CSS** - Utility-first CSS framework
- **Supabase Client** - Database and realtime client

### Backend

- **Node.js 18+** - JavaScript runtime
- **TypeScript** - Type-safe development
- **Supabase Admin** - Database admin client
- **OpenAI SDK** - LLM integration

### Database

- **PostgreSQL** - Relational database (via Supabase)
- **Supabase** - Database hosting and management

### Build Tools

- **TypeScript Compiler (tsc)** - Type checking and compilation
- **ESBuild** - Fast TypeScript → JavaScript transformation (module API)
- **Babel Parser** - AST parsing for import stripping (module API)
- **@babel/standalone** - Not used (was for client-side transformation)

## Scalability Considerations

### Current Architecture

- **Single worker** - Sequential processing
- **Throughput**: ~30-60 lessons/hour
- **Suitable for**: &lt;1000 lessons/day

### Future Scaling

- **Multiple workers** - Distributed processing
- **Redis queue** - Job distribution
- **Connection pooling** - Database optimization
- **Caching layer** - Performance improvement

## Security Model

### 5-Layer Validation Pipeline

1. **Input Sanitization** - Escape user input
2. **Pattern Scanning** - Block dangerous keywords
3. **TypeScript Compilation** - Type checking
4. **Preview Rendering** - SSR validation
5. **Content Evaluation** - Quality assessment

### Blocked Patterns

```typescript
const FORBIDDEN = [
  'eval(', 'Function(', 'require(', 'import(',
  'fetch(', 'XMLHttpRequest', 'document.', 'window.',
  'process.env', 'child_process', 'fs.'
];
```

## Monitoring & Debugging

### Traces

Every generation attempt is logged with:
- Complete prompts and responses
- Token usage
- Validation results
- Compilation errors
- Performance metrics

### Logging

Structured JSON logging:
- Worker logs: Console output (stdout/stderr)
- Development: Terminal output
- Production: Hosting platform logs (Railway, Render, Heroku, etc.)

## Next Steps

- **[Data Flow](/docs/architecture/data-flow)** - Detailed request-to-render pipeline
- **[Generation Modes](/docs/architecture/generation-modes)** - React component generation
- **[Worker System](/docs/architecture/worker-system)** - Real-time processing architecture
- **[Multi-Agent System](/docs/architecture/multi-agent)** - Planner and author agents
- **[Rendering System](/docs/architecture/rendering)** - Component detection and Shadow DOM rendering
- **[Security Model](/docs/architecture/security)** - 5-layer validation pipeline

