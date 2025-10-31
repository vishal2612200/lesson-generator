# Data Flow

Detailed request-to-render pipeline showing how lessons flow through the system.

## Request Flow

### API Path: User Creates Lesson (Synchronous)

```
User Input (Browser)
    ↓
POST /api/lessons { outline }
    ↓
Next.js API Route Handler
    ↓
CreateLessonAndGenerate Use Case
    ↓
LessonRepository.createLesson()
    ↓
Supabase: INSERT INTO lessons
    ↓
Status: "generating" (created directly with generating status)
    ↓
generateLessonHybrid() called synchronously
    ↓
generateLessonHybrid() routes internally:
    - Analyzes topic complexity
    - Routes based on complexity (not MODE env var)
    - If multi-agent: orchestrateComponentGeneration()
    - If single-agent: generateLesson()
    ↓
Generation completes synchronously
    ↓
Status: "generated" or "failed"
    ↓
API returns lesson data
```

### Worker Path: Lesson Queued (Asynchronous)

```
Lesson created with status "queued"
    ↓
Supabase Realtime Event or Polling
    ↓
Worker Listens via Channel
    ↓
processQueue() Called
    ↓
Atomic Claim (CAS Update)
    ↓
UPDATE lessons SET status='generating'
WHERE id=? AND status='queued'
    ↓
If claimed:
    Check MODE environment variable
    ↓
    ┌─────────────────┬─────────────────────┐
    │ MODE=legacy     │ MODE not set         │
    │ (Legacy Path)   │ (Default Path)       │
    └─────────────────┴─────────────────────┘
         ↓                        ↓
generateLessonHybrid()  Infer Pedagogy from Topic
         ↓                    ↓
    (complexity-based      Analyze Topic Keywords
     routing)              Determine Grade Band
         ↓                  Determine Reading Level
    Routes internally      Determine Cognitive Load
         ↓                    ↓
    Single or Multi        orchestrateComponentGeneration()
    Agent based on         (with inferred pedagogy)
    complexity             ↓
         ↓              Status: "generating"
    Status: "generating"
```

### Generation Flow

#### Default Path (React Component Generation)

```
orchestrateComponentGeneration()
    ↓
Multi-Agent System
    ↓
Planner Agent
    ↓
Analyze Topic & Create Component Plan
    ↓
Author Agent
    ↓
Generate TSX Code
    ↓
Safety Check
    ↓
TypeScript Compilation
    ↓
If Errors:
    Repair Loop (max 2 attempts)
    ↓
Preview Generation (SSR)
    ↓
Quality Evaluation
    ↓
Save to lesson_contents
    ↓
Status: "generated" or "failed"
```

#### Legacy Path (MODE=legacy only)

```
generateLessonHybrid()
    ↓
Analyze Complexity
    ↓
Determine Strategy (single/multi)
    ↓
┌───────────────┬───────────────┐
│ Single-Agent  │ Multi-Agent   │
└───────────────┴───────────────┘
    ↓                   ↓
generateLesson()   generateLessonMultiAgent()
    ↓                   ↓
LLM Call           Planner Agent
    ↓                   ↓
Validation         Author Agent
    ↓                   ↓
Compilation        Validation & Compilation
    ↓                   ↓
Save Results       Save Results
    ↓                   ↓
Status: "generated" or "failed"
```

### Content Storage

```
Generation Complete
    ↓
Content Validated
    ↓
Compilation Success
    ↓
UPSERT INTO lesson_contents
    ↓
{
  lesson_id: UUID,
  typescript_source: TEXT,
  compiled_js: TEXT | null,
  version: 1
}
(ON CONFLICT lesson_id DO UPDATE)
    ↓
UPDATE lessons SET status='generated'
    ↓
Realtime Event Published
```

### Rendering Flow

```
User Opens Lesson
    ↓
GET /api/lessons/[id]
    ↓
GetLessonDetails Use Case
    ↓
LessonRepository.getLessonById()
    ↓
JOIN lesson_contents
    ↓
Return Lesson + Content
    ↓
Frontend Receives Data
    ↓
Component Detection
    ↓
ShadowRenderer
    ↓
Custom Web Element <lesson-renderer>
    ↓
Shadow DOM Creation
    ↓
Bundle API Request
    ↓
Module API Request
    ↓
Dynamic Import ESM Module
    ↓
Render Component in Shadow DOM
```

## Real-Time Updates

### Supabase Realtime

```
Database Change Event
    ↓
Supabase Realtime Channel
    ↓
Frontend Subscribes
    ↓
on('postgres_changes', ...)
    ↓
Event Received
    ↓
Update UI State
    ↓
Re-render Component
```

### Polling Fallback

```
Worker Processing
    ↓
Status Update in DB
    ↓
Frontend Polls Every 2.5s
    ↓
GET /api/lessons/[id]
    ↓
Compare with Local State
    ↓
If Changed:
    Update UI
```

**Note**: Polling interval is 2.5 seconds (as configured in the frontend). Polling is used as a fallback when realtime events are unavailable.

## Component Generation Flow

### Default: Multi-Agent Generation (orchestrateComponentGeneration)

```
orchestrateComponentGeneration()
    ↓
Infer Pedagogy Settings
    - gradeBand: '3-5' | '6-8' | '9-12' (based on topic keywords)
    - readingLevel: 'basic' | 'intermediate' | 'advanced'
    - cognitiveLoad: 'low' | 'medium' | 'high'
    - languageTone: 'friendly'
    - accessibility: { minFontSizePx: 16, highContrast: true }
    ↓
Planner Agent
    ↓
Analyze Topic & Create Component Plan
    ↓
Author Agent
    ↓
Generate TSX Code with Pedagogy Guidance
    ↓
Safety Check
    ↓
TypeScript Compilation
    ↓
If Errors:
    Repair Loop (max 2 attempts)
    ↓
Preview Generation (SSR)
    ↓
Quality Evaluation
    ↓
Save Results to lesson_contents
    ↓
Update Lesson Status
```

### Legacy: Single-Agent Generation (generateLesson)

**Note**: Only used when `MODE=legacy` is set

```
generateLesson()
    ↓
Call LLM with Prompt
    ↓
Extract TSX Code
    ↓
Safety Check
    ↓
TypeScript Compilation
    ↓
If Errors:
    Repair Loop (max 2 attempts)
    ↓
Content Validation
    ↓
Save Results to lesson_contents
    ↓
Update Lesson Status
```

## Rendering Pipeline

### React Component Rendering

```
ShadowRenderer Component
    ↓
Register <lesson-renderer> Custom Element
    ↓
Attach Shadow DOM (mode: 'open')
    ↓
Fetch /api/lessons/{id}/bundle
    ↓
Fetch /api/lessons/{id}/module
    ↓
Strip Imports (Babel Parser + Traverse)
    ↓
Transform TSX → ESM JavaScript (esbuild)
    ↓
Inject React Globals Banner
    ↓
Dynamic Import ESM Module
    ↓
Inject Preset CSS + Bundle Styles
    ↓
Render React Component in Shadow DOM
    ↓
Display Component
```

## Error Handling Flow

```
Generation Error
    ↓
Try/Catch Block
    ↓
Log Error
    ↓
Insert Trace with Error
    ↓
UPDATE lessons SET status='failed'
    ↓
Realtime Event Published
    ↓
Frontend Updates Status
    ↓
User Sees "Failed" Status
    ↓
User Can View Traces
```

## Performance Optimizations

### Realtime First

- Instant processing via Supabase realtime
- Polling fallback for missed events
- Reduces latency significantly

### Atomic Claiming

- Prevents duplicate processing
- Efficient resource usage
- Fair distribution

### Sequential Processing

- One lesson at a time per worker
- Prevents API rate limits
- Predictable performance

## Next Steps

- **[Generation Modes](/docs/architecture/generation-modes)** - React component generation details
- **[Worker System](/docs/architecture/worker-system)** - Real-time processing details
- **[Multi-Agent System](/docs/architecture/multi-agent)** - Planner and author agents
- **[Rendering System](/docs/architecture/rendering)** - Component detection and rendering
